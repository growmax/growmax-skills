# calcshop — planted ground truth (GRADER-ONLY: never show this to an agent under eval)

The fixture plants ONE bug with three facets, mirroring the real-world class (two surfaces, same
label, different metrics):

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
