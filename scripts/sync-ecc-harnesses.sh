#!/usr/bin/env bash
# Convenience wrapper: sync ECC agents/skills into ~/.claude and ~/.cursor.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/sync-ecc-harnesses.js" "$@"
