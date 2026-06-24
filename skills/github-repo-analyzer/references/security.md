# Security reference — Trivy scan & the "safe to use" verdict

`scripts/security_scan.py` runs Trivy and prints a one-line verdict. This doc explains what
the scan covers, how the verdict is decided, and the caveats to mention so the result is
honest rather than alarmist.

## What the scan covers

`trivy repo <url>` (or `trivy fs <path>`) with `--scanners vuln,secret,misconfig` reports:

- **Vulnerabilities (vuln)** — known CVEs in the project's dependencies, read from lockfiles
  (`package-lock.json`, `yarn.lock`, `go.sum`, `poetry.lock`, `requirements.txt`, etc.) and
  OS packages. Bucketed CRITICAL / HIGH / MEDIUM / LOW / UNKNOWN.
- **Secrets** — hardcoded credentials (API keys, tokens, private keys) found in the code.
- **Misconfigurations (misconfig)** — insecure infrastructure-as-code (Dockerfile, Kubernetes,
  Terraform). Only findings with `Status: FAIL` are counted; PASS/EXCEPTION are ignored.

Trivy can also report licenses (`--scanners license`), but this skill uses
`scripts/fetch_repo.py` for licensing, so the two stay separate and don't double-count.

## Verdict thresholds (as implemented)

- **❌ Not safe as-is** — any CRITICAL vulnerability, OR a secret at HIGH/CRITICAL severity,
  OR a CRITICAL misconfiguration. These are real blockers: remediate, upgrade, or isolate.
- **⚠️ Usable with caution** — any HIGH vulnerability, OR any secret finding (lower severity),
  OR a HIGH misconfiguration, OR ≥10 MEDIUM vulnerabilities. Review and plan upgrades.
- **✅ No blocking findings** — only LOW/MEDIUM items below the threshold and zero secrets.

These thresholds are deliberately conservative for a *product we ship*. Loosen or tighten in
the script if a team's risk appetite differs.

## Caveats to always surface

1. **A library's lockfile ≠ what you inherit.** Trivy on a repo scans *that project's* pinned
   dependencies. When you install the published package, your own resolver may pull different
   (often newer, patched) versions, and dev-only deps usually don't ship. The truest test is
   to add the dependency to *our* project and scan *that*. Frame repo findings as "the project
   currently ships these known issues," not "we will inherit all of these."
2. **Secret findings are frequently false positives.** Test fixtures, example configs, and
   rotated/dummy keys trip the secret scanner constantly. Treat a secret hit as "investigate,"
   and only escalate to ❌ once it looks like a live credential. (The verdict still flags
   HIGH/CRITICAL secrets as blockers so they aren't ignored — but say this out loud.)
3. **Severity is advisory and DB-dependent.** Counts reflect Trivy's DB at scan time and the
   upstream advisory severities; they shift as the DB updates. A scan is a snapshot.
4. **No findings ≠ secure.** Trivy catches *known* CVEs, *detectable* secrets, and *known*
   misconfig rules. A clean scan is necessary, not sufficient — it says nothing about logic
   bugs, supply-chain compromise of a maintainer account, or undisclosed vulnerabilities.
5. **Not a substitute for the team's pipeline.** This is a fast adoption-time gut check. The
   authoritative scan is whatever runs in CI against our own codebase.

## Combining with the license verdict

The overall "safe to use" answer takes the **more cautious** of the two axes:

- License ✅ + Security ✅ → safe to adopt.
- License ✅ + Security ⚠️/❌ → legally fine, but flag the security work needed first.
- License ❌ + Security ✅ → still a no on legal grounds.

Always present them as two distinct axes so the reader sees *why* — "MIT, but ships a CRITICAL
CVE" is a very different action plan from "AGPL with a clean scan."
