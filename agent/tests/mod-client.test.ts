import { afterEach, describe, expect, it } from "vitest";

import { ModClient, ModProtocolError, ModResponseError, ModUnreachableError, isRetryableModError } from "../src/hand/mod/client.js";
import { PayloadShapeError } from "../src/hand/mod/schema.js";
import {
  actionsPayload,
  closedPorts,
  envelope,
  errorEnvelope,
  healthPayload,
  sendJson,
  startTestServer,
  statePayload,
  type TestServer,
} from "./support.js";

const servers: TestServer[] = [];

async function serve(handler: Parameters<typeof startTestServer>[0]): Promise<TestServer> {
  const server = await startTestServer(handler);
  servers.push(server);
  return server;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("ModClient", () => {
  it("reads /health", async () => {
    const server = await serve((_req, res) => sendJson(res, 200, envelope(healthPayload(server.port))));
    const client = new ModClient({ baseUrl: server.url });
    const health = await client.health();
    expect(health.service).toBe("sts2-ai-agent");
    expect(health.api_port).toBe(server.port);
  });

  it("reads /state and /actions/available", async () => {
    const server = await serve((req, res) => {
      if (req.url === "/state") return sendJson(res, 200, envelope(statePayload()));
      if (req.url === "/actions/available") return sendJson(res, 200, envelope(actionsPayload()));
      return sendJson(res, 404, errorEnvelope("not_found", "no route"));
    });
    const client = new ModClient({ baseUrl: server.url });
    expect((await client.state()).screen).toBe("MAP");
    expect((await client.availableActions()).actions).toHaveLength(2);
  });

  it("posts an action body and parses the resulting state", async () => {
    let received: unknown = null;
    const server = await serve((req, res) => {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", () => {
        received = JSON.parse(raw);
        sendJson(
          res,
          200,
          envelope({
            action: "choose_map_node",
            status: "completed",
            stable: true,
            message: "traveling",
            state: statePayload(),
          }),
        );
      });
    });
    const client = new ModClient({ baseUrl: server.url });
    const result = await client.act({ action: "choose_map_node", option_index: 1 });
    expect(received).toEqual({ action: "choose_map_node", option_index: 1 });
    expect(result.status).toBe("completed");
    expect(result.state?.screen).toBe("MAP");
  });

  it("maps an ok:false envelope onto a typed error", async () => {
    const server = await serve((_req, res) => sendJson(res, 409, errorEnvelope("invalid_target", "out of range", false)));
    const client = new ModClient({ baseUrl: server.url });
    await expect(client.act({ action: "play_card", card_index: 9 })).rejects.toBeInstanceOf(ModResponseError);
    try {
      await client.act({ action: "play_card", card_index: 9 });
    } catch (error) {
      const typed = error as ModResponseError;
      expect(typed.code).toBe("invalid_target");
      expect(typed.status).toBe(409);
      expect(typed.retryable).toBe(false);
      expect(isRetryableModError(typed)).toBe(false);
    }
  });

  it("marks retryable errors as retryable", async () => {
    const server = await serve((_req, res) => sendJson(res, 503, errorEnvelope("state_unavailable", "settling", true)));
    const client = new ModClient({ baseUrl: server.url });
    try {
      await client.state();
      throw new Error("expected a ModResponseError");
    } catch (error) {
      expect(error).toBeInstanceOf(ModResponseError);
      expect(isRetryableModError(error)).toBe(true);
    }
  });

  it("reports a non-JSON body as a protocol error", async () => {
    const server = await serve((_req, res) => {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html><body>not the mod</body></html>");
    });
    const client = new ModClient({ baseUrl: server.url });
    try {
      await client.health();
      throw new Error("expected a ModProtocolError");
    } catch (error) {
      expect(error).toBeInstanceOf(ModProtocolError);
      expect((error as ModProtocolError).bodySnippet).toContain("not the mod");
    }
  });

  it("surfaces a payload shape problem", async () => {
    const broken = statePayload();
    delete broken["screen"];
    const server = await serve((_req, res) => sendJson(res, 200, envelope(broken)));
    const client = new ModClient({ baseUrl: server.url });
    await expect(client.state()).rejects.toBeInstanceOf(PayloadShapeError);
  });

  it("reports a refused connection as unreachable", async () => {
    const [port] = await closedPorts(1);
    const client = new ModClient({ baseUrl: `http://127.0.0.1:${port}`, timeoutMs: 1_000 });
    await expect(client.health()).rejects.toBeInstanceOf(ModUnreachableError);
  });

  it("times out instead of hanging", async () => {
    const server = await serve(() => {
      /* never responds */
    });
    const client = new ModClient({ baseUrl: server.url, timeoutMs: 300 });
    try {
      await client.health();
      throw new Error("expected a ModUnreachableError");
    } catch (error) {
      expect(error).toBeInstanceOf(ModUnreachableError);
      expect((error as ModUnreachableError).reason).toContain("timed out");
    }
  });
});
