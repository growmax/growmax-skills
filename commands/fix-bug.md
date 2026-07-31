---
name: fix-bug
description: >-
  Fix a bug that already has a human-confirmed RED reproduction, then have it GRADED rather than
  self-declared — the second half of the bug-fix pipeline. Verifies the repro is still red for the
  recorded reason, fixes the ROOT CAUSE without touching the frozen repro, then dispatches an
  independent validator (fresh context, read-only, default FAIL) that checks the repro is
  byte-identical to its confirmed commit and the named assertion truly passes. Use after
  /confirm-bug, when asked to "fix BUG-nnn", or to work a repro someone else confirmed. Invoke with
  /fix-bug <BUG-id>.
---

# /fix-bug — fix against a frozen grader, then be graded

> **Run this in a session that has NOT seen the repro being written.** The repro is the oracle; a
> context that watched it being authored drifts toward making it pass rather than making the bug go
> away. If you just ran `/confirm-bug`, start a fresh session for this. Phase one is
> [`/confirm-bug`](confirm-bug.md), which produces the confirmed repro this command consumes.

You are the **orchestrator**. You do not diagnose or fix yourself — you verify the contract,
dispatch `bug-fixer`, then dispatch `fix-validator` and report its verdict. You never overrule the
validator.

**Inputs:** `$ARGUMENTS` = the BUG id (e.g. `BUG-142`). Read `repro/BUG-<id>/repro.md` +
`meta.json` and the repo overlay (`.claude/E2E-NOTES.md` / `REPRO-NOTES.md`) if present. No id, or
no such folder → say so and stop; there is nothing to grade against. If the user wants a fix with
no repro at all, tell them that is `/confirm-bug` first — a fix with no red is unfalsifiable.

## The one rule everything else serves

**"Fixed" is not a claim the fixer gets to make.** It means, exactly:

```
meta.json.runner exits 0
  AND meta.json.expected_failure.test is present and PASSING
  AND every meta.json.matrix case is present and PASSING
  AND reverting the fix makes the primary FAIL again      ← causality, not correlation
  AND git diff repro-BUG-<id> -- repro/BUG-<id>/ <spec_path>  is EMPTY   (tag; legacy: confirmed_commit)
  AND the repo's own checks for the touched package(s) are green
```

The **last** clause is what makes the others mean anything. The **fourth** is what distinguishes a
fix from a coincidence: a green run alone cannot tell you the repro was ever testing *your change*.

## Hard rules
- **The repro is frozen.** Nobody in this session edits `repro/**`, the repro spec, the runner
  script, or any test-runner config. Not to "improve" it, not to fix a typo in it. If the repro is
  genuinely wrong, STOP and hand it back to the human — a wrong grader is re-confirmed via
  `/confirm-bug`, never patched mid-fix.
- **Root cause, not symptom.** Seeding the expected value, swallowing an error, defaulting, or
  branching on the repro's inputs is NOT a fix — it is a counterfeit.
- **RED FIRST (blocks).** If the repro does not currently fail on its recorded assertion, stop and
  report. Never fix against a passing or differently-failing test.
- **CAUSALITY (blocks).** The mutation check must show the primary going red when the fix is
  reverted. If reverting leaves it green, the repro was never testing this fix — stop, do not ship,
  and say so plainly. Never skip this because the run is already green; green is exactly when it
  lies to you.
- **TIER ESCALATION (blocks, rare).** If the fixer finds the real blast radius is worse than
  `risk_tier` recorded — it is a money path, or a shared unit with more callers than assessed — STOP
  and confirm with the human before continuing. This is the one interrupt the plan did not
  anticipate, and it fires on a problem rather than on schedule.
- **The approved strategy is a constraint.** Implement `meta.json.fix_strategy`. If the code makes it
  wrong, the fixer stops and reports — it does not silently choose another structure, and this
  session does not re-open the strategy question on its own.
- **The validator's verdict stands.** On FAIL you may loop back to the fixer with the reason, but
  you never argue, reinterpret, or downgrade a check to reach PASS. A validator that can be talked
  around is decoration.
- **DB-WRITE SAFETY (blocks).** If the fix or the repro run needs a database, confirm the target is
  local/throwaway before any write. Never point a fix loop at shared dev or production data.
- **Money/tenant/auth paths** keep their guards. Never widen a tenant scope or disable a check to
  make a number match.

## Workflow

### Phase 0 — Verify the contract (you)
Read `meta.json`. The repro must be confirmed — `confirmed_by_human: true`, or
`confirmed_mode: "machine"` with its complete `machine_confirmation` evidence object — AND an
anchor must exist: the tag `repro-BUG-<id>` (`git rev-parse repro-BUG-<id>` succeeds), or on a
legacy **human** repro `confirmed_commit` set. Machine mode requires the tag, always. Neither →
stop: the repro was never frozen, so "unchanged since confirmation" is unprovable. Then
run `meta.json.runner` yourself once and confirm it fails on the recorded assertion. Already green
→ report and stop (fixed elsewhere, or environment-dependent). Failing differently → report the
delta and stop; the human decides whether that is drift or a second bug.

### Phase 0.5 — Confirm the strategy (you; usually silent)
Read `meta.json.fix_strategy` and `risk_tier`.
- **Set** (the normal case — chosen at Gate A) → state it in one line and proceed. No interrupt: the
  human already decided this, and re-asking is how a pipeline earns its reputation for nagging.
- **Null AND tier ≥ YELLOW** (an older repro confirmed before strategies were recorded) → ask once,
  via `AskUserQuestion`, using structural options you derive from the code: patch the one call site ·
  consolidate the duplicates behind one shared unit · drop the surface. Then proceed.
- **Null AND tier GREEN** → proceed. A copy fix does not need a structure debate.

The strategy is a constraint on the fixer, not a suggestion: it implements *that* structure or stops.

### Phase 1 — Fix (subagent: `bug-fixer`)
Dispatch with the BUG id, the repro contract, and the overlay. It states the root cause before
editing, makes the smallest change at the cause, prefers the repo's existing canonical helper over
a second implementation, checks the blast radius, and re-runs the runner plus the narrowest
relevant suite and typecheck. It may add tests elsewhere; it may not touch the grader. It returns
root cause · fix · blast radius · real command output — and explicitly does not declare the bug
fixed.

### Phase 1.5 — Mutation check (you; mechanical, no interrupt)
A green repro proves correlation. This proves **causality**: that the repro fails *without* your fix.
It is the cheapest assurance in the pipeline and it runs on every tier, because it costs the human
nothing.

Collect the changed paths — tracked and new — and refuse to touch the grader:

```sh
CHANGED=$( { git diff --name-only; git ls-files --others --exclude-standard; } | sort -u )
```

1. **Guard first.** If any path is under `repro/` or equals `spec_path` → **STOP, FAIL**: the fixer
   touched the grader. Do not stash, do not continue. (Do not hand-parse `git status --porcelain` —
   it mangles renames and paths with spaces.)
2. `git stash push -u -- $CHANGED` — pathspec-limited, so it reverts tracked edits AND removes new
   untracked files while **leaving your unrelated work-in-progress alone**. Requires git ≥ 2.13;
   older versions error rather than silently widening the stash.
3. Run `meta.json.runner`. The primary **MUST fail on the recorded assertion**.
4. `git stash pop`, then confirm the tree is restored (the changed paths are back, content identical).
5. Run `meta.json.runner` again → must pass, primary and matrix.

Reading the outcome:

| Reverted run | Meaning | Action |
|---|---|---|
| fails on the recorded assertion | ✅ the repro tests this fix | proceed to validation |
| **passes** | 🚨 **the repro does not test this fix** — either the repro is wrong or the fix is incidental | **STOP. Do not ship.** Report both possibilities; the human decides which |
| fails on a *different* assertion | suspicious — a second defect, or an order-dependent fixture | report it and let the human decide |
| `stash pop` fails | tree may be mid-restore | **LOUD stop.** Name the stash entry (`git stash list`) and the recovery command. Never leave a broken tree quietly |

Keep the evidence (both runs' relevant output) for the Gate C report and the commit message. Do
**not** write it into `repro/**` — that folder must stay byte-identical to the confirmation tag, and a
mutation log inside it would fail the validator's own check.

### Phase 2 — Validate (subagent: `fix-validator`)
Dispatch with **the BUG id and nothing else** — no diff, no fixer report, no rationale. Its context
must be clean so it grades the artifact rather than the story. It runs the five checks (contract ·
grader-untouched vs the **confirmation tag** `repro-BUG-<id>` (the tag outranks `meta.json` — a
moved or missing tag on a repro that should have one is itself a tamper signal) · runner exit 0 ·
primary **and every matrix case** present and passing, parsed from the runner's machine-readable
reporter output · repo checks green) and returns `VERDICT: PASS | FAIL` with evidence.

It does **not** run the mutation check — deliberately. It has no write tools, which is what makes it
trustworthy, and revert/reapply needs them. Causality is proven in Phase 1.5 and travels in the Gate
C report; the validator stays purely artifact-based.

- **FAIL** → give the fixer the verdict's reason and loop Phase 1. **Cap: 3 loops**, then stop and
  hand it to the human with everything learned. A fix that cannot pass an honest grader in three
  attempts is a signal, not a grind.
- **PASS** → Gate C.

### GATE C — Human review (block; your last interrupt)

> *Route overrides under `/bugfix`: see the enumerated table O1–O7 in
> [`commands/bugfix.md`](bugfix.md) — on AUTO/CONFIRM this gate becomes an evidence-bundle PR that
> is never auto-merged. This file stays the source of truth for the gate itself.*
Present, in this order: the validator's `VERDICT` + `EVIDENCE` **verbatim**, the **mutation-check
result** (reverted → red, restored → green), the root cause, the blast radius, and the strategy that
was implemented. Then ask via `AskUserQuestion`: **ship it** (commit) · **needs changes** (loop with
their note) · **hold** (leave the work in place, nothing committed). Do not commit on your own
initiative.

### Phase 3 — Promote and record (you, after approval)
1. **Remove the repro's `REPRO_BUG` env gate** so the spec runs in every normal test run from now
   on. This is the step that converts a one-off repro into a permanent regression test — skip it
   and the bug can silently return. Re-run the suite once un-gated to confirm it is green in the
   normal path, and say so.
2. If the repo keeps a bug/coverage ledger, append: BUG id · root cause one-liner · the spec now
   guarding it.
3. Commit the fix + the promotion (never the repro's content — that is already committed and
   unchanged). Reference the BUG id, and record the mutation-check result in the commit message —
   it is the durable evidence that this repro actually guards this fix.
4. Append one row to the run ledger `.claude/bugfix-ledger.md` (same file `/confirm-bug` writes;
   create with a header on first use): `date · BUG id · tier · route · fix loops · mutation result ·
   verdict · human decision (ship|changes|hold|PR-<n>) · agent tokens (approx) · promoted?`.
   Standalone runs write `route=manual`; `/bugfix`'s AUTO/CONFIRM routes write the route, `PR-<n>`
   as the decision, and `promoted? = on-merge` (the env-gate removal ships inside the PR diff). After ~20 rows the **false-fixed rate** (validator said
   PASS, bug came back) is the pipeline's real assurance number — >5% means tighten the validator,
   not the workers.
5. **Report honestly:** what changed, what the validator verified, what the mutation check proved,
   what is still unverified (e.g. "the currency side-finding is untouched — separate bug"), and any
   risk you would watch.

## Model selection
| Phase · agent | Recommended | Why | Don't go below |
|---|---|---|---|
| Orchestrator (this session) | **Sonnet** | Verifies the contract, enforces the loop cap, never overrules the verdict. | Sonnet. |
| 1 · `bug-fixer` | **Sonnet** (Opus for money/tenant/auth/concurrency) | Coding against a fixed target; iterates, so cost matters. Root-cause work on money paths is worth the upgrade. | Sonnet — weaker models reach for the symptom. |
| 2 · `fix-validator` | **Sonnet** | Must catch a skipped/renamed test and a repro-shaped special case; both are subtle and safety-critical. | **Never Haiku** — a grader that rubber-stamps defeats the pipeline. |

## Notes
- Standalone re-grade: [`/validate-fix <BUG-id>`](validate-fix.md) runs the same `fix-validator`
  on its own — for grading someone else's fix, a CI check, or a second opinion you didn't watch.
- Side-findings the fixer trips over are reported as NEW candidate bugs, never folded into this
  one. Each gets its own `/confirm-bug`.
- Keep run logs and diffs out of the main thread; the commit and the verdict are the record.
- **Token hygiene:** pass each subagent the CONTRACT (`meta.json`, the ruling, the paths), never
  transcripts or prior agents' full reports — the artifacts on disk are the interface, and a
  subagent that needs more reads it itself in its own context.
