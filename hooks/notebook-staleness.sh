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

# Routing reflex + actionable status — a scannable callout, not a run-on sentence. The remedy
# command always sits on its own line so it's copy-paste obvious. Prints in every session of a
# notebook-carrying repo (sessions otherwise pattern-match to loaded context and bypass the agent).
echo "📓 PRODUCT NOTEBOOK — docs/product/"
echo "   Ask the \`product-manager\` agent for product/behavior/spec questions (notebook-grounded, cited); read code only to verify."

if [ -n "$stale_msg" ] || [ "${pending_fold:-0}" -gt 0 ]; then
  echo "   ─────────────────────────────────────────────────────────"
  [ -n "$stale_msg" ]            && echo "   ⚠️  STALE — ${stale_msg}"
  [ "${pending_fold:-0}" -gt 0 ] && echo "   ✍️  ${pending_fold} answered question(s) waiting to fold into the notes"
  echo "   ▶️  FIX IT:  /learn-app                 ← refresh the notebook (folds answers + catches code drift)"
  echo "               /learn-app localhost:3000   ← also walk the live UI while refreshing"
  [ -n "$status_line" ] && echo "   $(printf '%s' "$status_line" | sed 's/\*\*//g')"
  echo "   ─────────────────────────────────────────────────────────"
fi
exit 0
