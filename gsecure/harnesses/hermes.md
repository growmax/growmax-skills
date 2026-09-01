# Hermes adapter

Hermes (https://hermes-agent.nousresearch.com) runs gsecure with zero shims:
it auto-loads `AGENTS.md` from the repo root — and in gsecure that file IS
the workflow contract (premise, roles, phase loop, issue path, worktree
lifecycle, human gates). This file is the mapping from gsecure roles to
Hermes primitives.

## The mapping

| gsecure role | Hermes primitive |
|---|---|
| test-orchestrator (master) | the MAIN chat session (only it may delegate and ask the human) |
| test-planner / test-designer / test-adversary / test-implementer / test-triage / test-verifier | `delegate_task` leaf subagents, each pointed at `agents/<role>.md` |
| human gates (AGENTS.md §7) | the `clarify` tool (main session only) |
| batch/phase state | derived from disk: plan `Status:` lines + `git worktree list` + `git status` (+ the `todo` tool) |
| unit-testing skill | read `skills/unit-testing/SKILL.md` with `read_file` (or symlink into `~/.hermes/skills/` for auto-discovery) |
| setup (one-time adoption) | the MAIN session reads and follows `skills/setup/SKILL.md` — no shim; its human questions go through `clarify` |

## Dispatch template (for the master session)

Subagents know NOTHING of the conversation — every delegation is
self-contained file paths, never history:

```
delegate_task(
  goal="You are the <role> persona. First read agents/<role>.md and follow it
        exactly; its workflow contract is AGENTS.md (binding). Your task:
        <objective>. Work in the phase worktree at <path>. Done when:
        <criterion>. Return a short judgment log: decisions taken,
        alternatives rejected, evidence as file:line, and your verdict.",
)
```

## Gotchas

- Subagents cannot ask the human — the master owns the gates and stays in the
  main session. A role that reaches a gate must return what needs approving;
  it never answers a gate on the human's behalf.
- All git operations are the master's (AGENTS.md §6); workers never run git.
- Verify a dead subagent's on-disk artifacts (`void/test/`,
  `git worktree list`) before re-dispatching — re-dispatch only what is
  actually missing.
- Keep subagent summaries short: verdicts and evidence, never file dumps.
