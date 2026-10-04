/**
 * How a CLI code agent (claude; later the offline learner's agents) starts our stdio MCP tool server
 * (src/brain/tools/mcp-server.ts). The server serves buildTools(ctx) under the server name "gkb", so a tool
 * `kb_monster` appears to Claude as `mcp__gkb__kb_monster`.
 */
import { join } from "node:path";

import { AGENT_DIR } from "../../core/paths.js";
import type { ToolContext } from "./types.js";

export const MCP_SERVER_NAME = "gkb";

export interface McpLaunchSpec {
  command: string;
  args: string[];
  /** Extra environment for the server process; never carries API keys. */
  env: Record<string, string>;
}

export interface McpLaunchOptions {
  /** The live game state, written by the caller before each question (the server runs in its own process). */
  stateFile?: string;
  /** JSONL file the server appends each tool call to (name, input, full output, ms): read back by the engine. */
  recordFile?: string;
  /** A module whose buildTools(ctx) replaces the registry's (tests, smoke runs). */
  toolsModule?: string;
}

export function mcpLaunchSpec(ctx: ToolContext, options: McpLaunchOptions | string = {}): McpLaunchSpec {
  // A plain string is the state file (the first form of this contract).
  const opts: McpLaunchOptions = typeof options === "string" ? { stateFile: options } : options;
  const args = [
    join(AGENT_DIR, "node_modules/.bin/tsx"),
    join(AGENT_DIR, "src/brain/tools/mcp-server.ts"),
    "--ascension", String(ctx.ascension),
    "--knowledge-dir", ctx.knowledgeDir,
    "--logs-dir", ctx.logsDir,
  ];
  if (ctx.act !== undefined) args.push("--act", String(ctx.act));
  if (opts.stateFile) args.push("--state-file", opts.stateFile);
  if (opts.recordFile) args.push("--record-file", opts.recordFile);
  if (opts.toolsModule) args.push("--tools-module", opts.toolsModule);
  return { command: process.execPath, args, env: {} };
}

/** Claude's --mcp-config naming our stdio server alone (use with --strict-mcp-config). */
export function claudeMcpConfig(ctx: ToolContext, options: McpLaunchOptions = {}): string {
  const spec = mcpLaunchSpec(ctx, options);
  return JSON.stringify({ mcpServers: { [MCP_SERVER_NAME]: { type: "stdio", command: spec.command, args: spec.args, env: spec.env } } });
}
