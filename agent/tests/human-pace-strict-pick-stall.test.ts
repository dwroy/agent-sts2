/** Fixed 5H83 F48 selection: an H1 deadline must leave the strict-Jev wait loop. */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { DecisionBudgetExpired, DecisionBudgetLedger } from "../src/core/decision-budget.js";
import { runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import { buildPickDecision } from "../src/hand/screens/pick.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import type { JevClient } from "../src/reflex/jev/client.js";
import { loggedKnowledge } from "./logged.js";
import { mainMenuPayload } from "./scenarios.js";
import { envelope } from "./support.js";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); setKnowledgeCharacter(null); });

it.each(["before request", "during request"])("dispatches one legal selection through both gates when the budget expires %s", async (when) => {
  const dir = mkdtempSync(join(tmpdir(), "h1-selection-deadline-"));
  let current = JSON.parse(readFileSync(new URL("./human-pace-strict-pick-stall.json", import.meta.url), "utf8"));
  const actions: Record<string, unknown>[] = [];
  let asks = 0;
  const controller = new AbortController();
  if (when === "before request") {
    const open = DecisionBudgetLedger.prototype.open;
    vi.spyOn(DecisionBudgetLedger.prototype, "open").mockImplementation(function (this: DecisionBudgetLedger, key, kind) {
      const budget = open.call(this, key, kind); budget.charge(90_000); return budget;
    });
  }
  const jev = { ask: async () => { asks++; throw new DecisionBudgetExpired("Jev"); } } as unknown as JevClient;
  vi.stubEnv("CONSTRUCTION_MODE", "off"); setKnowledgeCharacter("silent");
  const config = loadConfig({ CHARACTER: "silent", STRICT_JEV: "on", BRAIN_LOG: "off",
    RUN_PLAN: "off", FIGHT_PLAN: "off", BUILD_ONESHOT: "off", SL_ENABLED: "off" });
  config.log.decisionLog = join(dir, "decisions.jsonl");
  config.runPlanLog = join(dir, "run-plans.jsonl"); config.fightPlanLog = join(dir, "fight-plans.jsonl");
  const client = new ModClient({ baseUrl: "http://fixture.invalid", fetchImpl: (async (url, options) => {
    if (String(url).endsWith("/state")) return Response.json(envelope(current));
    const intent = JSON.parse(String(options?.body)); actions.push(intent); current = mainMenuPayload();
    return Response.json(envelope({ action: intent.action, status: "completed", stable: true, message: "fixed", state: current }));
  }) as typeof fetch });
  try {
    const result = await runLoop({ config, mode: "play", client, jev, brain: null, buildSim: null, thiefSim: null,
      knowledge: loggedKnowledge, maxDecisions: 1, maxMinutes: 1, pollIntervalMs: 1, restoreRun: false,
      jevRetryDelaysMs: [], signal: controller.signal,
      onEvent: (event) => { if (event.type === "wait") controller.abort(); } });
    expect(result.acts).toBe(1); expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ action: "select_deck_card" });
    expect(asks).toBe(when === "before request" ? 0 : 1);
    const rows = readFileSync(config.log.decisionLog, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    expect(rows.at(-1)).toMatchObject({ fallback: true, time_budget: { fallback: expect.stringContaining("candidate") } });
    expect(rows.at(-1).rationale).toContain("human-pace deadline");
  } finally { controller.abort(); rmSync(dir, { recursive: true, force: true }); }
});

it("keeps ordinary strict waits and accepted low-confidence answers; only explicit expiry uses the existing candidate", () => {
  const decision = buildPickDecision({ label: "fixed/pick", instructions: "fixed", state: {}, strictJev: true, actThreshold: 0.9,
    options: [ { key: "a", summary: "a", score: 1, intent: { action: "select_deck_card", option_index: 0 } },
      { key: "b", summary: "b", score: 2, intent: { action: "select_deck_card", option_index: 1 } } ] });
  if (decision.kind !== "ask") throw new Error("expected a strict question");
  expect(decision.resolve({}).intent).toBeNull();
  expect(decision.resolve({}, { budgetExpired: true })).toMatchObject({ fallback: true, intent: { option_index: 1 } });
  const accepted = { pick: { type: "choice" as const, choice: "a", confidence: 0.1, probabilities: { a: 0.1 }, raw: {} } };
  expect(decision.resolve(accepted, { budgetExpired: true })).toEqual(decision.resolve(accepted));
  expect(decision.resolve(accepted)).toMatchObject({ fallback: false, intent: { option_index: 0 } });
  const unknown = { pick: { ...accepted.pick, choice: "missing" } };
  expect(decision.resolve(unknown).intent).toBeNull();
  expect(decision.resolve(unknown, { budgetExpired: true })).toMatchObject({ fallback: true, intent: { option_index: 1 } });
});
