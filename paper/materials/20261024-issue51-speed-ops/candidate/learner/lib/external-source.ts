/** External-source launch authorization and account-bound quota decisions. */
import { readFileSync } from "node:fs";
import type { CodexUsage } from "../../agent/src/brain/engines/codex-usage.js";
import type { StartupLease } from "./startup-recovery.js";
export type ExternalTier = "ultrafast" | "fast" | "default";
export interface ExternalTierDecision {
  requested: ExternalTier; effective: ExternalTier;
  weekly_used_percent: number | null; sample_observed_at: string | null;
  reason: "weekly_over_70" | "weekly_within_70" | "weekly_unknown";
  observed_service_tier: null;
}
export function externalRegistration(env: NodeJS.ProcessEnv, lease: StartupLease | undefined, task: string): boolean {
  const source = env.LEARNER_EXTERNAL_SOURCE;
  if (!source || !/^[a-z0-9][a-z0-9._-]{0,119}$/.test(source) || !lease?.current() || task !== "strategy-proposal") return false;
  try {
    const batch = JSON.parse(readFileSync(env.LEARNER_STATE_FILE!, "utf8")).batches[lease.batch];
    return batch.task === task && batch.character === "silent" && batch.reason === "external"
      && batch.external_source === source && batch.external_binding?.plan_id === source
      && batch.external_binding?.request_id === "github-issue-51-external-boss-learning-20261023"
      && batch.key === `strategy-external:${source}:${batch.external_binding.retry_generation}`
      && Array.isArray(batch.runs) && batch.runs.length === 0
      && !["backfill_source", "research_request", "implementation_request", "proposal_ids", "proposal_repair"].some((key) => key in batch);
  } catch { return false; }
}
export function externalTier(usage: CodexUsage | null, now: Date, requested: ExternalTier = "ultrafast"): ExternalTierDecision {
  const observed = usage ? Date.parse(usage.readAt) : NaN;
  const fresh = Number.isFinite(observed) && now.getTime() >= observed && now.getTime() - observed <= 600_000;
  const weekly = usage?.windows.filter((w) => w.windowMins === 10080) ?? [];
  const valid = fresh && weekly.length > 0 && weekly.every((w) => Number.isFinite(w.usedPct) && w.usedPct >= 0 && w.usedPct <= 100
    && (!w.resetsAt || Date.parse(w.resetsAt) > now.getTime()));
  const used = valid ? Math.max(...weekly.map((w) => w.usedPct)) : null;
  const cap = used === null || used > 70 ? "fast" : "ultrafast";
  const order: ExternalTier[] = ["ultrafast", "fast", "default"];
  return { requested, effective: order[Math.max(order.indexOf(cap), order.indexOf(requested))]!,
    weekly_used_percent: used, sample_observed_at: Number.isFinite(observed) ? new Date(observed).toISOString() : null,
    reason: used === null ? "weekly_unknown" : used > 70 ? "weekly_over_70" : "weekly_within_70",
    observed_service_tier: null };
}
