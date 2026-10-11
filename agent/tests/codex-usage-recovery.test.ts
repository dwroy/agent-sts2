import { describe, expect, it } from "vitest";
import { CodexUsageGuard, type CodexUsage } from "../src/brain/engines/codex-usage.js";

// SPC7NVA5K4RL F36: the old weekly window stopped at 100%, then renewed with zero credits.
const OLD_RESET = "2026-10-16T23:45:14.000Z";
const NEW_RESET = "2026-10-17T23:53:38.000Z";
const settings = { stopPct: 100, everyCalls: 1, everyMin: 10, required: true };
function fixture() {
  let now = Date.parse("2026-10-10T23:53:54.000Z");
  let error: string | null = null;
  let next: CodexUsage = {
    readAt: new Date(now).toISOString(), ms: 900, plan: "promax",
    windows: [{ name: "codex/primary", usedPct: 100, windowMins: 10080, resetsAt: OLD_RESET }],
    credits: { hasCredits: true, unlimited: false, balance: 416.75189 },
    ordinaryUsageAllowed: true, reachedType: null, spendControlReached: false,
  };
  const guard = new CodexUsageGuard(settings, async () => {
    now += 60_000;
    if (error) throw new Error(error);
    return { ...structuredClone(next), readAt: new Date(now).toISOString() };
  }, { now: () => now });
  return {
    guard,
    set: (patch: Partial<CodexUsage>) => { next = { ...next, ...patch }; },
    fail: (message: string | null) => { error = message; },
  };
}
function renewed(patch: Partial<CodexUsage> = {}): Partial<CodexUsage> {
  return {
    windows: [{ name: "codex/primary", usedPct: 1, windowMins: 10080, resetsAt: NEW_RESET }],
    credits: { hasCredits: false, unlimited: false, balance: 0 },
    ordinaryUsageAllowed: true, reachedType: null, spendControlReached: false,
    ...patch,
  };
}

describe("credit baseline after included quota renewal", () => {
  it("SPC7NVA5K4RL F36: resumes after two fresh stable readings in the renewed weekly window", async () => {
    const { guard, set } = fixture();
    expect(await guard.start()).toContain("100% used");
    set({ credits: { hasCredits: false, unlimited: false, balance: 0 }, ordinaryUsageAllowed: false, reachedType: "rate_limit_reached" });
    await expect(guard.recover()).rejects.toThrow("credits are being spent");
    set(renewed());
    await expect(guard.recover()).rejects.toThrow("credits are being spent");
    await expect(guard.beforeCall()).rejects.toThrow("100% used");
    await expect(guard.recover()).resolves.toBeUndefined();
    await expect(guard.beforeCall()).resolves.toBeUndefined();
    expect(guard.status().stopped).toBeUndefined();
    expect(guard.first?.credits?.balance).toBe(416.75189);
    expect(guard.takeNotes()).toEqual([expect.stringContaining("previous epoch baseline 416.75189 retired")]);
    // The new epoch still catches spending after a top-up.
    set({ credits: { hasCredits: true, unlimited: false, balance: 10 } });
    await guard.refresh();
    set({ credits: { hasCredits: true, unlimited: false, balance: 9 } });
    await guard.refresh();
    await expect(guard.recover()).rejects.toThrow("balance fell from 10 to 9");
  });

  it.each([
    ["same reset", { windows: [{ name: "codex/primary", usedPct: 1, windowMins: 10080, resetsAt: OLD_RESET }] }],
    ["missing reset", { windows: [{ name: "codex/primary", usedPct: 1, windowMins: 10080, resetsAt: null }] }],
    ["invalid reset", { windows: [{ name: "codex/primary", usedPct: 1, windowMins: 10080, resetsAt: "invalid" }] }],
    ["changed bucket", { windows: [{ name: "other/primary", usedPct: 1, windowMins: 10080, resetsAt: NEW_RESET }] }],
    ["changed duration", { windows: [{ name: "codex/primary", usedPct: 1, windowMins: 300, resetsAt: NEW_RESET }] }],
    ["missing windows", { windows: [] }],
    ["quota still full", { windows: [{ name: "codex/primary", usedPct: 100, windowMins: 10080, resetsAt: NEW_RESET }] }],
    ["ordinary usage unknown", { ordinaryUsageAllowed: null }],
    ["ordinary usage refused", { ordinaryUsageAllowed: false }],
    ["limit reached", { reachedType: "rate_limit_reached" }],
    ["spend control", { spendControlReached: true }],
    ["changed plan", { plan: "other" }],
    ["unknown balance", { credits: null }],
  ] satisfies Array<[string, Partial<CodexUsage>]>) ("keeps the stop for %s", async (_name, patch) => {
    const { guard, set } = fixture();
    await guard.start();
    set(renewed(patch));
    await expect(guard.recover()).rejects.toThrow();
    await expect(guard.recover()).rejects.toThrow();
    expect(guard.takeNotes()).toEqual([]);
  });

  it("keeps a falling balance blocked inside the renewed epoch, including after failed reads", async () => {
    const { guard, set, fail } = fixture();
    await guard.start();
    set(renewed({ credits: { hasCredits: true, unlimited: false, balance: 10 } }));
    await expect(guard.recover()).rejects.toThrow();
    set({ credits: { hasCredits: true, unlimited: false, balance: 9 } });
    await expect(guard.recover()).rejects.toThrow();
    fail("authentication token is expired");
    await expect(guard.recover()).rejects.toThrow("authentication token is expired");
    fail(null);
    await expect(guard.recover()).rejects.toThrow("credits are being spent");
    await expect(guard.recover()).rejects.toThrow("credits are being spent");
  });

  it("requires every exhausted window to renew and never treats a push as a confirmation", async () => {
    const { guard, set } = fixture();
    set({ windows: [
      { name: "codex/primary", usedPct: 100, windowMins: 10080, resetsAt: OLD_RESET },
      { name: "codex/secondary", usedPct: 100, windowMins: 300, resetsAt: OLD_RESET },
    ] });
    await guard.start();
    const partial = [
      { name: "codex/primary", usedPct: 1, windowMins: 10080, resetsAt: NEW_RESET },
      { name: "codex/secondary", usedPct: 1, windowMins: 300, resetsAt: OLD_RESET },
    ];
    set(renewed({ windows: partial }));
    await expect(guard.recover()).rejects.toThrow();
    await expect(guard.recover()).rejects.toThrow();
    set({ windows: partial.map((w) => ({ ...w, resetsAt: NEW_RESET })) });
    guard.observe({ rateLimits: { primary: { usedPercent: 1, windowDurationMins: 10080, resetsAt: Date.parse(NEW_RESET) / 1000 } } });
    await expect(guard.recover()).rejects.toThrow();
    await expect(guard.recover()).resolves.toBeUndefined();
  });

  it("does not rebase a credit-only stop when no included window was exhausted", async () => {
    const { guard, set } = fixture();
    set({ windows: [{ name: "codex/primary", usedPct: 1, windowMins: 10080, resetsAt: OLD_RESET }] });
    await guard.start();
    set({ credits: { hasCredits: true, unlimited: false, balance: 400 } });
    await guard.refresh();
    set(renewed());
    await expect(guard.recover()).rejects.toThrow("credits are being spent");
    await expect(guard.recover()).rejects.toThrow("credits are being spent");
  });

  it("recovers a quota stop received by push only after full reads confirm renewal", async () => {
    const { guard, set } = fixture();
    set({ windows: [{ name: "codex/primary", usedPct: 96, windowMins: 10080, resetsAt: OLD_RESET }] });
    await guard.start();
    guard.observe({ rateLimits: { primary: { usedPercent: 100, windowDurationMins: 10080, resetsAt: Date.parse(OLD_RESET) / 1000 } } });
    await expect(guard.beforeCall()).rejects.toThrow("100% used");
    set(renewed());
    await expect(guard.recover()).rejects.toThrow("credits are being spent");
    await expect(guard.recover()).resolves.toBeUndefined();
  });
});
