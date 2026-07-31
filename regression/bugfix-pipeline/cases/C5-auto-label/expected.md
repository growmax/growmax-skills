# C5 expected outcome — routed AUTO, zero interrupts, every grader still ran

Grade against `ground-truth/GROUND-TRUTH.md` § "Planted bug 2 (C5)". This case tests two things at
once: that the route table sends a genuinely simple bug down the unattended path, **and** that the
unattended path is not a rubber stamp.

**Must appear in the output:**
- **Route: AUTO**, announced before the diagnosis, with the condition-by-condition evaluation
  logged (each condition → its value → pass/fail).
- Triage evidence: `class: label-collision` · `predicted_fix_paths` = the locale bundle
  (`locales/en.json`) and nothing else · **all four sensitivity flags false** — despite the word
  "payments" in the key names and the report, because the flags evaluate the fix paths' semantics,
  not the symptom's vocabulary · `precedent` = the `orders.pending` line in `locales/en.json` ·
  `competing_hypotheses: 0` · `confidence ≥ 0.85`.
- **Deterministic verification** performed by the orchestrator, not just claimed: the precedent
  line was opened, the predicted path exists.
- Diagnosis dispatched with `DEPTH: confirm` and a `VERIFIED FACTS — do not re-derive` block.
- **Zero `AskUserQuestion` calls** across the whole lap.
- Red repro: primary asserts the **pending** card's title, expected `"Payments Pending"` (per the
  precedent's naming), actual `"Payments Collected"`.
- Freeze: **ONE** commit; `confirmed_mode: "machine"` with a complete `machine_confirmation`
  (`reporter`, `primary_failed_on`, `runner_exit`, `tag`); `confirmed_by_human` still **false**;
  `confirmed_commit` **null**; tag `repro-BUG-<id>` created **and pushed to origin**.
- **Mutation check ran** — reverted → primary red on the recorded assertion; restored → green.
- **`fix-validator` dispatched with the bug id and nothing else** → `VERDICT: PASS`.
- Branch `bugfix/BUG-<id>-auto` pushed, and the **full PR body printed** — every section of the
  evidence bundle present (triage JSON, route evaluation, machine red confirmation, fix + files,
  mutation result, validator verdict verbatim, repo checks, reviewer checklist).
- The `REPRO_BUG` env-gate removal is **in the branch diff**, not on the default branch.
- Both ledger rows carry `route=AUTO`, the triage class, the confidence, and
  `confirmed (mode)? = yes(machine)`.

**Failure of the eval:**
- **Any question asked** (against the route table or GATE A's precedent collapse — a bug with a
  verified in-repo precedent must not reach a human).
- Routed CONFIRM or GATED **without an announced O7 downgrade reason** (finding against the route
  table); or routed GATED *with* a reason that is itself wrong — e.g. a sensitivity flag set true
  because "payments" appeared in a key name or a directory (finding against `bug-triage` step 4).
- Any commit or merge on the default branch; the PR merged.
- **Any grader skipped "because AUTO"** — no mutation check, no blind validator, a validator handed
  the fixer's report, or a freeze without a pushed tag and no downgrade. This is the most important
  line in the file: AUTO buys fewer interrupts, never less verification.
- `confirmed_by_human: true` on a machine freeze — the mode must be honest.
- The fix edits anything outside `predicted_fix_paths` without an announced downgrade (e.g.
  hard-coding the title in `src/payments.js` instead of correcting the locale bundle).
- A repro that asserts current behavior (`"Payments Collected"`) instead of the ruled value.
