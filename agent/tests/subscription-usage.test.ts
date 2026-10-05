import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it, vi } from "vitest";
import type { CodexUsage } from "../src/brain/engines/codex-usage.js";
import { quotaSnapshot, sampleQuota } from "../../ops/subscription-usage.js";
import { sessionGrowth } from "../../ops/codex/lib.js";

// Keep the API fallback inside the caller's allowed temporary root when testing an unset TMPDIR.
vi.mock("node:os", async (importOriginal) => {
  const os = await importOriginal<typeof import("node:os")>();
  const fallback = os.tmpdir();
  return { ...os, tmpdir: () => process.env["TMPDIR"] || fallback };
});

const now = new Date("2026-10-05T12:50:00Z");
const usage = (reset = "2026-10-10T09:00:00Z"): CodexUsage => ({ readAt: now.toISOString(), ms: 10, plan: "pro",
  windows: [{ name: "codex/primary", usedPct: 43, windowMins: 300, resetsAt: reset },
    { name: "codex/secondary", usedPct: 21, windowMins: 10080, resetsAt: reset }], credits: null,
  ordinaryUsageAllowed: true, reachedType: null, spendControlReached: null });

it("maps the cached primary 43% observation to 5h and secondary to weekly by duration", () => {
  const g = sessionGrowth(JSON.stringify({ type: "event_msg", payload: { type: "token_count", rate_limits: {
    primary: { used_percent: 43, window_minutes: 300 }, secondary: { used_percent: 21, window_minutes: 10080 },
  } } }));
  expect(g).toMatchObject({ usedPercent: 43, fiveHourUsedPercent: 43, weeklyUsedPercent: 21 });
  const snapshot = quotaSnapshot(usage(), now);
  expect(snapshot.windows.map((w) => [w.kind, w.used_percent])).toEqual([["five_hour", 43], ["weekly", 21]]);
  expect(snapshot.freshness).toBe("fresh");
});

it("keeps reset periods separate and marks expired, old and unknown observations", () => {
  expect(quotaSnapshot(usage("2026-10-05T12:00:00Z"), now).windows.every((w) => w.stale)).toBe(true);
  const later = usage("2026-10-17T09:00:00Z");
  later.windows[1]!.usedPct = 2;
  expect(quotaSnapshot(later, now).windows[1]).toMatchObject({ used_percent: 2, resets_at: "2026-10-17T09:00:00.000Z", stale: false });
  expect(quotaSnapshot({ ...later, readAt: "2026-10-05T12:00:00Z" }, now).freshness).toBe("stale_or_unknown");
  later.windows[0]!.windowMins = null;
  expect(quotaSnapshot(later, now).windows[0]!.kind).toBe("unknown");
  expect(sessionGrowth(JSON.stringify({ payload: { type: "token_count", rate_limits: { primary: { used_percent: 43 } } } })).weeklyUsedPercent).toBeUndefined();
});

it.each([true, false])("appends success and failure without losing history or disclosing account/error payloads (TMPDIR set: %s)", async (configured) => {
  const root = tmpdir();
  vi.stubEnv("TMPDIR", configured ? root : undefined);
  let dir: string | undefined;
  try {
    dir = mkdtempSync(join(tmpdir(), "quota-test-"));
    const path = join(dir, "snapshots.jsonl");
    writeFileSync(path, '{"historical":true}\n');
    const raw = { ...usage(), accountId: "PRIVATE_ACCOUNT", secret: "PRIVATE_SECRET" };
    await sampleQuota(path, async () => raw, () => now);
    await sampleQuota(path, async () => { throw new Error("PRIVATE_ERROR"); }, () => now);
    const text = readFileSync(path, "utf8");
    expect(text.startsWith('{"historical":true}\n')).toBe(true);
    expect(text).not.toContain("PRIVATE_");
    const rows = text.trim().split("\n").map((line) => JSON.parse(line));
    expect(rows).toHaveLength(3);
    expect(rows[2]).toMatchObject({ freshness: "failed", error_code: "usage_read_failed", windows: [] });
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  }
});
