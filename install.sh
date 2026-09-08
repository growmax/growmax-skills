#!/usr/bin/env bash
# Install or refresh Growmax Claude Code skills into your personal skills dir.
#
# Usage:
#   ./install.sh                       # symlink every skill (recommended: `git pull` auto-updates everyone)
#   ./install.sh --copy                # copy every skill instead of symlinking (Windows without Developer Mode, etc.)
#   ./install.sh <skill-name>          # symlink only one skill, e.g. ./install.sh senior-agentic-enginner
#   ./install.sh --copy <skill-name>   # copy only one skill
#
# Override the destination with: CLAUDE_SKILLS_DIR=/some/path ./install.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
MODE="symlink"
FILTER=""
for arg in "$@"; do
  if [ "$arg" = "--copy" ]; then
    MODE="copy"
  else
    FILTER="$arg"
  fi
done

mkdir -p "$DEST"
count=0
for skill in "$REPO_DIR"/skills/*/; do
  [ -f "${skill}SKILL.md" ] || continue          # only real skills (must have SKILL.md)
  name="$(basename "$skill")"
  [ -n "$FILTER" ] && [ "$name" != "$FILTER" ] && continue   # single-skill install
  target="$DEST/$name"
  rm -rf "$target"                               # replace any existing copy/link of the same skill
  if [ "$MODE" = "copy" ]; then
    cp -R "$skill" "$target"
  else
    ln -s "${skill%/}" "$target"
  fi
  echo "  ✓ ${name}  (${MODE})  ->  ${target}"
  count=$((count + 1))
done

if [ -n "$FILTER" ] && [ "$count" -eq 0 ]; then
  echo "No skill named '${FILTER}' found under ${REPO_DIR}/skills/" >&2
  exit 1
fi

echo "Installed ${count} skill(s) into ${DEST}"
if [ "$MODE" = "symlink" ]; then
  echo "To update later:  git -C \"${REPO_DIR}\" pull   (symlinks pick up changes automatically)"
else
  echo "To update later:  git -C \"${REPO_DIR}\" pull && \"${REPO_DIR}/install.sh\" --copy"
fi
