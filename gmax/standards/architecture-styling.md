# Styling — the UI construction rulebook

Status: Pending review

<!-- This is the binding standard for how UI code is WRITTEN, not a
     description of current styles. The planner plans against it, the
     builder builds to it, the reviewer checks it mechanically. Every
     rule must be checkable — "no hardcoded values; tokens only" —
     never taste. The setup skill drafts this FROM the repo's real
     screens and components (skills/setup Step 5); where the code is
     inconsistent it records the DOMINANT observed pattern and lists
     the conflicts as questions for the developer. If the project
     already has a binding styling doc, this file LINKS to it instead
     of duplicating it. -->

## Styling source of truth

<!-- Where visual values live (theme/token files, tailwind config, CSS
     variables, ...) and the import rule for consumers.
     Example shape: "All visual values live in src/lib/theme/. Colors
     are two layers: a private raw palette and public semantic tokens.
     Screens and components import ONLY semantic tokens — never the
     palette, never a raw hex." -->

## Hard rules

<!-- Numbered, no-exceptions rules an agent can verify in a diff.
     Example shape:
       1. No hardcoded values — every color/spacing/radius/font size
          comes from the theme. A missing token is added to the theme
          file, never inlined at the call site.
       2. No style fallbacks — no ?? '#000', no || {}, no default-param
          styles. A missing token is fixed at the source. -->

## How UI is built

<!-- The construction patterns, observed from reading real screens and
     components — never from config files alone. 3-8 one-line patterns,
     each citing where it was observed. Cover: how components are
     composed (primitives with variants?), how text/typography renders
     (a variant-based Text component? utility classes?), how styles are
     declared (StyleSheet.create at file bottom? CSS modules? class
     names?), layout conventions (flex + gap on parent? grid?), safe
     areas and platform differences.
     Example shape:
       - Typography is a component, not a style — text renders through
         a variant-based Text component; screens never set fontFamily
         directly (src/components/Text.tsx). -->

## Naming

<!-- Files, components, style objects, token names — with real examples
     from the repo (e.g. PascalCase components, camelCase hooks/utils,
     lowercase folders). -->

## Forbidden patterns / what we don't use

<!-- The explicit no-list, observed or developer-stated.
     Example shape: no inline style objects re-created every render, no
     CSS-in-JS runtime, no scattered style constants outside the theme,
     no magic numbers — values always come from the scale. -->
