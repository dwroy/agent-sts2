/** Read-only offline bridge to the existing boss simulator. No game rules. */
import { createHash } from "node:crypto";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { asArray, asRecord } from "../../agent/src/core/util/json.js";
import { fromRoot } from "../../agent/src/core/paths.js";
import { makeKnowledge } from "../../agent/src/knowledge/index.js";
import { syntheticBossStart, type SyntheticStart } from "../../agent/src/sim/boss-start.js";
import { runBossSim, type BossSimOptions, type BossSimResult } from "../../agent/src/sim/boss-sim.js";
import { preFightState } from "../../agent/tools/boss-sim/pre-fight.js";
import type { GameState } from "../../agent/src/hand/mod/schema.js";

export interface SimulationCase {
  combo: string; direction: string | null; run_id: string; target: string; encounter: string;
  historical_max_hp?: number | null;
  entry: { path: string; offset: number; bytes: number; sha256: string };
  evidence: { run_id: string; floor: number };
}
interface Dependencies {
  start: (state: GameState, boss: string, hp: number) => SyntheticStart;
  simulate: (start: SyntheticStart, options: BossSimOptions) => BossSimResult;
}
const hash = (raw: Uint8Array) => createHash("sha256").update(raw).digest("hex");

/** Unknown static openings and censored samples never become measured zeroes. */
export function simulateHistoricalCase(job: SimulationCase, raw: Record<string, unknown>, options: BossSimOptions, deps: Dependencies, standardHp?: number) {
  const run = asRecord(raw["run"]), combat = asRecord(raw["combat"]), player = asRecord(combat["player"]);
  const reason = (unknown_reason: string) => ({ ...job, target_ascension: 10, unknown_reason, samples: 0, values: null });
  if (raw["run_id"] !== job.run_id || run["floor"] !== job.evidence.floor) return reason("历史状态身份不匹配");
  if (raw["turn"] !== 1 || asRecord(combat["action_readiness"])["snapshot_stable"] !== true || player["cards_played_this_turn"] !== 0) return reason("缺少稳定且未出牌的原始T1入口");
  const deck = asArray(run["deck"]), bossId = run["boss_id"], maxHp = run["max_hp"];
  if (typeof bossId !== "string" || !bossId || !deck.length || deck.some(c => !asRecord(c)["card_id"] || typeof asRecord(c)["upgraded"] !== "boolean")) return reason("原始Boss身份/实际牌组或升级状态不完整");
  if (typeof maxHp !== "number" || !Number.isFinite(maxHp) || maxHp <= 0) return reason("原始max_hp缺失，不能指定标准入口");
  if (job.historical_max_hp != null && job.historical_max_hp !== maxHp) return reason("max_hp元数据与原始SHA输入不一致");
  const hp = standardHp ?? maxHp;
  if (!Number.isFinite(hp) || hp <= 0 || hp > maxHp) return reason("共同入口HP无效或超过该历史局max_hp");
  const before = preFightState(raw);
  if (!before.run) return reason("历史run无法解析");
  before.run.ascension = 10;
  before.run.raw["ascension"] = 10;
  const start = deps.start(before, bossId, hp);
  if (!start.boss.exact || start.boss.asc !== 10 || start.boss.parts.some(p => Object.keys(p.estimated ?? {}).length)) return reason("缺少精确A10静态开场；禁止用最近进阶或估计值冒充A10");
  if (start.boss.parts.map(p => p.id).sort().join("+") !== job.encounter.split("+").sort().join("+")) return reason("A10静态Boss部件与历史encounter不一致");
  const result = deps.simulate(start, options).lines[0];
  if (!result) return reason("模拟器没有返回整场结果");
  const completed = result.outcomes.filter(o => !o.capped && !o.timeUp && (o.won || o.died));
  const avg = (values: number[]) => values.length ? values.reduce((a,b) => a+b,0)/values.length : null;
  return { ...job, target_ascension: 10, entry_hp: hp, entry_hp_policy: standardHp === undefined ? "historical_max_hp" : "common_min_observed_max_hp",
    samples: result.samples, completed: completed.length, capped: result.capped, time_ups: result.timeUps,
    unknown_reason: completed.length === result.samples ? null : "含截断/超时样本；整场胜率、掉血和回合数未知，不把删失样本当失败",
    values: { win_rate: completed.length === result.samples ? avg(completed.map(o => Number(o.won))) : null, hp_loss: completed.length === result.samples ? avg(completed.map(o => o.hpLoss)) : null,
      completion_turns: completed.length === result.samples ? avg(completed.map(o => o.turns)) : null,
      dpr: avg(result.perTurn.filter(t => t.fighting > 0).map(t => t.dmg)) },
    trust: "unknown", labels: ["A10_exact_opening", "observational_historical_deck", "explicit_standard_entry_hp", "model_not_validated_for_combo"],
    unmodelled_relics: start.relics.unmodelled,
    provenance: { actual_deck_sha256: hash(Buffer.from(JSON.stringify(deck))), options,
      boss: start.boss, historical_entry: job.entry },
  };
}

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error("usage: node --import tsx combo-simulation.mts jobs.json output.json");
  const payload = JSON.parse(readFileSync(input, "utf8")) as { cases: SimulationCase[]; options: BossSimOptions };
  // One standard across the frozen corpus; never silently use different HP
  // conditions for the direction prior. Every accepted case verifies its source.
  const maxHps = payload.cases.map(c => c.historical_max_hp).filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
  const standardHp = maxHps.length ? Math.min(...maxHps) : undefined;
  let knowledge: ReturnType<typeof makeKnowledge> | undefined;
  const deps: Dependencies = { start: (state,boss,hp) => {
    knowledge ??= makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: never }).collections, "cache");
    return syntheticBossStart(state,knowledge,boss,hp);
  },
    simulate: (start,options) => runBossSim(start.input,[null],options) };
  const cache = new Map<string, ReturnType<typeof simulateHistoricalCase>>();
  const rows = payload.cases.map(job => {
    const key = `${job.run_id}:${job.target}:${job.entry.sha256}`;
    const existing = cache.get(key);
    if (existing) return { ...existing, ...job };
    const bytes = Buffer.alloc(job.entry.bytes), fd = openSync(job.entry.path,"r");
    try { if (readSync(fd,bytes,0,bytes.length,job.entry.offset) !== bytes.length || hash(bytes) !== job.entry.sha256) throw new Error("historical source SHA mismatch"); }
    finally { closeSync(fd); }
    const raw = JSON.parse(bytes.toString("utf8")) as { state: Record<string,unknown> };
    let row;
    try { row = standardHp === undefined ? { ...job, target_ascension: 10, unknown_reason: "冻结输入没有已核实max_hp，无法定义共同入口", samples: 0, values: null } : simulateHistoricalCase(job,raw.state,payload.options,deps,standardHp); }
    catch (e) { row = { ...job, target_ascension: 10, unknown_reason: `模拟器拒绝该历史输入：${String(e)}`, samples: 0, values: null }; }
    cache.set(key,row); return row;
  });
  const files = ["data/game-data.json", "knowledge/common/monster-db.json", "knowledge/common/move-model.json"].map(path => {
    try { return { path: fromRoot(path), sha256: hash(readFileSync(fromRoot(path))) }; }
    catch { return { path: fromRoot(path), sha256: null }; }
  });
  writeFileSync(output,JSON.stringify({ rows, files, workers: 1, target_ascension: 10, entry_hp: standardHp ?? null, entry_hp_policy: "minimum_positive_historical_max_hp_in_frozen_cases", options: payload.options },null,2)+"\n");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
