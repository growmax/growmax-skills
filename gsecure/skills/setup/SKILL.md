---
name: setup
description: Use when installing gsecure into a project — copies the test-build layer non-destructively, gathers the project's context (stack, existing test tooling, test structure, gates, knowledge base, fix-path personas), adopts what exists, and asks the developer for what is missing. NEVER suggests test tools. Run once per project, in the main session (it asks the human questions).
---

# Setup — installing gsecure into a project

Run once, from the target project's repo root, in the MAIN session (this
skill asks the human questions — never run it as a subagent). GSECURE_ROOT
below is the path to the gsecure module being installed FROM.

Binding principle: gsecure adds its test-build layer and NOTHING else. The
project's existing tooling, structure, docs, and agentic layer always win.
Anything already in the project is adopted, never replaced.

**Stack neutrality (absolute):** this skill ANALYZES the project and gathers
context. It never names, suggests, recommends, or pre-selects a test runner,
framework, assertion library, harness, or mocking approach — projects differ
(web, mobile, backend) and the stack is the developer's call. Where the
project already has test tooling, adopt exactly that. Where it has none, the
developer is asked — and the ask lists what is missing, never a candidate
list.

## Step 0 — Preflight

1. Confirm the cwd is the target project's repo root (look for .git and a
   project manifest — package.json, pyproject.toml, go.mod, Cargo.toml, …).
2. Check for an existing gsecure install (`agents/test-*.md`,
   `skills/unit-testing/`, `void/test/`). If present: STOP and ask the
   human — re-run (idempotent fill only) or abort. Never silently overwrite.
3. Detect the agentic layer already in the project, if any — a gmax module
   install (`workflow.config.md`, root `agents/`+`skills/`+`standards/`), an
   older layer (`.claude/agents/` personas, a root workflow doc), or none.
   Record what is there; the merge rules below apply either way.

## Step 1 — Copy the test-build layer

```bash
cp -r GSECURE_ROOT/agents ./agents          # the 7 test-* role files
cp -r GSECURE_ROOT/skills ./skills          # unit-testing (+ this setup skill)
cp -r GSECURE_ROOT/references ./references  # test-mechanics.template.md
cp -r GSECURE_ROOT/standards ./standards    # test-file-structure.md (fill-in)
mkdir -p void/test && cp GSECURE_ROOT/void/test/README.md \
  GSECURE_ROOT/void/test/unit-test-coverage-plan.template.md ./void/test/
```

If the project already has any of these directories (e.g. from a gmax
install), MERGE into them — gsecure's files carry `test-` prefixes or live in
`unit-testing/`/`void/test/`, so a collision means something is wrong: stop
and ask, never overwrite.

## Step 2 — AGENTS.md + harness shims

- No AGENTS.md in the project → copy `GSECURE_ROOT/AGENTS.md`.
- One exists → APPEND gsecure's AGENTS.md under a `<!-- gsecure -->` marker;
  never replace the project's own instructions (a gmax install does the same
  under `<!-- gmax -->` — both blocks coexist).
- Install the shim tree for the agent CLI in use, MERGE-copy with no-clobber
  (`cp -Rn`) so existing shims are untouched:
  - Claude Code: `cp -Rn GSECURE_ROOT/harnesses/claude/.claude/ ./.claude/`
  - OpenCode: `cp -Rn GSECURE_ROOT/harnesses/opencode/.opencode/ ./.opencode/`
  - Hermes: nothing — it auto-loads AGENTS.md (see harnesses/hermes.md).

## Step 3 — void/ handling

Detect the project's convention: if it already tracks or ignores `void/`
(a .gitignore entry, an existing void/ with committed docs), follow that.
Otherwise ask the human whether `void/test/` working data is committed or
local-only, and add a .gitignore line only if they choose local-only.

## Step 4 — Gather the project's context (read-only recon)

Answer each of these from the repo itself, with evidence (file paths, command
output). Record findings; the docs filled in Step 6 cite them.

1. **Stack context** — from manifests only: language(s), framework, project
   shape (FE-only, BE-only, full-stack). This is CONTEXT, never a
   prescription of test tools.
2. **Existing test tooling** — a test command in the manifest's scripts,
   runner config files, test frameworks in the dependency lists. Found →
   adopt it exactly. None → developer ask.
3. **Existing test structure** — where test files live, naming convention,
   shared helpers, boundary-mock locations. Found → adopt. None → developer
   ask.
4. **Knowledge base of intent** — committed business/architecture/module
   docs, ideally with an index (HOST-DEPENDENCIES §3). Found → record the
   path; the test-designer will read it. None → say so honestly (more
   `characterization`-tagged scenarios is the expected outcome, not a
   failure).
5. **Fix-path personas** — the project's feature-pipeline roles
   (planner / builder / verifier / reviewer or equivalents,
   HOST-DEPENDENCIES §1) and its plans directory. Found → record. Missing →
   record that triage's PRODUCTION-DEFECT verdicts escalate to the human.
6. **Static gates** — the commands that actually exist (typecheck, lint,
   conformance). An absent gate is ABSENT — never write one into the docs
   as if it ran. A gate that does not run has not passed.
7. **Git** — repo present; note the default branch for the integration
   branch (Step 7).

## Step 5 — The developer ask (ONE consolidated message)

Ask the human exactly what recon found missing — nothing more. Cover, as
applicable:

1. Test tooling (only if Step 4.2 found none): which runner / assertion /
   harness / boundary-double approach / time control they want installed.
   Ask openly; offer no candidates.
2. Test structure (only if Step 4.3 found none): where test files, shared
   helpers, and boundary mocks live; naming.
3. Static gates: confirm the gate set recon found; ask about anything
   commonly expected but absent (e.g. no lint command) — the developer
   decides, an empty gate stays empty.
4. Coverage scope: which flows the coverage plan takes first (build order is
   risk-first per the template).
5. Anything contradictory recon surfaced (conflicting structures, two test
   setups) — listed as questions, never silently resolved.

Record every answer VERBATIM — it binds the docs filled next.

## Step 6 — Fill gsecure's context docs for this project

From verified recon + the developer's answers — never from framework docs
recalled from memory:

1. `references/test-mechanics.md` (copied from
   `references/test-mechanics.template.md`): how THIS project's runner,
   harness, doubles, and timers behave — every claim probed in the repo,
   with the probe command/output cited. If tooling is still awaiting the
   developer, leave the file as the template and say so in the report.
2. `standards/test-file-structure.md`: fill every `<...>` to reflect what is
   actually on disk (or the developer's stated structure) — placement, shared
   helpers, mocks, naming.
3. `void/test/unit-test-coverage-plan.md` (copied from
   `void/test/unit-test-coverage-plan.template.md`): §1 flow map from the
   scope answer + the knowledge base; §2 test-stack decisions = the
   developer's verbatim answers; §3 build order, risk-first.
4. Static gates: record the confirmed gate set where the roles can cite it —
   a "Static gates" section in the project's AGENTS.md gsecure block.
5. Present the filled docs to the human for review; corrections in place.

## Step 7 — Prove the stack + git groundwork

1. Wire exactly what Step 4.2 found or the developer named (dependencies,
   test command, config, setup files, helper/mock dirs per Step 6.2).
2. Run ONE trivial smoke test through the project's own test command and
   paste the output. Passing output is the proof; "installed" without a run
   is not. If tooling is deferred, skip and report "awaiting tooling".
3. Create the long-lived integration branch (default name `test`) off the
   project's default branch; if the name is taken, ask. Record the worktree
   location and the dependency-copy mechanism for the phase lifecycle
   (AGENTS.md §6).

## Step 8 — Report

Plain words: what was installed (paths); what was ADOPTED as found vs what
the developer DECIDED (verbatim); what is still awaiting (tooling, doc
confirmations); where the gates are recorded; and how work starts
(`/test-build <batch>` in Claude Code, or per harnesses/README.md).

## Hard rules

- Non-destructive: existing files are skipped, merged, or appended to —
  never overwritten — unless the human explicitly approved it.
- NEVER suggest test tools — not in the ask, not in the docs, not in the
  report. Found tooling is adopted; missing tooling is the developer's word.
- Verified, not recalled: a claim enters the filled docs only with evidence
  from THIS repo (a probe, a path, command output).
- A gate that does not run has not passed — and an absent gate is recorded
  as absent, never faked.
- Developer answers that bind future behavior are recorded verbatim in
  `void/test/unit-test-coverage-plan.md` §2 (or the doc they govern).
- gsecure never installs the feature-pipeline personas, a knowledge base,
  or test infrastructure of its own choosing — those are the project's
  (HOST-DEPENDENCIES.md).
