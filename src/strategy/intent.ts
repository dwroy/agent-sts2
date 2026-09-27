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
 *                                   balanced in an act-boss fight behind its clock (combatPolicy),
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
 *                                   and offer, released only below 25% HP, when every line without it
 *                                   dies, or when the safest line without it ends within next turn's
 *                                   hit + 3 (then no save cost at all); free in the boss fight; burst
 *                                   potions (energy, card-making, Duplicator) are "damage" by id;
 *                                   Potion-Shaped Rocks never reserved (free to drink with the Toad)
 *   needs / avoid (run)   needed card roles get the must-have pick bonus; avoided card ids/roles are
 *                                   not offered at rewards and shops (acquisition only)
 *   objective (fight)     preserve_hp      solver HP x1.4, damage x0.85; guard slack x0.5; no setup
 *                                          protection
 *                         scale_then_kill  lasting value x1.5; the guard keeps a line with more setup
 *                                          (powers, permanent Strength) unless it risks death
 *                                          (HP after <= next hit + 3 or < 15% max); setup lines in
 *                                          turns 1-3 go to Jev; played as kill_fast once the fight is
 *                                          expected to end within 3 turns (enemy HP / damage a turn),
 *                                          no setup card is left in hand or draw pile, or in a new boss
 *                                          phase (objectiveInForce)
 *                         kill_fast        damage x1.2, HP x0.9; guard slack x1.25; the damage-for-HP
 *                                          race rule applies in every fight; in elite/boss fights the
 *                                          guard keeps a line whose kill comes a turn sooner while its
 *                                          extra HP is no more than the hits the later kill takes
 *                         race             damage x1.3, HP x0.85, lasting x0.5; guard slack x1.5; race rule
 *                                          and the kill-sooner rule as kill_fast
 *   kill_priority (fight) the first living enemy in the list is the solver's focus target; minions go
 *                                   behind the last non-minion (validator)
 *   threat, summary (fight), boss_prep (run)  free text, shown to Jev as context only (short)
 *   reason (both)         why the intent was chosen, closed list (INTENT_REASONS): kill_fast/race
 *                                   because enemy_scales / burst_window drop preserve's weights in
 *                                   that fight (combatPolicy); preserve / avoid_elites set for low HP
 *                                   (an hp_below_target change, or reason low_hp when set) lapse to
 *                                   balanced / normal while HP is at the target, whatever reason a
 *                                   later re-plan gives (policyAt, originOf)
 *
 * Labels (combatFit, mapFit, restFit) are graded from the same score that ranks the options: "fits"
 * (code's best or within its close-call margin), "costs X HP / Y damage vs the best line for <intent>",
 * or "neutral"; only a "costs" option is logged as a deviation when Jev picks it. The validator repairs
 * an intent only on hard facts and logs judgment calls as disagreements (plan-validator.ts).
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

// ---------------------------------------------------------------- reasons: why an intent was chosen

/**
 * Why DeepSeek chose an intent, from a closed list. Code reads the reason to pick the translation
 * (5JU3 F9: kill_fast "ends fight quicker, less HP lost overall" against a Fossil Stalker gaining 3
 * Strength a hit was read as a run-level preserve violation and turned into preserve_hp; NX48 F35:
 * preserve set at 35% HP was still in force at 86%).
 */
export const INTENT_REASONS = ["enemy_scales", "burst_window", "low_hp", "boss_prep", "deck_weak", "deck_strong", "many_enemies", "short_fight"] as const;
export type IntentReason = (typeof INTENT_REASONS)[number];
export const REASON_MEANING: Record<IntentReason, string> = {
  enemy_scales: "the enemy grows every turn (Strength, Ritual, Ravenous, escalating attacks): kill_fast/race keep full damage weight even under hp_policy preserve",
  burst_window: "a short window for damage (sleeping, stunned or not yet debuffing enemy): damage now over block",
  low_hp: "HP is low now: once HP is back at the target, preserve / avoid_elites lapse to balanced / normal until it falls again",
  boss_prep: "HP and potions are kept for the act boss: the intent holds at any HP, except a preserve / avoid_elites first set by an hp_below_target change, which lapses at the target like low_hp",
  deck_weak: "the deck lacks damage or scaling",
  deck_strong: "the deck already beats this",
  many_enemies: "several attackers: fewer enemies alive is the defence",
  short_fight: "the fight ends in a few turns anyway",
};
/** Names DeepSeek used for a reason that mean one of the list. */
const REASON_SYNONYMS: Record<string, IntentReason> = {
  scaling: "enemy_scales", enemy_scaling: "enemy_scales", scales: "enemy_scales", ritual: "enemy_scales", ravenous: "enemy_scales", strength_gain: "enemy_scales",
  burst: "burst_window", window: "burst_window", damage_window: "burst_window",
  hp_low: "low_hp", low_health: "low_hp", hp_drop: "low_hp",
  boss: "boss_prep", save_for_boss: "boss_prep",
  weak_deck: "deck_weak", strong_deck: "deck_strong",
  multi_enemy: "many_enemies", multiple_enemies: "many_enemies", aoe: "many_enemies",
  fast_fight: "short_fight", quick_fight: "short_fight",
};

/** Reason tags from a reply (a string or a list, at most two); unknown ones are returned to be logged. */
export function parseReasons(raw: unknown): { reasons: IntentReason[]; dropped: string[] } {
  const entries = Array.isArray(raw) ? raw : typeof raw === "string" && raw.trim() ? raw.split(/[,|/]/) : [];
  const reasons: IntentReason[] = [];
  const dropped: string[] = [];
  for (const entry of entries) {
    const text = typeof entry === "string" ? entry.trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
    if (!text) continue;
    const reason = isOneOf(INTENT_REASONS, text) ? text : REASON_SYNONYMS[text];
    if (reason) {
      if (!reasons.includes(reason)) reasons.push(reason);
    } else dropped.push(String(entry));
  }
  return { reasons: reasons.slice(0, 2), dropped };
}

/** Run-plan fields a reason can be given for. */
export const REASON_FIELDS = ["hp_policy", "route_risk", "entry_hp_pct", "reserve"] as const;
export type ReasonField = (typeof REASON_FIELDS)[number];

/** Run-plan fields whose value can be set for low HP and lapse once HP is back. */
export type OriginField = "hp_policy" | "route_risk";

/** Where a run-plan field's current value came from: the change (or the first plan) that set it. */
export interface PolicyOrigin {
  floor: number;
  version: number;
  /** The accepted change's trigger, or "start" for a value the run's first plan set. */
  trigger: ChangeTrigger | "start";
  /** The reason DeepSeek gave for the field when the value was set (null when none). */
  reason: IntentReason | null;
}

const fieldValue = (plan: RunPlan, field: OriginField): string => (field === "hp_policy" ? plan.hpPolicy : plan.routeRisk);

/**
 * The origin of a field's current value: the plan's own record (run-plan.ts parseRunPlan keeps it
 * across re-plans that leave the value alone), else the last accepted change that set this value
 * (plans logged before origins were kept), else null.
 */
export function originOf(plan: RunPlan | null | undefined, field: OriginField): PolicyOrigin | null {
  if (!plan) return null;
  const kept = plan.origins?.[field];
  if (kept) return kept;
  const change = [...(plan.changes ?? [])].reverse().find((entry) => entry.field === field && entry.to === fieldValue(plan, field));
  return change ? { floor: change.floor, version: change.version, trigger: change.trigger, reason: null } : null;
}

/**
 * A value set because HP was low: its origin is an hp_below_target change or came with reason low_hp,
 * or (no origin known) its reason is low_hp now. The origin decides, not the reason text of a later
 * re-plan (Z7D7 F24: the hp_rise re-plan rewrote the F20 hp_below_target preserve's reason low_hp to
 * boss_prep at 86% HP, and the Decimillipede was fought under it; FN0H F33: an F31 hp_below_target
 * preserve still in force at 94% after the forced rest).
 */
export function setForLowHp(plan: RunPlan | null | undefined, field: OriginField): boolean {
  if (!plan) return false;
  const origin = originOf(plan, field);
  if (origin && (origin.trigger === "hp_below_target" || origin.reason === "low_hp")) return true;
  return plan.reasons?.[field] === "low_hp";
}

/**
 * The run's hp_policy at this HP: a preserve set because HP was low lapses to balanced once HP is
 * back at the target (NX48: preserve set at 35% HP stayed on at 86% after the Ancient's heal, the
 * solver kept HP x1.25 in the fight that killed us). A preserve set for another reason (boss_prep at
 * a healthy HP, none) holds.
 */
export function policyAt(plan: RunPlan | null | undefined, hpFraction: number): HpPolicy {
  const policy = plan?.hpPolicy ?? "balanced";
  if (policy === "preserve" && setForLowHp(plan, "hp_policy") && hpFraction >= hpTarget(plan)) return "balanced";
  return policy;
}

/** The run's route_risk at this HP: avoid_elites set because HP was low lapses the same way. */
export function routeRiskAt(plan: RunPlan | null | undefined, hpFraction: number): RouteRisk {
  const risk = plan?.routeRisk ?? "normal";
  if (risk === "avoid_elites" && setForLowHp(plan, "route_risk") && hpFraction >= hpTarget(plan)) return "normal";
  return risk;
}

/** A fight objective that puts damage first whatever the run's hp_policy: kill_fast/race because the enemy scales or a burst window. */
export function damageFirst(fight: Pick<FightPlan, "objective"> & { reasons?: IntentReason[] } | null | undefined): boolean {
  if (!fight || (fight.objective !== "kill_fast" && fight.objective !== "race")) return false;
  return (fight.reasons ?? []).some((reason) => reason === "enemy_scales" || reason === "burst_window");
}

/**
 * The hp_policy a fight is played under: the run's policy at this HP, and balanced instead of preserve
 * when the fight plan races a scaling enemy (5JU3 F9: preserve weights T2-T4 played 16, 6 and 0 damage
 * lines against a Fossil Stalker gaining Strength every hit; -40 where the damage lines cost ~-32).
 */
export function combatPolicy(
  plan: RunPlan | null | undefined,
  fight: (Pick<FightPlan, "objective"> & { reasons?: IntentReason[] }) | null | undefined,
  hpFraction: number,
  bossClock: BossClockNow | null = null,
): { policy: HpPolicy; why: string | null } {
  const base = policyAt(plan, hpFraction);
  if (base !== (plan?.hpPolicy ?? "balanced")) return { policy: base, why: `hp_policy ${plan?.hpPolicy} was for low HP; HP ${Math.round(hpFraction * 100)}% is back at the ${Math.round(hpTarget(plan) * 100)}% target` };
  if (base === "preserve" && damageFirst(fight)) return { policy: "balanced", why: `fight objective ${fight!.objective} because ${(fight!.reasons ?? []).join(", ")}: damage first under hp_policy preserve` };
  // The act boss is fought to the end whatever the policy (plan-validator.ts): while its clock needs
  // more a turn than the deck deals, HP saved only stretches a race already behind (G8F1 F33: preserve
  // weights and labels played 30, 4, 0, 0 on T1-T4 against a 399 HP demon needing ~51 a turn of a
  // ~32 deck). Only "this line dies" matters then, and the lethal check keeps that.
  if (base === "preserve" && bossClock && bossClock.need > bossClock.deck) {
    return { policy: "balanced", why: `act boss behind its clock (needs ~${Math.round(bossClock.need)} a turn, deck ~${Math.round(bossClock.deck)}): HP kept only stretches the race` };
  }
  return { policy: base, why: null };
}

/** The act-boss clock in a boss fight: damage a turn the kill needs now (boss HP left / clock turns left) and the deck's estimate. */
export interface BossClockNow {
  need: number;
  deck: number;
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
    scale_then_kill: "play powers / permanent Strength in the first turns (a few HP is fine, never a risk of death), then kill: played as kill_fast once the fight should end within ~3 turns or no power or Strength card is left in hand or draw pile",
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

/** Expected turns left in the fight from which setup still pays (scale_then_kill). */
export const SETUP_MIN_TURNS_LEFT = 3;

/**
 * The objective played this turn. scale_then_kill is a phase, then a kill: its setup weights hold while
 * the fight is expected to last SETUP_MIN_TURNS_LEFT+ more turns (enemy HP left / expected damage a
 * turn) and setup is left to play (a power or permanent Strength card in hand or draw pile); not in a
 * new boss phase (its own window is closed, YFG5 F48). Otherwise the fight is played, ranked and
 * labelled as kill_fast (VQ7J F11: "Free turns 1-2: set up … Then kill fast" read as scale_then_kill all
 * fight; FN0H F33 the same after T1). Computed, not a turn cutoff: G8F1 F33 T4 against a 399 HP demon
 * still has ~10 turns for a Demon Form. A setup line that risks death is refused per line
 * (setupRisksDeath) whatever the objective.
 */
export function objectiveInForce(objective: FightObjective | null, ctx: { turnsLeft: number | null; laterPhase: boolean; setupLeft: boolean }): { objective: FightObjective | null; why: string | null } {
  if (objective !== "scale_then_kill") return { objective, why: null };
  if (ctx.laterPhase) return { objective: "kill_fast", why: "scale_then_kill: a new boss phase is no setup window: kill" };
  if (!ctx.setupLeft) return { objective: "kill_fast", why: "scale_then_kill: no power or permanent Strength card left in hand or draw pile: kill" };
  if (ctx.turnsLeft !== null && ctx.turnsLeft < SETUP_MIN_TURNS_LEFT) {
    return { objective: "kill_fast", why: `scale_then_kill: the fight is expected to end in ~${Math.max(1, Math.round(ctx.turnsLeft))} turn(s), too soon for setup to pay: kill` };
  }
  return { objective, why: null };
}

// ---------------------------------------------------------------- reserved potions

/**
 * Burst potions (energy, card generation, duplication): offence, reserved as "damage". Their text names
 * no role (JF8N F13: the Energy Potion 「获得{Energy}」 matched none and went on an elite; KFPC F29 the
 * Power Potion, FH3M/9V09 the Radiant Tincture).
 */
export const BURST_POTIONS = /^(ENERGY_POTION|RADIANT_TINCTURE|ATTACK_POTION|POWER_POTION|SKILL_POTION|COLORLESS_POTION|DUPLICATOR|SWIFT_POTION|GIGANTIFICATION_POTION|CUNNING_POTION|BOTTLED_POTENTIAL)$/;
/** Potion-Shaped Rocks (Petrified Toad refills them every fight): never reserved (H7W0 F42-F48). */
export const ROCK_POTION = "POTION_SHAPED_ROCK";

/** A potion's role (the run plan reserves roles, not ids). */
export function potionRole(potionId: string, text: string): PotionRole | null {
  if (potionId === ROCK_POTION) return null;
  if (BURST_POTIONS.test(potionId)) return "damage";
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
  if (roles.length === 0 || potionId === ROCK_POTION) return false;
  if (roles.includes("any")) return true;
  const role = potionRole(potionId, text);
  return role !== null && roles.includes(role);
}

/** Below this HP fraction a reserved potion may be drunk in any fight. */
export const RESERVE_RELEASE_HP = 0.25;

/**
 * Why reserved potions are usable right now, or null when they stay in the belt: the act boss, HP
 * below 25%, every line without them dying this turn, or the safest line without them leaving no more
 * than next turn's expected hit + 3 (setupRisksDeath: the same "risks death" as setup lines). VF5C
 * F27 T4: the only dry line left 2 of 31 HP, the Explosive Ampoule and Weak Potion stayed held and T5
 * opened at 2 HP with 6 Dazed; Z7D7 F28 T3: every line 27 -> 2 with Heart of Iron held.
 */
export function reserveReleased(ctx: {
  bossFight: boolean;
  hpFraction: number;
  everyDryLineDies: boolean;
  /** HP after the potion-free line that keeps the most, with next turn's expected hit and max HP. */
  dry?: { hpAfter: number; nextIncoming: number; maxHp: number } | null;
}): string | null {
  if (ctx.bossFight) return "act boss: the reserve is for this fight";
  if (ctx.hpFraction < RESERVE_RELEASE_HP) return `HP below ${RESERVE_RELEASE_HP * 100}%`;
  if (ctx.everyDryLineDies) return "every line without it dies";
  if (ctx.dry && setupRisksDeath(ctx.dry.hpAfter, ctx.dry.nextIncoming, ctx.dry.maxHp)) {
    return `the safest line without it leaves ${ctx.dry.hpAfter} HP against next turn's ~${Math.round(ctx.dry.nextIncoming)}`;
  }
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
  const policy = policyAt(plan, hpPct);
  if (policy === "preserve" && hpPct < hpTarget(plan)) shift += option === "HEAL" ? 4 : option === "SMITH" ? -2 : 0;
  // Push smiths at healthy HP, never over the pre-boss heal.
  if (policy === "push" && hpPct >= 0.55 && !beforeBoss) shift += option === "SMITH" ? 3 : option === "HEAL" ? -2 : 0;
  return shift;
}

/** Route weight change for a node from the run plan's intents, at the projected HP on arrival. */
export function mapShift(plan: RunPlan | null | undefined, type: string, hpOnArrival: number, toBoss = 99): number {
  if (!plan) return 0;
  const policy = policyAt(plan, hpOnArrival);
  const risk = routeRiskAt(plan, hpOnArrival);
  const low = hpOnArrival < hpTarget(plan);
  switch (type) {
    case "Elite": {
      let shift = risk === "avoid_elites" ? -6 : risk === "seek_elites" && hpOnArrival > 0.6 ? 2 : 0;
      if (policy === "preserve") shift -= 3;
      if (policy === "push" && hpOnArrival > 0.7) shift += 1.5;
      // Enforced: near the boss, no elite that would leave the entry HP out of reach: at least -8, and
      // never milder than the elite reached with more HP (Z7D7 F25: -8 at 62% after a shop, -9 at 92%
      // after a rest under avoid_elites + preserve; the shop line won).
      if (plan.entryHp && toBoss <= 8 && hpOnArrival < plan.entryHp + 0.15) return Math.min(-8, shift);
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
export function routeRiskFilter<T extends { type: string }>(plan: RunPlan | null | undefined, options: T[], hpFraction = 0): T[] {
  if (routeRiskAt(plan, hpFraction) !== "avoid_elites") return options;
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
  /** Code's rank-1 line: the solver's best score under the intents' weights. */
  codeTop?: boolean;
  /** How far below code's best shown line the solver scores this one (0 for the best), under the intents' weights. */
  scoreGap?: number;
  /** Damage into the burst target this turn (LineField.burst). */
  burstDamage?: number;
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
  /** Code's best line under the intents (rank 1): what every other line is priced against. */
  best?: { hpLoss: number; damage: number; setup: number };
  /** Score gap that is still "near the top" (code's own close-call margin). */
  near?: number;
  /**
   * A turn whose damage into one enemy is what matters, whatever the objective (the Queen's
   * YOU_ARE_MINE turn: the last one before 99 Weak/Frail/Vulnerable, H7W0 F48 T2).
   */
  burst?: { target: string; maxDamage: number; why: string };
}

/** Score gap within which a line is "near code's best" (combat-plan CLOSE_CALL). */
export const LABEL_NEAR = 6;
/** Burst-turn shortfall (damage into the target) from which a line breaks the burst (H7W0: 48 short). */
export const BURST_BREAK = 30;

export type FitGrade = "fits" | "neutral" | "costs";

/**
 * A line's damage toward the fight's objective: this turn's damage plus each Sandpit turn it buys at
 * a turn's worth (9V09: "Pommel Strike+, Frantic Escape, Sword Boomerang+" read "breaks race: 21 less
 * damage" against a line with no Escape, while the Escape bought a ~49-damage turn).
 */
export function objectiveDamage(line: Pick<LineFacts, "damage" | "escapes">, sandpit?: SandpitField): number {
  return line.damage + (sandpit ? (line.escapes ?? 0) * sandpit.turnValue : 0);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The intents a combat line is priced under, in words ("race", "hp_policy preserve"), or null for none. */
function combatIntentName(objective: FightObjective | null, policy: HpPolicy): string | null {
  const parts = [objective, policy !== "balanced" ? `hp_policy ${policy}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" + ") : null;
}

/**
 * The graded label of one combat line, derived from code's own objective-weighted score so the label
 * can never contradict the ranking (5JU3 F11 T3-T4, KQK2 F7 T4, 9V09 F33 T2: code's rank 1 labelled
 * "breaks", Jev skipped it every time; 0 of 76 "breaks" options picked across three runs):
 *   "fits <intent>: code's best line / near code's best line …" when the solver scores it within
 *   LABEL_NEAR of its best line under the intents' weights;
 *   "costs X HP / Y damage vs the best line for <intent>" otherwise (what it gives up, and gains);
 *   "neutral" when no intent is in force.
 * `breaks` (logged as a deviation when Jev picks it) is only ever set on a "costs" line. The Queen's
 * YOU_ARE_MINE turn ranks lines by damage into the Amalgam instead (field.burst).
 */
export function combatFit(objective: FightObjective | null, policy: HpPolicy, line: LineFacts, field: LineField): { label: string; breaks: boolean; grade: FitGrade } {
  if (line.winsFight) return { label: "fits every intent: wins the fight", breaks: false, grade: "fits" };
  const parts: string[] = [];
  const pit = field.sandpit;
  const escapes = line.escapes ?? 0;
  const bought = pit && escapes > 0 ? `+${plural(escapes, "Sandpit turn")}, ~${Math.round(pit.turnValue)} damage each` : "";
  const near = line.codeTop === true || (line.scoreGap !== undefined && line.scoreGap <= (field.near ?? LABEL_NEAR));
  let grade: FitGrade = "neutral";
  let breaks = false;
  if (field.burst) {
    const dealt = line.burstDamage ?? 0;
    const short = Math.round(field.burst.maxDamage - dealt);
    if (short <= Math.max(5, field.burst.maxDamage * 0.1)) {
      parts.push(`fits the burst turn: ${dealt} damage to ${field.burst.target} (${field.burst.why})`);
      grade = "fits";
    } else {
      parts.push(`costs ${short} damage to ${field.burst.target} vs the best line this turn (${field.burst.why})`);
      grade = "costs";
      breaks = short >= BURST_BREAK;
    }
  }
  const intent = combatIntentName(objective, policy);
  if (intent && !field.burst) {
    const best = field.best ?? { hpLoss: field.minLoss, damage: field.maxDamage, setup: field.maxSetup };
    const moreHp = line.hpLoss - best.hpLoss;
    const lessDamage = Math.round(best.damage - objectiveDamage(line, pit));
    const lessSetup = objective === "scale_then_kill" && line.setup < best.setup;
    const adverse = [moreHp > 0 ? `${moreHp} HP` : null, lessDamage > 0 ? `${lessDamage} damage` : null, lessSetup ? "the setup" : null].filter(Boolean);
    const gains = [moreHp < 0 ? `saves ${-moreHp} HP` : null, lessDamage < 0 ? `${-lessDamage} more damage` : null].filter(Boolean);
    const trade = [
      moreHp > 0 ? `${moreHp} more HP` : moreHp < 0 ? `${-moreHp} less HP` : null,
      lessDamage > 0 ? `${lessDamage} less damage` : lessDamage < 0 ? `${-lessDamage} more damage` : null,
      lessSetup ? "less setup" : null,
    ].filter(Boolean).join(", ");
    const counting = pit && pit.maxEscapes > 0 ? ", counting Sandpit turns bought as damage" : "";
    if (near) {
      const where = line.codeTop || (line.scoreGap ?? 0) <= 0 ? "code's best line" : `near code's best line (score -${(line.scoreGap ?? 0).toFixed(1)})`;
      parts.push(`fits ${intent}: ${where} under ${intent} weights${trade && !line.codeTop ? ` (vs it: ${trade}${counting})` : ""}${bought ? ` (${bought})` : ""}`);
      if (objective === "scale_then_kill" && line.setup > 0 && line.setup >= field.maxSetup) parts.push("sets up (powers / Strength)");
      grade = "fits";
    } else {
      const cost = adverse.length > 0 ? adverse.join(" / ") : `~${Math.round(line.scoreGap ?? 0)} score (lasting, kill or debuff value)`;
      parts.push(`costs ${cost} vs the best line for ${intent}${gains.length > 0 ? ` (${gains.join(", ")})` : ""}${counting}${bought ? ` (${bought})` : ""}`);
      grade = "costs";
      breaks = true;
    }
    // hp_policy preserve's slack, said in HP (the score already weighs it).
    const extraLoss = line.hpLoss - field.minLoss;
    if (policy === "preserve" && objective !== "preserve_hp" && extraLoss > field.slack) parts.push(`${extraLoss} HP over the safest line (hp_policy preserve tolerates ~${Math.round(field.slack)})`);
  }
  // The Sandpit eats us at 0 whatever the HP: while the pit is no longer than the kill, a line
  // playing fewer Frantic Escapes than another gives a turn away (9V09, X8HF rule 2).
  if (pit?.behind && escapes < pit.maxEscapes) {
    const fewer = pit.maxEscapes - escapes;
    const why = `${plural(fewer, "Frantic Escape")} fewer than another line while the Sandpit (${pit.now}) is no longer than the kill (~${pit.turnsNeeded} turns)`;
    if (near) parts.push(`note: ${why}`);
    else {
      parts.push(`costs ${plural(fewer, "Sandpit turn")}: ${why}`);
      grade = "costs";
      breaks = true;
    }
  }
  if (line.focusDamage !== null && line.focusDamage > 0) parts.push(`hits kill-priority ${field.focusName ?? "enemy"} for ${line.focusDamage}`);
  return { label: parts.length > 0 ? parts.join("; ") : "neutral", breaks, grade };
}

/** What the labels mean, for Jev (every question with intent_fit labels carries it). */
export const LABEL_NOTE =
  "intent_fit labels are guidance with costs, not orders: 'fits' = code's best line, or near it, under the strategy's weights; 'costs X' = what the line gives up against that best line (and what it gains). You choose.";

/** Route-value gap within which a node is "near code's best route" (map codeMargin). */
export const MAP_NEAR = 2.5;

/** The run intents that move route and rest scoring at this HP, in words, or null when none do. */
function runIntentName(plan: RunPlan, hpPct: number): string | null {
  const policy = policyAt(plan, hpPct);
  const risk = routeRiskAt(plan, hpPct);
  const parts = [policy !== "balanced" ? `hp_policy ${policy}` : null, risk !== "normal" ? `route_risk ${risk}` : null, plan.entryHp ? `entry_hp ${Math.round(plan.entryHp * 100)}%` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * The label of a map node, from the same scoring that ranks the nodes (5JU3 F10: '?' labelled "breaks
 * preserve" and Monster unlabelled, while the route scoring priced '?' cheaper; Jev took the Monster at
 * 0.98 into the fight that killed us). `route` is the node's route_value and the best one offered;
 * the note says what the run intents did to this node's weight.
 */
export function mapFit(plan: RunPlan | null | undefined, type: string, hpPct: number, route?: { value: number; best: number }, toBoss = 99): string | null {
  if (!plan) return null;
  const intents = runIntentName(plan, hpPct);
  if (!intents) return null;
  const shift = mapShift(plan, type, hpPct, toBoss);
  const effect = shift !== 0 ? ` (the plan moves this ${type} ${shift > 0 ? "+" : ""}${shift})` : "";
  if (!route) return `${intents}${effect}`;
  const gap = route.best - route.value;
  if (gap <= MAP_NEAR) return `fits ${intents}: ${gap <= 0.005 ? "code's best route" : `within ${gap.toFixed(1)} of code's best route`} under the plan${effect}`;
  return `costs ${gap.toFixed(1)} route value vs the best node under ${intents}${effect}`;
}

/** Score gap within which a rest option is "near code's best" (rest codeMargin). */
export const REST_NEAR = 3;

/** The label of a rest option, from the same scoring that ranks the options (`score`: its score and the best one). */
export function restFit(plan: RunPlan | null | undefined, option: string, hpPct: number, score?: { value: number; best: number }): string | null {
  if (!plan) return null;
  const target = hpTarget(plan);
  const policy = policyAt(plan, hpPct);
  const relevant = policy === "preserve" || policy === "push" || (plan.entryHp !== null && hpPct < plan.entryHp);
  if (!relevant) return null;
  const below = hpPct < target;
  const why = below && option === "HEAL" ? `heals toward the ${Math.round(target * 100)}% target from ${Math.round(hpPct * 100)}%` : below ? `HP ${Math.round(hpPct * 100)}% is below the ${Math.round(target * 100)}% target` : `HP ${Math.round(hpPct * 100)}% is at the ${Math.round(target * 100)}% target`;
  const name = `hp_policy ${policy}${plan.entryHp ? ` / entry_hp ${Math.round(plan.entryHp * 100)}%` : ""}`;
  if (!score) return `${name}: ${why}`;
  const gap = score.best - score.value;
  if (gap <= REST_NEAR) return `fits ${name}: ${gap <= 0.005 ? "code's best option" : `within ${gap.toFixed(1)} of code's best option`} (${why})`;
  return `costs ${gap.toFixed(1)} score vs the best option under ${name} (${why})`;
}

// ---------------------------------------------------------------- what Jev is told

/** Floors after a change for which Jev sees "strategy changed at F<n>". */
export const CHANGE_NOTICE_FLOORS = 3;

/** One line per current strategic intent, with what it means; recent changes after them. */
export function intentLines(
  run: RunPlan | null | undefined,
  fight: FightPlan | null | undefined,
  floor: number | null = null,
  hpFraction: number | null = null,
  now: { bossClock?: BossClockNow | null; objective?: { objective: FightObjective | null; why: string | null } } = {},
): string[] {
  const bossClock = now.bossClock ?? null;
  const lines: string[] = [];
  const because = (reason: string | undefined) => (reason ? ` because ${reason}` : "");
  if (run) {
    const policy = run.hpPolicy ?? "balanced";
    lines.push(`hp_policy ${policy}${because(run.reasons?.hp_policy)}${run.entryHp ? ` (enter the act boss at ${Math.round(run.entryHp * 100)}%+ HP)` : ""}: ${MEANING.hp_policy[policy]}`);
    const risk = run.routeRisk ?? "normal";
    if (risk !== "normal") lines.push(`route_risk ${risk}${because(run.reasons?.route_risk)}: ${MEANING.route_risk[risk]}`);
    if (hpFraction !== null) {
      const now = combatPolicy(run, fight, hpFraction, bossClock);
      if (now.why) lines.push(`in force now: hp_policy ${now.policy} (${now.why})`);
      const riskNow = routeRiskAt(run, hpFraction);
      if (riskNow !== risk) lines.push(`in force now: route_risk ${riskNow} (avoid_elites was for low HP; HP is back at the target)`);
    }
    if ((run.reserve ?? []).length > 0) lines.push(`reserve ${run.reserve.join(", ")} potions for the act boss${because(run.reasons?.reserve)}: not offered before it (only below 25% HP, when every other line dies, or when the safest other line ends within next turn's hit + 3)`);
    if ((run.needs ?? []).length > 0) lines.push(`deck needs ${run.needs.join(", ")} cards before the act boss`);
    if (run.bossPrep) lines.push(`boss prep (context): ${short(run.bossPrep)}`);
    for (const change of recentChanges(run, floor)) lines.push(`strategy changed at F${change.floor}: ${change.field} ${fmt(change.from)}→${fmt(change.to)} because ${change.trigger}${change.fact ? ` (${change.fact})` : ""}`);
  }
  if (fight) {
    lines.push(`fight objective ${fight.objective}${because((fight.reasons ?? []).join(", "))}: ${MEANING.objective[fight.objective]}`);
    if (now.objective?.why && now.objective.objective) lines.push(`in force now: objective ${now.objective.objective} (${now.objective.why})`);
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
