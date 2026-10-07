/** Fixed usage responses exercise the historical factory without any CLI, login file or model call. */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/brain/engines/codex-usage.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/brain/engines/codex-usage.js")>(),
  readCodexUsage: vi.fn(),
  refreshCodexAuth: vi.fn(),
}));

import { createBrain } from "./legacy-brain.js";
import { readCodexUsage, refreshCodexAuth, parseRateLimits, type CodexUsage } from "../src/brain/engines/codex-usage.js";
import type { DeepSeekClient } from "../src/brain/llm/deepseek.js";
import { loadConfig } from "../src/core/config.js";

const unreadable = "account/rateLimits/read failed: service unavailable";
const expired = "401 Unauthorized; Provided authentication token is expired";

function fixture() {
  const config = loadConfig({ BRAIN_ENGINE: "codex", BRAIN_FALLBACK: "deepseek", BRAIN_LOG: "off", BRAIN_CODEX_USAGE_REQUIRED: "off" });
  const brain = createBrain(config, { systemPrompt: "固定测试题面" } as unknown as DeepSeekClient);
  const notes: string[] = [];
  brain.onNote((message) => notes.push(message));
  return { brain, notes };
}

function usage(): CodexUsage {
  return {
    readAt: "2026-10-07T04:40:00.000Z", ms: 1,
    ...parseRateLimits({
      accountId: "private-fixture-account", banner: "private-fixture-banner",
      ordinaryUsageAllowed: true,
      rateLimits: {
        limitId: "codex", planType: "prolite",
        primary: { usedPercent: 1, windowDurationMins: 10080, resetsAt: 1791623197 },
        credits: { hasCredits: true, unlimited: false, balance: "500" },
      },
    }),
  };
}

beforeEach(() => {
  vi.mocked(readCodexUsage).mockReset();
  vi.mocked(refreshCodexAuth).mockReset().mockResolvedValue(undefined);
});

describe("historical brain engine notes", () => {
  it("delivers an unreadable-usage WARNING once to Brain.onNote", async () => {
    vi.mocked(readCodexUsage).mockRejectedValue(new Error(unreadable));
    const { brain, notes } = fixture();
    await expect(brain.preflight(undefined, async () => ({ ok: true, version: "fixed-fixture" }))).resolves.toEqual([]);
    await brain.codexUsage!.refresh();
    expect(notes).toEqual([`WARNING: codex usage could not be read (${unreadable}); codex stays on without the usage guard until a read works (BRAIN_CODEX_USAGE_REQUIRED=on keeps it off until then instead)`]);
    expect(readCodexUsage).toHaveBeenCalledTimes(2);
    expect(refreshCodexAuth).not.toHaveBeenCalled();
    expect(brain.codexUsage!.status()).not.toHaveProperty("stopped");
  });

  it("delivers a successful token-refresh note without account data", async () => {
    vi.mocked(readCodexUsage).mockRejectedValueOnce(new Error(expired)).mockResolvedValueOnce(usage());
    const { brain, notes } = fixture();
    await expect(brain.preflight(undefined, async () => ({ ok: true, version: "fixed-fixture" }))).resolves.toEqual([]);
    expect(notes).toEqual([`codex usage read was refused on the login (${expired}); codex refreshed its token (account/read) and the read works`]);
    expect(readCodexUsage).toHaveBeenCalledTimes(2);
    expect(refreshCodexAuth).toHaveBeenCalledTimes(1);
    expect(brain.codexUsage!.takeNotes()).toEqual(notes);
    expect(brain.codexUsage!.status()).toMatchObject({ auth_refreshes: 1, last: { used_pct: 1, credits: 500 } });
    expect(JSON.stringify({ notes, status: brain.codexUsage!.status() })).not.toContain("private-fixture");
  });
});
