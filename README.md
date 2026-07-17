# growmax-skills

Shared [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) skills **and
workflows** for the Growmax team, distributed as a **Claude Code plugin marketplace**. A skill is
just a folder with a `SKILL.md` (plus optional `scripts/` and `references/`); a workflow is a slash
command plus its subagents (and optional hooks). The plugin auto-discovers `skills/`, `commands/`,
`agents/`, and `hooks/`, so teammates install with one command and get updates automatically.

## Install (recommended — plugin marketplace)

In Claude Code, run:

```text
/plugin marketplace add growmax/growmax-skills
/plugin install growmax-skills@growmax
```

That's it. The skills are now available. To use one explicitly, invoke it namespaced by the
plugin, e.g. `/growmax-skills:github-repo-analyzer` — or just describe what you want (e.g.
"is this repo safe to use? <url>") and Claude triggers the right skill automatically.

> The marketplace is named `growmax` and the plugin is `growmax-skills`, so the install
> target is `growmax-skills@growmax`.

### Update (get the latest skills)

```text
/plugin marketplace update growmax
```

Versions are tracked by git commit, so **every push to `main` is a new version** — no manual
version bumping. Teammates just run the update command (or restart) to pick up new skills.

## Zero-setup adoption for a project (best for teams)

Make the skills available automatically to anyone who opens one of your project repos — no
install step at all. Add this to that repo's `.claude/settings.json` and commit it:

```json
{
  "extraKnownMarketplaces": {
    "growmax": {
      "source": { "source": "github", "repo": "growmax/growmax-skills" }
    }
  },
  "enabledPlugins": {
    "growmax-skills@growmax": true
  }
}
```

When a teammate opens the project and trusts it, the `growmax` marketplace registers and the
`growmax-skills` plugin enables itself. A new hire clones the product repo, opens Claude Code,
and the skills are just there.

## Alternative install (no plugins — personal skills dir)

Prefer the plain symlink approach? Clone and run the installer; skills land in
`~/.claude/skills` and are available in every project:

```bash
git clone https://github.com/growmax/growmax-skills.git
cd growmax-skills
./install.sh            # symlinks every skill into ~/.claude/skills
git pull                # later: symlinked skills update instantly
```

> On Windows without Developer Mode, symlinks need admin rights — use `./install.sh --copy`
> instead (or run under WSL). With `--copy`, update via `git pull && ./install.sh --copy`.

## Catalog

### Skills

| Skill | Invoke as | What it does |
|---|---|---|
| `github-repo-analyzer` | `/growmax-skills:github-repo-analyzer` | Analyze any GitHub repo — what it is, problem, why used, benefits — plus a two-part "safe to use?" verdict: license (open source? can Growmax use it?) and security (a Trivy scan for CVEs, secrets, misconfigs). |
| `terse-mode` | `/growmax-skills:terse-mode [lite\|full\|off]` | Switch the session to a terse, low-token reply style — same technical content, far fewer words; code/commands stay byte-exact. In-house alternative to caveman-style output compressors, with near-zero per-turn overhead. **On by default** in every session via a SessionStart hook (level `lite`); opt out with `GROWMAX_TERSE=0`, go harder with `GROWMAX_TERSE=full`, or say "normal mode" mid-session. |
| `ui-reuse-check` | `/growmax-skills:ui-reuse-check <what you're building>` | **Pre-build shared-component resolver.** Turns a UI request into a reuse decision *before any code is written*: parses the request into screen regions, looks each up in the repo's `.claude/UI-STANDARDS.md` (Part B Table 1 region → component), and returns REUSE / EXTEND / NEW verdicts with the Part A rules and tokens in play (CMP-5 protocol for anything uncatalogued). Read-only — points, never writes. The missing *first* step of the UI-standards pipeline: `/ui-reuse-check` (before) → `/feature-review` (review gate) → `/ux-audit` + `/ux-migrate` (sweep old drift). Ships the `ui-reuse-check-resolver` agent (same contract, own context) and a UserPromptSubmit reminder hook that fires on UI-creation intent — **gated to repos that ship `.claude/UI-STANDARDS.md`**, silent everywhere else. Team guide: `skills/ui-reuse-check/TEAM-GUIDE.md`. |

### Workflows (command + subagents)

| Workflow | Invoke as | What it does |
|---|---|---|
| `feature-review` | `/growmax-skills:feature-review [base] [--only tdd\|ux\|uxs\|scale\|arch] [--strict]` | **End-of-development review** — run it when a feature branch is "done", before the PR. Scopes the diff vs the base branch, then fans out **five specialist reviewers in parallel**: `tdd-reviewer` (every changed behavior has a real, passing, behavior-asserting test — runs the narrowest relevant suite), `ux-flow-reviewer` (**contextual creation** — every entity picker offers create-in-place instead of a context-losing detour; actionable empty states; loading/error/empty triad; flow-shape consistency), `ui-standards-reviewer` (is the new UI built from the **right shared components + design tokens** per the repo's `.claude/UI-STANDARDS.md`? compose-never-fork, button/filter/chip/icon/loading/form rules, motion budget, a11y baseline — cites rule IDs; `SKIPPED` if the repo has no standard), `scale-security-reviewer` (the **10k-row test**: unbounded queries, N+1, missing indexes, payload bloat, render perf — plus authz on every new surface, tenant scoping, input validation, injection, mass assignment, secrets), `arch-advisor` (max 3 ranked structure/reuse ideas, advisory-only, never blocks). The orchestrator **re-verifies every blocker** against the cited code before reporting, dedupes, and returns one scorecard plus a **confidence report** (every finding tagged HIGH/MEDIUM/LOW by how it was actually established — a LOW-confidence claim can never sit as a BLOCKER) and a **fix route per finding**. Review-only — never edits source; on "fix them" it routes fixes through the repo's skills and re-runs the affected reviewer. Every run appends to a `.claude/feature-review-ledger.md` paper trail and, on override, offers to grow the overlay's known-debt list on the spot — the periodic-calibration process (tally false positives by category, tighten the reviewer or the overlay, not both blindly) is how it gets sharper over time. Reads a per-repo `.claude/REVIEW-NOTES.md` overlay (template in `examples/REVIEW-NOTES.template.md`) for test commands, blocking house rules, known accepted debt, and fix routes. → **[Usage guide](docs/feature-review.md)** |
| `app-cartograph` | `/growmax-skills:app-cartograph <url> [roles] [driver]` | Maps a **live web app into durable context** — *before* any testing. Seeds a complete frontier from the **code** (the completeness denominator), then walks the running app with a human-in-the-loop: per route it captures role-visibility, a **distilled + secret-redacted** network trace, R/W, the flows it exposes, and a **proposed business purpose**. **Hybrid annotation** — interrupts only on *ambiguous* purpose, bulk-reviews the rest. **Write-safe** (walks up to any submit and stops; gated on live/UAT). State lives in `docs/nav-manifest.json` (resumable). Outputs `docs/app-map.md` (sitemap + role matrix + auth model + APIs) + `docs/business-flows.md`, then feeds `/graphify`. Optional `scope` brief focuses the walk (and collapses ambiguity); omit it to census the whole app. Resumable + context-safe — small per-batch worker dispatches, checkpoint-after-every-batch, fresh-session resume from the manifest. Driver: playwright-mcp (local) or claude-in-chrome (SSO/UAT). Subagents: `flow-census` (seed) + `nav-cartographer` (walk) + `nav-synthesizer` (docs). **Run before `/e2e-map`.** → **[Usage guide](docs/app-cartograph.md)** |
| `e2e-flow` | `/growmax-skills:e2e-flow <target> <flow>` | Gated, multi-agent E2E test generation for **web** (Playwright + playwright-mcp) and **api** (the repo's Jest/supertest or Vitest runner) surfaces. Discovers a flow → **you approve the business intent** → plans against the *real* repo → writes one spec → self-heals to green or **flags a real app bug** → reviews. Enforces tenant-isolation assertions, self-cleaning teardown, and DB-write safety. Ships 6 subagents (`flow-finder`, `api-flow-finder`, `flow-planner`, `test-writer`, `validator`, `reviewer`) + a surface-aware spec-hygiene hook. |
| `e2e-map` | `/growmax-skills:e2e-map <target>` | Censuses the **whole app** into one categorized, approvable flow map (`docs/e2e-flow-map.md`) and holds the **single** human approval gate that authorizes autonomous suite generation. Before the gate it runs an **approval-gap review** so you act on a short digest of gaps instead of reading every row: `approval-gap-structural` (haiku — routes with no row, incomplete rows, unflagged writes, dupes) + `approval-gap-category` (sonnet — whole *kinds* of flow the census missed: permission-denied/cross-tenant negatives, empty/error states, pagination, per-role variants). Subagent: `flow-census`. |
| `e2e-batch` | `/growmax-skills:e2e-batch <target>` | Generates the **approved** map autonomously through the `e2e-flow` pipeline with **no per-flow gate** — read-only flows unattended, write flows confirmed once. App bugs are quarantined, business ambiguities parked, and the batch keeps going; progress is a resumable ledger (`docs/e2e-coverage.md`). |
| `ux-audit` | `/growmax-skills:ux-audit [module\|all]` | **Take stock of UI drift.** Censuses a module (or the whole app) against the repo's `.claude/UI-STANDARDS.md`, fanning out `ui-standards-reviewer` per module, **verifies** every finding (drops what it can't reproduce), and writes the survivors into the living work queue `docs/ux-drift-backlog.md` as approvable rows (rule ID + files + status). Holds **one** human gate to bless priorities — that approval authorizes `/ux-migrate`. **Bootstraps** the standard from `examples/UI-STANDARDS.template.md` (framework auto-detected: Next.js app/pages router, React+Vite) if the repo has none, and proposes **catalog growth** (CMP-5) when it finds the same element hand-rolled on ≥2 screens. Review-only. Mirrors `/e2e-map`. Subagent: `ui-standards-reviewer`. |
| `ux-migrate` | `/growmax-skills:ux-migrate [scope\|ID]` | **Pay UI drift down.** Works the approved `docs/ux-drift-backlog.md` top-down: per item, applies the **smallest behavior-preserving diff that lands on the shared component/token** (compose, never restyle or fork), **re-runs `ui-standards-reviewer`** on the touched files to confirm the rule is now clean, flips the row to `done`, and commits per item citing the rule ID. Shared-component fixes first (one edit fixes every downstream screen). Non-blocking: items that turn out to need a real refactor are `blocked`, app bugs are **quarantined** (never papered over to force a rule green), product-ambiguous ones are `parked` — the run continues and is resumable from the backlog statuses. Mirrors `/e2e-batch`. |

> **Per-repo overlay:** the agents read repo-specific facts (ports, login, naming/teardown
> convention, driver gotchas, DB-safety) from a `.claude/E2E-NOTES.md` overlay if present. Copy
> `examples/E2E-NOTES.template.md` into your repo's `.claude/`, fill it in, and commit it.
> The `feature-review` workflow has its own overlay: `.claude/REVIEW-NOTES.md` (template:
> `examples/REVIEW-NOTES.template.md`) — test commands, blocking house rules, known debt, fix
> routes — plus a per-run ledger it appends to itself: `.claude/feature-review-ledger.md`
> (template: `examples/REVIEW-LEDGER.template.md`).
>
> **UI standards overlay:** `ui-standards-reviewer`, `/ux-audit`, and `/ux-migrate` read a
> per-repo `.claude/UI-STANDARDS.md` (the component/token rulebook, cited by rule ID) and the
> living work queue `docs/ux-drift-backlog.md`. Two seed files ship in `examples/`:
> `UI-STANDARDS.template.md` (framework-agnostic rules + a placeholder catalog + a bootstrap
> procedure — copy this into a **new** app and let `/ux-audit` fill it in) and `UI-STANDARDS.md`
> (a filled instance for the ink-on-paper admin app — a worked example, don't copy its paths),
> plus `UX-DRIFT-BACKLOG.md` (the backlog format). Without a standard, `ui-standards-reviewer`
> reports `NO_STANDARD` and the other reviewers run normally.
>
> **Heads-up — the hooks are global.** Installing this plugin activates two `PostToolUse` hooks
> that run on every `Write`/`Edit`: `hooks/check-e2e-spec.sh` (acts only on `*.spec.ts` /
> `*.e2e-spec.ts` — web Playwright hygiene / api create-without-teardown) and
> `hooks/check-ui-standards.sh` (acts only on `*.tsx`/`*.jsx`/`*.ts`/`*.js` **and only in repos
> that ship `.claude/UI-STANDARDS.md`** — a tight, high-precision grep for pill buttons, hover
> shadows/press-scale, hardcoded red on buttons, arbitrary `--ring` forms, and synonym icons,
> citing the rule ID). Both exit silently on everything else.

## Add a new skill

1. Create a folder under `skills/<your-skill-name>/` containing `SKILL.md` (use Claude's
   `skill-creator` skill to scaffold it). It's auto-discovered by the plugin — no manifest
   edits needed.
2. **Ship test/eval cases** with it (e.g. a `--selftest` in its script) so it doesn't rot
   silently — this is a team norm, not optional.
3. Add a row to the Catalog table above.
4. Open a PR. After merge, teammates get it with `/plugin marketplace update growmax`.

## How distribution works

This repo is **self-hosting**: it's a plugin marketplace *and* the plugin in one repo.

- `.claude-plugin/marketplace.json` — the catalog (declares the `growmax` marketplace and the
  `growmax-skills` plugin, sourced from the repo root `.`).
- `.claude-plugin/plugin.json` — the plugin manifest. Components are auto-discovered: `skills/`
  (one folder + `SKILL.md` each), `commands/` (slash commands), `agents/` (subagents), and
  `hooks/hooks.json` (event hooks). Adding a skill is just dropping a folder in; adding a workflow
  is dropping a command + its agents in.

Three ways skills can live, for reference:

- **Plugin (this repo):** installed once, available across all projects, versioned, updates via
  `/plugin marketplace update`. Best for sharing across the team. *(recommended)*
- **Personal (`~/.claude/skills/`):** your machine only — what `install.sh` sets up.
- **Pinned to one project (`.claude/skills/<name>/` committed in that repo):** everyone working
  in that repo gets it with no install step. Good for skills specific to one codebase.

Validate manifests before pushing with: `claude plugin validate .`
