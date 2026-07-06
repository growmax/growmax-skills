const express = require('express');
const db = require('../lib/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/products?search=<term> — lists catalog products. Soft-deleted
// products (deletedAt set) are never returned.
router.get('/', requireAuth, (req, res) => {
  const search = (req.query.search || '').toString().toLowerCase();
  const items = [];
  for (const product of db.products.values()) {
    if (product.deletedAt != null) continue;
    if (search && !product.name.toLowerCase().includes(search)) continue;
    items.push(product);
  }
  res.json({ items });
});

// GET /api/products/:id — soft-deleted products 404 here too.
router.get('/:id', requireAuth, (req, res) => {
  const product = db.products.get(req.params.id);
  if (!product || product.deletedAt != null) {
    return res.status(404).json({ error: 'product not found' });
  }
  res.json(product);
});

module.exports = router;
