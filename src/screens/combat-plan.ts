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
import type { GameState } from "../mod/schema.js";
import type { Knowledge } from "../knowledge/index.js";
import { playerJson, potionViews } from "../project/narrow.js";
import { briefJson, combatBriefJson } from "../project/run-brief.js";
import { selectHints } from "../knowledge/jev-hints.js";
import type { AskDecision, CombatPlanMemo, Decision, DecisionEnv, ResolvedAction } from "../project/types.js";
import { expectedNextDamage, maxMoveDamage, nextDamageWithGrowth } from "../knowledge/move-model.js";
import { heldPenaltyOf, isModelledPotion, modelHandCard, modelPotion, stripVigor, type CardModel } from "../strategy/card-model.js";
import { distinctPlans, dominates, drawsCards, sandpitTurnValue, solveTurn, WAKE_MARGIN, type DrawPileCard, type EnemySim, type Plan, type PlayerSim, type SolverInput, type Step } from "../strategy/turn-solver.js";
import { asArray, asRecord, bool, num, numOrNull, str, type JsonValue } from "../util/json.js";
import { planCombat as planCombatPerCard } from "./combat.js";
import { currentRunPlan, type RunPlan } from "../strategy/run-plan.js";
import { fightFocus, fightKey, OFFENSIVE_POTIONS, type FightPlan } from "../strategy/fight-plan.js";
import { combatFit, combatPolicy, objectiveInForce, LABEL_NEAR, LABEL_NOTE, objectiveDamage, potionOptionFit, potionRole, ROCK_POTION, type LineField, type SandpitField, guardProtectsSetup, guardSlackScale, hallwayGuardOn, intentLines, isReserved, promotesSetup, reserveReleased, setupRisksDeath, solverScale, tradesHpForDamage } from "../strategy/intent.js";
import { forcedEliteWithin } from "./rest.js";
import { bossNeed, deckDamagePerTurn } from "../strategy/boss-clock.js";

/** Elite/boss: a best potion-free line losing this share of current HP never overrides Jev's potion pick. */
export const POTION_PRESSED_SHARE = 0.3;
/**
 * Extra solver cost of a potion the run plan reserves for the act boss, before the boss (its lines are
 * then filtered unless the reserve is released: intent.ts reserveReleased).
 */
export const RUN_PLAN_SAVE_COST = 20;
/** Boss race behind the clock: the HP guard keeps a line adding at least this share of a turn's need… */
export const BOSS_RACE_MIN_SHARE = 0.25;
/** …(and at least this much damage)… */
export const BOSS_RACE_MIN_DAMAGE = 5;
/** …for HP up to its worth at the race's exchange rate, or up to this share of max HP. */
export const BOSS_RACE_HP_SHARE = 0.1;

/**
 * Act boss behind its clock: whether the HP guard keeps a line dealing `extraDamage` more for
 * `extraLoss` more HP. Proportional, not the old fixed "20+ damage for 8 HP or less" (M9PL F33 T3: 19
 * more damage for 6 HP swapped with the crab needing ~58 a turn; T86W F17 T4): the extra damage must be
 * a real part of a turn's need (BOSS_RACE_MIN_SHARE), and the HP it costs at most what that damage is
 * worth at our HP per boss HP (the exchange rate), or BOSS_RACE_HP_SHARE of max HP.
 */
export function bossRaceTrade(t: { extraDamage: number; extraLoss: number; hp: number; maxHp: number; bossHpLeft: number; needPerTurn: number }): boolean {
  if (t.extraDamage < Math.max(BOSS_RACE_MIN_DAMAGE, BOSS_RACE_MIN_SHARE * t.needPerTurn)) return false;
  const exchange = (t.extraDamage * t.hp) / Math.max(1, t.bossHpLeft);
  return t.extraLoss <= Math.max(exchange, BOSS_RACE_HP_SHARE * t.maxHp);
}
/** Boss: a drink-first attack potion is not refused when every potion-free line loses this much. */
export const BOSS_DRINK_FIRST_LOSS = 10;

/**
 * A line drinking a potion at 0 energy that gains nothing this turn over the potion-free lines: no less
 * HP lost, no more damage dealt, no win (GZ24 F8 T1: Dexterity Potion at 0 energy, 0 block from it).
 */
export function zeroEnergyDrinkIdle(plan: Plan, dry: Plan[]): boolean {
  if (dry.length === 0 || plan.outcome.winsFight || !plan.steps.some((step) => step.cardId.startsWith("POTION:"))) return false;
  const bestLoss = Math.min(...dry.map((entry) => entry.outcome.hpLoss));
  const bestDamage = Math.max(...dry.map((entry) => entry.outcome.damageDealt));
  return plan.outcome.hpLoss >= bestLoss && plan.outcome.damageDealt <= bestDamage;
}

/**
 * Elite/boss: whether a potion-free line overrides Jev's low-confidence potion pick. A line that drinks
 * loses to a dry line losing no more HP; a drink-first pick (its line unknown until re-planned) only
 * to a dry line losing at most max(3, 10% HP). Never when the best dry line costs 30% of our HP.
 */
export function dryLineOverridesPotion(chosenLoss: number | undefined, bestDryLoss: number, hp: number): boolean {
  if (bestDryLoss >= POTION_PRESSED_SHARE * hp) return false;
  return chosenLoss !== undefined ? bestDryLoss <= chosenLoss : bestDryLoss <= Math.max(3, 0.1 * hp);
}

/**
 * The Sandpit race behind the clock (sandpitTurnValue): a potion veto does not swap Jev's line for one
 * playing fewer Frantic Escapes, nor refuse an energy potion drunk first (chosenEscapes null) while the
 * Escapes in hand cost more than the energy left (9V09 F33 T2/T4).
 */
export function sandpitVetoExempt(ctx: { behind: boolean; chosenEscapes: number | null; swapInEscapes: number; energyPotion: boolean; escapeCostInHand: number; energy: number }): boolean {
  if (!ctx.behind) return false;
  if (ctx.chosenEscapes !== null) return ctx.chosenEscapes > ctx.swapInEscapes;
  return ctx.energyPotion && ctx.escapeCostInHand > ctx.energy;
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
/** Otherwise a hallway potion line must save this much HP over the best potion-free line (or win, or add damage). */
export const HALLWAY_POTION_MIN_SAVE = 8;
export const HALLWAY_POTION_MIN_DAMAGE = 20;
/** A hallway potion line is dropped when a potion-free line loses at most this much HP. */
export const HALLWAY_LETHAL_POTION_LOSS = 5;
/** Jev confidence a hallway potion line below code rank 1 needs to be played. */
export const HALLWAY_POTION_CONFIDENCE = 0.75;
/** Map node types a hallway fight is fought in. */
const FIGHT_NODES = ["Monster", "Unknown"];

/** Solver cost of drinking a potion (before any defensive saving). */
export function potionUseCostFor(kind: SolverInput["fightKind"], pressed: boolean, eliteNext: boolean): number {
  if (pressed) return 0;
  if (kind === "boss") return BOSS_POTION_COST;
  if (kind === "elite") return 5;
  return HALLWAY_POTION_COST * (eliteNext ? 2 : 1);
}

/** Solver cost of drinking a potion in a boss fight (before any defensive saving). */
export const BOSS_POTION_COST = 4;
const BOSS_POTIONS_PER_TURN = 1;
/** Block/Weak potions: worth keeping for a bigger hit next turn (saveDefence). */
/** Potion text that blunts an enemy hit. */
const BLUNTS_HIT = /格挡|block|无实体|intangible|伤害减少|less damage|荆棘|thorns|虚弱|weak/i;
/** Potions that give energy (id or text), for the Sandpit veto exemption. */
const ENERGY_POTIONS = /ENERGY_POTION|RADIANT_TINCTURE|能量|\bEnergy\b/;
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
      ...(powerAmount(enemy, "ASLEEP_POWER") + powerAmount(enemy, "SLUMBER_POWER") > 0
        ? { wakeHit: Math.round((maxMoveDamage(str(enemy["enemy_id"])) ?? 0) + powerAmount(enemy, "STRENGTH_POWER")) || undefined }
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
  if ((o.wakeHit ?? 0) > 0) summary["woken_enemy_hits_next_turn"] = `about ${o.wakeHit} more incoming next enemy turn (a sleeper this line wakes)`;
  // Powers pay off every later turn; without saying so the models swapped power lines for ones that
  // saved a few HP now (JEGBU7JHEL1A: Rupture and Crimson Mantle never played in a 379 HP boss fight).
  if (o.lasting >= 5) {
    const forge = plan.steps.some((step) => step.cardId.startsWith("POTION:BLESSING_OF_THE_FORGE:"));
    summary["lasting_value"] = `${forge ? "upgrades the hand for the fight" : "sets up a power"}, worth about ${Math.round(o.lasting)} score over the fight (a few HP now is often worth it in a long fight)`;
  }
  if (o.sandpitAfter !== null) summary["sandpit_after_enemy_turn"] = o.sandpitAfter <= 0 ? `${o.sandpitAfter} (eaten: I DIE)` : o.sandpitAfter;
  if (o.unknownCards.length > 0) summary["unmodelled_cards"] = o.unknownCards.join(", ");
  return summary;
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
  const pile = asRecord(asRecord(raw["agent_view"])["combat"])["exhaust"];
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
  const drawsOrRandom = first ? cardFor(first, hand)?.draw ?? 0 : 0;
  env.screenMemory.plannedAfter = { turn, steps: plan.steps.slice(1) };
  env.screenMemory.combatPlan =
    plan.steps.length > 1 && drawsOrRandom === 0
      ? { turn, remaining: plan.steps.slice(1), expectedHand: expectedHandAfterFirst(plan, hand), handLen: hand.length - 1, via, enemies: livingEnemySignature(env.state.raw) }
      : null;
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
  // Evil Eye doubles when a card was exhausted this turn: with Baking Gloves that is every turn.
  const relicIds = asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  const exhaustsEveryTurn = relicIds.includes("TOASTY_MITTENS");
  const exhaustedThisTurn = exhaustsEveryTurn || num(player["cards_exhausted_this_turn"]) > 0;
  for (const card of hand) if (card.cardId === "EVIL_EYE" && exhaustedThisTurn) card.block *= 2;
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
  // Strategic intents (intent.ts): DeepSeek's run plan and fight plan, carried out here.
  const runPlan = activeRunPlan(env);
  const fightPlan = activeFightPlan(env);
  // The setup window is the fight's first turns, not a new boss phase's (YFG5 F48 T3: Test Subject's
  // phase 2 began on T3, Pyre+ for 4 damage over a 58-damage line at the same HP).
  const maxHpNow = enemies.filter((enemy) => !enemy.minion && enemy.hp > 0).reduce((sum, enemy) => sum + enemy.maxHp, 0);
  const fightId = fightKey(state);
  const enemyHpNow = enemies.filter((enemy) => !enemy.minion && enemy.hp > 0).reduce((sum, enemy) => sum + enemy.hp, 0);
  if (!env.screenMemory.fightStart || env.screenMemory.fightStart.fight !== fightId) env.screenMemory.fightStart = { fight: fightId, maxHp: maxHpNow, hp: enemyHpNow, turn: state.turn ?? 1 };
  const laterPhase = maxHpNow > env.screenMemory.fightStart.maxHp;
  const hpFrac = playerSim.maxHp > 0 ? playerSim.hp / playerSim.maxHp : 1;
  // The run's hp_policy as this fight plays it: a low_hp preserve lapses once HP is back, and
  // kill_fast/race because the enemy scales puts damage first under preserve (intent.ts combatPolicy).
  // A phase boss's later phases count too (ZANM F48: phase 2 at 151 read as the whole race, the guard
  // let a -37 line through and phase 3 began at 49 HP; Test Subject is ~100/200/300).
  const laterPhases = (enemy: EnemySim) => (!enemy.revives ? 0 : enemy.maxHp <= 120 ? 500 : enemy.maxHp <= 220 ? 300 : Math.round(enemy.maxHp * 1.5));
  const bossHpLeft = enemies.filter((enemy) => !enemy.minion).reduce((sum, enemy) => sum + enemy.hp + laterPhases(enemy), 0);
  // Expected damage a turn: this fight's so far, else the deck estimate (boss-clock.ts).
  const fightTurn = state.turn ?? 1;
  const start = env.screenMemory.fightStart;
  const perTurn =
    start?.hp !== undefined && start.turn !== undefined && fightTurn > start.turn && start.hp > enemyHpNow
      ? (start.hp - enemyHpNow) / (fightTurn - start.turn)
      : deckDamagePerTurn(state, env.knowledge);
  // scale_then_kill is played as kill_fast once the fight should end within ~3 turns, nothing is left to
  // set up, or in a new boss phase (intent.ts objectiveInForce).
  const objectiveNow = objectiveInForce(fightPlan?.objective ?? null, {
    turnsLeft: perTurn > 0 ? bossHpLeft / perTurn : null,
    laterPhase,
    setupLeft: setupLeft(state, hand, env.knowledge),
  });
  const objective = objectiveNow.objective;
  const need = kind === "boss" ? bossNeed(str(asRecord(state.run?.raw)["boss_id"]), state.run?.ascension ?? 0) : null;
  const clockTurnsLeft = need ? Math.max(1, need.turns - ((state.turn ?? 1) - 1)) : 1;
  // The act boss's clock now: HP left over the clock's turns left, against the deck's estimate.
  const bossClockNow = need ? { need: bossHpLeft / clockTurnsLeft, deck: deckDamagePerTurn(state, env.knowledge) } : null;
  // An act boss behind its clock is fought under balanced, not preserve (intent.ts combatPolicy).
  const hpPolicy = combatPolicy(runPlan, fightPlan, hpFrac, bossClockNow).policy;
  const guardScale = guardSlackScale(objective, hpPolicy, hpFrac);
  // Reserve: potions of the roles the run plan keeps for the act boss are hard-filtered from every
  // line and offer before it, in every non-boss fight (M6P7, T4PY, 0YG4: boss potions spent in
  // hallways and elites; EJXC F28: the Flex Potion kept for the Insatiable drunk on an elite, the boss
  // left at 31). Only below 25% HP or when every line without it dies is it released.
  const reservedPotion = (potionId: string, text: string) => kind !== "boss" && isReserved(runPlan?.reserve, potionId, text);
  // Released (below 25% HP now, or every dry line dies below): a reserved potion costs what any potion
  // costs, no save cost on top (5JU3 F11 T3-T4: at 16% HP the Gigantification Potion was released but
  // still carried RUN_PLAN_SAVE_COST 20, and no line drank it until every line died on T6).
  let reserveOpen = reserveReleased({ bossFight: false, hpFraction: hpFrac, everyDryLineDies: false }) !== null;
  const heldForBoss = (potionId: string, text: string) => reservedPotion(potionId, text) && !reserveOpen;
  // Petrified Toad refills a Potion-Shaped Rock every fight: a rock drunk now is free, and a slot freed
  // for a real potion (H7W0 F42-F48: two rocks filled the belt, the Attack Potion reward was lost and
  // the Queen was fought with rocks only).
  const toadRock = (potionId: string) => potionId === ROCK_POTION && relicIds.includes("PETRIFIED_TOAD");
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
  // A hallway fight right before a forced Elite: the potion is worth twice as much kept (NZR7 F6: both
  // drunk on a 0-loss turn, 0 potions into the F7 elite).
  const eliteNext = (kind === "monster" || kind === "unknown") && forcedEliteWithin(env.screenMemory, state, FIGHT_NODES, 1);
  const potionUseCost = potionUseCostFor(kind, pressed, eliteNext);
  // Defensive potions are worth saving when next turn's hit is expected to be bigger than this one
  // (Vantom: Fortifier spent on the 12-damage lance, then nothing left for the 28-damage Dismember).
  const nowIncoming = enemies.reduce((sum, enemy) => sum + enemy.attacks.reduce((s, a) => s + a.damage * a.hits, 0), 0);
  const nextIncoming = asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .reduce((sum, enemy) => sum + (nextHitOf(enemy) ?? 0), 0);
  const saveDefence = Math.max(0, nextIncoming - nowIncoming) * 0.6;
  // Several enemies can share the id (CWMP F7: four Phantasmal Gardeners, index 0 was always taken
  // while the plan's Enlarge eel sat at 19 HP for six turns): the lowest-HP one of them, re-read each turn.
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
  // Boss fights: one potion a turn (unless it wins the fight or the turn ends below 30% HP).
  const potionsUsed = potionsUsedThisTurn(env, potionViews({ raw: asRecord(state.run?.raw) }, env.knowledge).length);
  const potionLimit = kind === "boss" ? Math.max(0, BOSS_POTIONS_PER_TURN - potionsUsed) : null;
  const drawPile = drawPileCards(state.raw);
  const raceEruption = asArray(combat["enemies"]).some((enemy) => eruptionRace(asRecord(enemy), playerSim.hp, state.turn ?? 1));
  const intentScale = solverScale(objective, hpPolicy, hpFrac);
  // The Sandpit race (The Insatiable): what one more pit turn is worth, and whether the pit is no
  // longer than the kill (9V09 F33: a Frantic Escape counted 20 against ~49 a turn needed).
  const pitNow = Math.min(...enemies.filter((enemy) => enemy.hp > 0 && (enemy.sandpit ?? 0) > 0).map((enemy) => enemy.sandpit!));
  const pitClock = Number.isFinite(pitNow)
    ? sandpitTurnValue({
        bossHpLeft: enemies.filter((enemy) => !enemy.minion && enemy.hp > 0).reduce((sum, enemy) => sum + enemy.hp, 0),
        sandpit: pitNow,
        deckPerTurn: deckDamagePerTurn(state, env.knowledge),
        clockPerTurn: bossNeed(str(asRecord(state.run?.raw)["boss_id"]), state.run?.ascension ?? 0)?.perTurn ?? null,
      })
    : null;
  // The board a card potion's card is played on (card-model GENERATED_CARD_POTIONS).
  const potionContext = { enemyTargets: enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.index), strength: playerSim.strengthNow ?? 0, weak: playerSim.weak };
  const solveWith = (free: boolean, withPotions: boolean | ((potion: (typeof potionsAll)[number]) => boolean) = true) =>
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
              // "free" (a costly turn) does not lift the reserve (WB02 F29: a boss potion went free and
              // was drunk 4 floors before the boss).
              (free && !heldForBoss(potion.potion_id, potion.text)) || toadRock(potion.potion_id)
                ? 0
                : potionUseCost + (DEFENSIVE.has(potion.potion_id) ? saveDefence : 0) + (heldForBoss(potion.potion_id, potion.text) ? RUN_PLAN_SAVE_COST : 0),
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
      potionLimit,
      raceEruption,
      wither,
      ...focusInput,
      // Distinct payoff cards, not copies (VHLZ F21: two Bully doubled Bash+'s weight, 16.5 vs 7.5).
      vulnerablePayoffs: new Set(asArray(asRecord(state.run?.raw)["deck"]).map((card) => str(asRecord(card)["card_id"])).filter((id) => VULNERABLE_PAYOFFS.has(id))).size,
      drawPile,
      ...(nextIncoming > 0 ? { nextIncoming } : {}),
      intentScale,
      ...(pitClock ? { sandpitTurnDamage: pitClock.value } : {}),
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
  let solvedFree = false;
  if (costly && !pressed && potionsAll.some((potion) => isModelledPotion(potion.potion_id))) {
    solved = solveWith(true);
    solvedFree = true;
  }
  // A hallway turn whose best line drinks a potion, when a potion-free line costs little: keep the
  // potion (CAYK F37-F40: two Vulnerable and an Energy potion bought for the Queen went on hallway
  // lethals; the boss was entered with 1 of 3 slots filled).
  // A Toad's rock is not a potion to keep (it comes back next fight).
  const drinksPotion = (plan: Plan) => plan.steps.some((step) => step.cardId.startsWith("POTION:") && step.cardId !== `POTION:${ROCK_POTION}`);
  // Not only lethals: MGJ8 F13 drank a Vulnerable potion on a turn with no HP at risk.
  // Pressed (low HP, 2+ attackers) is no exception when a dry line costs this little (B6AC F30: 26/94,
  // Dexterity potion for 2 HP and Heart of Iron at Jev 0.10; the boss killed us 4 HP short).
  let dryCheap = false;
  // Any potion line on offer, not only a top-ranked one (GMT2 F38 T2: end turn ranked first, the tied
  // Swift Potion line was listed and Jev drank it at 0.11).
  if ((kind === "monster" || kind === "unknown") && solved.plans.some(drinksPotion)) {
    const dry = solved.plans.filter((plan) => !drinksPotion(plan) && !plan.outcome.dies);
    if (dry.length > 0 && Math.min(...dry.map((plan) => plan.outcome.hpLoss)) <= HALLWAY_LETHAL_POTION_LOSS) {
      solved = { ...solved, plans: dry };
      dryCheap = true;
    } else if (dry.length > 0) {
      // A hallway potion line must buy something over the best potion-free line: the fight, 8+ HP, or
      // 20+ damage (TXKE F46: two Swift Potions drunk at 0 energy, the draws unplayable, nothing saved;
      // the final boss was entered with empty slots).
      const bestDryLoss = Math.min(...dry.map((plan) => plan.outcome.hpLoss));
      const bestDryDamage = Math.max(...dry.map((plan) => plan.outcome.damageDealt));
      const worth = (plan: Plan) =>
        !drinksPotion(plan) ||
        plan.outcome.winsFight ||
        bestDryLoss - plan.outcome.hpLoss >= HALLWAY_POTION_MIN_SAVE ||
        plan.outcome.damageDealt - bestDryDamage >= HALLWAY_POTION_MIN_DAMAGE;
      const kept = solved.plans.filter(worth);
      if (kept.length > 0 && kept.length < solved.plans.length) solved = { ...solved, plans: kept };
    }
  }
  // A potion drunk at 0 energy that adds no block or damage this turn is worth the same next turn (GZ24
  // F8 T1: the elite veto refused the Dexterity line, the re-plan after three cards at 0 energy ranked
  // "potion Dexterity Potion; hp -17, dmg 0" first; Shrug It Off, Blood Wall and Defend unplayable).
  // Dropped while a potion-free line keeps as much HP and deals as much damage.
  // The potion-free lines are solved apart when the ranking dropped them (GZ24: "only line").
  if (playerSim.energy <= 0 && solved.plans.some(drinksPotion)) {
    const shownDry = solved.plans.filter((plan) => !drinksPotion(plan) && !plan.outcome.dies);
    const dry = shownDry.length > 0 ? shownDry : solveWith(false, false).plans.filter((plan) => !plan.outcome.dies);
    const kept = solved.plans.filter((plan) => !zeroEnergyDrinkIdle(plan, dry));
    if (dry.length > 0 && kept.length < solved.plans.length) solved = { ...solved, plans: [...kept, ...dry.filter((plan) => !kept.includes(plan))] };
  }
  // A potion a guard refused earlier this turn is held back for the turn's re-plans (GZ24 F8 T1:
  // vetoed, then drunk on the same turn's re-plan; EJXC F28 T1 at 0.40 then 0.51). Lines drinking one
  // are dropped while a surviving line without it exists, unless the line wins the fight.
  const vetoMemo = env.screenMemory.potionVeto;
  const vetoed = vetoMemo && vetoMemo.fight === fightKey(state) && vetoMemo.turn === (state.turn ?? null) ? vetoMemo.ids : [];
  const potionText = (potionId: string) => potionsAll.find((potion) => potion.potion_id === potionId)?.text ?? "";
  const drinksVetoed = (plan: Plan) => plan.steps.some((step) => step.cardId.startsWith("POTION:") && vetoed.includes(step.cardId.split(":")[1] ?? ""));
  if (solved.plans.some(drinksVetoed)) {
    const keep = solved.plans.filter((plan) => plan.outcome.winsFight || !drinksVetoed(plan));
    const alive = keep.filter((plan) => !plan.outcome.dies);
    const lowAfter = alive.every((plan) => plan.outcome.hpAfter < playerSim.maxHp * 0.25);
    if (alive.length > 0 && !lowAfter) solved = { ...solved, plans: keep };
  }
  // The reserve is hard: no line drinking a reserved potion (not even a winning one), unless released.
  const drinksReserved = (plan: Plan) => plan.steps.some((step) => step.cardId.startsWith("POTION:") && reservedPotion(step.cardId.split(":")[1] ?? "", potionText(step.cardId.split(":")[1] ?? "")));
  let reserveNote: string | null = null;
  if (solved.plans.some(drinksReserved)) {
    let dry = solved.plans.filter((plan) => !drinksReserved(plan));
    if (dry.length === 0) dry = solveWith(false, (potion) => !reservedPotion(potion.potion_id, potion.text)).plans;
    const dryAlive = dry.filter((plan) => !plan.outcome.dies);
    reserveNote = reserveReleased({
      bossFight: false,
      hpFraction: hpFrac,
      everyDryLineDies: dry.every((plan) => plan.outcome.dies),
      dry: dryAlive.length > 0 ? { hpAfter: Math.max(...dryAlive.map((plan) => plan.outcome.hpAfter)), nextIncoming, maxHp: playerSim.maxHp } : null,
    });
    if (!reserveNote) solved = { ...solved, plans: dry };
    else if (!reserveOpen) {
      // Released because every line without it dies, or the safest one ends within next turn's hit:
      // solved again with no save cost on it.
      reserveOpen = true;
      const again = solveWith(solvedFree);
      const kept = again.plans.filter((plan) => plan.outcome.winsFight || !drinksVetoed(plan));
      if (kept.length > 0) solved = { ...again, plans: kept };
    }
  }
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
    const fightId = fightKey(state);
    if (relicIds.includes("PAELS_EYE") && num(player["cards_played_this_turn"]) === 0 && env.screenMemory.paelsEyeFight !== fightId) {
      env.screenMemory.paelsEyeFight = fightId;
      return { kind: "act", label: "combat/end_turn", intent: { action: "end_turn" }, rationale: "every line dies: ending the turn with no card played for Pael's Eye's extra turn" };
    }
    const potionsNow = potionViews({ raw: asRecord(state.run?.raw) }, env.knowledge).filter((potion) => potion.can_use && !isModelledPotion(potion.potion_id));
    if (potionsNow.length > 0) return planCombatPerCard(env);
    // A modelled draw potion (Swift, Clarity) is a draw source like a draw card: drunk first while
    // energy is left and the piles hold cards (X8HF F33 T6: Sandpit 1, six Frantic Escapes in 27
    // cards, Pommel Strike and Shrug It Off drew one each, Swift Potion carried to the death).
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

  const cheapestAfter = Math.max(...solved.plans.filter((plan) => !plan.outcome.dies).map((plan) => plan.outcome.hpAfter), best.outcome.hpAfter);
  const potionCapped = potionLimit === 0 && cheapestAfter >= playerSim.maxHp * 0.3;
  // Unmodelled potions follow the same reserve: offered only once released (below 25% HP, every line
  // dies, or the safest line ends within next turn's hit + 3).
  const aliveNow = solved.plans.filter((plan) => !plan.outcome.dies);
  const offerReleased =
    reserveNote ??
    reserveReleased({
      bossFight: false,
      hpFraction: hpFrac,
      everyDryLineDies: best.outcome.dies,
      dry: aliveNow.length > 0 ? { hpAfter: Math.max(...aliveNow.map((plan) => plan.outcome.hpAfter)), nextIncoming, maxHp: playerSim.maxHp } : null,
    });
  const potions =
    potionCapped || dryCheap
      ? []
      : potionsAll.filter(
          (potion) =>
            !isModelledPotion(potion.potion_id) &&
            // Refused earlier this turn, on a turn that does not need it.
            !(vetoed.includes(potion.potion_id) && !costly && !best.outcome.dies) &&
            !(reservedPotion(potion.potion_id, potion.text) && !offerReleased),
        );
  const dangerous =
    best.outcome.hpLoss >= Math.max(12, playerSim.hp * 0.4) || (kind !== "monster" && kind !== "unknown" && best.outcome.hpLoss >= 10);

  // 3. Code-decided cases.
  // Not with Tender on us: a lethal it makes one short is a turn of the Hunter Killer's hits (LSWU F21 T5:
  // 6/126 left, dead at 13 HP). The line still ranks first below; it only loses the shortcut.
  if (best.outcome.winsFight && playerSim.tender === 0) {
    commit(env, state.turn, best, hand, "code");
    return { kind: "act", label: "combat/lethal", intent: firstIntent(best, hand, env), rationale: `lethal: ${best.steps.map(stepText).join(", ")}${calcNote}` };
  }
  // A line that wakes a sleeper into next turn and is left within its first hit (+ next turn's other
  // hits) risks death: dropped while a line without that risk survives (FH3M F30 T2: Offering's Inferno
  // woke the Slumbering Beetle a turn early; 8 HP met ROLL_OUT 16 after the bowlbugs).
  const wakeRisk = (plan: Plan) => !plan.outcome.winsFight && (plan.outcome.wakeHit ?? 0) > 0 && plan.outcome.hpAfter <= nextIncoming + (plan.outcome.wakeHit ?? 0) + WAKE_MARGIN;
  const alive = solved.plans.filter((plan) => !plan.outcome.dies);
  const surviving = hardRuleLines(alive.some((plan) => !wakeRisk(plan)) ? alive.filter((plan) => !wakeRisk(plan)) : alive, enemies);
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
  // Setup value of a line, from code's own simulation: distinct powers played, plus one for permanent
  // Strength gained (Dominate / Molten Fist count only when the Vulnerable is there: the solver's
  // Strength says so; WR2Y F33 T1, CWMP F7). Under scale_then_kill a line with more setup than code's
  // pick in the first turns goes to Jev, and the HP guard keeps it unless it risks death.
  const setupCount = (plan: Plan): number =>
    new Set(plan.steps.filter((step) => !step.cardId.startsWith("POTION:") && cardFor(step, hand)?.type === "Power").map((step) => step.cardId)).size +
    (plan.outcome.strengthGained > 0 ? 1 : 0);
  // Hallway HP guard (balanced: from act 2 on, or ascension 5+, below 60% HP): a line may lose at most
  // max(6, 15% HP) more than the cheapest (VHLZ F21: -18 over a -10 line, then -25 over -15, into the
  // F22 room at 17/80 with no potions).
  const actNumber = Number(str(asRecord(state.run?.raw)["act_id"]) || 0) + 1;
  // The run's hp_policy moves where it starts (intent.ts hallwayGuardOn) and the objective/policy its slack.
  const hallwayGuard = (kind === "monster" || kind === "unknown") && hallwayGuardOn(hpPolicy, actNumber, state.run?.ascension ?? 0, hpFrac);
  const hallwayGuardSlack = Math.max(6, playerSim.hp * 0.15) * guardScale;
  // Boss race: a line whose extra damage per extra HP beats the race (boss HP left / our HP) is kept,
  // and not charged to the fight's budget, while it leaves next turn's hit + 5 (ZH8J F17: the budget
  // was spent by T8, then Bludgeon's 32 damage became 6 on T9 and Tear Asunder was swapped on T10;
  // the boss was left at 92/222).
  // (bossHpLeft counts a phase boss's later phases, above.)
  // The Insatiable: the Sandpit eats us at 0 whatever the HP, so HP the guard saves buys nothing once
  // the boss's HP over the turns left (Sandpit + Frantic Escapes still to play) is more than the best
  // line deals (WB02 F33: the guard swapped 4 lines, ~60 damage for ~35 HP; MAHA lost by 1 HP). The
  // guard then only keeps lines that do not die this turn (already all that are offered).
  const sandpitNow = Math.min(...enemies.filter((enemy) => enemy.hp > 0 && (enemy.sandpit ?? 0) > 0).map((enemy) => enemy.sandpit!));
  const sandpitDrawSource =
    !noDraw &&
    (hand.some((card) => card.playable && card.cardId !== "FRANTIC_ESCAPE" && card.cost <= playerSim.energy && drawsCards(card) && card.hpLoss < playerSim.hp) ||
      potionsAll.some((potion) => { const model = modelPotion(potion.potion_id, potion.name, potion.slot, potion.valid_targets, 0); return model !== null && drawsCards(model); }));
  const sandpitRaceLost =
    Number.isFinite(sandpitNow) &&
    bossHpLeft / Math.max(1, sandpitNow + franticEscapesLeft(state.raw, hand, playerSim.energy, sandpitDrawSource)) > Math.max(0, ...surviving.map((plan) => plan.outcome.damageDealt));
  // Damage into enemies that are neither minions nor illusions.
  const realDamage = (plan: Plan): number =>
    enemies
      .filter((enemy) => !enemy.minion && !enemy.illusion)
      .reduce((sum, enemy) => sum + Math.max(0, enemy.hp - Math.max(0, plan.outcome.enemyHpAfter.find((after) => after.index === enemy.index)?.hp ?? enemy.hp)), 0);
  const winsRace = (picked: Plan, replacement: Plan | null): boolean => {
    // Elites too: the guard swapped three racing lines and the Entomancer lived at 2/145 (6X8F F25).
    // Illusion fights (Obscura + Parafright) race the summoner too; damage into the illusion is not
    // progress (H8LC F23: the hallway guard swapped Uppercut -> Obscura for a line hitting the Parafright).
    const illusionFight = enemies.some((enemy) => enemy.illusion);
    // race / kill_fast: in every fight (intent.ts tradesHpForDamage).
    if ((kind !== "boss" && kind !== "elite" && !illusionFight && !tradesHpForDamage(objective)) || replacement === null) return false;
    const extraLoss = picked.outcome.hpLoss - replacement.outcome.hpLoss;
    const extraDamage = illusionFight ? realDamage(picked) - realDamage(replacement) : picked.outcome.damageDealt - replacement.outcome.damageDealt;
    return extraLoss > 0 && extraDamage > 0 && extraDamage / extraLoss >= bossHpLeft / Math.max(1, playerSim.hp) && picked.outcome.hpAfter >= nextIncoming + 5;
  };
  // Act-boss race (5th time: N28L, WB02, R2H1, EJXC F33 T5): the guard does not swap a line playing
  // Frantic Escape for one playing fewer (each Escape is a turn of the Sandpit: EJXC T5 swapped
  // "Strike, Frantic Escape, Twin Strike" -20 for "Strike, Twin Strike, Defend" -15, same damage, and the
  // Sandpit ran out on T7 with the boss at 31), nor trade damage the race needs for HP it can pay
  // (bossRaceTrade) while the boss clock says we are behind (boss HP left over the clock's turns left
  // is more than the swap deals).
  const escapesIn = (plan: Plan) => plan.steps.filter((step) => step.cardId === "FRANTIC_ESCAPE").length;
  const bossRaceKeeps = (picked: Plan, replacement: Plan | null): boolean => {
    if (kind !== "boss" || replacement === null) return false;
    if (escapesIn(picked) > escapesIn(replacement)) return true;
    const behind = need !== null && bossHpLeft / clockTurnsLeft > replacement.outcome.damageDealt;
    return (
      behind &&
      !setupRisksDeath(picked.outcome.hpAfter, nextIncoming, playerSim.maxHp) &&
      bossRaceTrade({
        extraDamage: picked.outcome.damageDealt - replacement.outcome.damageDealt,
        extraLoss: picked.outcome.hpLoss - replacement.outcome.hpLoss,
        hp: playerSim.hp,
        maxHp: playerSim.maxHp,
        bossHpLeft,
        needPerTurn: bossHpLeft / clockTurnsLeft,
      })
    );
  };
  // Elite/boss under kill_fast/race: the guard compares the HP lost until the kill, not this turn's
  // alone. A replacement that leaves the kill a turn later (enemy HP left / this fight's damage a turn,
  // rounded up) pays one more turn of the enemy's expected hit for each extra turn (G8F1 F30: the guard
  // swapped Bludgeon -15 for Flame Barrier -3 and T6's 30- and 21-damage lines for 23 and 7; the Prism
  // lived to T8 at -71; VF5C F27).
  const killTurns = (plan: Plan): number =>
    plan.outcome.winsFight ? 1 : 1 + Math.ceil(Math.max(0, bossHpLeft - realDamage(plan)) / Math.max(1, perTurn));
  const killsSooner = (picked: Plan, replacement: Plan | null): boolean => {
    if (replacement === null || (kind !== "elite" && kind !== "boss") || !tradesHpForDamage(objective)) return false;
    const later = killTurns(replacement) - killTurns(picked);
    if (later <= 0) return false;
    return picked.outcome.hpLoss <= replacement.outcome.hpLoss + later * nextIncoming && !setupRisksDeath(picked.outcome.hpAfter, nextIncoming, playerSim.maxHp);
  };
  // scale_then_kill: a line with more setup is kept unless it risks death (intent.ts guardProtectsSetup;
  // JF99 F33 T4/T7: Crimson Mantle traded twice for 6 HP and never played, the crabs died at 7 and 38
  // HP left). No other objective protects setup (0YG4 F43 T4: Dark Embrace + Blood Wall kept into a
  // Heavy Cleave).
  const guardKeepsSetup = (picked: Plan, replacement: Plan | null): boolean =>
    winsRace(picked, replacement) ||
    killsSooner(picked, replacement) ||
    bossRaceKeeps(picked, replacement) ||
    (replacement !== null && guardProtectsSetup(objective, { setup: setupCount(picked), hpAfter: picked.outcome.hpAfter }, { setup: setupCount(replacement) }, nextIncoming, playerSim.maxHp));
  // Only under scale_then_kill (MX1Q F23 T2: Inflame lines at 24/26 damage over 44/54 at the same HP,
  // pulled in against a Chomper pair when any plan listed a setup card).
  const setupLine = promotesSetup(objective, state.turn ?? 1, laterPhase)
    ? surviving.filter((plan) => setupCount(plan) > setupCount(top)).sort((a, b) => setupCount(b) - setupCount(a) || b.score - a.score)[0]
    : undefined;
  const setupClose = setupLine !== undefined && !setupRisksDeath(setupLine.outcome.hpAfter, nextIncoming, playerSim.maxHp);
  if (setupClose && !options.includes(setupLine)) options.push(setupLine);
  const second = options.find((plan) => plan !== top);
  const clear = (!second || top.score - second.score >= CLOSE_CALL) && !setupClose;
  if (clear && !((dangerous || kind === "boss" || pressed || costly) && potions.length > 0)) {
    // Code's own pick in an elite/boss fight meets the same HP bound as Jev's (7DXA F33 T1-T2: code
    // traded -17 and -20 against the Kaiser Crab with Blood Wall lines at -3..-6 in hand, Jev was never
    // asked, and T4's laser killed us exactly). Not recorded against the fight's budget: that is for
    // extra HP a model chose to accept.
    let guarded =
      (kind === "elite" || kind === "boss") && !top.outcome.winsFight
        ? hpGuardReplacement(top, surviving, playerSim.hp, hpGuardSlack(playerSim.hp, kind, hpGuardExtra(env)) * guardScale)
        : hallwayGuard && !top.outcome.winsFight
          ? hpGuardReplacement(top, surviving, playerSim.hp, hallwayGuardSlack)
          : null;
    if (guarded && guardKeepsSetup(top, guarded)) guarded = null;
    // Racing the Waterfall Giant's eruption, damage is the defence (KG0E F17: the guard swapped four
    // lines, ~66 damage, one to a 0-damage turn; the boss healed and the eruption outgrew us).
    if (raceEruption || sandpitRaceLost) guarded = null;
    if (guarded) {
      commit(env, state.turn, guarded, hand, "code");
      return {
        kind: "act",
        label: "combat/plan-guarded",
        intent: firstIntent(guarded, hand, env),
        rationale: `code plan ${top.steps.map(stepText).join(", ") || "end turn"} loses ${top.outcome.hpLoss} HP, over the HP guard bound; playing ${guarded.steps.map(stepText).join(", ") || "end turn"} instead (hp -${guarded.outcome.hpLoss}, dmg ${guarded.outcome.damageDealt})${calcNote}`,
      };
    }
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
  const focusDamage = (plan: Plan): number | null => {
    if (focusIndex === null) return null;
    const before = enemies.find((enemy) => enemy.index === focusIndex);
    const after = plan.outcome.enemyHpAfter.find((entry) => entry.index === focusIndex);
    return before && after ? Math.max(0, before.hp - after.hp) : null;
  };
  // Intent compliance of each option (intent.ts combatFit): "fits <intent>: …" / "breaks <intent>: …".
  // Sandpit turns bought count as damage, and code's rank 1 never "breaks" its own objective (9V09).
  const sandpitField: SandpitField | undefined = pitClock
    ? { turnValue: pitClock.value, behind: pitClock.behind, now: pitNow, turnsNeeded: pitClock.turnsNeeded, maxEscapes: Math.max(0, ...options.map(escapesIn)) }
    : undefined;
  // The Queen's YOU_ARE_MINE turn is the last one before 99 Weak/Frail/Vulnerable on us: lines are
  // ranked by damage into the Torch Head Amalgam, whatever the objective (H7W0 F48 T2: Jev took a
  // 15-damage setup line over 63 into the Amalgam; it died with 77 left).
  const queenBurst = youAreMineTurn(combat);
  const burstTarget = queenBurst ? enemies.find((enemy) => enemy.index === queenBurst.amalgamIndex) : undefined;
  const burstDamage = (plan: Plan): number => {
    if (!burstTarget) return 0;
    const after = plan.outcome.enemyHpAfter.find((entry) => entry.index === burstTarget.index)?.hp ?? 0;
    return Math.max(0, burstTarget.hp - Math.max(0, after));
  };
  const field: LineField = {
    minLoss: Math.min(...options.map((plan) => plan.outcome.hpLoss)),
    // Code's best line under the intents: every label prices a line against it, from the same score.
    best: { hpLoss: top.outcome.hpLoss, damage: objectiveDamage({ damage: top.outcome.damageDealt, escapes: escapesIn(top) }, sandpitField), setup: setupCount(top) },
    near: LABEL_NEAR,
    ...(burstTarget ? { burst: { target: burstTarget.name, maxDamage: Math.max(0, ...options.map(burstDamage)), why: "YOU_ARE_MINE: the last turn before 99 Weak/Frail/Vulnerable" } } : {}),
    maxDamage: Math.max(...options.map((plan) => objectiveDamage({ damage: plan.outcome.damageDealt, escapes: escapesIn(plan) }, sandpitField))),
    ...(sandpitField ? { sandpit: sandpitField } : {}),
    // Setup that risks death is no setup to skip (intent.ts setupRisksDeath).
    maxSetup: Math.max(0, ...options.filter((plan) => !setupRisksDeath(plan.outcome.hpAfter, nextIncoming, playerSim.maxHp)).map(setupCount)),
    slack: hpGuardSlack(playerSim.hp, kind) * guardScale,
    focusName: enemies.find((enemy) => enemy.index === focusIndex)?.name ?? undefined,
  };
  const fitFor = (plan: Plan) =>
    combatFit(
      objective,
      hpPolicy,
      {
        hpLoss: plan.outcome.hpLoss,
        damage: plan.outcome.damageDealt,
        setup: setupCount(plan),
        winsFight: plan.outcome.winsFight,
        focusDamage: fightPlan ? focusDamage(plan) : null,
        escapes: escapesIn(plan),
        codeTop: plan === top,
        // Signed: a line scoring above code's pick (picked for dominating the score-best) is not "best".
        scoreGap: plan === top ? 0 : top.score - plan.score,
        burstDamage: burstDamage(plan),
      },
      field,
    );
  const reserveTag = (plan: Plan): Record<string, JsonValue> => (reserveNote && drinksReserved(plan) ? { reserve: `drinks a potion reserved for the act boss (released: ${reserveNote})` } : {});
  const fitOf = (plan: Plan): Record<string, JsonValue> => (fightPlan || runPlan || burstTarget ? { intent_fit: fitFor(plan).label, ...reserveTag(plan) } : {});
  const criteria: Record<string, string | null> = {};
  const byKey = new Map<string, { plan?: Plan; potion?: ActionRequest; label: string }>();
  options.forEach((plan, index) => {
    const key = `plan${index + 1}`;
    criteria[key] = JSON.stringify({ ...describePlan(plan, playerSim.maxHp), ...fitOf(plan) });
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
          ...(reservedPotion(potion.potion_id, potion.text) ? { reserve: `reserved for the act boss by the run plan; released: ${offerReleased}` } : {}),
          note: `the cheapest card plan alone loses ${Math.min(...options.map((plan) => plan.outcome.hpLoss))} HP this turn`,
          // Labelled like the lines (never a bare pre-step): what it is for and whether an intent asks for it.
          intent_fit: potionOptionFit({
            role: potionRole(potion.potion_id, potion.text),
            objective,
            bossFight: kind === "boss",
            bossClock: bossClockNow,
            cheapestLoss: Math.min(...options.map((plan) => plan.outcome.hpLoss)),
            hp: playerSim.hp,
            useCost: potionUseCost,
          }),
        });
        byKey.set(key, {
          potion: target === null ? { action: "use_potion", option_index: potion.slot } : { action: "use_potion", option_index: potion.slot, target_index: target },
          label: `drink ${potion.name}`,
        });
      }
    }
  }

  // The strategic intents in force, one line each with what they mean (intent.ts intentLines).
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
    ...(strategy.length > 0 ? { strategy } : {}),
    ...(fightPlan || runPlan || burstTarget ? { labels: LABEL_NOTE } : {}),
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
      jevCriteria[`plan${index + 1}`] = JSON.stringify({ ...describePlan(plan, playerSim.maxHp), ...planFacts(plan, ctx), ...fitOf(plan) });
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
  const fallback = (why: string, line: Plan = top, vetoIds: string[] = []): ResolvedAction => ({
    intent: firstIntent(line, hand, env),
    rationale: `${why}; using the code-best ${line === top ? "plan" : "potion-free plan"}`,
    confidence: null,
    fallback: true,
    apply: () => {
      commit(env, state.turn, line, hand, "code");
      // The refused potions stay refused for the rest of this turn's re-plans (see heldBack).
      const drunk = new Set(line.steps.filter((step) => step.cardId.startsWith("POTION:")).map((step) => step.cardId.split(":")[1] ?? ""));
      const ids = vetoIds.filter((id) => id !== "" && !drunk.has(id));
      if (ids.length > 0) {
        const fight = fightKey(state);
        const turn = state.turn ?? null;
        const before = env.screenMemory.potionVeto;
        const kept = before && before.fight === fight && before.turn === turn ? before.ids : [];
        env.screenMemory.potionVeto = { fight, turn, ids: [...new Set([...kept, ...ids])] };
      }
    },
  });
  const potionIdsOf = (option: { potion?: unknown; plan?: Plan }): string[] => {
    const slot = (option.potion as { option_index?: number } | undefined)?.option_index;
    const fromSlot = slot === undefined ? [] : potionsAll.filter((potion) => potion.slot === slot).map((potion) => potion.potion_id);
    const fromPlan = (option.plan?.steps ?? []).filter((step) => step.cardId.startsWith("POTION:")).map((step) => step.cardId.split(":")[1] ?? "");
    return [...fromSlot, ...fromPlan];
  };

  // The Sandpit race behind the clock: a potion veto never swaps Jev's pick for a line playing fewer
  // Frantic Escapes, nor refuses an energy potion drunk first while the hand holds more Escapes than
  // the energy pays for (9V09 F33 T2: two 1-cost Escapes and three attacks at 3 energy, Radiant
  // Tincture offered; T4 its pick was vetoed by a potion-free line).
  const escapeCostInHand = hand.filter((card) => card.cardId === "FRANTIC_ESCAPE" && card.playable).reduce((sum, card) => sum + Math.max(0, card.cost), 0);
  const keepsEscapes = (chosen: { plan?: Plan; potion?: ActionRequest }, swapIn: Plan): boolean => {
    const slot = (chosen.potion as { option_index?: number } | undefined)?.option_index;
    const potion = potionsAll.find((entry) => entry.slot === slot);
    return sandpitVetoExempt({
      behind: pitClock?.behind ?? false,
      chosenEscapes: chosen.plan ? escapesIn(chosen.plan) : null,
      swapInEscapes: escapesIn(swapIn),
      energyPotion: potion !== undefined && ENERGY_POTIONS.test(`${potion.potion_id} ${potion.text}`),
      escapeCostInHand,
      energy: playerSim.energy,
    });
  };

  return {
    kind: "ask",
    label: offerPotions && potions.length > 0 ? "combat/plan-choice+potion" : "combat/plan-choice",
    state: questionState,
    questions: { plan: choiceQ("Which plan should I play this turn?", criteria) },
    ...(jevView ? { jevView } : {}),
    // Hallway, non-dangerous turns are not escalated: the supervisor picked code's rank-1 plan in 12 of
    // 15 such escalations, so a near-guess from Jev falls back to that plan instead (see resolve).
    // FIGHT_PLAN=v1: DeepSeek planned the fight at its start and answers no per-turn choice.
    ...((kind === "elite" || kind === "boss" || dangerous) && env.fightPlan !== "v1"
      ? { escalate: { question: "plan", below: 0.5, why: `${kind} fight${dangerous ? ", dangerous turn" : ""}` } }
      : {}),
    resolve(answers): ResolvedAction {
      const answer = answers["plan"];
      if (!answer || answer.type !== "choice") return fallback("no usable answer from Jev");
      const chosen = byKey.get(answer.choice);
      if (!chosen) return fallback(`Jev chose unknown option "${answer.choice}"`);
      const hallway = !(kind === "elite" || kind === "boss" || dangerous);
      const escalatedBy = answer.raw === undefined ? undefined : (answer.raw as { escalated?: "deepseek" | "claude" }).escalated;
      const fromJev = answer.raw !== undefined && !escalatedBy;
      const drinks = chosen.potion !== undefined || (chosen.plan?.steps.some((step) => step.cardId.startsWith("POTION:")) ?? false);
      // A turn that costs a lot whatever is played is what potions are for: Jev's potion pick stands
      // there (C2WY F22 T4-T5: Attack Potion picks overridden at 27 -> 18 -> 1 HP, died with 3 potions).
      // Low HP alone is not enough (VC4L, NZR7 were pressed turns losing 0-7 HP).
      // Not on a near-guess (M75J F37: Blood Potion at 0.14 on 78/111 HP, healed to full by the next event).
      const potionTurn = drinks && (costly || dangerous) && answer.confidence >= 0.25;
      // Potion lines are not exempt from the near-guess fallback (VC4L F23 T1: Gambler's Brew at 0.05).
      if (hallway && fromJev && answer.confidence < 0.3 && chosen.plan !== top && !potionTurn) {
        return fallback(`Jev near-guess (${answer.confidence.toFixed(2)}) on a hallway turn`);
      }
      // Hallway (monster/unknown) fights: a potion line below code's rank 1 needs a confident Jev (NZR7
      // F6: rank 4 at 0.57 and 0.53 for 13 and 3 more damage, 0 potions into the elite; JGJS F23: rank 3
      // at 0.58/0.59, then an energy potion at 0.55 the escalator had just kept). Escalator picks stand.
      const hallwayFight = kind === "monster" || kind === "unknown";
      // Elite/boss: an attack potion on a line below code's rank 1 that does not win needs Jev at 0.5+
      // (Y27B F33 T2: Flex drunk at 0.32 on a fully blocked turn for ~10 damage; kept, it was the +20
      // that kills the demon at 12/379 before the overwhelm).
      const offensiveDrink =
        (chosen.potion !== undefined && OFFENSIVE_POTIONS.has(potionsAll.find((potion) => potion.slot === (chosen.potion as { option_index?: number }).option_index)?.potion_id ?? "")) ||
        (chosen.plan?.steps.some((step) => step.cardId.startsWith("POTION:") && OFFENSIVE_POTIONS.has(step.cardId.split(":")[1] ?? "")) ?? false);
      // Elite/boss: a potion line picked by Jev under 0.5 when a potion-free option loses no more HP
      // (VHLZ F17 T2: Speed Potion at 80/80 and 0.19 with a 0-loss dry line; F14 T1 Glowwater at 0.20):
      // the dry option instead.
      // A drink-first pick (no line: the turn is re-planned after the potion) is only refused when the
      // best dry line is nearly free; measured against the least loss of any line the dry line always
      // won (M812 F28/F33: vetoed at 24 and 10 HP; 9YR9 F17, F3SS F33: potions carried to the death).
      // Nor is a potion refused when the best dry line still costs 30% of our HP.
      // Not when Jev agrees with code's rank 1 (WLY1 F33 T1: the Flex line, 42 damage, was vetoed for a
      // 26-damage dry line losing the same HP).
      if (!hallwayFight && fromJev && drinks && chosen.plan !== top && answer.confidence < 0.5 && !(chosen.plan?.outcome.winsFight ?? false)) {
        const dry = options.filter((plan) => !plan.steps.some((step) => step.cardId.startsWith("POTION:")));
        const bestDryLoss = dry.length > 0 ? Math.min(...dry.map((plan) => plan.outcome.hpLoss)) : Infinity;
        // Refusing the potion plays a dry line, not code's rank 1 when that drinks (F3SS F33 T3: the
        // fallback drank the Dexterity Potion anyway).
        // The veto rests on the least-loss dry line, so that is the one played (P2E4 F48 T2: justified by a
        // -5 dry line, the top-scoring dry line lost 19).
        const leastDry = dry.filter((plan) => plan.outcome.hpLoss === bestDryLoss);
        const dryTop = dry.includes(top) && top.outcome.hpLoss === bestDryLoss ? top : (leastDry[0] ?? dry[0] ?? top);
        if (dryLineOverridesPotion(chosen.plan?.outcome.hpLoss, bestDryLoss, playerSim.hp) && !keepsEscapes(chosen, dryTop)) return fallback(`Jev chose a potion at ${answer.confidence.toFixed(2)} in a ${kind} fight while a potion-free line loses no more HP`, dryTop, potionIdsOf(chosen));
      }
      // Boss, drink-first (the line is re-planned after the potion), every dry line losing 10+: the
      // potion stands (MF7A F17 T7, 24HM F33, H1FA F17 T2-T7: attack potions refused, died holding them).
      const dryLossNow = Math.min(...options.filter((plan) => !plan.steps.some((step) => step.cardId.startsWith("POTION:"))).map((plan) => plan.outcome.hpLoss));
      const bossDrinkFirst = kind === "boss" && chosen.plan === undefined && dryLossNow >= BOSS_DRINK_FIRST_LOSS;
      // Not when code's rank 1 drinks the same attack potion: nothing is kept, the veto would only swap
      // in a costlier line (RVL2 F31 T1: -2 with Explosive Ampoule refused for -10 with the Ampoule).
      const topDrinks = new Set(potionIdsOf({ plan: top }));
      const sameOffensive = potionIdsOf(chosen).some((id) => OFFENSIVE_POTIONS.has(id) && topDrinks.has(id));
      if (!hallwayFight && fromJev && offensiveDrink && !sameOffensive && !keepsEscapes(chosen, top) && !bossDrinkFirst && chosen.plan !== top && !(chosen.plan?.outcome.winsFight ?? false) && answer.confidence < 0.5) {
        return fallback(`Jev chose an attack potion below code rank 1 at ${answer.confidence.toFixed(2)} in a ${kind} fight`, top, potionIdsOf(chosen).filter((id) => !topDrinks.has(id)));
      }
      if (hallwayFight && fromJev && drinks && !potionTurn && chosen.plan !== top && answer.confidence < HALLWAY_POTION_CONFIDENCE) {
        return fallback(`Jev chose a potion line below code rank 1 (${answer.confidence.toFixed(2)} < ${HALLWAY_POTION_CONFIDENCE}) in a hallway fight`, top, potionIdsOf(chosen).filter((id) => !topDrinks.has(id)));
      }
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
      // A near-guess from Jev in an elite/boss fight (DeepSeek no longer re-asks) never plays a line
      // another option beats on every axis (SVN2 F17 T3: a 0-damage line at 0.36 over one with the same
      // HP loss and 15 damage).
      const dominator = !hallway && fromJev && answer.confidence < 0.4 ? options.find((plan) => plan !== chosen.plan && dominates(plan, chosen.plan!)) : undefined;
      const picked = dominator ?? chosen.plan!;
      // Boss/elite/dangerous choices: the guard, with a per-fight budget for the extra HP accepted.
      // This turn's own earlier entry (a re-plan) is replaced, so it does not count against this choice.
      const memo = env.screenMemory.hpGuard;
      const thisTurn = memo && memo.fight === hpGuardFight(env) ? (memo.turns[String(state.turn ?? "?")] ?? 0) : 0;
      const slack = hpGuardSlack(playerSim.hp, kind, hallway ? 0 : hpGuardExtra(env) - thisTurn) * guardScale;
      // The guard never swaps into a line drinking a potion refused this turn or a reserved one (MGJ8
      // F11 T1: -10 swapped for a line drinking the Fortifier kept for the boss; the boss at F17 then
      // died 3 HP short of us).
      const guardOptions = options.filter((plan) => plan === picked || (!drinksVetoed(plan) && !drinksReserved(plan)));
      const proposed = hallway
        ? hallwayGuard && !picked.outcome.winsFight
          ? hpGuardReplacement(picked, guardOptions, playerSim.hp, hallwayGuardSlack)
          : null
        : hpGuardReplacement(picked, guardOptions, playerSim.hp, slack);
      const raceKept = proposed !== null && (winsRace(picked, proposed) || killsSooner(picked, proposed));
      const replacement = proposed && (guardKeepsSetup(picked, proposed) || raceEruption || sandpitRaceLost) ? null : proposed;
      const plan = replacement ?? picked;
      // Frantic Escape's HP is survival, not greed: not charged to the fight's budget (EJXC F33 T2-T3:
      // two Escape lines spent the 12 HP budget, and T5's guard then dropped the third Escape).
      const extra = plan.outcome.winsFight || escapesIn(plan) > 0 ? 0 : Math.max(0, plan.outcome.hpLoss - Math.min(...options.map((option) => option.outcome.hpLoss)));
      const rank = options.indexOf(plan) + 1;
      // Jev's own pick of an option that breaks a soft intent: logged as a deviation of this plan version.
      const fit = fromJev ? fitFor(picked) : null;
      const deviation = fit?.breaks && (fightPlan || runPlan) ? { intent: fit.label, runPlanVersion: runPlan?.version ?? null, fightObjective: objective } : undefined;
      const guardNote = replacement
        ? `; HP guard: plan ${options.indexOf(picked) + 1} (${chosen.label}) loses ${picked.outcome.hpLoss} HP, more than ${slack.toFixed(0)} over the cheapest line${slack === 0 ? ` (this fight already took ${HP_GUARD_FIGHT_BUDGET}+ extra HP)` : ""}, playing plan ${rank} (${plan.steps.map(stepText).join(", ") || "end turn"}; hp -${plan.outcome.hpLoss}) instead`
        : "";
      return {
        intent: firstIntent(plan, hand, env),
        rationale: `Jev chose plan ${options.indexOf(picked) + 1}/${options.length} (${chosen.label}) with confidence ${answer.confidence.toFixed(2)}; code rank ${options.indexOf(picked) + 1}${guardNote}${calcNote}`,
        confidence: answer.confidence,
        fallback: false,
        ...(replacement ? { guard: { kind: "hp" as const, choice: `plan${rank}`, plan: plan.steps.map(stepText).join(", ") || "end turn" } } : {}),
        ...(deviation ? { deviation } : {}),
        apply: () => {
          commit(env, state.turn, plan, hand, escalatedBy ?? "jev");
          if (!hallway) recordHpGuard(env, state.turn, raceKept ? 0 : extra);
        },
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
  // Reserved potions stay in the belt unless the hit kills us, HP is below 25%, or this is the boss.
  const released = reserveReleased({ bossFight: kind === "boss", hpFraction: player.maxHp > 0 ? player.hp / player.maxHp : 1, everyDryLineDies: incoming >= player.hp });
  const reserve = activeRunPlan(env)?.reserve;
  const potions = potionViews({ raw: asRecord(env.state.run?.raw) }, env.knowledge).filter(
    (potion) => potion.can_use && potion.potion_id !== "FOUL_POTION" && (released !== null || !isReserved(reserve, potion.potion_id, potion.text)),
  );
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
