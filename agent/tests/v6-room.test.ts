/** W7 fixed inventory, projection, budget and local scripted-loop contracts. */
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { board, env, play, FakeDeepSeek, setupOneshotTests, type Raw } from "./oneshot-support.js";
import { logged, loggedEnv, loggedKnowledge } from "./logged.js";
import { sealV6History } from "../src/sim/v6-history-pack.js";
import { createV6ProjectionFactory } from "../src/sim/v6-request-factory.js";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import { v6Config } from "../src/v6/config.js";
import { V6ProjectionRuntime } from "../src/v6/projection-runtime.js";
import { request as projectionRequest } from "./v6-projection-fixture.js";
import { FixedRunner } from "./v6-projection-fixture.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { bindV6RoomProjection, createV6RoomProjection, runtimeV6RoomProjection, type V6RoomProjectionBinding } from "../src/hand/screens/v6-room-projection.js";
import { coreFixture } from "./v6-direction-core-fixtures.js";
import { comboProjection } from "./v6-direction-core-fixtures.js";
import { loadConfig } from "../src/core/config.js";
import { asRecord } from "../src/core/util/json.js";
import { planShop } from "../src/hand/screens/shop.js";
import { planRest } from "../src/hand/screens/rest.js";
import { v6ShopOptions, v6RestOptions, type V6RoomOptions } from "../src/hand/screens/v6-room-options.js";
import { buildV6RoomDecision, isV6RoomDecision, prepareV6RoomDecision, recordV6Room } from "../src/hand/screens/v6-room.js";
import type { V6ProjectionTable } from "../src/sim/v6-projection.js";
import { DecisionBudget, withDecisionBudget } from "../src/core/decision-budget.js";
import { withConstructionJevBudget } from "../src/v6/potion-entries.js";
import type { JevClient } from "../src/reflex/jev/client.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";
import { validateProjectionEntry } from "../src/v6/formats.js";

vi.mock("../src/knowledge/files.js", async original => ({ ...await original<typeof import("../src/knowledge/files.js")>(),
  KNOWLEDGE_DIR: "/__v6_room_missing__", knowledgeFile: (_dir: string, name: string) => `/__v6_off_fixed__/${name}` }));
setupOneshotTests();
const dirs: string[] = [];
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); for (const d of dirs.splice(0)) rmSync(d, { force: true, recursive: true }); });
function loopConfig(dir: string) {
  const c = loadConfig({ SL_ENABLED: "off", CHARACTER: "silent" });
  return { sl: c.sl, run: c.run, buildOneshot: "off" as const, runPlanLog: join(dir, "plans.jsonl") };
}
function on() { vi.stubEnv("CHARACTER", "silent"); vi.stubEnv("V6_BUILD", "on"); vi.stubEnv("V6_SHOP_DECIDER", "jev"); vi.stubEnv("V6_REST_DECIDER", "jev"); }
function room(kind: "shop" | "rest") {
  const raw = kind === "shop" ? board("u6ru-f22-shop", "open") : board("w2tb-f7-rest", "rest");
  Object.assign(raw.run as Raw, { character_id: "SILENT", ascension: 0 }); return env(raw);
}
function fixtureDir() {
  const dir = mkdtempSync(join(tmpdir(), "v6-room-")); dirs.push(dir);
  const own = join(dir, "characters", "silent"); mkdirSync(own, { recursive: true });
  writeFileSync(join(own, "build-cores.json"), JSON.stringify({ schema: "build-cores-v1", character: "silent", entries: [coreFixture()] })); return dir;
}
function table(): V6ProjectionTable {
  return { schema: "v6-projection-table-v1", enabled: true, phase: "pick", combinations: [], entries: [], act_evaluations: [], weighted: [], rankings: {}, target_mixtures: [], pick_direction_comparisons: [],
    targets: [{ id: "TEST_TARGET", boss: "TEST_TARGET", act: 1, floor: 17, kind: "current", probability: 1, labels: [] }],
    telemetry: { elapsed_ms: 1, cache_hits: 0, cache_misses: 0, simulations: 0, timed_out: 0, degradation: [], unknown_entries: 0, total_entries: 0, unknown_fraction: 0, act_cache_hit: false } };
}
function delta(t: V6ProjectionTable, key: string, kind: "clearance" | "current_gate", mean: number) {
  t.target_mixtures.push({ option_id: key, kind, value: null, paired_delta: { mean, se: .001, n: 20 }, known_mass: 1, known_value: 0, labels: [] });
}
function answer(key: string): AnswerSet { return { pick: { type: "choice", choice: key, confidence: .9, probabilities: { [key]: .9 }, raw: {} } }; }

it("constructs actual bought/removed decks and charges the displayed price without mutating the board", () => {
  on(); const e = room("shop"), before = JSON.stringify(e.state.raw), input = v6ShopOptions(e)!;
  const buy = input.options.find(o => o.option.key === "buy_card0")!;
  expect(buy.state?.cards).toEqual([...input.baseline!.cards, { id: "POMMEL_STRIKE", upgraded: false }]);
  expect(buy.state?.gold).toBe(input.baseline!.gold - 52);
  expect(buy.changes).toEqual([{ kind: "add", card: { id: "POMMEL_STRIKE", upgraded: false }, copies: 1, price: 52 }]);
  const removals = input.options.filter(o => o.option.key.startsWith("remove:")); expect(removals.length).toBeGreaterThan(1);
  for (const o of removals) {
    expect(o.state?.cards).toHaveLength(input.baseline!.cards.length - 1); expect(o.state?.gold).toBe(input.baseline!.gold - 100);
    expect(o.option.key).not.toMatch(/:c[0-3]$/); // These logged cards explicitly carry Eternal.
  }
  const d = buildV6RoomDecision(e, input), picked = d.resolve(answer(removals[0]!.option.key));
  expect(e.screenMemory.pendingPick).toBeUndefined(); picked.apply?.(); expect(e.screenMemory.pendingPick?.task).toBe("remove");
  expect(JSON.stringify(e.state.raw)).toBe(before);
});
it("expands one upgrade per eligible identity and heals only to actual maximum HP", () => {
  on(); const e = room("rest"), input = v6RestOptions(e)!;
  const heal = input.options.find(o => o.option.key === "o0")!;
  expect(heal.state).toEqual({ ...input.baseline, hp: 77 });
  const upgrade = input.options.find(o => o.option.key === "o1:c8")!;
  expect(upgrade.state?.cards[8]).toEqual({ id: "BASH", upgraded: true });
  expect(upgrade.state?.gold).toBe(28); expect(upgrade.state?.hp).toBe(67);
  expect(input.options.some(o => o.option.key === "o1:c7")).toBe(false);
  const chosen = buildV6RoomDecision(e, input).resolve(answer("o1:c8")); chosen.apply?.();
  expect(e.screenMemory.pendingPick?.cards[0]?.card_id).toBe("BASH");
});
it("filters unavailable or unaffordable shop choices and never buys into an unobserved/full belt", () => {
  on(); const e = room("shop"), raw = asRecord(e.state.raw.shop), rows = raw.cards as Raw[];
  rows[0]!.is_stocked = false; rows[1]!.enough_gold = false; rows[2]!.price = 9999;
  asRecord(raw.card_removal).used = true;
  (e.state.run!.raw as Raw).potions = [{ index: 0, occupied: true, potion_id: "TEST_POTION", can_discard: true }];
  const input = v6ShopOptions(e)!; const keys = input.options.map(o => o.option.key);
  expect(keys).not.toContain("buy_card0"); expect(keys).not.toContain("buy_card1"); expect(keys).not.toContain("buy_card2");
  expect(keys.some(k => k.startsWith("buy_potion") || k.startsWith("remove:"))).toBe(false);
  expect(keys).toContain("discard_potion0"); expect(input.options.find(o => o.option.key === "discard_potion0")?.changes).toEqual([{ kind: "potion", slot: 0, value: null, price: 0 }]);
});
it("retains unknown prices, resources, potion and relic effects as null instead of zero or unchanged deck", () => {
  on(); const e = room("shop"), cards = asRecord(e.state.raw.shop).cards as Raw[]; delete cards[0]!.price;
  const input = v6ShopOptions(e)!;
  for (const key of ["buy_card0", "buy_relic0"]) {
    const o = input.options.find(o => o.option.key === key)!; expect(o.state).toBeNull(); expect(o.unknown_reason).toBeTruthy();
  }
  expect(asRecord(input.options.find(o => o.option.key === "buy_card0")!.option.summary).price).toBeNull();
  delete (e.state.run!.raw as Raw).gold; e.state.run!.gold = null;
  const missing = v6ShopOptions(e)!; expect(missing.baseline).toBeNull(); expect(missing.options.every(o => o.state === null)).toBe(true);
});
it("carries explicit potion slots and prices to W3 and never invents an absent slot", () => {
  on(); const e = room("shop"), belt = asRecord(e.state.run?.raw).potions as Raw[];
  const empty = belt.findIndex(p => p.occupied === false), input = v6ShopOptions(e)!;
  const potion = input.options.find(o => o.option.key === "buy_potion0")!;
  expect(potion.changes).toEqual([{ kind: "potion", slot: empty,
    value: (asRecord(e.state.raw.shop).potions as Raw[])[0], price: asRecord(potion.option.summary).price }]);
  expect(potion.state?.gold).toBe(input.baseline!.gold - Number(asRecord(potion.option.summary).price));
  delete belt[empty]!.index;
  const unknown = v6ShopOptions(e)!.options.find(o => o.option.key === "buy_potion0")!;
  expect(unknown.changes).toBeNull(); expect(unknown.state).toBeNull();
});
it("uses observed potion identities independently of array order and rejects ambiguous identities", () => {
  on(); const e = room("shop"), raw = asRecord(e.state.run?.raw);
  raw.potions = [{ index: 3, occupied: true, potion_id: "TEST_POTION", can_discard: true }, { index: 7, occupied: false }];
  const options = v6ShopOptions(e)!.options;
  expect(options.find(o => o.option.key === "buy_potion0")?.changes?.[0]).toMatchObject({ kind: "potion", slot: 7 });
  expect(options.find(o => o.option.key === "discard_potion3")?.changes).toEqual([{ kind: "potion", slot: 3, value: null, price: 0 }]);
  (raw.potions as Raw[])[1]!.index = 3;
  expect(v6ShopOptions(e)!.options.find(o => o.option.key === "buy_potion0")?.changes).toBeNull();
});
it("preserves observed targeted rest choices and refuses to invent missing target indices", () => {
  on(); const e = room("rest"); asRecord(e.state.raw.rest).options = [
    { index: 3, option_id: "TEST_OPTION", title: "Fixture", is_enabled: true, requires_target: true, valid_target_indices: [2, 7] },
    { index: 4, option_id: "TEST_OPTION", is_enabled: true, requires_target: true },
    { index: 5, option_id: "TEST_OPTION", is_enabled: false },
  ];
  const input = v6RestOptions(e)!; expect(input.options.map(o => o.option.key)).toEqual(["o3:t2", "o3:t7"]);
  expect(buildV6RoomDecision(e, input).resolve(answer("o3:t7")).intent).toEqual({ action: "choose_rest_option", option_index: 3, target_index: 7 });
  expect(input.options.every(o => o.changes === null)).toBe(true);
});
it("retains W6 potion slot questions and the guarded rest continuation", () => {
  on(); vi.stubEnv("V6_POTION_DECIDER", "jev");
  const fx = logged("batch-g/zgz0-f11-rest-mailbox"), e = loggedEnv(fx), d = planRest(e)!;
  if (!isV6RoomDecision(d)) throw Error("fixture");
  expect(d.v6Room.options.find(o => o.option.key === "o0")).toMatchObject({ state: null, changes: null, unknown_reason: "rest_potion_outcome_unknown" });
  const a: AnswerSet = { ...answer("o0:discard"), discard_p1: { type: "noul", noul: .1, raw: {} }, discard_p2: { type: "noul", noul: .9, raw: {} } };
  expect(d.questions.discard_p2?.type).toBe("noul");
  const picked = d.resolve(a); expect(picked.intent).toEqual({ action: "discard_potion", option_index: 2 }); picked.apply?.();
  expect(e.screenMemory.afterDiscard).toMatchObject({ slot: 2, option: 0 });
  const raw = fx.state.run as Raw; (raw.potions as Raw[])[2] = { index: 2, occupied: false, can_discard: false };
  const next = loggedEnv(fx, { screenMemory: e.screenMemory });
  expect(planRest(next)).toMatchObject({ intent: { action: "choose_rest_option", option_index: 0 } });
  const incomplete = d.resolve(answer("o0:discard")); expect(incomplete.fallback).toBe(true); expect(incomplete.intent?.action).toBe("choose_rest_option");
});
it("uses W3 as the sole projection factory, preserving rejected-option reasons and its compute bound", async () => {
  on(); const e = room("shop"), input = v6ShopOptions(e)!, request = { config: { budgets: { pick_ms: 9999 } } };
  const create = vi.fn((_s: unknown) => ({ status: "ready", request, labels: ["fixed_history_sha"], rejected_options: [{ id: "buy_card0", reason: "fixture_rejection" }] }));
  const evaluate = vi.fn(async r => { expect(r.config.budgets.pick_ms).toBeGreaterThan(0); expect(r.config.budgets.pick_ms).toBeLessThanOrEqual(5000); return table(); });
  const situation = vi.fn(() => ({ runId: "fixture", asOf: "2026-10-19T00:00:00.000Z", seed: 7, weights: {} }));
  const provider = createV6RoomProjection({ create } as never, { evaluate }, situation);
  const d = await prepareV6RoomDecision(buildV6RoomDecision(e, input), e, provider);
  expect(create.mock.calls[0]![0]).toMatchObject({ state: e.state, phase: "pick", baselineId: "__room_baseline__" });
  const passed = (create.mock.calls[0]![0] as { options: { id: string }[] }).options;
  expect(passed.some(o => o.id === "buy_relic0")).toBe(false);
  expect(evaluate).toHaveBeenCalledTimes(1);
  if (!isV6RoomDecision(d)) throw Error("fixture");
  expect(d.roomProjectionSource?.rejected_options).toContainEqual({ id: "buy_card0", reason: "fixture_rejection" });
  expect(JSON.stringify(d.state)).toContain("fixed_history_sha");
});
it("binds the common run context without allocating its own snapshot or replenishing elapsed compute time", async () => {
  on(); const e = room("shop"), input = v6ShopOptions(e)!;
  let now = 0;
  const budget = new DecisionBudget("room", "routine", () => now, 5000, 0);
  const create = vi.fn((s: unknown) => {
    expect(s).toMatchObject({ state: e.state, runId: "common_run", seed: 9, baselineId: "__room_baseline__" });
    now += 300;
    return { status: "ready", request: { config: { budgets: { pick_ms: 5000 } } }, labels: ["common_snapshot"], rejected_options: [] };
  });
  const source = vi.fn(async actual => { expect(actual).toBe(e); now += 1200;
    return { factory: { create }, situation: { runId: "common_run", asOf: "2026-10-19T00:00:00.000Z", seed: 9, weights: {} } } as unknown as V6RoomProjectionBinding; });
  const controller = new AbortController();
  const evaluate = vi.fn(async (request, context) => {
    expect(request.config.budgets.pick_ms).toBe(3500);
    expect(context).toEqual({ budget_ms: 3500, signal: controller.signal });
    return table();
  });
  const result = await withDecisionBudget(budget, () => bindV6RoomProjection(source, evaluate)(e, input, { budget_ms: 5000, signal: controller.signal }));
  expect(source).toHaveBeenCalledTimes(1); expect(create).toHaveBeenCalledTimes(1); expect(evaluate).toHaveBeenCalledTimes(1);
  expect(result).toMatchObject({ reason: "ready", labels: ["common_snapshot"] });
});
it.each(["shop", "rest"] as const)("passes actual %s changes through the merged W3 factory and retains missing history as unknown", async kind => {
  on(); const e = room(kind), input = (kind === "shop" ? v6ShopOptions(e) : v6RestOptions(e))!;
  const cutoff = "2020-01-01T00:00:00.000Z", sha = "a".repeat(64);
  const history = sealV6History({ character: "silent", cutoff, sources: ["a", "b", "c", "d"].map(name => ({ name, sha256: sha, bytes: 1 })),
    coverage: [], floor_frames: [], histories: [], observations: [], combo_metrics: [], labels: [],
    opportunities: { schema: "construction-opportunities-v1", character: "silent", generated: cutoff, cutoff, digest: sha, limitations: [], rows: [] } }, cutoff);
  const factory = createV6ProjectionFactory({ config: v6Config({ V6_BUILD: "on" }), character: "silent",
    history: { status: "loaded", path: "fixed-empty-history", value: history }, knowledge: loggedKnowledge,
    templates: [{ id: "fixture", name: "fixture", character: "silent", ascensions: [0], status: "candidate",
      requirements: [{ id: "first", count: 1, any: [{ id: input.baseline!.cards[0]!.id, kind: "card" }] }],
      evidence: { runs: [], source: "fixed logged fixture", sha256: sha }, limits: [] }], support: null,
    doubleBoss: null, trust: null, modelVersion: "fixed-room-contract", models: { db: FIXTURE_DB, mm: FIXTURE_MM } });
  const runner = new FixedRunner(), engine = new V6ProjectionEngine(runner);
  const evaluate = vi.fn(async (actual, request, context) => {
    expect(actual).toBe(e); expect(context.budget_ms).toBeGreaterThan(0); expect(context.signal.aborted).toBe(false);
    for (const option of request.options) expect(option.state).toEqual(input.options.find(o => o.option.key === option.id)!.state);
    expect(request.options.some(o => o.id.startsWith("buy_relic"))).toBe(false);
    expect(request.config.budgets.pick_ms).toBeLessThanOrEqual(5000);
    return engine.evaluate(request);
  });
  const source = vi.fn(async (actual, phase) => {
    expect(actual).toBe(e); expect(phase).toBe("pick");
    return { factory, situation: { runId: String(e.state.raw.run_id),
    asOf: "2020-01-02T00:00:00.000Z", seed: 17, weights: { fixture: 1 },
    visibleBosses: [{ act: Number(e.state.run!.raw.act_id) + 1, floor: 17, boss: "SOUL_FYSH" }] } };
  });
  const provider = runtimeV6RoomProjection({ context: source, evaluateRequest: evaluate });
  const result = await provider(e, input, { budget_ms: 5000, signal: new AbortController().signal });
  expect(source).toHaveBeenCalledTimes(1); expect(evaluate).toHaveBeenCalledTimes(1);
  expect(result).toMatchObject({ reason: "ready" });
  if (!result || "schema" in result || !result.table) throw Error("fixed room projection unavailable");
  expect(result.table.entries.length).toBeGreaterThan(0);
  expect(result.table.entries.every(entry => entry.win === null)).toBe(true);
  expect(result.table.combinations.every(row => row.unknown_reasons.length > 0)).toBe(true);
  expect(result.table.telemetry.unknown_entries).toBeGreaterThan(0);
  if (kind === "shop") expect(result.rejected_options).toContainEqual(expect.objectContaining({ id: "buy_relic0" }));
});
it("does not read shared production context when the room is off, in combat or already canceled", async () => {
  on(); const e = room("shop"), input = v6ShopOptions(e)!, source = vi.fn(), evaluate = vi.fn();
  const provider = bindV6RoomProjection(source, evaluate), controller = new AbortController();
  for (const mode of ["off", "shadow"] as const) {
    vi.stubEnv("V6_BUILD", mode); expect(await provider(e, input, { budget_ms: 5000, signal: controller.signal })).toBeNull();
  }
  vi.stubEnv("V6_BUILD", "on"); vi.stubEnv("V6_SHOP_DECIDER", "brain");
  expect(await provider(e, input, { budget_ms: 5000, signal: controller.signal })).toBeNull();
  vi.stubEnv("V6_SHOP_DECIDER", "jev"); e.state.in_combat = true;
  expect(await provider(e, input, { budget_ms: 5000, signal: controller.signal })).toBeNull();
  e.state.in_combat = false; controller.abort();
  expect(await provider(e, input, { budget_ms: 5000, signal: controller.signal })).toBeNull();
  expect(source).not.toHaveBeenCalled(); expect(evaluate).not.toHaveBeenCalled();
});
it.each(["cancel_context", "expire_context", "cancel_evaluation"])("rejects late production work at %s", async stage => {
  on(); const e = room("rest"), input = v6RestOptions(e)!, controller = new AbortController(); let now = 0;
  const budget = new DecisionBudget("room", "routine", () => now, 5000, 0);
  const create = vi.fn(() => ({ status: "ready", request: { config: { budgets: { pick_ms: 5000 } } }, labels: [], rejected_options: [] }));
  const source = async () => {
    if (stage === "cancel_context") controller.abort();
    if (stage === "expire_context") now = 5000;
    return { factory: { create }, situation: {} } as unknown as V6RoomProjectionBinding;
  };
  const evaluate = vi.fn(async () => { controller.abort(); return table(); });
  expect(await withDecisionBudget(budget, () => bindV6RoomProjection(source, evaluate)(e, input, { budget_ms: 5000, signal: controller.signal }))).toBeNull();
  expect(create).toHaveBeenCalledTimes(stage === "cancel_evaluation" ? 1 : 0);
  expect(evaluate).toHaveBeenCalledTimes(stage === "cancel_evaluation" ? 1 : 0);
});
it("retains an unavailable production context as unknown, including local unsupported choices", async () => {
  on(); const e = room("shop"), input = v6ShopOptions(e)!, evaluate = vi.fn();
  const result = await bindV6RoomProjection(async () => null, evaluate)(e, input, { budget_ms: 5000, signal: new AbortController().signal });
  expect(result).toMatchObject({ table: null, reason: "projection_context_unavailable", rejected_options: expect.arrayContaining([
    expect.objectContaining({ id: "buy_relic0" })]) });
  expect(evaluate).not.toHaveBeenCalled();
});
it("publishes each combination with n/error/trust, leaves absent projections unknown and keeps full provenance in audit", () => {
  on(); const dir = fixtureDir(), e = room("shop"), input = v6ShopOptions(e)!, t = table();
  // This checks projection semantics; the real full-shop fixture separately checks truncation.
  input.options = input.options.filter(o => ["buy_card0", "leave"].includes(o.option.key));
  const entry = { ...comboProjection(), option_id: "buy_card0", target_id: "TEST_TARGET", combo_metrics: coreFixture().combos[0]!.metrics };
  const frozenSummary = structuredClone(coreFixture().combos[0]!.metrics);
  frozenSummary[0]!.observed.dpr_boss = { ...frozenSummary[0]!.observed.dpr_boss, value: 42, n: 7, se: 2 };
  t.combinations.push({ combination_id: "TEST_A:min", entry, completion_source: "build_core", general_source: "empirical", scope: "combination_expectation",
    completed_win: entry.win_complete!, general_win: entry.win_incomplete!, completed_joint_win: null, general_joint_win: null, formation_se: .02, formation_n: 200,
    summary: frozenSummary, role: "in_combo", role_labels: ["fixture_role"], completion_sample_ids: ["fixture_seed"], model_labels: ["fixture_model"], unknown_reasons: [], continuous: null });
  const d = buildV6RoomDecision(e, input, t, undefined, dir);
  expect(d.roomEntries).toHaveLength(input.options.length * 2); expect(d.roomEntries.every(e => validateProjectionEntry(e).ok)).toBe(true);
  const output = asRecord(asRecord(d.state.options).buy_card0), projections = output.projections as Raw[];
  expect(projections.find(p => p.combo_id === "TEST_A:min")).toMatchObject({ formation_n: 200, formation_se: .02, combo_source: "build-core-v1", combo_role: "in_combo", model_labels: ["fixture_model"], opening: { Wk: "evaluated", W0: "evaluated" } });
  expect(projections.find(p => p.combo_id === "TEST_A:common")).toMatchObject({ win: null, formation_n: null, trust: "unknown", opening: { Wk: "opening unknown", W0: "opening unknown" } });
  const coreMetrics = d.state.core_metrics as Raw[];
  expect((coreMetrics.find(c => c.id === "TEST_A:min")!.metrics as Raw[])[0]!).toMatchObject({ dpr_boss: { value: 42, n: 7, se: 2 } });
  expect(JSON.stringify(d.state)).not.toContain("FIXTURE_RUN"); expect(JSON.stringify(d.state)).not.toContain('"evidence"'); expect(JSON.stringify(d.state)).not.toContain("card_outcome_stats");
  expect(JSON.stringify(d.roomEntries)).toContain("FIXTURE_RUN");
  recordV6Room(e, d, join(dir, "plans.jsonl"), "fixed", answer("buy_card0"), false, 1);
  expect(readFileSync(join(dir, "v6-build.jsonl"), "utf8")).toContain("FIXTURE_RUN");
  const changedDir = fixtureDir(), later = coreFixture();
  for (const combo of later.combos) combo.id += ":later";
  writeFileSync(join(changedDir, "characters", "silent", "build-cores.json"), JSON.stringify({ schema: "build-cores-v1", character: "silent", entries: [later] }));
  const afterPublish = buildV6RoomDecision(e, input, t, undefined, changedDir);
  expect(afterPublish.roomEntries.find(e => e.option_id === "buy_card0" && e.combo_id === "TEST_A:min"))
    .toEqual(d.roomEntries.find(e => e.option_id === "buy_card0" && e.combo_id === "TEST_A:min"));
  expect((afterPublish.state.core_metrics as Raw[]).find(c => c.id === "TEST_A:min")).toBeTruthy();
});
it("fallback rejects a much-worse current boss, then ranks chain deltas and otherwise legally leaves/heals", () => {
  on(); const e = room("shop"), input = v6ShopOptions(e)!, t = table();
  delta(t, "buy_card0", "clearance", .9); delta(t, "buy_card0", "current_gate", -.1);
  delta(t, "buy_card1", "clearance", .2); delta(t, "buy_card1", "current_gate", .01);
  delta(t, "leave", "clearance", 0); delta(t, "leave", "current_gate", 0);
  expect(buildV6RoomDecision(e, input, t).resolve({}).intent).toEqual({ action: "buy_card", option_index: 1 });
  expect(buildV6RoomDecision(e, input).resolve({}).intent?.action).toBe("close_shop_inventory");
  const r = room("rest"); expect(buildV6RoomDecision(r, v6RestOptions(r)!).resolve({}).intent).toEqual({ action: "choose_rest_option", option_index: 0 });
});
it.each(["foreign", "confidence", "probabilities"])("invalid %s answer falls back and cannot dispatch a foreign choice", which => {
  on(); const e = room("shop"), a = answer("buy_card0");
  if (a.pick?.type !== "choice") throw Error("fixture");
  if (which === "foreign") a.pick.choice = "not_an_action";
  if (which === "confidence") a.pick.confidence = NaN;
  if (which === "probabilities") a.pick.probabilities = { not_an_action: 1 };
  const result = buildV6RoomDecision(e, v6ShopOptions(e)!).resolve(a); expect(result.fallback).toBe(true); expect(result.intent?.action).toBe("close_shop_inventory");
});
it("gives projection and Jev independent five-second allowances even after the parent expires", async () => {
  on(); const e = room("rest"), d = buildV6RoomDecision(e, v6RestOptions(e)!);
  const parent = new DecisionBudget("expired", "routine", undefined, 1, 0); parent.charge(2); let signal: AbortSignal | undefined;
  const provider = vi.fn(async (_env, input: V6RoomOptions, context) => { expect(input.options.find(o => o.option.key === "o1:c8")?.state?.cards[8]?.upgraded).toBe(true);
    expect(context.budget_ms).toBe(5000); signal = context.signal; return table(); });
  await withDecisionBudget(parent, async () => { const prepared = await prepareV6RoomDecision(d, e, provider); expect(isV6RoomDecision(prepared)).toBe(true);
    expect(await withConstructionJevBudget("Jev_room", async () => "accepted")).toBe("accepted"); });
  expect(provider).toHaveBeenCalledTimes(1); expect(signal?.aborted).toBe(true);
  expect(parent.record().stages.map(s => [s.stage, s.scope, s.budget_ms])).toEqual([["V6_rest_projection", "L2", 5000], ["Jev_room", "L2", 5000]]);
});
it("bounds failed projection work, aborts its signal and leaves Jev's independent allowance intact", async () => {
  on(); vi.stubEnv("V6_PICK_MS", "10"); const e = room("shop"), d = buildV6RoomDecision(e, v6ShopOptions(e)!); let signal: AbortSignal | undefined;
  const prepared = await prepareV6RoomDecision(d, e, async (_env, _input, context) => { signal = context.signal; return new Promise(() => {}); });
  expect(signal?.aborted).toBe(true); expect(isV6RoomDecision(prepared) && prepared.roomProjectionReason).toBe("projection_failed_or_timed_out");
  expect(await withConstructionJevBudget("Jev_room", async () => "still accepted")).toBe("still accepted");
});
it.each(["shop", "rest"] as const)("local scripted loop dispatches one %s Jev choice and no brain request", async kind => {
  on(); const e = room(kind), deepseek = new FakeDeepSeek(() => { throw Error("brain must not be called"); });
  const picked = kind === "shop" ? "buy_card0" : "o1:c8";
  const ask = vi.fn(async () => ({ model: "fixture", answers: answer(picked), inputTokens: 1, outputTokens: 1, latencyMs: 1, requestId: "fixed" }));
  const provider = vi.fn(async () => table()); const dir = fixtureDir();
  const result = await play([e.state.raw, e.state.raw] as Raw[], deepseek, loopConfig(dir),
    { brain: null, maxDecisions: 1, jev: { model: "fixture", ask } as unknown as JevClient, v6RoomProjection: provider });
  expect(result.actions[0]).toMatchObject(kind === "shop" ? { action: "buy_card", option_index: 0 } : { action: "choose_rest_option", option_index: 1 });
  expect(ask).toHaveBeenCalledTimes(1); expect(provider).toHaveBeenCalledTimes(1); expect(deepseek.calls).toHaveLength(0); expect(result.stats.jevCalls).toBe(1);
});
it.each(["shop", "rest"] as const)("binds the shared production runtime by default for %s without a room override", async kind => {
  on(); const e = room(kind), dir = fixtureDir(), picked = kind === "shop" ? "buy_card0" : "o1:c8";
  const create = vi.fn(situation => {
    expect(situation).toMatchObject({ phase: "pick", baselineId: "__room_baseline__" });
    expect(situation.options.find(o => o.id === picked)?.changes[0].kind).toBe(kind === "shop" ? "add" : "upgrade");
    return { status: "ready", request: { ...projectionRequest(), config: v6Config() }, labels: ["shared_run_snapshot"], rejected_options: [] };
  });
  const context = vi.fn(async (actual, phase) => {
    expect(phase).toBe("pick"); expect(actual.state.screen).toBe(e.state.screen);
    return { factory: { create }, situation: { runId: String(actual.state.raw.run_id), seed: 17, weights: {} } } as unknown as V6RoomProjectionBinding;
  });
  const engine = { evaluate: vi.fn(async request => {
    expect(request.config.budgets.pick_ms).toBeGreaterThan(0); expect(request.config.budgets.pick_ms).toBeLessThanOrEqual(5000);
    return table();
  }), precompute: vi.fn() };
  const runtime = new V6ProjectionRuntime(engine, async () => null, undefined, context as never);
  const ask = vi.fn(async (state) => {
    expect(JSON.stringify(state)).toContain("shared_run_snapshot");
    return { model: "fixture", answers: answer(picked), inputTokens: 1, outputTokens: 1, latencyMs: 1, requestId: "fixed" };
  });
  const result = await play([e.state.raw, e.state.raw] as Raw[], new FakeDeepSeek(() => { throw Error("brain"); }), loopConfig(dir),
    { brain: null, maxDecisions: 1, jev: { model: "fixture", ask } as unknown as JevClient, v6Projection: runtime });
  expect(result.actions[0]).toMatchObject(kind === "shop" ? { action: "buy_card", option_index: 0 } : { action: "choose_rest_option", option_index: 1 });
  expect(context).toHaveBeenCalledTimes(1); expect(create).toHaveBeenCalledTimes(1); expect(engine.evaluate).toHaveBeenCalledTimes(1);
  expect(ask).toHaveBeenCalledTimes(1); expect(result.stats.jevCalls).toBe(1);
});
it.each(["failure", "invalid", "timeout"])("local scripted loop %s falls back once without brain or retries", async mode => {
  on(); vi.stubEnv("V6_JEV_MS", "15"); const e = room("shop"), dir = fixtureDir(), deepseek = new FakeDeepSeek(() => { throw Error("brain"); });
  const ask = vi.fn(async () => { if (mode === "failure") throw Error("fixed failure"); if (mode === "timeout") return new Promise<never>(() => {});
    return { model: "fixture", answers: answer("foreign"), inputTokens: 1, outputTokens: 1, latencyMs: 1, requestId: "fixed" }; });
  const result = await play([e.state.raw, e.state.raw] as Raw[], deepseek, loopConfig(dir),
    { brain: null, maxDecisions: 1, jev: { model: "fixture", ask } as unknown as JevClient });
  expect(result.actions[0]?.action).toBe("close_shop_inventory"); expect(ask).toHaveBeenCalledTimes(1); expect(deepseek.calls).toHaveLength(0); expect(result.stats.jevCalls).toBe(1);
  expect(readFileSync(join(dir, "v6-build.jsonl"), "utf8")).toContain("missing_invalid_or_failed_jev");
});
it.each(["jev", "code-fallback"] as const)("credits the upgrade follow-up to its actual %s source", async source => {
  on(); const e = room("rest"), next = structuredClone(e.state.raw) as Raw, dir = fixtureDir();
  next.screen = "CARD_SELECTION"; next.available_actions = ["save_and_quit", "select_deck_card"]; next.rest = null;
  next.selection = { kind: "deck_upgrade_select", prompt: "选择1张牌来升级。", min_select: 1, max_select: 1,
    selected_count: 0, requires_confirmation: true, can_confirm: false,
    cards: [{ ...(asRecord(e.state.run?.raw).deck as Raw[])[8], index: 3, selected: false }] };
  const projection = table(); delta(projection, "o1:c8", "clearance", .2);
  const ask = vi.fn(async () => ({ model: "fixture", answers: answer(source === "jev" ? "o1:c8" : "foreign"),
    inputTokens: 1, outputTokens: 1, latencyMs: 1, requestId: "fixed" }));
  const result = await play([e.state.raw as Raw, next, next], new FakeDeepSeek(() => { throw Error("brain"); }), loopConfig(dir),
    { brain: null, maxDecisions: 2, jev: { model: "fixture", ask } as unknown as JevClient, v6RoomProjection: async () => projection });
  expect(result.actions).toEqual([{ action: "choose_rest_option", option_index: 1 }, { action: "select_deck_card", option_index: 3 }]);
  const follow = result.records.find(row => row.label === "selection/upgrade" && row.chosen);
  expect(follow).toMatchObject({ decider: source, v6_room_plan: { by: source, step: 2 }, usage: { input_tokens: 0 } });
  expect(follow?.deepseek).toBeUndefined();
  expect(follow?.rationale).toMatch(source === "jev" ? /^Jev plan / : /^Code fallback plan /);
  expect(asRecord(follow?.journal).choice).toMatch(source === "jev" ? /^Jev plan / : /^Code fallback plan /);
  expect(ask).toHaveBeenCalledTimes(1);
});

it.each(["IRONCLAD", "SILENT", "DEFECT", "NECROBINDER", "REGENT"])("%s disabled switches preserve exact question/action bytes and never call projection", async character => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-19T00:00:00.000Z")); vi.stubEnv("CHARACTER", character.toLowerCase());
  const hashes: string[] = [];
  for (const setting of ["off", "shadow", "on"] as const) {
    vi.stubEnv("V6_BUILD", setting); vi.stubEnv("V6_SHOP_DECIDER", setting === "off" ? "jev" : "brain"); vi.stubEnv("V6_REST_DECIDER", setting === "off" ? "jev" : "brain");
    const bytes: string[] = [], provider = vi.fn();
    for (const kind of ["shop", "rest"] as const) {
      const e = room(kind); Object.assign(e.state.run!.raw, { character_id: character });
      const d = (kind === "shop" ? planShop(e) : planRest(e))!;
      expect(isV6RoomDecision(d)).toBe(false); expect(await prepareV6RoomDecision(d, e, provider)).toBe(d);
      bytes.push(JSON.stringify({ decision: d, resolved: d.kind === "ask" ? d.resolve({}) : d }));
    }
    expect(provider).not.toHaveBeenCalled(); hashes.push(createHash("sha256").update(bytes.join("\n")).digest("hex"));
  }
  expect(new Set(hashes).size).toBe(1);
  // Captured before W7 at 7aa094344; fixture knowledge paths and time are frozen.
  const baseline: Record<string, string> = {"IRONCLAD": "27cc024dffa1df45b700b0502b3fbaf5abd2431e7e4926c4ca88c3f9a6252825", "SILENT": "b4b08f0399fc28df77b23be0eb230c03ca78b75362273650d5326ff661b503d0", "DEFECT": "5717f888dff4a0858e3ef97fcebf22eef94f70397b478a103d44b563ebbb9941", "NECROBINDER": "c02fe589650fac84975bac4e55f7a30d144644d81b5b4a7e91f25ceb426d2224", "REGENT": "ec4cd887042d0ff7338f79d693d1f07fcafa874a00abdea9e5cb1871048976e3"};
  expect(hashes[0]).toBe(baseline[character]);
});
