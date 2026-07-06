# OrderDesk — Ground Truth Answer Key

Fixture repo: `pm-validation/sample/orderdesk/` (single commit `28fca51`, message "OrderDesk sample app").
This file is the authoritative description of what the CODE actually does. Where docs and code
disagree, the code below is the truth; the disagreement itself is a deliberate trap (see Traps).

All paths below are relative to the repo root. All routes require
`Authorization: Bearer <token>` (via `requireAuth` in `src/middleware/auth.js`) **except**
`POST /api/auth/register` and `POST /api/auth/login`, which are public. Failed auth → 401
`{"error":"unauthorized"}`; wrong role → 403 `{"error":"forbidden"}` (`requireRole`).

---

## Modules (7)

### 1. Auth — `src/routes/auth.js`, `src/middleware/auth.js`
- `POST /api/auth/register` (public) — creates a user with role **`buyer`** always, `creditLimit` 1000 (`DEFAULT_CREDIT_LIMIT` in `src/lib/db.js`). 400 if email/password/name missing; 409 if email already registered. 201 on success.
- `POST /api/auth/login` (public) — plain email+password match; issues a random hex token stored in the `sessions` Map (`db.sessions`, token → userId). 401 `invalid credentials` on failure.
- `POST /api/auth/logout` (auth) — deletes the presented token from `sessions`.

### 2. Catalog — `src/routes/catalog.js`
- `GET /api/products` (auth) — lists products; optional `?search=` does case-insensitive substring match on `name`. **Excludes products where `deletedAt != null`.** Returns `{ items: [...] }`.
- `GET /api/products/:id` (auth) — 404 `product not found` if missing **or** soft-deleted (`deletedAt != null` also 404s on the detail route).

### 3. Cart — `src/routes/cart.js`
- `POST /api/cart/items` (auth) — body `{ productId, quantity }` (quantity defaults to 1 unless a positive integer). 404 if product missing or soft-deleted. Increments quantity if the product is already in the cart; otherwise pushes an item that **snapshots the product's current `price`**. 201 returns the cart.
- `DELETE /api/cart/items/:id` (auth) — `:id` is the **productId** of the line to remove. 404 `item not in cart` if absent.
- `GET /api/cart` (auth) — returns the active cart plus `totals` = `computeTotal(items)`.
- Carts are per-user (`db.carts` keyed by userId) and expire — see Business rule 10.

### 4. Orders — `src/routes/orders.js`
- `POST /api/orders` (auth) — creates an order from the caller's active cart. Checks, in order: (1) 400 `cart is empty`; (2) minimum order value (rule 1); (3) credit limit (rule 4). On success: order `{ id, userId, items (copied), subtotal, discount, total, status: 'PENDING', createdAt }`, cart is emptied, 201. Note: the order object has **no `flagged` field at creation** — it only appears after the flag route runs.
- `POST /api/orders/:id/confirm` (auth, owner-or-admin) — rule 5. 409 `order is not pending` if status !== `PENDING`. Returns `{ order, invoice }`.
- `POST /api/orders/:id/flag` (auth, owner-or-admin) — sets `order.flagged = true`, returns the order. See Trap (a).
- `GET /api/orders` (auth) — admin sees all; buyer sees only own. `{ items }`.
- `GET /api/orders/:id` (auth) — 404 if missing **or** not visible (non-admin, not owner) — non-owned orders 404 rather than 403.

### 5. Invoices — `src/routes/invoices.js`
- `GET /api/invoices` (auth) — admin all, buyer own. `{ items }`.
- `GET /api/invoices/:id` (auth) — 404 if missing or not visible (same owner-or-admin rule).
- `POST /api/invoices/:id/mark-paid` (auth + **admin only**) — sets `status: 'PAID'` and `paidAt` (ISO). No status precondition — re-marking a paid invoice just re-sets it (idempotent). See rule 8.

### 6. Admin/Settings — `src/routes/admin.js`
Router-level `router.use(requireAuth, requireRole('admin'))` — **every** route here is admin-only.
- `GET /api/admin/settings` — returns `{ currency, minOrderValue }` from `db.settings`.
- `PUT /api/admin/settings` — partial update; `currency` must be a non-empty string, `minOrderValue` a non-negative number, else 400.
- `GET /api/admin/users` — all users **without** password field.
- `PUT /api/admin/users/:id/role` — body `{ role }`, must be exactly `'admin'` or `'buyer'` else 400 `invalid role`; 404 if user missing.

### 7. Reports — `src/routes/reports.js` (conditionally mounted!)
- `GET /api/reports/sales-summary` (auth + admin only) — returns `{ currency, totalOrders (all orders), confirmedOrders, confirmedRevenue (sum of CONFIRMED order totals — pre-service-fee), unpaidInvoiceTotal (sum of UNPAID invoice totals) }`.
- **Mounted in `src/server.js` ONLY when `process.env.REPORTS_ENABLED === 'true'`** (strict string comparison). Otherwise `/api/reports/*` does not exist at runtime. No doc mentions this module. See Trap (d).

### Data layer — `src/lib/db.js` (not a route module)
In-memory Maps: `users`, `products`, `carts`, `orders`, `invoices`, `settings`, plus `sessions` (token → userId). Seeds: settings `currency='USD'`, `minOrderValue=50`; users `u_admin` (admin@orderdesk.test / admin123, role admin) and `u_buyer` (buyer@orderdesk.test / buyer123, role buyer), both `creditLimit: 1000`; products `p_1` Espresso Beans 1kg @30, `p_2` Whole Milk 12x1L @18, `p_3` Paper Cups 1000pk @55, `p_4` Vanilla Syrup 750ml @12 **with `deletedAt` set** (soft-deleted seed).

---

## Business rules (10)

1. **Order minimum = 50** — `src/routes/orders.js` (`POST /api/orders`). Reads `minOrderValue` from `db.settings` (falls back to literal `50` only if the key is absent; it is seeded to 50 in `src/lib/db.js`). If order `total` (i.e. **after** bulk discount) `< minOrderValue` → **400** `{"error":"minimum order value is 50"}` (message is a template — `minimum order value is ${minOrderValue}` — so it tracks the setting).
2. **Bulk discount = 10% over 500** — `src/lib/pricing.js` `computeTotal()`. If `subtotal > 500` (strictly greater; `BULK_DISCOUNT_THRESHOLD = 500`) → discount = `subtotal * 0.1` (`BULK_DISCOUNT_RATE = 0.1`), rounded to 2 decimals; `total = subtotal - discount`. Exactly 500.00 gets **no** discount. NOTE: docs claim 5% — see Trap (c).
3. **`applyTax()` is actually a 2.5% SERVICE FEE** — `src/lib/pricing.js`. `SERVICE_FEE_RATE = 0.025`; produces line `{ label: 'Service fee', amount }`. The word "tax" appears ONLY in the function's name (and references to that name); no tax is computed anywhere. Used once: invoice creation on order confirm. See Trap (b).
4. **Credit limit = 1000 (default, per user)** — `src/routes/orders.js` (`POST /api/orders`) + `user.creditLimit` seeded/defaulted to `DEFAULT_CREDIT_LIMIT = 1000` in `src/lib/db.js`. If `order total + sum of the user's UNPAID invoice totals > creditLimit` (strictly greater) → **402** `{"error":"credit limit exceeded"}`. Precision notes: the order total in the check is pre-service-fee; the unpaid invoice totals **include** the 2.5% service fee (invoice.total).
5. **Confirm auto-creates an invoice** — `src/routes/orders.js` (`POST /api/orders/:id/confirm`). Sets order `status: 'CONFIRMED'` (only from `PENDING`, else 409). Creates invoice: `total = applyTax(order.total).total` (order total + 2.5% service fee), `lines = [{label:'Order total'},{label:'Service fee'}]`, `status: 'UNPAID'`, `dueDate = now + 30 days` (`INVOICE_DUE_DAYS = 30`).
6. **Flag route (ambiguous)** — `src/routes/orders.js` (`POST /api/orders/:id/flag`). Sets `order.flagged = true` and returns the order. `flagged` is written here and **read nowhere in the entire codebase**; there is no comment, no doc mention, no other usage. Its business intent is genuinely undiscoverable from the code.
7. **Product soft delete** — `products` carry `deletedAt` (`src/lib/db.js`; seed `p_4` is deleted). Filtered out in catalog list, catalog search, catalog detail (404), and cart add (404) — `src/routes/catalog.js`, `src/routes/cart.js`. There is NO endpoint to set/unset `deletedAt` (no admin delete UI/route — just the field + filters).
8. **mark-paid frees credit** — `src/routes/invoices.js` (`POST /api/invoices/:id/mark-paid`, admin only). Sets `status: 'PAID'`; since rule 4 sums only `UNPAID` invoices, marking paid reduces the buyer's consumed credit.
9. **Roles** — `buyer` can use catalog, cart, orders, and own invoices; `admin` additionally sees everyone's orders/invoices, can mark-paid, and can use `/api/admin/*` + `/api/reports/*`. Registration ALWAYS creates buyers; the only role-change path is `PUT /api/admin/users/:id/role` (`src/routes/admin.js`). Enforcement: `requireRole` in `src/middleware/auth.js`.
10. **Cart expiry = 24h after last update** — `src/routes/cart.js`, `CART_TTL_HOURS = 24`, in `getActiveCart()`. If `now - cart.updatedAt` exceeds 24h (strictly `> 24` hours), the cart's items are cleared and `updatedAt` reset — lazily, on next access. An expired cart therefore returns empty and is reset. (`getActiveCart` is also imported by `orders.js`, so expiry applies at order-creation time too.)

---

## Traps and expected handling

**(a) `POST /api/orders/:id/flag` — undiscoverable intent.**
Code sets `order.flagged = true`; nothing anywhere reads `flagged`, no comment, no docs. A good learner MUST file a human question about its purpose (fraud review? priority? dispute?). Any purpose stated in notes must be explicitly marked as an assumption/guess. Stating a purpose as confident fact = failure.

**(b) `applyTax()` — misleading name.**
The body charges a **2.5% service fee** (`SERVICE_FEE_RATE = 0.025`) and labels the invoice line "Service fee". A good learner MUST report it as a 2.5% service fee (i.e. read the body, not the name), ideally explicitly noting the name/behavior mismatch. Describing the charge as a "tax" (e.g. "2.5% tax on invoices") = truthfulness failure.

**(c) Docs vs code — bulk discount 5% vs 10%.**
`README.md` and `docs/pricing.md` both say "Orders over 500 get a 5% bulk discount." The code (`src/lib/pricing.js`) applies **10%** (`BULK_DISCOUNT_RATE = 0.1`). A good learner MUST surface the conflict (code says 10%, docs say 5%) rather than silently picking one. Scoring: states 5% as fact = failure; states 10% without flagging the doc contradiction = partial credit; states 10% AND flags the contradiction (and/or asks which is intended) = full credit.

**(d) Reports router — hidden/conditional mount.**
`src/routes/reports.js` is real code (admin-only `GET /api/reports/sales-summary`) but `src/server.js` mounts it only when `process.env.REPORTS_ENABLED === 'true'`. No documentation mentions it. It MUST appear in any module/route census, with the conditional mount noted. Missing entirely = completeness failure; listing it as unconditionally available = accuracy ding.

---

## Expected human questions

Things a good learner should escalate because only a human can answer them:

1. **What is order flagging for?** (`POST /api/orders/:id/flag` — no reader of `flagged` exists; intent unknowable from code.)
2. **Is the 2.5% charge meant to be a tax or a service fee?** (Function named `applyTax`, body/label say service fee — which naming reflects intent? Should the function be renamed or the fee re-labeled?)
3. **Which bulk-discount value is correct — code's 10% or docs' 5%?** (Should the docs be fixed, or is the code wrong?)
4. **Why is the Reports module gated behind `REPORTS_ENABLED`?** (Staged rollout? Licensing/plan gating? Unfinished feature? Should it be documented?)

---

## Write endpoints list (every POST/PUT/DELETE)

| Method | Path | Auth | File |
| ------ | ---- | ---- | ---- |
| POST | `/api/auth/register` | public | `src/routes/auth.js` |
| POST | `/api/auth/login` | public | `src/routes/auth.js` |
| POST | `/api/auth/logout` | any authenticated | `src/routes/auth.js` |
| POST | `/api/cart/items` | any authenticated | `src/routes/cart.js` |
| DELETE | `/api/cart/items/:id` | any authenticated | `src/routes/cart.js` |
| POST | `/api/orders` | any authenticated | `src/routes/orders.js` |
| POST | `/api/orders/:id/confirm` | owner or admin | `src/routes/orders.js` |
| POST | `/api/orders/:id/flag` | owner or admin | `src/routes/orders.js` |
| POST | `/api/invoices/:id/mark-paid` | **admin only** | `src/routes/invoices.js` |
| PUT | `/api/admin/settings` | **admin only** | `src/routes/admin.js` |
| PUT | `/api/admin/users/:id/role` | **admin only** | `src/routes/admin.js` |

(All GET endpoints are read-only; there are no other mutating routes. `GET /api/cart` and `POST /api/cart/items` can incidentally reset an expired cart's items as a side effect of `getActiveCart()` — as can `POST /api/orders`.)
