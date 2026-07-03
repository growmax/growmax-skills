---
name: feature-review
description: >-
  End-of-development feature review as a multi-agent workflow. Run it when a feature branch is
  "done" and before the PR: it scopes the diff against the base branch, then fans out four
  specialist reviewers in parallel — tdd-reviewer (does every changed behavior have a real,
  passing test?), ux-flow-reviewer (contextual creation / no dead-end flows on new UI),
  scale-security-reviewer (what breaks at 10k rows? is every new surface authz'd, validated,
  tenant-scoped?), and arch-advisor (advisory structure/reuse ideas). Verifies blockers, then
  returns one scorecard with PASS/WARN/BLOCK per dimension and a fix route for every finding.
  Use when asked to "review my feature", "run the end-of-dev checks", "is this ready for PR?".
  Invoke with /feature-review [base-branch] [--only tdd|ux|scale|arch] [--strict].
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
`--only <dimension>` to run a single reviewer (`tdd` | `ux` | `scale` | `arch`), optional
`--strict` (promotes UX WARNs to BLOCKs — for teams that gate merges on flow continuity).

**Repo overlay:** if `.claude/REVIEW-NOTES.md` exists, read it FIRST and pass the relevant
sections to each subagent. It carries the facts reviewers can't reliably infer: test commands
per surface, the repo's *blocking* house rules, pagination/index conventions, UX conventions,
known accepted debt (so reviewers don't re-flag it), and the fix-route table. Without it,
reviewers fall back to repo discovery (slower, noisier). A template lives at
`examples/REVIEW-NOTES.template.md` in the growmax-skills repo.

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
   changed; `ux-flow` runs only when `web`/`mobile` files changed; `arch-advisor` always runs
   unless `--only` excludes it. Honor `--only`.

### Phase 1 — Fan out (parallel, single message)

Dispatch every applicable reviewer **in one message** so they run concurrently. Each gets the
same briefing:

- the base branch + the exact diff command to reproduce the change surface,
- the classified file list (only the surfaces it owns, plus shared files),
- the relevant overlay sections verbatim,
- the reminder: findings need `file:line` + concrete failure scenario + severity
  (`BLOCKER` | `WARN` | `OK`), and known debt is skipped.

| Reviewer | Owns | Runs when |
|---|---|---|
| `tdd-reviewer` | test existence, quality, and a real run of the narrowest relevant suite | any code change |
| `ux-flow-reviewer` | contextual creation (create-in-place), dead-end flows, empty/loading/error states, neighbour consistency | web/mobile changes |
| `scale-security-reviewer` | the 10k-row test (pagination, N+1, indexes, render perf) + authz, validation, tenant scoping, injection, secrets | any code change |
| `arch-advisor` | structure/reuse/simpler-alternative ideas (advisory) | always |

### Phase 2 — Verify blockers (you)

For each `BLOCKER` returned: open the cited file at the cited line and confirm the failure
scenario holds. Dedupe findings that multiple reviewers hit (keep the most severe, merge the
citations). Demote or drop what doesn't survive. If `tdd-reviewer` reports the suite it ran
FAILED, that is always a blocker — no demotion.

### Phase 3 — Scorecard (you)

Report in this exact shape:

```
## /feature-review — <branch> vs <base>   (<N> files, surfaces: api, web)

| Dimension | Verdict | Blockers | Warns |
|---|---|---|---|
| TDD & tests        | PASS/BLOCK | n | n |
| UX flow continuity | PASS/WARN(/BLOCK if --strict) | n | n |
| Scale & security   | PASS/BLOCK | n | n |
| Architecture       | ADVISORY | — | n ideas |

### Blockers (fix before PR)
1. <finding> — file:line — <concrete failure> — **fix route:** <skill/agent from overlay>
### Warns (product/tech-lead call)
...
### Advisory ideas (take or leave, ranked by leverage)
...
### Verdict: READY / NOT READY (+ the one-line reason)
```

Every blocker and warn carries a **fix route** — the repo skill or agent that should make the
fix (from the overlay's fix-route table; e.g. an isolation leak routes to the repo's tenant
isolation skill + api skill, a missing test routes to the test skill). You route; you don't fix.

### Phase 4 — Optional follow-through (ask, don't assume)

If the user says "fix them": dispatch fixes through the routed skills one dimension at a time,
then **re-run the affected reviewer** to confirm the blocker is gone. Never mark a blocker
fixed without a re-review.

## Making it a team habit (not enforced by this command)

Two escalation levels, documented here so teams can opt in deliberately:

1. **Convention:** "run `/feature-review` before every PR" in the repo's CLAUDE.md — cheapest,
   relies on habit.
2. **Hook enforcement:** a repo-local `Stop` or pre-PR hook that reminds (or refuses) when a
   feature branch has significant unreviewed changes. Keep hooks repo-local
   (`.claude/settings.json` in the product repo), NOT in this plugin — plugin hooks fire in
   every repo for every teammate.
