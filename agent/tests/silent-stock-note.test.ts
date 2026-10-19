/** R3AJCGQGGMR4 A10 F45 T2/T5/T6, silent-0311/0312. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-stock-note-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import * as stock from "../src/reflex/silent-stock-note.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__fixed_silent_stock__/${name}`,
}));
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const knowledge = makeKnowledge({}, "cache");
const rawAt = (): Raw => structuredClone(evidence.question_state);
const oldRollout = rolloutLiveOptions.enabled, oldBoss = bossLinesOptions.enabled;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false; bossLinesOptions.enabled = false;
});
afterEach(() => {
  vi.restoreAllMocks(); setMonsterDbForTests(null);
  rolloutLiveOptions.enabled = oldRollout; bossLinesOptions.enabled = oldBoss;
});
function ask(raw: Raw, v1: boolean): AskDecision {
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory(state.screen),
    shopDiscardPotions: [], ...(v1 ? { jevContext: "v1" } : {}) };
  const decision = planCombatTurn(env);
  if (decision?.kind !== "ask") throw new Error("expected a turn-plan question");
  return decision;
}

it.each([false, true])("removes the definite stock budget from the actual question without changing candidates (v1=%s)", (v1) => {
  const raw = rawAt(), current = ask(raw, v1);
  const state = current.jevView?.state ?? current.state;
  const enemy = (state.enemies as Raw[])[0]!;
  expect(enemy.hp).toBe("36/90");
  expect(enemy.powers.join(" ")).toContain("跨体胜率和剩余需求存在已知覆盖缺口");
  expect(enemy.powers.join(" ")).toContain("后续rollout仍沿用当前最大HP");
  expect(enemy.powers.join(" ")).not.toContain("its real HP is");
  expect(enemy.powers.join(" ")).not.toContain("10 Block, +3 Strength");
  vi.spyOn(stock, "silentStockNote").mockReturnValue(null);
  const previous = ask(raw, v1);
  expect(current.questions).toEqual(previous.questions);
  expect(current.jevView?.questions).toEqual(previous.jevView?.questions);
  const clean = (value: Record<string, unknown>) => ({ ...value,
    enemies: (value.enemies as Raw[]).map((e) => ({ ...e,
      powers: e.powers.filter((p: string) => !p.startsWith("STOCK_POWER ")) })) });
  expect(clean(current.state)).toEqual(clean(previous.state));
  if (v1) expect(clean(current.jevView!.state)).toEqual(clean(previous.jevView!.state));
  const question = current.questions.plan;
  if (question?.type !== "choice") throw new Error("expected plan choices");
  expect(Object.keys(question.criteria ?? {}).length).toBeGreaterThan(1);
  for (const key of Object.keys(question.criteria ?? {})) {
    const answer = { plan: { type: "choice" as const, choice: key, confidence: 0.9, probabilities: { [key]: 1 }, raw: {} } };
    expect(current.resolve(answer).intent).toEqual(previous.resolve(answer).intent);
  }
  expect(raw).toEqual(rawAt());
});

it("keeps observed phase endpoints distinct from a predicted recovery distribution", () => {
  const at = (line: number) => evidence.observations.find((r) => r.line === line)!;
  expect([at(306415).enemy.max_hp, at(306416).enemy.max_hp, at(306439).enemy.max_hp]).toEqual([77, 90, 99]);
  expect(at(306438).enemy.powers.find((p) => p.power_id === "POISON_POWER")!.amount).toBe(27);
  expect(at(306439).enemy.powers.some((p) => p.power_id === "POISON_POWER")).toBe(false);
  expect(at(306444).enemy.current_hp).toBe(87);
  expect(at(306444).hp).toBe(0);
});

it.each(["IRONCLAD", "unobserved-ascension"])("keeps the full question byte-equivalent for %s", (scope) => {
  const raw = rawAt();
  if (scope === "IRONCLAD") raw.run.character_id = scope;
  else raw.run.ascension = 9;
  const current = ask(raw, true);
  vi.spyOn(stock, "silentStockNote").mockReturnValue(null);
  const previous = ask(raw, true);
  expect(JSON.stringify({ state: current.state, questions: current.questions, jevView: current.jevView }))
    .toBe(JSON.stringify({ state: previous.state, questions: previous.questions, jevView: previous.jevView }));
});

it.each(["character", "ascension", "enemy", "stock", "duplicate", "dead", "not-combat"])(
  "keeps the prior note outside the observed scope: %s", (change) => {
    const raw = rawAt(), enemy = raw.combat.enemies[0];
    if (change === "character") raw.run.character_id = "IRONCLAD";
    if (change === "ascension") raw.run.ascension = 9;
    if (change === "enemy") enemy.enemy_id = "UNOBSERVED_STOCK_ENEMY";
    if (change === "stock") enemy.powers.find((p: Raw) => p.power_id === "STOCK_POWER").amount = 3;
    if (change === "duplicate") enemy.powers.push({ power_id: "STOCK_POWER", amount: 1 });
    if (change === "dead") enemy.is_alive = false;
    if (change === "not-combat") raw.in_combat = false;
    expect(stock.silentStockNote(parseGameState(raw), enemy)).toBeNull();
  },
);
