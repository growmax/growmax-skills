# Mods

Claude Code **mods** are plugins of function hooks: they can change what Claude Code does and draw their own UI (a button above the prompt, a popover, a status line). Each folder here is one self-contained plugin, listed separately in `.claude-plugin/marketplace.json` so every mod is **opt-in**. Installing `growmax-skills` doesn't install any of them.

| Mod | What it does | Install |
|---|---|---|
| [`prompt-enhancer/`](prompt-enhancer/) | Rewrites a rough prompt as a Precise prompt or an Expert agents prompt, from a button above the prompt box or `/enhance`. | `/plugin install prompt-enhancer@growmax` |

## Add a mod

1. Create `mods/<name>/` with `.claude-plugin/plugin.json`, `hooks/hooks.json` (`{ "modules": ["./register.tsx"] }`) and the hooks module. Ask Claude Code to "make a mod"; it uses the built-in plugin-authoring skill.
2. Ship tests (`tests/*.test.tsx`, run with `claude plugin test mods/<name>`) and a README. Same team norm as skills.
3. Run `claude plugin validate mods/<name>` and try it with `claude --plugin-dir mods/<name>`.
4. Add an entry to `.claude-plugin/marketplace.json` with `"source": "./mods/<name>"`, and a row to the table above.
5. Leave `version` out of `plugin.json` so every merge to `main` reaches teammates on `/plugin marketplace update growmax`.

Mods need Claude Code 2.1.287 or later.
