/**
 * Shop (PLAN.md §6.5). Worth is judgement (Jev); affordability and stock are arithmetic (code).
 *
 * Jev/code, and DeepSeek with BUILD_ONESHOT=off: one purchase per decision and then re-read. DeepSeek with
 * BUILD_ONESHOT (default): one question per visit for an ordered shopping list (items, the removal with its
 * card, potion discards), played by code step by step; re-asked only when the shop changes under the plan.
 */

import { asArray, asRecord, bool, numOrNull, str, truncate, type JsonValue } from "../util/json.js";
import { deckEntries, describeDeck } from "../project/deck.js";
import { potionViews } from "../project/narrow.js";
import { briefJson } from "../project/run-brief.js";
import type { Decision, DecisionEnv } from "../project/types.js";
import { cardValue, deckProfile, isBlockCardId } from "../strategy/card-value.js";
import { damageGap, gapCardBonus } from "../strategy/boss-clock.js";
import { runPlanCardBonus } from "../strategy/run-plan.js";
import { buildPickDecision, type PickOption } from "./pick.js";
import { buildFacts, deepseekDecides } from "../strategy/build-facts.js";
import { fillRelicText } from "../knowledge/relic-values.js";
import { potionHpSaved } from "../strategy/potion-value.js";
import type { ActionRequest } from "../mod/client.js";
import type { GameState } from "../mod/schema.js";
import type { ResolvedAction } from "../project/types.js";
import { cardLine, deckCards, nextPlanRef, oneshotFailedHere, oneshotOn, sameCard, usePlanRef, visitKey, type CardIdentity } from "./oneshot.js";
import { followUpTargetScore } from "./selection.js";

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
  /** Every stocked item, affordable or not, with its value as if affordable (the one-shot plan's view). */
  const everything: { option: PickOption; affordable: boolean; id: string; price: number | null }[] = [];
  const stock: JsonValue[] = [];
  const deckNow = deckEntries(state, knowledge);
  const gap = damageGap(state, knowledge);
  const belt = asArray(asRecord(state.run?.raw)["potions"]);
  const emptyPotionSlots = belt.filter((slot) => !bool(asRecord(slot)["occupied"])).length;
  const byDeepseek = deepseekDecides(env);
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
      const text = knowledge.card(id)?.description ?? knowledge.relic(id)?.description ?? knowledge.potion(id)?.description ?? "";
      stock.push({ kind: kindLabel, name, price, affordable: enough });
      if (!bool(raw["is_stocked"], true) || !id) continue;
      const oldBase = shopScore(action, id, info, profile, act, floor, price, str(asRecord(state.run?.raw)["boss_id"]), emptyPotionSlots, (state.run?.current_hp ?? 1) / Math.max(1, state.run?.max_hp ?? 1));
      // DeepSeek: a potion's value is the HP it is expected to save in the act boss fight (its facts).
      const potion = byDeepseek && action === "buy_potion" ? shopPotionValue(id, price, emptyPotionSlots, belt.length, oldBase, env) : null;
      const base = potion ? potion.score : oldBase;
      const planned = action === "buy_card" ? runPlanCardBonus(env.screenMemory.runPlan, id, deckNow.filter((entry) => isBlockCardId(entry.card_id) && !entry.card_id.startsWith("DEFEND_")).length, isBlockCardId(id)) : { bonus: 0, why: null };
      const clock = action === "buy_card" ? gapCardBonus(gap, id) : { bonus: 0, why: null };
      const cardInfo = action === "buy_card" ? (info as { rarity?: string; type?: string } | null) : null;
      const valued = action === "buy_card" ? cardValue(id, cardInfo?.rarity ?? "", cardInfo?.type ?? "", profile, act, floor, str(asRecord(state.run?.raw)["boss_id"])) : null;
      const option: PickOption = {
        key: `${action}${index}`,
        label: `buy ${name} (${price ?? "?"}g)`,
        intent: { action, option_index: index },
        // Phase 2 value, relative to leaving (0): a card must beat ~60 to earn a slot in the deck,
        // relics are usually worth it, potions rarely are.
        score: base + planned.bonus + clock.bonus,
        why: [
          action === "buy_card"
            ? `card value ${valued?.value ?? "?"}${valued && valued.reasons.length > 0 ? ` (${valued.reasons.join("; ")})` : ""} - 62 - price/25`
            : action === "buy_relic"
              ? "relic: 18 - price/40"
              : potion
                ? potion.why
                : `potion: ${emptyPotionSlots} empty slot(s), act ${act}`,
          ...(planned.why ? [planned.why] : []),
          ...(clock.why ? [clock.why] : []),
        ].join("; "),
        // DeepSeek sees the relic's text with its numbers filled where known.
        ...(action === "buy_relic" ? { facts: { text: fillRelicText(id, knowledge.relic(id)?.description ?? "") } } : {}),
        ...(potion ? { facts: potion.facts } : {}),
        summary: {
          buy: name,
          kind: kindLabel,
          price,
          text: truncate(text, 140),
        } satisfies JsonValue,
      };
      everything.push({ option, affordable: enough, id, price });
      if (enough) options.push(option);
    }
  };

  collect(shop["relics"], "buy_relic", "relic");
  collect(shop["cards"], "buy_card", "card");
  collect(shop["potions"], "buy_potion", "potion");

  const removal = asRecord(shop["card_removal"]);
  const removalScore = profile.basics >= 4 || entriesHaveCurse ? 30 : 8;
  const removalWhy = `${profile.basics} basic Strikes/Defends${entriesHaveCurse ? " and a curse" : ""} in the deck`;
  if (bool(removal["available"]) && bool(removal["enough_gold"])) {
    const price = numOrNull(removal["price"]);
    options.push({
      key: "remove",
      label: `pay ${price ?? "?"}g to remove a card`,
      intent: { action: "remove_card_at_shop" },
      score: removalScore,
      why: removalWhy,
      summary: { buy: "card removal", kind: "service", price, text: "removes one card from the deck; a smith/removal is usually strong" } satisfies JsonValue,
    });
  }

  options.push({
    key: "leave",
    label: "stop shopping",
    intent: { action: "close_shop_inventory" },
    score: 0,
    why: "the bar: anything scoring below 0 is worse than leaving",
    summary: { buy: "nothing", note: "close the inventory and leave the shop" } satisfies JsonValue,
  });

  const entries = deckEntries(state, knowledge);
  const params = {
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
  };
  // BUILD_ONESHOT: the whole visit in one question (a shopping list), steps played by code. A plan being
  // played goes on even when only leaving is affordable (its last step is leaving).
  const oneshot = deepseekDecides(env) && oneshotOn(env) && !oneshotFailedHere(env, "shop");
  const playing = oneshot && env.screenMemory.shopPlan?.runId === str(state.raw["run_id"]) && env.screenMemory.shopPlan?.floor === (state.run?.floor ?? null);
  // BUILD_DECIDER=deepseek: every affordable item, the removal and leaving go to DeepSeek.
  if (!deepseekDecides(env) || (options.length < 2 && !playing)) return buildPickDecision(params);
  if (oneshot) {
    const baseline = buildPickDecision(params);
    return shopOneshot(env, { canBuy: options.length >= 2, everything, stock, removal: { price: numOrNull(removal["price"]), available: bool(removal["available"]) && !bool(removal["used"]), affordable: bool(removal["enough_gold"]), score: removalScore, why: removalWhy }, baseline, params });
  }
  return buildPickDecision({ ...params, deepseek: { facts: buildFacts(env, { shop_stock: stock }), note: "One purchase per question; you are asked again after each purchase. Pick leave to stop." } });
}

/* ---- one-shot: the whole visit in one question (BUILD_ONESHOT) ------------------------------------ */

/** One step of a shop plan, as validated when it was planned. */
export interface ShopPlanStep {
  kind: "buy" | "remove" | "discard" | "leave";
  /** The plan's own word for it: "buy_card3", "remove:c7", "discard_potion0", "leave". */
  key: string;
  name: string;
  action?: "buy_card" | "buy_relic" | "buy_potion";
  /** Stock index (buy) or belt slot (discard). */
  index?: number;
  /** Item id (buy) or potion id (discard). */
  id?: string;
  price?: number | null;
  /** The card to remove (remove). */
  card?: CardIdentity;
}

/** DeepSeek's plan for this shop visit and how far code has played it. */
export interface ShopPlan {
  ref: string;
  runId: string;
  floor: number | null;
  steps: ShopPlanStep[];
  /** Index of the next step to play. */
  next: number;
  /** Actions played for this plan so far (the plan row's first step is 1; a removal's card pick counts). */
  actions: number;
  /** The stock when planned: "buy_card3" -> id, price. Only stocked items. */
  stock: Record<string, { id: string; price: number | null }>;
  removal: { price: number | null; available: boolean };
  /** What this visit bought / removed / discarded, over every plan of it (told to DeepSeek on a re-ask). */
  done: string[];
  reason: string;
}

interface OneshotInputs {
  /** Something besides leaving is affordable (else a plan that cannot go on just leaves, unasked). */
  canBuy: boolean;
  everything: { option: PickOption; affordable: boolean; id: string; price: number | null }[];
  stock: JsonValue[];
  removal: { price: number | null; available: boolean; affordable: boolean; score: number; why: string };
  baseline: Decision;
  params: { state: Record<string, JsonValue>; actThreshold: number; strictJev: boolean };
}

/** The live stock by option key (stocked items only). */
function liveStock(shop: Record<string, unknown>): Map<string, { id: string; price: number | null; affordable: boolean; name: string }> {
  const out = new Map<string, { id: string; price: number | null; affordable: boolean; name: string }>();
  for (const [list, action] of [["relics", "buy_relic"], ["cards", "buy_card"], ["potions", "buy_potion"]] as const) {
    for (const raw of asArray(shop[list]).map(asRecord)) {
      const index = numOrNull(raw["index"]);
      const id = str(raw["card_id"]) || str(raw["relic_id"]) || str(raw["potion_id"]);
      if (index === null || !id || !bool(raw["is_stocked"], true)) continue;
      out.set(`${action}${index}`, { id, price: numOrNull(raw["price"]), affordable: bool(raw["enough_gold"]), name: str(raw["name"], id) });
    }
  }
  return out;
}

/** Occupied belt slots: slot -> potion id, name, discardable. */
function beltOf(state: GameState): { slots: number; empty: number; potions: Map<number, { id: string; name: string; canDiscard: boolean }> } {
  const belt = asArray(asRecord(state.run?.raw)["potions"]).map(asRecord);
  const potions = new Map<number, { id: string; name: string; canDiscard: boolean }>();
  belt.forEach((slot, position) => {
    if (!bool(slot["occupied"])) return;
    const id = str(slot["potion_id"]);
    potions.set(numOrNull(slot["index"]) ?? position, { id, name: str(slot["name"], id), canDiscard: bool(slot["can_discard"]) });
  });
  return { slots: belt.length, empty: belt.length - potions.size, potions };
}

/** The shop question's answer format and rules (the plan's words). */
export const SHOP_PLAN_NOTE =
  "Plan this whole shop visit in ONE answer: an ordered shopping list that code carries out step by step, re-checking each " +
  "step against the live shop. Reply with JSON only: {\"plan\": [<steps in order>], \"reason\": \"<max 40 words>\"}. A step is an option " +
  "key (buy_relicN / buy_cardN / buy_potionN), \"remove:<card key>\" to pay for the card removal and remove that card (card keys are " +
  "state.your_cards), or discard_potionN to empty a potion slot first (buying a potion needs an empty slot). Leaving is implied after " +
  "the last step; [] buys nothing. Unaffordable items are listed as facts (affordable_now false); gold only goes down in a shop, so " +
  "the whole list must fit your gold at the listed prices (check the sum). You are asked again only if the shop changes under the plan " +
  "(a price change, a restocked item, an item that cannot be bought).";

/** A plan's steps from DeepSeek's answer, validated against this state; the reason it is invalid otherwise. */
export function parseShopPlan(json: Record<string, unknown>, env: DecisionEnv): { steps: ShopPlanStep[]; reason: string } | { invalid: string } {
  const plan = json["plan"];
  if (!Array.isArray(plan)) return { invalid: 'no "plan" list in the answer' };
  const shop = asRecord(env.state.raw["shop"]);
  const stock = liveStock(shop);
  const belt = beltOf(env.state);
  const cards = deckCards(env.state, env.knowledge);
  const removal = asRecord(shop["card_removal"]);
  const steps: ShopPlanStep[] = [];
  const seen = new Set<string>();
  for (const entry of plan) {
    if (typeof entry !== "string") return { invalid: `step ${JSON.stringify(entry)} is not a string` };
    const key = entry.trim();
    if (key === "") continue;
    if (key === "leave") break;
    // An item may be named instead of keyed ("火焰屏障"): the one stocked item of that name.
    const named = [...stock].filter(([, candidate]) => candidate.name === key);
    const itemKey = stock.has(key) ? key : named.length === 1 ? named[0]![0] : null;
    if (seen.has(itemKey ?? key)) return { invalid: `step ${key} repeated` };
    seen.add(itemKey ?? key);
    const item = itemKey ? stock.get(itemKey) : undefined;
    if (itemKey && item) {
      const action = itemKey.replace(/\d+$/, "") as NonNullable<ShopPlanStep["action"]>;
      steps.push({ kind: "buy", key: itemKey, name: item.name, action, index: Number(itemKey.slice(action.length)), id: item.id, price: item.price });
      continue;
    }
    const remove = /^remove\s*[:= ]\s*(.+)$/i.exec(key);
    if (remove) {
      if (steps.some((step) => step.kind === "remove")) return { invalid: "more than one removal" };
      if (!bool(removal["available"]) || bool(removal["used"])) return { invalid: "card removal is not available" };
      // The card by its key, or by a name only one distinct card has.
      const target = remove[1]!.trim();
      const byName = cards.filter((candidate) => candidate.name === target);
      const card = cards.find((candidate) => candidate.key === target) ?? (byName.length === 1 ? byName[0] : undefined);
      if (!card) return { invalid: `${key}: no such card key in your_cards` };
      steps.push({ kind: "remove", key, name: card.name, price: numOrNull(removal["price"]), card: card.identity });
      continue;
    }
    const discard = /^discard_potion(\d+)$/.exec(key);
    if (discard) {
      const slot = Number(discard[1]);
      const potion = belt.potions.get(slot);
      if (!potion) return { invalid: `${key}: that potion slot is empty` };
      steps.push({ kind: "discard", key, name: potion.name, index: slot, id: potion.id });
      continue;
    }
    if (key === "remove") return { invalid: 'removal without a card: use "remove:<card key>"' };
    return { invalid: `unknown step ${key}` };
  }
  steps.push({ kind: "leave", key: "leave", name: "leave" });
  // The first step is played at once: it must be possible now (the later ones are checked when they come).
  const first = stepProblem(steps[0]!, env);
  if (first) return { invalid: `first step ${steps[0]!.key}: ${first}` };
  return { steps, reason: str(json["reason"]).trim() };
}

/** Why a step cannot be played on the live shop now, or null. */
function stepProblem(step: ShopPlanStep, env: DecisionEnv): string | null {
  const { state } = env;
  const shop = asRecord(state.raw["shop"]);
  const actions = state.available_actions;
  if (step.kind === "leave") return null;
  if (step.kind === "buy") {
    const item = liveStock(shop).get(step.key);
    if (!item || item.id !== step.id) return `${step.name} is no longer in stock`;
    if (item.price !== step.price) return `${step.name}'s price changed (${step.price ?? "?"} -> ${item.price ?? "?"})`;
    if (!item.affordable) return `${step.name} (${item.price ?? "?"}g) is not affordable with ${state.run?.gold ?? "?"} gold`;
    if (step.action === "buy_potion" && beltOf(state).empty <= 0) return "no empty potion slot for it";
    if (!actions.includes(step.action!)) return `${step.action} is not available`;
    return null;
  }
  if (step.kind === "remove") {
    const removal = asRecord(shop["card_removal"]);
    if (!bool(removal["available"]) || bool(removal["used"])) return "card removal is no longer available";
    if (numOrNull(removal["price"]) !== step.price) return `the removal's price changed (${step.price ?? "?"} -> ${numOrNull(removal["price"]) ?? "?"})`;
    if (!bool(removal["enough_gold"])) return `the removal (${step.price ?? "?"}g) is not affordable with ${state.run?.gold ?? "?"} gold`;
    if (!deckCards(state, env.knowledge).some((card) => sameCard(card.raw, step.card!))) return `${step.name} is not in the deck`;
    if (!actions.includes("remove_card_at_shop")) return "remove_card_at_shop is not available";
    return null;
  }
  const potion = beltOf(state).potions.get(step.index!);
  if (!potion || potion.id !== step.id) return `${step.name} is not in potion slot ${step.index}`;
  if (!potion.canDiscard || !actions.includes("discard_potion")) return `${step.name} cannot be discarded here`;
  return null;
}

/** What changed in the shop that the plan did not do (a price, a restock, an item gone), or null. */
function stockDrift(memo: ShopPlan, env: DecisionEnv): string | null {
  const shop = asRecord(env.state.raw["shop"]);
  const live = liveStock(shop);
  const bought = new Set(memo.steps.slice(0, memo.next).filter((step) => step.kind === "buy").map((step) => step.key));
  for (const [key, was] of Object.entries(memo.stock)) {
    const now = live.get(key);
    if (bought.has(key)) {
      if (now) return `${key} was restocked with ${now.name} (${now.price ?? "?"}g)`;
      continue;
    }
    if (!now) return `${key} (${was.id}) is gone`;
    if (now.id !== was.id) return `${key} changed from ${was.id} to ${now.name}`;
    if (now.price !== was.price) return `${now.name}'s price changed (${was.price ?? "?"} -> ${now.price ?? "?"}g)`;
  }
  for (const [key, now] of live) if (!(key in memo.stock)) return `${key} appeared: ${now.name} (${now.price ?? "?"}g)`;
  const removal = asRecord(shop["card_removal"]);
  const removed = memo.steps.slice(0, memo.next).some((step) => step.kind === "remove");
  if (!removed && memo.removal.available && numOrNull(removal["price"]) !== memo.removal.price) return `the removal's price changed (${memo.removal.price ?? "?"} -> ${numOrNull(removal["price"]) ?? "?"}g)`;
  return null;
}

/** The intent of a step, its log label and a description. */
function stepAction(step: ShopPlanStep): { label: string; intent: ActionRequest; text: string } {
  switch (step.kind) {
    case "buy":
      return { label: "shop/buy", intent: { action: step.action!, option_index: step.index! }, text: `buy ${step.name} (${step.price ?? "?"}g)` };
    case "remove":
      return { label: "shop/buy", intent: { action: "remove_card_at_shop" }, text: `pay ${step.price ?? "?"}g to remove ${step.name}` };
    case "discard":
      return { label: "shop/discard", intent: { action: "discard_potion", option_index: step.index! }, text: `discard ${step.name}` };
    default:
      return { label: "shop/buy", intent: { action: "close_shop_inventory" }, text: "stop shopping" };
  }
}

/** Plays one step: the plan's bookkeeping, and for a removal the card named for the selection screen. */
function advance(env: DecisionEnv, memo: ShopPlan, step: ShopPlanStep): void {
  memo.next += 1;
  memo.actions += 1;
  if (step.kind !== "leave") memo.done.push(stepAction(step).text);
  if (step.kind === "remove" && step.card) {
    env.screenMemory.pendingPick = { ref: memo.ref, runId: memo.runId, floor: memo.floor, source: "shop", task: "remove", cards: [step.card], names: [step.name], step: memo.actions + 1 };
  }
}

function shopOneshot(env: DecisionEnv, inputs: OneshotInputs): Decision {
  const { state } = env;
  const runId = str(state.raw["run_id"]);
  const floor = state.run?.floor ?? null;
  const memo = env.screenMemory.shopPlan && env.screenMemory.shopPlan.runId === runId && env.screenMemory.shopPlan.floor === floor ? env.screenMemory.shopPlan : null;
  let replan: string | null = null;
  if (memo) {
    const step = memo.steps[memo.next];
    if (!step) {
      // The plan was played to its end and the inventory is still open: close it.
      return { kind: "act", label: "shop/buy", intent: { action: "close_shop_inventory" }, rationale: `DeepSeek plan ${memo.ref} is done: closing the shop` };
    }
    replan = stockDrift(memo, env) ?? stepProblem(step, env);
    if (replan && !inputs.canBuy) {
      return { kind: "act", label: "shop/buy", intent: { action: "close_shop_inventory" }, rationale: `DeepSeek plan ${memo.ref} cannot go on (${replan}) and nothing else is affordable: leaving` };
    }
    if (!replan) {
      const { label, intent, text } = stepAction(step);
      return {
        kind: "act",
        label,
        intent,
        rationale: `DeepSeek plan ${memo.ref} step ${memo.actions + 1}: ${text}`,
        plan: { ref: memo.ref, step: memo.actions + 1, choice: step.key },
        apply: () => advance(env, memo, step),
      };
    }
  }
  return shopPlanQuestion(env, inputs, memo, replan);
}

/** The one question for the visit (or its re-ask after the shop changed under the plan). */
function shopPlanQuestion(env: DecisionEnv, inputs: OneshotInputs, previous: ShopPlan | null, replan: string | null): Decision {
  const { state, knowledge } = env;
  const shop = asRecord(state.raw["shop"]);
  const gold = state.run?.gold ?? 0;
  const belt = beltOf(state);
  const cards = deckCards(state, knowledge);
  const ref = nextPlanRef(env, "shop");
  const options: PickOption[] = inputs.everything.map(({ option, affordable, price }) => ({
    ...option,
    summary: { ...(option.summary as Record<string, JsonValue>), affordable_now: affordable && price !== null && price <= gold },
  }));
  if (inputs.removal.available) {
    options.push({
      key: "remove",
      label: `pay ${inputs.removal.price ?? "?"}g to remove a card`,
      intent: { action: "remove_card_at_shop" },
      score: inputs.removal.score,
      why: inputs.removal.why,
      summary: { buy: "card removal", kind: "service", price: inputs.removal.price, affordable_now: inputs.removal.affordable, text: 'removes one card from the deck: write "remove:<card key>" with the card from state.your_cards' },
    });
  }
  for (const [slot, potion] of belt.potions) {
    if (!potion.canDiscard) continue;
    options.push({ key: `discard_potion${slot}`, label: `discard ${potion.name}`, intent: { action: "discard_potion", option_index: slot }, score: -1, why: "frees a potion slot (worth nothing by itself)", summary: { discard: potion.name, slot } });
  }
  options.push({ key: "leave", label: "stop shopping", intent: { action: "close_shop_inventory" }, score: 0, why: "the bar: anything scoring below 0 is worse than leaving", summary: { end: "stop shopping (implied after the last step)" } });

  const yourCards: Record<string, JsonValue> = Object.fromEntries(cards.map((card) => [card.key, cardLine(card)]));
  // Code's removal order over the removable cards (the ranking the removal screen showed), best first.
  const removalScore = followUpTargetScore(env, "remove");
  const removalOrder = cards
    .filter((card) => !card.eternal)
    .map((card) => ({ card, ranked: removalScore(card) }))
    .sort((a, b) => b.ranked.score - a.ranked.score)
    .map(({ card, ranked }) => `${card.key} ${card.name} ${ranked.score}`);
  const removalFacts: Record<string, JsonValue> = inputs.removal.available ? { price: inputs.removal.price, affordable_now: inputs.removal.affordable } : { available: false };
  const params = {
    label: "shop/plan",
    instructions: "What should I buy in this shop, in what order?",
    actThreshold: inputs.params.actThreshold,
    strictJev: inputs.params.strictJev,
    options,
    state: {
      // The step-by-step question's note ("one purchase per decision") does not apply to a plan.
      ...Object.fromEntries(Object.entries(inputs.params.state).filter(([key]) => key !== "note")),
      situation: { screen: "SHOP", gold, hp: env.brief.hp, potion_slots: `${belt.slots - belt.empty}/${belt.slots} used` },
      your_cards: yourCards,
      ...(inputs.removal.available && cards.length > 0 ? { code_removal_order: { order: removalOrder, why: removalScore(cards[0]!).why } } : {}),
      ...(previous ? { already_done_this_visit: previous.done } : {}),
      ...(replan ? { replan_reason: `the shop changed under your plan: ${replan}` } : {}),
    },
  };
  const memoFrom = (steps: ShopPlanStep[], reason: string): ShopPlan => ({
    ref,
    runId: str(state.raw["run_id"]),
    floor: state.run?.floor ?? null,
    steps,
    next: 0,
    actions: 0,
    stock: Object.fromEntries([...liveStock(shop)].map(([key, item]) => [key, { id: item.id, price: item.price }])),
    removal: { price: inputs.removal.price, available: inputs.removal.available },
    done: previous ? [...previous.done] : [],
    reason,
  });
  const built = buildPickDecision({
    ...params,
    deepseek: {
      facts: buildFacts(env, { shop_stock: inputs.stock, card_removal: removalFacts, potion_belt: `${belt.empty} of ${belt.slots} slots empty` }),
      note: SHOP_PLAN_NOTE,
      baseline: inputs.baseline,
      oneshot: { fallback: () => (env.screenMemory.oneshotFailed = visitKey(env, "shop")) },
      // The removal's candidates (what the removal screen offered before).
      offeredCards: inputs.removal.available ? [...new Set(cards.filter((card) => !card.eternal).map((card) => card.identity.card_id))] : [],
    },
  });
  if (built.kind !== "ask" || !built.deepseek) return built;
  return {
    ...built,
    deepseek: {
      ...built.deepseek,
      plan: {
        resolve(json): ResolvedAction | { invalid: string } {
          const parsed = parseShopPlan(json, env);
          if ("invalid" in parsed) return parsed;
          const memo = memoFrom(parsed.steps, parsed.reason);
          const first = parsed.steps[0]!;
          const { intent, text } = stepAction(first);
          const list = parsed.steps.map((step) => stepAction(step).text).join(", ");
          return {
            intent,
            rationale: `plan ${ref}: ${list}; step 1: ${text}`,
            confidence: null,
            fallback: false,
            decider: "deepseek",
            plan: { id: ref, steps: parsed.steps.map((step) => step.key) },
            journal: `shop plan: ${list}`,
            apply: () => {
              env.screenMemory.shopPlan = memo;
              usePlanRef(env.screenMemory, memo.runId);
              advance(env, memo, first);
            },
          };
        },
      },
    },
  };
}

/**
 * A shop potion for DeepSeek: with an empty slot, code_value = the HP it is expected to save in the act
 * boss fight - price/25 (the card's gold rate); an effect the model does not cover counts 0 HP. With no
 * empty slot the old score stands and the fact says a discard comes first. Facts, not a purchase rule.
 */
export function shopPotionValue(
  potionId: string,
  price: number | null,
  empty: number,
  slots: number,
  oldScore: number,
  env: DecisionEnv,
): { score: number; why: string; facts: Record<string, JsonValue> } {
  const cost = price ?? 150;
  const slotFact = empty > 0 ? `${empty} of ${slots} potion slots empty` : `no empty potion slot (${slots} full): buying needs a discard first`;
  if (empty <= 0) return { score: oldScore, why: `potion: ${slotFact}`, facts: { potion_slots: slotFact } };
  const worth = potionId === "FOUL_POTION" ? null : potionHpSaved(potionId, env.state, env.knowledge);
  if (!worth) {
    return {
      score: -cost / 25,
      why: `potion: ${slotFact}; its HP effect is not modelled by code (counted 0 HP), so code_value is only -price/25`,
      facts: { potion_slots: slotFact, expected_hp_saved_in_boss: "not modelled" },
    };
  }
  const hp = Math.round(worth.hp * 10) / 10;
  return {
    score: worth.hp - cost / 25,
    why: `potion: ${slotFact}; expected ~${hp} HP saved in the act boss fight (${worth.why}); code_value = ${hp} - price/25`,
    facts: { potion_slots: slotFact, expected_hp_saved_in_boss: `~${hp} HP: ${worth.why}` },
  };
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
