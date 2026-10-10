/** Fixed 5BU7ZE1PWLSX F17 T4/T5 and F28/F32 questions, silent-0367. No live logs or LLM calls. */
import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { buildFacts } from "../src/brain/build-facts.js";
import { loadConfig } from "../src/core/config.js";
import { asArray, asRecord } from "../src/core/util/json.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { planDecision } from "../src/hand/screens/index.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { briefJson, buildRunBrief } from "../src/memory/run-brief.js";
import { replayRun } from "../src/memory/journal-replay.js";
import { createScreenMemory, type DecisionEnv, type ScreenMemory } from "../src/memory/types.js";
import { noteLizardTailEndTurn, revivesOf, trackLizardTail } from "../src/reflex/combat-plan.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeCharacter: () => "silent",
  knowledgeFile: (_dir: string, name: string) => `/__silent_tail_resource_fixed__/${name}`,
}));
vi.mock("../src/sim/boss-clock.js", async (original) => ({
  ...await original<typeof import("../src/sim/boss-clock.js")>(),
  bossClockJson: () => null,
}));

const fixture = JSON.parse(readFileSync(new URL("./silent-tail-resource-evidence.json", import.meta.url), "utf8"));
const knowledge = makeKnowledge({}, "cache");
function state(key: string, edit?: (raw: Record<string, unknown>) => void) {
  const raw = structuredClone(fixture.states[key]);
  edit?.(raw);
  return parseGameState(raw);
}
function observedMemory(): ScreenMemory {
  const memory = createScreenMemory("COMBAT");
  const end = state("end_t4");
  trackLizardTail(memory, end);
  noteLizardTailEndTurn(memory, end, { action: "end_turn" });
  expect(trackLizardTail(memory, state("start_t5"))).toBe("HP rose 14 -> 38 after a lethal read");
  return memory;
}
function environment(key: string, memory = observedMemory(), edit?: (raw: Record<string, unknown>) => void): DecisionEnv {
  const s = state(key, edit);
  return { state: s, knowledge, screenMemory: memory, brief: buildRunBrief(s, knowledge, [], memory),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, shopDiscardPotions: [], buildDecider: "deepseek", oneshot: "off" };
}
function resource(facts: Record<string, unknown>) { return asRecord(asArray(facts.relic_resources)[0]); }

it.each(["rest_28", "rest_32"])("carries the observed spent tail into facts and the brief at %s, with its source", (key) => {
  const env = environment(key);
  const before = JSON.stringify(env.state.raw);
  const facts = buildFacts(env);
  const brief = briefJson(env.brief);
  expect(resource(facts)).toMatchObject({ relic_id: "LIZARD_TAIL", run_id: fixture.run_id,
    held: true, status: "used", used: true, available: false,
    source: { run_id: fixture.run_id, fight: "0:17", floor: 17, observed_turn: 5,
      observation: "HP rose 14 -> 38 after a lethal read" } });
  expect(brief.relic_resources).toEqual(facts.relic_resources);
  expect(resource(facts).note).toContain("不能再计作剩余复活");
  expect(asArray(facts.relics).some((r) => String(r).includes("蜥蜴尾巴"))).toBe(true);
  expect(JSON.stringify(env.state.raw)).toBe(before);
});

it("delivers the state to a production rest question while keeping every choice", () => {
  const env = environment("rest_32");
  const used = planDecision(env);
  const unknown = planDecision(environment("rest_32", createScreenMemory("REST")));
  if (used.kind !== "decision" || used.decision.kind !== "ask"
    || unknown.kind !== "decision" || unknown.decision.kind !== "ask") throw new Error("Expected rest questions");
  expect(used.decision.label).toBe("rest/choose");
  expect(resource(asRecord(used.decision.state.facts)).used).toBe(true);
  expect(resource(asRecord(used.decision.state.run_brief)).available).toBe(false);
  expect(used.decision.questions).toEqual(unknown.decision.questions);
});

it.each([undefined, "other-run"])("leaves missing or foreign run memory unverified (%s)", (runId) => {
  const memory = createScreenMemory("REST");
  if (runId) memory.lizardTail = { runId, used: true };
  const env = environment("rest_28", memory);
  expect(resource(buildFacts(env))).toMatchObject({ status: "unknown", used: null, available: null, source: null });
  expect(env.brief.relic_resources).toEqual(buildFacts(env).relic_resources);
});

it("distinguishes not observing a use from confirming an available charge", () => {
  const memory = createScreenMemory("REST");
  memory.lizardTail = { runId: fixture.run_id, used: false };
  expect(resource(buildFacts(environment("rest_28", memory)))).toMatchObject({
    status: "not_observed_used", used: false, available: null, source: null,
  });
});

it("uses the existing replay record after restart and preserves an earlier-fight use on retry", () => {
  const rows = ["end_t4", "start_t5", "rest_28"].map((key, i) => ({
    ts: `2026-10-10T02:10:0${i}.000Z`, state: fixture.states[key],
  }));
  const replay = replayRun({ states: rows, decisions: [], runPlans: [] }, knowledge);
  expect(replay.lizardTail?.used).toBe(true);
  const memory = createScreenMemory("REST");
  memory.lizardTail = replay.lizardTail ?? undefined;
  expect(resource(buildFacts(environment("rest_28", memory))).used).toBe(true);
  const nextFight = state("start_t5", (raw) => { asRecord(raw.run).floor = 33; });
  trackLizardTail(memory, nextFight);
  const retry = state("end_t4", (raw) => { asRecord(raw.run).floor = 33; });
  trackLizardTail(memory, retry);
  expect(memory.lizardTail?.used).toBe(true);
  expect(revivesOf(retry, memory, 77)).toEqual([]);
});

it.each(["IRONCLAD", "DEFECT"])("keeps %s inputs equal regardless of Silent memory", (character) => {
  const edit = (raw: Record<string, unknown>) => { asRecord(raw.run).character_id = character; };
  const used = environment("rest_28", observedMemory(), edit);
  const empty = environment("rest_28", createScreenMemory("REST"), edit);
  expect(buildFacts(used)).toEqual(buildFacts(empty));
  expect(briefJson(used.brief)).toEqual(briefJson(empty.brief));
  expect(buildFacts(used)).not.toHaveProperty("relic_resources");
});

it("keeps combat and unobserved ascensions unchanged and omits unheld tails", () => {
  expect(environment("start_t5").brief).not.toHaveProperty("relic_resources");
  expect(buildFacts(environment("rest_28", observedMemory(), (raw) => { asRecord(raw.run).ascension = 9; })))
    .not.toHaveProperty("relic_resources");
  const env = environment("rest_28", observedMemory(), (raw) => {
    const run = asRecord(raw.run);
    run.relics = asArray(run.relics).filter((r) => asRecord(r).relic_id !== "LIZARD_TAIL");
  });
  expect(buildFacts(env)).not.toHaveProperty("relic_resources");
  expect(env.brief).not.toHaveProperty("relic_resources");
});
