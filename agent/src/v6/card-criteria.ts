/** Decisions consumes criteria directly. Keep measured comparisons beside each legal choice. */
import type { CardCombatRow, CombatEstimate, CombatMetric, V6CardResults } from "../sim/v6-card-results.js";

const fields: CombatMetric[] = ["death_rate", "hp_loss", "damage_per_turn", "turns", "losing_enemy_hp_fraction"];
export const V6_CARD_CRITERIA_INSTRUCTIONS = "Choose from the numeric criteria. Every delta is option minus skip on identical seeds; target indexes state.targets; columns orders the five metrics; each cell is [mean,SE,n]. Prefer lower death/HP loss and higher damage/turn across the current Boss and observed elite pool. Turns alone are not better: when all die, longer survival and lower losing-enemy HP can matter. equal_option_means gives column indices for non-discriminating absolute means, not equal uncertainty. B lists completed-core future outcomes and cards_missing, independent of A. Never multiply by P; unknown is not zero. Use supplied facts and uncertainty.";
const cell = (x: CombatEstimate | null) => x ? [Number(x.mean.toPrecision(5)), x.se === null ? null : Number(x.se.toPrecision(3)), x.n] : null;
const measures = (r: CardCombatRow, paired: boolean) => fields.map(k => cell((paired ? r.paired_delta : r.metrics)[k]));

export function cardCriteria(names: Record<string, string>, results: V6CardResults | null | undefined): Record<string, string> {
  const target = (id: string) => { const i = results?.targets.findIndex(t => t.id === id) ?? -1; return i < 0 ? id : i; };
  const choices = Object.keys(names), bodies: Record<string, Record<string, unknown>> = {};
  const same = new Map<string, string[]>();
  for (const target of results?.targets.filter(t => t.kind === "current" || t.kind === "elite") ?? []) {
    const rows = choices.map(id => results?.immediate.find(r => r.option_id === id && r.target_id === target.id));
    same.set(target.id, fields.filter(k => rows.every(r => r?.metrics[k]) && new Set(rows.map(r => r!.metrics[k]!.mean)).size === 1));
  }
  for (const id of choices) {
    bodies[id] = { action: names[id], columns: fields, A_vs_skip: results?.immediate.filter(r => r.option_id === id).map(r => ({
      target: target(r.target_id), delta: measures(r, true),
      ...(same.get(r.target_id)?.length ? { equal_option_means: same.get(r.target_id)!.map(k => fields.indexOf(k as CombatMetric)) } : {}),
      ...(r.metrics.death_rate?.mean === 1 ? { all_sampled_fights_lost: true } : {}),
      ...(r.unknown_reasons.length ? { unknown: r.unknown_reasons } : {}),
    })) ?? [], B_progress: results?.progress[id]?.filter(p => p.advanced > 0).map(p => ({
      direction: p.direction, core: p.combo, advanced: p.advanced, cards_missing: p.missing_after,
      results: [], unknown: results.long_term.some(r => r.direction_id === p.direction && r.combo_id === p.combo) ? [...new Set(results.long_term.filter(r => r.direction_id === p.direction && r.combo_id === p.combo).flatMap(r => r.unknown_reasons))] : ["completed_core_cache_miss"],
    })) ?? [] };
  }
  // A and progress are mandatory. Allocate optional B numeric rows fairly without cutting a number/string mid-cell.
  const pending = choices.map(id => {
    const cores = (bodies[id]!.B_progress as Record<string, unknown>[]).map(core => ({ core,
      rows: (results?.long_term ?? []).filter(r => r.direction_id === core.direction && r.combo_id === core.core && fields.some(k => r.metrics[k])) }));
    return { id, rows: Array.from({ length: Math.max(0, ...cores.map(c => c.rows.length)) }, (_, i) =>
      cores.flatMap(c => c.rows[i] ? [{ core: c.core, row: c.rows[i]! }] : [])).flat() };
  });
  const size = () => Buffer.byteLength(JSON.stringify(bodies));
  // Reserve numeric B space in addition to mandatory A; A alone can exceed the old 6 kB cap.
  // The enclosing Decisions packer still enforces the unchanged whole-request byte budget.
  const limit = Math.max(6_000, size() + 4_000);
  for (let i = 0; i < Math.max(0, ...pending.map(p => p.rows.length)); i++) for (const p of pending) {
    const item = p.rows[i]; if (!item) continue;
    const rows = item.core.results as unknown[];
    rows.push({ target: target(item.row.target_id), result: measures(item.row, false), vs_current_deck: measures(item.row, true), trust: item.row.trust });
    if (size() > limit) { rows.pop(); item.core.numeric_targets_omitted = Number(item.core.numeric_targets_omitted ?? 0) + 1; }
  }
  return Object.fromEntries(choices.map(id => [id, JSON.stringify(bodies[id])]));
}
