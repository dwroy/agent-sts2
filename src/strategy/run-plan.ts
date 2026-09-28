/**
 * Run plan (RUN_PLAN=v1, migration step M3): DeepSeek sets the run's strategy at a few checkpoints —
 * the start of the run, the start of each act, after a heavy HP loss, and at most every
 * RUN_PLAN_REVIEW_FLOORS floors — and code turns it into weights on the build and route decisions.
 * It is strategy only: which cards to look for, avoid or remove, how many block cards the deck needs,
 * how hungry for elites to be, heal or smith at rest sites, what to prepare for the act boss. Card
 * play stays with the turn solver and Jev (Dai: "只是打法建议，出牌还是交给 jev 判断").
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
import { bossClockJson } from "./boss-clock.js";
import { asArray, asRecord, str, truncate, type JsonValue } from "../util/json.js";

export type RunPlanTrigger = "start" | "act" | "hp_drop" | "review";
export type EliteAppetite = "seek" | "normal" | "avoid";
export type RestPolicy = "heal" | "smith" | "auto";

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
  /** card_id: do not take these. */
  avoid: string[];
  /** card_id: remove these first (shop removal, events). */
  remove: string[];
  /** Block cards the deck should hold by the act boss. */
  blockTarget: number | null;
  elites: EliteAppetite;
  rest: RestPolicy;
  bossPrep: string;
  summary: string;
}

/** A plan older than this many floors is reviewed at the next map. */
export const RUN_PLAN_REVIEW_FLOORS = 8;
/** HP lost since the plan (fraction of max HP) that asks for a new one. */
export const RUN_PLAN_HP_DROP = 0.3;
/** Below this HP fraction a plan made above it is renewed. */
export const RUN_PLAN_LOW_HP = 0.4;

/** Card-value bonus for planned cards, malus for avoided ones. */
// 12 was too weak: 4UWK F15 Body Slam, the plan's first want, lost 86 to 73 to Thrash.
export const RUN_PLAN_WANT_BONUS = 20;
export const RUN_PLAN_AVOID_MALUS = 15;

export function actOf(state: GameState): number {
  const raw = str(asRecord(state.run?.raw)["act_id"]);
  return /^\d+$/.test(raw) ? Number(raw) + 1 : 1;
}

export function hpFraction(state: GameState): number {
  const hp = state.run?.current_hp ?? null;
  const maxHp = state.run?.max_hp ?? null;
  return hp !== null && maxHp !== null && maxHp > 0 ? hp / maxHp : 1;
}

/** Why a new plan is due at this map screen, or null. */
export function runPlanTrigger(plan: RunPlan | null | undefined, state: GameState): RunPlanTrigger | null {
  const runId = str(state.raw["run_id"]);
  if (!plan || plan.runId !== runId) return "start";
  const act = actOf(state);
  if (act !== plan.act) return "act";
  const hp = hpFraction(state);
  if (plan.hpPct - hp >= RUN_PLAN_HP_DROP || (hp < RUN_PLAN_LOW_HP && plan.hpPct >= RUN_PLAN_LOW_HP)) return "hp_drop";
  if ((state.run?.floor ?? 0) - plan.floor >= RUN_PLAN_REVIEW_FLOORS) return "review";
  return null;
}

export const RUN_PLAN_TASK = [
  "TASK: run plan (not an option choice; ignore the {choice, reason} reply format for this one).",
  "You set the STRATEGY for the rest of this act and run; code and a small model will apply it to card rewards, shops,",
  "removals, map routes and rest sites, and will play every card themselves. Look at the deck, relics, HP, gold, potions,",
  "the act boss and the map ahead (memory.lookahead). Name what this deck needs to beat the act boss and survive the act.",
  "act_boss_clock gives the boss's HP, the turns the fight can last, the damage a turn that needs, and code's rough",
  "estimate of this deck's damage a turn (Strength counted). If gap_per_turn > 0, closing it comes first: want Strength/scaling",
  "and high-damage cards (AoE for two-part bosses), remove Strikes/Defends that dilute them, smith attacks; state the gap in the summary.",
  'Reply with JSON only: {"archetype": "<the deck direction, max 12 words>",',
  '"want": [card ids to pick when offered, most important first, max 6],',
  '"avoid": [card ids not to take, max 6], "remove": [card ids in the deck to remove first, max 3],',
  '"block_target": <number of block cards the deck should hold by the act boss>,',
  '"elites": "seek" | "normal" | "avoid", "rest": "heal" | "smith" | "auto",',
  '"boss_prep": "<max 30 words: what to have ready for the act boss>",',
  '"summary": "<max 40 words: the plan in plain words>"}',
].join(" ");

/** What DeepSeek is shown: the deck grouped, relics, potions, HP/gold, act boss and the trigger. */
export function runPlanInput(state: GameState, knowledge: Knowledge, trigger: RunPlanTrigger, deckLines: string[], relics: string[], potions: string[]): Record<string, JsonValue> {
  const raw = asRecord(state.run?.raw);
  return {
    trigger,
    act: actOf(state),
    floor: state.run?.floor ?? null,
    ascension: state.run?.ascension ?? 0,
    hp: `${state.run?.current_hp ?? "?"}/${state.run?.max_hp ?? "?"}`,
    gold: state.run?.gold ?? null,
    act_boss: str(raw["boss_id"]),
    act_boss_clock: bossClockJson(state, knowledge),
    deck_size: deckEntries(state, knowledge).length,
    deck: deckLines,
    relics,
    potions,
  };
}

export function parseRunPlan(json: Record<string, unknown>, state: GameState, knowledge: Knowledge, trigger: RunPlanTrigger): RunPlan {
  const deck = deckEntries(state, knowledge);
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
  const ids = (value: unknown, pick: (entry: unknown) => string | null, max: number) =>
    [...new Set(asArray(value as JsonValue).map(pick).filter((id): id is string => id !== null))].slice(0, max);
  const elites = typeof json["elites"] === "string" && ["seek", "normal", "avoid"].includes(json["elites"]) ? (json["elites"] as EliteAppetite) : "normal";
  const rest = typeof json["rest"] === "string" && ["heal", "smith", "auto"].includes(json["rest"]) ? (json["rest"] as RestPolicy) : "auto";
  const blockTarget = typeof json["block_target"] === "number" && Number.isFinite(json["block_target"]) ? Math.max(0, Math.min(20, Math.round(json["block_target"]))) : null;
  return {
    runId: str(state.raw["run_id"]),
    act: actOf(state),
    floor: state.run?.floor ?? 0,
    hpPct: hpFraction(state),
    trigger,
    archetype: typeof json["archetype"] === "string" ? truncate(json["archetype"], 80) : "",
    want: ids(json["want"], known, 6),
    avoid: ids(json["avoid"], known, 6),
    remove: ids(json["remove"], inDeck, 3),
    blockTarget,
    elites,
    rest,
    bossPrep: typeof json["boss_prep"] === "string" ? truncate(json["boss_prep"], 200) : "",
    summary: typeof json["summary"] === "string" ? truncate(json["summary"], 240) : "",
  };
}

/** One line for the run brief (Jev and DeepSeek see it on build and route questions). */
export function runPlanLine(plan: RunPlan | null | undefined): string | null {
  if (!plan) return null;
  const parts = [plan.archetype, plan.summary].filter(Boolean).join(" — ");
  const want = plan.want.length > 0 ? ` | want ${plan.want.join(", ")}` : "";
  const avoid = plan.avoid.length > 0 ? ` | avoid ${plan.avoid.join(", ")}` : "";
  return truncate(`${parts}${want}${avoid}`, 300);
}

/** Card-value adjustment from the plan (card rewards, shops). */
export function runPlanCardBonus(plan: RunPlan | null | undefined, cardId: string, blockCards: number, isBlock: boolean): { bonus: number; why: string | null } {
  if (!plan) return { bonus: 0, why: null };
  if (plan.avoid.includes(cardId)) return { bonus: -RUN_PLAN_AVOID_MALUS, why: "run plan: avoid" };
  let bonus = 0;
  const why: string[] = [];
  if (plan.want.includes(cardId)) {
    bonus += RUN_PLAN_WANT_BONUS;
    why.push("run plan: wanted");
  }
  if (isBlock && plan.blockTarget !== null && blockCards < plan.blockTarget) {
    bonus += 6;
    why.push(`run plan: block ${blockCards}/${plan.blockTarget}`);
  }
  return { bonus, why: why.length > 0 ? why.join("; ") : null };
}

/** Route weight change for an elite node. */
export function runPlanEliteShift(plan: RunPlan | null | undefined, hpPct: number): number {
  if (!plan) return 0;
  if (plan.elites === "avoid") return -3;
  if (plan.elites === "seek" && hpPct > 0.6) return 2;
  return 0;
}

/** Rest-site score change for HEAL / SMITH. */
export function runPlanRestShift(plan: RunPlan | null | undefined, option: string, hpPct: number, beforeBoss: boolean): number {
  if (!plan || plan.rest === "auto") return 0;
  if (plan.rest === "heal" && option === "HEAL") return 3;
  // Smithing never overrides a low-HP heal or the pre-boss heal.
  if (plan.rest === "smith" && option === "SMITH" && hpPct >= 0.5 && !beforeBoss) return 3;
  return 0;
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
        if (entry.plan && entry.plan.runId === runId) return entry.plan;
      } catch {
        // a torn first line
      }
    }
  } catch {
    return null;
  }
  return null;
}
