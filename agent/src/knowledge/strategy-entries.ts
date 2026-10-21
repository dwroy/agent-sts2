/** Declarative strategy retrieval. Content is maintained by learners, never inferred here. */
import { readFileSync, statSync } from "node:fs";
import { characterKey, knowledgeCharacter, knowledgeFile } from "./files.js";
import type { BrainRequest } from "../brain/types.js";

export const QUESTION_TYPES = ["card_reward", "event", "rest", "shop", "act_plan"] as const;
export type QuestionType = typeof QUESTION_TYPES[number];
type Range = { min?: number; max?: number };
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
  };
  strategy: string;
  evidence: { run: string; floor: number; ref?: string }[];
  source: "own" | `external:${string}`;
  provenance?: { url: string; version: string; sha256: string; license: string };
  confidence: number;
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
/** Reject unknown trigger keys: a typo must never silently broaden an entry. */
export function parseStrategyLibrary(raw: unknown): StrategyLibrary {
  if (!object(raw) || raw["schema"] !== "brain-strategies-v1" || raw["character"] !== "silent" || !Array.isArray(raw["entries"]) || raw["entries"].length > STRATEGY_LIMITS.libraryEntries) throw new Error("invalid strategy library header");
  const ids = new Set<string>();
  for (const entry of raw["entries"]) {
    if (!object(entry) || !text(entry["id"]) || ids.has(entry["id"]) || !text(entry["version"]) || !text(entry["strategy"]) || Buffer.byteLength(entry["strategy"], "utf8") > STRATEGY_LIMITS.textBytes || !finite(entry["confidence"]) || entry["confidence"] < 0 || entry["confidence"] > 1) throw new Error("invalid strategy entry");
    ids.add(entry["id"]);
    const t = entry["trigger"];
    if (!object(t) || !only(t, ["question_types", "acts", "floor", "bosses", "hp_ratio", "deck_size", "deck_cards"]) || !Array.isArray(t["question_types"]) || !t["question_types"].length || !t["question_types"].every((q) => QUESTION_TYPES.includes(q as QuestionType))) throw new Error("invalid strategy trigger");
    if (t["acts"] !== undefined && (!Array.isArray(t["acts"]) || !t["acts"].length || !t["acts"].every((a) => Number.isInteger(a) && a >= 1 && a <= 3))) throw new Error("invalid strategy acts");
    if (t["bosses"] !== undefined && (!Array.isArray(t["bosses"]) || !t["bosses"].length || !t["bosses"].every(text))) throw new Error("invalid strategy bosses");
    for (const k of ["floor", "deck_size", "hp_ratio"]) if (t[k] !== undefined && !range(t[k], 0, k === "hp_ratio" ? 1 : Infinity)) throw new Error("invalid strategy range");
    if (t["deck_cards"] !== undefined && (!Array.isArray(t["deck_cards"]) || !t["deck_cards"].length || !t["deck_cards"].every((c) => object(c) && only(c, ["name", "count"]) && text(c["name"]) && range(c["count"])))) throw new Error("invalid strategy deck cards");
    if (!Array.isArray(entry["evidence"]) || !entry["evidence"].length || entry["evidence"].length > 20 || !entry["evidence"].every((e) => object(e) && text(e["run"]) && Number.isInteger(e["floor"]) && (e["floor"] as number) >= 0 && (e["ref"] === undefined || text(e["ref"])))) throw new Error("invalid strategy evidence");
    const source = entry["source"];
    if (source !== "own" && !(text(source) && /^external:.+/.test(source))) throw new Error("invalid strategy source");
    if (source !== "own") {
      const p = entry["provenance"];
      if (!object(p) || !["url", "version", "sha256", "license"].every((k) => text(p[k])) || !/^https?:\/\//.test(p["url"] as string) || !/^[a-f0-9]{64}$/.test(p["sha256"] as string)) throw new Error("external strategy needs provenance");
    }
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
  if (label === "event/act-plan" || label === "run-plan" && ["start", "act"].includes(String((object(p["run_state"]) ? p["run_state"] : p)["trigger"])) || ["start", "act"].includes(String(plan["trigger"]))) result.push("act_plan");
  return result;
}
function within(value: number | undefined, r: Range | undefined): boolean {
  return !r || value !== undefined && (r.min === undefined || value >= r.min) && (r.max === undefined || value <= r.max);
}
/** Names/counts only; no inferred archetypes or card-value rules. */
export function deckCounts(raw: unknown): Map<string, number> | null {
  if (!(typeof raw === "string" || Array.isArray(raw))) return null;
  const counts = new Map<string, number>();
  for (const line of (Array.isArray(raw) ? raw.map(String) : raw.split("\n"))) {
    const match = /^(?:(\d+)x )?(.+?)(?: \(|:|$)/.exec(line.trim());
    if (match) counts.set(match[2]!, (counts.get(match[2]!) ?? 0) + Number(match[1] ?? 1));
  }
  return counts;
}
export function retrieveStrategies(library: StrategyLibrary, label: string, payload: unknown): StrategyEntry[] {
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
  const size = number("deck_size") ?? (deck ? [...deck.values()].reduce((a, b) => a + b, 0) : undefined);
  const types = questionTypes(label, payload);
  const specificity = (e: StrategyEntry) => Object.keys(e.trigger).length + (e.trigger.deck_cards?.length ?? 0);
  return library.entries.filter((e) => {
    const t = e.trigger;
    return t.question_types.some((q) => types.includes(q)) && (!t.acts || t.acts.includes(number("act") ?? -1))
      && (!t.bosses || t.bosses.includes(String(get("act_boss") ?? get("boss") ?? "")))
      && within(number("floor"), t.floor) && within(ratio, t.hp_ratio) && within(size, t.deck_size)
      && (!t.deck_cards || !!deck && t.deck_cards.every((c) => within(deck.get(c.name) ?? 0, c.count)));
  }).sort((a, b) => specificity(b) - specificity(a) || b.confidence - a.confidence || a.id.localeCompare(b.id));
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
