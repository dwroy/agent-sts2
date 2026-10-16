// Fixed knowledge consumer only: no simulation, model request or game API.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const input = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const source = (path) => import(pathToFileURL(join(input.source_root, path)).href);
const { setKnowledgeCharacter } = await source('agent/src/knowledge/files.ts');
const { loadExperience } = await source('agent/src/knowledge/experience.ts');
const { appliesAt, queryExperience } = await source('agent/src/knowledge/render/experience-text.ts');
const ctx = { ascension: input.ascension, knowledgeDir: input.knowledge_dir };
setKnowledgeCharacter(input.character);
const entry = loadExperience(input.knowledge_dir).find((item) => item.id === input.entry_id);
assert(entry, 'the actual deployed loader must find the requested entry');
assert(appliesAt(entry, 10));
assert(!appliesAt(entry, 9));
const rendered = queryExperience(ctx, { ids: [input.entry_id] }, { path: 'fixed-no-case-body', sections: new Map() });
assert(rendered.includes(entry.lesson), 'the real query renderer must include the complete bounded lesson');
assert(rendered.includes('RQCHNN0W72KF'));
assert(rendered.includes('TCDUBRWMEMNA'));
setKnowledgeCharacter('ironclad');
assert(!loadExperience(input.knowledge_dir).some((item) => item.id === input.entry_id), 'the Silent entry must not enter the Ironclad loader');
setKnowledgeCharacter(input.character);
const file = JSON.parse(readFileSync(join(input.knowledge_dir, 'characters', input.character, 'experience.json'), 'utf8'));
writeFileSync(input.render_output, rendered + '\n');
writeFileSync(input.output, JSON.stringify({ request_id: input.request_id, revision: input.revision, character: input.character,
  experience_version: file.version, entry, source_root: input.source_root, knowledge_dir: input.knowledge_dir,
  renderer: 'queryExperience', loaded: true, rendered_complete_lesson: true, applicable_A10: true, excluded_A9: true,
  excluded_Ironclad: true, kind: 'fixed-consumer', natural_adoption: 'unknown', root_repair: 'not established' }, null, 2) + '\n');
