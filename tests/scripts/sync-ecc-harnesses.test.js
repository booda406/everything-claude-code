/**
 * Tests for scripts/sync-ecc-harnesses.js
 * Run: node tests/scripts/sync-ecc-harnesses.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseArgs,
  listSkillDirs,
  syncForRoots,
} = require('../../scripts/sync-ecc-harnesses');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing sync-ecc-harnesses.js ===\n');
  let passed = 0;
  let failed = 0;

  if (test('parseArgs defaults', () => {
    const o = parseArgs(['node', 'x.js']);
    assert.strictEqual(o.dryRun, false);
    assert.strictEqual(o.agents, true);
    assert.strictEqual(o.agentFilter, null);
    assert.deepStrictEqual(o.skills, []);
    assert.strictEqual(o.claude, true);
    assert.strictEqual(o.cursor, true);
  })) passed++; else failed++;

  if (test('parseArgs --agent / --only-agent', () => {
    const o = parseArgs(['node', 'x.js', '--agent', 'ui-ux-designer', '--only-agent', 'planner.md']);
    assert.deepStrictEqual(o.agentFilter, ['ui-ux-designer.md', 'planner.md']);
  })) passed++; else failed++;

  if (test('parseArgs --skill twice', () => {
    const o = parseArgs(['node', 'x.js', '--skill', 'a', '--skill', 'b']);
    assert.deepStrictEqual(o.skills, ['a', 'b']);
  })) passed++; else failed++;

  if (test('parseArgs --claude-only', () => {
    const o = parseArgs(['node', 'x.js', '--claude-only']);
    assert.strictEqual(o.claude, true);
    assert.strictEqual(o.cursor, false);
  })) passed++; else failed++;

  if (test('listSkillDirs finds dirs with SKILL.md', () => {
    const repoRoot = path.join(__dirname, '../..');
    const names = listSkillDirs(path.join(repoRoot, 'skills'));
    assert.ok(names.includes('ui-ux-pro-max'), 'should include ui-ux-pro-max');
  })) passed++; else failed++;

  if (test('syncForRoots copies agents to temp home', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-sync-'));
    const repoRoot = path.join(__dirname, '../..');
    const logs = [];
    syncForRoots(
      repoRoot,
      { dryRun: false, agents: true, agentFilter: null, skills: [], allSkills: false },
      [tmp],
      m => logs.push(m)
    );
    const agentFiles = fs.readdirSync(path.join(tmp, 'agents')).filter(f => f.endsWith('.md'));
    assert.ok(agentFiles.includes('ui-ux-designer.md'));
    assert.ok(agentFiles.includes('planner.md'));
    fs.rmSync(tmp, { recursive: true, force: true });
  })) passed++; else failed++;

  if (test('syncForRoots copies one skill tree', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-sync-'));
    const repoRoot = path.join(__dirname, '../..');
    syncForRoots(
      repoRoot,
      { dryRun: false, agents: false, agentFilter: null, skills: ['ui-ux-pro-max'], allSkills: false },
      [tmp],
      () => {}
    );
    assert.ok(fs.existsSync(path.join(tmp, 'skills', 'ui-ux-pro-max', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(tmp, 'skills', 'ui-ux-pro-max', 'scripts', 'search.py')));
    fs.rmSync(tmp, { recursive: true, force: true });
  })) passed++; else failed++;

  if (test('syncForRoots copies only listed agents when agentFilter set', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-sync-'));
    const repoRoot = path.join(__dirname, '../..');
    syncForRoots(
      repoRoot,
      {
        dryRun: false,
        agents: true,
        agentFilter: ['planner.md'],
        skills: [],
        allSkills: false,
      },
      [tmp],
      () => {}
    );
    const agentFiles = fs.readdirSync(path.join(tmp, 'agents')).filter(f => f.endsWith('.md'));
    assert.deepStrictEqual(agentFiles, ['planner.md']);
    fs.rmSync(tmp, { recursive: true, force: true });
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
