# Workflow configuration — FILL THIS IN

Every persona reads this file instead of assuming anything about your
stack. Delete the guidance comments once filled.

## Project

- Name:
- One-line description:
- Platform type:            <!-- web / mobile / backend / library / monorepo / ... -->
- Primary language(s):

## Knowledge base

The project's business + tech knowledge base is NOT owned by gmax — it
already exists (or will grow) under the project's own structure. Record
where it lives so every persona reads and writes THAT, following its
structure and status conventions.

- Path:                       <!-- e.g. `context/`, `docs/kb/` — the project's existing KB root -->
- Index file:                 <!-- e.g. `context/INDEX.md`; write `none` if the KB has no index -->
- Write policy:               <!-- e.g. `Pending review → Confirmed`, or the project's own convention -->

## Static Gates

The builder runs these after implementing, and fixes failures before
reporting done. The orchestrator runs them once more as the integration
gate after each parallel build wave. Leave a line EMPTY if your project
has no such gate — empty gates are skipped, never faked.

- Typecheck command:        <!-- e.g. `npx tsc --noEmit`, `mypy .`, `go build ./...` -->
- Lint command:             <!-- e.g. `npm run lint`, `ruff check .` -->
- Unit test command:        <!-- e.g. `npm test`, `pytest -x` -->
- Build command:            <!-- optional, e.g. `npm run build` -->
- Conformance command:      <!-- optional project-specific static checks, e.g. an
                                 architecture-conformance script; the reviewer runs
                                 it mechanically. Empty = skipped. -->

## Conventions

- Commit message style:     <!-- e.g. conventional commits: feat(scope): ... -->
- Test file location:       <!-- e.g. colocated *.test.ts, tests/ mirror, none -->
- Anything an agent must NEVER touch:   <!-- e.g. generated files, vendor/, migrations/ -->

## Notes for agents

<!-- Project-specific standing rules, e.g. "all API calls go through
     src/api/client.ts", "no new dependencies without asking". -->
