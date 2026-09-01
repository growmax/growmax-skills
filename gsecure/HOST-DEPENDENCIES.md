# Host dependencies — what a project must provide for gsecure to run

gsecure is self-contained as a SYSTEM, but its workflow deliberately delegates
to things only the host project has. Its files reference these by role, not by
stack; they are NOT part of gsecure. Works for FE-only, BE-only, and
full-stack projects — each section says what the host must have, whatever its
stack.

## 1. A feature pipeline (fix path)

When triage confirms a PRODUCTION-DEFECT, the fix path reuses the host's
feature-pipeline personas: `planner` → `builder` → `verifier` → `reviewer`
(see `AGENTS.md` §5). Without an equivalent, a production fix
cannot be routed — triage verdicts escalate to the human instead. Fix plans
land in the host's plans directory as `fix-<unit>-<defect>.md`. Note the seam:
if the host's `planner` refuses standard/epic work without an approved
architecture model, large fixes leave the test build and become their own
feature-pipeline run.

## 2. Static gates (host-configured)

The host defines these at adoption time — record them somewhere durable the
roles can cite (e.g. an `AGENTS.md` "Static gates" section):

- A **typecheck gate** where the stack has one (e.g. a compiler or type
  checker in no-emit mode) — required at every phase gate.
- A **lint / static-analysis gate** — required at every phase gate. If the
  host keeps a warnings baseline, record where it lives; errors gate, and a
  NEW warning class a phase introduces is a finding even when the command
  exits 0.
- An **architecture-conformance gate** (optional per host) — runs when the
  fix path touches production code. If absent, the fix-path gate is the
  typecheck + lint + the full unit suite.
- Binding rule: a gate that does not run has not passed. A `Missing script`
  or unconfigured tool is DID NOT RUN, never a pass.

## 3. A knowledge base of intent

The test-designer derives contracts from intent docs, not from code. Any
committed knowledge base works — business rules, architecture docs, module
docs, ideally with an index. A project with none will produce more
`characterization`-tagged scenarios — that is the honest outcome, not a
failure of the system.

## 4. The test stack (the "B0" one-time install)

Whatever the stack, the host needs:

- A **unit test runner** + assertion library, wired as the project's test
  command (per-phase path-scoped runs and a full-suite run).
- A **harness for stateful/UI units** where the stack has them, wrapped in a
  shared helper that creates fresh state per call.
- A way to **double module boundaries** (platform APIs, persistence, network,
  routing) — library or hand-rolled; record the choice in
  `references/test-mechanics.md`.
- **Deterministic control of time and randomness** where the domain needs it.
- Runner config + setup files and a shared test-utils directory, placed per
  `standards/test-file-structure.md`.
- Record the decisions in `void/test/unit-test-coverage-plan.md` §2 and the
  mechanics in `references/test-mechanics.md` (filled from
  `test-mechanics.template.md`).

## 5. Git

The worktree-per-phase lifecycle (`AGENTS.md` §6) requires a
git repo and a long-lived integration branch (this system's docs call it
`test`). All git operations are the master's; no other role runs git.

## 6. Not included by scope decision

The whole-suite regression surface (a suite-runner persona, E2E tiers,
CI wiring) is deliberately out of scope: gsecure BUILDS test-causes; running
the whole suite is the host's existing tooling.
