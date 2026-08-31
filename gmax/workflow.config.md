# Workflow configuration — FILL THIS IN

Every persona reads this file instead of assuming anything about your
stack. Delete the guidance comments once filled.

## Project

- Name:
- One-line description:
- Platform type:            <!-- web / mobile / backend / library / monorepo / ... -->
- Primary language(s):

## Technical profile

A COMPACT description of how this project works today — observed from
the repo, never a universal template. The architect reads it first;
where it and the repo disagree, the repo is truth (and the profile gets
corrected). Grows over time from real implementation experience — add
one rule per lesson, never a rulebook up front. ~15 lines max.

- Project shape:              <!-- frontend-only / backend-only / full-stack -->
- Frontend framework/stack:   <!-- e.g. React + TypeScript; skip if no FE -->
- Frontend layer flow:        <!-- e.g. component → hook → service → api — as OBSERVED -->
- Backend framework/stack:    <!-- e.g. Node/Express, Java/Spring; skip if no BE -->
- Backend layer flow:         <!-- e.g. controller → service → repository — as OBSERVED -->
- API style:                  <!-- e.g. REST, GraphQL, RPC -->
- General rules:              <!-- 3-5 observed rules, e.g. "reuse existing patterns",
                                   "no new libraries without asking" — add over time -->

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
