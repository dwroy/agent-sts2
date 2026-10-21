import { afterEach, expect, it, vi } from "vitest";
import { appendFileSync, copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { setCardUpgradesForTests } from "../src/knowledge/card-upgrades.js";
import { runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import { V6ProjectionRuntime } from "../src/v6/projection-runtime.js";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import { SerialDeckRunner } from "../src/sim/build-sim-pool.js";
import { CardValueRuntime, type CardValueTable } from "../src/v6/card-value.js";
import { brainCardValueFacts } from "../src/v6/brain-card-value.js";
import { setupOneshotTests, FakeDeepSeek, type Raw } from "./oneshot-support.js";
import { startFixtureServer } from "./fixture-http.js";
import { createBrain as fixtureBrain } from "./legacy-brain.js";
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
  const root = mkdtempSync(join(tmpdir(), "v2-loop-")); roots.push(root); location.root = root;
  mkdirSync(join(root, "characters/silent"), { recursive: true });
  for (const file of ["opening-value.json", "build-cores.json"]) copyFileSync(new URL(`../../knowledge/characters/silent/${file}`, import.meta.url), join(root, "characters/silent", file));
  for (const [k,v] of Object.entries({ V6_BUILD:"on", V6_CARD_DECIDER:"brain", V6_DIRECTION_REPLAN:"off", V6_POTION_DECIDER:"brain", V6_SHOP_DECIDER:"brain", V6_REST_DECIDER:"brain", V6_COMBAT_ENTRIES:"off", BOSS_SIM_BUILD:"off" })) vi.stubEnv(k,v);
  setKnowledgeCharacter("silent"); setCardUpgradesForTests({}); return root;
}

async function replay(run: string, floor: number, mode: "present" | "missing" | "corrupt" | "off" | "timeout" | "no-combat" = "present") {
  const root = fixture(), combat: Raw = frozen.states[`${run}-f${floor}-COMBAT`], reward: Raw = frozen.states[`${run}-f${floor}-REWARD`];
  if (mode === "missing") rmSync(join(root, "characters/silent/opening-value.json"));
  if (mode === "corrupt") writeFileSync(join(root, "characters/silent/opening-value.json"), "{}");
  if (mode === "off") vi.stubEnv("V6_BUILD", "off");
  const tables: CardValueTable[] = [], notes: string[] = [], actions: Raw[] = [], runner = new SerialDeckRunner();
  const simulate = vi.spyOn(runner, "run"), value = new CardValueRuntime(root, (_env, table) => {
    appendFileSync(join(root, "v6-card-value.jsonl"), JSON.stringify({ ts: new Date().toISOString(), run_id: run, floor, table }) + "\n");
    tables.push(table);
  });
  if (mode === "timeout") vi.spyOn(value, "evaluate").mockImplementation(() => { throw new Error("card_value_preparation_budget"); });
  const evaluate = vi.spyOn(value, "evaluate");
  const runtime = new V6ProjectionRuntime(new V6ProjectionEngine(runner), async () => null, undefined, undefined, undefined, value);
  const prepare = runtime.evaluateBrainCardValue.bind(runtime);
  let preparationMs = 0;
  vi.spyOn(runtime, "evaluateBrainCardValue").mockImplementation(env => {
    const started = performance.now(), table = prepare(env);
    // Include cold loading, full audit append and compact JSON packing in the preparation measurement.
    if (table) JSON.stringify(brainCardValueFacts(table));
    preparationMs += performance.now() - started;
    return table;
  });
  let polls = 0;
  const server = await startFixtureServer((req, res) => {
    if (req.method === "GET") return sendJson(res, 200, envelope(polls++ === 0 && mode !== "no-combat" ? combat : reward));
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      const action = JSON.parse(body); actions.push(action);
      sendJson(res, 200, envelope({ action: action.action, status: "completed", stable: true, state: reward }));
    });
  });
  const base = loadConfig({}), brain = new FakeDeepSeek(() => "skip");
  try {
    const stats = await runLoop({
      config: { ...base, deepseek: { apiKey: "test", baseUrl: "http://127.0.0.1:9", model: "fake", maxCalls: 50, timeoutMs: 100, guideFile: "", handbookFile: "", reasoningEffort: "off", combatReasoningEffort: "", reasoningLog: "" },
        escalation: { ...base.escalation, chain: ["deepseek"] }, runPlan: "off", fightPlan: "off", combatPlanner: "turn", buildOneshot: "off",
        sl: { ...base.sl, enabled: false }, run: { ...base.run, character: "silent", characterId: "silent" },
        runPlanLog: join(root, "plans.jsonl"), log: { ...base.log, decisionLog: join(root, "decisions.jsonl") } },
      mode: "play", client: new ModClient({ baseUrl: server.url }), escalators: [brain],
      brainFactory: (config, client, dependencies) => fixtureBrain(config, client!, dependencies), jev: null,
      knowledge: makeKnowledge(frozen.knowledge_fixture, "cache"), v6Projection: runtime,
      buildSim: { runner, samples: 2, db: frozen.models.db, mm: frozen.models.mm, deadlineMs: 1000 },
      restoreRun: false, maxDecisions: 1, maxMinutes: 1, pollIntervalMs: 1,
      onEvent: e => { if (e.type === "note") notes.push(e.message); },
    });
    expect(stats, notes.join("\n")).toMatchObject({ decisions: 1, jevCalls: 0, deepseekCalls: 1 });

    expect(brain.calls).toHaveLength(1);
    expect(actions).toEqual([{ action: "skip_reward_cards" }]);
    const call = brain.calls[0]!;
    // Existing mandatory Boss simulation includes a wall-clock duration; keep every other byte for comparison.
    const facts = call.state.facts as Raw;
    const sim = facts.act_boss_sim as Raw | undefined;
    if (sim && typeof sim.samples === "string") sim.samples = sim.samples.replace(/用时 [0-9.]+ 秒/, "用时 <elapsed> 秒");
    return { call, tables, preparationMs, evaluated: evaluate.mock.calls.length, simulations: simulate.mock.calls.length };
  } finally { await server.close(); }
}
it.each([["T0TP8S9MMU9Q", 2], ["RBMEQGXPE9Z2", 3]] as const)("adds bounded facts to the actual combat→reward brain question for %s F%i", async (run, floor) => {
  const actual = await replay(run, floor), original = await replay(run, floor, "off");
  const table = actual.tables.at(-1)!;
  expect(table.options.map(o => o.known)).toEqual([true, true, true, true]);
  expect(table.telemetry.elapsed_ms).toBeLessThan(500);
  expect(actual.preparationMs).toBeLessThan(500);
  expect(actual.simulations).toBe(original.simulations);
  expect(Object.keys(actual.call.criteria)).toEqual(Object.keys(original.call.criteria));
  const cleaned = structuredClone(actual.call);
  const context = cleaned.state.facts as Raw;
  expect(context.card_value_v2.note).toContain("增量多在误差范围内，仅供参考");
  expect(context.card_value_v2.note).toContain("不是增量置信区间");
  delete context.card_value_v2;
  for (const option of table.options) {
    const view = JSON.parse(cleaned.criteria[option.id]!);
    const boss = option.targets.filter(t => t.kind === "boss");
    expect(view.card_value_v2.act_hp_saved).toBe(Number(option.saved_hp!.toFixed(2)));
    expect(view.card_value_v2.boss.win_change).toBe(Number(boss.reduce((n, t) => n + t.win_delta * t.weight, 0).toFixed(4)));
    expect(view.card_value_v2).not.toHaveProperty("rank");
    expect(view.card_value_v2).not.toHaveProperty("tier");
    if (option.id === "skip") expect(view.card_value_v2).toMatchObject({ act_hp_saved: 0, boss: { hp_saved: 0, win_change: 0 }, cores: [] });
    delete view.card_value_v2;
    cleaned.criteria[option.id] = JSON.stringify(view);
  }
  expect(cleaned).toEqual(original.call);
  const bytes = Buffer.byteLength(JSON.stringify(actual.call)) - Buffer.byteLength(JSON.stringify(original.call));
  expect(bytes).toBeGreaterThan(0); expect(bytes).toBeLessThan(4000);
  process.stdout.write(JSON.stringify({ fixture: `${run}-F${floor}`, prediction_ms: table.telemetry.elapsed_ms,
    preparation_ms: actual.preparationMs, added_prompt_bytes: bytes }) + "\n");
}, 10000);
it.each(["missing", "corrupt", "timeout", "no-combat"] as const)("keeps the original brain question when %s", async mode => {
  const actual = await replay("RBMEQGXPE9Z2", 3, mode), original = await replay("RBMEQGXPE9Z2", 3, "off");
  expect(actual.call).toEqual(original.call);
  if (mode === "no-combat") expect(actual.evaluated).toBe(0);
}, 10000);
