/**
 * Fix batch G (notes/fix-queue.md): pure bugs. One describe per fix; boards are synthetic or logged fixtures
 * (tests/logged-states/batch-g, out of the rollout-live / potion-mc sweeps), never the refreshing knowledge files.
 */

import { describe, expect, it } from "vitest";

import type { AnswerSet } from "../src/jev/answers.js";
import type { AskDecision, DecisionEnv } from "../src/project/types.js";
import { planEvent } from "../src/screens/event.js";
import { planMap } from "../src/screens/map.js";
import { planRest } from "../src/screens/rest.js";
import { checkConsistency } from "../src/llm/consistency.js";
import { discardSlotsOf } from "../src/screens/potion-discard.js";
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

describe("1. Tiny Mailbox: code no longer discards a potion on the map; the rest site offers \"discard, then heal\" to the decider (ZGZ0EQDDNJPT F10/F11)", () => {
  const deepseekEnv = (fx: Logged, over: Partial<DecisionEnv> = {}): DecisionEnv => ({ ...loggedEnv(fx), buildDecider: "deepseek", ...over });

  it("the logged F10 map (full belt, a rest site ahead, Tiny Mailbox): no map/discard-potion", () => {
    const fx = logged("batch-g/zgz0-f10-map-mailbox");
    const decision = planMap(loggedEnv(fx));
    expect(decision?.label).not.toBe("map/discard-potion");
    expect(decision && decision.kind === "act" ? decision.intent.action : "ask").not.toBe("discard_potion");
  });

  it("F11 rest, one free slot for the mailbox's two potions: heal, heal after a discard (the answer names the slot), smith", () => {
    const fx = logged("batch-g/zgz0-f11-rest-mailbox");
    const env = deepseekEnv(fx, { oneshot: "off" });
    const decision = planRest(env) as AskDecision;
    expect(decision.kind).toBe("ask");
    expect(decision.label).toBe("rest/choose");
    expect(keysOf(decision)).toEqual(["o0", "o0:discard", "o1"]);
    expect(String(criteriaOf(decision, "o0")["potion_slots"])).toMatch(/^1 potion this option gives has no free slot and is lost/);
    expect(criteriaOf(decision, "o0:discard")["discardable_potions"]).toMatchObject({ "1": expect.stringMatching(/^爆炸安瓿/), "2": expect.stringMatching(/^格挡药水/) });
    // The smith has no potions: no variant.
    expect(criteriaOf(decision, "o1")["potion_slots"]).toBeUndefined();
    // DeepSeek: heal after discarding the Block Potion (slot 2): the discard now, the heal next.
    const resolved = decision.resolve(deepseekPick("o0:discard", { discard: [2] }));
    expect(resolved.intent).toEqual({ action: "discard_potion", option_index: 2 });
    resolved.apply?.();
    // Not landed yet: wait; landed: heal.
    expect(planRest({ ...deepseekEnv(fx, { oneshot: "off" }), screenMemory: env.screenMemory })).toBeNull();
    ((fx.state["run"] as Raw)["potions"] as Raw[])[2] = { index: 2, occupied: false, can_discard: false };
    expect(planRest({ ...deepseekEnv(fx, { oneshot: "off" }), screenMemory: env.screenMemory })).toMatchObject({ kind: "act", label: "rest/after-discard", intent: { action: "choose_rest_option", option_index: 0 } });
  });

  it("the plain heal key with a discard list is the variant; a slot that cannot go, or too many, is no answer", () => {
    const fx = logged("batch-g/zgz0-f11-rest-mailbox");
    const decision = planRest(deepseekEnv(fx, { oneshot: "off" })) as AskDecision;
    expect(decision.resolve(deepseekPick("o0", { discard: ["1"] })).intent).toEqual({ action: "discard_potion", option_index: 1 });
    expect(decision.resolve(deepseekPick("o0:discard", { discard: [0] }))).toMatchObject({ intent: null, fallback: true });
    expect(decision.resolve(deepseekPick("o0:discard", { discard: [1, 2] }))).toMatchObject({ intent: null, fallback: true });
    expect(decision.resolve(deepseekPick("o0:discard", {}))).toMatchObject({ intent: null, fallback: true });
    // Smithing discards nothing.
    expect(decision.resolve(deepseekPick("o1")).intent).toEqual({ action: "choose_rest_option", option_index: 1 });
  });

  it("the one-shot rest plan carries the variant too; Jev's question asks per slot and its yes picks the slot", () => {
    const fx = logged("batch-g/zgz0-f11-rest-mailbox");
    const oneshot = planRest(deepseekEnv(fx)) as AskDecision;
    expect(oneshot.label).toBe("rest/plan");
    expect(keysOf(oneshot)).toContain("o0:discard");
    const planned = oneshot.resolve(deepseekPick("o0:discard", { discard: [1] }));
    expect(planned.intent).toEqual({ action: "discard_potion", option_index: 1 });
    // Jev (BUILD_DECIDER=jev), at 30/80 (code's heal 10 leads its smith 6, but ties with the heal after a
    // discard: Jev is asked): the discard questions ride with the pick.
    (fx.state["run"] as Raw)["current_hp"] = 30;
    const env = loggedEnv(fx);
    const jev = planRest(env) as AskDecision;
    expect(jev.kind).toBe("ask");
    expect(Object.keys(jev.questions).sort()).toEqual(["discard_p1", "discard_p2", "pick"]);
    const resolved = jev.resolve(jevPick("o0:discard", { discard_p1: 0.2, discard_p2: 0.8 }));
    expect(resolved.intent).toEqual({ action: "discard_potion", option_index: 2 });
    resolved.apply?.();
    expect(env.screenMemory.afterDiscard).toMatchObject({ place: "rest", option: 0, slot: 2, more: [] });
  });
});

describe("1b. The discard answer field and its consistency", () => {
  it("slot numbers read from numbers or strings; a conclusion on the option does not contradict its discard variant", () => {
    expect(discardSlotsOf([2, "1", "p0", "slot 3"])).toEqual([2, 1, 0, 3]);
    expect(discardSlotsOf("1")).toBeUndefined();
    const criteria = { o0: JSON.stringify({ option: "休息" }), "o0:discard": JSON.stringify({ option: "休息" }), o1: JSON.stringify({ option: "锻造" }) };
    expect(checkConsistency("o0:discard", "heal, drop the block potion", "Decision: o0.", criteria).ok).toBe(true);
    expect(checkConsistency("o0:discard", "heal", "Decision: o1.", criteria).ok).toBe(false);
  });
});

describe("6. An event's \"discard, then take it\": one option per event option, the answer names the slots (5 slots, 3 potions made 25 options)", () => {
  /** The logged Potion Courier with a full 5-slot belt. */
  const courier = (): Logged => {
    const fx = logged("yql8-f28-potion-courier");
    const run = fx.state["run"] as Raw;
    const [fairy, attack] = run["potions"] as Raw[];
    run["potions"] = [0, 1, 2, 3, 4].map((index) => ({ ...(index % 2 ? attack : fairy)!, index }));
    return fx;
  };

  it("DeepSeek: 拿走这批药水 (3 potions) and 洗劫 (1) each get one variant; three slots named are discarded in turn, then the option", () => {
    const fx = courier();
    const env: DecisionEnv = { ...loggedEnv(fx), buildDecider: "deepseek", oneshot: "off" };
    const decision = planEvent(env) as AskDecision;
    expect(keysOf(decision)).toEqual(["o0", "o0:discard", "o1", "o1:discard"]);
    expect(String(criteriaOf(decision, "o0:discard")["discard_first"])).toMatch(/discard 1 to 3 of discardable_potions/);
    // Four slots for 3 potions is more than needed: no answer (code does not trim it for the decider).
    expect(decision.resolve(deepseekPick("o0:discard", { discard: [0, 1, 2, 3] }))).toMatchObject({ intent: null, fallback: true });
    const resolved = decision.resolve(deepseekPick("o0:discard", { discard: [4, 0, 2] }));
    expect(resolved.intent).toEqual({ action: "discard_potion", option_index: 4 });
    resolved.apply?.();
    const potions = (fx.state["run"] as Raw)["potions"] as Raw[];
    const again = () => planEvent({ ...loggedEnv(fx), buildDecider: "deepseek", oneshot: "off", screenMemory: env.screenMemory });
    potions[4] = { index: 4, occupied: false, can_discard: false };
    expect(again()).toMatchObject({ label: "event/discard-more", intent: { action: "discard_potion", option_index: 0 } });
    potions[0] = { index: 0, occupied: false, can_discard: false };
    expect(again()).toMatchObject({ label: "event/discard-more", intent: { action: "discard_potion", option_index: 2 } });
    potions[2] = { index: 2, occupied: false, can_discard: false };
    expect(again()).toMatchObject({ label: "event/after-discard", intent: { action: "choose_event_option", option_index: 0 } });
  });

  it("Jev: the same four options and one yes/no question per potion; its yeses (most sure first, at most the 3 needed) are the discards", () => {
    const fx = courier();
    const env = loggedEnv(fx);
    const decision = planEvent(env) as AskDecision;
    expect(keysOf(decision)).toEqual(["o0", "o0:discard", "o1", "o1:discard"]);
    expect(Object.keys(decision.questions).sort()).toEqual(["discard_p0", "discard_p1", "discard_p2", "discard_p3", "discard_p4", "pick"]);
    const resolved = decision.resolve(jevPick("o0:discard", { discard_p0: 0.1, discard_p1: 0.7, discard_p2: 0.2, discard_p3: 0.95, discard_p4: 0.6 }));
    expect(resolved.intent).toEqual({ action: "discard_potion", option_index: 3 });
    resolved.apply?.();
    expect(env.screenMemory.afterDiscard).toMatchObject({ place: "event:" + String((fx.state["event"] as Raw)["event_id"]), option: 0, slot: 3, more: [1, 4] });
  });
});
