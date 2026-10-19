import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = resolve(process.argv[2]);
const output = resolve(process.argv[3]);
if (existsSync(output)) throw new Error('measurement output already exists; preserve prior evidence');
const mixed = process.argv[4] === 'mixed';
const load = p => import(pathToFileURL(join(root, p)).href);
process.env.CHARACTER = 'silent';
process.env.V6_BUILD = 'on';
process.env.V6_SHOP_DECIDER = 'jev';
process.env.V6_REST_DECIDER = 'jev';
globalThis.fetch = async () => { throw new Error('read-only audit: network forbidden'); };
const source = ['agent/src/hand/screens/v6-room.ts', 'agent/src/v6/prompt-summary.ts', 'agent/src/v6/log.ts'];
const sha = p => createHash('sha256').update(readFileSync(join(root, p))).digest('hex');
const sources = Object.fromEntries(source.map(p => [p, sha(p)]));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const { loggedEnv } = await load('agent/tests/logged.ts');
const { v6ShopOptions, v6RestOptions } = await load('agent/src/hand/screens/v6-room-options.ts');
const { buildV6RoomDecision } = await load('agent/src/hand/screens/v6-room.ts');
const { V6_JEV_STATE_BYTES, V6_JEV_REQUEST_BYTES } = await load('agent/src/v6/prompt-summary.ts');
const { comboProjection } = mixed ? await load('agent/tests/v6-direction-core-fixtures.ts') : {};
const bytes = x => Buffer.byteLength(JSON.stringify(x), 'utf8');
const results = [];
for (const [kind, file, key] of [['shop', 'u6ru-f22-shop', 'open'], ['rest', 'w2tb-f7-rest', 'rest']]) {
  const relative = `agent/tests/logged-states/oneshot/${file}.json`;
  const raw = JSON.parse(readFileSync(join(root, relative), 'utf8')).states[key];
  const originalCharacter = raw.run.character_id;
  const originalAscension = raw.run.ascension;
  Object.assign(raw.run, { character_id: 'SILENT', ascension: 10 });
  const env = loggedEnv({ source: relative, decision: { label: 'audit', decider: 'none', chosen: null, rationale: '' }, state: raw });
  const input = (kind === 'shop' ? v6ShopOptions : v6RestOptions)(env);
  if (!input) throw new Error(`no ${kind} options`);
  let decision = buildV6RoomDecision(env, input, undefined, 'projection_provider_unavailable', join(root, 'knowledge'));
  if (mixed) {
    // Deliberately synthetic known deltas plus one incomplete target mixture; no game estimates.
    const targets = [
      { id: 'f48:AEONGLASS', boss: 'AEONGLASS', act: 3, floor: 48, kind: 'current', probability: 1, labels: [] },
      { id: 'chain:unknown', boss: 'AEONGLASS', act: 3, floor: 49, kind: 'chain', probability: 1, labels: [] }];
    const table = { schema: 'v6-projection-table-v1', enabled: true, phase: 'pick', entries: [], combinations: [],
      act_evaluations: [], weighted: [], rankings: {}, pick_direction_comparisons: [], target_mixtures: [], targets,
      telemetry: { elapsed_ms: 1, cache_hits: 0, cache_misses: 0, simulations: 0, timed_out: 0,
        degradation: ['synthetic_comparison_contract'], unknown_entries: 0, total_entries: 0, unknown_fraction: 0, act_cache_hit: false } };
    const combos = [...new Map(decision.roomEntries.map(row => [`${row.direction_id}:${row.combo_id}`, row])).values()];
    for (const [i, option] of input.options.entries()) {
      for (const kind of ['clearance', 'current_gate']) table.target_mixtures.push({ option_id: option.option.key, kind,
        value: null, paired_delta: i === input.options.length - 1 ? null : { mean: kind === 'clearance' ? .02 : -.01, se: .001, n: 20 },
        known_mass: i === input.options.length - 1 ? .25 : 1, known_value: 0,
        labels: i === input.options.length - 1 ? ['fixture_incomplete_target_mass'] : [] });
      for (const combo of combos) for (const target of targets) {
        const row = { ...comboProjection(), option_id: option.option.key, direction_id: combo.direction_id,
          combo_id: combo.combo_id, combo_metrics: combo.combo_metrics, target_id: target.id };
        table.combinations.push({ entry: row, combination_id: row.combo_id, completion_source: 'build_core', general_source: 'empirical',
          scope: 'combination_expectation', completed_win: row.win_complete, general_win: row.win_incomplete,
          completed_joint_win: row.win_complete, general_joint_win: row.win_incomplete, formation_n: 200, formation_se: .01,
          summary: row.combo_metrics, role: 'unknown', role_labels: [], model_labels: [], completion_sample_ids: [],
          unknown_reasons: ['fixture_opening_limitation'], continuous: null });
      }
    }
    decision = buildV6RoomDecision(env, input, table, 'ready_synthetic_comparison', join(root, 'knowledge'));
  }
  const state = decision.state;
  const options = input.options.map(o => o.option.key);
  const stateOptions = Object.keys(state.options);
  const criteria = Object.keys(decision.questions.pick.criteria);
  const envelopeBytes = bytes({ model: 'typesafe/jev-1.14', state, questions: decision.questions });
  const legalKeysPreserved = JSON.stringify(options) === JSON.stringify(stateOptions) && JSON.stringify(options) === JSON.stringify(criteria);
  const withinLimits = bytes(state) <= V6_JEV_STATE_BYTES && envelopeBytes <= V6_JEV_REQUEST_BYTES;
  if (!legalKeysPreserved || !withinLimits) throw new Error(`failed ${kind} cap/option contract`);
  const detailChecks = input.options.map((option, i) => {
    const view = state.options[option.option.key];
    const leading = view?.projections?.[0];
    const comparison = view?.comparison;
    const sameIdentity = ['id', 'card', 'price', 'slot'].every(field => option.option.summary?.[field] === undefined
      || JSON.stringify(view?.facts?.[field]) === JSON.stringify(option.option.summary[field]));
    const unknown = !mixed || i === input.options.length - 1;
    const comparisonPreserved = ['weighted_chain', 'current_boss'].every(kind => {
      const value = comparison?.[kind];
      return value?.known_mass === (mixed ? unknown ? .25 : 1 : null) && (unknown
        ? value?.delta === null && value.tier === 'unknown'
        : value?.delta?.mean === (kind === 'weighted_chain' ? .02 : -.01)
          && value.delta.se === .001 && value.delta.n === 20 && value.tier === (kind === 'weighted_chain' ? 'better' : 'worse'));
    });
    const reason = mixed ? 'fixture_opening_limitation' : option.unknown_reason ?? 'projection_provider_unavailable';
    const reasons = view?.unknown_reasons ?? leading?.unknown_reasons ?? [];
    return { key: option.option.key, facts_preserved: !!view?.facts && sameIdentity,
      combination_identity: typeof leading?.direction_id === 'string' && typeof leading?.combo_id === 'string'
        && typeof leading?.target_id === 'string', comparison_preserved: comparisonPreserved,
      availability_preserved: leading?.availability?.take === (mixed ? .6 : null) && leading?.availability?.skip === (mixed ? .5 : null),
      openings_preserved: leading?.opening?.Wk === (mixed ? 'evaluated' : 'opening unknown') && leading?.opening?.W0 === (mixed ? 'evaluated' : 'opening unknown'),
      reason_preserved: reasons.includes(reason) };
  });
  const allDetails = detailChecks.every(({key, ...checks}) => Object.values(checks).every(Boolean));
  if ((kind === 'shop' && options.length !== 28) || !allDetails) throw new Error(`failed ${kind} per-option detail contract: ${JSON.stringify(detailChecks)}`);
  results.push({ kind, comparison_fixture: mixed ? 'synthetic_known_and_incomplete_target_mixture' : 'no_projection_table', fixture: relative, fixture_sha256: sha(relative), original_character: originalCharacter,
    original_ascension: originalAscension, fixture_override: { character_id: 'SILENT', ascension: 10 },
    options: options.length, legal_keys_preserved: legalKeysPreserved, projection_entries: decision.roomEntries.length,
    every_option_has_details: allDetails, option_detail_checks: detailChecks,
    null_option_keys: options.filter(key => state.options[key] === null),
    retained_projection_options: options.filter(key => Array.isArray(state.options[key]?.projections) && state.options[key].projections.length > 0),
    all_projection_wins_unknown: decision.roomEntries.every(e => e.win === null),
    full_metric_combos_in_audit: new Set(decision.roomEntries.filter(e => e.combo_metrics !== null).map(e => `${e.direction_id}:${e.combo_id}`)).size,
    projection_status: decision.roomProjectionReason, state_bytes: bytes(state), questions_bytes: bytes(decision.questions),
    jev_call_argument_bytes: envelopeBytes, state_limit_bytes: V6_JEV_STATE_BYTES, request_limit_bytes: V6_JEV_REQUEST_BYTES,
    within_limits: withinLimits, prompt_budget: state.prompt_budget,
    field_bytes: Object.fromEntries(Object.entries(state).map(([k, v]) => [k, bytes(v)])) });
}
const report = { measured_at: new Date().toISOString(), code_head: head,
  code_head_after: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  source_sha256: sources, source_unchanged: source.every(p => sha(p) === sources[p]),
  knowledge: { path: 'knowledge/characters/silent/build-cores.json', sha256: sha('knowledge/characters/silent/build-cores.json'),
    file_bytes: readFileSync(join(root, 'knowledge/characters/silent/build-cores.json')).length },
  method: `Actual buildV6RoomDecision on archived W7 inventory fixtures, character/ascension overridden only to load current formal Silent A10 cores; ${mixed ? 'synthetic comparison table only, not estimated game outcomes' : 'no projection table'}, no model request, no action. UTF-8 compact JSON sizes; not live Silent room request measurements. Process-local environment overrides only; production toggles untouched.`, results };
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
