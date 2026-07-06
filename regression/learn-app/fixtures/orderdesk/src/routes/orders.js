const express = require('express');
const db = require('../lib/db');
const { requireAuth } = require('../middleware/auth');
const { computeTotal, applyTax } = require('../lib/pricing');
const { getActiveCart } = require('./cart');

const router = express.Router();

const INVOICE_DUE_DAYS = 30;

function unpaidInvoiceTotal(userId) {
  let total = 0;
  for (const invoice of db.invoices.values()) {
    if (invoice.userId === userId && invoice.status === 'UNPAID') {
      total += invoice.total;
    }
  }
  return total;
}

function visibleTo(user, order) {
  return user.role === 'admin' || order.userId === user.id;
}

// POST /api/orders — creates an order from the caller's active cart.
router.post('/', requireAuth, (req, res) => {
  const cart = getActiveCart(req.user.id);
  if (cart.items.length === 0) {
    return res.status(400).json({ error: 'cart is empty' });
  }

  const { subtotal, discount, total } = computeTotal(cart.items);

  const minOrderValue = db.settings.has('minOrderValue')
    ? db.settings.get('minOrderValue')
    : 50;
  if (total < minOrderValue) {
    return res
      .status(400)
      .json({ error: `minimum order value is ${minOrderValue}` });
  }

  if (total + unpaidInvoiceTotal(req.user.id) > req.user.creditLimit) {
    return res.status(402).json({ error: 'credit limit exceeded' });
  }

  const order = {
    id: db.nextId('o'),
    userId: req.user.id,
    items: cart.items.map((item) => ({ ...item })),
    subtotal,
    discount,
    total,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  db.orders.set(order.id, order);

  cart.items = [];
  cart.updatedAt = Date.now();

  res.status(201).json(order);
});

// POST /api/orders/:id/confirm — CONFIRMs the order and auto-creates its
// invoice (UNPAID, due in 30 days). The invoice total is the order total
// run through applyTax().
router.post('/:id/confirm', requireAuth, (req, res) => {
  const order = db.orders.get(req.params.id);
  if (!order || !visibleTo(req.user, order)) {
    return res.status(404).json({ error: 'order not found' });
  }
  if (order.status !== 'PENDING') {
    return res.status(409).json({ error: 'order is not pending' });
  }

  order.status = 'CONFIRMED';

  const { total, line } = applyTax(order.total);
  const invoice = {
    id: db.nextId('inv'),
    orderId: order.id,
    userId: order.userId,
    lines: [{ label: 'Order total', amount: order.total }, line],
    total,
    status: 'UNPAID',
    issuedAt: new Date().toISOString(),
    dueDate: new Date(
      Date.now() + INVOICE_DUE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString(),
  };
  db.invoices.set(invoice.id, invoice);

  res.json({ order, invoice });
});

router.post('/:id/flag', requireAuth, (req, res) => {
  const order = db.orders.get(req.params.id);
  if (!order || !visibleTo(req.user, order)) {
    return res.status(404).json({ error: 'order not found' });
  }
  order.flagged = true;
  res.json(order);
});

// GET /api/orders — admins see all orders, buyers see their own.
router.get('/', requireAuth, (req, res) => {
  const items = [];
  for (const order of db.orders.values()) {
    if (visibleTo(req.user, order)) {
      items.push(order);
    }
  }
  res.json({ items });
});

// GET /api/orders/:id
router.get('/:id', requireAuth, (req, res) => {
  const order = db.orders.get(req.params.id);
  if (!order || !visibleTo(req.user, order)) {
    return res.status(404).json({ error: 'order not found' });
  }
  res.json(order);
});

module.exports = router;
