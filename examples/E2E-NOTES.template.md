# E2E-NOTES — repo overlay TEMPLATE for the /e2e-flow workflow

The `/e2e-flow` agents are portable: they read stack, conventions, and auth from the repo rather
than hardcoding them. This file is the **repo-specific overlay** — the values and gotchas an agent
can't reliably infer by reading files. Copy it to your repo as `.claude/E2E-NOTES.md`, fill it in,
and commit it. Delete the rows that don't apply.

> Agents read `.claude/E2E-NOTES.md` if it exists and treat it as ground truth — but still verify
> any path/port against the live repo before relying on it.

## Surfaces — which driver, which runner
| App | Path | Stack | Surface | Explorer | Runner | Port |
|---|---|---|---|---|---|---|
| <admin web> | `apps/<web>` | React/Next | **web** | playwright-mcp | Playwright (`<run cmd>`) | <port> |
| <backend> | `apps/<api>` | <NestJS/Express> | **api** | none (read schema) | Jest+supertest / Vitest (`<run cmd>`) | <port> |
| <mobile?> | `apps/<mobile>` | React Native / Expo | **mobile** — NOT Playwright | mobile-mcp | — | — |

- Note the LIVE ports (web and API often differ; a dev server may fall back to the next free port).
- React-Native / Expo apps can't be driven by playwright-mcp — route to mobile-mcp or stop.

## Auth / login
- Web login (dev): `<email>` / `<password>`. Playwright env: `E2E_EMAIL` / `E2E_PASSWORD`. Reuse via
  `storageState` — don't re-login per test.
- API token shape: `<which claims a spec must sign — e.g. sub/org/role; what the strategy reads>`.
  Cite an existing spec: `<path:line>`.

## Test-data convention (REQUIRED — match the neighbour)
- Naming: `<unique prefix + suffix, e.g. "ZZ E2E <suffix>">` so runs don't collide and cleanup can
  find them.
- Self-cleaning teardown: delete children → parents, each guarded. Cite a spec: `<path:line>`.
- Never edit seed rows in a test.

## DB-WRITE SAFETY (hard rule)
- Create/mutate flows WRITE to the DB. **Never point a write-flow at a shared dev/prod DB.** Confirm
  the target is local/throwaway before any create step. Local DB host/port: `<host:port>`.

## Tenant isolation & roles (if multi-tenant)
- Every test over a tenant-owned entity asserts `<tenantKey> === <our tenant>` on returned rows.
- Roles to consider: `<list>`. Role-gated flows need a negative (wrong-role/cross-tenant rejected).

## Driver gotchas (web / playwright-mcp)
- `<e.g. Radix/Headless-UI tabs & popovers don't open on a programmatic click; use focus+Enter / a
  primary pointerdown>` — a driver quirk, NOT an app bug. This is the main reason the
  Claude-for-Chrome fallback explorer exists.

## Known-bad baseline
- `<any dead/non-compiling sibling specs; whether a broad test run is a clean signal; CI gating>`.
