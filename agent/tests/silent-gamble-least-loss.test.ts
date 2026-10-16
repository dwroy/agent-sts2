/** L704TLETMZBM F48 T6 / Y5H4CFAQ2WTG F33 T10, silent-0300. */
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-gamble-least-loss-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { setMoveModelForTests } from "../src/knowledge/move-model.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { leastLossPlan, planCombatTurn } from "../src/reflex/combat-plan.js";
import { replaySteps, solveTap, solveTurn, type SolverInput } from "../src/reflex/turn-solver.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Gamble evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

function captured(line: keyof typeof evidence, change?: (raw: any) => void) {
  const raw = structuredClone(evidence[line].state);
  change?.(raw);
  const state = parseGameState(raw);
  const knowledge = makeKnowledge({ cards: raw.run.deck.map((card) => ({ id: card.card_id, type: card.card_type })) }, "cache");
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input = value; };
  try {
    const decision = planCombatTurn(env);
    expect(input).toBeDefined();
    return { decision, input: input! };
  } finally { solveTap.onSolve = null; }
}

beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  setMoveModelForTests({});
});
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); setMoveModelForTests(null); });

it.each(["256462", "301114"] as const)("uses the zero-energy redraw in captured state %s instead of ending", (line) => {
  const { decision, input } = captured(line);
  const gamble = input.hand.find((card) => card.cardId === "CALCULATED_GAMBLE")!;
  expect(input.player.energy).toBe(0);
  expect(decision).toMatchObject({ kind: "act", label: "combat/least-loss", intent: { action: "play_card", card_index: gamble.index } });
  const picked = leastLossPlan(solveTurn(input).plans, input.hand, input.player.hp, input);
  expect(picked.steps.map((step) => step.cardId)).toEqual(["CALCULATED_GAMBLE"]);
  expect(picked.outcome.cardsDrawn).toBe(line === "256462" ? 1 : 2);
});

it("pays the Sandpit deadline before discarding and then re-plans from the captured post-Escape hand", () => {
  const first = captured("301111");
  const picked = leastLossPlan(solveTurn(first.input).plans, first.input.hand, 1, first.input);
  expect(picked.steps[0]!.cardId).toBe("FRANTIC_ESCAPE");
  expect(picked.steps.at(-1)!.cardId).toBe("CALCULATED_GAMBLE");
  expect(picked.outcome.sandpitAfter).toBeGreaterThan(0);
  expect(replaySteps(first.input, picked.steps)).not.toBeNull();
  const after = captured("301112");
  expect(after.decision).toMatchObject({ kind: "act", intent: { action: "play_card",
    card_index: after.input.hand.find((card) => card.cardId === "CALCULATED_GAMBLE")!.index } });
});

it("does not call empty-hand, No Draw, or upgraded Gamble an observed redraw", () => {
  const { input } = captured("256462");
  const gamble = input.hand.find((card) => card.cardId === "CALCULATED_GAMBLE")!;
  for (const changed of [
    { ...input, hand: [gamble] },
    { ...input, player: { ...input.player, noDraw: true } },
    { ...input, hand: input.hand.map((card) => card === gamble ? { ...card, upgraded: true } : card) },
  ]) {
    const plans = solveTurn(changed).plans;
    expect(leastLossPlan(plans, changed.hand, changed.player.hp, changed)).toEqual(leastLossPlan(plans, changed.hand, changed.player.hp));
  }
});

it.each([["IRONCLAD", 10], ["SILENT", 9], ["SILENT", 11]])("keeps %s A%i outside the production opt-in", (character, ascension) => {
  const { decision, input } = captured("256462", (raw) => { raw.run.character_id = character; raw.run.ascension = ascension; });
  const baseline = leastLossPlan(solveTurn(input).plans, input.hand, input.player.hp);
  expect(decision).toMatchObject({ kind: "act", intent: baseline.steps.length > 0
    ? { action: "play_card", card_index: baseline.steps[0]!.cardIndex } : { action: "end_turn" } });
});
