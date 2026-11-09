#!/usr/bin/env bash
# Merge stocktake results atomically; preserve unknown values and physical IDs.
# Usage: save-results.sh RESULTS_JSON <<< "$EVAL_JSON"
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/stocktake.js" save-results "$@"
