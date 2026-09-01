---
name: gsecure-setup
description: >-
  Install the gsecure agentic unit-test-cause build system into the CURRENT project —
  copies the test-build layer (agents/, skills/, references/, standards/, void/test/,
  harness shims) non-destructively from the growmax-skills plugin, gathers the project's
  context (stack, existing test tooling, test structure, gates, knowledge base, issue
  tracker), adopts what already exists, and asks the developer for exactly what recon
  found missing — never suggesting test tools. Use when asked to "install gsecure",
  "set up gsecure", "adopt gsecure in this repo". Invoke with /gsecure-setup — run once
  per project, in the main session.
---

# /gsecure-setup — install the gsecure test-build layer

You are the FRONT DOOR only. The install procedure lives in the module's own skill —
`${CLAUDE_PLUGIN_ROOT}/gsecure/skills/setup/SKILL.md` — read it and follow it step by
step. Do NOT restate, summarize, or improvise install logic here; the skill is the
single source.

## Steps

### 1. Guards
- **Main session only** — this command asks the human questions. Never run it as a
  subagent.
- Confirm the cwd is the target project's repo root (look for `.git`, `package.json`,
  `pyproject.toml`, `go.mod`, etc.). Not a repo root → STOP and say so.
- Existing gsecure install present (`agents/test-*.md`, `skills/unit-testing/`,
  `void/test/`)? STOP and ask the human — re-run (idempotent fill only) or abort. Never
  silently overwrite.

### 2. Resolve GSECURE_ROOT
- `GSECURE_ROOT="${CLAUDE_PLUGIN_ROOT}/gsecure"`. Verify:
  `test -f "$GSECURE_ROOT/skills/setup/SKILL.md"` succeeds.
- `${CLAUDE_PLUGIN_ROOT}` unset or path missing → look under `~/.claude/plugins/` for the
  growmax-skills plugin cache (`find ~/.claude/plugins -maxdepth 6 -type d -name gsecure
  -path '*growmax*' | head -1`) and use that.
- Still not found → STOP: tell the human to (re)install the plugin
  (`/plugin install growmax-skills@growmax`) and retry.

### 3. Run the setup skill
Read `"$GSECURE_ROOT/skills/setup/SKILL.md"` and execute its Steps 0–8 EXACTLY, with
GSECURE_ROOT as resolved above. Binding rules (restated here only so they are never
missed):
- Non-destructive: existing files are skipped, merged, or appended to — never
  overwritten — unless the human explicitly approved it.
- Detect any agentic layer already in the project (e.g. a gmax install) and merge
  alongside it — gsecure's files carry `test-` prefixes or live in `unit-testing/`/
  `void/test/`, so collisions mean something is wrong: stop and ask.
- NEVER suggest test tools — found tooling is adopted; missing tooling is the
  developer's word to say.
- A gate that does not run has not passed; an absent gate is recorded as absent.

### 4. Report
Relay the setup skill's Step 8 report verbatim (what was installed, what was adopted vs.
decided, what awaits confirmation, and how work starts: `/test-build <batch>`).
