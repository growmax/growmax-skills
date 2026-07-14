#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): mechanically nudge UI-standard violations at write time, so the
# ui-standards-reviewer agent carries JUDGMENT (composition/CMP-2 forking) and this cheap grep
# carries the OBVIOUS, high-precision mechanical rules — for free, before anything is committed.
#
# GATED: does nothing unless the repo ships `.claude/UI-STANDARDS.md`. Silent in every other repo.
# HIGH-PRECISION ONLY: it flags patterns that are almost always wrong in this design system
# (pill buttons, hover shadows / press-scale, raw red on a button, arbitrary --ring forms, lucide
# synonym icons). Anything context-dependent (missing type=, dashed filters, footer bars,
# composition drift) is intentionally LEFT to the agent — a hook that cries wolf gets disabled.
#
# Exit 2 = feed the finding back to Claude to self-correct (the write already happened; this is the
# fix-it nudge). Exit 0 = clean/not-applicable. Run `check-ui-standards.sh --selftest` to verify.
set -euo pipefail

# ---- the detector: prints `LINE|RULE|message` for each violation in $1 -------------------------
scan_file() {
  local f="$1"
  # rules keyed on a button context reduce false positives (avatars/chips legitimately round-full)
  local btn='(<[Bb]utton|<button|buttonVariants)'

  # BTN-3 / FLT-1 — pills are status chips only; never on a button/filter trigger
  { grep -nE "$btn" "$f" 2>/dev/null | grep -E 'rounded-full' \
    | sed -E 's/^([0-9]+):.*/\1|BTN-3|rounded-full on a button — buttons use the standard radius; pills are status chips only/'; } || true

  # BTN-1 — semantic tone comes from a variant, never hardcoded red on a button
  { grep -nE "$btn" "$f" 2>/dev/null | grep -E '(bg|text|border)-red-[0-9]' \
    | sed -E 's/^([0-9]+):.*/\1|BTN-1|hardcoded red on a button — use the destructive variant, do not hardcode color/'; } || true

  # MOT-1 — motion budget: no hover shadow, no press-scale
  { grep -nE 'hover:shadow|active:scale|hover:scale' "$f" 2>/dev/null \
    | sed -E 's/^([0-9]+):.*/\1|MOT-1|hover-shadow or press-scale — motion is colors-only; remove it/'; } || true

  # FLT-3 — indigo accent via token utilities, never arbitrary-value forms (emit invalid CSS)
  { grep -nE '\[--ring\]|\[hsl\(var\(--ring' "$f" 2>/dev/null \
    | sed -E 's/^([0-9]+):.*/\1|FLT-3|arbitrary --ring form — use border-ring\/text-ring\/bg-ring token utilities/'; } || true

  # ICO-1 — one glyph per action; these are the known synonym offenders for Import/Export
  { grep -nE "from ['\"]lucide-react['\"]" "$f" 2>/dev/null | grep -E 'FileUp|FileDown|ArrowDownTray|ArrowUpTray' \
    | sed -E 's/^([0-9]+):.*/\1|ICO-1|synonym icon import — Import is Upload, Export is Download (see the icon map)/'; } || true
  return 0
}

# ---- selftest ----------------------------------------------------------------------------------
if [ "${1:-}" = "--selftest" ]; then
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  bad="$tmp/bad.tsx"; good="$tmp/good.tsx"
  cat >"$bad" <<'EOF'
<Button className="rounded-full">x</Button>
<Button className="bg-red-500">del</Button>
<div className="hover:shadow-md active:scale-95" />
<span className="border-[--ring]" />
import { FileUp } from 'lucide-react'
EOF
  cat >"$good" <<'EOF'
<Button variant="destructive" size="sm" className="rounded-md">Delete</Button>
<Avatar className="rounded-full" />
<span className="rounded-full bg-warning" />  {/* status chip — correct */}
<div className="border-ring bg-ring/10 text-ring" />
import { Upload, Download, Trash2 } from 'lucide-react'
EOF
  n_bad="$(scan_file "$bad" | wc -l | tr -d ' ')"
  n_good="$(scan_file "$good" | wc -l | tr -d ' ')"
  fail=0
  [ "$n_bad" -eq 5 ] || { echo "selftest FAIL: expected 5 findings in bad fixture, got $n_bad" >&2; fail=1; }
  [ "$n_good" -eq 0 ] || { echo "selftest FAIL: expected 0 findings in good fixture, got $n_good" >&2; scan_file "$good" >&2; fail=1; }
  [ "$fail" -eq 0 ] && echo "check-ui-standards selftest OK (bad=$n_bad good=$n_good)"
  exit "$fail"
fi

# ---- normal PostToolUse path -------------------------------------------------------------------
input="$(cat)"
path="$(printf '%s' "$input" | grep -oE '"(file_path|path)"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed -E 's/.*:[[:space:]]*"([^"]+)"/\1/')"

# UI files only; skip declarations, tests, and vendored code
case "$path" in
  *.tsx|*.jsx|*.ts|*.js) ;;
  *) exit 0 ;;
esac
case "$path" in
  *.d.ts|*.spec.*|*.test.*|*/node_modules/*|*/dist/*|*/build/*) exit 0 ;;
esac
[ -f "$path" ] || exit 0

# GATE: only in repos that adopt the standard. Walk up from the file to find .claude/UI-STANDARDS.md.
has_standard() {
  [ -n "${CLAUDE_PROJECT_DIR:-}" ] && [ -f "$CLAUDE_PROJECT_DIR/.claude/UI-STANDARDS.md" ] && return 0
  local d; d="$(cd "$(dirname "$path")" 2>/dev/null && pwd)" || return 1
  while [ -n "$d" ] && [ "$d" != "/" ]; do
    [ -f "$d/.claude/UI-STANDARDS.md" ] && return 0
    d="$(dirname "$d")"
  done
  return 1
}
has_standard || exit 0

findings="$(scan_file "$path" || true)"
[ -z "$findings" ] && exit 0

{
  echo "UI-standard nudge for $path (cite the rule ID; fix or, if intentional, add to docs/ux-drift-backlog.md → Accepted exceptions):"
  printf '%s\n' "$findings" | while IFS='|' read -r line rule msg; do
    [ -n "$line" ] && echo "  - $path:$line  [$rule] $msg"
  done
} >&2
exit 2
