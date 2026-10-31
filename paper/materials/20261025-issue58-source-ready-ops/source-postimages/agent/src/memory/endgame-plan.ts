/** Roy's #50 planning contract. Content and readiness thresholds remain the learner's responsibility. */
import type { GameState } from "../hand/mod/schema.js";
import type { JsonSchema } from "../brain/tools/types.js";
import { asRecord, str, type JsonValue } from "../core/util/json.js";
import { isConstructionQuestion } from "./construction-log.js";

export const ENDGAME_OBJECTIVE = "本局终局目标：从第一幕起为 F48→F49 连赢两个 Boss 构筑，中间无休息或自动回血；同时规划成长性输出与可持续防御，血量和药水按连续两场的实际消耗计算。";
export const ENDGAME_PLAN_NOTE = "已有构筑路线和爬楼路线继续复用；路线未实质改变，不因下一道题重写完整计划或重算整条路线。结合当前牌组、遗物、HP、金币、药水、遭遇与机会，判断相较现有路线值得修改、预期有助于本局胜率后才改线；理由可含不确定性，不编造胜率提升数值。两类路线可分别调整，仅更新和重算实际受影响部分；普通状态变化只使依赖该状态的数值失效。无构筑计划时在同一答案给完整 run_plan（含 endgame）；已有计划时可省略 run_plan，确需调整只给变更字段及 change_reason（当前情况、旧/新取舍与预期收益），endgame 也只给受影响字段。幕末 endgame_checkpoint 要求的检查在 run_plan.endgame.checkpoint 作答，检查本身不要求换路线。计划是本局假设，不是知识规则；依据、可信度和未知须分清，达标线只引用已发布条目，不自行补伤害/防御/血量门槛。";
export const ENDGAME_TEXT_LIMIT = 240;
export const ENDGAME_FIELDS = ["core", "gaps", "scaling_damage", "sustainable_defense", "resources", "win_condition"] as const;
export type EndgamePlan = Record<(typeof ENDGAME_FIELDS)[number] | "checkpoint", string>;

/** Raw mod context is also available at the brain boundary before any facts are constructed. */
export function endgameRawScope(raw: unknown): boolean {
  const run = asRecord(asRecord(raw)["run"]);
  return str(run["character_id"]).toLowerCase() === "silent" && run["ascension"] === 10;
}
export function endgameScope(state: GameState): boolean { return endgameRawScope(state.raw); }
export function endgameQuestion(state: GameState, label: string): boolean {
  return endgameScope(state) && !state.in_combat && isConstructionQuestion(label);
}

/** The last two pre-boss floors of the current act; post-boss rewards never count as a checkpoint. */
export function endgameCheckpoint(state: GameState, label: string): Record<string, JsonValue> | null {
  if (!endgameQuestion(state, label)) return null;
  const act = Number(asRecord(state.run?.raw)["act_id"]) + 1;
  const bossFloor = [17, 33, 48][act - 1], floor = state.run?.floor;
  if (bossFloor === undefined || floor == null || floor < bossFloor - 2 || floor >= bossFloor) return null;
  return { act, before_boss_floor: bossFloor,
    instruction: "幕末检查：核心已成型、部分成型还是未知？还缺什么？本幕 Boss 怎么过、离 F48→F49 连胜还差什么？写明成长性输出、持续防御与两战 HP/药水依据；缺证保持未知，在 run_plan.endgame.checkpoint 明确作答。" };
}

export function endgameTask(state: GameState, label: string, reuse = false): Record<string, JsonValue> {
  const checkpoint = endgameCheckpoint(state, label);
  return { endgame_objective: ENDGAME_OBJECTIVE, endgame_plan_required: !reuse, ...(reuse ? { plan_reuse: true } : {}),
    ...(checkpoint ? { endgame_checkpoint: checkpoint } : {}) };
}
export function endgamePlanningTask(payload: unknown): boolean {
  return typeof asRecord(asRecord(payload)["run_plan_task"])["endgame_objective"] === "string";
}
export function endgameReuse(payload: unknown): boolean {
  return asRecord(asRecord(payload)["run_plan_task"])["plan_reuse"] === true;
}
export function endgameRequired(payload: unknown): boolean {
  const p = asRecord(payload);
  return asRecord(p["run_plan_task"])["endgame_plan_required"] === true;
}
export function endgameCheckpointRequired(payload: unknown): boolean {
  return Boolean(asRecord(asRecord(payload)["run_plan_task"])["endgame_checkpoint"]);
}

export const ENDGAME_PLAN_SCHEMA: JsonSchema = {
  type: "object", description: "本局终局假设；每项1句，最多240 Unicode字符，缺证明确写未知。",
  properties: Object.fromEntries([...ENDGAME_FIELDS, "checkpoint"].map(key => [key, { type: "string" as const,
    description: key === "checkpoint" ? "只在 endgame_checkpoint 给出时回答幕末检查；复用时其余题可省略" : `${key}：本局假设及依据，最多240字符；复用时只给实际变更字段` }])),
  required: [...ENDGAME_FIELDS, "checkpoint"], additionalProperties: false,
};

export function endgameProblems(value: unknown, checkpoint: boolean): string[] {
  const plan = asRecord(value), problems: string[] = [];
  for (const key of [...ENDGAME_FIELDS, "checkpoint"] as const) {
    const text = plan[key];
    if (typeof text !== "string" || ((key !== "checkpoint" || checkpoint) && !text.trim())) problems.push(`endgame.${key} is required (write unknown when unsupported)`);
    else if (Array.from(text).length > ENDGAME_TEXT_LIMIT) problems.push(`endgame.${key} exceeds ${ENDGAME_TEXT_LIMIT} characters`);
    else if (key === "checkpoint" && !checkpoint && text.trim()) problems.push("endgame.checkpoint must be empty outside an endgame_checkpoint question");
  }
  return problems;
}
export function parseEndgamePlan(value: unknown): EndgamePlan | null {
  const p = asRecord(value);
  if (endgameProblems(value, Boolean(str(p["checkpoint"]).trim())).length) return null;
  return Object.fromEntries([...ENDGAME_FIELDS, "checkpoint"].map(k => [k, str(p[k]).trim()])) as EndgamePlan;
}
