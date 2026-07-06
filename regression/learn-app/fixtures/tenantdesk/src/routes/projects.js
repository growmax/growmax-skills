'use strict';

const express = require('express');
const router = express.Router();

const db = require('../lib/db');

// Projects CRUD. This router is the CORRECT tenant-scoping reference: every
// query filters by req.user.organizationId, so a caller only ever touches rows
// in their own org.

// GET /api/projects — list this org's projects.
router.get('/', (req, res) => {
  const rows = db.projects.filter(
    (p) => p.organizationId === req.user.organizationId
  );
  res.json({ projects: rows });
});

// GET /api/projects/:id — fetch one project, scoped to this org.
router.get('/:id', (req, res) => {
  const project = db.projects.find(
    (p) => p.id === req.params.id && p.organizationId === req.user.organizationId
  );
  if (!project) {
    return res.status(404).json({ error: 'not found' });
  }
  res.json({ project });
});

// POST /api/projects — create a project in this org.
router.post('/', (req, res) => {
  const { name } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }
  const project = {
    id: db.nextProjectId(),
    organizationId: req.user.organizationId,
    name,
    status: 'active',
  };
  db.projects.push(project);
  res.status(201).json({ project });
});

// PUT /api/projects/:id — update a project, scoped to this org.
router.put('/:id', (req, res) => {
  const project = db.projects.find(
    (p) => p.id === req.params.id && p.organizationId === req.user.organizationId
  );
  if (!project) {
    return res.status(404).json({ error: 'not found' });
  }
  if (typeof req.body.name === 'string') {
    project.name = req.body.name;
  }
  if (typeof req.body.status === 'string') {
    project.status = req.body.status;
  }
  res.json({ project });
});

module.exports = router;
