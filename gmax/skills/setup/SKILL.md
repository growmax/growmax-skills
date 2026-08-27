---
name: setup
description: Use when installing gmax into a project — copies the operating layer non-destructively, detects the project's EXISTING knowledge base and records its pointer, drafts standards/ from the repo, fills the workflow gates. Run once per project, in the main session (it asks the human questions).
---

# Setup — installing gmax into a project

Run once, from the target project's repo root, in the MAIN session (this
skill asks the human questions — never run it as a subagent). GMAX_ROOT
below is the path to the gmax repo being installed FROM.

Binding principle: gmax adds its operating layer and NOTHING else. It
never creates, moves, or overwrites the project's business knowledge
base. Anything that already exists in the project wins.

## Step 0 — Preflight

1. Confirm the cwd is the target project's repo root (look for .git,
   package.json, pyproject.toml, go.mod, etc.).
2. Check for an existing gmax install (`agents/`, `skills/`,
   `workflow.config.md`, `.gmax-version`). If present: STOP and ask the
   human — update in place (the `/gmax-update` command) or fresh install.
   Never silently overwrite.

## Step 1 — Copy the operating layer

```bash
cp -r GMAX_ROOT/agents ./agents
cp -r GMAX_ROOT/skills ./skills          # includes this setup skill
cp -r GMAX_ROOT/standards ./standards    # blanks to be filled (Step 4)
cp    GMAX_ROOT/workflow.config.md ./workflow.config.md
cp    GMAX_ROOT/VERSION ./.gmax-version  # the update command diffs against this
mkdir -p void && cp GMAX_ROOT/void/README.md ./void/README.md
```

Skip any file/dir that already exists in the project unless the human
approved overwriting in Step 0.

## Step 2 — AGENTS.md + harness shims

- No AGENTS.md in the project → copy `GMAX_ROOT/AGENTS.md`.
- One exists → APPEND gmax's AGENTS.md under a `<!-- gmax -->` marker;
  never replace the project's own instructions.
- Install the shim tree for the agent CLI in use:
  - Claude Code: `cp -r GMAX_ROOT/harnesses/claude/.claude ./`
  - OpenCode: `cp -r GMAX_ROOT/harnesses/opencode/.opencode ./`
  - Hermes: nothing — it auto-loads AGENTS.md (see harnesses/hermes.md).

## Step 3 — .gitignore

Ensure `.gitignore` contains `void/` (append if missing). `standards/`,
the knowledge base, and `workflow.config.md` are COMMITTED — never
ignore them.

## Step 4 — Locate the project's knowledge base (THE human question)

Detect candidates: `context/`, `docs/`, `kb/`, `knowledge/`, a docs
section in the README, any INDEX/README that catalogs design docs.

Then ASK the human (main session, one question):

- **A KB exists** → "I found <path> — is this the canonical knowledge
  base agents should read and write?" Confirm or get the right path.
  Also ask: does it have an index file, and what status convention does
  it use (e.g. Pending review → Confirmed, or none)?
- **No KB found** → "Where should business/design truth live — an
  existing docs folder, or should agents build one up task by task?
  (gmax does not impose a structure.)" Record the human's answer
  verbatim.

Write the answers into `workflow.config.md` → Knowledge base:
`Path`, `Index file` (or `none`), `Write policy`. NEVER create the KB
folder or any of its files — that is the project's call, made through
normal task flow.

## Step 5 — Draft standards/ from the repo

Recon the codebase, then draft as `Status: Pending review`:

- `standards/architecture-structure.md` — infer folder responsibilities
  from the real tree, dependency direction from imports, and seed the
  shared-code registry with genuinely shared modules (2+ consumers).
- `standards/architecture-styling.md` — detect the styling system
  (theme/tokens files, eslint/prettier config, naming patterns) and
  write the enforceable rules.

Every inferred rule cites `path:line` evidence. Tell the human exactly
which two files to review; corrections in place; confirmation flips to
`Status: Confirmed`. Thin projects get thin drafts — no speculative
rules.

## Step 6 — Fill workflow.config.md

Detect and fill: project name/platform/language (from manifests), gate
commands (`package.json` scripts → typecheck/lint/test/build; Makefile,
pyproject, go.mod equivalents — empty when none exists; empty gates are
skipped, never faked), commit style (from git log), test file location,
never-touch paths (generated dirs, vendor/, migrations/). Present the
filled file to the human for confirmation.

## Step 7 — Report

Plain-words summary:

1. What was installed (paths).
2. The KB pointer recorded — and the human's verbatim answer if no KB
   existed.
3. What awaits confirmation: standards/ drafts, workflow.config.md.
4. The one rule going forward: business facts go to the project's KB;
   build conventions go to standards/; session machinery stays in
   void/.

## Hard rules

- Non-destructive: existing files are skipped or appended to, never
  overwritten, unless the human explicitly approved it.
- The KB is detected and pointed at — never created, restructured, or
  "fixed" to match a template.
- All human answers that bind future behavior are recorded verbatim:
  in `workflow.config.md` comments if config-shaped, else in the KB
  itself as Confirmed facts.
