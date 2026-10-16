/** Character-scoped observed encounter frequencies; never a claim about the game's spawn distribution. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { asRecord } from "../core/util/json.js";
import { KNOWLEDGE_DIR, knowledgeFile } from "../knowledge/files.js";

export interface GlobalBossCandidate {
  boss: string;
  count: number;
  frequency: number;
  evidence: string[];
}
export interface GlobalBossPool {
  character: "silent";
  ascension: number;
  stages: { act: number; candidates: GlobalBossCandidate[] }[];
  unknown: { boss: string; reason: string }[];
  source: { path: string; sha256: string; generated: unknown };
  unit: "observed_fight_records_including_retries";
}

/** Acts come only from this character's linked encounter records, including compound encounters. */
export function observedGlobalBossPool(value: unknown, ascension: number, source: GlobalBossPool["source"]): GlobalBossPool {
  const raw = asRecord(value), meta = asRecord(raw["meta"]);
  const result: GlobalBossPool = { character: "silent", ascension, stages: [], unknown: [], source,
    unit: "observed_fight_records_including_retries" };
  if (meta["character"] !== "silent") throw new Error("global Boss pool requires Silent's own records");
  const stages = new Map<number, GlobalBossCandidate[]>();
  for (const [boss, byAsc] of Object.entries(asRecord(raw["bosses"]))) {
    const record = asRecord(asRecord(byAsc)[String(ascension)]);
    const count = record["fights"];
    if (!Number.isSafeInteger(count) || Number(count) <= 0) continue;
    const linked = Object.entries(asRecord(record["encounters"]));
    const acts = new Set<number>();
    let valid = linked.length > 0, total = 0;
    for (const [encounter, n] of linked) {
      const entry = asRecord(asRecord(raw["encounters"])[encounter]);
      const keys = Object.entries(asRecord(entry["acts"])).filter(([, seen]) => Number(seen) > 0).map(([act]) => Number(act));
      if (keys.length !== 1 || !Number.isSafeInteger(keys[0]) || keys[0]! < 1
          || !Number.isSafeInteger(n) || Number(n) <= 0 || !(Number(asRecord(entry["rooms"])["boss"]) > 0)) valid = false;
      else acts.add(keys[0]!);
      total += Number(n);
    }
    if (!valid || acts.size !== 1 || total !== count) {
      result.unknown.push({ boss, reason: "own_encounter_act_or_count_not_fully_observed" });
      continue;
    }
    const act = [...acts][0]!;
    const candidates = stages.get(act) ?? [];
    candidates.push({ boss, count: Number(count), frequency: 0,
      evidence: [`bosses.${boss}.${ascension}`, ...linked.map(([key]) => `encounters.${key}.acts`)] });
    stages.set(act, candidates);
  }
  result.stages = [...stages].sort(([a], [b]) => a - b).map(([act, candidates]) => {
    const n = candidates.reduce((sum, candidate) => sum + candidate.count, 0);
    return { act, candidates: candidates.sort((a, b) => a.boss.localeCompare(b.boss))
      .map((candidate) => ({ ...candidate, frequency: candidate.count / n })) };
  });
  return result;
}

let cached: { path: string; ascension: number; pool: GlobalBossPool } | undefined;
export function loadGlobalBossPool(ascension: number): GlobalBossPool {
  const path = knowledgeFile(KNOWLEDGE_DIR, "monster-records.json", "silent");
  if (cached?.path === path && cached.ascension === ascension) return cached.pool;
  const bytes = readFileSync(path);
  const raw = JSON.parse(bytes.toString()) as unknown;
  const pool = observedGlobalBossPool(raw, ascension, { path,
    sha256: createHash("sha256").update(bytes).digest("hex"), generated: asRecord(asRecord(raw)["meta"])["generated_from"] ?? null });
  cached = { path, ascension, pool };
  return pool;
}
