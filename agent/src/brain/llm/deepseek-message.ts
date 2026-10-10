/**
 * The user message DeepSeek gets, laid out for its prefix cache (Roy 2026-09-28).
 *
 * DeepSeek bills the longest byte-identical prefix a previous request already had as a cache hit. The
 * system prompt is static; the user message then starts with the run memory in its own order (the act
 * block, the append-only history, then the volatile sections: see run-journal.ts), and only after it the
 * question-specific parts (state, question, options; or a task and its input). Two questions in one run
 * therefore share the system prompt, the act block and the whole history of the earlier one.
 *
 * The state is also cleared of copies: a DeepSeek-decided question carries `facts` (build-facts.ts), the
 * one complete copy of the deck, relics, potions, HP, gold, deck profile and run plan; the Jev-era
 * `run_brief`, `deck_stats`, `deck` text and `deck_needs` that repeat them are dropped from DeepSeek's view.
 */

import type { JsonValue } from "../../core/util/json.js";

type Json = Record<string, JsonValue>;

/** run_brief keys that `facts` repeats (hp, deck stats, relics with their effects, potions, run plan). */
const BRIEF_COVERED = ["act", "floor", "hp", "gold", "ascension", "deck", "relics", "relic_effects", "relic_effects_note", "potions"] as const;

function isObject(value: JsonValue | undefined): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * DeepSeek's view of a question's state: when it carries `facts`, the other copies of the same facts are
 * removed (only true duplicates; what `facts` does not hold stays). Without `facts` it is unchanged.
 */
export function deepseekState(state: Json): Json {
  const facts = state["facts"];
  if (!isObject(facts) || !Array.isArray(facts["deck"])) return state;
  const out: Json = { ...state };
  const brief = out["run_brief"];
  if (isObject(brief)) {
    const kept: Json = { ...brief };
    for (const key of BRIEF_COVERED) delete kept[key];
    if (Array.isArray(kept["notes"]) && kept["notes"].length === 0) delete kept["notes"];
    if (kept["run_plan"] !== undefined && isObject(facts["your_run_plan"])) delete kept["run_plan"];
    if (Object.keys(kept).length > 0) out["run_brief"] = kept;
    else delete out["run_brief"];
    // The deck summary string ("29 cards | 18 attacks / …") is in facts.deck_profile.
    if (out["deck_stats"] === brief["deck"] && typeof facts["deck_profile"] === "string") delete out["deck_stats"];
  }
  // The screen's situation repeats HP, gold, floor, act and the screen's own facts (rest site, selection):
  // a key is kept only where its value differs from the same key in facts (top level or one level down).
  const situation = out["situation"];
  if (isObject(situation)) {
    const kept: Json = { ...situation };
    const factValues = (key: string): JsonValue[] => [facts[key], ...Object.values(facts).filter(isObject).map((nested) => nested[key])].filter((value): value is JsonValue => value !== undefined);
    for (const key of Object.keys(kept)) {
      if (key === "screen") continue;
      const value = kept[key]!;
      const same = factValues(key).some((fact) => (typeof value === "object" ? JSON.stringify(fact) === JSON.stringify(value) : String(fact) === String(value)));
      if (same) delete kept[key];
    }
    // hp_percent is the percentage facts.hp already shows ("10/80 (13%)").
    if (typeof kept["hp_percent"] === "number" && typeof facts["hp"] === "string" && facts["hp"].endsWith(`(${kept["hp_percent"]}%)`)) delete kept["hp_percent"];
    out["situation"] = kept;
  }
  // A block that facts repeats whole (route re-plan reason, shop stock), or field by field (event title).
  if (out["stock"] !== undefined && JSON.stringify(out["stock"]) === JSON.stringify(facts["shop_stock"])) delete out["stock"];
  for (const key of Object.keys(out)) {
    if (key === "facts" || facts[key] === undefined) continue;
    const value = out[key]!;
    const fact = facts[key]!;
    if (JSON.stringify(value) === JSON.stringify(fact)) {
      delete out[key];
    } else if (isObject(value) && isObject(fact)) {
      out[key] = Object.fromEntries(Object.entries(value).filter(([inner, v]) => JSON.stringify(v) !== JSON.stringify(fact[inner])));
    }
  }
  // The card-by-card deck text: facts.deck has every card with the same text (and its id).
  if (typeof out["deck"] === "string") delete out["deck"];
  // deck_needs (act boss, deck size, code's AOE/draw/scaling/damage/block counts): facts.act_boss and deck_profile hold
  // the facts; the role counts are code's heuristics and stay out (V4 M2: the reward screen no longer sends them).
  if (isObject(out["deck_needs"]) && typeof facts["deck_profile"] === "string" && typeof facts["act_boss"] === "string") delete out["deck_needs"];
  return out;
}

/** The memory sections that have content, in their own (cache) order. */
function compactMemory(memory: JsonValue | undefined): JsonValue | undefined {
  if (!isObject(memory)) return memory;
  return Object.fromEntries(Object.entries(memory).filter(([, value]) => value !== "" && value !== null));
}

/** The user message of an option choice: memory first (cache order), then state, question, options. */
export function choiceMessage(state: Json, instructions: string, criteria: Record<string, string | null>, memory: JsonValue | undefined): string {
  const mem = compactMemory(memory);
  return JSON.stringify({ ...(mem === undefined ? {} : { memory: mem }), state: deepseekState(state), question: instructions, options: criteria });
}

/** The user message of a free-form task (run plan, fight plan): memory first, then the rest as given. */
export function taskMessage(payload: Json): string {
  if (!("memory" in payload)) return JSON.stringify(payload);
  const { memory, ...rest } = payload;
  return JSON.stringify({ memory: compactMemory(memory) ?? null, ...rest });
}
