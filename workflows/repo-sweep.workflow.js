export const meta = {
  name: 'repo-sweep',
  description: 'Sweep every file in the repo: one fresh writer agent per unit, deterministic verify, adversarial grader, ledger-recorded result',
  whenToUse: 'Long-running, resumable, whole-repository passes where an agent must provably touch every file — documentation backfill, audits, inventories.',
  phases: [
    {title: 'Read', detail: 'one fresh agent per unit, reads every file in that unit and writes its artifact'},
    {title: 'Grade', detail: 'independent fresh agent re-checks the artifact against the code and records the verdict'},
  ],
}

// args: { sweepRoot: "<abs path to skills/repo-sweep>", units: [{id, path, fileCount, priority, kind}, ...], spotCheck?: number }
const SWEEP = args && args.sweepRoot
const units = (args && args.units) || []
const SPOT = (args && args.spotCheck) || 3

if (!SWEEP) {
  log('args.sweepRoot missing — pass the absolute path to the repo-sweep skill directory')
  return {swept: 0, results: []}
}
if (!units.length) {
  log('no open units passed in args.units — nothing to sweep')
  return {swept: 0, results: []}
}

log(`sweeping ${units.length} unit(s); each one gets a fresh writer and a fresh grader`)

const results = await pipeline(
  units,

  // ---- Read -----------------------------------------------------------------
  unit => agent(
    [
      `You are the SWEEP WRITER for unit \`${unit.id}\` (${unit.fileCount} files under ${unit.path}).`,
      ``,
      `Your instructions are rendered for you, with every path and command already`,
      `substituted. Run this first and follow what it says, exactly:`,
      ``,
      `    node ${SWEEP}/scripts/prompt.mjs writer ${unit.id}`,
      ``,
      `Read every file in the unit in full — you have an empty context and will be`,
      `discarded afterwards, so there is nothing to save context for.`,
      `Then run \`node ${SWEEP}/scripts/verify-unit.mjs ${unit.id}\` and fix every error`,
      `it reports, until it prints VERIFY PASS. Do not mark the unit passed — a grader`,
      `does that. Touch no source file and run no writing git command.`,
    ].join('\n'),
    {
      label: `read:${unit.id}`,
      phase: 'Read',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['unitId', 'verified', 'filesRead'],
        properties: {
          unitId: {type: 'string'},
          verified: {type: 'boolean', description: 'did verify-unit.mjs print VERIFY PASS'},
          filesRead: {type: 'integer'},
          notes: {type: 'string'},
        },
      },
    },
  ),

  // ---- Grade ----------------------------------------------------------------
  // Runs regardless of what the writer claims: a writer that reports verified:false
  // still gets graded, because the grader is what actually records a status, and a
  // failed grade is how the strike counter advances toward needs_human.
  (written, unit) => agent(
    [
      `You are the SWEEP GRADER for unit \`${unit.id}\` (${unit.fileCount} files under ${unit.path}).`,
      `You did not write the artifact. Default to FAIL and let evidence change your mind.`,
      ``,
      `Your instructions are rendered for you, with every path and command already`,
      `substituted. Run this first and follow what it says, exactly:`,
      ``,
      `    node ${SWEEP}/scripts/prompt.mjs grader ${unit.id} --spot-check ${SPOT}`,
      ``,
      `The writer reported: ${JSON.stringify(written || {claim: 'no result — writer produced nothing'})}`,
      `Treat that as a claim to be checked, not as evidence.`,
      ``,
      `You MUST end by recording the verdict with ${SWEEP}/scripts/ledger-update.mjs,`,
      `pass or fail.`,
    ].join('\n'),
    {
      label: `grade:${unit.id}`,
      phase: 'Grade',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['unitId', 'verdict', 'recorded'],
        properties: {
          unitId: {type: 'string'},
          verdict: {type: 'string', enum: ['PASS', 'FAIL']},
          recorded: {type: 'boolean', description: 'did ledger-update.mjs run successfully'},
          reasons: {type: 'array', items: {type: 'string'}},
          spotChecked: {type: 'array', items: {type: 'string'}},
        },
      },
    },
  ),
)

const graded = results.filter(Boolean)
const passed = graded.filter(r => r.verdict === 'PASS')
const failed = graded.filter(r => r.verdict !== 'PASS')
const dropped = results.length - graded.length

log(`graded ${graded.length}/${units.length}: ${passed.length} PASS, ${failed.length} FAIL` +
  (dropped ? `, ${dropped} dropped (agent error or skip)` : ''))
if (dropped) log(`dropped units stay open in the ledger and will be picked up by the next run`)

return {
  swept: units.length,
  passed: passed.map(r => r.unitId),
  failed: failed.map(r => ({unitId: r.unitId, reasons: r.reasons || []})),
  dropped,
  note: `authoritative status lives in the sweep state dir — run: node ${SWEEP}/scripts/report.mjs`,
}
