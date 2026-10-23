/** Planning-only access to published reflex knowledge. Does not enable or invoke a Jev consumer. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { knowledgeCharacter } from "../../knowledge/files.js";
import { loadV6Knowledge } from "../../v6/knowledge.js";
import { questionTypes } from "../../knowledge/strategy-entries.js";
import { validateInput } from "./validate.js";
import type { ToolContext, ToolDef } from "./types.js";

const APPLIES_TO = ["combat_line", "card_pick", "potion", "rest", "shop"] as const;
const MAX_BYTES = 24_000;
const LIMIT = 12;
type Source = { source: string; character: string; file: string; version: string; sha256: string };
type Filter = { query: string; applies_to?: string };
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** A planning query may read construction knowledge, never substitute combat-line advice for it. */
function constructionTypes(ctx: ToolContext): readonly string[] | null {
  if (ctx.label === "fight-plan") return null;
  const types = questionTypes(ctx.label ?? "", ctx.payload);
  if (types.includes("act_plan") || types.includes("event")) return ["card_pick", "potion", "rest", "shop"];
  if (types.includes("card_reward")) return ["card_pick"];
  if (types.includes("shop")) return ["shop", "card_pick", "potion"];
  if (types.includes("rest")) return ["rest"];
  return null;
}

/** Hash the very bytes parsed by the existing strict loader, including reference-validation inputs. */
export function reflexMatches(ctx: ToolContext, filter: Filter = { query: "*" }) {
  const character = knowledgeCharacter(), sources: Source[] = [];
  const knowledge = loadV6Knowledge(ctx.knowledgeDir, character, path => {
    const raw = readFileSync(path, "utf8");
    const source = { source: "own", character, file: basename(path), version: "unknown", sha256: sha(raw) };
    sources.push(source);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    source.version = String(parsed["version"] ?? parsed["schema"] ?? "unknown");
    return raw;
  });
  const library = knowledge.reflex;
  const construction = constructionTypes(ctx);
  const entries = library.status === "loaded" ? library.value.filter(e => e.scope.character === character && e.scope.ascensions.includes(ctx.ascension)
    && (!construction || construction.includes(e.applies_to))
    && (!filter.applies_to || e.applies_to === filter.applies_to)
    && (filter.query === "*" || JSON.stringify(e).toLowerCase().includes(filter.query.toLowerCase()))) : [];
  // A textual lookup does not establish that a predicate holds for an option or future combat state.
  return { status: library.status, entries, sources, construction: construction !== null,
    ...(library.status !== "loaded" ? { issues: library.issues ?? [], reason: library.message } : {}) };
}

export function reflexKnowledgeTool(): ToolDef {
  const inputSchema: ToolDef["inputSchema"] = { type: "object", properties: {
    query: { type: "string", description: "reflex条目ID、Boss/精英/卡牌ID等关键词；*查当前角色/进阶的全部检索候选" },
    applies_to: { type: "string", enum: [...APPLIES_TO], description: "可选：限制原条目用途，不改变条目条件" },
  }, required: ["query"], additionalProperties: false };
  return { name: "kb_reflex", description: "按非空rk线索及需要只读查reflex.json，与经验库kb_experience独立；0匹配时跳过。query=*或ID/关键词，applies_to可缩小范围。构筑题只返回构筑相关条目的一句话摘要、原可信度/证据/来源关联，不返回combat_line或原始predicate JSON；备战题保留完整条目。来源附版本/SHA，检索不证明条件成立或Jev采用。最多12条/24KB。", inputSchema,
    run(input, ctx) {
      const problems = validateInput(inputSchema, input);
      if (problems.length) return { text: problems.join("; "), isError: true };
      const query = String(input["query"]).trim();
      if (!query || query.length > 200) return { text: "query must contain 1–200 characters", isError: true };
      const data = reflexMatches(ctx, { query, ...(typeof input["applies_to"] === "string" ? { applies_to: input["applies_to"] } : {}) });
      const envelope = (entries: unknown[]) => JSON.stringify({ schema: "brain-reflex-result-v2", status: data.status,
        sources: data.sources, entries, omitted: data.entries.length - entries.length,
        representation: data.construction ? "construction_summary" : "full_entry",
        predicate_evaluation: "not_evaluated", evidence_scope: "本角色已发布reflex条目；source_experience是来源关联，不是reflex命中ID；构筑摘要未展示原条件，不是无条件建议；只读检索不代表Jev采用或条件成立",
        ...(data.status !== "loaded" ? { issues: data.issues, reason: data.reason } : {}) });
      const entries: unknown[] = [];
      for (const entry of data.entries.slice(0, LIMIT)) {
        const presented = data.construction ? { id: entry.id, version: entry.version, applies_to: entry.applies_to,
          summary: entry.label_en, confidence: entry.confidence, evidence: entry.evidence, source_experience: entry.source_experience } : entry;
        if (Buffer.byteLength(envelope([...entries, presented])) > MAX_BYTES) break;
        entries.push(presented);
      }
      const text = envelope(entries);
      if (Buffer.byteLength(text) > MAX_BYTES) return { text: JSON.stringify({ schema: "brain-reflex-result-v2", entries: [], sources: [], error: "reflex来源元数据超过24KB，请缩小查询" }), isError: true };
      return { text, ...(data.status === "invalid" ? { isError: true } : {}) };
    } };
}
