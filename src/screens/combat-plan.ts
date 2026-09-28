/**
 * Combat, turn-planned (phase 2). Division of labour (Dai 2026-09-28):
 *
 *   code     — enumerates every play order for the hand, simulates the turn, and gives each distinct
 *              line its exact facts (HP lost, damage, block, kills, setup, what a potion drunk now
 *              saves and what holding it means for the boss, kill ETA) and a reference rank under
 *              balanced weights. It plays alone only a lethal line, the only line that survives, or
 *              a line every other line is dominated by; a line that certainly dies is never offered
 *              while one survives.
 *   DeepSeek — the fight's objective, kill order and potion timing, as guidance (strategy lines).
 *   Jev      — chooses the line (and any potion) every other turn, seeing both. Code never swaps
 *              Jev's pick (the HP guard, the reserve filter and the low-confidence potion vetoes are
 *              facts on the options now).
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
import type { GameState } from "../mod/schema.js";
import type { Knowledge } from "../knowledge/index.js";
import { playerJson, potionViews } from "../project/narrow.js";
import { briefJson, combatBriefJson } from "../project/run-brief.js";
import { selectHints } from "../knowledge/jev-hints.js";
import type { AskDecision, CombatPlanMemo, Decision, DecisionEnv, ResolvedAction } from "../project/types.js";
import { awakeDamagePerTurn, expectedHitsAhead, expectedNextDamage, maxMoveDamage, nextDamageWithGrowth } from "../knowledge/move-model.js";
import { drinkFirstSafe, expectedDraw, potionRegen, heldPenaltyOf, isGeneratedStep, isModelledPotion, modelHandCard, modelPotion, pileCardPick, stripVigor, type CardModel } from "../strategy/card-model.js";
import { BLOOD_POTION_HEAL, distinctPlans, dominates, drawsCards, sandpitTurnValue, solveTurn, WAKE_MARGIN, type DrawPileCard, type EnemySim, type Plan, type PlayerSim, type SolverInput, type Step } from "../strategy/turn-solver.js";
import { asArray, asRecord, bool, num, numOrNull, str, type JsonValue } from "../util/json.js";
import { planCombat as planCombatPerCard } from "./combat.js";
import { currentRunPlan, type RunPlan } from "../strategy/run-plan.js";
import { expectedLossPerTurn, fightFocus, fightKey, type FightPlan } from "../strategy/fight-plan.js";
import { combatFit, objectiveInForce, LABEL_NOTE, objectiveDamage, potionOptionFit, potionRole, ROCK_POTION, type LineField, type SandpitField, intentLines, isReserved, reserveFact, setupRisksDeath } from "../strategy/intent.js";
import { ROLE_NOTE } from "./pick.js";
import { forcedEliteWithin } from "./rest.js";
import { bossNeed, deckBlockPerTurn, deckDamagePerTurn } from "../strategy/boss-clock.js";

/** Boss race behind the clock: a line adding at least this share of a turn's need… */
export const BOSS_RACE_MIN_SHARE = 0.25;
/** …(and at least this much damage)… */
export const BOSS_RACE_MIN_DAMAGE = 5;
/** …for HP up to its worth at the race's exchange rate, or up to this share of max HP. */
export const BOSS_RACE_HP_SHARE = 0.1;

/**
 * Act boss behind its clock: whether a line dealing `extraDamage` more for `extraLoss` more HP than the
 * safest line pays at the race's exchange rate (a fact on the line; it used to decide whether the HP
 * guard swapped it). Proportional (M9PL F33 T3: 19 more damage for 6 HP with the crab needing ~58 a
 * turn; T86W F17 T4): the extra damage must be a real part of a turn's need (BOSS_RACE_MIN_SHARE), and
 * the HP it costs at most what that damage is worth at our HP per boss HP, or BOSS_RACE_HP_SHARE of max HP.
 */
export function bossRaceTrade(t: { extraDamage: number; extraLoss: number; hp: number; maxHp: number; bossHpLeft: number; needPerTurn: number }): boolean {
  if (t.extraDamage < Math.max(BOSS_RACE_MIN_DAMAGE, BOSS_RACE_MIN_SHARE * t.needPerTurn)) return false;
  const exchange = (t.extraDamage * t.hp) / Math.max(1, t.bossHpLeft);
  return t.extraLoss <= Math.max(exchange, BOSS_RACE_HP_SHARE * t.maxHp);
}
/**
 * A line drinking a potion at 0 energy that gains nothing this turn over the potion-free lines: no less
 * HP lost, no more damage dealt, no win (GZ24 F8 T1: Dexterity Potion at 0 energy, 0 block from it). A
 * line that plays the card a potion puts in hand is not idle: that card is free now and its setup starts
 * a turn earlier (EGX7 F31 T1: "potion Power Potion, card from Power Potion" ended the rank-1 line, was
 * dropped at 0 energy twice, and Feel No Pain came a turn late; N7KR F8, the same function).
 */
export function zeroEnergyDrinkIdle(plan: Plan, dry: Plan[]): boolean {
  if (dry.length === 0 || plan.outcome.winsFight || !plan.steps.some((step) => step.cardId.startsWith("POTION:"))) return false;
  if (plan.steps.some((step) => isGeneratedStep(step.cardId)) && plan.outcome.lasting > Math.max(...dry.map((entry) => entry.outcome.lasting))) return false;
  const bestLoss = Math.min(...dry.map((entry) => entry.outcome.hpLoss));
  const bestDamage = Math.max(...dry.map((entry) => entry.outcome.damageDealt));
  return plan.outcome.hpLoss >= bestLoss && plan.outcome.damageDealt <= bestDamage;
}

/** A living enemy as later turns see it: its hit a turn once awake and the turns it still sleeps. */
export interface Foe {
  index: number;
  minion: boolean;
  sleepLeft: number;
  hit: number;
}

export function foesOf(enemies: Record<string, unknown>[]): Foe[] {
  return enemies.map((enemy) => ({
    index: num(enemy["index"]),
    minion: asArray(enemy["powers"]).some((power) => str(asRecord(power)["power_id"]) === "MINION_POWER"),
    sleepLeft: Math.max(powerAmount(enemy, "ASLEEP_POWER"), powerAmount(enemy, "SLUMBER_POWER")),
    hit: awakeDamagePerTurn(str(enemy["enemy_id"]))?.perTurn ?? asArray(enemy["intents"]).map(asRecord).reduce((sum, intent) => sum + num(intent["damage"]) * Math.max(1, num(intent["hits"])), 0),
  }));
}

/** Average hit a turn over the next `turns` enemy turns, each sleeper from the turn it wakes (t >= sleepLeft). */
export function incomingUntil(foes: Foe[], turns: number): number {
  let total = 0;
  for (let t = 1; t <= turns; t += 1) total += foes.reduce((sum, foe) => sum + (t < foe.sleepLeft ? 0 : foe.hit), 0);
  return turns > 0 ? total / turns : 0;
}

/** Longest HP clock counted (turns). */
export const HP_CLOCK_MAX = 30;

/**
 * Our HP clock: the turns we still play, this one included, before the enemies' expected hits take the
 * HP a line leaves (`hpAfter`, after this turn's hit), block not counted. Next turn's hit is nextHitOf;
 * later ones follow each enemy's likely move chain (move-model expectedHitsAhead), else its awake
 * average once it wakes. FEY6 F17 T6: 17 HP, Soul Siphon (0) then Slash (~21): 3 turns, against the
 * dossier clock's 7.
 */
export function hpClockTurns(enemies: Record<string, unknown>[], hpAfter: number): number {
  if (hpAfter <= 0) return 1;
  const alive = enemies.filter((enemy) => enemy["is_alive"] !== false && num(enemy["current_hp"], 1) > 0);
  const foes = foesOf(alive);
  const chains = alive.map((enemy) => expectedHitsAhead(str(enemy["enemy_id"]), str(enemy["move_id"]), HP_CLOCK_MAX) ?? []);
  let taken = 0;
  for (let t = 1; t <= HP_CLOCK_MAX; t += 1) {
    taken += alive.reduce((sum, enemy, i) => {
      if (t === 1) return sum + (nextHitOf(enemy) ?? chains[i]![0] ?? 0);
      const foe = foes[i]!;
      return sum + (chains[i]![t - 1] ?? (t < foe.sleepLeft ? 0 : foe.hit));
    }, 0);
    if (taken >= hpAfter) return 1 + t;
  }
  return Infinity;
}

/**
 * HP left to lose until every non-minion dies, from the enemy HP a line leaves: each later turn deals
 * `perTurn` (the kill-priority enemy first, then the lowest HP, overflow carried on), then every living
 * awake enemy hits, less the deck's block a turn.
 */
export function lossUntilKill(foes: Foe[], hpAfter: { index: number; hp: number }[], perTurn: number, blockPerTurn: number, focusIndex: number | null = null): number {
  const alive = foes.map((foe) => ({ ...foe, hp: hpAfter.find((after) => after.index === foe.index)?.hp ?? 0 })).filter((foe) => foe.hp > 0);
  let loss = 0;
  for (let t = 1; t <= 30 && alive.some((foe) => foe.hp > 0 && !foe.minion); t += 1) {
    let damage = Math.max(1, perTurn);
    const order = alive.filter((foe) => foe.hp > 0).sort((a, b) => Number(b.index === focusIndex) - Number(a.index === focusIndex) || Number(a.minion) - Number(b.minion) || a.hp - b.hp);
    for (const foe of order) {
      const dealt = Math.min(foe.hp, damage);
      foe.hp -= dealt;
      damage -= dealt;
      if (damage <= 0) break;
    }
    if (!alive.some((foe) => foe.hp > 0 && !foe.minion)) break;
    loss += Math.max(0, alive.reduce((sum, foe) => sum + (foe.hp > 0 && t >= foe.sleepLeft ? foe.hit : 0), 0) - blockPerTurn);
  }
  return loss;
}

/**
 * A line with its order-free potions (card-model drinkFirstSafe: Strength, Dexterity, Block, Energy...)
 * moved before its first card. The solver may place such a drink at the line's end, after the energy is
 * spent; a kill mid-line then re-plans at 0 energy, where the drink "adds nothing this turn" and is
 * dropped (N7KR F8 T2/T3: "Hammer, Dexterity Potion" rank 1 for its lasting Dexterity, the potion
 * dropped twice after Hammer killed an eel, drunk at 6 HP on T4). Drunk first it is played as shown.
 */
export function potionsFirst(plan: Plan): Plan {
  const firstCard = plan.steps.findIndex((step) => !step.cardId.startsWith("POTION:"));
  if (firstCard < 0) return plan;
  const moves = plan.steps.filter((step, index) => index > firstCard && step.cardId.startsWith("POTION:") && drinkFirstSafe(step.cardId.split(":")[1] ?? ""));
  if (moves.length === 0) return plan;
  const rest = plan.steps.filter((step) => !moves.includes(step));
  return { ...plan, steps: [...rest.slice(0, firstCard), ...moves, ...rest.slice(firstCard)] };
}

/** Plans with the same steps (after reordering), the first kept. */
function dedupePlans(plans: Plan[]): Plan[] {
  const seen = new Set<string>();
  return plans.filter((plan) => {
    const id = plan.steps.map((step) => `${step.cardId}@${step.target ?? ""}`).join(",");
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** Enemy powers the solver models, or that do not change this turn's numbers. */
const MODELLED_ENEMY_POWERS = new Set([
  "VULNERABLE_POWER", "WEAK_POWER", "STRENGTH_POWER", "ARTIFACT_POWER", "INTANGIBLE_POWER", "SLIPPERY_POWER",
  "HARDENED_SHELL_POWER", "THORNS_POWER", "CURL_UP_POWER", "FLUTTER_POWER", "HARD_TO_KILL_POWER", "SLOW_POWER",
  "ILLUSION_POWER", "MINION_POWER", "TERRITORIAL_POWER", "PLOW_POWER", "ESCAPE_ARTIST_POWER", "PLATING_POWER",
  "SLUMBER_POWER", "INFESTED_POWER", "SWIPE_POWER", "IMBALANCED_POWER", "RITUAL_POWER", "SHRINK_POWER",
  "GUARDED_POWER", "SOAR_POWER", "SKITTISH_POWER", "REFLECT_POWER", "SUCK_POWER", "PAINFUL_STABS_POWER", "PAPER_CUTS_POWER",
  "CRAB_RAGE_POWER", "BURROWED_POWER", "RAMPART_POWER", "STEAM_ERUPTION_POWER", "REATTACH_POWER",
  "SANDPIT_POWER", "ASLEEP_POWER", "ENRAGE_POWER", "ADAPTABLE_POWER", "NEMESIS_POWER", "VITAL_SPARK_POWER", "RAVENOUS_POWER",
  // Surrounded's back attack is in the intents (backAttack in turn-solver.ts); left unmodelled, it cut
  // our damage by 20% (PLC F33 T8: Twin Strike 11x2 planned as 8x2, Crusher left at 2 not 8).
  "BACK_ATTACK_LEFT_POWER", "BACK_ATTACK_RIGHT_POWER", "WITHERING_PRESENCE_POWER", "DEMISE_POWER",
  // Terror Eel: stunned at half HP (`shriek`); left unmodelled it cut our damage by 20%.
  "SHRIEK_POWER",
  // Axebot: revives from Stock (`stock`); left unmodelled it cut our damage by 20% and a kill that only
  // revived it read as lethal three times (U6W7 F39).
  "STOCK_POWER",
  // Entomancer: a Dazed per hit (`dazedPerHit`); left unmodelled it cut our damage by 20% (M812 F28).
  "PERSONAL_HIVE_POWER",
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
  // Nemesis gives Intangible only every 2nd turn (ZANM F48: "many small hits" misled every turn).
  INTANGIBLE_POWER: " (while it lasts every hit and HP loss is reduced to 1: block or set up now, save big hits for the turns without it)",
  WITHERING_PRESENCE_POWER: " (every 6 cards I play, counted across turns, add an unplayable Wither to my hand: it deals its damage at the end of my turn while held, blockable, +3 each Increasing Intensity; play fewer, bigger cards)",
  ARTIFACT_POWER: " (each stack negates one debuff: Vulnerable, Weak, Demise, Strength loss; strip it with cheap debuffs before a debuff potion)",
  // XJWF F22: seven turns killing the Parafright, the Obscura 96 -> 76, dead at 13 HP.
  ILLUSION_POWER: " (illusion: back at full HP next turn even if killed; damage into it is wasted, killing it only cancels this turn's attack; it leaves when its summoner dies: hit the summoner)",
  STOCK_POWER: " (revives left: at 0 HP it comes straight back at full, higher max HP with Stock -1, and that turn does Boot Up (10 Block, +3 Strength, no attack), then attacks harder every turn; a kill with Stock left does NOT end the fight: its real HP is current HP + Stock x max HP, so block rather than race it)",
  SHRIEK_POWER: " (the first time its HP drops to this or below it is stunned: this turn's attack is cancelled)",
};

/** Solver cost of drinking a potion in a hallway fight (doubled right before a forced Elite). */
export const HALLWAY_POTION_COST = 15;
/** Deck cards that pay off on enemy Vulnerable (the solver weighs Vulnerable more with them). */
const VULNERABLE_PAYOFFS = new Set(["DISMANTLE", "BULLY", "MOLTEN_FIST", "DOMINATE"]);
/** Beating Remnant: at most this much HP lost in a turn. */
export const BEATING_REMNANT_CAP = 20;
/** Map node types a hallway fight is fought in. */
const FIGHT_NODES = ["Monster", "Unknown"];

/**
 * This fight's damage a turn so far (non-minion enemy HP lost over the turns since the first look), not
 * counting turns that began with every enemy asleep or intangible: neither the turn nor what it dealt
 * (from each turn's first-look HP, `turnHp`). FEY6 F17 T6: the T3 that woke the Matriarch for 36 was an
 * idle turn with its 36 still counted, 74 a turn read for 49. Null when there is nothing measured yet
 * (then the deck estimate stands in).
 */
export function measuredDamagePerTurn(
  start: { hp?: number; turn?: number; idle?: number[]; turnHp?: Record<string, number> } | undefined,
  enemyHpNow: number,
  turn: number,
): number | null {
  if (start?.hp === undefined || start.turn === undefined || turn <= start.turn || start.hp <= enemyHpNow) return null;
  const idleTurns = (start.idle ?? []).filter((entry) => entry >= start.turn! && entry < turn);
  const turns = turn - start.turn - idleTurns.length;
  // What each idle turn dealt: its first-look HP less the next turn's (now, for last turn).
  const hpAt = (t: number): number | undefined => (t === turn ? (start.turnHp?.[String(t)] ?? enemyHpNow) : start.turnHp?.[String(t)]);
  const idleDealt = idleTurns.reduce((sum, t) => {
    const before = t === start.turn ? (hpAt(t) ?? start.hp!) : hpAt(t);
    const after = hpAt(t + 1);
    return before === undefined || after === undefined ? sum : sum + Math.max(0, before - after);
  }, 0);
  const dealt = start.hp - enemyHpNow - idleDealt;
  return turns > 0 && dealt > 0 ? dealt / turns : null;
}

/** Below this HP fraction potions cost nothing in the reference rank of any non-boss fight. */
export const LOW_HP_POTIONS = 0.25;

/**
 * Potions are for now (reference rank: they cost nothing): below 40% HP in an elite fight or a hallway
 * fight against 2+ attackers, and below 25% in any non-boss fight, whatever the attackers (XMY2 F24:
 * 19/80 against one Hunter Killer, no line drank them until every line died).
 */
export function pressedAt(hp: number, maxHp: number, kind: SolverInput["fightKind"], attackers: number): boolean {
  if (maxHp <= 0 || kind === "boss") return false;
  return hp < maxHp * LOW_HP_POTIONS || (hp < maxHp * 0.4 && (kind === "elite" || attackers >= 2));
}

/** Solver cost of drinking a potion (before any defensive saving). */
export function potionUseCostFor(kind: SolverInput["fightKind"], pressed: boolean, eliteNext: boolean): number {
  if (pressed) return 0;
  if (kind === "boss") return BOSS_POTION_COST;
  if (kind === "elite") return 5;
  return HALLWAY_POTION_COST * (eliteNext ? 2 : 1);
}

/** Solver cost of drinking a potion in a boss fight (before any defensive saving). */
export const BOSS_POTION_COST = 4;
/** Block/Weak potions: worth keeping for a bigger hit next turn (saveDefence). */
/** Potion text that blunts an enemy hit. */
const BLUNTS_HIT = /格挡|block|无实体|intangible|伤害减少|less damage|荆棘|thorns|虚弱|weak/i;
const DEFENSIVE = new Set(["FORTIFIER", "BLOCK_POTION", "SPEED_POTION", "LUCKY_TONIC", "SHIP_IN_A_BOTTLE", "WEAK_POTION", "POTION_OF_BINDING"]);

/**
 * Kill-first enemy when no fight plan names one, keyed by an enemy in the fight. The Queen: her Torch
 * Head Amalgam is a minion, so MINION_CHIP (turn-solver.ts) valued damage into it at 25% and code
 * hit the Queen while the Amalgam dealt every hit we took (CWU9 F48 T1-T3: 39 into the Queen, Amalgam
 * alive to T9; ZPPV, CAYK). The Kin need no entry: the chip already sends damage to the priest, whose
 * death ends the fight (WYF0 F17).
 */
export const DEFAULT_FOCUS: Record<string, string> = { QUEEN: "TORCH_HEAD_AMALGAM" };

export function defaultFocus(combat: Record<string, unknown>): string | null {
  const living = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false).map((enemy) => str(enemy["enemy_id"]));
  for (const id of living) {
    const focus = DEFAULT_FOCUS[id];
    if (focus && living.includes(focus)) return focus;
  }
  return null;
}

/** A line's HP change in a rationale: "hp -7", or "hp +2" when a heal outweighs the turn's loss. */
function hpText(loss: number): string {
  return loss < 0 ? `hp +${-loss}` : `hp -${loss}`;
}

/** Most distinct lines shown to Jev. */
const MAX_OPTIONS = 4;

function hpGuardFight(env: DecisionEnv): string {
  return `${str(asRecord(env.state.run?.raw)["act_id"])}:${env.state.run?.floor ?? "?"}`;
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
      ...(powerAmount(enemy, "ASLEEP_POWER") + powerAmount(enemy, "SLUMBER_POWER") > 0
        ? { wakeHit: Math.round((maxMoveDamage(str(enemy["enemy_id"])) ?? 0) + powerAmount(enemy, "STRENGTH_POWER")) || undefined }
        : {}),
      // Imbalanced: a fully blocked attack stuns it; what that saves is its next move's hit.
      ...(asArray(enemy["powers"]).some((power) => str(asRecord(power)["power_id"]) === "IMBALANCED_POWER")
        ? { imbalanced: Math.round(expectedNextDamage(str(enemy["enemy_id"]), str(enemy["move_id"])) ?? asArray(enemy["intents"]).map(asRecord).reduce((sum, intent) => sum + num(intent["damage"]) * Math.max(1, num(intent["hits"])), 0)) }
        : {}),
      vitalSpark: powerAmount(enemy, "VITAL_SPARK_POWER"),
      ravenous: powerAmount(enemy, "RAVENOUS_POWER"),
      // Waterfall Giant shows Buff on every move, but that is only Steam Eruption stacking: racing it
      // is what lost G7EJ and WQTRX (the explosion is modelled through `eruption` instead).
      // Any Strength already, not just this turn's Buff intent (6A36: Sludge Spinner's Rage +3 every
      // third turn went to Strength 9 while damage stayed at hallway weight). A Buff move anywhere in
      // the cycle was too broad: 56 of 101 enemies, most of whose buffs are not Strength.
      // The Queen's Buff (Burn Bright for Me) buffs her Amalgam, not herself (CWU9 F48: T3-T9 Buff only,
      // every hit taken from the Amalgam): read as her scaling it outweighed the kill-first bonus.
      scaling:
        str(enemy["enemy_id"]) !== "WATERFALL_GIANT" &&
        str(enemy["enemy_id"]) !== "QUEEN" &&
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
      // Plow (Ceremonial Beast): stunned the first time HP drops to its amount (150), like Shriek (RAWT
      // F17 T6: a Strike crossed 150 and cancelled a 26 Plow the solver had counted).
      shriek: Math.max(powerAmount(enemy, "SHRIEK_POWER"), powerAmount(enemy, "PLOW_POWER")),
      burrowed: powerAmount(enemy, "BURROWED_POWER") > 0,
      dazedPerHit: powerAmount(enemy, "PERSONAL_HIVE_POWER"),
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

/** Hallway enemies fought like elites. */
// Frog Knight: 199 HP + Plating, +5 Strength every 3rd turn; killed 7UJ1 (F37) and U6W7, cost 4 others 23-52 HP.
const HALLWAY_ELITES = new Set(["SLUMBERING_BEETLE", "LOUSE_PROGENITOR", "FROG_KNIGHT"]);

export function fightKind(combat: Record<string, unknown>, env: DecisionEnv): SolverInput["fightKind"] {
  let kind: SolverInput["fightKind"] = "unknown";
  for (const entry of asArray(combat["enemies"])) {
    const type = env.knowledge.monster(str(asRecord(entry)["enemy_id"]))?.type ?? "";
    if (type === "Boss") return "boss";
    if (type === "Elite") kind = "elite";
    // A hallway enemy with lives in stock (Axebot: 72 + 86 + 91 HP) is fought like an elite: fight
    // plan and HP guard (P4ZD F37: no guard, T5 took -9 for 13 damage, died 4 HP short).
    else if (type === "Normal" && powerAmount(asRecord(entry), "STOCK_POWER") > 0) kind = "elite";
    // Hallway fights that killed runs like elites: fight plan, potion plan, elite HP guard (the beetle
    // group 4 runs: 4V5T, 2VW5, NEVM, WM2X; Louse Progenitor 2: 3RWJ, 12ZG).
    else if (type === "Normal" && HALLWAY_ELITES.has(str(asRecord(entry)["enemy_id"])) && asRecord(entry)["is_alive"] !== false) kind = "elite";
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

function describePlan(plan: Plan, playerHp: number, hand: CardModel[] = []): Record<string, JsonValue> {
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
  if ((o.wakeHit ?? 0) > 0) summary["woken_enemy_hits_next_turn"] = `about ${o.wakeHit} more incoming next enemy turn (a sleeper this line wakes)`;
  // Powers pay off every later turn; without saying so the models swapped power lines for ones that
  // saved a few HP now (JEGBU7JHEL1A: Rupture and Crimson Mantle never played in a 379 HP boss fight).
  const heal = healPotionText(plan, playerHp);
  if (heal) summary["heal_potion"] = heal;
  if (o.lasting >= 5) {
    const forge = plan.steps.some((step) => step.cardId.startsWith("POTION:BLESSING_OF_THE_FORGE:"));
    const regen = plan.steps.some((step) => step.cardId.startsWith("POTION:REGEN_POTION:"));
    // A power is what pays off later; an unmodelled skill's flat nudge is not one (RTF3 F17 T1: Entrench
    // at 0 block read "sets up a power, lasting 7").
    const played = plan.steps.map((step) => hand.find((card) => card.index === step.cardIndex && card.cardId === step.cardId));
    const setsUp =
      played.some((card) => card !== undefined && (card.type === "Power" || card.strength > 0)) ||
      !played.some((card) => card !== undefined && !card.known && card.flatValue > 0);
    const what = forge ? "upgrades the hand for the fight" : regen ? "Regen heals on later turns (and any power set up)" : setsUp ? "sets up a power" : "unmodelled skill, flat value";
    summary["lasting_value"] = `${what}, worth about ${Math.round(o.lasting)} score over the fight${setsUp || forge || regen ? " (a few HP now is often worth it in a long fight)" : ""}`;
  }
  if ((o.stuns ?? []).length > 0) summary["stuns"] = `${o.stuns!.join(", ")}: its attack fully blocked (Imbalanced), it skips its next move (~${o.stunSaved ?? 0} damage saved next turn)`;
  if (o.sandpitAfter !== null) summary["sandpit_after_enemy_turn"] = o.sandpitAfter <= 0 ? `${o.sandpitAfter} (eaten: I DIE)` : o.sandpitAfter;
  if (o.unknownCards.length > 0) summary["unmodelled_cards"] = o.unknownCards.join(", ");
  return summary;
}

/**
 * A line's heal potion in numbers: "+16 HP now (Blood Potion), 35/80 (44%) -> 51/80 (64%)", or Regen's
 * heal at this turn's end and after. PKB0 F17 T4: the Regen Potion was offered as "fits hp: a heal
 * potion ... its effect is in no line's numbers" at 35/80, and Jev left it at 0.05 until 2 HP.
 */
export function healPotionText(plan: Plan, maxHp: number): string | null {
  const o = plan.outcome;
  const hp = o.hpAfter + o.hpLoss;
  if (maxHp <= 0) return null;
  const pct = (value: number) => `${value}/${maxHp} (${Math.round((100 * value) / maxHp)}%)`;
  const parts: string[] = [];
  let healed = hp;
  for (const step of plan.steps) {
    const id = step.cardId.split(":")[1] ?? "";
    if (!step.cardId.startsWith("POTION:")) continue;
    if (id === "BLOOD_POTION") {
      const gain = Math.min(maxHp - healed, Math.floor(maxHp * BLOOD_POTION_HEAL));
      healed += gain;
      parts.push(`+${gain} HP now (${step.name.replace(/^potion /, "")}, ${Math.round(BLOOD_POTION_HEAL * 100)}% of max HP)`);
    } else if (potionRegen(id) > 0) {
      const regen = potionRegen(id);
      const gain = o.winsFight ? 0 : Math.min(maxHp - healed, regen);
      healed += gain;
      const later = Array.from({ length: regen - 1 }, (_, i) => `+${regen - 1 - i}`).join(", ");
      parts.push(`+${gain} HP at this turn's end (${step.name.replace(/^potion /, "")}, Regen ${regen})${later ? `, then ${later} HP on the next turns while the fight lasts` : ""}`);
    }
  }
  return parts.length > 0 ? `${parts.join("; ")}: ${pct(hp)} -> ${pct(healed)} before the enemy turn` : null;
}

/** What the fact tags need to know about the board (JEV_CONTEXT=v1). */
export interface FactContext {
  maxHp: number;
  hand: CardModel[];
  enemies: EnemySim[];
  /** Expected attack damage next turn per enemy index (move model), null when unknown. */
  nextThreat: Map<number, number | null>;
  /** No living enemy shows an attack intent this turn. */
  noAttack: boolean;
}

/**
 * Literal facts about one plan, computed by code (M1, JEV_CONTEXT=v1). Jev reads things literally,
 * so the judgement ("this is a free turn to set up", "this line wastes block") is made here and
 * handed over as a fact rather than a rule for it to apply.
 */
export function planFacts(plan: Plan, ctx: FactContext): Record<string, JsonValue> {
  const o = plan.outcome;
  const cards = plan.steps.map((step) => ctx.hand.find((card) => card.index === step.cardIndex && card.cardId === step.cardId));
  const powers = plan.steps.filter((step, i) => !step.cardId.startsWith("POTION:") && cards[i]?.type === "Power").map((step) => step.name);
  const potions = plan.steps.filter((step) => step.cardId.startsWith("POTION:")).map((step) => step.name.replace(/^potion /, ""));
  const key = new Set(ctx.enemies.filter((enemy) => !enemy.minion && !enemy.illusion).map((enemy) => enemy.name));
  const keyKills = o.kills.filter((name) => key.has(name));
  // Next turn's expected hit, from the move model, for the enemies this line leaves alive; Weak the
  // line leaves on an enemy cuts its hit by a quarter.
  let threat = 0;
  let known = false;
  for (const enemy of ctx.enemies) {
    const after = o.enemyHpAfter.find((entry) => entry.index === enemy.index);
    if (o.winsFight || (after && after.hp <= 0)) continue;
    const next = ctx.nextThreat.get(enemy.index);
    if (next === null || next === undefined) continue;
    known = true;
    threat += next * ((after?.weak ?? 0) > 0 ? 0.75 : 1);
  }
  const scaling: string[] = [];
  if (o.strengthGained > 0) scaling.push(`+${o.strengthGained} permanent Strength`);
  if (powers.length > 0) scaling.push(`plays power ${powers.join(", ")}`);
  if (o.lasting >= 1) scaling.push(`lasting value ${Math.round(o.lasting)}`);
  return {
    hp_after: o.hpAfter,
    hp_after_pct: ctx.maxHp > 0 ? Math.round((o.hpAfter / ctx.maxHp) * 100) : null,
    dmg: o.damageDealt,
    lethal_now: o.winsFight ? "wins the fight" : keyKills.length > 0 ? `kills ${keyKills.join(", ")}` : "no",
    enemy_threat_next: o.winsFight ? 0 : known ? Math.round(threat) : "unknown",
    setup_turn: ctx.noAttack && powers.length > 0,
    scaling_gained: scaling.length > 0 ? scaling.join("; ") : "none",
    block_wasted: o.blockWasted ?? 0,
    potions_used: potions.length > 0 ? potions.join(", ") : "none",
  };
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
  // Throwing Axe replays the fight's first card, and Withering Presence counts the replay while
  // cards_played_this_turn does not (XWPV F48: every Wither came one card earlier than counted; T7's
  // plan stopped at two cards "before the 3rd adds a Wither", the 2nd added it). Counted from the start:
  // before any card the first one is already two.
  const axe = asArray(asRecord(env.state.run?.raw)["relics"]).some((relic) => str(asRecord(relic)["relic_id"]) === "THROWING_AXE");
  const played = Object.values(memo.perTurn).reduce((sum, count) => sum + count, 0) + (axe ? 1 : 0);
  return { every, played, damage: memo.witherDamage };
}

/** What the hand should look like after the first step of `plan` (for the commitment check). */
/**
 * The cards the next draws come from: agent_view.combat.draw, grouped lines like "打击*4 [1费]：…"
 * (count after "*"), or the discard pile when the draw pile is empty (it is shuffled in). undefined
 * when the state has neither (older mod, tests). XPA4 T8/T10: nothing read the piles, so Battle
 * Trance at 1 energy was "+9" with 3 Beckons in a 6-card pile.
 */
/** Cards in the exhaust pile (agent_view.combat.exhaust, grouped "name*N" lines), or undefined. */
export function exhaustPileSize(raw: Record<string, unknown>): number | undefined {
  return pileSize(raw, "exhaust");
}

/** Cards in the draw and discard piles together (what this turn's draws can bring in), or undefined. */
export function drawablePileSize(raw: Record<string, unknown>): number | undefined {
  const draw = pileSize(raw, "draw");
  const discard = pileSize(raw, "discard");
  return draw === undefined && discard === undefined ? undefined : (draw ?? 0) + (discard ?? 0);
}

/** Cards in one agent_view.combat pile (grouped "name*N" lines), or undefined when the view lacks it. */
export function pileSize(raw: Record<string, unknown>, which: "draw" | "discard" | "exhaust"): number | undefined {
  const pile = asRecord(asRecord(raw["agent_view"])["combat"])[which];
  if (pile === undefined) return undefined;
  return asArray(pile).reduce<number>((sum, entry) => sum + Number(/^[^[：:]*?\*(\d+)\s*\[/.exec(str(asRecord(entry)["line"]))?.[1] ?? 1), 0);
}

/**
 * Setup still to play: a power or permanent-Strength card in hand, or one in the draw pile (by the
 * deck's own model of that card id).
 */
export function setupLeft(state: GameState, hand: CardModel[], knowledge: Knowledge): boolean {
  const isSetup = (card: CardModel) => card.type === "Power" || card.strength > 0 || (card.strengthPerVulnerable ?? 0) > 0;
  if (hand.some((card) => card.playable && isSetup(card))) return true;
  const deckSetup = new Set(
    asArray(asRecord(state.run?.raw)["deck"])
      .map((entry, index) => {
        const model = modelHandCard(entry, index, knowledge);
        return model.type ? model : { ...model, type: str(asRecord(entry)["card_type"]) };
      })
      .filter(isSetup)
      .map((card) => card.cardId),
  );
  const draw = asArray(asRecord(asRecord(state.raw["agent_view"])["combat"])["draw"]);
  return draw.some((entry) => asArray(asRecord(entry)["card_ids"]).some((id) => deckSetup.has(str(id))));
}

/** Enemy attack damage coming this turn, less the block already up (as the selection screen reads it). */
function thisTurnIncoming(combat: Record<string, unknown>): number {
  const attacks = asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .reduce((sum, enemy) => sum + asArray(enemy["intents"]).map(asRecord).reduce((s, intent) => s + (numOrNull(intent["damage"]) ?? 0) * Math.max(1, numOrNull(intent["hits"]) ?? 1), 0), 0);
  return Math.max(0, attacks - (numOrNull(asRecord(combat["player"])["block"]) ?? 0));
}

/**
 * The cards of the discard or draw pile (agent_view lines, "*N" copies each) as hand cards: the deck's entry of that card
 * (upgraded when the line's name ends in "+"), with the game data's target, the board's Strength and Weak.
 */
export function pileCardModels(state: GameState, knowledge: Knowledge, pile: "discard" | "draw", ctx: { enemyTargets: number[]; strength: number; weak: boolean }): CardModel[] {
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  const deck = asArray(asRecord(state.run?.raw)["deck"]).map(asRecord);
  return asArray(view[pile]).flatMap((raw, position) => {
    const entry = asRecord(raw);
    const cardId = str(asArray(entry["card_ids"])[0]);
    if (!cardId) return [];
    const line = str(entry["line"]);
    const upgraded = /^[^[*：:]*?\+\s*(?:\*\d+\s*)?\[/.test(line);
    const own = deck.find((card) => str(card["card_id"]) === cardId && bool(card["upgraded"]) === upgraded) ?? deck.find((card) => str(card["card_id"]) === cardId) ?? { card_id: cardId, upgraded };
    const info = knowledge.card(cardId);
    const model = modelHandCard({ ...own, target_type: info?.target ?? "", requires_target: info?.target === "AnyEnemy", playable: true, index: 900 + position }, 900 + position, knowledge);
    const playable = model.type !== "Curse" && model.type !== "Status" && (model.xCost || model.cost >= 0);
    const card: CardModel = {
      ...model,
      playable,
      validTargets: model.target === "single" ? ctx.enemyTargets : [],
      damage: model.damage === null ? null : Math.floor((model.damage + ctx.strength) * (ctx.weak ? 0.75 : 1)),
    };
    // "剑柄打击*2 [1费]": one line per card id, with its count (drawPileCards reads it the same way).
    const count = Number(/^[^[：:]*?\*(\d+)\s*\[/.exec(line)?.[1] ?? 1);
    return Array.from({ length: Math.max(1, count) }, () => card);
  });
}

export function drawPileCards(raw: Record<string, unknown>): DrawPileCard[] | undefined {
  const view = asRecord(asRecord(raw["agent_view"])["combat"]);
  const parse = (pile: unknown): DrawPileCard[] =>
    asArray(pile).flatMap((entry) => {
      const line = str(asRecord(entry)["line"]);
      const count = Number(/^[^[：:]*?\*(\d+)\s*\[/.exec(line)?.[1] ?? 1);
      const cost = /\[(-?\d+|X)费\]/.exec(line)?.[1];
      const playable = cost !== "-1" && !/不能被打出|unplayable/i.test(line);
      const text = line.replace(/\[[^\]]*\]/g, "");
      const block = /获得\d+点格挡|gain \d+ block/i.test(text) && !/造成\d+点伤害|deal \d+ damage/i.test(text);
      const card: DrawPileCard = { playable, heldPenalty: heldPenaltyOf(line).heldPenalty, ...(block ? { block } : {}) };
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
  // Gambler's Brew draws what it draws: re-planned after it, like a draw.
  const firstCard = first ? cardFor(first, hand) : undefined;
  const drawsOrRandom = (firstCard?.draw ?? 0) + (firstCard?.special === "gamble" ? 1 : 0);
  env.screenMemory.plannedAfter = { turn, steps: plan.steps.slice(1) };
  env.screenMemory.drawCommit =
    via !== "code" && plan.steps.length > 1 && drawsOrRandom > 0
      ? { fight: fightKey(env.state), turn, via, steps: plan.steps.slice(1), enemies: livingEnemySignature(env.state.raw) }
      : undefined;
  if (first?.discards) env.screenMemory.gambleDiscards = { turn, cardIds: first.discards };
  env.screenMemory.combatPlan =
    plan.steps.length > 1 && drawsOrRandom === 0
      ? { turn, remaining: plan.steps.slice(1), expectedHand: expectedHandAfterFirst(plan, hand), handLen: hand.length - 1, via, enemies: livingEnemySignature(env.state.raw) }
      : null;
}

/** Whether `steps` play every one of `wanted` (card, upgrade and target; order free, extra plays allowed). */
export function playsAll(steps: Step[], wanted: Step[]): boolean {
  const key = (step: Step) => `${step.cardId}${step.upgraded ? "+" : ""}@${step.target ?? "-"}`;
  const left = steps.map(key);
  for (const step of wanted) {
    const at = left.indexOf(key(step));
    if (at < 0) return false;
    left.splice(at, 1);
  }
  return true;
}

/** Living enemies as "index:enemy_id", in order. */
export function livingEnemySignature(raw: Record<string, unknown>): string {
  return asArray(asRecord(raw["combat"])["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .map((enemy) => `${num(enemy["index"])}:${str(enemy["enemy_id"])}`)
    .join("|");
}

/**
 * Frantic Escapes the Sandpit race can count on: those in hand this turn's energy pays for (cheapest
 * first), plus one when the draw or discard pile holds any and this turn has a draw source (a draw
 * card or a draw potion) to fetch it. Escapes left in the piles are not turns in hand (X8HF F33 T5:
 * six in the discard pile counted as six turns, 218 / 8 read as a won race, the guard swapped ~79
 * damage for 15; one Escape was played all fight).
 */
export function franticEscapesLeft(raw: Record<string, unknown>, hand: CardModel[], energy = Infinity, drawSource = false): number {
  const view = asRecord(asRecord(raw["agent_view"])["combat"]);
  let count = 0;
  let spent = 0;
  for (const card of hand.filter((entry) => entry.cardId === "FRANTIC_ESCAPE" && entry.playable).sort((a, b) => a.cost - b.cost)) {
    if (spent + card.cost > energy) break;
    spent += card.cost;
    count += 1;
  }
  const inPiles = [view["draw"], view["discard"]].some((pile) =>
    asArray(pile).map(asRecord).some((entry) => str(asArray(entry["card_ids"])[0]) === "FRANTIC_ESCAPE"),
  );
  return count + (inPiles && drawSource ? 1 : 0);
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

/**
 * Hard rules on the surviving lines, before code ranks them and before any are shown to Jev/DeepSeek.
 * A line that wins the fight is always kept; a rule only applies when some line obeys it.
 *
 * - Sandpit >= 2 (THMG T5/T6, TTVY): a line that ends the enemy turn with the Sandpit at 1 leaves
 *   next turn a must-draw-Frantic-Escape turn; the solver's penalty alone did not stop the models
 *   picking it (THMG T6: the Sandpit-1 line carried lasting_value).
 * - Do not wake a sleeper (PYTG T2, KFP1 T1, Z2H3, 1K5G: the Matriarch woken four times): while an
 *   enemy is Asleep/Slumbering, lines that cost its free turns go when a non-waking line exists.
 */
export function hardRuleLines(plans: Plan[], enemies: EnemySim[]): Plan[] {
  let kept = plans;
  if (enemies.some((enemy) => (enemy.sandpit ?? 0) > 0)) {
    const deep = (plan: Plan) => plan.outcome.winsFight || plan.outcome.sandpitAfter === null || plan.outcome.sandpitAfter >= 2;
    if (kept.some((plan) => !plan.outcome.winsFight && deep(plan))) kept = kept.filter(deep);
  }
  // Asleep only (Lagavulin Matriarch: one HP lost wakes it and loses 2-3 sleep turns, 1K5G). Slumber
  // (Slumbering Beetle) drops by 1 per hit and wakes a turn early at most: its sleep cost stays a score
  // penalty (RC9A F27 T1: the filter removed every Howl from Beyond line, the only AoE; the bowlbugs
  // lived to T6 and the beetle woke at full HP anyway).
  const sleepers = enemies.filter((enemy) => (enemy.asleep ?? 0) > 0);
  if (sleepers.length > 0) {
    const hitsSleeper = (plan: Plan) =>
      sleepers.some((enemy) => (plan.outcome.enemyHpAfter.find((after) => after.index === enemy.index)?.hp ?? enemy.hp) < enemy.hp);
    const asleep = (plan: Plan) => plan.outcome.winsFight || plan.outcome.sleepCost <= 0 || !hitsSleeper(plan);
    if (kept.some((plan) => !plan.outcome.winsFight && asleep(plan))) kept = kept.filter(asleep);
  }
  return kept;
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
  // Free Attack (Unrelenting): the game shows every attack at 0, but only the next N are free. The
  // solver pays the real cost and gets N free attacks (NEVM F23 T2: an unaffordable Uppercut planned).
  const freeAttacks = powerAmount(player, "FREE_ATTACK_POWER");
  const hand = asArray(combat["hand"]).map((entry, index) => {
    const model = modelHandCard(entry, index, env.knowledge);
    const base = env.knowledge.card(model.cardId)?.cost ?? null;
    return freeAttacks > 0 && model.type === "Attack" && model.cost === 0 && base !== null && base > 0 ? { ...model, cost: base } : model;
  });
  // Evil Eye doubles when a card was exhausted this turn (with Baking Gloves that is every turn), or
  // earlier in the same line: the solver counts both (turn-solver exhaustedCount).
  const relicIds = asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  const exhaustsEveryTurn = relicIds.includes("TOASTY_MITTENS");
  const exhaustedThisTurn = exhaustsEveryTurn || num(player["cards_exhausted_this_turn"]) > 0;
  // Fiddle (and No Draw): nothing can be drawn mid-turn, so draw effects are worth nothing.
  const noDraw = relicIds.includes("FIDDLE") || powerAmount(player, "NO_DRAW_POWER") > 0;
  if (noDraw) {
    for (const card of hand) {
      card.draw = 0;
      card.drawsUntil = false;
    }
  }
  // Vigor is in every Attack's shown damage but spent by the first one (KFP1 F17 T1: 54 planned, 18 dealt).
  const vigor = powerAmount(player, "VIGOR_POWER");
  stripVigor(hand, vigor, powerAmount(player, "WEAK_POWER") > 0);
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
    freeAttacks,
    exhaustPile: exhaustPileSize(state.raw),
    ...(drawablePileSize(state.raw) !== undefined ? { drawable: drawablePileSize(state.raw) } : {}),
    // A Duplicator drunk earlier this turn: its next card is played twice (11LC F17 T2).
    duplicate: powerAmount(player, "DUPLICATION_POWER"),
    regen: powerAmount(player, "REGEN_POWER"),
    hp: num(player["current_hp"]),
    maxHp: num(player["max_hp"]),
    block: num(player["block"]),
    energy: num(player["energy"]),
    weak: powerAmount(player, "WEAK_POWER") > 0,
    vulnerable: powerAmount(player, "VULNERABLE_POWER") > 0,
    intangible: powerAmount(player, "INTANGIBLE_POWER") > 0,
    shrunk: powerAmount(player, "SHRINK_POWER") > 0,
    juggernaut: powerAmount(player, "JUGGERNAUT_POWER"),
    kusarigama: kusarigamaOf(state.run?.raw),
    rage: powerAmount(player, "RAGE_POWER"),
    keepsBlock: powerAmount(player, "BARRICADE_POWER") > 0 || powerAmount(player, "BLUR_POWER") > 0,
    gambit: powerAmount(player, "THE_GAMBIT_POWER") > 0,
    endTurnBlock: powerAmount(player, "PLATING_POWER") + powerAmount(player, "METALLICIZE_POWER"),
    rupture: powerAmount(player, "RUPTURE_POWER"),
    // Sloth caps cards per turn; Disintegration deals its amount at the end of every turn.
    maxPlays: playCap(player),
    // Constrict (Slithering Strangler) is the same end-of-turn damage (BHMP F6: 12 HP unpredicted).
    endTurnHpLoss: powerAmount(player, "DISINTEGRATION_POWER") + powerAmount(player, "CONSTRICT_POWER"),
    surrounded: powerAmount(player, "SURROUNDED_POWER") > 0,
    facing: env.screenMemory.facing ?? startFacing(combat),
    colossus: powerAmount(player, "COLOSSUS_POWER") > 0,
    // Inferno takes 1 HP at the start of each turn (and that loss is what makes it hit every enemy).
    startTurnHpLoss: mantleHpCost(powerAmount(player, "CRIMSON_MANTLE_POWER")) + (powerAmount(player, "INFERNO_POWER") > 0 ? 1 : 0),
    retaliate: powerAmount(player, "FLAME_BARRIER_POWER") + powerAmount(player, "THORNS_POWER"),
    turnStartAoe: turnStartAoe(relicIds, player),
    inferno: powerAmount(player, "INFERNO_POWER"),
    feelNoPain: powerAmount(player, "FEEL_NO_PAIN_POWER"),
    strengthNow: powerAmount(player, "STRENGTH_POWER"),
    // No card Block yet this turn (block 0 is the proxy): Unmovable's doubling is still to come.
    unmovableArmed: powerAmount(player, "UNMOVABLE_POWER") > 0 && num(player["block"]) === 0,
    demonTongue: relicIds.includes("DEMON_TONGUE") && env.screenMemory.demonTongueTurn !== `${hpGuardFight(env)}:${state.turn}`,
    helmetBlock: relicIds.includes("INTIMIDATING_HELMET") ? INTIMIDATING_HELMET_BLOCK : 0,
    hpLossCap: relicIds.includes("BEATING_REMNANT") ? BEATING_REMNANT_CAP : null,
    vigor,
    noBlock: powerAmount(player, "NO_BLOCK_POWER") > 0,
    tender: powerAmount(player, "TENDER_POWER"),
    exhaustedThisTurn,
  };
  const kind = fightKind(combat, env);
  // Withering Presence counts every card played: sample the count on every decision, plan-continue
  // included (Y0KJ F48: counted 15 by T7 against the game's 26; Hellraiser's auto-played Strikes and
  // the plan's later steps were missed, so Bash's Wither on T6 was not foreseen).
  const wither = witherInput(env, combat, hand, num(player["cards_played_this_turn"]));

  // 1. A committed plan whose board is exactly as expected: keep executing it.
  //    A hand that grew without a drawing card played means the plan was made before the turn's draw
  //    had landed (live runs: planned from 1–3 cards of 5): drop it and plan from the full hand.
  const memo = env.screenMemory.combatPlan;
  const handGrew = memo !== null && hand.length > memo.handLen;
  const sameEnemies = memo?.enemies === undefined || memo.enemies === livingEnemySignature(state.raw);
  if (memo && !handGrew && sameEnemies && memo.turn === state.turn && memo.remaining.length > 0 && memo.expectedHand === handSignature(hand)) {
    const next = memo.remaining[0]!;
    const intent = intentFor(next, hand);
    if (intent) {
      const nextCard = cardFor(next, hand);
      noteIntent(env, intent, nextCard);
      env.screenMemory.plannedAfter = { turn: memo.turn, steps: memo.remaining.slice(1) };
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
    // A hand of Dazed is not the end of the options: a potion can still block, draw or kill (CY8U F25
    // T7: 5/5 Dazed, Snecko Oil never considered, Bees 35 into 30 HP and 0 block).
    const rescue = noPlayRescuePotion(env, enemies, playerSim);
    if (rescue) return rescue;
    return { kind: "act", label: "combat/end_turn", intent: { action: "end_turn" }, rationale: "no playable cards; ending the turn" };
  }

  // Foul Potion hits us too (39J9: two drunk at 22 HP cost 12 of it); never drink it in a fight.
  const potionsAll = potionViews({ raw: asRecord(state.run?.raw) }, env.knowledge).filter(
    (potion) => potion.can_use && potion.potion_id !== "FOUL_POTION",
  );
  // DeepSeek's run plan and fight plan: guidance shown to Jev as strategy lines and tempo notes.
  const runPlan = activeRunPlan(env);
  const fightPlan = activeFightPlan(env);
  // The setup window is the fight's first turns, not a new boss phase's (YFG5 F48 T3: Test Subject's
  // phase 2 began on T3, Pyre+ for 4 damage over a 58-damage line at the same HP).
  const maxHpNow = enemies.filter((enemy) => !enemy.minion && enemy.hp > 0).reduce((sum, enemy) => sum + enemy.maxHp, 0);
  const fightId = fightKey(state);
  const enemyHpNow = enemies.filter((enemy) => !enemy.minion && enemy.hp > 0).reduce((sum, enemy) => sum + enemy.hp, 0);
  if (!env.screenMemory.fightStart || env.screenMemory.fightStart.fight !== fightId) env.screenMemory.fightStart = { fight: fightId, maxHp: maxHpNow, hp: enemyHpNow, turn: state.turn ?? 1, playerHp: playerSim.hp };
  // A turn that starts with every non-minion enemy asleep or intangible is no turn of this fight's damage
  // rate (T86W F17: the Matriarch slept T1-T3 for 1 damage; T4 read 1/3 a turn and "kills" in 700 turns).
  const turnHp = (env.screenMemory.fightStart.turnHp ??= {});
  if (turnHp[String(state.turn ?? 1)] === undefined) turnHp[String(state.turn ?? 1)] = enemyHpNow;
  const keyEnemies = enemies.filter((enemy) => !enemy.minion && enemy.hp > 0);
  if (keyEnemies.length > 0 && keyEnemies.every((enemy) => (enemy.asleep ?? 0) > 0 || (enemy.slumber ?? 0) > 0 || enemy.intangible)) {
    const idle = (env.screenMemory.fightStart.idle ??= []);
    if (!idle.includes(state.turn ?? 1)) idle.push(state.turn ?? 1);
  }
  const laterPhase = maxHpNow > env.screenMemory.fightStart.maxHp;
  const hpFrac = playerSim.maxHp > 0 ? playerSim.hp / playerSim.maxHp : 1;
  // A phase boss's later phases count toward the HP left (ZANM F48: phase 2 at 151 read as the whole
  // race; Test Subject is ~100/200/300).
  const laterPhases = (enemy: EnemySim) => (!enemy.revives ? 0 : enemy.maxHp <= 120 ? 500 : enemy.maxHp <= 220 ? 300 : Math.round(enemy.maxHp * 1.5));
  const bossHpLeft = enemies.filter((enemy) => !enemy.minion).reduce((sum, enemy) => sum + enemy.hp + laterPhases(enemy), 0);
  // Expected damage a turn: this fight's so far, else the deck estimate (boss-clock.ts).
  const fightTurn = state.turn ?? 1;
  const start = env.screenMemory.fightStart;
  const perTurn = measuredDamagePerTurn(start, enemyHpNow, fightTurn) ?? deckDamagePerTurn(state, env.knowledge);
  // HP lost a turn: this fight's so far, else the enemies' average hits less the deck's block.
  const measuredLoss =
    start.playerHp !== undefined && start.turn !== undefined && fightTurn > start.turn ? Math.max(0, (start.playerHp - playerSim.hp) / (fightTurn - start.turn)) : null;
  const grind = kind === "boss" ? null : { turnsToKill: perTurn > 0 ? bossHpLeft / perTurn : null, lossPerTurn: measuredLoss ?? expectedLossPerTurn(state, env.knowledge), hp: playerSim.hp };
  // How the fight reads now against DeepSeek's objective (a code note for Jev; weights stay balanced):
  // scale_then_kill past its window, a preserve_hp grind our HP cannot outlast (intent.ts objectiveInForce).
  const objectiveNow = objectiveInForce(fightPlan?.objective ?? null, {
    turnsLeft: perTurn > 0 ? bossHpLeft / perTurn : null,
    laterPhase,
    setupLeft: setupLeft(state, hand, env.knowledge),
    grind,
  });
  const objective = fightPlan?.objective ?? null;
  const need = kind === "boss" ? bossNeed(str(asRecord(state.run?.raw)["boss_id"]), state.run?.ascension ?? 0) : null;
  const clockTurnsLeft = need ? Math.max(1, need.turns - ((state.turn ?? 1) - 1)) : 1;
  // The act boss's clock now: HP left over the clock's turns left, against the deck's estimate.
  const bossClockNow = need ? { need: bossHpLeft / clockTurnsLeft, deck: deckDamagePerTurn(state, env.knowledge) } : null;
  const hpPolicy = runPlan?.hpPolicy ?? "balanced";
  // Petrified Toad refills a Potion-Shaped Rock every fight: a rock drunk now is free, and a slot freed
  // for a real potion (H7W0 F42-F48).
  const toadRock = (potionId: string) => potionId === ROCK_POTION && relicIds.includes("PETRIFIED_TOAD");
  // Permanent max-HP potions have no timing value: drink them as soon as they can be used.
  const juice = potionsAll.find((potion) => potion.potion_id === "FRUIT_JUICE");
  if (juice) {
    return { kind: "act", label: "combat/potion-now", intent: { action: "use_potion", option_index: juice.slot }, rationale: `drinking ${juice.name} (permanent max HP, no reason to wait)` };
  }
  // Low HP in an elite fight, or in a hallway fight against two or more attackers: potions cost nothing
  // in the reference rank (7Q5G T5, Y83U F30: potions kept until it was too late).
  const attackers = enemies.filter((enemy) => enemy.attacks.length > 0).length;
  const pressed = pressedAt(playerSim.hp, playerSim.maxHp, kind, attackers);
  // The reference rank's potion cost: small in a boss fight, a little more in an elite, most in a hallway
  // fight (twice right before a forced Elite: NZR7 F6). What DeepSeek holds for the boss is a fact on
  // the line, not a cost (it was +20 and a hard filter).
  const eliteNext = (kind === "monster" || kind === "unknown") && forcedEliteWithin(env.screenMemory, state, FIGHT_NODES, 1);
  const potionUseCost = potionUseCostFor(kind, pressed, eliteNext);
  // Defensive potions are worth saving when next turn's hit is expected to be bigger than this one
  // (Vantom: Fortifier spent on the 12-damage lance, then nothing left for the 28-damage Dismember).
  const nowIncoming = enemies.reduce((sum, enemy) => sum + enemy.attacks.reduce((s, a) => s + a.damage * a.hits, 0), 0);
  const nextIncoming = asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .reduce((sum, enemy) => sum + (nextHitOf(enemy) ?? 0), 0);
  // Whether next turn may attack at all: some living enemy's next move attacks, or is unknown to the model.
  const nextAttacks = asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .some((enemy) => (nextHitOf(enemy) ?? 1) > 0);
  const saveDefence = Math.max(0, nextIncoming - nowIncoming) * 0.6;
  // Several enemies can share the id (CWMP F7): the lowest-HP one of them, re-read each turn.
  const focusId = fightFocus(fightPlan, state) ?? defaultFocus(combat);
  const focusIndex = focusId
    ? numOrNull(
        asArray(combat["enemies"])
          .map(asRecord)
          .filter((enemy) => enemy["is_alive"] !== false && str(enemy["enemy_id"]) === focusId)
          .sort((a, b) => num(a["current_hp"]) - num(b["current_hp"]))[0]?.["index"],
      )
    : null;
  // A kill-first target only matters with more than one enemy alive.
  const focusInput = focusIndex !== null && enemies.length > 1 ? { focusIndex } : {};
  const drawPile = drawPileCards(state.raw);
  const raceEruption = asArray(combat["enemies"]).some((enemy) => eruptionRace(asRecord(enemy), playerSim.hp, state.turn ?? 1));
  // The Sandpit race (The Insatiable): what one more pit turn is worth, and whether the pit is no
  // longer than the kill (9V09 F33: a Frantic Escape counted 20 against ~49 a turn needed).
  const pitNow = Math.min(...enemies.filter((enemy) => enemy.hp > 0 && (enemy.sandpit ?? 0) > 0).map((enemy) => enemy.sandpit!));
  const pitClock = Number.isFinite(pitNow)
    ? sandpitTurnValue({
        bossHpLeft: enemies.filter((enemy) => !enemy.minion && enemy.hp > 0).reduce((sum, enemy) => sum + enemy.hp, 0),
        sandpit: pitNow,
        // The deck's realistic turn: this fight's measured rate, else the estimate (9LSQ F33: 24, not 49).
        deckPerTurn: perTurn > 0 ? perTurn : null,
        clockPerTurn: bossNeed(str(asRecord(state.run?.raw)["boss_id"]), state.run?.ascension ?? 0)?.perTurn ?? null,
        // The HP clock: turns our HP lasts at the larger of the measured and the expected loss a turn.
        hpTurns: playerSim.hp / Math.max(1, measuredLoss ?? 0, expectedLossPerTurn(state, env.knowledge)),
      })
    : null;
  // The board a card potion's card is played on (card-model GENERATED_CARD_POTIONS), and the pile card a
  // pile-card potion would take (Liquid Memories, Droplet of Precognition).
  const enemyTargets = enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.index);
  const pileContext = { enemyTargets, strength: playerSim.strengthNow ?? 0, weak: playerSim.weak };
  const beltIds = new Set(potionsAll.map((potion) => potion.potion_id));
  const pickFrom = (pile: "discard" | "draw", free: boolean) =>
    pileCardPick(pileCardModels(state, env.knowledge, pile, pileContext), thisTurnIncoming(combat), Math.max(1, enemyTargets.length), free, {
      ...(exhaustPileSize(state.raw) === undefined ? {} : { exhaustReach: (exhaustPileSize(state.raw) ?? 0) + hand.filter((card) => card.exhausts).length }),
      vulnerable: Math.max(0, ...enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.vulnerable)),
    });
  const potionContext = {
    ...pileContext,
    ...(beltIds.has("LIQUID_MEMORIES") ? { discardPick: pickFrom("discard", true) } : {}),
    ...(beltIds.has("DROPLET_OF_PRECOGNITION") ? { drawPick: pickFrom("draw", false) } : {}),
    // Gambler's Brew and Glowwater draw from the draw pile, or the discard pile reshuffled when it is
    // empty; Distilled Chaos plays its top cards from the same.
    ...(beltIds.has("GAMBLERS_BREW") || beltIds.has("DISTILLED_CHAOS") || beltIds.has("GLOWWATER_POTION")
      ? {
          expectedDraw: expectedDraw(
            (() => {
              const draw = pileCardModels(state, env.knowledge, "draw", pileContext);
              return draw.length > 0 ? draw : pileCardModels(state, env.knowledge, "discard", pileContext);
            })(),
            (potionsAll.find((potion) => potion.potion_id === "GAMBLERS_BREW") ?? potionsAll.find((potion) => potion.potion_id === "DISTILLED_CHAOS") ?? potionsAll.find((potion) => potion.potion_id === "GLOWWATER_POTION"))?.slot ?? 0,
          ),
        }
      : {}),
  };
  // Lines are shown and played with their order-free potions drunk first (potionsFirst).
  const solveWith = (free: boolean, withPotions: boolean | ((potion: (typeof potionsAll)[number]) => boolean) = true) => {
    const result = solveRaw(free, withPotions);
    return { ...result, plans: dedupePlans(result.plans.map(potionsFirst)) };
  };
  const solveRaw = (free: boolean, withPotions: boolean | ((potion: (typeof potionsAll)[number]) => boolean) = true) =>
    solveTurn({
      hand: [
        ...hand,
        ...(withPotions === true ? potionsAll : withPotions === false ? [] : potionsAll.filter(withPotions))
          .map((potion) =>
            modelPotion(
              potion.potion_id,
              potion.name,
              potion.slot,
              potion.valid_targets,
              free || toadRock(potion.potion_id) ? 0 : potionUseCost + (DEFENSIVE.has(potion.potion_id) ? saveDefence : 0),
              potionContext,
            ),
          )
          .filter((card): card is CardModel => card !== null)
          // Draw potions draw nothing under Fiddle either (GMT2 F38 T2: Swift Potion "draws 3", drew 0).
          .map((card) => (noDraw ? { ...card, draw: 0, drawsUntil: false } : card)),
      ],
      player: playerSim,
      enemies,
      fightKind: kind,
      turn: state.turn ?? 1,
      cardsPlayedThisTurn: num(player["cards_played_this_turn"]),
      raceEruption,
      wither,
      ...focusInput,
      // Distinct payoff cards, not copies (VHLZ F21: two Bully doubled Bash+'s weight, 16.5 vs 7.5).
      vulnerablePayoffs: new Set(asArray(asRecord(state.run?.raw)["deck"]).map((card) => str(asRecord(card)["card_id"])).filter((id) => VULNERABLE_PAYOFFS.has(id))).size,
      drawPile,
      ...(nextIncoming > 0 ? { nextIncoming } : {}),
      ...(pitClock ? { sandpitTurnDamage: pitClock.value, ...(Number.isFinite(pitClock.useful) ? { sandpitUsefulEscapes: pitClock.useful } : {}) } : {}),
    });
  let solved = solveWith(false);
  // A turn that costs a lot of HP whatever is played is what potions are for, in any fight
  // (7Q5G/MD3F: hallway fights at -16..-46 HP with a potion kept in the belt): even the line that
  // keeps the most HP loses >= 30% of current HP, or leaves HP below 25% of max. Potions are free
  // in the reference rank then, and unmodelled ones are offered.
  const minLossAfter = (plans: Plan[]): number => Math.max(...plans.map((plan) => plan.outcome.hpAfter));
  const costly =
    solved.plans.length > 0 &&
    playerSim.maxHp > 0 &&
    (playerSim.hp - minLossAfter(solved.plans) >= playerSim.hp * 0.3 || minLossAfter(solved.plans) < playerSim.maxHp * 0.25);
  if (costly && !pressed && potionsAll.some((potion) => isModelledPotion(potion.potion_id))) solved = solveWith(true);
  // A Toad's rock is not a potion to keep (it comes back next fight).
  const drinksPotion = (plan: Plan) => plan.steps.some((step) => step.cardId.startsWith("POTION:") && step.cardId !== `POTION:${ROCK_POTION}`);
  // A potion drunk at 0 energy that adds no block or damage this turn is worth the same next turn (GZ24
  // F8 T1): such a line is dominated by the potion-free line and dropped while one exists.
  if (playerSim.energy <= 0 && solved.plans.some(drinksPotion)) {
    const shownDry = solved.plans.filter((plan) => !drinksPotion(plan) && !plan.outcome.dies);
    const dry = shownDry.length > 0 ? shownDry : solveWith(false, false).plans.filter((plan) => !plan.outcome.dies);
    const kept = solved.plans.filter((plan) => !zeroEnergyDrinkIdle(plan, dry));
    if (dry.length > 0 && kept.length < solved.plans.length) solved = { ...solved, plans: [...kept, ...dry.filter((plan) => !kept.includes(plan))] };
  }
  const potionText = (potionId: string) => potionsAll.find((potion) => potion.potion_id === potionId)?.text ?? "";
  const heldForBoss = (potionId: string) => kind !== "boss" && !toadRock(potionId) && isReserved(runPlan?.reserve, potionId, potionText(potionId));
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
    // Pael's Eye: the first turn a fight ends with no card played, the hand is exhausted and an extra
    // turn follows (a fresh draw before the enemy acts). 12ZG F23 T6: never used, died to a 24 Pounce.
    if (relicIds.includes("PAELS_EYE") && num(player["cards_played_this_turn"]) === 0 && env.screenMemory.paelsEyeFight !== fightId) {
      env.screenMemory.paelsEyeFight = fightId;
      return { kind: "act", label: "combat/end_turn", intent: { action: "end_turn" }, rationale: "every line dies: ending the turn with no card played for Pael's Eye's extra turn" };
    }
    const potionsNow = potionViews({ raw: asRecord(state.run?.raw) }, env.knowledge).filter((potion) => potion.can_use && !isModelledPotion(potion.potion_id));
    if (potionsNow.length > 0) return planCombatPerCard(env);
    // A modelled draw potion (Swift, Clarity) is a draw source like a draw card: drunk first while
    // energy is left and the piles hold cards (X8HF F33 T6).
    const drawPotions = noDraw || playerSim.energy <= 0 || drawPile === undefined
      ? []
      : potionsAll
          .map((potion) => modelPotion(potion.potion_id, potion.name, potion.slot, potion.valid_targets, 0))
          .filter((card): card is CardModel => card !== null && drawsCards(card));
    const leastLoss = leastLossPlan(solved.plans, hand, playerSim.hp, drawPotions);
    const drinking = leastLoss.steps[0]?.cardId.startsWith("POTION:") === true && drawPotions.some((card) => card.cardId === leastLoss.steps[0]!.cardId);
    const drawing = drinking || (leastLoss.steps[0] !== undefined && hand.some((card) => card.index === leastLoss.steps[0]!.cardIndex && drawsCards(card)));
    commit(env, state.turn, leastLoss, hand, "code");
    // Re-planned after the drawn cards arrive.
    if (drinking) env.screenMemory.combatPlan = null;
    return {
      kind: "act",
      label: "combat/least-loss",
      intent: firstIntent(leastLoss, hand, env),
      rationale: drawing
        ? `every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg ${leastLoss.outcome.damageDealt}): ${leastLoss.steps.map(stepText).join(", ")}`
        : `every simulated line dies; playing the one that keeps the most HP (${leastLoss.outcome.hpAfter}): ${leastLoss.steps.map(stepText).join(", ") || "end turn"}`,
    };
  }

  // Unmodelled potions: offered as "drink first, then re-plan" options (a potion DeepSeek holds for the
  // boss too, with that fact).
  const potions = potionsAll.filter((potion) => !isModelledPotion(potion.potion_id));
  const dangerous =
    best.outcome.hpLoss >= Math.max(12, playerSim.hp * 0.4) || (kind !== "monster" && kind !== "unknown" && best.outcome.hpLoss >= 10);

  // 3. Code acts alone: an immediate win. Not with Tender on us: a lethal it makes one short is a turn
  // of the Hunter Killer's hits (LSWU F21 T5). A lethal that keeps a potion DeepSeek holds for the boss
  // beats one that drinks it (Z49J F24 T4): the same win, one potion more.
  if (best.outcome.winsFight && playerSim.tender === 0) {
    const spendsKept = (plan: Plan) =>
      plan.steps.some((step) => {
        const id = step.cardId.startsWith("POTION:") ? step.cardId.split(":")[1] ?? "" : "";
        return id !== "" && heldForBoss(id);
      });
    let lethal = best;
    if (spendsKept(best)) {
      const kept = (plans: Plan[]) => plans.find((plan) => plan.outcome.winsFight && !spendsKept(plan));
      lethal = kept(solved.plans) ?? kept(solveWith(false, (potion) => !heldForBoss(potion.potion_id)).plans) ?? best;
    }
    commit(env, state.turn, lethal, hand, "code");
    return {
      kind: "act",
      label: "combat/lethal",
      intent: firstIntent(lethal, hand, env),
      rationale: `lethal: ${lethal.steps.map(stepText).join(", ")}${lethal !== best ? " (keeps the potion DeepSeek holds for the boss: a lethal without it)" : ""}${calcNote}`,
    };
  }
  // Minimal safety: a line that wakes a sleeper into next turn and is left within its first hit (+ next
  // turn's other hits) risks death: dropped while a line without that risk survives (FH3M F30 T2).
  const wakeRisk = (plan: Plan) => !plan.outcome.winsFight && (plan.outcome.wakeHit ?? 0) > 0 && plan.outcome.hpAfter <= nextIncoming + (plan.outcome.wakeHit ?? 0) + WAKE_MARGIN;
  const alive = solved.plans.filter((plan) => !plan.outcome.dies);
  const surviving = hardRuleLines(alive.some((plan) => !wakeRisk(plan)) ? alive.filter((plan) => !wakeRisk(plan)) : alive, enemies);
  const options = distinctPlans(surviving, MAX_OPTIONS);
  // The score-best plan can be dominated on every shown axis (its extra score is a power's flat value)
  // and so be missing from the options (YP9 T3). The reference line is then an option that dominates it.
  const top = options.includes(best) ? best : options.find((plan) => dominates(plan, best)) ?? options[0] ?? best;
  // The mod says ending now is lethal but the solver thinks it is safe: the solver is missing
  // something (2WUM T7). Never end the turn on the solver's word then; play the line that keeps the most HP.
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
  // Setup value of a line: distinct powers played, plus one for permanent Strength gained (Dominate /
  // Molten Fist count only when the Vulnerable is there: WR2Y F33 T1, CWMP F7).
  const setupCount = (plan: Plan): number =>
    new Set(plan.steps.filter((step) => !step.cardId.startsWith("POTION:") && cardFor(step, hand)?.type === "Power").map((step) => step.cardId)).size +
    (plan.outcome.strengthGained > 0 ? 1 : 0);
  // Under DeepSeek's scale_then_kill, the line with the most setup that does not risk death is offered
  // in the first turns even when distinctPlans left it out (JF99 F33, 5BXM F33).
  const setupLine = objective === "scale_then_kill" && (state.turn ?? 1) <= 3 && !laterPhase
    ? surviving.filter((plan) => setupCount(plan) > setupCount(top) && !setupRisksDeath(plan.outcome.hpAfter, nextIncoming, playerSim.maxHp, nextAttacks)).sort((a, b) => setupCount(b) - setupCount(a) || b.score - a.score)[0]
    : undefined;
  if (setupLine && !options.includes(setupLine)) options.push(setupLine);
  // Unmodelled potions are always offered on a turn Jev is asked; they alone make a turn a question on
  // dangerous turns, in boss fights, when pressed at low HP, or when even the cheapest line costs a lot.
  const offerPotions = potions.length > 0 && (options.length > 1 || dangerous || kind === "boss" || pressed || costly);

  // Code acts alone: the only line left once every other is dominated on every outcome (distinctPlans).
  if (options.length === 1 && !offerPotions) {
    commit(env, state.turn, top, hand, "code");
    return {
      kind: "act",
      label: "combat/plan",
      intent: firstIntent(top, hand, env),
      rationale: `code plan (${surviving.length === 1 ? "only line" : top === best ? "every other line is dominated or the same outcome" : "dominates the score-best line"}): ${top.steps.length ? top.steps.map(stepText).join(", ") : "end turn"}; ${hpText(top.outcome.hpLoss)}, dmg ${top.outcome.damageDealt}${calcNote}`,
    };
  }

  // 3b. Jev's line of this turn was cut short by a draw: continued, not asked again, while a surviving
  // line plays all its remaining cards (the drawn cards may join) and no other line dominates it (FEY6
  // F6 T1: after each draw the re-ask got 0.46 and 0.47 for other lines, -16 instead of -9; X226). This
  // executes Jev's own choice; it is not code's rank that decides.
  const drawn = env.screenMemory.drawCommit;
  if (
    drawn &&
    drawn.fight === fightKey(state) &&
    drawn.turn === (state.turn ?? null) &&
    drawn.enemies === livingEnemySignature(state.raw) &&
    drawn.steps.length > 0 &&
    drawn.steps.every((step) => !step.cardId.startsWith("POTION:") && cardFor(step, hand) !== undefined)
  ) {
    const continued = surviving.find((plan) => !plan.steps.some((step) => step.cardId.startsWith("POTION:")) && playsAll(plan.steps, drawn.steps));
    if (continued && !surviving.some((other) => other !== continued && dominates(other, continued))) {
      const rank = surviving.indexOf(continued) + 1;
      commit(env, state.turn, continued, hand, drawn.via);
      return {
        kind: "act",
        label: "combat/plan-continue",
        intent: firstIntent(continued, hand, env),
        rationale: `continuing the ${drawn.via === "jev" ? "Jev" : drawn.via === "deepseek" ? "DeepSeek" : "Claude"}-chosen plan after the draw (its ${drawn.steps.map(stepText).join(", ")} still playable, undominated, code rank ${rank}): ${continued.steps.map(stepText).join(", ") || "end turn"}; ${hpText(continued.outcome.hpLoss)}, dmg ${continued.outcome.damageDealt}${calcNote}`,
      };
    }
  }
  env.screenMemory.drawCommit = undefined;

  // 4. Ask Jev, with every line's facts and its tempo note against DeepSeek's guidance.
  const focusDamage = (plan: Plan): number | null => {
    if (focusIndex === null) return null;
    const before = enemies.find((enemy) => enemy.index === focusIndex);
    const after = plan.outcome.enemyHpAfter.find((entry) => entry.index === focusIndex);
    return before && after ? Math.max(0, before.hp - after.hp) : null;
  };
  const escapesIn = (plan: Plan) => plan.steps.filter((step) => step.cardId === "FRANTIC_ESCAPE").length;
  const sandpitField: SandpitField | undefined = pitClock
    ? { turnValue: pitClock.value, behind: pitClock.behind, now: pitNow, turnsNeeded: pitClock.turnsNeeded, maxEscapes: Math.max(0, ...options.map(escapesIn)), ...(Number.isFinite(pitClock.useful) ? { useful: pitClock.useful } : {}) }
    : undefined;
  // The Queen's YOU_ARE_MINE turn is the last one before 99 Weak/Frail/Vulnerable on us: damage into the
  // Torch Head Amalgam is what matters, whatever the objective (H7W0 F48 T2).
  const queenBurst = youAreMineTurn(combat);
  const burstTarget = queenBurst ? enemies.find((enemy) => enemy.index === queenBurst.amalgamIndex) : undefined;
  const burstDamage = (plan: Plan): number => {
    if (!burstTarget) return 0;
    const after = plan.outcome.enemyHpAfter.find((entry) => entry.index === burstTarget.index)?.hp ?? 0;
    return Math.max(0, burstTarget.hp - Math.max(0, after));
  };
  // Code's reference line: its score-best line, unless another shown line beats it on HP and damage with
  // no less setup (PCGH F23 T4: "Bash+, Strike" -32 for 19 beside "Bash+, Headbutt" -13 for 21; its extra
  // score was lasting value); then the best-scoring such line. The rest follow by the balanced score.
  const objectiveDamageOf = (plan: Plan) => objectiveDamage({ damage: plan.outcome.damageDealt, escapes: escapesIn(plan) }, sandpitField);
  const beats = (other: Plan, plan: Plan) =>
    other.outcome.hpLoss <= plan.outcome.hpLoss && objectiveDamageOf(other) >= objectiveDamageOf(plan) && setupCount(other) >= setupCount(plan) &&
    (other.outcome.hpLoss < plan.outcome.hpLoss || objectiveDamageOf(other) > objectiveDamageOf(plan));
  const beatsTop = top.outcome.winsFight ? [] : options.filter((plan) => plan !== top && beats(plan, top) && !options.some((other) => other !== plan && beats(other, plan)));
  const referenceTop = beatsTop.length > 0 ? beatsTop.reduce((a, b) => (b.score > a.score ? b : a)) : top;
  const reference = [referenceTop, ...options.filter((plan) => plan !== referenceTop).sort((a, b) => b.score - a.score)];
  const field: LineField = {
    minLoss: Math.min(...options.map((plan) => plan.outcome.hpLoss)),
    best: { hpLoss: referenceTop.outcome.hpLoss, damage: objectiveDamageOf(referenceTop), setup: setupCount(referenceTop) },
    ...(burstTarget ? { burst: { target: burstTarget.name, maxDamage: Math.max(0, ...options.map(burstDamage)), why: "YOU_ARE_MINE: the last turn before 99 Weak/Frail/Vulnerable" } } : {}),
    maxDamage: Math.max(...options.map((plan) => objectiveDamage({ damage: plan.outcome.damageDealt, escapes: escapesIn(plan) }, sandpitField))),
    ...(sandpitField ? { sandpit: sandpitField } : {}),
    // Setup that risks death is no setup to prefer (intent.ts setupRisksDeath).
    maxSetup: Math.max(0, ...options.filter((plan) => !setupRisksDeath(plan.outcome.hpAfter, nextIncoming, playerSim.maxHp, nextAttacks)).map(setupCount)),
    focusName: enemies.find((enemy) => enemy.index === focusIndex)?.name ?? undefined,
    ...(objective && objectiveNow.objective && objectiveNow.objective !== objective ? { objectiveNote: `DeepSeek's ${objective}, read as ${objectiveNow.objective} now` } : {}),
  };
  const fitFor = (plan: Plan) =>
    combatFit(
      objectiveNow.objective ?? objective,
      hpPolicy,
      {
        hpLoss: plan.outcome.hpLoss,
        damage: plan.outcome.damageDealt,
        setup: setupCount(plan),
        winsFight: plan.outcome.winsFight,
        focusDamage: fightPlan ? focusDamage(plan) : null,
        escapes: escapesIn(plan),
        rank: reference.indexOf(plan) + 1,
        scoreGap: plan === referenceTop ? 0 : Math.max(0, referenceTop.score - plan.score),
        burstDamage: burstDamage(plan),
      },
      field,
    );
  // Later turns: when the kill comes at this fight's damage a turn, and the HP lost until then (each
  // living enemy's move-model hit once awake, less the deck's block a turn: NJSZ F25, G8F1 F30).
  const foes = foesOf(asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false));
  const blockPerTurn = deckBlockPerTurn(state, env.knowledge);
  const realDamage = (plan: Plan): number =>
    enemies
      .filter((enemy) => !enemy.minion && !enemy.illusion)
      .reduce((sum, enemy) => sum + Math.max(0, enemy.hp - Math.max(0, plan.outcome.enemyHpAfter.find((after) => after.index === enemy.index)?.hp ?? enemy.hp)), 0);
  const killTurns = (plan: Plan): number => (plan.outcome.winsFight ? 1 : 1 + Math.ceil(Math.max(0, bossHpLeft - realDamage(plan)) / Math.max(1, perTurn)));
  const safest = options.reduce((a, b) => (b.outcome.hpLoss < a.outcome.hpLoss ? b : a));
  const bestDry = options.filter((plan) => !drinksPotion(plan)).reduce<Plan | null>((a, b) => (a === null || b.outcome.hpLoss < a.outcome.hpLoss || (b.outcome.hpLoss === a.outcome.hpLoss && b.outcome.damageDealt > a.outcome.damageDealt) ? b : a), null);
  const lineFacts = (plan: Plan): Record<string, JsonValue> => {
    const fit = fitFor(plan);
    const facts: Record<string, JsonValue> = { reference: fit.label };
    if (fit.tempo) facts["tempo"] = fit.tempo;
    const extra = plan.outcome.hpLoss - safest.outcome.hpLoss;
    if (extra > 0 && !plan.outcome.winsFight) facts["hp_vs_safest"] = `${extra} HP more than the safest line (${safest.outcome.hpLoss}), for ${plan.outcome.damageDealt - safest.outcome.damageDealt >= 0 ? "+" : ""}${plan.outcome.damageDealt - safest.outcome.damageDealt} damage`;
    if (!plan.outcome.winsFight && perTurn > 0) {
      const turns = killTurns(plan);
      const later = foes.filter((foe) => !foe.minion).length > 0 ? Math.round(lossUntilKill(foes, plan.outcome.enemyHpAfter, perTurn, blockPerTurn, focusIndex)) : null;
      facts["kill_eta"] = `~${turns} turns to the kill at ~${Math.round(perTurn)} damage a turn${later !== null ? `, ~${later} more HP lost until then` : ""}`;
      if (kind === "boss") facts["hp_clock"] = `our HP lasts ~${hpClockTurns(asArray(combat["enemies"]).map(asRecord), plan.outcome.hpAfter)} more turns at the expected hits`;
    }
    // Boss behind its clock: whether the extra HP this line costs over the safest line pays at the race's
    // exchange rate (it used to decide the HP guard).
    if (need !== null && plan !== safest && !plan.outcome.winsFight) {
      const turnsLeft = Math.min(clockTurnsLeft, hpClockTurns(asArray(combat["enemies"]).map(asRecord), safest.outcome.hpAfter));
      if (bossHpLeft / turnsLeft > safest.outcome.damageDealt && plan.outcome.hpLoss > safest.outcome.hpLoss) {
        const pays = bossRaceTrade({ extraDamage: plan.outcome.damageDealt - safest.outcome.damageDealt, extraLoss: plan.outcome.hpLoss - safest.outcome.hpLoss, hp: playerSim.hp, maxHp: playerSim.maxHp, bossHpLeft, needPerTurn: bossHpLeft / turnsLeft });
        facts["boss_race"] = `behind the boss clock (~${Math.round(bossHpLeft / turnsLeft)} a turn needed): its extra damage ${pays ? "pays" : "does not pay"} for its extra HP at the race's rate`;
      }
    }
    if ((plan.outcome.blockPotionShort ?? 0) > 0) facts["block_potion_short"] = `a block potion drunk for a hit the hand could take: ~${plan.outcome.blockPotionShort} more HP lost to next turn's hit than if it were kept`;
    // What each potion this line drinks saves here, and what holding it means for the boss.
    const drunk = plan.steps.filter((step) => step.cardId.startsWith("POTION:"));
    if (drunk.length > 0 && !toadRock(drunk[0]!.cardId.split(":")[1] ?? "")) {
      const saved = bestDry ? bestDry.outcome.hpLoss - plan.outcome.hpLoss : null;
      const extraDamage = bestDry ? plan.outcome.damageDealt - bestDry.outcome.damageDealt : null;
      const notes = drunk.map((step) => {
        const id = step.cardId.split(":")[1] ?? "";
        return reserveFact({
          plan: runPlan,
          potionId: id,
          text: potionText(id),
          name: step.name.replace(/^potion /, ""),
          bossFight: kind === "boss",
          savedHp: bestDry ? saved : null,
          extraDamage,
          fightNote: fightPlan?.potions?.[id] ?? null,
        });
      });
      facts["potion_facts"] = notes.filter(Boolean).join(" | ");
      if (drunk.some((step) => heldForBoss(step.cardId.split(":")[1] ?? ""))) facts["tempo"] = [fit.tempo, "departs from DeepSeek's reserve: drinks a potion it holds for the act boss"].filter(Boolean).join("; ");
    }
    return facts;
  };
  const tempoBreaks = (plan: Plan): string | null => {
    const fit = fitFor(plan);
    const reserved = plan.steps.some((step) => step.cardId.startsWith("POTION:") && heldForBoss(step.cardId.split(":")[1] ?? ""));
    if (reserved) return [fit.breaks ? fit.tempo : null, "drinks a potion DeepSeek holds for the act boss"].filter(Boolean).join("; ");
    return fit.breaks ? fit.tempo : null;
  };
  const criteria: Record<string, string | null> = {};
  const byKey = new Map<string, { plan?: Plan; potion?: ActionRequest; label: string; potionId?: string }>();
  options.forEach((plan, index) => {
    const key = `plan${index + 1}`;
    criteria[key] = JSON.stringify({ ...describePlan(plan, playerSim.maxHp, hand), ...lineFacts(plan) });
    byKey.set(key, { plan, label: plan.steps.map(stepText).join(", ") || "end turn" });
  });
  if (offerPotions) {
    for (const potion of potions) {
      const targets: (number | null)[] = potion.requires_target ? potion.valid_targets : [null];
      for (const target of targets.slice(0, 2)) {
        const key = target === null ? potion.key : `${potion.key}->e${target}`;
        const enemyName = target === null ? null : enemies.find((enemy) => enemy.index === target)?.name ?? `enemy ${target}`;
        const held = heldForBoss(potion.potion_id);
        criteria[key] = JSON.stringify({
          plays: `drink ${potion.name}${enemyName ? ` on ${enemyName}` : ""} first, then re-plan the turn`,
          text: potion.text,
          potion_facts: potionOptionFit({
            role: potionRole(potion.potion_id, potion.text),
            bossFight: kind === "boss",
            bossClock: bossClockNow,
            cheapestLoss: Math.min(...options.map((plan) => plan.outcome.hpLoss)),
            hp: playerSim.hp,
            reserve: held || fightPlan?.potions?.[potion.potion_id]
              ? reserveFact({ plan: runPlan, potionId: potion.potion_id, text: potion.text, name: potion.name, bossFight: kind === "boss", savedHp: null, fightNote: fightPlan?.potions?.[potion.potion_id] ?? null })
              : null,
          }),
          ...(held ? { tempo: "departs from DeepSeek's reserve: a potion it holds for the act boss" } : {}),
        });
        byKey.set(key, {
          potion: target === null ? { action: "use_potion", option_index: potion.slot } : { action: "use_potion", option_index: potion.slot, target_index: target },
          label: `drink ${potion.name}`,
          potionId: potion.potion_id,
        });
      }
    }
  }

  // DeepSeek's strategy and tempo in force, one line each (intent.ts intentLines).
  const strategy = intentLines(runPlan, fightPlan, state.run?.floor ?? null, hpFrac, { bossClock: bossClockNow, objective: objectiveNow });
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
    roles: ROLE_NOTE,
    ...(strategy.length > 0 ? { strategy } : {}),
    labels: LABEL_NOTE,
  };

  // JEV_CONTEXT=v1: Jev gets fact tags on every plan, fight hints and a combat-only brief. The
  // escalator keeps the original question (same keys, so resolve() serves both).
  let jevView: AskDecision["jevView"];
  if (env.jevContext === "v1") {
    const liveEnemies = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
    const nextThreat = new Map<number, number | null>(
      liveEnemies.map((enemy, fallbackIndex) => [numOrNull(enemy["index"]) ?? fallbackIndex, nextHitOf(enemy)]),
    );
    const ctx: FactContext = { maxHp: playerSim.maxHp, hand, enemies, nextThreat, noAttack: enemies.every((enemy) => enemy.attacks.length === 0) };
    const jevCriteria: Record<string, string | null> = { ...criteria };
    options.forEach((plan, index) => {
      jevCriteria[`plan${index + 1}`] = JSON.stringify({ ...describePlan(plan, playerSim.maxHp, hand), ...planFacts(plan, ctx), ...lineFacts(plan) });
    });
    const actRaw = state.run?.act_id;
    const hints = selectHints({
      enemyIds: liveEnemies.map((enemy) => str(enemy["enemy_id"])),
      fight: kind,
      act: actRaw != null && /^\d+$/.test(actRaw) ? Number(actRaw) + 1 : null,
      hpPct: playerSim.maxHp > 0 ? (playerSim.hp / playerSim.maxHp) * 100 : 100,
      enemyPowers: liveEnemies.flatMap((enemy) => asArray(enemy["powers"]).map((power) => str(asRecord(power)["power_id"]))),
      noAttack: ctx.noAttack,
    });
    const jevState: Record<string, JsonValue> = { ...questionState, run_brief: combatBriefJson(env.brief, state, env.knowledge) };
    if (hints.length > 0) jevState["fight_hints"] = hints.map((hint) => hint.text);
    jevView = {
      state: jevState,
      questions: { plan: choiceQ("Which plan should I play this turn?", jevCriteria) },
      context: "v1",
      hints: hints.map((hint) => hint.id),
    };
  }

  // resolve() is pure: it may run twice for one decision (Jev's answer, then the escalator's). The
  // loop runs `apply` once, for the resolution it actually plays.
  const fallback = (why: string): ResolvedAction => ({
    intent: firstIntent(referenceTop, hand, env),
    rationale: `${why}; using code's reference plan`,
    confidence: null,
    fallback: true,
    apply: () => commit(env, state.turn, referenceTop, hand, "code"),
  });
  const referenceOf = (chosen: { plan?: Plan }): NonNullable<ResolvedAction["reference"]> => {
    const rank = chosen.plan ? reference.indexOf(chosen.plan) + 1 : null;
    return { rank, of: options.length, top: "plan" + (options.indexOf(referenceTop) + 1), matched: chosen.plan === referenceTop };
  };

  return {
    kind: "ask",
    label: offerPotions ? "combat/plan-choice+potion" : "combat/plan-choice",
    state: questionState,
    questions: { plan: choiceQ("Which plan should I play this turn?", criteria) },
    ...(jevView ? { jevView } : {}),
    ...(strategy.length > 0 ? { guidance: strategy } : {}),
    ...((kind === "elite" || kind === "boss" || dangerous) && env.fightPlan !== "v1"
      ? { escalate: { question: "plan", below: 0.5, why: `${kind} fight${dangerous ? ", dangerous turn" : ""}` } }
      : {}),
    resolve(answers): ResolvedAction {
      const answer = answers["plan"];
      if (!answer || answer.type !== "choice") return fallback("no usable answer from Jev");
      const chosen = byKey.get(answer.choice);
      if (!chosen) return fallback(`Jev chose unknown option "${answer.choice}"`);
      const escalatedBy = answer.raw === undefined ? undefined : (answer.raw as { escalated?: "deepseek" | "claude" }).escalated;
      const fromJev = answer.raw !== undefined && !escalatedBy;
      const breaks = chosen.plan ? tempoBreaks(chosen.plan) : chosen.potionId && heldForBoss(chosen.potionId) ? "drinks a potion DeepSeek holds for the act boss" : null;
      const deviation = fromJev && breaks && (fightPlan || runPlan) ? { intent: breaks, runPlanVersion: runPlan?.version ?? null, fightObjective: objective } : undefined;
      if (chosen.potion) {
        return {
          intent: chosen.potion,
          rationale: `Jev chose to ${chosen.label} (confidence ${answer.confidence.toFixed(2)})`,
          confidence: answer.confidence,
          fallback: false,
          reference: referenceOf(chosen),
          ...(deviation ? { deviation } : {}),
          apply: () => {
            env.screenMemory.combatPlan = null;
          },
        };
      }
      const plan = chosen.plan!;
      return {
        intent: firstIntent(plan, hand, env),
        rationale: `Jev chose plan ${options.indexOf(plan) + 1}/${options.length} (${chosen.label}) with confidence ${answer.confidence.toFixed(2)}; code reference rank ${reference.indexOf(plan) + 1}${calcNote}`,
        confidence: answer.confidence,
        fallback: false,
        reference: referenceOf(chosen),
        ...(deviation ? { deviation } : {}),
        apply: () => commit(env, state.turn, plan, hand, escalatedBy ?? "jev"),
      };
    },
  };
}

/**
 * The line to start when every simulated line dies. With a draw card playable, the drawn cards are the
 * only way out the simulation cannot see, so a line that draws goes first, draw card first, the
 * most-damage one of them (a kill, or a phase kill: Test Subject's revive turn has no attack), and
 * the turn is re-planned once it has drawn. VP5F F48 T8: 12 HP against 10x5, 0-cost Battle Trance+
 * left in hand while least-loss (-30 vs -31) played Molten Fist+, Defend, Strike; 7 of 18 cards in
 * the draw pile killed the 37 HP left (about 89% over 4 draws). CRRPX F48 T10 won the same way by
 * luck. Otherwise, the line that keeps the most HP.
 */
export function leastLossPlan(plans: Plan[], hand: CardModel[], hp = Infinity, drawPotions: CardModel[] = []): Plan {
  const mostDamage = (candidates: Plan[]): Plan =>
    candidates.reduce((a, b) =>
      b.outcome.damageDealt > a.outcome.damageDealt || (b.outcome.damageDealt === a.outcome.damageDealt && b.outcome.hpAfter > a.outcome.hpAfter) ? b : a,
    );
  // A modelled draw potion goes first, before any draw card: it costs no energy, so every card it
  // draws can still be paid for (X8HF F33 T6). The rest of the line is only a note: the turn is
  // re-planned once the potion has drawn.
  const potion = drawPotions.find(drawsCards);
  if (potion && plans.length > 0) {
    const base = mostDamage(plans);
    const step: Step = { cardIndex: potion.index, cardId: potion.cardId, upgraded: false, cost: 0, name: potion.name, target: null, targetName: null };
    return { ...base, steps: [step, ...base.steps.filter((entry) => entry.cardId !== potion.cardId)] };
  }
  // A drawing card whose own HP cost kills us is no draw (2VW5 F28 T7: Offering at 5 HP played first).
  const drawAt = (plan: Plan): number =>
    plan.steps.findIndex((step) => hand.some((card) => card.index === step.cardIndex && drawsCards(card) && card.hpLoss < hp));
  const drawing = plans.filter((plan) => drawAt(plan) >= 0);
  if (drawing.length === 0) return plans.reduce((a, b) => (b.outcome.hpAfter > a.outcome.hpAfter ? b : a));
  const most = mostDamage(drawing);
  const at = drawAt(most);
  if (at === 0) return most;
  return { ...most, steps: [most.steps[at]!, ...most.steps.slice(0, at), ...most.steps.slice(at + 1)] };
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

/** DeepSeek's run plan of this run (RUN_PLAN=v1), or null. */
function activeRunPlan(env: DecisionEnv): RunPlan | null {
  return currentRunPlan(env.screenMemory, env.state);
}

/** DeepSeek's plan for the fight being played (FIGHT_PLAN=v1), or null. */
function activeFightPlan(env: DecisionEnv): FightPlan | null {
  if (env.fightPlan !== "v1") return null;
  const plan = env.screenMemory.fightPlan;
  if (!plan) return null;
  return plan.fight === hpGuardFight(env) && plan.runId === str(env.state.raw["run_id"]) ? plan : null;
}

/**
 * Surrounded, before any targeted card this fight: we start facing the enemy with the right-hand
 * back-attack power (5TQX F33 T2: facing unknown, so Strike and Pommel Strike+ into the Crusher were
 * planned at -17; turning our back on the Rocket made its beam 27, -25).
 */
function startFacing(combat: Record<string, unknown>): number | null {
  const enemy = asArray(combat["enemies"])
    .map(asRecord)
    .find((entry) => entry["is_alive"] !== false && powerAmount(entry, "BACK_ATTACK_RIGHT_POWER") > 0);
  return enemy ? numOrNull(enemy["index"]) : null;
}

/**
 * No playable card and the enemy turn is lethal (or costs 30%+ HP in an elite/boss fight): drink a
 * potion first. A hit-blunting potion before a drawing one before any other; then the turn re-plans.
 */
export function noPlayRescuePotion(env: DecisionEnv, enemies: EnemySim[], player: PlayerSim): Decision | null {
  const incoming = Math.max(0, enemies.reduce((sum, enemy) => sum + enemy.attacks.reduce((total, attack) => total + attack.damage * attack.hits, 0), 0) - player.block);
  const kind = fightKind(asRecord(env.state.raw["combat"]), env);
  const urgent = incoming >= player.hp || ((kind === "elite" || kind === "boss") && incoming >= player.hp * 0.3);
  if (!urgent) return null;
  // A potion DeepSeek holds for the act boss goes last (only when no other one blocks or draws).
  const reserve = activeRunPlan(env)?.reserve;
  const bossFight = kind === "boss";
  const potions = potionViews({ raw: asRecord(env.state.run?.raw) }, env.knowledge)
    .filter((potion) => potion.can_use && potion.potion_id !== "FOUL_POTION")
    .sort((a, b) => Number(!bossFight && isReserved(reserve, a.potion_id, a.text)) - Number(!bossFight && isReserved(reserve, b.potion_id, b.text)));
  // A debuff potion into Artifact does nothing (M6P7 F48 T8: Weak Potion into Aeonglass's Artifact).
  const artifactUp = enemies.some((enemy) => enemy.hp > 0 && (enemy.artifact ?? 0) > 0);
  const useful = (potion: { text: string }) => !(artifactUp && /虚弱|weak|易伤|vulnerable/i.test(potion.text) && !/格挡|block/i.test(potion.text));
  const pick =
    potions.filter(useful).find((potion) => BLUNTS_HIT.test(potion.text)) ??
    potions.find((potion) => /抽|draw/i.test(potion.text));
  // Only a potion that blocks or draws helps a hand with nothing playable (P2E4 F48: Blessing of the
  // Forge drunk on a hand of Soulbound-locked cards).
  if (!pick) return null;
  const target = pick.requires_target ? pick.valid_targets[0] : undefined;
  if (pick.requires_target && target === undefined) return null;
  return {
    kind: "act",
    label: "combat/potion-now",
    intent: target === undefined ? { action: "use_potion", option_index: pick.slot } : { action: "use_potion", option_index: pick.slot, target_index: target },
    rationale: `no playable cards and ${incoming} incoming at ${player.hp} HP: drinking ${pick.name} first`,
  };
}

/**
 * Test Subject's Multi Claw gains a hit every use (10x3, x4, x5 …): the next one is this one plus a hit,
 * not the move model's average (YFG5, ZANM, 7DFB: a flat 41 read for 50-70 hits).
 */
export function multiClawNext(enemy: Record<string, unknown>): number | null {
  // Kin Priest: a fixed cycle Orb of Frailty -> Orb of Weakness -> Beam (3 hits of 3 + Strength) ->
  // Ritual; the move model's average Beam (13) missed the 21 that killed P78Z and PPKT on T11.
  if (str(enemy["enemy_id"]) === "KIN_PRIEST" && /ORB_OF_WEAKNESS/i.test(str(enemy["move_id"]))) {
    return (3 + powerAmount(enemy, "STRENGTH_POWER")) * 3;
  }
  if (!/MULTI_CLAW/i.test(str(enemy["move_id"]))) return null;
  const intent = asArray(enemy["intents"]).map(asRecord).find((entry) => num(entry["damage"]) > 0);
  if (!intent) return null;
  return num(intent["damage"]) * (Math.max(1, num(intent["hits"])) + 1);
}

/** Kusarigama (every 3rd attack in a turn: 6 to a random enemy), with the attacks counted so far. */
function kusarigamaOf(run: unknown): { every: number; damage: number; count: number } | undefined {
  const relic = asArray(asRecord(run)["relics"]).map(asRecord).find((entry) => str(entry["relic_id"]) === "KUSARIGAMA");
  return relic ? { every: 3, damage: 6, count: num(relic["stack"]) % 3 } : undefined;
}

/**
 * The Queen's YOU_ARE_MINE turn with her Torch Head Amalgam alive: its index, or null (H7W0 F48 T2,
 * CWU9: after it we carry 99 Weak/Frail/Vulnerable; the dossier's win pattern is max burst into the
 * Amalgam in T1-T2).
 */
export function youAreMineTurn(combat: Record<string, unknown>): { amalgamIndex: number } | null {
  const living = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
  const queen = living.find((enemy) => str(enemy["enemy_id"]) === "QUEEN");
  if (!queen || !/YOU_ARE_MINE/.test(str(queen["move_id"]))) return null;
  const amalgam = living.find((enemy) => str(enemy["enemy_id"]) === "TORCH_HEAD_AMALGAM" && num(enemy["current_hp"]) > 0);
  const index = amalgam ? numOrNull(amalgam["index"]) : null;
  return index === null ? null : { amalgamIndex: index };
}

/** An enemy's expected hit next turn: its fixed cycle, else the move model, grown by Ritual (NX48 F35). */
export function nextHitOf(enemy: Record<string, unknown>): number | null {
  const base = multiClawNext(enemy) ?? expectedNextDamage(str(enemy["enemy_id"]), str(enemy["move_id"]));
  const shown = asArray(enemy["intents"]).map(asRecord).flatMap((intent) => {
    const damage = numOrNull(intent["damage"]);
    return damage === null ? [] : [{ damage, hits: Math.max(1, Math.round(numOrNull(intent["hits"]) ?? 1)) }];
  });
  return nextDamageWithGrowth(base, powerAmount(enemy, "RITUAL_POWER"), shown);
}
