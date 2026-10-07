import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { parseGameState } from "../src/hand/mod/schema.js";
import { asRecord } from "../src/core/util/json.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildFacts } from "../src/brain/build-facts.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { runPlanInput } from "../src/memory/run-plan.js";
import { bossClockJson } from "../src/sim/boss-clock.js";
import { actBossDefeated, withBossSim } from "../src/sim/build-sim-facts.js";

// Only fields consumed by these facts are retained from the six cited Silent frames.
const frames = JSON.parse(readFileSync(new URL("./silent-boss-phase-states.json", import.meta.url), "utf8")) as
  { line: number; state: Record<string, unknown> }[];
const knowledge = makeKnowledge({}, "cache");
function env(line: number): DecisionEnv {
  const state = parseGameState(structuredClone(frames.find((frame) => frame.line === line)!.state));
  return { state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory(state.screen),
    thresholds: { act: 0.7, strong: 0.9 }, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, shopDiscardPotions: [] };
}
const hp = (value: number) => ({ min: value, median: value, max: value, n: 1 });
beforeEach(() => {
  setKnowledgeCharacter("silent");
  setMonsterDbForTests({ monsters: { AEONGLASS: { hp_by_asc: { "10": hp(535) } },
    QUEEN: { hp_by_asc: { "10": hp(419) } }, TORCH_HEAD_AMALGAM: { hp_by_asc: { "10": hp(211) } } },
    bosses: {}, encounters: {} });
});
afterEach(() => { setMonsterDbForTests(null); setKnowledgeCharacter(null); });

it.each([243532, 244372])("F48 reward L%i marks only the first victory, with no invented map or boss identity", async (line) => {
  const e = env(line);
  const facts = buildFacts(e);
  expect(facts).toMatchObject({ act_boss: null, floors_to_act_boss: 1, act_boss_clock: null,
    boss_phase: { first_boss_defeated: true, act_complete: false, observed_remaining_boss_nodes: null,
      current_boss: null, raw_boss_id: "TEST_SUBJECT_BOSS", raw_boss_id_stale: true } });
  const runPlan = runPlanInput(e.state, knowledge, "review", [], [], []);
  expect(runPlan["act_boss"]).toBeNull();
  expect(runPlan["boss_phase"]).toEqual(facts["boss_phase"]);
  expect(actBossDefeated(e.state)).toBe(true);
  const ask: AskDecision = { kind: "ask", label: "reward/card", state: { facts },
    questions: { q: { type: "choice", instructions: "fixed", criteria: { skip: "skip" } } },
    deepseek: { question: "q", options: () => [{ key: "skip", intent: { action: "proceed" }, summary: "skip" }],
      baseline: { kind: "act", label: "fixed", intent: { action: "proceed" }, rationale: "fixed" } },
    resolve: () => { throw new Error("no execution in this test"); } };
  const run = vi.fn(() => { throw new Error("must not simulate the defeated first boss"); });
  const result = await withBossSim(ask, e, { runner: { run } });
  expect(result.record).toMatchObject({ skipped: "first boss defeated; the second boss is not observed yet" });
  expect(asRecord(result.decision.kind === "ask" ? result.decision.state["facts"] : {})["act_boss_sim"]).toContain("F49第二场");
  expect(run).not.toHaveBeenCalled();
  expect(e.state.run?.raw["boss_id"]).toBe("TEST_SUBJECT_BOSS");
});

it.each([243533, 244373])("F48 map L%i reports the displayed second node without guessing its enemy", (line) => {
  expect(buildFacts(env(line))).toMatchObject({ act_boss: null, floors_to_act_boss: 1,
    boss_phase: { first_boss_defeated: true, act_complete: false,
      observed_remaining_boss_nodes: [{ row: 15, col: 3, second: true }], current_boss: null } });
});

it.each([[243534, "AEONGLASS", 535], [244374, "QUEEN", 419]] as const)(
  "F49 L%i uses the observed %s and its frozen current-ascension HP", (line, boss, value) => {
    const e = env(line);
    const facts = buildFacts(e);
    expect(facts).toMatchObject({ act_boss: boss, floors_to_act_boss: 0,
      boss_phase: { current_boss: boss, raw_boss_id: "TEST_SUBJECT_BOSS", raw_boss_id_stale: true,
        current_boss_basis: "现场敌人", first_boss_defeated: true, act_complete: false },
      act_boss_clock: { boss, boss_hp: value } });
    expect(runPlanInput(e.state, knowledge, "review", [], [], [])["act_boss"]).toBe(boss);
    expect(e.state.run?.current_hp).toBe(line === 243534 ? 8 : 17);
    expect(e.state.run?.raw["boss_id"]).toBe("TEST_SUBJECT_BOSS");
  });

it("keeps an unobserved F49 encounter and post-fight completion unknown", () => {
  const e = env(243534);
  asRecord(e.state.combat?.raw)["enemies"] = [{ enemy_id: "UNOBSERVED" }];
  expect(buildFacts(e)).toMatchObject({ act_boss: null, act_boss_clock: null,
    boss_phase: { current_boss: null, act_complete: false } });
  e.state.in_combat = false;
  expect(asRecord(buildFacts(e)["boss_phase"])["act_complete"]).toBeNull();
});

it("does not label a refreshed second-boss id stale or guess an ambiguous principal", () => {
  const e = env(243534);
  asRecord(e.state.run?.raw)["boss_id"] = "AEONGLASS_BOSS";
  expect(buildFacts(e)).toMatchObject({ act_boss: "AEONGLASS", boss_phase: { raw_boss_id_stale: false } });
  asRecord(e.state.combat?.raw)["enemies"] = [{ enemy_id: "AEONGLASS" }, { enemy_id: "QUEEN" }];
  expect(buildFacts(e)).toMatchObject({ act_boss: null, act_boss_clock: null });
});

it.each([
  { character_id: "IRONCLAD" }, { ascension: 9 }, { ascension: 11 }, { act_id: "1" }, { ascension_effects: [] },
])("preserves the old facts outside the observed scope: %j", (change) => {
  const e = env(243532);
  const raw = structuredClone(e.state.raw);
  Object.assign(asRecord(raw["run"]), change);
  e.state = parseGameState(raw);
  expect(buildFacts(e)["boss_phase"]).toBeUndefined();
  expect(buildFacts(e)["act_boss"]).toBe("TEST_SUBJECT_BOSS");
  expect(runPlanInput(e.state, knowledge, "review", [], [], [])["act_boss"]).toBe("TEST_SUBJECT_BOSS");
});

it("retains the existing first-fight identity before it is defeated", () => {
  const e = env(243532);
  e.state.in_combat = true;
  expect(buildFacts(e)).toMatchObject({ act_boss: "TEST_SUBJECT_BOSS", floors_to_act_boss: 0,
    boss_phase: { first_boss_defeated: false, raw_boss_id_stale: false, act_complete: false } });
  expect(actBossDefeated(e.state)).toBe(false);
  expect(bossClockJson(e.state, knowledge)?.["boss"]).toBe("TEST_SUBJECT");
});
