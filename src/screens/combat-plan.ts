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

import { choiceQ } from "../jev/questions.js";
import type { ActionRequest } from "../mod/client.js";
import { enemyPowerText, playerJson, potionViews } from "../project/narrow.js";
import { briefJson, combatBriefJson } from "../project/run-brief.js";
import { hintText, selectHints } from "../knowledge/jev-hints.js";
import type { AskDecision, CombatPlanMemo, Decision, DecisionEnv, ResolvedAction } from "../project/types.js";
import { boardDamageContext, damageForecast, expectedNextDamage, revivingForecast, type DamageContext } from "../knowledge/move-model.js";
import { CHOICE_POTIONS, expectedDraw, heldPenaltyOf, isStrikeCard, modelHandCard, modelPotion, offHandCardModel, pileCardPick, randomPotionKind, stripVigor, upgradeDelta, type CardModel, type PotionContext, type UpgradeDelta } from "../strategy/card-model.js";
import { POOL_RARITIES, potionMcCriteria, potionMcLog, potionMcOptions, runPotionMc, seedOf, type PotionMc, type PotionMcSource } from "../strategy/potion-mc.js";
import type { CardInfo } from "../knowledge/index.js";
import type { PotionView } from "../project/narrow.js";
import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../mod/schema.js";
import { distinctPlans, dominates, drawsCards, mantleHpCost, solveTurn, type DrawPileCard, type EnemySim, type Plan, type PlayerSim, type Revive, type SolverInput, type Step } from "../strategy/turn-solver.js";
import { asArray, asRecord, bool, num, numOrNull, str, type JsonValue } from "../util/json.js";
import { planCombat as planCombatPerCard } from "./combat.js";
import { fightKey, fightPlanJson, planFit, planOffersPotion, type FightPlan } from "../strategy/fight-plan.js";
import { forcedEliteWithin } from "./rest.js";
import { bossLossPerTurn, bossProfile, damageGap, eruptionAt, eruptionSchedule, laterPhaseHps, SIPHON_HEAL } from "../strategy/boss-clock.js";
import { DRINK_FIRST_ROLLOUT, killOrders, liveRollout, noEffectTwin, rolloutFacts, rolloutLiveOptions, rolloutLog, type KillGroup, type LiveRollout } from "../strategy/rollout-live.js";
import { selectLessons, offeredOn, type ExperienceEntry } from "../knowledge/experience.js";
import { actThreatIds, bossOnBoard, moveTurns, spawnsAt } from "../knowledge/monster-db.js";

/**
 * Potions are Jev's call (Dai 2026-09-28): the solver prices a potion line on its simulated outcome
 * only (no use cost), every modelled potion in the belt is on at least one shown line, and Jev gets the
 * facts to judge keeping it (potion_context). Code drinks on its own only when no potion-free line
 * survives the turn; a lethal that needs a potion is asked (potionLethalLines). The per-rule
 * potion filters and vetoes (hallway save/damage/confidence thresholds, the elite/boss dry-line veto,
 * the attack-potion confidence veto, the boss one-potion-a-turn cap) are gone.
 */

/** Enemy powers the solver models, or that do not change this turn's numbers. */
const MODELLED_ENEMY_POWERS = new Set([
  "VULNERABLE_POWER", "WEAK_POWER", "STRENGTH_POWER", "ARTIFACT_POWER", "INTANGIBLE_POWER", "SLIPPERY_POWER",
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
  // death (The Lost, The Forgotten; its stolen Dexterity is its block, not our damage), our Power cards
  // turned to Galvanic (Globe Head).
  "THIEVERY_POWER", "HEIST_POWER", "HATCH_POWER", "POSSESS_STRENGTH_POWER", "POSSESS_SPEED_POWER", "DEXTERITY_POWER", "GALVANIC_POWER",
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

/**
 * DeepSeek's run plan, whole and on one line (Dai 2026-09-28: Jev sees the plan's strategy and boss prep,
 * kill-order advice included, on every combat question; advice, not orders).
 */
export function deepseekPlanLine(env: DecisionEnv): string | null {
  const runId = str(env.state.raw["run_id"]);
  const plan = env.screenMemory.runPlan && env.screenMemory.runPlan.runId === runId ? env.screenMemory.runPlan : null;
  if (!plan) return env.brief.plan ? `DeepSeek's run plan (advice, not orders): ${env.brief.plan}` : null;
  const line = [plan.archetype, plan.summary].filter(Boolean).join(" — ");
  const prep = plan.bossPrep ? ` | boss prep: ${plan.bossPrep}` : "";
  if (!line && !prep) return null;
  return `DeepSeek's run plan (F${plan.floor}; advice, not orders): ${line}${prep}`.replace(/\s+/g, " ").trim();
}

/**
 * Facts for Jev's potion judgement (on every combat question, kept short): belt slots and a full belt
 * wasting the next potion reward, floors to the act boss, an Elite ahead (DeepSeek's route plan, else a
 * forced one on the map) and the act boss damage gap. DeepSeek's run plan is its own key (deepseek_plan).
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
  // DeepSeek's run plan is on the question whole (deepseek_plan), not here.
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
  const minLoss = Math.min(...options.map((plan) => plan.outcome.hpLoss));
  const bound = minLoss + slack;
  if (chosen.outcome.hpLoss <= bound) return null;
  const pool = options.filter((plan) => plan === chosen || eligible(plan));
  const found = pool.find((plan) => plan.outcome.hpLoss <= bound) ?? pool.find((plan) => plan.outcome.hpLoss === minLoss) ?? null;
  return found === chosen ? null : found;
}

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
  if (!o.winsFight) summary["enemies_after"] = o.enemyHpAfter.filter((enemy) => enemy.hp > 0).map((enemy) => `${enemy.name} ${enemy.husk ? "husk (cannot be killed, it explodes; damage into it counts for nothing)" : `${enemy.hp} HP`}${enemy.vulnerable ? `, Vulnerable ${enemy.vulnerable}` : ""}${enemy.weak ? `, Weak ${enemy.weak}` : ""}`).join("; ");
  if (o.blockGained > 0) summary["block_gained"] = o.blockGained;
  if (o.strengthGained > 0) summary["strength_gained"] = o.strengthGained;
  if (o.cardsDrawn > 0) summary["cards_drawn"] = o.cardsDrawn;
  if (o.energyLeft > 0) summary["energy_unused"] = o.energyLeft;
  if (o.startTurnKills.length > 0) summary["mercury_hourglass_kills_next_turn"] = o.startTurnKills.join(", ");
  if (o.withersAdded > 0) summary["withers_added"] = o.withersAdded;
  if (o.sleepCost > 0) summary["wakes_sleeping_enemy"] = "yes: its free turns are lost";
  // Powers pay off every later turn; without saying so the models swapped power lines for ones that
  // saved a few HP now (JEGBU7JHEL1A: Rupture and Crimson Mantle never played in a 379 HP boss fight).
  if (o.lasting >= 5) summary["lasting_value"] = `sets up a power worth about ${Math.round(o.lasting)} score over the fight (a few HP now is often worth it in a long fight)`;
  if ((o.stuns ?? []).length > 0) summary["stuns"] = `${o.stuns!.join(", ")}: its attack fully blocked (Imbalanced), it skips its next move (~${o.stunSaved ?? 0} damage saved next turn)`;
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
/** Paper Phrog: Vulnerable enemies take 75% more, not 50% (its game text). */
export const PAPER_PHROG_VULNERABLE = 1.75;
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
 * Cards played per turn in this fight, sampled on every combat decision (the highest
 * cards_played_this_turn seen per turn). The mod's count leaves out cards a power plays by itself
 * (Hellraiser's Strikes; Y3XT F33: 0 at T6 with a Strike already auto-played).
 */
export function recordFightPlays(env: DecisionEnv, playedThisTurn: number): NonNullable<DecisionEnv["screenMemory"]["fightCards"]> {
  const fight = hpGuardFight(env);
  if (env.screenMemory.fightCards?.fight !== fight) env.screenMemory.fightCards = { fight, perTurn: {}, witherDamage: WITHER_BASE_DAMAGE };
  const memo = env.screenMemory.fightCards;
  const turn = String(env.state.turn ?? "?");
  memo.perTurn[turn] = Math.max(memo.perTurn[turn] ?? 0, playedThisTurn);
  return memo;
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
/**
 * A card exhausted earlier this turn: the exhaust pile now is bigger than at the turn's first combat frame (kept
 * in memory.turnStartExhaust). The state has no per-turn count (player.cards_exhausted_this_turn is never sent):
 * 0NZBAVFAT3JG F25 T1, Brand exhausted a Strike, and on the re-ask Evil Eye's extra Block was left out.
 */
export function exhaustedSinceTurnStart(env: DecisionEnv): boolean {
  const size = exhaustPileSize(env.state.raw);
  if (size === undefined) return false;
  const key = `${fightKey(env.state)}:${env.state.turn ?? "?"}`;
  const start = env.screenMemory.turnStartExhaust;
  if (start?.key !== key) {
    env.screenMemory.turnStartExhaust = { key, size };
    return false;
  }
  return size > start.size;
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

export function pileCardModels(state: GameState, knowledge: Knowledge, pile: "discard" | "draw", ctx: { enemyTargets: number[]; strength: number; weak: boolean }): CardModel[] {
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  const deck = asArray(asRecord(state.run?.raw)["deck"]).map(asRecord);
  return asArray(view[pile]).flatMap((raw, position) => {
    const entry = asRecord(raw);
    const cardId = str(asArray(entry["card_ids"])[0]);
    if (!cardId) return [];
    const line = str(entry["line"]);
    const upgraded = /^[^[*：:]*?\+\s*(?:\*\d+\s*)?\[/.test(line);
    const own = deck.find((card) => str(card["card_id"]) === cardId && bool(card["upgraded"]) === upgraded) ?? deck.find((card) => str(card["card_id"]) === cardId) ?? null;
    // Not in the deck (a status an enemy added): the game data's card at the line's cost (Frantic Escape's grows).
    const lineCost = /\[(-?\d+)费\]/.exec(line)?.[1];
    const model = offHandCardModel(own, cardId, upgraded, 900 + position, knowledge, own === null && lineCost !== undefined ? Number(lineCost) : null);
    const card: CardModel = {
      ...model,
      validTargets: model.target === "single" ? ctx.enemyTargets : [],
      damage: model.damage === null ? null : Math.floor((model.damage + ctx.strength) * (ctx.weak ? 0.75 : 1)),
    };
    // "剑柄打击*2 [1费]": one line per card id, with its count (drawPileCards reads it the same way).
    const count = Number(/^[^[：:]*?\*(\d+)\s*\[/.exec(line)?.[1] ?? 1);
    return Array.from({ length: Math.max(1, count) }, () => card);
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

function expectedHandAfterFirst(plan: Plan, hand: CardModel[]): string {
  const first = plan.steps[0];
  if (!first) return handSignature(hand);
  return handSignature(hand.filter((card) => card !== cardFor(first, hand)));
}

function commit(env: DecisionEnv, turn: number | null, plan: Plan, hand: CardModel[], via: CombatPlanMemo["via"]): void {
  const first = plan.steps[0];
  // Gambler's Brew draws what it draws: re-planned after it, like a draw.
  const drawsOrRandom = (first ? cardFor(first, hand)?.draw ?? 0 : 0) + (first?.discards ? 1 : 0);
  // A one-step line Jev (or the escalator) chose is kept too, with nothing left: its end is "stop here"
  // (lineDone), not a fresh plan (9Q7V F17 T14: after Jev's "One-Two Punch" alone, code re-planned and
  // played the Sword Boomerang Jev had turned down, killing the Giant into its blast).
  env.screenMemory.plannedAfter = { turn, steps: plan.steps.slice(1) };
  // A line's later drinks go with the rest of the line: when it is cut short (a draw, a random exhaust, a
  // hand the plan did not expect) the re-plan offers the potion again beside the new hand, and whoever
  // decides that turn decides the drink (XMK1 F33 T3: Battle Trance drew three cards, the stale Blood
  // Potion step was drunk at 76/87 before the re-plan, 6 of its 17 wasted).
  if (first?.discards) env.screenMemory.gambleDiscards = { turn, cardIds: first.discards };
  // A potion step leaves the hand as it is: the next step expects the same hand and the belt without it (a
  // Jev line opening with a drink was re-planned every time: the memo expected one card less, "hand grew").
  const potions = first ? beltAfter(first, env.state.raw) : undefined;
  env.screenMemory.combatPlan =
    (plan.steps.length > 1 || (plan.steps.length === 1 && via !== "code")) && drawsOrRandom === 0
      ? {
          turn,
          remaining: plan.steps.slice(1),
          expectedHand: expectedHandAfterFirst(plan, hand),
          handLen: handLenAfter(first!, hand),
          ...(upgradesHand(first!) ? { upgradeAll: true } : {}),
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

/** Hand size after a step: a card leaves the hand, a potion does not. */
function handLenAfter(step: Step, hand: CardModel[]): number {
  return cardFor(step, hand) ? hand.length - 1 : hand.length;
}

/**
 * A chosen line (Jev's, the escalator's) played to its end on the board it expected. Its end (energy unused
 * included) is part of the choice: code does not extend it on its own (planTurn stopLine).
 */
function lineDone(memo: CombatPlanMemo, combat: Record<string, unknown>, available: string[]): boolean {
  return memo.remaining.length === 0 && memo.via !== "code" && available.includes("end_turn") && !bool(combat["end_turn_will_kill_player"]);
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
    if (decision.intent.action === "play_card" && decision.label !== "combat/lethal") {
      const played = hand.find((card) => num(card["index"]) === decision.intent.card_index);
      const after = env.screenMemory.plannedAfter;
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
  return guardSandpit(env, planTurn(env));
}

function planTurn(env: DecisionEnv): Decision | null {
  const { state } = env;
  // Before any early return: the turn's first frame sets the exhaust pile it started with.
  const exhaustedEarlier = exhaustedSinceTurnStart(env);
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
  const exhaustedThisTurn = exhaustsEveryTurn || num(player["cards_exhausted_this_turn"]) > 0 || exhaustedEarlier;
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
  const ascension = state.run?.ascension ?? 0;
  const enemies = enemySims(combat, ascension);
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

  const playerSim: PlayerSim = {
    freeAttacks,
    exhaustPile: exhaustPileSize(state.raw),
    ...(drawablePileSize(state.raw) !== undefined ? { drawable: drawablePileSize(state.raw) } : {}),
    // A Duplicator drunk earlier this turn: its next card is played twice (11LC F17 T2).
    duplicate: powerAmount(player, "DUPLICATION_POWER"),
    // One-Two Punch played earlier this turn: its next Attack(s) are played an extra time (9Q7V F17 T14).
    duplicateAttacks: powerAmount(player, "ONE_TWO_PUNCH_POWER"),
    regen: powerAmount(player, "REGEN_POWER"),
    // Buffer already up (a Lucky Tonic drunk earlier this turn or before): the next HP losses are prevented.
    buffer: powerAmount(player, "BUFFER_POWER"),
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
    // Smoggy: one Skill a turn, less the Skills already played.
    maxSkills: powerAmount(player, "SMOGGY_POWER") > 0 ? Math.max(0, 1 - num(player["skills_played_this_turn"])) : null,
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
    // Vambrace doubles the first card Block of the fight, the same way: every Block card shows the doubled
    // number until one is played (G8YY F30 T3: Defend 12 and Shrug It Off 18 planned, 12 + 9 gained).
    unmovableArmed: (powerAmount(player, "UNMOVABLE_POWER") > 0 && num(player["block"]) === 0) || vambraceArmed(relicIds, asArray(combat["hand"]), powerAmount(player, "DEXTERITY_POWER")),
    demonTongue: relicIds.includes("DEMON_TONGUE") && env.screenMemory.demonTongueTurn !== `${hpGuardFight(env)}:${state.turn}`,
    helmetBlock: relicIds.includes("INTIMIDATING_HELMET") ? INTIMIDATING_HELMET_BLOCK : 0,
    hpLossCap: relicIds.includes("BEATING_REMNANT") ? BEATING_REMNANT_CAP : null,
    vigor,
    noBlock: powerAmount(player, "NO_BLOCK_POWER") > 0,
    tender: powerAmount(player, "TENDER_POWER"),
    exhaustedThisTurn,
    // Fairy in a Bottle and Lizard Tail: a line that reaches 0 HP goes on at their HP (JR66CJ9T8H7W F48).
    revives: revivesOf(state, env.screenMemory, num(player["max_hp"])),
    ...(relicIds.includes("PAPER_PHROG") ? { vulnerableFactor: PAPER_PHROG_VULNERABLE } : {}),
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
  const handGrew = memo !== null && hand.length > memo.handLen;
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
      (memo.upgradeAll === true && withoutUpgrades(memo.expectedHand) === withoutUpgrades(handSignature(hand))));
  const asExpected = memo !== null && !handGrew && sameEnemies && drunk && memo.turn === state.turn && sameHand;
  // A chosen line played to its end on the board it expected (lineDone): code does not extend it on its own
  // (stopLine below).
  const lineEnded = memo !== null && asExpected && lineDone(memo, combat, state.available_actions) ? memo.via : null;
  if (memo && asExpected && memo.remaining.length > 0) {
    const next = memo.remaining[0]!;
    const intent = intentFor(next, hand);
    if (intent) {
      const nextCard = cardFor(next, hand);
      noteIntent(env, intent, nextCard);
      if (next.discards) env.screenMemory.gambleDiscards = { turn: memo.turn, cardIds: next.discards };
      env.screenMemory.plannedAfter = { turn: memo.turn, steps: memo.remaining.slice(1) };
      // The last step of a chosen line leaves a memo with nothing left: its end is "stop here" (lineDone).
      // A potion step keeps the hand and is checked on the belt (beltAfter), a card step on the hand.
      const { potions: _checked, afterSelection: _resumed, upgradeAll: _forged, ...kept } = memo;
      const potions = beltAfter(next, state.raw);
      env.screenMemory.combatPlan =
        (memo.remaining.length > 1 || memo.via !== "code") && (nextCard?.draw ?? 0) === 0
          ? {
              ...kept,
              remaining: memo.remaining.slice(1),
              expectedHand: handSignature(hand.filter((card) => card !== nextCard)),
              handLen: handLenAfter(next, hand),
              ...(upgradesHand(next) ? { upgradeAll: true } : {}),
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

  // Foul Potion hits us too (39J9: two drunk at 22 HP): no longer banned, its lines carry the damage to
  // us in hp_lost (card-model FOUL_POTION selfDamage), and drinking it is Jev's call (Dai 2026-09-28).
  const potionsAll = potionViews({ raw: asRecord(state.run?.raw) }, env.knowledge).filter((potion) => potion.can_use);
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
  // No potion use cost (Dai 2026-09-28): a potion line is scored on its simulated outcome like any
  // line; whether it is worth spending is Jev's call, with potion_context as its facts.
  const nowIncoming = enemies.reduce((sum, enemy) => sum + enemy.attacks.reduce((s, a) => s + a.damage * a.hits, 0), 0);
  const nextIncoming =
    asArray(combat["enemies"])
      .map(asRecord)
      .filter((enemy) => enemy["is_alive"] !== false)
      .reduce((sum, enemy) => sum + (multiClawNext(enemy) ?? expectedNextDamage(str(enemy["enemy_id"]), str(enemy["move_id"]), boardDamageContext(enemy, player, ascension)) ?? 0), 0) +
    revivingIllusions(combat).reduce((sum, enemy) => sum + (revivingForecast(str(enemy["enemy_id"]), 1, boardDamageContext(enemy, player, ascension))?.[0] ?? 0), 0);
  const laterIncoming = laterIncomingOf(combat, ascension);
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
  const beltIds = new Set(potionsAll.map((potion) => potion.potion_id));
  const pickFrom = (pile: "discard" | "draw", free: boolean) =>
    pileCardPick(pileCardModels(state, env.knowledge, pile, pileContext), thisTurnIncoming(combat), Math.max(1, enemyTargets.length), free, {
      ...(exhaustPileSize(state.raw) === undefined ? {} : { exhaustReach: (exhaustPileSize(state.raw) ?? 0) + hand.filter((card) => card.exhausts).length }),
      vulnerable: Math.max(0, ...enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.vulnerable)),
    });
  const drawSlot = potionsAll.find((potion) => potion.potion_id === "GAMBLERS_BREW" || potion.potion_id === "DISTILLED_CHAOS" || potion.potion_id === "GLOWWATER_POTION" || potion.potion_id === "BOTTLED_POTENTIAL")?.slot;
  const potionContext: PotionContext = {
    ...pileContext,
    ...(beltIds.has("BLESSING_OF_THE_FORGE") ? { upgrades: forgeUpgrades(state, env.knowledge) } : {}),
    ...(beltIds.has("SOLDIERS_STEW")
      ? { strikePileDamage: [...pileCardModels(state, env.knowledge, "draw", pileContext), ...pileCardModels(state, env.knowledge, "discard", pileContext)].filter(isStrikeCard).reduce((sum, card) => sum + (card.damage ?? 0) * Math.max(1, card.hits), 0) }
      : {}),
    ...(beltIds.has("LIQUID_MEMORIES") ? { discardPick: pickFrom("discard", true) } : {}),
    ...(beltIds.has("DROPLET_OF_PRECOGNITION") ? { drawPick: pickFrom("draw", false) } : {}),
    // Drawn from the draw pile, or the discard pile reshuffled when it is empty.
    ...(drawSlot !== undefined
      ? {
          expectedDraw: expectedDraw(
            (() => {
              const draw = pileCardModels(state, env.knowledge, "draw", pileContext);
              return draw.length > 0 ? draw : pileCardModels(state, env.knowledge, "discard", pileContext);
            })(),
            drawSlot,
          ),
        }
      : {}),
  };
  // A potion is a solver line only when it can be priced on this board (a pile-card potion needs a card
  // to take, a draw potion a known pile); otherwise it stays an unmodelled option as before.
  // Random potions (card-model CHOICE_POTIONS / DRAW_POTIONS) are simulated by Monte Carlo on their own
  // (potion-mc.ts) and offered as "drink now, then re-plan": never a line of this solve.
  const mcSources = new Map<number, PotionMcSource>();
  for (const potion of potionsAll) {
    const source = randomPotionSource(potion, state, env.knowledge, pileContext, noDraw);
    if (source) mcSources.set(potion.slot, source);
  }
  const modelledIds = new Set(
    potionsAll
      .filter((potion) => !mcSources.has(potion.slot) && modelPotion(potion.potion_id, potion.name, potion.slot, potion.valid_targets, 0, potionContext) !== null)
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
            modelPotion(
              potion.potion_id,
              potion.name,
              potion.slot,
              potion.valid_targets,
              0,
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
      potionLimit: null,
      raceEruption,
      wither,
      ...focusInput,
      // Distinct payoff cards, not copies (VHLZ F21: two Bully doubled Bash+'s weight, 16.5 vs 7.5).
      vulnerablePayoffs: new Set(asArray(asRecord(state.run?.raw)["deck"]).map((card) => str(asRecord(card)["card_id"])).filter((id) => VULNERABLE_PAYOFFS.has(id))).size,
      drawPile,
      ...(nextIncoming > 0 ? { nextIncoming } : {}),
      ...(laterIncoming ? { laterIncoming } : {}),
    }));
  const solved = solve();
  // The random potions' Monte Carlo, run once when a decision needs it (every question does).
  const dryBest = solved.plans.find((plan) => !drinksPotion(plan) && !plan.outcome.dies) ?? solved.plans.find((plan) => !drinksPotion(plan)) ?? null;
  let mcResults: PotionMc[] | null = null;
  const randomPotions = (): PotionMc[] => (mcResults ??= runRandomPotions([...mcSources.values()], solvedInput, dryBest, `${fightKey(state)}:${state.turn ?? "?"}:${handSignature(hand)}`));
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
  // The mod's flag does not know Fairy in a Bottle or Lizard Tail: ending the turn at 0 HP with a revive held
  // is lethal to it and to the solver alike (the solver then goes on at the revive's HP).
  const endReachesZero = endNow !== undefined && (endNow.outcome.dies || endNow.outcome.revived !== undefined);
  const calcNote =
    endNow && endReachesZero !== modSaysLethal
      ? ` [calc mismatch: solver says ending now ${endNow.outcome.dies ? "kills" : "does not kill"}, mod says ${modSaysLethal ? "lethal" : "safe"}]`
      : "";

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
    return {
      kind: "act",
      label: "combat/least-loss",
      intent: firstIntent(leastLoss, hand, env),
      rationale: drawing
        ? `every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg ${leastLoss.outcome.damageDealt}): ${leastLoss.steps.map(stepText).join(", ")}`
        : `every simulated line dies; playing the one that keeps the most HP (${leastLoss.outcome.hpAfter}): ${leastLoss.steps.map(stepText).join(", ") || "end turn"}`,
    };
  }

  const planOffer = (potionId: string) => planOffersPotion(fightPlan, potionId, { turn: state.turn ?? 1, bigHit, pressed, costly, offensive: notBlunting(potionId) });
  // Unsimulated potions (neither modelled nor random): offered under T1 (below), a fight plan's keep noted.
  const potions = potionsAll.filter((potion) => !isModelledPotion(potion.potion_id) && !mcSources.has(potion.slot));
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
  // offered to Jev on that turn instead, planPotionNow below.)
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
  const setupStep = (step: Step) =>
    fightPlan !== null &&
    fightPlan.setup.includes(step.cardId) &&
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
    const extraLoss = picked.outcome.hpLoss - replacement.outcome.hpLoss;
    const extraDamage = illusionFight ? realDamage(picked) - realDamage(replacement) : picked.outcome.damageDealt - replacement.outcome.damageDealt;
    return extraLoss > 0 && extraDamage > 0 && extraDamage / extraLoss >= bossHpLeft / Math.max(1, playerSim.hp) && picked.outcome.hpAfter >= nextIncoming + 5;
  };
  // Not on a big-hit turn: that is the turn to block (0YG4 F43 T4: Dark Embrace + Blood Wall, -26,
  // kept over a 29-block line at -13 into the Heavy Cleave).
  const guardKeepsSetup = (picked: Plan, replacement: Plan | null): boolean =>
    winsRace(picked, replacement) ||
    !bigHit &&
    replacement !== null &&
    setupCount(picked) > setupCount(replacement) &&
    // Boss fights: a setup power is kept while HP clears the next hit with room (5BXM F33 T4/T6: Demon
    // Form+ swapped twice at 22-33 HP before a no-attack curse turn, never played; boss left at 152).
    picked.outcome.hpAfter >= (kind === "boss" ? Math.max(playerSim.maxHp * 0.2, nextIncoming + 5) : Math.max(playerSim.maxHp * 0.35, nextIncoming));
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
  const setupClose = setupLine !== undefined && setupLine.outcome.hpLoss <= top.outcome.hpLoss + hpGuardSlack(playerSim.hp, kind, hpGuardExtra(env));
  if (setupClose && !options.includes(setupLine)) options.push(setupLine);
  // A chosen line played to its end is "stop here" for code (9Q7V F17 T14: after Jev's "One-Two Punch" alone,
  // code re-planned and played the Sword Boomerang Jev had turned down as the "only distinct line", killing the
  // Giant into its blast). A lethal, every line dying and the mod's lethal flag are still code's (above); any
  // other play the re-plan finds (a Free Attack from Unrelenting, a Stomp made free) is Jev's call, with
  // ending the turn, the line's own end, among the options.
  const stopLine = lineEnded !== null && top.steps.length > 0 && endNow !== undefined && surviving.includes(endNow) ? endNow : null;
  if (stopLine && !options.includes(stopLine)) options.push(stopLine);
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
  const clear =
    (!second || options.every((plan) => plan === top || dominates(top, plan))) &&
    [...options, ...focusOf.keys()].every((plan) => plan === top || beatsOnTargets(top, plan)) &&
    !setupClose &&
    !(drySurvives && drinksPotion(top)) &&
    potionLethal.length === 0 &&
    stopLine === null;
  // A random potion that beats the best potion-free line in some sample is a real choice: Jev's (like a
  // modelled potion's line). An unsimulated potion is offered only under T1 (UNSIMULATED_HP_SHARE of HP
  // lost by the best potion-free option, or a dying rollout sample: known only once asked), or when the
  // fight plan says now.
  const mcForces = mcSources.size > 0 && randomPotions().some((mc) => mc.beats > 0);
  // T1 asks whether every potion-free option is bad (Dai: 所有结果扣血都很多), so it reads the cheapest
  // potion-free option, not code's top-ranked one (fn0h: fired at -17 while a 0-HP line existed).
  const dryOptions = options.filter((plan) => !drinksPotion(plan));
  const cheapestDry = dryOptions.length === 0 ? null : dryOptions.reduce((a, b) => (b.outcome.hpLoss < a.outcome.hpLoss ? b : a));
  const t1Hp = cheapestDry === null || cheapestDry.outcome.dies || cheapestDry.outcome.hpLoss >= UNSIMULATED_HP_SHARE * playerSim.hp;
  if (clear && !mcForces && !(potions.length > 0 && (t1Hp || planPotionNow))) {
    // Code's own pick in an elite/boss fight meets the same HP bound as Jev's (7DXA F33 T1-T2: code
    // traded -17 and -20 against the Kaiser Crab with Blood Wall lines at -3..-6 in hand, Jev was never
    // asked, and T4's laser killed us exactly). Not recorded against the fight's budget: that is for
    // extra HP a model chose to accept.
    // The guard picks among potion-free lines while one survives (code never drinks on its own).
    const autoGuardLines = surviving.filter((plan) => !drinksKeptPotion(plan) && (!drySurvives || !drinksPotion(plan)));
    let guarded =
      (kind === "elite" || kind === "boss") && !top.outcome.winsFight
        ? hpGuardReplacement(top, autoGuardLines, playerSim.hp, hpGuardSlack(playerSim.hp, kind, hpGuardExtra(env)))
        : hallwayGuard && !top.outcome.winsFight
          ? hpGuardReplacement(top, autoGuardLines, playerSim.hp, hallwayGuardSlack)
          : null;
    if (guarded && guardKeepsSetup(top, guarded)) guarded = null;
    // Racing the Waterfall Giant's eruption, damage is the defence (KG0E F17: the guard swapped four
    // lines, ~66 damage, one to a 0-damage turn; the boss healed and the eruption outgrew us).
    if (raceEruption) guarded = null;
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
              .map((potion) => modelPotion(potion.potion_id, potion.name, potion.slot, potion.valid_targets, 0, potionContext))
              .filter((card): card is CardModel => card !== null),
          ],
        };
  const rollout: LiveRollout | null = rolloutLiveOptions.enabled && rolloutSolver !== null
    ? liveRollout({
        state,
        knowledge: env.knowledge,
        memory: env.screenMemory,
        solver: rolloutSolver,
        plans: surviving,
        shown: [...options, ...mcMedians],
        piles: rolloutPiles(state, env.knowledge, enemyTargets),
        spentMs: mcShown.reduce((sum, mc) => sum + mc.ms, 0),
        orders: kill.orders,
        ordersDropped: kill.dropped,
      })
    : null;
  // Options tied for the rollout's best (the same numbers as Jev reads them): none of them is flagged best.
  const rolloutTiedAll = rollout?.available ? rollout.tied : [];
  const rolloutBest = rollout?.available ? rollout.best : null;
  const rolloutBestIsPotion = rolloutBest !== null && mcMedians.includes(rolloutBest);
  // T1 for the unsimulated potions: the cheapest potion-free option loses UNSIMULATED_HP_SHARE of HP on turn 1,
  // or its rollout has a dying sample.
  const t1Death = rollout !== null && rollout.available && cheapestDry !== null && (rollout.byPlan.get(cheapestDry)?.deaths ?? 0) > 0;
  const offerPotions = potions.length > 0 && (t1Hp || t1Death || planPotionNow);
  const unsimulatedKeys = offerPotions ? potions.reduce((sum, potion) => sum + (potion.requires_target ? Math.min(2, potion.valid_targets.length) : 1), 0) : 0;
  // The 10-option cap holds a slot for every random potion and unsimulated drink shown: plan lines make room.
  const keep = new Set<Plan>([top, ...potionLethal, ...(setupClose && setupLine ? [setupLine] : []), ...focusOf.keys()]);
  const planOptions = trimForPotionOptions(options, mcShown.length + unsimulatedKeys, keep);
  options.splice(0, options.length, ...planOptions);
  const shown = rolloutBest && !rolloutBestIsPotion && !options.includes(rolloutBest) ? [...options, rolloutBest] : options;
  // Tied lines still on the question (a plan line may have been trimmed for a potion's slot).
  // In the question's order (a drink line tied with its dry twin can come first in the rollout's list).
  const shownOrder = (plan: Plan): number => (shown.includes(plan) ? shown.indexOf(plan) : shown.length + mcMedians.indexOf(plan));
  const rolloutTied = rolloutTiedAll.filter((plan) => shown.includes(plan) || mcMedians.includes(plan)).sort((a, b) => shownOrder(a) - shownOrder(b));
  const mcKey = (mc: PotionMc) => potionsAll.find((potion) => potion.slot === mc.source.slot)?.key ?? `p${mc.source.slot}`;
  const keyOfShown = (plan: Plan): string => (mcMedians.includes(plan) ? mcKey(mcShown.find((mc) => mc.median === plan)!) : `plan${shown.indexOf(plan) + 1}`);
  const tiedKeys = rolloutTied.length >= 2 ? rolloutTied.map(keyOfShown) : [];
  // One tied line left after the trim reads as the best among what is shown.
  const bestShown = rolloutTied.length === 1 ? rolloutTied[0]! : rolloutBest;
  const bestShownIsPotion = bestShown !== null && mcMedians.includes(bestShown);
  const tieNote = (plan: Plan): Record<string, JsonValue> => {
    if (tiedKeys.length === 0 || !rolloutTied.includes(plan)) return {};
    const others = tiedKeys.filter((key) => key !== keyOfShown(plan));
    return { rollout_tied: `tied for the best rollout numbers with ${others.join(", ")} (the same expected further HP loss and deaths); the rollout picks none of them` };
  };
  const factsOf = (plan: Plan): Record<string, JsonValue> =>
    rollout ? { ...rolloutFacts(plan, rollout), ...(plan === bestShown ? { rollout_best: true } : {}), ...tieNote(plan) } : {};
  const criteria: Record<string, string | null> = {};
  const byKey = new Map<string, { plan?: Plan; potion?: ActionRequest; label: string }>();
  shown.forEach((plan, index) => {
    const key = `plan${index + 1}`;
    criteria[key] = JSON.stringify({ ...focusNote(plan), ...describePlan(plan, playerSim.maxHp), ...potionLethalNote(plan), ...noEffectNote(plan, surviving), ...fitOf(plan), ...factsOf(plan) });
    byKey.set(key, { plan, label: `${focusOf.has(plan) ? `focus: ${focusOf.get(plan)!.join(", ")} — ` : ""}${plan.steps.map(stepText).join(", ") || "end turn"}` });
  });
  const rolloutRecord = rollout
    ? rolloutLog(rollout, bestShown ? keyOfShown(bestShown) : null, bestShown !== null && !bestShownIsPotion && !options.includes(bestShown), tiedKeys)
    : null;
  // Random potions: always an option (Dai 2026-09-28), "drink now, then re-plan", with the Monte Carlo
  // distribution; the rollout facts are the median sample's line's.
  const othersHeld = potionsAll.length > 1;
  for (const mc of mcShown) {
    const key = mcKey(mc);
    const rolled = rollout && mc.median ? rolloutFacts(mc.median, rollout) : null;
    const facts = rolled ? { ...rolled, rollout: `the median sample's line: ${String(rolled["rollout"])}`, ...(mc.median === bestShown ? { rollout_best: true } : {}), ...(mc.median ? tieNote(mc.median) : {}) } : {};
    criteria[key] = JSON.stringify({ ...potionMcCriteria(mc, dryBest, lineLabel, othersHeld), ...facts });
    byKey.set(key, { potion: { action: "use_potion", option_index: mc.source.slot }, label: `drink ${mc.source.name}, then re-plan` });
  }
  // Unsimulated potions: offered under T1 (or the fight plan's moment), with no invented numbers.
  const t1Why = [t1Hp ? `even the cheapest potion-free option loses ${cheapestDry ? cheapestDry.outcome.hpLoss : "all"} HP this turn (>= ${Math.round(UNSIMULATED_HP_SHARE * 100)}% of ${playerSim.hp})` : "", t1Death ? "the cheapest potion-free option dies in some rollout sample" : "", planPotionNow ? "the fight plan says now" : ""].filter(Boolean).join("; ");
  if (offerPotions) {
    for (const potion of potions) {
      const targets: (number | null)[] = potion.requires_target ? potion.valid_targets : [null];
      for (const target of targets.slice(0, 2)) {
        const key = target === null ? potion.key : `${potion.key}->e${target}`;
        const enemyName = target === null ? null : enemies.find((enemy) => enemy.index === target)?.name ?? `enemy ${target}`;
        const keptBy = planOffer(potion.potion_id) === false ? fightPlan?.potions[potion.potion_id] : undefined;
        criteria[key] = JSON.stringify({
          plays: `drink ${potion.name}${enemyName ? ` on ${enemyName}` : ""} first: ${potion.text}; effect not simulated, then re-plan the turn`,
          simulated: "no: this potion's effect is not simulated, so no HP or damage numbers for it",
          offered_because: t1Why,
          note: `the cheapest card plan alone loses ${Math.min(...options.map((plan) => plan.outcome.hpLoss))} HP this turn`,
          ...(keptBy ? { fight_plan: `keeps it (${keptBy})` } : {}),
          ...(rollout ? { rollout: DRINK_FIRST_ROLLOUT } : {}),
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
          return `${enemyPowerText(power, env.knowledge)}${POWER_NOTES[str(power["power_id"])] ?? ""}`;
        }),
        // Powers the solver does not model: the options' damage into this enemy is counted at 80% (to stay safe).
        ...(unmodelledEnemyPowers(enemy).length > 0 ? { not_modelled: `${unmodelledEnemyPowers(enemy).join(", ")}: not simulated, so the options count damage into this enemy at 80%` } : {}),
      })),
    note: "Each option is a whole turn, already simulated by code; its numbers are exact for this turn. Choose the one that is best for winning the whole fight, not just this turn.",
    // Facts for judging a potion (Jev's call): belt, act boss, Elite ahead, boss clock, run plan.
    potion_context: potionContextJson(env, kind),
    ...(deepseekPlan ? { deepseek_plan: deepseekPlan } : {}),
    ...(lessons.length > 0
      ? {
          experience: {
            note: "lessons from past runs about these enemies (experience base): evidence, not orders",
            lessons: lessons.map((entry) => `[${entry.scope} | confidence ${entry.confidence}, n=${entry.n_support}${entry.n_contradict > 0 ? `, against ${entry.n_contradict}` : ""}] ${entry.lesson}`),
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
      liveEnemies.map((enemy, fallbackIndex) => [numOrNull(enemy["index"]) ?? fallbackIndex, multiClawNext(enemy) ?? expectedNextDamage(str(enemy["enemy_id"]), str(enemy["move_id"]), boardDamageContext(enemy, player, ascension))]),
    );
    const illusions = liveEnemies.filter((enemy) => powerAmount(enemy, "ILLUSION_POWER") > 0);
    const dead = revivingIllusions(combat).map((enemy) => revivingForecast(str(enemy["enemy_id"]), 1, boardDamageContext(enemy, player, ascension))?.[0] ?? null).filter((hit): hit is number => hit !== null);
    const ctx: FactContext = {
      maxHp: playerSim.maxHp,
      hand,
      enemies,
      nextThreat,
      noAttack: enemies.every((enemy) => enemy.attacks.length === 0),
      ...(illusions.length > 0
        ? { revivingThreat: new Map(illusions.map((enemy) => [numOrNull(enemy["index"]) ?? liveEnemies.indexOf(enemy), revivingForecast(str(enemy["enemy_id"]), 1, boardDamageContext(enemy, player, ascension))?.[0] ?? null])) }
        : {}),
      ...(dead.length > 0 ? { revivedThreat: dead.reduce((sum, hit) => sum + hit, 0) } : {}),
    };
    const jevCriteria: Record<string, string | null> = { ...criteria };
    shown.forEach((plan, index) => {
      jevCriteria[`plan${index + 1}`] = JSON.stringify({ ...focusNote(plan), ...describePlan(plan, playerSim.maxHp), ...potionLethalNote(plan), ...noEffectNote(plan, surviving), ...planFacts(plan, ctx), ...fitOf(plan), ...factsOf(plan) });
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
  const autoTop = stopLine ?? (drinksPotion(top) ? (dryFirst(options) ?? top) : top);
  const fallback = (why: string, line: Plan = autoTop): ResolvedAction => ({
    intent: firstIntent(line, hand, env),
    rationale: `${why}; ${line === stopLine ? "ending the turn where the chosen line ended" : `using the code-best ${line === top ? "plan" : "potion-free plan"}`}`,
    confidence: null,
    fallback: true,
    apply: () => commit(env, state.turn, line, hand, "code"),
  });

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
      // Code never adds a drink of its own: a swap (dominator, HP guard) goes only to a line drinking
      // no potion Jev's pick does not drink.
      const chosenPotions = potionIdsOf(chosen.plan!);
      const noNewDrink = (plan: Plan) => potionIdsOf(plan).every((id) => chosenPotions.includes(id));
      // Only into a line that puts at least as much damage into every enemy: which enemy to hit is Jev's call.
      const coversTargets = (plan: Plan) => groups.length < 2 || groups.every((group) => group.indices.every((index) => damageInto(plan, [index], enemies) >= damageInto(chosen.plan!, [index], enemies)));
      const dominator = !hallway && fromJev && answer.confidence < 0.4 ? options.find((plan) => plan !== chosen.plan && noNewDrink(plan) && dominates(plan, chosen.plan!) && coversTargets(plan)) : undefined;
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
      const keepsPick = (plan: Plan) => guardKeepsPick(picked, plan, enemies, rolloutDeaths);
      const proposed = hallway
        ? hallwayGuard && !picked.outcome.winsFight
          ? hpGuardReplacement(picked, guardOptions, playerSim.hp, hallwayGuardSlack, keepsPick)
          : null
        : hpGuardReplacement(picked, guardOptions, playerSim.hp, slack, keepsPick);
      const raceKept = proposed !== null && winsRace(picked, proposed);
      const replacement = proposed && (guardKeepsSetup(picked, proposed) || raceEruption) ? null : proposed;
      const plan = replacement ?? picked;
      const extra = plan.outcome.winsFight ? 0 : Math.max(0, plan.outcome.hpLoss - Math.min(...guardOptions.map((option) => option.outcome.hpLoss)));
      const rank = shown.indexOf(plan) + 1;
      const guardNote = replacement
        ? `; HP guard: plan ${shown.indexOf(picked) + 1} (${lineLabel(picked)}) loses ${picked.outcome.hpLoss} HP, more than ${slack.toFixed(0)} over the cheapest line${slack === 0 ? ` (this fight already took ${HP_GUARD_FIGHT_BUDGET}+ extra HP)` : ""}, playing plan ${rank} (${plan.steps.map(stepText).join(", ") || "end turn"}; hp -${plan.outcome.hpLoss}) instead`
        : "";
      return {
        intent: firstIntent(plan, hand, env),
        rationale: `Jev chose ${pickNote(shown, chosen.plan!, picked)} with confidence ${answer.confidence.toFixed(2)}; code rank ${options.includes(picked) ? options.indexOf(picked) + 1 : "- (rollout's best line, added)"}${guardNote}${calcNote}`,
        confidence: answer.confidence,
        fallback: false,
        ...(replacement ? { guard: { kind: "hp" as const, choice: `plan${rank}`, plan: plan.steps.map(stepText).join(", ") || "end turn" } } : {}),
        apply: () => {
          commit(env, state.turn, plan, hand, escalatedBy ?? "jev");
          if (!hallway) recordHpGuard(env, state.turn, raceKept ? 0 : extra);
        },
      };
    }
  };

  return {
    kind: "ask",
    label: potionLethal.length > 0 ? "combat/plan-choice+potion-lethal" : offerPotions || mcShown.length > 0 ? "combat/plan-choice+potion" : "combat/plan-choice",
    state: questionState,
    questions: { plan: choiceQ("Which plan should I play this turn?", criteria) },
    ...(jevView ? { jevView } : {}),
    // No DeepSeek escalation in combat (Dai 2026-09-28): the turn's line is Jev's call.
    resolve(answers): ResolvedAction {
      const resolved = resolvePlan(answers);
      const potionsRecord: JsonValue | null =
        mcShown.length > 0 || potions.length > 0
          ? { random: mcShown.map(potionMcLog), unsimulated_offered: offerPotions ? potions.map((potion) => potion.potion_id) : [], t1: { hp: t1Hp, rollout_death: t1Death, fight_plan: planPotionNow } }
          : null;
      if (!rolloutRecord && !potionsRecord && focusOf.size === 0) return resolved;
      const answer = answers["plan"];
      const pick = answer?.type === "choice" ? byKey.get(answer.choice) : undefined;
      // The rollout's best chosen: its one best, or any of the options tied for it.
      const bestKeys = tiedKeys.length > 0 ? tiedKeys : bestShown !== null ? [keyOfShown(bestShown)] : [];
      const rolloutBestChosen = bestKeys.length === 0 || pick === undefined || answer?.type !== "choice" ? null : bestKeys.includes(answer.choice);
      // The kill order behind the chosen line's rollout numbers (its best order), when orders were compared.
      const chosenOrder = rollout?.available && pick?.plan ? (rollout.byPlan.get(pick.plan)?.order?.label ?? null) : null;
      return {
        ...resolved,
        log: {
          ...(rolloutRecord ? { rollout: rolloutRecord, rollout_best_chosen: rolloutBestChosen, ...(chosenOrder ? { chosen_order: chosenOrder } : {}) } : {}),
          ...(potionsRecord ? { potions: potionsRecord } : {}),
          ...(focusOf.size > 0 ? { focus: Object.fromEntries([...byKey.entries()].filter(([, entry]) => entry.plan && focusOf.has(entry.plan)).map(([key, entry]) => [key, focusOf.get(entry.plan!)!.join(", ")])) } : {}),
        },
      };
    },
  };
}

/**
 * T1, the gate of the unsimulated potions (Dai 2026-09-28: 12%): the best potion-free option loses at least
 * this share of current HP this turn (or dies in a rollout sample).
 */
export const UNSIMULATED_HP_SHARE = 0.12;

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

/** A game-data card as a card a potion puts in the hand, free this turn (Strength and Weak in). */
export function poolCardModel(info: CardInfo, knowledge: Knowledge, ctx: { enemyTargets: number[]; strength: number; weak: boolean }): CardModel {
  const raw = {
    card_id: info.id,
    name: info.name,
    dynamic_values: info.vars,
    rules_text: info.descriptionRaw,
    resolved_rules_text: info.description,
    target_type: info.target,
    requires_target: info.target === "AnyEnemy",
    playable: true,
    energy_cost: 0,
    costs_x: info.xCost,
    upgraded: false,
    index: 0,
  };
  const model = modelHandCard(raw, 0, knowledge);
  return {
    ...model,
    cost: 0,
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
    const pools: Record<string, CardModel[]> = {};
    for (const type of spec.types) {
      pools[type] = all.filter((card) => card.color === color && card.type === type && POOL_RARITIES.has(card.rarity)).map((card) => poolCardModel(card, knowledge, ctx));
    }
    if (spec.types.some((type) => (pools[type] ?? []).length === 0)) return null;
    return { ...base, pools, poolName: `${color} ${spec.types.join("/")}` };
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
export function runRandomPotions(sources: PotionMcSource[], solver: SolverInput | null, dryBest: Plan | null, boardKey: string): PotionMc[] {
  if (solver === null || sources.length === 0) return [];
  const dry: SolverInput = { ...solver, hand: solver.hand.filter((card) => card.type !== "Potion") };
  const out: PotionMc[] = [];
  let spent = 0;
  sources.forEach((source, index) => {
    const budget = Math.max(0, (potionMcOptions.budgetMs - spent) / (sources.length - index));
    const mc = runPotionMc(dry, source, dryBest, seedOf(`${boardKey}:${source.potionId}:${source.slot}`), budget);
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
  // The Sandpit's deadline (it reaches 0 at the enemy turn): only a Frantic Escape played this turn keeps the
  // pit from taking us whatever our HP, so when a line plays one, only such lines, the Escape first (KY3Y
  // F33 T9: Sandpit 1, least-loss drew first with Burning Pact, which exhausted the 1-cost Escape).
  const pitSafe = (plan: Plan) => plan.outcome.sandpitAfter === null || plan.outcome.sandpitAfter > 0;
  const deadline = allPlans.some(pitSafe) && allPlans.some((plan) => !pitSafe(plan));
  const plans = deadline ? allPlans.filter(pitSafe) : allPlans;
  const picked = leastLossOf(plans, hand, hp);
  const escape = deadline ? picked.steps.findIndex((step) => step.cardId === "FRANTIC_ESCAPE") : -1;
  return escape > 0 ? { ...picked, steps: [picked.steps[escape]!, ...picked.steps.slice(0, escape), ...picked.steps.slice(escape + 1)] } : picked;
}

function leastLossOf(plans: Plan[], hand: CardModel[], hp: number): Plan {
  // A drawing card whose own HP cost kills us is no draw (2VW5 F28 T7: Offering at 5 HP played first).
  const drawAt = (plan: Plan): number =>
    plan.steps.findIndex((step) => hand.some((card) => card.index === step.cardIndex && drawsCards(card) && card.hpLoss < hp));
  const drawing = plans.filter((plan) => drawAt(plan) >= 0);
  if (drawing.length === 0) return plans.reduce((a, b) => (b.outcome.hpAfter > a.outcome.hpAfter ? b : a));
  const most = drawing.reduce((a, b) =>
    b.outcome.damageDealt > a.outcome.damageDealt || (b.outcome.damageDealt === a.outcome.damageDealt && b.outcome.hpAfter > a.outcome.hpAfter) ? b : a,
  );
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

export function laterIncomingOf(combat: Record<string, unknown>, asc?: number): number[] | null {
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
  for (const enemy of asArray(combat["enemies"]).map(asRecord).filter((entry) => entry["is_alive"] !== false)) {
    const forecast = damageForecast(str(enemy["enemy_id"]), str(enemy["move_id"]), LATER_TURNS, powerAmount(enemy, "ASLEEP_POWER"), ctxOf(enemy));
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
export function vambraceArmed(relicIds: string[], hand: unknown[], dexterity: number): boolean {
  if (!relicIds.includes("VAMBRACE")) return false;
  return hand.some((entry) => {
    const block = asArray(asRecord(entry)["dynamic_values"]).map(asRecord).find((value) => str(value["name"]) === "Block");
    if (!block) return false;
    const own = (numOrNull(block["enchanted_value"]) ?? numOrNull(block["base_value"]) ?? 0) + dexterity;
    const shown = numOrNull(block["current_value"]) ?? own;
    return own > 0 && shown >= 2 * own - 1;
  });
}

/** Fairy in a Bottle: back at this share of max HP (「回复到你最大生命值的30%」), rounded down like the logged Lizard Tail. */
export const FAIRY_REVIVE_SHARE = 0.3;
/**
 * Lizard Tail: back at this share of max HP (the text's {Heal}% is unfilled in the game data; logged triggers:
 * 0NG27W8QBNYX F24 17 -> 35 of 71, PU21Z67J65NE F33 18 -> 44 of 89, V5S6QVVQYL37 F17 6 -> 39 of 80).
 */
export const LIZARD_TAIL_REVIVE_SHARE = 0.5;
/** A Lizard Tail trigger read up to this much under its HP (a start-of-turn loss after it: V5S6 39 of 80). */
const LIZARD_TAIL_SLACK = 5;

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

/**
 * Lizard Tail's one use this run, read from the states (called on every state the loop reads, and by the
 * journal replay after a restart): a combat turn that began at its HP (50% of max, up to LIZARD_TAIL_SLACK
 * under) right after a turn whose last state read lethal (the mod's end_turn_will_kill_player, or the
 * intents past our block at least our HP), with no Fairy spent in between.
 */
export function trackLizardTail(memory: DecisionEnv["screenMemory"], state: GameState): void {
  const runId = str(state.raw["run_id"]);
  if (!runId) return;
  if (memory.lizardTail?.runId !== runId) memory.lizardTail = { runId, used: false };
  const tail = memory.lizardTail;
  if (tail.used) return;
  const runRaw = asRecord(state.run?.raw);
  const combat = asRecord(state.raw["combat"]);
  const player = asRecord(combat["player"]);
  const held = asArray(runRaw["relics"]).some((relic) => str(asRecord(relic)["relic_id"]) === "LIZARD_TAIL");
  if (!held || !state.in_combat || numOrNull(player["current_hp"]) === null) {
    tail.last = undefined;
    return;
  }
  const hp = num(player["current_hp"]);
  const revive = Math.floor(num(player["max_hp"]) * LIZARD_TAIL_REVIVE_SHARE);
  const fight = fightKey(state);
  const turn = state.turn ?? 0;
  const fairies = fairiesHeld(runRaw).length;
  const last = tail.last;
  if (last && last.fight === fight && turn > last.turn && last.lethal && fairies >= last.fairies && hp > 0 && hp <= revive && hp >= revive - LIZARD_TAIL_SLACK) {
    tail.used = true;
    tail.last = undefined;
    return;
  }
  const incoming = asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .reduce((sum, enemy) => sum + asArray(enemy["intents"]).map(asRecord).reduce((s, intent) => s + (numOrNull(intent["damage"]) ?? 0) * Math.max(1, numOrNull(intent["hits"]) ?? 1), 0), 0);
  const lethal = bool(combat["end_turn_will_kill_player"]) || incoming - num(player["block"]) >= hp;
  tail.last = { fight, turn, hp, lethal, fairies };
}

/** Kusarigama (every 3rd attack in a turn: 6 to a random enemy), with the attacks counted so far. */
function kusarigamaOf(run: unknown): { every: number; damage: number; count: number } | undefined {
  const relic = asArray(asRecord(run)["relics"]).map(asRecord).find((entry) => str(entry["relic_id"]) === "KUSARIGAMA");
  return relic ? { every: 3, damage: 6, count: num(relic["stack"]) % 3 } : undefined;
}
