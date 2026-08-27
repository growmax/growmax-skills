# gmax — the agentic development workflow

gmax is a portable **agent operating layer**: a set of personas, procedures, and conventions
that drop into any project so every bug fix, feature, or flow follows the same spine:

```
understand (business context) → design (tech architecture)
→ plan (waves + phases) → build → senior review
```

It ships inside this plugin as the self-contained module `gmax/` and installs into a project
with one command: **`/gmax-setup`** (run inside that project's repo). It is **opt-in per
project** — teams adopt it when they want it; nothing changes for projects that don't.

## What gets installed

Into the project repo (non-destructively — existing files are skipped or appended to, never
overwritten):

- `agents/` — 6 personas: orchestrator, context-architect, architect, planner, builder,
  reviewer. Plain markdown; the single source of truth for behavior.
- `skills/` — 7 procedures (workflow, business-context, codebase-analysis,
  architecture-design, planning, code-review, context-writing) + the setup skill.
- `standards/` — the project's build conventions (architecture-structure, architecture-
  styling), drafted FROM the repo during setup and confirmed by you. Committed, reviewed
  like code.
- `workflow.config.md` — the one file you fill in: typecheck/lint/test commands, conventions,
  and the pointer to your existing knowledge base.
- `void/` — session machinery (plans, STATE files, gate docs). Local only, gitignored, never
  committed.
- `.claude/agents/` — thin shims so Claude Code discovers the personas (each shim just points
  at `agents/<name>.md`). OpenCode shims ship too (`harnesses/opencode/`); Hermes needs none —
  it auto-loads `AGENTS.md`.
- `.gmax-version` — the installed gmax version, used by `/gmax-update`.

Setup also: appends gmax's operating contract to the project's `AGENTS.md` under a
`<!-- gmax -->` marker (never replaces your own instructions), adds `void/` to `.gitignore`,
DETECTS your existing knowledge base (e.g. `context/`, `docs/`, `docs/product/`) and records
it in `workflow.config.md` — it never creates or restructures your KB.

## Day one

- **You report a bug** → the agent analyzes the code the bug touches, writes
  `void/<task>/analysis.md`, and shows it to you. You confirm or correct. Only then does the
  architect design the fix — with a mandatory shared-code impact section so fixing one bug
  doesn't create another.
- **You ask for a feature** → the agent interviews you for the business context, writes the
  facts directly into your knowledge base as `Pending review`; you confirm in place. Then
  architecture, then a wave/phase plan, then building.
- **Small tasks skip ceremony**: trivial → straight to the builder; small → lightweight plan +
  one review.

The three human gates are never skipped and never self-approved: (1) analysis/context review,
(2) architecture approval, (3) plan approval.

## How gmax relates to the other workflows in this plugin

gmax is the **operating layer above** the specialized workflows — it decides *when* work is
understood, designed, planned, and reviewed; the existing commands remain tools inside it:

| Existing workflow | Relationship |
|---|---|
| `/learn-app` (product notebook) | Where it runs, `docs/product/` IS a knowledge base — point gmax's `workflow.config.md` → Knowledge base at it. gmax reads/writes facts there. |
| `/bugfix`, `/confirm-bug`, `/fix-bug`, `/validate-fix` | The rigorous repro-grader pipeline. A gmax builder/reviewer may invoke these for bugs that warrant a frozen RED grader; gmax's own analysis/architecture stages cover the rest. |
| `/feature-review` | Complements gmax's reviewer persona — run it on a feature branch before the PR, as today. |
| `/e2e-*`, `/ux-*` | Unchanged — invoked from within gmax build/review stages when the task calls for them. |

If a project does NOT adopt gmax, all of these keep working exactly as before.

## Updating

```
/plugin marketplace update growmax     # get the latest plugin
/gmax-update                           # inside each gmax-enabled project
```

`/gmax-update` diffs `.gmax-version` against the plugin's `gmax/VERSION`, shows what changed,
and — on your confirm — re-copies ONLY the canonical files (`agents/`, `skills/`,
`harnesses/`). Your `workflow.config.md`, `standards/`, knowledge base, and `void/` are never
touched.

## Not on Claude Code?

The module is harness-agnostic markdown. Hermes and OpenCode users can install manually:

```bash
git clone https://github.com/growmax/growmax-skills.git
# then, inside your project, ask your agent to run the setup skill with
# GMAX_ROOT=<clone>/gmax — it copies the layer and the right shim tree
# (OpenCode: harnesses/opencode/.opencode; Hermes: no shims, auto-loads AGENTS.md).
```

## Regression coverage

`regression/gmax-setup/` ships a fixture project + three scripted cases (fresh install,
existing-install guard, update) that mechanically verify the install/update contracts —
including that pre-existing `AGENTS.md`, knowledge bases, `workflow.config.md`, and
`standards/` survive byte-identical. Run them after ANY edit to `gmax/` or the two commands.
