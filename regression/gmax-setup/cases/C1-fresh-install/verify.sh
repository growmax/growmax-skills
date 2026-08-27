#!/usr/bin/env bash
# C1 — run the deterministic install steps headlessly, then assert the install contract.
# Usage: bash verify.sh /tmp/eval-gmax-c1   (exit 0 = every assertion passed)
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/_common.sh"

target="${1:?usage: verify.sh <target-dir>}"
cd "$target"
install_gmax "$GMAX_MODULE"

check ".gmax-version matches module VERSION"        cmp -s .gmax-version "$GMAX_MODULE/VERSION"
check "agents/ installed"                           test -f agents/orchestrator.md
check "skills/ installed"                           test -f skills/workflow/SKILL.md
check "standards/ installed"                        test -f standards/architecture-structure.md
check "workflow.config.md installed"                test -f workflow.config.md
check "void/README.md installed"                    test -f void/README.md
check "Claude shim tree installed"                  test -f .claude/agents/builder.md
check "shim points at canonical persona"            grep -q "agents/builder.md" .claude/agents/builder.md
check "pre-existing AGENTS.md content preserved"    grep -q "Always run npm test before committing" AGENTS.md
check "gmax block appended under marker"            grep -q "<!-- gmax -->" AGENTS.md
check "gmax contract present in AGENTS.md"          grep -q "Agent operating layer" AGENTS.md
check ".gitignore gained void/"                     grep -qxF "void/" .gitignore
check "void/ is git-ignored"                        git check-ignore -q void/README.md
check "standards/ NOT git-ignored (committed)"      bash -c '! git check-ignore -q standards/README.md'
check "existing KB (docs/) untouched"               grep -q "Prices include tax" docs/pricing.md
check "fixture source untouched"                    grep -q "never modify this file" src/server.js

finish
