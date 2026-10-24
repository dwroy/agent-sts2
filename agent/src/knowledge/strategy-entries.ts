/** Declarative strategy retrieval. Content is maintained by learners, never inferred here. */
import { readFileSync, statSync } from "node:fs";
import { characterKey, knowledgeCharacter, knowledgeFile } from "./files.js";
import type { BrainRequest } from "../brain/types.js";
import type { ArchetypeBinding, ArchetypeMatch } from "./strategy-archetypes.js";

export const QUESTION_TYPES = ["card_reward", "event", "rest", "shop", "act_plan", "fight_plan"] as const;
export type QuestionType = typeof QUESTION_TYPES[number];
type Range = { min?: number; max?: number };
export interface OwnStrategyEvidence { type?: "own"; run: string; floor: number; ref?: string; role?: "support" | "contradict" | "repeat" }
export interface ExternalAggregateEvidence {
  type: "external_aggregate";
  source: `external:${string}`;
  url: string;
  version: string;
  dataset_sha256: string;
  downloaded_at: string;
  filters: { character: "silent"; ascension: number; criteria: string };
  statistic: { name: string; value: number; unit: string };
  denominator: { unit: "runs" | "players" | "offers" | "fights" | "rooms" | "rewards" | "cards"; n: number };
  interval?: { low: number; high: number; method: string };
  design: "observational";
  limitations: string[];
  license: string;
  ref?: string;
  role?: "support" | "contradict";
}
export type StrategyEvidence = OwnStrategyEvidence | ExternalAggregateEvidence;
export const EXTERNAL_ONLY_CONFIDENCE_MAX = 0.49;
export interface StrategyEntry {
  id: string;
  version: string;
  trigger: {
    question_types: QuestionType[];
    acts?: number[];
    floor?: Range;
    bosses?: string[];
    hp_ratio?: Range;
    deck_size?: Range;
    deck_cards?: { name: string; count: Range }[];
    archetype?: ArchetypeBinding;
  };
  strategy: string;
  evidence: StrategyEvidence[];
  source: "own" | "mixed" | `external:${string}`;
  provenance?: { url: string; version: string; sha256: string; license: string };
  confidence: number;
  evidence_status?: "aligned" | "conflict" | "unassessed";
  evidence_summary?: ReturnType<typeof strategyEvidenceSummary>;
  limitation_notice?: string;
}
export interface StrategyLibrary { schema: "brain-strategies-v1"; character: "silent"; entries: StrategyEntry[] }
export const STRATEGY_LIMITS = { entries: 3, bytes: 4096, textBytes: 1200, fileBytes: 1_048_576, libraryEntries: 500 } as const;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const bytes = (v: unknown) => Buffer.byteLength(JSON.stringify(v), "utf8");
const only = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).every((k) => keys.includes(k));
function range(v: unknown, low = 0, high = Infinity): boolean {
  return object(v) && only(v, ["min", "max"]) && Object.keys(v).length > 0
    && [v["min"], v["max"]].every((n) => n === undefined || finite(n) && n >= low && n <= high)
    && (v["min"] === undefined || v["max"] === undefined || (v["min"] as number) <= (v["max"] as number));
}
/** Aggregate evidence never accepts synthetic run/floor fields. Keep in sync with learner/external_evidence.py. */
export function validateStrategyEvidence(ev: unknown): void {
  if (!object(ev)) throw new Error("invalid strategy evidence");
  if (ev["type"] !== "external_aggregate") {
    if (!only(ev, ["type", "run", "floor", "ref", "role"])
      || ev["type"] !== undefined && ev["type"] !== "own"
      || !text(ev["run"])
      || !/^[0-9A-Z]{12}$/.test(ev["run"])
      || !Number.isInteger(ev["floor"])
      || (ev["floor"] as number) < 1
      || ev["ref"] !== undefined && !text(ev["ref"])
      || ev["role"] !== undefined && (typeof ev["role"] !== "string" || !["support", "contradict", "repeat"].includes(ev["role"])))
      throw new Error("invalid own strategy evidence");
    return;
  }
  if (!only(ev, ["type", "source", "url", "version", "dataset_sha256", "downloaded_at", "filters", "statistic", "denominator", "interval", "design", "limitations", "license", "ref", "role"])
      || !text(ev["source"])
      || !/^external:\S+$/.test(ev["source"])
      || !text(ev["url"])
      || !/^https?:\/\/[^\s/]+/.test(ev["url"])
      || !text(ev["version"])
      || !text(ev["license"])
      || !text(ev["dataset_sha256"])
      || !/^[a-f0-9]{64}$/.test(ev["dataset_sha256"])
      || !text(ev["downloaded_at"])
      || !/^\d{4}-\d{2}-\d{2}$/.test(ev["downloaded_at"])
      || !Number.isFinite(Date.parse(ev["downloaded_at"]))
      || new Date(ev["downloaded_at"]).toISOString().slice(0, 10) !== ev["downloaded_at"]
      || ev["design"] !== "observational"
      || !Array.isArray(ev["limitations"])
      || !ev["limitations"].length
      || !ev["limitations"].every(text))
      throw new Error("invalid external aggregate provenance");
  const f = ev["filters"], s = ev["statistic"], d = ev["denominator"], ci = ev["interval"];
  if (!object(f)
      || !only(f, ["character", "ascension", "criteria"])
      || f["character"] !== "silent"
      || !Number.isInteger(f["ascension"])
      || (f["ascension"] as number) < 0
      || (f["ascension"] as number) > 20
      || !text(f["criteria"])
      || !object(s)
      || !only(s, ["name", "value", "unit"])
      || !text(s["name"])
      || !finite(s["value"])
      || !text(s["unit"])
      || !object(d)
      || !only(d, ["unit", "n"])
      || typeof d["unit"] !== "string"
      || !["runs", "players", "offers", "fights", "rooms", "rewards", "cards"].includes(d["unit"])
      || !Number.isSafeInteger(d["n"])
      || (d["n"] as number) <= 0)
      throw new Error("invalid external aggregate statistic/denominator");
  if (ci !== undefined && (!object(ci)
      || !only(ci, ["low", "high", "method"])
      || !finite(ci["low"])
      || !finite(ci["high"])
      || ci["low"] > ci["high"]
      || !text(ci["method"])))
      throw new Error("invalid external aggregate interval");
  if (ev["ref"] !== undefined && !text(ev["ref"])
      || ev["role"] !== undefined && (typeof ev["role"] !== "string" || !["support", "contradict"].includes(ev["role"])))
      throw new Error("invalid external aggregate role/ref");
}

/** Do not add overlapping external denominators or count them as local validation. */
export function strategyEvidenceSummary(entry: StrategyEntry) {
  const own = entry.evidence.filter((e): e is OwnStrategyEvidence => e.type !== "external_aggregate");
  return { own_runs: new Set(own.map(e => e.run)).size, own_support_runs: new Set(own.filter(e => e.role !== "contradict").map(e => e.run)).size,
    external: entry.evidence.filter((e): e is ExternalAggregateEvidence => e.type === "external_aggregate").map(e => ({ source: e.source, version: e.version, dataset_sha256: e.dataset_sha256, statistic: e.statistic.name, denominator: e.denominator })) };
}
function presentStrategy(entry: StrategyEntry): StrategyEntry {
  if (!entry.evidence.some(e => e.type === "external_aggregate")) return entry;
  return { ...entry, evidence_summary: strategyEvidenceSummary(entry), limitation_notice: "外部聚合为观察性统计、非因果，外部分母不计本系统验证；样本选择、版本与口径局限见 evidence.limitations。" };
}

/** Reject unknown trigger keys: a typo must never silently broaden an entry. */
export function parseStrategyLibrary(raw: unknown): StrategyLibrary {
  if (!object(raw) || raw["schema"] !== "brain-strategies-v1" || raw["character"] !== "silent" || !Array.isArray(raw["entries"]) || raw["entries"].length > STRATEGY_LIMITS.libraryEntries) throw new Error("invalid strategy library header");
  const ids = new Set<string>();
  for (const entry of raw["entries"]) {
    if (!object(entry) || !text(entry["id"]) || ids.has(entry["id"]) || !text(entry["version"]) || !text(entry["strategy"]) || Buffer.byteLength(entry["strategy"], "utf8") > STRATEGY_LIMITS.textBytes || !finite(entry["confidence"]) || entry["confidence"] < 0 || entry["confidence"] > 1) throw new Error("invalid strategy entry");
    ids.add(entry["id"]);
    const t = entry["trigger"];
    if (!object(t) || !only(t, ["question_types", "acts", "floor", "bosses", "hp_ratio", "deck_size", "deck_cards", "archetype"]) || !Array.isArray(t["question_types"]) || !t["question_types"].length || !t["question_types"].every((q) => QUESTION_TYPES.includes(q as QuestionType))) throw new Error("invalid strategy trigger");
    const a = t["archetype"];
    if (a !== undefined && (!object(a) || !only(a, ["model_sha256", "version", "clusters"])
      || !text(a["model_sha256"]) || !/^[a-f0-9]{64}$/.test(a["model_sha256"]) || !text(a["version"])
      || !Array.isArray(a["clusters"]) || !a["clusters"].length || a["clusters"].length > 10
      || !a["clusters"].every(c => Number.isInteger(c) && c >= 0 && c < 10))) throw new Error("invalid strategy archetype");
    if (t["acts"] !== undefined && (!Array.isArray(t["acts"]) || !t["acts"].length || !t["acts"].every((a) => Number.isInteger(a) && a >= 1 && a <= 3))) throw new Error("invalid strategy acts");
    if (t["bosses"] !== undefined && (!Array.isArray(t["bosses"]) || !t["bosses"].length || !t["bosses"].every(text))) throw new Error("invalid strategy bosses");
    for (const k of ["floor", "deck_size", "hp_ratio"]) if (t[k] !== undefined && !range(t[k], 0, k === "hp_ratio" ? 1 : Infinity)) throw new Error("invalid strategy range");
    if (t["deck_cards"] !== undefined && (!Array.isArray(t["deck_cards"]) || !t["deck_cards"].length || !t["deck_cards"].every((c) => object(c) && only(c, ["name", "count"]) && text(c["name"]) && range(c["count"])))) throw new Error("invalid strategy deck cards");
    if (!Array.isArray(entry["evidence"]) || !entry["evidence"].length || entry["evidence"].length > 20) throw new Error("invalid strategy evidence");
    for (const ev of entry["evidence"]) validateStrategyEvidence(ev);
    const evidence = entry["evidence"] as StrategyEvidence[];
    const external = evidence.filter((e): e is ExternalAggregateEvidence => e.type === "external_aggregate");
    const own = evidence.filter((e): e is OwnStrategyEvidence => e.type !== "external_aggregate");
    const sources = new Set([...own.map(() => "own"), ...external.map(e => e.source)]);
    if (entry["source"] !== (sources.size > 1 ? "mixed" : [...sources][0])) throw new Error("strategy source must match evidence");
    const status = entry["evidence_status"];
    if (status !== undefined && (typeof status !== "string" || !["aligned", "conflict", "unassessed"].includes(status)) || sources.size > 1 && status === undefined) throw new Error("mixed strategy needs evidence_status");
    if (external.length && evidence.some(e => e.role === "contradict") && status !== "conflict") throw new Error("contradictory evidence needs conflict status");
    if (external.length && !own.some(e => e.role !== "contradict") && entry["confidence"] > EXTERNAL_ONLY_CONFIDENCE_MAX) throw new Error("external-only strategy confidence exceeds 0.49");
  }
  return raw as unknown as StrategyLibrary;
}

export function questionTypes(label: string, payload: unknown): QuestionType[] {
  const p = object(payload) ? payload : {};
  const plan = object(p["run_plan_task"]) ? p["run_plan_task"] : {};
  const result: QuestionType[] = [];
  if (label === "reward/card") result.push("card_reward");
  else if (label.startsWith("event/")) result.push("event");
  else if (label.startsWith("rest/")) result.push("rest");
  else if (label.startsWith("shop/")) result.push("shop");
  else if (label === "fight-plan") result.push("fight_plan");
  if (label === "event/act-plan" || label === "map/act-start" || label === "run-plan" && ["start", "act"].includes(String((object(p["run_state"]) ? p["run_state"] : p)["trigger"])) || ["start", "act"].includes(String(plan["trigger"]))) result.push("act_plan");
  return result;
}
function within(value: number | undefined, r: Range | undefined): boolean {
  return !r || value !== undefined && (r.min === undefined || value >= r.min) && (r.max === undefined || value <= r.max);
}
/** Exact IDs/display names and counts only; no card-value or semantic inference. */
export function deckCounts(raw: unknown): Map<string, number> | null {
  if (!(typeof raw === "string" || Array.isArray(raw))) return null;
  const counts = new Map<string, number>();
  for (const value of (Array.isArray(raw) ? raw : raw.split("\n"))) {
    if (object(value)) {
      for (const key of new Set([value["card_id"], value["name"]].filter(text))) counts.set(key, (counts.get(key) ?? 0) + 1);
      continue;
    }
    const line = String(value);
    const match = /^(?:(\d+)x )?(.+?)(?: \(|:|$)/.exec(line.trim());
    if (match) {
      const full = match[2]!;
      const id = /^(?:CARD\.)?([A-Z][A-Z0-9_]*)(?:\+\d*)?(?: (.+))?$/.exec(full);
      for (const key of new Set([full, ...(id ? [id[1]!, ...(id[2] ? [id[2]] : [])] : [])])) counts.set(key, (counts.get(key) ?? 0) + Number(match[1] ?? 1));
    }
  }
  return counts;
}
export function retrieveStrategies(library: StrategyLibrary, label: string, payload: unknown, archetype?: ArchetypeMatch | null): StrategyEntry[] {
  if (!object(payload)) return [];
  const brief = object(payload["run_brief"]) ? payload["run_brief"] : {};
  const facts = object(payload["facts"]) ? payload["facts"] : {};
  const plan = object(payload["run_plan_task"]) ? payload["run_plan_task"] : {};
  const run = object(payload["run_state"]) ? payload["run_state"] : {};
  const get = (k: string) => facts[k] ?? payload[k] ?? run[k] ?? plan[k] ?? brief[k];
  const number = (k: string) => finite(get(k)) ? get(k) as number : typeof get(k) === "string" && /^\d+$/.test(get(k) as string) ? Number(get(k)) : undefined;
  const hp = /^(\d+)\s*\/\s*(\d+)(?:\s|$)/.exec(String(get("hp")));
  const ratio = hp && Number(hp[2]) > 0 ? Number(hp[1]) / Number(hp[2]) : undefined;
  const deck = deckCounts(get("deck"));
  const rawDeck = get("deck");
  const size = number("deck_size") ?? (deck ? (Array.isArray(rawDeck) ? rawDeck : String(rawDeck).split("\n")).reduce((n: number, value: unknown) => n + (typeof value === "string" ? Number(/^(\d+)x /.exec(value.trim())?.[1] ?? 1) : 1), 0) : undefined);
  const types = questionTypes(label, payload);
  const specificity = (e: StrategyEntry) => Object.keys(e.trigger).length + (e.trigger.deck_cards?.length ?? 0);
  return library.entries.filter((e) => {
    const t = e.trigger;
    return t.question_types.some((q) => types.includes(q)) && (!t.acts || t.acts.includes(number("act") ?? -1))
      && (!t.bosses || t.bosses.includes(String(get("act_boss") ?? get("boss") ?? "")))
      && within(number("floor"), t.floor) && within(ratio, t.hp_ratio) && within(size, t.deck_size)
      && (!t.deck_cards || !!deck && t.deck_cards.every((c) => within(deck.get(c.name) ?? 0, c.count)))
      && (!t.archetype || !!archetype && t.archetype.model_sha256 === archetype.model_sha256
        && t.archetype.version === archetype.version && t.archetype.clusters.includes(archetype.cluster));
  }).sort((a, b) => specificity(b) - specificity(a) || b.confidence - a.confidence || a.id.localeCompare(b.id)).map(presentStrategy);
}

/** Total serialized UTF-8 bytes, including metadata/envelope, are bounded; never truncate evidence. */
export function applyStrategyEntries(req: BrainRequest, library: StrategyLibrary | null): BrainRequest {
  if (!library || !object(req.payload)) return req;
  const entries: StrategyEntry[] = [];
  for (const entry of retrieveStrategies(library, req.label, req.payload)) {
    if (bytes({ schema: library.schema, entries: [...entries, entry] }) > STRATEGY_LIMITS.bytes) continue;
    entries.push(entry);
    if (entries.length === STRATEGY_LIMITS.entries) break;
  }
  return entries.length ? { ...req, payload: { ...req.payload, strategy_entries: { schema: library.schema, entries } } } : req;
}

/** Invalid/missing files fail closed. A changed file is revalidated before the next question. */
export class StrategyEntries {
  private cache: { path: string; stamp: string; library: StrategyLibrary | null } | null = null;
  apply(req: BrainRequest, dir: string, character = knowledgeCharacter()): BrainRequest {
    const p = object(req.payload) ? req.payload : {};
    const b = object(p["run_brief"]) ? p["run_brief"] : {};
    const role = characterKey(typeof b["character"] === "string" ? b["character"] : character);
    if (role !== "silent" || !questionTypes(req.label, req.payload).length) return req;
    const path = knowledgeFile(dir, "strategy-entries.json", "silent");
    try {
      const stat = statSync(path), stamp = `${stat.mtimeMs}/${stat.size}`;
      if (stat.size > STRATEGY_LIMITS.fileBytes) return req;
      if (this.cache?.path !== path || this.cache.stamp !== stamp) {
        this.cache = { path, stamp, library: null };
        this.cache.library = parseStrategyLibrary(JSON.parse(readFileSync(path, "utf8")));
      }
      return applyStrategyEntries(req, this.cache.library);
    } catch { return req; }
  }
}
