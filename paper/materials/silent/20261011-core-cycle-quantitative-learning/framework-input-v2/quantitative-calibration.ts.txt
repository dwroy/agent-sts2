import { summarizeSamples } from "./quantitative-stats.js";

/** The extractor must establish these identities from actual decision/action/state logs. */
export interface PredictionIdentity {
  character: string;
  ascension: number;
  run: string;
  attempt: string;
  decision: string;
  fingerprint: string;
  option: string;
  metric: string;
  window: string;
  model: string;
}
export interface QuantitativePrediction extends PredictionIdentity {
  mean: number;
  p10: number | null;
  p90: number | null;
}
export interface QuantitativeObservation extends PredictionIdentity {
  value: number | null;
  evidence: string[];
  completed: boolean;
  followedPlan: boolean;
}

const identityFields = ["character", "ascension", "run", "attempt", "decision", "fingerprint", "option", "metric", "window", "model"] as const;

/** Replans, SL attempts, missing frames and unplayed options are not counterfactual outcomes. */
export function comparePrediction(prediction: QuantitativePrediction, observation: QuantitativeObservation): {
  status: "matched" | "unmatched"; reason?: string; error?: number; absoluteError?: number; insideEmpirical80?: boolean | null;
} {
  const mismatch = identityFields.filter((field) => (field !== "ascension" && (typeof prediction[field] !== "string" || !prediction[field])) || prediction[field] !== observation[field]);
  if (!Number.isSafeInteger(prediction.ascension) || prediction.ascension < 0) return { status: "unmatched", reason: "invalid ascension" };
  if (mismatch.length) return { status: "unmatched", reason: `identity: ${mismatch.join(",")}` };
  if (!observation.completed || !observation.followedPlan || !observation.evidence.length) return { status: "unmatched", reason: "incomplete window, changed plan, or missing evidence" };
  if (!Number.isFinite(prediction.mean) || observation.value === null || !Number.isFinite(observation.value)) return { status: "unmatched", reason: "missing finite prediction or observation" };
  const error = prediction.mean - observation.value;
  const low = prediction.p10;
  const high = prediction.p90;
  const interval = low !== null && high !== null && Number.isFinite(low) && Number.isFinite(high) && low <= high;
  return { status: "matched", error, absoluteError: Math.abs(error),
    insideEmpirical80: interval ? observation.value >= low && observation.value <= high : null };
}

/** Separate model/metric/window/character groups; never average across incompatible versions or quantities. */
export function calibrationSummary(rows: readonly { prediction: QuantitativePrediction; observation: QuantitativeObservation }[]) {
  const groups = new Map<string, { errors: number[]; intervals: number; covered: number }>();
  const excluded: { index: number; reason: string }[] = [];
  const seen = new Set<string>();
  rows.forEach(({ prediction, observation }, index) => {
    const key = JSON.stringify(identityFields.map((field) => prediction[field]));
    const result = comparePrediction(prediction, observation);
    if (result.status !== "matched") { excluded.push({ index, reason: result.reason! }); return; }
    if (seen.has(key)) { excluded.push({ index, reason: "duplicate prediction" }); return; }
    seen.add(key);
    const groupKey = JSON.stringify([prediction.character, prediction.ascension, prediction.model, prediction.metric, prediction.window]);
    const group = groups.get(groupKey) ?? { errors: [], intervals: 0, covered: 0 };
    group.errors.push(result.error!);
    if (result.insideEmpirical80 !== null) { group.intervals += 1; group.covered += Number(result.insideEmpirical80); }
    groups.set(groupKey, group);
  });
  return { groups: [...groups].map(([key, group]) => ({ key, n: group.errors.length,
    bias: summarizeSamples(group.errors).mean, mae: summarizeSamples(group.errors.map(Math.abs)).mean,
    rmse: Math.sqrt(group.errors.reduce((sum, e) => sum + e * e, 0) / group.errors.length),
    intervals: group.intervals, empirical80Coverage: group.intervals ? group.covered / group.intervals : null,
  })), excluded };
}
