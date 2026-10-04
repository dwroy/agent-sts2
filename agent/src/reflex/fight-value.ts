/**
 * Fight value (knowledge/builders/build-fight-value.py -> knowledge/characters/ironclad/fight-value.json): what the logs say happens
 * after one of our turns ends, from the state at the END of our turn (after our plays, before the enemy
 * turn): further HP loss until the fight ends (the coming enemy turn included; a death counts all the HP
 * we had), the probability we win the fight, and the turns still to play.
 *
 * Used only through the rollout (rollout.ts): its terminal estimate, and the `history_estimate` fact shown to
 * Jev per combat option (rollout-live.ts: "further HP loss X, win Y%, similar states n=..."). It never ranks.
 *
 * The model is gradient-boosted trees over named features (the names in fight-value.json `features`,
 * computed by base_features() in the Python builder) plus monster/encounter target encodings. `n` is the
 * number of logged training turns in the most specific matching cell (encounter x enemy HP left x our HP),
 * falling back to fight kind x act; `confidence` = n / (n + k).
 */

import { readFileSync } from "node:fs";
import { KNOWLEDGE_DIR, knowledgeFile } from "../knowledge/files.js";

/** A tree node: [featureIndex, threshold, left (x < threshold), right] or a leaf value. */
export type TreeNode = number | [number, number, TreeNode, TreeNode];

export interface GbmModel {
  loss: "l2" | "logloss";
  base: number;
  lr: number;
  trees: TreeNode[];
}

export interface TargetEncoder {
  prior: number;
  k: number;
  /** id -> [shrunk mean, n] */
  monster: Record<string, [number, number]>;
  encounter: Record<string, [number, number]>;
}

export interface FightValueModel {
  features: string[];
  gbm: { hp_loss: GbmModel; win: GbmModel; turns: GbmModel };
  encoders: { loss: TargetEncoder; win: TargetEncoder };
  /** Support table: "e|<encounter>|<ehp>|<php>" and "k|<kind>|<act>|<ehp>|<php>" -> [mean hp_loss, n]. */
  support: { k: number; hp_loss: Record<string, [number, number]> };
}

export interface FightValueFeatures {
  /** Named base features of the end-of-turn state (hp, max_hp, hp_frac, block, enemy_hp_sum, ...). */
  features: Record<string, number>;
  /** Ids of the living enemies (minions included). */
  enemyIds: string[];
  /** The fight's initial enemy ids, sorted, joined with "+". */
  encounter: string;
  kind: "hallway" | "elite" | "boss";
  act: number;
}

export interface FightValue {
  /** Expected further HP loss until the fight ends. */
  hpLoss: number;
  /** Probability of winning the fight. */
  winProb: number;
  /** Expected turns after this one. */
  turns: number;
  /** Logged training turns in the matching cell. */
  n: number;
  /** n / (n + k), 0..1. */
  confidence: number;
}

let cached: FightValueModel | null | undefined;

/** The committed model, or null when the file is missing or unreadable. */
export function loadFightValueModel(): FightValueModel | null {
  if (cached !== undefined) return cached;
  try {
    const path = knowledgeFile(KNOWLEDGE_DIR, "fight-value.json");
    cached = JSON.parse(readFileSync(path, "utf8")) as FightValueModel;
  } catch {
    cached = null;
  }
  return cached;
}

function gbmRaw(model: GbmModel, x: number[]): number {
  let total = model.base;
  for (const tree of model.trees) {
    let node: TreeNode = tree;
    while (typeof node !== "number") node = (x[node[0]] ?? 0) < node[1] ? node[2] : node[3];
    total += model.lr * node;
  }
  return total;
}

function gbmPredict(model: GbmModel, x: number[]): number {
  const raw = gbmRaw(model, x);
  return model.loss === "logloss" ? 1 / (1 + Math.exp(-raw)) : raw;
}

function encode(encoder: TargetEncoder, input: FightValueFeatures): Record<string, number> {
  const values = input.enemyIds.map((id) => encoder.monster[id]?.[0] ?? encoder.prior);
  return {
    mon_te_max: values.length > 0 ? Math.max(...values) : encoder.prior,
    mon_te_sum: values.reduce((sum, v) => sum + v, 0),
    enc_te: encoder.encounter[input.encounter]?.[0] ?? encoder.prior,
  };
}

/** The table cells the Python builder counts (Table.keys), most specific last. */
export function supportKeys(input: FightValueFeatures): string[] {
  const ehp = Math.min(4, Math.floor((input.features["enemy_hp_frac"] ?? 0) * 5));
  const php = Math.min(3, Math.floor((input.features["hp_frac"] ?? 0) * 4));
  return [`k|${input.kind}|${input.act}|${ehp}|${php}`, `e|${input.encounter}|${ehp}|${php}`];
}

/** Pure: the model's estimate for one end-of-turn state. Missing features count as 0. */
export function valueOf(input: FightValueFeatures, model: FightValueModel | null = loadFightValueModel()): FightValue | null {
  if (!model) return null;
  const named: Record<string, number> = { ...input.features };
  for (const [k, v] of Object.entries(encode(model.encoders.loss, input))) named[`loss_${k}`] = v;
  for (const [k, v] of Object.entries(encode(model.encoders.win, input))) named[`win_${k}`] = v;
  const x = model.features.map((name) => named[name] ?? 0);
  let n = 0;
  for (const key of supportKeys(input)) {
    const cell = model.support.hp_loss[key];
    if (cell && cell[1] > 0) n = cell[1];
  }
  if (input.features["n_living"] === 0) return { hpLoss: 0, winProb: 1, turns: 0, n, confidence: n / (n + model.support.k) };
  return {
    hpLoss: Math.max(0, gbmPredict(model.gbm.hp_loss, x)),
    winProb: gbmPredict(model.gbm.win, x),
    turns: Math.max(0, gbmPredict(model.gbm.turns, x)),
    n,
    confidence: n / (n + model.support.k),
  };
}
