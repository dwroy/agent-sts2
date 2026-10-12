import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-phase-current-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import * as phase from "../src/reflex/silent-phase-current.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Silent evidence only"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));
// The Vitest setup imports some loaders before the per-file fs mock. Replace those consumers explicitly.
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/knowledge/potion-equivalents.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/potion-equivalents.js")>(), heldPotionWorth: () => ({}),
}));

type Raw = Record<string, any>;
const rawAt = (line: number): Raw => structuredClone(evidence.frames.find((f) => f.line === line)!.state);
const factsAt = (line: number): any => phase.silentPhaseCurrentFacts(parseGameState(rawAt(line))).test_subject_current;
const knowledge = makeKnowledge({ cards: rawAt(277519).run.deck.map((c: Raw) => ({ id: c.card_id, type: c.card_type, name: c.name })), monsters: [{ id: "TEST_SUBJECT", type: "Boss" }] }, "cache");
const oldRollout = rolloutLiveOptions.enabled, oldBoss = bossLinesOptions.enabled;
const oldMcNow = potionMcOptions.now;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false; bossLinesOptions.enabled = false;
  potionMcOptions.now = () => 0;
});
afterEach(() => {
  setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; bossLinesOptions.enabled = oldBoss;
  potionMcOptions.now = oldMcNow; vi.restoreAllMocks();
});
function planned(raw: Raw, v1 = false) {
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [], ...(v1 ? { jevContext: "v1" } : {}) };
  return planCombatTurn(env);
}

it("keeps owned and in-hand poison components separate from established powers at T5", () => {
  const raw = rawAt(277519), before = structuredClone(raw);
  const facts: any = phase.silentPhaseCurrentFacts(parseGameState(raw)).test_subject_current;
  expect(facts).toMatchObject({ scope: "observed_current_snapshot", enemy_hp_now: 197, enemy_max_hp_now: 212,
    poison_now: 0, accelerant_established_now: 2, noxious_fumes_established_now: 0, poison_damage_already_dealt: null });
  expect(facts.components).toEqual([
    { card_id: "ACCELERANT", run_deck_count: 1, hand_count: 0 },
    { card_id: "NOXIOUS_FUMES", run_deck_count: 1, hand_count: 1 },
    { card_id: "OUTBREAK", run_deck_count: 1, hand_count: 0 },
  ]);
  expect(facts.zero_poison_note).toContain("零毒");
  expect(raw).toEqual(before);
});

it("reads the observed phase reset without carrying four poison to the new 212 HP body", () => {
  expect(factsAt(277512)).toMatchObject({ enemy_hp_now: 4, enemy_max_hp_now: 111, poison_now: 4 });
  expect(factsAt(277513)).toMatchObject({ enemy_hp_now: 212, enemy_max_hp_now: 212, poison_now: 0, accelerant_established_now: 0 });
  expect(factsAt(277513)).not.toHaveProperty("zero_poison_note");
});

it("keeps established Accelerant separate from poison and later Dexterity separate from existing block", () => {
  expect(factsAt(277518)).toMatchObject({ accelerant_established_now: 2, poison_now: 0 });
  expect(factsAt(277524)).toMatchObject({ dexterity_now: 5, block_now: 23 });
  expect(factsAt(277526)).toMatchObject({ dexterity_now: 6, block_now: 23 });
});

it.each([false, true])("reaches the actual Jev question and preserves all criteria (v1=%s)", (v1) => {
  const raw = rawAt(277513), current = planned(raw, v1);
  if (current?.kind !== "ask" || current.questions.plan?.type !== "choice") throw new Error("expected a plan question: " + JSON.stringify(current));
  expect(current.state.test_subject_current).toMatchObject({ enemy_hp_now: 212, poison_now: 0, accelerant_established_now: 0 });
  if (v1) expect(current.jevView?.state.test_subject_current).toEqual(current.state.test_subject_current);
  expect(current.state).not.toHaveProperty("experience");
  vi.spyOn(phase, "silentPhaseCurrentFacts").mockReturnValue({});
  const old = planned(raw, v1);
  if (old?.kind !== "ask") throw new Error("expected the original question");
  expect(current.questions).toEqual(old.questions);
  const { test_subject_current: _facts, ...rest } = current.state;
  expect(rest).toEqual(old.state);
  expect(raw).toEqual(rawAt(277513));
});

it("does not interpret missing deck or hand data as an absent component", () => {
  const raw = rawAt(277519); delete raw.run.deck; raw.combat.hand = [{}];
  const facts: any = phase.silentPhaseCurrentFacts(parseGameState(raw)).test_subject_current;
  expect(facts.components.every((c: any) => c.run_deck_count === null && c.hand_count === null)).toBe(true);
});

it("keeps the T5 automatic line automatic rather than forcing a new question", () => {
  const raw = rawAt(277519), current = planned(raw);
  expect(current?.kind).toBe("act");
  vi.spyOn(phase, "silentPhaseCurrentFacts").mockReturnValue({});
  expect(JSON.stringify(planned(raw))).toBe(JSON.stringify(current));
});

it.each([
  ["other character", (r: Raw) => { r.run.character_id = "IRONCLAD"; }],
  ["A9", (r: Raw) => { r.run.ascension = 9; }],
  ["A11", (r: Raw) => { r.run.ascension = 11; }],
  ["unobserved floor", (r: Raw) => { r.run.floor = 49; }],
  ["unobserved phase", (r: Raw) => { r.combat.enemies[0].max_hp = 313; }],
  ["another enemy", (r: Raw) => { r.combat.enemies[0].enemy_id = "UNKNOWN"; }],
  ["two enemies", (r: Raw) => { r.combat.enemies.push({ ...r.combat.enemies[0], index: 1 }); }],
  ["missing player powers", (r: Raw) => { delete r.combat.player.powers; }],
  ["missing enemy powers", (r: Raw) => { delete r.combat.enemies[0].powers; }],
  ["duplicate power", (r: Raw) => { r.combat.player.powers.push({ power_id: "ACCELERANT_POWER", amount: 2 }); }],
  ["invalid block", (r: Raw) => { r.combat.player.block = -1; }],
] as const)("%s does not receive the new facts", (_label, change) => {
  const raw = rawAt(277519); change(raw);
  expect(phase.silentPhaseCurrentFacts(parseGameState(raw))).toEqual({});
});

it("preserves the entire other-character question", () => {
  const raw = rawAt(277513); raw.run.character_id = "IRONCLAD";
  const current = planned(raw);
  vi.spyOn(phase, "silentPhaseCurrentFacts").mockReturnValue({});
  expect(JSON.stringify(planned(raw))).toBe(JSON.stringify(current));
});
