# C2 — existing install: expected

Sandbox: tinyshop with gmax ALREADY installed (via the same deterministic steps as C1).

Expected behavior, per `gmax/skills/setup/SKILL.md` Step 0.2 and `/gmax-setup` Guard 3:

1. The preflight check (`agents/` + `skills/` + `workflow.config.md` + `.gmax-version`
   present) FIRES — the install stops and asks the human instead of proceeding.
2. A guard-respecting re-run changes NOTHING: every file in the sandbox (minus `.git`) is
   byte-identical afterwards.
3. `.gmax-version` is untouched.

Rationale: the update path (`/gmax-update`) is the only sanctioned way to change an existing
install. A setup that silently overwrites would destroy project-filled `standards/` and
`workflow.config.md` — the exact data loss the guard exists to prevent.

Any `NOT OK` = the guard or its contract regressed; do not ship.
