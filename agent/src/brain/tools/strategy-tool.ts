/** Context-first strategy projections with explicit lossless document pages. */
import { consumerPage, documentInputs, PROJECTION_NOTICE } from "./knowledge-projection.js";
import { strategyEvidenceSummary } from "../../knowledge/strategy-entries.js";
import { strategyMatches } from "./query-guidance.js";
import { validateInput } from "./validate.js";
import type { ToolDef } from "./types.js";

export function strategyTool(): ToolDef {
  const inputSchema = { type: "object" as const, properties: {
    ...documentInputs,
    query: { type: "string" as const, description: "* 查本题相关项，或条目ID/关键词" },
    limit: { type: "integer" as const, minimum: 1, maximum: 6, description: "默认3条，最多6条；另受24KB限制" },
    offset: { type: "integer" as const, minimum: 0, maximum: 500, description: "默认0；用next_offset继续，无需反复全库查询" },
  }, required: ["query"], additionalProperties: false };
  return { name: "kb_strategies", description: "只读查本题相关策略/剧本，按题型、幕、Boss、牌组条件及#54最近流派筛选，具体条件优先。query=* 或ID/关键词；默认3条，保留ID、来源、样本、可信度和限制；无匹配返回空，自行决定是否查询。" + PROJECTION_NOTICE, inputSchema,
    run(input, ctx) {
      const errors = validateInput(inputSchema, input);
      const query = typeof input["query"] === "string" ? input["query"].trim() : "";
      if (errors.length || !query || query.length > 200) return { text: errors.join("; ") || "query must contain 1–200 characters", isError: true };
      const data = strategyMatches(ctx);
      const rows = data.entries.filter(e => query === "*" || `${e.id} ${e.strategy}`.toLowerCase().includes(query.toLowerCase()));
      return consumerPage({ tool: "kb_strategies", input, rows, value: e => e, defaultLimit: 3,
        sources: entries => [...data.sources, ...entries.flatMap(e => [
          { entry_id: e.id, source: e.source, version: e.version, ...strategyEvidenceSummary(e) },
          ...e.evidence.flatMap(ev => ev.type === "external_aggregate" ? [{ entry_id: e.id, source: ev.source, version: ev.version,
            dataset_sha256: ev.dataset_sha256, denominator: ev.denominator }] : []),
        ])], envelope: { schema: "brain-knowledge-result-v1", status: data.status,
          library_sha256: data.library_sha256, ...(data.archetype ? { archetype: data.archetype } : {}) } });
    } };
}
