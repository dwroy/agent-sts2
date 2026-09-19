/**
 * Reward screen (PLAN.md §6.3).
 *
 * Claiming the non-card rewards is bookkeeping, so it runs in code; the card choice is a real
 * deck-shaping decision and goes to Jev with the full deck in view.
 */

import { asArray, asRecord, bool, numOrNull, str, truncate, type JsonValue } from "../util/json.js";
import { deckEntries, describeDeck } from "../project/deck.js";
import { briefJson } from "../project/run-brief.js";
import type { Decision, DecisionEnv } from "../project/types.js";
import { buildPickDecision, type PickOption } from "./pick.js";

export function planReward(env: DecisionEnv): Decision | null {
  const { state, knowledge } = env;
  const reward = asRecord(state.raw["reward"]);
  const actions = state.available_actions;

  if (bool(reward["pending_card_choice"])) {
    const offered = asArray(reward["card_options"]).map(asRecord);
    if (offered.length === 0) {
      // Pending but nothing offered: take the documented escape hatch rather than waiting forever.
      if (actions.includes("skip_reward_cards")) {
        return { kind: "act", label: "reward/skip", intent: { action: "skip_reward_cards" }, rationale: "card reward pending with no options offered" };
      }
      return null;
    }
    const entries = deckEntries(state, knowledge);
    const options: PickOption[] = offered.map((card, fallbackIndex) => {
      const index = numOrNull(card["index"]) ?? fallbackIndex;
      const cardId = str(card["card_id"]);
      const info = knowledge.card(cardId);
      const name = str(card["name"], info?.name ?? cardId);
      const text = truncate(str(card["resolved_rules_text"]) || info?.description || "", 160);
      return {
        key: `card${index}`,
        label: `${name} (${info?.type ?? "?"}, ${info?.cost ?? "?"}E)`,
        intent: { action: "choose_reward_card", option_index: index },
        score: 1,
        summary: {
          card: name,
          type: info?.type ?? null,
          rarity: info?.rarity ?? null,
          cost: info?.cost ?? null,
          text,
        } satisfies JsonValue,
      };
    });
    options.push({
      key: "skip",
      label: "skip the card reward",
      intent: { action: "skip_reward_cards" },
      score: 0,
      summary: { card: "skip", note: "take nothing; the deck stays lean" } satisfies JsonValue,
    });

    return buildPickDecision({
      label: "reward/card",
      instructions: "Which of these card rewards should I take, if any?",
      actThreshold: env.thresholds.act,
      options,
      state: {
        run_brief: briefJson(env.brief),
        deck_stats: env.brief.deck,
        deck: describeDeck(entries),
        note: "skipping is a legitimate choice: a card that does not fit the plan makes the deck worse.",
      },
    });
  }

  const claimable = asArray(reward["rewards"])
    .map(asRecord)
    .filter((entry) => bool(entry["claimable"], true));
  const next = claimable[0];
  if (next) {
    const index = numOrNull(next["index"]) ?? 0;
    return {
      kind: "act",
      label: "reward/claim",
      intent: { action: "claim_reward", option_index: index },
      rationale: `claiming ${str(next["reward_type"], "reward")} (${truncate(str(next["description"]), 40)})`,
    };
  }

  // Nothing left to claim: advance. Found by a live run — the installed build advertises
  // `collect_rewards_and_proceed` here, not `proceed`, so checking only for `proceed` deadlocked on
  // the reward screen. `available_actions` is the authority, so try each documented name in order.
  const advance = ["collect_rewards_and_proceed", "resolve_rewards", "proceed"].find((action) =>
    actions.includes(action),
  );
  if (advance) {
    return {
      kind: "act",
      label: "reward/proceed",
      intent: { action: advance },
      rationale: `no rewards left to claim; advancing with ${advance}`,
    };
  }
  return null;
}
