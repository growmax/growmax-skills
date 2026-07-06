// In-memory data store. Everything lives in process memory and resets on
// restart. This is a fixture app, not a production system.

const users = new Map(); // userId -> user
const products = new Map(); // productId -> product
const carts = new Map(); // userId -> cart
const orders = new Map(); // orderId -> order
const invoices = new Map(); // invoiceId -> invoice
const settings = new Map(); // settingKey -> value
const sessions = new Map(); // token -> userId

// --- defaults -------------------------------------------------------------

settings.set('currency', 'USD');
settings.set('minOrderValue', 50);

const DEFAULT_CREDIT_LIMIT = 1000;

// --- id helper ------------------------------------------------------------

let counter = 1;
function nextId(prefix) {
  return `${prefix}_${counter++}`;
}

// --- seed data ------------------------------------------------------------

users.set('u_admin', {
  id: 'u_admin',
  email: 'admin@orderdesk.test',
  password: 'admin123',
  name: 'Ada Admin',
  role: 'admin',
  creditLimit: DEFAULT_CREDIT_LIMIT,
});

users.set('u_buyer', {
  id: 'u_buyer',
  email: 'buyer@orderdesk.test',
  password: 'buyer123',
  name: 'Bob Buyer',
  role: 'buyer',
  creditLimit: DEFAULT_CREDIT_LIMIT,
});

products.set('p_1', {
  id: 'p_1',
  name: 'Espresso Beans 1kg',
  price: 30,
  deletedAt: null,
});
products.set('p_2', {
  id: 'p_2',
  name: 'Whole Milk 12x1L',
  price: 18,
  deletedAt: null,
});
products.set('p_3', {
  id: 'p_3',
  name: 'Paper Cups 1000pk',
  price: 55,
  deletedAt: null,
});
products.set('p_4', {
  id: 'p_4',
  name: 'Vanilla Syrup 750ml',
  price: 12,
  deletedAt: '2026-01-15T00:00:00.000Z',
});

module.exports = {
  users,
  products,
  carts,
  orders,
  invoices,
  settings,
  sessions,
  nextId,
  DEFAULT_CREDIT_LIMIT,
};
