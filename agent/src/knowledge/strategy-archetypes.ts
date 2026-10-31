/** Nearest geometry from #54; semantic playbook labels remain learner-owned. */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { runtimeKnowledgeFile } from "./runtime-paths.js";
import { knowledgeCharacter } from "./files.js";
import type { ToolContext } from "../brain/tools/types.js";

export const ARCHETYPES_FILE = "external/sts2fun/builds-v1/archetypes.json";
export const ARCHETYPES_SHA256 = "6a254692c7c66782a4d698003068bdc653277e6980f116f9683fe86e2ccd1a8c";
export interface ArchetypeBinding { model_sha256: string; version: string; clusters: number[] }
interface Model { sha256: string; reference_version: string; reference_n: number; vocabulary: Record<string, number>; centers: Record<string, number>[] }
export interface ArchetypeMatch { model_sha256: string; version: string; cluster: number; similarity: number; margin: number; overlap: number }
const record = (v: unknown): Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};

/** Binary TF-IDF and cosine exactly follow the published model. Ties/zero overlap abstain. */
export function nearestArchetype(ids: string[], model: Model): ArchetypeMatch | null {
  const present = [...new Set(ids)].filter(id => Object.hasOwn(model.vocabulary, id)).sort();
  const norm = Math.sqrt(present.reduce((sum, id) => sum + model.vocabulary[id]! ** 2, 0));
  if (!norm || !Number.isFinite(norm)) return null;
  const scores = model.centers.map((center, cluster) => ({ cluster,
    score: present.reduce((sum, id) => sum + model.vocabulary[id]! / norm * (center[id] ?? 0), 0) }))
    .sort((a, b) => b.score - a.score || a.cluster - b.cluster);
  const best = scores[0], second = scores[1];
  if (!best || !second || !Number.isFinite(best.score) || best.score <= 0 || best.score - second.score <= 1e-12) return null;
  return { model_sha256: model.sha256, version: model.reference_version, cluster: best.cluster,
    similarity: best.score, margin: best.score - second.score, overlap: present.length };
}

/** Only explicit deck IDs, never offered cards or guessed Chinese names. */
export function strategyDeckIds(ctx: ToolContext): string[] {
  const p = record(ctx.payload), state = record(ctx.state), run = record(state["run"]);
  const raw = record(run["raw"]);
  const decks = [run["deck"], raw["deck"], record(p["facts"])["deck"], p["deck"], record(p["run_state"])["deck"], record(p["run_plan_task"])["deck"], record(p["run_brief"])["deck"]];
  const deck = decks.find(v => Array.isArray(v) || typeof v === "string");
  const lines: unknown[] = Array.isArray(deck) ? deck : typeof deck === "string" ? deck.split("\n") : [];
  return lines.flatMap(value => {
    const r = record(value);
    const explicit = r["card_id"] ?? r["id"];
    if (typeof explicit === "string" && /^(?:CARD\.)?[A-Z][A-Z0-9_]*$/.test(explicit)) return [explicit.replace(/^CARD\./, "")];
    if (typeof value !== "string") return [];
    // buildFacts: "2x CARD_ID 中文名 (cost ...): ..."; upgrade suffixes do not change identity.
    const match = /^(?:\d+x\s+)?(?:CARD\.)?([A-Z][A-Z0-9_]*)(?:\+\d*)?(?=\s|:|$)/.exec(value.trim());
    return match ? [match[1]!] : [];
  });
}

/** Fixed, checksum-pinned projection only; no model-selected file or network. */
export function matchStrategyArchetype(ctx: ToolContext) {
  if (knowledgeCharacter() !== "silent" || ctx.ascension !== 10) return { status: "out_of_scope", match: null };
  try {
    const path = runtimeKnowledgeFile(ctx.knowledgeDir, ARCHETYPES_FILE);
    if (statSync(path).size > 200_000) throw new Error("oversize");
    const bytes = readFileSync(path);
    if (createHash("sha256").update(bytes).digest("hex") !== ARCHETYPES_SHA256) throw new Error("checksum");
    const data = JSON.parse(bytes.toString("utf8")) as { model: Model; limitations: string[] };
    const match = nearestArchetype(strategyDeckIds(ctx), data.model);
    return { status: match ? "matched" : "no_match", match,
      source: "external:sts2fun", file: ARCHETYPES_FILE, sha256: ARCHETYPES_SHA256,
      reference_n: data.model.reference_n, limitations: data.limitations,
      note: "仅当前牌组与外部几何的最近匹配，不证明已成型、流派优劣或因果收益；剧本语义与样本见条目证据。" };
  } catch { return { status: "unavailable", match: null }; }
}
