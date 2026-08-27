---
name: codebase-analysis
description: Use when a task needs facts the knowledge base lacks — task-scoped analysis of an existing codebase before designing a bug fix or feature. Produces void/<task-slug>/analysis.md.
---

# Codebase analysis (task-scoped recon)

Analyze ONLY what the task touches. This is not a whole-codebase audit —
it is the fastest honest answer to: "what does this code do, what shares
it, and who else depends on it?"

## Procedure

1. **Frame the scope.** From the task description, name the entry
   point(s): the screen/route/endpoint/job/function where the behavior
   starts. If you cannot find it, say so — do not guess.
2. **Trace the flow.** Follow the call path from entry to the behavior in
   question. Note each hop as `path:line`. Stop at the task's boundary —
   do not spelunk unrelated branches.
3. **For a bug, walk the root-cause chain — always in this order:**
   `Expected Flow → Actual Flow → Failure Point → Root Cause → Corrected
   Flow`. Never jump from a reported symptom to a suspected fix. If the
   root cause isn't provable from the code, record the leading hypothesis
   AND the evidence that would confirm it — labeled as hypothesis.
4. **Map the shared code.** For every function/component/module on the
   path that is (or looks) shared, find its consumers: search imports and
   references. Record the consumer list, and mark each shared element
   STRUCTURAL (infrastructure: clients, types, UI primitives, utils) or
   BEHAVIORAL (validation, calculations, business rules, state
   transitions) — behavioral sharing gets the deeper scrutiny downstream.
5. **Identify contracts.** External dependencies the flow relies on:
   APIs, schemas, events, storage, other modules. Mark anything you
   could not verify as `UNVERIFIED` — never present a guess as a fact.
6. **Write `void/<task-slug>/analysis.md`** in the format below.

## Output format

```markdown
# Analysis: <task title>
Status: Draft → (human confirms) → Confirmed

## What this code does today
<plain-words walkthrough of the flow, citing path:line>

## Where the problem / change point lives
<for a bug: the root-cause chain — Expected → Actual → Failure point →
Root cause (proven, cited) or leading hypothesis + confirming evidence>

## Shared code and its consumers
| Shared symbol (path) | Consumers (paths) | Structural or Behavioral |
<every shared thing on the path; this table is mandatory>

## Contracts relied on
<APIs/schemas/events; mark UNVERIFIED where not confirmed>

## Open questions for the human
<only things the code cannot answer>
```

## Rules

- Evidence or it didn't happen: every claim cites `path:line`.
- `UNVERIFIED` is a valid and expected label. A wrong "fact" is far more
  expensive than an honest gap.
- The shared-code table is not optional — it is the regression guard.
  If nothing on the path is shared, write "none" explicitly.
- Keep it short: this file is read by a human at a gate, then by the
  architect. Two pages is a failure; half a page is the target.
