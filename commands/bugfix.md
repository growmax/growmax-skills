---
name: bugfix
description: >-
  The whole bug-fix lap in ONE command: /confirm-bug's diagnose → ruling → red repro → freeze,
  then /fix-bug's fix → mutation check → blind validation → ship — chained in a single session
  with the same three human interrupts. Safe to chain because context isolation lives in the
  SUBAGENTS (reproducer, fixer, and validator each run in fresh contexts; the validator receives
  only the bug id) and grader integrity lives in the PUSHED TAG, not in session boundaries. Use
  when asked to "fix this bug end to end", "run the whole pipeline on this", or for routine
  YELLOW/GREEN bugs where two sessions is ceremony. Invoke with /bugfix <bug report, verbatim>.
---

# /bugfix — one command, the whole lap

> **Thin chain, not a fork.** This command adds NO new behavior: it executes
> [`/confirm-bug`](confirm-bug.md) end to end, then — instead of stopping after the freeze —
> continues straight into [`/fix-bug`](fix-bug.md). Those two files remain the single source of
> truth for every phase, gate, rule, and agent dispatch. If anything here appears to conflict with
> them, THEY win. Never restate their rules from memory — open and follow them.

## Why one session is safe (read before trusting it)

The original two-session rule existed to keep the fix out of the context that authored the repro.
That isolation is preserved here, because it never actually lived in the session boundary:

- **The workers are context-isolated.** `bug-reproducer` authors the red in its own context;
  `bug-fixer` fixes in a fresh one; `fix-validator` grades blind, receiving **only the bug id** —
  chaining phases in one session changes none of that.
- **Grader integrity is mechanical, not behavioral.** The repro is frozen by a pushed tag
  (`repro-BUG-<id>`) BEFORE the fix half begins; the validator diffs against the tag; the
  protect-repro hook blocks edit attempts. None of these care how many sessions you used.
- **The orchestrator (this session) knows both halves — and that is acceptable** because the
  orchestrator never writes application code and never grades. It threads contracts and enforces
  gates.

What one session does NOT give you: the air gap of a human walking away between red and fix. For
that, use the two commands separately — see "when to split", below.

## How to run it

```
/bugfix <paste the bug report verbatim — URLs, values, logins, screenshots described>
```

Execute, in order:

1. **`commands/confirm-bug.md`, all phases verbatim** — intake, diagnosis, tier floor, GATE A
   (ruling + strategy + discriminators, one call), reproduce, GATE B (confirm the red, tiered
   rigor), and the freeze (single commit + tag + push + ledger row).
   **One override:** where `/confirm-bug` says the command ends after the freeze, do NOT end —
   announce "repro frozen at tag repro-BUG-<id>; continuing to the fix half" and proceed.
2. **`commands/fix-bug.md`, all phases verbatim** — verify-still-red, strategy from `meta.json`
   (already set at GATE A, so Phase 0.5 is silent), dispatch `bug-fixer`, mutation check, dispatch
   `fix-validator` (bug id only), GATE C (ship / changes / hold), promotion + ledger row.

The interrupt budget is unchanged: **three** (GATE A · GATE B · GATE C), plus the rare tier-
escalation stop. Everything between them is mechanical or subagent work.

## When to SPLIT into the two commands instead

- **Maximum-rigor RED bugs** where you want the air gap — money, tenant isolation, auth — and the
  overnight pause between confirming the red and reviewing the fix is itself valuable.
- **Big diagnoses.** Diagnosis + repro + fix + validation in one session is a lot of context; if
  the session is running long by the freeze, stop there — that IS the `/confirm-bug` ending — and
  run `/fix-bug BUG-<id>` fresh.
- **Resuming.** If this session dies or compacts anywhere after the freeze, nothing is lost: the
  repro, tag, and `meta.json` are on disk and pushed. Resume with `/fix-bug BUG-<id>` in a new
  session. (Dies BEFORE the freeze → start `/confirm-bug` again; an unconfirmed repro is not yet
  an artifact worth resuming.)
- **Someone else fixes.** Confirm-only, hand the BUG id to a teammate; they run `/fix-bug`.

## Hard rules (inherited, restated only because this file is the entry point)

- Both gates that block in the halves still block here — chaining is not a license to skim GATE B.
- The freeze (commit + tag + push) happens BEFORE the fix half starts. Never defer it to "one
  commit at the end" — the tag existing before any fix code is what makes the validator's diff
  meaningful.
- The validator's verdict is final here exactly as in `/fix-bug`: FAIL loops the fixer (cap 3),
  never an argument.
- This command never runs unattended. Three human gates are the design, not a ceiling to optimize
  away.
