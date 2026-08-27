# Harness adapters

The canonical personas live in `agents/` and the skills in `skills/` —
those are the single source of truth. This folder holds THIN SHIMS per
agent CLI: each shim is a few lines pointing at the canonical persona.
Never edit a shim's behavior; edit `agents/<name>.md` and every harness
picks it up.

## Claude Code — `claude/`

Install: `cp -r harnesses/claude/.claude <your-repo>/`

Claude Code discovers `.claude/agents/*.md` automatically. Each shim
carries the persona's name/description frontmatter and instructs the
agent to read and follow `agents/<name>.md`. The orchestrator runs as
your main session (start it by pasting: "Read AGENTS.md and
agents/orchestrator.md, then follow them for: <task>").

## OpenCode — `opencode/`

Install: `cp -r harnesses/opencode/.opencode <your-repo>/`

OpenCode auto-loads `AGENTS.md` and discovers `.opencode/agents/*.md`.
Main-session personas (orchestrator, context-architect) are
`mode: primary`; workers are `mode: subagent`, dispatched via the Task
tool.

## Hermes — `hermes.md`

No shims needed. Hermes auto-loads `AGENTS.md`; see `hermes.md` for the
dispatch mapping (main session = orchestrator, workers via delegate_task,
gates via clarify).

## Other CLIs

Any agent CLI that (a) reads a root-level instructions file and (b) can
read files can run gmax: point its instructions at `AGENTS.md` and have
it read personas from `agents/` on demand. Add a shim folder here when
you wire one up.
