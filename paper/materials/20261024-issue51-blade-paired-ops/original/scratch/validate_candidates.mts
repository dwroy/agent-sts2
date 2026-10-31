// Offline format and observed-state checks only; never invent Plan facts.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStrategyLibrary } from '../../../../../../agent/src/knowledge/strategy-entries.ts';
import { validateV6Draft } from '../../../../../../agent/src/v6/draft.ts';
import { evaluatePredicate } from '../../../../../../agent/src/v6/predicate.ts';
import { parseGameState } from '../../../../../../agent/src/hand/mod/schema.ts';
import { combatPredicateFacts } from '../../../../../../agent/src/reflex/jev/predicate-context.ts';
import { loadV6Knowledge } from '../../../../../../agent/src/v6/knowledge.ts';

const output = dirname(fileURLToPath(import.meta.url));
const read = (name: string) => JSON.parse(readFileSync(resolve(output, name), 'utf8'));
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const strategies = parseStrategyLibrary(read('strategy-candidates.json'));
const draft = read('rk-draft.json');
const draftResult = validateV6Draft('reflex', draft, read('validation-context.json'));
if (!draftResult.ok) throw new Error(JSON.stringify(draftResult.issues));
const isolated = loadV6Knowledge(resolve(output, 'isolated-knowledge'), 'silent');
if (isolated.reflex.status !== 'loaded' || isolated.vocab.status !== 'loaded') throw Error('isolated candidate loader rejected data');
const cases = read('replay-inventory.json').cases;
const checks = [];
for (const item of cases) {
  if (hash(item.state) !== item.state_sha256 || hash(item.decision) !== item.decision_sha256) throw Error('source changed');
  const state = parseGameState(JSON.parse(readFileSync(item.state, 'utf8')).state);
  const facts = combatPredicateFacts(state);
  const entry = draft.reflex.entries.find((e: { id: string }) => e.id === item.id);
  const currentOnly = { op: 'and', args: entry.predicate.args.filter((p: { field?: string }) => p.field !== 'option.actions') };
  const current = evaluatePredicate(currentOnly, facts.context);
  const full = evaluatePredicate(entry.predicate, facts.context);
  if (current !== true || full !== null) throw Error(`${item.id}: expected observed conditions true and missing Plan unknown`);
  checks.push({ id: item.id, observed_state_conditions: current, full_predicate_without_original_plan: full,
    plan_available: false, consumer_readback: 'pending', state_sha256: item.state_sha256,
    facts_sources: facts.sources, unavailable: facts.unavailable });
}
const result = { kind: 'offline-candidate-validation', strategy_format_entries: strategies.entries.length,
  reflex_draft_format: draftResult.ok, reflex_entries: draft.reflex.entries.length,
  source_checks: checks, original_plan_count: 0, replay_count: 0, model_calls: 0,
  isolated_candidate_loader_entries: isolated.reflex.value.length,
  production_readbacks: 0, passed: true };
writeFileSync(resolve(output, 'candidate-validation.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({ strategy_format_entries: result.strategy_format_entries,
  reflex_entries: result.reflex_entries, observed_state_conditions_true: checks.length,
  original_plan_count: 0, production_readbacks: 0, passed: true }) + '\n');
