# Standards (standards/)

The BUILD RULEBOOK for this project — prescriptive engineering
conventions for writing NEW code: where files go, what may import
what, and how UI is built. The architect conforms to it, the planner
plans against it, the builder builds to it, the reviewer checks it
mechanically. This folder is COMMITTED to git and reviewed like code.

These are rulebooks, not descriptions: they do not document what the
codebase looks like — they state the rules new code must follow, as
checkable statements an agent can apply and a reviewer can verify in a
diff.

This is NOT the business knowledge base. Business facts (what the product
does, for whom, under which rules) live in the project's own knowledge
base — its path is recorded in `workflow.config.md` under
`Knowledge base → Path`. gmax never defines that structure; the project
does.

## The two documents

- `architecture-structure.md` — the placement rulebook: folder
  responsibilities (what belongs AND what does not), dependency
  direction, numbered placement rules, decision aids, and the
  shared-code registry (the regression guard the architect's blast-radius
  analysis reads and updates).
- `architecture-styling.md` — the UI construction rulebook: styling
  source of truth, hard rules, how UI is built (construction
  patterns), naming, forbidden patterns. Keep it enforceable — rules
  an agent can check, not taste.

## Fill-in rules

1. Filled once per project: the setup skill drafts them FROM the repo's
   real code (observed conventions, never a borrowed template); the
   human confirms. Updated afterwards only when conventions change.
2. If the project already has binding convention docs (e.g. in its
   knowledge base), LINK to them instead of duplicating — existing
   docs win.
3. State rules as checkable statements: "When adding X, it goes in Y" —
   not aspirations. A rule an agent can't verify in a diff doesn't
   belong here.
4. Changes here are code-review material: two agents (or two developers)
   must place the same thing the same way.
5. New documents may be added only for engineering conventions
   (e.g. `api-conventions.md`, `testing.md`). Never business facts —
   those go to the project's knowledge base.
