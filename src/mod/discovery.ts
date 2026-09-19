/**
 * Base-URL discovery (PLAN.md §2.1 fact 1).
 *
 * The mod defaults to 8080 but silently increments the port when it is taken, so a hard-coded URL is
 * not enough. We probe the configured URL first, then scan `STS2_PORT_SCAN`, and finally trust the
 * address the mod reports about itself in `/health`.
 */

import { ModClient } from "./client.js";
import { PayloadShapeError, type Health } from "./schema.js";

export interface DiscoveryAttempt {
  url: string;
  source: "configured" | "scan";
  ok: boolean;
  reason: string | null;
}

export interface DiscoveryResult {
  /** URL that actually answered. */
  url: string;
  health: Health;
  /** Address the mod reports for itself; differs from `url` only in exotic setups. */
  reportedUrl: string;
  attempts: DiscoveryAttempt[];
}

export class ModDiscoveryError extends Error {
  readonly attempts: DiscoveryAttempt[];

  constructor(attempts: DiscoveryAttempt[]) {
    const tried = attempts.map((a) => `  - ${a.url} (${a.source}): ${a.reason ?? "no response"}`).join("\n");
    super(
      attempts.length === 0
        ? "no candidate URLs to probe"
        : `could not find the STS2-Agent mod on any candidate URL:\n${tried}\n\n` +
            "Check that Slay the Spire 2 is running with the mod loaded, then set STS2_BASE_URL to the " +
            "address shown in the in-game overlay (F8 → Connect).",
    );
    this.name = "ModDiscoveryError";
    this.attempts = attempts;
  }
}

export interface DiscoverOptions {
  baseUrl: string;
  portScan: { from: number; to: number };
  timeoutMs: number;
  /** Per-probe timeout; deliberately short so a full scan stays tolerable. */
  probeTimeoutMs?: number;
  /** Injectable for tests. */
  makeClient?: (baseUrl: string, timeoutMs: number) => { health(options?: { timeoutMs?: number }): Promise<Health> };
}

/** `0.0.0.0` / `::` / `[::]` are not dialable; fall back to loopback. */
function dialableHost(host: string): string {
  const cleaned = host.replace(/^\[|\]$/g, "");
  if (cleaned === "0.0.0.0" || cleaned === "::" || cleaned === "") return "127.0.0.1";
  return cleaned.includes(":") ? `[${cleaned}]` : cleaned;
}

export function reportedUrlFrom(health: Health): string {
  return `http://${dialableHost(health.api_host)}:${health.api_port}`;
}

function candidateUrls(options: DiscoverOptions): { url: string; source: "configured" | "scan" }[] {
  const configured = options.baseUrl.replace(/\/+$/, "");
  const candidates: { url: string; source: "configured" | "scan" }[] = [{ url: configured, source: "configured" }];

  let host = "127.0.0.1";
  let configuredPort: number | null = null;
  try {
    const parsed = new URL(configured);
    host = parsed.hostname || host;
    configuredPort = parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : 80;
  } catch {
    // keep the loopback default; the configured entry will fail with a clear reason
  }
  const printableHost = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;

  for (let port = options.portScan.from; port <= options.portScan.to; port += 1) {
    if (port === configuredPort) continue;
    candidates.push({ url: `http://${printableHost}:${port}`, source: "scan" });
  }
  return candidates;
}

export async function discoverMod(options: DiscoverOptions): Promise<DiscoveryResult> {
  const probeTimeoutMs = options.probeTimeoutMs ?? Math.min(1_500, options.timeoutMs);
  const makeClient = options.makeClient ?? ((baseUrl, timeoutMs) => new ModClient({ baseUrl, timeoutMs }));
  const attempts: DiscoveryAttempt[] = [];

  for (const candidate of candidateUrls(options)) {
    try {
      const health = await makeClient(candidate.url, probeTimeoutMs).health({ timeoutMs: probeTimeoutMs });
      if (health.service !== "sts2-ai-agent") {
        attempts.push({
          url: candidate.url,
          source: candidate.source,
          ok: false,
          reason: `answered, but service is "${health.service}" — not the mod`,
        });
        continue;
      }
      attempts.push({ url: candidate.url, source: candidate.source, ok: true, reason: null });
      const reportedUrl = reportedUrlFrom(health);
      return {
        url: reportedUrl === candidate.url ? candidate.url : reportedUrl,
        health,
        reportedUrl,
        attempts,
      };
    } catch (error) {
      const reason =
        error instanceof PayloadShapeError
          ? `answered, but /health was not a valid STS2-Agent payload (${error.issues.length} problems)`
          : error instanceof Error
            ? error.message
            : String(error);
      attempts.push({
        url: candidate.url,
        source: candidate.source,
        ok: false,
        reason,
      });
    }
  }

  throw new ModDiscoveryError(attempts);
}
