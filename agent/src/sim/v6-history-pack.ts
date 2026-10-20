/** Frozen observations, built between runs and loaded once without accessing historical logs. */
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { array, boolean, custom, literal, nullable, number, object, optional, refine, text, validate, type Infer } from "../v6/schema.js";
import { characterSchema, type Character } from "../v6/formats.js";
import { buildMetricSchema } from "../v6/build-core.js";
import { v6AppearanceSchema, type V6Appearance } from "../v6/appearance.js";
import type { V6Config } from "../v6/config.js";
import { v6History } from "./v6-history.js";

const count = number(0, 1e9, true), ascension = number(0, 100, true);
// Byte provenance is bounded by exact JavaScript integers, not gameplay counts.
const bytePosition = number(0, Number.MAX_SAFE_INTEGER, true);
const timestamp = refine(text(100), (v, e) => {
  if (!Number.isFinite(Date.parse(v)) || new Date(v).toISOString() !== v) e.push("canonical UTC timestamp required");
});
const sha = refine(text(64), (v, e) => { if (!/^[a-f0-9]{64}$/.test(v)) e.push("invalid SHA256"); });
const card = object({ id: text(), upgraded: boolean });
export const v6CoverageSchema = object({ run_id: text(), ended: timestamp, ascension,
  first_stop: nullable(object({ ts: timestamp, floor: count, result: text() })),
  first_trial_final_victory: boolean, final_including_sl_victory: boolean });
export const v6FrameSchema = object({ run_id: text(), ts: timestamp, floor: count, act_id: text(10), screen: text(),
  boss_id: optional(text()), in_combat: optional(boolean), turn: optional(nullable(count)),
  hp: number(0), max_hp: number(1), gold: number(0), deck: array(card, 0, 10000) });
export const v6FightSchema = object({ run_id: text(), ascension, floor: count, boss: text(), attempt: number(1, 1e6, true),
  started_at: timestamp, ended_at: timestamp, result: text(), entry: nullable(object({ ts: timestamp, hp: number(0), max_hp: number(1) })) });
export const v6OpportunitySchema = object({ schema: literal("construction-opportunities-v1"), character: characterSchema,
  generated: timestamp, cutoff: timestamp, digest: sha, limitations: array(text(4000)), rows: array(object({
    id: text(), run: text(), ts: timestamp, act: number(1, 10, true), ascension, floor: count,
    kind: custom<"reward" | "shop">((v, p, e) => { if (v !== "reward" && v !== "shop") e.push(`${p}: reward/shop required`); }),
    offers: array(object({ id: text(), upgraded: boolean, price: number(0) }), 0, 1000),
    source: object({ offset: bytePosition, bytes: bytePosition, sha256: sha }),
  }), 0, 1e6) });
const change = object({ floor: count, act: number(1, 10, true), adds: array(card), removes: array(card),
  upgrades: array(text()), positiveGold: number(0), rest: boolean });
const framePoint = object({ ts: timestamp, hp: nullable(number(0)), max_hp: nullable(number(1)), gold: nullable(number(0)) });
const payloadSchema = refine(object({ character: characterSchema, cutoff: timestamp,
  sources: array(object({ name: text(), sha256: sha, bytes: bytePosition }), 4, 100),
  coverage: array(v6CoverageSchema, 0, 100000),
  floor_frames: array(object({ run_id: text(), floor: count, act: number(1, 10, true), observed_frames: number(1, 1e9, true),
    first: framePoint, last: framePoint }), 0, 1e6),
  histories: array(object({ run: text(), character: characterSchema, ascension, endedAt: timestamp,
    floors: array(count, 0, 10000), changes: array(change, 0, 100000) }), 0, 100000),
  observations: array(object({ run_id: text(), character: characterSchema, ascension, act: number(1, 10, true), floor: count,
    boss: text(), first_attempt: boolean,
    entry_hp: number(0), max_hp: number(1) }), 0, 1e6),
  opportunities: v6OpportunitySchema,
  combo_metrics: array(object({ id: text(), metrics: array(buildMetricSchema, 2, 2) }), 0, 10000),
  appearance: optional(v6AppearanceSchema),
  labels: array(text(4000)),
}), (v, e) => {
  const runs = new Map(v.coverage.map(r => [r.run_id, r]));
  if (runs.size !== v.coverage.length) e.push("duplicate run coverage");
  if (v.coverage.some(r => Date.parse(r.ended) > Date.parse(v.cutoff) || r.first_stop && Date.parse(r.first_stop.ts) > Date.parse(r.ended))) e.push("coverage exceeds frozen cutoff");
  if (new Set(v.sources.map(s => s.name)).size !== v.sources.length) e.push("duplicate input identity");
  if (v.opportunities.character !== v.character || Date.parse(v.opportunities.cutoff) > Date.parse(v.cutoff)) e.push("opportunity scope mismatch");
  for (const r of v.histories) if (r.character !== v.character || !runs.has(r.run) || runs.get(r.run)!.ascension !== r.ascension
    || runs.get(r.run)!.ended !== r.endedAt) e.push("history scope mismatch");
  if (new Set(v.histories.map(r => r.run)).size !== v.histories.length) e.push("duplicate history");
  if (new Set(v.floor_frames.map(r => JSON.stringify([r.run_id, r.floor]))).size !== v.floor_frames.length) e.push("duplicate floor summary");
  for (const r of v.floor_frames) if (!runs.has(r.run_id) || r.first.ts > r.last.ts || r.last.ts > runs.get(r.run_id)!.ended
    || runs.get(r.run_id)!.first_stop && r.last.ts > runs.get(r.run_id)!.first_stop!.ts
    || [r.first, r.last].some(f => f.hp !== null && f.max_hp !== null && f.hp > f.max_hp)) e.push("invalid floor summary");
  const beforeStop = (run: string, ts: string) => { const r = runs.get(run); return !!r && ts <= r.ended && (!r.first_stop || ts <= r.first_stop.ts); };
  for (const o of v.opportunities.rows) if (!beforeStop(o.run, o.ts) || runs.get(o.run)!.ascension !== o.ascension) e.push("opportunity outside first attempt");
  for (const o of v.observations) if (o.character !== v.character || !o.first_attempt || !runs.has(o.run_id)
    || runs.get(o.run_id)!.ascension !== o.ascension || o.entry_hp > o.max_hp) e.push("invalid boss first attempt");
  if (new Set(v.combo_metrics.map(c => c.id)).size !== v.combo_metrics.length) e.push("duplicate combo metric identity");
  for (const c of v.combo_metrics) if (new Set(c.metrics.map(m => m.attempt)).size !== 2
    || c.metrics.some(m => m.sources.some(s => s.run_ids.some(id => !runs.has(id))))) e.push("combo metric provenance not covered");
  if (v.appearance && (v.appearance.character !== v.character || v.appearance.cutoff !== v.cutoff
    || v.appearance.runs.length !== runs.size || v.appearance.runs.some(r => !runs.has(r.run_id)
      || runs.get(r.run_id)!.ascension !== r.ascension || runs.get(r.run_id)!.ended !== r.ended))) e.push("appearance scope mismatch");
});
export type V6HistoryPayload = Infer<typeof payloadSchema>;
export const v6HistoryPackSchema = object({ schema: literal("v6-frozen-history-v1"), generated_at: timestamp,
  content_sha256: sha, data: payloadSchema });
export type V6HistoryPack = Infer<typeof v6HistoryPackSchema>;
const digest = (data: unknown) => createHash("sha256").update(JSON.stringify(data)).digest("hex");
export function sealV6History(data: unknown, generated_at: string): V6HistoryPack {
  const pack = { schema: "v6-frozen-history-v1" as const, generated_at, content_sha256: digest(data), data };
  const result = validate(v6HistoryPackSchema, pack);
  if (!result.ok) throw new Error(result.issues.join("; "));
  if (Date.parse(generated_at) < Date.parse(result.value.data.cutoff)) throw new Error("generation precedes cutoff");
  return result.value;
}
/** The builder calls this explicitly; the runtime loader never re-extracts history. */
export function assembleV6History(input: { character: Character; cutoff: string; generated_at: string;
  sources: V6HistoryPayload["sources"]; coverage: Infer<typeof v6CoverageSchema>[]; frames: Infer<typeof v6FrameSchema>[];
  fights: Infer<typeof v6FightSchema>[]; opportunities: Infer<typeof v6OpportunitySchema>;
  combo_metrics: V6HistoryPayload["combo_metrics"]; appearance?: V6Appearance; checkpointFloors?: number[] }): V6HistoryPack {
  const { character, cutoff, sources, coverage, frames, fights, opportunities, combo_metrics } = input;
  const history = v6History(character, coverage, frames, fights, opportunities, input.checkpointFloors ?? []);
  const runs = new Map(coverage.map(r => [r.run_id, r]));
  const groups = new Map<string, Infer<typeof v6FrameSchema>[]>();
  const lastFloor = new Map<string, number>(), rolledBack = new Set<string>();
  for (const f of [...frames].sort((a, b) => a.ts.localeCompare(b.ts))) {
    const r = runs.get(f.run_id);
    if (!r || f.ts > r.ended || r.first_stop && f.ts > r.first_stop.ts || rolledBack.has(f.run_id)) continue;
    if (f.floor < (lastFloor.get(f.run_id) ?? 0)) { rolledBack.add(f.run_id); continue; }
    lastFloor.set(f.run_id, f.floor);
    const key = JSON.stringify([f.run_id, f.floor]), group = groups.get(key) ?? []; group.push(f); groups.set(key, group);
  }
  const point = (f: Infer<typeof v6FrameSchema>) => ({ ts: f.ts, hp: f.hp, max_hp: f.max_hp, gold: f.gold });
  const floor_frames = [...groups.values()].map(g => ({ run_id: g[0]!.run_id, floor: g[0]!.floor, act: Number(g[0]!.act_id) + 1,
    observed_frames: g.length, first: point(g[0]!), last: point(g[g.length - 1]!) }));
  return sealV6History({ character, cutoff, sources, coverage, floor_frames, ...history, combo_metrics,
    ...(input.appearance === undefined ? {} : { appearance: input.appearance }),
    labels: [...history.labels, "pooled_versions_and_ascensions_sources_only", "floor_frames_are_polls_not_independent_runs",
      "combo_metrics_are_descriptive_not_formal_build_knowledge"] }, input.generated_at);
}
export type V6HistoryLoad = { status: "loaded"; path: string; value: V6HistoryPack }
  | { status: "disabled" | "missing" | "invalid"; path: string; reason: string };
/** Call at run start and retain the returned snapshot for the whole run. No fallback or mtime cache. */
export function loadV6HistoryPack(knowledgeDir: string, rawCharacter: string, config: Pick<V6Config, "mode">): V6HistoryLoad {
  if (config.mode === "off") return { status: "disabled", path: "", reason: "V6 off" };
  const parsed = validate(characterSchema, rawCharacter);
  if (!parsed.ok) return { status: "invalid", path: "", reason: "invalid character" };
  const character = parsed.value, path = join(knowledgeDir, "characters", character, "v6-history.json");
  try {
    const base = realpathSync(knowledgeDir), dir = realpathSync(join(knowledgeDir, "characters", character));
    const resolved = realpathSync(path), rel = relative(dir, resolved);
    if (dir !== join(base, "characters", character) || rel.startsWith("..") || isAbsolute(rel)) throw new Error("character path redirected");
    const st = statSync(resolved);
    if (!st.isFile() || st.size > 128 * 1024 * 1024) throw new Error("invalid history size");
    const result = validate(v6HistoryPackSchema, JSON.parse(readFileSync(resolved, "utf8")));
    if (!result.ok) throw new Error(result.issues.join("; "));
    const pack = result.value;
    if (pack.data.character !== character || pack.content_sha256 !== digest(pack.data)
      || Date.parse(pack.generated_at) < Date.parse(pack.data.cutoff)) throw new Error("history scope/hash/time mismatch");
    return { status: "loaded", path, value: pack };
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "ENOENT" ? { status: "missing", path, reason: "no own frozen history" }
      : { status: "invalid", path, reason: e instanceof Error ? e.message : "invalid frozen history" };
  }
}
