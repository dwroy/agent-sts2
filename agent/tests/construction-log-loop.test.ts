/** The production knowledge-agent route receives prior confirmed choices without extra requests. */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { createBrain } from "../src/brain/brain.js";
import type { BrainRequest } from "../src/brain/types.js";
import { loadConfig } from "../src/core/config.js";
import { runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import type { JevClient } from "../src/reflex/jev/client.js";
import { mainMenuPayload, rewardCardPayload, testKnowledge } from "./scenarios.js";
import { envelope } from "./support.js";

afterEach(() => vi.restoreAllMocks());
for (const engine of ["codex", "deepseek"] as const) {
  it(`${engine}: two construction decisions make two requests and persist short reasons`, async () => {
    const dir = mkdtempSync(join(tmpdir(), "construction-loop-"));
    const cfg = loadConfig({ BRAIN_RUN_CONFIG: JSON.stringify({ engine, effort: engine === "codex" ? "high" : "max" }), BRAIN_LOG: "off", RUN_PLAN: "off", FIGHT_PLAN: "off", BUILD_ONESHOT: "off" });
    cfg.log.decisionLog = join(dir, "nested", "decisions.jsonl");
    cfg.runPlanLog = join(dir, "run-plans.jsonl"); cfg.fightPlanLog = join(dir, "fight-plans.jsonl");
    const brain = createBrain(cfg, null), requests: BrainRequest[] = [];
    vi.spyOn(brain.router, "decide").mockImplementation(async req => {
      requests.push(req);
      const choice = requests.length === 1 ? Object.keys(req.options ?? {})[0] : "skip";
      return { engine, model: "fixed", answer: { choice, reason: requests.length === 1 ? "第一张用于本局方向" : "都不补当前缺口" }, problems: [], attempts: 1,
        latencyMs: 1, usage: { inputTokens: 1, outputTokens: 1 }, toolCalls: [] };
    });
    let current = rewardCardPayload(), sent = 0;
    const client = new ModClient({ baseUrl: "http://fixture.invalid", fetchImpl: (async (url, options) => {
      if (String(url).endsWith("/state")) return Response.json(envelope(current));
      const intent = JSON.parse(String(options?.body));
      sent++;
      if (sent === 1) {
        const run = current["run"] as Record<string, unknown>;
        const offered = (current["reward"] as Record<string, unknown>)["card_options"] as Record<string, unknown>[];
        current = rewardCardPayload();
        current["run"] = { ...run, floor: Number(run["floor"]) + 1, deck: [...run["deck"] as unknown[], offered[0]] };
      } else current = mainMenuPayload();
      return Response.json(envelope({ action: intent.action, status: "completed", stable: true, message: "fixed", state: current }));
    }) as typeof fetch });
    const jevAsk = vi.fn().mockRejectedValue(new Error("unexpected Jev request"));
    try {
      const result = await runLoop({ config: cfg, mode: "play", client, jev: { ask: jevAsk } as unknown as JevClient, brain,
        knowledge: testKnowledge, maxDecisions: 2, maxMinutes: 1, pollIntervalMs: 0, restoreRun: false });
      expect(result.acts).toBe(2); expect(sent).toBe(2); expect(requests).toHaveLength(2);
      const memory = requests[1]!.memory as Record<string, string>;
      expect(memory["construction_log"]).toContain("F9 拿 Pommel Strike：第一张用于本局方向");
      expect(memory["construction_log"]).toContain("不是规则");
      expect(requests[1]!.spec.schema.properties?.["reason"]?.description).toContain("不超过20字");
      expect(requests[1]!.tools).toHaveLength(14);
      expect(jevAsk).not.toHaveBeenCalled();
      const snapshots = readFileSync(join(dir, "nested", "construction-log.jsonl"), "utf8").trim().split("\n").map(line => JSON.parse(line));
      const last = snapshots.at(-1);
      expect(last.run_id).toBe("TESTRUN123");
      expect(last.entries.map((e: { action: string }) => e.action)).toEqual(["拿", "跳过"]);
      expect(last.entries[1].cards).toContain("Pommel Strike/Shrug It Off/Inflame");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
