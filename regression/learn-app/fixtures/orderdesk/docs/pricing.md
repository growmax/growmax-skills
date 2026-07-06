# Pricing

How OrderDesk computes what a buyer pays.

## Unit prices

Every product has a single unit price. The cart snapshots the product's price
at the moment the item is added.

## Minimum order value

Orders whose total is below the configured minimum order value are rejected.
The minimum is stored in settings (`minOrderValue`) and defaults to **50**.
Admins can change it via `PUT /api/admin/settings`.

## Bulk discount

Orders over 500 get a 5% bulk discount. The discount is applied to the cart
subtotal before the order total is computed.

## Currency

Amounts are plain numbers in the organization's configured currency
(settings key `currency`, default `USD`). Admins can change it via
`PUT /api/admin/settings`.
