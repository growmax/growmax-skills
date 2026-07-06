'use strict';

const express = require('express');
const { db, findById } = require('../lib/db');

const router = express.Router();

// List products with their catalog prices. Any authenticated role may read.
router.get('/', (req, res) => {
  res.json(db.products);
});

// Get one product.
router.get('/:id', (req, res) => {
  const product = findById('products', req.params.id);
  if (!product) return res.status(404).json({ error: 'product not found' });
  res.json(product);
});

module.exports = router;
