import { expect, it, vi } from "vitest";
import { startFixtureServer } from "./fixture-http.js";
import { envelope, sendJson } from "./support.js";

it("serializes fixture bodies and responses, isolates servers and restores fetch", async () => {
  const original = globalThis.fetch;
  const first = await startFixtureServer((req, res) => {
    req.setEncoding("utf8");
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => sendJson(res, 201, envelope({ method: req.method, path: req.url, body: JSON.parse(body) })));
  });
  const second = await startFixtureServer((_req, res) => sendJson(res, 200, "second"));
  try {
    const response = await fetch(`${first.url}/action?q=1`, { method: "POST", body: JSON.stringify({ choice: "休息" }) });
    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual(envelope({ method: "POST", path: "/action?q=1", body: { choice: "休息" } }));
    expect(await (await fetch(second.url)).json()).toBe("second");
    await first.close();
    await expect(fetch(first.url)).rejects.toThrow("unregistered fixture origin");
    await expect(fetch("http://unknown.invalid")).rejects.toThrow("unregistered fixture origin");
    const controller = new AbortController(); controller.abort(new Error("fixed abort"));
    await expect(fetch(second.url, { signal: controller.signal })).rejects.toThrow("fixed abort");
  } finally { await first.close(); await second.close(); }
  expect(globalThis.fetch).toBe(original);
});

it("propagates handler errors without attempting a real request", async () => {
  const external = vi.fn();
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(external);
  const server = await startFixtureServer(() => { throw new Error("fixed handler failure"); });
  try { await expect(fetch(server.url)).rejects.toThrow("fixed handler failure"); expect(external).not.toHaveBeenCalled(); }
  finally { await server.close(); spy.mockRestore(); }
});
