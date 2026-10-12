import { asArray, asRecord, numOrNull, str } from "../../agent/src/core/util/json.js";
import { selectionObservation } from "./selection-observation.js";
import { terminalSelectionObservation } from "./selection-terminal.js";

type Row = Record<string, unknown>;
const lineText = (value: unknown): string => str(value).replace(/, then /g, ", ").trim();
const context = (row: Row): string => JSON.stringify([row.run_id, row.floor, row.turn, row.sl_attempt, row.sl_reloads]);

function facts(value: unknown): Row {
  if (typeof value !== "string") return asRecord(value);
  try { return asRecord(JSON.parse(value)); } catch { return {}; }
}

function candidate(key: string | null, options: Map<string, Row>) {
  const value = key === null ? undefined : options.get(key);
  return value ? { key, facts: value } : null;
}

function predictedSelection(row: Row) {
  const options = new Map(Object.entries(asRecord(asRecord(asRecord(row.questions).plan).criteria))
    .map(([key, value]) => [key, facts(value)]));
  const answer = str(asRecord(asRecord(row.answers).plan).choice) || null;
  const stages = asRecord(row.selection_audit);
  const sl = asRecord(row.sl_explore);
  // The old journal can still describe the pre-SL line (KFR F33 T6).
  const selected = lineText(asRecord(stages.after_sl).line) || lineText(sl.replacement) || lineText(asRecord(row.journal).choice);
  const matches = selected ? [...options].filter(([, value]) => lineText(value.plays) === selected) : [];
  const finalKey = matches.length === 1 ? matches[0]![0] : null;
  const best = [...options].filter(([, value]) => value.rollout_best === true).map(([key]) => key);
  const comparable = finalKey !== null && best.length > 0 && !!str(options.get(finalKey)?.rollout) &&
    best.every((key) => !!str(options.get(key)?.rollout));
  return {
    answer: candidate(answer, options), final_candidate: candidate(finalKey, options),
    final_line: selected || null,
    final_match: matches.length === 1 ? "unique_logged_text" : matches.length > 1 ? "ambiguous_logged_text" : "unavailable",
    // These flags compare forecasts within one question, never different boards or actual play.
    predicted_final_rollout_best: comparable ? best.includes(finalKey!) : null,
    comparison_reason: comparable ? "same_question_unique_candidate" : "missing_unique_candidate_or_rollout_ranking",
    original_rollout_best_chosen: typeof row.rollout_best_chosen === "boolean" ? row.rollout_best_chosen : null,
    hp_guard: row.hp_guard ?? null, selection_stages: row.selection_audit ?? null, sl: row.sl_explore ?? null,
  };
}

function observation(row: Row) {
  const state = asRecord(row.state);
  const combat = asRecord(state.combat);
  const player = asRecord(combat.player);
  return {
    source_line: numOrNull(row._line), observed_ts: row.observed_ts ?? null,
    turn: state.turn ?? null, screen: state.screen ?? null,
    hp: numOrNull(player.current_hp) ?? numOrNull(asRecord(state.run).current_hp),
    block: numOrNull(player.block), energy: numOrNull(player.energy),
    player_powers: player.powers ?? null,
    hand: Array.isArray(combat.hand) ? combat.hand.map((item) => {
      const card = asRecord(item);
      return { index: card.index ?? null, id: card.card_id ?? null, upgraded: card.upgraded ?? null };
    }) : null,
    powers: player.powers ?? null,
    enemies: asArray(combat.enemies).map((item) => {
      const enemy = asRecord(item);
      return { index: enemy.index ?? null, id: enemy.enemy_id ?? null, hp: enemy.current_hp ?? null,
        max_hp: enemy.max_hp ?? null, alive: enemy.is_alive ?? null, powers: enemy.powers ?? null,
        intents: enemy.intents ?? null };
    }),
  };
}

/** MTQ0 F11 / KFR F12, silent-0125: retain dispatches and re-asks without attributing a whole turn to a forecast. */
export function auditSelectionExecution(input: unknown) {
  const source = asRecord(input);
  const run = asRecord(source.run);
  const runId = str(run.run_id);
  if (!/^[A-Z0-9]{12}$/.test(runId) || str(run.character).toLowerCase() !== "silent" || run.ascension !== 10) {
    throw new Error("只接受 runs.jsonl 已核角色为 silent、进阶为 A10 的单局输入");
  }
  if (!Array.isArray(source.decisions) || !Array.isArray(source.states)) throw new Error("缺少冻结决策或状态数组");
  const decisions = asArray(source.decisions).map(asRecord);
  const states = asArray(source.states).map(asRecord);
  if (decisions.some((row) => row.run_id !== runId) || states.some((row) => {
    const state = asRecord(row.state), info = asRecord(state.run);
    return state.run_id !== runId || str(info.character_id).toLowerCase() !== "silent" || info.ascension !== 10;
  })) throw new Error("输入混入其他局、角色或进阶");
  // An observed timestamp and fingerprint must both match. Identical SL boards alone are ambiguous.
  const stateIndex = new Map<string, Row[]>();
  for (const row of states) {
    const key = JSON.stringify([row.observed_ts, row.fingerprint]);
    stateIndex.set(key, [...(stateIndex.get(key) ?? []), row]);
  }
  const seen = new Set<string>();
  let previous = "";
  for (const row of decisions) {
    const id = str(row.decision_id), ts = str(row.observed_ts);
    if (!id || seen.has(id) || !ts || ts < previous) throw new Error("决策必须按观测时间排序，且 decision_id 非空、不重复");
    seen.add(id); previous = ts;
  }
  const matchedState = (row: Row) => {
    const matching = stateIndex.get(JSON.stringify([row.observed_ts, row.fingerprint])) ?? [];
    const frame = matching.length === 1 ? matching[0]! : null;
    const raw = asRecord(frame?.state);
    const consistent = frame !== null && asRecord(raw.run).floor === row.floor && raw.turn === row.turn && raw.screen === row.screen;
    const state = consistent ? frame : null;
    return { state_match: state ? "unique_timestamp_and_fingerprint" : matching.length > 1 ? "ambiguous"
      : frame ? "inconsistent" : "missing", before: state ? observation(state) : null };
  };
  const action = (row: Row) => {
    const result = str(row.result);
    return {
      decision_id: row.decision_id, source_line: numOrNull(row._line), label: row.label ?? null,
      chosen: row.chosen ?? null, expected_identity: row.expect ?? null,
      result: row.result ?? null,
      dispatch: row.gate_reject ? "rejected" : result.startsWith("completed:") ? "completed_response"
        : result.startsWith("pending") ? "queued_unconfirmed" : "unknown",
      ...matchedState(row),
    };
  };
  // YF0LXT1QSTGG F48 T4/T5, silent-0021/0027/0028/0085: held cards and observed
  // powers are separate facts. Even adjacent logged decisions cannot certify all intervening actions.
  const observedIntervals = decisions.map((row, index) => {
    const next = decisions[index + 1];
    const before = matchedState(row);
    const after = next ? matchedState(next) : null;
    const line = numOrNull(row._line), nextLine = numOrNull(next?._line);
    const turn = numOrNull(row.turn), nextTurn = numOrNull(next?.turn);
    const time = Date.parse(str(row.observed_ts)), nextTime = Date.parse(str(next?.observed_ts));
    const sameFight = next && row.floor != null && row.sl_attempt != null && row.sl_reloads != null &&
      row.floor === next.floor && row.sl_attempt === next.sl_attempt && row.sl_reloads === next.sl_reloads;
    const nextTurnEnd = turn !== null && nextTurn === turn + 1 && asRecord(row.chosen).action === "end_turn";
    const reason = !next ? "input_exhausted"
      : !sameFight ? "room_or_attempt_changed_or_unknown"
      : line === null || nextLine === null || !Number.isInteger(line) || line <= 0 || nextLine !== line + 1
        ? "source_decisions_not_adjacent"
      : !Number.isFinite(time) || !Number.isFinite(nextTime) || nextTime <= time ? "observation_time_not_increasing"
      : turn === null || (nextTurn !== turn && !nextTurnEnd) ? "turn_boundary_unverified"
      : !before.before || !after?.before ? "state_match_unavailable"
      : "adjacent_logged_observations";
    const linked = reason === "adjacent_logged_observations";
    const boundary = !linked ? null : nextTurnEnd ? "next_turn_after_end_request"
      : str(next!.label).startsWith("combat/plan-choice") ? "next_question"
      : next!.screen === "CARD_SELECTION" ? "card_selection" : "next_logged_action";
    return {
      decision_id: row.decision_id, source_line: line, dispatch: action(row).dispatch,
      next_decision_id: next?.decision_id ?? null, next_source_line: nextLine,
      reason, boundary, before: before.before, before_state_match: before.state_match,
      after: linked ? after!.before : null, after_state_match: after?.state_match ?? null,
      // No damage total across revivals, enemy index reuse, SL restoration, or unlogged re-planning.
      actual_action_effect: null, actual_full_candidate_result: null,
    };
  });
  const observedActions = decisions.map(action);
  const linkedActions = observedActions.map((item, index) => ({ ...item,
    observed_interval: selectionObservation(decisions[index]!, decisions[index + 1], item.before,
      observedActions[index + 1]?.before ?? null),
    terminal_observation: terminalSelectionObservation(run, decisions[index]!, decisions[index + 1], item.before,
      observedActions[index + 1]?.before ?? null),
  }));
  const segments = [];
  for (let i = 0; i < decisions.length; i++) {
    const row = decisions[i]!;
    if (!str(row.label).startsWith("combat/plan-choice")) continue;
    const actions = [linkedActions[i]!];
    const interruptions: { decision_id: unknown; kind: string }[] = [];
    let boundary: { kind: string; decision_id: unknown } = { kind: "input_exhausted", decision_id: null };
    for (let j = i + 1; j < decisions.length; j++) {
      const next = decisions[j]!;
      if (context(next) !== context(row)) {
        boundary = { kind: "turn_room_or_attempt_changed", decision_id: next.decision_id }; break;
      }
      if (str(next.label).startsWith("combat/plan-choice")) {
        boundary = { kind: "superseded_by_question", decision_id: next.decision_id }; break;
      }
      if (next.screen === "CARD_SELECTION") interruptions.push({ decision_id: next.decision_id, kind: "card_selection" });
      actions.push(linkedActions[j]!);
      if (asRecord(next.chosen).action === "end_turn") {
        boundary = { kind: "end_turn_requested", decision_id: next.decision_id }; break;
      }
    }
    segments.push({
      decision_id: row.decision_id, source_line: numOrNull(row._line), floor: row.floor ?? null,
      turn: row.turn ?? null, attempt: row.sl_attempt ?? null, reloads: row.sl_reloads ?? null,
      predictions: predictedSelection(row), actions, interruptions, boundary,
      // A response acknowledges one action, not all steps or their effects. No imputed counterfactual.
      actual_full_candidate_result: null, actual_rollout_best: null,
      attribution: "仅关联已记录动作；选择、重问、排队回执或缺帧均不能证明完整候选已执行，整轮净扣不得归给该候选。",
    });
  }
  return { schema: 1, character: "silent", ascension: 10, run_id: runId, segments,
    observed_intervals: observedIntervals, observed_actions: linkedActions,
    limitations: ["同题唯一文字匹配仅定位日志候选，不证明隐藏卡牌身份或完整执行。",
      "completed 只代表动作接口回执；pending 不当成已生效。",
      "不拟合护栏、药水或SL阈值；不把预测排名、净HP变化或相关读档当胜率因果。",
      "相邻原始决策的前后快照仅描述观测区间，不能认证中间没有未落盘动作；持有手牌不等于已建立能力。",
      "缺原行号、跨尝试、非结束回合的跨轮或状态匹配不唯一时不连接后帧；敌人索引不作为跨帧实体身份。",
      "连续原决策的前后状态仅记观测差值；能力出现时点、净HP变化不证明单卡因果或完整候选收益；缺失能力列表不当零层。",
      "enemy_id 是类型；仅同名单唯一类型可比较端点，同类重复、增减员不推定实体身份或击杀。",
      "结束页尝试号为空只在已核结束回合/最终结束页的连续决策与状态中单列；零血净损不等于完整入伤，显示攻击减当前挡仅为算术参考。"] };
}
