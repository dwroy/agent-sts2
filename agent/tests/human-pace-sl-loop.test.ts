/** The observed F17 input, in-memory transport and a fixed planner clock; no real actions or models. */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { currentDecisionBudget } from "../src/core/decision-budget.js";
import { runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import * as screens from "../src/hand/screens/index.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { SlController } from "../src/sl/controller.js";
import type { JevClient } from "../src/reflex/jev/client.js";
import { loggedKnowledge } from "./logged.js";
import { mainMenuPayload } from "./scenarios.js";
import { envelope } from "./support.js";

afterEach(() => { vi.restoreAllMocks(); setKnowledgeCharacter(null); });

it.each(["silent", "ironclad", "regent"])("reserves Jev and uses the actual Boss budget on a retry only for %s", async (character) => {
  const dir = mkdtempSync(join(tmpdir(), "h1-sl-loop-"));
  let current = JSON.parse(readFileSync(new URL("./human-pace-strict-combat-stall.json", import.meta.url), "utf8"));
  current.run.character_id = character.toUpperCase();
  vi.spyOn(performance, "now").mockReturnValue(0);
  vi.spyOn(SlController.prototype, "envFor").mockReturnValue({ attempt: 2, maxAttempts: 4, previousAttempts: {}, showSim: false });
  vi.spyOn(screens, "planDecision").mockImplementation(() => {
    const budget = currentDecisionBudget();
    if (character === "silent") {
      expect(budget?.kind).toBe("boss");
      expect(budget?.remaining()).toBe(57000);
      budget!.charge(budget!.remaining());
      expect(budget?.remaining()).toBe(0);
    } else expect(budget).toBeUndefined();
    return { kind: "decision", decision: { kind: "ask", label: "combat/fixed-sl-reservation", state: {},
      questions: { pick: { type: "choice", instructions: "fixed", criteria: { p: "end turn" } } },
      resolve: (answers) => ({ intent: answers.pick ? { action: "end_turn" } : null,
        rationale: "fixed accepted Jev", confidence: 1, fallback: false }) } };
  });
  const config = loadConfig({ CHARACTER: character, STRICT_JEV: "on", BRAIN_LOG: "off", RUN_PLAN: "off", FIGHT_PLAN: "off",
    THIEF_FACTS: "off", THIEF_COST: "off", BUILD_ONESHOT: "off", SL_ENABLED: "on" });
  config.log.decisionLog = join(dir, "decisions.jsonl"); config.log.jevPromptLog = null;
  config.sl.log = null; config.runPlanLog = join(dir, "run-plans.jsonl"); config.fightPlanLog = join(dir, "fight-plans.jsonl");
  let asks = 0, acts = 0;
  const jev = { ask: async () => {
    asks++;
    if (character === "silent") expect(currentDecisionBudget()?.remaining()).toBe(3000);
    else expect(currentDecisionBudget()).toBeUndefined();
    return { model: "fixed", answers: { pick: { type: "choice", choice: "p", confidence: 1, probabilities: { p: 1 }, raw: {} } },
      inputTokens: 0, outputTokens: 0, latencyMs: 0, requestId: "fixed" };
  } } as unknown as JevClient;
  const client = new ModClient({ baseUrl: "http://fixture.invalid", fetchImpl: (async (url, options) => {
    if (String(url).endsWith("/state")) return Response.json(envelope(current));
    acts++; const intent = JSON.parse(String(options?.body)); current = mainMenuPayload();
    return Response.json(envelope({ action: intent.action, status: "completed", stable: true, message: "fixed", state: current }));
  }) as typeof fetch });
  setKnowledgeCharacter(character);
  try {
    const stats = await runLoop({ config, mode: "play", client, jev, brain: null, buildSim: null, thiefSim: null,
      knowledge: loggedKnowledge, maxDecisions: 1, maxMinutes: 1, pollIntervalMs: 1, restoreRun: false });
    expect(stats.acts).toBe(1); expect(acts).toBe(1); expect(asks).toBe(1);
    const row = JSON.parse(readFileSync(config.log.decisionLog, "utf8").trim().split("\n").at(-1)!);
    expect(row.fallback).toBe(false);
    if (character === "silent") expect(row.time_budget).toMatchObject({ kind: "boss", budget_ms: 60000, jev_reserve_ms: 3000, timed_out: false });
    else expect(row.time_budget).toBeUndefined();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
