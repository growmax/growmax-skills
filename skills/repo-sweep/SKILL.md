---
name: repo-sweep
description: >-
  Provably read EVERY file in a repository without a long-running agent degrading — split
  the repo into hundreds of small units, give each one a fresh empty-context agent, and let
  SCRIPTS (never a model) decide what the work is, whether each unit's output is real, and
  what the coverage number is. Use when asked to "document the whole repo", "audit every
  file", "inventory the codebase", "read all of it and prove you did", when a whole-repo
  pass keeps stalling or hallucinating completion, or when someone needs a coverage number
  they can defend. Also use when asked how the sweep/factory-line harness works, how to
  configure it for a repo, or why an agent saying "done" is not evidence.
---

# repo-sweep — a factory line for a codebase

## The problem this solves

One agent reading a whole repository degrades as its context fills. The failure mode that
matters is not that it gets sloppy — it is that **it reports success anyway**. Nothing in a
model's output distinguishes "I read all 4,778 files" from "I read 300 and inferred the
rest". You cannot review your way out of this: checking the claim costs as much as doing
the work.

So take the two decisions a degrading agent is worst at away from the model entirely:

1. **What is the work?** A script enumerates it from `git ls-files`.
2. **Is the work done?** A script decides, on evidence the agent cannot fabricate.

Agents only produce artifacts. The filesystem is the source of truth about progress.

## How it works

```
build-ledger.mjs   repo ──▶ N units, each small enough for one empty context
     │                       (partition asserted total + disjoint, or exit 1)
     ▼
  per unit:  fresh WRITER agent ──▶ artifact ──▶ verify-unit.mjs
                                                     │
             fresh GRADER agent (never met the writer, re-reads the code)
                                                     │
                                            ledger-update.mjs ──▶ state/<unit>.json
     ▼
report.mjs         counts coverage off disk:  "3/324 units, 9/4778 files (0.2%)"
```

### Why the verification cannot be talked past

`verify-unit.mjs` only asks questions whose answers require having opened the file:

| Check | What it proves |
|---|---|
| ROSTER | the artifact covers exactly this unit's files — none missing, none invented |
| LINES | every claimed line count matches the file on disk, exactly |
| SYMBOLS | every named identifier literally occurs in the file it is claimed for |
| CITATIONS | every `path:line` resolves in-unit, in range, on a non-blank line |
| RISK | the risk value is from the repo's declared vocabulary |
| SUBSTANCE | no placeholder prose; no two files sharing a byte-identical role |

`ledger-update.mjs` is the **only** writer of status, and it re-runs `verify-unit.mjs`
itself before it will record a pass. An agent that asks to be marked done with a bad
artifact gets a *failure* recorded instead, with reasons. Three strikes parks the unit as
`needs_human`, so the line can neither livelock on one hard unit nor fake its way past it.

`selftest.mjs` audits the auditor: it builds a truthful artifact mechanically from disk,
confirms it is accepted, then applies one targeted lie at a time — a skipped file, an
invented file, a wrong line count, a fabricated symbol, an out-of-range citation, a
citation outside the unit, a risk value outside the declared vocabulary, a templated role,
a placeholder summary — and asserts each is caught by the right check. If any lie slips through, the coverage number is worthless and
it exits non-zero. It has already found one real hole (byte-identical roles used to pass on
units with fewer than four files).

## Using it

Run `/repo-sweep` — that command is the operator's manual (init · run · report · selftest).
Everything is resumable: state is per-unit and written atomically, so parallel lanes do not
collide and a crash loses only in-flight units. Re-running `build-ledger.mjs` after the code
moves flips a passed unit whose content hash changed back to `stale`, which is what turns a
one-off backfill into a standing guarantee.

## Configuring it for a repo

Works unconfigured on any git repo. `sweep.config.json` makes it repo-aware — what to skip,
what to sweep first, and (highest leverage) the **invariants** injected into both the writer
and grader prompts, which is how a grader knows an unscoped query is a missed risk rather
than a style opinion. See `references/config.md`.

## What it costs, and when not to use it

A ~5k-file repo is on the order of hours and tens of millions of tokens — measured, not
estimated. That is the price of a defensible number. Do not reach for it when a targeted
search answers the question, when only one subsystem matters (sweep a subdirectory by
pointing the config's excludes at everything else), or when nobody will read the output.

## Files

| Path | |
|---|---|
| `scripts/build-ledger.mjs` | repo → units; asserts the partition; preserves state across re-runs |
| `scripts/verify-unit.mjs` | the deterministic acceptance check (exit 0/1, `--json`) |
| `scripts/ledger-update.mjs` | the only status writer; re-verifies before recording a pass |
| `scripts/report.mjs` | coverage counted off disk (`--json`, `--next N`) |
| `scripts/unit.mjs` | one unit's definition + state |
| `scripts/prompt.mjs` | renders the writer/grader prompt with every placeholder substituted |
| `scripts/selftest.mjs` | ten cases: one truthful artifact accepted, nine lies caught |
| `scripts/lib.mjs` | shared helpers; loads `sweep.config.json` |
| `prompts/writer.md`, `prompts/grader.md` | the two agent briefs (templates for `prompt.mjs`) |
| `references/config.md` | every config key, and how to write good invariants |
