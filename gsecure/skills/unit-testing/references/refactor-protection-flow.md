---
name: refactor-with-unit-test-protection
description: Workflow for safely refactoring existing mobile application code using unit tests as behavioral protection. Use when restructuring, simplifying, extracting, renaming, moving, optimizing, or otherwise changing existing implementation without intending to change its behavior.
---

# Refactor With Unit-Test Protection Flow

## Purpose

Use this workflow when the primary goal is to change implementation while preserving intended behavior.

The central question is:

> **Can we change the implementation without unintentionally changing the behavior we intend to preserve?**

Use the `unit-testing` Skill for test-quality decisions.

---

# Phase 0 — Define the Refactoring Boundary

Identify:

- target code
- behavior intended to remain unchanged
- explicit behavior allowed to change
- related dependencies
- existing tests
- relevant knowledge-base docs

Do not refactor unrelated code.

---

# Phase 1 — Understand Existing Behavior

Inspect:

- implementation
- existing tests
- callers
- domain models
- dependency contracts
- relevant context documentation
- state/error definitions

Separate:

- intended behavior
- observed behavior
- ambiguous behavior
- suspicious behavior

The existing implementation is not automatically the source of truth.

---

# Phase 2 — Decide What Must Be Preserved

Define the preservation contract.

Examples:

- same successful output
- same error mapping
- same state transitions
- same important side effects
- same validation rules
- same public behavior

Explicitly identify behavior that is intentionally allowed to change.

---

# Phase 3 — Establish Characterization Coverage

If important behavior is not already protected by reliable tests, create characterization tests before refactoring.

A characterization test records current behavior that is intentionally being preserved.

Clearly distinguish:

```text
Characterization:
"This is what the current system does and we intend to preserve it."

Requirement:
"This is what the system is required to do."
```

Do not turn suspicious behavior into a permanent requirement merely because it exists.

If behavior is clearly incorrect and the refactor is also intended to fix it, establish the desired behavior explicitly and test that instead.

---

# Phase 4 — Use the Test Cause

Create or update the relevant test-cause context document at:

```text
void/test/<batch-or-feature>/<unit>.test-cause.md
```

Record:

- preservation contract
- important scenarios
- characterization cases
- intended behavior
- known ambiguities
- risks introduced by the refactor

Keep the document concise.

---

# Phase 5 — Baseline

Before changing production code:

1. Run the relevant unit tests (the project's test command over the affected paths).
2. Confirm the baseline is understood.
3. Record existing failures separately.
4. Do not attribute pre-existing failures to the refactor.

If the baseline is not green, determine whether the relevant tests are still trustworthy before proceeding.

---

# Phase 6 — Refactor in Small Steps

Prefer small, independently understandable changes.

Examples:

- extract a method
- extract a dependency
- move logic
- simplify control flow
- rename symbols
- separate responsibilities
- replace duplicated implementation
- improve testability

After meaningful steps, run the narrow relevant tests.

Avoid combining unrelated behavior changes with a refactor unless explicitly required.

---

# Phase 7 — Verify Behavioral Preservation

After refactoring, verify:

- important outputs remain correct
- errors remain correct
- state transitions remain correct
- important side effects remain correct
- negative behavior remains correct
- dependency boundaries remain correct
- characterization tests still pass where preservation is intended

If a test fails, classify the failure before changing anything.

---

# Phase 8 — Diagnose Failures

Possible outcomes:

### Expected refactor behavior

The implementation changed internally but preserved the intended contract.

→ Update an overly implementation-coupled test if necessary.

### Accidental behavior change

The refactor changed behavior that should remain stable.

→ Fix the refactor.

### Existing defect discovered

The baseline behavior was already wrong.

→ Do not silently encode it as expected behavior. Decide whether the defect is in scope; record it as a Finding either way.

### Test was too weak

The test did not distinguish the old and incorrect behavior.

→ Strengthen the test if the contract is clear.

### Test was overly coupled

The test fails because an internal implementation detail changed.

→ Rewrite toward observable behavior.

---

# Phase 9 — Post-Refactor Test Review

Apply the `unit-testing` Skill.

Ask:

- Are tests still behavior-focused?
- Did the refactor expose a missing scenario?
- Are characterization tests still appropriate?
- Did any test accidentally preserve an implementation detail?
- Would realistic regressions still fail?
- Did the refactor create new meaningful failure modes?
- Are mocks still appropriate?
- Are tests redundant?

Update tests only when the behavior or test contract genuinely requires it.

---

# Phase 10 — Finalize

A refactor is complete when:

- intended behavior is documented
- important existing behavior is protected
- characterization coverage exists where needed
- refactoring is complete
- relevant unit tests pass
- no accidental behavior changes remain
- pre-existing failures are distinguished from refactor failures
- test-cause context reflects durable decisions
- tests provide meaningful regression protection

---

# Critical Rule

Never use this sequence:

```text
Refactor
→ test fails
→ weaken expectation
→ test passes
```

Use:

```text
Refactor
→ test fails
→ classify failure
→ determine intended behavior
→ fix implementation or test appropriately
→ rerun
```

The purpose of tests during refactoring is to protect behavior, not to certify whatever the new implementation happens to do.
