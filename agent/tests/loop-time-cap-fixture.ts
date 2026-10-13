import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { runLoop, type LoopEvent, type LoopStats } from "../src/hand/loop.js";
import type { ModClient } from "../src/hand/mod/client.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { testKnowledge } from "./scenarios.js";

/** Exercise real loop deadlines with fixed states and time, without HTTP or a model. */
export async function runTimeCapFixture(
  payload: Record<string, unknown>,
  after?: { atMs: number; payload: Record<string, unknown> },
): Promise<{ stats: LoopStats; elapsed: number; events: LoopEvent[] }> {
  const directory = mkdtempSync(join(tmpdir(), "loop-time-cap-"));
  const controller = new AbortController();
  const events: LoopEvent[] = [];
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  vi.setSystemTime(0);
  const started = Date.now();
  const initial = parseGameState(payload);
  const next = after ? parseGameState(after.payload) : null;
  const client = {
    state: async () => after && Date.now() - started >= after.atMs ? next! : initial,
    action: async () => { throw new Error("time-cap fixture must not dispatch actions"); },
  } as unknown as ModClient;
  const config = loadConfig({} as NodeJS.ProcessEnv);
  const pending = runLoop({
    config: { ...config, combatPlanner: "card", log: { ...config.log, decisionLog: join(directory, "decisions.jsonl") } },
    mode: "shadow", client, jev: null, brain: null, knowledge: testKnowledge,
    restoreRun: false, maxMinutes: 0.005, combatGraceMinutes: 0.01, pollIntervalMs: 2,
    signal: controller.signal, onEvent: (event) => events.push(event),
  });
  try {
    await vi.advanceTimersByTimeAsync(1_000);
    // Bound the fixture even if a regression stops the deadline from advancing.
    controller.abort();
    await vi.advanceTimersByTimeAsync(2);
    const stats = await pending;
    return { stats, elapsed: stats.elapsedMs, events };
  } finally {
    vi.useRealTimers();
    rmSync(directory, { recursive: true, force: true });
  }
}
