/** The production loop reaches either knowledge agent without a legacy API client or budget. */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { createBrain } from "../src/brain/brain.js";
import { loadConfig } from "../src/core/config.js";
import { runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { restPayload, rewardCardPayload, eventPayload, mainMenuPayload, testKnowledge } from "./scenarios.js";
import { envelope } from "./support.js";
import type { BrainRequest } from "../src/brain/types.js";
import type { JevClient } from "../src/reflex/jev/client.js";

afterEach(() => { vi.restoreAllMocks(); setKnowledgeCharacter(null); });
for (const engine of ["codex", "deepseek"] as const) {
  it.each([["rest", restPayload], ["reward", rewardCardPayload], ["event", eventPayload]] as const)(`${engine}: %s uses the selected agent with no direct key`, async (_label, board) => {
    const dir = mkdtempSync(join(tmpdir(), "knowledge-loop-"));
    const cfg = loadConfig({ BRAIN_RUN_CONFIG: JSON.stringify({ engine, effort: engine === "codex" ? "high" : "max" }), BRAIN_LOG: "off", RUN_PLAN: "off", FIGHT_PLAN: "off", BUILD_ONESHOT: "off" });
    expect(cfg.deepseek).toBeFalsy();
    cfg.log.decisionLog = join(dir, "decisions.jsonl"); cfg.runPlanLog = join(dir, "run-plans.jsonl"); cfg.fightPlanLog = join(dir, "fight-plans.jsonl");
    const brain = createBrain(cfg, null), requests: BrainRequest[] = [], actions: unknown[] = [];
    expect(brain.engineFor("reward/card")).toBe(engine);
    vi.spyOn(brain.router, "decide").mockImplementation(async req => {
      requests.push(req);
      return { engine, model: "fixed", answer: { choice: Object.keys(req.options ?? {})[0], reason: "fixed" }, problems: [], attempts: 1, latencyMs: 1, usage: { inputTokens: 1, outputTokens: 1 }, toolCalls: [] };
    });
    let current = board();
    const jevAsk = vi.fn().mockRejectedValue(new Error("selected brain must receive this question"));
    const client = new ModClient({ baseUrl: "http://fixture.invalid", fetchImpl: (async (url, options) => {
      if (String(url).endsWith("/state")) return Response.json(envelope(current));
      const intent = JSON.parse(String(options?.body)); actions.push(intent); current = mainMenuPayload();
      return Response.json(envelope({ action: intent.action, status: "completed", stable: true, message: "fixed", state: current }));
    }) as typeof fetch });
    try {
      const result = await runLoop({ config: cfg, mode: "play", client, jev: { ask: jevAsk } as unknown as JevClient, brain, knowledge: testKnowledge, maxDecisions: 1, maxMinutes: 1, pollIntervalMs: 0, restoreRun: false });
      expect(result.acts).toBe(1); expect(actions).toHaveLength(1); expect(requests).toHaveLength(1);
      expect(requests[0]!.knowledge?.mode).toBe("tools"); expect(requests[0]!.tools).toHaveLength(14);
      expect(jevAsk).not.toHaveBeenCalled();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
