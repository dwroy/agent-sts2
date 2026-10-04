/**
 * The route baseline's fight chain to the data's rule (Dai 2026-10-03, experience route-no-chains): act 2 penalises the
 * 4th fight between rest sites (shops and "?" rooms do not end the stretch; elites count and pay too), act 3 has no
 * count penalty, act 1 is unchanged; the route facts say the act-2 stretch. Fixed data only: fixed room costs and an
 * empty monster DB for the route values (never the refreshed room-costs.json or monster DB).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { setRoomCostsForTests } from "../src/knowledge/room-costs.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv, type RememberedMap } from "../src/memory/types.js";
import { chainAfter, chainPenalised, fightChainAt, fightChainPenalty, FIGHT_CHAIN_PENALTY, makeRouteWeights, planMap, roomPosition } from "../src/hand/screens/map.js";
import { buildRouteMap, routeFacts } from "../src/sim/route-map.js";
import type { RoomCostModel } from "../src/sim/route-projection.js";
import { costs, input } from "./route-fixture.js";
import { mapPayload, testKnowledge } from "./scenarios.js";

type Raw = Record<string, unknown>;

/** Fixed act-2 room costs at A8. */
const ROOM_COSTS = { "8": { "2": { Monster: { n: 50, median: 12, p75: 20, mean: 13 }, Elite: { n: 20, median: 28, p75: 38, mean: 30 }, Unknown: { n: 40, median: 3, p75: 9, mean: 4 } } } };

beforeEach(() => {
  setRoomCostsForTests(ROOM_COSTS);
  setMonsterDbForTests({ bosses: {}, encounters: {}, monsters: {} } as never);
});
afterEach(() => {
  setRoomCostsForTests(null);
  setMonsterDbForTests(null);
});

describe("the fight chain by act (experience route-no-chains)", () => {
  it("the penalty starts at the 3rd fight in act 1 (unchanged), the 4th in act 2, never in act 3; more below 60% HP", () => {
    expect(fightChainPenalty(1, 0.9, 1)).toBe(0);
    expect(fightChainPenalty(2, 0.9, 1)).toBe(FIGHT_CHAIN_PENALTY);
    expect(fightChainPenalty(4, 0.3, 1)).toBe(2 * FIGHT_CHAIN_PENALTY);
    expect(fightChainPenalty(2, 0.45, 1)).toBeCloseTo(2.25);
    // Act 2: three fights between rest sites are free; the 4th and every one after it pay.
    expect(fightChainPenalty(2, 0.9, 2)).toBe(0);
    expect(fightChainPenalty(3, 0.9, 2)).toBe(FIGHT_CHAIN_PENALTY);
    expect(fightChainPenalty(5, 0.3, 2)).toBe(2 * FIGHT_CHAIN_PENALTY);
    // Act 3: the count alone does not raise deaths there.
    expect(fightChainPenalty(6, 0.3, 3)).toBe(0);
  });

  it("act 1: a rest site or shop ends the chain, a ? or treasure room carries it; acts 2-3: only a rest site (or the act start) ends it", () => {
    expect(chainAfter("Monster", 1, 1)).toBe(2);
    expect(chainAfter("Elite", 1, 1)).toBe(2);
    expect(chainAfter("Shop", 2, 1)).toBe(0);
    expect(chainAfter("RestSite", 2, 1)).toBe(0);
    expect(chainAfter("Unknown", 2, 1)).toBe(2);
    expect(chainAfter("Treasure", 2, 1)).toBe(2);
    for (const act of [2, 3]) {
      expect(chainAfter("Monster", 2, act)).toBe(3);
      expect(chainAfter("Shop", 2, act)).toBe(2);
      expect(chainAfter("Unknown", 2, act)).toBe(2);
      expect(chainAfter("Treasure", 2, act)).toBe(2);
      expect(chainAfter("RestSite", 2, act)).toBe(0);
      expect(chainAfter("Ancient", 2, act)).toBe(0);
    }
  });

  it("the penalty is charged on hallway fights in act 1 and on elites too from act 2 (fixed room costs)", () => {
    const fixed: RoomCostModel = { ...costs, act: 2 };
    expect(chainPenalised("Monster", 1)).toBe(true);
    expect(chainPenalised("Elite", 1)).toBe(false);
    expect(chainPenalised("Elite", 2)).toBe(true);
    const act2 = makeRouteWeights(2, fixed);
    const at = (fights: number) => ({ hp: 0.9, gold: 100, fights });
    expect(act2("Monster", at(2), 8) - act2("Monster", at(3), 8)).toBeCloseTo(FIGHT_CHAIN_PENALTY);
    expect(act2("Monster", at(1), 8)).toBe(act2("Monster", at(2), 8));
    expect(act2("Elite", at(2), 8) - act2("Elite", at(3), 8)).toBeCloseTo(FIGHT_CHAIN_PENALTY);
    const act3 = makeRouteWeights(3, { ...costs, act: 3 });
    expect(act3("Monster", at(6), 8)).toBe(act3("Monster", at(0), 8));
    const act1 = makeRouteWeights(1, costs);
    expect(act1("Monster", at(1), 8) - act1("Monster", at(2), 8)).toBeCloseTo(FIGHT_CHAIN_PENALTY);
    expect(act1("Elite", at(2), 8)).toBe(act1("Elite", at(0), 8));
  });

  /** An act-2 map: Ancient, Monster, `middle`, Monster, Monster (current, all walked), then a Monster or a "?" to a rest site. */
  function walkedMap(middle: string, floor = 22): Raw {
    const raw = mapPayload();
    const run = raw["run"] as Raw;
    run["floor"] = floor;
    run["ascension"] = 8;
    run["current_hp"] = 72;
    run["max_hp"] = 80;
    const node = (row: number, col: number, type: string, children: [number, number][], parents: [number, number][], visited = false) => ({
      row,
      col,
      node_type: type,
      visited,
      children: children.map(([r, c]) => ({ row: r, col: c })),
      parents: parents.map(([r, c]) => ({ row: r, col: c })),
    });
    const map = raw["map"] as Raw;
    map["current_node"] = { row: 4, col: 2 };
    map["boss_node"] = { row: 7, col: 2 };
    map["available_nodes"] = [
      { index: 0, row: 5, col: 1, node_type: "Monster" },
      { index: 1, row: 5, col: 3, node_type: "Unknown" },
    ];
    map["nodes"] = [
      node(0, 2, "Ancient", [[1, 2]], [], true),
      node(1, 2, "Monster", [[2, 2]], [[0, 2]], true),
      node(2, 2, middle, [[3, 2]], [[1, 2]], true),
      node(3, 2, "Monster", [[4, 2]], [[2, 2]], true),
      node(4, 2, "Monster", [[5, 1], [5, 3]], [[3, 2]], true),
      node(5, 1, "Monster", [[6, 2]], [[4, 2]]),
      node(5, 3, "Unknown", [[6, 2]], [[4, 2]]),
      node(6, 2, "RestSite", [[7, 2]], [[5, 1], [5, 3]]),
      node(7, 2, "Boss", [], [[6, 2]]),
    ];
    return raw;
  }

  it("walking back in act 2: the Monster and Elite rooms since the last rest site or the act start; a shop or ? does not end it", () => {
    expect(fightChainAt(walkedMap("Shop")["map"] as Raw, 2)).toBe(3);
    expect(fightChainAt(walkedMap("Unknown")["map"] as Raw, 2)).toBe(3);
    expect(fightChainAt(walkedMap("RestSite")["map"] as Raw, 2)).toBe(2);
    // Act 1 walks back as before: a shop or ? stops it.
    expect(fightChainAt(walkedMap("Shop")["map"] as Raw, 1)).toBe(2);
    expect(fightChainAt(walkedMap("Unknown")["map"] as Raw, 1)).toBe(2);
    // A Winged Boots jump (no line from the walked node before it) does not cut the count in act 2.
    const jumped = walkedMap("Shop")["map"] as Raw;
    (jumped["nodes"] as Raw[])[3]!["parents"] = [];
    expect(fightChainAt(jumped, 2)).toBe(3);
  });

  it("route values: the 4th fight after a shop pays the penalty in act 2; after a rest site it is the 3rd and free", () => {
    const value = (raw: Raw, key: string): number => {
      const decision = planMap(envOf(raw));
      if (!decision || decision.kind !== "ask") throw new Error("expected an ask");
      const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
      return JSON.parse(String(criteria[key]))["route_value"];
    };
    // Same HP, same rooms ahead; only the walked middle room differs.
    const afterShop = value(walkedMap("Shop"), "n0");
    const afterRest = value(walkedMap("RestSite"), "n0");
    expect(afterRest - afterShop).toBeCloseTo(FIGHT_CHAIN_PENALTY, 1);
    // The ? room next to it is not a fight: no penalty on it either way.
    expect(value(walkedMap("RestSite"), "n1")).toBeCloseTo(value(walkedMap("Shop"), "n1"), 5);
  });

  it("the room we are in (card reward, rest site, event): act 2 carries the chain through shops and ? rooms", () => {
    const remembered = (type: string, floor: number): RememberedMap => ({ runId: "R", floor: floor - 1, nodes: [], available: [{ row: 3, col: 0, type }], chosen: { row: 3, col: 0, type }, fights: 3 });
    expect(roomPosition(remembered("Shop", 22), "R", 22, ["Shop"])?.fights).toBe(3);
    expect(roomPosition(remembered("Unknown", 22), "R", 22, ["Unknown"])?.fights).toBe(3);
    expect(roomPosition(remembered("Monster", 22), "R", 22, ["Monster"])?.fights).toBe(4);
    expect(roomPosition(remembered("RestSite", 22), "R", 22, ["RestSite"])?.fights).toBe(0);
    // Act 1 as before.
    expect(roomPosition(remembered("Unknown", 9), "R", 9, ["Unknown"])?.fights).toBe(0);
    expect(roomPosition(remembered("Treasure", 9), "R", 9, ["Treasure"])?.fights).toBe(3);
  });

  it("the route facts say the act-2 stretch: fights so far and the stretch's total to the next rest site", () => {
    const act2 = buildRouteMap(input({ act: 2 }));
    const facts = routeFacts(act2, ["r1c2", "r2c2", "r3c2", "r4c1"], { hp: 60, max: 80 }, { ...costs, act: 2 }, 2);
    expect(facts.fights_before_rest).toBe(
      "路线上没有休息点：到 boss 前战斗 3 场（普通战 2、精英 1），问号 0 个，商店 0 个；本幕从上一个休息点（没有就从幕初）到当前节点已打普通战和精英 2 场（商店、问号不打断，问号不计），这一段到 boss 前共 5 场",
    );
    const toRest = routeFacts(act2, ["r1c2", "r2c1", "r3c1", "r4c1"], { hp: 60, max: 80 }, { ...costs, act: 2 }, 1);
    expect(toRest.fights_before_rest).toBe(
      "到下一个休息点 F21 r3c1 前：战斗 1 场（普通战 0、精英 1），问号 0 个，商店 1 个；本幕从上一个休息点（没有就从幕初）到当前节点已打普通战和精英 1 场（商店、问号不打断，问号不计），这一段到休息点 F21 r3c1 前共 2 场",
    );
    // Act 1 keeps the old wording.
    expect(routeFacts(buildRouteMap(input()), ["r1c2", "r2c2", "r3c2", "r4c1"], { hp: 60, max: 80 }, costs, 1).fights_before_rest).toMatch(/；到当前节点为止已连续战斗 1 场$/);
  });
});

function envOf(raw: Raw, over: Partial<DecisionEnv> = {}): DecisionEnv {
  const state = parseGameState(raw);
  return {
    state,
    knowledge: testKnowledge,
    brief: buildRunBrief(state, testKnowledge),
    thresholds: { act: 0.5, strong: 0.8 },
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "card",
    screenMemory: createScreenMemory(state.screen),
    shopDiscardPotions: [],
    ...over,
  };
}
