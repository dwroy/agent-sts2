/**
 * Which bosses the whole-fight simulator is trusted on (B4, docs/boss-sim.md §13), from its validation numbers: the data
 * file boss-trust.json next to this module, written by tools/boss-sim/trust.py from the validation backtest (the
 * criteria, each boss's numbers and the two lists). B2 (boss-lines LOW_TRUST_BOSSES: the line numbers from turn 1) judges
 * a boss on its turn-1 numbers, B3 (build-sim-facts LOW_CONFIDENCE: the build questions' pre-fight start) on its pre-fight
 * ones. A boss fails on too few validation fights, a calibrated Brier over 1.25x the overall one, a mean forecast more
 * than 15 points off its win rate, or HP through block outside 0.7-1.3x the log's; the reason says which.
 */
import { readFileSync } from "node:fs";
import { KNOWLEDGE_DIR, knowledgeCharacter, knowledgeFile, onKnowledgeCharacterChange } from "../knowledge/files.js";

export interface BossTrustData {
  character?: string;
  overall?: Record<string, { platt?: { a: number; b: number; c?: number } | null }>;
  ascension_low?: Record<string, Record<string, string>>;
  criteria: { min_fights: number; brier_ratio: number; max_gap: number; leak_range: [number, number]; starts: Record<string, string> };
  /** Boss key (boss-lines bossKeyOf, boss-start bossKey) -> why its B2 numbers are information only (English). */
  low_trust_b2: Record<string, string>;
  /** Boss key -> why its B3 numbers are low confidence (Chinese, as the build questions' facts). */
  low_confidence_b3: Record<string, string>;
}

/** Every boss the simulator knows (the fallback when the data file cannot be read: all of them low trust). */
export const BOSS_KEYS = [
  "AEONGLASS", "CEREMONIAL_BEAST", "KAISER_CRAB", "KNOWLEDGE_DEMON", "LAGAVULIN_MATRIARCH", "QUEEN", "SOUL_FYSH",
  "TEST_SUBJECT", "THE_INSATIABLE", "THE_KIN", "VANTOM", "WATERFALL_GIANT",
] as const;

/** The run's character's trust data file (a character never validated has none: every boss low trust). */
export function bossTrustPath(): string {
  return knowledgeFile(KNOWLEDGE_DIR, "boss-trust.json");
}

/** The path when this module loaded (the character then in effect). */
export const BOSS_TRUST_PATH = bossTrustPath();

/** The trust data at `path`, or null when it cannot be read. */
export function loadBossTrust(path = bossTrustPath()): BossTrustData | null {
  try {
    const data = JSON.parse(readFileSync(path, "utf8")) as Partial<BossTrustData>;
    if (knowledgeCharacter() === "silent" && data.character !== "silent") return null;
    if (data.character && data.character !== knowledgeCharacter()) return null;
    return data.low_trust_b2 && data.low_confidence_b3 && data.criteria ? (data as BossTrustData) : null;
  } catch {
    return null;
  }
}

/** B2's low-trust bosses and why (English): the data file's, or every boss when it is missing. */
export const LOW_TRUST_B2: Record<string, string> = {};

/** B3's low-confidence bosses and why (Chinese): the data file's, or every boss when it is missing. */
export const LOW_CONFIDENCE_B3: Record<string, string> = {};
let activeTrust: BossTrustData | null = null;

/** Silent's own calibration only; no fallback to another character's parameters. */
export function silentBossCalibration(start: "start" | "mid" | "pre"): { a: number; b: number; c?: number } | null {
  if (knowledgeCharacter() !== "silent") return null;
  const fit = activeTrust?.overall?.[start === "pre" ? "pre" : "t1"]?.platt;
  return fit && Number.isFinite(fit.a) && Number.isFinite(fit.b) && fit.b > 0
    && (fit.c === undefined || Number.isFinite(fit.c)) ? fit : null;
}

/** The consumer's overall and ascension-specific validation limitations. */
export function bossTrustReason(key: string, use: "b2" | "b3", asc?: number | null): string | null {
  const low = use === "b2" ? LOW_TRUST_B2 : LOW_CONFIDENCE_B3;
  const scope = asc == null ? null : activeTrust?.ascension_low?.[use]?.[String(asc)];
  return [low[key], scope].filter(Boolean).join("; ") || null;
}

/** Fills the two tables in place (other modules hold them by reference) from the current character's file. */
function fillTrust(): void {
  const trust = loadBossTrust();
  activeTrust = trust;
  for (const table of [LOW_TRUST_B2, LOW_CONFIDENCE_B3]) for (const key of Object.keys(table)) delete table[key];
  Object.assign(
    LOW_TRUST_B2,
    trust ? trust.low_trust_b2 : Object.fromEntries(BOSS_KEYS.map((key) => [key, "the simulator's validation data (src/sim/boss-trust.json) could not be read"])),
  );
  Object.assign(LOW_CONFIDENCE_B3, trust ? trust.low_confidence_b3 : Object.fromEntries(BOSS_KEYS.map((key) => [key, "模拟器的验证数据（src/sim/boss-trust.json）读不到"])));
  if (knowledgeCharacter() === "silent") {
    if (!silentBossCalibration("start")) Object.assign(LOW_TRUST_B2, Object.fromEntries(BOSS_KEYS.map((key) => [key, "Silent global calibration unavailable"])));
    if (!silentBossCalibration("pre")) Object.assign(LOW_CONFIDENCE_B3, Object.fromEntries(BOSS_KEYS.map((key) => [key, "静默整体校准不足"])));
  }
}

fillTrust();
onKnowledgeCharacterChange(fillTrust);
