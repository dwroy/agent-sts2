/**
 * SL's certain-death check (docs/sl.md §2): asked only when the loop is about to send `end_turn` in a fight that may
 * be retried. It says "certain" only when every condition below holds; anything it cannot rule out is a veto
 * (Dai 2026-10-02: when unsure, no SL).
 *
 * Common conditions:
 * - the mod's own flag, combat.end_turn_will_kill_player, is true (the intents against the block up now);
 * - nothing revives us: no Fairy in a Bottle held, no unspent Lizard Tail (`revives`, from combat-plan's revivesOf);
 * - no Buffer or Intangible on us, no Ripple Basin with no attack played (its block is not modelled here);
 * - no enemy in a special phase (max HP at or above a million: the Waterfall Giant's eruption; a DeathBlow intent);
 * - our own count agrees: the attack intents (damage x hits) minus the block up now, the block that comes at the end
 *   of the turn (Plating / Plated Armor / Metallicize, Cloak Clasp for each card held, Feel No Pain for each card
 *   held as if all were Ethereal, Orichalcum when no block is left) and Regen reach our HP.
 * Then one of two tiers:
 * - "rules": no playable card in hand and no potion that can be drunk;
 * - "least-loss": the turn planner's own verdict on this board, combat/least-loss ending the turn: every simulated
 *   line dies (modelled potions included), no unmodelled potion and no random potion that may live, and the
 *   least-loss line is ending the turn. Vetoed when a playable card draws (the draws are not known).
 *
 * Calibration on the logged A8+ boss and listed-elite turn ends (states.jsonl up to 2026-10-02, 4557 turn ends,
 * 201 deaths): "rules" fired 121 times, all deaths; both tiers 140 times, 139 deaths; the one survivor (7KDMKN16GD6B
 * F27 T7) had Feel No Pain block from exhausted Ethereal cards, now counted for every card held.
 */
import type { GameState } from "../mod/schema.js";
import { distinctNames } from "../screens/combat-plan.js";
import { asArray, asRecord, num, numOrNull, str } from "../util/json.js";

export type JudgeTier = "rules" | "least-loss";

export interface DeathVerdict {
  certain: boolean;
  tier: JudgeTier | null;
  /** Why it is certain, or what vetoed it. */
  reason: string;
  hp: number;
  block: number;
  /** Block expected at the end of the turn on top of `block` (see the module comment). */
  endBlock: number;
  /** The attack intents, damage x hits, over the living enemies. */
  incoming: number;
  /** "name (intent)" for each living enemy that attacks. */
  killers: string[];
}

export interface JudgeContext {
  /** The label of the decision that chose end_turn (combat/least-loss is the planner's all-lines-die verdict). */
  label: string;
  /** What can still revive us ("FAIRY_IN_A_BOTTLE", "LIZARD_TAIL"). */
  revives: readonly string[];
}

/** The planner label whose end_turn means "every simulated line dies; ending the turn keeps the most HP". */
export const LEAST_LOSS_LABEL = "combat/least-loss";
const SPECIAL_ENEMY_HP = 1_000_000;
const SAVING_POWERS = ["BUFFER_POWER", "INTANGIBLE_POWER"];
const END_BLOCK_POWERS = ["PLATING_POWER", "PLATED_ARMOR_POWER", "METALLICIZE_POWER"];
const ORICHALCUM_BLOCK = 6;
/** Card text that draws (the game's Chinese text, or English). */
const DRAWS = /抽|draw/i;

function powerAmount(entity: Record<string, unknown>, id: string): number {
  return asArray(entity["powers"])
    .map(asRecord)
    .filter((power) => str(power["power_id"]) === id)
    .reduce((sum, power) => sum + num(power["amount"]), 0);
}

export function judgeEndTurn(state: GameState, context: JudgeContext): DeathVerdict {
  const combat = asRecord(state.raw["combat"]);
  const player = asRecord(combat["player"]);
  const run = asRecord(state.raw["run"]);
  const hp = num(player["current_hp"]);
  const block = num(player["block"]);
  const hand = asArray(combat["hand"]).map(asRecord);
  const relics = new Set(asArray(run["relics"]).map((relic) => str(asRecord(relic)["relic_id"])));
  const living = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
  let incoming = 0;
  const killers: string[] = [];
  // Named as the combat options name them (「残杀千足虫 (MIDDLE)」, controller livingNames).
  const names = distinctNames(living.map((enemy) => ({ name: str(enemy["name"], str(enemy["enemy_id"], "?")), id: str(enemy["enemy_id"]) })));
  for (const [i, enemy] of living.entries()) {
    let own = 0;
    const labels: string[] = [];
    for (const intent of asArray(enemy["intents"]).map(asRecord)) {
      const damage = numOrNull(intent["damage"]);
      if (damage === null || damage <= 0) continue;
      const hits = Math.max(1, numOrNull(intent["hits"]) ?? 1);
      own += damage * hits;
      labels.push(`${str(intent["intent_type"], "Attack")} ${hits > 1 ? `${damage}x${hits}` : damage}`);
    }
    incoming += own;
    if (own > 0) killers.push(`${names[i]} (${labels.join(", ")})`);
  }
  let endBlock = END_BLOCK_POWERS.reduce((sum, id) => sum + powerAmount(player, id), 0);
  if (relics.has("CLOAK_CLASP")) endBlock += hand.length;
  endBlock += powerAmount(player, "FEEL_NO_PAIN_POWER") * hand.length;
  if (relics.has("ORICHALCUM") && block + endBlock <= 0) endBlock += ORICHALCUM_BLOCK;
  const regen = powerAmount(player, "REGEN_POWER");
  const verdict = (certain: boolean, tier: JudgeTier | null, reason: string): DeathVerdict => ({ certain, tier, reason, hp, block, endBlock, incoming, killers });

  if (state.screen !== "COMBAT" || !state.in_combat) return verdict(false, null, "not in combat");
  if (combat["end_turn_will_kill_player"] !== true) return verdict(false, null, "the mod does not flag ending the turn as lethal");
  if (context.revives.length > 0) return verdict(false, null, `a revive is left (${context.revives.join(", ")})`);
  const saving = SAVING_POWERS.filter((id) => powerAmount(player, id) > 0);
  if (saving.length > 0) return verdict(false, null, `${saving.join(", ")} up`);
  if (relics.has("RIPPLE_BASIN") && num(player["attacks_played_this_turn"]) === 0) return verdict(false, null, "Ripple Basin (no attack played): its block is not counted here");
  const special = living.find(
    (enemy) => num(enemy["max_hp"]) >= SPECIAL_ENEMY_HP || asArray(enemy["intents"]).some((intent) => str(asRecord(intent)["intent_type"]) === "DeathBlow"),
  );
  if (special) return verdict(false, null, `${str(special["name"], str(special["enemy_id"]))} is in a special phase (DeathBlow or a million HP)`);
  if (incoming - block - endBlock - regen < hp) {
    return verdict(false, null, `own count survives: ${incoming} incoming - ${block} block - ${endBlock} end-of-turn block - ${regen} Regen < ${hp} HP`);
  }
  const playable = hand.filter((card) => card["playable"] === true);
  const drinkable = asArray(run["potions"]).map(asRecord).filter((slot) => slot["occupied"] !== false && str(slot["potion_id"]) && slot["can_use"] === true);
  const lethal = `${incoming} incoming vs ${hp} HP + ${block} block + ${endBlock} end-of-turn block${regen > 0 ? ` + ${regen} Regen` : ""}`;
  if (playable.length === 0 && drinkable.length === 0) return verdict(true, "rules", `nothing left to play or drink; ${lethal}`);
  if (context.label === LEAST_LOSS_LABEL) {
    const drawing = playable.find((card) => DRAWS.test(`${str(card["resolved_rules_text"])} ${str(card["rules_text"])}`));
    if (drawing) return verdict(false, null, `the planner sees every line die, but ${str(drawing["name"], str(drawing["card_id"]))} draws (unknown cards)`);
    return verdict(true, "least-loss", `the turn planner: every simulated line dies and ending the turn keeps the most HP; ${lethal}`);
  }
  return verdict(false, null, `${playable.length} playable card(s) and ${drinkable.length} potion(s) left`);
}
