---
name: github-repo-analyzer
description: >-
  Analyze any GitHub repository end-to-end: what it is, the problem it solves, why it's
  used, what's happening with it now, and what Growmax would gain by adopting it — plus a
  two-part "is it safe to use?" verdict: (1) LICENSE (is it open source, what license, can
  a commercial closed-source B2B SaaS like Growmax use it) and (2) SECURITY from a Trivy
  scan (known CVEs in dependencies, hardcoded secrets, IaC misconfigs). Use whenever the
  user shares a GitHub URL or asks about a repo, library, tool, package, or dependency.
  Trigger on "what is this repo", "should we use/adopt Y", "can we use this at Growmax",
  "is this safe to use", "is it secure", "scan this repo", "any CVEs / vulnerabilities",
  "run a trivy scan", "is this open source", or "what license does X have" — even without
  the words "analyze", "license", or "security". Prefer this over answering from memory:
  repos change, and license terms and vulnerabilities must be read from the actual repo.
---

# GitHub Repo Analyzer

Turn a GitHub URL (or `owner/repo`) into a **short, scannable briefing**: what it is →
problem → why used → what's happening now → benefit for Growmax, plus a two-part
**"is it safe to use?"** verdict (a **license** axis and a **security**/Trivy axis) and,
when web search is available, a **"what people say"** section of real-world reviews.

Growmax is a commercial, closed-source B2B SaaS company. Both verdicts are framed for that:
can we use it in a product we sell, what do we owe in return, and does it carry risk we'd
be importing.

**Format for readability.** The reader is a busy engineer skimming on a screen. Lead with a
snapshot table, use short bullet points (not paragraphs) under each heading, put findings in
tables, and end with one clear verdict line. Follow the output template below closely.

## Workflow

1. **Resolve the target.** Accept a full URL, `owner/repo`, or a `git clone` URL. If the user
   named a tool without a link (e.g. "should we use Tyk"), find the canonical repo first
   (web search if available; otherwise ask).

2. **Gather the facts — run the script** (source of truth for the license):

   ```bash
   python3 scripts/fetch_repo.py <url-or-owner/repo>
   ```

   Returns metadata (stars, language, activity, archived status), the README text, the
   LICENSE text, and a detected license with category + a one-line Growmax verdict. It is
   **robust to GitHub API rate limits**: it falls back to raw file fetches and detects the
   license from the LICENSE *text*, so the verdict works even when the API is throttled. Use
   `--json` for the full README. Do not guess the license from memory — read the actual file.

3. **Turn the license into a verdict.** Read `references/licenses.md` to explain *why* the
   verdict holds, list obligations, and flag caveats (transitive dependencies,
   source-available ≠ open source, "no license" = all rights reserved). The script's category
   maps directly to the reference's table.

4. **Run the security scan (Trivy)** (source of truth for the security axis):

   ```bash
   python3 scripts/security_scan.py <url-or-owner/repo>
   ```

   Runs `trivy repo` (vuln + secret + misconfig) and prints severity-bucketed counts, top
   findings, and a one-line verdict. Trivy is detection-only — it reports known issues, it
   does not exploit anything. Behavior:
   - **Needs `trivy` on PATH + network for its vuln DB.** If Trivy is missing the script exits
     3 with an install hint — mark the security axis unavailable and continue with the
     license-only assessment rather than failing the briefing.
   - To use a report your CI already produces (no Trivy/network needed):
     `python3 scripts/security_scan.py --parse <report.json>`.
   - Read `references/security.md` for thresholds and caveats to surface (a library's lockfile
     findings may not transfer to us; secret hits are often false positives; a clean scan is
     necessary, not sufficient).

5. **Understand the project.** From the README, write the what/problem/why/benefit bullets in
   your own words. If the README is thin or marketing-heavy, say so and lean on metadata and
   file structure. Keep claims grounded — if it over-claims (e.g. inflated benchmarks), note
   that rather than repeating it.

6. **Check the pulse ("what's happening now").** Use `last_push`, version/release signals,
   stars, open issues, and `archived` to judge whether it's actively maintained, booming,
   stagnant, or abandoned. Archived or long-stale is a material risk — call it out.

7. **Gather external reviews (if web search is available).** The README is the project's own
   pitch — balance it with outside voices.
   - Search queries: `<repo> review`, `<repo> vs <alternative>`, `<repo> problems`,
     `<repo> reddit`, `<repo> hacker news`.
   - Good sources: Hacker News, Reddit, dev blogs, comparison posts, and the repo's own GitHub
     Issues/Discussions for recurring complaints. Capture both praise and criticism; link sources.
   - **If no web search tool is available, skip gracefully**: write "External reviews: not
     checked (web search unavailable)" in that section. **Never invent reviews or quotes.**

8. **Write the briefing** using the template below.

## Output template

Produce these blocks in this order. Use a real Markdown table for the snapshot and the
severity table; keep section content as short bullets; end with one verdict line.

```
# `<owner/repo>`

> One-sentence plain-language description.

### Snapshot

| Field | Value |
|---|---|
| What it is | short phrase |
| Maker | author / org |
| Stars · Language | e.g. 114k · TypeScript |
| Latest version · Last commit | e.g. 1.58.4 · 3 days ago |
| Maintenance | Active / Slowing / Stale / Archived |
| License | SPDX (open source? yes / no / source-available) |
| Security (Trivy) | ✅ / ⚠️ / ❌ — short |
| **Overall — safe to use?** | **✅ / ⚠️ / ❌ + the action** |

### What it is
- bullet
- bullet

### Problem it solves
- bullet

### Why it's used / what's happening now
- Adoption: …
- Momentum & maintenance: …
- Caveat on claims (if any): …

### What Growmax would gain
- Benefit: tie to what we do (Claude Code workflow, Next.js app, reliability/test-coverage) where relevant
- Watch-outs: …

### Is it safe to use?

**Security — Trivy:** ✅ / ⚠️ / ❌ — one line.

| Severity | CVEs | Misconfigs |
|---|--:|--:|
| Critical | 0 | 0 |
| High | 0 | 0 |
| Medium | 0 | 0 |
| Low | 0 | 0 |

- Secrets: N (note: often test/example keys — verify before treating as a real leak)
- Top findings:
  - `[HIGH]` CVE-XXXX-NNNN — `pkg` x.y.z → fix a.b.c
- If not run: "Security: not run (Trivy unavailable)" + how to run it.

**License:** SPDX + name — open source? yes / no / source-available.

| Field | Value |
|---|---|
| Verdict (Growmax) | ✅ safe / ⚠️ use with care / ❌ avoid |
| Obligations | attribution / NOTICE / share changes…, or "none" |
| Caveats | transitive deps; copyleft/network-copyleft; anything non-standard |

### What people say (external)
- Pros: … (with source)
- Cons: … (with source)
- Sources: links
- If not checked: "External reviews: not checked (web search unavailable)."

### Overall verdict
> ✅ / ⚠️ / ❌ — the bottom line + recommended action. Take the **more cautious** of the
> license and security axes.
```

**Adapt depth to the ask.** "Can we use this?" → lead with the Snapshot + the safety block.
"Is it secure / any CVEs?" → lead with the Security line + severity table. "What is this?" →
the safety block can be one or two lines. Run the security scan whenever the question touches
safety, security, or adoption; you can skip it for a pure "what is this project" explainer.

## License verdict quick-reference (detail in references/licenses.md)

- **Permissive** (MIT, BSD, Apache-2.0, ISC) → ✅ safe; keep the notice. Apache-2.0 adds a patent grant + NOTICE/state-changes.
- **Public domain** (Unlicense, CC0) → ✅ safe; no obligations.
- **Weak copyleft** (LGPL, MPL-2.0, EPL) → ⚠️ keep it a separate library; share changes to *its* files only.
- **Strong copyleft** (GPL-2.0/3.0) → ❌ in product code; can force releasing Growmax's source. OK for separate internal tools we don't distribute.
- **Network copyleft** (AGPL-3.0) → ❌ for SaaS; network use can trigger source disclosure.
- **Source-available** (BSL/BUSL, SSPL, Elastic, Commons Clause, "non-commercial") → ⚠️/❌ NOT open source; read the terms; often bans commercial/competing use.
- **No license** → ❌ all rights reserved by default; no legal right to use. Ask the author or avoid.
- **Custom/unknown** → ⚠️ route to human/legal review.

## Security verdict quick-reference (detail in references/security.md)

- **❌ Not safe as-is** — any CRITICAL CVE, a secret at HIGH/CRITICAL severity, or a CRITICAL misconfig.
- **⚠️ Use with caution** — any HIGH CVE, any secret finding, a HIGH misconfig, or ≥10 MEDIUM CVEs.
- **✅ No blocking findings** — only LOW/MEDIUM below threshold and zero secrets.
- Thresholds are intentionally conservative for code we ship; the script holds the exact logic.

## Judgment notes

- **Read, don't recall.** Always derive the license from the fetched LICENSE text. Recalled licenses are often wrong or stale, and projects relicense.
- **Open source ≠ usable in our product.** State the category, not just the SPDX id — a GPL repo is open source but unsafe to embed in Growmax.
- **Don't oversell.** If a README makes big productivity or benchmark claims, attribute them to the project ("the author reports…") rather than asserting them as fact.
- **Surface risk plainly.** Archived, single-maintainer, no license, tiny community, or heavy unvetted dependencies are each worth a line.
- **Security: don't overstate the scan.** A repo's lockfile findings reflect *its* pinned deps and may not transfer once we install the published package — frame them as "the project currently ships these," and note the real test is scanning our own project after adding it.
- **Secret hits are often false positives** (test fixtures, example keys). Flag them, but say they need verification before being treated as a real leak.
- **A clean scan is necessary, not sufficient.** Trivy finds *known* CVEs, *detectable* secrets, and *known* misconfig rules — not logic bugs or supply-chain compromise. Say "no known blocking findings," not "secure."
- **Never fabricate reviews.** If web search isn't available, say external sentiment wasn't checked rather than inventing quotes or sources.
- **Not legal advice.** For shipping copyleft/source-available code in the product, recommend confirming with whoever owns OSS compliance at Growmax.
