#!/usr/bin/env bash
# Sync skills/pr-followup/SKILL.md to ~/.claude/skills/pr-followup/ and install the thin
# /pr-followup command to ~/.claude/commands/ and ~/.cursor/commands/.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_SKILL="$ROOT/skills/pr-followup/SKILL.md"
SRC_CMD="$ROOT/commands/pr-followup.md"

if [[ ! -f "$SRC_SKILL" ]]; then
  echo "error: missing $SRC_SKILL" >&2
  exit 1
fi
if [[ ! -f "$SRC_CMD" ]]; then
  echo "error: missing $SRC_CMD" >&2
  exit 1
fi

mkdir -p "$HOME/.claude/skills/pr-followup"
cp "$SRC_SKILL" "$HOME/.claude/skills/pr-followup/SKILL.md"
echo "updated: $HOME/.claude/skills/pr-followup/SKILL.md"

mkdir -p "$HOME/.claude/commands" "$HOME/.cursor/commands"
cp "$SRC_CMD" "$HOME/.claude/commands/pr-followup.md"
cp "$SRC_CMD" "$HOME/.cursor/commands/pr-followup.md"
echo "updated: $HOME/.claude/commands/pr-followup.md"
echo "updated: $HOME/.cursor/commands/pr-followup.md"

echo "done."
