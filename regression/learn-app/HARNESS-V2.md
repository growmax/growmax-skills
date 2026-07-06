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
4. **Only-commit-commits** — exactly one commit per run; the redaction gate blocks on a planted
   `Bearer eyJ…` string.

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

## v2 baseline scores (fill on first green run)
| Test | Fixture | args | Result | Notes |
|---|---|---|---|---|
| R1-v2 | orderdesk | code-only | _pending_ | vs GROUND-TRUTH.md |
| R4-v2 | tradeflow | code-only | _pending_ | vs GROUND-TRUTH-R4.md |
| Shard | tradeflow | shardSize=3,waveSize=2 | _pending_ | 3 shards; vs GROUND-TRUTH-R4 |
| R5 | tradeflow | update | _pending_ | fold + drift + ledger hygiene |
| Resume | tradeflow | tiny budget | _pending_ | partial → resume → byte-equal |
