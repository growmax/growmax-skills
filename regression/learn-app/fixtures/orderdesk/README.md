# OrderDesk

OrderDesk is a small B2B ordering backend. Buyers browse a product catalog,
build a cart, and place orders; confirmed orders produce invoices that admins
can mark as paid.

## Catalog

The catalog is the heart of OrderDesk. Products are listed and searched via
`GET /api/products` (optional `?search=` matches product names) and fetched
individually via `GET /api/products/:id`. Prices are unit prices in the
organization's configured currency.

## Ordering

- Buyers add catalog items to a cart, then create an order from the cart.
- Orders below the configured minimum order value are rejected.
- Orders over 500 get a 5% bulk discount.
- Confirming an order generates an invoice due in 30 days.

## API overview

| Area     | Base path        |
| -------- | ---------------- |
| Auth     | `/api/auth`      |
| Catalog  | `/api/products`  |
| Cart     | `/api/cart`      |
| Orders   | `/api/orders`    |
| Invoices | `/api/invoices`  |
| Admin    | `/api/admin`     |

See `docs/pricing.md` for pricing details.

## Running

```bash
npm install
npm start
```

The server listens on `PORT` (default 3000). All data is in-memory and resets
on restart.
