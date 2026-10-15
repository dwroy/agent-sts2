/** H1T1F8ML9FUE A10 F45 T5, silent-0132; dispatched proposal c888545b80180da7. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
import { replaySteps, solveTap, traceSteps, type SolverInput } from "../src/reflex/turn-solver.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const read = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: frozen Mirage replay evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync: read, default: { ...fs, readFileSync: read } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const rows = JSON.parse(readFileSync(new URL("./silent-serpent-mirage-replay-evidence.json", import.meta.url), "utf8")) as Raw[];
const frame = (line = 298603): Raw => structuredClone(rows.find((r) => r.line === line)!.row.state);
const knowledge = makeKnowledge({ cards: frame().run.deck.map((c: Raw) => ({ id: c.card_id, type: c.card_type })) }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });

function inputFor(raw = frame()): SolverInput {
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the frozen decision was not solved");
  return input;
}
const step = (input: SolverInput) => {
  const c = input.hand.find((entry) => entry.cardId === "MIRAGE")!;
  return { cardIndex: c.index, cardId: c.cardId, name: c.name, upgraded: c.upgraded, target: null };
};
function withoutObservation(input: SolverInput): SolverInput {
  return { ...input, hand: input.hand.map(({ serpentMirageReplay: _observed, ...card }) => card) };
}

it("the production input reproduces the observed replay before the separate end-turn sources", () => {
  const input = inputFor();
  const traced = traceSteps(input, [step(input)]);
  const plan = traced.plan!;
  const before = frame(), after = frame(298604);
  expect(before.combat.enemies[0].block - after.combat.enemies[0].block).toBe(4);
  expect(before.combat.enemies[0].current_hp - after.combat.enemies[0].current_hp).toBe(4);
  expect(plan.outcome.blockGained).toBe(after.combat.player.block - before.combat.player.block);
  expect(plan.outcome.blockGained).toBe(8);
  expect(plan.outcome.energyLeft).toBe(after.combat.player.energy);
  expect(traced.transitions[0]!.after).toMatchObject({ energy: 2, block: 10, damage: 4,
    enemies: [{ index: 0, hp: 96, poison: 5, artifact: 0 }] });
  expect(plan.outcome.unknownCards.some((text) => text.includes("群蛇形态"))).toBe(false);
});

it.each(["two-enemies", "stacking", "no-frail", "dexterity", "no-afterimage", "more-replays", "duplicate", "poison-changed", "no-block", "intangible"])(
  "the unobserved %s interaction keeps the prior result", (kind) => {
    const input = inputFor();
    if (kind === "two-enemies") input.enemies.push({ ...input.enemies[0]!, index: 1 });
    if (kind === "stacking") input.player.serpentForm = 8;
    if (kind === "no-frail") input.player.frail = false;
    if (kind === "dexterity") input.player.dexterityNow = 2;
    if (kind === "no-afterimage") input.player.afterImage = 0;
    if (kind === "more-replays") input.hand.find((c) => c.cardId === "MIRAGE")!.replay = 2;
    if (kind === "duplicate") input.player.duplicateSkills = 1;
    if (kind === "poison-changed") input.enemies[0]!.poison = 7;
    if (kind === "no-block") input.player.noBlock = true;
    if (kind === "intangible") input.enemies[0]!.intangible = true;
    expect(replaySteps(input, [step(input)])).toEqual(replaySteps(withoutObservation(input), [step(input)]));
  });

it.each([["IRONCLAD", 10], ["SILENT", 9], ["SILENT", 11]])("%s A%i keeps its previous input and outcome", (character, ascension) => {
  const raw = frame(); raw.run.character_id = character; raw.run.ascension = ascension;
  const input = inputFor(raw);
  expect(input.hand.find((c) => c.cardId === "MIRAGE")!.serpentMirageReplay).toBeUndefined();
  expect(replaySteps(input, [step(input)])).toEqual(replaySteps(withoutObservation(input), [step(input)]));
});

it("does not certify an altered rendered template", () => {
  const raw = frame().combat.hand.find((c: Raw) => c.card_id === "MIRAGE");
  expect(modelHandCard({ ...raw, resolved_rules_text: "获得3点格挡。重放1。" }, raw.index, knowledge, "silent", 10).serpentMirageReplay).toBeUndefined();
});
