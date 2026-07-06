'use strict';

// Shared money math for every document in the pipeline.
// A document has line items [{ productId, qty, unitPrice }] and a
// discountPct expressed as a FRACTION (0.1 = 10%).

const TAX_RATE = 0.05; // 5% tax on the discounted subtotal

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function subtotal(lineItems) {
  return round2(
    (lineItems || []).reduce((sum, li) => sum + li.qty * li.unitPrice, 0)
  );
}

// discountPct is a fraction in [0, 1]. discountAmount = subtotal * discountPct.
function computeTotals(lineItems, discountPct) {
  const sub = subtotal(lineItems);
  const pct = discountPct || 0;
  const discountAmount = round2(sub * pct);
  const taxable = round2(sub - discountAmount);
  const tax = round2(taxable * TAX_RATE);
  const total = round2(taxable + tax);
  return {
    subtotal: sub,
    discountPct: pct,
    discountAmount,
    tax,
    total,
  };
}

module.exports = { TAX_RATE, round2, subtotal, computeTotals };
