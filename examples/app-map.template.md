# App Map — <app>  ·  base: <url/port>  ·  roles walked: <anonymous, buyer>

> Canonical format for the two context docs `/app-cartograph` synthesizes from `docs/nav-manifest.json`:
> **this file** (`docs/app-map.md`, navigation) and a sibling `docs/business-flows.md` (flows, the
> second template below). Both are re-generable from the manifest. Coverage and purposes are
> human-blessed (GATE B). Network calls are distilled + secret-redacted — no tokens ever appear here.

**Coverage:** anonymous <pct>% (<v>/<d>) · buyer <pct>% (<v>/<d>).  **Unresolved:** <n surfaces — listed at bottom>.
**Auth model (observed):** anonymous sends the anonymous JWT; authed sends the access token; <gated routes redirect to /login>.

---

## Navigation tree
```
/ (home)
├─ /catalog
│  ├─ /product/[slug]        — product detail (R)
│  └─ /search               — search results (R)
├─ /cart                    — cart (R)
│  └─ /checkout             — checkout (W ⚠)
├─ /account                 — account home (authed)
│  ├─ /orders               — order history (R)
│  └─ /users                — user management (W ⚠)
└─ /login · /register       — auth (W)
```

## Routes (per-surface ground truth)
| Route | Anon | Buyer | R/W | Purpose (human-blessed) | Key APIs (redacted) |
|---|---|---|---|---|---|
| `/[locale]/product/[slug]` | visible | visible | R | Evaluate a product + start an order | `GET /api/products/:id`, `GET /api/pricing/:id` |
| `/[locale]/checkout` | →/login | visible | **W ⚠** | Review cart + place order | `GET /api/cart`, `POST /api/orders` (write) |
| `/[locale]/account/users` | →/login | visible | **W ⚠** | Manage org users | `GET/POST /api/org/users` |
| ... | | | | | |

> **R** = reads only · **W ⚠** = exposes a data write (walked up to submit only; not executed on live/UAT).

## Role × route visibility matrix
| Route | anonymous | buyer | <other roles> |
|---|---|---|---|
| `/product/[slug]` | visible | visible | … |
| `/checkout` | redirect(/login) | visible | … |
| `/account/users` | redirect(/login) | visible | … |

## Unresolved / not reached
- `<route>` — <blocked|unreachable|role-gated(role)> — <reason> (recorded honestly; not dropped).

---
---

# Business Flows — <app>   (→ docs/business-flows.md)

> Second doc. Each flow in plain language a PM could read — actor → preconditions → steps → data →
> success → APIs → R/W. Derived from the same manifest. Grouped by domain.

## <Domain — e.g. Catalog & Ordering>

### Flow: Place an order from the cart   ·   R/W: **W ⚠**
- **Actor / role:** Buyer (authed). Anonymous is redirected to login.
- **Preconditions:** logged in; cart has ≥1 item.
- **Steps:** Cart → review items → Checkout → confirm address/terms → **Place order** *(write — gated; on the live walk we stopped here)*.
- **Data touched:** reads `Cart`; on submit creates an `Order` (+ order lines).
- **Success signal:** order confirmation screen with an order number; `POST /api/orders` → 2xx.
- **APIs (redacted):** `GET /api/cart` → `POST /api/orders`.
- **Tenant/role note:** order is scoped to the buyer's org; cross-org cart/order access must be rejected.
- **Open questions:** <e.g. is a PO number required? min order value?> or none.

### Flow: <next…>
- ...

## <Domain — e.g. Account & Org>
### Flow: <…>

---
### Open questions (carried from the walk — answer to harden the context)
- <Domain>: <business rule the UI/APIs didn't reveal> or "none".
