/**
 * The act's route rides on an event's last question (M2, notes/v4-dev-brief.md item 2.5): the same route block as the
 * card reward and rest site, on the event question whose page is not known to open another choice page of the event
 * (knowledge/event-pages.ts, fixed data here). A change is a step of the event's plan.
 *
 * Board: XLJQ6FPQAU7N's F5 map (the route plan's next node is the "?" room at r5c6), then an event at F6 in that room
 * (Big Fish from the test scenarios, and U6RUE7LBUFJF's Doors of Light and Dark with its card removal).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { isLastEventPage, optionContinues, setEventPagesForTests } from "../src/knowledge/event-pages.js";
import { setRoomCostsForTests } from "../src/knowledge/room-costs.js";
import { parseGameState } from "../src/mod/schema.js";
import { createScreenMemory, type ScreenMemory } from "../src/project/types.js";
import type { RoutePlan } from "../src/screens/map.js";
import { rememberChosenNode, rememberMap } from "../src/screens/rest.js";
import type { JsonValue } from "../src/util/json.js";
import { ask, board, choose, decide, DIR, env, keyOf, setupOneshotTests, type Raw } from "./oneshot-support.js";
import { legalRoutes } from "./route-fixture.js";
import { eventPayload } from "./scenarios.js";

setupOneshotTests();

beforeAll(() =>
  setRoomCostsForTests({ "9": { "1": { Monster: { n: 262, median: 2, p75: 7, mean: 4 }, Elite: { n: 50, median: 26, p75: 36, mean: 27 }, Unknown: { n: 189, median: 0, p75: 6, mean: 2 } } } }),
);
afterAll(() => setRoomCostsForTests(null));
afterEach(() => setEventPagesForTests(null));

const REWARD = "xljq-f5-reward";

/** The memory after XLJQ's F5 map with the "?" room (r5c6, the plan's next node) chosen, and the act's route plan. */
function memoryAtEvent(): ScreenMemory {
  const fx = JSON.parse(readFileSync(join(DIR, `${REWARD}.json`), "utf8")) as { memory: { routePlan: RoutePlan } };
  const memory = createScreenMemory("MAP");
  const map = parseGameState(board(REWARD, "map_after"));
  rememberMap(memory, map);
  rememberChosenNode(memory, map, { action: "choose_map_node", option_index: 1 });
  memory.routePlan = fx.memory.routePlan;
  return memory;
}

/** An EVENT state at F6 in XLJQ's run (its deck, relics and HP), with this event object. */
function eventAtF6(event: Raw): Raw {
  const raw = board(REWARD, "reward");
  return { ...raw, screen: "EVENT", available_actions: ["choose_event_option"], reward: null, event, run: { ...(raw["run"] as Raw), floor: 6 } };
}

const bigFish = (): Raw => eventAtF6(eventPayload()["event"] as Raw);
const doors = (): Raw => eventAtF6(board("u6ru-f7-doors", "event")["event"] as Raw);

type Block = { plan: string; next_nodes: string[]; position: string; plan_facts: Record<string, JsonValue> };
const blockOf = (decision: ReturnType<typeof decide>): Block | undefined => ask(decision).state["route_review"] as Block | undefined;

describe("which event pages are the last question (logged pages, fixed here)", () => {
  it("a page is not the last one only when every option on it opened another page more often than it ended the event", () => {
    const pages = { BIG_FISH: { BANANA: [3, 0], BOX: [2, 1], LEAVE: [0, 4] } } as Record<string, Record<string, [number, number]>>;
    expect(optionContinues("BIG_FISH", "BANANA", pages)).toBe(true);
    expect(optionContinues("BIG_FISH", "LEAVE", pages)).toBe(false);
    expect(optionContinues("BIG_FISH", "NEVER_SEEN", pages)).toBe(false);
    const event = eventPayload()["event"] as Raw;
    // LEAVE ends it: the last question.
    expect(isLastEventPage(event, pages)).toBe(true);
    // Every unlocked option continues (DONUT is locked): not the last question.
    expect(isLastEventPage(event, { BIG_FISH: { ...pages["BIG_FISH"], LEAVE: [5, 1] } })).toBe(false);
    // An event never logged: the last question.
    expect(isLastEventPage(event, {})).toBe(true);
    expect(isLastEventPage({ event_id: "X", options: [{ is_proceed: true }] }, {})).toBe(true);
  });

  it("the committed data: Slippery Bridge's hold-on pages continue, its first page's two options do not both", () => {
    expect(optionContinues("SLIPPERY_BRIDGE", "SLIPPERY_BRIDGE.pages.INITIAL.options.HOLD_ON_0")).toBe(true);
    expect(optionContinues("SLIPPERY_BRIDGE", "SLIPPERY_BRIDGE.pages.INITIAL.options.OVERCOME")).toBe(false);
  });
});

describe("the route rides on the event's last question", () => {
  it("event/choose: the route block (the plan from the \"?\" room on, its facts from HP now) and the route note", () => {
    setEventPagesForTests({});
    const decision = decide(env(bigFish(), memoryAtEvent()));
    expect(decision.label).toBe("event/choose");
    const block = blockOf(decision)!;
    expect(block.position).toBe("你在 r5c6（F6 问号）；下一步可走：r6c6");
    expect(block.plan).toBe("r6c6 精英 → r7c6 普通战 → r8c5 休息 → r9c4 宝箱 → r10c5 休息 → r11c6 问号 → r12c5 休息 → r13c5 商店 → r14c6 普通战 → r15c5 休息 → r16c3 Boss");
    expect(block.plan_facts["next_elite"]).toBe("F7 r6c6：到达 54/91（p75 54）");
    expect(String(ask(decision).questions["pick"]?.instructions)).toContain('"route"："keep"（默认，照计划走）或新的节点序列');
  });

  it("not on a page whose every option opens another page of the event", () => {
    setEventPagesForTests({ BIG_FISH: { BANANA: [3, 0], BOX: [2, 0], LEAVE: [4, 1] } });
    const decision = decide(env(bigFish(), memoryAtEvent()));
    expect(decision.label).toBe("event/choose");
    expect(blockOf(decision)).toBeUndefined();
    expect(String(ask(decision).questions["pick"]?.instructions)).not.toContain("route_review");
  });

  it("a route change on the event: the option is taken, the new route becomes the act's plan (an event plan step)", () => {
    setEventPagesForTests({});
    const memory = memoryAtEvent();
    const decision = decide(env(doors(), memory));
    expect(decision.label).toBe("event/plan");
    const block = blockOf(decision)!;
    expect(block).toBeDefined();
    const planned = block.plan.split(" → ").map((step) => step.split(" ")[0]).join(" ");
    const card = keyOf(board(REWARD, "reward"), "STRIKE_IRONCLAD");
    expect(choose(decision, `o1:${card}`, undefined, planned).routeReview?.outcome).toBe("keep");
    // Another legal route (a later fork): the act's plan after the option and its card.
    const other = legalRoutes(block).map((ids) => ids.join(" ")).find((ids) => ids !== planned)!;
    const changed = choose(decision, `o1:${card}`, undefined, other, "rest before the boss");
    expect(changed.intent).toEqual({ action: "choose_event_option", option_index: 1 });
    expect(changed.plan).toEqual({ id: "XLJQ6FPQAU7N:F6:event#1", steps: ["o1", card, other] });
    expect(changed.routeReview).toMatchObject({ answer: other, outcome: "change", reason: "rest before the boss", change: { step: 3, key: other, why: "event review" } });
    changed.apply?.();
    expect(memory.routePlan).toMatchObject({ floor: 6, why: "event review" });
    expect(memory.routePlan!.path.map((step) => `r${step.row}c${step.col}`).join(" ")).toBe(other);
    const illegal = choose(decision, `o1:${card}`, undefined, "r6c5 r7c6");
    expect(illegal.intent).toEqual({ action: "choose_event_option", option_index: 1 });
    expect(illegal.routeReview).toMatchObject({ outcome: "invalid", invalid: expect.stringContaining("第 1 步 r6c5") });
  });
});
