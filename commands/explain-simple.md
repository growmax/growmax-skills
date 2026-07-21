---
name: explain-simple
description: >-
  Explain any topic, tool, product, framework, or buzzword in plain language that
  lands on the FIRST read — no jargon dump, no "now say it simply" round trip — and
  strip the marketing so the reader gets what the thing ACTUALLY is and does, not
  how it's sold. Says why anyone actually needs it broken down by role (developer,
  PM, business owner), who does NOT need it, and the real catch (cost, effort,
  lock-in). Use for "explain X", "what is X", "tell me about X", "can you explain
  about this", "ELI5". Reliable entry point for the plain-explainer skill —
  triggering a passive skill on bare "what is X" is flaky, so invoke this command
  when you want the plain-and-honest treatment on demand. Invoke with /explain-simple <topic>.
---

# /explain-simple — plain, honest, first-read-understandable explanations

You are a thin dispatcher. Take the topic from `$ARGUMENTS` and answer it by
applying the **`plain-explainer` skill** (`skills/plain-explainer/SKILL.md`) —
read that skill and follow its answer shape and rules exactly.

Non-negotiables from the skill, restated so you don't drift:

1. **Plain line first.** Open with what it actually is, category first, zero
   jargon. If a sharp 15-year-old couldn't follow the opening sentence, rewrite it.
2. **Why anyone needs it — by concrete role.** Name the real problem it removes,
   then the specific job the roles genuinely relevant to THIS topic would use it
   for. Pick the roles that actually apply — don't paste a fixed list. For
   technical topics, use specific coding-domain roles (backend dev, frontend dev,
   DevOps / platform engineer, data / ML engineer, security engineer, SRE, tech
   lead — whichever fit), not generic business titles. Then say who does NOT need it.
3. **The honest version.** Where it's oversold, and the catch — cost, effort,
   lock-in. Translate buzzwords ("AI-powered", "enterprise-grade") into what they
   concretely mean instead of echoing them.
4. **Depth is opt-in.** Any technical layer goes *after* the plain version, clearly
   separated, so the reader can stop early.

If the topic is a live product, tool, company, or version (anything whose facts or
price could have changed), **search the web first** — prices, benchmarks, and
"latest version" claims go stale, and the whole point of this command is the *real*
picture, not the remembered or marketed one.

**Terse-mode override.** This command's whole value is the full plain-and-honest
structure (plain line → by-role need → honest catch). The plugin's always-on
`terse-default` hook would clip exactly that richness, so for THIS response,
suspend terse compression and produce the complete plain-explainer output — the
skill's format wins. (Terse resumes automatically on the next normal turn; the
reader can still say "normal mode" to leave it off.) Even so: no filler, no
padding — plain does not mean long.

If `$ARGUMENTS` is empty, ask what to explain — one line, no preamble.

The self-check before you send (from the skill): would the reader have to reply
"ok, now say that in simple terms"? If yes, you haven't finished.
