#!/usr/bin/env bash
# C1 — fresh install. Sandbox: tinyshop with a pre-existing AGENTS.md and docs/ KB.
# Usage: bash setup.sh /tmp/eval-gmax-c1
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/_common.sh"

target="${1:?usage: setup.sh <target-dir>}"
materialize "$target"
echo "--- C1 sandbox ready at $target (no gmax installed yet)"
