'use strict';

const express = require('express');
const { db, nextId, findById } = require('../lib/db');
const { requireRole } = require('../middleware/auth');
const { canTransition } = require('../lib/status');

const router = express.Router();

// Orders whose discount exceeds this threshold need manager approval to confirm.
const DISCOUNT_APPROVAL_THRESHOLD = 15;

const INVOICE_TERMS_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const order = findById('orders', req.params.id);
  if (!order) return res.status(404).json({ error: 'order not found' });
  res.json(order);
});

// POST /api/orders/:id/approve-discount  (sales_manager)
// Maker-checker: a manager signs off a large discount so the rep can confirm.
router.post('/:id/approve-discount', requireRole('sales_manager'), (req, res) => {
  const order = findById('orders', req.params.id);
  if (!order) return res.status(404).json({ error: 'order not found' });
  order.approvedBy = req.user.id;
  order.approvedAt = new Date().toISOString();
  res.json(order);
});

// POST /api/orders/:id/confirm  (sales_rep)
// PENDING -> CONFIRMED. If the discount is over threshold, manager approval
// (approvedBy set) is required first, else 403.
router.post('/:id/confirm', requireRole('sales_rep'), (req, res) => {
  const order = findById('orders', req.params.id);
  if (!order) return res.status(404).json({ error: 'order not found' });

  if (!canTransition('order', order.status, 'CONFIRMED')) {
    return res
      .status(409)
      .json({ error: `cannot confirm an order in status ${order.status}` });
  }

  // Large-discount gate. NOTE: order.discountPct is stored as a fraction
  // (0.15 = 15%), compared here against the threshold constant 15.
  if (order.discountPct > DISCOUNT_APPROVAL_THRESHOLD && !order.approvedBy) {
    return res
      .status(403)
      .json({ error: 'discount requires manager approval' });
  }

  order.status = 'CONFIRMED';
  order.confirmedAt = new Date().toISOString();
  res.json(order);
});

// POST /api/orders/:id/fulfil  (sales_rep)
// CONFIRMED -> FULFILLED. Auto-creates an UNPAID invoice due in 30 days,
// copying the order totals. This is the order -> invoice handoff.
router.post('/:id/fulfil', requireRole('sales_rep'), (req, res) => {
  const order = findById('orders', req.params.id);
  if (!order) return res.status(404).json({ error: 'order not found' });

  if (!canTransition('order', order.status, 'FULFILLED')) {
    return res
      .status(409)
      .json({ error: `cannot fulfil an order in status ${order.status}` });
  }

  const now = new Date();
  const invoice = {
    id: nextId('inv'),
    orderId: order.id,
    customerId: order.customerId,
    status: 'UNPAID',
    lineItems: order.lineItems.map((li) => ({ ...li })),
    subtotal: order.subtotal,
    discountPct: order.discountPct,
    discountAmount: order.discountAmount,
    tax: order.tax,
    total: order.total,
    dueDate: new Date(now.getTime() + INVOICE_TERMS_DAYS * DAY_MS).toISOString(),
    paidAt: null,
    createdAt: now.toISOString(),
  };
  db.invoices.push(invoice);

  order.status = 'FULFILLED';
  order.fulfilledAt = now.toISOString();
  order.invoiceId = invoice.id;

  res.status(201).json({ order, invoice });
});

module.exports = router;
