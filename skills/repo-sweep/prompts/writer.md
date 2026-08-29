# Sweep writer — one unit, one fresh context

You are processing exactly ONE unit of a repository sweep. You were started with an
empty context and you will be discarded when this unit is done. Nothing you learn
here carries anywhere else, so there is no reason to economise: read everything.

## Your unit

- unit id: `{{UNIT_ID}}`
- root path: `{{UNIT_PATH}}`
- files ({{FILE_COUNT}}), all of which you MUST read in full:

{{FILE_LIST}}

## What to produce

Write `{{ARTIFACT_PATH}}` with exactly this shape:

```json
{
  "unitId": "{{UNIT_ID}}",
  "summary": "<>=120 chars: what this unit is, what it is for, how its files relate>",
  "files": [
    {
      "path": "<repo-relative path, one entry per unit file, no others>",
      "lines": <exact line count of the file>,
      "role": "<>=25 chars: what THIS file does, specific to it>",
      "symbols": ["<identifier that literally appears in this file>", "..."],
      "risk": "{{RISK_TYPES}}"
    }
  ],
  "citations": ["<path:line pointing at the most load-bearing lines in this unit>"],
  "flags": {
    "tenantScoped": "yes | no | n/a",
    "moneyPath": true|false,
    "dbWrites": true|false
  },
  "openQuestions": ["<anything you could not determine from the code alone>"]
}
```

Rules that a script checks after you, so do not guess:

1. Every file above appears exactly once in `files`. No extras.
2. `lines` must equal the real line count (`wc -l` counts newlines; a file without a
   trailing newline still has that last line — the checker counts it, so verify with
   `awk 'END{print NR}' <file>`).
3. Every string in `symbols` must occur verbatim in that file.
4. Every citation must be `path:line`, inside this unit, in range, on a non-blank line.
5. `role` must differ meaningfully between files. Templated roles are rejected.
6. `summary` >= 120 characters.
7. `risk` must be one of: {{RISK_TYPES}}.

## What this repository cares about

Note anything that bears on these while you read, and put it in `risk` and
`openQuestions`:

{{INVARIANTS}}

## How to work

1. Read every file completely. For a large file, read it in chunks — do not skim.
2. Flag the things above, plus the universals: arithmetic on money, an unguarded
   write path, a query with no access-control filter, a second copy of logic that
   already exists elsewhere in the unit.
3. Write the artifact.
4. Run `node {{SWEEP}}/scripts/verify-unit.mjs {{UNIT_ID}}` and fix every reported
   error. Repeat until it prints VERIFY PASS.
5. Do NOT edit any file other than your artifact. Do NOT run git commands that write.
   Do NOT mark your own unit as passed — a separate grader does that.

Return a JSON object: `{"unitId": "...", "verified": true|false, "filesRead": N, "notes": "..."}`.
