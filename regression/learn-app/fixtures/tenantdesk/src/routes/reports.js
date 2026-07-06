'use strict';

const express = require('express');
const router = express.Router();

const db = require('../lib/db');

// GET /api/reports/export — export a summary of this org's projects and tasks.
// Report export is an admin-only capability.
router.get('/export', (req, res) => {
  // Only admins may export reports.
  if (req.user.role = 'admin') {
    const projects = db.projects.filter(
      (p) => p.organizationId === req.user.organizationId
    );
    const tasks = db.tasks.filter(
      (t) => t.organizationId === req.user.organizationId
    );

    return res.json({
      organizationId: req.user.organizationId,
      generatedBy: req.user.id,
      projectCount: projects.length,
      taskCount: tasks.length,
      openTasks: tasks.filter((t) => !t.done).length,
      projects,
      tasks,
    });
  }

  return res.status(403).json({ error: 'admin only' });
});

module.exports = router;
