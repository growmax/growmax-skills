# UI-STANDARDS.template — portable UI rules, to be instantiated per app

> **This is the TEMPLATE.** It contains two parts with different lifecycles:
>
> - **Part A — universal rules.** Framework-agnostic (Next.js app/pages router, React+Vite,
>   anything component-based). Adopt as-is; only the `<tunables>` (tokens, control heights)
>   come from *your* app's design doc.
> - **Part B — the per-app catalog.** Every path and component name here is a placeholder —
>   **no two apps share a folder structure**, so this part is *discovered from your repo*, not
>   copied. The bootstrap procedure at the bottom fills it in.
>
> **To adopt in a product repo:**
> 1. Copy this file to `.claude/UI-STANDARDS.md` in your app repo.
> 2. Run the **Bootstrap** section (bottom) in a Claude session — it scans YOUR repo and fills
>    Part B with your real paths and components.
> 3. Review the filled catalog with the design owner, delete rules that don't apply, commit.
>
> A completed instance (for the ink-on-paper admin app) lives at `examples/UI-STANDARDS.md` in
> growmax-skills — use it to see what "filled in" looks like, **never** copy its paths.

| | |
|---|---|
| **Source of truth** | `<your design doc, e.g. DESIGN.md>` — if this file conflicts with it, that doc wins. |
| **What lives here** | Normative rules only. Known drift/migration tasks → `docs/ux-drift-backlog.md`. |
| **Severity** | MUST/NEVER violation = BLOCKER · SHOULD violation = WARN. Cite rules by ID. |

---

## Part A — universal rules (apply to EVERY element, listed in the catalog or not)

> The catalog (Part B) governs *which component to reach for*. These rules govern *how any
> element looks and behaves*. **An element with no catalog row is never exempt from Part A.**

### CMP — composition

**CMP-1 (MUST)** Before building any new UI, check the shared component directories (Part B,
table 0) for an existing composition component. Configure; never hand-roll a region a shared
component already covers.

**CMP-2 (MUST)** One screen region → one shared component, everywhere ("compose, never fork").
The region→component mapping is Part B, table 1.

**CMP-3 (MUST)** Responsiveness is the component's job, not the page's. Pages never hardcode
fixed pixel widths that break on small screens.
*Detect:* `w-\[\d+px\]` in page/route files.

**CMP-4 (MUST)** If a shared component isn't flexible enough — fix the shared component; never
work around it in the page, and never copy a neighbour page's hand-rolled version.

**CMP-5 (MUST) — the "not in the catalog" protocol.** The catalog is a **floor, not a ceiling**.
When you need an element with no catalog row (a date-range picker, a stepper, a file-drop zone,
a tag input…):

1. **Check the primitives layer first** (Part B, table 0 — e.g. a `ui/` directory of
   shadcn/radix-style primitives). Most "missing" elements are a primitive plus composition.
2. **Grep for prior art.** If ≥2 screens already hand-roll this element, do NOT add a third
   variant — extract the best one into the shared location, migrate the others (or file a
   backlog item for them), then use it.
3. **If genuinely new:** build it in the shared components location (never inline in one page),
   obeying every Part A rule (tokens, radius, control heights, motion, a11y).
4. **Register it: add a catalog row in the same PR.** A new shared component without a catalog
   row is drift-in-waiting — the row IS part of the definition of done.
5. **Unsure whether it deserves to be shared?** Single-use, page-specific composition can live
   with the page — but its *pieces* must still be catalog components/primitives. When in doubt,
   the reviewer flags it WARN (`basis: judgment`) and a human calls it.

### TYP — typography

**TYP-1 (MUST)** One shared page-title primitive (Part B t1) with one recipe (size/weight/
tracking per your design doc), including overflow handling (`truncate`) for dynamic titles.
Never restyle titles per page.

**TYP-2 (SHOULD)** One consistent section-label recipe (small caps/muted per your design doc).

### HDR — page headers

**HDR-1 (MUST)** Every document/create/edit screen uses the shared document-header component
(Part B t1) — back affordance + title + optional inline status + subtitle + right-aligned
actions. Never hand-rolled header markup.

**HDR-2 (MUST)** The back affordance is icon-only with an accessible label — no visible "← Back"
text link. Its alignment with the content gutter is the shared component's job.

**HDR-3 (MUST)** List/landing pages use the list-page shell (Part B t1), not the document header.

**HDR-4 (SHOULD)** Long forms pin the header (with its actions) via the shared component's
sticky mode rather than any bottom bar.

### BTN — buttons

**BTN-1 (MUST)** Exactly **three visual button roles** — primary / secondary (outline) /
tertiary (ghost) — expressed via the shared button's `variant` prop. Semantic colors
(destructive/warning/success) express *tone* via variants, never hardcoded color classes on a
button.
*Detect:* raw color utilities (`bg-red-*`, `text-red-*`, hex) on button elements.

**BTN-2 (MUST)** One primary button per view.

**BTN-3 (MUST)** Buttons use the app's standard radius token — never pills (pills are reserved
for status chips, CHP-1).
*Detect:* `rounded-full` on button elements outside status-chip components.

**BTN-4 (MUST)** One default action-button scale (height + icon size + icon margin —
`<your app's control-height token, e.g. h-8>`), so headers/footers/toolbars line up across
modules. Larger scales are deliberate exceptions, not defaults.

**BTN-5 (MUST)** `type="button"` explicit unless intentionally `type="submit"`.
*Detect:* `<button` without `type=`.

### ACT — page-action placement

**ACT-1 (MUST)** Pick ONE placement for page actions on create/edit/detail screens and use it
everywhere (`<your app's choice, e.g. header top-right via the document header's actions slot;
footer bars deprecated>`). The user must find the primary button in the same place on every
screen.

**ACT-2 (MUST)** Fixed order in the action cluster: secondary (reversible) before primary; the
single primary is the outermost/last control.

### FLT / SRT — filters, search, sort

**FLT-1 (MUST)** Filter triggers are not status indicators: standard radius (not pills), no
dashed borders, no `Plus` glyph (reads as "add new"), label first + chevron.

**FLT-2 (MUST)** One accent color (your design doc's interactive accent) marks active/selected
filter state — via its token utilities only, never arbitrary-value forms or the primary color.

**FLT-3 (MUST)** Search, filter chips, and sort trigger share one toolbar row and ONE control
height (`<token>`); compose the shared toolbar component (Part B t1), never rebuild the row.

**SRT-1 (MUST)** Sort/dropdown trigger width hugs content — no fixed oversized widths.

**SRT-2 (MUST)** Shared dropdowns take label/options via props — module-specific text is never
hardcoded inside a shared component.

### CHP — status chips

**CHP-1 (MUST)** Status chips are the only pill-shaped element. Use the shared status component
(Part B t1), never ad-hoc colored spans.

**CHP-2 (MUST)** Common state is quiet (muted dot + text); exceptional state is loud (filled
pill in the matching semantic color).

### LOD — loading, empty, refresh

**LOD-1 (MUST)** Page/section loading = content-shaped skeletons mirroring the real layout —
never spinners, "Loading…" text, or full-screen overlays; the layout must not jump.
*Detect:* page-level spinner components / `Loading\.\.\.` strings.

**LOD-2 (MUST)** In-flight button actions keep a small spinner inside the button.

**LOD-3 (MUST)** Empty = honest message or the shared empty-state with a CTA. **Never
fake/fallback data.**

**LOD-4 (MUST)** One refresh affordance in one fixed position; it animates only during a
user-initiated refresh, never on initial load.

### ICO — icons

**ICO-1 (MUST)** One icon set (`<e.g. lucide-react>`), and one glyph per action app-wide — the
mapping is Part B, table 2. Never synonym glyphs for the same action.

### LST — list pages

**LST-1 (MUST)** Every list/landing page configures the shared list shell (Part B t1) — header
row and toolbar row have one fixed order of controls; nothing moved to a different corner or
dropped on some modules.

### FRM — forms

**FRM-1 (MUST)** Fields sit on a consistent responsive grid (equal cells, consistent gap);
full-width fields span explicitly; no ragged rows.

**FRM-2 (MUST)** All form controls share aligned heights and radius so adjacent controls sit
flush (align the primitives, don't patch per-page).

**FRM-3 (MUST)** Label above input with consistent required-marker convention; labels
programmatically associated (A11Y-4).

### MOT — motion

**MOT-1 (MUST)** Transitions on interactive elements follow your design doc's motion budget
(`<e.g. colors only, 150ms>`) — no hover shadows, no scale-on-press, no decorative animation.
*Detect:* `hover:shadow|active:scale|hover:scale`.

### A11Y — accessibility baseline

**A11Y-1 (MUST)** Icon-only interactive elements carry `aria-label`.
**A11Y-2 (MUST)** Popover/menu triggers carry `aria-haspopup` + `aria-expanded`.
**A11Y-3 (MUST)** Never remove focus outline without a `focus-visible` replacement.
**A11Y-4 (MUST)** Every input has an associated label.
**A11Y-5 (MUST)** State is never conveyed by color alone.

---

## Part B — the per-app catalog (FILLED BY BOOTSTRAP — placeholders below)

### Table 0 — where shared UI lives in THIS repo

| Layer | Path | Notes |
|---|---|---|
| Primitives (buttons, inputs, selects…) | `<e.g. src/components/ui/ — shadcn>` | |
| Composition components (headers, shells, toolbars) | `<e.g. src/components/layout/, list/>` | |
| Domain components (document cards, pickers) | `<e.g. src/components/documents/>` | |
| Pages/routes | `<e.g. src/pages/ or app/>` | framework: `<next-app / next-pages / vite-react / …>` |
| Design tokens | `<e.g. index.css / tailwind.config / tokens pkg>` | |

### Table 1 — region → component contract

> One row per screen region. **This table grows via CMP-5.4** — every new shared component adds
> its row in the same PR. Seed it with the regions your app actually has; the list below is a
> prompt, not a limit: page title · document header · list shell · settings header · section
> break · KPI strip · toolbar (search/filter/sort/refresh) · data table · table skeleton ·
> empty state · line items · entity pickers · notes/terms · totals/summary · status chip ·
> team/owner card · activity/history · file/PDF actions · buttons · charts · dialogs/confirm ·
> toasts · tabs · pagination · date pickers · file upload · breadcrumbs …

| Screen region | Use this (file) | Never |
|---|---|---|
| `<region>` | `<component (path)>` | `<the anti-pattern>` |

### Table 2 — icon map (one glyph per action)

| Purpose | Icon | Notes |
|---|---|---|
| Back navigation | `<glyph>` | |
| Add new / create | `<glyph>` | |
| Import / Export | `<glyph>` / `<glyph>` | |
| Refresh | `<glyph>` | |
| Search / Filter / Sort chevron | `<glyph>` / `<glyph>` / `<glyph>` | |
| Remove / clear | `<glyph>` | |
| Save / Delete | `<glyph>` / `<glyph>` | |

### Table 3 — tunables (from YOUR design doc)

| Tunable | Value | Source |
|---|---|---|
| Control height (buttons/inputs/toolbar) | `<e.g. h-8>` | `<design doc §>` |
| Radius token | `<e.g. rounded-md>` | |
| Interactive accent | `<e.g. --ring indigo>` | |
| Motion budget | `<e.g. colors only, 150ms>` | |
| Header height / gutters | `<e.g. 56px / px-4>` | |

---

## Part C — pre-ship checklist

- [ ] CMP-1/2 — every region uses its catalog component; CMP-5 followed for anything unlisted
      (prior-art grep done, new shared component registered)?
- [ ] BTN-1..5 / ACT-1..2 — three roles, one primary, standard scale, one placement?
- [ ] FLT/SRT/CHP — toolbar heights aligned, pills only on status chips, accent only on active?
- [ ] LOD-1..4 — skeletons not spinners, honest empty states, refresh spins on click only?
- [ ] FRM-1..3 — even grid, aligned control heights, associated labels?
- [ ] ICO-1 — glyphs match table 2 exactly?
- [ ] MOT-1 / A11Y-1..5 — motion budget respected; aria-labels, focus states, no color-only state?

---

## Bootstrap — how to fill Part B (run this in a Claude session in the app repo)

1. **Detect the framework:** `next.config.*` (+ `app/` vs `pages/`) → Next.js app/pages router;
   `vite.config.*` → React+Vite; adjust the routes path in table 0 accordingly.
2. **Locate the layers:** find the primitives directory (shadcn `ui/`, or equivalent), the
   composition directory (layout/list/shell components), domain components, and the design-token
   source. Fill table 0.
3. **Enumerate shared components:** list every export in the composition + domain layers; for
   each, identify the screen region it owns and its anti-pattern (what pages hand-roll instead).
   Fill table 1 — one row per region that exists TODAY. Don't invent rows for regions the app
   doesn't have.
4. **Extract the icon map** from actual usage (grep icon imports across modules; where two
   glyphs serve one action, pick the majority and file the minority as backlog drift).
5. **Extract tunables** from the design doc / tokens file. Where the design doc is silent,
   measure the dominant value in code, record it, and flag it as an open question for the owner.
6. **Reconcile:** anything that contradicts Part A (e.g. two button heights in equal use) gets
   an open-questions entry at the bottom of the instantiated file — a standard must not carry
   two answers to one question.
7. Have the design owner review the filled file; commit as `.claude/UI-STANDARDS.md`; seed
   `docs/ux-drift-backlog.md` with everything found off-standard during bootstrap.
