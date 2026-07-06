# TenantDesk

A multi-tenant B2B project and task tracker. Organizations sign up, invite members,
create projects, and track tasks within those projects.

Every user belongs to exactly one organization. **Every query is scoped to your
organization** — you only ever see data that belongs to your org, and nothing crosses
the tenant boundary.

## Roles

- `member` — the default role. Can read and write projects and tasks in their org.
- `admin` — everything a member can do, plus org administration and report exports.

## API

All routes are mounted under `/api`.

- `POST /api/auth/login` — exchange credentials for a JWT.
- `POST /api/auth/refresh` — get a fresh JWT.
- `GET/POST /api/projects`, `GET/PUT /api/projects/:id` — project CRUD.
- `GET/POST /api/tasks`, `GET/PUT /api/tasks/:id` — task CRUD.
- `GET /api/reports/export` — admin-only report export.
- `GET /api/admin/orgs`, `GET /api/admin/users` — admin-only org administration.
- `GET /api/health` — public health check.

## Running

```
npm install
npm start
```

The server keeps all data in memory (see `src/lib/db.js`); it resets on restart.
