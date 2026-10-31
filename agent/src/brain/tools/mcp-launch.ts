/**
 * How a CLI code agent (claude; later the offline learner's agents) starts our stdio MCP tool server
 * (src/brain/tools/mcp-server.ts). The server serves buildTools(ctx) under the server name "gkb", so a tool
 * `kb_monster` appears to Claude as `mcp__gkb__kb_monster`.
 */
import { dirname, join, resolve } from "node:path";

import { AGENT_DIR, KNOWLEDGE_DIR } from "../../core/paths.js";
import { assetsSelection } from "../../knowledge/assets-binding.js";
import { knowledgeCharacter } from "../../knowledge/files.js";
import { runtimeKnowledgeIdentity } from "../../knowledge/runtime-paths.js";
import { runtimeDataIdentity } from "../../knowledge/runtime-data.js";
import type { ToolContext } from "./types.js";

export const MCP_SERVER_NAME = "gkb";
const knowledgeRun = process.env["STS2_KNOWLEDGE_RUN_KEY"];
const fixedDependencies = process.env["STS2_DATA_KNOWLEDGE_DEPENDENCIES"] ?? "{}";

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
  return { command: process.execPath, args, env: resourceEnvironment(ctx.knowledgeDir) };
}

/** The CLI's sanitized environment drops these bindings. Forward only resource identity. */
function resourceEnvironment(directory: string): Record<string, string> {
  if (resolve(directory) !== resolve(KNOWLEDGE_DIR)) return {};
  const formal = runtimeKnowledgeIdentity(), fixed = runtimeDataIdentity(), assets = assetsSelection();
  const env: Record<string, string> = {};
  if (formal) {
    env["STS2_KNOWLEDGE_SNAPSHOT"] = formal.snapshot;
    env["STS2_KNOWLEDGE_VERSION"] = formal.version;
    env["STS2_KNOWLEDGE_RUNTIME"] = dirname(dirname(formal.snapshot));
    if (knowledgeRun) env["STS2_KNOWLEDGE_RUN_KEY"] = knowledgeRun;
  }
  if (fixed) {
    env["STS2_DATA_SNAPSHOT"] = join(fixed.directory, "data-snapshots", fixed.version);
    env["STS2_DATA_VERSION"] = fixed.version;
    env["STS2_DATA_RUNTIME"] = fixed.directory;
    env["STS2_DATA_RUN_KEY"] = fixed.run;
    env["STS2_DATA_MANAGED_PATHS"] = JSON.stringify(fixed.managed_paths);
    env["STS2_DATA_KNOWLEDGE_DEPENDENCIES"] = fixedDependencies;
  }
  if (assets) {
    if (assets.binding.bundle.k1_version !== (formal?.version ?? null)) throw Error("MCP resource bundle/K1 binding mismatch");
    env["STS2_ASSETS_SELECTION"] = JSON.stringify(assets);
  }
  if (formal || fixed || assets) env["CHARACTER"] = knowledgeCharacter();
  return env;
}

/** Claude's --mcp-config naming our stdio server alone (use with --strict-mcp-config). */
export function claudeMcpConfig(ctx: ToolContext, options: McpLaunchOptions = {}): string {
  const spec = mcpLaunchSpec(ctx, options);
  return JSON.stringify({ mcpServers: { [MCP_SERVER_NAME]: { type: "stdio", command: spec.command, args: spec.args, env: spec.env } } });
}
