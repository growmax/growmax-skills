const express = require('express');
const db = require('../lib/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/sales-summary — admin only.
router.get('/sales-summary', requireAuth, requireRole('admin'), (req, res) => {
  let confirmedOrders = 0;
  let confirmedRevenue = 0;
  for (const order of db.orders.values()) {
    if (order.status === 'CONFIRMED') {
      confirmedOrders += 1;
      confirmedRevenue += order.total;
    }
  }

  let unpaidInvoiceTotal = 0;
  for (const invoice of db.invoices.values()) {
    if (invoice.status === 'UNPAID') {
      unpaidInvoiceTotal += invoice.total;
    }
  }

  res.json({
    currency: db.settings.get('currency'),
    totalOrders: db.orders.size,
    confirmedOrders,
    confirmedRevenue,
    unpaidInvoiceTotal,
  });
});

module.exports = router;
