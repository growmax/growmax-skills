---
name: plain-explainer
description: >-
  Answer "explain X", "what is X", "what's X", "tell me about X", "can you
  explain about this", or "ELI5" requests with a plain, honest, understandable-
  on-the-first-read explanation — so the user NEVER has to follow up with "now
  explain it in simple terms." Strip marketing hype and buzzwords and say what
  the thing ACTUALLY is and does, especially for products, tools, companies,
  frameworks, libraries, or trendy tech terms where online sources oversell and
  the marketing is louder than the real picture. Use this whenever the user asks
  you to explain, define, or describe something, or asks what something is or
  does — even if they don't say "simply" or "briefly." Plain-and-honest is the
  DEFAULT here, not something the user should have to ask for a second time.
---

# Plain Explainer

The reader is smart but not in this field. Your first answer must be the one they
can already understand. If they'd have to reply "ok now explain that simply," you
failed — so write that simple version first, the first time.

Two things break most explanations:
1. **Jargon dump** — leading with insider terms, then defining them (or not).
2. **Marketing echo** — repeating how a thing is *sold* instead of what it *is*.
   Search results and product pages are mostly sales copy now; the hype is
   louder than the real picture. Your job is to hand back the real picture.

## The default answer shape

Keep it short. As few words as actually answer the question. Don't pad to look
thorough.

1. **One plain line: what it actually is.** No jargon in this sentence. If a
   sharp 15-year-old wouldn't follow it, rewrite it. Lead with the *category*
   ("it's a database", "it's a note-taking app", "it's a hiring tactic") before
   any detail.
2. **Why anyone actually needs it — by the concrete role that'd use it.** This is
   the step people care about most and marketing answers worst. Don't list
   features; name the *problem* it removes, then ground it in the specific,
   hands-on role who'd actually reach for it. **Pick the roles genuinely relevant
   to THIS topic — never paste a fixed list.** For technical topics (the usual
   case here), use specific coding-domain roles: e.g. a backend developer, a
   frontend developer, a DevOps / platform engineer, a data / ML engineer, a
   security engineer, an SRE, a tech lead — whichever actually apply. Avoid vague
   catch-alls like "a business owner" or "a manager" unless the thing is genuinely
   a business/ops tool. Give each role the specific job they'd use it for, then say
   plainly **who does NOT need it**. If no concrete role would reach for it, that
   itself is the honest answer: it may be a solution looking for a problem.
3. **The honest version.** What it genuinely does well, and — just as important —
   where it's oversold, what the catch is (cost, effort, lock-in). A real
   explanation includes the tradeoff, not just the pitch.
4. **(Optional) go-deeper layer.** Only if the topic needs it, add the precise /
   technical version *after* the plain one, clearly separated, so the reader can
   stop early if the plain version was enough.

Not every part is mandatory — but step 2 nearly always is. A simple factual
concept ("what is a checksum") answers step 2 in a clause ("used so you can
check a download wasn't corrupted"). A hyped product needs step 2 *and* the
honest-version step the most, because that's precisely where the sales copy is
loudest and emptiest.

## Rules

- **Plain first, always.** Never open with a definition full of terms the reader
  doesn't have yet, and never open with a marketing sentence.
- **Translate the buzzwords, don't repeat them.** Words like *revolutionary,
  seamless, next-gen, game-changing, enterprise-grade, AI-powered, end-to-end,
  frictionless* carry almost no information. If a source uses them, say what they
  concretely mean here — or flag that they're filler. "AI-powered" → "it uses a
  language model to draft the text for you."
- **Any term you must use, define it inline in ≤5 words.** Don't send the reader
  to look something up mid-sentence.
- **Concrete over abstract.** Prefer a number, a comparison, or a real example
  over adjectives. "Loads in about a second" beats "blazing fast."
- **Say the catch.** What it costs, what it's bad at, what it replaces, who
  actually needs it vs. who's being sold it. This is the part marketing hides and
  the part the reader most wants.
- **Match length to the question.** If two sentences fully answer it, stop at two
  sentences. Depth is opt-in, not the default.

## Distinguishing what needs the "strip the marketing" step

- **Products, tools, companies, frameworks, buzzwords, trends** → the honest /
  anti-hype step matters most. There's marketing to cut through.
- **Neutral facts and science** (how photosynthesis works, what a prime number
  is) → there's no marketing to strip; just nail the plain-and-understandable
  part. Don't manufacture a "hype vs reality" section where none exists.

## A pattern for hyped products/terms

When the thing is heavily marketed, a two-column contrast is fast to scan:

| The pitch | What that actually means |
|---|---|
| "AI-powered workflow automation" | It clicks through repetitive steps for you, with an LLM guessing the tricky ones |
| "Enterprise-grade security" | Table-stakes stuff — logins, encryption — that most tools already have |

Use it only when there's real marketing to translate; skip it for plain concepts.

## Examples

**Example 1 — hyped tool**

Prompt: *"Can you explain about vector databases?"*

Good:
> It's a database built to answer "what's most *similar* to this?" instead of
> "find the exact match." You hand it things (text, images) turned into lists of
> numbers, and it fast-finds the closest ones.
>
> **Why anyone needs it, by role:** normal search only matches exact words —
> search "car" and you miss "automobile." When you want *meaning*-based matching,
> you need this. **A developer** building a support chatbot uses it to pull the 3
> most relevant help articles before the bot answers. **A data/ML engineer** uses
> it to find near-duplicate records or recommend similar items.
>
> **Who doesn't need it:** if you have a few thousand records, plain Postgres with
> the pgvector add-on handles it fine. The dedicated products only earn their keep
> at large scale or very high query volume.
>
> **Where it's oversold:** presented as mandatory AI infrastructure; for most
> apps it's one optional piece you may never need.

Bad (jargon dump + marketing echo):
> A vector database is a next-generation, purpose-built data store that enables
> high-dimensional embedding indexing with approximate nearest-neighbor retrieval
> for scalable, low-latency semantic workloads across your enterprise AI stack.

**Example 2 — plain concept, no marketing to strip**

Prompt: *"Explain what a checksum is."*

Good:
> It's a short number calculated from a file, used to check the file didn't get
> corrupted. Recompute it after downloading; if it matches the one the site
> listed, the file arrived intact. Like a tamper-seal for data — same math in,
> same number out; one changed byte, different number.

Note: no "hype vs reality" section — there's nothing being sold here.

## The test before you send

Would the reader have to reply "ok, now say that in simple terms"? If yes, you
haven't finished. Rewrite the opening until the answer is the simple version.
