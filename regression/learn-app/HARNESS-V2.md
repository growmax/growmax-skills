# /learn-app-v2 regression harness (the Workflow engine)

Extends `HARNESS.md`. Same fixtures + hidden answer keys; the difference is the runs go through the
**deterministic Workflow engine** (`workflows/learn-app.workflow.js`) via `/learn-app-v2`, not the
prose orchestrator. Because both engines emit the identical notebook format, the existing
ground-truth files score v2 output unchanged — the scorecard dimensions in `HARNESS.md` apply
verbatim.

## v2 must clear the v1 baselines
Run R1 (orderdesk) and R4 (tradeflow) through the engine, code-only, and score against
`GROUND-TRUTH.md` / `GROUND-TRUTH-R4.md`. Pass = v1 baselines matched or beaten AND the engine's
own guarantees hold (see the engine checklist below).

## Engine-specific checks (beyond output quality)
1. **Set-equality tally** — the run's report shows `tally: OK N=N`; force a miss by pointing a shard
   at a wrong module slice and confirm it reports `MISMATCH` + runs the remediation dispatch.
2. **One-writer isolation** — no two agents wrote the same file (inspect the run log: module notes
   only from shards, top-level files only from assembly, manifest from its single writer).
3. **Ledger upsert** — pre-seed an ANSWERED entry in a fixture's `open-questions.md`, run UPDATE,
   confirm assembly did NOT touch it (only fold did) and existing answer text survived.
4. **Finalize discipline** — default run ends STAGED (zero commits; report says so); with args.commit=true exactly one commit; the redaction gate blocks staging/committing on a planted `Bearer eyJ…` string either way.

## Sharding test (fixtures are 7–9 modules — sharding never triggers naturally)
Run tradeflow bootstrap with `args.shardSize = 3, waveSize = 2` → 3 shards across 2 waves. Score
against `GROUND-TRUTH-R4` (output contract is identical regardless of shard count — that's the
point). Confirms: module partition (each slug in exactly one shard), Q-id ranges non-overlapping
and final (no renumber at assembly), parallel-wave execution, assembly building INDEX/ledger purely
from returned shard DATA. Record as a baseline row.

## R5 — UPDATE-mode round (REQUIRED; the update path has zero v1 coverage)
Ground truth: `ground-truth/GROUND-TRUTH-R5.md` (to be authored alongside first execution).
On a post-bootstrap tradeflow scratch copy:
1. Type answers under 2 planted ledger questions (one where the answer AGREES with code, one where
   it CONTRADICTS code — to exercise the human-vs-code conflict rule).
2. Add one small new route in the source on a scratch branch/commit.
Then run `/learn-app-v2` (UPDATE mode) and score:
- **Fold correctness** — both answers folded to `[human: Q-nnn ✓]`; the contradicting one KEPT the
  `[code]` behavior claim AND filed a new discrepancy question.
- **Ledger hygiene** — folded entries moved to `open-questions-archive.md`, answer text replaced by
  fold-pointer, live ledger pending-only, status header correct.
- **Drift detection** — the new route surfaced as a new question / note update; the drift base was
  the notebook's own last commit (not a stale frontmatter sha).
- **No-churn** — modules untouched by the drift were not rewritten (only `verified_at_commit`
  bumped by their absence from the work list = left alone).

## Resume smoke test
Start a bootstrap with a tiny `budget` (via the turn's token target) so a wave trips the budget
guard; confirm the engine commits a partial notebook and returns `partial: true` + a resume
instruction. Re-invoke with identical args + `resumeFromRunId`; confirm finished phases are cache
hits (near-zero new tokens until the first unfinished shard) and the final notebook is
byte-equivalent to an uninterrupted run.

## Calibration
Record per-phase `budget.spent()` from the R1/R4 runs (the engine logs it) to tune
`budgetPerShardEst` / `landingReserve` from the current 120k / 150k guesses.

## When to run
Same triggers as HARNESS.md (any kit change; any model-version change) — PLUS any edit to
`workflows/learn-app.workflow.js` or `agents/product-scribe-v2.md`.

## v2 baseline scores
| Test | Fixture | args | Result | Notes |
|---|---|---|---|---|
| Shard (engine mechanics) | tradeflow | shardSize=3,waveSize=2, scribe=general-purpose | **PASS** (2026-07-06) | End-to-end: 8 agents, tally OK 17=17, verify pass 0 violations, audit 10/10, 1 commit (33fd7fb), 236k tokens. Sharding path exercised (10 modules → 3 shards / parallel waves). Trap caught: discount-gate units bug flagged as [code] + Q-032 (not stated as fact); pipeline chain + state machines reconstructed; all top-level artifacts written; ledger + Coverage&Confidence well-formed. **Caveat:** ran with the general-purpose scribe carrying the contract inline (validation build learn-app.validation.js) because product-scribe-v2 wasn't yet registered — proves ENGINE mechanics, not the v2 agent's system prompt. |
| R1/R4-v2 (specialized agent) | orderdesk/tradeflow | code-only, scribe=product-scribe-v2 | _pending plugin 1.9.0 install + session restart_ | vs GROUND-TRUTH{,-R4}.md — the production-agent run |
| R5 | tradeflow | update | _pending_ | fold + drift + ledger hygiene |
| Resume | tradeflow | tiny budget | _pending_ | partial → resume → byte-equal |

Notes on the validation build: `scratchpad/pm-validation/learn-app.validation.js` is the shipped
engine with the scribe pointed at general-purpose + the shard/assembly contract inlined (the only
change). Delete it once the specialized-agent run is green — it exists only to prove the engine
before the agent was installable.
