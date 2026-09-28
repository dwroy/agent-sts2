/**
 * Reward screen (PLAN.md §6.3).
 *
 * Claiming the non-card rewards is bookkeeping, so it runs in code; the card choice is a real
 * deck-shaping decision and goes to Jev with the full deck in view.
 */

import { asArray, asRecord, bool, numOrNull, str, truncate, type JsonValue } from "../util/json.js";
import { deckEntries, describeDeck } from "../project/deck.js";
import { cardValue, deckProfile, isBlockCardId, SKIP_BAR } from "../strategy/card-value.js";
import { damageGap, gapCardBonus } from "../strategy/boss-clock.js";
import { runPlanCardBonus } from "../strategy/run-plan.js";
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
    const profile = deckProfile(entries);
    const gap = damageGap(state, knowledge);
    const run = asRecord(state.run?.raw);
    const act = (numOrNull(Number(str(run["act_id"], "0"))) ?? 0) + 1;
    const floor = state.run?.floor ?? 0;
    const options: PickOption[] = offered.map((card, fallbackIndex) => {
      const index = numOrNull(card["index"]) ?? fallbackIndex;
      const cardId = str(card["card_id"]);
      const info = knowledge.card(cardId);
      const name = str(card["name"], info?.name ?? cardId);
      const text = truncate(str(card["resolved_rules_text"]) || info?.description || "", 160);
      const relicIds = asArray(run["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
      const base = cardValue(cardId, info?.rarity ?? "", info?.type ?? "", profile, act, floor, str(run["boss_id"]), relicIds);
      // RUN_PLAN=v1: DeepSeek's wanted/avoided cards and block target.
      const planned = runPlanCardBonus(env.screenMemory.runPlan, cardId, entries.filter((entry) => isBlockCardId(entry.card_id) && !entry.card_id.startsWith("DEFEND_")).length, isBlockCardId(cardId));
      // Boss clock: damage cards while the deck is short of the act boss's damage a turn.
      const clock = gapCardBonus(gap, cardId);
      const valued = { value: base.value + planned.bonus + clock.bonus, reasons: [...base.reasons, ...(planned.why ? [planned.why] : []), ...(clock.why ? [clock.why] : [])] };
      return {
        key: `card${index}`,
        label: `${name} (${info?.type ?? "?"}, ${info?.cost ?? "?"}E)`,
        intent: { action: "choose_reward_card", option_index: index },
        score: valued.value,
        summary: {
          code_value: valued.value,
          why: valued.reasons.join("; ") || null,
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
      score: SKIP_BAR,
      summary: { card: "skip", code_value: SKIP_BAR, note: "take nothing; the deck stays lean" } satisfies JsonValue,
    });

    // Phase 2: a card code values below the skip bar is not offered to the model at all. Say so when
    // that leaves only the skip, instead of the pick helper's "only one legal option".
    const shown = env.combatPlanner === "card" ? options : options.filter((option) => option.key === "skip" || option.score >= SKIP_BAR);
    if (shown.length === 1 && options.length > 1) {
      const values = options
        .filter((option) => option.key !== "skip")
        .map((option) => `${option.label} ${option.score}`)
        .join(", ");
      return {
        kind: "act",
        label: "reward/card",
        intent: { action: "skip_reward_cards" },
        rationale: `all offers below skip bar ${SKIP_BAR} (${values})`,
      };
    }

    return buildPickDecision({
      label: "reward/card",
      instructions: "Which of these card rewards should I take, if any?",
      actThreshold: env.thresholds.act,
      strictJev: env.strictJev,
      escalateBelow: 0.45,
      options: shown,
      codeMargin: env.combatPlanner === "card" ? undefined : 6,
      maxModelOptions: 3,
      state: {
        run_brief: briefJson(env.brief),
        deck_stats: env.brief.deck,
        deck_needs: { act_boss: str(run["boss_id"]) || null, act, size: profile.size, aoe_cards: profile.aoe, draw_cards: profile.draw, scaling_cards: profile.scaling, damage_cards: profile.frontload, block_cards: profile.block },
        deck: describeDeck(entries),
        note: "skipping is a legitimate choice: a card that does not fit the plan makes the deck worse.",
      },
    });
  }

  // With every potion slot full, claiming a potion hangs the mod's action call (live run, floor 11).
  const potionSlotsFull = asArray(asRecord(state.run?.raw)["potions"])
    .map(asRecord)
    .every((slot) => bool(slot["occupied"]));
  const claimable = asArray(reward["rewards"])
    .map(asRecord)
    .filter((entry) => bool(entry["claimable"], true))
    .filter((entry) => !(potionSlotsFull && str(entry["reward_type"]) === "Potion"))
    // A skipped card reward stays claimable in the state (the mod documents this). Claiming it again
    // reopens the card choice, which is how a live run ended up skipping in a loop.
    .filter(
      (entry) =>
        !env.screenMemory.cardRewardSkipped ||
        !["Card", "SpecialCard", "LinkedRewardSet"].includes(str(entry["reward_type"])),
    );
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
