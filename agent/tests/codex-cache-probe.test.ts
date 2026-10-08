import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { doubleQuestion, approvedFixture, probeUsageKnown, preserveProbeResult, probeConfig, PROBE_HOME,
  checkProbeHome, approvedHistory, reserveRepairPair, claimProbeCall } from "../../ops/codex-brain-cache-probe.js";
import { validateRequest } from "../../ops/codex/lib.js";
import { pickSpec } from "../src/brain/specs.js";
import type { BrainAnswer, BrainRequest } from "../src/brain/types.js";

const request: BrainRequest = { label: "probe", question: "fixed question", system: "fixed full knowledge", options: { a: "fixed option" }, spec: pickSpec("probe", { a: "fixed option" }, {}) };
const answer: BrainAnswer = { engine: "codex", model: "gpt-6.1-sol", effort: "high", answer: { choice: "a", reason: "fixture" }, problems: [], attempts: 1,
  latencyMs: 10, usage: { inputTokens: 100, cacheHitTokens: 80, outputTokens: 10 }, toolCalls: [], raw: "{}", native: { mode: "session", reverted: true } };

describe("restricted Codex cache probe (offline)", () => {
  it("uses the established isolated brain home with the same full production model/effort/settings", () => {
    const config = probeConfig();
    expect(config.brain.codex.home).toBe("/home/dw/.codex-brain");
    expect(PROBE_HOME).toBe(config.brain.codex.home);
    expect(config.brain.engines.codex).toMatchObject({ model: "gpt-6.1-sol", effort: "high", timeoutMs: 600_000, tools: false });
    expect(config.brain.codex).toMatchObject({ mode: "session", schemaFields: "used", summary: "auto", serviceTier: null,
      usage: { required: true, stopPct: 80 } });
  });

  it("refuses a global-style home before any reservation, and only checks the isolated login's existence", () => {
    const home = mkdtempSync(join(tmpdir(), "probe-home-"));
    try {
      expect(() => checkProbeHome(home)).toThrow(/no existing login/);
      writeFileSync(join(home, "auth.json"), "invalid fixture deliberately never parsed");
      writeFileSync(join(home, "AGENTS.md"), "fixture global memory");
      expect(() => checkProbeHome(home)).toThrow(/home isolation/);
      expect(existsSync(join(home, "probe-reserved.json"))).toBe(false);
      rmSync(join(home, "AGENTS.md"));
      writeFileSync(join(home, "AGENTS.override.md"), "fixture global override");
      expect(() => checkProbeHome(home)).toThrow(/home isolation/);
      rmSync(join(home, "AGENTS.override.md"));
      writeFileSync(join(home, "config.toml"), 'approvals_reviewer = "user"\n');
      expect(() => checkProbeHome(home)).toThrow(/config.toml/);
      writeFileSync(join(home, "config.toml"), "");
      expect(() => checkProbeHome(home)).not.toThrow();
      expect(readFileSync(join(home, "auth.json"), "utf8")).toBe("invalid fixture deliberately never parsed");
    } finally { rmSync(home, { recursive: true, force: true }); }
  });

  it("preserves baseline bytes and caps the independently reserved repair pair across restarts", () => {
    const old = mkdtempSync(join(tmpdir(), "probe-old-"));
    const repair = mkdtempSync(join(tmpdir(), "probe-repair-"));
    // Exact frozen safe failure bytes; no live paths, credentials or game knowledge.
    const originalReservation = '{"fixture_sha256":"6c84bfef4438bc164d75901fcf88d6e08aadc2efd9ad64dfbab1f1634257bc98","max_physical_calls":2}';
    const originalResult = JSON.stringify({ status: "pending", fixture_sha256: "6c84bfef4438bc164d75901fcf88d6e08aadc2efd9ad64dfbab1f1634257bc98",
      max_physical_calls: 2, comparison: "baseline session+revert repeated question; production transport is unchanged", results: null, limits_before: null,
      error: "/home/dw/.codex/AGENTS.md would be loaded into the brain call (codex reads it whatever the flags) [unavailable]" }, null, 2);
    try {
      writeFileSync(join(old, "probe-reserved.json"), originalReservation);
      writeFileSync(join(old, "probe-result.json"), originalResult);
      const history = approvedHistory(old);
      expect(history).toMatchObject({ allocated_calls: 2, model_calls_observed: 0 });
      reserveRepairPair(repair, history);
      const reservation = readFileSync(join(repair, "probe-reserved.json"), "utf8");
      expect(JSON.parse(reservation)).toMatchObject({ pair: "repair", max_physical_calls: 2, total_allocated_calls: 4 });
      expect(() => reserveRepairPair(repair, history)).toThrow(/already reserved/);
      claimProbeCall(repair, { mode: "session", questionId: "cache-probe-repair-1" });
      // A fresh invocation has no in-memory state to reset, and retains the first failed/uncertain attempt.
      claimProbeCall(repair, { mode: "exec", questionId: "cache-probe-repair-2" });
      expect(() => claimProbeCall(repair, { mode: "session" })).toThrow(/budget exhausted/);
      expect(readdirSync(repair).filter(name => name.startsWith("probe-physical-claim-"))).toHaveLength(2);
      expect(readFileSync(join(repair, "probe-reserved.json"), "utf8")).toBe(reservation);
      expect(readFileSync(join(old, "probe-reserved.json"), "utf8")).toBe(originalReservation);
      expect(readFileSync(join(old, "probe-result.json"), "utf8")).toBe(originalResult);
      writeFileSync(join(old, "probe-codex-calls.jsonl"), "");
      expect(() => approvedHistory(old)).toThrow(/ambiguous/);
      rmSync(join(old, "probe-codex-calls.jsonl"));
      writeFileSync(join(old, "probe-result.json"), originalResult + "\n");
      expect(() => approvedHistory(old)).toThrow(/history differs/);
    } finally { rmSync(old, { recursive: true, force: true }); rmSync(repair, { recursive: true, force: true }); }
  });

  it("refuses missing, invalid or ambiguous physical reservation evidence without dispatch", () => {
    const directory = mkdtempSync(join(tmpdir(), "probe-ledger-"));
    try {
      expect(() => claimProbeCall(directory, { mode: "session" })).toThrow();
      expect(() => reserveRepairPair(directory, {} as ReturnType<typeof approvedHistory>)).toThrow(/unapproved/);
      writeFileSync(join(directory, "probe-reserved.json"), JSON.stringify({ pair: "repair", max_physical_calls: 4 }));
      expect(() => claimProbeCall(directory, { mode: "session" })).toThrow(/invalid persistent/);
      expect(readdirSync(directory)).toEqual(["probe-reserved.json"]);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
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
    const repaired: BrainRequest[] = [];
    await doubleQuestion(request, { decide: async r => { repaired.push(r); return answer; } }, new AbortController().signal, "repair");
    expect(repaired.map(({ questionId, ...r }) => r)).toEqual([request, request]);
    expect(repaired.map(r => r.questionId)).toEqual(["cache-probe-repair-1", "cache-probe-repair-2"]);
  });

  it("stops at failure, cancellation or unexpected fallback", async () => {
    let calls = 0;
    await expect(doubleQuestion(request, { decide: async () => { calls += 1; throw new Error("failed"); } }, new AbortController().signal)).rejects.toThrow("failed");
    expect(calls).toBe(1);
    const controller = new AbortController(); controller.abort();
    await expect(doubleQuestion(request, { decide: async () => { calls += 1; return answer; } }, controller.signal)).rejects.toThrow("cancelled");
    expect(calls).toBe(1);
    await expect(doubleQuestion(request, { decide: async () => ({ ...answer, native: { mode: "exec" } }) }, new AbortController().signal)).rejects.toThrow(/session transport/);
    calls = 0;
    await expect(doubleQuestion(request, { decide: async () => { calls += 1; return { ...answer, native: { mode: "session", reverted: false } }; } }, new AbortController().signal)).rejects.toThrow(/revert failed/);
    expect(calls).toBe(1);
  });
});
