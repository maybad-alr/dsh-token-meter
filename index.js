/**
 * Host half of the token counter.
 *
 * Folds provider-reported `TokenUsage` out of every durable session log and
 * serves one JSON summary to the browser half over an authenticated route.
 * Nothing here is estimated: a number only counts when a session recorded an
 * `assistant/message` event carrying usage.
 *
 * The fold is incremental. A cheap lightweight event listing per session gives
 * the log's last seq; a session whose last seq is unchanged is served from the
 * previous fold instead of re-reading a multi-megabyte log.
 */

/** Cordis function-plugin name. */
export const name = 'token-meter'

/** The route carrier, the durable session corpus, and the trust fence. */
export const inject = ['webServer', 'sessionQuery', 'connection']

/** Absolute route path the Host registers. */
const SUMMARY_PATH = '/token-meter/summary'

/** How long a folded summary stays fresh before the next request revalidates. */
const CACHE_MS = 10_000

/** Sessions folded per summary; the corpus is newest-first. */
const MAX_SESSIONS = 2000

/** Concurrent per-session listings. */
const READ_CONCURRENCY = 8

/** JSON response: a live fact, never stored. */
function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

/** A zeroed accumulator. */
function emptyTotals() {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    calls: 0,
  }
}

/**
 * Price one usage record.
 *
 * These providers report `totalTokens` as input + output + cache reads/writes:
 * a recorded call of 4,868 input, 258 output and 239,232 cache-read tokens
 * declares 244,358. The fallback mirrors that arithmetic.
 * @param usage - the provider's `TokenUsage`.
 * @returns the billable split for one call.
 */
function priceUsage(usage) {
  const input = Number(usage?.inputTokens) || 0
  const output = Number(usage?.outputTokens) || 0
  const cacheRead = Number(usage?.cacheReadTokens) || 0
  const cacheWrite = Number(usage?.cacheWriteTokens) || 0
  const declared = Number(usage?.totalTokens)
  return {
    inputTokens: input,
    outputTokens: output,
    cacheReadTokens: cacheRead,
    cacheWriteTokens: cacheWrite,
    reasoningTokens: Number(usage?.reasoningTokens) || 0,
    totalTokens:
      Number.isFinite(declared) && declared > 0
        ? declared
        : input + output + cacheRead + cacheWrite,
  }
}

/** `provider\0model` for one assistant message. */
function modelKeyOf(event) {
  const source = event.data?.message?.source
  const provider = typeof source?.provider === 'string' ? source.provider : 'unknown'
  const model = typeof source?.model === 'string' ? source.model : 'unknown'
  return `${provider}\u0000${model}`
}

/**
 * Fold one session's own events into totals.
 *
 * Events before `inheritedEventCount` are copies inherited from a forked
 * parent; counting them again would bill the same call twice.
 * @param events - the complete logical log.
 * @param inheritedEventCount - how many leading events were inherited.
 * @returns this session's totals plus its per-model split.
 */
function foldSession(events, inheritedEventCount) {
  const totals = emptyTotals()
  const models = new Map()
  const start = Number(inheritedEventCount) || 0
  for (let index = start; index < events.length; index += 1) {
    const event = events[index]
    if (event?.type !== 'assistant/message') continue
    const usage = event.data?.usage
    if (usage === undefined || usage === null) continue
    const priced = priceUsage(usage)
    const key = modelKeyOf(event)
    let entry = models.get(key)
    if (entry === undefined) {
      entry = emptyTotals()
      models.set(key, entry)
    }
    for (const field of Object.keys(priced)) {
      totals[field] += priced[field]
      entry[field] += priced[field]
    }
    totals.calls += 1
    entry.calls += 1
  }
  return { totals, models }
}

/** Run `task` over `items` with bounded concurrency, preserving input order. */
async function mapLimit(items, limit, task) {
  const results = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next
      next += 1
      if (index >= items.length) return
      results[index] = await task(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

/**
 * Fold the whole corpus, reusing sessions that cannot have changed.
 *
 * `readSession` already returns the complete logical log, so its event count is
 * a free tail check — asking `listEvents` for the same seq would decode every
 * log twice. A persisted session that was cached is final and is never re-read;
 * only a live session (or one whose fold failed) is decoded again.
 *
 * Sessions are folded most-recently-created first and folded into the shared
 * accumulators as they land, so `onProgress` can publish a usable subtotal while
 * older logs are still decoding.
 * @param ctx - the plugin context.
 * @param memo - per-session cache carried across folds by the caller.
 * @param onProgress - optional callback receiving a partial summary.
 * @returns the complete summary served to the browser.
 */
async function foldCorpus(ctx, memo, onProgress) {
  const requested = await ctx.sessionQuery.listSessions()
  const records = requested
    .slice(0, MAX_SESSIONS)
    .sort((left, right) => (Number(right.header.createdAt) || 0) - (Number(left.header.createdAt) || 0))

  const overall = emptyTotals()
  const models = new Map()
  const sessions = []
  let counted = 0

  const publish = () => {
    if (onProgress === undefined) return
    onProgress({
      generatedAt: Date.now(),
      sessionCount: requested.length,
      countedSessions: counted,
      truncated: requested.length > records.length,
      partial: counted < requested.length,
      totals: { ...overall },
      models: [...models.values()]
        .map((entry) => ({ ...entry }))
        .sort((left, right) => right.totalTokens - left.totalTokens),
      sessions: sessions.slice().sort((left, right) => right.totalTokens - left.totalTokens),
    })
  }

  await mapLimit(records, READ_CONCURRENCY, async (record) => {
    const sessionId = String(record.header.id)
    const live = record.live === true
    const cached = memo.get(sessionId)
    // A non-live session's log is closed: its fold can never go stale.
    let row = cached !== undefined && !live && cached.live !== true ? cached : undefined

    if (row === undefined) {
      let snapshot
      try {
        snapshot = await ctx.sessionQuery.readSession(sessionId)
      } catch {
        row = cached
      }
      if (row === undefined && snapshot !== undefined) {
        const events = snapshot.events ?? []
        const lastSeq = events.length === 0 ? -1 : Number(events[events.length - 1].seq)
        if (cached !== undefined && cached.lastSeq === lastSeq) {
          cached.live = live
          row = cached
        } else {
          const folded = foldSession(events, snapshot.inheritedEventCount ?? 0)
          row = {
            lastSeq,
            totals: folded.totals,
            models: folded.models,
            createdAt: Number(record.header.createdAt) || 0,
            live,
          }
          memo.set(sessionId, row)
        }
      }
    }

    if (row === undefined || row.totals.calls === 0) return
    for (const field of Object.keys(row.totals)) overall[field] += row.totals[field]
    for (const [key, value] of row.models) {
      let entry = models.get(key)
      if (entry === undefined) {
        const [provider, model] = key.split('\u0000')
        entry = { provider, model, ...emptyTotals() }
        models.set(key, entry)
      }
      for (const field of Object.keys(value)) entry[field] += value[field]
    }
    sessions.push({
      sessionId,
      totalTokens: row.totals.totalTokens,
      inputTokens: row.totals.inputTokens,
      outputTokens: row.totals.outputTokens,
      calls: row.totals.calls,
      createdAt: row.createdAt,
      live: row.live,
    })
    counted += 1
    if (counted % 5 === 0) publish()
  })

  sessions.sort((left, right) => right.totalTokens - left.totalTokens)
  return {
    generatedAt: Date.now(),
    sessionCount: requested.length,
    countedSessions: sessions.length,
    truncated: requested.length > records.length,
    partial: false,
    totals: overall,
    models: [...models.values()].sort((left, right) => right.totalTokens - left.totalTokens),
    sessions,
  }
}

/** The shape served before a cold fold has produced any subtotal. */
function pendingPlaceholder() {
  return {
    generatedAt: Date.now(),
    sessionCount: 0,
    countedSessions: 0,
    truncated: false,
    partial: true,
    totals: emptyTotals(),
    models: [],
    sessions: [],
  }
}

/**
 * Register the summary route behind the composition's trust fence.
 * @param ctx - the plugin context.
 */
export function apply(ctx) {
  /** Per-session fold cache, invalidated by each session's log tail. */
  const memo = new Map()
  /** One in-flight or fresh fold, shared by concurrent requests. */
  let cache = { at: 0, value: undefined, pending: undefined }
  /** The newest partial subtotal, served while a cold fold is still decoding. */
  let partial

  const summary = async (fresh) => {
    if (!fresh && cache.value !== undefined && Date.now() - cache.at < CACHE_MS) {
      return cache.value
    }
    if (cache.pending !== undefined) return cache.pending
    partial = undefined
    cache.pending = foldCorpus(ctx, memo, (progress) => {
      partial = progress
    })
      .then((value) => {
        cache = { at: Date.now(), value, pending: undefined }
        return value
      })
      .catch((error) => {
        cache = { at: 0, value: cache.value, pending: undefined }
        throw error
      })
    return cache.pending
  }

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: SUMMARY_PATH,
        handler: async (req, res) => {
          let rejection
          try {
            rejection = ctx.connection.requestRejection(req)
          } catch {
            // A fence that cannot answer is not permission to serve.
            res.statusCode = 403
            res.end()
            return
          }
          if (rejection !== undefined) {
            res.statusCode = rejection
            res.end()
            return
          }
          if (req.method !== 'GET') {
            res.statusCode = 405
            res.setHeader('allow', 'GET')
            res.end()
            return
          }
          // Never block the first paint on a cold fold: kick one off and answer
          // with the newest partial subtotal, then let the page poll. `?wait=1`
          // opts into the complete fold for callers that need a final number.
          const query = new URL(String(req.url), 'http://localhost').searchParams
          const fresh = query.get('refresh') === '1'
          const wait = query.get('wait') === '1'
          if (!wait && cache.value === undefined) {
            void summary(fresh).catch(() => {})
            sendJson(res, 200, partial ?? pendingPlaceholder())
            return
          }
          try {
            sendJson(res, 200, await summary(fresh))
          } catch (error) {
            sendJson(res, 500, {
              code: 'fold-failed',
              message: error instanceof Error ? error.message : String(error),
            })
          }        },
      }),
    `token-meter: GET ${SUMMARY_PATH}`,
  )
}
