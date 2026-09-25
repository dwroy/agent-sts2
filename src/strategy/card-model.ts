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
  /**
   * Weak is applied before Vulnerable (card-text order: Uppercut "给予1层虚弱。给予1层易伤。"). Matters
   * against Artifact, which blocks whichever lands first (UJS25 F28: Chomper's Artifact 1 ate the Weak).
   */
  weakFirst?: boolean;
  /** Permanent Strength for the player. */
  strength: number;
  /** Strength that only lasts this turn (Setup Strike). */
  tempStrength: number;
  /** Feel No Pain played: Block per card exhausted from then on this turn. */
  feelNoPain?: number;
  /** Dominate: Strength gained per Vulnerable on the target (after the card's own Vulnerable). */
  strengthPerVulnerable?: number;
  /** Strength the target enemy gains (Fight Me). */
  enemyStrength: number;
  /** Strength the target enemy loses for this turn only (Mangle): lowers its next attack. */
  enemyTempStrengthLoss: number;
  hpLoss: number;
  energyGain: number;
  draw: number;
  exhausts: boolean;
  /** Conditional behaviour the solver implements by id. */
  special: "dismantle" | "body_slam" | "bully" | "molten_fist" | "whirlwind" | "spite" | "feed" | "triple_block" | "temp_dex" | "buffer" | "duplicate_next" | "rupture" | "colossus" | "frantic_escape" | "crimson_mantle" | "triple_next_attack" | "free_card" | "dexterity" | "dominate" | "fiend_fire" | null;
  /** False when the effect could not be modelled; the solver then uses `flatValue` only. */
  known: boolean;
  /** Heuristic value for effects that pay off later (powers, draw is valued separately). */
  flatValue: number;
  /** HP lost at end of turn if this card is still in hand (Toxic, Burn, Decay, …). */
  heldPenalty: number;
  /** Part of heldPenalty that is HP loss ("失去N点生命", Beckon): block does not stop it. */
  heldHpLoss?: number;
  /** Flame Barrier: damage dealt back to the attacker per enemy hit this turn. */
  retaliate?: number;
  /** Damage to every enemy some turns later (The Bomb: 40 after 3 turns); scored, not simulated. */
  delayedDamage?: number;
  /**
   * Inferno: the power's amount. Every HP loss on our turn (its own 1 at the start of each turn, a
   * Bloodletting, Thorns) deals this much to every enemy.
   */
  inferno?: number;
  /** Demise applied to the target: it loses this much HP at the end of each of its turns (a debuff). */
  demise?: number;
  /**
   * Soulbound (the Queen's Chains of Binding: the first 3 cards drawn each turn): once one Soulbound
   * card is played, the others cannot be played this turn (88HN: blocked_by_hook in states.jsonl).
   */
  soulbound?: boolean;
  /**
   * Puts a card on top of the draw pile (Headbutt: from the discard pile). A draw later in the same
   * turn takes that card back into hand (XPA4 T11: Headbutt put Shrug It Off+ on top for next turn, then
   * Pommel Strike drew it and it was discarded unplayed).
   */
  putsOnTop?: boolean;
  /** Draws an unknown number of cards (Pillage: until a non-Attack); `draw` stays 0. */
  drawsUntil?: boolean;
  /**
   * Exhausts a random card from the hand (True Grit, Ember): a card planned after it may be the one
   * that goes (PU21 F33 T8: Bash, True Grit, Anger planned 27 damage, Anger was exhausted, 11 dealt).
   */
  randomExhaust?: boolean;
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
 * Vigor (VIGOR_POWER, Akabeko 8): the mod adds it to every Attack's shown damage, per hit (Strike 14,
 * Sword Boomerang 11x3), but the game spends it on the first Attack played (KFP1 F17 T1: Bash+ and
 * Sword Boomerang predicted 54 into the sleeping Matriarch, dealt 18, and the waking line won). Taken
 * off every Attack here; the solver adds it back once (PlayerSim.vigor). Under Weak the shown number
 * carries it at 0.75.
 */
export function stripVigor(hand: CardModel[], vigor: number, weak: boolean): void {
  if (vigor <= 0) return;
  const shown = Math.floor(vigor * (weak ? 0.75 : 1));
  for (const card of hand) {
    if (card.type === "Attack" && card.damage !== null) card.damage = Math.max(0, card.damage - shown);
  }
}

/**
 * Rough value of a Power card's lasting effect, in "HP-equivalent" points, for a fight of average
 * length. Only used to rank it against immediate damage/block; tuned from run logs.
 */
const POWER_VALUE: Record<string, number> = {
  DEMON_FORM: 30,
  // 5 to every enemy at the start of each turn, +5 each time (5+10+15+20 over four turns); B6AC F33:
  // at the default 8 it was never played, not even on the Knowledge Demon's 0-damage curse turn.
  ROLLING_BOULDER: 26,
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
  RUPTURE: "rupture",
  COLOSSUS: "colossus",
  FIEND_FIRE: "fiend_fire", // exhausts the hand, one hit per card exhausted (solver)
  DOMINATE: "dominate", // Strength per Vulnerable on the target, after its own Vulnerable (solver)
  FRANTIC_ESCAPE: "frantic_escape", // The Insatiable: +1 Sandpit (the solver scores the countdown)
  CRIMSON_MANTLE: "crimson_mantle", // 1 HP at the start of every turn (the solver checks it can afford it)
};

function targetMode(targetType: string, template: string, requiresTarget: boolean): TargetMode {
  if (targetType === "AllEnemies" || template.includes("所有敌人") || /all enemies/i.test(template)) return "all";
  if (targetType === "RandomEnemy" || template.includes("随机对敌人") || /random enem/i.test(template)) return "random";
  if (requiresTarget || targetType === "AnyEnemy") return "single";
  if (targetType === "Self" || targetType === "AnyAlly") return "self";
  return "none";
}

/**
 * What holding a status/curse at the end of the turn costs, read from its rendered text: Burn "受到N点
 * 伤害" meets block, Beckon "失去N点生命" does not (WX16, BG4W: Soul Fysh's Beckon planned as blockable,
 * died at 8 HP). Also used for draw-pile lines (agent_view), which carry the same text.
 */
export function heldPenaltyOf(rendered: string): { heldPenalty: number; heldHpLoss: number } {
  const held = /回合结束时[^。]*手牌中[^。]*?(?:受到|失去)(\d+)点(?:伤害|生命)/.exec(rendered) ?? /at the end of your turn[^.]*in your hand[^.]*?(?:take|lose) (\d+)/i.exec(rendered);
  const heldPenalty = held ? Number(held[1]) : 0;
  const heldHpLoss = held && /失去\d+点生命|lose \d+ hp/i.test(held[0]) ? heldPenalty : 0;
  return { heldPenalty, heldHpLoss };
}

/** Whether the card text names Weak before Vulnerable (the game applies them in text order). */
export function debuffWeakFirst(text: string): boolean {
  const find = (patterns: RegExp[]): number => {
    const positions = patterns.map((pattern) => text.search(pattern)).filter((position) => position >= 0);
    return positions.length > 0 ? Math.min(...positions) : -1;
  };
  const weakAt = find([/虚弱/, /WeakPower/, /\bweak\b/i]);
  const vulnerableAt = find([/易伤/, /VulnerablePower/, /\bvulnerable\b/i]);
  return weakAt >= 0 && (vulnerableAt < 0 || weakAt < vulnerableAt);
}

function sentences(text: string): string[] {
  return text
    .replace(/\[[^\]]*\]/g, "")
    .split(/[。.\n]/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

/**
 * HP lost for playing the card, read from a standalone "失去N点生命。" / "Lose N HP." sentence (an
 * enchant's added cost). Held-penalty text ("回合结束时…手牌中…失去") and triggered clauses are not it.
 */
export function playHpLossOf(rendered: string): number {
  if (heldPenaltyOf(rendered).heldPenalty > 0) return 0;
  let total = 0;
  for (const sentence of sentences(rendered)) {
    const match = /^(?:你)?失去(\d+)点生命$/.exec(sentence) ?? /^lose (\d+) hp$/i.exec(sentence);
    if (match) total += Number(match[1]);
  }
  return total;
}

/** Whether the card's Energy is only gained when it is exhausted (Drum of Battle), not on play. */
export function energyOnExhaustOnly(template: string, rendered: string): boolean {
  const exhaustClause = /被消耗时|when (?:this card is )?exhausted/i;
  const withVar = sentences(template.replace(/\{Energy[^}]*\}/g, "ENERGYVAR")).filter((sentence) => sentence.includes("ENERGYVAR"));
  if (withVar.length > 0) return withVar.every((sentence) => exhaustClause.test(sentence));
  const energySentences = sentences(rendered).filter((sentence) => /能量|energy/i.test(sentence));
  return energySentences.length > 0 && energySentences.every((sentence) => exhaustClause.test(sentence));
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
  let strengthPerVulnerable = 0;
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
    case "RUPTURE": // Strength comes later, per HP loss on our turn (solver), not on play
      strength = 0;
      break;
    case "BLAZE": // gives Strength to another player
      strength = 0;
      break;
    case "DOMINATE": // Strength per Vulnerable on the target: the solver counts it at play time
      strengthPerVulnerable = dyn(card, "StrengthPerVulnerable") ?? 1;
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

  // Enchants (VC4L: Corrupted Bash, "…失去2点生命。") add a self-damage sentence with no HpLoss var.
  const renderedText = str(card["resolved_rules_text"]) || info?.description || "";
  const hpLoss = dyn(card, "HpLoss") ?? (type === "Power" ? 0 : playHpLossOf(renderedText));
  // A Power's Energy var is per-turn income from next turn on (Pyre), not energy this turn (24DP);
  // Drum of Battle's is gained when the card is exhausted, not on play (VC4L F21 T4).
  const energyGain = type === "Power" || energyOnExhaustOnly(template, renderedText) ? 0 : (dyn(card, "Energy") ?? 0);
  const draw = dyn(card, "Cards") ?? 0;
  const keywords = info?.keywords ?? [];
  const exhausts = keywords.some((keyword) => /exhaust/i.test(keyword));

  // The Bomb (1ZQJ: in hand four turns, never played, scored 0 as unmodelled): 40 to every enemy at
  // the end of the 3rd turn.
  const delayedDamage = cardId === "THE_BOMB" ? dyn(card, "BombDamage") ?? 40 : 0;
  const hasModelledEffect =
    damage !== null || block > 0 || vulnerable > 0 || weak > 0 || strength > 0 || tempStrength > 0 || energyGain > 0 || draw > 0 || delayedDamage > 0;
  let flatValue = 0;
  let known = hasModelledEffect;
  if (type === "Power") {
    flatValue = POWER_VALUE[cardId] ?? 8;
    known = true;
  } else if (special === "frantic_escape") {
    known = true; // its whole value is the Sandpit count, scored by the solver
  } else if (!hasModelledEffect) {
    // Unmodelled skill/attack (Havoc, Armaments' upgrade, …): a small nudge per energy.
    flatValue = 3 + 2 * Math.max(0, num(card["energy_cost"]));
  }

  // Status/curse cards that hurt at end of turn while held: read the number from the rendered text.
  const rendered = renderedText;
  const weakFirst = weak > 0 && vulnerable > 0 && debuffWeakFirst(rendered || template);
  const { heldPenalty, heldHpLoss } = heldPenaltyOf(rendered);
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
    // Too expensive now is still in the search (it checks energy itself): energy gained this turn, or a
    // Touch of Insanity making it free, can pay for it.
    // The Gambit is never played: after it any unblocked hit is fatal (S780).
    playable: str(card["card_id"]) !== "THE_GAMBIT" && (bool(card["playable"]) || str(card["unplayable_reason"]) === "not_enough_energy"),
    target,
    validTargets: asArray(card["valid_target_indices"]).map((value) => num(value)).filter((value) => Number.isFinite(value)),
    damage,
    hits: Math.max(0, Math.round(hits)),
    block,
    vulnerable,
    weak,
    ...(weakFirst ? { weakFirst } : {}),
    strength,
    tempStrength,
    ...(strengthPerVulnerable > 0 ? { strengthPerVulnerable } : {}),
    ...(cardId === "FEEL_NO_PAIN" ? { feelNoPain: dyn(card, "Power") ?? 3 } : {}),
    enemyStrength,
    enemyTempStrengthLoss,
    // Beckon's HpLoss var is what holding it costs, not a price for playing it (PU21: every Beckon
    // played was charged 6 HP by the solver).
    hpLoss: heldPenalty > 0 ? 0 : hpLoss,
    energyGain,
    draw,
    exhausts,
    special,
    known,
    flatValue,
    heldPenalty,
    heldHpLoss,
    retaliate: dyn(card, "DamageBack") ?? 0,
    delayedDamage,
    inferno: cardId === "INFERNO" ? dyn(card, "InfernoPower") ?? 6 : 0,
    soulbound: /(^|\s)魂缚(\s|。|$)|\bSoulbound\b/i.test(rendered),
    putsOnTop: /放到(?:你的)?抽牌堆(?:的)?顶部?|on top of your draw pile/i.test(rendered),
    drawsUntil: /抽牌直到|draw cards? until/i.test(rendered),
    randomExhaust: /随机消耗|exhausts? \d+ random|random card[^.]*exhaust/i.test(rendered),
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
  LUCKY_TONIC: { target: "self", special: "buffer" },
  DUPLICATOR: { target: "self", special: "duplicate_next" }, // the next card is played twice // Buffer 1: the next HP loss is prevented
  VULNERABLE_POTION: { target: "single", vulnerable: 3 }, // STS2 id (FEAR_POTION is the STS1 name)
  POTION_OF_BINDING: { target: "all", weak: 1, vulnerable: 1 },
  SHIP_IN_A_BOTTLE: { target: "self", block: 10 },
  ENERGY_POTION: { target: "self", energyGain: 2 },
  SWIFT_POTION: { target: "self", draw: 3 },
  FYSH_OIL: { target: "self", strength: 1 },
  // Debuff: Artifact negates it like any other (TQX5 T1: drunk into Artifact 3, nothing landed).
  // Demise 9 measured (states.jsonl DEMISE_POWER amount 9).
  POWDERED_DEMISE: { target: "single", demise: 9 },
  // The next Attack deals triple damage (PLC F33: kept from T1 to death with Bludgeon in hand).
  GIGANTIFICATION_POTION: { target: "self", special: "triple_next_attack" },
  // A card in hand costs 0 for the rest of the combat, chosen on a combat_hand_select screen ("选择一张
  // 牌使其免费"). G8AQ T3: made Bludgeon+ free would have been lethal; spent on a 1-cost card instead.
  TOUCH_OF_INSANITY: { target: "self", special: "free_card" },
  // +2 Dexterity for the fight (DEXTERITY_POWER 2 in states.jsonl). Worth only the block cards it
  // raises: KFP1 T3 and 2WUM F33 T3 drank it with no block card left to play, 0 gained that turn.
  DEXTERITY_POTION: { target: "self", special: "dexterity" },
};

/** Touch of Insanity is only worth drinking for a card costing at least this much. */
export const FREE_CARD_MIN_COST = 2;

/**
 * The card Touch of Insanity should make free: the most expensive real card (2+ energy, not X-cost,
 * not a Status/Curse), ties broken by what it does. The solver and the selection screen use the same
 * rule, so the plan the solver scored is the one played. null when no card is worth it.
 */
export function freeCardPick<T extends CardModel>(cards: T[]): T | null {
  const worth = (card: CardModel): number => (card.damage ?? 0) * Math.max(1, card.hits) + card.block + card.flatValue + 5 * card.strength;
  const eligible = cards.filter((card) => card.type !== "Potion" && card.type !== "Status" && card.type !== "Curse" && !card.xCost && card.cost >= FREE_CARD_MIN_COST);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, card) => (card.cost > best.cost || (card.cost === best.cost && worth(card) > worth(best)) ? card : best));
}

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
