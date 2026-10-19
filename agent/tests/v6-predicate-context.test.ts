import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { evaluatePredicate, validatePredicate } from "../src/v6/predicate.js";
import { validateReflexEntry } from "../src/v6/formats.js";
import { combatPredicateFacts, combatOptionFacts, REFLEX_GAP_FIELDS } from "../src/reflex/jev/predicate-context.js";
import { combatEntryAudit, loadCombatEntries } from "../src/reflex/jev/combat-entries.js";
import { fixedState, fixedPlan, fixedBoss, fixedRollout, installFixture } from "./v6-combat-fixtures.js";
import { reflex } from "./v6-fixtures.js";

const directories: string[] = [];
afterEach(() => directories.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })));
const eq = (field: string, value: string | number | boolean) => ({ op: "eq", field, value });
const and = (...args: unknown[]) => ({ op: "and", args });
const any = (field: string, arg: unknown) => ({ op: "any", field, arg });
function observed() {
  const state = fixedState(), raw = state.raw as any;
  raw.combat.enemies = [
    { index: 0, enemy_id: "TEST_A", current_hp: 0, is_alive: false, move_id: "OLD" },
    { index: 1, enemy_id: "TEST_B", current_hp: 23, is_alive: true, move_id: "NOW", intents: [{ intent_type: "Attack", damage: 3, hits: 2 }] },
  ];
  raw.combat.hand = [
    { index: 0, card_id: "TEST_CARD", upgraded: false, energy_cost: 0, can_play_result: false },
    { index: 1, card_id: "TEST_CARD", upgraded: true, energy_cost: 2, can_play_result: true },
  ];
  state.run!.raw["deck"] = [{ card_id: "TEST_CARD", upgraded: true, energy_cost: 2 }];
  state.run!.raw["relics"] = [{ relic_id: "TEST_RELIC", stack: 0 }, { relic_id: "TEST_UNKNOWN", stack: null }];
  state.run!.raw["potions"] = [{ index: 0, occupied: false, potion_id: null, can_use: false },
    { index: 1, occupied: true, potion_id: "TEST_POTION", can_use: true }];
  raw.agent_view.combat = { draw: [{ line: "TEST_CARD*2 [2费]", card_ids: ["TEST_CARD"] }], discard: [], exhaust: [] };
  raw.rest = { options: [{ option_id: "TEST_REST", is_enabled: false }] };
  raw.shop = { cards: [{ index: 0, card_id: "TEST_STOCK", is_stocked: true, price: 0 }], relics: [], potions: [], card_removal: { price: 7 } };
  return state;
}
function session(state = observed()) {
  const dir = mkdtempSync(join(tmpdir(), "v6-predicate-")); directories.push(dir); installFixture(dir);
  return { dir, value: loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "on" }, { slAttempt: 3 })! };
}

it.each(REFLEX_GAP_FIELDS)("publishes missing-field proposal %s with typed access", field => {
  expect(validatePredicate({ op: "exists", field }).ok).toBe(true);
});
it("reads observed enemies without joining identity/HP/move/liveness from different entities", () => {
  const f = combatPredicateFacts(observed());
  expect(f.context.enemy).toMatchObject({ id: "TEST_B", hp: 23, move_id: "NOW", alive: true, total_damage: 6 });
  expect(evaluatePredicate(eq("enemies.alive", 1), f.context)).toBe(true);
  expect(evaluatePredicate(any("enemies.items", and(eq("enemy.id", "TEST_A"), eq("enemy.hp", 23))), f.context)).toBe(false);
  expect(evaluatePredicate(any("enemies.items", and(eq("enemy.id", "TEST_A"), eq("enemy.alive", false))), f.context)).toBe(true);
  const state = observed(); (state.raw as any).combat.enemies[0].is_alive = true;
  expect(combatPredicateFacts(state).context).not.toHaveProperty("enemy");
  delete (state.raw as any).combat.enemies[0].is_alive;
  expect(evaluatePredicate(eq("enemies.alive", 1), combatPredicateFacts(state).context)).toBeNull();
});
it("binds identity, upgrade, cost and legality to one observed card; pile summaries remain partial", () => {
  const f = combatPredicateFacts(observed());
  expect(evaluatePredicate(any("player.hand", and(eq("card.id", "TEST_CARD"), eq("card.upgraded", false), eq("card.can_play", true))), f.context)).toBe(false);
  expect(evaluatePredicate(any("player.hand", and(eq("card.upgraded", true), eq("card.cost", 2), eq("card.can_play", true))), f.context)).toBe(true);
  expect(evaluatePredicate(any("player.hand", and(eq("card.cost", 0), eq("card.can_play", false))), f.context)).toBe(true);
  expect(evaluatePredicate(any("player.deck", eq("card.can_play", false)), f.context)).toBeNull();
  expect(evaluatePredicate(eq("card.id", "TEST_CARD"), f.context)).toBeNull();
  expect(evaluatePredicate(any("player.piles.draw", eq("card.id", "TEST_CARD")), f.context)).toBe(true);
  expect(evaluatePredicate(any("player.piles.draw", eq("card.upgraded", false)), f.context)).toBeNull();
  expect(evaluatePredicate(any("player.piles.discard", eq("card.id", "TEST_CARD")), f.context)).toBe(false);
  expect(f.sources["player.piles.draw"]).toContain("grouped summaries");
});
it("retains real zero/false/empty values and keeps missing counters, SL and history unknown", () => {
  const state = observed(), f = combatPredicateFacts(state, { slAttempt: 3 });
  expect(evaluatePredicate({ op: "contains", field: "player.relics", value: "TEST_RELIC" }, f.context)).toBe(true);
  expect(evaluatePredicate(eq("player.relic_counters.TEST_RELIC", 0), f.context)).toBe(true);
  expect(evaluatePredicate({ op: "not", arg: eq("player.relic_counters.TEST_UNKNOWN", 0) }, f.context)).toBeNull();
  expect(evaluatePredicate(any("potion.slots", and(eq("potion.id", "TEST_POTION"), eq("potion.usable", true))), f.context)).toBe(true);
  expect(evaluatePredicate(any("potion.slots", and(eq("potion.occupied", false), eq("potion.usable", false))), f.context)).toBe(true);
  expect(evaluatePredicate(eq("sl.attempt", 3), f.context)).toBe(true);
  expect(evaluatePredicate(eq("sl.attempt", 1), combatPredicateFacts(state).context)).toBeNull();
  delete (state.raw as any).agent_view.combat.draw;
  const missing = combatPredicateFacts(state);
  expect(evaluatePredicate(any("player.piles.draw", eq("card.id", "TEST_CARD")), missing.context)).toBeNull();
  expect(missing.unavailable["history.first_predicted_death"]).toContain("not_history");
  expect(missing.unavailable["history.resource_handoff"]).toContain("not_actual");
});
it("reads rest and shop state without dispatching their question types or inventing a room kind", () => {
  const f = combatPredicateFacts(observed());
  expect(evaluatePredicate(any("rest.options", and(eq("rest_option.id", "TEST_REST"), eq("rest_option.enabled", false))), f.context)).toBe(true);
  expect(evaluatePredicate(any("shop.stock", and(eq("shop_item.id", "TEST_STOCK"), eq("shop_item.price", 0))), f.context)).toBe(true);
  expect(evaluatePredicate(eq("shop.prices.card:0", 0), f.context)).toBe(true);
  expect(evaluatePredicate(eq("shop.prices.card_removal", 7), f.context)).toBe(true);
  expect(f.context.player).toHaveProperty("gold"); expect(f.context.player).toHaveProperty("max_hp");
  expect(f.unavailable["room.kind"]).toContain("actual_room_kind");
  const state = observed(); (state.raw as any).shop.relics = null;
  expect(combatPredicateFacts(state).context).not.toHaveProperty("shop");
});
it("preserves each candidate's ordered planned actions/costs and existing trust; unknown version stays absent", () => {
  const { value } = session();
  const plan = { ...fixedPlan, steps: [
    { cardId: "TEST_CARD", cardIndex: 0, upgraded: false, cost: 0, name: "Test", target: 1, targetName: "Test" },
    { cardId: "POTION:TEST_POTION:1", cardIndex: 1001, upgraded: false, name: "Test", target: null, targetName: null },
  ] };
  const audit = combatEntryAudit(value, plan, null, null) as any;
  expect(evaluatePredicate(any("option.actions", and(eq("action.index", 0), eq("card.id", "TEST_CARD"), eq("action.cost", 0))), audit.context)).toBe(true);
  expect(evaluatePredicate(any("option.actions", and(eq("action.index", 1), eq("potion.id", "TEST_POTION"))), audit.context)).toBe(true);
  expect(evaluatePredicate(any("option.actions", eq("card.can_play", true)), audit.context)).toBeNull();
  expect(audit.context.option.actions[1]).not.toHaveProperty("card");
  const sampled = combatEntryAudit(value, fixedPlan, fixedRollout, fixedBoss) as any;
  expect(sampled.context.option).toMatchObject({ kind: "combat_line", trust: "low", future: { rollout: { samples: 4, horizon_turns: 5 }, whole_fight: { samples: 4 } } });
  for (const field of REFLEX_GAP_FIELDS) expect(sampled.predicate_facts.sources[field] ?? sampled.predicate_facts.unavailable[field], field).toBeTruthy();
  expect(sampled.context.option).not.toHaveProperty("model_version"); expect(sampled.context.option).not.toHaveProperty("complete_line");
  expect(sampled.predicate_facts.sources["option.turn.hp_loss"]).toBe("Plan.outcome.hpLoss");
  const unmodelled = combatEntryAudit(value, null, null, null, "unmodelled") as any;
  expect(unmodelled.context.option).not.toHaveProperty("actions"); expect(unmodelled.context.option).not.toHaveProperty("future");
  expect(combatOptionFacts(fixedPlan, { rollout: { status: "clock_estimate", samples: 4 }, whole_fight: {} }).context.option).not.toHaveProperty("future");
});
it("does not turn malformed potion slots or unresolved generated IDs into observed entities", () => {
  const plan = { ...fixedPlan, steps: [
    { cardId: "POTION:TEST_POTION:", cardIndex: 1000, upgraded: false, name: "Test", target: null, targetName: null },
    { cardId: "GEN:TEST_INTERNAL", cardIndex: 1001, upgraded: false, name: "Test", target: null, targetName: null },
    { cardId: "GEN:TEST_INTERNAL", cardIndex: 1002, upgraded: false, name: "Test", target: null, targetName: null,
      pileCard: { cardId: "TEST_ACTUAL", upgraded: true } },
  ] };
  const option = combatOptionFacts(plan, { rollout: {}, whole_fight: {} }).context.option as any;
  expect(option.actions[0].potion).not.toHaveProperty("index");
  expect(option.actions[1].card).not.toHaveProperty("id");
  expect(option.actions[2].card).toMatchObject({ id: "TEST_ACTUAL", upgraded: true });
});
it("loads cores/combos without knowledge edits and evaluates action predicates separately for each plan", () => {
  const { dir } = session(), path = join(dir, "characters/silent/reflex.json");
  const entries = JSON.parse(readFileSync(path, "utf8"));
  entries.entries = [{ ...entries.entries[0], cores: ["TEST_CORE"], combos: ["TEST_COMBO"],
    predicate: any("option.actions", and(eq("action.index", 0), eq("card.id", "TEST_CARD"))) }];
  writeFileSync(path, JSON.stringify(entries));
  const value = loadCombatEntries(observed(), dir, { V6_COMBAT_ENTRIES: "on" })!;
  const plan = { ...fixedPlan, steps: [{ cardId: "TEST_CARD", cardIndex: 0, upgraded: false, name: "Test", target: null, targetName: null }] };
  expect((combatEntryAudit(value, plan, null, null) as any).memory[0]).toMatchObject({ cores: ["TEST_CORE"], combos: ["TEST_COMBO"] });
  expect((combatEntryAudit(value, fixedPlan, null, null) as any).memory).toEqual([]);
  expect(validateReflexEntry({ ...reflex, cores: ["TEST_CORE"], combos: ["TEST_COMBO"] }).ok).toBe(true);
  expect(validateReflexEntry({ ...reflex, cores: ["TEST_CORE", "TEST_CORE"] }).ok).toBe(false);
  expect(validateReflexEntry({ ...reflex, combos: ["__proto__"] }).ok).toBe(false);
});
it("rejects unsafe/untyped fields, bounds quantifiers and retains unknown under NOT", () => {
  for (const p of [any("player.hp", eq("card.id", "X")), any("player.hand", eq("card.secret", "X")),
    eq("player.relic_counters.__proto__", 1), eq("card.upgraded", 1), eq("option.complete_line", "true"),
    eq("player.hand", "X"), { op: "contains", field: "option.actions", value: "X" }]) expect(validatePredicate(p).ok).toBe(false);
  expect(evaluatePredicate({ op: "all", field: "player.hand", arg: { op: "not", arg: eq("card.can_play", true) } }, { player: { hand: [{}] } })).toBeNull();
  expect(evaluatePredicate(any("player.hand", eq("card.id", "X")), { player: { hand: [null] } })).toBeNull();
  expect(evaluatePredicate(any("player.hand", eq("card.id", "X")), { player: { hand: Array(1001).fill({ id: "X" }) } })).toBeNull();
  expect(evaluatePredicate(eq("card.id", "X"), { card: Object.create({ id: "X" }) })).toBeNull();
});
