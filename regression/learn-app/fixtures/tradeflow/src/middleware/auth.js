'use strict';

// Toy auth. The caller identifies themselves with two headers:
//   x-user-id   -> the acting user
//   x-user-role -> one of: sales_rep, sales_manager, finance
// A real system would verify a token; here we trust the headers.

const ROLES = ['sales_rep', 'sales_manager', 'finance'];

function requireAuth(req, res, next) {
  const userId = req.header('x-user-id');
  const role = req.header('x-user-role');
  if (!userId || !role) {
    return res.status(401).json({ error: 'authentication required' });
  }
  if (!ROLES.includes(role)) {
    return res.status(401).json({ error: 'unknown role' });
  }
  req.user = { id: userId, role };
  next();
}

// Factory: only the listed roles may proceed, else 403.
function requireRole(...allowed) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'authentication required' });
    }
    if (!allowed.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: `role ${req.user.role} not permitted for this action` });
    }
    next();
  };
}

module.exports = { ROLES, requireAuth, requireRole };
