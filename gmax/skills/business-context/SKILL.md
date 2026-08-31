---
name: business-context
description: Use when establishing business understanding for a task before any technical work — mode classification (existing behavior vs new feature), the business frame (expected vs observed), the organize-confirm loop for new features, blocking-question discipline, and the task business-context.md artifact. The context-architect's operating procedure.
---

# Business context — how to establish what the business SHOULD do

Business perspective only. Technical placement, code shape, and library
choices are deferred to the architecture stage — never answered here,
never asked to the human here.

Core mission: convert the developer's task and the project's existing
knowledge into a clear, confirmed business context — **without silently
inventing business behavior**. You may organize, clarify, restructure,
summarize, and ask. You may NOT invent rules, roles, states,
permissions, calculations, notifications, approvals, workflow steps, or
outcomes. Missing business information → ask the developer. Never guess.

## Rule zero — evidence first, no assumptions

Every claim about what the code does TODAY is verified against the code
with your own searches BEFORE it is asserted, and cited `path:line`.
A claim you could not verify is marked `UNVERIFIED` — never smoothed
over. A claim you later find wrong is DELETED from the docs, not
annotated — downstream agents read these files as truth. The standard
is: 100% honesty, no assumptions.

## Step 1 — Read the existing context first

- Read the project's knowledge base first (path + index file in
  `workflow.config.md` → Knowledge base). Never re-ask what is already
  confirmed; treat pending-review entries as unconfirmed.
- Existing context is not automatically truth. Where it conflicts with
  the developer's current request or with the code, record BOTH and
  surface the conflict — never silently pick one.

## Step 2 — Classify the mode

| Mode | Signal | Source of business intent |
|---|---|---|
| **A — existing behavior** | bug, enhancement, refactor of an existing flow | the code + KB describe what IS; the developer states what SHOULD be |
| **B — new feature** | new behavior, new flow | the developer's description is authoritative |

Refactors and enhancements follow Mode A — they touch existing behavior.

## Step 3A — Mode A: business frame BEFORE technical recon

Before any code analysis, state the business frame in plain words:

- **User** — who is affected?
- **Flow** — which business flow, and where in it does the task occur?
- **Feature** — which capability inside that flow?
- **Expected behavior** — what SHOULD happen (per the developer / KB)?
- **Observed behavior** — what IS happening (per the developer's report)?
- **Business impact** — why is the gap a problem?
- **Scope** — what is in / out, where known.

Think in flows, not files: `Quote → Pricing → PF Rate → Total → Review →
Submit`, never `PFRate.tsx → modify component`. Locating the bug in code
is the architect's job, not yours — your Expected vs Observed frame is
what tells the technical recon which divergence to hunt. After the frame
is written, run the `codebase-analysis` skill for just this scope (what
the flow does today, what it shares, its contracts) — never whole-repo.

## Step 3B — Mode B: organize the developer's intent, then confirm

The developer provides the feature context. Do NOT expand it into
unconfirmed behavior.

1. **Organize** the description into User / Goal / Flow / Feature /
   Expected behavior. Restructuring rough words is allowed
   ("user adds discount then manager approve" → a numbered flow);
   ADDING behavior is not (no "manager receives an email" unless the
   developer said so).
2. **Identify gaps** — the missing information that materially affects
   business behavior (see the question discipline below).
3. **Ask** the blocking questions, one topic at a time.
4. **Present the interpreted flow back** to the developer in plain
   words: "this is what I understood — is it right?"
5. **On confirmation**, finalize. On correction, update verbatim and
   confirm again. For trivial, unambiguous tasks, don't block the
   workflow with a confirmation round.

Interview topics (both modes, as needed): Purpose · Actors &
authorization · Flow incl. unhappy paths · Rules & conditions (when does
the business say NO) · Edge cases (empty, duplicate, offline, cancelled,
expired) · Out of scope.

If the human's answer contradicts the code, record BOTH: current
behavior (fact, cited) and desired behavior (decision). That gap is
exactly what the design must close.

## Question discipline (binding)

- Ask only about what affects: business flow, user behavior, business
  rules, important states/outcomes, actors/roles, permissions that
  change behavior, acceptance criteria, scope.
- **Blocking** = business behavior cannot be correctly defined without
  the answer ("what happens to the quote after rejection?") → STOP and
  ask before finalizing.
- **Non-blocking** = resolvable later without changing business intent
  ("should the button say Approve or Confirm?") → record as an open
  question and continue.
- Technical questions ("which library, what shape, which table") are
  NEVER asked here — write them `UNVERIFIED — deferred to architecture`.
- The goal is to remove business ambiguity, not collect UI details.

## Step 4 — Write the task business context (one artifact)

Write `void/<task-slug>/business-context.md`:

```markdown
# Business context — <slug>
Status: Draft → (human confirms) → Confirmed
Mode: A (existing behavior) | B (new feature)

## User
## Goal
## Business Flow            <ordered steps; where the task occurs marked>
## Feature / Capability
## Expected Behavior
## Observed Behavior        (Mode A bug only)
## Business Impact          (Mode A bug only)
## Business Rules           <confirmed/relevant only — none invented>
## Acceptance Criteria      <observable business outcomes, simple>
## Scope                    <in / out — only where known or confirmed>
## Open Questions           <each marked blocking | non-blocking>
## Confidence               <per-field: Provided / Confirmed / Inferred / Unknown>
## Knowledge Base Links     <KB files this task read or wrote — links, not copies>
```

Rules:

- Confidence labels: **Provided** (stated by the developer / trusted
  context) · **Confirmed** (the developer confirmed your
  interpretation) · **Inferred** (from existing context/code) ·
  **Unknown**. Important business behavior must NOT stay Inferred or
  Unknown when it materially affects the feature — ask.
- Acceptance criteria are observable business outcomes ("a 20% discount
  order cannot be confirmed without manager approval"), not test plans.
- Budget is binding (≤50 lines, `void/README.md`). Blocking questions
  are stated in full; non-blocking ones get ONE terse line each; the
  reasoning behind a question lives in your gate message to the human,
  not in the artifact. Many questions → prioritize, don't inflate.
- Do not invent out-of-scope items; state boundaries only when known or
  confirmed. Unclear scope that materially affects the work → ask.
- Durable business facts discovered this task are ALSO written directly
  into the project's KB per `skills/context-writing/SKILL.md` (one
  write, `Pending review`). The task artifact LINKS to those files in
  Knowledge Base Links — it never duplicates their content.

## Step 5 — The human gate

Tell the human exactly which files to read (the business-context.md
path + any KB files written, one line each) and ask, in plain words:
**"This is what I understood the business should do — is it right?"**

- Corrections → edit in place, verbatim where the human's wording is
  binding.
- Approval → flip `Status: Confirmed` on the artifact; flip KB files
  per the KB's convention.
- Never proceed to architecture with material behavior still
  Pending/Inferred/Unknown unless the human explicitly says to — and
  then the architect treats it as unconfirmed.

## Downstream contract (binding)

- **Architect** consumes this artifact + the linked KB files as its
  business input (Confirmed fields). It never redoes the business
  analysis; material Inferred/Unknown → it stops and escalates back.
- **Planner** inherits the acceptance criteria (via the design)
  verbatim into the plan's verification.
- **Reviewer** checks the implementation against Expected Behavior and
  the acceptance criteria here — not just against the technical design.

## Never build (V1 anti-scope)

No requirements-management frameworks, domain ontologies, knowledge
graphs, automatic rule invention, scoring systems, workflow engines, or
enterprise BA methodology. The loop is: Understand → Organize → Clarify
→ Ask → Confirm → Store. Improve this skill from real task feedback
(the improvement loop), not from predicting every scenario up front.
