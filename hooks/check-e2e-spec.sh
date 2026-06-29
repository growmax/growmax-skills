#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): mechanically enforce E2E spec hygiene so the agents carry
# judgment, not rule-policing. SURFACE-AWARE: Playwright (web) specs and API (Jest/supertest)
# specs have different rules — applying web rules to a Jest spec false-positives on sync expect().
#
# Wire in .claude/settings.json:
#   "hooks": { "PostToolUse": [
#     { "matcher": "Write|Edit",
#       "hooks": [{ "type": "command",
#                   "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/check-e2e-spec.sh" }] } ] }
#
# Exit 2 = block with feedback the agent must act on. Exit 0 = allow.
set -euo pipefail
input="$(cat)"
path="$(printf '%s' "$input" | grep -oE '"(file_path|path)"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed -E 's/.*:[[:space:]]*"([^"]+)"/\1/')"
case "$path" in
  *.spec.ts|*.spec.tsx|*.spec.js|*.e2e-spec.ts) ;;
  *) exit 0 ;;
esac
[ -f "$path" ] || exit 0

v=""

if grep -qE "from '@playwright/test'|from \"@playwright/test\"|require\('@playwright/test'\)" "$path"; then
  # ---- WEB (Playwright) rules ----
  grep -nq 'waitForTimeout' "$path" && v+=$'\n- waitForTimeout() — replace with a web-first assertion (await expect(locator).toBeVisible()).'
  grep -nqE 'test\.retry\(|\.retries\s*=' "$path" && v+=$'\n- per-test retry — do not mask flake; fix the wait/locator instead.'
  if grep -nqE '(^|[[:space:]])expect\(' "$path" && ! grep -nqE 'await expect\(' "$path"; then
    v+=$'\n- expect() without await — Playwright web-first assertions must be awaited.'
  fi
elif grep -qE "from 'supertest'|require\('supertest'\)|Test\.createTestingModule" "$path"; then
  # ---- API (Jest/supertest) rules ----  (Jest expect() is synchronous — do NOT require await)
  if grep -nqE '\.(create|createMany|upsert)\(' "$path" && ! grep -nq 'afterAll(' "$path"; then
    v+=$'\n- create-flow without afterAll teardown — API e2e that writes rows must self-clean (children→parents) or it leaks test data across runs.'
  fi
  grep -nq 'waitForTimeout' "$path" && v+=$'\n- waitForTimeout() — use a deterministic await / poll, not a fixed sleep.'
else
  # Not an E2E spec we recognize (e.g. a plain unit test). Don't police it.
  exit 0
fi

if [ -n "$v" ]; then
  printf 'E2E spec hygiene failed for %s:%s\n\nFix and rewrite.\n' "$path" "$v" >&2
  exit 2
fi
exit 0
