#!/usr/bin/env node
/**
 * Render a sweep prompt with every placeholder already substituted.
 *
 * The writer and grader prompts name real commands and real paths, and those differ
 * per repo (output dir) and per install (where the plugin is checked out). Rendering
 * them here means an agent never has to do substitution in its head — which is the
 * kind of small clerical task a fresh, empty-context agent gets wrong just often
 * enough to poison a unit.
 *
 * Usage: node <sweep>/scripts/prompt.mjs <writer|grader> <unitId> [--spot-check N]
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import {
  REPO_ROOT, LEDGER_FILE, INVARIANTS, RISK_TYPES, artifactPath, readJson,
} from './lib.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const SWEEP_ROOT = path.dirname(HERE);

const [role, unitId] = process.argv.slice(2);
const argv = process.argv.slice(2);
const spotCheck = argv.includes('--spot-check') ? Number(argv[argv.indexOf('--spot-check') + 1]) : 3;

if (!role || !['writer', 'grader'].includes(role) || !unitId) {
  console.error('usage: prompt.mjs <writer|grader> <unitId> [--spot-check N]');
  process.exit(2);
}

/** A sweep dir outside the repo relativises to ../../.. — show the absolute path instead. */
const displayPath = abs => {
  const rel = path.relative(REPO_ROOT, abs);
  return rel.startsWith('..') ? abs : rel;
};

const ledger = readJson(LEDGER_FILE);
const unit = ledger?.units.find(u => u.id === unitId);
if (!unit) {
  console.error(`unknown unit: ${unitId}`);
  process.exit(2);
}

const invariants = INVARIANTS.length
  ? INVARIANTS.map(s => `- ${s}`).join('\n')
  : [
      '- (no repo-specific invariants configured — see sweep.config.json `invariants`)',
      '- money arithmetic and rounding',
      '- access control on any read or write path',
      '- writes to a database or external system',
      '- logic duplicated from somewhere else',
    ].join('\n');

const rendered = fs.readFileSync(path.join(SWEEP_ROOT, 'prompts', `${role}.md`), 'utf8')
  .replaceAll('{{UNIT_ID}}', unit.id)
  .replaceAll('{{UNIT_PATH}}', unit.path)
  .replaceAll('{{FILE_COUNT}}', String(unit.fileCount))
  .replaceAll('{{FILE_LIST}}', unit.files.map(f => `- \`${f}\``).join('\n'))
  .replaceAll('{{ARTIFACT_PATH}}', displayPath(artifactPath(unit.id)))
  .replaceAll('{{SPOT_CHECK}}', String(spotCheck))
  .replaceAll('{{RISK_TYPES}}', RISK_TYPES.join(' | '))
  .replaceAll('{{INVARIANTS}}', invariants)
  .replaceAll('{{SWEEP}}', SWEEP_ROOT);

if (rendered.includes('{{')) {
  console.error(`prompt.mjs: unsubstituted placeholder left in ${role}.md — refusing to emit a half-rendered prompt`);
  process.exit(2);
}
console.log(rendered);
