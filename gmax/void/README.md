# void/ — the local workspace (session machinery only)

Everything in here is LOCAL ONLY. `void/` must be in your `.gitignore`.
Nothing here is ever committed, pushed, or shared.

The KNOWLEDGE BASE does NOT live here — it lives where YOUR project
keeps it (path in `workflow.config.md` → Knowledge base), committed to
git, shared with the team. `void/` holds only the working state of
tasks in flight:

```
void/
├── plan/             Finalized plans, one per task: <slug>.md with phase
│                     checkboxes. PERSISTS LOCALLY. Terse by design.
│
└── <task-slug>/      One folder per bug fix / feature, named from the task.
                      DELETABLE after completion. Contains:

    STATE.md                  AGENT-ONLY resume file. Terse, ≤30 lines.
                              The ONLY file a new session reads to resume.

    business-context.md       HUMAN-FACING gate doc (both paths): the
                              task's business frame — user, flow, expected
                              vs observed, rules, acceptance, scope
    analysis.md               HUMAN-FACING gate doc (bug path)
    architecture-design.md    HUMAN-FACING gate doc (both paths)
```

## Why the split

- The project's knowledge base (committed) = durable project TRUTH.
  Written directly, once, as `Pending review`; the human's confirmation
  flips it to `Confirmed`; the orchestrator commits it at that point.
- `void/` (gitignored) = personal session MACHINERY. Resume state, gate
  drafts, plans-in-progress. Nobody else needs it; it never touches git.

## The two file classes in a task folder

**STATE.md is for agents.** A fresh session resumes the task by reading
ONLY this file: stage, statuses, phase checkboxes, the human's caveats
verbatim, the exact next action. ≤30 lines, updated only at stage
transitions and phase completions.

**Gate docs are for humans.** The developer reads these at approval
gates — plain words, developer-friendly. Size budgets below because only
ONE later stage reads each, once.

## Size budgets (binding — token discipline)

| File | Budget | Re-read by |
|---|---|---|
| STATE.md | ≤30 lines | every resume |
| business-context.md | ≤50 lines, links to KB files — never duplicates them | human gate + architect + planner + reviewer |
| analysis.md | ≤60 lines, cite path:line, no code dumps | human gate + architect, once |
| architecture-design.md | ≤120 lines | human gate + planner, once |
| void/plan/<slug>.md | one line per phase + files/depends/shared/done-when | builder reads ONLY its phase |

Overflow past a budget = split the task, not grow the doc.

## Resume procedure (new session, same task)

1. Developer names the task (or the agent lists `void/` folders).
2. Read `void/<task-slug>/STATE.md` — nothing else.
3. Jump to the recorded stage and read ONLY the artifact that stage
   consumes (e.g. "building P3" → the plan file's P3 section).
4. Never re-read completed stages' docs. Never re-run completed gates.

## Rules

1. `void/plan/` sustains across tasks. Task folders are disposable after
   completion.
2. Facts never enter the knowledge base from here — KB writes are
   direct (see `skills/context-writing/SKILL.md`), never copies of task
   drafts.
3. Only the orchestrator writes STATE.md and plan checkboxes.
4. Subagent summaries live in the chat — they are NOT persisted unless
   written into the knowledge base as Pending review and confirmed.
5. Because nothing here is committed, plans do not travel across machines
   or teammates. That is intentional: working tools, not team artifacts.
