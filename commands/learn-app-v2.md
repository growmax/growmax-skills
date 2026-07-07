---
name: learn-app-v2
description: >-
  EXPERIMENTAL Workflow-engine edition of /learn-app — same product notebook (docs/product/, same
  format, fully interchangeable with v1), but the census→shard→assemble→verify→commit pipeline runs
  as a deterministic Workflow script (guaranteed batching, code-computed tally, journal-exact
  resume, budget caps, per-phase progress) instead of prose orchestration. v1 (/learn-app) remains
  canonical until v2 passes the regression suite + a real-repo trial. Use when asked to run
  "learn-app v2", "the workflow engine", or to compare engines. Invoke with
  /learn-app-v2 [web-url-or-port] [scope].
---

# /learn-app-v2 — the Workflow engine (experimental)

You are the FRONT DOOR only. All pipeline logic lives in the workflow script — you gather inputs,
make the human-facing checks, invoke the Workflow tool ONCE, then relay its report. You do NOT
census, shard, write notes, or restate any format rules (those live in
`agents/product-scribe-v2.md`, single-sourced).

> **Experimental status:** `/learn-app` (v1) is the canonical engine. v2 writes the IDENTICAL
> notebook format (`format_version: 1`) — a notebook built by either is readable and updatable by
> both — so trying v2 is always safe. Promotion criteria live in `docs/learn-app-v2.md`.

## Steps

### 1. Guards (same as v1)
- **One runner at a time, on the integration branch.** Never run concurrently with another
  learn-app session or on parallel feature branches.
- Multi-surface monorepo with no scope arg → ask the scope question ONCE (which surfaces this run
  covers), exactly like v1's scope gate.

### 2. Resolve the target (walk or code-only)
- URL/port passed as an argument → use it.
- No argument → auto-detect: read the dev port from `docs/product/runbook.md` (or the repo's dev
  script), probe `http://localhost:<port>` (~1s timeout, never scan other ports, NEVER start the
  app). Answering + human present → ask ONE yes/no: include the read-only walk? Otherwise
  code-only.

### 3. Invoke the Workflow tool — exactly once
**CONSTRUCT the structured args object yourself — NEVER forward the raw `$ARGUMENTS` string.** The
engine hard-requires `{repoRoot, timestamp, ...}`; a bare `localhost:3000` throws. Parse the user's
input into: `target` = any URL/`localhost:port` they typed (else null), `scope` = any focus brief,
`repoRoot` = the absolute path of the current repo, `timestamp` = today as `YYYY-MM-DD`.
```
Workflow({
  scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/learn-app.workflow.js",
  args: {
    repoRoot: "<absolute path to the target repo>",
    timestamp: "<today, YYYY-MM-DD>",        // scripts cannot read the clock
    target: "<url or null>",
    scope: "<brief or null>",
    modeHint: "<bootstrap|update — advisory; the engine's Preflight decides>"
    // optional knobs: shardSize (8), walkBatchSize (6), maxWalkWaves (3), waveSize (4),
    // audit (true), budgetPerShardEst (120000), landingReserve (150000)
  }
})
```
The Workflow tool unavailable in this client → say so and point to `/learn-app` (v1). Do not
attempt to emulate the engine by hand.

### 4. Relay the result
- Success: report the engine's returned summary (mode, denominator, tally, verify, audit, commit
  sha, tokens spent) in plain language.
- **Partial/bail** (`partial: true` in the result): the engine already committed what was safe.
  Echo VERBATIM: the exact `args` object used, the `runId` from the Workflow tool result, and the
  instruction — *"resume by re-invoking with the same scriptPath, byte-identical args, and
  resumeFromRunId: <runId>"*. Byte-identical args matter: any change (including the timestamp)
  breaks the resume cache.
- Failure mid-run: same echo. The notebook on disk is never corrupted by a crash — completed
  shards are already written and committed work is safe.

## Hard rules
- ONE Workflow invocation per run. Never dispatch census/scribe/walk agents yourself — that's the
  engine's job; doing it here recreates the prose engine this command exists to replace.
- Never pass credential values into args or any prompt (the workflow journal is durable). The walk
  authenticates only per the engine's rules.
- Never edit v1 files (`commands/learn-app.md`, `agents/product-scribe.md`, `docs/learn-app.md`,
  `regression/learn-app/HARNESS.md`) from this command's context. v2's own docs live in
  `docs/learn-app-v2.md` and `regression/learn-app/HARNESS-V2.md`.
