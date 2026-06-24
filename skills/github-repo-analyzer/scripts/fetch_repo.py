#!/usr/bin/env python3
"""Gather the facts needed to analyze a GitHub repository.

Collects: repo metadata (stars, language, activity, archived status), the README
text, the LICENSE text, and a detected license (SPDX id + category + a quick
Growmax-compatibility verdict).

Why this script exists / the gotcha it handles: the unauthenticated GitHub API is
rate-limited per IP and frequently returns HTTP 403 "rate limit exceeded" on shared
infrastructure. So the script treats the API as best-effort enrichment only, and it
ALWAYS detects the license from the actual LICENSE *text* fetched over
raw.githubusercontent.com (which is not subject to the same limit). That means the
license verdict still works when the API is throttled, and even when GitHub never
auto-detected the license in the first place.

Usage:
    python3 fetch_repo.py <github-url-or-owner/repo>      # human-readable summary
    python3 fetch_repo.py <github-url-or-owner/repo> --json
    python3 fetch_repo.py --selftest                      # offline license-detector test
"""
import sys, re, json, urllib.request, urllib.error

UA = {"User-Agent": "github-repo-analyzer"}

# --- License detection -------------------------------------------------------
# Single distinctive signature per license, ordered MOST-SPECIFIC FIRST so the
# GNU family and BSD-3 are matched before their more generic cousins.
LICENSE_SIGNATURES = [
    ("AGPL-3.0",     "GNU Affero General Public License v3.0",   r"GNU AFFERO GENERAL PUBLIC LICENSE"),
    ("GPL-3.0",      "GNU General Public License v3.0",          r"GNU GENERAL PUBLIC LICENSE[\s\S]{0,60}Version\s*3"),
    ("GPL-2.0",      "GNU General Public License v2.0",          r"GNU GENERAL PUBLIC LICENSE[\s\S]{0,60}Version\s*2"),
    ("LGPL-3.0",     "GNU Lesser General Public License v3.0",   r"GNU LESSER GENERAL PUBLIC LICENSE[\s\S]{0,60}Version\s*3"),
    ("LGPL-2.1",     "GNU Lesser General Public License v2.1",   r"GNU (LESSER|LIBRARY) GENERAL PUBLIC LICENSE"),
    ("MPL-2.0",      "Mozilla Public License 2.0",               r"Mozilla Public License Version 2\.0"),
    ("EPL-2.0",      "Eclipse Public License 2.0",               r"Eclipse Public License"),
    ("Apache-2.0",   "Apache License 2.0",                       r"Apache License[\s\S]{0,40}Version 2\.0"),
    ("BSL-1.1",      "Business Source License 1.1",              r"Business Source License"),
    ("SSPL-1.0",     "Server Side Public License v1",            r"Server Side Public License"),
    ("Elastic-2.0",  "Elastic License 2.0",                      r"Elastic License 2\.0"),
    ("BSD-3-Clause", "BSD 3-Clause License",                     r"Neither the name of[\s\S]{0,80}endorse or promote"),
    ("BSD-2-Clause", "BSD 2-Clause License",                     r"Redistribution and use in source and binary forms"),
    ("ISC",          "ISC License",                              r"Permission to use, copy, modify, and/or distribute this software"),
    ("Unlicense",    "The Unlicense (public domain)",            r"free and unencumbered software released into the public domain"),
    ("MIT",          "MIT License",                              r"Permission is hereby granted, free of charge, to any person obtaining a copy"),
]

CATEGORY = {
    "MIT": "permissive", "BSD-2-Clause": "permissive", "BSD-3-Clause": "permissive",
    "Apache-2.0": "permissive", "ISC": "permissive", "0BSD": "permissive",
    "Unlicense": "public-domain",
    "LGPL-2.1": "weak-copyleft", "LGPL-3.0": "weak-copyleft", "MPL-2.0": "weak-copyleft", "EPL-2.0": "weak-copyleft",
    "GPL-2.0": "strong-copyleft", "GPL-3.0": "strong-copyleft",
    "AGPL-3.0": "network-copyleft",
    "BSL-1.1": "source-available", "SSPL-1.0": "source-available", "Elastic-2.0": "source-available",
}

VERDICT = {
    "permissive":     "SAFE for Growmax (commercial, closed-source SaaS). Use, modify, and ship it. Obligation: keep the copyright + license notice in any copies/substantial portions you redistribute. (Apache-2.0 adds an explicit patent grant and a NOTICE / state-changes requirement.)",
    "public-domain":  "SAFE for Growmax. Effectively no obligations.",
    "weak-copyleft":  "USABLE WITH CARE. Keep the component as a separate library; changes to ITS files must be shared, but your own proprietary code stays closed. Dynamic linking is generally fine; copying its source into your files is not.",
    "strong-copyleft":"AVOID in the proprietary product. Linking GPL code into Growmax can force releasing Growmax's source under the GPL. Acceptable only for a separate internal tool you do not distribute.",
    "network-copyleft":"HIGH RISK for SaaS. AGPL's network clause can require publishing the source of a service that merely uses it over a network. Avoid in the Growmax product.",
    "source-available":"NOT open source. These licenses typically restrict commercial or competing use. Read the specific terms before ANY use at Growmax.",
    "none":           "NOT open source. No license = 'all rights reserved' by default; you have no legal right to use, copy, or modify it. Ask the author for terms, or do not use it.",
    "unknown":        "Could not classify automatically. Treat as needing human / legal review before use at Growmax.",
}


def detect_license(text):
    """Return dict: {spdx, name, category, overlays, verdict, method}."""
    if not text or not text.strip():
        return {"spdx": None, "name": None, "category": "none", "overlays": [],
                "verdict": VERDICT["none"], "method": "no-license-file"}
    overlays = []
    if re.search(r"Commons Clause", text, re.I):
        overlays.append("Commons-Clause (adds a no-Sell restriction on top of the base license -> NOT open source)")
    if re.search(r"\bnon-?commercial\b", text, re.I):
        overlays.append("contains 'non-commercial' language -> read carefully, likely NOT usable commercially")
    for spdx, name, sig in LICENSE_SIGNATURES:
        if re.search(sig, text, re.I):
            cat = CATEGORY.get(spdx, "unknown")
            # Commons Clause downgrades a permissive base to source-available.
            if overlays and cat in ("permissive", "public-domain"):
                cat = "source-available"
            return {"spdx": spdx, "name": name, "category": cat, "overlays": overlays,
                    "verdict": VERDICT[cat], "method": "text-signature"}
    cat = "source-available" if overlays else "unknown"
    return {"spdx": None, "name": "Unrecognized custom license", "category": cat,
            "overlays": overlays, "verdict": VERDICT[cat], "method": "unmatched"}


# --- Fetching ----------------------------------------------------------------
def parse_repo(s):
    s = re.sub(r"\.git$", "", s.strip().rstrip("/"))
    m = re.search(r"github\.com[:/]+([^/]+)/([^/#?]+)", s)
    if m:
        return m.group(1), m.group(2)
    m = re.match(r"^([^/\s]+)/([^/\s]+)$", s)
    if m:
        return m.group(1), m.group(2)
    raise ValueError(f"Could not parse 'owner/repo' from: {s!r}")


def _get(url, as_json=False, timeout=20):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
            data = r.read().decode("utf-8", "replace")
            return json.loads(data) if as_json else data
    except urllib.error.HTTPError as e:
        if as_json:
            try:
                return {"__error__": e.code, "__body__": json.loads(e.read().decode("utf-8", "replace"))}
            except Exception:
                return {"__error__": e.code}
        return None
    except Exception as e:
        return {"__error__": str(e)} if as_json else None


def api_metadata(owner, repo):
    d = _get(f"https://api.github.com/repos/{owner}/{repo}", as_json=True)
    if isinstance(d, dict) and "__error__" not in d:
        return d, None
    note = "github API unavailable (likely rate-limited); using raw files only"
    if isinstance(d, dict) and d.get("__error__") == 404:
        note = "repo not found via API (private, renamed, or does not exist)"
    return None, note


def fetch_raw(owner, repo, branch, names):
    for name in names:
        txt = _get(f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{name}")
        if txt:
            return name, txt
    return None, None


def gather(spec):
    owner, repo = parse_repo(spec)
    meta, meta_note = api_metadata(owner, repo)

    branch = (meta or {}).get("default_branch")
    branches = [branch] if branch else []
    branches += [b for b in ("main", "master") if b not in branches]

    readme_file = readme = lic_file = lic_text = None
    branch_used = None
    for b in branches:
        if readme is None:
            readme_file, readme = fetch_raw(owner, repo, b, ["README.md", "README.rst", "README.txt", "readme.md", "Readme.md"])
        if lic_text is None:
            lic_file, lic_text = fetch_raw(owner, repo, b, ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "LICENCE.md", "COPYING", "COPYING.md"])
        if (readme or lic_text) and branch_used is None:
            branch_used = b
        if readme and lic_text:
            break

    lic = detect_license(lic_text)
    # If GitHub auto-detected a license but our text match disagreed/was empty, note both.
    api_lic = ((meta or {}).get("license") or {}).get("spdx_id")
    if api_lic in (None, "NOASSERTION"):
        api_lic = None

    return {
        "owner": owner, "repo": repo, "full_name": f"{owner}/{repo}",
        "url": f"https://github.com/{owner}/{repo}",
        "branch_used": branch_used, "api_note": meta_note,
        "metadata": None if not meta else {
            "description": meta.get("description"),
            "homepage": meta.get("homepage"),
            "language": meta.get("language"),
            "stars": meta.get("stargazers_count"),
            "forks": meta.get("forks_count"),
            "open_issues": meta.get("open_issues_count"),
            "watchers": meta.get("subscribers_count"),
            "archived": meta.get("archived"),
            "disabled": meta.get("disabled"),
            "created_at": meta.get("created_at"),
            "pushed_at": meta.get("pushed_at"),
            "topics": meta.get("topics"),
        },
        "license_api_spdx": api_lic,
        "license_detected": lic,
        "license_file": lic_file,
        "license_text_excerpt": (lic_text[:600] if lic_text else None),
        "readme_file": readme_file,
        "readme": readme,  # full text; caller decides how much to read
    }


def human(d):
    m = d.get("metadata") or {}
    L = d["license_detected"]
    out = []
    out.append(f"REPO: {d['full_name']}  ({d['url']})")
    if d.get("api_note"):
        out.append(f"  note: {d['api_note']}")
    if m:
        out.append(f"  {m.get('description') or '(no description)'}")
        out.append(f"  language={m.get('language')}  stars={m.get('stars')}  forks={m.get('forks')}  open_issues={m.get('open_issues')}")
        out.append(f"  created={m.get('created_at')}  last_push={m.get('pushed_at')}  archived={m.get('archived')}")
        if m.get("topics"):
            out.append(f"  topics: {', '.join(m['topics'])}")
    out.append("")
    out.append("LICENSE")
    out.append(f"  file: {d.get('license_file') or '(none found)'}")
    out.append(f"  detected SPDX: {L['spdx']}  ({L['name']})   [{L['method']}]")
    if d.get("license_api_spdx") and d["license_api_spdx"] != L["spdx"]:
        out.append(f"  (GitHub API reported: {d['license_api_spdx']} — reconcile if these differ)")
    out.append(f"  category: {L['category']}")
    if L["overlays"]:
        out.append("  overlays: " + "; ".join(L["overlays"]))
    out.append(f"  GROWMAX VERDICT: {L['verdict']}")
    out.append("")
    out.append(f"README: {d.get('readme_file') or '(none found)'}  ({len(d['readme']) if d.get('readme') else 0} chars fetched)")
    return "\n".join(out)


# --- Self-test ---------------------------------------------------------------
def selftest():
    cases = {
        "MIT": "MIT License\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software...",
        "Apache-2.0": "Apache License\nVersion 2.0, January 2004\nhttp://www.apache.org/licenses/",
        "GPL-3.0": "GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007",
        "AGPL-3.0": "GNU AFFERO GENERAL PUBLIC LICENSE\nVersion 3, 19 November 2007",
        "BSD-3-Clause": "Redistribution and use in source and binary forms... Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products...",
        "MPL-2.0": "Mozilla Public License Version 2.0\n==================================",
        "BSL-1.1": "Business Source License 1.1\n\nParameters\nLicensor: Example Inc.",
    }
    ok = True
    for expected, text in cases.items():
        got = detect_license(text)["spdx"]
        flag = "PASS" if got == expected else "FAIL"
        if got != expected:
            ok = False
        print(f"  [{flag}] expected={expected:14} got={got}")
    # Negative cases
    for label, text in {"empty->none": "", "garbage->unknown": "this file has no license text whatsoever just notes"}.items():
        got = detect_license(text)
        exp_cat = "none" if "none" in label else "unknown"
        flag = "PASS" if got["category"] == exp_cat else "FAIL"
        if got["category"] != exp_cat:
            ok = False
        print(f"  [{flag}] {label:18} -> category={got['category']}")
    # Overlay case
    cc = detect_license("MIT License\nPermission is hereby granted, free of charge...\n\nCommons Clause\nThe Software is provided to you...")
    flag = "PASS" if cc["category"] == "source-available" and cc["overlays"] else "FAIL"
    if cc["category"] != "source-available":
        ok = False
    print(f"  [{flag}] MIT+Commons-Clause -> category={cc['category']} (expected source-available)")
    print("\nSELFTEST:", "ALL PASSED" if ok else "FAILURES PRESENT")
    return 0 if ok else 1


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0)
    if args[0] == "--selftest":
        sys.exit(selftest())
    spec = args[0]
    as_json = "--json" in args[1:]
    data = gather(spec)
    if as_json:
        print(json.dumps(data, indent=2))
    else:
        print(human(data))
