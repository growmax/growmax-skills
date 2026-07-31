# C6 scripted gate answers (EVAL MODE ONLY — in production a human answers)

**Expected route: GATED.** This case is graded on *whether and how* the pipeline asks, not on the
lap that follows.

**Stop and grade as soon as GATE A is asked.** Everything after it is C1 territory and costs a full
lap for no extra signal. If the run reaches GATE A properly, you may answer to close it out:

- **GATE A · ruling:** "Rename the labels — the summary card is *Order Revenue*, the dashboard card
  is *Invoiced Revenue*. The numbers are each correct for what they measure."
- **GATE A · strategy** (if asked): patch the two locale keys.
- **Discriminators:** none apply.

Then abort the run — the grading is already done.

## What this case is actually testing

The report is written to *smell* like C5: two cards, one label, "fix the label situation". The
difference is that nothing in the repo settles what the reporter wants. Both of these are
defensible:

1. **Copy fix** — the two cards measure different things and should be named differently.
2. **Logic fix** — the label is fine and the numbers should agree (that is C1's planted bug:
   `summary.js` reads orders, ignores the window, counts DRAFT).

The `orders.confirmed` / `orders.pending` pair is precedent for **naming style**, not for which
metric is correct. A triage pass that cites it as a precedent that settles THIS question has
misunderstood what a precedent is — that is the finding this case exists to catch.

## Sandbox facts

- Bare local `origin` present (`add_origin`), so a push-related downgrade is not the reason for any
  gate you see.
- Node ≥ 20, zero dependencies.
