# gmax

A portable agent operating layer for disciplined, context-first software
development. Drop it into any project, any stack, any agent CLI — and every
bug fix, feature, or flow follows the same spine:

```
understand (business context) → design (tech architecture)
→ plan (waves + phases) → build → senior review
```

gmax is stack-agnostic and harness-agnostic. The personas and skills are
plain markdown; your project's facts live in files YOU own, never inside
the personas.

## What you get

- `agents/` — 6 personas: orchestrator, context-architect, architect,
  planner, builder, reviewer.
- `skills/` — 7 procedures: `workflow` (the pipeline), `business-context`
  (evidence-first interviewing), `codebase-analysis` (task-scoped recon +
  root-cause chain), `architecture-design` (the five lenses + shared-
  architecture protocol), `planning` (phase DAG rules), `code-review`
  (senior-review axes + budgets), `context-writing` (knowledge-base rules).
- `skills/setup/` — the installer: run it once inside your project and it
  wires everything up non-destructively (see Install below).
- `workflow.config.md` — the one file you fill in: your project's
  typecheck/lint/test commands, conventions, and the pointer to your
  existing knowledge base.
- `standards/` — the build rulebooks: `architecture-structure.md`
  (placement rules, dependency direction, decision aids, shared-code
  registry) and `architecture-styling.md` (styling source of truth,
  hard rules, UI construction patterns, forbidden patterns) —
  prescriptive rules for writing new code, drafted FROM the repo at
  setup. Engineering conventions only — **committed to git**, reviewed
  like code.
- `void/` — session machinery only: STATE resume files, gate docs, plans.
  **Local only, never committed.**
- `harnesses/` — thin shims so the same personas run in Claude Code,
  OpenCode, or Hermes.

gmax does NOT ship or impose a business knowledge base. Your project
already has one (or grows one task by task) — gmax points at it via
`workflow.config.md` and follows its structure.

## Install

Inside your project, ask your agent to run the gmax **setup skill**
(`skills/setup/SKILL.md`). It will:

1. Copy the operating layer in (agents/, skills/, standards/,
   workflow.config.md, void/README) and install the shim tree for your
   agent CLI (Claude Code / OpenCode / Hermes).
2. Add `void/` to your `.gitignore` (standards/ and your knowledge base
   stay committed).
3. DETECT your existing knowledge base (e.g. `context/`, `docs/`) and ask
   you to confirm which is canonical — it records the path in
   `workflow.config.md` and never creates or overwrites it.
4. Draft `standards/` from your repo and fill in your
   typecheck/lint/test commands — you confirm both.

## Day one: what happens

The flow adapts to how much context your project already has:

- **Context-rich project** — agents read your existing knowledge base
  first and skip re-gathering; the context stage shrinks to filling gaps.
- **Context-thin or empty project** — each task builds the knowledge it
  needs and leaves it behind, confirmed by you, in your knowledge base.

Either way the rule is the same: knowledge base first (path in
`workflow.config.md`), gaps only.

- **You report a bug.** The agent analyzes the code the bug touches
  (flow, shared code, who calls it), writes `void/<task>/analysis.md`,
  and shows it to you. You confirm or correct. Only then does the
  architect design the fix — with a mandatory "shared-code impact"
  section listing every consumer of anything it changes, so fixing one
  bug doesn't create another.
- **You ask for a feature.** The agent interviews you for the business
  context (what it should do, who may do it, the rules), writes it as a
  markdown design, and you approve it. Then architecture, then a
  wave/phase plan, then building.
- **New knowledge is written directly** into your knowledge base marked
  `Pending review` (or your own status convention) — you review it, it
  flips to `Confirmed`, and only then is it committed. One write, no
  draft copies. Facts YOU state are written as Confirmed immediately —
  you're the authority.

Small tasks skip the ceremony: a trivial fix goes straight to the builder;
a small one gets a lightweight plan and a single review.

## The working agreement

- All artifacts are markdown with `Status:` headers. No HTML, no binary.
- Plans carry `depends:` / `shared:` per phase; independent phases with
  disjoint files build in parallel (max 3), with one whole-tree check
  after each parallel wave.
- The builder runs YOUR checks (from `workflow.config.md`) before it
  reports done. The reviewer does one senior pass: does the code match
  the plan and the context, and are the shared-code consumers safe?
- The agent commits code and Confirmed knowledge-base / `standards/`
  docs — never anything under `void/`.

See `AGENTS.md` for the full operating contract.
