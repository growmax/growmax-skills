---
name: unit-testing
description: Design and implement high-signal unit tests for application code. Use this skill when adding, improving, reviewing, or debugging unit tests for isolated business logic, stateful components, view models/controllers, reducers, use cases, repositories with mocked/fake dependencies, mappers, validators, formatters, and other units whose behavior can be verified in isolation.
allowed-tools: Read, Grep, Glob
---

# Unit Testing Skill

Reasoning framework for the unit-test build (`void/test/unit-test-coverage-plan.md`).
Applied by the test build's `test-designer` (Pass A) and `test-implementer` (Pass B) roles while implementing a `void/test/Flow-based-plans/unit-test-<batch>.md`
phase — pick the matching procedure in `references/` for the phase's mode:

| Situation | Reference |
|---|---|
| Adding tests to already-built screens/hooks/utils (the common case here) | `references/existing-code-flow.md` |
| A plan phase ships new production code alongside its tests | `references/new-feature-flow.md` |
| Refactoring code that must keep its existing behavior | `references/refactor-protection-flow.md` |

## Mission

Produce unit tests that provide meaningful confidence in application behavior.

The goal is **not** to maximize test count, line coverage, or branch coverage. The goal is to identify and protect the behaviors that matter, including realistic failures, boundaries, state transitions, side effects, invariants, and domain-specific risks.

The agent must reason about the target unit before writing tests.

> **Teach the agent how to think about tests, not which exact tests to write.**

The framework in this skill is a reasoning aid, not a fixed checklist. The agent must adapt it to the actual unit, architecture, domain, task, and existing codebase.

---

# 1. Core Principles

## 1.1 Test behavior, not implementation

Prefer tests that verify observable behavior and contracts over tests that mirror internal implementation details.

Good:

- Given invalid credentials, the authentication operation returns the expected domain error.
- Given a successful response, the unit exposes an authenticated state.
- When validation fails, the repository is not called.

Weak:

- A private helper was called.
- A particular internal variable has a specific value.
- The implementation uses a particular loop or conditional.

Implementation details may be tested when they are themselves part of a meaningful contract, but they should not be the default target.

---

## 1.2 Risk is more important than coverage percentage

Coverage metrics are signals, not the definition of test quality.

A unit can have high coverage while missing:

- important failure paths
- incorrect state transitions
- incorrect side effects
- boundary conditions
- invalid dependency responses
- concurrency/repetition problems
- domain-specific edge cases

Prioritize scenarios by the potential impact and likelihood of meaningful regression.

---

## 1.3 Evidence before assumptions

Before deciding what to test, inspect the available evidence.

Depending on the task, examine:

- the target unit
- public API
- types/models
- direct dependencies
- dependency contracts/interfaces
- callers or consumers
- existing tests
- related implementation
- error types
- state definitions
- domain rules
- configuration that affects behavior
- project testing conventions

Do not invent behavior that the codebase does not support.

If behavior is ambiguous, identify the ambiguity instead of silently encoding an assumption into a test.

---

## 1.4 The test suite should protect the behavioral contract

For each meaningful behavior, ask:

> What promise does this unit make to the rest of the application?

Tests should protect those promises.

A useful test should fail when a realistic regression violates the contract.

---

## 1.5 Negative behavior matters

Do not only verify what should happen.

Also identify what must **not** happen.

Examples:

- invalid input must not trigger a dependency call
- failed authentication must not persist a token
- duplicate submission must not create duplicate work when deduplication is required
- failed operations must not leave loading state active
- an error must not be silently converted into success
- a no-op action must not emit an unintended event

Negative assertions are often high-value regression protection.

---

## 1.6 Use realistic test data

Test data should represent meaningful domain scenarios.

Avoid arbitrary placeholder values when the value's semantics matter.

Prefer data that makes the scenario obvious:

- valid domain identifiers
- realistic but synthetic users
- meaningful dates
- meaningful amounts
- representative API responses
- explicit error payloads

Do not use production secrets or real user data.

---

## 1.7 Mocks and fakes are tools, not goals

Isolate the unit from dependencies that are outside the unit's responsibility.

Use mocks, fakes, stubs, fixtures, or test doubles according to the project's conventions.

Do not mock the behavior being tested.

Do not mock everything automatically.

A dependency should be replaced when isolation, determinism, speed, or failure simulation requires it.

When a fake or stub is sufficient, prefer the simplest test double that preserves meaningful behavior.

---

## 1.8 Tests must be deterministic

Avoid tests that depend unnecessarily on:

- real network calls
- real production services
- wall-clock timing
- random values
- global mutable state
- execution order
- device-specific state
- external files or databases

When time, randomness, or environment affects behavior, control those inputs where practical.

---

## 1.9 Every test must have a reason to exist

Before keeping a test, be able to answer:

> What regression does this test protect against?

If the answer is unclear, reconsider the test.

Avoid adding tests solely because:

- a method exists
- a line is uncovered
- a branch exists
- another test looks similar
- an AI-generated checklist says the case should exist

---

# 2. Reasoning Framework

Use the following dimensions to investigate the target unit. They are **questions to explore**, not mandatory test categories.

Only apply dimensions that are relevant, and introduce additional dimensions when the code or domain reveals a new risk.

## 2.1 Contract

Determine:

- What is this unit responsible for?
- What does it promise to callers?
- What behavior is explicitly or implicitly required?
- What behavior is outside its responsibility?

---

## 2.2 Inputs

Identify input classes that can meaningfully change behavior.

Consider where relevant:

- normal values
- invalid values
- empty values
- null/missing values
- boundary values
- malformed values
- repeated values
- unexpected combinations
- domain-specific values

Do not mechanically create one test for every category.

---

## 2.3 Outputs

Identify all meaningful outcomes:

- successful result
- failure result
- domain error
- exception
- state change
- event
- callback
- transformed value
- no-op

Verify the important parts of the outcome, not merely that a result exists.

---

## 2.4 State and transitions

If the unit has state, map meaningful transitions.

Examples:

- idle → loading
- loading → success
- loading → error
- error → retry
- authenticated → unauthenticated

Ask:

- What is the initial state?
- Which operations cause transitions?
- Are transitions reversible?
- What happens when an operation fails midway?
- Can an operation happen while another is in progress?
- Is stale state possible?

Test transitions that represent meaningful behavior rather than mechanically testing every assignment.

---

## 2.5 Dependencies

For each meaningful dependency, determine:

- What does the unit expect from it?
- What responses are possible?
- Which failures matter?
- Which interactions matter?
- Which interactions must not occur?

Do not stop at the happy-path dependency response.

---

## 2.6 Side effects

Identify effects such as:

- persistence
- event emission
- analytics
- cache updates
- navigation signals
- callbacks
- state publication
- logging when behaviorally relevant

Verify important side effects and important non-effects.

---

## 2.7 Failure modes

Ask:

> How can this unit realistically fail?

Consider both local failures and dependency failures.

Examples:

- validation failure
- authorization failure
- missing data
- malformed data
- timeout
- dependency exception
- unexpected dependency result
- partial result
- stale state

Use the actual domain and dependency contracts to determine which failures are meaningful.

---

## 2.8 Boundaries

Look for points where behavior changes.

Examples:

- minimum/maximum values
- zero/one/many
- first/last item
- empty collection
- exact date boundary
- token expiry
- pagination boundary
- maximum input length

Boundary tests should be driven by actual business or technical boundaries, not by a generic desire to test numbers.

---

## 2.9 Repetition and concurrency

Where relevant, ask:

- What if the operation happens twice?
- What if the same input is submitted repeatedly?
- What if a second operation starts before the first completes?
- Is the operation idempotent?
- Are duplicate effects allowed?
- Does cancellation or stale completion matter?

Only test these when the unit's behavior makes them relevant.

---

## 2.10 Invariants and properties

Ask:

> What must always remain true?

Examples:

- invalid input never triggers persistence
- a failed operation never reports success
- formatting preserves the underlying numeric value
- a reducer remains deterministic for the same input
- a successful operation cannot produce an invalid state

For units with strong invariants, consider property-based or parameterized testing when supported by the project's test framework.

Do not force property-based testing where example-based tests are clearer.

---

## 2.11 Domain-specific risks

This is intentionally open-ended.

Ask:

> What is unusual about this unit's domain that the generic testing framework would miss?

Examples:

- financial rounding
- timezone and date semantics
- authentication state
- permissions
- localization
- pagination
- caching
- offline behavior
- feature flags
- optimistic updates
- synchronization
- retry policies
- data normalization

The agent is expected to discover additional risk dimensions from the actual codebase.

---

# 3. Scenario Discovery

After understanding the unit, generate candidate scenarios.

Do not begin with a fixed number of tests.

Instead, explore until the meaningful behavioral space is understood.

For each candidate scenario, identify:

- **Given** — relevant starting conditions
- **When** — action/event
- **Then** — expected observable behavior
- important positive assertions
- important negative assertions
- dependency interactions
- relevant state transitions
- why the scenario matters

Example:

```text
Given:
    valid credentials and an unauthenticated state

When:
    login is requested

Then:
    authentication succeeds
    authenticated state is exposed
    token is persisted

And:
    authentication failure does not persist a token
```

The exact structure may vary with the project's framework, but the behavioral intent must remain clear.

---

# 4. Challenge the Initial Scenario Set

Do not stop after identifying the obvious happy path.

Before implementation, deliberately challenge the scenario set.

Ask:

### Assumption challenge

- What assumptions am I making about the inputs?
- What if those assumptions are false?

### Transition challenge

- What happens at state transitions?
- What happens if execution stops or fails during a transition?

### Dependency challenge

- What if a dependency fails?
- What if it returns an unexpected but possible result?

### Repetition challenge

- What if the action occurs twice?
- What if calls overlap?

### Boundary challenge

- Where does behavior change at a boundary?

### Negative challenge

- What must explicitly not happen?

### Domain challenge

- What is specific to this feature that a generic test checklist would miss?

### Regression challenge

- What realistic defect could a developer introduce here?
- Which test would catch that defect?

The agent should add scenarios only when the reasoning identifies meaningful risk.

---

# 5. Scenario Selection

Not every discovered possibility should become a test.

For each candidate scenario, evaluate:

1. Does it represent meaningful behavior?
2. Is the behavior within the unit's responsibility?
3. Would a regression here matter?
4. Is the scenario realistic?
5. Does it add distinct protection?
6. Can the behavior be tested deterministically?
7. Is this genuinely a unit-level concern?
8. Is the assertion strong enough to detect a regression?
9. Is another test already protecting the same contract?

Prefer a smaller set of high-signal tests over a large set of low-value tests.

---

# 6. Test Design Rules

## 6.1 One behavioral reason per test

A test may contain multiple assertions when they describe one coherent behavior.

Avoid tests that combine unrelated scenarios merely to reduce test count.

---

## 6.2 Assertions should be meaningful

Weak:

```text
expect(result).toBeDefined()
expect(component).toExist()
expect(mock).toHaveBeenCalled()
```

These may be useful in limited circumstances, but they should not be the main evidence of correctness.

Prefer assertions that verify:

- exact meaningful state
- domain result
- important error
- important side effect
- important non-effect
- relevant dependency arguments

---

## 6.3 Verify interactions when interactions are part of the contract

If behavior requires:

```text
validate
→ repository
→ persist
```

it may be important to verify:

- repository is called with the correct data
- persistence receives the correct result
- repository is not called when validation fails

Do not assert every internal call.

---

## 6.4 Prefer observable behavior over call-count obsession

A test should not become brittle because an implementation changes from:

```text
helper A → helper B → repository
```

to:

```text
helper C → repository
```

unless those calls themselves are part of the contract.

Interaction assertions should protect meaningful boundaries, not implementation choreography.

---

# 7. Test Data Strategy

For each scenario, select data intentionally.

Ask:

- Why is this value valid?
- Why is this value invalid?
- What boundary does this value represent?
- Does the value expose a meaningful behavior?
- Is the data representative of the domain?
- Is the test relying on accidental properties of the value?

Use deterministic synthetic data.

If a scenario depends on time, randomness, locale, or environment, control those inputs where possible.

---

# 8. Test Doubles Strategy

Choose the least complex double that gives the test the required control.

### Stub

Use when the test needs a controlled return value.

### Mock

Use when verifying an interaction is itself meaningful.

### Fake

Use when a lightweight working implementation gives better behavioral realism.

### Spy

Use when observing an interaction without replacing all behavior.

### Fixture

Use for reusable meaningful domain data.

Do not introduce a complicated mocking layer when a simple fake or stub is sufficient.

---

# 9. Avoid Shallow Tests

The following patterns are warning signs.

## Coverage-driven tests

Tests written only to execute uncovered lines.

## Existence assertions

Tests that merely verify an object, method, or component exists.

## Implementation mirroring

A test that reproduces the implementation's internal algorithm instead of testing behavior.

## Excessive mocking

A test with so many mocks that it only proves the mocks were configured correctly.

## Redundant tests

Multiple tests proving the same contract with insignificant data variation.

## Happy-path-only suites

Only successful responses are tested despite meaningful failure behavior.

## Generic edge-case dumping

Adding arbitrary edge cases without evidence that they matter.

## Snapshot substitution

Using snapshots as a substitute for meaningful behavioral assertions.

## Test-after-the-fact rationalization

Writing tests first and then inventing a justification for why each test is valuable.

---

# 10. Mutation-Oriented Test Review

After writing tests, mentally or practically challenge them.

For each important behavior:

> What realistic implementation change would introduce a bug?

Examples:

- remove a validation check
- stop persisting a token
- return the wrong error
- forget to reset loading
- call a dependency with incorrect data
- accidentally allow duplicate operations
- swap two state transitions
- mishandle an empty response

Then ask:

> Would the current test suite fail?

If not, determine whether:

1. a missing test should be added,
2. an assertion should be strengthened, or
3. the behavior is intentionally not worth protecting.

The objective is not artificial mutation-test scores. The objective is to reason about whether tests can detect realistic regressions.

---

# 11. Test Review Checklist

Before considering the unit-test work complete, review:

### Understanding

- [ ] The unit's responsibility is understood.
- [ ] Relevant dependencies and contracts were inspected.
- [ ] Existing tests and project conventions were considered.

### Behavioral coverage

- [ ] Important success behavior is covered.
- [ ] Important failure behavior is covered.
- [ ] Meaningful boundaries are covered.
- [ ] Important state transitions are covered.
- [ ] Important side effects are covered.
- [ ] Important negative behavior is covered.
- [ ] Domain-specific risks were considered.

### Test quality

- [ ] Tests are deterministic.
- [ ] Test data is intentional.
- [ ] Assertions are strong and meaningful.
- [ ] Mocks/fakes are used appropriately.
- [ ] Tests are not unnecessarily coupled to implementation details.
- [ ] Tests are not redundant.
- [ ] Each test has a clear reason to exist.

### Regression confidence

- [ ] Realistic implementation regressions would cause relevant tests to fail.
- [ ] The suite does not rely primarily on coverage percentage as evidence of quality.
- [ ] Any remaining uncovered behavior has been consciously evaluated.

---

# 12. Definition of Done

Unit-test work is complete when:

1. The target unit and relevant context have been understood.
2. Its meaningful behavioral contract has been identified.
3. Relevant risk dimensions have been explored.
4. Candidate scenarios have been challenged rather than mechanically generated.
5. High-value scenarios have been selected.
6. Tests verify behavior with meaningful assertions.
7. Important positive and negative behavior is protected.
8. Test doubles isolate dependencies appropriately.
9. Tests are deterministic and maintainable.
10. The test suite has been run.
11. Failures have been diagnosed rather than blindly fixed.
12. The resulting tests would detect realistic regressions.
13. No low-value tests were added solely to increase test count or coverage.

---

# 13. Agent Autonomy

The agent is expected to reason.

Do not mechanically apply every category in this skill.

The agent may:

- introduce additional scenario categories
- reject irrelevant generic scenarios
- identify domain-specific risks
- identify hidden dependencies
- identify ambiguous behavior
- recommend stronger assertions
- identify redundant tests
- recommend a testability concern without automatically refactoring

The agent must not:

- invent product behavior without evidence
- create arbitrary edge cases solely for quantity
- weaken assertions just to make tests pass
- change production behavior merely to satisfy a test
- treat coverage percentage as proof of correctness
- assume every method requires a dedicated test
- assume every dependency interaction must be mocked or asserted

When uncertainty materially affects expected behavior, state the uncertainty and seek evidence from the codebase, task requirements, types, existing tests, or documented contracts.

---

# 14. Separation Between Reasoning and Implementation

When practical, use two conceptual passes.

## Pass A — Test Designer

The agent:

1. investigates the unit
2. defines the behavioral contract
3. maps relevant behavior
4. discovers risks
5. proposes scenarios
6. challenges the scenarios
7. selects high-value tests

Do not write final test code during this pass unless the task explicitly requires a combined workflow.

## Pass B — Test Implementer

The agent:

1. implements the selected scenarios
2. follows project conventions
3. uses appropriate test doubles
4. runs the tests
5. diagnoses failures
6. reviews test effectiveness
7. strengthens or removes tests when justified

The distinction exists to prevent the implementation from driving the test design.

---

# 15. Adaptation to the Actual Project Architecture

This skill is framework- and stack-agnostic; in any given project it is
applied to that project's stack and test harness (see
`standards/test-file-structure.md` for the file-layout convention and
`references/test-mechanics.md` — host-filled — for how the
project's runner and doubles actually behave).

Respect the project's existing conventions for:

- test framework
- mocking/faking
- fixtures
- naming
- setup/teardown
- asynchronous testing
- parameterized tests
- property-based tests
- file organization

Do not introduce a new testing library or architecture solely because it is preferred in the abstract.

---

# 16. Final Principle

The highest-quality unit tests come from understanding the unit's behavior and risk, not from following a universal list of test cases.

Use this skill as a **reasoning framework**.

The agent must continuously ask:

> **What does this unit promise?**

> **What could realistically break that promise?**

> **What evidence in this codebase tells me that?**

> **What test would fail if that regression happened?**

> **What important behavior have I not yet challenged?**

The goal is not to make the test suite look comprehensive.

The goal is to make it **trustworthy**.
