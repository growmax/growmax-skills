# growmax-skills

Shared [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) skills for the
Growmax team. A skill is just a folder with a `SKILL.md` (plus optional `scripts/` and
`references/`). Clone this repo, run `./install.sh`, and Claude Code picks the skills up
automatically.

## Install (each teammate, once)

```bash
git clone <REPO_URL> growmax-skills
cd growmax-skills
./install.sh          # symlinks every skill into ~/.claude/skills
```

That's it — open Claude Code and the skills are available. The symlink approach means the next
step (updates) is free.

> On Windows without Developer Mode, symlinks need admin rights — use `./install.sh --copy`
> instead (or run under WSL).

## Update (get the latest skills)

```bash
git -C growmax-skills pull        # symlinked skills update instantly
# if you installed with --copy:   git pull && ./install.sh --copy
```

## Catalog

| Skill | What it does |
|---|---|
| `github-repo-analyzer` | Analyze any GitHub repo — what it is, problem, why used, benefits — plus a two-part "safe to use?" verdict: license (open source? can Growmax use it?) and security (a Trivy scan for CVEs, secrets, misconfigs). |

## Add a new skill

1. Create a folder under `skills/<your-skill-name>/` containing `SKILL.md` (use Claude's
   `skill-creator` skill to scaffold it).
2. **Ship test/eval cases** with it (e.g. a `--selftest` in its script) so it doesn't rot
   silently — this is a team norm, not optional.
3. Add a row to the Catalog table above.
4. Open a PR. After merge, teammates get it with `git pull`.

## Two ways to use these skills

- **Personal / all projects (this repo + `install.sh`):** skills live in `~/.claude/skills`
  and are available everywhere. Best default.
- **Pinned to a specific project:** copy a skill into that repo's `.claude/skills/<name>/`
  and commit it. Everyone working in that repo gets it automatically with no install step —
  good for skills that only make sense inside one codebase.

For a versioned, discoverable catalog later, Claude Code's plugin/marketplace mechanism is
worth evaluating — check the current docs, as that area evolves:
https://docs.claude.com/en/docs/claude-code/overview
