# gsecure — the agentic unit-test-cause build system

A standalone agentic system whose product is a **test-cause**: a specification
of what a unit of code promises and what would falsify that promise, derived
from intent — with the implementation read as evidence, never as the contract.
A red test is the product of this pipeline, not an obstacle; the role that
writes tests has no authority to weaken an expectation to reach green.

**Project- and stack-agnostic.** gsecure runs in any project — FE-only,
BE-only, or full-stack — and assumes nothing about the language, framework,
or test runner. Everything stack-specific is host configuration, filled into
templates at adoption time (see "Adopting it in a project" below).
Self-contained: nothing here imports from or depends on any other module in
this repo.

## Layout

The module root is platform-neutral; everything platform-specific is a thin
shim under `harnesses/`.

| Path | What it is |
|---|---|
| `AGENTS.md` | THE binding workflow contract — premise, roles, phase loop, worktree lifecycle, human gates, triage-log/batch-report formats. Read first. Auto-loaded by Hermes and OpenCode. |
| `agents/` | The 7 platform-neutral role files: test-orchestrator (master), test-planner, test-designer (Pass A), test-adversary, test-implementer (Pass B), test-triage, test-verifier. |
| `skills/unit-testing/` | The reasoning framework (SKILL.md §1–§16) + three flow procedures (existing-code, new-feature, refactor-protection). The test-cause template lives in existing-code-flow.md Phase 5. |
| `skills/setup/` | One-time adoption skill: install the layer non-destructively, gather the host's context, ask the developer for what is missing (never suggesting tools), fill the host docs, prove the stack. Run once per project, main session. |
| `references/test-mechanics.template.md` | Fill-in template for stack mechanics (how the host's runner/harness/doubles/timers behave). Copied to `test-mechanics.md` in the host and filled at adoption. No scenario design. |
| `standards/test-file-structure.md` | Fill-in conventions doc: where the host's test code physically lives — shared test-utils, boundary mocks, colocated `__tests__/`, naming. |
| `harnesses/` | Thin shims per agent CLI (`claude/`, `opencode/`) + `hermes.md` dispatch notes. Shims only point at `agents/` — no substance. See `harnesses/README.md`. |
| `void/test/README.md` | The session/workspace conventions: where plans, test-causes, and triage logs live; naming. State is derived from disk. |
| `void/test/unit-test-coverage-plan.template.md` | Blank master flow/phase map — copy to `void/test/unit-test-coverage-plan.md` in the host project and fill it. |
| `HOST-DEPENDENCIES.md` | What the host project must provide: feature pipeline (fix path), static gates, knowledge base of intent, test stack, git. |

Test infrastructure (runner config, shared test-utils, boundary mocks) is NOT
part of gsecure — it is host-project code, installed by the host's B0 batch.
See `HOST-DEPENDENCIES.md` §4.

## Running it (per platform)

- **Claude Code:** `/test-build <batch>` in the main session; roles dispatched
  via the Agent tool using the `test-*` shims.
- **Hermes Agent:** the chat session IS the master; dispatch roles via
  `delegate_task` with the canonical role file path (`agents/<role>.md`).
  No Hermes shims exist or are needed — see `harnesses/hermes.md`.
- **OpenCode:** `test-orchestrator` primary agent; subagent shims point at the
  canonical role files.
- The master must run where it can ask the human — it owns the human gates.

## Adopting it in a project

The setup skill does this: run it once, in the main session, from the host
repo root — `/gsecure-setup` in Claude Code, or read and follow
`skills/setup/SKILL.md` on any platform. It copies the layer
non-destructively, gathers the project's context by recon, adopts whatever
test tooling/structure the project already has, asks the developer for
whatever is missing (never suggesting tools), fills the host docs below, and
proves the stack with a smoke test. The manual equivalent of what it does:

1. Copy the platform-neutral layer into the host repo root: `agents/`,
   `skills/`, `references/`, `standards/`, and the `void/test/` skeleton
   (`README.md` + the coverage-plan template). For `AGENTS.md`: if the host
   has none, copy it; if one exists (e.g. a gmax install), APPEND gsecure's
   under a `<!-- gsecure -->` marker — never replace the host's own
   instructions.
2. Install the shim tree for the agent CLI in use:
   `cp -r harnesses/claude/.claude ./` or
   `cp -r harnesses/opencode/.opencode ./`. Hermes: nothing to install.
3. Fill `void/test/unit-test-coverage-plan.md` from the template (flows →
   batches → build order → mock policy).
4. Fill `standards/test-file-structure.md` for the host's layout, and copy
   `references/test-mechanics.template.md` to `references/test-mechanics.md`
   and fill it for the host's stack.
5. Install the host prerequisites in `HOST-DEPENDENCIES.md` (feature pipeline,
   static gates, knowledge base, test stack, git integration branch).
6. `test-planner` decomposes one batch into
   `void/test/Flow-based-plans/unit-test-<batch>.md`; the human approves it.
7. Run the test build per `AGENTS.md`, one batch at a time.
