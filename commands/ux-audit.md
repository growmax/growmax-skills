---
name: ux-audit
description: >-
  Audit a module (or the whole app) against the repo's UI standard (.claude/UI-STANDARDS.md),
  fan out ui-standards-reviewer per module, verify the findings, and write them into the living
  work queue docs/ux-drift-backlog.md as approvable rows — then hold ONE human gate to bless
  priorities. Bootstraps the standard from the template if the repo has none, and proposes
  catalog growth (CMP-5) when it finds the same element hand-rolled on multiple screens. Run this
  to take stock; then /ux-migrate works the approved backlog. Invoke with /ux-audit [module|all].
---

# /ux-audit — census UI drift into one approvable backlog

You are the **orchestrator**. `/ux-audit` answers "how far off-standard are we, and what's worth
fixing?" It produces one prioritized backlog and takes **one** human approval of priorities. That
approval is what authorizes `/ux-migrate` to work the queue without re-asking per item. So this
command's job is to make the backlog **complete, verified, and safe to approve in one pass**.

**Input:** `$ARGUMENTS` = optional scope — a module path (e.g. `pages/credit-notes`), `all`
(whole app, the default), or `--strict` (SHOULD violations count as blockers). Ambiguous → ask once.

**Review-only.** This command never edits source. It reads code and writes exactly two docs:
`docs/ux-drift-backlog.md` (the queue) and, in bootstrap mode, `.claude/UI-STANDARDS.md`.

## Phase 0 — Preconditions & the standard

1. **Is there a standard?** Read `.claude/UI-STANDARDS.md` in the repo.
   - **Present** → this is ground truth; note its version. Proceed to Phase 1.
   - **Absent → BOOTSTRAP MODE.** The repo has no standard yet. Run the **Bootstrap** procedure
     from `examples/UI-STANDARDS.template.md`: detect the framework (`next.config.*` +
     `app/`/`pages/` → Next.js app/pages router; `vite.config.*` → React+Vite), locate the
     primitives/composition/domain/token layers, enumerate the shared components, extract the
     icon map and tunables, reconcile contradictions into open questions. Write the filled
     instance to `.claude/UI-STANDARDS.md`, **present it to the human for review**, and stop.
     Auditing against an unreviewed, machine-guessed standard would flood the backlog with noise —
     the human blesses the standard first, then re-runs `/ux-audit`.
2. **Read the existing backlog** (`docs/ux-drift-backlog.md`) if present, so this run *adds to*
   and *reconciles with* it rather than duplicating rows. Note the last item ID (e.g. `D-020`).

## Phase 1 — Scope the census

Build the file list for the scope:
- `all` → every page/route file plus the shared-component directories (from Part B table 0).
- a module path → that directory's files plus the shared components they import.
Chunk into review-sized batches (roughly one module or ~15-20 files per batch) so each reviewer
gets a focused, context-safe slice.

## Phase 2 — Fan out (parallel)

Dispatch `ui-standards-reviewer` **one per batch, in a single message** so they run concurrently.
Each gets: the batch's file list, the standard (Part A + the relevant Part B rows), and the
backlog (so it skips already-tracked drift). Each returns `findings[]`, `catalogGaps[]`,
`skipped[]`, and a verdict.

## Phase 3 — Verify (you)

For every finding returned, confirm it against the cited code yourself — same discipline as
`/feature-review`: open the `file:line`, confirm the rule is actually violated, dedupe findings
multiple reviewers hit (merge citations). Drop what doesn't survive. Assign confidence from the
reviewer's `basis` + what you confirmed (HIGH = verified/corroborated, MEDIUM = read, LOW =
inferred/judgment). A finding you can't reproduce from the citation is dropped, not written to the
backlog — the backlog must stay trustworthy or `/ux-migrate` chases ghosts.

## Phase 4 — Write the backlog

Append verified findings to `docs/ux-drift-backlog.md` in the canonical row shape
(`examples/UX-DRIFT-BACKLOG.md`): `| ID | Task | Files | Rule | Status |`, continuing the ID
sequence, `Status: open`. Group by priority (P1 = adopt-shared-component wins and deprecated
patterns; P2 = realignments and confirmed bugs). For each `catalogGap` seen on ≥2 screens, write
an **extract-and-register** item (CMP-5): "extract the N hand-rolled copies of <element> into a
shared component and add its catalog row." Never overwrite existing rows or flip someone's manual
priority — you only add and reconcile.

## THE GATE — one approval (blocks)

Present a **digest first** — counts by rule and priority, the top items by leverage, and any
catalog-growth proposals — then point at the backlog and **stop**. The human does two things once,
for the whole scope:
1. **Blesses priorities** — reorders/edits the backlog rows, marks any as `accepted (reason)` (a
   deliberate exception — moves to *Accepted exceptions*, never flagged again) or `wont-fix`.
2. **Approves the catalog-growth proposals** — which off-catalog elements genuinely deserve a
   shared component.

Wait for the human. Their edited backlog is now the work contract for `/ux-migrate`.

## Phase 5 — Hand off

Tell the human what's queued: counts by priority, how many are pure-mechanical (safe, fast) vs
composition migrations (bigger diffs), and how many are confirmed bugs. Then point them at
`/ux-migrate [scope]` to work the approved backlog.

## Hard rules

- **The backlog is the approval.** Make it good enough that `/ux-migrate` needs no per-item
  business gate — an ambiguous "is this worth fixing?" is resolved here, not guessed downstream.
- **Never write an unverified finding.** If you couldn't confirm the citation, drop it.
- **Never invent standard rules.** Enforce only what `.claude/UI-STANDARDS.md` says; a genuine gap
  in the standard is reported to the human as a suggestion, not written as a drift row.
- **Add, don't clobber.** Reconcile with the existing backlog; preserve human edits and priorities.
- **No source edits here.** `/ux-audit` produces the backlog; `/ux-migrate` makes changes.

## Relationship to the other commands

- `/feature-review` — reviews ONE feature diff before a PR (`ui-standards-reviewer` is its 5th
  dimension). Use during development.
- `/ux-audit [scope]` — census existing drift across a module/app → one approval → the backlog
  (**this**). Use to take stock.
- `/ux-migrate [scope]` — work the approved backlog autonomously. Use to pay drift down.

## Model

Orchestrator on the session model. `ui-standards-reviewer` ships `sonnet` (composition/CMP-2
judgment is the value; the pure-mechanical tier is also caught for free by the
`check-ui-standards.sh` hook at write time). Bootstrap mode benefits from the session model's
reasoning for framework/layer detection.
