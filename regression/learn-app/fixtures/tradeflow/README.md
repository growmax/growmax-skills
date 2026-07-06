# TradeFlow

A small B2B sales-order pipeline API. TradeFlow models how a seller turns a
sales conversation into cash, one document at a time.

## The happy path

```
Quote  ->  Order  ->  Invoice  ->  Payment
```

1. A **sales rep** drafts a **quote** for a customer, with line items priced
   from the product catalog. Money math (subtotal, discount, 5% tax, total)
   is computed for the quote.
2. The rep **sends** the quote to the customer. Sent quotes carry an expiry.
3. The customer **accepts** the quote. The rep then **converts** the accepted
   quote into a **sales order**.
4. The order is **confirmed**, then **fulfilled**. Fulfilment automatically
   raises an **invoice** for the customer.
5. **Finance** records **payments** against the invoice until it is fully paid.

Every document has a `status` and links back to the document it came from, so
you can trace a customer's money from the first quote all the way to cash:

```
quote.id  <-  order.quoteId  <-  invoice.orderId  <-  payment.invoiceId
```

## Roles

- `sales_rep` — creates quotes and orders, drives the sales steps.
- `sales_manager` — approves large discounts.
- `finance` — records payments.

## Running

```
npm install
npm start
```

Data is in-memory (see `src/lib/db.js`); the server resets on restart.
See `docs/pipeline.md` for the document lifecycle and status rules.
