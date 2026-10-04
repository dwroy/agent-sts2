/** The MCP tool server (src/brain/tools/mcp-server.ts): JSON-RPC methods, stdio transport, call records, launch config. */

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";

import { claudeMcpConfig, mcpLaunchSpec } from "../src/brain/tools/mcp-launch.js";
import { handleMessage, handlePayload, hostFromArgs, serveStdio, ToolHost } from "../src/brain/tools/mcp-server.js";
import type { ToolContext, ToolDef } from "../src/brain/tools/types.js";

const ctx: ToolContext = { ascension: 8, act: 2, knowledgeDir: "/nonexistent/knowledge", logsDir: "/nonexistent/logs" };

/** Fake tools: an echo of the input and the context, one that finds nothing, one that throws. */
const tools: ToolDef[] = [
  {
    name: "kb_echo",
    description: "Echoes its input and the ascension.",
    inputSchema: { type: "object", properties: { q: { type: "string" } }, required: ["q"] },
    run: (input, context) => ({ text: `A${context.ascension} act ${context.act}: ${String(input["q"])}` }),
  },
  {
    name: "kb_missing",
    description: "Finds nothing.",
    inputSchema: { type: "object", properties: {} },
    run: () => ({ text: "没有数据", isError: true }),
  },
  {
    name: "kb_broken",
    description: "Throws.",
    inputSchema: { type: "object", properties: {} },
    run: () => {
      throw new Error("boom");
    },
  },
];

describe("MCP JSON-RPC", () => {
  it("answers initialize, ping, tools/list and tools/call, and ignores notifications", async () => {
    const host = new ToolHost(tools, ctx);
    const init = await handleMessage(host, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "1" } } });
    expect(init).toMatchObject({ id: 1, result: { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "gkb" } } });
    // An unknown revision gets our newest.
    const future = await handleMessage(host, { jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "2099-01-01" } });
    expect((future as { result: { protocolVersion: string } }).result.protocolVersion).toBe("2025-06-18");
    expect(await handleMessage(host, { jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
    expect(await handleMessage(host, { jsonrpc: "2.0", id: "p", method: "ping" })).toEqual({ jsonrpc: "2.0", id: "p", result: {} });

    const list = (await handleMessage(host, { jsonrpc: "2.0", id: 3, method: "tools/list" })) as { result: { tools: { name: string; inputSchema: { type: string } }[] } };
    expect(list.result.tools.map((tool) => tool.name)).toEqual(["kb_echo", "kb_missing", "kb_broken"]);
    expect(list.result.tools[0]!.inputSchema.type).toBe("object");

    const call = await handleMessage(host, { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "kb_echo", arguments: { q: "骇鳗" } } });
    expect(call).toEqual({ jsonrpc: "2.0", id: 4, result: { content: [{ type: "text", text: "A8 act 2: 骇鳗" }], isError: false } });
    const missing = await handleMessage(host, { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "kb_missing", arguments: {} } });
    expect(missing).toMatchObject({ result: { isError: true, content: [{ text: "没有数据" }] } });
    const broken = await handleMessage(host, { jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "kb_broken" } });
    expect(broken).toMatchObject({ result: { isError: true, content: [{ text: "tool kb_broken failed: boom" }] } });

    expect(await handleMessage(host, { jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "nope" } })).toMatchObject({ error: { code: -32602 } });
    expect(await handleMessage(host, { jsonrpc: "2.0", id: 8, method: "resources/list" })).toMatchObject({ error: { code: -32601 } });
    expect(await handleMessage(host, { id: 9, method: "ping" })).toMatchObject({ id: 9, error: { code: -32600 } });
    // A batch: responses for the requests only.
    expect(await handlePayload(host, [{ jsonrpc: "2.0", id: 10, method: "ping" }, { jsonrpc: "2.0", method: "notifications/initialized" }])).toEqual([{ jsonrpc: "2.0", id: 10, result: {} }]);

    // Records: every call that reached a tool, with its full output.
    const records = host.take();
    expect(records.map((record) => [record.name, record.output, record.isError ?? false])).toEqual([
      ["kb_echo", "A8 act 2: 骇鳗", false],
      ["kb_missing", "没有数据", true],
      ["kb_broken", "tool kb_broken failed: boom", true],
    ]);
    expect(records[0]!.input).toEqual({ q: "骇鳗" });
    expect(records.every((record) => record.ms >= 0)).toBe(true);
    expect(host.take()).toEqual([]);
  });

  it("reads the context per call when given a function", async () => {
    let ascension = 1;
    const host = new ToolHost(tools, () => ({ ...ctx, ascension }));
    await host.call("kb_echo", { q: "x" });
    ascension = 9;
    await host.call("kb_echo", { q: "y" });
    expect(host.calls.map((record) => record.output)).toEqual(["A1 act 2: x", "A9 act 2: y"]);
  });
});

describe("MCP over stdio", () => {
  it("answers one JSON line per request, in order", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const lines: string[] = [];
    output.on("data", (chunk: Buffer) => lines.push(...chunk.toString("utf8").split("\n").filter(Boolean)));
    const host = new ToolHost(tools, ctx);
    const done = serveStdio(host, input, output);
    input.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })}\n`);
    input.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
    input.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "kb_echo", arguments: { q: "s" } } })}\n`);
    input.write("garbage\n");
    input.end();
    await done;
    const parsed = lines.map((line) => JSON.parse(line) as { id: unknown; result?: unknown; error?: { code: number } });
    expect(parsed.map((message) => message.id)).toEqual([1, 2, null]);
    expect(parsed[1]).toMatchObject({ result: { content: [{ text: "A8 act 2: s" }] } });
    expect(parsed[2]!.error!.code).toBe(-32700);
    expect(host.calls).toHaveLength(1);
  });

  it("builds its host from the command line: context, state file per call, tools module, record file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mcp-args-"));
    const stateFile = join(dir, "state.json");
    const recordFile = join(dir, "calls.jsonl");
    const toolsModule = join(dir, "tools.mjs");
    writeFileSync(toolsModule, 'export function buildTools(ctx) { return [{ name: "kb_state", description: "state", inputSchema: { type: "object", properties: {} }, run: (_i, c) => ({ text: `A${c.ascension} act ${c.act} floor ${c.state?.floor}` }) }]; }\n');
    writeFileSync(stateFile, JSON.stringify({ floor: 7 }));
    const host = await hostFromArgs(["--ascension", "9", "--knowledge-dir", "/k", "--logs-dir", "/l", "--act", "3", "--state-file", stateFile, "--record-file", recordFile, "--tools-module", toolsModule]);
    expect(host.list().map((tool) => tool.name)).toEqual(["kb_state"]);
    expect((await host.call("kb_state", {})).text).toBe("A9 act 3 floor 7");
    writeFileSync(stateFile, JSON.stringify({ floor: 8 }));
    expect((await host.call("kb_state", {})).text).toBe("A9 act 3 floor 8");
    const rows = readFileSync(recordFile, "utf8").trim().split("\n").map((line) => JSON.parse(line) as { name: string; output: string });
    expect(rows.map((row) => row.output)).toEqual(["A9 act 3 floor 7", "A9 act 3 floor 8"]);
    // Without a tools module: the registry's list.
    const plain = await hostFromArgs(["--knowledge-dir", "/k", "--logs-dir", "/l"]);
    expect(Array.isArray(plain.tools)).toBe(true);
    await expect(hostFromArgs(["--ascension", "1"])).rejects.toThrow(/usage/);
  });
});

describe("MCP launch configs", () => {
  it("starts the stdio server with the context, state, record and tools-module flags", () => {
    const spec = mcpLaunchSpec(ctx, { stateFile: "/s.json", recordFile: "/r.jsonl", toolsModule: "/t.mjs" });
    expect(spec.command).toBe(process.execPath);
    expect(spec.args.slice(1)).toEqual([
      expect.stringMatching(/src\/brain\/tools\/mcp-server\.ts$/),
      "--ascension", "8", "--knowledge-dir", "/nonexistent/knowledge", "--logs-dir", "/nonexistent/logs", "--act", "2",
      "--state-file", "/s.json", "--record-file", "/r.jsonl", "--tools-module", "/t.mjs",
    ]);
    // The first form of the contract: a plain string is the state file.
    expect(mcpLaunchSpec(ctx, "/s.json").args).toContain("/s.json");
    expect(spec.env).toEqual({});
  });

  it("claude's config names only our stdio server", () => {
    const config = JSON.parse(claudeMcpConfig(ctx, { recordFile: "/r.jsonl" })) as { mcpServers: Record<string, { type: string; command: string; args: string[] }> };
    expect(Object.keys(config.mcpServers)).toEqual(["gkb"]);
    expect(config.mcpServers["gkb"]!.type).toBe("stdio");
    expect(config.mcpServers["gkb"]!.args).toContain("/r.jsonl");
  });
});
