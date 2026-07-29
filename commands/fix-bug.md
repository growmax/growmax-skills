---
name: fix-bug
description: >-
  Fix a bug that already has a human-confirmed RED reproduction, then have it GRADED rather than
  self-declared — the second half of the bug-fix pipeline. Verifies the repro is still red for the
  recorded reason, fixes the ROOT CAUSE without touching the frozen repro, then dispatches an
  independent validator (fresh context, read-only, default FAIL) that checks the repro is
  byte-identical to its confirmed commit and the named assertion truly passes. Use after
  /confirm-bug, when asked to "fix BUG-nnn", or to work a repro someone else confirmed. Invoke with
  /fix-bug <BUG-id>.
---

# /fix-bug — fix against a frozen grader, then be graded

> **Run this in a session that has NOT seen the repro being written.** The repro is the oracle; a
> context that watched it being authored drifts toward making it pass rather than making the bug go
> away. If you just ran `/confirm-bug`, start a fresh session for this. Phase one is
> [`/confirm-bug`](confirm-bug.md), which produces the confirmed repro this command consumes.

You are the **orchestrator**. You do not diagnose or fix yourself — you verify the contract,
dispatch `bug-fixer`, then dispatch `fix-validator` and report its verdict. You never overrule the
validator.

**Inputs:** `$ARGUMENTS` = the BUG id (e.g. `BUG-142`). Read `repro/BUG-<id>/repro.md` +
`meta.json` and the repo overlay (`.claude/E2E-NOTES.md` / `REPRO-NOTES.md`) if present. No id, or
no such folder → say so and stop; there is nothing to grade against. If the user wants a fix with
no repro at all, tell them that is `/confirm-bug` first — a fix with no red is unfalsifiable.

## The one rule everything else serves

**"Fixed" is not a claim the fixer gets to make.** It means, exactly:

```
meta.json.runner exits 0
  AND meta.json.expected_failure.test is present and PASSING
  AND git diff <meta.json.confirmed_commit> -- repro/BUG-<id>/ <spec_path>  is EMPTY
  AND the repo's own checks for the touched package(s) are green
```

The third clause is what makes the other three mean anything.

## Hard rules
- **The repro is frozen.** Nobody in this session edits `repro/**`, the repro spec, the runner
  script, or any test-runner config. Not to "improve" it, not to fix a typo in it. If the repro is
  genuinely wrong, STOP and hand it back to the human — a wrong grader is re-confirmed via
  `/confirm-bug`, never patched mid-fix.
- **Root cause, not symptom.** Seeding the expected value, swallowing an error, defaulting, or
  branching on the repro's inputs is NOT a fix — it is a counterfeit.
- **RED FIRST (blocks).** If the repro does not currently fail on its recorded assertion, stop and
  report. Never fix against a passing or differently-failing test.
- **The validator's verdict stands.** On FAIL you may loop back to the fixer with the reason, but
  you never argue, reinterpret, or downgrade a check to reach PASS. A validator that can be talked
  around is decoration.
- **DB-WRITE SAFETY (blocks).** If the fix or the repro run needs a database, confirm the target is
  local/throwaway before any write. Never point a fix loop at shared dev or production data.
- **Money/tenant/auth paths** keep their guards. Never widen a tenant scope or disable a check to
  make a number match.

## Workflow

### Phase 0 — Verify the contract (you)
Read `meta.json`. `confirmed_by_human` must be `true` and `confirmed_commit` set — if either is
missing, stop: the repro was never frozen, so "unchanged since confirmation" is unprovable. Then
run `meta.json.runner` yourself once and confirm it fails on the recorded assertion. Already green
→ report and stop (fixed elsewhere, or environment-dependent). Failing differently → report the
delta and stop; the human decides whether that is drift or a second bug.

### Phase 1 — Fix (subagent: `bug-fixer`)
Dispatch with the BUG id, the repro contract, and the overlay. It states the root cause before
editing, makes the smallest change at the cause, prefers the repo's existing canonical helper over
a second implementation, checks the blast radius, and re-runs the runner plus the narrowest
relevant suite and typecheck. It may add tests elsewhere; it may not touch the grader. It returns
root cause · fix · blast radius · real command output — and explicitly does not declare the bug
fixed.

### Phase 2 — Validate (subagent: `fix-validator`)
Dispatch with **the BUG id and nothing else** — no diff, no fixer report, no rationale. Its context
must be clean so it grades the artifact rather than the story. It runs the five checks (contract ·
grader-untouched-vs-confirmed_commit · runner exit 0 · named test present and passing · repo checks
green) and returns `VERDICT: PASS | FAIL` with evidence.

- **FAIL** → give the fixer the verdict's reason and loop Phase 1. **Cap: 3 loops**, then stop and
  hand it to the human with everything learned. A fix that cannot pass an honest grader in three
  attempts is a signal, not a grind.
- **PASS** → Phase 3.

### GATE — Human review (block)
Present the validator's verdict and evidence verbatim, the root cause, and the blast radius. Ask
via `AskUserQuestion`: **ship it** (commit) · **needs changes** (loop with their note) · **hold**
(leave the work in place, nothing committed). Do not commit on your own initiative.

### Phase 3 — Promote and record (you, after approval)
1. **Remove the repro's `REPRO_BUG` env gate** so the spec runs in every normal test run from now
   on. This is the step that converts a one-off repro into a permanent regression test — skip it
   and the bug can silently return. Re-run the suite once un-gated to confirm it is green in the
   normal path, and say so.
2. If the repo keeps a bug/coverage ledger, append: BUG id · root cause one-liner · the spec now
   guarding it.
3. Commit the fix + the promotion (never the repro's content — that is already committed and
   unchanged). Reference the BUG id.
4. **Report honestly:** what changed, what the validator verified, what is still unverified (e.g.
   "the currency side-finding is untouched — separate bug"), and any risk you would watch.

## Model selection
| Phase · agent | Recommended | Why | Don't go below |
|---|---|---|---|
| Orchestrator (this session) | **Sonnet** | Verifies the contract, enforces the loop cap, never overrules the verdict. | Sonnet. |
| 1 · `bug-fixer` | **Sonnet** (Opus for money/tenant/auth/concurrency) | Coding against a fixed target; iterates, so cost matters. Root-cause work on money paths is worth the upgrade. | Sonnet — weaker models reach for the symptom. |
| 2 · `fix-validator` | **Sonnet** | Must catch a skipped/renamed test and a repro-shaped special case; both are subtle and safety-critical. | **Never Haiku** — a grader that rubber-stamps defeats the pipeline. |

## Notes
- Standalone re-grade: [`/validate-fix <BUG-id>`](validate-fix.md) runs the same `fix-validator`
  on its own — for grading someone else's fix, a CI check, or a second opinion you didn't watch.
- Side-findings the fixer trips over are reported as NEW candidate bugs, never folded into this
  one. Each gets its own `/confirm-bug`.
- Keep run logs and diffs out of the main thread; the commit and the verdict are the record.
