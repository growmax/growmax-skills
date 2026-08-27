---
name: code-review
description: Use for the senior review of a completed change — red flags first, then architecture conformance, duplication, and complexity, with hard token budgets and the drift-pattern grep. The reviewer's operating procedure.
---

# Code review — the senior pass

Review like a strong staff engineer reviewing a PR. Axes, in priority
order: **red flags → architecture conformance → duplication →
complexity**. The most important question is design: does this belong
here, and is it more complex than it needs to be?

## Budget — HARD limits, not targets

- Mechanical greps first, deep reads after. Greps are nearly free; file
  reads are not.
- Cap ~10 purpose-searches for duplication (Step 3). Hit it → report
  what was checked and stop. Never sweep the whole repo.
- Never review generated files (lockfiles, build output, vendored code).
- Large diff → review phase by phase, in plan order, and state which
  phases you covered. Partial + honest beats total + thin.
- Stay on the axes. Something outside them → one NOTE line, not a new
  investigation.

## Step 0 — Scope: the plan, then the diff

Read `void/plan/<slug>.md` and the approved design FIRST — the plan is
the review scope; code outside it is flagged, not silently accepted. The
design's acceptance criteria and regression surface are your baseline.

Then the diff (e.g. `git diff` of the task's commits). **Read full
changed files, not just the diff** — duplication and layering cannot be
judged from a diff alone.

## Step 1 — Mechanical red-flag scan (grep, cheap, run first)

Every hit gets judged, not auto-failed:

- **Secrets** — keys, tokens, credentials in the diff. BLOCK on sight.
- **Type-safety escapes** — assertions/casts/`any`-equivalents without a
  why-comment, especially on external (server/API/user/file) data:
  types don't exist at runtime; the boundary layer validates.
- **Silent fallbacks** — a fallback that INVENTS a value to paper over
  data that should have been there. The screen/response then shows
  something plausible and wrong instead of an error:

  ```
  price ?? 0            // wrong — invents a price; absent ≠ zero
  catch { return [] }   // wrong — a failure looks like an empty result
  data?.items?.[0]?.x ?? '—'   // wrong — hides that the shape changed
  ```

  Missing external data is an error state, not a zero. A default is
  legitimate only when it's a real configured default — from config,
  never a literal at the call site.
- **Zero is a real value** — truthiness guards (`||`, `&&` render guard)
  on money, quantity, rate, fee, discount, count fields are bugs:
  a real 0 and a missing value must not look identical.
- **Hardcoding** — literals that belong in config/theme/constants:
  URLs, timeouts, limits, locale/market/currency values, environment
  ids, magic numbers with no named constant. Test: if it differs per
  environment, market, or configuration, it cannot be a literal.
- **Drift patterns** — grep every Confirmed pattern in
  `standards/drift.md` (if it exists). This project's own history,
  checked mechanically.
- Run the project's Conformance command if `workflow.config.md` defines
  one. Empty → skip, and say you skipped.

## Step 2 — Architecture conformance

Check the changed files against `standards/architecture-structure.md`
(placement, dependency direction) and the design's boundaries:

- Each file is in the layer the placement rules say, importing only in
  allowed directions.
- No business logic in presentation layers; no transport details leaking
  into logic layers; boundary mapping happens at the boundary.
- The design's Decisions & Boundaries hold in the code. Deviations are
  either justified in the builder's report or findings.
- **Regression surface** — for every consumer the design's shared-code
  analysis named: read the call site, confirm the invariant holds. And
  check SIBLING call paths for the same class of bug the task fixed —
  fix the class, not the site. Any consumer the diff affects that the
  design did NOT list → the blast radius was wrong; that is a finding.

## Step 3 — Duplication

Did this code reinvent something that already exists? Search the codebase
for the PURPOSE of each new function (formatters, mappers, validators,
wrappers) — an agent without full context will happily write a second
one. Judgment rules:

- Report a clone only if a bug fix would need applying in both places.
  Similar-looking code in unrelated features is not duplication.
- Flag premature extraction too: a shared abstraction with one caller.
- Reuse rule: one consumer → local; two+ → shared; everywhere → generic.

## Step 4 — Complexity & over-engineering

- Functions you can't read in one pass (≳40 lines, nesting > 3) — flag
  with the smallest simplification, not a rewrite.
- Generics/config/options serving a single call site; new layers or
  patterns without measurable benefit; abstractions for problems that
  haven't arrived. Solve today's problem.
- Dead code: unused exports, commented-out blocks, unreachable branches.
- Naming/comments only when actively misleading. Nit-tier; never blocks.

## Step 5 — Report

```markdown
## Review — <slug> (<N files>)
**Verdict:** APPROVE / FIX FIRST / BLOCK

### Must fix
- `path:line` — <what's wrong> → <smallest fix>

### Worth fixing
- ...

### Nits
- ...

### Checked and clean
- <what passed, so the human knows the check actually ran>
```

Verdict mapping:

- **BLOCK** — secrets; broken data integrity; an invented layer/pattern;
  a violated design invariant; regression-surface consumer broken.
- **FIX FIRST** — must-fix findings that don't endanger data or
  architecture: hardcoded literals, missing edge states, missing retry/
  recovery, an unlisted consumer affected.
- **APPROVE** — only worth-fixing or nits remain.

## Rules

- Every finding needs `path:line`. No location, no finding.
- Don't edit code. Report only.
- Skip formatting and personal style — that's the linter's job.
- If a check came back clean, say so. Silence looks like a skipped check.
- Nothing to report is a valid outcome. Don't pad the list.
- New CLASS of bug found (not an instance)? Flag it for the drift loop:
  "drift candidate: <pattern>" in the report — close-out will ask the
  human whether to add it to drift.md.
