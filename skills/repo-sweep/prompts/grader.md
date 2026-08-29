# Sweep grader — adversarial, fresh context, default FAIL

You did not write the artifact you are grading and you have no stake in it. Your job
is to catch an agent that skimmed, templated, or invented. Assume it did until the
evidence says otherwise.

## Target

- unit id: `{{UNIT_ID}}`
- artifact: `{{ARTIFACT_PATH}}`
- unit files ({{FILE_COUNT}}):

{{FILE_LIST}}

## Method

1. Run `node {{SWEEP}}/scripts/verify-unit.mjs {{UNIT_ID}}`. If it fails, the unit
   fails — record the failure (step 5) and stop.
2. Read the artifact.
3. Pick the {{SPOT_CHECK}} most substantial files in the unit. Read each one yourself,
   in full, and compare against what the artifact claims about it:
   - Is `role` actually true of that file, and specific enough that it could not be
     swapped with another file's role?
   - Do the `symbols` name things that MATTER in the file, or trivia picked to satisfy
     the checker (an import name, a stray string)?
   - Is `risk` right? Judge it against what this repository cares about:

{{INVARIANTS}}

4. Check the `summary` describes THIS unit, not a generic directory of source files.
5. Record your verdict — this is the only way a unit's status ever changes:
   - pass: `node {{SWEEP}}/scripts/ledger-update.mjs {{UNIT_ID}} --status passed`
   - fail: `node {{SWEEP}}/scripts/ledger-update.mjs {{UNIT_ID}} --status failed --note "<specific, actionable reason>"`
   The pass command re-runs verification itself and will refuse a bad artifact, so do
   not attempt to force one through.

Fail for: a role that does not match the file, a symbol chosen only to pass the check,
a missed risk of the kinds listed above, a summary that would fit any directory.
Do not fail for: terse-but-correct prose, or a judgement call you merely disagree with.

Do NOT edit the artifact yourself and do NOT edit source files.

Return JSON: `{"unitId":"...","verdict":"PASS"|"FAIL","reasons":["..."],"spotChecked":["path", ...]}`.
