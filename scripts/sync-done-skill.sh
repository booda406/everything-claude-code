#!/usr/bin/env bash
# Sync skills/done/SKILL.md to ~/.claude/skills/done/ and install the thin
# /done command to ~/.claude/commands/ and ~/.cursor/commands/ (Claude Code +
# Cursor home parity with commands/done.md in this repo).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_SKILL="$ROOT/skills/done/SKILL.md"
SRC_CMD="$ROOT/commands/done.md"

if [[ ! -f "$SRC_SKILL" ]]; then
  echo "error: missing $SRC_SKILL" >&2
  exit 1
fi
if [[ ! -f "$SRC_CMD" ]]; then
  echo "error: missing $SRC_CMD" >&2
  exit 1
fi

mkdir -p "$HOME/.claude/skills/done"
cp "$SRC_SKILL" "$HOME/.claude/skills/done/SKILL.md"
echo "updated: $HOME/.claude/skills/done/SKILL.md"

mkdir -p "$HOME/.claude/commands" "$HOME/.cursor/commands"
cp "$SRC_CMD" "$HOME/.claude/commands/done.md"
cp "$SRC_CMD" "$HOME/.cursor/commands/done.md"
echo "updated: $HOME/.claude/commands/done.md"
echo "updated: $HOME/.cursor/commands/done.md"

echo "done. (ECC 專案內請以 git 維護 skills/done/SKILL.md 與 commands/done.md；其他 repo 開 Cursor 時讀 ~/.claude/skills 與 ~/.cursor/commands。)"
