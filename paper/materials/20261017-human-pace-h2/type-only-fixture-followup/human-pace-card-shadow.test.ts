/** Fixed card offers, paired caches and an in-memory Jev; no network/model calls. */
import { afterEach, expect, it, vi } from "vitest";
import { askCardShadow, captureCardShadow, evaluateCardShadow } from "../src/sim/human-pace-card-shadow.js";
import { board, env, decide, ask } from "./oneshot-support.js";
import type { GlobalBossPool } from "../src/sim/global-build-pool.js";
import type { CoreTemplate } from "../src/construction/types.js";
import type { JevAskResult, JevClient } from "../src/reflex/jev/client.js";
import { DecisionBudget, currentDecisionBudget, withDecisionBudget } from "../src/core/decision-budget.js";
import * as comparisons from "../src/sim/human-pace-comparison.js";
import { slimInput } from "../src/sim/boss-sim.js";
import { board as fightBoard } from "./boss-sim-fixture.js";
import type { DeckSimRunner } from "../src/sim/build-sim-pool.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
vi.mock("../src/sim/boss-trust.js", async (original) => ({ ...await original<object>(), bossTrustReason: () => null }));
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllEnvs(); setKnowledgeCharacter(null); });
const pool: GlobalBossPool = { character: "silent", ascension: 10, unknown: [], unit: "observed_fight_records_including_retries",
  source: { path: "fixed", sha256: "a".repeat(64), generated: null }, stages: [2, 3].map((act) => ({ act,
    candidates: [{ boss: "FIXED", count: 1, frequency: 1, evidence: ["FIXTURE"] }] })) };
function fixture() {
  setKnowledgeCharacter("silent"); vi.stubEnv("CHARACTER", "silent");
  const raw = board("xljq-f5-reward", "reward"); Object.assign(raw.run as object, { character_id: "SILENT", ascension: 10 });
  const environment = env(raw), decision = ask(decide(environment)), input = captureCardShadow(decision, environment);
  const core: CoreTemplate = { id: "P", name: "fixed", character: "silent", ascensions: [10], status: "candidate",
    requirements: [{ id: "fixed", any: [{ kind: "card", id: input.options[0]!.id! }], count: 1 }],
    evidence: { runs: ["FIXTURE"], source: "fixed", sha256: "a".repeat(64) }, limits: [] };
  const cache = { global_build: { targets: [{ target: { act: 2, boss: "FIXED" }, status: "computed",
    rows: input.options.map((row, i) => ({ key: row.key, delta_win: { mean: row.key === "skip" ? 0 : i === 0 ? 0.2 : 0.1, se: 0.01 },
      delta_s: { mean: i === 0 ? -100 : 100, se: 1 }, samples: 200, unknown: null })) }] } };
  return { environment, decision, input, core, cache };
}
async function facts() {
  const f = fixture();
  return evaluateCardShadow({ input: f.input, env: f.environment, cores: [f.core], plan: null, pool, originalB3: f.cache, setup: null });
}

it("reuses only this question's paired cache, uses win rather than S, and records dilution as inventory only", async () => {
  const f = fixture(), before = JSON.stringify(f.environment.state.raw);
  const result = await evaluateCardShadow({ input: f.input, env: f.environment, cores: [f.core], plan: null, pool, originalB3: f.cache, setup: null });
  expect(result.module_first).toBe(f.input.options[0]?.key);
  expect(result.rows[0]).toMatchObject({ target_delta_win: { mean: 0.2 }, target_delta_S: { mean: -100 }, support_component: null,
    dilution: { deck_after: f.input.current.cards.length + 1, functional_draw_or_damage_effect: "unknown" } });
  expect(result.predictions[0]?.source).toBe("same_question_G2_cache");
  expect(result.predictions[1]?.rows.every((row) => row.unknown === "Act3_quality_gate_and_production_trust_unknown")).toBe(true);
  expect(result.rows.find((r) => r.key === "skip")?.dilution.added_slot_fraction).toBe(0);
  expect(JSON.stringify(f.environment.state.raw)).toBe(before);
  expect(result).toMatchObject({ delivered: false, budget_ms: 5000 });
});

it("does not manufacture support membership or a preferred core when the plan is uncommitted", async () => {
  const result = await facts();
  expect(result.primary).toBe("uncommitted");
  expect(result.rows[0]?.core_component).toBeNull();
  expect(result.rows[0]?.template_membership).toContain("P");
  expect(result.rows[0]?.wake).toMatchObject({ uncovered_by_plan: null, possible_direction_change: true });
});

it("keeps unknown scores null, and identifies its stable skip fallback as lacking a known comparison", async () => {
  const f = fixture();
  const result = await evaluateCardShadow({ input: f.input, env: f.environment, cores: [], plan: null, pool, originalB3: {}, setup: null });
  expect(result.module_first).toBe("skip"); expect(result.module_first_basis).toContain("unknown");
  expect(result.rows.every((row) => row.target_delta_win === null && row.target_delta_S === null)).toBe(true);
});

it("bounds the actual shared B3 request by5s and records a hanging result as unknown", async () => {
  vi.useFakeTimers();
  vi.spyOn(comparisons, "directionStart").mockReturnValue(slimInput(fightBoard({ bossHp: 12 })));
  const f = fixture(), run = vi.fn<DeckSimRunner["run"]>(async () => new Promise<never>(() => {}));
  const pending = evaluateCardShadow({ input: f.input, env: f.environment, cores: [], plan: null, pool, originalB3: {},
    setup: { runner: { run }, samples: 2 }, now: () => Date.now() });
  await vi.advanceTimersByTimeAsync(5001);
  const result = await pending;
  expect(run).toHaveBeenCalledTimes(1);
  expect(run.mock.calls[0]?.[0]).toMatchObject({ deadlineMs: expect.any(Number) });
  expect(result.time_budget.timed_out).toBe(true);
  expect(result.rows.every((row) => row.target_delta_win === null)).toBe(true);
});

function response(choice: string): JevAskResult {
  return { model: "fixed", answers: { card: { type: "choice", choice, probabilities: {}, confidence: 1, raw: {} } },
    latencyMs: 1, inputTokens: 1, outputTokens: 1, requestId: "FIXED" };
}
it("asks one short English facts-only shadow question and keeps its choice separate from the brain", async () => {
  const f = await facts(), ask = vi.fn<JevClient["ask"]>(async () => response("skip"));
  const result = await askCardShadow(f, { ask }, f.module_first);
  expect(ask).toHaveBeenCalledTimes(1);
  expect(ask.mock.calls[0]?.[1]).toHaveProperty("card.instructions", expect.stringContaining("do not calculate"));
  expect(result).toMatchObject({ delivered: false, jev_choice: "skip", module_first: f.module_first, actual_brain_choice: f.module_first, agreement: false });
});

it.each(["throw", "invalid", "timeout"])("falls back only in the shadow record after Jev %s, without re-asks", async (kind) => {
  vi.useFakeTimers(); const f = await facts();
  const ask = vi.fn(async () => { if (kind === "throw") throw new Error("fixed");
    if (kind === "timeout") return new Promise<JevAskResult>(() => {}); return response("not-offered"); });
  const parent = new DecisionBudget("real", "brain", () => Date.now()); parent.pause();
  const pending = withDecisionBudget(parent, () => askCardShadow(f, { ask }, "skip", () => Date.now()));
  await vi.advanceTimersByTimeAsync(1001);
  const result = await pending;
  expect(result.jev_choice).toBe(f.module_first); expect(result.fallback).toBeTruthy(); expect(ask).toHaveBeenCalledTimes(1);
  expect(parent.elapsed()).toBe(0); expect(currentDecisionBudget()).toBeUndefined();
});
