import { asArray, asRecord, str } from "../core/util/json.js";
import { calibrationSummary, type QuantitativePrediction, type QuantitativeObservation } from "./quantitative-calibration.js";

export interface QuantitativeLogInput {
  /** Caller verified contiguous frozen byte ranges, including all intervening decisions and states. */
  contiguous: boolean;
  decisions: Record<string, unknown>[];
  states: Record<string, unknown>[];
  /** Exact, clean run-config source identity, verified by the offline caller against its frozen manifest. */
  sources: { run: string; commit: string }[];
}

/** Extract only the first adopted, completed action. A replanned suffix is never an observed counterfactual. */
export function extractQuantitativeLog(input: QuantitativeLogInput) {
  const rows: { prediction: QuantitativePrediction; observation: QuantitativeObservation }[] = [];
  const excluded: { decision: string; reason: string }[] = [];
  const ordered = [...input.decisions].sort((a, b) => str(a.observed_ts ?? a.ts).localeCompare(str(b.observed_ts ?? b.ts)));
  const frames = [...input.states].sort((a, b) => str(a.observed_ts ?? a.ts).localeCompare(str(b.observed_ts ?? b.ts)));
  for (const d of ordered) {
    const id = str(d.decision_id), run = str(d.run_id);
    const reject = (reason: string) => excluded.push({ decision: id, reason });
    if (input.contiguous !== true) { reject("缺连续日志范围证明；片段不能冒充完整执行窗口"); continue; }
    const source = input.sources.filter((s) => s.run === run);
    if (source.length !== 1 || !/^[a-f0-9]{40}$/.test(source[0]!.commit)) { reject("缺唯一干净完整源码身份；旧dirty记录不校准当前模型"); continue; }
    const option = str(asRecord(asRecord(d.answers).plan).choice);
    const criteria = asRecord(asRecord(asRecord(d.questions).plan).criteria);
    let fact: Record<string, unknown>;
    try { fact = asRecord(JSON.parse(str(criteria[option]))); } catch { reject("缺实际选择的量化题面"); continue; }
    const q = asRecord(asRecord(fact.quantitative_turn).realization);
    const action = asRecord(asArray(q.actions)[0]);
    if (!str(q.model) || !str(q.fingerprint) || !Object.keys(action).length) { reject("缺逐动作预测与模型/状态绑定"); continue; }
    if (asArray(q.unknown).length || action.pending_selection === true) { reject("预测有未建模或未完成选择"); continue; }
    const chosen = asRecord(d.chosen);
    if (chosen.action !== "play_card" || !str(d.result).startsWith("completed:")) { reject("动作未完成或不是可匹配的手动出牌"); continue; }
    const observed = str(d.observed_ts ?? d.ts);
    const before = frames.find((f) => str(asRecord(f.state).run_id) === run && f.fingerprint === d.fingerprint && str(f.observed_ts ?? f.ts) === observed);
    if (!before) { reject("缺决策同指纹原帧"); continue; }
    const state = asRecord(before.state), runState = asRecord(state.run), combat = asRecord(state.combat);
    if (str(runState.character_id).toLowerCase() !== "silent" || runState.ascension !== 10) { reject("角色/进阶不在已验证范围"); continue; }
    const held = asArray(combat.hand).map(asRecord).find((c) => c.index === chosen.card_index);
    if (!held || held.card_id !== action.card || (chosen.target_index ?? null) !== (action.target ?? null)) { reject("实际采用动作与预测不同"); continue; }
    if (!Number.isSafeInteger(d.sl_attempt)) { reject("缺SL尝试身份"); continue; }
    const nextAction = ordered.find((other) => str(other.run_id) === run && str(other.observed_ts ?? other.ts) > observed && Object.keys(asRecord(other.chosen)).length);
    const boundary = nextAction ? str(nextAction.observed_ts ?? nextAction.ts) : null;
    const after = frames.find((f) => {
      const s = asRecord(f.state), time = str(f.observed_ts ?? f.ts);
      return str(s.run_id) === run && time > observed && (!boundary || time <= boundary) && f.fingerprint !== before.fingerprint;
    });
    if (!after) { reject("缺下次动作前完整结果帧"); continue; }
    const end = asRecord(after.state), endRun = asRecord(end.run), endCombat = asRecord(end.combat);
    if (end.turn !== state.turn || endRun.floor !== runState.floor || end.screen !== "COMBAT" || end.selection != null ||
        (nextAction && nextAction.sl_attempt !== d.sl_attempt)) { reject("窗口跨回合/房间/SL或进入未完成选择"); continue; }
    const player = asRecord(endCombat.player);
    const metrics = [["energy_after_action", action.energy_after, player.energy],
      ["block_after_action", action.block_after, player.block],
      ["hp_after_action", action.hp_after, player.current_hp]] as const;
    for (const [metric, predicted, actual] of metrics) {
      if (typeof predicted !== "number" || !Number.isFinite(predicted) || typeof actual !== "number" || !Number.isFinite(actual)) continue;
      const identity = { character: "silent", ascension: 10, run, attempt: String(d.sl_attempt), decision: id,
        fingerprint: str(d.fingerprint), option, metric, window: "adopted_first_action",
        model: `${str(q.model)}@${source[0]!.commit}` };
      rows.push({ prediction: { ...identity, mean: predicted, p10: null, p90: null },
        observation: { ...identity, value: actual, completed: true, followedPlan: true,
          evidence: [`${run}:${str(before.ts)}`, `${run}:${str(after.ts)}`, `decision:${id}`] } });
    }
  }
  return { rows, excluded, summary: calibrationSummary(rows),
    limits: "仅首个实际采用并完成动作的资源结果；不把选择后缀、整回合、未采用方案或旧dirty模型伪作校准。确定条件点预测没有经验区间，覆盖率为null。" };
}
