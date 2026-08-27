#!/usr/bin/env bash
# Run all gmax-setup regression cases into /tmp. Exit non-zero if any case fails.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

overall=0
for case_dir in cases/C*/; do
  name="$(basename "$case_dir")"
  sandbox="/tmp/eval-gmax-${name}"
  echo "=== $name → $sandbox"
  bash "$case_dir/setup.sh" "$sandbox" || overall=1
  bash "$case_dir/verify.sh" "$sandbox" || overall=1
  echo
done

if [ "$overall" -eq 0 ]; then
  echo "ALL CASES PASSED"
else
  echo "SOME CASES FAILED"
fi
exit "$overall"
