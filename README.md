# growmax-skills

Shared [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) skills for the
Growmax team, distributed as a **Claude Code plugin marketplace**. A skill is just a folder
with a `SKILL.md` (plus optional `scripts/` and `references/`); this repo bundles them into a
plugin so teammates install with one command and get updates automatically.

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

| Skill | Invoke as | What it does |
|---|---|---|
| `github-repo-analyzer` | `/growmax-skills:github-repo-analyzer` | Analyze any GitHub repo — what it is, problem, why used, benefits — plus a two-part "safe to use?" verdict: license (open source? can Growmax use it?) and security (a Trivy scan for CVEs, secrets, misconfigs). |

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
- `.claude-plugin/plugin.json` — the plugin manifest. Skills are auto-discovered from
  `skills/`, so adding a skill is just dropping a folder in.

Three ways skills can live, for reference:

- **Plugin (this repo):** installed once, available across all projects, versioned, updates via
  `/plugin marketplace update`. Best for sharing across the team. *(recommended)*
- **Personal (`~/.claude/skills/`):** your machine only — what `install.sh` sets up.
- **Pinned to one project (`.claude/skills/<name>/` committed in that repo):** everyone working
  in that repo gets it with no install step. Good for skills specific to one codebase.

Validate manifests before pushing with: `claude plugin validate .`
