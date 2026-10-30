/** Learner-authored decision context. Review drafts are never gameplay documents. */
export const DECISION_CONTEXT_SCHEMA = "decision-context-v1";
export const DECISION_CONTEXT_FILE = "characters/silent/decision-context.json";
export const DECISION_POINTS = ["选牌", "商店", "升级", "删牌", "开局", "幕复核", "Boss入场", "路线", "营火", "事件", "用药"] as const;
export type DecisionPoint = typeof DECISION_POINTS[number];
export type ContextValue = null | boolean | number | string | ContextValue[] | { [key: string]: ContextValue };
export interface ContextConditions {
  character: "silent";
  ascensions: number[];
  acts?: number[];
  floors?: number[];
  game_versions?: string[];
  bosses?: string[];
  candidate_ids?: string[];
  deck_cards?: { id: string; min: number }[];
  archetype?: { model_sha256: string; version: string; clusters: number[] };
  /** Exact current observable values, for conditions more specific than deck/Boss identity. */
  observed?: { path: string; equals: ContextValue }[];
}
export type ContextEvidence = {
  type: "own_run"; run_id: string; floor: number; offset: number; length: number; sha256: string;
  role: "support" | "contradict";
} | {
  type: "external_aggregate"; source: string; url: string; version: string; downloaded_at: string;
  sha256: string; filters: string; denominator: { unit: string; n: number }; role: "support" | "contradict";
};
export interface DecisionContextEntry {
  id: string;
  dimension: string;
  status: "active" | "retired";
  triggers: DecisionPoint[];
  conditions: ContextConditions;
  /** Explicit display priority, never an inferred card score. */
  priority: number;
  summary: string;
  rule_candidate: string;
  confidence: number;
  denominators: ContextValue;
  evidence_refs: ContextEvidence[];
  counterexamples: ContextValue[];
  limitations: string[];
  conflicts_with: ContextValue[];
  /** Preserve the reviewed candidate's original conditions; no prose-to-predicate conversion. */
  review_origin: { schema: "issue80-review-candidates-v1"; id: string; sha256: string; conditions: ContextValue };
  /** Optional structured tables/checkpoints/HP targets; their meaning is learner-owned. */
  details?: ContextValue;
}
export interface DecisionContextDocument {
  schema: typeof DECISION_CONTEXT_SCHEMA;
  character: "silent";
  status: "published";
  entries: DecisionContextEntry[];
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const only = (v: Record<string, unknown>, keys: readonly string[]) => Object.keys(v).every(k => keys.includes(k));
const text = (v: unknown): v is string => typeof v === "string" && !!v.trim();
const texts = (v: unknown, max = 100): v is string[] => Array.isArray(v) && v.length > 0 && v.length <= max && v.every(text) && new Set(v).size === v.length;
const ints = (v: unknown, min: number, max: number): v is number[] => Array.isArray(v) && v.length > 0 && v.length <= 100 && v.every(n => Number.isSafeInteger(n) && n >= min && n <= max) && new Set(v).size === v.length;
const sha = (v: unknown) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const value = (v: unknown, depth = 0): v is ContextValue => depth <= 20 && (v === null || typeof v === "boolean" || typeof v === "number" && Number.isFinite(v)
  || typeof v === "string" || Array.isArray(v) && v.every(x => value(x, depth + 1)) || object(v) && Object.values(v).every(x => value(x, depth + 1)));

export function parseDecisionContext(raw: unknown): DecisionContextDocument {
  if (!object(raw) || !only(raw, ["schema", "character", "status", "entries"]) || raw["schema"] !== DECISION_CONTEXT_SCHEMA
    || raw["character"] !== "silent" || raw["status"] !== "published" || !Array.isArray(raw["entries"]) || raw["entries"].length > 2000) throw Error("invalid decision context document");
  const ids = new Set<string>();
  for (const e of raw["entries"]) {
    if (!object(e) || !only(e, ["id", "dimension", "status", "triggers", "conditions", "priority", "summary", "rule_candidate", "confidence", "denominators", "evidence_refs", "counterexamples", "limitations", "conflicts_with", "review_origin", "details"])
      || !text(e["id"]) || !/^[a-zA-Z0-9_.:-]{1,160}$/.test(e["id"]) || ids.has(e["id"]) || !text(e["dimension"]) || !["active", "retired"].includes(String(e["status"]))
      || !texts(e["triggers"], DECISION_POINTS.length) || !e["triggers"].every(t => (DECISION_POINTS as readonly string[]).includes(t))
      || !Number.isSafeInteger(e["priority"]) || Number(e["priority"]) < 0 || Number(e["priority"]) > 100
      || !text(e["summary"]) || !text(e["rule_candidate"]) || typeof e["confidence"] !== "number" || !Number.isFinite(e["confidence"]) || e["confidence"] < 0 || e["confidence"] > 1
      || !(object(e["denominators"]) || Array.isArray(e["denominators"])) || !Object.keys(e["denominators"]).length || !value(e["denominators"])
      || !Array.isArray(e["counterexamples"]) || !value(e["counterexamples"]) || !Array.isArray(e["conflicts_with"]) || !value(e["conflicts_with"])
      || !texts(e["limitations"]) || e["details"] !== undefined && !value(e["details"])) throw Error("invalid decision context entry");
    ids.add(e["id"]);
    const c = e["conditions"];
    if (!object(c) || !only(c, ["character", "ascensions", "acts", "floors", "game_versions", "bosses", "candidate_ids", "deck_cards", "archetype", "observed"])
      || c["character"] !== "silent" || !ints(c["ascensions"], 0, 20)
      || c["acts"] !== undefined && !ints(c["acts"], 1, 3) || c["floors"] !== undefined && !ints(c["floors"], 1, 1000)
      || ["game_versions", "bosses", "candidate_ids"].some(k => c[k] !== undefined && !texts(c[k]))
      || c["deck_cards"] !== undefined && (!Array.isArray(c["deck_cards"]) || !c["deck_cards"].length || c["deck_cards"].length > 100
        || !c["deck_cards"].every(d => object(d) && only(d, ["id", "min"]) && text(d["id"]) && Number.isSafeInteger(d["min"]) && Number(d["min"]) > 0))) throw Error("invalid decision context conditions");
    const a = c["archetype"];
    if (a !== undefined && (!object(a) || !only(a, ["model_sha256", "version", "clusters"]) || !sha(a["model_sha256"]) || !text(a["version"]) || !ints(a["clusters"], 0, 9))) throw Error("invalid decision context archetype");
    const observed = c["observed"];
    if (observed !== undefined && (!Array.isArray(observed) || !observed.length || observed.length > 100
      || !observed.every(o => object(o) && only(o, ["path", "equals"]) && text(o["path"])
        && /^(?:payload\.(?:facts|fight_state|run_state|run_plan_task|run_brief)|state\.(?:run|combat))\.[a-zA-Z0-9_.]+$/.test(o["path"])
        && o["path"].split(".").length <= 12 && !o["path"].split(".").some(k => ["__proto__", "constructor", "prototype"].includes(k)) && value(o["equals"])))) throw Error("invalid decision context observed condition");
    const origin = e["review_origin"];
    if (!object(origin) || !only(origin, ["schema", "id", "sha256", "conditions"]) || origin["schema"] !== "issue80-review-candidates-v1"
      || !text(origin["id"]) || !sha(origin["sha256"]) || !value(origin["conditions"])) throw Error("invalid decision context review origin");
    const refs = e["evidence_refs"];
    if (!Array.isArray(refs) || !refs.length || refs.length > 10000) throw Error("missing decision context evidence");
    for (const r of refs) {
      if (!object(r) || !sha(r["sha256"]) || !["support", "contradict"].includes(String(r["role"]))) throw Error("invalid decision context evidence");
      if (r["type"] === "own_run") {
        if (!only(r, ["type", "run_id", "floor", "offset", "length", "sha256", "role"]) || !text(r["run_id"])
          || !Number.isSafeInteger(r["floor"]) || Number(r["floor"]) <= 0 || !Number.isSafeInteger(r["offset"]) || Number(r["offset"]) < 0
          || !Number.isSafeInteger(r["length"]) || Number(r["length"]) <= 0) throw Error("invalid decision context own evidence");
      } else if (r["type"] === "external_aggregate") {
        const d = r["denominator"];
        if (!only(r, ["type", "source", "url", "version", "downloaded_at", "sha256", "filters", "denominator", "role"])
          || !text(r["source"]) || !r["source"].startsWith("external:") || !text(r["url"]) || !/^https:\/\//.test(r["url"])
          || !text(r["version"]) || !text(r["filters"]) || !text(r["downloaded_at"]) || !/^\d{4}-\d{2}-\d{2}$/.test(r["downloaded_at"])
          || !object(d) || !only(d, ["unit", "n"]) || !text(d["unit"]) || !Number.isSafeInteger(d["n"]) || Number(d["n"]) <= 0) throw Error("invalid decision context external evidence");
      } else throw Error("unknown decision context evidence type");
    }
  }
  return raw as unknown as DecisionContextDocument;
}
