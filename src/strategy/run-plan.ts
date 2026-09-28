/**
 * Run plan (RUN_PLAN=v1): DeepSeek sets the run's strategy and tempo at a few checkpoints — the start
 * of the run, the start of each act, after a heavy HP loss, and at most every RUN_PLAN_REVIEW_FLOORS
 * floors — as guidance: hp_policy, entry_hp_pct, route_risk, the potions to hold for the act boss
 * (reserve) and potion timing (potion_tempo), the heal-vs-smith lean (rest_lean), pacing (tempo), and
 * the deck direction (needs, want, avoid, remove). Nothing is enforced: code shows each option's fit
 * with it as a fact, and Jev decides (Dai 2026-09-28: "ds给时机和节奏，喝不喝还是需要代码和jev来操作").
 *
 * Re-plans keep continuity: DeepSeek sees the intents in force and what happened since
 * (since_last_plan), and a field it leaves out keeps its value. A change without a trigger the facts
 * show is kept and logged as a disagreement (plan-validator.ts checks format and ids only).
 *
 * Why: most losses since the fight plan came in were cross-fight decisions no single fight plan
 * sees (entering elites or bosses with empty potion slots, a 3-block-card deck at the Queen, the
 * card a boss needs never bought, rest sites all spent healing).
 */

import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readSync, statSync } from "node:fs";
import { dirname } from "node:path";

import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../mod/schema.js";
import { deckEntries } from "../project/deck.js";
import { actThreats, dossierFor, dossierJson, type CardRole, type PotionRole } from "../knowledge/dossiers.js";
import { bossClockJson, damageGap } from "./boss-clock.js";
import { cardRoles } from "./card-value.js";
import { CARD_ROLES, CHANGE_TRIGGERS, HP_POLICIES, hpTarget, INTENT_REASONS, isOneOf, isReserved, MEANING, parseReasons, POTION_ROLES, REASON_FIELDS, REASON_MEANING, originOf, recentChanges, REST_LEANS, ROUTE_RISKS, type ChangeTrigger, type OriginField, type PolicyOrigin, type HpPolicy, type IntentReason, type ReasonField, type RestLean, type RouteRisk } from "./intent.js";
import { avoidElitesDisagreement, DISAGREE, repairRunPlan, sinceLastPlan, validateChanges } from "./plan-validator.js";
import { routeFacts, routeFactsText, type RouteNode } from "./route-facts.js";
import { asArray, asRecord, str, truncate, type JsonValue } from "../util/json.js";

export type RunPlanTrigger = "start" | "act" | "hp_drop" | "hp_rise" | "review";

/** One accepted change of an intent between plan versions (plan-validator.ts). */
export interface PlanChange {
  floor: number;
  act: number;
  /** The run plan version the change made. */
  version: number;
  field: string;
  from: JsonValue;
  to: JsonValue;
  /** The trigger DeepSeek gave (or the facts show); "unstated" when it gave none the facts support. */
  trigger: ChangeTrigger | "unstated";
  /** The fact from the "since last plan" summary that supports the trigger ("unverified: …" when none). */
  fact: string;
}

/** What the run looked like when a plan was made (the next re-plan's "since last plan" summary). */
export interface PlanSnapshot {
  floor: number;
  act: number;
  hpPct: number;
  deck: string[];
  relics: string[];
  potions: string[];
  /** Boss-clock gap a turn, null when unknown. */
  gap: number | null;
  /** Elites fought in this act (visited Elite map nodes). */
  elites: number;
}

/** Card roles a run plan may need at once (list order kept; more are cut with a validator note). */
export const MAX_NEEDS = 5;

export interface RunPlan {
  runId: string;
  /** Act (1-based) and floor the plan was made on. */
  act: number;
  floor: number;
  /** HP fraction when the plan was made (the hp_drop trigger compares against it). */
  hpPct: number;
  trigger: RunPlanTrigger;
  archetype: string;
  /** card_id: pick these when offered (card rewards, shops). */
  want: string[];
  /** card_id: DeepSeek would not take these (a fact on reward and shop options). */
  avoid: string[];
  /** card_id: remove these first (shop removal, events). */
  remove: string[];
  /** Block cards the deck should hold by the act boss. */
  blockTarget: number | null;
  /** Strategic intents (intent.ts has what each means for code and Jev). */
  hpPolicy: HpPolicy;
  routeRisk: RouteRisk;
  /** HP fraction to enter the act boss with. */
  entryHp: number | null;
  /** Potion roles DeepSeek wants held for the act boss (guidance: a fact on every line that drinks one). */
  reserve: PotionRole[];
  /** DeepSeek's potion timing in words ("keep Flex for the boss burst turn; spend in elites below 50%"). */
  potionTempo?: string;
  /** DeepSeek's pacing for the act in words (elite appetite, when to spend HP). */
  tempo?: string;
  /** DeepSeek's heal-vs-smith lean at rest sites. */
  restLean?: RestLean;
  /** Card roles the deck must get before the act boss. */
  needs: CardRole[];
  /** Card roles DeepSeek would not take (a fact on reward and shop options). */
  avoidRoles: CardRole[];
  bossPrep: string;
  summary: string;
  /** Why each intent was chosen (intent.ts INTENT_REASONS): low_hp preserve / avoid_elites lapse once HP is back. */
  reasons?: Partial<Record<ReasonField, IntentReason>>;
  /**
   * Where hp_policy's and route_risk's current values came from (the change or first plan that set
   * them, with the reason given then): a low-HP preserve lapses by its origin, not by a later re-plan's
   * reason text (intent.ts setForLowHp; Z7D7 F24).
   */
  origins?: Partial<Record<OriginField, PolicyOrigin>>;
  /** 1 for the run's first plan, +1 per re-plan (picks that differ from it are logged per version). */
  version: number;
  snapshot?: PlanSnapshot;
  /** Accepted intent changes so far this run (last CHANGE_HISTORY). */
  changes: PlanChange[];
  /** Validator repairs and rejected changes of this version, one reason each. */
  validator: string[];
  /** Judgment calls the validator disagrees with and keeps (plan-validator DISAGREE), this version. */
  disagreements?: string[];
}

/** A plan older than this many floors is reviewed at the next map. */
export const RUN_PLAN_REVIEW_FLOORS = 8;
/**
 * HP lost since the plan (fraction of max HP) that asks for a new one (at least this much). EN55: 80%
 * -> 51% (0.2875) under 0.3 never re-planned, and the plan's "elites only above 75% HP" was never seen
 * again.
 */
export const RUN_PLAN_HP_DROP = 0.25;
/** Below this HP fraction a plan made above it is renewed. */
export const RUN_PLAN_LOW_HP = 0.4;

export function actOf(state: GameState): number {
  const raw = str(asRecord(state.run?.raw)["act_id"]);
  return /^\d+$/.test(raw) ? Number(raw) + 1 : 1;
}

export function hpFraction(state: GameState): number {
  const hp = state.run?.current_hp ?? null;
  const maxHp = state.run?.max_hp ?? null;
  return hp !== null && maxHp !== null && maxHp > 0 ? hp / maxHp : 1;
}

/**
 * Why a new plan is due at this map screen, or null. A new act waits while the only node open is the
 * act's Ancient (NX48 F17/F33: both act re-plans ran at 35% HP right before the Ancient healed to 86%,
 * and the stale preserve held through F35). HP back up by RUN_PLAN_HP_DROP, or back at the target
 * under a preserve made below it, asks again (hp_rise: rest sites and Ancient heals, NX48 F29/F32).
 */
export function runPlanTrigger(plan: RunPlan | null | undefined, state: GameState): RunPlanTrigger | null {
  const runId = str(state.raw["run_id"]);
  if (!plan || plan.runId !== runId) return "start";
  const act = actOf(state);
  if (act !== plan.act) return onlyAncientOpen(state) ? null : "act";
  const hp = hpFraction(state);
  if (plan.hpPct - hp >= RUN_PLAN_HP_DROP || (hp < RUN_PLAN_LOW_HP && plan.hpPct >= RUN_PLAN_LOW_HP)) return "hp_drop";
  const target = hpTarget(plan);
  if (hp - plan.hpPct >= RUN_PLAN_HP_DROP || (plan.hpPolicy === "preserve" && plan.hpPct < target && hp >= target)) return "hp_rise";
  if ((state.run?.floor ?? 0) - plan.floor >= RUN_PLAN_REVIEW_FLOORS) return "review";
  return null;
}

/** Every node open on the map is an Ancient (the act's first room, which heals). */
function onlyAncientOpen(state: GameState): boolean {
  const open = asArray(asRecord(state.raw["map"])["available_nodes"]).map(asRecord);
  return open.length > 0 && open.every((node) => str(node["node_type"]) === "Ancient");
}

export const RUN_PLAN_TASK = [
  "TASK: run plan (not an option choice; ignore the {choice, reason} reply format for this one).",
  "You set the STRATEGY and the TEMPO for the rest of this act and run, as guidance. Code computes the facts of every option",
  "(HP cost, route survival and arrival HP, card value, what a potion drunk now saves) and a reference rank; a small model",
  "(Jev) makes every execution choice (card rewards, shop buys, routes, rest sites, events, card play, potions) seeing your",
  "guidance next to those facts. Nothing you write is enforced: Jev follows your tempo unless the facts clearly say otherwise.",
  "Tempo guidance is welcome: when to hold or spend potions (e.g. 'keep Flex for the boss burst turn; spend potions in elites",
  "if HP < 50%'), whether rest sites should lean to healing or smithing, how hungry to be for elites, when HP may be spent.",
  "Do not name exact card plays per turn.",
  "Only the card, relic and potion text you are shown is true: do not assume an effect that is not written there.",
  "Look at the deck, relics, HP, gold, potions, the act boss and the map ahead (memory.lookahead).",
  "act_boss_clock gives the boss's HP, the turns the fight can last, the damage a turn that needs, and code's rough",
  "estimate of this deck's damage a turn. If gap_per_turn > 0, closing it comes first (needs strength/aoe/frontload, want",
  "high-damage cards, remove Strikes/Defends that dilute them, upgrades at rest sites); state the gap in the summary.",
  'Reply with JSON only: {"archetype": "<the deck direction, max 12 words>",',
  '"hp_policy": "preserve" | "balanced" | "push", "entry_hp_pct": <0-1: HP fraction to enter the act boss with, from act_boss_dossier>,',
  '"route_risk": "avoid_elites" | "normal" | "seek_elites",',
  '"reserve": [potion roles to hold for the act boss: "block"|"weak"|"damage"|"strength"|"heal"|"any"],',
  '"potion_tempo": "<max 40 words: which potions to hold for what, and when to spend them instead>",',
  '"rest_lean": "heal" | "smith" | "auto",',
  '"tempo": "<max 40 words: pacing for this act: elites, rests, when HP may be spent>",',
  '"needs": [card roles the deck must get before the act boss: "aoe"|"strength"|"block"|"draw"|"exhaust"|"multi_hit"|"frontload"|"debuff"],',
  '"avoid": [card ids or card roles not to take], "want": [card ids to pick when offered, most important first, max 6],',
  '"remove": [card ids in the deck to remove first, max 3], "block_target": <block cards the deck should hold by the act boss>,',
  '"boss_prep": "<max 30 words: what to have ready for the act boss>",',
  '"summary": "<max 40 words: the plan in plain words>",',
  `"reasons": {"<hp_policy|route_risk|entry_hp_pct|reserve>": "<${INTENT_REASONS.join("|")}>"} (why you chose each intent),`,
  '"changes": [{"field": "<hp_policy|route_risk|entry_hp_pct|reserve|needs|avoid>", "from": <old>, "to": <new>,',
  `"trigger": "<${CHANGE_TRIGGERS.join("|")}>", "fact": "<the fact from since_last_plan that shows it>"}]}`,
  "What each intent means to Jev (shown as guidance next to the facts, never enforced):",
  `hp_policy preserve = ${MEANING.hp_policy.preserve}; balanced = ${MEANING.hp_policy.balanced}; push = ${MEANING.hp_policy.push}.`,
  `route_risk avoid_elites = ${MEANING.route_risk.avoid_elites}; seek_elites = ${MEANING.route_risk.seek_elites}.`,
  "entry_hp_pct: the HP to reach the boss with; route and rest options show their arrival HP against it. reserve / potion_tempo:",
  "every line that drinks a held potion shows what it saves now and that the boss then has one fewer; a potion held to the",
  "death helps nobody (A8: 15 of 44 deaths still held potions), so say when to spend them. needs / want / avoid: shown on card",
  "rewards and shop items as facts. act_boss_dossier and act_threats come from past runs: what kills, what wins, the entry HP",
  "and potions that worked.",
  "What each reason means: " + INTENT_REASONS.map((reason) => `${reason} = ${REASON_MEANING[reason]}`).join("; ") + ".",
  "reserve damage covers damage potions and burst potions: ENERGY_POTION, RADIANT_TINCTURE, ATTACK/POWER/SKILL/COLORLESS_POTION,",
  "DUPLICATOR, SWIFT_POTION; Potion-Shaped Rocks are never held.",
  "Re-plans (previous_plan is set): previous_plan holds the intents in force and since_last_plan what happened since.",
  "Keep every intent unless something in since_last_plan changes it; a field you leave out keeps its value.",
  "List every changed field among hp_policy, route_risk, entry_hp_pct, reserve, needs and avoid in changes with its trigger",
  "and the supporting fact (a change without one is kept and logged for review).",
].join(" ");

/** The intents in force, as the re-plan and the fight plan see them. */
export function runPlanIntentsJson(plan: RunPlan): Record<string, JsonValue> {
  return {
    version: plan.version,
    floor: plan.floor,
    archetype: plan.archetype,
    hp_policy: plan.hpPolicy,
    entry_hp_pct: plan.entryHp,
    route_risk: plan.routeRisk,
    reserve: plan.reserve,
    potion_tempo: plan.potionTempo ?? "",
    rest_lean: plan.restLean ?? "auto",
    tempo: plan.tempo ?? "",
    needs: plan.needs,
    avoid: [...plan.avoid, ...plan.avoidRoles],
    want: plan.want,
    remove: plan.remove,
    block_target: plan.blockTarget,
    boss_prep: plan.bossPrep,
    summary: plan.summary,
    reasons: (plan.reasons ?? {}) as JsonValue,
    recent_changes: plan.changes.slice(-4).map((change) => `F${change.floor} ${change.field} ${JSON.stringify(change.from)}→${JSON.stringify(change.to)} (${change.trigger})`),
  };
}

/** What the run looks like now, for the next re-plan's "since last plan" summary. */
export function snapshotOf(state: GameState, knowledge: Knowledge): PlanSnapshot {
  const raw = asRecord(state.run?.raw);
  const map = asRecord(state.raw["map"]);
  const elites = asArray(map["nodes"]).map(asRecord).filter((node) => node["visited"] === true && str(node["node_type"]) === "Elite").length;
  return {
    floor: state.run?.floor ?? 0,
    act: actOf(state),
    hpPct: hpFraction(state),
    deck: deckEntries(state, knowledge).map((card) => `${card.card_id}${card.upgraded ? "+" : ""}`),
    relics: asArray(raw["relics"]).map((relic) => str(asRecord(relic)["relic_id"])).filter(Boolean),
    potions: asArray(raw["potions"]).map(asRecord).filter((potion) => potion["occupied"] !== false && str(potion["potion_id"])).map((potion) => str(potion["potion_id"])),
    gap: damageGap(state, knowledge)?.gap ?? null,
    elites,
  };
}

/** What DeepSeek is shown: the deck grouped, relics, potions, HP/gold, act boss and the trigger. */
export function runPlanInput(
  state: GameState,
  knowledge: Knowledge,
  trigger: RunPlanTrigger,
  deckLines: string[],
  relics: string[],
  potions: string[],
  previous: RunPlan | null = null,
  forcedRoute = false,
): Record<string, JsonValue> {
  const raw = asRecord(state.run?.raw);
  const since = previous?.snapshot && previous.runId === str(state.raw["run_id"]) ? sinceLastPlan(previous.snapshot, snapshotOf(state, knowledge), forcedRoute) : null;
  return {
    trigger,
    act: actOf(state),
    floor: state.run?.floor ?? null,
    ascension: state.run?.ascension ?? 0,
    hp: `${state.run?.current_hp ?? "?"}/${state.run?.max_hp ?? "?"}`,
    gold: state.run?.gold ?? null,
    act_boss: str(raw["boss_id"]),
    act_boss_clock: bossClockJson(state, knowledge),
    // Dossiers from past runs: the act boss and this act's most dangerous elites and hallway enemies.
    act_boss_dossier: (() => {
      const dossier = dossierFor(str(raw["boss_id"]));
      return dossier ? dossierJson(dossier, state.run?.ascension ?? 0) : null;
    })(),
    act_threats: actThreats(actOf(state), 6).map((dossier) => dossierJson(dossier, state.run?.ascension ?? 0)),
    deck_size: deckEntries(state, knowledge).length,
    deck: deckLines,
    relics,
    potions,
    ...(since ? { since_last_plan: since as unknown as JsonValue } : {}),
    ...(routeAhead(state) ? { route_ahead: routeAhead(state)! } : {}),
  };
}

/**
 * The map ahead from the nodes open now (a map screen): the elites every path to the boss meets, with
 * or without a rest before them, and the longest run of fights every path takes (VQ7J F6, Z7D7 F25:
 * forced elites the plan could not see). Null off the map.
 */
export function routeAhead(state: GameState): Record<string, JsonValue> | null {
  const map = asRecord(state.raw["map"]);
  const nodes = new Map<string, RouteNode>();
  for (const raw of asArray(map["nodes"]).map(asRecord)) {
    const row = Number(raw["row"]);
    const col = Number(raw["col"]);
    nodes.set(`${row},${col}`, { row, col, type: str(raw["node_type"], "Unknown"), children: asArray(raw["children"]).map(asRecord).map((child) => ({ row: Number(child["row"]), col: Number(child["col"]) })) });
  }
  const starts = asArray(map["available_nodes"]).map(asRecord).map((node) => nodes.get(`${Number(node["row"])},${Number(node["col"])}`)).filter((node): node is RouteNode => node !== undefined);
  if (starts.length === 0) return null;
  const floor = state.run?.floor ?? 0;
  const currentRow = asRecord(map["current_node"])["row"];
  const floorOf = (row: number) => floor + Math.max(1, typeof currentRow === "number" ? row - currentRow : row + 1);
  return routeFactsText(routeFacts(nodes, starts, floorOf));
}

/**
 * DeepSeek's reply as a validated plan. Card ids are checked against the game data, enums against the
 * vocabulary; on a re-plan (a `previous` plan of this run) a field left out keeps its value and every
 * intent change is checked against its trigger and the facts (plan-validator.ts). Every repair and
 * rejection is in `validator`.
 */
export function parseRunPlan(
  json: Record<string, unknown>,
  state: GameState,
  knowledge: Knowledge,
  trigger: RunPlanTrigger,
  previous: RunPlan | null = null,
  forcedRoute = false,
): RunPlan {
  const runId = str(state.raw["run_id"]);
  const prev = previous && previous.runId === runId ? normalizeRunPlan(previous) : null;
  const deck = deckEntries(state, knowledge);
  const notes: string[] = [];
  const byName = new Map<string, string>();
  for (const card of deck) {
    byName.set(card.card_id.toUpperCase(), card.card_id);
    byName.set(card.name, card.card_id);
  }
  // Any real card id for want/avoid (not only the deck's); deck ids or names for remove.
  const known = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const text = value.trim().replace(/\+$/, "");
    const id = byName.get(text.toUpperCase()) ?? byName.get(text) ?? text.toUpperCase().replace(/\s+/g, "_");
    return knowledge.card(id) ? id : null;
  };
  const inDeck = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const text = value.trim().replace(/\+$/, "");
    return byName.get(text.toUpperCase()) ?? byName.get(text) ?? null;
  };
  const has = (key: string) => json[key] !== undefined && json[key] !== null;
  const list = (key: string, pick: (entry: unknown) => string | null, max: number): string[] => {
    const entries = asArray(json[key] as JsonValue);
    const kept = [...new Set(entries.map(pick).filter((id): id is string => id !== null))];
    const dropped = entries.filter((entry) => pick(entry) === null);
    if (dropped.length > 0) notes.push(`${key}: dropped unknown ${dropped.map((entry) => JSON.stringify(entry)).join(", ")}`);
    // A cut is logged, not silent (N7KR v1/v2: "block" was the 5th need and vanished).
    if (kept.length > max) notes.push(`${key}: kept the first ${max} of ${kept.length}, cut ${kept.slice(max).join(", ")}`);
    return kept.slice(0, max);
  };
  const role = <T extends string>(roles: readonly T[]) => (entry: unknown): T | null => {
    const text = typeof entry === "string" ? entry.trim().toLowerCase() : "";
    return isOneOf(roles, text) ? text : null;
  };
  const enumOf = <T extends string>(key: string, values: readonly T[], legacy: Record<string, T> = {}, legacyKey?: string): T | undefined => {
    const value = typeof json[key] === "string" ? (json[key] as string).trim().toLowerCase() : undefined;
    if (value !== undefined) {
      if (isOneOf(values, value)) return value;
      notes.push(`${key}: unknown value ${JSON.stringify(json[key])} ignored`);
      return undefined;
    }
    const old = legacyKey && typeof json[legacyKey] === "string" ? legacy[(json[legacyKey] as string).trim().toLowerCase()] : undefined;
    return old;
  };

  const textField = <K extends "potionTempo" | "tempo">(key: string, field: K, kept: string | undefined): Partial<Pick<RunPlan, K>> => {
    const value = typeof json[key] === "string" ? truncate((json[key] as string).trim(), 240) : kept;
    return value ? ({ [field]: value } as Partial<Pick<RunPlan, K>>) : {};
  };
  // Intents: a field left out keeps the previous plan's value (a missing field is not a change).
  const base: RunPlan = prev ?? {
    runId, act: actOf(state), floor: state.run?.floor ?? 0, hpPct: hpFraction(state), trigger, archetype: "",
    want: [], avoid: [], remove: [], blockTarget: null, hpPolicy: "balanced", routeRisk: "normal", entryHp: null,
    reserve: [], needs: [], avoidRoles: [], bossPrep: "", summary: "", version: 0, changes: [], validator: [],
  };
  const avoidRaw = asArray(json["avoid"] as JsonValue);
  const avoidRoles = avoidRaw.map(role(CARD_ROLES)).filter((entry): entry is CardRole => entry !== null);
  const avoidIds = [...new Set(avoidRaw.filter((entry) => role(CARD_ROLES)(entry) === null).map(known).filter((id): id is string => id !== null))].slice(0, 6);
  const avoidUnknown = avoidRaw.filter((entry) => role(CARD_ROLES)(entry) === null && known(entry) === null);
  if (avoidUnknown.length > 0) notes.push(`avoid: dropped unknown ${avoidUnknown.map((entry) => JSON.stringify(entry)).join(", ")}`);
  const entryRaw = json["entry_hp_pct"];
  let entryHp = base.entryHp;
  if (typeof entryRaw === "number" && Number.isFinite(entryRaw)) {
    if (entryRaw > 0 && entryRaw <= 1) entryHp = Math.min(0.95, entryRaw);
    else notes.push(`entry_hp_pct: ${entryRaw} is not a fraction 0-1, ignored`);
  }
  const reasonsRaw = json["reasons"] && typeof json["reasons"] === "object" && !Array.isArray(json["reasons"]) ? (json["reasons"] as Record<string, unknown>) : null;
  const reasons: Partial<Record<ReasonField, IntentReason>> = reasonsRaw ? {} : { ...(base.reasons ?? {}) };
  if (reasonsRaw) {
    for (const [key, value] of Object.entries(reasonsRaw)) {
      const field = key.trim().toLowerCase();
      const parsed = parseReasons(value);
      if (isOneOf(REASON_FIELDS, field) && parsed.reasons[0]) reasons[field] = parsed.reasons[0];
      else notes.push(`reasons: dropped ${JSON.stringify(key)}: ${JSON.stringify(value)}`);
    }
  }
  const restLean = enumOf("rest_lean", REST_LEANS, { heal: "heal", smith: "smith", auto: "auto" }, "rest") ?? base.restLean;
  const reserveKey = has("reserve") ? "reserve" : "save_potions";
  const needsKey = has("needs") ? "needs" : "must_have";
  const proposal: RunPlan = {
    ...base,
    runId,
    act: actOf(state),
    floor: state.run?.floor ?? 0,
    hpPct: hpFraction(state),
    trigger,
    archetype: typeof json["archetype"] === "string" ? truncate(json["archetype"], 80) : base.archetype,
    want: has("want") ? list("want", known, 6) : base.want,
    avoid: has("avoid") ? avoidIds : base.avoid,
    avoidRoles: has("avoid") ? [...new Set(avoidRoles)] : base.avoidRoles,
    remove: has("remove") ? list("remove", inDeck, 3) : base.remove,
    blockTarget: typeof json["block_target"] === "number" && Number.isFinite(json["block_target"]) ? Math.max(0, Math.min(20, Math.round(json["block_target"]))) : base.blockTarget,
    hpPolicy: enumOf("hp_policy", HP_POLICIES, { heal: "preserve" }, "rest") ?? base.hpPolicy,
    routeRisk: enumOf("route_risk", ROUTE_RISKS, { avoid: "avoid_elites", seek: "seek_elites", normal: "normal" }, "elites") ?? base.routeRisk,
    entryHp,
    // Any number of roles (the old parser kept 2: half the potions of a dropped 3rd role were drunk).
    reserve: has(reserveKey) ? [...new Set(list(reserveKey, role(POTION_ROLES), 6) as PotionRole[])] : base.reserve,
    ...textField("potion_tempo", "potionTempo", base.potionTempo),
    ...textField("tempo", "tempo", base.tempo),
    ...(restLean ? { restLean } : {}),
    // Up to 5 roles (N7KR: the 4-role cut dropped "block", the 5th).
    needs: has(needsKey) ? (list(needsKey, role(CARD_ROLES), MAX_NEEDS) as CardRole[]) : base.needs,
    bossPrep: typeof json["boss_prep"] === "string" ? truncate(json["boss_prep"], 200) : base.bossPrep,
    summary: typeof json["summary"] === "string" ? truncate(json["summary"], 240) : base.summary,
    ...(Object.keys(reasons).length > 0 ? { reasons } : {}),
    version: base.version + 1,
    snapshot: snapshotOf(state, knowledge),
    changes: base.changes,
    validator: [],
  };
  let plan = proposal;
  if (prev) {
    const checked = validateChanges(prev, proposal, json["changes"], prev.snapshot ? sinceLastPlan(prev.snapshot, proposal.snapshot!, forcedRoute) : null);
    plan = checked.plan;
    notes.push(...checked.notes);
  }
  notes.push(...repairRunPlan(plan, { hpPct: hpFraction(state), toBoss: floorsToBoss(state.run?.floor ?? 0) }));
  // Judgment calls code does not repair: logged apart from the format repairs, as the fight plan's are.
  const eliteNote = avoidElitesDisagreement(plan, damageGap(state, knowledge), { hpPct: hpFraction(state), toBoss: floorsToBoss(state.run?.floor ?? 0) });
  plan.origins = originsAfter(prev, plan);
  plan.validator = notes.filter((note) => !note.startsWith(DISAGREE));
  const disagreements = [...notes.filter((note) => note.startsWith(DISAGREE)), ...(eliteNote ? [eliteNote] : [])];
  if (disagreements.length > 0) plan.disagreements = disagreements;
  else delete plan.disagreements;
  return plan;
}

/**
 * The origin of each field's value in a new plan version: kept from the previous version while the
 * value is unchanged (a re-plan that only rewrites the reason does not move it), else this version's
 * accepted change (or the first plan) with the reason given now.
 */
export function originsAfter(prev: RunPlan | null, plan: RunPlan): Partial<Record<OriginField, PolicyOrigin>> {
  const out: Partial<Record<OriginField, PolicyOrigin>> = {};
  for (const field of ["hp_policy", "route_risk"] as const) {
    const value = field === "hp_policy" ? plan.hpPolicy : plan.routeRisk;
    const before = prev ? (field === "hp_policy" ? prev.hpPolicy : prev.routeRisk) : null;
    const reason = plan.reasons?.[field] ?? null;
    if (prev && before === value) {
      const kept = originOf(prev, field);
      if (kept) out[field] = kept;
      continue;
    }
    const change = plan.changes.find((entry) => entry.version === plan.version && entry.field === field && entry.to === value);
    out[field] = { floor: plan.floor, version: plan.version, trigger: change?.trigger ?? "start", reason };
  }
  return out;
}

/**
 * A logged plan in the current shape: plans written before the intent vocabulary (elites, rest,
 * savePotions, mustHave) are read as route_risk, hp_policy, reserve and needs.
 */
export function normalizeRunPlan(raw: RunPlan | Record<string, unknown>): RunPlan {
  const plan = raw as Partial<RunPlan> & Record<string, unknown>;
  const legacyRisk: Record<string, RouteRisk> = { avoid: "avoid_elites", seek: "seek_elites", normal: "normal" };
  const hpPolicy = isOneOf(HP_POLICIES, plan.hpPolicy) ? plan.hpPolicy : plan["rest"] === "heal" ? "preserve" : "balanced";
  const routeRisk = isOneOf(ROUTE_RISKS, plan.routeRisk) ? plan.routeRisk : legacyRisk[String(plan["elites"] ?? "normal")] ?? "normal";
  return {
    runId: String(plan.runId ?? ""),
    act: Number(plan.act ?? 1),
    floor: Number(plan.floor ?? 0),
    hpPct: Number(plan.hpPct ?? 1),
    trigger: (plan.trigger ?? "start") as RunPlanTrigger,
    archetype: String(plan.archetype ?? ""),
    want: asArray(plan.want as JsonValue).map(String),
    avoid: asArray(plan.avoid as JsonValue).map(String),
    remove: asArray(plan.remove as JsonValue).map(String),
    blockTarget: typeof plan.blockTarget === "number" ? plan.blockTarget : null,
    hpPolicy,
    routeRisk,
    entryHp: typeof plan.entryHp === "number" ? plan.entryHp : null,
    reserve: asArray((plan.reserve ?? plan["savePotions"]) as JsonValue).filter((role): role is PotionRole => isOneOf(POTION_ROLES, role)),
    ...(typeof plan.potionTempo === "string" && plan.potionTempo ? { potionTempo: plan.potionTempo } : {}),
    ...(typeof plan.tempo === "string" && plan.tempo ? { tempo: plan.tempo } : {}),
    ...(isOneOf(REST_LEANS, plan.restLean) ? { restLean: plan.restLean } : isOneOf(REST_LEANS, plan["rest"]) ? { restLean: plan["rest"] as RestLean } : {}),
    needs: asArray((plan.needs ?? plan["mustHave"]) as JsonValue).filter((role): role is CardRole => isOneOf(CARD_ROLES, role)),
    avoidRoles: asArray(plan.avoidRoles as JsonValue).filter((role): role is CardRole => isOneOf(CARD_ROLES, role)),
    bossPrep: String(plan.bossPrep ?? ""),
    summary: String(plan.summary ?? ""),
    ...(plan.reasons && typeof plan.reasons === "object" ? { reasons: plan.reasons } : {}),
    ...(plan.origins && typeof plan.origins === "object" ? { origins: plan.origins } : {}),
    version: Number(plan.version ?? 1),
    ...(plan.snapshot ? { snapshot: plan.snapshot } : {}),
    changes: Array.isArray(plan.changes) ? plan.changes : [],
    validator: Array.isArray(plan.validator) ? plan.validator : [],
    ...(Array.isArray(plan.disagreements) && plan.disagreements.length > 0 ? { disagreements: plan.disagreements } : {}),
  };
}

/** The run plan of the run being played, or null (a plan of another run is not this run's strategy). */
export function currentRunPlan(memory: { runPlan?: RunPlan | null }, state: GameState): RunPlan | null {
  const plan = memory.runPlan;
  return plan && plan.runId === str(state.raw["run_id"]) ? plan : null;
}

/** Floors from this one to the act boss (17/33/48). */
export function floorsToBoss(floor: number): number {
  const boss = [17, 33, 48].find((bossFloor) => bossFloor >= floor) ?? floor;
  return boss - floor;
}

/** Whether a potion is one the run plan reserves for the act boss. */
export function planSavesPotion(plan: RunPlan | null | undefined, potionId: string, text: string): boolean {
  return isReserved(plan?.reserve, potionId, text);
}

/**
 * The fact of a card against DeepSeek's needed roles: "fills DeepSeek's need block (deck has 2 of
 * target 4)". It used to be a pick bonus (+14, +21 for block at low HP) on almost every candidate, since
 * needs was nearly always aoe/block/frontload/strength (A8: skips 37% -> 23%, act-1 bosses lost on
 * damage); now it is a fact next to the card's own value.
 */
export function mustHaveFact(plan: RunPlan | null | undefined, cardId: string, deckIds: string[]): string | null {
  const roles = plan?.needs ?? [];
  const mine = cardRoles(cardId);
  const filled = roles.filter((role) => mine.has(role));
  if (filled.length === 0) return null;
  return filled
    .map((role) => {
      const have = deckIds.filter((id) => cardRoles(id).has(role)).length;
      const target = role === "block" ? plan?.blockTarget ?? null : null;
      return `fills DeepSeek's need ${role} (deck has ${have}${target !== null ? ` of target ${target}` : ""})`;
    })
    .join("; ");
}

/** The run brief's plan line (Jev and DeepSeek see it on build and route questions): intents first. */
export function runPlanLine(plan: RunPlan | null | undefined, floor: number | null = null): string | null {
  if (!plan) return null;
  const intents = `hp_policy ${plan.hpPolicy}${plan.entryHp ? ` (boss entry ${Math.round(plan.entryHp * 100)}%)` : ""}, route_risk ${plan.routeRisk}${plan.reserve.length > 0 ? `, hold ${plan.reserve.join("/")} potions for the boss` : ""}${plan.restLean && plan.restLean !== "auto" ? `, rest lean ${plan.restLean}` : ""}${plan.needs.length > 0 ? `, needs ${plan.needs.join("/")}` : ""}`;
  const parts = [plan.archetype, plan.summary].filter(Boolean).join(" — ");
  const want = plan.want.length > 0 ? ` | want ${plan.want.join(", ")}` : "";
  const avoid = plan.avoid.length + plan.avoidRoles.length > 0 ? ` | avoid ${[...plan.avoid, ...plan.avoidRoles].join(", ")}` : "";
  const changed = recentChanges(plan, floor).map((change) => ` | changed at F${change.floor}: ${change.field} ${JSON.stringify(change.from)}→${JSON.stringify(change.to)} (${change.trigger})`).join("");
  return truncate(`${intents}. ${parts}${want}${avoid}${changed}`, 420);
}

/** DeepSeek's plan on one card (card rewards, shops, event adds): facts, not a score change. */
export function planCardFacts(plan: RunPlan | null | undefined, cardId: string, blockCards: number, isBlock: boolean, deckIds: string[] = []): string[] {
  if (!plan) return [];
  const facts: string[] = [];
  const wanted = plan.want.indexOf(cardId);
  if (wanted >= 0) facts.push(`DeepSeek plan wants this card (want #${wanted + 1})`);
  if (plan.avoid.includes(cardId)) facts.push("DeepSeek plan lists this card under avoid");
  else {
    const role = (plan.avoidRoles ?? []).find((entry) => cardRoles(cardId).has(entry));
    if (role && wanted < 0) facts.push(`DeepSeek plan lists ${role} cards under avoid`);
  }
  const must = mustHaveFact(plan, cardId, deckIds);
  if (must) facts.push(must);
  else if (isBlock && plan.blockTarget !== null && blockCards < plan.blockTarget) facts.push(`block cards ${blockCards} of DeepSeek's target ${plan.blockTarget}`);
  return facts;
}

export function logRunPlan(file: string, entry: Record<string, JsonValue>): void {
  if (!file) return;
  try {
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`, "utf8");
  } catch {
    // logging must never break play
  }
}

/** The last logged plan of this run (a restart keeps it), else null. */
export function loadRunPlan(file: string, runId: string): RunPlan | null {
  if (!file || !existsSync(file)) return null;
  try {
    const size = statSync(file).size;
    const length = Math.min(size, 256 * 1024);
    const buffer = Buffer.alloc(length);
    const fd = openSync(file, "r");
    try {
      readSync(fd, buffer, 0, length, size - length);
    } finally {
      closeSync(fd);
    }
    for (const line of buffer.toString("utf8").split("\n").reverse()) {
      if (!line.includes(runId)) continue;
      try {
        const entry = JSON.parse(line) as { plan?: RunPlan };
        if (entry.plan && entry.plan.runId === runId) return normalizeRunPlan(entry.plan);
      } catch {
        // a torn first line
      }
    }
  } catch {
    return null;
  }
  return null;
}
