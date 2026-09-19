/**
 * The Run Brief (PLAN.md §7.2): the only cross-decision memory, kept short and curated in code.
 *
 * Jev is stateless and its accuracy falls when the state carries unrelated detail, so long-horizon
 * intent is compressed into ~150 tokens that ride along with every question.
 */

import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../mod/schema.js";
import { asRecord, numOrNull, truncate, type JsonValue } from "../util/json.js";
import { deckEntries, deckStats, describeRunPotions, describeRunRelics, summarizeDeck, type DeckStats } from "./deck.js";

export interface RunBrief {
  character: string | null;
  act: string | null;
  floor: number | null;
  hp: string;
  gold: number | null;
  ascension: number;
  deck: string;
  relics: string[];
  potions: string[];
  notes: string[];
}

const MAX_NOTES = 8;

export function buildRunBrief(state: GameState, knowledge: Knowledge, previousNotes: string[] = []): RunBrief {
  const entries = deckEntries(state, knowledge);
  const stats: DeckStats = deckStats(entries);
  const run = asRecord(state.run?.raw);
  const hp = state.run?.current_hp ?? null;
  const maxHp = state.run?.max_hp ?? null;
  const hpPct = hp !== null && maxHp !== null && maxHp > 0 ? Math.round((hp / maxHp) * 100) : null;

  return {
    character: state.run?.character_name ?? null,
    act: state.run?.act_id ?? null,
    floor: state.run?.floor ?? null,
    hp: hp === null ? "unknown" : `${hp}/${maxHp ?? "?"}${hpPct === null ? "" : ` (${hpPct}%)`}`,
    gold: state.run?.gold ?? numOrNull(run["gold"]),
    ascension: state.run?.ascension ?? 0,
    deck: summarizeDeck(stats),
    relics: describeRunRelics(state, knowledge),
    potions: describeRunPotions(state, knowledge),
    notes: previousNotes.slice(-MAX_NOTES),
  };
}

export function addNote(brief: RunBrief, note: string): RunBrief {
  const trimmed = truncate(note, 120);
  if (brief.notes.includes(trimmed)) return brief;
  return { ...brief, notes: [...brief.notes, trimmed].slice(-MAX_NOTES) };
}

/** The object injected into every decision payload. */
export function briefJson(brief: RunBrief): Record<string, JsonValue> {
  return {
    character: brief.character,
    act: brief.act,
    floor: brief.floor,
    hp: brief.hp,
    gold: brief.gold,
    ascension: brief.ascension,
    deck: brief.deck,
    relics: brief.relics,
    potions: brief.potions,
    notes: brief.notes,
  };
}
