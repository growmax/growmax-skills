# Architecture structure — the placement rulebook

Status: Pending review

<!-- This is the rulebook for writing NEW code, not a map of existing
     code. It tells any agent (or developer) WHERE a new file goes and
     WHAT may import WHAT, so two agents place the same thing the same
     way. Every rule must be checkable — "When adding X, it goes in Y" —
     never aspirational. The setup skill drafts this FROM the repo's
     real code (skills/setup Step 5); the human confirms; afterwards it
     changes only when conventions actually change. If the project
     already has a binding structure doc, this file LINKS to it instead
     of duplicating it. -->

## Folder responsibilities

<!-- One block per top-level folder:
     path/ → what belongs there (2-3 real examples from the repo)
           → what does NOT belong there, stated explicitly.
     Example shape:
       components/ → generic UI only (Button, Input, Modal).
                     Never knows anything about Quote, Order, Customer —
                     those are business components and live in modules/. -->

## Dependency direction

<!-- The allowed import flow, layer by layer, with the forbidden
     directions stated explicitly ("lower layers never import higher
     layers", "features never import each other — shared code goes
     through <path>"). Derived from real import chains, not from a
     diagram anyone would like to have. -->

## Placement rules

<!-- Numbered, checkable rules of the form:
     "When adding X, it goes in Y because Z." Add a good/bad pair where
     a rule is commonly violated. Cover at minimum: new business code,
     a second consumer of previously-local code, generic UI,
     infrastructure, shared hooks/logic, types, tests.
     Example:
       1. Business code stays inside its module — quote logic goes in
          modules/quote/, never in lib/ or components/.
       2. Shared only after reuse exists — one consumer → keep local;
          two consumers → move to shared. Never move "just in case". -->

## Decision tree (optional)

<!-- An ordered question list an agent runs BEFORE creating any new
     file. Include only when the sections above support one.
     Example shape:
       Is it infrastructure? → lib/
       Is it generic UI? → components/
       Used by one module only? → keep inside that module
       Reused across modules? → modules/shared/ -->

## Review checklist (optional)

<!-- 5-10 yes/no questions the reviewer runs mechanically against a
     diff. Include only when the rules above are stable enough to
     check against.
     Example shape:
       - Does every new file have an obvious home?
       - Is business logic inside a module, not in lib/ or components/?
       - Any new top-level folder — justified in the approved design? -->

## Shared code registry

<!-- The regression guard. For each genuinely shared component/module/
     util (2+ consumers): what it is, who consumes it (or the import
     path to grep), and what must stay true for consumers. The
     architect's blast-radius analysis reads and updates this registry;
     new entries land here as Status: Pending review until confirmed. -->
