# /learn-app regression harness

A closed-loop test suite for the `/learn-app` command + `product-scribe` / `product-manager`
agents, driven by the **deterministic Workflow engine** (`workflows/learn-app.workflow.js`). Each
round is a **synthetic app with known planted issues** and a **hidden answer key**. The test: run
`/learn-app` on the fixture with NO hints, then score the generated `docs/product/` notebook
against the answer key. A drop from the baseline = a regression in the kit.

## Why this exists
`/learn-app`'s one job is to document a product **truthfully** — never state a bug as if it were
correct behavior, never invent problems in correct code, and reconstruct multi-step business flows
(not just list endpoints). These fixtures exercise exactly those failure modes on controlled code
where we already know every right answer. Beyond output quality, the engine has structural
guarantees (computed tally, one-writer isolation, ledger upsert, resume) that get their own checks
below.

## When to run it (all triggers, not just the first)
1. **Any change to the kit** — `commands/learn-app.md`, `agents/product-scribe.md`,
   `agents/product-manager.md`, `agents/flow-census.md`, templates.
2. **Any edit to the engine** — `workflows/learn-app.workflow.js`.
3. **Any change to the underlying model** — the session model or an agent's `model:` frontmatter.
   The kit's behavior is partly a property of the model executing it; a model upgrade can shift
   behavior with zero kit changes. Re-run the suite before trusting new runs on real repos.

## Layout
```
regression/learn-app/
  HARNESS.md              # this file
  fixtures/               # the synthetic apps (source only — NO generated docs/product)
    orderdesk/            # R1/R2: obvious traps (misleading name, dead route, docs-vs-code, hidden route)
    tenantdesk/           # R3: subtle SECURITY traps (cross-tenant leak, auth bypass, =-not-== guard, no token expiry)
    tradeflow/            # R4: B2B document PIPELINE (quote→order→invoice→payment) + a dead approval gate
  ground-truth/           # hidden answer keys — the scorer reads these; the runner must NOT
    GROUND-TRUTH.md       # orderdesk (R1/R2)
    GROUND-TRUTH-R3.md    # tenantdesk
    GROUND-TRUTH-R4.md    # tradeflow
    GROUND-TRUTH-R5.md    # tradeflow update-mode (authored alongside first R5 execution)
```

## How to run one round
1. **Copy the fixture to a scratch dir** (so the fixture here stays pristine and un-notebooked):
   `cp -r fixtures/tradeflow /tmp/rr && cd /tmp/rr && git init -q && git add -A && git commit -qm base`
2. **Runner** — invoke `/learn-app` on the scratch copy (code-only unless the round exercises the
   walk), which constructs the structured args and calls the Workflow tool once. The runner must
   NEVER open `regression/learn-app/ground-truth/`. Set `args.commit = true` for a self-contained
   scored run, or leave the default (STAGE only) and inspect the staged tree.
3. **Scorer** — dispatch a second, independent subagent given: the matching ground-truth file, the
   fixture source, and the generated `docs/product/`. It grades the dimensions below and returns a
   scorecard + PASS/FAIL + defects. (Doing the scoring yourself in the foreground also works and
   avoids flaky background channels.)
4. Compare to the baseline. Any dimension below baseline, any trap regressing to FAIL, or ANY
   confident falsehood = a regression → fix the kit, re-run.

## Scoring dimensions (0–10 each)
- **Completeness** — every module/route/rule present; env-gated & conditional surfaces included.
- **Truthfulness** — every `[code]`/`[docs]` claim matches the source. A false "confirmed" claim is critical.
- **Trap handling** — each planted issue described as real behavior AND flagged as a suspicion (not stated as correct).
- **Flow discovery** (R4) — the document chain + state machines + handoffs reconstructed as connected steps, ideally a cross-cutting pipeline note; not isolated endpoint blurbs.
- **Question quality** — ledger holds only human-intent questions; bugs go to suggestions, not questions.
- **No-bluff / provenance** — every claim tagged; no assumption stated as fact; **no false positives** (correct code — e.g. tradeflow projects/admin — not flagged as buggy).
- **Format compliance** — frontmatter valid, INDEX ≤~200 lines & counts auditable, cross-links valid.

## Engine-specific checks (beyond output quality)
1. **Set-equality tally** — the run's report shows `tally: OK N=N`; force a miss by pointing a shard
   at a wrong module slice and confirm it reports `MISMATCH` + runs the remediation dispatch.
2. **One-writer isolation** — no two agents wrote the same file (inspect the run log: module notes
   only from shards, top-level files only from assembly, manifest from its single writer).
3. **Ledger upsert** — pre-seed an ANSWERED entry in a fixture's `open-questions.md`, run UPDATE,
   confirm assembly did NOT touch it (only fold did) and existing answer text survived.
4. **Finalize discipline** — default run ends STAGED (zero commits; report says so); with
   `args.commit=true` exactly one commit; the redaction gate blocks staging/committing on a planted
   `Bearer eyJ…` string either way.

## Sharding test (fixtures are 7–9 modules — sharding never triggers naturally)
Run tradeflow bootstrap with `args.shardSize = 3, waveSize = 2` → 3 shards across 2 waves. Score
against `GROUND-TRUTH-R4` (output contract is identical regardless of shard count — that's the
point). Confirms: module partition (each slug in exactly one shard), Q-id ranges non-overlapping
and final (no renumber at assembly), parallel-wave execution, assembly building INDEX/ledger purely
from returned shard DATA. Record as a baseline row.

## R5 — UPDATE-mode round (the update path is high-value — keep it covered)
Ground truth: `ground-truth/GROUND-TRUTH-R5.md` (authored alongside first execution).
On a post-bootstrap tradeflow scratch copy:
1. Type answers under 2 planted ledger questions (one where the answer AGREES with code, one where
   it CONTRADICTS code — to exercise the human-vs-code conflict rule).
2. Add one small new route in the source on a scratch branch/commit.
Then run `/learn-app` (UPDATE mode) and score:
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

## Baseline scores (do not regress below these)

| Round | Fixture | Kit ver | Result | Key must-pass |
|---|---|---|---|---|
| R1 | orderdesk | 1.5.0 | 10/10/10/9/10/9, PASS | all 4 traps PASS, zero confident falsehoods |
| R2 | orderdesk | 1.5.1 | 10/10/10/9/10/10, PASS | R1 fixes non-regressing |
| R3 | tenantdesk | 1.5.2 | 4/4 traps PASS, truthful, PASS | cross-tenant leak caught; no false positives on projects.js/admin.js |
| R4 | tradeflow | 1.5.2 | flows PASS, dead-gate bug caught, PASS | quote→order & order→invoice handoffs + doc chain reconstructed; discount-gate units bug flagged not stated as fact |

## Engine baseline scores

| Test | Fixture | args | Result | Notes |
|---|---|---|---|---|
| Shard (engine mechanics) | tradeflow | shardSize=3,waveSize=2 | **PASS** (2026-07-06) | End-to-end: 8 agents, tally OK 17=17, verify pass 0 violations, audit 10/10, 1 commit (33fd7fb), 236k tokens. Sharding path exercised (10 modules → 3 shards / parallel waves). Trap caught: discount-gate units bug flagged as [code] + Q-032 (not stated as fact); pipeline chain + state machines reconstructed; all top-level artifacts written; ledger + Coverage&Confidence well-formed. Ran with the contract carried inline — proves ENGINE mechanics, not the specialized agent's system prompt. |
| R1/R4 (specialized agent) | orderdesk/tradeflow | code-only, scribe=product-scribe | _not yet run with the installed agent_ | vs GROUND-TRUTH{,-R4}.md — the production-agent run |
| R5 | tradeflow | update | _not yet run_ | fold + drift + ledger hygiene |
| Resume | tradeflow | tiny budget | _not yet run_ | partial → resume → byte-equal |

## The planted issues each round MUST catch (quick reference for the scorer)
- **orderdesk:** `applyTax` is really a 2.5% service fee (not tax); bulk discount 10% in code vs 5% in docs; `POST /orders/:id/flag` is a dead/unexplained route; reports router is env-gated.
- **tenantdesk:** `GET/PUT /tasks/:id` miss the `organizationId` filter (cross-tenant read+write leak); `/api/internal/metrics` mounted with no auth; `reports export` uses `=` not `===` (no-op guard + privilege mutation); `verifyToken` never checks `exp` (tokens never expire) — all four contradict the security doc.
- **tradeflow:** the three flows (quote lifecycle w/ 14-day expiry gate; order lifecycle w/ maker-checker discount approval; invoice payment allocation w/ partial/full/overpayment) and the document chain `quote→order→invoice→payment`; the SUBTLE bug — confirm's discount gate compares a 0–1 fraction against `15`, so manager approval is never actually required.

> Fixtures are single-purpose teaching bugs; keep them stable. To add a round, add a fixture +
> ground-truth pair and a baseline row here.
