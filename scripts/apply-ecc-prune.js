#!/usr/bin/env node
/**
 * Apply ecc-prune.json after install.sh — remove rules dirs, agents, commands, skills
 * from ~/.claude, optional project .cursor (see cursorProjectRoot in config),
 * or a fork repo tree (--target repo).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const Ajv = require('ajv');

const SCHEMA_PATH = path.join(__dirname, '..', 'schemas', 'ecc-prune-config.schema.json');

function showHelp(code = 0) {
  console.log(`
Apply ECC prune list (post-install customization)

Usage:
  node scripts/apply-ecc-prune.js [--config <path>] [--dry-run] [--target home|repo]

Options:
  --config <path>   Prune manifest JSON (default: ./ecc-prune.json, else ~/ecc-prune.json)
  --dry-run         Print actions only
  --target home     Prune under ~/.claude or claudeHome from config (default)
  --target repo     Prune under repo root (rules/, agents/, commands/, skills/) for fork maintenance
  --help            This help

Relative paths in copyIntoClaudeHome resolve against the directory that contains
the config file (ecc-prune.json), not your shell cwd — so you can run this from
anywhere if you pass --config /path/to/ecc-prune.json.

Optional cursorProjectRoot (relative to the config directory): same remove.*
is applied under <cursorProjectRoot>/.cursor/. Cursor rules use flat files
(java-*.md); Claude home uses rules/java/ subfolders.

See examples/ecc-prune.example.json
`);
  process.exit(code);
}

function parseArgs(argv) {
  const out = {
    configPath: null,
    dryRun: false,
    target: 'home',
    help: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--config') {
      out.configPath = argv[i + 1] || null;
      i += 1;
    } else if (a === '--target') {
      out.target = argv[i + 1] || 'home';
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  if (!['home', 'repo'].includes(out.target)) {
    throw new Error(`Invalid --target: ${out.target}`);
  }
  return out;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadConfig(configPath, cwd) {
  const resolved = path.isAbsolute(configPath)
    ? configPath
    : path.join(cwd, configPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Config not found: ${resolved}`);
  }
  const raw = readJson(resolved);
  const schema = readJson(SCHEMA_PATH);
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  if (!validate(raw)) {
    const msg = validate.errors.map(e => `${e.instancePath} ${e.message}`).join('; ');
    throw new Error(`Invalid ecc-prune config: ${msg}`);
  }
  return { path: resolved, data: raw };
}

function ensureMd(name) {
  const n = String(name).trim();
  if (!n) return '';
  return n.endsWith('.md') ? n : `${n}.md`;
}

function resolveRoot(data, target, cwd) {
  if (target === 'repo') {
    return path.resolve(cwd);
  }
  if (data.claudeHome && String(data.claudeHome).trim()) {
    return path.resolve(String(data.claudeHome).trim());
  }
  return path.join(os.homedir(), '.claude');
}

function rmPath(abs, dryRun, label) {
  if (!fs.existsSync(abs)) {
    console.log(`[skip] missing: ${label}`);
    return;
  }
  if (dryRun) {
    console.log(`[dry-run] would remove: ${label}`);
    return;
  }
  fs.rmSync(abs, { recursive: true, force: true });
  console.log(`[removed] ${label}`);
}

function sanitizeRulesDirName(dir) {
  const d = String(dir).replace(/[/\\\\]/g, '');
  if (!d || d === '.' || d === '..') return '';
  return d;
}

/** Cursor install flattens rules as .cursor/rules/<namespace>-<file>.md */
function rmCursorFlatRulesForNamespace(cursorRoot, namespace, dryRun) {
  const d = sanitizeRulesDirName(namespace);
  if (!d) return;
  const rulesDir = path.join(cursorRoot, 'rules');
  if (!fs.existsSync(rulesDir)) {
    console.log(`[skip] missing: .cursor/rules (for namespace ${d})`);
    return;
  }
  const prefix = `${d}-`;
  let entries;
  try {
    entries = fs.readdirSync(rulesDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (!ent.name.startsWith(prefix)) continue;
    const abs = path.join(rulesDir, ent.name);
    rmPath(abs, dryRun, `.cursor/rules/${ent.name}`);
  }
}

function applyRemoveToTree(root, remove, dryRun, rulesLayout) {
  const removeSafe = remove || {};
  for (const dir of removeSafe.rulesDirs || []) {
    const d = sanitizeRulesDirName(dir);
    if (!d) continue;
    if (rulesLayout === 'cursorFlat') {
      rmCursorFlatRulesForNamespace(root, d, dryRun);
    } else {
      rmPath(path.join(root, 'rules', d), dryRun, `rules/${d}`);
    }
  }

  for (const a of removeSafe.agents || []) {
    const base = ensureMd(a);
    if (!base) continue;
    rmPath(path.join(root, 'agents', base), dryRun, `agents/${base}`);
  }

  for (const c of removeSafe.commands || []) {
    const base = ensureMd(c);
    if (!base) continue;
    rmPath(path.join(root, 'commands', base), dryRun, `commands/${base}`);
  }

  for (const s of removeSafe.skillDirs || []) {
    const d = sanitizeRulesDirName(s);
    if (!d) continue;
    rmPath(path.join(root, 'skills', d), dryRun, `skills/${d}`);
  }
}

function copyIfSet(fromRelOrAbs, destAbs, dryRun, label, pathBase) {
  if (!fromRelOrAbs) return;
  const base = pathBase || process.cwd();
  const src = path.isAbsolute(fromRelOrAbs)
    ? fromRelOrAbs
    : path.resolve(base, fromRelOrAbs);
  if (!fs.existsSync(src)) {
    console.error(`[warn] copy source missing: ${src}`);
    return;
  }
  if (dryRun) {
    console.log(`[dry-run] would copy ${src} -> ${destAbs}`);
    return;
  }
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  fs.copyFileSync(src, destAbs);
  console.log(`[copied] ${label}`);
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv);
  } catch (e) {
    console.error(e.message);
    showHelp(1);
  }
  if (options.help) showHelp(0);

  const cwd = process.cwd();
  let configPath = options.configPath;
  if (!configPath) {
    const local = path.join(cwd, 'ecc-prune.json');
    const home = path.join(os.homedir(), 'ecc-prune.json');
    if (fs.existsSync(local)) configPath = local;
    else if (fs.existsSync(home)) configPath = home;
    else {
      console.error('No config: create ./ecc-prune.json or ~/ecc-prune.json (see examples/ecc-prune.example.json)');
      process.exit(1);
    }
  }

  const { path: configResolvedPath, data } = loadConfig(configPath, cwd);
  const configDir = path.dirname(configResolvedPath);
  const root = resolveRoot(data, options.target, cwd);
  const remove = data.remove || {};
  const dry = options.dryRun;

  console.log(`ECC prune — root: ${root} (${options.target})`);
  if (data.description) console.log(`Note: ${data.description}`);

  applyRemoveToTree(root, remove, dry, 'nested');

  const cursorRaw = data.cursorProjectRoot != null ? String(data.cursorProjectRoot).trim() : '';
  if (cursorRaw) {
    const cursorBase = path.resolve(configDir, cursorRaw);
    const cursorRoot = path.join(cursorBase, '.cursor');
    console.log(`ECC prune — cursor: ${cursorRoot} (flat rules)`);
    applyRemoveToTree(cursorRoot, remove, dry, 'cursorFlat');
  }

  const copy = data.copyIntoClaudeHome || {};
  if (copy['AGENTS.md'] || copy['plugin.json']) {
    if (options.target !== 'home') {
      console.log('[skip] copyIntoClaudeHome only applies with --target home');
    } else {
      if (copy['AGENTS.md']) {
        copyIfSet(copy['AGENTS.md'], path.join(root, 'AGENTS.md'), dry, 'AGENTS.md', configDir);
      }
      if (copy['plugin.json']) {
        copyIfSet(copy['plugin.json'], path.join(root, 'plugin.json'), dry, 'plugin.json', configDir);
      }
    }
  }

  if (dry) console.log('\nDry run complete — no files changed.');
}

main();
