/** U1QYLX1AE1WX SILENT A10 F46 T4, silent-0394/0396: fixed raw-card and turn projections. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { deckDrawPool, pileEntries, planCombatTurn } from "../src/reflex/combat-plan.js";
import { deckModels, rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { board } from "./boss-sim-fixture.js";
import { combatPayload } from "./scenarios.js";

vi.hoisted(() => vi.resetModules());
// No generated knowledge or live data may affect this fixed regression.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Sapping evidence only"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

const fixture = JSON.parse(readFileSync(new URL("./silent-sapping-card.json", import.meta.url), "utf8"));
// A generic id-level type cannot identify which custom template was created.
const knowledge = makeKnowledge({ cards: [{ id: "MAD_SCIENCE", type: "Power" }, { id: "DEFEND_SILENT", type: "Skill" }] }, "cache");
const science = () => modelHandCard(fixture.card, 6, knowledge, "SILENT", 10);
const originalRollout = rolloutLiveOptions.enabled;
afterEach(() => { solveTap.onSolve = null; rolloutLiveOptions.enabled = originalRollout; });

it("reads the played attack and its two debuffs without dormant Block or other riders", () => {
  expect(science()).toMatchObject({ type: "Attack", damage: 12, damageBase: 12, hits: 1,
    block: 0, weak: 2, vulnerable: 2, weakFirst: true, strength: 0, draw: 0, energyGain: 0, flatValue: 0 });
  expect(science().blockBase).toBeUndefined();
  expect(science().dexterity).toBeUndefined();
});

it("replays the two Defends then Science: 16 Block and 16 HP lost, not the logged 27 and 5", () => {
  const input = board().solver;
  Object.assign(input.player, { hp: 27, maxHp: 90, energy: 3, block: 0, dexterityNow: 3, endTurnBlock: 1 });
  input.enemies = [{ index: 0, name: fixture.enemy.name, hp: 232, maxHp: fixture.enemy.max_hp,
    block: 15, weak: 3, vulnerable: 0, artifact: 0, intangible: false, attacks: [{ damage: 33, hits: 1 }] }];
  input.hand = [...fixture.defends.map((raw: unknown, i: number) => modelHandCard(raw, i, knowledge, "SILENT", 10)), science()];
  // The actual line left the third Defend unplayed with only three energy after Footwork.
  const played = [input.hand[0]!, input.hand[1]!, input.hand.at(-1)!];
  const plan = replaySteps(input, played.map((card) => ({ cardIndex: card.index, cardId: card.cardId,
    name: card.name, upgraded: card.upgraded, target: card.target === "single" ? 0 : null, targetName: null })))!;
  expect(plan).not.toBeNull();
  expect(plan.outcome.blockGained).toBe(16);
  expect(plan.outcome.hpLoss).toBe(16);
  expect(plan.outcome.weakApplied).toBe(2);
  expect(plan.outcome.vulnerableApplied).toBe(2);
  expect(plan.outcome.damageDealt).toBe(0);
});

it("preserves other characters, ascensions, upgrades, unresolved templates and the unplayed copy", () => {
  for (const [character, asc] of [["IRONCLAD", 10], ["REGENT", 10], ["", 10], ["SILENT", 9], ["SILENT", 11], ["SILENT", null]] as const) {
    expect(modelHandCard(fixture.card, 6, knowledge, character, asc)).toMatchObject({ block: 11, blockBase: 8, weak: 0, vulnerable: 0, type: "Power" });
  }
  for (const raw of [fixture.unplayedCopy, { ...fixture.card, upgraded: true },
    { ...fixture.card, resolved_rules_text: "" }, { ...fixture.card, resolved_rules_text: "获得8点格挡。 抽3张牌。" },
    { ...fixture.card, target_type: "AllEnemies" },
    { ...fixture.card, dynamic_values: fixture.card.dynamic_values.filter((v: { name: string }) => v.name !== "SappingWeak") }]) {
    expect(modelHandCard(raw, 6, knowledge, "SILENT", 10)).toMatchObject({ block: 11, weak: 0, vulnerable: 0 });
  }
});

it("propagates the same scoped model through the production hand, deck and visible piles", () => {
  const raw = combatPayload();
  Object.assign(raw["run"] as Record<string, unknown>, { character_id: "SILENT", ascension: 10, deck: [fixture.deckCard], relics: [], potions: [] });
  (raw["combat"] as Record<string, unknown>)["hand"] = [fixture.card];
  raw["agent_view"] = { combat: { draw: [{ card_ids: ["MAD_SCIENCE"], line: "疯狂科学 [1费]" }] } };
  const state = parseGameState(raw);
  let input: SolverInput | undefined;
  rolloutLiveOptions.enabled = false;
  solveTap.onSolve = (value) => { input ??= value; };
  planCombatTurn({ state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] });
  expect(input).toBeDefined();
  const ctx = { enemyTargets: [0], strength: 0, weak: false };
  for (const model of [input!.hand[0]!, deckModels(state, knowledge)[0]!,
    deckDrawPool(state, knowledge, ctx, [])[0]!, pileEntries(state, knowledge, "draw", ctx)[0]!.raw]) {
    expect(model).toMatchObject({ type: "Attack", damage: 12, block: 0, weak: 2, vulnerable: 2 });
    expect(model.blockBase).toBeUndefined();
  }
});
