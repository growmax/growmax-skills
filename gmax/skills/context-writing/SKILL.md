---
name: context-writing
description: Use when writing or maintaining knowledge-base documents — one-fact-one-home, the direct-write + review-flip lifecycle (Pending review → Confirmed), and adapting to the project's OWN knowledge-base structure. Never impose a gmax taxonomy.
---

# Context writing

How facts enter and live in the project's knowledge base. gmax does NOT
own that structure — the knowledge-base root, index file, and write
policy are recorded in `workflow.config.md` → Knowledge base. Follow the
structure and status conventions you find there. The rules below are the
portable discipline that binds regardless of the KB's shape.

## The rules (binding)

1. **Placement follows the project's KB structure**, never a gmax
   taxonomy. Read the KB's index/README first; place each fact where
   that structure says it belongs. If the KB has no stated structure,
   place by ownership (app-level / module / shared-within-module) and
   say which convention you used.
2. Every fact lives in exactly ONE file. Others link to it.
3. If the KB has an index file, it maps every document — one line each,
   tagged with the project's status convention; update it on every
   add/rename/remove/status flip. If the KB has none (`Index file:
   none`), link new docs from their nearest parent doc instead.
4. No speculative structure: a folder or document exists only when its
   first real fact does.
5. **Direct write, single pass.** Facts are written ONCE, directly into
   their knowledge-base home, marked unconfirmed per the KB's write
   policy (default: `Status: Pending review`). There is no draft
   document elsewhere and no second authoring pass.

## The lifecycle

Agent-DERIVED facts (from code recon, from inference):

1. **Write** the fact at its KB home (merged section in an existing doc
   preferred over a second home). Header: unconfirmed (default
   `Status: Pending review`).
2. **Index or link it** per rule 3 above.
3. **Tell the human exactly which files to review** — paths, one line
   each, nothing else to read.
4. **Corrections** → edit in place. **Confirmation** → flip the status
   per the KB's convention (default `Status: Confirmed`). One-line
   edits only.

Developer-STAGED facts (the developer states a rule, a correction, a
decision — including "update the context: ..."):

- Write them directly as Confirmed. The developer is the authority —
  their statements do not need a review round. One write, in place,
  done.

Committing: the KB is committed to git. The orchestrator commits a KB
file at the moment it becomes Confirmed (`docs(context): ...`), staging
exactly those files. Pending-review files stay uncommitted by default
so git never carries unverified truth.

## What does NOT go into the KB

Engineering build conventions — folder placement rules, dependency
direction, styling system, the shared-code registry, known mistake
classes (drift) — go into `standards/`, not the business KB. See
`standards/README.md`.

## Style

- Plain words, short sentences. These files are read at gates and by
  agents mid-task.
- Cite evidence as `path:line` when the fact comes from code.
- No decision theater: record what IS true and what is DECIDED, not
  rejected options.
- If a new fact contradicts an existing document, do NOT merge silently:
  report the contradiction so the human decides which is true.
