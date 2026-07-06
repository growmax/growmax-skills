const express = require('express');
const db = require('../lib/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

// GET /api/admin/settings
router.get('/settings', (req, res) => {
  res.json({
    currency: db.settings.get('currency'),
    minOrderValue: db.settings.get('minOrderValue'),
  });
});

// PUT /api/admin/settings — body may include { currency, minOrderValue }.
router.put('/settings', (req, res) => {
  const { currency, minOrderValue } = req.body || {};
  if (currency !== undefined) {
    if (typeof currency !== 'string' || currency.length === 0) {
      return res.status(400).json({ error: 'currency must be a non-empty string' });
    }
    db.settings.set('currency', currency);
  }
  if (minOrderValue !== undefined) {
    if (typeof minOrderValue !== 'number' || minOrderValue < 0) {
      return res.status(400).json({ error: 'minOrderValue must be a non-negative number' });
    }
    db.settings.set('minOrderValue', minOrderValue);
  }
  res.json({
    currency: db.settings.get('currency'),
    minOrderValue: db.settings.get('minOrderValue'),
  });
});

// GET /api/admin/users — passwords are not returned.
router.get('/users', (req, res) => {
  const items = [];
  for (const user of db.users.values()) {
    const { password, ...safe } = user;
    items.push(safe);
  }
  res.json({ items });
});

// PUT /api/admin/users/:id/role — body { role: 'admin' | 'buyer' }. The only
// way a user's role can change.
router.put('/users/:id/role', (req, res) => {
  const { role } = req.body || {};
  if (role !== 'admin' && role !== 'buyer') {
    return res.status(400).json({ error: 'invalid role' });
  }
  const user = db.users.get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }
  user.role = role;
  const { password, ...safe } = user;
  res.json(safe);
});

module.exports = router;
