/** Mechanical extraction from frozen logs. No final-deck backfill and no game conclusions. */
import type { BuildState, OpportunityModel } from "../construction/types.js";
import type { Character } from "../v6/formats.js";
import type { V6HistoryRun } from "./v6-supply.js";
import type { V6BossObservation } from "./v6-targets.js";
export interface V6RunCoverage {
  run_id: string; ended: string; ascension: number;
  first_stop: { ts: string; floor: number; result: string } | null;
  first_trial_final_victory: boolean; final_including_sl_victory: boolean;
}
export interface V6HistoryFrame {
  run_id: string; ts: string; floor: number; act_id: string; screen: string;
  boss_id?: string; in_combat?: boolean; turn?: number | null;
  hp: number; max_hp: number; gold: number; deck: BuildState["cards"];
}
export interface V6HistoryFight {
  run_id: string; ascension: number; floor: number; boss: string; attempt: number;
  started_at: string; ended_at: string; result: string;
  entry: { ts: string; hp: number; max_hp: number } | null;
}
function difference(before: BuildState["cards"], after: BuildState["cards"]): {
  adds: BuildState["cards"]; removes: BuildState["cards"]; upgrades: string[];
} {
  const removes = before.map(c => ({ id: c.id, upgraded: c.upgraded })), adds: BuildState["cards"] = [];
  for (const c of after) { const at = removes.findIndex(x => x.id === c.id && x.upgraded === c.upgraded);
    if (at >= 0) removes.splice(at, 1); else adds.push({ id: c.id, upgraded: c.upgraded }); }
  const upgrades: string[] = [];
  for (let i = adds.length - 1; i >= 0; i--) if (adds[i]!.upgraded) {
    const at = removes.findIndex(c => c.id === adds[i]!.id && !c.upgraded);
    if (at >= 0) { upgrades.push(adds[i]!.id); adds.splice(i, 1); removes.splice(at, 1); }
  }
  return { adds, removes, upgrades };
}
/** The explicit character argument describes the frozen input set, not a fallback character. */
export function v6History(character: Character, coverage: readonly V6RunCoverage[], frames: readonly V6HistoryFrame[],
  fights: readonly V6HistoryFight[], model: OpportunityModel, checkpointFloors: readonly number[] = []): {
    histories: V6HistoryRun[]; observations: V6BossObservation[]; opportunities: OpportunityModel; labels: string[];
  } {
  if (model.character !== character) throw new Error("cross-character V6 history input");
  const runs = new Map(coverage.map(r => [r.run_id, r]));
  if (runs.size !== coverage.length) throw new Error("duplicate frozen run identity");
  const rollback = new Map<string, string>();
  const first = (id: string, ts: string) => { const r = runs.get(id); return !!r && Number.isFinite(Date.parse(ts))
    && ts <= r.ended && (!r.first_stop || ts <= r.first_stop.ts) && (!rollback.has(id) || ts < rollback.get(id)!); };
  const groups = new Map<string, V6HistoryFrame[]>();
  for (const frame of frames) if (first(frame.run_id, frame.ts)) {
    if (!Number.isSafeInteger(frame.floor) || !Number.isFinite(frame.gold)) throw new Error("invalid frozen frame");
    const group = groups.get(frame.run_id) ?? []; group.push(frame); groups.set(frame.run_id, group);
  }
  const histories: V6HistoryRun[] = [];
  for (const [run, group] of groups) {
    const coverage = runs.get(run)!; group.sort((a, b) => a.ts.localeCompare(b.ts));
    const changes: V6HistoryRun["changes"] = [], rests = new Set<number>(); let previous: V6HistoryFrame | undefined;
    for (const f of group) {
      // A decreasing floor before the known stop is inconsistent: do not mix another attempt into a route.
      if (previous && f.floor < previous.floor) { rollback.set(run, f.ts); break; }
      const delta = previous ? difference(previous.deck, f.deck) : { adds: [], removes: [], upgrades: [] };
      const rest = /^(REST|REST_SITE)$/.test(f.screen) && !rests.has(f.floor); if (rest) rests.add(f.floor);
      if (rest || delta.adds.length || delta.removes.length || delta.upgrades.length || previous && f.gold > previous.gold)
        changes.push({ ...delta, floor: f.floor, act: Number(f.act_id) + 1, rest, positiveGold: previous ? Math.max(0, f.gold - previous.gold) : 0 });
      previous = f;
    }
    groups.set(run, group.filter(f => first(run, f.ts)));
    histories.push({ run, character, ascension: coverage.ascension, endedAt: coverage.ended,
      floors: [...new Set(group.filter(f => !previous || f.ts <= previous.ts).map(f => f.floor))].sort((a, b) => a - b), changes });
  }
  const observations = fights.flatMap(f => {
    const c = runs.get(f.run_id), e = f.entry;
    if (!c || c.ascension !== f.ascension || f.attempt !== 1 || !e || !first(f.run_id, e.ts)) return [];
    const matching = groups.get(f.run_id)?.find(x => x.floor === f.floor && x.ts >= f.started_at && x.ts <= e.ts);
    const act = matching ? Number(matching.act_id) + 1 : null;
    if (act === null) return [];
    return [{ run_id: f.run_id, character, ascension: f.ascension, act, floor: f.floor, boss: f.boss,
      first_attempt: true, entry_hp: e.hp, max_hp: e.max_hp }];
  });
  // Explicit replay checkpoints come from the plan/input descriptor, not inferred game rules.
  for (const [run, group] of groups) for (const floor of checkpointFloors) {
    if (observations.some(o => o.run_id === run && o.floor === floor)) continue;
    const f = group.find(x => x.floor === floor && x.in_combat && x.screen === "COMBAT" && x.turn === 1 && x.boss_id);
    if (f) observations.push({ run_id: run, character, ascension: runs.get(run)!.ascension, act: Number(f.act_id) + 1,
      floor, boss: f.boss_id!.toUpperCase().replace(/_BOSS$/, ""), first_attempt: true, entry_hp: f.hp, max_hp: f.max_hp });
  }
  return { histories, observations, opportunities: { ...model, rows: model.rows.filter(o => first(o.run, o.ts) && runs.get(o.run)!.ascension === o.ascension) },
    labels: ["first_stop_is_predicted_death_or_actual_death_not_necessarily_actual_death", "first_observed_boss_entry_may_follow_initial_actions",
      "sparse_frames_net_card_and_gold_changes_only", "rest_visits_not_observed_smith_choices", "no_final_deck_backfill"] };
}
