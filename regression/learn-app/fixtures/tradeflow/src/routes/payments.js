'use strict';

const express = require('express');
const { db, nextId, findById } = require('../lib/db');
const { requireRole } = require('../middleware/auth');
const { round2 } = require('../lib/money');

// mergeParams so we can read :id (the invoice id) from the parent mount path.
const router = express.Router({ mergeParams: true });

function paidTotal(invoiceId) {
  return round2(
    db.payments
      .filter((p) => p.invoiceId === invoiceId)
      .reduce((sum, p) => sum + p.amount, 0)
  );
}

// POST /api/invoices/:id/payments  (finance)
// Record a payment against an invoice and re-derive the invoice status.
// - running paid < total  -> PARTIALLY_PAID
// - running paid >= total -> PAID (stamps paidAt)
// - a payment that would push running paid ABOVE total -> 400, rejected.
router.post('/', requireRole('finance'), (req, res) => {
  const invoice = findById('invoices', req.params.id);
  if (!invoice) return res.status(404).json({ error: 'invoice not found' });

  const amount = Number((req.body || {}).amount);
  if (!(amount > 0)) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  const alreadyPaid = paidTotal(invoice.id);
  const projected = round2(alreadyPaid + amount);

  // Overpayment guard: a single payment may not push the running total over
  // the invoice total. Payment is rejected outright.
  if (projected > invoice.total) {
    return res.status(400).json({ error: 'overpayment not allowed' });
  }

  const payment = {
    id: nextId('pay'),
    invoiceId: invoice.id,
    amount: round2(amount),
    recordedBy: req.user.id,
    createdAt: new Date().toISOString(),
  };
  db.payments.push(payment);

  // Re-derive invoice status from the new running total.
  if (projected >= invoice.total) {
    invoice.status = 'PAID';
    invoice.paidAt = new Date().toISOString();
  } else {
    invoice.status = 'PARTIALLY_PAID';
  }

  res.status(201).json({
    payment,
    invoice: {
      id: invoice.id,
      status: invoice.status,
      total: invoice.total,
      paidTotal: projected,
      balanceDue: round2(invoice.total - projected),
    },
  });
});

module.exports = router;
