/** Fixed entry transitions and build questions from 2SU6XN2AEJRD and HMVJKM56S4Q8, silent-0147/0148. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { buildFacts } from "../src/brain/build-facts.js";
import { loadConfig } from "../src/core/config.js";
import { asArray, asRecord } from "../src/core/util/json.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { planDecision } from "../src/hand/screens/index.js";
import { setExperienceForTests } from "../src/knowledge/experience.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { setRoomCostsForTests } from "../src/knowledge/room-costs.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { routeEntry } from "../src/sim/build-sim-facts.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeCharacter: () => "silent",
  knowledgeFile: (_dir: string, name: string) => `/__silent_route_relic_fixed__/${name}`,
}));
vi.mock("../src/sim/boss-clock.js", async (original) => ({
  ...await original<typeof import("../src/sim/boss-clock.js")>(),
  bossClockJson: () => ({ source: "fixed" }),
}));

const fixture = JSON.parse(readFileSync(new URL("./silent-route-relic-evidence.json", import.meta.url), "utf8"));
const knowledge = makeKnowledge({}, "cache");
beforeEach(() => {
  setExperienceForTests([]);
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  setRoomCostsForTests({ "9": { "2": {
    Monster: { n: 5, median: 10, p75: 15, mean: 10 },
    Elite: { n: 5, median: 20, p75: 25, mean: 20 },
    Unknown: { n: 5, median: 4, p75: 7, mean: 4 },
  } } });
});
afterEach(() => {
  setExperienceForTests(null);
  setMonsterDbForTests(null);
  setRoomCostsForTests(null);
});

function environment(board = "map_before", edit?: (raw: Record<string, unknown>) => void): DecisionEnv {
  const raw = structuredClone(fixture.states[board]);
  edit?.(raw);
  const state = parseGameState(raw);
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [], buildDecider: "deepseek", oneshot: "off" };
}

function question(env: DecisionEnv): AskDecision {
  const result = planDecision(env);
  if (result.kind !== "decision" || result.decision.kind !== "ask" || !result.decision.deepseek) {
    throw new Error(`Expected a build question, got ${JSON.stringify(result)}`);
  }
  return result.decision;
}

function removeRelic(raw: Record<string, unknown>): void {
  const run = asRecord(raw.run);
  run.relics = asArray(run.relics).filter((entry) => asRecord(entry).relic_id !== "PLANISPHERE");
}

it("supplies measured entry timing with evidence instead of turning the unknown template into route safety", () => {
  const env = environment();
  const before = JSON.stringify(env.state.raw);
  const facts = buildFacts(env);
  const observation = asRecord(asArray(facts.route_relic_observations)[0]);
  expect(observation).toMatchObject({ relic_id: "PLANISPHERE", map_room_type: "Unknown", observed_hp_gain: 5, observations: 6 });
  expect(observation.evidence).toEqual(fixture.observations.map((row: Record<string, unknown>) => ({ run: row.run, floor: row.floor, turn: row.turn })));
  expect(observation.trigger).toContain("战斗出牌之前");
  expect(observation.projection_note).toContain("不在路线投影上再加5");
  expect(observation.limits).toContain("满血截断、其他房型及择路收益尚未验证");
  expect(facts.hp).toBe("10/77 (13%)");
  expect(JSON.stringify(env.state.raw)).toBe(before);
});

it.each(["map_before", "reward", "rest"])("delivers the observation in the production %s question, keeping all original options", (board) => {
  const withRelic = question(environment(board));
  const withoutRelic = question(environment(board, removeRelic));
  expect(withRelic.label).toBe(withoutRelic.label);
  expect(["map/route-plan", "reward/card", "rest/choose"]).toContain(withRelic.label);
  const facts = asRecord(withRelic.state.facts);
  expect(asRecord(asArray(facts.route_relic_observations)[0]).observed_hp_gain).toBe(5);
  expect(asRecord(withoutRelic.state.facts)).not.toHaveProperty("route_relic_observations");
  expect(withRelic.questions).toEqual(withoutRelic.questions);
  expect(JSON.stringify(withRelic.deepseek?.baseline)).toBe(JSON.stringify(withoutRelic.deepseek?.baseline));
  // Relic inventory changes; the numeric route blocks and original decision inputs do not.
  const { facts: _withFacts, ...withState } = withRelic.state;
  const { facts: _withoutFacts, ...withoutState } = withoutRelic.state;
  if (withState.run_brief) {
    const brief = asRecord(withState.run_brief);
    brief.relics = asArray(brief.relics).filter((name) => name !== "活动星图");
  }
  expect(withState).toEqual(withoutState);
});

it("does not add the heal again to the planned boss HP, including after an already healed room", () => {
  const withRelic = environment();
  const withoutRelic = environment("map_before", removeRelic);
  for (const env of [withRelic, withoutRelic]) {
    env.screenMemory.routePlan = { runId: "HMVJKM56S4Q8", act: 2, floor: 30, hpPct: 10 / 77,
      summary: "fixed", path: [
        { row: 13, col: 4, type: "Unknown", hpOnArrival: 10 / 77 },
        { row: 14, col: 4, type: "RestSite", hpOnArrival: 6 / 77 },
        { row: 15, col: 3, type: "Boss", hpOnArrival: 29 / 77 },
      ] };
  }
  expect(routeEntry(withRelic).project(10, 77)).toBe(29);
  expect(routeEntry(withoutRelic).project(10, 77)).toBe(29);
  expect(routeEntry(withRelic).project(0, 77)).toBe(0);
  const entry = environment("combat_entry");
  expect(entry.state.run?.current_hp).toBe(15);
  expect(buildFacts(entry).hp).toBe("15/77 (19%)");
});

it("leaves other characters and inactive relics unchanged, and accepts the normalized Silent id", () => {
  for (const character of ["IRONCLAD", "unknown", ""]) {
    const facts = buildFacts(environment("map_before", (raw) => { asRecord(raw.run).character_id = character; }));
    expect(facts).not.toHaveProperty("route_relic_observations");
  }
  expect(buildFacts(environment("map_before", (raw) => {
    for (const relic of asArray(asRecord(raw.run).relics).map(asRecord)) {
      if (relic.relic_id === "PLANISPHERE") relic.is_melted = true;
    }
  }))).not.toHaveProperty("route_relic_observations");
  expect(buildFacts(environment("map_before", (raw) => { asRecord(raw.run).character_id = "silent"; })))
    .toHaveProperty("route_relic_observations");
});
