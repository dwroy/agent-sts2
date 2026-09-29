/**
 * Fix batch H (notes/fix-queue.md): pure bugs. One describe per fix; boards are synthetic or logged fixtures
 * (tests/logged-states/batch-h, out of the rollout-live / potion-mc sweeps), never the refreshing knowledge files.
 */

import { describe, expect, it } from "vitest";

import type { AnswerSet } from "../src/jev/answers.js";
import type { AskDecision, DecisionEnv } from "../src/project/types.js";
import { actOfFloor, planMap } from "../src/screens/map.js";
import { logged, loggedEnv, type Logged } from "./logged.js";

type Raw = Record<string, unknown>;

const keysOf = (decision: AskDecision): string[] => {
  const question = decision.questions["pick"]!;
  return Object.keys(question.type === "choice" ? question.criteria ?? {} : {}).sort();
};
const criteriaOf = (decision: AskDecision, key: string): Raw => {
  const question = decision.questions["pick"]!;
  return JSON.parse(String(question.type === "choice" ? question.criteria[key] : "{}")) as Raw;
};
/** A DeepSeek answer as the loop hands it to resolve (its extra fields in raw). */
const deepseekPick = (key: string, raw: Raw = {}): AnswerSet => ({ pick: { type: "choice", choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: { escalated: "deepseek", ...raw } } }) as AnswerSet;
const jevPick = (key: string, nouls: Record<string, number> = {}): AnswerSet =>
  ({
    pick: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} },
    ...Object.fromEntries(Object.entries(nouls).map(([question, noul]) => [question, { type: "noul", noul, raw: {} }])),
  }) as AnswerSet;

describe("1. White Beast Statue: code no longer discards a potion on the map; a fight node gets \"discard, then travel\" for the decider (CRY9LDHSKVFB F18)", () => {
  const potions = (fx: Logged): Raw[] => (fx.state["run"] as Raw)["potions"] as Raw[];

  it("the logged F18 map (full belt, two Monsters ahead): Jev's route question carries a discard variant per node, code discards nothing", () => {
    const fx = logged("batch-h/cry9-f18-map-white-beast");
    const env = loggedEnv(fx);
    const decision = planMap(env);
    expect(decision?.label).not.toBe("map/discard-potion");
    expect(decision?.kind).toBe("ask");
    const ask = decision as AskDecision;
    expect(keysOf(ask)).toEqual(["n0", "n0:discard", "n1", "n1:discard"]);
    expect(String(criteriaOf(ask, "n0")["potion_slots"])).toMatch(/^White Beast Statue drops a potion after every fight/);
    expect(criteriaOf(ask, "n0:discard")["discardable_potions"]).toMatchObject({ "0": expect.stringMatching(/^迅捷药水/), "1": expect.stringMatching(/^镣铐药水/) });
    expect(Object.keys(ask.questions).sort()).toEqual(["discard_p0", "discard_p1", "pick"]);
    // Jev keeps its potions: the plain node.
    expect(ask.resolve(jevPick("n1")).intent).toEqual({ action: "choose_map_node", option_index: 1 });
    // Jev discards the Swift Potion, then travels to n1 once the slot is empty.
    const resolved = ask.resolve(jevPick("n1:discard", { discard_p0: 0.8, discard_p1: 0.1 }));
    expect(resolved.intent).toEqual({ action: "discard_potion", option_index: 0 });
    resolved.apply?.();
    expect(planMap({ ...loggedEnv(fx), screenMemory: env.screenMemory })).toBeNull();
    potions(fx)[0] = { index: 0, occupied: false, can_discard: false };
    expect(planMap({ ...loggedEnv(fx), screenMemory: env.screenMemory })).toMatchObject({ kind: "act", label: "map/after-discard", intent: { action: "choose_map_node", option_index: 1 } });
  });

  it("DeepSeek's route plan heading into a Monster: travel on or discard first is asked; its failure keeps the plain move", () => {
    const fx = logged("batch-h/cry9-f18-map-white-beast");
    const env: DecisionEnv = { ...loggedEnv(fx), buildDecider: "deepseek" };
    env.screenMemory.routePlan = { runId: "CRY9LDHSKVFB", act: actOfFloor(18), floor: 18, hpPct: 0.8, path: [{ row: 1, col: 4, type: "Monster", hpOnArrival: 0.8 }], summary: "Monster" };
    const decision = planMap(env) as AskDecision;
    expect(decision.kind).toBe("ask");
    expect(decision.label).toBe("map/statue-potion");
    expect(keysOf(decision)).toEqual(["go", "go:discard"]);
    expect(decision.deepseek?.baseline).toMatchObject({ kind: "act", label: "map/route-follow", intent: { action: "choose_map_node", option_index: 1 } });
    expect(decision.resolve(deepseekPick("go")).intent).toEqual({ action: "choose_map_node", option_index: 1 });
    const discard = decision.resolve(deepseekPick("go", { discard: [1] }));
    expect(discard.intent).toEqual({ action: "discard_potion", option_index: 1 });
    // Two slots for one potion is no answer (code does not trim it for the decider).
    expect(decision.resolve(deepseekPick("go:discard", { discard: [0, 1] }))).toMatchObject({ intent: null, fallback: true });
  });

  it("no statue, or a free slot, or a rest site ahead: nothing is added", () => {
    const fx = logged("batch-h/cry9-f18-map-white-beast");
    potions(fx)[1] = { index: 1, occupied: false, can_discard: false };
    expect(keysOf(planMap(loggedEnv(fx)) as AskDecision)).toEqual(["n0", "n1"]);
    const rest = logged("batch-h/cry9-f18-map-white-beast");
    const nodes = ((rest.state["map"] as Raw)["available_nodes"] as Raw[]).map((node) => ({ ...node, node_type: "RestSite" }));
    (rest.state["map"] as Raw)["available_nodes"] = nodes;
    const decision = planMap(loggedEnv(rest));
    expect(decision?.kind === "ask" ? keysOf(decision) : []).not.toContain("n0:discard");
  });
});
