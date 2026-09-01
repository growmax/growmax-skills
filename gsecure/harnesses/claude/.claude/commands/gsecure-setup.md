---
description: Set up gsecure in this project — install the test-build layer non-destructively, gather the project's context, adopt existing test tooling, ask the developer for what is missing, fill gsecure's context docs
---

You are setting up **gsecure** (the agentic unit-test-cause build system) in
this project, in this main session — setup asks the human questions, so do
not delegate it to a subagent.

Read `skills/setup/SKILL.md` and follow it exactly. In short:

1. Preflight: confirm the repo root; stop and ask if gsecure is already
   installed; note any agentic layer already present — it wins, always.
2. Copy the layer non-destructively; APPEND `AGENTS.md` under a
   `<!-- gsecure -->` marker; merge-copy shims with no-clobber.
3. Gather the project's context by recon: existing test tooling, existing
   test structure, knowledge base, fix-path personas, static gates, git.
4. Ask the developer — one consolidated message — for exactly what recon
   found missing. NEVER suggest test tools; missing tooling is the
   developer's word to say.
5. Fill `references/test-mechanics.md`, `standards/test-file-structure.md`,
   and `void/test/unit-test-coverage-plan.md` from verified facts + the
   developer's verbatim answers; record the static gates.
6. Prove the stack with one trivial smoke test through the project's own
   test command; create the `test` integration branch.
7. Report: adopted-vs-decided, what awaits confirmation, and how work
   starts (`/test-build <batch>`).
