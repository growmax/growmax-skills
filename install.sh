#!/usr/bin/env bash
# Install or refresh Growmax Claude Code skills into your personal skills dir.
#
# Usage:
#   ./install.sh            # symlink each skill (recommended: `git pull` auto-updates everyone)
#   ./install.sh --copy     # copy instead of symlink (Windows without Developer Mode, etc.)
#
# Override the destination with: CLAUDE_SKILLS_DIR=/some/path ./install.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
MODE="symlink"; [ "${1:-}" = "--copy" ] && MODE="copy"

mkdir -p "$DEST"
count=0
for skill in "$REPO_DIR"/skills/*/; do
  [ -f "${skill}SKILL.md" ] || continue          # only real skills (must have SKILL.md)
  name="$(basename "$skill")"
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

echo "Installed ${count} skill(s) into ${DEST}"
if [ "$MODE" = "symlink" ]; then
  echo "To update later:  git -C \"${REPO_DIR}\" pull   (symlinks pick up changes automatically)"
else
  echo "To update later:  git -C \"${REPO_DIR}\" pull && \"${REPO_DIR}/install.sh\" --copy"
fi
