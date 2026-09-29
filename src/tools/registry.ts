/**
 * The V4 tool list (docs/v4-architecture.md §3). Owned by the v4-gkb work: knowledge-base,
 * log and simulator tools are added here. Engines and the MCP server only ever read this list.
 */
import type { ToolContext, ToolDef } from "./types.js";

/** Every tool available for this context. Placeholder until the knowledge tools land. */
export function buildTools(_ctx: ToolContext): ToolDef[] {
  return [];
}
