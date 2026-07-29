---
name: confirm-bug
description: >-
  Turn a raw bug report into a CONFIRMED, machine-checkable RED reproduction — the gated first half
  of the bug-fix pipeline. Diagnose read-only against the real code (and, with human-provided
  access, read-only live queries) → YOU rule on what the correct behavior is → write a
  deterministic failing repro artifact (repro/BUG-<id>/ + an env-gated spec) that fails for the
  bug's reason and will pass only when truly fixed → YOU confirm the red and freeze it. Never
  fixes. Use when asked to "confirm this bug", "reproduce this bug", "is this a real bug?", or
  when a bug report arrives from chat/testers. Invoke with /confirm-bug <bug report | BUG-id>
  (paste the report verbatim — URLs, logins, screenshots descriptions and all).
---

# /confirm-bug — gated bug confirmation → red repro (diagnose + reproduce, never fix)

> **This command ends at a human-confirmed RED repro. Fixing is a separate session.** The repro is
> written from the bug report and the human ruling — never from a planned fix — and once confirmed
> it is frozen: it becomes the grader that decides whether a future fix is real. Running
> reproduce and fix in one context lets the repro drift toward asserting whatever the fix does;
> the session boundary is the mechanism, not a formality. (`/e2e-flow` is the sibling for *green*
> coverage of working flows; this command exists to pin *broken* behavior red-first.)

You are the **orchestrator** in the main session. You do NOT diagnose or write specs yourself —
you **dispatch subagents** via the Task tool (`bug-diagnostician`, then `bug-reproducer`), thread
their outputs forward, and **enforce the gates**. Subagents cannot spawn subagents.

**Inputs:** `$ARGUMENTS` = the bug report, verbatim. Keep every concrete detail — URLs, tenant,
logins the human shared, exact numbers/strings seen, screenshots described. Vague reports ("X is
broken") → ask for expected vs actual + where seen, before dispatching anything.

**BUG id:** use the tracker's number when one exists (GitHub issue #142 → `BUG-142`); otherwise
`BUG-<YYYYMMDD>-<slug>`. One id = one bug = one repro. Side-findings discovered along the way
(a second inconsistency, a formatting drift) are reported as NEW candidate bugs — never folded in.

**Repo overlay:** if `.claude/E2E-NOTES.md` (or `REPRO-NOTES.md`) exists, read it FIRST and pass
its facts (surfaces, runners, ports, logins, JWT shape, test-data + teardown convention,
DB-safety) to each subagent. Without it they fall back to repo discovery.

## The repro artifact contract

One folder per bug, committed:

```
repro/BUG-<id>/
  repro.md      # plain-language summary: trigger, expected vs actual, failing assertion, seed data
  meta.json     # the machine contract (below)
```

The executable spec lives in the SURFACE'S OWN test tree (so it inherits the repo's real config,
auth and helpers), **env-gated so normal runs and CI never execute it while it is red**:

```ts
// api (jest):      const d = process.env.REPRO_BUG === 'BUG-142' ? describe : describe.skip;
// web (playwright): test.skip(process.env.REPRO_BUG !== 'BUG-142', 'runs only via its repro runner');
```

`meta.json`:

```json
{
  "bug_id": "BUG-142",
  "title": "<one line>",
  "surface": "api | web",
  "artifact_type": "jest-e2e | playwright | vitest | node-test",
  "spec_path": "<path to the env-gated spec>",
  "runner": "<exact command that runs ONLY this repro, incl. REPRO_BUG=BUG-142 AND a machine-parseable reporter>",
  "expected_failure": {
    "test": "<exact test name that must fail pre-fix>",
    "assertion": "<the specific field/value asserted>",
    "expected": "<value per the human ruling>",
    "actual": "<value the buggy code produces today>"
  },
  "matrix": [
    { "case": "<short name, also the test name>", "asserts": "<what it pins>",
      "expected": "<value>", "red_today": false }
  ],
  "db_impact": "throwaway | self-cleaning | none",
  "risk_tier": "RED | YELLOW | GREEN",
  "ruling": "<the human's one-line ruling on correct behavior>",
  "fix_strategy": "<the human's approved structural choice at Gate A, or null>",
  "source_report": "<issue link / where the report came from>",
  "protected": true,
  "confirmed_by_human": false,
  "confirmed_commit": null
}
```

(`confirmed_commit` is a **legacy** anchor for repros confirmed before tags existed — it stays
`null` on new repros; the pushed tag `repro-BUG-<id>` is the authoritative baseline.)

"Fixed" later means exactly: `runner` exits 0, `expected_failure.test` **and every `matrix` case**
pass, and `git diff repro-BUG-<id> -- repro/BUG-<id>/ <spec_path>` is EMPTY.

### The matrix: one fixture, many assertions

`expected_failure` is **the primary** — the single assertion that must flip red→green. `matrix` is
the fence around it: extra cases in the SAME spec, off the SAME fixture, that pin the boundaries a
single case cannot. Rows come from the diagnostician's MATRIX DIMENSIONS (one per **DIFFERS** row of
the divergence table) plus the standard checklist in `bug-reproducer.md`.

**Only the primary must be red.** A matrix row that already passes is a successful guard, not a
failed repro — record it `red_today: false` and move on. Never contort the fixture to redden a row.

Required at **YELLOW and RED**; optional at GREEN (primary alone is fine for a copy fix).

### Risk tier

The diagnostician proposes it; it is recorded in `meta.json.risk_tier` and it tunes how much
ceremony this bug gets. **Tier the rigor, never delete the gate.**

| Tier | What it means | Strategy Q at Gate A | Matrix | Gate B |
|---|---|---|---|---|
| **RED** | money/pricing/tax/currency · auth/RBAC/tenant scoping · schema/migration · a shared unit with ≥3 callers | required | required (full checklist) | human runs the runner |
| **YELLOW** | business logic, queries, document flows, single module | asked | required (DIFFERS rows + a cross-tenant case) | evidence review |
| **GREEN** | copy/styling/empty state/formatting-only, single call site, no money | skipped | optional | evidence review |

## Hard rules
- **Diagnosis is read-only.** Code reading always; live checks ONLY with human-provided access and
  ONLY read operations (GraphQL queries — never mutations; SELECT-only SQL; no UI form submits).
  Every live call made is logged in the diagnosis.
- **The repro asserts the EXPECTED behavior from the GATE 1 ruling** — never what the code
  currently does, never what a hypothetical fix would produce.
- **DB-WRITE SAFETY (blocks).** A repro that seeds data writes to whatever DB the target is bound
  to. Before the first write, CONFIRM the target is a throwaway/local DB or the repo's sanctioned
  self-cleaning e2e pattern — never an unconfirmed shared dev/production DB. Unconfirmed → stop
  and ask the human.
- **Red for the RIGHT reason.** A repro failing on setup (auth, connection, missing seed, typo) is
  NOT a reproduction. The reproducer interrogates its own failure and fixes setup only. Cap: ~5
  run attempts → report **UNREPRODUCIBLE** honestly, with what was tried. Never manufacture a
  fake red. Unreproducible is a valid, useful outcome — not a failure of this command.
- **Only the primary must be RED.** Matrix rows exist to fence the boundaries; some will already
  pass. Never bend the fixture to make one fail, and never drop one because it passes.
- **GATE A (ruling + strategy) blocks, in ONE `AskUserQuestion` call.** No repro until the human has
  ruled on correct behavior. Two calls where one would do is a gate you will be forgiven for
  skipping — and a skipped gate is worse than a merged one.
- **GATE B (confirm red) blocks and ends the command.** Do not proceed to fixing in this session
  under any circumstances — even if asked. Fixing happens in a fresh session against the frozen
  repro.
- **After confirmation the repro is frozen.** No edit, rename, skip, weaken, or runner change —
  by anyone, ever, except a human who decides the repro itself was wrong.

## Workflow

### Phase 0 — Intake (you)
Assign the BUG id. Restate the report in one line: *expected vs actual, where seen*. Pick the
likely surface(s). If the report lacks either an expected or an actual, ask now.

### Phase 1 — Diagnose (subagent: `bug-diagnostician`)
Dispatch with the verbatim report + overlay facts. It locates every surface showing the symptom,
the exact code path behind each (file:line), builds the divergence table when two surfaces
disagree, ranks root-cause hypotheses with the evidence that discriminates them, and separates
CODE BUG from PRODUCT AMBIGUITY from DATA ISSUE. Read-only. Writes nothing.

### Phase 1.5 — Tier floor (you; deterministic, no interrupt)
The diagnostician *proposes* a tier; you enforce a floor, because under-tiering is prompt-level and
cheap to backstop. If the repo overlay has a `TIER FLOORS` section (glob → tier), apply it;
otherwise the default: any cited path matching
`pricing|billing|payment|invoice|tax|currency|auth|rbac|tenant|migration|schema` → floor **RED**.
`final_tier = max(proposed, floor)` — a floor can only raise, never lower. Record `final_tier` as
`meta.json.risk_tier` and say so when you raised it.

### GATE A — Diagnosis · ruling · strategy (block; ONE interrupt)
Present the diagnosis and the ranked causes as text. Then issue **exactly one `AskUserQuestion`
call** carrying up to three questions:

1. **The ruling** (always) — what the correct behavior is. From the diagnostician's
   `ruling_question` block, which already arrives in option shape.
2. **The fix strategy** (when `risk_tier` is YELLOW or RED) — from the diagnostician's
   `FIX STRATEGY OPTIONS`. This is the *structural* choice a repro can never make: patch the one
   call site, or consolidate the duplicated implementations behind one shared unit, or drop the
   surface entirely. All of them turn the repro green; only one is right for the codebase.
3. **The factual discriminators** (when any exist) — anything answerable from the screenshot or
   screen already in hand. One of these can overturn the diagnosis, and it costs a glance.

**Why they merge:** the diagnosis already contains everything needed to choose a strategy, so
asking later would be a second interrupt for information already on the table. Merge gates by what
they *ask*, not by where they sit in the sequence. Three questions in one call is one interrupt;
three calls are three.

Rules for the ruling question:
- **2–4 options**, each a *concrete behavior*, not a vague direction. Label ≤5 words
  ("Invoiced revenue everywhere"); the description says what the repro would then assert and what
  becomes the bug.
- **Cite the evidence per option** (how many places in the codebase already behave that way,
  which comment/sibling/spec endorses it) — evidence helps the human decide.
- **Never mark an option "Recommended", and never pre-select one.** Ordering by weight of
  code evidence is fine; steering is not. This gate exists precisely because the model must not
  decide product truth.
- **Ask the cheap factual discriminators in the same call** as additional questions — anything the
  human can answer from the screenshot they already have (a label that flips when a flag is on, a
  visible status, which window was selected). One of those can overturn the whole diagnosis, and
  it costs them a glance.
- Ask **only** what changes the repro. Anything derivable from the ruling is not a question.
- If `AskUserQuestion` is unavailable, fall back to a numbered list and wait — but the options
  must still be there.

Rules for the **strategy** question (different from the ruling — note the one reversal):
- Options are *structures*, not intentions: "patch the one call site" · "consolidate behind one
  shared unit" · "delete the surface". Each says what changes, its blast radius, and what recurrence
  it prevents.
- **This question MAY carry a recommendation** — mark it `(Recommended)` and say why. Structure is an
  engineering call where the repo's own conventions (reuse rules, existing canonical helpers,
  duplicate-implementation counts) give a defensible answer. That is the opposite of the ruling,
  where recommending would defeat the gate. Keep the distinction: **product truth is the human's;
  code structure is advisable.**
- The answer goes verbatim into `meta.json.fix_strategy`, and `/fix-bug` implements *that* structure.

The ruling becomes the **expected-behavior contract** the repro asserts, verbatim in
`meta.json.ruling`. Wait for the answers. Never rule yourself, and never proceed on "probably X".

### Phase 2 — Reproduce (subagent: `bug-reproducer`)
Dispatch with the diagnosis + the ruling + overlay facts + the BUG id. It rebuilds the CONDITIONS
of the bug minimally and deterministically (hand-computable seed values — the point is a failure
anyone can read in five seconds), writes the env-gated spec + `repro/BUG-<id>/`, runs it via the
exact runner, interrogates the failure, and returns a **REPRODUCTION SUMMARY**: the failing
assertion, expected vs actual, the runner command. It never touches app source.

### GATE B — Confirm the red (block; ends the command)
Print the runner command, the primary's expected-vs-actual, and the matrix rows with their
`red_today` state. Then ask via `AskUserQuestion`: **the red is correct** (freeze it) · **the red is
wrong / not my bug** (back to Phase 2 with their correction) · **couldn't run it** (report the
blocker; the repro stays unconfirmed).

**Rigor is tiered — the gate never disappears, only its cost changes:**
- **RED tier:** ask the human to run `meta.json.runner` **themselves** before answering. On money,
  auth, tenant-scoping and schema work, the trust anchor is worth a terminal trip.
- **YELLOW / GREEN:** approval from the printed expected-vs-actual is enough. Offer the command, do
  not insist.

On confirmation, freeze in TWO moves — ONE commit, then the tag that can't be quietly undone:
1. Flip `confirmed_by_human: true` (leave `confirmed_commit` **null** — see below), commit the
   repro folder + spec as a single commit.
2. **Tag that commit and push the tag:** `git tag repro-BUG-<id> && git push origin repro-BUG-<id>`.
   The tag IS the confirmation record and the validator's authoritative baseline — a later session
   can edit `meta.json`, but cannot move a pushed tag without a force-push that GitHub tag
   protection (`repro-*` pattern; enable it once per repo) blocks outright. If the push is refused
   or offline, say so — the freeze is weaker until the tag lands.

Do NOT write the commit's SHA back into `meta.json` afterwards: a follow-up "record the SHA" commit
moves the tree past the tag and makes tag-vs-meta disagree on every repro — a self-inflicted tamper
signal (this exact defect was caught by the adversarial evals in `regression/bugfix-pipeline/`).
`confirmed_commit` exists for legacy repros confirmed before tags; the tag supersedes it.

Append one row to the run ledger `.claude/bugfix-ledger.md` (create with a header row on first
use): `date · BUG id · tier · red-genuine-first-try? · repro attempts · matrix size ·
agent tokens (approx) · confirmed?`. Token cost is measured, not estimated — it is how the team
decides where the pipeline earns its spend. Then stop. Report: BUG id, runner
command, the frozen primary assertion, the matrix size, `risk_tier`, `fix_strategy`, and the handoff
line — *"fix in a fresh session; the repro is the grader."* If the human says the red is wrong → back
to Phase 2 with their correction (still unconfirmed, so it may be edited).

## After this command
- **Fix** ([`/fix-bug`](fix-bug.md), separate session): re-runs the runner (must be red exactly as
  recorded) → implements the approved `fix_strategy` at the root cause → **mutation check** (revert
  the fix, prove the repro goes red again, restore) → independent validation → your ship gate →
  promotion. The fix session may NOT touch `repro/**`, the spec, or the runner.
- **Interrupt budget across both commands: 3** — Gate A (ruling + strategy), Gate B (confirm red),
  and the ship gate in `/fix-bug`. Everything else is mechanical and costs you nothing.

## Model selection
| Phase · agent | Recommended | Why | Don't go below |
|---|---|---|---|
| Orchestrator (this session) | **Sonnet** | Threads outputs, enforces gates. | Sonnet. |
| 1 · `bug-diagnostician` | **Opus** | Root-cause ranking across resolvers/services/SQL gates everything downstream; a confident wrong cause wastes the whole loop. | Sonnet if cost-bound; never Haiku. |
| 2 · `bug-reproducer` | **Sonnet** (Opus for money-path bugs) | Writing + the red-interrogation loop; iterates, so cost matters. | **Never Haiku** — it rubber-stamps setup failures as reproductions. |

## Notes
- Works with or without a dedicated repro harness: the spec uses the repo's EXISTING runner and
  helpers (jest-e2e config, Playwright config, auth/seed helpers), and the env-gate keeps red
  repros out of every normal run. If the repo later ships a dedicated `pnpm repro` runner /
  throwaway test DB, only `meta.json.runner` changes.
- Multi-tenant apps: the repro must pin an explicit tenant AND role; when the bug is a
  cross-surface disagreement, the repro calls BOTH real endpoints with the SAME window/inputs and
  asserts they agree on the ruled value.
- Keep run logs and screenshots out of the main thread; the committed artifact is the folder + the
  spec, nothing else.
