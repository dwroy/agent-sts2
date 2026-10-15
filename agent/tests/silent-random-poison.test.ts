/** G8NHLL09DLBX, Silent A10 F24 T5; silent-0295/0007. Fixed observed frames only. */
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
import { describePlan, planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions, turnsText } from "../src/reflex/rollout-live.js";
import type { LineEstimate } from "../src/reflex/rollout.js";
import { dominates, replaySteps, solveTap, solveTurn, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { judgeLeastLossNow } from "../src/sl/judge.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const read = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed random poison evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync: read, default: { ...fs, readFileSync: read } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const rows = JSON.parse(readFileSync(new URL("./silent-random-poison-evidence.json", import.meta.url), "utf8")) as Raw[];
const frame = (line = 297418): Raw => structuredClone(rows.find((row) => row.line === line)!.row.state);
const knowledge = makeKnowledge({ cards: [
  ...["BOUNCING_FLASK", "DEADLY_POISON", "FOOTWORK", "WELL_LAID_PLANS"].map((id) => ({ id, type: id === "FOOTWORK" || id === "WELL_LAID_PLANS" ? "Power" : "Skill" })),
] }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
const oldBossLines = bossLinesOptions.enabled;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false;
  bossLinesOptions.enabled = false;
});
afterEach(() => {
  solveTap.onSolve = null;
  setMonsterDbForTests(null);
  rolloutLiveOptions.enabled = oldRollout;
  bossLinesOptions.enabled = oldBossLines;
});

function solveFrame(raw = frame()) {
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try {
    const decision = planCombatTurn(env);
    if (!input) throw new Error("observed board was not solved");
    return { input, decision };
  } finally { solveTap.onSolve = null; }
}

const flaskStep = (input: SolverInput): Step => {
  const card = input.hand.find((card) => card.cardId === "BOUNCING_FLASK")!;
  return { cardIndex: card.index, cardId: card.cardId, name: card.name, upgraded: card.upgraded, target: null, targetName: null };
};

it("does not promise the recorded mother's kill when all observed applications missed her", () => {
  const { input } = solveFrame();
  const plan = replaySteps(input, [flaskStep(input)])!;
  expect(plan.outcome).toMatchObject({ winsFight: false, randomPoisonUnresolved: true });
  expect(plan.outcome.enemyHpAfter.find((enemy) => enemy.index === 3)?.hp).toBe(9);
  expect(plan.outcome.unknownCards.join(" ")).toContain("未计新增毒");
  const legacy = structuredClone(input);
  delete legacy.hand.find((card) => card.cardId === "BOUNCING_FLASK")!.deferRandomPoison;
  expect(replaySteps(legacy, [flaskStep(legacy)])!.outcome.winsFight).toBe(true);
  expect(frame(297419).combat.enemies[3].powers.find((p: Raw) => p.power_id === "POISON_POWER").amount).toBe(20);
  expect(frame(297420).combat.enemies.find((enemy: Raw) => enemy.enemy_id === "OVICOPTER").current_hp).toBe(9);
  expect(frame(297420).combat.player.current_hp).toBe(0);
});

it("retains the uncertain card as an actual Jev choice when its reference outcome dies", () => {
  const { input, decision } = solveFrame();
  const plans = solveTurn(input).plans.filter((plan) => plan.outcome.randomPoisonUnresolved);
  expect(plans.length).toBeGreaterThan(0);
  expect(decision.kind).toBe("ask");
  expect(JSON.stringify(decision)).toContain("未计随机新增毒");
  expect(plans.every((plan) => !plan.outcome.winsFight)).toBe(true);
  if (decision.kind !== "ask") throw new Error("expected a real plan question");
  const key = Object.entries(decision.questions.plan!.criteria).find(([, text]) =>
    typeof text === "string" && JSON.parse(text).plays?.startsWith("弹跳药瓶"))?.[0];
  expect(key).toBeDefined();
  const resolved = decision.resolve({ plan: { type: "choice", choice: key!, confidence: 1 } });
  expect(resolved.intent).toMatchObject({ action: "play_card", card_index: flaskStep(input).cardIndex });
});

it("labels the reference in both the current-turn summary and rollout text", () => {
  const { input } = solveFrame();
  const plan = replaySteps(input, [flaskStep(input)])!;
  expect(describePlan(plan, 1).result).toContain("非保证");
  expect(turnsText(plan, { perTurn: [] } as unknown as LineEstimate, 1)).not.toContain("T1 exact");
  expect(dominates(plan, replaySteps(input, [])!)).toBe(false);
});

it("waits for the actual poison allocation before planning another card", () => {
  const { input } = solveFrame();
  input.player.energy = 3;
  const after = input.hand.find((card) => card.cardId === "FOOTWORK")!;
  expect(after).toBeDefined();
  expect(replaySteps(input, [flaskStep(input), { cardIndex: after.index, cardId: after.cardId,
    name: after.name, upgraded: after.upgraded, target: null, targetName: null }])).toBeNull();
});

it("finds the recorded losing allocation among all 64 three-application sequences", () => {
  const { input } = solveFrame();
  let wins = 0;
  for (let a = 0; a < 4; a += 1) for (let b = 0; b < 4; b += 1) for (let c = 0; c < 4; c += 1) {
    const branch = structuredClone(input);
    branch.hand = [];
    for (const target of [a, b, c]) branch.enemies[target]!.poison = (branch.enemies[target]!.poison ?? 0) + 3;
    wins += replaySteps(branch, [])!.outcome.winsFight ? 1 : 0;
  }
  // These are model branches of one observed board, not 64 independent live samples or a fitted probability.
  expect(wins).toBe(1);
});

it("does not turn the omitted-poison death into a certain early SL", () => {
  const state = parseGameState(frame());
  const verdict = judgeLeastLossNow(state, { revives: [], knownDrawsJudge: false, addedToPile: false,
    facts: { knownDraws: 0, drawsKnown: false, draws: false, line: ["弹跳药瓶"], chance: "弹跳药瓶 has a random effect" },
  });
  expect(verdict.certain).toBe(false);
});

it("keeps the original poison path when only one target remains", () => {
  const { input } = solveFrame();
  input.enemies = input.enemies.filter((enemy) => enemy.index === 3);
  const control = structuredClone(input);
  delete control.hand.find((card) => card.cardId === "BOUNCING_FLASK")!.deferRandomPoison;
  expect(replaySteps(input, [flaskStep(input)])).toEqual(replaySteps(control, [flaskStep(control)]));
  expect(replaySteps(input, [flaskStep(input)])!.outcome.winsFight).toBe(true);
});

it.each([["IRONCLAD", 10], ["SILENT", 9], ["SILENT", 11]])("%s A%i preserves its previous behavior", (character, ascension) => {
  const raw = frame();
  raw.run.character_id = character;
  raw.run.ascension = ascension;
  const flask = raw.combat.hand.find((card: Raw) => card.card_id === "BOUNCING_FLASK");
  expect(modelHandCard(flask, 0, knowledge, character, ascension).deferRandomPoison).toBeUndefined();
});

it.each(["upgrade", "cost", "enchantment", "replay"])("preserves the unobserved %s preview", (mode) => {
  const flask = frame().combat.hand.find((card: Raw) => card.card_id === "BOUNCING_FLASK");
  if (mode === "upgrade") flask.upgraded = true;
  if (mode === "cost") flask.energy_cost = 1;
  if (mode === "enchantment") flask.enchantment = { id: "UNOBSERVED" };
  if (mode === "replay") flask.resolved_rules_text += "重放1。";
  expect(modelHandCard(flask, 0, knowledge, "silent", 10).deferRandomPoison).toBeUndefined();
});
