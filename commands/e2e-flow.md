---
name: e2e-flow
description: >-
  Orchestrate end-to-end test generation as a gated, multi-agent workflow across TWO surfaces —
  WEB frontends (React or Next.js, driven by playwright-mcp) and the BACKEND API (GraphQL/REST,
  driven by the repo's own runner: Jest/supertest or Vitest). Discover the flow → YOU approve the
  business understanding → PLAN it technically against the real repo → confirm → write → validate-
  and-self-heal until green → review → finish. Use when asked to "write E2E tests for <flow>",
  "add E2E coverage for <flow>", "automate testing for <app>". Invoke with /e2e-flow <target> <flow>
  where <target> is a web URL/port OR an api hint (e.g. "api: quote → order → invoice").
---

# /e2e-flow — gated multi-agent E2E workflow (web + api)

> **One flow per invocation, with a human gate on the business understanding (GATE 1).** Use this for
> a single named flow. To cover a WHOLE app without a per-flow gate, run `/e2e-map` (census every
> flow → one approval → `docs/e2e-flow-map.md`) then `/e2e-batch` (generate the approved flows
> autonomously — read-only unattended, write flows gated). `/e2e-map` + `/e2e-batch` reuse these same
> agents; they move the single human approval up to the map level instead of repeating it per flow.

You are the **orchestrator** in the main session. You do NOT explore, plan, write, heal, or
review yourself — you **dispatch subagents** via the Task tool, thread their outputs forward,
and **enforce the gates**. Subagents cannot spawn subagents, so every delegation happens here.

**Inputs:** `$ARGUMENTS` = the target + the flow. The target tells you the **surface**:
- a web URL/port (e.g. `http://localhost:3000`) → **WEB** surface (Playwright + playwright-mcp).
- an `api:` hint, a resolver/mutation name, or a backend flow ("quote → order → invoice") →
  **API** surface (the repo's runner: Jest/supertest or Vitest — NO browser).
If the surface is ambiguous, ask before doing anything. If the target is a mobile/native app
(React Native / Expo), STOP — playwright-mcp can't drive it; route to a mobile harness and say so.

**Repo overlay:** if a file like `E2E-NOTES.md` exists at the workflow/repo root, read it FIRST and
pass its relevant facts (surface map, ports, login, JWT shape, naming + teardown convention,
DB-safety, driver gotchas) to each subagent. It's ground truth the agents can't infer; without it
they fall back to repo discovery.

## Hard rules
- **Never invent business intent.** The test encodes behavior the human approved in words.
- **Never invent the test setup.** The planner reads the repo's actual stack; the writer follows
  the approved plan — neither guesses a framework/auth/port the repo doesn't use.
- **The committed test is always deterministic code** — a Playwright spec (web) or the repo's
  runner spec (api). An exploratory browser agent (Claude-for-Chrome) may *help discover* a flow,
  but it is NEVER the committed artifact and NEVER the CI runner.
- **Tenant isolation & roles are first-class.** On a multi-tenant or role-gated app, the success
  criteria MUST include an isolation/authz assertion (returned rows carry the caller's org;
  wrong-role / cross-tenant is rejected) — not left to the reviewer to suggest.
- **DB-WRITE SAFETY (blocks).** Any create/mutate flow writes to whatever DB the target is bound
  to. Before the first write step, CONFIRM the target is a safe local/throwaway DB — never a
  shared dev/production DB. If unconfirmed → stop and ask.
- **GATE 1 (business) blocks.** No plan until the user approves the business understanding.
- **GATE 1.5 (plan) is soft.** Present the plan; proceed unless the user objects OR the planner
  flagged a blocker (no runner, conflicting setups, unknown auth, unsafe DB, mobile app) — then block.
- **GATE 2 (business ambiguity) is conditional.** Any subagent that hits a business rule it can't
  resolve stops and asks — never guesses.
- **Self-heal fixes the test, never the app.** A test failing on a real app bug is reported.
- **The spec is the only durable output; everything else is disposable.** Discovery screenshots
  (`page-*.png` from playwright-mcp) and Playwright run reports/results must be cleaned up at the
  end and NEVER committed (Phase 6). Failure evidence is kept only for a quarantined app bug.

## Workflow

### Phase 1 — Discover
- **WEB:** dispatch `flow-finder` (read-only, playwright-mcp) with the flow + URL.
- **API:** dispatch `api-flow-finder` (reads schema / resolvers / guards / data model) with the flow.
Either returns a **plain-language business understanding** (intent, path, success signal,
test-data + tenant/role assumptions, open questions). Writes no code.

### GATE 1 — Business approval (block)
Present the understanding. Approve / correct / answer open questions. Wait. Carry the approved
version forward as the business contract.

### Phase 2 — Plan (subagent: `flow-planner`)
Dispatch with the approved understanding + the surface. It inspects the **actual repo** (surface,
runner, stack, spec dir, conventions, auth/session, **test-data + TEARDOWN convention**, **target
DB**, CI) and produces a **technical test plan** mapping steps→assertions — including the isolation
assertion and the cleanup strategy. Writes the plan only — no spec.

### GATE 1.5 — Plan confirmation (soft)
Present the plan. Blocker (no runner, conflicting frameworks, unknown auth, **unsafe/unconfirmed
DB**, RN/native app) → block and ask. Otherwise proceed on a clear plan; don't force a second
approval on routine flows.

### Phase 3 — Write (subagent: `test-writer`)
Dispatch with the approved understanding + confirmed plan + surface. Writes one spec following the
plan exactly — **web profile** (web-first assertions, user-facing locators, playwright-mcp) or
**api profile** (the runner's client, response + persistence assertions, signed auth, self-cleaning
teardown). Returns the path. Does not run.

### Phase 4 — Validate & self-heal (subagent: `validator`)
Run the single spec with the surface's command. Classify failures TEST-bug vs APP-bug → heal TEST
bugs (max 3/step) → green. APP-bug or business ambiguity → return it; go to GATE 2.

### GATE 2 — Conditional (business ambiguity only)
Ask the user the specific question; feed the answer back to the relevant phase. Never resolve it
yourself.

### Phase 5 — Review (subagent: `reviewer`)
On green, review for flakiness/duplication/naming, isolation/role coverage gaps, missing teardown,
and worthwhile additions. Safe fixes applied; rest recommended. Re-run validator if the spec changed.

### Phase 6 — Complete & clean up (you)
**Summarize:** surface, flow, file path, success assertion, isolation assertion, any app bug
flagged, reviewer notes. Append the flow to a coverage registry (`docs/e2e-coverage.md` or the
repo's equivalent — create it on first use): covered / quarantined-as-app-bug.

**Clean up the artifacts the run scattered into the working tree.** Discovery and validation leave
disposable files behind — playwright-mcp screenshots (a `.playwright-mcp/` dir of
`page-<timestamp>.png`), Playwright run outputs (`test-results/`, `playwright-report/`,
`blob-report/`, `.last-run.json`, the report `index.html`), traces/videos/zips, and any temp
fixtures. The committed spec is the ONLY durable output. Once the run is done:
1. **Run `git status` first** to see exactly what the run produced, then remove only **untracked**
   files matching those artifact patterns. Never delete tracked source or the committed spec, and
   never `git clean -x` blindly (it can wipe `.env`/local config) — target the patterns explicitly.
2. **Preserve failure evidence ONLY for a quarantined APP-bug:** keep that test's trace/video/
   screenshot, move it to a known path, and reference it from the quarantine note. Delete it once
   the bug is fixed. On a green run, keep nothing.
3. **Guardrail so it stays clean:** ensure the repo's `.gitignore` covers `.playwright-mcp/`,
   `test-results/`, `playwright-report/`, `blob-report/`, `playwright/.cache/`, and `.last-run.json`.
   Add any missing entries (a small separate commit, not mixed into the spec).
4. **Verify:** end on a `git status` that shows ONLY the intended changes — the spec, the coverage
   doc, and any `.gitignore` tweak — with nothing else dangling.

**Commit:** only green specs (quarantine app-bug tests as `.fixme`/`.skip` with a linked note).
Don't commit for the user without their okay.

## Web exploration: playwright-mcp first, Claude-for-Chrome as fallback
- **Default explorer is playwright-mcp** — it returns the accessibility tree and exact role/name
  locators the writer needs, on the same engine the test will run on.
- **Fall back to Claude-for-Chrome ONLY** when playwright-mcp can't drive a widget (e.g. Radix
  tabs/popovers that ignore a programmatic click because focus is prevented) or for a visual check.
  Chrome explores with trusted OS-level events + vision, but yields coordinates/vision, not clean
  locators — so the finder MUST translate what it did back into Playwright `getByRole`/`getByLabel`
  locators. The committed spec is Playwright regardless.

## Model selection (which model per phase)
Each subagent runs on the model in its `model:` frontmatter (`flow-planner` ships `opus`, the rest
`sonnet`); the orchestrator runs on the session model. Pick by the *kind of thinking* the phase needs, not by
habit: **discovery/planning are reasoning-heavy and run once; writing/healing are code-heavy and
may iterate many times** (cost scales with tool calls, so the model choice bites hardest there).
To change a default, edit that agent's `model:` field.

| Phase · agent | Recommended | Why | Don't go below |
|---|---|---|---|
| Orchestrator (this session) | **Sonnet** (Opus for max gate rigor) | Threads outputs, enforces gates, talks to the user — judgment over volume. | Sonnet — gate enforcement needs real reasoning. |
| 1 · `flow-finder` (web) | **Sonnet** | Infers business intent from a noisy a11y tree across many MCP calls. | Haiku only for a trivial, already-known flow — it misreads intent. |
| 1 · `api-flow-finder` | **Sonnet** (Opus for deep resolver/guard graphs) | Code comprehension over schema, resolvers, guards, data model. | Haiku for tiny, obvious flows only. |
| 2 · `flow-planner` | **Opus** | Hardest step — detects surface/runner/auth/teardown/**DB-safety** and maps steps→assertions incl. **tenant-isolation**. The plan gates everything downstream, so quality here pays off most. | Sonnet if cost-bound (still solid); never Haiku. |
| 3 · `test-writer` | **Sonnet** | Best coding model; the confirmed plan removes ambiguity, so this is execution, not design. | Sonnet — weaker = flaky locators / bad teardown. |
| 4 · `validator` | **Sonnet** | TEST-bug vs APP-bug classification is subtle and safety-critical (misclassify → a real app bug gets papered over); the heal loop iterates, so cost matters. | **Never Haiku** — misclassification defeats the whole workflow. |
| 5 · `reviewer` | **Sonnet** (Opus for a deep audit) | Flakiness / coverage-gap judgment over a small diff. | Haiku for a light lint-style pass only. |

Rules of thumb:
- **Reasoning that gates downstream work → Opus.** `flow-planner` is the one phase clearly worth the upgrade; a bad plan wastes every phase after it.
- **Code gen & iterative healing → Sonnet** — the coding sweet spot, and cheap enough to survive a heal loop.
- **Haiku only where a mistake is cheap and the input is unambiguous** — never for planning or the validator's bug-classification.
- Override at dispatch by editing the agent's `model:` frontmatter (e.g. bump `flow-planner` to `opus` for a large/complex repo, drop a finder to `haiku` for a throwaway flow).

## Notes
- React and Next.js share the web path; the planner adapts to whichever the repo is.
- Pass each subagent only what the next phase needs; keep run/heal logs out of the main thread.
