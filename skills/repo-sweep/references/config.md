# `sweep.config.json` — teaching the sweep about your repo

Entirely optional. Without it the sweep works on any git repo using generic defaults: it
skips binaries, lockfiles, build output and generated code, and it orders units by words
that mean the same thing everywhere (money, auth, schema, src, tests, docs).

A config buys you two things the defaults cannot know: **which files are not real work in
THIS repo**, and **what a reader should be watching for in THIS repo**.

## Where it goes

Looked up in this order, first hit wins:

1. `$SWEEP_CONFIG` (env)
2. `sweep.config.json` at the repo root
3. `.sweeprc.json` at the repo root
4. `docs/sweep/sweep.config.json`

A config that exists but does not parse is a hard error — falling back to defaults would
silently change which files get swept.

## Shape

```json
{
  "outDir": "docs/sweep",
  "maxFiles": 25,
  "maxBytes": 220000,

  "exclude": [
    ["(^|/)prisma/migrations/.*\\.sql$", "migration-sql"],
    ["(^|/)public/locales/.*\\.json$", "translation-data"]
  ],
  "replaceDefaultExcludes": false,

  "priority": [
    ["^packages/database/", 2, "data-model"],
    ["^apps/api/src/modules/", 2, "api-module"],
    ["^apps/(buyer-app|sales-app)/", 4, "mobile"]
  ],
  "replaceDefaultPriorities": false,

  "invariants": [
    "every Prisma query filters by organizationId and deletedAt",
    "money is never formatted with a hardcoded currency symbol",
    "every GraphQL mutation carries an enforced permission check"
  ],

  "riskTypes": ["none", "tenant", "money", "auth", "data-loss", "perf"]
}
```

| Key | Default | What it does |
|---|---|---|
| `outDir` | `docs/sweep` | Where the ledger, per-unit state and artifacts are written, relative to the repo root. Overridden by `$SWEEP_OUT_DIR`. |
| `maxFiles` / `maxBytes` | `25` / `220000` | How big one unit may get. A unit must fit comfortably in one empty context — raise these only if your files are unusually small. |
| `exclude` | see `lib.mjs` | `[regexSource, reason]` pairs. **Prepended** to the defaults, so yours win. Every excluded file is listed in the ledger with its reason, so the denominator always reconciles against `git ls-files`. |
| `priority` | word-based | `[regexSource, rank, label]`. Rank 1 sweeps first. Prepended to the defaults. Ordering matters because a partial sweep should have covered the code that matters. |
| `replaceDefault*` | `false` | Set true to drop the built-ins entirely. Rarely what you want — the defaults exclude binaries and lockfiles. |
| `invariants` | none | Free-text lines injected into **both** the writer and grader prompts. This is the highest-leverage key: it is how a grader knows that an unscoped query or a raw currency symbol is a missed risk rather than a style opinion. |
| `riskTypes` | `none, tenant, money, auth, data-loss, perf` | The vocabulary for a file's `risk`. `verify-unit.mjs` rejects any value outside it, so the artifacts stay machine-queryable. |

Regexes are JSON strings compiled case-insensitively — remember to double the backslashes.

## Writing good `invariants`

They are read by an agent that has never seen your repo before, so make each one a thing it
can spot in a file it is holding, not a value it has to share:

- Good: *"every Prisma query filters by `organizationId`"* — mechanical, checkable per file.
- Good: *"money is `Decimal`, never `Float`, in new code"*.
- Weak: *"code should be maintainable"* — nothing to look for.

Five to ten lines is plenty. They cost tokens on every one of hundreds of units, so spend
them on the things whose absence would actually hurt.

## The output dir sweeps itself out

Whatever `outDir` points at is excluded from the sweep automatically, with reason
`sweep-output`. Commit the artifacts if you want them (they are the deliverable) — the next
run will not try to read its own ledger, and the denominator stays the repo, not the repo
plus everything the sweep has written so far.
