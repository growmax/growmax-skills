'use strict';

// In-memory data store. Resets on every server restart.
// Each document carries a status and a link to its parent document id, so the
// chain quote.id <- order.quoteId <- invoice.orderId <- payment.invoiceId can
// be traced end to end.

const db = {
  customers: [
    { id: 'cust_1', name: 'Blue Harbor Restaurant', email: 'ap@blueharbor.example' },
    { id: 'cust_2', name: 'Cedar & Co Catering', email: 'billing@cedar.example' },
  ],
  products: [
    { id: 'prod_1', name: 'Arabica Coffee Beans 1kg', price: 42.0 },
    { id: 'prod_2', name: 'Ceramic Espresso Cup', price: 6.5 },
    { id: 'prod_3', name: 'Cold Brew Concentrate 2L', price: 28.0 },
  ],
  quotes: [],
  orders: [],
  invoices: [],
  payments: [],
};

// Simple incrementing id helper, prefixed per collection.
let counters = {};
function nextId(prefix) {
  counters[prefix] = (counters[prefix] || 0) + 1;
  return `${prefix}_${counters[prefix]}`;
}

function findById(collection, id) {
  return db[collection].find((row) => row.id === id);
}

module.exports = { db, nextId, findById };
