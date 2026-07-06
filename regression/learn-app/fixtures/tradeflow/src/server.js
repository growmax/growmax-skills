'use strict';

const express = require('express');
const { requireAuth } = require('./middleware/auth');

const customers = require('./routes/customers');
const products = require('./routes/products');
const quotes = require('./routes/quotes');
const orders = require('./routes/orders');
const invoices = require('./routes/invoices');
const payments = require('./routes/payments');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

// Everything under /api requires authentication (x-user-id + x-user-role).
app.use('/api', requireAuth);

app.use('/api/customers', customers);
app.use('/api/products', products);
app.use('/api/quotes', quotes);
app.use('/api/orders', orders);

// Invoices, plus the nested payments sub-resource:
//   POST /api/invoices/:id/payments
app.use('/api/invoices', invoices);
app.use('/api/invoices/:id/payments', payments);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`TradeFlow listening on :${PORT}`);
  });
}

module.exports = app;
