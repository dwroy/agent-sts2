/**
 * The Run Brief (PLAN.md §7.2): the only cross-decision memory, kept short and curated in code.
 *
 * Jev is stateless and its accuracy falls when the state carries unrelated detail, so long-horizon
 * intent is compressed into ~150 tokens that ride along with every question.
 */

import type { Knowledge } from "../knowledge/index.js";
import { UNKNOWN_VALUE } from "../knowledge/potion-values.js";
import { fillRelicText } from "../knowledge/relic-values.js";
import type { GameState } from "../hand/mod/schema.js";
import { asArray, asRecord, numOrNull, str, truncate, type JsonValue } from "../core/util/json.js";
import {
  deckEntries,
  deckStats,
  describeRunPotions,
  describeRunRelicEffects,
  describeRunRelics,
  summarizeDeck,
  type DeckStats,
} from "./deck.js";

export interface RunBrief {
  character: string | null;
  act: string | null;
  floor: number | null;
  hp: string;
  gold: number | null;
  ascension: number;
  deck: string;
  relics: string[];
  relic_effects: string[];
  potions: string[];
  notes: string[];
  /** The run plan's one-line strategy (RUN_PLAN=v1), when there is one. */
  plan?: string;
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
    // act_id counts from 0; the models read it as the act number (W6F4: "act 1" at F31).
    act: state.run?.act_id != null && /^\d+$/.test(state.run.act_id) ? String(Number(state.run.act_id) + 1) : (state.run?.act_id ?? null),
    floor: state.run?.floor ?? null,
    hp: hp === null ? "unknown" : `${hp}/${maxHp ?? "?"}${hpPct === null ? "" : ` (${hpPct}%)`}`,
    gold: state.run?.gold ?? numOrNull(run["gold"]),
    ascension: state.run?.ascension ?? 0,
    deck: summarizeDeck(stats),
    relics: describeRunRelics(state, knowledge),
    relic_effects: describeRunRelicEffects(state, knowledge),
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
  const json: Record<string, JsonValue> = {
    character: brief.character,
    act: brief.act,
    floor: brief.floor,
    hp: brief.hp,
    gold: brief.gold,
    ascension: brief.ascension,
    deck: brief.deck,
    relics: brief.relics,
    relic_effects: brief.relic_effects,
    potions: brief.potions,
    notes: brief.notes,
  };
  if (brief.plan) json["run_plan"] = brief.plan;
  // Relic and potion text arrives as a template: the mod exposes `{Heal}` where the game shows a
  // number, and there is no rendered variant for relics the way there is for cards. Say so, so the
  // model does not read the placeholder as a literal string.
  if ([...brief.relic_effects, ...brief.potions].some((entry) => entry.includes(UNKNOWN_VALUE))) {
    json["relic_effects_note"] = `${UNKNOWN_VALUE} marks a value the mod does not expose; the effect text around it is accurate`;
  }
  return json;
}

/**
 * Relics kept in Jev's combat plan-choice brief (JEV_CONTEXT=v1): the ones the turn solver models,
 * and the ones that trigger during a fight in a way that can change which line is best. Relics that
 * act only at pickup, at rest sites, on the map, at the start of combat (already applied by the time
 * a plan is chosen) or after combat are dropped. Burning Blood is dropped on purpose: it heals only
 * after the fight, and "Burning Blood heals it" was the models' most common bad HP trade (handbook).
 */
export const SOLVER_MODELLED_RELICS = ["MERCURY_HOURGLASS", "INTIMIDATING_HELMET", "DEMON_TONGUE", "TOASTY_MITTENS", "FIDDLE"] as const;
export const COMBAT_TRIGGER_RELICS = [
  "SHURIKEN", "PEN_NIB", "MINIATURE_CANNON", "CENTENNIAL_PUZZLE", "SPARKLING_ROUGE", "PENDULUM", "MR_STRUGGLES",
  "LOST_WISP", "HORN_CLEAT", "ART_OF_WAR", "REPTILE_TRINKET", "CROSSBOW", "RED_SKULL", "BEATING_REMNANT",
  "PAPER_PHROG", "TUNING_FORK", "CLOAK_CLASP", "CANDELABRA", "GAME_PIECE", "PAELS_FLESH", "HAPPY_FLOWER",
  "UNSETTLING_LAMP", "LIZARD_TAIL", "SCREAMING_FLAGON", "BURNING_STICKS", "STRIKE_DUMMY", "RAINBOW_RING",
  "ORICHALCUM", "PERMAFROST", "MYSTIC_LIGHTER", "RAZOR_TOOTH", "CHEMICAL_X", "RIPPLE_BASIN", "NUNCHAKU",
  "BELT_BUCKLE", "VAMBRACE", "KUNAI", "ORNAMENTAL_FAN", "LETTER_OPENER", "SELF_FORMING_CLAY",
  "BRILLIANT_SCARF", "CAPTAINS_WHEEL", "CHARONS_ASHES", "DAUGHTER_OF_THE_WIND", "DIAMOND_DIADEM", "FORGOTTEN_SOUL",
  "HAND_DRILL", "HISTORY_COURSE", "ICE_CREAM", "IVORY_TILE", "KUSARIGAMA", "MUMMIFIED_HAND", "MUSIC_BOX",
  "PAELS_TEARS", "PAELS_LEGION", "PAPER_KRANE", "PARRYING_SHIELD", "POCKETWATCH", "RUNIC_PYRAMID", "STONE_CALENDAR",
  "STURDY_CLAMP", "THE_BOOT", "TINGSHA", "TOUGH_BANDAGES", "UNCEASING_TOP", "VELVET_CHOKER", "FAKE_ORICHALCUM",
  "FAKE_STRIKE_DUMMY", "BOOKMARK", "BRIMSTONE", "UNDYING_SIGIL", "REGALITE",
] as const;
const COMBAT_RELICS = new Set<string>([...SOLVER_MODELLED_RELICS, ...COMBAT_TRIGGER_RELICS]);

export function isCombatRelic(relicId: string): boolean {
  return COMBAT_RELICS.has(relicId);
}

/** `Name: effect` for the held relics that matter inside a fight (see COMBAT_TRIGGER_RELICS). */
export function combatRelicEffects(state: GameState, knowledge: Knowledge): string[] {
  return asArray(asRecord(state.run?.raw)["relics"])
    .map(asRecord)
    .filter((relic) => isCombatRelic(str(relic["relic_id"])))
    .map((relic) => {
      const id = str(relic["relic_id"]);
      const info = knowledge.relic(id);
      const name = str(relic["name"], info?.name ?? id);
      const description = fillRelicText(id, info?.description || str(relic["description"]));
      return description ? `${name}: ${truncate(description, 80)}` : name;
    });
}

/**
 * The brief for Jev's combat plan choice (JEV_CONTEXT=v1): no deck summary, no gold, no full relic
 * list; only the combat relics. Jev's accuracy drops with unrelated context.
 */
export function combatBriefJson(brief: RunBrief, state: GameState, knowledge: Knowledge): Record<string, JsonValue> {
  const relics = combatRelicEffects(state, knowledge);
  const json: Record<string, JsonValue> = {
    character: brief.character,
    act: brief.act,
    floor: brief.floor,
    hp: brief.hp,
    ascension: brief.ascension,
    combat_relics: relics,
    potions: brief.potions,
  };
  if (brief.notes.length > 0) json["notes"] = brief.notes;
  if ([...relics, ...brief.potions].some((entry) => entry.includes(UNKNOWN_VALUE))) {
    json["relic_effects_note"] = `${UNKNOWN_VALUE} marks a value the mod does not expose; the effect text around it is accurate`;
  }
  return json;
}
