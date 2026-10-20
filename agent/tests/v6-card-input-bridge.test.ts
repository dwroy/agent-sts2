import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadV6Knowledge } from "../src/v6/knowledge.js";
import { v6ProjectionInputs } from "../src/v6/projection-input.js";
import { assembleV6History } from "../src/sim/v6-history-pack.js";
import { pooledMetrics } from "./v6-build-metric-fixtures.js";
import { board, env, setupOneshotTests } from "./oneshot-support.js";
setupOneshotTests();
const roots: string[] = [];
afterEach(() => { roots.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })); vi.unstubAllEnvs(); });
function fixture(history = true) {
  vi.stubEnv("V6_BUILD", "on");
  const root = mkdtempSync(join(tmpdir(), "v6-input-")); roots.push(root);
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
    frames: [{ run_id: "old", ts: at, floor: 17, act_id: "0", screen: "COMBAT", in_combat: true, turn: 1,
      boss_id: "SOUL_FYSH", hp: 40, max_hp: 60, gold: 0, deck: [] }], fights: [{ run_id: "old", ascension: 10, floor: 17, boss: "SOUL_FYSH", attempt: 1, started_at: at, ended_at: at,
      result: "won", entry: { ts: at, hp: 40, max_hp: 60 } }],
    opportunities: { schema: "construction-opportunities-v1", character: "silent", generated: at, cutoff: at,
      digest: "b".repeat(64), limitations: [], rows: [] }, combo_metrics: [], checkpointFloors: [17] });
  if (history) writeFileSync(join(dir, "v6-history.json"), JSON.stringify(pack));
  const e = env(board("xljq-f5-reward", "reward"));
  Object.assign(e.state.run!.raw, { character_id: "SILENT", ascension: 10, boss_id: "SOUL_FYSH_BOSS" }); e.state.run!.ascension = 10;
  const loaded = loadV6Knowledge(root, "silent").cores;
  expect(loaded.status === "loaded" ? [] : loaded).toEqual([]);
  return { root, dir, e };
}
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
