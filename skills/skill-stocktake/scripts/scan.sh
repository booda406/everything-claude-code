#!/usr/bin/env bash
# scan.sh — portable SKILL.md inventory via the shared Node helper.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/stocktake.js" scan "$@"
