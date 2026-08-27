#!/usr/bin/env bash
# C3 — update. Sandbox: tinyshop with gmax 1.0.0 installed; a "shipped" module bumped to
# 9.9.9 with one canonical change (agents/builder.md) and one shim change. The update must
# refresh ONLY the canonical set and leave all project truth byte-identical.
# Usage: bash setup.sh /tmp/eval-gmax-c3
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/_common.sh"

target="${1:?usage: setup.sh <target-dir>}"
materialize "$target"
install_gmax "$GMAX_MODULE"

# Build the "shipped" (newer) module the plugin would carry after a marketplace update.
shipped="$target.shipped"
rm -rf "$shipped" && cp -r "$GMAX_MODULE" "$shipped"
echo "9.9.9" > "$shipped/VERSION"
echo "# shipped change: builder now also runs the conformance gate" >> "$shipped/agents/builder.md"
echo "# shipped change: shim wording tightened" >> "$shipped/harnesses/claude/.claude/agents/builder.md"

# Freeze the project-truth checksums the update must never alter.
( cd "$target" && shasum workflow.config.md standards/* docs/* AGENTS.md src/* .gitignore ) \
  > "$shipped/truth.checksums"

echo "--- C3 sandbox ready at $target (gmax 1.0.0 installed; shipped module at $shipped = 9.9.9)"
