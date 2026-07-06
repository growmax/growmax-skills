// Pricing math for carts, orders, and invoices.

const BULK_DISCOUNT_THRESHOLD = 500;
const BULK_DISCOUNT_RATE = 0.1;
const SERVICE_FEE_RATE = 0.025;

function round2(value) {
  return Math.round(value * 100) / 100;
}

function computeSubtotal(items) {
  return round2(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
}

// Returns { subtotal, discount, total } for a list of cart/order items.
function computeTotal(items) {
  const subtotal = computeSubtotal(items);
  const discount =
    subtotal > BULK_DISCOUNT_THRESHOLD
      ? round2(subtotal * BULK_DISCOUNT_RATE)
      : 0;
  return { subtotal, discount, total: round2(subtotal - discount) };
}

function applyTax(total) {
  const fee = round2(total * SERVICE_FEE_RATE);
  return {
    total: round2(total + fee),
    line: { label: 'Service fee', amount: fee },
  };
}

module.exports = {
  BULK_DISCOUNT_THRESHOLD,
  BULK_DISCOUNT_RATE,
  SERVICE_FEE_RATE,
  round2,
  computeSubtotal,
  computeTotal,
  applyTax,
};
