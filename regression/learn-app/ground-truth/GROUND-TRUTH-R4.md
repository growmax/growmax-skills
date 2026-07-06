# GROUND TRUTH — Round 4 (TradeFlow: multi-step business flows)

**Fixture:** `pm-validation/sample/tradeflow/`
**Commit:** `adff98a` ("TradeFlow sample app")
**App:** Plain Express (CommonJS), in-memory data, single-tenant. A B2B
sales-order pipeline: quote → order → invoice → payment.

This round scores whether an auto-doc tool reconstructs **multi-step business
flows and the document chain**, not just an endpoint list. The scoring rubric
weights flow reconstruction and truthfulness (the discount bug) above
endpoint enumeration.

---

## 1. Modules, routes, and required role per step

Auth model (`src/middleware/auth.js`): every `/api/*` route requires
`requireAuth` — headers `x-user-id` + `x-user-role`; missing/invalid → **401**.
Role is one of `sales_rep`, `sales_manager`, `finance`. `requireRole(...)`
enforces per-step roles → **403** on wrong role.

| Method | Path | Role required | Purpose | File |
|---|---|---|---|---|
| GET | `/health` | none (outside `/api`) | liveness | server.js |
| GET | `/api/customers` | any authed | list customers | routes/customers.js |
| GET | `/api/customers/:id` | any authed | get customer | routes/customers.js |
| POST | `/api/customers` | sales_rep, sales_manager | create customer | routes/customers.js |
| GET | `/api/products` | any authed | list products + prices | routes/products.js |
| GET | `/api/products/:id` | any authed | get product | routes/products.js |
| POST | `/api/quotes` | sales_rep | create DRAFT quote | routes/quotes.js |
| GET | `/api/quotes/:id` | any authed | get quote | routes/quotes.js |
| POST | `/api/quotes/:id/send` | sales_rep | DRAFT → SENT | routes/quotes.js |
| POST | `/api/quotes/:id/accept` | sales_rep | SENT → ACCEPTED | routes/quotes.js |
| POST | `/api/quotes/:id/convert` | sales_rep | ACCEPTED → CONVERTED, create order | routes/quotes.js |
| GET | `/api/orders/:id` | any authed | get order | routes/orders.js |
| POST | `/api/orders/:id/approve-discount` | sales_manager | set approvedBy/approvedAt | routes/orders.js |
| POST | `/api/orders/:id/confirm` | sales_rep | PENDING → CONFIRMED | routes/orders.js |
| POST | `/api/orders/:id/fulfil` | sales_rep | CONFIRMED → FULFILLED, create invoice | routes/orders.js |
| GET | `/api/invoices/:id` | any authed | get invoice + payments[] + balanceDue | routes/invoices.js |
| POST | `/api/invoices/:id/payments` | finance | record a payment, re-derive status | routes/payments.js |

Note: reads (GET) are gated only by `requireAuth` (any of the three roles);
they are NOT restricted to a specific role. Only the write/action endpoints
carry `requireRole`.

---

## 2. The three business flows (step-by-step) + state machines

State machines live in `src/lib/status.js` (`canTransition(docType, from, to)`).
An illegal transition returns **409**.

```
QUOTE:    DRAFT ──send──▶ SENT ──accept──▶ ACCEPTED ──convert──▶ CONVERTED
ORDER:    PENDING ──confirm──▶ CONFIRMED ──fulfil──▶ FULFILLED
INVOICE:  UNPAID ──(partial pmt)──▶ PARTIALLY_PAID ──(full pmt)──▶ PAID
          (UNPAID can also go straight to PAID on a single full payment;
           PARTIALLY_PAID → PARTIALLY_PAID or PAID)
```

**Document chain (trace the money):**
```
quote.id  ◀── order.quoteId       (quote → order handoff, on convert)
order.id  ◀── invoice.orderId     (order → invoice handoff, on fulfil)
invoice.id ◀── payment.invoiceId  (invoice → payment allocation)
```
Back-links too: `quote.convertedOrderId`, `order.invoiceId` are stamped when
the child document is created.

### Flow A — Quote lifecycle (actor: sales_rep)

1. **Create** — `POST /api/quotes` with `{ customerId, lineItems:[{productId, qty}], discountPct }`.
   - Precondition: customer exists (else 400), ≥1 valid line item (else 400).
   - Each line is priced from the catalog (`product.price`) — client cannot set unitPrice.
   - `money.js` computes subtotal/discountAmount/tax/total.
   - Result: quote in **DRAFT**, `sentAt=null`, `expiresAt=null`.
2. **Send** — `POST /api/quotes/:id/send`.
   - Precondition: status DRAFT (else 409).
   - Result: **SENT**; stamps `sentAt=now`, `expiresAt = now + 14 days`.
3. **Accept** — `POST /api/quotes/:id/accept`.
   - Precondition: status SENT (else 409) **AND** `now <= expiresAt`
     (past expiry → **409 "quote expired"**). ← the expiry gate.
   - Result: **ACCEPTED**; stamps `acceptedAt`.
4. **Convert** — `POST /api/quotes/:id/convert`.
   - Precondition: status ACCEPTED. If already CONVERTED → **409 "quote already converted"**
     (checked explicitly before the state machine). Any other non-ACCEPTED → 409.
   - Result: quote → **CONVERTED** (`convertedOrderId` set); creates an **Order**
     in **PENDING** with `order.quoteId = quote.id`, copying line items + all totals.
   - **Only from ACCEPTED and only once** — this is the quote→order handoff.

### Flow B — Order lifecycle + discount-approval sub-flow

Order enters **PENDING** at conversion.

1. **Confirm** — `POST /api/orders/:id/confirm` (sales_rep).
   - Precondition: status PENDING (else 409).
   - Discount gate (see §4 / the bug): if `order.discountPct > 15` **and** no
     `approvedBy` → **403 "discount requires manager approval"**.
   - Result: **CONFIRMED**; stamps `confirmedAt`.
2. **Approve discount** (maker-checker sub-flow) — `POST /api/orders/:id/approve-discount`
   (**sales_manager only**; sales_rep/finance → 403).
   - Result: sets `approvedBy = manager userId`, `approvedAt`. No status change.
   - Intended flow: manager approves → rep can then confirm. (In practice the
     confirm gate never fires — see §4 bug — so approval is not actually
     required. The endpoint still works if called.)
3. **Fulfil** — `POST /api/orders/:id/fulfil` (sales_rep).
   - Precondition: status CONFIRMED (else 409; fulfilling a PENDING order → 409).
   - Result: order → **FULFILLED** (`invoiceId` set); auto-creates an **Invoice**
     in **UNPAID**, `dueDate = now + 30 days`, `invoice.orderId = order.id`,
     copying order line items + totals. ← the order→invoice handoff.

### Flow C — Invoice + payment allocation (actor: finance)

Invoice enters **UNPAID** at fulfilment.

1. **Record payment** — `POST /api/invoices/:id/payments` with `{ amount }` (finance only).
   - Precondition: invoice exists; `amount > 0` (else 400).
   - Running total `projected = sum(existing payments) + amount`.
   - **Overpayment guard**: if `projected > invoice.total` → **400 "overpayment not allowed"**,
     payment rejected (not recorded).
   - Else payment is recorded and status re-derived:
     - `projected >= total` → **PAID** (stamps `paidAt`).
     - `projected < total` → **PARTIALLY_PAID**.
2. **Read invoice** — `GET /api/invoices/:id` returns the invoice with
   `payments[]`, `paidTotal`, and computed `balanceDue = total - paidTotal`.

Allocation/running-balance logic lives in `routes/payments.js`
(`paidTotal()` + the projected-total comparison). Balance display logic is in
`routes/invoices.js`.

---

## 3. Money math (`src/lib/money.js`)

`computeTotals(lineItems, discountPct)`:
- `subtotal = Σ (qty × unitPrice)`, rounded to 2 dp.
- `discountPct` is a **FRACTION in [0,1]** (0.1 = 10%).
- `discountAmount = subtotal × discountPct`.
- `taxable = subtotal − discountAmount`.
- `tax = taxable × 0.05` (**TAX_RATE = 5%**, applied to the discounted subtotal).
- `total = taxable + tax`.
All values rounded to 2 dp via `round2`. This same function prices quotes;
orders and invoices **copy** the computed totals forward (they are not
recomputed), so the numbers stay identical down the chain.

Partial/full/over-payment logic: `src/routes/payments.js`. Balance-due
computation: `src/routes/invoices.js` (`GET /api/invoices/:id`).

---

## 4. THE SUBTLE FLOW BUG — discount approval never triggers (units mismatch)

**Location:** `src/routes/orders.js`, confirm handler.

```js
const DISCOUNT_APPROVAL_THRESHOLD = 15;              // intended: 15 percent
...
if (order.discountPct > DISCOUNT_APPROVAL_THRESHOLD && !order.approvedBy) {
  return res.status(403).json({ error: 'discount requires manager approval' });
}
```

`order.discountPct` is stored as a **fraction** (0.15 = 15%, per `money.js`),
but the threshold constant `15` represents 15 **percent**. So the guard only
fires when `discountPct > 15`, i.e. a discount above **1500%** — which is
impossible for any real quote (a valid fraction is ≤ 1). **Therefore the
discount-approval gate NEVER triggers**, `confirm` always succeeds regardless of
discount, and the entire `approve-discount` maker-checker sub-flow is **dead
code** — it can be called and will set `approvedBy`, but confirm never needs it.

**Real behavior:** any order can be confirmed by a sales_rep with no manager
approval, no matter how large the discount.

**Apparent intent (what the code LOOKS like it does):** "orders with a discount
over 15% require sales_manager approval before confirmation."

### Expected handling by the doc tool
- **PASS** if it: (a) describes confirm's **real** behavior truthfully — that
  confirm currently succeeds regardless of discount / the approval gate does not
  effectively fire — AND (b) flags the `15` vs fraction units mismatch as a
  **suspected bug / suggestion** (the threshold should be `0.15`, or the
  comparison should multiply by 100).
- **PARTIAL** if it documents the maker-checker approval sub-flow (approve-discount
  endpoint, sales_manager role) and notes the gate but does NOT catch that it
  never fires.
- **FAIL** if it states as **plain fact** "orders over 15% discount require
  manager approval" with no caveat — that is the apparent intent, not the real
  behavior. Presenting intent as fact is the truthfulness failure this round
  tests.

The bug should be surfaced in a **suggestions/risks** section, NOT baked into
the flow description as if it were correct behavior.

---

## 5. Legit human-intent questions vs the bug-suggestion

A good doc separates **facts the code proves** from **things a human must
confirm**. Legit clarifying questions to route to a human (NOT to assert):
- Should quote validity be 14 days, or configurable per customer/product?
- Should the discount-approval threshold be 15% (fraction 0.15), and who besides
  sales_manager may approve? (This is intent — the tool should ASK, and
  separately FLAG that the current constant is a units bug.)
- On expiry, should a SENT quote auto-transition to an EXPIRED state, or only be
  blocked at accept time? (Code only blocks at accept; there is no EXPIRED status.)
- Is overpayment truly disallowed, or should it create a credit/refund? (Code
  rejects with 400.)
- Should invoice terms be a flat 30 days or per-customer?
- Are reads intentionally open to all three roles, or should finance-only /
  rep-only read scoping apply?

Keep these as **questions**. The units mismatch (§4) is different: it is a
**concrete bug** the code proves, so it belongs in suggestions as a flagged
defect, not as an open question.

---

## 6. Write-endpoint list (state-changing)

1. `POST /api/customers` — create customer (sales_rep, sales_manager)
2. `POST /api/quotes` — create DRAFT quote (sales_rep)
3. `POST /api/quotes/:id/send` — DRAFT→SENT (sales_rep)
4. `POST /api/quotes/:id/accept` — SENT→ACCEPTED, expiry-gated (sales_rep)
5. `POST /api/quotes/:id/convert` — ACCEPTED→CONVERTED, creates order (sales_rep)
6. `POST /api/orders/:id/approve-discount` — sets approvedBy (sales_manager)
7. `POST /api/orders/:id/confirm` — PENDING→CONFIRMED, discount gate [BUGGY] (sales_rep)
8. `POST /api/orders/:id/fulfil` — CONFIRMED→FULFILLED, creates invoice (sales_rep)
9. `POST /api/invoices/:id/payments` — records payment, re-derives status (finance)

All GET routes (`/api/customers`, `/api/customers/:id`, `/api/products`,
`/api/products/:id`, `/api/quotes/:id`, `/api/orders/:id`, `/api/invoices/:id`,
`/health`) are read-only.

---

## 7. What a GOOD flow doc looks like (scoring guidance for flow-discovery)

The primary thing scored: does the generated doc **reconstruct connected
flows and the document chain**, not just list endpoints in isolation?

A strong doc should:
- Present a **pipeline/flow overview** showing quote → order → invoice → payment
  as one connected revenue pipeline, with the doc-chain link fields
  (`order.quoteId`, `invoice.orderId`, `payment.invoiceId`) explicit.
- Draw or describe each **state machine** (DRAFT→SENT→ACCEPTED→CONVERTED;
  PENDING→CONFIRMED→FULFILLED; UNPAID→PARTIALLY_PAID→PAID) and note that illegal
  transitions 409.
- Describe the two **handoffs** as steps that create the next document
  (convert creates an order; fulfil creates an invoice).
- Capture the **maker-checker approval** sub-flow (rep confirms; manager approves
  large discount) — AND flag the bug (§4).
- Capture the **expiry gate** (accept blocked past 14-day expiry) and the
  **allocation/balance** logic (partial vs full vs overpayment; running balance).
- Attach **per-document notes that CROSS-LINK** to neighbours (a quote note that
  points to the order it converts into, etc.) rather than treating each endpoint
  as standalone.
- Map **roles to steps** (sales_rep drives quote/order steps, sales_manager
  approves discounts, finance records payments).

A weak doc (lower score) merely lists the 17 endpoints with method+path and
maybe status codes, without the pipeline, chain, state machines, or handoffs.

### Docs discrepancy to note
The repo's own `docs/pipeline.md` says "A quote can be converted once accepted"
without mentioning the **14-day expiry gate on accept** (nor the
convert-only-once 409). A thorough doc tool that reads code + docs should catch
that the code is stricter than the doc (accept is expiry-gated; the doc is
vaguer than the code). This is a doc-vs-code drift, distinct from the §4 bug.
