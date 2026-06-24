#!/usr/bin/env bash
# Create a GitHub repo from this folder and push it.
#
# Easiest path: have the GitHub CLI authenticated once (`gh auth login`), then:
#   ./push.sh                 # creates a PRIVATE repo named "growmax-skills" and pushes
#   ./push.sh my-name         # custom repo name
#   ./push.sh my-name --public
#
# This is also exactly what you can hand to Claude Code: open this folder in Claude Code and
# say "run push.sh to create a private GitHub repo and push it", or just "create a private
# GitHub repo named growmax-skills and push this folder".
set -euo pipefail

NAME="${1:-growmax-skills}"
VIS="--private"; [ "${2:-}" = "--public" ] && VIS="--public"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
cd "$REPO_DIR"

[ -d .git ] || git init -q
git add -A
git diff --cached --quiet || git commit -q -m "Add Growmax skills"
git branch -M main 2>/dev/null || true

if command -v gh >/dev/null 2>&1; then
  gh repo create "$NAME" $VIS --source=. --remote=origin --push
  echo "✓ Pushed to GitHub repo: $NAME ($VIS)"
else
  echo "GitHub CLI (gh) not found. Two options:"
  echo "  1) Install gh (https://cli.github.com), run 'gh auth login', then re-run ./push.sh"
  echo "  2) Create an empty repo on github.com, then run:"
  echo "       git remote add origin <repo-url> && git push -u origin main"
fi
