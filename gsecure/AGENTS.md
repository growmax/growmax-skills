# Test Build — the agentic unit-test workflow

Platform- and stack-neutral operating layer for a unit-test build. This
directory is the **single source of truth**: the role definitions in
`roles/`, the mechanics template in `references/`, and this workflow
document. The per-platform agent directories (`.claude/agents/`,
`.opencode/agents/`, …) contain **thin shims only** — they grant tools and
point here. Never put substance in a shim.

Input: the host project's approved batch plans in `void/test/Flow-based-plans/`.
Tracker: `void/test/unit-test-coverage-plan.md` §3/§4 (filled from
`void/test/unit-test-coverage-plan.template.md` at adoption time).

This system works for any project and any stack — FE-only, BE-only, or
full-stack. Everything stack-specific (test runner, harness, gates, file
layout) is host configuration, defined in `HOST-DEPENDENCIES.md` and filled
into the templates that ship with gsecure. Nothing here assumes a language,
framework, or test runner.

---

## 1. The premise that shapes everything

A test-cause is a **specification**, not a description. Its job is to state
what a unit promises and what would falsify that promise — derived from
intent (business rules, architecture docs, invariants, types, callers), with
the implementation read as *evidence about* the contract, never as the
contract itself.

Therefore:

> **A red test is the product of this exercise, not an obstacle to it.**

The role that writes tests has **no authority to change an expectation to
reach green**. That authority belongs only to triage and the fix path (§5).
Removing that authority is the single structural reason this build can find
production defects instead of rubber-stamping current behavior.

`characterization` — locking observed behavior — is an escape hatch for
genuinely undecidable intent, never the default. A test-cause made mostly of
characterization rows is a failed test-cause.

---

## 2. How these role files are written — two tiers, not a checklist

Every role file separates:

- **Invariants** — few, absolute. Each exists because violating it *corrupts
  the artifact*, not because it is the tidy way to work.
- **Defaults** — the usual path, explicitly departable. A role may deviate
  **when it states the situation, its reason, and its evidence.**

Declared deviation is the mechanism: it preserves judgment while keeping the
judgment auditable. Role files describe intent, authority, boundaries, and
what evidence a decision requires — never step-by-step scripts, never quotas.

The register these files are written in:

> ✗ "Fill all 9 test-cause sections. Cover all 8 challenge categories."
>
> ✓ "The test-cause exists to make the unit's promises explicit and to state
> what would falsify them. Sections, scenario count, and which challenge
> lenses are worth applying are **your** call per unit — a 12-line formatter
> and a session state machine do not deserve the same artifact, and padding
> one to resemble the other is a defect. What is *not* your call: every
> scenario names its authority and its evidence."

Every role returns a short **judgment log** — decisions taken, alternatives
rejected, why. The master aggregates these into the batch report and never
prescribes scenario counts or effort in a brief; it hands over the situation
and the authority to decide, and requires the reasoning back.

### Invariants shared by every role here

1. Never weaken, skip, or soften an expectation to make a test pass.
2. Never invent product behavior without evidence; state the uncertainty.
3. Never change production code outside the fix path (§5).
4. Every claim cites `file:line` or command output.
5. Never run `git` — the master owns every git operation (§6).
6. Never write the batch plan file, `unit-test-coverage-plan.md`, or the
   triage log; those are master-owned (§6.3).

---

## 3. Scenario authority — the tag that drives everything downstream

Every scenario in a test-cause carries one tag:

| Authority | Basis | If its test fails |
|---|---|---|
| `spec` | Documented rule, invariant, or explicit contract (the host's knowledge base of intent, business rules, coverage plan §5 traps) | Production code is wrong until proven otherwise |
| `inference` | Reasoned from types, callers, domain, adjacent code | Genuine ambiguity — triage decides |
| `characterization` | Intent undecidable now; locks observed behavior provisionally | Reversible by design; raised in the batch report |

Using `characterization` requires recording *why* intent could not be
established. That requirement is what keeps the tag honest.

---

## 4. Roles

| Role | Authority | Writes |
|---|---|---|
| `test-orchestrator` (master) | Owns the batch: pre-flight, waves, worktrees, merges, gates, ledgers, commits. Routes triage verdicts, sizes fix paths. | plan `Status:` lines, coverage plan §4/§5, triage log, git |
| `test-planner` | Decomposes one batch into a phased plan. Read-only analyst — never scenario design. | `void/test/Flow-based-plans/unit-test-<batch>.md` |
| `test-designer` (Pass A) | Full judgment over contract, risk, scenarios, depth, doubles. Bound by the authority-tag invariant. | `void/test/<batch>/<unit>.test-cause.md` |
| `test-adversary` | Judgment over whether a cause would catch real regressions; may send it back. | nothing — verdict + evidence |
| `test-implementer` (Pass B) | Judgment over mechanics, fixtures, doubles. **No authority over expectations.** | colocated test files, shared test-utils (when its wave owns them) |
| `test-triage` | **Sole** authority to classify a red test. Fixes nothing. | nothing — verdict + evidence (master persists) |
| `test-verifier` | Phase gates; post-fix confirmation that the cause is satisfied and nothing regressed. | nothing — verdict + evidence |
| `planner` / `builder` / `verifier` / `reviewer` | The host's feature-pipeline personas, unchanged — the fix path (HOST-DEPENDENCIES §1) | fix plan + production code |

Pass A and Pass B are separate roles deliberately (`unit-testing` SKILL §14):
one role doing both reliably degrades the test-cause into a summary of the
code it just read — SKILL §9's "test-after-the-fact rationalization". The
split also makes `existing-code-flow` Phase 6 (review the test-cause) a real
gate, because its reviewer is not its author.

`test-planner` runs once per batch, before the build starts, and its plan is
human-approved. It re-enters mid-build only if a batch needs re-decomposition.

---

## 5. The phase loop

```
 phase (in its own worktree — §6)
   │
   ├─ test-designer   ─► test-cause: spec-first, adversarial, authority-tagged
   │
   ├─ test-adversary  ─► tries to BREAK the cause:
   │                     "what wrong behavior survives every scenario here?"
   │                     shallow / implementation-mirroring / weak assertions
   │                     → back to designer (its judgment, not a checklist)
   │
   ├─ test-implementer─► the selected scenarios, faithfully; run them
   │                     red stays red — handed up, never resolved here
   │
   ├─ RED? ─► test-triage (read-only; verdict + evidence + minimal repro)
   │            ├─ TEST-BUG           → implementer fixes mechanics
   │            ├─ CAUSE-WRONG        → designer revises, records why
   │            ├─ PRODUCTION-DEFECT  → FIX PATH ↓
   │            └─ INTENT-UNDECIDABLE → provisional characterization, tagged,
   │                                    raised in the batch report
   │
   │   FIX PATH — reuses the host's real pipeline, nothing bespoke:
   │      planner  → <host plans dir>/fix-<unit>-<defect>.md
   │      builder  → the production fix
   │      verifier → static gates + conformance
   │      reviewer → the production diff
   │      test-verifier → originally-failing test green
   │                    + whole accumulated suite + typecheck, no regression
   │      → test-cause updated: defect confirmed, fixed, plan referenced
   │
   └─ green + cause satisfied ─► merge → Status ☑ → teardown (§6)
```

Fix-path authority:

- `spec`-authority failure with a **trivial/small** fix (one file, no behavior
  question — a rounding branch, a missing error case): the master routes it
  through the fix path and reports it. Work continues.
- A fix that **changes business behavior**, spans modules, or contradicts an
  intent doc: **stop and ask the human.** That is a product decision, and may
  call for updating the knowledge base rather than the code. It also cannot
  be driven from inside a test phase if the host's `planner` refuses
  standard/epic work without an approved architecture model — such a fix
  leaves the test build and becomes its own feature-pipeline run.
- `INTENT-UNDECIDABLE`: provisional characterization, aggregated, presented at
  batch end. Ambiguity never blocks a wave.

Budget: 3 attempts per failing unit, then escalate with evidence.

---

## 6. Worktree per phase

Every phase runs in its own git worktree and branch, merges into the
integration branch (this document calls it `test`; the host creates it at
adoption time — HOST-DEPENDENCIES §5), and is torn down. Copy the dependency
directory into the worktree with the fastest mechanism the platform offers
(e.g. APFS clonefile `cp -c -R` — seconds, ~0 real disk) so the test runner
and static gates work inside the worktree. `git worktree remove` deletes the
copied dependencies with it, and `git branch -d` **refuses an unmerged
branch**, which is the teardown guard.

### 6.1 Lifecycle (master-only; no other role runs git)

```
1. git worktree add -b test/<batch>-<phase> \
     ../.test-wt/<batch>-<phase>  test            # from the tip of test, so the
                                                  # phase sees all merged work
2. <copy the dependency dir into the worktree — e.g. cp -c -R node_modules>
3. dispatch designer → adversary → implementer → triage/fix → test-verifier
   (all with the worktree as their working directory)
4. green: from the test worktree —
     git merge --no-ff test/<batch>-<phase> \
       -m "test(<batch>): merge <BATCH> <PHASE> — <name>"
5. master flips that phase's `Status: ☐` → `☑ <date>` in the plan file ON test
   and commits it (never inside the phase worktree)
6. git worktree remove <wt>  &&  git branch -d test/<batch>-<phase>
   -d refusing = the merge did not happen = abort teardown, escalate
```

`--no-ff`, never squash: the phase stays a visible unit in history and a
`fix(...)` commit inside it stays legible beside the `test(...)` commits.

### 6.2 Abandoned phases are not deleted

After 3 failed loops the master escalates **with the worktree path**, so the
state stays inspectable. Tearing down an unmerged phase happens only on
explicit human approval (`git branch -d` refuses it anyway).

### 6.3 What the isolation forces

- **Master-owned files, written only on `test`:** the batch plan file (status
  flips), `unit-test-coverage-plan.md` §4/§5, and
  `void/test/<batch>/triage-log.md`. Every phase would otherwise write these
  and the second merge of a parallel wave would conflict. Roles report; the
  master appends.
- **Serialized shared infra:** the shared test-utils directory, the runner's
  config and setup files, the boundary-mock directory. A phase that must
  change these runs alone in its wave.
- **Propagate production fixes:** after a fix merges into `test`, the master
  runs `git merge test` inside every live phase worktree. Otherwise a
  parallel phase tests unfixed code and its triage verdicts are worthless.
- **Merges are serialized** by the master, one at a time.
- **Test runners:** with 3 phases live, cap the runner's worker count (e.g.
  half the machine's cores) so concurrent runs don't saturate it.

---

## 7. Batch flow (the master)

```
test-build <batch>
  │
  ├─ PRE-FLIGHT (once, cheap)
  │    plan Status: APPROVED · prior batch's §4 row verified ON DISK
  │    read §Scope, §Findings, §Phases (line-ranged, never the whole file)
  │    surface every Findings item needing a human decision in ONE ask
  │      e.g. the stack has no HTTP-double facility → add a devDependency
  │           or hand-roll adapters?  ← answered now, not mid-phase
  │
  ├─ WAVE LOOP  (phases whose deps are ☑; `[par: …]` phases batch, max 3)
  │    per phase: the §5 loop inside its own worktree (§6)
  │    wave of 2+ merged → integration gate on test: typecheck + full suite
  │
  ├─ BATCH END
  │    reviewer on the accumulated batch diff (BLOCK/FIX FIRST → max 3 loops)
  │    append newly discovered traps to coverage plan §5
  │    tick the batch's §4 row · commit · present the batch report
  │
  └─ next batch? — batches stay sequential, one slice at a time
```

State is derived **from disk**, never from session history: the resume point
is `grep 'Status: ☐' <plan>` plus `git worktree list` plus `git status`. A
batch may span sessions; re-running `test-build <batch>` resumes at the first
unbuilt phase.

### Human gates

| Gate | When |
|---|---|
| Pre-flight decisions | Batch start, once — Findings items needing a call (e.g. a new devDependency) |
| Business-behavior fix | Any production fix that changes behavior, spans modules, or contradicts an intent doc |
| Batch report | Batch end — open questions, provisional characterizations, defects found and fixed |
| Abandoned-phase teardown | Only when a phase is abandoned unmerged |

Everything else the master decides and reports.

---

## 8. Artifacts

| Artifact | Owner | Purpose |
|---|---|---|
| `void/test/<batch>/<unit>.test-cause.md` | designer (updated post-fix) | the specification and its rationale |
| colocated test files | implementer | the suite |
| `void/test/<batch>/triage-log.md` | master, from triage verdicts | every red test: verdict, evidence, route, outcome |
| `<host plans dir>/fix-<unit>-<defect>.md` | planner | production fixes the suite found |
| coverage plan §4 / §5 | master | batch status; newly found domain traps |

The triage log is the highest-value output of the build: the record of what
the suite actually found.

### `void/test/<batch>/triage-log.md` — the format

One table for the batch, appended a row at a time by the master as verdicts
come back. Fixed columns, so batches stay comparable and a later reader can
count what the suite caught:

```md
# Triage Log — <BATCH> (<slug>)

| # | Unit · test | Scenario authority | Verdict | Evidence | Route | Outcome |
|---|---|---|---|---|---|---|
| 1 | sessionStore · "offline refresh is skipped" | spec | PRODUCTION-DEFECT | `sessionStore.ts:142` skips the connectivity check; the session doc §8 requires it | fix plan `<plans>/fix-sessionstore-offline-skip.md` | fixed, re-confirmed <date> |
| 2 | cachePersister · "closed flag blocks a throttled write" | inference | TEST-BUG | fake timers not advanced with the async variant | implementer | green |
```

Rules: one row per **red test**, never per test file; `Evidence` carries the
production `file:line` and the contract source; `Outcome` is filled in when
the route closes, so an open row is visibly open. A batch whose log is empty
says something too — record "no red tests" explicitly rather than omitting the
file.

### The batch report — the format

What the master presents at batch end (and nothing more — it is a report, not
a transcript):

1. **Phases** — merged, with their commit SHAs; anything abandoned, and why.
2. **Defects found** — one line each: what was wrong, the contract it
   violated, the fix plan reference, and whether it is fixed or waiting on the
   human.
3. **Awaiting a decision** — provisional characterizations (`INTENT-UNDECIDABLE`)
   and open questions, each phrased as a question the human can answer without
   reading the code.
4. **New traps** appended to coverage plan §5.
5. **Suite delta** — test files and tests added; the whole-suite result.
6. **Judgment log digest** — the decisions the roles made that a reader of the
   tests would not be able to infer from the tests.

---

## 9. Gates and commands

The host defines its static gates at adoption time (HOST-DEPENDENCIES §2) —
typically a typecheck and a lint/static-analysis gate where the stack has
them, plus any architecture-conformance gate. This section only says which of
them apply where:

| Situation | Gates |
|---|---|
| A test phase | that phase's own test command over its paths (written into every batch plan's Acceptance line) + the typecheck gate + the lint gate (test files are code) |
| A wave of 2+, and batch end, on `test` | the full suite + the typecheck gate + the lint gate |
| A production fix inside the fix path | the **full** static set, the conformance gate included — the fix touches production code, so architecture drift is back in scope |

If the host keeps a warnings baseline for its lint gate, errors gate the build
and a **new warning class** a phase introduces is a finding even when the
command exits 0. Never silence a finding to pass, and the binding rule applies
everywhere: **a gate that does not run has not passed** — a `Missing script`
or an unconfigured tool is DID NOT RUN, never a pass.

---

## 10. Procedures (skills)

The reasoning framework is `unit-testing` (`skills/unit-testing/` —
readable by path from any platform; install it into the platform's skills
directory when the harness requires that): `SKILL.md` plus
`references/existing-code-flow.md` — the flow that applies when the code
already exists, with `new-feature-flow.md` and `refactor-protection-flow.md`
for the other two modes. Its §14 two-pass split is enforced structurally by
the roster above.

Stack mechanics are host-filled: `references/test-mechanics.template.md` is
copied to `references/test-mechanics.md` at adoption time and filled with how
the host's runner, harness, doubles, and timers actually behave — mechanics
only, no scenario design.

Everything else is cited, never copied: mock policy → coverage plan §2; file
layout and naming → `standards/test-file-structure.md`; test-cause template →
`existing-code-flow.md` Phase 5; quality bar → SKILL §9–§12.

---

## 11. Running it on each platform

Canonical role files: `agents/<role>.md`. Shims only below.

| Platform | Master runs as | Roles dispatched via |
|---|---|---|
| Claude Code | `/test-build <batch>` in the main session | `Agent` tool, subagent types from `.claude/agents/test-*.md` (shims) |
| Hermes Agent | the chat session IS the master | `delegate_task` with the canonical role file path |
| OpenCode | `test-orchestrator` primary agent (`.opencode/agents/`) | subagent shims pointing at the canonical role files |
| Anything else | read this file + `roles/test-orchestrator.md` | any subagent mechanism; or run the roles in sequence with fresh context per role |

The master must run wherever it can ask the human — it owns the gates in §7.
A master dispatched as a subagent that cannot ask stops at the first gate and
returns what needs approving; it never answers a gate on the human's behalf.

**Starting a batch:** `batch-prompts.md` (next to this file) holds the session
prompts — one core block, a continuation block for resuming, and a template
for writing each batch's own block. A batch block carries that batch's slug,
phase count, owned flows, the pre-flight decisions its plan leaves open, its
shared-infra phases, and the defects already suspected in its units. One core
block rather than a copy per batch: change the standard there and every batch
inherits it.

---

## 12. Scale

A full-application build is on the order of a hundred phases and several
hundred role dispatches (four per phase — designer + adversary + implementer
+ verify — before any triage or fix path). Two consequences worth planning
around:

- **The cheap decisions compound with every phase.** Line-ranged plan reads
  (batch plans can exceed 50 KB), one procedure reference per dispatch rather
  than three, and verdicts that cite evidence instead of dumping files.
- **Large batches are not one sitting.** Expect a batch to span sessions,
  which is exactly why state is derived from disk (§7) and why a phase's
  worktree is torn down only after its merge lands.
