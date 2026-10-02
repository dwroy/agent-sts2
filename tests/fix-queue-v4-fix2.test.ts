/**
 * The V4.2/V4.3 A8 windows' queued code bugs (notes/fix-queue-v4.md, the second batch). One describe per fix, each on
 * the logged board of its evidence (tests/logged-states/fix2/, states.jsonl lines as the mod sent them) or the logged
 * numbers written into the test; the knowledge is the fixed test data (tests/logged-states/game-data.json, the fixture
 * monster DB), never the refreshing files; no model call, nothing written under logs/.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { parseGameState } from "../src/mod/schema.js";
import { calibratedWinProb, type FightSampleResult } from "../src/sim/boss-sim.js";
import { BUILD_SIM_CALIBRATION_SAMPLES } from "../src/sim/build-sim.js";
import { actBossDefeated, calibratedFloor, withBossSim } from "../src/sim/build-sim-facts.js";
import type { DeckRunRequest, DeckRunResult } from "../src/sim/build-sim-pool.js";
import type { JsonValue } from "../src/util/json.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { ask, decide, env, setupOneshotTests, type Raw } from "./oneshot-support.js";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "logged-states", "fix2");
/** A fresh copy of one logged state of a fixture file ({ source, states }). */
const fixture = (file: string, key: string): Raw => {
  const raw = JSON.parse(readFileSync(join(DIR, `${file}.json`), "utf8")) as { states: Record<string, Raw> };
  const state = raw.states[key];
  if (!state) throw new Error(`${file} has no state ${key}`);
  return state;
};

setupOneshotTests();

describe("1. B3 right after an act boss: no simulation against the boss just killed (build-sim-facts:387)", () => {
  beforeAll(() => setMonsterDbForTests(FIXTURE_DB));
  afterAll(() => setMonsterDbForTests(null));
  /** A runner that records the calls and fails them (a simulation that ran shows up as the error). */
  const counting = () => {
    const calls: DeckRunRequest[] = [];
    return { calls, runner: { run: (request: DeckRunRequest) => (calls.push(request), Promise.reject(new Error("ran"))) } };
  };

  it("7PWU4CD3QCP3 F17 reward (the Ceremonial Beast dead, boss_id still its id): not simulated, said so, the clock kept", async () => {
    const raw = fixture("7pwu-f17-boss-reward", "reward");
    const e = env(raw);
    expect(actBossDefeated(e.state)).toBe(true);
    const before = decide(e);
    const { calls, runner } = counting();
    const { decision, record } = await withBossSim(before, e, { runner, samples: 8, db: FIXTURE_DB, mm: FIXTURE_MM });
    expect(calls).toHaveLength(0);
    expect(record).toMatchObject({ skipped: expect.stringContaining("next act's boss is not known"), boss: "CEREMONIAL_BEAST" });
    const facts = ask(decision).state["facts"] as Record<string, JsonValue>;
    const was = ask(before).state["facts"] as Record<string, JsonValue>;
    expect(String(facts["act_boss_sim"])).toContain("本幕 boss 已经打完");
    expect(facts["act_boss_clock"]).toEqual(was["act_boss_clock"]);
    // No option carries a boss_sim line, the instructions are as they were.
    const pick = ask(decision).questions["pick"];
    const pickBefore = ask(before).questions["pick"];
    expect(pick?.type === "choice" && pickBefore?.type === "choice" && pick.criteria).toEqual(pickBefore?.type === "choice" && pickBefore.criteria);
    expect(pick?.type === "choice" && pick.instructions).toBe(pickBefore?.type === "choice" && pickBefore.instructions);
  });

  it("the same board before the boss floor, or on the next act's first map (act_id moved on) still simulates", async () => {
    const earlier = fixture("7pwu-f17-boss-reward", "reward");
    (earlier["run"] as Raw)["floor"] = 16;
    // A boss the fixture monster DB has (it has no Ceremonial Beast), so the simulation gets as far as the runner.
    (earlier["run"] as Raw)["boss_id"] = "SOUL_FYSH_BOSS";
    expect(actBossDefeated(parseGameState(earlier))).toBe(false);
    const nextAct = fixture("7pwu-f17-boss-reward", "reward");
    (nextAct["run"] as Raw)["act_id"] = "1";
    expect(actBossDefeated(parseGameState(nextAct))).toBe(false);
    const inFight = fixture("7pwu-f17-boss-reward", "reward");
    inFight["in_combat"] = true;
    expect(actBossDefeated(parseGameState(inFight))).toBe(false);
    const e = env(earlier);
    const { calls, runner } = counting();
    const { record } = await withBossSim(decide(e), e, { runner, samples: 8, db: FIXTURE_DB, mm: FIXTURE_MM });
    expect(calls.length).toBeGreaterThan(0);
    expect(record).toMatchObject({ error: expect.stringContaining("ran") });
  });
});

describe("2. the low-win-rate note's floor is the calibration's, not a written number (build-sim-facts:458)", () => {
  beforeAll(() => setMonsterDbForTests(FIXTURE_DB));
  afterAll(() => setMonsterDbForTests(null));
  /** Every sample of every deck lost (the Crab / Test Subject questions of V4.2 sat at the floor on every option). */
  const lost = (): FightSampleResult => ({ won: false, died: true, capped: false, timeUp: false, turns: 5, hpLoss: 60, revived: 0, drunk: [], enemyHpLeft: 120, lossByTurn: [], dmgByTurn: [], incomingByTurn: [], enemyLossByTurn: [], policyTurns: 5, policyNodes: 0 });
  const losing = { run: (req: DeckRunRequest): Promise<DeckRunResult> => Promise.resolve({ outcomes: req.decks.map(() => req.orders.map(() => Array.from({ length: req.samples }, lost))), complete: Array.from({ length: req.samples }, (_, i) => i), timedOut: false, elapsedMs: 1, workers: 0 }) };

  it("0 wins read the map's floor (4.7% with the B5 \"pre\" map; the note said 约 8%, V4.2's live floor was 6.24%)", async () => {
    expect(calibratedFloor()).toBe(calibratedWinProb(0, BUILD_SIM_CALIBRATION_SAMPLES, "pre"));
    const raw = fixture("7pwu-f17-boss-reward", "reward");
    (raw["run"] as Raw)["floor"] = 16;
    (raw["run"] as Raw)["boss_id"] = "SOUL_FYSH_BOSS";
    const e = env(raw);
    const { decision, record } = await withBossSim(decide(e), e, { runner: losing, samples: 8, db: FIXTURE_DB, mm: FIXTURE_MM });
    const sim = (ask(decision).state["facts"] as Record<string, JsonValue>)["act_boss_sim"] as Record<string, JsonValue>;
    const floor = `${(calibratedFloor() * 100).toFixed(1)}%`;
    expect(String(sim["low_win_rate"])).toContain(`校准后的数不会低于 ${floor}`);
    expect(String(sim["low_win_rate"])).not.toContain("约 8%");
    // What the options read at 0 wins is that same floor.
    expect((record as Record<string, Record<string, number>>)["base"]!["win_cal"]).toBeCloseTo(calibratedFloor(), 4);
  });
});
