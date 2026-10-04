/**
 * B3 (docs/boss-sim.md §11): the act boss simulated for each option of a deck-building question. On the one-shot
 * fixture boards with a fixed monster DB and move model (tests/boss-sim-build-fixture.ts, not the refreshed files), the
 * logged knowledge and the fixture upgrade table: the synthetic opening, the option comparison (common random numbers,
 * determinism, the pool equal to the serial runner), the deadline, the low-confidence mark, the failure fallback to the
 * clock, and BOSS_SIM_BUILD=off leaving the question byte for byte as it was. No model call; nothing written under
 * logs/ or .cache.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { parseGameState } from "../src/mod/schema.js";
import { sampleSeed } from "../src/sim/boss-sim.js";
import { bossOpening, syntheticBossStart } from "../src/sim/boss-start.js";
import { compareOptions } from "../src/sim/build-sim.js";
import { BOSS_SIM_NOTE, LOW_CONFIDENCE, withBossSim } from "../src/sim/build-sim-facts.js";
import { BuildSimPool, SerialDeckRunner, type DeckRunRequest } from "../src/sim/build-sim-pool.js";
import type { JsonValue } from "../src/util/json.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { loggedKnowledge } from "./logged.js";
import { ask, board, decide, env, FakeDeepSeek, play, setupOneshotTests, type Raw } from "./oneshot-support.js";
import { mainMenuPayload } from "./scenarios.js";

setupOneshotTests();
beforeAll(() => setMonsterDbForTests(FIXTURE_DB));
afterAll(() => setMonsterDbForTests(null));

const deps = { db: FIXTURE_DB, mm: FIXTURE_MM };
const REWARD = () => board("xljq-f5-reward", "reward");

/** The reward board with more relics and a potion in the belt. */
function withRelics(raw: Raw, relics: string[], potion?: string): Raw {
  const run = raw["run"] as Raw;
  run["relics"] = [...(run["relics"] as Raw[]), ...relics.map((relic_id) => ({ relic_id, name: relic_id, stack: null, is_melted: false }))];
  if (potion) (run["potions"] as Raw[])[0] = { index: 0, potion_id: potion, name: potion, occupied: true, usage: "CombatOnly", target_type: "AnyPlayer", can_use: false };
  return raw;
}

function criteria(decision: ReturnType<typeof decide>): Record<string, Record<string, JsonValue>> {
  const q = ask(decision).questions["pick"];
  if (q?.type !== "choice") throw new Error("expected a choice");
  return Object.fromEntries(Object.entries(q.criteria).map(([k, v]) => [k, JSON.parse(v ?? "{}") as Record<string, JsonValue>]));
}

describe("B3 synthetic boss opening", () => {
  it("the boss's parts from the monster DB: board order, HP at the nearest ascension, first moves, its own powers only", () => {
    const kin = bossOpening("THE_KIN_BOSS", 9, FIXTURE_DB)!;
    expect(kin.asc).toBe(8);
    expect(kin.exact).toBe(false);
    expect(kin.parts.map((p) => p.id)).toEqual(["KIN_FOLLOWER", "KIN_FOLLOWER", "KIN_PRIEST"]);
    // A half-way median: the copies take either side; two first moves logged: one each.
    expect(kin.parts.map((p) => p.hp)).toEqual([13, 12, 40]);
    expect(kin.parts.map((p) => p.move)).toEqual(["POWER_DANCE_MOVE", "QUICK_SLASH_MOVE", "BEAM_MOVE"]);
    expect(kin.parts[0]!.powers).toEqual({ MINION_POWER: 1 });
    // Vulnerable seen on turn 1 in every fight is ours, never the boss's: Artifact is its own.
    expect(bossOpening("SOUL_FYSH_BOSS", 9, FIXTURE_DB)!.parts[0]!.powers).toEqual({ ARTIFACT_POWER: 1 });
    expect(bossOpening("NO_SUCH_BOSS", 9, FIXTURE_DB)).toBeNull();
  });

  it("the start: every card in the draw pile, the hand only potions, the entry HP, fight-start relics on turn 1", () => {
    const raw = withRelics(REWARD(), ["VAJRA", "ANCHOR", "RED_MASK", "LANTERN", "BAG_OF_PREPARATION", "BELLOWS"], "BLOCK_POTION");
    const state = parseGameState(raw);
    const start = syntheticBossStart(state, loggedKnowledge, "THE_KIN_BOSS", 40, deps);
    const input = start.input;
    expect(input.piles.draw).toHaveLength((raw["run"] as Raw)["deck"] instanceof Array ? ((raw["run"] as Raw)["deck"] as unknown[]).length : -1);
    expect(input.piles.discard).toEqual([]);
    expect(input.solver.hand.map((c) => c.type)).toEqual(["Potion"]);
    expect(input.solver.player.hp).toBe(40);
    expect(input.solver.player.block).toBe(10);
    expect(input.solver.player.strengthNow ?? input.playerPowers["STRENGTH_POWER"]).toBe(1);
    expect(input.solver.player.energy).toBe(4);
    expect(input.options?.drawFirst).toBe(7);
    // Red Mask: every enemy Weak 1 (the Kin's shown hits x0.75).
    expect(input.solver.enemies.map((e) => e.weak)).toEqual([1, 1, 1]);
    expect(input.enemies.map((e) => e.move)).toEqual(["POWER_DANCE_MOVE", "QUICK_SLASH_MOVE", "BEAM_MOVE"]);
    expect(start.relics.applied).toEqual(expect.arrayContaining(["VAJRA", "ANCHOR", "RED_MASK", "LANTERN", "BAG_OF_PREPARATION"]));
    expect(start.relics.unmodelled.length).toBeGreaterThan(0);
    expect(start.boss.name).toBe("同族");
  });

  it("a random potion stays out of the fight (potion-mc prices it live), as on any logged board", () => {
    const start = syntheticBossStart(parseGameState(withRelics(REWARD(), [], "SWIFT_POTION")), loggedKnowledge, "SOUL_FYSH_BOSS", 50, deps);
    expect(start.input.solver.hand).toEqual([]);
  });

  it("Fruit Juice held: gone by the boss (drunk at the first combat turn), the start builds (GWGT F22-F27 threw)", () => {
    const start = syntheticBossStart(parseGameState(withRelics(REWARD(), [], "FRUIT_JUICE")), loggedKnowledge, "SOUL_FYSH_BOSS", 50, deps);
    expect(start.input.solver.hand.some((card) => card.cardId.includes("FRUIT_JUICE"))).toBe(false);
    expect(start.input.piles.draw.length).toBeGreaterThan(0);
  });
});

describe("B3 option comparison", () => {
  const start = () => syntheticBossStart(parseGameState(REWARD()), loggedKnowledge, "SOUL_FYSH_BOSS", 54, deps).input;

  it("common random numbers: the same deck twice differs by exactly 0; runs repeat sample for sample", async () => {
    const base = start();
    const strike = base.piles.draw.find((c) => c.cardId.startsWith("STRIKE"))!;
    const options = [
      { key: "same", change: { piles: { ...base.piles, draw: base.piles.draw.slice() } } },
      { key: "skip", change: null },
      { key: "strike", change: { piles: { ...base.piles, draw: [...base.piles.draw, { ...strike, index: 991 }] } } },
    ];
    const a = await compareOptions(new SerialDeckRunner(), base, options, { samples: 24 });
    const b = await compareOptions(new SerialDeckRunner(), base, options, { samples: 24 });
    expect(a).toEqual({ ...b, elapsedMs: a.elapsedMs });
    expect(a.samples).toBe(24);
    const same = a.options.find((o) => o.key === "same")!;
    expect(same.diff).toMatchObject({ raw: 0, se: 0, cal: 0, calSe: 0 });
    expect(same.win).toBe(a.base.win);
    expect(a.options.find((o) => o.key === "skip")!.diff).toBeNull();
    expect(a.base.win).toBeGreaterThan(0);
  });

  it("the worker pool gives the serial runner's samples; a mixture takes each sample from one member", async () => {
    const base = start();
    const drop = { piles: { ...base.piles, draw: base.piles.draw.slice(1) } };
    const req: DeckRunRequest = { base, decks: [{}, drop, {}, drop], stripes: [null, null, { at: 0, of: 2 }, { at: 1, of: 2 }], orders: [null], samples: 12, seed: 3 };
    const serial = await new SerialDeckRunner().run(req);
    const pool = new BuildSimPool(2);
    try {
      const threaded = await pool.run(req);
      expect(threaded.outcomes).toEqual(serial.outcomes);
      expect(threaded.complete).toEqual(serial.complete);
    } finally {
      await pool.close();
    }
    expect(serial.outcomes[2]![0]!.filter(Boolean)).toHaveLength(6);
    expect(serial.outcomes[3]![0]![1]).toEqual(serial.outcomes[1]![0]![1]);
    expect(sampleSeed(3, 5)).toBe(sampleSeed(3, 5));
  });

  it("the deadline: tasks stop, the samples every deck finished are the ones compared, and it says so", async () => {
    const base = start();
    let t = 0;
    const now = () => (t += 1);
    const options = [{ key: "less", change: { piles: { ...base.piles, draw: base.piles.draw.slice(1) } } }];
    // Every clock read is 1 ms: the serial runner reads it once per task block (8 samples x 2 decks).
    const cut = await compareOptions(new SerialDeckRunner(), base, options, { samples: 64, deadlineMs: 4, now });
    expect(cut.timedOut).toBe(true);
    expect(cut.samples).toBeGreaterThan(0);
    expect(cut.samples).toBeLessThan(64);
    expect(cut.samples % 8).toBe(0);
    const full = await compareOptions(new SerialDeckRunner(), base, options, { samples: cut.samples });
    expect(cut.base.win).toBe(full.base.win);
    expect(cut.options[0]!.diff).toEqual(full.options[0]!.diff);
  });
});

describe("B3 boss simulation on the questions", () => {
  const setup = { runner: new SerialDeckRunner(), samples: 16, ...deps };

  it("card reward: every option's boss_sim line, facts.act_boss_sim at the clock's place, the note; nothing dropped", async () => {
    const e = env(REWARD());
    const before = decide(e);
    const { decision, record } = await withBossSim(before, e, setup);
    const after = criteria(decision);
    const was = criteria(before);
    expect(Object.keys(after)).toEqual(Object.keys(was));
    for (const [key, option] of Object.entries(after)) {
      const { boss_sim: line, ...rest } = option;
      expect(rest).toEqual(was[key]);
      expect(String(line)).toMatch(/^打本幕 boss（灵魂异鱼，A9）的模拟：/);
    }
    expect(String(after["skip"]!["boss_sim"])).toContain("不改变牌组：胜率");
    expect(String(after["card0"]!["boss_sim"])).toMatch(/当前牌组胜率 \d+%；选这个 \d+%（[+−][\d.]+ ± [\d.]+），赢局掉血中位 .+，约 .+ 回合（16 次模拟，校准后/);
    const facts = ask(decision).state["facts"] as Record<string, JsonValue>;
    const keys = Object.keys(ask(before).state["facts"] as Record<string, JsonValue>);
    expect(Object.keys(facts)).toEqual(keys.map((k) => (k === "act_boss_clock" ? "act_boss_sim" : k)));
    expect(facts["act_boss_sim"]).toMatchObject({ entry_hp: expect.stringContaining("按当前血量"), samples: expect.stringContaining("每个选项 16 次") });
    const pick = ask(decision).questions["pick"];
    expect(pick?.type === "choice" && pick.instructions.endsWith(BOSS_SIM_NOTE)).toBe(true);
    expect(record).toMatchObject({ boss: "SOUL_FYSH", samples: 16, entry_source: "hp_now" });
  });

  it("a low-confidence boss (the Kaiser Crab here) is marked, with why; a relic the fight does not model is not simulated", async () => {
    // B4: which bosses are low confidence is the validation data's (knowledge/characters/ironclad/boss-trust.json); this test sets its own.
    const saved = LOW_CONFIDENCE["KAISER_CRAB"];
    LOW_CONFIDENCE["KAISER_CRAB"] = "测试用的理由";
    const e = env(board("u6ru-f22-shop", "open"));
    const { decision, record } = await withBossSim(decide(e), e, { ...setup, samples: 8, deadlineMs: 60_000 }).finally(() => {
      if (saved === undefined) delete LOW_CONFIDENCE["KAISER_CRAB"];
      else LOW_CONFIDENCE["KAISER_CRAB"] = saved;
    });
    const after = criteria(decision);
    expect(record).toMatchObject({ samples: 8, timed_out: false, orders: 3 });
    expect(String(after["leave"]!["boss_sim"])).toContain("低可信，见 facts.act_boss_sim");
    expect(((ask(decision).state["facts"] as Record<string, JsonValue>)["act_boss_sim"] as Record<string, JsonValue>)["low_confidence"]).toBe("测试用的理由");
    const relics = Object.entries(after).filter(([k]) => k.startsWith("buy_relic")).map(([, o]) => String(o["boss_sim"]));
    expect(relics.some((line) => line.endsWith("效果没有建模：不模拟"))).toBe(true);
    // The removal: one line per removable card.
    expect(Object.keys(after["remove"]!["boss_sim_by_card"] as Record<string, JsonValue>).length).toBeGreaterThan(3);
  }, 60_000);

  it("rest site: resting projects a higher entry HP; each smith option upgrades its card", async () => {
    const e = env(board("7b0d-f8-rest", "rest"));
    const { decision, record } = await withBossSim(decide(e), e, { ...setup, samples: 8, deadlineMs: 60_000 });
    const after = criteria(decision);
    expect(String(after["o0"]!["boss_sim"])).toMatch(/选这个（进场 \d+ 血）/);
    const options = (record as Record<string, Record<string, Record<string, number>>>)["options"]!;
    expect(options["o0"]!["hp"]).toBeGreaterThan(options["o1:c0"]!["hp"]!);
    expect(Object.keys(after).filter((k) => k.startsWith("o1:")).every((k) => String(after[k]!["boss_sim"]).includes("选这个"))).toBe(true);
  }, 60_000);

  it("cut short by the clock under 300 samples (of 1000 asked): no numbers, as a failed simulation (Dai 2026-10-02)", async () => {
    const e = env(REWARD());
    const before = decide(e);
    let t = 0;
    const clock = () => (t += 400);
    const { decision, record } = await withBossSim(before, e, { ...setup, samples: 1000, now: clock });
    const facts = ask(decision).state["facts"] as Record<string, JsonValue>;
    expect(String(facts["act_boss_sim"])).toMatch(/不足 300 次/);
    expect(criteria(decision)).toEqual(criteria(before));
    expect(record).toMatchObject({ error: expect.stringContaining("不足 300 次") });
  });

  it("a failed simulation keeps the act boss clock and says so", async () => {
    const e = env(REWARD());
    const before = decide(e);
    const broken = { ...setup, runner: { run: () => Promise.reject(new Error("pool down")) } };
    const { decision, record } = await withBossSim(before, e, broken);
    const facts = ask(decision).state["facts"] as Record<string, JsonValue>;
    expect(facts["act_boss_clock"]).toEqual((ask(before).state["facts"] as Record<string, JsonValue>)["act_boss_clock"]);
    expect(String(facts["act_boss_sim"])).toContain("act_boss_clock 仍是 boss 时钟的估计");
    expect(criteria(decision)).toEqual(criteria(before));
    expect(record).toMatchObject({ error: expect.stringContaining("pool down") });
  });
});

describe("BOSS_SIM_BUILD", () => {
  it("defaults on; off and on parse; anything else is a config problem", () => {
    expect(loadConfig({} as NodeJS.ProcessEnv).bossSimBuild).toBe("on");
    expect(loadConfig({ BOSS_SIM_BUILD: "off" } as NodeJS.ProcessEnv).bossSimBuild).toBe("off");
    expect(() => loadConfig({ BOSS_SIM_BUILD: "maybe" } as NodeJS.ProcessEnv)).toThrow(/BOSS_SIM_BUILD/);
  });

  it("off: DeepSeek's card reward question byte for byte as the screen built it; on: the same question plus the simulation", async () => {
    const expected = ask(decide(env(REWARD())));
    const pick = expected.questions["pick"];
    if (pick?.type !== "choice") throw new Error("expected a choice");
    const off = new FakeDeepSeek(() => "skip");
    await play([REWARD(), mainMenuPayload()], off, {}, { buildSim: null });
    expect(off.calls[0]!.label).toBe("reward/card");
    expect(JSON.stringify(off.calls[0]!.criteria)).toBe(JSON.stringify(pick.criteria));
    expect(JSON.stringify(off.calls[0]!.state)).toBe(JSON.stringify(expected.state));
    const on = new FakeDeepSeek(() => "skip");
    const { records } = await play([REWARD(), mainMenuPayload()], on, {}, { buildSim: { runner: new SerialDeckRunner(), samples: 8, ...deps } });
    expect(Object.keys(on.calls[0]!.criteria)).toEqual(Object.keys(pick.criteria));
    expect(Object.values(on.calls[0]!.criteria).every((v) => String(v).includes("boss_sim"))).toBe(true);
    expect(records.find((r) => r["label"] === "reward/card")?.["boss_sim"]).toMatchObject({ boss: "SOUL_FYSH", samples: 8 });
  }, 60_000);
});
