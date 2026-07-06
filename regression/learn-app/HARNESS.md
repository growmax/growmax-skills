# /learn-app regression harness

A closed-loop test suite for the `/learn-app` command + `product-scribe` / `product-manager`
agents. Each round is a **synthetic app with known planted issues** and a **hidden answer key**.
The test: run `/learn-app` on the fixture with NO hints, then score the generated
`docs/product/` notebook against the answer key. A drop from the baseline = a regression in the kit.

## Why this exists
`/learn-app`'s one job is to document a product **truthfully** — never state a bug as if it were
correct behavior, never invent problems in correct code, and reconstruct multi-step business flows
(not just list endpoints). These fixtures exercise exactly those failure modes on controlled code
where we already know every right answer.

## When to run it (both triggers, not just the first)
1. **Any change to the kit** (commands/learn-app.md, agents/product-scribe.md,
   agents/product-manager.md, templates).
2. **Any change to the underlying model** — the session model or an agent's `model:` frontmatter.
   The kit's behavior is partly a property of the model executing it; a model upgrade can shift
   behavior with zero kit changes. Re-run the suite before trusting new runs on real repos.

## Layout
```
regression/learn-app/
  HARNESS.md              # this file
  fixtures/               # the synthetic apps (source only — NO generated docs/product)
    orderdesk/            # R1/R2: obvious traps (misleading name, dead route, docs-vs-code, hidden route)
    tenantdesk/           # R3: subtle SECURITY traps (cross-tenant leak, auth bypass, =-not-== guard, no token expiry)
    tradeflow/            # R4: B2B document PIPELINE (quote→order→invoice→payment) + a dead approval gate
  ground-truth/           # hidden answer keys — the scorer reads these; the runner must NOT
    GROUND-TRUTH.md       # orderdesk (R1/R2)
    GROUND-TRUTH-R3.md    # tenantdesk
    GROUND-TRUTH-R4.md    # tradeflow
```

## How to run one round (manual, agent-driven)
1. **Copy the fixture to a scratch dir** (so the fixture here stays pristine and un-notebooked):
   `cp -r fixtures/tradeflow /tmp/rr && cd /tmp/rr && git init -q && git add -A && git commit -qm base`
2. **Runner** — dispatch a subagent told to execute `/learn-app` on the scratch copy **verbatim from
   the shipped instruction files** (commands/learn-app.md + agents/product-scribe.md +
   agents/flow-census.md), code-only (no URL), and to NEVER open `regression/learn-app/ground-truth/`.
3. **Scorer** — dispatch a second, independent subagent given: the matching ground-truth file, the
   fixture source, and the generated `docs/product/`. It grades the dimensions below and returns a
   scorecard + PASS/FAIL + defects. (Doing the scoring yourself in the foreground also works and
   avoids flaky background channels.)
4. Compare to the baseline. Any dimension below baseline, any trap regressing to FAIL, or ANY
   confident falsehood = a regression → fix the kit, re-run.

## Scoring dimensions (0–10 each)
- **Completeness** — every module/route/rule present; env-gated & conditional surfaces included.
- **Truthfulness** — every `[code]`/`[docs]` claim matches the source. A false "confirmed" claim is critical.
- **Trap handling** — each planted issue described as real behavior AND flagged as a suspicion (not stated as correct).
- **Flow discovery** (R4) — the document chain + state machines + handoffs reconstructed as connected steps, ideally a cross-cutting pipeline note; not isolated endpoint blurbs.
- **Question quality** — ledger holds only human-intent questions; bugs go to suggestions, not questions.
- **No-bluff / provenance** — every claim tagged; no assumption stated as fact; **no false positives** (correct code — e.g. tradeflow projects/admin — not flagged as buggy).
- **Format compliance** — frontmatter valid, INDEX ≤~200 lines & counts auditable, cross-links valid.

## Baseline scores (do not regress below these)

| Round | Fixture | Kit ver | Result | Key must-pass |
|---|---|---|---|---|
| R1 | orderdesk | 1.5.0 | 10/10/10/9/10/9, PASS | all 4 traps PASS, zero confident falsehoods |
| R2 | orderdesk | 1.5.1 | 10/10/10/9/10/10, PASS | R1 fixes non-regressing |
| R3 | tenantdesk | 1.5.2 | 4/4 traps PASS, truthful, PASS | cross-tenant leak caught; no false positives on projects.js/admin.js |
| R4 | tradeflow | 1.5.2 | flows PASS, dead-gate bug caught, PASS | quote→order & order→invoice handoffs + doc chain reconstructed; discount-gate units bug flagged not stated as fact |

## The planted issues each round MUST catch (quick reference for the scorer)
- **orderdesk:** `applyTax` is really a 2.5% service fee (not tax); bulk discount 10% in code vs 5% in docs; `POST /orders/:id/flag` is a dead/unexplained route; reports router is env-gated.
- **tenantdesk:** `GET/PUT /tasks/:id` miss the `organizationId` filter (cross-tenant read+write leak); `/api/internal/metrics` mounted with no auth; `reports export` uses `=` not `===` (no-op guard + privilege mutation); `verifyToken` never checks `exp` (tokens never expire) — all four contradict the security doc.
- **tradeflow:** the three flows (quote lifecycle w/ 14-day expiry gate; order lifecycle w/ maker-checker discount approval; invoice payment allocation w/ partial/full/overpayment) and the document chain `quote→order→invoice→payment`; the SUBTLE bug — confirm's discount gate compares a 0–1 fraction against `15`, so manager approval is never actually required.

> Fixtures are single-purpose teaching bugs; keep them stable. To add a round, add a fixture +
> ground-truth pair and a baseline row here.
