'use strict';

const express = require('express');
const { db, findById } = require('../lib/db');
const { round2 } = require('../lib/money');

const router = express.Router();

// Sum of all payments recorded against an invoice.
function paidTotal(invoiceId) {
  return round2(
    db.payments
      .filter((p) => p.invoiceId === invoiceId)
      .reduce((sum, p) => sum + p.amount, 0)
  );
}

function paymentsFor(invoiceId) {
  return db.payments.filter((p) => p.invoiceId === invoiceId);
}

// GET /api/invoices/:id
// Returns the invoice with its payments[] and computed balanceDue.
router.get('/:id', (req, res) => {
  const invoice = findById('invoices', req.params.id);
  if (!invoice) return res.status(404).json({ error: 'invoice not found' });
  const paid = paidTotal(invoice.id);
  res.json({
    ...invoice,
    payments: paymentsFor(invoice.id),
    paidTotal: paid,
    balanceDue: round2(invoice.total - paid),
  });
});

module.exports = router;
module.exports.paidTotal = paidTotal;
module.exports.paymentsFor = paymentsFor;
