'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const skillRoot = path.join(repoRoot, 'skills', 'grill-with-docs');
const skillPath = path.join(skillRoot, 'SKILL.md');
const documentContractsPath = path.join(skillRoot, 'references', 'document-contracts.md');
const templatesPath = path.join(skillRoot, 'references', 'document-templates.md');
const openAiPath = path.join(skillRoot, 'agents', 'openai.yaml');
const codexSkillRoot = path.join(repoRoot, '.agents', 'skills', 'grill-with-docs');
const codexAgentsDocPath = path.join(repoRoot, '.codex', 'AGENTS.md');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    failed += 1;
  }
}

function readRequired(filePath) {
  assert.ok(fs.existsSync(filePath), `Expected file to exist: ${filePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

function extractFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, 'Expected YAML frontmatter');
  return match[1];
}

const skill = readRequired(skillPath);

test('uses only name and description in SKILL.md frontmatter', () => {
  const keys = extractFrontmatter(skill)
    .split('\n')
    .filter(line => /^[a-z][a-z0-9-]*:/.test(line))
    .map(line => line.slice(0, line.indexOf(':')));

  assert.deepStrictEqual(keys, ['name', 'description']);
});

test('declares document-producing trigger contexts', () => {
  const frontmatter = extractFrontmatter(skill);
  assert.match(frontmatter, /stress-test/i);
  assert.match(frontmatter, /document/i);
  assert.match(frontmatter, /specification|PRD/i);
});

test('separates discoverable facts from user-owned decisions', () => {
  assert.match(skill, /facts?.*agent|agent.*facts?/is);
  assert.match(skill, /decisions?.*user|user.*decisions?/is);
});

test('requires shared-understanding confirmation before final documents', () => {
  assert.match(skill, /shared understanding/i);
  assert.match(skill, /confirm/i);
  assert.match(skill, /before.*final.*document/is);
});

test('preserves every resolved decision in a traceability ledger', () => {
  assert.match(skill, /decision ledger/i);
  assert.match(skill, /D-\d{3}|D-NNN/i);
  assert.match(skill, /traceab/i);
});

test('keeps CONTEXT.md glossary-only and gates ADR creation', () => {
  assert.match(skill, /CONTEXT\.md/);
  assert.match(skill, /glossary/i);
  assert.match(skill, /hard to reverse/i);
  assert.match(skill, /surprising without context/i);
  assert.match(skill, /real trade-off/i);
});

test('defines document profiles and loads the document references', () => {
  assert.match(skill, /clarify-only/i);
  assert.match(skill, /specification/i);
  assert.match(skill, /\bprd\b/i);
  assert.match(skill, /implementation-plan/i);
  assert.match(skill, /full-handoff/i);
  assert.match(skill, /references\/document-contracts\.md/);
  assert.match(skill, /references\/document-templates\.md/);
});

test('protects Context Keeper generated files', () => {
  assert.match(skill, /context\.json/i);
  assert.match(skill, /Context Keeper|\bck\b/i);
  assert.match(skill, /do not.*edit.*CONTEXT\.md/is);
  assert.match(skill, /\/ck:save/i);
  for (const field of ['summary', 'leftOff', 'nextSteps', 'decisions', 'blockers']) {
    assert.match(skill, new RegExp(`\\b${field}\\b`));
  }
});

test('requires explicit authorization before initializing CONTEXT.md', () => {
  assert.match(skill, /explicit (?:user )?(?:approval|authorization)[\s\S]{0,80}before[\s\S]{0,80}creat[\s\S]{0,40}CONTEXT\.md/i);
});

test('document contracts define safe path and overwrite behavior', () => {
  const contracts = readRequired(documentContractsPath);
  assert.match(contracts, /existing project convention/i);
  assert.match(contracts, /do not overwrite/i);
  assert.match(contracts, /acceptance criteria/i);
  assert.match(contracts, /decision ledger/i);
});

test('templates cover all supported durable outputs', () => {
  const templates = readRequired(templatesPath);
  for (const heading of [
    'Context Glossary',
    'Architecture Decision Record',
    'Feature Specification',
    'Product Requirements Document',
    'Implementation Plan',
  ]) {
    assert.match(templates, new RegExp(`## ${heading}`));
  }
});

test('Codex UI metadata invokes the exact skill name', () => {
  const openAi = readRequired(openAiPath);
  assert.match(openAi, /display_name: "Grill with Docs"/);
  assert.match(openAi, /\$grill-with-docs/);
});

test('Codex discovery mirror matches the canonical skill', () => {
  const codexSkill = readRequired(path.join(codexSkillRoot, 'SKILL.md'));
  const codexOpenAi = readRequired(path.join(codexSkillRoot, 'agents', 'openai.yaml'));
  const canonicalOpenAi = readRequired(openAiPath);
  const codexAgentsDoc = readRequired(codexAgentsDocPath);

  assert.strictEqual(codexSkill, skill);
  assert.strictEqual(codexOpenAi, canonicalOpenAi);
  assert.match(codexAgentsDoc, /grill-with-docs.*traceable project documents/i);
});

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
