#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const DAY = 86400000;
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const physicalKey = stat => `${stat.dev}:${stat.ino}`;

function absolutePath(value, home) {
  const expanded = value === '~' ? home : (/^~[/\\]/.test(value)) ? path.join(home, value.slice(2)) : value;
  return path.resolve(expanded);
}

function displayPath(value, home) {
  return value.startsWith(home + path.sep) ? '~/' + path.relative(home, value).split(path.sep).join('/') : value;
}

function scalar(value) {
  const text = value.trim();
  if (text.startsWith('"')) {
    try { return JSON.parse(text); } catch { return null; }
  }
  if (text.startsWith("'")) {
    return /^'(?:[^']|'')*'$/.test(text) ? text.slice(1, -1).replace(/''/g, "'") : null;
  }
  if (/^[!&*[\]{}]|^\s*$/.test(text)) return null;
  const plain = text.replace(/\s+#.*$/, '').trim();
  const implicit = /^(?:null|~|true|false|yes|no|on|off)$/i;
  const number = /^[+-]?(?:(?:0[box][0-9a-f_]+)|(?:\d[\d_]*(?:\.[\d_]*)?|\.[\d_]+)(?:e[+-]?\d+)?|\.(?:inf|nan))$/i;
  const date = /^\d{4}-\d{1,2}-\d{1,2}(?:[Tt\s].*)?$/;
  return implicit.test(plain) || number.test(plain) || date.test(plain) ? null : plain;
}

// Read only the supported name/description scalar subset; never execute YAML.
function frontmatter(text, fallback) {
  const match = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const lines = match ? match[1].split(/\r?\n/) : [];
  function field(key) {
    const index = lines.findIndex(line => line.startsWith(key + ':'));
    if (index < 0) return null;
    const raw = lines[index].slice(key.length + 1).trim();
    if (!/^[>|][-+]?$/.test(raw)) return scalar(raw);
    const block = [];
    for (const line of lines.slice(index + 1)) {
      if (line.trim() && !/^\s/.test(line)) break;
      block.push(line.trim());
    }
    return block.join(raw.startsWith('>') ? ' ' : '\n').trim();
  }
  const name = field('name');
  const description = field('description');
  return {
    name: typeof name === 'string' && name ? name : fallback,
    description: typeof description === 'string' ? description : '',
    metadata_status: name && typeof name === 'string' ? 'scalar_fields' : 'folder_name_fallback',
  };
}

function rootsFor(projectDir, env, cwd, home) {
  return [
    { scope: 'global', path: absolutePath(env.SKILL_STOCKTAKE_GLOBAL_DIR || path.join(home, '.claude/skills'), home) },
    { scope: 'project', path: absolutePath(env.SKILL_STOCKTAKE_PROJECT_DIR || projectDir || path.join(cwd, '.claude/skills'), home) },
  ];
}

function collectEntries(root, scope, errors, ancestors = new Set()) {
  let real;
  let entries;
  try {
    real = fs.realpathSync(root);
    if (ancestors.has(real)) return [];
    entries = fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    if (error.code !== 'ENOENT') errors.push({ path: root, code: error.code });
    return [];
  }
  const nextAncestors = new Set([...ancestors, real]);
  return entries.flatMap(entry => {
    const candidate = path.join(root, entry.name);
    try {
      const stat = fs.statSync(candidate, { bigint: true });
      if (stat.isDirectory()) return collectEntries(candidate, scope, errors, nextAncestors);
      if (entry.name !== 'SKILL.md' || !stat.isFile()) return [];
      const realPath = fs.realpathSync(candidate);
      const content = fs.readFileSync(candidate);
      return [{ key: physicalKey(stat), entry: candidate, real_path: realPath, scope,
        mtime: stat.mtime.toISOString(), content_sha256: digest(content),
        ...frontmatter(content.toString('utf8'), path.basename(path.dirname(realPath))) }];
    } catch (error) {
      errors.push({ path: candidate, code: error.code });
      return [];
    }
  });
}

function physicalRows(entries, home) {
  const grouped = entries.reduce((groups, entry) => {
    const previous = groups.get(entry.key) || [];
    return new Map([...groups, [entry.key, [...previous, entry]]]);
  }, new Map());
  return [...grouped.values()].map(group => {
    const primary = group.find(entry => entry.entry === entry.real_path) || group[0];
    const paths = [...new Set(group.map(entry => entry.entry))].sort();
    return {
      id: digest(primary.key), path: displayPath(primary.entry, home),
      real_path: primary.real_path, name: primary.name, description: primary.description,
      mtime: primary.mtime, content_sha256: primary.content_sha256,
      metadata_status: primary.metadata_status,
      aliases: paths.filter(value => value !== primary.entry).map(value => displayPath(value, home)),
      scopes: [...new Set(group.map(entry => entry.scope))].sort(),
      deployment_group: digest(`${primary.name}\0${primary.content_sha256}`),
    };
  }).sort((a, b) => a.path.localeCompare(b.path));
}

function classifyCopies(rows) {
  return rows.map(row => ({
    ...row,
    deployment_copies: rows.filter(other => other.id !== row.id && other.deployment_group === row.deployment_group).map(other => other.path),
    name_conflict: rows.some(other => other.name === row.name && other.content_sha256 !== row.content_sha256),
  }));
}

function timestamp(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const result = Date.parse(value);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth && hour < 24 && minute < 60 && second < 60 && Number.isFinite(result) ? result : null;
}

function observations(file, now) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (error) {
    return { status: error.code === 'ENOENT' ? 'missing' : 'unreadable', path: file, reason: error.code, records: [] };
  }
  if (!text.trim()) return { status: 'empty', path: file, reason: 'no_records', records: [] };
  const records = [];
  const invalid = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    try {
      const value = JSON.parse(line);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_record');
      if (value.tool !== 'Read') return;
      const time = timestamp(value.timestamp);
      if (typeof value.path !== 'string' || !value.path.trim() || time === null || time > now) throw new Error('invalid_read');
      records.push({ path: value.path, time, event_id: value.id ?? value.event_id ?? value.eventId });
    } catch { invalid.push(index + 1); }
  });
  return invalid.length
    ? { status: 'invalid', path: file, reason: 'invalid_records', invalid_lines: invalid, records: [] }
    : { status: 'available', path: file, reason: 'valid_jsonl', records };
}

function samePhysicalFile(left, right) {
  try { return physicalKey(fs.statSync(left, { bigint: true })) === physicalKey(fs.statSync(right, { bigint: true })); } catch { return false; }
}

function rowMatches(row, candidate, home) {
  const resolved = absolutePath(candidate, home);
  const paths = rowPaths(row).map(value => absolutePath(value, home));
  return paths.includes(resolved) || samePhysicalFile(resolved, row.real_path);
}

function usageFor(row, source, now, home) {
  const unknown = reason => ({ ...row, use_7d: null, use_30d: null, last_read_at: null, usage_status: 'unknown', usage_reason: reason });
  if (source.status !== 'available') return unknown(`${source.status}_observations`);
  const matched = source.records.filter(record => rowMatches(row, record.path, home));
  if (!matched.length) return unknown('no_matching_observations');
  const unique = matched.filter((record, index) => {
    const id = record.event_id;
    return !['string', 'number'].includes(typeof id) || matched.findIndex(other => other.event_id === id) === index;
  });
  return { ...row,
    use_7d: unique.filter(record => record.time >= now - 7 * DAY).length,
    use_30d: unique.filter(record => record.time >= now - 30 * DAY).length,
    last_read_at: new Date(Math.max(...unique.map(record => record.time))).toISOString(),
    usage_status: 'observed', usage_reason: 'recorded_reads',
  };
}

function inventory(projectDir, env = process.env, cwd = process.cwd()) {
  const home = os.homedir();
  const roots = rootsFor(projectDir, env, cwd, home);
  const errors = [];
  const entries = roots.flatMap(root => collectEntries(root.path, root.scope, errors));
  const rows = classifyCopies(physicalRows(entries, home));
  const scopes = Object.fromEntries(roots.map(root => [root.scope, {
    found: fs.existsSync(root.path), path: root.path,
    count: new Set(entries.filter(entry => entry.scope === root.scope).map(entry => entry.key)).size,
    entry_count: new Set(entries.filter(entry => entry.scope === root.scope).map(entry => entry.entry)).size,
  }]));
  return { scan_summary: { ...scopes, counts: {
    entry_paths: new Set(entries.map(entry => entry.entry)).size,
    physical_skills: rows.length,
    skill_versions: new Set(rows.map(row => row.deployment_group)).size,
  }, errors, incomplete: errors.length > 0 }, skills: rows };
}

function scan(projectDir, env = process.env, cwd = process.cwd(), now = Date.now()) {
  const home = os.homedir();
  const result = inventory(projectDir, env, cwd);
  const file = absolutePath(env.SKILL_STOCKTAKE_OBSERVATIONS || path.join(home, '.claude/observations.jsonl'), home);
  const source = observations(file, now);
  const { records, ...description } = source;
  return { ...result, observation_source: { ...description, read_records: records.length },
    skills: result.skills.map(row => usageFor(row, source, now, home)) };
}

function rowPaths(row) {
  return [row.path, row.real_path, ...(row.aliases || [])].filter(value => typeof value === 'string');
}

function validateRows(skills) {
  if (!skills || typeof skills !== 'object') throw new Error('Invalid results skills collection');
  const rows = Object.values(skills);
  if (rows.some(row => !row || typeof row.path !== 'string' || !row.path.trim()
    || (row.aliases !== undefined && (!Array.isArray(row.aliases) || row.aliases.some(value => typeof value !== 'string'))))) {
    throw new Error('Cached skill requires a path and valid aliases');
  }
  return rows;
}

function readCache(file) {
  if (!file) throw new Error('RESULTS_JSON argument required');
  let cache;
  try { cache = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new Error('Cannot read valid RESULTS_JSON'); }
  const evaluated = timestamp(cache?.evaluated_at);
  if (evaluated === null) throw new Error('Invalid or missing evaluated_at timestamp');
  const rows = validateRows(cache.skills).filter(row => path.basename(row.path) === 'SKILL.md');
  return { rows, evaluated };
}

function withinRoots(candidate, roots, home) {
  return roots.some(root => {
    const relative = path.relative(root.path, absolutePath(candidate, home));
    return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
  });
}

function quickDiff(file, projectDir, env = process.env, cwd = process.cwd()) {
  const home = os.homedir();
  const cache = readCache(file);
  const current = inventory(projectDir, env, cwd);
  if (current.scan_summary.incomplete) throw new Error('Incomplete scan; resolve scan errors before a full stocktake');
  const roots = rootsFor(projectDir, env, cwd, home);
  const matches = (row, other) => row.id === other.id || rowPaths(other).some(candidate => rowMatches(row, candidate, home));
  if (cache.rows.some(other => rowPaths(other).some(candidate => withinRoots(candidate, roots, home))
    && !current.skills.some(row => matches(row, other)))) {
    throw new Error('Cached skill absent from current scan; run a full stocktake to reconcile results');
  }
  return current.skills.flatMap(row => {
    const known = cache.rows.find(other => other.id === row.id) || cache.rows.find(other => matches(row, other));
    const changedHash = known && typeof known.content_sha256 === 'string' && known.content_sha256 !== row.content_sha256;
    if (known && !changedHash && Date.parse(row.mtime) <= cache.evaluated) return [];
    return [{ ...row, is_new: !known, change_reason: !known ? 'new_physical_skill' : changedHash ? 'content_changed' : 'mtime_changed' }];
  });
}

function resultObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Array.isArray(value.skills)) {
    throw new Error('Results must be an object with a skills object');
  }
  validateRows(value.skills);
  return value;
}

function mergeSkills(existing, incoming, home) {
  const replacements = Object.values(incoming).filter(row => typeof row.id === 'string' && row.id);
  const retained = Object.entries(existing).filter(([, old]) => !replacements.some(row => {
    if (old.id === row.id) return true;
    const routes = rowPaths(row).map(value => absolutePath(value, home));
    return rowPaths(old).some(value => routes.includes(absolutePath(value, home)));
  }));
  return { ...Object.fromEntries(retained), ...incoming };
}

function writeAtomic(file, value, mode) {
  const temporary = `${file}.${crypto.randomBytes(12).toString('hex')}`;
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.fchmodSync(descriptor, mode);
    fs.writeFileSync(descriptor, JSON.stringify(value, null, 2) + '\n');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, file);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    fs.rmSync(temporary, { force: true });
  }
}

function saveResults(file, input, now = Date.now()) {
  if (!file) throw new Error('RESULTS_JSON argument required');
  const incoming = resultObject(JSON.parse(input));
  let existing;
  let mode = 0o600;
  try {
    existing = resultObject(JSON.parse(fs.readFileSync(file, 'utf8')));
    mode = fs.statSync(file).mode & 0o777;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const merged = existing ? {
    ...existing,
    skills: mergeSkills(existing.skills, incoming.skills, os.homedir()),
    ...(Object.hasOwn(incoming, 'mode') ? { mode: incoming.mode } : {}),
    ...(Object.hasOwn(incoming, 'batch_progress') ? { batch_progress: incoming.batch_progress } : {}),
  } : incoming;
  writeAtomic(file, { ...merged, evaluated_at: new Date(now).toISOString() }, mode);
}

function main(args) {
  const [mode, first, second] = args;
  if (mode === 'scan') return scan(first);
  if (mode === 'quick-diff') return quickDiff(first, second);
  if (mode === 'save-results') return saveResults(first, fs.readFileSync(0, 'utf8'));
  throw new Error('Expected scan, quick-diff or save-results');
}

if (require.main === module) {
  try {
    const result = main(process.argv.slice(2));
    if (result !== undefined) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  }
  catch (error) { process.stderr.write(`Error: ${error.message}\n`); process.exitCode = 1; }
}

module.exports = { scan, inventory, quickDiff, saveResults };
