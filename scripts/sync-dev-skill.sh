#!/usr/bin/env bash
# Sync skills/dev/SKILL.md to ~/.claude/skills/dev/ and thin /dev command to
# ~/.claude/commands/ and ~/.cursor/commands/.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_SKILL="$ROOT/skills/dev/SKILL.md"
SRC_CMD="$ROOT/commands/dev.md"

if [[ ! -f "$SRC_SKILL" ]]; then
  echo "error: missing $SRC_SKILL" >&2
  exit 1
fi
if [[ ! -f "$SRC_CMD" ]]; then
  echo "error: missing $SRC_CMD" >&2
  exit 1
fi

mkdir -p "$HOME/.claude/skills/dev"
cp "$SRC_SKILL" "$HOME/.claude/skills/dev/SKILL.md"
echo "updated: $HOME/.claude/skills/dev/SKILL.md"

mkdir -p "$HOME/.claude/commands" "$HOME/.cursor/commands"
cp "$SRC_CMD" "$HOME/.claude/commands/dev.md"
cp "$SRC_CMD" "$HOME/.cursor/commands/dev.md"
echo "updated: $HOME/.claude/commands/dev.md"
echo "updated: $HOME/.cursor/commands/dev.md"

echo "done."
