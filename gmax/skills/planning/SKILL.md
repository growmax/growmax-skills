---
name: planning
description: Use when translating an approved architecture design into a phase plan at void/plan/<slug>.md — mandatory reading, plan format, phase DAG rules, failure/edge-state declaration, and the proven-reuse rule. Never redesigns the architecture.
---

# Planning — how to turn an approved design into a buildable plan

The design is your input contract. You translate; you never redesign.
If the design is unimplementable as written, send it back with reasons —
don't patch it inside the plan.

## Mandatory reading (in this order)

1. `void/<task-slug>/architecture-design.md` — must be `Status:
   Approved`. Its acceptance criteria and regression surface are
   inherited by your plan's verification, verbatim — including the
   business acceptance criteria the design carried in from
   `void/<task-slug>/business-context.md`. Its Feature Map and
   API contract (when present) are inherited verbatim too — if the
   contract proves unimplementable or FE/BE-misaligned while planning,
   send the design back with reasons; never patch it inside the plan.
2. `standards/architecture-structure.md` — placement rules. Your file
   placement conforms to it; new patterns come only from the design's
   Decisions section.
3. `standards/drift.md` if it exists — known mistake classes. Phases
   must not schedule work that repeats them.
4. The code the phases will touch — enough that every file path in your
   plan is real. Never invent file locations.

## Plan format

`void/plan/<slug>.md`:

```markdown
# <slug> — <title>
Design: void/<slug>/architecture-design.md (Status: Approved)

## Failure & edge states
| Data source / operation | loading/pending | error | empty/none | success |
<one row per data source or fallible operation the plan introduces —
 or the explicit line: "No async data / fallible operations.">

## Phases
- [ ] P1: <name>
  files: <exact file list — the builder's hard write boundary>
  depends: []        # phases that must be [x] first, and WHAT is consumed
  shared: []         # shared files/symbols touched — blocks parallelism
  done when: <observable acceptance criterion>

## Verification
<the design's acceptance criteria + regression surface, inherited>
```

## Phase rules

1. **Every file in exactly one phase.** No orphan changes from the
   design's impact section; no double-ownership.
2. **One phase = one concern, typically ≤5 files, independently
   verifiable.** Bigger → split (core first, auxiliary later). Tiny
   phases sharing one concern → merge.
3. **`depends:` is a contract between fresh builder runs** — name WHAT
   the later phase consumes (e.g. "P1's hook return shape"), not just
   the phase number.
4. **`shared:` certifies parallel-safety at plan time.** Two phases may
   build in the same wave ONLY when their file lists are disjoint and
   neither names a `shared:` file the other touches. Any overlap →
   order them with `depends:` instead. Collision avoidance is never
   left to build time.
5. **`done when:` is checkable** — observable, no "works correctly".
6. **Scale rule:** ≤3 files total → one phase, no ceremony (plan-lite).
7. Build order respects the project's layering (e.g. types/schema →
   data access → logic → UI → wiring), per
   `standards/architecture-structure.md`.

## The reuse rule (applies to every file you place)

Reuse is proven, never predicted:

- One consumer → keep it local to that feature/area.
- Two or more consumers → the area's shared location.
- Used everywhere → the project's generic/library location.

Never create new top-level folders or patterns without a measurable
benefit stated in the design. Premature extraction is a planning defect,
not caution.

## Failure & edge states (mandatory section)

Every data source or fallible operation the plan introduces declares
what happens on: pending/loading, error (and how the caller recovers),
empty/absent, success. This is how "renders something plausible and
wrong" bugs get designed out instead of reviewed out. A plan touching
data without this section is incomplete — reject your own draft.

## Before handing to the gate

- Cross-check: every element of the design's Impact section appears in
  exactly one phase.
- Cross-check: every acceptance criterion is reachable from some phase's
  `done when:` or the Verification section.
- The plan passes to the HUMAN plan gate via the orchestrator.
