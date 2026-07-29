#!/usr/bin/env bash
# Self-test for protect-repro.sh (house norm: every hook ships its test).
# Builds a throwaway repo shape in mktemp, pipes fake PreToolUse payloads, asserts exit codes.
set -u
HOOK="$(cd "$(dirname "$0")" && pwd)/protect-repro.sh"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
cd "$T"

mkdir -p repro/BUG-C repro/BUG-U app/test
cat > repro/BUG-C/meta.json <<'EOF'
{ "bug_id": "BUG-C", "spec_path": "app/test/bug-c.repro.test.js", "confirmed_by_human": true }
EOF
cat > repro/BUG-U/meta.json <<'EOF'
{ "bug_id": "BUG-U", "spec_path": "app/test/bug-u.repro.test.js", "confirmed_by_human": false }
EOF
touch app/test/bug-c.repro.test.js app/test/bug-u.repro.test.js app/src.js

pass=0; fail=0
check() { # $1 desc, $2 expected exit, $3 payload
  printf '%s' "$3" | bash "$HOOK" >/dev/null 2>&1
  got=$?
  if [ "$got" -eq "$2" ]; then pass=$((pass+1)); echo "ok   ($got) $1";
  else fail=$((fail+1)); echo "FAIL (got $got, want $2) $1"; fi
}

check "edit inside CONFIRMED repro dir blocked"        2 '{"tool_input":{"file_path":"repro/BUG-C/meta.json"}}'
check "edit CONFIRMED spec (outside repro/) blocked"   2 '{"tool_input":{"file_path":"app/test/bug-c.repro.test.js"}}'
check "edit inside UNCONFIRMED repro dir allowed"      0 '{"tool_input":{"file_path":"repro/BUG-U/repro.md"}}'
check "edit UNCONFIRMED spec allowed"                  0 '{"tool_input":{"file_path":"app/test/bug-u.repro.test.js"}}'
check "edit unrelated app file allowed"                0 '{"tool_input":{"file_path":"app/src.js"}}'
check "bash sed -i into CONFIRMED repro blocked"       2 '{"tool_input":{"command":"sed -i s/10/1110/ repro/BUG-C/meta.json"}}'
check "bash redirect into CONFIRMED repro blocked"     2 '{"tool_input":{"command":"echo x > repro/BUG-C/repro.md"}}'
check "bash READ of confirmed repro allowed"           0 '{"tool_input":{"command":"cat repro/BUG-C/meta.json"}}'
check "bash write into UNCONFIRMED repro allowed"      0 '{"tool_input":{"command":"sed -i s/a/b/ repro/BUG-U/repro.md"}}'

# Self-gating: a tree with no repro/ dir must always allow.
cd "$(mktemp -d)"
check "no repro/ dir anywhere -> always allow"         0 '{"tool_input":{"file_path":"repro/BUG-C/meta.json"}}'

echo "----"; echo "pass=$pass fail=$fail"
[ "$fail" -eq 0 ]
