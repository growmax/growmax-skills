---
name: e2e-batch
description: >-
  Autonomously generate the E2E suite from an APPROVED flow map (docs/e2e-flow-map.md) — run the full
  finder→planner→writer→validator→reviewer pipeline per flow with NO per-flow human gate, because the
  map is the pre-approval. Read-only flows run unattended; write flows pause once for confirmation.
  App bugs are quarantined and business ambiguities parked — the batch continues either way. Resumable
  via docs/e2e-coverage.md. Invoke with /e2e-batch <target> after /e2e-map has been approved.
---

# /e2e-batch — autonomous suite generation from the approved map

You are the **orchestrator** running the suite without a human in the per-flow loop. The human already
approved the map (`/e2e-map`) — that approval is the business contract for every checked flow, so you
do **not** re-open GATE 1 per flow. Your job is to grind through the approved flows, dispatching the
**existing** agents, and to **keep going** when a single flow fails: quarantine it, log it, move on.
You stop the whole batch only for the two things the human must own — the write-flow confirm and an
unsafe DB target.

**Input:** `$ARGUMENTS` = the target (web URL/port and/or `api:` hint). Same surface(s) as `/e2e-map`.

## Preconditions (check before doing anything)
1. **`docs/e2e-flow-map.md` exists and is approved.** If missing → tell the human to run `/e2e-map`
   first. If present but **zero rows are checked** (`[x]`) → stop: nothing is authorized.
2. **Write policy + DB target confirmed in the map header.** If the map has ⚠ (write) rows checked but
   no confirmed write policy / target line → stop and resolve it once (this is the GATE 1.5 DB-safety
   decision, lifted to batch level). Never write to a shared/UAT/prod DB silently.
3. **Coverage registry.** Read `docs/e2e-coverage.md` (create on first run). It is the resume ledger —
   any flow already recorded there (generated / quarantined / parked / skipped) is **skipped** so a
   re-run only does pending work.
4. **Overlay.** Read `.claude/E2E-NOTES.md` and pass its facts to every subagent (as `/e2e-flow` does).

## The work queue
From the approved map, take **checked (`[x]`) AND pending (not in the coverage ledger)** flows. Order:
1. **All read-only (`R`) flows first** — these run fully **autonomously**, no pauses.
2. **Write (`W ⚠`) flows last** — each PAUSES once for the human confirm before its first data-creating
   run (per the approved write policy). Batch them so the human confirms a group, not one at a time.

Process flows in priority order (P0 → P1 → P2) within each group. Default to sequential; you MAY run a
few independent read-only flows concurrently via parallel Task dispatches if context allows.

## Per-flow pipeline (the existing agents, no new gate)
For each queued flow, run the same chain `/e2e-flow` uses — only GATE 1 is removed (the map replaces it):

1. **Discover** — `flow-finder` (web) or `api-flow-finder` (api). Seed it with the flow's **approved
   intent + success signal from the map** so it confirms/derives locators rather than re-deciding what
   the flow is for. (Cheap, already-known flows can skip straight to planning if the map row is rich
   enough — use judgment.)
2. **Plan** — `flow-planner`. Produces the technical plan (stack/auth/teardown/DB/steps→assertions +
   isolation). No GATE 1.5 pause unless it returns a **blocker** (see below).
3. **Write** — `test-writer`. One spec, following the plan + repo conventions.
4. **Validate & self-heal** — `validator`. Runs the single spec, heals TEST bugs (cap 3/step) to green.
5. **Review** — `reviewer` (on green). Safe fixes applied; re-run validator if the spec changed.

Thread each agent's output to the next exactly as `/e2e-flow` does. Keep per-flow heal logs OUT of the
main thread — record only the outcome.

## Non-blocking failure handling (this is what makes it autonomous)
A single flow must never halt the batch. Classify each flow's outcome and **continue**:

| Outcome | Action — then CONTINUE the batch |
|---|---|
| ✅ Green | Commit-ready spec. Record `generated` in the ledger (path + success + isolation assertion). |
| ❌ APP BUG (validator) | **Quarantine:** leave the test failing as `.fixme`/`.skip` with a linked note; preserve the trace/video evidence to a known path. Record `quarantined-app-bug` + evidence path + repro. |
| ❓ BUSINESS AMBIGUITY | **Park:** don't guess. Record `parked-ambiguity` + the precise question. (Collected for the human at batch end — NOT a mid-batch stop.) |
| 🚫 Planner blocker (no runner / unsafe DB for THIS flow / RN) | **Skip:** record `skipped-blocked` + reason. An unsafe-DB write flow is skipped, never forced. |
| ⏸ Write flow, confirm not yet given | Hold until the write-confirm batch; if declined, record `skipped-write-declined`. |

The only mid-batch stops: (a) the one-time write-flow confirm, (b) a global blocker that dooms every
remaining flow (e.g. app unreachable, runner uninstalled) — then stop and report, don't churn.

## Coverage ledger (`docs/e2e-coverage.md`)
Append one row per processed flow as you go (so a crash/interrupt resumes cleanly):
```
| Flow ID | Flow | Surface | Spec | Status | Success assertion | Isolation | Notes |
```
Statuses: `generated` · `quarantined-app-bug` · `parked-ambiguity` · `skipped-blocked` ·
`skipped-write-declined`. This doubles as the resume ledger (preconditions step 3).

## Cleanup & finish (once, at batch end — reuse /e2e-flow Phase 6)
Run the artifact cleanup **once** for the whole batch, not per flow:
1. `git status` to see what the run produced; remove only **untracked** artifact patterns
   (`.playwright-mcp/`, `page-*.png`, `test-results/`, `playwright-report/`, `blob-report/`,
   `.last-run.json`, traces/videos). Never delete tracked source or a committed spec; never
   `git clean -x` blindly.
2. **Preserve** trace/video evidence ONLY for quarantined app-bug flows (referenced from their notes).
3. Ensure `.gitignore` covers the artifact dirs (small separate commit if missing).
4. End on a `git status` showing only intended changes: new specs, the map, the coverage doc,
   `.gitignore`/E2E-NOTES tweaks — nothing dangling.

**Batch summary (always):** totals — generated / quarantined / parked / skipped, by category; the list
of app bugs found (with evidence paths); the list of parked questions for the human to answer (re-run
those flows after answering); and what's still pending if the run was bounded.

**Commit:** only green specs; quarantine app-bug specs as `.fixme`/`.skip` with the linked note. Don't
commit for the human without their okay.

## Hard rules (inherited from /e2e-flow — unchanged)
- **Self-heal fixes the test, never the app.** A test failing on a real app bug is quarantined, not
  papered over. The validator's TEST-vs-APP classification is load-bearing — never weaken it for speed.
- **Tenant isolation & roles stay first-class.** Every multi-tenant/role-gated flow keeps its isolation
  assertion; the writer/reviewer don't drop it to make a flow pass.
- **Teardown required** for every write flow (self-cleaning, children→parents).
- **DB-write safety is absolute.** No write to a shared/prod DB, ever, even autonomously. Skip+log.
- **The spec is the only durable output.** Discovery/validation artifacts are cleaned up at batch end.

## Scaling note (optional)
For a large approved map (many dozens of flows), the per-flow fan-out can be offloaded to a **Workflow
script** — a `pipeline()` over the checked flows where each stage is one agent
(`flow-finder`/`api-flow-finder` → `flow-planner` → `test-writer` → `validator` → `reviewer`), with the
same non-blocking failure handling (quarantine/park → `null`, filtered out, logged). This keeps per-flow
heal logs out of the main context and runs flows concurrently under the harness cap. The command-based
loop above is the default and matches the rest of the plugin; reach for the Workflow engine only when
map size makes the sequential loop impractical, and only with the user's okay (it spawns many agents).

## Model
Orchestrator on the session model (Opus for tightest safety judgment across many flows). Subagents run
on their own `model:` frontmatter — `flow-planner` opus, the rest sonnet. The validator must never drop
below sonnet: misclassifying an app bug as a test bug, at batch scale, papers over real bugs silently.
