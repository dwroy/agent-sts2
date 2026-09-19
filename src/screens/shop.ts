/**
 * Shop (PLAN.md §6.5). Worth is judgement (Jev); affordability and stock are arithmetic (code).
 *
 * One purchase per decision and then re-read: the stock changes, gold changes, and the second
 * question is genuinely different from the first.
 */

import { asArray, asRecord, bool, numOrNull, str, truncate, type JsonValue } from "../util/json.js";
import { deckEntries, describeDeck } from "../project/deck.js";
import { briefJson } from "../project/run-brief.js";
import type { Decision, DecisionEnv } from "../project/types.js";
import { buildPickDecision, type PickOption } from "./pick.js";

export function planShop(env: DecisionEnv): Decision | null {
  const { state, knowledge } = env;
  const shop = asRecord(state.raw["shop"]);
  if (Object.keys(shop).length === 0) return null;

  if (!bool(shop["is_open"])) {
    if (bool(shop["can_open"]) && state.available_actions.includes("open_shop_inventory")) {
      return { kind: "act", label: "shop/open", intent: { action: "open_shop_inventory" }, rationale: "opening the shop inventory" };
    }
    if (state.available_actions.includes("proceed")) {
      return { kind: "act", label: "shop/leave", intent: { action: "proceed" }, rationale: "nothing left to do in this shop" };
    }
    return null;
  }

  const options: PickOption[] = [];
  const affordable: JsonValue[] = [];

  const collect = (
    list: unknown,
    action: "buy_card" | "buy_relic" | "buy_potion",
    kindLabel: string,
  ): void => {
    for (const raw of asArray(list).map(asRecord)) {
      const index = numOrNull(raw["index"]);
      if (index === null) continue;
      const price = numOrNull(raw["price"]);
      const enough = bool(raw["enough_gold"]) && bool(raw["is_stocked"], true);
      const id = str(raw["card_id"]) || str(raw["relic_id"]) || str(raw["potion_id"]);
      const name = str(raw["name"], id);
      const info =
        action === "buy_card" ? knowledge.card(id) : action === "buy_relic" ? knowledge.relic(id) : knowledge.potion(id);
      const text = knowledge.card(id)?.description ?? knowledge.relic(id)?.description ?? knowledge.potion(id)?.description ?? "";
      affordable.push({ kind: kindLabel, name, price, affordable: enough });
      if (!enough) continue;
      options.push({
        key: `${action}${index}`,
        label: `buy ${name} (${price ?? "?"}g)`,
        intent: { action, option_index: index },
        // Cheaper is better when the model is not confident; the model still decides by value.
        score: (info ? 1 : 0) + (price !== null ? Math.max(0, 300 - price) / 300 : 0),
        summary: {
          buy: name,
          kind: kindLabel,
          price,
          text: truncate(text, 140),
        } satisfies JsonValue,
      });
    }
  };

  collect(shop["relics"], "buy_relic", "relic");
  collect(shop["cards"], "buy_card", "card");
  collect(shop["potions"], "buy_potion", "potion");

  const removal = asRecord(shop["card_removal"]);
  if (bool(removal["available"]) && bool(removal["enough_gold"])) {
    const price = numOrNull(removal["price"]);
    options.push({
      key: "remove",
      label: `pay ${price ?? "?"}g to remove a card`,
      intent: { action: "remove_card_at_shop" },
      score: 1.5,
      summary: { buy: "card removal", kind: "service", price, text: "removes one card from the deck; a smith/removal is usually strong" } satisfies JsonValue,
    });
  }

  options.push({
    key: "leave",
    label: "stop shopping",
    intent: { action: "close_shop_inventory" },
    score: 0,
    summary: { buy: "nothing", note: "close the inventory and leave the shop" } satisfies JsonValue,
  });

  const entries = deckEntries(state, knowledge);
  return buildPickDecision({
    label: "shop/buy",
    instructions: "What should I buy right now, if anything?",
    actThreshold: env.thresholds.act,
    options,
    state: {
      run_brief: briefJson(env.brief),
      situation: {
        screen: "SHOP",
        gold: state.run?.gold ?? null,
        hp: env.brief.hp,
      },
      stock: affordable,
      deck: describeDeck(entries),
      note: "one purchase is made per decision; the shop is re-read afterwards.",
    },
  });
}
