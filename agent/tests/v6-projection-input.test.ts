import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadV6Knowledge } from "../src/v6/knowledge.js";
import { v6ProjectionInputs, v6ProjectionRequests } from "../src/v6/projection-input.js";
import { productionV6Projection } from "../src/v6/projection-runtime.js";
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
it("feeds W3 a character-owned frozen snapshot and reloads only for another run", async () => {
  const { root, dir, e } = fixture(), load = v6ProjectionRequests(root);
  const first = (await load(e, "act"))!;
  expect(first.directions.map(d => d.id)).toEqual(["TEST"]); expect(first.completionSources).toHaveLength(1);
  expect(first.targets).toEqual(expect.arrayContaining([expect.objectContaining({ floor: 17, boss: "SOUL_FYSH" })]));
  expect(first.options).toEqual([]);
  writeFileSync(join(dir, "v6-history.json"), "invalid replacement");
  const same = (await load(e, "pick"))!;
  expect(same.modelVersion).toBe(first.modelVersion); expect(same.completionSources).toHaveLength(1);
  e.state.raw.run_id = "new-run";
  expect(await load(e, "pick")).toBeNull();
  e.state.run!.raw.character_id = "IRONCLAD";
  expect(await load(e, "act")).toBeNull();
});
it("keeps disabled loading and missing production evidence explicit", async () => {
  const { root, e } = fixture(false); vi.stubEnv("V6_BUILD", "off");
  expect(productionV6Projection()).toBeUndefined(); expect(await v6ProjectionRequests("/not/read")(e, "act")).toBeNull();
  vi.stubEnv("V6_BUILD", "on");
  expect(await v6ProjectionRequests(root)(e, "pick")).toBeNull();
});
it("uses offered-card states and explicit route signatures with independent budgets", async () => {
  const { root, e } = fixture(), load = v6ProjectionRequests(root), first = (await load(e, "pick"))!;
  expect(first.options.length).toBeGreaterThan(0);
  expect(first.options.every(o => /^card\d+$/.test(o.id) && o.state.cards.length > first.baseline.state.cards.length)).toBe(true);
  expect(first.prepare(first.targets[0]!, first.baseline.state)).toBeNull();
  e.screenMemory.routePlan = { runId: String(e.state.raw.run_id), act: 1, path: [{ row: 15, col: 0, type: "RestSite" }, { row: 16, col: 0, type: "Boss" }] } as never;
  const route = (await load(e, "pick"))!;
  expect(route.contextDigest).not.toBe(first.contextDigest);
  (e.screenMemory.routePlan as any).path[0].type = "Monster";
  expect((await load(e, "pick"))!.contextDigest).not.toBe(route.contextDigest);
  expect(route.config.budgets).toMatchObject({ pick_ms: 5000, jev_ms: 5000 });
});
it("shares the frozen factory while W7 replaces resource options without changing the reward request", async () => {
  const { root, dir, e } = fixture(), input = v6ProjectionInputs(root), context = (await input(e, "pick"))!;
  writeFileSync(join(dir, "v6-history.json"), "invalid replacement");
  const again = (await input(e, "pick"))!;
  expect(again.factory).toBe(context.factory);
  const result = context.factory.create({ ...context.situation, baselineId: "leave", options: [
    { id: "rest", changes: [{ kind: "heal", amount: 10, price: 0 }] },
  ] });
  expect(result.status).toBe("ready");
  if (result.status !== "ready") throw new Error("fixture unavailable");
  expect(result.request.baseline.id).toBe("leave");
  expect(result.request.options.map(o => o.id)).toEqual(["rest"]);
  expect(result.request.options[0]!.state.hp).toBe(Math.min(result.request.baseline.state.maxHp, result.request.baseline.state.hp + 10));
  expect(context.situation.options.every(o => /^card\d+$/.test(o.id))).toBe(true);
  expect(result.request.prepare(result.request.targets[0]!, result.request.options[0]!.state, result.request.options[0])).toBeNull();
  vi.stubEnv("V6_BUILD", "off");
  expect(await input(e, "pick")).toBeNull();
});
