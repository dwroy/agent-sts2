/** 6ZGMGEQ5YDVK F37/F39/F45 T1; silent-0467/0468. No mutable knowledge or model calls. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { board } from "./boss-sim-fixture.js";

vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));
type Raw = Record<string, any>;
const rows = JSON.parse(readFileSync(new URL("./silent-enchanted-afterimage-state.json", import.meta.url), "utf8")) as { line: number; state: Raw }[];
const knowledge = makeKnowledge({ cards: [...new Map(rows.flatMap((row) => row.state.run.deck)
  .map((entry: Raw) => [entry.card_id, { id: entry.card_id, type: entry.card_type }])).values()] }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false;
});
afterEach(() => {
  solveTap.onSolve = null;
  setMonsterDbForTests(null);
  rolloutLiveOptions.enabled = oldRollout;
});
function inputFor(line: number): SolverInput {
  const state = parseGameState(structuredClone(rows.find((row) => row.line === line)!.state));
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the frozen board was not solved");
  return input;
}
function steps(input: SolverInput, ids: string[]) {
  return ids.map((id) => {
    const card = input.hand.find((entry) => entry.cardId === id)!;
    return { cardIndex: card.index, cardId: id, name: card.name, upgraded: card.upgraded,
      target: card.target === "single" ? card.validTargets[0] : null };
  });
}

it.each([398960, 399084, 399207])("s%s: the live input gives ten immediate Block, not seven or eleven", (line) => {
  const input = inputFor(line);
  expect(input.player.permafrostBlock).toBe(7);
  expect(replaySteps(input, steps(input, ["AFTERIMAGE"]))!.outcome).toMatchObject({ blockGained: 10, permafrostBlockLeft: 0 });
});

it("F39 and held-out F45 full prefixes retain the measured twelve and twenty Block", () => {
  for (const [line, ids, blockGained] of [
    [399084, ["AFTERIMAGE", "FOOTWORK", "POISONED_STAB"], 12],
    [399207, ["AFTERIMAGE", "STRIKE_SILENT", "DEFLECT", "POISONED_STAB"], 20],
  ] as const) {
    const input = inputFor(line);
    expect(replaySteps(input, steps(input, [...ids]))!.outcome.blockGained).toBe(blockGained);
  }
});

it("unplayed Afterimage does not add Block and an ordinary template keeps the old seven", () => {
  const input = inputFor(399207);
  expect(replaySteps(input, [])!.outcome.blockGained).toBe(0);
  const raw = structuredClone(rows[0]!.state.combat.hand[0]);
  raw.resolved_rules_text = "固有。 你每打出一张牌，都获得1点格挡。";
  input.hand = [modelHandCard(raw, 0, knowledge, "silent", 10)];
  expect(replaySteps(input, steps(input, ["AFTERIMAGE"]))!.outcome.blockGained).toBe(7);
});

it("other roles, levels, amounts and explicit Block variables keep their prior models", () => {
  const raw = rows[0]!.state.combat.hand[0];
  for (const [role, asc] of [["ironclad", 10], ["silent", 11], ["silent", null]] as const) {
    const model = modelHandCard(raw, 0, knowledge, role, asc);
    expect(model.afterimageEnchantBlock).toBeUndefined();
    expect(model.block).toBe(0);
  }
  const modified = structuredClone(raw);
  modified.resolved_rules_text = modified.resolved_rules_text.replace("3点", "4点");
  expect(modelHandCard(modified, 0, knowledge, "silent", 10).afterimageEnchantBlock).toBeUndefined();
  const explicit = structuredClone(raw);
  explicit.dynamic_values.push({ name: "Block", base_value: 3, current_value: 3, enchanted_value: 3 });
  const model = modelHandCard(explicit, 0, knowledge, "silent", 10);
  expect(model.block).toBe(3);
  expect(model.afterimageEnchantBlock).toBeUndefined();
});

it("unobserved modifiers, missing trigger and replays keep the old Block and expose uncertainty", () => {
  const original = inputFor(399207);
  const originalImage = original.hand.find((entry) => entry.cardId === "AFTERIMAGE")!;
  for (const changed of [
    { player: { frail: true } }, { player: { dexterityNow: 2 } },
    { player: { shadowmeldActive: true } }, { player: { unmovableArmed: true } },
    { player: { permafrostBlock: 0 } }, { replay: 1 },
  ]) {
    const input = structuredClone(original);
    input.player = { ...input.player, ...changed.player };
    input.hand = [{ ...originalImage, ...(changed.replay ? { replay: changed.replay } : {}) }];
    const outcome = replaySteps(input, steps(input, ["AFTERIMAGE"]))!.outcome;
    expect(outcome.blockGained).toBe(changed.player?.permafrostBlock === 0 ? 0 : changed.replay ? 8 : 7);
    expect(outcome.unknownCards).toContain("余像+（附魔格挡交互未验证）");
  }
});

it("the later-turn rollout uses the same guarded effect without renewing Permafrost", () => {
  const live = inputFor(399207);
  const image = live.hand.find((entry) => entry.cardId === "AFTERIMAGE")!;
  const input = board({ bossHp: 500 });
  input.solver.hand = [];
  input.solver.player.permafrostBlock = 7;
  const plan = replaySteps(input.solver, [])!;
  input.plans = [plan]; input.options = { handSize: 1 };
  input.piles = { handBase: [], draw: [image], discard: [] };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 20, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const records = simulateFight(input, plan, 3, 1, false).records;
  expect(records[0]!.snap.blk).toBe(0);
  expect(records[1]!.snap.blk).toBe(10);
  expect(records[2]!.snap.blk).toBe(0);
});
