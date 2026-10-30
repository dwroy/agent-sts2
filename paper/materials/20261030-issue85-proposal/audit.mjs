/** Read-only proposal measurements; this is not the grading implementation. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';

const root = resolve(process.argv[2] ?? '../..');
const output = resolve(process.argv[3] ?? 'paper/materials/20261030-issue85-proposal/measurements.json');
const audit = 'paper/materials/20261030-issue81-injection-audit-ops';
const sources = [];
function read(path, expected) {
  const raw = readFileSync(resolve(root, path));
  const sha256 = createHash('sha256').update(raw).digest('hex');
  if (expected && sha256 !== expected) throw Error(`frozen input changed: ${path}`);
  sources.push({ path, bytes: raw.length, sha256 });
  return JSON.parse(raw);
}
const count = values => Object.fromEntries([...new Set(values)].sort().map(v => [v, values.filter(x => x === v).length]));
const bound = read(`${audit}/bound-strategy-document.json`, '780224842c5325657ea95bd98062d1fded979b5b6c3378ea501cebecc7fba0f8');
const ordinary = read('.worktrees/live/knowledge/characters/silent/strategy-entries.json', '7cadbbefbdebc6f619475513dc70cb84b38e5d9f4ca5a331df2dca0755ae9719');
const window = read(`${audit}/window.json`);
const observations = bound.entries.filter(e => e.review_observation);
const scoped116 = bound.entries.filter(e => ordinary.entries.some(o => o.id === e.id));
const ownCounts = scoped116.map(e => ({ id: e.id,
  support_refs: new Set(e.evidence.filter(x => x.type !== 'external_aggregate' && x.role !== 'contradict').map(x => x.run)).size,
  contradict_refs: new Set(e.evidence.filter(x => x.type !== 'external_aggregate' && x.role === 'contradict').map(x => x.run)).size,
  evidence_status: e.evidence_status ?? null,
  publication: e.formal_publication ?? null,
}));
const cards = observations.filter(e => e.review_observation.dimension === 'cards').map(e => {
  const { picked: p, declined: d } = e.review_observation.denominators;
  return { id: e.id, min_original_choice_arm: Math.min(p.offers, d.offers),
    winner_pick: { picked: p.wins, offered: p.wins + d.wins },
    loser_pick: { picked: p.offers - p.wins, offered: p.offers + d.offers - p.wins - d.wins },
    note: 'Algebraic restatement of the original same-cell first-offer table; no new samples.' };
});
const routes = read('.worktrees/issue80-study-routes-20261026/review-output/tables.json');
function pair(rows, fields) {
  const groups = new Map();
  for (const row of rows) {
    const key = JSON.stringify(fields.map(k => row[k]));
    if (!groups.has(key)) groups.set(key, { scope: Object.fromEntries(fields.map(k => [k, row[k]])) });
    groups.get(key)[row.side] = row.local_pass;
  }
  return [...groups.values()].filter(g => g.at_or_above && g.below).map(g => ({ ...g,
    difference: g.at_or_above.rate === null || g.below.rate === null ? null : g.at_or_above.rate - g.below.rate }));
}
const hp = {
  external: pair(routes.external_boss_thresholds.filter(x => x.position === 1 && (x.act === 2 && x.threshold === .7 || x.act === 3 && x.threshold === .9)), ['version', 'act', 'position', 'threshold']),
  own: pair(routes.own_boss_thresholds_by_sl.filter(x => x.subset === 'quality_subset' && (x.floor === 33 && x.threshold === .7 || x.floor === 48 && x.threshold === .9)), ['subset', 'sl_stratum', 'floor', 'retry_on_floor', 'threshold']),
};
const full = ['issue80-relics-event-cheese', 'issue80-relics-event-courier'].map(id => {
  const entry = bound.entries.find(e => e.id === id), raw = JSON.stringify(entry);
  const response = { knowledge_version: 'K1-0725587f50e671013f48f93e6c3e6b7f27d3d05638c40f33b460c9aeda7c7c46',
    path: 'characters/silent/strategy-entries.json', sha256: sources[0].sha256,
    representation: 'full_document_fragment', document_id: id,
    document_sha256: createHash('sha256').update(raw).digest('hex'), encoding: 'concatenated-json',
    json_fragment: raw, document_offset: 0, total_document_parts: 1, next_document_offset: null, truncated: false };
  const encoded = Buffer.byteLength(JSON.stringify(response));
  return { id, original_bytes: Buffer.byteLength(raw), full_response_bytes: encoded, fits_24000: encoded <= 24000 };
});
const result = { schema: 'issue85-proposal-measurements-v1', base: '9b0cf5955d7485c93ed1baf7d94bf1d2e08e1f06',
  scope: { bound: bound.entries.length, observations: observations.length, current_ordinary: ordinary.entries.length,
    ordinary_in_bound: ordinary.entries.filter(e => bound.entries.some(b => b.id === e.id)).length,
    bound116_publication: count(ownCounts.map(x => x.publication ?? 'absent')),
    checkout116_publication: count(ordinary.entries.map(e => e.formal_publication ?? 'absent')),
    other_bound_ordinary: bound.entries.filter(e => !e.review_observation && !ordinary.entries.some(o => o.id === e.id)).length },
  observation_dimensions: count(observations.map(e => e.review_observation.dimension)),
  own_reference_histogram: count(ownCounts.map(e => e.support_refs)), own_reference_rows: ownCounts,
  reference_caution: 'Reference run counts are examples, not complete comparison-arm denominators or policy-effect validation.',
  cards, hp, full, window, sources,
  estimate: { status: 'proposal-only; not final content grading or publication',
    observations: { A: 2, B: 34, provisional_A: ['issue80-routes-f33-hp-review-70', 'issue80-routes-f48-hp-review-90'] },
    current116: { immediately_provable_A: 0, conservative_B: 116,
      caveat: 'Complete source-table mapping can change this estimate. No reference-count or two-large-unrelated-statistics shortcut.' },
    remaining21: 'No automatic body eligibility; audit in the same K1 inventory before publication.' },
};
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({ output: relative(process.cwd(), output), scope: result.scope, cards, full, estimate: result.estimate }, null, 2) + '\n');
