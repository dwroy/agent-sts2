/** silent-0332: preserve unusable samples and expose the evidence needed to diagnose them. */
import { afterEach, describe, expect, it, vi } from "vitest";
import * as rollout from "../src/reflex/rollout.js";
import { continuationInput, fightSample, type FightSampleResult } from "../src/sim/boss-sim.js";
import { board } from "./boss-sim-fixture.js";

afterEach(() => vi.restoreAllMocks());

describe("first-fight resource contract diagnostics", () => {
  it.each([
    ["no-resources", undefined],
    ["nonpositive-hp", { hp: 0, revives: [], drunkKeys: ["POTION:BLOCK_POTION:0"] }],
  ] as const)("distinguishes %s while refusing to invent continuation resources", (reason, resources) => {
    const input = board();
    const second = board();
    input.continuation = { variants: [{ boss: "TEST_SECOND", count: 1, input: second }], potions: [], source: "fixed contract fixture", limitation: "synthetic resources only" };
    const first = { ...fightSample({ ...input, continuation: undefined }, input.plans[0]!, 17), won: true, died: false, resources } as FightSampleResult;
    const before = JSON.stringify(input);
    let error: Error | undefined;
    try { continuationInput(input, first, second, { seed: 17, plan: input.plans[0]! }); }
    catch (caught) { error = caught as Error; }
    expect(error).toBeInstanceOf(Error);
    expect(error!.message.slice(0, 160)).toContain(`${reason}; seed=17`);
    const details = JSON.parse(error!.message.split("; ").slice(2).join("; "));
    expect(details).toMatchObject({ won: true, died: false, continuation: true, captureResources: false, resources: resources ?? null });
    expect(details.steps).toEqual(input.plans[0]!.steps.map((step) => ({ cardId: step.cardId, cardIndex: step.cardIndex, target: step.target ?? null })));
    expect(JSON.stringify(input)).toBe(before);
  });

  it("carries the failing sample seed through the whole-fight entry point", () => {
    const input = board();
    const plan = input.plans[0]!;
    const simulated = rollout.simulateFight(input, plan, 5, 19);
    const last = simulated.records.at(-1)!;
    vi.spyOn(rollout, "simulateFight").mockReturnValue({ ...simulated,
      records: [{ ...last, won: true, died: false, resources: undefined }],
    });
    input.continuation = { variants: [{ boss: "TEST_SECOND", count: 1, input: board() }],
      potions: [], source: "fixed contract fixture", limitation: "synthetic missing capture only" };
    expect(() => fightSample(input, plan, 19, 5)).toThrow("no-resources; seed=19");
  });
});
