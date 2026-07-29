#!/usr/bin/env bash
# protect-repro.sh — PreToolUse hook: freeze CONFIRMED bug reproductions.
#
# A confirmed repro (repro/BUG-<id>/ with "confirmed_by_human": true) is the GRADER
# for a later fix session. Editing it lets a fix quietly re-aim the thing that judges
# it, so this hook blocks Write/Edit/MultiEdit on those paths — and takes a best-effort
# swing at Bash write patterns. It is FRICTION, not the enforcement: the enforcement is
# the fix-validator's diff against the pushed confirmation tag (repro-BUG-<id>), which
# catches anything this hook misses. Do not weaken the validator because this hook exists.
#
# Registered in hooks/hooks.json for PreToolUse on Write|Edit|MultiEdit and on Bash.
# Manual wiring (project settings.json):
#   { "hooks": { "PreToolUse": [ { "matcher": "Write|Edit|MultiEdit",
#     "hooks": [{ "type": "command", "command": "bash .claude/hooks/protect-repro.sh" }] } ] } }
#
# Contract: exit 2 = BLOCK with stderr feedback the agent must act on. Exit 0 = allow.
# Self-gating: exits 0 instantly when the repo has no repro/ directory (plugin hooks are global).
set -euo pipefail

input="$(cat)"

# Locate the repro root (cwd or git root). No repro dir anywhere → not our repo, allow.
root=""
if [ -d "repro" ]; then
  root="."
else
  gitroot="$(git rev-parse --show-toplevel 2>/dev/null || true)"
  if [ -n "$gitroot" ] && [ -d "$gitroot/repro" ]; then root="$gitroot"; fi
fi
[ -z "$root" ] && exit 0

confirmed_bug_dirs() {
  # Print every repro/BUG-*/ dir whose meta.json says confirmed_by_human: true.
  for meta in "$root"/repro/*/meta.json; do
    [ -f "$meta" ] || continue
    if grep -qE '"confirmed_by_human"[[:space:]]*:[[:space:]]*true' "$meta"; then
      dirname "$meta"
    fi
  done
}

block() {
  echo "BLOCKED by protect-repro: $1" >&2
  echo "A confirmed reproduction is the grader for its fix — it cannot be modified." >&2
  echo "If the repro itself is wrong, STOP and tell the human; re-confirm via /confirm-bug." >&2
  exit 2
}

# ---- Write / Edit / MultiEdit: payload carries tool_input.file_path -------------------
file_path="$(printf '%s' "$input" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed 's/.*:[[:space:]]*"//; s/"$//' || true)"
if [ -n "$file_path" ]; then
  for d in $(confirmed_bug_dirs); do
    bug="$(basename "$d")"
    case "$file_path" in
      "$d"/*|*/repro/"$bug"/*|repro/"$bug"/*) block "$file_path is inside confirmed $bug" ;;
    esac
    # The executable spec lives OUTSIDE repro/ — its path is recorded in meta.json.
    spec="$(grep -oE '"spec_path"[[:space:]]*:[[:space:]]*"[^"]+"' "$d/meta.json" | head -1 | sed 's/.*:[[:space:]]*"//; s/"$//' || true)"
    if [ -n "$spec" ]; then
      case "$file_path" in
        "$spec"|*/"$spec") block "$file_path is the confirmed spec of $bug ($spec)" ;;
      esac
    fi
  done
  exit 0
fi

# ---- Bash: payload carries tool_input.command — heuristic, best-effort ----------------
command_str="$(printf '%s' "$input" | grep -oE '"command"[[:space:]]*:[[:space:]]*"' || true)"
if [ -n "$command_str" ]; then
  # Extract the raw command value crudely (JSON-escaped; good enough for pattern checks).
  cmd="$(printf '%s' "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' | head -1 || true)"
  if printf '%s' "$cmd" | grep -qE 'repro/BUG-[A-Za-z0-9_-]+'; then
    if printf '%s' "$cmd" | grep -qE '(sed[[:space:]]+-i|>[[:space:]]*[^&|;]*repro/|tee[[:space:]]|mv[[:space:]]|rm[[:space:]]|cp[[:space:]].*[[:space:]]repro/)'; then
      hit="$(printf '%s' "$cmd" | grep -oE 'repro/BUG-[A-Za-z0-9_-]+' | head -1)"
      bugdir="$root/${hit}"
      if [ -f "$bugdir/meta.json" ] && grep -qE '"confirmed_by_human"[[:space:]]*:[[:space:]]*true' "$bugdir/meta.json"; then
        block "bash command writes into confirmed ${hit} (pattern match)"
      fi
    fi
  fi
fi

exit 0
