# Security Audit — <app>  ·  scope: <whole repo | packages/api | …>  ·  <date>

> Canonical format for the ledger `/security-audit` writes to `docs/security-audit.md`.
> **Approve** by ticking `Fix?` on the findings to fix now, waving off false positives / known
> debt, and confirming the fix-test DB target below. The fix batch touches **only ticked rows**.
> Confidence: **HIGH** = orchestrator re-read the code and confirmed (or corroborated across
> shards). **MEDIUM** = citation confirmed, magnitude/scope estimated. **LOW** = reviewer's read
> alone — a LOW-confidence BLOCKER is demoted to WARN (never gates as a blocker).

**Fix-test DB target:** _<unconfirmed — set at approval>_ — exploit tests write here · **NEVER**
a shared / UAT / prod DB.

---

## OWASP Top 10 coverage  (RUN state assembled from every shard's `coverage[]`)
| OWASP 2021 | Ran? | Source | Findings |
|---|---|---|---|
| A01 Broken Access Control | ✅ / NOT RUN | finder (authz + tenant scoping) | <n> |
| A02 Cryptographic Failures | ✅ / NOT RUN | finder (secrets/leakage) | <n> |
| A03 Injection | ✅ / NOT RUN | finder | <n> |
| A04 Insecure Design | ✅ / NOT RUN | finder (validation, mass assignment) | <n> |
| A05 Security Misconfiguration | ✅ / NOT RUN | finder (uploads) + Trivy (IaC) | <n> |
| A06 Vulnerable Components | ✅ / NOT RUN — trivy <ok\|unavailable> | Trivy (lockfiles) | <n> |
| A07 Auth Failures | ✅ / NOT RUN | finder (rate/attempt limits) | <n> |
| A08 Data Integrity | ✅ / NOT RUN | finder + Trivy (build/CI) | <n> |
| A09 Logging Failures | ✅ / NOT RUN | finder (security-event logging) | <n> |
| A10 SSRF | ✅ / NOT RUN | finder (server-side fetch) | <n> |

> A NOT-RUN row is a hole, not a pass — either dispatch a shard for it or accept the gap on the record.

---

## Findings   (most severe first · tick `Fix?` to authorize a fix)
| Fix? | ID | Sev | OWASP | Conf | File:line | Finding | Attacker story | Suggested fix |
|------|----|-----|-------|------|-----------|---------|----------------|---------------|
| [ ]  | SEC-01 | BLOCKER | A01 | HIGH | `path:line` | <one line> | <how an attacker abuses it, concrete> | <the where-clause / decorator / allowlist to add> |
| [ ]  | SEC-02 | BLOCKER | A10 | MEDIUM | `path:line` | <one line> | <…> | <…> |
| [ ]  | SEC-03 | WARN | A09 | LOW | `path:line` | <one line> | <…> | <…> |

## Trivy — dependency / secret / misconfig  (A06 / A05 / secrets)
> Verdict + thresholds from `github-repo-analyzer/references/security.md`. Surface the caveats:
> a library's lockfile ≠ what we inherit; secret hits are often false positives (investigate
> before escalating); severity is DB-dependent; no findings ≠ secure.
- **Verdict:** ❌ Not safe as-is / ⚠️ Usable with caution / ✅ No blocking findings — <one line>
- **Vulns:** CRITICAL <n> · HIGH <n> · MEDIUM <n> (top: `<pkg@ver → CVE → fixed-in>`)
- **Secrets:** <n> (each: `path` — investigate, likely fixture/rotated? — rotation needed if live)
- **Misconfig (FAIL only):** <n> (`file` — rule)

---

### Overrides / known debt  (waved off at the gate)
- <ID>: <why — false positive / accepted debt / out of scope> → _offer to append to
  `.claude/REVIEW-NOTES.md` Known accepted debt so future audits skip it_

### Fix-batch outcome  (filled during FIXING; blank at approval)
| ID | Status | Exploit test | Re-verified | Note |
|----|--------|--------------|-------------|------|
| SEC-01 | fixed / already-fixed / stuck / deferred | `path` | ✅ / — | <rotation note / why stuck / …> |

### Rotation notes  (secret findings — the HUMAN must rotate; the fixer cannot)
- <ID>: <what was exposed, where> — rotate the credential; removing it from source does not un-expose it.

### New findings surfaced during fixing  (un-ticked — go through the next gate)
- <SEC-nn>: <one line> — <file:line> — reported by security-fixer, not auto-fixed.
