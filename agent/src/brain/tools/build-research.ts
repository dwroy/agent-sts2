/** Lossless structural pages of bound research. Retrieval never authorizes execution. */
import { knowledgeCharacter } from "../../knowledge/files.js";
import { indexedKnowledge } from "../../knowledge/runtime/reader.js";
import type { Row } from "../../knowledge/runtime/validation.js";
import { validateInput } from "./validate.js";
import type { ToolDef } from "./types.js";

const NOTICE = "整局构筑研究候选，非已验证可执行规则；检索不证明条件匹配、自然采用或收益。unknown保持未知，不转predicate/MC参数；保原初始计划与后续复用合同，按需查询。";
const scope = (e: Row) => ({ scope: e.scope, game_version_status: e.scope.game_version === null ? "unknown" : "declared", status: e.status,
 confidence: e.confidence, evidence_status: e.evidence_status, verified_complete_playbook: false, validation_status: e.validation_status });
/** Each pointer is a complete JSON value split into bounded UTF-8 parts; nothing is skipped. */
export function researchSections(e: Row): Row[] {
 const values = Object.entries(e).flatMap(([key, value]) => Array.isArray(value)
  ? value.length ? value.map((v, i) => ({ pointer: `/${key}/${i}`, value: v })) : [{ pointer: `/${key}`, value }]
  : [{ pointer: `/${key}`, value }]);
 return values.flatMap(({ pointer, value }) => {
  const parts: string[] = []; let fragment = "", bytes = 0;
  for (const char of JSON.stringify(value)) {
   const size = Buffer.byteLength(JSON.stringify(char));
   if (bytes + size > 3000) { parts.push(fragment); fragment = ""; bytes = 0; }
   fragment += char; bytes += size;
  }
  parts.push(fragment);
  return parts.map((json_fragment, part) => ({ pointer, part, parts: parts.length, encoding: "concatenated-json", json_fragment }));
 });
}
/** Resolve only own JSON members from the already-bound payload; never a path, URI or expression. */
function member(root: unknown, pointer: string): unknown {
 if (!pointer) return root;
 if (!pointer.startsWith("/") || /~(?![01])/u.test(pointer)) throw Error("invalid JSON pointer");
 let value = root;
 for (const part of pointer.slice(1).split("/")) {
  const key = part.replaceAll("~1", "/").replaceAll("~0", "~");
  if (!value || typeof value !== "object" || !Object.hasOwn(value, key)
   || Array.isArray(value) && !/^(0|[1-9][0-9]*)$/.test(key)) throw Error("research pointer is unavailable");
  value = (value as Row)[key];
 }
 return value;
}
export function buildResearchTool(): ToolDef {
 const tool: ToolDef = {
  name: "kb_build_research",
  description: `查整局构筑研究的完整阶段、取得顺序、转向理由、检查点、资源连续性和终局准备及证据限制。${NOTICE} query为关键词或*；act/stage/goal是同阶段显式标签筛选，不自动推断状态。默认本局进阶、角色；game_version须用实际版本，未知明确返回。先检索列表，再用id读结构页；可用pointer=/phases/2或/sources直取字段；artifact选已存附件ID，JSON附件可配pointer=/cases/0直取原轨迹。所有pointer只在已绑定JSON内寻址，不读文件/SQL/网络。page_offset为sections游标、next_page_offset续取至null，每页保前后阶段和附件目录。拼接同pointer各part后JSON解析可还原全文；分页或选段不表示全文及证据已读全。阶段/目标/幕标注缺失不视作匹配证明，可去掉这些筛选查完整研究。`,
  inputSchema: { type: "object", properties: {
   query: { type: "string" }, id: { type: "string" }, game_version: { type: "string" },
   act: { type: "integer", minimum: 1, maximum: 3 }, stage: { type: "string" }, goal: { type: "string" },
   limit: { type: "integer", minimum: 1, maximum: 12 }, offset: { type: "integer", minimum: 0, maximum: 1000000 },
   page_offset: { type: "integer", minimum: 0, maximum: 1000000 },
   artifact: { type: "string", description: "已归档附件ID，绝非路径或URL" }, pointer: { type: "string", description: "研究或JSON附件内的JSON pointer；可省略" },
  }, required: ["query"], additionalProperties: false },
  run(input, ctx) {
   const errors = validateInput(tool.inputSchema, input);
   if (errors.length) return { text: errors.join("; "), isError: true };
   try {
    for (const k of ["query", "id", "game_version", "stage", "goal", "artifact", "pointer"]) if (input[k] !== undefined && (typeof input[k] !== "string" || !String(input[k]).trim() || String(input[k]).length > 200)) throw Error(`${k} must contain 1–200 characters`);
    if (["page_offset", "artifact", "pointer"].some(k => input[k] !== undefined) && !input["id"]) throw Error("page_offset/artifact/pointer require id");
    const reader = indexedKnowledge(ctx.knowledgeDir);
    if (!reader) throw Error("需要绑定的SQLite知识版本");
    const limit = Number(input["limit"] ?? 3), offset = Number(input["offset"] ?? 0);
    const rows = reader.research({ character: knowledgeCharacter(), ascension: ctx.ascension, limit: input["id"] ? 1 : limit + 1, offset: input["id"] ? 0 : offset,
     ...(input["id"] ? { id: String(input["id"]) } : {}), ...(input["query"] !== "*" ? { text: String(input["query"]).trim() } : {}),
     ...(input["game_version"] ? { gameVersion: String(input["game_version"]) } : {}), ...(input["act"] !== undefined ? { act: Number(input["act"]) } : {}),
     ...(input["stage"] ? { stage: String(input["stage"]) } : {}), ...(input["goal"] ? { goal: String(input["goal"]) } : {}),
    });
    const base = { schema: "brain-build-research-result-v1", knowledge_version: reader.version, notice: NOTICE, condition_evaluation: "not_evaluated",
     requested_scope: { character: knowledgeCharacter(), ascension: ctx.ascension, game_version: input["game_version"] ?? "unknown" },
     empty_reason: rows.length ? null : "no_results_in_requested_scope_filters_or_page" };
    if (!input["id"]) {
     const entries: Row[] = [];
     const render = () => JSON.stringify({ ...base, entries, offset, next_offset: rows.length > entries.length ? offset + entries.length : null });
     for (const r of rows.slice(0, limit)) {
      entries.push({ id: r.value.id, revision: r.value.revision, title: r.value.title, ...scope(r.value), source: r.value.source,
       read_with: { query: "*", id: r.value.id, page_offset: 0 }, evidence_read: "not_yet_read" });
      if (Buffer.byteLength(render()) > 24000) { entries.pop(); break; }
     }
     if (rows.length && !entries.length) throw Error("研究目录元数据超过24KB；未跳过内容");
     return { text: render() };
    }
    if (!rows.length) return { text: JSON.stringify({ ...base, entries: [], sections: [], next_page_offset: null }) };
    const row = rows[0]!, e = row.value, start = Number(input["page_offset"] ?? 0);
    const attachment = input["artifact"] ? e.attachments?.find((a: Row) => a.id === input["artifact"]) : undefined;
    if (input["artifact"] && !attachment) throw Error("research attachment is unavailable");
    if (attachment && input["pointer"] && attachment.media_type !== "application/json") throw Error("JSON pointer requires a JSON attachment");
    const selected = !!attachment || input["pointer"] !== undefined;
    const root = attachment ? attachment.media_type === "application/json" ? JSON.parse(attachment.content) : attachment.content : e;
    const value = member(root, String(input["pointer"] ?? ""));
    const sections = researchSections(selected ? { selected: value } : e);
    const kept: Row[] = []; let cursor = Math.min(start, sections.length);
    const render = () => JSON.stringify({ ...base, id: e.id, revision: e.revision, ...scope(e),
     source: { source: e.source, path: row.path, revision: row.revision, sha256: row.sha256, knowledge_version: reader.version },
     phase_order: e.phases.map((p: Row, i: number) => ({ id: p.id, stage: p.stage, acts: p.acts, pointer: `/phases/${i}`, previous: e.phases[i - 1]?.id ?? null, next: e.phases[i + 1]?.id ?? null })),
     artifacts: (e.attachments ?? []).map((a: Row) => ({ id: a.id, media_type: a.media_type, sha256: a.sha256 })),
     selection: { scope: selected ? "selected_section" : "complete_research", artifact: attachment?.id ?? null, pointer: input["pointer"] ?? null,
      ...(attachment ? { artifact_sha256: attachment.sha256 } : {}) },
     context_pointers: ["/sources", "/evidence", "/limitations", "/unknowns"],
     sections: kept, page_offset: start, total_sections: sections.length, next_page_offset: cursor < sections.length ? cursor : null,
     evidence_read: selected ? "selected_section_only_not_complete_evidence" : start === 0 && cursor === sections.length ? "complete_document_returned" : "partial_document_follow_pages",
    });
    while (cursor < sections.length) {
     kept.push(sections[cursor++]!);
     if (Buffer.byteLength(render()) > 24000) { kept.pop(); cursor--; break; }
    }
    if (!kept.length && cursor < sections.length) throw Error("研究阶段目录超过24KB，原owner须分拆研究；未跳过内容");
    const result = render(); if (Buffer.byteLength(result) > 24000) throw Error("研究元数据超过24KB");
    return { text: result };
   } catch (error) { return { text: JSON.stringify({ status: "invalid", error: error instanceof Error ? error.message : String(error) }), isError: true }; }
  },
 };
 return tool;
}
