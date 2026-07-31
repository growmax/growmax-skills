#!/usr/bin/env bash
# C5 — the unattended AUTO lap. The defect ships in the fixture (locales/en.json: payments.pending
# copy-pasted from payments.collected), and the repo already contains the precedent that settles
# it (orders.confirmed / orders.pending, named correctly). This case builds NOTHING extra: it just
# materializes the sandbox with a pushable origin, because the AUTO route freezes by pushing a tag
# and ships by pushing a branch.
# Usage: bash setup.sh /tmp/eval-c5
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/_common.sh"

target="${1:?usage: setup.sh <target-dir>}"
materialize "$target"
add_origin

echo "--- C5 sandbox ready at $target"
echo "the defect:  node -e \"console.log(require('./src/payments').cards())\"  # both cards read 'Payments Collected'"
echo "then run /growmax-skills:bugfix with cases/C5-auto-label/report.md — and answer NOTHING."
