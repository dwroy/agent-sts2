import { afterEach, describe, expect, it } from "vitest";

import { ModDiscoveryError, discoverMod, reportedUrlFrom } from "../src/mod/discovery.js";
import { parseHealth } from "../src/mod/schema.js";
import { closedPorts, envelope, healthPayload, sendJson, startTestServer, type TestServer } from "./support.js";

const servers: TestServer[] = [];

async function serve(handler: Parameters<typeof startTestServer>[0]): Promise<TestServer> {
  const server = await startTestServer(handler);
  servers.push(server);
  return server;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

const scanOf = (port: number): { from: number; to: number } => ({ from: port, to: port });

describe("discoverMod", () => {
  it("uses the configured URL when it answers", async () => {
    const server = await serve((_req, res) => sendJson(res, 200, envelope(healthPayload(server.port))));
    const result = await discoverMod({ baseUrl: server.url, portScan: scanOf(server.port), timeoutMs: 1_000 });
    expect(result.url).toBe(server.url);
    expect(result.attempts.filter((attempt) => attempt.ok)).toHaveLength(1);
  });

  it("scans when the configured URL is dead", async () => {
    const server = await serve((_req, res) => sendJson(res, 200, envelope(healthPayload(server.port))));
    const [deadPort] = await closedPorts(1);
    const result = await discoverMod({
      baseUrl: `http://127.0.0.1:${deadPort}`,
      portScan: scanOf(server.port),
      timeoutMs: 1_000,
      probeTimeoutMs: 500,
    });
    expect(result.url).toBe(server.url);
    expect(result.attempts[0]).toMatchObject({ source: "configured", ok: false });
    expect(result.attempts.at(-1)).toMatchObject({ source: "scan", ok: true });
  });

  it("ignores a port that is serving something else", async () => {
    const other = await serve((_req, res) => sendJson(res, 200, envelope({ service: "not-the-mod" })));
    const mod = await serve((_req, res) => sendJson(res, 200, envelope(healthPayload(mod.port))));
    const result = await discoverMod({
      baseUrl: other.url,
      portScan: scanOf(mod.port),
      timeoutMs: 1_000,
      probeTimeoutMs: 500,
    });
    expect(result.url).toBe(mod.url);
    const mismatch = result.attempts.find((attempt) => attempt.url === other.url);
    expect(mismatch?.reason).toContain("not a valid STS2-Agent payload");
  });

  it("fails with an actionable message when nothing answers", async () => {
    const ports = await closedPorts(2);
    try {
      await discoverMod({
        baseUrl: `http://127.0.0.1:${ports[0]}`,
        portScan: { from: ports[1] ?? 1, to: ports[1] ?? 1 },
        timeoutMs: 500,
        probeTimeoutMs: 300,
      });
      throw new Error("expected a ModDiscoveryError");
    } catch (error) {
      expect(error).toBeInstanceOf(ModDiscoveryError);
      expect((error as ModDiscoveryError).message).toContain("Check that Slay the Spire 2 is running");
    }
  });
});

describe("reportedUrlFrom", () => {
  it("prefers the address the mod reports for itself", () => {
    expect(reportedUrlFrom(parseHealth(healthPayload(8085)))).toBe("http://127.0.0.1:8085");
  });

  it("normalises wildcard hosts to loopback", () => {
    expect(reportedUrlFrom(parseHealth(healthPayload(8080, { api_host: "0.0.0.0" })))).toBe("http://127.0.0.1:8080");
    expect(reportedUrlFrom(parseHealth(healthPayload(8080, { api_host: "::" })))).toBe("http://127.0.0.1:8080");
  });
});
