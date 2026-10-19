/** Scoped observations determine candidates and entry HP, never another character's knowledge. */
import type { V6RouteEntryTable } from "./v6-route-entry.js";
import type { Character, ProjectionEntry } from "../v6/formats.js";
import { bossKeyOf } from "./boss-lines.js";
import { BOSS_KEYS, type BossTrustData } from "./boss-trust.js";
import type { DoubleBossModel } from "../knowledge/double-boss.js";
import type { V6ProjectionTarget } from "./v6-projection.js";

export interface V6BossObservation {
  run_id: string; character: Character; ascension: number; act: number; floor: number; boss: string;
  /** Only the first attempt at the floor belongs in encounter/entry statistics. */
  first_attempt: boolean; entry_hp: number; max_hp: number;
}
export interface V6TargetContext {
  character: Character; ascension: number; act: number; floor: number;
  visible: readonly { act: number; floor: number; boss: string }[];
  observations: readonly V6BossObservation[]; excludeRun?: string;
  doubleBoss: DoubleBossModel | null;
  /** Absent checkpoints use own historical HP; explicit null/dead entries do not fall back. */
  routeEntries?: V6RouteEntryTable;
}
function scoped(context: V6TargetContext): V6BossObservation[] {
  const rows = context.observations.map(o => ({ ...o, boss: bossKeyOf(o.boss.split("+")) ?? o.boss })).filter(o => o.character === context.character && o.ascension === context.ascension
    && o.run_id !== context.excludeRun && o.first_attempt);
  const groups = new Map<string, V6BossObservation[]>();
  for (const row of rows) { const key = JSON.stringify([row.run_id, row.floor]); const group = groups.get(key) ?? []; group.push(row); groups.set(key, group); }
  // Repeated polls collapse, contradictory first observations stay out of the denominator.
  return [...groups.values()].flatMap(group => group.every(o => JSON.stringify(o) === JSON.stringify(group[0])) ? [group[0]!] : []);
}
/** Ordered pair frequencies are observed jointly. Marginal second-boss counts are never multiplied. */
export function v6ProjectionTargets(context: V6TargetContext): V6ProjectionTarget[] {
  const rows = scoped(context), targets: V6ProjectionTarget[] = [];
  const model = context.doubleBoss?.character === context.character && context.doubleBoss.ascension === context.ascension ? context.doubleBoss : null;
  const finalAct = Math.max(3, model?.act ?? 3);
  for (let act = context.act; act <= finalAct; act++) {
    const visible = context.visible.find(v => v.act === act);
    const at = rows.filter(o => o.act === act && o.floor >= context.floor && (!model || o.floor !== model.secondFloor));
    const floor = visible?.floor ?? (at.length && at.every(o => o.floor === at[0]!.floor) ? at[0]!.floor : null);
    const bosses = visible ? [visible.boss] : [...new Set(at.filter(o => o.floor === floor).map(o => o.boss))].sort();
    const kind = act === context.act ? "current" : "future";
    if (!bosses.length || floor === null) {
      targets.push({ id: `act${act}:unknown`, boss: "unknown", act, floor: floor ?? -1, kind, probability: null,
        labels: ["no_character_scoped_boss_pool"], unknown: "no_observed_boss_identity_or_checkpoint" }); continue;
    }
    const denominator = at.filter(o => o.floor === floor).length;
    for (const boss of bosses) targets.push({ id: `f${floor}:${boss}`, boss, act, floor, kind,
      probability: visible ? 1 : at.filter(o => o.floor === floor && o.boss === boss).length / denominator,
      labels: [visible ? "visible_actual_boss" : "observed_independent_first_attempt_runs_not_spawn_distribution"] });
  }
  if (model && context.floor <= model.firstFloor) {
    const first = rows.filter(o => o.act === model.act && o.floor === model.firstFloor);
    const pairs = new Map<string, { boss: string; second: string; count: number }>();
    const knownFirst = context.visible.find(v => v.floor === model.firstFloor)?.boss;
    const eligible = first.filter(o => !knownFirst || o.boss === knownFirst);
    let missing = 0;
    for (const row of eligible) {
      const second = rows.find(o => o.run_id === row.run_id && o.floor === model.secondFloor && o.act === model.act);
      if (!second || !model.secondBosses.some(b => b.boss === second.boss)) { missing++; continue; }
      const key = JSON.stringify([row.boss, second.boss]), value = pairs.get(key) ?? { boss: row.boss, second: second.boss, count: 0 };
      value.count++; pairs.set(key, value);
    }
    for (const { boss, second, count } of [...pairs.values()].sort((a, b) => a.boss.localeCompare(b.boss) || a.second.localeCompare(b.second)))
      targets.push({ id: `f${model.firstFloor}:${boss}:then:f${model.secondFloor}:${second}`, boss, secondBoss: second,
        secondFloor: model.secondFloor, act: model.act, floor: model.firstFloor, kind: "chain", probability: count / eligible.length,
        labels: ["observed_ordered_pair_frequency_selected_reached_first_boss_cohort", model.limitation] });
    if (missing || !pairs.size) targets.push({ id: `f${model.firstFloor}:then:f${model.secondFloor}:unknown`, boss: knownFirst ?? "unknown",
      secondBoss: "unknown", secondFloor: model.secondFloor, act: model.act, floor: model.firstFloor, kind: "chain",
      probability: eligible.length ? missing / eligible.length : null, labels: [model.limitation], unknown: "ordered_pair_unobserved_in_first_boss_cohort" });
  }
  return targets;
}
export interface V6EntryHp { hp: number | null; n: number; source: string; labels: string[] }
/** Current HP is already the existing route projection's boss-entry estimate. Do not heal it twice. */
export function v6EntryHp(context: V6TargetContext, target: V6ProjectionTarget, maxHp: number, currentRouteHp: number | null): V6EntryHp {
  if (!(Number.isFinite(maxHp) && maxHp > 0)) return { hp: null, n: 0, source: "unknown", labels: ["invalid_current_max_hp"] };
  const route = context.routeEntries;
  if (route) {
    if (route.character !== context.character || route.ascension !== context.ascension || route.source_floor !== context.floor
      || route.source_act !== context.act || route.max_hp !== maxHp || !route.signature) return {
      hp: null, n: 0, source: "explicit_route_projection", labels: ["route_entry_scope_mismatch"] };
    const matches = route.entries.filter(e => e.act === target.act && e.floor === target.floor);
    if (matches.length) {
      const entry = matches[0]!;
      const valid = matches.length === 1 && entry.max_hp === maxHp && entry.hp !== null
        && Number.isFinite(entry.hp) && entry.hp >= 0 && entry.hp <= maxHp;
      return { hp: valid ? entry.hp : null, n: 0, source: "explicit_route_projection", labels: [...entry.labels,
        ...(entry.max_hp !== maxHp ? ["future_max_hp_change_not_modelled"] : []), ...(!valid ? ["explicit_route_entry_unknown"] : [])] };
    }
  }
  if ((target.kind === "current" || target.floor === context.floor
    || target.act === context.act && context.visible.some(v => v.act === context.act && v.floor === target.floor))
    && currentRouteHp !== null) {
    const valid = Number.isFinite(currentRouteHp) && currentRouteHp >= 0 && currentRouteHp <= maxHp;
    return { hp: valid ? currentRouteHp : null, n: 0, source: "existing_route_projection",
      labels: valid ? [] : ["invalid_current_route_hp"] };
  }
  const rows = scoped(context).filter(o => o.floor === target.floor && o.act === target.act
    && Number.isFinite(o.entry_hp) && Number.isFinite(o.max_hp) && o.max_hp > 0 && o.entry_hp >= 0 && o.entry_hp <= o.max_hp);
  if (!rows.length) return { hp: null, n: 0, source: "unknown", labels: ["no_own_first_entry_hp_at_checkpoint"] };
  const ratios = rows.map(o => o.entry_hp / o.max_hp).sort((a, b) => a - b), mid = Math.floor(ratios.length / 2);
  const median = ratios.length % 2 ? ratios[mid]! : (ratios[mid - 1]! + ratios[mid]!) / 2;
  return { hp: Math.floor(median * maxHp), n: ratios.length, source: "own_first_entry_hp_ratio_median",
    labels: ["selected_reached_checkpoint_cohort", "future_relics_and_potions_not_predicted", "missing_route_own_checkpoint_hp_fallback"] };
}
/** Preserve the file's reason verbatim. A low-trust reason alone does not establish bias direction. */
export function v6TargetTrust(character: Character, ascension: number, target: V6ProjectionTarget, data: BossTrustData | null): {
  value: ProjectionEntry["trust"]; labels: string[];
} {
  if (!data || data.character !== character) return { value: "unknown", labels: ["missing_own_character_boss_trust"] };
  const reasons = [data.ascension_low?.b3?.[String(ascension)], data.stage_low?.b3?.[String(target.floor)]];
  const fit = data.overall?.pre?.platt;
  if (character === "silent" && !(fit && Number.isFinite(fit.a) && Number.isFinite(fit.b) && fit.b > 0
    && (fit.c === undefined || Number.isFinite(fit.c)))) reasons.push("静默整体校准不足");
  if (data.source?.completed_max_asc !== undefined && ascension > data.source.completed_max_asc) reasons.push("ascension_outside_own_validation");
  const keys = [target.boss, ...(target.kind === "chain" ? [target.secondBoss ?? "unknown"] : [])];
  for (const key of keys) reasons.push(data.low_confidence_b3[key]);
  if (target.unknown) reasons.push(target.unknown);
  if (keys.some(k => !(BOSS_KEYS as readonly string[]).includes(k))) reasons.push("unknown_boss");
  const labels = reasons.filter((r): r is string => !!r);
  if (target.kind === "chain") labels.push("continuous_calibration_unknown", "partial_continuation_model");
  // Single-fight validation never certifies a continuous sequence.
  let value: ProjectionEntry["trust"] = labels.length ? "unknown" : "trusted";
  const metrics = (data as BossTrustData & { bosses?: Record<string, { pre?: { n?: number; mean_pred?: number; actual_win?: number } }> }).bosses?.[target.boss]?.pre;
  if (target.kind !== "chain" && labels.length && !target.unknown && !reasons[0] && !reasons[1]
    && labels.length === 1 && data.low_confidence_b3[target.boss] && metrics && (metrics.n ?? 0) >= data.criteria.min_fights
    && Number.isFinite(metrics.mean_pred) && Number.isFinite(metrics.actual_win)) {
    const gap = metrics.mean_pred! - metrics.actual_win!;
    value = gap > 0 ? "low_optimistic" : gap < 0 ? "low_pessimistic" : "unknown";
    labels.push("bias_sign_from_own_pre_fight_validation_mean");
  }
  return { value, labels };
}
