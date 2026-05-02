#!/usr/bin/env node
/**
 * Sync ECC agents (all *.md under agents/) and optional skill folders into
 * Claude Code (~/.claude) and Cursor (~/.cursor) user directories.
 * Re-run after adding new subagents or skills.
 *
 * Usage:
 *   node scripts/sync-ecc-harnesses.js
 *   node scripts/sync-ecc-harnesses.js --skill ui-ux-pro-max
 *   node scripts/sync-ecc-harnesses.js --skill ui-ux-pro-max --dry-run
 *   node scripts/sync-ecc-harnesses.js --project "$PWD" --skill ui-ux-pro-max
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function parseArgs(argv) {
  const out = {
    dryRun: false,
    agents: true,
    skills: [],
    allSkills: false,
    claude: true,
    cursor: true,
    projectPaths: [],
  };

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--no-agents') out.agents = false;
    else if (a === '--all-skills') out.allSkills = true;
    else if (a === '--claude-only') {
      out.claude = true;
      out.cursor = false;
    } else if (a === '--cursor-only') {
      out.claude = false;
      out.cursor = true;
    } else if (a === '--skill' || a === '--skills') {
      const v = argv[i + 1];
      if (!v || v.startsWith('--')) {
        throw new Error(`${a} requires a skill directory name`);
      }
      out.skills.push(v);
      i += 1;
    } else if (a === '--project') {
      const v = argv[i + 1];
      if (!v || v.startsWith('--')) {
        throw new Error('--project requires a path');
      }
      out.projectPaths.push(path.resolve(v));
      i += 1;
    } else if (a === '--help' || a === '-h') {
      out.help = true;
    } else {
      throw new Error(`Unknown argument: ${a} (try --help)`);
    }
  }

  return out;
}

function helpText() {
  return `Sync ECC agents (and optional skills) to Claude Code & Cursor user dirs.

Usage:
  node scripts/sync-ecc-harnesses.js [options]

Options:
  --dry-run           Print planned copies only
  --no-agents         Do not copy agents/*.md
  --skill <name>      Also copy skills/<name>/ (repeatable)
  --all-skills        Copy every skills/*/ that has SKILL.md (large)
  --claude-only       Only ~/.claude/
  --cursor-only       Only ~/.cursor/
  --project <path>    Also copy under <path>/.cursor/ (agents + selected skills)

Defaults:
  Copy all agents/*.md → ~/.claude/agents/ and ~/.cursor/agents/

Examples:
  node scripts/sync-ecc-harnesses.js
  node scripts/sync-ecc-harnesses.js --skill ui-ux-pro-max
  node scripts/sync-ecc-harnesses.js --project . --skill ui-ux-pro-max
`;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(src, dest, dryRun, log) {
  log(`copy ${src} -> ${dest}`);
  if (dryRun) return;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function listSkillDirs(skillsRoot) {
  if (!fs.existsSync(skillsRoot)) return [];
  return fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .filter(name => {
      const md = path.join(skillsRoot, name, 'SKILL.md');
      return fs.existsSync(md) && fs.statSync(md).isFile();
    })
    .sort();
}

function copyDirRecursive(srcDir, destDir, dryRun, log) {
  log(`tree ${srcDir}/ -> ${destDir}/`);
  if (dryRun) return;
  ensureDir(destDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(s, d, dryRun, log);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
}

function copyAgents(repoRoot, destAgentsDir, dryRun, log) {
  const srcDir = path.join(repoRoot, 'agents');
  if (!fs.existsSync(srcDir)) {
    throw new Error(`Missing ${srcDir}`);
  }
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    copyFile(path.join(srcDir, file), path.join(destAgentsDir, file), dryRun, log);
  }
}

function copySkill(repoRoot, skillName, destSkillsRoot, dryRun, log) {
  const src = path.join(repoRoot, 'skills', skillName);
  const md = path.join(src, 'SKILL.md');
  if (!fs.existsSync(md)) {
    throw new Error(`Skill not found or missing SKILL.md: skills/${skillName}/`);
  }
  copyDirRecursive(src, path.join(destSkillsRoot, skillName), dryRun, log);
}

function syncForRoots(repoRoot, options, roots, log) {
  for (const root of roots) {
    if (options.agents) {
      copyAgents(repoRoot, path.join(root, 'agents'), options.dryRun, log);
    }
    const skillNames = options.allSkills
      ? listSkillDirs(path.join(repoRoot, 'skills'))
      : options.skills;
    for (const name of skillNames) {
      copySkill(repoRoot, name, path.join(root, 'skills'), options.dryRun, log);
    }
  }
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
    return;
  }

  if (options.help) {
    console.log(helpText());
    process.exit(0);
    return;
  }

  const repoRoot = path.join(__dirname, '..');
  const home = os.homedir();
  const logs = [];

  function log(msg) {
    logs.push(msg);
    console.log(msg);
  }

  const targets = [];
  if (options.claude) targets.push({ label: 'Claude Code', root: path.join(home, '.claude') });
  if (options.cursor) targets.push({ label: 'Cursor', root: path.join(home, '.cursor') });

  if (targets.length === 0) {
    console.error('Nothing to do: enable at least one of --claude-only / --cursor-only / defaults.');
    process.exit(1);
    return;
  }

  log('[ecc-sync-harnesses] Repo root: ' + repoRoot);

  for (const t of targets) {
    log(`\n== ${t.label} (${t.root}) ==`);
    syncForRoots(repoRoot, options, [t.root], log);
  }

  for (const proj of options.projectPaths) {
    const cursorRoot = path.join(proj, '.cursor');
    log(`\n== project .cursor (${cursorRoot}) ==`);
    syncForRoots(repoRoot, options, [cursorRoot], log);
  }

  if (options.dryRun) {
    log('\nDry run complete — no files written.');
  } else {
    log('\nDone.');
  }
}

module.exports = {
  parseArgs,
  listSkillDirs,
  copyAgents,
  copySkill,
  syncForRoots,
  helpText,
};

if (require.main === module) {
  main();
}
