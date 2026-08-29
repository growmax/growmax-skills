#!/usr/bin/env node
/**
 * Step 2 of the sweep: decide, WITHOUT a model, whether a unit's artifact could
 * only have been produced by an agent that actually read every file in it.
 *
 * This is the part that makes "the agent said it was done" unfalsifiable-proof.
 * A model can claim completion; it cannot claim a line count, a symbol that
 * really occurs in a file, or a citation that lands on a non-blank line, without
 * having opened the file. Each check below is exact, cheap, and independent of
 * anything the agent asserts about its own diligence.
 *
 *   1. SHAPE      artifact parses, targets this unit
 *   2. ROSTER     files listed == files in the unit, exactly (no missing, no invented)
 *   3. LINES      every claimed line count matches the file on disk
 *   4. SYMBOLS    every claimed symbol literally occurs in the file it is claimed for
 *   5. CITATIONS  every `path:line` resolves inside the unit to a non-blank line
 *   6. SUBSTANCE  no placeholder prose, no copy-pasted identical roles, risk is
 *                 drawn from the repo's declared vocabulary
 *
 * Exit 0 = pass, 1 = fail. Failures print as a list the writer agent can act on.
 *
 * Usage: node <sweep>/scripts/verify-unit.mjs <unitId> [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import {REPO_ROOT, LEDGER_FILE, RISK_TYPES, artifactPath, readJson, lineCount, green, red} from './lib.mjs';

const unitId = process.argv[2];
const asJson = process.argv.includes('--json');
if (!unitId) {
  console.error('usage: verify-unit.mjs <unitId> [--json]');
  process.exit(2);
}

const ledger = readJson(LEDGER_FILE);
const unit = ledger?.units.find(u => u.id === unitId);
if (!unit) {
  console.error(`unknown unit: ${unitId}`);
  process.exit(2);
}

const errors = [];
const warn = [];
const E = m => errors.push(m);

const PLACEHOLDER = /\b(tbd|todo|lorem ipsum|placeholder|n\/a|not applicable|see above|as described|unknown purpose)\b/i;

const art = readJson(artifactPath(unitId));
if (!art) {
  E(`SHAPE: no readable JSON artifact at ${path.relative(REPO_ROOT, artifactPath(unitId))}`);
} else {
  // 1. SHAPE
  if (art.unitId !== unitId) E(`SHAPE: artifact.unitId is "${art.unitId}", expected "${unitId}"`);
  if (typeof art.summary !== 'string' || art.summary.trim().length < 120)
    E(`SUBSTANCE: summary must be >= 120 chars of real prose (got ${String(art.summary || '').trim().length})`);
  else if (PLACEHOLDER.test(art.summary)) E('SUBSTANCE: summary contains placeholder wording');
  if (!Array.isArray(art.files)) E('SHAPE: artifact.files must be an array');

  if (Array.isArray(art.files)) {
    // 2. ROSTER
    const claimed = art.files.map(f => f && f.path).filter(Boolean);
    const claimedSet = new Set(claimed);
    const expected = new Set(unit.files);
    const missing = unit.files.filter(f => !claimedSet.has(f));
    const extra = claimed.filter(f => !expected.has(f));
    const dupes = claimed.filter((f, i) => claimed.indexOf(f) !== i);
    if (missing.length) E(`ROSTER: ${missing.length} unit file(s) not covered: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' …' : ''}`);
    if (extra.length) E(`ROSTER: ${extra.length} file(s) claimed that are not in this unit: ${extra.slice(0, 8).join(', ')}`);
    if (dupes.length) E(`ROSTER: duplicate entries: ${[...new Set(dupes)].join(', ')}`);

    const roles = [];
    for (const entry of art.files) {
      if (!entry || !entry.path || !expected.has(entry.path)) continue;
      const abs = path.join(REPO_ROOT, entry.path);
      let actualLines = null;
      let text = '';
      try {
        text = fs.readFileSync(abs, 'utf8');
        actualLines = lineCount(abs);
      } catch {
        E(`LINES: cannot read ${entry.path}`);
        continue;
      }

      // 3. LINES — an exact number you cannot produce without opening the file.
      if (entry.lines !== actualLines)
        E(`LINES: ${entry.path} claims ${entry.lines} lines, file has ${actualLines}`);

      // 4. SYMBOLS — every named symbol must literally occur in that file.
      const syms = Array.isArray(entry.symbols) ? entry.symbols : [];
      if (actualLines > 5 && syms.length === 0)
        E(`SYMBOLS: ${entry.path} (${actualLines} lines) lists no symbols`);
      for (const s of syms) {
        if (typeof s !== 'string' || !s.trim()) {
          E(`SYMBOLS: ${entry.path} has an empty symbol entry`);
          continue;
        }
        if (!text.includes(s)) E(`SYMBOLS: "${s}" does not occur in ${entry.path}`);
      }

      // 6a. RISK — must be one of the vocabulary this repo declared, not free text.
      if (entry.risk !== undefined && !RISK_TYPES.includes(entry.risk))
        E(`RISK: ${entry.path} has risk "${entry.risk}", not one of: ${RISK_TYPES.join(', ')}`);

      // 6. SUBSTANCE
      const role = typeof entry.role === 'string' ? entry.role.trim() : '';
      if (role.length < 25) E(`SUBSTANCE: ${entry.path} role is too thin ("${role}")`);
      else if (PLACEHOLDER.test(role)) E(`SUBSTANCE: ${entry.path} role contains placeholder wording`);
      else roles.push(role.toLowerCase());
    }

    if (roles.length >= 2) {
      const uniq = new Set(roles).size;
      // Any two files sharing a byte-identical role is templating, at any unit size.
      if (uniq < roles.length) {
        const dup = roles.filter((r, i) => roles.indexOf(r) !== i);
        E(`SUBSTANCE: ${roles.length - uniq} file role(s) are byte-identical to another — templated, not read: "${dup[0].slice(0, 60)}…"`);
      } else if (roles.length >= 4 && uniq / roles.length < 0.6) {
        E(`SUBSTANCE: ${roles.length - uniq} of ${roles.length} file roles are near-duplicates — looks templated, not read`);
      }
    }
  }

  // 5. CITATIONS
  const cites = Array.isArray(art.citations) ? art.citations : [];
  const wantCites = Math.min(3, Math.max(1, Math.ceil(unit.fileCount / 4)));
  if (cites.length < wantCites) E(`CITATIONS: need >= ${wantCites} code citations, got ${cites.length}`);
  for (const c of cites) {
    const m = /^(.+):(\d+)$/.exec(String(c));
    if (!m) {
      E(`CITATIONS: "${c}" is not in path:line form`);
      continue;
    }
    const [, file, lineStr] = m;
    const line = Number(lineStr);
    if (!unit.files.includes(file)) {
      E(`CITATIONS: ${c} points outside this unit`);
      continue;
    }
    const lines = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8').split('\n');
    if (line < 1 || line > lines.length) E(`CITATIONS: ${c} is out of range (file has ${lines.length} lines)`);
    else if (!lines[line - 1].trim()) E(`CITATIONS: ${c} lands on a blank line`);
  }

  if (art.flags && typeof art.flags === 'object') {
    for (const k of ['tenantScoped', 'moneyPath', 'dbWrites']) {
      if (!(k in art.flags)) warn.push(`flags.${k} missing`);
    }
  } else warn.push('flags object missing');
}

const result = {unitId, ok: errors.length === 0, errors, warnings: warn};
if (asJson) console.log(JSON.stringify(result, null, 2));
else {
  if (result.ok) console.log(green(`VERIFY PASS  ${unitId}  (${unit.fileCount} files)`));
  else {
    console.log(red(`VERIFY FAIL  ${unitId}`));
    for (const e of errors) console.log(`  - ${e}`);
  }
  for (const w of warn) console.log(`  ~ ${w}`);
}
process.exit(result.ok ? 0 : 1);
