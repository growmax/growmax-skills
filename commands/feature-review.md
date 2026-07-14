---
name: feature-review
description: >-
  End-of-development feature review as a multi-agent workflow. Run it when a feature branch is
  "done" and before the PR: it scopes the diff against the base branch, then fans out four
  specialist reviewers in parallel — tdd-reviewer (does every changed behavior have a real,
  passing test?), ux-flow-reviewer (contextual creation / no dead-end flows on new UI),
  ui-standards-reviewer (is the new UI built from the right shared components and design tokens,
  per the repo's .claude/UI-STANDARDS.md?), scale-security-reviewer (what breaks at 10k rows? is
  every new surface authz'd, validated, tenant-scoped?), and arch-advisor (advisory structure/
  reuse ideas). Verifies blockers, then returns one scorecard with PASS/WARN/BLOCK per dimension
  and a fix route for every finding. Use when asked to "review my feature", "run the end-of-dev
  checks", "is this ready for PR?". Invoke with
  /feature-review [base-branch] [--only tdd|ux|uxs|scale|arch] [--strict].
---

# /feature-review — end-of-development multi-agent review

> **One feature branch per invocation, review-only.** This workflow never edits source — it
> produces a verified scorecard and routes each fix to the right skill/agent. Run it as the
> last step of development, before opening (or updating) the PR.

You are the **orchestrator** in the main session. You do NOT review code yourself — you scope
the diff, **dispatch the four reviewer subagents in parallel** via the Task tool, adversarially
verify their blockers, and assemble the final scorecard. Subagents cannot spawn subagents, so
every delegation happens here.

**Inputs:** `$ARGUMENTS` = optional base branch (default: the repo's default branch —
`origin/main` / `origin/master` / whatever `origin/HEAD` points at), optional
`--only <dimension>` to run a single reviewer (`tdd` | `ux` | `uxs` | `scale` | `arch`), optional
`--strict` (promotes UX-flow WARNs and UI-standard SHOULD violations to BLOCKs — for teams that
gate merges on flow continuity and standards compliance).

**Repo overlay:** if `.claude/REVIEW-NOTES.md` exists, read it FIRST and pass the relevant
sections to each subagent. It carries the facts reviewers can't reliably infer: test commands
per surface, the repo's *blocking* house rules, pagination/index conventions, UX conventions,
known accepted debt (so reviewers don't re-flag it), and the fix-route table. Without it,
reviewers fall back to repo discovery (slower, noisier). A template lives at
`examples/REVIEW-NOTES.template.md` in the growmax-skills repo.

**UI standard:** the `ui-standards-reviewer` reads a *separate* per-repo doc,
`.claude/UI-STANDARDS.md` (the component/token rulebook; template + instance in `examples/`). If
that file is absent, that one reviewer returns `NO_STANDARD` and is reported as `SKIPPED (no
standard)` — offer to bootstrap one via `/ux-audit` — while the other reviewers run normally.
Anything already tracked in `docs/ux-drift-backlog.md` is known drift and is not re-flagged.

## Hard rules

- **Review-only.** No reviewer edits source, no reviewer runs a DB write. Running the repo's
  test suites is allowed (tests must be self-cleaning per repo convention); anything that
  mutates shared state beyond that is out of bounds.
- **Findings must be verifiable.** Every finding cites `file:line` and states the concrete
  failure scenario ("with 10k customers this query returns all rows unpaginated", not
  "consider pagination"). A finding without a citation is dropped.
- **Blockers get verified before they're reported.** You (the orchestrator) read the cited
  code for every BLOCKER and confirm it yourself. A blocker you can't reproduce from the
  citation is demoted to WARN with a note, or dropped.
- **Every surviving finding gets a confidence level** (`HIGH`/`MEDIUM`/`LOW`, Phase 2) so the
  human reading the scorecard knows what's a verified fact vs. a judgment call. A `LOW`
  confidence blocker is never allowed to stay a blocker (Phase 2 demotion rule).
- **Every run gets logged**, pass or fail (Phase 5) — the ledger is what turns "we ran a review"
  into "we know whether the review is any good."
- **Known debt is not a finding.** Anything listed under "Known accepted debt" in the overlay
  is skipped, not re-litigated.
- **Advisory stays advisory.** `arch-advisor` output never blocks and is reported in its own
  section — ideas, not defects.
- **Empty diff → stop.** If the diff against base is empty, say so and stop; don't review the
  whole repo.

## Workflow

### Phase 0 — Scope (you)

1. Resolve the base branch; `git fetch origin <base>` if stale, then take the diff:
   `git diff --stat origin/<base>...HEAD` plus the working tree (`git status`) — uncommitted
   work counts. Combine into one change surface.
2. Classify every changed file by **surface**: `api` (backend), `web` (admin/portal frontend),
   `mobile` (RN/Expo apps), `schema` (ORM schema/migrations), `mcp` (MCP tools), `test`,
   `docs/other`. The overlay's surface table takes precedence over guessing.
3. Read `.claude/REVIEW-NOTES.md` if present; extract per-dimension facts to forward.
4. Decide which reviewers apply: `tdd` and `scale-security` always run when any non-docs code
   changed; `ux-flow` and `ui-standards` run only when `web`/`mobile` files changed (and
   `ui-standards` only when `.claude/UI-STANDARDS.md` exists — else mark it `SKIPPED (no
   standard)`); `arch-advisor` always runs unless `--only` excludes it. Honor `--only` (`uxs` =
   ui-standards).

### Phase 1 — Fan out (parallel, single message)

Dispatch every applicable reviewer **in one message** so they run concurrently. Each gets the
same briefing:

- the base branch + the exact diff command to reproduce the change surface,
- the classified file list (only the surfaces it owns, plus shared files),
- the relevant overlay sections verbatim,
- the reminder: findings need `file:line` + concrete failure scenario + severity
  (`BLOCKER` | `WARN` | `OK`) + a `basis` (`verified` | `read` | `inferred` | `judgment` — see
  each agent's confidence section), and known debt is skipped.

| Reviewer | Owns | Runs when |
|---|---|---|
| `tdd-reviewer` | test existence, quality, and a real run of the narrowest relevant suite | any code change |
| `ux-flow-reviewer` | contextual creation (create-in-place), dead-end flows, empty/loading/error states | web/mobile changes |
| `ui-standards-reviewer` | composition contract (compose-never-fork), button/filter/chip/icon/loading/form rules, motion budget, a11y baseline — per `.claude/UI-STANDARDS.md`, citing rule IDs | web/mobile changes AND a standard exists |
| `scale-security-reviewer` | the 10k-row test (pagination, N+1, indexes, render perf) + authz, validation, tenant scoping, injection, secrets | any code change |
| `arch-advisor` | structure/reuse/simpler-alternative ideas (advisory) | always |

> **UX-flow vs UI-standards split (avoid double-flagging):** `ux-flow-reviewer` owns whether the
> user can *finish the job* on the screen (flow continuity); `ui-standards-reviewer` owns whether
> it's *built from the right parts* (shared components, tokens, rule IDs). Component/token drift
> and "match the neighbour" belong to `ui-standards-reviewer` when a standard exists — if two
> reviewers hit the same line, dedupe in Phase 2 keeping the standards finding (it cites a rule).

### Phase 2 — Verify & score confidence (you)

For every `BLOCKER` and `WARN` returned (advisory ideas are exempt — they never get a
confidence score, see Phase 3): open the cited file at the cited line yourself and confirm the
failure scenario holds. Dedupe findings that multiple reviewers hit (keep the most severe,
merge the citations, and note the corroboration — it raises confidence). Demote or drop what
doesn't survive. If `tdd-reviewer` reports the suite it ran FAILED, that is always a blocker —
no demotion.

**Assign a confidence level** to every surviving finding, from its reported `basis` plus what
you were able to confirm:

| Confidence | When it applies |
|---|---|
| **HIGH** | `basis: verified` (a suite genuinely failed, or you re-grepped/re-read the exact lines and the defect is unambiguous), OR two+ reviewers independently corroborate the same code path. |
| **MEDIUM** | `basis: read` and you confirmed the citation but the failure magnitude/scope required some estimation (e.g. "at 10k rows" is a stated design point, not a measured run) — or `basis: inferred` backed by an explicit overlay rule (so it's a known anti-pattern, not a guess). |
| **LOW** | `basis: inferred` with no overlay backing, `basis: judgment` (most UX product calls), or you could not independently confirm the citation and are relying on the reviewer's read alone. |

**A BLOCKER that lands at LOW confidence is automatically demoted to WARN**, tagged
`(demoted: unverified)` — a blocker the orchestrator can't stand behind should not gate a PR.
This is the mechanism that keeps false positives from compounding: an unverifiable claim never
outranks a verified one, no matter how it's phrased.

### Phase 3 — Scorecard + confidence report (you)

Report in this exact shape:

```
## /feature-review — <branch> vs <base>   (<N> files, surfaces: api, web)

| Dimension | Verdict | Blockers | Warns |
|---|---|---|---|
| TDD & tests        | PASS/BLOCK | n | n |
| UX flow continuity | PASS/WARN(/BLOCK if --strict) | n | n |
| UI standards       | PASS/WARN/BLOCK(/SKIPPED no standard) | n | n |
| Scale & security   | PASS/BLOCK | n | n |
| Architecture       | ADVISORY | — | n ideas |

### Blockers (fix before PR)
1. [HIGH] <finding> — file:line — <concrete failure> — **fix route:** <skill/agent from overlay>
### Warns (product/tech-lead call)
1. [MEDIUM] <finding> — file:line — <concrete failure> — **fix route:** <skill/agent>
### Advisory ideas (take or leave, ranked by leverage)
...

### Confidence report
| # | Finding | Verdict | Confidence | Basis | How it was checked |
|---|---|---|---|---|---|
| 1 | <short name> | BLOCKER | HIGH | verified | <what you personally confirmed, one clause> |
| 2 | <short name> | WARN | LOW | judgment | <why this is a call, not a fact> |

Summary: <a> HIGH · <b> MEDIUM · <c> LOW  →  every BLOCKER above is HIGH/MEDIUM (LOW blockers
are demoted per the rule above, never shown as blocking).

### Verdict: READY / NOT READY (+ the one-line reason)
```

Every blocker and warn carries a **fix route** — the repo skill or agent that should make the
fix (from the overlay's fix-route table; e.g. an isolation leak routes to the repo's tenant
isolation skill + api skill, a missing test routes to the test skill). You route; you don't fix.

The confidence report is not decoration — it's what lets a human skim past the HIGH items
(verified, act on them) and spend their limited attention on the LOW ones (judgment calls that
need a person, not more automation).

### Phase 4 — Optional follow-through (ask, don't assume)

If the user says "fix them": dispatch fixes through the routed skills one dimension at a time,
then **re-run the affected reviewer** to confirm the blocker is gone. Never mark a blocker
fixed without a re-review.

### Phase 5 — Capture feedback + log the run (you, always — this is how it improves)

**Capture overrides, on the spot.** If the user says a finding is wrong, already known, or not
worth fixing, don't just drop it — ask once: "add this to Known accepted debt in
`.claude/REVIEW-NOTES.md` so future runs don't re-flag it?" If yes, append it there yourself
(one line, matching the existing format) in the same turn. This is the single highest-leverage
improvement available: the overlay gets sharper from real usage instead of upfront guessing,
and it costs one question.

**Append one row to the run ledger.** Create `.claude/feature-review-ledger.md` on first use
(template: `examples/REVIEW-LEDGER.template.md`) and append a row for this run: date, branch,
base, verdict per dimension, blocker/warn counts, the confidence tally (HIGH/MEDIUM/LOW
counts), and an `outcome` column left blank for now (filled in later — see the ledger template
for what goes there and why). Do this even on a clean PASS — a ledger with only failures can't
show a false-positive rate.

## Making it a team habit (not enforced by this command)

Two escalation levels, documented here so teams can opt in deliberately:

1. **Convention:** "run `/feature-review` before every PR" in the repo's CLAUDE.md — cheapest,
   relies on habit.
2. **Hook enforcement:** a repo-local `Stop` or pre-PR hook that reminds (or refuses) when a
   feature branch has significant unreviewed changes. Keep hooks repo-local
   (`.claude/settings.json` in the product repo), NOT in this plugin — plugin hooks fire in
   every repo for every teammate.

## How this gets better over time (calibration, not just usage)

Running the workflow logs a ledger row; it does not, by itself, make the reviewers better.
Getting better requires someone occasionally closing the loop. Do this periodically (every 2-4
weeks, or every ~15-20 ledger rows, whichever comes first — a person's call, not automated):

1. **Read the ledger** (`.claude/feature-review-ledger.md`). Fill in any blank `outcome` rows
   from memory/PR history: did a reported blocker turn out to be real (fixed, confirmed
   correct) or wrong (overridden, later shown harmless)? Did anything ship that a later
   incident traced back to a WARN this workflow correctly raised but the team waved through?
2. **Tally false positives by category, not in aggregate.** "3 of 4 overridden findings were
   `scale-security-reviewer` pagination WARNs on admin-only internal tools" is actionable;
   "we override things sometimes" is not.
3. **Act on the pattern, not the instance:**
   - Recurring override of the same *kind* of finding → add it to Known accepted debt (if it's
     genuinely accepted) or tighten that reviewer's checklist (if it's genuinely a false
     positive the prompt should stop raising).
   - A reviewer consistently returning `NOT RUN` or `inferred`-only findings in one area →
     the overlay is missing a fact (a test command, a convention) — fix the overlay, not the
     reviewer.
   - A reviewer's `HIGH`-confidence findings keep turning out wrong → that reviewer's
     "verified" bar is too loose; tighten its confidence rules in `agents/<name>.md`.
   - A finding type never appears but you know the codebase has that problem → the reviewer's
     checklist has a blind spot; add a check.
4. **Version the change.** Bump the plugin version and note in the commit what calibration
   drove it ("scale-security-reviewer: tightened pagination WARN to skip internal admin-only
   list screens — 3 false positives in the ARC ledger"). Teammates see *why* behavior changed,
   not just that it did.
5. **Keep the fix-route table current.** As new repo skills/agents appear, or old ones get
   renamed, the overlay's fix-route table drifts — stale routes are a quiet tax on every run.

This is intentionally a light, human-in-the-loop process, not a scored dashboard — the ledger
is a paper trail sized to what a small team will actually read, not infrastructure to maintain.
