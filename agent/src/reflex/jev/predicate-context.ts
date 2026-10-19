import type { GameState } from "../../hand/mod/schema.js";
import type { Plan } from "../turn-solver.js";
import { plain, safeKey } from "../../v6/schema.js";

type Row = Record<string, unknown>;
export interface PredicateFacts { context: Row; sources: Record<string, string>; unavailable: Record<string, string> }
export interface CombatPredicateRuntime { slAttempt?: number }
/** The 32 proposals from the frozen v6-reflex-distill report, without game interpretations. */
export const REFLEX_GAP_FIELDS = [
  "enemy.id", "enemy.hp", "enemy.move_id", "enemies.alive", "card.id", "card.upgraded", "card.cost", "card.can_play",
  "option.actions", "player.hand", "player.piles", "player.deck", "player.relics", "player.relic_counters",
  "potion.id", "potion.usable", "potion.slots", "turn", "option.future", "sl.attempt", "history.first_predicted_death",
  "history.resource_handoff", "player.max_hp", "room.kind", "rest.options", "shop.stock", "shop.prices", "player.gold",
  "option.kind", "option.model_version", "option.trust", "option.complete_line",
] as const;
const row = (v: unknown): Row => plain(v) ? v : {};
const n = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : undefined;
const s = (v: unknown) => typeof v === "string" && v.length > 0 ? v : undefined;
const b = (v: unknown) => typeof v === "boolean" ? v : undefined;
const rows = (v: unknown): Row[] | undefined => Array.isArray(v) && v.length <= 1000 && v.every(plain) ? v : undefined;
const compact = (v: Row): Row => Object.fromEntries(Object.entries(v).filter(([, value]) => value !== undefined));
function set(root: Row, path: string, value: unknown): void {
  const parts = path.split("."); let current = root;
  for (const part of parts.slice(0, -1)) { if (!plain(current[part])) current[part] = {}; current = current[part] as Row; }
  current[parts.at(-1)!] = value;
}
function facts(context: Row = {}): PredicateFacts { return { context, sources: {}, unavailable: {} }; }
function put(f: PredicateFacts, path: string, value: unknown, source: string, reason = "source_missing_or_invalid"): void {
  if (value === undefined || value === null) f.unavailable[path] = reason;
  else { set(f.context, path, value); f.sources[path] = source; }
}
function powers(value: unknown): Row {
  return Object.fromEntries((rows(value) ?? []).filter(p => s(p["power_id"]) && safeKey(String(p["power_id"])) && n(p["amount"]) !== undefined)
    .map(p => [String(p["power_id"]), p["amount"]]));
}
/** No current hand legality is copied onto a predicted later action or a deck/pile card. */
function card(value: Row): Row {
  return compact({ id: s(value["card_id"]), index: n(value["index"]), upgraded: b(value["upgraded"]),
    cost: n(value["energy_cost"]), can_play: b(value["can_play_result"]) });
}
function potion(value: Row): Row {
  return compact({ id: s(value["potion_id"]), index: n(value["index"]), usable: b(value["can_use"]), occupied: b(value["occupied"]) });
}
function enemy(value: Row): Row {
  const intents = rows(value["intents"]), intent = intents?.length === 1 ? intents[0] : undefined;
  const damage = n(intent?.["damage"]), hits = n(intent?.["hits"]);
  return compact({ id: s(value["enemy_id"]), hp: n(value["current_hp"]), move_id: s(value["move_id"]),
    alive: b(value["is_alive"]), index: n(value["index"]), intent_type: s(intent?.["intent_type"]), hits,
    total_damage: damage !== undefined && hits !== undefined ? damage * hits : undefined, powers: powers(value["powers"]) });
}

/** Read the current observed frame only. Missing facts never become false, zero or empty collections. */
export function combatPredicateFacts(state: GameState, runtime: CombatPredicateRuntime = {}): PredicateFacts {
  const f = facts(), combat = row(state.raw["combat"]), player = row(combat["player"]), run = row(state.run?.raw);
  const add = (path: string, value: unknown, source: string, reason?: string) => put(f, path, value, source, reason);
  const actId = state.run?.act_id;
  add("act", actId != null && /^\d+$/.test(actId) ? Number(actId) + 1 : undefined, "state.run.act_id + 1");
  add("floor", n(state.run?.floor), "state.run.floor"); add("turn", n(state.turn), "state.turn");
  for (const [dto, raw] of [["hp", "current_hp"], ["max_hp", "max_hp"], ["block", "block"], ["energy", "energy"]])
    add(`player.${dto}`, n(player[raw!]), `state.raw.combat.player.${raw}`);
  add("player.gold", n(run["gold"]), "state.run.raw.gold");
  add("player.powers", powers(player["powers"]), "state.raw.combat.player.powers[power_id,amount]");
  const allEnemies = rows(combat["enemies"]);
  add("enemies.items", allEnemies?.map(enemy), "state.raw.combat.enemies (one DTO per entity)");
  add("enemies.alive", allEnemies?.every(e => b(e["is_alive"]) !== undefined) ? allEnemies.filter(e => e["is_alive"] === true).length : undefined,
    "state.raw.combat.enemies[*].is_alive", "not_all_enemies_have_explicit_liveness");
  // A singular enemy exists only when every entity has known liveness and exactly one is alive.
  const living = allEnemies?.every(e => b(e["is_alive"]) !== undefined) ? allEnemies.filter(e => e["is_alive"] === true) : [];
  const only = living.length === 1 ? enemy(living[0]!) : undefined;
  for (const key of ["id", "hp", "move_id", "alive", "index", "intent_type", "hits", "total_damage", "powers"])
    add(`enemy.${key}`, only?.[key], "state.raw.combat.enemies[sole explicitly living enemy]", "no_unique_explicitly_living_enemy_or_field_missing; use enemies.items quantifier");
  add("player.hand", rows(combat["hand"])?.map(card), "state.raw.combat.hand[card_id,upgraded,energy_cost,can_play_result]");
  add("player.deck", rows(run["deck"])?.map(card), "state.run.raw.deck (current deck; no final-deck backfill)");
  const relics = rows(run["relics"]);
  add("player.relics", relics?.every(r => s(r["relic_id"])) ? relics.map(r => r["relic_id"]) : undefined, "state.run.raw.relics[*].relic_id");
  if (relics) {
    const counters = Object.fromEntries(relics.filter(r => s(r["relic_id"]) && safeKey(String(r["relic_id"])) && n(r["stack"]) !== undefined)
      .map(r => [String(r["relic_id"]), r["stack"]]));
    add("player.relic_counters", counters, "state.run.raw.relics[relic_id,stack]; null stacks omitted");
    for (const relic of relics) if (s(relic["relic_id"]) && safeKey(String(relic["relic_id"])))
      add(`player.relic_counters.${relic["relic_id"]}`, n(relic["stack"]), "state.run.raw.relics[relic_id].stack", "stack_null_or_missing; not_zero");
  } else add("player.relic_counters", undefined, "state.run.raw.relics");
  add("potion.slots", rows(run["potions"])?.map(potion), "state.run.raw.potions (including explicitly empty slots)");
  const view = row(row(state.raw["agent_view"])["combat"]), piles: Row = {};
  for (const which of ["draw", "discard", "exhaust"]) {
    const grouped = rows(view[which]);
    const values = grouped?.map(g => {
      const ids = Array.isArray(g["card_ids"]) && g["card_ids"].every(id => typeof id === "string") ? g["card_ids"] as string[] : undefined;
      return compact({ id: ids?.length === 1 ? ids[0] : undefined, ids, line: s(g["line"]) });
    });
    if (values) piles[which] = values;
    add(`player.piles.${which}`, values, `state.raw.agent_view.combat.${which} (grouped summaries, not physical cards)`, "pile_summary_absent_or_invalid; never deck_minus_hand");
    f.unavailable[`player.piles.${which}.card_details`] = "grouped_lines_do_not_publish_entity_count_upgrade_cost_or_legality; no_text_inference";
  }
  add("player.piles", Object.keys(piles).length ? piles : undefined, "state.raw.agent_view.combat.{draw,discard,exhaust}");
  add("sl.attempt", n(runtime.slAttempt), "DecisionEnv.sl.attempt", "SL_env_only_exists_on_retries; absence_does_not_certify_attempt_1");
  add("rest.options", rows(row(state.raw["rest"])["options"])?.map(r => compact({ id: s(r["option_id"]), enabled: b(r["is_enabled"]) })), "state.raw.rest.options[option_id,is_enabled]", "no_rest_snapshot_on_this_frame");
  const shop = row(state.raw["shop"]), stock: Row[] = [], prices: Row = {};
  let shopComplete = Object.keys(shop).length > 0;
  for (const kind of ["card", "relic", "potion"]) {
    const items = rows(shop[`${kind}s`]);
    if (!items) shopComplete = false;
    for (const item of items ?? []) {
      const index = n(item["index"]), price = n(item["price"]);
      stock.push(compact({ kind, index, id: s(item[`${kind}_id`]), stocked: b(item["is_stocked"]), price }));
      if (index !== undefined && price !== undefined) prices[`${kind}:${index}`] = price;
    }
  }
  const removalPrice = n(row(shop["card_removal"])["price"]);
  if (removalPrice !== undefined) prices["card_removal"] = removalPrice;
  add("shop.stock", shopComplete ? stock : undefined, "state.raw.shop.{cards,relics,potions}", "no_complete_shop_snapshot_on_this_frame");
  add("shop.prices", shopComplete ? prices : undefined, "state.raw.shop.{cards,relics,potions}[*].price + card_removal.price", "no_complete_shop_snapshot_on_this_frame");
  const reasons: Record<string, string> = {
    "card.id": "no_singular_card_in_a_combat_line; bind card with any/all over hand/deck/piles/actions",
    "card.upgraded": "same_entity_binding_required; deck_or_pile_legality_not_inferred",
    "card.cost": "same_entity_binding_required; only explicit energy_cost, X/star payment not inferred",
    "card.can_play": "same_entity_binding_required; explicit can_play_result only, current frame not later steps",
    "potion.id": "no_singular_potion_in_a_combat_line; bind potion.slots or option.actions",
    "potion.usable": "same_entity_binding_required; explicit can_use only, no future legality inference",
    "history.first_predicted_death": "no_authoritative_first_death_history_in_DecisionEnv; current_lethal_flag_is_not_history",
    "history.resource_handoff": "no_observed_cross_fight_resource_ledger_in_DecisionEnv; simulation_is_not_actual_handoff",
    "room.kind": "state_screen_and_fight_difficulty_do_not_publish_actual_room_kind",
  };
  Object.assign(f.unavailable, reasons);
  return f;
}

/** Candidate facts describe planned actions, never actions already executed or certified continuations. */
export function combatOptionFacts(plan: Plan | null, future: { rollout: Row; whole_fight: Row }): PredicateFacts {
  const f = facts();
  put(f, "option.kind", "combat_line", "combatEntryAudit: candidate type");
  if (plan) {
    const actions = plan.steps.map((step, index) => {
      const isPotion = step.cardId.startsWith("POTION:");
      const slot = step.cardId.split(":")[2];
      return compact({ index, kind: isPotion ? "potion" : "card", target: n(step.target), cost: n(step.cost), discards: step.discards,
        ...(isPotion ? { potion: compact({ id: s(step.cardId.split(":")[1]), index: slot && /^\d+$/.test(slot) ? n(Number(slot)) : undefined }) }
          : { card: compact({ id: s(step.pileCard?.cardId ?? (step.cardId.startsWith("GEN:") ? undefined : step.cardId)),
            upgraded: b(step.pileCard?.upgraded ?? step.upgraded), cost: n(step.cost), index: n(step.cardIndex) }) }) });
    });
    put(f, "option.actions", actions, "Plan.steps (ordered predicted plays; index starts at 0)");
    const outcome = plan.outcome;
    for (const [dto, raw] of [["damage", "damageDealt"], ["block", "blockGained"], ["hp_loss", "hpLoss"],
      ["energy_left", "energyLeft"], ["cards_drawn", "cardsDrawn"]] as const)
      put(f, `option.turn.${dto}`, n(outcome[raw]), `Plan.outcome.${raw}`);
  } else f.unavailable["option.actions"] = "unmodelled_candidate_has_no_plan_steps; not_an_empty_line";
  const summaries: Row = {};
  for (const kind of ["rollout", "whole_fight"] as const) {
    const source = future[kind];
    if (source["status"] === "conditional_model" && (n(source["samples"]) ?? 0) > 0)
      summaries[kind] = Object.fromEntries(["horizon_turns", "samples", "further_hp_loss", "win_probability"]
        .filter(key => n(source[key]) !== undefined).map(key => [key, source[key]]));
  }
  put(f, "option.future", Object.keys(summaries).length ? summaries : undefined, "v6_combat_entry.{rollout,whole_fight} numeric conditional summaries", "no_sampled_conditional_future; clock_fallback_is_not_a_rollout");
  const trust = row(future.whole_fight["trust"])["level"];
  put(f, "option.trust", summaries["whole_fight"] && ["trusted", "low"].includes(String(trust)) ? trust : undefined,
    "v6_combat_entry.whole_fight.trust.level (existing boss quality gate)", "no_whole_fight_quality_gate_for_this_candidate; rollout_trust_unknown");
  f.unavailable["option.model_version"] = "source_rollout_and_boss_DTOs_do_not_expose_model_SHA; source_name_is_not_version";
  f.unavailable["option.complete_line"] = "Plan_steps_and_sample_counts_do_not_certify_random_draw_or_discard_continuation_completeness";
  return f;
}
