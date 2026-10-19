import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { buildV6CardPick, cardFallback, cardAnswer, recordCardPick } from "../src/v6/card-pick.js";
import { planReward } from "../src/hand/screens/reward.js";
import { v6Config } from "../src/v6/config.js";
import { V6ProjectionRuntime } from "../src/v6/projection-runtime.js";
import { loadConfig } from "../src/core/config.js";
import { V6ProjectionEngine, type V6ProjectionTable } from "../src/sim/v6-projection.js";
import { validateProjectionEntry } from "../src/v6/formats.js";
import { coreFixture } from "./v6-direction-core-fixtures.js";
import { validateBuildCore } from "../src/v6/build-core.js";
import { unknownBuildStatistic } from "./v6-build-metric-fixtures.js";
import { FixedRunner, request, source, direction, req } from "./v6-projection-fixture.js";
import { board, env, FakeDeepSeek, play, setupOneshotTests, type Raw } from "./oneshot-support.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";
import type { JevClient } from "../src/reflex/jev/client.js";
const own = vi.hoisted(() => ({ dir: "" }));
vi.mock("../src/knowledge/files.js", async original => ({ ...await original<object>(), get KNOWLEDGE_DIR() { return own.dir; } }));
setupOneshotTests();
const dirs: string[] = [];
afterEach(() => { vi.unstubAllEnvs(); for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
function fixture(mode = "on", character = "silent") {
  vi.stubEnv("CHARACTER", character); vi.stubEnv("V6_BUILD", mode); vi.stubEnv("V6_CARD_DECIDER", "jev");
  const dir = mkdtempSync(join(tmpdir(), "v6-card-")); dirs.push(dir); own.dir = dir;
  const kd = join(dir, "characters", character); mkdirSync(kd, { recursive: true });
  writeFileSync(join(kd, "build-cores.json"), JSON.stringify({ schema: "build-cores-v1", character, entries: [{ ...coreFixture(), scope: { character, ascensions: [0, 1] } }] }));
  const raw = board("xljq-f5-reward", "reward");
  Object.assign(raw.run as Raw, { character_id: character.toUpperCase(), ascension: 0 });
  raw.available_actions = ["choose_reward_card", "skip_reward_cards"];
  raw.reward = { pending_card_choice: true, card_options: [{ index: 2, card_id: "TEST_CARD", upgraded: true }, { index: 7, card_id: "TEST_OTHER", upgraded: false }] };
  const e = env(raw); e.screenMemory.runPlan = { runId: String(raw.run_id), act: 1, v6: { direction_weights: { TEST_A: 1 }, potion_directions: [], checkpoint: 40 } } as typeof e.screenMemory.runPlan;
  return { dir, raw, e };
}
function answer(choice: string): AnswerSet { return { pick: { type: "choice", choice, confidence: .8, probabilities: { [choice]: .8 }, raw: {} } }; }
function table(): V6ProjectionTable { return { schema: "v6-projection-table-v1", enabled: true, phase: "pick", combinations: [], entries: [], act_evaluations: [], weighted: [], rankings: {}, target_mixtures: [],
  targets: [{ id: "f17:TEST_BOSS", boss: "TEST_BOSS", act: 1, floor: 17, kind: "current", probability: 1, labels: [] }],
  telemetry: { elapsed_ms: 1, cache_hits: 0, cache_misses: 0, simulations: 0, timed_out: 0, degradation: [], unknown_entries: 0, total_entries: 0, unknown_fraction: 0, act_cache_hit: false } }; }
function delta(t: V6ProjectionTable, option: string, kind: "current_gate" | "clearance", mean: number | null, se = .01) {
  t.target_mixtures.push({ option_id: option, kind, paired_delta: mean === null ? null : { mean, se, n: 20 }, value: null, known_mass: mean === null ? 0 : 1, known_value: 0, labels: [] });
}
it("keeps legal reward indices, English Decisions criteria and unknown per-combo entries", () => {
  const { e, dir } = fixture(), p = buildV6CardPick(e, undefined, dir)!;
  expect(p.choices).toEqual(["card2", "card7", "skip"]);
  expect(p.decision.questions.pick).toMatchObject({ type: "choice", criteria: { card2: "Take TEST_CARD+", card7: "Take TEST_OTHER", skip: "Take no card" } });
  expect(p.decision.resolve(answer("card7")).intent).toEqual({ action: "choose_reward_card", option_index: 7 });
  expect(p.decision.resolve(answer("unoffered")).intent).toEqual({ action: "skip_reward_cards" });
  expect(p.entries).toHaveLength(12); expect(p.entries.every(e => validateProjectionEntry(e).ok && e.win === null)).toBe(true);
  expect(p.decision.state).toMatchObject({ core_metrics: [expect.objectContaining({ metrics: expect.arrayContaining([
    expect.objectContaining({ attempt: "first", dpr_boss: expect.objectContaining({ value: 20, n: 3, method: "synthetic contract" }) }),
    expect.objectContaining({ attempt: "including_sl", dpr_boss: expect.objectContaining({ value: 20, n: 3, method: "synthetic contract" }) }),
  ]) }), expect.anything()] });
  expect(JSON.stringify((p.decision.state as { options: object }).options)).not.toContain("combo_metrics");
  expect(p.decision.deepseek).toBeUndefined(); expect(p.decision.escalate).toBeUndefined();
  expect(JSON.stringify(p.decision)).not.toMatch(/single.card.win|actual.brain.choice/);
  recordCardPick(e, p, join(dir, "plans.jsonl"), "fixture", {}, 2, "missing");
  expect(JSON.parse(readFileSync(join(dir, "v6-build.jsonl"), "utf8")).unknown).toEqual({ count: 12, total: 12 });
});
it("consumes W3's genuine per-combination rows including the P=1 null-W0 boundary", async () => {
  const { e, dir } = fixture(), r = request(); r.ascension = 0; r.weights = { TEST_A: 1 };
  r.directions = [{ ...direction("TEST_A"), ascensions: [0] }];
  r.options = [{ ...r.options[0]!, id: "card2", card: { id: "TEST_CARD", upgraded: true } }]; r.targets[0]!.id = "f17:TEST_BOSS";
  const provider = source({ skip: 1, take: 1 }), resolve = provider.resolve;
  provider.resolve = c => { const out = resolve(c)!; out.combinations[0]!.id = "TEST_A:min";
    out.combinations[0]!.source = "build_core"; out.combinations[0]!.availability = { skip: 1, card2: 1 };
    out.combinations[0]!.requirements = [req("TEST_CARD", 1, true)]; out.combinations[0]!.roles = { TEST_CARD: ["output"] };
    out.combinations[0]!.supply = { skip: Array(200).fill(true), card2: Array(200).fill(true) }; return out; };
  r.completionSources = [provider];
  const t = await new V6ProjectionEngine(new FixedRunner()).evaluate(r), p = buildV6CardPick(e, t, dir)!;
  expect(p.entries.find(e => e.option_id === "card2" && e.combo_id === "TEST_A:min")).toMatchObject({ expected_win: 1, win_incomplete: null, target_id: "f17:TEST_BOSS" });
  expect(p.entries.filter(e => e.option_id === "card7").every(e => e.expected_win === null)).toBe(true);
  expect(p.entries.every(e => validateProjectionEntry(e).ok)).toBe(true);
  expect(p.decision.state).toMatchObject({ options: { card2: { projections: [expect.objectContaining({ combo_id: "TEST_A:min",
    combo_role: "in_combo", role_labels: ["output"], formation_se: 0, formation_n: 200 }), expect.anything()] },
    skip: { projections: [expect.objectContaining({ combo_role: "off_combo", role_labels: [] }), expect.anything()] } },
    model_limits: expect.arrayContaining(["raw_simulation_not_calibrated", "partial_model"]) });
});
it("consumes W1.2 pooled metrics without filtering source ascensions or merging attempt denominators", () => {
  const { e, dir } = fixture(), core = coreFixture(); core.scope.ascensions.push(10);
  for (const combo of core.combos) for (const metric of combo.metrics) {
    metric.target_ascension = 10;
    metric.sources = [
      { version: "fixture-old", ascension: 1, run_ids: ["FIXTURE_RUN", "FIXTURE_2"], counts: {
        runs: 2, formed_runs: 2, cleared_runs: 1, chain_reached: 0, chain_won: 0, bosses: { TEST_TARGET: { reached: 2, won: 1 } } } },
      { version: null, ascension: null, run_ids: ["FIXTURE_3"], counts: {
        runs: 1, formed_runs: 1, cleared_runs: 0, chain_reached: 0, chain_won: 0, bosses: { TEST_TARGET: { reached: 1, won: 0 } } } },
    ];
    const outcomes = { win_rate: unknownBuildStatistic(), hp_loss: unknownBuildStatistic(), completion_turns: unknownBuildStatistic() };
    metric.simulation = [{ target: "TEST_TARGET", entry_hp: null, ...outcomes, dpr: unknownBuildStatistic(), trust: "unknown", labels: ["missing_exact_A10"] }];
    metric.regression = [{ target: "TEST_TARGET", ...outcomes, ascension_offset: outcomes, method: "synthetic unidentifiable model", labels: ["unknown_regression"] }];
    metric.shrinkage = [{ basis: "observed", target: null, metric: "dpr_boss", raw: metric.observed.dpr_boss,
      direction: { ...metric.observed.dpr_boss, value: 10 }, estimate: { ...metric.observed.dpr_boss, value: 12.5 },
      combo_weight: .25, method: "synthetic contract", labels: ["small_sample"] }];
  }
  expect(validateBuildCore(core).ok).toBe(true);
  writeFileSync(join(dir, "characters/silent/build-cores.json"), JSON.stringify({ schema: "build-cores-v1", character: "silent", entries: [core] }));
  const pick = buildV6CardPick(e, undefined, dir)!;
  const state = pick.decision.state as { core_metrics: { metrics: Record<string, unknown>[] }[] };
  expect(state.core_metrics).toHaveLength(2);
  for (const combo of state.core_metrics) {
    expect(combo.metrics.map(m => m.attempt)).toEqual(["first", "including_sl"]);
    for (const metric of combo.metrics) {
      expect(metric).toMatchObject({ target_ascension: 10, raw_counts: { runs: 3 },
        sources: [{ version: "fixture-old", ascension: 1, counts: { runs: 2 } }, { version: null, ascension: null, counts: { runs: 1 } }],
        dpr_boss: { value: 20, n: 3 }, history: { bosses: { TEST_TARGET: { reached: { value: 3 }, won: { value: 1 } } } },
        simulation: [{ entry_hp: null, win_rate: { value: null, n: 0, unknown_reason: "fixture has no observations" }, labels: ["missing_exact_A10"] }],
        regression: [{ ascension_offset: { win_rate: { value: null } }, labels: ["unknown_regression"] }],
        shrinkage: [{ raw: { value: 20 }, direction: { value: 10 }, estimate: { value: 12.5 }, combo_weight: .25 }],
      });
      expect(metric).not.toHaveProperty("ascension"); expect(metric).not.toHaveProperty("version");
    }
  }
  expect(JSON.stringify(state.core_metrics)).not.toContain("FIXTURE_RUN");
  expect(JSON.stringify(pick.entries)).toContain("FIXTURE_RUN");
});
it("fallback excludes the unsafe boss gate, then ranks chain, current boss and skip", () => {
  fixture(); const t = table(), choices = ["card2", "card7", "skip"];
  delta(t, "card2", "current_gate", -.1); delta(t, "card2", "clearance", .9);
  delta(t, "card7", "current_gate", .02); delta(t, "card7", "clearance", .04);
  delta(t, "skip", "current_gate", 0); delta(t, "skip", "clearance", 0);
  expect(cardFallback(choices, t)).toBe("card7");
  t.target_mixtures.find(r => r.option_id === "card7" && r.kind === "clearance")!.paired_delta!.mean = 0;
  expect(cardFallback(choices, t)).toBe("card7");
  t.target_mixtures.find(r => r.option_id === "card7" && r.kind === "current_gate")!.paired_delta!.mean = 0;
  expect(cardFallback(choices, t)).toBe("skip");
  expect(cardFallback(choices, table())).toBe("skip");
  expect(cardFallback(["card2"], table())).toBe("card2");
});
it.each([NaN, -1, 1.1])("rejects invalid confidence %s without dispatching a foreign choice", confidence => {
  fixture(); const a = answer("card2"); (a.pick as { confidence: number }).confidence = confidence;
  expect(cardAnswer(a, ["card2", "skip"])).toBeNull();
});
it.each(["IRONCLAD", "SILENT", "DEFECT", "NECROBINDER", "REGENT"])("%s off rewards retain exact question/action bytes", character => {
  const { raw } = fixture("off"); (raw.run as Raw).character_id = character;
  const render = () => { const d = planReward(env(raw))!; return JSON.stringify({ ...d, resolved: d.kind === "ask" ? d.resolve(answer("skip")) : d }); };
  vi.stubEnv("V6_CARD_DECIDER", "brain"); const before = render();
  vi.stubEnv("V6_CARD_DECIDER", "jev"); expect(render()).toBe(before);
  expect(buildV6CardPick(env(raw), undefined, "/missing")).toBeNull();
});
it.each(["success", "error", "invalid", "timeout"])("loop routes cards to Jev once with independent budget and logs fallback (%s)", async mode => {
  const { raw, dir } = fixture(), fake = new FakeDeepSeek(() => "skip");
  const provider = { evaluate: vi.fn(async r => ({ ...table(), phase: r.phase })), precompute: vi.fn() };
  const runtime = new V6ProjectionRuntime(provider, async (_e, phase) => ({ ...request(), phase }));
  if (mode === "timeout") vi.stubEnv("V6_JEV_MS", "10");
  const ask = vi.fn(async (state: unknown, _q: unknown, timeout: number) => {
    if (mode === "success") expect(state).toMatchObject({ targets: [expect.objectContaining({ id: "f17:TEST_BOSS" })] });
    expect(timeout).toBeGreaterThan(0); expect(timeout).toBeLessThanOrEqual(mode === "timeout" ? 10 : 5000);
    if (mode === "error") throw Error("fixed failure");
    if (mode === "timeout") return new Promise<never>(() => {});
    return { model: "fixture", answers: answer(mode === "invalid" ? "foreign" : "card7"), inputTokens: 7, outputTokens: 2, latencyMs: 1, requestId: "fixed" };
  });
  const events: unknown[] = [];
  const result = await play([raw], fake, { runPlanLog: join(dir, "plans.jsonl"), buildOneshot: "off", sl: { ...loadConfig({}).sl, enabled: false }, run: { ...loadConfig({}).run, character: "silent" } }, { onEvent: event => events.push(event), brain: null, jev: { model: "fixture", ask } as unknown as JevClient, v6Projection: mode === "success" ? runtime : undefined, maxDecisions: 1 }).catch(error => { throw new Error(`${error}; events=${JSON.stringify(events)}`); });
  expect(ask).toHaveBeenCalledTimes(1); expect(fake.calls).toHaveLength(0);
  expect(result.actions).toHaveLength(1);
  expect(result.actions[0]).toMatchObject(mode === "success" ? { action: "choose_reward_card", option_index: 7 } : { action: "skip_reward_cards" });
  const row = result.records.find(r => r.v6_card)!;
  expect(row.fallback).toBe(mode !== "success");
  expect(result.stats.jevCalls).toBe(1);
  if (mode === "success") expect(provider.evaluate).toHaveBeenCalledWith(expect.objectContaining({ phase: "act" }));
  if (mode === "success") expect(row).toMatchObject({ usage: { input_tokens: 7, output_tokens: 2 }, request_ids: ["fixed"] });
});
it("shadow calls and records Jev but executes the existing brain's choice", async () => {
  const { raw, dir } = fixture("shadow", "ironclad"), fake = new FakeDeepSeek(() => "skip");
  const ask = vi.fn(async () => ({ model: "fixture", answers: answer("card7"), inputTokens: 7, outputTokens: 2, latencyMs: 1, requestId: "shadow-fixed" }));
  const events: unknown[] = [];
  const result = await play([raw], fake, { runPlanLog: join(dir, "plans.jsonl"), buildOneshot: "off", sl: { ...loadConfig({}).sl, enabled: false }, run: { ...loadConfig({}).run, character: "ironclad" } }, { onEvent: event => events.push(event), jev: { model: "fixture", ask } as unknown as JevClient, maxDecisions: 1 }).catch(error => { throw new Error(`${error}; events=${JSON.stringify(events)}`); });
  expect(ask).toHaveBeenCalledTimes(1);
  expect(result.actions).toEqual([{ action: "skip_reward_cards" }]);
  expect(fake.calls.some(c => c.label === "reward/card")).toBe(true);
  expect(result.stats.jevCalls).toBe(0);
  expect(result.stats.inputTokens).toBe(0);
  const shadow = result.records.find(r => r.label === "reward/card/v6-shadow")!;
  expect(shadow).toMatchObject({ chosen: { action: "choose_reward_card", option_index: 7 }, request_ids: ["shadow-fixed"] });
});
