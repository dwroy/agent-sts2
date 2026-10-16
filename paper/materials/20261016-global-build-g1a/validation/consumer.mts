/** Exercise the production experience loader and renderers; no game or model invocation. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [rootArg, inputArg, outputArg] = process.argv.slice(2);
const root = resolve(rootArg!);
const input = JSON.parse(readFileSync(inputArg!, 'utf8'));
const moduleAt = (path: string) => import(pathToFileURL(resolve(root, 'agent/src', path)).href);
const { setKnowledgeCharacter } = await moduleAt('knowledge/files.ts');
setKnowledgeCharacter('silent');
const { loadExperience } = await moduleAt('knowledge/experience.ts');
const { queryExperience, renderExperience } = await moduleAt('knowledge/render/experience-text.ts');
const knowledgeDir = resolve(root, 'knowledge');
const entries = loadExperience(knowledgeDir);
const raw = JSON.parse(readFileSync(resolve(knowledgeDir, 'characters/silent/experience.json'), 'utf8'));
assert.equal(raw.version, input.experience_version);
const ctx = { ascension: 10, act: 3, knowledgeDir, logsDir: resolve(root, 'logs') };
const rendered = renderExperience(ctx);
const selected = queryExperience(ctx, { ids: input.entries.map((entry: any) => entry.id) });
const checks = [];
for (const expected of input.entries) {
  const actual = entries.find((entry: any) => entry.id === expected.id);
  assert.deepEqual(actual, expected);
  assert.ok(rendered.includes(expected.id));
  assert.ok(selected.includes(expected.id));
  assert.ok(selected.includes(expected.lesson));
  checks.push({ id: expected.id, loaded: true, rendered: true, queried: true });
}
assert.ok(selected.includes('70输入'));
assert.ok(selected.includes('未知'));
for (const ascension of [0, 9]) {
  const text = renderExperience({ ...ctx, ascension });
  for (const entry of input.entries) assert.ok(!text.includes(entry.id));
}
setKnowledgeCharacter('ironclad');
const foreign = loadExperience(knowledgeDir);
for (const expected of input.entries) assert.ok(!foreign.some((entry: any) => entry.id === expected.id));
writeFileSync(outputArg!, JSON.stringify({ root, experience_version: raw.version, checks,
  ascension_exclusion: [0, 9], character_exclusion: 'ironclad',
  rendered_sha256: createHash('sha256').update(rendered).digest('hex'),
  rendered_text: rendered, queried_text: selected,
  scope: 'Actual production loaders/renderers; fixed readback only, no natural use or effect claim.' }, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, entries: checks.length, character_isolation: true, ascension_isolation: true }));
