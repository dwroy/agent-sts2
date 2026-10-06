import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseGameState } from "../src/hand/mod/schema.js";
import { makeRoutePlan } from "../src/hand/screens/route-plan.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { RunJournal } from "../src/memory/run-journal.js";
import type { DecisionEnv } from "../src/memory/types.js";
import { buildRouteMap, routeCandidate, routeFacts } from "../src/sim/route-map.js";
import { hpAfterRoom, projectPath, type RoomCostModel } from "../src/sim/route-projection.js";

vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...(await original<typeof import("../src/knowledge/experience.js")>()),
  knowledgeSlice: () => ({ text: "" }),
}));

// Frozen from JMH5C51RLN4E SILENT A10 F44 rest/plan, silent-0163.
// F48 attempt 5 T13 won at 8/60 and F49 T1 entered at 8/60; 52 is not a general boss cost.
const costs: RoomCostModel = {
  act: 3,
  maxHp: 60,
  monster: { median: 12, p75: 13, source: "fixed F44" },
  elite: { median: 42, p75: 42, source: "fixed F44" },
  unknown: { median: 0, p75: 0, source: "fixed F44" },
  rest: { enterHeal: 18, bonus: 0, maxGain: 0, sources: ["fixed F44 feather"] },
};
const types = ["Monster", "Unknown", "RestSite", "Boss", "Boss"];
const ids = ["r11c3", "r12c2", "r13c2", "r14c3", "r15c3"];
const map = buildRouteMap({
  act: 3,
  current: { row: 10, col: 3 },
  next: [{ row: 11, col: 3 }],
  boots: 1,
  nodes: [
    { row: 10, col: 3, type: "RestSite", children: [{ row: 11, col: 3 }] },
    ...types.map((type, at) => ({ row: 11 + at, col: at === 1 || at === 2 ? 2 : 3, type, children: at < 4 ? [{ row: 12 + at, col: at === 0 || at === 1 ? 2 : 3 }] : [] })),
  ],
});
const start = { hp: 56, max: 60 };

function stateAt(floor: number, hp: number) {
  return parseGameState({ state_version: 16, run_id: "JMH5C51RLN4E", screen: "REST", session: { mode: "singleplayer", phase: "run" }, available_actions: [], run: { floor, current_hp: hp, max_hp: 60, act_id: "2", character: "SILENT", ascension: 10 } });
}

describe("silent-0163: unmodelled boss loss", () => {
  beforeEach(() => setMonsterDbForTests({ monsters: {}, encounters: {} }));
  afterEach(() => setMonsterDbForTests(null));

  it("JMH5C51RLN4E F44 keeps F48 entry known and F49 median/p75 unknown", () => {
    const projection = projectPath(types, start.hp, costs);
    expect(projection.arrival).toEqual([56, 44, 44, 60, null]);
    expect(projection.riskAfter.slice(3)).toEqual([null, null]);
    expect(projection.end).toBeNull();
    expect(projection.runsOut).toBeNull();
    const facts = routeFacts(map, ids, start, costs);
    expect(facts.arrival).toEqual([
      "F45 r11c3 普通战：56/60（p75 56）",
      "F46 r12c2 问号：44/60（p75 43）",
      "F47 r13c2 休息：44/60（p75 43）",
      "F48 r14c3 Boss：60/60（p75 60）",
      "F49 r15c3 Boss：未知（前场 Boss 损血未建模）（p75 未知）",
    ]);
    const candidate = routeCandidate(map, ids, start, costs);
    expect(candidate.p75[4]).toBeNull();
    // Reference ranking remains bounded by entry to the first boss.
    expect(candidate.lowP75).toBe(43);
    expect(candidate.lowMedian).toBe(44);
  });

  it("25226ZFLNR1J F35 preserves 22/64 entry without inventing a second boss cost", () => {
    const fixed = { ...costs, maxHp: 64 };
    expect(projectPath(["Boss", "Boss"], 22, fixed).arrival).toEqual([22, null]);
    expect(hpAfterRoom("Boss", 22, fixed, "median")).toBeNull();
    expect(hpAfterRoom("Boss", 22, fixed, "p75")).toBeNull();
  });

  it("stores unknown arrival in the route plan instead of coercing it to zero", () => {
    const env = { state: stateAt(44, 56) } as DecisionEnv;
    const plan = makeRoutePlan(env, map, ids, start, costs);
    expect(plan.path.map((step) => step.hpOnArrival)).toEqual([56 / 60, 44 / 60, 44 / 60, 1, null]);
    expect(JSON.parse(JSON.stringify(plan)).path[4].hpOnArrival).toBeNull();
  });

  it("run memory retains unknown HP when the second boss becomes the next step", () => {
    const env = { state: stateAt(44, 56) } as DecisionEnv;
    const plan = makeRoutePlan(env, map, ids, start, costs);
    const journal = new RunJournal();
    const state = stateAt(48, 8);
    journal.observe(state, { screenMemory: { routePlan: plan } });
    journal.position = { row: 14, col: 3, fromFloor: 48, act: 3, type: "Boss" };
    const memory = journal.render(state, makeKnowledge({}, "cache"), { routePlan: plan }, { factsCovered: true });
    expect(memory.route).toContain("下一步 王（预计 HP 未知（前场 Boss 损血未建模））");
    expect(memory.route).not.toContain("预计 HP 0%");
    expect(memory.route).not.toContain("预计 HP 100%");
  });

  it("keeps unknown HP through later rests and boss-start healing", () => {
    expect(projectPath(["Boss", "RestSite", "Boss"], 22, { ...costs, bossStartHeal: 25 }).arrival).toEqual([47, null, null]);
  });

  it("a route starting after the first fight uses observed HP and preserves death certainty", () => {
    expect(projectPath(["Boss"], 8, costs).arrival).toEqual([8]);
    expect(projectPath(["Boss", "RestSite", "Boss"], 0, costs).arrival).toEqual([0, 0, 0]);
    const single = projectPath(types.slice(0, 4), start.hp, costs);
    expect(single.arrival).toEqual([56, 44, 44, 60]);
  });
});
