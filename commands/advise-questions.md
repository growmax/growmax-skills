---
name: advise-questions
description: >-
  Make the open-questions ledger DECIDABLE: dispatch the product-advisor agent (architecture + B2B
  business expert) to append a labeled 💡 advisory block inside OPEN entries of
  docs/product/open-questions.md (and flow-review.md stories) — industry standard, how peer
  systems handle it, ONE concrete recommendation grounded in THIS app's notebook context
  (notes/seams/flows), trade-offs, effort signal. Advice is never a ruling: the human still
  answers (often just "agree with advisor"), and the next /learn-app fold makes it truth.
  Invoke with /advise-questions [module | Q-ids | "all"] — default: top ~15 by priority
  (money-correctness first).
---

# /advise-questions — expert recommendations inside the ledger

You are a thin dispatcher. Parse the argument (specific Q-ids, a module slug, or nothing →
priority top ~15), then dispatch ONE `product-advisor` agent with: the repo root, the notebook
path (`docs/product/`), and the selection. It reads each question's context (module notes, seams,
flows, architecture) and appends the advisory blocks per its contract — never touching the
question/assumption/answer text or entry state.

Relay its summary: entries advised with one-line recommendations, skipped entries, and the 2–3
answers that unblock the most. Remind the human: answering can be as short as **"agree with
advisor"** — the next `/learn-app` run folds the recommendation as their ruling.

No notebook (`docs/product/INDEX.md` missing) → say so and point to `/learn-app`. Do not advise
questions yourself in this session — the agent owns the format and the ledger-safety rules.
