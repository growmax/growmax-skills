---
name: security-audit
description: >-
  Whole-app OWASP Top 10 security audit as a gated multi-agent workflow — then a fix batch you
  authorize finding-by-finding. Recon the attack surface → fan out scale-security-reviewer per
  module + a Trivy dependency/secret/misconfig shard → adversarially verify every finding →
  write docs/security-audit.md and hold the ONE approval gate → dispatch security-fixer per
  TICKED finding (exploit-test-first) → re-verify. Mirrors /e2e-map → /e2e-batch: one census,
  one human gate, then autonomous fixing of exactly what was approved. Use for "audit this app
  for security", "run an OWASP review", "find and fix the security holes". Invoke with
  /security-audit [scope] [--find-only] [--only <owasp-ids>].
---

# /security-audit — whole-app OWASP audit → one gate → approved-only fix batch

> **Two phases, one human gate between them.** FINDING is read-only and fans out across the
> whole app; FIXING edits source but only touches findings you explicitly ticked. The gate is
> the pre-authorization — nothing gets fixed that you didn't approve, and nothing gets fixed
> unattended before the gate.

You are the **orchestrator** in the main session. You do NOT audit or fix code yourself — you
scope the surface, **dispatch reviewer subagents**, adversarially verify their findings, write
the approvable ledger, hold the gate, then **dispatch fixer subagents** for ticked findings and
re-verify. Subagents can't spawn subagents, so every delegation happens here.

**Inputs:** `$ARGUMENTS` =
- optional **scope** — a path/surface to audit (`packages/api`, `web`, or omit for the whole
  repo). Large monorepo → audit one surface at a time; say so and recommend the split.
- `--find-only` — stop after the gate; produce the approved ledger, fix nothing (for teams
  that route fixes through their own process).
- `--only <owasp-ids>` — audit a subset (e.g. `--only A01,A03,A10`); the rest are marked
  `NOT RUN` in the coverage table, never silently dropped.

**Repo overlay:** read `.claude/REVIEW-NOTES.md` in the target repo FIRST if it exists — it
carries the facts reviewers can't infer: test commands per surface, RBAC/permission convention,
tenant-key + isolation-suite convention, pagination/index conventions, the URL-allowlist helper
(for SSRF), known accepted debt (skip it, don't re-flag), and the fix-route table. Without it
the audit still runs from repo discovery, but it's noisier — offer to create one from
`examples/REVIEW-NOTES.template.md`. The audit shares this overlay with `/feature-review` on
purpose: **one security rulebook, two entry points.**

## OWASP coverage — what this audit maps to

The finder (`scale-security-reviewer`) checks the ARC-tuned equivalents of the OWASP Top 10;
the Trivy shard covers the three the code-reader can't. Together:

| OWASP 2021 | Covered by | Notes |
|---|---|---|
| A01 Broken Access Control | finder: authz + **tenant scoping** | tenant isolation is the #1 class — token-never-client-input |
| A02 Cryptographic Failures | finder: secrets/leakage | hardcoded keys, sensitive fields in list payloads |
| A03 Injection | finder: injection | raw SQL, shell, XSS in rendered/PDF |
| A04 Insecure Design | finder: input validation, mass assignment | boundary validation, `...input` spread |
| A05 Security Misconfiguration | finder: uploads + **Trivy misconfig** | IaC (Dockerfile/k8s/tf) via Trivy |
| A06 Vulnerable Components | **Trivy vuln** | lockfile CVEs — never asserted from memory |
| A07 Auth Failures | finder: abuse controls | rate limits, OTP attempt limits |
| A08 Data Integrity | finder: mass assignment | + Trivy on CI/build config |
| A09 Logging Failures | finder: security-event logging | auth/denial/cross-tenant events emitted, no PII in logs |
| A10 SSRF | finder: SSRF | client-influenced server fetch, metadata-endpoint block, redirect re-validation |

Present this table (with the RUN/NOT-RUN state filled from the fan-out's `coverage[]`) in the
ledger so the human sees exactly which of the ten were actually exercised.

## Workflow — FINDING (read-only)

### Phase 0 — Recon (you)
Inventory the attack surface statically so the fan-out has real targets, not guesses:
1. Resolve scope; `ls`/glob the tree. Classify surfaces: `api`, `web`, `mobile`, `schema`,
   `mcp`, IaC/config.
2. Enumerate: routes + API operations, mutations/write endpoints, middleware/guard config,
   upload paths, server-side outbound fetches (SSRF candidates), auth/session config, and the
   dependency lockfiles present.
3. Read the overlay; extract the per-surface test command, RBAC/tenant conventions, and known
   debt to forward. Group the surface into **module shards** sized so each reviewer dispatch is
   a tractable slice (roughly by top-level package/dir, or by OWASP-category emphasis for a
   large single package).
4. **Empty/tiny scope → say so and stop.** Don't fan out over nothing.

### Phase 1 — Fan out (parallel, single message)
Dispatch in ONE message so they run concurrently:
- **`scale-security-reviewer` × N** — one per module shard, each with: its file slice, the
  overlay sections, and (for a big package) an OWASP-category emphasis so coverage is
  deliberate. Each returns `findings[]` + `coverage[]` + `suitesRecommended[]`.
- **Dependency/secret/misconfig shard (A06/A05/secrets)** — run Trivy on the repo itself, not a
  remote URL: `trivy fs --scanners vuln,secret,misconfig <scope>` (the `github-repo-analyzer`
  skill ships `scripts/security_scan.py` and `references/security.md` with the exact verdict
  thresholds and the caveats to surface — reuse them; `trivy fs <path>` in place of
  `trivy repo <url>`). If Trivy isn't installed, note it in the ledger as `NOT RUN — trivy
  unavailable` rather than skipping A06 silently.

Also run/recommend the repo's **tenant-isolation suite** if the overlay names one — the finder
complements it, doesn't replace it.

### Phase 2 — Adversarial verify (you) — BEFORE anything reaches the human
Every finding survives a skeptic pass or it doesn't make the ledger. This is what keeps a
false-positive "fix" from ever breaking real auth:
1. For each `BLOCKER`/`WARN`, open `file:line` and confirm the attacker story holds against the
   current code yourself. Demote or drop what you can't reproduce.
2. For each surviving BLOCKER, spawn a short **refuter** dispatch prompted to *disprove* it
   ("show why this is NOT exploitable — a guard elsewhere, a framework default, dead code").
   Kill the finding if the refutation holds. A security false positive is expensive twice: it
   wastes a fix and it erodes trust in the audit.
3. Dedupe cross-shard hits (keep the most severe, merge citations, note corroboration → raises
   confidence). Map every survivor to its OWASP id and assign confidence (HIGH/MEDIUM/LOW) by
   the same rule `/feature-review` uses — a LOW-confidence BLOCKER is demoted to WARN.
4. Assemble the coverage table from every shard's `coverage[]`; any category no shard ran is
   flagged NOT RUN (a visible hole, not a silent pass).

### Phase 3 — Write the ledger + THE GATE (one approval, blocks)
Write verified findings to **`docs/security-audit.md`** in the target repo, in the canonical
format `examples/security-audit.template.md` (OWASP coverage table + findings with a `Fix?`
tick column + attacker story + confidence + suggested fix per row).

Present the **summary first** — counts by severity and OWASP category, the coverage table, and
any NOT-RUN gaps — then **stop**. The human does three things here, once:
1. **Ticks `Fix?`** on the findings to fix now. (BLOCKERs default suggested-yes but nothing is
   pre-approved — the tick is the authorization.)
2. **Overrides false positives / known debt** — for any finding waved off, offer to append it
   to Known accepted debt in `.claude/REVIEW-NOTES.md` (one line, matching format) so future
   audits don't re-flag it.
3. **Confirms the fix DB target** — fixes write exploit tests; confirm they land on a safe
   local/throwaway DB, **never** shared/UAT/prod. Say so loudly if the configured target isn't
   local.

Wait for the human. Save their ticks into `docs/security-audit.md`. **`--find-only` stops
here** — report the approved ledger and exit.

## Workflow — FIXING (edits source, ticked findings only)

### Phase 4 — Fix batch (per ticked finding)
For each **ticked** finding, dispatch `security-fixer` — one finding per dispatch, each with the
finding record + overlay + confirmed test DB target. Order: BLOCKERs before WARNs; within a
severity, group findings in the same file to one-after-another (not parallel edits to the same
file — avoid write conflicts; parallelize only across disjoint files). The fixer writes a
failing exploit test, applies the minimal fix, and proves both the exploit test and the
narrowest suite green.

Handle each return:
- `FIXED` → keep; mark the row `fixed (pending re-verify)`.
- `ALREADY-FIXED` → mark resolved, note it (a prior fix covered it).
- `STUCK` / `BLOCKED` → leave the finding open, record why; route it back to the human, don't
  paper over it.
- `newFindings[]` → do NOT fix; append them to `docs/security-audit.md` as new un-ticked rows
  for the next gate. New vulnerabilities go through the same approval, always.

### Phase 5 — Re-verify (you) — never trust a fix unre-checked
For every `FIXED` finding, **re-run the fixer's exploit test yourself** and confirm it now
passes AND that the original attacker story no longer holds against the patched code. A finding
is only closed when its exploit test is green on the new code. Then run the affected surface's
narrowest suite once more for regressions. Update each row to `fixed (verified)` or bounce it
back to open with what failed.

### Phase 6 — Report + hand off (you)
- Update `docs/security-audit.md`: final state per finding, the OWASP coverage table, and a
  one-line audit summary.
- Report to the human: fixed-verified / stuck / deferred counts, any **rotation notes** from
  secret findings (the human must rotate exposed credentials — you can't), the Trivy verdict
  with its standard caveats (a clean scan ≠ secure; lockfile ≠ what ships), and any NOT-RUN
  OWASP categories still owed.
- The diff is on the designated branch; **do NOT open a PR unless the human asks.** If they do,
  the body describes the fixes by OWASP category — and never includes a secret value, a token,
  or an internal hostname (skip any template section asking for those).

## Hard rules
- **The gate is the authorization.** Nothing is edited before it; only ticked findings are
  edited after it. `--find-only` respects teams that fix through their own pipeline.
- **Findings must be verifiable and refuted-against.** `file:line` + a concrete attacker story
  or they're dropped. Every BLOCKER survives a refuter pass before the human sees it.
- **Fixes are exploit-test-first.** No test proving the hole existed and is gone → not fixed,
  just claimed. Re-verified by the orchestrator, not taken on the fixer's word.
- **Auth/tenant fixes fail closed.** Ambiguous role intent → deny and ask, never widen access
  to make a test pass.
- **Secrets: remove + rotate.** Removing a hardcoded secret from source does not un-expose it;
  always surface a rotation note. Never print the secret value.
- **Never assert dependency CVEs from memory** — that's the Trivy shard's job; if Trivy didn't
  run, A06 is NOT RUN.
- **Known debt is not a finding.** Skip anything in the overlay's Known accepted debt.
- **Write-safety.** Exploit tests hit a safe local DB only; a shared/prod target → stop.

## Relationship to the other commands
- `/feature-review [--only scale]` — review ONE feature branch's **diff** (dimension 3 is the
  same `scale-security-reviewer`); use before a PR. Read-only, routes fixes out.
- `/security-audit [scope]` — audit the **whole app** across all ten OWASP categories, then fix
  the approved findings (**this**). Same finder, module scope + a fixer + a gate.
- `/growmax-skills:github-repo-analyzer <url>` — the "should we adopt this **third-party** repo"
  verdict (license + Trivy on a remote repo). `/security-audit` reuses its Trivy machinery
  pointed at our own tree.

## Model
Run the orchestrator on the session model — it does the high-stakes verification (reading cited
code, refuter dispatches) itself. `scale-security-reviewer` and `security-fixer` both ship
`opus` in their frontmatter: finding real access-control/tenant flaws and fixing them without
breaking auth is exactly where model quality pays off, and a missed or mis-fixed security issue
is the most expensive kind. The Trivy shard is deterministic (a script), model-independent.
