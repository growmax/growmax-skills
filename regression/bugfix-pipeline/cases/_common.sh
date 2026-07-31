#!/usr/bin/env bash
# Shared eval-sandbox builder. Sourced by case setup.sh scripts — not run directly.
# materialize <target-dir>       : copy calcshop into target, git init, base commit
# add_origin                     : give the sandbox a pushable bare origin (full-lap cases)
# write_repro <bug-id>           : author the env-gated spec + repro/<bug>/ contract (red on base)
# confirm_repro <bug-id>         : ONE commit, then TAG repro-<bug> (the anchor)
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

add_origin() {
  # Full-lap cases (C1/C2/C5/C6) reach a freeze that PUSHES the confirmation tag, and the AUTO
  # route pushes a branch too. Without a reachable origin the push fails, the route downgrades to
  # a human gate, and the case can never demonstrate what it exists to test. A local bare repo is
  # the honest stand-in: the push is real, it just does not leave the sandbox.
  local bare="${PWD}-origin.git"
  rm -rf "$bare"
  git init -q --bare "$bare"
  git remote remove origin 2>/dev/null || true
  git remote add origin "$bare"
  git push -q -u origin HEAD 2>/dev/null || git push -q -u origin master 2>/dev/null || true
  echo "origin -> $bare"
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
  "confirmed_mode": "human",
  "confirmed_commit": null
}
EOF
}

confirm_repro() {
  # ONE commit, then the tag — the tag is the sole anchor; confirmed_commit stays null (legacy
  # field). A follow-up "record the SHA" commit would make tag-vs-meta disagree on every repro —
  # the exact self-inflicted tamper signal eval round 1 caught (finding F1 in RESULTS.md).
  local bug="$1"
  git add -A && git commit -qm "confirm repro $bug (red on recorded assertion)"
  git tag "repro-$bug"
  echo "confirmed $bug; tag repro-$bug -> $(git rev-parse HEAD)"
}
