'use strict';

// In-memory data store. Resets on every restart.
//
// Tenancy model: `orgs` is a GLOBAL table — an org row IS the tenant, so it has
// no `organizationId` of its own (its `id` is the tenant identifier). Every other
// table below is tenant-owned and carries an `organizationId` linking the row to
// exactly one org.

const orgs = [
  { id: 'org_acme', name: 'Acme Inc' },
  { id: 'org_globex', name: 'Globex Corp' },
];

const users = [
  // password is "password123" for everyone (plaintext here for the fixture only).
  { id: 'usr_1', organizationId: 'org_acme', email: 'alice@acme.example', password: 'password123', role: 'admin', name: 'Alice' },
  { id: 'usr_2', organizationId: 'org_acme', email: 'bob@acme.example', password: 'password123', role: 'member', name: 'Bob' },
  { id: 'usr_3', organizationId: 'org_globex', email: 'carol@globex.example', password: 'password123', role: 'admin', name: 'Carol' },
  { id: 'usr_4', organizationId: 'org_globex', email: 'dave@globex.example', password: 'password123', role: 'member', name: 'Dave' },
];

const projects = [
  { id: 'prj_1', organizationId: 'org_acme', name: 'Website Redesign', status: 'active' },
  { id: 'prj_2', organizationId: 'org_acme', name: 'Mobile App', status: 'active' },
  { id: 'prj_3', organizationId: 'org_globex', name: 'Data Migration', status: 'active' },
];

const tasks = [
  { id: 'tsk_1', organizationId: 'org_acme', projectId: 'prj_1', title: 'Draft homepage copy', done: false },
  { id: 'tsk_2', organizationId: 'org_acme', projectId: 'prj_1', title: 'Pick color palette', done: true },
  { id: 'tsk_3', organizationId: 'org_acme', projectId: 'prj_2', title: 'Set up CI', done: false },
  { id: 'tsk_4', organizationId: 'org_globex', projectId: 'prj_3', title: 'Export legacy records', done: false },
  { id: 'tsk_5', organizationId: 'org_globex', projectId: 'prj_3', title: 'Validate row counts', done: false },
];

const apiKeys = [
  { id: 'key_1', organizationId: 'org_acme', key: 'gm_live_acme_xxx', label: 'CI pipeline' },
  { id: 'key_2', organizationId: 'org_globex', key: 'gm_live_globex_yyy', label: 'Reporting bot' },
];

let taskSeq = tasks.length;
let projectSeq = projects.length;

function nextTaskId() {
  taskSeq += 1;
  return 'tsk_' + taskSeq;
}

function nextProjectId() {
  projectSeq += 1;
  return 'prj_' + projectSeq;
}

module.exports = {
  orgs,
  users,
  projects,
  tasks,
  apiKeys,
  nextTaskId,
  nextProjectId,
};
