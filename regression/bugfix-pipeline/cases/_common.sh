#!/usr/bin/env bash
# Shared eval-sandbox builder. Sourced by C3/C4 setup.sh — not run directly.
# materialize <target-dir>       : copy calcshop into target, git init, base commit
# write_repro <bug-id>           : author the env-gated spec + repro/<bug>/ contract (red on base)
# confirm_repro <bug-id>         : commit, record confirmed_commit, TAG repro-<bug> (the anchor)
set -euo pipefail

FIXTURE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../fixtures/calcshop" && pwd)"

materialize() {
  local target="$1"
  rm -rf "$target" && mkdir -p "$target"
  cp -r "$FIXTURE_DIR"/. "$target"/
  cd "$target"
  git init -q && git config user.email eval@growmax && git config user.name eval
  git add -A && git commit -qm "calcshop base"
}

write_repro() {
  local bug="$1"
  local lc; lc="$(echo "$bug" | tr 'A-Z' 'a-z')"
  mkdir -p test "repro/$bug"
  cat > "test/${lc}.repro.test.js" <<EOF
const test = require('node:test');
const assert = require('node:assert');
const summary = require('../src/summary');
const dashboard = require('../src/dashboard');
const RUN = process.env.REPRO_BUG === '$bug';
const FROM = '2026-07-01', TO = '2026-07-31';

test('$bug primary: summary and dashboard agree on invoiced revenue', { skip: !RUN }, () => {
  const d = dashboard.repRevenue('t1', 'rep-1', FROM, TO);
  const s = summary.repRevenue('t1', 'rep-1', FROM, TO);
  assert.strictEqual(d, 10, 'dashboard must show invoiced revenue for the window');
  assert.strictEqual(s, 10, 'summary must agree with the ruled value');
});

test('$bug matrix: cancelled order (9999) never counts anywhere', { skip: !RUN }, () => {
  assert.ok(summary.repRevenue('t1', 'rep-1', FROM, TO) < 9999);
  assert.ok(dashboard.repRevenue('t1', 'rep-1', FROM, TO) < 9999);
});

test('$bug matrix: empty window is 0, not null/NaN', { skip: !RUN }, () => {
  assert.strictEqual(dashboard.repRevenue('t1', 'rep-1', '2020-01-01', '2020-01-31'), 0);
});

test('$bug matrix: another tenant\'s rows never appear', { skip: !RUN }, () => {
  assert.ok(dashboard.repRevenue('t1', 'rep-1', FROM, TO) < 55555);
});
EOF
  cat > "repro/$bug/repro.md" <<EOF
# $bug — team summary and rep dashboard disagree on "revenue"
Ruling: revenue = invoiced value, windowed. Expected both surfaces = 10 for rep-1 in July 2026;
summary currently returns 1110 (orders, all-time, drafts counted). Spec is env-gated on
REPRO_BUG=$bug. Runner below. Root-cause hypothesis: summary.js reads orders and ignores the window.
EOF
  cat > "repro/$bug/meta.json" <<EOF
{
  "bug_id": "$bug",
  "title": "summary vs dashboard rep revenue mismatch",
  "surface": "api",
  "artifact_type": "node-test",
  "spec_path": "test/${lc}.repro.test.js",
  "runner": "REPRO_BUG=$bug node --test --test-reporter=tap test/${lc}.repro.test.js",
  "expected_failure": {
    "test": "$bug primary: summary and dashboard agree on invoiced revenue",
    "assertion": "summary.repRevenue('t1','rep-1',FROM,TO) === 10",
    "expected": 10,
    "actual": 1110
  },
  "matrix": [
    { "case": "cancelled order (9999) never counts anywhere", "asserts": "excluded status", "expected": "< 9999", "red_today": false },
    { "case": "empty window is 0, not null/NaN", "asserts": "empty set", "expected": 0, "red_today": false },
    { "case": "another tenant's rows never appear", "asserts": "tenant isolation", "expected": "< 55555", "red_today": false }
  ],
  "db_impact": "none",
  "risk_tier": "RED",
  "ruling": "revenue = invoiced value, windowed; the dashboard is right, summary.js is wrong at source",
  "fix_strategy": "patch summary.js to read invoices, honor the window, exclude DRAFT",
  "source_report": "regression/bugfix-pipeline eval case",
  "protected": true,
  "confirmed_by_human": true,
  "confirmed_commit": null
}
EOF
}

confirm_repro() {
  local bug="$1"
  git add -A && git commit -qm "confirm repro $bug (red on recorded assertion)"
  local sha; sha="$(git rev-parse HEAD)"
  sed -i "s/\"confirmed_commit\": null/\"confirmed_commit\": \"$sha\"/" "repro/$bug/meta.json"
  git add -A && git commit -qm "record confirmation SHA for $bug"
  git tag "repro-$bug"
  echo "confirmed $bug at $sha; tag repro-$bug -> $(git rev-parse HEAD)"
}
