import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/hand/mod/schema.js";
import { makeRoutePlan } from "../src/hand/screens/route-plan.js";
import { routePlanOf } from "../src/memory/journal-replay.js";
import type { DecisionEnv } from "../src/memory/types.js";
import { buildRouteMap } from "../src/sim/route-map.js";
import type { RoomCostModel } from "../src/sim/route-projection.js";

interface Fixture {
  runId: string;
  floor: number;
  screen: string;
  stateVersion: number;
  observedTs: string;
  decisionId: string;
  currentNode: string;
  start: { hp: number; max: number };
  costs: RoomCostModel;
  loggedPath: { row: number; col: number; type: string; hpOnArrival: number | null }[];
}

// Own-character decisions 286314/286488 and brain payloads 8622/8635, with source byte hashes in the fixture.
const fixtures: Fixture[] = JSON.parse(readFileSync(new URL("./silent-route-projection-evidence.json", import.meta.url), "utf8"));

function input(fixture: Fixture, character = "SILENT", ascension = 10) {
  const state = parseGameState({
    state_version: fixture.stateVersion, run_id: fixture.runId, screen: fixture.screen,
    session: { mode: "singleplayer", phase: "run" }, available_actions: [],
    run: { floor: fixture.floor, current_hp: fixture.start.hp, max_hp: fixture.start.max, character_id: character, ascension },
  });
  const current = /^r(\d+)c(\d+)$/.exec(fixture.currentNode)!;
  const point = { row: Number(current[1]), col: Number(current[2]) };
  const path = fixture.loggedPath;
  const map = buildRouteMap({
    act: fixture.costs.act, current: point, next: [path[0]!], boots: 0,
    nodes: [
      { ...point, type: "Ancient", children: [path[0]!] },
      ...path.map((step, at) => ({ ...step, children: path[at + 1] ? [path[at + 1]!] : [] })),
    ],
  });
  return { env: { state } as DecisionEnv, map, ids: path.map((step) => `r${step.row}c${step.col}`), costs: structuredClone(fixture.costs) };
}

describe("Silent A10 route projection provenance (silent-0019/0020/0021)", () => {
  for (const fixture of fixtures) {
    it(`${fixture.runId} retains its absolute projection through logging and replay`, () => {
      const { env, map, ids, costs } = input(fixture);
      const plan = makeRoutePlan(env, map, ids, fixture.start, costs);
      expect(plan.path).toEqual(fixture.loggedPath);
      expect(plan.projection).toMatchObject({ version: 1, currentNode: "r0c3", start: { hp: fixture.start.hp, maxHp: fixture.start.max }, costs,
        assumptions: { rests: "heal", bossLoss: "unmodelled" } });
      const row = JSON.parse(JSON.stringify({ decision_id: fixture.decisionId, observed_ts: fixture.observedTs, route_plan: plan }));
      const replayed = routePlanOf(row, env.state, undefined)!;
      expect(replayed.projection).toEqual(plan.projection);
      expect(replayed.projection!.arrival.map((step) => ({ ...step, hp: undefined, maxHp: undefined })))
        .toEqual(fixture.loggedPath.map(({ hpOnArrival: _, ...step }) => ({ ...step, hp: undefined, maxHp: undefined })));
      const elite = replayed.projection!.arrival.find((step) => step.row === (fixture.costs.act === 3 ? 12 : 13))!;
      expect(elite.hp).toBe(fixture.start.max);
      expect(elite.maxHp).toBe(fixture.start.max);
      if (fixture.costs.act === 3) expect(replayed.projection!.arrival.at(-1)).toMatchObject({ hp: null, maxHp: 75 });
    });
  }

  it("keeps the planning snapshot when later HP or a caller's room costs change", () => {
    const fixture = fixtures[0]!;
    const { env, map, ids, costs } = input(fixture);
    const start = { ...fixture.start };
    const plan = makeRoutePlan(env, map, ids, start, costs);
    const saved = JSON.stringify(plan);
    env.state.run!.max_hp = 91;
    start.max = 91;
    costs.monster.median = 999;
    expect(JSON.stringify(plan)).toBe(saved);
    expect(plan.projection!.arrival.find((step) => step.row === 12)).toMatchObject({ hp: 75, maxHp: 75 });
  });

  it("copies nested rest assumptions rather than retaining a mutable input", () => {
    const fixture = fixtures[0]!;
    const { env, map, ids, costs } = input(fixture);
    // Synthetic audit input: checks ownership of nested data, not a historical relic effect.
    costs.rest = { bonus: 0, maxGain: 0, sources: ["fixed audit input"] };
    const plan = makeRoutePlan(env, map, ids, fixture.start, costs);
    costs.rest.sources.push("later update");
    expect(plan.projection!.costs.rest!.sources).toEqual(["fixed audit input"]);
  });

  it("preserves the previous plan shape for other characters and unobserved ascensions", () => {
    const fixture = fixtures[0]!;
    const original = input(fixture);
    const { projection: _, ...baseline } = makeRoutePlan(original.env, original.map, original.ids, fixture.start, original.costs);
    for (const [character, ascension] of [["IRONCLAD", 10], ["SILENT", 9], ["SILENT", 11], ["", 10]] as const) {
      const { env, map, ids, costs } = input(fixture, character, ascension);
      expect(makeRoutePlan(env, map, ids, fixture.start, costs)).toEqual(baseline);
    }
  });
});
