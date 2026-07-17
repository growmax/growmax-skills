# UI-Reuse Resolver — team guide

*A one-page explainer for the ARC web team. Scope: `apps/web-vite` (admin console) only.*

## The problem it solves

Different people build "the UI for module X" in their own words. Sales needs a table + buttons +
filters; Purchase needs the same; so does every other module (quotes, invoices, returns,
inventory, customers, settings — ~40 of them). The components are **identical** — only the module
name differs. Left alone, each person hand-rolls their own copy → many divergent versions of one
thing. That drift is the most expensive kind of bug here: it looks fine in review and rots quietly.

**Real example we hit:** someone set out to build a "new" tags input. A grep found it already
existed **twice** (`product-editor.tsx`, `product-form.tsx`) — building it again would have been
copy #3, each slightly different.

## What was created (3 files, one job)

| File | What it is | How you use it |
|---|---|---|
| `hooks/ui-builder-reminder.sh (plugin)` | A hook that fires automatically when you prompt to build web UI | Nothing to do — it just reminds you |
| `skills/ui-builder/SKILL.md (plugin)` | The `/ui-builder` slash command | Type `/ui-builder <what you're building>` |
| `agents/ui-builder-resolver.md (plugin)` | A delegatable subagent (same logic, own context) | "Use the ui-builder-resolver agent to resolve …" |

All three read **one rulebook**: `.claude/UI-STANDARDS.md` (Part B Table 1 = region → component).
They are **read-only** — they point at the right component; they never edit code.

## The purpose in one line

**Point you at the existing shared component BEFORE you build a duplicate.** It answers by *screen
region* (table, header, filter row…), not by module — so the module name can't make you build a
second copy.

## It does NOT replace anything — it's the missing FIRST step

We already had the *after-the-fact* tools. This adds the *before* step:

```
BEFORE build   →   at build   →   before PR      →   periodic sweep
/ui-builder          compose the     /feature-review    /ux-audit → /ux-migrate
(this agent)       shared unit     (review gate)      (fix old drift)
```

- **`/ui-builder` (new)** — prevents drift being written.
- **`/feature-review`** — catches drift in review.
- **`/ux-audit` + `/ux-migrate`** — sweep drift that already exists.

Same rulebook, four moments. Cheaper to point someone at the right component than to detect and
migrate the wrong one — that's why the front step matters.

## How to access it live

Two ways, pick either:

**1. Slash command (inline, fastest):**
```
/ui-builder a suppliers list page with a table, filters, and a create button
```

**2. Agent (runs in its own context, doesn't clutter chat):**
```
Use the ui-builder-resolver agent to resolve a suppliers list page with a table and filters.
```

**3. Hook (automatic):** just start a prompt like "add a returns page with a table" — the reminder
appears on its own.

## What you get back

A short report per region with one of three verdicts:

- **REUSE** — a shared component exists → import it (e.g. table → `ui/data-table.tsx`, list page →
  `ListPageLayout`, buttons → `ui/button.tsx` variants).
- **EXTEND** — a close component exists → add a prop (never fork it).
- **NEW** — genuinely new (grep found nothing) → build it in the shared location AND register a
  Table 1 row in the same PR.

Plus the design rules in play (heights, radius, icons, loading, a11y) cited by ID.

## The one rule for the team

**Building UI = fine, and many people building it = fine.** What's not fine:
- forking a shared component into a private copy, or
- writing a second UI standard.

When you need something the catalog lacks → **extend the shared unit and register it** (the tool
tells you how), never a local copy.

## Quick self-check ("is it working?")

Ask the agent for the same region on two modules — e.g. "sales orders table" and "purchase orders
table". If both return the **same** component set, it's working. (They do.)
