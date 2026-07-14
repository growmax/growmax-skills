# UI-STANDARDS — component-level UI rules (companion to DESIGN.md)

> **Install:** copy this file into the product repo as `.claude/UI-STANDARDS.md` and commit it.
> It is read by (a) any Claude session **building** UI, (b) the `ui-standards-reviewer` agent
> **verifying** a diff, and (c) the `/ux-audit` → `/ux-migrate` workflow **refactoring** drift.
> Humans read it too — it is written for both audiences.

| | |
|---|---|
| **Version** | 2.0 (2026-07 restructure of `uiuxguidelines.md` v1) |
| **Source of truth** | `DESIGN.md` ("Ink on paper"). If anything here conflicts with it, `DESIGN.md` wins and this file must be corrected. |
| **What lives here** | Normative rules only — stable, citable, versioned. |
| **What does NOT live here** | Known drift, migration tasks, and bug fixes → `docs/ux-drift-backlog.md` (the living work queue). Status notes like "component X is currently off-spec" belong there, never inline here. |
| **Change process** | PR against this file; note the driving decision in the commit message. |

## 0. How to read this document (humans and agents)

- **MUST / NEVER** — binding. A violation in a diff review is a **BLOCKER**.
- **SHOULD** — the default; deviating needs a stated reason in the PR. Violation = **WARN**.
- Every rule has a stable ID (e.g. `BTN-3`). Cite IDs in reviews, PRs, and backlog entries —
  "violates BTN-3" beats a paragraph.
- Rules that can be caught mechanically carry a **Detect** hint (a grep-able pattern). Automated
  review uses these; absence of a Detect hint means the rule needs judgment.
- If a screen genuinely needs an exception, record it in the PR description and in
  `docs/ux-drift-backlog.md` under *Accepted exceptions* — an undocumented exception is drift.

---

## 1. CMP — the composition contract (check FIRST, before building anything)

**CMP-1 (MUST)** Before building any new UI, check `src/components/list/`,
`src/components/layout/`, and `src/components/settings/` for an existing composition component.
Configure the existing one; never hand-roll a header, toolbar, button row, or filter from scratch.

**CMP-2 (MUST)** One screen region → one shared component, everywhere ("compose, never fork"):

| Screen region | Use this (file) | Never |
|---|---|---|
| Breadcrumbs | Global — `layout/breadcrumbs.tsx`, mounted once in `DashboardLayout`; set the trail via the layout store (`showBreadcrumbs` / `customBreadcrumbs`) | Rendering breadcrumbs inside a page |
| List page shell (header + toolbar + table region) | `layout/list-page-layout.tsx` (`ListPageLayout`) | A hand-rolled header/toolbar `<div>` |
| Document/create/edit header (back + title + subtitle + actions) | `layout/document-page-header.tsx` (`DocumentPageHeader`) | A bespoke header; a footer action bar (ACT-1) |
| Settings page header | `settings/settings-page-header.tsx` (`SettingsPageHeader`) | — |
| Section break / titled strip | `layout/section-header.tsx` (`SectionHeader`) | A hand-rolled `border-b` under a heading |
| KPI strip (Total / Pending / Won / …) | `list/stats-strip.tsx` (`StatsStrip`) + `StatsStripSkeleton` while loading | Card grids of KPIs |
| Search / Filters / sort / refresh row | Built into `ListPageLayout`; standalone: `list/list-toolbar.tsx` (`ListToolbar`), `ui/filters-panel.tsx`, `ui/sort-dropdown.tsx` | A hand-rolled search `<Input>` + filter buttons |
| Data table | `ui/data-table.tsx` (`DataTable`) / `ui/server-data-table.tsx`, or read-only `list/list-table.tsx` (`ListTable`) | Hand-rolled `<Table>`/`<TableHeader>`/`<TableBody>` |
| Table loading | `list/list-skeleton.tsx` (`TableSkeleton`) | Card-shaped skeletons |
| Empty list | `list/list-empty-state.tsx` (`ListEmptyState`) / `ui/empty-state.tsx` | Fake/fallback rows |
| Line items ("Quote Items" card) | `documents/LineItemsTable.tsx` + `useDocumentLineItems` (config-driven columns) | A hand-rolled items `<Table>` |
| Customer / Supplier info card | `documents/CustomerSelector.tsx` / `SupplierSelector.tsx` (wrap `PartnerSelector`) | A hand-rolled customer `<Select>` |
| Notes & Terms card | `documents/NotesAndTerms.tsx` | Hand-rolled `<Textarea>`s |
| Financial summary / totals card | `documents/FinancialSummary.tsx` | A hand-rolled subtotal/tax/total block |
| Document status pill | `documents/StatusBadge.tsx` | Ad-hoc colored spans |
| Owner & team card | `documents/TeamMembersCard.tsx` | — |
| Activity / email history | `documents/ActivityHistory.tsx` / `EmailActivity.tsx` | — |
| PDF preview/download/print | `documents/PdfActions.tsx` (`usePdfActions`) | A second PDF path |
| Buttons | `ui/button.tsx` variants (§4) | New heights/colors |
| Charts / analytics | `analytics/chart-kit.tsx` (`ChartCard`, `TrendChart`, `HBarList`, `FunnelStages`) | Pies, new chart colors, legends (series distinguish by the ink/gray palette by design) |

**CMP-3 (MUST)** Responsiveness is the component's job, not the page's. Use
`ui/responsive-container.tsx` / `ui/responsive-grid.tsx` for page/section width and grids. A page
never hardcodes fixed pixel widths that break on small screens.
*Detect:* `w-[0-9]+px|w-\[\d+px\]` in page files.

**CMP-4 (MUST)** If a shared component isn't responsive or flexible enough — fix the shared
component; never work around it in the page, and never copy a neighbour page's hand-rolled
version (that's how drift spreads).

---

## 2. TYP — typography & titles

**TYP-1 (MUST)** Page titles use the shared `PageHeading` primitive
(`src/components/ui/page-heading.tsx`), which encodes:

```tsx
<h1 className="text-xl font-semibold tracking-tight truncate">Page Title</h1>
```

- `font-semibold` (Inter semibold, per DESIGN.md) — **not** `font-bold`.
- `truncate` so long/dynamic titles (product names, order IDs) ellipsis instead of breaking layout.

*Detect:* `font-bold` on `h1`/`h2`/heading components.

**TYP-2 (SHOULD)** Section labels (not page titles) use
`text-[10-11px] uppercase tracking-wider text-muted-foreground`.

---

## 3. HDR — page headers

**HDR-1 (MUST)** Every document / create / edit screen (quotes, sales & purchase orders,
invoices, credit/debit notes, payments…) uses the shared `DocumentPageHeader`
(`src/components/layout/document-page-header.tsx`) — never hand-rolled header markup:

```tsx
<DocumentPageHeader
  backTo="/orders/purchase"                 // or onBack={() => …}
  title={isCreate ? 'Create New Purchase Order' : `PO #${po.number}`}
  subtitle="Create a new purchase order for your supplier"
  inline={<Badge>…</Badge>}                   // optional status/context chip, right of the title
  actions={<Button size="sm">Save</Button>}   // page actions — see ACT-1
/>
```

**HDR-2 (MUST)** The back affordance is an icon-only `ArrowLeft` in a **bare `<button>`** with
`aria-label="Go back"` — never a visible "← Back" text link, and never wrapped in
`<Button size="icon">` (that wrapper's padding pushes the glyph off the shared content gutter so
it stops lining up with the breadcrumb above).
*Detect:* `Back</` text links near `ArrowLeft`; `size="icon"` wrapping `ArrowLeft` in headers.

**HDR-3 (MUST)** Inline status/context badges sit after the title on the same line (the `inline`
prop) — not on their own row. The subtitle sits on its own line below, indented `pl-8` to align
under the title text.

**HDR-4 (MUST)** Page headers are 56px tall with `px-4` gutters, per DESIGN.md density rules.

**HDR-5 (MUST)** List/landing pages use `ListPageHeader` / `ListPageLayout` (title + count +
actions) instead — `DocumentPageHeader` is only for back-arrow'd detail/create/edit screens.

**HDR-6 (SHOULD)** Long forms pin their header (and its actions) with `DocumentPageHeader`'s
`sticky` prop, so Cancel/Save stay reachable while scrolling — prefer this over any bottom bar.

---

## 4. BTN — buttons

**BTN-1 (MUST)** Exactly **three** button roles, expressed via `ui/button.tsx` `variant` —
never introduce a fourth visual style:

| Role | `variant` | Look | Use case |
|---|---|---|---|
| Primary | `default` | ink black bg, white text | main call-to-action — one per view |
| Secondary | `outline` | white bg, hairline border | Cancel, reversible/low-risk actions |
| Tertiary | `ghost` | no bg/border, hover only | subtle/inline actions |

Semantic colors (`--success`, `--warning`, `--destructive`) express an action's *tone*, not a
fourth style. Today the component ships `destructive` (filled red). A lower-emphasis destructive
(outline/ghost + red) must be added to `buttonVariants` first — **never hardcode red classes onto
a button**.
*Detect:* `text-red|bg-red|border-red` on `<Button`.

**BTN-2 (MUST)** Only one primary (`default` variant) button per view.

**BTN-3 (MUST)** Buttons are `rounded-md` (6px) — **never pills**. Pills are reserved for status
chips only (CHP-1).
*Detect:* `rounded-full` on `<button|<Button` outside status-chip components.

**BTN-4 (MUST)** Form / page action buttons (Cancel, Save, Create) use the **`sm` scale
(`h-8 px-2.5`, icon `h-3.5 w-3.5 mr-1.5`)** — the reference is the product editor footer
(`components/product-editor/product-editor.tsx`). `default` (`h-9 px-3`, icon `h-4 w-4 mr-2`) is
for the rare roomier standalone CTA only. Icon size/margin follows this table — not a separate
scale:

| Context | `size` | Height | Icon | Icon margin |
|---|---|---|---|---|
| Form/page actions, toolbars, dense UI (the default choice) | `sm` | `h-8 px-2.5` | `h-3.5 w-3.5` | `mr-1.5` |
| Roomier standalone CTA (rare) | `default` | `h-9 px-3` | `h-4 w-4` | `mr-2` |

```tsx
<Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>   {/* secondary */}
<Button size="sm" onClick={onSave}>                                      {/* primary — ink */}
  <Save className="mr-1.5 h-3.5 w-3.5" />
  Create product
</Button>
<Button variant="ghost" size="sm">Skip</Button>                          {/* tertiary */}
<Button variant="destructive" size="sm">Delete</Button>                  {/* destructive tone */}
```

**BTN-5 (MUST)** `font-medium` on all button labels.

**BTN-6 (MUST)** `type="button"` explicit, unless intentionally submitting a form
(`type="submit"`).
*Detect:* `<button` without a `type=` attribute.

**BTN-7 (SHOULD)** Don't wrap a single button in an unnecessary `<div>` — wrap only when
grouping multiple buttons.

---

## 5. ACT — page-action placement (the ONE rule)

**ACT-1 (MUST)** Every create / edit / detail screen puts its page actions **in the header,
top-right**, on the same line as back-arrow + title — via `DocumentPageHeader`'s `actions` prop.
There is **no bottom "footer action bar"** anywhere in the app. One accepted position means the
primary button is always in the same place.
*Detect:* `justify-end` button rows at the bottom of create/edit page files.

**ACT-2 (MUST)** Order within the actions cluster: **secondary → primary, left to right.** The
reversible button (Cancel, Save Draft) sits left; the single ink-black primary (Save, Create,
Record) is the right-most control. Sizes are `sm` (`h-8`), colors follow BTN-1 exactly.

**ACT-3 (MUST)** List/landing pages are the mirror image: title + count on the left,
`secondaryActions` (Import/Export) then the `primaryAction` (+ New …) on the right, via
`ListPageLayout`.

```tsx
// Quote / order / invoice / payment / credit note / brand / category — all identical shape.
<DocumentPageHeader
  backTo="/credit-notes"
  title={isCreate ? 'Create Credit Note' : `CN #${note.number}`}
  subtitle="Issue a credit note for the customer"
  actions={
    <>
      <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
      <Button size="sm" onClick={onSave} disabled={saving}>
        {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        Create Credit Note
      </Button>
    </>
  }
/>
```

---

## 6. FLT — filters & search (list toolbar)

**FLT-1 (MUST)** Filter chips are **not** status chips, so they are **not pills** — use
`rounded-md`, matching buttons/inputs, label first, `ChevronDown` after (rotates 180° when open):

```tsx
<button
  type="button"
  aria-haspopup="menu"
  aria-expanded={open}
  className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
>
  Category
  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
</button>
```

*Detect:* `rounded-full` in filter components.

**FLT-2 (MUST)** Never a dashed border or a `Plus` icon on a filter — that combination reads as
"add new," not "filter."
*Detect:* `border-dashed` near filter triggers.

**FLT-3 (MUST)** Only indigo (`--ring`, the behavioral accent) marks the active/selected filter
state — per DESIGN.md, indigo is the *only* interactive color; never primary black. Use the token
utilities `border-ring` / `text-ring` / `bg-ring/10` — **never** the arbitrary `border-[--ring]`
form, which emits invalid CSS because `--ring` holds bare HSL channels.

```tsx
<button className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ring bg-ring/10 text-ring px-2.5 text-sm">
  Category: Cases
  <X className="h-3.5 w-3.5" />
</button>
```

*Detect:* `\[--ring\]|\[hsl\(var\(--ring` arbitrary-value forms.

**FLT-4 (MUST)** The list-toolbar search is the shared `Input` primitive at toolbar control
height with a leading `Search` icon and an inline `X` clear button when non-empty — never a
separate search page or modal:

```tsx
<div className="relative w-64 shrink-0">
  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input value={value} onChange={…} placeholder="Search…" className="pl-9 h-8 text-sm" />
  {value && (
    <button aria-label="Clear search" onClick={clear}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
      <X className="h-3.5 w-3.5" />
    </button>
  )}
</div>
```

**FLT-5 (MUST)** Compose `ListToolbar` (`components/list/`) — never rebuild the
search + chips + sort row by hand.

**FLT-6 (MUST)** Search, filter chips, and the sort trigger share one toolbar row and one
control height: **`h-8`**. (See OPEN-1 in §13 — the v1 doc showed an `h-9` sort trigger, which
contradicts this alignment rule; `h-8` is the standard pending the owner's confirmation.)

---

## 7. SRT — sort dropdowns

**SRT-1 (MUST)** Trigger width hugs content (`w-auto whitespace-nowrap`) — never a fixed or
oversized width that leaves a gap before the chevron:

```tsx
<button className="inline-flex items-center justify-between gap-2 rounded-md border px-3 h-8 text-sm w-auto whitespace-nowrap">
  {selectedOption.label}
  <ChevronDown className="h-4 w-4 flex-shrink-0" />
</button>
```

**SRT-2 (MUST)** Label and options are per-module props (`value` / `options` / `onChange`) —
never hardcoded into the shared `SortDropdown`:

```tsx
interface SortOption { value: string; label: string; }
interface SortDropdownProps { value: string; options: SortOption[]; onChange: (value: string) => void; }
```

| Module | Sensible default | Other options |
|---|---|---|
| Products | Recently updated | Price: low to high, Price: high to low, Stock: low to high, A–Z |
| Orders | Newest first | Oldest first, Order value: high to low, Status |
| Customers | A–Z | Recently added, Most orders |
| Invoices | Due soonest | Recently issued, Amount: high to low |

---

## 8. CHP — status chips (the one place pills belong)

**CHP-1 (MUST)** Status chips (Active, Pending, Oversold, Inactive) are the **only** pill-shaped
element in the system. Use `documents/StatusBadge.tsx` — never ad-hoc colored spans.

**CHP-2 (MUST)** Per the Signal rules: common state is quiet (a muted dot + text, no chip);
exceptional state is loud (a filled pill in the matching semantic color).

---

## 9. LOD — loading, empty & refresh

**LOD-1 (MUST)** Page/section loading = content-shaped skeletons (`TableSkeleton`,
`StatsStripSkeleton` in `components/list/`) that mirror the real layout. **Never** a spinner or
"Loading…" text for page/section content, and never a full-screen/centered overlay — the layout
must not jump.
*Detect:* `Loading\.\.\.|<Spinner` at page level; `animate-spin` outside buttons and the refresh
control.

**LOD-2 (MUST)** In-flight button actions keep a small spinner **inside the button** (`Loader2`
+ `animate-spin`) — that's correct feedback, not decorative motion.

**LOD-3 (MUST)** Empty = a quiet, honest message, or `ListEmptyState` with a CTA when the list
is unfiltered. **Never fake/fallback data.**

**LOD-4 (MUST)** The only refresh affordance is the `RefreshCw` button in the toolbar's right
corner. It spins only while a **user-clicked** refresh runs — never on initial page load
(`ListPageLayout` enforces this; the legacy `isRefreshing={loading}` prop is deliberately
ignored).

---

## 10. ICO — icon reference (lucide-react)

**ICO-1 (MUST)** Icons are fixed app-wide: the same action uses the same glyph in every module.
Never a synonym glyph (`FileUp`/`FileDown`/`ArrowDownTray`/…) — consistency is what makes the
toolbars read as one system across products, orders, invoices, payments, customers.

| Purpose | Icon | Notes |
|---|---|---|
| Back navigation | `ArrowLeft` | icon-only, bare `<button>` (HDR-2) |
| Add new / create | `Plus` | primary action, `mr-1 h-4 w-4` |
| Import | `Upload` | secondary action (`outline`) |
| Export | `Download` | secondary action (`outline`) |
| Refresh | `RefreshCw` | toolbar right; `animate-spin` only while a click-refresh runs |
| Search (input affordance) | `Search` | leading icon in the search field |
| Filters trigger | `SlidersHorizontal` | the "Filters" popover button |
| Filter chip / sort chevron | `ChevronDown` | rotates 180° when open |
| Remove / clear | `X` | clear search, remove chip |
| Save | `Save` | |
| Delete (destructive) | `Trash2` | pair with `destructive` variant |

*Detect:* imports of `FileUp|FileDown|ArrowDownTray|ArrowUpTray` from lucide-react.

---

## 11. LST — list pages (one toolbar shape, everywhere)

**LST-1 (MUST)** Every list/landing page is built by **configuring `ListPageLayout`**
(`components/layout/list-page-layout.tsx`) — never by hand-rolling the header, toolbar, or
refresh button:

- **Header row:** `title` + result `count` (left) → `secondaryActions` (Import `Upload` /
  Export `Download`, `outline`) → `primaryAction` (+ New …, ink `Plus`) (right).
- **Toolbar row:** search field (left) → Filters popover (`SlidersHorizontal`) → active-filter
  chips → `flex-1` spacer → sort dropdown → refresh (`RefreshCw`) pinned to the right corner.

```tsx
<ListPageLayout
  title="Sales Orders"
  count={orders.length}
  secondaryActions={<><ImportButton /><ExportButton /></>}    // Upload / Download
  primaryAction={{ label: 'New Order', onClick: goCreate }}   // Plus (default icon)
  searchValue={search} onSearchChange={setSearch}
  filters={filters}
  sortControl={<SortDropdown … />}
  onRefresh={refetch}
>
  <ListTable … />
</ListPageLayout>
```

**LST-2 (MUST)** Don't move search, filters, sort, or refresh to a different corner, and don't
drop one on some modules while keeping it on others — the row is identical on products, orders,
invoices, customers. A page that hand-rolls this row is drift → file it in the backlog and
migrate it onto `ListPageLayout`.

---

## 12. FRM — form layout (fields on an even grid)

**FRM-1 (MUST)** Form fields on create/edit screens sit on a consistent, evenly-spaced
responsive grid — typically `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` (2 columns
for narrower forms); every field is one equal cell. Never ragged rows of differing widths.

**FRM-2 (MUST)** All inputs share the toolbar/button control height and `rounded-md` so a row of
Customer / Amount / Currency lines up flush. (See OPEN-2 in §13 on the `Input` h-10 vs
`SelectTrigger` h-9 primitive mismatch.)

**FRM-3 (MUST)** A field that must span the full width (Notes, Terms) uses `md:col-span-2` /
`lg:col-span-3` — don't leave a lone half-width field creating a visual gap.

**FRM-4 (MUST)** Label above input, `text-sm` label + required `*`; consistent vertical rhythm
(`gap-4`) between rows on every form.

---

## 13. MOT — motion

**MOT-1 (MUST)** Transitions on interactive elements are **colors only, 150ms**. No hover
shadow, no scale-on-press — a global `button:active { scale }` rule was deliberately removed;
don't reintroduce it.
*Detect:* `hover:shadow|active:scale|hover:scale` on interactive elements.

**MOT-2 (MUST)** `animate-spin` appears only on a genuine in-flight indicator (in-button
spinner, click-refresh) — never decoratively.

---

## 14. A11Y — accessibility baseline

*(New in v2 — these were implicit in v1's snippets; now binding.)*

**A11Y-1 (MUST)** Every icon-only interactive element carries an `aria-label` (back arrow →
`"Go back"`, clear search → `"Clear search"`, remove chip → `"Remove <filter>"`).
*Detect:* icon-only `<button>` without `aria-label`.

**A11Y-2 (MUST)** Popover/menu triggers (filter chips, sort dropdown, filters panel) carry
`aria-haspopup` and reflect state via `aria-expanded`.

**A11Y-3 (MUST)** Never remove a focus outline without an equivalent `focus-visible` replacement.
*Detect:* `outline-none|focus:outline-none` without an adjacent `focus-visible:` style.

**A11Y-4 (MUST)** Every form input is associated with its label (`htmlFor`/`id`, or wrapping
`<label>`), not a bare `<span>` above it.

**A11Y-5 (MUST)** State is never conveyed by color alone — CHP-2's dot + text pattern already
encodes this; keep text alongside semantic color everywhere else too.

---

## 15. Pre-ship checklist (cite the rule IDs)

- [ ] CMP-1/CMP-2 — checked `list/`, `layout/`, `settings/` for an existing composition
      component; every region uses its catalog component?
- [ ] TYP-1 — heading uses `font-semibold tracking-tight truncate` (not `font-bold`)?
- [ ] HDR-1/HDR-2 — document header via `DocumentPageHeader`; icon-only bare-button back arrow?
- [ ] BTN-2 — only one primary button in this view?
- [ ] ACT-1/ACT-2 — page actions in the header top-right (no footer bar), secondary left of the
      ink primary?
- [ ] ICO-1 — icons match the table exactly (Import=`Upload`, Export=`Download`, Add=`Plus`,
      Filter=`SlidersHorizontal`, Refresh=`RefreshCw`)?
- [ ] LST-1/LST-2 — list page configures `ListPageLayout`, nothing moved or dropped?
- [ ] LOD-1/LOD-4 — skeleton loading (no spinner/overlay); refresh is the corner button, spins
      only on user click?
- [ ] FRM-1..4 — fields on an even responsive grid, aligned heights, labels above?
- [ ] BTN-3/FLT-1/CHP-1 — `rounded-md` everywhere; pills only on status chips?
- [ ] FLT-2/FLT-3 — filter chips solid border + chevron; active state uses indigo ring tokens?
- [ ] SRT-1/SRT-2 — sort width hugs content; options come from module props?
- [ ] BTN-6 — `type="button"` explicit (or intentional `type="submit"`)?
- [ ] MOT-1 — no hover shadows or press-scale anywhere?
- [ ] A11Y-1..5 — aria-labels on icon-only controls, focus states intact, labels associated?

---

## 16. Open questions & gaps (owner: DESIGN.md maintainer)

Unresolved items found while restructuring v1 — resolve these in `DESIGN.md`/here, don't let
them linger:

- **OPEN-1 — sort trigger height.** v1 §4 showed the sort trigger at `h-9` while mandating that
  search (`h-8`), chips (`h-8`), and sort share one aligned toolbar row. `h-9` in an `h-8` row
  is a contradiction; this doc standardizes **`h-8`** (FLT-6, SRT-1). Confirm or amend.
- **OPEN-2 — primitive height mismatch.** Base `Input` is `h-10`, base `SelectTrigger` is `h-9`,
  so any select-next-to-input pairing is off by 4px (see backlog item on the phone field).
  Decide the canonical form-control height and align the primitives.
- **OPEN-3 — gaps this doc doesn't cover yet** (extract from `DESIGN.md` rather than invent):
  spacing/density scale, full typography scale, color-token table, dialog/confirmation
  conventions (esp. destructive confirmation), toast/notification rules, error & validation
  message display, date/number/currency formatting, responsive breakpoints, dark-mode rules.
