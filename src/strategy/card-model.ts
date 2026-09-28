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
  /** Regen gained (Regen Potion): that much HP at the end of this turn, one less each later turn. */
  regen?: number;
  /**
   * Distilled Chaos: plays this many cards from the top of the draw pile, each the pile's expected card
   * (`generates`, never put in the hand).
   */
  playsTop?: number;
  draw: number;
  exhausts: boolean;
  /** Conditional behaviour the solver implements by id. */
  special: "dismantle" | "body_slam" | "bully" | "molten_fist" | "whirlwind" | "spite" | "feed" | "triple_block" | "double_block" | "temp_dex" | "buffer" | "duplicate_next" | "rupture" | "colossus" | "frantic_escape" | "crimson_mantle" | "triple_next_attack" | "free_card" | "dexterity" | "dominate" | "fiend_fire" | "ashwater" | "stomp" | "second_wind" | "intangible" | "clarity" | "ritual" | "plating" | "snecko" | "heal" | "gamble" | "regen" | "chaos" | "glowwater" | "bottled" | null;
  /** False when the effect could not be modelled; the solver then uses `flatValue` only. */
  known: boolean;
  /** Heuristic value for effects that pay off later (powers, draw is valued separately). */
  flatValue: number;
  /** HP lost at end of turn if this card is still in hand (Toxic, Burn, Decay, …). */
  heldPenalty: number;
  /** Part of heldPenalty that is HP loss ("失去N点生命", Beckon): block does not stop it. */
  heldHpLoss?: number;
  /** Damage the card (Foul Potion) deals to us when played: our block takes it first, the rest is HP lost. */
  selfDamage?: number;
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
   * A potion that puts a card into the hand, free this turn (Attack/Skill/Power/Colorless Potion), or the
   * pile card a pile-card potion takes, or the draw pile's expected card (Gambler's Brew, Glowwater,
   * Distilled Chaos): the card the solver may then play.
   */
  generates?: CardModel;
  /** Gambler's Brew, one way to drink it: the keys of the hand cards it discards (turn-solver "gamble"). */
  discards?: string[];
  /**
   * One Monte Carlo sample of a random potion (potion-mc.ts). `choices`: the cards offered, one taken
   * (Attack Potion's 3 random Attacks; the solver tries each as `generates`). `drawn`: the cards drawn,
   * in the order of a sampled pile (Swift Potion, Snecko Oil, Gambler's Brew, Glowwater, Distilled Chaos,
   * Bottled Potential). `adds`: cards put straight into the hand (Orobic Acid). `sneckoCosts`: Snecko
   * Oil's random cost for each card in hand after the drink, by card key.
   */
  choices?: CardModel[];
  drawn?: CardModel[];
  adds?: CardModel[];
  sneckoCosts?: Record<string, number>;
  /** Demise applied to the target: it loses this much HP at the end of each of its turns (a debuff). */
  demise?: number;
  /** Shrink applied to the target for this many turns: its attacks deal SHRINK_DAMAGE_FACTOR (Beetle Juice). */
  shrink?: number;
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
  // Entrench: doubles the block up when it is played (0 block: worth 0; RTF3 F17/F28).
  ENTRENCH: "double_block",
  MOLTEN_FIST: "molten_fist",
  WHIRLWIND: "whirlwind",
  // Volley: X hits at random enemies (LXB3 F33 T3: counted as one 10-damage hit at X=0, dealt 0).
  VOLLEY: "whirlwind",
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

/**
 * Whether every sentence naming a card var is a "at the start of your turn" one: Demon Form's Strength
 * comes each later turn, not on play.
 */
export function turnStartOnly(template: string, varName: string): boolean {
  const turnStart = /回合开始时|start of (?:your|each) turn/i;
  const withVar = sentences(template.replace(new RegExp(`\\{${varName}[^}]*\\}`, "g"), "CARDVAR")).filter((sentence) => sentence.includes("CARDVAR"));
  return withVar.length > 0 && withVar.every((sentence) => turnStart.test(sentence));
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
  // Strength that starts next turn (Demon Form: 「在你的回合开始时，获得{StrengthPower}点力量」) is none this
  // turn: its value is the power's lasting value (G8YY F30 T2: +3 counted into Squash and Strike, "kills
  // the Rock" for 19; it took 13).
  if (strength > 0 && turnStartOnly(template, "StrengthPower")) strength = 0;
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
  } else if (special === "frantic_escape" || special === "double_block") {
    known = true; // its whole value is the Sandpit count / the block doubled, scored by the solver
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
 * Unlisted potions are not simulated: Jev is offered "drink first, then re-plan" under T1 (combat-plan).
 * The random potions (CHOICE_POTIONS, DRAW_POTIONS) are listed with their expected-value models here for
 * the rollout's later turns; this turn they are simulated by Monte Carlo (potion-mc.ts).
 */
const POTION_EFFECTS: Record<string, Partial<CardModel> & { target: TargetMode }> = {
  FIRE_POTION: { target: "single", damage: 20 },
  // Foul Potion: 「对所有玩家和敌人造成{Damage}点伤害」, Damage 12 (potion-values.ts). It hits us too
  // (39J9: two drunk at 22 HP): the line's hp_lost carries it (turn-solver selfDamage, through our block).
  FOUL_POTION: { target: "all", damage: 12, selfDamage: 12 },
  // Exhausts any cards in hand: Howl from Beyond (it then replays every turn) and junk (H14T F39 T4:
  // Ashwater -> Howl was the lethal at 2 HP; unmodelled, every line "died").
  ASHWATER: { target: "self", special: "ashwater" },
  // 15 measured (states.jsonl V5S6 F12/F14, 2WUM, W6F4: 26 -> 11, 18 -> 3; potion damage ignores Vulnerable).
  POTION_SHAPED_ROCK: { target: "single", damage: 15 },
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
  // Beetle Juice: 「敌人的攻击在下{Repeat}个回合中造成的伤害减少{DamageDecrease}%」 = SHRINK_POWER 4 on the target,
  // its attacks 30% less (states.jsonl: intents 23 -> 16, 20 -> 14, 14 -> 9; potion-values.ts). Unmodelled,
  // W8JD carried it from F29 to the 1-HP turn of F31 ("its effect is in no line's numbers").
  BEETLE_JUICE: { target: "single", shrink: 4 },
  // The next Attack deals triple damage (PLC F33: kept from T1 to death with Bludgeon in hand).
  GIGANTIFICATION_POTION: { target: "self", special: "triple_next_attack" },
  // A card in hand costs 0 for the rest of the combat, chosen on a combat_hand_select screen ("选择一张
  // 牌使其免费"). G8AQ T3: made Bludgeon+ free would have been lethal; spent on a 1-cost card instead.
  TOUCH_OF_INSANITY: { target: "self", special: "free_card" },
  // +2 Dexterity for the fight (DEXTERITY_POWER 2 in states.jsonl). Worth only the block cards it
  // raises: KFP1 T3 and 2WUM F33 T3 drank it with no block card left to play, 0 gained that turn.
  DEXTERITY_POTION: { target: "self", special: "dexterity" },
  // Heart of Iron: Plating 7 (states.jsonl, 20 drinks from 3MDJ to Z7D7: PLATING_POWER 7 each time,
  // not Metallicize): block at the end of this turn (turn-solver platingNow) and one less each later turn
  // (lasting value at Stone Armor's rate, PLATING_LASTING). Unmodelled, KGR6 carried it from F8 to the
  // F27 event that took it, through two 1-3 HP turns.
  HEART_OF_IRON: { target: "self", plating: 7, special: "plating" },
  // Snecko Oil: 「抽{Cards}张牌。在本回合随机化你手牌中所有牌的耗能」. Drawn 7 up to the 10-card hand (24DP
  // 2 -> 9, 24HM 3 -> 10; 5 -> 10 elsewhere), costs 0-3 at random (states.jsonl): the hand's costs at their
  // expected SNECKO_COST. Unmodelled, K8TC carried it from F6 into the act boss that killed it.
  SNECKO_OIL: { target: "self", draw: 7, special: "snecko" },
  // Blood Potion: heals 20% of max HP (RVL2 F30: 25 -> 39 at 74 max; EN55 F8 T9: 7 -> 23 at 80). The
  // turn's HP loss is net of it (turn-solver BLOOD_POTION_HEAL). Unmodelled it stayed "its effect is in no
  // line's numbers" from T1 to the 7-HP turn of EN55's fatal elite.
  BLOOD_POTION: { target: "self", special: "heal" },
  // Gambler's Brew: 「丢弃任意张牌，然后抽相同数量的牌。」 Every hand card worse than an average draw is
  // discarded for one (turn-solver "gamble"; the expected draw from the draw pile: expectedDraw). 77UJ
  // F33 T5 and EN55 F8 T9: carried unmodelled to the death, each time a draw of the pile's block cards
  // would likely have lived.
  GAMBLERS_BREW: { target: "self", special: "gamble" },
  // Glowwater: 「消耗你的手牌。抽{Cards}张牌。」 the hand exhausted, then a new hand of the pile's expected
  // cards (turn-solver "glowwater"; logged drinks: 5 -> 10 cards, 3 -> 10).
  GLOWWATER_POTION: { target: "self", special: "glowwater" },
  // Regen Potion: 「获得{RegenPower}层再生」, REGEN_POWER 5 on the drink (states.jsonl PKB0 F17 T8); Regen heals
  // its amount at the end of our turn, before the enemy attacks, then drops by 1 (5+4+3+2+1 = 15 over five
  // turns). This turn's 5 is in the line's HP; the later heals are lasting value (turn-solver
  // REGEN_LATER_SHARE). Unmodelled, PKB0 F17 T4 read "its effect is in no line's numbers" at 15/80.
  REGEN_POTION: { target: "self", special: "regen", regen: 5 },
  // Distilled Chaos: 「打出你抽牌堆顶部的{Repeat}张牌」, 3 cards (YG3H F33 T7: the draw pile 21 -> 18 on the drink,
  // Strike + 2 Defend played). Each is the draw pile's expected card (expectedDraw), played for free at a
  // random enemy (turn-solver "chaos"). Unmodelled, YG3H carried it F1-F33 as "neutral: unclassified".
  DISTILLED_CHAOS: { target: "self", special: "chaos", playsTop: 3 },
  // Pile-card potions: a card from a pile into the hand (modelPotion builds it from PotionContext).
  // Liquid Memories: 「将你弃牌堆中的一张牌放入你的手牌。这张牌在本回合可以免费打出」 (PWSD: carried F2-F23 T4).
  // Droplet of Precognition: 「选择你抽牌堆中的一张牌加入你的手牌」 at its own cost (EGX7: carried F7-F31).
  LIQUID_MEMORIES: { target: "self" },
  DROPLET_OF_PRECOGNITION: { target: "self" },
  // Cure All: 「获得{Energy}。抽{Cards}张牌。」 Energy 1, draw 2 (potion-values.ts).
  CURE_ALL: { target: "self", energyGain: 1, draw: 2 },
  // Bottled Potential: 「将你的所有牌洗入你的抽牌堆。抽{Cards}张牌。」 the hand goes back into the pile (not
  // exhausted), then 5 cards (turn-solver "bottled"; priced like Glowwater's draw: expectedDraw).
  BOTTLED_POTENTIAL: { target: "self", special: "bottled" },
  // Card potions: drinking puts the card in hand (modelPotion builds it from GENERATED_CARD_POTIONS).
  ATTACK_POTION: { target: "self" },
  SKILL_POTION: { target: "self" },
  POWER_POTION: { target: "self" },
  COLORLESS_POTION: { target: "self" },
};

/**
 * The card a card potion adds (「从3张随机攻击牌中选择1张加入你的手牌。这张牌在本回合可以免费打出。」): a 0-cost
 * card of that type, at a conservative value for the best of three offered. Since the Monte Carlo
 * (potion-mc.ts, Dai 2026-09-28) this turn's option never uses it: only the rollout's later turns (the
 * potions still held, at their expected value) and the solver-level tests do. Ironclad's pool (game
 * data, 36 attacks / 30 skills): best-of-3 total damage ~17-18.6, best-of-3 block ~8.3; picks logged
 * (selection/take into my hand): Bludgeon 32 (X8R8 F17 T11), Uppercut 13, Fight Me 10x2, Demon Form
 * (power, scored 39). Before this they were only a "drink first" option with no numbers (X8R8 Attack
 * Potion T1-T10, M9PL Skill Potion to T9).
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
  /** Gambler's Brew, Glowwater and Distilled Chaos: the draw pile's average card (expectedDraw). */
  expectedDraw?: CardModel | null;
}

/**
 * The expected card of a draw from these pile cards, as one hand card: the pile's mean damage, block,
 * Vulnerable and Weak (unplayable cards count as nothing), rounded, at its mean cost rounded. An
 * expected-value model: Gambler's Brew, Glowwater and Distilled Chaos draws are priced by it. null for
 * an empty pile.
 */
export function expectedDraw(pile: CardModel[], slot: number): CardModel | null {
  if (pile.length === 0) return null;
  const n = pile.length;
  const played = pile.filter((card) => card.playable && card.type !== "Status" && card.type !== "Curse");
  const mean = (value: (card: CardModel) => number) => played.reduce((sum, card) => sum + value(card), 0) / n;
  const damage = mean((card) => (card.damage ?? 0) * Math.max(1, card.hits));
  const targets = played.find((card) => card.target === "single")?.validTargets ?? [];
  return {
    index: 200 + slot,
    key: `g${slot}`,
    cardId: `GEN:GAMBLERS_BREW:${slot}`,
    name: "an average draw",
    type: Math.round(damage) > 0 ? "Attack" : "Skill",
    upgraded: false,
    cost: Math.round(played.length > 0 ? played.reduce((sum, card) => sum + Math.max(0, card.cost), 0) / played.length : 1),
    xCost: false,
    playable: true,
    target: Math.round(damage) > 0 && targets.length > 0 ? "single" : "self",
    validTargets: Math.round(damage) > 0 ? targets : [],
    damage: Math.round(damage) > 0 ? Math.round(damage) : null,
    hits: 1,
    block: Math.round(mean((card) => card.block)),
    vulnerable: Math.round(mean((card) => card.vulnerable)),
    weak: Math.round(mean((card) => card.weak)),
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
    flatValue: 0,
    heldPenalty: 0,
    text: "",
  };
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
export function pileCardPick(cards: CardModel[], incoming: number, enemies: number, free: boolean, board: ThisTurnBoard = {}): CardModel | null {
  const playable = cards.filter((card) => card.playable && card.type !== "Status" && card.type !== "Curse" && card.cardId !== "THE_GAMBIT");
  if (playable.length === 0) return null;
  const scored = playable.map((card) => (free ? { ...card, cost: card.xCost ? card.cost : 0 } : card));
  return scored.reduce((best, card) => (thisTurnScore(card, incoming, enemies, board) > thisTurnScore(best, incoming, enemies, board) ? card : best));
}

/**
 * What a card does this turn, in rough HP-equivalent points: damage (every enemy for AoE), block up
 * to the incoming attack (a little beyond), debuffs, Strength, draw and energy, a power's lasting
 * value, less its energy cost and HP cost.
 */
export function thisTurnScore(card: CardModel, incoming: number, enemies: number, board: ThisTurnBoard = {}): number {
  // The Gambit: any unblocked attack kills us for the rest of the fight (S780: picked at 79/80 HP from a
  // Colorless Potion, died to a 9-damage hit). Never worth taking.
  if (card.cardId === "THE_GAMBIT") return -100;
  const damage = thisTurnDamage(card, board) * Math.max(1, card.hits) * (card.target === "all" ? enemies : 1);
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


/** What the board lets a card deal this turn (thisTurnScore). */
export interface ThisTurnBoard {
  /**
   * Cards the exhaust pile can hold this turn: its size now plus the exhausting cards in hand. Pact's
   * End needs 3 (the solver's PACTS_END_EXHAUST); below that it deals nothing (9LSQ F17 T1, H1FA twice:
   * an Attack Potion took it over Fight Me with the exhaust pile empty, and it sat in hand).
   */
  exhaustReach?: number;
  /** Most Vulnerable on a living enemy: Bully deals 2 more per stack. */
  vulnerable?: number;
}

/** Cards Pact's End needs in the exhaust pile (turn-solver PACTS_END_EXHAUST). */
const PACTS_END_CARDS = 3;
/** Bully: extra damage per Vulnerable stack on its target (as in the solver). */
const BULLY_PER_VULNERABLE = 2;

/** A card's damage per hit this turn on this board. */
export function thisTurnDamage(card: CardModel, board: ThisTurnBoard = {}): number {
  if (card.cardId === "PACTS_END" && board.exhaustReach !== undefined && board.exhaustReach < PACTS_END_CARDS) return 0;
  if (card.cardId === "BULLY") return (card.damage ?? 0) + BULLY_PER_VULNERABLE * (board.vulnerable ?? 0);
  return card.damage ?? 0;
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

/** The Regen a potion gives (Regen Potion 5), 0 for any other. */
export function potionRegen(potionId: string): number {
  return POTION_EFFECTS[potionId]?.regen ?? 0;
}

/**
 * `slot` is the potion slot; the card index space is kept apart with 100 + slot (200 + slot for the card
 * a card potion adds). `ctx` is the board a generated card is played on (targets, Strength, Weak), the
 * pile cards pile-card potions take and the draw pile's expected card.
 */
export function modelPotion(potionId: string, name: string, slot: number, validTargets: number[], useCost: number, ctx?: PotionContext): CardModel | null {
  const effect = POTION_EFFECTS[potionId];
  if (!effect) return null;
  // Distilled Chaos, Glowwater, Bottled Potential and Gambler's Brew without a known draw pile: nothing to price their cards by.
  if ((effect.special === "chaos" || effect.special === "glowwater" || effect.special === "gamble" || effect.special === "bottled") && !ctx?.expectedDraw) return null;
  const card = GENERATED_CARD_POTIONS[potionId];
  const pile = PILE_CARD_POTIONS[potionId];
  const pileCard = pile ? (pile.pile === "discard" ? ctx?.discardPick : ctx?.drawPick) ?? null : null;
  // A pile-card potion with nothing to take is not a line.
  if (pile && !pileCard) return null;
  const generates: CardModel | undefined = effect.special === "gamble" || effect.special === "chaos" || effect.special === "glowwater" || effect.special === "bottled"
    ? ctx?.expectedDraw ?? undefined
    : pileCard
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
    ...potionShell(potionId, name, slot, validTargets, useCost),
    ...effect,
    ...(generates ? { generates } : {}),
  };
}

/**
 * A potion as a 0-cost "card" with no effect yet: the solver plays it as step `POTION:<id>:<slot>`.
 * modelPotion adds its modelled effect; potion-mc.ts one Monte Carlo sample's.
 */
export function potionShell(potionId: string, name: string, slot: number, validTargets: number[], useCost = 0): CardModel {
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
    target: "self",
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
  };
}

/** A potion's modelled effect (POTION_EFFECTS), without the cards it generates; null when unmodelled. */
export function potionEffect(potionId: string): (Partial<CardModel> & { target: TargetMode }) | null {
  return POTION_EFFECTS[potionId] ?? null;
}

/**
 * Random potions (Dai 2026-09-28): simulated by Monte Carlo every turn (potion-mc.ts) and offered to Jev as
 * "drink now, then re-plan with the real cards", never as a fixed-value line.
 *
 * Card-choice potions: 「从3张随机攻击牌中选择1张加入你的手牌。这张牌在本回合可以免费打出。」 3 random cards of the
 * type from the character's pool (Colorless Potion: the colorless pool), one taken, free this turn. Orobic
 * Acid takes all three (one Attack, one Skill, one Power). Pools: the game data's Common/Uncommon/Rare
 * cards of that color and type, drawn uniformly (the data carries no offer weights).
 */
export const CHOICE_POTIONS: Record<string, { pool: "character" | "colorless"; types: string[]; takeAll: boolean }> = {
  ATTACK_POTION: { pool: "character", types: ["Attack"], takeAll: false },
  SKILL_POTION: { pool: "character", types: ["Skill"], takeAll: false },
  POWER_POTION: { pool: "character", types: ["Power"], takeAll: false },
  COLORLESS_POTION: { pool: "colorless", types: ["Attack", "Skill", "Power"], takeAll: false },
  OROBIC_ACID: { pool: "character", types: ["Attack", "Skill", "Power"], takeAll: true },
};

/**
 * Draw potions: the cards come from the draw pile in an unknown order (then the discard pile, reshuffled),
 * so each sample is one shuffled order of the known piles. `cards`: how many the potion draws (Gambler's
 * Brew: as many as discarded, up to a full hand; Distilled Chaos: plays that many from the top).
 */
export const DRAW_POTIONS: Record<string, { cards: number }> = {
  SWIFT_POTION: { cards: 3 },
  CLARITY: { cards: 1 },
  CURE_ALL: { cards: 2 },
  SNECKO_OIL: { cards: 7 },
  GAMBLERS_BREW: { cards: 10 },
  GLOWWATER_POTION: { cards: 10 },
  DISTILLED_CHAOS: { cards: 3 },
  BOTTLED_POTENTIAL: { cards: 5 },
};

/** Which Monte Carlo class a potion is in: "choice" (random cards offered), "draw" (a random pile order), or null. */
export function randomPotionKind(potionId: string): "choice" | "draw" | null {
  if (potionId in CHOICE_POTIONS) return "choice";
  if (potionId in DRAW_POTIONS) return "draw";
  return null;
}

/** A plan step that plays the card a potion added (not a hand card: nothing to click until drunk). */
export function isGeneratedStep(cardId: string): boolean {
  return cardId.startsWith("GEN:");
}
