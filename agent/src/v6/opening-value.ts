/** Portable whole-fight predictor. Feature definitions mirror opening_value.py. */
import { readFileSync } from "node:fs";
import { asArray, asRecord, bool, num, str } from "../core/util/json.js";

export type FightKind = "hallway" | "elite" | "boss";
export interface OpeningInput {
  hp: number; max_hp: number; max_energy: number; ascension: number; act: number; floor: number;
  deck: Record<string, unknown>[]; relics: string[]; potions: string[];
}
type Tree = number | [number, number, Tree, Tree];
export interface OpeningModel {
  schema: "opening-value-v1"; character: string; model_id: string; features: string[];
  models: Record<"hp_loss" | "win" | "turns", { loss: string; base: number; lr: number; trees: Tree[] }>;
  catalog: Record<string, Record<string, unknown>>;
  encounters: Record<string, { id: string; kind: FightKind; n: number; runs: number; weight: number; floor_mean: number; boss_ids: string[] }[]>;
  remaining: Record<string, Record<FightKind, number>>;
  errors: Record<string, { n: number; runs: number; hp_rmse: number; hp_mae: number; turns_mae: number; win_brier: number }>;
  limitations: string[];
}
export const openingCardKey = (c: Record<string, unknown>) => str(c.card_id) + (bool(c.upgraded) ? "+" : "");
export function openingDescriptor(c: Record<string, unknown>): Record<string, number> {
  const values: Record<string, number> = { count: 1, upgraded: Number(bool(c.upgraded)), cost: num(c.energy_cost), x_cost: Number(bool(c.costs_x)) };
  values[`type:${str(c.card_type, "unknown")}`] = 1;
  for (const raw of asArray(c.dynamic_values)) {
    const value = asRecord(raw), name = str(value.name);
    if (name) values[`dynamic:${name}`] = (values[`dynamic:${name}`] ?? 0) + num(value.current_value);
  }
  const text = (str(c.rules_text) || str(c.resolved_rules_text)).toLowerCase();
  for (const [key, regex] of [["poison", /poison|中毒/g], ["discard", /discard|丢弃|弃牌/g], ["shiv", /shiv|小刀/g],
    ["draw", /draw|抽[\p{L}\p{N}_]*张|抽牌/gu], ["exhaust", /exhaust|消耗/g], ["retain", /retain|保留/g]] as const) values[`text:${key}`] = [...text.matchAll(regex)].length;
  return values;
}
export function openingFeatures(input: OpeningInput, encounter: string, kind: FightKind, names: string[]): number[] {
  const { deck, relics, potions, ...base } = input;
  const values: Record<string, number> = { ...base, hp_fraction: input.hp / Math.max(1, input.max_hp), relic_count: relics.length, potion_count: potions.length };
  const totals: Record<string, number> = {};
  for (const card of deck) {
    for (const [key, value] of Object.entries(openingDescriptor(card))) totals[key] = (totals[key] ?? 0) + value;
    const key = `card:${openingCardKey(card)}`; values[key] = (values[key] ?? 0) + 1;
  }
  for (const [key, value] of Object.entries(totals)) {
    values[`deck:${key}`] = value;
    if (key !== "count") values[`per_card:${key}`] = value / Math.max(1, deck.length);
  }
  for (const id of relics) values[`relic:${id}`] = 1;
  for (const id of potions) values[`potion:${id}`] = 1;
  values[`encounter:${encounter}`] = 1; values[`kind:${kind}`] = 1;
  return names.map(key => values[key] ?? 0);
}
export function predictOpening(model: OpeningModel, input: OpeningInput, encounter: string, kind: FightKind) {
  const features = openingFeatures(input, encounter, kind, model.features);
  const leaf = (tree: Tree): number => { while (Array.isArray(tree)) tree = features[tree[0]]! < tree[1] ? tree[2] : tree[3]; return tree; };
  const predict = (name: keyof OpeningModel["models"]) => {
    const m = model.models[name], raw = m.base + m.lr * m.trees.reduce<number>((sum, tree) => sum + leaf(tree), 0);
    return m.loss === "logloss" ? 1 / (1 + Math.exp(-Math.max(-35, Math.min(35, raw)))) : raw;
  };
  return { hp_loss: Math.max(0, Math.min(input.hp, predict("hp_loss"))), win: predict("win"), turns: Math.max(1, predict("turns")) };
}
/** Character-owned packets only. Missing/corrupt packets never fall back to another role. */
export function loadOpeningModel(path: string, character: string): OpeningModel | null {
  try {
    const bytes = readFileSync(path); if (bytes.byteLength > 16_000_000) return null;
    const value = JSON.parse(bytes.toString("utf8")) as OpeningModel;
    if (value.schema !== "opening-value-v1" || value.character !== character || !value.model_id
      || !Array.isArray(value.features) || value.features.length > 5000 || !value.features.every(f => typeof f === "string")
      || new Set(value.features).size !== value.features.length) return null;
    let nodes = 0;
    const validTree = (t: Tree, depth = 0): boolean => {
      if (++nodes > 500_000 || depth > 16) return false;
      return typeof t === "number" ? Number.isFinite(t) : Array.isArray(t) && t.length === 4 && Number.isInteger(t[0])
        && t[0] >= 0 && t[0] < value.features.length && Number.isFinite(t[1]) && validTree(t[2], depth + 1) && validTree(t[3], depth + 1);
    };
    for (const key of ["hp_loss", "win", "turns"] as const) {
      const m = value.models?.[key];
      if (!m || !Number.isFinite(m.base) || !Number.isFinite(m.lr) || !Array.isArray(m.trees) || m.trees.length > 1000
        || !m.trees.every(t => validTree(t)) || m.loss !== (key === "win" ? "logloss" : "l2")) return null;
    }
    const nonnegative = (n: number) => Number.isFinite(n) && n >= 0;
    for (const rows of Object.values(value.encounters)) {
      if (!Array.isArray(rows)) return null;
      for (const row of rows) if (!row.id || !["hallway", "elite", "boss"].includes(row.kind)
        || !nonnegative(row.weight) || !nonnegative(row.floor_mean) || !nonnegative(row.n) || !nonnegative(row.runs)
        || !Array.isArray(row.boss_ids) || !row.boss_ids.every(id => typeof id === "string")) return null;
    }
    for (const counts of Object.values(value.remaining)) for (const kind of ["hallway", "elite", "boss"] as const)
      if (!nonnegative(counts[kind])) return null;
    if (!value.errors?.all) return null;
    for (const error of Object.values(value.errors)) if (![error.hp_rmse, error.hp_mae, error.turns_mae, error.win_brier, error.n, error.runs].every(nonnegative)) return null;
    if (!value.catalog || !Object.values(value.catalog).every(c => c && typeof c === "object" && typeof c.card_id === "string")
      || !Array.isArray(value.limitations) || !value.limitations.every(label => typeof label === "string")) return null;
    return value;
  } catch { return null; }
}
