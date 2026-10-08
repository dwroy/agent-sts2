import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { KnowledgePrompt } from '../../../agent/src/brain/knowledge.js';
import { renderKnowledgeSections } from '../../../agent/src/knowledge/render/knowledge-prefix.js';
import { loadPostmortems } from '../../../agent/src/knowledge/render/data.js';
import { frozenFacts } from '../../../agent/src/knowledge/render/facts.js';
import { pickSpec } from '../../../agent/src/brain/specs.js';
import { codexKindSchema, codexSchema } from '../../../agent/src/brain/engines/codex.js';
import { promptWithReask } from '../../../agent/src/brain/message.js';
import { segmentDigest } from '../../../agent/src/brain/engines/codex-cache.js';
const root = resolve('.');
const here = join(root, 'learner/runs/20261008-140043-codex-brain-cache');
const row = JSON.parse(readFileSync(join(here, 'frozen-question.json'), 'utf8'));
const run = JSON.parse(readFileSync(join(here, 'frozen-run-config.json'), 'utf8'));
const factsDir = join(here, 'facts');
mkdirSync(factsDir, { recursive: true });
copyFileSync('/home/dw/Projects/agent-sts2/logs/guide-facts/2026-10-08-prefix-facts.json', join(factsDir, '2026-10-08-prefix-facts.json'));
const facts = frozenFacts(factsDir, () => new Date('2026-10-08T06:00:00Z'));
const ctx = { ascension: 10, knowledgeDir: join(root, 'knowledge'), facts };
const postmortems = loadPostmortems();
const sources: Record<string, string> = {};
for (const dir of [join(root, 'knowledge/common'), join(root, 'knowledge/characters/silent')]) {
  for (const file of readdirSync(dir).sort()) {
    if (!/\.(json|md)$/.test(file)) continue;
    const path = join(dir, file);
    sources[path] = createHash('sha256').update(readFileSync(path)).digest('hex');
  }
}
const { system, note } = new KnowledgePrompt({ facts, postmortems: () => postmortems }).system(ctx);
const spec = pickSpec(row.label, row.options, row.payload);
const request = { label: row.label, question: row.question, memory: row.memory, payload: row.payload, options: row.options,
  system, spec, runId: row.run_id, questionId: row.question_id };
const settings = run.brain.codex;
const schema = codexSchema(codexKindSchema(spec, { fields: settings.schema_fields, reasonLast: false }), {
  routeReason: settings.route_reason, maxFieldChars: settings.max_field_chars, routePattern: settings.route_pattern,
});
const fixture = { character: 'silent', request: { ...request, spec: undefined }, schema,
  settings: { model: row.model, effort: row.effort, ...settings }, source: { question: segmentDigest(readFileSync(join(here, 'frozen-question.json'), 'utf8')),
    historical_system_sha: row.system_sha, historical_prefix: row.knowledge, frozen_prefix: note,
    reconstruction_limit: 'Historical full system bytes were not logged; this is the complete frozen current Silent prefix, not a claimed historical exact replay.', sources },
  segments: { system: segmentDigest(system), user: segmentDigest(promptWithReask(request)), schema: segmentDigest(JSON.stringify(schema)),
    knowledge: renderKnowledgeSections(ctx, postmortems).map(s => ({ key: s.key, ...segmentDigest(s.text) })) },
};
const text = JSON.stringify(fixture, null, 2);
writeFileSync(join(here, 'probe-fixture.json'), text);
console.log(JSON.stringify({ sha256: createHash('sha256').update(text).digest('hex'), segments: fixture.segments, source_limit: fixture.source.reconstruction_limit }));
