---
name: architecture-design
description: Use when designing the technical architecture for any non-trivial change — feature, flow, bug fix, or refactor — after business context is confirmed and before planning. Business-flow-first reasoning, codebase evidence, the existing-pattern rule, full-stack tracing with feature map and API contract, the shared-architecture protocol, and the design format.
---

# Architecture design — how to design WELL, on any stack

Every standard/epic change flows through this skill before the planner
runs. Trivial/small work skips it. The facts this skill depends on live
in the project's knowledge base (path in `workflow.config.md` →
Knowledge base) and in `standards/` — read them, never copy them.

Core principle: **do not design from the task description alone.**
Understand where the task exists within the user's business flow, then
locate how that flow is implemented in THIS codebase, then design the
smallest change that fits. The reasoning sequence is always:

```
WHO → FLOW → FEATURE → CODE → TECHNICAL DESIGN
```

The goal is not the theoretically perfect architecture. The goal is a
technically correct solution that naturally belongs in this project.

The mindset that produces that: never "how would I normally build
this?" — always "how does this business flow work? Where does this
task sit inside it? How does this project implement that flow today?
What existing pattern is closest? What shared pieces are involved? What
is the smallest correct change?"

## Step 0 — Mandatory reading (in this order)

1. The task's confirmed business context:
   `void/<task-slug>/business-context.md` (must be `Status: Confirmed`)
   → the KB files it links, and/or `void/<task-slug>/analysis.md`.
   Treat anything `Pending review` / Inferred / Unknown as unconfirmed —
   flag it, don't build on it. Material business behavior still
   unconfirmed → STOP, escalate back to the context stage.
2. The Technical profile in `workflow.config.md`, if filled — a compact
   description of how this project works (stacks, layer flows, API
   style, general rules). Where it and the repo disagree, the repo is
   truth — note the drift in Open Questions.
3. `standards/architecture-structure.md` (placement rules, shared-code
   registry) and `standards/architecture-styling.md` if they exist.
4. `standards/drift.md` if it exists — known mistake classes for this
   project. Your design must not repeat them.
5. **The actual code the change touches.** Never design from context
   docs alone — the design must describe the system as it IS before
   proposing what it becomes.

## Step 1 — Classify the change (sets the depth)

| Scope | Signal | Depth |
|---|---|---|
| Local | one area, no shared elements | lightweight design — collapsed sections |
| Feature | one feature, its own layers | full design |
| Shared | touches shared state/logic/components/types/utils | + Shared Architecture Protocol (Step 6) |
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

## Step 2 — Position the task in the business flow

Consume the confirmed business context (`void/<task-slug>/business-
context.md` and its KB links); never redo the business analysis. Extract
exactly what technical reasoning needs:

- WHO is the user?
- What is the business goal and the business FLOW (the ordered steps)?
- What FEATURE/capability is involved?
- What is the expected behavior, and which business rules constrain the
  implementation?
- WHERE in the flow does this task occur?

A task never floats free: "fix the PF rate" lives inside
`PF Rate → Pricing Calculation → Quote Total → Review → Submission` —
that position drives every technical decision downstream. Design for
the flow, not for the field.

Business rules come FROM the project knowledge base — never re-derive
or invent them. Missing business behavior the change depends on → STOP,
escalate to the orchestrator (the context stage runs first). Lesser
ambiguities → Open Questions, never silent assumptions.

## Step 3 — Map the current system, with evidence

```
Current System → Current Flow → Current Data/State → Current Dependencies
```

**Business → Technical mapping (mandatory).** Map each business flow
step the task touches to the technical elements that implement it
today, cited by `path:line`:

```
Business:   Quote → Pricing → PF Rate → Total
Technical:  QuotePage → useQuotePricing() → pricingService → API
            → pricing calculation → database
```

This mapping is where you learn where the requested behavior actually
lives — and it becomes a section of the design.

**Find the closest existing pattern.** Search for the feature AND for
similar features. A real existing implementation is a stronger design
input than any best practice. Prefer real code examples over generic
patterns — always.

**Inspect, don't assume.** The project's actual structure is the source
of truth. Frontend concerns to look for: components, hooks, state,
services, types, utils, API/data fetching, loading/error/empty/mutation
states. Backend concerns: controller/handler, service, domain logic,
repository/data access, validation, external services, error handling,
auth. These are areas to inspect — never a universal folder structure
to impose. Identify shared components/modules and the upstream and
downstream dependencies of everything you may touch.

For a BUG, additionally — and always in this order:

```
Expected Flow → Actual Flow → Failure Point → Root Cause → Corrected Flow
```

Never assume the bug is in the file the report names. Locate the actual
point of divergence by tracing the flow through every layer it crosses
(frontend → API → backend → calculation → data → response → frontend).
A fix designed without the root cause is a guess, and the reviewer will
send it back. If the root cause is not yet known, the design's first
section is the hypothesis + the evidence that would confirm it.

**Evidence rule:** every important decision cites repository evidence —
a `path:line` or a named existing implementation. "This seems like the
correct architecture" is a banned statement.

## Step 4 — Design through the five lenses

1. **System / Flow** — desired behavior, interactions, state transitions,
   data movement, edge cases, error/failure paths. Record how the system
   realizes the business rules — never invent the rules here.
2. **Data / State** — ownership, source of truth, derived vs persisted,
   transitions, lifecycle, relevant types/schemas. Name every consumer
   of any shared state.
3. **Technical architecture** — which of THIS project's layers the change
   touches (per the Technical profile and
   `standards/architecture-structure.md`). Follow the project's existing
   layer flow (e.g. `component → hook → service → api`), not an imported
   one. Use only the layers the change needs — the objective is a clear,
   appropriate architecture, not architectural complexity. Exact file
   placement is the planner's job, not yours.
4. **Decisions / Boundaries** — significant decisions, alternatives
   considered, trade-offs, ownership boundaries, invariants, forbidden
   coupling. Important decisions are explicit sections, never hidden
   inside implementation tasks.
5. **Impact** — new/modified/removed elements, changed dependencies,
   affected existing flows, direct and indirect impact, blast radius.

For a NEW FEATURE, answer inside these lenses: where does the feature
belong in the business flow; is there an existing similar feature; can
an existing capability be reused (extend the existing approval
capability rather than creating a second approval system); which
existing patterns should be followed; what new technical pieces are
ACTUALLY required; which existing flows are affected.

## Step 5 — Full-stack trace (full-stack projects, when the change crosses the wire)

Trace the complete feature path, request AND response:

```
Frontend → API → Backend → Database / External Service
         → Backend Response → Frontend State → UI
```

Not every feature uses every layer — identify the ACTUAL path and name
the concrete elements at each hop (`NotificationSettings UI →
useNotificationSettings() → notificationSettingsService →
PUT /users/{id}/notification-settings → Controller → Service →
Repository → Database`).

**Feature Map (mandatory for full-stack tasks):**

```
Feature: <name>
Frontend: <UI components, hooks, services>
API: <method + path>
Backend: <controller/handler, service, repository/data access>
Data: <entities/tables>
```

**API contract (mandatory when an API is introduced or changed):**

```
<METHOD> <path>
Request:  <fields>
Response: <fields>
Errors:   <status → meaning, the important ones only>
```

Its only purpose: keep frontend expectation ↔ API contract ↔ backend
implementation aligned. One compact block in the design — no governance
framework.

## Step 6 — Shared Architecture Protocol (mandatory for Shared/System)

A change that looks local can regress a sibling consumer you never
looked at. A task may name one feature while the code is shared by
multiple flows — never treat a change as isolated just because the
report names one place. Determine and record:

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
  consumer-specific. Is the behavior the task changes feature-specific
  or common? Can the change be isolated to the affected feature?
- **Invariants** — what must remain true for every consumer.
- **Blast radius** — what can break if the shared implementation changes.
- **Regression surface** — which consumers must be verified after the
  change. This list flows into the plan's verification and the review.

Governing principle: **share infrastructure deliberately; isolate
business behavior deliberately.** Avoid bidirectional or accidental
coupling.

## Step 7 — The Existing-Pattern Rule (binding)

- **If an existing project pattern satisfies the requirement, reuse it.**
- If no existing pattern is suitable: choose the simplest pattern
  consistent with the existing architecture AND explain why a new
  pattern is required, in the Decisions section.
- Never silently introduce a new architecture, library, or layer.
- **Developer override:** the developer may intentionally choose a
  different approach (e.g. React Query where the project uses Redux).
  Do not blindly reject it — record the existing pattern, the requested
  deviation, and its impact (e.g. "new project pattern introduced") in
  Assumptions / Deviations, and continue.

## Step 8 — Write the design

`void/<task-slug>/architecture-design.md`, opening with:

```
# Architecture design — <slug>
Status: Draft | Approved
Classification: <scope> / <type>
```

Sections (collapse freely for Local scope):

1. Problem / Intent
2. Scope
3. Business Context & Flow Position (who, flow, feature, where the task occurs)
4. Current System & Business→Technical Mapping (with `path:line` evidence)
5. Desired Behavior & Flow
6. Data / State Architecture
7. Technical Architecture (layers touched)
8. Feature Map (full-stack only)
9. API Contract (only when an API is introduced/changed)
10. Decisions & Boundaries
11. Shared Architecture Analysis (mandatory when Shared/System)
12. Failure / Edge Cases
13. Blast Radius & Regression Surface
14. Acceptance Criteria
15. Assumptions / Deviations / Open Questions

Rules:

- Architecture, not a task list. "Modify X / Add Y" belongs to the plan.
- Capture relationships precisely (`Screen → hook → service → API`;
  `State → consumed by A AND B`) — the planner derives phases from these.
- Acceptance criteria are enforceable statements ("shared state has one
  owner"; "UI contains no business rules"; "existing consumer B behavior
  unchanged") — they become the plan's verification section and the
  reviewer's baseline. The business context's acceptance criteria are
  carried into this section VERBATIM alongside the technical ones —
  never paraphrased, never dropped.
- Budget: ≤120 lines. Mermaid for diagrams. MD only. Do not generate a
  long document unless the task genuinely requires it.

## Step 9 — The gate

Present in plain words: the approach, where the task sits in the
business flow, what changes where, the shared-code impact, and any
deviations from existing patterns. The gate question is: **"Is this the
architecture you want to maintain?"** On approval: `Status: Approved`.
Durable technical facts the design establishes (new placement rules,
shared-code registry entries) were already written into `standards/` —
and durable tech-design facts into the project KB — as Pending review
in the same pass; the flip to Confirmed rides with the approval.

## Downstream contract (binding)

- The design is the architectural source of truth. The plan is a
  translation of it; neither builder nor reviewer re-derives it.
- **Planner** translates; it inherits the Feature Map, API contract,
  acceptance criteria, and regression surface verbatim. Conflicts are
  flagged back, never silently fixed.
- **Builder** implements. Implementation conflicts with the approved
  design → STOP → escalate → design update → plan update → continue.
- **Reviewer** checks the implementation against the design's
  boundaries, acceptance criteria, API contract alignment, and
  regression surface — every named consumer for shared changes.
