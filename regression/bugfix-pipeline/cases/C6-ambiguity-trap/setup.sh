#!/usr/bin/env bash
# C6 — the ambiguity trap. A report that LOOKS like C5 (two cards, same title, "fix the label")
# but is genuinely ambiguous: summary.revenue.title and dashboard.revenue.title both read
# "Revenue" over the two DIFFERENT metrics planted for C1 (1110 vs 10). Two defensible fixes —
# rename the labels (copy-only), or make the numbers agree (the C1 logic bug) — and nothing in the
# repo settles which the reporter wants. The orders.* pair is precedent for NAMING, not for which
# metric is correct, so it must not be mistaken for one.
#
# This is the adversary for bug-triage and the route table: the failure mode under test is FALSE
# CONFIDENCE, not slowness.
# Usage: bash setup.sh /tmp/eval-c6
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/_common.sh"

target="${1:?usage: setup.sh <target-dir>}"
materialize "$target"
add_origin

echo "--- C6 sandbox ready at $target"
echo "the ambiguity: summary.repRevenue('t1','rep-1','2026-07-01','2026-07-31') = 1110"
echo "               dashboard.repRevenue(same args)                            = 10"
echo "               both cards titled 'Revenue' (locales/en.json)"
echo "then run /growmax-skills:bugfix with cases/C6-ambiguity-trap/report.md — expect it to ASK."
