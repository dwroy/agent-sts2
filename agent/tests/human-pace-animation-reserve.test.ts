/** Production-loop regression: animation polls after computation is spent must preserve a second Jev call. */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { currentDecisionBudget, withinDecisionBudget } from "../src/core/decision-budget.js";
import { loadConfig } from "../src/core/config.js";
import { runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import type { JevClient } from "../src/reflex/jev/client.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { combatPayload, mainMenuPayload, testKnowledge } from "./scenarios.js";
import { envelope } from "./support.js";
const fixture = vi.hoisted(() => ({ plans: 0, directions: 0 }));
vi.mock("../src/v6/direction-runtime.js", async original => ({ ...await original<object>(),
  v6DirectionActive: () => { fixture.directions++; return true; } }));
vi.mock("../src/hand/screens/index.js", async original => ({ ...await original<object>(), planDecision: (env: any) => {
  if (!env.state.raw.combat.action_readiness.can_use_combat_actions) return { kind: "wait", reason: "fixed animation" };
  fixture.plans++;
  if (fixture.plans === 1) currentDecisionBudget()!.charge(currentDecisionBudget()!.remaining());
  return { kind: "ready", decision: { kind: "ask", label: `combat/fixture-${fixture.plans}`, state: {},
    questions: { pick: { type: "choice", instructions: "fixed", criteria: { end: "End turn" } } },
    resolve: () => ({ intent: { action: "end_turn" }, rationale: "fixed", confidence: 1, fallback: false }) } };
} }));
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); setKnowledgeCharacter(null); fixture.plans = fixture.directions = 0; });
it("excludes repeated exhausted-budget animation polls and skips non-combat direction loading", async () => {
  vi.useFakeTimers({ toFake: ["Date", "performance", "setTimeout", "clearTimeout"] }); vi.stubEnv("V6_MODE", "on"); vi.stubEnv("V6_COMBAT_ENTRIES", "off");
  const dir = mkdtempSync(join(tmpdir(), "h1-animation-"));
  const raw = combatPayload(); (raw.run as any).character_id = "SILENT";
  (raw.combat as any).action_readiness = { can_use_combat_actions: true };
  let current = raw, acts = 0, polls = 0, asks = 0;
  setKnowledgeCharacter("silent");
  const cfg = loadConfig({ CHARACTER: "silent", BRAIN_LOG: "off", RUN_PLAN: "off", FIGHT_PLAN: "off", BUILD_ONESHOT: "off" });
  cfg.log.decisionLog = join(dir, "decisions.jsonl"); cfg.log.jevPromptLog = null;
  cfg.runPlanLog = join(dir, "run-plans.jsonl"); cfg.fightPlanLog = join(dir, "fight-plans.jsonl");
  const client = new ModClient({ baseUrl: "http://fixture.invalid", fetchImpl: (async (url, options) => {
    if (String(url).endsWith("/state")) {
      if (acts === 1 && ++polls >= 5) (current.combat as any).action_readiness.can_use_combat_actions = true;
      return Response.json(envelope(current));
    }
    const intent = JSON.parse(String(options?.body)); acts++;
    if (acts === 1) { (current.combat as any).action_readiness.can_use_combat_actions = false; (current.combat as any).player.energy = 2; }
    else current = mainMenuPayload();
    return Response.json(envelope({ action: intent.action, status: "completed", stable: true, message: "fixed", state: current }));
  }) as typeof fetch });
  const jev = { model: "fixed", ask: async () => withinDecisionBudget("Jev", async () => {
    asks++;
    expect(currentDecisionBudget()!.remaining()).toBeGreaterThanOrEqual(2500);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { model: "fixed", answers: {}, inputTokens: 1, outputTokens: 1, latencyMs: 500, requestId: "fixed" };
  }) } as unknown as JevClient;
  try {
    const events: unknown[] = [];
    const pending = runLoop({ config: cfg, mode: "play", client, jev, brain: null, knowledge: testKnowledge,
      onEvent: event => events.push(event), maxDecisions: 2, maxMinutes: 0.2, pollIntervalMs: 400, restoreRun: false });
    await vi.advanceTimersByTimeAsync(15000);
    expect((await pending).acts, JSON.stringify(events)).toBe(2); expect(asks).toBe(2); expect(polls).toBeGreaterThanOrEqual(5);
    expect(fixture.directions).toBe(0);
    const rows = readFileSync(cfg.log.decisionLog, "utf8").trim().split("\n").map(s => JSON.parse(s));
    expect(rows.filter(r => r.decider === "jev")).toHaveLength(2);
    expect(rows.at(-1).time_budget).toMatchObject({ jev_actual_ms: 1000, animation_time_included: false, timed_out: false });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
