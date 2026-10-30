/** Fixed decision projection. Claims and formal triggers are never clipped to fit. */
import type { StrategyEntry } from "../knowledge/strategy-entries.js";
import { strategyGrading } from "../knowledge/strategy-grading.js";

export const DECISION_VIEW_BYTES = 1900;
const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value));
const object = (value: any): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value : {};

export function strategyDecisionRule(entry: StrategyEntry): string {
 const g = strategyGrading(entry);
 if (!g) throw Error("ungraded decision projection");
 // The published strategy is a complete claim. Structured research tables remain in full JSON.
 if (g.evidence_type === "机制事实") return g.summary;
 const rule = entry.strategy;
 return (g.evidence_type === "同向对照关联" ? "同向对照关联，非因果：" : `${g.evidence_type}，非对照：`) + rule;
}
function denominator(entry: StrategyEntry): string {
 const e = entry as any, p = object(e.grading_population), r = object(e.review_observation);
 const source = String(p.source ?? e.source);
 const own = new Set(entry.evidence.filter(v => v.type !== "external_aggregate").map(v => (v as any).run)).size;
 if (e.evidence_type === "机制事实") return `${source}；自有引用去重局n=${own}（非总体）；胜数未知`;
 const picks = r.winner_pick_rates;
 if (picks) return `${source}；上传n=${p.n}；赢家提供${picks.winners.offered}/拿${picks.winners.picked}，败者提供${picks.losers.offered}/拿${picks.losers.picked}`;
 if (Array.isArray(p.arms)) return `${source}；各臂n/成功数=${p.arms.map((v: any) => `${v.n}/${v.successes ?? "未知"}`).join(",")}（原端点，非动作收益）`;
 const wins = p.complete_original_denominators?.external_primary?.wins ?? p.wins ?? p.statistic?.wins ?? "未知";
 return `${source}；n=${p.n ?? "未知"} ${p.unit ?? "原总体未知"}；胜数=${wins}`;
}
function counterexamples(entry: StrategyEntry): { count: number; examples: unknown[] } {
 const e = entry as any, r = object(e.review_observation);
 const raw = r.counterexamples ?? e.counterexamples ?? entry.evidence.filter(v => v.role === "contradict");
 const values = Array.isArray(raw) ? raw : Object.keys(object(raw)).length ? [raw] : [];
 return { count: values.length, examples: values.slice(0, 2).map((v: any, i: number) => bytes(v) <= 140 ? v
  : { full_index: i, ...Object.fromEntries(["run_id", "own_run", "run", "floor", "n"].filter(k => typeof v?.[k] === "number" || typeof v?.[k] === "string" && v[k].length <= 16).map(k => [k, v[k]])), details: "见全文反例" }) };
}
export function compactStrategyDecisionView(entry: StrategyEntry, source: string): { view?: Record<string, unknown>; rule_bytes: number; view_bytes: number; reason?: string } {
 const g = strategyGrading(entry);
 if (!g) throw Error("ungraded decision projection");
 const rule = strategyDecisionRule(entry), ruleBytes = Buffer.byteLength(rule);
 const view = { id: entry.id, document_source: source, representation: "compact_decision_view", grade: g.grade, category: g.category,
  evidence_type: g.evidence_type, confidence: entry.confidence, rule, trigger: entry.trigger,
  denominator: denominator(entry), counterexamples: counterexamples(entry),
  limitation: g.evidence_type === "机制事实" ? "仅原观察窗口事实，非普遍规律；形式触发不证明原条件全部成立，版本/反证细节见全文。"
   : "观察性非因果；外部上传非独立玩家，自有/外部分账；原条件、版本、SL与完整反证见全文。",
  full_document: { tool: "kb_strategies", input: { query: entry.id, detail: "full", document_id: entry.id } } };
 const viewBytes = bytes(view);
 if (ruleBytes > DECISION_VIEW_BYTES || viewBytes > DECISION_VIEW_BYTES) return { rule_bytes: ruleBytes, view_bytes: viewBytes,
  reason: ruleBytes > DECISION_VIEW_BYTES ? "rule_exceeds_1900" : "fixed_view_exceeds_1900" };
 return { view, rule_bytes: ruleBytes, view_bytes: viewBytes };
}
