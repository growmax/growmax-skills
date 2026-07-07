---
name: consult
description: >-
  Ask the Product Architect a DECISION question and get a grounded consultation: what your app does
  today (cited from the product notebook — the product-manager's knowledge), the industry standard
  and how peer systems handle it, ONE recommendation with trade-offs and effort, and what the
  decision unblocks. Ends with an offer to RECORD the ruling as an ADR-lite entry in
  docs/product/decisions.md (D-nnn) so past decisions bind future answers. Powered by the
  product-advisor agent in consult mode. Use for "should we X or Y", "what's the best practice
  for…", "how should this flow work". Invoke with /consult <your decision question>.
---

# /consult — ask the Product Architect

You are a thin dispatcher. Take the human's question from `$ARGUMENTS` and dispatch ONE
`product-advisor` agent in **consult mode** with: the question verbatim, the repo root, the
notebook path (`docs/product/`), and today's date. No notebook (`docs/product/INDEX.md` missing) →
say so and point to `/learn-app` first (a consultation without the notebook is generic advice —
exactly what this system exists to avoid).

Relay the consultation as returned (it's already answer-first and scannable). If the human assents
to recording ("record it" / "agree, save it"), dispatch the SAME agent again to append the D-nnn
entry to decisions.md — and remind them: if this settles an OPEN ledger question, write "per D-nnn"
under that question's answer so the next fold connects them.

Never answer the decision question yourself in this session — the agent owns the grounding
discipline and the decisions.md format.
