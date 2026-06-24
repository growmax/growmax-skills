# License reference — categories, obligations & Growmax compatibility

This is the authoritative reasoning behind the license verdict. `scripts/fetch_repo.py`
prints a one-line verdict; use the detail here to explain *why* and to list obligations.

**Growmax's situation drives the verdict.** Growmax is a commercial, closed-source B2B
SaaS product. The key questions are therefore: (1) can we use it in a product we sell
without releasing our own source, (2) what must we do in return (attribution, notices),
and (3) does merely running it as a network service trigger obligations. A license that
is "open source" is **not** automatically safe to embed in a proprietary product — that
depends on the category below.

| Category | Examples (SPDX) | Use in the Growmax product? | Obligations / why |
|---|---|---|---|
| **Permissive** | MIT, BSD-2-Clause, BSD-3-Clause, Apache-2.0, ISC, 0BSD | ✅ Yes | Keep the copyright + license text in redistributed copies. Apache-2.0 also gives an explicit **patent grant** (good for us) and requires preserving a `NOTICE` file and stating significant changes. |
| **Public domain** | Unlicense, CC0 | ✅ Yes | Effectively none. |
| **Weak / file-level copyleft** | LGPL-2.1, LGPL-3.0, MPL-2.0, EPL-2.0 | ⚠️ With care | Keep it a **separate library**. Changes *to that library's own files* must be published, but our proprietary code stays closed. Dynamic linking is fine; copying its source into our files pulls the copyleft in. LGPL additionally wants users to be able to relink against a modified version. |
| **Strong copyleft** | GPL-2.0, GPL-3.0 | ❌ Avoid in product code | Linking GPL code into Growmax can require releasing **Growmax's** source under the GPL. Fine only for a *separate internal tool* we run but never distribute. |
| **Network (strong) copyleft** | AGPL-3.0 | ❌ High risk for SaaS | AGPL's section 13 extends copyleft to **network use**: offering the software's functionality over a network can require publishing the corresponding source. Because Growmax *is* a network service, treat AGPL in the product as a hard no without legal sign-off. |
| **Source-available / non-OSI** | BSL-1.1 (BUSL), SSPL-1.0, Elastic-2.0, Commons Clause overlay, "non-commercial" | ⚠️/❌ Not open source | These are *visible source* but legally restricted — typically banning competing/commercial/SaaS use, sometimes converting to OSS only after a time delay (BSL). Read the exact parameters before any use. SSPL in particular targets offering the software as a service. |
| **No license** | (no LICENSE file; "all rights reserved") | ❌ Cannot use | Absent a license, default copyright reserves all rights to the author. We have **no legal right** to use, copy, modify, or distribute it. GitHub's TOS only grants viewing/forking *on GitHub*, not production use. Ask the author to add a license, or avoid. |
| **Custom / unrecognized** | bespoke text | ⚠️ Review | Read it; if it grants commercial use and redistribution without copyleft it may be fine, but route anything non-standard to a human / legal review. |

## Obligations checklist to surface when relevant
- **Attribution**: preserve copyright and license notice (all permissive + copyleft).
- **NOTICE file**: required by Apache-2.0 if the upstream ships one.
- **State changes**: Apache-2.0 and GPL want modified files marked as changed.
- **Source availability**: copyleft licenses require offering source for the licensed parts (GPL/AGPL: potentially the larger work; LGPL/MPL: the licensed files).
- **Patent grant**: present in Apache-2.0, GPL-3.0, MPL-2.0; *absent* in MIT/BSD (a minor risk, rarely decisive).
- **No trademark rights**: a license to the code is not a license to the name/logo.

## Caveats to always mention
1. **Transitive dependencies.** The repo's own license is not the whole story — its
   dependencies carry their own licenses. For *internal dev-tool use* (running it on our
   machines) this rarely matters. If we ever **redistribute** code derived from it, the
   dependency licenses must also be cleared. Point this out; offer to check the lockfile
   (`package.json`/`requirements.txt`/`go.mod`, etc.) if they want depth.
2. **Dual licensing.** Some projects offer GPL *or* a paid commercial license. If you see
   "commercial license available," the strict-copyleft verdict may be sidesteppable by
   buying the commercial option.
3. **License changed over time / per-directory licenses.** Big repos sometimes relicense
   or vendor differently-licensed subtrees. If the LICENSE seems inconsistent with the
   README's claims, say so and recommend a closer look.
4. **This is guidance, not legal advice.** For anything high-stakes (shipping copyleft or
   source-available code in the product), recommend confirming with whoever owns legal/OSS
   compliance at Growmax.
