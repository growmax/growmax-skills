#!/usr/bin/env bash
# UserPromptSubmit hook — detects UI-creation intent in a prompt and injects a
# reminder to resolve the shared component FIRST (rulebook .claude/UI-STANDARDS.md),
# before any web-admin UI is hand-rolled. Pre-build counterpart to /ux-audit.
#
# Contract: reads the hook JSON on stdin, extracts .prompt. If the prompt shows
# intent to CREATE/BUILD web UI, prints a context block on stdout (which the harness
# injects for the turn). Otherwise prints nothing and exits 0 (no-op).
#
# Deliberately conservative: fires only when a build/create verb co-occurs with a
# UI-noun, so ordinary questions and non-UI work don't trigger it.

set -euo pipefail

# GATED: only fires in repos that ship the rulebook. Silent everywhere else.
[ -f "${CLAUDE_PROJECT_DIR:-.}/.claude/UI-STANDARDS.md" ] || exit 0

prompt="$(python3 -c 'import sys,json
try:
    d = json.load(sys.stdin)
    print(d.get("prompt",""), end="")
except Exception:
    pass' 2>/dev/null || true)"

[ -z "$prompt" ] && exit 0

# lowercase for matching
lc="$(printf '%s' "$prompt" | tr '[:upper:]' '[:lower:]')"

# A build/create intent verb…
verb_re='create|build|add|make|new|generate|implement|design|scaffold|render|redesign|revamp'
# …co-occurring with a web-admin UI noun.
noun_re='page|screen|table|grid|form|list|listing|header|dialog|modal|filter|chart|graph|component|view|tab|card|toolbar|dropdown|sidebar|button|badge|chip|stats|kpi|empty state|skeleton|layout|ui|panel'

if printf '%s' "$lc" | grep -Eq "($verb_re)" && printf '%s' "$lc" | grep -Eq "($noun_re)"; then
  # Skip if the request is clearly mobile-only (different design language, out of scope).
  if printf '%s' "$lc" | grep -Eq 'buyer-app|sales-app|expo|react native|mobile app|sectioncard|design-tokens' \
     && ! printf '%s' "$lc" | grep -Eq 'web-vite|admin|web admin|/pages/'; then
    exit 0
  fi

  cat <<'EOF'
[UI-STANDARDS reminder — UI-creation intent detected]
This looks like a request to build web-admin UI (apps/web-vite). Before hand-rolling
anything, RESOLVE THE SHARED COMPONENT FIRST:

  • Run  /ui-builder <what you're building>  — it maps the request to the exact shared
    component (UI-STANDARDS.md Table 1), the Part A rules in play, and a CMP-5 verdict
    (reuse / extend / new).
  • Compose the shared unit; never fork a divergent copy (CMP-1/2/4, CR-REUSE).
  • Common regions → components: list page = ListPageLayout · doc/create/edit header =
    DocumentPageHeader · data table = ui/data-table.tsx (read-only: list/list-table.tsx) ·
    KPI strip = StatsStrip · buttons = ui/button.tsx variants (3 roles, size="sm"/h-8) ·
    loading = skeletons not spinners (LOD-1) · status = StatusBadge/StatusIndicator (CHP-1).
  • No catalog row? CMP-5: check primitives (src/components/ui/) → grep prior art → if
    genuinely new, build in the shared location AND register a Table 1 row in the same PR.
  • After building, gate with /feature-review before the PR.

(Scope: apps/web-vite only. Mobile apps run a different design language — ignore this there.)
EOF
fi

exit 0
