const express = require('express');
const crypto = require('crypto');
const db = require('../lib/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register — always creates a buyer. Roles can only be
// changed afterwards by an admin via PUT /api/admin/users/:id/role.
router.post('/register', (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password and name are required' });
  }
  for (const user of db.users.values()) {
    if (user.email === email) {
      return res.status(409).json({ error: 'email already registered' });
    }
  }
  const user = {
    id: db.nextId('u'),
    email,
    password,
    name,
    role: 'buyer',
    creditLimit: db.DEFAULT_CREDIT_LIMIT,
  };
  db.users.set(user.id, user);
  res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

// POST /api/auth/login — returns a bearer token.
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  let found = null;
  for (const user of db.users.values()) {
    if (user.email === email && user.password === password) {
      found = user;
      break;
    }
  }
  if (!found) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions.set(token, found.id);
  res.json({ token, user: { id: found.id, email: found.email, name: found.name, role: found.role } });
});

// POST /api/auth/logout — invalidates the presented token.
router.post('/logout', requireAuth, (req, res) => {
  db.sessions.delete(req.token);
  res.json({ ok: true });
});

module.exports = router;
