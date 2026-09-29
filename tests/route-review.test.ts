/**
 * The act's route rides on the card-reward and rest-site questions (BUILD_DECIDER=deepseek; Dai 2026-09-29):
 * HP against the plan's projection first, the plan's steps, the plan from here ("keep") and the other paths
 * from here; the answer's `route` keeps the plan (the default) or names a path, which becomes the act's plan
 * and is followed from the next map. A missing or unknown route keeps the plan and is logged; the card or rest
 * choice is never blocked by the review.
 *
 * Boards: XLJQ6FPQAU7N F4 map -> F5 card reward -> F5 map (the F7 Terror Eel elite ahead at 54/91 against a
 * 69/91 projection) and W2TBR2YUMQ5Y F6 map -> F7 rest site -> F7 map (smithed at 67/77 where the plan
 * projected a heal), A9, with the route plan and run plan those runs had.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import { createScreenMemory, type ScreenMemory } from "../src/project/types.js";
import type { RoutePlan } from "../src/screens/map.js";
import { rememberChosenNode, rememberMap } from "../src/screens/rest.js";
import type { RunPlan } from "../src/strategy/run-plan.js";
import type { JsonValue } from "../src/util/json.js";
import { act, ask, board, choose, decide, DIR, env, FakeDeepSeek, keyOf, play, scriptedDeepSeek, setupOneshotTests, type Raw } from "./oneshot-support.js";
import { mainMenuPayload } from "./scenarios.js";

setupOneshotTests();

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

type Block = { hp: string; run_plan_hp?: string; planned: string; routes: Record<string, Record<string, JsonValue>>; projection: string };
const blockOf = (decision: ReturnType<typeof decide>): Block | undefined => (ask(decision).state["route_review"] as Block | undefined);
const instructionsOf = (decision: ReturnType<typeof decide>): string => String(ask(decision).questions["pick"]?.instructions);

/** The key of a route in the block with no elite (the branch that skips the F7 Terror Eel). */
const noEliteKey = (block: Block): string => Object.keys(block.routes).find((key) => block.routes[key]!["elites"] === 0)!;

describe("card reward: the act's route rides on the same question", () => {
  it("HP against the plan's projection comes first (next node, the plan's elite and boss), then the run plan's HP lines and the plan's steps", () => {
    const decision = decide(env(board(REWARD, "reward"), memoryAt(REWARD)));
    expect(decision.label).toBe("reward/card");
    const block = blockOf(decision)!;
    expect(Object.keys(block)[0]).toBe("hp");
    expect(block.hp).toBe("HP 54/91, 15 points below the plan's projection for the next node (Unknown, F6: 69/91), 15 points below for the elite at F7 (69/91), 37 points below for the boss at F17 (91/91).");
    // The run plan's own HP sentences, not its other numbers ("~25% error").
    expect(block.run_plan_hp).toContain("Elites only with high HP and a fire after;");
    expect(block.run_plan_hp).not.toContain("25% error");
    expect(block.planned).toMatch(/^F6 Unknown 69 -> F7 Elite 69 -> F8 Monster 34 -> .* -> F17 Boss 91 \(HP on arrival projected at F1\)$/);
    expect(block.projection).toMatch(/^HP a room costs in act 1 \(median\/p75\)/);
  });

  it("keep (the plan from here) and the other paths from here, with the route plan's facts and code's value and rank", () => {
    const decision = decide(env(board(REWARD, "reward"), memoryAt(REWARD)));
    const block = blockOf(decision)!;
    const keys = Object.keys(block.routes);
    expect(keys[0]).toBe("keep");
    expect(keys.slice(1)).toEqual(keys.slice(1).map((_, at) => `p${at + 1}`));
    expect(block.routes["keep"]).toMatchObject({ keep: expect.any(String), path: "Unknown -> Elite -> Monster -> RestSite -> Treasure -> RestSite -> Unknown -> RestSite -> Shop -> Monster -> RestSite -> Boss" });
    for (const route of Object.values(block.routes)) {
      expect(route).toMatchObject({ path: expect.stringMatching(/Boss$/), first_node: expect.stringMatching(/^row 5, column [56] /), hp_at_boss: expect.any(String), hp_on_arrival_at_elites: expect.any(Array), code_value: expect.any(Number), code_rank: expect.any(Number) });
    }
    expect(new Set(Object.values(block.routes).map((route) => route["code_rank"])).size).toBe(keys.length);
    // The branch without the elite is there (code never drops options).
    expect(noEliteKey(block)).toMatch(/^p\d$/);
    expect(instructionsOf(decision)).toMatch(/"route": "keep" \(the default: follow the plan\)/);
    expect(instructionsOf(decision)).toMatch(/"route_reason"/);
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

  it("a change: the card is taken; the path becomes the act's plan (step 2 of the card's plan), projected from HP now; the next map move follows it", () => {
    const memory = memoryAt(REWARD);
    const decision = decide(env(board(REWARD, "reward"), memory));
    const block = blockOf(decision)!;
    const key = noEliteKey(block);
    const resolved = choose(decision, "card1", undefined, key, "skip the eel at 54/91");
    expect(resolved.intent).toEqual({ action: "choose_reward_card", option_index: 1 });
    expect(resolved.plan).toEqual({ id: "XLJQ6FPQAU7N:F5:reward#1", steps: ["card1", key] });
    expect(resolved.routeReview).toMatchObject({
      answer: key,
      outcome: "change",
      reason: "skip the eel at 54/91",
      change: { ref: "XLJQ6FPQAU7N:F5:reward#1", step: 2, key, from: String(block.routes["keep"]!["path"]), to: String(block.routes[key]!["path"]), why: "card-reward review" },
    });
    resolved.apply?.();
    expect(memory.routePlan).toMatchObject({ runId: "XLJQ6FPQAU7N", act: 1, floor: 5, summary: block.routes[key]!["path"], why: "card-reward review" });
    expect(memory.routePlan?.hpPct).toBeCloseTo(54 / 91, 5);
    expect(memory.routePlan?.path[0]?.hpOnArrival).toBeCloseTo(54 / 91, 5);
    expect(memory.planSeq).toEqual({ runId: "XLJQ6FPQAU7N", n: 1 });
    const [, row, col] = /row (\d+), column (\d+)/.exec(String(block.routes[key]!["first_node"]))!;
    const mapAfter = board(REWARD, "map_after");
    const index = (((mapAfter["map"] as Raw)["available_nodes"] as Raw[]).find((node) => node["row"] === Number(row) && node["col"] === Number(col))!)["index"];
    expect(act(decide(env(mapAfter, memory)))).toMatchObject({ label: "map/route-follow", intent: { action: "choose_map_node", option_index: index } });
  });

  it("no route, or one not in route_review.routes: the card is still taken and the plan kept; the answer is logged", () => {
    const memory = memoryAt(REWARD);
    const before = memory.routePlan;
    const decision = decide(env(board(REWARD, "reward"), memory));
    const cases: [string | undefined, string][] = [[undefined, "the answer has no route"], ["p99", 'unknown route "p99"'], ["route 3", 'unknown route "route 3"']];
    for (const [route, invalid] of cases) {
      const resolved = choose(decision, "card2", undefined, route);
      expect(resolved.intent).toEqual({ action: "choose_reward_card", option_index: 2 });
      expect(resolved.routeReview).toEqual({ answer: route ?? null, outcome: "invalid", reason: "", invalid });
      expect(resolved.plan).toBeUndefined();
      resolved.apply?.();
      expect(memory.routePlan).toBe(before);
    }
    expect(choose(decision, "card2", undefined, " KEEP ").routeReview?.outcome).toBe("keep");
  });

  it("a failure inside the review never blocks the card: the card is taken, the plan kept, the failure logged", () => {
    const memory = memoryAt(REWARD);
    const before = memory.routePlan;
    const e = env(board(REWARD, "reward"), memory);
    const decision = decide(e);
    const key = noEliteKey(blockOf(decision)!);
    Object.defineProperty(e.state.raw, "run_id", { get: () => { throw new Error("boom"); } });
    const resolved = choose(decision, "card0", undefined, key);
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
  it("HP against the plan (whose numbers assume a heal here), the run plan's HP lines, and each route's HP after heal and after smith", () => {
    const decision = decide(env(board(REST, "rest"), memoryAt(REST)));
    expect(decision.label).toBe("rest/plan");
    const block = blockOf(decision)!;
    expect(block.hp).toBe(
      "HP 67/77, 10 points below the plan's projection for the next node (Monster, F8: 77/77), 7 points below for the elite at F9 (74/77), 10 points below for the boss at F17 (77/77); the plan's numbers after this rest site assume you heal here.",
    );
    expect(block.run_plan_hp).toContain("Elites only at ≥78% HP after a campfire.");
    for (const route of Object.values(block.routes)) {
      expect(Object.keys(route["hp_if_option"] as Record<string, string>)).toEqual(["o0 HEAL (HP 77)", "o1 SMITH (HP 67)"]);
    }
    expect((block.routes["keep"]!["hp_if_option"] as Record<string, string>)["o0 HEAL (HP 77)"]).toMatch(/^(~\d+\/77|HP runs out before) (at )?the elite F9, .*the boss$/);
    expect(instructionsOf(decision)).toMatch(/hp_if_option/);
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

  it("heal and change: the new route is projected from the healed HP, a step after the heal", () => {
    const memory = memoryAt(REST);
    const decision = decide(env(board(REST, "rest"), memory));
    const key = Object.keys(blockOf(decision)!.routes).find((route) => route !== "keep")!;
    const resolved = choose(decision, "o0", undefined, key, "heal, then the other branch");
    expect(resolved.intent).toEqual({ action: "choose_rest_option", option_index: 0 });
    expect(resolved.plan).toEqual({ id: "W2TBR2YUMQ5Y:F7:rest#1", steps: ["o0", key] });
    expect(resolved.routeReview?.change).toMatchObject({ step: 2, key, why: "rest-site review" });
    resolved.apply?.();
    expect(memory.routePlan).toMatchObject({ floor: 7, hpPct: 1, why: "rest-site review" });
    expect(memory.routePlan?.path[0]?.hpOnArrival).toBe(1);
    expect(memory.planSeq).toEqual({ runId: "W2TBR2YUMQ5Y", n: 1 });
    expect(act(decide(env(board(REST, "map_after"), memory)))).toMatchObject({ label: "map/route-follow", intent: { option_index: 0 } });
  });

  it("smith and change: the route from HP now, the route step after the named card", () => {
    const memory = memoryAt(REST);
    const decision = decide(env(board(REST, "rest"), memory));
    const key = Object.keys(blockOf(decision)!.routes).find((route) => route !== "keep")!;
    const card = keyOf(board(REST, "rest"), "BASH");
    const resolved = choose(decision, `o1:${card}`, undefined, key);
    expect(resolved.plan).toEqual({ id: "W2TBR2YUMQ5Y:F7:rest#1", steps: ["o1", card, key] });
    expect(resolved.routeReview?.change).toMatchObject({ step: 3 });
    resolved.apply?.();
    expect(memory.routePlan?.hpPct).toBeCloseTo(67 / 77, 5);
    expect(memory.pendingPick).toMatchObject({ step: 2 });
  });

  it("the step-by-step rest question (after an unusable one-shot answer) has no route block", () => {
    const memory = memoryAt(REST);
    ask(decide(env(board(REST, "rest"), memory))).deepseek.oneshot?.fallback();
    const next = decide(env(board(REST, "rest"), memory));
    expect(next.label).toBe("rest/choose");
    expect(blockOf(next)).toBeUndefined();
  });
});

describe("rest site route review in the loop", () => {
  it("one call for the rest action, its card and the route; the change is its own row, the plan's last step; the next map follows it", async () => {
    const bash = keyOf(board(REST, "rest"), "BASH");
    const deepseek = new FakeDeepSeek((criteria, label) => (label === "map/route-plan" ? Object.keys(criteria)[0]! : { choice: `o1:${bash}`, route: "p1", routeReason: "the other branch" }));
    const { stats, actions, records } = await play([board(REST, "map_before"), board(REST, "rest"), board(REST, "map_after"), mainMenuPayload()], deepseek);
    expect(deepseek.calls.map((call) => call.label)).toEqual(["map/route-plan", "rest/plan"]);
    expect(stats.deepseekCalls).toBe(2);
    expect(deepseek.calls[1]!.state["route_review"]).toMatchObject({ hp: expect.stringMatching(/^HP 67\/77, .*assume you heal here\.$/) });
    expect(actions).toEqual([{ action: "choose_map_node", option_index: 0 }, { action: "choose_rest_option", option_index: 1 }, { action: "choose_map_node", option_index: 0 }]);
    const rest = records.find((row) => row["label"] === "rest/plan")!;
    expect(rest).toMatchObject({ decider: "deepseek", deepseek: { plan_id: "W2TBR2YUMQ5Y:F7:rest#1", plan: ["o1", bash, "p1"], plan_step: 1, route: "p1", route_reason: "the other branch" }, route_review: { outcome: "change", plan_step: 3 } });
    const change = records.find((row) => row["label"] === "map/route-change")!;
    expect(change).toMatchObject({ ts: rest["ts"], deepseek: { reused: true, plan_ref: "W2TBR2YUMQ5Y:F7:rest#1", plan_step: 3, choice: "p1" }, route_plan: { why: "rest-site review", floor: 7 } });
    expect(records.find((row) => row["label"] === "map/route-follow")).toMatchObject({ decider: "code" });
  });

  it("the real client reads the answer's route and route_reason", async () => {
    const { client } = await scriptedDeepSeek([
      { content: '{"choice": "p1", "reason": "route"}', reasoning: "Decisive: p1." },
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
});
