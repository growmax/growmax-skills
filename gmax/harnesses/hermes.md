# Hermes adapter

Hermes (https://hermes-agent.nousresearch.com) runs gmax with zero shims:
it auto-loads `AGENTS.md` from the repo root. This file is the mapping
from gmax roles to Hermes primitives.

## The mapping

| gmax role | Hermes primitive |
|---|---|
| orchestrator | the MAIN chat session (only it may delegate and ask the human) |
| context-architect | the main session plays the persona — read `agents/context-architect.md` and follow it |
| architect / planner / builder / reviewer | `delegate_task` leaf subagents |
| human gates | the `clarify` tool (main session only) |
| phase/status tracking | plan-file checkboxes in `void/plan/<slug>.md` + the `todo` tool |
| skills | read `skills/<name>/SKILL.md` with `read_file` (or symlink into `~/.hermes/skills/` for auto-discovery) |

## Dispatch template (for the main session)

Subagents know NOTHING of the conversation — every delegation is
self-contained file paths, never history:

```
delegate_task(
  goal="You are the <persona> persona. First read agents/<persona>.md and
        follow it exactly. Your task: <objective>. Read the plan at
        void/plan/<slug>.md, phase <N> only. Hard write boundary: <files>.
        Done when: <criterion>. Effort budget: max 3 fix loops.",
)
```

## Parallel waves

Dispatch the wave's parallel-safe phases as ONE `delegate_task` batch
(`tasks=[...]`, max 3). Read-only personas (reviewer, context analysis)
may always run in parallel; writers need disjoint file lists per the
plan's `shared:` annotations.

## Gotchas

- Subagents cannot ask the human — gate-owning stages stay in the main
  session. A worker that reaches a gate must return what needs approving.
- Verify a dead subagent's on-disk artifacts (`void/`, git status) before
  re-dispatching — re-dispatch only what is actually missing.
- Keep subagent summaries short (~1–2k tokens): findings and evidence,
  never file dumps.
