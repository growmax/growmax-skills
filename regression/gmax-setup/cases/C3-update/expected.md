# C3 — update: expected

Sandbox: tinyshop with gmax 1.0.0 installed, plus a "shipped" module bumped to 9.9.9 carrying
one canonical change (`agents/builder.md`) and one shim change
(`harnesses/claude/.claude/agents/builder.md`). This mirrors a teammate running
`/plugin marketplace update growmax` and then `/gmax-update`.

Expected behavior, per `commands/gmax-update.md`:

1. Versions differ (1.0.0 vs 9.9.9) → the update proceeds (human confirm assumed YES in this
   headless harness).
2. Canonical set refreshed: the new builder persona line lands in `agents/builder.md` AND the
   shim change lands in `.claude/agents/builder.md`; `.gmax-version` becomes 9.9.9.
3. Project truth is byte-identical afterwards: `workflow.config.md`, `standards/`, `docs/`
   (the KB), the project part of `AGENTS.md`, `src/`, `.gitignore` — the update NEVER touches
   these.
4. A second run with matching versions reports `CURRENT 9.9.9` and changes nothing (no diff,
   no questions).

Any `NOT OK` = the update's never-touch contract regressed; do not ship.
