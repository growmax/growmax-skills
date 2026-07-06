'use strict';

const express = require('express');
const { db, nextId, findById } = require('../lib/db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// List all customers. Any authenticated role may read.
router.get('/', (req, res) => {
  res.json(db.customers);
});

// Get one customer.
router.get('/:id', (req, res) => {
  const customer = findById('customers', req.params.id);
  if (!customer) return res.status(404).json({ error: 'customer not found' });
  res.json(customer);
});

// Create a customer. Reps and managers may create.
router.post('/', requireRole('sales_rep', 'sales_manager'), (req, res) => {
  const { name, email } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const customer = { id: nextId('cust'), name, email: email || null };
  db.customers.push(customer);
  res.status(201).json(customer);
});

module.exports = router;
