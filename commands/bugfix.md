---
name: bugfix
description: >-
  The whole bug-fix lap in ONE command, ROUTED: a cheap bug-triage pass returns evidence, a
  deterministic table picks AUTO (0 interrupts — mechanical red-confirmation, evidence-bundle PR,
  never merges) / CONFIRM (1 plain-language question) / GATED (the classic 3 gates), then it runs
  /confirm-bug's diagnose → ruling → red repro → freeze and /fix-bug's fix → mutation check →
  blind validation → ship. Every mechanical grader runs on every route; routing decides WHO
  answers each gate, never WHETHER it runs, and can only ever add gates. Use when asked to "fix
  this bug end to end", "run the whole pipeline on this", or to fix a bug autonomously. Invoke
  with /bugfix [--gated|--auto|--shadow] <bug report, verbatim>.
---

# /bugfix — one command, the whole lap, routed

> **A thin chain plus ONE behavior of its own.** This command executes
> [`/confirm-bug`](confirm-bug.md) end to end, then — instead of stopping after the freeze —
> continues straight into [`/fix-bug`](fix-bug.md). Its own contribution is **deterministic
> routing** (Phases 0.1–0.2 below), which decides **who answers each gate — never whether a gate
> runs.**
>
> Those two files remain the single source of truth for every phase, gate, rule, and agent
> dispatch. If anything here appears to conflict with them, THEY win — **except the enumerated
> route overrides O1–O7 below, which this file owns.** Nothing outside that list may deviate from
> the halves; when in doubt, the halves win and the route downgrades. Never restate their rules
> from memory — open and follow them.

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

**Routing does not change any of this.** The route decides who answers the gates; the isolation
and the graders are untouched. On AUTO the repro is still authored by `bug-reproducer` in its own
context, still frozen by a pushed tag before any fix code exists, and still graded by a
`fix-validator` that receives only the bug id. What AUTO removes is human *interrupts*, not
verification — and its own confirmation is a parsed reporter stream, recorded honestly as
`confirmed_mode: "machine"` rather than dressed up as a human approval.

## How to run it

```
/bugfix [--gated | --auto | --shadow] <paste the bug report verbatim — URLs, values, logins, screenshots described>
```

Execute, in order:

- **Phase 0 — Intake.** `commands/confirm-bug.md` Phase 0 verbatim (BUG id, one-line restatement,
  likely surface). A report missing an expected or an actual is still a question, on every route.
- **Phase 0.1 — Triage** (subagent: `bug-triage`; no interrupt) — below.
- **Phase 0.2 — Route** (you; deterministic, no interrupt) — below.
- **Then `commands/confirm-bug.md`, all phases verbatim** — diagnosis, tier floor, GATE A,
  reproduce, GATE B, freeze (single commit + tag + push + ledger row) — subject only to the
  enumerated overrides.
- **Then `commands/fix-bug.md`, all phases verbatim** — verify-still-red, strategy from
  `meta.json`, dispatch `bug-fixer`, mutation check, dispatch `fix-validator` (bug id only),
  GATE C, promotion + ledger row — subject only to the enumerated overrides.

The interrupt budget is **route-dependent: GATED 3 · CONFIRM 1 · AUTO 0** (plus the rare
tier-escalation stop, which any route may add). Everything else is mechanical or subagent work.

### Phase 0.1 — Triage (subagent: `bug-triage`; no interrupt)

Dispatch with the verbatim report, the BUG id, and the overlay facts. It returns **one JSON
evidence object** — a class, a confidence, the call sites, the **predicted fix paths**, the
money/authz/tenant/schema flags, one precedent (`file:line`) or `null`, `introduced_by`,
`competing_hypotheses`, and the runnable suite. It never returns a route.

Dispatch error · no answer within ~90s · non-JSON output · a missing required field · an
out-of-enum `class` ⇒ record **triage failure** ⇒ route **GATED**. One redispatch at most; no
retry loops.

### Phase 0.2 — Route (you; deterministic, no interrupt)

The triage agent supplies EVIDENCE; **this table — and only this table — decides the route.** No
model judgment: every condition is a mechanical check you perform yourself.

**Routing can only ADD gates, never remove them relative to the table.** You may downgrade
AUTO→CONFIRM→GATED on any doubt or any mid-flight contradiction; you may never upgrade. Log the
full evaluation (every condition → value → pass/fail) — it travels to the ledger and into the PR.

```
Evaluate in this order; first match wins. Before AUTO can be taken you must
DETERMINISTICALLY VERIFY, yourself: (a) the cited precedent exists at its file:line
(open it), (b) every predicted_fix_path exists, (c) the runnable suite command resolves.
Verification failure is not a retry — it is GATED.

GATED   ← any of: money_path_touched OR authz_touched OR tenant_touched OR
          schema_touched (tier-RED semantics) · class == product-ambiguity ·
          confidence < 0.7 · competing_hypotheses ≥ 2 · triage failure/timeout/
          malformed · any AUTO verification failure · tag-push failure at the freeze
          (mid-flight downgrade).
AUTO    ← ALL of: predicted_fix_paths are copy/locale-resource-only · no sensitivity
          flag · (precedent ≠ null OR class ∈ the known-signature table) ·
          confidence ≥ 0.85 · competing_hypotheses == 0 · runnable_suite ≠ null ·
          deterministic verification passed.
CONFIRM ← class is a CODE-BUG class (label-collision, missing-translation, copy-typo,
          formatter-misuse, react-render, logic-error) WITH precedent ≠ null,
          OR provisional tier YELLOW with one dominant hypothesis
          (competing_hypotheses ≤ 1 AND confidence ≥ 0.7).
DEFAULT ← GATED. Anything the rows above do not positively claim is a human's.

Known-signature table (AUTO-eligible classes): label-collision · missing-translation ·
copy-typo. formatter-misuse and react-render are CONFIRM-at-best — formatters touch
money display, and render keys can mask data bugs.

Overrides (flags on the invocation): --gated forces GATED · --auto forces AUTO (logged
as overridden; verification still runs and every downgrade still fires) · --shadow
computes and LOGS the route, then RUNS GATED (ledger: `shadow:<computed> (ran GATED)`).

Per-repo overlay (.claude/E2E-NOTES.md § ROUTING) may set route_mode: live | shadow |
gated-only, and may RAISE auto_confidence_min. Thresholds may only tighten.

Mid-flight re-check, after Phase 1's diagnosis returns: if it raises final_tier to RED,
finds PRODUCT AMBIGUITY, contradicts the triage class, or surfaces any competing cause →
downgrade to GATED from that point and announce it. A raise mid-flight only adds gates.
```

Announce the outcome in one line before proceeding: *"Route: AUTO (0 interrupts) — class
label-collision, confidence 0.94, precedent verified at `locales/en.json:14`."*

## The enumerated route overrides (O1–O7)

These are the ONLY deviations from `/confirm-bug` and `/fix-bug`. Everything else in those files
executes verbatim on every route.

**O1 — Do not stop at the freeze.** Where `/confirm-bug` says the command ends, announce "repro
frozen at tag `repro-BUG-<id>`; continuing to the fix half" and proceed. (Applies to all routes.)

**O2 — Diagnosis depth.** AUTO/CONFIRM: dispatch `bug-diagnostician` with `DEPTH: confirm`, a
`VERIFIED FACTS — do not re-derive` block (the triage JSON plus what you verified yourself), and
`model: sonnet` on the dispatch. GATED: `DEPTH: full`, today's behavior.

**O3 — GATE A.**
- **AUTO:** zero questions. Compose the ruling from the verified precedent — *"Match the precedent
  at `<file:line>`: `<one-line behavior>`"* — and write it to `meta.json.ruling` with the
  provenance prefix `AUTO-applied precedent (logged, not asked):`. Set `meta.json.fix_strategy` to
  *"patch the deviating site(s) `<paths>` to match the precedent's structure"*. Log both.
- **CONFIRM:** exactly ONE `AskUserQuestion` carrying ONE question — the ruling in
  precedent-collapse form (`confirm-bug.md` GATE A). `fix_strategy` is auto-set as above, so the
  strategy question does not fire: the precedent supplies the structure, and asking twice is the
  interrupt this route exists to avoid.
- **GATED:** `/confirm-bug` GATE A verbatim, all applicable questions, one call.

**O4 — GATE B, mechanical (AUTO/CONFIRM).** Replaces the human confirmation with a parse, not with
nothing:
1. Re-run `meta.json.runner` verbatim; capture the exit code and the machine reporter stream (the
   runner is already required to emit one — `agents/bug-reproducer.md`).
2. Parse it: `expected_failure.test` must be **present and FAILING**, and its diagnostic must carry
   both `expected_failure.expected` and `.actual`. Green, a different test failing, values absent,
   or unparseable output ⇒ **downgrade GATED** and present `/confirm-bug`'s human GATE B verbatim.
3. Write `confirmed_mode: "machine"` and the `machine_confirmation` object (`reporter`,
   `primary_failed_on`, `runner_exit`, `tag`). Leave `confirmed_by_human: false` and
   `confirmed_commit: null` — the freeze is machine-made and says so.
4. ONE commit of the repro folder + spec, `git tag repro-BUG-<id>`, `git push origin repro-BUG-<id>`.
   **Push refused or offline ⇒ downgrade:** announce *"tag is local-only — the freeze is too weak
   to fix against unattended"*, hand the human `/confirm-bug`'s GATE B, and continue only on their
   answer. Never proceed unattended on a local-only tag.
5. Append the confirm ledger row.

**O5 — GATE C, branch + PR (AUTO/CONFIRM).** `/fix-bug` Phases 1, 1.5 and 2 run verbatim first —
the fixer, the mutation check, and the blind validator all execute on every route. Then, instead of
the ship question:
- Commit on branch `bugfix/BUG-<id>-auto`, push, and open a PR whose body is the evidence bundle
  below. **Never merge.** The PR is GATE C, moved to where review actually happens.
- **Promotion moves into the PR diff:** remove the `REPRO_BUG` env gate, re-run the suite un-gated,
  and include both in the branch — so merging ships the fix and the permanent regression test
  together, and the pipeline never commits to the default branch.
- Validator **FAIL** loops the fixer (cap 3) then STOPS with a report — a failing lap never opens a
  PR.
- If the fixer's diff touches paths outside `predicted_fix_paths` (plus the spec), **downgrade**:
  report to the human instead of opening the PR.
- Before opening, check for an existing open PR referencing this BUG id — comment on it rather than
  opening a second.

**O6 — Flags.** `--gated`, `--auto`, `--shadow`, as defined in the route table.

**O7 — Downgrade rules.** Triage failure · verification failure · tag-push failure · a mid-flight
tier raise or class contradiction · a fixer diff outside the predicted paths. Each converts the
REMAINDER of the lap to GATED behavior at the point it fires, announced in one line. Downgrades are
normal operation, not errors.

### The AUTO/CONFIRM PR body

```
## BUG-<id> — <title>   [route: <AUTO|CONFIRM> · interrupts: <0|1> · this PR is the human gate]
NEVER auto-merged. Merging = shipping + promotion (the env-gate removal is in this diff).

### Ruling
<ruling> — precedent <file:line>, verified at route time.
<AUTO: "auto-applied, logged not asked" | CONFIRM: "confirmed by the human at GATE A">

### Evidence bundle
- Triage evidence (verbatim JSON): <json>
- Route evaluation: <every condition → value → pass/fail>
- Machine red confirmation: runner `<cmd>` → exit <n>; `<test>` FAILED expected=<x> actual=<y>
  (reporter <tap|json>); frozen at tag `repro-BUG-<id>` → <sha> (pushed)
- Fix: <root cause, 2 lines> · files touched: <paths>
- Mutation check: reverted → primary RED on the recorded assertion · restored → green
- Blind validator: <VERDICT + EVIDENCE verbatim>
- Repo checks: <commands → results>
- Ledger rows appended: confirm + fix (see .claude/bugfix-ledger.md)

### Reviewer checklist (~2 min)
- the diff matches the precedent's shape
- the spec asserts the ruled value
- the env gate is removed in this diff
```

## When to SPLIT into the two commands instead

(Every reason below is also a reason to pass `--gated`, which keeps the single-session chain but
restores all three human gates.)

- **Maximum-rigor RED bugs** where you want the air gap — money, tenant isolation, auth — and the
  overnight pause between confirming the red and reviewing the fix is itself valuable. (The route
  table already forces GATED on those signals; splitting adds the human pause on top.)
- **Big diagnoses.** Diagnosis + repro + fix + validation in one session is a lot of context; if
  the session is running long by the freeze, stop there — that IS the `/confirm-bug` ending — and
  run `/fix-bug BUG-<id>` fresh.
- **Resuming.** If this session dies or compacts anywhere after the freeze, nothing is lost: the
  repro, tag, and `meta.json` are on disk and pushed. Resume with `/fix-bug BUG-<id>` in a new
  session. (Dies BEFORE the freeze → start `/confirm-bug` again; an unconfirmed repro is not yet
  an artifact worth resuming.)
- **Someone else fixes.** Confirm-only, hand the BUG id to a teammate; they run `/fix-bug`.

## Hard rules (inherited, restated only because this file is the entry point)

- **Every gate RUNS on every route.** The route decides who answers it: a human (GATED), one
  precedent question (CONFIRM), or the mechanical graders with a PR as the final human gate (AUTO).
  A gate is never deleted, only reassigned — and routing may only ever ADD gates relative to the
  table, never remove them.
- **Every mechanical grader runs on every route**, without exception: red-first, the frozen pushed
  tag, the mutation check, the blind default-FAIL validator, the `protect-repro` hook. AUTO buys
  fewer interrupts, never less verification. "Skipped because AUTO" is not a thing that exists.
- **AUTO never merges.** It opens a PR carrying the full evidence bundle and stops. Merging is the
  human's act, and it is what ships the fix and its promotion together.
- The freeze (commit + tag + push) happens BEFORE the fix half starts, on every route. Never defer
  it to "one commit at the end" — the tag existing before any fix code is what makes the
  validator's diff meaningful. On AUTO/CONFIRM the tag must also be **pushed**; a local-only tag
  downgrades the lap to a human gate.
- The validator's verdict is final here exactly as in `/fix-bug`: FAIL loops the fixer (cap 3),
  never an argument, and never a PR.
- **When in doubt, downgrade.** Over-gating costs the human thirty seconds; under-gating ships a
  wrong behavior with a regression test locking it in. The two are not symmetric, and every
  ambiguous signal resolves toward the human.

## Model selection (routing additions only)

The halves' tables still govern their own agents. This command adds one and adjusts one:

| Phase · agent | Recommended | Why | Don't go below |
|---|---|---|---|
| 0.1 · `bug-triage` | **Haiku** | Mechanical grep + glob + table lookup, capped at ~15 calls. Its mistakes are caught by the orchestrator's deterministic verification and become GATED, never a bad fix. | Haiku is the floor; the **designated dial** (`agents/bug-triage.md`) raises it to Sonnet if ≥2 of the first 10 routed bugs fail verification. |
| 1 · `bug-diagnostician` | **Sonnet** at `DEPTH: confirm` (AUTO/CONFIRM), **Opus** at `DEPTH: full` (GATED) | Confirm depth only re-checks already-verified evidence within ~20 calls; full depth still gates everything downstream. | Never Haiku at either depth. |

Pass `model:` on the dispatch — it outranks the agent's frontmatter.
