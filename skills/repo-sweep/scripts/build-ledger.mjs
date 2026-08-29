#!/usr/bin/env node
/**
 * Step 1 of the sweep: turn the repository into a finite, checkable work list.
 *
 * Enumerates every tracked file, drops the ones no reading agent should spend a
 * token on (binaries, lockfiles, generated output) WITH a recorded reason, and
 * packs the rest into "units" small enough that one fresh agent can hold a whole
 * unit in an empty context.
 *
 * The packing is a recursive greedy walk of the directory tree: descend until a
 * directory fits under MAX_FILES/MAX_BYTES, then emit it as one unit. Every
 * sweepable file therefore lands in exactly one unit — asserted at the end, so a
 * partitioning bug fails loudly instead of silently dropping files.
 *
 * Re-running is safe and expected: existing per-unit state is preserved, and a
 * unit whose content hash moved is flipped back to `stale` so the sweep redoes it.
 *
 * Repo-agnostic: what to skip and what to sweep first come from lib.mjs, which
 * reads them from an optional per-repo sweep.config.json.
 *
 * Usage: node <sweep>/scripts/build-ledger.mjs [--max-files N] [--max-bytes N]
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  REPO_ROOT, CONFIG, LEDGER_FILE, STATE_DIR, classify, priorityOf, trackedFiles,
  headSha, hashUnit, unitIdFor, readJson, writeJsonAtomic, statePath, green, yellow,
} from './lib.mjs';

const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? def : Number(argv[i + 1]);
};
const MAX_FILES = flag('max-files', CONFIG.maxFiles || 25);
const MAX_BYTES = flag('max-bytes', CONFIG.maxBytes || 220_000);

const all = trackedFiles();
const excluded = [];
const sweepable = [];

for (const f of all) {
  const reason = classify(f.path);
  if (reason) excluded.push({path: f.path, reason});
  else {
    let bytes = 0;
    try {
      bytes = fs.statSync(path.join(REPO_ROOT, f.path)).size;
    } catch {
      bytes = 0;
    }
    sweepable.push({...f, bytes});
  }
}

if (!sweepable.length) {
  console.error(`FATAL: nothing to sweep — all ${all.length} tracked file(s) matched an exclude rule.`);
  console.error('Check the `exclude` rules in your sweep.config.json.');
  process.exit(1);
}

// --- build the directory tree -------------------------------------------------
const makeNode = dir => ({dir, children: new Map(), files: [], totalFiles: 0, totalBytes: 0});
const root = makeNode('.');

for (const f of sweepable) {
  const parts = f.path.split('/');
  let node = root;
  node.totalFiles++;
  node.totalBytes += f.bytes;
  for (let i = 0; i < parts.length - 1; i++) {
    const dir = parts.slice(0, i + 1).join('/');
    if (!node.children.has(parts[i])) node.children.set(parts[i], makeNode(dir));
    node = node.children.get(parts[i]);
    node.totalFiles++;
    node.totalBytes += f.bytes;
  }
  node.files.push(f);
}

// --- pack into units ----------------------------------------------------------
const units = [];
const emit = (dir, files, suffix = '') => {
  if (!files.length) return;
  const id = unitIdFor(dir) + suffix;
  const best = files.map(f => priorityOf(f.path)).sort((a, b) => a.rank - b.rank)[0];
  units.push({
    id,
    path: dir,
    kind: best.label,
    priority: best.rank,
    fileCount: files.length,
    bytes: files.reduce((s, f) => s + f.bytes, 0),
    contentHash: hashUnit(files),
    files: files.map(f => f.path),
  });
};

const collectFiles = node => {
  const out = [];
  const drain = n => {
    out.push(...n.files);
    for (const c of n.children.values()) drain(c);
  };
  drain(node);
  return out.sort((a, b) => (a.path < b.path ? -1 : 1));
};

const fits = (files) =>
  files.length <= MAX_FILES && files.reduce((s, f) => s + f.bytes, 0) <= MAX_BYTES;

/**
 * Pack a node. A directory that fits becomes one unit. A directory that does not
 * is broken into "atoms" — whole subdirectories that fit, plus its loose files —
 * which are then bin-packed back together so we get few coherent units instead of
 * hundreds of one-file ones. An atom that is itself too big recurses.
 */
const pack = node => {
  const own = collectFiles(node);
  if (fits(own)) {
    emit(node.dir, own);
    return;
  }

  const atoms = [];
  for (const child of [...node.children.values()].sort((a, b) => (a.dir < b.dir ? -1 : 1))) {
    const childFiles = collectFiles(child);
    if (fits(childFiles)) atoms.push({dir: child.dir, files: childFiles});
    else pack(child);
  }
  for (const f of node.files.slice().sort((a, b) => (a.path < b.path ? -1 : 1))) {
    atoms.push({dir: node.dir, files: [f]});
  }

  // Greedy bin-pack the fitting atoms in path order, so a unit stays a contiguous
  // slice of the tree and its files still read as one coherent thing.
  let bin = [];
  let part = 0;
  const flush = () => {
    if (!bin.length) return;
    part++;
    emit(node.dir, bin, `--part${part}`);
    bin = [];
  };
  for (const atom of atoms) {
    if (bin.length && !fits([...bin, ...atom.files])) flush();
    bin.push(...atom.files);
  }
  flush();
};

pack(root);

// --- completeness assertion: the whole point of this file ---------------------
const seen = new Set();
for (const u of units) for (const f of u.files) {
  if (seen.has(f)) {
    console.error(`FATAL: ${f} landed in more than one unit`);
    process.exit(1);
  }
  seen.add(f);
}
if (seen.size !== sweepable.length) {
  console.error(`FATAL: partition lost files — ${seen.size} packed vs ${sweepable.length} sweepable`);
  process.exit(1);
}
const dupIds = units.map(u => u.id).filter((id, i, a) => a.indexOf(id) !== i);
if (dupIds.length) {
  console.error(`FATAL: duplicate unit ids: ${[...new Set(dupIds)].join(', ')}`);
  process.exit(1);
}

units.sort((a, b) => a.priority - b.priority || (a.path < b.path ? -1 : 1));

// --- merge existing state (resumability) --------------------------------------
fs.mkdirSync(STATE_DIR, {recursive: true});
let carried = 0;
let staled = 0;
for (const u of units) {
  const prev = readJson(statePath(u.id));
  if (!prev) {
    writeJsonAtomic(statePath(u.id), {
      unitId: u.id, status: 'pending', attempts: 0, contentHash: u.contentHash,
      lastError: null, verifiedAtSha: null, history: [],
    });
    continue;
  }
  if (prev.contentHash !== u.contentHash && prev.status === 'passed') {
    writeJsonAtomic(statePath(u.id), {
      ...prev, status: 'stale', contentHash: u.contentHash,
      history: [...(prev.history || []), {event: 'content-changed', from: prev.contentHash, to: u.contentHash}],
    });
    staled++;
  } else if (prev.contentHash !== u.contentHash) {
    writeJsonAtomic(statePath(u.id), {...prev, contentHash: u.contentHash});
    carried++;
  } else carried++;
}

// Prune state for units that no longer exist (repacking changed their id). Their
// artifacts are left on disk, but they no longer count toward coverage — an orphan
// state file would otherwise inflate the "passed" tally with work for a unit that
// is not in the ledger any more.
let pruned = 0;
const liveIds = new Set(units.map(u => u.id));
for (const f of fs.readdirSync(STATE_DIR)) {
  if (!f.endsWith('.json')) continue;
  if (liveIds.has(f.slice(0, -5))) continue;
  fs.rmSync(path.join(STATE_DIR, f));
  pruned++;
}

const excludedByReason = {};
for (const e of excluded) excludedByReason[e.reason] = (excludedByReason[e.reason] || 0) + 1;

writeJsonAtomic(LEDGER_FILE, {
  version: 1,
  repoHead: headSha(),
  configFile: CONFIG._configFile ? path.relative(REPO_ROOT, CONFIG._configFile) : null,
  config: {maxFiles: MAX_FILES, maxBytes: MAX_BYTES},
  totals: {
    trackedFiles: all.length,
    sweepableFiles: sweepable.length,
    excludedFiles: excluded.length,
    units: units.length,
  },
  excludedByReason,
  excluded,
  units,
});

const relLedger = path.relative(REPO_ROOT, LEDGER_FILE);
console.log(green(`ledger written: ${units.length} units -> ${relLedger.startsWith('..') ? LEDGER_FILE : relLedger}`));
console.log(`  config       ${CONFIG._configFile ? path.relative(REPO_ROOT, CONFIG._configFile) : 'none (built-in defaults)'}`);
console.log(`  tracked      ${all.length}`);
console.log(`  sweepable    ${sweepable.length}  (${units.length} units, ` +
  `max ${Math.max(...units.map(u => u.fileCount))} files / ` +
  `${Math.round(Math.max(...units.map(u => u.bytes)) / 1024)}KB per unit)`);
console.log(`  excluded     ${excluded.length}  ${JSON.stringify(excludedByReason)}`);
if (staled) console.log(yellow(`  ${staled} previously-passed unit(s) went stale (content moved)`));
if (carried) console.log(`  ${carried} unit state(s) carried forward`);
if (pruned) console.log(yellow(`  ${pruned} orphaned state file(s) pruned (units were repacked)`));
