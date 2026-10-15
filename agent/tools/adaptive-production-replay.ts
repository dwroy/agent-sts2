/** Frozen C2 admission against the actual P2/P3 rankers; no API, game action, fitting or historical outcome rewrite. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deserialize, serialize } from "node:v8";
import { gunzipSync, gzipSync } from "node:zlib";
import { AdaptiveSampler } from "../src/sim/adaptive-sampler.js";
import { SerialDeckRunner, type DeckRunRequest, type DeckRunResult, type DeckSimRunner } from "../src/sim/build-sim-pool.js";
import { compareOptions, type DeckOption } from "../src/sim/build-sim.js";
import { rankLines, wonLoss } from "../src/sim/boss-lines.js";
import { calibratedWinProb, summarizeLine, type BossSimLineResult } from "../src/sim/boss-sim.js";
import { bossTrustReason } from "../src/sim/boss-trust.js";
import { memoKey } from "../src/sim/compute-memo.js";
import { sampleSchedule } from "../src/sim/sample-range.js";
import { asArray, asRecord } from "../src/core/util/json.js";
import type { RolloutInput } from "../src/reflex/rollout.js";

interface Ref { path: string; sha256: string }
interface Case { id: string; lane: "b2" | "b3"; source: Ref; state?: Ref; boss: string; ascension: number; floor: number }
const [manifest, directory] = process.argv.slice(2);
if (!manifest || !directory || process.env["CHARACTER"]?.toLowerCase() !== "silent") {
  throw new Error("usage: CHARACTER=SILENT tsx adaptive-production-replay.ts frozen-manifest.json output-directory");
}
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const load = (ref: Ref) => {
  const raw = readFileSync(ref.path);
  if (hash(raw) !== ref.sha256) throw new Error(`changed frozen source: ${ref.path}`);
  return ref.path.endsWith(".gz") ? gunzipSync(raw) : raw;
};
const key = (r: DeckRunRequest) => memoKey("frozen-physical-decks", { base: r.base, decks: r.decks, stripes: r.stripes,
  orders: r.orders, samples: r.samples, seed: r.seed, maxTurns: r.maxTurns, scripts: r.scripts });
const group = (rows: BossSimLineResult[], lowTrust: string | null, allowPrefixes: boolean) => {
  const ranked = rankLines(rows, 2, () => true, wonLoss, { lowTrust, allowPrefixes });
  return (ranked.tied.length ? ranked.tied : [ranked.best]).map((i) => `line:${i}`).sort();
};
mkdirSync(directory, { recursive: true });
const bytes = readFileSync(manifest), cases = JSON.parse(bytes.toString()).cases as Case[];
if (new Set(cases.map((c) => c.id)).size !== cases.length) throw new Error("duplicate frozen question");
const results: Record<string, unknown>[] = [];
for (const entry of cases) {
  if (!/^[a-zA-Z0-9_-]+$/.test(entry.id) || entry.ascension !== 10) throw new Error("invalid frozen case identity");
  const lowTrust = bossTrustReason(entry.boss, entry.lane, entry.ascension, entry.floor), allowS = !lowTrust;
  let full: string[], partial: string[], work: { full: number; actual: number }, details: unknown;
  if (entry.lane === "b3") {
    const input = deserialize(load(entry.source)) as { base: RolloutInput; options: DeckOption[] };
    if (input.base.meta.asc !== entry.ascension) throw new Error("frozen input ascension mismatch");
    const phases = new Map<string, DeckRunResult>(), serial = new SerialDeckRunner();
    let fullWork = 0, actualWork = 0;
    const capture: DeckSimRunner = { run: async (r) => {
      const id = key(r); if (!id) throw new Error("unhashable frozen request");
      const value = await serial.run(r); phases.set(id, value);
      fullWork += value.outcomes.flat(2).filter(Boolean).length;
      return value;
    } };
    const policy = { samples: 1000, seed: 7, requireComplete: true, quantitative: true,
      buildRank: { lowTrust, calibratedFloor: calibratedWinProb(0, 200, "pre", entry.ascension), tieSe: 2 } };
    const completed = await compareOptions(capture, input.base, input.options, { ...policy, adaptive: { mode: "shadow", allowS } });
    const replay: DeckSimRunner = { run: async (r) => {
      const original = phases.get(key(r) ?? ""); if (!original) throw new Error("partial request changed frozen physical input");
      const schedule = sampleSchedule(r.samples, r.decks.length, r.range, r.activeDecks);
      const outcomes = r.decks.map(() => r.orders.map(() => new Array<typeof original.outcomes[number][number][number]>(r.samples)));
      for (const deck of schedule.indices) for (let order = 0; order < r.orders.length; order++) for (let i = schedule.from; i < schedule.to; i++) {
        const stripe = r.stripes?.[deck]; if (stripe && i % stripe.of !== stripe.at) continue;
        const sample = original.outcomes[deck]![order]![i]; if (!sample) throw new Error("frozen sample missing");
        outcomes[deck]![order]![i] = sample; actualWork++;
      }
      return { outcomes, complete: Array.from({ length: schedule.to - schedule.from }, (_, i) => i + schedule.from),
        timedOut: false, elapsedMs: 0, workers: 0 };
    } };
    const shortened = await compareOptions(replay, input.base, input.options, { ...policy, adaptive: { mode: "on", allowS } });
    if (asRecord(completed.buildRanking)["status"] !== "produced" || asRecord(shortened.buildRanking)["status"] !== "produced") {
      throw new Error("production ranking missing");
    }
    full = asArray(asRecord(completed.buildRanking)["best_group"]).map(String).sort();
    partial = asArray(asRecord(shortened.buildRanking)["best_group"]).map(String).sort();
    work = { full: fullWork, actual: actualWork };
    writeFileSync(join(directory, `${entry.id}-full-phases.bin.gz`), gzipSync(serialize(phases)));
    details = { completed, shortened, production_shadow: asRecord(completed.adaptive)["production_comparison"],
      scope: "Current model full samples, then actual incremental interfaces consuming only their frozen prefixes. Replay wall time is not runtime saving." };
  } else {
    if (!entry.state) throw new Error("saved B2 best orders require original single-enemy evidence");
    const state = JSON.parse(load(entry.state).toString()).state;
    if (state.run?.character_id !== "SILENT" || state.run?.floor !== entry.floor || state.combat?.enemies?.length !== 1) {
      throw new Error("saved B2 lines lack original identity or all-order coverage");
    }
    const lines = JSON.parse(load(entry.source).toString()) as (BossSimLineResult & { order: string | null })[];
    if (!lines.length || lines.some((line) => line.samples !== 600 || line.outcomes.length !== 600 || line.order !== null)) throw new Error("incomplete single-order B2 export");
    const sampler = new AdaptiveSampler(lines.map((_, i) => ({ key: `line:${i}` })), { lane: "b2", requested: 600, allowS });
    for (let round = sampler.next(); round; round = sampler.next()) sampler.observe(round.active.map((id) => ({ key: id,
      samples: lines[Number(id.slice(5))]!.outcomes.slice(0, round!.to) })));
    const result = sampler.result();
    const shortened = lines.map((line, i) => summarizeLine(i, line.outcomes.slice(0, result.candidates[i]!.samples)));
    full = group(lines, lowTrust, false); partial = group(shortened, lowTrust, true);
    work = { full: result.work.full, actual: result.work.actual };
    details = { adaptive: result, full_rank: rankLines(lines, 2, () => true, wonLoss, { lowTrust }),
      partial_rank: rankLines(shortened, 2, () => true, wonLoss, { lowTrust, allowPrefixes: true }),
      scope: "Existing complete single-order B2 samples; no simulator rerun. No claim about missing multi-enemy order exports." };
  }
  const row = { ...entry, lowTrust, full, partial, agreement: JSON.stringify(full) === JSON.stringify(partial),
    work: { ...work, savedFraction: 1 - work.actual / work.full }, details };
  results.push(row);
  writeFileSync(join(directory, `${entry.id}.json`), JSON.stringify(row, null, 2) + "\n");
  console.log(JSON.stringify({ id: entry.id, agreement: row.agreement, full, partial, work: row.work }));
}
const savings = results.map((r) => (r.work as { savedFraction: number }).savedFraction).sort((a, b) => a - b);
const quantile = (p: number) => {
  const i = (savings.length - 1) * p;
  return savings.length ? savings[Math.floor(i)]! + (savings[Math.ceil(i)]! - savings[Math.floor(i)]!) * (i % 1) : null;
};
writeFileSync(join(directory, "report.json"), JSON.stringify({ at: new Date().toISOString(), manifest_sha256: hash(bytes),
  questions: results.length, agreement: results.length ? results.filter((r) => r.agreement).length / results.length : null,
  savedFraction: { p50: quantile(.5), p90: quantile(.9) }, mismatches: results.filter((r) => !r.agreement),
  cases: results.map(({ details, ...rest }) => rest), admission: "offline subset only; independent natural coverage still required",
  limits: "First-group equivalence under frozen conditional model inputs, not game calibration or a new learner study. No old R2/R3 result replaced." }, null, 2) + "\n");
