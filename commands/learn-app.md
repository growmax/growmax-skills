---
name: learn-app
description: >-
  Build and maintain a repo's PRODUCT NOTEBOOK — docs/product/ — the durable, git-versioned knowledge
  base the product-manager agent answers from. One command, two modes decided automatically:
  no docs/product/INDEX.md → BOOTSTRAP (static census of every route/API → optional write-safe live
  walk → merge existing docs → write OKF-style module notes with per-claim provenance); INDEX exists →
  UPDATE (fold the human's answers from docs/product/open-questions.md into the notes, then re-census
  and diff against each note's verified_at_commit to catch drift). Fully ASYNC: never blocks on the
  human — every ambiguity becomes a ledger question with the agent's best-guess assumption. Use when
  asked to "learn this app", "build/update the product notebook", "teach the PM agent this repo".
  Invoke with /learn-app [web-url-or-port] [scope] — both optional; without a URL it runs code-only.
---

# /learn-app — build & maintain the product notebook (docs/product/)

You are the **orchestrator** in the main session. `/learn-app` gives a repo a **product notebook**:
a folder of plain markdown notes (`docs/product/`) that records how the product actually works —
module by module, every claim tagged with where it came from — plus a **question ledger** where the
agent asks the human what only a human can know. The `product-manager` agent answers questions and
writes specs FROM this notebook; this command is how the notebook gets built and stays current.

You do NOT read whole codebases, walk browsers, or write the notes yourself. You **dispatch
subagents** (`flow-census`, `nav-cartographer`, `product-scribe`), own the **state on disk**, and
keep your own context thin. Subagents can't spawn subagents — every delegation happens here.

> **Where it sits.** `/app-cartograph` maps navigation + flows for testing context. `/learn-app`
> goes one level up: it produces the *product truth* layer (correct behavior, business rules, open
> intent questions) that outlives any single walk — and it REUSES cartograph's artifacts when they
> exist rather than redoing their work.

**Inputs:** `$ARGUMENTS` =
- **target** — optional web URL or `localhost:port`. Given (and reachable) → the bootstrap includes a
  live walk. Omitted/unreachable → **code-only bootstrap**: still fully valid, notes are just tagged
  `[code]` with `status: draft` until a walk or the human upgrades them.
- **scope** — optional focus brief (e.g. `scope: "checkout, quotes"`). Filters the census frontier
  and lenses the walk, exactly as in `/app-cartograph`.

**Repo overlay:** read `.claude/E2E-NOTES.md` in the target repo FIRST if it exists (base URL, roles,
login, DB-safety, driver gotchas) and pass its facts downstream.

## The two rules this command is built on
1. **Completeness comes from the code.** The static census is the denominator — every route/operation
   it finds must end up in some module note, or be explicitly parked with a reason. "I documented what
   I happened to see" is failure.
2. **Async always.** This command NEVER blocks on the human. Anything ambiguous — intent, policy,
   why-does-this-exist — becomes a ledger entry in `docs/product/open-questions.md` with the agent's
   best-guess assumption and a confidence. The human answers in the file whenever; the next
   `/learn-app` run folds the answers in. (This is the deliberate inverse of `/app-cartograph`'s
   GATE A/B interactive annotation.)

## Mode detection (first action, always)
```
docs/product/INDEX.md exists?  → UPDATE mode
                       absent? → BOOTSTRAP mode
```
Say which mode you're in and why before doing anything else.

## The notebook (what BOOTSTRAP produces, what UPDATE maintains)
```
docs/product/
  INDEX.md            # ≤200 lines. Table of contents: module list + one-line truths + pointers.
  open-questions.md   # the ledger (template: examples/open-questions.template.md)
  glossary.md         # domain terms, one definition each
  suggestions.md      # ranked gaps/inconsistencies noticed — feeds future work
  modules/<slug>.md   # one OKF-style note per module (template: examples/product-note.template.md)
```
Format contract (enforced by `product-scribe`, spot-check it yourself):
- Every module note carries YAML frontmatter: `type, title, description, status
  (draft|interviewed|stable), verified_at_commit, sources, open_questions`.
- **Every factual claim is provenance-tagged:** `[code]`, `[walk]`, `[docs]`, `[human: Q-nnn ✓]`, or
  `[ASSUMPTION, conf: low|med|high]`. An untagged claim is a bug. An ASSUMPTION stated as fact is
  the disqualifying bug.
- Notes cross-link with normal markdown links (`[Payments](payments.md)`) — that's the knowledge
  graph, no database.

## BOOTSTRAP mode

### Phase B0 — Scaffold + reuse check (you)
1. Create `docs/product/` skeleton from the templates (INDEX placeholder, empty ledger with header,
   glossary stub, suggestions stub).
2. **Reuse check:** if `docs/nav-manifest.json`, `docs/app-map.md`, or `docs/business-flows.md`
   already exist (a prior `/app-cartograph` run), treat them as pre-paid Phases B1/B2 — pass them to
   the scribe as sources instead of re-dispatching census/walk. Only census what they don't cover.

### Phase B1 — Static census (subagent: `flow-census`)
Dispatch `flow-census` with the surface + overlay. It enumerates the route tree, API operations,
role/middleware logic, data models, and existing specs. Transform its output into
`docs/nav-manifest.json` (schema: `examples/nav-manifest.template.json`, shared with
`/app-cartograph`) — one surface per route, `status: unvisited`, `source: code`. Record the
**denominator** as an *enumerable list*, not just a count: whatever number you later put in INDEX.md
("21 surfaces") MUST correspond to the actual surface rows in the manifest, so it can be audited.

**Web vs API — the manifest is web-shaped; map explicitly for headless backends.** The template's
fields (`nav_path`, `example_url`, `roles: visible/redirect`, `screenshot`) assume a page-based UI.
For an API-only repo (Express/Nest/GraphQL, no rendered pages), map each surface as: a
`METHOD /path` operation; `nav_path: null`; role fields = the middleware/guard that gates it
(`gated_by` role or `public`) rather than visible/redirect; omit `screenshot`/`example_url`. Say in
INDEX that this is an API surface. Do not force UI concepts onto endpoints, and do not drop the
extra fields silently — record the mapping choice once in the manifest's top-level notes.

**Module taxonomy — let THIS repo decide the count.** Group surfaces into modules from this repo's
own route mounts / route groups / nav structure (never import another repo's module list). The
natural number is whatever the repo has — a 7-mount app yields ~7 modules, not a padded 10+; a large
app may exceed 20. Do NOT invent modules to hit a range. A **cross-cutting note with zero surfaces is
legal and encouraged** when a shared library concentrates business rules (e.g. a `pricing` note over
`lib/pricing.js`) — that's often where the highest-value truth and any docs/code contradictions live.
Allow an `uncategorized` bucket for leftovers, triaged at synthesis.

### Phase B2 — Live walk (subagent: `nav-cartographer`, only if target given & reachable)
Breadth-first burn-down of the frontier in batches of **5–8 surfaces** per dispatch, exactly as in
`/app-cartograph` Phase 1, with two overrides:
- **Ledger mode:** surfaces the walker marks `purpose_source: ambiguous` are NOT asked interactively
  — queue them; the scribe turns each into a ledger question.
- **Write safety is absolute:** walk up to any submit/create/delete and STOP — record the action as
  understood; NEVER execute a write. There is no per-write go-ahead in this command (it's async);
  what writes *do* is learned from service code, not by clicking.
Merge observations into the manifest after each batch (checkpoint = the manifest, never your
context). **Skipped entirely when no target (code-only run):** leave every surface `status:
unvisited` (the valid enum value — do NOT invent `unwalked`) and set the manifest's top-level
`walk` field to `"none (code-only run)"` so the reason is recorded once. All resulting notes stay
`status: draft` with `[code]`/`[docs]` claims only.

### Phase B3 — Synthesis (subagent: `product-scribe`)
Dispatch `product-scribe` in **bootstrap** mode with: the manifest path, the module taxonomy, the
repo's existing product docs to merge (point it at `docs/` — e.g. business-flow docs, module
workflow docs, architecture docs), the templates dir, and the scope brief. It reads everything in
its OWN context and writes the full notebook: module notes, INDEX, glossary, first ledger
(prioritized, **≤8 OPEN questions per module**), suggestions. It returns a one-screen summary +
tally (see Phase B4), not the notes themselves.

### Phase B4 — Completeness tally + handoff (you)
- **Tally check:** every census surface appears in exactly one module note (or `uncategorized`,
  or parked-with-reason). Census count in = notebook coverage out. Report the numbers honestly.
- **Redaction check:** grep the notebook for `Bearer`, `eyJ`, `Authorization`, obvious PII; scrub.
- Commit `docs/product/` + the manifest (one commit, message `docs(product): bootstrap notebook`).
- Tell the human: where the notebook is, how many questions await them in `open-questions.md`, and
  that the `product-manager` agent is now live for this repo.

## UPDATE mode

### Phase U1 — Fold answers (subagent: `product-scribe`, fold mode)
Dispatch `product-scribe` in **fold** mode. It reads `open-questions.md`, finds entries with a
human answer (state ANSWERED), rewrites the affected module notes — the matching `[ASSUMPTION]`
becomes a `[human: Q-nnn ✓]` fact — marks entries FOLDED, updates INDEX.md if the fact is
load-bearing, and bumps note `status` (a note whose material assumptions are all resolved →
`interviewed`; code+walk+human confirmed → `stable`). No answered entries → skip, say so.

### Phase U2 — Drift check (subagent: `flow-census`, then `product-scribe` refresh mode)
1. Re-dispatch `flow-census` (or, cheaper when git history is clean: diff routes/schema/models
   changed since the oldest `verified_at_commit` across notes — `git diff --stat <sha>..HEAD` on the
   route/schema dirs is often enough to scope which modules moved).
2. Dispatch `product-scribe` in **refresh** mode with the delta: it updates affected notes'
   `[code]` claims, flips their `status` back to `draft` where behavior may have changed, sets the
   new `verified_at_commit`, and writes NEW ledger questions for anything whose intent it can't
   infer ("route X appeared in payments since <sha> — what's it for?").

### Phase U3 — Report (you)
Commit (`docs(product): fold answers + refresh vs <sha>`). Report: N answers folded, N notes
touched, N new questions, notes promoted/demoted by status.

## Context budget & resumability (never lose work)
- **State on disk, agent stateless.** The manifest + the notebook ARE the memory. Every batch and
  every scribe run checkpoints to disk before you proceed. A crash or `/clear` loses at most one
  batch.
- **Heavy steps run in subagents** (census, walk batches, scribe) — only summaries return to you.
- **Main-context guard:** if your own context runs heavy mid-run, finish the current batch, commit
  what's on disk, print progress (mode, phase, batches done/remaining), and tell the human to
  re-invoke `/learn-app` in a fresh session — it re-reads the manifest/notebook and continues from
  the first unfinished item. Never silently work through a compaction.
- **Resume protocol:** on every invocation, existing state wins — INDEX.md decides the mode, the
  manifest decides where the walk resumes.

## Hard rules
- **Never block on the human.** Ambiguity → ledger, with assumption + confidence. No interactive gates.
- **Never state an ASSUMPTION as fact.** Provenance tags on every claim; the scribe enforces, you spot-check.
- **Completeness from the code, honestly reported.** Unreachable/unwalked surfaces are recorded as such, never dropped.
- **Read-only, always.** No write action is ever executed during a walk. DB-write safety rules of the target repo apply on top.
- **Secrets never persist.** Redact at capture; grep before commit.
- **The notebook is per-repo truth.** Never copy notes, taxonomy, or domain assumptions from another repo. The machinery is shared; the knowledge is not.
- **Cap the ledger.** ≤8 OPEN questions per module, prioritized. Only questions a human is *required* for (intent, policy, correctness) — never trivia answerable from code.

## Relationship to the other commands
- **`/learn-app [target] [scope]`** — build/refresh the product notebook. **This.**
- `product-manager` (agent) — answers questions and writes specs FROM the notebook; files new ledger questions when it doesn't know.
- `/app-cartograph <target>` — deeper interactive nav/flow mapping; its artifacts are reused here when present.
- `/e2e-map`, `/e2e-batch` — testing pipeline downstream; the notebook makes their census smarter.
- `/graphify` — optional: run over `docs/product/` for cross-cutting graph queries.

## Model
Orchestrator on the session model. `flow-census` ships `opus` (completeness pays; runs once per
bootstrap/refresh). `nav-cartographer` ships `sonnet` (never haiku — misreads purpose and R/W).
`product-scribe` ships `sonnet` (structured doc generation from sources in its own context).
