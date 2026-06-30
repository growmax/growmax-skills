# `/app-cartograph` — how to use it

> Teammate-facing guide. The agent-facing spec lives in [`commands/app-cartograph.md`](../commands/app-cartograph.md);
> this file is the "what is it / how do I run it" version for a human.

## What it is (in one breath)

A **workflow** that maps a *running* web app into durable **context** — a navigation map, a
business-flow doc, and a knowledge graph — **before** you write any tests. It's the step that answers
*"what does this app actually do, for whom, and where?"*

It's one **command** (the boss, talks to you, runs the gates) plus three **subagents** (workers, each
in its own context):

| Piece | Role |
|---|---|
| `commands/app-cartograph.md` | Orchestrator — owns the plan, runs the human gates |
| `agents/flow-census.md` | Reads the **code** → seeds the complete list of every page/API (the checklist) |
| `agents/nav-cartographer.md` | Walks the **live app** in small batches; captures behavior + APIs; **write-safe** |
| `agents/nav-synthesizer.md` | Writes the two docs from the manifest (isolated so it doesn't clog your chat) |

**The core idea:** completeness comes from the **code**, not from clicking. The code gives the
finite checklist of everything that exists (the *denominator*); the live walk burns it down. Coverage
= visited ÷ discoverable. That's the "we didn't miss anything" guarantee — impossible from wandering a
UI alone.

## When to use it

- Onboarding to an unfamiliar app — get a map + flows fast.
- Building shared context before `/e2e-map` (it makes the E2E census faster and its flows pre-validated).
- Documenting an app whose behavior has drifted from its docs.
- Feeding `/graphify` so you can *ask questions* about the app afterward.

**Run it before `/e2e-map`.** Pipeline: `/app-cartograph` (context) → `/e2e-map` (what to test) →
`/e2e-batch` (generate the suite).

## How to run it

Signature (arguments are positional):

```
/growmax-skills:app-cartograph <url> [roles] [driver] [scope]
```

| Arg | Required? | What it is |
|---|---|---|
| `<url>` | **yes** | The running app — a web URL or `localhost:port`. (Mobile/native apps aren't supported — it drives a web browser.) |
| `[roles]` | no | Who to walk as, e.g. `"anonymous, buyer"`. Quote it if it has a comma. Each role is a separate pass. Default: anonymous, then the logged-in role. |
| `[driver]` | no | `playwright-mcp` (default — clean locators, for local apps) or `claude-in-chrome` (uses your already-logged-in Chrome — required for SSO-gated remote/UAT apps; never touches credentials). |
| `[scope]` | no | A business brief / focus area: `scope: "..."`. Omit → census the whole app. Give one → focused, smarter walk (see below). |

### Examples

Census a local dev app (simplest):
```
/growmax-skills:app-cartograph http://localhost:3000
```

Walk an SSO-gated UAT app as two roles, focused on the money path:
```
/growmax-skills:app-cartograph https://app.example.com/in "anonymous, buyer" claude-in-chrome scope: "B2B buyer portal. Focus the money path: browse → product → cart → checkout → reorder, plus quotes and order history. Ignore marketing/CMS pages."
```

Narrow proof-of-shape run (read-only, see the doc format before going wide):
```
/growmax-skills:app-cartograph https://app.example.com "anonymous" claude-in-chrome scope: "just catalog + product browse + search, ~6 pages"
```

> The short form `/app-cartograph …` usually works; the namespaced `/growmax-skills:app-cartograph` is
> the unambiguous one if two plugins ever collide.

## Two modes: census vs focused

- **Census (default, no `scope`)** — maps the whole app. Best the first time you meet an app.
- **Focused (`scope:` a brief)** — maps only what matters. The brief does two things: filters the
  frontier to the relevant area, **and** acts as a *lens* so the walker interprets ambiguous screens
  against your stated intent instead of guessing.

**A brief is a force-multiplier, not just a filter.** One good paragraph ("this is a buyer portal;
the money path is X; ignore Y") tells the agent what each screen is *for* before it sees it — which
turns most "what is this?" interruptions into automatic labels. No brief works fine too; it just asks
you more questions.

This is also how the workflow is "niched" per app: it stays generic, and you specialize it via the
`scope` brief + a `.claude/E2E-NOTES.md` overlay in the target repo — never by hardcoding domain
assumptions into the skill.

## What happens during a run (the gates)

The workflow runs mostly on its own but **pauses for you** at three points:

1. **Write safety (GATE W)** — if it reaches a *Place order / Save / Delete / Pay* action, it walks
   up to it and **stops**, then asks before doing anything. Default is *don't execute*. On a UAT or
   shared target it says so loudly first. No silent writes, ever.
2. **Ambiguity (GATE A)** — only when it genuinely can't tell what a screen is for, it asks a one-line
   question. Screens it understands are auto-labeled and *not* asked here.
3. **Batch review (GATE B)** — at the end it shows you all the auto-labeled screens in one table to
   confirm or correct in a single pass.

## Watching progress (so it's not a wall of text)

Two views, picked by cost:

- **Status panel — always on, ~free.** At each phase, batch, and gate, the run prints a compact panel
  so you can see the shape at a glance:
  ```
  ┌─ /app-cartograph · buyer portal ··············
  │ Phase 1/6 · Walk (anonymous)
  │ Coverage ███████████░░░░░░ 58% (24/42)
  │ ✓visited 24  ⚠writes 5  ⛔blocked 2  ◷queued 16
  │ Now: /in/product/[slug] → GET /api/products/:id (R)
  │ Gates: GATE A ×3 pending · GATE W ×1 held
  └··············································
  ```
- **HTML dashboard — on request, a few k tokens.** Say *"show dashboard"* (or *"viz"*) and it renders a
  visual page from `docs/nav-manifest.json` — coverage bars per role, a color-coded surface table
  (visited / queued / blocked / write ⚠), per-role visibility, the phase pipeline, and open questions.
  It opens as an Artifact; ask again to **refresh** it (re-renders to the same URL). It's opt-in
  because each render costs tokens — the panel is the free everyday view, the dashboard is when you
  want the full picture. Template: [`examples/nav-dashboard.template.html`](../examples/nav-dashboard.template.html).

> Cost perspective: the browser walk and the agents are the expensive part of a run; both progress
> views are a rounding error next to that. The panel is effectively free; the dashboard only costs when
> you ask for it.

## What you get (outputs)

All written into the **target repo's** `docs/`:

| File | What it is |
|---|---|
| `docs/nav-manifest.json` | The machine-readable source of truth (the frontier + every observation). Resumable. |
| `docs/app-map.md` | Navigation map: sitemap tree, per-route table (route · role-visibility · R/W · purpose · key APIs), the auth model, and a role × route matrix. |
| `docs/business-flows.md` | Flows in plain language: actor → preconditions → steps → data → success → APIs → R/W. |

Then it offers to feed those into **`/graphify`** to build the queryable knowledge graph (the
"context" deliverable).

Templates for these formats: [`examples/nav-manifest.template.json`](../examples/nav-manifest.template.json)
and [`examples/app-map.template.md`](../examples/app-map.template.md).

## Safety & guarantees

- **Read-only by default.** Writes are gated and explicit (GATE W). It never submits a create/delete on a live app without your go-ahead.
- **Secrets never persist.** Network traces are distilled to `{method, path, R/W, entities}` and Bearer/JWT/cookies are stripped at capture — nothing sensitive lands in the manifest or docs.
- **Honest coverage.** A page it couldn't reach is recorded as `unreachable`/`blocked` with a reason — never dropped to make coverage look like 100%.
- **Never invents intent.** If it can't tell what a screen is for, it asks (GATE A) or marks it unconfirmed — a guess is not context.

## Won't I lose work on a big app? (context safety)

No — it's built to survive long walks:

- The **manifest is the memory, not the chat** — checkpointed after *every batch*. A crash/timeout/`/clear` loses at most the current batch (~6 screens).
- The walk runs in **small batches (5–8 screens)**, each in a worker's fresh context, so heavy browser snapshots never pile up in your main chat.
- **To resume:** just re-run `/app-cartograph <same url>` (in a new session if needed). If `docs/nav-manifest.json` exists, it reads it first and **continues from the first unvisited screen** — no re-walking.

## Troubleshooting

**`/app-cartograph` doesn't appear after installing/updating the plugin.**
The marketplace updater compares the `version` field in `.claude-plugin/plugin.json`. If the version
didn't change, `/plugin marketplace update growmax` reports *"already at latest"* and skips re-pulling
the files. Fix: bump `version` in `plugin.json`, commit + push, run `/plugin marketplace update
growmax`, then **restart Claude Code** (new slash commands register at startup, not mid-session).

**It says it can't reach the app.**
Check the URL/port (admin and API often differ). For an SSO app, make sure you're logged into it in
Chrome and use `driver: claude-in-chrome`.

**A widget won't open during the walk (tabs/dropdowns/popovers).**
Often a driver quirk (Radix/Headless-UI/MUI ignore programmatic clicks), not an app bug. The walker
notes it and can fall back to `claude-in-chrome` (trusted events) to explore it.

## Related commands

- **`/app-cartograph`** — map a live app into context (this). **Run first.**
- `/e2e-map` — census the app into an approvable E2E flow map (what to test).
- `/e2e-batch` — generate the approved suite autonomously.
- `/e2e-flow <target> <flow>` — one ad-hoc flow, full gated pipeline.
- `/graphify` — turns the docs into the queryable knowledge graph (invoked at the end of a cartograph run).
