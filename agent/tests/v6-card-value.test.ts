import { afterEach, expect, it, vi } from "vitest";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CardValueRuntime } from "../src/v6/card-value.js";
import { V6ProjectionRuntime } from "../src/v6/projection-runtime.js";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import { SerialDeckRunner } from "../src/sim/build-sim-pool.js";
import { observeV6CardReward } from "../src/v6/card-reward-scope.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { loggedEnv } from "./logged.js";

const frozen = JSON.parse(readFileSync(new URL("./v6-fixtures/v6-r405-card-options.json", import.meta.url), "utf8"));
const roots: string[] = [];
afterEach(() => { vi.unstubAllEnvs(); roots.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })); });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "card-value-")); roots.push(root);
  mkdirSync(join(root, "characters/silent"), { recursive: true });
  for (const file of ["opening-value.json", "build-cores.json"]) copyFileSync(new URL(`../../knowledge/characters/silent/${file}`, import.meta.url), join(root, "characters/silent", file));
  const raw = structuredClone(frozen.states["RBMEQGXPE9Z2-f3-REWARD"]);
  const env = loggedEnv({ source: "frozen RBME F3", state: raw, decision: { label: "reward/card", decider: "jev", chosen: null, rationale: "" } });
  return { root, raw, env, runtime: new CardValueRuntime(root) };
}
it("caches only the same deck, offers, resources, HP, floor and selected route; cached results cannot be mutated", () => {
  const { env, raw, runtime } = fixture();
  const first = runtime.evaluate(env)!;
  first.options[0]!.unknown.push("caller_mutation");
  const second = runtime.evaluate(env)!;
  expect(second.telemetry.cache_hits).toBe(1); expect(second.options[0]!.unknown).not.toContain("caller_mutation");
  const fingerprints = new Set([second.fingerprint]);
  for (const mutate of [
    () => { raw.run.deck.push(structuredClone(raw.run.deck[0])); },
    () => { raw.reward.card_options[0].upgraded = !raw.reward.card_options[0].upgraded; },
    () => { raw.run.relics.push({ relic_id: "FIXED_TEST_RELIC" }); },
    () => { raw.run.potions.push({ potion_id: "FIXED_TEST_POTION", occupied: true }); },
    () => { env.state.run!.current_hp!--; },
    () => { env.state.run!.floor!++; },
    () => { env.screenMemory.routePlan = { runId: raw.run_id, act: 1, floor: 4, hpPct: .5, summary: "fixed route", path: [{ row: 16, col: 0, type: "Boss", hpOnArrival: null }] }; },
  ]) {
    mutate(); const result = runtime.evaluate(env)!;
    expect(result.telemetry.cache_hits).toBe(0); expect(fingerprints.has(result.fingerprint)).toBe(false); fingerprints.add(result.fingerprint);
  }
});
it("uses future selected-route counts and the observed enemy distribution; keeps next Boss separate from current-act rank", () => {
  const { env, raw, runtime } = fixture();
  env.screenMemory.routePlan = { runId: raw.run_id, act: 1, floor: 3, hpPct: .5, summary: "fixed route", path: [
    { row: 1, col: 0, type: "Monster", hpOnArrival: null },
    { row: 5, col: 0, type: "Monster", hpOnArrival: null },
    { row: 7, col: 0, type: "Elite", hpOnArrival: null },
    { row: 16, col: 0, type: "Boss", hpOnArrival: null },
  ] };
  const table = runtime.evaluate(env)!;
  expect(table.route).toEqual({ source: "selected_route", counts: { hallway: 1, elite: 1, boss: 1 } });
  for (const option of table.options) {
    expect(option.known).toBe(true);
    for (const kind of ["hallway", "elite", "boss"]) expect(option.targets.filter(t => t.kind === kind).reduce((sum, t) => sum + t.weight, 0)).toBeCloseTo(1, 12);
    expect(option.saved_hp).toBeCloseTo(option.targets.reduce((sum, t) => sum + t.saved_hp * t.count * t.weight, 0), 12);
    expect(option.next_boss_saved_hp).not.toBeNull();
  }
  const ordered = [...table.options].sort((a, b) => a.rank! - b.rank!);
  for (let i = 1; i < ordered.length; i++) expect(ordered[i - 1]!.saved_hp!).toBeGreaterThanOrEqual(ordered[i]!.saved_hp!);
});
it("leaves novel cards and unobserved visible Bosses unknown and freezes the model for the run", () => {
  const { env, raw, root, runtime } = fixture();
  const initial = runtime.evaluate(env)!; expect(initial.options.every(o => o.known)).toBe(true);
  rmSync(join(root, "characters/silent/opening-value.json"));
  raw.reward.card_options[0].card_id = "UNOBSERVED_FIXED_CARD";
  const changed = runtime.evaluate(env)!;
  expect(changed.model_id).toBe(initial.model_id);
  expect(changed.options.find(o => o.id === "card0")).toMatchObject({ known: false, saved_hp: null, unknown: ["candidate_outside_training_card_support"] });
  raw.run.boss_id = "UNOBSERVED_FIXED_BOSS";
  expect(runtime.evaluate(env)!.options.find(o => o.id === "skip")).toMatchObject({ known: false, saved_hp: null, unknown: ["unobserved_current_boss"] });
  raw.run_id = "NEXT_FIXED_RUN";
  expect(runtime.evaluate(env)!.options.every(o => !o.known && o.unknown.includes("opening_model_unavailable"))).toBe(true);
  raw.run.character_id = "IRONCLAD";
  expect(runtime.evaluate(env)).toBeUndefined();
});

it("admits only on/brain rewards with observed combat provenance, keeping other roles and modes unchanged", () => {
  const { env, raw, runtime: value } = fixture();
  const evaluate = vi.spyOn(value, "evaluate");
  const runtime = new V6ProjectionRuntime(new V6ProjectionEngine(new SerialDeckRunner()), async () => null, undefined, undefined, undefined, value);
  vi.stubEnv("V6_BUILD", "on"); vi.stubEnv("V6_CARD_DECIDER", "brain");
  expect(runtime.evaluateBrainCardValue(env)).toBeUndefined(); expect(evaluate).not.toHaveBeenCalled();
  observeV6CardReward(env.screenMemory, parseGameState(frozen.states["RBMEQGXPE9Z2-f3-COMBAT"]));
  observeV6CardReward(env.screenMemory, env.state);
  expect(runtime.evaluateBrainCardValue(env)?.model_id).toBeTruthy();
  expect(evaluate).toHaveBeenLastCalledWith(env, 450);
  evaluate.mockClear();
  for (const mode of ["off", "shadow"]) {
    vi.stubEnv("V6_BUILD", mode); expect(runtime.evaluateBrainCardValue(env)).toBeUndefined();
  }
  vi.stubEnv("V6_BUILD", "on"); vi.stubEnv("V6_CARD_DECIDER", "jev");
  expect(runtime.evaluateBrainCardValue(env)).toBeUndefined(); expect(evaluate).not.toHaveBeenCalled();
  vi.stubEnv("V6_CARD_DECIDER", "brain"); raw.run.character_id = "IRONCLAD";
  expect(runtime.evaluateBrainCardValue(env)).toBeUndefined();
});
it("abandons an exhausted preparation budget before making predictions", () => {
  const { env, runtime } = fixture();
  expect(() => runtime.evaluate(env, 0)).toThrow("card_value_preparation_budget");
});
