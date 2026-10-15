/** 2E4UQ1BZTQWB A10 F22 T2 / REEBQHPHSWGK A10 F45 T6; silent-0461. */
import { resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import evidence from "./silent-cloak-generation-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps, solveTurn, traceSteps, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { card } from "./boss-sim-fixture.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { loadConfig } from "../src/core/config.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Cloak evidence only"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const frame = (line: number) => evidence.find((entry) => entry.line === line)!;
const rawCloak = frame(406968).combat.hand.find((entry) => entry.card_id === "CLOAK_AND_DAGGER")!;
const rawShiv = frame(407720).combat.hand.find((entry) => entry.card_id === "SHIV")!;
const knowledge = makeKnowledge({ cards: [rawCloak, rawShiv].map((entry) => ({
  id: entry.card_id, name: entry.name, type: entry.card_id === "SHIV" ? "Attack" : "Skill",
  cost: entry.energy_cost, description: entry.resolved_rules_text, description_raw: entry.rules_text,
  vars: entry.dynamic_values, keywords: entry.card_id === "SHIV" ? ["Exhaust"] : [],
})) }, "cache");
const step = (cardIndex: number, cardId: string, target: number | null = null): Step => ({
  cardIndex, cardId, name: cardId, upgraded: false, target,
});
function inputAt(line: number): SolverInput {
  const f = frame(line);
  // Isolate the observed hand/payment/Block transition from other combat powers and enemy actions.
  return {
    hand: f.combat.hand.map((entry) => modelHandCard(entry, entry.index, knowledge, "silent", 10)),
    player: { hp: f.combat.player.current_hp, maxHp: 70, block: f.combat.player.block,
      energy: f.combat.player.energy, weak: false, vulnerable: false, intangible: false,
      strengthNow: f.combat.player.powers.find((entry) => entry.power_id === "STRENGTH_POWER")?.amount ?? 0 },
    enemies: [{ index: 0, name: "Fixed target", hp: 100, maxHp: 100, block: 0,
      vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] }],
    fightKind: "monster", turn: f.state.turn,
  };
}
afterEach(() => { rolloutLiveOptions.enabled = true; });

it.each([[406968, 406969], [407719, 407720]])("s%i to s%i preserves the old hand and adds exactly one Shiv", (before, after) => {
  const input = inputAt(before!);
  const cloak = input.hand.find((entry) => entry.cardId === "CLOAK_AND_DAGGER")!;
  expect(cloak).toMatchObject({ draw: 0, known: true, cost: 1, block: 6, cloakAndDagger: true });
  expect(cloak.adds?.map((entry) => [entry.cardId, entry.cost, entry.damageBase, entry.exhausts]))
    .toEqual([["SHIV", 0, 4, true]]);
  const trace = traceSteps(input, [step(cloak.index, cloak.cardId)]);
  expect(trace.complete).toBe(true);
  const actual = frame(after!).combat;
  expect(trace.transitions[0]!.after).toMatchObject({
    energy: actual.player.energy, block: actual.player.block, drawn: 0, drawBudget: 0,
    unknownHand: 0, pendingSelection: false,
  });
  expect(trace.transitions[0]!.after.hand.slice().sort()).toEqual(actual.hand.map((entry) => entry.card_id).sort());
});

it("a made Shiv leaves the known top for the next real draw", () => {
  const input = inputAt(406968);
  input.hand = [input.hand[0]!, card(8, "FIXED_DRAW", { type: "Skill", target: "self", draw: 1, cost: 0 })];
  const top = card(40, "DAGGER_SPRAY", { damage: 0, cost: 0 });
  input.knownTop = [top];
  const first = step(0, "CLOAK_AND_DAGGER");
  expect(replaySteps(input, [first, step(40, "DAGGER_SPRAY", 0)])).toBeNull();
  const trace = traceSteps(input, [first, step(5_000_000, "SHIV", 0), step(8, "FIXED_DRAW")]);
  expect(trace.complete).toBe(true);
  expect(trace.transitions[0]!.after.hand).not.toContain("DAGGER_SPRAY");
  expect(trace.transitions[1]!.after).toMatchObject({ damage: 4, drawBudget: 0 });
  expect(trace.transitions[2]!.after).toMatchObject({ drawn: 1, drawBudget: 1 });
  expect(trace.transitions[2]!.after.hand).toContain("DAGGER_SPRAY");
});

it("fresh identities and current strength reproduce playable successors without sharing a Shiv", () => {
  const input = inputAt(407719);
  input.hand = [modelHandCard(rawCloak, 0, knowledge, "silent", 10), modelHandCard({ ...rawCloak, index: 8 }, 8, knowledge, "silent", 10)];
  input.player.energy = 2;
  const prefix = [step(0, "CLOAK_AND_DAGGER"), step(8, "CLOAK_AND_DAGGER")];
  const shiv = step(5_000_000, "SHIV", 0);
  expect(replaySteps(input, [...prefix, shiv, step(5_000_001, "SHIV", 0)])!.outcome)
    .toMatchObject({ cardsDrawn: 0, blockGained: 12, damageDealt: 20 });
  expect(replaySteps(input, [...prefix, shiv, shiv])).toBeNull();
  for (const plan of solveTurn(input).plans) expect(replaySteps(input, plan.steps)?.outcome).toEqual(plan.outcome);
});

it("missing metadata, repetition, upgrades and overflow cannot certify a generated continuation", () => {
  const missing = makeKnowledge({ cards: [{ id: "CLOAK_AND_DAGGER", type: "Skill" }] }, "cache");
  expect(modelHandCard(rawCloak, 0, missing, "silent", 10)).toMatchObject({ draw: 0, known: false });
  for (const change of ["missing", "repeat", "upgrade", "transform", "overflow"]) {
    const input = inputAt(406968);
    input.hand = [input.hand[0]!];
    if (change === "missing") input.hand[0]!.adds = undefined;
    if (change === "repeat") input.player.duplicateSkills = 1;
    if (change === "upgrade") input.hand[0]!.upgraded = true;
    if (change === "transform") input.hand[0]!.cardId = "UNOBSERVED";
    if (change === "overflow") input.player.handLimit = 0;
    const first = { ...step(0, input.hand[0]!.cardId), upgraded: change === "upgrade" };
    const trace = traceSteps(input, [first]);
    expect(trace.complete).toBe(true);
    expect(trace.transitions[0]!.after).toMatchObject({ drawn: 0, pendingSelection: true });
    expect(trace.plan!.outcome.unknownCards.join(" ")).toContain("生成未验证");
    expect(replaySteps(input, [first, step(5_000_000, "SHIV", 0)])).toBeNull();
  }
});

it("unobserved roles, ascensions and previews preserve the previous model", () => {
  for (const [character, ascension, raw] of [
    ["ironclad", 10, rawCloak], ["", 10, rawCloak], ["silent", null, rawCloak], ["silent", 11, rawCloak],
    ["silent", 10, { ...rawCloak, upgraded: true }], ["silent", 10, { ...rawCloak, energy_cost: 0 }],
    ["silent", 10, { ...rawCloak, resolved_rules_text: "UNOBSERVED" }],
    ["silent", 10, { ...rawCloak, enchantment: { id: "UNOBSERVED" } }],
  ] as const) {
    expect(modelHandCard(raw, 0, knowledge, character, ascension)).toMatchObject({ draw: 1 });
    expect(modelHandCard(raw, 0, knowledge, character, ascension).adds).toBeUndefined();
  }
});

it("the live memo refreshes after the real cast before sending synthetic successor indices", () => {
  rolloutLiveOptions.enabled = false;
  const f = frame(406968);
  const state = parseGameState({ ...f.state, state_version: 1, combat: f.combat,
    run: { ...f.run, deck: [], relics: [], potions: [] } });
  const screenMemory = createScreenMemory("COMBAT");
  screenMemory.combatPlan = { turn: f.state.turn, via: "jev", handLen: f.combat.hand.length,
    expectedHand: f.combat.hand.map((entry) => entry.card_id).sort().join(","),
    remaining: [step(0, "CLOAK_AND_DAGGER"), step(5_000_000, "SHIV", 0)] };
  const env = { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto" as const, characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory, shopDiscardPotions: [] };
  expect(planCombatTurn(env)).toMatchObject({ kind: "act", label: "combat/plan-continue",
    intent: { action: "play_card", card_index: 0 } });
  expect(screenMemory.combatPlan).toBeNull();
});
