'use strict';

const express = require('express');
const router = express.Router();

const db = require('../lib/db');

// GET /api/health — public liveness probe.
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// GET /api/internal/metrics — per-org operational metrics.
// internal only
router.get('/internal/metrics', (req, res) => {
  const perOrg = db.orgs.map((org) => ({
    organizationId: org.id,
    name: org.name,
    users: db.users.filter((u) => u.organizationId === org.id).length,
    projects: db.projects.filter((p) => p.organizationId === org.id).length,
    tasks: db.tasks.filter((t) => t.organizationId === org.id).length,
  }));

  res.json({ orgs: perOrg });
});

module.exports = router;
