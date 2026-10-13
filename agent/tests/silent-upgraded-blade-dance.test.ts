/** C48LLXBGKXQ9 A0 F12 T5 / 4ATPGGUBWG8L A10 F28 T3; ledger silent-0450. */
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-upgraded-blade-dance-evidence.json" with { type: "json" };
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory } from "../src/memory/types.js";
import { applyUpgrade, modelHandCard } from "../src/reflex/card-model.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, traceSteps, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { card } from "./boss-sim-fixture.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed upgraded Blade Dance evidence only"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: evidence.cards.map((entry) => ({
  id: entry.card_id, type: entry.card_type, name: entry.name, cost: entry.energy_cost,
  description: entry.resolved_rules_text, description_raw: entry.rules_text,
  vars: entry.dynamic_values, keywords: /消耗/.test(entry.resolved_rules_text) ? ["Exhaust"] : [],
})), monsters: [{ id: "HUNTER_KILLER", type: "Monster" }] }, "cache");
const frame = (line: number) => evidence.frames.find((entry) => entry.line === line)!;
const rawDance = frame(379482).combat.hand.find((entry) => entry.card_id === "BLADE_DANCE")!;
const step = (cardIndex: number, cardId: string, upgraded = false, target: number | null = null): Step => ({
  cardIndex, cardId, name: cardId, upgraded, target, targetName: null,
});

beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false;
});
afterEach(() => {
  solveTap.onSolve = null;
  rolloutLiveOptions.enabled = true;
  setMonsterDbForTests(null);
});

// Only the immediate generation is compared; this synthetic enemy supplies no fight forecast.
function inputAt(line: number): SolverInput {
  const raw = frame(line);
  return {
    hand: raw.combat.hand.map((entry) => modelHandCard(entry, entry.index, knowledge, "silent", raw.run.ascension)),
    player: { hp: raw.combat.player.current_hp, maxHp: raw.combat.player.max_hp, block: 0,
      energy: raw.combat.player.energy, weak: false, vulnerable: false, intangible: false },
    enemies: [{ index: 0, name: "Fixed target", hp: 100, maxHp: 100, block: 0,
      vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] }],
    fightKind: "monster", turn: raw.turn,
  };
}

it("recognizes the observed A0/A10 four-Shiv previews without fake draws", () => {
  for (const ascension of [0, 10]) {
    const dance = modelHandCard(rawDance, 0, knowledge, "silent", ascension);
    expect(dance).toMatchObject({ draw: 0, known: true, cost: 1, exhausts: true });
    expect(dance.adds?.map((entry) => [entry.cardId, entry.cost, entry.damageBase]))
      .toEqual(Array.from({ length: 4 }, () => ["SHIV", 0, 4]));
  }
});

it("reproduces both consecutive A0 casts, preserving the old hand and paying once each", () => {
  const input = inputAt(209437);
  const trace = traceSteps(input, [step(1, "BLADE_DANCE", true), step(2, "BLADE_DANCE", true)]);
  expect(trace.complete).toBe(true);
  for (const [i, line] of [209438, 209439].entries()) {
    const after = trace.transitions[i]!.after;
    expect(after.hand.slice().sort()).toEqual(frame(line).combat.hand.map((entry) => entry.card_id).sort());
    expect(after).toMatchObject({ energy: frame(line).combat.player.energy, drawn: 0, drawBudget: 0,
      unknownHand: 0, pendingSelection: false, damage: 0 });
    expect(trace.transitions[i]!.leavesPool).toBe("exhaust");
  }
  const shivs = Array.from({ length: 8 }, (_, i) => step(4_000_000 + i, "SHIV", false, 0));
  const prefix = [step(1, "BLADE_DANCE", true), step(2, "BLADE_DANCE", true)];
  expect(replaySteps(input, [...prefix, ...shivs])!.outcome.damageDealt).toBe(32);
  expect(replaySteps(input, [...prefix, ...shivs, shivs[0]!])).toBeNull();
});

it("the real A10 planner and trace consumer replace unknown draws with four known cards", () => {
  const state = parseGameState(evidence.live_state);
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  planCombatTurn({ state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] });
  expect(input).toBeDefined();
  const trace = traceSteps(input!, [step(1, "DAGGER_SPRAY", true), step(0, "BLADE_DANCE", true)]);
  expect(trace.complete).toBe(true);
  expect(trace.transitions[1]!.after).toMatchObject({ drawn: 0, drawBudget: 0, unknownHand: 0, energy: 1 });
  expect(trace.transitions[1]!.after.hand.slice().sort())
    .toEqual(["ECHOING_SLASH", "RICOCHET", "SHIV", "SHIV", "SHIV", "SHIV"].sort());
});

it("generation uses the existing hand capacity and leaves a known draw untouched", () => {
  const input = inputAt(379482);
  input.hand = [input.hand[0]!, ...Array.from({ length: 8 }, (_, i) => card(20 + i, `HELD${i}`, { playable: false, type: "Curse" }))];
  input.player.handLimit = 10;
  input.player.noDraw = true;
  input.knownTop = [card(40, "SENTINEL", { damage: 99 })];
  const prefix = [step(0, "BLADE_DANCE", true)];
  expect(traceSteps(input, prefix).transitions[0]!.after.hand.filter((id) => id === "SHIV")).toHaveLength(2);
  expect(replaySteps(input, [...prefix, step(4_000_002, "SHIV", false, 0)])).toBeNull();
  expect(replaySteps(input, [...prefix, step(40, "SENTINEL", false, 0)])).toBeNull();
});

it("missing data, duplication and an in-line upgrade cannot certify generated successors", () => {
  const missing = makeKnowledge({ cards: [{ id: "BLADE_DANCE", type: "Skill" }] }, "cache");
  expect(modelHandCard(rawDance, 0, missing, "silent", 10)).toMatchObject({ draw: 0, known: false });
  const input = inputAt(379482);
  input.player.duplicateSkills = 1;
  expect(traceSteps(input, [step(0, "BLADE_DANCE", true)]).transitions[0]!.after.pendingSelection).toBe(true);
  expect(replaySteps(input, [step(0, "BLADE_DANCE", true), step(4_000_000, "SHIV", false, 0)])).toBeNull();
  const plainRaw = { ...rawDance, upgraded: false, resolved_rules_text: "添加3张小刀到你的手牌。 消耗。",
    dynamic_values: [{ name: "Cards", base_value: 3, current_value: 3, enchanted_value: 3 }] };
  input.player.duplicateSkills = 0;
  input.hand = [applyUpgrade(modelHandCard(plainRaw, 0, knowledge, "silent", 10), { draw: 1 })];
  expect(traceSteps(input, [step(0, "BLADE_DANCE", true)]).transitions[0]!.after.pendingSelection).toBe(true);
});

it("other roles, levels, costs, counts and altered text retain the previous model", () => {
  for (const [character, ascension, raw] of [
    ["ironclad", 10, rawDance], ["", 10, rawDance], ["silent", null, rawDance], ["silent", 9, rawDance], ["silent", 11, rawDance],
    ["silent", 10, { ...rawDance, energy_cost: 0 }], ["silent", 10, { ...rawDance, rules_text: "UNOBSERVED" }],
    ["silent", 10, { ...rawDance, resolved_rules_text: "添加4张小刀到你的手牌。 重放。" }],
    ["silent", 10, { ...rawDance, dynamic_values: [{ name: "Cards", base_value: 5, current_value: 5, enchanted_value: 5 }] }],
  ] as const) {
    const model = modelHandCard(raw, 0, knowledge, character, ascension);
    expect(model.draw).toBe(raw.dynamic_values[0]!.current_value);
    expect(model.adds).toBeUndefined();
  }
});
