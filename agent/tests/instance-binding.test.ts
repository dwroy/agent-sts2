import { describe, expect, it, vi } from "vitest";

import { ConfigError, loadConfig } from "../src/core/config.js";
import { ModClient, isRetryableModError } from "../src/hand/mod/client.js";
import { discoverMod, ModDiscoveryError } from "../src/hand/mod/discovery.js";
import { ModInstanceMismatchError } from "../src/hand/mod/instance.js";
import { parseHealth } from "../src/hand/mod/schema.js";
import { envelope, healthPayload, statePayload } from "./support.js";

function transport(pid: number, profile: string, port = 8081) {
  const calls: string[] = [];
  const fetchImpl = vi.fn(async (input: string | URL | Request) => {
    const path = new URL(String(input)).pathname;
    calls.push(path);
    const state = { ...statePayload(), native_profile_id: profile };
    const data = path === "/health" ? healthPayload(port, { process_id: pid })
      : path === "/state" ? state
      : { action: "choose_map_node", status: "completed", stable: true, message: "done", state };
    return new Response(JSON.stringify(envelope(data)), { status: 200 });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

describe("independent instance binding", () => {
  it("retains legacy unbound traffic and configuration", async () => {
    const t = transport(10, "original");
    const client = new ModClient({ baseUrl: "http://127.0.0.1:8081", fetchImpl: t.fetchImpl });
    await client.state();
    expect(t.calls).toEqual(["/state"]);
    expect(loadConfig({}).sts2).toEqual({ baseUrl: "http://127.0.0.1:8080", portScan: { from: 8080, to: 8090 }, timeoutMs: 10000 });
  });

  it("never scans onto another healthy game when the pinned endpoint fails", async () => {
    const urls: string[] = [];
    await expect(discoverMod({
      baseUrl: "http://127.0.0.1:8081", portScan: { from: 8080, to: 8090 }, timeoutMs: 1000,
      instance: { processId: 20 },
      makeClient: (url) => ({ health: async () => { urls.push(url); throw new Error("offline"); } }),
    })).rejects.toBeInstanceOf(ModDiscoveryError);
    expect(urls).toEqual(["http://127.0.0.1:8081"]);
  });

  it("refuses an answering endpoint owned by another process", async () => {
    await expect(discoverMod({
      baseUrl: "http://127.0.0.1:8081", portScan: { from: 8080, to: 8090 }, timeoutMs: 1000,
      instance: { processId: 20 },
      makeClient: () => ({ health: async () => parseHealth(healthPayload(8081, { process_id: 10 })) }),
    })).rejects.toThrow("expected process 20");
  });

  it("keeps the configured host without following a reported redirect", async () => {
    const result = await discoverMod({
      baseUrl: "http://localhost:8081", portScan: { from: 8080, to: 8090 }, timeoutMs: 1000,
      instance: { processId: 20 },
      makeClient: () => ({ health: async () => parseHealth(healthPayload(8081, { process_id: 20 })) }),
    });
    expect(result.url).toBe("http://localhost:8081");
    expect(result.reportedUrl).toBe("http://127.0.0.1:8081");
  });

  it("refuses a reported port outside the pinned endpoint", async () => {
    await expect(discoverMod({
      baseUrl: "http://127.0.0.1:8081", portScan: { from: 8080, to: 8090 }, timeoutMs: 1000,
      instance: { processId: 20 },
      makeClient: () => ({ health: async () => parseHealth(healthPayload(8080, { process_id: 20 })) }),
    })).rejects.toThrow("port 8081");
  });

  it("does not POST after a process replacement", async () => {
    const t = transport(10, "second");
    const client = new ModClient({ baseUrl: "http://127.0.0.1:8081", fetchImpl: t.fetchImpl,
      instance: { processId: 20, nativeProfileId: "second" } });
    await expect(client.act({ action: "choose_map_node" })).rejects.toBeInstanceOf(ModInstanceMismatchError);
    expect(t.calls).toEqual(["/health"]);
    expect(isRetryableModError(new ModInstanceMismatchError("wrong process"))).toBe(false);
  });

  it("does not POST into the wrong save profile even with the right process", async () => {
    const t = transport(20, "original");
    const client = new ModClient({ baseUrl: "http://127.0.0.1:8081", fetchImpl: t.fetchImpl,
      instance: { processId: 20, nativeProfileId: "second" } });
    await expect(client.act({ action: "choose_map_node" })).rejects.toThrow("expected native profile second");
    expect(t.calls).not.toContain("/action");
  });

  it("allows the selected process/profile and preserves the binding when cloning a client", async () => {
    const t = transport(20, "second");
    const client = new ModClient({ baseUrl: "http://127.0.0.1:8081", fetchImpl: t.fetchImpl,
      instance: { processId: 20, nativeProfileId: "second" } });
    expect((await client.withBaseUrl("http://127.0.0.1:8081").act({ action: "choose_map_node" })).status).toBe("completed");
    expect(t.calls).toContain("/state");
    expect(t.calls.at(-1)).toBe("/action");
  });

  it("validates binding configuration before any game request", () => {
    expect(loadConfig({ STS2_EXPECTED_PROCESS_ID: "20", STS2_EXPECTED_NATIVE_PROFILE_ID: "second" }).sts2.instance)
      .toEqual({ processId: 20, nativeProfileId: "second" });
    expect(() => loadConfig({ STS2_EXPECTED_PROCESS_ID: "0" })).toThrow(ConfigError);
    expect(() => loadConfig({ STS2_EXPECTED_NATIVE_PROFILE_ID: "second" })).toThrow(ConfigError);
  });
});
