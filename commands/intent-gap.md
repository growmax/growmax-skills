---
name: intent-gap
description: >-
  Close the intent gap in a vibe-coded app: turn raw human intent (meeting notes, checklists,
  chat rulings) into a durable rules register (docs/product/intent-rules.md), audit the code
  against every rule with the intent-auditor agent (verdicts: HONORED / PARTIAL / VIOLATED /
  SILENT-DEFAULT / UI-GAP / NOT-BUILT / UNDECIDABLE, all with file:line evidence), and mine the
  code for implicit decisions nobody ever made with the intent-miner agent. Output:
  docs/product/gap-register.md (the ranked what-code-disagrees-with-intent list) + new ledger
  questions for everything only the human can decide. Invoke: /intent-gap capture <notes|file> ·
  /intent-gap audit [R-ids|all] · /intent-gap mine [module|all]. Finds the bug class nothing else
  finds: code that works but disagrees with what the founder meant.
---

# /intent-gap — extract intent, diff the code against it

You are the dispatcher for the intent-gap pipeline. The premise: a gap is a diff between INTENT
and CODE, and in a vibe-coded app only the CODE side is written down. This command writes down
the intent side, then runs the diff.

Three modes by first argument (no argument + pasted notes → `capture` then offer `audit`):

## capture — raw intent → rules register

Input: pasted meeting notes / a checklist / a file path. Your job (inline, no agent needed):

1. Read `docs/product/intent-rules.md` if it exists (create with a 3-line header if not).
2. Split the raw input into ATOMIC, CHECKABLE rules — one behavior per rule. "Tax should work
   properly" is not a rule; "compound tax rates apply the rate on top of the base+prior-tax
   amount" is. Preserve the human's meaning; sharpen only the checkability. When one meeting
   line contains several rules, split it and say so.
3. Dedupe against existing R-ids and against `docs/product/decisions.md` (a D-nnn ruling already
   covering the point → cite it in the rule's Source instead of re-asserting).
4. Append each new rule:

```
## R-nnn · <short title>
**Rule:** <the checkable statement>
**Source:** [human: <who>, <date/occasion>] (+ D-nnn if a recorded ruling backs it)
**Scope:** <modules/surfaces it governs>   **Severity:** <P0|P1|P2>
**Status:** ASSERTED | RULED (D-nnn) | RETIRED
**Last audit:** — (none yet)
```

R-ids are global, monotonic, never reused. P0 = money math, tax, stock allocation, tenant
isolation. Confirm the register diff with the human before moving on.

## audit — rules register → gap register

1. Select rules: the R-ids given, else `all` non-RETIRED. Batch them by domain (~5–8 rules per
   batch: warehouse/stock · tax/money · currency · time/fiscal · RBAC · config/UX) so each
   auditor holds one coherent area.
2. Dispatch ONE `intent-auditor` agent per batch, in parallel, each with: repo root, the register
   path, its R-ids, the notebook path. They return verdict blocks as data.
3. YOU write `docs/product/gap-register.md` (full overwrite, deterministic):
   - Header: run date, rules audited, verdict tally.
   - **Ranked findings** — every non-HONORED verdict, P0 first, each with its evidence,
     layer table, gap sentence, and route. HONORED rules collapse to one summary line each.
   - Update each audited rule's `**Last audit:**` line in the register: `<date> → <VERDICT>`.
4. Fold every UNDECIDABLE's suggested question into `docs/product/open-questions.md` as new
   Q-nnn entries (ledger format; next free id; never touch existing entries). Mention them to
   the human as the "needs your ruling" list.
5. Relay: the tally, the top 3 gaps by severity, and the single next action you recommend.

## mine — code → questions nobody asked

1. Select scope: the module(s) named, else the money path first (orders, quotes, invoices,
   payments, inventory, tax) — never "everything" by default.
2. Dispatch ONE `intent-miner` agent per module group (parallel, cap ~10 questions each), with
   the ledger + decisions paths so they never re-ask.
3. Fold returned candidates into `docs/product/open-questions.md` (new Q-nnn entries, ledger
   format). Cross-link: a candidate that reveals a missing RULE gets a stub added to
   intent-rules.md as `Status: ASSERTED?` for the human to confirm in the next capture.
4. Relay: questions added, the one to answer first, and the reminder that `/advise-questions`
   can make each one cheap to decide.

## Ground rules

- **Docs-only writes** (`docs/product/*`). Never code, never DB, never git — hand the diff back
  for review.
- **Agents return data; you own every file write.** One writer per file per run — this is what
  makes parallel fan-out safe and re-runs idempotent.
- **Never invent intent.** Capture records what the HUMAN said; audit compares; mine asks.
  A recommendation belongs to product-advisor (/consult), a ruling to the human, and a ruling
  recorded in decisions.md binds every later run.
- Repeat offenders → ratchet: when a rule audits VIOLATED/SILENT-DEFAULT twice, recommend
  promoting it to a build-failing guard test (the currency-guard pattern) in your relay.
- No `docs/product/` notebook at all → still fine: capture and audit work standalone; just note
  that /learn-app would give auditors richer context.
