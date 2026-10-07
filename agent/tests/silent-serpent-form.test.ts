/** 5PM6JAQG6FNQ SILENT A10 F33 T1-T3; silent-0132. Fixed observations only. */
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
import { simulateFight } from "../src/reflex/rollout.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

vi.hoisted(() => vi.resetModules());
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const read = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Serpent Form evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync: read, default: { ...fs, readFileSync: read } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const rows = JSON.parse(readFileSync(new URL("./silent-serpent-form-state.json", import.meta.url), "utf8")) as Raw[];
const knowledge = makeKnowledge({ cards: [
  { id: "SERPENT_FORM", type: "Power" }, { id: "DEFEND_SILENT", type: "Skill" },
  { id: "ULTIMATE_DEFEND", type: "Skill" }, { id: "CALCULATED_GAMBLE", type: "Skill" },
  { id: "PREDATOR", type: "Attack" }, { id: "DAGGER_SPRAY", type: "Attack" },
  { id: "STRIKE_SILENT", type: "Attack" }, { id: "ASCENDERS_BANE", type: "Curse" },
] }, "cache");
const frame = (line: number): Raw => structuredClone(rows.find((row) => row.line === line)!.row.state);
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });

function inputFor(raw: Raw): SolverInput {
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

function step(input: SolverInput, id: string) {
  const entry = input.hand.find((c) => c.cardId === id)!;
  return { cardIndex: entry.index, cardId: id, name: entry.name, upgraded: entry.upgraded,
    target: entry.target === "single" ? 0 : null };
}

it("T1 establishes four points without attributing damage to the power itself or a held second copy", () => {
  const input = inputFor(frame(274199));
  const plan = replaySteps(input, [step(input, "SERPENT_FORM")])!;
  expect(plan.outcome.damageDealt).toBe(0);
  expect(plan.outcome.serpentFormAfter).toBe(4);
  expect(frame(274200).combat.enemies[0].current_hp).toBe(frame(274199).combat.enemies[0].current_hp);
  const active = inputFor(frame(274202));
  active.hand.push({ ...input.hand.find((c) => c.cardId === "SERPENT_FORM")!, index: 99, key: "held-second" });
  expect(replaySteps(active, [])!.outcome.serpentFormAfter).toBe(4);
});

it.each([
  [274202, 274203, "DEFEND_SILENT", 4], [274203, 274204, "ULTIMATE_DEFEND", 4],
  [274205, 274206, "DEFEND_SILENT", 4], [274207, 274208, "PREDATOR", 19],
  [274208, 274209, "DAGGER_SPRAY", 16], [274209, 274210, "DEFEND_SILENT", 4],
])("frame %i: %s separates the card's damage and four-point trigger", (before, after, id, actualDamage) => {
  const input = inputFor(frame(before));
  // A one-card plan includes end-turn poison. Remove that separate, observed settlement for this comparison.
  for (const enemy of input.enemies) enemy.poison = 0;
  const action = step(input, id as string);
  const plan = replaySteps(input, [action])!;
  const actual = frame(before).combat.enemies[0].current_hp - frame(after).combat.enemies[0].current_hp;
  expect(actual).toBe(actualDamage);
  expect(plan.outcome.damageDealt).toBe(actual);
  const control = structuredClone(input);
  delete control.player.serpentForm;
  expect(plan.outcome.damageDealt - replaySteps(control, [action])!.outcome.damageDealt).toBe(4);
});

it("a complete fixed defense prefix keeps poison settlement separate from the two card triggers", () => {
  const input = inputFor(frame(274202));
  const plan = replaySteps(input, [step(input, "DEFEND_SILENT"), step(input, "ULTIMATE_DEFEND")])!;
  // Two card triggers (8), then observed poison 3+2 (5); no automatic extra card play is invented.
  expect(plan.outcome.damageDealt).toBe(13);
  expect(plan.outcome.serpentFormAfter).toBe(4);
});

it("the rollout carries a newly established power into the next turn, without a self-trigger", () => {
  const observed = inputFor(frame(274199));
  const serpent = observed.hand.find((c) => c.cardId === "SERPENT_FORM")!;
  const input = board({ playerHp: 70 });
  input.solver.hand = [serpent];
  input.solver.player.serpentForm = 0;
  input.solver.enemies[0]!.hp = 399;
  input.solver.enemies[0]!.attacks = [];
  input.meta = { ...input.meta, asc: 10 };
  input.playerPowers = {};
  input.enemies = [{ index: 0, id: "FIXED_ENEMY", move: "WAIT", strength: 0, powers: {} }];
  input.tables = { FIXED_ENEMY: { moves: { WAIT: { damage: 0, hits: 0, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } } };
  input.piles = { handBase: [serpent], draw: Array.from({ length: 20 }, (_, i) =>
    card(100 + i, "DEFEND_SILENT", { type: "Skill", target: "self", cost: 1, block: 5 })), discard: [] };
  const records = simulateFight(input, replaySteps(input.solver, [step(input.solver, "SERPENT_FORM")])!, 2, 1, false).records;
  expect(records[0]!.dmg).toBe(0);
  expect(records[0]!.snap.pw.SERPENT_FORM_POWER).toBe(4);
  expect(records[1]!.dmg).toBe(12);
});

it.each([["IRONCLAD", 10], ["SILENT", 9]])("%s A%i preserves the old outcome on the identical evidence frame", (character, ascension) => {
  const raw = frame(274202);
  raw.run.character_id = character; raw.run.ascension = ascension;
  const input = inputFor(raw);
  expect(input.player.serpentForm).toBeUndefined();
  raw.combat.player.powers = raw.combat.player.powers.filter((p: Raw) => p.power_id !== "SERPENT_FORM_POWER");
  const control = inputFor(raw);
  expect(replaySteps(input, [step(input, "DEFEND_SILENT")])).toEqual(replaySteps(control, [step(control, "DEFEND_SILENT")]));
});

it.each(["two-enemies", "replay", "stacking"])("unobserved %s keeps the option and marks its extra damage unknown", (scope) => {
  const input = inputFor(frame(274202));
  for (const enemy of input.enemies) enemy.poison = 0;
  if (scope === "two-enemies") input.enemies.push({ ...input.enemies[0]!, index: 1 });
  if (scope === "replay") input.hand.find((c) => c.cardId === "DEFEND_SILENT")!.replay = 1;
  if (scope === "stacking") input.player.serpentForm = 8;
  const plan = replaySteps(input, [step(input, "DEFEND_SILENT")])!;
  expect(plan).not.toBeNull();
  expect(plan.outcome.damageDealt).toBe(0);
  expect(plan.outcome.unknownCards.some((s) => s.includes("群蛇形态"))).toBe(true);
});

it("unobserved upgrade does not acquire the plain four-point model", () => {
  const raw = frame(274199).combat.hand.find((c: Raw) => c.card_id === "SERPENT_FORM");
  expect(modelHandCard({ ...raw, upgraded: true }, 0, knowledge, "silent", 10).serpentForm).toBeUndefined();
});

it.each(["second-copy", "power-replay"])("unobserved %s does not invent eight established stacks", (scope) => {
  const input = inputFor(frame(274199));
  if (scope === "second-copy") input.player.serpentForm = 4;
  else input.hand.find((c) => c.cardId === "SERPENT_FORM")!.replay = 1;
  const plan = replaySteps(input, [step(input, "SERPENT_FORM")])!;
  expect(plan.outcome.serpentFormAfter).toBeNull();
  expect(plan.outcome.damageDealt).toBe(0);
  expect(plan.outcome.unknownCards.some((s) => s.includes("群蛇形态"))).toBe(true);
});

it("automatic establishment keeps the option but does not infer the manually observed power", () => {
  const input = inputFor(frame(274199));
  const serpent = input.hand.find((c) => c.cardId === "SERPENT_FORM")!;
  input.hand = [card(99, "FIXED_AUTOMATIC", { type: "Skill", target: "self", cost: 0,
    immediatePlays: { count: 1, card: serpent } })];
  const plan = replaySteps(input, [step(input, "FIXED_AUTOMATIC")])!;
  expect(plan.outcome.serpentFormAfter).toBeNull();
  expect(plan.outcome.unknownCards.some((s) => s.includes("自动建立"))).toBe(true);
});
