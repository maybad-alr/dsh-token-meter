/**
 * Contract tests for the Host half: one synthetic corpus, no Harness needed.
 *
 * Run with `npm test` (Node's built-in test runner, no dependencies).
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import { apply } from '../index.js'

/** One assistant message carrying provider usage. */
function message(seq, usage, provider = 'provider', model = 'model') {
  return {
    type: 'assistant/message',
    seq,
    data: { usage, message: { source: { provider, model } } },
  }
}

/** Usage with an explicit provider total. */
function usage(input, output, cacheRead = 0, total = input + output + cacheRead) {
  return { inputTokens: input, outputTokens: output, cacheReadTokens: cacheRead, totalTokens: total }
}

/**
 * A stand-in plugin context whose only real behavior is the session corpus.
 * @param records - `listSessions` results, newest-first.
 * @param snapshots - session id to `readSession` snapshot.
 * @param counters - mutable call counters.
 * @returns the registered route plus a request helper.
 */
function harness(records, snapshots, counters = { read: 0, list: 0 }, rejection) {
  let handler
  const ctx = {
    effect(fn) {
      fn()
      return () => {}
    },
    webServer: {
      register(route) {
        handler = route.handler
        return () => {}
      },
    },
    sessionQuery: {
      listSessions: async () => records.map((record) => ({ ...record, header: { ...record.header } })),
      readSession: async (id) => {
        counters.read += 1
        return snapshots.get(id)
      },
      listEvents: async (id) => {
        counters.list += 1
        const snapshot = snapshots.get(id)
        if (snapshot === undefined) throw new Error(`missing ${id}`)
        return snapshot.events.map((event) => ({ seq: event.seq, type: event.type }))
      },
    },
    connection: {
      requestRejection: () => rejection,
    },
  }
  apply(ctx)
  return {
    counters,
    call(url, method = 'GET') {
      return new Promise((resolve, reject) => {
        const res = {
          statusCode: 200,
          body: '',
          headers: {},
          setHeader(name, value) {
            this.headers[name] = value
          },
          end(body) {
            if (body !== undefined) this.body = body
            resolve({
              status: this.statusCode,
              headers: this.headers,
              body: this.body,
              json: this.body === '' ? undefined : JSON.parse(this.body),
            })
          },
        }
        try {
          handler({ method, url, headers: { host: 'localhost' } }, res)
        } catch (error) {
          reject(error)
        }
      })
    },
  }
}

/** A single closed session holding `calls` assistant messages of one token each. */
function corpus(count, live = false, callUsage = () => usage(1, 0)) {
  const records = []
  const snapshots = new Map()
  for (let index = 0; index < count; index += 1) {
    const id = `session-${index}`
    records.push({ header: { id, createdAt: index }, live })
    snapshots.set(id, { inheritedEventCount: 0, events: [message(0, callUsage(index))] })
  }
  return { records, snapshots }
}

test('folds usage and splits it by provider and model', async () => {
  const { records, snapshots } = corpus(2)
  snapshots.set('session-0', {
    inheritedEventCount: 0,
    events: [message(0, usage(10, 2, 100), 'alpha', 'one'), message(1, usage(20, 3, 200), 'beta', 'two')],
  })
  const api = harness(records, snapshots)

  const { json } = await api.call('/token-meter/summary?wait=1')
  assert.equal(json.totals.calls, 3)
  assert.equal(json.totals.totalTokens, 112 + 223 + 1)
  assert.deepEqual(
    json.models.map((row) => `${row.provider}/${row.model}:${row.totalTokens}`).sort(),
    ['alpha/one:112', 'beta/two:223', 'provider/model:1'],
  )
})

test('derives the total when the provider omits it', async () => {
  const { records, snapshots } = corpus(1)
  delete snapshots.get('session-0').events[0].data.usage.totalTokens
  const api = harness(records, snapshots)

  const { json } = await api.call('/token-meter/summary?wait=1')
  assert.equal(json.totals.totalTokens, 1)
})

test('skips forked history and usage-less attempts', async () => {
  const { records, snapshots } = corpus(1)
  snapshots.set('session-0', {
    inheritedEventCount: 1,
    events: [
      message(0, usage(500, 500)),
      { type: 'assistant/attempt', seq: 1, data: { attempt: 1 } },
      message(2, usage(7, 3)),
      { type: 'assistant/message', seq: 3, data: { message: {} } },
    ],
  })
  const api = harness(records, snapshots)

  const { json } = await api.call('/token-meter/summary?wait=1')
  assert.equal(json.totals.totalTokens, 10)
  assert.equal(json.totals.calls, 1)
})

test('reuses a closed session fold without reading it again', async () => {
  const { records, snapshots } = corpus(3)
  const api = harness(records, snapshots)

  await api.call('/token-meter/summary?wait=1')
  assert.equal(api.counters.read, 3)
  await api.call('/token-meter/summary?wait=1&refresh=1')
  assert.equal(api.counters.read, 3)
  assert.equal(api.counters.list, 0)
})

test('tail-checks a live session instead of decoding it', async () => {
  const events = [message(0, usage(10, 1))]
  const records = [{ header: { id: 'session-live', createdAt: 1 }, live: true }]
  const snapshots = new Map([['session-live', { inheritedEventCount: 0, events }]])
  const api = harness(records, snapshots)

  const first = await api.call('/token-meter/summary?wait=1')
  assert.equal(first.json.totals.totalTokens, 11)
  assert.equal(api.counters.read, 1)

  await api.call('/token-meter/summary?wait=1&refresh=1')
  assert.equal(api.counters.read, 1)
  assert.equal(api.counters.list, 1)

  events.push(message(1, usage(20, 2)))
  const grown = await api.call('/token-meter/summary?wait=1&refresh=1')
  assert.equal(api.counters.read, 2)
  assert.equal(grown.json.totals.totalTokens, 33)
  assert.equal(grown.json.totals.calls, 2)
})

test('reports truncation against the sessions actually folded', async () => {
  const { records, snapshots } = corpus(2005)
  const api = harness(records, snapshots)

  const { json } = await api.call('/token-meter/summary?wait=1')
  assert.equal(json.truncated, true)
  assert.equal(json.sessionCount, 2005)
  assert.equal(json.foldedSessions, 2000)
  assert.equal(json.partial, false)
  assert.equal(json.totals.totalTokens, 2000)
})

test('answers a cold request with a partial summary', async () => {
  const { records, snapshots } = corpus(1)
  const api = harness(records, snapshots)

  const cold = await api.call('/token-meter/summary')
  assert.equal(cold.status, 200)
  assert.equal(cold.json.partial, true)

  const warm = await api.call('/token-meter/summary?wait=1')
  assert.equal(warm.json.partial, false)
  assert.equal(warm.json.totals.totalTokens, 1)
})

test('honours the trust fence and the method guard', async () => {
  const { records, snapshots } = corpus(1)
  const denied = harness(records, snapshots, undefined, 401)
  const response = await denied.call('/token-meter/summary')
  assert.equal(response.status, 401)
  assert.equal(response.body, '')

  const allowed = harness(records, snapshots)
  const notAllowed = await allowed.call('/token-meter/summary', 'POST')
  assert.equal(notAllowed.status, 405)
  assert.equal(notAllowed.headers.allow, 'GET')
})
