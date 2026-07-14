# Plan — UX standards across the application: doc + enforcement architecture

**Status:** proposal, awaiting go-ahead. **Author:** Claude session, 2026-07.
**Inputs:** the team's `uiuxguidelines.md` v1 (component-level companion to the app's
`DESIGN.md`), this repo's existing workflow conventions (`/feature-review`, overlay files,
portable agents).

The question asked: *"Should we build three dedicated agents — (1) review/verify, (2) create-UI,
(3) refactor — or is there a better shape for productivity and token usage?"*

**Answer in one line: build ONE reviewer agent, make the standards document itself do the
"create" job, and make "refactor" a two-command workflow (audit → migrate) that reuses that same
reviewer — plus a free grep hook for the mechanical rules.**

---

## Part 1 — what was done to the guidelines doc (already in this branch)

The v1 doc's content was strong (concrete component paths, explicit anti-patterns, a real
checklist). Its *structure* was the problem — it mixed three document types that age at
different speeds, which is why it already contained patches like "Code-alignment note: the
shipped filter-chip is currently rounded-full… until then, prefer this doc."

Industry-standard restructure (how Polaris/Carbon/Primer-class systems and lint rulebooks do it):

| Change | Why |
|---|---|
| **Split normative rules from drift.** Rules → `examples/UI-STANDARDS.md` (stable, versioned). Known offenders, migration tasks, bug fixes (old §11 + inline notes) → `examples/UX-DRIFT-BACKLOG.md` (living queue with statuses). | A standard you must edit every time a bug is fixed rots. The backlog is also exactly the work queue the refactor workflow needs — one file is both the tracker and the machine input. |
| **Stable rule IDs + RFC-2119 severity** (`BTN-3 (MUST)`, `TYP-2 (SHOULD)`). | Rules become citable ("violates ACT-1") in reviews, PRs, commits; MUST→BLOCKER / SHOULD→WARN maps directly onto `/feature-review`'s severity model. |
| **`Detect:` hints on mechanically-checkable rules** (e.g. `rounded-full` on a button, `border-dashed` on a filter, missing `type=`). | Lets a zero-token grep hook and a cheap-model reviewer catch the mechanical 70% without judgment; the expensive model is reserved for judgment calls. |
| **Resolved the internal contradiction** (sort trigger `h-9` vs. "toolbar row heights aligned at `h-8`") — standardized `h-8`, flagged as OPEN-1 for the doc owner to confirm. | A standards doc must not contain two answers to one question; disagreements get a decision + an open-question record, not coexistence. |
| **Added an A11Y baseline section** (aria-labels on icon-only controls, aria-expanded on triggers, focus-visible, label association, no color-only state). | v1 had these implicitly in snippets; every industry guideline makes them binding rules. Nothing invented beyond what the snippets already practiced. |
| **Added §16 Open questions & gaps** (spacing scale, dialogs/toasts, validation display, formatting, breakpoints — to be *extracted from DESIGN.md*, not invented). | Marks the doc's edge honestly instead of implying completeness. |
| **Kept every code example and the composition-contract table verbatim in spirit.** | The region→component table is the doc's crown jewel — it's what makes "compose, never fork" enforceable. |

**Where the files live:** the product repo, as `.claude/UI-STANDARDS.md` and
`docs/ux-drift-backlog.md` (this repo ships them in `examples/`, same pattern as
`REVIEW-NOTES.template.md`). The agents in this plugin stay portable and read the per-repo file —
standards change without touching agents, and other Growmax apps can adopt the same machinery
with their own standards file.

**Two-layer split (portability):** folder structures are app-specific — Next.js (app or pages
router) and React+Vite apps do not share layouts, so a standard hardcoding `src/components/list/`
is only valid for one app. The doc is therefore split:

- `examples/UI-STANDARDS.template.md` — **Part A universal rules** (framework-agnostic, apply to
  every element whether cataloged or not) + **Part B per-app catalog** (placeholder tables) + a
  **Bootstrap procedure** Claude runs inside each app repo to *discover* Part B (detect
  framework, locate primitives/composition/token layers, enumerate shared components, extract
  the icon map and tunables, reconcile contradictions into open questions).
- `examples/UI-STANDARDS.md` — the **filled instance for the ink-on-paper admin app** (the app
  the v1 guidelines came from), kept as the worked example; its header forbids copying its paths
  into other repos.

**Open-ended elements (the catalog is a floor, not a ceiling):** a catalog can never list every
element an app will need, so rule **CMP-5** defines the off-catalog protocol: primitives first →
grep for prior art (≥2 hand-rolled copies = extract to shared, never add a third) → build new
elements in the shared location obeying all Part A rules → **register the new catalog row in the
same PR** (part of the definition of done). Unlisted elements are explicitly *never exempt* from
the universal rules — this is what prevents "not in the doc" from becoming an escape hatch.

---

## Part 2 — why not three agents (the reasoning)

The mental model that matters: **a subagent is a fresh, empty context.** It pays to spawn one
when the work is (a) parallelizable, (b) verification-shaped (you want the conclusion, not the
exploration), or (c) too big for the main context. It *costs* when the main session already has
the context the agent would have to rebuild.

**1) Review/verify agent — YES, correct shape.** Review is verification-shaped and diff-scoped:
read the standards once, read the diff, report violations. It also slots straight into the
existing `/feature-review` fan-out as a 5th dimension. Most checks are mechanical
(`Detect:`-hint driven), so it runs on a cheap model (haiku) — same reasoning as the existing
`approval-gap-structural` (haiku) vs `approval-gap-category` (sonnet) split.

**2) Create-UI agent — NO, wrong shape.** When someone builds UI they are *already in* a Claude
session that holds the requirements, the conversation, the surrounding code. A "creation agent"
means: main session summarizes requirements → hands off → agent re-reads the repo from zero →
builds → returns → main session re-reads the result. That's the same repo exploration paid
twice, plus context loss at both handoffs — strictly worse output for strictly more tokens.
What actually makes creation compliant is the standards being **in the builder's context at
write time**: a ~10-line pointer in the app repo's `CLAUDE.md` ("building/changing UI? Read
`.claude/UI-STANDARDS.md` first; start from the CMP-2 catalog; self-check against §15"). Cost:
~4k tokens read once per session that touches UI, ~0 when not. The doc was restructured
specifically to be consumed this way.

**3) Refactor agent — PARTIALLY, as a workflow not a standing agent.** Refactoring drift is
three roles: *find* violations (that's the reviewer, pointed at a module instead of a diff),
*fix* them (mechanical migrations onto shared components), *verify* (the reviewer again). Two of
the three roles are the same reviewer reused. What's missing is orchestration + state — which in
this repo's house style is a **command + a ledger file**, exactly like `/e2e-map` (census →
one human approval) + `/e2e-batch` (work the approved map autonomously, resumable). The backlog
file created in Part 1 is that ledger.

**Plus the free tier nobody asked for: a grep hook.** This repo already ships a `PostToolUse`
hook (`check-e2e-spec.sh`). The same mechanism can check every `Write`/`Edit` of `*.tsx` against
the mechanical `Detect:` patterns (`rounded-full` on a button, `border-dashed` filter,
`hover:shadow`, missing `type=`…) and warn instantly. Zero tokens, fires at the moment of
creation — catches the drift before it's committed, which is cheaper than any agent. Gated to
repos that contain `.claude/UI-STANDARDS.md` so it stays silent everywhere else.

### Token & productivity comparison

| Concern | 3-agents proposal | Recommended shape |
|---|---|---|
| Build-time compliance | Creation agent: full context duplication per UI task (tens of k tokens), loses conversation context | CLAUDE.md pointer + doc in-context: ~4k once per UI session; hook: 0 tokens |
| PR-time verification | Standalone reviewer, separate run | Same reviewer, but fanned out in parallel inside the existing `/feature-review` (haiku for mechanical rules) — one workflow, one scorecard |
| Drift paydown | Open-ended "refactor agent" with no state — re-discovers the same drift every run | Audit once → human approves priorities once → migrate works the ledger, resumable, each fix re-verified by the same reviewer |
| Maintenance | 3 prompts to keep in sync with the standards | 1 agent + 1 doc; standards changes never touch agent prompts (they read the repo's file) |

---

## Part 3 — the build plan (on go-ahead)

### Phase A — standards into the app repo (30 min, mostly done)
1. ✅ `examples/UI-STANDARDS.template.md` (this branch) — the portable standard: universal rules
   + placeholder catalog + the Bootstrap procedure that fills it from any repo.
2. ✅ `examples/UI-STANDARDS.md` (this branch) — the filled instance for the ink-on-paper app,
   incl. CMP-5 (off-catalog protocol).
3. ✅ `examples/UX-DRIFT-BACKLOG.md` (this branch) — seeded with all 19 known items from v1 §11.
4. Ink-on-paper app: copy the filled instance + backlog into that repo
   (`.claude/UI-STANDARDS.md`, `docs/ux-drift-backlog.md`); add the ~10-line "building UI?"
   pointer to its `CLAUDE.md`. **Any other app:** copy the *template* and run its Bootstrap in
   that repo instead.
5. Owner resolves OPEN-1/OPEN-2 (toolbar height, primitive heights) — two small decisions.

### Phase B — the reviewer agent (the one new agent)
5. `agents/ui-standards-reviewer.md` — portable; reads `.claude/UI-STANDARDS.md` from the target
   repo (if absent: reports "no standards file" and stops). Diff-scoped by default, module-scoped
   when the orchestrator says so. Reports `{ruleId, severity from MUST/SHOULD, file:line,
   evidence, suggested fix (the catalog component to use), basis}` — same confidence discipline
   as the other reviewers. Skips anything already in the backlog or under *Accepted exceptions*
   (the known-debt pattern from `/feature-review`). Model: haiku (mechanical Detect-hint checks);
   judgment-y composition calls it marks `basis: judgment` for the orchestrator to verify.
6. Wire into `/feature-review`: 5th row in the dispatch table (runs when `web`/`mobile` files
   changed), `--only uxs` option, scorecard row "UI standards". Note the split with the existing
   `ux-flow-reviewer`: **flow** = can the user finish the job (contextual creation, dead ends);
   **standards** = is it built from the right parts with the right tokens. `ux-flow-reviewer`'s
   "match the neighbour" check (#6) hands its component/token drift work to the new dimension —
   trim it there to avoid double-flagging.

### Phase C — the refactor workflow (two commands, reusing the agent)
7. `commands/ux-audit.md` — census one module (or the app) against the standards: fan out
   `ui-standards-reviewer` per module in parallel, verify findings (the `/feature-review`
   blocker-verification discipline), **append verified rows to `docs/ux-drift-backlog.md`**,
   present the delta for human priority-blessing. Mirrors `/e2e-map`. Two extra duties:
   **bootstrap mode** (no `.claude/UI-STANDARDS.md` in the repo → run the template's Bootstrap
   and produce the filled instance for owner review) and **catalog growth** (detect the same
   element hand-rolled on ≥2 screens → propose an extract-and-register backlog item per CMP-5,
   so the catalog converges on what the app actually needs instead of staying frozen at its
   seed list).
8. `commands/ux-migrate.md` — work the approved backlog top-down: per item, fix (main session
   edits, smallest diff that lands on the shared component) → re-run `ui-standards-reviewer` on
   the touched files → flip status to `done (commit)` → commit per item or small batch.
   Resumable from the ledger; app bugs discovered mid-migration get quarantined to the backlog,
   never papered over. Mirrors `/e2e-batch`.

### Phase D — the free tier
9. `hooks/check-ui-standards.sh` + `hooks/hooks.json` entry — `PostToolUse` on Write/Edit of
   `*.tsx`/`*.jsx`; greps the mechanical Detect patterns; warns with the rule ID; exits silently
   unless the repo has `.claude/UI-STANDARDS.md`. Include a `--selftest` (team norm).
10. README catalog rows + plugin-version bump; ship-note in the commit.

### Effort & sequencing
- Phases A+B are the value core (~1 short session). C is a second session. D is ~an hour.
- Nothing blocks on anything external except the two OPEN decisions (Phase A step 4), and even
  those only block backlog items D-008/D-018, not the agent work.

### What deliberately does NOT get built
- No "create-UI" subagent (reasoning in Part 2 — worse output, double tokens).
- No standalone always-on lint infrastructure (ESLint plugin etc.) — the grep hook + reviewer
  cover it; a real lint plugin is a later optimization if the hook's warnings prove noisy.
- No second standards doc per surface until a second surface (mobile) actually adopts this.
