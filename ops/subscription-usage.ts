/** Safe quota observations: durations identify windows; no account/auth/error payload is archived. */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { CodexUsage } from "../agent/src/brain/engines/codex-usage.js";

export function quotaSnapshot(usage: CodexUsage | null, capturedAt: Date) {
  const observed = usage ? Date.parse(usage.readAt) : NaN;
  const age = capturedAt.getTime() - observed;
  const windows = (usage?.windows ?? []).filter((w) => Number.isFinite(w.usedPct) && w.usedPct >= 0 && w.usedPct <= 100)
    .map((w) => {
      const reset = w.resetsAt ? Date.parse(w.resetsAt) : NaN;
      return {
        bucket: /^[a-z0-9_/-]{1,80}$/i.test(w.name) ? w.name : "unknown",
        kind: w.windowMins === 10080 ? "weekly" : w.windowMins === 300 ? "five_hour" : "unknown",
        used_percent: w.usedPct,
        window_minutes: Number.isFinite(w.windowMins) && w.windowMins! > 0 ? w.windowMins : null,
        resets_at: Number.isFinite(reset) ? new Date(reset).toISOString() : null,
        stale: !Number.isFinite(observed) || age < 0 || age > 600_000 || (Number.isFinite(reset) && reset <= capturedAt.getTime()),
      };
    });
  return {
    schema_version: 1, captured_at: capturedAt.toISOString(), provider: "codex", scope: "shared_subscription",
    source: "account/rateLimits/read", sample_observed_at: Number.isFinite(observed) ? new Date(observed).toISOString() : null,
    freshness: usage ? (windows.length > 0 && windows.every((w) => !w.stale) ? "fresh" : "stale_or_unknown") : "failed",
    error_code: usage ? null : "usage_read_failed", windows,
  };
}

export async function sampleQuota(path: string, read: () => Promise<CodexUsage>, now = () => new Date()): Promise<void> {
  let usage: CodexUsage | null = null;
  try { usage = await read(); } catch { /* Archive only a fixed failure code, never subprocess diagnostics. */ }
  const snapshot = quotaSnapshot(usage, now());
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(snapshot) + "\n");
}
