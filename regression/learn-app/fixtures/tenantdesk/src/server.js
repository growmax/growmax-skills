'use strict';

const express = require('express');

const { requireAuth, requireRole } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const healthRoutes = require('./routes/health');

const app = express();
app.use(express.json());

// Auth endpoints are public (they mint / refresh tokens).
app.use('/api/auth', authRoutes);

// Health + internal metrics. Mounted without auth so uptime checks can hit it.
app.use('/api', healthRoutes);

// Everything below requires a valid Bearer token.
app.use('/api/projects', requireAuth, projectRoutes);
app.use('/api/tasks', requireAuth, taskRoutes);
app.use('/api/reports', requireAuth, reportRoutes);

// Admin routes require auth AND the admin role.
app.use('/api/admin', requireAuth, requireRole('admin'), adminRoutes);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log('TenantDesk listening on ' + PORT);
  });
}

module.exports = app;
