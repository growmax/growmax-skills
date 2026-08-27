---
name: architecture-design
description: Use when designing the technical architecture for any non-trivial change — feature, flow, bug fix, or refactor — after business context is confirmed and before planning. Holds change classification, current-system mapping, the root-cause chain for bugs, the five reasoning lenses, the shared-architecture protocol, and the design format.
---

# Architecture design — how to design WELL, on any stack

Every standard/epic change flows through this skill before the planner
runs. Trivial/small work skips it. The facts this skill depends on live
in the project's knowledge base (path in `workflow.config.md` →
Knowledge base) and in `standards/` — read them, never copy them.

## Step 0 — Mandatory reading (in this order)

1. The task's confirmed facts: the KB index → the files for this area,
   and/or `void/<task-slug>/analysis.md`. Treat anything
   `Pending review` as unconfirmed — flag it, don't build on it.
2. `standards/architecture-structure.md` (placement rules, shared-code
   registry) and `standards/architecture-styling.md` if they exist.
3. `standards/drift.md` if it exists — known mistake classes for this
   project. Your design must not repeat them.
4. **The actual code the change touches.** Never design from context
   docs alone — the design must describe the system as it IS before
   proposing what it becomes.

## Step 1 — Classify the change (sets the depth)

| Scope | Signal | Depth |
|---|---|---|
| Local | one area, no shared elements | lightweight design — collapsed sections |
| Feature | one feature, its own layers | full design |
| Shared | touches shared state/logic/components/types/utils | + Shared Architecture Protocol (Step 5) |
| System | cross-module, cross-domain | + broad dependency and impact analysis |

| Type | Signal |
|---|---|
| New feature | new behavior |
| Modification | changed behavior |
| Bug fix | expected ≠ actual |
| Shared modification | a shared element changes |
| Refactor | structure changes, behavior holds |

Never impose System-level ceremony on a Local change. Record the
classification at the top of the design.

## Step 2 — Understand intent, not files

What is requested, what outcome is wanted, what the confirmed business
context says. Do not begin by choosing files. Business rules come FROM
the project knowledge base — never re-derive or invent them. Missing business
behavior the change depends on → STOP, escalate to the orchestrator (the
context stage runs first). Lesser ambiguities → Open Questions, never
silent assumptions.

## Step 3 — Map the current system

```
Current System → Current Flow → Current Data/State → Current Dependencies
```

For a BUG, additionally — and always in this order:

```
Expected Flow → Actual Flow → Failure Point → Root Cause → Corrected Flow
```

Never jump from a reported symptom to a code change. A fix designed
without the root cause is a guess, and the reviewer will send it back.
If the root cause is not yet known, the design's first section is the
hypothesis + the evidence that would confirm it.

## Step 4 — Design through the five lenses

1. **System / Flow** — desired behavior, interactions, state transitions,
   data movement, edge cases, error/failure paths. Record how the system
   realizes the business rules — never invent the rules here.
2. **Data / State** — ownership, source of truth, derived vs persisted,
   transitions, lifecycle, relevant types/schemas. Name every consumer
   of any shared state.
3. **Technical architecture** — which of THIS project's layers the change
   touches (per `standards/architecture-structure.md`). Use only the
   layers the change needs —
   the objective is a clear, appropriate architecture, not architectural
   complexity. Exact file placement is the planner's job, not yours.
4. **Decisions / Boundaries** — significant decisions, alternatives
   considered, trade-offs, ownership boundaries, invariants, forbidden
   coupling. Important decisions are explicit sections, never hidden
   inside implementation tasks.
5. **Impact** — new/modified/removed elements, changed dependencies,
   affected existing flows, direct and indirect impact, blast radius.

## Step 5 — Shared Architecture Protocol (mandatory for Shared/System)

A change that looks local can regress a sibling consumer you never
looked at. Never treat a change as isolated just because the report
names one place. Determine and record:

- **Shared boundary** — which shared element is involved (state, logic,
  service, component, type, utility).
- **Consumers** — who consumes it. ALL of them, found by import/reference
  search, listed by path.
- **Structural vs behavioral sharing** — shared infrastructure (clients,
  types, UI primitives) is NOT shared behavior (validation, calculations,
  business rules, state transitions). Two consumers of the same utility
  does not mean their behavior should unify. Behavioral sharing gets the
  deeper scrutiny.
- **Ownership** — who owns each behavior; what is genuinely common vs
  consumer-specific.
- **Invariants** — what must remain true for every consumer.
- **Blast radius** — what can break if the shared implementation changes.
- **Regression surface** — which consumers must be verified after the
  change. This list flows into the plan's verification and the review.

Governing principle: **share infrastructure deliberately; isolate
business behavior deliberately.** Avoid bidirectional or accidental
coupling.

## Step 6 — Write the design

`void/<task-slug>/architecture-design.md`, opening with:

```
# Architecture design — <slug>
Status: Draft | Approved
Classification: <scope> / <type>
```

Sections (collapse freely for Local scope):

1. Problem / Intent
2. Scope
3. Current System & Flow
4. Desired Behavior & Flow
5. Data / State Architecture
6. Technical Architecture (layers touched)
7. Decisions & Boundaries
8. Shared Architecture Analysis (mandatory when Shared/System)
9. Failure / Edge Cases
10. Blast Radius & Regression Surface
11. Acceptance Criteria
12. Open Questions

Rules:

- Architecture, not a task list. "Modify X / Add Y" belongs to the plan.
- Capture relationships precisely (`Screen → hook → service → API`;
  `State → consumed by A AND B`) — the planner derives phases from these.
- Acceptance criteria are enforceable statements ("shared state has one
  owner"; "UI contains no business rules"; "existing consumer B behavior
  unchanged") — they become the plan's verification section and the
  reviewer's baseline.
- Budget: ≤120 lines. Mermaid for diagrams. MD only.

## Step 7 — The gate

Present in plain words: the approach, what changes where, and the
shared-code impact. The gate question is: **"Is this the architecture
you want to maintain?"** On approval: `Status: Approved`. Durable
technical facts the design establishes (new placement rules, shared-code
registry entries) were already written into `standards/` — and durable
tech-design facts into the project KB — as Pending review in the same
pass; the flip to Confirmed rides with the approval.

## Downstream contract (binding)

- The design is the architectural source of truth. The plan is a
  translation of it; neither builder nor reviewer re-derives it.
- **Planner** translates; conflicts are flagged back, never silently
  fixed.
- **Builder** implements. Implementation conflicts with the approved
  design → STOP → escalate → design update → plan update → continue.
- **Reviewer** checks the implementation against the design's
  boundaries, acceptance criteria, and regression surface — every named
  consumer for shared changes.
