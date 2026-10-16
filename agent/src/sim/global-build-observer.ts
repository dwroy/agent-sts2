/** G2 owns no workers: its separate memo namespace delegates to the existing B3 runner. */
import type { RolloutInput } from "../reflex/rollout.js";
import type { CompareResult, DeckOption } from "./build-sim.js";
import type { DeckSimRunner } from "./build-sim-pool.js";
import { memoKey } from "./compute-memo.js";
import { evaluateGlobalBuild, globalBossTargets, type GlobalBossTarget, type GlobalBuildResult } from "./global-build.js";
import { loadGlobalBossPool, type GlobalBossPool } from "./global-build-pool.js";

export interface GlobalBuildHistory {
  runId: string;
  points: { floor: number | null; label: string; input_key: string | null;
    readiness: { act: number; boss: string; base: number | null; unknown: string | null }[];
    summaries: GlobalBuildResult["summaries"] }[];
}
export interface GlobalBuildMemory {
  globalBuildHistory?: GlobalBuildHistory;
}
const runners = new WeakMap<DeckSimRunner, DeckSimRunner>();
const completed = new WeakMap<DeckSimRunner, { key: string; result: GlobalBuildResult }>();
let observation = 0;

export function globalBuildRunner(runner: DeckSimRunner): DeckSimRunner {
  let proxy = runners.get(runner);
  if (!proxy) {
    // Preserve the current-Boss compareOptions cache without starting another pool or owning close().
    proxy = { run: (request) => runner.run(request) };
    runners.set(runner, proxy);
  }
  return proxy;
}

export function rememberGlobalBuild(memory: GlobalBuildMemory, runId: string, floor: number | null,
  label: string, key: string | null, result: GlobalBuildResult): number {
  if (memory.globalBuildHistory?.runId !== runId) memory.globalBuildHistory = { runId, points: [] };
  const points = memory.globalBuildHistory.points, last = points.at(-1);
  if (key && last?.input_key === key && last.floor === floor && last.label === label) return points.length - 1;
  points.push(structuredClone({ floor, label, input_key: key, readiness: result.targets.map((target) => {
    const base = target.rows.find((row) => row.key === "@current");
    return { act: target.target.act, boss: target.target.boss, base: base?.base ?? null,
      unknown: base?.unknown ?? target.target.unknown ?? (base ? null : "baseline_not_recorded") };
  }), summaries: result.summaries }));
  return points.length - 1;
}

/** A read-only accessor for later admitted plan consumers; shadow callers never put it in a question. */
export function globalReadinessHistory(memory: GlobalBuildMemory, runId: string): GlobalBuildHistory["points"] {
  return memory.globalBuildHistory?.runId === runId ? memory.globalBuildHistory.points : [];
}

export async function observeGlobalBuild(args: {
  runner: DeckSimRunner; memory: GlobalBuildMemory; runId: string; floor: number | null; label: string;
  ascension: number; currentAct: number; currentBoss: string; input: RolloutInput; options: DeckOption[];
  sampling: { requested: number; seed: number; adaptiveMode: string };
  keys: string[]; current: CompareResult; visible: ReadonlyMap<number, string>;
  trustReason: (boss: string, act: number) => string | null; pool?: GlobalBossPool;
  unavailableReason?: string; now?: () => number;
  evaluate: (target: GlobalBossTarget, runner: DeckSimRunner) => Promise<CompareResult>;
}): Promise<GlobalBuildResult & { observation_id: string; input_key: string | null; memo_hit: boolean; history_index: number; original_wall_ms: number }> {
  if (!args.runId) throw new Error("global_run_identity_missing");
  const now = args.now ?? (() => performance.now()), started = now();
  let pool = args.pool, unavailable = args.unavailableReason;
  if (!pool && !unavailable) {
    try { pool = loadGlobalBossPool(args.ascension); }
    catch (error) { unavailable = `observed_pool_unavailable:${String(error instanceof Error ? error.message : error).slice(0, 200)}`; }
  }
  if (pool && (pool.character !== "silent" || pool.ascension !== args.ascension)) {
    pool = undefined;
    unavailable = "observed_pool_character_or_ascension_mismatch";
  }
  pool ??= { character: "silent", ascension: args.ascension, stages: [], unknown: [{ boss: "unknown", reason: unavailable ?? "missing_pool" }],
    source: { path: "unavailable", sha256: "unknown", generated: null }, unit: "observed_fight_records_including_retries" };
  const trustReason = (boss: string, act: number) => unavailable ?? args.trustReason(boss, act);
  const targets = globalBossTargets(pool, args.currentAct, args.visible, trustReason);
  const key = memoKey("global-build-shadow-v1", { run: args.runId, floor: args.floor, label: args.label,
    input: args.input, options: args.options, sampling: args.sampling,
    current: { base: args.current.base, options: args.current.options, samples: args.current.samples,
      requested: args.current.requested, timedOut: args.current.timedOut, adaptive: args.current.adaptive,
      buildRanking: args.current.buildRanking }, pool, targets, keys: args.keys });
  const cached = key ? completed.get(args.runner) : undefined;
  const hit = !!cached && cached.key === key;
  const result = hit ? structuredClone(cached.result) : await evaluateGlobalBuild({ pool, currentAct: args.currentAct,
    visible: args.visible, currentBoss: args.currentBoss, current: args.current, keys: args.keys, trustReason, now,
    evaluate: (target) => args.evaluate(target, globalBuildRunner(args.runner)) });
  if (key && !hit && !unavailable && !result.targets.some((target) => target.rows.some((row) => row.unknown?.startsWith("global_computation_failed:"))))
    completed.set(args.runner, { key, result: structuredClone(result) });
  const index = rememberGlobalBuild(args.memory, args.runId, args.floor, args.label, key, result);
  return { ...result, observation_id: `${process.pid}:g2:${++observation}`, input_key: key, memo_hit: hit, history_index: index,
    original_wall_ms: result.wall_ms, wall_ms: Math.max(0, Math.round(now() - started)) };
}
