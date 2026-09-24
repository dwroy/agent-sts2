/**
 * What a card in hand does, as numbers the turn solver can simulate.
 *
 * Most effects are read generically from the mod's `dynamic_values` (Damage, Block, VulnerablePower,
 * StrengthPower, HpLoss, Energy, Cards, Repeat, …) plus the raw rules template (`rules_text`), which
 * says whether damage hits twice or every enemy. A few cards whose vars are ambiguous or conditional
 * are special-cased by id. Anything we cannot model is still playable in the search, flagged
 * `known: false`, and valued with a small flat bonus so it neither dominates nor disappears.
 *
 * Damage values from the mod already include the player's current Strength and card scaling (see
 * damage.ts); Strength gained *during* the turn is added by the solver.
 */

import type { Knowledge } from "../knowledge/index.js";
import { asArray, asRecord, bool, num, numOrNull, str } from "../util/json.js";

export type TargetMode = "single" | "all" | "random" | "self" | "none";

export interface CardModel {
  index: number;
  key: string;
  cardId: string;
  name: string;
  type: string;
  upgraded: boolean;
  cost: number;
  xCost: boolean;
  playable: boolean;
  target: TargetMode;
  validTargets: number[];
  /** Per hit, before this turn's extra Strength and before Vulnerable/Weak. null = deals no damage. */
  damage: number | null;
  hits: number;
  block: number;
  /** Debuffs applied to the target (or every enemy for `all`). */
  vulnerable: number;
  weak: number;
  /** Permanent Strength for the player. */
  strength: number;
  /** Strength that only lasts this turn (Setup Strike). */
  tempStrength: number;
  /** Strength the target enemy gains (Fight Me). */
  enemyStrength: number;
  /** Strength the target enemy loses for this turn only (Mangle): lowers its next attack. */
  enemyTempStrengthLoss: number;
  hpLoss: number;
  energyGain: number;
  draw: number;
  exhausts: boolean;
  /** Conditional behaviour the solver implements by id. */
  special: "dismantle" | "body_slam" | "bully" | "molten_fist" | "whirlwind" | "spite" | "feed" | "triple_block" | "temp_dex" | "buffer" | null;
  /** False when the effect could not be modelled; the solver then uses `flatValue` only. */
  known: boolean;
  /** Heuristic value for effects that pay off later (powers, draw is valued separately). */
  flatValue: number;
  /** HP lost at end of turn if this card is still in hand (Toxic, Burn, Decay, …). */
  heldPenalty: number;
  text: string;
}

function dyn(card: Record<string, unknown>, name: string): number | null {
  for (const entry of asArray(card["dynamic_values"])) {
    const value = asRecord(entry);
    if (str(value["name"]) === name) {
      const current = numOrNull(value["current_value"]);
      return current ?? numOrNull(value["base_value"]);
    }
  }
  return null;
}

/**
 * Rough value of a Power card's lasting effect, in "HP-equivalent" points, for a fight of average
 * length. Only used to rank it against immediate damage/block; tuned from run logs.
 */
const POWER_VALUE: Record<string, number> = {
  DEMON_FORM: 30,
  INFLAME: 4, // the Strength itself is simulated; this is only the "earlier is better" nudge
  FEEL_NO_PAIN: 8,
  DARK_EMBRACE: 8,
  BARRICADE: 10,
  CORRUPTION: 14,
  CRIMSON_MANTLE: 16,
  INFERNO: 10,
  JUGGERNAUT: 14,
  JUGGLING: 6,
  PYRE: 16,
  RUPTURE: 6,
  STAMPEDE: 12,
  STONE_ARMOR: 14,
  UNMOVABLE: 8,
  VICIOUS: 6,
  CRUELTY: 8,
  AGGRESSION: 12,
  HELLRAISER: 10,
  TANK: 0,
};

const SPECIAL: Record<string, CardModel["special"]> = {
  DISMANTLE: "dismantle",
  BODY_SLAM: "body_slam",
  BULLY: "bully",
  MOLTEN_FIST: "molten_fist",
  WHIRLWIND: "whirlwind",
  SPITE: "spite",
  FEED: "feed",
};

function targetMode(targetType: string, template: string, requiresTarget: boolean): TargetMode {
  if (targetType === "AllEnemies" || template.includes("所有敌人") || /all enemies/i.test(template)) return "all";
  if (targetType === "RandomEnemy" || template.includes("随机对敌人") || /random enem/i.test(template)) return "random";
  if (requiresTarget || targetType === "AnyEnemy") return "single";
  if (targetType === "Self" || targetType === "AnyAlly") return "self";
  return "none";
}

export function modelHandCard(entry: unknown, fallbackIndex: number, knowledge: Knowledge): CardModel {
  const card = asRecord(entry);
  const cardId = str(card["card_id"]);
  const info = knowledge.card(cardId);
  const template = str(card["rules_text"]);
  const index = numOrNull(card["index"]) ?? fallbackIndex;
  const requiresTarget = bool(card["requires_target"]);
  const type = info?.type || "";
  const target = targetMode(str(card["target_type"]), template, requiresTarget);

  let damage = dyn(card, "CalculatedDamage") ?? dyn(card, "Damage");
  let hits = dyn(card, "CalculatedHits") ?? dyn(card, "Repeat") ?? 1;
  if (dyn(card, "Repeat") === null && /伤害两次|damage twice/i.test(template)) hits = 2;
  const block = dyn(card, "CalculatedBlock") ?? dyn(card, "Block") ?? 0;
  let vulnerable = dyn(card, "VulnerablePower") ?? 0;
  let weak = dyn(card, "WeakPower") ?? 0;
  let strength = dyn(card, "StrengthPower") ?? 0;
  let tempStrength = 0;
  const enemyStrength = dyn(card, "EnemyStrength") ?? 0;
  const enemyTempStrengthLoss = dyn(card, "StrengthLoss") ?? 0;
  const special = SPECIAL[cardId] ?? null;

  // Ambiguous or conditional vars, by id.
  switch (cardId) {
    case "UPPERCUT": {
      const amount = dyn(card, "Power") ?? 1;
      vulnerable = amount;
      weak = amount;
      break;
    }
    case "SETUP_STRIKE":
      tempStrength = strength;
      strength = 0;
      break;
    case "BLAZE": // gives Strength to another player
    case "DOMINATE": // Strength depends on stacks; modelled as the Vulnerable only
      strength = 0;
      break;
    case "SPITE": // repeats only if we lost HP this turn; the solver decides
      hits = 1;
      break;
    default:
      break;
  }
  if (special === "body_slam") damage = dyn(card, "CalculatedDamage") ?? 0;
  if (special === "whirlwind") hits = 0; // set to X at play time

  const hpLoss = dyn(card, "HpLoss") ?? 0;
  const energyGain = dyn(card, "Energy") ?? 0;
  const draw = dyn(card, "Cards") ?? 0;
  const keywords = info?.keywords ?? [];
  const exhausts = keywords.some((keyword) => /exhaust/i.test(keyword));

  const hasModelledEffect =
    damage !== null || block > 0 || vulnerable > 0 || weak > 0 || strength > 0 || tempStrength > 0 || energyGain > 0 || draw > 0;
  let flatValue = 0;
  let known = hasModelledEffect;
  if (type === "Power") {
    flatValue = POWER_VALUE[cardId] ?? 8;
    known = true;
  } else if (!hasModelledEffect) {
    // Unmodelled skill/attack (Havoc, Armaments' upgrade, …): a small nudge per energy.
    flatValue = 3 + 2 * Math.max(0, num(card["energy_cost"]));
  }

  // Status/curse cards that hurt at end of turn while held: read the number from the rendered text.
  const rendered = str(card["resolved_rules_text"]) || info?.description || "";
  const held = /回合结束时[^。]*手牌中[^。]*?(?:受到|失去)(\d+)点(?:伤害|生命)/.exec(rendered) ?? /at the end of your turn[^.]*in your hand[^.]*?(?:take|lose) (\d+)/i.exec(rendered);
  const heldPenalty = held ? Number(held[1]) : 0;
  if (heldPenalty > 0 && (type === "Status" || type === "Curse")) {
    // Its Damage var is the self-damage, not an attack.
    damage = null;
    known = true;
  }

  return {
    index,
    key: `c${index}`,
    cardId,
    name: str(card["name"], info?.name ?? cardId),
    type,
    upgraded: bool(card["upgraded"]),
    cost: num(card["energy_cost"]),
    xCost: bool(card["costs_x"]),
    playable: bool(card["playable"]),
    target,
    validTargets: asArray(card["valid_target_indices"]).map((value) => num(value)).filter((value) => Number.isFinite(value)),
    damage,
    hits: Math.max(0, Math.round(hits)),
    block,
    vulnerable,
    weak,
    strength,
    tempStrength,
    enemyStrength,
    enemyTempStrengthLoss,
    hpLoss,
    energyGain,
    draw,
    exhausts,
    special,
    known,
    flatValue,
    heldPenalty,
    text: str(card["resolved_rules_text"]) || info?.description || "",
  };
}

/**
 * Potions as zero-cost "cards" for the turn solver. The mod does not resolve potion numbers (the
 * description stays a template), so these are STS1-analogue ESTIMATES, to be calibrated from logs.
 * Unlisted potions are not modelled and stay with the model (Jev) on dangerous turns.
 */
const POTION_EFFECTS: Record<string, Partial<CardModel> & { target: TargetMode }> = {
  FIRE_POTION: { target: "single", damage: 20 },
  POTION_SHAPED_ROCK: { target: "single", damage: 10 }, // measured: 15 on a Vulnerable target
  EXPLOSIVE_AMPOULE: { target: "all", damage: 10 },
  BLOCK_POTION: { target: "self", block: 12 },
  STRENGTH_POTION: { target: "self", strength: 2 },
  FLEX_POTION: { target: "self", tempStrength: 5 },
  WEAK_POTION: { target: "single", weak: 3 },
  FEAR_POTION: { target: "single", vulnerable: 3 },
  FORTIFIER: { target: "self", special: "triple_block" },
  SPEED_POTION: { target: "self", special: "temp_dex" }, // +5 Dexterity this turn (STS1 value, estimate)
  LUCKY_TONIC: { target: "self", special: "buffer" }, // Buffer 1: the next HP loss is prevented
  VULNERABLE_POTION: { target: "single", vulnerable: 3 }, // STS2 id (FEAR_POTION is the STS1 name)
  POTION_OF_BINDING: { target: "all", weak: 1, vulnerable: 1 },
  SHIP_IN_A_BOTTLE: { target: "self", block: 10 },
  ENERGY_POTION: { target: "self", energyGain: 2 },
  SWIFT_POTION: { target: "self", draw: 3 },
  FYSH_OIL: { target: "self", strength: 1 },
};

export function isModelledPotion(potionId: string): boolean {
  return potionId in POTION_EFFECTS;
}

/** `slot` is the potion slot; the card index space is kept apart with 100 + slot. */
export function modelPotion(potionId: string, name: string, slot: number, validTargets: number[], useCost: number): CardModel | null {
  const effect = POTION_EFFECTS[potionId];
  if (!effect) return null;
  return {
    index: 100 + slot,
    key: `p${slot}`,
    cardId: `POTION:${potionId}:${slot}`,
    name: `potion ${name}`,
    type: "Potion",
    upgraded: false,
    cost: 0,
    xCost: false,
    playable: true,
    validTargets,
    damage: null,
    hits: 1,
    block: 0,
    vulnerable: 0,
    weak: 0,
    strength: 0,
    tempStrength: 0,
    enemyStrength: 0,
    enemyTempStrengthLoss: 0,
    hpLoss: 0,
    energyGain: 0,
    draw: 0,
    exhausts: true,
    special: null,
    known: true,
    flatValue: -useCost,
    heldPenalty: 0,
    text: "",
    ...effect,
  };
}
