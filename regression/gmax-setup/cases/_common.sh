#!/usr/bin/env bash
# Shared sandbox builder + install/update simulators for the gmax-setup cases.
# Sourced by each case's setup.sh / verify.sh — not run directly.
#
# materialize <target-dir>         : copy tinyshop into target, git init, base commit
# install_gmax <gmax-root>         : the DETERMINISTIC part of gmax/skills/setup/SKILL.md
#                                    (Steps 1-3) executed from the sandbox root — the human-
#                                    question steps (4-6) are agent work and out of scope here
# update_gmax <gmax-root>          : commands/gmax-update.md Steps 2+4, executed headlessly
#                                    (the human confirm is assumed YES; guard paths return early)
# preflight_existing_install       : setup Step 0.2 guard — exit 0 when an install is present
# check <desc> <cmd...> / finish   : tiny assert helpers; finish exits non-zero on any failure
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE_DIR="$HERE/../fixtures/tinyshop"
GMAX_MODULE="$(cd "$HERE/../../.." && pwd)/gmax"   # the vendored module in this repo

materialize() {
  local target="$1"
  rm -rf "$target" && mkdir -p "$target"
  cp -r "$FIXTURE_DIR"/. "$target"/
  cd "$target"
  git init -q && git config user.email eval@growmax && git config user.name eval
  git add -A && git commit -qm "tinyshop base"
}

install_gmax() {
  local root="$1"
  # setup Step 1 — copy the operating layer
  cp -r "$root/agents" ./agents
  cp -r "$root/skills" ./skills
  cp -r "$root/standards" ./standards
  cp "$root/workflow.config.md" ./workflow.config.md
  cp "$root/VERSION" ./.gmax-version
  mkdir -p void && cp "$root/void/README.md" ./void/README.md
  # setup Step 2 — AGENTS.md: append under the marker when one exists, else copy
  if [ -f AGENTS.md ]; then
    printf '\n<!-- gmax -->\n\n' >> AGENTS.md
    cat "$root/AGENTS.md" >> AGENTS.md
  else
    cp "$root/AGENTS.md" ./AGENTS.md
  fi
  # setup Step 2 — Claude Code shim tree
  cp -r "$root/harnesses/claude/.claude" ./
  # setup Step 3 — .gitignore gains void/
  grep -qxF 'void/' .gitignore 2>/dev/null || echo 'void/' >> .gitignore
}

preflight_existing_install() {
  [ -d agents ] && [ -d skills ] && [ -f workflow.config.md ] && [ -f .gmax-version ]
}

update_gmax() {
  local root="$1"
  local installed shipped
  installed="$(cat .gmax-version)"
  shipped="$(cat "$root/VERSION")"
  if [ "$installed" = "$shipped" ]; then
    echo "CURRENT $installed"
    return 0
  fi
  # gmax-update Step 4 — canonical set ONLY (never workflow.config.md, standards/, docs/, void/)
  cp -r "$root/agents/." agents/
  cp -r "$root/skills/." skills/
  if [ -d .claude/agents ]; then
    cp -r "$root/harnesses/claude/.claude/." .claude/
  fi
  cp "$root/VERSION" .gmax-version
  echo "UPDATED $installed -> $shipped"
}

PASS=0; FAIL=0
check() {
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo "ok      - $desc"; PASS=$((PASS+1))
  else
    echo "NOT OK  - $desc"; FAIL=$((FAIL+1))
  fi
}
finish() {
  echo "---"
  echo "passed=$PASS failed=$FAIL"
  [ "$FAIL" -eq 0 ]
}
