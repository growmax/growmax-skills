'use strict';

const { verifyToken } = require('../lib/jwt');
const db = require('../lib/db');

// requireAuth: read a Bearer token, verify it, and attach the resolved user to
// req.user. Rejects with 401 when the token is missing or invalid.
function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: 'missing bearer token' });
  }

  const payload = verifyToken(match[1]);
  if (!payload) {
    return res.status(401).json({ error: 'invalid token' });
  }

  const user = db.users.find((u) => u.id === payload.sub);
  if (!user) {
    return res.status(401).json({ error: 'unknown user' });
  }

  req.user = user;
  next();
}

// requireRole: gate a route on an exact role match.
function requireRole(role) {
  return function (req, res, next) {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

// tenantScope: convenience filter — keep only the rows that belong to the
// caller's organization. Routes that list tenant-owned rows should run their
// result set through this.
function tenantScope(req, rows) {
  return rows.filter((row) => row.organizationId === req.user.organizationId);
}

module.exports = {
  requireAuth,
  requireRole,
  tenantScope,
};
