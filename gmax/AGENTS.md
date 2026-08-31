# Agent operating layer (gmax)

This repo is driven through a small set of agent personas and skills.
The agents are thin personas; the skills are the procedures they follow;
the build conventions they conform to live in `standards/` (committed);
the business facts live in the project's OWN knowledge base (path in
`workflow.config.md` → Knowledge base); the working state lives in
`void/` (local-only, never committed).

## The layers

```
agents/      →  who acts        (one persona per role, plain markdown)
skills/      →  how to act      (repeatable procedures, loaded on demand)
standards/   →  how to build    (arch + styling conventions — COMMITTED)
void/        →  what is running (plans, task workspaces — LOCAL ONLY)
```

An agent is picked for a task. It follows a skill when a procedure
matches. The skill reads business facts from the project's knowledge
base, build conventions from `standards/`, and project configuration
from `workflow.config.md`. Each layer stays thin and links down —
nothing is copied between layers.

## The stores

**The project's knowledge base (path in `workflow.config.md`, committed,
team-shared)** — business and tech truth. gmax does NOT own or define
this structure: the project already has it (or grows it task by task).
Agents read it first (its index file, if any) and write new facts
directly into it following the project's own structure and status
conventions (default: `Status: Pending review` until the human flips it
to `Confirmed`; facts the developer STATES are Confirmed on write — the
developer is the authority). One write per fact, no draft copies — that
is the token discipline.

**`standards/` (repo root, committed)** — the build rulebooks:
`architecture-structure.md` (folder responsibilities, dependency
direction, placement rules, decision aids, shared-code registry) and
`architecture-styling.md` (styling source of truth, hard rules, UI
construction patterns, naming, forbidden patterns) — prescriptive rules
for writing new code, not descriptions of existing code. Engineering
conventions only — never business facts. The architect conforms to it,
the builder follows it, the reviewer reviews against it.

**`void/` (gitignored — NEVER commit any of it)** — session machinery:

```
void/
├── plan/             finalized plans, one per task: <slug>.md with phase checkboxes
└── <task-slug>/      per-task working folder, e.g. void/fix-login-crash/
    ├── STATE.md                AGENT-ONLY resume file — terse, ≤30 lines;
    │                         the ONLY file a new session reads to continue the task
    ├── analysis.md             HUMAN-FACING gate doc: codebase findings (bug path)
    └── architecture-design.md  HUMAN-FACING gate doc: tech design incl. blast radius
```

STATE.md lets a developer open a NEW session on the SAME task and resume
exactly where it stopped, without re-reading (and re-paying tokens for)
the whole folder. Gate docs are developer-friendly but budgeted (see
`void/README.md`). Task folders are deletable after completion;
`void/plan/` sustains locally.

## Context adaptivity (same flow, any starting point)

The flow does not change with how much context a project has — only the
amount of gathering does:

- **Context-rich project** (area covered by `[Confirmed]` docs): agents
  consume the knowledge base; the context stage is skipped or reduced to
  verifying nothing changed.
- **Context-thin project** (knowledge base being built): each task fills
  its gaps as Pending-review writes, reviewed in place. The base grows
  task by task.
- **No context at all**: identical to context-thin — the first tasks
  build the foundation.

The check is always the same: the knowledge base first (path and index
file in `workflow.config.md` → Knowledge base), gaps only.

## The flow

```
Prompt → orchestrator classifies size (trivial / small / standard / epic)
       → trivial? → builder directly (runs the project's checks) → commit → done
       → small?   → plan-lite → human approval → builder
                  → one senior review → PASS → commit → done
       → BUG FIX (standard/epic):
                  → business frame first: void/<slug>/business-context.md
                    (user, flow, expected vs observed, impact, scope)
                  → codebase analysis (task-scoped: flow, shared code, callers)
                    → void/<slug>/analysis.md (+ durable findings direct into
                      the shared-code registry as Pending review)
                    → HUMAN CONFIRMATION (in place; flip to Confirmed)
                  → architect designs the fix (blast-radius mandatory)
                    → void/<slug>/architecture-design.md (+ durable tech facts
                      into the project KB and/or standards/ as Pending review)
                    → HUMAN GATE → Approved/Confirmed
                  → planner → plan → build waves → reviewer
       → NEW FEATURE / FLOW (standard/epic):
                  → context-architect: organize the developer's intent,
                    ask blocking questions, confirm the interpretation
                    → void/<slug>/business-context.md + facts written
                      DIRECTLY into the project's knowledge base as
                      Pending review (one write, no draft copy)
                    → HUMAN BUSINESS REVIEW in place → Confirmed
                  → architect → void/<slug>/architecture-design.md
                    (+ durable tech facts as Pending review) → HUMAN GATE
                  → planner → plan → build waves → reviewer
       → build waves: ready phases (depends: all done); parallel-safe phases
         (disjoint files, no shared: overlap) build as one batch (max 3)
         → builder self-checks the project's gates (workflow.config.md)
         → wave of 2+ done → orchestrator runs the integration gate once
       → all phases done → reviewer (one senior pass: code vs plan + context,
         regression checklist on shared-code consumers)
       → BLOCK / FIX FIRST → back to builder → re-review
```

Every stage resumes from files, never session history: plan checkboxes
(`void/plan/<slug>.md`) and the `Status:` headers of the design files.

## The tiers (scale ceremony to task size)

| Tier | Shape | Path |
|---|---|---|
| trivial | one-liner, obvious | builder direct, self-check, commit |
| small | ≤3 files, single concern | plan-lite + human OK, build, one review |
| standard | one feature/bug, multi-file | full pipeline, single plan file |
| epic | multiple concerns | full pipeline, split into multiple plans |

## Human gates (never skipped, never self-approved)

1. Analysis/context review (bug path: analysis.md + pending registry entries;
   feature path: the Pending-review files written into the project KB)
2. Architecture approval (architecture-design.md → `Status: Approved`)
3. Plan approval (void/plan/<slug>.md)
A subagent cannot ask the human — gate-owning stages run in the MAIN session.

## Commit policy

The orchestrator owns every commit; workers never run git; push is
human-only, always.

- **Code** commits at verified checkpoints (one per phase, exactly the
  phase's file list — never `git add -A`).
- **Knowledge base + `standards/`** commit at confirmation: when the
  human flips Pending-review facts to Confirmed, the orchestrator stages
  exactly those files with a `docs(context): ...` message. Unconfirmed
  Pending-review docs may be committed only if the human asks — the
  default is commit-on-Confirmed so git never carries unverified "truth".
- **Never anything under `void/`.** Plans, STATE files, analysis, and
  designs are local session machinery.

## Token rules (binding for every agent)

- Skill references load only when their step runs — never all up front.
- Subagents get file paths (persona + plan + phase) and return short
  summaries — findings and evidence, never raw file dumps.
- Every builder brief states: objective, the phase's exact file list as a
  hard write boundary, the `done when:` criterion, and an effort budget.
- The builder reads only the files it edits + direct imports.
- Void write discipline (see `void/README.md`): STATE.md ≤30 lines,
  updated only at stage transitions; gate docs cite `path:line`, never
  paste code; every doc inside its size budget; no content duplicated
  between files — link instead.
- Resuming a task in a new session: read `void/<task-slug>/STATE.md`
  ONLY, then jump to the recorded stage. Never re-read completed stages.

## Harness notes

- **Claude Code**: personas are discovered via the shims in
  `.claude/agents/` (installed from `harnesses/claude/`). Orchestrator
  runs as the main session.
- **OpenCode**: shims live in `.opencode/agents/`
  (installed from `harnesses/opencode/`).
- **Hermes**: auto-loads this AGENTS.md; no shims. The main session is the
  orchestrator; workers are dispatched as subagents told to read their
  persona file first. See `harnesses/hermes.md`.
- Canonical personas live in `agents/` — edit them there, never in shims.
