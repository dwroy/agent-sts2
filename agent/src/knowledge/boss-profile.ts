/** #83 handoff inside an ordinary published strategy document; drafts are never runtime inputs. */
import { asRecord } from "../core/util/json.js";

export interface BossAttemptCounts {
  first: number | null;
  won: number | null;
  died: number | null;
  predicted_stop: number | null;
  unknown: number | null;
  retries: number | null;
}
export interface PublishedBossProfile {
  schema: "boss-profile-v1";
  boss: string;
  character: "silent";
  ascension: 10;
  game_version: string;
  cutoff: string;
  own: BossAttemptCounts | null;
  external: Array<{ source: string; game_version: string; unit: "uploaded_attempts"; counts: BossAttemptCounts; dataset_sha256: string }>;
  evidence_refs: string[];
  limitations: string[];
}

export function parseBossProfile(value: unknown): PublishedBossProfile | null {
  const p = asRecord(value);
  const count = (v: unknown) => v === null || Number.isSafeInteger(v) && Number(v) >= 0;
  const counts = (v: unknown): boolean => {
    const c = asRecord(v), keys = ["first", "won", "died", "predicted_stop", "unknown", "retries"];
    if (Object.keys(c).length !== keys.length || !keys.every(k => count(c[k]))) return false;
    const outcomes = [c["won"], c["died"], c["predicted_stop"], c["unknown"]];
    const known = outcomes.reduce<number>((n, v) => n + Number(v), 0);
    return c["first"] === null || known <= Number(c["first"]) && (outcomes.some(v => v === null) || known === c["first"]);
  };
  if (p["schema"] !== "boss-profile-v1" || !/^[A-Z][A-Z0-9_+]*$/.test(String(p["boss"] ?? ""))
    || p["character"] !== "silent" || p["ascension"] !== 10 || typeof p["game_version"] !== "string" || !p["game_version"].trim()
    || typeof p["cutoff"] !== "string" || !Number.isFinite(Date.parse(p["cutoff"])) || p["own"] !== null && !counts(p["own"])
    || !Array.isArray(p["external"]) || !p["external"].every(v => {
      const e = asRecord(v);
      return /^external:\S+$/.test(String(e["source"] ?? "")) && typeof e["game_version"] === "string" && !!e["game_version"].trim()
        && e["unit"] === "uploaded_attempts" && /^[a-f0-9]{64}$/.test(String(e["dataset_sha256"] ?? "")) && counts(e["counts"]);
    }) || !Array.isArray(p["evidence_refs"]) || !p["evidence_refs"].length || !p["evidence_refs"].every(v => typeof v === "string" && v.trim())
    || !Array.isArray(p["limitations"]) || !p["limitations"].length || !p["limitations"].every(v => typeof v === "string" && v.trim())) return null;
  return p as unknown as PublishedBossProfile;
}
