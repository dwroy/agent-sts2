/** Planning-only access to published reflex knowledge. Does not enable or invoke a Jev consumer. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { knowledgeCharacter } from "../../knowledge/files.js";
import { loadV6Knowledge } from "../../v6/knowledge.js";
import type { ReflexEntry } from "../../v6/formats.js";
import { validateInput } from "./validate.js";
import type { ToolContext, ToolDef } from "./types.js";

const APPLIES_TO = ["combat_line", "card_pick", "potion", "rest", "shop"] as const;
const MAX_BYTES = 24_000;
const LIMIT = 12;
type Source = { source: string; character: string; file: string; version: string; sha256: string };
type Filter = { query: string; applies_to?: string };
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

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
  const entries = library.status === "loaded" ? library.value.filter(e => e.scope.character === character && e.scope.ascensions.includes(ctx.ascension)
    && (!filter.applies_to || e.applies_to === filter.applies_to)
    && (filter.query === "*" || JSON.stringify(e).toLowerCase().includes(filter.query.toLowerCase()))) : [];
  // A textual lookup does not establish that a predicate holds for an option or future combat state.
  return { status: library.status, entries, sources,
    ...(library.status !== "loaded" ? { issues: library.issues ?? [], reason: library.message } : {}) };
}

export function reflexKnowledgeTool(): ToolDef {
  const inputSchema: ToolDef["inputSchema"] = { type: "object", properties: {
    query: { type: "string", description: "reflex条目ID、Boss/精英/卡牌ID等关键词；*查当前角色/进阶的全部检索候选" },
    applies_to: { type: "string", enum: [...APPLIES_TO], description: "可选：限制原条目用途，不改变条目条件" },
  }, required: ["query"], additionalProperties: false };
  return { name: "kb_reflex", description: "查真实 rk（reflex knowledge，小脑记忆 reflex.json），与经验库 kb_experience 独立。构筑/幕初路线/备战题先查相关rk：query=* 或条目/Boss/精英/卡牌ID，可用 applies_to 缩小范围。返回原条件、signal、可信度、证据、source_experience及来源版本/SHA；只是检索候选，不证明predicate已满足，不启用或调用Jev出牌条目。最多12条/24KB，空库/错误不反复查。", inputSchema,
    run(input, ctx) {
      const problems = validateInput(inputSchema, input);
      if (problems.length) return { text: problems.join("; "), isError: true };
      const query = String(input["query"]).trim();
      if (!query || query.length > 200) return { text: "query must contain 1–200 characters", isError: true };
      const data = reflexMatches(ctx, { query, ...(typeof input["applies_to"] === "string" ? { applies_to: input["applies_to"] } : {}) });
      const envelope = (entries: ReflexEntry[]) => JSON.stringify({ schema: "brain-reflex-result-v1", status: data.status,
        sources: data.sources, entries, omitted: data.entries.length - entries.length,
        predicate_evaluation: "not_evaluated", evidence_scope: "本角色已发布reflex条目；source_experience是来源关联，不是reflex命中ID；只读检索不代表Jev采用或条件成立",
        ...(data.status !== "loaded" ? { issues: data.issues, reason: data.reason } : {}) });
      const entries: ReflexEntry[] = [];
      for (const entry of data.entries.slice(0, LIMIT)) {
        if (Buffer.byteLength(envelope([...entries, entry])) > MAX_BYTES) break;
        entries.push(entry);
      }
      const text = envelope(entries);
      if (Buffer.byteLength(text) > MAX_BYTES) return { text: JSON.stringify({ schema: "brain-reflex-result-v1", entries: [], sources: [], error: "reflex来源元数据超过24KB，请缩小查询" }), isError: true };
      return { text, ...(data.status === "invalid" ? { isError: true } : {}) };
    } };
}
