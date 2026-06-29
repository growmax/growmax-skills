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

### Workflows (command + subagents)

| Workflow | Invoke as | What it does |
|---|---|---|
| `e2e-flow` | `/growmax-skills:e2e-flow <target> <flow>` | Gated, multi-agent E2E test generation for **web** (Playwright + playwright-mcp) and **api** (the repo's Jest/supertest or Vitest runner) surfaces. Discovers a flow → **you approve the business intent** → plans against the *real* repo → writes one spec → self-heals to green or **flags a real app bug** → reviews. Enforces tenant-isolation assertions, self-cleaning teardown, and DB-write safety. Ships 6 subagents (`flow-finder`, `api-flow-finder`, `flow-planner`, `test-writer`, `validator`, `reviewer`) + a surface-aware spec-hygiene hook. |

> **Per-repo overlay:** the agents read repo-specific facts (ports, login, naming/teardown
> convention, driver gotchas, DB-safety) from a `.claude/E2E-NOTES.md` overlay if present. Copy
> `examples/E2E-NOTES.template.md` into your repo's `.claude/`, fill it in, and commit it.
>
> **Heads-up — the hook is global.** Installing this plugin activates a `PostToolUse` hook
> (`hooks/check-e2e-spec.sh`) that runs on every `Write`/`Edit`. It only acts on `*.spec.ts` /
> `*.e2e-spec.ts` files (web → Playwright hygiene; api → create-without-teardown), and exits
> silently on everything else.

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
