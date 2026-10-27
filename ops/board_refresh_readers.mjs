/** Read newly frozen data through the isolated LIVE's existing reader APIs. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const [rawView, manifest] = process.argv.slice(2);
const view = realpathSync(rawView), knowledge = join(view, 'knowledge');
const rows = JSON.parse(readFileSync(manifest, 'utf8'));
assert(Array.isArray(rows) && rows.length > 0);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const imported = async name => import(pathToFileURL(join(view, 'agent/src', name)).href);
const jsonRows = rows.filter(row => row.path.endsWith('.json'));
const consumed = [];
let catalog, files;
if (jsonRows.length) {
  catalog = await imported('knowledge/catalog.ts');
  files = await imported('knowledge/files.ts');
}
const characters = new Set();
for (const row of rows) {
  const path = realpathSync(join(view, row.path));
  assert(path.startsWith(view + sep) && resolve(view, row.path) === path);
  const bytes = readFileSync(path);
  assert.equal(sha(bytes), row.after.sha256);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (!row.path.endsWith('.json')) {
    assert(row.path.startsWith('notes/') && row.path.endsWith('.md'));
    consumed.push({ path: row.path, sha256: sha(bytes), reader: 'utf8-report' });
    continue;
  }
  const value = JSON.parse(text);
  assert(value !== null && typeof value === 'object' && !Array.isArray(value));
  const name = relative(knowledge, path).split(sep).join('/');
  if (name === 'catalog.json') {
    const parsed = catalog.readKnowledgeCatalog(knowledge);
    assert.deepEqual(parsed, value);
    for (const [fragment, descriptor] of Object.entries(parsed.generated_files)) {
      const target = realpathSync(join(knowledge, fragment));
      assert(target.startsWith(knowledge + sep));
      assert.equal(sha(readFileSync(target)), descriptor.sha256);
      JSON.parse(readFileSync(target, 'utf8'));
    }
    consumed.push({ path: row.path, sha256: sha(bytes), reader: 'readKnowledgeCatalog' });
  } else {
    const character = name.startsWith('characters/') ? name.split('/')[1] : 'silent';
    const result = catalog.queryKnowledgeCatalog(knowledge, { character, sourceCharacter: character, file: name });
    assert.equal(result.read_only, true);
    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].source.sha256, sha(bytes));
    consumed.push({ path: row.path, sha256: sha(bytes), reader: 'queryKnowledgeCatalog' });
    if (name.startsWith('characters/')) characters.add(character);
  }
}
if (jsonRows.some(row => row.path.startsWith('knowledge/common/'))) characters.add('silent');
for (const character of characters) {
  files.setKnowledgeCharacter(character);
  const { loadKnowledgeData } = await imported('knowledge/render/data.ts');
  loadKnowledgeData(knowledge);
  const { readMonsterDbJson } = await imported('knowledge/monster-db.ts');
  readMonsterDbJson(knowledge);
  const prefix = `knowledge/characters/${character}/`;
  if (rows.some(row => row.path === prefix + 'construction-opportunities.json')
      && existsSync(join(knowledge, 'characters', character, 'construction-templates.json'))) {
    const { loadConstructionData } = await imported('construction/data.ts');
    assert(loadConstructionData(character, knowledge), 'construction reader rejected refreshed data');
  }
  if (rows.some(row => row.path === prefix + 'v6-history.json')) {
    const { loadV6HistoryPack } = await imported('sim/v6-history-pack.ts');
    const result = loadV6HistoryPack(knowledge, character, { mode: 'shadow' });
    assert.equal(result.status, 'loaded', result.reason);
  }
}
files?.setKnowledgeCharacter(null);
console.log(JSON.stringify({ scope: 'isolated LIVE refreshed data readers', consumed, characters: [...characters] }));
