# /learn-app-v2 — the Workflow engine (experimental)

## What it is, in one paragraph

Same product notebook as `/learn-app` — identical files, identical format, fully interchangeable —
but the *procedure* (census → shard → write → assemble → verify → commit) runs as a **program**
instead of prose instructions the model re-interprets each run. Think chef vs vending machine: v1
is a skilled chef re-reading the recipe every night (usually perfect, occasionally improvises); v2
is a machine executing the recipe — batching is arithmetic, the honesty tally is computed by code
(set equality over surface IDs, not a self-reported count), progress lines print themselves,
resume is journal-exact (finished steps return cached, only unfinished work re-runs), and a token
budget is a hard ceiling, not a request. The AI is still the brain — reading code, writing notes,
judging ambiguity — but the *steps* can no longer be skipped, reordered, or miscounted.

## Status & promotion criteria

**v1 is canonical. v2 is experimental.** v2 gets promoted (and the duplicated scribe contract
consolidated) only when ALL of:
1. Regression parity: R1 + R4 fixtures through the engine score at or above the HARNESS baselines,
   plus the sharding test and R5 (update-mode) in `HARNESS-V2.md` pass.
2. One real-repo run reviewed by the product owner.
3. A resume smoke test passes (kill mid-run → resume → byte-equivalent outcome).

Until then: v1 files are frozen with respect to v2 work — v2 is all new files
(`commands/learn-app-v2.md`, `workflows/learn-app.workflow.js`, `agents/product-scribe-v2.md`,
this doc, `HARNESS-V2.md`). Both engines read/write the same notebook (`format_version: 1`), so
you can run v1 and v2 against the same repo at different times safely (never concurrently — the
one-runner rule applies across BOTH engines).

## How to try it

```
/learn-app-v2                      # code-only; auto-detects a running app and asks about the walk
/learn-app-v2 localhost:3000       # include the read-only walk
/learn-app-v2 localhost:3000 scope: "checkout, quotes"
```

Watch the progress groups: Preflight → Census → Walk → Write (shard waves) → Audit → Assembly →
Verify → Commit. Each phase logs what it did and the tokens spent so far.

## Walking is continuous — and works in update mode too

The v2 walk runs **each batch as a disposable subagent**, so the orchestrator's context stays flat
no matter how many surfaces — meaning v2 can walk a whole app **in one run without stopping to ask**
(the only stop is the token budget, which auto-commits + prints a resume line, never asks). This is
the structural difference from v1, whose walk fills a single session's context and must pause.

The walk runs in **both bootstrap AND update** mode. On an existing notebook, `/learn-app-v2 <url>`
walks the still-unwalked priority surfaces (money-path first, skipping ones already `[walk]`-tagged
per the manifest), upgrades those module notes' `[code]` claims to `[walk]`, updates the flow status
table from flow traces, hardens `ui-patterns.md` from rendered evidence, and routes live findings to
`suggestions.md`. That is the "raise MEDIUM → HIGH by walking" path, and it no longer requires
rebuilding the notebook.

## The knobs (Workflow args — defaults are sensible)

| Knob | Default | What it does |
|---|---|---|
| `shardSize` | 8 | Modules per scribe shard (sharding engages above 10 modules) |
| `waveSize` | 4 | Shards running in parallel per wave |
| `walkBatchSize` | 6 | Surfaces per walker dispatch (walk is sequential — one browser) |
| `maxWalkWaves` | 3 | Bounded loop over newly-discovered links |
| `walkScope` | `priority` | Walk W/write + gated surfaces first, capped at `priorityWalkCap` (40). `all` = everything (a 178-surface app is ~30 batches — plan multiple resumable runs) |
| `maxWalkBatchesPerRun` | 8 | Hard batch cap per run; the run finishes normally with `walk.partial` set and the next run resumes the rest. Partial walks are first-class — walked evidence lands regardless |
| `audit` | true | Sample ~10 `[code]` claims, re-verify vs source, accuracy % into INDEX |
| `budgetPerShardEst` / `landingReserve` | 120k / 150k | Budget guard: a wave starts only if `remaining > wave·est + reserve`; on trip: commit partial + print resume instructions |

`shardSize`/`waveSize` double as the harness's sharding-test levers (see HARNESS-V2).

## Resume (the part worth understanding)

Every run's agent calls are journaled. If a run dies or bails on budget:
1. The engine already committed completed work (`docs(product): partial — …`).
2. Re-invoke the Workflow tool with the SAME scriptPath, **byte-identical args** (yes, the same
   `timestamp` — changing any arg invalidates the cache), and `resumeFromRunId: <the run id>`.
3. Finished calls return instantly from cache; only unfinished work executes. Disk writes are
   idempotent full-file overwrites, so a re-run shard converges to the same bytes.

## Engine design guarantees (why this is safer than prose)

- **Tally by set equality:** every census surface ID must appear in exactly one shard's
  placed/uncategorized/parked arrays — computed by the script; a gap triggers one remediation
  dispatch, then honest failure. No self-graded coverage.
- **One writer per file per run:** shards own their module notes; assembly owns the top-level
  files; the manifest has a single writer; the ledger is upsert-only (existing entries — possibly
  holding your typed answers — are untouchable by everything except fold).
- **Only Commit commits**, behind a redaction gate (findings → no commit, reported instead).
- **No credentials in prompts** (the journal is durable): walks run anonymous or with creds the
  repo itself documents in plaintext. Env-var credential injection is a deferred hardening.
- **Model tiering:** opus census (completeness, runs once) · sonnet scribes/walk/drift/audit ·
  haiku for preflight, manifest write, format scan, verify, commit. Custom agents keep the model
  declared in their own files (so the HARNESS model-change trigger stays honest).

## Deferred (with triggers)

- **Env-var credential injection into walks** — after the mechanical write-block hardening lands.
- **CENSUS payload compression** for 300+ surface apps — when a census return exceeds ~50k tokens.
- **Scribe-contract consolidation** (v2 file replaces v1's product-scribe.md) — at promotion only,
  as its own reviewed change.
