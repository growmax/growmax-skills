'use strict';

const express = require('express');
const router = express.Router();

const db = require('../lib/db');

// Tasks CRUD.

// GET /api/tasks — list this org's tasks.
router.get('/', (req, res) => {
  const rows = db.tasks.filter(
    (t) => t.organizationId === req.user.organizationId
  );
  res.json({ tasks: rows });
});

// GET /api/tasks/:id — fetch a single task.
router.get('/:id', (req, res) => {
  // fetch the task
  const task = db.tasks.find((t) => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'not found' });
  }
  res.json({ task });
});

// POST /api/tasks — create a task in this org.
router.post('/', (req, res) => {
  const { projectId, title } = req.body || {};
  if (!projectId || !title) {
    return res.status(400).json({ error: 'projectId and title are required' });
  }
  const task = {
    id: db.nextTaskId(),
    organizationId: req.user.organizationId,
    projectId,
    title,
    done: false,
  };
  db.tasks.push(task);
  res.status(201).json({ task });
});

// PUT /api/tasks/:id — update a task.
router.put('/:id', (req, res) => {
  // fetch the task
  const task = db.tasks.find((t) => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'not found' });
  }
  if (typeof req.body.title === 'string') {
    task.title = req.body.title;
  }
  if (typeof req.body.done === 'boolean') {
    task.done = req.body.done;
  }
  res.json({ task });
});

module.exports = router;
