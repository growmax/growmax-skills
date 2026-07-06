# Document pipeline

TradeFlow moves a customer's business through four linked documents. Each
document has a status; transitions are enforced centrally in
`src/lib/status.js`.

## Quote

```
DRAFT -> SENT -> ACCEPTED -> CONVERTED
```

- A quote is created in `DRAFT` with line items.
- Sending a quote moves it to `SENT`.
- The customer can `ACCEPT` a sent quote.
- Once accepted, a quote can be converted into a sales order (moves to
  `CONVERTED`).

> A quote can be converted once accepted.

Rejected/expired handling is minimal in this MVP.

## Order

```
PENDING -> CONFIRMED -> FULFILLED
```

- Converting a quote creates an order in `PENDING`.
- Confirming moves it to `CONFIRMED`. Orders with a large discount require
  manager approval before they can be confirmed.
- Fulfilling a confirmed order moves it to `FULFILLED` and raises an invoice.

## Invoice

```
UNPAID -> PARTIALLY_PAID -> PAID
```

- Fulfilment creates an invoice in `UNPAID`, due 30 days out.
- Payments are recorded against the invoice. Partial payments move it to
  `PARTIALLY_PAID`; once fully covered it becomes `PAID`.

## Money

All documents share the same math (`src/lib/money.js`): line subtotal, an
order/quote-level discount, then tax at 5% on the discounted subtotal, then the
total. Amounts are copied forward when a document is converted so the numbers
stay consistent down the chain.
