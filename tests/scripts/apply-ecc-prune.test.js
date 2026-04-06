'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'apply-ecc-prune.js');

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (e) {
    console.error(`not ok ${name}`);
    throw e;
  }
}

test('dry-run removes nothing but exits 0', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-prune-'));
  const fakeHome = path.join(dir, 'claude');
  fs.mkdirSync(path.join(fakeHome, 'rules', 'php'), { recursive: true });
  fs.writeFileSync(path.join(fakeHome, 'rules', 'php', 'x.md'), 'x');
  fs.mkdirSync(path.join(fakeHome, 'agents'), { recursive: true });
  fs.writeFileSync(path.join(fakeHome, 'agents', 'go-reviewer.md'), 'x');

  const cfg = path.join(dir, 'ecc-prune.json');
  fs.writeFileSync(cfg, JSON.stringify({
    version: 1,
    claudeHome: fakeHome,
    remove: {
      rulesDirs: ['php'],
      agents: ['go-reviewer.md'],
    },
  }));

  const r = spawnSync(process.execPath, [SCRIPT, '--config', cfg, '--dry-run'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.ok(fs.existsSync(path.join(fakeHome, 'rules', 'php', 'x.md')));
  assert.ok(fs.existsSync(path.join(fakeHome, 'agents', 'go-reviewer.md')));
});

test('applies prune under claudeHome', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-prune-'));
  const fakeHome = path.join(dir, 'claude');
  fs.mkdirSync(path.join(fakeHome, 'rules', 'php'), { recursive: true });
  fs.writeFileSync(path.join(fakeHome, 'rules', 'php', 'x.md'), 'x');
  fs.mkdirSync(path.join(fakeHome, 'agents'), { recursive: true });
  fs.writeFileSync(path.join(fakeHome, 'agents', 'rust-reviewer.md'), 'x');

  const cfg = path.join(dir, 'ecc-prune.json');
  fs.writeFileSync(cfg, JSON.stringify({
    version: 1,
    claudeHome: fakeHome,
    remove: {
      rulesDirs: ['php'],
      agents: ['rust-reviewer'],
    },
  }));

  const r = spawnSync(process.execPath, [SCRIPT, '--config', cfg], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.ok(!fs.existsSync(path.join(fakeHome, 'rules', 'php')));
  assert.ok(!fs.existsSync(path.join(fakeHome, 'agents', 'rust-reviewer.md')));
});

test('--target repo prunes repo tree', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-prune-repo-'));
  fs.mkdirSync(path.join(dir, 'rules', 'perl'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'rules', 'perl', 'a.md'), 'a');
  fs.mkdirSync(path.join(dir, 'commands'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'commands', 'jira.md'), 'j');
  fs.mkdirSync(path.join(dir, 'skills', 'kotlin-patterns'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'skills', 'kotlin-patterns', 'SKILL.md'), 's');

  const cfg = path.join(dir, 'prune.json');
  fs.writeFileSync(cfg, JSON.stringify({
    version: 1,
    remove: {
      rulesDirs: ['perl'],
      commands: ['jira'],
      skillDirs: ['kotlin-patterns'],
    },
  }));

  const r = spawnSync(process.execPath, [SCRIPT, '--config', cfg, '--target', 'repo'], {
    cwd: dir,
    encoding: 'utf8',
  });
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.ok(!fs.existsSync(path.join(dir, 'rules', 'perl')));
  assert.ok(!fs.existsSync(path.join(dir, 'commands', 'jira.md')));
  assert.ok(!fs.existsSync(path.join(dir, 'skills', 'kotlin-patterns')));
});

test('cursorProjectRoot prunes .cursor with flat rules + nested agents/skills', () => {
  const cfgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-prune-cursor-'));
  const fakeHome = path.join(cfgDir, 'claude');
  fs.mkdirSync(fakeHome, { recursive: true });
  const cursorRules = path.join(cfgDir, '.cursor', 'rules');
  fs.mkdirSync(cursorRules, { recursive: true });
  fs.writeFileSync(path.join(cursorRules, 'java-testing.md'), 'j');
  fs.writeFileSync(path.join(cursorRules, 'typescript-testing.md'), 't');
  fs.mkdirSync(path.join(cfgDir, '.cursor', 'agents'), { recursive: true });
  fs.writeFileSync(path.join(cfgDir, '.cursor', 'agents', 'java-reviewer.md'), 'a');
  fs.mkdirSync(path.join(cfgDir, '.cursor', 'skills', 'kotlin-patterns'), { recursive: true });
  fs.writeFileSync(path.join(cfgDir, '.cursor', 'skills', 'kotlin-patterns', 'SKILL.md'), 's');

  const cfg = path.join(cfgDir, 'ecc-prune.json');
  fs.writeFileSync(cfg, JSON.stringify({
    version: 1,
    claudeHome: fakeHome,
    cursorProjectRoot: '.',
    remove: {
      rulesDirs: ['java'],
      agents: ['java-reviewer'],
      skillDirs: ['kotlin-patterns'],
    },
  }));

  const r = spawnSync(process.execPath, [SCRIPT, '--config', cfg], {
    cwd: os.homedir(),
    encoding: 'utf8',
  });
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.ok(!fs.existsSync(path.join(cursorRules, 'java-testing.md')));
  assert.ok(fs.existsSync(path.join(cursorRules, 'typescript-testing.md')));
  assert.ok(!fs.existsSync(path.join(cfgDir, '.cursor', 'agents', 'java-reviewer.md')));
  assert.ok(!fs.existsSync(path.join(cfgDir, '.cursor', 'skills', 'kotlin-patterns')));
});

test('copyIntoClaudeHome resolves relative overlay paths from config file dir (not cwd)', () => {
  const cfgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-prune-cfg-'));
  const fakeHome = path.join(cfgDir, 'claude');
  fs.mkdirSync(fakeHome, { recursive: true });
  const relOverlay = path.join(cfgDir, 'overlays');
  fs.mkdirSync(relOverlay, { recursive: true });
  fs.writeFileSync(path.join(relOverlay, 'note.md'), 'from-overlay');

  const cfg = path.join(cfgDir, 'ecc-prune.json');
  fs.writeFileSync(cfg, JSON.stringify({
    version: 1,
    claudeHome: fakeHome,
    remove: {},
    copyIntoClaudeHome: {
      'AGENTS.md': './overlays/note.md',
    },
  }));

  const r = spawnSync(process.execPath, [SCRIPT, '--config', cfg], {
    cwd: os.homedir(),
    encoding: 'utf8',
  });
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.strictEqual(
    fs.readFileSync(path.join(fakeHome, 'AGENTS.md'), 'utf8'),
    'from-overlay'
  );
});

test('copyIntoClaudeHome copies plugin.json when target home', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-prune-'));
  const fakeHome = path.join(dir, 'claude');
  fs.mkdirSync(fakeHome, { recursive: true });
  fs.writeFileSync(path.join(fakeHome, 'plugin.json'), '{"name":"old"}');

  const overlayPath = path.join(dir, 'overlay-plugin.json');
  fs.writeFileSync(overlayPath, JSON.stringify({
    name: 'everything-claude-code',
    version: '1.9.0',
    agents: ['./agents/a.md'],
    skills: ['./skills/'],
    commands: ['./commands/'],
  }));

  const cfg = path.join(dir, 'ecc-prune.json');
  fs.writeFileSync(cfg, JSON.stringify({
    version: 1,
    claudeHome: fakeHome,
    remove: {},
    copyIntoClaudeHome: {
      'plugin.json': overlayPath,
    },
  }));

  const r = spawnSync(process.execPath, [SCRIPT, '--config', cfg], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  const written = JSON.parse(fs.readFileSync(path.join(fakeHome, 'plugin.json'), 'utf8'));
  assert.strictEqual(written.name, 'everything-claude-code');
  assert.deepStrictEqual(written.agents, ['./agents/a.md']);
});

console.log('apply-ecc-prune tests passed');
