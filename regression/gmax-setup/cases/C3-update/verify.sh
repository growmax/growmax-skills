#!/usr/bin/env bash
# C3 — run the update headlessly against the bumped "shipped" module, then assert:
# canonical files refreshed, project truth byte-identical, second run a no-op.
# Usage: bash verify.sh /tmp/eval-gmax-c3   (exit 0 = every assertion passed)
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/_common.sh"

target="${1:?usage: verify.sh <target-dir>}"
shipped="$target.shipped"
cd "$target"

out="$(update_gmax "$shipped")"
echo "$out"
check "update ran (1.0.0 -> 9.9.9)"                 grep -q "UPDATED 1.0.0 -> 9.9.9" <<< "$out"
check ".gmax-version bumped"                        grep -qx "9.9.9" .gmax-version
check "canonical persona refreshed"                 grep -q "shipped change: builder now also runs the conformance gate" agents/builder.md
check "Claude shim refreshed"                       grep -q "shipped change: shim wording tightened" .claude/agents/builder.md
check "project truth byte-identical"                shasum -c "$shipped/truth.checksums"

# Second run: versions match -> guard reports CURRENT, nothing changes.
after="$(mktemp)"
find . -path ./.git -prune -o -type f -print | sort | xargs shasum > "$after"
out2="$(update_gmax "$shipped")"
echo "$out2"
check "second run reports CURRENT"                  grep -q "CURRENT 9.9.9" <<< "$out2"
check "second run changed nothing"                  shasum -c "$after"

rm -f "$after"
finish
