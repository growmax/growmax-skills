#!/usr/bin/env node
/** Print one unit's definition (path, files, state) — what a fresh agent needs to start. */
import {LEDGER_FILE, readJson, statePath} from './lib.mjs';

const id = process.argv[2];
const ledger = readJson(LEDGER_FILE);
const unit = ledger?.units.find(u => u.id === id);
if (!unit) {
  console.error(`unknown unit: ${id}`);
  process.exit(2);
}
console.log(JSON.stringify({...unit, state: readJson(statePath(id))}, null, 2));
