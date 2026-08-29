#!/usr/bin/env node
/**
 * Step 4 of the sweep: the number nobody can argue with.
 *
 * Coverage is computed from state files on disk against the ledger's file list —
 * not from any agent's summary of what it did. "132/339 units, 61% of files" is a
 * measurement; "I documented the repo" is not.
 *
 * Usage: node <sweep>/scripts/report.mjs [--json] [--next N] [--needs-human]
 */
import {LEDGER_FILE, readJson, statePath, green, red, yellow} from './lib.mjs';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const nextN = argv.includes('--next') ? Number(argv[argv.indexOf('--next') + 1]) : 0;

const ledger = readJson(LEDGER_FILE);
if (!ledger) {
  console.error('no ledger — run: node <sweep>/scripts/build-ledger.mjs');
  process.exit(2);
}

const rows = ledger.units.map(u => {
  const st = readJson(statePath(u.id)) || {status: 'pending', attempts: 0};
  return {...u, status: st.status, attempts: st.attempts || 0, lastError: st.lastError || null};
});

const byStatus = {};
for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;

const passed = rows.filter(r => r.status === 'passed');
const filesCovered = passed.reduce((s, r) => s + r.fileCount, 0);
const total = ledger.totals.sweepableFiles || 1;
const pct = n => `${((n / total) * 100).toFixed(1)}%`;

const open = rows
  .filter(r => ['pending', 'failed', 'stale'].includes(r.status))
  .sort((a, b) => a.priority - b.priority || b.attempts - a.attempts || (a.path < b.path ? -1 : 1));

const needsHuman = rows.filter(r => r.status === 'needs_human');

if (asJson) {
  console.log(JSON.stringify({
    totals: ledger.totals,
    byStatus,
    filesCovered,
    coverage: filesCovered / total,
    next: open.slice(0, nextN || 25).map(r => ({id: r.id, path: r.path, files: r.files, fileCount: r.fileCount, priority: r.priority, kind: r.kind, attempts: r.attempts, lastError: r.lastError})),
    needsHuman: needsHuman.map(r => ({id: r.id, path: r.path, lastError: r.lastError})),
  }, null, 2));
  process.exit(0);
}

console.log(`repo sweep — ${ledger.repoHead.slice(0, 9)}`);
console.log(`  units      ${passed.length}/${rows.length} passed   ${JSON.stringify(byStatus)}`);
console.log(`  files      ${filesCovered}/${ledger.totals.sweepableFiles} covered (${pct(filesCovered)})  ` +
  `+ ${ledger.totals.excludedFiles} excluded by rule`);
if (needsHuman.length) {
  console.log(yellow(`  needs human (${needsHuman.length}):`));
  for (const r of needsHuman) console.log(`    ${r.id} — ${r.lastError || 'no reason recorded'}`);
}
if (nextN) {
  console.log(`  next ${Math.min(nextN, open.length)}:`);
  for (const r of open.slice(0, nextN)) console.log(`    [p${r.priority} ${r.kind}] ${r.id} (${r.fileCount} files)`);
}
if (passed.length === rows.length) console.log(green('  SWEEP COMPLETE'));
else if (open.length) console.log(red(`  ${open.length} unit(s) still open`));
// Nothing open but not complete means every remainder is parked — the line has run dry,
// which is a different situation from "still working" and must not read as progress.
else console.log(yellow(`  nothing left to sweep — ${needsHuman.length} unit(s) parked for a human`));
