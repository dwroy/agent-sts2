/**
 * Card selection screens: smith, remove, transform, enchant, and combat multi-select (PLAN.md §6.4).
 *
 * Multi-select is driven to `min_select` and then confirmed: asking the model once per pick keeps
 * each question local and avoids multi-step plans, which Jev is documented to handle poorly.
 */

import { asArray, asRecord, bool, numOrNull, str, truncate, type JsonValue } from "../util/json.js";
import { deckEntries, describeDeck } from "../project/deck.js";
import { briefJson } from "../project/run-brief.js";
import type { Decision, DecisionEnv } from "../project/types.js";
import { buildPickDecision, type PickOption } from "./pick.js";

export function planSelection(env: DecisionEnv): Decision | null {
  const { state, knowledge } = env;
  const selection = asRecord(state.raw["selection"]);
  if (!state.available_actions.includes("select_deck_card") && !state.available_actions.includes("confirm_selection")) {
    return null;
  }

  const kind = str(selection["kind"]);
  const prompt = str(selection["prompt"], "Choose a card.");
  const min = numOrNull(selection["min_select"]) ?? 1;
  const max = numOrNull(selection["max_select"]) ?? min;
  const selected = numOrNull(selection["selected_count"]) ?? 0;
  const canConfirm = bool(selection["can_confirm"]);

  if (selected >= min && canConfirm) {
    return { kind: "act", label: "selection/confirm", intent: { action: "confirm_selection" }, rationale: `selected ${selected}/${min} required` };
  }
  if (selected >= max) return null; // the mod usually closes the screen itself; wait for it

  const isUpgrade = kind === "deck_upgrade_select";
  const candidates = asArray(selection["cards"])
    .map(asRecord)
    .filter((card) => !bool(card["selected"]))
    .filter((card) => !isUpgrade || !bool(card["upgraded"]));

  if (candidates.length === 0) return null;

  const entries = deckEntries(state, knowledge);
  const options: PickOption[] = candidates.map((card, fallbackIndex) => {
    const index = numOrNull(card["index"]) ?? fallbackIndex;
    const cardId = str(card["card_id"]);
    const info = knowledge.card(cardId);
    const name = str(card["name"], info?.name ?? cardId);
    return {
      key: `card${index}`,
      label: name,
      intent: { action: "select_deck_card", option_index: index },
      // Without a real scoring function for "best card", every option scores the same and the
      // fallback becomes "the first legal one" instead of pretending to know better.
      score: 0,
      summary: {
        card: name,
        upgraded: bool(card["upgraded"]),
        type: str(card["card_type"], info?.type ?? ""),
        cost: numOrNull(card["energy_cost"]) ?? info?.cost ?? null,
        text: truncate(str(card["resolved_rules_text"]) || info?.description || "", 160),
      } satisfies JsonValue,
    };
  });

  const verb = isUpgrade
    ? "upgrade"
    : kind === "deck_card_select"
      ? "remove"
      : kind === "deck_transform_select"
        ? "transform"
        : kind === "deck_enchant_select"
          ? "enchant"
          : "choose";

  return buildPickDecision({
    label: `selection/${verb}`,
    instructions: `Which card should I ${verb}?`,
    actThreshold: env.thresholds.act,
    strictJev: env.strictJev,
    options,
    state: {
      run_brief: briefJson(env.brief),
      situation: {
        screen: "CARD_SELECTION",
        task: verb,
        prompt,
        selecting: `${selected + 1} of ${max}${min !== max ? ` (at least ${min})` : ""}`,
      },
      deck: describeDeck(entries),
      candidates: options.map((option) => option.summary as JsonValue),
    },
  });
}
