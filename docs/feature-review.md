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
scenario, and the fix route), warns, and up to three advisory ideas — plus a **confidence
report** and a final READY / NOT READY line. The workflow is review-only; if you say "fix them",
the orchestrator dispatches fixes through the routed skills and **re-runs the affected
reviewer** to confirm.

## The confidence report

Every finding (except advisory ideas, which never block) carries a confidence level so you can
tell a verified fact from a judgment call at a glance:

| Confidence | Means | Typical source |
|---|---|---|
| **HIGH** | The orchestrator personally confirmed it, or a test suite actually failed, or ≥2 reviewers independently hit the same code | a re-grepped `where` clause with no `organizationId`; a red test run |
| **MEDIUM** | The citation is confirmed but the scale/impact is an estimate, or it's an inferred pattern the repo overlay explicitly calls out as a known anti-pattern | "no pagination arg" is verified; "this will hurt at 10k rows" is the stated design assumption, not a measured benchmark |
| **LOW** | A judgment call (most UX warns), or a claim the orchestrator couldn't independently verify | "this screen could use two-way linking"; a static-only read of dynamic behavior |

**A BLOCKER can never sit at LOW confidence** — if a claimed blocker can't be verified beyond
static inference or opinion, it's automatically demoted to a WARN and tagged
`(demoted: unverified)`. That's the mechanism that keeps the gate trustworthy: nothing blocks a
PR on a guess, no matter how confidently a reviewer phrased it.

**Worked example** — for a screen adding a customer picker without inline creation:

```
### Confidence report
| # | Finding                                              | Verdict | Confidence | Basis     | How it was checked |
|---|-------------------------------------------------------|---------|------------|-----------|---------------------|
| 1 | No pagination on customers list query                  | BLOCKER | HIGH       | verified  | grep confirms no `first`/`take` in the resolver; re-read customers.resolver.ts:42 |
| 2 | Missing test for the new discount-eligibility branch    | BLOCKER | HIGH       | verified  | `pnpm --filter @ims/api test` ran, discount.service.spec.ts has no case for it |
| 3 | No inline "+ Create customer" on the assigned-list picker | WARN  | MEDIUM     | read      | AssignedCustomerList.tsx has no create affordance; whether this screen needs it is confirmed by the overlay's "fair game for create-in-place" list |
| 4 | CustomerSelector could also link back to the customer's order history | WARN | LOW | judgment | genuinely a product nice-to-have, not a defect |

Summary: 2 HIGH · 1 MEDIUM · 1 LOW → both blockers are HIGH; the one LOW-confidence item is a
WARN, not a blocker, by design.
```

The point of splitting it out: a reviewer skims the HIGH rows and acts immediately, spends a
minute sanity-checking the MEDIUM rows, and treats every LOW row as "a human should decide this,
not more automation."

## How this gets better over time

Every run appends one row to `.claude/feature-review-ledger.md` (template:
`examples/REVIEW-LEDGER.template.md`) — dimension verdicts, confidence tally, and a blank
`outcome` column filled in later (fixed / overridden-because-wrong / confirmed-in-prod). This
is deliberately a *paper trail*, not a dashboard — the value is in periodically reading it, not
in automated scoring.

Two feedback mechanisms make the workflow sharper the more a team actually uses it:

1. **In-the-moment overlay growth (near-zero cost).** When you tell the orchestrator a finding
   is wrong or already-known, it offers to add it to `Known accepted debt` in
   `.claude/REVIEW-NOTES.md` right then. This is the highest-leverage improvement available:
   the repo-specific knowledge compounds every time someone overrides a finding, instead of
   requiring someone to anticipate every edge case up front.
2. **Periodic calibration (every 2-4 weeks, or every ~15-20 runs).** Read the ledger, tally
   *false positives by category* (not in aggregate — "3 of 4 overrides were
   scale-security-reviewer pagination warnings on admin-only tools" is actionable), and turn
   the pattern into one of: a new known-debt entry, a tightened reviewer checklist
   (`agents/<name>.md`), a missing fact added to the overlay's conventions, or — if a whole
   finding category never fires despite a known problem class in the codebase — a new check.
   Bump the plugin version and say what calibration drove the change, so teammates see *why*
   behavior shifted.

What this deliberately does NOT do: no automated precision scoring, no ML retraining, no
dashboard. A small team reading its own ledger every few weeks and tightening one prompt or one
overlay line at a time outperforms unmaintained automation — and costs nothing to build.

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
- **Confidence is a first-class output, not a footnote.** Every finding says HOW it's known
  (verified / read / inferred / judgment), so a LOW-confidence claim can never masquerade as a
  BLOCKER — trust in the gate depends on that separation staying visible.
- **The ledger is a paper trail sized for a small team, not a metrics platform.** One row per
  run, one manual calibration pass every few weeks. It gets better because a human closes the
  loop occasionally, not because the system scores itself.
- **Advisory is quarantined.** Structure ideas never mix into the pass/fail signal, so the
  gate stays crisp and the ideas stay welcome.
- **Review-only by default.** The person who wrote the feature stays the author; the workflow
  routes fixes to the purpose-built skills rather than hot-patching source mid-review.
