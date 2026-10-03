/**
 * The act's route rides on the card-reward and rest-site questions (M2): the act's whole map, where we stand, the
 * plan from here and the plan's facts projected from HP now (HP on arrival, rest sites healed or smithed, fights
 * before the next rest, the next elite and the boss; at a rest site what each option leaves). The answer's `route`
 * keeps the plan (the default) or gives a new node sequence, which becomes the act's plan and is followed from the
 * next map. A missing, unreadable or illegal route keeps the plan and is logged; the card or rest choice is never
 * blocked by the route. No code values or ranks; next_rest (Dai 2026-10-03) lists, for the plan and the stretches from
 * each next node, the fights, "?" rooms, shop and HP on arriving at the next rest site (facts; tests/route-next-rest.test.ts),
 * and a change logs the same comparison for the route it took.
 *
 * Boards: XLJQ6FPQAU7N F4 map -> F5 card reward -> F5 map (the F7 Terror Eel elite ahead at 54/91 against a
 * 69/91 projection) and W2TBR2YUMQ5Y F6 map -> F7 rest site -> F7 map (smithed at 67/77 where the plan
 * projected a heal), A9, with the route plan and run plan those runs had. Room costs are fixed (not the refreshed
 * room-costs.json).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { setRoomCostsForTests } from "../src/knowledge/room-costs.js";
import { recoverRoute, routeKeys } from "../src/llm/deepseek.js";
import { parseGameState } from "../src/mod/schema.js";
import { createScreenMemory, type ScreenMemory } from "../src/project/types.js";
import type { RoutePlan } from "../src/screens/map.js";
import { rememberChosenNode, rememberMap, restHealHere } from "../src/screens/rest.js";
import { checkRoute, routeMapFromView, stretchOf } from "../src/strategy/route-map.js";
import { baseRestHeal, projectPath, restHealOf, type RoomCostModel } from "../src/strategy/route-projection.js";
import type { RunPlan } from "../src/strategy/run-plan.js";
import type { JsonValue } from "../src/util/json.js";
import { act, ask, board, choose, decide, DIR, env, FakeDeepSeek, keyOf, play, scriptedDeepSeek, setupOneshotTests, type Raw } from "./oneshot-support.js";
import { legalRoutes } from "./route-fixture.js";
import { mainMenuPayload } from "./scenarios.js";

setupOneshotTests();

/** A9 room costs, fixed: act 1 hallway 2/7, elite 26/36, "?" 0/6; act 2 hallway 9/16, elite 30/42, "?" 1/8. */
beforeAll(() =>
  setRoomCostsForTests({
    "9": {
      "1": { Monster: { n: 262, median: 2, p75: 7, mean: 4 }, Elite: { n: 50, median: 26, p75: 36, mean: 27 }, Unknown: { n: 189, median: 0, p75: 6, mean: 2 } },
      "2": { Monster: { n: 120, median: 9, p75: 16, mean: 11 }, Elite: { n: 30, median: 30, p75: 42, mean: 31 }, Unknown: { n: 90, median: 1, p75: 8, mean: 3 } },
    },
  }),
);
afterAll(() => setRoomCostsForTests(null));

const REWARD = "xljq-f5-reward";
const REST = "w2tb-f7-rest";

interface Fixture {
  states: Record<string, Raw>;
  memory: { chosen_index: number; routePlan: RoutePlan; runPlan: RunPlan };
}

const fixture = (file: string): Fixture => JSON.parse(readFileSync(join(DIR, `${file}.json`), "utf8")) as Fixture;

/** The memory after the MAP screen before the room: its map, the node chosen from it, the act's route plan and the run plan. */
function memoryAt(file: string, over: { map?: Raw; chosen?: boolean } = {}): ScreenMemory {
  const fx = fixture(file);
  const memory = createScreenMemory("MAP");
  const map = parseGameState(over.map ?? fx.states["map_before"]!);
  rememberMap(memory, map);
  if (over.chosen !== false) rememberChosenNode(memory, map, { action: "choose_map_node", option_index: fx.memory.chosen_index });
  memory.routePlan = fx.memory.routePlan;
  memory.runPlan = fx.memory.runPlan;
  return memory;
}

type Facts = { arrival: string[]; rest_sites: string[]; fights_before_rest: string; next_elite: string; boss: string; if_option?: string[]; about: string };
type NextRest = { about: string; keep: string; switch: string[] };
type Block = { map: string[]; position: string; next_nodes: string[]; winged_boots_left: number; boss: string; plan: string; plan_facts: Facts; next_rest: NextRest; room_costs: string; vs_plan: string; run_plan_hp?: string };
const blockOf = (decision: ReturnType<typeof decide>): Block | undefined => (ask(decision).state["route_review"] as Block | undefined);
const instructionsOf = (decision: ReturnType<typeof decide>): string => String(ask(decision).questions["pick"]?.instructions);

/** The fixed A9 act-1 room costs the blocks here show (beforeAll), as the projection's model. */
const resolvedCosts = (block: Block): RoomCostModel => ({
  act: 1,
  maxHp: Number(/最大生命 (\d+)/.exec(block.room_costs)![1]),
  monster: { median: 2, p75: 7, source: "fixed" },
  elite: { median: 26, p75: 36, source: "fixed" },
  unknown: { median: 0, p75: 6, source: "fixed" },
});

/** The plan from here as ids (the block's plan text). */
const planIds = (block: Block): string[] => block.plan.split(" → ").map((step) => step.split(" ")[0]!);
/** A legal route from here that avoids the plan's next elite (the F7 Terror Eel at r6c6). */
const noEliteRoute = (block: Block): string => legalRoutes(block).find((ids) => !ids.includes("r6c6"))!.join(" ");

describe("card reward: the act's route rides on the same question", () => {
  it("the whole map, where we stand, the plan from here and its facts from HP now; HP against the plan; the run plan's HP lines", () => {
    const decision = decide(env(board(REWARD, "reward"), memoryAt(REWARD)));
    expect(decision.label).toBe("reward/card");
    const block = blockOf(decision)!;
    const raw = board(REWARD, "map_before")["map"] as { nodes: unknown[] };
    expect(block.map).toHaveLength(raw.nodes.length);
    expect(block.map).toContain("F5 r4c6 普通战（当前） → r5c5 r5c6");
    expect(block.map.at(-1)).toBe("F17 r16c3 Boss（本幕 boss）");
    expect(block.position).toBe("你在 r4c6（F5 普通战）；下一步可走：r5c5、r5c6");
    expect(block.next_nodes).toEqual(["r5c5", "r5c6"]);
    expect(block.plan).toBe("r5c6 问号 → r6c6 精英 → r7c6 普通战 → r8c5 休息 → r9c4 宝箱 → r10c5 休息 → r11c6 问号 → r12c5 休息 → r13c5 商店 → r14c6 普通战 → r15c5 休息 → r16c3 Boss");
    // Facts at HP now (54/91) with the fixed costs: "?" 0/6, the elite 26/36, a hallway 2/7; rests heal 27.
    expect(block.plan_facts.arrival.slice(0, 4)).toEqual(["F6 r5c6 问号：54/91（p75 54）", "F7 r6c6 精英：54/91（p75 48）", "F8 r7c6 普通战：28/91（p75 12）", "F9 r8c5 休息：26/91（p75 5）"]);
    expect(block.plan_facts.rest_sites[0]).toBe("F9 r8c5 休息：到达 26/91（p75 5）；回血 → 53/91（p75 32）；锻造（不回血）→ 26/91（p75 5）");
    expect(block.plan_facts.fights_before_rest).toBe("到下一个休息点 F9 r8c5 前：战斗 2 场（普通战 1、精英 1），问号 1 个，商店 0 个；到当前节点为止已连续战斗 1 场");
    expect(block.plan_facts.next_elite).toBe("F7 r6c6：到达 54/91（p75 48）");
    expect(block.plan_facts.boss).toMatch(/^F17 r16c3：到达 \d+\/91（p75 \d+）$/);
    expect(block.vs_plan).toBe("计划在 F1 定（当时 HP 82%），当时预计到达：下一节点 F6 问号 69/91，精英 F7 精英 69/91，boss F17 Boss 91/91；现在 HP 54/91");
    // The run plan's own HP sentences, not its other numbers ("~25% error").
    expect(block.run_plan_hp).toContain("Elites only with high HP and a fire after;");
    expect(block.run_plan_hp).not.toContain("25% error");
    expect(block.room_costs).toMatch(/^第 1 幕每个房间掉血（中位数\/p75，最大生命 91）：普通战 2\/7（logged A9 act-1 Monster rooms, n=262）/);
    // The plan's stretch to the F9 rest and the best one from each next node to its nearest two rest floors (r5c5: F9
    // and F11; r5c6: the plan's own F9 stretch, and its F11 one runs out, so not listed), from HP now.
    expect(block.next_rest.keep).toBe("r5c6 问号 → r6c6 精英 → r7c6 普通战 → F9 r8c5 休息：普通战 1、精英 1、问号 1，没有商店；到达 26/91（p75 5）");
    expect(block.next_rest.switch).toEqual([
      "r5c5 普通战 → r6c6 精英 → r7c6 普通战 → F9 r8c5 休息：普通战 2、精英 1、问号 0，没有商店；到达 24/91（p75 4）",
      "r5c5 普通战 → r6c4 问号 → r7c3 普通战 → r8c3 问号 → r9c4 宝箱 → F11 r10c5 休息：普通战 2、精英 0、问号 2，没有商店；到达 50/91（p75 28）",
    ]);
    expect(block.next_rest.about).toContain("从现在的 HP 54/91 起");
    expect(instructionsOf(decision)).toContain("next_rest 是保留（keep，你的计划）和换线（switch");
    // Facts only: no code values or ranks, and no named routes (routeKeys reads route_review.routes as v3's).
    for (const word of ["code_value", "code_rank", "routes", "p1", "hp_if_option"]) expect(JSON.stringify(block)).not.toContain(word);
    expect(instructionsOf(decision)).toContain('"route"："keep"（默认，照计划走）或新的节点序列');
    expect(instructionsOf(decision)).toContain('"route_reason"');
    // Without DeepSeek the card reward is the Jev/code decision it always was.
    expect(ask(decision).deepseek.baseline.label).toBe("reward/card");
  });

  it("keep: the card is taken, the plan stays, no plan steps", () => {
    const memory = memoryAt(REWARD);
    const before = memory.routePlan;
    const resolved = choose(decide(env(board(REWARD, "reward"), memory)), "card1", undefined, "keep", "the eel still fits");
    expect(resolved.intent).toEqual({ action: "choose_reward_card", option_index: 1 });
    expect(resolved.routeReview).toEqual({ answer: "keep", outcome: "keep", reason: "the eel still fits" });
    expect(resolved.plan).toBeUndefined();
    resolved.apply?.();
    expect(memory.routePlan).toBe(before);
    expect(memory.planSeq).toBeUndefined();
  });

  it("a change: the card is taken; the new route becomes the act's plan (step 2 of the card's plan), projected from HP now; the next map move follows it", () => {
    const memory = memoryAt(REWARD);
    const decision = decide(env(board(REWARD, "reward"), memory));
    const block = blockOf(decision)!;
    const route = noEliteRoute(block);
    const resolved = choose(decision, "card1", undefined, route, "skip the eel at 54/91");
    expect(resolved.intent).toEqual({ action: "choose_reward_card", option_index: 1 });
    expect(resolved.plan).toEqual({ id: "XLJQ6FPQAU7N:F5:reward#1", steps: ["card1", route] });
    expect(resolved.routeReview).toMatchObject({
      answer: route,
      outcome: "change",
      reason: "skip the eel at 54/91",
      change: { ref: "XLJQ6FPQAU7N:F5:reward#1", step: 2, key: route, from: block.plan, to: expect.stringMatching(/Boss$/), why: "card-reward review" },
    });
    // The new route against the kept one at their next rest sites, from HP now: logged with the change, never a block.
    const map = routeMapFromView(block)!;
    const keptEnd = stretchOf(map, planIds(block), { hp: 54, max: 91 }, resolvedCosts(block));
    const newEnd = stretchOf(map, route.split(" "), { hp: 54, max: 91 }, resolvedCosts(block));
    expect(newEnd.ids).not.toEqual(keptEnd.ids);
    expect(resolved.routeReview?.change?.nextRest).toEqual({ text: expect.stringMatching(/^新路线到 F\d+ 约 \d+\/91，保留路线到 F9 约 26\/91（p75 \S+ 对 5）/), worse: false });
    expect(resolved.rationale).toContain(`; next rest: ${resolved.routeReview!.change!.nextRest!.text}`);
    expect(resolved.rationale).not.toContain("clearly worse");
    resolved.apply?.();
    expect(memory.routePlan).toMatchObject({ runId: "XLJQ6FPQAU7N", act: 1, floor: 5, why: "card-reward review" });
    expect(memory.routePlan!.path.map((step) => `r${step.row}c${step.col}`).join(" ")).toBe(route);
    expect(memory.routePlan?.hpPct).toBeCloseTo(54 / 91, 5);
    expect(memory.routePlan?.path[0]?.hpOnArrival).toBeCloseTo(54 / 91, 5);
    expect(memory.planSeq).toEqual({ runId: "XLJQ6FPQAU7N", n: 1 });
    const [, row, col] = /^r(\d+)c(\d+)/.exec(route)!;
    const mapAfter = board(REWARD, "map_after");
    const index = (((mapAfter["map"] as Raw)["available_nodes"] as Raw[]).find((node) => node["row"] === Number(row) && node["col"] === Number(col))!)["index"];
    expect(act(decide(env(mapAfter, memory)))).toMatchObject({ label: "map/route-follow", intent: { action: "choose_map_node", option_index: index } });
  });

  it("no route, one naming no nodes, or an illegal one: the card is still taken and the plan kept; the answer and the check's errors are logged", () => {
    const memory = memoryAt(REWARD);
    const before = memory.routePlan;
    const decision = decide(env(board(REWARD, "reward"), memory));
    const cases: [string | undefined, string][] = [
      [undefined, "the answer has no route"],
      ["p1", 'route "p1" names no node ids'],
      ["r5c6 r7c6 r8c5", "第 2 步 r5c6 → r7c6：不是下一层（r5c6 在第 5 行，下一步要在第 6 行）; 终点 r8c5（休息）不是 boss：路线要一直走到 boss（r16c3）"],
      ["r5c0 r6c0", "第 1 步 r5c0：不是下一步能走的节点（能走：r5c5、r5c6）; 终点 r6c0（休息）不是 boss：路线要一直走到 boss（r16c3）"],
      ["r5c4 r6c4", "第 1 步 r5c4：地图上没有这个节点"],
    ];
    for (const [route, invalid] of cases) {
      const resolved = choose(decision, "card2", undefined, route);
      expect(resolved.intent).toEqual({ action: "choose_reward_card", option_index: 2 });
      expect(resolved.routeReview).toEqual({ answer: route ?? null, outcome: "invalid", reason: "", invalid });
      expect(resolved.plan).toBeUndefined();
      resolved.apply?.();
      expect(memory.routePlan).toBe(before);
    }
    expect(choose(decision, "card2", undefined, " KEEP ").routeReview?.outcome).toBe("keep");
    // The plan's own route again is a keep.
    expect(choose(decision, "card2", undefined, planIds(blockOf(decision)!).join(" ")).routeReview?.outcome).toBe("keep");
  });

  it("a failure inside the review never blocks the card: the card is taken, the plan kept, the failure logged", () => {
    const memory = memoryAt(REWARD);
    const before = memory.routePlan;
    const e = env(board(REWARD, "reward"), memory);
    const decision = decide(e);
    const route = noEliteRoute(blockOf(decision)!);
    Object.defineProperty(e.state.raw, "run_id", { get: () => { throw new Error("boom"); } });
    const resolved = choose(decision, "card0", undefined, route);
    expect(resolved.intent).toEqual({ action: "choose_reward_card", option_index: 0 });
    expect(resolved.routeReview).toMatchObject({ outcome: "invalid", invalid: "route review failed: boom" });
    resolved.apply?.();
    expect(memory.routePlan).toBe(before);
    // A broken remembered map: the question goes out without the block.
    const broken = memoryAt(REWARD);
    broken.lastMap!.nodes = null as never;
    const plain = decide(env(board(REWARD, "reward"), broken));
    expect(plain.label).toBe("reward/card");
    expect(blockOf(plain)).toBeUndefined();
  });

  it("the position: the node chosen from the last map, else the only fight room it offered; unknown means no block", () => {
    // The F4 map offered one room: known without the recorded choice.
    expect(blockOf(decide(env(board(REWARD, "reward"), memoryAt(REWARD, { chosen: false }))))).toBeDefined();
    // Two fight rooms offered and no recorded choice: unknown.
    const two = board(REWARD, "map_before");
    ((two["map"] as Raw)["available_nodes"] as Raw[]).push({ index: 1, row: 4, col: 4, node_type: "Monster", state: "Travelable" });
    expect(blockOf(decide(env(board(REWARD, "reward"), memoryAt(REWARD, { map: two, chosen: false }))))).toBeUndefined();
    // The recorded choice settles it.
    expect(blockOf(decide(env(board(REWARD, "reward"), memoryAt(REWARD, { map: two }))))).toBeDefined();
    // A map of another floor (the MAP screen before this room was not seen).
    const stale = memoryAt(REWARD);
    stale.lastMap!.floor = 3;
    expect(blockOf(decide(env(board(REWARD, "reward"), stale)))).toBeUndefined();
    // A later frame of the same map screen keeps the recorded choice.
    const again = memoryAt(REWARD, { map: two });
    rememberMap(again, parseGameState(two));
    expect(again.lastMap?.chosen).toMatchObject({ row: 4, col: 6, type: "Monster" });
  });

  it("no block: no route plan for this act, a boss room, a plan that does not go on from here, no fork left", () => {
    const none = memoryAt(REWARD);
    none.routePlan = undefined;
    expect(blockOf(decide(env(board(REWARD, "reward"), none)))).toBeUndefined();
    const otherAct = memoryAt(REWARD);
    otherAct.routePlan = { ...otherAct.routePlan!, act: 2 };
    expect(blockOf(decide(env(board(REWARD, "reward"), otherAct)))).toBeUndefined();
    const boss = memoryAt(REWARD);
    boss.lastMap!.chosen = { ...boss.lastMap!.chosen!, type: "Boss" };
    expect(blockOf(decide(env(board(REWARD, "reward"), boss)))).toBeUndefined();
    // The plan's next node is not a child of this room: the next map re-plans it.
    const broken = memoryAt(REWARD);
    broken.routePlan = { ...broken.routePlan!, path: broken.routePlan!.path.map((step) => (step.row === 5 ? { ...step, col: 0 } : step)) };
    const plain = decide(env(board(REWARD, "reward"), broken));
    expect(blockOf(plain)).toBeUndefined();
    expect(instructionsOf(plain)).not.toMatch(/route_review/);
    // One way to the boss from here: every node on the plan leads only to the plan's next node.
    const single = board(REWARD, "map_before");
    const onPlan = new Set(fixture(REWARD).memory.routePlan.path.map((step) => `${step.row},${step.col}`));
    for (const node of (single["map"] as Raw)["nodes"] as Raw[]) {
      if (!onPlan.has(`${String(node["row"])},${String(node["col"])}`)) continue;
      node["children"] = (node["children"] as Raw[]).filter((child) => onPlan.has(`${String(child["row"])},${String(child["col"])}`));
    }
    expect(blockOf(decide(env(board(REWARD, "reward"), memoryAt(REWARD, { map: single }))))).toBeUndefined();
  });
});

describe("rest site: the route rides on the one-shot rest question, with each option's HP", () => {
  it("the plan's facts from HP now, what each rest option leaves at the next elite and the boss, the run plan's HP lines", () => {
    const decision = decide(env(board(REST, "rest"), memoryAt(REST)));
    expect(decision.label).toBe("rest/plan");
    const block = blockOf(decision)!;
    expect(block.vs_plan).toMatch(/^计划在 F\d+ 定（当时 HP \d+%），当时预计到达：下一节点 F8 普通战 77\/77，精英 F9 精英 74\/77，boss F17 Boss 77\/77；现在 HP 67\/77（本休息点的选项还没算进去）$/);
    expect(block.run_plan_hp).toContain("Elites only at ≥78% HP after a campfire.");
    expect(block.plan_facts.if_option).toHaveLength(2);
    expect(block.plan_facts.if_option![0]).toMatch(/^o0 HEAL（HP 77\/77）：下一只精英前 \d+\/77（p75 \d+），boss 前 \d+\/77（p75 \d+）$/);
    expect(block.plan_facts.if_option![1]).toMatch(/^o1 SMITH（HP 67\/77）：下一只精英前 /);
    expect(instructionsOf(decision)).toContain("plan_facts.if_option");
  });

  it("smith a card and keep: the rest plan as before (smith, then the card), the route unchanged", () => {
    const memory = memoryAt(REST);
    const before = memory.routePlan;
    const card = keyOf(board(REST, "rest"), "BASH");
    const resolved = choose(decide(env(board(REST, "rest"), memory)), `o1:${card}`, undefined, "keep");
    expect(resolved.intent).toEqual({ action: "choose_rest_option", option_index: 1 });
    expect(resolved.plan).toEqual({ id: "W2TBR2YUMQ5Y:F7:rest#1", steps: ["o1", card] });
    expect(resolved.routeReview?.outcome).toBe("keep");
    resolved.apply?.();
    expect(memory.routePlan).toBe(before);
    expect(memory.pendingPick).toMatchObject({ step: 2 });
  });

  /** A legal route from the rest site other than the plan's. */
  const otherRoute = (block: Block): string => legalRoutes(block).map((ids) => ids.join(" ")).find((ids) => ids !== planIds(block).join(" "))!;

  it("heal and change: the new route is projected from the healed HP, a step after the heal", () => {
    const memory = memoryAt(REST);
    const decision = decide(env(board(REST, "rest"), memory));
    const route = otherRoute(blockOf(decision)!);
    const resolved = choose(decision, "o0", undefined, route, "heal, then the other branch");
    expect(resolved.intent).toEqual({ action: "choose_rest_option", option_index: 0 });
    expect(resolved.plan).toEqual({ id: "W2TBR2YUMQ5Y:F7:rest#1", steps: ["o0", route] });
    expect(resolved.routeReview?.change).toMatchObject({ step: 2, key: route, why: "rest-site review" });
    resolved.apply?.();
    expect(memory.routePlan).toMatchObject({ floor: 7, hpPct: 1, why: "rest-site review" });
    expect(memory.routePlan?.path[0]?.hpOnArrival).toBe(1);
    expect(memory.planSeq).toEqual({ runId: "W2TBR2YUMQ5Y", n: 1 });
    const [, row, col] = /^r(\d+)c(\d+)/.exec(route)!;
    const mapAfter = board(REST, "map_after");
    const index = (((mapAfter["map"] as Raw)["available_nodes"] as Raw[]).find((node) => node["row"] === Number(row) && node["col"] === Number(col))!)["index"];
    expect(act(decide(env(mapAfter, memory)))).toMatchObject({ label: "map/route-follow", intent: { option_index: index } });
  });

  it("smith and change: the route from HP now, the route step after the named card", () => {
    const memory = memoryAt(REST);
    const decision = decide(env(board(REST, "rest"), memory));
    const route = otherRoute(blockOf(decision)!);
    const card = keyOf(board(REST, "rest"), "BASH");
    const resolved = choose(decision, `o1:${card}`, undefined, route);
    expect(resolved.plan).toEqual({ id: "W2TBR2YUMQ5Y:F7:rest#1", steps: ["o1", card, route] });
    expect(resolved.routeReview?.change).toMatchObject({ step: 3 });
    resolved.apply?.();
    expect(memory.routePlan?.hpPct).toBeCloseTo(67 / 77, 5);
    expect(memory.pendingPick).toMatchObject({ step: 2 });
  });

  it("the step-by-step rest question (after an unusable one-shot answer) carries the same route block; a change is a step after the rest action", () => {
    const memory = memoryAt(REST);
    const oneshot = decide(env(board(REST, "rest"), memory));
    ask(oneshot).deepseek.oneshot?.fallback();
    const next = decide(env(board(REST, "rest"), memory));
    expect(next.label).toBe("rest/choose");
    const block = blockOf(next)!;
    expect(block).toEqual(blockOf(oneshot));
    expect(instructionsOf(next)).toContain('"route"："keep"（默认，照计划走）');
    expect(instructionsOf(next)).toContain("plan_facts.if_option");
    expect(choose(next, "o1", undefined, "keep").routeReview).toEqual({ answer: "keep", outcome: "keep", reason: "" });
    const route = otherRoute(block);
    const resolved = choose(next, "o0", undefined, route, "heal, then the other branch");
    expect(resolved.intent).toEqual({ action: "choose_rest_option", option_index: 0 });
    expect(resolved.plan).toEqual({ id: "W2TBR2YUMQ5Y:F7:rest#1", steps: ["o0", route] });
    expect(resolved.routeReview?.change).toMatchObject({ step: 2, key: route, why: "rest-site review" });
    resolved.apply?.();
    // Projected from the healed HP.
    expect(memory.routePlan).toMatchObject({ floor: 7, hpPct: 1, why: "rest-site review" });
    expect(memory.planSeq).toEqual({ runId: "W2TBR2YUMQ5Y", n: 1 });
  });
});

describe("Winged Boots: its charges reach any node of the next row (batch E, 9GRPS5DC8KHN F28)", () => {
  it("at the F28 rest site (10,6) with 2 charges: the rest site at (11,2) is a next node (a jump); a route through it is legal, one on without boots is not", () => {
    const decision = decide(env(board("9grp-f28-rest", "rest"), memoryAt("9grp-f28-rest")));
    const block = blockOf(decision)!;
    expect(block.winged_boots_left).toBe(2);
    expect(block.next_nodes).toContain("r11c2");
    expect(block.position).toContain("r11c2（飞行靴跳跃）");
    expect(block.position).not.toContain("r11c5（飞行靴跳跃）");
    const map = routeMapFromView(block)!;
    const detour = legalRoutes({ ...block, next_nodes: ["r11c2"] })[0]!;
    expect(detour[0]).toBe("r11c2");
    expect(checkRoute(map, detour)).toEqual([]);
    // Without charges the game offers only this node's lines, and a jump is not legal.
    const lines = map.nodes.get(map.current!)!.children;
    expect(checkRoute({ ...map, boots: 0, next: lines }, detour)[0]).toMatch(/^第 1 步 r11c2：不是下一步能走的节点/);
    expect(checkRoute({ ...map, boots: 0 }, detour)).toEqual(["飞行靴只剩 0 次，这条路线不沿连线跳了 1 次（第 1 步）"]);
  });

  it("without charges left only the node's own lines are next nodes", () => {
    const rest = board("9grp-f28-rest", "rest");
    const relics = ((rest["run"] as Raw)["relics"] as Raw[]).map((relic) => (relic["relic_id"] === "WINGED_BOOTS" ? { ...relic, stack: 0 } : relic));
    (rest["run"] as Raw)["relics"] = relics;
    const block = blockOf(decide(env(rest, memoryAt("9grp-f28-rest"))));
    if (!block) return;
    expect(block.winged_boots_left).toBe(0);
    expect(block.next_nodes).not.toContain("r11c2");
    expect(block.position).not.toContain("飞行靴跳跃");
  });
});

/** The route-plan answer for the MAP screen before the room: the first legal route through the fixture's chosen node. */
function routePlanAnswer(file: string): (label: string) => Record<string, unknown> {
  return (label) => {
    if (label !== "map/route-plan") return { plan: [], reason: "nothing" };
    const fx = fixture(file);
    const map = parseGameState(fx.states["map_before"]!);
    const available = (map.raw["map"] as Raw)["available_nodes"] as Raw[];
    const chosen = available.find((node) => node["index"] === fx.memory.chosen_index)!;
    const decision = decide(env(fx.states["map_before"]!, createScreenMemory("MAP")));
    const route = legalRoutes(ask(decision).state["route_map"]).find((ids) => ids[0] === `r${String(chosen["row"])}c${String(chosen["col"])}`)!;
    return { route: route.join(" "), reason: "fixture route" };
  };
}

describe("rest site route review in the loop", () => {
  it("one call for the rest action, its card and the route; the change is its own row, the plan's last step; the next map follows it", async () => {
    const bash = keyOf(board(REST, "rest"), "BASH");
    let alternative = "";
    const deepseek = new FakeDeepSeek(
      (_criteria, label) => {
        if (label !== "rest/plan") return Object.keys(_criteria)[0]!;
        return { choice: `o1:${bash}`, route: alternative, routeReason: "the other branch" };
      },
      routePlanAnswer(REST),
    );
    // The alternative from the rest site: any legal route other than the one planned at the map.
    const planned = String(routePlanAnswer(REST)("map/route-plan")["route"]).split(" ").slice(1).join(" ");
    const restBlock = blockOf(decide(env(board(REST, "rest"), memoryAt(REST))))!;
    alternative = legalRoutes(restBlock).map((ids) => ids.join(" ")).find((ids) => ids !== planned)!;
    const { stats, actions, records } = await play([board(REST, "map_before"), board(REST, "rest"), board(REST, "map_after"), mainMenuPayload()], deepseek);
    expect(deepseek.calls.map((call) => call.label)).toEqual(["map/route-plan", "rest/plan"]);
    expect(stats.deepseekCalls).toBe(2);
    expect(deepseek.calls[1]!.state["route_review"]).toMatchObject({ plan: expect.stringMatching(/Boss$/), plan_facts: { if_option: expect.any(Array) } });
    const [, row, col] = /^r(\d+)c(\d+)/.exec(alternative)!;
    const next = (((board(REST, "map_after")["map"] as Raw)["available_nodes"] as Raw[]).find((node) => node["row"] === Number(row) && node["col"] === Number(col))!)["index"];
    expect(actions).toEqual([{ action: "choose_map_node", option_index: fixture(REST).memory.chosen_index }, { action: "choose_rest_option", option_index: 1 }, { action: "choose_map_node", option_index: next }]);
    const rest = records.find((row) => row["label"] === "rest/plan")!;
    expect(rest).toMatchObject({ decider: "deepseek", deepseek: { plan_id: "W2TBR2YUMQ5Y:F7:rest#1", plan: ["o1", bash, alternative], plan_step: 1, route: alternative, route_reason: "the other branch" }, route_review: { outcome: "change", plan_step: 3 } });
    const change = records.find((row) => row["label"] === "map/route-change")!;
    expect(change).toMatchObject({ ts: rest["ts"], deepseek: { reused: true, plan_ref: "W2TBR2YUMQ5Y:F7:rest#1", plan_step: 3, choice: alternative }, route_plan: { why: "rest-site review", floor: 7 } });
    expect(records.find((row) => row["label"] === "map/route-follow")).toMatchObject({ decider: "code" });
    // The route plan's own row carries the plan it made.
    expect(records.find((row) => row["label"] === "map/route-plan")).toMatchObject({ decider: "deepseek", route_plan: { floor: 6 } });
  });

  it("a change with another stretch to the next rest site: both rows log it against the kept route; next_rest rides in the question, not the system prefix", async () => {
    const route = String(routePlanAnswer(REST)("map/route-plan")["route"]);
    const planned = route.split(" ").slice(1);
    const restBlock = blockOf(decide(env(board(REST, "rest"), memoryAt(REST))))!;
    const map = routeMapFromView(restBlock)!;
    const stretch = (ids: string[]): string => stretchOf(map, ids, { hp: 77, max: 77 }, resolvedCosts(restBlock)).ids.join(" ");
    const alternative = legalRoutes(restBlock).find((ids) => stretch(ids) !== stretch(planned))!.join(" ");
    const { client, bodies } = await scriptedDeepSeek([
      { content: JSON.stringify({ route, reason: "route" }), reasoning: "Plan." },
      { content: JSON.stringify({ choice: "o0", route: alternative, route_reason: "the other branch", reason: "heal" }), reasoning: "Decisive: o0." },
    ]);
    const { records } = await play([board(REST, "map_before"), board(REST, "rest"), board(REST, "map_after"), mainMenuPayload()], client);
    const rest = records.find((row) => row["label"] === "rest/plan")!;
    const review = rest["route_review"] as Record<string, unknown>;
    // The first such route takes the second elite to the F16 rest: it runs out on the way, clearly worse (not blocked).
    expect(review).toMatchObject({ outcome: "change", next_rest: "新路线到 F16 约 0（血量耗尽），保留路线到 F12 约 47/77（p75 耗尽 对 27）；保留路线到 F16 时约 40/77（p75 耗尽）", next_rest_worse: true });
    expect(String(rest["rationale"])).toContain("(clearly worse than the kept route)");
    const change = records.find((row) => row["label"] === "map/route-change")!;
    expect(change["deepseek"]).toMatchObject({ next_rest: review["next_rest"], next_rest_worse: review["next_rest_worse"] });
    expect(String(change["rationale"])).toContain(`; next rest: ${String(review["next_rest"])}`);
    // The knowledge prefix (the system message) is unchanged: the facts are in the rest question's user message.
    const messages = bodies[1]!["messages"] as { role: string; content: string }[];
    expect(messages[0]!.role).toBe("system");
    expect(messages[0]!.content).not.toContain("next_rest");
    expect(messages[1]!.content).toContain('"next_rest"');
    expect(messages[1]!.content).toContain("从本休息点 o0 HEAL 后的 HP 77/77 起");
  });

  it("the real client reads the route-plan answer and the rest answer's route and route_reason", async () => {
    const route = String(routePlanAnswer(REST)("map/route-plan")["route"]);
    const { client } = await scriptedDeepSeek([
      { content: JSON.stringify({ route, reason: "route" }), reasoning: "Plan." },
      { content: '{"choice": "o0", "route": "keep", "route_reason": "the plan still fits", "reason": "heal before the elite"}', reasoning: "Decisive: o0." },
    ]);
    const { stats, records } = await play([board(REST, "map_before"), board(REST, "rest"), board(REST, "map_after"), mainMenuPayload()], client);
    expect(stats.deepseekCalls).toBe(2);
    expect(records.find((row) => row["label"] === "rest/plan")).toMatchObject({
      deepseek: { choice: "o0", route: "keep", route_reason: "the plan still fits" },
      route_review: { answer: "keep", outcome: "keep", reason: "the plan still fits" },
    });
    expect(records.some((row) => row["label"] === "map/route-change")).toBe(false);
  });

  it("an illegal route-plan answer is re-asked once with its errors; the corrected route is followed", async () => {
    const route = String(routePlanAnswer(REST)("map/route-plan")["route"]);
    const scripted = await scriptedDeepSeek([
      { content: JSON.stringify({ route: route.split(" ").slice(0, 3).join(" "), reason: "short" }), reasoning: "Plan." },
      { content: JSON.stringify({ route, reason: "to the boss" }), reasoning: "Plan." },
      { content: '{"choice": "o0", "route": "keep", "route_reason": "fine", "reason": "heal"}', reasoning: "Decisive: o0." },
    ]);
    const { stats, records } = await play([board(REST, "map_before"), board(REST, "rest"), board(REST, "map_after"), mainMenuPayload()], scripted.client);
    const reask = scripted.bodies[1]!["messages"] as { role: string; content: string }[];
    expect(reask.map((message) => message.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(reask[3]!.content).toMatch(/route: 终点 r\d+c\d+（[^）]+）不是 boss/);
    expect(stats.deepseekCalls).toBe(3);
    expect(records.find((row) => row["label"] === "map/route-plan")).toMatchObject({ decider: "deepseek", route_plan: { path: expect.any(Array) } });
    expect((records.find((row) => row["label"] === "map/route-plan")!["route_plan"] as { path: unknown[] }).path).toHaveLength(route.split(" ").length);
  });

  it("an unknown option key recovered from the reasoning keeps the answer's route and route_reason (batch E)", async () => {
    const route = String(routePlanAnswer(REST)("map/route-plan")["route"]);
    const restBlock = blockOf(decide(env(board(REST, "rest"), memoryAt(REST))))!;
    const alternative = legalRoutes(restBlock).map((ids) => ids.join(" ")).find((ids) => ids !== route.split(" ").slice(1).join(" "))!;
    const { client } = await scriptedDeepSeek([
      { content: JSON.stringify({ route, reason: "route" }), reasoning: "Plan." },
      // "heal" is no option key; the reasoning concludes on o0. The route rides in the same answer.
      { content: JSON.stringify({ choice: "heal", route: alternative, route_reason: "the other branch", reason: "heal before the elite" }), reasoning: "HP 67/77.\nDecisive: o0." },
    ]);
    const { records } = await play([board(REST, "map_before"), board(REST, "rest"), board(REST, "map_after"), mainMenuPayload()], client);
    const rest = records.find((row) => row["label"] === "rest/plan")!;
    expect(rest).toMatchObject({ decider: "deepseek", deepseek: { choice: "o0", recovered_from_reasoning: expect.any(String), route: alternative, route_reason: "the other branch" }, route_review: { answer: alternative, outcome: "change" } });
  });

  it("a consistency re-ask asks for the route again (the route block rides in the same conversation); a second answer without one keeps the first answer's route", async () => {
    const bash = keyOf(board(REST, "rest"), "BASH");
    const route = String(routePlanAnswer(REST)("map/route-plan")["route"]);
    const routePlan = { content: JSON.stringify({ route, reason: "route" }), reasoning: "Plan." };
    const restBlock = blockOf(decide(env(board(REST, "rest"), memoryAt(REST))))!;
    const alternative = legalRoutes(restBlock).map((ids) => ids.join(" ")).find((ids) => ids !== route.split(" ").slice(1).join(" "))!;
    // The first rest answer smiths while its reasoning concluded on the heal: re-asked.
    const suspect = { content: JSON.stringify({ choice: `o1:${bash}`, reason: "smith Bash", route: alternative, route_reason: "the other branch" }), reasoning: "HP 67/77.\nDecisive: o0." };
    const withRoute = await scriptedDeepSeek([routePlan, suspect, { content: '{"choice": "o0", "reason": "heal before the elite", "route": "keep", "route_reason": "the plan fits after a heal"}', reasoning: "Decisive: o0." }]);
    const first = await play([board(REST, "map_before"), board(REST, "rest"), board(REST, "map_after"), mainMenuPayload()], withRoute.client);
    const reask = withRoute.bodies[2]!["messages"] as { role: string; content: string }[];
    expect(reask.map((message) => message.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(reask[1]!.content).toContain("route_review");
    expect(reask[3]!.content).toContain('"route": "<keep | node ids from next_nodes to the boss>", "route_reason": "<max 15 words>"');
    expect(reask[3]!.content).toContain("state.route_review");
    expect(first.records.find((row) => row["label"] === "rest/plan")).toMatchObject({
      deepseek: { choice: "o0", route: "keep", route_reason: "the plan fits after a heal", consistency: { resolution: "reasked" } },
      route_review: { answer: "keep", outcome: "keep", reason: "the plan fits after a heal" },
    });
    // The re-asked answer leaves the route out: the first answer's route stands (not "the answer has no route").
    const noRoute = await scriptedDeepSeek([routePlan, suspect, { content: '{"choice": "o0", "reason": "heal before the elite"}', reasoning: "Decisive: o0." }]);
    const second = await play([board(REST, "map_before"), board(REST, "rest"), board(REST, "map_after"), mainMenuPayload()], noRoute.client);
    const rest = second.records.find((row) => row["label"] === "rest/plan")!;
    expect(rest).toMatchObject({ deepseek: { choice: "o0", route: alternative, route_reason: "the other branch" }, route_review: { answer: alternative, outcome: "change" } });
    expect(second.records.find((row) => row["label"] === "map/route-change")).toMatchObject({ route_plan: { why: "rest-site review", floor: 7 } });
  });
});

describe("rest heal: the game's HEAL text and the rest relics (Regal Pillow, Stone Humidifier), not a flat 30%", () => {
  /** The W2TB F7 rest site at 40/77 with a rest relic and the HEAL text the game writes with it. */
  const restWith = (relicId: string, name: string, line: string): Raw => {
    const raw = board(REST, "rest");
    const run = raw["run"] as Raw;
    run["current_hp"] = 40;
    (run["players"] as Raw[])[0]!["current_hp"] = 40;
    run["relics"] = [...(run["relics"] as Raw[]), { index: 2, relic_id: relicId, name, description: "", stack: null, is_melted: false }];
    const heal = ((raw["rest"] as Raw)["options"] as Raw[]).find((option) => option["option_id"] === "HEAL")!;
    heal["description"] = `回复最大生命值的30%（23）。\n${line}`;
    return raw;
  };
  const restFacts = (decision: ReturnType<typeof decide>): Record<string, JsonValue> => (ask(decision).state["facts"] as Record<string, Record<string, JsonValue>>)["rest_site"]!;

  it("Regal Pillow: heal 23 + 15 (TQCZFBK7T09Y F25: 45 -> 86/87 = 26 + 15); the options' HP and the facts start the route there", () => {
    const decision = decide(env(restWith("REGAL_PILLOW", "皇家枕头", "皇家枕头提供+15点生命。"), memoryAt(REST)));
    expect(decision.label).toBe("rest/plan");
    const options = blockOf(decision)!.plan_facts.if_option!;
    expect(options.map((line) => line.split("：")[0])).toEqual(["o0 HEAL（HP 77/77）", "o1 SMITH（HP 40/77）"]);
    expect(restFacts(decision)).toMatchObject({ heal_amount: "38 HP: 23 (30% of max HP, rounded down) + 15 (Regal Pillow +15 HP)", hp_after_heal: "77/77" });
    // A change after the heal is projected from the healed HP.
    const memory = memoryAt(REST);
    const pillow = decide(env(restWith("REGAL_PILLOW", "皇家枕头", "皇家枕头提供+15点生命。"), memory));
    const block = blockOf(pillow)!;
    const route = legalRoutes(block).map((ids) => ids.join(" ")).find((ids) => ids !== planIds(block).join(" "))!;
    const resolved = choose(pillow, "o0", undefined, route);
    resolved.apply?.();
    expect(memory.routePlan?.hpPct).toBe(1);
  });

  it("Stone Humidifier: heal 23, then max HP and HP +5 (WFR4AUP2CWDT F8: 50/80 -> 79/85); the heal option's HP at the new max", () => {
    const decision = decide(env(restWith("STONE_HUMIDIFIER", "石炉加湿器", "提升5点你的最大生命值。"), memoryAt(REST)));
    const options = blockOf(decision)!.plan_facts.if_option!;
    expect(options.map((line) => line.split("：")[0])).toEqual(["o0 HEAL（HP 68/82）", "o1 SMITH（HP 40/77）"]);
    // Shown against max HP after the rest (82, and 5 more at each later rest), not the 77 of now.
    const maxes = [...options[0]!.matchAll(/\d+\/(\d+)（p75/g)].map((match) => Number(match[1]));
    expect(maxes.length).toBeGreaterThan(0);
    for (const max of maxes) expect(max).toBeGreaterThanOrEqual(82);
    expect(restFacts(decision)).toMatchObject({ heal_amount: "23 HP: 23 (30% of max HP, rounded down), and max HP +5 with HP +5 (Stone Humidifier +5 max HP)", hp_after_heal: "68/82" });
  });

  it("without the game's number: 30% of max HP rounded down (92 -> 27, as the game writes it) and the relics held", () => {
    expect(baseRestHeal(92)).toBe(27);
    expect(baseRestHeal(85)).toBe(25);
    expect(baseRestHeal(77)).toBe(23);
    expect(restHealHere("", 87, ["BURNING_BLOOD", "REGAL_PILLOW"])).toMatchObject({ base: 26, total: 41, rest: { bonus: 15, maxGain: 0 } });
    expect(restHealHere("回复最大生命值的30%（24）。\n提升5点你的最大生命值。", 80, ["STONE_HUMIDIFIER"])).toMatchObject({ base: 24, total: 24, rest: { bonus: 0, maxGain: 5 } });
  });

  it("later rests on a route heal with the relics too (the projection behind the route facts)", () => {
    const model: RoomCostModel = { act: 1, maxHp: 80, monster: { median: 10, p75: 15, source: "test" }, elite: { median: 30, p75: 40, source: "test" }, unknown: { median: 0, p75: 3, source: "test" } };
    expect(projectPath(["RestSite", "Boss"], 40, model).arrival).toEqual([40, 64]);
    expect(projectPath(["RestSite", "Boss"], 40, { ...model, rest: restHealOf(["REGAL_PILLOW"]) }).arrival).toEqual([40, 79]);
    const humid = projectPath(["RestSite", "Monster", "RestSite", "Boss"], 40, { ...model, rest: restHealOf(["STONE_HUMIDIFIER"]) });
    // 40 + 24 + 5 = 69/85; -10 = 59; + 25 + 5 = 89/90.
    expect(humid.arrival).toEqual([40, 69, 59, 89]);
    expect(humid.maxArrival).toEqual([80, 85, 85, 90]);
  });
});

describe("a route review answered without \"route\" (v3 5afb91f / 5518d8b): V4's review has no named routes, only keep is read back", () => {
  it("routeKeys: keep for V4's route_review, v3's named routes where a question has them", () => {
    expect(routeKeys({ route_review: { plan: "r4c1 r5c2", map: [] } })).toEqual(["keep"]);
    expect(routeKeys({ route_review: { routes: { keep: "x", p1: "y" } } })).toEqual(["keep", "p1"]);
    expect(routeKeys({})).toEqual([]);
  });

  it("the reasoning's settled keep is taken; a negated or asked one is not", () => {
    const keys = routeKeys({ route_review: { plan: "r4c1" } });
    expect(recoverRoute(["Decision: HEAL (o0). Keep the route."], keys)).toMatchObject({ route: "keep" });
    expect(recoverRoute(["Don't keep the route."], keys)).toBeNull();
    expect(recoverRoute(["Keep the route? Maybe."], keys)).toBeNull();
  });
});
