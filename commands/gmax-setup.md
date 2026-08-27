---
name: gmax-setup
description: >-
  Install the gmax agentic-development workflow into the CURRENT project — copies the
  operating layer (agents/, skills/, standards/, workflow.config.md, harness shims, void/)
  non-destructively from the growmax-skills plugin, detects the project's EXISTING knowledge
  base and records its pointer (never creates one), drafts standards/ from the repo, and fills
  the workflow gates — every step human-confirmed. After install, every bug/feature follows the
  same gated pipeline: understand → design → plan → build waves → senior review. Use when asked
  to "install gmax", "set up the gmax workflow", "adopt gmax in this repo". Invoke with
  /gmax-setup — run once per project, in the main session.
---

# /gmax-setup — install the gmax operating layer

You are the FRONT DOOR only. The install procedure lives in the module's own skill —
`${CLAUDE_PLUGIN_ROOT}/gmax/skills/setup/SKILL.md` — read it and follow it step by step.
Do NOT restate, summarize, or improvise install logic here; the skill is the single source.

## Steps

### 1. Guards
- **Main session only** — this command asks the human questions. Never run it as a subagent.
- Confirm the cwd is the target project's repo root (look for `.git`, `package.json`,
  `pyproject.toml`, `go.mod`, etc.). Not a repo root → STOP and say so.
- Existing gmax install present (`agents/`, `skills/`, `workflow.config.md`, `.gmax-version`)?
  STOP and ask the human ONE question: update in place via `/gmax-update`, or fresh install.
  Never silently overwrite.

### 2. Resolve GMAX_ROOT
- `GMAX_ROOT="${CLAUDE_PLUGIN_ROOT}/gmax"`. Verify: `cat "$GMAX_ROOT/VERSION"` succeeds.
- `${CLAUDE_PLUGIN_ROOT}` unset or path missing → look under
  `~/.claude/plugins/` for the growmax-skills plugin cache (`find ~/.claude/plugins -maxdepth 6
  -type d -name gmax -path '*growmax*' | head -1`) and use that.
- Still not found → STOP: tell the human to (re)install the plugin
  (`/plugin install growmax-skills@growmax`) and retry.

### 3. Run the setup skill
Read `"$GMAX_ROOT/skills/setup/SKILL.md"` and execute its Steps 0–7 EXACTLY, with GMAX_ROOT as
resolved above. Binding rules (restated here only so they are never missed):
- Non-destructive: existing files are skipped or appended to, never overwritten, unless the
  human explicitly approved it.
- The project's knowledge base is DETECTED and pointed at in `workflow.config.md` — never
  created, moved, or "fixed".
- `.gitignore` gains `void/`; `standards/`, the knowledge base, and `workflow.config.md` stay
  committed.
- Record `.gmax-version` from `"$GMAX_ROOT/VERSION"`.

### 4. Report
Relay the setup skill's Step 7 report verbatim (what was installed, the KB pointer recorded,
what awaits human confirmation). Then add one line:
"Update later with `/gmax-update` after a `/plugin marketplace update growmax` bumps gmax."
