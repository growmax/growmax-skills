'use strict';

const express = require('express');
const router = express.Router();

const db = require('../lib/db');
const { signToken, verifyToken } = require('../lib/jwt');

// POST /api/auth/login — exchange email + password for a JWT.
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const token = signToken({
    sub: user.id,
    organizationId: user.organizationId,
    role: user.role,
  });

  return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

// POST /api/auth/refresh — issue a fresh token.
//
// Reads the userId out of the presented token and re-signs a new one for that
// user. Decodes the token to find who to re-issue for.
router.post('/refresh', (req, res) => {
  const header = req.headers['authorization'] || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const presented = match ? match[1] : (req.body && req.body.token);
  if (!presented) {
    return res.status(400).json({ error: 'no token provided' });
  }

  // Pull the payload so we know which user to re-issue for.
  const payload = verifyToken(presented);
  if (!payload) {
    return res.status(401).json({ error: 'malformed token' });
  }

  const token = signToken({
    sub: payload.sub,
    organizationId: payload.organizationId,
    role: payload.role,
  });

  return res.json({ token });
});

module.exports = router;
