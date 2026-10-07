/**
 * Combat, turn-planned (phase 2). Division of labour:
 *
 *   code  — enumerates every play order for the hand, simulates the turn, scores the end states
 *           (turn-solver.ts). Lethal, "only one line survives", and clear-best plans are played
 *           without asking anyone.
 *   Jev   — chooses between the strategically different plans that code cannot separate (e.g.
 *           block now vs. set up Strength vs. race), and decides about potions: every modelled
 *           potion is on a shown line, and code drinks on its own only when no potion-free line
 *           survives. A lethal that needs a potion is Jev's call too. Which enemy to kill first is
 *           Jev's call: each kind of enemy has a "focus" line, and every line's rollout compares the
 *           kill orders.
 *
 * A chosen plan is committed: its remaining steps are played without re-asking as long as the hand
 * is exactly what the plan expected. Anything unexpected (a draw, a random effect) invalidates it and
 * the turn is re-planned from the real board.
 *
 * Falls back to the per-card question (combat.ts) when the solver has nothing to offer: no plan
 * survives the turn, or the board is outside what the solver models.
 */

import { choiceQ } from "./jev/questions.js";
import { silentPhaseReference } from "./silent-phase-reference.js";
import { silentLossReference } from "./silent-loss-reference.js";
import type { ActionRequest } from "../hand/mod/client.js";
import type { ActionExpect } from "../hand/act/identity.js";
import { enemyPowerText, playerJson, potionViews } from "../memory/narrow.js";
import { briefJson, combatBriefJson } from "../memory/run-brief.js";
import { hintText, selectHints } from "../knowledge/jev-hints.js";
import type { AskDecision, CombatPlanMemo, Decision, DecisionEnv, ResolvedAction, ScreenMemory } from "../memory/types.js";
import { boardDamageContext, damageForecast, expectedNextDamage, revivingForecast, type DamageContext } from "../knowledge/move-model.js";
import { cardConditionOptions, CHOICE_POTIONS, expectedDraw, heldPenaltyOf, isPlayFirst, isStrikeCard, modelHandCard, modelPotion, offHandCardModel, pileCardPick, pilePowerExtraCost, potionCardCost, potionPowerExtraCost, randomPotionKind, stripPenNib, stripPhantomBlades, stripVigor, upgradeDelta, withPowerExtraCost, type CardModel, type PotionContext, type UpgradeDelta } from "./card-model.js";
import { POOL_RARITIES, potionMcCriteria, potionMcLog, potionMcOptions, runPotionMc, seedOf, type PotionMc, type PotionMcSource } from "./potion-mc.js";
import type { CardInfo } from "../knowledge/index.js";
import type { PotionView } from "../memory/narrow.js";
import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../hand/mod/schema.js";
import { distinctPlans, dominates, drawsCards, effectiveLoss, EXHAUST_HAND, EXHAUST_PICKERS as SOLVER_EXHAUST_PICKERS, HAND_LIMIT, hpText, mantleHpCost, MOVE_RULE_POWERS, musicBoxCopy, PEN_NIB_EVERY, replaySteps, SHRINKER, solveTurn, STRIP_COUNTERS, type DeathMove, type DrawPileCard, type EnemySim, type MoveOnStrip, type Plan, type PlayerSim, type Revive, type SolverInput, type Step } from "./turn-solver.js";
import { asArray, asRecord, bool, num, numOrNull, str, type JsonValue } from "../core/util/json.js";
import { liveSolverFields } from "./passive-pieces.js";
import { infernoCopies, startTurnHpLossOf } from "./start-loss.js";
import { planCombat as planCombatPerCard } from "./combat.js";
import { fightKey, fightPlanJson, planFit, planOffersPotion, type FightPlan } from "../memory/fight-plan.js";
import { permafrostBlock } from "./permafrost.js";
import { recordStateFightPlays } from "./fight-plays.js";
import { RELIC_VALUES } from "../knowledge/relic-values.js";
import { forcedEliteWithin } from "../hand/screens/rest.js";
import { bossLossPerTurn, bossProfile, damageGap, eruptionAt, eruptionSchedule, laterPhaseHps, SIPHON_HEAL } from "../sim/boss-clock.js";
import { DRINK_FIRST_ROLLOUT, killOrders, liveRollout, noEffectTwin, pickRolloutBest, rolloutFacts, rolloutKillLine, rolloutLiveOptions, rolloutLog, thiefSamples, summonThreatAt, type KillGroup, type LiveRollout } from "./rollout-live.js";
import { selectLessons, offeredOn, type ExperienceEntry } from "../knowledge/experience.js";
import { heldPotionWorth } from "../knowledge/potion-equivalents.js";
import { potionCostFact, potionCostOptions, potionCosts, potionCostText, withPotionCost, type PotionCost } from "./potion-cost.js";
import { actThreatIds, bossOnBoard, monsterMoves, moveAmountAt, moveDamageAt, moveTurns, observedMechanics, regularEffect, shownDamageAt, spawnsAt } from "../knowledge/monster-db.js";
import { clearedWith, deathRulesOf, moveRulesOf, stripStunRules, type DeathRule, type MoveRule, type StripStunRule } from "../knowledge/mechanics.js";
import { jevExperience, jevLessonLine } from "./jev-experience.js";
import type { RunPlan } from "../memory/run-plan.js";
import { BOSS_LINES_TIE_SE, bossLineSim, bossLinesOptions, lowTrustOfState, releaseBossLinesPool, simCompare, simLog, simNote, simWinsLess, wonLoss, type BossLineSim } from "../sim/boss-lines.js";
import { computeMemoFor, dropComputeMemo, type ComputeMemo } from "../sim/compute-memo.js";
import { loadavg } from "node:os";
import { killsThief, lastTurnKillLine, lastTurnLoot, lootText, shownKillLine, thiefContextJson, thiefFact, thiefTag, thievesOf, withLoot, type Thief } from "./thief.js";
import { knownTopIndices } from "../sl/draws.js";
import { explorePoint, exploreReplacement, lineText, MAY_REPEAT, playKey, rankByOrder, replayChoice, summaryPlay, triedHas, turnCanon, type ExploreB2, type ExploreChoice, type ExploreLine, type SlExploreEnv, type SlPoint } from "../sl/explore.js";
import { ANY_DRAW_BUDGET_MS, MODELLED_POWERS, type DrawBound, type LeastLossFacts } from "../sl/judge.js";
import { randomTargetOnly, randomTargets } from "../sl/random-target.js";

/**
 * Potions are Jev's call (Dai 2026-09-28): the solver prices a potion line on its simulated outcome
 * less the potion's cost (Dai 2026-09-30, potion-cost.ts: its held value in the potion table, 0 in a boss
 * fight; the rollout ranks lines by deaths, then HP lost plus that cost), every modelled potion in the belt is
 * on at least one shown line beside a "no potion this fight" line, and Jev gets the facts to judge keeping it
 * (potion_context, each option's potion_cost). Code drinks on its own only when no potion-free line
 * survives the turn; a lethal that needs a potion is asked (potionLethalLines). The per-rule
 * potion filters and vetoes (hallway save/damage/confidence thresholds, the elite/boss dry-line veto,
 * the attack-potion confidence veto, the boss one-potion-a-turn cap) are gone.
 */

/** Enemy powers the solver models, or that do not change this turn's numbers. */
const MODELLED_ENEMY_POWERS = new Set([
  "VULNERABLE_POWER", "WEAK_POWER", "STRENGTH_POWER", "ARTIFACT_POWER", "INTANGIBLE_POWER", "SLIPPERY_POWER",
  // silent-0216: poison is already carried by enemySims and resolved by the solver.
  "POISON_POWER",
  "HARDENED_SHELL_POWER", "THORNS_POWER", "CURL_UP_POWER", "FLUTTER_POWER", "HARD_TO_KILL_POWER", "SLOW_POWER",
  "ILLUSION_POWER", "MINION_POWER", "TERRITORIAL_POWER", "PLOW_POWER", "ESCAPE_ARTIST_POWER", "PLATING_POWER",
  "SLUMBER_POWER", "INFESTED_POWER", "SWIPE_POWER", "IMBALANCED_POWER", "RITUAL_POWER", "SHRINK_POWER",
  "GUARDED_POWER", "SOAR_POWER", "SKITTISH_POWER", "REFLECT_POWER", "SUCK_POWER", "PAINFUL_STABS_POWER", "PAPER_CUTS_POWER",
  "CRAB_RAGE_POWER", "BURROWED_POWER", "RAMPART_POWER", "STEAM_ERUPTION_POWER", "REATTACH_POWER",
  "SANDPIT_POWER", "ASLEEP_POWER", "ENRAGE_POWER", "ADAPTABLE_POWER", "NEMESIS_POWER",
  // Infested Prism: every Skill gives us Tainted (`vitalSpark`); left unmodelled it cut our damage by 20%.
  "VITAL_SPARK_POWER",
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
  // Terror Eel: Vigor adds to its own next attack (in the intent when that is this turn's; the rollout
  // carries it to later turns). Left unmodelled it cut our damage by 20% (XLJQ6FPQAU7N F7: T3/T5/T6
  // predicted 26/16/19, dealt 33/21/26).
  "VIGOR_POWER",
  // Battleworn Dummy event: turns left to kill it (`timeLimit`); left unmodelled it cut our damage by 20%
  // (SK1USHSB1U7U F43: 144 of 150 in the 3 turns).
  "BATTLEWORN_DUMMY_TIME_LIMIT_POWER",
  // Coverage review 2026-09-29 #3: the 0.8 cut fired on 6% of logged turns, damage then 1.16-1.2x the plan.
  // Corpse Slug: stunned and stronger when another enemy dies (`ravenous`).
  "RAVENOUS_POWER",
  // No number of this turn's fight in them: gold stolen and given back (Gremlin Merc, Fat Gremlin), the Tough
  // Egg's hatch countdown (its moves after it are the move model's), our Strength/Dexterity given back on
  // death (The Lost, The Forgotten; its stolen Dexterity is its block, not our damage).
  "THIEVERY_POWER", "HEIST_POWER", "HATCH_POWER", "POSSESS_STRENGTH_POWER", "POSSESS_SPEED_POWER", "DEXTERITY_POWER",
  // Galvanic (Globe Head): not a number-free power after all. Its 「受到6点伤害」 is in every Power's own text in hand, and
  // the solver now takes it from there (card-model playSelfDamageOf -> selfDamage, through our block). It was read as
  // nothing: playing Powers under it read free, +1.04 a turn on 70 logged turns (+1.68 on those not won), 30 of 31
  // plays lost 6 of HP + block (notes/mechanics-proposals.md §4).
  "GALVANIC_POWER",
  // Our temporary Strength loss on it (Mangle, Dark Shackles, Shackling Potion, Piercing Wail): already in its
  // STRENGTH_POWER and intents, and the rollout gives it back after the turn.
  "MANGLE_POWER", "DARK_SHACKLES_POWER", "SHACKLING_POTION_POWER", "PIERCING_WAIL_POWER",
  // Zapbot: +2 Strength at the end of its turn, like Territorial (scaling; the rollout grows it).
  "HIGH_VOLTAGE_POWER",
  // Gremlin Merc: on death a Fat and a Sneaky Gremlin (`spawnsOnDeath`, like the Phrog's Infested).
  "SURPRISE_POWER",
]);

/** What an enemy with an on-death spawn power brings when it dies, as shown ("4 x 蠕虫 (~20 HP each)"). */
function spawnText(enemy: Record<string, unknown>, asc: number): string | undefined {
  if (powerAmount(enemy, "INFESTED_POWER") <= 0 && powerAmount(enemy, "SURPRISE_POWER") <= 0) return undefined;
  const spawns = spawnsAt(str(enemy["enemy_id"]), asc);
  if (!spawns) return "more enemies (what spawns is not logged)";
  return spawns.map((spawn) => `${spawn.count} x ${spawn.name} (~${spawn.hp} HP${spawn.count > 1 ? " each" : ""})`).join(" + ");
}

/** The enemy's powers the solver does not model (MODELLED_ENEMY_POWERS): damage into it is counted at 80%. */
export function unmodelledEnemyPowers(enemy: Record<string, unknown>): string[] {
  return asArray(enemy["powers"]).map((power) => str(asRecord(power)["power_id"])).filter((id) => id !== "" && !MODELLED_ENEMY_POWERS.has(id));
}

/** Powers whose meaning the models cannot guess from the id (TTVY T6: DeepSeek never saw the Sandpit). */
const POWER_NOTES: Record<string, string> = {
  SANDPIT_POWER: " (countdown: -1 every enemy turn; at 0 I die whatever my HP and block; each Frantic Escape played +1)",
  ASLEEP_POWER: " (asleep, no attacks: the first HP damage wakes it at once, block damage does not; set up powers instead of chipping it)",
  SLUMBER_POWER: " (sleeping, no attacks: -1 each turn and -1 per hit that takes HP; wakes at 0)",
  CRAB_RAGE_POWER: " (when its partner dies it gains 99 Block and +6 Strength: the Block lasts one turn: past runs won 9/12 when the Rocket died first and 8/39 with both alive to the end, so put single-target damage into the Rocket and block the turn after it dies; start-of-turn damage to all enemies (Mercury Hourglass 3, Inferno) kills a partner left that low; enemy Block you see now is gone by the start of your next turn)",
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
  BATTLEWORN_DUMMY_TIME_LIMIT_POWER: " (turns left to kill it, this one included: when they run out the fight ends without the reward; it never attacks, so only damage counts, and setup that pays after the last turn is worth nothing)",
  VIGOR_POWER: " (its next attack deals this much more per hit: already in the intent when that attack is this turn's, else it waits for the next one)",
  RAVENOUS_POWER: " (when another enemy dies it eats the corpse: stunned for the rest of this turn, so its attack now is cancelled, and it gains this much Strength for the fight)",
  INFESTED_POWER: " (when it dies it spawns more enemies (Phrog Parasite: 4 Wrigglers); they do not attack the turn they arrive; killing it does NOT end the fight)",
  SURPRISE_POWER: " (when it dies a Fat Gremlin and a Sneaky Gremlin appear; killing it does NOT end the fight)",
};

/** Deck cards that pay off on enemy Vulnerable (the solver weighs Vulnerable more with them). */
const VULNERABLE_PAYOFFS = new Set(["DISMANTLE", "BULLY", "MOLTEN_FIST", "DOMINATE"]);
/** Beating Remnant: at most this much HP lost in a turn. */
export const BEATING_REMNANT_CAP = 20;
/** Map node types a fight can be fought in (the forced-Elite lookahead of potion_context). */
const FIGHT_NODES = ["Monster", "Unknown", "Elite"];
/** Nodes ahead potion_context looks for a forced Elite. */
const ELITE_LOOKAHEAD = 3;
/** Act boss floors. */
const BOSS_FLOORS = [17, 33, 48];

/** Potions that add damage: a plan's "big_hit" (the enemy's big attack turn) is no moment for them (B6AC F33 T1). */
const OFFENSIVE_POTIONS = new Set([
  "FIRE_POTION", "EXPLOSIVE_AMPOULE", "STRENGTH_POTION", "FLEX_POTION", "VULNERABLE_POTION", "FEAR_POTION",
  "ATTACK_POTION", "POWDERED_DEMISE", "GIGANTIFICATION_POTION", "DUPLICATOR", "ENERGY_POTION", "POTION_SHAPED_ROCK",
]);
/** Potion text that blunts an enemy hit (the only kind a plan's "big_hit" applies to). */
const BLUNTS_HIT = /格挡|block|无实体|intangible|伤害减少|less damage|荆棘|thorns|虚弱|weak/i;

/** A line drinks a potion (modelled potions are steps "POTION:<potion id>:<slot>"). */
/** Leaders the kill-order leader rule skips (evidence says kill the minion first). */
export const LEADER_RULE_EXEMPT = new Set(["QUEEN"]);

export function drinksPotion(plan: Plan): boolean {
  return plan.steps.some((step) => step.cardId.startsWith("POTION:"));
}

/** The potion ids a line drinks. */
function potionIdsOf(plan: Plan): string[] {
  return plan.steps.filter((step) => step.cardId.startsWith("POTION:")).map((step) => step.cardId.split(":")[1] ?? "");
}

/**
 * Every modelled potion in the belt on at least one shown line (Dai 2026-09-28: Jev always has the
 * choice): for a potion no option drinks, the best-ranked line of `plans` that drinks it is added. Past
 * `limit`, it takes the place of the lowest-ranked option that is not code's first, not the only
 * potion-free line and not the only line drinking some other potion; with none such it is added anyway.
 */
export function withPotionLines(options: Plan[], plans: Plan[], potionIds: string[], limit: number): Plan[] {
  const out = [...options];
  for (const id of [...new Set(potionIds)]) {
    if (out.some((plan) => potionIdsOf(plan).includes(id))) continue;
    const line = plans.find((plan) => potionIdsOf(plan).includes(id));
    if (!line) continue;
    if (out.length >= limit) {
      const removable = (plan: Plan, index: number): boolean => {
        if (index === 0) return false;
        const others = out.filter((other) => other !== plan);
        if (!drinksPotion(plan) && !others.some((other) => !drinksPotion(other))) return false;
        return potionIdsOf(plan).every((own) => others.some((other) => potionIdsOf(other).includes(own)));
      };
      for (let index = out.length - 1; index > 0; index -= 1) {
        if (removable(out[index]!, index)) {
          out.splice(index, 1);
          break;
        }
      }
    }
    out.push(line);
  }
  return out;
}

/**
 * The line code plays on its own among `plans` (rank order): the first that drinks no potion, else the
 * first. Code never drinks a potion while a potion-free line is on the table.
 */
export function dryFirst(plans: Plan[]): Plan | undefined {
  return plans.find((plan) => !drinksPotion(plan)) ?? plans[0];
}

/** Test hook: per-target options and kill-order rollouts off (the question as before them). */
export const targetOptions: { enabled: boolean } = { enabled: true };

/**
 * The combat planner's time to its last question (planTurn's ask path; null after a decision code made alone), which the
 * loop puts on the decision row as `timing` (loop.ts, right after planDecision). Beside the decision, not in its log: the
 * pinned digests of decisions and resolutions stay as they were, and the numbers are the wall clock's.
 *   planner_ms   planTurn's wall clock to the question (a planCombatTurn fallback re-plan: the last plan's);
 *   solve_ms     the turn solver; mc_ms the random potions' Monte Carlo; rollout_ms the 5-turn rollout; boss_sim_ms B2;
 *   other_ms     the rest (options, facts, the question);
 *   cpu_ms       the process's CPU over planner_ms, every thread (the B2 workers' too): cpu > wall, the workers ran;
 *                cpu < wall, the planner's thread waited or was not scheduled (a loaded machine);
 *   load1        the machine's 1-minute load average then (os.loadavg; 32 logical CPUs on the play machine; WSL's own:
 *                the game and anything else on the Windows side share the cores unseen);
 *   probe_ms     a fixed integer loop timed on the planner's thread as the question is made (speedProbeMs; ~2.7 ms with
 *                the machine quiet, 2026-10-04): this thread's speed then, whatever slows it (the Windows side included);
 *   boss_sim     B2's (line, order) pairs and the fights whose results came back (sims_done; more than samples x pairs:
 *                work the deadline wasted, a chunk still running then not counted);
 *   memo         the SL retry compute memo (src/sim/compute-memo.ts): which stage came from it and the time it stands for.
 */
export const plannerTiming: { last: Record<string, JsonValue> | null } = { last: null };

/** A fixed 2M-step xorshift loop's wall time on this thread (ms): the machine's speed for it now (plannerTiming.probe_ms). */
export function speedProbeMs(): number {
  const started = performance.now();
  let x = 0x9e3779b9 | 0;
  for (let i = 0; i < 2_000_000; i += 1) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
  }
  const ms = performance.now() - started;
  // (x read so the loop is not dropped.)
  return x === 0 ? ms + 0 : ms;
}

function plannerTimingOf(t: {
  planStart: number;
  cpuStart: NodeJS.CpuUsage;
  solveMs: number;
  mcShown: PotionMc[];
  rollout: LiveRollout | null;
  bossSim: BossLineSim | null;
  computeMemo: ComputeMemo | null;
}): Record<string, JsonValue> {
  const plannedMs = performance.now() - t.planStart;
  const cpu = process.cpuUsage(t.cpuStart);
  const mcMs = t.mcShown.reduce((sum, mc) => sum + mc.ms, 0);
  const rolloutMs = t.rollout?.elapsedMs ?? 0;
  const sim = t.bossSim?.available ? t.bossSim : null;
  const simMs = sim ? (sim.run.memo?.wallMs ?? sim.run.elapsedMs) : t.bossSim && !t.bossSim.available ? t.bossSim.ms : 0;
  const rolloutMemo = t.rollout?.available && t.rollout.memo ? t.rollout.memo.ms : null;
  const simMemo = sim?.run.memo ? sim.run.elapsedMs : null;
  return {
    planner_ms: Math.round(plannedMs),
    solve_ms: Math.round(t.solveMs),
    mc_ms: Math.round(mcMs),
    rollout_ms: Math.round(rolloutMs),
    boss_sim_ms: Math.round(simMs),
    other_ms: Math.round(plannedMs - t.solveMs - mcMs - rolloutMs - simMs),
    cpu_ms: Math.round((cpu.user + cpu.system) / 1000),
    load1: Math.round((loadavg()[0] ?? 0) * 100) / 100,
    probe_ms: Math.round(speedProbeMs() * 100) / 100,
    ...(sim && !sim.run.memo && sim.run.pairs !== undefined && sim.run.done !== undefined ? { boss_sim: { pairs: sim.run.pairs, sims_done: sim.run.done, samples: sim.run.samples, workers: sim.run.workers } } : {}),
    ...(t.computeMemo
      ? { memo: { ...(rolloutMemo !== null ? { rollout_ms: Math.round(rolloutMemo) } : {}), ...(simMemo !== null ? { boss_sim_ms: Math.round(simMemo) } : {}), hits: t.computeMemo.hits, stored: t.computeMemo.size } }
      : {}),
  };
}

/**
 * Tool hook (tools/thief-facts-replay.ts): with `enabled`, each combat question leaves its lines here (the surviving
 * lines, the shown ones, the rollout, the thieves and the lines kept for a kill before one leaves). Never read by play.
 */
export const thiefTrace: {
  enabled: boolean;
  last: {
    plans: Plan[];
    surviving: Plan[];
    shown: Plan[];
    rollout: LiveRollout | null;
    thieves: Thief[];
    lastTurnLine: Plan | null;
    rolloutLine: Plan | null;
    /** tools/sl-explore-replay.ts: the fight's kind, the random potions shown and B2 where it ranks (a trusted boss). */
    kind?: string;
    mcShown?: PotionMc[];
    simRanks?: BossLineSim | null;
  } | null;
} = { enabled: false, last: null };

/**
 * The enemies a turn can be aimed at, one group per enemy id (Dai 2026-09-28: identical enemies are not
 * ordered among themselves), in board order: every living enemy but a Waterfall Giant husk, and an
 * illusion only while it attacks (whether hitting it is worth anything is the rollout's and Jev's call).
 * The one non-minion group among minions is marked `leader`.
 */
export function killGroups(combat: Record<string, unknown>, enemies: EnemySim[]): KillGroup[] {
  const idOf = new Map<number, string>();
  const nameOf = new Map<number, string>();
  asArray(combat["enemies"])
    .map(asRecord)
    .forEach((enemy, fallbackIndex) => {
      const index = numOrNull(enemy["index"]) ?? fallbackIndex;
      idOf.set(index, str(enemy["enemy_id"]));
      // The game's own name (the sims' may carry a "#2" for one of several of this id).
      if (str(enemy["name"])) nameOf.set(index, str(enemy["name"]));
    });
  const groups: KillGroup[] = [];
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || enemy.maxHp >= 1_000_000) continue;
    if (enemy.illusion && enemy.attacks.length === 0) continue;
    const id = idOf.get(enemy.index) || enemy.name;
    const group = groups.find((entry) => entry.id === id);
    if (group) {
      group.indices.push(enemy.index);
      group.hp += enemy.hp;
    } else groups.push({ id, name: nameOf.get(enemy.index) || enemy.name, indices: [enemy.index], hp: enemy.hp, ...(enemy.illusion ? { illusion: true } : {}) });
  }
  // Groups (one id each) sharing a game name get the id part that tells them apart (KYC0RYEN0NVW F28: four of
  // six Decimillipede kill orders read 「残杀千足虫 > 残杀千足虫 > 残杀千足虫」 and were merged into one entry).
  distinctNames(groups).forEach((name, i) => {
    groups[i]!.name = name;
  });
  // A leader: the one group that is not minions when every other group is (MINION_POWER; they leave when the
  // last non-minion dies, the solver's and the rollout's won check): its death ends the fight (The Kin's
  // Priest). The rollout ranks kill orders by its HP left when no order ends the fight (rollout.ts rankOrders).
  const isMinions = (group: KillGroup) => group.indices.every((index) => enemies.find((enemy) => enemy.index === index)?.minion === true);
  const leaders = groups.filter((group) => !isMinions(group));
  // Not the Queen: her Torch Head Amalgam is a minion, but every logged Queen win killed the Amalgam first
  // (experience queen-plan, n=8; A8 0/5 with the Amalgam alive past T5) — the rollout does not capture why,
  // so her fight keeps ranking orders by value.
  const exempt = (group: KillGroup) => LEADER_RULE_EXEMPT.has(group.id);
  if (groups.length >= 2 && leaders.length === 1 && !leaders[0]!.illusion && !exempt(leaders[0]!)) leaders[0]!.leader = true;
  return groups;
}

/** Damage a line puts into a group of enemies (HP taken off, a kill counted to 0). */
export function damageInto(plan: Plan, indices: number[], enemies: EnemySim[]): number {
  return indices.reduce((sum, index) => {
    const before = enemies.find((enemy) => enemy.index === index);
    const after = plan.outcome.enemyHpAfter.find((entry) => entry.index === index);
    return before && after ? sum + Math.max(0, before.hp - Math.max(0, after.hp)) : sum;
  }, 0);
}

/**
 * Per-target options (Dai 2026-09-28: which enemy to kill is Jev's call, not the score's): for every group,
 * the line that puts the most damage into it, then the higher solver score, then the less HP lost. Lines
 * drinking no potion first (potions have their own slots); none when no line reaches the group. Several
 * groups can share one line.
 */
export function focusLines(plans: Plan[], groups: KillGroup[], enemies: EnemySim[]): Map<KillGroup, Plan> {
  const out = new Map<KillGroup, Plan>();
  const dry = plans.filter((plan) => !drinksPotion(plan));
  for (const group of groups) {
    const pool = dry.some((plan) => damageInto(plan, group.indices, enemies) > 0) ? dry : plans;
    let best: Plan | null = null;
    let bestDamage = 0;
    for (const plan of pool) {
      const damage = damageInto(plan, group.indices, enemies);
      if (damage <= 0) continue;
      if (
        best === null ||
        damage > bestDamage ||
        (damage === bestDamage && (plan.score > best.score || (plan.score === best.score && plan.outcome.hpLoss < best.outcome.hpLoss)))
      ) {
        best = plan;
        bestDamage = damage;
      }
    }
    if (best) out.set(group, best);
  }
  return out;
}

/** A group's name on an option ("Louse x3" for identical enemies). */
export function groupName(group: KillGroup): string {
  return group.indices.length > 1 ? `${group.name} x${group.indices.length}` : group.name;
}

/**
 * Dai 2026-09-29: where hand-written advice (the guides behind the run plan, the fight hints) disagrees with the
 * experience base or measured data, the data wins. Jev has no system prompt: this rides at the head of the
 * advice in every combat plan question.
 */
export const JEV_DATA_OVER_GUIDES =
  "When a fight hint, the run plan or a guide conflicts with the experience base (experience) or measured data (the options' numbers, rollouts, outcome statistics), go with the data.";

/**
 * Past-run lessons about the enemies of this fight shown to Jev (the experience base's top ones). 4 covers
 * every boss's active entries: at 3 the Kaiser Crab's kill order (n=11) was cut behind its entry-HP, DPS
 * and potion lessons.
 */
export const JEV_FIGHT_LESSONS = 4;

/**
 * The experience base's lessons about this fight's enemies (the slice DeepSeek gets, its current-enemy
 * tier only: boss/elite/hallway entries matching an enemy here), best confidence and support first.
 */
export function fightLessons(state: GameState, max = JEV_FIGHT_LESSONS): ExperienceEntry[] {
  const combat = asRecord(state.raw["combat"]);
  const enemyIds = asArray(combat["enemies"]).map((enemy) => str(asRecord(enemy)["enemy_id"])).filter(Boolean);
  if (enemyIds.length === 0) return [];
  const actRaw = str(asRecord(state.run?.raw)["act_id"]);
  const act = /^\d+$/.test(actRaw) ? Number(actRaw) + 1 : 1;
  const asc = state.run?.ascension ?? 0;
  const input = {
    label: "combat/plan",
    act,
    asc,
    bossId: state.run?.boss_id ?? (str(asRecord(state.run?.raw)["boss_id"]) || null),
    offered: offeredOn(state),
    threats: actThreatIds(act, asc),
    enemies: enemyIds,
  };
  const matches = (entry: ExperienceEntry): boolean => {
    const [kind, id] = [entry.scope.slice(0, entry.scope.indexOf(":")), entry.scope.slice(entry.scope.indexOf(":") + 1)];
    if (kind !== "boss" && kind !== "elite" && kind !== "hallway") return false;
    if (kind === "boss") return bossOnBoard(id, enemyIds);
    return enemyIds.some((enemy) => enemy === id || enemy.startsWith(`${id}_`));
  };
  return selectLessons(input).filter(matches).slice(0, max);
}

/** DeepSeek's run plan in force for this run (screen memory), or null. */
export function currentRunPlan(env: DecisionEnv): RunPlan | null {
  const runId = str(env.state.raw["run_id"]);
  return env.screenMemory.runPlan && env.screenMemory.runPlan.runId === runId ? env.screenMemory.runPlan : null;
}

/**
 * DeepSeek's run plan, whole and on one line (Dai 2026-09-28: Jev sees the plan's strategy and boss prep,
 * kill-order advice included, on every combat question; advice, not orders).
 */
export function deepseekPlanLine(env: DecisionEnv): string | null {
  const plan = currentRunPlan(env);
  if (!plan) return env.brief.plan ? `DeepSeek's run plan (advice, not orders): ${env.brief.plan}` : null;
  const line = [plan.archetype, plan.summary].filter(Boolean).join(" — ");
  const prep = plan.bossPrep ? ` | boss prep: ${plan.bossPrep}` : "";
  if (!line && !prep) return null;
  return `DeepSeek's run plan (F${plan.floor}; advice, not orders): ${line}${prep}`.replace(/\s+/g, " ").trim();
}

/**
 * Facts for Jev's potion judgement (on every combat question, kept short): belt slots and a full belt
 * wasting the next potion reward, floors to the act boss, an Elite ahead (DeepSeek's route plan, else a
 * forced one on the map), the act boss damage gap and each held potion's worth in the act boss fight
 * (potion-equivalents.ts). DeepSeek's run plan is its own key (deepseek_plan).
 */
export function potionContextJson(env: DecisionEnv, kind: SolverInput["fightKind"]): Record<string, JsonValue> {
  const { state } = env;
  const run = asRecord(state.run?.raw);
  const belt = asArray(run["potions"]).map(asRecord);
  const used = belt.filter((slot) => bool(slot["occupied"])).length;
  const out: Record<string, JsonValue> = {
    slots: `${used}/${belt.length} used${belt.length > 0 && used >= belt.length ? " (belt full: a potion reward after this fight is wasted unless one is drunk)" : ""}`,
  };
  const floor = state.run?.floor ?? null;
  const bossFloor = floor === null ? null : (BOSS_FLOORS.find((entry) => entry >= floor) ?? null);
  if (kind === "boss") out["act_boss"] = "this fight";
  else if (floor !== null && bossFloor !== null) out["act_boss"] = `in ${bossFloor - floor} floors (floor ${bossFloor})`;
  const elite = eliteAhead(env);
  if (elite) out["elite_ahead"] = elite;
  if (kind !== "boss") {
    const gap = damageGap(state, env.knowledge);
    if (gap) out["act_boss_clock"] = `needs ~${gap.need} damage a turn, deck ~${gap.deck}${gap.gap > 0 ? ` (short ${gap.gap})` : " (enough)"}`;
  }
  // Each held potion's worth in this act's boss fight (potion-equivalents.json; Dai 2026-09-30): a fact, no rule.
  const actId = str(run["act_id"]);
  const held = belt.filter((slot) => bool(slot["occupied"])).map((slot) => str(slot["potion_id"])).filter(Boolean);
  Object.assign(out, heldPotionWorth(held, /^\d+$/.test(actId) ? Number(actId) + 1 : null, state.run?.ascension ?? 0));
  // DeepSeek's run plan is on the question whole (deepseek_plan), not here.
  return out;
}

/**
 * What a drink costs on this question (potion-cost.ts, Dai 2026-09-30), for potion_context: where the options'
 * potion_cost numbers come from, each usable potion's cost, and, when every potion-free line dies this turn, that
 * there is no no-potion option. Empty without a potion to drink.
 */
export function potionCostContext(costs: Map<string, PotionCost>, kind: SolverInput["fightKind"], noDryLine: boolean): Record<string, JsonValue> {
  // Switched off (POTION_COST=off): the question as before the costs.
  if (costs.size === 0 || !potionCostOptions.enabled) return {};
  const out: Record<string, JsonValue> = {
    potion_cost:
      kind === "boss"
        ? "boss fight: potions cost 0 here (the fight they are kept for)"
        : "a potion drunk now is HP paid later: each option's potion_cost counts its potions (this turn and the rollout's later turns) at their held value (the 血 of the worth lines: HP worth in this act's boss); total = fight HP loss + that. Ranked by deaths, then total. Boss fights: 0.",
  };
  // Held potions the table has no value for (another character's): cost 0, said so.
  const none = [...costs.values()].filter((cost) => cost.zero === "no_value" || cost.zero === "no_table").map((cost) => `${cost.name}: ${potionCostText(cost)}`);
  if (none.length > 0) out["potion_cost_zero"] = none;
  if (noDryLine) out["no_potion_line"] = "none: every potion-free line dies this turn";
  return out;
}

/** "Elite in N floors (route plan)" / "forced Elite within 3 nodes", or null. */
function eliteAhead(env: DecisionEnv): string | null {
  const { state, screenMemory } = env;
  const runId = str(state.raw["run_id"]);
  const map = screenMemory.lastMap;
  const route = screenMemory.routePlan;
  const floor = state.run?.floor ?? null;
  // The map was last shown on the floor before this fight: this room is on row current.row + 1.
  const act = floor === null ? null : floor <= 17 ? 1 : floor <= 33 ? 2 : 3;
  if (route && route.runId === runId && route.act === act && map && map.runId === runId && map.current && floor !== null && map.floor === floor - 1) {
    const here = map.current.row + 1;
    const next = route.path.find((step) => step.row > here && step.type === "Elite");
    if (next) return `Elite in ${next.row - here} floor${next.row - here === 1 ? "" : "s"} (route plan)`;
  }
  return forcedEliteWithin(screenMemory, state, FIGHT_NODES, ELITE_LOOKAHEAD) ? `forced Elite within ${ELITE_LOOKAHEAD} nodes` : null;
}

// CLOSE_CALL (code played its top line when it led by 6+ score points) is gone (Dai 2026-09-28: card
// play is Jev's): with two or more distinct lines Jev is asked, unless code's line dominates every other
// on every axis.
/** Distinct lines shown to Jev (Dai 2026-09-28: 10, was 4; the rollout covers every shown line). */
export const MAX_OPTIONS = 10;

/**
 * HP guardrail for elite/boss/dangerous plan choices: the models keep trading HP for damage ("Burning
 * Blood heals it", "HP buffer is comfortable"; WX16, 7Q5G, YP9, DG1 — the guide alone did not stop
 * it). A non-winning plan may lose at most this much more than the cheapest plan offered.
 *
 * Boss and elite fights get the tighter bound, max(8, 10% HP); hallway fights max(8, 20% HP) (Dai
 * 2026-09-28: loosened from max(4, 10%) / max(6, 20%) so that more of the trade-off is Jev's call).
 * Z2H3 T7/T8 DeepSeek split a trade across re-plans and died with the boss at 33: once a fight's
 * accepted extra loss is past HP_GUARD_FIGHT_BUDGET the bound is 0: the cheapest plan, unless the
 * choice wins the fight.
 */
/** Extra HP (over the cheapest line) a fight may accept (Dai 2026-09-28: 24, was 12, with the per-turn slack 4 -> 8). */
export const HP_GUARD_FIGHT_BUDGET = 24;
/** The per-turn slack is never below this (any fight kind). */
export const HP_GUARD_MIN_SLACK = 8;

export function hpGuardSlack(hp: number, kind: SolverInput["fightKind"] = "unknown", extraSoFar = 0): number {
  if (extraSoFar > HP_GUARD_FIGHT_BUDGET) return 0;
  if (kind === "boss" || kind === "elite") return Math.max(HP_GUARD_MIN_SLACK, hp * 0.1);
  return Math.max(HP_GUARD_MIN_SLACK, hp * 0.2);
}

/**
 * The plan to play instead of `chosen` when it loses too much HP, else null: the best-ranked plan
 * within the slack of the cheapest one (options are in code rank order). The bound is set by every
 * option; only `eligible` ones may replace the pick (Jev's focus target, the rollout's deaths).
 */
export function hpGuardReplacement(chosen: Plan, options: Plan[], hp: number, slack = hpGuardSlack(hp), eligible: (plan: Plan) => boolean = () => true): Plan | null {
  if (chosen.outcome.winsFight || options.length === 0) return null;
  // The HP the line loses this turn (guardLoss), not the potions' cost: the guard bounds HP traded for damage; a drink's
  // cost is a ranking matter, already in the score and the rollout's value (fix-queue-v4 G3MU2NADPEDU F9: Fysh Oil's
  // held value 9.1 over the elite slack of 8 vetoed it on every line, at equal HP loss).
  const minLoss = Math.min(...options.map(guardLoss));
  const bound = minLoss + slack;
  if (guardLoss(chosen) <= bound) return null;
  const pool = options.filter((plan) => plan === chosen || eligible(plan));
  const found = pool.find((plan) => guardLoss(plan) <= bound) ?? pool.find((plan) => guardLoss(plan) === minLoss) ?? null;
  return found === chosen ? null : found;
}

/**
 * What the HP guard compares: the HP a line loses this turn (outcome.hpLoss), without its potions' cost (potion-cost.ts,
 * 0 in a boss fight anyway). The cost ranks the lines (score, rollout value); counting it here too vetoed a potion whose
 * held value is above the slack on every line, and charged it twice.
 */
export const guardLoss = (plan: Plan): number => plan.outcome.hpLoss;

/**
 * Jev's focus target: the live enemy (enemies, on a tie) its pick puts the most damage into; none when
 * it damages no one.
 */
export function focusTargets(plan: Plan, enemies: EnemySim[]): number[] {
  const live = enemies.filter((enemy) => enemy.hp > 0);
  const damage = live.map((enemy) => ({ index: enemy.index, dealt: damageInto(plan, [enemy.index], enemies) }));
  const most = Math.max(0, ...damage.map((entry) => entry.dealt));
  return most > 0 ? damage.filter((entry) => entry.dealt === most).map((entry) => entry.index) : [];
}

/**
 * Whether the HP guard may swap `pick` for `plan`: with two or more live enemies, `plan` puts at least as
 * much damage into each of the pick's focus targets (RBJ402TKQZ6F F48 T1: Jev's line put all 140 damage
 * into the Torch Head Amalgam, the rollout's best; the guard played a Setup Strike+ into the Queen); and
 * the rollout, when it covers both, shows no more deaths for `plan` than for the pick (T5: it swapped the
 * rollout's best, 6/8 deaths, for a line dying in 8/8).
 */
export function guardKeepsPick(pick: Plan, plan: Plan, enemies: EnemySim[], deathsOf: (plan: Plan) => number | null = () => null): boolean {
  if (enemies.filter((enemy) => enemy.hp > 0).length >= 2) {
    const focus = focusTargets(pick, enemies);
    if (!focus.every((index) => damageInto(plan, [index], enemies) >= damageInto(pick, [index], enemies))) return false;
  }
  const mine = deathsOf(pick);
  const theirs = deathsOf(plan);
  return mine === null || theirs === null || theirs <= mine;
}

/**
 * The HP guard's setup exception (planTurn guardKeepsSetup, besides the boss race): the pick is kept when it plays more
 * setup cards than the replacement and its HP after the enemy turn clears the next hit with room: boss fights max(20%
 * max HP, next hit + 5) (5BXM F33 T4/T6: Demon Form+ swapped twice at 22-33 HP before a no-attack curse turn, never
 * played; boss left at 152), other fights max(35% max HP, next hit) (JF99 F33 T4/T7: Crimson Mantle traded twice for 6
 * HP and never played).
 * A big-hit turn (this turn's attack through the block up at least max(12, 25% HP)) is the turn to block when that hit
 * is what kills (0YG4 F43 T4: Dark Embrace + Blood Wall at -26 kept over a 29-block line at -13 into the Heavy Cleave):
 * there the setup line is kept only when the rollout, where it covers both, sees it die no more often than the
 * replacement. The big hit cancelled the exception outright before (f8b1f2f), setup lines that live included:
 * GTU27C946ERT F33 T1, 21 incoming against a bar of 20 at 80/80, Demon Form+ (-17, 63 after; the rollout at 1 sample
 * had every line tied) swapped for an attack line at -13; the whole-fight sim ranked Demon Form+ first (44.9% against
 * 5.3%) and it was not drawn again that fight.
 */
export function setupKept(
  picked: { setups: number; hpAfter: number; deaths: number | null },
  replacement: { setups: number; deaths: number | null },
  ctx: { kind: SolverInput["fightKind"]; maxHp: number; nextIncoming: number; bigHit: boolean },
): boolean {
  if (picked.setups <= replacement.setups) return false;
  const room = ctx.kind === "boss" ? Math.max(ctx.maxHp * 0.2, ctx.nextIncoming + 5) : Math.max(ctx.maxHp * 0.35, ctx.nextIncoming);
  if (picked.hpAfter < room) return false;
  return !ctx.bigHit || picked.deaths === null || replacement.deaths === null || picked.deaths <= replacement.deaths;
}

/**
 * THIEF_COST (docs/thief.md §7): the HP guard may swap `pick` for `plan` only when the loot `plan` loses more than the
 * pick (lootOf: the rollout's expected loot cost, or this turn's certain one) is no more than the HP the swap saves this
 * turn: by the cost's own measure the swap must not be worse. The guard still compares HP alone (guardLoss).
 */
export function lootSwapOk(pick: Plan, plan: Plan, lootOf: (plan: Plan) => number): boolean {
  const extraLoot = lootOf(plan) - lootOf(pick);
  return extraLoot <= 0 || extraLoot <= guardLoss(pick) - guardLoss(plan);
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
 * every re-plan; the then 12 HP budget was gone by turn 2-3).
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

export { mantleHpCost };

/**
 * The board's enemies for the solver. `asc`: the run's ascension, for the monster DB's damage in the
 * Imbalanced stun's saved hit (move-model DamageContext); without it the move model's pooled average.
 */
/**
 * Names that tell apart enemies sharing one (KYC0RYEN0NVW F28: the Decimillipede's three segments are all
 * 「残杀千足虫」, so option text and kill orders could not say which): with different ids, the part of the id
 * the others do not share ("残杀千足虫 (FRONT)"); with the same id, the board order ("Louse #2"). A name no other
 * item shares is kept as it is.
 */
export function distinctNames(items: { name: string; id: string }[]): string[] {
  return items.map((item) => {
    const same = items.filter((other) => other.name === item.name);
    if (same.length < 2) return item.name;
    const ids = same.map((other) => other.id);
    if (new Set(ids).size === ids.length && ids.every((id) => id !== "")) {
      const parts = ids.map((id) => id.split("_"));
      let common = 0;
      while (parts.every((p) => p.length > common + 1 && p[common] === parts[0]![common])) common += 1;
      const tail = item.id.split("_").slice(common).join("_");
      return `${item.name} (${tail || item.id})`;
    }
    return `${item.name} #${same.indexOf(item) + 1}`;
  });
}

export function enemySims(combat: Record<string, unknown>, asc?: number): EnemySim[] {
  const ctxOf = (enemy: Record<string, unknown>): DamageContext | undefined => (asc === undefined ? undefined : boardDamageContext(enemy, asRecord(combat["player"]), asc));
  const living = asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false);
  const names = distinctNames(living.map((enemy) => ({ name: str(enemy["name"], str(enemy["enemy_id"])), id: str(enemy["enemy_id"]) })));
  return living
    .map((enemy, fallbackIndex) => ({
      index: numOrNull(enemy["index"]) ?? fallbackIndex,
      name: names[fallbackIndex]!,
      hp: num(enemy["current_hp"]),
      maxHp: num(enemy["max_hp"]),
      block: num(enemy["block"]),
      vulnerable: powerAmount(enemy, "VULNERABLE_POWER"),
      weak: powerAmount(enemy, "WEAK_POWER"),
      ...(powerAmount(enemy, "POISON_POWER") > 0 ? { poison: powerAmount(enemy, "POISON_POWER") } : {}),
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
        powerAmount(enemy, "HIGH_VOLTAGE_POWER") > 0 ||
        powerAmount(enemy, "STRENGTH_POWER") > 0),
      halved: powerAmount(enemy, "GUARDED_POWER") > 0 || powerAmount(enemy, "SOAR_POWER") > 0,
      skittish: powerAmount(enemy, "SKITTISH_POWER"),
      reflect: powerAmount(enemy, "REFLECT_POWER") > 0,
      demise: powerAmount(enemy, "DEMISE_POWER"),
      shrink: powerAmount(enemy, "SHRINK_POWER"),
      ...(str(enemy["enemy_id"]) === SHRINKER ? { shrinksUs: true } : {}),
      punishesUnblocked: (powerAmount(enemy, "SUCK_POWER") > 0 ? 4 : 0) + (powerAmount(enemy, "PAPER_CUTS_POWER") > 0 ? 5 : 0),
      woundsPerHit: powerAmount(enemy, "PAINFUL_STABS_POWER"),
      enrage: powerAmount(enemy, "ENRAGE_POWER"),
      vitalSpark: powerAmount(enemy, "VITAL_SPARK_POWER"),
      revives: powerAmount(enemy, "ADAPTABLE_POWER") > 0,
      stock: powerAmount(enemy, "STOCK_POWER"),
      // Plow (Ceremonial Beast): stunned the first time HP drops to its amount (150), like Shriek (RAWT
      // F17 T6: a Strike crossed 150 and cancelled a 26 Plow the solver had counted).
      shriek: Math.max(powerAmount(enemy, "SHRIEK_POWER"), powerAmount(enemy, "PLOW_POWER")),
      burrowed: powerAmount(enemy, "BURROWED_POWER") > 0,
      ravenous: powerAmount(enemy, "RAVENOUS_POWER"),
      ...(spawnText(enemy, asc ?? 0) ? { spawnsOnDeath: spawnText(enemy, asc ?? 0)! } : {}),
      dazedPerHit: powerAmount(enemy, "PERSONAL_HIVE_POWER"),
      // Imbalanced: a fully blocked attack stuns it; what that saves is its next move's hit.
      ...(asArray(enemy["powers"]).some((power) => str(asRecord(power)["power_id"]) === "IMBALANCED_POWER")
        ? { imbalanced: Math.round(expectedNextDamage(str(enemy["enemy_id"]), str(enemy["move_id"]), ctxOf(enemy)) ?? asArray(enemy["intents"]).map(asRecord).reduce((sum, intent) => sum + num(intent["damage"]) * Math.max(1, num(intent["hits"])), 0)) }
        : {}),
      unmodelled: unmodelledEnemyPowers(enemy).length > 0,
      ...(powerAmount(enemy, "BATTLEWORN_DUMMY_TIME_LIMIT_POWER") > 0 ? { timeLimit: powerAmount(enemy, "BATTLEWORN_DUMMY_TIME_LIMIT_POWER") } : {}),
      attacks: asArray(enemy["intents"])
        .map(asRecord)
        .flatMap((intent) => {
          const damage = numOrNull(intent["damage"]);
          if (damage === null) return [];
          return [{ damage, hits: Math.max(1, Math.round(numOrNull(intent["hits"]) ?? 1)) }];
        }),
    }));
}

/**
 * MECH_RULES (docs/mechanics-learning.md, knowledge/mechanics.ts): the learned "stunned when a power is stripped to 0"
 * rules by power id, from monster-db.json `observed`. Empty with the switch off, without the data (a DB built before it),
 * or when reading it fails: the decision is then the one with the switch off.
 */
export function learnedStunRules(env: Pick<DecisionEnv, "mechRules">): Map<string, StripStunRule> {
  if (env.mechRules === false) return new Map();
  try {
    return stripStunRules(observedMechanics());
  } catch {
    return new Map();
  }
}

/**
 * The learned strip-stun rules onto the board's enemies (EnemySim.stunOnStrip): each power of the rules the enemy has up
 * (amount > 0) and the solver counts down (STRIP_COUNTERS: Flutter, Slippery, Curl Up, Artifact). Enemies are matched as
 * enemySims indexes them; one without such a power is left as it was.
 */
export function applyStripStuns(enemies: EnemySim[], combat: Record<string, unknown>, rules: Map<string, StripStunRule>): void {
  if (rules.size === 0) return;
  const living = asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false);
  const byIndex = new Map(living.map((enemy, fallbackIndex) => [numOrNull(enemy["index"]) ?? fallbackIndex, enemy]));
  for (const enemy of enemies) {
    const source = byIndex.get(enemy.index);
    if (!source) continue;
    const stuns = new Map<string, string>();
    for (const power of asArray(source["powers"]).map(asRecord)) {
      const id = str(power["power_id"]);
      if (rules.has(id) && id in STRIP_COUNTERS && num(power["amount"]) > 0 && !stuns.has(id)) stuns.set(id, str(power["name"]) || id);
    }
    if (stuns.size > 0) enemy.stunOnStrip = [...stuns].map(([power, name]) => ({ power, name }));
  }
}

/** MECH_MOVE_RULES in use: the switch on, and MECH_RULES on (it is the second class of the learned rules). */
export function mechMoveOn(env: Pick<DecisionEnv, "mechRules" | "mechMoveRules">): boolean {
  return env.mechRules !== false && env.mechMoveRules !== false;
}

/**
 * MECH_MOVE_RULES (docs/mechanics-learning.md §8, knowledge/mechanics.ts moveRules): the learned "a power removed or
 * lowered -> the enemy's move changes" rules by monster id, from the monster DB's `observed` blocks. Empty with either
 * switch off or without the data. A failure reading them throws: planCombatTurn's fail safe (withMechFallback) then plans
 * the turn with the switch off, the Crab's back attack included.
 */
export function learnedMoveRules(env: Pick<DecisionEnv, "mechRules" | "mechMoveRules">): Map<string, MoveRule[]> {
  if (!mechMoveOn(env)) return new Map();
  return moveRulesOf({ monsters: monsterMoves() });
}

/**
 * A learned move's attack this turn (MoveOnStrip.attacks): its base at this ascension (monster DB moveDamageAt; the faced
 * hit of a back-attack move; a move never measured, its most common shown hit), with the enemy's Strength and Weak unless
 * the change clears them (an Axebot's revive: clearedWith), and our Vulnerable. A move without damage (Boot Up): none.
 */
function ruleMoveAttacks(monster: string, move: string, asc: number, enemy: Record<string, unknown>, player: Record<string, unknown>, cleared: readonly string[], extraStrength = 0): { damage: number; hits: number }[] {
  const db = monsterMoves();
  const logged = moveDamageAt(db, monster, move, asc);
  if (logged) {
    if (logged.perHit <= 0) return [];
    const base = logged.base ?? logged.perHit;
    const strength = (cleared.includes("STRENGTH_POWER") ? 0 : powerAmount(enemy, "STRENGTH_POWER")) + extraStrength;
    const weak = !cleared.includes("WEAK_POWER") && powerAmount(enemy, "WEAK_POWER") > 0;
    const damage = Math.max(0, Math.floor((base + strength) * (weak ? 0.75 : 1) * (powerAmount(player, "VULNERABLE_POWER") > 0 ? 1.5 : 1)));
    return [{ damage, hits: Math.max(1, logged.hits) }];
  }
  const shown = shownDamageAt(db, monster, move, asc);
  return shown && shown.perHit > 0 ? [{ damage: Math.round(shown.perHit), hits: Math.max(1, shown.hits) }] : [];
}

/**
 * The learned move rules onto the board's enemies (EnemySim.moveOnStrip): each rule of the enemy's monster whose power it
 * has up (amount > 0) and the solver sees go (MOVE_RULE_POWERS: an Axebot's Stock, the STRIP_COUNTERS, Crab Rage). Enemies
 * are matched as enemySims indexes them; one without such a power is left as it was.
 */
export function applyMoveRules(enemies: EnemySim[], combat: Record<string, unknown>, rules: Map<string, MoveRule[]>, asc: number): void {
  if (rules.size === 0) return;
  const living = asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false);
  const byIndex = new Map(living.map((enemy, fallbackIndex) => [numOrNull(enemy["index"]) ?? fallbackIndex, enemy]));
  const player = asRecord(combat["player"]);
  for (const enemy of enemies) {
    const source = byIndex.get(enemy.index);
    if (!source) continue;
    const monster = str(source["enemy_id"]);
    const own = rules.get(monster) ?? [];
    const moved: MoveOnStrip[] = [];
    for (const rule of own) {
      if (!MOVE_RULE_POWERS.has(rule.power) || powerAmount(source, rule.power) <= 0) continue;
      const power = asArray(source["powers"]).map(asRecord).find((entry) => str(entry["power_id"]) === rule.power);
      moved.push({
        power: rule.power, name: str(power?.["name"]) || rule.power, how: rule.how, move: rule.move,
        moveName: monsterMoves()[monster]?.moves?.[rule.move]?.name || rule.move,
        attacks: ruleMoveAttacks(monster, rule.move, asc, source, player, clearedWith(rule, own)), n: rule.n, changed: rule.changed,
        ...(clearedWith(rule, own).length > 0 ? { clears: clearedWith(rule, own) } : {}),
      });
    }
    if (moved.length > 0) enemy.moveOnStrip = moved;
  }
}

/** MECH_DEATH_MOVE in use: the switch on, and MECH_RULES on (it is a class of the learned rules). */
export function mechDeathOn(env: Pick<DecisionEnv, "mechRules" | "mechDeathMove">): boolean {
  return env.mechRules !== false && env.mechDeathMove !== false;
}

/**
 * MECH_DEATH_MOVE (docs/mechanics-learning.md §9, knowledge/mechanics.ts deathRules): the learned "an ally's death changes
 * a survivor's move" rules by survivor monster id, from the monster DB's `observed.ally_deaths`. Empty with either switch
 * off or without the data (a DB built before it). A failure reading them throws: withMechFallback then plans the turn with
 * MECH_DEATH_MOVE off.
 */
export function learnedDeathRules(env: Pick<DecisionEnv, "mechRules" | "mechDeathMove">): Map<string, DeathRule[]> {
  if (!mechDeathOn(env)) return new Map();
  return deathRulesOf({ monsters: monsterMoves() });
}

/**
 * The learned death rules onto the board's survivors (EnemySim.moveOnDeath): for each rule of the enemy's monster, one entry
 * per living ally of the rule's monster on the board, resolved for the move it shows now (the same-turn change, if logged
 * from that move, with its attack: monster DB at this ascension, its Strength and Weak, our Vulnerable; the next move when
 * logged after the move it would end the turn on) and carrying the rule for the rollout's later turns. Enemies are matched
 * as enemySims indexes them; one without such a rule is left as it was.
 */
export function applyDeathRules(enemies: EnemySim[], combat: Record<string, unknown>, rules: Map<string, DeathRule[]>, asc: number): void {
  if (rules.size === 0) return;
  const living = asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false);
  const byIndex = new Map(living.map((enemy, fallbackIndex) => [numOrNull(enemy["index"]) ?? fallbackIndex, enemy]));
  const player = asRecord(combat["player"]);
  const total = (attacks: { damage: number; hits: number }[]) => attacks.reduce((sum, hit) => sum + hit.damage * hit.hits, 0);
  const moveName = (monster: string, move: string) => monsterMoves()[monster]?.moves?.[move]?.name || move;
  for (const enemy of enemies) {
    const source = byIndex.get(enemy.index);
    if (!source) continue;
    const monster = str(source["enemy_id"]);
    const shown = str(source["move_id"]);
    const entries: DeathMove[] = [];
    for (const rule of rules.get(monster) ?? []) {
      for (const ally of enemies) {
        const allySource = byIndex.get(ally.index);
        if (ally.index === enemy.index || !allySource || str(allySource["enemy_id"]) !== rule.ally || ally.hp <= 0) continue;
        const now = shown ? rule.now[shown] ?? null : null;
        const end = now?.move ?? shown;
        const next = rule.next && end && rule.next.after.includes(end) ? rule.next : null;
        // The Strength the same-turn move gives before the next one (the Queen's Enrage: +2, her first head-chop 7x5 at A8),
        // at this ascension as the rollout's move table has it (a regular effect of the move).
        const entry = now ? monsterMoves()[monster]?.moves?.[now.move] : undefined;
        const gained = entry && regularEffect(entry, entry.self_powers_gained?.["STRENGTH_POWER"]) ? moveAmountAt(monsterMoves(), monster, entry, "self", "STRENGTH_POWER", asc)?.value ?? 0 : 0;
        entries.push({
          ally: ally.index, allyId: rule.ally, allyName: ally.name,
          move: now?.move ?? null, moveName: now ? moveName(monster, now.move) : null,
          attacks: now ? ruleMoveAttacks(monster, now.move, asc, source, player, []) : [],
          next: next?.move ?? null, nextName: next ? moveName(monster, next.move) : null,
          nextAttack: next ? total(ruleMoveAttacks(monster, next.move, asc, source, player, [], gained)) : null,
          ...(now ? { nowCounts: [now.changed, now.n] as [number, number] } : {}),
          ...(next ? { nextCounts: [next.count, next.n] as [number, number] } : {}),
          rule: {
            now: Object.fromEntries(Object.entries(rule.now).map(([from, change]) => [from, change.move])),
            next: rule.next?.move ?? null, after: rule.next?.after ?? [], exclusive: rule.exclusive, aliveOnly: rule.aliveOnly,
          },
        });
      }
    }
    if (entries.length > 0) enemy.moveOnDeath = entries;
  }
}

/**
 * MECH_DEATH_MOVE: by board index, the moves each survivor's learned death rules say it never shows while such an ally lives
 * (every rule on the board is for a living ally): kept out of the planner's move-model forecasts (nextIncoming, laterIncoming).
 * Empty without rules.
 */
export function deathOnlyMoves(enemies: EnemySim[]): Map<number, Set<string>> {
  const out = new Map<number, Set<string>>();
  for (const enemy of enemies) {
    const moves = new Set((enemy.moveOnDeath ?? []).flatMap((rule) => rule.rule.exclusive));
    if (moves.size > 0) out.set(enemy.index, moves);
  }
  return out;
}

/** The learned death-rule note on an enemy in the combat question (MECH_DEATH_MOVE): what its allies' deaths do to its move. */
export function deathRuleNote(enemy: EnemySim | undefined): string {
  const own = (enemy?.moveOnDeath ?? []).filter((rule) => rule.move !== null || rule.next !== null);
  if (own.length === 0) return "";
  const named = (name: string | null, id: string) => (name && name !== id ? `${name} (${id}, ` : `${id} (`);
  const parts = own.map((rule) => {
    const now = rule.move !== null ? `its move changes at once to ${named(rule.moveName, rule.move)}${rule.attacks.length > 0 ? `attack ${rule.attacks.reduce((sum, hit) => sum + hit.damage * hit.hits, 0)}` : "no attack"} this turn; ${rule.nowCounts?.[0]} of ${rule.nowCounts?.[1]} logged)` : "";
    const next = rule.next !== null ? `its next move is ${named(rule.nextName, rule.next)}${rule.nextAttack ? `attack ~${rule.nextAttack}` : "no attack"}; ${rule.nextCounts?.[0]} of ${rule.nextCounts?.[1]} logged)` : "";
    return `when ${rule.allyName} dies on my turn ${[now, next].filter(Boolean).join(", then ")}`;
  });
  return `observed in the logs, not in its text: ${parts.join("; ")}; the options' numbers and the rollout already count it`;
}

/**
 * MECH_MOVE_RULES (class C): the Kaiser Crab's back attack needs both claws (turn-solver PlayerSim.backAttackPair), said on
 * the claws' powers: on Crab Rage while both live, on the survivor's back-attack power once one is dead.
 */
function backAttackPairNote(env: DecisionEnv, powerId: string, living: number): string {
  if (!mechMoveOn(env)) return "";
  if (powerId === "CRAB_RAGE_POWER" && living >= 2) return " (observed in the logs: once its partner is dead its attacks no longer get the +50% from behind, whatever you face; the options' numbers already count it)";
  if (/^BACK_ATTACK_(LEFT|RIGHT)_POWER$/.test(powerId) && living < 2) return " (its partner is dead: no back attack any more, whatever you face; the intent shown is what lands: 152 of 152 logged one-claw intents)";
  return "";
}

/** The learned move-rule note on an enemy power in the combat question (MECH_MOVE_RULES), for the rules on this enemy. */
function moveRuleNote(enemy: EnemySim | undefined, powerId: string): string {
  const own = (enemy?.moveOnStrip ?? []).filter((rule) => rule.power === powerId);
  if (own.length === 0) return "";
  const parts = own.map((rule) => `${rule.how === "removed" ? "when it is removed" : "when a stack of it is taken"} on my turn its move changes at once to ${rule.moveName} (${rule.move}, ${rule.attacks.length > 0 ? `attack ${rule.attacks.reduce((sum, hit) => sum + hit.damage * hit.hits, 0)}` : "no attack"}), ${rule.changed} of ${rule.n} times`);
  return ` (observed in the logs, not in its text: ${parts.join("; ")}; the options' numbers already count it)`;
}

/**
 * The learned strip-stun note on an enemy power in the combat question (MECH_RULES): what the logs show the game's text
 * does not say, and that the options already count it. Only for a rule the solver applies to this enemy.
 */
function stripStunNote(enemy: EnemySim | undefined, powerId: string, rules: Map<string, StripStunRule>): string {
  const rule = rules.get(powerId);
  if (!rule || !enemy?.stunOnStrip?.some((stun) => stun.power === powerId)) return "";
  return ` (observed in the logs, not in its text: when its last stack is stripped on my turn it is stunned at once and its move this turn is cancelled, ${rule.stunned} of ${rule.n} strips in ${rule.fights} fights; the options' numbers already count it)`;
}

/**
 * Hardened Shell (「每回合失去的生命值不会超过20点」): the cap is per turn, and a re-plan mid-turn (a draw, a card
 * screen, Jev's question) read the full 20 again (3RWJX25LB2CD F14 T3: the colony 45 -> 25, "Twin Strike ->
 * colony, dmg 14", really 0). Each capped enemy's HP at the turn's first decision is kept (memory.turnStartHp,
 * `key` = fight:turn), and the cap given to the solver is what is left of it.
 */
export function carryHpLossCaps(memory: DecisionEnv["screenMemory"], key: string, enemies: EnemySim[]): void {
  if (!enemies.some((enemy) => enemy.hpLossCap !== null && enemy.hpLossCap !== undefined)) return;
  if (memory.turnStartHp?.key !== key) memory.turnStartHp = { key, hp: {} };
  const start = memory.turnStartHp.hp;
  for (const enemy of enemies) {
    if (enemy.hpLossCap === null || enemy.hpLossCap === undefined) continue;
    const first = start[String(enemy.index)];
    if (first === undefined) start[String(enemy.index)] = enemy.hp;
    else enemy.hpLossCap = Math.max(0, enemy.hpLossCap - Math.max(0, first - enemy.hp));
  }
}

/** Block a hand typically puts up against the explosion turn. */
const ERUPTION_BLOCK = 12;
/** Damage per turn assumed before any has been seen (1ZQJ averaged 16). */
const ERUPTION_FALLBACK_DAMAGE = 16;
/** HP a Siphon heals (boss-clock SIPHON_HEAL: +10 at A0-A7, +15 at A8 and A9). */
export { SIPHON_HEAL };
/** Siphon turns when the DB has none: T4, then every 5 turns (Stomp, Ram, Siphon, Pressure Gun, Pressure Up). */
const SIPHON_FALLBACK = { first: 4, period: 5 };

/** The Giant's Siphon turns from the monster DB (turns_seen of SIPHON_MOVE: 4, 9, 14, 19): first turn and period. */
function siphonSchedule(): { first: number; period: number } {
  const turns = moveTurns("WATERFALL_GIANT", "SIPHON_MOVE");
  if (turns.length === 0) return SIPHON_FALLBACK;
  const gaps = turns.slice(1).map((turn, i) => turn - turns[i]!).filter((gap) => gap > 0);
  return { first: turns[0]!, period: gaps.length > 0 ? Math.min(...gaps) : SIPHON_FALLBACK.period };
}

/**
 * Turns to kill the Giant at `perTurn` damage from `turn` on, with its Siphon heals: a Siphon turn the
 * Giant lives through heals it at the end of that turn. Capped at 60.
 */
export function giantTurnsToKill(hp: number, perTurn: number, turn: number, heal: number, schedule = siphonSchedule()): number {
  const siphons = (t: number) => t >= schedule.first && (t - schedule.first) % schedule.period === 0;
  let left = hp;
  let turns = 0;
  for (let t = turn; left > 0 && turns < 60; t += 1) {
    left -= perTurn;
    turns += 1;
    if (left > 0 && siphons(t)) left += heal;
  }
  return turns;
}

/**
 * Waterfall Giant too slow to kill (1ZQJ: 16 damage a turn into 240 HP, dead on T15 with the eruption
 * at 54; 21 HP + 17 block did not survive it). Damage per turn comes from the damage dealt so far: the HP
 * taken off plus what its Siphons healed before this turn (or 16 a turn on T1); turns to kill add the
 * Siphons still to come (Y0CWCD0C03FL: 4 Siphons healed 60, the old maxHp - hp rate saw none of it).
 * Killed on turn K it explodes for its stacks on K: this turn's plus its gain a turn at this ascension
 * (eruptionSchedule: +3) for each enemy turn until then. Our HP then is this turn's less the boss clock's
 * HP loss a turn (bossLossPerTurn) for those same enemy turns (1VX145UJM8RZ T5: 69 HP read as 69 + 12 = 81
 * against a projected 50, "no race"; at the T11 kill it had 18 HP, the eruption 47). When the explosion at
 * the kill is at least that HP plus a hand of block, waiting loses: race it.
 */
export function eruptionRace(enemy: Record<string, unknown>, playerHp: number, turn: number, asc = 0, lossPerTurn?: number): boolean {
  if (str(enemy["enemy_id"]) !== "WATERFALL_GIANT" || enemy["is_alive"] === false) return false;
  const hp = num(enemy["current_hp"]);
  const maxHp = num(enemy["max_hp"]);
  if (hp <= 0 || maxHp >= 1_000_000) return false;
  const stacks = powerAmount(enemy, "STEAM_ERUPTION_POWER");
  // Stacks and their gain a turn at this ascension (monster DB; A8 15 on T2, A9 20, +3 a turn).
  const eruption = eruptionSchedule(asc);
  const eruptionNow = stacks > 0 ? stacks : Math.max(eruptionAt(1, asc, eruption), eruptionAt(turn, asc, eruption));
  const heal = asc >= 8 ? SIPHON_HEAL.a8 : SIPHON_HEAL.base;
  const schedule = siphonSchedule();
  // Healed so far: every Siphon before this turn (one at full HP heals less; rare past T4).
  let healed = 0;
  for (let t = schedule.first; t < turn; t += schedule.period) healed += heal;
  const perTurn = turn > 1 ? Math.max(5, (maxHp - hp + healed) / (turn - 1)) : ERUPTION_FALLBACK_DAMAGE;
  const enemyTurns = giantTurnsToKill(hp, perTurn, turn, heal, schedule) - 1;
  const eruptionAtKill = eruptionNow + eruption.perTurn * enemyTurns;
  const loss = lossPerTurn ?? bossLossPerTurn(bossProfile("WATERFALL_GIANT")!, asc).value;
  if (loss === null) return false;
  const hpAtKill = playerHp - loss * enemyTurns;
  return eruptionAtKill >= hpAtKill + ERUPTION_BLOCK;
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

export function describePlan(plan: Plan, playerHp: number): Record<string, JsonValue> {
  const o = plan.outcome;
  const summary: Record<string, JsonValue> = {
    plays: plan.steps.length === 0 ? "nothing (end the turn now)" : plan.steps.map(stepText).join(", then "),
    result: o.winsFight
      ? "wins the fight this turn"
      : o.dies
        ? "I DIE at the end of the turn"
        : o.revived
          ? `drops to 0 HP: ${o.revived.names.join(" then ")} brings me back, I end the turn at ${o.revived.hp}/${playerHp} HP and ${o.revived.names.length > 1 ? "they are" : "it is"} used up (hp_lost counts all my HP now as lost, then what the revived ${o.revived.reviveHp} HP lose)`
          : (o.explodesNext ?? 0) > 0
            ? `kills it but the fight is NOT over: it explodes for ${o.explodesNext} at the end of my next turn, against that turn's block; I have ${o.hpAfter}/${playerHp} HP after this turn, so next turn needs ${Math.max(0, (o.explodesNext ?? 0) - o.hpAfter + 1)}+ block to live`
            : `survives with ${o.hpAfter}/${playerHp} HP before healing`,
    hp_lost: o.hpLoss,
    damage_dealt: o.damageDealt,
  };
  if (o.revived) summary["revive_spent"] = o.revived.names.join(", ");
  if (o.kills.length > 0) summary["kills"] = o.kills.join(", ");
  if (o.restocked.length > 0) summary["revives_from_stock"] = `${o.restocked.join(", ")}: back at full HP with +3 Strength, NOT a kill`;
  if ((o.spawns ?? []).length > 0) summary["spawns_on_death"] = `${o.spawns!.join("; ")}: they arrive as it dies, the fight is NOT over`;
  // A Waterfall Giant husk has no HP to take off (999,999,999): named as the husk, not by that number.
  if (!o.winsFight) summary["enemies_after"] = o.enemyHpAfter.filter((enemy) => enemy.hp > 0).map((enemy) => `${enemy.name} ${enemy.husk ? "husk (cannot be killed, it explodes; damage into it counts for nothing)" : `${enemy.hp} HP`}${enemy.vulnerable ? `, Vulnerable ${enemy.vulnerable}` : ""}${enemy.weak ? `, Weak ${enemy.weak}` : ""}${enemy.poison ? `, 中毒 ${enemy.poison}` : ""}${enemy.demise ? `, Demise ${enemy.demise} (loses ${enemy.demise} HP at the end of each of its turns)` : ""}`).join("; ");
  if (o.blockGained > 0) summary["block_gained"] = o.blockGained;
  if (o.strengthGained > 0) summary["strength_gained"] = o.strengthGained;
  if (o.cardsDrawn > 0) summary["cards_drawn"] = o.cardsDrawn;
  if (o.energyLeft > 0) summary["energy_unused"] = o.energyLeft;
  if ((o.nextTurnEnergy ?? 0) > 0) summary["next_turn_energy"] = `+${o.nextTurnEnergy} energy next turn (Pael's Tear: this line ends the turn with energy unspent)`;
  if (o.startTurnKills.length > 0) summary["mercury_hourglass_kills_next_turn"] = o.startTurnKills.join(", ");
  if (o.withersAdded > 0) summary["withers_added"] = o.withersAdded;
  if (o.sleepCost > 0) summary["wakes_sleeping_enemy"] = "yes: its free turns are lost";
  // Powers pay off every later turn; without saying so the models swapped power lines for ones that
  // saved a few HP now (JEGBU7JHEL1A: Rupture and Crimson Mantle never played in a 379 HP boss fight).
  if (o.lasting >= 5) summary["lasting_value"] = `sets up a power worth about ${Math.round(o.lasting)} score over the fight (a few HP now is often worth it in a long fight)`;
  // Unrelenting's free Attack left unused stays up into the next turn (FREE_ATTACK_POWER carries over, 2a38a76);
  // the score of this turn does not count it, so it is said (a fact, not a weight).
  if (!o.winsFight && (o.freeAttacksLeft ?? 0) > 0) summary["free_attacks_kept"] = `${o.freeAttacksLeft} free Attack${o.freeAttacksLeft === 1 ? "" : "s"} (Unrelenting) left unused: ${o.freeAttacksLeft === 1 ? "it stays" : "they stay"} up into next turn (the next Attack played costs 0)`;
  if ((o.stuns ?? []).length > 0) summary["stuns"] = `${o.stuns!.join(", ")}: its attack fully blocked (Imbalanced), it skips its next move (~${o.stunSaved ?? 0} damage saved next turn)`;
  // MECH_RULES: a learned strip-stun this line sets off (the Hopper's last Flutter): its move this turn is cancelled.
  const stripped = o.winsFight ? [] : o.enemyHpAfter.filter((enemy) => enemy.strippedStun && enemy.hp > 0);
  if (stripped.length > 0) {
    summary["stripped_stun"] = stripped
      .map((enemy) => {
        const stun = enemy.strippedStun!;
        return `stuns ${enemy.name} (its last ${stun.name} stripped): ${stun.attack > 0 ? `its attack this turn (${stun.attack}) is cancelled, already left out of hp_lost` : "its move this turn is cancelled"}`;
      })
      .join("; ");
  }
  // MECH_MOVE_RULES: a learned move change this line sets off (an Axebot killed with Stock left: back in Boot Up).
  const moved = o.winsFight ? [] : o.enemyHpAfter.filter((enemy) => enemy.movedTo);
  if (moved.length > 0) {
    summary["move_change"] = moved
      .map((enemy) => {
        const change = enemy.movedTo!;
        const attack = change.attack > 0 ? `attack ${change.attack}` : "no attack";
        const instead = change.before !== change.attack ? ` instead of the ${change.before > 0 ? `${change.before} shown` : "move shown"}` : "";
        return `${change.how === "removed" ? "removes" : "takes a stack of"} ${enemy.name}'s ${change.name}: its move becomes ${change.moveName} (${change.move}, ${attack} this turn${instead}; ${change.changed} of ${change.n} logged), already in hp_lost`;
      })
      .join("; ");
  }
  // MECH_DEATH_MOVE: a learned death rule this line sets off (the Amalgam killed: the Queen's Enrage now, Off With Your Head next).
  const deaths = o.winsFight ? [] : o.enemyHpAfter.filter((enemy) => enemy.deathMove && enemy.hp > 0);
  if (deaths.length > 0) {
    summary["death_move"] = deaths
      .map((enemy) => {
        const change = enemy.deathMove!;
        // The game's move name and its id ("ENRAGE_MOVE" alone when the DB has no name for it).
        const named = (name: string | null, id: string) => (name && name !== id ? `${name} (${id}, ` : `${id} (`);
        const now = change.move !== null
          ? `${enemy.name}'s move becomes ${named(change.moveName, change.move)}${change.attack > 0 ? `attack ${change.attack}` : "no attack"} this turn${change.before !== change.attack ? ` instead of the ${change.before > 0 ? `${change.before} shown` : "move shown"}` : ""}; ${change.nowCounts?.[0]} of ${change.nowCounts?.[1]} logged) at once, already in hp_lost`
          : "";
        const next = change.next !== null
          ? `next turn ${enemy.name} uses ${named(change.nextName, change.next)}${change.nextAttack ? `attack ~${change.nextAttack} as priced now` : "no attack"}; ${change.nextCounts?.[0]} of ${change.nextCounts?.[1]} logged), not in hp_lost (the rollout counts it)`
          : "";
        return `kills ${change.allyName}: ${[now, next].filter(Boolean).join("; ")}`;
      })
      .join("; ");
  }
  if ((o.bufferSpentBySelf ?? 0) > 0) summary["buffer_used_by_own_hp_loss"] = o.bufferSpentBySelf!;
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
  /** The first attack of a living enemy's observed summon, independent of the summoner's Weak. */
  summonedThreat?: Map<number, number>;
  /**
   * Illusions (ILLUSION_POWER, the Parafright) come back at full HP the turn after they die and hit with
   * their usual move (move-model revivingForecast; the rollout revives them the same way, 115b517): that
   * hit per living illusion's index, for a line that kills it, and summed over the illusions already dead
   * on the board (revivingIllusions). Absent: no illusion.
   */
  revivingThreat?: Map<number, number | null>;
  revivedThreat?: number | null;
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
  // line leaves on an enemy cuts its hit by a quarter when it outlasts this enemy turn: Weak 1 is gone
  // by then (logged: enemy Weak 1 at the end of our turn, 0 at our next turn, 51/51; Weak 2 -> 1, 16/16).
  // An illusion the line kills is back next turn at full HP, its debuffs gone (FA82FQHSJG2F F27: killed
  // turn after turn, it hit again every time); one already dead now is back too.
  let threat = 0;
  let known = false;
  for (const enemy of ctx.enemies) {
    const after = o.enemyHpAfter.find((entry) => entry.index === enemy.index);
    if (o.winsFight) continue;
    const killed = after !== undefined && after.hp <= 0;
    if (killed && !enemy.illusion) continue;
    const summoned = ctx.summonedThreat?.get(enemy.index) ?? 0;
    if (summoned > 0 && !killed && !after?.strippedStun) {
      known = true;
      threat += summoned;
    }
    const next = killed ? ctx.revivingThreat?.get(enemy.index) : ctx.nextThreat.get(enemy.index);
    if (next === null || next === undefined) continue;
    known = true;
    threat += next * (!killed && (after?.weak ?? 0) >= 2 ? 0.75 : 1);
  }
  if (!o.winsFight && ctx.revivedThreat !== undefined && ctx.revivedThreat !== null) {
    known = true;
    threat += ctx.revivedThreat;
  }
  const scaling: string[] = [];
  if (o.strengthGained > 0) scaling.push(`+${o.strengthGained} permanent Strength`);
  if (powers.length > 0) scaling.push(`plays power ${powers.join(", ")}`);
  if (o.lasting >= 1) scaling.push(`lasting value ${Math.round(o.lasting)}`);
  // A line saved by a revive ends at the revive's HP (less what came after it).
  const hpAfter = o.revived?.hp ?? o.hpAfter;
  return {
    hp_after: hpAfter,
    hp_after_pct: ctx.maxHp > 0 ? Math.round((hpAfter / ctx.maxHp) * 100) : null,
    dmg: o.damageDealt,
    lethal_now: o.winsFight
      ? "wins the fight"
      : keyKills.length > 0
        ? `kills ${keyKills.join(", ")}${(o.explodesNext ?? 0) > 0 ? ` (explodes for ${o.explodesNext} at the end of my next turn)` : ""}`
        : "no",
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
  // The card a pile-card potion took (Liquid Memories) is in the hand by its own id once taken.
  const cardId = step.pileCard?.cardId ?? step.cardId;
  const upgraded = step.pileCard?.upgraded ?? step.upgraded;
  // Match the planned copy's cost first: after Snecko Oil the gate kept rejecting the 3-cost Strike
  // while the planned 0-cost one sat in hand (24DPW2ED71QM, 30 min stuck).
  return (
    hand.find((entry) => entry.cardId === cardId && entry.upgraded === upgraded && step.cost !== undefined && entry.cost === step.cost && entry.playable) ??
    hand.find((entry) => entry.cardId === cardId && entry.upgraded === upgraded && entry.playable) ??
    hand.find((entry) => entry.cardId === cardId && entry.playable)
  );
}

/** A card as the hand signature writes it ("BASH+"). */
function takeSignature(card: { cardId: string; upgraded: boolean }): string {
  return `${card.cardId}${card.upgraded ? "+" : ""}`;
}

/** A hand signature with one more card in it. */
function withCard(signature: string, card: string): string {
  return [...(signature === "" ? [] : signature.split(",")), card].sort().join(",");
}

/**
 * A pile-card potion step (Liquid Memories): the "put a card into your hand" screen that follows takes the card
 * the line named (selection.ts), and the line's memo expects it in the hand afterwards.
 */
function notePotionTake(env: DecisionEnv, turn: number | null, step: Step): void {
  if (step.takes) env.screenMemory.potionTake = { turn, cardId: step.takes.cardId, upgraded: step.takes.upgraded };
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

/**
 * Surrounded: we face the enemy we last targeted. Noted after every targeted action that went through (loop.ts:
 * the per-card fallback's plays and a potion's target too, not only a plan's cards via noteIntent) and on replaying
 * a restarted fight's logged decisions (journal-replay.ts), tagged with the fight (facingFight). Before, a fallback
 * play left the facing stale and a restart mid-fight fell back to startFacing.
 */
export function noteFacing(memory: DecisionEnv["screenMemory"], state: GameState, intent: ActionRequest | null | undefined): void {
  if (!state.in_combat || !intent) return;
  const target = intent.target_index;
  if (typeof target !== "number") return;
  memory.facing = target;
  memory.facingFight = facingFightOf(state);
}

/** The fight a facing belongs to: "<run id>:<act>:<floor>". */
export function facingFightOf(state: GameState): string {
  return `${str(state.raw["run_id"])}:${fightKey(state)}`;
}

/** The longest a new turn waits for Rolling Boulder's +5 (logged ~1 s after the turn's first ready frame). */
export const BOULDER_SETTLE_MS = 2500;

/**
 * Whether to wait for the turn start to settle: Rolling Boulder's turn-start hook deals its damage, then grows by 5
 * about a second later, after the mod already reads the turn as settled (actions_settled, snapshot_stable): 46 of 53
 * logged turn starts holding it showed the last turn's amount first, the +5 a frame later (Plating's -1, whose hook
 * runs after it, with it). Planned on that frame, the board changed under the question: JJ75S331VUKX asked Jev 8 times
 * on it, the pre-dispatch re-read saw 5 -> 10 (F25 T2: 01:39:17.8 -> 18.9) and asked again (fix-queue-v4, V4.3 runs
 * 1-3; 15 of the 25 logged "state changed while deciding" combat re-asks). The stale amount is also the next turn-start
 * hit the solver counts (turnStartAoe). A new turn (no card played yet) whose boulder reads no more than it did on the
 * fight's last turn waits for it, at most BOULDER_SETTLE_MS; `memory.boulder` keeps the last amount seen.
 */
export function boulderSettling(memory: ScreenMemory, fight: string, turn: number | null, amount: number, cardsPlayed: number, now: number): boolean {
  const seen = memory.boulder;
  if (turn !== null && amount > 0 && seen && seen.fight === fight && turn > seen.turn && cardsPlayed === 0 && amount <= seen.amount) {
    if (seen.waitTurn !== turn) {
      seen.waitTurn = turn;
      seen.since = now;
    }
    if (now - (seen.since ?? now) < BOULDER_SETTLE_MS) return true;
  }
  memory.boulder = turn !== null && amount > 0 ? { fight, turn, amount } : undefined;
  return false;
}

/** What an action we send changes for later plans: the facing (Surrounded), a spent Demon Tongue. */
function noteIntent(env: DecisionEnv, intent: ActionRequest, card: CardModel | undefined): void {
  noteFacing(env.screenMemory, env.state, intent);
  if (card && card.hpLoss > 0) env.screenMemory.demonTongueTurn = `${hpGuardFight(env)}:${env.state.turn}`;
}

/** Intimidating Helmet's block per 2+ cost card (PU21 F12-F14: block 0 -> 4; its description is a template). */
export const INTIMIDATING_HELMET_BLOCK = 4;
/** Paper Phrog: Vulnerable enemies take 75% more, not 50% (its game text). */
export const PAPER_PHROG_VULNERABLE = 1.75;
/**
 * Cloak Clasp: block at the end of our turn per card in hand (its description's {Block} is a template; logged
 * 7MDJ/JEGB/CWU9/88HN turns: HP lost = shown incoming - block - cards held, e.g. CWU9 F44 T1 11 -> 9 with 2).
 */
export const CLOAK_CLASP_BLOCK = 1;
/**
 * Pael's Tear: 「如果你在拥有未花费的能量情况下结束回合，则下个回合额外获得{Energy}」 — logged over 24 runs holding it:
 * a turn ended with 1, 2 or 3 energy unspent began the next at 5 (45, 12 and 3 turns; 0 unspent: 3, base 3).
 */
export const PAELS_TEARS_ENERGY = 2;
/**
 * Red Skull: 「当你的生命值低于或等于{HpThreshold}%时，你额外获得{StrengthPower}点力量」 — 50% and 3 (logged over 16 runs:
 * +3 at 43 of 48 crossings to half HP or below with no other Strength change, -3 back above; 40/80 counts).
 */
export const RED_SKULL_STRENGTH = 3;
/**
 * Self-Forming Clay: 「每当你在战斗中失去生命，就在下回合获得{BlockNextTurn}点格挡」 — 3 per HP loss (logged V6TW, 2VW5,
 * JF8N, YG3H: SELF_FORMING_CLAY_POWER +3 at each of 50 HP losses on our turn; the next turn starts with that much
 * block, e.g. V6TW F33 T2/T3 6 from two losses).
 */
export const CLAY_BLOCK = 3;
/** Mercury Hourglass: damage to every enemy at the start of our turn (PLC F33: Rocket 108 -> 105). */
export const MERCURY_HOURGLASS_DAMAGE = 3;
/**
 * Shuriken: 「你每在同一回合内打出{Cards}张攻击牌，获得{StrengthPower}点力量」 — 3 and 1 (logged over 8 runs holding it:
 * +1 Strength at 90 of 95 plays taking attacks_played_this_turn to a multiple of 3; the 5 others were mid-selection
 * frames; the count starts again each turn). DHGT6Z3Q7VAP F33 T1: Strength 0 -> 1 -> 2 after the 3rd and 6th Attack,
 * 132 dealt where 116 was shown. The count so far is the relic's stack, which also counts replays, duplicates and
 * Hellraiser autoplays (relicStack; batch K).
 */
export const SHURIKEN_ATTACKS = 3;
export const SHURIKEN_STRENGTH = 1;
/** Lost Wisp: damage to every enemy per Power card played (turn-solver PlayerSim.lostWisp; logged 8 every time). */
export const LOST_WISP_DAMAGE = 8;

/**
 * Damage to every enemy at the start of our next turn, all sources: Mercury Hourglass (3), Inferno
 * (INFERNO_POWER amount, 6 / 9 upgraded) once for its own start-of-turn HP loss and once more for a
 * Crimson Mantle's (both are HP lost on our turn), and Rolling Boulder's amount. 9XZX T5 -> T6: Crusher
 * 55 -> 49, Rocket 140 -> 134.
 */
export function turnStartAoe(relicIds: string[], player: Record<string, unknown>): number {
  const hourglass = relicIds.includes("MERCURY_HOURGLASS") ? MERCURY_HOURGLASS_DAMAGE : 0;
  const inferno = powerAmount(player, "INFERNO_POWER");
  const lossEvents = inferno > 0 ? 1 + (powerAmount(player, "CRIMSON_MANTLE_POWER") > 0 ? 1 : 0) : 0;
  // Rolling Boulder: its amount is what the next start of turn deals to every enemy (then +5; the rollout grows it).
  return hourglass + inferno * lossEvents + powerAmount(player, "ROLLING_BOULDER_POWER");
}
const WITHER_EVERY = 6;

/**
 * Cards played per turn in this fight, sampled on every combat decision (the highest
 * cards_played_this_turn seen per turn). The mod's count leaves out cards a power plays by itself
 * (Hellraiser's Strikes; Y3XT F33: 0 at T6 with a Strike already auto-played).
 */
export function recordFightPlays(env: DecisionEnv, playedThisTurn: number): NonNullable<DecisionEnv["screenMemory"]["fightCards"]> {
  return recordStateFightPlays(env.screenMemory, env.state, playedThisTurn);
}

/**
 * Mean cards played by hand per finished turn of this fight (turns before `turn`), or null before
 * any turn was sampled (Knowledge Demon's curse pick, selection.ts).
 */
export function fightPlaysPerTurn(env: DecisionEnv, turn: number): number | null {
  const memo = env.screenMemory.fightCards;
  if (!memo || memo.fight !== hpGuardFight(env)) return null;
  const counts = Object.entries(memo.perTurn)
    .filter(([key]) => Number(key) < turn)
    .map(([, count]) => count);
  return counts.length > 0 ? counts.reduce((sum, count) => sum + count, 0) / counts.length : null;
}

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
  const memo = recordFightPlays(env, playedThisTurn);
  const held = hand.filter((card) => card.cardId === "WITHER").map((card) => card.heldPenalty);
  if (held.length > 0) memo.witherDamage = Math.max(memo.witherDamage, ...held);
  // Throwing Axe replays the fight's first card, and Withering Presence counts the replay while
  // cards_played_this_turn does not (XWPV F48: every Wither came one card earlier than counted; T7's
  // plan stopped at two cards "before the 3rd adds a Wither", the 2nd added it). Counted from the start:
  // before any card the first one is already two.
  const axe = asArray(asRecord(env.state.run?.raw)["relics"]).some((relic) => str(asRecord(relic)["relic_id"]) === "THROWING_AXE");
  // DPYF2BAA3DKT F48 final T1/T7, silent-0199: the replay enchantment also advances this count,
  // without changing the raw per-turn mean used by curse selection.
  const replayed = Object.values(memo.replays ?? {}).reduce((sum, count) => sum + count, 0);
  const played = Object.values(memo.perTurn).reduce((sum, count) => sum + count, 0) + replayed + (axe ? 1 : 0);
  return { every, played, damage: memo.witherDamage };
}

/** What the hand should look like after the first step of `plan` (for the commitment check). */
/**
 * The cards the next draws come from: agent_view.combat.draw, grouped lines like "打击*4 [1费]：…"
 * (count after "*"), or the discard pile when the draw pile is empty (it is shuffled in). undefined
 * when the state has neither (older mod, tests). XPA4 T8/T10: nothing read the piles, so Battle
 * Trance at 1 energy was "+9" with 3 Beckons in a 6-card pile.
 */
/**
 * A card exhausted earlier this turn: the exhaust pile now is bigger than at the turn's first combat frame (kept
 * in memory.turnStartExhaust). The state has no per-turn count (player.cards_exhausted_this_turn is never sent):
 * 0NZBAVFAT3JG F25 T1, Brand exhausted a Strike, and on the re-ask Evil Eye's extra Block was left out.
 */
export function exhaustedSinceTurnStart(env: DecisionEnv): boolean {
  const size = exhaustPileSize(env.state.raw);
  if (size === undefined) return false;
  const start = env.screenMemory.turnStartExhaust;
  if (noteTurnStartExhaust(env.screenMemory, env.state)) return false;
  return size > start!.size;
}

/**
 * Notes the exhaust pile's size at the turn's first combat frame (memory.turnStartExhaust); true when this frame
 * is that first one. The journal replay after a restart feeds it the run's logged frames, so a turn restarted
 * mid-way keeps its first frame's pile as the baseline (it was the first frame seen after the restart: a card
 * exhausted before it was missed).
 */
export function noteTurnStartExhaust(memory: DecisionEnv["screenMemory"], state: DecisionEnv["state"]): boolean {
  if (!state.in_combat) return false;
  const size = exhaustPileSize(state.raw);
  if (size === undefined) return false;
  const key = `${fightKey(state)}:${state.turn ?? "?"}`;
  if (memory.turnStartExhaust?.key === key) return false;
  memory.turnStartExhaust = { key, size };
  return true;
}

/**
 * CARD_CONDITIONS (card-model cardConditionOptions): HP was lost earlier this turn, before this decision: our HP is below the
 * turn's first combat frame's (memory.turnStartPlayerHp: a card's HP cost, an enemy's Thorns), or Inferno or Crimson Mantle
 * was up at that frame (each takes 1 HP as the turn starts; not under Tungsten Rod, which takes the 1 off). Spite hits twice
 * then (logged: 2 hits on all 123 such plays, 1 on all 318 others). False with the switch off.
 */
export function hpLostSinceTurnStart(env: DecisionEnv): boolean {
  if (!cardConditionOptions.enabled) return false;
  noteTurnStartHp(env.screenMemory, env.state);
  const start = env.screenMemory.turnStartPlayerHp;
  if (!start || start.key !== `${fightKey(env.state)}:${env.state.turn ?? "?"}`) return false;
  return start.startLoss || num(asRecord(asRecord(env.state.raw["combat"])["player"])["current_hp"]) < start.hp;
}

/**
 * Notes our HP at the turn's first combat frame and whether a turn-start HP loss came before it (Inferno, Crimson Mantle up;
 * memory.turnStartPlayerHp); true when this frame is that first one. Fed by the journal replay after a restart, like
 * noteTurnStartExhaust.
 */
export function noteTurnStartHp(memory: DecisionEnv["screenMemory"], state: DecisionEnv["state"]): boolean {
  if (!state.in_combat) return false;
  const player = asRecord(asRecord(state.raw["combat"])["player"]);
  if (player["current_hp"] === undefined) return false;
  const key = `${fightKey(state)}:${state.turn ?? "?"}`;
  if (memory.turnStartPlayerHp?.key === key) return false;
  const relicIds = asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  const startLoss = (powerAmount(player, "INFERNO_POWER") > 0 || powerAmount(player, "CRIMSON_MANTLE_POWER") > 0) && !relicIds.includes("TUNGSTEN_ROD");
  memory.turnStartPlayerHp = { key, hp: num(player["current_hp"]), startLoss };
  return true;
}

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
/**
 * Blessing of the Forge: what upgrading each plain card of the hand and the deck changes, by card id
 * (card-model upgradeDelta; the hand's own entries first, they carry this fight's numbers).
 */
export function forgeUpgrades(state: GameState, knowledge: Knowledge): Record<string, UpgradeDelta> {
  const out: Record<string, UpgradeDelta> = {};
  const entries = [...asArray(asRecord(state.raw["combat"])["hand"]), ...asArray(asRecord(state.run?.raw)["deck"])].map(asRecord);
  for (const entry of entries) {
    const cardId = str(entry["card_id"]);
    if (!cardId || out[cardId] || bool(entry["upgraded"])) continue;
    const delta = upgradeDelta(entry, knowledge);
    if (delta) out[cardId] = delta;
  }
  return out;
}

/**
 * Entropic Brew (「在所有空药水栏位中获得随机药水」): the potions a drink gives, its own slot included (logged 8 of 8
 * drinks in a fight: 1WSH, 2WUM, 4JVP, CJ88, EZ2L, SVN2, TTVY, VKPX, VSRG filled every empty slot and the Brew's own).
 */
export function entropicBrewPotions(state: GameState): number {
  return 1 + asArray(asRecord(state.run?.raw)["potions"]).filter((slot) => asRecord(slot)["occupied"] === false).length;
}

/**
 * The cards a draw could bring when the state has no piles: the deck less the cards in hand (by id and upgrade), as
 * pile cards (Strength and Weak in, the living enemies as targets).
 */
export function deckDrawPool(state: GameState, knowledge: Knowledge, ctx: { enemyTargets: number[]; strength: number; weak: boolean }, hand: CardModel[]): CardModel[] {
  const inHand = hand.filter((card) => card.type !== "Potion").map((card) => `${card.cardId}${card.upgraded ? "+" : ""}`);
  // Spiked Gauntlets: a Power 1 more than the deck says (card-model pilePowerExtraCost).
  const powerExtraCost = pilePowerExtraCost(runRelicIds(state));
  return asArray(asRecord(state.run?.raw)["deck"]).flatMap((raw, position) => {
    const own = asRecord(raw);
    const cardId = str(own["card_id"]);
    if (!cardId) return [];
    const key = `${cardId}${bool(own["upgraded"]) ? "+" : ""}`;
    const at = inHand.indexOf(key);
    if (at >= 0) {
      inHand.splice(at, 1);
      return [];
    }
    const model = offHandCardModel(own, cardId, bool(own["upgraded"]), 900 + position, knowledge, null, powerExtraCost, str(asRecord(state.run?.raw)["character_id"]));
    return [{ ...model, validTargets: model.target === "single" ? ctx.enemyTargets : [], damage: model.damage === null ? null : Math.floor((model.damage + ctx.strength) * (ctx.weak ? 0.75 : 1)) }];
  });
}

/** The run's relic ids. */
export function runRelicIds(state: GameState): string[] {
  return asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
}

export function pileCardModels(state: GameState, knowledge: Knowledge, pile: "discard" | "draw", ctx: { enemyTargets: number[]; strength: number; weak: boolean }): CardModel[] {
  return pileEntries(state, knowledge, pile, ctx).flatMap((entry) => Array.from({ length: entry.count }, () => entry.card));
}

/** One agent_view pile line as pileCardModels models it: the card, its copies, the line itself and its mods (enchantments). */
export interface PileEntry {
  card: CardModel;
  /** The card as modelled before the board's Strength, Weak and targets (the deck entry's numbers). */
  raw: CardModel;
  count: number;
  line: string;
  mods: string[];
  /** The cost the line shows ("[1费]"), when a number. */
  lineCost: number | null;
  /** A number of the card worked out in play from the board (a "Calculated…" value: Perfected Strike's Strikes, Body Slam's block). */
  calculated: boolean;
}

export function pileEntries(state: GameState, knowledge: Knowledge, pile: "discard" | "draw", ctx: { enemyTargets: number[]; strength: number; weak: boolean }): PileEntry[] {
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  const deck = asArray(asRecord(state.run?.raw)["deck"]).map(asRecord);
  // Spiked Gauntlets: a deck entry's Power is 1 more in the pile (its line shows it; card-model pilePowerExtraCost).
  const powerExtraCost = pilePowerExtraCost(runRelicIds(state));
  return asArray(view[pile]).flatMap((raw, position): PileEntry[] => {
    const entry = asRecord(raw);
    const cardId = str(asArray(entry["card_ids"])[0]);
    if (!cardId) return [];
    const line = str(entry["line"]);
    const upgraded = /^[^[*：:]*?\+\s*(?:\*\d+\s*)?\[/.test(line);
    const own = deck.find((card) => str(card["card_id"]) === cardId && bool(card["upgraded"]) === upgraded) ?? deck.find((card) => str(card["card_id"]) === cardId) ?? null;
    // Not in the deck (a status an enemy added): the game data's card at the line's cost (Frantic Escape's grows).
    const lineCost = /\[(-?\d+)费\]/.exec(line)?.[1];
    const model = offHandCardModel(own, cardId, upgraded, 900 + position, knowledge, own === null && lineCost !== undefined ? Number(lineCost) : null, powerExtraCost, str(asRecord(state.run?.raw)["character_id"]));
    const card: CardModel = {
      ...model,
      validTargets: model.target === "single" ? ctx.enemyTargets : [],
      damage: model.damage === null ? null : Math.floor((model.damage + ctx.strength) * (ctx.weak ? 0.75 : 1)),
    };
    // "剑柄打击*2 [1费]": one line per card id, with its count (drawPileCards reads it the same way).
    const count = Number(/^[^[：:]*?\*(\d+)\s*\[/.exec(line)?.[1] ?? 1);
    const vars = own ? asArray(own["dynamic_values"]).map((value) => str(asRecord(value)["name"])) : (knowledge.card(cardId)?.vars ?? []).map((value) => str(asRecord(value)["name"]));
    return [{ card, raw: model, count: Math.max(1, count), line, mods: asArray(entry["mods"]).map((mod) => str(mod)), lineCost: lineCost !== undefined ? Number(lineCost) : null, calculated: vars.some((name) => name.startsWith("Calculated")) }];
  });
}

/**
 * The draw and discard piles as base cards (no Strength/Weak: the rollout applies its own), for the
 * rollout facts; null when the state carries neither pile.
 */
export function rolloutPiles(state: GameState, knowledge: Knowledge, enemyTargets: number[]): { draw: CardModel[]; discard: CardModel[] } | null {
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  if (!Array.isArray(view["draw"]) && !Array.isArray(view["discard"])) return null;
  const ctx = { enemyTargets, strength: 0, weak: false };
  return { draw: pileCardModels(state, knowledge, "draw", ctx), discard: pileCardModels(state, knowledge, "discard", ctx) };
}

export function drawPileCards(raw: Record<string, unknown>): DrawPileCard[] | undefined {
  const view = asRecord(asRecord(raw["agent_view"])["combat"]);
  const parse = (pile: unknown): DrawPileCard[] =>
    asArray(pile).flatMap((entry) => {
      const line = str(asRecord(entry)["line"]);
      const count = Number(/^[^[：:]*?\*(\d+)\s*\[/.exec(line)?.[1] ?? 1);
      const cost = /\[(-?\d+|X)费\]/.exec(line)?.[1];
      // Enthralled drawn mid-turn plays nothing: it locks the rest of the hand until 2 energy are spent on it (no draw value).
      const playFirst = asArray(asRecord(entry)["card_ids"]).some((id) => typeof id === "string" && isPlayFirst(id));
      const playable = cost !== "-1" && !/不能被打出|unplayable/i.test(line) && !playFirst;
      const text = line.replace(/\[[^\]]*\]/g, "");
      const block = /获得\d+点格挡|gain \d+ block/i.test(text) && !/造成\d+点伤害|deal \d+ damage/i.test(text);
      const strike = asArray(asRecord(entry)["card_ids"]).some((id) => typeof id === "string" && isStrikeCard({ cardId: id }));
      const card: DrawPileCard = { playable, heldPenalty: heldPenaltyOf(line).heldPenalty, ...(block ? { block } : {}), ...(strike ? { strike } : {}) };
      return Array.from({ length: count }, () => card);
    });
  const draw = parse(view["draw"]);
  if (draw.length > 0) return draw;
  const discard = parse(view["discard"]);
  return discard.length > 0 ? discard : undefined;
}

/** The potion belt as "slot:potion_id" of the occupied slots (slots keep their index when one is drunk). */
function beltSignature(raw: Record<string, unknown>): string {
  return asArray(asRecord(raw["run"])["potions"])
    .map(asRecord)
    .filter((slot) => bool(slot["occupied"]))
    .map((slot) => `${num(slot["index"])}:${str(slot["potion_id"])}`)
    .join("|");
}

/** The belt a potion step leaves (its slot empty); undefined for a card step (the hand tells those apart). */
function beltAfter(step: Step, raw: Record<string, unknown>): string | undefined {
  if (!step.cardId.startsWith("POTION:")) return undefined;
  const slot = step.cardId.split(":")[2];
  return beltSignature(raw)
    .split("|")
    .filter((entry) => entry !== "" && entry.split(":")[0] !== slot)
    .join("|");
}

function expectedHandAfterFirst(plan: Plan, hand: CardModel[], musicBox: boolean): string {
  const first = plan.steps[0];
  if (!first) return handSignature(hand);
  return handSignature(handAfterPlay(cardFor(first, hand), hand, musicBox));
}

/**
 * Music Box armed on this frame: held, and no Attack played yet this turn, so the next Attack card played comes back
 * as an Ethereal copy (turn-solver PlayerSim.musicBox). YVYZ F48 T3: the copy read as "hand grew" and the line was
 * re-planned three times that turn.
 */
function musicBoxArmed(state: DecisionEnv["state"]): boolean {
  const held = asArray(asRecord(state.run?.raw)["relics"]).some((relic) => str(asRecord(relic)["relic_id"]) === "MUSIC_BOX");
  return held && num(asRecord(asRecord(state.raw["combat"])["player"])["attacks_played_this_turn"]) === 0;
}

/**
 * The hand after a card is played from it: the card gone, and after Primal Force every Attack left a Giant Rock
 * (巨石, 巨石+ from Primal Force+; the solver's giantRockFrom), so the line goes on instead of reading the rocks as a
 * surprise and re-planning (as eca3384 for Blessing of the Forge's upgrades).
 */
function handAfterPlay(played: CardModel | undefined, hand: CardModel[], musicBox: boolean): CardModel[] {
  const left = hand.filter((card) => card !== played);
  // Music Box armed: the Attack comes back as an Ethereal copy.
  if (played?.type === "Attack" && musicBox) return [...left, musicBoxCopy(played)];
  if (played?.special !== "primal_force") return left;
  return left.map((card) => (card.type === "Attack" ? { ...card, cardId: "GIANT_ROCK", upgraded: played.upgraded } : card));
}

function commit(env: DecisionEnv, turn: number | null, plan: Plan, hand: CardModel[], via: CombatPlanMemo["via"]): void {
  // SL_RETRY_EXPLORE: code's own line of this decision (planCombatTurn notes it; nothing else reads it).
  slCommitted = plan;
  const first = plan.steps[0];
  // Gambler's Brew draws what it draws: re-planned after it, like a draw.
  const drawsOrRandom = (first ? cardFor(first, hand)?.draw ?? 0 : 0) + (first?.discards ? 1 : 0);
  // A one-step line Jev (or the escalator) chose is kept too, with nothing left: its end is "stop here"
  // (lineDone), not a fresh plan (9Q7V F17 T14: after Jev's "One-Two Punch" alone, code re-planned and
  // played the Sword Boomerang Jev had turned down, killing the Giant into its blast).
  env.screenMemory.plannedAfter = { turn, steps: plan.steps.slice(1), lethal: plan.outcome.winsFight };
  // A line's later drinks go with the rest of the line: when it is cut short (a draw, a random exhaust, a
  // hand the plan did not expect) the re-plan offers the potion again beside the new hand, and whoever
  // decides that turn decides the drink (XMK1 F33 T3: Battle Trance drew three cards, the stale Blood
  // Potion step was drunk at 76/87 before the re-plan, 6 of its 17 wasted).
  if (first?.discards) env.screenMemory.gambleDiscards = { turn, cardIds: first.discards };
  if (first) notePotionTake(env, turn, first);
  // A potion step leaves the hand as it is: the next step expects the same hand and the belt without it (a
  // Jev line opening with a drink was re-planned every time: the memo expected one card less, "hand grew").
  const potions = first ? beltAfter(first, env.state.raw) : undefined;
  env.screenMemory.combatPlan =
    (plan.steps.length > 1 || (plan.steps.length === 1 && via !== "code")) && drawsOrRandom === 0
      ? {
          turn,
          lethal: plan.outcome.winsFight,
          remaining: plan.steps.slice(1),
          expectedHand: expectedHandAfterFirst(plan, hand, musicBoxArmed(env.state)),
          handLen: handLenAfter(first!, hand, musicBoxArmed(env.state)),
          ...(upgradesHand(first!) ? { upgradeAll: true } : {}),
          ...(first!.takes ? { take: takeSignature(first!.takes) } : {}),
          via,
          enemies: livingEnemySignature(env.state.raw),
          ...(potions !== undefined ? { potions } : {}),
        }
      : null;
}

/**
 * After an in-combat card choice: the hand is the expected one less the cards the choice took, some perhaps
 * upgraded by it (ids compared without the "+"), and still holds a distinct card for every card step left.
 */
function leftByChoice(memo: CombatPlanMemo, hand: CardModel[]): boolean {
  const expected = memo.expectedHand === "" ? [] : memo.expectedHand.split(",").map((id) => id.replace(/\+$/, ""));
  for (const card of hand) {
    const at = expected.indexOf(card.cardId);
    if (at < 0) return false;
    expected.splice(at, 1);
  }
  let left = hand;
  for (const step of memo.remaining) {
    if (step.cardId.startsWith("POTION:")) continue;
    const card = cardFor(step, left);
    if (!card) return false;
    left = left.filter((entry) => entry !== card);
  }
  return true;
}

/** A Blessing of the Forge step: it upgrades the hand, so the next step expects the same cards upgraded. */
function upgradesHand(step: Step): boolean {
  return step.cardId.startsWith("POTION:BLESSING_OF_THE_FORGE:");
}

/** A hand signature with the upgrade marks dropped (sorted again: "+" moves a card's place). */
function withoutUpgrades(signature: string): string {
  return signature === "" ? "" : signature.split(",").map((id) => id.replace(/\+$/, "")).sort().join(",");
}

/** Hand size after a step: a card leaves the hand, a potion does not; an armed Music Box gives an Attack back as a copy. */
function handLenAfter(step: Step, hand: CardModel[], musicBox: boolean): number {
  const card = cardFor(step, hand);
  return card ? hand.length - 1 + (card.type === "Attack" && musicBox ? 1 : 0) : hand.length;
}

/**
 * A chosen line (Jev's, the escalator's) played to its end on the board it expected. Its end (energy unused
 * included) is part of the choice: code does not extend it on its own (planTurn stopLine).
 */
function lineDone(memo: CombatPlanMemo, combat: Record<string, unknown>, available: string[]): boolean {
  return memo.remaining.length === 0 && memo.via !== "code" && available.includes("end_turn") && !bool(combat["end_turn_will_kill_player"]);
}

/**
 * A chosen line's next step as the execution gate checks it (act/identity.ts): the card (or the potion) the line
 * chose, the enemy at its target index when the line was chosen (memo.enemies), the line's turn, and the board the
 * line expected before this step: its hand and its living enemies. The hand is left out when the line accepts a
 * changed one (resumed after a card choice, after Blessing of the Forge: the upgrade is not checked either); after
 * Liquid Memories it holds the card taken. `now` is the hand the step was matched on.
 */
function lineStepExpect(memo: CombatPlanMemo, step: Step, now: string): ActionExpect {
  const potion = step.cardId.startsWith("POTION:") ? step.cardId.split(":")[1] ?? "" : null;
  const loose = memo.afterSelection === true || memo.upgradeAll === true;
  const hand = memo.expectedHand === now ? memo.expectedHand : memo.take !== undefined && withCard(memo.expectedHand, memo.take) === now ? now : null;
  // memo.enemies: "index:enemy_id" of the living enemies when the line was chosen.
  const aimed = step.target === null ? undefined : (memo.enemies ?? "").split("|").find((entry) => entry !== "" && Number(entry.slice(0, entry.indexOf(":"))) === step.target);
  const target = aimed === undefined ? undefined : aimed.slice(aimed.indexOf(":") + 1);
  return {
    from: "line",
    ...(potion !== null
      ? { potion: { id: potion } }
      : { card: { id: step.pileCard?.cardId ?? step.cardId, ...(loose ? {} : { upgraded: step.pileCard?.upgraded ?? step.upgraded }) } }),
    ...(target ? { target: { id: target } } : {}),
    ...(memo.turn !== null ? { turn: memo.turn } : {}),
    ...(hand !== null && !loose ? { hand } : {}),
    ...(memo.enemies !== undefined ? { enemies: memo.enemies } : {}),
  };
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
 * Sandpit hard guard (TTVY T6): never end the turn with the Sandpit about to reach 0 while an
 * affordable Frantic Escape is in hand. The mod's end_turn_will_kill_player does not see this death,
 * so it applies to every combat planner and to answers from Jev/DeepSeek alike. Code's own plays are
 * held to it too: a card that would leave too little energy for the cheapest Escape, in a line that does
 * not play one next, gives way to the Escape (KY3Y F33 T9: least-loss "Defend, Defend" at 2 energy with
 * a 2-cost Escape in hand; the pit took us at 14 HP with 10 block up). A lethal is left alone.
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
  const hand = asArray(combat["hand"]).map(asRecord);
  const escape = hand
    .filter((card) => str(card["card_id"]) === "FRANTIC_ESCAPE" && card["playable"] !== false && num(card["energy_cost"]) <= energy)
    .sort((a, b) => num(a["energy_cost"]) - num(b["energy_cost"]))[0];
  if (!escape) return decision;
  const intent: ActionRequest = { action: "play_card", card_index: num(escape["index"]) };
  const why = `Sandpit ${Math.min(...sandpits)} would reach 0 at the enemy turn (death regardless of HP/block)`;
  if (decision.kind === "act") {
    // C48LLXBGKXQ9 F33 attempt 5 T13: the second card of a lethal has a continuation label.
    const after = env.screenMemory.plannedAfter;
    const lethalContinuation = decision.label === "combat/plan-continue" && after?.turn === (env.state.turn ?? null) && after.lethal === true;
    if (decision.intent.action === "play_card" && decision.label !== "combat/lethal" && !lethalContinuation) {
      const played = hand.find((card) => num(card["index"]) === decision.intent.card_index);
      const escapeNext = after !== undefined && after.turn === (env.state.turn ?? null) && after.steps.some((step) => step.cardId === "FRANTIC_ESCAPE");
      const cost = played ? (bool(played["costs_x"]) ? energy : num(played["energy_cost"])) : 0;
      if (!played || str(played["card_id"]) === "FRANTIC_ESCAPE" || escapeNext || energy - cost >= num(escape["energy_cost"])) return decision;
      env.screenMemory.combatPlan = null;
      return { kind: "act", label: "combat/sandpit-guard", intent, rationale: `${why}: playing Frantic Escape before ${str(played["name"], str(played["card_id"]))}, which would leave too little energy for it` };
    }
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
 * The rationale's note when the solver and the mod's end-turn lethal flag disagree ("" when they agree). The mod's
 * flag does not know Fairy in a Bottle or Lizard Tail: ending the turn at 0 HP with a revive held is lethal to it and
 * to the solver alike (the solver then goes on at the revive's HP). It counts the enemy intents against block only
 * (lethal_risks "incoming_damage"): a death from what the turn's end costs besides (held Beckons' HP loss, a Mantle,
 * Disintegration) is not a calculation mismatch (ARKG3JFT26HC F17 T12: 40 HP, four Beckons held and a 27 hit, 51 in
 * all, "mod says safe"; one Beckon was held and T13 began at 7 = 40 - 27 - 6, as the solver has it). Damage from cards
 * held (Burn, Wither, Toxic: named as they are) meets block like a hit but is no intent either: the enemy hits' part is
 * the rest (K7G9M8K4DWFW F45 T3).
 * Nor is the Sandpit reaching 0, which eats the player whatever the HP (UNRLW0W3XWLD F33 T8: Sandpit 1, the
 * end-turn line read "0 HP lost in all, 0 of it the enemy hits after block", the Sandpit unnamed).
 */
export function endTurnLethalNote(endNow: Plan | undefined, modSaysLethal: boolean, hp: number): string {
  if (!endNow) return "";
  const endReachesZero = endNow.outcome.dies || endNow.outcome.revived !== undefined;
  if (endReachesZero === modSaysLethal) return "";
  const heldDamage = endNow.outcome.heldDamage ?? 0;
  const enemyPart = Math.max(0, endNow.outcome.incomingAfterBlock - heldDamage);
  const endOnlyByOwnLosses = endNow.outcome.dies && !modSaysLethal && enemyPart < hp;
  // Mod says lethal, the solver lives: what the solver counts at the turn's end that the flag does not (86C3 F25 T5:
  // 28 intents vs 28 HP, Plating 2 took it to 26; the note said only "calc mismatch").
  if (modSaysLethal && !endReachesZero) {
    const guards = endNow.outcome.endTurnGuards ?? [];
    const left = `the enemy turn takes ${endNow.outcome.incomingAfterBlock} of ${hp} HP`;
    return guards.length > 0
      ? ` [calc mismatch: solver says ending now does not kill, mod says lethal: the mod's flag counts the intents against the block up now; the solver also counts ${guards.map((guard) => `${guard.what} ${guard.amount}`).join(", ")} (${left})]`
      : ` [calc mismatch: solver says ending now does not kill, mod says lethal: no end-of-turn block, Regen or Buffer the flag leaves out; the solver's enemy hits differ from the intents (${left})]`;
  }
  if (!endOnlyByOwnLosses) return ` [calc mismatch: solver says ending now ${endNow.outcome.dies ? "kills" : "does not kill"}, mod says ${modSaysLethal ? "lethal" : "safe"}]`;
  const sandpit = endNow.outcome.sandpitAfter !== null && endNow.outcome.sandpitAfter <= 0;
  const from = endNow.outcome.heldDamageFrom ?? [];
  // HP the held cards take straight off (Beckon), by name (5HHL F17 T7: "37 in all, 25 the enemy hits", the
  // 12 from two Beckons unnamed).
  const heldHpLoss = endNow.outcome.heldHpLoss ?? 0;
  const lossFrom = endNow.outcome.heldHpLossFrom ?? [];
  const losses = `${endNow.outcome.hpLoss} HP lost in all, ${enemyPart} of it the enemy hits after block${heldDamage > 0 ? `, ${heldDamage} damage from cards held${from.length > 0 ? ` (${from.join(", ")})` : ""}` : ""}${heldHpLoss > 0 ? `, ${heldHpLoss} HP lost to cards held${lossFrom.length > 0 ? ` (${lossFrom.join(", ")})` : ""}` : ""}`;
  return sandpit
    ? ` [ending now kills by what the mod's lethal flag does not count: the Sandpit reaches 0 on the enemy turn and eats you whatever the HP (${losses})]`
    : ` [ending now kills by what the mod's lethal flag does not count: ${losses}]`;
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
  if (enemies.some((enemy) => (enemy.asleep ?? 0) > 0 || (enemy.slumber ?? 0) > 0)) {
    const asleep = (plan: Plan) => plan.outcome.winsFight || plan.outcome.sleepCost <= 0;
    if (kept.some((plan) => !plan.outcome.winsFight && asleep(plan))) kept = kept.filter(asleep);
  }
  return kept;
}

export function planCombatTurn(env: DecisionEnv): Decision | null {
  // SL_RETRY_EXPLORE_ANCHOR (env.slRecord, a first attempt): the points recorded the same way, nothing else.
  const explore = env.sl?.explore !== undefined || env.slRecord !== undefined;
  if (explore) {
    slCommitted = null;
    slAvoidFailed = null;
    slReplayedCode = null;
  }
  let decision = withMechFallback(env, (mechEnv) => withSlRetryFallback(mechEnv, (planEnv) => guardSandpit(planEnv, planTurn(planEnv))));
  // SL_RETRY_EXPLORE: code's own line on this board, for the attempt's record (an error: not recorded). SL_RETRY_EXPLORE_CANON
  // / _TURN (env.sl.explore.played): with its turn's plays.
  if (explore && decision?.kind === "act" && CODE_POINTS.has(decision.label) && slCommitted) {
    try {
      const steps = (slCommitted as Plan).steps;
      const keys = turnKeys((env.sl?.explore ?? env.slRecord)?.played, steps);
      // SL_RETRY_EXPLORE_WHOLE: the line ends the deviation's turn as a failed one and the avoid could not act: the decision
      // row says so (sl_explore.avoid_failed), and the point carries it to the attempt's deviation.
      const failed = slAvoidFailed && slAvoidFailed.plan === slCommitted ? { line: lineText(steps), reason: slAvoidFailed.reason } : null;
      if (failed) {
        const avoid = env.sl?.explore?.avoid;
        decision = { ...decision, log: { ...(decision.log ?? {}), sl_explore: { avoid_failed: { point: avoid?.point ?? null, played_in: avoid?.attempts ?? [], ...failed, ...(keys.canon !== undefined ? { turn: keys.canon } : {}) } } } };
      }
      // SL_RETRY_EXPLORE_REPLAY_CODE: code's line gave way to the reference's logged plays (the row and the point say so).
      const replayed = slReplayedCode && slReplayedCode.plan === slCommitted ? slReplayedCode : null;
      if (replayed) decision = { ...decision, log: { ...(decision.log ?? {}), sl_explore: { replay: { ...replayed.log } } } };
      slPoints.set(decision, { kind: "code", label: decision.label, line: lineText(steps), ...(keys.canon !== undefined ? { canon: { [lineText(steps)]: keys.canon } } : {}), ...(failed ? { avoidFailed: failed } : {}), ...(replayed ? { replay: { overridden: true, reason: replayed.reason, logged: true as const } } : {}) });
    } catch {
      // not recorded
    }
  } else if (explore && decision?.kind === "act" && decision.intent.action === "end_turn" && env.sl?.explore?.whole === true && env.sl.explore.avoid && env.sl.explore.played) {
    // SL_RETRY_EXPLORE_WHOLE: the turn ended with no line to choose (no card to play) while its plays so far are a failed
    // attempt's turn there: said too (no decision point: only the row and the deviation).
    try {
      const avoid = env.sl.explore.avoid;
      const keys = turnKeys(env.sl.explore.played, []);
      if (triedHas(avoid.tried, { text: "", ...keys })) {
        const failed = { line: "end turn", reason: "nothing can be played this turn" };
        decision = { ...decision, log: { ...(decision.log ?? {}), sl_explore: { avoid_failed: { point: avoid.point, played_in: avoid.attempts, ...failed, ...(keys.canon !== undefined ? { turn: keys.canon } : {}) } } } };
        slAvoidFails.set(decision, failed);
      }
    } catch {
      // not said
    }
  }
  return decision;
}

/** SL_RETRY_EXPLORE_WHOLE: an end of turn with nothing to play that ends the deviation's turn as a failed one (planCombatTurn). */
const slAvoidFails = new WeakMap<object, { line: string; reason: string }>();

/**
 * SL_RETRY_EXPLORE_WHOLE: the decision's line ends the deviation's turn as a failed attempt's and the avoid could not act
 * (code's own line, a question's answer: the point's avoidFailed; an end of turn with nothing to play), as the controller
 * records it on the attempt's deviation.
 */
export function slAvoidFailedOf(decision: Decision, resolved: ResolvedAction): { line: string; reason: string } | undefined {
  return slPointOf(decision, resolved)?.avoidFailed ?? slAvoidFails.get(decision);
}

/** SL_RETRY_EXPLORE_CANON: a line's step as the turn's canonical form has it (explore.ts playKey): the card or potion id, its target's name. */
export function stepPlay(step: Step): string {
  if (step.cardId.startsWith("POTION:")) return playKey({ potion: step.cardId.split(":")[1] ?? "" }, step.targetName);
  const card = step.pileCard ?? { cardId: step.cardId, upgraded: step.upgraded };
  return playKey({ card: card.cardId, upgraded: card.upgraded }, step.targetName);
}

/**
 * SL_RETRY_EXPLORE_REPLAY_PLAYS: a reference attempt's logged plays (playKey: the card's id with "+", "potion:<id>", then ">"
 * and the target by the options' name) as a line of this board: each play the solver input's card (or potion) of that id
 * and upgrade not taken by an earlier play, aimed at the living enemy of that name, the whole played from the turn's start
 * as the solver scores a line (replaySteps). Null when a play has no card or enemy here, cannot be played (energy, a target
 * gone), or the line's plays come out otherwise; an empty list is ending the turn.
 */
export function loggedLine(input: SolverInput, plays: readonly string[]): Plan | null {
  const used = new Set<number>();
  const steps: Step[] = [];
  for (const play of plays) {
    const at = play.indexOf(">");
    const what = at < 0 ? play : play.slice(0, at);
    const targetName = at < 0 ? null : play.slice(at + 1);
    const potion = what.startsWith("potion:") ? what.slice("potion:".length) : null;
    const upgraded = potion === null && what.endsWith("+");
    const id = potion ?? (upgraded ? what.slice(0, -1) : what);
    const card = input.hand.find((entry) => !used.has(entry.index) && (potion !== null ? entry.type === "Potion" && entry.cardId.split(":")[1] === potion : entry.type !== "Potion" && entry.cardId === id && entry.upgraded === upgraded));
    if (!card) return null;
    const enemy = targetName === null ? null : input.enemies.find((other) => other.name === targetName);
    if (targetName !== null && !enemy) return null;
    used.add(card.index);
    steps.push({ cardIndex: card.index, cardId: card.cardId, upgraded: card.upgraded, name: card.name, target: enemy?.index ?? null, targetName: enemy?.name ?? null });
  }
  const plan = replaySteps(input, steps);
  if (!plan || plan.steps.length !== plays.length || plan.steps.some((step, i) => stepPlay(step) !== plays[i])) return null;
  return plan;
}

/**
 * SL_RETRY_EXPLORE_CANON / _TURN: the turn a line ends with if it is played (the plays already made this turn, `played`, and
 * the line's): its canonical key (turnCanon over playKey) and the same as an attempt's summary writes it (rows from before
 * the record). None without `played` (both off).
 */
export function turnKeys(played: SlExploreEnv["played"], steps: readonly Step[], extra?: { canon: string; text: string }): { canon?: string; loose?: string } {
  if (!played) return {};
  return {
    canon: turnCanon([...played.canon, ...steps.map(stepPlay), ...(extra ? [extra.canon] : [])]),
    loose: turnCanon([...played.text, ...steps.map((step) => summaryPlay({ name: step.name, targetName: step.targetName, potion: step.cardId.startsWith("POTION:") })), ...(extra ? [extra.text] : [])]),
  };
}

/**
 * SL_RETRY_EXPLORE_REPLAY_ORDER / _CODE: whether a line from this board plays the reference's logged plays from it (`plays`,
 * up to its next decision) as the reference did: they are the line's first plays, in that order, and the line stops there
 * (it ends, or the last of them draws, so the plan is re-planned after it as the reference's was). A longer line would go on
 * past the reference's next decision on its own (plan-continue) and leave the path.
 */
export function followsPlays(steps: readonly Step[], plays: readonly string[], hand: readonly CardModel[]): boolean {
  const order = steps.map(stepPlay);
  if (!plays.every((play, i) => order[i] === play)) return false;
  if (order.length === plays.length) return true;
  if (plays.length === 0) return false;
  const last = steps[plays.length - 1]!;
  if (last.cardId.startsWith("POTION:")) return false;
  const card = cardFor(last, hand as CardModel[]);
  return card !== undefined && drawsCards(card);
}

/**
 * SL_RETRY_EXPLORE_WHOLE (explore.ts mayRepeat): whether a line draws before its turn is over, and the plays sure to be made
 * (`committed`, turnCanon: the plays already made this turn, `played`, and the line's up to and with its first card that
 * draws; all of them when none draws). A card that draws ends the committed line there: the plan is re-planned after it
 * (combat-plan plan-continue stops at a drawing card). A potion option (`extra`: drink it, then re-plan) is open with its
 * drink. None without `played`.
 */
export function turnOpen(played: SlExploreEnv["played"], steps: readonly Step[], hand: readonly CardModel[], extra?: { canon: string }): { open?: boolean; committed?: string } {
  if (!played) return {};
  if (extra) return { open: true, committed: turnCanon([...played.canon, ...steps.map(stepPlay), extra.canon]) };
  const at = steps.findIndex((step) => {
    if (step.cardId.startsWith("POTION:")) return false;
    const card = cardFor(step, hand as CardModel[]);
    return card !== undefined && drawsCards(card);
  });
  const sure = at < 0 ? steps : steps.slice(0, at + 1);
  return { open: at >= 0, committed: turnCanon([...played.canon, ...sure.map(stepPlay)]) };
}

/**
 * SL_RETRY_EXPLORE (docs/sl.md §11, src/sl/explore.ts): the line a decision chose, as the SL controller records it for the
 * attempt (slPointOf), by the decision object (code's own line) or the resolution it played (a question's). Kept beside
 * them, not on them: the decision and its log row are as before. Only on an SL retry with the switch on (env.sl.explore).
 */
export type SlPointInfo = Pick<SlPoint, "kind" | "label" | "line" | "alternatives" | "dead" | "b2" | "explored" | "canon"> & {
  /** On the deviation point's board: what came of it (the line about to be played, its replacement, why). */
  deviation?: { original: string; replacement: string | null; reason: string };
  /**
   * SL_RETRY_EXPLORE_REPLAY, a board before the deviation point: whether the reference line replaced the answer, and why (not);
   * `logged` (SL_RETRY_EXPLORE_REPLAY_PLAYS): the line played is the reference attempt's logged plays from this board.
   */
  replay?: { overridden: boolean; reason: string; logged?: true };
  /** SL_RETRY_EXPLORE_TURN, later in the deviation's turn: the answer, what replaced it (null: kept), why. */
  avoided?: { original: string; replacement: string | null; reason: string };
  /**
   * SL_RETRY_EXPLORE_WHOLE, later in the deviation's turn: the line played ends the turn as a failed attempt's and the avoid
   * could not change it (why). The controller adds it to the attempt's deviation (`avoidFailed`).
   */
  avoidFailed?: { line: string; reason: string };
};
const slPoints = new WeakMap<object, SlPointInfo>();
/** The line the last commit() made (planCombatTurn reads it for code's own decision). */
let slCommitted: Plan | null = null;
/** SL_RETRY_EXPLORE_WHOLE: code's own line about to be played ends the deviation's turn as a failed one (planCombatTurn logs it). */
let slAvoidFailed: { plan: Plan; reason: string } | null = null;
/** SL_RETRY_EXPLORE_REPLAY_CODE: the reference's logged plays code played instead of its own line (planCombatTurn logs it). */
let slReplayedCode: { plan: Plan; reason: string; log: Record<string, JsonValue> } | null = null;
/** Code's decisions that choose a line (code plays it: the only line, a dominating one, a lethal, every line dying...). */
const CODE_POINTS = new Set(["combat/plan", "combat/plan-guarded", "combat/lethal", "combat/least-loss", "combat/mod-lethal"]);

/** The line `resolved` (a question's resolution) or `decision` (code's own) chose, when SL_RETRY_EXPLORE noted it. */
export function slPointOf(decision: Decision, resolved: ResolvedAction): SlPointInfo | undefined {
  return slPoints.get(resolved) ?? slPoints.get(decision);
}

/**
 * SL_RETRY_KNOWN_DRAWS / SL_RETRY_COMPUTE fail safe (docs/sl.md §10): `plan` with the retry's known draws and compute, and
 * when that throws, again without them (the decision as with both switches off; an error of something else throws there
 * again, as it did before them). Neither on this board: `plan` once, as it was.
 */
export function withSlRetryFallback<T>(env: DecisionEnv, plan: (env: DecisionEnv) => T): T {
  const sl = env.sl;
  if (!sl || (sl.knownDraws === undefined && sl.compute === undefined)) return plan(env);
  try {
    return plan(env);
  } catch {
    const { knownDraws: _known, compute: _compute, ...plain } = sl;
    return plan({ ...env, sl: plain });
  }
}

/**
 * The SL judge's facts about a least-loss decision (docs/sl.md §2, src/sl/judge.ts LeastLossFacts), by the decision object
 * this planner returned. Kept beside the decision, not on it: the decision (its log row, the pinned digests) is as before.
 */
const leastLossFacts = new WeakMap<Decision, LeastLossFacts>();

/** The facts of a least-loss decision this planner returned (undefined: none, or they could not be worked out). */
export function leastLossFactsOf(decision: Decision | null | undefined): LeastLossFacts | undefined {
  return decision ? leastLossFacts.get(decision) : undefined;
}

/**
 * SL_JUDGE_ANY_DRAW (docs/sl.md §2.3): the bound over every draw of a least-loss decision, by its facts (beside them, as the
 * facts beside the decision). Worked out once, and only when the judge asks for it (a playable card's draws would veto the
 * verdict, the switch on): otherwise it costs nothing.
 */
const drawBounds = new WeakMap<LeastLossFacts, () => DrawBound>();

/** The any-draw bound of a least-loss decision's facts (undefined: none recorded). Its solves run once, on the first call. */
export function drawBoundOf(facts: LeastLossFacts | undefined): (() => DrawBound) | undefined {
  return facts ? drawBounds.get(facts) : undefined;
}

/** Records a least-loss decision's facts (and its any-draw bound, lazily); an error records none (the judge then decides as without them). */
function noteLeastLoss(decision: Decision, facts: () => LeastLossFacts, bound?: () => DrawBound): void {
  try {
    const noted = facts();
    leastLossFacts.set(decision, noted);
    if (bound) {
      let memo: DrawBound | undefined;
      drawBounds.set(noted, () => (memo ??= bound()));
    }
  } catch {
    // no facts: the judge's vetoes stand
  }
}

/** Specials whose outcome is a draw of chance (potions' samples, Thrash's pick among several Attacks). */
const RANDOM_SPECIALS = new Set(["thrash", "gamble", "chaos", "snecko", "glowwater", "bottled"]);
/** Card text that draws or touches the draw pile (the judge's own DRAWS), and text about the draw pile itself. */
const DRAW_TEXT = /抽|draw/i;
const PILE_TEXT = /抽牌堆|draw pile/i;

/**
 * What about a card the lines may play leaves the turn to chance or to what the planner does not model (null: nothing). A
 * random enemy is no chance with one enemy to hit (`targets`; sl/random-target.ts: Sword Boomerang against a lone boss).
 */
function cardChance(card: CardModel, targets: number): string | null {
  if (!card.known) return `${card.name} is not modelled`;
  const randomText = /随机|random/i.test(card.text);
  const loneTarget = targets <= 1 && (!randomText || randomTargetOnly(card.text));
  if ((card.target === "random" && !loneTarget) || card.randomExhaust === true || RANDOM_SPECIALS.has(card.special ?? "") || (randomText && !loneTarget)) return `${card.name} has a random effect`;
  if ((card.playsTop ?? 0) > 0 || card.generates !== undefined || card.choices !== undefined || card.adds !== undefined) return `${card.name} plays or makes a card nobody knows`;
  if (card.drawsUntil === true) return `${card.name} draws an unknown number of cards`;
  return null;
}

/**
 * The least-loss verdict's facts for the SL judge (src/sl/judge.ts LeastLossFacts; Dai 2026-10-02: certain death, never
 * a prediction, so anything left to chance this turn keeps the end_turn judgment):
 * - drawsKnown (SL_JUDGE_KNOWN_DRAWS): every card any simulated line could draw is exactly known: the solver drew the
 *   retry's known cards and none past them or past their exact part (none resting on the added-cards model), its search
 *   not cut short; every playable card whose text draws is a plain draw (a count, nothing about the draw pile itself:
 *   not Headbutt, Havoc, Metamorphosis); no potion in the solve and no random potion draws.
 * - chance (SL_RELOAD_EARLY): the first thing that leaves the all-lines-die verdict to chance: a random potion (its Monte
 *   Carlo), a draw not exactly known, a playable card (hand, modelled potion, known draw) with a random effect, an
 *   unmodelled one, Juggernaut's, Kusarigama's or Hellraiser's random hits. A random enemy with `targets` 1 (one living
 *   enemy to hit) is certain (ops 2026-10-02, X7BX5DYHFZ3N F48: Juggernaut against the lone boss kept the early reload off).
 */
function leastLossFactsFor(
  line: Plan,
  solved: { truncated: boolean; drewUnknown?: true; knownDepth?: number; drew?: true },
  input: SolverInput | null,
  knownTop: { cards: CardModel[]; added: number[] } | null,
  exact: number | undefined,
  hand: CardModel[],
  player: PlayerSim,
  randomPotions: readonly PotionMcSource[],
  targets: number,
): LeastLossFacts {
  const solverHand = input?.hand ?? hand;
  const knownUsed = knownTop !== null && knownTop.added.length === 0 && input?.knownTop !== undefined ? knownTop.cards.length : 0;
  const exactUsed = Math.min(knownUsed, exact ?? knownUsed);
  const depth = solved.knownDepth ?? 0;
  const drawnKnown = knownTop?.cards.slice(0, Math.min(depth, knownUsed)) ?? [];
  const playable = [...solverHand.filter((card) => card.playable || card.type === "Potion"), ...drawnKnown];
  const pileCard = playable.find((card) => card.type !== "Potion" && DRAW_TEXT.test(card.text) && (card.draw <= 0 || card.drawsUntil === true || PILE_TEXT.test(card.text)));
  const potionDraws = solverHand.some((card) => card.type === "Potion" && (card.draw > 0 || card.drawsUntil === true || card.generates !== undefined || RANDOM_SPECIALS.has(card.special ?? "")));
  const drawsKnown =
    exactUsed > 0 && !solved.truncated && solved.drewUnknown !== true && depth <= exactUsed && pileCard === undefined && !potionDraws && !randomPotions.some((source) => source.kind === "draw");
  const draws = solved.drew === true;
  let chance: string | null = null;
  if (randomPotions.length > 0) chance = `a random potion (${randomPotions.map((source) => source.name).join(", ")}): its samples`;
  else if (draws && !drawsKnown) chance = "a line draws cards not exactly known";
  else {
    for (const card of playable) {
      chance = cardChance(card, targets);
      if (chance) break;
    }
  }
  const several = targets > 1;
  if (chance === null && several && (player.juggernaut ?? 0) > 0) chance = "Juggernaut hits a random enemy";
  if (chance === null && several && player.kusarigama && playable.some((card) => card.type === "Attack")) chance = "Kusarigama hits a random enemy";
  if (chance === null && several && player.hellraiser === true && draws) chance = "Hellraiser plays a drawn Strike at a random enemy";
  return { knownDraws: exactUsed, drawsKnown, draws, line: line.steps.map(stepText), chance };
}

/** The solver index of the first card of the superset board's draw pile (SL_JUDGE_ANY_DRAW): past the known draws (700) and the piles (900+). */
export const ANY_DRAW_INDEX = 2_000;
/**
 * The any-draw bound's limits (tests and offline tools may change them): each solve's node limit, and the time both solves
 * may take together (ANY_DRAW_BUDGET_MS live). Over either: no bound.
 */
export const anyDrawOptions = { maxNodes: 150_000, budgetMs: ANY_DRAW_BUDGET_MS };
/** A card's text about the hand (reading it, changing it, putting cards into it). */
const HAND_TEXT = /手牌|your hand|in hand|into hand/i;
/** A card's or power's text acting when a card is drawn (Kingly Punch, Speedster, Void, Corrosive Wave). */
const ON_DRAW_TEXT = /抽到|when (?:this card is )?drawn|whenever you draw|draw a card/i;
/** Text that may heal us or keep an HP loss off before a card's own cost lands (an unmodelled one keeps a death open). */
const HP_SAVE_TEXT = /回复|恢复|治疗|heal|缓冲|buffer|无实体|intangible|最大生命|max hp/i;
/** Specials whose effect reads the whole hand or picks from it (more cards in it change what they do). */
const HAND_SPECIALS = new Set(["thrash", "fiend_fire", "second_wind", "primal_force", "free_card", "gamble", "snecko", "glowwater", "bottled", "ashwater", "chaos"]);
/** Powers acting on draws that the superset board may leave out without harm: Hellraiser's Strikes (the solver plays them), Chains of Binding (only takes). */
const ON_DRAW_KNOWN = new Set(["HELLRAISER_POWER", "CHAINS_OF_BINDING_POWER"]);

/**
 * Why a card the lines may play once the draw pile is in the hand is not simulated exactly there (null: it is): an unmodelled
 * or random one, one making or playing cards, one reading or changing the hand or the draw pile (more cards in the hand
 * change what it does), one acting when drawn. A random enemy with one enemy to hit is no chance (cardChance).
 */
export function anyDrawInexact(card: CardModel, targets: number): string | null {
  if (!card.known) return `${card.name} is not modelled`;
  const randomText = /随机|random/i.test(card.text);
  const loneTarget = targets <= 1 && (!randomText || randomTargetOnly(card.text));
  if ((card.target === "random" && !loneTarget) || card.randomExhaust === true || RANDOM_SPECIALS.has(card.special ?? "") || (randomText && !loneTarget)) return `${card.name} has a random effect`;
  if ((card.playsTop ?? 0) > 0 || card.generates !== undefined || card.choices !== undefined || card.adds !== undefined) return `${card.name} plays or makes a card`;
  if (HAND_TEXT.test(card.text) || HAND_SPECIALS.has(card.special ?? "") || SOLVER_EXHAUST_PICKERS.has(card.cardId) || EXHAUST_HAND.has(card.cardId) || card.discards !== undefined) return `${card.name} reads or changes the hand`;
  if (PILE_TEXT.test(card.text) || card.putsOnTop === true) return `${card.name} touches the draw pile`;
  if (ON_DRAW_TEXT.test(card.text)) return `${card.name} acts on draws`;
  // A heal, max HP or Buffer the solver does not simulate (its own: Blood Potion's heal, Lucky Tonic's Buffer).
  if (HP_SAVE_TEXT.test(card.text) && card.special !== "heal" && card.special !== "buffer") return `${card.name} may heal or shield us beyond the planner's model`;
  return null;
}

/** What else than the draws leaves a least-loss verdict to chance (leastLossFactsFor's `chance` without its draw clauses). */
function chanceBesidesDraws(playable: CardModel[], player: PlayerSim, randomPotions: readonly PotionMcSource[], targets: number): string | null {
  if (randomPotions.length > 0) return `a random potion (${randomPotions.map((source) => source.name).join(", ")}): its samples`;
  for (const card of playable) {
    const chance = cardChance({ ...card, drawsUntil: false }, targets);
    if (chance) return chance;
  }
  const several = targets > 1;
  if (several && (player.juggernaut ?? 0) > 0) return "Juggernaut hits a random enemy";
  if (several && player.kusarigama && playable.some((card) => card.type === "Attack")) return "Kusarigama hits a random enemy";
  return null;
}

/** The numbers of a card text (its rules after the name and cost), as a sorted list. */
function textNumbers(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map((match) => Number(match[0])).sort((a, b) => a - b);
}

/**
 * A draw pile card as it is now (the line's numbers: a card's own growth, Perfected Strike's Strikes, a Defend's permanent
 * block, which the deck entry need not show; NJSZDS6U5X9G F25 T9: Perfected Strike 6 in the deck, 18 in the pile, killed
 * the Beetle), on the board (Strength and Weak as the hand cards, Dexterity added to its block). Each number the higher
 * of the two (a bound may only help a line); `differs` when the line has other numbers than the deck's text.
 */
export function pileCardNow(entry: PileEntry, ctx: { strength: number; weak: boolean; dexterity: number }): { card: CardModel; differs: boolean } {
  const body = entry.line.replace(/^[^：:]*[：:]/, "");
  const raw = entry.raw;
  const damage = /造成(\d+)点伤害|deal (\d+) damage/i.exec(body);
  const hits = /造成\d+点伤害(\d+)次|deal \d+ damage (\d+) times/i.exec(body);
  const block = /获得(\d+)点格挡|gain (\d+) block/i.exec(body);
  const lineDamage = damage ? Number(damage[1] ?? damage[2]) : null;
  const lineHits = hits ? Number(hits[1] ?? hits[2]) : null;
  const lineBlock = block ? Number(block[1] ?? block[2]) : null;
  const rawDamage = raw.damage === null ? lineDamage : Math.max(raw.damage, lineDamage ?? 0);
  const card: CardModel = {
    ...entry.card,
    damage: rawDamage === null ? null : Math.floor((rawDamage + ctx.strength) * (ctx.weak ? 0.75 : 1)),
    hits: Math.max(entry.card.hits, lineHits ?? 0),
    block: Math.max(raw.block, lineBlock ?? 0) + (Math.max(raw.block, lineBlock ?? 0) > 0 ? Math.max(0, ctx.dexterity) : 0),
  };
  // Other numbers (Vulnerable, Strength, a draw count, an HP cost) the line shows differently from the deck's text.
  const drop = (numbers: number[], ...gone: (number | null)[]) => {
    const left = [...numbers];
    for (const value of gone) {
      if (value === null) continue;
      const at = left.indexOf(value);
      if (at >= 0) left.splice(at, 1);
    }
    return left.join(",");
  };
  const deckText = raw.text;
  const deckDamage = /造成(\d+)点伤害|deal (\d+) damage/i.exec(deckText);
  const deckHits = /造成\d+点伤害(\d+)次|deal \d+ damage (\d+) times/i.exec(deckText);
  const deckBlock = /获得(\d+)点格挡|gain (\d+) block/i.exec(deckText);
  const numOf = (match: RegExpExecArray | null) => (match ? Number(match[1] ?? match[2]) : null);
  const differs = drop(textNumbers(body), lineDamage, lineHits, lineBlock) !== drop(textNumbers(deckText), numOf(deckDamage), numOf(deckHits), numOf(deckBlock));
  return { card, differs };
}

/**
 * Why a draw pile card is not simulated exactly on the superset board (null: it is): anyDrawInexact's reasons, an
 * enchantment, numbers in the pile other than the deck entry's (beyond the damage, hits and block pileCardNow takes the
 * higher of), a number worked out in play (Perfected Strike; Body Slam's the solver works out), a relic changing it.
 */
export function pileCardInexact(entry: PileEntry, current: { differs: boolean }, targets: number, relicIds: readonly string[], knowledge?: Pick<Knowledge, "card">): string | null {
  const card = entry.card;
  const relic = relicIds.find((id) => CARD_NUMBER_RELICS[id]?.(card) === true);
  return (
    anyDrawInexact(card, targets) ??
    // A card whose effect is set per copy (Mad Science: 「？？？？？？」 in the game data, its numbers for every mode).
    (/？？|\?\?\?/.test(knowledge?.card(card.cardId)?.description ?? "") ? `${card.name}'s effect is set per card` : null) ??
    (entry.mods.some((mod) => /enchant/i.test(mod)) ? `${card.name} is enchanted` : null) ??
    (current.differs ? `${card.name}'s numbers in the pile differ from the deck's` : null) ??
    (entry.calculated && card.special !== "body_slam" ? `${card.name}'s number is worked out in play` : null) ??
    (relic ? `${relic} changes ${card.name}` : null)
  );
}

/**
 * A draw pile card's cost for the superset board: the lowest of the line's (the card in the pile now), the deck entry's and
 * the game data's (a cost grown in the fight, Frantic Escape's, may be lower once drawn; a bound may only help a line).
 */
export function pileCardCost(entry: PileEntry, knowledge: Knowledge, relicIds: readonly string[] = []): number {
  const card = entry.card;
  if (card.xCost) return card.cost;
  // Jeweled Mask: a Power it took into the hand at the fight's start stays free for the fight (back in the pile after a
  // discard, its line still shows its cost; 8L29N792FA45, GWGTNXPWS7PE): any Power may be that one.
  if (relicIds.includes("JEWELED_MASK") && card.type === "Power") return 0;
  const data = knowledge.card(card.cardId)?.cost;
  // The game data's cost with Spiked Gauntlets' +1 on a Power: no Power costs less under it (pilePowerExtraCost).
  const base = typeof data === "number" && data >= 0 ? withPowerExtraCost({ type: card.type, xCost: false, cost: data }, pilePowerExtraCost(relicIds)).cost : card.cost;
  return Math.min(card.cost, entry.lineCost ?? card.cost, base);
}

/** Player powers that only lower the cards' numbers in the hand (Frail's block): the pile's higher ones can only help a line. */
const NUMBER_LOWERING_POWERS = new Set(["FRAIL_POWER"]);

/**
 * Relics that change what some cards do in ways neither the pile's models nor the solver count (the hand may show them):
 * which cards. With one held, such a card in the pile is not simulated exactly on the superset board.
 */
const CARD_NUMBER_RELICS: Record<string, (card: CardModel) => boolean> = {
  STRIKE_DUMMY: (card) => isStrikeCard(card),
  FAKE_STRIKE_DUMMY: (card) => isStrikeCard(card),
  MINIATURE_CANNON: (card) => card.type === "Attack" && card.upgraded,
  MYSTIC_LIGHTER: (card) => card.type === "Attack",
  CHEMICAL_X: (card) => card.xCost,
  // Pael's Legion doubles one card's Block; Vitruvian Minion doubles the Minion cards; Paper Krane makes Weak take 40%.
  PAELS_LEGION: (card) => card.block > 0,
  VITRUVIAN_MINION: (card) => card.name.includes("仆从") || /minion/i.test(card.name),
  PAPER_KRANE: (card) => card.weak > 0,
  // Ghost Seed makes Strikes and Defends Ethereal: Feel No Pain's block for them when held.
  GHOST_SEED: (card) => isStrikeCard(card) || /DEFEND/.test(card.cardId),
  // Reptile Trinket: Strength when a potion is drunk (a line drinking one after the draw).
  REPTILE_TRINKET: () => true,
};

interface AnyDrawContext {
  /** The solver input behind the least-loss verdict (the hand with the modelled potions, the player, the enemies). */
  input: SolverInput;
  state: GameState;
  knowledge: Knowledge;
  pileContext: { enemyTargets: number[]; strength: number; weak: boolean };
  /** Living enemies a random target can land on (random-target.ts). */
  targets: number;
  /** Fiddle or No Draw: the planner zeroed every draw. */
  noDraw: boolean;
  relicIds: string[];
  /** The random potions (their Monte Carlo is not redone on the superset board). */
  randomPotions: readonly PotionMcSource[];
}

/**
 * SL_JUDGE_ANY_DRAW (docs/sl.md §2.3; the judge: src/sl/judge.ts anyDrawJudged): whether the least-loss verdict's death
 * holds for every draw this turn could make. The draw pile's order is unknown, its cards are not (the state lists them):
 * 1. Nothing to draw (Fiddle, No Draw): the planner's lines drew nothing.
 * 2. `fatal` (ops 2026-10-03, R764HJWMJQ3V F33 T10: 5 HP, Offering's 6 in hand, vetoed as "draws"): every drawing card's own
 *    HP cost (card-model hpLoss, its resolved amount) comes before its draw and reaches our HP (Tungsten Rod's 1 off), no
 *    other playable card or potion has text that may heal or shield us first beyond what the solver models, Beating
 *    Remnant not held, and the board solved again with those cards watched finds no line with HP left right after one
 *    (the solver's loseHp: Buffer, Demon Tongue; lines ended by our death not extended).
 * 3. `superset`: the board solved again with the drawing cards (and the modelled potions that draw) putting every card of
 *    the draw pile into the hand on their play, each at its cost (the line's), the hand limit lifted, their draw counts 0,
 *    every other effect and limit as they were. Any real draw is a part of that hand after the same play, so every line
 *    dying there means every line dies with any draw. Statuses and curses that only hurt when drawn (a held penalty, an
 *    energy loss) are left out, unless Feel No Pain or Cloak Clasp could turn them into block (no bound). No bound with a
 *    random potion, Dark Embrace, Tungsten Rod or Beating Remnant (the solver's own HP losses are not exact then), a card
 *    that may give Intangible, a power acting on draws, a pile not listed. What the superset board does not simulate
 *    exactly (anyDrawInexact; a draw that may reach the reshuffle) is listed in `inexact`: the judge then also needs no line
 *    with HP left after a draw.
 * Each solve: lines ended by our own death are not extended, a node limit and a shared time limit (ANY_DRAW_BUDGET_MS).
 */
export function anyDrawBound(ctx: AnyDrawContext): DrawBound {
  const started = Date.now();
  const deadline = started + anyDrawOptions.budgetMs;
  const { input } = ctx;
  const playable = input.hand.filter((card) => card.playable || card.type === "Potion");
  const drawers = playable.filter((card) => drawsCards(card) || DRAW_TEXT.test(card.text));
  const chance = chanceBesidesDraws(playable, input.player, ctx.randomPotions, ctx.targets);
  const base = { drawing: drawers.map((card) => card.name), chance };
  const done = (bound: Omit<DrawBound, "drawing" | "chance" | "ms">): DrawBound => ({ ...base, ...bound, ms: Date.now() - started });
  if (drawers.length === 0) return done({ refused: "no playable card or potion that draws in the planner's hand" });
  if (ctx.noDraw) {
    // Only draws are stopped: a card taking from a pile, or acting on what it draws, is not a plain draw.
    const notPlain = drawers.find((card) => PILE_TEXT.test(card.text) || HAND_TEXT.test(card.text) || ON_DRAW_TEXT.test(card.text));
    if (notPlain) return done({ refused: `${notPlain.name} is not a plain draw (No Draw may not stop it)` });
    return done({ refused: null, noDraw: ctx.relicIds.includes("FIDDLE") ? "Fiddle" : "No Draw" });
  }
  const player = asRecord(asRecord(ctx.state.raw["combat"])["player"]);
  const hp = input.player.hp;
  const rod = ctx.relicIds.includes("TUNGSTEN_ROD");
  if (ctx.relicIds.includes("BEATING_REMNANT")) return done({ refused: "Beating Remnant caps the HP lost this turn: the solver's own-turn losses are not exact" });
  const intangible = [...playable].find((card) => card.special === "intangible");
  if (intangible) return done({ refused: `${intangible.name} may give Intangible (the solver does not cap an HP loss with it)` });

  // 2. Every drawing card's own cost kills before it draws.
  const watch = new Set(drawers.map((card) => card.index));
  const solveWith = (extra: Partial<SolverInput>) => solveTurn({ ...input, stopAtOwnDeath: true, stopOnLive: true, watch, deadline, maxNodes: anyDrawOptions.maxNodes, ...extra });
  const others = playable.filter((card) => !watch.has(card.index));
  // Blood Potion's heal and Lucky Tonic's Buffer are the solver's; Feed's max HP (and its heal) is not.
  const saver = others.find((card) => HP_SAVE_TEXT.test(card.text) && card.special !== "heal" && card.special !== "buffer");
  const costFirst = (card: CardModel) => {
    const loss = /失去\d+点生命|lose \d+ hp/i.exec(card.text);
    const draw = /抽|draw/i.exec(card.text);
    return loss !== null && (draw === null || loss.index < draw.index);
  };
  const ownKill = drawers.every((card) => card.type !== "Potion" && card.hpLoss - (rod ? 1 : 0) >= hp && costFirst(card));
  if (ownKill && !saver) {
    const solved = solveWith({});
    if (!solved.truncated && solved.lives !== true && solved.plans.every((plan) => plan.outcome.dies) && (solved.watchedAlive ?? []).length === 0) {
      return done({ refused: null, fatal: drawers.map((card) => ({ name: card.name, hpLoss: card.hpLoss })) });
    }
  }

  // 3. The superset board.
  if (ctx.randomPotions.length > 0) return done({ refused: `a random potion (${ctx.randomPotions.map((source) => source.name).join(", ")}): its samples are not redone with every draw` });
  if (rod) return done({ refused: "Tungsten Rod takes 1 off each HP loss: the solver's own-turn losses are not exact" });
  if ((input.player.darkEmbrace ?? 0) > 0 || playable.some((card) => card.cardId === "DARK_EMBRACE")) return done({ refused: "Dark Embrace draws on exhausts (not through the drawing cards)" });
  for (const power of asArray(player["powers"]).map(asRecord)) {
    const id = str(power["power_id"]);
    if (!ON_DRAW_KNOWN.has(id) && ON_DRAW_TEXT.test(ctx.knowledge.power(id)?.description ?? "")) return done({ refused: `${str(power["name"], id)} acts when a card is drawn` });
  }
  const view = asRecord(asRecord(ctx.state.raw["agent_view"])["combat"]);
  if (!Array.isArray(view["draw"])) return done({ refused: "the draw pile is not listed" });
  const blockWhenHeld = (input.player.feelNoPain ?? 0) > 0 || (input.player.blockPerHeldCard ?? 0) > 0 || playable.some((card) => (card.feelNoPain ?? 0) > 0);
  const now = { strength: ctx.pileContext.strength, weak: ctx.pileContext.weak, dexterity: asArray(player["powers"]).map(asRecord).filter((power) => str(power["power_id"]) === "DEXTERITY_POWER").reduce((sum, power) => sum + num(power["amount"]), 0) };
  // A player power the planner does not read may change the cards' numbers in the hand (and not in the pile's models).
  const numberPowers = asArray(player["powers"])
    .map(asRecord)
    .filter((power) => !MODELLED_POWERS.has(str(power["power_id"])) && !NUMBER_LOWERING_POWERS.has(str(power["power_id"])))
    .filter((power) => {
      const text = ctx.knowledge.power(str(power["power_id"]))?.description ?? "";
      return text === "" || /伤害|格挡|耗能|damage|block|cost/i.test(text);
    })
    .map((power) => str(power["name"], str(power["power_id"])));
  const entries = pileEntries(ctx.state, ctx.knowledge, "draw", ctx.pileContext);
  const drawPile = entries.reduce((sum, entry) => sum + entry.count, 0);
  const inexact: string[] = [];
  const excluded: string[] = [];
  const pool: CardModel[] = [];
  // The most cards this turn's draws could take: past the draw pile, a reshuffle brings back cards the pool does not hold.
  const drawCount = (card: CardModel) => (card.drawsUntil === true || card.draw <= 0 ? HAND_LIMIT : card.draw);
  let maxDraws = drawers.reduce((sum, card) => sum + drawCount(card), 0);
  for (const entry of entries) {
    const card = entry.card;
    const unplayable = !card.playable || card.type === "Status" || card.type === "Curse";
    if (unplayable) {
      const hurts = card.heldPenalty > 0 || (card.heldHpLoss ?? 0) > 0 || HAND_TEXT.test(card.text) || ON_DRAW_TEXT.test(card.text);
      if (hurts && ON_DRAW_TEXT.test(card.text) && !/失去|lose/i.test(card.text)) return done({ refused: `${card.name} in the draw pile acts when drawn` });
      if (hurts && blockWhenHeld) return done({ refused: `${card.name} in the draw pile hurts when drawn, but Feel No Pain or Cloak Clasp may give block for it` });
      if (hurts) {
        // Drawing it can only cost us (a held penalty, an energy loss; a playable one, Beckon, is only got rid of by playing it).
        excluded.push(`${card.name}${entry.count > 1 ? ` x${entry.count}` : ""}`);
        continue;
      }
    }
    const current = pileCardNow(entry, now);
    // A playable status or curse that does not hurt (Slimed) is a card the lines may play like any other.
    const why = card.playable ? pileCardInexact(entry, current, ctx.targets, ctx.relicIds, ctx.knowledge) : null;
    if (why) inexact.push(why);
    if (!unplayable && drawsCards(card)) maxDraws += drawCount(card) * entry.count;
    if (!unplayable && card.draw <= 0 && !card.drawsUntil && DRAW_TEXT.test(card.text) && !PILE_TEXT.test(card.text)) maxDraws += HAND_LIMIT * entry.count;
    const cost = pileCardCost(entry, ctx.knowledge, ctx.relicIds);
    // Unmovable or Vambrace armed: the solver takes every Block card's number as the hand shows it then, doubled (the
    // first one played keeps it, the later ones are halved back): the pile's cards the same way.
    const shown = !unplayable && input.player.unmovableArmed === true && current.card.block > 0 ? { ...current.card, block: current.card.block * 2 } : current.card;
    for (let copy = 0; copy < entry.count; copy += 1) {
      const k = pool.length;
      pool.push({ ...(unplayable ? card : shown), cost, index: ANY_DRAW_INDEX + k, key: `anydraw${k}`, draw: 0, drawsUntil: false });
    }
  }
  if (maxDraws > drawPile) inexact.push(`a draw may reach the reshuffle (up to ${maxDraws} draws, ${drawPile} in the draw pile)`);
  if (numberPowers.length > 0 && pool.length > 0) inexact.push(`${numberPowers.join(", ")} may change the pile cards' numbers`);
  // A random enemy hit with several to hit: the solver takes the worst one (the bound may only help a line).
  const several = ctx.targets > 1;
  if (several && (input.player.hellraiser === true || playable.some((card) => card.cardId === "HELLRAISER"))) inexact.push("Hellraiser plays drawn Strikes at a random enemy");
  if (several && (input.player.juggernaut ?? 0) > 0) inexact.push("Juggernaut hits a random enemy");
  if (several && input.player.kusarigama) inexact.push("Kusarigama hits a random enemy");
  // Vambrace held but not seen armed (no Block card in the hand to show it), Unmovable up with some block already (the
  // planner's proxy for its use): their doubling of the next card Block may be left out.
  const unmovable = asArray(player["powers"]).some((power) => str(asRecord(power)["power_id"]) === "UNMOVABLE_POWER");
  const doubler = ctx.relicIds.includes("VAMBRACE") ? "Vambrace" : unmovable ? "Unmovable" : null;
  // Both up: each may double the same card Block (SMNJTGSHFMME F30 T2: Defend 6 shown as 24), past the solver's one doubling.
  if (doubler && (input.player.unmovableArmed !== true || (unmovable && ctx.relicIds.includes("VAMBRACE"))) && pool.some((card) => card.block > 0)) {
    inexact.push(`${unmovable && ctx.relicIds.includes("VAMBRACE") ? "Vambrace and Unmovable" : doubler} may double the first card Block`);
  }
  for (const card of playable) {
    const why = anyDrawInexact(card, ctx.targets);
    // The drawing cards' own draws are what the superset covers (Pillage's unknown count, a text-only draw).
    if (why && !(watch.has(card.index) && why === `${card.name} draws an unknown number of cards`)) inexact.push(why);
  }
  const hand = input.hand.map((card) => (watch.has(card.index) ? { ...card, draw: 0, drawsUntil: false, drawn: pool } : card));
  const solved = solveTurn({
    ...input,
    hand,
    player: { ...input.player, drawable: pool.length, handLimit: Number.MAX_SAFE_INTEGER },
    knownTop: undefined,
    stopAtOwnDeath: true,
    stopOnLive: true,
    watch,
    deadline,
    maxNodes: anyDrawOptions.maxNodes,
  });
  const aliveAfter = new Set(solved.watchedAlive ?? []);
  return done({
    refused: null,
    superset: {
      cards: pool.length,
      drawPile,
      excluded,
      inexact: [...new Set(inexact)],
      allDie: solved.lives !== true && solved.plans.every((plan) => plan.outcome.dies),
      aliveAfterDraw: [...new Set(drawers.filter((card) => aliveAfter.has(card.index)).map((card) => card.name))],
      truncated: solved.truncated,
      timedOut: solved.timedOut === true,
      nodes: solved.nodes,
    },
  });
}

/** The solver index of the first known draw (SL_RETRY_KNOWN_DRAWS): past the hand, potions' samples, Music Box copies and the whole fight's own known draws (600). */
export const SL_KNOWN_DRAW_INDEX = 700;

/**
 * SL_RETRY_KNOWN_DRAWS: env.sl.knownDraws as this board's pile cards: indices into the draw pile's listing
 * (pileCardModels' order) and the solver's known cards (the board's Strength and Weak in, as the random potions' pile
 * cards; indices from SL_KNOWN_DRAW_INDEX). Null without known draws, or when the pile does not hold them all (never
 * expected: the controller checked the pile), or on any error (the decision as without them).
 */
function slKnownTop(
  env: DecisionEnv,
  state: GameState,
  ctx: { enemyTargets: number[]; strength: number; weak: boolean },
): { indices: number[]; cards: CardModel[]; names: string[]; attempts: number[]; added: number[]; addedNames: string[] } | null {
  const known = env.sl?.knownDraws;
  if (!known || known.cards.length === 0) return null;
  try {
    const pile = pileCardModels(state, env.knowledge, "draw", ctx);
    // SL_RETRY_KNOWN_INSERTS: the cards added at random places, as other cards of the same listing.
    const addedKeys = known.added?.cards ?? [];
    const all = knownTopIndices([...known.cards, ...addedKeys], pile);
    if (!all) return null;
    const indices = all.slice(0, known.cards.length);
    const cards = indices.map((at, k): CardModel => ({ ...pile[at]!, index: SL_KNOWN_DRAW_INDEX + k, key: `known${k}` }));
    return { indices, cards, names: known.names.slice(0, indices.length), attempts: [...known.attempts], added: all.slice(known.cards.length), addedNames: (known.added?.names ?? []).slice(0, addedKeys.length) };
  } catch {
    return null;
  }
}

/** Known cards the question names (the next two hands): the line stays short; the planner uses them all. */
export const KNOWN_DRAWS_NAMED = 10;

/**
 * The question's one fact line about the known draws (SL_RETRY_KNOWN_DRAWS). With cards added to the pile at random places
 * (SL_RETRY_KNOWN_INSERTS, `added`): they come somewhere among the known ones, so only the rollout uses the order.
 */
export function knownDrawsFact(names: readonly string[], attempts: readonly number[], added: readonly string[] = []): string {
  const named = names.slice(0, KNOWN_DRAWS_NAMED).join(", ") + (names.length > KNOWN_DRAWS_NAMED ? ", ..." : "");
  if (added.length > 0) {
    const counts = new Map<string, number>();
    for (const name of added) counts.set(name, (counts.get(name) ?? 0) + 1);
    const addedText = [...counts].map(([name, n]) => (n > 1 ? `${name} x${n}` : name)).join(", ");
    return `SL retry: the next ${names.length} card${names.length === 1 ? "" : "s"} of the draw pile's own, in the order they come (the next first), are known from attempt ${attempts.join(", ")}: ${named}; ${addedText} added to the pile ${added.length === 1 ? "is" : "are"} at random places among them. The rollout draws them so; this turn's options and past them the draws are random.`;
  }
  return `SL retry: the next ${names.length} card${names.length === 1 ? "" : "s"} of the draw pile, in the order they come (the next first), are known from attempt ${attempts.join(", ")}: ${named}. The options' numbers and the rollout draw these first; past them the draws are random.`;
}

/**
 * MECH_RULES fail safe (live play): `plan` with the learned rules on, and when that throws, again as with them off (an
 * error of something else throws there again, as it did before them). The switch off: `plan` once, as it was. With
 * MECH_MOVE_RULES on too, the first retry is with that one off (the move rules and the crab's back attack out, the stun
 * rules kept), then with both off.
 */
export function withMechFallback<T>(env: DecisionEnv, plan: (env: DecisionEnv) => T): T {
  if (env.mechRules === false) return plan(env);
  try {
    return plan(env);
  } catch {
    // MECH_DEATH_MOVE on: first without the death rules (the other learned rules kept).
    if (env.mechDeathMove !== false) {
      try {
        return plan({ ...env, mechDeathMove: false });
      } catch {
        // as with the move rules off too, below
      }
    }
    if (env.mechMoveRules !== false) {
      try {
        return plan({ ...env, mechMoveRules: false, mechDeathMove: false });
      } catch {
        // as with both off, below
      }
    }
    return plan({ ...env, mechRules: false });
  }
}

/** How long a line waits, after its Liquid Memories, for the screen that puts the taken card into the hand. */
const TAKE_WAIT_MS = 4_000;

function planTurn(env: DecisionEnv): Decision | null {
  // The planner's own time (the decision log's `timing`): its wall clock, the process's CPU (the worker threads' too).
  const planStart = performance.now();
  const cpuStart = process.cpuUsage();
  plannerTiming.last = null;
  const { state } = env;
  // Before any early return: the turn's first frame sets the exhaust pile it started with.
  const exhaustedEarlier = exhaustedSinceTurnStart(env);
  const hpLostEarlier = hpLostSinceTurnStart(env);
  const combat = asRecord(state.raw["combat"]);
  const readiness = asRecord(combat["action_readiness"]);
  if (readiness["can_use_combat_actions"] === false) return null;
  if (!state.available_actions.includes("play_card") && !state.available_actions.includes("end_turn")) return null;

  const player = asRecord(combat["player"]);
  if (boulderSettling(env.screenMemory, fightKey(state), state.turn ?? null, powerAmount(player, "ROLLING_BOULDER_POWER"), num(player["cards_played_this_turn"]), Date.now())) return null;
  // Free Attack (Unrelenting): the game shows every attack at 0, but only the next N are free. The
  // solver pays the real cost and gets N free attacks (NEVM F23 T2: an unaffordable Uppercut planned).
  const freeAttacks = powerAmount(player, "FREE_ATTACK_POWER");
  // Shrink on us (the Shrinker Beetle's: always -1, 1448 logged frames): the hand's numbers already carry it.
  const shrunk = powerAmount(player, "SHRINK_POWER") !== 0;
  const hand = asArray(combat["hand"]).map((entry, index) => {
    const modelled = modelHandCard(entry, index, env.knowledge, str(asRecord(state.run?.raw)["character_id"]));
    const model = shrunk && modelled.damage !== null ? { ...modelled, shownShrunk: true } : modelled;
    const base = env.knowledge.card(model.cardId)?.cost ?? null;
    return freeAttacks > 0 && model.type === "Attack" && model.cost === 0 && base !== null && base > 0 ? { ...model, cost: base } : model;
  });
  // Evil Eye doubles when a card was exhausted this turn (with Baking Gloves that is every turn), or
  // earlier in the same line: the solver counts both (turn-solver exhaustedCount).
  const relicIds = asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  const exhaustsEveryTurn = relicIds.includes("TOASTY_MITTENS");
  const exhaustedThisTurn = exhaustsEveryTurn || num(player["cards_exhausted_this_turn"]) > 0 || exhaustedEarlier;
  // Fiddle (and No Draw): nothing can be drawn mid-turn, so draw effects are worth nothing.
  const noDraw = relicIds.includes("FIDDLE") || powerAmount(player, "NO_DRAW_POWER") > 0;
  if (noDraw) {
    for (const card of hand) {
      card.draw = 0;
      card.drawsUntil = false;
    }
  }
  // Pen Nib at 9 doubles every Attack's shown damage but only the next one played (GSG0 F33 T2: 86 planned, 53 dealt);
  // the solver doubles the 10th Attack play from its count. Taken off before Vigor: the doubled number carries it too.
  const penNib = relicIds.includes("PEN_NIB") ? relicStack(state.run?.raw, "PEN_NIB") % PEN_NIB_EVERY : undefined;
  stripPenNib(hand, penNib === PEN_NIB_EVERY - 1);
  // Vigor is in every Attack's shown damage but spent by the first one (KFP1 F17 T1: 54 planned, 18 dealt).
  const vigor = powerAmount(player, "VIGOR_POWER");
  stripVigor(hand, vigor, powerAmount(player, "WEAK_POWER") > 0, shrunk);
  const phantomBlades = powerAmount(player, "PHANTOM_BLADES_POWER");
  const phantomBladesArmed = stripPhantomBlades(hand, phantomBlades, powerAmount(player, "STRENGTH_POWER"), powerAmount(player, "WEAK_POWER") > 0, shrunk);
  const ascension = state.run?.ascension ?? 0;
  const enemies = enemySims(combat, ascension);
  // MECH_RULES (docs/mechanics-learning.md): the learned strip-stun rules on the enemies carrying such a power (the
  // Thieving Hopper's Flutter): a line stripping the last stack cancels its move this turn in the solver and the rollout.
  const mechRules = learnedStunRules(env);
  applyStripStuns(enemies, combat, mechRules);
  // MECH_MOVE_RULES (docs/mechanics-learning.md §8): the learned move changes (an Axebot killed with Stock left comes back
  // in Boot Up, no attack) on the enemies carrying such a power, for the solver, the rollout and the option's fact.
  applyMoveRules(enemies, combat, learnedMoveRules(env), ascension);
  // MECH_DEATH_MOVE (docs/mechanics-learning.md §9): the learned "an ally's death changes my move" rules on the survivors
  // (the Queen once the Torch Head Amalgam dies: Enrage at once, Off With Your Head next turn), for the solver, the rollout
  // and the option's fact.
  applyDeathRules(enemies, combat, learnedDeathRules(env), ascension);
  carryHpLossCaps(env.screenMemory, `${fightKey(state)}:${state.turn ?? "?"}`, enemies);
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

  const legionPreview = paelsLegionPreview(state.run?.raw, combat);
  const firstPowerBlock = permafrostBlock(env.screenMemory, state);
  const playerSim: PlayerSim = {
    ...(firstPowerBlock !== undefined ? { permafrostBlock: firstPowerBlock } : {}),
    freeAttacks,
    exhaustPile: exhaustPileSize(state.raw),
    ...(drawablePileSize(state.raw) !== undefined ? { drawable: drawablePileSize(state.raw) } : {}),
    // A Duplicator drunk earlier this turn: its next card is played twice (11LC F17 T2).
    duplicate: powerAmount(player, "DUPLICATION_POWER"),
    // One-Two Punch played earlier this turn: its next Attack(s) are played an extra time (9Q7V F17 T14).
    duplicateAttacks: powerAmount(player, "ONE_TWO_PUNCH_POWER"),
    // 53FLQ68CETW0 F48 T12: one Skill; VN7RQJMJEFMX F27 T6, silent-0115: the upgrade arms two Skills.
    ...([1, 2].includes(powerAmount(player, "BURST_POWER")) ? { duplicateSkills: powerAmount(player, "BURST_POWER") } : {}),
    regen: powerAmount(player, "REGEN_POWER"),
    // Buffer already up (a Lucky Tonic drunk earlier this turn or before): the next HP losses are prevented.
    buffer: powerAmount(player, "BUFFER_POWER"),
    hp: num(player["current_hp"]),
    maxHp: num(player["max_hp"]),
    block: num(player["block"]),
    energy: num(player["energy"]),
    weak: powerAmount(player, "WEAK_POWER") > 0,
    vulnerable: powerAmount(player, "VULNERABLE_POWER") > 0,
    frail: powerAmount(player, "FRAIL_POWER") > 0,
    dexterityNow: powerAmount(player, "DEXTERITY_POWER"),
    intangible: powerAmount(player, "INTANGIBLE_POWER") > 0,
    // -1 on us, never above 0: `> 0` never turned it on (XC4TNGZU4KT9 F9 T3 planned 16 and a kill, dealt 14).
    shrunk,
    juggernaut: powerAmount(player, "JUGGERNAUT_POWER"),
    kusarigama: kusarigamaOf(state.run?.raw),
    ...(relicIds.includes("SHURIKEN") ? { shuriken: { every: SHURIKEN_ATTACKS, strength: SHURIKEN_STRENGTH, count: relicStack(state.run?.raw, "SHURIKEN") % SHURIKEN_ATTACKS } } : {}),
    // Silent evidence only: CSBR5CRDWQNB F33 attempt 6 T1/T2/T4, ledger silent-0061/0063. Ironclad stays unchanged.
    ...(str(asRecord(state.run?.raw)["character_id"]).toLowerCase() === "silent" && relicIds.includes("DAUGHTER_OF_THE_WIND") ? { daughterWindBlock: 1 } : {}),
    // L704TLETMZBM F48 T3/T4, silent-0193/0194: three Block per observed explicit discard.
    ...(str(asRecord(state.run?.raw)["character_id"]).toLowerCase() === "silent" && relicIds.includes("TOUGH_BANDAGES") ? { toughBandagesBlock: 3 } : {}),
    // Music Box: the turn's first Attack card comes back as an Ethereal copy (armed while none is played yet).
    ...(relicIds.includes("MUSIC_BOX") ? { musicBox: { count: num(player["attacks_played_this_turn"]) } } : {}),
    rage: powerAmount(player, "RAGE_POWER"),
    keepsBlock: powerAmount(player, "BARRICADE_POWER") > 0 || powerAmount(player, "BLUR_POWER") > 0,
    gambit: powerAmount(player, "THE_GAMBIT_POWER") > 0,
    endTurnBlock: powerAmount(player, "PLATING_POWER") + powerAmount(player, "METALLICIZE_POWER"),
    rupture: powerAmount(player, "RUPTURE_POWER"),
    // Sloth caps cards per turn; Disintegration deals its amount at the end of every turn.
    maxPlays: playCap(player),
    // Smoggy: one Skill a turn, less the Skills already played.
    maxSkills: powerAmount(player, "SMOGGY_POWER") > 0 ? Math.max(0, 1 - num(player["skills_played_this_turn"])) : null,
    // Constrict (Slithering Strangler) is the same end-of-turn damage (BHMP F6: 12 HP unpredicted).
    endTurnHpLoss: powerAmount(player, "DISINTEGRATION_POWER") + powerAmount(player, "CONSTRICT_POWER"),
    surrounded: powerAmount(player, "SURROUNDED_POWER") > 0,
    facing: env.screenMemory.facing ?? startFacing(combat),
    // MECH_MOVE_RULES (class C): the back attack only while both claws live (turn-solver PlayerSim.backAttackPair).
    ...(powerAmount(player, "SURROUNDED_POWER") > 0 && mechMoveOn(env) ? { backAttackPair: true } : {}),
    colossus: powerAmount(player, "COLOSSUS_POWER") > 0,
    // Inferno takes 1 HP for each copy up at the start of each turn (and that loss is what makes it hit every enemy; one
    // sweep): two Inferno+ (18) took 2 (C4F14F3XPN0N F33), the planner had counted 1 whatever the copies.
    startTurnHpLoss: startTurnHpLossOf(state, powerAmount(player, "INFERNO_POWER"), powerAmount(player, "CRIMSON_MANTLE_POWER")),
    retaliate: powerAmount(player, "FLAME_BARRIER_POWER") + powerAmount(player, "THORNS_POWER"),
    turnStartAoe: turnStartAoe(relicIds, player),
    ...(relicIds.includes("CLOAK_CLASP") ? { blockPerHeldCard: CLOAK_CLASP_BLOCK } : {}),
    ...(relicIds.includes("PAELS_TEARS") ? { paelsTears: PAELS_TEARS_ENERGY } : {}),
    ...(relicIds.includes("RED_SKULL") ? { redSkull: RED_SKULL_STRENGTH } : {}),
    ...(relicIds.includes("SELF_FORMING_CLAY") ? { clayBlock: CLAY_BLOCK, clayPending: powerAmount(player, "SELF_FORMING_CLAY_POWER") } : {}),
    inferno: powerAmount(player, "INFERNO_POWER"),
    infernoCopies: infernoCopies(state, powerAmount(player, "INFERNO_POWER")),
    feelNoPain: powerAmount(player, "FEEL_NO_PAIN_POWER"),
    afterImage: powerAmount(player, "AFTERIMAGE_POWER"),
    shadowmeldActive: powerAmount(player, "SHADOWMELD_POWER") > 0,
    corrosiveWave: powerAmount(player, "CORROSIVE_WAVE_POWER"),
    poisonExtraTriggers: powerAmount(player, "ACCELERANT_POWER"),
    envenom: powerAmount(player, "ENVENOM_POWER"),
    ...(phantomBlades === 9 ? { phantomBlades, phantomBladesSpent: !phantomBladesArmed } : {}),
    // Mid-turn draws: a Strike drawn plays itself (Hellraiser); each exhaust draws (Dark Embrace).
    hellraiser: powerAmount(player, "HELLRAISER_POWER") > 0,
    darkEmbrace: powerAmount(player, "DARK_EMBRACE_POWER"),
    strengthNow: powerAmount(player, "STRENGTH_POWER"),
    // No card Block yet this turn (block 0 is the proxy): Unmovable's doubling is still to come.
    // Vambrace doubles the first card Block of the fight, the same way: every Block card shows the doubled
    // number until one is played (G8YY F30 T3: Defend 12 and Shrug It Off 18 planned, 12 + 9 gained).
    unmovableArmed: (powerAmount(player, "UNMOVABLE_POWER") > 0 && num(player["block"]) === 0) || vambraceArmed(relicIds, asArray(combat["hand"]), powerAmount(player, "DEXTERITY_POWER"), powerAmount(player, "FRAIL_POWER") > 0) || legionPreview,
    ...(legionPreview ? { paelsLegionPreview: true } : {}),
    demonTongue: relicIds.includes("DEMON_TONGUE") && env.screenMemory.demonTongueTurn !== `${hpGuardFight(env)}:${state.turn}`,
    helmetBlock: relicIds.includes("INTIMIDATING_HELMET") ? INTIMIDATING_HELMET_BLOCK : 0,
    hpLossCap: relicIds.includes("BEATING_REMNANT") ? BEATING_REMNANT_CAP : null,
    // silent-0177/0178: only Silent enemy-hit evidence; keep Ironclad's model unchanged.
    ...(str(asRecord(state.run?.raw)["character_id"]).toLowerCase() === "silent" && relicIds.includes("TUNGSTEN_ROD") ? { tungstenRod: true } : {}),
    vigor,
    ...(penNib !== undefined ? { penNib } : {}),
    noBlock: powerAmount(player, "NO_BLOCK_POWER") > 0,
    tender: powerAmount(player, "TENDER_POWER"),
    exhaustedThisTurn,
    // CARD_CONDITIONS: HP already lost this turn before this decision (Spite's second hit; hpLostSinceTurnStart).
    ...(hpLostEarlier ? { hpLostThisTurn: true } : {}),
    // Fairy in a Bottle and Lizard Tail: a line that reaches 0 HP goes on at their HP (JR66CJ9T8H7W F48).
    revives: revivesOf(state, env.screenMemory, num(player["max_hp"])),
    ...(relicIds.includes("PAPER_PHROG") ? { vulnerableFactor: PAPER_PHROG_VULNERABLE } : {}),
    ...(relicIds.includes("LOST_WISP") ? { lostWisp: LOST_WISP_DAMAGE } : {}),
    // Throwing Axe: the fight's first card is played twice (FSPKJAYY3ET6 F39 T1: Inflame, Strength +6 and Galvanic's 6
    // twice). Known only on turn 1 with no card played yet: the relic shows no used state and the state has no count of
    // the fight's plays (a fight whose turn 1 played nothing is left out).
    ...(relicIds.includes("THROWING_AXE") && state.turn === 1 && num(player["cards_played_this_turn"]) === 0 ? { firstCardReplay: true } : {}),
    // PASSIVE_PIECES (passive-pieces.ts): Orichalcum, Ripple Basin, Letter Opener, Ornamental Fan, Parrying Shield on this
    // turn too, the counters from the relics (none held, or off: nothing, the solver as before).
    ...liveSolverFields(state.run?.raw, num(player["cards_played_this_turn"]), num(player["attacks_played_this_turn"])),
  };
  const kind = fightKind(combat, env);
  // Withering Presence counts every card played: sample the count on every decision, plan-continue
  // included (Y0KJ F48: counted 15 by T7 against the game's 26; Hellraiser's auto-played Strikes and
  // the plan's later steps were missed, so Bash's Wither on T6 was not foreseen).
  recordFightPlays(env, num(player["cards_played_this_turn"]));
  const wither = witherInput(env, combat, hand, num(player["cards_played_this_turn"]));

  // 1. A committed plan whose board is exactly as expected: keep executing it.
  //    A hand that grew without a drawing card played means the plan was made before the turn's draw
  //    had landed (live runs: planned from 1–3 cards of 5): drop it and plan from the full hand.
  const memo = env.screenMemory.combatPlan;
  // After Liquid Memories the hand holds the card it took too.
  const handGrew = memo !== null && hand.length > memo.handLen + (memo.take ? 1 : 0);
  const sameEnemies = memo?.enemies === undefined || memo.enemies === livingEnemySignature(state.raw);
  // After a potion step the belt shows whether it was drunk (the hand does not change).
  const drunk = memo?.potions === undefined || memo.potions === beltSignature(state.raw);
  // Resumed after an in-combat card choice: the choice may have exhausted (True Grit+) or upgraded (Armaments)
  // hand cards, so the hand only has to be the expected one less what the choice took, still holding the rest
  // of the line (2MK4V7V3Q5BM F8 T2).
  // After Blessing of the Forge the same hand, some or all of it upgraded (BXAZ-like lines re-planned at "+").
  const sameHand =
    memo !== null &&
    (memo.expectedHand === handSignature(hand) ||
      (memo.afterSelection === true && leftByChoice(memo, hand)) ||
      (memo.upgradeAll === true && withoutUpgrades(memo.expectedHand) === withoutUpgrades(handSignature(hand))) ||
      (memo.take !== undefined && withCard(memo.expectedHand, memo.take) === handSignature(hand)));
  const asExpected = memo !== null && !handGrew && sameEnemies && drunk && memo.turn === state.turn && sameHand;
  // A chosen line played to its end on the board it expected (lineDone): code does not extend it on its own
  // (stopLine below).
  const lineEnded = memo !== null && asExpected && lineDone(memo, combat, state.available_actions) ? memo.via : null;
  if (memo && asExpected && memo.remaining.length > 0) {
    const next = memo.remaining[0]!;
    // What this step is to the execution gate (V4 M3): the card or potion the line chose, the enemy it aimed at
    // then, the turn, and the hand the line expected here, checked again on the state the step is sent to.
    const found = intentFor(next, hand);
    const intent = found ? { ...found, expect: lineStepExpect(memo, next, handSignature(hand)) } : null;
    // Liquid Memories drunk, its card not taken yet (a combat frame before the "put a card into your hand" screen):
    // the card the line plays next is the one still to come, so this frame's hand is the expected one without it.
    // Wait for the screen (selection.ts takes it) instead of re-planning the line; not for long, in case none comes.
    const takePending = !intent && memo.take !== undefined && next.pileCard !== undefined && takeSignature(next.pileCard) === memo.take && memo.expectedHand === handSignature(hand);
    if (takePending) {
      const since = (env.screenMemory.takeWaitSince ??= Date.now());
      if (Date.now() - since <= TAKE_WAIT_MS) return null;
    }
    env.screenMemory.takeWaitSince = undefined;
    if (intent) {
      const nextCard = cardFor(next, hand);
      noteIntent(env, intent, nextCard);
      if (next.discards) env.screenMemory.gambleDiscards = { turn: memo.turn, cardIds: next.discards };
      notePotionTake(env, memo.turn, next);
      env.screenMemory.plannedAfter = { turn: memo.turn, steps: memo.remaining.slice(1), lethal: memo.lethal };
      // The last step of a chosen line leaves a memo with nothing left: its end is "stop here" (lineDone).
      // A potion step keeps the hand and is checked on the belt (beltAfter), a card step on the hand.
      const { potions: _checked, afterSelection: _resumed, upgradeAll: _forged, take: _taken, ...kept } = memo;
      const potions = beltAfter(next, state.raw);
      env.screenMemory.combatPlan =
        (memo.remaining.length > 1 || memo.via !== "code") && (nextCard?.draw ?? 0) === 0 && nextCard?.discardCount === undefined
          ? {
              ...kept,
              remaining: memo.remaining.slice(1),
              expectedHand: handSignature(handAfterPlay(nextCard, hand, musicBoxArmed(state))),
              handLen: handLenAfter(next, hand, musicBoxArmed(state)),
              ...(upgradesHand(next) ? { upgradeAll: true } : {}),
              ...(next.takes ? { take: takeSignature(next.takes) } : {}),
              ...(potions !== undefined ? { potions } : {}),
            }
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
  env.screenMemory.takeWaitSince = undefined;

  // Foul Potion hits us too (39J9: two drunk at 22 HP): no longer banned, its lines carry the damage to
  // us in hp_lost (card-model FOUL_POTION selfDamage), and drinking it is Jev's call (Dai 2026-09-28).
  const potionsAll = potionViews({ raw: asRecord(state.run?.raw) }, env.knowledge).filter((potion) => potion.can_use);
  // What each potion held costs to drink here (potion-cost.ts, Dai 2026-09-30): its held value in the potion table for
  // this act and ascension; 0 in a boss fight. Carried by the potion cards (the solver's score, the rollout's later
  // turns, the random potions' samples) and shown on every option.
  const costs = potionCosts(potionsAll.map((potion) => potion.potion_id), state.run?.ascension ?? 0, Number(str(asRecord(state.run?.raw)["act_id"]) || 0) + 1, kind);
  const playable = hand.filter((card) => card.playable);
  if (playable.length === 0) {
    // A hand of Dazed is not the end of the options: a potion can still block, draw or kill (CY8U F25
    // T7: 5/5 Dazed, Snecko Oil never considered, Bees 35 into 30 HP and 0 block). Code drinks on its
    // own only into a lethal hit; otherwise, with a potion in the belt, the turn is planned (end turn
    // vs. the potion lines) and the potion is Jev's call.
    const rescue = noPlayRescuePotion(env, enemies, playerSim);
    if (rescue) return rescue;
    if (potionsAll.length === 0 || !state.available_actions.includes("use_potion")) {
      return { kind: "act", label: "combat/end_turn", intent: { action: "end_turn" }, rationale: "no playable cards; ending the turn" };
    }
  }

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
  // A potion line is scored on its simulated outcome less the potion's cost (potion-cost.ts, Dai 2026-09-30:
  // the table's held value, 0 in a boss fight); whether it is worth spending is Jev's call, with potion_context
  // and each option's potion_cost as its facts.
  const nowIncoming = enemies.reduce((sum, enemy) => sum + enemy.attacks.reduce((s, a) => s + a.damage * a.hits, 0), 0);
  // MECH_DEATH_MOVE: a survivor's moves its learned death rules say it never makes while the ally lives are no forecast now.
  const deathExcluded = deathOnlyMoves(enemies);
  const presentIds = asArray(combat["enemies"]).map((enemy) => str(asRecord(enemy)["enemy_id"]));
  const summonThreat = (enemy: Record<string, unknown>): number => summonThreatAt(str(enemy["enemy_id"]), str(enemy["move_id"]), ascension, presentIds, playerSim.vulnerable);
  const nextIncoming =
    asArray(combat["enemies"])
      .map(asRecord)
      .filter((enemy) => enemy["is_alive"] !== false)
      .reduce((sum, enemy, i) => sum + summonThreat(enemy) + (multiClawNext(enemy) ?? expectedNextDamage(str(enemy["enemy_id"]), str(enemy["move_id"]), boardDamageContext(enemy, player, ascension), deathExcluded.get(numOrNull(enemy["index"]) ?? i)) ?? 0), 0) +
    revivingIllusions(combat).reduce((sum, enemy) => sum + (revivingForecast(str(enemy["enemy_id"]), 1, boardDamageContext(enemy, player, ascension))?.[0] ?? 0), 0);
  const laterIncoming = laterIncomingOf(combat, ascension, deathExcluded);
  // FIGHT_PLAN=v1: DeepSeek's plan for this elite/boss fight, when there is one.
  const fightPlan = activeFightPlan(env);
  // What gets through the block already up (CCPR F43 T1: 30 starting block from Anchor and Diamond
  // Diadem, a "big hit" potion drunk on a 0-loss turn).
  const bigHit = nowIncoming - playerSim.block >= Math.max(12, playerSim.hp * 0.25);
  // Several enemies can share the id (CWMP F7: four Phantasmal Gardeners, index 0 was always taken
  // while the plan's Enlarge eel sat at 19 HP for six turns): the lowest-HP one of them, re-read each turn.
  const focusIndex = fightPlan?.focus
    ? numOrNull(
        asArray(combat["enemies"])
          .map(asRecord)
          .filter((enemy) => enemy["is_alive"] !== false && str(enemy["enemy_id"]) === fightPlan.focus)
          .sort((a, b) => num(a["current_hp"]) - num(b["current_hp"]))[0]?.["index"],
      )
    : null;
  // A kill-first target only matters with more than one enemy alive.
  const focusInput = focusIndex !== null && enemies.length > 1 ? { focusIndex } : {};
  // "big_hit" only means something for a potion that blunts a hit; any other (Cure All, Colorless
  // Potion: SM9H F33, never drunk until T8 with 5 of 7 energy unspent on T1) follows the default rule.
  const notBlunting = (potionId: string) =>
    OFFENSIVE_POTIONS.has(potionId) || !BLUNTS_HIT.test(potionsAll.find((potion) => potion.potion_id === potionId)?.text ?? "");
  const drawPile = drawPileCards(state.raw);
  const raceEruption = asArray(combat["enemies"]).some((enemy) => eruptionRace(asRecord(enemy), playerSim.hp, state.turn ?? 1, state.run?.ascension ?? 0));
  // The board a card potion's card is played on (card-model GENERATED_CARD_POTIONS), the pile card a
  // pile-card potion would take (Liquid Memories, Droplet of Precognition: the selection screen's own
  // rule, thisTurnScore), and the draw pile's expected card (Gambler's Brew, Glowwater, Distilled Chaos).
  const enemyTargets = enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.index);
  const pileContext = { enemyTargets, strength: playerSim.strengthNow ?? 0, weak: playerSim.weak };
  // A card a potion adds is free this turn; a Power under Spiked Gauntlets costs 1 all the same (card-model potionCardCost).
  const powerExtraCost = potionPowerExtraCost(relicIds);
  // SL_RETRY_KNOWN_DRAWS (docs/sl.md §10): the draw pile's next cards in order, known from an earlier attempt at this fight,
  // as indices into the pile's listing (pileCardModels' order: the rollout's, the random potions' and B2's piles come from
  // the same listing) and as the solver's known cards. A card the pile does not hold: none, the draws random as before.
  const knownTop = slKnownTop(env, state, pileContext);
  const beltIds = new Set(potionsAll.map((potion) => potion.potion_id));
  const pickFrom = (pile: "discard" | "draw", free: boolean) =>
    pileCardPick(pileCardModels(state, env.knowledge, pile, pileContext), thisTurnIncoming(combat), Math.max(1, enemyTargets.length), free, {
      ...(exhaustPileSize(state.raw) === undefined ? {} : { exhaustReach: (exhaustPileSize(state.raw) ?? 0) + hand.filter((card) => card.exhausts).length }),
      vulnerable: Math.max(0, ...enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.vulnerable)),
    }, powerExtraCost);
  const drawSlot = potionsAll.find((potion) => potion.potion_id === "GAMBLERS_BREW" || potion.potion_id === "DISTILLED_CHAOS" || potion.potion_id === "GLOWWATER_POTION" || potion.potion_id === "BOTTLED_POTENTIAL")?.slot;
  const potionContext: PotionContext = {
    ...pileContext,
    ...(powerExtraCost > 0 ? { powerExtraCost } : {}),
    ...(beltIds.has("BLESSING_OF_THE_FORGE") ? { upgrades: forgeUpgrades(state, env.knowledge) } : {}),
    ...(beltIds.has("SOLDIERS_STEW")
      ? { strikePileDamage: [...pileCardModels(state, env.knowledge, "draw", pileContext), ...pileCardModels(state, env.knowledge, "discard", pileContext)].filter(isStrikeCard).reduce((sum, card) => sum + (card.damage ?? 0) * Math.max(1, card.hits), 0) }
      : {}),
    ...(beltIds.has("LIQUID_MEMORIES") ? { discardPick: pickFrom("discard", true) } : {}),
    ...(beltIds.has("DROPLET_OF_PRECOGNITION") ? { drawPick: pickFrom("draw", false) } : {}),
    // Drawn from the draw pile, or the discard pile reshuffled when it is empty; the deck less the hand when the state
    // has neither pile. Both known and empty: nothing to draw (pilesEmpty).
    ...(drawSlot !== undefined
      ? (() => {
          const draw = pileCardModels(state, env.knowledge, "draw", pileContext);
          const discard = pileCardModels(state, env.knowledge, "discard", pileContext);
          const unknown = drawablePileSize(state.raw) === undefined;
          const pool = draw.length > 0 ? draw : discard.length > 0 ? discard : unknown ? deckDrawPool(state, env.knowledge, pileContext, hand) : [];
          return { expectedDraw: expectedDraw(pool, drawSlot), ...(!unknown && pool.length === 0 ? { pilesEmpty: true } : {}) };
        })()
      : {}),
  };
  // A potion is a solver line only when it can be priced on this board (a pile-card potion needs a card
  // to take, a draw potion a known pile); otherwise it stays an unmodelled option as before.
  // Random potions (card-model CHOICE_POTIONS / DRAW_POTIONS) are simulated by Monte Carlo on their own
  // (potion-mc.ts) and offered as "drink now, then re-plan": never a line of this solve.
  const mcSources = new Map<number, PotionMcSource>();
  for (const potion of potionsAll) {
    const plainSource = randomPotionSource(potion, state, env.knowledge, pileContext, noDraw);
    // SL_RETRY_KNOWN_DRAWS: a draw potion's samples draw the known cards first (SL_RETRY_KNOWN_INSERTS: the added cards at random places among them).
    const source = plainSource && knownTop && plainSource.kind === "draw" ? { ...plainSource, knownTop: knownTop.indices, ...(knownTop.added.length > 0 ? { knownAdded: knownTop.added } : {}) } : plainSource;
    const cost = costs.get(potion.potion_id)?.hp ?? 0;
    if (source) mcSources.set(potion.slot, cost > 0 ? { ...source, cost } : source);
  }
  const modelledIds = new Set(
    potionsAll
      .filter((potion) => !mcSources.has(potion.slot) && modelPotion(potion.potion_id, potion.name, potion.slot, potion.valid_targets, potionContext) !== null)
      .map((potion) => potion.potion_id),
  );
  const isModelledPotion = (potionId: string) => modelledIds.has(potionId);
  // The solver input behind `solved` (the rollout facts replay the turn from it).
  let solvedInput: SolverInput | null = null;
  const solve = () =>
    solveTurn((solvedInput = {
      hand: [
        ...hand,
        ...potionsAll
          .filter((potion) => !mcSources.has(potion.slot))
          .map((potion) =>
            modelPotion(potion.potion_id, potion.name, potion.slot, potion.valid_targets, potionContext),
          )
          .filter((card): card is CardModel => card !== null)
          // Draw potions draw nothing under Fiddle either (GMT2 F38 T2: Swift Potion "draws 3", drew 0).
          .map((card) => withPotionCost(noDraw ? { ...card, draw: 0, drawsUntil: false } : card, costs)),
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
      // SL_RETRY_KNOWN_INSERTS: with cards added at random places the next draws are not certain: the solver draws as before.
      ...(knownTop && knownTop.added.length === 0 ? { knownTop: knownTop.cards } : {}),
      ...(nextIncoming > 0 ? { nextIncoming } : {}),
      ...(laterIncoming ? { laterIncoming } : {}),
    }));
  const solveStart = performance.now();
  const solved = solve();
  const solveMs = performance.now() - solveStart;
  // Tool hook: every line the solver found, also when code decides on its own below (a lethal, a dominating line).
  if (thiefTrace.enabled) thiefTrace.last = { plans: solved.plans, surviving: [], shown: [], rollout: null, thieves: [], lastTurnLine: null, rolloutLine: null };
  // The random potions' Monte Carlo, run once when a decision needs it (every question does).
  const dryBest = solved.plans.find((plan) => !drinksPotion(plan) && !plan.outcome.dies) ?? solved.plans.find((plan) => !drinksPotion(plan)) ?? null;
  let mcResults: PotionMc[] | null = null;
  // SL_RETRY_COMPUTE: a retried fight's samples and time.
  const slCompute = env.sl?.compute;
  const randomPotions = (): PotionMc[] =>
    (mcResults ??= runRandomPotions([...mcSources.values()], solvedInput, dryBest, `${fightKey(state)}:${state.turn ?? "?"}:${handSignature(hand)}`, slCompute ? { samples: slCompute.mcSamples, budgetMs: slCompute.mcBudgetMs } : {}));
  // A turn that costs a lot of HP whatever is played (7Q5G/MD3F: hallway fights at -16..-46 HP with a
  // potion kept in the belt): even the line that keeps the most HP loses >= 30% of current HP, or
  // leaves HP below 25% of max. Unmodelled potions are offered then.
  const minLossAfter = (plans: Plan[]): number => Math.max(...plans.map((plan) => plan.outcome.hpAfter));
  const costly =
    solved.plans.length > 0 &&
    playerSim.maxHp > 0 &&
    (playerSim.hp - minLossAfter(solved.plans) >= playerSim.hp * 0.3 || minLossAfter(solved.plans) < playerSim.maxHp * 0.25);
  const drinksKeptPotion = (plan: Plan) =>
    fightPlan !== null &&
    plan.steps.some((step) => {
      const use = step.cardId.startsWith("POTION:") ? fightPlan.potions[step.cardId.split(":")[1] ?? ""] : undefined;
      // A potion the plan keeps for a big hit is kept on the turns before it (MK1N F33 T2: the Block
      // Potion planned for the T4 Laser drunk on T2; WLY1).
      return use === "save" || use === "emergency" || (use === "big_hit" && !bigHit && !pressed);
    });
  const best = solved.plans[0];
  if (!best) return planCombatPerCard(env);

  const endNow = solved.plans.find((plan) => plan.steps.length === 0);
  const modSaysLethal = bool(combat["end_turn_will_kill_player"]);
  const calcNote = endTurnLethalNote(endNow, modSaysLethal, playerSim.hp);

  // 2. Nothing survives this turn as simulated. The per-card fallback did worse on a live run (Act 3
  //    boss: Jev defended card by card at 0.2 confidence). Play the plan that keeps the most HP — the
  //    estimate may be pessimistic (random draws, unmodelled relics) — and let potions come first.
  // Every simulated line dies, but a random potion may not: the least-loss line goes to the question.
  let allDie: Plan | null = null;
  if (best.outcome.dies) {
    // Pael's Eye: the first turn a fight ends with no card played, the hand is exhausted and an extra
    // turn follows (a fresh draw before the enemy acts). 12ZG F23 T6: never used, died to a 24 Pounce.
    const fightId = fightKey(state);
    if (relicIds.includes("PAELS_EYE") && num(player["cards_played_this_turn"]) === 0 && env.screenMemory.paelsEyeFight !== fightId) {
      env.screenMemory.paelsEyeFight = fightId;
      return { kind: "act", label: "combat/end_turn", intent: { action: "end_turn" }, rationale: "every line dies: ending the turn with no card played for Pael's Eye's extra turn" };
    }
    const potionsNow = potionViews({ raw: asRecord(state.run?.raw) }, env.knowledge).filter((potion) => potion.can_use && !isModelledPotion(potion.potion_id) && !mcSources.has(potion.slot));
    // A random potion some sample of which lives: Jev's question, the least-loss line next to it.
    const randomLives = mcSources.size > 0 && randomPotions().some((mc) => mc.plans.some((plan) => plan !== null && !plan.outcome.dies));
    if (potionsNow.length > 0 && !randomLives) return planCombatPerCard(env);
    if (randomLives) allDie = leastLossPlan(solved.plans, hand, playerSim.hp);
  }
  if (best.outcome.dies && allDie === null) {
    const leastLoss = leastLossPlan(solved.plans, hand, playerSim.hp);
    const drawing = leastLoss.steps[0] !== undefined && hand.some((card) => card.index === leastLoss.steps[0]!.cardIndex && drawsCards(card));
    commit(env, state.turn, leastLoss, hand, "code");
    const decision: Decision = {
      kind: "act",
      label: "combat/least-loss",
      intent: firstIntent(leastLoss, hand, env),
      rationale: drawing
        ? `every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg ${leastLoss.outcome.damageDealt}): ${leastLoss.steps.map(stepText).join(", ")}`
        : `every simulated line dies; playing the one that keeps the most HP (${leastLoss.outcome.hpAfter}): ${leastLoss.steps.map(stepText).join(", ") || "end turn"}`,
    };
    const boundInput = solvedInput as SolverInput | null;
    noteLeastLoss(
      decision,
      () => leastLossFactsFor(leastLoss, solved, solvedInput, knownTop, env.sl?.knownDraws?.exact, hand, playerSim, [...mcSources.values()], randomTargets(state)),
      boundInput
        ? () => anyDrawBound({ input: boundInput, state, knowledge: env.knowledge, pileContext, targets: randomTargets(state), noDraw, relicIds, randomPotions: [...mcSources.values()] })
        : undefined,
    );
    return decision;
  }

  const planOffer = (potionId: string) => planOffersPotion(fightPlan, potionId, { turn: state.turn ?? 1, bigHit, pressed, costly, offensive: notBlunting(potionId) });
  // Unsimulated potions (neither modelled nor random): every one that can be drunk is an option, like a random
  // potion (Dai: a potion is a 0-cost one-shot card, never filtered or vetoed), with no invented numbers; a fight
  // plan's keep is noted. (Until batch K only under T1: the cheapest potion-free option losing 12% of HP this turn,
  // a dying rollout sample or the fight plan's moment; CJ88/VSRG Entropic Brew, DHGT Stable Serum sat unoffered.)
  const potions = potionsAll.filter(
    (potion) => !isModelledPotion(potion.potion_id) && !mcSources.has(potion.slot) && (!potion.requires_target || potion.valid_targets.length > 0),
  );
  const planPotionNow = potions.some((potion) => planOffer(potion.potion_id) === true);
  const dangerous =
    best.outcome.hpLoss >= Math.max(12, playerSim.hp * 0.4) || (kind !== "monster" && kind !== "unknown" && best.outcome.hpLoss >= 10);

  // 3. Code-decided cases. Code drinks on its own only when no potion-free line does the job: a lethal
  // is played by code only potion-free. When only lines that drink win the fight this turn, the lethal
  // is Jev's call (Dai 2026-09-28): those lines are shown, flagged as winning and naming the potion spent.
  const lethalLines = best.outcome.winsFight ? solved.plans.filter((plan) => plan.outcome.winsFight) : [];
  const dryLethal = lethalLines.find((plan) => !drinksPotion(plan));
  if (dryLethal) {
    commit(env, state.turn, dryLethal, hand, "code");
    return { kind: "act", label: "combat/lethal", intent: firstIntent(dryLethal, hand, env), rationale: `lethal: ${dryLethal.steps.map(stepText).join(", ")}${calcNote}` };
  }
  const potionLethal = potionLethalLines(lethalLines);
  // (The fight plan's auto-drink of an unmodelled potion at its planned moment is gone: the potion is
  // offered to Jev on every turn, the fight plan's moment noted.)
  const surviving = allDie ? [allDie] : hardRuleLines(solved.plans.filter((plan) => !plan.outcome.dies), enemies);
  // Every modelled potion in the belt is on a shown line (the best line drinking it), next to the
  // potion-free ones: whether to spend it is Jev's call.
  const options = withPotionLines(distinctPlans(surviving, MAX_OPTIONS), surviving, potionsAll.filter((potion) => isModelledPotion(potion.potion_id)).map((potion) => potion.potion_id), MAX_OPTIONS);
  // A potion lethal: every way to win this turn (one line per set of potions it spends) is shown.
  for (const line of potionLethal) if (!options.includes(line)) options.push(line);
  // Some potion-free line survives the turn: then code never drinks on its own.
  const drySurvives = surviving.some((plan) => !drinksPotion(plan));
  // The score-best plan can be dominated on every shown axis (its extra score is a power's flat value)
  // and so be missing from the options. YP9 T3: Crimson Mantle's line (hp -28) was committed as the
  // "only line" while the one option shown was the same turn with Defend+ (hp -20). Play what is shown.
  // Switch only to an option that dominates it (every outcome axis, sleep cost included: 1K5G F17 T1
  // switched to a line that woke the Matriarch), not merely the highest-ranked one left.
  const top = options.includes(best) ? best : options.find((plan) => dominates(plan, best)) ?? options[0] ?? best;
  // The mod says ending now is lethal but the solver thinks it is safe: the solver is missing
  // something (2WUM T7: Colossus halved twice, turn ended with 1 energy and 3 Defends in hand). Never
  // end the turn on the solver's word then; play the line that keeps the most HP.
  if (modSaysLethal && top.steps.length === 0 && allDie === null && top.outcome.revived === undefined) {
    const anyPlayed = surviving.filter((plan) => plan.steps.length > 0);
    const dryPlayed = anyPlayed.filter((plan) => !drinksPotion(plan));
    const played = dryPlayed.length > 0 ? dryPlayed : anyPlayed;
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
  // FIGHT_PLAN=v1: the plan's setup cards in the first turns. A line that plays one, within the HP
  // guard's slack of code's pick, makes the turn a question for Jev (tagged with the plan fit).
  // Counted per distinct planned card: one of them played is not the plan (CAYK F48 T3: Brand
  // satisfied the check and Mayhem, bought for this fight, was never played).
  // Molten Fist only sets up into Vulnerable (CWMP F7 T1: played as "setup" into a target with none).
  // An attack is setup only when it debuffs (Bash, Molten Fist): Howl from Beyond+ at 19 HP for 19
  // damage passed the guard as "planned setup" (MK1N F33 T2).
  // FIGHT_PLAN=off (every run since 2026-09-30) has no setup list, and the HP guard's setup exception never applied:
  // there a Power card played in an elite or boss fight is the setup (GTU27C946ERT F33 T1: Demon Form+ counted as no
  // setup, swapped for an attack line). Hallway fights still none (MX1Q F23 T2: Inflame lines pulled in as setup).
  const setupStep = (step: Step) =>
    fightPlan === null
      ? (kind === "elite" || kind === "boss") && cardFor(step, hand)?.type === "Power"
      : fightPlan.setup.includes(step.cardId) &&
        !((() => {
          const model = cardFor(step, hand);
          return model !== undefined && model !== null && model.type === "Attack" && model.vulnerable === 0 && model.weak === 0 && step.cardId !== "MOLTEN_FIST" && step.cardId !== "DOMINATE";
        })()) &&
        !((step.cardId === "MOLTEN_FIST" || step.cardId === "DOMINATE") && (enemies.find((enemy) => enemy.index === step.target)?.vulnerable ?? 0) === 0);
  // Hallway HP guard from act 2 on (or ascension 5+) below 60% HP: a line may lose at most
  // max(8, 20% HP) more than the cheapest (VHLZ F21: -18 over a -10 line, then -25 over -15, into the
  // F22 room at 17/80 with no potions).
  const actNumber = Number(str(asRecord(state.run?.raw)["act_id"]) || 0) + 1;
  const hallwayGuard =
    (kind === "monster" || kind === "unknown") && (actNumber >= 2 || (state.run?.ascension ?? 0) >= 5) && playerSim.hp < playerSim.maxHp * 0.6;
  const hallwayGuardSlack = hpGuardSlack(playerSim.hp, "monster");
  const setupCount = (plan: Plan) => new Set(plan.steps.filter(setupStep).map((step) => step.cardId)).size;
  // The HP guard does not swap out the plan's setup cards while the line leaves enough HP (35% of max
  // and next turn's expected hit): JF99 F33 T4/T7, Crimson Mantle (Inferno+ 9 on the board, 9 to each
  // crab every turn) was traded twice for 6 HP and never played; the crabs died at 7 and 38 HP left.
  // Boss race: a line whose extra damage per extra HP beats the race (boss HP left / our HP) is kept,
  // and not charged to the fight's budget, while it leaves next turn's hit + 5 (ZH8J F17: the budget
  // was spent by T8, then Bludgeon's 32 damage became 6 on T9 and Tear Asunder was swapped on T10;
  // the boss was left at 92/222).
  // A phase boss's later phases count too (ZANM F48: phase 2 at 151 read as the whole race, the guard
  // let a -37 line through and phase 3 began at 49 HP; Test Subject is ~100/200/300).
  const laterPhases = (enemy: EnemySim) => (!enemy.revives ? 0 : laterPhaseHps(enemy.maxHp, state.run?.ascension ?? 0).reduce((sum, hp) => sum + hp, 0));
  const bossHpLeft = enemies.filter((enemy) => !enemy.minion).reduce((sum, enemy) => sum + enemy.hp + laterPhases(enemy), 0);
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
    if ((kind !== "boss" && kind !== "elite" && !illusionFight) || replacement === null) return false;
    const extraLoss = guardLoss(picked) - guardLoss(replacement);
    const extraDamage = illusionFight ? realDamage(picked) - realDamage(replacement) : picked.outcome.damageDealt - replacement.outcome.damageDealt;
    return extraLoss > 0 && extraDamage > 0 && extraDamage / extraLoss >= bossHpLeft / Math.max(1, playerSim.hp) && picked.outcome.hpAfter >= nextIncoming + 5;
  };
  // The setup exception (setupKept); `deathsOf`: the rollout's deaths, when it ran (Jev's pick).
  const guardKeepsSetup = (picked: Plan, replacement: Plan | null, deathsOf: (plan: Plan) => number | null = () => null): boolean =>
    winsRace(picked, replacement) ||
    (replacement !== null &&
      setupKept(
        { setups: setupCount(picked), hpAfter: picked.outcome.hpAfter, deaths: deathsOf(picked) },
        { setups: setupCount(replacement), deaths: deathsOf(replacement) },
        { kind, maxHp: playerSim.maxHp, nextIncoming, bigHit },
      ));
  // The setup window is the fight's first turns, not a new boss phase's (YFG5 F48 T3: Test Subject's
  // phase 2 began on T3, Pyre+ for 4 damage over a 58-damage line at the same HP).
  const maxHpNow = enemies.filter((enemy) => !enemy.minion && enemy.hp > 0).reduce((sum, enemy) => sum + enemy.maxHp, 0);
  const fightId = fightKey(state);
  if (!env.screenMemory.fightStart || env.screenMemory.fightStart.fight !== fightId) env.screenMemory.fightStart = { fight: fightId, maxHp: maxHpNow };
  const laterPhase = maxHpNow > env.screenMemory.fightStart.maxHp;
  const setupLine =
    // Hallway fights set up only when the plan says so (MX1Q F23 T2: Inflame lines at 24/26 damage over
    // 44/54 at the same HP, pulled in as "planned setup" against a Chomper pair).
    fightPlan && fightPlan.setup.length > 0 && (state.turn ?? 1) <= 3 && !laterPhase &&
    (kind === "elite" || kind === "boss" || fightPlan.approach === "setup")
      ? surviving.filter((plan) => setupCount(plan) > setupCount(top)).sort((a, b) => setupCount(b) - setupCount(a) || b.score - a.score)[0]
      : undefined;
  const setupClose = setupLine !== undefined && effectiveLoss(setupLine) <= effectiveLoss(top) + hpGuardSlack(playerSim.hp, kind, hpGuardExtra(env));
  if (setupClose && !options.includes(setupLine)) options.push(setupLine);
  // A chosen line played to its end is "stop here" for code (9Q7V F17 T14: after Jev's "One-Two Punch" alone,
  // code re-planned and played the Sword Boomerang Jev had turned down as the "only distinct line", killing the
  // Giant into its blast). A lethal, every line dying and the mod's lethal flag are still code's (above); any
  // other play the re-plan finds (a Free Attack from Unrelenting, a Stomp made free) is Jev's call, with
  // ending the turn, the line's own end, among the options.
  const stopLine = lineEnded !== null && top.steps.length > 0 && endNow !== undefined && surviving.includes(endNow) ? endNow : null;
  if (stopLine && !options.includes(stopLine)) options.push(stopLine);
  // THIEF_FACTS (docs/thief.md, strategy/thief.ts): the enemies carrying our card or gold (a Thieving Hopper's stolen card,
  // a Gremlin Merc's or Fat Gremlin's gold). On a thief's last turn, a line that kills it is among the options (the
  // 7 escapes of 98 A8+ Hopper fights lost a build card each: RPC6X61N9FQ0 F20 岩石铠甲, 8V0HD9Y207WY F19, ...).
  // Fail safe (live play): an error in any thief step drops the thief facts of this decision, which goes on as before.
  const thiefOn = env.thiefFacts !== false;
  let thieves: Thief[] = [];
  let thiefKill: Plan | null = null;
  // Set when a thief step threw: the decision then goes on exactly as with THIEF_FACTS off (no escape in the rollout either).
  let thiefFailed = false;
  if (thiefOn && allDie === null) {
    try {
      thieves = thievesOf(state, env.screenMemory, new Map(enemies.map((enemy) => [enemy.index, enemy.name])));
      thiefKill = thieves.length > 0 ? lastTurnKillLine(surviving, options, thieves, drinksPotion) : null;
    } catch {
      thieves = [];
      thiefKill = null;
      thiefFailed = true;
    }
  }
  // THIEF_COST (docs/thief.md §7, default off): each thief's loot in HP (the Hopper's card from the loop's simulation in
  // screen memory, the gold at the potion table's rate), a cost in the rollout's ranking and in code's own choices below.
  // Fail safe: an error here leaves the thieves without a value, the decision as with the switch off.
  if (env.thiefCost === true && thieves.length > 0) {
    try {
      thieves = withLoot(thieves, state, env.screenMemory.thiefCardValue);
    } catch {
      thieves = thieves.map(({ loot: _loot, ...thief }) => thief);
    }
  }
  /** THIEF_COST in play: some thief's loot has an HP value above 0 (never with the switch off). */
  const lootOn = (): boolean => thieves.some((thief) => (thief.loot?.hp ?? 0) > 0);
  if (thiefKill && !options.includes(thiefKill)) options.push(thiefKill);
  const second = options.find((plan) => plan !== top);
  // Per-target options (Dai 2026-09-28): with two or more kinds of enemy, the line putting the most damage
  // into each kind is shown, labelled "focus: <enemy>". The score's tactical weights (minion chip,
  // concentration, the fight plan's focus) rank code's own lines; they no longer decide which enemy Jev can
  // aim at. They are shown only when Jev is asked (below); code's own line must beat them too.
  const groups = allDie === null && targetOptions.enabled ? killGroups(combat, enemies) : [];
  const focusOf = new Map<Plan, string[]>();
  if (groups.length >= 2) {
    for (const [group, line] of focusLines(surviving, groups, enemies)) focusOf.set(line, [...(focusOf.get(line) ?? []), groupName(group)]);
  }
  // Which enemy the damage goes into is Jev's call: code's line beats another only with at least as much
  // damage into every kind of enemy as well (one kind: total damage, the dominance axis, decides as before).
  const beatsOnTargets = (a: Plan, b: Plan): boolean =>
    groups.length < 2 || groups.every((group) => damageInto(a, group.indices, enemies) >= damageInto(b, group.indices, enemies));
  // Code plays its line only when there is no other, or it beats every other on every axis (and on damage
  // into each kind of enemy, the focus lines included); any real choice between lines is Jev's (lethal,
  // all-lines-die, mod-says-lethal are decided above).
  // A top line that drinks while a potion-free line survives is never code's to play: Jev decides.
  // SL_RETRY_EXPLORE_TURN (env.sl.explore.avoid): later in an SL retry's deviation turn, code does not play on its own a
  // line that ends the turn with the plays a failed attempt's turn had through the deviation point's board while another
  // shown line that survives does not (drinking no potion it does not, but in a boss fight with SL_RETRY_EXPLORE_BOSS_POTIONS):
  // the turn is Jev's question then, and the answer is kept off those turns (combat-plan explored). Fail safe: an error, as
  // without it.
  // SL_RETRY_EXPLORE_WHOLE (env.sl.explore.whole): such a line among every line that survives, not only the shown ones
  // (PW7Y9EWUW8SB F48 attempt 3 T1, after Pommel Strike+ drew: "only distinct line" Rampage, Stomp, attempts 1-2's turn,
  // while Stomp alone survived too); the best of them is shown. None: code plays its line, and says so (avoid_failed).
  let avoidsTop = false;
  const avoidOf = env.sl?.explore?.avoid;
  const endsTried = (plan: Plan): boolean => {
    try {
      return avoidOf !== undefined && triedHas(avoidOf.tried, { text: "", ...turnKeys(env.sl?.explore?.played, plan.steps) });
    } catch {
      return false;
    }
  };
  const avoidWhole = avoidOf !== undefined && env.sl?.explore?.whole === true;
  /** SL_RETRY_EXPLORE_WHOLE: why no line keeps the turn off the failed ones instead of `line` (it ends as one). */
  const avoidFailReason = (line: Plan): string => {
    const others = surviving.filter((plan) => plan !== line);
    if (others.length === 0) return solved.plans.some((plan) => plan !== line) ? "every other line dies this turn" : "nothing else can be played this turn";
    if (others.every(endsTried)) return "every other line that survives this turn ends it as a failed attempt's too";
    return "every other line that survives this turn and ends it otherwise drinks a potion this one does not";
  };
  if (avoidOf && env.sl?.explore?.played && endsTried(top)) {
    const anyDrink = env.sl.explore.bossPotions === true && kind === "boss";
    const topPotions = potionIdsOf(top);
    const keepsOff = (plan: Plan) => plan !== top && !plan.outcome.dies && (anyDrink || potionIdsOf(plan).every((id) => topPotions.includes(id))) && !endsTried(plan);
    avoidsTop = options.some(keepsOff);
    if (!avoidsTop && avoidWhole) {
      const other = surviving.find(keepsOff);
      if (other) {
        options.push(other);
        avoidsTop = true;
      }
    }
  }
  const clear =
    (!second || options.every((plan) => plan === top || dominates(top, plan))) &&
    [...options, ...focusOf.keys()].every((plan) => plan === top || beatsOnTargets(top, plan)) &&
    !setupClose &&
    !(drySurvives && drinksPotion(top)) &&
    potionLethal.length === 0 &&
    stopLine === null &&
    !avoidsTop;
  // A random potion that beats the best potion-free line in some sample is a real choice: Jev's (like a
  // modelled potion's line). An unsimulated potion always is: nothing shows code's line beats it.
  const mcForces = mcSources.size > 0 && randomPotions().some((mc) => mc.beats > 0);
  if (clear && !mcForces && potions.length === 0) {
    // Code's own pick in an elite/boss fight meets the same HP bound as Jev's (7DXA F33 T1-T2: code
    // traded -17 and -20 against the Kaiser Crab with Blood Wall lines at -3..-6 in hand, Jev was never
    // asked, and T4's laser killed us exactly). Not recorded against the fight's budget: that is for
    // extra HP a model chose to accept.
    // The guard picks among potion-free lines while one survives (code never drinks on its own).
    const autoGuardLines = surviving.filter((plan) => !drinksKeptPotion(plan) && (!drySurvives || !drinksPotion(plan)));
    // THIEF_COST: no swap that loses more loot this turn than the HP it saves (no rollout here: a thief's last turn only).
    const autoLootOk = (plan: Plan) => !lootOn() || lootSwapOk(top, plan, (line) => lastTurnLoot(line, thieves));
    let guarded =
      (kind === "elite" || kind === "boss") && !top.outcome.winsFight
        ? hpGuardReplacement(top, autoGuardLines, playerSim.hp, hpGuardSlack(playerSim.hp, kind, hpGuardExtra(env)), autoLootOk)
        : hallwayGuard && !top.outcome.winsFight
          ? hpGuardReplacement(top, autoGuardLines, playerSim.hp, hallwayGuardSlack, autoLootOk)
          : null;
    if (guarded && guardKeepsSetup(top, guarded)) guarded = null;
    // Racing the Waterfall Giant's eruption, damage is the defence (KG0E F17: the guard swapped four
    // lines, ~66 damage, one to a 0-damage turn; the boss healed and the eruption outgrew us).
    if (raceEruption) guarded = null;
    // SL_RETRY_EXPLORE_TURN: nor a guard's swap into a line ending the deviation turn as a failed attempt's did.
    if (guarded && avoidOf && endsTried(guarded) && !endsTried(top)) guarded = null;
    // SL_RETRY_EXPLORE_WHOLE: code's line ends the deviation's turn as a failed one, no other could: planCombatTurn logs it.
    const codeLine = guarded ?? top;
    if (avoidWhole && endsTried(codeLine)) slAvoidFailed = { plan: codeLine, reason: avoidFailReason(codeLine) };
    // SL_RETRY_EXPLORE_REPLAY_CODE: on a board of the reference path code's own line is not the reference's there (attempt 1
    // planned without the known draws): the reference's logged plays from the board, when they can be played here and do not
    // die this turn where code's line does not; never instead of a winning line.
    const replay = env.sl?.explore?.replay;
    if (replay?.code === true && replay.plays && solvedInput && !codeLine.outcome.winsFight) {
      try {
        // Its line there is the reference's (by text: the controller counts it so) or the reference's plays are played; a
        // longer line that only starts with them would be counted as leaving the path (RJZGFGNYK56W F33 T5 on attempt 1's path:
        // 「心神不宁, 打击, 打击, 熔融之拳, 打击」 for attempt 1's 「心神不宁, 打击, 打击」, re-planned after 心神不宁 either way).
        const logged = lineText(codeLine.steps) === replay.line ? null : loggedLine(solvedInput, replay.plays);
        if (logged && !(logged.outcome.dies && !codeLine.outcome.dies)) {
          const plays = replay.plays.length > 0 ? replay.plays.join(", ") : "end turn";
          const at = replay.point.split(",")[0];
          const reason = `code's own line (${lineText(codeLine.steps)}) is not attempt ${replay.reference}'s here: its plays from this board (${plays}), replayed to reach ${at}`;
          slReplayedCode = { plan: logged, reason, log: { point: replay.point, reference: replay.reference, line: replay.line, original: lineText(codeLine.steps), overridden: true, reason, logged: true, code: true, plays: [...replay.plays] } };
          commit(env, state.turn, logged, hand, "code");
          return {
            kind: "act",
            label: "combat/plan",
            intent: firstIntent(logged, hand, env),
            rationale: `SL explore: replaying attempt ${replay.reference}'s plays from this board, ${lineText(logged.steps)}, instead of code's ${lineText(codeLine.steps)} before ${at}${calcNote}`,
          };
        }
      } catch {
        // code's line, as without it
      }
    }
    if (guarded) {
      commit(env, state.turn, guarded, hand, "code");
      return {
        kind: "act",
        label: "combat/plan-guarded",
        intent: firstIntent(guarded, hand, env),
        rationale: `${guardedText(top, guarded)}${calcNote}`,
      };
    }
    commit(env, state.turn, top, hand, "code");
    const margin = second
      ? "dominates every other line"
      : surviving.length === 1
        ? "only line"
        : top === best
          ? "only distinct line"
          : "dominates the score-best line";
    return {
      kind: "act",
      label: "combat/plan",
      intent: firstIntent(top, hand, env),
      rationale: `code plan (${margin}): ${top.steps.length ? top.steps.map(stepText).join(", ") : "end turn"}; ${hpText(top.outcome.hpLoss)}, dmg ${top.outcome.damageDealt}${calcNote}`,
    };
  }

  // 4. A judgement call (or a dangerous turn with potions available): ask Jev.
  const focusDamage = (plan: Plan): number | null => {
    if (focusIndex === null) return null;
    const before = enemies.find((enemy) => enemy.index === focusIndex);
    const after = plan.outcome.enemyHpAfter.find((entry) => entry.index === focusIndex);
    return before && after ? Math.max(0, before.hp - after.hp) : null;
  };
  const fitOf = (plan: Plan): Record<string, JsonValue> => (fightPlan ? { fight_plan_fit: planFit(fightPlan, plan.steps, focusDamage(plan)) } : {});
  // The focus lines join the options shown (see `focusOf` above), in the cap like a potion's slot.
  for (const line of focusOf.keys()) if (!options.includes(line)) options.push(line);
  const kill = killOrders(groups);
  const focusNote = (plan: Plan): Record<string, JsonValue> => (focusOf.has(plan) ? { focus: focusOf.get(plan)!.join(", ") } : {});
  // Rollout FACTS (rollout-live.ts): code's options and their order are settled above; the rollout only
  // adds numbers to each, and its best line as one more option when code did not show it. The HP guard,
  // the potion rules and code's rank keep working on code's own `options`.
  const mcShown = mcSources.size > 0 ? randomPotions() : [];
  const mcMedians = mcShown.map((mc) => mc.median).filter((plan): plan is Plan => plan !== null);
  // The rollout plays each random potion's median sample line; its later turns may drink the random
  // potions still held at their expected value (card-model's model of them, as before).
  const rolloutSolver: SolverInput | null =
    solvedInput === null
      ? null
      : {
          ...(solvedInput as SolverInput),
          hand: [
            ...(solvedInput as SolverInput).hand,
            ...potionsAll
              .filter((potion) => mcSources.has(potion.slot))
              .map((potion) => modelPotion(potion.potion_id, potion.name, potion.slot, potion.valid_targets, potionContext))
              .filter((card): card is CardModel => card !== null)
              .map((card) => withPotionCost(card, costs)),
          ],
        };
  // The "no potion this fight" line (Dai 2026-09-30), on every question with a potion to drink outside a boss fight
  // (there potions cost 0: nothing to keep them for): code's best potion-free option this turn, rolled out with no
  // potion in its later turns either, as an option beside the others. Its own copy of the Plan; when the option's
  // own rollout drinks nothing later either, the two are one line (rollout-live merges them) and the option is tagged.
  // Part of the potion costs: POTION_COST=off leaves it out with them.
  // SL_RETRY_COMPUTE: this question's rollout budget, at most what is left of the turn's (this attempt's: the key has it).
  const retryTurn = slCompute ? `${fightKey(state)}:${env.sl?.attempt ?? "?"}:${state.turn ?? "?"}` : null;
  const retrySpent = retryTurn !== null && env.screenMemory.slRetryCompute?.turn === retryTurn ? env.screenMemory.slRetryCompute.spentMs : 0;
  const retryBudgetMs = slCompute ? Math.max(rolloutLiveOptions.budgetMs, Math.min(slCompute.rolloutBudgetMs, slCompute.turnBudgetMs - retrySpent)) : rolloutLiveOptions.budgetMs;
  const costsOn = potionCostOptions.enabled && potionsAll.length > 0;
  // The SL retry compute memo (src/sim/compute-memo.ts): a retried fight's rollouts and B2 runs on a board an earlier
  // attempt planned come back from it, the same numbers; any other fight has none.
  const computeMemo: ComputeMemo | null = env.sl ? computeMemoFor(`${String(state.raw["run_id"] ?? "")}:${fightKey(state)}`) : null;
  if (!env.sl) dropComputeMemo();
  const noPotionBase = costsOn && kind !== "boss" && allDie === null ? options.find((plan) => !drinksPotion(plan)) : undefined;
  const noPotionCopy: Plan | undefined = noPotionBase ? { ...noPotionBase } : undefined;
  const runRollout = (escapes: boolean): LiveRollout | null =>
    rolloutLiveOptions.enabled && rolloutSolver !== null
    ? liveRollout({
        state,
        knowledge: env.knowledge,
        memory: env.screenMemory,
        solver: rolloutSolver,
        plans: surviving,
        shown: [...options, ...mcMedians, ...(noPotionCopy ? [noPotionCopy] : [])],
        piles: rolloutPiles(state, env.knowledge, enemyTargets),
        ...(knownTop ? { drawTop: knownTop.indices, ...(knownTop.added.length > 0 ? { drawAdded: knownTop.added } : {}) } : {}),
        ...(slCompute ? { samples: slCompute.rolloutSamples, budgetMs: retryBudgetMs } : {}),
        spentMs: mcShown.reduce((sum, mc) => sum + mc.ms, 0),
        orders: kill.orders,
        ordersDropped: kill.dropped,
        ...(noPotionBase && noPotionCopy ? { noPotion: { line: noPotionCopy, base: noPotionBase } } : {}),
        // THIEF_FACTS: an enemy whose Escape / Flee resolves leaves the rollout's fight; the loot back or gone per sample.
        ...(escapes ? { thieves } : {}),
        // SANDPIT_START: the Sandpit the Insatiable's Liquify Ground starts, in the later turns too (absent: rollout-live's default).
        ...(env.sandpitStart !== undefined ? { sandpitStart: env.sandpitStart } : {}),
        ...(computeMemo ? { memo: computeMemo } : {}),
      })
    : null;
  let rollout = runRollout(thiefOn && !thiefFailed);
  // SL_RETRY_COMPUTE: the turn's spent time (the random potions' and the rollout's), for the next question of the turn.
  // A memo hit is charged the stored run's time as well, as if it had run (the next question's budget as it would be).
  const rolloutCharged = (r: LiveRollout | null) => (r?.elapsedMs ?? 0) + (r?.available && r.memo ? r.memo.ms : 0);
  if (retryTurn !== null) env.screenMemory.slRetryCompute = { turn: retryTurn, spentMs: retrySpent + mcShown.reduce((sum, mc) => sum + mc.ms, 0) + rolloutCharged(rollout) };
  // THIEF_FACTS fail safe: a rollout that failed with the escapes in it runs again as before, the thief facts dropped.
  if (thiefOn && !thiefFailed && rollout !== null && !rollout.available && rollout.reason.startsWith("error")) {
    thieves = [];
    thiefFailed = true;
    rollout = runRollout(false);
  }
  // THIEF_FACTS: a thief that leaves later (or the Merc, whose gold goes to the Fat Gremlin): the rollout's line most
  // often getting the loot back before it leaves is among the options, kept through the trim like the killing line of
  // a thief's last turn (rollout-live.ts rolloutKillLine, thief.ts shownKillLine). A line Jev picks among them is still
  // the HP guard's to bound like any pick (the Hopper alone: killing it wins the fight, which the guard never swaps).
  // Each option's thief fact (this turn exact, then the rollout's samples) and thief_context are made here too, for
  // every line that can be shown: an error in any of it drops them all and the rollout runs again as before (fail safe).
  let thiefRollout: Plan | null = null;
  let thiefKept: Plan[] = [];
  let thiefFacts = new Map<Plan, string>();
  let thiefContext: Record<string, JsonValue> | null = null;
  if (thieves.length > 0) {
    try {
      const rolled = rollout?.available ? rollout : null;
      thiefRollout = rolled ? rolloutKillLine(rolled.result.lines, (line) => line.plan !== noPotionCopy && (options.includes(line.plan) || !drinksPotion(line.plan)), options, thieves) : null;
      thiefKept = [shownKillLine(thiefRollout && !options.includes(thiefRollout) ? [...options, thiefRollout] : options, thieves), thiefRollout].filter((plan): plan is Plan => plan !== null);
      for (const plan of new Set([...options, ...(thiefRollout ? [thiefRollout] : []), ...mcMedians, ...(rolled ? rolled.result.lines.map((line) => line.plan) : [])])) {
        // THIEF_COST: the samples of the line losing each thief's loot (rollout.ts thiefLost), for its loot cost.
        const line = rolled?.byPlan.get(plan);
        const lostOf = (thief: Thief) => (line?.thiefLost && line.thiefLost[thiefTag(thief)] !== undefined ? { lost: line.thiefLost[thiefTag(thief)]!, samples: line.samples } : null);
        thiefFacts.set(plan, thiefFact(plan, thieves, (thief) => thiefSamples(line, thief), state.turn ?? null, undefined, lostOf));
      }
      thiefContext = thiefContextJson(thieves, state.turn ?? null);
    } catch {
      thieves = [];
      thiefFailed = true;
      thiefRollout = null;
      thiefKept = [];
      thiefFacts = new Map();
      thiefContext = null;
      rollout = runRollout(false);
    }
  }
  const thiefRolloutAdded = thiefRollout !== null && !options.includes(thiefRollout);
  if (thiefRollout && thiefRolloutAdded) options.push(thiefRollout);
  // The no-potion line as its own option (not merged), or the option it is (merged, or no rollout: the base line).
  const noPotionRolled = rollout?.available ? rollout.noPotion : null;
  const noPotionOwn = noPotionRolled && !noPotionRolled.merged ? noPotionRolled.line : null;
  // Options tied for the rollout's best (the same numbers as Jev reads them): none of them is flagged best.
  const rolloutTiedAll = rollout?.available ? rollout.tied : [];
  const rolloutBest = rollout?.available ? rollout.best : null;
  const rolloutBestIsPotion = rolloutBest !== null && mcMedians.includes(rolloutBest);
  const offerPotions = potions.length > 0;
  const unsimulatedKeys = offerPotions ? potions.reduce((sum, potion) => sum + (potion.requires_target ? Math.min(2, potion.valid_targets.length) : 1), 0) : 0;
  // The 10-option cap holds a slot for every random potion and unsimulated drink shown: plan lines make room.
  const keep = new Set<Plan>([top, ...potionLethal, ...(setupClose && setupLine ? [setupLine] : []), ...focusOf.keys(), ...(noPotionBase ? [noPotionBase] : []), ...thiefKept]);
  const planOptions = trimForPotionOptions(options, mcShown.length + unsimulatedKeys + (noPotionOwn ? 1 : 0), keep);
  options.splice(0, options.length, ...planOptions);
  const shown = [...options, ...(noPotionOwn ? [noPotionOwn] : []), ...(rolloutBest && !rolloutBestIsPotion && !options.includes(rolloutBest) && rolloutBest !== noPotionOwn ? [rolloutBest] : [])];
  // B2 (BOSS_SIM_LINES, boss fights only; docs/boss-sim.md §11): every shown line and random potion line played to the
  // fight's end on the same samples. A boss the simulator is trusted on ranks the lines by it (simRanks: rollout_best,
  // ties, the HP guard, code's fallback) and shows its numbers; a low-trust boss's numbers and plan only go to the
  // decision log (V4.2, Dai 2026-10-01: its question is the pre-B2 one). Out of a boss fight, no pool is kept.
  if (kind !== "boss") releaseBossLinesPool();
  // BOSS_SIM_LOW_TRUST=retry (default): a low-trust boss is simulated only on an SL retry, where its numbers are shown; on
  // a first attempt they only went to the log, and the sim's cores cut this question's rollout. The question is the same.
  const lowTrustSkipped = bossLinesOptions.lowTrust === "retry" && kind === "boss" && env.sl?.showSim !== true && lowTrustOfState(state) !== null;
  const bossPiles = kind === "boss" && bossLinesOptions.enabled && !lowTrustSkipped && rolloutSolver !== null ? rolloutPiles(state, env.knowledge, enemyTargets) : null;
  const bossSim: BossLineSim | null =
    kind === "boss" && bossLinesOptions.enabled && rolloutSolver !== null
      ? lowTrustSkipped
        ? { available: false, reason: `low-trust boss (${lowTrustOfState(state)}): simulated on SL retries only (BOSS_SIM_LOW_TRUST=retry)`, ms: 0 }
        : bossPiles
        ? bossLineSim({
            state,
            knowledge: env.knowledge,
            memory: env.screenMemory,
            solver: rolloutSolver,
            piles: knownTop ? { ...bossPiles, drawTop: knownTop.indices, ...(knownTop.added.length > 0 ? { drawAdded: knownTop.added } : {}) } : bossPiles,
            randomPotions: [...mcSources.values()],
            lines: [...shown, ...mcMedians],
            turn: state.turn ?? null,
            drinks: drinksPotion,
            ...(slCompute ? { samples: slCompute.bossSimSamples } : {}),
            ...(computeMemo ? { memo: computeMemo } : {}),
          })
        : { available: false, reason: "no draw/discard piles in the state", ms: 0 }
      : null;
  const simRanks = bossSim?.available && !bossSim.lowTrust ? bossSim : null;
  // SL_RETRY_SHOW_SIM (docs/sl.md): on a retried boss fight a low-trust boss's numbers are shown too, labelled; the
  // ranking (simRanks) stays the trusted bosses' only.
  const slLowTrustSim = env.sl?.showSim === true && bossSim?.available === true && bossSim.lowTrust !== null ? bossSim.lowTrust : null;
  const simShown = bossSim !== null && ((bossSim.available ? bossSim.lowTrust : lowTrustOfState(state)) === null || slLowTrustSim !== null);
  const simFact = (plan: Plan): Record<string, JsonValue> => {
    const line = simShown && bossSim?.available ? bossSim.byPlan.get(plan) : undefined;
    return line ? { whole_fight_sim: line.text } : {};
  };
  // Every option's potion cost fact (Dai 2026-09-30), when a potion can be drunk on this board.
  const costNote = (plan: Plan): Record<string, JsonValue> =>
    costsOn ? { potion_cost: potionCostFact(plan, rollout?.available ? (rollout.byPlan.get(plan) ?? null) : null, costs) } : {};
  // THIEF_FACTS: each option's thief fact, made with the coverage after the rollout (fail safe there).
  const thiefNote = (plan: Plan): Record<string, JsonValue> => (thiefFacts.has(plan) ? { thief: thiefFacts.get(plan)! } : {});
  const noPotionNote = (plan: Plan): Record<string, JsonValue> => {
    if (noPotionOwn && plan === noPotionOwn) {
      const base = noPotionRolled!.base;
      const at = shown.indexOf(base);
      return { no_potion_fight: `the no-potion line: the same turn as ${at >= 0 ? `plan${at + 1}` : lineLabel(base)}, and no potion for the rest of this fight (its rollout's later turns drink none${at >= 0 ? `; plan${at + 1}'s may` : ""})` };
    }
    if (noPotionBase && plan === noPotionBase && !noPotionOwn) {
      return { no_potion_fight: noPotionRolled ? "the no-potion line: no potion this turn, and the rollout's later turns drink none either" : "the no-potion line: no potion this turn (no rollout of the later turns)" };
    }
    return {};
  };
  // Tied lines still on the question (a plan line may have been trimmed for a potion's slot).
  // In the question's order (a drink line tied with its dry twin can come first in the rollout's list).
  const shownOrder = (plan: Plan): number => (shown.includes(plan) ? shown.indexOf(plan) : shown.length + mcMedians.indexOf(plan));
  const rolloutTied = (simRanks ? simRanks.tied : rolloutTiedAll).filter((plan) => shown.includes(plan) || mcMedians.includes(plan)).sort((a, b) => shownOrder(a) - shownOrder(b));
  const mcKey = (mc: PotionMc) => potionsAll.find((potion) => potion.slot === mc.source.slot)?.key ?? `p${mc.source.slot}`;
  const keyOfShown = (plan: Plan): string => (mcMedians.includes(plan) ? mcKey(mcShown.find((mc) => mc.median === plan)!) : `plan${shown.indexOf(plan) + 1}`);
  const tiedKeys = rolloutTied.length >= 2 ? rolloutTied.map(keyOfShown) : [];
  // One tied line left after the trim reads as the best among what is shown.
  const bestShown = rolloutTied.length === 1 ? rolloutTied[0]! : simRanks ? simRanks.best : rolloutBest;
  const bestShownIsPotion = bestShown !== null && mcMedians.includes(bestShown);
  const tieNote = (plan: Plan): Record<string, JsonValue> => {
    if (tiedKeys.length === 0 || !rolloutTied.includes(plan)) return {};
    const others = tiedKeys.filter((key) => key !== keyOfShown(plan));
    if (simRanks) return { rollout_tied: `tied for the best whole-fight simulation numbers with ${others.join(", ")} (the same simulated win rate and HP lost when won); the ranking picks none of them` };
    const same = rollout?.available && rollout.saturated ? "every line loses all our HP; the same deaths, enemy HP left, turns alive and HP lost this turn" : "the same expected further HP loss, deaths and win chance";
    return { rollout_tied: `tied for the best rollout numbers with ${others.join(", ")} (${same}); the rollout picks none of them` };
  };
  const phaseFacts = silentPhaseReference(state, shown.map((plan, index) => ({ key: `plan${index + 1}`, plan })));
  const lossFacts = silentLossReference(state, shown.map((plan, index) => ({ key: `plan${index + 1}`, plan })), rolloutTied);
  const factsOf = (plan: Plan): Record<string, JsonValue> => ({
    ...(rollout ? { ...rolloutFacts(plan, rollout), ...(plan === bestShown ? { rollout_best: true } : {}), ...tieNote(plan) } : {}),
    ...simFact(plan),
    ...phaseFacts.get(plan),
    ...lossFacts.get(plan),
  });
  const criteria: Record<string, string | null> = {};
  const byKey = new Map<string, { plan?: Plan; potion?: ActionRequest; label: string }>();
  shown.forEach((plan, index) => {
    const key = `plan${index + 1}`;
    criteria[key] = JSON.stringify({ ...focusNote(plan), ...describePlan(plan, playerSim.maxHp), ...potionLethalNote(plan), ...noEffectNote(plan, surviving), ...noPotionNote(plan), ...fitOf(plan), ...factsOf(plan), ...costNote(plan), ...thiefNote(plan) });
    byKey.set(key, { plan, label: `${focusOf.has(plan) ? `focus: ${focusOf.get(plan)!.join(", ")} — ` : ""}${plan.steps.map(stepText).join(", ") || "end turn"}${plan === noPotionOwn ? " — no potion this fight" : ""}` });
  });
  const rolloutRecord = rollout
    ? rolloutLog(rollout, bestShown ? keyOfShown(bestShown) : null, bestShown !== null && !bestShownIsPotion && !options.includes(bestShown) && bestShown !== noPotionOwn, tiedKeys, noPotionRolled ? (shown.includes(noPotionOwn ?? noPotionRolled.base) ? keyOfShown(noPotionOwn ?? noPotionRolled.base) : null) : null)
    : null;
  // Random potions: always an option (Dai 2026-09-28), "drink now, then re-plan", with the Monte Carlo
  // distribution; the rollout facts are the median sample's line's.
  const othersHeld = potionsAll.length > 1;
  for (const mc of mcShown) {
    const key = mcKey(mc);
    const rolled = rollout && mc.median ? rolloutFacts(mc.median, rollout) : null;
    const facts = {
      ...(rolled ? { ...rolled, rollout: `the median sample's line: ${String(rolled["rollout"])}`, ...(mc.median === bestShown ? { rollout_best: true } : {}), ...(mc.median ? tieNote(mc.median) : {}) } : {}),
      ...(mc.median ? simFact(mc.median) : {}),
    };
    const mcCost = !costsOn
      ? {}
      : mc.median
      ? { potion_cost: potionCostFact(mc.median, rollout?.available ? (rollout.byPlan.get(mc.median) ?? null) : null, costs) }
      : { potion_cost: `drinking it costs ${costs.get(mc.source.potionId) ? potionCostText(costs.get(mc.source.potionId)!) : "0 (no conversion value in the potion table)"}` };
    criteria[key] = JSON.stringify({ ...potionMcCriteria(mc, dryBest, lineLabel, othersHeld), ...facts, ...mcCost, ...(mc.median ? thiefNote(mc.median) : {}) });
    byKey.set(key, { potion: { action: "use_potion", option_index: mc.source.slot }, label: `drink ${mc.source.name}, then re-plan` });
  }
  // Unsimulated potions: always an option, with no invented numbers.
  if (offerPotions) {
    for (const potion of potions) {
      const targets: (number | null)[] = potion.requires_target ? potion.valid_targets : [null];
      for (const target of targets.slice(0, 2)) {
        const key = target === null ? potion.key : `${potion.key}->e${target}`;
        const enemyName = target === null ? null : enemies.find((enemy) => enemy.index === target)?.name ?? `enemy ${target}`;
        const keptBy = planOffer(potion.potion_id) === false ? fightPlan?.potions[potion.potion_id] : undefined;
        // Entropic Brew: its effect is known (random potions into its own slot and every empty one), only which potions
        // is not; the turn is re-planned with them.
        const brewGives = potion.potion_id === "ENTROPIC_BREW" ? entropicBrewPotions(state) : null;
        criteria[key] = JSON.stringify({
          plays:
            brewGives !== null
              ? `drink ${potion.name} first: ${potion.text} (${brewGives} random potion${brewGives === 1 ? "" : "s"}: its own slot and the ${brewGives - 1} empty one${brewGives === 2 ? "" : "s"}), then re-plan the turn with them`
              : `drink ${potion.name}${enemyName ? ` on ${enemyName}` : ""} first: ${potion.text}; effect not simulated, then re-plan the turn`,
          simulated:
            brewGives !== null
              ? "not this turn: which potions it gives is random, so no HP or damage numbers until they are in hand (the re-planned turn simulates them)"
              : "no: this potion's effect is not simulated, so no HP or damage numbers for it",
          offered: UNSIMULATED_OFFERED,
          note: `the cheapest card plan alone: ${hpText(Math.min(...options.map((plan) => plan.outcome.hpLoss)))} this turn`,
          ...(keptBy ? { fight_plan: `keeps it (${keptBy})` } : planOffer(potion.potion_id) === true ? { fight_plan: "says now" } : {}),
          ...(costsOn ? { potion_cost: `drinking it costs ${costs.get(potion.potion_id) ? potionCostText(costs.get(potion.potion_id)!) : "0 (no conversion value in the potion table)"}` } : {}),
          ...(rollout ? { rollout: brewGives !== null ? "not rolled out: the potions it gives are random; the turn is re-planned with them after drinking" : DRINK_FIRST_ROLLOUT } : {}),
        });
        byKey.set(key, {
          potion: target === null ? { action: "use_potion", option_index: potion.slot } : { action: "use_potion", option_index: potion.slot, target_index: target },
          label: `drink ${potion.name}`,
        });
      }
    }
  }

  // DeepSeek's run plan and the experience base's lessons about these enemies: advice for Jev to weigh.
  const deepseekPlan = deepseekPlanLine(env);
  const lessons = fightLessons(state);
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
      .map((enemy, i, living) => ({
        // The names the options use (distinctNames: same-named enemies told apart).
        name: distinctNames(living.map((other) => ({ name: str(other["name"], str(other["enemy_id"])), id: str(other["enemy_id"]) })))[i]!,
        hp: `${num(enemy["current_hp"])}/${num(enemy["max_hp"])}`,
        block: num(enemy["block"]),
        intents: asArray(enemy["intents"]).map((intent) => `${str(asRecord(intent)["intent_type"])} ${str(asRecord(intent)["label"])}`).join(", "),
        // Id and amount, the game's name and description (46 of 62 logged enemy powers reached Jev as a bare
        // id), then code's note where the id alone misleads (POWER_NOTES).
        powers: asArray(enemy["powers"]).map((entry) => {
          const power = asRecord(entry);
          // MECH_RULES: a learned strip-stun on this power, as the logs show it (none with the switch off).
          const sim = enemies.find((other) => other.index === (numOrNull(enemy["index"]) ?? i));
          return `${enemyPowerText(power, env.knowledge)}${POWER_NOTES[str(power["power_id"])] ?? ""}${stripStunNote(sim, str(power["power_id"]), mechRules)}${moveRuleNote(sim, str(power["power_id"]))}${backAttackPairNote(env, str(power["power_id"]), living.length)}`;
        }),
        // MECH_DEATH_MOVE: what an ally's death does to its move, as the logs show it (none with the switch off).
        ...((note): Record<string, string> => (note ? { observed: note } : {}))(deathRuleNote(enemies.find((other) => other.index === (numOrNull(enemy["index"]) ?? i)))),
        // Powers the solver does not model: the options' damage into this enemy is counted at 80% (to stay safe).
        ...(unmodelledEnemyPowers(enemy).length > 0 ? { not_modelled: `${unmodelledEnemyPowers(enemy).join(", ")}: not simulated, so the options count damage into this enemy at 80%` } : {}),
      })),
    note: "Each option is a whole turn, already simulated by code; its numbers are exact for this turn. Choose the one that is best for winning the whole fight, not just this turn.",
    // Facts for judging a potion (Jev's call): belt, act boss, Elite ahead, boss clock, run plan.
    potion_context: { ...potionContextJson(env, kind), ...potionCostContext(costs, kind, costsOn && kind !== "boss" && noPotionBase === undefined) },
    // THIEF_FACTS: who carries our card or gold, how many turns are left to kill it, its HP and block (thief.ts).
    ...(thiefContext ? { thief_context: thiefContext } : {}),
    // B2: how to read each option's whole_fight_sim, and the fight plan from the best line's winning samples (information).
    ...(bossSim && simShown ? { whole_fight_sim: simNote(bossSim), ...(bossSim.available && bossSim.plan ? { whole_fight_plan: `the simulation's best line, from its samples (information, not an order): ${bossSim.plan}` } : {}) } : {}),
    ...(slLowTrustSim !== null
      ? { whole_fight_sim_trust: `低可信 (low trust): the simulator is not validated on this boss (${slLowTrustSim}). Its numbers are shown only because this fight is an SL retry, to help find another approach; no option is ranked by them.` }
      : {}),
    // SL (docs/sl.md): how the earlier attempts at this fight went (a retried fight only).
    ...(env.sl ? { previous_attempts: env.sl.previousAttempts } : {}),
    // SL_RETRY_KNOWN_DRAWS: the next cards of the draw pile, known from the earlier attempt (one fact line).
    ...(knownTop ? { known_draws: knownDrawsFact(knownTop.names, knownTop.attempts, knownTop.addedNames) } : {}),
    // Heads the advice below (run plan, lessons, fight plan, fight hints): the data wins over hand-written advice.
    knowledge_rule: JEV_DATA_OVER_GUIDES,
    ...(deepseekPlan ? { deepseek_plan: deepseekPlan } : {}),
    ...(lessons.length > 0
      ? {
          experience: {
            note: "lessons from past runs about these enemies (experience base): evidence, not orders",
            lessons: lessons.map((entry) => jevLessonLine(entry, state.run?.ascension ?? undefined)),
          },
        }
      : {}),
    ...(fightPlan ? { fight_plan: fightPlanJson(fightPlan) } : {}),
  };

  // JEV_CONTEXT=v1: Jev gets fact tags on every plan, fight hints and a combat-only brief. The
  // escalator keeps the original question (same keys, so resolve() serves both).
  let jevView: AskDecision["jevView"];
  if (env.jevContext === "v1") {
    const liveEnemies = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
    const nextThreat = new Map<number, number | null>(
      liveEnemies.map((enemy, fallbackIndex) => [numOrNull(enemy["index"]) ?? fallbackIndex, multiClawNext(enemy) ?? expectedNextDamage(str(enemy["enemy_id"]), str(enemy["move_id"]), boardDamageContext(enemy, player, ascension), deathExcluded.get(numOrNull(enemy["index"]) ?? fallbackIndex))]),
    );
    const illusions = liveEnemies.filter((enemy) => powerAmount(enemy, "ILLUSION_POWER") > 0);
    const dead = revivingIllusions(combat).map((enemy) => revivingForecast(str(enemy["enemy_id"]), 1, boardDamageContext(enemy, player, ascension))?.[0] ?? null).filter((hit): hit is number => hit !== null);
    const ctx: FactContext = {
      maxHp: playerSim.maxHp,
      hand,
      enemies,
      nextThreat,
      summonedThreat: new Map(liveEnemies.map((enemy, fallbackIndex) => [numOrNull(enemy["index"]) ?? fallbackIndex, summonThreat(enemy)])),
      noAttack: enemies.every((enemy) => enemy.attacks.length === 0),
      ...(illusions.length > 0
        ? { revivingThreat: new Map(illusions.map((enemy) => [numOrNull(enemy["index"]) ?? liveEnemies.indexOf(enemy), revivingForecast(str(enemy["enemy_id"]), 1, boardDamageContext(enemy, player, ascension))?.[0] ?? null])) }
        : {}),
      ...(dead.length > 0 ? { revivedThreat: dead.reduce((sum, hit) => sum + hit, 0) } : {}),
    };
    const jevCriteria: Record<string, string | null> = { ...criteria };
    shown.forEach((plan, index) => {
      jevCriteria[`plan${index + 1}`] = JSON.stringify({ ...focusNote(plan), ...describePlan(plan, playerSim.maxHp), ...potionLethalNote(plan), ...noEffectNote(plan, surviving), ...noPotionNote(plan), ...planFacts(plan, ctx), ...fitOf(plan), ...factsOf(plan), ...costNote(plan), ...thiefNote(plan) });
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
    if (hints.length > 0) jevState["fight_hints"] = hints.map((hint) => hintText(hint, state.run?.ascension ?? 0));
    // V4 M3: evidence on keeping potions for the act boss (the run plan's words included) and on this fight's
    // mechanics, beyond the lessons about these enemies. Evidence only: no option, score or rollout changes.
    const extra = jevExperience({ state, kind, runPlan: currentRunPlan(env), ...(env.brief.plan ? { briefPlan: env.brief.plan } : {}), knowledge: env.knowledge, shown: lessons.map((entry) => entry.id) });
    if (extra.potion) jevState["potion_experience"] = extra.potion;
    if (extra.mechanics) jevState["mechanics_experience"] = extra.mechanics;
    jevView = {
      state: jevState,
      questions: { plan: choiceQ("Which plan should I play this turn?", jevCriteria) },
      context: "v1",
      hints: hints.map((hint) => hint.id),
    };
  }

  // resolve() is pure: it may run twice for one decision (Jev's answer, then the escalator's). The
  // loop runs `apply` once, for the resolution it actually plays.
  // Code's own line when Jev gives no usable answer: never one that drinks while a potion-free option is shown.
  // After a finished chosen line (stopLine), no answer keeps its end: the turn ends.
  // B2: in a boss fight the simulator is trusted on, its best potion-free line (the same ranking as rollout_best).
  const simFallback = simRanks?.bestDry ?? null;
  // THIEF_COST: code's rank has no loot in it; the rollout's ranking has. With a loot cost in play, the fallback is the
  // rollout's best when it is a shown line drinking no potion (else as before).
  const lootFallback = lootOn() && rollout?.available && rollout.result.lines.some((line) => (line.thiefCost ?? 0) > 0) && bestShown !== null && options.includes(bestShown) && !drinksPotion(bestShown) ? bestShown : null;
  const autoTop = stopLine ?? simFallback ?? lootFallback ?? (drinksPotion(top) ? (dryFirst(options) ?? top) : top);
  // SL_RETRY_EXPLORE (docs/sl.md §11, src/sl/explore.ts), on an SL retry: the line each resolution plays, noted for the
  // attempt's record (notePick); on the deviation point's board, a line a failed attempt played there gives way to the shown
  // line the question's ranking puts first among those none played (explored, in resolve). Nothing runs without env.sl.explore.
  type PickedLine = { plan: Plan | null; text: string; potions: string[]; wins: boolean; via: CombatPlanMemo["via"]; guardExtra?: (line: Plan) => number; rated?: Plan | null; canon?: string; loose?: string; open?: boolean; committed?: string };
  // SL_RETRY_EXPLORE_ANCHOR: a first attempt's recording env (env.slRecord: `played` only) records the same way and changes
  // nothing (no deviate, replay or avoid in it).
  const explore = env.sl?.explore ?? env.slRecord;
  const picks = new WeakMap<ResolvedAction, PickedLine>();
  const notePick = (resolved: ResolvedAction, pick: PickedLine): ResolvedAction => {
    if (explore) picks.set(resolved, pick);
    return resolved;
  };
  const fallback = (why: string, line: Plan = autoTop): ResolvedAction =>
    notePick({
      intent: firstIntent(line, hand, env),
      rationale: `${why}; ${line === stopLine ? "ending the turn where the chosen line ended" : simFallback !== null && line === simFallback ? "using the whole-fight simulation's best potion-free plan" : lootFallback !== null && line === lootFallback ? "using the rollout's best plan (its ranking counts the thief's loot)" : `using the code-best ${line === top ? "plan" : "potion-free plan"}`}`,
      confidence: null,
      fallback: true,
      apply: () => commit(env, state.turn, line, hand, "code"),
    }, { plan: line, text: lineText(line.steps), potions: potionIdsOf(line), wins: line.outcome.winsFight, via: "code" });

  const explored = (resolved: ResolvedAction, label: string): { resolved: ResolvedAction; log: JsonValue | null; info: SlPointInfo | null } => {
    const noted = explore ? picks.get(resolved) : undefined;
    if (!explore || !noted) return { resolved, log: null, info: null };
    try {
      // SL_RETRY_EXPLORE_CANON / _TURN (explore.played): every line's turn if it is played, the plays already made this turn
      // counted in (turnKeys: none with both off, the lines and the record as before them).
      const played = explore.played;
      /** A potion option's drink (Jev's pick of it, a random potion's line): its play and its summary text. */
      const drinkOf = (slot: number | undefined, targetIndex: number | undefined, potionId?: string): { canon: string; text: string } | undefined => {
        const potion = potionsAll.find((entry) => entry.slot === slot);
        const id = potionId ?? potion?.potion_id;
        if (id === undefined) return undefined;
        const target = targetIndex === undefined ? null : (enemies.find((enemy) => enemy.index === targetIndex)?.name ?? null);
        return { canon: playKey({ potion: id }, target), text: `potion ${potion?.name ?? id}` };
      };
      const pickDrink = noted.plan === null && resolved.intent?.action === "use_potion" ? drinkOf(resolved.intent.option_index, resolved.intent.target_index) : undefined;
      // SL_RETRY_EXPLORE_WHOLE: each line's turn by what it is sure to play before a draw re-plans it (turnOpen).
      const whole = explore.whole === true && played !== undefined;
      const openOf = (steps: readonly Step[], extra?: { canon: string }): { open?: boolean; committed?: string } => (whole ? turnOpen(played, steps, hand, extra) : {});
      const pick: PickedLine = !played
        ? noted
        : { ...noted, ...(noted.plan ? turnKeys(played, noted.plan.steps) : pickDrink ? turnKeys(played, [], pickDrink) : {}), ...(noted.plan ? openOf(noted.plan.steps) : pickDrink ? openOf([], pickDrink) : {}) };
      // SL_RETRY_EXPLORE_BOSS_POTIONS: in a boss fight (potions cost 0 there) the lines drinking a potion the pick does not
      // are alternatives too, the random potions' Monte Carlo lines among them (their option: drink it, then re-plan).
      const drinks = explore.bossPotions === true && kind === "boss";
      const mcOf = new Map<Plan, PotionMc>(drinks ? mcShown.flatMap((mc) => (mc.median ? [[mc.median, mc] as const] : [])) : []);
      /** A random potion's option as a line: drink it (its play), then re-plan. */
      const mcLine = (plan: Plan, mc: PotionMc, potions: string[]): ExploreLine<Plan> => {
        const drink = drinkOf(mc.source.slot, undefined, mc.source.potionId);
        return { plan, text: `drink ${mc.source.name}, then re-plan`, dies: plan.outcome.dies, wins: plan.outcome.winsFight, potions, ...turnKeys(played, [], drink), ...openOf([], drink ?? { canon: playKey({ potion: mc.source.potionId }, null) }) };
      };
      const lines: ExploreLine<Plan>[] = [
        ...shown.map((plan) => ({ plan, text: lineText(plan.steps), dies: plan.outcome.dies, wins: plan.outcome.winsFight, potions: potionIdsOf(plan), ...turnKeys(played, plan.steps), ...openOf(plan.steps) })),
        ...[...mcOf].map(([plan, mc]) => mcLine(plan, mc, [...new Set([mc.source.potionId, ...potionIdsOf(plan)])])),
      ];
      const estimate = (plan: Plan) => (rollout?.available ? rollout.byPlan.get(plan) : undefined);
      const deathShare = (plan: Plan): number | null => {
        const line = estimate(plan);
        return line && line.samples > 0 ? line.deaths / line.samples : null;
      };
      // SL_RETRY_EXPLORE_B2: on a boss B2 is trusted on (simRanks), B2's win rate is the gate, by its own tie rule.
      const simOf = (plan: Plan) => simRanks?.byPlan.get(plan);
      const b2: ExploreB2<Plan> | null =
        explore.b2Gate === true && simRanks
          ? {
              notWorse: (plan, than) => (simOf(plan) && simOf(than) ? !simWinsLess(simRanks, plan, than) : null),
              win: (plan) => simOf(plan)?.calibrated ?? null,
              rule: `${BOSS_LINES_TIE_SE} paired standard errors`,
              won: (plan) => simOf(plan)?.result.winProb ?? null,
            }
          : null;
      /** The line played there and the lines that could replace it, as the attempt's record keeps them (the rollout's deaths, B2's numbers). */
      const pointOf = (line: { plan: Plan | null; text: string; potions: string[]; wins: boolean; rated?: Plan | null; canon?: string; loose?: string }) => explorePoint(line, lines, { drinks, deathShare, b2 });
      /** `line` (a shown line, a random potion's) as the pick it becomes when it is played instead. */
      const asPick = (line: ExploreLine<Plan>, mc: PotionMc | undefined) => ({ plan: mc ? null : line.plan, text: line.text, potions: line.potions, wins: line.wins, rated: mc ? line.plan : null, ...(line.canon !== undefined ? { canon: line.canon, loose: line.loose } : {}) });
      const info: SlPointInfo = { kind: "question", label, ...pointOf(pick) };
      /** `line` played instead of the resolution (a random potion's line: its option, drink then re-plan), its rationale added. */
      const playInstead = (line: ExploreLine<Plan>, mc: PotionMc | undefined, why: string): ResolvedAction => {
        const { guard: _guard, ...rest } = resolved;
        const rationale = `${resolved.rationale}; ${why}`;
        return mc
          ? { ...rest, intent: { action: "use_potion", option_index: mc.source.slot }, rationale, apply: () => void (env.screenMemory.combatPlan = null) }
          : {
              ...rest,
              intent: firstIntent(line.plan, hand, env),
              rationale,
              apply: () => {
                commit(env, state.turn, line.plan, hand, pick.via);
                if (pick.guardExtra) recordHpGuard(env, state.turn, pick.guardExtra(line.plan));
              },
            };
      };
      let deviate = explore.deviate;
      // SL_RETRY_EXPLORE_REPLAY_DEVIATE: why the replay could not go on here, when the deviation is made here instead.
      let fellBack: string | null = null;
      // SL_RETRY_EXPLORE_REPLAY: a board of the reference attempt's path before the deviation point plays its line there.
      const replay = explore.replay;
      if (!deviate && replay) {
        // Its line among every shown line and random potion (it drank what it drank).
        const mcAll = new Map<Plan, PotionMc>(mcShown.flatMap((mc) => (mc.median ? [[mc.median, mc] as const] : [])));
        const all: ExploreLine<Plan>[] = [
          ...shown.map((plan) => ({ plan, text: lineText(plan.steps), dies: plan.outcome.dies, wins: plan.outcome.winsFight, potions: potionIdsOf(plan), ...turnKeys(played, plan.steps) })),
          ...[...mcAll].map(([plan, mc]) => mcLine(plan, mc, [mc.source.potionId])),
        ];
        const pickDies = (pick.plan ?? pick.rated ?? null)?.outcome.dies ?? false;
        const choiceNow = replayChoice(pick, pickDies, all, replay);
        let ref = choiceNow.line;
        let reason = choiceNow.reason;
        const at = replay.point.split(",")[0];
        const notShown = ref === null && reason === `attempt ${replay.reference}'s line is not among the options`;
        // SL_RETRY_EXPLORE_REPLAY_PLAYS: its line is not among the options (a later attempt knows more draws, and the lines
        // read otherwise): its logged plays from this board, as a line, when they can be played here.
        let logged = false;
        if (notShown && replay.plays && solvedInput) {
          const plan = loggedLine(solvedInput, replay.plays);
          const plays = replay.plays.length > 0 ? replay.plays.join(", ") : "end turn";
          if (!plan) reason = `${reason}, and its plays from this board (${plays}) cannot be played here`;
          else if (plan.outcome.dies && !pickDies) reason = `${reason}, and its plays from this board (${plays}) die this turn, the answer does not`;
          else {
            ref = { plan, text: lineText(plan.steps), dies: plan.outcome.dies, wins: plan.outcome.winsFight, potions: potionIdsOf(plan), ...turnKeys(played, plan.steps) };
            reason = `${reason}: its plays from this board (${plays}), replayed to reach ${at}`;
            logged = true;
          }
        }
        // SL_RETRY_EXPLORE_REPLAY_ORDER: a line taken as the reference's by its turn's plays alone (the answer, or the first
        // shown line with them) whose plays from this board come in another order: its logged plays in their order instead,
        // when they can be played here (the order changes the board: ABCJ0TZ6MD06 F48 attempt 4 T4).
        let reordered = false;
        if (!logged && replay.order === true && replay.plays && solvedInput && pick.text !== replay.line) {
          const canonMatch = ref !== null && ref.text !== replay.line && !mcAll.has(ref.plan) ? ref.plan : ref === null && replay.canon !== undefined && pick.canon === replay.canon ? pick.plan : null;
          if (canonMatch && !followsPlays(canonMatch.steps, replay.plays, hand)) {
            const plan = loggedLine(solvedInput, replay.plays);
            const plays = replay.plays.length > 0 ? replay.plays.join(", ") : "end turn";
            if (plan && !(plan.outcome.dies && !pickDies)) {
              ref = { plan, text: lineText(plan.steps), dies: plan.outcome.dies, wins: plan.outcome.winsFight, potions: potionIdsOf(plan), ...turnKeys(played, plan.steps) };
              reason = `${reason}; in another order than its plays from this board (${plays}): those replayed in their order to reach ${at}`;
              logged = true;
              reordered = true;
            }
          }
        }
        const loggedTag = logged ? { logged: true as const } : {};
        const loggedLog: Record<string, JsonValue> = logged ? { logged: true, plays: [...replay.plays!], ...(reordered ? { reordered: true } : {}) } : {};
        const log: JsonValue = { replay: { point: replay.point, reference: replay.reference, line: replay.line, original: pick.text, overridden: ref !== null, reason, ...loggedLog } };
        // SL_RETRY_EXPLORE_REPLAY_DEVIATE: neither its line nor its plays can be played here (or they die this turn and the
        // answer does not): the attempt leaves the path here, so it deviates here (the lines failed attempts played on this
        // board), not into a failed attempt's fight.
        const stuck = ref === null && (notShown || reason === `attempt ${replay.reference}'s line dies this turn, the answer does not`);
        if (stuck && replay.fallback && !pick.wins) {
          deviate = replay.fallback;
          fellBack = reason;
        } else {
          if (!ref) return { resolved, log, info: { ...info, replay: { overridden: false, reason } } };
          const mc = mcAll.get(ref.plan);
          const out = playInstead(ref, mc, logged ? `SL explore: replaying attempt ${replay.reference}'s plays from this board, ${ref.text}, instead of ${pick.text} before ${at} (${reordered ? `its line ${replay.line} is shown with its plays in another order` : `its line ${replay.line} is not among the options`})` : `SL explore: replaying attempt ${replay.reference}'s ${ref.text} instead of ${pick.text} before ${at}`);
          return { resolved: out, log, info: { kind: "question", label, ...pointOf(asPick(ref, mc)), replay: { overridden: true, reason, ...loggedTag } } };
        }
      }
      // SL_RETRY_EXPLORE_REPLAY_DEVIATE: the deviation made where the replay could not go on, said in the row and the info.
      const fellBackLog: Record<string, JsonValue> = fellBack !== null ? { fallback: true, replay_stopped: fellBack } : {};
      const fellBackInfo = fellBack !== null ? { replay: { overridden: false, reason: `${fellBack}: deviated here instead` } } : {};
      // SL_RETRY_EXPLORE_TURN: later in the deviation's turn, or its point's board.
      const avoid = deviate ? undefined : explore.avoid;
      if (!deviate && !avoid) return { resolved, log: null, info };
      // The question's ranking: B2's where it ranks this boss (the lines it ties, the rollout's), else the rollout's (its
      // ties: the question's order).
      const rank = (plans: Plan[]): Plan | null => {
        const byRollout = (among: Plan[]): Plan | null => {
          const estimates = among.map(estimate).filter((line): line is NonNullable<ReturnType<typeof estimate>> => line !== undefined);
          if (!rollout?.available || estimates.length === 0) return null;
          const best = pickRolloutBest(estimates, rollout.lossCap);
          return best.best?.plan ?? among.find((plan) => (best.tied ?? []).some((line) => line.plan === plan)) ?? null;
        };
        if (!simRanks) return byRollout(plans);
        const simKey = (plan: Plan): string | null => {
          const line = simRanks.byPlan.get(plan)?.result;
          return line ? `${Math.round(line.winProb * 1000)}|${Math.round(wonLoss(line) * 10)}` : null;
        };
        return rankByOrder(plans, simRanks.order, simKey, byRollout);
      };
      const choice: ExploreChoice<Plan> = exploreReplacement({
        pick,
        shown: lines,
        excluded: deviate ? deviate.excluded : [],
        deathShare,
        drinks,
        b2,
        rank,
        ...(deviate?.tried ? { tried: deviate.tried } : avoid ? { tried: avoid.tried, avoid: true } : {}),
        ...(whole ? { whole: true } : {}),
      });
      const numbers = (plan: Plan | null): string | null => {
        if (!plan) return null;
        const line = estimate(plan);
        const sim = bossSim?.available ? bossSim.byPlan.get(plan) : undefined;
        const parts = [
          ...(line ? [`rollout dead ${line.deaths}/${line.samples}, further loss ${Math.round(line.hpLoss * 10) / 10}, win ~${Math.round(line.winProb * 100)}%`] : []),
          ...(sim ? [`whole-fight sim win ${Math.round(sim.result.winProb * 1000) / 10}%`] : []),
          `this turn hp -${plan.outcome.hpLoss}, dmg ${plan.outcome.damageDealt}`,
        ];
        return parts.join("; ");
      };
      const rep = choice.replacement;
      // A boss fight with a sub-switch on: what weighed "not worse", and B2's numbers of the two lines when it did
      // (calibrated win rates, the replacement's paired difference to the pick ± its standard error). Off, or out of a boss
      // fight (where neither changes anything): the row as before them.
      const rated = pick.plan ?? pick.rated ?? null;
      const versus = rep && rated ? simCompare(simRanks, rep.plan, rated) : null;
      const gateLog: Record<string, JsonValue> =
        kind === "boss" && (explore.b2Gate === true || explore.bossPotions === true)
          ? {
              gate: choice.gate,
              ...(choice.gate === "b2" && rep && rated
                ? { b2: { original: Math.round((simOf(rated)?.calibrated ?? 0) * 1000) / 1000, replacement: Math.round((simOf(rep.plan)?.calibrated ?? 0) * 1000) / 1000, ...(versus ? { diff: versus.winDiff, se: versus.winSe } : {}) } }
                : {}),
            }
          : {};
      const numbersLog: Record<string, JsonValue> = rep ? { numbers: { original: numbers(Object.keys(gateLog).length > 0 ? rated : pick.plan), replacement: numbers(rep.plan) } } : {};
      // A random potion's line (SL_RETRY_EXPLORE_BOSS_POTIONS): its option as Jev's pick of it plays it, drink then re-plan.
      const mc = rep ? mcOf.get(rep.plan) : undefined;
      if (avoid) {
        // The turn's plays as they would end, and the ones failed attempts had through the deviation point's board.
        const avoided = { original: pick.text, replacement: rep?.text ?? null, reason: choice.reason };
        const turnLog: Record<string, JsonValue> = { ...(pick.canon !== undefined ? { turn: pick.canon } : {}), ...(rep?.canon !== undefined ? { turn_instead: rep.canon } : {}) };
        // SL_RETRY_EXPLORE_WHOLE: the answer ends the turn as a failed attempt's and no shown line keeps it off: said so.
        const failed = whole && !rep && !pick.wins && triedHas(avoid.tried, pick) ? { line: pick.text, reason: choice.reason } : null;
        const log: JsonValue = { avoid: { point: avoid.point, ...avoided, played_in: avoid.attempts, ...turnLog, ...numbersLog, ...gateLog }, ...(failed ? { avoid_failed: { point: avoid.point, played_in: avoid.attempts, ...failed, ...turnLog } } : {}) };
        if (!rep) return { resolved, log, info: { ...info, avoided, ...(failed ? { avoidFailed: failed } : {}) } };
        // SL_RETRY_EXPLORE_WHOLE: a pick not tried here that may still end the turn as a failed one after its draw.
        const ends = whole && choice.reason.startsWith(MAY_REPEAT) ? "which may end the turn after its draw with the plays" : "which ends the turn with the plays";
        const out = playInstead(rep, mc, `SL explore (the deviation's turn, ${avoid.point.split(",")[0]}): playing ${rep.text} instead of ${pick.text}, ${ends} attempt${avoid.attempts.length === 1 ? "" : "s"} ${avoid.attempts.join(", ")} had through the deviation point (${choice.reason})`);
        return { resolved: out, log, info: { kind: "question", label, ...pointOf(asPick(rep, mc)), explored: true, avoided } };
      }
      const point = deviate!;
      const log: JsonValue = {
        point: point.point,
        original: pick.text,
        replacement: rep?.text ?? null,
        reason: choice.reason,
        played_in: point.attempts,
        ...(point.replayed !== undefined ? { replayed: point.replayed } : {}),
        ...numbersLog,
        ...gateLog,
        ...(point.tried && pick.canon !== undefined ? ({ turn: pick.canon, ...(rep?.canon !== undefined ? { turn_instead: rep.canon } : {}) } as Record<string, JsonValue>) : {}),
        ...fellBackLog,
      };
      const deviation = { original: pick.text, replacement: rep?.text ?? null, reason: choice.reason };
      if (!rep) return { resolved, log, info: { ...info, deviation, ...fellBackInfo } };
      // SL_RETRY_EXPLORE_WHOLE: a pick not played here whose turn may still end as a failed one after its draw.
      const mayEnd = whole && choice.reason.startsWith(MAY_REPEAT);
      const out = playInstead(rep, mc, `SL explore (${point.point}): playing ${rep.text} instead of ${pick.text}, ${mayEnd ? "whose turn may end after its draw as it did on this board" : "played on this board"} in attempt${point.attempts.length === 1 ? "" : "s"} ${point.attempts.join(", ")} (${choice.reason})`);
      return { resolved: out, log, info: { kind: "question", label, ...pointOf(asPick(rep, mc)), explored: true, deviation, ...fellBackInfo } };
    } catch {
      // Any error: the resolution as without the switch.
      return { resolved, log: null, info: null };
    }
  };

  const resolvePlan = (answers: Parameters<AskDecision["resolve"]>[0]): ResolvedAction => {
    {
      const answer = answers["plan"];
      if (!answer || answer.type !== "choice") return fallback("no usable answer from Jev");
      const chosen = byKey.get(answer.choice);
      if (!chosen) return fallback(`Jev chose unknown option "${answer.choice}"`);
      const hallway = !(kind === "elite" || kind === "boss" || dangerous);
      const escalatedBy = answer.raw === undefined ? undefined : (answer.raw as { escalated?: "deepseek" | "claude" }).escalated;
      const fromJev = answer.raw !== undefined && !escalatedBy;
      // Potions are Jev's call: no potion pick is vetoed (the hallway confidence bar, the elite/boss
      // dry-line veto and the attack-potion veto are gone, Dai 2026-09-28).
      if (chosen.potion) {
        const drink = chosen.potion;
        return notePick({
          intent: drink,
          rationale: `Jev chose to ${chosen.label} (confidence ${answer.confidence.toFixed(2)})`,
          confidence: answer.confidence,
          fallback: false,
          apply: () => {
            env.screenMemory.combatPlan = null;
          },
        }, { plan: null, text: chosen.label, potions: potionsAll.filter((potion) => potion.slot === drink.option_index).map((potion) => potion.potion_id), wins: false, via: escalatedBy ?? "jev", rated: mcShown.find((mc) => mc.source.slot === drink.option_index)?.median ?? null });
      }
      // A near-guess from Jev in an elite/boss fight (DeepSeek no longer re-asks) never plays a line
      // another option beats on every axis (SVN2 F17 T3: a 0-damage line at 0.36 over one with the same
      // HP loss and 15 damage).
      // Code never adds a drink of its own: a swap (dominator, HP guard) goes only to a line drinking
      // no potion Jev's pick does not drink.
      const chosenPotions = potionIdsOf(chosen.plan!);
      const noNewDrink = (plan: Plan) => potionIdsOf(plan).every((id) => chosenPotions.includes(id));
      // Only into a line that puts at least as much damage into every enemy: which enemy to hit is Jev's call.
      const coversTargets = (plan: Plan) => groups.length < 2 || groups.every((group) => group.indices.every((index) => damageInto(plan, [index], enemies) >= damageInto(chosen.plan!, [index], enemies)));
      // THIEF_COST: nor into a line that loses more loot than the pick (the loot is not a dominance axis).
      const lootOf = (plan: Plan): number => {
        const line = rollout?.available ? rollout.byPlan.get(plan) : undefined;
        return line?.thiefCost !== undefined ? line.thiefCost : lastTurnLoot(plan, thieves);
      };
      const keepsLoot = (plan: Plan) => !lootOn() || lootOf(plan) <= lootOf(chosen.plan!);
      const dominator = !hallway && fromJev && answer.confidence < 0.4 ? options.find((plan) => plan !== chosen.plan && noNewDrink(plan) && dominates(plan, chosen.plan!) && coversTargets(plan) && keepsLoot(plan)) : undefined;
      const picked = dominator ?? chosen.plan!;
      // Boss/elite/dangerous choices: the guard, with a per-fight budget for the extra HP accepted.
      // This turn's own earlier entry (a re-plan) is replaced, so it does not count against this choice.
      const memo = env.screenMemory.hpGuard;
      const thisTurn = memo && memo.fight === hpGuardFight(env) ? (memo.turns[String(state.turn ?? "?")] ?? 0) : 0;
      const slack = hpGuardSlack(playerSim.hp, kind, hallway ? 0 : hpGuardExtra(env) - thisTurn);
      // The guard does not swap into a line that drinks a potion the fight plan keeps for later (MGJ8
      // F11 T1: -10 swapped for a line drinking the Fortifier kept for an emergency; the boss at F17
      // then died 3 HP short of us, Dismember hitting 28 into 7 block).
      // (The rollout's added line, outside code's options, is guarded against code's options like any pick.)
      // Nor into a potion the pick does not drink: a potion-free pick is guarded among potion-free lines.
      const guardOptions = [...options.filter((plan) => plan === picked || (!drinksKeptPotion(plan) && noNewDrink(plan))), ...(options.includes(picked) ? [] : [picked])];
      // Nor off Jev's focus target, nor into a line the rollout sees dying more often (guardKeepsPick).
      const rolloutDeaths = (plan: Plan): number | null => (rollout?.available ? (rollout.byPlan.get(plan)?.deaths ?? null) : null);
      // B2: nor into a line the whole-fight simulation (a boss it is trusted on) sees winning less, beyond 2 standard errors.
      // THIEF_COST: nor into a line losing more loot than the HP it saves (the rollout's loot cost, else this turn's).
      const keepsPick = (plan: Plan) => guardKeepsPick(picked, plan, enemies, rolloutDeaths) && !simWinsLess(simRanks, plan, picked) && (!lootOn() || lootSwapOk(picked, plan, lootOf));
      const proposed = hallway
        ? hallwayGuard && !picked.outcome.winsFight
          ? hpGuardReplacement(picked, guardOptions, playerSim.hp, hallwayGuardSlack, keepsPick)
          : null
        : hpGuardReplacement(picked, guardOptions, playerSim.hp, slack, keepsPick);
      const raceKept = proposed !== null && winsRace(picked, proposed);
      const replacement = proposed && (guardKeepsSetup(picked, proposed, rolloutDeaths) || raceEruption) ? null : proposed;
      const plan = replacement ?? picked;
      const extra = plan.outcome.winsFight ? 0 : Math.max(0, guardLoss(plan) - Math.min(...guardOptions.map(guardLoss)));
      const rank = shown.indexOf(plan) + 1;
      const guardNote = replacement
        ? hpGuardNote(shown.indexOf(picked) + 1, picked, slack, rank, plan)
        : "";
      return notePick({
        intent: firstIntent(plan, hand, env),
        rationale: `Jev chose ${pickNote(shown, chosen.plan!, picked)} with confidence ${answer.confidence.toFixed(2)}; code rank ${options.includes(picked) ? options.indexOf(picked) + 1 : "- (rollout's best line, added)"}${guardNote}${calcNote}`,
        confidence: answer.confidence,
        fallback: false,
        ...(replacement ? { guard: { kind: "hp" as const, choice: `plan${rank}`, plan: plan.steps.map(stepText).join(", ") || "end turn" } } : {}),
        apply: () => {
          commit(env, state.turn, plan, hand, escalatedBy ?? "jev");
          if (!hallway) recordHpGuard(env, state.turn, raceKept ? 0 : extra);
        },
      }, { plan, text: lineText(plan.steps), potions: potionIdsOf(plan), wins: plan.outcome.winsFight, via: escalatedBy ?? "jev", ...(hallway ? {} : { guardExtra: (line: Plan) => (line.outcome.winsFight ? 0 : Math.max(0, guardLoss(line) - Math.min(...guardOptions.map(guardLoss)))) }) });
    }
  };

  if (thiefTrace.enabled) thiefTrace.last = { plans: solved.plans, surviving, shown, rollout, thieves, lastTurnLine: thiefKill, rolloutLine: thiefRollout, kind, mcShown, simRanks };
  // The planner's time to this question (2026-10-04: V4.6's boss questions took 20-40 s, and only the stages' own `ms`
  // said where), for the decision row's `timing` (plannerTiming: beside the decision, not in it).
  plannerTiming.last = plannerTimingOf({ planStart, cpuStart, solveMs, mcShown, rollout, bossSim, computeMemo });
  const questionLabel = potionLethal.length > 0 ? "combat/plan-choice+potion-lethal" : offerPotions || mcShown.length > 0 ? "combat/plan-choice+potion" : "combat/plan-choice";
  return {
    kind: "ask",
    label: questionLabel,
    state: questionState,
    questions: { plan: choiceQ("Which plan should I play this turn?", criteria) },
    ...(jevView ? { jevView } : {}),
    // No DeepSeek escalation in combat (Dai 2026-09-28): the turn's line is Jev's call.
    resolve(answers): ResolvedAction {
      // SL_RETRY_EXPLORE: the resolution as played (a line failed attempts played on the deviation point's board replaced),
      // its log, and the line for the attempt's record. Without env.sl.explore: resolvePlan's, untouched.
      const { resolved, log: exploreLog, info: exploreInfo } = explored(resolvePlan(answers), questionLabel);
      const noted = (out: ResolvedAction): ResolvedAction => {
        if (exploreInfo) slPoints.set(out, exploreInfo);
        return out;
      };
      const potionsRecord: JsonValue | null =
        mcShown.length > 0 || potions.length > 0
          ? { random: mcShown.map(potionMcLog), unsimulated_offered: potions.map((potion) => potion.potion_id), fight_plan_now: planPotionNow }
          : null;
      const ruled = enemies.filter((enemy) => (enemy.stunOnStrip ?? []).length > 0);
      const moveRuled = enemies.filter((enemy) => (enemy.moveOnStrip ?? []).length > 0);
      const deathRuled = enemies.filter((enemy) => (enemy.moveOnDeath ?? []).length > 0);
      if (!rolloutRecord && !potionsRecord && focusOf.size === 0 && !bossSim && thieves.length === 0 && ruled.length === 0 && moveRuled.length === 0 && deathRuled.length === 0 && exploreLog === null) return noted(resolved);
      const answer = answers["plan"];
      const pick = answer?.type === "choice" ? byKey.get(answer.choice) : undefined;
      // MECH_RULES: the learned strip-stun rules on the board, the shown lines setting one off, and the chosen line's.
      const setsOff = (plan: Plan): boolean => plan.outcome.enemyHpAfter.some((enemy) => enemy.strippedStun !== undefined && enemy.hp > 0);
      // MECH_MOVE_RULES: the learned move rules on the board, the shown lines setting one off, and the chosen line's.
      const movesOff = (plan: Plan): boolean => plan.outcome.enemyHpAfter.some((enemy) => enemy.movedTo !== undefined);
      // MECH_DEATH_MOVE: the learned death rules on the board, the shown lines setting one off, and the chosen line's.
      const deathsOff = (plan: Plan): boolean => !plan.outcome.winsFight && plan.outcome.enemyHpAfter.some((enemy) => enemy.deathMove !== undefined && enemy.hp > 0);
      const mechRecord: JsonValue | null =
        ruled.length > 0 || moveRuled.length > 0 || deathRuled.length > 0
          ? {
              ...(ruled.length > 0
                ? {
                    rules: ruled.flatMap((enemy) => enemy.stunOnStrip!.map((stun) => ({ enemy: enemy.name, power: stun.power, n: mechRules.get(stun.power)?.n ?? null }))),
                    stuns_now: [...shown, ...mcMedians].filter(setsOff).map(keyOfShown),
                    chosen_stuns: pick?.plan ? setsOff(pick.plan) : null,
                  }
                : {}),
              ...(moveRuled.length > 0
                ? {
                    move_rules: moveRuled.flatMap((enemy) => enemy.moveOnStrip!.map((rule) => ({ enemy: enemy.name, power: rule.power, how: rule.how, move: rule.move, n: rule.n }))),
                    moves_now: [...shown, ...mcMedians].filter(movesOff).map(keyOfShown),
                    chosen_moves: pick?.plan ? movesOff(pick.plan) : null,
                  }
                : {}),
              ...(deathRuled.length > 0
                ? {
                    death_rules: deathRuled.flatMap((enemy) => enemy.moveOnDeath!.map((rule) => ({ enemy: enemy.name, ally: rule.allyName, move: rule.move, next: rule.next }))),
                    deaths_now: [...shown, ...mcMedians].filter(deathsOff).map(keyOfShown),
                    chosen_deaths: pick?.plan ? deathsOff(pick.plan) : null,
                  }
                : {}),
            }
          : null;
      // THIEF_FACTS: the thieves, the shown lines killing one this turn, the line kept for a kill before it leaves.
      const thiefRecord = ((): JsonValue | null => {
        if (thieves.length === 0) return null;
        try {
          return {
            thieves: thieves.map((thief) => ({ name: thief.name, id: thief.id, carries: lootText(thief), turns_left: thief.turnsLeft, ...(thief.loot ? { loot_hp: thief.loot.hp } : {}) })),
            kills_now: shown.filter((plan) => thieves.some((thief) => killsThief(plan, thief))).map(keyOfShown),
            ...(thiefKill && shown.includes(thiefKill) ? { last_turn_line: keyOfShown(thiefKill) } : {}),
            ...(thiefRollout && shown.includes(thiefRollout) ? { rollout_line: keyOfShown(thiefRollout), rollout_line_added: thiefRolloutAdded } : {}),
            chosen_kills: pick?.plan ? thieves.some((thief) => killsThief(pick.plan!, thief)) : null,
            // THIEF_COST: each shown line's expected loot cost (HP) and the chosen line's.
            ...(lootOn() && rollout?.available
              ? {
                  loot_cost: Object.fromEntries(shown.flatMap((plan) => (rollout.byPlan.get(plan)?.thiefCost !== undefined ? [[keyOfShown(plan), Math.round(rollout.byPlan.get(plan)!.thiefCost! * 10) / 10]] : []))),
                  chosen_loot_cost: pick?.plan ? (rollout.byPlan.get(pick.plan)?.thiefCost ?? null) : null,
                }
              : {}),
          };
        } catch {
          return null;
        }
      })();
      // The rollout's best chosen: its one best, or any of the options tied for it.
      const bestKeys = tiedKeys.length > 0 ? tiedKeys : bestShown !== null ? [keyOfShown(bestShown)] : [];
      const rolloutBestChosen = bestKeys.length === 0 || pick === undefined || answer?.type !== "choice" ? null : bestKeys.includes(answer.choice);
      // The kill order behind the chosen line's rollout numbers (its best order), when orders were compared.
      const chosenOrder = rollout?.available && pick?.plan ? (rollout.byPlan.get(pick.plan)?.order?.label ?? null) : null;
      return noted({
        ...resolved,
        log: {
          ...(rolloutRecord ? { rollout: rolloutRecord, rollout_best_chosen: rolloutBestChosen, ...(chosenOrder ? { chosen_order: chosenOrder } : {}) } : {}),
          ...(potionsRecord ? { potions: potionsRecord } : {}),
          ...(focusOf.size > 0 ? { focus: Object.fromEntries([...byKey.entries()].filter(([, entry]) => entry.plan && focusOf.has(entry.plan)).map(([key, entry]) => [key, focusOf.get(entry.plan!)!.join(", ")])) } : {}),
          ...(thiefRecord ? { thief: thiefRecord } : {}),
          ...(mechRecord ? { mech: mechRecord } : {}),
          // SL_RETRY_KNOWN_DRAWS / SL_RETRY_COMPUTE on this question (docs/sl.md §10).
          ...(knownTop || slCompute ? { sl_retry: { known_draws: knownTop ? knownTop.names.length : 0, ...(knownTop && knownTop.added.length > 0 ? { added: knownTop.added.length } : {}), ...(slCompute ? { compute: { rollout_samples: slCompute.rolloutSamples, rollout_budget_ms: retryBudgetMs, turn_spent_ms: Math.round(retrySpent), mc_samples: slCompute.mcSamples, boss_sim_samples: slCompute.bossSimSamples } } : {}) } } : {}),
          // With the 5-turn rollout's own best (or ties), which rollout.best no longer is where the simulation ranks.
          ...(bossSim
            ? {
                boss_sim: simLog(bossSim, (plan) => (shown.includes(plan) || mcMedians.includes(plan) ? keyOfShown(plan) : null), {
                  rollout_own_best: rolloutBest && (shown.includes(rolloutBest) || mcMedians.includes(rolloutBest)) ? keyOfShown(rolloutBest) : null,
                  rollout_own_tied: rolloutTiedAll.filter((plan) => shown.includes(plan) || mcMedians.includes(plan)).map(keyOfShown),
                }),
              }
            : {}),
          // SL_RETRY_EXPLORE: the deviation point's line, replaced or not, and why (docs/sl.md §11).
          ...(exploreLog !== null ? { sl_explore: exploreLog } : {}),
        },
      });
    },
  };
}

/**
 * Why an unsimulated potion is on the question: always (Dai: potions are 0-cost one-shot cards, no filter, no
 * veto). It replaced T1 (Dai 2026-09-28: the cheapest potion-free option losing 12% of HP), the old gate.
 */
export const UNSIMULATED_OFFERED = "always: every potion that can be drunk is an option (a 0-cost one-shot card); its effect is not in the numbers";

/**
 * Plan lines trimmed so that `reserved` potion options fit the cap: the lowest-ranked removable line goes
 * first (never the first, one in `keep`, the only potion-free line, or the only line drinking a potion).
 */
export function trimForPotionOptions(options: Plan[], reserved: number, keep: Set<Plan>, limit = MAX_OPTIONS): Plan[] {
  const out = [...options];
  while (out.length + reserved > limit) {
    let removed = false;
    for (let index = out.length - 1; index > 0; index -= 1) {
      const plan = out[index]!;
      if (keep.has(plan)) continue;
      const others = out.filter((other) => other !== plan);
      if (!drinksPotion(plan) && !others.some((other) => !drinksPotion(other))) continue;
      if (!potionIdsOf(plan).every((id) => others.some((other) => potionIdsOf(other).includes(id)))) continue;
      out.splice(index, 1);
      removed = true;
      break;
    }
    if (!removed) break;
  }
  return out;
}

/**
 * A game-data card as a card a potion puts in the hand, free this turn (Strength and Weak in); a Power under Spiked
 * Gauntlets costs `ctx.powerExtraCost` (1) all the same (card-model potionCardCost; A4PWRULKG2JT F46 T1).
 */
export function poolCardModel(info: CardInfo, knowledge: Knowledge, ctx: { enemyTargets: number[]; strength: number; weak: boolean; powerExtraCost?: number }): CardModel {
  const cost = potionCardCost({ type: info.type, xCost: info.xCost, cost: 0 }, ctx.powerExtraCost ?? 0);
  const raw = {
    card_id: info.id,
    name: info.name,
    dynamic_values: info.vars,
    rules_text: info.descriptionRaw,
    resolved_rules_text: info.description,
    target_type: info.target,
    requires_target: info.target === "AnyEnemy",
    playable: true,
    energy_cost: cost,
    costs_x: info.xCost,
    upgraded: false,
    index: 0,
  };
  const model = modelHandCard(raw, 0, knowledge);
  return {
    ...model,
    cost,
    playable: true,
    validTargets: model.target === "single" ? ctx.enemyTargets : [],
    damage: model.damage === null ? null : Math.floor((model.damage + ctx.strength) * (ctx.weak ? 0.75 : 1)),
  };
}

/**
 * What a random potion's Monte Carlo draws from, or null when it cannot be simulated here (no card pool in
 * the game data, no known pile): it is then an unsimulated potion.
 */
export function randomPotionSource(potion: PotionView, state: GameState, knowledge: Knowledge, ctx: { enemyTargets: number[]; strength: number; weak: boolean }, noDraw: boolean): PotionMcSource | null {
  const kind = randomPotionKind(potion.potion_id);
  if (kind === null) return null;
  const base = { potionId: potion.potion_id, name: potion.name, slot: potion.slot, text: potion.text, kind };
  if (kind === "choice") {
    const spec = CHOICE_POTIONS[potion.potion_id]!;
    const character = str(asRecord(state.run?.raw)["character_id"]).toLowerCase();
    const color = spec.pool === "colorless" ? "colorless" : character;
    if (!color) return null;
    const all = knowledge.cards();
    // Spiked Gauntlets: the Powers it offers cost 1 this turn, not 0 (potionCardCost).
    const powerExtraCost = potionPowerExtraCost(asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"])));
    const pools: Record<string, CardModel[]> = {};
    for (const type of spec.types) {
      pools[type] = all.filter((card) => card.color === color && card.type === type && POOL_RARITIES.has(card.rarity)).map((card) => poolCardModel(card, knowledge, { ...ctx, ...(powerExtraCost > 0 ? { powerExtraCost } : {}) }));
    }
    if (spec.types.some((type) => (pools[type] ?? []).length === 0)) return null;
    const powersCost = powerExtraCost > 0 && spec.types.includes("Power") ? { powerExtraCost } : {};
    return { ...base, pools, poolName: `${color} ${spec.types.join("/")}`, ...powersCost };
  }
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  if (!Array.isArray(view["draw"]) && !Array.isArray(view["discard"])) return null;
  const piles = { draw: pileCardModels(state, knowledge, "draw", ctx), discard: pileCardModels(state, knowledge, "discard", ctx) };
  if (piles.draw.length + piles.discard.length === 0 && potion.potion_id !== "BOTTLED_POTENTIAL") return null;
  return { ...base, piles, ...(noDraw ? { noDraw } : {}) };
}

/**
 * Every random potion's Monte Carlo for one decision, sharing potionMcOptions.budgetMs (each gets an equal
 * share of what is left). `solver` is the turn's solver input; its potions are left out of the samples.
 */
export function runRandomPotions(sources: PotionMcSource[], solver: SolverInput | null, dryBest: Plan | null, boardKey: string, opts: { samples?: number; budgetMs?: number } = {}): PotionMc[] {
  if (solver === null || sources.length === 0) return [];
  const dry: SolverInput = { ...solver, hand: solver.hand.filter((card) => card.type !== "Potion") };
  const out: PotionMc[] = [];
  let spent = 0;
  // SL_RETRY_COMPUTE: a retried fight's budget and samples (potionMcOptions' otherwise).
  const total = opts.budgetMs ?? potionMcOptions.budgetMs;
  sources.forEach((source, index) => {
    const budget = Math.max(0, (total - spent) / (sources.length - index));
    const mc = opts.samples !== undefined ? runPotionMc(dry, source, dryBest, seedOf(`${boardKey}:${source.potionId}:${source.slot}`), budget, opts.samples) : runPotionMc(dry, source, dryBest, seedOf(`${boardKey}:${source.potionId}:${source.slot}`), budget);
    spent += mc.ms;
    out.push(mc);
  });
  return out;
}

/** Most lines shown for a potion lethal (one per set of potions spent, fewest potions first). */
export const MAX_POTION_LETHAL_LINES = 4;

/**
 * The lines that win the fight this turn when none of them is potion-free: the best (by score) of each
 * set of potions spent, those spending fewer potions first. Empty when there is no lethal or a dry one.
 */
export function potionLethalLines(lethal: Plan[]): Plan[] {
  if (lethal.length === 0 || lethal.some((plan) => !drinksPotion(plan))) return [];
  const bySet = new Map<string, Plan>();
  for (const plan of lethal) {
    const set = [...potionIdsOf(plan)].sort().join("+");
    if (!bySet.has(set)) bySet.set(set, plan);
  }
  return [...bySet.values()].sort((a, b) => potionIdsOf(a).length - potionIdsOf(b).length || b.score - a.score).slice(0, MAX_POTION_LETHAL_LINES);
}

/** The flag on a line that wins the fight only by drinking: which potions it spends. */
/**
 * A drink that changes nothing in its line (rollout-live noEffectTwin: the same cards and the same turn without
 * it; 3SBPKG9603WD F17 T3, Flex after the last attack): said so. The line stays an option; the rollout gives it
 * the dry line's numbers.
 */
export function noEffectNote(plan: Plan, plans: Plan[]): Record<string, JsonValue> {
  const twin = noEffectTwin(plan, plans);
  if (!twin) return {};
  const potions = plan.steps.filter((step) => step.cardId.startsWith("POTION:")).map((step) => step.name.replace(/^potion /, ""));
  return { potion_no_effect: `${potions.join(", ")}: no effect in this line (this turn is the same as ${twin.steps.map(stepText).join(", ") || "ending the turn"} without it)` };
}

export function potionLethalNote(plan: Plan): Record<string, JsonValue> {
  if (!plan.outcome.winsFight || !drinksPotion(plan)) return {};
  const names = plan.steps.filter((step) => step.cardId.startsWith("POTION:")).map((step) => step.name.replace(/^potion /, ""));
  return { potion_lethal: `WINS THE FIGHT THIS TURN, spending ${names.join(" + ")}; no potion-free line wins this turn` };
}

function lineLabel(plan: Plan): string {
  return plan.steps.map(stepText).join(", ") || "end turn";
}

/**
 * Code's own line over the HP guard bound, and the line played instead. A line's HP change as hpText ("hp -12",
 * "hp +8" on a heal): "loses ${hpLoss} HP" read "loses -8 HP" on a heal (fix batch M's leftover, as 5e19d7a).
 */
export function guardedText(top: Plan, guarded: Plan): string {
  return `code plan ${lineLabel(top)} (${lossText(top)}) is over the HP guard bound; playing ${lineLabel(guarded)} instead (${lossText(guarded)}, dmg ${guarded.outcome.damageDealt})`;
}

/** A line's HP change (hpText): what the guard compares (guardLoss; the potions' cost is not in it). */
function lossText(plan: Plan): string {
  return hpText(guardLoss(plan));
}

/** The HP guard's note on replacing the picked line (plan `pickedNo`) with plan `rank`; HP changes as hpText. */
export function hpGuardNote(pickedNo: number, picked: Plan, slack: number, rank: number, plan: Plan): string {
  return `; HP guard: plan ${pickedNo} (${lineLabel(picked)}; ${lossText(picked)}) is more than ${slack.toFixed(0)} HP over the cheapest line${slack === 0 ? ` (this fight already took ${HP_GUARD_FIGHT_BUDGET}+ extra HP)` : ""}, playing plan ${rank} (${lineLabel(plan)}; ${lossText(plan)}) instead`;
}

/**
 * "plan i/N (its line)" for Jev's pick, and the line actually played when the low-confidence dominance
 * swap replaced it (the rationale used to print the played line's number next to the chosen line's label).
 */
export function pickNote(shown: Plan[], chosen: Plan, picked: Plan): string {
  const head = `plan ${shown.indexOf(chosen) + 1}/${shown.length} (${lineLabel(chosen)})`;
  return picked === chosen ? head : `${head}; plan ${shown.indexOf(picked) + 1} (${lineLabel(picked)}) is as good or better on every axis, playing it`;
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
export function leastLossPlan(allPlans: Plan[], hand: CardModel[], hp = Infinity): Plan {
  // A line that kills us on our own turn (a card's HP cost) never goes first while one reaches the end of the turn:
  // the death comes either way, but only at the end of the turn can SL reload, and the enemy turn may still go
  // otherwise than simulated (JSA5K8YZ9RXV F48 T6: 2 HP, every line dead to the Queen's 12x5; least-loss played Blood
  // Wall, its 2 HP cost killed us mid-turn, and the fight was lost with 6 attempts unused).
  const reachEnd = allPlans.filter((plan) => !plan.outcome.diesOwnTurn);
  const pool = reachEnd.length > 0 ? reachEnd : allPlans;
  // The Sandpit's deadline (it reaches 0 at the enemy turn): only a Frantic Escape played this turn keeps the
  // pit from taking us whatever our HP, so when a line plays one, only such lines, the Escape first (KY3Y
  // F33 T9: Sandpit 1, least-loss drew first with Burning Pact, which exhausted the 1-cost Escape).
  const pitSafe = (plan: Plan) => plan.outcome.sandpitAfter === null || plan.outcome.sandpitAfter > 0;
  const deadline = pool.some(pitSafe) && pool.some((plan) => !pitSafe(plan));
  const plans = deadline ? pool.filter(pitSafe) : pool;
  const picked = leastLossOf(plans, hand, hp);
  const escape = deadline ? picked.steps.findIndex((step) => step.cardId === "FRANTIC_ESCAPE") : -1;
  return escape > 0 ? stepFirst(picked, escape, hand) : picked;
}

/**
 * The plan with step `at` played first: before every earlier step, but after a "play me first" card (Enthralled,
 * card-model playFirst) the plan plays before it, which nothing else can be played before. Unchanged when that leaves it
 * where it is.
 */
export function stepFirst<T extends Pick<Plan, "steps">>(plan: T, at: number, hand: CardModel[]): T {
  const playFirst = (step: Step) => !step.cardId.startsWith("POTION:") && (hand.find((card) => card.index === step.cardIndex)?.playFirst === true || isPlayFirst(step.cardId));
  const lead = plan.steps.slice(0, at).reduce((last, step, i) => (playFirst(step) ? i + 1 : last), 0);
  if (at <= lead) return plan;
  return { ...plan, steps: [...plan.steps.slice(0, lead), plan.steps[at]!, ...plan.steps.slice(lead, at), ...plan.steps.slice(at + 1)] };
}

function leastLossOf(plans: Plan[], hand: CardModel[], hp: number): Plan {
  // A drawing card whose own HP cost kills us is no draw (2VW5 F28 T7: Offering at 5 HP played first). Nor is one whose draw
  // waits on the hand (CARD_CONDITIONS, Restlessness: moved first, it draws nothing; AKK09TEEEXKD F17 T10).
  const drawAt = (plan: Plan): number =>
    plan.steps.findIndex((step) => hand.some((card) => card.index === step.cardIndex && drawsCards(card) && card.hpLoss < hp && card.handCondition === undefined));
  const drawing = plans.filter((plan) => drawAt(plan) >= 0);
  if (drawing.length === 0) return plans.reduce((a, b) => (b.outcome.hpAfter > a.outcome.hpAfter ? b : a));
  const most = drawing.reduce((a, b) =>
    b.outcome.damageDealt > a.outcome.damageDealt || (b.outcome.damageDealt === a.outcome.damageDealt && b.outcome.hpAfter > a.outcome.hpAfter) ? b : a,
  );
  const at = drawAt(most);
  if (at === 0) return most;
  return stepFirst(most, at, hand);
}

/** Cards that exhaust a card of our choosing (a Wound, a Burn) from the hand. */
const EXHAUST_PICKERS = new Set(["BURNING_PACT"]);

/**
 * A card worth playing on a phase boss's revive turn (no enemy to target, no attack coming): exhaust
 * a Status/Curse first, then powers, then playable Status cards (they exhaust themselves), then block
 * when it carries over. null when nothing has value: end the turn.
 */
export function phaseSetupCard(hand: CardModel[], energy: number, keepsBlock: boolean): { card: CardModel; why: string } | null {
  // Enthralled (card-model playFirst) in the hand: nothing else can be played before it, so it goes first when a setup
  // card is left for after it.
  const first = hand.find((card) => card.playFirst === true);
  if (first) {
    if (!first.playable || first.cost > energy) return null;
    const after = phaseSetupCard(hand.filter((card) => card !== first), energy - first.cost, keepsBlock);
    return after ? { card: first, why: `playing ${first.name} first (nothing else can be played before it), then ${after.why}` } : null;
  }
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
 * No playable card and the enemy turn is lethal: drink a potion first. A hit-blunting potion before a
 * drawing one before any other; then the turn re-plans. Only into a lethal hit (the only potion-free
 * line, ending the turn, dies); any other turn's potion is Jev's call (the elite/boss 30%-of-HP rule is
 * gone, Dai 2026-09-28).
 */
export function noPlayRescuePotion(env: DecisionEnv, enemies: EnemySim[], player: PlayerSim): Decision | null {
  const incoming = Math.max(0, enemies.reduce((sum, enemy) => sum + enemy.attacks.reduce((total, attack) => total + attack.damage * attack.hits, 0), 0) - player.block);
  if (incoming < player.hp) return null;
  const potions = potionViews({ raw: asRecord(env.state.run?.raw) }, env.knowledge).filter((potion) => potion.can_use);
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
/** Enemy turns after this one forecast for what lasts past it (Plating: Heart of Iron's 7 lasts 6 more). */
export const LATER_TURNS = 8;

/**
 * The living enemies' expected attack on each of the next LATER_TURNS enemy turns (turn-solver
 * laterIncoming): each enemy's learned move chain from its current move (move-model damageForecast), a
 * sleeper (ASLEEP_POWER) at 0 while it sleeps, next turn's special cycles as multiClawNext reads them, and
 * an enemy with no learned moves at its shown attack every turn. null when no enemy has learned moves.
 */
/**
 * Illusions killed before now (is_alive false, ILLUSION_POWER) whose summoner lives: back at full HP next
 * turn (QUG1DSDARAXU F23 T3-T4: the Parafright killed on T3 hit for 12 on T4).
 */
export function revivingIllusions(combat: Record<string, unknown>): Record<string, unknown>[] {
  const enemies = asArray(combat["enemies"]).map(asRecord);
  if (!enemies.some((enemy) => enemy["is_alive"] !== false && powerAmount(enemy, "MINION_POWER") <= 0)) return [];
  return enemies.filter((enemy) => enemy["is_alive"] === false && powerAmount(enemy, "ILLUSION_POWER") > 0);
}

export function laterIncomingOf(combat: Record<string, unknown>, asc?: number, exclude?: ReadonlyMap<number, ReadonlySet<string>>): number[] | null {
  const out: number[] = Array.from({ length: LATER_TURNS }, () => 0);
  let known = false;
  // At the run's ascension from the monster DB (move-model DamageContext), when it is given.
  const ctxOf = (enemy: Record<string, unknown>): DamageContext | undefined => (asc === undefined ? undefined : boardDamageContext(enemy, asRecord(combat["player"]), asc));
  for (const enemy of revivingIllusions(combat)) {
    const forecast = revivingForecast(str(enemy["enemy_id"]), LATER_TURNS, ctxOf(enemy));
    if (!forecast) continue;
    known = true;
    for (let k = 0; k < LATER_TURNS; k += 1) out[k]! += forecast[k] ?? 0;
  }
  for (const [i, enemy] of asArray(combat["enemies"]).map(asRecord).filter((entry) => entry["is_alive"] !== false).entries()) {
    const forecast = damageForecast(str(enemy["enemy_id"]), str(enemy["move_id"]), LATER_TURNS, powerAmount(enemy, "ASLEEP_POWER"), ctxOf(enemy), exclude?.get(numOrNull(enemy["index"]) ?? i));
    const shown = asArray(enemy["intents"]).map(asRecord).reduce((sum, intent) => sum + num(intent["damage"]) * Math.max(1, num(intent["hits"])), 0);
    if (forecast) known = true;
    const special = multiClawNext(enemy);
    for (let k = 0; k < LATER_TURNS; k += 1) out[k]! += k === 0 && special !== null ? special : forecast ? forecast[k]! : shown;
  }
  return known ? out.map((value) => Math.round(value * 10) / 10) : null;
}

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

/**
 * Vambrace (「每场战斗中，你第一次从卡牌中获得的格挡值翻倍」) not yet used this fight: a Block card in hand
 * shows twice its own Block (base plus Dexterity). The relic carries no counter, so the shown numbers
 * tell: after the first Block, cards show their plain values (G8YY F30 T5: Defend 6).
 */
export function vambraceArmed(relicIds: string[], hand: unknown[], dexterity: number, frail = false): boolean {
  if (!relicIds.includes("VAMBRACE")) return false;
  return hand.some((entry) => {
    const block = asArray(asRecord(entry)["dynamic_values"]).map(asRecord).find((value) => str(value["name"]) === "Block");
    if (!block) return false;
    const own = (numOrNull(block["enchanted_value"]) ?? numOrNull(block["base_value"]) ?? 0) + dexterity;
    const shown = numOrNull(block["current_value"]) ?? own;
    // TCFAHJ9K19VY F17 T2, silent-0192: doubled previews already include Frail (5 -> 7, 8 -> 12).
    return own > 0 && shown >= 2 * own * (frail ? 0.75 : 1) - 1;
  });
}

/** silent-0179/0180: consume the observed doubled preview once; no guessed cooldown or stacking model. */
export function paelsLegionPreview(runRaw: unknown, combat: Record<string, unknown>): boolean {
  const run = asRecord(runRaw);
  if (str(run["character_id"]).toLowerCase() !== "silent") return false;
  const relics = asArray(run["relics"]).map(asRecord);
  const legion = relics.find((relic) => str(relic["relic_id"]) === "PAELS_LEGION");
  if (!legion || num(legion["stack"]) > 0 || relics.some((relic) => str(relic["relic_id"]) === "VAMBRACE")) return false;
  const player = asRecord(combat["player"]);
  if (["FRAIL_POWER", "SHADOWMELD_POWER", "UNMOVABLE_POWER"].some((id) => powerAmount(player, id) > 0)) return false;
  const dexterity = powerAmount(player, "DEXTERITY_POWER");
  return asArray(combat["hand"]).map(asRecord).some((card) => {
    // Both independent runs observed plain Defend with base five, no enchantment, and zero/three Dexterity.
    if (str(card["card_id"]) !== "DEFEND_SILENT" || card["upgraded"] === true || (dexterity !== 0 && dexterity !== 3)) return false;
    const block = asArray(card["dynamic_values"]).map(asRecord).find((value) => str(value["name"]) === "Block");
    return block !== undefined && num(block["base_value"]) === 5 && num(block["enchanted_value"]) === 5 && num(block["current_value"]) === 2 * (5 + dexterity);
  });
}

/** Fairy in a Bottle: back at this share of max HP (「回复到你最大生命值的30%」), rounded down like the logged Lizard Tail. */
export const FAIRY_REVIVE_SHARE = 0.3;
/**
 * Lizard Tail: back at this share of max HP (the text's {Heal}% is unfilled in the game data; logged triggers:
 * 0NG27W8QBNYX F24 17 -> 35 of 71, PU21Z67J65NE F33 18 -> 44 of 89, V5S6QVVQYL37 F17 6 -> 39 of 80, Y8E0KK4L7JBL F48
 * 14 -> 0 -> 40 -> 28 of 80 under the Torch Head's 12x3).
 */
export const LIZARD_TAIL_REVIVE_SHARE = 0.5;
/** A Lizard Tail trigger read up to this much under its HP (a start-of-turn loss after it: V5S6 39 of 80). */
const LIZARD_TAIL_SLACK = 5;
/**
 * The heals at a fight's end, for a fight won in the enemy turn (trackLizardTail): Burning Blood 6 (relic-values) and
 * Meat on the Bone 12 (logged 2026-10-03: 20 won fights below max HP holding both healed exactly 18). Black Blood is not
 * measured (no logged fight): left out, so a fight end with it reads the tail as spent sooner, never later.
 */
const FIGHT_END_HEALS: Record<string, number> = { BURNING_BLOOD: RELIC_VALUES["BURNING_BLOOD"]?.["Heal"] ?? 6, MEAT_ON_THE_BONE: 12 };

function fairiesHeld(runRaw: Record<string, unknown>): Record<string, unknown>[] {
  return asArray(runRaw["potions"]).map(asRecord).filter((slot) => bool(slot["occupied"]) && str(slot["potion_id"]) === "FAIRY_IN_A_BOTTLE");
}

/**
 * The revives held, in the order they trigger (turn-solver PlayerSim.revives): every Fairy in a Bottle in the
 * belt (the potion goes when it triggers; "Automatic", never drunk by us), then Lizard Tail unless it was seen
 * to trigger this run (trackLizardTail). Fairy first, as in Slay the Spire (the potion before the relic).
 */
export function revivesOf(state: GameState, memory: DecisionEnv["screenMemory"], maxHp: number): Revive[] {
  const runRaw = asRecord(state.run?.raw);
  const fairies = fairiesHeld(runRaw).map((slot) => ({ source: "FAIRY_IN_A_BOTTLE", name: str(slot["name"], "Fairy in a Bottle"), hp: Math.max(1, Math.floor(maxHp * FAIRY_REVIVE_SHARE)) }));
  const tail = asArray(runRaw["relics"]).map(asRecord).find((relic) => str(relic["relic_id"]) === "LIZARD_TAIL");
  const spent = memory.lizardTail?.runId === str(state.raw["run_id"]) && memory.lizardTail.used;
  return [...fairies, ...(tail && !spent ? [{ source: "LIZARD_TAIL", name: str(tail["name"], "Lizard Tail"), hp: Math.max(1, Math.floor(maxHp * LIZARD_TAIL_REVIVE_SHARE)) }] : [])];
}

type TailRecord = NonNullable<DecisionEnv["screenMemory"]["lizardTail"]>;
type TailLast = NonNullable<TailRecord["last"]>;

/** The attack hits of the living enemies' intents, in the order they land (each enemy's damage, `hits` times). */
function intentHits(combat: Record<string, unknown>): number[] {
  return asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .flatMap((enemy) =>
      asArray(enemy["intents"])
        .map(asRecord)
        .flatMap((intent) => {
          const damage = numOrNull(intent["damage"]) ?? 0;
          return damage > 0 ? Array<number>(Math.max(1, numOrNull(intent["hits"]) ?? 1)).fill(damage) : [];
        }),
    );
}

/** The least damage one Inferno adds to INFERNO_POWER (Inferno 6, Inferno+ 9): its amount over this is the most copies up. */
const INFERNO_LEAST_PER_COPY = 6;

/**
 * What the end of our turn takes besides the enemy hits, for the tail's lethal read (an over-count, never under): the held
 * cards' end-of-turn damage in hand order (Burn, Wither: through block) and HP loss (Beckon: past it; card-model
 * heldPenaltyOf), and our HP loss at the next turn's start (Inferno 1 for each copy at most, its amount over 6; Crimson
 * Mantle's cost; poison on us, its amount). ET3V5177HXSY F48 T9 (ops 2026-10-03): 12 HP + 7 block, no attack shown, two held
 * Wither+2 (9 each) and Crimson Mantle up: 18 - 7 left 1, the Mantle's 1 at T10's start took it, the tail fired and T10
 * opened at 37 of 74; the read had counted the intents alone ("not lethal"), so the tail stayed "left" and the judge said
 * "a revive is left" at T13, when it was gone (died with 5 retries unused).
 */
function ownTurnEndLosses(combat: Record<string, unknown>): { heldHits: number[]; heldLoss: number; startLoss: number } {
  const heldHits: number[] = [];
  let heldLoss = 0;
  for (const card of asArray(combat["hand"]).map(asRecord)) {
    const { heldPenalty, heldHpLoss } = heldPenaltyOf(str(card["resolved_rules_text"]) || str(card["rules_text"]));
    if (heldPenalty - heldHpLoss > 0) heldHits.push(heldPenalty - heldHpLoss);
    heldLoss += heldHpLoss;
  }
  const player = asRecord(combat["player"]);
  const inferno = powerAmount(player, "INFERNO_POWER");
  const startLoss =
    (inferno > 0 ? Math.max(1, Math.floor(inferno / INFERNO_LEAST_PER_COPY)) : 0) + mantleHpCost(powerAmount(player, "CRIMSON_MANTLE_POWER")) + Math.max(0, powerAmount(player, "POISON_POWER"));
  return { heldHits, heldLoss, startLoss };
}

/**
 * The HP the end of the turn leaves with the tail's revive among them, or null when it does not kill (no revive in the
 * count): the held cards' damage, then the enemy hits, each through what is left of the block; the held cards' HP loss
 * and the next turn's start loss past it; back at `revive` the first time HP reaches 0 (the overflow lost).
 */
function hitsThroughTail(hp: number, block: number, hits: number[], revive: number, own: { heldHits?: number[]; heldLoss?: number; startLoss?: number } = {}): number | null {
  let revived = false;
  const losses: { amount: number; blocked: boolean }[] = [
    ...(own.heldHits ?? []).map((amount) => ({ amount, blocked: true })),
    { amount: own.heldLoss ?? 0, blocked: false },
    ...hits.map((amount) => ({ amount, blocked: true })),
    { amount: own.startLoss ?? 0, blocked: false },
  ];
  for (const { amount, blocked } of losses) {
    if (amount <= 0) continue;
    const through = blocked ? Math.max(0, amount - block) : amount;
    if (blocked) block = Math.max(0, block - amount);
    hp -= through;
    if (hp <= 0) {
      if (revived) return hp;
      hp = revive;
      revived = true;
    }
  }
  return revived ? hp : null;
}

/**
 * After a lethal read at the end of our turn (`last`), whether HP `hp` (alive, no Fairy spent) says the tail fired: it
 * is at most the revive HP and above what the turn ended at (6 of the 6 logged next-turn triggers; after a lethal read HP
 * never rose without a revive: 0 of the 39 lethal reads survived without one, over 30,914 logged turn pairs of runs that
 * never held the tail and 106 after it was spent; the 14 rises without a lethal read were heals), or within
 * LIZARD_TAIL_SLACK under the revive HP (the old window: 5 of the 6, never wrong), or what the turn's hits leave with the
 * revive among them (6 of the 6 within LIZARD_TAIL_SLACK, 5 exactly; none of the 39). The reason, or null.
 */
function tailHpSays(last: TailLast, hp: number, revive: number): string | null {
  if (!(hp > 0 && hp <= revive)) return null;
  if (hp > last.hp) return `HP rose ${last.hp} -> ${hp} after a lethal read`;
  if (hp >= revive - LIZARD_TAIL_SLACK) return `HP ${hp} at the revive's ${revive}`;
  const through = last.hits ? hitsThroughTail(last.hp, last.block ?? 0, last.hits, revive, last) : null;
  if (through !== null && Math.abs(through - hp) <= LIZARD_TAIL_SLACK) {
    const own = [...(last.heldHits ?? []).map((hit) => `held ${hit}`), ...((last.heldLoss ?? 0) > 0 ? [`held loss ${last.heldLoss}`] : []), ...((last.startLoss ?? 0) > 0 ? [`next turn's start ${last.startLoss}`] : [])];
    return `HP ${hp}, the hits ${[...last.hits!.map(String), ...own].join("+")} through the revive leave ${through}`;
  }
  return null;
}

/**
 * Lizard Tail's one use this run, read from the states (called on every state the loop reads, and by the journal replay
 * after a restart). The relic shows nothing when it fires (logged stack null, is_melted false, the same text before and
 * after: Y8E0KK4L7JBL F48 T3/T4/T6), so it is read from our HP; the logged triggers and how each rule reads them
 * (2026-10-03, 7 runs held it, each fired it once: tools/lizard-tail-replay.ts):
 * - an enemy-turn read (actions disabled) after our turn's last state of the fight showing our HP at 0 or under, with no
 *   Fairy held now or then: the tail is firing (the Fairy, which goes first, left such a frame in 7 of the 7 Fairy revives
 *   logged since 2026-09-28, when states that change the run journal began to be logged; no tail fight has an enemy-turn
 *   frame logged, so this is not seen in the logs, and the loop logs the state this rule marks for the replay);
 * - the next turn of the fight after our turn's last state read lethal (the mod's end_turn_will_kill_player, or the
 *   intents and the held cards' end-of-turn damage past our block, with the held cards' HP loss and our own loss at the
 *   next turn's start, at least our HP: ownTurnEndLosses), no Fairy spent: tailHpSays (7 of the 7 next-turn triggers; the
 *   old rule, the window alone, read 5 and missed Y8E0 F48's 28: 14 HP against 12x3, 2 -> 0 -> 40 -> 28; the intents
 *   alone missed ET3V5177HXSY F48's T10, 12 HP + 7 block and no attack, two held Wither+2 and Crimson Mantle's 1: 37 of 74);
 * - a Fairy spent too: the next turn above the Fairy's 30% (it cannot leave more) and at most the tail's 50% after a
 *   lethal read (none logged; the 12 logged Fairy revives all opened at or under 30%);
 * - the fight won in the enemy turn after a lethal end of turn (end_turn sent: noteLizardTailEndTurn), no Fairy spent:
 *   tailHpSays on the HP after it less the fight-end heals (MZCG9T5G6TBZ F17: 17 HP + 10 block against the Waterfall
 *   Giant's 30 explosion, out of the fight at 46 = 40 + Burning Blood's 6; missed before, the tail counted on to F33).
 * An SL reload (the same fight from a lower turn: the save is the room's entry, every logged reload resumed at T1) puts
 * the tail back as it was when the fight began; a tail spent in an earlier fight stays spent (the save holds it, as it
 * holds the potions: a potion drunk in an attempt is there again on the retry). Returns the reason when this state marked
 * the tail used, else null.
 */
export function trackLizardTail(memory: DecisionEnv["screenMemory"], state: GameState): string | null {
  const runId = str(state.raw["run_id"]);
  // The main menu (an SL reload, a restart) is no run: it neither resets the record nor reads anything.
  if (!runId || runId === "run_unknown") return null;
  if (memory.lizardTail?.runId !== runId) memory.lizardTail = { runId, used: false };
  const tail = memory.lizardTail;
  const runRaw = asRecord(state.run?.raw);
  const combat = asRecord(state.raw["combat"]);
  const player = asRecord(combat["player"]);
  const held = asArray(runRaw["relics"]).some((relic) => str(asRecord(relic)["relic_id"]) === "LIZARD_TAIL");
  const fairies = fairiesHeld(runRaw).length;
  if (!state.in_combat) {
    const last = tail.last;
    tail.last = undefined;
    tail.fight = undefined;
    if (tail.used || !held || !last?.ended || !last.lethal || state.screen === "GAME_OVER" || fairies < last.fairies) return null;
    const maxHp = state.run?.max_hp ?? 0;
    const heal = Object.entries(FIGHT_END_HEALS).reduce((sum, [id, amount]) => sum + (asArray(runRaw["relics"]).some((relic) => str(asRecord(relic)["relic_id"]) === id) ? amount : 0), 0);
    const says = state.run?.current_hp ? tailHpSays(last, state.run.current_hp - heal, Math.floor(maxHp * LIZARD_TAIL_REVIVE_SHARE)) : null;
    return says ? markTail(tail, last.fight, last.turn, `the fight was won in the enemy turn after a lethal read: ${says} (less ${heal} healed at the fight's end)`) : null;
  }
  if (numOrNull(player["current_hp"]) === null) return null;
  const hp = num(player["current_hp"]);
  const fight = fightKey(state);
  const turn = state.turn ?? 0;
  if (tail.fight?.key !== fight) tail.fight = { key: fight, usedAtStart: tail.used, turn };
  else if (turn < tail.fight.turn) {
    // An SL reload: the fight again from the room's save, the tail as it was then.
    tail.used = tail.fight.usedAtStart;
    if (!tail.used) tail.seen = undefined;
    tail.fight.turn = turn;
    tail.last = undefined;
  } else tail.fight.turn = turn;
  if (tail.used) return null;
  if (!held) {
    tail.last = undefined;
    return null;
  }
  const last = tail.last && tail.last.fight === fight ? tail.last : undefined;
  // At 0 or under in an enemy-turn read (actions disabled: all 7 logged 0 HP frames) after our turn's last state of this
  // fight, with no Fairy held now or then (the Fairy goes first).
  if (hp <= 0 && last && state.screen === "COMBAT" && state.combat?.can_use_combat_actions === false && fairies === 0 && last.fairies === 0) {
    return markTail(tail, fight, turn, `HP ${hp} in combat with no Fairy held`);
  }
  const revive = Math.floor(num(player["max_hp"]) * LIZARD_TAIL_REVIVE_SHARE);
  if (last && turn > last.turn && last.lethal) {
    if (fairies >= last.fairies) {
      const says = tailHpSays(last, hp, revive);
      if (says) return markTail(tail, fight, turn, says);
    } else if (hp > Math.floor(num(player["max_hp"]) * FAIRY_REVIVE_SHARE) && hp <= revive) {
      return markTail(tail, fight, turn, `a Fairy spent and HP ${hp} above its ${Math.floor(num(player["max_hp"]) * FAIRY_REVIVE_SHARE)} after a lethal read`);
    }
  }
  // Only our own turn's states set the turn's last word: the enemy turn reads in between with the turn number unchanged
  // (the revive lands there, and the next intents against the revived HP read "not lethal"), and overwrote it, so the
  // next turn's opening at 50% was not recognised (LTKW24N3R9PG F37: T4 7 HP + 5 block against 20, T5 opened at 37 of 74;
  // the solver kept counting on the tail at F43-F44, every F44 T1 line "spends 蜥蜴尾巴").
  if (state.combat?.can_use_combat_actions === false) return null;
  const hits = intentHits(combat);
  const block = num(player["block"]);
  // The held cards and the next turn's start count too (ownTurnEndLosses; ET3V5177HXSY F48 T9).
  const own = ownTurnEndLosses(combat);
  const sum = (list: number[]) => list.reduce((total, hit) => total + hit, 0);
  const lethal = bool(combat["end_turn_will_kill_player"]) || Math.max(0, sum(hits) + sum(own.heldHits) - block) + own.heldLoss + own.startLoss >= hp;
  tail.last = {
    fight, turn, hp, block, lethal, fairies, hits,
    ...(own.heldHits.length > 0 ? { heldHits: own.heldHits } : {}), ...(own.heldLoss > 0 ? { heldLoss: own.heldLoss } : {}), ...(own.startLoss > 0 ? { startLoss: own.startLoss } : {}),
  };
  return null;
}

function markTail(tail: TailRecord, fight: string, turn: number, how: string): string {
  tail.used = true;
  tail.last = undefined;
  tail.seen = { fight, turn, how };
  return how;
}

/**
 * The loop sent end_turn on `state` (and the journal replay replays it): the turn's last state is an end of turn, so a
 * fight won before our next turn was won in the enemy turn (trackLizardTail's fight-end rule; a fight won by our own
 * last card, a heal on it included, is not: 15 logged lethal reads ended so with more HP than the read had).
 */
export function noteLizardTailEndTurn(memory: DecisionEnv["screenMemory"], state: GameState, intent: ActionRequest | null | undefined): void {
  const last = memory.lizardTail?.last;
  if (!last || intent?.action !== "end_turn" || memory.lizardTail?.runId !== str(state.raw["run_id"])) return;
  if (last.fight === fightKey(state) && last.turn === (state.turn ?? 0)) last.ended = true;
}

/**
 * A relic's own counter (its stack): Shuriken's and Kusarigama's attacks so far this turn. Not attacks_played_this_turn,
 * which counts a replayed or duplicated card once and no Hellraiser autoplay, while the relics count each play (logged:
 * Kunai 1 at a turn's start after an autoplay, 0NG2 F30 T3; Nunchaku 0 -> 3 over three autoplays, MGJ8 F17 T7).
 */
function relicStack(run: unknown, relicId: string): number {
  return num(asArray(asRecord(run)["relics"]).map(asRecord).find((entry) => str(entry["relic_id"]) === relicId)?.["stack"]);
}

/** Kusarigama (every 3rd attack in a turn: 6 to a random enemy), with the attacks counted so far. */
function kusarigamaOf(run: unknown): { every: number; damage: number; count: number } | undefined {
  const relic = asArray(asRecord(run)["relics"]).map(asRecord).find((entry) => str(entry["relic_id"]) === "KUSARIGAMA");
  return relic ? { every: 3, damage: 6, count: num(relic["stack"]) % 3 } : undefined;
}
