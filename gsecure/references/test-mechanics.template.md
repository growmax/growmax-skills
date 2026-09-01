# Test mechanics — <PROJECT NAME> (fill at adoption time)

**Mechanics only — no scenario design.** What the host's test harness does,
what bites, and what has been verified on disk in THIS project. Test *design*
lives in the `unit-testing` skill; *placement* lives in
`standards/test-file-structure.md`; the *mock policy* lives in
`unit-test-coverage-plan.md` §2.

Adoption: copy this file to `references/test-mechanics.md`
in the host project and fill every section. Every claim must be verified in
the host repo (run the probe, paste the output), not recalled from the
framework's docs. When a phase discovers a new mechanic (or finds one of
these stale), it adds it to the filled file rather than re-deriving it in the
next phase.

Delete this preamble and every `<...>` placeholder once filled.

---

## 1. The harness's async model

<How does the runner/harness execute units — sync or async render/invoke?
Which calls must be awaited? What shared harness helpers exist (e.g. a
render-with-providers wrapper), what do they reset per call (fresh client /
store / container?), and how do you seed or assert on their internals?>

## 2. Boundary doubles and how to drive them

<Which module boundaries are doubled per coverage plan §2, where the doubles
live, and how each is driven and reset between tests. Record the exact
reset/drive API of each double (e.g. `__reset()`, emit hooks, seeded state).
State whether doubles apply automatically or must be explicitly enabled —
verify by probe, not by reading the double's own docstring.>

## 3. Transport / network doubling

<Does the stack have an HTTP/RPC-mocking facility? If yes, which and how is it
wired? If no, record the sanctioned options — e.g. testing the client
factory's interceptors/middleware directly, replacing the transport adapter,
or mocking the module's own boundary file — and which one this project uses.
Whichever you use, it becomes the convention: the next phase must not invent
a second one.>

## 4. Timers, clocks, and concurrency control

<How to control time deterministically (fake timers / clock injection), which
variant interoperates with promises, how to keep expiry math consistent when
code reads the clock twice, teardown requirements, and how to test
single-flight / dedup logic (resolve the inner promise manually rather than
racing real timers).>

## 5. Module-level state and isolation

<Which units hold module-level caches or throw at import/load time, and the
sanctioned mechanics: module registry resets, dynamic import inside the
assertion, per-test override of configuration sources.>

## 6. Running

- Per phase, exactly what its plan's Acceptance line says: the phase's own
  test command over its paths + the typecheck gate (HOST-DEPENDENCIES §2).
- Whole surface: <the full-suite command>.
- Lint/static analysis: <the command, or "none configured — never report one
  as passing">.
- With parallel phases live, cap runner workers: <the flag/mechanism>.
- Coverage collection: <policy — this system decides protection per
  test-cause, not against a blanket threshold>.
