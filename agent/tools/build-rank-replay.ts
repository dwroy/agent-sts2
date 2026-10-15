/** P2 descriptive replay of SHA-bound existing samples and the historical brain choice. No simulation or API. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { buildRank } from "../src/sim/build-rank.js";
import { BOSS_LINES_TIE_SE } from "../src/sim/boss-lines.js";
import { calibratedWinProb } from "../src/sim/boss-sim.js";
import { BUILD_SIM_CALIBRATION_SAMPLES, type CompareResult } from "../src/sim/build-sim.js";
import { bossTrustReason } from "../src/sim/boss-trust.js";
import type { SignCase } from "./s-sign-audit.js";

interface Ref { path: string; sha256: string }
interface Case {
  id: string; boss: string; ascension: number; floor: number;
  result: Ref; samples: Ref; decision: Ref; brain: Ref;
  base_case: string; option_cases: Record<string, string>;
}
const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("usage: build-rank-replay.ts frozen-bundle.json output.json");
const load = (ref: Ref) => {
  const bytes = readFileSync(ref.path);
  if (createHash("sha256").update(bytes).digest("hex") !== ref.sha256) throw new Error(`changed frozen source: ${ref.path}`);
  return JSON.parse((ref.path.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString());
};
const bytes = readFileSync(input), cases = JSON.parse(bytes.toString()).cases as Case[];
const seen = new Set<string>();
const rows = cases.map((entry) => {
  if (seen.has(entry.id)) throw new Error("duplicate frozen question");
  seen.add(entry.id);
  const result = load(entry.result) as CompareResult, sampleCases = load(entry.samples) as SignCase[];
  const decision = load(entry.decision), brain = load(entry.brain);
  if (decision.decision_id !== entry.id || decision.run_id !== brain.run_id || brain.accepted !== true
      || decision.deepseek?.choice !== brain.answer?.choice) throw new Error("historical decision/accepted brain identity mismatch");
  const sampleMap = new Map(sampleCases.map((c) => [c.id, c]));
  const get = (id: string) => {
    const value = sampleMap.get(id);
    if (!value || value.boss !== entry.boss || value.ascension !== entry.ascension) throw new Error("sample binding mismatch");
    return value.samples;
  };
  const base = get(entry.base_case), options = new Map(result.options.map((option) => [option.key, get(entry.option_cases[option.key]!)]));
  const calibrate = (p: number) => calibratedWinProb(p, BUILD_SIM_CALIBRATION_SAMPLES, "pre", entry.ascension);
  for (const option of [result.base, ...result.options]) {
    const samples = option === result.base ? base : options.get(option.key)!;
    const raw = samples.filter((s) => s.won).length / samples.length;
    if (samples.length !== option.samples || Math.abs(raw - option.win) > .000051
        || Math.abs(calibrate(raw) - option.winCal) > .000051) throw new Error("frozen sample/calibration summary mismatch");
  }
  const ranking = buildRank(result.base, result.options, { base, options }, {
    tieSe: BOSS_LINES_TIE_SE, calibrationSamples: BUILD_SIM_CALIBRATION_SAMPLES,
    calibratedFloor: calibrate(0), lowTrust: bossTrustReason(entry.boss, "b3", entry.ascension, entry.floor), calibrate,
  });
  return { id: entry.id, run_id: decision.run_id, floor: entry.floor, boss: entry.boss, ascension: entry.ascension,
    historical_choice: brain.answer.choice, matched: ranking.best_group.includes(brain.answer.choice), ranking, sources: entry };
});
writeFileSync(output, JSON.stringify({ schema: "build-ranking-replay-v1", at: new Date().toISOString(),
  input_sha256: createHash("sha256").update(bytes).digest("hex"), questions: rows.length,
  matches: rows.filter((r) => r.matched).length, agreement: rows.length ? rows.filter((r) => r.matched).length / rows.length : null,
  rows, limits: "Descriptive agreement on existing frozen conditional-model samples only. Reuses original samples and recorded paired HP mean; no reconstructed HP trajectories, simulator rerun, API call or game-benefit inference." }, null, 2) + "\n");
