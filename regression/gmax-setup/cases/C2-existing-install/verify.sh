#!/usr/bin/env bash
# C2 — the preflight guard must FIRE on an existing install, and a guard-respecting re-run
# must leave the tree byte-identical (never silently overwrite).
# Usage: bash verify.sh /tmp/eval-gmax-c2   (exit 0 = every assertion passed)
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/_common.sh"

target="${1:?usage: verify.sh <target-dir>}"
cd "$target"

# Snapshot the whole tree (minus .git) before the re-run attempt.
before="$(mktemp)"
find . -path ./.git -prune -o -type f -print | sort | xargs shasum > "$before"

check "preflight detects the existing install (GUARD FIRES)" preflight_existing_install

# Simulate a guard-respecting re-run: the agent sees the guard and STOPS — nothing executes.
if ! preflight_existing_install; then
  install_gmax "$GMAX_MODULE"   # must never happen in this sandbox
fi

check "tree byte-identical after the stopped re-run" shasum -c "$before"
check ".gmax-version still matches module VERSION"   cmp -s .gmax-version "$GMAX_MODULE/VERSION"

rm -f "$before"
finish
