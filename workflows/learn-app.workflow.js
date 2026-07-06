export const meta = {
  name: 'learn-app-v2',
  description: 'Build/refresh the product notebook (docs/product/) — deterministic engine',
  // NOTE: this is the full static MENU of possible phases, always shown in this order for BOTH
  // run modes. Any single run uses only a subset — the rest are skipped and (in the progress tree)
  // look identical to "pending". The detail text says which mode each belongs to so a skipped
  // phase is legible: [build only] and [update only] phases are blank in the other mode.
  phases: [
    { title: 'Check state', detail: '[always] mode + repo facts (cached, resume-sticky)' },
    { title: 'Read code', detail: '[build only] complete surface/module inventory (data, not files)' },
    { title: 'Explore app', detail: '[build only, needs URL] read-only live walk' },
    { title: 'Fold answers', detail: '[update only] merge answered ledger questions — SKIPPED if 0 answered' },
    { title: 'Find changes', detail: '[update only] diff base + affected modules' },
    { title: 'Write notes', detail: '[always] parallel scribe shards, budget-guarded waves' },
    { title: 'Fact-check', detail: '[always, if audit on] sample [code] claims, re-verify vs source' },
    { title: 'Assemble notebook', detail: '[always] INDEX/architecture/runbook/glossary/suggestions + ledger upsert' },
    { title: 'Verify format', detail: '[always] disk-vs-data set checks, format compliance' },
    { title: 'Commit', detail: '[always] redaction gate + single git commit' },
  ],
}

/*
 * INVARIANTS (the whole design hangs on these — do not weaken):
 * 1. Overwrite-idempotency: every agent-written file is a deterministic full-file overwrite;
 *    sole exception: open-questions.md is UPSERT-by-Q-id (assembly adds > maxQId only; fold is
 *    the only stage that rewrites existing entries).
 * 2. One writer per file per run: shards → modules/<slug>.md only; assembly → top-level files;
 *    manifest-writer → nav-manifest.json; nothing else writes anything.
 * 3. Only the Commit stage commits. No other agent runs git write commands.
 * 4. No credential values in any prompt (this journal is durable and resumable).
 * 5. Resume = re-invoke with IDENTICAL args + resumeFromRunId. Mode/HEAD come from the cached
 *    Preflight call, never from disk re-detection. `timestamp` (YYYY-MM-DD) appears only in
 *    shard/fold/assembly prompts.
 * 6. Tally is computed HERE by set equality (never trusted from an agent's count).
 */

// ---------- args & knobs ----------
// `args` may arrive as an object, a JSON string, or undefined (meta-extraction probe) — normalize.
let _rawArgs = typeof args !== 'undefined' ? args : {}
if (typeof _rawArgs === 'string') { try { _rawArgs = JSON.parse(_rawArgs) } catch (e) { _rawArgs = {} } }
const A = Object.assign(
  {
    repoRoot: null,          // REQUIRED absolute path to the target repo
    target: null,            // optional URL/localhost:port → enables the walk
    scope: null,             // optional focus brief
    timestamp: null,         // REQUIRED 'YYYY-MM-DD' (scripts cannot call Date.now)
    modeHint: null,          // advisory only; Preflight decides
    shardSize: 8,
    walkBatchSize: 6,
    maxWalkWaves: 3,
    walkScope: 'priority',   // 'priority' (default: W + gated surfaces first, capped) | 'all'
    priorityWalkCap: 40,     // max surfaces walked per run under walkScope 'priority'
    maxWalkBatchesPerRun: 8, // hard batch cap per run — partial walks are first-class; resume continues
    waveSize: 4,             // parallel shards per wave
    audit: true,
    budgetPerShardEst: 120000,
    landingReserve: 150000,
    // agent overrides — defaults are the production agents; the harness may substitute a
    // registered agent when validating before the v2 agent is installed in the running plugin.
    scribeAgent: 'growmax-skills:product-scribe-v2',
    censusAgent: 'growmax-skills:flow-census',
    walkerAgent: 'growmax-skills:nav-cartographer',
  },
  _rawArgs || {}
)
if (!A.repoRoot) throw new Error('args.repoRoot is required (absolute path to the target repo)')
if (!A.timestamp) throw new Error("args.timestamp is required ('YYYY-MM-DD')")

const SCRIBE = A.scribeAgent
const CENSUS_AGENT = A.censusAgent
const WALKER = A.walkerAgent
const NB = `${A.repoRoot}/docs/product`
const MANIFEST = `${A.repoRoot}/docs/nav-manifest.json`

// ---------- helpers ----------
const chunk = (arr, n) => {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}
const bail = (why, committed) => ({
  partial: true,
  why,
  committed: committed || null,
  resume: 'Re-invoke the Workflow tool with the SAME scriptPath and IDENTICAL args, plus resumeFromRunId set to THIS run id (shown in the Workflow tool result). Args must be byte-identical or the cache is lost.',
})
const needBudget = (tokens) => !budget.total || budget.remaining() > tokens

// set-equality tally: returns {ok, missing[], extra[], dupes[]}
const tally = (censusIds, placedLists) => {
  const seen = new Map()
  for (const list of placedLists) for (const id of list) seen.set(id, (seen.get(id) || 0) + 1)
  const missing = censusIds.filter((id) => !seen.has(id))
  const extra = [...seen.keys()].filter((id) => !censusIds.includes(id))
  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id)
  return { ok: !missing.length && !extra.length && !dupes.length, missing, extra, dupes }
}

// ---------- schemas (shallow; mirror the agents' own report contracts) ----------
const S = {
  PREFLIGHT: {
    type: 'object',
    additionalProperties: true,
    required: ['headSha', 'indexExists', 'maxQId', 'answeredCount', 'uiSurface'],
    properties: {
      headSha: { type: 'string' },
      indexExists: { type: 'boolean' },
      notebookLastCommitSha: { type: ['string', 'null'] },
      manifestSeededAt: { type: ['string', 'null'] },
      maxQId: { type: 'integer' },        // highest Q-id across ledger + archive; 0 if none
      answeredCount: { type: 'integer' }, // ANSWERED-but-unfolded entries
      uiSurface: { type: 'boolean' },     // repo has web pages / mobile screens
      overlayFacts: { type: ['string', 'null'] }, // distilled .claude/E2E-NOTES.md facts, secrets excluded
      minNoteFormatVersion: { type: ['integer', 'null'] },
      notes: { type: 'string' },
    },
  },
  CENSUS: {
    type: 'object',
    additionalProperties: true,
    required: ['surfaces', 'modules'],
    properties: {
      apiShaped: { type: 'boolean' },
      surfaces: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
          required: ['id', 'route', 'rw', 'module'],
          properties: {
            id: { type: 'string' },
            route: { type: 'string' },
            method: { type: ['string', 'null'] },
            rw: { type: 'string', enum: ['R', 'W'] },
            gatedBy: { type: ['string', 'null'] },
            module: { type: 'string' },
          },
        },
      },
      modules: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
          required: ['slug', 'title', 'surfaceIds', 'sourceDirs'],
          properties: {
            slug: { type: 'string' },
            title: { type: 'string' },
            surfaceIds: { type: 'array', items: { type: 'string' } },
            sourceDirs: { type: 'array', items: { type: 'string' } },
            crossCutting: { type: 'boolean' },
          },
        },
      },
      existingDocs: { type: 'array', items: { type: 'string' } },
      notes: { type: 'string' },
    },
  },
  WALK: {
    type: 'object',
    additionalProperties: true,
    required: ['observations'],
    properties: {
      observations: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
          required: ['surfaceId', 'purpose', 'purposeConfidence'],
          properties: {
            surfaceId: { type: 'string' },
            visibility: { type: 'string' },
            rw: { type: 'string' },
            writesAt: { type: 'array', items: { type: 'string' } },
            purpose: { type: 'string' },
            purposeConfidence: { type: 'string', enum: ['confident', 'ambiguous'] },
            flows: { type: 'array', items: { type: 'string' } },
            apiCalls: { type: 'array' },
            notes: { type: 'string' },
          },
        },
      },
      discovered: { type: 'array', items: { type: 'object', additionalProperties: true } },
      blocked: { type: 'array', items: { type: 'object', additionalProperties: true } },
      findings: {
        // Defects observed LIVE (client/schema mismatch, corruption symptoms, broken pages,
        // swallowed errors). Routed to suggestions.md + module notes by assembly; severity
        // 'data-integrity' findings are also logged immediately by the script.
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
          required: ['severity', 'what'],
          properties: {
            severity: { type: 'string', enum: ['data-integrity', 'high', 'medium', 'low'] },
            what: { type: 'string' },
            surfaceId: { type: 'string' },
            evidence: { type: 'string' },
            diagnostic: { type: 'string' },
          },
        },
      },
    },
  },
  SHARD: {
    type: 'object',
    additionalProperties: true,
    required: ['notesWritten', 'surfacesPlaced', 'questions'],
    properties: {
      notesWritten: { type: 'array', items: { type: 'object', additionalProperties: true } },
      surfacesPlaced: { type: 'array', items: { type: 'string' } },
      uncategorized: { type: 'array', items: { type: 'string' } },
      parked: { type: 'array', items: { type: 'object', additionalProperties: true } },
      questions: { type: 'array', items: { type: 'object', additionalProperties: true } },
      suggestions: { type: 'array', items: { type: 'object', additionalProperties: true } },
      glossary: { type: 'array', items: { type: 'object', additionalProperties: true } },
      demotions: { type: 'array' },
      removalsHandled: { type: 'array' },
      notes: { type: 'string' },
    },
  },
  FOLD: {
    type: 'object',
    additionalProperties: true,
    required: ['folded'],
    properties: {
      folded: { type: 'array', items: { type: 'object', additionalProperties: true } },
      contradictions: { type: 'array', items: { type: 'object', additionalProperties: true } },
      promotions: { type: 'array' },
      notes: { type: 'string' },
    },
  },
  DRIFT: {
    type: 'object',
    additionalProperties: true,
    required: ['baseSha', 'affectedModules'],
    properties: {
      baseSha: { type: 'string' },
      commits: { type: 'integer' },
      changedFiles: { type: 'integer' },
      affectedModules: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
          required: ['slug'],
          properties: { slug: { type: 'string' }, changedPaths: { type: 'array', items: { type: 'string' } } },
        },
      },
      newSurfaces: { type: 'array', items: { type: 'object', additionalProperties: true } },
      removedSurfaces: { type: 'array', items: { type: 'object', additionalProperties: true } },
      unusableHistory: { type: 'boolean' },
      notes: { type: 'string' },
    },
  },
  GAPS: {
    type: 'object',
    additionalProperties: true,
    required: ['gaps'],
    properties: {
      gaps: { type: 'array', items: { type: 'object', additionalProperties: true } },
      notesOutdated: { type: 'array', items: { type: 'string' } },
    },
  },
  AUDIT: {
    type: 'object',
    additionalProperties: true,
    required: ['checked', 'correct'],
    properties: {
      checked: { type: 'integer' },
      correct: { type: 'integer' },
      wrong: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
  },
  VERIFY: {
    type: 'object',
    additionalProperties: true,
    required: ['pass'],
    properties: {
      pass: { type: 'boolean' },
      violations: { type: 'array', items: { type: 'object', additionalProperties: true } },
      counts: { type: 'object', additionalProperties: true },
    },
  },
  COMMIT: {
    type: 'object',
    additionalProperties: true,
    required: ['committed'],
    properties: {
      committed: { type: 'boolean' },
      sha: { type: ['string', 'null'] },
      redactionFindings: { type: 'array', items: { type: 'string' } },
    },
  },
}

// ---------- Phase: Preflight (cached → mode is resume-sticky) ----------
phase('Check state')
const pre = await agent(
  `Read-only preflight for the learn-app engine on the repo at ${A.repoRoot}. Report exactly:
- headSha: current git HEAD short sha.
- indexExists: does ${NB}/INDEX.md exist?
- notebookLastCommitSha: last commit that touched docs/product/ (git log -1 --format=%h -- docs/product), or null.
- manifestSeededAt: the seeded_at_commit value inside ${MANIFEST} if the file exists, else null.
- maxQId: the highest Q-<number> found in ${NB}/open-questions.md AND ${NB}/open-questions-archive.md (0 if neither exists).
- answeredCount: entries in open-questions.md (excluding any archive section) whose '**Your answer:**' line has real content (not the empty '_' placeholder).
- uiSurface: does the repo have a UI surface (web pages/components or mobile screens), true/false.
- overlayFacts: if ${A.repoRoot}/.claude/E2E-NOTES.md exists, a 5-line distillation of its facts (base URL, roles, naming/teardown, gotchas) — NEVER include passwords/tokens/secret values, replace them with '<in E2E-NOTES>'. Else null.
- minNoteFormatVersion: the lowest format_version across ${NB}/modules/*.md frontmatter (null if no notes).
Do not modify anything.`,
  { label: 'preflight', phase: 'Check state', schema: S.PREFLIGHT, model: 'haiku', effort: 'low' }
)
const mode = pre.indexExists ? 'update' : 'bootstrap'
log(`mode=${mode} (hint was ${A.modeHint || 'none'}) · HEAD=${pre.headSha} · maxQId=${pre.maxQId} · answered=${pre.answeredCount} · ui=${pre.uiSurface} · spent=${budget.spent()}`)
// State the plan so skipped phases in the tree are expected, not confusing.
if (mode === 'update') {
  const skips = ['Read code', 'Explore app']
  if (pre.answeredCount === 0) skips.push('Fold answers (0 answered)')
  log(`plan (update): Check state → ${pre.answeredCount > 0 ? 'Fold answers → ' : ''}Find changes → Write notes → ${A.audit ? 'Fact-check → ' : ''}Assemble → Verify → Commit. Phases shown-but-skipped: ${skips.join(', ')}.`)
} else {
  log(`plan (build): Check state → Read code${A.target ? ' → Explore app' : ''} → Write notes → ${A.audit ? 'Fact-check → ' : ''}Assemble → Verify → Commit. Shown-but-skipped: Fold answers, Find changes${A.target ? '' : ', Explore app'}.`)
}

if (!needBudget(A.landingReserve + A.budgetPerShardEst)) {
  return bail('budget too low to start any useful work', null)
}

// Q-id ranges: fold gets [maxQId+1 .. maxQId+20]; shard i gets the 20-block after that.
const FOLD_RANGE = { start: pre.maxQId + 1, end: pre.maxQId + 20 }
const shardRange = (i) => ({ start: pre.maxQId + 21 + i * 20, end: pre.maxQId + 21 + i * 20 + 19 })

let report = { mode, headSha: pre.headSha }

// ============================================================ BOOTSTRAP ====
if (mode === 'bootstrap') {
  // ---------- Census ----------
  phase('Read code')
  let census
  if (pre.manifestSeededAt && pre.manifestSeededAt === pre.headSha) {
    census = await agent(
      `Load the existing census from ${MANIFEST} (it was seeded at the current HEAD, so it is fresh). Convert its surfaces into the requested structure (id, route, method, rw, gatedBy, module) and derive the module list (slug, title, surfaceIds, sourceDirs — infer sourceDirs from the repo layout). List existing product-relevant docs (README, docs/*.md). Read-only.`,
      { label: 'census:reload', phase: 'Read code', schema: S.CENSUS, model: 'haiku', effort: 'low' }
    )
    log(`census reloaded from fresh manifest · ${census.surfaces.length} surfaces`)
  } else {
    census = await agent(
      `Census the ENTIRE app at ${A.repoRoot} per your contract (routes, API operations, role/middleware gating, R/W classification, existing specs).${A.scope ? ` Focus brief (filters the frontier, you still enumerate everything it touches): ${A.scope}.` : ''}
Additionally, for THIS dispatch return the data in the requested structure:
- surfaces[]: one row per route/operation — id (short stable slug like 'orders.confirm'), route, method (null for pages), rw (R|W — default W when unsure), gatedBy (middleware/role or 'public'), module (its module slug).
- modules[]: derived from THIS repo's own route mounts/groups (7 mounts = 7 modules; never pad to a target count) — slug, title, surfaceIds, sourceDirs (the code dirs that implement it), crossCutting=true for zero-surface library modules that concentrate business rules (pricing/status/money libs) — include those as modules too.
- existingDocs[]: paths of product-relevant docs worth merging (README, docs/*.md).
- apiShaped: true if headless API (no rendered pages).
You are READ-ONLY: return data, write no files.`,
      { label: 'census:full', phase: 'Read code', schema: S.CENSUS, agentType: CENSUS_AGENT, effort: 'high' }
    )
    log(`census complete · ${census.surfaces.length} surfaces · ${census.modules.length} modules · spent=${budget.spent()}`)
  }
  const censusIds = census.surfaces.map((s) => s.id)
  report.denominator = censusIds.length
  report.modules = census.modules.map((m) => m.slug)

  // ---------- Walk (optional; sequential — one browser; PRIORITY-FIRST + batch-capped) ----------
  phase('Explore app')
  const walkObservations = []
  const walkBlocked = []
  const walkFindings = []
  let walkPartial = null
  if (A.target) {
    // Priority tiers: W surfaces first (money-path/write actions), then gated reads, then the tail.
    const prio = (s) => (s.rw === 'W' ? 0 : s.gatedBy && s.gatedBy !== 'public' ? 1 : 2)
    let ordered = [...census.surfaces].sort((a, b) => prio(a) - prio(b))
    if (A.walkScope !== 'all' && ordered.length > A.priorityWalkCap) {
      ordered = ordered.slice(0, A.priorityWalkCap)
      log(`walk scope 'priority': walking top ${ordered.length}/${census.surfaces.length} surfaces (W + gated first). Pass walkScope:'all' to walk everything.`)
    }
    let frontier = ordered.map((s) => ({ id: s.id, route: s.route, method: s.method }))
    const walkedIds = new Set()
    const knownRoutes = new Set(census.surfaces.map((s) => s.route))
    let batchesRun = 0
    outer: for (let wave = 0; wave < A.maxWalkWaves && frontier.length; wave++) {
      const batches = chunk(frontier, A.walkBatchSize)
      const discoveredThisWave = []
      for (const batch of batches) {
        if (batchesRun >= A.maxWalkBatchesPerRun) {
          walkPartial = `batch cap ${A.maxWalkBatchesPerRun} reached — walked ${walkedIds.size}/${ordered.length} planned surfaces; resume continues from the rest`
          log(`walk paused: ${walkPartial}`)
          break outer
        }
        if (!needBudget(A.landingReserve)) {
          walkPartial = `budget guard — walked ${walkedIds.size}/${ordered.length} planned surfaces`
          break outer
        }
        const w = await agent(
          `Walk these ${batch.length} surfaces of the app at ${A.target} (repo: ${A.repoRoot}) per your contract — READ-ONLY, ledger mode: never execute any write/submit/delete (walk up to it and stop; record it in writesAt), never ask interactive questions (mark unclear purposes purposeConfidence='ambiguous').
Auth: anonymous, OR the dev/test login the repo itself documents in plaintext${pre.overlayFacts ? ` (overlay facts: ${pre.overlayFacts})` : ''}. NEVER type credentials from anywhere else; a page needing auth you don't have → blocked with reason.
Surfaces (id · route): ${JSON.stringify(batch)}
ALSO return findings[]: any defect you OBSERVE live (client/schema mismatch, error responses on valid actions, corruption symptoms like impossible enum values, broken/blank pages, swallowed errors shown as fake empty states) — severity 'data-integrity'|'high'|'medium'|'low', with evidence and (for data issues) a READ-ONLY diagnostic query if you can derive one. Observing is not fixing: never mutate anything.
HYGIENE: save any screenshots to the scratch/temp directory ONLY — never into the repo working tree.
Return observations keyed by surfaceId, newly discovered links (route + label + fromSurfaceId), blocked surfaces, and findings.`,
          { label: `walk:w${wave + 1}`, phase: 'Explore app', schema: S.WALK, agentType: WALKER }
        )
        batchesRun++
        if (!w) continue
        for (const o of w.observations || []) { walkObservations.push(o); walkedIds.add(o.surfaceId) }
        for (const b of w.blocked || []) walkBlocked.push(b)
        for (const f of w.findings || []) {
          walkFindings.push(f)
          if (f.severity === 'data-integrity') log(`🚨 DATA-INTEGRITY finding (surface ${f.surfaceId || '?'}): ${f.what}${f.diagnostic ? ' · diagnostic: ' + f.diagnostic : ''}`)
        }
        for (const d of w.discovered || []) if (d.route && !knownRoutes.has(d.route)) { knownRoutes.add(d.route); discoveredThisWave.push(d) }
        log(`walk wave ${wave + 1}: +${(w.observations || []).length} observed, +${(w.findings || []).length} findings, +${(w.discovered || []).length} discovered · batches ${batchesRun}/${A.maxWalkBatchesPerRun} · spent=${budget.spent()}`)
        frontier = frontier.filter((s) => !walkedIds.has(s.id))
      }
      frontier = discoveredThisWave.map((d, i) => ({ id: `discovered.${wave + 1}.${i + 1}`, route: d.route, method: null }))
    }
    report.walk = { walked: walkedIds.size, planned: ordered.length, total: census.surfaces.length, findings: walkFindings.length, partial: walkPartial }
  } else {
    log('walk skipped (no target — code-only run)')
  }

  // ---------- Manifest (single writer, once) ----------
  const manifestPayload = {
    app: A.repoRoot.split('/').pop(), seeded_at_commit: pre.headSha,
    walk: A.target ? `target ${A.target}` : 'none (code-only run)',
    api_only_mapping: census.apiShaped ? 'API-shaped: surface=METHOD path, nav_path null, roles carry the middleware gate' : undefined,
    walk_partial: walkPartial || undefined,
    surfaces: census.surfaces, walkObservations, walkBlocked, walkFindings,
  }
  await agent(
    `Write ${MANIFEST} as a single JSON file (full overwrite) from exactly this payload — pretty-printed, nothing added or removed:\n${JSON.stringify(manifestPayload)}`,
    { label: 'manifest:write', phase: 'Explore app', model: 'haiku', effort: 'low' }
  )

  // ---------- Write (parallel shard waves, budget-guarded) ----------
  phase('Write notes')
  const shards = chunk(census.modules, census.modules.length > 10 ? A.shardSize : census.modules.length || 1)
  log(`write plan: ${census.modules.length} modules → ${shards.length} shard(s), waves of ≤${A.waveSize}`)
  const shardResults = []
  const shardPrompt = (modsSlice, range, extra) => {
    const ids = new Set(modsSlice.flatMap((m) => m.surfaceIds))
    const surfaceRows = census.surfaces.filter((s) => ids.has(s.id))
    const obs = walkObservations.filter((o) => ids.has(o.surfaceId))
    return `MODE: bootstrap-shard. Repo: ${A.repoRoot}. Notebook: ${NB}. Timestamp: ${A.timestamp}. verified_at_commit: ${pre.headSha}.
Your assigned modules (write ONLY these ${NB}/modules/<slug>.md files): ${JSON.stringify(modsSlice)}
Their census surfaces: ${JSON.stringify(surfaceRows)}
Walk observations for your surfaces (may be empty): ${JSON.stringify(obs)}
Existing docs you may merge from (only what's relevant to YOUR modules): ${JSON.stringify(census.existingDocs || [])}
Your Q-id range: Q-${String(range.start).padStart(3, '0')} .. Q-${String(range.end).padStart(3, '0')} (use in order, gaps fine).
${A.scope ? `Scope brief: ${A.scope}.` : ''}${extra || ''}
Follow your bootstrap-shard contract exactly: full-file overwrites, provenance tags on every claim, questions/suggestions/glossary returned as DATA, tally ID-arrays honest.`
  }
  let shardIdx = 0
  for (const wave of chunk(shards, A.waveSize)) {
    const est = wave.length * A.budgetPerShardEst + A.landingReserve
    if (!needBudget(est)) {
      const c = await commitStage('partial bootstrap — budget guard tripped')
      return Object.assign(report, bail(`budget guard before shard wave (needed ~${est}, remaining ${budget.remaining()})`, c && c.sha))
    }
    const results = await parallel(
      wave.map((mods) => {
        const idx = shardIdx++
        return () => agent(shardPrompt(mods, shardRange(idx)), { label: `shard:${mods.map((m) => m.slug).join(',')}`.slice(0, 60), phase: 'Write notes', schema: S.SHARD, agentType: SCRIBE })
      })
    )
    for (const r of results) if (r) shardResults.push(r)
    if (results.some((r) => !r)) log('⚠ a shard returned null (skipped/died) — tally check will catch any gap')
    log(`shard wave done (${shardResults.length}/${shards.length} shards total) · spent=${budget.spent()}`)
  }

  // ---------- Tally (computed here, set equality) ----------
  let t = tally(censusIds, shardResults.map((r) => [...(r.surfacesPlaced || []), ...(r.uncategorized || []), ...((r.parked || []).map((p) => p.id))]))
  if (!t.ok) {
    log(`⚠ tally mismatch: missing=${t.missing.length} extra=${t.extra.length} dupes=${t.dupes.length} — one remediation dispatch`)
    const missingModules = census.modules.filter((m) => m.surfaceIds.some((id) => t.missing.includes(id)))
    if (missingModules.length && needBudget(A.budgetPerShardEst + A.landingReserve)) {
      const fix = await agent(shardPrompt(missingModules, shardRange(shardIdx++), `\nREMEDIATION: a prior shard under-covered these surface ids: ${JSON.stringify(t.missing)} — ensure every one is placed/uncategorized/parked in your return.`), { label: 'shard:remediation', phase: 'Write notes', schema: S.SHARD, agentType: SCRIBE })
      if (fix) shardResults.push(fix)
      t = tally(censusIds, shardResults.map((r) => [...(r.surfacesPlaced || []), ...(r.uncategorized || []), ...((r.parked || []).map((p) => p.id))]))
    }
  }
  report.tally = t.ok ? `OK ${censusIds.length}=${censusIds.length}` : `MISMATCH missing=${t.missing.join(',')} extra=${t.extra.join(',')} dupes=${t.dupes.join(',')}`
  log(`tally: ${report.tally}`)

  // ---------- Audit (before assembly so its result lands in INDEX via the single writer) ----------
  phase('Fact-check')
  let audit = null
  if (A.audit && needBudget(A.landingReserve)) {
    audit = await agent(
      `Audit the notebook at ${NB} (repo ${A.repoRoot}). Deterministic sample: take module notes in alphabetical slug order; from each, take the FIRST claim in 'Business rules' tagged [code]; stop at 10 claims. For each, open the actual source and verify the claim is true. Return checked, correct, wrong[{file, claim, why}]. READ-ONLY — write nothing; your data goes to the assembly stage.`,
      { label: 'audit:sample', phase: 'Fact-check', schema: S.AUDIT, model: 'sonnet' }
    )
    if (audit) log(`audit: ${audit.correct}/${audit.checked} sampled [code] claims verified · wrong=${(audit.wrong || []).length}`)
  } else {
    log('audit skipped (disabled or budget)')
  }

  // ---------- Assembly (single writer of top-level files; ledger upsert) ----------
  phase('Assemble notebook')
  await agent(
    `MODE: assembly. Repo: ${A.repoRoot}. Notebook: ${NB}. Timestamp: ${A.timestamp}. HEAD: ${pre.headSha}. UI surface: ${pre.uiSurface}. Ledger upsert floor: maxQId=${pre.maxQId} (add ONLY entries above this; never modify existing entries or their answers).
Census summary: ${JSON.stringify({ apiShaped: census.apiShaped, moduleCount: census.modules.length, surfaceCount: censusIds.length, modules: census.modules.map((m) => ({ slug: m.slug, title: m.title, n: m.surfaceIds.length, crossCutting: !!m.crossCutting })) })}
Script-verified tally: ${report.tally}
Shard returns (your inputs for INDEX/ledger/glossary/suggestions): ${JSON.stringify(shardResults)}
Walk summary: ${JSON.stringify({ observed: walkObservations.length, blocked: walkBlocked.length, target: A.target, partial: walkPartial })}
Walk FINDINGS (defects observed live — rank into suggestions.md by severity, data-integrity first, and reflect each in the affected module note as a [walk]-tagged correction where the code-only claim was wrong): ${JSON.stringify(walkFindings)}
Audit result for the Coverage & Confidence block (include an '- Audit:' line if non-null): ${JSON.stringify(audit)}
Follow your assembly contract exactly: write INDEX.md (≤200 lines, Coverage & Confidence computed from these inputs), architecture.md (5 sections), runbook.md, ${pre.uiSurface ? 'ui-patterns.md, ' : ''}glossary.md, suggestions.md; UPSERT open-questions.md with the shards' questions (id order, template format, status header). Full-file overwrites everywhere except the ledger upsert.`,
    { label: 'assembly', phase: 'Assemble notebook', agentType: SCRIBE }
  )
  log(`assembly done · spent=${budget.spent()}`)

  report = await verifyAuditCommit(report, censusIds, shardResults, 'bootstrap')
  return report
}

// ============================================================== UPDATE ====
if (mode === 'update') {
  // ---------- Fold ----------
  phase('Fold answers')
  if (pre.answeredCount > 0) {
    const f = await agent(
      `MODE: fold. Repo: ${A.repoRoot}. Notebook: ${NB}. Fold date: ${A.timestamp}. Discrepancy Q-id range: Q-${FOLD_RANGE.start} .. Q-${FOLD_RANGE.end}. Follow your fold contract exactly (human-vs-code conflict rule; archive file move; answer text replaced with fold-pointer; status header).`,
      { label: 'fold', phase: 'Fold answers', schema: S.FOLD, agentType: SCRIBE }
    )
    report.folded = f ? (f.folded || []).length : 0
    report.contradictions = f ? (f.contradictions || []).length : 0
    log(`fold: ${report.folded} folded, ${report.contradictions} contradictions filed`)
  } else {
    report.folded = 0
    log('fold skipped (no answered entries)')
  }

  // ---------- Drift ----------
  phase('Find changes')
  const drift = await agent(
    `Compute the notebook drift for ${A.repoRoot}. Base = the last commit that touched docs/product/ (git log -1 --format=%h -- docs/product); if that is missing/unusable, fall back to the newest verified_at_commit in ${NB}/modules/*.md frontmatter and say so (unusableHistory=true if neither works). Then git diff --name-only <base>..HEAD; map changed SOURCE files to module slugs using ${NB}/INDEX.md's module table + notes' sourceDirs/Connections (read-only judgment). Also list newSurfaces (routes/operations added since base — route + suggested module) and removedSurfaces. Exclude docs/product/ itself from 'changed'. READ-ONLY; run only read git commands.`,
    { label: 'drift', phase: 'Find changes', schema: S.DRIFT, model: 'sonnet', effort: 'low' }
  )
  log(`DRIFT: base=${drift.baseSha} · ${drift.commits || '?'} commits · ${drift.changedFiles || 0} files · ${drift.affectedModules.length} modules affected · new=${(drift.newSurfaces || []).length} removed=${(drift.removedSurfaces || []).length}`)
  report.drift = { base: drift.baseSha, affected: drift.affectedModules.map((m) => m.slug) }

  // ---------- Format-gap scan ----------
  const gaps = await agent(
    `Scan ${NB} for format gaps vs the current contract (read-only, return data): notes missing format_version or with format_version < 1; missing required artifacts (architecture.md, runbook.md${pre.uiSurface ? ', ui-patterns.md' : ''}); INDEX missing the Coverage & Confidence block; ledger missing the status header; notes missing an 'Edge cases & error handling' section. Return gaps[{file, gap}] and notesOutdated[slugs].`,
    { label: 'format-scan', phase: 'Find changes', schema: S.GAPS, model: 'haiku', effort: 'low' }
  )
  const gapsBySlug = {}
  for (const g of gaps.gaps || []) {
    const m = (g.file || '').match(/modules\/([^/]+)\.md/)
    if (m) (gapsBySlug[m[1]] = gapsBySlug[m[1]] || []).push(g.gap)
  }

  // ---------- Refresh shard waves ----------
  phase('Write notes')
  const affected = drift.affectedModules
  const outdatedOnly = (gaps.notesOutdated || []).filter((s) => !affected.some((m) => m.slug === s)).map((slug) => ({ slug, changedPaths: [] }))
  const workList = [...affected, ...outdatedOnly]
  if (!workList.length && !(drift.newSurfaces || []).length) {
    log('no drift and no format gaps — notebook already current')
  } else {
    const shards = chunk(workList, workList.length > 10 ? A.shardSize : workList.length || 1)
    log(`refresh plan: ${workList.length} modules → ${shards.length} shard(s)`)
    let i = 0
    const refreshResults = []
    for (const wave of chunk(shards, A.waveSize)) {
      const est = wave.length * A.budgetPerShardEst + A.landingReserve
      if (!needBudget(est)) {
        const c = await commitStage('partial refresh — budget guard tripped')
        return Object.assign(report, bail(`budget guard before refresh wave (needed ~${est}, remaining ${budget.remaining()})`, c && c.sha))
      }
      const results = await parallel(
        wave.map((mods) => {
          const idx = i++
          const newForThese = (drift.newSurfaces || []).filter((s) => mods.some((m) => m.slug === (s.module || s.suggestedModule)))
          const removedForThese = (drift.removedSurfaces || []).filter((s) => mods.some((m) => m.slug === s.module))
          return () =>
            agent(
              `MODE: refresh-shard. Repo: ${A.repoRoot}. Notebook: ${NB}. Timestamp: ${A.timestamp}. New verified_at_commit: ${pre.headSha}. Drift base: ${drift.baseSha}.
Your assigned modules (write ONLY these ${NB}/modules/<slug>.md): ${JSON.stringify(mods)}
New surfaces in your modules: ${JSON.stringify(newForThese)} · Removed: ${JSON.stringify(removedForThese)}
Format gaps to backfill in YOUR notes: ${JSON.stringify(mods.map((m) => ({ slug: m.slug, gaps: gapsBySlug[m.slug] || [] })))}
Your Q-id range: Q-${shardRange(idx).start} .. Q-${shardRange(idx).end}.
Follow your refresh-shard contract exactly.`,
              { label: `refresh:${mods.map((m) => m.slug).join(',')}`.slice(0, 60), phase: 'Write notes', schema: S.SHARD, agentType: SCRIBE }
            )
        })
      )
      for (const r of results) if (r) refreshResults.push(r)
      log(`refresh wave done · spent=${budget.spent()}`)
    }
    report.refreshed = refreshResults.flatMap((r) => (r.notesWritten || []).map((n) => n.slug))
    report.newQuestions = refreshResults.reduce((n, r) => n + (r.questions || []).length, 0)

    // ---------- Audit (touched notes only) ----------
    phase('Fact-check')
    let audit = null
    if (A.audit && needBudget(A.landingReserve)) {
      audit = await agent(
        `Audit ONLY these refreshed notes in ${NB}/modules: ${JSON.stringify(report.refreshed)}. Deterministic sample: first [code]-tagged Business-rules claim per note, max 10; verify each against the source in ${A.repoRoot}. Return checked/correct/wrong. READ-ONLY.`,
        { label: 'audit:refresh', phase: 'Fact-check', schema: S.AUDIT, model: 'sonnet' }
      )
      if (audit) log(`audit: ${audit.correct}/${audit.checked} verified`)
    }

    // ---------- Assembly touch-up ----------
    phase('Assemble notebook')
    await agent(
      `MODE: assembly-touchup. Repo: ${A.repoRoot}. Notebook: ${NB}. Timestamp: ${A.timestamp}. HEAD: ${pre.headSha}. Ledger upsert floor: maxQId=${pre.maxQId}.
Drift summary: ${JSON.stringify(report.drift)} · Refresh shard returns: ${JSON.stringify(refreshResults)}
Audit result for the confidence block: ${JSON.stringify(audit)}
Top-level format gaps to backfill: ${JSON.stringify((gaps.gaps || []).filter((g) => !/modules\//.test(g.file || '')))}
Follow your assembly-touchup contract: INDEX counts + Coverage & Confidence regenerated; architecture/runbook refreshed only where the drift touched them; ledger upsert of the new questions; suggestions/glossary merged.`,
      { label: 'assembly:touchup', phase: 'Assemble notebook', agentType: SCRIBE }
    )
  }

  report = await verifyAuditCommit(report, null, null, 'update')
  return report
}

// ---------- shared closing stages ----------
async function commitStage(message) {
  phase('Commit')
  return agent(
    `Commit the notebook in ${A.repoRoot}. Steps, exactly: (1) redaction gate — grep docs/product and docs/nav-manifest.json for Bearer tokens, 'eyJ' JWT prefixes, Authorization headers with values, password-looking strings; ANY finding → do NOT commit, return committed=false with the findings. (2) hygiene sweep — check 'git status --porcelain' for stray walk artifacts (page-*.png, screenshot files, .playwright-mcp/) in the working tree; DELETE any found (they belong in scratch, never the repo) and note it. (3) Then: git add docs/product docs/nav-manifest.json && git commit -m "docs(product): ${message}" — return committed=true and the short sha. Never push. Never add other paths.`,
    { label: 'commit', phase: 'Commit', schema: S.COMMIT, model: 'haiku', effort: 'low' }
  )
}

async function verifyAuditCommit(rep, censusIds, shardResults, label) {
  phase('Verify format')
  const expectedSlugs = shardResults ? shardResults.flatMap((r) => (r.notesWritten || []).map((n) => n.slug)) : null
  let v = await agent(
    `Verify the notebook at ${NB} against reality (read-only, return data):
- modules on disk: glob modules/*.md${expectedSlugs ? `; set-compare slugs against expected ${JSON.stringify(expectedSlugs)} (missing/unexpected = violation)` : ''}.
- every note: frontmatter complete (incl. format_version), every claim line carries a provenance tag, 'Edge cases & error handling' section present.
- INDEX.md exists, ≤~220 lines, has the Coverage & Confidence block; its counts match enumerable sets (recount).
- open-questions.md: status header present; well-formed entries; Q-id uniqueness across ledger + archive.
- cross-links resolve (no dead relative links).
- required artifacts exist: architecture.md, runbook.md${pre.uiSurface ? ', ui-patterns.md' : ''}.
Return pass, violations[{file, rule, detail}], counts{notesOnDisk, untagged, duplicateQIds, deadLinks}.`,
    { label: 'verify', phase: 'Verify format', schema: S.VERIFY, model: 'haiku', effort: 'low' }
  )
  if (v && !v.pass && (v.violations || []).length && needBudget(A.landingReserve)) {
    log(`verify found ${(v.violations || []).length} violation(s) — one backfill pass`)
    await agent(
      `MODE: ${label === 'update' ? 'assembly-touchup' : 'assembly'} (BACKFILL dispatch). Repo: ${A.repoRoot}. Notebook: ${NB}. Timestamp: ${A.timestamp}. Fix EXACTLY these verified violations and nothing else (respect all write-scope and ledger-upsert rules; module-note violations may be fixed in place as full-file rewrites of those notes): ${JSON.stringify(v.violations)}`,
      { label: 'backfill', phase: 'Verify format', agentType: SCRIBE }
    )
    v = await agent(
      `Re-verify the notebook at ${NB} — same checks as before, return the same structure.`,
      { label: 'verify:2', phase: 'Verify format', schema: S.VERIFY, model: 'haiku', effort: 'low' }
    )
  }
  rep.verify = v ? { pass: v.pass, violations: (v.violations || []).length } : { pass: false, violations: -1 }

  const c = await commitStage(`${label} via learn-app-v2 engine`)
  rep.commit = c && c.committed ? c.sha : `NOT COMMITTED${c && c.redactionFindings && c.redactionFindings.length ? ' — redaction findings: ' + c.redactionFindings.join('; ') : ''}`
  rep.tokensSpent = budget.spent()
  log(`done: verify.pass=${rep.verify.pass} · commit=${rep.commit} · spent=${rep.tokensSpent}`)
  return rep
}
