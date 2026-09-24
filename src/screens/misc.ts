/**
 * The smaller screens: bundles, capstones, character select, the timeline, overlays, and the
 * crystal-sphere puzzle (PLAN.md §6.7–§6.9).
 *
 * Most of these are deterministic. The crystal sphere is a spatial optimisation, which is exactly
 * the kind of problem Jev is documented to be bad at, so it stays in code.
 */

import { asArray, asRecord, bool, num, numOrNull, str, type JsonValue } from "../util/json.js";
import { briefJson } from "../project/run-brief.js";
import type { Decision, DecisionEnv } from "../project/types.js";
import { buildPickDecision, type PickOption } from "./pick.js";

export function planBundle(env: DecisionEnv): Decision | null {
  const { state, knowledge } = env;
  const bundles = asArray(state.raw["bundles"]).map(asRecord);
  if (bundles.length > 0) {
    const options: PickOption[] = bundles.flatMap((bundle, fallbackIndex) => {
      const index = numOrNull(bundle["index"]) ?? fallbackIndex;
      const cards = asArray(bundle["cards"]).map(asRecord);
      return [
        {
          key: `b${index}`,
          label: str(bundle["title"], `bundle ${index}`),
          intent: { action: "choose_bundle", option_index: index },
          score: 0,
          summary: {
            bundle: str(bundle["title"], `bundle ${index}`),
            cards: cards.map((card) => {
              const id = str(card["card_id"]);
              return str(card["name"], knowledge.card(id)?.name ?? id);
            }),
          } satisfies JsonValue,
        } satisfies PickOption,
      ];
    });
    if (options.length === 1) {
      const only = options[0] as PickOption;
      return { kind: "act", label: "bundle/only", intent: only.intent, rationale: "only one bundle offered" };
    }
    if (options.length > 1) {
      return buildPickDecision({
        label: "bundle/choose",
        instructions: "Which starting card bundle should I take?",
        actThreshold: env.thresholds.act,
        strictJev: env.strictJev,
        options,
        state: { run_brief: briefJson(env.brief), situation: { screen: "BUNDLE_SELECTION" } },
      });
    }
  }
  if (state.available_actions.includes("confirm_bundle")) {
    return { kind: "act", label: "bundle/confirm", intent: { action: "confirm_bundle" }, rationale: "confirming the bundle" };
  }
  return null;
}

export function planCapstone(env: DecisionEnv): Decision | null {
  const { state } = env;
  const capstone = asRecord(state.raw["capstone"]);
  const choices = asArray(capstone["options"]).map(asRecord);
  if (choices.length === 0) return null;
  const options: PickOption[] = choices.flatMap((choice, fallbackIndex) => {
    const index = numOrNull(choice["index"]) ?? fallbackIndex;
    const title = str(choice["title"], `option ${index}`);
    return [
      {
        key: `c${index}`,
        label: title,
        intent: { action: "choose_capstone_option", option_index: index },
        score: 0,
        summary: {
          option: title,
          description: str(choice["description"]).slice(0, 200),
        } satisfies JsonValue,
      } satisfies PickOption,
    ];
  });
  if (options.length === 1) {
    const only = options[0] as PickOption;
    return { kind: "act", label: "capstone/only", intent: only.intent, rationale: "only one capstone option" };
  }
  return buildPickDecision({
    label: "capstone/choose",
    instructions: "Which option should I take?",
    actThreshold: env.thresholds.act,
    strictJev: env.strictJev,
    options,
    state: { run_brief: briefJson(env.brief), situation: { screen: "CAPSTONE_SELECTION" } },
  });
}

export function planCharacterSelect(env: DecisionEnv): Decision | null {
  const { state } = env;
  const select = asRecord(state.raw["character_select"]);
  if (Object.keys(select).length === 0) return null;

  if (bool(select["can_embark"]) && state.available_actions.includes("embark")) {
    return { kind: "act", label: "character/embark", intent: { action: "embark" }, rationale: "character chosen; setting off" };
  }

  const characters = asArray(select["characters"]).map(asRecord);
  const unlocked = characters.filter((entry) => !bool(entry["is_locked"]));
  const preferred = env.characterPreference?.trim().toLowerCase();
  const match = preferred
    ? unlocked.find(
        (entry) =>
          str(entry["character_id"]).toLowerCase() === preferred || str(entry["name"]).toLowerCase() === preferred,
      )
    : undefined;
  const target = match ?? unlocked[0];
  const index = target ? numOrNull(target["index"]) : null;
  if (index === null) return null;
  if (!state.available_actions.includes("select_character")) return null;
  return {
    kind: "act",
    label: "character/select",
    intent: { action: "select_character", option_index: index },
    rationale: match
      ? `selecting the configured character ${preferred}`
      : `selecting the first unlocked character (${str(target?.["name"], "unknown")}); set CHARACTER to choose deliberately`,
  };
}

export function planTimeline(env: DecisionEnv): Decision | null {
  const { state } = env;
  const timeline = asRecord(state.raw["timeline"]);
  if (Object.keys(timeline).length === 0) return null;
  if (bool(timeline["can_confirm_overlay"]) && state.available_actions.includes("confirm_timeline_overlay")) {
    return { kind: "act", label: "timeline/confirm", intent: { action: "confirm_timeline_overlay" }, rationale: "closing the timeline overlay" };
  }
  if (bool(timeline["can_choose_epoch"]) && state.available_actions.includes("choose_timeline_epoch")) {
    // A slot already in state "complete" stays actionable (it re-opens for viewing); picking it again
    // looped forever on a live run. Only open epochs that still have something to reveal.
    const slot = asArray(timeline["slots"])
      .map(asRecord)
      .find((entry) => bool(entry["is_actionable"]) && str(entry["state"]) !== "complete");
    const index = slot ? numOrNull(slot["index"]) : null;
    if (index !== null) {
      return { kind: "act", label: "timeline/epoch", intent: { action: "choose_timeline_epoch", option_index: index }, rationale: "picking an obtained epoch" };
    }
  }
  if (state.available_actions.includes("close_main_menu_submenu")) {
    return { kind: "act", label: "timeline/close", intent: { action: "close_main_menu_submenu" }, rationale: "leaving the timeline" };
  }
  return null;
}

/** Menus, overlays, and end-of-run. Deliberately model-free (PLAN.md §6.9). */
export function planMenu(env: DecisionEnv): Decision | null {
  const { state } = env;
  const actions = state.available_actions;

  if (state.screen === "MODAL") {
    const modal = asRecord(state.raw["modal"]);
    if (bool(modal["can_confirm"]) && actions.includes("confirm_modal")) {
      return { kind: "act", label: "modal/confirm", intent: { action: "confirm_modal" }, rationale: `confirming modal ${str(modal["type_name"])}` };
    }
    if (actions.includes("dismiss_modal")) {
      return { kind: "act", label: "modal/dismiss", intent: { action: "dismiss_modal" }, rationale: `dismissing modal ${str(modal["type_name"])}` };
    }
    return null;
  }

  if (state.screen === "UNLOCK") {
    if (actions.includes("confirm_unlock")) {
      return { kind: "act", label: "unlock/confirm", intent: { action: "confirm_unlock" }, rationale: "confirming the unlock overlay" };
    }
    return null;
  }

  if (state.screen === "GAME_OVER") {
    if (actions.includes("continue_game_over")) {
      return { kind: "act", label: "game_over/continue", intent: { action: "continue_game_over" }, rationale: "continuing past the score screen (saves progress)" };
    }
    if (actions.includes("return_to_main_menu")) {
      return { kind: "act", label: "game_over/menu", intent: { action: "return_to_main_menu" }, rationale: "returning to the main menu" };
    }
    return null;
  }

  if (state.screen === "MAIN_MENU") {
    const mode = env.runStart;
    if (mode !== "new" && actions.includes("continue_run")) {
      return { kind: "act", label: "menu/continue", intent: { action: "continue_run" }, rationale: "continuing the existing run" };
    }
    if (mode !== "continue" && actions.includes("open_character_select")) {
      return { kind: "act", label: "menu/new_run", intent: { action: "open_character_select" }, rationale: "starting a new run" };
    }
    if (actions.includes("close_main_menu_submenu")) {
      return { kind: "act", label: "menu/close_submenu", intent: { action: "close_main_menu_submenu" }, rationale: "closing a submenu" };
    }
    return null;
  }

  // Human-facing pause pages: a person resumes those, so we wait instead of clicking.
  return null;
}

export function planCloseCardsView(env: DecisionEnv): Decision | null {
  if (env.state.available_actions.includes("close_cards_view")) {
    return { kind: "act", label: "cards/close", intent: { action: "close_cards_view" }, rationale: "closing a card view overlay" };
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Crystal sphere: pure code (PLAN.md §6.8)                                    */
/* -------------------------------------------------------------------------- */

interface SphereItem {
  isGood: boolean;
  revealed: boolean;
  cells: string[];
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function planCrystalSphere(env: DecisionEnv): Decision | null {
  const { state } = env;
  const sphere = asRecord(state.raw["crystal_sphere"]);
  if (Object.keys(sphere).length === 0) return null;

  if (bool(sphere["is_finished"]) || (numOrNull(sphere["divinations_left"]) ?? 0) <= 0) {
    if (state.available_actions.includes("proceed")) {
      return { kind: "act", label: "sphere/proceed", intent: { action: "proceed" }, rationale: "no divinations left" };
    }
    return null;
  }

  const width = numOrNull(sphere["grid_width"]) ?? 0;
  const height = numOrNull(sphere["grid_height"]) ?? 0;
  const hidden = new Set(asArray(sphere["hidden_cells"]).map((cell) => cellKey(num(asArray(cell)[0]), num(asArray(cell)[1]))));
  const items: SphereItem[] = asArray(sphere["items"]).map(asRecord).map((item) => {
    const x = numOrNull(item["x"]) ?? 0;
    const y = numOrNull(item["y"]) ?? 0;
    const itemWidth = numOrNull(item["width"]) ?? 1;
    const itemHeight = numOrNull(item["height"]) ?? 1;
    const explicit = asArray(item["cells"]).map((cell) => cellKey(num(asArray(cell)[0]), num(asArray(cell)[1])));
    const derived: string[] = [];
    if (explicit.length === 0) {
      for (let dx = 0; dx < itemWidth; dx += 1) {
        for (let dy = 0; dy < itemHeight; dy += 1) derived.push(cellKey(x + dx, y + dy));
      }
    }
    return {
      isGood: bool(item["is_good"]),
      revealed: bool(item["revealed"]) || bool(item["is_revealed"]),
      cells: explicit.length > 0 ? explicit : derived,
    };
  });

  const weightOfCell = (x: number, y: number): number => {
    const cell = cellKey(x, y);
    let weight = 0.5; // unknown ground is mildly useful information
    for (const item of items) {
      if (item.revealed || !item.cells.includes(cell)) continue;
      weight = item.isGood ? 3 : -2;
    }
    return weight;
  };

  const placements: { x: number; y: number; tool: "big" | "small"; score: number; cells: number }[] = [];
  const push = (x: number, y: number, tool: "big" | "small"): void => {
    const size = tool === "big" ? 3 : 1;
    if (x + size > width || y + size > height) return;
    let score = 0;
    let cells = 0;
    for (let dx = 0; dx < size; dx += 1) {
      for (let dy = 0; dy < size; dy += 1) {
        const cx = x + dx;
        const cy = y + dy;
        if (!hidden.has(cellKey(cx, cy))) continue;
        cells += 1;
        score += weightOfCell(cx, cy);
      }
    }
    if (cells === 0) return;
    placements.push({ x, y, tool, score, cells });
  };

  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      push(x, y, "big");
      push(x, y, "small");
    }
  }
  if (placements.length === 0) return null;

  const best = placements.reduce((a, b) => {
    if (b.score > a.score) return b;
    if (b.score === a.score && b.cells > a.cells) return b;
    return a;
  });

  return {
    kind: "act",
    label: "sphere/clear",
    intent: { action: "crystal_clear_cell", x: best.x, y: best.y, tool: best.tool },
    rationale: `code-side solver: ${best.tool} at (${best.x},${best.y}) covers ${best.cells} hidden cells, weighted score ${best.score.toFixed(1)}`,
  };
}
