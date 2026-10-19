import { afterEach, describe, expect, it, vi } from "vitest";
import { directionTask, directionPlanSpec, directionSummaries } from "../src/v6/direction-plan.js";
import { detectReplan, freshReplanState, reserveReplan, type DirectionEvaluation } from "../src/v6/replan-triggers.js";
import { routeV6CardDecision } from "../src/v6/card-routing.js";
import { runPlanSpec } from "../src/brain/specs.js";
import { validateDirectionWeights, validateProjectionEntry } from "../src/v6/formats.js";
import { direction, directionContext, projection, weights } from "./v6-fixtures.js";
import { v6Config } from "../src/v6/config.js";
import { ask, board, decide, env, setupOneshotTests } from "./oneshot-support.js";
setupOneshotTests();
afterEach(() => vi.unstubAllEnvs());
const parsedWeights = () => { const r = validateDirectionWeights(weights, directionContext); if (!r.ok) throw Error(r.issues.join()); return r.value; };
const p = () => { const r = validateProjectionEntry({ ...projection, trust: "trusted" }); if (!r.ok) throw Error(r.issues.join()); return r.value; };
const config = v6Config({ V6_BUILD: "on" });
function input(evaluation: Partial<DirectionEvaluation> = {}) { return { act: 1, floor: 8, turnKey: "RUN:8", plan: parsedWeights(), requirementIds: new Set(["TEST_RELIC"]), evaluation: { id: "eval1", entries: [p()], ...evaluation } }; }

describe("direction replanning", () => {
  it("detects and coalesces T1–T7, requiring two independent evaluations for T2", () => {
    const s = freshReplanState("RUN"); s.act = 1;
    const plan = { ...parsedWeights(), direction_weights: { TEST_A: .9, TEST_B: .1 }, checkpoint: 8 };
    const e = input({ coreCompletion: { TEST_A: .29 }, comparisons: [{ direction: "TEST_B", leader: "TEST_A", mean: .11, se: .05, n: 100, offeredCore: true }],
      acquiredComponentIds: ["TEST_RELIC"], bossEntryHp: 9, hazardHp: 10, consecutiveJevFallbacks: 2 });
    expect(detectReplan(s, { ...e, plan }, config).triggers).toEqual(["T1", "T3", "T4", "T5", "T6", "T7"]);
    expect(detectReplan(s, { ...e, plan }, config).triggers).not.toContain("T2");
    const result = detectReplan(s, { ...e, plan, evaluation: { ...e.evaluation, id: "eval2" } }, config);
    expect(result.triggers).toEqual(["T1", "T2", "T3", "T4", "T5", "T6", "T7"]);
    expect(result.merged).toEqual(result.triggers.slice(1));
    reserveReplan(s, 1, e.turnKey);
    expect(detectReplan(s, { ...e, plan }, config).ask).toBe(false);
  });
  it("resets consecutive evidence and refuses an unpaired or invalid comparison", () => {
    const s = freshReplanState("RUN"); s.act = 1;
    const e = input({ comparisons: [{ direction: "TEST_B", leader: "TEST_A", mean: .2, se: .01, n: 100 }] });
    detectReplan(s, e, config);
    detectReplan(s, input({ id: "missing" }), config);
    expect(detectReplan(s, { ...e, evaluation: { ...e.evaluation, id: "new" } }, config).triggers).not.toContain("T2");
    expect(detectReplan(s, input({ comparisons: [{ direction: "TEST_B", leader: "TEST_A", mean: 1, se: NaN, n: 100 }] }), config).triggers).not.toContain("T2");
  });
  it("uses strict boundaries, unknown share and soft-cap exemptions", () => {
    const s = freshReplanState("RUN"); s.act = 1; s.calls = 15;
    const e = input({ coreCompletion: { TEST_A: .3 }, bossEntryHp: 10, hazardHp: 10, consecutiveJevFallbacks: 1 });
    expect(detectReplan(s, e, config).triggers).toEqual([]);
    const unknown = { ...p(), trust: "unknown" as const };
    expect(detectReplan(s, input({ entries: [p(), unknown] }), config).triggers).toEqual([]);
    const capped = detectReplan(s, input({ entries: [unknown], coreCompletion: { TEST_A: .1 }, bossEntryHp: 9, hazardHp: 10 }), config);
    expect(capped.triggers).toEqual(["T1", "T5", "T6"]); expect(capped.skipped).toEqual(["T1", "T6"]); expect(capped.ask).toBe(true);
    expect(detectReplan(s, { ...input(), act: 2 }, config).ask).toBe(true);
    expect(detectReplan(s, { ...input(), floor: 20 }, config).triggers).toContain("T7");
    expect(freshReplanState("OTHER").calls).toBe(0);
  });
});

it("uses the W1 validator for catalog, sum, overrides, potions, checkpoint and route", () => {
  const payload = directionTask({ summaries: [{ id: "TEST_A", name: "A", source: "construction-transition", components: ["TEST_CARD"], requirements: [], support: [], details: {} },
    { id: "TEST_B", name: "B", source: "construction-transition", components: [], requirements: [], support: [], details: {} }], entries: [p()], appearedCards: ["SEEN_CARD"], potionIds: ["TEST_POTION"], floor: 8, current: {} });
  const spec = runPlanSpec("run-plan", payload);
  expect(spec.validate(weights)).toEqual([]);
  for (const bad of [{ direction_weights: { TEST_A: 1 } }, { direction_weights: { TEST_A: .2, TEST_B: .2 } },
    { ideal_overrides: { TEST_A: ["UNSEEN"] } }, { potion_directions: [{ ...weights.potion_directions[0], potion: "UNKNOWN" }] }, { checkpoint: 8 }, { route: "r1c1" }]) {
    expect(spec.validate({ ...weights, ...bad }).length).toBeGreaterThan(0);
  }
  expect(spec.schema.properties?.direction_weights?.required).toEqual(["TEST_A", "TEST_B"]);
  expect(payload["availability"]).toEqual([{ direction: "TEST_A", target: "TEST_TARGET", option: "test_option", take: null, skip: null }]);
  expect(directionPlanSpec({})).toBeNull();
});

it("does not turn transitional support into a core or cross character/ascension", () => {
  const card = structuredClone(direction); const parsed = (awaitImportDirection(card));
  expect(directionSummaries("ironclad", 0, [parsed], [], null)).toEqual([]);
  expect(directionSummaries("silent", 1, [parsed], [], null)).toEqual([]);
  expect(directionSummaries("silent", 0, [parsed], [], null)[0]?.source).toBe("direction-card-v1");
});
import { validateDirectionCard } from "../src/v6/formats.js";
function awaitImportDirection(raw: unknown) { const d = validateDirectionCard(raw); if (!d.ok) throw Error(d.issues.join()); return d.value; }

it("card routing switch is inert off and never escalates a Jev card pick back to the brain", () => {
  const decision = ask(decide(env(board("xljq-f5-reward", "reward"))));
  const original = JSON.stringify(decision);
  vi.stubEnv("V6_CARD_DECIDER", "jev"); vi.stubEnv("V6_BUILD", "off");
  expect(routeV6CardDecision(decision)).toBe(decision); expect(JSON.stringify(routeV6CardDecision(decision))).toBe(original);
  vi.stubEnv("V6_BUILD", "on"); const routed = routeV6CardDecision(decision);
  expect(routed.kind).toBe("ask"); if (routed.kind !== "ask") return;
  expect(routed.deepseek).toBeUndefined(); expect(routed.escalate).toBeUndefined(); expect(routed.questions).toBe(decision.questions);
});
