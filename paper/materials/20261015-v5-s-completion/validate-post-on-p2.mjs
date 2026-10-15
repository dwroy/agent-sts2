/** Re-read actual accepted answers with the unchanged deployed pure validator; no model call. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';

const base = dirname(fileURLToPath(import.meta.url));
const root = resolve(base, '../../..');
const helper = resolve(root, '.worktrees/live/agent/src/sim/build-ranking-choice.ts');
const { buildRankingSelection, rankingOverrideProblems } = await import(pathToFileURL(helper));
const input = resolve(base, 'on-RQCHNN0W72KF/p2-consumer-inputs.json');
const rows = JSON.parse(readFileSync(input, 'utf8')).actual_on;
const results = [];
for (const row of rows) {
  const shop = row.label.startsWith('shop/');
  const selection = buildRankingSelection(row.ranking, row.answer, shop);
  const problems = rankingOverrideProblems(row.ranking, row.answer, shop);
  if (!isDeepStrictEqual(selection, row.logged_selection) || problems.length) {
    throw new Error(`actual selection/validation mismatch: ${row.question_id}`);
  }
  const words = typeof selection.ranking_override_reason === 'string'
    ? [...new Intl.Segmenter('zh', { granularity: 'word' }).segment(selection.ranking_override_reason)].filter(x => x.isWordLike).length : null;
  results.push({ question_id: row.question_id, brain_question_id: row.brain_question_id,
    source: row.source, brain_source: row.brain_source, accepted: row.accepted, reasks: row.reasks,
    selection, reason_words: words, problems, chosen: row.chosen, result: row.result });
}
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const output = { at: new Date().toISOString(), run_id: 'RQCHNN0W72KF', accepted: true,
  actual_on: results.length, overrides: results.filter(row => row.selection.deviated === true).length,
  reasks: results.reduce((sum, row) => sum + row.reasks, 0),
  deployed_helper: { path: helper, sha256: digest(helper) }, source: { path: input, sha256: digest(input) },
  method: 'Unchanged deployed pure selection/word-limit validator against all actual accepted native answers. Shop consumption certifies the first purchase/removal only.',
  no_api_simulation_or_new_test: true, results };
writeFileSync(resolve(base, 'on-RQCHNN0W72KF/p2-complete-consumer-validated.json'), JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ accepted: true, actual_on: output.actual_on, overrides: output.overrides, reasks: output.reasks,
  override_words: results.filter(row => row.selection.deviated === true).map(row => row.reason_words) }));
