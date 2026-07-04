---
type: module
title: <Module name, e.g. Payments>
description: <one line — what this module is for>
status: draft            # draft (code-only) | interviewed (human resolved material assumptions) | stable (code+walk+human agree)
verified_at_commit: <sha> # the commit this note was last checked against
sources: [code]          # subset of [code, walk, docs, human]
open_questions: []       # Q-ids still OPEN in ../open-questions.md, e.g. [Q-012, Q-031]
timestamp: <YYYY-MM-DD>
---

# <Module name>

## What it is
<2–4 sentences. Who uses it, for what.> [code]

## How it works
<The flows, step by step, in plain language. One subsection per flow if several.>
1. <step> [walk]
2. <step> [code]

## Business rules
<The correctness claims — the payload of this note. One rule per line, each tagged.>
- <rule confirmed by the human> [human: Q-014 ✓]
- <rule read from service code> [code]
- <best guess, not yet confirmed> [ASSUMPTION, conf: med] (→ Q-031)

## Roles & permissions
- <role>: <what they can see/do> [code]

## Data touched
- <tables/models this module owns or writes> [code]

## Connections
- Feeds [<Sibling module>](<sibling-slug>.md) via <what>.
- Depends on [<Other module>](<other-slug>.md) for <what>.

## Known gaps / suspicions
- <inconsistency, dead end, or parity hole noticed — mirror material ones into ../suggestions.md> [suggestion, conf: low]
