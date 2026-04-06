# Implementation notes

Dated engineering notes (symptoms, root cause, fix). For AI behavior rules see `CLAUDE.md` and `.cursor/rules/lessons-learned.mdc`.

## 2026-04-03 — Post-install customization (`ecc-prune`) v1

**Goal:** Fork keeps upstream-shaped manifests (e.g. root `AGENTS.md`, `.claude-plugin/plugin.json`) while applying a trimmed install under `~/.claude` (and optionally a project `.cursor/`) without hand-editing those sources.

**What shipped:**

- `ecc-prune.json` — `remove` for `rulesDirs`, `skillDirs`, `agents`; `copyIntoClaudeHome` for overlay files; optional `cursorProjectRoot` (resolved relative to the config file directory) so the same remove list targets `<root>/.cursor/` using Cursor’s flat `rules/<lang>-*.md` layout.
- `overlays/AGENTS.md`, `overlays/plugin.json` — trimmed agent copy for `~/.claude` after prune.
- `scripts/apply-ecc-prune.js`, `schemas/ecc-prune-config.schema.json`, `tests/scripts/apply-ecc-prune.test.js`; `ecc prune` wired in `scripts/ecc.js`.
- Paths under `copyIntoClaudeHome` resolve relative to **the directory containing** `ecc-prune.json`, not the shell cwd.

**Note:** Running prune against a git checkout with `cursorProjectRoot: "."` deletes language rules under that repo’s `.cursor/rules/`; the canonical template for those files stays in version control unless the fork intentionally commits slimmer `.cursor` content.
