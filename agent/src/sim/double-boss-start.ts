/** Fresh continuation starts from this character's observed second bosses, never the run's hidden future. */
import { asArray, asRecord, str } from "../core/util/json.js";
import { doubleBossFor, type DoubleBossModel } from "../knowledge/double-boss.js";
import type { Knowledge } from "../knowledge/index.js";
import { parseGameState, type GameState } from "../hand/mod/schema.js";
import { potionViews } from "../memory/narrow.js";
import { modelPotion } from "../reflex/card-model.js";
import { randomPotionSource } from "../reflex/combat-plan.js";
import type { RolloutInput } from "../reflex/rollout.js";
import { syntheticBossStart, type SyntheticStartOptions } from "./boss-start.js";
import { bossLinesOptions } from "./boss-lines.js";

export function withDoubleBossStart(state: GameState, knowledge: Knowledge, input: RolloutInput, model: DoubleBossModel | null = doubleBossFor(state), opts: SyntheticStartOptions = {}): RolloutInput {
  if (!model || state.run?.floor == null || state.run.floor > model.firstFloor) return input;
  const linesEnabled = bossLinesOptions.enabled;
  let variants: NonNullable<RolloutInput["continuation"]>["variants"];
  // Building a board must not start nested whole-fight simulations, even after a boss becomes trusted.
  bossLinesOptions.enabled = false;
  try {
    variants = model.secondBosses.map(({ boss, count }) => {
      const raw = JSON.parse(JSON.stringify(state.raw)) as Record<string, unknown>;
      const run = asRecord(raw["run"]);
      run["floor"] = model.secondFloor;
      run["boss_id"] = `${boss}_BOSS`;
      const secondState = parseGameState(raw);
      const second = syntheticBossStart(secondState, knowledge, `${boss}_BOSS`, input.solver.player.hp, opts).input;
      const targets = second.solver.enemies.map((e) => e.index);
      const ctx = { enemyTargets: targets, strength: 0, weak: false, observedPoison: model.poisonPotionAmount };
      const sources = [];
      const potions = second.solver.hand.slice();
      const relics = asArray(run["relics"]).map((r) => str(asRecord(r)["relic_id"]));
      // Automatic potions remain in revives; unmodelled potions remain in the physical belt count.
      for (const potion of potionViews({ raw: run }, knowledge)) {
        const source = randomPotionSource(potion, secondState, knowledge, ctx, relics.includes("FIDDLE"));
        const card = modelPotion(potion.potion_id, potion.name, potion.slot, targets, ctx);
        if (!card || potions.some((p) => p.cardId === card.cardId)) continue;
        potions.push({ ...card, potionCost: 0 });
        if (source) sources.push({ ...source, cost: 0 });
      }
      return { boss, count, input: { ...second,
        solver: { ...second.solver, hand: potions, continuationValue: undefined },
        piles: { ...second.piles, handBase: potions.map(() => null) },
        ...(sources.length > 0 ? { randomPotions: sources } : {}),
        captureResources: true,
      } };
    });
  } finally { bossLinesOptions.enabled = linesEnabled; }
  const belt = asArray(asRecord(state.run?.raw)["potions"]).map(asRecord).filter((p) => p["occupied"] === true);
  const hand = input.solver.hand.map((card) => card.type === "Potion" && model.potionHp[card.cardId.split(":")[1] ?? ""] !== undefined
    ? { ...card, potionCost: model.potionHp[card.cardId.split(":")[1]!] } : card);
  const handBase = input.piles.handBase.slice();
  const targets = input.solver.enemies.map((e) => e.index);
  for (const potion of belt) {
    if (potion["potion_id"] !== "POISON_POTION") continue;
    const card = modelPotion("POISON_POTION", str(potion["name"]), Number(potion["index"]), targets,
      { enemyTargets: targets, strength: 0, weak: false, observedPoison: model.poisonPotionAmount });
    if (card && !hand.some((p) => p.cardId === card.cardId)) { hand.push({ ...card, potionCost: model.potionHp["POISON_POTION"] ?? 0 }); handBase.push(null); }
  }
  return { ...input, solver: { ...input.solver, hand, continuationValue: model.value }, piles: { ...input.piles, handBase }, continuation: { variants,
    potions: belt.map((p) => ({ key: `POTION:${str(p["potion_id"])}:${p["index"]}`, id: str(p["potion_id"]) })),
    source: model.value.source, limitation: model.limitation,
  } };
}
