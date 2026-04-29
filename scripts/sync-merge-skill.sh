#!/usr/bin/env bash
# Sync skills/merge/SKILL.md to ~/.claude/skills/merge/ and install the thin
# /merge command to ~/.claude/commands/ and ~/.cursor/commands/.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_SKILL="$ROOT/skills/merge/SKILL.md"
SRC_CMD="$ROOT/commands/merge.md"

if [[ ! -f "$SRC_SKILL" ]]; then
  echo "error: missing $SRC_SKILL" >&2
  exit 1
fi
if [[ ! -f "$SRC_CMD" ]]; then
  echo "error: missing $SRC_CMD" >&2
  exit 1
fi

mkdir -p "$HOME/.claude/skills/merge"
cp "$SRC_SKILL" "$HOME/.claude/skills/merge/SKILL.md"
echo "updated: $HOME/.claude/skills/merge/SKILL.md"

mkdir -p "$HOME/.claude/commands" "$HOME/.cursor/commands"
cp "$SRC_CMD" "$HOME/.claude/commands/merge.md"
cp "$SRC_CMD" "$HOME/.cursor/commands/merge.md"
echo "updated: $HOME/.claude/commands/merge.md"
echo "updated: $HOME/.cursor/commands/merge.md"

echo "done. (ECC 專案內請以 git 維護 skills/merge/SKILL.md 與 commands/merge.md；其他 repo 開 Cursor 時讀 ~/.claude/skills 與 ~/.cursor/commands。)"
