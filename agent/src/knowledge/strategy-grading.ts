/** Explicit content grading; no classification is inferred from names or prose. */
import { createHash } from "node:crypto";

export const STRATEGY_CATEGORIES = ["构筑组合", "Boss打法", "路线资源", "其他决策", "单牌选牌"] as const;
export interface StrategyGrading {
  schema: "strategy-grading-v1";
  grade: "A" | "B+" | "B−";
  category: typeof STRATEGY_CATEGORIES[number];
  evidence_type: "同向对照关联" | "单臂统计" | "赢家做法" | "机制事实" | "原观察/策略（仅引用）";
  summary: string;
  single_observation_window: boolean;
  basis: { checkpoint_sha256: string; original_entry_sha256: string; assessment_sha256: string };
}
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const canonical = (v: any): string => Array.isArray(v) ? `[${v.map(canonical).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}` : JSON.stringify(v);
export const gradingDigest = (v: StrategyGrading) => createHash("sha256").update(canonical(v)).digest("hex");
export function strategyGrading(value: unknown): StrategyGrading | null {
  if (!object(value) || !object(value.grading)) return null;
  const g = value.grading;
  if (g.schema !== "strategy-grading-v1" || !["A", "B+", "B−"].includes(g.grade)
    || !(STRATEGY_CATEGORIES as readonly unknown[]).includes(g.category)
    || !["同向对照关联", "单臂统计", "赢家做法", "机制事实", "原观察/策略（仅引用）"].includes(g.evidence_type)
    || typeof g.summary !== "string" || !g.summary.trim() || typeof g.single_observation_window !== "boolean"
    || !object(g.basis) || !["checkpoint_sha256", "original_entry_sha256", "assessment_sha256"].every(k => /^[a-f0-9]{64}$/.test(g.basis[k] ?? ""))) return null;
  if (g.evidence_type === "机制事实") {
    if (g.grade !== "B+" || value.confidence !== null || value.evidence_type !== "机制事实"
      || !g.summary.startsWith("机制事实（已从原件复核）") || g.single_observation_window && !g.summary.includes("单次观察窗口")) return null;
  } else if (typeof value.confidence !== "number" || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1
    || g.grade === "B+" && (value.confidence > .35 || !g.summary.includes("非对照"))) return null;
  return g as StrategyGrading;
}
export function formallyGraded(value: unknown): boolean {
  const g = strategyGrading(value);
  if (!g || !object(value)) return false;
  const p = value.formal_publication;
  return object(p) && p.schema === "strategy-publication-v1" && p.status === "published"
    && /^https:\/\/github\.com\/dwroy\/agent-sts2\/issues\/85#issuecomment-\d+$/.test(p.authorization ?? "")
    && p.grading_sha256 === gradingDigest(g);
}
export function gradedBodyEligible(value: unknown): boolean {
  return formallyGraded(value) && strategyGrading(value)!.grade !== "B−";
}
export function compareGradedStrategies(a: unknown, b: unknown): number {
  const x = strategyGrading(a), y = strategyGrading(b);
  if (!x || !y) return x ? -1 : y ? 1 : 0;
  const tier = (g: StrategyGrading) => g.grade === "A" ? 0 : g.grade === "B−" ? 3 : g.evidence_type === "机制事实" ? 2 : 1;
  const category = STRATEGY_CATEGORIES.indexOf(x.category) - STRATEGY_CATEGORIES.indexOf(y.category);
  if (category || tier(x) !== tier(y)) return category || tier(x) - tier(y);
  // Mechanism facts have no numeric confidence; their next key is trigger specificity.
  return x.evidence_type === "机制事实" ? 0 : Number((b as any).confidence) - Number((a as any).confidence);
}
