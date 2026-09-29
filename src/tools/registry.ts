/**
 * The V4 tool list (docs/v4-architecture.md §3). Owned by the v4-gkb work: knowledge-base, log and simulator
 * tools are added here. Engines and the MCP server only ever read this list.
 */
import { knowledgeTools } from "./kb-tools.js";
import type { ToolContext, ToolDef } from "./types.js";

/**
 * Every tool available for this context, in a fixed order: the knowledge-base tools (src/tools/kb-tools.ts:
 * kb_monster, kb_encounter, kb_experience, kb_stats, kb_old_knowledge, kb_postmortem, kb_runs). The tools read
 * the context each call gives them, so the list itself does not depend on it yet (simulator tools will need
 * ctx.state).
 */
export function buildTools(_ctx: ToolContext): ToolDef[] {
  return knowledgeTools();
}
