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
  /** The card's printed base damage (dynamic Damage base_value): with Weak, the solver rounds once from it. */
  damageBase?: number;
  /** Dominate: Strength gained per Vulnerable on the target (after the card's own Vulnerable). */
  strengthPerVulnerable?: number;
  /** Strength the target enemy gains (Fight Me). */
  enemyStrength: number;
  /** Strength the target enemy loses for this turn only (Mangle): lowers its next attack. */
  enemyTempStrengthLoss: number;
  hpLoss: number;
  energyGain: number;
  /** Plating gained (Stone Armor): that much block at the end of this turn, and less each later turn. */
  plating?: number;
  draw: number;
  exhausts: boolean;
  /** Conditional behaviour the solver implements by id. */
  special: "dismantle" | "body_slam" | "bully" | "molten_fist" | "whirlwind" | "spite" | "feed" | "triple_block" | "temp_dex" | "buffer" | "duplicate_next" | "rupture" | "colossus" | "frantic_escape" | "crimson_mantle" | "triple_next_attack" | "free_card" | "dexterity" | "dominate" | "fiend_fire" | "ashwater" | "stomp" | "second_wind" | "intangible" | "upgrade_hand" | "clarity" | "ritual" | "plating" | "snecko" | null;
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
  /**
   * A potion that puts a card into the hand, free this turn (Attack/Skill/Power/Colorless Potion): the
   * card the solver may then play (GENERATED_CARD_POTIONS).
   */
  generates?: CardModel;
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

/** A dynamic value's base (before our Strength/Weak), or null. */
function dynBase(card: Record<string, unknown>, name: string): number | null {
  for (const entry of asArray(card["dynamic_values"])) {
    const value = asRecord(entry);
    if (str(value["name"]) === name) return numOrNull(value["base_value"]);
  }
  return null;
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
  FIEND_FIRE: "fiend_fire",
  STOMP: "stomp",
  // Apparition: Intangible for the enemy turn, every hit to 1 (1LJF F42 T6: two exhausted unplayed
  // on the wind-up turn, the Heavy Cleave 45 killed us next turn).
  APPARITION: "intangible",
  SECOND_WIND: "second_wind", // exhausts every non-Attack in hand, its Block per card (solver) // costs 1 less per Attack played this turn (the shown cost counts the ones before planning) // exhausts the hand, one hit per card exhausted (solver)
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

/**
 * Whether every sentence naming a card var (`Energy`, `Cards`) is a "next turn" one: Relax's 「下个回合，
 * 抽{Cards}张牌并获得{Energy}」 is next turn's income, not this turn's (FN0H F33 T2: "Relax, Bash+"
 * predicted 13 damage; Relax took all 3 energy, Bash+ was never paid for, 0 dealt).
 */
export function nextTurnOnly(template: string, varName: string): boolean {
  const nextTurn = /下个回合|下回合|next turn/i;
  const withVar = sentences(template.replace(new RegExp(`\\{${varName}[^}]*\\}`, "g"), "CARDVAR")).filter((sentence) => sentence.includes("CARDVAR"));
  return withVar.length > 0 && withVar.every((sentence) => nextTurn.test(sentence));
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
  // Relax's energy and draw are next turn's (nextTurnOnly), like a Power's income.
  const energyGain = type === "Power" || energyOnExhaustOnly(template, renderedText) || nextTurnOnly(template, "Energy") ? 0 : (dyn(card, "Energy") ?? 0);
  const draw = nextTurnOnly(template, "Cards") ? 0 : dyn(card, "Cards") ?? 0;
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
  } else if (!hasModelledEffect && type !== "Status" && type !== "Curse") {
    // Unmodelled skill/attack (Havoc, Armaments' upgrade, …): a small nudge per energy. Not a playable
    // Status: playing a Beckon is only worth its held penalty (VL2D F17 T9: +5 made it beat Burning Pact).
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
    // The Gambit is in the search now: the solver makes every later unblocked hit fatal and plays it
    // only when every other line dies (P78Z F17 T11: 3 HP, 17 block of 21, a 0-cost 50 block in hand).
    playable: bool(card["playable"]) || str(card["unplayable_reason"]) === "not_enough_energy",
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
    ...(dynBase(card, "Damage") !== null ? { damageBase: dynBase(card, "Damage")! } : {}),
    ...(cardId === "FEEL_NO_PAIN" ? { feelNoPain: dyn(card, "Power") ?? 3 } : {}),
    enemyStrength,
    enemyTempStrengthLoss,
    // Beckon's HpLoss var is what holding it costs, not a price for playing it (PU21: every Beckon
    // played was charged 6 HP by the solver).
    hpLoss: heldPenalty > 0 ? 0 : hpLoss,
    energyGain,
    plating: dyn(card, "PlatingPower") ?? 0,
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
    // Thrash: "消耗你的手牌中随机一张攻击牌" (MAHA F33 T7: played before Anger, which it ate; the boss
    // was left at 1/321).
    randomExhaust: /随机消耗|消耗[^。]*随机|exhausts? \d+ random|random card[^.]*exhaust/i.test(rendered),
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
  // Exhausts any cards in hand: Howl from Beyond (it then replays every turn) and junk (H14T F39 T4:
  // Ashwater -> Howl was the lethal at 2 HP; unmodelled, every line "died").
  ASHWATER: { target: "self", special: "ashwater" },
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
  // +1 energy now and +1 at the start of the next 3 turns (RADIANCE_POWER 3; states.jsonl 377J, JRSF:
  // energy 2 -> 3 on the drink, 4 of 3 on the next turns). Only this turn's energy is modelled, so the
  // solver drinks it on a turn that needs it (9V09 F33 T2: two Frantic Escapes and three attacks at 3
  // energy, Tincture carried to the death).
  RADIANT_TINCTURE: { target: "self", energyGain: 1 },
  SWIFT_POTION: { target: "self", draw: 3 },
  // Clarity: 「抽{Cards}张牌。在你的下{ClarityPower}个回合开始时，额外抽1张牌」. K7G9 F30 T7 (states.jsonl): hand
  // 3 -> 4 on the drink, CLARITY_POWER 3 after it. One card now; the three later draws are lasting value
  // (turn-solver CLARITY_LATER_DRAWS). Unmodelled, it was carried 35 floors in K7G9 (F1-F30, F39-F45).
  CLARITY: { target: "self", draw: 1, special: "clarity" },
  // Mazaleth's Gift: Ritual 1 (states.jsonl XMY2 F17 T9: RITUAL_POWER 1), +1 Strength at the end of
  // each of our turns: a small Demon Form (turn-solver RITUAL_VALUE). Unmodelled, it hung as a
  // "drink first" option from T1 to T9 of XMY2's act-1 boss.
  MAZALETHS_GIFT: { target: "self", special: "ritual" },
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
  // Every card in hand upgraded for the fight (upgradeCard): this turn's plays after it and the upgraded
  // cards' later draws (VUV4 F17: carried unmodelled, drunk at 0 energy on one Defend; T86W to the death).
  BLESSING_OF_THE_FORGE: { target: "self", special: "upgrade_hand" },
  // Heart of Iron: Plating 7 (states.jsonl, 20 drinks from 3MDJ to Z7D7: PLATING_POWER 7 each time,
  // not Metallicize): block at the end of this turn (turn-solver platingNow) and one less each later turn
  // (lasting value at Stone Armor's rate, PLATING_LASTING). Unmodelled, KGR6 carried it from F8 to the
  // F27 event that took it, through two 1-3 HP turns.
  HEART_OF_IRON: { target: "self", plating: 7, special: "plating" },
  // Snecko Oil: 「抽{Cards}张牌。在本回合随机化你手牌中所有牌的耗能」. Drawn 7 up to the 10-card hand (24DP
  // 2 -> 9, 24HM 3 -> 10; 5 -> 10 elsewhere), costs 0-3 at random (states.jsonl): the hand's costs at their
  // expected SNECKO_COST. Unmodelled, K8TC carried it from F6 into the act boss that killed it.
  SNECKO_OIL: { target: "self", draw: 7, special: "snecko" },
  // Pile-card potions: a card from a pile into the hand (modelPotion builds it from PotionContext).
  // Liquid Memories: 「将你弃牌堆中的一张牌放入你的手牌。这张牌在本回合可以免费打出」 (PWSD: carried F2-F23 T4).
  // Droplet of Precognition: 「选择你抽牌堆中的一张牌加入你的手牌」 at its own cost (EGX7: carried F7-F31).
  LIQUID_MEMORIES: { target: "self" },
  DROPLET_OF_PRECOGNITION: { target: "self" },
  // Card potions: drinking puts the card in hand (modelPotion builds it from GENERATED_CARD_POTIONS).
  ATTACK_POTION: { target: "self" },
  SKILL_POTION: { target: "self" },
  POWER_POTION: { target: "self" },
  COLORLESS_POTION: { target: "self" },
};

/**
 * The card a card potion adds (「从3张随机攻击牌中选择1张加入你的手牌。这张牌在本回合可以免费打出。」): a 0-cost
 * card of that type, at a conservative value for the best of three offered. Ironclad's pool (game
 * data, 36 attacks / 30 skills): best-of-3 total damage ~17-18.6, best-of-3 block ~8.3; picks logged
 * (selection/take into my hand): Bludgeon 32 (X8R8 F17 T11), Uppercut 13, Fight Me 10x2, Demon Form
 * (power, scored 39). Before this they were only a "drink first" option with no label, never code's
 * rank 1, and were carried to the death (X8R8 Attack Potion T1-T10, M9PL Skill Potion to T9).
 */
export const GENERATED_CARD_POTIONS: Record<string, { type: string; target: TargetMode; damage?: number; block?: number; flatValue?: number }> = {
  ATTACK_POTION: { type: "Attack", target: "single", damage: 14 },
  SKILL_POTION: { type: "Skill", target: "self", block: 7 },
  POWER_POTION: { type: "Power", target: "self", flatValue: 12 },
  COLORLESS_POTION: { type: "Skill", target: "self", flatValue: 8 },
};

/** What the drinker's board adds to a generated card: living enemy indices, Strength now, Weak. */
export interface PotionContext {
  enemyTargets: number[];
  strength: number;
  weak: boolean;
  /** The pile card a pile-card potion would take (pileCardPick), as a hand card (Strength and Weak in). */
  discardPick?: CardModel | null;
  drawPick?: CardModel | null;
}

/** Potions that take a card from a pile into the hand, and whether it is free this turn. */
export const PILE_CARD_POTIONS: Record<string, { pile: "discard" | "draw"; free: boolean }> = {
  LIQUID_MEMORIES: { pile: "discard", free: true },
  DROPLET_OF_PRECOGNITION: { pile: "draw", free: false },
};

/**
 * The pile card a pile-card potion takes: the best one this turn by thisTurnScore (the selection
 * screen's own rule), at cost 0 when the potion makes it free. null for an empty pile.
 */
export function pileCardPick(cards: CardModel[], incoming: number, enemies: number, free: boolean): CardModel | null {
  const playable = cards.filter((card) => card.playable && card.type !== "Status" && card.type !== "Curse" && card.cardId !== "THE_GAMBIT");
  if (playable.length === 0) return null;
  const scored = playable.map((card) => (free ? { ...card, cost: card.xCost ? card.cost : 0 } : card));
  return scored.reduce((best, card) => (thisTurnScore(card, incoming, enemies) > thisTurnScore(best, incoming, enemies) ? card : best));
}

/**
 * Upgrade deltas measured on hand cards in states.jsonl (same card, upgraded vs not: base values).
 * Cards not listed: +30% damage and block (at least +2), the median of the measured ones.
 */
const UPGRADE_DELTA: Record<string, { damage?: number; block?: number; hits?: number; vulnerable?: number; weak?: number; strength?: number; draw?: number; cost?: number }> = {
  STRIKE_IRONCLAD: { damage: 3 }, DEFEND_IRONCLAD: { block: 3 }, BASH: { damage: 2, vulnerable: 1 }, ANGER: { damage: 2 },
  BLOOD_WALL: { block: 4 }, BLUDGEON: { damage: 10 }, BREAKTHROUGH: { damage: 4 }, CINDER: { damage: 6 }, COLOSSUS: { block: 3 },
  CONFLAGRATION: { hits: 1 }, DISMANTLE: { damage: 2 }, EVIL_EYE: { block: 3 }, FEED: { damage: 2 }, FIEND_FIRE: { damage: 3 },
  FIGHT_ME: { damage: 1 }, FLAME_BARRIER: { block: 4 }, HEADBUTT: { damage: 3 }, HEMOKINESIS: { damage: 5 }, HOWL_FROM_BEYOND: { damage: 6 },
  IMPERVIOUS: { block: 10 }, MANGLE: { damage: 6 }, MOLTEN_FIST: { damage: 4 }, POMMEL_STRIKE: { damage: 1, draw: 1 }, SECOND_WIND: { block: 2 },
  SETUP_STRIKE: { damage: 2 }, SHRUG_IT_OFF: { block: 3 }, SPITE: { hits: 1 }, STOMP: { damage: 3 }, SWORD_BOOMERANG: { hits: 1 },
  TAUNT: { block: 1, vulnerable: 1 }, TEAR_ASUNDER: { damage: 2 }, THRASH: { damage: 2 }, THUNDERCLAP: { damage: 3 }, TRUE_GRIT: { block: 2 },
  TWIN_STRIKE: { damage: 2 }, ULTIMATE_STRIKE: { damage: 6 }, UNRELENTING: { damage: 6 }, UPPERCUT: { vulnerable: 1, weak: 1 }, WHIRLWIND: { damage: 3 },
  INFLAME: { strength: 1 }, BATTLE_TRANCE: { draw: 1 }, BURNING_PACT: { draw: 1 }, OFFERING: { draw: 2 },
  DARK_EMBRACE: { cost: 1 }, HELLRAISER: { cost: 1 }, STAMPEDE: { cost: 1 }, UNMOVABLE: { cost: 1 },
};

/** A hand card upgraded (Blessing of the Forge); an upgraded, Status or Curse card is returned as is. */
export function upgradeCard(card: CardModel): CardModel {
  if (card.upgraded || card.type === "Potion" || card.type === "Status" || card.type === "Curse") return card;
  const delta = UPGRADE_DELTA[card.cardId] ?? {
    damage: card.damage !== null && card.damage > 0 ? Math.max(2, Math.round(card.damage * 0.3)) : 0,
    block: card.block > 0 ? Math.max(2, Math.round(card.block * 0.3)) : 0,
  };
  return {
    ...card,
    upgraded: true,
    damage: card.damage === null ? null : card.damage + (delta.damage ?? 0),
    hits: card.hits + (delta.hits ?? 0),
    block: card.block > 0 ? card.block + (delta.block ?? 0) : card.block,
    vulnerable: card.vulnerable + (delta.vulnerable ?? 0),
    weak: card.weak + (delta.weak ?? 0),
    strength: card.strength + (card.strength > 0 ? delta.strength ?? 0 : 0),
    draw: card.draw + (card.draw > 0 ? delta.draw ?? 0 : 0),
    cost: card.xCost ? card.cost : Math.max(0, card.cost - (delta.cost ?? 0)),
  };
}

/** What an upgrade adds to one play of the card, in rough score points (damage, block, debuffs, draw). */
export function upgradeGain(before: CardModel, after: CardModel): number {
  const damage = (after.damage ?? 0) * Math.max(1, after.hits) - (before.damage ?? 0) * Math.max(1, before.hits);
  return damage + (after.block - before.block) + 2.5 * (after.vulnerable - before.vulnerable + after.weak - before.weak) + 5 * (after.strength - before.strength) + 2 * (after.draw - before.draw) + 3 * (before.cost - after.cost);
}

/**
 * What a card does this turn, in rough HP-equivalent points: damage (every enemy for AoE), block up
 * to the incoming attack (a little beyond), debuffs, Strength, draw and energy, a power's lasting
 * value, less its energy cost and HP cost.
 */
export function thisTurnScore(card: CardModel, incoming: number, enemies: number): number {
  // The Gambit: any unblocked attack kills us for the rest of the fight (S780: picked at 79/80 HP from a
  // Colorless Potion, died to a 9-damage hit). Never worth taking.
  if (card.cardId === "THE_GAMBIT") return -100;
  const damage = (card.damage ?? 0) * Math.max(1, card.hits) * (card.target === "all" ? enemies : 1);
  const block = Math.min(card.block, incoming) + 0.3 * Math.max(0, card.block - incoming);
  const score =
    damage +
    block +
    2.5 * Math.min(card.vulnerable, 3) +
    1.5 * Math.min(card.weak, 3) +
    5 * card.strength +
    2 * card.tempStrength +
    3 * card.draw +
    4 * card.energyGain +
    card.flatValue -
    2 * Math.max(0, card.cost) -
    card.hpLoss;
  return Math.round(score);
}

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

/** Self-buff specials whose effect does not depend on what was played before them. */
const ORDER_FREE_SPECIALS = new Set(["dexterity", "temp_dex", "buffer", "upgrade_hand", "ritual", "plating"]);

/**
 * A modelled potion that is never worse drunk before the turn's cards than after them: it targets no
 * enemy, draws or adds no card, and acts on no "next card" (Strength, Dexterity, Block, Energy, Flex,
 * Buffer, Blessing of the Forge). Fortifier (triples the block already gained), Duplicator,
 * Gigantification, Ashwater, draw and card potions keep their place.
 */
export function drinkFirstSafe(potionId: string): boolean {
  const effect = POTION_EFFECTS[potionId];
  if (!effect || effect.target !== "self" || potionId in GENERATED_CARD_POTIONS || potionId in PILE_CARD_POTIONS) return false;
  // Clarity draws one card: drunk first that card can still be played, and its later draws are the point.
  if ((effect.draw ?? 0) > 0) return effect.special === "clarity";
  return effect.special === undefined || effect.special === null || ORDER_FREE_SPECIALS.has(effect.special);
}

/**
 * `slot` is the potion slot; the card index space is kept apart with 100 + slot (200 + slot for the card
 * a card potion adds). `ctx` is the board a generated card is played on (targets, Strength, Weak).
 */
export function modelPotion(potionId: string, name: string, slot: number, validTargets: number[], useCost: number, ctx?: PotionContext): CardModel | null {
  const effect = POTION_EFFECTS[potionId];
  if (!effect) return null;
  const card = GENERATED_CARD_POTIONS[potionId];
  const pile = PILE_CARD_POTIONS[potionId];
  const pileCard = pile ? (pile.pile === "discard" ? ctx?.discardPick : ctx?.drawPick) ?? null : null;
  const generates: CardModel | undefined = pileCard
    ? { ...pileCard, index: 200 + slot, key: `g${slot}`, cardId: `GEN:${potionId}:${slot}`, name: `${pileCard.name} from ${name}`, playable: true }
    : card
    ? {
        index: 200 + slot,
        key: `g${slot}`,
        cardId: `GEN:${potionId}:${slot}`,
        name: `card from ${name}`,
        type: card.type,
        upgraded: false,
        cost: 0,
        xCost: false,
        playable: true,
        target: card.target,
        validTargets: card.target === "single" ? (ctx?.enemyTargets ?? validTargets) : [],
        // Like a hand card's shown number: current Strength in, Weak applied.
        damage: card.damage === undefined ? null : Math.floor((card.damage + (ctx?.strength ?? 0)) * (ctx?.weak ? 0.75 : 1)),
        hits: 1,
        block: card.block ?? 0,
        vulnerable: 0,
        weak: 0,
        strength: 0,
        tempStrength: 0,
        enemyStrength: 0,
        enemyTempStrengthLoss: 0,
        hpLoss: 0,
        energyGain: 0,
        draw: 0,
        exhausts: false,
        special: null,
        known: true,
        flatValue: card.flatValue ?? 0,
        heldPenalty: 0,
        text: "",
      }
    : undefined;
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
    ...(generates ? { generates } : {}),
  };
}

/** A plan step that plays the card a card potion added (not a hand card: nothing to click until drunk). */
export function isGeneratedStep(cardId: string): boolean {
  return cardId.startsWith("GEN:");
}
