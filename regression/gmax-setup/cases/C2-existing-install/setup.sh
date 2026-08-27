#!/usr/bin/env bash
# C2 — existing install. Sandbox: tinyshop with gmax ALREADY installed (the guard's job is
# to stop a second install from overwriting anything).
# Usage: bash setup.sh /tmp/eval-gmax-c2
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/_common.sh"

target="${1:?usage: setup.sh <target-dir>}"
materialize "$target"
install_gmax "$GMAX_MODULE"
echo "--- C2 sandbox ready at $target (gmax $(cat "$target/.gmax-version") pre-installed)"
