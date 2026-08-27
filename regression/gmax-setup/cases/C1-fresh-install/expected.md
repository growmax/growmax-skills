# C1 — fresh install: expected

Sandbox: tinyshop (package.json + src/ + pre-existing AGENTS.md + docs/ KB + .gitignore
without `void/`). Run the deterministic steps of `gmax/skills/setup/SKILL.md` (Steps 1-3)
against the repo's `gmax/` module.

Every assertion in `verify.sh` must print `ok`:

1. `.gmax-version` is byte-identical to the module's `VERSION`.
2. `agents/`, `skills/`, `standards/`, `workflow.config.md`, `void/README.md` all landed.
3. The Claude shim tree landed at `.claude/agents/` and each shim references the canonical
   `agents/<name>.md` file.
4. The project's pre-existing `AGENTS.md` is APPENDED to (original line intact, gmax block
   present under the `<!-- gmax -->` marker) — never replaced.
5. `.gitignore` gained `void/`; `git check-ignore` confirms `void/` is ignored and
   `standards/` is NOT.
6. The existing knowledge base (`docs/pricing.md`) and fixture source are byte-identical —
   the install never creates, moves, or edits project content.

Any `NOT OK` = the install contract is broken; do not ship the `gmax/` change that caused it.
