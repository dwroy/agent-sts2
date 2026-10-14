/** Deliver established same-question simulation facts independently of uncalibrated future forecasts. */
import { asRecord, str, toJsonValue, type JsonValue } from "../core/util/json.js";
import type { Decision, DecisionEnv } from "../memory/types.js";

export const CONSTRUCTION_EVALUATION_NOTE = "构筑评估将组件数量与战斗兑现分列。比较拿/跳/删/升级的完整战斗DPR、配对差及误差、掉血、核心具名牌施放覆盖和首次施放回合；不能只因多一张组件就判更好，也不能只最大化DPR。抽牌稀释需看同题模拟中的施放覆盖/回合差，未知时明确说明，不能拿未施放=0回合或总动作数冒充完整循环。未来组件概率未通过对应校准时不用于数值排序；完整核心资格与最终通关率未知时不编造。若本题更新run_plan，必须给construction={primary,alternatives,checkpoint,reason,pivot_if}；primary取coreCatalog的ID，暂不押方向可填uncommitted。checkpoint为大于当前层的复查层数，reason说明证据和取舍，pivot_if说明转向条件。";

export function constructionEvaluationEnabled(character: string, env = process.env): boolean {
  return character === "silent" && env["CONSTRUCTION_MODE"] !== "off" && env["CONSTRUCTION_EVALUATION"] !== "off";
}

/** Shadow retains its meaning: this function sends no forecast probabilities. */
export function withConstructionEvaluation(decision: Decision, env: DecisionEnv, record?: Record<string, JsonValue>, enabled?: boolean): Decision {
  const character = str(asRecord(env.state.run?.raw)["character_id"]).toLowerCase();
  if (character !== "silent" || !(enabled ?? constructionEvaluationEnabled(character)) || decision.kind !== "ask" || !record) return decision;
  const evaluation = asRecord(record.evaluation), run = str(env.state.raw["run_id"]);
  if (evaluation.schema !== "construction-evaluation-v1" || evaluation.character !== "silent"
    || evaluation.run !== run || evaluation.floor !== env.state.run?.floor || evaluation.label !== decision.label) return decision;
  const spec = decision.deepseek, key = spec?.question, question = key ? decision.questions[key] : undefined;
  if (!key || question?.type !== "choice") return decision;
  return { ...decision, state: { ...decision.state,
    facts: toJsonValue({ ...asRecord(decision.state["facts"]), construction_evaluation: evaluation }) },
    questions: { ...decision.questions, [key]: { ...question, instructions: question.instructions + " " + CONSTRUCTION_EVALUATION_NOTE } } };
}
