/** SADL3CGYTGSR A7 F48 attempt 4 T4 / 0NZXA12NLDMH A10 F33 attempt 6 T8, silent-0179/0180. */
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { paelsLegionPreview, planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { card } from "./boss-sim-fixture.js";
import evidence from "./silent-paels-legion-evidence.json";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Legion evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [
  { id: "DEFEND_SILENT", type: "Skill" }, { id: "NEUTRALIZE", type: "Attack" },
  { id: "STRIKE_SILENT", type: "Attack" }, { id: "MIRAGE", type: "Skill" }, { id: "PRODUCTION", type: "Curse" },
] }, "cache");
const originalRollout = rolloutLiveOptions.enabled;
beforeEach(() => { rolloutLiveOptions.enabled = false; });
afterEach(() => { rolloutLiveOptions.enabled = originalRollout; solveTap.onSolve = null; });

function observedInput(key: keyof typeof evidence, character = "SILENT", held = true): SolverInput {
  const raw = structuredClone(evidence[key].state);
  raw.run.character_id = character;
  if (!held) raw.run.relics = [];
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the observed board was not solved");
  return input;
}

function steps(input: SolverInput, indices: number[], target: number) {
  return indices.map((index) => {
    const card = input.hand.find((entry) => entry.index === index)!;
    return { cardIndex: index, cardId: card.cardId, name: card.name, upgraded: card.upgraded,
      ...(card.target === "single" ? { target } : {}) };
  });
}

it("A10 F33 T8: the complete observed line gains sixteen plus eight Block and loses six HP", () => {
  const input = observedInput("a10-start");
  const plays = steps(input, [0, 1, 2, 4], 1);
  expect(input.player.paelsLegionPreview).toBe(true);
  expect(replaySteps(input, plays)!.outcome).toMatchObject({ blockGained: 24, hpLoss: 6, hpAfter: 0, dies: true, unknownCards: [] });
  const dry = { ...input, player: { ...input.player, unmovableArmed: false, paelsLegionPreview: false } };
  expect(replaySteps(dry, plays)!.outcome).toMatchObject({ blockGained: 32, hpLoss: 0 });
});

it("A7 F48 T4: Strike before two Defends gains ten plus five Block, not twenty", () => {
  const input = observedInput("a7-start");
  expect(replaySteps(input, steps(input, [1, 2, 3], 0))!.outcome.blockGained).toBe(15);
});

it("after the first Block, stack two and plain previews prevent a second consumption on re-planning", () => {
  for (const [key, index, block] of [["a10-after-first", 1, 8], ["a7-after-first", 1, 5]] as const) {
    const input = observedInput(key);
    expect(input.player.paelsLegionPreview).toBeUndefined();
    expect(replaySteps(input, steps(input, [index], 0))!.outcome.blockGained).toBe(block);
  }
});

it("Ironclad and relic-free inputs retain their previous displayed-Block behavior", () => {
  for (const [character, held] of [["IRONCLAD", true], ["SILENT", false]] as const) {
    const input = observedInput("a7-start", character, held);
    expect(input.player.paelsLegionPreview).toBeUndefined();
    expect(replaySteps(input, steps(input, [2, 3], 0))!.outcome.blockGained).toBe(20);
  }
});

it("does not arm guessed dormant, Frail, stacking, upgraded or different-Dexterity previews", () => {
  const base = structuredClone(evidence["a10-start"].state);
  const test = (raw: typeof base) => paelsLegionPreview(raw.run, raw.combat);
  expect(test(base)).toBe(true);
  const dormant = structuredClone(base);
  dormant.run.relics[0]!.stack = 2;
  expect(test(dormant)).toBe(false);
  for (const power_id of ["FRAIL_POWER", "SHADOWMELD_POWER", "UNMOVABLE_POWER"]) {
    const raw = structuredClone(base);
    raw.combat.player.powers.push({ power_id, amount: 1 } as typeof raw.combat.player.powers[number]);
    expect(test(raw)).toBe(false);
  }
  const upgraded = structuredClone(base);
  for (const card of upgraded.combat.hand) if (card.card_id === "DEFEND_SILENT") card.upgraded = true;
  expect(test(upgraded)).toBe(false);
  const dex = structuredClone(base);
  dex.combat.player.powers.find((power) => power.power_id === "DEXTERITY_POWER")!.amount = 2;
  expect(test(dex)).toBe(false);
});

it("new Dexterity within a line is explicitly unverified instead of extending the observed preview rule", () => {
  const input = observedInput("a7-start");
  input.hand.push(card(99, "NEW_DEXTERITY", { type: "Power", target: "self", validTargets: [], cost: 0, dexterity: 2 }));
  expect(replaySteps(input, steps(input, [99, 2, 3], 0))!.outcome.unknownCards)
    .toContain("佩尔的士兵（方案内新增敏捷组合未验证）");
});
