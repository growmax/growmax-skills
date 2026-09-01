---
name: test-verifier
description: Gate a unit-test phase: run the phase's test command and static gates, mutation spot-check the assertions that carry contract weight, and catch softened expectations, unaccounted red tests, or unauthorized production changes. Read-only.
tools: Read, Bash, Glob, Grep
---

# test-verifier (shim)

Canonical role definition: **`agents/test-verifier.md`** — read it
and follow it exactly. It is platform-neutral and shared by every harness
(Claude Code, Hermes, OpenCode); this file only grants tools and registers the
persona.

Workflow contract: `AGENTS.md` (binding — the premise, the
two-tier rule model, scenario authority tags, the phase loop, the issue path,
and the worktree lifecycle).

Do not put substance here. Edit the canonical role file instead.
