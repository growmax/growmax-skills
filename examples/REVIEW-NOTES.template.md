# REVIEW-NOTES — repo overlay TEMPLATE for the /feature-review workflow

The `/feature-review` reviewers are portable: they discover stack and conventions from the repo.
This file is the **repo-specific overlay** — the facts a reviewer can't reliably infer, plus the
house rules that turn generic findings into *your* blockers. Copy it to your repo as
`.claude/REVIEW-NOTES.md`, fill it in, commit it. Delete rows that don't apply.

> Reviewers read `.claude/REVIEW-NOTES.md` if it exists and treat it as ground truth — but still
> verify any path/command against the live repo before relying on it.

## Surfaces — what lives where
| Surface | Path | Stack | Notes |
|---|---|---|---|
| api | `apps/<api>` | <NestJS/Express/...> | |
| web | `apps/<web>` | <React/Next/...> | |
| mobile | `apps/<mobile>` | <RN/Expo/...> | |
| schema | `packages/<db>` | <Prisma/...> | |

## Test commands per surface (tdd-reviewer runs the NARROWEST that applies)
| Scope | Command | Notes |
|---|---|---|
| api unit | `<cmd>` | |
| api security/isolation | `<cmd>` | run when data access changed |
| web unit | `<cmd>` | |
| web e2e | `<cmd>` | creds/env vars: `<...>` |
| known-bad baseline | `<which suites are red on main, if any>` | pre-existing failures don't block |

## Blocking house rules (violations = BLOCKER regardless of generic severity)
- `<e.g. every query on tenant-owned data filters by the tenant key from the token>`
- `<e.g. no hardcoded currency symbols next to dynamic amounts — build test enforces>`
- `<e.g. no fallback/demo data when an org has zero rows>`
- `<e.g. mutations must carry the RBAC decorator>`

## UX conventions (ux-flow-reviewer)
- House component systems to compose, never fork: `<paths>`
- Design tokens package: `<name>` — hardcoded hex/radii/font sizes are findings
- Contextual-creation exemptions: `<pickers over admin reference data that should NOT get inline create>`

## Scale conventions (scale-security-reviewer)
- Pagination convention: `<connection/offset args, default + max page size>`
- Index convention: `<e.g. compound indexes starting with the tenant key>`
- Queue for heavy work: `<Bull/BullMQ/... + where>`
- Cache policy convention: `<e.g. list queries use merge:false type policies>`

## Security conventions
- RBAC: `<decorator/guard names + permission string format>`
- Tenant key resolution: `<decorator/middleware that provides it — never a client arg>`
- Input validation: `<zod/class-validator/DTO layer>`
- Dedicated isolation/security suites or skills: `<names — the reviewer recommends/runs them>`
- DB-write safety: `<any hard gate on mutating the DB during review>`

## Known accepted debt (SKIP — do not re-flag)
- `<e.g. hardcoded VAT bridge pending multi-country tax work>`
- `<e.g. legacy module X is scaffolding-grade; not a pattern source but not a finding>`

## Fix routes (orchestrator attaches these to findings)
| Finding type | Route to |
|---|---|
| missing/weak test | `<skill or agent>` |
| api change needed | `<skill or agent>` |
| web change needed | `<skill or agent>` |
| mobile change needed | `<skill or agent>` |
| schema/index change | `<skill or agent>` |
| isolation leak | `<skill or agent>` |
