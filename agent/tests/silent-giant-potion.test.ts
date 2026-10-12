import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import * as giant from "../src/reflex/silent-giant-potion.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__fixed_silent_giant_potion__/${name}`,
}));
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

const evidence = JSON.parse(readFileSync(new URL("./silent-giant-potion-evidence.json", import.meta.url), "utf8"));
const rawAt = (line: number): any => structuredClone(evidence.frames.find((f: { line: number }) => f.line === line).state);
const factsAt = (line: number): any => giant.silentGiantPotionFacts(parseGameState(rawAt(line))).giant_blast_current;
const knowledge = makeKnowledge({}, "cache");
const oldRollout = rolloutLiveOptions.enabled, oldBoss = bossLinesOptions.enabled;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false; bossLinesOptions.enabled = false;
});
afterEach(() => {
  vi.restoreAllMocks(); setMonsterDbForTests(null);
  rolloutLiveOptions.enabled = oldRollout; bossLinesOptions.enabled = oldBoss;
});
function planned(raw: any, v1 = false) {
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [], ...(v1 ? { jevContext: "v1" } : {}) };
  return planCombatTurn(env);
}

it("reports YQL's actual poison change without turning it into body damage, block or reduced blast", () => {
  const before = factsAt(280160), after = factsAt(280161);
  expect(before).toMatchObject({ phase: "blast_pending", body_hp: 0, raw_husk_hp: 999999999,
    poison_now: 2, hp_now: 26, block_now: 13, incoming_now: 41, fight_won: false });
  expect(after).toMatchObject({ poison_now: 8, hp_now: 26, block_now: 13, incoming_now: 41, fight_won: false });
  expect(before.poison_potion_observation).toMatchObject({ scope: "single_observed_use",
    before: { poison: 2, hp: 26, block: 13, incoming: 41 }, after: { poison: 8, hp: 26, block: 13, incoming: 41 } });
  expect(after).not.toHaveProperty("poison_potion_observation");
  expect(giant.silentGiantPotionFacts(parseGameState(rawAt(280162)))).toEqual({});
});

it.each([false, true])("reaches the actual potion question and preserves choices, ranking and actions (v1=%s)", (v1) => {
  const raw = rawAt(280160), current = planned(raw, v1);
  if (current?.kind !== "ask" || current.questions.play?.type !== "choice") throw new Error("expected the observed per-card fallback");
  expect(current.state.giant_blast_current).toEqual(factsAt(280160));
  // The per-card fallback uses its ordinary state in both context modes.
  if (current.jevView) expect(current.jevView.state.giant_blast_current).toEqual(current.state.giant_blast_current);
  expect(JSON.stringify(current.questions)).toContain("毒药水");
  vi.spyOn(giant, "silentGiantPotionFacts").mockReturnValue({});
  const previous = planned(raw, v1);
  if (previous?.kind !== "ask") throw new Error("expected original question");
  expect(current.questions).toEqual(previous.questions);
  const { giant_blast_current: _facts, ...rest } = current.state;
  expect(rest).toEqual(previous.state);
  for (const key of Object.keys(current.questions.play.criteria ?? {})) {
    const answer = { play: { type: "choice" as const, choice: key, confidence: 0.9, probabilities: { [key]: 1 }, raw: {} } };
    expect(current.resolve(answer).intent).toEqual(previous.resolve(answer).intent);
  }
  expect(raw).toEqual(rawAt(280160));
});

it("does not invent a zero poison amount from missing, duplicate or invalid powers", () => {
  for (const powers of [undefined, [{ power_id: "POISON_POWER", amount: -1 }],
    [{ power_id: "POISON_POWER", amount: 2 }, { power_id: "POISON_POWER", amount: 8 }]]) {
    const raw = rawAt(280160); raw.combat.enemies[0].powers = powers;
    expect(giant.silentGiantPotionFacts(parseGameState(raw))).toMatchObject({ giant_blast_current: { poison_now: null } });
  }
});

it.each([false, true])("a synthetic survivable variant also exposes facts in turn-plan questions (v1=%s)", (v1) => {
  // This variant checks routing only; it is not another observed fight or a potion benefit sample.
  const raw = rawAt(280157);
  raw.run.current_hp = 80; raw.combat.player.current_hp = 80;
  raw.combat.end_turn_will_kill_player = false; raw.combat.lethal_risks = [];
  const current = planned(raw, v1);
  if (current?.kind !== "ask" || current.questions.plan?.type !== "choice") throw new Error("expected a turn-plan question");
  expect(current.state.giant_blast_current).toMatchObject({ hp_now: 80, body_hp: 0 });
  if (v1) expect(current.jevView?.state.giant_blast_current).toEqual(current.state.giant_blast_current);
  vi.spyOn(giant, "silentGiantPotionFacts").mockReturnValue({});
  const previous = planned(raw, v1);
  if (previous?.kind !== "ask") throw new Error("expected original turn-plan question");
  expect(current.questions).toEqual(previous.questions);
  for (const key of Object.keys(current.questions.plan.criteria ?? {})) {
    const answer = { plan: { type: "choice" as const, choice: key, confidence: 0.9, probabilities: { [key]: 1 }, raw: {} } };
    expect(current.resolve(answer).intent).toEqual(previous.resolve(answer).intent);
  }
});

it("does not apply the observation to another potion or an unavailable target", () => {
  for (const change of [
    (r: any) => { r.run.potions[0].potion_id = "UNKNOWN_POTION"; },
    (r: any) => { r.run.potions[0].can_use = false; },
    (r: any) => { r.run.potions[0].valid_target_indices = [1]; },
  ]) {
    const raw = rawAt(280160); change(raw);
    expect(giant.silentGiantPotionFacts(parseGameState(raw)).giant_blast_current).not.toHaveProperty("poison_potion_observation");
  }
});

it("excludes unobserved characters, ascensions, floors, bodies and ambiguous phase states", () => {
  for (const change of [
    (r: any) => { r.run.character_id = "IRONCLAD"; },
    (r: any) => { r.run.ascension = 9; },
    (r: any) => { r.run.floor = 33; },
    (r: any) => { r.combat.enemies[0].max_hp = 300; },
    (r: any) => { r.combat.enemies[0].enemy_id = "UNKNOWN"; },
    (r: any) => { r.combat.enemies[0].move_id = "ATTACK_MOVE"; },
    (r: any) => { r.combat.enemies[0].powers.push({ power_id: "STEAM_ERUPTION_POWER", amount: 1 }); },
    (r: any) => { r.combat.enemies.push({ ...r.combat.enemies[0], index: 1 }); },
    (r: any) => { r.combat.player.block = -1; },
  ]) {
    const raw = rawAt(280160); change(raw);
    expect(giant.silentGiantPotionFacts(parseGameState(raw))).toEqual({});
  }
  const raw = rawAt(280160); raw.run.character_id = "IRONCLAD";
  const original = planned(raw);
  vi.spyOn(giant, "silentGiantPotionFacts").mockReturnValue({});
  expect(JSON.stringify(planned(raw))).toEqual(JSON.stringify(original));
});
