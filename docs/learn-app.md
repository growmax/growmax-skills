# /learn-app + product-manager — the product notebook system

## What it is, in one paragraph

An AI agent forgets everything between sessions, so "a PM agent that knows the product" is really
**a knowledge base on disk + an agent that reads it**. `/learn-app` builds and maintains that
knowledge base — the **product notebook** at `docs/product/` in each repo: plain markdown notes
(Google OKF style — one note per module, YAML label on top, an INDEX.md table of contents, notes
cross-linked like a wiki), where **every claim is tagged with where it came from** (`[code]`,
`[walk]`, `[docs]`, `[human: Q-nnn ✓]`, or `[ASSUMPTION]`). The `product-manager` agent answers
questions and writes specs FROM the notebook, citing those tags — and files anything it can't
answer as a question in `docs/product/open-questions.md` for the human to answer asynchronously.

## The mental model (three things to remember)

1. **`/learn-app` teaches it.** First run in a repo = builds the notebook (reads all the code for a
   complete checklist, optionally clicks through the running app read-only, merges existing docs).
   Every later run = updates it (folds in your ledger answers + catches code drift).
2. **`product-manager` answers you.** Ask it product questions or have it write specs. It only
   speaks from the notebook, with citations. No notebook → it tells you to run `/learn-app`.
3. **`open-questions.md` is where you talk back.** Type answers under any question, whenever.
   Next `/learn-app` run, the agent has learned them permanently.

The machinery (this plugin) is shared across all repos. The knowledge (`docs/product/`) is
per-repo and never shared — each product's truth lives in its own repo, versioned by git.

## Usage

```
/learn-app                          # code-only: bootstrap or update, no live app needed
/learn-app localhost:3000           # include a read-only walk of the running app
/learn-app localhost:3000 scope: "checkout, quotes"   # focused
```

Then, any time after:
- Ask the `product-manager` agent things: "how do quote approvals work?", "write a spec for X".
- Answer questions in `docs/product/open-questions.md` when you have minutes to spare.
- Re-run `/learn-app` after answering, or after a release (it detects what changed).

**Two operating rules:**
- **Live walks use a dedicated dev/test account, never a real user.** Primary home: env vars
  `LEARN_APP_TEST_EMAIL` / `LEARN_APP_TEST_PASSWORD` (shell or gitignored `.env.local` — values
  never enter git; the notebook's `runbook.md` documents the names so it's discoverable).
  `.claude/E2E-NOTES.md` login facts work as a fallback. Without either, the walk runs
  anonymous-only and records authed pages as blocked.
- **One runner at a time, on the integration branch.** Run `/learn-app` after merges on main (or a
  dedicated notebook branch) — never concurrently in two sessions or on parallel feature branches
  (question numbering and INDEX edits collide).

**CI nudge (recommended):** copy `examples/notebook-staleness.yml` into the repo's
`.github/workflows/` — every PR that changes source but not `docs/product/` gets a non-blocking
warning to run `/learn-app`.

## Safety properties

- **Read-only walks.** The walker stops before ANY submit/create/delete — write behavior is learned
  from service code, never by executing writes. No exceptions in this command.
- **Async by design.** `/learn-app` never blocks waiting for you; ambiguity goes to the ledger.
- **No invented truth.** Guesses are tagged `[ASSUMPTION]` and mirrored as ledger questions. The
  product-manager agent may not state an untagged/assumed claim as fact.
- **Secrets redacted** at capture time and grepped again before commit (a redaction hit blocks the
  commit — findings are reported, never staged).
- **Budget-bounded.** A token ceiling is a hard cap, not a request; on a trip the engine
  auto-commits the safe partial and prints a resume line.
- **Resumable.** Every run's agent calls are journaled; a crash or budget bail resumes from the
  run id with finished calls served from cache and only unfinished work re-executing (see
  "The engine" below). Notebook state also lives in `docs/nav-manifest.json` + the notes themselves.

## Validating it on a repo you know well (recommended first run)

Run `/learn-app` on a repo whose features you know cold, then score the output against your own
knowledge — the test only counts if the answer key is in YOUR head:

| Check | How | Pass |
|---|---|---|
| Completeness | List the features/pages you know exist; compare with INDEX + notes | Nothing you know of is missing (things you *forgot* = bonus) |
| Truthfulness | Spot-check ~10 claims tagged `[code]`/`[walk]` against reality | Zero false "confirmed" facts. Wrong guesses are fine — a guess presented as fact is disqualifying |
| Question quality | Read `open-questions.md` | Only questions a human is required for (intent/policy) — no trivia answerable from code |
| Write safety | Check the dev DB / app data after a walk run | Zero rows created or modified |
| Behavior under ignorance | Ask `product-manager` 3 questions: one covered by notes, one only you know, one out of scope | Cites source for #1; says "don't know, filed Q-nnn" for #2/#3. Never bluffs |
| Learning loop | Answer 2–3 ledger questions → `/learn-app` → re-ask | Now answers with YOUR answer, citing `[human: Q-nnn ✓]` |
| Drift loop | Rename/add a route on a scratch branch → `/learn-app` | Flags the change; files a question or updates the note |

If all seven pass, trust it on the repos that matter.

## The engine (how the pipeline runs)

The census → shard → write → assemble → verify → commit procedure runs as a **deterministic
Workflow program** (`workflows/learn-app.workflow.js`), not prose the model re-interprets each run.
The AI is still the brain — reading code, writing notes, judging ambiguity — but the *steps* can no
longer be skipped, reordered, or miscounted. Watch the progress groups: Preflight → Census → Walk →
Write (shard waves) → Audit → Assembly → Verify → Commit; each phase logs what it did and the
tokens spent so far.

**Design guarantees (why this is safer than prose):**
- **Tally by set equality** — every census surface ID must appear in exactly one shard's
  placed/uncategorized/parked array, computed by the script; a gap triggers one remediation
  dispatch, then honest failure. No self-graded coverage.
- **One writer per file per run** — shards own their module notes; assembly owns the top-level
  files; the manifest has a single writer; the ledger is upsert-only (existing entries — possibly
  holding your typed answers — are untouchable by everything except fold).
- **Only Commit commits**, behind a redaction gate (findings → no commit, reported instead).
- **No credentials in prompts** (the journal is durable): walks run anonymous or with creds the
  repo itself documents in plaintext.
- **Model tiering:** opus census · sonnet scribes/walk/drift/audit · haiku for preflight, manifest
  write, format scan, verify, commit.

**The walk is continuous.** Each batch runs as a disposable subagent, so the orchestrator's context
stays flat no matter how many surfaces — the walk covers a whole app in one run without stopping to
ask (the only stop is the budget). It runs in **both bootstrap and update** mode: on an existing
notebook, `/learn-app <url>` walks the still-unwalked priority surfaces (money-path first, skipping
`[walk]`-tagged ones), upgrades those notes' `[code]` claims to `[walk]`, updates the flow status
table, hardens `ui-patterns.md`, and routes findings to `suggestions.md` — the "raise MEDIUM → HIGH
by walking" path, no rebuild required.

**Resume.** If a run dies or bails on budget: (1) the engine already committed completed work
(`docs(product): partial — …`); (2) re-invoke the Workflow tool with the SAME scriptPath,
**byte-identical args** (yes, the same `timestamp` — changing any arg invalidates the cache), and
`resumeFromRunId: <the run id>`; (3) finished calls return instantly from cache, only unfinished
work executes. Disk writes are idempotent full-file overwrites, so a re-run shard converges to the
same bytes.

**The knobs** (Workflow args — defaults are sensible):

| Knob | Default | What it does |
|---|---|---|
| `shardSize` | 8 | Modules per scribe shard (sharding engages above 10 modules) |
| `waveSize` | 4 | Shards running in parallel per wave |
| `walkBatchSize` | 6 | Surfaces per walker dispatch (walk is sequential — one browser) |
| `maxWalkWaves` | 3 | Bounded loop over newly-discovered links |
| `walkScope` | `priority` | W/write + gated surfaces first, capped at `priorityWalkCap`. `all` = everything |
| `maxWalkBatchesPerRun` | 30 | Batch backstop per run; the rest resumes next run — partial walks are first-class |
| `audit` | true | Sample ~10 `[code]` claims, re-verify vs source, accuracy % into INDEX |
| `budgetPerShardEst` / `landingReserve` | 120k / 150k | A wave starts only if `remaining > wave·est + reserve`; on trip: commit partial + resume |

## Deferred improvements (TODO — each with its trigger)

1. **Run telemetry** — a "Last run" block in INDEX: date, mode, shards, notes touched, new/folded
   questions, and the ledger answer-rate, so loop health is visible. Trigger: once notebooks are in
   steady production use.
2. **Mechanical write-block on the walk** — network-level interception that blocks every non-GET
   request except the login call, underneath the existing prompt rule + test-account requirement.
   Defense in depth: a misread instruction becomes harmless. Trigger: before walks run unattended
   or against shared environments.
3. **Env-var credential injection into walks** — after the mechanical write-block hardening lands.
4. **CENSUS payload compression** for 300+ surface apps — when a census return exceeds ~50k tokens.
5. **Retrieval at scale** — when a notebook exceeds ~100 notes or the PM agent misses notes that
   exist, run `/graphify` over `docs/product/` (notes are already cross-linked; the graph is
   nearly free) or add an embedding index.

## Pieces (for maintainers)

- `commands/learn-app.md` — the front door (gathers inputs, human-facing checks, invokes the
  Workflow tool once, relays the report).
- `workflows/learn-app.workflow.js` — the deterministic engine (census → shard → assemble → verify
  → commit; batching, tally, resume, budget all live here).
- `agents/product-scribe.md` — the scribe dispatched by the engine in scoped modes (bootstrap-shard
  / refresh-shard / assembly / assembly-touchup / fold).
- `agents/product-manager.md` — the PM persona that consumes the notebook.
- Reused from this plugin: `flow-census` (static checklist), `nav-cartographer` (read-only walk),
  the `nav-manifest.json` schema shared with `/app-cartograph`.
- Templates: `examples/product-note.template.md`, `examples/open-questions.template.md`.
