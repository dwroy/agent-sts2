/** Frozen, run-local projections of existing observations. No game rules or preferred builds are defined here. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { asArray, asRecord, str } from "../core/util/json.js";
import { readCompatibleKnowledgeText } from "./catalog.js";
import { mergeMonsterRecords, moveDamageAt, regularEffect, type MonsterDb, type MoveEntry, type Threat } from "./monster-db.js";
import { indexedKnowledge } from "./runtime/reader.js";
import { runtimeKnowledgeIdentity } from "./runtime-paths.js";
import { runtimeDataIdentity } from "./runtime-data.js";
import { EXTERNAL_STATS_FILE, EXTERNAL_STATS_DATA_SHA256 } from "../brain/tools/external-stats-tools.js";
import { parseBossProfile, type PublishedBossProfile, type BossAttemptCounts } from "./boss-profile.js";
import { formallyGraded, strategyGrading } from "./strategy-grading.js";

type Row = Record<string, unknown>;
export interface BossPublishedMechanism { id: string; clause: string; summary: string; single_window: boolean; trigger: unknown; grading_sha256: unknown }
export interface BossOwnCounters { first: BossAttemptCounts | null; first_version: string | null; first_cutoff: string | null; inclusive: { won: number | null; known: number | null } }
export interface BossPlanningRow { id: string; act: number; parts: string[]; aliases?: string[]; hp: string; mechanics: string[]; own: string; ownCounters?: BossOwnCounters; publishedMechanisms?: BossPublishedMechanism[]; external: string; strategies: string[]; profiles: PublishedBossProfile[] }
export interface BossPlanningData { rows: BossPlanningRow[]; pairs: string[][]; sources: Row[]; knowledgeVersion: string | null; setupMs: number }
const cache = new Map<string, BossPlanningData>();
const hash = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");
export const BOSS_PAIR_FILE = "external/sts2fun/builds-v1/boss-semantics.json";
export const BOSS_PAIR_SHA256 = "73184712141ef8fb1facdca6f1baf95ba7da4fb5fa203cfb39afd9b50cc89a35";
export function canonicalBossId(id: string): string { return id.toUpperCase().replace(/^ENCOUNTER\./, "").replace(/_BOSS$/, ""); }
function mode(values: Record<string, number> | undefined): string | null {
  return Object.entries(values ?? {}).filter(([v, n]) => Number.isFinite(Number(v)) && n > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}
const n = (values: Record<string, number> | undefined) => Object.values(values ?? {}).reduce((a, b) => a + b, 0);
const amount = (x: number) => Number.isInteger(x) ? String(x) : String(Number(x.toFixed(1)));

/** Only explicitly graded facts in the bound release qualify. Never copy prior strategy advice. */
export function publishedBossMechanisms(entries: Row[]): BossPublishedMechanism[] {
  return entries.flatMap(entry => {
    const g = strategyGrading(entry);
    if (!formallyGraded(entry) || entry["confidence"] !== null || g?.evidence_type !== "机制事实") return [];
    const body = g.summary.replace(/^机制事实（已从原件复核）[；：:]?\s*/, "");
    // A complete source clause, never a substring cut through a condition or number.
    const clause = body.split("；")[0]!.replace(/^单次观察窗口：/, "单窗：").replace(/^限定原观察窗口：/, "原窗：").replace(/^Silent A10/, "");
    if (!clause.trim()) return [];
    return [{ id: str(entry["id"]), clause, summary: g.summary, single_window: g.single_observation_window,
      trigger: entry["trigger"], grading_sha256: asRecord(entry["formal_publication"])["grading_sha256"] }];
  }).sort((a, b) => Number(a.single_window) - Number(b.single_window));
}

/** Legacy boss producer sets turns_won.n=len(won), not the rounded win_rate numerator. */
export function bossOwnCounters(value: unknown, profile?: PublishedBossProfile): BossOwnCounters {
  const r = asRecord(value), won = asRecord(r["turns_won"])["n"], known = r["n_outcome_known"];
  const valid = Number.isSafeInteger(won) && Number.isSafeInteger(known) && Number(won) >= 0 && Number(known) >= Number(won);
  return { first: profile?.own ?? null, first_version: profile?.own ? profile.game_version : null, first_cutoff: profile?.own ? profile.cutoff : null,
    inclusive: { won: valid ? Number(won) : null, known: valid ? Number(known) : null } };
}
export function bossOwnCounterText(c: BossOwnCounters): string {
  const f = c.first, first = f ? `${f.won ?? "unknown"}/${f.first ?? "unknown"}(死${f.died ?? "?"}预截${f.predicted_stop ?? "?"}未知${f.unknown ?? "?"}重试${f.retries ?? "?"})` : "unknown";
  return `O首试${first}/含重试${c.inclusive.won === null ? "unknown" : `${c.inclusive.won}/${c.inclusive.known}`}`;
}

/** Use the same base damage lookup as kb_monster; never estimate an unobserved ascension here. */
export function bossMechanics(db: MonsterDb, parts: string[]): { hp: string; tokens: string[] } {
  const hp: string[] = [], attacks: string[] = [], effects: string[] = [];
  for (const id of parts) {
    const monster = db.monsters[id];
    if (!monster) { hp.push("unknown"); continue; }
    const at = monster.hp_by_asc?.["10"];
    const phases = [...new Set(Object.keys(monster.phases_by_asc?.["10"] ?? {}).flatMap(sequence => sequence.split(">").flatMap(part => {
      const value = /^\s*(\d+)(?:\s|$)/.exec(part)?.[1]; return value ? [Number(value)] : [];
    })))].sort((a, b) => a - b);
    hp.push((typeof at?.median === "number" && Number.isFinite(at.median) ? `${amount(at.median)}(n${at.n ?? "?"})` : "unknown")
      + (phases.length > 1 ? ` 相HP观测${phases.join("/")}` : ""));
    const moves = Object.entries(monster.moves ?? {}).sort((a, b) => {
      const first = (m: MoveEntry) => Math.min(...Object.keys(m.turns_seen ?? {}).map(Number).filter(Number.isFinite), Infinity);
      return first(a[1]) - first(b[1]) || a[0].localeCompare(b[0]);
    });
    const attack = moves.find(([move]) => {
      const d = moveDamageAt(db.monsters, id, move, 10);
      return d && !d.estimated && d.from === 10;
    });
    if (attack) {
      const [move, entry] = attack, d = moveDamageAt(db.monsters, id, move, 10)!;
      attacks.push(`${entry.name || move}:${amount(d.base ?? d.perHit)}${d.hits > 1 ? `×${d.hits}` : ""}(n${n(entry.damage_by_asc?.["10"]?.base_per_hit)})`);
    }
    for (const [moveId, move] of moves) {
      const gains = Object.entries(move.self_powers_gained_by_asc?.["10"] ?? {}).filter(([power, counts]) => regularEffect(move, move.self_powers_gained?.[power] ?? counts));
      const applied = Object.entries(move.player_powers_applied_by_asc?.["10"] ?? {}).filter(([power, counts]) => regularEffect(move, move.player_powers_applied?.[power] ?? counts));
      for (const [power, counts] of gains.slice(0, 1)) {
        const value = mode(counts);
        if (value !== null) effects.push(`${move.name || moveId}:${monster.powers?.[power]?.name || power}${Number(value) >= 0 ? "+" : ""}${value}(n${n(counts)})`);
      }
      for (const [power, counts] of applied.slice(0, 1)) {
        const value = mode(counts);
        if (value !== null) effects.push(`${move.name || moveId}:给我${monster.powers?.[power]?.name || power}${value}(n${n(counts)})`);
      }
    }
    const innate = Object.entries(monster.powers ?? {}).find(([, p]) => p.type === "Buff" && mode(p.turn_at_first_sight_by_asc?.["10"]) === "1");
    if (innate) {
      const [id, power] = innate, counts = power.amount_at_first_sight_by_asc?.["10"], value = mode(counts);
      if (value !== null) effects.unshift(`首见${power.name || id}${value}(n${n(counts)})`);
    }
  }
  return { hp: `${parts.length || "?"}体首HP${hp.join("+") || "unknown"}`, tokens: [...attacks, ...new Set(effects)] };
}

/** Only a bound K1 document is a publication; an arbitrary Git strategy file is not a fallback. */
export function loadBossPlanningData(directory: string, run: string): BossPlanningData {
  const key = JSON.stringify([resolve(directory), run, runtimeKnowledgeIdentity()?.version, runtimeDataIdentity()?.version]);
  const hit = cache.get(key); if (hit) return hit;
  const started = performance.now(), sources: Row[] = [];
  const read = (path: string, name?: string, pin?: string): Row | null => {
    try {
      const text = name ? readCompatibleKnowledgeText(directory, name, "silent") : readFileSync(join(directory, path), "utf8");
      const sha256 = hash(text);
      if (pin && pin !== sha256) throw Error("checksum");
      const value = JSON.parse(text);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("object");
      sources.push({ path, sha256, representation: "consumer-json", source: path.startsWith("external/") ? "external:sts2fun" : "own", status: "ok" });
      return value as Row;
    } catch { sources.push({ path, sha256: null, status: "unavailable" }); return null; }
  };
  const common = read("common/monster-db.json", "monster-db.json");
  let records: Row | null = null;
  try {
    const text = readCompatibleKnowledgeText(directory, "monster-records.json", "silent");
    records = asRecord(JSON.parse(text)); sources.push({ path: "characters/silent/monster-records.json", sha256: hash(text), source: "own", status: "ok", meta: records["meta"] });
  } catch { sources.push({ path: "characters/silent/monster-records.json", sha256: null, status: "unavailable" }); }
  const merged = mergeMonsterRecords(common ?? { monsters: {} }, records);
  const db = { bosses: asRecord(merged["bosses"]), encounters: asRecord(merged["encounters"]), monsters: asRecord(merged["monsters"]) } as unknown as MonsterDb;
  const external = read(EXTERNAL_STATS_FILE, undefined, EXTERNAL_STATS_DATA_SHA256);
  const table = asRecord(asRecord(external?.["tables"])["encounter"]), columns = asArray(table["columns"]).map(String);
  const extRows = asArray(table["rows"]).map(v => Object.fromEntries(asArray(v).map((x, i) => [columns[i]!, x])));
  const semantics = read(BOSS_PAIR_FILE, undefined, BOSS_PAIR_SHA256);
  const pairRows = asArray(semantics?.["rows"]).map(asRecord).filter(r => r["version"] === "v0.111" && r["build_id"] === "v0.111.0" && r["act_index"] === 2);
  const pairs = [...new Map(pairRows.map(r => asArray(r["observed_boss_path"]).map(v => canonicalBossId(str(v)))).filter(p => p.length === 2).map(p => [p.join("→"), p])).values()];
  let strategies: Row[] = [], knowledgeVersion: string | null = null;
  try {
    const reader = indexedKnowledge(directory), doc = reader?.document("characters/silent/strategy-entries.json");
    if (reader && doc) {
      knowledgeVersion = reader.version; strategies = asArray(asRecord(JSON.parse(doc.text))["entries"]).map(asRecord);
      sources.push({ path: "characters/silent/strategy-entries.json", sha256: doc.sha256, source: "published:K1", knowledge_version: reader.version, status: "ok" });
    }
  } catch { /* A missing bound release leaves the strategy directory unknown. */ }
  const ids = new Map<string, number>();
  for (const [id, byAsc] of Object.entries(db.bosses ?? {})) {
    const parts = Object.keys(asRecord(asRecord(asRecord(byAsc)["10"])["parts"]));
    const acts = parts.flatMap(p => Object.entries(db.monsters[p]?.acts ?? {}));
    const summed = new Map<number, number>(); for (const [act, count] of acts) summed.set(Number(act), (summed.get(Number(act)) ?? 0) + count);
    const act = [...summed].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
    if (act === 2 || act === 3) ids.set(id, act);
  }
  for (const e of extRows) if (e["version"] === "v0.111" && e["kind"] === "boss" && [2, 3].includes(Number(e["act"]))) ids.set(canonicalBossId(str(e["encounter_id"])), Number(e["act"]));
  const rows = [...ids].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).map(([id, act]): BossPlanningRow => {
    const record = asRecord(asRecord(db.bosses?.[id])["10"]) as unknown as Threat, parts = Object.keys(record.parts ?? {});
    let facts = { hp: `${parts.length || "?"}体首HPunknown`, tokens: [] as string[] };
    try { facts = bossMechanics(db, parts); } catch { /* Invalid mechanism observations remain unknown, not a decision fault. */ }
    const ext = extRows.find(e => e["version"] === "v0.111" && canonicalBossId(str(e["encounter_id"])) === id && e["kind"] === "boss");
    const matches = strategies.filter(e => asArray(asRecord(e["trigger"])["bosses"]).some(b => [id, parts.join("+")].includes(canonicalBossId(str(b)))));
    const profiles = matches.filter(e => strategyGrading(e)?.grade !== "B−").map(e => parseBossProfile(e["boss_profile"])).filter((v): v is PublishedBossProfile => v !== null && [id, parts.join("+")].includes(v.boss));
    const countsText = (v: NonNullable<PublishedBossProfile["own"]>) => `首${v.first ?? "?"}/胜${v.won ?? "?"}/死${v.died ?? "?"}/预截${v.predicted_stop ?? "?"}/未知${v.unknown ?? "?"}/重试${v.retries ?? "?"}`;
    const published = profiles.length === 1 ? profiles[0] : undefined;
    const ownCounters = bossOwnCounters(record, published);
    return { id, act, parts, aliases: [id, parts.join("+"), ...parts.flatMap(p => [p, db.monsters[p]?.name?.zh ?? ""])].filter(Boolean), hp: facts.hp, mechanics: facts.tokens,
      own: bossOwnCounterText(ownCounters), ownCounters, publishedMechanisms: publishedBossMechanisms(matches),
      external: published?.external.length ? published.external.map(e => `EK[${e.source}/${e.game_version}/上传]${countsText(e.counts)}`).join(";")
        : typeof ext?.["gross_damage_p90"] === "number" ? `E伤p90=${amount(ext["gross_damage_p90"])}(n${ext["gross_damage_n"] ?? "?"})` : "Eunknown",
      strategies: matches.map(e => str(e["id"])), profiles,
    };
  });
  const data = { rows, pairs, sources, knowledgeVersion, setupMs: performance.now() - started };
  cache.set(key, data); if (cache.size > 4) cache.delete(cache.keys().next().value!);
  return data;
}
