#!/usr/bin/env node
/**
 * Does the harness actually catch a lying agent?
 *
 * This is the sweep auditing itself. It synthesises a CORRECT artifact for a real
 * unit straight from the files on disk (so it needs no model), confirms the
 * verifier accepts it, and then applies one targeted lie at a time — the exact
 * lies a degraded agent tells — and asserts each one is caught, by name.
 *
 * If any mutation slips through, the sweep's "N/324 passed" number is worthless
 * and this exits non-zero. Run it in CI alongside the sweep.
 *
 * Usage: node <sweep>/scripts/selftest.mjs [unitId]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import url from 'node:url';
import {
  REPO_ROOT, LEDGER_FILE, readJson, writeJsonAtomic, lineCount, green, red,
} from './lib.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));

// Fabricated artifacts go to a scratch directory, never over a real one — a sweep
// may be running right now and its writer agents own docs/sweep/units/.
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'sweep-selftest-'));
process.env.SWEEP_UNITS_DIR = SCRATCH;
const ledger = readJson(LEDGER_FILE);
if (!ledger) {
  console.error('no ledger — run build-ledger.mjs first');
  process.exit(2);
}

// Default to a small, cheap, text-only unit so the self-test runs in a second.
const unit = process.argv[2]
  ? ledger.units.find(u => u.id === process.argv[2])
  : ledger.units.filter(u => u.fileCount >= 2 && u.fileCount <= 4 && u.bytes < 120_000)[0];
if (!unit) {
  console.error('no suitable unit found');
  process.exit(2);
}

const verify = () => {
  try {
    return JSON.parse(execFileSync('node', [path.join(HERE, 'verify-unit.mjs'), unit.id, '--json'], {encoding: 'utf8'}));
  } catch (err) {
    return JSON.parse((err.stdout || '{"ok":false,"errors":["verifier crashed"]}').toString());
  }
};

/** Build a truthful artifact mechanically — the control case. */
const buildTruthful = () => {
  const files = unit.files.map((p, i) => {
    const abs = path.join(REPO_ROOT, p);
    const text = fs.readFileSync(abs, 'utf8');
    // Pull real identifiers out of the file so `symbols` are true by construction.
    const syms = [...new Set((text.match(/\b[A-Za-z_$][A-Za-z0-9_$]{4,}\b/g) || []))].slice(0, 3);
    return {
      path: p,
      lines: lineCount(abs),
      role: `Self-test control entry number ${i + 1} describing the specific contents of ${path.basename(p)} in this unit.`,
      symbols: syms,
      risk: 'none',
    };
  });
  const firstFile = unit.files[0];
  const lines = fs.readFileSync(path.join(REPO_ROOT, firstFile), 'utf8').split('\n');
  const citeLine = lines.findIndex(l => l.trim()) + 1;
  return {
    unitId: unit.id,
    summary: `Self-test control artifact for ${unit.id}. It is generated mechanically from the files on disk so that every claim it makes is true by construction, which is what lets the mutations below isolate one lie at a time.`,
    files,
    citations: [`${firstFile}:${citeLine}`],
    flags: {tenantScoped: 'n/a', moneyPath: false, dbWrites: false},
    openQuestions: [],
  };
};

const dest = path.join(SCRATCH, `${unit.id}.json`);

// A real tracked file that is NOT in this unit — assuming one by name ("package.json")
// would silently turn the out-of-unit citation case into a false pass in a repo where
// that file happens to live in the sampled unit.
const outsideFile = ledger.units.flatMap(u => (u.id === unit.id ? [] : u.files))[0];
if (!outsideFile) {
  console.error('self-test needs a second unit to source an out-of-unit citation from');
  process.exit(2);
}

const cases = [
  ['CONTROL — a truthful artifact', a => a, null],
  ['skips a file', a => ({...a, files: a.files.slice(0, -1)}), 'ROSTER'],
  ['invents a file that is not in the unit', a => ({...a, files: [...a.files, {...a.files[0], path: '__sweep_selftest__/not-a-real-file.ts'}]}), 'ROSTER'],
  ['claims a line count it did not read', a => ({...a, files: a.files.map((f, i) => (i ? f : {...f, lines: f.lines + 7}))}), 'LINES'],
  ['names a symbol that is not in the file', a => ({...a, files: a.files.map((f, i) => (i ? f : {...f, symbols: [...f.symbols, 'ZzTotallyInventedSymbol']}))}), 'SYMBOLS'],
  ['cites a line past the end of the file', a => ({...a, citations: [`${unit.files[0]}:999999`]}), 'CITATIONS'],
  ['cites a file outside its own unit', a => ({...a, citations: [`${outsideFile}:1`]}), 'CITATIONS'],
  ['templates the same role onto every file', a => ({...a, files: a.files.map(f => ({...f, role: 'This file is part of the module and contains related implementation code.'}))}), 'SUBSTANCE'],
  ['uses a risk value outside the declared vocabulary', a => ({...a, files: a.files.map((f, i) => (i ? f : {...f, risk: 'probably-fine'}))}), 'RISK'],
  ['pads the summary with a placeholder', a => ({...a, summary: 'TBD — see above. '.repeat(12)}), 'SUBSTANCE'],
];

let failures = 0;
console.log(`self-test on unit ${unit.id} (${unit.fileCount} files)\n`);

for (const [name, mutate, expectClass] of cases) {
  writeJsonAtomic(dest, mutate(buildTruthful()));
  const r = verify();
  const caught = !r.ok && (!expectClass || r.errors.some(e => e.startsWith(expectClass)));
  const want = expectClass ? `rejected as ${expectClass}` : 'accepted';
  const got = r.ok ? 'accepted' : `rejected (${[...new Set(r.errors.map(e => e.split(':')[0]))].join(', ')})`;
  const pass = expectClass ? caught : r.ok;
  if (!pass) failures++;
  console.log(`${pass ? green('  caught ') : red('  MISSED ')} ${name.padEnd(46)} want ${want}, got ${got}`);
  if (!pass && !expectClass) for (const e of r.errors) console.log(`             ${e}`);
}

fs.rmSync(SCRATCH, {recursive: true, force: true});

console.log('');
if (failures) {
  console.log(red(`SELF-TEST FAILED — ${failures} lie(s) got through. Sweep coverage numbers cannot be trusted.`));
  process.exit(1);
}
console.log(green('SELF-TEST PASSED — every fabricated artifact was rejected, the truthful one accepted.'));
