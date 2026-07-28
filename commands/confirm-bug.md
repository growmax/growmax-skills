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
  "artifact_type": "jest-e2e | playwright | vitest",
  "spec_path": "<path to the env-gated spec>",
  "runner": "<exact command that runs ONLY this repro, incl. REPRO_BUG=BUG-142>",
  "expected_failure": {
    "test": "<exact test name that must fail pre-fix>",
    "assertion": "<the specific field/value asserted>",
    "expected": "<value per the human ruling>",
    "actual": "<value the buggy code produces today>"
  },
  "db_impact": "throwaway | self-cleaning | none",
  "ruling": "<the human's one-line ruling on correct behavior>",
  "source_report": "<issue link / where the report came from>",
  "protected": true,
  "confirmed_by_human": false,
  "confirmed_commit": null
}
```

"Fixed" later means exactly: `runner` exits 0, `expected_failure.test` passes on its recorded
assertion, and `git diff <confirmed_commit> -- repro/BUG-<id>/ <spec_path>` is EMPTY.

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
- **GATE 1 (diagnosis + ruling) blocks.** No repro until the human confirms the diagnosis AND
  rules on the correct behavior.
- **GATE 2 (confirm red) blocks and ends the command.** Do not proceed to fixing in this session
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

### GATE 1 — Diagnosis + ruling (block)
Present: the diagnosis, the ranked causes, and **the product question** — usually *"which behavior
is correct?"* (e.g. two screens disagree on "revenue": same metric everywhere, or different
metrics mislabeled?). The human's answer becomes the **expected-behavior contract** the repro
asserts. Wait. Never rule yourself.

### Phase 2 — Reproduce (subagent: `bug-reproducer`)
Dispatch with the diagnosis + the ruling + overlay facts + the BUG id. It rebuilds the CONDITIONS
of the bug minimally and deterministically (hand-computable seed values — the point is a failure
anyone can read in five seconds), writes the env-gated spec + `repro/BUG-<id>/`, runs it via the
exact runner, interrogates the failure, and returns a **REPRODUCTION SUMMARY**: the failing
assertion, expected vs actual, the runner command. It never touches app source.

### GATE 2 — Confirm the red (block; ends the command)
The human runs `meta.json.runner` THEMSELVES and checks the failure is the one from the report —
not setup noise. On their confirmation: flip `confirmed_by_human: true`, commit the repro folder +
spec, record that commit's SHA into `confirmed_commit` (amend or follow-up commit), and stop.
Report: BUG id, runner command, the frozen assertion, and the handoff line — *"fix in a fresh
session; the repro is the grader."* If the human says the red is wrong → back to Phase 2 with
their correction (repro is still unconfirmed, so it may be edited).

## After this command
- **Fix** (separate session): re-run the runner (must be red exactly as recorded) → smallest root-
  cause fix → runner green → repo's own checks. The fix session may NOT touch `repro/**`, the
  spec, or the runner — validate by diffing against `confirmed_commit`.
- **Promote** (after the fix ships): optionally graduate the spec into the permanent regression
  suite (drop the env-gate, move it beside its neighbours) so the bug class stays guard-pinned.

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
