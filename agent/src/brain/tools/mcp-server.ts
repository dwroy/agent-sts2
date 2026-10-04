/**
 * Our MCP tool server (docs/v4-architecture.md §2 "工具服务"), hand-written JSON-RPC 2.0 over stdio
 * (newline-delimited), no dependencies. A CLI agent (claude; later the offline learner's agents) starts it with
 * the command in mcp-launch.ts; it serves buildTools(ctx) (src/brain/tools/registry.ts).
 * Methods: initialize, notifications/initialized, tools/list, tools/call, ping.
 *
 * Every tool call is recorded (name, input, full output, time): in memory (ToolHost, also used in-process by
 * the DeepSeek engine's function calling) and, with --record-file, as one JSONL row per call, which the engine
 * that started the server reads back into BrainAnswer.toolCalls.
 *
 * Command line: --ascension N --knowledge-dir DIR --logs-dir DIR [--act N] [--state-file FILE]
 *   [--record-file FILE] [--tools-module FILE]. The state file holds the live game state (read per call);
 *   --tools-module names a module whose buildTools(ctx) replaces the registry's (tests, smoke runs).
 */
import { appendFileSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { pathToFileURL } from "node:url";

import type { ToolCallRecord } from "../types.js";
import { MCP_SERVER_NAME } from "./mcp-launch.js";
import type { ToolContext, ToolDef, ToolResult } from "./types.js";

/** Protocol revisions we speak; the newest is offered when the client asks for one we do not know. */
export const MCP_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
const SERVER_VERSION = "1.0.0";

type Json = Record<string, unknown>;

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

/** A tool list and the record of every call made to it. */
export class ToolHost {
  private readonly records: ToolCallRecord[] = [];

  constructor(
    readonly tools: ToolDef[],
    private readonly context: ToolContext | (() => ToolContext),
    /** Called with each record as it is made (the --record-file writer). */
    private readonly onRecord?: (record: ToolCallRecord) => void,
  ) {}

  /** tools/list entries. */
  list(): { name: string; description: string; inputSchema: unknown }[] {
    return this.tools.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: { type: "object", ...tool.inputSchema } }));
  }

  has(name: string): boolean {
    return this.tools.some((tool) => tool.name === name);
  }

  /** Runs one tool (a thrown error becomes an error result) and records the call. */
  async call(name: string, input: unknown): Promise<ToolResult> {
    const tool = this.tools.find((candidate) => candidate.name === name);
    const started = Date.now();
    let result: ToolResult;
    if (!tool) {
      result = { text: `unknown tool "${name}"`, isError: true };
    } else {
      try {
        const ctx = typeof this.context === "function" ? this.context() : this.context;
        result = await tool.run(isObject(input) ? input : {}, ctx);
      } catch (error) {
        result = { text: `tool ${name} failed: ${error instanceof Error ? error.message : String(error)}`, isError: true };
      }
    }
    const record: ToolCallRecord = { name, input: input ?? {}, output: result.text, ...(result.isError ? { isError: true } : {}), ms: Date.now() - started };
    this.records.push(record);
    this.onRecord?.(record);
    return result;
  }

  /** Every call so far, in order. */
  get calls(): ToolCallRecord[] {
    return [...this.records];
  }

  /** The calls since the last take (and forgets them). */
  take(): ToolCallRecord[] {
    return this.records.splice(0, this.records.length);
  }
}

function rpcError(id: JsonRpcResponse["id"], code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/**
 * One JSON-RPC message: its response, or null for a notification (no id) or a client response. Unknown methods
 * are -32601; an unknown tool is a -32602 protocol error; a tool that fails answers with isError (MCP spec).
 */
export async function handleMessage(host: ToolHost, message: unknown): Promise<JsonRpcResponse | null> {
  if (!isObject(message) || message["jsonrpc"] !== "2.0" || typeof message["method"] !== "string") {
    // A response object from the client (we never send requests) needs no answer.
    if (isObject(message) && message["jsonrpc"] === "2.0" && !("method" in message)) return null;
    const id = isObject(message) && (typeof message["id"] === "string" || typeof message["id"] === "number") ? message["id"] : null;
    return rpcError(id, -32600, "Invalid Request");
  }
  const method = message["method"];
  const hasId = typeof message["id"] === "string" || typeof message["id"] === "number";
  if (!hasId) return null; // notifications/initialized, notifications/cancelled, ...
  const id = message["id"] as string | number;
  const params = isObject(message["params"]) ? message["params"] : {};
  switch (method) {
    case "initialize": {
      const asked = typeof params["protocolVersion"] === "string" ? params["protocolVersion"] : "";
      const version = (MCP_PROTOCOL_VERSIONS as readonly string[]).includes(asked) ? asked : MCP_PROTOCOL_VERSIONS[0];
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: version,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: MCP_SERVER_NAME, version: SERVER_VERSION },
        },
      };
    }
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return { jsonrpc: "2.0", id, result: { tools: host.list() } };
    case "tools/call": {
      const name = typeof params["name"] === "string" ? params["name"] : "";
      if (!host.has(name)) return rpcError(id, -32602, `Unknown tool: ${name}`);
      const result = await host.call(name, params["arguments"] ?? {});
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: result.text }], isError: result.isError === true } };
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

/** A batch (array) or a single message: the responses to send, null when there are none. */
export async function handlePayload(host: ToolHost, payload: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  if (Array.isArray(payload)) {
    if (payload.length === 0) return rpcError(null, -32600, "Invalid Request");
    const out: JsonRpcResponse[] = [];
    for (const message of payload) {
      const response = await handleMessage(host, message);
      if (response) out.push(response);
    }
    return out.length > 0 ? out : null;
  }
  return handleMessage(host, payload);
}

/** Serves newline-delimited JSON-RPC on a stream pair, in order, until the input ends. */
export function serveStdio(host: ToolHost, input: Readable = process.stdin, output: Writable = process.stdout): Promise<void> {
  const lines = createInterface({ input, crlfDelay: Infinity });
  let queue = Promise.resolve();
  lines.on("line", (line) => {
    const text = line.trim();
    if (!text) return;
    queue = queue.then(async () => {
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        output.write(`${JSON.stringify(rpcError(null, -32700, "Parse error"))}\n`);
        return;
      }
      const out = await handlePayload(host, payload);
      if (out !== null) output.write(`${JSON.stringify(out)}\n`);
    });
  });
  return new Promise((resolve) => lines.once("close", () => void queue.then(() => resolve())));
}

/* ---------------- command line ---------------- */

function argValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

/** The server a command line describes: its context (state file read per call), tools and record file. */
export async function hostFromArgs(args: string[]): Promise<ToolHost> {
  const knowledgeDir = argValue(args, "--knowledge-dir");
  const logsDir = argValue(args, "--logs-dir");
  if (!knowledgeDir || !logsDir) throw new Error("usage: mcp-server.ts --ascension N --knowledge-dir DIR --logs-dir DIR [--act N] [--state-file FILE] [--record-file FILE] [--tools-module FILE]");
  const ascension = Number(argValue(args, "--ascension") ?? "0");
  const actRaw = argValue(args, "--act");
  const stateFile = argValue(args, "--state-file");
  const recordFile = argValue(args, "--record-file");
  const toolsModule = argValue(args, "--tools-module");
  // The caller rewrites the state file before each question: read it per call.
  const context = (): ToolContext => {
    let state: unknown;
    if (stateFile) {
      try {
        state = JSON.parse(readFileSync(stateFile, "utf8"));
      } catch {
        state = undefined;
      }
    }
    return { ascension, knowledgeDir, logsDir, ...(actRaw ? { act: Number(actRaw) } : {}), ...(state === undefined ? {} : { state }) };
  };
  const source = (toolsModule ? await import(pathToFileURL(toolsModule).href) : await import("./registry.js")) as { buildTools: (ctx: ToolContext) => ToolDef[] };
  const record = recordFile
    ? (row: ToolCallRecord): void => {
        try {
          appendFileSync(recordFile, `${JSON.stringify(row)}\n`, "utf8");
        } catch {
          // the record is for the log; the answer to the agent matters more
        }
      }
    : undefined;
  return new ToolHost(source.buildTools(context()), context, record);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  hostFromArgs(process.argv.slice(2))
    .then((host) => serveStdio(host))
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
