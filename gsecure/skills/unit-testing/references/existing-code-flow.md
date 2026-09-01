---
name: existing-code-unit-testing-flow
description: Workflow for adding high-signal unit tests to already implemented application code. Use when a flow, feature, component, ViewModel, use case, reducer, repository, mapper, validator, formatter, or other unit already exists and needs unit-test coverage, especially before or during refactoring.
---

# Existing-Code Unit Testing Flow

## Purpose

Use this workflow when the production code already exists. This is the
common case for a retrofit unit-test build — the features are already built;
the build is retrofitting coverage.

The goal is to create trustworthy unit tests for existing behavior without
blindly converting implementation details or accidental behavior into
permanent requirements.

The workflow must use the `unit-testing` Skill as the testing-quality framework.

## Core Rule

> **Existing implementation is evidence, not automatically the specification.**

Before writing a test, distinguish:

- intended behavior
- documented behavior
- observed behavior
- existing reliable behavior protected by tests
- suspicious or ambiguous behavior
- likely defects

Do not weaken a test merely because the current implementation disagrees with the expected behavior.

---

# Phase 0 — Establish Scope

Identify:

- requested flow/feature
- target units
- files/modules involved
- existing tests
- related context documentation
- relevant product/domain requirements
- whether the task includes refactoring

Do not expand into unrelated areas unless required to understand the target behavior.

Produce a short scope summary before implementation.

---

# Phase 1 — Discover the Existing System

Inspect the target code and its relevant context.

At minimum, examine:

- target implementation
- public API
- types/models
- direct dependencies
- dependency contracts
- callers/consumers where useful
- existing tests
- error/state definitions
- related feature code
- project conventions

## Use the project's knowledge base of intent

1. Discover its structure (a well-kept knowledge base has an index that maps
   every document).
2. Identify documents relevant to the target feature (module docs, business
   rules, architecture notes).
3. Read the minimum relevant context needed to understand behavior.
4. Prefer documented intent over assumptions.
5. Treat the docs as evidence, not unquestionable truth.
6. Note contradictions between the docs and the implementation.
7. Do not rewrite knowledge-base files unless explicitly requested.

Useful context may include:

- feature requirements
- architecture notes
- business rules
- API contracts
- state diagrams
- decisions
- known limitations
- acceptance criteria
- domain terminology
- previous implementation notes

### Context output

Record:

```text
Relevant context:
- <file/topic>
- <file/topic>

Important rules:
- <rule>
- <rule>

Open questions / contradictions:
- <question>
```

Do not copy large context documents into test files.

---

# Phase 2 — Reconstruct the Behavioral Contract

Using the code, context, requirements, types, existing tests, and callers, determine:

- what the unit is responsible for
- what it must do
- what it must not do
- valid outcomes
- failure behavior
- important state transitions
- important side effects
- relevant dependency interactions

Classify each important behavior as:

### Confirmed intended behavior

Supported by requirements, reliable context, or authoritative domain rules.

### Confirmed observed behavior

Clearly implemented and relied upon, but not necessarily documented as a requirement.

### Ambiguous behavior

Evidence conflicts or is insufficient.

### Suspicious behavior

Implementation appears inconsistent with the intended contract.

Do not silently resolve ambiguity.

---

# Phase 3 — Decide the Testing Mode

Determine whether the task is primarily:

### A. Add tests to stable existing behavior

Use the expected contract and protect meaningful behavior.

### B. Characterize behavior before refactoring

Capture behavior that is intentionally being preserved.

Clearly distinguish characterization tests from requirement tests.

### C. Test and expose an existing defect

If the intended behavior is clear and the implementation violates it, create the test that demonstrates the defect. Do not alter the expectation to make the current code pass.

If the task explicitly includes fixing the defect, fix the implementation after the failing test establishes the expected behavior. In this repo, a defect discovered mid-batch is recorded as a Finding in the plan file — never silently fixed unless the human has explicitly asked for it.

---

# Phase 4 — Risk and Scenario Discovery

Invoke the `unit-testing` Skill's reasoning framework.

Do not generate tests mechanically.

Investigate the target's:

- behavioral contract
- meaningful input classes
- outputs
- state transitions
- dependency behavior
- failures
- boundaries
- side effects
- negative behavior
- repetition/concurrency where relevant
- invariants
- domain-specific risks

Then challenge the obvious scenarios.

Ask:

- What realistic regression could happen here?
- What assumption could be wrong?
- What happens at a state transition?
- What happens when a dependency fails?
- What must not happen?
- What is unusual about this domain?
- What behavior would be expensive or dangerous to break?

---

# Phase 5 — Produce the Test Cause Before Test Code

Before implementing tests, create a concise test-cause record at:

```text
void/test/<batch-slug>/<unit>.test-cause.md
```

One file per unit or tight group — not per batch. `void/test/README.md`
owns the exact convention.

The test-cause record should contain:

```markdown
# Unit Test Cause — <Unit>

## Scope
What is being protected?

## Behavioral Contract
What must be true?

## Observed vs Intended
What is current behavior?
What is intended behavior?
Are there ambiguities?

## Scenarios
| ID | Scenario | Given | When | Then | Risk |
|---|---|---|---|---|---|

## Important Negative Behavior
- ...

## Domain-Specific Risks
- ...

## Characterization Tests
- ...

## Known Gaps / Questions
- ...

## Test Strategy
- Unit boundaries
- Dependencies to isolate
- Test doubles
- Important assertions
```

Do not create a test-cause document full of generic statements. It must explain why the selected tests exist.

The test-cause is a **design artifact**, not a duplicate of the test code.

---

# Phase 6 — Review the Test Cause

Before writing tests, challenge the test-cause.

Verify:

- scenarios are behavior-driven
- important failures are represented
- important negative behavior is represented
- domain-specific risks were considered
- scenarios are not redundant
- current implementation has not been mistaken for specification
- characterization cases are clearly distinguished
- expected assertions are strong enough
- unit boundaries are correct

If the test cause is shallow, improve it before generating test code.

---

# Phase 7 — Implement Unit Tests

Use the repository's testing framework and conventions —
`standards/test-file-structure.md` (colocated `__tests__/`, shared
test-utils, boundary doubles, naming).

Rules:

- implement only selected high-value scenarios
- use realistic synthetic test data
- isolate dependencies appropriately (module boundaries only — see the
  mock policy in `unit-test-coverage-plan.md` §2)
- avoid unnecessary mocking
- use meaningful assertions
- verify important non-interactions
- keep tests deterministic
- follow project naming and organization conventions
- do not change production code merely to make weak tests pass

If implementation reveals an important scenario not present in the test cause, update the test cause before adding the test.

---

# Phase 8 — Run and Diagnose

Run the narrowest relevant test command first (the phase's own test command
over its paths).

Then run broader relevant checks (the typecheck and lint gates —
HOST-DEPENDENCIES §2) when appropriate.

For every failure, classify it:

1. Test defect
2. Implementation defect
3. Incorrect assumption
4. Environment/tooling issue
5. Ambiguous requirement

Never automatically change an expected value just because the implementation returns something else.

If the test exposes an implementation defect, preserve the test and fix the production code only when the task permits — otherwise record it as a Finding.

---

# Phase 9 — Review Test Effectiveness

Use the `unit-testing` Skill's review principles.

Ask:

- Would realistic regressions fail?
- Are assertions meaningful?
- Are tests too coupled to implementation?
- Are there redundant tests?
- Did we accidentally lock in a bug?
- Did we miss important failure behavior?
- Did we over-mock?
- Is the test cause still accurate?
- Are remaining gaps intentional?

---

# Phase 10 — Finalize Context

If a test-cause document was created, keep it synchronized with the final tests.

Update it only with durable design information:

- important behaviors
- scenario rationale
- known limitations
- important domain rules
- characterization status

Do not turn it into a test-by-test maintenance log.

A newly discovered domain trap (rounding rule, wire-format quirk, tenant/
role edge case) not already listed in `unit-test-coverage-plan.md` §5 gets
appended there, so later batches benefit from it.

---

# Definition of Done

The workflow is complete when:

- target scope is understood
- relevant project context was inspected
- intended vs observed behavior was considered
- meaningful risks were explored
- test causes were documented where appropriate
- tests protect high-value behavior
- tests run successfully, or failures are explicitly classified
- no test expectation was weakened merely to match implementation
- characterization and requirement tests are distinguishable
- test quality has been reviewed
- context remains useful and concise
