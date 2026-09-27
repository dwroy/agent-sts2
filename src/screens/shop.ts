/**
 * Shop (PLAN.md §6.5). Worth is judgement (Jev); affordability and stock are arithmetic (code).
 *
 * One purchase per decision and then re-read: the stock changes, gold changes, and the second
 * question is genuinely different from the first.
 */

import { asArray, asRecord, bool, numOrNull, str, truncate, type JsonValue } from "../util/json.js";
import { deckEntries, describeDeck } from "../project/deck.js";
import { potionViews } from "../project/narrow.js";
import { briefJson } from "../project/run-brief.js";
import type { Decision, DecisionEnv } from "../project/types.js";
import { cardValue, deckProfile, isBlockCardId } from "../strategy/card-value.js";
import { damageGap, gapCardBonus } from "../strategy/boss-clock.js";
import { mustHaveBonus, runPlanCardBonus } from "../strategy/run-plan.js";
import { buildPickDecision, type PickOption } from "./pick.js";

export function planShop(env: DecisionEnv): Decision | null {
  const { state, knowledge } = env;
  const shop = asRecord(state.raw["shop"]);
  const actions = state.available_actions;
  if (Object.keys(shop).length === 0) {
    // The fake-merchant room reports no shop payload (2026-09-25: waited 40 min on it); walk on.
    if (state.screen === "FAKE_MERCHANT" && actions.includes("proceed")) {
      return { kind: "act", label: "shop/leave", intent: { action: "proceed" }, rationale: "fake merchant with no shop data: leaving" };
    }
    return null;
  }

  if (!bool(shop["is_open"])) {
    // 1. Dump the junk potions first: a live shop run showed a Foul Potion blocking a slot, and the
    //    shop is the safe place to be rid of it.
    if (!env.screenMemory.shopOpened && actions.includes("discard_potion")) {
      const discardList = env.shopDiscardPotions.map((entry) => entry.toLowerCase());
      const junk = potionViews({ raw: asRecord(state.run?.raw) }, knowledge).find(
        (potion) =>
          potion.can_discard &&
          discardList.some(
            (wanted) => wanted === potion.potion_id.toLowerCase() || wanted === potion.name.toLowerCase(),
          ),
      );
      if (junk) {
        return {
          kind: "act",
          label: "shop/discard",
          intent: { action: "discard_potion", option_index: junk.slot },
          rationale: `discarding ${junk.name} before shopping`,
        };
      }
    }

    // 2. Walking into a shop opens the inventory, once per visit.
    if (
      !env.screenMemory.shopOpened &&
      bool(shop["can_open"]) &&
      actions.includes("open_shop_inventory")
    ) {
      return {
        kind: "act",
        label: "shop/open",
        intent: { action: "open_shop_inventory" },
        rationale: "entering the shop: opening the inventory",
      };
    }

    // 3. Already browsed and closed: leave. Re-opening here is what made a live run flap between
    //    open and close forever, because affordable stock still existed.
    if (actions.includes("proceed")) {
      return {
        kind: "act",
        label: "shop/leave",
        intent: { action: "proceed" },
        rationale: "shopping done: back to the map",
      };
    }
    return null;
  }

  const options: PickOption[] = [];
  const stock: JsonValue[] = [];
  const deckNow = deckEntries(state, knowledge);
  const gap = damageGap(state, knowledge);
  const emptyPotionSlots = asArray(asRecord(state.run?.raw)["potions"]).filter((slot) => !bool(asRecord(slot)["occupied"])).length;
  const profile = deckProfile(deckNow);
  const entriesHaveCurse = deckNow.some((entry) => entry.type === "Curse");
  const act = (numOrNull(Number(str(asRecord(state.run?.raw)["act_id"], "0"))) ?? 0) + 1;
  const floor = state.run?.floor ?? 0;

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
      // The card's resolved text (numbers filled in) when the shop sends it.
      const text = str(raw["resolved_rules_text"]) || (knowledge.card(id)?.description ?? knowledge.relic(id)?.description ?? knowledge.potion(id)?.description ?? "");
      stock.push({ kind: kindLabel, name, price, affordable: enough });
      if (!enough) continue;
      options.push({
        key: `${action}${index}`,
        label: `buy ${name} (${price ?? "?"}g)`,
        intent: { action, option_index: index },
        // Phase 2 value, relative to leaving (0): a card must beat ~60 to earn a slot in the deck,
        // relics are usually worth it, potions rarely are.
        score:
          shopScore(action, id, info, profile, act, floor, price, str(asRecord(state.run?.raw)["boss_id"]), emptyPotionSlots, (state.run?.current_hp ?? 1) / Math.max(1, state.run?.max_hp ?? 1)) +
          (action === "buy_card" ? runPlanCardBonus(env.screenMemory.runPlan, id, deckNow.filter((entry) => isBlockCardId(entry.card_id) && !entry.card_id.startsWith("DEFEND_")).length, isBlockCardId(id)).bonus + gapCardBonus(gap, id).bonus + mustHaveBonus(env.screenMemory.runPlan, id, deckNow.map((entry) => entry.card_id)).bonus : 0),
        // Cards carry their energy cost and type like card rewards do (B98P F15: DeepSeek bought Expect a
        // Fight as "1E"; it costs 3).
        summary: {
          buy: name,
          kind: kindLabel,
          price,
          ...(action === "buy_card"
            ? { cost: numOrNull(raw["energy_cost"]) ?? (info as { cost?: number } | null)?.cost ?? null, type: str(raw["card_type"], (info as { type?: string } | null)?.type ?? "") }
            : {}),
          text: truncate(text, 140),
        } satisfies JsonValue,
      });
    }
  };

  collect(shop["relics"], "buy_relic", "relic");
  collect(shop["cards"], "buy_card", "card");
  collect(shop["potions"], "buy_potion", "potion");
  // With an empty potion slot the best potion stays in the model's view even when it ranks below the
  // top five (CWU9 F31: 721 gold, a slot empty, both potions pruned; left with nothing bought).
  if (emptyPotionSlots > 0) {
    const bestPotion = options.filter((option) => option.intent.action === "buy_potion").sort((a, b) => b.score - a.score)[0];
    if (bestPotion) bestPotion.keepInView = true;
  }

  const removal = asRecord(shop["card_removal"]);
  if (bool(removal["available"]) && bool(removal["enough_gold"])) {
    const price = numOrNull(removal["price"]);
    options.push({
      key: "remove",
      label: `pay ${price ?? "?"}g to remove a card`,
      intent: { action: "remove_card_at_shop" },
      score: profile.basics >= 4 || entriesHaveCurse ? 30 : 8,
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
    strictJev: env.strictJev,
    escalateBelow: 0.4,
    options,
    codeMargin: env.combatPlanner === "card" ? undefined : 10,
    // Five, not three: relics outscored Dark Shackles on a live run and hid it from the supervisor.
    maxModelOptions: 5,
    // With nothing affordable the only option is to leave, so skip the model call entirely.
    skipModelWhenSingle: true,
    state: {
      run_brief: briefJson(env.brief),
      situation: {
        screen: "SHOP",
        gold: state.run?.gold ?? null,
        hp: env.brief.hp,
      },
      stock,
      deck: describeDeck(entries),
      note: "one purchase is made per decision; the shop is re-read afterwards.",
    },
  });
}

function shopScore(
  action: "buy_card" | "buy_relic" | "buy_potion",
  id: string,
  info: unknown,
  profile: ReturnType<typeof deckProfile>,
  act: number,
  floor: number,
  price: number | null,
  bossId = "",
  emptySlots = 0,
  hpPct = 1,
): number {
  const cost = price ?? 150;
  if (action === "buy_card") {
    const card = info as { rarity?: string; type?: string } | null;
    const value = cardValue(id, card?.rarity ?? "", card?.type ?? "", profile, act, floor, bossId).value;
    return value - 62 - cost / 25;
  }
  if (action === "buy_relic") return 18 - cost / 40;
  // Empty potion slots from act 2 on: a potion is a turn saved in the next elite or boss (SUUK F39,
  // 12ZG F21, F8HR F20: empty belts, gold spent on removals and cards, died holding no potion).
  // Low HP with an empty slot: the potion is the next fight, above a removal's 30 (X4QR F21: 21/80
  // after, 261 gold on Flame Barrier, a removal and Feel No Pain; Explosive Ampoule and Fire Potion left).
  if (emptySlots > 0 && hpPct < 0.45) return 34 - cost / 25;
  if (act >= 2 && emptySlots > 0) return (emptySlots >= 2 ? 14 : 8) - cost / 25;
  return -5 - cost / 30;
}
