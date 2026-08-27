# gmax-setup regression harness

Zero-dependency (bash + git + shasum) mechanical verification of the gmax install/update
contracts. Run after ANY edit to `gmax/` (the vendored module), `commands/gmax-setup.md`, or
`commands/gmax-update.md`.

## What is covered

| Case | Sandbox | What it proves |
|---|---|---|
| C1-fresh-install | tinyshop with pre-existing `AGENTS.md` + `docs/` KB | The deterministic install steps (setup skill Steps 1-3) land the full layer, APPEND to `AGENTS.md` under the `<!-- gmax -->` marker, gitignore `void/` (not `standards/`), and leave the existing KB + source byte-identical. |
| C2-existing-install | tinyshop with gmax already installed | The preflight guard FIRES on an existing install and a guard-respecting re-run changes nothing — no silent overwrite of project-filled files. |
| C3-update | installed 1.0.0 vs a bumped 9.9.9 "shipped" module | `/gmax-update` refreshes ONLY the canonical set (personas + shims + `.gmax-version`), leaves `workflow.config.md` / `standards/` / KB / `AGENTS.md` project part byte-identical, and is a no-op when versions match. |

Out of scope (agent work, verified in the pilot instead): the human-question steps of setup
(KB detection interview, standards drafting, workflow.config.md filling).

## Run

```bash
cd regression/gmax-setup
bash run.sh          # all three cases into /tmp, exit non-zero on any failure
```

Or one case at a time:

```bash
bash cases/C1-fresh-install/setup.sh /tmp/eval-gmax-c1
bash cases/C1-fresh-install/verify.sh /tmp/eval-gmax-c1
```

Each `verify.sh` prints `ok` / `NOT OK` per assertion and a `passed=N failed=M` tally;
`expected.md` in the case folder is the human-readable grader contract.
