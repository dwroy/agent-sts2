/** Bind reward outcomes to the same frozen request factory and observed encounter data. */
import { asRecord, str } from "../core/util/json.js";
import type { DecisionEnv } from "../memory/types.js";
import { loadMonsterDb } from "../sim/boss-start.js";
import { v6ProjectionStart } from "../sim/v6-start.js";
import { v6Digest } from "../sim/v6-completion.js";
import type { V6ProjectionInput } from "./projection-input.js";
import type { V6ProjectionRequest } from "../sim/v6-projection.js";
import type { CardCombatTarget, CardResultsContext } from "../sim/v6-card-results.js";
import { nearestAscension } from "../knowledge/monster-db.js";
import type { Character } from "./formats.js";

export function cardResultsContext(env: DecisionEnv, input: V6ProjectionInput, r: V6ProjectionRequest): CardResultsContext {
  const raw = asRecord(env.state.run?.raw), db = loadMonsterDb();
  const eliteTargets: CardCombatTarget[] = Object.entries(db.encounters).filter(([, encounter]) =>
    (encounter.acts?.[String(r.act)] ?? 0) > 0 && Object.entries(encounter.rooms ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] === "elite")
    .sort(([a], [b]) => a.localeCompare(b)).map(([key]) => ({ id: `act${r.act}:elite:${key}`, boss: key, act: r.act,
      floor: env.state.run?.floor ?? -1, kind: "elite", probability: null,
      labels: ["observed_current_act_elite_pool_not_spawn_probability", "elite_entry_hp_assumed_current_hp"] }));
  return {
    fingerprint: v6Digest([str(env.state.raw.run_id), r.character, r.ascension, r.act, r.modelVersion,
      // Keep instance modifications and relic counters, not merely card IDs; offers and weights are deliberately absent.
      raw.deck, raw.relics, raw.potions, raw.current_hp, raw.max_hp, raw.floor, input.situation.route,
      r.targets, r.directions.map(d => [d.id, d.signature])]),
    eliteTargets,
    prepareCurrent(target, option) {
      // A asks how the actual inventory fights now; route forecasts belong to separate future entries.
      const built = v6ProjectionStart({ state: input.situation.state, knowledge: env.knowledge,
        targets: { character: r.character as Character, ascension: r.ascension, act: r.act, floor: env.state.run?.floor ?? -1,
          visible: [{ act: r.act, floor: target.floor, boss: target.boss }], observations: [], doubleBoss: null },
        currentRouteHp: env.state.run?.current_hp ?? null, doubleBoss: null, models: { db } }, { ...target, kind: "current" }, option.state);
      return built ? { ...built, labels: [...built.labels, "immediate_entry_hp_assumed_current_hp_not_route_forecast"] } : null;
    },
    prepareElite(target, option) {
      const encounter = db.encounters[target.boss]; if (!encounter?.by_asc) return null;
      // Reuse the observed boss-opening builder's HP, move and power rules with this encounter's recorded parts.
      // Encounter keys are the builder's exact turn-one initial IDs, joined by "+";
      // spawned minions in monsters[].encounters must not be added to that opening.
      const counts = new Map<string, number>();
      for (const id of target.boss.split("+")) counts.set(id, (counts.get(id) ?? 0) + 1);
      const byAsc = Object.fromEntries(Object.entries(encounter.by_asc).flatMap(([asc, observed]) => {
        const parts = Object.fromEntries([...counts].flatMap(([id, count]) => {
          const hp = nearestAscension(db.monsters[id]?.hp_by_asc, Number(asc));
          const range = hp && db.monsters[id]!.hp_by_asc![hp.key];
          return range ? [[id, { ...range, count_per_fight: count }]] : [];
        }));
        return Object.keys(parts).length === counts.size ? [[asc, { ...observed, parts }]] : [];
      }));
      if (!Object.keys(byAsc).length) return null;
      const models = { db: { ...db, bosses: { ...db.bosses, [target.boss]: byAsc } } };
      const built = v6ProjectionStart({ state: input.situation.state, knowledge: env.knowledge,
        targets: { character: r.character as Character, ascension: r.ascension, act: r.act, floor: target.floor,
          visible: [{ act: r.act, floor: target.floor, boss: target.boss }], observations: [], doubleBoss: null },
        currentRouteHp: env.state.run?.current_hp ?? null, doubleBoss: null, models }, { ...target, kind: "current" }, option.state);
      if (!built) return null;
      return { ...built, labels: [...built.labels, "encounter_opening_reuses_observed_boss_builder"],
        input: { ...built.input, meta: { ...built.input.meta, kind: "elite" } } };
    },
  };
}
