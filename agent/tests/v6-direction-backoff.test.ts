import { expect, it } from "vitest";
import { detectReplan, finishReplan, freshReplanState, reserveReplan } from "../src/v6/replan-triggers.js";
import { v6Config } from "../src/v6/config.js";
import type { DirectionWeights } from "../src/v6/formats.js";
const config = v6Config({ V6_BUILD: "on" });
const plan: DirectionWeights = { schema: "direction-weights-v1", direction_weights: { A: 1 }, potion_directions: [], route: "keep", rest: "auto", checkpoint: 10, reason: "fixture" };
const input = (floor: number) => ({ act: 1, floor, turnKey: `RUN:1:${floor}`, plan,
  evaluation: { id: `eval:${floor}`, entries: [] }, requirementIds: new Set(["RELIC"]) });
it("allows one failed-checkpoint retry, then suppresses every later floor and a restart", () => {
  let s = freshReplanState("RUN"); s.act = 1;
  for (let floor = 11; floor <= 28; floor++) {
    const result = detectReplan(s, input(floor), config);
    expect(result.ask).toBe(floor <= 12);
    if (result.ask) {
      reserveReplan(s, 1, input(floor).turnKey);
      finishReplan(s, 1, new Error("DecisionBudgetExpired: human-pace budget exhausted: L2_brain"));
    } else expect(result).toMatchObject({ skipped: ["T7"], backoff: { suppressed: ["T7:checkpoint:10"] } });
    s = JSON.parse(JSON.stringify(s));
  }
  expect(s.calls).toBe(2);
  expect(s.failures?.causes["T7:checkpoint:10"]).toEqual({ count: 2, reason: "deadline" });
});
it("lets a genuinely new cause through without rearming a blocked checkpoint", () => {
  const s = freshReplanState("RUN"); s.act = 1;
  for (const floor of [11, 12]) { detectReplan(s, input(floor), config); reserveReplan(s, 1, input(floor).turnKey); finishReplan(s, 1, new Error("timeout")); }
  const changed = { ...input(13), evaluation: { ...input(13).evaluation, acquiredComponentIds: ["RELIC"] } };
  expect(detectReplan(s, changed, config)).toMatchObject({ ask: true, skipped: ["T7"] });
  reserveReplan(s, 1, changed.turnKey); finishReplan(s, 1, new Error("capacity 429"));
  expect(s.failures?.causes["T7:checkpoint:10"]?.count).toBe(2);
  expect(detectReplan(s, { ...input(14), plan: { ...plan, checkpoint: 14 } }, config).ask).toBe(true);
  expect(detectReplan(s, { ...input(15), act: 2 }, config).ask).toBe(true);
});
it("success clears failure backoff, while repeated polling consumes no extra request", () => {
  const s = freshReplanState("RUN"); s.act = 1;
  detectReplan(s, input(11), config); reserveReplan(s, 1, input(11).turnKey); finishReplan(s, 1, new Error("invalid JSON"));
  expect(detectReplan(s, input(11), config).ask).toBe(false);
  detectReplan(s, input(12), config); reserveReplan(s, 1, input(12).turnKey); finishReplan(s, 1);
  expect(s.failures?.causes).toEqual({});
  expect(detectReplan(s, input(13), config).ask).toBe(true);
});
