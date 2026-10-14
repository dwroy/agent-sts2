/** Published calibration is metric-specific. A signature gate never certifies a functional core or a win rate. */
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { KNOWLEDGE_DIR, knowledgeFile } from "../knowledge/files.js";
import { asRecord } from "../core/util/json.js";
import type { CoreTemplate } from "./types.js";

export const CONSTRUCTION_MODEL = "observed-opportunity-window4-v1";
export const CONSTRUCTION_POLICY = "completion-choice-v1";
export const CONSTRUCTION_ADMISSION = { independentRuns: 10, maxAbsoluteBias: 0.1 } as const;
export function constructionTemplateDigest(templates: readonly CoreTemplate[]): string {
  return createHash("sha256").update(JSON.stringify(templates)).digest("hex");
}
let cached: { file: string; stamp: string; value: unknown } | undefined;
export function loadConstructionCalibration(character: string): unknown {
  if (character !== "silent") return null;
  try {
    const file = knowledgeFile(KNOWLEDGE_DIR, "construction-calibration.json", character), stat = statSync(file);
    const stamp = `${stat.mtimeMs}:${stat.size}`;
    if (cached?.file === file && cached.stamp === stamp) return cached.value;
    const value: unknown = JSON.parse(readFileSync(file, "utf8")); cached = { file, stamp, value }; return value;
  } catch { return null; }
}

/** The original ops publishes an evidence-backed calibration report; a lone passed flag is insufficient. */
export function constructionAdmission(raw: unknown, templates: readonly CoreTemplate[], ascension: number, horizon: number, asOf: string) {
  const report = asRecord(raw), publication = asRecord(report.publication);
  const rejected = (reason: string) => ({ admitted: [] as string[], reason, metric: "conditionalSignature" });
  if (report.schema !== "construction-calibration-v1" || publication.authorized_by !== "ops"
    || publication.kind !== "prospective-logged-decisions" || publication.character !== "silent"
    || publication.ascension !== ascension || publication.template_sha256 !== constructionTemplateDigest(templates)
    || !/^[a-f0-9]{64}$/.test(String(report.input_sha256)) || publication.evidence_sha256 !== report.input_sha256
    || typeof publication.accepted_at !== "string" || !Number.isFinite(Date.parse(publication.accepted_at))
    || !Number.isFinite(Date.parse(asOf)) || Date.parse(publication.accepted_at) > Date.parse(asOf)) return rejected("missing_or_mismatched_prospective_calibration");
  const groups = Array.isArray(report.groups) ? report.groups.map(asRecord) : [];
  const admitted = templates.filter((core) => core.ascensions.includes(ascension) && groups.some((g) => g.character === "silent" && g.core === core.id
    && g.ascension === ascension && g.template_sha256 === publication.template_sha256
    && g.metric === "conditionalSignature" && g.horizon === horizon && g.model === CONSTRUCTION_MODEL && g.policy === CONSTRUCTION_POLICY
    && Number.isSafeInteger(g.independent_runs) && Number(g.independent_runs) >= CONSTRUCTION_ADMISSION.independentRuns
    && Number.isSafeInteger(g.n) && Number(g.n) >= Number(g.independent_runs)
    && Number.isSafeInteger(g.positives) && Number.isSafeInteger(g.negatives)
    && Number(g.positives) > 0 && Number(g.negatives) > 0 && Number(g.positives) + Number(g.negatives) === g.n
    && typeof g.brier === "number" && Number.isFinite(g.brier) && g.brier >= 0
    && typeof g.baseline_brier === "number" && Number.isFinite(g.baseline_brier) && g.brier < g.baseline_brier
    && typeof g.bias === "number" && Number.isFinite(g.bias) && Math.abs(g.bias) <= CONSTRUCTION_ADMISSION.maxAbsoluteBias)).map((c) => c.id);
  return { admitted, reason: admitted.length ? null : "insufficient_calibration_support_or_skill", metric: "conditionalSignature" };
}
