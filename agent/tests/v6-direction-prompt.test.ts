import { expect, it } from "vitest";
import { directionTask, type DirectionSummary } from "../src/v6/direction-plan.js";
import { directionContext } from "../src/v6/direction-plan.js";
import { DIRECTION_PROMPT_CHARS, expandDirectionPrompt, type DirectionCompletedSnapshot, type DirectionCoreCombatRow } from "../src/v6/direction-prompt.js";
import { comboProjection } from "./v6-direction-core-fixtures.js";
import { fitDirectionRide, directionRideTask } from "../src/v6/direction-rides.js";
const summaries: DirectionSummary[] = Array.from({ length: 4 }, (_, d) => ({ id: `DIR_${d}`, name: `Direction ${d}`, source: "build-core-v1",
  components: ["CARD_A", "CARD_B"], requirements: [], support: null, details: {},
  combos: Array.from({ length: 5 }, (_, c) => ({ id: `COMBO_${d}_${c}`, source: "build-core-v1", metrics: [{ huge_evidence: "x".repeat(100_000) }], details: {},
    requirements: [{ id: "REQ_A", count: 2, any: [{ kind: "card", id: "CARD_A", upgraded: true }] },
      { id: "REQ_B", count: 1, any: [{ kind: "card", id: "CARD_B" }, { kind: "relic", id: "RELIC_B" }] }] })) }));
const metrics = { hp_loss: { mean: 7, se: 2, n: 9 }, turns: { mean: 5, se: 1, n: 10 }, damage_per_turn: { mean: 20, se: null, n: 1 }, death_rate: null, losing_enemy_hp_fraction: null };
const snapshot: DirectionCompletedSnapshot = { targets: Array.from({ length: 18 }, (_, i) => ({ id: `F${i}:BOSS_FIXTURE_${i}` })), progress: [], unknown_reasons: [],
  long_term: summaries.flatMap(d => d.combos.flatMap(c => Array.from({ length: 18 }, (_, i): DirectionCoreCombatRow => ({
    direction_id: d.id, combo_id: c.id, target_id: `F${i}:BOSS_FIXTURE_${i}`, metrics, paired_delta: metrics,
    samples: 10, requested_samples: 100, capped: 1, time_up: 2, missing: 90, trust: { value: "unknown", labels: ["no_calibration"] }, labels: ["raw_simulation_not_calibrated"], unknown_reasons: ["no_terminal_samples"],
  })))) };
const base = { summaries, entries: Array.from({ length: 660 }, () => comboProjection()), appearedCards: ["SEEN"], potionIds: [], floor: 8,
  current: { hp: "30/60", deck: ["CARD_A", "CARD_A"], construction_context: { instruction: "obsolete V5 schema" } },
  inventory: { cards: [{ id: "CARD_A", upgraded: true }, { id: "CARD_A", upgraded: false }], relics: ["RELIC_B"], hp: 30, maxHp: 60, gold: 10, floor: 8, cap: null } };
it("keeps all four directions and every combo below 30k without probability tables or evidence blobs", () => {
  const before = JSON.stringify(snapshot), payload = directionTask({ ...base, completed: snapshot });
  expect(JSON.stringify(payload).length).toBeLessThanOrEqual(DIRECTION_PROMPT_CHARS);
  expect(JSON.stringify(snapshot)).toBe(before);
  expect(directionContext(payload)?.catalog).toEqual(Object.fromEntries(summaries.map(d => [d.id, d.components])));
  const dirs = payload.build_cores as Array<{ id: string; combos: Array<{ missing_cards: number; completed_results: unknown[]; omitted_targets: string[] }> }>;
  expect(dirs.map(d => d.id)).toEqual(summaries.map(d => d.id));
  for (const d of dirs) { expect(d.combos).toHaveLength(5); for (const c of d.combos) {
    expect(c.missing_cards).toBe(1); expect(c.completed_results.length).toBeGreaterThan(0);
    expect(c.completed_results.length + c.omitted_targets.length).toBe(18);
  } }
  expect(payload).not.toHaveProperty("availability"); expect(payload).not.toHaveProperty("direction_evaluation");
  expect(payload.run_state).not.toHaveProperty("construction_context");
  expect(JSON.stringify(payload)).not.toContain("expected_win"); expect(JSON.stringify(payload)).not.toContain("huge_evidence");
  expect(payload.prompt_budget).toMatchObject({ limit: 30_000, after: JSON.stringify(payload).length, truncated: true });
});
it("preserves low-trust values, unknown errors and the five explicit metric denominators", () => {
  const completed = { ...snapshot, long_term: snapshot.long_term.slice(0, 1) };
  const payload = directionTask({ ...base, completed });
  const first = (payload.build_cores as any[])[0].combos[0];
  expect(first.completed_results[0]).toMatchObject({ target_id: "F0:BOSS_FIXTURE_0", metrics: [[7, 2, 9], [5, 1, 10], [20, null, 1], null, null], trust: { value: "unknown", labels: ["no_calibration"] }, samples: 10, capped: 1, time_up: 2, missing: 90 });
  expect(payload.result_labels).toEqual(["raw_simulation_not_calibrated"]);
  expect(first.completed_results[0].labels).toEqual([0]);
});
it("never substitutes old P*Wk rows for a cache miss and computes missing upgrades from actual inventory", () => {
  const payload = directionTask(base), first = (payload.build_cores as any[])[0].combos[0];
  expect(first).toMatchObject({ missing_cards: 1, completed_results: [], unknown_reasons: ["completed_core_cache_miss"] });
  const unknown = directionTask({ ...base, inventory: undefined });
  expect((unknown.build_cores as any[])[0].combos[0].missing_cards).toBeNull();
});
it("refuses an oversized mandatory catalog instead of deleting a direction or changing legal routes", () => {
  expect(() => directionTask({ ...base, map: { actual_route: "x".repeat(31_000) } })).toThrow("direction_prompt_required_context_exceeds_30000_chars");
});
it("preserves four directions and at least one measured Boss per combo next to a 21k V5 context", () => {
  const task = directionTask({ ...base, completed: snapshot });
  const surrounding = { memory: "m".repeat(21_000), question: "original V5 question", options: { a: "a" } };
  const state = fitDirectionRide({ run_plan_task: { v6_direction_task: task } }, surrounding);
  const ride = directionRideTask(state)!;
  expect(ride).not.toBeNull(); expect((ride.build_cores as unknown[])).toHaveLength(4);
  expect(JSON.stringify({ ...surrounding, state }).length).toBeLessThanOrEqual(30_000);
  expect(ride.compact_columns).toBeDefined();
  for (const direction of expandDirectionPrompt(ride).build_cores as any[]) for (const combo of direction.combos) {
    expect(combo.cards).toHaveLength(2); expect(combo.completed_results.length).toBeGreaterThan(0);
    expect(combo.cards[0]).toEqual({ count: 2, any: [{ kind: "card", id: "CARD_A", upgraded: true }] });
    const row = combo.completed_results[0];
    expect(row.metrics).toEqual([[7, 2, 9], [5, 1, 10], [20, null, 1], null, null]);
    expect(row).toMatchObject({ samples: 10, requested_samples: 100, capped: 1, time_up: 2, missing: 90,
      trust: { value: "unknown", labels: ["no_calibration"] } });
  }
  const again = directionRideTask(fitDirectionRide(state, { ...surrounding, memory: "m".repeat(21_100) }))!;
  expect(again).not.toBeNull(); expect((again.build_cores as any[])).toHaveLength(4);
  expect(JSON.stringify({ ...surrounding, memory: "m".repeat(21_100), state: { run_plan_task: { v6_direction_task: again } } }).length).toBeLessThanOrEqual(30_000);
});
