/** W7 inventory changes are explicit options; no game-value heuristics live here. */
import { asArray, asRecord, bool, numOrNull, str, toJsonValue, type JsonValue } from "../../core/util/json.js";
import type { DecisionEnv } from "../../memory/types.js";
import { deckBudgetProblem } from "../../memory/run-constraints.js";
import { constructionOptions, constructionState } from "../../construction/adapter.js";
import { deckEntries } from "../../memory/deck.js";
import type { V6ProjectionChange } from "../../sim/v6-request-factory.js";
import type { BuildState } from "../../construction/types.js";
import { v6Config } from "../../v6/config.js";
import { potionEntries } from "../../v6/potion-entries.js";
import { deckCards, nextPlanRef, selectableCards, unverifiedRemovalPreview, withFollowUp, type DeckFollowUp } from "./oneshot.js";
import { discardableSlots, discardVariant, givesPotion, potionSlotsNeeded } from "./potion-discard.js";
import type { PickOption } from "./pick.js";

export type V6RoomKind = "shop" | "rest";
export interface V6RoomOption { option: PickOption; state: BuildState | null; changes: V6ProjectionChange[] | null; unknown_reason: string | null }
export interface V6RoomOptions { kind: V6RoomKind; baseline: BuildState | null; options: V6RoomOption[] }
export function v6RoomActive(env: DecisionEnv, kind: V6RoomKind): boolean {
  const config = v6Config();
  return config.mode === "on" && config.deciders[kind] === "jev" && !env.state.in_combat;
}

/** Missing inventory resources cannot become fabricated zero-valued projection inputs. */
function initialState(env: DecisionEnv): BuildState | null {
  const raw = asRecord(env.state.run?.raw);
  if (!Array.isArray(raw.deck) || !Array.isArray(raw.relics)
    || [env.state.run?.current_hp, env.state.run?.max_hp, env.state.run?.gold, env.state.run?.floor].some(n => typeof n !== "number" || !Number.isFinite(n))) return null;
  if (asArray(raw.deck).some(c => !str(asRecord(c).card_id) || typeof asRecord(c).upgraded !== "boolean")
    || asArray(raw.relics).some(r => !str(asRecord(r).relic_id))) return null;
  return constructionState(env);
}
function modeled(env: DecisionEnv, kind: V6RoomKind, options: PickOption[], baseline: BuildState | null): V6RoomOptions {
  // Reuse the existing inventory adapter, without sending this temporary carrier to a brain.
  const changes = baseline ? constructionOptions({ kind: "ask", label: `${kind}/v6`, state: {}, questions: {}, resolve: () => ({ intent: null, rationale: "carrier", confidence: null, fallback: true }),
    deepseek: { question: "pick", baseline: { kind: "act", label: "carrier", intent: { action: "proceed" }, rationale: "carrier" }, options: () => options } }, env, baseline) : [];
  return { kind, baseline, options: options.map(option => {
    const projection = changes.find(c => c.key === option.key);
    let state = option.intent.action === "buy_card" && asRecord(option.summary).upgraded === null ? null : projection?.state ?? null;
    const summary = asRecord(option.summary), price = numOrNull(summary.price), intent = option.intent;
    let operations: V6ProjectionChange[] | null = null;
    if (baseline) {
      if (option.key === "leave") operations = [{ kind: "skip" }];
      else if (intent.action === "buy_card" && state && price !== null) operations = [{ kind: "add", price,
        card: state.cards[baseline.cards.length]!, copies: state.cards.length - baseline.cards.length }];
      else if (intent.action === "remove_card_at_shop" || kind === "rest" && summary.kind === "SMITH") {
        const key = /(?:^|:)c(\d+)$/.exec(option.key)?.[1];
        const index = key === undefined ? -1 : deckEntries(env.state, env.knowledge).findIndex(c => c.index === Number(key));
        const cost = kind === "rest" ? 0 : price;
        if (state && index >= 0 && cost !== null) operations = [{ kind: kind === "rest" ? "upgrade" : "remove", index, price: cost }];
      } else if (kind === "rest" && summary.kind === "HEAL" && state && state.maxHp === baseline.maxHp
        && !givesPotion(str(summary.description))) {
        operations = [{ kind: "heal", amount: state.hp - baseline.hp, price: 0 }];
      } else if (kind === "shop" && (intent.action === "buy_potion" || intent.action === "discard_potion")) {
        const belt = asArray(asRecord(env.state.run?.raw).potions).map(asRecord);
        const identified = belt.every(p => Number.isSafeInteger(p.index) && Number(p.index) >= 0)
          && new Set(belt.map(p => p.index)).size === belt.length;
        const slot = identified ? belt.find(p => intent.action === "buy_potion" ? p.occupied === false
          : p.occupied === true && p.index === intent.option_index) : undefined;
        const row = asArray(asRecord(env.state.raw.shop).potions).map(asRecord).find(p => p.index === intent.option_index);
        const cost = intent.action === "discard_potion" ? 0 : price;
        if (slot && cost !== null && (intent.action === "discard_potion" || row && str(row.potion_id))) {
          operations = [{ kind: "potion", slot: Number(slot.index), value: intent.action === "discard_potion" ? null : { ...row! }, price: cost }];
          state = { ...structuredClone(baseline), gold: baseline.gold - cost };
        }
      }
    }
    // An unsupported action never reaches the common factory as an unchanged-deck substitute.
    if (!operations) state = null;
    return { option, state, changes: operations, unknown_reason: operations ? null
      : !baseline ? "actual_inventory_resources_missing"
      : kind === "rest" && summary.kind === "HEAL" && givesPotion(str(summary.description)) ? "rest_potion_outcome_unknown"
      : projection?.why ?? "inventory_change_not_modeled" };
  }) };
}

function expand(env: DecisionEnv, option: PickOption, task: "remove" | "upgrade", kind: V6RoomKind): PickOption[] {
  const cards = deckCards(env.state, env.knowledge), follow: DeckFollowUp = { task, count: 1, upTo: false, text: task };
  const preview = selectableCards(env.state, cards, follow);
  if (!preview.listed.length) return [];
  return withFollowUp(env, option, follow, cards, nextPlanRef(env, kind), kind, () => ({ score: 0 })).map(pick => {
    const plan = pick.plan;
    if (kind !== "shop" || task !== "remove" || !plan || !unverifiedRemovalPreview(env.state)) return pick;
    return { ...pick, plan: answer => {
      const result = plan(answer);
      if (!result || "invalid" in result) return result;
      return { ...result, apply: () => {
        result.apply?.();
        if (env.screenMemory.pendingPick) {
          env.screenMemory.pendingPick.selectionPreview = preview.preview;
          env.screenMemory.selectionPreviewMismatch = undefined;
        }
      } };
    } };
  });
}

/** The early return performs no knowledge reads and does not construct a new legacy question. */
export function v6ShopOptions(env: DecisionEnv): V6RoomOptions | null {
  if (!v6RoomActive(env, "shop")) return null;
  const raw = asRecord(env.state.raw.shop), actions = env.state.available_actions;
  if (!bool(raw.is_open)) return null;
  const baseline = initialState(env), options: PickOption[] = [];
  const belt = asArray(asRecord(env.state.run?.raw).potions).map(asRecord);
  const free = belt.some(slot => slot.occupied === false);
  for (const [field, action] of [["cards", "buy_card"], ["relics", "buy_relic"], ["potions", "buy_potion"]] as const) {
    if (!actions.includes(action)) continue;
    for (const row of asArray(raw[field]).map(asRecord)) {
      const index = numOrNull(row.index), price = numOrNull(row.price);
      if (index === null || !Number.isInteger(index) || index < 0 || !bool(row.is_stocked, true) || !bool(row.enough_gold)) continue;
      const id = str(row.card_id) || str(row.relic_id) || str(row.potion_id);
      if (!id || price !== null && (price < 0 || env.state.run?.gold != null && price > env.state.run.gold)) continue;
      if (action === "buy_potion" && !free) continue;
      const option: PickOption = { key: `${action}${index}`, intent: { action, option_index: index }, score: 0,
        label: `${action} ${id}`, summary: toJsonValue({ kind: action, id, upgraded: typeof row.upgraded === "boolean" ? row.upgraded : null,
          price, text: row.resolved_rules_text ?? row.description ?? null,
          ...(action === "buy_potion" ? { potion_entries: potionEntries(env, [id], price === null ? {} : { prices: { [id]: price } }) } : {}) }) };
      if (!deckBudgetProblem(env.state, option.intent)) options.push(option);
    }
  }
  const removal = asRecord(raw.card_removal);
  if (actions.includes("remove_card_at_shop") && bool(removal.available) && !bool(removal.used) && bool(removal.enough_gold)) {
    const price = numOrNull(removal.price);
    if (price === null || price >= 0 && (env.state.run?.gold == null || price <= env.state.run.gold)) options.push(...expand(env,
      { key: "remove", intent: { action: "remove_card_at_shop" }, score: 0, label: "remove a deck card", summary: { price, kind: "remove" } }, "remove", "shop"));
  }
  if (asArray(raw.potions).some(p => bool(asRecord(p).is_stocked, true) && bool(asRecord(p).enough_gold))) {
    for (const slot of discardableSlots(env)) options.push({ key: `discard_potion${slot.index}`, intent: { action: "discard_potion", option_index: slot.index }, score: 0,
      label: `discard ${slot.name}`, summary: toJsonValue({ kind: "discard_potion", id: slot.id ?? null, slot: slot.index,
        note: "Re-read the shop after discarding; this does not commit to a purchase.", potion_entries: potionEntries(env, [slot.id ?? "unknown"]) }) });
  }
  if (actions.includes("close_shop_inventory")) options.push({ key: "leave", intent: { action: "close_shop_inventory" }, score: 0, summary: "Leave without buying anything" });
  else if (actions.includes("proceed")) options.push({ key: "leave", intent: { action: "proceed" }, score: 0, summary: "Leave without buying anything" });
  return options.length ? modeled(env, "shop", options, baseline) : null;
}

export function v6RestOptions(env: DecisionEnv): V6RoomOptions | null {
  if (!v6RoomActive(env, "rest")) return null;
  const options: PickOption[] = [];
  if (!env.state.available_actions.includes("choose_rest_option")) return null;
  for (const row of asArray(asRecord(env.state.raw.rest).options).map(asRecord)) {
    const index = numOrNull(row.index);
    if (!bool(row.is_enabled) || index === null || !Number.isInteger(index) || index < 0) continue;
    const kind = str(row.option_id).toUpperCase(), title = str(row.title, kind);
    const targets = bool(row.requires_target) ? asArray(row.valid_target_indices).filter((n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0) : [null];
    for (const target of targets) {
      const option: PickOption = { key: `o${index}${target === null ? "" : `:t${target}`}`, score: 0, label: `${title}${target === null ? "" : ` target ${target}`}`,
        intent: { action: "choose_rest_option", option_index: index, ...(target === null ? {} : { target_index: target }) },
        summary: toJsonValue({ kind, title, description: row.description ?? null, target }) };
      if (kind === "SMITH") { options.push(...expand(env, option, "upgrade", "rest")); continue; }
      const need = potionSlotsNeeded(str(row.description), env.state.run?.raw);
      // The existing continuation cannot retain a targeted rest option.
      const variant = target === null ? discardVariant(env, option, { place: "rest", option: index, title }, need, discardableSlots(env)) : null;
      options.push({ ...option, summary: { ...asRecord(option.summary), potions_lost_without_discard: need } as JsonValue });
      if (variant) options.push(variant);
    }
  }
  return options.length ? modeled(env, "rest", options, initialState(env)) : null;
}
