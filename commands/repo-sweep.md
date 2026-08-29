---
name: repo-sweep
description: >-
  Provably read EVERY file in a repository by turning it into hundreds of small units and
  giving each one a fresh, empty-context agent — then proving the work with scripts, not
  with the agent's word for it. A script builds the work list from `git ls-files` (the model
  never decides what the work is), a script accepts or rejects each unit's artifact on
  claims you cannot make without opening the file (exact line counts, symbols that must
  literally occur, citations that must land on a non-blank line), and a script keeps the
  score by re-running the checker itself before it will write "done". Resumable across
  crashes, parks hard units as needs-human instead of livelocking, and reports coverage as
  a number counted off disk. Use for whole-repo documentation backfills, audits, inventories,
  security sweeps, or any "read all of it and prove you did" pass. Invoke with
  /repo-sweep [init | run [N] | report | selftest].
---

# /repo-sweep — a factory line for a codebase

Instead of one agent that reads 4,778 files and degrades as its context fills, this runs
hundreds of small jobs. Each job is a handful of related files, each job gets a brand-new
agent with an empty head that reads only those files and writes down what it found, and
each agent is then discarded. Job #300 gets the same sharp context as job #1.

Three scripts hold it together and **none of them is a model**:

| Script | Job |
|---|---|
| `build-ledger.mjs` | Makes the to-do list from the actual files. Asserts the partition is total and disjoint — every sweepable file lands in exactly one unit, or it exits non-zero. |
| `verify-unit.mjs` | Checks the homework: exact line counts, symbols that literally occur, citations resolving to non-blank lines in-unit, no templated prose. |
| `ledger-update.mjs` | Keeps the score, and **re-runs the checker itself** before writing "passed". An agent claiming done does not make it done. |
| `selftest.mjs` | Tests the checker, by feeding it ten artifacts — one truthful, nine lying — and asserting each lie is caught by name. |

## Steps

### 1. Resolve SWEEP

- `SWEEP="${CLAUDE_PLUGIN_ROOT}/skills/repo-sweep"`. Verify: `ls "$SWEEP/scripts/lib.mjs"`.
- `${CLAUDE_PLUGIN_ROOT}` unset or missing → search the plugin cache:
  `find ~/.claude/plugins -maxdepth 6 -type d -name repo-sweep -path '*growmax*' | head -1`.
- Still not found → STOP: tell the human to run `/plugin install growmax-skills@growmax`.
- Confirm the cwd is inside the target repo's git tree (`git rev-parse --show-toplevel`).
  Not a git repo → STOP: the ledger is built from `git ls-files`.
- Node 18+ is required. `node --version` fails → STOP.

### 2. `init` — build the ledger (also the default first step of `run`)

```bash
node "$SWEEP/scripts/selftest.mjs"          # only after a ledger exists; see below
node "$SWEEP/scripts/build-ledger.mjs"
node "$SWEEP/scripts/report.mjs"
```

Order note: `selftest.mjs` needs a ledger to pick a sample unit from, so on a first run
build the ledger first, then self-test, then report.

Before building, check whether the repo has a `sweep.config.json`. If it does not, read
`"$SWEEP/references/config.md"` and **offer** one — draft it from what you can see of the
repo (its own invariants, its generated/vendored directories, the order in which its
directories should be swept) and show it to the human for approval. Never write it silently:
the config decides which files get swept, and a wrong exclude rule quietly shrinks the
denominator that the whole coverage number rests on. The built-in defaults are generic and
work unconfigured — a config makes the ordering and the risk-flagging repo-aware.

Report what the ledger says: units, sweepable files, excluded files by reason. The human
should sanity-check that `tracked = sweepable + excluded` and that nothing important is in
the excluded list.

### 3. `run [N]` — sweep N units (default: all open ones)

Get the open units, highest priority first:

```bash
node "$SWEEP/scripts/report.mjs" --json --next 12
```

Feed the `next` array to the workflow. **Batch it** — 8–12 units per Workflow call — and
loop until `report.mjs` shows no open units. A batch is one Workflow invocation:

```
Workflow({
  scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/repo-sweep.workflow.js",
  args: { sweepRoot: "<the resolved $SWEEP>", units: [ ...the next array... ], spotCheck: 3 }
})
```

The workflow gives each unit a fresh writer and then an independent fresh grader. Between
batches, re-run `report.mjs --json --next 12` — never reuse a stale list, because a unit's
status may have changed and re-sweeping a passed unit wastes a whole agent.

Running this needs the human to have opted into multi-agent orchestration (they invoked
this command, which counts). Tell them the shape of the cost before the first batch: for a
~5k-file repo the whole sweep is on the order of hours and tens of millions of tokens.

### 4. `report` — the number

```bash
node "$SWEEP/scripts/report.mjs" --next 10
```

Coverage is counted from state files on disk against the ledger's file list. It is a
measurement, not a summary of what any agent said it did. Relay it verbatim — do not
round it up, and do not describe a partial sweep as complete.

### 5. `selftest` — is the checker awake?

```bash
node "$SWEEP/scripts/selftest.mjs"
```

Ten cases: one truthful artifact that must be accepted, nine fabrications that must each
be rejected by the right check. If any lie gets through, **say so plainly and stop** — the
coverage number is worthless until it is fixed. Run it whenever the harness changes, and
in CI alongside the sweep.

## Rules

- **Never mark a unit passed yourself.** `ledger-update.mjs` is the only writer of status,
  and it re-verifies before it will record a pass. Do not edit `state/*.json` by hand.
- **Never weaken a check to get a unit green.** A failing verify is information about the
  artifact, not an obstacle. If a check is genuinely wrong, fix it in the harness, re-run
  the self-test, and say that you did.
- **Never edit source files during a sweep.** Writers and graders are readers. If a sweep
  finds a real bug, record it in the artifact's `openQuestions` and report it to the human.
- A unit that fails three times is parked as `needs_human` and the line keeps moving.
  Surface the parked list in every report; do not retry a parked unit without the human.
- The sweep does not commit. Artifacts land in the repo's sweep output dir; committing them
  is the human's call.

## Re-running

Re-run `build-ledger.mjs` any time. It preserves per-unit state, and flips a passed unit
whose content hash moved back to `stale` — which is what turns a one-off backfill into a
standing guarantee. Units whose id changed because of repacking have their orphaned state
pruned, so coverage never counts work for a unit that no longer exists.
