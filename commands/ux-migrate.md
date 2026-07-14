---
name: ux-migrate
description: >-
  Work the approved UI-drift backlog (docs/ux-drift-backlog.md) top-down: per item, apply the
  smallest diff that lands on the shared component/token, re-run ui-standards-reviewer on the
  touched files to confirm the violation is gone, flip the row to done, and commit. Resumable
  from the backlog's statuses; app bugs discovered mid-migration are quarantined, never papered
  over. Run after /ux-audit has produced an approved backlog. Invoke with /ux-migrate [scope|ID].
---

# /ux-migrate — pay down UI drift from the approved backlog

You are the **orchestrator** working the backlog without a human in the per-item loop. `/ux-audit`
already produced and the human already blessed `docs/ux-drift-backlog.md` — that approval is the
contract. Your job is to grind through the `open` items, make the **smallest correct change**
(compose the shared component, don't restyle), verify each fix with `ui-standards-reviewer`, and
keep going when one item turns out to be harder than expected: quarantine it, log it, move on.

**Input:** `$ARGUMENTS` = optional scope — a priority band (`P1`), a module, a specific item ID
(`D-005`), or empty (all `open` items, P1→P2 order). `--dry-run` = plan only, no edits.

## Preconditions (check before editing anything)

1. **`docs/ux-drift-backlog.md` exists.** If missing → tell the human to run `/ux-audit` first.
2. **It has `open` rows in scope.** If everything in scope is `done`/`accepted`/`wont-fix` →
   report "nothing to migrate" and stop.
3. **A standard exists** (`.claude/UI-STANDARDS.md`) — the reviewer needs it to verify fixes.
4. **Clean-ish tree.** Note the current branch and `git status`; migrations should land as small
   reviewable commits, so don't start on top of a pile of unrelated uncommitted changes without
   flagging it.

## The work queue

Take `open` rows in scope, in **priority order (P1 → P2)**. Within a priority, prefer:
1. **Shared-component fixes first** (`phone-input`, `data-table`, `filter-chip`, `sort-dropdown`)
   — one edit fixes every screen downstream, and later per-screen items may disappear once the
   primitive is right. Do these before the screens that depend on them.
2. **Then per-screen migrations** (adopt `NotesAndTerms`, move a footer bar into the header…).
3. **Then confirmed bugs.**

Default sequential. You MAY batch a few tiny mechanical items into one commit if they're the same
rule and touch unrelated files.

## Per-item loop

For each item:

1. **Read the item + the standard rule it cites.** Open the target file(s). Confirm the violation
   still exists (the code may have moved since `/ux-audit`; re-locate by pattern, not line number).
   If it's already fixed → flip to `done (already fixed)` and continue.
2. **Apply the smallest correct diff.** Compose the catalog component / use the token — never
   patch classes onto the hand-rolled version, never fork a new variant. Preserve behavior:
   props, handlers, data flow, and copy stay identical; you're changing *how it's built*, not
   *what it does*. If the shared component is missing a prop the screen genuinely needs, fix the
   **shared component** (that's CMP-4) rather than working around it — and note it.
3. **Verify.** Re-run `ui-standards-reviewer` on the touched files. The cited rule must now be
   clean and **no new violation introduced**. If not green, iterate (cap ~3 attempts) then
   quarantine (below).
4. **Record + commit.** Flip the row to `done (<short note>)` in the backlog. Commit per item (or
   per small same-rule batch) with a message naming the rule ID and files
   (`fix(ui): adopt NotesAndTerms on quotes/orders/invoices edit [D-001, CMP-2]`). Keep per-item
   iteration logs OUT of the main thread — record only the outcome.

## Non-blocking failure handling (what keeps it autonomous)

A single hard item must not halt the run. Classify and **continue**:

| Outcome | Action — then CONTINUE |
|---|---|
| ✅ Fixed & verified | Flip to `done`, commit. |
| 🧱 Bigger than a migration (needs a real refactor / new shared component from scratch) | Leave code untouched; flip to `blocked (needs <what>)` with a note; continue. |
| 🐞 APP BUG surfaced (the "fix" reveals broken behavior) | **Quarantine:** revert the item's edit, add a `bug (…)` note with a repro; never commit a behavior change to force the rule green. Continue. |
| ❓ Ambiguous — two valid ways to compose it, product call needed | **Park:** leave untouched, flip to `question (…)` with the precise question; continue. |
| 🔁 Verify won't go green after ~3 attempts | Revert to the last clean state, flip to `blocked (verify)`, continue. |

The only mid-run stop is a **global blocker** (standard missing, repo won't build, reviewer can't
run) — then stop and report, don't churn.

## Finish (once, at the end)

- **Summary:** items done / blocked / parked / quarantined-bug, by priority; the list of app bugs
  found (with repros); the list of parked questions for the human. Re-run those items after the
  human answers / the primitive lands.
- **Backlog reflects reality** — every processed row has a current status; the *Done* section
  grew; *Accepted exceptions* untouched unless the human added one.
- **Commits:** only verified fixes committed. Nothing half-migrated left in the tree — revert
  anything you couldn't take green. Don't open a PR unless the human asks.

## Hard rules

- **Compose, never restyle or fork.** The fix is always "use the shared unit"; if the shared unit
  is inadequate, fix it (CMP-4) — do not clone it.
- **Behavior-preserving.** A migration changes construction, not what the user sees or does. If
  you can't keep it behavior-identical, it's not a migration — quarantine/park it.
- **Verify every fix.** Never flip a row to `done` without a green `ui-standards-reviewer` pass on
  the touched files. An unverified "done" is worse than an untouched `open`.
- **Never paper over an app bug** to make a rule pass — quarantine with a repro.
- **Small commits.** One item (or one same-rule batch) per commit, message cites the rule ID.

## Relationship to the other commands

- `/ux-audit [scope]` — produces & gets approval for the backlog (run first).
- `/ux-migrate [scope]` — works that approved backlog (**this**).
- `/feature-review` — keeps *new* work on-standard so the backlog stops growing.

## Model

Orchestrator on the session model (it makes the edits and the keep/quarantine calls).
`ui-standards-reviewer` verifies on `sonnet`. For a very large backlog the per-item loop can be
offloaded to a Workflow `pipeline()` (fix → verify per item, quarantine → null, logged) — same as
`/e2e-batch`'s scaling note; reach for it only when size makes the sequential loop impractical and
only with the user's okay, since it spawns many agents and edits files (use `isolation: worktree`
if items touch overlapping files).
