#!/usr/bin/env bash
# SessionStart hook: if this repo has a product notebook (docs/product/, built by /learn-app),
# check whether the code has moved past what the notebook was verified against, and whether the
# human has answered ledger questions that are still waiting to be folded. Pure git + grep —
# costs no tokens and runs in milliseconds. Prints nothing when everything is current.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

INDEX="docs/product/INDEX.md"
[ -f "$INDEX" ] || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# Base sha: manifest seed first, else the newest verified_at_commit across module notes.
base=""
if [ -f docs/nav-manifest.json ]; then
  base="$(grep -oE '"seeded_at_commit"[[:space:]]*:[[:space:]]*"[0-9a-f]+' docs/nav-manifest.json 2>/dev/null | grep -oE '[0-9a-f]+$' | head -1)"
fi
if [ -z "$base" ]; then
  base="$(grep -rhoE 'verified_at_commit:[[:space:]]*[0-9a-f]+' docs/product/modules/ 2>/dev/null | grep -oE '[0-9a-f]+$' | sort | uniq -c | sort -rn | head -1 | awk '{print $2}')"
fi

stale_msg=""
if [ -n "$base" ] && git rev-parse --verify -q "${base}^{commit}" >/dev/null 2>&1; then
  behind="$(git rev-list --count "${base}..HEAD" 2>/dev/null || echo 0)"
  if [ "${behind:-0}" -gt 0 ]; then
    src_changed="$(git diff --name-only "${base}..HEAD" 2>/dev/null | grep -cE '^(src|app|apps|packages|pages|lib|routes|prisma)/' || true)"
    if [ "${src_changed:-0}" -gt 0 ]; then
      stale_msg="code has moved ${behind} commit(s) past the notebook's verified point (${base}), touching ${src_changed} source file(s)"
    fi
  fi
fi

# Answered-but-unfolded questions: an entry whose "Your answer:" line has real content (not the
# empty "_" placeholder) while still outside the archive is awaiting a fold.
pending_fold="$(awk '/^## Archive/{exit} /^\*\*Your answer:\*\*/{ans=$0; sub(/^\*\*Your answer:\*\*/,"",ans); gsub(/[[:space:]_]/,"",ans); if (length(ans)>0) c++} END{print c+0}' docs/product/open-questions.md 2>/dev/null || echo 0)"

status_line="$(grep -m1 -E '^\*\*Status:' docs/product/open-questions.md 2>/dev/null || true)"

# Routing reflex: this line prints in EVERY session of a notebook-carrying repo, fresh or stale.
# It exists because sessions otherwise pattern-match to loaded context and bypass the PM agent —
# the exact failure the notebook was built to prevent. Keep it to one line.
echo "📓 Product notebook: docs/product/ exists. Product/behavior questions ('how does X work', 'what is correct behavior', specs) MUST be answered via the growmax-skills:product-manager agent (notebook-grounded, provenance-cited) — read code only to VERIFY its load-bearing claims, not as the primary source."

out=""
[ -n "$stale_msg" ] && out="⚠ Product notebook is STALE: ${stale_msg}."
if [ "${pending_fold:-0}" -gt 0 ]; then
  [ -n "$out" ] && out="${out} "
  out="${out}✍ ${pending_fold} answered ledger question(s) are waiting to be folded."
fi
if [ -n "$out" ]; then
  echo "${out} Run /learn-app to refresh the product notebook (docs/product/). ${status_line}"
fi
exit 0
