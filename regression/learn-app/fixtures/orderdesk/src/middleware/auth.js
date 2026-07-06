const db = require('../lib/db');

// Resolves "Authorization: Bearer <token>" to a user via the sessions map.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const userId = token ? db.sessions.get(token) : undefined;
  const user = userId ? db.users.get(userId) : undefined;
  if (!user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  req.user = user;
  req.token = token;
  next();
}

// Usage: requireRole('admin') or requireRole('buyer'). Must run after
// requireAuth.
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
