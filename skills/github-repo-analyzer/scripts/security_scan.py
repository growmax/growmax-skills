#!/usr/bin/env python3
"""Security scan of a GitHub repo with Trivy, summarized into a safe-to-use verdict.

Runs Aqua Security's Trivy (a defensive scanner) against a repo and turns its JSON into
severity-bucketed counts plus a verdict. Trivy is DETECTION-ONLY: it reports known CVEs in
dependencies, hardcoded secrets, and infrastructure-as-code misconfigurations. It does not
exploit anything.

Requires `trivy` on PATH and network access to its vulnerability DB. If Trivy is missing,
this prints install guidance and exits 3 so the caller can fall back to a license-only
assessment. It can also parse an existing Trivy JSON report (e.g. one your CI already
produces) with --parse, which needs neither Trivy nor network.

Usage:
    python3 security_scan.py <github-url-or-owner/repo>      # scan the remote repo
    python3 security_scan.py --path /local/checkout          # scan a local directory
    python3 security_scan.py <target> --json                 # machine-readable summary
    python3 security_scan.py --parse trivy_report.json       # parse an existing report (offline)
    python3 security_scan.py --selftest                      # offline parser/verdict test
"""
import sys, json, shutil, subprocess

SEV_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]

INSTALL_HINT = (
    "Trivy is not installed. Install it, then re-run:\n"
    "  macOS:   brew install trivy\n"
    "  Linux:   see https://trivy.dev/latest/getting-started/installation/\n"
    "  Docker:  docker run --rm aquasec/trivy repo <url>\n"
    "Or, if your CI already produces a Trivy JSON report, run with: --parse <report.json>"
)


def run_trivy(target, is_path, timeout=600):
    """Run trivy and return (parsed_json, error_string)."""
    if shutil.which("trivy") is None:
        return None, "trivy-not-installed"
    sub = "fs" if is_path else "repo"
    cmd = ["trivy", sub, "--format", "json", "--quiet",
           "--scanners", "vuln,secret,misconfig", target]
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return None, f"trivy timed out after {timeout}s (large repo? try --severity HIGH,CRITICAL)"
    if not p.stdout.strip():
        # Common causes: DB download blocked, network offline, bad target.
        return None, f"trivy produced no output (rc={p.returncode}). stderr: {p.stderr.strip()[:400]}"
    try:
        return json.loads(p.stdout), None
    except json.JSONDecodeError as e:
        return None, f"could not parse trivy JSON ({e}). stderr: {p.stderr.strip()[:300]}"


def summarize(data):
    vuln = {s: 0 for s in SEV_ORDER}
    misconfig = {s: 0 for s in SEV_ORDER}
    secrets, top_vulns, misconfig_items = [], [], []
    for r in (data.get("Results") or []):
        target = r.get("Target")
        for v in (r.get("Vulnerabilities") or []):
            sev = (v.get("Severity") or "UNKNOWN").upper()
            vuln[sev] = vuln.get(sev, 0) + 1
            if sev in ("CRITICAL", "HIGH"):
                top_vulns.append({
                    "id": v.get("VulnerabilityID"), "pkg": v.get("PkgName"),
                    "installed": v.get("InstalledVersion"), "fixed": v.get("FixedVersion") or "—",
                    "severity": sev, "target": target,
                })
        for s in (r.get("Secrets") or []):
            secrets.append({
                "rule": s.get("RuleID"), "title": s.get("Title"),
                "severity": (s.get("Severity") or "UNKNOWN").upper(),
                "target": target, "line": s.get("StartLine"),
            })
        for m in (r.get("Misconfigurations") or []):
            if (m.get("Status") or "").upper() != "FAIL":
                continue  # PASS/EXCEPTION are not findings
            sev = (m.get("Severity") or "UNKNOWN").upper()
            misconfig[sev] = misconfig.get(sev, 0) + 1
            misconfig_items.append({"id": m.get("ID"), "title": m.get("Title"),
                                    "severity": sev, "target": target})
    # CRITICAL/HIGH first
    rank = {s: i for i, s in enumerate(SEV_ORDER)}
    top_vulns.sort(key=lambda x: rank.get(x["severity"], 99))
    return {
        "artifact": data.get("ArtifactName"),
        "vuln": vuln, "misconfig": misconfig, "secrets": secrets,
        "top_vulns": top_vulns[:8], "misconfig_items": misconfig_items[:8],
    }


def verdict(s):
    """Return (symbol, sentence). See references/security.md for thresholds + rationale."""
    v, m, secs = s["vuln"], s["misconfig"], s["secrets"]
    hi_secret = any(x["severity"] in ("CRITICAL", "HIGH") for x in secs)
    blockers = []
    if v.get("CRITICAL"):
        blockers.append(f"{v['CRITICAL']} CRITICAL vuln(s)")
    if hi_secret:
        blockers.append("hardcoded secret(s) at HIGH/CRITICAL severity")
    if m.get("CRITICAL"):
        blockers.append(f"{m['CRITICAL']} CRITICAL misconfig(s)")
    if blockers:
        return "❌", ("Not safe to adopt as-is — " + "; ".join(blockers) +
                      ". Remediate, upgrade, or isolate before use.")
    warn = []
    if v.get("HIGH"):
        warn.append(f"{v['HIGH']} HIGH vuln(s)")
    if secs:
        warn.append(f"{len(secs)} secret finding(s) (frequently test/example keys — verify)")
    if m.get("HIGH"):
        warn.append(f"{m['HIGH']} HIGH misconfig(s)")
    if v.get("MEDIUM", 0) >= 10:
        warn.append(f"{v['MEDIUM']} MEDIUM vulns")
    if warn:
        return "⚠️", "Usable with caution — " + "; ".join(warn) + ". Review and plan upgrades."
    total = sum(v.values()) + sum(m.values())
    return "✅", f"No blocking security findings ({total} low/medium item(s), 0 secrets)."


def human(s):
    sym, sentence = verdict(s)
    out = [f"SECURITY SCAN (Trivy) — {s.get('artifact') or 'target'}", ""]
    v, m = s["vuln"], s["misconfig"]
    out.append("  Vulnerabilities: " + "  ".join(f"{k}={v[k]}" for k in SEV_ORDER if v[k]) or "  Vulnerabilities: none")
    out.append("  Misconfigs (FAIL): " + ("  ".join(f"{k}={m[k]}" for k in SEV_ORDER if m[k]) or "none"))
    out.append(f"  Secrets: {len(s['secrets'])}")
    if s["top_vulns"]:
        out.append("\n  Top vulns:")
        for x in s["top_vulns"]:
            out.append(f"    [{x['severity']}] {x['id']}  {x['pkg']} {x['installed']} -> fix {x['fixed']}  ({x['target']})")
    if s["secrets"]:
        out.append("\n  Secret findings:")
        for x in s["secrets"][:8]:
            out.append(f"    [{x['severity']}] {x['title']}  ({x['target']}:{x['line']})")
    if s["misconfig_items"]:
        out.append("\n  Misconfigs:")
        for x in s["misconfig_items"]:
            out.append(f"    [{x['severity']}] {x['id']} {x['title']}  ({x['target']})")
    out.append(f"\n  SECURITY VERDICT: {sym} {sentence}")
    return "\n".join(out)


def selftest():
    sample = {
        "SchemaVersion": 2, "ArtifactName": "github.com/example/widget",
        "Results": [
            {"Target": "package-lock.json", "Class": "lang-pkgs", "Type": "npm",
             "Vulnerabilities": [
                 {"VulnerabilityID": "CVE-2024-0001", "PkgName": "lodash", "InstalledVersion": "4.17.4", "FixedVersion": "4.17.21", "Severity": "CRITICAL", "Title": "Prototype pollution"},
                 {"VulnerabilityID": "CVE-2023-0002", "PkgName": "axios", "InstalledVersion": "0.21.0", "FixedVersion": "0.21.2", "Severity": "HIGH", "Title": "SSRF"},
                 {"VulnerabilityID": "CVE-2022-0003", "PkgName": "minimist", "InstalledVersion": "1.2.0", "FixedVersion": "1.2.6", "Severity": "MEDIUM", "Title": "Prototype pollution"},
             ]},
            {"Target": "config/app.env", "Class": "secret",
             "Secrets": [{"RuleID": "aws-access-key-id", "Severity": "CRITICAL", "Title": "AWS Access Key ID", "StartLine": 12}]},
            {"Target": "Dockerfile", "Class": "config", "Type": "dockerfile",
             "Misconfigurations": [
                 {"ID": "DS002", "Severity": "HIGH", "Title": "root user", "Status": "FAIL"},
                 {"ID": "DS026", "Severity": "LOW", "Title": "no HEALTHCHECK", "Status": "FAIL"},
                 {"ID": "DS001", "Severity": "HIGH", "Title": "passed check", "Status": "PASS"},
             ]},
            {"Target": "clean.json", "Class": "lang-pkgs", "Type": "npm"},  # no findings keys
        ],
    }
    s = summarize(sample)
    checks = [
        ("vuln CRITICAL==1", s["vuln"]["CRITICAL"] == 1),
        ("vuln HIGH==1", s["vuln"]["HIGH"] == 1),
        ("vuln MEDIUM==1", s["vuln"]["MEDIUM"] == 1),
        ("secrets==1", len(s["secrets"]) == 1),
        ("misconfig HIGH==1 (PASS excluded)", s["misconfig"]["HIGH"] == 1),
        ("misconfig LOW==1", s["misconfig"]["LOW"] == 1),
        ("verdict is ❌", verdict(s)[0] == "❌"),
    ]
    ok = True
    for name, passed in checks:
        ok = ok and passed
        print(f"  [{'PASS' if passed else 'FAIL'}] {name}")
    # A clean repo should be ✅
    clean = summarize({"Results": [{"Target": "x", "Vulnerabilities": [
        {"VulnerabilityID": "CVE-x", "PkgName": "p", "Severity": "LOW"}]}]})
    cok = verdict(clean)[0] == "✅"
    ok = ok and cok
    print(f"  [{'PASS' if cok else 'FAIL'}] clean repo -> ✅")
    print("\nSELFTEST:", "ALL PASSED" if ok else "FAILURES PRESENT")
    return 0 if ok else 1


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__); sys.exit(0)
    if args[0] == "--selftest":
        sys.exit(selftest())
    as_json = "--json" in args

    data = err = None
    if args[0] == "--parse":
        with open(args[1]) as f:
            data = json.load(f)
    else:
        is_path = args[0] == "--path"
        target = args[1] if is_path else args[0]
        data, err = run_trivy(target, is_path)

    if err == "trivy-not-installed":
        print(INSTALL_HINT, file=sys.stderr)
        sys.exit(3)
    if err:
        print(f"security scan unavailable: {err}", file=sys.stderr)
        sys.exit(2)

    s = summarize(data)
    if as_json:
        sym, sentence = verdict(s)
        print(json.dumps({**s, "verdict_symbol": sym, "verdict": sentence}, indent=2))
    else:
        print(human(s))
