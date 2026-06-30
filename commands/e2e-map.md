---
name: e2e-map
description: >-
  Census the WHOLE app into one categorized, approvable E2E flow map — crawl every route + API +
  existing spec, enumerate every flow with intent/success/role/R-W/priority/coverage, and hold the
  ONE human approval gate that authorizes autonomous suite generation. Output: docs/e2e-flow-map.md.
  Run this once per app, then run /e2e-batch to generate the approved flows without a per-flow gate.
  Invoke with /e2e-map <target> where <target> is a web URL/port and/or an "api:" hint.
---

# /e2e-map — whole-app flow census + the single approval gate

You are the **orchestrator**. `/e2e-map` answers the question `/e2e-flow` can't: *what are ALL the
flows, and which do we want tested?* It produces one categorized map and takes **one** human approval.
That approval is the pre-authorization for `/e2e-batch` to generate the whole suite with **no per-flow
human gate**. So this command's job is to make the map **complete, honest, and safe to approve in one
pass** — nothing downstream re-asks the human about business intent.

**Input:** `$ARGUMENTS` = the target (web URL/port and/or an `api:` hint). This sets which
surface(s) the census covers. Ambiguous → ask once before starting.

**Repo overlay:** read `.claude/E2E-NOTES.md` in the target repo FIRST if it exists (base URL, roles,
login, naming/teardown, DB-safety). Pass its facts to `flow-census`. If it's missing, say so — the
census still runs from repo discovery, but the map is weaker without it; offer to create one from
`examples/E2E-NOTES.template.md`.

## Workflow

### Phase 0 — Census (subagent: `flow-census`)
Dispatch `flow-census` with the surface(s) + overlay facts. It crawls the route tree, API routes,
middleware/role logic, and existing specs, and returns the categorized map (intent, success signal,
role, R/W, priority, coverage status, ⚠ on writes) plus per-category open questions. It writes no spec
and drives no browser.

### Phase 1 — Persist the map
Write the returned map verbatim to **`docs/e2e-flow-map.md`** in the target repo (create `docs/` if
needed), in the canonical format `examples/e2e-flow-map.template.md` (the `Pre-approval digest`
section is appended in Phase 1.5). This file is durable — it's the contract `/e2e-batch` reads. Confirm
`base:` in the header matches the real Playwright/runner target (read `playwright.config.*` or the
runner config to verify; correct it if the overlay was stale).

### Phase 1.5 — Completeness review → the pre-approval digest
A long map hides gaps, and the human is about to approve it as the contract for the *entire* autonomous
batch. So before the gate, audit the map for what's missing — in **two passes, split by cost**, because
checking what's PRESENT is cheap but checking what's ABSENT needs real reasoning:

1. **`approval-gap-structural`** (`haiku`) — mechanical diff of the map vs the real route/API surface
   and existing specs: routes/ops with no row, incomplete rows, writes not flagged ⚠, suspect coverage
   claims, duplicates, unchecked-by-category tally. Cheap — it's present-vs-map cross-referencing.
2. **`approval-gap-category`** (`sonnet`) — judgment pass: whole *kinds* of flow the census couldn't
   see (permission-denied / cross-tenant negatives, auth-token edges, empty/error states, pagination &
   large-result boundaries, per-role variants, write integrity, cross-surface). A missed *category* at
   approval = an area tested **never** — so this never runs on a cheap model.

Dispatch both against the persisted map + repo + overlay (they may run concurrently; feed the category
pass the structural findings so it doesn't repeat them). Assemble their returns into the
**`## Pre-approval digest`** section of `docs/e2e-flow-map.md` (the template's A/B/C structure). This
turns "approve 257 rows and hope" into "resolve N specific gaps, then approve." If the digest finds
genuine omissions, add the rows (or record the decision to skip them) before the gate.

### THE GATE — one approval (blocks)
Present the **pre-approval digest first** — the action checklist of the few specific gaps to resolve —
then the map itself, and **stop**. The human does three things here, once, for the whole app:
1. **Picks flows** — edits the `Gen?` column to `[x]` on the flows to generate. ("Map all, you pick":
   covered flows are included but default unchecked; the human opts in.)
2. **Answers the open questions** — these become the pre-approved business rules the batch encodes.
   Fold the answers back into the relevant rows (tighten intent/success) before batch run.
3. **Confirms write-flow handling + DB target** — for every ⚠ row: confirm the autonomous policy
   (read-only flows run unattended; **write flows pause for one confirm at batch time**) and the
   **target DB**. If the target is a shared/UAT/prod environment, say so loudly and recommend a
   local/throwaway target for write generation. Do not proceed to suggest `/e2e-batch` until the
   human has acknowledged where writes will land.

Wait for the human. Save their edits into `docs/e2e-flow-map.md` (the checked rows + tightened
intent + a short "Write policy / target DB" line in the header). The approved map is now the business
contract for the batch.

### Phase 2 — Hand off
Once the map is approved, tell the human exactly what's queued: counts by category, how many
read-only (autonomous) vs write (gated), how many already covered vs new. Then point them at:
`/e2e-batch <target>` to generate the checked + pending flows.

## Hard rules
- **The map is the approval.** Make it good enough that no downstream phase needs to re-ask the human
  about *what a flow is for*. If a flow's intent is unclear, it's an open question here — not a guess
  the batch inherits.
- **Never overstate coverage** (delegated to `flow-census`, enforced here): if a row says "covered",
  it must cite a spec whose assertion really proves the flow. When unsure → `partial`.
- **Writes are explicit.** Every data-creating flow carries ⚠ and a confirmed target before the batch
  may run it. No silent writes to a shared environment.
- **No spec files written here.** `/e2e-map` produces the map and the approval; `/e2e-batch` writes
  specs. Keep the surfaces separate.
- **Don't explode the map** on locale/role/tenant multipliers — one row per flow, multipliers noted.

## Relationship to the other commands
- `/e2e-flow <target> <flow>` — ONE named flow, full gated pipeline (use for a single ad-hoc flow).
- `/e2e-map <target>` — census the whole app → one approval → `docs/e2e-flow-map.md` (**this**).
- `/e2e-batch <target>` — generate the approved map autonomously (read-only unattended, writes gated).

## Model
Run the orchestrator on the session model. `flow-census` ships `opus` — the map gates the *entire*
batch, so quality here pays off most; it runs once. Drop to `sonnet` only for a small app.
The approval-gap review is split by cost: `approval-gap-structural` runs on `haiku` (present-vs-map
cross-referencing is cheap), `approval-gap-category` on `sonnet` (absence detection must not be
cheaped out — a missed category goes untested forever). Both are declared in their agent frontmatter.
