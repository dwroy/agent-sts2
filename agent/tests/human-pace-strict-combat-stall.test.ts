/** Fixed 0NMF36KX3F7Y F17 T3 combat: an H1 deadline must leave the strict-Jev wait loop. */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { DecisionBudgetExpired, DecisionBudgetLedger } from "../src/core/decision-budget.js";
import { runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import { planCombat } from "../src/reflex/combat.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import type { JevClient } from "../src/reflex/jev/client.js";
import { loggedEnv, loggedKnowledge } from "./logged.js";
import { mainMenuPayload } from "./scenarios.js";
import { envelope } from "./support.js";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); setKnowledgeCharacter(null); });

it.each(["before request", "during request"])("dispatches one legal combat action through both gates when the budget expires %s", async (when) => {
  const dir = mkdtempSync(join(tmpdir(), "h1-combat-deadline-"));
  let current = JSON.parse(readFileSync(new URL("./human-pace-strict-combat-stall.json", import.meta.url), "utf8"));
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
    RUN_PLAN: "off", FIGHT_PLAN: "off", BUILD_ONESHOT: "off", SL_ENABLED: "off", COMBAT_PLANNER: "card" });
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
    expect(["play_card", "end_turn", "use_potion"]).toContain(actions[0]?.action);
    expect(asks).toBe(when === "before request" ? 0 : 1);
    const rows = readFileSync(config.log.decisionLog, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    expect(rows.at(-1)).toMatchObject({ fallback: true, time_budget: { fallback: expect.stringContaining("candidate") } });
    expect(rows.at(-1).rationale).toContain("human-pace deadline");
  } finally { controller.abort(); rmSync(dir, { recursive: true, force: true }); }
});

it("uses existing candidates only on explicit expiry while preserving ordinary strict behavior", () => {
  const raw = JSON.parse(readFileSync(new URL("./human-pace-strict-combat-stall.json", import.meta.url), "utf8"));
  const env = loggedEnv({ source: "0NMF36KX3F7Y F17 T3 observed stall", decision: { label: "combat/play", decider: "fixed", chosen: null, rationale: "observed" }, state: raw });
  const strict = planCombat(env);
  const ordinary = planCombat({ ...env, strictJev: false });
  if (strict?.kind !== "ask" || ordinary?.kind !== "ask") throw new Error("expected combat questions");
  expect(strict.resolve({}).intent).toBeNull();
  const fallback = strict.resolve({}, { budgetExpired: true });
  expect(fallback.fallback).toBe(true);
  expect(fallback.intent).toEqual(ordinary.resolve({}).intent);
  expect(fallback.rationale).toContain("human-pace deadline");
  const question = strict.questions["play"];
  if (question?.type !== "choice") throw new Error("expected action options");
  const choice = Object.keys(question.criteria)[0]!;
  const accepted = { play: { type: "choice" as const, choice, confidence: 0.1, probabilities: { [choice]: 0.1 }, raw: {} } };
  expect(strict.resolve(accepted, { budgetExpired: true })).toEqual(strict.resolve(accepted));
  expect(strict.resolve(accepted)).toMatchObject({ fallback: false, confidence: 0.1 });
  const unknown = { play: { ...accepted.play, choice: "missing" } };
  expect(strict.resolve(unknown).intent).toBeNull();
  expect(strict.resolve(unknown, { budgetExpired: true }).intent).toEqual(fallback.intent);
  expect(ordinary.resolve({})).toEqual(ordinary.resolve({}, { budgetExpired: false }));
});
