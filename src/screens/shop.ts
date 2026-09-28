/**
 * Shop (PLAN.md §6.5). Worth is judgement (Jev); affordability, stock and each item's value with its
 * reasons are code's facts, and leaving is always an option with what the gold left is still worth.
 * DeepSeek's plan on a card (want / avoid / needs) is a fact on it, not a filter.
 *
 * One purchase per decision and then re-read: the stock changes, gold changes, and the second
 * question is genuinely different from the first.
 */

import { asArray, asRecord, bool, numOrNull, str, truncate, type JsonValue } from "../util/json.js";
import { deckEntries, describeDeck } from "../project/deck.js";
import { potionViews } from "../project/narrow.js";
import { briefJson } from "../project/run-brief.js";
import type { Decision, DecisionEnv } from "../project/types.js";
import { cardRoles, cardValue, deckProfile, isBlockCardId } from "../strategy/card-value.js";
import { damageGap, gapCardBonus } from "../strategy/boss-clock.js";
import { currentRunPlan, floorsToBoss, planCardFacts } from "../strategy/run-plan.js";
import { guidanceFor, isReserved, planAvoidsCard, potionRole } from "../strategy/intent.js";
import { potionRank, POTION_RANK_DISCARDABLE } from "./map.js";
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
  const runPlan = currentRunPlan(env.screenMemory, state);

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
      const hpPct = (state.run?.current_hp ?? 1) / Math.max(1, state.run?.max_hp ?? 1);
      const valued = shopScore(action, id, info, profile, act, floor, price, str(asRecord(state.run?.raw)["boss_id"]), emptyPotionSlots, hpPct);
      const clock = action === "buy_card" ? gapCardBonus(gap, id) : { bonus: 0, why: null };
      const scored = valued.score + clock.bonus;
      const planFacts = action === "buy_card" ? planCardFacts(runPlan, id, deckNow.filter((entry) => isBlockCardId(entry.card_id) && !entry.card_id.startsWith("DEFEND_")).length, isBlockCardId(id), deckNow.map((entry) => entry.card_id)) : [];
      const avoided = action === "buy_card" ? planAvoidsCard(runPlan, id, cardRoles(id)) : null;
      const reservedRole = action === "buy_potion" && isReserved(runPlan?.reserve, id, text) ? potionRole(id, text) : null;
      const option: PickOption = {
        key: `${action}${index}`,
        label: `buy ${name} (${price ?? "?"}g)`,
        intent: { action, option_index: index },
        // Value relative to leaving (0): a card must beat ~60 to earn a slot in the deck, relics are
        // usually worth it, potions rarely are.
        score: scored,
        why: [...valued.why, ...(clock.why ? [clock.why] : [])].join("; "),
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
          ...(planFacts.length > 0 ? { deepseek_plan: planFacts.join("; ") } : {}),
          ...(reservedRole ? { deepseek_plan: `a ${reservedRole} potion: DeepSeek holds ${reservedRole} potions for the act boss` } : {}),
        } satisfies JsonValue,
        ...(avoided ? { intentBreak: avoided } : {}),
      };
      options.push(option);
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

  // A full belt: a potion the run plan keeps a role for can take the slot of one it does not (RVR6 F37:
  // 15/80, 376 gold, reserve [block, damage, strength, weak]; Ashwater, no reserve role and never drunk in
  // 18 floors, held the slot and the 50-gold Block Potion was never offered). Discarding is the option;
  // the next decision re-reads the shop with the slot free.
  if (emptyPotionSlots === 0 && actions.includes("discard_potion")) {
    const swap = potionSwap(env, asArray(shop["potions"]).map(asRecord), state.run?.gold ?? 0, act, (state.run?.current_hp ?? 1) / Math.max(1, state.run?.max_hp ?? 1));
    if (swap) options.push(swap);
  }

  const removal = asRecord(shop["card_removal"]);
  if (bool(removal["available"]) && bool(removal["enough_gold"])) {
    const price = numOrNull(removal["price"]);
    options.push({
      key: "remove",
      label: `pay ${price ?? "?"}g to remove a card`,
      intent: { action: "remove_card_at_shop" },
      score: profile.basics >= 4 || entriesHaveCurse ? 30 : 8,
      why: entriesHaveCurse ? "the deck holds a curse" : profile.basics >= 4 ? `${profile.basics} basic Strikes/Defends dilute the deck` : "few basics left to remove",
      summary: {
        buy: "card removal",
        kind: "service",
        price,
        text: "removes one card from the deck; a smith/removal is usually strong",
        ...((runPlan?.remove ?? []).length > 0 ? { deepseek_plan: `DeepSeek plan removes first: ${runPlan!.remove.join(", ")}` } : {}),
      } satisfies JsonValue,
    });
  }

  // Leaving is always offered, with what the gold left is still worth: gold past what the shops before
  // the boss can still absorb is worth nothing to the fight that decides the act (CWU9 F31 721 gold,
  // RTF3 F37 1237, EHJZ F31 277 two floors before the boss). It used to be taken off the list while the
  // best buy beat it by 20; now that is a fact Jev weighs.
  const gold = state.run?.gold ?? 0;
  const leaveCost = unspentGoldCost(gold, floor);
  const leaveScore = -leaveCost;
  const toBoss = floorsToBoss(floor);
  options.push({
    key: "leave",
    label: "stop shopping",
    intent: { action: "close_shop_inventory" },
    score: Math.round(leaveScore * 100) / 100,
    why: leaveCost > 0
      ? `~${Math.round(leaveCost * 25)} of the ${gold} gold is likely unspendable before the F${floor + toBoss} boss (shops ahead absorb ~${Math.round(gold - leaveCost * 25)})`
      : `the ${gold} gold can still be spent in shops before the F${floor + toBoss} boss`,
    summary: {
      buy: "nothing",
      note: "close the inventory and leave the shop",
      unspent_gold: leaveCost > 0
        ? `~${Math.round(leaveCost * 25)} of the ${gold} gold is likely unspendable before the F${floor + toBoss} boss (${toBoss} floors away)`
        : `${gold} gold kept: shops before the F${floor + toBoss} boss (${toBoss} floors away) can still absorb it`,
    } satisfies JsonValue,
  });

  const entries = deckEntries(state, knowledge);
  return buildPickDecision({
    label: "shop/buy",
    instructions: "What should I buy right now, if anything?",
    actThreshold: env.thresholds.act,
    strictJev: env.strictJev,
    escalateBelow: 0.4,
    options,
    planVersion: runPlan?.version ?? null,
    guidance: guidanceFor(runPlan, "shop"),
    // Six, not three: relics outscored Dark Shackles on a live run and hid it from the supervisor.
    maxModelOptions: 6,
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

/** Gold the shops left before the act boss can still usefully absorb, 10+ floors out. */
const FUTURE_SHOP_GOLD = 450;

/**
 * What leaving the shop with `gold` costs, in shop-score units (25 gold = 1, the rate buys pay): the
 * gold beyond what the shops still ahead can absorb. That allowance shrinks to nothing two floors
 * before the act boss, where kept gold buys nothing for the fight that decides the act.
 */
export function unspentGoldCost(gold: number, floor: number): number {
  const ahead = Math.min(1, Math.max(0, (floorsToBoss(floor) - 2) / 10));
  const surplus = Math.max(0, gold - FUTURE_SHOP_GOLD * ahead);
  return Math.min(40, surplus / 25);
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
): { score: number; why: string[] } {
  const cost = price ?? 150;
  if (action === "buy_card") {
    const card = info as { rarity?: string; type?: string } | null;
    const valued = cardValue(id, card?.rarity ?? "", card?.type ?? "", profile, act, floor, bossId);
    return { score: valued.value - 62 - cost / 25, why: [`card value ${valued.value} (${valued.reasons.join(", ") || "base"}) - 62 to earn a deck slot - ${cost}g/25`] };
  }
  if (action === "buy_relic") return { score: 18 - cost / 40, why: [`a relic ~18 - ${cost}g/40`] };
  // Empty potion slots from act 2 on: a potion is a turn saved in the next elite or boss (SUUK F39,
  // 12ZG F21, F8HR F20: empty belts, gold spent on removals and cards, died holding no potion).
  // Low HP with an empty slot: the potion is the next fight, above a removal's 30 (X4QR F21: 21/80
  // after, 261 gold on Flame Barrier, a removal and Feel No Pain; Explosive Ampoule and Fire Potion left).
  if (emptySlots > 0 && hpPct < 0.45) return { score: 34 - cost / 25, why: [`HP ${Math.round(hpPct * 100)}% with an empty potion slot: the potion is for the next fight`] };
  // An empty slot in any act: a potion is worth more than the gold held for it (it outranks leaving).
  if (emptySlots > 0) return { score: (act >= 2 && emptySlots >= 2 ? 14 : 8) - cost / 25, why: [`fills an empty potion slot (${emptySlots} empty)`] };
  return { score: -5 - cost / 30, why: ["the belt is full: buying needs a free slot"] };
}

/**
 * Free a slot for a better potion: the belt's weakest potion the run plan does not reserve (rank <=
 * POTION_RANK_DISCARDABLE), for a stocked, affordable potion of a role the plan reserves that ranks
 * higher. Scored like buying that potion into an empty slot, less 1 for the potion given up.
 */
function potionSwap(env: DecisionEnv, stocked: Record<string, unknown>[], gold: number, act: number, hpPct: number): PickOption | null {
  const reserve = currentRunPlan(env.screenMemory, env.state)?.reserve ?? [];
  if (reserve.length === 0) return null;
  const textOf = (id: string, text = "") => text || env.knowledge.potion(id)?.description || "";
  const belt = potionViews({ raw: asRecord(env.state.run?.raw) }, env.knowledge).filter((potion) => potion.can_discard);
  const drop = belt
    .filter((potion) => !isReserved(reserve, potion.potion_id, potion.text) && potionRank(potion.potion_id) <= POTION_RANK_DISCARDABLE)
    .sort((a, b) => potionRank(a.potion_id) - potionRank(b.potion_id))[0];
  if (!drop) return null;
  const wanted = stocked
    .filter((entry) => bool(entry["is_stocked"], true) && (numOrNull(entry["price"]) ?? Infinity) <= gold)
    .map((entry) => ({ entry, id: str(entry["potion_id"]) }))
    .filter(({ id }) => isReserved(reserve, id, textOf(id)) && potionRank(id) > potionRank(drop.potion_id))
    .sort((a, b) => potionRank(b.id) - potionRank(a.id) || (numOrNull(a.entry["price"]) ?? 0) - (numOrNull(b.entry["price"]) ?? 0))[0];
  if (!wanted) return null;
  const price = numOrNull(wanted.entry["price"]);
  const name = str(wanted.entry["name"], wanted.id);
  const score = shopScore("buy_potion", wanted.id, null, deckProfile([]), act, 0, price, "", 1, hpPct).score - 1;
  return {
    key: "swap_potion",
    label: `discard ${drop.name} to buy ${name} (${price ?? "?"}g)`,
    intent: { action: "discard_potion", option_index: drop.slot },
    score,
    keepInView: true,
    why: `swaps a potion DeepSeek does not hold for the boss for one of a role it holds (${potionRole(wanted.id, textOf(wanted.id)) ?? "?"})`,
    summary: {
      buy: `${name} (after discarding ${drop.name})`,
      kind: "potion swap",
      price,
      text: `the belt is full: discards ${drop.name} (no role DeepSeek holds) to free a slot; DeepSeek holds ${potionRole(wanted.id, textOf(wanted.id)) ?? "this"} potions for the act boss`,
    } satisfies JsonValue,
  };
}
