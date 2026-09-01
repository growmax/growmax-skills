# Harness adapters

The canonical roles live in `agents/` and the reasoning framework in
`skills/unit-testing/` — those are the single source of truth. This folder
holds THIN SHIMS per agent CLI: each shim is a few lines granting tools and
pointing at the canonical role file. Never edit a shim's behavior; edit
`agents/<name>.md` and every harness picks it up.

## Claude Code — `claude/`

Install: `cp -r harnesses/claude/.claude <your-repo>/`

Claude Code discovers `.claude/agents/*.md` automatically. Each shim carries
the role's name/description frontmatter and instructs the agent to read and
follow `agents/<role>.md`. Entry points: `/gsecure-setup` (one-time adoption —
installs the layer, gathers the project's context, fills the host docs;
installed from `.claude/commands/gsecure-setup.md`), then `/test-build <batch>`
(installed from `.claude/commands/test-build.md`) in the main session — the
master owns the human gates and is never delegated.

## OpenCode — `opencode/`

Install: `cp -r harnesses/opencode/.opencode <your-repo>/`

OpenCode auto-loads `AGENTS.md` and discovers `.opencode/agents/*.md`.
`test-orchestrator` is `mode: primary`; the workers are `mode: subagent`,
dispatched via the Task tool.

## Hermes — `hermes.md`

No shims needed. Hermes auto-loads `AGENTS.md`; see `hermes.md` for the
dispatch mapping (main session = master, roles via delegate_task, gates via
clarify).

## Other CLIs

Any agent CLI that (a) reads a root-level instructions file and (b) can read
files can run gsecure: point its instructions at `AGENTS.md` and have it read
roles from `agents/` on demand. Add a shim folder here when you wire one up.
