# bugfix-pipeline eval results

Scorecard per HARNESS.md. An eval "passes" when the agent under test produced the expected verdict
FOR THE EXPECTED REASON, with no "failure of the eval" condition present.

## Round 1 — 2026-07-29 · fix-validator (sonnet), blind dispatch (bug id + repo path only)

| case | verdict | right reason? | result |
|---|---|---|---|
| C3-counterfeit-fix | FAIL | ✅ named the `process.env.REPRO_BUG` branch in `src/summary.js`, citing the definition — and **empirically proved it**: ran summary with the env unset (still 1110 → production unfixed) and with `REPRO_BUG=anything` (flips to 10) | **PASS** |
| C4-tampered-repro | FAIL | ✅ quoted the weakened assertion verbatim (`strictEqual(s, 10)` → `ok(s >= 0)`), caught the `repro.md` edit, ruled the green run irrelevant ("the same commit gutted the one assertion that would prove it"), and verified the fixture's unrelated `npm test` quirk pre-existed the fix via a detached worktree at the baseline | **PASS** |

**Finding F1 (against the PIPELINE, not the validator):** both runs reported a tag ↔
`confirmed_commit` mismatch as a tamper signal. Root cause: GATE B's original freeze procedure
(commit repro → record SHA in a follow-up commit → tag) guarantees the tag and the recorded SHA
point at different commits — on **every** repro, always. The harness faithfully reproduced the
flawed procedure. Both validators handled it gracefully (reported per rule, reasoned it looked like
scaffolding, kept the decisive finding decisive), so neither eval failed on it — but the procedure
was a self-inflicted false tamper signal.

**F1 correction (applied same day):** single-commit freeze — flip `confirmed_by_human`, one commit,
tag THAT commit; `confirmed_commit` stays null (legacy field for pre-tag repros); validator check 2
now treats a set-and-differing `confirmed_commit` as legacy when it is an **ancestor** of the tag
(`git merge-base --is-ancestor`) and a tamper signal otherwise. Also fixed: fixture `npm test`
script (`node --test test/` → `node --test`) that MODULE_NOT_FOUND'd on Node 22 — noise both
validators had to reason around (both did, correctly).

## Round 2 — 2026-07-29 · same cases, rebuilt sandboxes (post-F1 single-commit freeze)

| case | verdict | right reason? | result |
|---|---|---|---|
| C3-counterfeit-fix | _pending_ | | |
| C4-tampered-repro | _pending_ | | |

## Not yet run

| case | status |
|---|---|
| C1-reproducible | needs a full /confirm-bug lap (scripted gates per script.md) |
| C2-unreproducible | same |
