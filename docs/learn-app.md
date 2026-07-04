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

## Safety properties

- **Read-only walks.** The walker stops before ANY submit/create/delete — write behavior is learned
  from service code, never by executing writes. No exceptions in this command.
- **Async by design.** `/learn-app` never blocks waiting for you; ambiguity goes to the ledger.
- **No invented truth.** Guesses are tagged `[ASSUMPTION]` and mirrored as ledger questions. The
  product-manager agent may not state an untagged/assumed claim as fact.
- **Secrets redacted** at capture time and grepped again before commit.
- **Resumable.** State lives in `docs/nav-manifest.json` + the notebook itself; a crash or fresh
  session resumes where it stopped instead of restarting.

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

## Pieces (for maintainers)

- `commands/learn-app.md` — the orchestrator (mode detection, phases, context budget, hard rules).
- `agents/product-scribe.md` — writes/maintains the notebook (bootstrap / fold / refresh modes).
- `agents/product-manager.md` — the PM persona that consumes the notebook.
- Reused from this plugin: `flow-census` (static checklist), `nav-cartographer` (read-only walk),
  the `nav-manifest.json` schema shared with `/app-cartograph`.
- Templates: `examples/product-note.template.md`, `examples/open-questions.template.md`.
