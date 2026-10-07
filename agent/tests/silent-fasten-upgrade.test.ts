/** VLZ6CCT8AQ0A A10 F43 T1/T2/T4: upgraded Fasten, independent of Apotheosis propagation. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-fasten-upgrade-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard, offHandCardModel } from "../src/reflex/card-model.js";
import { deckModels } from "../src/reflex/rollout-live.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card } from "./boss-sim-fixture.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed upgrade references"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [
  { id: "FASTEN", type: "Power", target: "Self" }, { id: "DEFEND_SILENT", type: "Skill" },
] }, "cache");
const fasten = () => modelHandCard({ ...evidence.fasten, index: 0 }, 0, knowledge, "silent", 10);
const defend = (index: number) => card(index, "DEFEND_SILENT", {
  type: "Skill", target: "self", validTargets: [], block: 8, blockBase: 8, upgraded: true,
});
const step = (cardIndex: number, cardId: string) => ({ cardIndex, cardId, name: cardId, upgraded: true });

it("uses the observed six-point establishment, including the hand-to-pile model", () => {
  expect(evidence.power_after.find((power) => power.power_id === "FASTEN_POWER")?.amount).toBe(6);
  expect(fasten().fasten).toBe(6);
  expect(offHandCardModel(evidence.fasten, "FASTEN", true, 0, knowledge, null, 0, "silent", 10).fasten).toBe(6);
});

it("propagates the actual level through deckModels for later-turn and boss simulation inputs", () => {
  const state = parseGameState({ state_version: 16, run_id: evidence.run, screen: "MAP", in_combat: false,
    session: { mode: "singleplayer", phase: "run" }, available_actions: [], combat: null,
    run: { character_id: "SILENT", ascension: 10, floor: 43, deck: [evidence.fasten] } });
  expect(deckModels(state, knowledge)[0]?.fasten).toBe(6);
  const other = parseGameState({ ...state.raw, run: { ...state.run?.raw, ascension: 9 } });
  expect(deckModels(other, knowledge)[0]?.fasten).toBeUndefined();
});

it("adds six only to Defends played after it, without changing another block skill", () => {
  const input = board().solver;
  input.player.energy = 4;
  input.hand = [defend(0), { ...fasten(), index: 1, key: "c1" }, defend(2),
    card(3, "TEST_BLOCK_SKILL", { type: "Skill", target: "self", block: 8 })];
  expect(replaySteps(input, input.hand.map((entry) => step(entry.index, entry.cardId)))!.outcome.blockGained).toBe(30);
});

it("keeps T2/T4's already displayed 14/18 block instead of counting the established six twice", () => {
  for (const [raw, expected] of [[evidence.defend14, 14], [evidence.defend18, 18]] as const) {
    const input = board().solver;
    input.hand = [modelHandCard({ ...raw, index: 0 }, 0, knowledge, "silent", 10)];
    expect(replaySteps(input, [step(0, "DEFEND_SILENT")])!.outcome.blockGained).toBe(expected);
  }
});

it("persists the newly established six into later draws while leaving the input state unchanged", () => {
  const input = board();
  input.solver.hand = [fasten(), defend(1)];
  input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 6 }, (_, i) => defend(i + 10)), discard: [] };
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 40, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  const before = JSON.stringify(input);
  const plan = replaySteps(input.solver, [step(0, "FASTEN"), step(1, "DEFEND_SILENT")])!;
  expect(plan.outcome.blockGained).toBe(14);
  const records = simulateFight(input, plan, 2, 1, false).records;
  expect(records[0]!.snap.pw.FASTEN_POWER).toBe(6);
  expect(records[1]!.snap.pw.FASTEN_POWER).toBe(6);
  expect(records[1]!.loss).toBe(0);
  expect(JSON.stringify(input)).toBe(before);
});

it("preserves plain four and every unobserved level, character and upgraded value", () => {
  const plain = { ...evidence.fasten, upgraded: false,
    dynamic_values: [{ name: "ExtraBlock", base_value: 4, current_value: 4, enchanted_value: 4 }] };
  for (const asc of [null, 0, 7, 9, 10, 11]) {
    expect(modelHandCard(plain, 0, knowledge, "silent", asc).fasten).toBe(4);
    if (asc !== 10) expect(modelHandCard(evidence.fasten, 0, knowledge, "silent", asc).fasten).toBeUndefined();
  }
  for (const character of ["ironclad", "", "necrobinder"]) {
    expect(modelHandCard(evidence.fasten, 0, knowledge, character, 10).fasten).toBeUndefined();
  }
  for (const value of [4, 5, 7]) {
    const other = { ...evidence.fasten,
      dynamic_values: [{ name: "ExtraBlock", base_value: value, current_value: value, enchanted_value: value }] };
    expect(modelHandCard(other, 0, knowledge, "silent", 10).fasten).toBeUndefined();
  }
});
