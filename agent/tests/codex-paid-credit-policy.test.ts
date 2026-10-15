import { describe, expect, it, vi } from "vitest";

vi.mock("../src/core/paths.js", async (original) => ({
  ...await original<typeof import("../src/core/paths.js")>(),
  PROJECT_ROOT: "/home/dw/Projects/agent-sts2/.worktrees/live",
}));

import { mainSilentCreditsAllowed, MAIN_SILENT_CREDIT_SCOPE } from "../src/brain/engines/codex-credit-policy.js";
import { CodexUsageGuard, usageReadTimeout, type CodexUsage } from "../src/brain/engines/codex-usage.js";
import { readBrainConfig } from "../src/core/config.js";

const root = "/home/dw/Projects/agent-sts2";
const live = `${root}/.worktrees/live`;
const home = `${root}/ops/codex-ops/accounts/codex1/brain`;
const env = { CHARACTER: "silent", STS2_WORKSPACE: root, BRAIN_CODEX_HOME: home, BRAIN_CODEX_PAID_CREDITS: MAIN_SILENT_CREDIT_SCOPE };
const settings = { stopPct: 100, everyCalls: 1, everyMin: 10, required: true };
const reading = (patch: Partial<CodexUsage> = {}): CodexUsage => ({
  readAt: "2026-10-15T04:26:28.000Z", ms: 33405, plan: "pro",
  windows: [{ name: "codex/primary", usedPct: 100, windowMins: 10080, resetsAt: "2026-10-20T04:58:44.000Z" }],
  credits: { hasCredits: true, unlimited: false, balance: 43894.4592665 },
  ordinaryUsageAllowed: false, reachedType: "rate_limit_reached", spendControlReached: false, ...patch,
});

describe("explicit main Silent codex1 credit admission", () => {
  it("requires the exact lane, login, character and explicit authorization; other roles and workers stay off", () => {
    expect(mainSilentCreditsAllowed(env, "silent", live)).toBe(true);
    for (const character of ["ironclad", "regent", "", "unknown"]) expect(mainSilentCreditsAllowed(env, character, live)).toBe(false);
    for (const checkout of [root, `${root}/.worktrees/regent-climb`, `${root}/.worktrees/codex-dev`, "/another/space/.worktrees/live"]) {
      expect(mainSilentCreditsAllowed(env, "silent", checkout)).toBe(false);
    }
    for (const patch of [{ BRAIN_CODEX_PAID_CREDITS: undefined }, { BRAIN_CODEX_PAID_CREDITS: "on" },
      { BRAIN_CODEX_HOME: "/home/dw/.codex-brain" }, { BRAIN_CODEX_HOME: `${home}-other` }, { STS2_WORKSPACE: "/another/space" }]) {
      expect(mainSilentCreditsAllowed({ ...env, ...patch }, "silent", live)).toBe(false);
    }
  });

  it("sets required protection and logs an explicit scope only in the authorized configuration", () => {
    const problems: Array<{ field: string; message: string }> = [];
    const admitted = readBrainConfig({ ...env, BRAIN_CODEX_USAGE_REQUIRED: "off" }, problems);
    expect(problems).toEqual([]);
    expect(admitted.codex.usage).toMatchObject({ paidCredits: true, required: true });
    expect(readBrainConfig({ ...env, CHARACTER: "regent" }, []).codex.usage).not.toHaveProperty("paidCredits");
    expect(readBrainConfig({ ...env, BRAIN_CODEX_PAID_CREDITS: undefined }, []).codex.usage).not.toHaveProperty("paidCredits");
    expect(usageReadTimeout({})).toBe(20000);
    expect(usageReadTimeout(admitted.codex.usage)).toBe(90000);
    const guard = new CodexUsageGuard(admitted.codex.usage, async () => reading());
    expect(guard.status().paid_credits).toBe(MAIN_SILENT_CREDIT_SCOPE);
    expect(new CodexUsageGuard(settings, async () => reading()).status()).not.toHaveProperty("paid_credits");
  });

  it("preserves the old default refusal and admits the actual 100%/positive-credit fixture only explicitly", async () => {
    expect(await new CodexUsageGuard(settings, async () => reading()).start()).toContain("would draw on credits");
    let balance = 43894.4592665;
    const guard = new CodexUsageGuard({ ...settings, paidCredits: true }, async () => reading({ credits: { hasCredits: true, unlimited: false, balance } }));
    await expect(guard.start()).resolves.toBeNull();
    for (const next of [43890, 43800, 1]) {
      balance = next;
      await expect(guard.beforeCall()).resolves.toBeUndefined();
      guard.noteCall();
    }
    balance = 0;
    await expect(guard.beforeCall()).rejects.toThrow("positive remaining balance");
    balance = 20;
    await expect(guard.recover()).resolves.toBeUndefined();
    await expect(guard.beforeCall()).resolves.toBeUndefined();
  });

  it.each([null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects a missing, depleted or invalid balance: %s", async (balance) => {
    const guard = new CodexUsageGuard({ ...settings, paidCredits: true }, async () => reading({ credits: { hasCredits: true, unlimited: false, balance } }));
    expect(await guard.start()).toContain("positive remaining balance");
    await expect(guard.beforeCall()).rejects.toThrow("positive remaining balance");
  });

  it.each<Partial<CodexUsage>>([
    { credits: null }, { credits: { hasCredits: false, unlimited: false, balance: 40000 } },
    { spendControlReached: true }, { spendControlReached: null }, { reachedType: "workspace_credits_depleted" },
    { reachedType: "unknown_limit" }, { windows: [] }, { plan: null },
    { windows: [{ name: "codex/individual", usedPct: 100, windowMins: null, resetsAt: null }] },
  ])("does not waive quota or spend-control uncertainty: %j", async (patch) => {
    const guard = new CodexUsageGuard({ ...settings, paidCredits: true }, async () => reading(patch));
    expect(await guard.start()).toBeTypeOf("string");
    await expect(guard.beforeCall()).rejects.toThrow("codex usage guard");
  });

  it("fails closed on an unreadable account, even if a caller tries required=false", async () => {
    const guard = new CodexUsageGuard({ ...settings, paidCredits: true, required: false }, async () => { throw new Error("quota RPC timeout"); });
    await guard.start();
    await expect(guard.beforeCall()).rejects.toThrow("quota RPC timeout");
    expect(guard.blocked).not.toBeNull();
  });

  it("accepts renewed ordinary usage, preserves sparse credit pushes, and stops at an explicit spend refusal", async () => {
    const guard = new CodexUsageGuard({ ...settings, paidCredits: true }, async () => reading({ ordinaryUsageAllowed: true, reachedType: null,
      windows: [{ name: "codex/primary", usedPct: 1, windowMins: 10080, resetsAt: "2026-10-27T04:58:44.000Z" }] }));
    await expect(guard.start()).resolves.toBeNull();
    guard.observe({ rateLimits: { limitId: "codex", primary: { usedPercent: 2, windowDurationMins: 10080 } } });
    await expect(guard.beforeCall()).resolves.toBeUndefined();
    expect(guard.last?.credits?.balance).toBe(43894.4592665);
    guard.observe({ rateLimits: { limitId: "codex", primary: { usedPercent: 2 }, spendControlReached: true } });
    await expect(guard.beforeCall()).rejects.toThrow("spend-control");
  });
});
