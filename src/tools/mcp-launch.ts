/**
 * How a CLI code agent (claude, codex, dsh) starts our stdio MCP tool server
 * (src/tools/mcp-server.ts). The server serves buildTools(ctx) under the server name "gkb",
 * so a tool `kb_monster` appears to Claude as `mcp__gkb__kb_monster`.
 */
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import type { ToolContext } from "./types.js";

export const MCP_SERVER_NAME = "gkb";

export interface McpLaunchSpec {
  command: string;
  args: string[];
  /** Extra environment for the server process; never carries API keys. */
  env: Record<string, string>;
}

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Live game state is handed over as a file (stateFile) written by the caller before each call,
 * because the server runs in its own process.
 */
export function mcpLaunchSpec(ctx: ToolContext, stateFile?: string): McpLaunchSpec {
  const args = [
    join(REPO, "node_modules/.bin/tsx"),
    join(REPO, "src/tools/mcp-server.ts"),
    "--ascension", String(ctx.ascension),
    "--knowledge-dir", ctx.knowledgeDir,
    "--logs-dir", ctx.logsDir,
  ];
  if (ctx.act !== undefined) args.push("--act", String(ctx.act));
  if (stateFile) args.push("--state-file", stateFile);
  return { command: process.execPath, args, env: {} };
}
