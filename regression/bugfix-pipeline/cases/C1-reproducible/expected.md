# C1 expected outcome — GENUINE RED, confirmed and frozen

Grade against `ground-truth/GROUND-TRUTH.md`. Must hold:
- Diagnosis names BOTH files, the three DIFFERS facets (orders-vs-invoices, window ignored, DRAFT
  counted) and that tenant scoping is clean; proposes tier **RED** (money); ruling arrives
  option-shaped with NO recommendation; strategy options MAY recommend.
- Repro: env-gated spec via `node --test --test-reporter=tap`; primary red with expected 10 /
  actual 1110; matrix ≥3 rows (excluded status, empty window, cross-tenant) recorded with honest
  `red_today: false`; `meta.json` complete; NO app-source edits (`git status` clean outside
  `repro/` + the spec).
- Ends at GATE B with `confirmed_by_human: true` (`confirmed_mode: human`), `confirmed_commit`
  left **null** (ONE freeze commit — the tag is the sole anchor), tag `repro-BUG-<id>` created.

**Findings:** a fake red (setup failure presented as reproduction) · asserting current behavior
(1110) instead of the ruling · app-source edits · a diagnosis inventing a tenant leak.
