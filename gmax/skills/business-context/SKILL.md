---
name: business-context
description: Use when establishing business understanding for a feature or flow before technical design — evidence-first code recon, the interview discipline, and the business-design dimensions. The context-architect's operating procedure.
---

# Business context — how to establish what the business SHOULD do

Business perspective only. Technical placement, code shape, and library
choices are deferred to the architecture stage — never answered here,
never asked to the human here.

## Rule zero — evidence first, no assumptions

Every claim about what the code does TODAY is verified against the code
with your own searches BEFORE it is asserted, and cited `path:line`.
A claim you could not verify is marked `UNVERIFIED` — never smoothed
over. A claim you later find wrong is DELETED from the docs, not
annotated — downstream agents read these files as truth. The standard
is: 100% honesty, no assumptions.

## Step 1 — Recon (what exists)

- Read the project's knowledge base first (path + index file in
  `workflow.config.md` → Knowledge base). Never re-ask what is already
  confirmed; treat pending-review entries as unconfirmed.
- Where the feature touches existing code, run the `codebase-analysis`
  skill for just that scope: what the flow does today, what it shares,
  the contracts it relies on.

## Step 2 — Interview (what should be)

Ask the human business questions, in plain words, one topic at a time:

- **Purpose** — what is this for, what outcome does the business want?
- **Actors & authorization** — who may do this, who may not, and where
  is that enforced (if known)?
- **Flow** — the steps as the business sees them, including the unhappy
  paths.
- **Rules & conditions** — invariants, validations, calculations,
  limits. When does the business say NO?
- **Edge cases** — empty, duplicate, offline, concurrent, cancelled,
  expired. What should happen?
- **Out of scope** — what is explicitly NOT part of this?

Discipline:

- Every discovered behavior gets an EXPLICIT human decision or an
  explicit `UNVERIFIED` mark. Nothing silently assumed.
- Technical questions ("which library, what shape, which table") are
  NOT asked — write them as `UNVERIFIED — deferred to architecture`.
- If the human's answer contradicts what the code does, record BOTH:
  the current behavior (fact, cited) and the desired behavior
  (decision). That gap is exactly what the design must close.

## Step 3 — Write it, once, directly into the knowledge base

Follow `skills/context-writing/SKILL.md`: facts go into the project's
knowledge base, placed per its structure, marked `Status: Pending
review` (or the KB's own convention), indexed where the KB has an index.
One write — no draft copies in the task folder.

Structure business facts around the interview dimensions above —
Purpose, Actors & authorization, Flow, Rules & conditions, Edge cases,
Out of scope, Open questions (UNVERIFIED).

## Step 4 — The human review

Tell the human exactly which files to read (paths, one line each) and
ask, in plain words: **"This is what I understood the business should
do — is it right?"**

- Corrections → edit in place, verbatim where the human's wording is
  binding.
- Approval → flip each file's header to `Status: Confirmed` (or the
  KB's own convention) and its index tag, where the KB has an index.
- Never proceed to architecture with the facts still Pending review
  unless the human explicitly says to — and then the architect treats
  them as unconfirmed.
