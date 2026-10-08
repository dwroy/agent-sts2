import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { doubleQuestion, approvedFixture, probeUsageKnown, preserveProbeResult } from "../../ops/codex-brain-cache-probe.js";
import { validateRequest } from "../../ops/codex/lib.js";
import { pickSpec } from "../src/brain/specs.js";
import type { BrainAnswer, BrainRequest } from "../src/brain/types.js";

const request: BrainRequest = { label: "probe", question: "fixed question", system: "fixed full knowledge", options: { a: "fixed option" }, spec: pickSpec("probe", { a: "fixed option" }, {}) };
const answer: BrainAnswer = { engine: "codex", model: "gpt-6.1-sol", effort: "high", answer: { choice: "a", reason: "fixture" }, problems: [], attempts: 1,
  latencyMs: 10, usage: { inputTokens: 100, cacheHitTokens: 80, outputTokens: 10 }, toolCalls: [], raw: "{}", native: { mode: "session", reverted: true } };

describe("restricted Codex cache probe (offline)", () => {
  it("keeps the original ten-minute per-call timeout and stops before a second call", async () => {
    vi.useFakeTimers();
    let calls = 0;
    try {
      const pending = doubleQuestion(request, { decide: async (_request, signal) => {
        calls += 1;
        return new Promise<BrainAnswer>((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("timed out")), { once: true }));
      } }, new AbortController().signal);
      const rejected = expect(pending).rejects.toThrow("timed out");
      await vi.advanceTimersByTimeAsync(600_000);
      await rejected;
      expect(calls).toBe(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });
  it("keeps the original result byte-for-byte while preserving every later attempt", () => {
    const directory = mkdtempSync(join(tmpdir(), "probe-history-"));
    try {
      const first = preserveProbeResult(directory, { status: "completed", cached: 80 });
      const original = readFileSync(first, "utf8");
      const later = preserveProbeResult(directory, { status: "pending", error: "usage unavailable" });
      expect(first).not.toBe(later);
      expect(readFileSync(first, "utf8")).toBe(original);
      expect(readFileSync(join(directory, "probe-result.json"), "utf8")).toBe(original);
      expect(JSON.parse(readFileSync(later, "utf8"))).toEqual({ status: "pending", error: "usage unavailable" });
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
  it("treats missing cache usage as unknown and accepts a real zero", () => {
    const measured = { usage: { inputTokens: 100, cachedInputTokens: 80 } };
    expect(probeUsageKnown([measured, { usage: { inputTokens: 100, cachedInputTokens: 0 } }])).toBe(true);
    for (const missing of [{}, { usage: {} }, { usage: { inputTokens: 100 } }, { usage: { inputTokens: 100, cachedInputTokens: null } },
      { usage: { inputTokens: 100, cachedInputTokens: 101 } }]) expect(probeUsageKnown([measured, missing])).toBe(false);
  });
  it("only permits the fixed no-argument action and rejects mutated fixtures", () => {
    expect(validateRequest({ action: "codex-brain-cache-probe", args: [] }).ok).toBe(true);
    for (const args of [["--model=other"], ["/tmp/request.json"], ["https://example.com"], ["high"]]) {
      expect(validateRequest({ action: "codex-brain-cache-probe", args }).ok).toBe(false);
    }
    expect(() => approvedFixture("{}")).toThrow(/frozen bytes/);
    const source = readFileSync(new URL("../../ops/codex-brain-cache-probe.ts", import.meta.url), "utf8");
    expect(source).toContain("physicalCallLimit: 2");
    expect(source).toContain('flag: "wx"');
    expect(source).toContain('BRAIN_CODEX_USAGE_REQUIRED: "on"');
    expect(source).toContain('BRAIN_CODEX_USAGE_STOP_PCT: "80"');
    expect(source).toContain('BRAIN_CODEX_EFFORT: "high"');
  });

  it("asks exactly the same complete question twice with separate measurement IDs", async () => {
    const seen: BrainRequest[] = [];
    const results = await doubleQuestion(request, { decide: async r => { seen.push(r); return answer; } }, new AbortController().signal);
    expect(results).toHaveLength(2);
    expect(seen.map(({ questionId, ...r }) => r)).toEqual([request, request]);
    expect(seen.map(r => r.questionId)).toEqual(["cache-probe-baseline-1", "cache-probe-baseline-2"]);
  });

  it("stops at failure, cancellation or unexpected fallback", async () => {
    let calls = 0;
    await expect(doubleQuestion(request, { decide: async () => { calls += 1; throw new Error("failed"); } }, new AbortController().signal)).rejects.toThrow("failed");
    expect(calls).toBe(1);
    const controller = new AbortController(); controller.abort();
    await expect(doubleQuestion(request, { decide: async () => { calls += 1; return answer; } }, controller.signal)).rejects.toThrow("cancelled");
    expect(calls).toBe(1);
    await expect(doubleQuestion(request, { decide: async () => ({ ...answer, native: { mode: "exec" } }) }, new AbortController().signal)).rejects.toThrow(/session transport/);
  });
});
