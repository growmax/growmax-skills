# feature-review ledger — TEMPLATE

A run-by-run paper trail for `/growmax-skills:feature-review`. The orchestrator appends one row
per run automatically (Phase 5). This file has one job: make it possible to answer, later,
"is this review actually any good?" — which needs the *outcome* of each finding, not just the
count.

Copy this to `.claude/feature-review-ledger.md` on first use (the workflow does this for you if
the file doesn't exist yet — this template just documents the shape and the mining process).

## Table (append-only, newest at the bottom)

| Date | Branch | Base | TDD | UX | Scale/Sec | Arch ideas | Confidence (H/M/L) | Outcome |
|---|---|---|---|---|---|---|---|---|
| 2026-07-03 | feat/assigned-customers-inline-create | main | PASS | WARN(2) | PASS | 1 idea | 5H / 2M / 1L | *(fill in later — see below)* |

- **TDD / UX / Scale/Sec** — the dimension verdict + blocker/warn count from that run's
  scorecard, e.g. `BLOCK(1)`, `WARN(2)`, `PASS`.
- **Confidence (H/M/L)** — the tally from that run's confidence report.
- **Outcome** — left blank at review time. Fill it in later, once you know what actually
  happened:
  - `fixed` — the blocker/warn was addressed before merge, as reported.
  - `overridden: <why>` — the team merged anyway; say why (already known, product accepted the
    risk, reviewer was wrong). An `overridden: reviewer was wrong` outcome is the single most
    valuable row type — it's a direct false-positive signal.
  - `confirmed-in-prod: <what>` — a WARN this workflow raised and the team accepted later
    caused a real incident. This validates the reviewer was right to warn, at higher cost.
  - *(blank)* — not yet known; revisit at the next calibration pass.

## Mining this file (do it periodically, not per-run)

See `/feature-review`'s "How this gets better over time" section for the full process. In
short: group by dimension + finding category, count `overridden: reviewer was wrong` rows, and
turn a repeated pattern into one of:
- a new **Known accepted debt** entry in `.claude/REVIEW-NOTES.md` (the finding was correct but
  the team deliberately accepts it — stop re-flagging), or
- a tightened check in the relevant `agents/<name>.md` (the finding was actually wrong — fix
  the reviewer), or
- a new fact in `.claude/REVIEW-NOTES.md`'s conventions sections (the reviewer was guessing
  because the overlay didn't tell it something).

A ledger that only ever shows PASS rows is a sign the workflow isn't being run on anything
risky, not a sign of a clean codebase — cross-check against how many features actually shipped
in that period.
