# gsecure refactor — report-only defect handling (issue filing replaces the fix path)

**Goal:** The gsecure flow ENDS when the tests have run. A red test is
triaged, and a PRODUCTION-DEFECT verdict is reported as a git issue — the
flow never fixes production code, in any phase, under any authority.

**Architecture:** Delete the FIX PATH from the workflow contract and every
role; replace it with an ISSUE PATH owned by the master (the only role
allowed external side effects). Triage still classifies; its
PRODUCTION-DEFECT output becomes an issue payload (evidence chain + minimal
repro) instead of a fix-plan seed. The host dependency "feature pipeline
(fix path)" becomes "an issue tracker + CLI". Test-side iteration
(TEST-BUG → implementer, CAUSE-WRONG → designer) is untouched — that is not
production fixing.

**Base:** the staged-but-uncommitted `gsecure/` tree on
`feat/gmax-operating-layer` (35 staged files, all new). No other in-flight
sibling edits to gsecure detected.

---

## Decision points (defaults chosen; override with one word)

- **D1 — End-state of a phase whose tests exposed a defect.**
  DECIDED (user, 2026-09-01): the defect-exposing test is committed,
  annotated as KNOWN-DEFECT with the issue reference (host-named runner
  mechanism, e.g. an expected-fail marker or a skip-with-issue-link
  recorded in the triage log — host's choice at adoption), and the phase
  gate counts issue-linked reds as TRACKED, not as failures. The issue
  tracker owns the production fix; when a fix later lands, the host's own
  pipeline un-marks the test. The phase merges and moves on.
- **D2 — Who files the issue.** Default: the master, from the triage
  verdict, dedup-checked against open issues before filing. Triage writes
  nothing (unchanged).
- **D3 — TEST-BUG / CAUSE-WRONG / INTENT-UNDECIDABLE handling.** Default:
  unchanged (test-side iteration only; INTENT-UNDECIDABLE still aggregates
  to the batch report).
- **D4 — The other two skill flows.** Default: `existing-code-flow.md`
  loses its "fix if the task permits" sentences (3C, Phase 8);
  `refactor-protection-flow.md`'s fix language is scoped to an explicitly
  requested refactor task only; `new-feature-flow.md` untouched (it builds
  features — it is not a bug-fix path). Confirm.
- **D5 — Issue format.** Default: a fixed body format embedded in
  AGENTS.md §8 (title, authority tag, contract source, evidence
  `file:line`, minimal repro, blast radius, labels `gsecure` +
  `production-defect`) — no new template file, V1 simplicity.

---

## Task 1: Rewrite the phase loop in `gsecure/AGENTS.md` (the contract)

**Files:** Modify `gsecure/AGENTS.md`

- §1 premise: "That authority belongs only to triage and the fix path (§5)"
  → "...belongs only to triage; production defects are REPORTED as issues,
  never fixed here (§5)."
- §2 shared invariant 3: "Never change production code outside the fix
  path (§5)" → "Never change production code. There is no fix path; a
  production defect becomes a git issue (§5)."
- §3 authority table: `spec` row "If its test fails: Production code is
  wrong until proven otherwise" — keep; the consequence is now an issue,
  not a fix (wording already neutral, verify).
- §4 roles table: DELETE the `planner / builder / verifier / reviewer`
  fix-path row. Update `test-orchestrator` authority: "Routes triage
  verdicts, sizes fix paths" → "Routes triage verdicts, files defect
  issues". Update `test-verifier` authority: drop "post-fix confirmation".
- §5 phase loop diagram: replace the whole `FIX PATH` block with:
  ```
  PRODUCTION-DEFECT → ISSUE PATH:
     master files a git issue from the triage verdict
     (dedup-checked; body per §8) → triage-log row: Route = issue URL,
     Outcome = open/closed → defect test annotated KNOWN-DEFECT with the
     issue reference → phase continues
  ```
  Delete the "Fix-path authority" bullets (trivial/small/standard+ sizing,
  business-behavior stop) — with no fixing there is nothing to size. Keep
  the INTENT-UNDECIDABLE bullet. Keep "Budget: 3 attempts per failing
  unit" (covers TEST-BUG/CAUSE-WRONG loops).
- §6.1 lifecycle step 3: "triage/fix" → "triage/issue".
- §6.1 note about `fix(...)` commits beside `test(...)` commits: delete —
  no fix commits exist anymore.
- §6.3 "Propagate production fixes" bullet: delete (no fixes to propagate).
- §7 human gates table: DELETE the "Business-behavior fix" row (no fixes).
  Batch report row: "defects found and fixed" → "defects found and issues
  filed".
- §8 artifacts table: replace the `fix-<unit>-<defect>.md` row with an
  issue-tracker row ("git issues — master, from triage verdicts —
  production defects the suite found"). Designer row: drop "(updated
  post-fix)". Triage-log format: `Route` example becomes an issue URL;
  `Outcome` example becomes "issue #123 filed, open" / "closed <date>";
  keep the one-row-per-red-test rule. Batch report §2: "the fix plan
  reference, and whether it is fixed or waiting on the human" → "the issue
  link and its state".
- §8: add the defect-issue body format (D5): title = `<unit>: <broken
  promise>`; body = authority tag, contract source (doc section),
  evidence `file:line`, minimal repro (expected/actual), blast radius,
  labels.
- §9 gates table: DELETE the "A production fix inside the fix path" row —
  no gate set applies to production changes anymore.
- §12: "before any triage or fix path" → "before any triage or issue
  filing".

## Task 2: Rewrite `gsecure/agents/test-orchestrator.md`

- Invariant 4 ("Business-behavior fixes stop for the human..."): replace
  with "**You file issues, you never fix.** Every PRODUCTION-DEFECT
  verdict becomes a git issue you file from the triage evidence
  (dedup-checked against open issues). No role in this build changes
  production code — there is nothing to gate."
- Default "Route triage verdicts mechanically; size fix paths with
  judgment": drop the fix-sizing sentence and the host-`planner` seam
  paragraph; PRODUCTION-DEFECT → "file the issue, record the URL in the
  triage log, mark the defect test KNOWN-DEFECT with the issue reference."
- "Commit at verified checkpoints": remove the `fix(<module>): …` prefix
  convention.
- "Escalate immediately": remove "a fix that would change business
  behavior".
- Returns: "defects found and fixed (with plan refs)" → "defects found
  with issue links and states".

## Task 3: Rewrite `gsecure/agents/test-triage.md`

- Verdict table: PRODUCTION-DEFECT "Routed to: fix path (planner → builder
  → verifier → reviewer → test-verifier)" → "the master, who files a git
  issue from your evidence — the flow ends here for this failure".
- Invariant 3: "The fix path is planned from your repro" → "The issue is
  written from your repro — it must stand alone for a stranger who never
  saw this build."
- "Name blast radius": purpose changes from "decide whether to gate the
  fix and propagate it into live worktrees" to "it becomes the issue's
  severity/priority context".
- Intro: "Everything downstream (a mechanics fix, a cause revision, a
  production fix, a human decision)" → "(a mechanics fix, a cause
  revision, an issue, a human decision)".

## Task 4: Rewrite `gsecure/agents/test-verifier.md`

- Drop the second job "Post-fix confirmation" — it no longer exists.
- Invariant 5 ("No production code in a test phase's diff unless a fix
  plan authorizes it"): harden to "No production code in a test phase's
  diff, period — no authorization exists."
- Add the phase-gate rule for D1: every red test in the phase has a triage
  verdict recorded; a PRODUCTION-DEFECT red is gated PASS-able only as
  KNOWN-DEFECT annotated with its issue reference — an unlinked red FAILs
  the phase.
- Delete the "post-fix" defaults ("Check the cause and the code still
  agree", "Post-fix, run wider than the failure").

## Task 5: Rewrite `gsecure/HOST-DEPENDENCIES.md`

- §1 "A feature pipeline (fix path)" → "An issue tracker + CLI" (e.g. GitHub
  + `gh`; the master files issues; dedup via the tracker). Delete the
  fix-plan and planner-seam notes.
- §2: delete "An architecture-conformance gate … runs when the fix path
  touches production code" — or reduce to a note that gsecure never runs
  it since it never touches production code. Prefer delete (V1).
- §6 "Not included by scope decision": add "fixing production defects —
  gsecure reports them as issues; fixing is the host's own pipeline."

## Task 6: Patch `gsecure/skills/unit-testing/references/existing-code-flow.md`

- Phase 3 section C: delete "If the task explicitly includes fixing the
  defect, fix the implementation after the failing test establishes the
  expected behavior." Keep the Finding-recording sentence; extend it: "or
  filed as an issue by the build's ISSUE PATH".
- Phase 8: "preserve the test and fix the production code only when the
  task permits — otherwise record it as a Finding" → "preserve the test
  and record the defect as a Finding for the ISSUE PATH — this flow never
  fixes production code."

## Task 7: Scope-check `gsecure/skills/unit-testing/references/refactor-protection-flow.md`

- Lines ~93, ~120, ~257 mention fixing during a refactor. Verify each is
  scoped to an explicitly requested refactor task (legitimate — that flow
  IS the production-change task) and does not grant defect-fix authority
  inside a test build. Patch only if a line bleeds into test-build
  authority. (Read before editing; do not assume.)

## Task 8: Harness shims + adapter

- `gsecure/harnesses/claude/.claude/commands/test-build.md`: frontmatter
  description "with production-defect fix paths" → "with production-defect
  issue filing"; step 3 delete "production fixes go through the existing
  `planner` / `builder` / `verifier` / `reviewer`".
- `gsecure/harnesses/opencode/.opencode/agents/test-orchestrator.md`:
  description "production-defect fix paths" → "production-defect issue
  filing".
- `gsecure/harnesses/hermes.md`: line 5 "fix path" → "issue path" in the
  AGENTS.md content list.
- Sweep both shim trees for any other "fix path" phrasing (descriptions in
  the 12 shim files) and align.

## Task 9: `gsecure/README.md`

- Layout table: HOST-DEPENDENCIES row "feature pipeline (fix path)" →
  "issue tracker + CLI".
- Opening premise: "the role that writes tests has no authority to weaken
  an expectation to reach green" — keep; add one sentence: the build never
  touches production code; a defect it finds becomes a git issue, and the
  flow ends when the tests have run.
- "Adopting it in a project" step 5: update the HOST-DEPENDENCIES summary
  (feature pipeline → issue tracker).

## Task 10: Verification sweep

- `grep -riE "fix path|fix-|production fix|fix\(" gsecure/` → expect zero
  fix-path residue (legitimate TEST-BUG "implementer fixes mechanics" and
  refactor-flow wording stay).
- Script-check every backticked root-relative path in edited files still
  resolves on disk (known gsecure pitfall: shadowed relative links after
  restructures).
- Re-read AGENTS.md §5 + §8 end to end: confirm the loop diagram, the
  gates table, the artifacts table, and both log formats tell one
  consistent story — tests run → triage → issue → done.
- `git diff --staged --stat gsecure/` to review the full change surface.

---

## Risks / open questions

- D1's KNOWN-DEFECT annotation rubs against the "never skip/weaken"
  invariants; the plan resolves it by making the annotation
  triage-authorized, issue-linked, and counted as TRACKED by the verifier
  — but this is the one real design fork (see D1 alternative).
- Issue dedup depends on the host tracker's searchability; the master must
  search before filing or the tracker floods on re-runs.
- `new-feature-flow.md` deliberately ships production code with its tests
  — out of scope for "no fixing", but confirm (D4).
