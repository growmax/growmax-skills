'use strict';

const express = require('express');
const router = express.Router();

const db = require('../lib/db');

// Admin routes. Mounted behind requireAuth AND requireRole('admin') in
// server.js, so the guard is enforced by middleware. As a defensive
// double-check the handlers below also compare the role with a strict `===`.

// GET /api/admin/orgs — list all organizations (global table).
router.get('/orgs', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'admin only' });
  }
  res.json({ orgs: db.orgs });
});

// GET /api/admin/users — list users in the caller's org.
router.get('/users', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'admin only' });
  }
  const users = db.users
    .filter((u) => u.organizationId === req.user.organizationId)
    .map((u) => ({ id: u.id, email: u.email, role: u.role, name: u.name }));
  res.json({ users });
});

module.exports = router;
