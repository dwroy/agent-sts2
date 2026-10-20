import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { attachDirectionRide, observeDirectionRide, directionRideTask, fitDirectionRide, acceptDirectionRide, finishDirectionRide } from "../src/v6/direction-rides.js";
import { v6Config } from "../src/v6/config.js";
import { ensureDirectionPlan } from "../src/v6/direction-runtime.js";
import { parseRunPlan } from "../src/memory/run-plan.js";
import { runPlanSpec, pickSpec, stableSchema } from "../src/brain/specs.js";
import { strictSchema } from "../src/brain/engines/codex.js";
import { directionContext } from "../src/v6/direction-plan.js";
import { coreFixture } from "./v6-direction-core-fixtures.js";
import { weights } from "./v6-fixtures.js";
import { board, env, setupOneshotTests } from "./oneshot-support.js";
setupOneshotTests();
const dirs: string[] = [];
afterEach(() => { vi.unstubAllEnvs(); for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "v6-ride-")); dirs.push(dir);
  const own = join(dir, "characters", "silent"); mkdirSync(own, { recursive: true });
  const entries = ["TEST_A", "TEST_B", "TEST_C", "TEST_D"].map(coreFixture);
  for (const entry of entries) entry.combos[0]!.prerequisites = { field: "player.relics", op: "contains", value: "TEST_RELIC" } as any;
  writeFileSync(join(own, "build-cores.json"), JSON.stringify({ schema: "build-cores-v1", character: "silent", entries }));
  const raw = board("xljq-f5-reward", "reward"); Object.assign(raw.run as object, { character_id: "SILENT", ascension: 0, deck: [], relics: [] });
  const e = env(raw), log = join(dir, "plans.jsonl");
  const plan = () => parseRunPlan({ summary: "fixed V5 plan" }, e.state, e.knowledge, "start");
  e.screenMemory.runPlan = plan();
  const answer = { ...weights, direction_weights: { TEST_A: .4, TEST_B: .3, TEST_C: .2, TEST_D: .1 }, potion_directions: [] };
  return { dir, log, e, plan, answer };
}
it.each(["IRONCLAD", "SILENT", "DEFECT", "NECROBINDER", "REGENT"])("%s disabled preserves task and memory bytes with zero provider or file access", async character => {
  vi.stubEnv("V6_BUILD", "off"); const { e, dir, log } = fixture(); Object.assign(e.state.run!.raw, { character_id: character });
  const peekCompletedCore = vi.fn(); e.v6Projection = { peekCompletedCore } as any;
  const task = { question: "fixed V5" }, before = JSON.stringify(e.screenMemory);
  observeDirectionRide(e, log, dir);
  expect(await attachDirectionRide(e, task, "start", "run-plan", log, dir)).toBe(task);
  expect(JSON.stringify(e.screenMemory)).toBe(before); expect(peekCompletedCore).not.toHaveBeenCalled(); expect(existsSync(log)).toBe(false);
});
it("defaults standalone replan off while start and act weights ride on the original request", async () => {
  vi.stubEnv("V6_BUILD", "on"); vi.stubEnv("V6_DIRECTION_REPLAN", "off"); const { e, dir, log } = fixture();
  expect(v6Config().direction_replan).toBe("off");
  const askJson = vi.fn(); expect(await ensureDirectionPlan(e, { askJson } as any, log, dir)).toBeNull();
  expect(askJson).not.toHaveBeenCalled(); expect(existsSync(log)).toBe(false);
  const evaluate = vi.fn(), context = vi.fn(), peekCompletedCore = vi.fn(() => null);
  e.v6Projection = { evaluate, context, peekCompletedCore } as any;
  for (const trigger of ["start", "act"] as const) {
    const payload = await attachDirectionRide(e, { question: "unchanged", construction_context: { obsolete: true },
      run_state: { construction_context: { competing_schema: true }, hp: "30/60" } }, trigger, "event/act-plan", log, dir);
    expect(payload.question).toBe("unchanged"); expect(payload).not.toHaveProperty("construction_context");
    expect(payload.run_state).toEqual({ hp: "30/60" });
    const task = directionRideTask(payload)!; expect(Object.keys(directionContext(task)!.catalog)).toEqual(["TEST_A", "TEST_B", "TEST_C", "TEST_D"]);
    expect(JSON.stringify(task)).toContain("completed_core_cache_miss");
  }
  expect(evaluate).not.toHaveBeenCalled(); expect(context).not.toHaveBeenCalled(); expect(peekCompletedCore).toHaveBeenCalledTimes(2);
});
it("marks actual new components, persists across restart and consumes failures without per-floor reattachment", async () => {
  vi.stubEnv("V6_BUILD", "on"); const { e, dir, log } = fixture();
  observeDirectionRide(e, log, dir);
  (e.state.run!.raw.deck as unknown[]).push({ card_id: "TEST_CARD", upgraded: false });
  (e.state.run!.raw.relics as unknown[]).push({ relic_id: "TEST_RELIC" });
  observeDirectionRide(e, log, dir);
  expect(e.screenMemory.v6DirectionRide?.pending).toEqual(["T4:card:TEST_CARD:1", "T4:relic:TEST_RELIC"]);
  const task = { question: "fixed V5" };
  expect(await attachDirectionRide(e, task, null, "reward/card", log, dir)).toBe(task);
  e.screenMemory.v6DirectionRide = undefined;
  const first = await attachDirectionRide(e, task, null, "shop/plan", log, dir), ride = directionRideTask(first)!;
  expect(ride.ride_reasons).toEqual(["T4:card:TEST_CARD:1", "T4:relic:TEST_RELIC"]);
  finishDirectionRide(e, ride, "shop/plan", log, "brain_request_failed");
  for (let i = 0; i < 3; i++) {
    e.state.run!.floor++; e.screenMemory.v6DirectionRide = undefined; observeDirectionRide(e, log, dir);
    expect(await attachDirectionRide(e, task, null, "event/option", log, dir)).toBe(task);
  }
  (e.state.run!.raw.deck as unknown[]).push({ card_id: "TEST_CARD", upgraded: true });
  observeDirectionRide(e, log, dir);
  expect(directionRideTask(await attachDirectionRide(e, task, null, "rest/option", log, dir))!.ride_reasons).toEqual(["T4:card:TEST_CARD:2"]);
  expect(readFileSync(log, "utf8")).toContain('"stage":"brain_request_failed"');
});
it("does not invent T3 from missing comparisons or B versus current-deck outcomes", () => {
  vi.stubEnv("V6_BUILD", "on"); const { e, dir, log, answer } = fixture();
  e.screenMemory.runPlan!.v6 = answer as any; observeDirectionRide(e, log, dir);
  e.v6CardResults = { immediate: [{ option_id: "card0", paired_delta: { hp_loss: { mean: -10, se: 1, n: 100 } } }] } as any;
  observeDirectionRide(e, log, dir); expect(e.screenMemory.v6DirectionRide?.pending).toEqual([]);
  e.v6DirectionEvaluation = { id: "fixed-pair", entries: [], comparisons: [{ leader: "TEST_A", direction: "TEST_D", offeredCore: true, optionId: "card0", mean: 1, se: .01, n: 100 }] };
  observeDirectionRide(e, log, dir); expect(e.screenMemory.v6DirectionRide?.pending).toEqual([]);
  expect(readFileSync(log, "utf8")).toContain("T3_current_option_fingerprint_unavailable");
});
it("validates optional weights locally, retaining the latest plan for missing or invalid updates", async () => {
  vi.stubEnv("V6_BUILD", "on"); const { e, dir, log, plan, answer } = fixture();
  const ride = directionRideTask(await attachDirectionRide(e, {}, "start", "run-plan", log, dir))!;
  let next = plan(); acceptDirectionRide(e, next, { v6: answer }, ride, "run-plan", log); e.screenMemory.runPlan = next;
  expect(next.v6?.direction_weights).toEqual(answer.direction_weights);
  for (const json of [{}, { v6: null }, { v6: { ...answer, direction_weights: { TEST_A: 1 } } }]) {
    next = plan(); acceptDirectionRide(e, next, json, ride, "event/option", log); e.screenMemory.runPlan = next;
    expect(next.v6?.direction_weights).toEqual(answer.direction_weights);
  }
  expect(readFileSync(log, "utf8")).toContain('"stage":"retained"');
});
it("keeps optional invalid v6 out of V5 answer validation and carries its schema through stable Codex specs", async () => {
  vi.stubEnv("V6_BUILD", "on"); const { e, dir, log } = fixture();
  const task = await attachDirectionRide(e, {}, "start", "run-plan", log, dir), run = runPlanSpec("run-plan", task);
  expect(run.schema.properties?.v6?.properties?.direction_weights?.required).toEqual(["TEST_A", "TEST_B", "TEST_C", "TEST_D"]);
  expect(run.validate({ summary: "V5 reply", v6: { invalid: true } })).toEqual([]);
  expect((strictSchema(run.schema) as any).properties.v6.type).toEqual(["object", "null"]);
  const pick = pickSpec("event/option", { a: "fixed" }, { run_plan_task: task });
  expect(stableSchema(pick).properties?.run_plan?.properties?.v6).toBeDefined();
  expect(pick.validate({ choice: "a", reason: "fixed", run_plan: { summary: "V5 reply", v6: { invalid: true } } })).toEqual([]);
});
it("budgets a complete four-direction ride alongside a 21k V5 run context", async () => {
  vi.stubEnv("V6_BUILD", "on"); const { e, dir, log } = fixture();
  const state = { run_plan_task: await attachDirectionRide(e, { task: "V5 request" }, "start", "event/act-plan", log, dir) };
  const surrounding = { memory: "m".repeat(21_000), question: "fixed V5 question", options: { a: "a" } };
  const fitted = fitDirectionRide(state, surrounding), ride = directionRideTask(fitted)!;
  expect(ride).not.toBeNull(); expect((ride.build_cores as unknown[])).toHaveLength(4);
  expect(JSON.stringify({ ...surrounding, state: fitted }).length).toBeLessThanOrEqual(30_000);
});
