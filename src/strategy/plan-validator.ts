/**
 * Plan validator ("不乱指挥"): DeepSeek's run and fight plans are checked before code or Jev act on
 * them. Unknown values are dropped, incoherent intents repaired, and on a re-plan every intent change
 * must name a trigger from the closed list that the facts since the last plan actually show. Each
 * repair or rejection is one reason string; the plan logs carry them (`validator`) so
 * ops/plan_adherence.py can count them.
 *
 * Pure functions over plain data: callers pass HP, floors and the board, so this module needs nothing
 * from the game-state readers.
 */

import type { JsonValue } from "../util/json.js";
import type { CardRole, PotionRole } from "../knowledge/dossiers.js";
import type { PlanChange, PlanSnapshot, RunPlan } from "./run-plan.js";
import type { FightPlan } from "./fight-plan.js";
import { CARD_ROLES, CHANGE_TRIGGERS, HP_TARGET, isOneOf, isReserved, type ChangeTrigger, type FightObjective, type HpPolicy, type RouteRisk } from "./intent.js";

// ---------------------------------------------------------------- run plan: since the last plan

export interface SinceSummary {
  floors_passed: number;
  act_then: number;
  act_now: number;
  hp_then_pct: number;
  hp_now_pct: number;
  potions_gained: string[];
  potions_used: string[];
  cards_added: string[];
  cards_removed: string[];
  relics_gained: string[];
  elites_fought: number;
  boss_gap_then: number | null;
  boss_gap_now: number | null;
  /** Every path ahead meets an elite soon (code's map check). */
  forced_route: boolean;
}

/** Items in `a` not matched one-for-one in `b`. */
function minus(a: string[], b: string[]): string[] {
  const left = [...b];
  const out: string[] = [];
  for (const item of a) {
    const at = left.indexOf(item);
    if (at >= 0) left.splice(at, 1);
    else out.push(item);
  }
  return out;
}

export function sinceLastPlan(then: PlanSnapshot, now: PlanSnapshot, forcedRoute = false): SinceSummary {
  return {
    floors_passed: now.floor - then.floor,
    act_then: then.act,
    act_now: now.act,
    hp_then_pct: Math.round(then.hpPct * 100),
    hp_now_pct: Math.round(now.hpPct * 100),
    potions_gained: minus(now.potions, then.potions),
    potions_used: minus(then.potions, now.potions),
    cards_added: minus(now.deck, then.deck),
    cards_removed: minus(then.deck, now.deck),
    relics_gained: minus(now.relics, then.relics),
    elites_fought: now.act === then.act ? Math.max(0, now.elites - then.elites) : now.elites,
    boss_gap_then: then.gap,
    boss_gap_now: now.gap,
    forced_route: forcedRoute,
  };
}

/** Boss-clock change (damage a turn) that counts as the gap widening or closing. */
export const GAP_CHANGE = 2;
/** HP change (fraction of max) that counts as a drop or a recovery by itself. */
export const HP_CHANGE = 0.15;

/** The fact that supports a trigger, or null when the summary does not show it. */
export function triggerFact(trigger: ChangeTrigger, since: SinceSummary, target: number): string | null {
  const then = since.hp_then_pct / 100;
  const now = since.hp_now_pct / 100;
  const pct = (value: number) => `${Math.round(value * 100)}%`;
  switch (trigger) {
    case "hp_below_target":
      return now < target || now <= then - HP_CHANGE ? `HP ${pct(then)}→${pct(now)} (target ${pct(target)})` : null;
    case "hp_recovered":
      return now >= then + HP_CHANGE || (then < target && now >= target) ? `HP ${pct(then)}→${pct(now)} (target ${pct(target)})` : null;
    case "boss_gap_widened":
      return since.boss_gap_now !== null && (since.boss_gap_then === null ? since.boss_gap_now > 0 : since.boss_gap_now >= since.boss_gap_then + GAP_CHANGE)
        ? `boss gap ${since.boss_gap_then ?? "?"}→${since.boss_gap_now}/turn` : null;
    case "boss_gap_closed":
      return since.boss_gap_then !== null && since.boss_gap_now !== null && (since.boss_gap_now <= since.boss_gap_then - GAP_CHANGE || (since.boss_gap_now === 0 && since.boss_gap_then > 0))
        ? `boss gap ${since.boss_gap_then}→${since.boss_gap_now}/turn` : null;
    case "key_card_or_relic_gained":
      return since.cards_added.length + since.relics_gained.length > 0 ? `gained ${[...since.cards_added, ...since.relics_gained].join(", ")}` : null;
    case "potion_lost_or_gained":
      return since.potions_gained.length + since.potions_used.length > 0 ? `potions +[${since.potions_gained.join(", ")}] -[${since.potions_used.join(", ")}]` : null;
    case "act_changed":
      return since.act_now !== since.act_then ? `act ${since.act_then}→${since.act_now}` : null;
    case "forced_route":
      return since.forced_route ? "every path ahead meets an elite" : null;
  }
}

/** Intent fields whose changes need a trigger. */
export const CHANGE_FIELDS = ["hp_policy", "route_risk", "entry_hp_pct", "reserve", "needs", "avoid"] as const;
export type ChangeField = (typeof CHANGE_FIELDS)[number];
/** A change reversed within this many floors needs a different trigger. */
export const FLIP_FLOP_FLOORS = 3;
/** History kept on the plan. */
export const CHANGE_HISTORY = 12;

function getField(plan: RunPlan, field: ChangeField): JsonValue {
  switch (field) {
    case "hp_policy": return plan.hpPolicy;
    case "route_risk": return plan.routeRisk;
    case "entry_hp_pct": return plan.entryHp;
    case "reserve": return [...plan.reserve].sort();
    case "needs": return [...plan.needs].sort();
    case "avoid": return [...plan.avoid, ...plan.avoidRoles].sort();
  }
}

function setField(plan: RunPlan, field: ChangeField, value: JsonValue): void {
  switch (field) {
    case "hp_policy": plan.hpPolicy = value as HpPolicy; break;
    case "route_risk": plan.routeRisk = value as RouteRisk; break;
    case "entry_hp_pct": plan.entryHp = value as number | null; break;
    case "reserve": plan.reserve = [...(value as PotionRole[])]; break;
    case "needs": plan.needs = [...(value as CardRole[])]; break;
    case "avoid": {
      const all = value as string[];
      plan.avoidRoles = all.filter((entry): entry is CardRole => isOneOf(CARD_ROLES, entry));
      plan.avoid = all.filter((entry) => !isOneOf(CARD_ROLES, entry));
      break;
    }
  }
}

function same(field: ChangeField, a: JsonValue, b: JsonValue): boolean {
  if (field === "entry_hp_pct") return a === b || (typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 0.03);
  return JSON.stringify(a) === JSON.stringify(b);
}

const POLICY_ORDER: Record<HpPolicy, number> = { preserve: 0, balanced: 1, push: 2 };
const RISK_ORDER: Record<RouteRisk, number> = { avoid_elites: 0, normal: 1, seek_elites: 2 };

/** A trigger that points the other way (HP fell, so take more risk): the change is incoherent. */
function wrongWay(field: ChangeField, from: JsonValue, to: JsonValue, trigger: ChangeTrigger): boolean {
  const order = field === "hp_policy" ? (value: JsonValue) => POLICY_ORDER[value as HpPolicy] : field === "route_risk" ? (value: JsonValue) => RISK_ORDER[value as RouteRisk] : null;
  if (!order) return false;
  const up = order(to) > order(from);
  if ((trigger === "hp_below_target" || trigger === "forced_route") && up) return true;
  if (trigger === "hp_recovered" && !up) return true;
  return false;
}

interface ClaimedChange {
  trigger: string;
  fact: string;
}

function claims(raw: unknown): Map<string, ClaimedChange> {
  const out = new Map<string, ClaimedChange>();
  if (!Array.isArray(raw)) return out;
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const field = typeof record["field"] === "string" ? record["field"].trim().toLowerCase() : "";
    // The old names count as the new fields.
    const name = field === "save_potions" ? "reserve" : field === "must_have" ? "needs" : field;
    if (!name) continue;
    out.set(name, { trigger: typeof record["trigger"] === "string" ? record["trigger"].trim().toLowerCase() : "", fact: typeof record["fact"] === "string" ? record["fact"].slice(0, 120) : "" });
  }
  return out;
}

/**
 * Checks each intent that differs from the previous plan against its claimed trigger. Rejected
 * changes keep the old value. Returns the plan with the accepted changes appended to its history.
 */
export function validateChanges(prev: RunPlan, proposal: RunPlan, changesRaw: unknown, since: SinceSummary | null): { plan: RunPlan; accepted: PlanChange[]; notes: string[] } {
  const plan: RunPlan = { ...proposal, changes: [...prev.changes] };
  const notes: string[] = [];
  const accepted: PlanChange[] = [];
  const claimed = claims(changesRaw);
  const actChanged = since !== null ? since.act_now !== since.act_then : prev.act !== proposal.act;
  const target = prev.entryHp ?? HP_TARGET[prev.hpPolicy];
  for (const field of CHANGE_FIELDS) {
    const from = getField(prev, field);
    const to = getField(proposal, field);
    if (same(field, from, to)) {
      setField(plan, field, from);
      continue;
    }
    const claim = claimed.get(field);
    const reject = (why: string) => {
      setField(plan, field, from);
      notes.push(`rejected change ${field} ${JSON.stringify(from)}→${JSON.stringify(to)}: ${why}; kept ${JSON.stringify(from)}`);
    };
    // A new act is a new boss: every change is accepted, under the claimed trigger when the facts show it.
    let trigger: ChangeTrigger | null = claim && isOneOf(CHANGE_TRIGGERS, claim.trigger) ? claim.trigger : null;
    let fact = trigger && since ? triggerFact(trigger, since, target) : null;
    if (actChanged && (!trigger || !fact)) {
      trigger = "act_changed";
      fact = `act ${prev.act}→${proposal.act}`;
    }
    if (!claim && !actChanged) {
      reject("no trigger given");
      continue;
    }
    if (!trigger) {
      reject(`trigger ${JSON.stringify(claim?.trigger ?? "")} is not one of ${CHANGE_TRIGGERS.join(", ")}`);
      continue;
    }
    // A plan logged before snapshots existed (restored after a restart): the trigger cannot be checked.
    if (!since && !fact) fact = "unverified: the previous plan has no snapshot";
    if (!fact) {
      reject(`trigger ${trigger} is not supported by the facts since the last plan`);
      continue;
    }
    if (wrongWay(field, from, to, trigger)) {
      reject(`trigger ${trigger} points the other way`);
      continue;
    }
    // Flip-flop: undoing a recent change needs a new reason, not the one that made it.
    const recent = [...prev.changes].reverse().find((change) => change.field === field && change.act === proposal.act && proposal.floor - change.floor <= FLIP_FLOP_FLOORS);
    if (recent && same(field, recent.from, to) && recent.trigger === trigger) {
      reject(`reverses the F${recent.floor} change (${recent.trigger}) with the same trigger`);
      continue;
    }
    setField(plan, field, to);
    const change: PlanChange = { floor: proposal.floor, act: proposal.act, version: proposal.version, field, from, to, trigger, fact };
    accepted.push(change);
  }
  plan.changes = [...prev.changes, ...accepted].slice(-CHANGE_HISTORY);
  return { plan, accepted, notes };
}

/** HP below which push is repaired to balanced, and seek_elites to normal. */
export const PUSH_MIN_HP = 0.4;
export const SEEK_MIN_HP = 0.5;
/** Floors to the boss within which push below the entry target is repaired to balanced. */
export const NEAR_BOSS_FLOORS = 8;

/** Coherence repairs of a run plan (mutates it). */
export function repairRunPlan(plan: RunPlan, ctx: { hpPct: number; toBoss: number }): string[] {
  const notes: string[] = [];
  if (plan.hpPolicy === "push" && ctx.hpPct < PUSH_MIN_HP) {
    plan.hpPolicy = "balanced";
    notes.push(`hp_policy push at ${Math.round(ctx.hpPct * 100)}% HP → balanced`);
  } else if (plan.hpPolicy === "push" && plan.entryHp && ctx.hpPct < plan.entryHp && ctx.toBoss <= NEAR_BOSS_FLOORS) {
    plan.hpPolicy = "balanced";
    notes.push(`hp_policy push ${ctx.toBoss} floors from the boss below the ${Math.round(plan.entryHp * 100)}% entry target → balanced`);
  }
  if (plan.routeRisk === "seek_elites" && plan.hpPolicy === "preserve") {
    plan.routeRisk = "normal";
    notes.push("route_risk seek_elites contradicts hp_policy preserve → normal");
  } else if (plan.routeRisk === "seek_elites" && ctx.hpPct < SEEK_MIN_HP) {
    plan.routeRisk = "normal";
    notes.push(`route_risk seek_elites at ${Math.round(ctx.hpPct * 100)}% HP → normal`);
  }
  const clash = plan.avoidRoles.filter((role) => plan.needs.includes(role));
  if (clash.length > 0) {
    plan.avoidRoles = plan.avoidRoles.filter((role) => !clash.includes(role));
    notes.push(`avoid roles ${clash.join(", ")} are also needed: dropped from avoid`);
  }
  const both = plan.avoid.filter((id) => plan.want.includes(id));
  if (both.length > 0) {
    plan.avoid = plan.avoid.filter((id) => !both.includes(id));
    notes.push(`cards ${both.join(", ")} both wanted and avoided: dropped from avoid`);
  }
  if (plan.reserve.includes("any") && plan.reserve.length > 1) {
    plan.reserve = ["any"];
    notes.push("reserve lists 'any' with other roles → any");
  }
  return notes;
}

// ---------------------------------------------------------------- fight plan

export interface FightContext {
  /** HP fraction at the fight's start. */
  hpPct: number;
  hp: number;
  /** Damage through block this turn if nothing is played. */
  incoming: number;
  /** Code's estimate of the turns the fight lasts (enemy HP / deck damage a turn), null when unknown. */
  turnsToKill: number | null;
  /** Enemy ids on the board, and the ones that must die together (no kill-first target). */
  enemyIds: string[];
  together: string[];
  /** Potions in the belt: id and text. */
  potions: { id: string; text: string }[];
  kind: string;
}

/** Below this HP fraction scale_then_kill is repaired to preserve_hp (DeepSeek planned setup at 14 HP). */
export const SETUP_MIN_HP = 0.4;
/** Incoming this share of HP or more is lethal-ish: no setup turns. */
export const SETUP_MAX_INCOMING = 0.5;
/** A fight code expects to end within this many turns is "winnable fast". */
export const FAST_WIN_TURNS = 3;

/**
 * Validates a parsed fight plan (mutates it) against the board and the run plan. `raw` is DeepSeek's
 * reply: tactical fields it should no longer send (potion timings, cards, key turns) are dropped
 * with a reason, and a potion timing for a reserved potion is logged as a run-plan conflict.
 */
export function validateFightPlan(plan: FightPlan, raw: Record<string, unknown>, run: RunPlan | null, ctx: FightContext): string[] {
  const notes: string[] = [];
  // Kill priority: enemies on the board only, none that must die together.
  const unknown = plan.killPriority.filter((id) => !ctx.enemyIds.includes(id));
  if (unknown.length > 0) notes.push(`kill_priority: ${unknown.join(", ")} not in this fight, dropped`);
  const together = plan.killPriority.filter((id) => ctx.together.includes(id));
  if (together.length > 0) notes.push(`kill_priority: ${together.join(", ")} must die together (no kill-first), dropped`);
  plan.killPriority = plan.killPriority.filter((id) => ctx.enemyIds.includes(id) && !ctx.together.includes(id));

  // Tactical orders are not strategy: dropped (old-format replies, or a model ignoring the task).
  const potions = raw["potions"] && typeof raw["potions"] === "object" && !Array.isArray(raw["potions"]) ? (raw["potions"] as Record<string, unknown>) : {};
  for (const [key, use] of Object.entries(potions)) {
    const potion = ctx.potions.find((entry) => entry.id === key.trim());
    const drink = typeof use === "string" && !["save", "emergency"].includes(use.trim().toLowerCase());
    if (potion && drink && run && ctx.kind !== "boss" && isReserved(run.reserve, potion.id, potion.text)) {
      notes.push(`potion ${potion.id} "${String(use)}" ignored: the run plan reserves it for the act boss (run plan wins)`);
    } else {
      notes.push(`potion timing ${key}: ${String(use)} ignored (potions are code's and Jev's)`);
    }
  }
  for (const key of ["setup_cards", "cards", "key_turns", "turns"]) {
    const value = raw[key];
    if (value !== undefined && value !== null && !(Array.isArray(value) && value.length === 0) && value !== "") notes.push(`${key} ignored (card and turn orders are code's and Jev's)`);
  }

  // Objective against the board and the run plan.
  if (plan.objective === "scale_then_kill" && ctx.hpPct < SETUP_MIN_HP) {
    notes.push(`objective scale_then_kill at ${Math.round(ctx.hpPct * 100)}% HP → preserve_hp`);
    plan.objective = "preserve_hp";
  } else if (plan.objective === "scale_then_kill" && ctx.hp > 0 && ctx.incoming >= ctx.hp * SETUP_MAX_INCOMING) {
    notes.push(`objective scale_then_kill with ${ctx.incoming} incoming at ${ctx.hp} HP → preserve_hp`);
    plan.objective = "preserve_hp";
  }
  if (run?.hpPolicy === "preserve" && (plan.objective === "kill_fast" || plan.objective === "race")) {
    const fast = ctx.turnsToKill !== null && ctx.turnsToKill <= FAST_WIN_TURNS;
    // A boss is fought to the end whatever the policy: racing it is the boss plan, not a run choice.
    if (!fast && ctx.kind !== "boss") {
      notes.push(`objective ${plan.objective} under run hp_policy preserve, fight not winnable in ${FAST_WIN_TURNS} turns (code estimate ${ctx.turnsToKill ?? "?"}) → preserve_hp`);
      plan.objective = "preserve_hp";
    }
  }
  return notes;
}

/** The objective an old logged plan's approach stands for. */
export function objectiveOfApproach(approach: unknown): FightObjective | null {
  return approach === "setup" ? "scale_then_kill" : approach === "defend" ? "preserve_hp" : approach === "race" ? "race" : null;
}
