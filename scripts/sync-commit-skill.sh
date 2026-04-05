#!/usr/bin/env bash
# Sync skills/commit/SKILL.md to ~/.claude/skills/commit/ and install the thin
# /commit command to ~/.claude/commands/ and ~/.cursor/commands/ (Claude Code +
# Cursor home parity with commands/commit.md in this repo).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_SKILL="$ROOT/skills/commit/SKILL.md"
SRC_CMD="$ROOT/commands/commit.md"

if [[ ! -f "$SRC_SKILL" ]]; then
  echo "error: missing $SRC_SKILL" >&2
  exit 1
fi
if [[ ! -f "$SRC_CMD" ]]; then
  echo "error: missing $SRC_CMD" >&2
  exit 1
fi

mkdir -p "$HOME/.claude/skills/commit"
cp "$SRC_SKILL" "$HOME/.claude/skills/commit/SKILL.md"
echo "updated: $HOME/.claude/skills/commit/SKILL.md"

mkdir -p "$HOME/.claude/commands" "$HOME/.cursor/commands"
cp "$SRC_CMD" "$HOME/.claude/commands/commit.md"
cp "$SRC_CMD" "$HOME/.cursor/commands/commit.md"
echo "updated: $HOME/.claude/commands/commit.md"
echo "updated: $HOME/.cursor/commands/commit.md"

echo "done. (ECC 專案內請以 git 維護 skills/commit/SKILL.md 與 commands/commit.md；其他 repo 開 Cursor 時讀 ~/.claude/skills 與 ~/.cursor/commands。)"
