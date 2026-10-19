/** Synthetic format fixtures: no game facts or learned advice. */
export const observation = { run_id: "FIXTURE_RUN", floor: 8, turn: 1 };
export const predicate = { op: "gte", field: "player.hp", value: 10 };
export const scope = { character: "silent", ascensions: [0] };
export const potion = { schema: "potion-direction-v1", potion: "TEST_POTION", tier: "normal", for: "joint", reason: "格式测试" };
export const weights = { schema: "direction-weights-v1", direction_weights: { TEST_A: .6, TEST_B: .4 },
  ideal_overrides: { TEST_A: ["TEST_CARD"] }, potion_directions: [potion], route: "keep", rest: "auto", checkpoint: 20, reason: "格式测试" };
export const directionContext = { catalog: { TEST_A: ["TEST_CARD"], TEST_B: [] }, appearedCards: new Set(["SEEN_CARD"]),
  potionIds: new Set(["TEST_POTION"]), currentFloor: 8, validRoute: (route: string) => route === "keep" };
export const projection = { schema: "projection-entry-v1", option_id: "test_option", direction_id: "TEST_A", target_id: "TEST_TARGET",
  win: { value: .5, se: .1, n: 20 }, paired_delta: { mean: .1, se: .02, n: 20 },
  losing_boss_hp_fraction: null, winning_player_hp_fraction: null, turns: null, joint_win: null, joint_paired_delta: null,
  availability: { take: null, skip: null }, weighted_current_boss_delta: null, weighted_joint_delta: null,
  deck_count_change: 1, core_first_cast_turn: null, win_tier: "even", delta_tier: "much_better", direction_role: "unknown", trust: "unknown", reflex_ids: [] };
export const reflex = { schema: "reflex-entry-v1", id: "test_reflex", version: 1, applies_to: "card_pick", predicate,
  signal: { kind: "hp", value: 1, se: .2, unit: "hp" }, label_en: "Test format only",
  evidence: { observations: [observation], n_support: 1, n_contradict: 0 }, confidence: .5, scope,
  directions: ["TEST_A"], source_experience: ["TEST_EXPERIENCE"] };
export const vocab = { schema: "reflex-vocab-v1", character: "silent", dimensions: {
  enemy_threat: [], card_role: [{ id: "TEST_TAG", label_en: "Test tag", evidence: [observation] }],
  line_tempo: [], resource_cost: [], potion_category: [] } };
const ideal = { components: [{ component: { kind: "card", id: "TEST_CARD", count: 1 }, priority: 0 }], upgrade_priority: [], remove_priority: [] };
export const direction = { schema: "direction-card-v1", id: "TEST_A", name: "格式样例", status: "candidate", scope,
  core: [{ id: "TEST_REQUIREMENT", any: [{ kind: "card", id: "TEST_CARD", upgraded: true }], count: 1, distinct: true, evidence: [observation] }], support: [], conflict: [],
  ideal: { act1_end: ideal, act2_end: ideal, pre_f48: ideal }, matchups: [], pivot_signals: [], failure_modes: [],
  evidence: [observation], counterexamples: [], confidence: .5 };
export const logRow = { schema: "v6-build-log-v1", ts: "2026-10-19T08:00:00.000Z", run_id: "FIXTURE_RUN", character: "silent",
  question_id: "FIXTURE_QUESTION", kind: "card_pick", mode: "shadow", entries: [projection], jev_answer: null, fallback: null,
  elapsed_ms: 10, cache: { hits: 1, misses: 0 }, degradation: [], unknown: { count: 1, total: 1 },
  triggers: ["T6"], merged_triggers: [], skipped_triggers: [] };
