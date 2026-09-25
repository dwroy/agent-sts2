/**
 * Combat, turn-planned (phase 2). Division of labour:
 *
 *   code  — enumerates every play order for the hand, simulates the turn, scores the end states
 *           (turn-solver.ts). Lethal, "only one line survives", and clear-best plans are played
 *           without asking anyone.
 *   Jev   — chooses between the few strategically different plans that code cannot separate
 *           (e.g. block now vs. set up Strength vs. race), and decides about potions when the turn
 *           is dangerous.
 *
 * A chosen plan is committed: its remaining steps are played without re-asking as long as the hand
 * is exactly what the plan expected. Anything unexpected (a draw, a random effect) invalidates it and
 * the turn is re-planned from the real board.
 *
 * Falls back to the per-card question (combat.ts) when the solver has nothing to offer: no plan
 * survives the turn, or the board is outside what the solver models.
 */

import { choiceQ } from "../jev/questions.js";
import type { ActionRequest } from "../mod/client.js";
import { playerJson, potionViews } from "../project/narrow.js";
import { briefJson } from "../project/run-brief.js";
import type { CombatPlanMemo, Decision, DecisionEnv, ResolvedAction } from "../project/types.js";
import { expectedNextDamage } from "../knowledge/move-model.js";
import { heldPenaltyOf, isModelledPotion, modelHandCard, modelPotion, type CardModel } from "../strategy/card-model.js";
import { distinctPlans, dominates, solveTurn, type DrawPileCard, type EnemySim, type Plan, type PlayerSim, type SolverInput, type Step } from "../strategy/turn-solver.js";
import { asArray, asRecord, bool, num, numOrNull, str, type JsonValue } from "../util/json.js";
import { planCombat as planCombatPerCard } from "./combat.js";

/** Enemy powers the solver models, or that do not change this turn's numbers. */
const MODELLED_ENEMY_POWERS = new Set([
  "VULNERABLE_POWER", "WEAK_POWER", "STRENGTH_POWER", "ARTIFACT_POWER", "INTANGIBLE_POWER", "SLIPPERY_POWER",
  "HARDENED_SHELL_POWER", "THORNS_POWER", "CURL_UP_POWER", "FLUTTER_POWER", "HARD_TO_KILL_POWER", "SLOW_POWER",
  "ILLUSION_POWER", "MINION_POWER", "TERRITORIAL_POWER", "PLOW_POWER", "ESCAPE_ARTIST_POWER", "PLATING_POWER",
  "SLUMBER_POWER", "INFESTED_POWER", "SWIPE_POWER", "IMBALANCED_POWER", "RITUAL_POWER", "SHRINK_POWER",
  "GUARDED_POWER", "SOAR_POWER", "SKITTISH_POWER", "REFLECT_POWER", "SUCK_POWER", "PAINFUL_STABS_POWER", "PAPER_CUTS_POWER",
  "CRAB_RAGE_POWER", "BURROWED_POWER", "RAMPART_POWER", "STEAM_ERUPTION_POWER", "REATTACH_POWER",
  "SANDPIT_POWER", "ASLEEP_POWER", "ENRAGE_POWER", "ADAPTABLE_POWER", "NEMESIS_POWER",
  // Surrounded's back attack is in the intents (backAttack in turn-solver.ts); left unmodelled, it cut
  // our damage by 20% (PLC F33 T8: Twin Strike 11x2 planned as 8x2, Crusher left at 2 not 8).
  "BACK_ATTACK_LEFT_POWER", "BACK_ATTACK_RIGHT_POWER", "WITHERING_PRESENCE_POWER", "DEMISE_POWER",
  // Terror Eel: stunned at half HP (`shriek`); left unmodelled it cut our damage by 20%.
  "SHRIEK_POWER",
  // Axebot: revives from Stock (`stock`); left unmodelled it cut our damage by 20% and a kill that only
  // revived it read as lethal three times (U6W7 F39).
  "STOCK_POWER",
]);

/** Powers whose meaning the models cannot guess from the id (TTVY T6: DeepSeek never saw the Sandpit). */
const POWER_NOTES: Record<string, string> = {
  SANDPIT_POWER: " (countdown: -1 every enemy turn; at 0 I die whatever my HP and block; each Frantic Escape played +1)",
  ASLEEP_POWER: " (asleep, no attacks: the first HP damage wakes it at once, block damage does not; set up powers instead of chipping it)",
  SLUMBER_POWER: " (sleeping, no attacks: -1 each turn and -1 per hit that takes HP; wakes at 0)",
  CRAB_RAGE_POWER: " (when its partner dies it gains 99 Block and +6 Strength: kill both in the same turn or wear both down evenly; start-of-turn damage to all enemies (Mercury Hourglass 3, Inferno) kills a partner left that low; enemy Block you see now is gone by the start of your next turn)",
  // Test Subject (2WUMK6PK5QHD): three phases, 100 / 200 / 300 HP.
  ADAPTABLE_POWER: " (another phase follows: at 0 HP it spends one turn reviving (no attack), then returns at full, higher max HP with Vulnerable/Strength cleared; killing this phase does NOT end the fight, keep HP for the next one)",
  ENRAGE_POWER: " (+N Strength every time I play a Skill, raising this turn's attack too: prefer Attacks)",
  PAINFUL_STABS_POWER: " (every unblocked hit shuffles a Wound into my discard pile; Test Subject's Multi Claw gains 1 hit every turn: block it fully)",
  NEMESIS_POWER: " (gains 1 Intangible at the end of every 2nd turn)",
  INTANGIBLE_POWER: " (every hit and HP loss is reduced to 1: many small hits, not big ones)",
  WITHERING_PRESENCE_POWER: " (every 6 cards I play, counted across turns, add an unplayable Wither to my hand: it deals its damage at the end of my turn while held, blockable, +3 each Increasing Intensity; play fewer, bigger cards)",
  ARTIFACT_POWER: " (each stack negates one debuff: Vulnerable, Weak, Demise, Strength loss; strip it with cheap debuffs before a debuff potion)",
  // XJWF F22: seven turns killing the Parafright, the Obscura 96 -> 76, dead at 13 HP.
  ILLUSION_POWER: " (illusion: back at full HP next turn even if killed; damage into it is wasted, killing it only cancels this turn's attack; it leaves when its summoner dies: hit the summoner)",
  STOCK_POWER: " (revives left: at 0 HP it comes straight back at full, higher max HP with Stock -1, and that turn does Boot Up (10 Block, +3 Strength, no attack), then attacks harder every turn; a kill with Stock left does NOT end the fight: its real HP is current HP + Stock x max HP, so block rather than race it)",
  SHRIEK_POWER: " (the first time its HP drops to this or below it is stunned: this turn's attack is cancelled)",
};

/** Solver cost of drinking a potion in a boss fight (before any defensive saving). */
export const BOSS_POTION_COST = 4;
const BOSS_POTIONS_PER_TURN = 1;
/** Block/Weak potions: worth keeping for a bigger hit next turn (saveDefence). */
const DEFENSIVE = new Set(["FORTIFIER", "BLOCK_POTION", "SPEED_POTION", "LUCKY_TONIC", "SHIP_IN_A_BOTTLE", "WEAK_POTION", "POTION_OF_BINDING"]);

/** Potions drunk this combat turn: the belt count at the turn's first look minus the count now. */
function potionsUsedThisTurn(env: DecisionEnv, count: number): number {
  const fight = `${str(asRecord(env.state.run?.raw)["act_id"])}:${env.state.run?.floor ?? "?"}`;
  const memo = env.screenMemory.potionTurn;
  if (!memo || memo.fight !== fight || memo.turn !== env.state.turn) {
    env.screenMemory.potionTurn = { fight, turn: env.state.turn, startCount: count };
    return 0;
  }
  return Math.max(0, memo.startCount - count);
}

/** Plans closer than this (in score points ≈ HP) are a judgement call and go to Jev. */
const CLOSE_CALL = 6;
const MAX_OPTIONS = 4;

/**
 * HP guardrail for elite/boss/dangerous plan choices: the models keep trading HP for damage ("Burning
 * Blood heals it", "HP buffer is comfortable"; WX16, 7Q5G, YP9, DG1 — the guide alone did not stop
 * it). A non-winning plan may lose at most this much more than the cheapest plan offered.
 *
 * Boss and elite fights get the tight bound, max(4, 10% HP): Z2H3 T7/T8 DeepSeek split the trade
 * across re-plans, each step inside max(6, 20% HP) ≈ 9, about 12 HP over two turns, and died with the
 * boss at 33. Once a fight's accepted extra loss is past HP_GUARD_FIGHT_BUDGET the bound is 0: the
 * cheapest plan, unless the choice wins the fight.
 */
export const HP_GUARD_FIGHT_BUDGET = 12;

export function hpGuardSlack(hp: number, kind: SolverInput["fightKind"] = "unknown", extraSoFar = 0): number {
  if (extraSoFar > HP_GUARD_FIGHT_BUDGET) return 0;
  if (kind === "boss" || kind === "elite") return Math.max(4, hp * 0.1);
  return Math.max(6, hp * 0.2);
}

/**
 * The plan to play instead of `chosen` when it loses too much HP, else null: the best-ranked plan
 * within the slack of the cheapest one (options are in code rank order).
 */
export function hpGuardReplacement(chosen: Plan, options: Plan[], hp: number, slack = hpGuardSlack(hp)): Plan | null {
  if (chosen.outcome.winsFight || options.length === 0) return null;
  const minLoss = Math.min(...options.map((plan) => plan.outcome.hpLoss));
  const bound = minLoss + slack;
  if (chosen.outcome.hpLoss <= bound) return null;
  return options.find((plan) => plan.outcome.hpLoss <= bound) ?? options.find((plan) => plan.outcome.hpLoss === minLoss) ?? null;
}

/** This fight's HP-guard record (screenMemory.hpGuard), read-only: the extra HP accepted so far. */
function hpGuardExtra(env: DecisionEnv): number {
  const memo = env.screenMemory.hpGuard;
  if (!memo || memo.fight !== hpGuardFight(env)) return 0;
  return Object.values(memo.turns).reduce((sum, extra) => sum + extra, 0);
}

function hpGuardFight(env: DecisionEnv): string {
  return `${str(asRecord(env.state.run?.raw)["act_id"])}:${env.state.run?.floor ?? "?"}`;
}

/**
 * Records the extra HP of the plan committed this turn, once per turn: a re-plan in the same turn
 * replaces the turn's entry (b63e836 added it on every resolve, Jev's and the escalator's, and on
 * every re-plan; the 12 HP budget was gone by turn 2-3).
 */
export function recordHpGuard(env: DecisionEnv, turn: number | null, extra: number): void {
  const fight = hpGuardFight(env);
  if (env.screenMemory.hpGuard?.fight !== fight) env.screenMemory.hpGuard = { fight, turns: {} };
  env.screenMemory.hpGuard.turns[String(turn ?? "?")] = extra;
}

function powerAmount(holder: Record<string, unknown>, id: string): number {
  for (const entry of asArray(holder["powers"])) {
    const power = asRecord(entry);
    if (str(power["power_id"]) === id) return numOrNull(power["amount"]) ?? 1;
  }
  return 0;
}

/**
 * Crimson Mantle: each copy costs 1 HP at the start of our turn (and gives 7, or 10 upgraded, block).
 * The power only shows the block total, so the copies are counted from it.
 */
export function mantleHpCost(amount: number): number {
  return amount > 0 ? Math.max(1, Math.floor(amount / 7)) : 0;
}

export function enemySims(combat: Record<string, unknown>): EnemySim[] {
  return asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .map((enemy, fallbackIndex) => ({
      index: numOrNull(enemy["index"]) ?? fallbackIndex,
      name: str(enemy["name"], str(enemy["enemy_id"])),
      hp: num(enemy["current_hp"]),
      maxHp: num(enemy["max_hp"]),
      block: num(enemy["block"]),
      vulnerable: powerAmount(enemy, "VULNERABLE_POWER"),
      weak: powerAmount(enemy, "WEAK_POWER"),
      artifact: powerAmount(enemy, "ARTIFACT_POWER"),
      intangible: powerAmount(enemy, "INTANGIBLE_POWER") > 0,
      slippery: powerAmount(enemy, "SLIPPERY_POWER"),
      hpLossCap: powerAmount(enemy, "HARDENED_SHELL_POWER") > 0 ? powerAmount(enemy, "HARDENED_SHELL_POWER") : null,
      thorns: powerAmount(enemy, "THORNS_POWER"),
      curlUp: powerAmount(enemy, "CURL_UP_POWER"),
      flutter: powerAmount(enemy, "FLUTTER_POWER"),
      perHitCap: powerAmount(enemy, "HARD_TO_KILL_POWER") > 0 ? powerAmount(enemy, "HARD_TO_KILL_POWER") : null,
      slow: powerAmount(enemy, "SLOW_POWER") > 0,
      illusion: powerAmount(enemy, "ILLUSION_POWER") > 0,
      minion: powerAmount(enemy, "MINION_POWER") > 0,
      reattach: powerAmount(enemy, "REATTACH_POWER") > 0,
      reattachHp: powerAmount(enemy, "REATTACH_POWER"),
      crabRage: powerAmount(enemy, "CRAB_RAGE_POWER") > 0,
      eruption: powerAmount(enemy, "STEAM_ERUPTION_POWER"),
      sandpit: powerAmount(enemy, "SANDPIT_POWER"),
      asleep: powerAmount(enemy, "ASLEEP_POWER"),
      slumber: powerAmount(enemy, "SLUMBER_POWER"),
      // Waterfall Giant shows Buff on every move, but that is only Steam Eruption stacking: racing it
      // is what lost G7EJ and WQTRX (the explosion is modelled through `eruption` instead).
      // Any Strength already, not just this turn's Buff intent (6A36: Sludge Spinner's Rage +3 every
      // third turn went to Strength 9 while damage stayed at hallway weight). A Buff move anywhere in
      // the cycle was too broad: 56 of 101 enemies, most of whose buffs are not Strength.
      scaling:
        str(enemy["enemy_id"]) !== "WATERFALL_GIANT" &&
        (asArray(enemy["intents"]).some((intent) => str(asRecord(intent)["intent_type"]) === "Buff") ||
        powerAmount(enemy, "RITUAL_POWER") > 0 ||
        powerAmount(enemy, "TERRITORIAL_POWER") > 0 ||
        powerAmount(enemy, "STRENGTH_POWER") > 0),
      halved: powerAmount(enemy, "GUARDED_POWER") > 0 || powerAmount(enemy, "SOAR_POWER") > 0,
      skittish: powerAmount(enemy, "SKITTISH_POWER"),
      reflect: powerAmount(enemy, "REFLECT_POWER") > 0,
      demise: powerAmount(enemy, "DEMISE_POWER"),
      punishesUnblocked: (powerAmount(enemy, "SUCK_POWER") > 0 ? 4 : 0) + (powerAmount(enemy, "PAPER_CUTS_POWER") > 0 ? 5 : 0),
      woundsPerHit: powerAmount(enemy, "PAINFUL_STABS_POWER"),
      enrage: powerAmount(enemy, "ENRAGE_POWER"),
      revives: powerAmount(enemy, "ADAPTABLE_POWER") > 0,
      stock: powerAmount(enemy, "STOCK_POWER"),
      shriek: powerAmount(enemy, "SHRIEK_POWER"),
      unmodelled: asArray(enemy["powers"]).some((power) => !MODELLED_ENEMY_POWERS.has(str(asRecord(power)["power_id"]))),
      attacks: asArray(enemy["intents"])
        .map(asRecord)
        .flatMap((intent) => {
          const damage = numOrNull(intent["damage"]);
          if (damage === null) return [];
          return [{ damage, hits: Math.max(1, Math.round(numOrNull(intent["hits"]) ?? 1)) }];
        }),
    }));
}

/** Block a hand typically puts up against the explosion turn. */
const ERUPTION_BLOCK = 12;
/** Damage per turn assumed before any has been seen (1ZQJ averaged 16). */
const ERUPTION_FALLBACK_DAMAGE = 16;

/**
 * Waterfall Giant too slow to kill (1ZQJ: 16 damage a turn into 240 HP, dead on T15 with the eruption
 * at 54; 21 HP + 17 block did not survive it). Turns to kill come from the damage dealt so far (or
 * 16 a turn on T1); the eruption grows 3 a turn. When the projected explosion is at least HP plus a
 * hand of block, waiting loses: race it.
 */
export function eruptionRace(enemy: Record<string, unknown>, playerHp: number, turn: number): boolean {
  if (str(enemy["enemy_id"]) !== "WATERFALL_GIANT" || enemy["is_alive"] === false) return false;
  const hp = num(enemy["current_hp"]);
  const maxHp = num(enemy["max_hp"]);
  if (hp <= 0 || maxHp >= 1_000_000) return false;
  const stacks = powerAmount(enemy, "STEAM_ERUPTION_POWER");
  const eruptionNow = stacks > 0 ? stacks : Math.max(12, 15 + 3 * (turn - 2));
  const perTurn = turn > 1 ? Math.max(5, (maxHp - hp) / (turn - 1)) : ERUPTION_FALLBACK_DAMAGE;
  const projected = eruptionNow + 3 * Math.ceil(hp / perTurn);
  return projected >= playerHp + ERUPTION_BLOCK;
}

export function fightKind(combat: Record<string, unknown>, env: DecisionEnv): SolverInput["fightKind"] {
  let kind: SolverInput["fightKind"] = "unknown";
  for (const entry of asArray(combat["enemies"])) {
    const type = env.knowledge.monster(str(asRecord(entry)["enemy_id"]))?.type ?? "";
    if (type === "Boss") return "boss";
    if (type === "Elite") kind = "elite";
    else if (type === "Normal" && kind === "unknown") kind = "monster";
  }
  return kind;
}

function handSignature(hand: CardModel[]): string {
  return hand
    .map((card) => `${card.cardId}${card.upgraded ? "+" : ""}`)
    .sort()
    .join(",");
}

function stepText(step: Step): string {
  return step.targetName ? `${step.name} -> ${step.targetName}` : step.name;
}

function describePlan(plan: Plan, playerHp: number): Record<string, JsonValue> {
  const o = plan.outcome;
  const summary: Record<string, JsonValue> = {
    plays: plan.steps.length === 0 ? "nothing (end the turn now)" : plan.steps.map(stepText).join(", then "),
    result: o.winsFight ? "wins the fight this turn" : o.dies ? "I DIE at the end of the turn" : `survives with ${o.hpAfter}/${playerHp} HP before healing`,
    hp_lost: o.hpLoss,
    damage_dealt: o.damageDealt,
  };
  if (o.kills.length > 0) summary["kills"] = o.kills.join(", ");
  if (o.restocked.length > 0) summary["revives_from_stock"] = `${o.restocked.join(", ")}: back at full HP with +3 Strength, NOT a kill`;
  if (!o.winsFight) summary["enemies_after"] = o.enemyHpAfter.filter((enemy) => enemy.hp > 0).map((enemy) => `${enemy.name} ${enemy.hp} HP${enemy.vulnerable ? `, Vulnerable ${enemy.vulnerable}` : ""}${enemy.weak ? `, Weak ${enemy.weak}` : ""}`).join("; ");
  if (o.blockGained > 0) summary["block_gained"] = o.blockGained;
  if (o.strengthGained > 0) summary["strength_gained"] = o.strengthGained;
  if (o.cardsDrawn > 0) summary["cards_drawn"] = o.cardsDrawn;
  if (o.energyLeft > 0) summary["energy_unused"] = o.energyLeft;
  if (o.startTurnKills.length > 0) summary["mercury_hourglass_kills_next_turn"] = o.startTurnKills.join(", ");
  if (o.withersAdded > 0) summary["withers_added"] = o.withersAdded;
  if (o.sleepCost > 0) summary["wakes_sleeping_enemy"] = "yes: its free turns are lost";
  if (o.sandpitAfter !== null) summary["sandpit_after_enemy_turn"] = o.sandpitAfter <= 0 ? `${o.sandpitAfter} (eaten: I DIE)` : o.sandpitAfter;
  if (o.unknownCards.length > 0) summary["unmodelled_cards"] = o.unknownCards.join(", ");
  return summary;
}

/**
 * The hand card a plan step means: same id and upgrade level, else the same id (0NG F17: the plan
 * said Defend+, a plain Defend was played and the Defend+ stayed in hand — 3 HP lost).
 */
function cardFor(step: Step, hand: CardModel[]): CardModel | undefined {
  // Match the planned copy's cost first: after Snecko Oil the gate kept rejecting the 3-cost Strike
  // while the planned 0-cost one sat in hand (24DPW2ED71QM, 30 min stuck).
  return (
    hand.find((entry) => entry.cardId === step.cardId && entry.upgraded === step.upgraded && step.cost !== undefined && entry.cost === step.cost && entry.playable) ??
    hand.find((entry) => entry.cardId === step.cardId && entry.upgraded === step.upgraded && entry.playable) ??
    hand.find((entry) => entry.cardId === step.cardId && entry.playable)
  );
}

function intentFor(step: Step, hand: CardModel[]): ActionRequest | null {
  if (step.cardId.startsWith("POTION:")) {
    const slot = Number(step.cardId.split(":")[2]);
    return step.target === null ? { action: "use_potion", option_index: slot } : { action: "use_potion", option_index: slot, target_index: step.target };
  }
  const card = cardFor(step, hand);
  if (!card) return null;
  if (step.target === null) return { action: "play_card", card_index: card.index };
  if (!card.validTargets.includes(step.target)) return null;
  return { action: "play_card", card_index: card.index, target_index: step.target };
}

function firstIntent(plan: Plan, hand: CardModel[], env?: DecisionEnv): ActionRequest {
  const first = plan.steps[0];
  if (!first) return { action: "end_turn" };
  const intent = intentFor(first, hand) ?? { action: "end_turn" };
  if (env) noteIntent(env, intent, intent.action === "play_card" ? cardFor(first, hand) : undefined);
  return intent;
}

/** What an action we send changes for later plans: the facing (Surrounded), a spent Demon Tongue. */
function noteIntent(env: DecisionEnv, intent: ActionRequest, card: CardModel | undefined): void {
  if (intent.target_index !== undefined && intent.target_index !== null) env.screenMemory.facing = intent.target_index;
  if (card && card.hpLoss > 0) env.screenMemory.demonTongueTurn = `${hpGuardFight(env)}:${env.state.turn}`;
}

/** Intimidating Helmet's block per 2+ cost card (PU21 F12-F14: block 0 -> 4; its description is a template). */
export const INTIMIDATING_HELMET_BLOCK = 4;
/** Mercury Hourglass: damage to every enemy at the start of our turn (PLC F33: Rocket 108 -> 105). */
export const MERCURY_HOURGLASS_DAMAGE = 3;

/**
 * Damage to every enemy at the start of our next turn, all sources: Mercury Hourglass (3), and Inferno
 * (INFERNO_POWER amount, 6 / 9 upgraded) once for its own start-of-turn HP loss and once more for a
 * Crimson Mantle's (both are HP lost on our turn). 9XZX T5 -> T6: Crusher 55 -> 49, Rocket 140 -> 134.
 */
export function turnStartAoe(relicIds: string[], player: Record<string, unknown>): number {
  const hourglass = relicIds.includes("MERCURY_HOURGLASS") ? MERCURY_HOURGLASS_DAMAGE : 0;
  const inferno = powerAmount(player, "INFERNO_POWER");
  const lossEvents = inferno > 0 ? 1 + (powerAmount(player, "CRIMSON_MANTLE_POWER") > 0 ? 1 : 0) : 0;
  return hourglass + inferno * lossEvents;
}
const WITHER_EVERY = 6;
const WITHER_BASE_DAMAGE = 3;

/**
 * Withering Presence (Aeonglass, TQX5): cards played this fight so far (the power's amount stays 6;
 * the count is ours, per turn from cards_played_this_turn), and the damage a new Wither will deal (the
 * Withers seen in hand; they grow +3 each Increasing Intensity).
 */
export function witherInput(env: DecisionEnv, combat: Record<string, unknown>, hand: CardModel[], playedThisTurn: number): SolverInput["wither"] {
  const every = asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .reduce((found, enemy) => found || (powerAmount(enemy, "WITHERING_PRESENCE_POWER") > 0 ? WITHER_EVERY : 0), 0);
  if (every === 0) return undefined;
  const fight = hpGuardFight(env);
  if (env.screenMemory.fightCards?.fight !== fight) env.screenMemory.fightCards = { fight, perTurn: {}, witherDamage: WITHER_BASE_DAMAGE };
  const memo = env.screenMemory.fightCards;
  const turn = String(env.state.turn ?? "?");
  memo.perTurn[turn] = Math.max(memo.perTurn[turn] ?? 0, playedThisTurn);
  const held = hand.filter((card) => card.cardId === "WITHER").map((card) => card.heldPenalty);
  if (held.length > 0) memo.witherDamage = Math.max(memo.witherDamage, ...held);
  const played = Object.values(memo.perTurn).reduce((sum, count) => sum + count, 0);
  return { every, played, damage: memo.witherDamage };
}

/** What the hand should look like after the first step of `plan` (for the commitment check). */
/**
 * The cards the next draws come from: agent_view.combat.draw, grouped lines like "打击*4 [1费]：…"
 * (count after "*"), or the discard pile when the draw pile is empty (it is shuffled in). undefined
 * when the state has neither (older mod, tests). XPA4 T8/T10: nothing read the piles, so Battle
 * Trance at 1 energy was "+9" with 3 Beckons in a 6-card pile.
 */
export function drawPileCards(raw: Record<string, unknown>): DrawPileCard[] | undefined {
  const view = asRecord(asRecord(raw["agent_view"])["combat"]);
  const parse = (pile: unknown): DrawPileCard[] =>
    asArray(pile).flatMap((entry) => {
      const line = str(asRecord(entry)["line"]);
      const count = Number(/^[^[：:]*?\*(\d+)\s*\[/.exec(line)?.[1] ?? 1);
      const cost = /\[(-?\d+|X)费\]/.exec(line)?.[1];
      const playable = cost !== "-1" && !/不能被打出|unplayable/i.test(line);
      const card: DrawPileCard = { playable, heldPenalty: heldPenaltyOf(line).heldPenalty };
      return Array.from({ length: count }, () => card);
    });
  const draw = parse(view["draw"]);
  if (draw.length > 0) return draw;
  const discard = parse(view["discard"]);
  return discard.length > 0 ? discard : undefined;
}

function expectedHandAfterFirst(plan: Plan, hand: CardModel[]): string {
  const first = plan.steps[0];
  if (!first) return handSignature(hand);
  return handSignature(hand.filter((card) => card !== cardFor(first, hand)));
}

function commit(env: DecisionEnv, turn: number | null, plan: Plan, hand: CardModel[], via: CombatPlanMemo["via"]): void {
  const first = plan.steps[0];
  const drawsOrRandom = first ? cardFor(first, hand)?.draw ?? 0 : 0;
  env.screenMemory.combatPlan =
    plan.steps.length > 1 && drawsOrRandom === 0
      ? { turn, remaining: plan.steps.slice(1), expectedHand: expectedHandAfterFirst(plan, hand), handLen: hand.length - 1, via }
      : null;
}

/**
 * Sandpit hard guard (TTVY T6): never end the turn with the Sandpit about to reach 0 while an
 * affordable Frantic Escape is in hand. The mod's end_turn_will_kill_player does not see this death,
 * so it applies to every combat planner and to answers from Jev/DeepSeek alike.
 */
export function guardSandpit(env: DecisionEnv, decision: Decision | null): Decision | null {
  if (!decision) return decision;
  const combat = asRecord(env.state.raw["combat"]);
  const sandpits = asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .map((enemy) => powerAmount(enemy, "SANDPIT_POWER"))
    .filter((amount) => amount > 0);
  if (sandpits.length === 0 || Math.min(...sandpits) - 1 > 0) return decision;
  const energy = num(asRecord(combat["player"])["energy"]);
  const escape = asArray(combat["hand"])
    .map(asRecord)
    .find((card) => str(card["card_id"]) === "FRANTIC_ESCAPE" && card["playable"] !== false && num(card["energy_cost"]) <= energy);
  if (!escape) return decision;
  const intent: ActionRequest = { action: "play_card", card_index: num(escape["index"]) };
  const why = `Sandpit ${Math.min(...sandpits)} would reach 0 at the enemy turn (death regardless of HP/block)`;
  if (decision.kind === "act") {
    if (decision.intent.action !== "end_turn") return decision;
    env.screenMemory.combatPlan = null;
    return { kind: "act", label: "combat/sandpit-guard", intent, rationale: `${why}: playing Frantic Escape instead of ending the turn` };
  }
  const resolve = decision.resolve.bind(decision);
  return {
    ...decision,
    resolve(answers) {
      const resolved = resolve(answers);
      if (resolved.intent?.action !== "end_turn") return resolved;
      return {
        ...resolved,
        apply: () => {
          env.screenMemory.combatPlan = null;
        },
        intent,
        rationale: `${resolved.rationale}; overridden: ${why}, playing Frantic Escape`,
      };
    },
  };
}

export function planCombatTurn(env: DecisionEnv): Decision | null {
  return guardSandpit(env, planTurn(env));
}

function planTurn(env: DecisionEnv): Decision | null {
  const { state } = env;
  const combat = asRecord(state.raw["combat"]);
  const readiness = asRecord(combat["action_readiness"]);
  if (readiness["can_use_combat_actions"] === false) return null;
  if (!state.available_actions.includes("play_card") && !state.available_actions.includes("end_turn")) return null;

  const player = asRecord(combat["player"]);
  const hand = asArray(combat["hand"]).map((entry, index) => modelHandCard(entry, index, env.knowledge));
  // Evil Eye doubles when a card was exhausted this turn: with Baking Gloves that is every turn.
  const relicIds = asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  const exhaustsEveryTurn = relicIds.includes("TOASTY_MITTENS");
  const exhaustedThisTurn = exhaustsEveryTurn || num(player["cards_exhausted_this_turn"]) > 0;
  for (const card of hand) if (card.cardId === "EVIL_EYE" && exhaustedThisTurn) card.block *= 2;
  // Fiddle (and No Draw): nothing can be drawn mid-turn, so draw effects are worth nothing.
  if (relicIds.includes("FIDDLE") || powerAmount(player, "NO_DRAW_POWER") > 0) for (const card of hand) card.draw = 0;
  const enemies = enemySims(combat);
  if (enemies.length === 0) {
    // Every enemy at 0 HP but the fight goes on: a multi-phase boss (Test Subject, ADAPTABLE_POWER)
    // revives on the enemy turn. Waiting forever stalled a floor-50 run; after a short settle, end
    // the turn so the next phase starts.
    const since = (env.screenMemory.noEnemiesSince ??= Date.now());
    if (Date.now() - since <= 4_000) return null;
    // The revive turn is free (2WUM T9: 4 energy, True Grit+ and 2 Wounds in hand, turn ended; next
    // turn 3 of 5 cards were Wounds): set up the next phase first.
    const keepsBlock = powerAmount(player, "BARRICADE_POWER") > 0 || powerAmount(player, "BLUR_POWER") > 0;
    const setup = state.available_actions.includes("play_card") ? phaseSetupCard(hand, num(player["energy"]), keepsBlock) : null;
    if (setup) {
      return { kind: "act", label: "combat/phase-setup", intent: { action: "play_card", card_index: setup.card.index }, rationale: `no living enemy (boss phase change): ${setup.why} before ending the turn` };
    }
    if (state.available_actions.includes("end_turn")) {
      return { kind: "act", label: "combat/end_turn", intent: { action: "end_turn" }, rationale: "no living enemy but combat continues (boss phase change): ending the turn" };
    }
    return null;
  }
  env.screenMemory.noEnemiesSince = undefined;

  const playerSim: PlayerSim = {
    hp: num(player["current_hp"]),
    maxHp: num(player["max_hp"]),
    block: num(player["block"]),
    energy: num(player["energy"]),
    weak: powerAmount(player, "WEAK_POWER") > 0,
    vulnerable: powerAmount(player, "VULNERABLE_POWER") > 0,
    intangible: powerAmount(player, "INTANGIBLE_POWER") > 0,
    shrunk: powerAmount(player, "SHRINK_POWER") > 0,
    juggernaut: powerAmount(player, "JUGGERNAUT_POWER"),
    rage: powerAmount(player, "RAGE_POWER"),
    keepsBlock: powerAmount(player, "BARRICADE_POWER") > 0 || powerAmount(player, "BLUR_POWER") > 0,
    gambit: powerAmount(player, "THE_GAMBIT_POWER") > 0,
    endTurnBlock: powerAmount(player, "PLATING_POWER") + powerAmount(player, "METALLICIZE_POWER"),
    rupture: powerAmount(player, "RUPTURE_POWER"),
    // Sloth caps cards per turn; Disintegration deals its amount at the end of every turn.
    maxPlays: playCap(player),
    endTurnHpLoss: powerAmount(player, "DISINTEGRATION_POWER"),
    surrounded: powerAmount(player, "SURROUNDED_POWER") > 0,
    facing: env.screenMemory.facing ?? null,
    colossus: powerAmount(player, "COLOSSUS_POWER") > 0,
    // Inferno takes 1 HP at the start of each turn (and that loss is what makes it hit every enemy).
    startTurnHpLoss: mantleHpCost(powerAmount(player, "CRIMSON_MANTLE_POWER")) + (powerAmount(player, "INFERNO_POWER") > 0 ? 1 : 0),
    retaliate: powerAmount(player, "FLAME_BARRIER_POWER") + powerAmount(player, "THORNS_POWER"),
    turnStartAoe: turnStartAoe(relicIds, player),
    inferno: powerAmount(player, "INFERNO_POWER"),
    demonTongue: relicIds.includes("DEMON_TONGUE") && env.screenMemory.demonTongueTurn !== `${hpGuardFight(env)}:${state.turn}`,
    helmetBlock: relicIds.includes("INTIMIDATING_HELMET") ? INTIMIDATING_HELMET_BLOCK : 0,
  };
  const kind = fightKind(combat, env);

  // 1. A committed plan whose board is exactly as expected: keep executing it.
  //    A hand that grew without a drawing card played means the plan was made before the turn's draw
  //    had landed (live runs: planned from 1–3 cards of 5): drop it and plan from the full hand.
  const memo = env.screenMemory.combatPlan;
  const handGrew = memo !== null && hand.length > memo.handLen;
  if (memo && !handGrew && memo.turn === state.turn && memo.remaining.length > 0 && memo.expectedHand === handSignature(hand)) {
    const next = memo.remaining[0]!;
    const intent = intentFor(next, hand);
    if (intent) {
      const nextCard = cardFor(next, hand);
      noteIntent(env, intent, nextCard);
      env.screenMemory.combatPlan =
        memo.remaining.length > 1 && (nextCard?.draw ?? 0) === 0
          ? { ...memo, remaining: memo.remaining.slice(1), expectedHand: handSignature(hand.filter((card) => card !== nextCard)), handLen: hand.length - 1 }
          : null;
      return {
        kind: "act",
        label: "combat/plan-continue",
        intent,
        rationale: `continuing the ${memo.via === "jev" ? "Jev-chosen" : memo.via === "deepseek" ? "DeepSeek-chosen" : memo.via === "claude" ? "Claude-chosen" : "code-chosen"} plan: ${stepText(next)}`,
      };
    }
  }
  env.screenMemory.combatPlan = null;

  const playable = hand.filter((card) => card.playable);
  if (playable.length === 0) {
    return { kind: "act", label: "combat/end_turn", intent: { action: "end_turn" }, rationale: "no playable cards; ending the turn" };
  }

  // Foul Potion hits us too (39J9: two drunk at 22 HP cost 12 of it); never drink it in a fight.
  const potionsAll = potionViews({ raw: asRecord(state.run?.raw) }, env.knowledge).filter(
    (potion) => potion.can_use && potion.potion_id !== "FOUL_POTION",
  );
  // Permanent max-HP potions have no timing value: drink them as soon as they can be used.
  const juice = potionsAll.find((potion) => potion.potion_id === "FRUIT_JUICE");
  if (juice) {
    return { kind: "act", label: "combat/potion-now", intent: { action: "use_potion", option_index: juice.slot }, rationale: `drinking ${juice.name} (permanent max HP, no reason to wait)` };
  }
  // Low HP in an elite fight, or in a hallway fight against two or more attackers, is when potions
  // are for: drink them like in a boss fight (7Q5G T5, Y83U F30: potions kept until the "emergency"
  // turn, when it was too late).
  const attackers = enemies.filter((enemy) => enemy.attacks.length > 0).length;
  const pressed =
    playerSim.maxHp > 0 && playerSim.hp < playerSim.maxHp * 0.4 && (kind === "elite" || (kind !== "boss" && attackers >= 2));
  // Boss potions are not free (1R3C F17 T1: cost 0 drank all three on a 7-damage turn): a small
  // base cost, plus what a defensive one is worth saving for a bigger hit next turn.
  const potionUseCost = pressed ? 0 : kind === "boss" ? BOSS_POTION_COST : kind === "elite" ? 5 : 15;
  // Defensive potions are worth saving when next turn's hit is expected to be bigger than this one
  // (Vantom: Fortifier spent on the 12-damage lance, then nothing left for the 28-damage Dismember).
  const nowIncoming = enemies.reduce((sum, enemy) => sum + enemy.attacks.reduce((s, a) => s + a.damage * a.hits, 0), 0);
  const nextIncoming = asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .reduce((sum, enemy) => sum + (expectedNextDamage(str(enemy["enemy_id"]), str(enemy["move_id"])) ?? 0), 0);
  const saveDefence = Math.max(0, nextIncoming - nowIncoming) * 0.6;
  // Boss fights: one potion a turn (unless it wins the fight or the turn ends below 30% HP).
  const potionsUsed = potionsUsedThisTurn(env, potionViews({ raw: asRecord(state.run?.raw) }, env.knowledge).length);
  const potionLimit = kind === "boss" ? Math.max(0, BOSS_POTIONS_PER_TURN - potionsUsed) : null;
  const wither = witherInput(env, combat, hand, num(player["cards_played_this_turn"]));
  const drawPile = drawPileCards(state.raw);
  const raceEruption = asArray(combat["enemies"]).some((enemy) => eruptionRace(asRecord(enemy), playerSim.hp, state.turn ?? 1));
  const solveWith = (free: boolean) =>
    solveTurn({
      hand: [
        ...hand,
        ...potionsAll
          .map((potion) =>
            modelPotion(potion.potion_id, potion.name, potion.slot, potion.valid_targets, free ? 0 : potionUseCost + (DEFENSIVE.has(potion.potion_id) ? saveDefence : 0)),
          )
          .filter((card): card is CardModel => card !== null),
      ],
      player: playerSim,
      enemies,
      fightKind: kind,
      turn: state.turn ?? 1,
      cardsPlayedThisTurn: num(player["cards_played_this_turn"]),
      potionLimit,
      raceEruption,
      wither,
      drawPile,
    });
  let solved = solveWith(false);
  // A turn that costs a lot of HP whatever is played is what potions are for, in any fight
  // (7Q5G/MD3F: hallway fights at -16..-46 HP with a potion kept in the belt): even the line that
  // keeps the most HP loses >= 30% of current HP, or leaves HP below 25% of max. Potions are free
  // then, and unmodelled ones are offered.
  const minLossAfter = (plans: Plan[]): number => Math.max(...plans.map((plan) => plan.outcome.hpAfter));
  const costly =
    solved.plans.length > 0 &&
    playerSim.maxHp > 0 &&
    (playerSim.hp - minLossAfter(solved.plans) >= playerSim.hp * 0.3 || minLossAfter(solved.plans) < playerSim.maxHp * 0.25);
  if (costly && !pressed && potionsAll.some((potion) => isModelledPotion(potion.potion_id))) solved = solveWith(true);
  const best = solved.plans[0];
  if (!best) return planCombatPerCard(env);

  const endNow = solved.plans.find((plan) => plan.steps.length === 0);
  const modSaysLethal = bool(combat["end_turn_will_kill_player"]);
  const calcNote =
    endNow && endNow.outcome.dies !== modSaysLethal
      ? ` [calc mismatch: solver says ending now ${endNow.outcome.dies ? "kills" : "does not kill"}, mod says ${modSaysLethal ? "lethal" : "safe"}]`
      : "";

  // 2. Nothing survives this turn as simulated. The per-card fallback did worse on a live run (Act 3
  //    boss: Jev defended card by card at 0.2 confidence). Play the plan that keeps the most HP — the
  //    estimate may be pessimistic (random draws, unmodelled relics) — and let potions come first.
  if (best.outcome.dies) {
    const potionsNow = potionViews({ raw: asRecord(state.run?.raw) }, env.knowledge).filter((potion) => potion.can_use && !isModelledPotion(potion.potion_id));
    if (potionsNow.length > 0) return planCombatPerCard(env);
    const leastLoss = solved.plans.reduce((a, b) => (b.outcome.hpAfter > a.outcome.hpAfter ? b : a));
    commit(env, state.turn, leastLoss, hand, "code");
    return {
      kind: "act",
      label: "combat/least-loss",
      intent: firstIntent(leastLoss, hand, env),
      rationale: `every simulated line dies; playing the one that keeps the most HP (${leastLoss.outcome.hpAfter}): ${leastLoss.steps.map(stepText).join(", ") || "end turn"}`,
    };
  }

  const cheapestAfter = Math.max(...solved.plans.filter((plan) => !plan.outcome.dies).map((plan) => plan.outcome.hpAfter), best.outcome.hpAfter);
  const potionCapped = potionLimit === 0 && cheapestAfter >= playerSim.maxHp * 0.3;
  const potions = potionCapped ? [] : potionsAll.filter((potion) => !isModelledPotion(potion.potion_id));
  const dangerous =
    best.outcome.hpLoss >= Math.max(12, playerSim.hp * 0.4) || (kind !== "monster" && kind !== "unknown" && best.outcome.hpLoss >= 10);

  // 3. Code-decided cases.
  if (best.outcome.winsFight) {
    commit(env, state.turn, best, hand, "code");
    return { kind: "act", label: "combat/lethal", intent: firstIntent(best, hand, env), rationale: `lethal: ${best.steps.map(stepText).join(", ")}${calcNote}` };
  }
  const surviving = solved.plans.filter((plan) => !plan.outcome.dies);
  const options = distinctPlans(surviving, MAX_OPTIONS);
  // The score-best plan can be dominated on every shown axis (its extra score is a power's flat value)
  // and so be missing from the options. YP9 T3: Crimson Mantle's line (hp -28) was committed as the
  // "only line" while the one option shown was the same turn with Defend+ (hp -20). Play what is shown.
  // Switch only to an option that dominates it (every outcome axis, sleep cost included: 1K5G F17 T1
  // switched to a line that woke the Matriarch), not merely the highest-ranked one left.
  const top = options.includes(best) ? best : options.find((plan) => dominates(plan, best)) ?? options[0] ?? best;
  // The mod says ending now is lethal but the solver thinks it is safe: the solver is missing
  // something (2WUM T7: Colossus halved twice, turn ended with 1 energy and 3 Defends in hand). Never
  // end the turn on the solver's word then; play the line that keeps the most HP.
  if (modSaysLethal && top.steps.length === 0) {
    const played = surviving.filter((plan) => plan.steps.length > 0);
    if (played.length > 0) {
      const safest = played.reduce((a, b) => (b.outcome.hpAfter > a.outcome.hpAfter || (b.outcome.hpAfter === a.outcome.hpAfter && b.outcome.blockGained > a.outcome.blockGained) ? b : a));
      commit(env, state.turn, safest, hand, "code");
      return {
        kind: "act",
        label: "combat/mod-lethal",
        intent: firstIntent(safest, hand, env),
        rationale: `mod says ending the turn is lethal, solver disagrees; not ending it: ${safest.steps.map(stepText).join(", ")}${calcNote}`,
      };
    }
  }
  const second = options.find((plan) => plan !== top);
  const clear = !second || top.score - second.score >= CLOSE_CALL;
  if (clear && !((dangerous || kind === "boss" || pressed || costly) && potions.length > 0)) {
    commit(env, state.turn, top, hand, "code");
    const margin = second
      ? `+${(top.score - second.score).toFixed(1)} over next`
      : surviving.length === 1
        ? "only line"
        : top === best
          ? "only distinct line"
          : "dominates the score-best line";
    return {
      kind: "act",
      label: "combat/plan",
      intent: firstIntent(top, hand, env),
      rationale: `code plan (${margin}): ${top.steps.length ? top.steps.map(stepText).join(", ") : "end turn"}; hp -${top.outcome.hpLoss}, dmg ${top.outcome.damageDealt}${calcNote}`,
    };
  }

  // 4. A judgement call (or a dangerous turn with potions available): ask Jev.
  const criteria: Record<string, string | null> = {};
  const byKey = new Map<string, { plan?: Plan; potion?: ActionRequest; label: string }>();
  options.forEach((plan, index) => {
    const key = `plan${index + 1}`;
    criteria[key] = JSON.stringify(describePlan(plan, playerSim.maxHp));
    byKey.set(key, { plan, label: plan.steps.map(stepText).join(", ") || "end turn" });
  });
  // Unmodelled potions are offered on dangerous turns, and always in boss fights (nothing to save them
  // for), when pressed at low HP, or when even the cheapest line costs a lot of HP.
  const offerPotions = dangerous || kind === "boss" || pressed || costly;
  if (offerPotions) {
    for (const potion of potions) {
      const targets: (number | null)[] = potion.requires_target ? potion.valid_targets : [null];
      for (const target of targets.slice(0, 2)) {
        const key = target === null ? potion.key : `${potion.key}->e${target}`;
        const enemyName = target === null ? null : enemies.find((enemy) => enemy.index === target)?.name ?? `enemy ${target}`;
        criteria[key] = JSON.stringify({
          plays: `drink ${potion.name}${enemyName ? ` on ${enemyName}` : ""} first, then re-plan the turn`,
          text: potion.text,
          note: `the cheapest card plan alone loses ${Math.min(...options.map((plan) => plan.outcome.hpLoss))} HP this turn`,
        });
        byKey.set(key, {
          potion: target === null ? { action: "use_potion", option_index: potion.slot } : { action: "use_potion", option_index: potion.slot, target_index: target },
          label: `drink ${potion.name}`,
        });
      }
    }
  }

  const questionState: Record<string, JsonValue> = {
    run_brief: briefJson(env.brief),
    fight: kind,
    situation: {
      turn: state.turn,
      hp: `${playerSim.hp}/${playerSim.maxHp}`,
      block: playerSim.block,
      energy: playerSim.energy,
      incoming_if_i_do_nothing: endNow?.outcome.incomingAfterBlock ?? null,
    },
    player: playerJson(player, env.knowledge),
    enemies: asArray(combat["enemies"])
      .map(asRecord)
      .filter((enemy) => enemy["is_alive"] !== false)
      .map((enemy) => ({
        name: str(enemy["name"]),
        hp: `${num(enemy["current_hp"])}/${num(enemy["max_hp"])}`,
        block: num(enemy["block"]),
        intents: asArray(enemy["intents"]).map((intent) => `${str(asRecord(intent)["intent_type"])} ${str(asRecord(intent)["label"])}`).join(", "),
        powers: asArray(enemy["powers"]).map((entry) => {
          const power = asRecord(entry);
          const amount = numOrNull(power["amount"]);
          return `${str(power["power_id"])}${amount === null ? "" : ` ${amount}`}${POWER_NOTES[str(power["power_id"])] ?? ""}`;
        }),
      })),
    note: "Each option is a whole turn, already simulated by code; its numbers are exact for this turn. Choose the one that is best for winning the whole fight, not just this turn.",
  };

  // resolve() is pure: it may run twice for one decision (Jev's answer, then the escalator's). The
  // loop runs `apply` once, for the resolution it actually plays.
  const fallback = (why: string): ResolvedAction => ({
    intent: firstIntent(top, hand, env),
    rationale: `${why}; using the code-best plan`,
    confidence: null,
    fallback: true,
    apply: () => commit(env, state.turn, top, hand, "code"),
  });

  return {
    kind: "ask",
    label: offerPotions && potions.length > 0 ? "combat/plan-choice+potion" : "combat/plan-choice",
    state: questionState,
    questions: { plan: choiceQ("Which plan should I play this turn?", criteria) },
    // Hallway, non-dangerous turns are not escalated: the supervisor picked code's rank-1 plan in 12 of
    // 15 such escalations, so a near-guess from Jev falls back to that plan instead (see resolve).
    ...(kind === "elite" || kind === "boss" || dangerous
      ? { escalate: { question: "plan", below: 0.5, why: `${kind} fight${dangerous ? ", dangerous turn" : ""}` } }
      : {}),
    resolve(answers): ResolvedAction {
      const answer = answers["plan"];
      if (!answer || answer.type !== "choice") return fallback("no usable answer from Jev");
      const chosen = byKey.get(answer.choice);
      if (!chosen) return fallback(`Jev chose unknown option "${answer.choice}"`);
      if (chosen.potion) {
        return {
          intent: chosen.potion,
          rationale: `Jev chose to ${chosen.label} (confidence ${answer.confidence.toFixed(2)})`,
          confidence: answer.confidence,
          fallback: false,
          apply: () => {
            env.screenMemory.combatPlan = null;
          },
        };
      }
      const picked = chosen.plan!;
      const hallway = !(kind === "elite" || kind === "boss" || dangerous);
      const escalatedBy = answer.raw === undefined ? undefined : (answer.raw as { escalated?: "deepseek" | "claude" }).escalated;
      if (hallway && answer.confidence < 0.3 && picked !== top && answer.raw !== undefined && !escalatedBy) {
        return fallback(`Jev near-guess (${answer.confidence.toFixed(2)}) on a hallway turn`);
      }
      // Boss/elite/dangerous choices: the guard, with a per-fight budget for the extra HP accepted.
      // This turn's own earlier entry (a re-plan) is replaced, so it does not count against this choice.
      const memo = env.screenMemory.hpGuard;
      const thisTurn = memo && memo.fight === hpGuardFight(env) ? (memo.turns[String(state.turn ?? "?")] ?? 0) : 0;
      const slack = hpGuardSlack(playerSim.hp, kind, hallway ? 0 : hpGuardExtra(env) - thisTurn);
      const replacement = hallway ? null : hpGuardReplacement(picked, options, playerSim.hp, slack);
      const plan = replacement ?? picked;
      const extra = plan.outcome.winsFight ? 0 : Math.max(0, plan.outcome.hpLoss - Math.min(...options.map((option) => option.outcome.hpLoss)));
      const rank = options.indexOf(plan) + 1;
      const guardNote = replacement
        ? `; HP guard: plan ${options.indexOf(picked) + 1} (${chosen.label}) loses ${picked.outcome.hpLoss} HP, more than ${slack.toFixed(0)} over the cheapest line${slack === 0 ? ` (this fight already took ${HP_GUARD_FIGHT_BUDGET}+ extra HP)` : ""}, playing plan ${rank} (${plan.steps.map(stepText).join(", ") || "end turn"}; hp -${plan.outcome.hpLoss}) instead`
        : "";
      return {
        intent: firstIntent(plan, hand, env),
        rationale: `Jev chose plan ${options.indexOf(picked) + 1}/${options.length} (${chosen.label}) with confidence ${answer.confidence.toFixed(2)}; code rank ${options.indexOf(picked) + 1}${guardNote}${calcNote}`,
        confidence: answer.confidence,
        fallback: false,
        ...(replacement ? { guard: { kind: "hp" as const, choice: `plan${rank}`, plan: plan.steps.map(stepText).join(", ") || "end turn" } } : {}),
        apply: () => {
          commit(env, state.turn, plan, hand, escalatedBy ?? "jev");
          if (!hallway) recordHpGuard(env, state.turn, extra);
        },
      };
    },
  };
}

/** Cards that exhaust a card of our choosing (a Wound, a Burn) from the hand. */
const EXHAUST_PICKERS = new Set(["BURNING_PACT"]);

/**
 * A card worth playing on a phase boss's revive turn (no enemy to target, no attack coming): exhaust
 * a Status/Curse first, then powers, then playable Status cards (they exhaust themselves), then block
 * when it carries over. null when nothing has value: end the turn.
 */
export function phaseSetupCard(hand: CardModel[], energy: number, keepsBlock: boolean): { card: CardModel; why: string } | null {
  const affordable = hand.filter((card) => card.playable && !card.xCost && card.cost <= energy && card.target !== "single");
  const junk = hand.filter((card) => card.type === "Status" || card.type === "Curse");
  if (junk.length > 0) {
    // Unupgraded True Grit exhausts at random: only when everything else is junk.
    const picker = affordable.find(
      (card) =>
        EXHAUST_PICKERS.has(card.cardId) ||
        (card.cardId === "TRUE_GRIT" && (card.upgraded || hand.every((other) => other === card || other.type === "Status" || other.type === "Curse"))),
    );
    if (picker) return { card: picker, why: `playing ${picker.name} to exhaust ${junk[0]!.name}` };
  }
  const power = affordable.find((card) => card.type === "Power");
  if (power) return { card: power, why: `playing the power ${power.name}` };
  const status = affordable.find((card) => card.type === "Status");
  if (status) return { card: status, why: `playing ${status.name} to clear it` };
  if (keepsBlock) {
    const block = affordable.find((card) => card.block > 0 && card.damage === null);
    if (block) return { card: block, why: `playing ${block.name} (block carries over)` };
  }
  return null;
}

/**
 * Cards still playable this turn: Sloth caps plays at its amount; Ringing (Ceremonial Beast's
 * 昏眩, 8LQGV1EFQDVX) allows one card this turn. null = no cap.
 */
function playCap(player: Record<string, unknown>): number | null {
  const caps: number[] = [];
  if (powerAmount(player, "SLOTH_POWER") > 0) caps.push(powerAmount(player, "SLOTH_POWER"));
  if (powerAmount(player, "RINGING_POWER") > 0) caps.push(1);
  if (caps.length === 0) return null;
  return Math.max(0, Math.min(...caps) - num(player["cards_played_this_turn"]));
}
