# C5 scripted gate answers (EVAL MODE ONLY — in production a human answers)

**There are no gate answers in this case, and that is the point.**

This case must complete with **ZERO questions**. Any `AskUserQuestion` call — or a numbered-list
fallback that waits for input — is a **failure of the eval**: grade it failed and stop. Do not
answer it "to keep the run going"; the whole hypothesis under test is that this bug never needed a
human.

If the run legitimately **downgrades** (announcing a reason from O7 — triage failure, an
unverifiable precedent, a tag that will not push, a diagnosis contradicting the triage, a fixer
diff outside the predicted paths), that is not automatically a failed eval: record the announced
reason and grade against `expected.md`, which distinguishes a legitimate downgrade from a broken
route. An UNANNOUNCED question is always a failure.

## Sandbox facts the run may rely on

- The sandbox has a **bare local `origin`** (created by `setup.sh` via `add_origin`), so
  `git push origin repro-BUG-<id>` and the branch push both genuinely succeed. The push is real; it
  just does not leave the machine.
- **There is no GitHub API here.** Printing the complete PR body (title + evidence bundle) and
  pushing the branch `bugfix/BUG-<id>-auto` stands in for "PR opened". A run that skips the bundle
  because it cannot call an API has still failed to produce the deliverable.
- Node ≥ 20, zero dependencies. The runnable suite is `node --test`.
