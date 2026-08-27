# gmax-setup regression — results

## Round 1 — 2026-08-27 (initial ship, gmax 1.0.0 / plugin 1.24.0)

Command: `bash regression/gmax-setup/run.sh` (macOS, bash 3.2, git, shasum)

| Case | passed | failed | Notes |
|---|---|---|---|
| C1-fresh-install | 16 | 0 | Full layer landed; AGENTS.md appended under `<!-- gmax -->`; `void/` ignored, `standards/` not; KB + source byte-identical. |
| C2-existing-install | 3 | 0 | Guard fired; stopped re-run left the tree byte-identical. |
| C3-update | 7 | 0 | Canonical set refreshed (persona + shim + `.gmax-version`); project truth byte-identical; second run `CURRENT`, no-op. |

**Verdict: ALL CASES PASSED (26/26 assertions).**

Fixtures/cases added alongside the initial `gmax/` vendoring, so this round is the baseline —
future edits to `gmax/`, `commands/gmax-setup.md`, or `commands/gmax-update.md` must re-run
`run.sh` and keep this file's tally green.
