import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadV6Knowledge } from "../src/v6/knowledge.js";
import { v6ProjectionInputs } from "../src/v6/projection-input.js";
import { assembleV6History } from "../src/sim/v6-history-pack.js";
import { pooledMetrics } from "./v6-build-metric-fixtures.js";
import { board, env, setupOneshotTests } from "./oneshot-support.js";
import { stubJev, type Raw } from "./oneshot-support.js";
import { loadConfig } from "../src/core/config.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { setCardUpgradesForTests } from "../src/knowledge/card-upgrades.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import { V6ProjectionRuntime } from "../src/v6/projection-runtime.js";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import { V6CardResultsEngine, cardResultKnown, type V6CardResults } from "../src/sim/v6-card-results.js";
import { FixedRunner, request } from "./v6-projection-fixture.js";
import { loggedKnowledge } from "./logged.js";
import { startFixtureServer } from "./fixture-http.js";
import { envelope, sendJson } from "./support.js";
const knowledgePath = vi.hoisted(() => ({ root: "" }));
vi.mock("../src/knowledge/files.js", async original => ({
  ...await original<typeof import("../src/knowledge/files.js")>(), get KNOWLEDGE_DIR() { return knowledgePath.root; },
}));
setupOneshotTests();
const roots: string[] = [];
beforeEach(() => { vi.spyOn(performance, "now").mockReturnValue(0); });
afterEach(() => { roots.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })); vi.restoreAllMocks(); vi.unstubAllEnvs(); setKnowledgeCharacter(null); });
function fixture(history = true) {
  vi.stubEnv("V6_BUILD", "on");
  const root = mkdtempSync(join(tmpdir(), "v6-input-")); roots.push(root);
  knowledgePath.root = root;
  const dir = join(root, "characters/silent"); mkdirSync(dir, { recursive: true });
  const evidence = [{ run_id: "old", floor: 1 }];
  writeFileSync(join(dir, "build-cores.json"), JSON.stringify({ schema: "build-cores-v1", character: "silent", entries: [{
    schema: "build-core-v1", direction: "TEST", name: "fixture", status: "candidate", scope: { character: "silent", ascensions: [0, 10] },
    card_pool: { TEST_CARD: { roles: ["fixture"], contribution: "fixture", upgraded_matters: false, combos: ["TEST_COMBO"], evidence } },
    combos: [{ id: "TEST_COMBO", types: ["must_pick_minimal", "common", "max_cards", "max_dpr"], boss: null,
      cards: [{ id: "TEST_CARD", count: 1, upgraded: false }], prerequisites: null, metrics: pooledMetrics(),
      fits: { bosses_positive: [], bosses_negative: [], routes: [], situations: [] }, evidence, confidence: "low", linked_experience: [] }],
    pivot_signals: [], failure_modes: [], linked_experience: [], linked_reflex: [] }] }));
  const at = "2020-01-01T00:00:00.000Z";
  const pack = assembleV6History({ character: "silent", cutoff: at, generated_at: at,
    sources: ["coverage", "frames", "fights", "opportunities"].map(name => ({ name, sha256: "a".repeat(64), bytes: 1 })),
    coverage: [{ run_id: "old", ended: at, ascension: 10, first_stop: null, first_trial_final_victory: false, final_including_sl_victory: false }],
    frames: [{ floor: 17, act_id: "0", boss_id: "SOUL_FYSH" }, { floor: 33, act_id: "1", boss_id: "KNOWLEDGE_DEMON" }].map(p => ({
      ...p, run_id: "old", ts: at, screen: "COMBAT", in_combat: true, turn: 1, hp: 40, max_hp: 60, gold: 0, deck: [] })),
    fights: [{ floor: 17, boss: "SOUL_FYSH" }, { floor: 33, boss: "KNOWLEDGE_DEMON" }].map(p => ({
      ...p, run_id: "old", ascension: 10, attempt: 1, started_at: at, ended_at: at,
      result: "won", entry: { ts: at, hp: 40, max_hp: 60 } })),
    opportunities: { schema: "construction-opportunities-v1", character: "silent", generated: at, cutoff: at,
      digest: "b".repeat(64), limitations: [], rows: [] }, combo_metrics: [], checkpointFloors: [17, 33] });
  if (history) writeFileSync(join(dir, "v6-history.json"), JSON.stringify(pack));
  const e = env(board("xljq-f5-reward", "reward"));
  Object.assign(e.state.run!.raw, { character_id: "SILENT", ascension: 10, boss_id: "SOUL_FYSH_BOSS" }); e.state.run!.ascension = 10;
  const loaded = loadV6Knowledge(root, "silent").cores;
  expect(loaded.status === "loaded" ? [] : loaded).toEqual([]);
  return { root, dir, e };
}
it("keeps the R404 multi-frame replay out of the legacy single-state fixture glob", () => {
  const directory = new URL("./logged-states/", import.meta.url);
  const boards = readdirSync(directory).filter(name => name.endsWith(".json") && !["game-data.json", "boss-clock-boards.json"].includes(name));
  expect(boards).not.toContain("v6-r404-card-rewards.json");
  for (const name of boards) {
    const frozen = JSON.parse(readFileSync(new URL(name, directory), "utf8"));
    expect(frozen.state, name).toEqual(expect.any(Object));
  }
});

it("admits combat snapshots only for explicit idle preparation without bypassing off", async () => {
  const { root, e } = fixture(), event = vi.fn();
  e.state.in_combat = true;
  e.state.screen = "COMBAT";
  e.state.raw.in_combat = true;
  e.state.raw.screen = "COMBAT";
  const before = JSON.stringify(e.state);
  const input = v6ProjectionInputs(root, undefined, event);
  expect(await input(e, "pick")).toBeNull();
  expect(event).not.toHaveBeenCalled();
  const idle = await input(e, "pick", true);
  expect(idle).not.toBeNull();
  expect(idle!.situation.state).toBe(e.state);
  expect(idle!.situation.options).toEqual([]);
  expect(idle!.factory.create(idle!.situation).status).toBe("ready");
  expect(event).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(e.state)).toBe(before);
  vi.stubEnv("V6_BUILD", "off");
  expect(await v6ProjectionInputs("/must/not/read", undefined, event)(e, "pick", true)).toBeNull();
  expect(event).toHaveBeenCalledTimes(1);
});

it.each(["THE_KIN", "THE_KIN_BOSS", "KAISER_CRAB", "KAISER_CRAB_BOSS", "CRUSHER+ROCKET", "SOUL_FYSH_BOSS"])(
  "preserves the visible boss %s in the real production input", async boss => {
    const { root, e } = fixture();
    e.state.run!.raw.boss_id = boss;
    e.state.raw.map = { nodes: [{ row: 16, col: 0, node_type: "Boss", is_boss: true, children: [] }],
      boss_node: { row: 16, col: 0 }, available_nodes: [], current_node: null };
    const input = await v6ProjectionInputs(root)(e, "pick");
    expect(input!.situation.visibleBosses).toEqual([{ act: 1, floor: 17,
      boss: boss === "CRUSHER+ROCKET" ? "KAISER_CRAB" : boss.replace(/_BOSS$/, "") }]);
  });

it("does not replace an unrecognized visible boss with a historical one", async () => {
  const { root, e } = fixture();
  e.state.run!.raw.boss_id = "UNOBSERVED_BOSS";
  e.state.raw.map = { nodes: [{ row: 16, col: 0, node_type: "Boss", is_boss: true, children: [] }],
    boss_node: { row: 16, col: 0 }, available_nodes: [], current_node: null };
  expect((await v6ProjectionInputs(root)(e, "pick"))!.situation.visibleBosses).toBeUndefined();
});

it("preserves the actual run Boss on map-less reward and idle combat frames", async () => {
  const { root, e } = fixture();
  e.state.raw.map = null;
  e.state.run!.raw.boss_id = "WATERFALL_GIANT_BOSS";
  const input = v6ProjectionInputs(root);
  expect((await input(e, "pick"))!.situation.visibleBosses).toEqual([{ act: 1, floor: 17, boss: "WATERFALL_GIANT" }]);
  e.state.in_combat = true;
  expect((await input(e, "pick", true))!.situation.visibleBosses).toEqual([{ act: 1, floor: 17, boss: "WATERFALL_GIANT" }]);
});

it("uses only same-run, same-act, already observed map memory for a missing Boss floor", async () => {
  const { root, e } = fixture(false);
  e.state.raw.map = null;
  e.screenMemory.lastMap = { runId: String(e.state.raw.run_id), act: String(e.state.run!.raw.act_id),
    floor: 1, nodes: [], available: [], boss: { row: 16, col: 0 } };
  const input = v6ProjectionInputs(root);
  expect((await input(e, "pick"))!.situation.visibleBosses).toEqual([{ act: 1, floor: 17, boss: "SOUL_FYSH" }]);
  for (const invalid of [{ runId: "another-run" }, { act: "another-act" }, { floor: 100 }, { floor: null }]) {
    const original = { ...e.screenMemory.lastMap };
    Object.assign(e.screenMemory.lastMap, invalid);
    expect((await input(e, "pick"))!.situation.visibleBosses).toBeUndefined();
    e.screenMemory.lastMap = original;
  }
});

it("keeps the target unknown when neither map memory nor a frozen checkpoint floor is available", async () => {
  const { root, e } = fixture(false);
  e.state.raw.map = null;
  expect((await v6ProjectionInputs(root)(e, "pick"))!.situation.visibleBosses).toBeUndefined();
});

it.each([[2, 1, 17, "WATERFALL_GIANT"], [19, 2, 33, "KAISER_CRAB"]] as const)(
  "routes the real R404 F%i combat-to-reward loop through production input, factory, A and Jev", async (floor, act, bossFloor, boss) => {
    const { root } = fixture();
    setKnowledgeCharacter("silent");
    for (const [key, value] of Object.entries({ V6_CARD_DECIDER: "jev", V6_POTION_DECIDER: "brain", V6_SHOP_DECIDER: "brain",
      V6_REST_DECIDER: "brain", V6_DIRECTION_REPLAN: "off", V6_COMBAT_ENTRIES: "off", BOSS_SIM_BUILD: "off" })) vi.stubEnv(key, value);
    const frozen = JSON.parse(readFileSync(new URL("./v6-fixtures/v6-r404-card-rewards.json", import.meta.url), "utf8"));
    const rewardKnowledge = makeKnowledge({ cards: frozen.knowledge_fixture.cards }, "cache");
    const knowledge = { ...loggedKnowledge, card: (id: string | null | undefined) => rewardKnowledge.card(id) ?? loggedKnowledge.card(id) };
    setCardUpgradesForTests(frozen.knowledge_fixture.card_upgrades);
    const combat: Raw = frozen.states[`f${floor}-combat`], reward: Raw = frozen.states[`f${floor}-reward`];
    expect(combat.map).toBeNull(); expect(reward.map).toBeNull();
    let polls = 0;
    const actions: Raw[] = [], notes: string[] = [], tables: V6CardResults[] = [], visible: unknown[] = [];
    const runner = new FixedRunner(), prepared = request();
    // Only combat outcomes/openings and the external model response are fixed. Production input/factory/routing run unchanged.
    const runtime = new V6ProjectionRuntime(new V6ProjectionEngine(runner), async () => null, () => {}, v6ProjectionInputs(root), {
      engine: new V6CardResultsEngine(runner, () => 0, 20),
      context(_env, input) {
        visible.push(input.situation.visibleBosses);
        return { fingerprint: `frozen-R404-${floor}`, prepareCurrent: (target, option) => prepared.prepare(target, option.state, option) };
      },
      record(_env, table) { tables.push(table); },
    });
    const server = await startFixtureServer((req, res) => {
      if (req.method === "GET") return sendJson(res, 200, envelope(polls++ === 0 ? combat : reward));
      let body = "";
      req.on("data", chunk => { body += chunk; });
      req.on("end", () => { const action = JSON.parse(body); actions.push(action);
        sendJson(res, 200, envelope({ action: action.action, status: "completed", stable: true, state: reward })); });
    });
    const base = loadConfig({}), jev = stubJev(), ask = vi.spyOn(jev, "ask");
    try {
      const stats = await runLoop({ config: { ...base, runPlan: "off", fightPlan: "off", combatPlanner: "turn", buildOneshot: "off",
        sl: { ...base.sl, enabled: false }, run: { ...base.run, character: "silent", characterId: "silent" },
        runPlanLog: join(root, "plans.jsonl"), log: { ...base.log, decisionLog: join(root, "decisions.jsonl") } },
        mode: "play", client: new ModClient({ baseUrl: server.url }), brain: null, jev, knowledge,
        v6Projection: runtime, restoreRun: false, maxDecisions: 1, maxMinutes: 1, pollIntervalMs: 1,
        onEvent: event => { if (event.type === "note") notes.push(event.message); } });
      expect(visible.length, JSON.stringify({ stats, actions, notes, polls })).toBeGreaterThan(0);
      for (const targets of visible) expect(targets).toEqual([{ act, floor: bossFloor, boss }]);
      expect(tables.length).toBeGreaterThan(0);
      // The loop may discard a stale combat decision while the reward screen arrives; every resulting table must remain usable.
      for (const table of tables) {
        expect(table.targets.filter(t => t.kind === "current")).toMatchObject([{ boss, act, floor: bossFloor }]);
        expect(["card0", "card1", "card2", "skip"].map(id => cardResultKnown(table, id))).toEqual([true, true, true, true]);
      }
      expect(stats).toMatchObject({ decisions: 1, jevCalls: 1, deepseekCalls: 0 });
      expect(ask).toHaveBeenCalledTimes(1);
      expect(actions).toEqual([{ action: "choose_reward_card", option_index: 0 }]);
      expect(notes.filter(n => n.includes("v6_unknown_to_brain"))).toEqual([]);
      expect(readFileSync(join(root, "v6-build.jsonl"), "utf8")).not.toContain("v6_unknown_to_brain");
    } finally { await server.close(); }
  });
