/**
 * A restart mid-run rebuilds DeepSeek's run memory and the act's route plan from the run's logs
 * (FA82FQHSJG2F: six restarts between F8 and F14; after the one at F9 DeepSeek re-planned the route with
 * an empty history and added a second act-1 elite, not knowing F7 was one).
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadConfig, type AppConfig } from "../src/config.js";
import type { AnswerSet } from "../src/jev/answers.js";
import type { JevAskResult, JevClient } from "../src/jev/client.js";
import { DeepSeekClient, type DeepSeekAnswer } from "../src/llm/deepseek.js";
import { runLoop } from "../src/loop.js";
import { ModClient } from "../src/mod/client.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { ObservedStateLog, readRunLogs, replayRun, scanBackward } from "../src/project/journal-replay.js";
import { RunJournal, type JournalEntry } from "../src/project/run-journal.js";
import { stateLogPath } from "../src/telemetry/decision-log.js";
import type { JsonValue } from "../src/util/json.js";
import { baseState, combatPayload, eventPayload, mainMenuPayload, rewardCardPayload, runPayload, testKnowledge } from "./scenarios.js";
import { envelope, sendJson, startTestServer, type TestServer } from "./support.js";

type Raw = Record<string, unknown>;
type Row = Record<string, JsonValue>;

const dirs: string[] = [];
const servers: TestServer[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "jev-sts2-replay-"));
  dirs.push(dir);
  return dir;
}

const deck = (runPayload()["deck"] as Raw[]).map((card) => ({ ...card }));
/** The deck after a relic upgraded the first Strike (FA82 F4: the fishing rod, seen on the fight's last frame). */
const upgradedDeck = deck.map((card, index) => (index === 0 ? { ...card, upgraded: true, name: "STRIKE_R+" } : card));
const run = (floor: number, over: Raw = {}): Raw => runPayload({ floor, act_id: "0", ascension: 8, ...over });

/* ---- the journal from its rows --------------------------------------------------------------------- */

describe("replaying a run's rows rebuilds the journal the live process had", () => {
  it("synthetic run: states logged with decisions and states that only changed the journal", () => {
    // The live side: the loop's protocol (observe every state read; log the changed ones that have no
    // decision; log each decision's state with it; record executed decisions).
    const live = new RunJournal();
    const stateRows: Row[] = [];
    const decisionRows: Row[] = [];
    let clock = Date.parse("2026-09-28T13:29:00.000Z");
    const tick = (): string => new Date((clock += 1000)).toISOString();
    const observed = new ObservedStateLog((state, fingerprint, ts) => stateRows.push({ ts, observed_ts: ts, observed: true, fingerprint, state: state.raw as JsonValue }));
    let n = 0;
    const poll = (raw: Raw, decision?: Omit<JournalEntry, "asked" | "intent"> & { failed?: boolean; undispatched?: boolean }): void => {
      const state = parseGameState(raw);
      const observedTs = tick();
      const fingerprint = `fp${(n += 1)}`;
      observed.observed(state, fingerprint, observedTs, live.observe(state, { knowledge: testKnowledge }));
      if (!decision) return;
      const entry: JournalEntry = { label: decision.label, by: decision.by, choice: decision.choice, reason: decision.reason, asked: true, intent: null };
      if (!decision.failed && !decision.undispatched) live.record(state, entry);
      const ts = tick();
      decisionRows.push({ ts, fingerprint, label: entry.label, decider: entry.by, run_id: "TESTRUN123", observed_ts: observedTs, journal: { choice: entry.choice, reason: entry.reason }, result: decision.failed ? "failed (timeout): x" : decision.undispatched ? "not dispatched: state changed while deciding" : "completed: ok" });
      observed.logging(state);
      stateRows.push({ ts, observed_ts: observedTs, fingerprint, state: state.raw as JsonValue });
    };
    const fight = (floor: number, turn: number, hp: number, enemyHp: number, over: Raw = {}): Raw => {
      const raw = combatPayload({ enemyHp });
      raw["turn"] = turn;
      raw["run"] = run(floor, { current_hp: hp, ...over });
      ((raw["combat"] as Raw)["player"] as Raw)["current_hp"] = hp;
      return raw;
    };
    poll(baseState("EVENT", { run: run(1) }), { label: "event/choose", by: "deepseek", choice: "Neow: a relic", reason: "long-term value" });
    // F2: a fight, its turns, an enemy turn nobody decided on, a last frame that upgrades a card.
    poll(fight(2, 1, 55, 40), { label: "combat/plan", by: "code", choice: "Bash" });
    poll(fight(2, 1, 49, 30));
    poll(fight(2, 2, 49, 30), { label: "combat/plan", by: "code", choice: "Strike" });
    poll(fight(2, 3, 44, 0, { deck: upgradedDeck }));
    poll(baseState("REWARD", { run: run(2, { current_hp: 44, deck: upgradedDeck }) }), { label: "reward/card", by: "deepseek", choice: "Inflame", reason: "Strength" });
    // A transition frame that only moves gold (superseded by the next state of the floor), then a failed action.
    poll(baseState("MAP", { run: run(2, { current_hp: 44, gold: 250, deck: upgradedDeck }) }));
    poll(baseState("MAP", { run: run(2, { current_hp: 44, gold: 260, deck: upgradedDeck }) }), { label: "map/route", by: "jev", choice: "Monster", failed: true });
    // A DeepSeek shop call the board moved past (Y3XT F36: Lord's Parasol): logged, never recorded.
    poll(baseState("MAP", { run: run(2, { current_hp: 44, gold: 260, deck: upgradedDeck }) }), { label: "shop/buy", by: "deepseek", choice: "buy Fight Me", reason: "Strength", undispatched: true });
    poll(baseState("MAP", { run: run(2, { current_hp: 44, gold: 260, deck: upgradedDeck }) }), { label: "map/route", by: "jev", choice: "Monster" });
    // F3: a potion drunk between two logged states, max HP up at a rest.
    poll(fight(3, 1, 44, 20, { deck: upgradedDeck }), { label: "combat/plan", by: "code", choice: "Strike" });
    poll(fight(3, 1, 44, 0, { deck: upgradedDeck, potions: [] }));
    poll(baseState("REST", { run: run(4, { current_hp: 60, max_hp: 86, deck: upgradedDeck, potions: [] }) }), { label: "rest/choose", by: "deepseek", choice: "Rest", reason: "HP" });
    poll(baseState("MAP", { run: run(4, { current_hp: 60, max_hp: 86, deck: upgradedDeck, potions: [] }) }));
    observed.flush();

    const replay = replayRun({ runId: "TESTRUN123", states: stateRows, decisions: decisionRows, runPlans: [] }, testKnowledge);
    const rebuilt = replay.journal;
    const final = parseGameState(baseState("MAP", { run: run(4, { current_hp: 60, max_hp: 86, deck: upgradedDeck, potions: [] }) }));
    expect(rebuilt.render(final, testKnowledge)).toEqual(live.render(final, testKnowledge));
    expect(rebuilt.choices).toEqual(live.choices);
    expect(rebuilt.events).toEqual(live.events);
    expect([...rebuilt.floors]).toEqual([...live.floors]);
    const shown = (journal: RunJournal) => journal.fights.map(({ hpMin: _min, turns: _turns, ...rest }) => rest);
    expect(shown(rebuilt)).toEqual(shown(live));
    // The history holds what only the unlogged-by-decision states showed.
    const memory = live.render(final, testKnowledge);
    expect(memory.history).toContain("升级 STRIKE_R(战斗)");
    expect(memory.history).toContain("用药 Fire Potion(战斗)");
    expect(memory.this_floor).toContain("上限 80→86(休息)");
    // Besides the decisions' states only the two frames that changed an item were logged (the card
    // upgrade, the potion drunk); the enemy-turn HP frame and the gold-only frame were rewritten by a
    // later logged state of their floor.
    expect(stateRows.filter((row) => row["observed"] === true).map((row) => (row["state"] as Raw)["turn"])).toEqual([3, 1]);
  });

  it("rows of another run are never mixed in", () => {
    const dir = tempDir();
    const states = join(dir, "states.jsonl");
    const decisions = join(dir, "decisions.jsonl");
    const row = (runId: string, ts: string, floor: number): string => JSON.stringify({ ts, fingerprint: `f${ts}`, state: { ...baseState("EVENT", { run: run(floor) }), run_id: runId } });
    const decision = (ts: string, label: string): string => JSON.stringify({ ts, fingerprint: `f${ts}`, label, decider: "deepseek", journal: { choice: label, reason: "" }, result: "completed: ok" });
    writeFileSync(states, [row("OLDRUN", "2026-09-28T10:00:00.000Z", 5), JSON.stringify({ ts: "2026-09-28T10:30:00.000Z", fingerprint: "menu", state: baseState("MAIN_MENU", { run_id: null, run: null }) }), row("NEWRUN", "2026-09-28T11:00:00.000Z", 1), row("NEWRUN", "2026-09-28T11:01:00.000Z", 2)].join("\n") + "\n");
    writeFileSync(decisions, [decision("2026-09-28T10:00:00.000Z", "event/old"), decision("2026-09-28T11:00:00.000Z", "event/new1"), decision("2026-09-28T11:01:00.000Z", "event/new2")].join("\n") + "\n");
    const logs = readRunLogs({ states, decisions }, "NEWRUN");
    expect(logs.states).toHaveLength(2);
    expect(logs.decisions.map((entry) => entry["label"])).toEqual(["event/new1", "event/new2"]);
    // latestOnly (the loop): an older run is not searched for.
    expect(readRunLogs({ states, decisions }, "OLDRUN").states).toHaveLength(0);
    expect(readRunLogs({ states, decisions }, "OLDRUN", { latestOnly: false }).decisions.map((entry) => entry["label"])).toEqual(["event/old"]);
  });

  it("reads a file backwards across chunk boundaries, multi-byte text included", () => {
    const file = join(tempDir(), "lines.jsonl");
    const lines = Array.from({ length: 50 }, (_, index) => `{"n":${index},"t":"第${index}层·${"é".repeat(index)}"}`);
    writeFileSync(file, `${lines.join("\n")}\n`);
    const seen: string[] = [];
    scanBackward(file, (line) => (seen.push(line), true), 7);
    expect(seen.reverse()).toEqual(lines);
  });
});

/* ---- the loop restarted mid-run ------------------------------------------------------------------ */

class RecordingDeepSeek extends DeepSeekClient {
  calls: { label: string; memory: JsonValue | undefined; criteria: Record<string, string | null> }[] = [];
  constructor(private readonly pickFn: (criteria: Record<string, string | null>, label: string) => string) {
    super({ apiKey: "test", baseUrl: "http://127.0.0.1:9", model: "fake", timeoutMs: 100 });
  }
  override async choose(_state: Record<string, JsonValue>, _instructions: string, criteria: Record<string, string | null>, context: Record<string, JsonValue> = {}): Promise<DeepSeekAnswer> {
    const label = String(context["label"] ?? "");
    this.calls.push({ label, memory: context["memory"], criteria });
    const choice = this.pickFn(criteria, label);
    return { choice, reason: `reason for ${choice}`, latencyMs: 5, inputTokens: 10, outputTokens: 2, cacheHitTokens: 7, reasoningTokens: 1 };
  }
}

function stubJev(): JevClient {
  return {
    model: "stub",
    async ask(_state: unknown, questions: Record<string, { type: string; criteria?: Record<string, unknown> | string[] }>): Promise<JevAskResult> {
      const answers: AnswerSet = {};
      for (const [id, question] of Object.entries(questions)) {
        const first = question.criteria && !Array.isArray(question.criteria) ? (Object.keys(question.criteria)[0] ?? "") : "";
        answers[id] = { type: "choice", choice: first, probabilities: { [first]: 0.9 }, confidence: 0.9, raw: {} };
      }
      return { model: "stub", answers, inputTokens: 1, outputTokens: 1, latencyMs: 1, requestId: "r" };
    },
  } as unknown as JevClient;
}

/** A scripted game: each action moves to the next state; a transient state is shown to one read only. */
async function scriptedMod(sequence: { raw: Raw; transient?: boolean }[]): Promise<{ server: TestServer; actions: Raw[] }> {
  let index = 0;
  const actions: Raw[] = [];
  const current = (): { raw: Raw; transient?: boolean } => sequence[Math.min(index, sequence.length - 1)]!;
  const server = await startTestServer((req, res) => {
    if (req.method === "GET" && req.url === "/state") {
      const shown = current();
      if (shown.transient) index += 1;
      return sendJson(res, 200, envelope(shown.raw));
    }
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const intent = JSON.parse(body || "{}") as Raw;
      actions.push(intent);
      index += 1;
      sendJson(res, 200, envelope({ action: intent["action"], status: "completed", stable: true, message: "scripted", state: current().raw }));
    });
  });
  servers.push(server);
  return { server, actions };
}

const node = (row: number, col: number, type: string, children: [number, number][], extra: Raw = {}): Raw => ({
  row, col, node_type: type, state: "NotTravelable", visited: false, is_current: false, is_available: false, is_start: false, is_boss: type === "Boss",
  is_second_boss: false, parents: [], children: children.map(([r, c]) => ({ row: r, col: c })), ...extra,
});

/** current (4,2) -> (5,1) Monster | (5,3) Monster; (5,1) -> (6,1) Rest | (6,2) Elite; (5,3) -> (6,2) | (6,3) Shop; -> Boss (7,3). */
function routeMap(floor: number, current: [number, number], available: [number, number, string][], over: Raw = {}): Raw {
  return baseState("MAP", {
    available_actions: ["choose_map_node"],
    run: run(floor, { current_hp: 70, max_hp: 80, ...over }),
    map: {
      current_node: { row: current[0], col: current[1] },
      boss_node: { row: 7, col: 3 },
      available_nodes: available.map(([row, col, type], index) => ({ index, row, col, node_type: type, state: "Travelable" })),
      nodes: [
        node(4, 2, "Monster", [[5, 1], [5, 3]], { visited: true }),
        node(5, 1, "Monster", [[6, 1], [6, 2]]),
        node(5, 3, "Monster", [[6, 2], [6, 3]], current[0] >= 5 ? { visited: true } : {}),
        node(6, 1, "RestSite", [[7, 3]]),
        node(6, 2, "Elite", [[7, 3]]),
        node(6, 3, "Shop", [[7, 3]]),
        node(7, 3, "Boss", []),
      ],
      local_vote: null,
    },
  });
}

const withRun = (raw: Raw, floor: number, over: Raw = {}): Raw => ({ ...raw, run: run(floor, { current_hp: 70, max_hp: 80, ...over }) });
const inflameDeck = [...upgradedDeck, { ...deck[4]!, index: 5 }];
const steps = {
  firstFork: { raw: routeMap(5, [4, 2], [[5, 1, "Monster"], [5, 3, "Monster"]]) },
  // The fight's last frame, read once, with nothing to do: a relic upgraded a Strike (only this frame shows it happening).
  lastFrame: { raw: baseState("REST", { run: run(6, { current_hp: 66, max_hp: 80, gold: 230, deck: upgradedDeck }) }), transient: true },
  reward: { raw: withRun(rewardCardPayload(), 6, { current_hp: 66, deck: upgradedDeck }) },
  secondFork: { raw: routeMap(6, [5, 3], [[6, 2, "Elite"], [6, 3, "Shop"]], { current_hp: 66, deck: inflameDeck }) },
  event: { raw: withRun(eventPayload(), 7, { current_hp: 66, deck: inflameDeck }) },
  menu: { raw: mainMenuPayload() },
};

function loopConfig(dir: string): AppConfig {
  const base = loadConfig({} as NodeJS.ProcessEnv);
  return {
    ...base,
    combatPlanner: "turn",
    runPlan: "off",
    fightPlan: "off",
    buildDecider: "deepseek",
    deepseek: { apiKey: "test", baseUrl: "http://127.0.0.1:9", model: "fake", maxCalls: 50, timeoutMs: 100, guideFile: "", handbookFile: "", reasoningEffort: "off", combatReasoningEffort: "", reasoningLog: "" },
    escalation: { ...base.escalation, chain: ["deepseek"] },
    log: { ...base.log, decisionLog: join(dir, "decisions.jsonl") },
    runPlanLog: join(dir, "run-plans.jsonl"),
    fightPlanLog: join(dir, "fight-plans.jsonl"),
  };
}

const pick = (criteria: Record<string, string | null>, label: string): string =>
  label === "map/route-plan" ? Object.keys(criteria).find((key) => String(criteria[key]).includes("Shop"))! : Object.keys(criteria)[0]!;

async function play(config: AppConfig, sequence: { raw: Raw; transient?: boolean }[], options: { maxDecisions?: number; restoreRun?: boolean } = {}) {
  const deepseek = new RecordingDeepSeek(pick);
  const notes: string[] = [];
  const { server, actions } = await scriptedMod(sequence);
  await runLoop({
    config, mode: "play", client: new ModClient({ baseUrl: server.url }), jev: stubJev(), escalators: [deepseek], knowledge: testKnowledge,
    maxRuns: 1, maxDecisions: options.maxDecisions ?? 20, pollIntervalMs: 1, restoreRun: options.restoreRun,
    onEvent: (event) => (event.type === "note" ? notes.push(event.message) : undefined),
  });
  return { deepseek, actions, notes };
}

describe("the loop restarted mid-run", () => {
  it("gives DeepSeek the same run memory as a loop that never stopped, and follows the saved route plan", async () => {
    const all = [steps.firstFork, steps.lastFrame, steps.reward, steps.secondFork, steps.event, steps.menu];
    const straight = await play(loopConfig(tempDir()), all);
    expect(straight.deepseek.calls.map((call) => call.label)).toEqual(["map/route-plan", "reward/card", "event/choose"]);

    // The same run, the process stopping after the card reward (as on a Jev failure) and starting again.
    const config = loopConfig(tempDir());
    const before = await play(config, [steps.firstFork, steps.lastFrame, steps.reward], { maxDecisions: 2 });
    expect(before.deepseek.calls.map((call) => call.label)).toEqual(["map/route-plan", "reward/card"]);
    const after = await play(config, [steps.secondFork, steps.event, steps.menu]);
    expect(after.notes.some((note) => note.includes("rebuilt the run memory from its logs"))).toBe(true);
    // The route plan resumed: the second fork is followed in code (the Shop), not re-planned.
    expect(after.deepseek.calls.map((call) => call.label)).toEqual(["event/choose"]);
    expect(after.actions[0]).toEqual({ action: "choose_map_node", option_index: 1 });
    // DeepSeek's run memory after the restart is the one the uninterrupted loop gave it, byte for byte.
    const memory = after.deepseek.calls[0]!.memory as Record<string, string>;
    expect(JSON.stringify(memory)).toBe(JSON.stringify(straight.deepseek.calls[2]!.memory));
    expect(memory["history"]).toContain("升级 STRIKE_R(休息)");
    expect(memory["history"]).toContain("路线规划");
    expect(memory["route"]).toContain("已走 2/3");

    // The rows carry what the replay needs.
    const records = readFileSync(config.log.decisionLog, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Row);
    const plan = records.find((record) => record["label"] === "map/route-plan")!;
    expect(plan).toMatchObject({ run_id: "TESTRUN123", journal: { choice: expect.stringContaining("Shop") } });
    expect((plan["route_plan"] as Row)["summary"]).toBe("Monster -> Shop -> Boss");
    const stateRows = readFileSync(stateLogPath(config.log.decisionLog), "utf8").trim().split("\n").map((line) => JSON.parse(line) as Row);
    expect(stateRows.filter((row) => row["observed"] === true).map((row) => row["screen"])).toEqual(["REST"]);
  });

  it("without the replay (the old behaviour) the restarted loop re-plans the route with an empty history", async () => {
    const config = loopConfig(tempDir());
    await play(config, [steps.firstFork, steps.lastFrame, steps.reward], { maxDecisions: 2 });
    const after = await play(config, [steps.secondFork, steps.event, steps.menu], { restoreRun: false });
    expect(after.deepseek.calls.map((call) => call.label)).toEqual(["map/route-plan", "event/choose"]);
    expect((after.deepseek.calls[0]!.memory as Record<string, string>)["history"] ?? "").toBe("");
  });
});
