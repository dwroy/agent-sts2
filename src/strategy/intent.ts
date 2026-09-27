/**
 * Strategic intents: the closed vocabulary DeepSeek's run and fight plans are written in, and the one
 * translation table from each intent to what code and Jev concretely do with it.
 *
 * DeepSeek sets strategy only (Dai: "ds 只做全局战略，不下具体战术指令"): how much HP is worth, how much
 * route risk to take, which potion roles are reserved for the act boss, which card roles the deck
 * needs or must not take, the objective of a fight and the order enemies die in. It never names a
 * card to play, a potion to drink or a turn. Code (the turn solver, map/rest/shop/reward scoring) and
 * Jev carry the intents out; every option Jev sees carries a compliance label from this table.
 *
 * Why: its tactical orders contradicted each other and the run (notes/plan-adherence.md): fight plans
 * told code to drink "early"/"big_hit" 12 of the 17 potions the run plan had kept for the boss (EJXC
 * F28: the Flex Potion kept for the Insatiable, boss left at 31), "setup" was planned at 14 HP, and
 * the HP guard undid 45 plan-consistent setup picks (JF99 F33, 5BXM F33).
 *
 * Translation table (compact; the functions below are the whole of it):
 *
 *   hp_policy (run)       preserve  solver HP x1.25, guard slack x0.75, hallway guard below 75% HP,
 *                                   rest heals below target (entry_hp_pct or 80%), map: elites -3,
 *                                   "?" -1.5 and Monster -0.5 at low HP, rest +1.5
 *                         balanced  the defaults
 *                         push      solver HP x0.9 / damage x1.1, guard slack x1.25, smith over heal at
 *                                   55%+, elites +1.5 above 70% HP; none of it below 50% HP
 *   route_risk (run)      avoid_elites  an Elite next node is not offered while another node is; -6 on
 *                                   elites further down; seek_elites +2 above 60% HP; normal nothing
 *   entry_hp_pct (run)    within 6 floors of the boss rest heals below it (+8), within 8 floors no
 *                                   elite that leaves it out of reach (-8); a raised target steers
 *                                   rest (+3 heal) and map (rest +1.5) at any distance
 *   reserve (run)         potion roles kept for the act boss: HARD filtered from every non-boss line
 *                                   and offer, released only below 25% HP or when every line without
 *                                   it dies; free in the boss fight
 *   needs / avoid (run)   needed card roles get the must-have pick bonus; avoided card ids/roles are
 *                                   not offered at rewards and shops (acquisition only)
 *   objective (fight)     preserve_hp      solver HP x1.4, damage x0.85; guard slack x0.5; no setup
 *                                          protection
 *                         scale_then_kill  lasting value x1.5; the guard keeps a line with more setup
 *                                          (powers, permanent Strength) unless it risks death
 *                                          (HP after <= next hit + 3 or < 15% max); setup lines in
 *                                          turns 1-3 go to Jev
 *                         kill_fast        damage x1.2, HP x0.9; guard slack x1.25; the damage-for-HP
 *                                          race rule applies in every fight
 *                         race             damage x1.3, HP x0.85, lasting x0.5; guard slack x1.5; race rule
 *   kill_priority (fight) the first living enemy in the list is the solver's focus target
 *   threat, summary (fight), boss_prep (run)  free text, shown to Jev as context only (short)
 */

import type { CardRole, PotionRole } from "../knowledge/dossiers.js";
import type { FightPlan } from "./fight-plan.js";
import type { RunPlan } from "./run-plan.js";

export const HP_POLICIES = ["preserve", "balanced", "push"] as const;
export type HpPolicy = (typeof HP_POLICIES)[number];
export const ROUTE_RISKS = ["avoid_elites", "normal", "seek_elites"] as const;
export type RouteRisk = (typeof ROUTE_RISKS)[number];
export const FIGHT_OBJECTIVES = ["kill_fast", "preserve_hp", "scale_then_kill", "race"] as const;
export type FightObjective = (typeof FIGHT_OBJECTIVES)[number];
export const POTION_ROLES: readonly PotionRole[] = ["block", "weak", "damage", "strength", "heal", "any"];
export const CARD_ROLES: readonly CardRole[] = ["aoe", "strength", "block", "draw", "exhaust", "multi_hit", "frontload", "debuff"];
/** Reasons a re-plan may change an intent (plan-validator.ts checks each against the facts). */
export const CHANGE_TRIGGERS = [
  "hp_below_target", "hp_recovered", "boss_gap_widened", "boss_gap_closed",
  "key_card_or_relic_gained", "potion_lost_or_gained", "act_changed", "forced_route",
] as const;
export type ChangeTrigger = (typeof CHANGE_TRIGGERS)[number];

export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

/** What each intent means, in the words Jev and DeepSeek are shown. */
export const MEANING = {
  hp_policy: {
    preserve: "HP is scarce: take the line that loses the least HP unless another wins the fight; no setup that costs big HP; rest heals below the target; no optional elites or '?' rooms at low HP",
    balanced: "default trade-off between HP, damage and setup",
    push: "HP is a resource to spend for damage, elites and upgrades (never below 50% HP)",
  } satisfies Record<HpPolicy, string>,
  route_risk: {
    avoid_elites: "no optional elite: an elite node is not taken while another node is open",
    normal: "elites only at healthy HP (code's default route scoring)",
    seek_elites: "take elites while HP is above 60% (relics and better cards)",
  } satisfies Record<RouteRisk, string>,
  objective: {
    kill_fast: "end the fight quickly: most damage, accept a little more HP loss",
    preserve_hp: "lose as little HP as possible: block first, damage second",
    scale_then_kill: "play powers / permanent Strength in the first turns (a few HP is fine, never a risk of death), then kill",
    race: "the enemy scales or the clock is short: maximum damage every turn, HP traded for damage while behind; a turn the clock grants (Frantic Escape) is worth a full turn of damage",
  } satisfies Record<FightObjective, string>,
};

// ---------------------------------------------------------------- solver weights and the HP guard

export interface SolverScale {
  /** Multiplies the solver's HP weight. */
  hp: number;
  /** Multiplies its damage weight. */
  damage: number;
  /** Multiplies the lasting value (powers, permanent Strength) of a line. */
  lasting: number;
}

export const OBJECTIVE_SOLVER: Record<FightObjective, SolverScale> = {
  preserve_hp: { hp: 1.4, damage: 0.85, lasting: 0.8 },
  scale_then_kill: { hp: 1, damage: 0.9, lasting: 1.5 },
  kill_fast: { hp: 0.9, damage: 1.2, lasting: 0.7 },
  race: { hp: 0.85, damage: 1.3, lasting: 0.5 },
};
export const HP_POLICY_SOLVER: Record<HpPolicy, { hp: number; damage: number }> = {
  preserve: { hp: 1.25, damage: 1 },
  balanced: { hp: 1, damage: 1 },
  push: { hp: 0.9, damage: 1.1 },
};
/** Below this HP fraction "push" is off (its safety limit). */
export const PUSH_FLOOR = 0.5;
/** Below this HP fraction no intent lowers the HP weight. */
export const HP_WEIGHT_FLOOR = 0.3;

/** Solver weight multipliers for the fight objective and run HP policy (1/1/1 without either). */
export function solverScale(objective: FightObjective | null, policy: HpPolicy, hpFraction: number): SolverScale {
  const base = objective ? OBJECTIVE_SOLVER[objective] : { hp: 1, damage: 1, lasting: 1 };
  const run = policy === "push" && hpFraction < PUSH_FLOOR ? HP_POLICY_SOLVER.balanced : HP_POLICY_SOLVER[policy];
  let hp = base.hp * run.hp;
  if (hpFraction < HP_WEIGHT_FLOOR) hp = Math.max(1, hp);
  return { hp, damage: base.damage * run.damage, lasting: base.lasting };
}

export const OBJECTIVE_GUARD: Record<FightObjective, number> = { preserve_hp: 0.5, scale_then_kill: 1, kill_fast: 1.25, race: 1.5 };
export const HP_POLICY_GUARD: Record<HpPolicy, number> = { preserve: 0.75, balanced: 1, push: 1.25 };

/** HP-guard slack multiplier (how much extra HP over the cheapest line a pick may cost). */
export function guardSlackScale(objective: FightObjective | null, policy: HpPolicy, hpFraction: number): number {
  const run = policy === "push" && hpFraction < PUSH_FLOOR ? 1 : HP_POLICY_GUARD[policy];
  return (objective ? OBJECTIVE_GUARD[objective] : 1) * run;
}

/**
 * Whether the hallway HP guard is on: balanced from act 2 (or A5+) below 60% HP (VHLZ F21), preserve
 * in any act below 75%, push from act 2 below 45%.
 */
export function hallwayGuardOn(policy: HpPolicy, act: number, ascension: number, hpFraction: number): boolean {
  const later = act >= 2 || ascension >= 5;
  if (policy === "preserve") return hpFraction < 0.75;
  if (policy === "push") return later && hpFraction < 0.45;
  return later && hpFraction < 0.6;
}

/** A setup line "risks death": it leaves no more than next turn's hit + 3, or under 15% of max HP. */
export function setupRisksDeath(hpAfter: number, nextIncoming: number, maxHp: number): boolean {
  return hpAfter <= nextIncoming + 3 || hpAfter < maxHp * 0.15;
}

/**
 * scale_then_kill: the HP guard keeps a line with more setup than its replacement unless the line
 * risks death (JF99 F33 T4/T7: Crimson Mantle swapped twice for 6 HP, never played; 5BXM F33 Demon Form+).
 */
export function guardProtectsSetup(objective: FightObjective | null, picked: { setup: number; hpAfter: number }, replacement: { setup: number }, nextIncoming: number, maxHp: number): boolean {
  return objective === "scale_then_kill" && picked.setup > replacement.setup && !setupRisksDeath(picked.hpAfter, nextIncoming, maxHp);
}

/** race / kill_fast: the guard's damage-for-HP race rule applies in every fight, not only boss/elite. */
export function tradesHpForDamage(objective: FightObjective | null): boolean {
  return objective === "race" || objective === "kill_fast";
}

/** A setup line in the first turns becomes a question for Jev (scale_then_kill only). */
export function promotesSetup(objective: FightObjective | null, turn: number, laterPhase: boolean): boolean {
  return objective === "scale_then_kill" && turn <= 3 && !laterPhase;
}

// ---------------------------------------------------------------- reserved potions

/** A potion's role (the run plan reserves roles, not ids). */
export function potionRole(potionId: string, text: string): PotionRole | null {
  // By id as well as text: the Dexterity Potion reads 「获得{DexterityPower}点敏捷」 and matched no role
  // (GZ24 F8: drunk on an elite's T1 while the run plan kept [block, weak]); Regen is healing over turns.
  return /STRENGTH|FLEX/.test(potionId) ? "strength" :
    /REGEN|BLOOD_POTION|FAIRY/.test(potionId) || /回复|heal|恢复|再生|regen/i.test(text) ? "heal" :
    /DEXTERITY|BLOCK_POTION|FORTIFIER|SPEED_POTION|GHOST_IN_A_JAR|HEART_OF_IRON|SHIP_IN_A_BOTTLE/.test(potionId) || /格挡|block|无实体|intangible|敏捷|dexterity/i.test(text) ? "block" :
    /虚弱|weak/i.test(text) ? "weak" :
    /伤害|damage/i.test(text) ? "damage" : null;
}

export function isReserved(reserve: readonly PotionRole[] | undefined, potionId: string, text: string): boolean {
  const roles = reserve ?? [];
  if (roles.length === 0) return false;
  if (roles.includes("any")) return true;
  const role = potionRole(potionId, text);
  return role !== null && roles.includes(role);
}

/** Below this HP fraction a reserved potion may be drunk in any fight. */
export const RESERVE_RELEASE_HP = 0.25;

/** Why reserved potions are usable right now, or null when they stay in the belt. */
export function reserveReleased(ctx: { bossFight: boolean; hpFraction: number; everyDryLineDies: boolean }): string | null {
  if (ctx.bossFight) return "act boss: the reserve is for this fight";
  if (ctx.hpFraction < RESERVE_RELEASE_HP) return `HP below ${RESERVE_RELEASE_HP * 100}%`;
  if (ctx.everyDryLineDies) return "every line without it dies";
  return null;
}

// ---------------------------------------------------------------- deck acquisition

/** Why the run plan forbids taking this card (reward, shop), or null. */
export function planForbidsCard(plan: RunPlan | null | undefined, cardId: string, roles: Set<string>): string | null {
  if (!plan) return null;
  if (plan.want.includes(cardId)) return null;
  if (plan.avoid.includes(cardId)) return `run plan avoids ${cardId}`;
  const role = (plan.avoidRoles ?? []).find((entry) => roles.has(entry));
  return role ? `run plan avoids ${role} cards` : null;
}

// ---------------------------------------------------------------- rest sites and the map

/** HP target when the plan names no entry HP. */
export const HP_TARGET: Record<HpPolicy, number> = { preserve: 0.8, balanced: 0.7, push: 0.6 };

export function hpTarget(plan: RunPlan | null | undefined): number {
  return plan?.entryHp ?? HP_TARGET[plan?.hpPolicy ?? "balanced"];
}

/** Whether the entry-HP target was raised by a change in this act. */
export function entryRaised(plan: RunPlan | null | undefined): boolean {
  return (plan?.changes ?? []).some((change) => change.field === "entry_hp_pct" && change.act === plan!.act && Number(change.to) > Number(change.from ?? 0));
}

/** Rest-site score change for HEAL / SMITH from the run plan's intents. */
export function restShift(plan: RunPlan | null | undefined, option: string, hpPct: number, beforeBoss: boolean, toBoss = 99): number {
  if (!plan) return 0;
  // Enforced: within 6 floors of the boss, heal while below the plan's entry HP.
  if (plan.entryHp && toBoss <= 6 && hpPct < plan.entryHp) return option === "HEAL" ? 8 : 0;
  let shift = 0;
  if (entryRaised(plan) && plan.entryHp && hpPct < plan.entryHp && option === "HEAL") shift += 3;
  const policy = plan.hpPolicy ?? "balanced";
  if (policy === "preserve" && hpPct < hpTarget(plan)) shift += option === "HEAL" ? 4 : option === "SMITH" ? -2 : 0;
  // Push smiths at healthy HP, never over the pre-boss heal.
  if (policy === "push" && hpPct >= 0.55 && !beforeBoss) shift += option === "SMITH" ? 3 : option === "HEAL" ? -2 : 0;
  return shift;
}

/** Route weight change for a node from the run plan's intents, at the projected HP on arrival. */
export function mapShift(plan: RunPlan | null | undefined, type: string, hpOnArrival: number, toBoss = 99): number {
  if (!plan) return 0;
  const policy = plan.hpPolicy ?? "balanced";
  const risk = plan.routeRisk ?? "normal";
  const low = hpOnArrival < hpTarget(plan);
  switch (type) {
    case "Elite": {
      // Enforced: near the boss, no elite that would leave the entry HP out of reach.
      if (plan.entryHp && toBoss <= 8 && hpOnArrival < plan.entryHp + 0.15) return -8;
      let shift = risk === "avoid_elites" ? -6 : risk === "seek_elites" && hpOnArrival > 0.6 ? 2 : 0;
      if (policy === "preserve") shift -= 3;
      if (policy === "push" && hpOnArrival > 0.7) shift += 1.5;
      return shift;
    }
    case "Unknown":
      return policy === "preserve" && hpOnArrival < 0.6 ? -1.5 : 0;
    case "Monster":
      return policy === "preserve" && hpOnArrival < 0.5 ? -0.5 : policy === "push" && hpOnArrival > 0.6 ? 0.5 : 0;
    case "RestSite":
    case "Rest":
      return (policy === "preserve" && low ? 1.5 : 0) + (entryRaised(plan) && plan.entryHp && hpOnArrival < plan.entryHp ? 1.5 : 0);
    default:
      return 0;
  }
}

/** avoid_elites is hard on the next node: Elite options go while another node is open. */
export function routeRiskFilter<T extends { type: string }>(plan: RunPlan | null | undefined, options: T[]): T[] {
  if (plan?.routeRisk !== "avoid_elites") return options;
  const others = options.filter((option) => option.type !== "Elite");
  return others.length > 0 ? others : options;
}

// ---------------------------------------------------------------- compliance labels (Jev)

export interface LineFacts {
  hpLoss: number;
  damage: number;
  /** Setup value: powers played and permanent Strength gained. */
  setup: number;
  winsFight: boolean;
  /** Damage into the kill-priority enemy, null without one. */
  focusDamage: number | null;
  /** Frantic Escapes the line plays (each +1 Sandpit turn). */
  escapes?: number;
  /** Code's rank-1 line: the solver's best score under the objective's weights. */
  codeTop?: boolean;
}
/** The Sandpit race (The Insatiable), when one is on. */
export interface SandpitField {
  /** Damage one more Sandpit turn is worth (turn-solver sandpitTurnValue). */
  turnValue: number;
  /** The Sandpit's turns left are no more than the turns the kill needs. */
  behind: boolean;
  /** Sandpit now and turns the kill needs at a turn's damage. */
  now: number;
  turnsNeeded: number;
  /** Most Frantic Escapes any shown line plays. */
  maxEscapes: number;
}
export interface LineField {
  minLoss: number;
  /** Most objective damage of any shown line (objectiveDamage: this turn's damage plus Sandpit turns bought). */
  maxDamage: number;
  maxSetup: number;
  /** HP over the safest line a "preserve" policy tolerates. */
  slack: number;
  focusName?: string;
  sandpit?: SandpitField;
}

/**
 * A line's damage toward the fight's objective: this turn's damage plus each Sandpit turn it buys at
 * a turn's worth (9V09: "Pommel Strike+, Frantic Escape, Sword Boomerang+" read "breaks race: 21 less
 * damage" against a line with no Escape, while the Escape bought a ~49-damage turn).
 */
export function objectiveDamage(line: Pick<LineFacts, "damage" | "escapes">, sandpit?: SandpitField): number {
  return line.damage + (sandpit ? (line.escapes ?? 0) * sandpit.turnValue : 0);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * The compliance label of one combat line: "fits <intent>: …" or "breaks <intent>: …" per intent,
 * joined. `breaks` is set when a soft intent is broken (a pick of it is logged as a deviation).
 * Damage is objective damage (Sandpit turns bought count as turns of damage), and code's rank-1 line
 * never breaks the fight objective: the solver ranked it with the objective's weights, so the label
 * cannot contradict it (9V09 F33 T2-T3: code's rank 1 labelled "breaks race" three times; Jev followed
 * the labels, 0 of 21 "breaks" options picked, and no Frantic Escape was played).
 */
export function combatFit(objective: FightObjective | null, policy: HpPolicy, line: LineFacts, field: LineField): { label: string; breaks: boolean } {
  if (line.winsFight) return { label: "fits every intent: wins the fight", breaks: false };
  const parts: string[] = [];
  let breaks = false;
  const extraLoss = line.hpLoss - field.minLoss;
  const pit = field.sandpit;
  const escapes = line.escapes ?? 0;
  const bought = pit && escapes > 0 ? ` (+${plural(escapes, "Sandpit turn")}, ~${Math.round(pit.turnValue)} damage each)` : "";
  const codeBest = (name: string, why: string) => parts.push(`fits ${name}: code's best line under ${name} weights (${why})`);
  if (objective === "preserve_hp") {
    if (extraLoss <= 0) parts.push("fits preserve_hp: loses the least HP");
    else if (extraLoss <= 2) parts.push(`fits preserve_hp: within ${extraLoss} HP of the safest line`);
    else if (line.codeTop) codeBest("preserve_hp", `${extraLoss} more HP than the safest line${bought}`);
    else {
      parts.push(`breaks preserve_hp: loses ${extraLoss} more HP than the safest line`);
      breaks = true;
    }
  } else if (objective === "scale_then_kill") {
    if (field.maxSetup <= 0) parts.push("fits scale_then_kill: nothing to set up this turn");
    else if (line.setup >= field.maxSetup) parts.push("fits scale_then_kill: sets up (powers / Strength)");
    else if (pit?.behind && escapes > 0 && escapes >= pit.maxEscapes) parts.push(`fits scale_then_kill: buys time to scale${bought}`);
    else if (line.codeTop) codeBest("scale_then_kill", `less setup than another line${bought}`);
    else {
      parts.push("breaks scale_then_kill: skips setup another line plays");
      breaks = true;
    }
  } else if (objective === "kill_fast" || objective === "race") {
    const value = objectiveDamage(line, pit);
    const short = Math.round(field.maxDamage - value);
    if (short <= Math.max(2, field.maxDamage * 0.1)) parts.push(`fits ${objective}: most damage${bought ? `, counting the Sandpit turns bought${bought}` : ""}`);
    else if (line.codeTop) codeBest(objective, `${short} less damage than the best line${bought ? `, counting the Sandpit turns bought${bought}` : ""}, for less HP or more lasting value`);
    else {
      parts.push(`breaks ${objective}: ${short} less damage than the best line${pit && pit.maxEscapes > 0 ? ", counting the Sandpit turns Frantic Escape buys" : ""}${bought}`);
      breaks = true;
    }
  }
  // The Sandpit eats us at 0 whatever the HP: while the pit is no longer than the kill, a line
  // playing fewer Frantic Escapes than another gives a turn away (9V09, X8HF rule 2).
  if (pit?.behind && escapes < pit.maxEscapes) {
    const fewer = pit.maxEscapes - escapes;
    const why = `${plural(fewer, "Frantic Escape")} fewer than another line while the Sandpit (${pit.now}) is no longer than the kill (~${pit.turnsNeeded} turns)`;
    if (line.codeTop) parts.push(`note: ${why}`);
    else {
      parts.push(`breaks the Sandpit race: ${why}`);
      breaks = true;
    }
  }
  if (policy === "preserve" && objective !== "preserve_hp" && extraLoss > field.slack) {
    parts.push(`breaks hp_policy preserve: loses ${extraLoss} more HP than the safest line`);
    breaks = true;
  }
  if (line.focusDamage !== null && line.focusDamage > 0) parts.push(`hits kill-priority ${field.focusName ?? "enemy"} for ${line.focusDamage}`);
  return { label: parts.length > 0 ? parts.join("; ") : "neutral", breaks };
}

/** Compliance label of a map node for Jev. */
export function mapFit(plan: RunPlan | null | undefined, type: string, hpPct: number): string | null {
  if (!plan) return null;
  if (type === "Elite") {
    if (plan.routeRisk === "avoid_elites") return "breaks route_risk avoid_elites";
    if (plan.hpPolicy === "preserve") return "breaks hp_policy preserve: optional elite";
    if (plan.routeRisk === "seek_elites" && hpPct > 0.6) return "fits route_risk seek_elites";
  }
  if ((type === "RestSite" || type === "Rest") && plan.hpPolicy === "preserve" && hpPct < hpTarget(plan)) return "fits hp_policy preserve: heal toward the target";
  if (type === "Unknown" && plan.hpPolicy === "preserve" && hpPct < 0.6) return "breaks hp_policy preserve: '?' can cost HP";
  return null;
}

/** Compliance label of a rest option for Jev. */
export function restFit(plan: RunPlan | null | undefined, option: string, hpPct: number): string | null {
  if (!plan) return null;
  const target = hpTarget(plan);
  if (plan.hpPolicy === "preserve" || (plan.entryHp && entryRaised(plan))) {
    if (hpPct < target) return option === "HEAL" ? `fits hp_policy ${plan.hpPolicy}: heals toward ${Math.round(target * 100)}%` : `breaks hp_policy ${plan.hpPolicy}: HP ${Math.round(hpPct * 100)}% is below the ${Math.round(target * 100)}% target`;
  }
  if (plan.hpPolicy === "push" && hpPct >= 0.55 && option === "SMITH") return "fits hp_policy push: upgrade while HP allows";
  return null;
}

// ---------------------------------------------------------------- what Jev is told

/** Floors after a change for which Jev sees "strategy changed at F<n>". */
export const CHANGE_NOTICE_FLOORS = 3;

/** One line per current strategic intent, with what it means; recent changes after them. */
export function intentLines(run: RunPlan | null | undefined, fight: FightPlan | null | undefined, floor: number | null = null): string[] {
  const lines: string[] = [];
  if (run) {
    const policy = run.hpPolicy ?? "balanced";
    lines.push(`hp_policy ${policy}${run.entryHp ? ` (enter the act boss at ${Math.round(run.entryHp * 100)}%+ HP)` : ""}: ${MEANING.hp_policy[policy]}`);
    const risk = run.routeRisk ?? "normal";
    if (risk !== "normal") lines.push(`route_risk ${risk}: ${MEANING.route_risk[risk]}`);
    if ((run.reserve ?? []).length > 0) lines.push(`reserve ${run.reserve.join(", ")} potions for the act boss: not offered before it (only below 25% HP or when every other line dies)`);
    if ((run.needs ?? []).length > 0) lines.push(`deck needs ${run.needs.join(", ")} cards before the act boss`);
    if (run.bossPrep) lines.push(`boss prep (context): ${short(run.bossPrep)}`);
    for (const change of recentChanges(run, floor)) lines.push(`strategy changed at F${change.floor}: ${change.field} ${fmt(change.from)}→${fmt(change.to)} because ${change.trigger}${change.fact ? ` (${change.fact})` : ""}`);
  }
  if (fight) {
    lines.push(`fight objective ${fight.objective}: ${MEANING.objective[fight.objective]}`);
    if (fight.killPriority.length > 0) lines.push(`kill priority: ${fight.killPriority.join(" > ")}`);
    // The plan in DeepSeek's words, context only (9V09 F33: "Play every affordable Frantic Escape
    // early" never reached Jev, only the objective's one-line meaning did).
    if (fight.summary) lines.push(`fight plan (context): ${short(fight.summary)}`);
    if (fight.threat) lines.push(`threat (context): ${short(fight.threat)}`);
  }
  return lines;
}

export function recentChanges(run: RunPlan, floor: number | null): RunPlan["changes"] {
  if (floor === null) return [];
  return (run.changes ?? []).filter((change) => floor - change.floor <= CHANGE_NOTICE_FLOORS && floor >= change.floor);
}

/** Context text for Jev, kept short. */
export const CONTEXT_CHARS = 240;
function short(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= CONTEXT_CHARS ? flat : `${flat.slice(0, CONTEXT_CHARS - 1)}…`;
}

function fmt(value: unknown): string {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  if (typeof value === "number") return value <= 1 ? `${Math.round(value * 100)}%` : String(value);
  return value === null || value === undefined ? "-" : String(value);
}
