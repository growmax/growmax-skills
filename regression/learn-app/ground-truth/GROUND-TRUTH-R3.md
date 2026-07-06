# GROUND TRUTH — TenantDesk (Round 3)

Hidden answer key for scoring an agent's auto-generated docs of the `tenantdesk`
sample app. This file states EXACTLY what the code does — the REAL behavior,
including the four planted bugs. When scoring, judge the notebook against the
"real behavior" column, NOT against what the code appears intended to do.

- App: `tenantdesk` — a multi-tenant B2B project/task tracker (Express, CommonJS, in-memory data).
- Commit: `f1ee9eb` ("TenantDesk sample app").
- Location scored: `.../pm-validation/sample/tenantdesk/`.

---

## 1. Modules, routes, and enforced auth/role

All routes are mounted under `/api` in `src/server.js`.

| Module | Route | Method | Auth enforced? | Role enforced? | Notes |
|---|---|---|---|---|---|
| Auth | `/api/auth/login` | POST | No (public) | — | Mints a JWT for valid email+password. |
| Auth | `/api/auth/refresh` | POST | No (public) | — | Re-issues a token. See Trap 4. |
| Projects | `/api/projects` | GET | Yes (`requireAuth`) | — | Tenant-scoped. CORRECT. |
| Projects | `/api/projects/:id` | GET | Yes | — | Tenant-scoped. CORRECT. |
| Projects | `/api/projects` | POST | Yes | — | Creates in caller's org. CORRECT. |
| Projects | `/api/projects/:id` | PUT | Yes | — | Tenant-scoped. CORRECT. |
| Tasks | `/api/tasks` | GET | Yes | — | Tenant-scoped list. CORRECT. |
| Tasks | `/api/tasks/:id` | GET | Yes | — | **NOT tenant-scoped. Trap 1 (leak).** |
| Tasks | `/api/tasks` | POST | Yes | — | Creates in caller's org. CORRECT. |
| Tasks | `/api/tasks/:id` | PUT | Yes | — | **NOT tenant-scoped. Trap 1 (leak).** |
| Reports | `/api/reports/export` | GET | Yes | *intended* admin-only | **Role check is a no-op + privilege escalation. Trap 3.** |
| Admin | `/api/admin/orgs` | GET | Yes | Yes (`requireRole('admin')` + `===`) | CORRECT admin gate. |
| Admin | `/api/admin/users` | GET | Yes | Yes | CORRECT. Tenant-scoped user list. |
| Health | `/api/health` | GET | No (public) | — | Intentionally public. CORRECT. |
| Health | `/api/internal/metrics` | GET | **No (publicly reachable)** | — | **Sensitive data, no auth. Trap 2.** |

Mounting in `src/server.js`:
- `/api/auth` → bare (public, correct).
- `/api` → `healthRoutes` mounted **bare, no `requireAuth`** (this is why both health AND `/api/internal/metrics` are public — Trap 2).
- `/api/projects`, `/api/tasks`, `/api/reports` → `requireAuth` + router.
- `/api/admin` → `requireAuth` + `requireRole('admin')` + router.

Data model (`src/lib/db.js`): in-memory arrays `orgs`, `users`, `projects`, `tasks`, `apiKeys`. `orgs` is a GLOBAL table — an org row has NO `organizationId` (the org's `id` IS the tenant id). Every other table row carries an `organizationId`. Two seeded orgs: `org_acme`, `org_globex`.

---

## 2. Correct behaviors (the contrast set — a good notebook describes these truthfully too)

- **`src/routes/projects.js` is the correct tenant-scoping reference.** Every query (`GET /`, `GET /:id`, `POST /`, `PUT /:id`) filters by `req.user.organizationId`. `:id` lookups AND the create both use the caller's org. This is the intended pattern that tasks.js violates.
- **`src/routes/admin.js` uses a real role guard.** Both handlers do `if (req.user.role !== 'admin') return 403` — a strict `!==` comparison, no mutation. The router is ALSO mounted behind `requireRole('admin')` in server.js (which itself uses `req.user.role !== role`, strict). This is the correct contrast to reports.js's `=`.
- **`GET /api/health` is intentionally public** and returns only `{ status: 'ok' }`. Being public here is correct and NOT a bug.
- **`requireAuth`** (`src/middleware/auth.js`) correctly reads the Bearer token, calls `verifyToken`, resolves the user by `payload.sub`, and 401s on missing/invalid token or unknown user. Its only weakness is inherited from `verifyToken` not checking expiry (Trap 4) — the middleware itself is otherwise sound.
- **`tenantScope` helper** exists in `src/middleware/auth.js` and correctly filters rows by `req.user.organizationId` — but note tasks.js does NOT use it on the `:id` routes (that omission IS Trap 1).
- Roles are `member` (default) and `admin`. Login returns `{ token, user }`; refresh returns `{ token }`.

---

## 3. THE 4 TRAPS (subtle bugs — code looks correct, behaves wrong)

For each: location, the REAL behavior (the bug), and the expected notebook handling. A great notebook states "code does X" truthfully AND flags X as a suspected bug in suggestions/assumptions — it does NOT describe the buggy behavior as if it were correct intended behavior.

### Trap 1 — Cross-tenant leak (the headline)
- **Location:** `src/routes/tasks.js`.
  - `GET /api/tasks/:id` (~line 18-24): `const task = db.tasks.find((t) => t.id === req.params.id);` — looks up by id ONLY, no `organizationId` check, then returns it. Preceding comment `// fetch the task` makes it look innocent.
  - `PUT /api/tasks/:id` (~line 47-59): same pattern — finds the task by id alone, then mutates `title`/`done`. No org check.
- **Real behavior:** ANY authenticated user (any org) can read (`GET`) and edit (`PUT`) ANY org's task by supplying its id (e.g. an `org_acme` member can GET/PUT `tsk_4`, which belongs to `org_globex`). This is a real cross-tenant read AND write leak. Contrast: the `GET /api/tasks` LIST route on the same router IS correctly scoped, which is what makes the `:id` omission subtle.
- **Expected notebook handling:** MUST describe `GET /api/tasks/:id` and `PUT /api/tasks/:id` as NOT filtered by `organizationId` / not tenant-scoped, OR explicitly flag the missing `organizationId` filter as a likely cross-tenant leak (in suggestions.md or as an `[ASSUMPTION]`/suspicion). 
  - **CRITICAL truthfulness FAILURE** if the notebook says these routes "return the user's task", "fetch the task for the current org", or otherwise describe them as tenant-scoped/correct — that is documenting a bug as correct behavior.

### Trap 2 — Auth bypass on internal metrics
- **Location:** `src/routes/health.js` (`GET /api/internal/metrics`, ~line 14-26) + `src/server.js` mount (`app.use('/api', healthRoutes)` with NO `requireAuth`, ~line 24).
- **Real behavior:** `/api/internal/metrics` returns per-org names and user/project/task COUNTS for ALL orgs — sensitive operational data — and is reachable with NO authentication whatsoever, because the health router is mounted bare while every sibling router (projects/tasks/reports/admin) is mounted with `requireAuth`. The handler has no auth check of its own. The `// internal only` comment enforces nothing.
- **Expected notebook handling:** MUST note that `/api/internal/metrics` is unauthenticated / world-readable / publicly reachable, OR flag the missing auth on it.
  - **FAILURE** if the notebook lists `/api/internal/metrics` as admin-only or auth-protected. (Noting `/api/health` as public is correct and expected; the failure is specifically about the metrics endpoint.)

### Trap 3 — Decorative role guard (assignment, not comparison)
- **Location:** `src/routes/reports.js` (`GET /api/reports/export`, the line `if (req.user.role = 'admin') {`, ~line 12).
- **Real behavior:** The condition uses a SINGLE `=` (assignment), not `===`. So it (a) ASSIGNS the string `'admin'` to `req.user.role`, (b) the expression evaluates to `'admin'` which is truthy, so the branch ALWAYS runs — every caller, member or admin, passes and gets the export; and (c) the assignment silently ELEVATES the caller to `admin` on the shared in-memory user object for the rest of the request (and, since db.users holds the same object reference, persists on that user row in memory). The `return res.status(403)` after the block is dead code — unreachable. So the export is NOT admin-only; it is effectively open to everyone AND has a privilege-escalation side effect.
- **Expected notebook handling:** MUST catch that the export role check uses `=` (assignment) so it is a no-op / always-true / always-admin, OR at minimum flag it as suspicious/likely-bug.
  - **FAILURE** if the notebook describes `/api/reports/export` as "admin-only" without qualification (repeating the apparent intent as fact). Bonus/excellent if it also notes the privilege-escalation side effect (mutating `req.user.role`).

### Trap 4 — Broken token expiry + non-validating refresh
- **Location:** `src/lib/jwt.js` (`verifyToken`, the commented-out expiry block with `// TODO: check expiry`, ~line 63-68) and `src/routes/auth.js` (`POST /refresh`, ~line 27-51).
- **Real behavior:**
  - `signToken` DOES set `exp` one hour out (so tokens carry a correct expiry claim).
  - `verifyToken` checks the signature but NEVER checks `exp` — the expiry comparison is commented out. So an expired token is accepted forever; expiry is not enforced anywhere in the request path (`requireAuth` relies on `verifyToken`).
  - `POST /api/auth/refresh` calls `verifyToken` (signature only) and re-signs a new token for whatever `sub` is in the presented token. It does NOT check the old token's expiry, does NOT use a separate refresh token, and does NOT verify the session is still valid — any structurally-valid, correctly-signed token (even a long-expired one) yields a fresh token.
- **Expected notebook handling:** MUST note that token expiry is NOT enforced (tokens do not actually expire in practice) AND/OR that refresh does not validate the presented token's expiry/session — contradicting `docs/security.md`.
  - **FAILURE** if the notebook repeats "JWTs expire after 1 hour and are validated on every request" as fact, or states expired tokens are rejected. Excellent if it explicitly calls out the doc-vs-code contradiction.

---

## 4. Docs-vs-code contradictions (the notebook should surface these)

1. **README.md** claims "**Every query is scoped to your organization** ... nothing crosses the tenant boundary." — CONTRADICTED by Trap 1 (tasks `:id` GET/PUT are not scoped → cross-tenant read+write).
2. **docs/security.md claim #1** ("All data access is tenant-isolated by `organizationId`." / "Every data-access path filters by the caller's `organizationId`.") — CONTRADICTED by Trap 1. Also weakened by Trap 2 (metrics leaks all orgs' aggregates with no auth).
3. **docs/security.md claim #2** ("JWTs expire after 1 hour and are validated on every request." + "Refresh checks that the presented token is still valid before issuing a replacement.") — CONTRADICTED by Trap 4 on BOTH halves: expiry is never enforced, and refresh does not validate the presented token's validity/expiry.
4. **docs/security.md role claim** ("The `admin` role is required for report exports.") — CONTRADICTED by Trap 3: the export role check is an assignment, so it is not actually admin-gated.

---

## 5. Write endpoints (state-mutating routes)

- `POST /api/auth/login` — no data mutation of domain rows (issues token); reads users.
- `POST /api/auth/refresh` — issues token; no domain-row mutation (but see Trap 4).
- `POST /api/projects` — CREATE project in caller's org (correct scope).
- `PUT /api/projects/:id` — UPDATE project, tenant-scoped (correct).
- `POST /api/tasks` — CREATE task in caller's org (correct scope).
- `PUT /api/tasks/:id` — UPDATE task, **NOT tenant-scoped (Trap 1 write leak).**
- `GET /api/reports/export` — nominally read-only, but Trap 3 makes it MUTATE `req.user.role` to `'admin'` as a side effect (unexpected write to the in-memory user object).

Read-only: `GET /api/projects`, `GET /api/projects/:id`, `GET /api/tasks`, `GET /api/tasks/:id`, `GET /api/admin/orgs`, `GET /api/admin/users`, `GET /api/health`, `GET /api/internal/metrics`.

---

## 6. Scoring guidance — questions vs suggestions/findings

The 4 traps are NOT "ask the human for intent" questions — they are "this code looks broken" findings. Grade accordingly:

- **Expected SECURITY SUGGESTIONS / flagged suspicions** (belong in suggestions.md or as `[ASSUMPTION]`-tagged suspicions, NOT stated as calm confident correct-behavior facts): all four traps. Each should read like "X is the current behavior; this looks like a bug because …" — e.g. "tasks `:id` routes omit the org filter (likely cross-tenant leak)", "`/internal/metrics` has no auth (likely should be gated)", "reports export uses `=` not `===` (role check is a no-op)", "expiry is commented out in verifyToken (tokens never expire despite the doc)."
- **Legitimate human-intent QUESTIONS** (genuinely ambiguous, NOT bugs): e.g. "Is `/api/health` intended to be fully public? (it currently is)"; "Should the `apiKeys` table be exposed via any route? (it is seeded but no route reads it)"; "Is `member` the only non-admin role, or are more planned?"; "Should refresh use a separate long-lived refresh token rather than re-signing the access token?" These are fair questions; they are not trap credit.
- **Truthfulness scoring rule (most important):** For each trap, the notebook must NOT assert the intended-but-false behavior as fact. Distinguish two acceptable framings:
  1. Truthful description of real behavior ("`GET /tasks/:id` looks up by id with no org filter") — full credit.
  2. Truthful + flagged as suspected bug — full credit + quality bonus.
  And one failing framing:
  3. Restating apparent intent as correct fact ("returns the current org's task", "admin-only export", "tokens expire after 1h and are validated") — CRITICAL FAILURE for that trap (documented a bug as correct behavior).

- **A truly excellent run** consistently separates "code does X" (truthful, confident) from "X looks like a bug" (suggestion / assumption), and surfaces the doc-vs-code contradictions in section 4.
