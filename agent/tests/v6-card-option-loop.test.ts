import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { setCardUpgradesForTests } from "../src/knowledge/card-upgrades.js";
import { runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import { v6ProjectionInputs } from "../src/v6/projection-input.js";
import { loadV6Knowledge } from "../src/v6/knowledge.js";
import { cardResultsContext } from "../src/v6/card-results-input.js";
import { V6ProjectionRuntime } from "../src/v6/projection-runtime.js";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import { assembleV6History } from "../src/sim/v6-history-pack.js";
import { V6CardResultsEngine, cardResultKnown, type V6CardResults } from "../src/sim/v6-card-results.js";
import { SerialDeckRunner } from "../src/sim/build-sim-pool.js";
import { pooledMetrics } from "./v6-build-metric-fixtures.js";
import { setupOneshotTests, stubJev, type Raw } from "./oneshot-support.js";
import { startFixtureServer } from "./fixture-http.js";
import { envelope, sendJson } from "./support.js";

const location = vi.hoisted(() => ({ root: "" }));
vi.mock("../src/knowledge/files.js", async original => ({
  ...await original<typeof import("../src/knowledge/files.js")>(), get KNOWLEDGE_DIR() { return location.root; },
}));
setupOneshotTests();
const roots: string[] = [];
afterEach(() => { roots.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })); vi.unstubAllEnvs(); setKnowledgeCharacter(null); });
const frozen = JSON.parse(readFileSync(new URL("./v6-fixtures/v6-r405-card-options.json", import.meta.url), "utf8"));
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "v6-option-")); roots.push(root); location.root = root;
  const own = join(root, "characters/silent"), common = join(root, "common");
  mkdirSync(own, { recursive: true }); mkdirSync(common, { recursive: true });
  // Freeze the existing measured models; no live file or synthetic fight outcome is consulted.
  writeFileSync(join(common, "monster-db.json"), JSON.stringify(frozen.models.db));
  writeFileSync(join(common, "move-model.json"), JSON.stringify(frozen.models.mm));
  const evidence = [{ run_id: "fixture", floor: 1 }];
  writeFileSync(join(own, "build-cores.json"), JSON.stringify({ schema: "build-cores-v1", character: "silent", entries: [{
    schema: "build-core-v1", direction: "TEST", name: "fixture", status: "candidate", scope: { character: "silent", ascensions: [0, 10] },
    card_pool: { FIXTURE_CARD: { roles: ["fixture"], contribution: "fixture", upgraded_matters: false, combos: ["TEST_COMBO"], evidence } },
    combos: [{ id: "TEST_COMBO", types: ["must_pick_minimal", "common", "max_cards", "max_dpr"], boss: null,
      cards: [{ id: "FIXTURE_CARD", count: 1, upgraded: false }], prerequisites: null, metrics: pooledMetrics(),
      fits: { bosses_positive: [], bosses_negative: [], routes: [], situations: [] }, evidence, confidence: "low", linked_experience: [] }],
    pivot_signals: [], failure_modes: [], linked_experience: [], linked_reflex: [] }] }));
  const at = "2020-01-01T00:00:00.000Z";
  const pack = assembleV6History({ character: "silent", cutoff: at, generated_at: at,
    sources: ["coverage", "frames", "fights", "opportunities"].map(name => ({ name, sha256: "a".repeat(64), bytes: 1 })),
    coverage: [{ run_id: "fixture", ended: at, ascension: 10, first_stop: null, first_trial_final_victory: false, final_including_sl_victory: false }],
    frames: [{ floor: 17, act_id: "0", boss_id: "WATERFALL_GIANT", run_id: "fixture", ts: at, screen: "COMBAT", in_combat: true,
      turn: 1, hp: 40, max_hp: 60, gold: 0, deck: [] }],
    fights: [{ floor: 17, boss: "WATERFALL_GIANT", run_id: "fixture", ascension: 10, attempt: 1, started_at: at, ended_at: at,
      result: "won", entry: { ts: at, hp: 40, max_hp: 60 } }],
    opportunities: { schema: "construction-opportunities-v1", character: "silent", generated: at, cutoff: at,
      digest: "b".repeat(64), limitations: [], rows: [] }, combo_metrics: [], checkpointFloors: [17] });
  writeFileSync(join(own, "v6-history.json"), JSON.stringify(pack));
  for (const [key, value] of Object.entries({ V6_BUILD: "on", V6_CARD_DECIDER: "jev", V6_DIRECTION_REPLAN: "off",
    V6_POTION_DECIDER: "brain", V6_SHOP_DECIDER: "brain", V6_REST_DECIDER: "brain", V6_COMBAT_ENTRIES: "off", BOSS_SIM_BUILD: "off" })) vi.stubEnv(key, value);
  setKnowledgeCharacter("silent"); setCardUpgradesForTests({});
  const loaded = loadV6Knowledge(root, "silent").cores;
  expect(loaded, JSON.stringify(loaded)).toMatchObject({ status: "loaded" });
  return root;
}

it.each([["T0TP8S9MMU9Q", 2], ["RBMEQGXPE9Z2", 3]] as const)(
  "keeps observed candidate faces distinct through the real %s F%i combat-to-reward loop and simulator", async (run, floor) => {
    const root = fixture(), knowledge = makeKnowledge(frozen.knowledge_fixture, "cache");
    const combat: Raw = frozen.states[`${run}-f${floor}-COMBAT`], reward: Raw = frozen.states[`${run}-f${floor}-REWARD`];
    const tables: V6CardResults[] = [], notes: string[] = [], actions: Raw[] = [];
    const runner = new SerialDeckRunner(), runSamples = vi.spyOn(runner, "run");
    const runtime = new V6ProjectionRuntime(new V6ProjectionEngine(runner), async () => null, () => {},
      v6ProjectionInputs(root, () => "2026-10-20T16:20:00.000Z"), {
        engine: new V6CardResultsEngine(runner, () => performance.now(), 8), context: cardResultsContext,
        record(_env, table) { tables.push(table); },
      });
    let polls = 0;
    const server = await startFixtureServer((req, res) => {
      if (req.method === "GET") return sendJson(res, 200, envelope(polls++ === 0 ? combat : reward));
      let body = ""; req.on("data", chunk => { body += chunk; });
      req.on("end", () => { const action = JSON.parse(body); actions.push(action);
        sendJson(res, 200, envelope({ action: action.action, status: "completed", stable: true, state: reward })); });
    });
    const base = loadConfig({}), jev = stubJev(), ask = vi.spyOn(jev, "ask");
    try {
      const stats = await runLoop({ config: { ...base, runPlan: "off", fightPlan: "off", combatPlanner: "turn", buildOneshot: "off",
        sl: { ...base.sl, enabled: false }, run: { ...base.run, character: "silent", characterId: "silent" },
        runPlanLog: join(root, "plans.jsonl"), log: { ...base.log, decisionLog: join(root, "decisions.jsonl") } },
        mode: "play", client: new ModClient({ baseUrl: server.url }), brain: null, jev, knowledge, v6Projection: runtime,
        restoreRun: false, maxDecisions: 1, maxMinutes: 1, pollIntervalMs: 1,
        onEvent: event => { if (event.type === "note") notes.push(event.message); } });
      expect(stats, notes.join("\n")).toMatchObject({ decisions: 1, jevCalls: 1, deepseekCalls: 0 });
      expect(ask).toHaveBeenCalledTimes(1);
      expect(actions).toEqual([{ action: "choose_reward_card", option_index: 0 }]);
      expect(notes.filter(n => n.includes("v6_unknown_to_brain"))).toEqual([]);
      expect(tables.length, JSON.stringify({ stats, actions, notes, polls })).toBeGreaterThan(0);
      const table = tables.at(-1)!, target = table.targets.find(t => t.kind === "current")!;
      const ids = ["card0", "card1", "card2", "skip"];
      expect(ids.map(id => cardResultKnown(table, id))).toEqual([true, true, true, true]);
      const rows = ids.map(id => table.immediate.find(r => r.option_id === id && r.target_id === target.id)!);
      // Fixed shared samples verify actual results, not just three distinct cache identities.
      expect(rows.map(r => r.metrics.death_rate?.n)).toEqual([8, 8, 8, 8]);
      expect(new Set(rows.slice(0, 3).map(r => JSON.stringify([r.metrics, r.paired_delta]))).size).toBe(3);
      const offers = reward["reward"] as { card_options: { card_id: string; energy_cost: number }[] };
      for (const face of offers.card_options) {
        const models = runSamples.mock.calls.flatMap(([r]) => r.decks.flatMap(d => d.piles.draw.filter(c => c.cardId === face.card_id)));
        expect(models.length).toBeGreaterThan(0);
        expect(models.every(c => c.cost === face.energy_cost && c.known)).toBe(true);
      }
      expect(JSON.stringify(ask.mock.calls[0])).not.toContain("unmodelled_card:");
    } finally { await server.close(); }
  }, 15_000);
