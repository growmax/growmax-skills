#!/usr/bin/env node
/**
 * Step 3 of the sweep: the ONLY writer of unit status.
 *
 * Agents never edit state. They call this, and this re-runs the deterministic
 * verifier itself before it will record a pass — so "passed" is a fact the
 * filesystem established, not a claim an agent made about its own work. An agent
 * that asks to be marked passed with a bad artifact gets a failure recorded
 * instead, along with the reasons.
 *
 * Three strikes and the unit is parked as `needs_human` so the sweep can never
 * livelock on one hard unit, and can never fake its way past one either.
 *
 * Usage:
 *   node <sweep>/scripts/ledger-update.mjs <unitId> --status passed  [--note "..."]
 *   node <sweep>/scripts/ledger-update.mjs <unitId> --status failed  --note "grader: ..."
 *   node <sweep>/scripts/ledger-update.mjs <unitId> --status in_progress
 */
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import url from 'node:url';
import {
  LEDGER_FILE, readJson, writeJsonAtomic, statePath, headSha, green, red, yellow,
} from './lib.mjs';

const MAX_ATTEMPTS = Number(process.env.SWEEP_MAX_ATTEMPTS || 3);
const HERE = path.dirname(url.fileURLToPath(import.meta.url));

const [unitId] = process.argv.slice(2);
const argv = process.argv.slice(2);
const arg = name => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : argv[i + 1];
};
const wanted = arg('status');
const note = arg('note') || null;

if (!unitId || !wanted) {
  console.error('usage: ledger-update.mjs <unitId> --status <in_progress|passed|failed|needs_human> [--note "..."]');
  process.exit(2);
}

const ledger = readJson(LEDGER_FILE);
const unit = ledger?.units.find(u => u.id === unitId);
if (!unit) {
  console.error(`unknown unit: ${unitId}`);
  process.exit(2);
}

const prev = readJson(statePath(unitId)) || {unitId, status: 'pending', attempts: 0, history: []};
const history = prev.history || [];

let status = wanted;
let recordedNote = note;

if (wanted === 'passed') {
  // The gate: verification is re-run here, by us, not trusted from the caller.
  let verdict;
  try {
    const out = execFileSync('node', [path.join(HERE, 'verify-unit.mjs'), unitId, '--json'], {encoding: 'utf8'});
    verdict = JSON.parse(out);
  } catch (err) {
    const out = (err.stdout || '').toString();
    try {
      verdict = JSON.parse(out);
    } catch {
      verdict = {ok: false, errors: [`verifier crashed: ${String(err.message).slice(0, 300)}`]};
    }
  }
  if (!verdict.ok) {
    status = 'failed';
    recordedNote = `refused pass — verifier: ${verdict.errors.join(' | ')}`;
  }
}

const attempts = status === 'failed' ? (prev.attempts || 0) + 1 : prev.attempts || 0;
if (status === 'failed' && attempts >= MAX_ATTEMPTS) status = 'needs_human';

const next = {
  unitId,
  status,
  attempts,
  contentHash: unit.contentHash,
  lastError: status === 'passed' ? null : recordedNote,
  verifiedAtSha: status === 'passed' ? headSha() : prev.verifiedAtSha || null,
  history: [...history, {event: status, attempts, note: recordedNote}].slice(-20),
};
writeJsonAtomic(statePath(unitId), next);

const paint = status === 'passed' ? green : status === 'needs_human' ? yellow : status === 'failed' ? red : s => s;
console.log(paint(`${unitId}: ${status}${status === 'failed' ? ` (attempt ${attempts}/${MAX_ATTEMPTS})` : ''}`));
if (recordedNote && status !== 'passed') console.log(`  ${recordedNote}`);
process.exit(status === 'passed' ? 0 : 1);
