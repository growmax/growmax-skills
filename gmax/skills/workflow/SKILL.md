---
name: workflow
description: Use when driving any development task through the gmax pipeline — classification, the bug-fix and feature flows, wave/phase scheduling, gates, and the void/ file lifecycle.
---

# Workflow — the gmax pipeline procedure

The operating procedure the orchestrator follows for every task. The
personas define WHO acts; this skill defines HOW work flows.

## 0. Read first — and adapt to the project's context level

1. `workflow.config.md` — the project's gates and conventions. If a gate
   command is empty, that gate is skipped (never faked).
2. The project's knowledge base — path and index file in
   `workflow.config.md` → Knowledge base. The flow ADAPTS to what it
   finds, without changing shape:
   - **Context-rich** (area covered by confirmed docs): consume the
     knowledge base; the context stage shrinks to verifying nothing
     changed — never re-interview what is already confirmed.
   - **Context-thin / empty** (base being built): each task fills its
     gaps as direct Pending-review writes, human-reviewed in place.
   Either way: knowledge base first, gaps only. Missing facts never
   block — they route the task through analysis (see §2).
3. The knowledge base and `standards/` are COMMITTED (team-shared).
   `void/` is local session machinery — nothing under it is ever
   committed.

## 1. Classify

Size × shape:

| Tier | Shape | Path |
|---|---|---|
| trivial | one-liner, obvious | builder direct → self-check → commit → done |
| small | ≤3 files, one concern | plan-lite → human OK → builder → one review → commit |
| standard | one feature/bug, multi-file | full pipeline, one plan file |
| epic | multiple concerns | full pipeline, split into multiple plan files at planning time |

Also classify the KIND: bug fix vs new feature/flow — they enter the
pipeline differently (§2). Refactors and chore work follow the bug-fix
path (analysis first).

When in doubt, go one tier up — under-ceremony causes regressions;
over-ceremony only costs a few minutes.

## 2. Entry paths

### Bug fix (standard/epic)

1. Create the task folder `void/<slug>/` + STATE.md.
2. Run the `codebase-analysis` skill for the bug's scope → write
   `void/<slug>/analysis.md`. Durable findings (shared-code registry
   entries) are written in the SAME pass directly into
   `standards/architecture-structure.md` as `Pending review`.
3. HUMAN GATE: present the analysis in plain words — what the code does
   today, where the bug lives, what shares that code — plus the pending
   registry entries. The human confirms or corrects in place; flip
   statuses to Confirmed.
4. Architect designs the fix → `void/<slug>/architecture-design.md`
   (blast-radius mandatory) + durable tech facts direct into
   `standards/` and/or the project KB as Pending review → HUMAN GATE →
   design `Approved`, entries `Confirmed`.
5. Continue at §3 (planning).

### New feature / flow (standard/epic)

1. Check the project knowledge base for existing confirmed business
   context. For gaps, the context-architect interviews the human (+ code
   recon where code exists).
2. Business facts are written DIRECTLY into the project KB (placement
   per the context-writing skill), each marked `Status: Pending review`
   — one write, no draft copy.
3. HUMAN BUSINESS REVIEW over those exact files: "does this represent
   what the business should do?" Corrections in place → flip to
   `Confirmed`.
4. Architect → `void/<slug>/architecture-design.md` + durable tech facts
   direct into `standards/` and/or the project KB as Pending review →
   HUMAN GATE → `Approved` / `Confirmed`.
5. Continue at §3.

## 3. Planning

The planner translates the approved design into `void/plan/<slug>.md`
following `skills/planning/SKILL.md` — mandatory reading, the plan
format (source line, Failure & edge states section, inherited
Verification section), the phase DAG rules (one phase = one concern,
≤5 files; `depends:` as contracts; `shared:` certifying parallel-safety
at plan time; `done when:` checkable; ≤3 files → plan-lite), and the
proven-reuse placement rule. It never redesigns — conflicts go back to
the architect.

HUMAN GATE: plan approval. Then build.

## 4. The wave loop

The phase list is a DAG — consume it in waves:

1. ready = unchecked phases whose `depends:` are all `[x]`.
2. From ready, the parallel-safe set = phases with mutually disjoint
   `files:` AND no overlapping `shared:` entries. Dispatch them as ONE
   batch, max 3 concurrent. A single-phase ready set degrades to
   sequential — fine.
3. Each builder gets: the plan path + its phase number, the exact file
   list (hard write boundary), `done when:`, and an effort budget
   (max 3 fix loops before escalating back with evidence).
4. The builder self-checks: runs every non-empty gate from
   `workflow.config.md`, fixes failures, then reports.
5. After a wave of 2+ completes, the orchestrator runs the integration
   gate once: all non-empty static gates on the whole tree.
6. A failed phase blocks only its dependents — never unrelated phases.
7. Orchestrator marks `[x]` and commits the phase's code files.

## 5. Review

Once all phases are `[x]`, the reviewer does ONE senior pass:
- Does the code match the plan and the confirmed context?
- Regression checklist: for every shared file/symbol the change touched,
  the consumers listed in the design's blast-radius section are checked —
  fix the class of bug, not just the site.
- Verdict: APPROVE / FIX FIRST (fix list) / BLOCK (design problem → back
  to architect).

FIX FIRST → builder → re-review. Max 3 loops, then escalate to the human.

## 6. Close-out

1. Finalize the plan (`void/plan/<slug>.md`, all phases `[x]`).
2. If the build surfaced durable facts not yet in the knowledge base, ask
   the human ONCE; write them directly into the project KB as
   `Pending review` (context-writing skill) — never a separate draft.
3. **Drift loop:** if the reviewer flagged drift candidates (a CLASS of
   bug, not an instance), ask the human once per candidate: "add this to
   drift.md?" Approved → write to `standards/drift.md`
   as Pending review, with a grep-able signature where possible. From
   then on the planner, builder, and reviewer all check it.
4. Mark STATE.md `Stage: done`.
5. Remind the human: `void/<slug>/` may now be deleted.

## 7. Session continuity & token budget

Every task folder carries `STATE.md` — the agent-only resume file. The
orchestrator owns it and updates it ONLY at stage transitions and phase
completions (a few lines each time, never a rewrite of history):

```markdown
# STATE — <slug>
Task: <one line>            Kind: bug | feature
Stage: analysis | context-review | architecture | arch-gate | planning
     | plan-gate | building(P<N>) | integration-gate | review | done
Docs: analysis.md=<-|Draft|Confirmed> design.md=<-|Draft|Approved>
      plan=void/plan/<slug>.md
Context written: <KB / standards files touched this task>=Pending|Confirmed
Phases: [x] P1  [x] P2  [ ] P3 (dispatched)  [ ] P4
Human caveats (verbatim): <few lines, only binding ones>
Next action: <exactly what a fresh session does first>
```

Resume in a new session: read STATE.md, jump to `Stage`, read ONLY the
artifact that stage consumes. Completed stages are never re-read, their
gates never re-asked.

Write-less rules (binding on every agent that touches `void/`):

- Budgets from `void/README.md` are hard limits: STATE ≤30 lines,
  analysis ≤60, architecture-design ≤120. Knowledge-base docs are
  written direct with Pending review — never draft copies.
- Cite `path:line`; never paste code into docs.
- Never duplicate content between files — link by path instead.
- Subagent summaries stay in chat; only confirmed facts reach `void/`.
- Overflow past a budget = the task should be split, not the doc grown.

## Hard rules

- NEVER commit anything under `void/`. Commits stage code files only,
  never `git add -A`.
- Human gates are answered by the human. A subagent that reaches a gate
  stops and returns what needs approving.
- Workers return short summaries (~1–2k tokens): findings and evidence,
  never file dumps or conversation history.
- Dispatch briefs are contracts: objective, exact file list, `done
  when:`, effort budget. Reconcile the brief with the persona's standing
  outputs BEFORE dispatching — a contradiction forces the worker to break
  one instruction silently.
- Read-only agents may always parallelize freely; writers need the
  disjointness rule.
