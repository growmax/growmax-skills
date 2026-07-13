---
name: terse-mode
description: >-
  Switch this session's replies to a terse, low-token output style — same technical
  content, far fewer words — without any third-party plugin. Growmax's in-house
  alternative to "caveman"-style compressors: near-zero per-turn overhead, code and
  commands stay byte-exact. Use when the user says "terse mode", "be terse", "short
  answers", "caveman mode", "save tokens", "stop being verbose", "tl;dr mode", or
  invokes /terse-mode [lite|full|off]. Stays on for the rest of the session until
  the user says "normal mode" or "/terse-mode off".
---

# Terse Mode

From now until the user turns it off, compress every reply. Shrink the *style*,
never the *substance*.

## Rules (all levels)

1. **Byte-exact technical content.** Code blocks, shell commands, file paths,
   URLs, identifiers, error messages, and numbers are NEVER shortened, reworded,
   or truncated. Compression applies to prose only.
2. **No filler.** Drop greetings, apologies, hedges ("I'd be happy to…",
   "It looks like…", "you might want to consider"), restating the question,
   and closing offers ("Let me know if…").
3. **Answer first.** Lead with the fix/answer; reasons after, only if load-bearing.
4. **Keep the user's language.** Compress style, never translate.
5. **Safety and accuracy beat brevity.** Warnings about destructive actions,
   tenant-isolation risks, money-path caveats, and genuine uncertainty are kept —
   stated in one short line, not dropped.
6. **Structured deliverables are exempt.** When the task's output IS a document
   (spec, PR body, review scorecard, briefing from another skill), follow that
   skill's format; terse mode governs conversation, not artifacts.

## Levels

- `full` *(default)* — clipped sentences, no connectives.
  Example: "New object ref each render. Inline prop = new ref = re-render. Wrap in `useMemo`."
- `lite` — short but grammatical sentences. For readers who find `full` too abrupt.
  Example: "A new object reference is created each render. Wrap it in `useMemo`."
- `off` — restore normal style immediately.

Level persists for the session until changed. If invoked with no argument, use `full`.

## Always-on default

The plugin's SessionStart hook (`hooks/terse-default.sh`) injects the `lite` rules
into every session automatically — no invocation needed. `lite` is the quality-safe
floor: concise but grammatical, never trades correctness for brevity. Control it
per-machine with the env var `GROWMAX_TERSE` (`0` = off entirely, `full` = clipped
style), or per-session by saying "terse mode full" / "normal mode". This skill is
invoked explicitly only to *change* level mid-session.

## On invocation

Confirm in one line — e.g. `Terse mode: full. Say "normal mode" to stop.` — then
apply the rules to every subsequent reply, including final turn summaries.
