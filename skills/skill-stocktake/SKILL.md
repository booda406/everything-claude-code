---
description: "Use when auditing skill quality and read-history evidence. Distinguishes physical SKILL.md files, aliases, deployment copies, and unknown usage; supports Quick Scan and Full Stocktake."
origin: ECC
---

# skill-stocktake

Slash command (`/skill-stocktake`) that audits Claude skills using a quality checklist + AI holistic judgment. Supports two modes: Quick Scan for recently changed skills, and Full Stocktake for a complete review.

## Scope

The command targets the following paths **relative to the directory where it is invoked**:

| Path | Description |
|------|-------------|
| `~/.claude/skills/` | Global skills (all projects) |
| `{cwd}/.claude/skills/` | Project-level skills (if the directory exists) |

**At the start of Phase 1, explicitly list which paths were found and scanned.** Only files named exactly `SKILL.md` are inventory entries; README and reference Markdown files are not skills.

The entrypoints require Node.js 18+ and use a shared, dependency-free `scripts/stocktake.js` helper. All three shell entrypoints use that helper; jq is no longer required. The existing `SKILL_STOCKTAKE_GLOBAL_DIR`, `SKILL_STOCKTAKE_PROJECT_DIR`, and `SKILL_STOCKTAKE_OBSERVATIONS` overrides remain available for test fixtures; default scans do not discover other tool directories automatically.

### Targeting a specific project

To include project-level skills, run from that project's root directory:

```bash
cd ~/path/to/my-project
/skill-stocktake
```

If the project has no `.claude/skills/` directory, only global skills are evaluated.

## Modes

| Mode | Trigger | Duration |
|------|---------|---------|
| Quick Scan | `results.json` exists (default) | 5–10 min |
| Full Stocktake | `results.json` absent, or `/skill-stocktake full` | 20–30 min |

**Results cache:** `~/.claude/skills/skill-stocktake/results.json`

## Quick Scan Flow

Re-evaluate only skills that have changed since the last run (5–10 min).

1. Read `~/.claude/skills/skill-stocktake/results.json`
2. Run: `bash ~/.claude/skills/skill-stocktake/scripts/quick-diff.sh \
         ~/.claude/skills/skill-stocktake/results.json`
   (Project dir is auto-detected from `$PWD/.claude/skills`; pass it explicitly only if needed)
3. Run `scan.sh` as well to refresh current identity and usage evidence; quick-diff detects file changes, not new read activity.
4. If quick-diff exits with an error, report the scan/cache gap and reconcile with a Full Stocktake; never turn an error into `[]`. Missing in-scope cached entries require reconciliation. Cached entries from other project roots and legacy non-`SKILL.md` references are ignored. If quick-diff is `[]`, report no skill-file changes. Still report current unknown/available usage evidence; do not repeat stale cached counts as current.
5. Re-evaluate changed physical skills using Phase 2. Carry forward unchanged verdicts while refreshing inventory and usage fields from the current scan, matched by `id` or verified legacy path.
6. Output the verdict diff and any identity/usage-source changes. An identical new deployment is still a separate physical entry; its content verdict can be reused after comparing hashes.
7. Run: `bash ~/.claude/skills/skill-stocktake/scripts/save-results.sh \
         ~/.claude/skills/skill-stocktake/results.json <<< "$EVAL_RESULTS"`

## Full Stocktake Flow

### Phase 1 — Inventory

Run: `bash ~/.claude/skills/skill-stocktake/scripts/scan.sh`

The script inventories only `SKILL.md`, collects UTC mtimes and content SHA-256 values, and resolves physical identity. Project dir is auto-detected from `$PWD/.claude/skills`; pass it explicitly only if needed.

Interpret the JSON counts separately:

- `scan_summary.global.count` / `project.count`: distinct physical skill files within each scope. These scope counts can overlap and must not simply be added.
- `scan_summary.counts.entry_paths`: distinct discovered entry paths across both scopes.
- `physical_skills`: distinct physical files after symlink/hard-link deduplication; one `skills[]` row per physical file.
- `skill_versions`: distinct `(name, content_sha256)` groups, not a semantic count of capabilities.
- `skills[].id`: a hash of exact filesystem device/inode identity. Adding aliases does not change it; replacing the physical file can change it. It is a current filesystem identity, not a permanent identifier or a content-version proof.
- `skills[].aliases`: other discovered paths to the same physical file, excluding the primary `path`.
- `deployment_copies`: separate physical files with the same name and exact content hash. Their read histories remain separate.
- `name_conflict`: the same name has different content hashes; retain the versions separately instead of merging them.

No fuzzy name matching is performed. Frontmatter extraction supports top-level string scalars and folded/literal `name` and `description` blocks, not arbitrary YAML. Unquoted nulls, booleans, numbers and dates are not string names. Missing or unsupported names fall back to the canonical folder name and are marked by `metadata_status`; inspect unsupported metadata before treating it as an authoritative name.

Present the scan summary and inventory table from the script output:

```
Scanning:
  Global: ~/.claude/skills/      (17 physical skills)
  Project: {cwd}/.claude/skills/ (not found — global skills only)
```

| Skill / physical entry | 7d reads | 30d reads | Evidence / copies | Description |
|------------------------|----------|-----------|-------------------|-------------|

### Usage evidence: unknown is not zero

- Missing, unreadable, empty, or invalid observation files yield `null` counts and `usage_status: "unknown"`. A valid source with no matching Read history for a skill also yields unknown, even if other skills have observations.
- Render `null` as **Unknown**, with `usage_reason`; never convert it to zero or infer that the skill was never used.
- Numeric counts require valid matching Read history for that physical entry. A numeric `0` means no matching records in that window, not proof of inactivity or continuous observation coverage.
- Match full paths, resolved aliases and physical identity. Deduplicate explicit event IDs within a physical file; do not infer duplicates when records have no ID or transfer usage between deployment copies.
- `last_read_at` describes recorded path-read history. Old observations do not establish which historical file contents were read, nor prove that the current content hash was used after replacement or alias retargeting.
- Read counts can include audits, setup and synchronization checks; they are not successful-task counts. A long-unused verdict also needs a trustworthy observation window and workflow relevance.
- `scan_summary.incomplete` / `errors` signal inventory gaps. Do not interpret missing entries or unknown usage as cleanup permission.

### Phase 2 — Quality Evaluation

Launch an Agent tool subagent (**general-purpose agent**) with the full inventory and checklist:

```text
Agent(
  subagent_type="general-purpose",
  prompt="
Evaluate the following skill inventory against the checklist.

[INVENTORY]

[CHECKLIST]

Return JSON for each skill:
{ \"verdict\": \"Keep\"|\"Improve\"|\"Update\"|\"Retire\"|\"Merge into [X]\", \"reason\": \"...\" }
"
)
```

The subagent reads each skill, applies the checklist, and returns per-skill JSON:

`{ "verdict": "Keep"|"Improve"|"Update"|"Retire"|"Merge into [X]", "reason": "..." }`

**Chunk guidance:** Process ~20 skills per subagent invocation to keep context manageable. Save intermediate results to `results.json` (`status: "in_progress"`) after each chunk.

After all skills are evaluated: set `status: "completed"`, proceed to Phase 3.

**Resume detection:** If `status: "in_progress"` is found on startup, resume from the first unevaluated skill.

Each skill is evaluated against this checklist:

```
- [ ] Content overlap with other skills checked
- [ ] Overlap with MEMORY.md / CLAUDE.md checked
- [ ] Freshness of technical references verified (use WebSearch if tool names / CLI flags / APIs are present)
- [ ] Usage frequency considered
```

Verdict criteria:

| Verdict | Meaning |
|---------|---------|
| Keep | Useful and current |
| Improve | Worth keeping, but specific improvements needed |
| Update | Referenced technology is outdated (verify with WebSearch) |
| Retire | Low quality, stale, or cost-asymmetric |
| Merge into [X] | Substantial overlap with another skill; name the merge target |

Evaluation is **holistic AI judgment** — not a numeric rubric. Guiding dimensions:
- **Actionability**: code examples, commands, or steps that let you act immediately
- **Scope fit**: name, trigger, and content are aligned; not too broad or narrow
- **Uniqueness**: value not replaceable by MEMORY.md / CLAUDE.md / another skill
- **Currency**: technical references work in the current environment

**Reason quality requirements** — the `reason` field must be self-contained and decision-enabling:
- Do NOT write "unchanged" alone — always restate the core evidence
- For **Retire**: state (1) what specific defect was found, (2) what covers the same need instead
  - Bad: `"Superseded"`
  - Good: `"disable-model-invocation: true already set; superseded by continuous-learning-v2 which covers all the same patterns plus confidence scoring. No unique content remains."`
- For **Merge**: name the target and describe what content to integrate
  - Bad: `"Overlaps with X"`
  - Good: `"42-line thin content; Step 4 of chatlog-to-article already covers the same workflow. Integrate the 'article angle' tip as a note in that skill."`
- For **Improve**: describe the specific change needed (what section, what action, target size if relevant)
  - Bad: `"Too long"`
  - Good: `"276 lines; Section 'Framework Comparison' (L80–140) duplicates ai-era-architecture-principles; delete it to reach ~150 lines."`
- For **Keep** (mtime-only change in Quick Scan): restate the original verdict rationale, do not write "unchanged"
  - Bad: `"Unchanged"`
  - Good: `"mtime updated but content unchanged. Unique Python reference explicitly imported by rules/python/; no overlap found."`

### Phase 3 — Summary Table

| Skill / physical entry | 7d reads (or Unknown) | Verdict | Reason |
|-------|--------|---------|--------|

### Phase 4 — Consolidation

1. **Retire / Merge**: present detailed justification per file before confirming with user:
   - What specific problem was found (overlap, staleness, broken references, etc.)
   - What alternative covers the same functionality (for Retire: which existing skill/rule; for Merge: the target file and what content to integrate)
   - Impact of removal (any dependent skills, MEMORY.md references, or workflows affected)
2. **Improve**: present specific improvement suggestions with rationale:
   - What to change and why (e.g., "trim 430→200 lines because sections X/Y duplicate python-patterns")
   - User decides whether to act
3. **Update**: present updated content with sources checked
4. Check MEMORY.md line count; propose compression if >100 lines

## Results File Schema

`~/.claude/skills/skill-stocktake/results.json`:

**`evaluated_at`**: Must be set to the actual UTC time of evaluation completion.
`save-results.sh` sets it from the actual UTC clock when saving. Never use a date-only approximation like `T00:00:00Z`.

```json
{
  "evaluated_at": "2026-02-21T10:00:00Z",
  "mode": "full",
  "batch_progress": {
    "total": 80,
    "evaluated": 80,
    "status": "completed"
  },
  "skills": {
    "id-from-current-scan": {
      "id": "id-from-current-scan",
      "name": "skill-name",
      "path": "~/.claude/skills/skill-name/SKILL.md",
      "real_path": "/absolute/skills/skill-name/SKILL.md",
      "aliases": [],
      "deployment_copies": [],
      "content_sha256": "content-hash-from-current-scan",
      "usage_status": "unknown",
      "usage_reason": "missing_observations",
      "use_7d": null,
      "use_30d": null,
      "verdict": "Keep",
      "reason": "Concrete, actionable, unique value for X workflow",
      "mtime": "2026-01-15T08:30:00Z"
    }
  }
}
```

Use the scan row's `id` as the cache key, not the declared name: same-name variants and separate deployments must not overwrite each other. Store the current identity, content hash and usage fields with each verdict. `save-results.sh` preserves nulls and distinct identity keys, writes atomically, and rejects invalid input before replacing the cache. Scanner-derived rows supersede stale keys for the same entry after physical replacement, while unrelated deployments and other project records remain separate. Legacy manual rows without `id` retain additive merge behavior. Quick Scan accepts legacy name-keyed caches with `path`; new content hashes also detect edits whose mtime was preserved.

## Notes

- Evaluation is blind: the same checklist applies to all skills regardless of origin (ECC, self-authored, auto-extracted)
- Archive / delete operations always require explicit user confirmation
- No verdict branching by skill origin
