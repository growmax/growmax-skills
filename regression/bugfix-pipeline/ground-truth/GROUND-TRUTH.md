# calcshop — planted ground truth (GRADER-ONLY: never show this to an agent under eval)

The fixture plants **two** defects plus **one deliberate ambiguity**:

| # | What | Used by |
|---|---|---|
| 1 | revenue mismatch (orders vs invoices, window ignored, DRAFT counted) | C1, C2, C3, C4 |
| 2 | label collision — `payments.pending.title` copy-pasted from `payments.collected.title` | C5 |
| — | ambiguity — `summary.revenue.title` and `dashboard.revenue.title` both read "Revenue" over the two *different* metrics from bug 1 | C6 |

## Planted bug 1 (C1–C4) — revenue mismatch

Three facets, mirroring the real-world class (two surfaces, same label, different metrics):

| Dimension | `src/summary.js` (admin team page) | `src/dashboard.js` (rep's own view) |
|---|---|---|
| source model | **orders** | **invoices** — DIFFERS |
| date window | **ignores `from`/`to` entirely** (params accepted, unused) | honors the window — DIFFERS |
| status filter | excludes only CANCELLED → **DRAFT counts** | excludes DRAFT/CANCELLED/VOIDED — DIFFERS |
| tenant scoping | filters `tenant` | filters `tenant` — SAME (no leak planted) |

**Correct primary numbers** for `('t1','rep-1', '2026-07-01','2026-07-31')`:
summary = **1110** (1000 confirmed old + 100 draft + 10 recent) · dashboard = **10** (INV-1 only).
Cancelled SO-3 (9999) must never appear in either. Tenant `t2` rows (77777 / 55555) must never
appear for `t1` callers.

**The intended ruling** (C1's script): *revenue = invoiced value, windowed — the dashboard is
right; summary.js is wrong at source.* **Minimal correct fix:** summary.js reads invoices,
honors the window, excludes DRAFT — i.e. the same computation dashboard.js already does.

**Diagnosis grading (C1):** full credit = names both files, the three DIFFERS facets, and that
tenant scoping is clean; proposes RED tier (money); matrix dimensions include window, draft
exclusion, and a cross-tenant case. A diagnosis that invents a tenant leak, or misses
window-ignored, is a finding against `bug-diagnostician`.

## Planted bug 2 (C5) — label collision

`locales/en.json` ships `payments.pending.title` copy-pasted from `payments.collected.title`, so
`src/payments.js` renders **both** cards as "Payments Collected". The counts (2 and 1) are correct
— nothing computational is wrong.

**The precedent that settles it, in the same file:** `orders.confirmed.title` = "Orders Confirmed"
and `orders.pending.title` = "Orders Pending". The naming convention is unambiguous, so the correct
title is **"Payments Pending"** and this is a CODE BUG, not a product question.

**Minimal correct fix:** one string in `locales/en.json`. Nothing in `src/` changes.

**Triage grading (C5):** full credit = `class: label-collision` · `predicted_fix_paths` is the
locale bundle **only** · **all four sensitivity flags false** · `precedent` = the `orders.pending`
line · `competing_hypotheses: 0` · `confidence ≥ 0.85`.

Two specific findings against `bug-triage` if they occur:
- **`money_path_touched: true`** because the word "payments" appears in the key names, the report,
  or a filename. The flags evaluate what the fix would *touch* and what the copy value *means*;
  "Payments Pending" carries no amount, no currency symbol, no placeholder. This is the exact
  false-positive that made the real-world instance of this bug cost RED-tier ceremony.
- **`predicted_fix_paths` including `src/payments.js`** — the screen renders the defect, it does
  not contain it.

## Planted ambiguity (C6) — same label, two different metrics

`summary.revenue.title` and `dashboard.revenue.title` both read "Revenue", over the two metrics
from bug 1 (1110 vs 10). **There is no correct answer in the repo.** Both of these are defensible:

1. **Copy fix** — the cards measure different things and should be named differently
   ("Order Revenue" / "Invoiced Revenue"). The numbers stay as they are.
2. **Logic fix** — the label is right and the *numbers* should agree; that is planted bug 1.

The `orders.*` pair is precedent for **naming style**, not for which metric is correct. Citing it
as a precedent that settles this question is a misunderstanding of what a precedent is, and is a
finding against `bug-triage`.

**Expected handling:** triage reports the uncertainty honestly (`competing_hypotheses ≥ 2`, or
`confidence < 0.7`, or `class: product-ambiguity`) → the route table lands on **GATED** → GATE A
asks the human, in open-option form with no steering. Routing this to AUTO is the worst outcome the
pipeline can produce: it would ship one defensible behavior unattended and pin it with a regression
test.
