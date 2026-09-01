---
name: test-orchestrator
description: "Drive ONE batch of the unit-test build (void/test/Flow-based-plans/unit-test-<batch>.md) end to end: pre-flight, worktree-per-phase waves, designer/adversary/implementer/triage loop, production-defect issue filing, merges, ledgers and commits. Run as the MAIN session via /test-build — it owns the human gates."
tools: Read, Grep, Glob, Bash, Edit, Write, Task
---

# test-orchestrator (shim)

Canonical role definition: **`agents/test-orchestrator.md`** — read it
and follow it exactly. It is platform-neutral and shared by every harness
(Claude Code, Hermes, OpenCode); this file only grants tools and registers the
persona.

Workflow contract: `AGENTS.md` (binding — the premise, the
two-tier rule model, scenario authority tags, the phase loop, the issue path,
and the worktree lifecycle).

Do not put substance here. Edit the canonical role file instead.
