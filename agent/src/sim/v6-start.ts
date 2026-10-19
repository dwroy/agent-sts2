/** Reuse existing synthetic openings and same-sample resource continuation without predicting future inventory. */
import type { BuildState } from "../construction/types.js";
import { asArray, asRecord, str } from "../core/util/json.js";
import { parseGameState, type GameState } from "../hand/mod/schema.js";
import { cardUpgrade } from "../knowledge/card-upgrades.js";
import { doubleBossFor, type DoubleBossModel } from "../knowledge/double-boss.js";
import type { Knowledge } from "../knowledge/index.js";
import { syntheticBossStart, type SyntheticStartOptions } from "./boss-start.js";
import { bossLinesOptions } from "./boss-lines.js";
import { withDoubleBossStart } from "./double-boss-start.js";
import type { V6PreparedProjection, V6ProjectionTarget } from "./v6-projection.js";
import { v6EntryHp, type V6TargetContext } from "./v6-targets.js";

export interface V6StartContext {
  state: GameState; knowledge: Knowledge; targets: V6TargetContext;
  currentRouteHp: number | null; doubleBoss: DoubleBossModel | null;
  models?: SyntheticStartOptions;
}
/** Caller-supplied completion may change cards only. Held relic objects/counters and the potion belt remain intact. */
export function v6ProjectionStart(context: V6StartContext, target: V6ProjectionTarget, completed: BuildState): V6PreparedProjection | null {
  const original = asRecord(context.state.run?.raw), character = str(original["character_id"]).toLowerCase();
  if (character !== context.targets.character || context.state.run?.ascension !== context.targets.ascension || target.unknown) return null;
  const maxHp = Number(original["max_hp"]);
  if (completed.maxHp !== maxHp || completed.combatResources !== undefined) return null;
  const relics = asArray(original["relics"]).map(r => str(asRecord(r)["relic_id"])).sort();
  if (JSON.stringify([...completed.relics].sort()) !== JSON.stringify(relics)) return null;
  const hp = v6EntryHp(context.targets, target, maxHp, context.currentRouteHp);
  // Existing syntheticBossStart clamps zero to one: do not turn an unknown/dead route into a surviving projection.
  if (hp.hp === null || hp.hp <= 0) return null;
  const raw = structuredClone(context.state.raw), run = asRecord(raw["run"]);
  const remaining = asArray(original["deck"]).map(asRecord);
  const cards: Record<string, unknown>[] = [];
  for (const [index, card] of completed.cards.entries()) {
    const at = remaining.findIndex(c => c["card_id"] === card.id && (c["upgraded"] === true) === card.upgraded);
    if (at >= 0) cards.push({ ...remaining.splice(at, 1)[0]!, index });
    else {
      const upgrade = cardUpgrade(card.id);
      if (!context.knowledge.card(card.id) || card.upgraded && !upgrade) return null;
      const upgradeAt = card.upgraded ? remaining.findIndex(c => c["card_id"] === card.id && c["upgraded"] !== true) : -1;
      const held = upgradeAt >= 0 ? remaining.splice(upgradeAt, 1)[0]! : {};
      // Text-only upgrades need the logged face, not merely an upgraded flag on base rules.
      const face = upgrade?.faces?.[card.upgraded ? 1 : 0]?.card;
      // An unenchanted observation cannot replace modified instance values.
      if (face && (held["enchantment"] != null || asArray(held["dynamic_values"]).some(v => {
        const value = asRecord(v), base = value["base_value"];
        return value["is_modified"] === true || ["current_value", "enchanted_value"].some(k => value[k] !== undefined && value[k] !== base);
      }))) return null;
      cards.push({ ...held, ...(face ? structuredClone(face) : {}),
        card_id: card.id, upgraded: card.upgraded, index });
    }
  }
  run["deck"] = cards; run["current_hp"] = hp.hp;
  run["floor"] = target.floor; run["act_id"] = String(target.act - 1); run["boss_id"] = `${target.boss}_BOSS`;
  const state = parseGameState(raw);
  let chain: DoubleBossModel | null = null;
  if (target.kind === "chain") {
    const model = doubleBossFor(state, context.doubleBoss);
    const second = model?.secondBosses.find(b => b.boss === target.secondBoss);
    if (!model || target.floor !== model.firstFloor || target.secondFloor !== model.secondFloor || !second) return null;
    chain = { ...model, secondBosses: [second] };
  }
  const enabled = bossLinesOptions.enabled;
  bossLinesOptions.enabled = false;
  try {
    const start = syntheticBossStart(state, context.knowledge, `${target.boss}_BOSS`, hp.hp, context.models);
    const input = chain ? withDoubleBossStart(state, context.knowledge, start.input, chain, context.models) : start.input;
    return { input: { ...input, captureResources: true, captureCore: true }, maxHp: start.maxHp,
      bossHp: start.boss.parts.reduce((sum, part) => sum + part.hp, 0),
      labels: [...hp.labels, `entry_hp_source:${hp.source}:n=${hp.n}`, "current_relics_and_potion_belt_only",
        ...(start.boss.exact ? [] : ["nearest_observed_ascension_opening"]),
        ...start.relics.unmodelled.map(id => `unmodelled_relic:${id}`), ...(chain ? [chain.limitation] : [])] };
  } finally { bossLinesOptions.enabled = enabled; }
}
