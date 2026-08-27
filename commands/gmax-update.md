---
name: gmax-update
description: >-
  Update a project's installed gmax operating layer to the version shipped in the
  growmax-skills plugin — diffs .gmax-version against the plugin's VERSION, lists the changed
  canonical files, and on ONE human confirm re-copies ONLY the canonical set (agents/, skills/,
  harnesses/, the <!-- gmax --> block of AGENTS.md). NEVER touches the project's
  workflow.config.md, standards/, knowledge base, void/, or any non-gmax file. Use when asked
  to "update gmax", "upgrade gmax", "sync gmax". Invoke with /gmax-update — main session only.
---

# /gmax-update — refresh the installed gmax layer

You are the FRONT DOOR. The rule that makes this safe: gmax canonical files are the plugin's
property; project-filled files are the project's property. The update only ever touches the
first set.

## Steps

### 1. Guards
- **Main session only.** cwd must be a project WITH an existing gmax install — require
  `.gmax-version` and `agents/` at the root. Missing → STOP: "gmax is not installed here;
  run `/gmax-setup` first."

### 2. Resolve the plugin module and compare versions
- `GMAX_ROOT="${CLAUDE_PLUGIN_ROOT}/gmax"` (same fallback search as `/gmax-setup` Step 2).
- Read installed: `cat .gmax-version`. Read shipped: `cat "$GMAX_ROOT/VERSION"`.
- Identical → report "gmax is current (vX.Y.Z)" and STOP. No diff, no questions.

### 3. Show the change set, ask ONE confirm
- `diff -rq agents/ "$GMAX_ROOT/agents/"`, then `diff -rq skills/ "$GMAX_ROOT/skills/"`.
- If the project has the Claude shim tree (`.claude/agents/` with gmax shims), also
  `diff -rq .claude/agents/ "$GMAX_ROOT/harnesses/claude/.claude/agents/"`.
- Present: installed version → shipped version, and the plain list of files that differ.
- Warn explicitly: "Local edits inside agents/, skills/, or the gmax shims will be OVERWRITTEN
  — those files are canonical. Project truth (workflow.config.md, standards/, your knowledge
  base) is untouched."
- Ask the human to confirm. No → STOP, change nothing.

### 4. Re-copy the canonical set ONLY
On confirm:
- `cp -r "$GMAX_ROOT/agents/." agents/`
- `cp -r "$GMAX_ROOT/skills/." skills/`
- If the project has the Claude shim tree:
  `cp -r "$GMAX_ROOT/harnesses/claude/.claude/." .claude/`
- (Do NOT copy the module's `harnesses/` folder itself — setup never installs it; only the
  shim tree for the CLI in use.)
- If the project root `AGENTS.md` carries a `<!-- gmax -->` block AND `$GMAX_ROOT/AGENTS.md`
  differs from the installed block: show the diff and ask before replacing JUST that block
  (never the whole file — content above/outside the marker is the project's).
- `cp "$GMAX_ROOT/VERSION" .gmax-version`

### 5. Never-touch list (hard)
`workflow.config.md`, `standards/`, the knowledge base (path in `workflow.config.md`),
`void/`, `.git/`, and any file outside the gmax canonical set. If a diff shows the project
modified a canonical file, surface it in Step 3 — do not try to merge.

### 6. Report
Old version → new version, files replaced, files deliberately left alone, and one line:
"Review the re-copied personas/skills with `git diff` before committing."
