# prompt-enhancer

A Claude Code **mod** that rewrites a rough prompt before you send it.

Type a quick draft, press **✦ Enhance** (on the line above the prompt box), and a popover offers two rewrites:

| Choice | What you get |
|---|---|
| **1 Precise** | A clean, specific version of your draft: names the files and constraints it refers to, numbered steps for multi-step work, and what "done" looks like. |
| **2 Expert agents** | Works out which experts the request needs (a code review → senior software engineer; an architecture question → senior architect + product manager; security → application security engineer, …) and writes a prompt that has Claude run one subagent per expert, in parallel where they're independent, then combine their findings into one answer. The popover shows which experts it picked. |

Review the preview, then:

- **Enter (Use this)** puts it in your prompt box in place of the draft. Nothing is sent until you press Enter again.
- **r** regenerates. **Esc** closes and leaves your draft alone.
- **↶ Undo** (in the band, after using it) brings your original draft back.

No button where you work (VS Code, browser)? Type `/enhance <your draft>` instead; it opens the same popover.

## Install

```text
/plugin marketplace add growmax/growmax-skills
/plugin install prompt-enhancer@growmax
```

It's opt-in and separate from `growmax-skills`: installing the skills bundle doesn't turn this on.

Needs Claude Code **2.1.287 or later** (mods load by default from that version).

## How it works

- The rewrite forks your current session (`$.model.fork`), so it knows the conversation and can name real files instead of guessing. On the very first prompt of a session there's nothing to fork yet, so it falls back to a context-free Haiku rewrite and says so.
- **Cost:** one extra model call each time you press Precise, Expert agents or Regenerate, on your own Claude usage. Nothing runs unless you press a button.
- **Errors are shown as they are**, for example `API error 529 (overloaded)`, and your draft is left untouched.
- **Sharing the band:** only one mod can draw the line above the prompt. Prompt Enhancer draws whatever the mod beneath it drew (for example Token Weather) on the left and its button on the right.

## Where it works

| Surface | ✦ Enhance button | `/enhance` + popover |
|---|---|---|
| Terminal (and JetBrains) | ✅ | ✅ |
| Desktop app, Code tab (local) | ✅ | ✅ |
| VS Code extension | — | ✅ |
| Cloud sessions | Only if your org enables it in server-managed settings (see below) | same |

**Org-wide / cloud sessions:** a Claude organization Owner can turn it on for everyone, including cloud sessions, in claude.ai → Organization settings → Claude Code → Managed settings:

```json
{
  "extraKnownMarketplaces": {
    "growmax": { "source": { "source": "github", "repo": "growmax/growmax-skills" } }
  },
  "enabledPlugins": { "prompt-enhancer@growmax": true }
}
```

## Develop

```text
claude plugin validate mods/prompt-enhancer
claude plugin test mods/prompt-enhancer
claude --plugin-dir mods/prompt-enhancer
```

`hooks/register.tsx` is the whole mod; `types/index.d.ts` declares the values it keeps; `tests/enhance.test.tsx` covers Precise, Expert agents, Undo, the Haiku fallback, a real API error, an empty draft, and `/enhance`. Claude Code writes `.claude-plugin/types/` (the API types the `tsconfig.json` extends) each time it loads the mod; that folder is git-ignored.
