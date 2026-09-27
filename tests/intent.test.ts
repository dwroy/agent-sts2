/**
 * Strategic intents (intent.ts) and the plan validator (plan-validator.ts): run-plan repairs, change
 * continuity between plan versions (trigger checked against the facts, flip-flops, inherited fields),
 * and hp_policy / route_risk / avoid carried out on the rest site, the map, rewards and the solver.
 */

import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type Decision, type DecisionEnv } from "../src/project/types.js";
import { planMap } from "../src/screens/map.js";
import { planRest } from "../src/screens/rest.js";
import { planReward } from "../src/screens/reward.js";
import type { CardModel } from "../src/strategy/card-model.js";
import { intentLines, solverScale } from "../src/strategy/intent.js";
import { repairRunPlan } from "../src/strategy/plan-validator.js";
import { parseRunPlan, snapshotOf, type RunPlan } from "../src/strategy/run-plan.js";
import { solveTurn } from "../src/strategy/turn-solver.js";
import { baseState, mapPayload, restPayload, rewardCardPayload, runPayload, testKnowledge } from "./scenarios.js";

type Raw = Record<string, unknown>;
const config = loadConfig({} as NodeJS.ProcessEnv);

const runPlan = (over: Partial<RunPlan> = {}): RunPlan => ({
  runId: "TESTRUN123", act: 2, floor: 9, hpPct: 55 / 80, trigger: "start", archetype: "Strength", want: ["INFLAME"], avoid: [], remove: [], blockTarget: null,
  hpPolicy: "balanced", routeRisk: "normal", entryHp: null, reserve: [], needs: [], avoidRoles: [], bossPrep: "", summary: "scale", version: 1, changes: [], validator: [],
  ...over,
});

function env(raw: Raw, plan: RunPlan | null): DecisionEnv {
  const state: GameState = parseGameState(raw);
  const screenMemory = createScreenMemory(state.screen);
  screenMemory.runPlan = plan;
  return {
    state, knowledge: testKnowledge, brief: buildRunBrief(state, testKnowledge), thresholds: config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: false, combatPlanner: "turn", screenMemory, shopDiscardPotions: [],
  };
}

/** The option code plays: the act, or the fallback of a question left unanswered. */
function codePick(decision: Decision | null): unknown {
  if (!decision) return null;
  if (decision.kind === "act") return decision.intent;
  return decision.resolve({}).intent;
}

const mapState = (run: Raw = {}) => parseGameState(baseState("MAP", { run: runPayload(run) }));

describe("run plan validator repairs (不乱指挥)", () => {
  it("repairs incoherent intents and logs one reason each", () => {
    const plan = runPlan({ hpPolicy: "push", routeRisk: "seek_elites", needs: ["aoe"], avoidRoles: ["aoe", "draw"], want: ["INFLAME"], avoid: ["INFLAME", "ANGER"], reserve: ["any", "block"] });
    const notes = repairRunPlan(plan, { hpPct: 0.35, toBoss: 12 });
    expect(plan).toMatchObject({ hpPolicy: "balanced", routeRisk: "normal", avoidRoles: ["draw"], avoid: ["ANGER"], reserve: ["any"] });
    expect(notes).toEqual([
      "hp_policy push at 35% HP → balanced",
      "route_risk seek_elites at 35% HP → normal",
      "avoid roles aoe are also needed: dropped from avoid",
      "cards INFLAME both wanted and avoided: dropped from avoid",
      "reserve lists 'any' with other roles → any",
    ]);
  });

  it("push below the entry target near the boss is balanced; seek_elites under preserve is normal", () => {
    const near = runPlan({ hpPolicy: "push", entryHp: 0.8 });
    expect(repairRunPlan(near, { hpPct: 0.7, toBoss: 5 })).toEqual(["hp_policy push 5 floors from the boss below the 80% entry target → balanced"]);
    const far = runPlan({ hpPolicy: "push", entryHp: 0.8 });
    expect(repairRunPlan(far, { hpPct: 0.7, toBoss: 14 })).toEqual([]);
    const preserve = runPlan({ hpPolicy: "preserve", routeRisk: "seek_elites" });
    expect(repairRunPlan(preserve, { hpPct: 0.9, toBoss: 14 })).toEqual(["route_risk seek_elites contradicts hp_policy preserve → normal"]);
  });
});

describe("re-plan continuity (changes need a trigger the facts show)", () => {
  /** The plan in force: made on F9 at 55/80 with a snapshot of the run then. */
  const previous = (): RunPlan => runPlan({ snapshot: snapshotOf(mapState(), testKnowledge) });
  /** The run two floors later: HP 30/80, one potion used. */
  const later = (run: Raw = {}) => mapState({ floor: 11, current_hp: 30, potions: [], ...run });

  it("a missing field keeps its value; an unchanged plan is version + 1", () => {
    const plan = parseRunPlan({ summary: "same plan" }, later(), testKnowledge, "review", previous());
    expect(plan).toMatchObject({ version: 2, hpPolicy: "balanced", routeRisk: "normal", want: ["INFLAME"], archetype: "Strength", summary: "same plan" });
    expect(plan.validator).toEqual([]);
    expect(plan.changes).toEqual([]);
  });

  it("rejects a change without a trigger, or with one the facts do not show, and keeps the old value", () => {
    const none = parseRunPlan({ hp_policy: "preserve" }, later(), testKnowledge, "review", previous());
    expect(none.hpPolicy).toBe("balanced");
    expect(none.validator).toEqual(['rejected change hp_policy "balanced"→"preserve": no trigger given; kept "balanced"']);
    const unsupported = parseRunPlan(
      { route_risk: "avoid_elites", changes: [{ field: "route_risk", from: "normal", to: "avoid_elites", trigger: "key_card_or_relic_gained", fact: "got Inflame" }] },
      later(),
      testKnowledge,
      "review",
      previous(),
    );
    expect(unsupported.routeRisk).toBe("normal");
    expect(unsupported.validator[0]).toMatch(/trigger key_card_or_relic_gained is not supported by the facts/);
    // An unknown trigger name is judged by the facts (KQK2 F6): HP 69%→38% supports avoid_elites.
    const unknown = parseRunPlan({ route_risk: "avoid_elites", changes: [{ field: "route_risk", trigger: "vibes" }] }, later(), testKnowledge, "review", previous());
    expect(unknown.routeRisk).toBe("avoid_elites");
    expect(unknown.validator[0]).toMatch(/trigger "vibes" is not listed; read as hp_below_target from the facts/);
    // No fact supports it (HP up to 90%, same belt): rejected.
    const idle = parseRunPlan({ route_risk: "avoid_elites", changes: [{ field: "route_risk", trigger: "vibes" }] }, mapState({ floor: 11, current_hp: 72 }), testKnowledge, "review", previous());
    expect(idle.routeRisk).toBe("normal");
    expect(idle.validator[0]).toMatch(/trigger "vibes" is not one of/);
  });

  it("accepts a supported change, logs it, and applies it from the next decision on (rest heals)", () => {
    const plan = parseRunPlan(
      { hp_policy: "preserve", reserve: ["block"], changes: [
        { field: "hp_policy", from: "balanced", to: "preserve", trigger: "hp_below_target", fact: "HP 69% -> 38%" },
        { field: "reserve", from: [], to: ["block"], trigger: "potion_lost_or_gained", fact: "Fire Potion used" },
      ] },
      later(),
      testKnowledge,
      "hp_drop",
      previous(),
    );
    expect(plan.hpPolicy).toBe("preserve");
    expect(plan.reserve).toEqual(["block"]);
    expect(plan.changes).toEqual([
      { floor: 11, act: 2, version: 2, field: "hp_policy", from: "balanced", to: "preserve", trigger: "hp_below_target", fact: "HP 69%→38% (target 70%)" },
      { floor: 11, act: 2, version: 2, field: "reserve", from: [], to: ["block"], trigger: "potion_lost_or_gained", fact: "potions +[] -[FIRE_POTION]" },
    ]);
    // Jev is told for a few floors after the change.
    expect(intentLines(plan, null, 12)).toContain("strategy changed at F11: hp_policy balanced→preserve because hp_below_target (HP 69%→38% (target 70%))");
    expect(intentLines(plan, null, 16).some((line) => line.startsWith("strategy changed"))).toBe(false);
    // The rest site at 50/80 (not near the boss): smith (6) vs heal (5) before, heal under preserve.
    const rest = (plan: RunPlan | null) => codePick(planRest(env(baseState("REST", { ...restPayload(), run: runPayload({ current_hp: 50 }) }), plan)));
    expect(rest(previous())).toEqual({ action: "choose_rest_option", option_index: 1 });
    expect(rest(plan)).toEqual({ action: "choose_rest_option", option_index: 0 });
  });

  it("rejects a change that points the other way from its trigger", () => {
    const plan = parseRunPlan({ hp_policy: "push", changes: [{ field: "hp_policy", trigger: "hp_below_target" }] }, later(), testKnowledge, "hp_drop", previous());
    expect(plan.hpPolicy).toBe("balanced");
    expect(plan.validator[0]).toMatch(/trigger hp_below_target points the other way/);
  });

  it("rejects a flip-flop: undoing a change of the last 3 floors with the same trigger", () => {
    const changed = parseRunPlan(
      { reserve: ["block"], changes: [{ field: "reserve", trigger: "potion_lost_or_gained", fact: "Fire Potion used" }] },
      later(),
      testKnowledge,
      "hp_drop",
      previous(),
    );
    expect(changed.reserve).toEqual(["block"]);
    // F12: a Block Potion bought, and DeepSeek drops the reserve again for the same reason.
    const block = { ...(runPayload()["potions"] as Raw[])[0]!, potion_id: "BLOCK_POTION", name: "Block Potion" };
    const flip = parseRunPlan({ reserve: [], changes: [{ field: "reserve", trigger: "potion_lost_or_gained" }] }, later({ floor: 12, potions: [block] }), testKnowledge, "review", changed);
    expect(flip.reserve).toEqual(["block"]);
    expect(flip.validator[0]).toMatch(/reverses the F11 change \(potion_lost_or_gained\) with the same trigger/);
    // A new, supported reason may undo it: HP back from 38% to 90%.
    const back = parseRunPlan({ hp_policy: "balanced", changes: [{ field: "hp_policy", trigger: "hp_recovered" }] }, later({ floor: 13, current_hp: 72 }), testKnowledge, "review",
      parseRunPlan({ hp_policy: "preserve", changes: [{ field: "hp_policy", trigger: "hp_below_target" }] }, later(), testKnowledge, "hp_drop", previous()));
    expect(back.hpPolicy).toBe("balanced");
    expect(back.changes.map((change) => `${change.field}:${change.to}:${change.trigger}`)).toEqual(["hp_policy:preserve:hp_below_target", "hp_policy:balanced:hp_recovered"]);
  });

  it("a new act accepts changes under act_changed", () => {
    const plan = parseRunPlan({ route_risk: "avoid_elites" }, mapState({ act_id: "2", floor: 18 }), testKnowledge, "act", previous());
    expect(plan.routeRisk).toBe("avoid_elites");
    expect(plan.changes[0]).toMatchObject({ field: "route_risk", trigger: "act_changed", fact: "act 2→3" });
  });
});

describe("hp_policy, route_risk and avoid carried out", () => {
  it("route_risk avoid_elites: an Elite next node is not offered while another node is", () => {
    const options = (plan: RunPlan | null): string => {
      const decision = planMap(env(mapPayload(), plan));
      return JSON.stringify(decision?.kind === "ask" ? decision.questions : decision);
    };
    expect(options(null)).toMatch(/Elite/);
    expect(options(runPlan({ routeRisk: "avoid_elites" }))).not.toMatch(/"node_type\\?":\\?"Elite/);
  });

  it("hp_policy preserve lowers elites and '?' at low HP on the map", async () => {
    const { mapShift } = await import("../src/strategy/intent.js");
    expect(mapShift(runPlan({ hpPolicy: "preserve" }), "Elite", 0.95)).toBe(-3);
    // By the room's expected HP cost (act 2 by default): '?' 0.4 x 0.22 x 10, a Monster 0.22 x 10 (NJSZ F29).
    expect(mapShift(runPlan({ hpPolicy: "preserve" }), "Unknown", 0.5)).toBe(-0.88);
    expect(mapShift(runPlan({ hpPolicy: "preserve" }), "Monster", 0.5)).toBe(-2.2);
    expect(mapShift(runPlan({ hpPolicy: "preserve" }), "RestSite", 0.6)).toBe(1.5);
    expect(mapShift(runPlan(), "Elite", 0.95)).toBe(0);
  });

  it("an avoided card or role is not offered as a reward", () => {
    const shown = (plan: RunPlan | null): string => JSON.stringify(planReward(env(rewardCardPayload(), plan)));
    expect(shown(null)).toMatch(/Pommel Strike/);
    expect(shown(runPlan({ want: [], avoid: ["POMMEL_STRIKE"] }))).not.toMatch(/Pommel Strike/);
    expect(shown(runPlan({ want: [], avoidRoles: ["strength"] }))).not.toMatch(/Inflame \(/);
  });

  it("hp_policy preserve and preserve_hp change the solver's pick from damage to block", () => {
    const base = (index: number, cardId: string, over: Partial<CardModel>): CardModel => ({
      index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0],
      damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0,
      draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...over,
    });
    const pick = (scale?: { hp: number; damage: number; lasting: number }) =>
      solveTurn({
        hand: [base(0, "STRIKE", { damage: 12 }), base(1, "DEFEND", { type: "Skill", target: "self", validTargets: [], block: 5 })],
        player: { hp: 55, maxHp: 80, block: 0, energy: 1, weak: false, vulnerable: false, intangible: false },
        enemies: [{ index: 0, name: "Worm", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 8, hits: 1 }] }],
        fightKind: "monster",
        ...(scale ? { intentScale: scale } : {}),
      }).plans[0]!.steps.map((step) => step.cardId).join(",");
    expect(pick()).toBe("STRIKE");
    expect(pick(solverScale(null, "preserve", 55 / 80))).toBe("DEFEND");
    expect(pick(solverScale("preserve_hp", "balanced", 55 / 80))).toBe("DEFEND");
    expect(pick(solverScale("kill_fast", "balanced", 55 / 80))).toBe("STRIKE");
    // push is off below 50% HP (its safety limit).
    expect(solverScale(null, "push", 0.4)).toEqual({ hp: 1, damage: 1, lasting: 1 });
  });
});
