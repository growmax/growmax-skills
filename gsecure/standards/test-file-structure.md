# Test File Structure — <PROJECT NAME> (fill at adoption time)

Where test code physically lives. This is the counterpart to the host's
production-code structure doc: same "obvious home" philosophy, applied to
tests. Installed by the test-infra batch (B0 — `unit-test-coverage-plan.md`
§2/§3). Fill every `<...>` for the host stack; the layout below should
reflect what's actually on disk, not a proposal.

---

## Shared test infrastructure

Two kinds of locations, both root-level peers of the project's other config:

```text
<runner config file>        # e.g. the test runner's config: preset,
                            # path aliases, setup file wiring
<runner setup file>         # global setup/teardown, matcher registration

<shared test-utils dir>/    # helpers every test file imports — e.g. a
  <harness helper>          # render/build-with-providers wrapper that
                            # creates FRESH state per call (no leaked cache
                            # between tests). If the harness is async, say
                            # so here: callers must await it.

<boundary-mock dir>/        # the doubles for the module boundaries named by
  <one per boundary>        # the mock policy (coverage plan §2) — platform
                            # APIs, persistence, network, routing, etc.
```

Nothing here is a test itself — it's what individual test files import.
Mock policy: module boundaries only. Never mock the unit under test.

**Fixtures** (realistic synthetic domain payloads) are not centralized until
a batch needs them. When a test-cause calls for reusable domain fixtures, add
them under `<shared test-utils dir>/fixtures/<domain>.<ext>` and record that
decision in the batch's test-cause; don't invent an inline convention per
file. Fixture naming is `<domain>.<ext>` — the enclosing `fixtures/` folder
already says what the file is, so a `.fixture.` suffix is redundant (the same
reason the harness file is named for what it does, not what it is).

---

## Colocated `__tests__/` — everywhere else

Every concern folder gets its own `__tests__/`, next to the code it tests.
No central test tree:

```text
<source root>/<area>/
  <unit>.<ext>
  __tests__/
    <unit>.test.<ext>          # the batch's behavioral coverage

  <deeper concern>/
    <unit>.<ext>
    __tests__/
      <unit>.test.<ext>
```

One `__tests__/` folder per concern folder, matching the module's internal
shape 1:1.

**Thin wiring/entry files get no direct tests** (route files, module
registrations, DI composition roots): they only wire units together; the
behavior lives in — and is tested at — the units they wire.

---

## Naming convention

- `<Name>.test.<ext>` — all batch coverage tests.
- If the stack distinguishes rendered vs non-rendered units by extension or
  suffix (e.g. a UI component vs a pure function), record the rule here:
  <rendered-unit suffix rule>.
- `<Name>.smoke.test.<ext>` — reserved for B0's harness-proof tests only
  (they prove the infra runs end to end; they are NOT a batch's behavioral
  coverage).

---

## Excluded on purpose

No test file, no empty placeholder — just absence, with the reason recorded
in the relevant batch's test-cause:

- pure constant/token files — no behavior
- pure presentation units with no logic
- <project-specific exclusions>

---

## Who applies this

The `test-planner` cites this doc when scoping a batch's `Unit Inventory`;
the `test-implementer` follows it when implementing a phase; the
`test-verifier` checks new test files land in the right `__tests__/` folder,
not a stray central location.
