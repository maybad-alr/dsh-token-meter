# dsh-token-meter

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that counts every token you have spent, and keeps the number in front of you.

![Token counter](icon.svg)

## What it does

- **A pill in the conversation header** showing the running total. Click it for your three heaviest models, with a bar and call count for each.
- **A full panel** in the left sidebar: total, input, output, cache, model calls, sessions — plus a breakdown by model and by session.
- Arabic and English.

## Where the number comes from

Not an estimate. Every session log records an `assistant/message` event carrying the provider's `TokenUsage`, and this plugin folds those events out of the durable logs.

Two properties that matter for correctness:

- **Forked history is not double-counted.** The fold starts at `inheritedEventCount`, so a call copied into a forked session is billed once.
- **Failed attempts carry no phantom tokens.** `assistant/attempt` records are not counted: they carry no usage.

`totalTokens` is what the provider reported, not a bill. The plugin verifies internally that input + output + cache equals the reported total.

## Install

From a checkout:

```bash
dsh plugin install /path/to/dsh-token-meter
```

Or through the Plugin Manager in the Harness UI: **Settings → Plugins → install from directory**, and point it at this folder.

Then reload the page.

## How it stays fast

The first fold reads every session log once (multi-megabyte zstd files, decoded frame by frame). After that:

- a persisted session's log is closed, so its fold is cached forever;
- a live session is re-read only when its event count changes;
- the header pill and the panel share one request.

The route answers immediately with a partial subtotal while a cold fold runs, so the UI never blocks on it.

## Structure

| File | Role |
|---|---|
| `index.js` | Host half: folds `TokenUsage` from the session corpus, serves `GET /token-meter/summary` |
| `client.js` | Client half: the sidebar entry, the panel, and the header pill |
| `cordis.patch.yml` | Loader row that mounts the bundle |
| `locale/*.json` | Plugin Manager metadata (`meta.title`, `meta.description`) |

The Host route is registered behind the composition's `connection.requestRejection` fence, so only authenticated same-origin callers reach it.

## Licence

MIT
