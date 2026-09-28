/**
 * Fight plan (FIGHT_PLAN=v1, migration steps M2+M3 of paper/materials/architecture-review): DeepSeek
 * is asked once at the start of an elite or boss fight for the plan of the whole fight (approach, the
 * cards to set up early, which enemy to kill first, what each potion is for). It no longer answers
 * per-turn plan choices: those are code's (the turn solver) and Jev's, which look one turn ahead.
 *
 * Why: per-turn escalations cost 20–70 s each (a boss fight could spend minutes thinking), and on
 * the per-turn choice DeepSeek did no better than Jev (extra HP over the min-loss line: Jev 2.59,
 * DeepSeek 3.12; analysis/layer_attribution.py). What neither the solver nor Jev can see is the
 * multi-turn shape of the fight, which is what DeepSeek is asked for here.
 *
 * The plan reaches play three ways: fact tags on Jev's options ("plays the planned setup card"),
 * potion costs in the solver (a potion the plan saves costs more, one it plans early is free), and a
 * setup line within the HP-guard slack of code's pick turns a code-decided turn into a Jev question.
 */

import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readSync, statSync } from "node:fs";
import { dirname } from "node:path";

import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../mod/schema.js";
import { deckEntries, describeRunRelicEffects } from "../project/deck.js";
import { bossNote } from "../project/run-journal.js";
import { asArray, asRecord, bool, num, numOrNull, str, truncate, type JsonValue } from "../util/json.js";
import { fillPotionText } from "../knowledge/potion-values.js";

export type FightApproach = "race" | "setup" | "defend";
export type PotionUse = "early" | "big_hit" | "emergency" | "save" | "any";

const APPROACHES: FightApproach[] = ["race", "setup", "defend"];
const POTION_USES: PotionUse[] = ["early", "big_hit", "emergency", "save", "any"];

export interface FightPlan {
  runId: string;
  /** act:floor, the same key the HP guard uses. */
  fight: string;
  kind: string;
  enemyIds: string[];
  approach: FightApproach;
  /** card_id of the cards to play in the first turns. */
  setup: string[];
  /** enemy_id to kill first; null when it does not matter. */
  focus: string | null;
  /** potion_id -> what it is for in this fight. */
  potions: Record<string, PotionUse>;
  keyTurns: string;
  summary: string;
  /** How many times this fight was re-planned (a new boss/elite enemy appeared). */
  replans: number;
}

/** Enemy ids of the living enemies. */
export function livingEnemyIds(state: GameState): string[] {
  return asArray(asRecord(state.raw["combat"])["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .map((enemy) => str(enemy["enemy_id"]))
    .filter(Boolean);
}

export function fightKey(state: GameState): string {
  return `${str(asRecord(state.run?.raw)["act_id"])}:${state.run?.floor ?? "?"}`;
}

/** Move-model summary of one enemy: each move's average hit and what usually follows it. */
function moveSummary(model: Record<string, { next: Record<string, Record<string, number>>; damage: Record<string, number>; buffs?: string[] }>, enemyId: string): string | null {
  const entry = model[enemyId];
  if (!entry) return null;
  const parts = Object.entries(entry.damage).map(([move, damage]) => {
    const next = Object.entries(entry.next[move] ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
    const buff = entry.buffs?.includes(move) ? " buff" : "";
    return `${move.replace(/_MOVE$/, "")} ${Math.round(damage)}${buff}${next ? ` -> ${next.replace(/_MOVE$/, "")}` : ""}`;
  });
  return parts.length > 0 ? truncate(parts.join("; "), 240) : null;
}

/**
 * What DeepSeek is shown for the plan: the whole deck (the plan is about which cards to set up), the
 * relics, the potions by id, and each enemy with its current intent, powers and learned move cycle.
 */
export function fightPlanInput(
  state: GameState,
  knowledge: Knowledge,
  kind: string,
  moveModel: Record<string, { next: Record<string, Record<string, number>>; damage: Record<string, number>; buffs?: string[] }>,
): Record<string, JsonValue> {
  const deck = new Map<string, { line: string; count: number }>();
  for (const card of deckEntries(state, knowledge)) {
    // Grouped only when byte-identical: copies of one card can differ (enchanted Twin Strike 7×2 vs 5×2).
    const line = `${card.card_id}${card.upgraded ? "+" : ""} ${card.name} (${card.type}, ${card.cost ?? "?"} energy): ${card.description}`;
    const seen = deck.get(line);
    if (seen) seen.count += 1;
    else deck.set(line, { line, count: 1 });
  }
  const raw = asRecord(state.run?.raw);
  const hp = state.run?.current_hp ?? null;
  const maxHp = state.run?.max_hp ?? null;
  const actRaw = str(raw["act_id"]);
  const enemies = asArray(asRecord(state.raw["combat"])["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .map((enemy) => {
      const id = str(enemy["enemy_id"]);
      const info = knowledge.monster(id);
      const intents = asArray(enemy["intents"])
        .map(asRecord)
        .map((intent) => `${str(intent["intent_type"])} ${str(intent["label"])}`.trim())
        .join(", ");
      const powers = asArray(enemy["powers"])
        .map(asRecord)
        .map((power) => `${str(power["power_id"])}${numOrNull(power["amount"]) === null ? "" : ` ${numOrNull(power["amount"])}`}`);
      const out: Record<string, JsonValue> = {
        enemy_id: id,
        name: str(enemy["name"], info?.name ?? id),
        type: info?.type ?? "",
        hp: `${num(enemy["current_hp"])}/${num(enemy["max_hp"])}`,
        intent_now: intents || "unknown",
        powers,
      };
      const moves = moveSummary(moveModel, id);
      if (moves) out["moves_seen"] = moves;
      const note = info?.type === "Boss" ? bossNote(id) : null;
      if (note) out["boss_note"] = note;
      return out;
    });
  const potions = asArray(raw["potions"])
    .map(asRecord)
    .filter((potion) => bool(potion["occupied"]))
    .map((potion) => {
      const id = str(potion["potion_id"]);
      return `${id} ${str(potion["name"], knowledge.potion(id)?.name ?? id)}: ${truncate(fillPotionText(id, str(potion["description"]) || knowledge.potion(id)?.description || ""), 100)}`;
    });
  return {
    fight: kind,
    act: /^\d+$/.test(actRaw) ? Number(actRaw) + 1 : actRaw,
    floor: state.run?.floor ?? null,
    ascension: state.run?.ascension ?? 0,
    hp: `${hp ?? "?"}/${maxHp ?? "?"}`,
    deck: [...deck.values()].map((entry) => (entry.count > 1 ? `${entry.count}x ${entry.line}` : entry.line)),
    relics: describeRunRelicEffects(state, knowledge, 20),
    potions,
    enemies,
  };
}

export const FIGHT_PLAN_TASK = [
  "TASK: fight plan (not an option choice; ignore the {choice, reason} reply format for this one).",
  "An elite or boss fight is starting. Every turn will be played by code (an exact one-turn solver) and a small model;",
  "both only see the current turn. Give them the plan for the WHOLE fight: the things one-turn play misses",
  "(when to set up powers vs. race, which enemy to kill first, which potion is for which moment, the turns to fear).",
  "Use the enemies' move cycles and your knowledge of this fight. Keep HP: the run continues after this fight.",
  'Reply with JSON only: {"approach": "race" | "setup" | "defend",',
  '"setup_cards": [card ids from the deck to play in the first turns, most important first, max 3; [] for none],',
  '"focus_enemy": "<enemy_id to kill first, or empty>",',
  '"potions": {"<potion id>": "early" | "big_hit" | "emergency" | "save" | "any"} for EVERY potion listed',
  "(early = drink in turns 1-2; big_hit = drink on the turn of a big attack; emergency = only if HP gets low;",
  "save = keep for a later fight; any = no preference),",
  '"key_turns": "<max 30 words: the dangerous turns and what to do on them>",',
  '"summary": "<max 40 words: the plan in plain words>"}',
].join(" ");

/** Validates DeepSeek's answer against the board: unknown cards, enemies and potions are dropped. */
export function parseFightPlan(
  json: Record<string, unknown>,
  state: GameState,
  knowledge: Knowledge,
  base: { runId: string; fight: string; kind: string; replans: number },
): FightPlan {
  const deck = deckEntries(state, knowledge);
  const byName = new Map<string, string>();
  for (const card of deck) {
    byName.set(card.card_id.toUpperCase(), card.card_id);
    byName.set(card.name, card.card_id);
  }
  const toCardId = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const text = value.trim().replace(/\+$/, "");
    return byName.get(text.toUpperCase()) ?? byName.get(text) ?? null;
  };
  const setup = [...new Set(asArray(json["setup_cards"] as JsonValue).map(toCardId).filter((id): id is string => id !== null))].slice(0, 3);
  const enemies = asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
  const focusRaw = typeof json["focus_enemy"] === "string" ? json["focus_enemy"].trim() : "";
  const focusEnemy = enemies.find((enemy) => str(enemy["enemy_id"]) === focusRaw || str(enemy["name"]) === focusRaw);
  const belt = asArray(asRecord(state.run?.raw)["potions"])
    .map(asRecord)
    .filter((potion) => bool(potion["occupied"]));
  const potions: Record<string, PotionUse> = {};
  for (const [key, value] of Object.entries(asRecord(json["potions"] as JsonValue))) {
    const use = typeof value === "string" ? (value.trim().toLowerCase() as PotionUse) : null;
    if (!use || !POTION_USES.includes(use)) continue;
    const potion = belt.find((entry) => str(entry["potion_id"]) === key.trim() || str(entry["name"]) === key.trim());
    if (potion) potions[str(potion["potion_id"])] = use;
  }
  const approachRaw = typeof json["approach"] === "string" ? (json["approach"].trim().toLowerCase() as FightApproach) : "race";
  return {
    ...base,
    enemyIds: livingEnemyIds(state),
    approach: APPROACHES.includes(approachRaw) ? approachRaw : "race",
    setup,
    // No kill-first target among enemies that must die together (Decimillipede segments reattach,
    // Kaiser Crab claws enrage): 4VC5 F24, GGF8 F33.
    focus: focusEnemy && !mustDieTogether(focusEnemy) ? str(focusEnemy["enemy_id"]) : null,
    potions,
    keyTurns: typeof json["key_turns"] === "string" ? truncate(json["key_turns"], 200) : "",
    summary: typeof json["summary"] === "string" ? truncate(json["summary"], 240) : "",
  };
}

/**
 * A boss- or elite-type enemy not in the plan (a phase, a summoned elite): worth one re-plan. Minions
 * and normal monsters joining the fight are not.
 */
export function needsReplan(plan: FightPlan, state: GameState, knowledge: Knowledge): boolean {
  if (plan.replans >= 1) return false;
  return livingEnemyIds(state).some((id) => {
    if (plan.enemyIds.includes(id)) return false;
    const type = knowledge.monster(id)?.type ?? "";
    return type === "Boss" || type === "Elite";
  });
}

/** What Jev (and the decision log) see of the plan. */
export function fightPlanJson(plan: FightPlan): Record<string, JsonValue> {
  return {
    approach: plan.approach,
    setup_first: plan.setup,
    kill_first: plan.focus ?? "",
    potions: plan.potions,
    dangerous_turns: plan.keyTurns,
    summary: plan.summary,
  };
}

/** Whether an unmodelled potion should be offered to Jev this turn, per the plan (null = default rule). */
export function planOffersPotion(plan: FightPlan | null, potionId: string, ctx: { turn: number; bigHit: boolean; pressed: boolean; costly: boolean; offensive?: boolean }): boolean | null {
  const use = plan?.potions[potionId];
  if (!use || use === "any") return null;
  // "big_hit" on an attack potion is the plan's burst, not the enemy's big hit: the default rule offers
  // it (24HM F33: Attack Potion tagged big_hit, offered on no turn in 14, died holding it).
  if (use === "big_hit" && ctx.offensive) return null;
  if (ctx.pressed) return true;
  // A costly turn does not unlock a potion the plan keeps for a later fight or for the big hit (J8E4
  // F17 T2: Shackling Potion, kept for the Pressure Gun, drunk on a 15 Stomp).
  if (ctx.costly && use !== "save" && use !== "big_hit") return true;
  if (use === "early") return ctx.turn <= 2 ? true : null;
  if (use === "big_hit") return ctx.bigHit;
  return false;
}

/** Plan-fit tag of one option for Jev: which planned setup cards it plays, the focus damage, potions against the plan. */
export function planFit(
  plan: FightPlan,
  steps: { cardId: string; name: string }[],
  focusDamage: number | null,
): string {
  const parts: string[] = [];
  const setup = steps.filter((step) => plan.setup.includes(step.cardId)).map((step) => step.name);
  if (setup.length > 0) parts.push(`plays planned setup ${setup.join(", ")}`);
  if (plan.focus && focusDamage !== null && focusDamage > 0) parts.push(`${focusDamage} damage to the kill-first enemy`);
  const drinks = steps.filter((step) => step.cardId.startsWith("POTION:"));
  for (const step of drinks) {
    // Modelled potions are "POTION:<potion id>:<slot>".
    const use = plan.potions[step.cardId.split(":")[1] ?? ""];
    if (use === "save" || use === "emergency") parts.push(`drinks ${step.name.replace(/^potion /, "")} the plan keeps for ${use === "save" ? "a later fight" : "an emergency"}`);
  }
  return parts.length > 0 ? parts.join("; ") : "neutral";
}

/** Appends one plan (or a failed attempt) to the fight-plan log. Never throws. */
export function logFightPlan(file: string, entry: Record<string, JsonValue>): void {
  if (!file) return;
  try {
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`, "utf8");
  } catch {
    // logging must never break play
  }
}

/** The last logged plan for this run and fight (a restart mid-fight keeps its plan), else null. */
export function loadFightPlan(file: string, runId: string, fight: string): FightPlan | null {
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
    const lines = buffer.toString("utf8").split("\n").reverse();
    for (const line of lines) {
      if (!line.includes(runId) || !line.includes(`"${fight}"`)) continue;
      try {
        const entry = JSON.parse(line) as { plan?: FightPlan };
        if (entry.plan && entry.plan.runId === runId && entry.plan.fight === fight) return entry.plan;
      } catch {
        // a torn first line
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** An enemy that must die in the same turn as its partners (a lone kill brings it back or enrages the rest). */
function mustDieTogether(enemy: Record<string, unknown>): boolean {
  return asArray(enemy["powers"] as JsonValue).some((power) => /REATTACH_POWER|CRAB_RAGE_POWER/.test(str(asRecord(power)["power_id"])));
}
