import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { doubleQuestion, approvedFixture } from "../../ops/codex-brain-cache-probe.js";
import { validateRequest } from "../../ops/codex/lib.js";
import { pickSpec } from "../src/brain/specs.js";
import type { BrainAnswer, BrainRequest } from "../src/brain/types.js";

const request: BrainRequest = { label: "probe", question: "fixed question", system: "fixed full knowledge", options: { a: "fixed option" }, spec: pickSpec("probe", { a: "fixed option" }, {}) };
const answer: BrainAnswer = { engine: "codex", model: "gpt-6.1-sol", effort: "high", answer: { choice: "a", reason: "fixture" }, problems: [], attempts: 1,
  latencyMs: 10, usage: { inputTokens: 100, cacheHitTokens: 80, outputTokens: 10 }, toolCalls: [], raw: "{}", native: { mode: "session", reverted: true } };

describe("restricted Codex cache probe (offline)", () => {
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
