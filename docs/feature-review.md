# /feature-review — usage guide

End-of-development review workflow. Every teammate runs it when their feature branch is "done",
before opening or updating the PR. One command, four specialist reviewers in parallel, one
verified scorecard.

```text
/growmax-skills:feature-review                       # diff vs the repo's default branch
/growmax-skills:feature-review develop               # diff vs a named base branch
/growmax-skills:feature-review --only scale          # run just one dimension
/growmax-skills:feature-review --strict              # UX warns become blockers
```

## The four dimensions

| # | Reviewer | Question it answers | Blocks? |
|---|---|---|---|
| 1 | `tdd-reviewer` | Does every changed behavior have a real, passing, behavior-asserting test? Did the narrowest relevant suite actually run green? | **Yes** |
| 2 | `ux-flow-reviewer` | Can the user finish the job on the screen they're on? Every entity picker offers **contextual creation** (create-in-place, e.g. "+ Add customer" right on the assigned-customers screen) instead of a detour that loses their context. Empty/loading/error states, round-trip state preservation, neighbour consistency. | Warns (blocks with `--strict` or overlay rules) |
| 3 | `scale-security-reviewer` | The **10k-row test**: unbounded queries, N+1, missing indexes, payload bloat, client-side filtering of full datasets, unvirtualized lists — plus authz on every new surface, tenant scoping, input validation, injection, mass assignment, secrets. | **Yes** |
| 4 | `arch-advisor` | Is there a materially better shape — missed reuse, wrong layer, drift starting? Max three ranked ideas. | Never (advisory) |

**"Contextual creation"** is the name for requirement #2's pattern (also called create-in-place
or inline create): wherever the UI asks the user to *pick* an entity, it also offers to *create*
one right there — modal or sheet, pre-filled from context, auto-selected on save — so the user
never has to leave, create elsewhere, and navigate back.

## The repo overlay (what makes it sharp)

The reviewers are portable, but generic review is noisy review. Each product repo commits a
`.claude/REVIEW-NOTES.md` (template: `examples/REVIEW-NOTES.template.md`) carrying:

- test commands per surface (so `tdd-reviewer` runs the right, narrowest suite),
- the repo's **blocking house rules** (e.g. ARC: tenant isolation, RBAC decorators, currency
  policy, no fallback data),
- UX/scale/security conventions and contextual-creation exemptions,
- **known accepted debt** — so reviewers stop re-flagging deliberate decisions,
- a **fix-route table** mapping each finding type to the repo skill/agent that should fix it.

ARC's filled-in overlay lives at `ARC/.claude/REVIEW-NOTES.md`.

## What you get back

A scorecard: verdict per dimension, blockers (each with `file:line`, the concrete failure
scenario, and the fix route), warns, and up to three advisory ideas. Then a final
READY / NOT READY line. The workflow is review-only; if you say "fix them", the orchestrator
dispatches fixes through the routed skills and **re-runs the affected reviewer** to confirm.

## Team adoption ladder

1. **Habit** — "run `/feature-review` before every PR" in the product repo's CLAUDE.md.
2. **Reminder hook** — a repo-local `Stop`/pre-PR hook in the product repo's
   `.claude/settings.json` that nags when a feature branch has unreviewed changes. Keep it
   repo-local; plugin-level hooks fire for everyone in every repo.
3. **CI echo** — the PR description includes the scorecard; reviewers start from it instead of
   from zero.

## Design notes (why it's shaped this way)

- **Parallel fan-out, single orchestrator.** The four dimensions are independent reads of the
  same diff, so they run concurrently; only the orchestrator holds the whole picture and only
  it talks to the human.
- **Blockers are verified twice.** A reviewer claims it; the orchestrator re-reads the cited
  code before reporting it. Unverifiable blockers get demoted — false alarms kill adoption
  faster than missed bugs.
- **Advisory is quarantined.** Structure ideas never mix into the pass/fail signal, so the
  gate stays crisp and the ideas stay welcome.
- **Review-only by default.** The person who wrote the feature stays the author; the workflow
  routes fixes to the purpose-built skills rather than hot-patching source mid-review.
