/** Context-first strategy pages; whole evidence-bearing entries only. */
import { strategyEvidenceSummary, type StrategyEntry } from "../../knowledge/strategy-entries.js";
import { strategyMatches } from "./query-guidance.js";
import { validateInput } from "./validate.js";
import type { ToolDef } from "./types.js";

export function strategyTool(): ToolDef {
  const inputSchema = { type: "object" as const, properties: {
    query: { type: "string" as const, description: "* 查本题相关项，或条目ID/关键词" },
    limit: { type: "integer" as const, minimum: 1, maximum: 6, description: "默认3条，最多6条；另受24KB限制" },
    offset: { type: "integer" as const, minimum: 0, maximum: 500, description: "默认0；用next_offset继续，无需反复全库查询" },
  }, required: ["query"], additionalProperties: false };
  return { name: "kb_strategies", description: "只读查本题相关策略/剧本，按题型、幕、Boss、牌组条件及#54最近流派筛选，具体条件优先。query=* 或ID/关键词；默认3条，保留ID、来源、样本、可信度和限制；无匹配返回空，自行决定是否查询。", inputSchema,
    run(input, ctx) {
      const errors = validateInput(inputSchema, input);
      const query = typeof input["query"] === "string" ? input["query"].trim() : "";
      if (errors.length || !query || query.length > 200) return { text: errors.join("; ") || "query must contain 1–200 characters", isError: true };
      const data = strategyMatches(ctx);
      const rows = data.entries.filter(e => query === "*" || `${e.id} ${e.strategy}`.toLowerCase().includes(query.toLowerCase()));
      const offset = Number(input["offset"] ?? 0), limit = Number(input["limit"] ?? 3);
      const kept: StrategyEntry[] = [];
      let cursor = Math.min(offset, rows.length), oversized = 0;
      const serialize = (entries: StrategyEntry[], next: number, skipped: number) => JSON.stringify({
        schema: "brain-knowledge-result-v1", status: data.status, library_sha256: data.library_sha256,
        sources: [...data.sources, ...entries.flatMap(e => [
          { entry_id: e.id, source: e.source, version: e.version, ...strategyEvidenceSummary(e) },
          ...e.evidence.flatMap(ev => ev.type === "external_aggregate"
            ? [{ entry_id: e.id, source: ev.source, version: ev.version, dataset_sha256: ev.dataset_sha256, denominator: ev.denominator }] : []),
        ])], entries, ...(data.archetype ? { archetype: data.archetype } : {}),
        total_matches: rows.length, offset, returned: entries.length, omitted: rows.length - entries.length,
        next_offset: next < rows.length ? next : null, oversized_skipped: skipped,
      });
      while (cursor < rows.length && kept.length < limit) {
        const entry = rows[cursor]!;
        if (Buffer.byteLength(serialize([...kept, entry], cursor + 1, oversized)) <= 24_000) {
          kept.push(entry); cursor += 1;
        } else if (!kept.length) { oversized += 1; cursor += 1; }
        else break;
      }
      const text = serialize(kept, cursor, oversized);
      if (Buffer.byteLength(text) > 24_000) return { text: JSON.stringify({ entries: [], status: "invalid", error: "策略来源元数据超过24KB" }), isError: true };
      return { text, ...(!kept.length && oversized ? { isError: true } : {}) };
    } };
}
