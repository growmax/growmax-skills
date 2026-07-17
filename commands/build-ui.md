---
name: build-ui
description: >-
  Develop new or changed UI standards-first, as a gated build→verify loop: the ui-builder
  agent composes the UI from the repo's own .claude/UI-STANDARDS.md (catalog components +
  tokens, compose-never-fork, CMP-5 off-catalog protocol), then ui-standards-reviewer
  independently verifies the touched files and the loop repeats until PASS (capped). This is
  how UI gets BUILT compliant instead of audited into compliance later. Bootstraps the
  standard from the template if the repo has none. Use whenever asked to build/add/change a
  page, screen, component, modal, form, or layout in a repo that adopts the standard. Invoke
  with /build-ui <what to build or change>.
---

# /build-ui — develop UI standards-first (build → verify → green)

You are the **orchestrator**. The team's rule is: UI is not "built, then audited" — it is
**born compliant**. You dispatch `ui-builder` to develop the request with the standard in hand,
then have `ui-standards-reviewer` (the same engine behind `/feature-review` and `/ux-audit`)
independently verify the result. Builder and reviewer are separate agents on purpose — the one
who wrote the code never gets the final word on whether it complies.

**Input:** `$ARGUMENTS` = what to build or change, in plain language, optionally with target
files/module (e.g. `a bulk-export modal on the orders list`, `add a date-range filter to
src/app/invoices`). `--strict` = promote SHOULD/WARN findings to blockers for the verify gate.

## Preconditions

1. **The standard exists** (`.claude/UI-STANDARDS.md`). If missing, STOP and offer the
   bootstrap: copy `examples/UI-STANDARDS.template.md` from the growmax-skills plugin into the
   repo's `.claude/` and run its Bootstrap procedure (or run `/ux-audit`, which does the same).
   Never let `ui-builder` improvise a design system — that's how drift is born.
2. **Behavior is clear enough to build.** If the request is ambiguous about *what the UI should
   do* (not how it's constructed — the standard decides construction), ask the human the
   specific question first. One round, then build.
3. **Note the git state.** Don't start on top of a pile of unrelated uncommitted changes
   without flagging it.

## Phase 1 — BUILD (`ui-builder`)

Dispatch `ui-builder` with the request, any scoping the human gave, and a reminder of the
repo-specific facts you know (framework, module conventions). It loads the standard + backlog
itself and returns a **compliance manifest**: touched files, composed catalog units,
CMP-5 catalog additions, CMP-4 shared-component changes, judgment calls, open questions, and
its self-check results.

Act on the manifest before verifying:

- `openQuestions[]` non-empty → bring them to the human now; don't verify half-decided UI.
- `sharedComponentChanges[]` non-empty → tell the human which shared units changed (other
  screens are affected) — this is information, not a gate.
- `catalogAdditions[]` with `catalogRowAdded: false` → send it straight back to `ui-builder`
  to register the row (CMP-5 says the row is part of the definition of done).
- `NO_STANDARD` → precondition 1 failed; run the bootstrap offer.

## Phase 2 — VERIFY (`ui-standards-reviewer`)

Run `ui-standards-reviewer` on exactly the touched files (pass `--strict` through if given).
The reviewer is judge, not builder — it never edits.

- **PASS** → done; go to Finish.
- **Findings** → route them back to `ui-builder` with the finding list verbatim (rule IDs,
  file:line, suggested compose fix). Then re-run the reviewer on the touched files.
- **Cap: 3 build→verify rounds.** Still not green → STOP and report the surviving findings
  with the reviewer's evidence; let the human decide (fix differently, accept as known drift
  in `docs/ux-drift-backlog.md` → *Accepted exceptions*, or park). Never silently accept a
  BLOCKER, and never let the builder "accept" its own violation.

Findings tagged `basis: judgment` (e.g. "should this be shared?") are the human's call — don't
loop on them; surface them in the report.

## Finish

Report, briefly:

- What was built and where (touched files), and which catalog components it composes.
- Catalog growth: any CMP-5 additions (component + its new Part B row) and CMP-4
  shared-component fixes (with the note that downstream screens are affected).
- The verify verdict (PASS / what was accepted-and-tracked) and the rule IDs that came up.
- Judgment calls left open for the design owner, if any.

Commit only if the human asked (or the session's task explicitly includes committing) — one
commit, message naming the surface and any rule IDs that shaped it. Never open a PR unless
asked.

## Hard rules

- **Builder ≠ verifier.** `ui-builder` writes; `ui-standards-reviewer` judges. Never skip
  Phase 2 because the manifest "looks clean" — the self-check is a floor, not the gate.
- **The standard wins** over the request's phrasing on construction ("make it a red button" →
  the destructive variant; "add a Loading… text" → the shared skeleton). If the human insists
  on an off-standard construction after you've said so once, do it and record it in
  `docs/ux-drift-backlog.md` → *Accepted exceptions* in the same change.
- **No standard → bootstrap first, build second.** Never improvise.
- **Known drift stays tracked.** If the build touches a file with an open backlog item, don't
  silently fix or worsen it — fixing it is welcome but flip the backlog row; worsening it is a
  finding.

## Relationship to the other commands

- `/build-ui` — UI gets **born** compliant (this).
- `/feature-review` — end-of-branch gate; its `ui-standards-reviewer` dimension should find
  nothing new if `/build-ui` did its job.
- `/ux-audit` → `/ux-migrate` — census and pay down the *legacy* drift that predates this
  workflow.
- The plugin's hooks are the safety net under all of it: a prompt-time trigger that routes UI
  intent here, a write-gate that blocks UI writes until the session has read the standard, and
  a mechanical post-write grep for the obvious violations.

## Model

Orchestrator on the session model. `ui-builder` and `ui-standards-reviewer` on `sonnet`.
