/** `record` must store the raw payload, not our parsed wrapper — the wrapper hides unknown fields. */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { ModClient } from "../src/mod/client.js";
import { recordStates } from "../src/replay/record.js";
import { combatPayload } from "./scenarios.js";
import { envelope, sendJson, startTestServer, type TestServer } from "./support.js";

const servers: TestServer[] = [];
const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  for (const dir of dirs.splice(0)) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
});

describe("recordStates", () => {
  it("stores the raw payload, keeping fields outside our model", async () => {
    const raw = combatPayload();
    raw["a_field_we_do_not_model"] = { nested: true };
    const server = await startTestServer((_req, res) => sendJson(res, 200, envelope(raw)));
    servers.push(server);

    const dir = mkdtempSync(join(tmpdir(), "jev-sts2-record-"));
    dirs.push(dir);
    const outPath = join(dir, "states.jsonl");

    const stats = await recordStates({
      client: new ModClient({ baseUrl: server.url }),
      outPath,
      intervalMs: 1,
      maxStates: 1,
    });

    expect(stats.captured).toBe(1);
    expect(stats.byScreen["COMBAT"]).toBe(1);
    const entry = JSON.parse(readFileSync(outPath, "utf8").trim());
    expect(entry.screen).toBe("COMBAT");
    expect(entry.state.a_field_we_do_not_model).toEqual({ nested: true });
    expect(entry.state.raw).toBeUndefined();
  });
});
