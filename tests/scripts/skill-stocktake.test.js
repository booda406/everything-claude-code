'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const scripts = path.join(__dirname, '../../skills/skill-stocktake/scripts');
let passed = 0;
let failed = 0;

function fixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-stocktake-')));
  const global = path.join(root, 'global', '.claude', 'skills');
  const project = path.join(root, 'project', '.claude', 'skills');
  const observations = path.join(root, 'observations.jsonl');
  fs.mkdirSync(global, { recursive: true });
  return { root, global, project, observations };
}

function skill(root, name = 'alpha', text) {
  const file = path.join(root, name, 'SKILL.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text || `---\nname: ${name}\ndescription: Example skill\n---\n\n# ${name}\n`);
  return file;
}

function invoke(f, script, args = [], input) {
  return spawnSync('bash', [path.join(scripts, script), ...args], {
    cwd: f.root,
    env: {
      ...process.env,
      SKILL_STOCKTAKE_GLOBAL_DIR: f.global,
      SKILL_STOCKTAKE_PROJECT_DIR: f.project,
      SKILL_STOCKTAKE_OBSERVATIONS: f.observations,
    },
    input,
    encoding: 'utf8',
    timeout: 10000,
    maxBuffer: 4 * 1024 * 1024,
  });
}

function scan(f) {
  const result = invoke(f, 'scan.sh');
  assert.strictEqual(result.status, 0, result.stderr || result.error?.message);
  return JSON.parse(result.stdout);
}

function observed(f, records) {
  fs.writeFileSync(f.observations, records.map(record => JSON.stringify(record)).join('\n') + '\n');
}

function read(file, days = 1, extra = {}) {
  return { tool: 'Read', path: file, timestamp: new Date(Date.now() - days * 86400000).toISOString(), ...extra };
}

function cache(f, values, evaluatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')) {
  const file = path.join(f.root, 'results.json');
  fs.writeFileSync(file, JSON.stringify({ evaluated_at: evaluatedAt, skills: values }));
  return file;
}

function oldMtime(file) {
  fs.utimesSync(file, new Date('2000-01-01T00:00:00Z'), new Date('2000-01-01T00:00:00Z'));
}

function quick(f, file) {
  const result = invoke(f, 'quick-diff.sh', [file]);
  assert.strictEqual(result.status, 0, result.stderr || result.error?.message);
  return JSON.parse(result.stdout);
}

function test(name, fn) {
  const f = fixture();
  try {
    fn(f);
    passed++;
    console.log(`PASS: ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL: ${name}\n  ${error.message}`);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

test('lists only exact SKILL.md files, not references or differently named Markdown', f => {
  skill(f.global);
  const refs = path.join(f.global, 'alpha', 'references');
  fs.mkdirSync(refs);
  for (const name of ['guide.md', 'README.md', 'skill.md']) fs.writeFileSync(path.join(refs, name), '# Reference\n');
  const data = scan(f);
  assert.strictEqual(data.skills.length, 1);
  assert.strictEqual(data.scan_summary.global.count, 1);
  assert.deepStrictEqual(data.scan_summary.counts, { entry_paths: 1, physical_skills: 1, skill_versions: 1 });
});

test('missing observation source produces unknown rather than zero', f => {
  skill(f.global);
  const data = scan(f);
  assert.strictEqual(data.observation_source.status, 'missing');
  assert.strictEqual(data.skills[0].usage_status, 'unknown');
  assert.strictEqual(data.skills[0].use_7d, null);
  assert.strictEqual(data.skills[0].use_30d, null);
});

test('empty observation source produces unknown', f => {
  skill(f.global);
  fs.writeFileSync(f.observations, '');
  const data = scan(f);
  assert.strictEqual(data.observation_source.status, 'empty');
  assert.strictEqual(data.skills[0].use_7d, null);
});

test('invalid JSON after a valid observation cannot turn partial evidence into counts', f => {
  const file = skill(f.global);
  observed(f, [read(file)]);
  fs.appendFileSync(f.observations, 'invalid json\n');
  const data = scan(f);
  assert.strictEqual(data.observation_source.status, 'invalid');
  assert.strictEqual(data.skills[0].use_7d, null);
  assert.strictEqual(data.skills[0].use_30d, null);
});

test('invalid Read timestamps make observation coverage unknown', f => {
  const file = skill(f.global);
  observed(f, [read(file, 1, { timestamp: 'not-a-date' })]);
  const data = scan(f);
  assert.strictEqual(data.observation_source.status, 'invalid');
  assert.strictEqual(data.skills[0].use_30d, null);
});

test('invalid Read path schema is not silently accepted as zero usage', f => {
  skill(f.global);
  observed(f, [{ tool: 'Read', path: 42, timestamp: new Date().toISOString() }]);
  const data = scan(f);
  assert.strictEqual(data.observation_source.status, 'invalid');
  assert.strictEqual(data.skills[0].use_7d, null);
});

test('a directory observation source is unreadable and is never rewritten', f => {
  skill(f.global);
  fs.mkdirSync(f.observations);
  const data = scan(f);
  assert.strictEqual(data.observation_source.status, 'unreadable');
  assert.strictEqual(data.skills[0].use_7d, null);
  assert.strictEqual(fs.statSync(f.observations).isDirectory(), true);
});

test('valid matching Read history yields distinct seven and thirty day counts', f => {
  const file = skill(f.global);
  observed(f, [read(file, 1), read(file, 10), read(file, 40), read(file, 1, { tool: 'Write' })]);
  const data = scan(f);
  assert.strictEqual(data.observation_source.status, 'available');
  assert.strictEqual(data.skills[0].usage_status, 'observed');
  assert.strictEqual(data.skills[0].use_7d, 1);
  assert.strictEqual(data.skills[0].use_30d, 2);
});

test('known older matching Read history permits an observed window count of zero', f => {
  const file = skill(f.global);
  observed(f, [read(file, 40)]);
  const row = scan(f).skills[0];
  assert.strictEqual(row.usage_status, 'observed');
  assert.strictEqual(row.use_7d, 0);
  assert.strictEqual(row.use_30d, 0);
});

test('valid observations for another skill do not imply zero for the unobserved skill', f => {
  const alpha = skill(f.global);
  const beta = skill(f.global, 'beta');
  observed(f, [read(beta)]);
  const data = scan(f);
  const row = data.skills.find(item => item.real_path === alpha);
  assert.strictEqual(row.usage_status, 'unknown');
  assert.strictEqual(row.use_7d, null);
});

test('paths with spaces are matched exactly rather than split or prefix matched', f => {
  const exact = skill(f.global, 'skill with spaces');
  const other = skill(f.global, 'skill with spaces extra');
  observed(f, [read(exact), read(other)]);
  const data = scan(f);
  assert.strictEqual(data.skills.find(row => row.real_path === exact).use_7d, 1);
  assert.strictEqual(data.skills.find(row => row.real_path === other).use_7d, 1);
});

test('directory symlinks become aliases of one physical skill', f => {
  const file = skill(f.global);
  fs.symlinkSync(path.dirname(file), path.join(f.global, 'alpha-alias'), 'dir');
  const data = scan(f);
  assert.strictEqual(data.skills.length, 1);
  assert.strictEqual(data.scan_summary.counts.entry_paths, 2);
  assert.strictEqual(data.scan_summary.counts.physical_skills, 1);
  const row = data.skills[0];
  assert.strictEqual(row.real_path, file);
  assert.strictEqual(row.aliases.length, 1);
  assert.ok(!row.aliases.includes(row.path));
});

test('a symlinked SKILL.md is counted as an alias, not a second deployment', f => {
  const file = skill(f.global);
  const alias = path.join(f.global, 'file-alias', 'SKILL.md');
  fs.mkdirSync(path.dirname(alias));
  fs.symlinkSync(file, alias);
  const data = scan(f);
  assert.strictEqual(data.skills.length, 1);
  assert.strictEqual(data.scan_summary.counts.entry_paths, 2);
  assert.strictEqual(data.skills[0].aliases.length, 1);
});

test('hard links are also physical aliases', f => {
  const file = skill(f.global);
  const alias = path.join(f.global, 'hard-alias', 'SKILL.md');
  fs.mkdirSync(path.dirname(alias));
  fs.linkSync(file, alias);
  const data = scan(f);
  assert.strictEqual(data.skills.length, 1);
  assert.strictEqual(data.skills[0].aliases.length, 1);
});

test('same-content separate files remain distinct deployment copies', f => {
  const file = skill(f.global);
  const copy = skill(f.project, 'alpha', fs.readFileSync(file, 'utf8'));
  const data = scan(f);
  assert.strictEqual(data.skills.length, 2);
  assert.strictEqual(data.scan_summary.counts.skill_versions, 1);
  assert.strictEqual(data.skills[0].deployment_group, data.skills[1].deployment_group);
  for (const row of data.skills) {
    assert.deepStrictEqual(row.aliases, []);
    assert.strictEqual(row.deployment_copies.length, 1);
    assert.ok(row.deployment_copies.includes(row.real_path === file ? copy : file));
  }
});

test('same-name different-content variants are never collapsed', f => {
  skill(f.global);
  skill(f.project, 'alpha', '---\nname: alpha\ndescription: Different implementation\n---\n\n# Version two\n');
  const data = scan(f);
  assert.strictEqual(data.skills.length, 2);
  assert.strictEqual(data.scan_summary.counts.skill_versions, 2);
  assert.notStrictEqual(data.skills[0].deployment_group, data.skills[1].deployment_group);
  assert.ok(data.skills.every(row => row.name_conflict === true));
  assert.ok(data.skills.every(row => row.deployment_copies.length === 0));
});

test('global and project aliases retain both scopes without double counting', f => {
  skill(f.global);
  fs.mkdirSync(path.dirname(f.project), { recursive: true });
  fs.symlinkSync(f.global, f.project, 'dir');
  const data = scan(f);
  assert.strictEqual(data.skills.length, 1);
  assert.strictEqual(data.scan_summary.global.count, 1);
  assert.strictEqual(data.scan_summary.project.count, 1);
  assert.deepStrictEqual([...data.skills[0].scopes].sort(), ['global', 'project']);
  assert.strictEqual(data.scan_summary.counts.entry_paths, 2);
});

test('Read observations through aliases count once and do not leak to deployment copies', f => {
  const file = skill(f.global);
  const aliasDir = path.join(f.global, 'alpha-alias');
  fs.symlinkSync(path.dirname(file), aliasDir, 'dir');
  const copy = skill(f.project, 'alpha', fs.readFileSync(file, 'utf8'));
  observed(f, [read(path.join(aliasDir, 'SKILL.md'))]);
  const data = scan(f);
  assert.strictEqual(data.skills.find(row => row.real_path === file).use_7d, 1);
  assert.strictEqual(data.skills.find(row => row.real_path === copy).use_7d, null);
});

test('an explicit event ID deduplicates the same read through two aliases', f => {
  const file = skill(f.global);
  const aliasDir = path.join(f.global, 'alias');
  fs.symlinkSync(path.dirname(file), aliasDir, 'dir');
  observed(f, [read(file, 1, { id: 'same-event' }), read(path.join(aliasDir, 'SKILL.md'), 1, { id: 'same-event' })]);
  assert.strictEqual(scan(f).skills[0].use_7d, 1);
});

test('symlink directory cycles do not recurse forever or inflate counts', f => {
  const file = skill(f.global);
  fs.symlinkSync(f.global, path.join(path.dirname(file), 'loop'), 'dir');
  const data = scan(f);
  assert.strictEqual(data.skills.length, 1);
  assert.strictEqual(data.scan_summary.counts.physical_skills, 1);
});

test('missing roots are explicit and return an empty skill inventory', f => {
  fs.rmSync(f.global, { recursive: true });
  const data = scan(f);
  assert.strictEqual(data.scan_summary.global.found, false);
  assert.strictEqual(data.scan_summary.project.found, false);
  assert.deepStrictEqual(data.skills, []);
});

test('missing names use the canonical folder and folded descriptions are usable text', f => {
  const file = skill(f.global, 'canonical', '---\ndescription: >\n  First line\n  second line.\n---\n\n# Example\n');
  fs.symlinkSync(path.dirname(file), path.join(f.global, 'alias-name'), 'dir');
  const row = scan(f).skills[0];
  assert.strictEqual(row.name, 'canonical');
  assert.strictEqual(row.description.trim(), 'First line second line.');
});

test('quick-diff ignores references and other Markdown files', f => {
  const file = skill(f.global);
  oldMtime(file);
  fs.writeFileSync(path.join(path.dirname(file), 'README.md'), '# New reference\n');
  const result = quick(f, cache(f, { alpha: { path: file } }));
  assert.deepStrictEqual(result, []);
});

test('quick-diff recognizes a cached alias as the same known physical file', f => {
  const file = skill(f.global);
  oldMtime(file);
  const aliasDir = path.join(f.global, 'alias');
  fs.symlinkSync(path.dirname(file), aliasDir, 'dir');
  const result = quick(f, cache(f, { alpha: { path: path.join(aliasDir, 'SKILL.md') } }));
  assert.deepStrictEqual(result, []);
});

test('quick-diff reports a new physical deployment independently', f => {
  const file = skill(f.global);
  const copy = skill(f.project, 'alpha', fs.readFileSync(file, 'utf8'));
  oldMtime(file);
  oldMtime(copy);
  const result = quick(f, cache(f, { alpha: { path: file } }));
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].real_path, copy);
  assert.strictEqual(result[0].is_new, true);
  assert.strictEqual(result[0].deployment_copies.length, 1);
});

test('quick-diff catches a content edit even when mtime is preserved', f => {
  const file = skill(f.global);
  oldMtime(file);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const saved = cache(f, { alpha: { path: file, content_sha256: hash } });
  fs.appendFileSync(file, '\nChanged body\n');
  oldMtime(file);
  const result = quick(f, saved);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].is_new, false);
  assert.notStrictEqual(result[0].content_sha256, hash);
});

test('quick-diff rejects invalid cache JSON and invalid evaluated_at', f => {
  skill(f.global);
  const file = path.join(f.root, 'invalid.json');
  fs.writeFileSync(file, 'not json');
  let result = invoke(f, 'quick-diff.sh', [file]);
  assert.notStrictEqual(result.status, 0);
  fs.writeFileSync(file, JSON.stringify({ evaluated_at: 'bad-date', skills: {} }));
  result = invoke(f, 'quick-diff.sh', [file]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /evaluated_at|timestamp|date/i);
});

test('save-results roundtrips unknown usage and multiple physical identities', f => {
  const file = path.join(f.root, 'saved.json');
  const row = { name: 'alpha', path: '/fixture/a/SKILL.md', use_7d: null, use_30d: null, aliases: ['/fixture/alias/SKILL.md'], deployment_group: 'version-a' };
  let result = invoke(f, 'save-results.sh', [file], JSON.stringify({ skills: { physicalA: row } }));
  assert.strictEqual(result.status, 0, result.stderr);
  result = invoke(f, 'save-results.sh', [file], JSON.stringify({ skills: { physicalB: { ...row, path: '/fixture/b/SKILL.md' } } }));
  assert.strictEqual(result.status, 0, result.stderr);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(Object.keys(data.skills).length, 2);
  assert.strictEqual(data.skills.physicalA.use_7d, null);
  assert.deepStrictEqual(data.skills.physicalA.aliases, row.aliases);
});

test('quick-diff refuses a scan root that is a file instead of a directory', f => {
  const saved = cache(f, {});
  fs.rmSync(f.global, { recursive: true });
  fs.writeFileSync(f.global, 'Not a directory\n');
  const result = invoke(f, 'quick-diff.sh', [saved]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /incomplete|full.stocktake|directory/i);
});

test('quick-diff refuses a broken subtree instead of calling readable skills unchanged', f => {
  const file = skill(f.global);
  oldMtime(file);
  const saved = cache(f, { alpha: { path: file } });
  fs.symlinkSync(path.join(f.root, 'missing-subtree'), path.join(f.global, 'broken-subtree'), 'dir');
  const result = invoke(f, 'quick-diff.sh', [saved]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /incomplete|full.stocktake|unreadable/i);
});

test('quick-diff requires a full stocktake when a cached skill is now absent', f => {
  const file = skill(f.global);
  oldMtime(file);
  const saved = cache(f, { alpha: { path: file } });
  fs.unlinkSync(file);
  const result = invoke(f, 'quick-diff.sh', [saved]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /cached.*skill|current scan|full.stocktake/i);
});

test('quick-diff ignores cached skills from another project outside the current roots', f => {
  const file = skill(f.global);
  const outside = skill(path.join(f.root, 'other-project', '.claude', 'skills'), 'outside');
  oldMtime(file);
  oldMtime(outside);
  const saved = cache(f, { alpha: { path: file }, outside: { path: outside } });
  assert.deepStrictEqual(quick(f, saved), []);
});

test('quick-diff ignores non-SKILL reference entries left in legacy caches', f => {
  const file = skill(f.global);
  const reference = path.join(path.dirname(file), 'README.md');
  fs.writeFileSync(reference, '# Legacy reference\n');
  oldMtime(file);
  const saved = cache(f, { alpha: { path: file }, reference: { path: reference } });
  assert.deepStrictEqual(quick(f, saved), []);
});

test('implicit null, boolean, numeric and date metadata names use canonical folder names', f => {
  const values = ['null', '~', 'true', 'false', '42', '-3', '0.5', '2026-11-08'];
  const expected = values.map((_value, index) => `fallback-${index}`);
  for (const [index, value] of values.entries()) {
    skill(f.global, expected[index], `---\nname: ${value}\ndescription: Implicit scalar fixture\n---\n\n# Fixture\n`);
  }
  const data = scan(f);
  assert.deepStrictEqual(data.skills.map(row => row.name).sort(), expected.sort());
  assert.ok(data.skills.every(row => row.metadata_status === 'folder_name_fallback'));
});

test('quoted null, boolean, numeric and date metadata names remain literal strings', f => {
  const values = ['null', 'true', '42', '2026-11-08'];
  for (const [index, value] of values.entries()) {
    const quoted = index % 2 === 0 ? JSON.stringify(value) : `'${value}'`;
    skill(f.global, `literal-${index}`, `---\nname: ${quoted}\ndescription: Quoted scalar fixture\n---\n\n# Fixture\n`);
  }
  const data = scan(f);
  assert.deepStrictEqual(data.skills.map(row => row.name).sort(), values.sort());
  assert.ok(data.skills.every(row => row.metadata_status === 'scalar_fields'));
});

test('implicit null cannot collapse distinct folder identities into one deployment version', f => {
  const content = '---\nname: null\ndescription: Shared content\n---\n\n# Shared\n';
  skill(f.global, 'first-folder', content);
  skill(f.global, 'second-folder', content);
  const data = scan(f);
  assert.deepStrictEqual(data.skills.map(row => row.name).sort(), ['first-folder', 'second-folder']);
  assert.strictEqual(data.scan_summary.counts.skill_versions, 2);
  assert.ok(data.skills.every(row => row.deployment_copies.length === 0));
});

test('adding an earlier hardlink alias does not change the existing physical skill ID', f => {
  const file = skill(f.global, 'z-original');
  const before = scan(f).skills[0];
  const alias = path.join(f.global, 'a-earlier', 'SKILL.md');
  fs.mkdirSync(path.dirname(alias));
  fs.linkSync(file, alias);
  const after = scan(f);
  assert.strictEqual(after.skills.length, 1);
  assert.strictEqual(after.skills[0].id, before.id);
  assert.strictEqual(after.skills[0].aliases.length, 1);
});

test('quick-diff prefers the exact current ID over a stale legacy same-path hash', f => {
  const file = skill(f.global);
  oldMtime(file);
  const row = scan(f).skills[0];
  const saved = cache(f, {
    legacy: { path: file, content_sha256: '0'.repeat(64) },
    [row.id]: row,
  });
  assert.deepStrictEqual(quick(f, saved), []);
});

test('scanner-ID saves supersede an atomically replaced entry while preserving another deployment', f => {
  const file = skill(f.global);
  const copy = skill(f.project, 'alpha', fs.readFileSync(file, 'utf8'));
  const first = scan(f).skills;
  const original = first.find(row => row.real_path === file);
  const deployment = first.find(row => row.real_path === copy);
  const saved = path.join(f.root, 'physical-results.json');
  let result = invoke(f, 'save-results.sh', [saved], JSON.stringify({
    skills: { [original.id]: original, [deployment.id]: deployment },
  }));
  assert.strictEqual(result.status, 0, result.stderr);
  const replacement = file + '.replacement';
  fs.writeFileSync(replacement, fs.readFileSync(file, 'utf8') + '\nUpdated body\n');
  fs.renameSync(replacement, file);
  const current = scan(f).skills.find(row => row.real_path === file);
  assert.notStrictEqual(current.id, original.id);
  result = invoke(f, 'save-results.sh', [saved], JSON.stringify({ skills: { [current.id]: current } }));
  assert.strictEqual(result.status, 0, result.stderr);
  const merged = JSON.parse(fs.readFileSync(saved, 'utf8')).skills;
  assert.strictEqual(Object.keys(merged).length, 2);
  assert.ok(!Object.hasOwn(merged, original.id));
  assert.strictEqual(merged[current.id].content_sha256, current.content_sha256);
  assert.strictEqual(merged[deployment.id].path, deployment.path);
});

test('save-results rejects malformed input JSON without changing existing bytes', f => {
  const file = path.join(f.root, 'saved.json');
  const original = JSON.stringify({ skills: { alpha: { path: '/fixture/alpha/SKILL.md' } }, notes: 'manual' });
  fs.writeFileSync(file, original);
  const result = invoke(f, 'save-results.sh', [file], '{invalid json');
  assert.notStrictEqual(result.status, 0);
  assert.strictEqual(fs.readFileSync(file, 'utf8'), original);
});

test('save-results rejects malformed skills schemas without replacing existing data', f => {
  const file = path.join(f.root, 'saved.json');
  const original = JSON.stringify({ skills: { alpha: { path: '/fixture/alpha/SKILL.md' } } });
  fs.writeFileSync(file, original);
  const invalid = [
    { skills: [] },
    { skills: { bad: { path: 42 } } },
    { skills: { bad: { path: '/fixture/bad/SKILL.md', aliases: 'not-an-array' } } },
  ];
  for (const value of invalid) {
    const result = invoke(f, 'save-results.sh', [file], JSON.stringify(value));
    assert.notStrictEqual(result.status, 0);
    assert.strictEqual(fs.readFileSync(file, 'utf8'), original);
  }
});

test('save-results does not overwrite an existing malformed cache', f => {
  const file = path.join(f.root, 'saved.json');
  const incoming = JSON.stringify({ skills: { alpha: { path: '/fixture/alpha/SKILL.md' } } });
  for (const original of ['not json', JSON.stringify({ skills: [] })]) {
    fs.writeFileSync(file, original);
    const result = invoke(f, 'save-results.sh', [file], incoming);
    assert.notStrictEqual(result.status, 0);
    assert.strictEqual(fs.readFileSync(file, 'utf8'), original);
  }
});

test('save-results does not create a missing destination parent', f => {
  const parent = path.join(f.root, 'not-created');
  const file = path.join(parent, 'saved.json');
  const result = invoke(f, 'save-results.sh', [file], JSON.stringify({ skills: {} }));
  assert.notStrictEqual(result.status, 0);
  assert.strictEqual(fs.existsSync(parent), false);
});

test('save-results preserves existing mode and manual fields while updating batch metadata', f => {
  const file = path.join(f.root, 'saved.json');
  fs.writeFileSync(file, JSON.stringify({ skills: {}, notes: { manual: true }, mode: 'full' }), { mode: 0o640 });
  const originalMode = fs.statSync(file).mode & 0o777;
  const batch = { total: 2, evaluated: 1, status: 'in_progress' };
  const before = Date.now();
  const result = invoke(f, 'save-results.sh', [file], JSON.stringify({
    skills: { alpha: { path: '/fixture/alpha/SKILL.md', use_7d: null } },
    mode: 'quick', batch_progress: batch, evaluated_at: '2000-01-01T00:00:00Z',
  }));
  assert.strictEqual(result.status, 0, result.stderr);
  const merged = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(fs.statSync(file).mode & 0o777, originalMode);
  assert.deepStrictEqual(merged.notes, { manual: true });
  assert.strictEqual(merged.mode, 'quick');
  assert.deepStrictEqual(merged.batch_progress, batch);
  assert.strictEqual(merged.skills.alpha.use_7d, null);
  assert.ok(Date.parse(merged.evaluated_at) >= before - 1000);
  assert.ok(Date.parse(merged.evaluated_at) <= Date.now());
});

test('save-results rename failure preserves the original and removes temporary files', f => {
  const file = path.join(f.root, 'saved.json');
  const original = JSON.stringify({ skills: {}, notes: 'manual' });
  fs.writeFileSync(file, original);
  const entries = fs.readdirSync(f.root).sort();
  const originalMode = fs.statSync(file).mode & 0o777;
  const implementation = require(path.join(scripts, 'stocktake.js'));
  const rename = fs.renameSync;
  try {
    fs.renameSync = (from, to) => {
      if (to !== file) return rename(from, to);
      const error = new Error('simulated rename failure');
      error.code = 'EIO';
      throw error;
    };
    assert.throws(() => implementation.saveResults(file, JSON.stringify({ skills: {} })), /simulated rename failure/);
  } finally {
    fs.renameSync = rename;
  }
  assert.strictEqual(fs.readFileSync(file, 'utf8'), original);
  assert.strictEqual(fs.statSync(file).mode & 0o777, originalMode);
  assert.deepStrictEqual(fs.readdirSync(f.root).sort(), entries);
});

test('a save followed immediately by quick-diff preserves sub-second timestamp precision', f => {
  const file = skill(f.global);
  const mtime = new Date('2026-01-01T12:00:00.400Z');
  fs.utimesSync(file, mtime, mtime);
  const row = scan(f).skills[0];
  const saved = path.join(f.root, 'saved.json');
  const implementation = require(path.join(scripts, 'stocktake.js'));
  implementation.saveResults(saved, JSON.stringify({ skills: { [row.id]: row } }), Date.parse('2026-01-01T12:00:00.500Z'));
  assert.deepStrictEqual(quick(f, saved), []);
});

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
