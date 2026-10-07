/** Audit the historical CLI fixture with fixed usage responses, without spawning a CLI. */
import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("../src/brain/engines/codex-usage.js", async (original) => ({
  ...await original<typeof import("../src/brain/engines/codex-usage.js")>(),
  readCodexUsage: vi.fn(),
  refreshCodexAuth: vi.fn(),
}));

import { createBrain } from "./legacy-brain.js";
import { loadConfig } from "../src/core/config.js";
import { readCodexUsage } from "../src/brain/engines/codex-usage.js";
import type { BrainLogRow } from "../src/brain/router.js";
import type { DeepSeekClient } from "../src/brain/llm/deepseek.js";

afterEach(() => { vi.restoreAllMocks(); vi.mocked(readCodexUsage).mockReset(); });

it("the historical unreadable-usage row assertion accepts the fresh-read warning and keeps Codex blocked", async () => {
  // Exercise the actual assertion from the subprocess suite, which the sandbox cannot run.
  const source = readFileSync(new URL("./brain-codex-usage.test.ts", import.meta.url), "utf8");
  const assertion = source.split("\n").find((line) => line.includes("expect(closed.rows()[0]!.notes)"));
  const literal = assertion?.match(/stringMatching\(\/(.*)\/([gimsuy]*)\)/);
  expect(literal).not.toBeNull();
  const pattern = new RegExp(literal![1]!, literal![2]);
  vi.spyOn(Date, "now").mockReturnValue(10_000_000);
  vi.mocked(readCodexUsage).mockRejectedValue(new Error("codex app-server ended before answering (fixed fixture)"));
  const choose = vi.fn().mockResolvedValue({ choice: "a", reason: "固定历史适配器回答", latencyMs: 1, inputTokens: 1, outputTokens: 1 });
  const rows: BrainLogRow[] = [];
  const notes: string[] = [];
  const config = loadConfig({ BRAIN_ENGINE: "codex", BRAIN_FALLBACK: "deepseek", BRAIN_LOG: "off", BRAIN_CODEX_USAGE_REQUIRED: "on" });
  const brain = createBrain(config, { choose, systemPrompt: "固定测试" } as unknown as DeepSeekClient, { log: (row) => rows.push(row) });
  brain.onNote((note) => notes.push(note));
  await expect(brain.preflight(undefined, async () => ({ ok: true, version: "fixed" }))).resolves.toEqual([]);
  expect(brain.warnings).toEqual([expect.stringMatching(/^codex usage could not be read at the start .* codex is off until a read works: its questions go to deepseek$/)]);
  for (let i = 0; i < 2; i += 1) {
    await expect(brain.choose({ hp: 20 }, "固定题目", { a: "heal", b: "smith" }, { label: "rest/plan" }))
      .resolves.toMatchObject({ choice: "a", brain: { engine: "deepseek" } });
  }
  expect(rows[0]!.notes).toEqual([expect.stringMatching(pattern)]);
  expect(rows[0]!.fell_back_from).toMatchObject({ engine: "codex", kind: "unavailable" });
  expect(rows[1]!.notes ?? []).toEqual([]);
  expect(notes).toEqual([expect.stringMatching(/^WARNING: .*fresh read passes: the next read in 30 s \(then 2, 5, every 10 minutes\)$/)]);
  expect(readCodexUsage).toHaveBeenCalledTimes(1);
  expect(choose).toHaveBeenCalledTimes(2);
  expect(brain.codexUsage!.status().blocked).toMatchObject({ failures: 1 });
});
