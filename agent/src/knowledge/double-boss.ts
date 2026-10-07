/** Character-scoped evidence for a continuous two-boss objective; never inferred from ascension alone. */
import { readFileSync } from "node:fs";
import { asArray, asRecord, str } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { ContinuationValue } from "../reflex/continuation-value.js";
import { KNOWLEDGE_DIR, knowledgeCharacter, knowledgeFile } from "./files.js";

export interface DoubleBossModel {
  character: "silent";
  ascension: number;
  act: number;
  firstFloor: number;
  secondFloor: number;
  effect: string;
  evidence: { run: string; floor: number; turn?: number }[];
  value: ContinuationValue;
  potionHp: Record<string, number>;
  poisonPotionAmount: number;
  secondBosses: { boss: string; count: number }[];
  limitation: string;
}

export const doubleBossSource = { dir: KNOWLEDGE_DIR, enabled: true };
let cached: { path: string; model: DoubleBossModel | null } | undefined;

export function loadDoubleBossModel(): DoubleBossModel | null {
  if (!doubleBossSource.enabled || knowledgeCharacter() !== "silent") return null;
  const path = knowledgeFile(doubleBossSource.dir, "double-boss.json");
  if (cached?.path === path) return cached.model;
  let model: DoubleBossModel | null = null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as DoubleBossModel;
    if (raw.character === "silent" && raw.ascension === 10 && raw.act === 3 && raw.firstFloor === 48 && raw.secondFloor === 49
      && raw.effect === "LEVEL_10" && raw.evidence?.length > 0 && typeof raw.value?.source === "string"
      && raw.value.hp?.length > 1 && raw.value.hp.every(([x,y], i, xs) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0
        && (i === 0 || x > xs[i - 1]![0] && y >= xs[i - 1]![1]))
      && raw.secondBosses?.length > 0 && raw.secondBosses.every((b) => typeof b.boss === "string" && Number.isInteger(b.count) && b.count > 0)
      && raw.potionHp && Object.values(raw.potionHp).every((v) => Number.isFinite(v) && v >= 0)
      && Number.isFinite(raw.poisonPotionAmount) && raw.poisonPotionAmount > 0) model = raw;
  } catch { /* Missing or invalid character evidence leaves the existing objective intact. */ }
  cached = { path, model };
  return model;
}

/** The observed effect must also be present on this run. Other characters/levels retain their objective. */
export function doubleBossFor(state: GameState, model: DoubleBossModel | null = loadDoubleBossModel()): DoubleBossModel | null {
  const run = asRecord(state.run?.raw);
  if (!model || str(run["character_id"]).toLowerCase() !== model.character || state.run?.ascension !== model.ascension
    || Number(run["act_id"]) + 1 !== model.act || !asArray(run["ascension_effects"]).some((e) => str(asRecord(e)["id"]) === model.effect)) return null;
  return model;
}

export function firstDoubleBoss(state: GameState, model: DoubleBossModel | null = loadDoubleBossModel()): DoubleBossModel | null {
  const scoped = doubleBossFor(state, model);
  return scoped && state.run?.floor === scoped.firstFloor ? scoped : null;
}

/** Preparation facts stop before the first boss; a stale first-boss id after victory is never reused. */
export function doubleBossPreparation(state: GameState, model: DoubleBossModel | null = loadDoubleBossModel()): DoubleBossModel | null {
  const scoped = doubleBossFor(state, model);
  const floor = state.run?.floor;
  return scoped && floor != null && floor < scoped.firstFloor ? scoped : null;
}
