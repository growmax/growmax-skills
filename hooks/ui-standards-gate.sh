#!/usr/bin/env bash
# ui-standards-gate.sh — the BUILD-TIME trigger for UI-standards enforcement. One script, three
# hook events (it branches on hook_event_name), all GATED on the repo shipping
# `.claude/UI-STANDARDS.md` — silent everywhere else.
#
#   UserPromptSubmit  Detects UI-building intent in the prompt (build/add/create… a
#                     page/component/modal/form…) and injects a context line routing the session
#                     to /build-ui + the ui-builder agent BEFORE any code gets written.
#   PreToolUse        (Write|Edit) HARD GATE: blocks writes to .tsx/.jsx component files until
#                     this session has actually Read .claude/UI-STANDARDS.md. Exit 2 = deny; the
#                     stderr message tells Claude exactly how to unlock (read the standard),
#                     so the loop self-corrects in one step.
#   PostToolUse       (Read) When the standard file is read, drops a session-keyed marker that
#                     unlocks the gate for the rest of the session.
#
# The gate is deliberately narrow: component files only (.tsx/.jsx), tests/stories/vendored code
# skipped, and only in adopting repos. check-ui-standards.sh (PostToolUse grep) still carries the
# mechanical per-write rules; this gate carries the "you can't build UI without the rulebook
# open" contract. Opt out per-machine with GROWMAX_UI_GATE=0.
# Run `ui-standards-gate.sh --selftest` to verify.
set -uo pipefail

[ "${GROWMAX_UI_GATE:-1}" = "0" ] && [ "${1:-}" != "--selftest" ] && exit 0

MARKER_DIR="${TMPDIR:-/tmp}"

# ---- helpers ------------------------------------------------------------------------------------
# best-effort scalar extraction from the hook's stdin JSON (no jq dependency, same approach as the
# sibling hooks)
jget() { # $1=key
  printf '%s' "$input" | grep -oE "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -1 \
    | sed -E 's/^"[^"]+"[[:space:]]*:[[:space:]]*"(.*)"$/\1/'
}

# walk UP from a path (pure string walk — works for files/dirs that don't exist yet) looking for
# .claude/UI-STANDARDS.md; CLAUDE_PROJECT_DIR wins when set.
has_standard() { # $1=path to start from (file or dir), may be empty
  if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
    [ -f "$CLAUDE_PROJECT_DIR/.claude/UI-STANDARDS.md" ] && return 0 || return 1
  fi
  local d="${1:-}"
  [ -n "$d" ] || return 1
  case "$d" in /*) ;; *) d="${cwd:-$(pwd)}/$d" ;; esac
  [ -d "$d" ] || d="$(dirname "$d")"
  while [ -n "$d" ] && [ "$d" != "/" ] && [ "$d" != "." ]; do
    [ -f "$d/.claude/UI-STANDARDS.md" ] && return 0
    d="$(dirname "$d")"
  done
  return 1
}

marker_path() { printf '%s/growmax-uistd-read-%s' "$MARKER_DIR" "${session_id:-nosession}"; }

# ---- selftest -----------------------------------------------------------------------------------
if [ "${1:-}" = "--selftest" ]; then
  self="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  proj="$tmp/app"; mkdir -p "$proj/.claude" "$proj/src"
  echo "# UI-STANDARDS v-test" > "$proj/.claude/UI-STANDARDS.md"
  bare="$tmp/bare"; mkdir -p "$bare/src"   # repo WITHOUT a standard
  fail=0
  t() { # $1=name $2=expected-exit $3=env-project-dir $4=json
    local out rc
    out="$(printf '%s' "$4" | CLAUDE_PROJECT_DIR="$3" TMPDIR="$tmp" GROWMAX_UI_GATE=1 bash "$self" 2>&1)"; rc=$?
    if [ "$rc" -ne "$2" ]; then echo "selftest FAIL: $1 (exit $rc, want $2) :: $out" >&2; fail=1; fi
  }
  sid="s1-$$"
  # 1. PreToolUse write to a component with no marker → BLOCK (2)
  t "block-unread" 2 "$proj" \
    "{\"session_id\":\"$sid\",\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$proj/src/Widget.tsx\"}}"
  # 2. Reading the standard drops the marker → PASS (0)
  t "mark-on-read" 0 "$proj" \
    "{\"session_id\":\"$sid\",\"hook_event_name\":\"PostToolUse\",\"tool_name\":\"Read\",\"tool_input\":{\"file_path\":\"$proj/.claude/UI-STANDARDS.md\"}}"
  [ -f "$tmp/growmax-uistd-read-$sid" ] || { echo "selftest FAIL: marker not created" >&2; fail=1; }
  # 3. Same session writes again → UNLOCKED (0)
  t "unlocked-after-read" 0 "$proj" \
    "{\"session_id\":\"$sid\",\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$proj/src/Widget.tsx\"}}"
  # 4. Non-UI file never gated (0), even unread session
  t "non-ui-file" 0 "$proj" \
    "{\"session_id\":\"s2-$$\",\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$proj/src/api.py\"}}"
  # 5. Test files skipped (0)
  t "test-file-skipped" 0 "$proj" \
    "{\"session_id\":\"s2-$$\",\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$proj/src/Widget.test.tsx\"}}"
  # 6. Repo without a standard → silent (0)
  t "no-standard-repo" 0 "$bare" \
    "{\"session_id\":\"s3-$$\",\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$bare/src/Widget.tsx\"}}"
  # 7. UserPromptSubmit with UI intent → context line on stdout
  out="$(printf '%s' "{\"session_id\":\"s4-$$\",\"hook_event_name\":\"UserPromptSubmit\",\"prompt\":\"please build a settings page with a form\"}" \
        | CLAUDE_PROJECT_DIR="$proj" TMPDIR="$tmp" GROWMAX_UI_GATE=1 bash "$self")" || { echo "selftest FAIL: intent exit" >&2; fail=1; }
  printf '%s' "$out" | grep -q "UI-standards" || { echo "selftest FAIL: no intent context injected" >&2; fail=1; }
  # 8. UserPromptSubmit without UI intent → silent
  out="$(printf '%s' "{\"session_id\":\"s4-$$\",\"hook_event_name\":\"UserPromptSubmit\",\"prompt\":\"fix the pagination bug in the API resolver\"}" \
        | CLAUDE_PROJECT_DIR="$proj" TMPDIR="$tmp" GROWMAX_UI_GATE=1 bash "$self")" || { echo "selftest FAIL: no-intent exit" >&2; fail=1; }
  [ -z "$out" ] || { echo "selftest FAIL: context injected for non-UI prompt :: $out" >&2; fail=1; }
  # 9. GROWMAX_UI_GATE=0 disables the block
  printf '%s' "{\"session_id\":\"s5-$$\",\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$proj/src/Widget.tsx\"}}" \
    | CLAUDE_PROJECT_DIR="$proj" TMPDIR="$tmp" GROWMAX_UI_GATE=0 bash "$self" || { echo "selftest FAIL: opt-out still blocked" >&2; fail=1; }
  [ "$fail" -eq 0 ] && echo "ui-standards-gate selftest OK (9 cases)"
  exit "$fail"
fi

# ---- normal hook path -----------------------------------------------------------------------------
input="$(cat)"
event="$(jget hook_event_name)"
session_id="$(jget session_id)"
cwd="$(jget cwd)"

case "$event" in

  UserPromptSubmit)
    has_standard "${cwd:-$(pwd)}" || exit 0
    prompt="$(jget prompt)"; [ -n "$prompt" ] || prompt="$input"
    verbs='build|creat|add|implement|make|develop|design|redesign|rework|refactor|new'
    nouns='page|screen|component|modal|dialog|drawer|form|button|table|layout|view|card|panel|sidebar|navbar|header|footer|frontend|ui|ux|widget|banner|toast|tooltip|wizard|stepper|filter|chip'
    if printf '%s' "$prompt" | grep -qiE "\b($verbs)" && printf '%s' "$prompt" | grep -qiE "\b($nouns)s?\b"; then
      cat <<'EOF'
[growmax UI-standards gate] This prompt looks like UI work, and this repo adopts
.claude/UI-STANDARDS.md. UI here is built standards-first, not audited later:
- Preferred route: /growmax-skills:build-ui <the request> — the ui-builder agent composes it
  from the catalog, then ui-standards-reviewer verifies the touched files.
- Building inline instead? Read .claude/UI-STANDARDS.md FIRST — writes to .tsx/.jsx files are
  blocked until this session has read it — and compose the Part B catalog components (never
  hand-roll a region the catalog owns; CMP-5 protocol for anything off-catalog).
EOF
    fi
    exit 0
    ;;

  PreToolUse)
    path="$(printf '%s' "$input" | grep -oE '"(file_path|path)"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed -E 's/.*:[[:space:]]*"([^"]+)"/\1/')"
    case "$path" in
      *.tsx|*.jsx) ;;
      *) exit 0 ;;
    esac
    case "$path" in
      *.test.*|*.spec.*|*.stories.*|*/node_modules/*|*/dist/*|*/build/*|*/.next/*) exit 0 ;;
    esac
    has_standard "$path" || exit 0
    [ -n "$session_id" ] || exit 0            # can't track the session → fail open, never wedge
    [ -f "$(marker_path)" ] && exit 0
    {
      echo "UI-standards gate: this repo adopts .claude/UI-STANDARDS.md, and this session has not read it yet."
      echo "Before writing UI code:"
      echo "  1. Read .claude/UI-STANDARDS.md (this unlocks .tsx/.jsx writes for the session), then retry."
      echo "  2. Better: route the work through /growmax-skills:build-ui (ui-builder agent -> ui-standards-reviewer verify)."
      echo "Compose the Part B catalog components — never hand-roll a region the catalog owns."
    } >&2
    exit 2
    ;;

  PostToolUse)
    path="$(printf '%s' "$input" | grep -oE '"(file_path|path)"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed -E 's/.*:[[:space:]]*"([^"]+)"/\1/')"
    case "$path" in
      */.claude/UI-STANDARDS.md|.claude/UI-STANDARDS.md)
        [ -n "$session_id" ] && : > "$(marker_path)" 2>/dev/null || true
        ;;
    esac
    exit 0
    ;;

esac
exit 0
