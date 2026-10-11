import { asArray, asRecord, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";

type Powers = Record<string, number>;
const RELICS = ["BAG_OF_PREPARATION", "BOWLER_HAT", "BRONZE_SCALES", "MANGO", "MOLTEN_EGG",
  "NUTRITIOUS_SOUP", "RING_OF_THE_SNAKE", "SILKEN_TRESS", "UNSETTLING_LAMP"];
const PLAYER: Powers = { THORNS_POWER: 3, SURROUNDED_POWER: 1, DEXTERITY_POWER: 6, NOXIOUS_FUMES_POWER: 3 };
const crab = (id: "CRUSHER" | "ROCKET", strength: number, poison: number, weak = 0, rage = true): Powers => ({
  [id === "CRUSHER" ? "BACK_ATTACK_LEFT_POWER" : "BACK_ATTACK_RIGHT_POWER"]: 1,
  STRENGTH_POWER: strength, POISON_POWER: poison,
  ...(weak ? { WEAK_POWER: weak } : {}), ...(rage ? { CRAB_RAGE_POWER: 1 } : {}),
});
// SB5N8GT2Y3VW F33, attempts 1..6. Preserve complete observed modifier combinations.
const BOARDS: { debuffed: boolean; target: string; enemies: Record<string, Powers> }[] = [
  { debuffed: false, target: "ROCKET", enemies: { ROCKET: crab("ROCKET", 12, 9, 1, false) } },
  { debuffed: true, target: "ROCKET", enemies: { CRUSHER: crab("CRUSHER", 3, 9, 1), ROCKET: crab("ROCKET", 6, 9) } },
  { debuffed: false, target: "ROCKET", enemies: { CRUSHER: crab("CRUSHER", 3, 5, 1), ROCKET: crab("ROCKET", 3, 5) } },
  { debuffed: true, target: "ROCKET", enemies: { ROCKET: crab("ROCKET", 12, 9, 0, false) } },
  { debuffed: false, target: "CRUSHER", enemies: { CRUSHER: crab("CRUSHER", 3, 3), ROCKET: crab("ROCKET", 3, 3, 2) } },
  { debuffed: false, target: "CRUSHER", enemies: { CRUSHER: crab("CRUSHER", 3, 3, 2), ROCKET: crab("ROCKET", 3, 3) } },
];

function matchesPowers(raw: unknown, expected: Powers): boolean {
  if (!Array.isArray(raw)) return false;
  const powers = raw.map(asRecord);
  return powers.length === Object.keys(expected).length &&
    new Set(powers.map((p) => p["power_id"])).size === powers.length &&
    powers.every((p) => Object.hasOwn(expected, str(p["power_id"])) && expected[str(p["power_id"])] === p["amount"]);
}

/** Preserve Jev's drink/re-read choice; an observed application is not a verified full-turn potion model. */
export function crabPoisonFacts(state: GameState, potionId: string, targetIndex: number | null): Record<string, JsonValue> {
  if (potionId !== "POISON_POTION" || targetIndex === null) return {};
  if (!state.in_combat || state.run?.ascension !== 10 || state.run.floor !== 33 ||
      str(asRecord(state.run.raw)["character_id"]).toUpperCase() !== "SILENT") return {};
  const run = asRecord(state.run.raw);
  const relics = asArray(run["relics"]).map((r) => str(asRecord(r)["relic_id"])).sort();
  if (relics.length !== RELICS.length || relics.some((id, i) => id !== RELICS[i])) return {};
  const combat = asRecord(state.raw["combat"]);
  const player = asRecord(combat["player"]);
  if (![player["orbs"], player["pets"]].every((v) => Array.isArray(v) && v.length === 0)) return {};
  const enemies = asArray(combat["enemies"]).map(asRecord);
  if (new Set(enemies.map((e) => e["enemy_id"])).size !== enemies.length ||
      new Set(enemies.map((e) => e["index"])).size !== enemies.length ||
      enemies.some((e) => e["is_alive"] !== true || e["is_hittable"] !== true ||
        typeof e["index"] !== "number" || !Number.isInteger(e["index"]) || e["index"] < 0)) return {};
  const target = enemies.find((enemy) => enemy["index"] === targetIndex);
  if (!target) return {};
  const observed = BOARDS.find((board) => board.target === target["enemy_id"] && matchesPowers(player["powers"], {
    ...PLAYER, ...(board.debuffed ? { WEAK_POWER: 2, FRAIL_POWER: 2 } : {}),
  }) && enemies.length === Object.keys(board.enemies).length && enemies.every((enemy) => {
    const expected = board.enemies[str(enemy["enemy_id"])];
    return expected !== undefined && matchesPowers(enemy["powers"], expected);
  }));
  if (!observed) return {};
  const poisonBefore = observed.enemies[observed.target]!["POISON_POWER"]!;
  return {
    simulated: "仅核实下列施毒当步事实；整轮伤害、存活及同伴死亡后继未验证，饮用后重新读取状态。",
    observed_potion_effect: {
      evidence: "SB5N8GT2Y3VW A10 F33 T6/T7/T9；同局六次SL饮用，非独立六局",
      target_index: targetIndex, target_id: observed.target,
      poison_before: poisonBefore, poison_added: 6, poison_after_application: poisonBefore + 6,
      immediate_hp_damage: 0, immediate_block_damage: 0,
      whole_turn_simulated: false, survival_verified: false,
    },
  };
}
