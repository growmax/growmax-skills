const express = require('express');
const db = require('../lib/db');
const { requireAuth } = require('../middleware/auth');
const { computeTotal } = require('../lib/pricing');

const router = express.Router();

// Carts expire this many hours after their last update. An expired cart is
// emptied (reset) the next time it is touched.
const CART_TTL_HOURS = 24;

function getActiveCart(userId) {
  const now = Date.now();
  let cart = db.carts.get(userId);
  if (!cart) {
    cart = { userId, items: [], updatedAt: now };
    db.carts.set(userId, cart);
    return cart;
  }
  const ageHours = (now - cart.updatedAt) / (1000 * 60 * 60);
  if (ageHours > CART_TTL_HOURS) {
    cart.items = [];
    cart.updatedAt = now;
  }
  return cart;
}

// POST /api/cart/items — body { productId, quantity }. Adds (or increments)
// an item; the product's current price is snapshotted onto the item.
router.post('/items', requireAuth, (req, res) => {
  const { productId, quantity } = req.body || {};
  const qty = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
  const product = db.products.get(productId);
  if (!product || product.deletedAt != null) {
    return res.status(404).json({ error: 'product not found' });
  }
  const cart = getActiveCart(req.user.id);
  const existing = cart.items.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.items.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
    });
  }
  cart.updatedAt = Date.now();
  res.status(201).json(cart);
});

// DELETE /api/cart/items/:id — :id is the productId of the line to remove.
router.delete('/items/:id', requireAuth, (req, res) => {
  const cart = getActiveCart(req.user.id);
  const index = cart.items.findIndex((item) => item.productId === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'item not in cart' });
  }
  cart.items.splice(index, 1);
  cart.updatedAt = Date.now();
  res.json(cart);
});

// GET /api/cart — returns the active cart plus a totals preview.
router.get('/', requireAuth, (req, res) => {
  const cart = getActiveCart(req.user.id);
  res.json({ ...cart, totals: computeTotal(cart.items) });
});

module.exports = { router, getActiveCart, CART_TTL_HOURS };
