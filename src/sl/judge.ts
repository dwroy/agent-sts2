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
 *   of the turn (Plating / Plated Armor / Metallicize, Cloak Clasp for each card held, Feel No Pain for each Ethereal
 *   card held, Orichalcum when no block is left) and Regen reach our HP.
 * Then one of two tiers:
 * - "rules": no playable card in hand and no potion that can be drunk;
 * - "least-loss": the turn planner's own verdict on this board, combat/least-loss ending the turn: every simulated
 *   line dies (modelled potions included), no unmodelled potion and no random potion that may live, and the
 *   least-loss line is ending the turn. Vetoed when a playable card draws (the draws are not known), unless
 *   (SL_JUDGE_KNOWN_DRAWS, Dai 2026-10-02) every draw the simulated lines could make is exactly known (`drawsKnown`: the
 *   verdict already used the real cards; never the order resting on the added-cards model, draws.ts) and nothing
 *   changes the pile or draws mid-turn unseen.
 *
 * SL_RELOAD_EARLY (Dai 2026-10-02: "知道必死了就sl", and "我说的是必死 不是推演": a certain death, never a prediction):
 * the same least-loss verdict taken at the decision that finds it, before its line is played card by card
 * (judgeLeastLossNow), only when nothing this turn is left to chance or to what the planner does not model. Otherwise
 * the end_turn judgment, unchanged.
 *
 * Calibration on the logged A8+ boss and listed-elite turn ends (states.jsonl up to 2026-10-02, 4557 turn ends,
 * 201 deaths): "rules" fired 121 times, all deaths; both tiers 140 times, 139 deaths; the one survivor (7KDMKN16GD6B
 * F27 T7) had Feel No Pain block from exhausted Ethereal cards. That block was then counted for every card held, which
 * let a certain death through: 7PWU F48 (Queen) attempt 2 T6, "35 incoming - 0 block - 32 end-of-turn block < 14 HP"
 * with Feel No Pain 8 and four held cards none Ethereal (重振精神+, 薪火之源+, 御血术+, 突破+): no block came, it died
 * with four retries left. Only Ethereal cards are exhausted at the end of the turn (context.ethereal, card-model).
 */
import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../mod/schema.js";
import { distinctNames } from "../screens/combat-plan.js";
import { heldCardEthereal } from "../strategy/card-model.js";
import { asArray, asRecord, num, numOrNull, str } from "../util/json.js";

export type JudgeTier = "rules" | "least-loss";

export interface DeathVerdict {
  certain: boolean;
  tier: JudgeTier | null;
  /** SL_RELOAD_EARLY: taken at the least-loss decision, before its line was played (judgeLeastLossNow). */
  early?: true;
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
  /**
   * Whether a held card is Ethereal (exhausted at the end of the turn, so Feel No Pain blocks for it). Default: its
   * rendered text (card-model heldCardEthereal without game data; a card with no text counts as Ethereal).
   */
  ethereal?: (card: Record<string, unknown>) => boolean;
  /**
   * SL_JUDGE_KNOWN_DRAWS: the least-loss verdict drew only known cards (LeastLossFacts.drawsKnown, and no relic or power
   * draws or changes the pile mid-turn: midTurnRisks), so a playable card that draws does not veto it. Absent: it does.
   */
  drawsKnown?: boolean;
}

/** What the turn planner knew when it found every line dying (combat-plan leastLossFactsOf). */
export interface LeastLossFacts {
  /** SL_RETRY_KNOWN_DRAWS: the exactly known draws the solver drew from (0: none). */
  knownDraws: number;
  /**
   * Every card any simulated line could draw is exactly known (known draws, none past their exact part, no card that
   * changes the pile, no drawing potion): the verdict used the real cards.
   */
  drawsKnown: boolean;
  /** Some simulated line draws a card. */
  draws: boolean;
  /** The least-loss line, its steps as the rationale names them (the first is the decision's own; empty: end the turn). */
  line: string[];
  /** What leaves the all-lines-die verdict to chance or to the unmodelled (a random potion, a random card, ...), null: nothing. */
  chance: string | null;
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
  const etherealHeld = hand.filter((card) => (context.ethereal ?? ((held) => heldCardEthereal(held)))(card)).length;
  endBlock += powerAmount(player, "FEEL_NO_PAIN_POWER") * etherealHeld;
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
    if (drawing && context.drawsKnown !== true) return verdict(false, null, `the planner sees every line die, but ${str(drawing["name"], str(drawing["card_id"]))} draws (unknown cards)`);
    const known = drawing ? `; ${str(drawing["name"], str(drawing["card_id"]))} draws, but every draw the lines made is a known card (SL retry)` : "";
    return verdict(true, "least-loss", `the turn planner: every simulated line dies and ending the turn keeps the most HP; ${lethal}${known}`);
  }
  return verdict(false, null, `${playable.length} playable card(s) and ${drinkable.length} potion(s) left`);
}

/**
 * Relics the turn planner models (combat-plan, turn-solver) or this judge counts: what they do mid-turn is in the
 * verdict (Kusarigama's random hit is the planner's own fact, LeastLossFacts.chance).
 */
const MODELLED_RELICS = new Set(["DEMON_TONGUE", "INTIMIDATING_HELMET", "KUSARIGAMA", "LOST_WISP", "MUSIC_BOX", "PAELS_EYE", "PEN_NIB", "RIPPLE_BASIN", "SELF_FORMING_CLAY", "SHURIKEN", "VAMBRACE"]);
/**
 * Player powers the turn planner reads (combat-plan's PlayerSim, turn-solver). Juggernaut's random hit and Dark Embrace's
 * draws are the planner's own facts; Hellraiser plays a drawn Strike at a random enemy: not here.
 */
const MODELLED_POWERS = new Set([
  "BARRICADE_POWER", "BLUR_POWER", "BUFFER_POWER", "COLOSSUS_POWER", "CONSTRICT_POWER", "CRIMSON_MANTLE_POWER", "DARK_EMBRACE_POWER", "DEXTERITY_POWER",
  "DISINTEGRATION_POWER", "DUPLICATION_POWER", "FEEL_NO_PAIN_POWER", "FLAME_BARRIER_POWER", "FREE_ATTACK_POWER", "INFERNO_POWER", "INTANGIBLE_POWER",
  "JUGGERNAUT_POWER", "METALLICIZE_POWER", "NO_BLOCK_POWER", "NO_DRAW_POWER", "ONE_TWO_PUNCH_POWER", "PLATING_POWER", "PLATED_ARMOR_POWER", "RAGE_POWER",
  "REGEN_POWER", "RINGING_POWER", "ROLLING_BOULDER_POWER", "RUPTURE_POWER", "SELF_FORMING_CLAY_POWER", "SHRINK_POWER", "SLOTH_POWER", "SMOGGY_POWER",
  "STRENGTH_POWER", "SURROUNDED_POWER", "TENDER_POWER", "THE_GAMBIT_POWER", "THORNS_POWER", "UNMOVABLE_POWER", "VIGOR_POWER", "VULNERABLE_POWER", "WEAK_POWER",
]);
/** A relic's or power's text that acts on something done during the turn (the game's Chinese text, or English). */
const MID_TURN = /每当|你每|第一次|当你没有|当你在本回合|如果你在本回合|whenever|every time|each time|the first time/i;
/** ...unless it is about something else: a pickup, the map, a shop or rest, the fight's or a turn's start or end, the deck. */
const NOT_MID_TURN = /拾起时|商店|休息|宝箱|进入|战斗结束|战斗开始时|回合开始时|回合结束时|卡牌奖励|牌组|金币|upon pickup|shop|rest site|start of|end of (?:your |the )?(?:turn|combat)|card reward|your deck/i;
/** Text that draws, or changes the draw pile (Headbutt-like "抽牌堆" too). */
const DRAWS_OR_PILE = /抽|draw/i;

/** Relics and powers that act during this turn without the turn planner, or by chance (SL_RELOAD_EARLY, SL_JUDGE_KNOWN_DRAWS). */
export interface MidTurnRisks {
  /** Those that draw or change our draw pile (an enemy's Personal Hive adds Dazed when hit): the known draws are not sure. */
  draws: string[];
  /** All that act mid-turn without the planner: block, HP, damage, energy, draws the verdict did not see. */
  any: string[];
  /** Those acting by chance this turn, its end included (Juggernaut-like powers, Stampede, Parrying Shield, Forgotten Soul). */
  chance: string[];
  /**
   * Those hitting the enemies at the end of our turn, before they act (Stone Calendar on its turn, Screaming Flagon, The
   * Bomb): an attacker they kill does not attack. Neither the mod's flag nor our count sees them (7DXAW0ZBDFHP F23 T7: 3 HP
   * + 13 block against 38, flagged lethal; Stone Calendar's T7 blast killed both enemies and the fight was won).
   */
  endOfTurn: string[];
}

/** Relic text about something outside this turn's play (a pickup, the map, a shop or rest, a fight's or turn's start, the deck). */
const NOT_THIS_TURN = /拾起时|商店|休息|宝箱|进入|战斗结束|战斗开始时|回合开始时|卡牌奖励|牌组|金币|upon pickup|shop|rest site|start of|card reward|your deck/i;
const CHANCE = /随机|random/i;
/** Text that hits the enemies at the end of our turn. */
const END_OF_TURN_HIT = /回合结束时|end of (?:your |the )?turn/i;
const HITS_ENEMIES = /(敌人|enem)[^。.]*(伤害|damage|失去)|(伤害|damage)[^。.]*(敌人|enem)/i;

/**
 * What on this board acts during the turn without the planner, or by chance: a relic or a player power whose text triggers
 * on something done mid-turn (MID_TURN, not NOT_MID_TURN) and that the planner does not model (MODELLED_RELICS,
 * MODELLED_POWERS); a player power with no text known (counted, to be safe); an enemy power that changes our draw pile;
 * and any relic or power whose text says random (CHANCE) about this turn, its end included.
 */
export function midTurnRisks(state: GameState, knowledge?: Pick<Knowledge, "power" | "relic">): MidTurnRisks {
  const draws: string[] = [];
  const any: string[] = [];
  const chance: string[] = [];
  const endOfTurn: string[] = [];
  const run = asRecord(state.raw["run"]);
  for (const relic of asArray(run["relics"]).map(asRecord)) {
    const id = str(relic["relic_id"]);
    if (!id) continue;
    const text = str(relic["description"]) || (knowledge?.relic(id)?.description ?? "");
    const name = `${str(relic["name"], id)} (relic)`;
    if (CHANCE.test(text) && !NOT_THIS_TURN.test(text) && id !== "KUSARIGAMA") chance.push(name);
    if (END_OF_TURN_HIT.test(text) && HITS_ENEMIES.test(text)) endOfTurn.push(name);
    if (MODELLED_RELICS.has(id) || !MID_TURN.test(text) || NOT_MID_TURN.test(text)) continue;
    any.push(name);
    if (DRAWS_OR_PILE.test(text)) draws.push(name);
  }
  const combat = asRecord(state.raw["combat"]);
  for (const power of asArray(asRecord(combat["player"])["powers"]).map(asRecord)) {
    const id = str(power["power_id"]);
    if (!id) continue;
    const text = knowledge?.power(id)?.description ?? "";
    const name = `${str(power["name"], id)} (power)`;
    if (CHANCE.test(text) && id !== "JUGGERNAUT_POWER" && id !== "HELLRAISER_POWER") chance.push(name);
    if (END_OF_TURN_HIT.test(text) && HITS_ENEMIES.test(text)) endOfTurn.push(name);
    if (MODELLED_POWERS.has(id)) continue;
    if (!text) {
      any.push(`${name}, its text unknown`);
      draws.push(`${name}, its text unknown`);
      continue;
    }
    if (!MID_TURN.test(text) || NOT_MID_TURN.test(text)) continue;
    any.push(name);
    if (DRAWS_OR_PILE.test(text)) draws.push(name);
  }
  for (const enemy of asArray(combat["enemies"]).map(asRecord).filter((entry) => entry["is_alive"] !== false)) {
    for (const power of asArray(enemy["powers"]).map(asRecord)) {
      const id = str(power["power_id"]);
      const text = knowledge?.power(id)?.description ?? "";
      const name = `${str(enemy["name"], str(enemy["enemy_id"]))}'s ${str(power["name"], id)}`;
      if (/抽牌堆|draw pile/i.test(text)) {
        draws.push(name);
        any.push(name);
      }
      if (CHANCE.test(text)) chance.push(name);
    }
  }
  return { draws, any, chance, endOfTurn };
}

/** The enemy intents the game shows (and the solver and the mod count): a living enemy with none, or an unknown kind, is not shown. */
const SHOWN_INTENTS = new Set(["Attack", "Buff", "Debuff", "DebuffStrong", "Defend", "StatusCard", "CardDebuff", "Summon", "Stun", "Sleep", "Heal", "Escape"]);

/** A living enemy whose intent is not shown (no intent, or a kind not in SHOWN_INTENTS), or null. */
export function intentNotShown(state: GameState): string | null {
  for (const enemy of asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord).filter((entry) => entry["is_alive"] !== false)) {
    const intents = asArray(enemy["intents"]).map(asRecord);
    const name = str(enemy["name"], str(enemy["enemy_id"], "?"));
    if (intents.length === 0) return `${name} shows no intent`;
    const odd = intents.find((intent) => !SHOWN_INTENTS.has(str(intent["intent_type"])));
    if (odd) return `${name}'s intent ${str(odd["intent_type"], "?")} is not a plain one`;
  }
  return null;
}

export interface LeastLossNowContext extends Omit<JudgeContext, "label" | "drawsKnown"> {
  /** The planner's facts about its least-loss verdict (combat-plan leastLossFactsOf); absent: no early reload. */
  facts: LeastLossFacts | undefined;
  /** SL_JUDGE_KNOWN_DRAWS is on (exactly known draws lift the draw veto). */
  knownDrawsJudge: boolean;
  /** A card was added to the draw pile at a random place in this attempt (the draw tracker): chance in the pile. */
  addedToPile: boolean;
  knowledge?: Pick<Knowledge, "power" | "relic">;
}

/**
 * SL_RELOAD_EARLY (Dai 2026-10-02: certain death only, never a prediction): the least-loss verdict at the decision that
 * finds it, before its line is played. Certain only when every one of these holds; otherwise end_turn judges, unchanged:
 * 1. judgeEndTurn is certain on this board with the least-loss label: the mod's end_turn_will_kill_player, our own count,
 *    no revive, no Buffer or Intangible, no Ripple Basin without an attack played, no special phase, and the least-loss
 *    tier (every simulated line dies; no unmodelled potion) with its draw veto (lifted only by exactly known draws).
 * 2. Nothing in the verdict left to chance (LeastLossFacts.chance): no random potion; no line drawing a card that is not
 *    exactly known; no playable card (hand, modelled potion, known draw) with a random target, a random exhaust, a random
 *    card made or a top card played, nor an unmodelled one; no Juggernaut, Kusarigama or Hellraiser random hit.
 * 3. No card added to the draw pile at a random place in this attempt (`addedToPile`).
 * 4. The enemies' intents as shown (intentNotShown), and no relic or power acting by chance this turn (midTurnRisks.chance).
 * 5. No relic or power acting mid-turn that the planner does not model (midTurnRisks.any): its block, HP, damage, energy
 *    or draws would only show on the board at end_turn; and none hitting the enemies at the end of our turn
 *    (midTurnRisks.endOfTurn: Stone Calendar, Screaming Flagon, The Bomb), which neither the mod's flag nor our count sees.
 */
export function judgeLeastLossNow(state: GameState, context: LeastLossNowContext): DeathVerdict {
  const facts = context.facts;
  const risks = midTurnRisks(state, context.knowledge);
  const drawsKnown = context.knownDrawsJudge && facts?.drawsKnown === true && risks.draws.length === 0;
  const verdict = judgeEndTurn(state, { label: LEAST_LOSS_LABEL, revives: context.revives, ...(context.ethereal ? { ethereal: context.ethereal } : {}), ...(drawsKnown ? { drawsKnown: true } : {}) });
  if (!verdict.certain) return verdict;
  const notYet = (why: string): DeathVerdict => ({ ...verdict, certain: false, tier: null, reason: `not before the line is played: ${why}` });
  if (!facts) return notYet("the planner's facts about its verdict are missing");
  if (facts.chance !== null) return notYet(`chance in the verdict (${facts.chance})`);
  if (facts.draws && !drawsKnown) return notYet("a line draws cards not exactly known");
  if (context.addedToPile) return notYet("cards were added to the draw pile at random places this attempt");
  const hidden = intentNotShown(state);
  if (hidden) return notYet(hidden);
  if (risks.chance.length > 0) return notYet(`acting by chance: ${risks.chance.join(", ")}`);
  if (risks.any.length > 0) return notYet(`acting mid-turn without the planner: ${risks.any.join(", ")}`);
  if (risks.endOfTurn.length > 0) return notYet(`hitting the enemies at the end of the turn: ${risks.endOfTurn.join(", ")}`);
  return { ...verdict, early: true, reason: `at the least-loss verdict, before its line (${facts.line.join(", ") || "end turn"}): ${verdict.reason}` };
}

/** SL_JUDGE_KNOWN_DRAWS at end_turn: every draw the lines could make is exactly known, and nothing draws or changes the pile unseen. */
export function drawsKnownAt(state: GameState, facts: LeastLossFacts | undefined, knowledge?: Pick<Knowledge, "power" | "relic">): boolean {
  return facts?.drawsKnown === true && midTurnRisks(state, knowledge).draws.length === 0;
}
