# Application structure

<!-- The technical map: folder responsibilities, dependency direction,
     and placement rules. This is what the architect and builder conform
     to, and what the reviewer reviews against. -->

## Folder responsibilities

<!-- path/ → what belongs there, what does not -->

## Dependency direction

<!-- Which layers may import which. State the forbidden directions
     explicitly. -->

## Placement rules

<!-- Numbered rules of the form: "When adding X, it goes in Y because Z."
     These exist so two agents (or two developers) place the same thing
     the same way. -->

## Shared code registry

<!-- The regression guard. For each shared component/module/util: what it
     is, who consumes it (or how to find consumers: the import path to
     search), and what must stay true for consumers. The architect's
     blast-radius analysis reads and updates this registry. -->
