/**
 * Shared helpers for the repo sweep harness.
 *
 * The sweep exists to answer one question with evidence instead of trust:
 * did an autonomous agent actually process every file in this repository?
 *
 * The load-bearing idea is that NO MODEL EVER DECIDES COMPLETENESS.
 * A script enumerates the work from `git ls-files`, a script decides whether a
 * unit's output is acceptable, and a script counts what is left. The agents only
 * produce artifacts; the filesystem is the source of truth about progress.
 *
 * This file is REPO-AGNOSTIC. Everything a specific repository wants to say about
 * itself — what to skip, what to sweep first, which invariants matter — lives in
 * an optional `sweep.config.json`, never in this code. See references/config.md.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** The repo being swept is wherever the process was started, not where this script lives. */
export function findRepoRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {encoding: 'utf8'}).trim();
  } catch {
    console.error('sweep: not inside a git repository — the ledger is built from `git ls-files`.');
    process.exit(2);
  }
}

export const REPO_ROOT = findRepoRoot();

/** Config lookup order: env override, repo root, then inside the output dir. */
function loadConfig() {
  const candidates = [
    process.env.SWEEP_CONFIG,
    path.join(REPO_ROOT, 'sweep.config.json'),
    path.join(REPO_ROOT, '.sweeprc.json'),
    path.join(REPO_ROOT, 'docs/sweep/sweep.config.json'),
  ].filter(Boolean);
  for (const file of candidates) {
    try {
      return {...JSON.parse(fs.readFileSync(file, 'utf8')), _configFile: file};
    } catch (err) {
      // A config that exists but does not parse is a bug worth failing on — silently
      // falling back to defaults would change which files get swept without telling anyone.
      if (err.code !== 'ENOENT') {
        console.error(`sweep: ${file} is not valid JSON — ${err.message}`);
        process.exit(2);
      }
    }
  }
  return {_configFile: null};
}

export const CONFIG = loadConfig();

// path.resolve, not path.join: an absolute SWEEP_OUT_DIR must escape the repo, not be
// appended to it (path.join('/repo', '/tmp/x') is '/repo/tmp/x', which silently writes
// the whole sweep INTO the repo being swept).
export const SWEEP_DIR = path.resolve(REPO_ROOT, process.env.SWEEP_OUT_DIR || CONFIG.outDir || 'docs/sweep');
export const STATE_DIR = path.join(SWEEP_DIR, 'state');
// Overridable so the self-test can fabricate artifacts in a scratch directory
// instead of clobbering a real one a sweep agent is writing right now.
export const UNITS_DIR = process.env.SWEEP_UNITS_DIR || path.join(SWEEP_DIR, 'units');
export const LEDGER_FILE = path.join(SWEEP_DIR, 'ledger.json');

/** Files that are real work for a reading agent. Everything else is EXCLUDED, with a reason. */
export const DEFAULT_EXCLUDE_RULES = [
  [/\.(png|jpe?g|gif|webp|ico|svg|bmp|pdf|ttf|otf|woff2?|eot|mp4|mp3|wav|zip|gz|tar|jar|keystore|jks|ipa|apk|aab|aar|so|dylib|dll|exe|wasm|bin|pyc|class)$/i, 'binary-asset'],
  [/(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb|Gemfile\.lock|Podfile\.lock|poetry\.lock|Cargo\.lock|go\.sum|composer\.lock|uv\.lock)$/, 'lockfile'],
  [/(^|\/)__snapshots__\//, 'test-snapshot'],
  [/\.snap$/, 'test-snapshot'],
  [/(^|\/)(dist|build|out|target|coverage|vendor|\.next|\.nuxt|\.expo|\.venv|node_modules)\//, 'build-output'],
  [/\.(generated|gen)\.(ts|tsx|js|jsx|py|go|rb|java|cs)$/, 'generated'],
  [/(^|\/)generated\//, 'generated'],
  [/(^|\/)(schema|schema-snapshot[^/]*)\.gql$/, 'generated'],
  [/(^|\/)migrations\/.*\.(sql|py)$/, 'migration'],
  [/(^|\/)(locales|i18n|translations)\/.*\.json$/, 'translation-data'],
  [/\.(min\.js|min\.css|map)$/, 'minified'],
];

/**
 * Ranking patterns — earlier entries sweep first, so a partial run still covers
 * what matters. The defaults key on WORDS, not on one repo's directory layout, so
 * they land somewhere sensible in any codebase; a repo that wants better ordering
 * sets `priority` in sweep.config.json.
 */
export const DEFAULT_PRIORITY_RULES = [
  [/(pricing|money|invoice|payment|billing|ledger|tax|currency|refund|charge|checkout|credit-note|debit-note)/i, 1, 'money-path'],
  [/(tenant|organi[sz]ation|auth|rbac|permission|policy|casbin|guard|session|token|password|crypto|secret)/i, 1, 'security-auth'],
  [/(schema|migration|model|entity|prisma|repositor|dao|database|\bdb\b)/i, 2, 'data-model'],
  [/(^|\/)(src|lib|app|server|api|core|services?|handlers?|controllers?)\//i, 3, 'application-code'],
  [/(^|\/)(components?|pages?|screens?|views?|ui)\//i, 4, 'ui-surface'],
  [/(^|\/)(packages?|modules?|internal|pkg)\//i, 4, 'shared-package'],
  [/(test|spec|__tests__|e2e|fixtures?)/i, 5, 'tests'],
  [/(^|\/)(scripts?|tools?|deploy|infra|ci|\.github)\//i, 5, 'tooling'],
  [/(^|\/)docs?\//i, 5, 'docs'],
];

const compileRules = (raw, arity) => {
  if (!Array.isArray(raw)) return null;
  return raw.map(rule => {
    const [pattern, ...rest] = rule;
    let re;
    try {
      re = pattern instanceof RegExp ? pattern : new RegExp(pattern, rule.flags || 'i');
    } catch (err) {
      console.error(`sweep: bad regex in config — ${pattern}: ${err.message}`);
      process.exit(2);
    }
    return [re, ...rest].slice(0, arity);
  });
};

export const EXCLUDE_RULES = [
  ...(compileRules(CONFIG.exclude, 2) || []),
  ...(CONFIG.replaceDefaultExcludes ? [] : DEFAULT_EXCLUDE_RULES),
];

export const PRIORITY_RULES = [
  ...(compileRules(CONFIG.priority, 3) || []),
  ...(CONFIG.replaceDefaultPriorities ? [] : DEFAULT_PRIORITY_RULES),
];

/**
 * Repo-specific things a reader should be watching for, injected into the writer and
 * grader prompts. Empty by default: a generic sweep still flags money and auth risk,
 * but a repo that states its own invariants gets them checked on every unit.
 */
export const INVARIANTS = Array.isArray(CONFIG.invariants) ? CONFIG.invariants : [];

export const RISK_TYPES = Array.isArray(CONFIG.riskTypes) && CONFIG.riskTypes.length
  ? CONFIG.riskTypes
  : ['none', 'tenant', 'money', 'auth', 'data-loss', 'perf'];

/**
 * The sweep's own output, when it lives inside the repo and gets committed, is generated
 * data — not work. Without this the second run sweeps its own ledger and artifacts, which
 * inflates the denominator with files no one wants read and grows every run.
 */
const SWEEP_REL = path.relative(REPO_ROOT, SWEEP_DIR);
const SELF_PREFIX = SWEEP_REL && !SWEEP_REL.startsWith('..') ? `${SWEEP_REL}/` : null;

export function classify(file) {
  if (SELF_PREFIX && file.startsWith(SELF_PREFIX)) return 'sweep-output';
  for (const [re, reason] of EXCLUDE_RULES) if (re.test(file)) return reason;
  return null;
}

export function priorityOf(file) {
  for (const [re, rank, label] of PRIORITY_RULES) if (re.test(file)) return {rank, label};
  return {rank: 6, label: 'other'};
}

/** `git ls-files -s` gives us the blob sha per path — an exact, free content fingerprint. */
export function trackedFiles() {
  const out = execFileSync('git', ['ls-files', '-s', '-z'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  const files = [];
  for (const rec of out.split('\0')) {
    if (!rec) continue;
    const tab = rec.indexOf('\t');
    if (tab === -1) continue;
    const [, sha] = rec.slice(0, tab).split(/\s+/);
    files.push({path: rec.slice(tab + 1), sha});
  }
  return files.sort((a, b) => (a.path < b.path ? -1 : 1));
}

export function headSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {cwd: REPO_ROOT, encoding: 'utf8'}).trim();
  } catch {
    return 'no-commits';
  }
}

export function hashUnit(files) {
  const h = createHash('sha1');
  for (const f of files) h.update(`${f.path}:${f.sha}\n`);
  return h.digest('hex').slice(0, 12);
}

export function unitIdFor(dirPath) {
  return (dirPath === '.' ? 'root' : dirPath).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

/** Atomic write — concurrent agents each own their own state file, so no lock is needed. */
export function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

export function statePath(unitId) {
  return path.join(STATE_DIR, `${unitId}.json`);
}

export function artifactPath(unitId) {
  return path.join(UNITS_DIR, `${unitId}.json`);
}

export function lineCount(absFile) {
  const buf = fs.readFileSync(absFile);
  if (buf.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] === 10) n++;
  if (buf[buf.length - 1] !== 10) n++;
  return n;
}

/** Where the sweep scripts themselves live, for prompts that must name a command. */
export const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);

export const green = s => `\x1b[32m${s}\x1b[0m`;
export const red = s => `\x1b[31m${s}\x1b[0m`;
export const yellow = s => `\x1b[33m${s}\x1b[0m`;
