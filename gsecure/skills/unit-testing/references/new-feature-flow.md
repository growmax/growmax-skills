---
name: new-feature-unit-testing-flow
description: Workflow for test-first unit testing during new mobile feature development. Use when a new feature, flow, component, use case, ViewModel, reducer, repository behavior, or business rule is being designed and implemented.
---

# New Feature Unit Testing Flow

## Purpose

Use this workflow when the production behavior does not yet exist or is being substantially introduced — a regular feature plan's builder phase that ships new code alongside its tests, not a dedicated `unit-test-<batch>` plan (those are almost always `existing-code-flow.md`).

The goal is to define the behavioral contract and high-value unit-test scenarios before implementation, then use those tests as executable protection while building the feature.

Use the `unit-testing` Skill for test-design quality.

---

# Phase 0 — Understand the Feature

Inspect:

- feature/task requirements
- relevant knowledge-base docs (business rules, module docs)
- architecture conventions
- related existing features
- domain models
- dependency contracts
- existing patterns

Identify:

- user/business goal
- feature boundaries
- units likely to be introduced
- dependencies
- important states
- expected outcomes
- explicit constraints

Do not begin with test code.

---

# Phase 1 — Establish the Behavioral Contract

Translate the feature requirement into observable behavior.

Define:

- what must happen
- what must not happen
- valid outcomes
- failure outcomes
- important state transitions
- important side effects
- dependency interactions
- domain invariants

Resolve contradictions in requirements/context before implementation when possible.

Do not invent requirements simply because they are common in other applications.

---

# Phase 2 — Discover Scenarios

Use the `unit-testing` Skill.

Explore the behavior using the actual feature/domain rather than a fixed checklist.

Consider where relevant:

- normal behavior
- invalid inputs
- boundaries
- dependency failures
- state transitions
- negative behavior
- repetition/concurrency
- invariants
- domain-specific risks

Then challenge the initial scenario set.

Ask:

- What realistic bug could occur?
- What assumption could be false?
- What happens when a dependency fails?
- What must never happen?
- What unusual domain rule could be missed?
- What behavior would be costly to regress?

---

# Phase 3 — Write the Test Cause

Before implementation, document the test design at:

```text
void/test/<feature-or-batch>/<unit>.test-cause.md
```

The test cause should contain:

```markdown
# Unit Test Cause — <Feature>

## Goal
What behavior is being protected?

## Behavioral Contract
What must be true?

## Scenarios
| ID | Scenario | Given | When | Then | Risk |
|---|---|---|---|---|---|

## Negative Behavior
- ...

## Domain-Specific Risks
- ...

## Test Strategy
- Unit boundaries
- Dependencies to isolate
- Test doubles
- Important assertions

## Open Questions
- ...
```

Keep it concise and decision-oriented.

---

# Phase 4 — Review Before Implementation

Challenge the test cause.

Do not proceed merely because there are enough scenarios.

Confirm:

- contract is clear
- scenarios are meaningful
- important failure paths are included
- important negative behavior is included
- domain risks were considered
- scenarios are not redundant
- test boundaries match the architecture
- assertions will verify behavior rather than implementation details

If important behavior is ambiguous, resolve it before implementation where possible.

---

# Phase 5 — Implement the Tests

Write the unit tests from the approved behavioral scenarios.

Follow `standards/test-file-structure.md` (colocated `__tests__/`, shared
test-utils, boundary doubles, naming).

Use:

- deterministic data
- appropriate test doubles
- strong assertions
- minimal necessary mocking
- meaningful interaction assertions
- meaningful non-interaction assertions

Do not add arbitrary tests simply because additional cases can be imagined.

---

# Phase 6 — Implement the Feature

Now implement production behavior to satisfy the contract and tests.

The implementation should not be distorted merely to satisfy test mechanics.

If the chosen design changes an important behavior:

1. revisit the behavioral contract
2. update the test cause
3. update the tests
4. then implement the revised behavior

Do not silently change requirements through implementation.

---

# Phase 7 — Run and Iterate

Run the tests (the phase's own test command over its paths).

Classify failures:

- test defect
- implementation defect
- incorrect assumption
- environment/tooling problem
- unclear requirement

Fix the underlying issue rather than weakening expectations to achieve a green test suite. ("The implementation" here means the code this task is writing; a defect exposed in pre-existing code is recorded and filed via the ISSUE PATH — never fixed mid-build.)

---

# Phase 8 — Review the Finished Tests

Apply the `unit-testing` Skill's quality review.

Ask:

- Would realistic regressions fail?
- Are important behaviors protected?
- Are assertions strong?
- Are negative behaviors protected?
- Are tests deterministic?
- Are mocks appropriate?
- Are tests coupled unnecessarily to implementation?
- Are there redundant scenarios?
- Did implementation reveal a missing meaningful scenario?

If a new important scenario is discovered, update the test cause and add the test.

---

# Phase 9 — Finalize Context

Keep the test cause as a durable design artifact.

It should explain:

- the feature's important behavioral contract
- why the selected scenarios matter
- important domain risks
- meaningful known gaps

It should not become a copy of the test implementation.

---

# Definition of Done

The workflow is complete when:

- feature behavior is explicitly understood
- test cause exists and is meaningful
- high-value unit scenarios are defined
- tests are implemented
- feature implementation satisfies the contract
- tests pass
- important regressions would be detected
- context documents durable testing decisions
