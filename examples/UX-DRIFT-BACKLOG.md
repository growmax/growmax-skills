# UX Drift Backlog — the living work queue (companion to `.claude/UI-STANDARDS.md`)

> **Install:** copy into the product repo as `docs/ux-drift-backlog.md` and commit it.
> This file is the **state** of the standards effort: every known deviation from
> `.claude/UI-STANDARDS.md`, one row each, with the rule it violates and a status. The
> standards doc stays stable; this file churns. `/ux-audit` appends verified rows here;
> `/ux-migrate` works them off top-down and flips statuses. Humans edit priorities freely.
>
> Statuses: `open` → `in-progress` → `done (commit)` | `wont-fix (reason)` | `accepted (reason)`

Seeded 2026-07 from the v1 guidelines' §11 audit (file:line references were verified then —
re-verify before fixing; the code may have moved).

## P1 — adopt the dead/near-dead shared components (biggest win)

| ID | Task | Files | Rule | Status |
|---|---|---|---|---|
| D-001 | `NotesAndTerms` is used by ZERO pages — replace each hand-rolled Notes/Terms card with `<NotesAndTerms>` | `quotes/edit-v2.tsx`, `orders/sales/edit.tsx`, `invoices/sales/edit.tsx` (and siblings) | CMP-2 | open |
| D-002 | `FinancialSummary` used only by `orders/purchase/edit.tsx` — migrate the re-implemented totals cards | quotes, sales orders, sales invoices edit screens | CMP-2 | open |
| D-003 | Hand-rolled line-items `<Table>` + customer `<Select>` → `LineItemsTable` + `useDocumentLineItems` + `CustomerSelector` | `credit-notes/create.tsx` | CMP-2 | open |
| D-004 | Hand-rolled items `<Table>` → `LineItemsTable` | `returns/create.tsx` | CMP-2 | open |

## P1 — deprecated footer action bars (ACT-1)

| ID | Task | Files | Rule | Status |
|---|---|---|---|---|
| D-005 | Bottom-right footer bar (`Cancel` + `Record Collection`) → move into `DocumentPageHeader` `actions` | `pages/payments/collection/create.tsx` | ACT-1 | open |
| D-006 | Bottom-right footer bar (`Cancel` + `Create Credit Note`) → move into `DocumentPageHeader` `actions` | `pages/credit-notes/create.tsx` | ACT-1 | open |

## P2 — realign shipped components to the standard

| ID | Task | Files | Rule | Status |
|---|---|---|---|---|
| D-007 | `filter-chip.tsx` ships `rounded-full` → `rounded-md` | `filter-chip.tsx` | FLT-1 | open |
| D-008 | Sort trigger height: align to the toolbar row height `h-8` (v1 doc said `h-9` — see OPEN-1 in UI-STANDARDS §16; confirm with doc owner before changing) | `sort-dropdown.tsx` | FLT-6/SRT-1 | open |

## P2 — list pages off the standard (LST-1)

| ID | Task | Files | Rule | Status |
|---|---|---|---|---|
| D-009 | Fully hand-rolled toolbar + `<Table>` → `ListPageLayout` + `DataTable` | `sku/index.tsx` | LST-1 | open |
| D-010 | Bespoke card-grid / tabbed screens → `ListPageLayout` + `DataTable` | `organizations/index.tsx`, `users/index.tsx` | LST-1 | open |
| D-011 | Wraps `DataTable` in `DocumentPageHeader` → use `ListPageLayout` | `uom/index.tsx` | HDR-5/LST-1 | open |
| D-012 | `ListPageLayout` shell but hand-rolled body (card grid / tree) → `DataTable`/`ListTable` | `brands/index.tsx`, `categories/index.tsx` | CMP-2 | open |
| D-013 | Placeholder stub, no list yet — build on `ListPageLayout` when implemented | `returns/index.tsx` | LST-1 | open |

## P2 — confirmed bug fixes (file:line verified 2026-07)

| ID | Task | Files | Rule | Status |
|---|---|---|---|---|
| D-014 | Loading skeleton looks like cards (three `<Card>`s with `rounded-full` circle + lines) → `<TableSkeleton rows columns />`; grep other lists for the same pattern | `pages/quotes/index.tsx:545-562` | LOD-1 | open |
| D-015 | Global search: `type="search"` native WebKit clear decoration collides with the custom right-side Search button (no right padding reserved) → reserve padding or drop the native decoration, as the list toolbars do with their `X` | `layout/header.tsx:53-70` | FLT-4 | open |
| D-016 | No `::selection` rule exists although `index.css:11` reserves indigo "for selection" → add global `::selection` (indigo bg / readable fg, both themes) | `index.css` | FLT-3 (token use) | open |
| D-017 | Org Settings Save/Cancel bar scrolls away (plain `flex justify-end` at form bottom) → sticky action bar or `DocumentPageHeader sticky`; scroll container is `<main class="page-shell overflow-auto">` in `dashboard-layout.tsx:45` | `pages/settings/organization.tsx:713-737` | ACT-1/HDR-6 | open |
| D-018 | Phone field renders as two misaligned boxes: base `Input` `h-10` vs `SelectTrigger` `h-9`, and the non-compact country-code trigger sets `w-[100px]` with no height. Fix: `triggerSize = compact ? 'h-8 w-[84px] text-xs' : 'h-10 w-[100px]'` — fixing the shared component fixes every phone field | `components/forms/phone-input.tsx:203` | FRM-2/OPEN-2 | open |
| D-019 | Stray vertical line inside tables: the last (actions) column is always `sticky right-0 border-l shadow-[…]` even when the table doesn't overflow horizontally → apply the sticky affordance only on actual overflow | `components/ui/data-table.tsx:163,326` | CMP-4 | open |

## Done

| ID | Task | Files | Rule | Status |
|---|---|---|---|---|
| D-020 | Dashboard greeting divider — now uses shared `SectionHeader`, hairline divider + token colors (dropped `text-900`/`text-gray-600`) | `layout/section-header.tsx` | CMP-2 | done (2026-07) |

## Accepted exceptions

*(none yet — record any deliberate deviation from UI-STANDARDS here, with the reason and the
approving person, so reviews stop re-flagging it)*
