# Standards (standards/)

The BUILD INSTRUCTIONS for this project — engineering conventions the
architect conforms to, the builder follows, and the reviewer reviews
against. This folder is COMMITTED to git and reviewed like code.

This is NOT the business knowledge base. Business facts (what the product
does, for whom, under which rules) live in the project's own knowledge
base — its path is recorded in `workflow.config.md` under
`Knowledge base → Path`. gmax never defines that structure; the project
does.

## The two documents

- `architecture-structure.md` — the technical map: folder
  responsibilities, dependency direction, placement rules, and the
  shared-code registry (the regression guard the architect's blast-radius
  analysis reads and updates).
- `architecture-styling.md` — how the code looks: naming, styling system
  (tokens/theme source of truth), forbidden patterns. Keep it
  enforceable — rules an agent can check, not taste.

## Fill-in rules

1. Filled once per project (the setup skill drafts them from the repo;
   the human confirms), then updated when conventions change.
2. State rules as checkable statements: "When adding X, it goes in Y" —
   not aspirations.
3. Changes here are code-review material: two agents (or two developers)
   must place the same thing the same way.
4. New documents may be added only for engineering conventions
   (e.g. `api-conventions.md`, `testing.md`). Never business facts —
   those go to the project's knowledge base.
