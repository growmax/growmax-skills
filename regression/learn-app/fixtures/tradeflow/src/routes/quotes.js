'use strict';

const express = require('express');
const { db, nextId, findById } = require('../lib/db');
const { requireRole } = require('../middleware/auth');
const { computeTotals } = require('../lib/money');
const { canTransition } = require('../lib/status');

const router = express.Router();

const QUOTE_VALIDITY_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

// Build normalized line items from the request, pricing each from the catalog.
function buildLineItems(rawItems) {
  return (rawItems || []).map((item) => {
    const product = findById('products', item.productId);
    if (!product) {
      const err = new Error(`unknown product ${item.productId}`);
      err.status = 400;
      throw err;
    }
    return {
      productId: product.id,
      name: product.name,
      qty: item.qty,
      unitPrice: product.price,
    };
  });
}

// POST /api/quotes  (sales_rep)
// Create a DRAFT quote for a customer with priced line items and totals.
router.post('/', requireRole('sales_rep'), (req, res) => {
  const { customerId, lineItems, discountPct } = req.body || {};
  const customer = findById('customers', customerId);
  if (!customer) return res.status(400).json({ error: 'unknown customer' });

  let items;
  try {
    items = buildLineItems(lineItems);
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message });
  }
  if (items.length === 0) {
    return res.status(400).json({ error: 'at least one line item is required' });
  }

  const totals = computeTotals(items, discountPct);
  const quote = {
    id: nextId('quote'),
    customerId,
    status: 'DRAFT',
    lineItems: items,
    ...totals, // subtotal, discountPct, discountAmount, tax, total
    sentAt: null,
    expiresAt: null,
    createdAt: new Date().toISOString(),
    convertedOrderId: null,
  };
  db.quotes.push(quote);
  res.status(201).json(quote);
});

// GET /api/quotes/:id
router.get('/:id', (req, res) => {
  const quote = findById('quotes', req.params.id);
  if (!quote) return res.status(404).json({ error: 'quote not found' });
  res.json(quote);
});

// POST /api/quotes/:id/send  (sales_rep)
// DRAFT -> SENT. Stamps sentAt and computes a 14-day expiresAt.
router.post('/:id/send', requireRole('sales_rep'), (req, res) => {
  const quote = findById('quotes', req.params.id);
  if (!quote) return res.status(404).json({ error: 'quote not found' });
  if (!canTransition('quote', quote.status, 'SENT')) {
    return res
      .status(409)
      .json({ error: `cannot send a quote in status ${quote.status}` });
  }
  const now = new Date();
  quote.status = 'SENT';
  quote.sentAt = now.toISOString();
  quote.expiresAt = new Date(now.getTime() + QUOTE_VALIDITY_DAYS * DAY_MS).toISOString();
  res.json(quote);
});

// POST /api/quotes/:id/accept  (sales_rep)
// SENT -> ACCEPTED, but only if not past expiresAt.
router.post('/:id/accept', requireRole('sales_rep'), (req, res) => {
  const quote = findById('quotes', req.params.id);
  if (!quote) return res.status(404).json({ error: 'quote not found' });
  if (!canTransition('quote', quote.status, 'ACCEPTED')) {
    return res
      .status(409)
      .json({ error: `cannot accept a quote in status ${quote.status}` });
  }
  if (quote.expiresAt && new Date() > new Date(quote.expiresAt)) {
    return res.status(409).json({ error: 'quote expired' });
  }
  quote.status = 'ACCEPTED';
  quote.acceptedAt = new Date().toISOString();
  res.json(quote);
});

// POST /api/quotes/:id/convert  (sales_rep)
// ACCEPTED -> CONVERTED. Creates a PENDING order copying line items + totals.
// A quote may be converted only from ACCEPTED and only once.
router.post('/:id/convert', requireRole('sales_rep'), (req, res) => {
  const quote = findById('quotes', req.params.id);
  if (!quote) return res.status(404).json({ error: 'quote not found' });

  if (quote.status === 'CONVERTED') {
    return res.status(409).json({ error: 'quote already converted' });
  }
  if (!canTransition('quote', quote.status, 'CONVERTED')) {
    return res
      .status(409)
      .json({ error: `cannot convert a quote in status ${quote.status}` });
  }

  const order = {
    id: nextId('order'),
    quoteId: quote.id,
    customerId: quote.customerId,
    status: 'PENDING',
    lineItems: quote.lineItems.map((li) => ({ ...li })),
    subtotal: quote.subtotal,
    discountPct: quote.discountPct,
    discountAmount: quote.discountAmount,
    tax: quote.tax,
    total: quote.total,
    approvedBy: null,
    approvedAt: null,
    invoiceId: null,
    createdAt: new Date().toISOString(),
  };
  db.orders.push(order);

  quote.status = 'CONVERTED';
  quote.convertedOrderId = order.id;

  res.status(201).json({ quote, order });
});

module.exports = router;
