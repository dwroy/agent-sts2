import { readFileSync, statSync, rethrowStatsResourceError } from "../knowledge/resource-fs.js";
import { createHash } from "node:crypto";
import { knowledgeFile, KNOWLEDGE_DIR } from "../knowledge/files.js";
import type { CoreTemplate, OpportunityModel } from "./types.js";

const cache = new Map<string, { stamp: string; value: unknown }>();
function read(path: string): unknown {
  const stat = statSync(path), stamp = `${stat.mtimeMs}:${stat.size}`;
  if (cache.get(path)?.stamp === stamp) return cache.get(path)!.value;
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  cache.set(path, { stamp, value }); return value;
}
export function loadConstructionData(character: string, dir = KNOWLEDGE_DIR): { templates: CoreTemplate[]; model: OpportunityModel; signature: string } | null {
  if (!/^[a-z_]+$/.test(character)) return null;
  try {
    const cores = read(knowledgeFile(dir, "construction-templates.json", character)) as { schema?: string; templates?: CoreTemplate[] };
    const model = read(knowledgeFile(dir, "construction-opportunities.json", character)) as OpportunityModel;
    if (cores.schema !== "construction-templates-v1" || !Array.isArray(cores.templates) || model.schema !== "construction-opportunities-v1"
      || model.character !== character || !Array.isArray(model.rows) || typeof model.digest !== "string") return null;
    const templates = cores.templates.filter((c) => c.character === character && typeof c.id === "string" && Array.isArray(c.ascensions)
      && ["candidate", "validated"].includes(c.status) && c.evidence?.runs?.length > 0 && /^[a-f0-9]{64}$/.test(c.evidence.sha256)
      && Array.isArray(c.limits) && Array.isArray(c.requirements) && c.requirements.length > 0
      && c.requirements.every((r) => Number.isInteger(r.count) && r.count > 0 && r.any.length > 0
        && r.any.every((a) => typeof a.id === "string" && ["card", "relic"].includes(a.kind))));
    if (model.rows.some((r) => !Number.isInteger(r.floor) || !Number.isInteger(r.act) || !Number.isInteger(r.ascension)
      || !["reward", "shop"].includes(r.kind) || typeof r.run !== "string" || typeof r.ts !== "string"
      || !Array.isArray(r.offers) || r.offers.some((o) => !o.id || typeof o.upgraded !== "boolean" || !Number.isFinite(o.price) || o.price < 0))) return null;
    return { templates, model, signature: createHash("sha256").update(JSON.stringify({ templates, digest: model.digest })).digest("hex") };
  } catch (statsReadError) { rethrowStatsResourceError(statsReadError); return null; }
}
