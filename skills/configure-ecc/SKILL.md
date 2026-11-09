---
name: configure-ecc
description: Maintain an existing Everything Claude Code checkout and its deployed files, or plan a fresh installation of selected skills and rules. Use when asked to configure, verify, repair, or install ECC.
origin: ECC
---

# Configure Everything Claude Code (ECC)

## Choose a mode

Choose the mode before obtaining a source or writing files. Use the host's available question mechanism only when a choice cannot be inferred from verified context.

- **Maintain an existing ECC setup** for requests to inspect, verify, repair, or update an existing checkout or deployed files.
- **Fresh installation** when the user asks for a new installation.
- If the mode or canonical checkout is ambiguous, report what was found and ask only for the missing choice. The absence of a checkout in the current directory does not establish that ECC is absent.

## Maintain an existing ECC setup

1. Identify the canonical checkout from the user's stated location or verified project context. Record its root, branch, HEAD, and working-tree status. Inspect the selected files in that working tree, including authorized local changes. Use `skills/<name>/` as the canonical workflow source unless the project documents another owner.
2. Locate the actual source each tool uses. Resolve symlinks and distinguish aliases, independent copies, plugin-managed content, and app-managed caches. For example, `~/.agents/skills/` and `~/.claude/skills/` can lead to the same physical file. Record which paths were observed and which require in-app verification.
3. Build a read-only preview of the exact requested files. For each destination, record the logical and resolved paths, source path, source and destination hashes, destination state (identical, missing, or different), and proposed action. Show a text diff or binary hashes. Give existing files a backup path and record absent files for rollback. Resolve unexplained differences, ambiguous ownership, or a path outside the approved root before writing.
4. Apply only the authorized file list. Before overwriting, recheck paths and hashes, back up existing files, and verify the backups. If a source or destination changed since the preview, regenerate the affected rows before applying. Exclude Python caches and unrelated files. Include commands, settings, prompts, or plugins only when the request covers them. A preview request ends at Step 3.
5. Read back affected files, compare hashes, and report verification and remaining differences. Verify in-app discovery separately when requested and available. A matching disk copy does not establish that a running session loaded it.

`scripts/sync-ecc-harnesses.js --dry-run` reports intended directory copies. Its `--skill` flag selects a whole skill directory, and agents are included by default unless `--no-agents` is set. Use a verified file list for a file-scoped update. The Codex sync script covers configuration, prompts, and hooks and is not a selective skill-copy tool.

## Fresh installation

This wizard plans individual files for Claude Code user and project locations. Use the file list for a selective installation. Use a bundled installer only when its complete plan, including managed state files, matches the authorized scope. For other harnesses, inspect the selected revision's documented adapter and show its actual destinations before applying an install plan.

If this skill is unavailable, Claude Code can expose it through the ECC plugin or a manual copy of this file to `~/.claude/skills/configure-ecc/SKILL.md`. Review the installation scope of either bootstrap option before applying it.

### Step 0: Choose a source

Use an explicitly selected local checkout or fetch the chosen upstream into a new temporary directory when the request covers fetching. Verify the checked-out revision before planning the install.

```bash
ECC_INSTALL_TMP=$(mktemp -d "${TMPDIR:-/tmp}/ecc-install.XXXXXX") &&
  git clone https://github.com/affaan-m/everything-claude-code.git "$ECC_INSTALL_TMP/source"
```

Set `ECC_ROOT` to the chosen source after verifying it. Check out the user's requested revision in the temporary clone if specified. If fetching fails, offer a user-specified local source.

---

### Step 1: Choose installation level

Ask the user where to install if the request has not set the scope:

```
Question: "Where should ECC components be installed?"
Options:
  - "User-level (~/.claude/)" — "Applies to all your Claude Code projects"
  - "Project-level (.claude/)" — "Applies only to the current project"
  - "Both" — "Common/shared items user-level, project-specific items project-level"
```

Store the choice as `INSTALL_LEVEL`. Set the target directory:
- User-level: `TARGET=~/.claude`
- Project-level: `TARGET=.claude` (relative to current project root)
- Both: `TARGET_USER=~/.claude`, `TARGET_PROJECT=.claude`

Resolve project-level paths from the verified project root. When installing at both levels, assign each selected skill and rule set to its intended level. Include existing target collisions in the preview before creating directories or writing files.

---

### Step 2: Select skills

If the user already specified individual skills, verify those names and go to Step 2d. For a rules-only installation, skip to Step 3.

#### 2a: Choose Scope (Core vs Niche)

Default to **Core (recommended for new users)** when the user leaves skill selection open. Use skill names from `.agents/skills/` plus `search-first` as candidates, and include only those with `skills/<name>/SKILL.md` in the selected revision. Skip repository-only entries without a canonical skill source. This bundle covers engineering, evals, verification, security, strategic compaction, frontend design, and cross-functional skills.

Ask when the skill scope is unspecified:
```
Question: "Install core skills only, or include niche/framework packs?"
Options:
  - "Core only (recommended)" — "tdd, e2e, evals, verification, research-first, security, frontend patterns, compacting, cross-functional Anthropic skills"
  - "Core + selected niche" — "Add framework/domain-specific skills after core"
  - "Niche only" — "Skip core, install specific framework/domain skills"
Default: Core only
```

If the user chooses niche or core + niche, continue to category selection below and only include those niche skills they pick.

#### 2b: Choose Skill Categories

Use the following categories as a selection guide. Check availability in the selected source revision before confirming individual skills.

```
Question: "Which skill categories do you want to install?"
Options:
  - "Framework & Language" — "Django, Laravel, Spring Boot, Go, Python, Java, Frontend, Backend patterns"
  - "Database" — "PostgreSQL, ClickHouse, JPA/Hibernate patterns"
  - "Workflow & Quality" — "TDD, verification, learning, security review, compaction"
  - "Business & Content" — "Article writing, content, market research, and investor materials"
  - "Research & APIs" — "Deep research, Exa search, Claude API patterns"
  - "Social & Content Distribution" — "X/Twitter API, crossposting alongside content-engine"
  - "Media Generation" — "fal.ai image/video/audio and video editing"
  - "Orchestration" — "dmux multi-agent workflows"
  - "All skills" — "Install every available skill"
```

#### 2c: Confirm Individual Skills

For each selected category, print the full list of skills below and ask the user to confirm or deselect specific ones. If the list exceeds 4 items, print the list as text and offer an "Install all listed" option plus "Other" for the user to paste specific names.

**Category: Framework & Language (21 skills)**

| Skill | Description |
|-------|-------------|
| `backend-patterns` | Backend architecture, API design, server-side best practices for Node.js/Express/Next.js |
| `coding-standards` | Universal coding standards for TypeScript, JavaScript, React, Node.js |
| `django-patterns` | Django architecture, REST API with DRF, ORM, caching, signals, middleware |
| `django-security` | Django security: auth, CSRF, SQL injection, XSS prevention |
| `django-tdd` | Django testing with pytest-django, factory_boy, mocking, coverage |
| `django-verification` | Django verification loop: migrations, linting, tests, security scans |
| `laravel-patterns` | Laravel architecture patterns: routing, controllers, Eloquent, queues, caching |
| `laravel-security` | Laravel security: auth, policies, CSRF, mass assignment, rate limiting |
| `laravel-tdd` | Laravel testing with PHPUnit and Pest, factories, fakes, coverage |
| `laravel-verification` | Laravel verification: linting, static analysis, tests, security scans |
| `frontend-patterns` | React, Next.js, state management, performance, UI patterns |
| `frontend-slides` | Zero-dependency HTML presentations, style previews, and PPTX-to-web conversion |
| `golang-patterns` | Idiomatic Go patterns, conventions for robust Go applications |
| `golang-testing` | Go testing: table-driven tests, subtests, benchmarks, fuzzing |
| `java-coding-standards` | Java coding standards for Spring Boot: naming, immutability, Optional, streams |
| `python-patterns` | Pythonic idioms, PEP 8, type hints, best practices |
| `python-testing` | Python testing with pytest, TDD, fixtures, mocking, parametrization |
| `springboot-patterns` | Spring Boot architecture, REST API, layered services, caching, async |
| `springboot-security` | Spring Security: authn/authz, validation, CSRF, secrets, rate limiting |
| `springboot-tdd` | Spring Boot TDD with JUnit 5, Mockito, MockMvc, Testcontainers |
| `springboot-verification` | Spring Boot verification: build, static analysis, tests, security scans |

**Category: Database (3 skills)**

| Skill | Description |
|-------|-------------|
| `clickhouse-io` | ClickHouse patterns, query optimization, analytics, data engineering |
| `jpa-patterns` | JPA/Hibernate entity design, relationships, query optimization, transactions |
| `postgres-patterns` | PostgreSQL query optimization, schema design, indexing, security |

**Category: Workflow & Quality (8 skills)**

| Skill | Description |
|-------|-------------|
| `continuous-learning` | Auto-extract reusable patterns from sessions as learned skills |
| `continuous-learning-v2` | Instinct-based learning with confidence scoring, evolves into skills, agents, and optional legacy command shims |
| `eval-harness` | Formal evaluation framework for eval-driven development (EDD) |
| `iterative-retrieval` | Progressive context refinement for subagent context problem |
| `security-review` | Security checklist: auth, input, secrets, API, payment features |
| `strategic-compact` | Suggests manual context compaction at logical intervals |
| `tdd-workflow` | Enforces TDD with 80%+ coverage: unit, integration, E2E |
| `verification-loop` | Verification and quality loop patterns |

**Category: Business & Content (5 skills)**

| Skill | Description |
|-------|-------------|
| `article-writing` | Long-form writing in a supplied voice using notes, examples, or source docs |
| `content-engine` | Multi-platform social content, scripts, and repurposing workflows |
| `market-research` | Source-attributed market, competitor, fund, and technology research |
| `investor-materials` | Pitch decks, one-pagers, investor memos, and financial models |
| `investor-outreach` | Personalized investor cold emails, warm intros, and follow-ups |

**Category: Research & APIs (3 skills)**

| Skill | Description |
|-------|-------------|
| `deep-research` | Multi-source deep research using firecrawl and exa MCPs with cited reports |
| `exa-search` | Neural search via Exa MCP for web, code, company, and people research |
| `claude-api` | Anthropic Claude API patterns: Messages, streaming, tool use, vision, batches, Agent SDK |

**Category: Social & Content Distribution (2 skills)**

| Skill | Description |
|-------|-------------|
| `x-api` | X/Twitter API integration for posting, threads, search, and analytics |
| `crosspost` | Multi-platform content distribution with platform-native adaptation |

**Category: Media Generation (2 skills)**

| Skill | Description |
|-------|-------------|
| `fal-ai-media` | Unified AI media generation (image, video, audio) via fal.ai MCP |
| `video-editing` | AI-assisted video editing for cutting, structuring, and augmenting real footage |

**Category: Orchestration (1 skill)**

| Skill | Description |
|-------|-------------|
| `dmux-workflows` | Multi-agent orchestration using dmux for parallel agent sessions |

**Standalone**

| Skill | Description |
|-------|-------------|
| `project-guidelines-example` | Template for creating project-specific skills |

#### 2d: Plan selected skill files

For each selection, verify its `SKILL.md` and include the supporting references, scripts, and assets required by the selected source revision. Preserve their relative paths under the target skill directory. `continuous-learning` and `continuous-learning-v2` may require configuration or hook files. Distinguish files in a selected skill from host settings that would enable those hooks.

---

### Step 3: Select rules and review the file list

If the user already specified rule sets, use that selection. For a skills-only installation, skip rule selection and review the skill file list. Otherwise ask which options apply:

```
Question: "Which rule sets do you want to install?"
Options:
  - "Common rules (Recommended)" — "Language-agnostic coding, git, testing, and security guidance"
  - "TypeScript/JavaScript" — "TS/JS patterns, hooks, and Playwright testing guidance"
  - "Python" — "Python patterns, pytest, and black/ruff formatting guidance"
  - "Go" — "Go patterns, table-driven tests, and gofmt/staticcheck guidance"
  - "Skip rules" — "Install the selected skills only"
```

Follow the selected revision's `rules/README.md`. Keep rule directories such as `rules/common/` and `rules/typescript/` under the target `rules/` so names and `../common/` references resolve. Verify compatible common rules at the target for each dependent language set. When they are missing, show the required common files as dependencies in the preview. Keep the dependent rules pending if the common files cannot be verified or their installation is outside the authorized scope.

Review the combined destination list for skills and rules, including existing files and proposed backups. Apply the file verification and authorization steps from maintenance. Keep a fresh installation within the selected target and component scope.

---

### Step 4: Verify the installation

After installation, perform these automated checks:

#### 4a: Verify File Existence

For each selected root, use it as `TARGET` and verify the planned files:
```bash
ls -la "$TARGET/skills/"
ls -la "$TARGET/rules/"
```

#### 4b: Check Path References

Scan all installed `.md` files for path references:
```bash
grep -rn "~/.claude/" "$TARGET/skills/" "$TARGET/rules/"
grep -rn "../common/" "$TARGET/rules/"
grep -rn "skills/" "$TARGET/skills/"
```

**For project-level installs**, flag any references to `~/.claude/` paths:
- If a skill references `~/.claude/settings.json`, verify that its use of user-level settings is intentional. Changing those settings requires its own scope.
- If a skill references `~/.claude/skills/` or `~/.claude/rules/` — this may be broken if installed only at project level
- If a skill references another skill by name — check that the referenced skill was also installed

#### 4c: Check Cross-References Between Skills

Some skills reference others. Verify these dependencies:
- `django-tdd` may reference `django-patterns`
- `laravel-tdd` may reference `laravel-patterns`
- `springboot-tdd` may reference `springboot-patterns`
- `continuous-learning-v2` references `~/.claude/homunculus/` directory
- `python-testing` may reference `python-patterns`
- `golang-testing` may reference `golang-patterns`
- `crosspost` references `content-engine` and `x-api`
- `deep-research` references `exa-search` (complementary MCP tools)
- `fal-ai-media` references `videodb` (complementary media skill)
- `x-api` references `content-engine` and `crosspost`
- Language-specific rules reference `common/` counterparts

#### 4d: Report Issues

For each issue found, report:
1. **File**: The file containing the problematic reference
2. **Line**: The line number
3. **Issue**: What's wrong (e.g., "references ~/.claude/skills/python-patterns but python-patterns was not installed")
4. **Suggested fix**: What to do (e.g., "install python-patterns skill" or "update path to .claude/skills/")

---

### Step 5: Preview optional customization

Offer these options only when customization is requested:

```
Question: "Would you like to optimize the installed files for your project?"
Options:
  - "Optimize skills" — "Remove irrelevant sections, adjust paths, tailor to your tech stack"
  - "Optimize rules" — "Adjust coverage targets, add project-specific patterns, customize tool configs"
  - "Optimize both" — "Full optimization of all installed files"
  - "Skip" — "Keep everything as-is"
```

### If optimizing skills:
1. Read each installed SKILL.md
2. Ask the user what their project's tech stack is (if not already known)
3. For each skill, suggest removals of irrelevant sections
4. Preview the exact files and path corrections at the agreed customization location
5. Apply authorized edits after verifying backups

### If optimizing rules:
1. Read each installed rule .md file
2. Ask the user about their preferences:
   - Test coverage target (default 80%)
   - Preferred formatting tools
   - Git workflow conventions
   - Security requirements
3. Preview the exact rule edits and apply authorized changes after verifying backups

Use the chosen source of truth for customization. Keep project-specific copies distinct from shared canonical files. An installation request alone does not authorize rewriting the canonical checkout.

---

### Step 6: Installation summary

Clean up only the temporary directory created by this installation after confirming it is safe to remove.

Then print a summary report:

```
## ECC Installation Complete

### Installation Target
- Level: [user-level / project-level / both]
- Path: [target path]

### Skills Installed ([count])
- skill-1, skill-2, skill-3, ...

### Rules Installed ([count])
- common ([verified count] files)
- typescript ([verified count] files)
- ...

### Verification Results
- [count] issues found, [count] fixed
- [list any remaining issues]

### Optimizations Applied
- [list changes made, or "None"]
```

---

## Troubleshooting

### "Skills not being picked up by Claude Code"
- Verify the skill directory contains a `SKILL.md` file (not just loose .md files)
- For user-level: check `~/.claude/skills/<skill-name>/SKILL.md` exists
- For project-level: check `.claude/skills/<skill-name>/SKILL.md` exists

### "Rules not working"
- Verify directory layout and relative references against the selected revision’s rule instructions
- Check rule discovery in a fresh Claude Code session when needed

### "Path reference errors after project-level install"
- Some skills assume `~/.claude/` paths. Run Step 4 verification to find and fix these.
- For `continuous-learning-v2`, the `~/.claude/homunculus/` directory is always user-level — this is expected and not an error.
