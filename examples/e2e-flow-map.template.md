# E2E Flow Map — <app>  ·  surface(s): <web | api | both>  ·  base: <url/port from overlay/config>

> Canonical format for the map `flow-census` emits and `/e2e-map` persists to `docs/e2e-flow-map.md`.
> **Approve** by checking `Gen?` on the flows to generate, answering the Open Questions, and
> confirming the **Write policy** line below. `/e2e-batch` generates only **checked + pending** rows.
> Legend: **R** = read-only (runs autonomously in the batch). **W ⚠** = writes data (gated). Covered
> flows are listed but default **unchecked** — "map all, you pick"; the human opts in.

**Write policy / target DB:** _<unconfirmed — set this at approval>_ · read-only flows autonomous,
write flows pause once at batch time · target DB: `<local/throwaway host:port>` — **NEVER** a
shared / UAT / prod DB.

---

## <Category>   (role: <…> · surface: <web|api>)
| Gen? | ID | Flow | R/W | Intent (1 line) | Success signal (1 line) | Pri | Coverage |
|------|----|------|-----|-----------------|--------------------------|-----|----------|
| [ ]  | CAT-01 | <flow> | R | <intent> | <signal> | P0 | covered (`<spec:line>`) |
| [ ]  | CAT-02 | <flow> | W ⚠ | <intent> | <signal> | P0 | uncovered |

## API track   (surface: api)            ← only if api flows are in scope
| Gen? | ID | Flow | R/W | Intent | Success signal | Pri | Coverage |
|------|----|------|-----|--------|------------------|-----|----------|
| [ ]  | API-01 | <flow> | R | <intent> | <signal> | P0 | uncovered |

---

### Open questions (answer before approval)
- <Category>: <business rule the code didn't reveal — e.g. min search length, unique-name rule, which
  role may do X> — or "none"

### Census notes
- Routes scanned: <n web pages, n api routes>. Flows enumerated: <n> (covered <n> / partial <n> / uncovered <n>).
- Writes: <n> flows flagged ⚠ (gated in autonomous mode).
- Roles seen: <list>. Tenant/locale multipliers: <note, don't explode the map>.
- Couldn't resolve statically (would need a live walk in `/e2e-batch`): <list> or "none".

---

## Pre-approval digest   (filled by the approval-gap reviewer — read THIS before approving)
> A long map hides gaps. **Don't read every row to approve** — act on this digest. Each item is a gap
> to resolve or wave through. Generated automatically by `/e2e-map` after the census, from two passes.

### A. Structural gaps  (`approval-gap-structural` · cheap mechanical pass)
- **Routes / API ops with no flow row** (genuine omissions): <list `path` → why it matters> or "none"
- **Coverage claims with no matching spec file** (suspect `covered`): <IDs> or "none"
- **Incomplete rows** (missing success signal / role / R-W / priority): <IDs> or "none"
- **Write-safety holes** (mutating flow not flagged ⚠, or an `R` row whose intent reads like a write):
  <IDs> or "none"
- **Suspected duplicates / near-dupes**: <ID ↔ ID> or "none"
- **Unchecked-by-category tally** (what stays unauthorized if approved as-is): <Category: x/y checked …>

### B. Category gaps  (`approval-gap-category` · judgment pass)
> Whole *kinds* of flow the census likely missed — the costly-to-spot, costly-to-skip ones. Each names
> a concrete example and the risk of leaving it untested. "Checking what's present is cheap; checking
> what's absent is the expensive part" — this is that part.
- **Missing class:** <e.g. permission-denied / wrong-role negatives> — example: <concrete flow> —
  risk if skipped: <…>
- … or "categories judged complete with confidence — no manufactured gaps"

### C. Action checklist (do these, then approve)
- [ ] Add or knowingly drop the omitted rows from **A**
- [ ] Fill the incomplete rows from **A**
- [ ] Confirm or correct the write-safety flags from **A**
- [ ] Decide each category gap in **B** (add rows, or accept the gap on the record)
- [ ] Set the **Write policy / target DB** line at the top
- [ ] Check `Gen?` on every flow to generate, then hand off to `/e2e-batch`
