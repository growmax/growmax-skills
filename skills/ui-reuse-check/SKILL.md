---
name: ui-reuse-check
description: "Before building ANY apps/web-vite UI, resolve a UI request to the exact shared component to reuse. Reads the rulebook (.claude/UI-STANDARDS.md Table 1 region→component, Table 0 paths, Table 2 icons, Table 3 tokens) and returns: the shared component to compose, the Part A rules that apply, and a CMP-5 verdict (reuse / extend / new). Read-only — points, never writes. Use whenever a prompt asks to create/add/build a page, screen, table, form, list, header, dialog, filter, chart, or any web-admin UI element."
trigger: /ui-reuse-check
---

# /ui-reuse-check — pre-build shared-component resolver

**Purpose.** Turn a UI request into a reuse decision *before any code is written*, so a new
screen composes the one shared component instead of hand-rolling a divergent copy. This is the
pre-build counterpart to `/ux-audit` (finds drift after) and `ui-standards-reviewer` (reviews
after). It **only points** — it reads the rulebook and answers; it never edits source.

**Scope: `apps/web-vite` only** (the seller/admin console). Mobile (`buyer-app`/`sales-app`) runs
a different design language (`@arc/design-tokens` + `SectionCard`); if the request is clearly
mobile, say so and stop — this resolver does not govern it.

## The rulebook is the source of truth

Read these, in this order, every run — do not answer from memory:
1. `.claude/UI-STANDARDS.md` — **Part B Table 1** (region → component contract) is the core lookup;
   **Table 0** (where shared UI lives), **Table 2** (icon map), **Table 3** (tunables/tokens),
   and **Part A** (universal rules CMP/TYP/HDR/BTN/ACT/FLT/SRT/CHP/LOD/ICO/LST/FRM/MOT/A11Y).
2. If a rule cites `DESIGN.md`, `DESIGN.md` wins on any conflict.

## Procedure

1. **Parse the request** into one or more *screen regions* (a page, a table, a header, a filter
   row, a form, a KPI strip, a status pill, a chart, a dialog, …). One request often = several
   regions.
2. **Look each region up in Table 1.** If there's a row → that's the component to reuse; note its
   file path (Table 0) and the "Never" column (what NOT to hand-roll).
3. **If no Table 1 row → run the CMP-5 protocol:**
   - a. Check primitives first (`src/components/ui/`, 71 ShadCN/Radix) — most "new" UI is a
     primitive + composition.
   - b. **Grep prior art** (`rg` across `src/pages/` + `src/components/`) — if ≥2 screens already
     hand-roll it, the verdict is **extract, don't add a 3rd**; name the best existing one.
   - c. Only if genuinely new → verdict **new**: build in the shared location (never inline in one
     page) + **register a Table 1 row in the same PR** (CMP-5.4).
4. **Collect the Part A rules that apply** to the regions found — control heights (Table 3: dense
   `h-8`, form `h-9`), radius (`rounded-md`/`rounded-lg`), the 3 button roles (BTN-1..5), icon
   glyph (Table 2), loading = skeletons not spinners (LOD-1), motion colors-only 150ms (MOT-1),
   a11y baseline (A11Y-1..5), currency via `formatBaseCurrency` (TYP-3).
5. **Emit the report** (below). Cite every rule by its stable ID.

## Output format

```
UI-REUSE RESOLUTION — <one-line restatement of the request>
Scope: apps/web-vite   (or: MOBILE — out of scope, stop)

REGIONS
- <region>  →  REUSE: <Component> (<file path>)        [Table 1]
              Never: <the "Never" cell>
- <region>  →  EXTEND: <Component> — add <prop/config>  [CMP-4]
- <region>  →  NEW: no catalog row. Prior-art grep: <n hits>.
              Verdict: <extract existing X | build shared + register Table 1 row (CMP-5.4)>

RULES IN PLAY
- <RULE-ID>: <one line>   (e.g. BTN-4: action buttons size="sm" h-8)
- ...

TOKENS  (Table 3)
- heights: dense h-8 / form h-9 · radius rounded-md (cards rounded-lg)
- accent indigo #4F46E5 = --ring · primary ink --primary · motion 150ms colors-only

NEXT
- Compose the components above; do not hand-roll any region with a REUSE verdict.
- For any NEW verdict: register the Table 1 row in the same PR.
- After building: run /feature-review (ui-standards-reviewer dimension) before the PR.
```

## Hard rules for this skill

- **Never write source.** Read/Grep/Glob only. The output is guidance the author (or `web-engineer`)
  acts on.
- **Never invent a component.** If Table 1 has a row, reuse it — do not propose a new one.
- **Never approve a fork.** Same region already hand-rolled elsewhere → the verdict is extract +
  migrate (or a backlog item), never a 3rd variant (CMP-5.2, CR-REUSE).
- If the request is ambiguous about which region, state the assumption and resolve the most likely
  one; flag the rest for the author.
