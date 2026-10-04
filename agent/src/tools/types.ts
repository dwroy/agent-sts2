/**
 * V4 tool layer contract (docs/v4-architecture.md §3).
 *
 * A tool is a deterministic, read-only function the brain may call: knowledge-base lookups
 * (monsters, experience, stats, old guides), log queries, and later simulator facts (route
 * projection, rollouts, map validation). The same ToolDef list is served three ways:
 *   - in-process to API engines (DeepSeek / other function-calling APIs),
 *   - over stdio MCP (src/tools/mcp-server.ts) to CLI code agents (claude, codex, dsh),
 *   - rendered in full into a system-prompt prefix when an engine runs without tools.
 * Tools never act on the game and never write files.
 */

/** Minimal JSON Schema subset we emit (object at the top level). */
export interface JsonSchema {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: (string | number)[];
  additionalProperties?: boolean;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
}

/** What a tool may read. Everything else comes from its input. */
export interface ToolContext {
  /** Ascension of the current run: renderers pick per-ascension numbers from this. */
  ascension: number;
  /** Current act (1-3) when known. */
  act?: number;
  /** Directory holding monster-db.json, experience.json, room-costs.json, outcome-stats.json, ... */
  knowledgeDir: string;
  /** Directory holding runs.jsonl, decisions.jsonl, ... (read-only). */
  logsDir: string;
  /** Live game state for simulator tools (raw mod state); absent in offline replay. */
  state?: unknown;
}

export interface ToolResult {
  /** Text handed back to the model (Chinese prose/tables; numbers carry n). */
  text: string;
  /** True when the input was bad or the lookup found nothing usable; text says why. */
  isError?: boolean;
}

export interface ToolDef<I = Record<string, unknown>> {
  /** snake_case, stable: engines and logs refer to tools by this name. */
  name: string;
  /** One paragraph for the model: what it returns, when to use it. */
  description: string;
  inputSchema: JsonSchema;
  run(input: I, ctx: ToolContext): Promise<ToolResult> | ToolResult;
}
