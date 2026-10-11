import { asArray, asRecord, num, str } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import { fightKey } from "../memory/fight-plan.js";
import type { ScreenMemory } from "../memory/types.js";
import type { EnemySim } from "./turn-solver.js";

/** A5HKP18P4Q0T F8 T6, silent-0211: the second HP hit did not grant another seven block. */
export function observeSilentSkittish(memory: ScreenMemory, state: GameState): boolean {
  const before = JSON.stringify(memory.silentSkittish);
  if (!state.in_combat || str(asRecord(state.run?.raw)["character_id"]).toLowerCase() !== "silent" || state.run?.ascension !== 10) {
    memory.silentSkittish = undefined;
    return before !== JSON.stringify(memory.silentSkittish);
  }
  if (state.turn === null || state.combat?.can_use_combat_actions === false) return false;
  const combat = asRecord(state.raw["combat"]);
  const cards = asRecord(combat["player"])["cards_played_this_turn"];
  if (typeof cards !== "number" || !Number.isInteger(cards) || cards < 0) {
    memory.silentSkittish = undefined;
    return before !== JSON.stringify(memory.silentSkittish);
  }
  const enemies = asArray(combat["enemies"]).map(asRecord).filter((enemy) => num(enemy["current_hp"]) > 0);
  if (!enemies.some((enemy) => enemy["enemy_id"] === "PHANTASMAL_GARDENER" &&
    asArray(enemy["powers"]).map(asRecord).some((power) => power["power_id"] === "SKITTISH_POWER" && power["amount"] === 7))) {
    memory.silentSkittish = undefined;
    return before !== JSON.stringify(memory.silentSkittish);
  }
  const roster = enemies.map((enemy) => `${enemy["index"]}:${enemy["enemy_id"]}:${enemy["max_hp"]}`).join("|");
  const key = `${str(state.raw["run_id"])}:${fightKey(state)}:${state.turn}`;
  const last = memory.silentSkittish;
  // A changed roster has no stable entity ids; a decreased counter may be an SL reload.
  // Drop the inference instead of transferring a spent trigger to a different enemy.
  if (!last || last.key !== key || last.roster !== roster || cards < last.cards) {
    memory.silentSkittish = { key, roster, cards, enemies: {} };
  }
  const memo = memory.silentSkittish!;
  const previousCards = memo.cards;
  for (const enemy of enemies) {
    if (enemy["enemy_id"] !== "PHANTASMAL_GARDENER") continue;
    const stacks = asArray(enemy["powers"]).map(asRecord).find((power) => power["power_id"] === "SKITTISH_POWER")?.["amount"];
    // Only the observed seven-block variant and a directly observed grant are carried.
    if (stacks !== 7) continue;
    const index = String(enemy["index"]);
    const hp = num(enemy["current_hp"]);
    const old = memo.enemies[index];
    const granted = old !== undefined && cards === previousCards + 1 && hp < old.hp &&
      old.block === 0 && num(enemy["block"]) === 7;
    memo.enemies[index] = { hp, block: num(enemy["block"]), spent: hp <= (old?.hp ?? hp) && (old?.spent === true || granted) };
  }
  memo.cards = cards;
  return before !== JSON.stringify(memory.silentSkittish);
}

/** The raw power remains visible after consumption; only this turn's simulated availability changes. */
export function carrySilentSkittish(memory: ScreenMemory, state: GameState, enemies: EnemySim[]): void {
  observeSilentSkittish(memory, state);
  if (state.turn === null || state.combat?.can_use_combat_actions === false) return;
  for (const enemy of enemies) {
    if (enemy.skittish === 7 && memory.silentSkittish?.enemies[String(enemy.index)]?.spent) enemy.skittish = 0;
  }
}
