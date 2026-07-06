const express = require('express');
const db = require('../lib/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

function visibleTo(user, invoice) {
  return user.role === 'admin' || invoice.userId === user.id;
}

// GET /api/invoices — admins see all invoices, buyers see their own.
router.get('/', requireAuth, (req, res) => {
  const items = [];
  for (const invoice of db.invoices.values()) {
    if (visibleTo(req.user, invoice)) {
      items.push(invoice);
    }
  }
  res.json({ items });
});

// GET /api/invoices/:id
router.get('/:id', requireAuth, (req, res) => {
  const invoice = db.invoices.get(req.params.id);
  if (!invoice || !visibleTo(req.user, invoice)) {
    return res.status(404).json({ error: 'invoice not found' });
  }
  res.json(invoice);
});

// POST /api/invoices/:id/mark-paid — admin only. Marking an invoice PAID
// frees up that amount of the buyer's credit limit.
router.post('/:id/mark-paid', requireAuth, requireRole('admin'), (req, res) => {
  const invoice = db.invoices.get(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'invoice not found' });
  }
  invoice.status = 'PAID';
  invoice.paidAt = new Date().toISOString();
  res.json(invoice);
});

module.exports = router;
