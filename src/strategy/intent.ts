/**
 * Strategic intents and tempo: the vocabulary DeepSeek's run and fight plans are written in, and the
 * facts code attaches to every option so Jev can carry them out.
 *
 * Division of labour (Dai 2026-09-28, paper/materials/discussions/2026-09-28-old-vs-new-logic.md):
 *   DeepSeek  global strategy and TEMPO as guidance: hp_policy, entry HP, elite appetite (route_risk),
 *             potions held for the act boss (reserve) and potion timing (tempo / potion_plan), heal vs
 *             smith lean (rest_lean), deck direction (needs / want / avoid / remove), a fight's
 *             objective and kill order. It never issues commands, and nothing it says is enforced.
 *   code      FACTS for every option (HP cost and projection, damage, block, what a potion drunk now
 *             saves and what holding it means for the boss, route survival and arrival HP, card value
 *             and why, upgrade gain, shop value) and a REFERENCE rank under balanced weights. No hard
 *             filters from the plan; only "don't pick a line that certainly dies while one survives".
 *             Code acts alone only on a single legal option, an option that dominates every other on
 *             every fact, or an immediate win (lethal this turn).
 *   Jev       the final judge of every execution choice, shown DeepSeek's guidance with the facts.
 *
 * Every option carries a tempo note from this file (combatFit, potionOptionFit, mapFit, restFit): how
 * it sits with DeepSeek's guidance ("fits …" / "departs from …: …"). Jev picking a "departs" option is
 * logged as a tempo deviation (information only).
 *
 * History: the intents used to be translated into solver weights, an HP guard, a hard reserve filter
 * (reserved potions never drunk before the boss), avoid_elites and elite gates on the map, entry-HP
 * rest bonuses and card filters. Against the old soft-weight version that lost more elites with
 * potions still in the belt (15/44 deaths holding potions vs 1/13), smithed 5% of act-2 rests (vs 24%)
 * and lost 10/40 act-1 bosses (vs 1/13); all of that is now facts and guidance.
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
  /** The change's trigger, or "start" for a value the run's first plan set ("unstated": none given). */
  trigger: ChangeTrigger | "start" | "unstated";
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
  grind: string | null = null,
): { policy: HpPolicy; why: string | null } {
  const base = policyAt(plan, hpFraction);
  if (base !== (plan?.hpPolicy ?? "balanced")) return { policy: base, why: `hp_policy ${plan?.hpPolicy} was for low HP; HP ${Math.round(hpFraction * 100)}% is back at the ${Math.round(hpTarget(plan) * 100)}% target` };
  // HP kept cannot win a fight the grind outlasts (grindOutlasts): damage first.
  if (base === "preserve" && grind) return { policy: "balanced", why: `damage first: ${grind}` };
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

/** What each intent means, as guidance Jev and DeepSeek are shown (never enforced by code). */
export const MEANING = {
  hp_policy: {
    preserve: "HP is scarce: lean to lines, routes and rest choices that keep HP, unless another option wins the fight or the facts show the HP buys much more",
    balanced: "default trade-off between HP, damage and setup",
    push: "HP is a resource to spend for damage, elites and upgrades while it lasts",
  } satisfies Record<HpPolicy, string>,
  route_risk: {
    avoid_elites: "lean away from optional elites (a forced one is fought anyway)",
    normal: "elites only at healthy HP",
    seek_elites: "take elites while HP allows (relics and better cards)",
  } satisfies Record<RouteRisk, string>,
  objective: {
    kill_fast: "end the fight quickly: damage first, a little more HP loss is fine",
    preserve_hp: "lose as little HP as possible: block first, damage second",
    scale_then_kill: "play powers / permanent Strength in the first turns (a few HP is fine, never a risk of death), then kill",
    race: "the enemy scales or the clock is short: maximum damage every turn; a turn the clock grants (Frantic Escape) is worth a full turn of damage",
  } satisfies Record<FightObjective, string>,
};

/** DeepSeek's heal-vs-smith lean for rest sites (guidance). */
export const REST_LEANS = ["heal", "smith", "auto"] as const;
export type RestLean = (typeof REST_LEANS)[number];

// ---------------------------------------------------------------- facts about lines and the fight

/**
 * A setup line "risks death": it leaves no more than next turn's hit + 3, or under 15% of max HP while
 * next turn may attack (`nextAttacks`: some enemy's next move attacks, or is unknown). A next turn the
 * move model says attacks with nothing is no death risk at 15% (FEY6 F17 T6: 10 HP left before the
 * Matriarch's Soul Siphon; the 15% floor swapped the line that killed her on T8).
 */
export function setupRisksDeath(hpAfter: number, nextIncoming: number, maxHp: number, nextAttacks = true): boolean {
  return hpAfter <= nextIncoming + 3 || (nextAttacks && hpAfter < maxHp * 0.15);
}

/** What a preserve_hp grind is checked against: turns the kill takes, HP lost a turn, HP now. */
export interface GrindFacts {
  turnsToKill: number | null;
  lossPerTurn: number;
  hp: number;
}

/**
 * Why a grind cannot be won, or null: the turns the kill takes at this fight's damage a turn, times the
 * HP lost a turn at the expected incoming, reach our HP (XMY2 F24: Hunter Killer 126 HP at ~11.5 a turn
 * with 19 HP against 17/21 hits; K7G9 F45: "grind 320 HP down" at 20/72 against the Mecha Knight).
 */
export function grindOutlasts(grind: GrindFacts | null): string | null {
  if (!grind || grind.turnsToKill === null || grind.lossPerTurn <= 0 || grind.hp <= 0) return null;
  const turns = Math.ceil(grind.turnsToKill);
  if (turns * grind.lossPerTurn < grind.hp) return null;
  return `the grind outlasts our HP (~${turns} turns to kill, ~${Math.round(grind.lossPerTurn)} HP lost a turn, ${Math.round(grind.hp)} HP)`;
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
export function objectiveInForce(
  objective: FightObjective | null,
  ctx: { turnsLeft: number | null; laterPhase: boolean; setupLeft: boolean; grind?: GrindFacts | null },
): { objective: FightObjective | null; why: string | null } {
  const outlasts = objective === "preserve_hp" ? grindOutlasts(ctx.grind ?? null) : null;
  if (outlasts) return { objective: "kill_fast", why: `preserve_hp: ${outlasts}; only a faster kill can win: kill` };
  if (objective !== "scale_then_kill") return { objective, why: null };
  if (ctx.laterPhase) return { objective: "kill_fast", why: "scale_then_kill: a new boss phase is no setup window: kill" };
  if (!ctx.setupLeft) return { objective: "kill_fast", why: "scale_then_kill: no power or permanent Strength card left in hand or draw pile: kill" };
  if (ctx.turnsLeft !== null && ctx.turnsLeft < SETUP_MIN_TURNS_LEFT) {
    return { objective: "kill_fast", why: `scale_then_kill: the fight is expected to end in ~${Math.max(1, Math.round(ctx.turnsLeft))} turn(s), too soon for setup to pay: kill` };
  }
  return { objective, why: null };
}

// ---------------------------------------------------------------- potions DeepSeek wants held

/**
 * Burst potions (energy, card generation, duplication): offence, reserved as "damage". Their text names
 * no role (JF8N F13: the Energy Potion 「获得{Energy}」 matched none and went on an elite; KFPC F29 the
 * Power Potion, FH3M/9V09 the Radiant Tincture).
 */
export const BURST_POTIONS = /^(ENERGY_POTION|RADIANT_TINCTURE|ATTACK_POTION|POWER_POTION|SKILL_POTION|COLORLESS_POTION|DUPLICATOR|SWIFT_POTION|CLARITY|GIGANTIFICATION_POTION|CUNNING_POTION|BOTTLED_POTENTIAL)$/;
/** Potion-Shaped Rocks (Petrified Toad refills them every fight): never reserved (H7W0 F42-F48). */
export const ROCK_POTION = "POTION_SHAPED_ROCK";

/** A potion's role (the run plan reserves roles, not ids). */
export function potionRole(potionId: string, text: string): PotionRole | null {
  if (potionId === ROCK_POTION) return null;
  if (BURST_POTIONS.test(potionId)) return "damage";
  // By id as well as text: the Dexterity Potion reads 「获得{DexterityPower}点敏捷」 and matched no role
  // (GZ24 F8: drunk on an elite's T1 while the run plan kept [block, weak]); Regen is healing over turns.
  // Damage *reduction* is a block role, read before "damage" (HCBJ F11: Beetle Juice 「敌人的攻击…造成的伤害减少」
  // was a damage potion and dropped for a Tiny Mailbox potion); the same words as combat-plan BLUNTS_HIT.
  return /STRENGTH|FLEX|MAZALETH/.test(potionId) ? "strength" :
    /REGEN|BLOOD_POTION|FAIRY/.test(potionId) || /回复|heal|恢复|再生|regen/i.test(text) ? "heal" :
    /DEXTERITY|BLOCK_POTION|FORTIFIER|SPEED_POTION|GHOST_IN_A_JAR|HEART_OF_IRON|SHIP_IN_A_BOTTLE|BEETLE_JUICE|LIQUID_BRONZE/.test(potionId) ||
    /格挡|block|无实体|intangible|敏捷|dexterity|伤害减少|less damage|荆棘|thorns/i.test(text) ? "block" :
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

/**
 * The fact on a line or offer that drinks a potion DeepSeek wants held for the act boss (guidance, not
 * a filter): what drinking it now saves here, and what holding it means for the boss. Before, the
 * reserve was hard (no line drank it before the boss unless HP < 25% or every other line died): A8
 * deaths with potions still in the belt went from 1/13 to 15/44 (77QX, XMY2, N95W, G8F1, EN55, PKB0).
 */
export function reserveFact(ctx: {
  plan: RunPlan | null | undefined;
  potionId: string;
  text: string;
  name: string;
  bossFight: boolean;
  /** HP this line keeps over the best line without that potion (null: not a whole line, drink first). */
  savedHp: number | null;
  /** Extra damage over the best line without it. */
  extraDamage?: number | null;
  /** DeepSeek's fight-plan word on this potion, when it gave one. */
  fightNote?: string | null;
}): string | null {
  const role = potionRole(ctx.potionId, ctx.text);
  const kept = isReserved(ctx.plan?.reserve, ctx.potionId, ctx.text);
  const parts: string[] = [];
  const gains = [
    ctx.savedHp !== null && ctx.savedHp !== 0 ? (ctx.savedHp > 0 ? `saves ${ctx.savedHp} HP` : `costs ${-ctx.savedHp} HP more`) : null,
    ctx.extraDamage ? (ctx.extraDamage > 0 ? `+${ctx.extraDamage} damage` : `${ctx.extraDamage} damage`) : null,
  ].filter(Boolean);
  const here = ctx.savedHp === null ? "drinking it now re-plans the turn" : `drinking ${ctx.name} now: ${gains.length > 0 ? gains.join(", ") : "no HP or damage gained"} vs the best line without it`;
  parts.push(here);
  if (ctx.bossFight) parts.push("this is the act boss: nothing later to hold it for");
  else if (kept) {
    const why = ctx.plan?.reasons?.reserve ? ` because ${ctx.plan.reasons.reserve}` : "";
    parts.push(`the act boss fight then has one fewer ${role ?? "such"} potion (DeepSeek plan holds ${(ctx.plan?.reserve ?? []).join("/")} potions for the boss${why}${ctx.plan?.bossPrep ? `; boss prep: ${short(ctx.plan.bossPrep)}` : ""})`);
  }
  if (ctx.fightNote) parts.push(`DeepSeek fight plan on ${ctx.name}: ${short(ctx.fightNote)}`);
  return parts.join("; ");
}

// ---------------------------------------------------------------- deck acquisition

/** Why DeepSeek's plan lists this card under avoid (a fact on reward and shop options), or null. */
export function planAvoidsCard(plan: RunPlan | null | undefined, cardId: string, roles: Set<string>): string | null {
  if (!plan) return null;
  if (plan.want.includes(cardId)) return null;
  if (plan.avoid.includes(cardId)) return `DeepSeek plan lists ${cardId} under avoid`;
  const role = (plan.avoidRoles ?? []).find((entry) => roles.has(entry));
  return role ? `DeepSeek plan lists ${role} cards under avoid` : null;
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

// ---------------------------------------------------------------- tempo notes on combat lines

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
  /** Code's reference rank of this line (1 = the balanced-weight score's best). */
  rank?: number;
  /** How far below code's reference line the balanced score puts this one (0 for rank 1). */
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
  /** Escapes that buy a turn our HP lives to use (sandpitTurnValue); more are worth nothing. */
  useful?: number;
}
export interface LineField {
  minLoss: number;
  /** Most objective damage of any shown line (objectiveDamage: this turn's damage plus Sandpit turns bought). */
  maxDamage: number;
  maxSetup: number;
  focusName?: string;
  sandpit?: SandpitField;
  /** Code's reference line (rank 1): what the "vs reference" facts compare against. */
  best?: { hpLoss: number; damage: number; setup: number };
  /**
   * A turn whose damage into one enemy is what matters, whatever the objective (the Queen's
   * YOU_ARE_MINE turn: the last one before 99 Weak/Frail/Vulnerable, H7W0 F48 T2).
   */
  burst?: { target: string; maxDamage: number; why: string };
  /**
   * How DeepSeek's objective reads this turn when code's facts moved it (objectiveInForce: scale_then_kill
   * with no setup left or too little fight left, a preserve_hp grind our HP cannot outlast): the tempo
   * note then says "DeepSeek's scale_then_kill, read as kill_fast now".
   */
  objectiveNote?: string;
}

/** Burst-turn shortfall (damage into the target) from which a line departs from the burst (H7W0: 48 short). */
export const BURST_BREAK = 30;
/** Damage short of the most-damage line (and HP over the safest) within which a line still "fits" a damage (HP) tempo. */
export const TEMPO_DAMAGE_SLACK = 5;
export const TEMPO_HP_SLACK = 2;

export type FitGrade = "fits" | "neutral" | "costs";

/**
 * A line's damage toward the fight's objective: this turn's damage plus each Sandpit turn it buys at
 * a turn's worth (9V09: "Pommel Strike+, Frantic Escape, Sword Boomerang+" read "breaks race: 21 less
 * damage" against a line with no Escape, while the Escape bought a ~49-damage turn).
 */
export function objectiveDamage(line: Pick<LineFacts, "damage" | "escapes">, sandpit?: SandpitField): number {
  return line.damage + (sandpit ? Math.min(line.escapes ?? 0, sandpit.useful ?? Infinity) * sandpit.turnValue : 0);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Facts of one combat line against code's reference line, and its tempo note against DeepSeek's fight
 * objective (and the run's hp_policy):
 *   label  "code's reference line" / "code rank N: vs the reference line 3 more HP, 12 more damage", the
 *          Sandpit turns it buys, damage into the kill-priority enemy;
 *   tempo  "fits DeepSeek's kill_fast: most damage of the lines" or "departs from DeepSeek's kill_fast:
 *          14 less damage than the most-damage line"; null with no objective or policy to weigh.
 * `breaks` (a tempo deviation when Jev picks it) is set only on a "departs" line. The Queen's
 * YOU_ARE_MINE turn and a Sandpit race behind the clock are tempo facts whatever the objective.
 */
export function combatFit(objective: FightObjective | null, policy: HpPolicy, line: LineFacts, field: LineField): { label: string; tempo: string | null; breaks: boolean; grade: FitGrade } {
  if (line.winsFight) return { label: "wins the fight", tempo: "fits every tempo: wins the fight", breaks: false, grade: "fits" };
  const parts: string[] = [];
  const tempo: string[] = [];
  let breaks = false;
  let grade: FitGrade = "neutral";
  const pit = field.sandpit;
  const escapes = line.escapes ?? 0;
  const wasted = pit && pit.useful !== undefined && escapes > pit.useful ? escapes - pit.useful : 0;
  const counted = objectiveDamage(line, pit);
  // Code's reference line and where this one sits against it.
  const best = field.best ?? { hpLoss: field.minLoss, damage: field.maxDamage, setup: field.maxSetup };
  if (line.rank === 1) parts.push("code's reference line (balanced weights)");
  else {
    const moreHp = line.hpLoss - best.hpLoss;
    const lessDamage = Math.round(best.damage - counted);
    const trade = [
      moreHp > 0 ? `${moreHp} more HP` : moreHp < 0 ? `${-moreHp} less HP` : null,
      lessDamage > 0 ? `${lessDamage} less damage` : lessDamage < 0 ? `${-lessDamage} more damage` : null,
      line.setup < best.setup ? "less setup" : line.setup > best.setup ? "more setup" : null,
    ].filter(Boolean).join(", ");
    parts.push(`code rank ${line.rank ?? "?"}${line.scoreGap !== undefined && line.scoreGap > 0 ? ` (score -${line.scoreGap.toFixed(1)})` : ""}: vs the reference line ${trade || "the same HP and damage (lasting, kill or debuff value differs)"}`);
  }
  if (pit && escapes > 0) parts.push(`+${plural(escapes, "Sandpit turn")}, ~${Math.round(pit.turnValue)} damage each${wasted > 0 ? `; ${wasted} past the turns our HP lasts, worth nothing` : ""}`);
  if (line.focusDamage !== null && line.focusDamage > 0) parts.push(`hits kill-priority ${field.focusName ?? "enemy"} for ${line.focusDamage}`);

  if (field.burst) {
    const dealt = line.burstDamage ?? 0;
    const short = Math.round(field.burst.maxDamage - dealt);
    if (short <= Math.max(5, field.burst.maxDamage * 0.1)) {
      tempo.push(`fits the burst turn: ${dealt} damage to ${field.burst.target} (${field.burst.why})`);
      grade = "fits";
    } else {
      tempo.push(`departs from the burst turn: ${short} less damage to ${field.burst.target} than the best line (${field.burst.why})`);
      grade = "costs";
      breaks = short >= BURST_BREAK;
    }
  } else {
    const damageTempo = objective === "kill_fast" || objective === "race";
    const hpTempo = objective === "preserve_hp" || (objective === null && policy === "preserve");
    const name = field.objectiveNote ?? (objective ? `DeepSeek's ${objective}` : `DeepSeek's hp_policy ${policy}`);
    if (damageTempo) {
      const short = Math.round(field.maxDamage - counted);
      if (short <= TEMPO_DAMAGE_SLACK) {
        tempo.push(`fits ${name}: ${short <= 0 ? "most damage of the lines" : `within ${short} of the most damage`}${pit && pit.maxEscapes > 0 ? " (Sandpit turns bought counted as damage)" : ""}`);
        grade = "fits";
      } else {
        tempo.push(`departs from ${name}: ${short} less damage than the most-damage line${line.hpLoss < field.minLoss + 1 ? " (it is the safest line)" : ""}`);
        grade = "costs";
        breaks = true;
      }
    } else if (hpTempo) {
      const extra = line.hpLoss - field.minLoss;
      if (extra <= TEMPO_HP_SLACK) {
        tempo.push(`fits ${name}: ${extra <= 0 ? "least HP lost of the lines" : `within ${extra} HP of the safest line`}`);
        grade = "fits";
      } else {
        tempo.push(`departs from ${name}: ${extra} HP more than the safest line`);
        grade = "costs";
        breaks = true;
      }
    } else if (objective === "scale_then_kill") {
      if (line.setup >= field.maxSetup) {
        tempo.push(`fits DeepSeek's scale_then_kill${line.setup > 0 ? ": most setup (powers / permanent Strength) of the lines" : ": no line sets up more"}`);
        grade = "fits";
      } else {
        tempo.push("departs from DeepSeek's scale_then_kill: another line sets up more (powers / permanent Strength)");
        grade = "costs";
        breaks = true;
      }
    }
  }
  // The Sandpit eats us at 0 whatever the HP: while the pit is no longer than the kill, a line
  // playing fewer Frantic Escapes than another gives a turn away (9V09, X8HF rule 2).
  const wantedEscapes = pit ? Math.min(pit.maxEscapes, pit.useful ?? Infinity) : 0;
  if (pit?.behind && escapes < wantedEscapes) {
    const fewer = wantedEscapes - escapes;
    tempo.push(`departs from the Sandpit race: ${plural(fewer, "Frantic Escape")} fewer than another line while the Sandpit (${pit.now}) is no longer than the kill (~${pit.turnsNeeded} turns)`);
    grade = "costs";
    breaks = true;
  }
  return { label: parts.join("; "), tempo: tempo.length > 0 ? tempo.join("; ") : null, breaks, grade };
}

/**
 * The facts of a "drink it first, then re-plan" option for a potion the solver does not simulate: what
 * it is for, that no line's numbers include it, what the cheapest line loses, and DeepSeek's guidance
 * on holding it (reserveFact). Such options had no label at all (VUV4 F17 Blessing of the Forge, X8R8
 * F17 Attack Potion T1-T10: Jev never took them until the last turn).
 */
export function potionOptionFit(ctx: {
  role: PotionRole | null;
  bossFight: boolean;
  /** The act boss clock now (need a turn vs the deck's estimate), when this is the act boss. */
  bossClock: BossClockNow | null;
  /** HP the cheapest shown line loses this turn, and our HP. */
  cheapestLoss: number;
  hp: number;
  /** DeepSeek's guidance on holding it (reserveFact), when it has any. */
  reserve?: string | null;
}): string {
  const role = ctx.role ?? "unclassified";
  const parts = [`a ${role} potion; its effect is in no line's numbers (drinking it first re-plans the turn); the cheapest line alone loses ${ctx.cheapestLoss} of ${ctx.hp} HP`];
  if (ctx.bossClock && ctx.bossClock.need > ctx.bossClock.deck) parts.push(`the act boss clock is behind (~${Math.round(ctx.bossClock.need)} a turn needed, deck ~${Math.round(ctx.bossClock.deck)})`);
  if (ctx.reserve) parts.push(ctx.reserve);
  return parts.join("; ");
}

/** What the facts mean, for Jev (every question with facts carries it). */
export const LABEL_NOTE =
  "facts are code's numbers: code_rank / 'code rank N' is code's reference under balanced weights, 'vs the reference line' what an option gives up or gains against it; tempo says how an option sits with DeepSeek's guidance ('fits …' / 'departs from …'). Nothing is enforced: you choose.";

// ---------------------------------------------------------------- tempo notes on routes and rests

/** Projected HP (fraction of max) on arrival at the first elite every path meets and at the boss (map.ts). */
export interface RouteArrival {
  eliteHp: number | null;
  eliteFloor: number | null;
  /** An elite's expected HP cost this act. */
  eliteCost: number;
  /** Rest before that elite on every, some or no path. */
  eliteRest: "every" | "some" | "none" | null;
  /** null when the projection runs out of HP before the boss (ranOutFloor): no arrival HP to fit. */
  bossHp: number | null;
  /** Chance of reaching the boss alive on that path. */
  bossSurvival?: number | null;
  bossFloor: number | null;
  /** Floor where the projected HP runs out on the safest path to the boss. */
  ranOutFloor?: number;
}

/**
 * Arrival HP this far below the run's entry-HP target breaks it (N7KR F4: "fits entry_hp 90%" into a
 * no-rest forced elite at a projected 60%). 0.25 on the p75 projection; the route projection is at the
 * rooms' medians since Z49J/77QX, ~0.1 higher over the 3-4 rooms before a forced elite, so 0.15.
 */
export const ENTRY_ARRIVAL_SLACK = 0.15;
/** Another option must arrive at least this much higher for the shortfall to be a cost of this one. */
const ARRIVAL_BETTER = 0.05;

/**
 * The facts and tempo note of a map node against DeepSeek's guidance: an optional elite under
 * route_risk avoid_elites / seek_elites, and, with an entry-HP target, arrival HP at the first elite
 * every path meets and at the boss against that target while another option arrives higher (N7KR F4,
 * K7G9 F43, KGR6 F19). The elite facts (deck damage vs the act's elites, HP vs what an optional elite
 * usually costs) are in the node's own summary; they used to take the elite off the list.
 */
export function mapFit(
  plan: RunPlan | null | undefined,
  type: string,
  hpPct: number,
  ctx: { optionalElite: boolean; eliteOffered: boolean; arrival?: RouteArrival & { best: { eliteHp: number; bossHp: number } } },
): { tempo: string; breaks: boolean } | null {
  if (!plan) return null;
  const pct = (value: number) => `${Math.round(value * 100)}%`;
  const risk = routeRiskAt(plan, hpPct);
  const why = (field: "route_risk" | "hp_policy") => (plan.reasons?.[field] ? ` because ${plan.reasons[field]}` : "");
  if (type === "Elite" && ctx.optionalElite && risk === "avoid_elites") return { tempo: `departs from DeepSeek's route_risk avoid_elites${why("route_risk")}: an optional elite`, breaks: true };
  if (type === "Elite" && risk === "seek_elites") return { tempo: `fits DeepSeek's route_risk seek_elites${why("route_risk")}`, breaks: false };
  if (type !== "Elite" && ctx.eliteOffered && risk === "seek_elites") return { tempo: `DeepSeek's route_risk seek_elites: an elite is open instead`, breaks: false };
  const arrival = ctx.arrival;
  if (plan.entryHp && arrival) {
    const floorLine = plan.entryHp - ENTRY_ARRIVAL_SLACK;
    const { eliteHp, eliteFloor, bossHp, bossFloor, best } = arrival;
    if (eliteHp !== null && eliteFloor !== null && (eliteHp < floorLine || eliteHp <= arrival.eliteCost) && best.eliteHp - eliteHp >= ARRIVAL_BETTER) {
      const rest = arrival.eliteRest === "none" ? " with no rest before it" : "";
      return { tempo: `departs from DeepSeek's entry_hp ${pct(plan.entryHp)}: arrives at the F${eliteFloor} elite at ~${pct(eliteHp)}${rest} (an elite costs ~${pct(arrival.eliteCost)}; another route arrives at ~${pct(best.eliteHp)})`, breaks: true };
    }
    if (bossHp !== null && bossFloor !== null && bossHp < floorLine && best.bossHp - bossHp >= ARRIVAL_BETTER) {
      return { tempo: `departs from DeepSeek's entry_hp ${pct(plan.entryHp)}: reaches the F${bossFloor} boss at ~${pct(bossHp)} on its safest path (another route ~${pct(best.bossHp)})`, breaks: true };
    }
  }
  if (type === "Elite" && ctx.optionalElite && policyAt(plan, hpPct) === "preserve") return { tempo: `departs from DeepSeek's hp_policy preserve${why("hp_policy")}: an optional elite`, breaks: true };
  return null;
}

/**
 * The tempo note of a rest option against DeepSeek's heal-vs-smith lean (rest_lean), entry-HP target
 * and hp_policy. Code no longer moves the rest scores for them (entry-HP heal +8, preserve heal +4 /
 * smith -2 made 80% HP heal by code: act-2 smiths 24% -> 5%, upgraded cards at act 2's end 5.6 -> 3.4).
 */
export function restFit(plan: RunPlan | null | undefined, option: string, hpPct: number, toBoss = 99): { tempo: string; breaks: boolean } | null {
  if (!plan || (option !== "HEAL" && option !== "SMITH")) return null;
  const pct = (value: number) => `${Math.round(value * 100)}%`;
  const lean = plan.restLean ?? "auto";
  if (lean === "heal" || lean === "smith") {
    return option === lean.toUpperCase()
      ? { tempo: `fits DeepSeek's rest lean ${lean}`, breaks: false }
      : { tempo: `departs from DeepSeek's rest lean ${lean}`, breaks: true };
  }
  const target = hpTarget(plan);
  const policy = policyAt(plan, hpPct);
  if (plan.entryHp && hpPct < plan.entryHp && toBoss <= 6) {
    return option === "HEAL"
      ? { tempo: `fits DeepSeek's entry_hp ${pct(plan.entryHp)}: HP ${pct(hpPct)} with the boss ${toBoss} floors away`, breaks: false }
      : { tempo: `departs from DeepSeek's entry_hp ${pct(plan.entryHp)}: HP ${pct(hpPct)} with the boss ${toBoss} floors away`, breaks: true };
  }
  if (policy === "preserve" && hpPct < target) {
    return option === "HEAL" ? { tempo: `fits DeepSeek's hp_policy preserve: HP ${pct(hpPct)} is below the ${pct(target)} target`, breaks: false } : { tempo: `departs from DeepSeek's hp_policy preserve: HP ${pct(hpPct)} is below the ${pct(target)} target`, breaks: true };
  }
  if (policy === "push" && hpPct >= 0.55) {
    return option === "SMITH" ? { tempo: "fits DeepSeek's hp_policy push (HP spent for upgrades)", breaks: false } : { tempo: "departs from DeepSeek's hp_policy push (HP spent for upgrades)", breaks: true };
  }
  return null;
}

// ---------------------------------------------------------------- what Jev is told

/** Floors after a change for which Jev sees "strategy changed at F<n>". */
export const CHANGE_NOTICE_FLOORS = 3;

/** One line per piece of DeepSeek's strategy and tempo in force, with what it means; recent changes after them. */
export function intentLines(
  run: RunPlan | null | undefined,
  fight: FightPlan | null | undefined,
  floor: number | null = null,
  hpFraction: number | null = null,
  now: { bossClock?: BossClockNow | null; objective?: { objective: FightObjective | null; why: string | null } } = {},
): string[] {
  const bossClock = now.bossClock ?? null;
  const nowObjective = now.objective ?? null;
  const lines: string[] = [];
  const because = (reason: string | undefined) => (reason ? ` because ${reason}` : "");
  if (run) {
    const policy = run.hpPolicy ?? "balanced";
    lines.push(`DeepSeek hp_policy ${policy}${because(run.reasons?.hp_policy)}${run.entryHp ? ` (enter the act boss at ${Math.round(run.entryHp * 100)}%+ HP)` : ""}: ${MEANING.hp_policy[policy]}`);
    const risk = run.routeRisk ?? "normal";
    if (risk !== "normal") lines.push(`DeepSeek route_risk ${risk}${because(run.reasons?.route_risk)}: ${MEANING.route_risk[risk]}`);
    if (hpFraction !== null) {
      const now = combatPolicy(run, fight, hpFraction, bossClock, fight?.objective === "preserve_hp" && nowObjective?.objective === "kill_fast" ? nowObjective.why : null);
      if (now.why) lines.push(`code note: hp_policy reads as ${now.policy} now (${now.why})`);
      const riskNow = routeRiskAt(run, hpFraction);
      if (riskNow !== risk) lines.push(`code note: route_risk reads as ${riskNow} now (avoid_elites was for low HP; HP is back at the target)`);
    }
    if ((run.reserve ?? []).length > 0) lines.push(`DeepSeek holds ${run.reserve.join(", ")} potions for the act boss${because(run.reasons?.reserve)} (guidance: each option says what drinking one now saves and what the boss then lacks)`);
    if (run.potionTempo) lines.push(`DeepSeek potion tempo: ${short(run.potionTempo)}`);
    if (run.restLean && run.restLean !== "auto") lines.push(`DeepSeek rest lean: ${run.restLean}`);
    if (run.tempo) lines.push(`DeepSeek tempo: ${short(run.tempo)}`);
    if ((run.needs ?? []).length > 0) lines.push(`DeepSeek: the deck needs ${run.needs.join(", ")} cards before the act boss`);
    if (run.bossPrep) lines.push(`DeepSeek boss prep: ${short(run.bossPrep)}`);
    for (const change of recentChanges(run, floor)) lines.push(`strategy changed at F${change.floor}: ${change.field} ${fmt(change.from)}→${fmt(change.to)} because ${change.trigger}${change.fact ? ` (${change.fact})` : ""}`);
  }
  if (fight) {
    lines.push(`DeepSeek fight objective ${fight.objective}${because((fight.reasons ?? []).join(", "))}: ${MEANING.objective[fight.objective]}`);
    if (now.objective?.why && now.objective.objective && now.objective.objective !== fight.objective) lines.push(`code note: the fight now reads as ${now.objective.objective} (${now.objective.why})`);
    if (fight.killPriority.length > 0) lines.push(`DeepSeek kill priority: ${fight.killPriority.join(" > ")}`);
    if (fight.potionPlan) lines.push(`DeepSeek potion plan (guidance): ${short(fight.potionPlan)}`);
    for (const [id, note] of Object.entries(fight.potions ?? {})) lines.push(`DeepSeek on ${id}: ${short(note)}`);
    // The plan in DeepSeek's words (9V09 F33: "Play every affordable Frantic Escape early" never reached
    // Jev, only the objective's one-line meaning did).
    if (fight.summary) lines.push(`DeepSeek fight plan: ${short(fight.summary)}`);
    if (fight.threat) lines.push(`DeepSeek threat: ${short(fight.threat)}`);
  }
  return lines;
}

/** DeepSeek's guidance for one kind of question, as the excerpt Jev is shown and the log keeps. */
export function guidanceFor(run: RunPlan | null | undefined, topic: "map" | "rest" | "shop" | "reward" | "event" | "build" | "bundle", hpFraction: number | null = null): string[] {
  if (!run) return [];
  const out: string[] = [];
  const pct = (value: number) => `${Math.round(value * 100)}%`;
  const policy = hpFraction === null ? run.hpPolicy : policyAt(run, hpFraction);
  const risk = hpFraction === null ? run.routeRisk : routeRiskAt(run, hpFraction);
  if (run.summary) out.push(`plan: ${short(run.summary)}`);
  if (topic === "map" || topic === "rest" || topic === "event") {
    out.push(`hp_policy ${policy}${run.entryHp ? `, enter the act boss at ${pct(run.entryHp)}+ HP` : ""}`);
  }
  if (topic === "map") {
    out.push(`route_risk ${risk}: ${MEANING.route_risk[risk]}`);
  }
  if (topic === "rest" && run.restLean) out.push(`rest lean: ${run.restLean}`);
  if ((topic === "map" || topic === "rest" || topic === "shop" || topic === "event") && run.tempo) out.push(`tempo: ${short(run.tempo)}`);
  if ((topic === "shop" || topic === "event") && ((run.reserve ?? []).length > 0 || run.potionTempo)) {
    out.push(`potions: ${[(run.reserve ?? []).length > 0 ? `hold ${run.reserve.join("/")} for the act boss` : null, run.potionTempo ? short(run.potionTempo) : null].filter(Boolean).join("; ")}`);
  }
  if (topic === "shop" || topic === "reward" || topic === "build" || topic === "bundle" || topic === "event") {
    if (run.archetype) out.push(`deck direction: ${run.archetype}`);
    if ((run.needs ?? []).length > 0) out.push(`needs: ${run.needs.join(", ")}${run.blockTarget !== null ? ` (block cards by the boss: ${run.blockTarget})` : ""}`);
    if (run.want.length > 0) out.push(`want: ${run.want.join(", ")}`);
    if (run.avoid.length + (run.avoidRoles ?? []).length > 0) out.push(`avoid: ${[...run.avoid, ...(run.avoidRoles ?? [])].join(", ")}`);
    if ((topic === "shop" || topic === "build") && run.remove.length > 0) out.push(`remove first: ${run.remove.join(", ")}`);
  }
  if (run.bossPrep && topic !== "reward") out.push(`boss prep: ${short(run.bossPrep)}`);
  return out;
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
