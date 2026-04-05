#!/usr/bin/env bash
# Sync skills/review/SKILL.md to ~/.claude/skills/review/ and install the thin
# /review command to ~/.claude/commands/ and ~/.cursor/commands/.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_SKILL="$ROOT/skills/review/SKILL.md"
SRC_CMD="$ROOT/commands/review.md"

if [[ ! -f "$SRC_SKILL" ]]; then
  echo "error: missing $SRC_SKILL" >&2
  exit 1
fi
if [[ ! -f "$SRC_CMD" ]]; then
  echo "error: missing $SRC_CMD" >&2
  exit 1
fi

mkdir -p "$HOME/.claude/skills/review"
cp "$SRC_SKILL" "$HOME/.claude/skills/review/SKILL.md"
echo "updated: $HOME/.claude/skills/review/SKILL.md"

mkdir -p "$HOME/.claude/commands" "$HOME/.cursor/commands"
cp "$SRC_CMD" "$HOME/.claude/commands/review.md"
cp "$SRC_CMD" "$HOME/.cursor/commands/review.md"
echo "updated: $HOME/.claude/commands/review.md"
echo "updated: $HOME/.cursor/commands/review.md"

echo "done."
