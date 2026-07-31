# The bug-fix pipeline — usage guide & acceptance checklist

Turn a raw bug report into: a frozen failing test → a root-cause fix graded by an independent
validator → a permanent regression tripwire. **0, 1, or 3 questions per bug — a deterministic
route table decides which.** Everything else is agents and mechanical checks, and every mechanical
grader runs on every route.

## The commands

| Command | What it does | When |
|---|---|---|
| `/growmax-skills:bugfix <report>` | **The whole lap in one session** — confirm-bug chained into fix-bug, **auto-routed** AUTO/CONFIRM/GATED (0/1/3 interrupts). | Every bug; the default. |
| `/growmax-skills:confirm-bug <report>` | Report → diagnosis → your ruling → RED repro → your confirmation → frozen (pushed tag). Never fixes. | When you want the air gap, or someone else will fix. |
| `/growmax-skills:fix-bug BUG-<id>` | Verify-still-red → root-cause fix → mutation check → blind grading → your ship gate → promotion. | Fresh session against an existing frozen repro. |
| `/growmax-skills:validate-fix BUG-<id>` | The grader standalone, default-FAIL. | Grading a fix you didn't watch; a CI check; a second opinion. |

Agents underneath: `bug-triage` (haiku, read-only, evidence JSON only) · `bug-diagnostician` (opus
at full depth, sonnet at confirm depth, read-only) · `bug-reproducer` (sonnet) · `bug-fixer`
(sonnet) · `fix-validator` (sonnet, read-only, receives the bug id only).

## Routing — who answers the gates

`/bugfix` runs a 90-second `bug-triage` pass first. It returns **evidence, never a decision**: the
symptom class, a confidence, the call sites, the **predicted fix paths** (the files a fix would
edit — not the directory the broken screen lives in), money/authz/tenant/schema flags, one in-repo
precedent or `null`, and an honest count of competing hypotheses. A **deterministic table** in
`commands/bugfix.md` reads that JSON and picks the route — no model judgment in the decision, and
the orchestrator re-verifies the precedent and the paths itself before trusting any of it.

| Route | GATE A (ruling) | GATE B (red) | GATE C (ship) | Interrupts |
|---|---|---|---|---|
| **AUTO** | precedent auto-applied, logged | mechanical: the runner's reporter output is parsed | an **evidence-bundle PR** — never merged | **0** |
| **CONFIRM** | ONE plain-language "confirm or overrule" question | mechanical | PR | **1** |
| **GATED** | the full ruling + strategy + discriminators call | you, tiered by risk | you: ship / changes / hold | **3** |

AUTO requires all of: copy/locale-only fix paths · no money, auth, tenant or schema exposure · a
verified precedent · confidence ≥ 0.85 · zero competing hypotheses · a runnable suite. **Anything
else defaults to GATED** — the table is fail-closed, and money/auth/tenant/schema always is.

**Downgrades are normal.** Triage failure, a precedent that does not check out, a tag that will not
push, a diagnosis that contradicts the triage, or a fix touching files outside the predicted paths
each convert the rest of the lap to GATED, announced. Routing can only ever *add* gates.

What AUTO does **not** skip: the red-first check, the frozen pushed tag, the mutation check, the
blind default-FAIL validator, the `protect-repro` hook. It buys fewer interrupts, never less
verification — and its freeze is recorded honestly as `confirmed_mode: "machine"`, never as a human
approval that did not happen.

Flags: `--gated` (force the three gates) · `--auto` (force, logged) · `--shadow` (compute and log
the route, then run GATED). Per-repo overlay `.claude/E2E-NOTES.md § ROUTING` can set
`route_mode: live | shadow | gated-only` and raise (never lower) the confidence threshold.

## One session or two?

**One session (`/bugfix`) is safe** because the isolation never lived in the session boundary:
the workers are context-isolated subagents, the validator is blind, and the repro is frozen by a
**pushed tag** before the fix half begins. The orchestrator knowing both halves is fine — it never
writes code and never grades.

**Split into two** when: it's a maximum-rigor RED bug and the human pause between red and fix is
itself valuable · the diagnosis is huge and the session is running long (stop at the freeze — that
IS `/confirm-bug`'s ending) · a teammate will do the fixing · you're resuming after a dead session
(everything after the freeze is on disk and pushed; just run `/fix-bug BUG-<id>`).

## Your interrupts (route-dependent: 0 / 1 / 3)

All three below describe the **GATED** route. On CONFIRM you get GATE A only, collapsed to one
plain-language question. On AUTO you get none of them — the PR is where you look.

1. **GATE A — ruling + strategy** (end of diagnosis, one multiple-choice set).
   *Ruling*: what is the correct behavior? Never recommended — product truth is yours.
   *Strategy* (YELLOW/RED): patch the call site vs consolidate the duplicates — recommendation
   allowed, labeled. *Discriminators*: anything you can answer from a screenshot you already have.
2. **GATE B — confirm the red.** RED tier: run `meta.json.runner` yourself and check the failure
   is the reported bug, not setup noise. YELLOW/GREEN: approve from the printed expected-vs-actual.
3. **GATE C — ship.** You see the validator's verdict verbatim + the mutation-check result + root
   cause + blast radius. Ship / needs changes / hold.

## What "fixed" means (the contract, verbatim)

```
runner exits 0
  AND the named primary test AND every matrix case are present and PASSING
  AND reverting the fix makes the primary FAIL again          (mutation check)
  AND git diff repro-BUG-<id> -- repro/BUG-<id>/ <spec_path>  is EMPTY  (tag = anchor)
  AND the repo's own checks for the touched package are green
```

After your ship approval, the repro's `REPRO_BUG` env gate is **removed** — the spec runs in every
normal test run from then on. That promotion step is what makes the fix permanent; skip it and the
bug can silently return. (On the AUTO/CONFIRM routes the un-gating ships **inside the PR diff**, so
merging the PR is what promotes it — the pipeline never commits to your default branch.) Every run appends a row to `.claude/bugfix-ledger.md`; after ~20 bugs the
**false-fixed rate** in that ledger is the pipeline's real assurance number.

## Worked example (the shape to expect)

Report: *"admin drill shows rep revenue R 124 567,39 but the rep's own dashboard says R 10,600.16"*.
Diagnosis finds two metrics wearing one label (orders vs invoices · all-time vs 30 days · drafts
counted · raw vs base currency) + side-findings filed separately. Ruling chosen: *invoiced only*.
Repro seeds 1 rep, 2 customers, 4 orders (1000 old / 100 draft / 9999 cancelled / 10 recent),
1 invoice (10) — primary asserts both surfaces = **10**, today's code answers **1110** → RED.
Matrix fences: cancelled-never-counts · empty-window-is-0 · cross-tenant-never-appears. Freeze,
fix, mutation check, blind PASS, ship, promote.

---

# Acceptance checklist — how to confirm the pipeline itself

Four steps, smallest first. What "done" means: after **01** the team can use it · after **02**
you've verified the enforcement with your own eyes · after **03** it has survived reality once ·
after **04** the AUTO route's downgrades are rare and its PRs are trustworthy.

## 01 · Review & merge (~15 min)

Branch `claude/autonomous-bugfix-agent-eyplhj` in growmax/growmax-skills. Read in order:
`commands/confirm-bug.md` → `commands/fix-bug.md` → `agents/fix-validator.md` →
`regression/bugfix-pipeline/RESULTS.md` (the eval evidence: 4/4 across two rounds, including
finding F1 — the evals caught a bug in the pipeline's own freeze design on their first run).
Merge to main; fresh sessions pick it up (or `claude plugin update growmax-skills`).

## 02 · Two smoke tests on your machine — no database needed (~10 min)

```bash
# the freeze hook: expect  pass=13 fail=0
bash hooks/protect-repro.test.sh

# watch the grader refuse a GREEN run because the frozen spec was edited:
bash regression/bugfix-pipeline/cases/C4-tampered-repro/setup.sh /tmp/eval-c4
cd /tmp/eval-c4 && claude
#   then run:  /growmax-skills:validate-fix BUG-C4
#   expect:    VERDICT: FAIL, quoting the weakened assertion (strictEqual(s,10) → ok(s>=0))
```

Optional third: `setup.sh /tmp/eval-c3` + `validate-fix BUG-C3` → expect FAIL naming the
`process.env.REPRO_BUG` branch — the counterfeit that passes every mechanical check.

## 03 · The real lap (~1 hr, local Postgres required)

```bash
cd <ARC> && docker-compose up -d postgres redis
```

Then in Claude: `/growmax-skills:bugfix <paste the real bug report>` — answer GATE A, run the red
yourself at GATE B (RED tier), approve at GATE C. One complete lap is the only true test of the
reproduce and fix halves; no eval covers them end to end.

## 04 · AUTO-route preconditions (target repo side)

Routing is **live by default** — the table already forces GATED on money, auth, tenant and schema
signals, and AUTO never merges. This list is what makes AUTO's downgrades *rare* and its PRs
trustworthy. Until it is done, set `route_mode: gated-only` in `.claude/E2E-NOTES.md § ROUTING` if
you want the classic three gates on every bug.

In order: GitHub **tag protection** on `repro-*` (without it a force-push can move the anchor the
validator grades against) · **a pushable origin from wherever the pipeline runs** — a tag that
cannot be pushed downgrades the lap to a human gate every time · **branch protection requiring
review on `bugfix/*`** so GitHub enforces what the pipeline already refuses to do · destructive-test
DB guards (the TRUNCATE / `migrate reset` protection) · a DB-backed CI job + frontend CI so
**promoted repros actually run on every PR** (a committed test nothing runs is a comment) · then
read the ledger's `route` / `confidence` / `overridden?` columns after ~10 AUTO laps, and its
false-fixed rate after ~20 bugs (>5% → tighten the validator, not the workers).

## Re-running the evals

After ANY edit to the pipeline's commands or agents:

```bash
bash regression/bugfix-pipeline/cases/C3-counterfeit-fix/setup.sh /tmp/eval-c3
bash regression/bugfix-pipeline/cases/C4-tampered-repro/setup.sh /tmp/eval-c4
# dispatch fix-validator per regression/bugfix-pipeline/HARNESS.md (bug id + path only, NO hints)
# grade against each case's expected.md; record in RESULTS.md
```

C1/C2/C5 (full-lap worker evals) are written but not yet run — they cost a full pipeline execution
each; run them the same way you run step 03. **C6** is cheap: it only has to reach GATE A, so run
it after C3/C4 — it is the guard that a bug which merely *looks* like a label fix, but is genuinely
ambiguous, still reaches a human.
