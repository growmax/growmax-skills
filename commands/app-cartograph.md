---
name: app-cartograph
description: >-
  Map a WHOLE running web app into durable CONTEXT — navigation/sitemap, business flows, and a
  knowledge graph — by seeding a complete frontier from the code, then walking the live app with a
  human-in-the-loop. The code is the denominator (completeness guarantee); the walk validates,
  captures real behavior + redacted network traces, and the human annotates business purpose only
  where it's ambiguous (hybrid). State lives in docs/nav-manifest.json so the walk is resumable and
  write-safe (hard-stops before any submit). Output: docs/app-map.md + docs/business-flows.md + a
  graphify context. Runs UPSTREAM of /e2e-map. Use when asked to "document/understand this app",
  "map the navigation/business flows", "build context for <app>", "capture what this app does".
  Invoke with /app-cartograph <web-url-or-port> [roles] [driver] [scope]  (e.g. /app-cartograph
  https://app.example.com "anonymous, buyer" claude-in-chrome).
---

# /app-cartograph — map a live app into durable context (nav + flows + graph)

You are the **orchestrator** in the main session. `/app-cartograph` answers the question that comes
*before* testing: **what does this app actually do, for whom, and where?** It produces three durable
artifacts — a navigation map, a business-flow doc, and a knowledge-graph context — by reconciling the
**code** (the complete, finite list of everything that exists) against the **live app** (real
behavior, role-gating, and the network calls behind each screen).

You do NOT walk the browser, distill traces, or write the graph yourself. You **dispatch subagents**,
own the **manifest state on disk**, enforce the **gates**, and surface the **human annotation
checkpoints**. Subagents can't spawn subagents — every delegation happens here.

> **Why this exists / where it sits.** `/e2e-map` censuses an app to decide *what to test*.
> `/app-cartograph` runs one step earlier: it builds the shared *understanding* of the app (docs +
> graph) that makes everything downstream — onboarding, debugging, `/e2e-map`, `/graphify` queries —
> cheaper and more correct. Map the app once with this; then run `/e2e-map` to plan the E2E suite.

**Inputs:** `$ARGUMENTS` =
- **target** — a web URL or `localhost:port` (required). Mobile/native (RN/Expo) → STOP, this drives a web browser.
- **roles** — optional list to walk (e.g. `"anonymous, buyer"`). Default: anonymous, then the logged-in role. Each role is a separate pass; the manifest is dimensioned by role.
- **driver** — optional: `playwright-mcp` (default, gives clean locators) or `claude-in-chrome` (uses the user's already-authenticated Chrome — required for SSO-gated remote/UAT apps; never touches credentials). If unspecified, pick per **Driver selection** below.
- **scope** — optional business brief or focus area (e.g. `scope: "ordering, reorder, quotes"`, or a 3-line journey brief). Omitted → **census the whole app**. Given → **focused walk** (see *Scope* below). A brief makes the walk *smarter*, not just smaller — it tells the agent what a screen is *for* before it sees it, which collapses most ambiguity questions.

**Repo overlay:** read `.claude/E2E-NOTES.md` in the target repo FIRST if it exists (base URL, roles,
login, naming/teardown, DB-safety, driver gotchas) and pass its facts downstream. Missing → say so;
the walk still runs from code discovery, but flag the weaker footing and offer to create one from
`examples/E2E-NOTES.template.md`.

## The one principle this command is built on
**Completeness comes from the code, not from clicking.** A live walk has no denominator — you never
know what you didn't see (role-gated pages, deep links, empty-vs-full states, a feature three clicks
deep). So the **static census seeds the frontier** (the checklist of everything that exists) and the
**live walk burns it down**. Coverage = visited ÷ discoverable. That number is the "didn't miss
anything" guarantee, and it can only exist because we started from the code.

## Scope: census (broad) or focused (narrow)
The optional **scope** input picks the mode:
- **Census (default — no scope)** — map the WHOLE app. Best the first time you meet an app, for full context.
- **Focused (`scope:` a brief or area)** — map only what matters now. Two effects: (1) the seed frontier is **filtered** to surfaces touching that area; (2) the brief is passed to `nav-cartographer` as a **lens** — it reads ambiguous screens against *your stated intent* instead of guessing, and prioritizes those flows.

**A brief is a force-multiplier, not just a filter.** One paragraph — *"B2B buyer portal; money path is browse → cart → checkout → reorder; quotes & approvals matter; ignore the marketing/CMS pages"* — tells the agent what each screen is *for* before it lands on it, which collapses most GATE A ambiguity questions into auto-classifications. No brief? Census mode still works; it just asks you more. This is how the workflow is "niched" per app: it stays generic, you specialize it via the brief + the `.claude/E2E-NOTES.md` overlay — never by hardcoding domain assumptions into the skill.

## Driver selection
- **Local app you can run** (`localhost:port`) → **playwright-mcp**. Clean accessibility tree + exact role/name locators, on the same engine an E2E test would run on later.
- **Remote / UAT app behind SSO** (e.g. `*.cloud`, corporate IdP) → **claude-in-chrome**. Drives the user's already-logged-in Chrome with trusted events, so you sidestep the SSO dance and never handle credentials. Yields vision/coordinates, not clean locators — fine, this command captures *understanding*, not test selectors.
- When in doubt, ask once. Never attempt a fresh programmatic login against a shared SSO IdP.

## Workflow

### Phase 0 — Seed the frontier (subagent: `flow-census`)
Reuse `flow-census` as the static seed — it already enumerates the route tree, API routes,
middleware/role logic, and R/W classification (the exact frontier we need) and is honest about writes.
Dispatch it with the surface + overlay facts.

Then **transform its output into `docs/nav-manifest.json`** (schema:
`examples/nav-manifest.template.json`) — the durable frontier state THIS command owns:
- one **surface** per navigable destination (route), keyed by route pattern, `status: unvisited`, `source: code`;
- carry forward each surface's `rw`, role hints, expected `flows`, and any API ops the census already saw;
- record the **denominator**: total code surfaces = the completeness target.

The manifest — not your context — is the source of truth. You work one batch of surfaces at a time
against it, so a 60-screen app never blows the context window, and the walk is **resumable**: on
re-invocation, read the existing manifest and continue from the first `unvisited` surface.

### Phase 1 — Guided live walk (subagent: `nav-cartographer`, looped per role)
For each role, breadth-first burn-down of the frontier. Loop until no `unvisited` surfaces remain:
1. Pop a small batch of `unvisited` surfaces. Dispatch `nav-cartographer` with: the batch, the active
   role, the chosen driver, and the overlay. It navigates each, captures the **accessibility snapshot
   + a DISTILLED, SECRET-REDACTED network trace** (`{method, path, R/W, entities}` — never raw HAR,
   never tokens) + an optional screenshot to scratch, classifies R/W, **proposes the business
   purpose with a confidence flag**, and **returns newly-discovered links** it didn't already have.
2. Merge its observations back into the manifest. Push discovered surfaces as new `unvisited` rows
   (`source: discovered`) — this is how the walk finds things the census couldn't (data-dependent
   nav, modals, deep links). Mark walked surfaces `visited` (or `blocked`/`unreachable`/`redirect`).
3. Recompute coverage. Repeat.

**GATE W — write safety (blocks, per write surface).** `nav-cartographer` walks **up to** any
submit/create/delete action and STOPS — it never clicks the final write on a live app. When a write
surface is reached, surface it to the human: describe the action and the data it would create, and
ask whether to proceed. Default is **read-only** (record the write as understood, don't execute it).
Only execute a write on explicit go-ahead, and on UAT/shared targets say so loudly first.

**GATE A — hybrid annotation (conditional, inline).** For each surface the agent marked
`purpose_source: ambiguous`, ask the human ONE compact question: *"`/route` — I see X; is this for
Y?"* — a one-line confirm/correct. Surfaces the agent is confident about are auto-filled
(`purpose_source: auto`) and NOT asked here — they're reviewed in bulk at GATE B. This keeps human
cost low (no death by 60 prompts) while still capturing intent at the moment of observation, where
it's highest-fidelity. If the human isn't present, queue ambiguous surfaces and continue the walk.

### Phase 2 — Reconcile & coverage (you)
Every code-seeded surface must end as `visited` OR explicitly `unreachable`/`blocked`/`role-gated
(role)` with a reason — never silently absent. Report **coverage % per role** (visited ÷ discoverable)
and list anything unresolved. If gaps remain and are reachable, re-walk them before synthesizing.
Honesty rule: a surface you couldn't reach is recorded as such, not dropped to make coverage look 100%.

### GATE B — batch annotation review (blocks, one pass)
Present the full manifest's auto-classified purposes (the `auto` surfaces) for the human to correct
in **one sitting** — a compact table of `route · proposed purpose · R/W · role`. The human edits any
that are wrong. Fold corrections back into the manifest. This is the bulk, low-friction half of the
hybrid model. After this, every surface has a human-blessed purpose.

### Phase 3 — Synthesize the docs (subagent: `nav-synthesizer`)
Dispatch `nav-synthesizer` with the (now human-blessed) manifest. It reads `docs/nav-manifest.json`
in its **own** context and writes two durable docs to `docs/` in the target repo (format:
`examples/app-map.template.md`) — keeping the doc-generation token load out of the main session:
1. **`docs/app-map.md`** — the navigation map: nav tree, per-route table (route · roles-visibility ·
   R/W · purpose · key APIs), the **auth model** (anonymous vs authed token behavior observed), and a
   **role × route visibility matrix**. This is the sitemap with ground truth attached.
2. **`docs/business-flows.md`** — the flows: each flow as *actor → preconditions → steps → data
   touched → success signal → APIs → R/W*, grouped by domain. Derived from the manifest + walk, in
   plain language a PM could read — not test steps.

Both are written from the manifest, so they're internally consistent and re-generable.

### Phase 4 — Build the context graph (`/graphify`)
Hand `docs/app-map.md` + `docs/business-flows.md` + the manifest to `/graphify` to produce the
queryable knowledge graph (entities, roles, routes, APIs, flows and their relationships). This is the
"context" deliverable — afterward, questions about the app resolve against the graph.

### Phase 5 — Clean up & hand off (you)
- **Redaction check:** grep the docs + manifest for `Bearer`, `eyJ` (JWT), `Authorization`, and obvious PII; scrub any that leaked. Never persist a token.
- **Working tree:** remove disposable walk screenshots from scratch; ensure none landed in the repo (`.playwright-mcp/`, stray `page-*.png`). The three artifacts (app-map, business-flows, manifest) + the graph are the only durable outputs.
- **Summarize:** coverage % per role, # surfaces (visited/blocked/unreachable), # write surfaces found, # purposes auto vs human-corrected, anything unresolved.
- **Point onward:** `/e2e-map <target>` to turn this understanding into a tested E2E suite. The map you just built makes that census faster and its flows already business-validated.

## Progress display (status panel + on-demand dashboard)
Make the run **legible** — the human should see the *shape* of what's happening, not a wall of prose.

**Status panel — always on, ~free.** At every phase transition, after each walk batch, and at every
gate, print a compact panel built **only from data you actually have**. Never fabricate elapsed time or
token counts — omit the `⏱`/`↓` line unless the harness surfaces them:
```
┌─ /app-cartograph · <app> ····································
│ Phase <n>/6 · <phase> (<role>)
│ Coverage ███████████░░░░░░ <pct>% (<visited>/<discoverable>)
│ ✓visited <n>  ⚠writes <n>  ⛔blocked <n>  ◷queued <n>
│ Now: <current route> → <key api> (<R/W>)
│ Gates: GATE A ×<n> pending · GATE W ×<n> held
└··············································
```
This is the default view and costs essentially nothing — it's the same facts you'd narrate anyway.

**Dashboard — on-demand, a few k tokens.** When the human asks ("show dashboard", "viz", "show me the
map"), render the HTML dashboard from the manifest:
1. Read `docs/nav-manifest.json`.
2. Fill `examples/nav-dashboard.template.html` — replace the `__MANIFEST_JSON__` placeholder with the raw manifest JSON. Write the filled file to the **scratch dir**.
3. Load the `artifact-design` skill (required before publishing), then publish via the **Artifact** tool.
4. **Refresh = re-fill + re-publish to the SAME file path** → same URL. Do NOT auto-render every batch (that's what costs tokens) — render when asked, or at a milestone the human named.

To light up the dashboard's live phase, keep the optional `progress` object in the manifest updated as
you go (`{"phase":"Walk","done":["Seed"]}`). It's optional — the dashboard degrades gracefully without it.

## Context budget & resumability (never lose work)
A 60+ surface app would blow a single context window if walked in one shot. The design prevents that —
and guarantees a half-finished walk is never lost:
- **The manifest is the memory, not the chat.** Every observation is checkpointed to
  `docs/nav-manifest.json` after **each batch** — never held only in context. A crash, timeout, or
  `/clear` mid-walk loses at most the current batch.
- **Walk in small batches.** Pop **5–8 surfaces per `nav-cartographer` dispatch**, not the whole
  frontier. Each batch runs in the subagent's **own fresh context**, so heavy browser snapshots +
  traces never accumulate in the main session — only the distilled result returns.
- **Heavy steps are isolated in subagents.** The seed (`flow-census`) and the doc synthesis
  (`nav-synthesizer`) each read/produce a lot; they run in their own contexts and return only
  summaries, keeping the orchestrator lean for the gates.
- **Main-context guard → checkpoint & hand off.** If the orchestrator's *own* context fills after many
  batches, it: (1) confirms the manifest is fully checkpointed, (2) reports coverage so far, and
  (3) hands off to a **fresh session** — re-invoke `/app-cartograph <same target>` (or schedule it),
  which reads the manifest and **resumes from the first `unvisited` surface**. No re-walking. The
  resume point is the manifest, so a new session is a feature, not a recovery hack.
- **Resume protocol (always):** on every (re)invocation, if `docs/nav-manifest.json` exists, read it
  FIRST and continue the burn-down; only seed from scratch when it's absent.

## Hard rules
- **Completeness comes from the code.** Seed the frontier from the static census; the walk burns it down. Report coverage honestly — an unreachable surface is recorded, never dropped.
- **State on disk, agent stateless.** `docs/nav-manifest.json` is the source of truth and makes the walk resumable. Never hold the whole app in context.
- **Read-only by default; writes are gated and explicit.** Walk up to a submit and STOP. Never execute a create/delete on a live/UAT app without an explicit per-write go-ahead.
- **Secrets never persist.** Distill traces to `{method, path, R/W, entities}` and redact Bearer/JWT/PII at capture time — before anything is written to the manifest or docs.
- **Never invent business intent.** Ambiguous purpose → ask (GATE A) or carry as an open question. The human blesses every purpose (GATE B). A guess is not context.
- **Per role.** Same route can differ by role; walk each role and dimension the manifest by it.
- **Don't pollute the working tree.** Screenshots are disposable and go to scratch, never the repo.

## Relationship to the other commands
- **`/app-cartograph <target>`** — map the app into context (nav + flows + graph). **This. Run first.**
- `/e2e-map <target>` — census the app into an approvable E2E flow map (what to test) → one approval.
- `/e2e-batch <target>` — generate the approved E2E suite autonomously (read-only unattended, writes gated).
- `/e2e-flow <target> <flow>` — one ad-hoc flow, full gated pipeline.
- `/graphify` — invoked in Phase 4 to turn the docs into the queryable knowledge graph.

## Model
Run the orchestrator on the session model (gate enforcement + human dialogue = judgment over volume).
`flow-census` ships `opus` (the seed's completeness pays off most; runs once). `nav-cartographer`
ships `sonnet` — it infers intent from a noisy live a11y tree across many browser calls and iterates,
so the coding/perception sweet spot fits; never drop it to haiku (it misreads purpose and R/W).
`nav-synthesizer` ships `sonnet` — straight doc generation from the manifest, isolated in its own
context to keep the orchestrator lean. All three are declared in their agent frontmatter.
