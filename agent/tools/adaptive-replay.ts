/** C2 offline prefix replay: consumes saved samples only; no simulator, model API or game actions. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { adaptiveShadow, type AdaptiveCandidate } from "../src/sim/adaptive-shadow.js";

export interface FrozenAdaptiveQuestion {
  id: string; source: { path: string; sha256: string }; lane: "b2" | "b3";
  requested: number; allowS: boolean; candidates: AdaptiveCandidate[];
  /** Explicitly limited exports cannot silently stand in for full question reconstruction. */
  limitation?: string;
}
export function replayAdaptive(questions: FrozenAdaptiveQuestion[]) {
  if (new Set(questions.map((q) => q.id)).size !== questions.length) throw new Error("duplicate question identity");
  const results = questions.map((q) => {
    if (!q.id || !q.source?.path || !/^[0-9a-f]{64}$/.test(q.source.sha256)) throw new Error("missing frozen source identity");
    return { id: q.id, source: q.source, limitation: q.limitation ?? null,
      result: adaptiveShadow(q.candidates, { lane: q.lane, requested: q.requested, allowS: q.allowS }) };
  });
  const eligible = results.filter((r) => r.result.evaluable && !r.limitation);
  const savings = eligible.map((r) => r.result.work.savedFraction).sort((a, b) => a - b);
  const quantile = (p: number) => {
    if (!savings.length) return null;
    const index = (savings.length - 1) * p;
    return savings[Math.floor(index)]! + (savings[Math.ceil(index)]! - savings[Math.floor(index)]!) * (index % 1);
  };
  const matches = eligible.filter((r) => r.result.agreement).length;
  return { schema: "adaptive-offline-replay-v1", questions: results.length, eligible: eligible.length,
    agreement: eligible.length ? matches / eligible.length : null,
    savedFraction: { p50: quantile(0.5), p90: quantile(0.9) },
    mismatches: results.filter((r) => r.result.agreement === false).map((r) => r.id), results,
    admission: "pending independent offline coverage and two completed natural shadow runs; no automatic activation",
    limits: "Same saved simulated samples and their prefixes, not observed game outcomes or win-rate improvement." };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error("usage: adaptive-replay.ts frozen-questions.json output.json");
  const bytes = readFileSync(input);
  const questions = JSON.parse((input.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString()) as FrozenAdaptiveQuestion[];
  for (const q of questions) {
    const sha = createHash("sha256").update(readFileSync(q.source.path)).digest("hex");
    if (sha !== q.source.sha256) throw new Error(`frozen source changed: ${q.id}`);
  }
  writeFileSync(output, JSON.stringify({ ...replayAdaptive(questions), input_sha256: createHash("sha256").update(bytes).digest("hex") }, null, 2) + "\n");
}
