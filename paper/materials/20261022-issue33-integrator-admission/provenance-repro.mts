import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.env['STS2_REVIEW_ROOT'] ?? process.cwd());
const { buildKnowledgeTools } = await import(pathToFileURL(join(root, '.worktrees/integrator-33-fix-20261022/agent/src/brain/tools/agent-knowledge.ts')).href);
const { ToolHost } = await import(pathToFileURL(join(root, '.worktrees/integrator-33-fix-20261022/agent/src/brain/tools/mcp-server.ts')).href);
const { setKnowledgeCharacter, knowledgeFile } = await import(pathToFileURL(join(root, '.worktrees/integrator-33-fix-20261022/agent/src/knowledge/files.ts')).href);

const out = join(root, process.env['STS2_REVIEW_OUTPUT'] ?? '.artifacts/integrator-33-fix-20261022/provenance-public');
const source = join(root, '.worktrees/integrator-33-fix-20261022/knowledge');
const names = ['monster-db.json', 'monster-records.json', 'experience.json', 'shared-experience.json', 'room-costs.json', 'outcome-stats.json', 'jev-hints.json', 'ironclad-guide.md', 'ds-handbook.md', 'boss-damage.json'];
setKnowledgeCharacter('ironclad');
const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const fixtures = ['before', 'after'].map(n => join(out, n));
for (const dir of fixtures) for (const name of names) {
  const target = knowledgeFile(dir, name);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(knowledgeFile(source, name), target);
}
const hintsPath = knowledgeFile(fixtures[1], 'jev-hints.json');
const hints = JSON.parse(readFileSync(hintsPath, 'utf8'));
const hintId = hints.hints[0].id;
hints.hints[0].text += ' FIXED_REVIEW_SENTINEL';
writeFileSync(hintsPath, JSON.stringify(hints));
const recordsPath = knowledgeFile(fixtures[1], 'monster-records.json');
const records = JSON.parse(readFileSync(recordsPath, 'utf8'));
const encounter = Object.values(records.encounters).find((e: any) => e.acts?.['1'] && e.rooms?.elite) as any;
Object.values(encounter.by_asc).forEach((r: any) => { r.fights += 1000001; });
writeFileSync(recordsPath, JSON.stringify(records));
const queries = [
  { name: 'kb_old_knowledge', input: { source: 'jev_hints', keyword: hintId }, missing: ['jev-hints.json'] },
  { name: 'kb_stats', input: { table: 'fights', act: 1 }, missing: ['monster-db.json', 'monster-records.json'] },
];
const results = [];
for (const q of queries) {
  const pair = [];
  for (const knowledgeDir of fixtures) {
    const ctx = { ascension: 8, knowledgeDir, logsDir: '/unused' };
    const host = new ToolHost(buildKnowledgeTools(ctx), ctx, undefined, true);
    const result = await host.call(q.name, q.input);
    assert.equal(result.isError, undefined);
    pair.push({ result, audit: host.calls[0] });
  }
  const envelopes = pair.map(p => JSON.parse(p.result.text));
  assert.notEqual(envelopes[0].entries, envelopes[1].entries);
  assert.notDeepEqual(envelopes[0].sources, envelopes[1].sources);
  assert.notDeepEqual(pair[0].audit.sources, pair[1].audit.sources);
  pair.forEach((p, i) => { assert.deepEqual(p.audit.sources, envelopes[i].sources); assert.equal(p.audit.output, p.result.text); assert.equal(p.audit.outputBytes, Buffer.byteLength(p.result.text)); });
  assert(q.missing.every(n => envelopes[0].sources.some((s: any) => s.file === n)));
  envelopes.forEach((e, i) => e.sources.forEach((s: any) => assert.equal(s.sha256, sha(knowledgeFile(fixtures[i], s.file)))));
  const changed = q.name === 'kb_stats' ? 'monster-records.json' : 'jev-hints.json';
  assert.notEqual(envelopes[0].sources.find((s: any) => s.file === changed).sha256, envelopes[1].sources.find((s: any) => s.file === changed).sha256);
  const summary = { tool: q.name, input: q.input, outputChanged: true, provenanceChanged: true,
    auditedFiles: envelopes[0].sources.map((s: any) => s.file), requiredFilesPresent: q.missing,
    actualFileHashes: q.missing.map(name => ({ name, before: sha(knowledgeFile(fixtures[0], name)), after: sha(knowledgeFile(fixtures[1], name)) })) };
  writeFileSync(join(out, q.name + '.json'), JSON.stringify({ summary, pair }, null, 2) + '\n');
  results.push(summary);
}
writeFileSync(join(out, 'summary.json'), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results));
