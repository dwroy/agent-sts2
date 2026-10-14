import { createHash } from "node:crypto";
import type { QuestionSet } from "./questions.js";

type Row = Record<string, unknown>;
const record = (value: unknown): Row | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Row : null;
const pick = (row: Row, fields: readonly string[]): Row => Object.fromEntries(fields.filter((key) => Object.hasOwn(row, key)).map((key) => [key, row[key]]));

export interface DecisionProjection {
  state: Row;
  questions: QuestionSet;
  evidence: { state: unknown; questions: QuestionSet };
  contract: {
    schema: "silent-combat-decision-v1";
    sourceSha256: string;
    originalBytes: number;
    projectedBytes: number;
    sources: { question: string; candidate: string; field: string; source: string }[];
  };
}

const SUMMARY = ["n", "mean", "meanSe", "p10", "p90"] as const;

/** A decision view of existing results; no new ranking, arithmetic, threshold or game fact. */
export function projectSilentCombatDecision(state: unknown, questions: QuestionSet): DecisionProjection | null {
  const board = record(state), brief = record(board?.run_brief);
  if (!board || !["SILENT", "silent", "静默猎手"].includes(String(brief?.character))) return null;
  if (!["monster", "elite", "boss"].includes(String(board.fight))) return null;
  const sources: DecisionProjection["contract"]["sources"] = [];
  const projected: QuestionSet = {};
  let changed = false;
  for (const [questionId, question] of Object.entries(questions)) {
    if (!["plan", "pick"].includes(questionId) || question.type !== "choice") { projected[questionId] = question; continue; }
    const criteria: Record<string, string | null> = {};
    for (const [candidate, text] of Object.entries(question.criteria)) {
      let facts: Row | null = null;
      try { facts = text === null ? null : record(JSON.parse(text)); } catch { /* Prose is already a decision fact. */ }
      if (!facts) { criteria[candidate] = text; continue; }
      const view = { ...facts };
      const bind = (field: string, source: string) => sources.push({ question: questionId, candidate, field, source });
      if (Object.hasOwn(view, "rollout_turns")) { delete view.rollout_turns; changed = true; }
      const turn = record(facts.quantitative_turn);
      if (turn?.schema === "quantitative-v1") {
        // Intermediate actions, hands and boards stay in evidence, never in this wire contract.
        const summary = pick(turn, ["schema", "source", "kind", "window", "damage_hp", "block_gained", "hp_after", "energy_left", "planned_actions", "planned_card_actions", "complete_combinations", "limits", "unknown_cards"]);
        for (const key of Object.keys(summary)) bind(`turn_model.${key}`, `quantitative_turn.${key}`);
        const realization = record(turn.realization);
        if (realization) {
          summary.realization = pick(realization, ["model", "fingerprint", "evidence", "kind", "complete_line", "energy_paid", "prefix_energy_paid", "complete_combinations", "delayed_damage", "delayed_block", "unknown", "limits"]);
          for (const key of Object.keys(summary.realization as Row)) bind(`turn_model.realization.${key}`, `quantitative_turn.realization.${key}`);
        }
        delete view.quantitative_turn;
        view.turn_model = summary;
        changed = true;
      }
      const margin = record(facts.boss_relative_margin);
      if (margin?.schema === "boss-relative-margin-v1") {
        // Explicit small schema: never serialize the internal statistic object into the question.
        const summary = pick(margin, ["schema", "formula", "unit", "status", "rankingEligible", "samples", "valid", "missing", "reference", "window", "incomingScope", "referencesVary", "limits"]);
        for (const key of Object.keys(summary)) bind(`boss_evaluation.${key}`, `boss_relative_margin.${key}`);
        for (const key of ["score", "myDpr", "enemyDpr"] as const) {
          const statistic = record(margin[key]);
          if (statistic) {
            summary[key] = pick(statistic, SUMMARY);
            for (const field of Object.keys(summary[key] as Row)) bind(`boss_evaluation.${key}.${field}`, `boss_relative_margin.${key}.${field}`);
          } else if (Object.hasOwn(margin, key)) { summary[key] = margin[key]; bind(`boss_evaluation.${key}`, `boss_relative_margin.${key}`); }
        }
        const paired = record(margin.paired);
        if (paired) {
          const difference = record(paired.difference);
          summary.paired = { ...pick(paired, ["unmatchedBase", "unmatchedOption"]), ...(difference ? { difference: pick(difference, SUMMARY) } : Object.hasOwn(paired, "difference") ? { difference: paired.difference } : {}) };
          for (const field of ["unmatchedBase", "unmatchedOption"]) if (Object.hasOwn(paired, field)) bind(`boss_evaluation.paired.${field}`, `boss_relative_margin.paired.${field}`);
          if (difference) for (const field of Object.keys(pick(difference, SUMMARY))) bind(`boss_evaluation.paired.difference.${field}`, `boss_relative_margin.paired.difference.${field}`);
          else if (Object.hasOwn(paired, "difference")) bind("boss_evaluation.paired.difference", "boss_relative_margin.paired.difference");
        } else if (Object.hasOwn(margin, "paired")) { summary.paired = margin.paired; bind("boss_evaluation.paired", "boss_relative_margin.paired"); }
        delete view.boss_relative_margin;
        view.boss_evaluation = summary;
        changed = true;
      }
      if (Object.hasOwn(view, "damage_dealt") && view.dmg === view.damage_dealt) { delete view.dmg; changed = true; }
      criteria[candidate] = JSON.stringify(view);
    }
    projected[questionId] = { ...question, criteria };
  }
  if (!changed) return null;
  const projectedState = { ...board,
    ...(typeof board.boss_relative_margin_objective === "string" ? { boss_relative_margin_objective: board.boss_relative_margin_objective.replace("boss_relative_margin或bossMargin", "boss_evaluation") } : {}),
    jev_decision_contract: {
    schema: "silent-combat-decision-v1",
    responsibility: "只在原合法候选中选择当前战斗方案；计算、完整样本/信任闸及执行保护由代码负责。turn_model是当轮代价与终态摘要；boss_evaluation是同Boss窗口的条件模拟摘要。完整动作轨迹和统计分层仅审计落盘。",
    unknown: "缺失保持缺失/null，不补0；模型未校准不因样本完整而可信。S不是胜率，rankingEligible=false不得用于可信排序。原候选顺序、药水代价、机制限制、学习经验和执行保护保持。",
  } };
  const original = JSON.stringify({ state, questions });
  return { state: projectedState, questions: projected, evidence: { state, questions }, contract: {
    schema: "silent-combat-decision-v1", sourceSha256: createHash("sha256").update(original).digest("hex"),
    originalBytes: Buffer.byteLength(original), projectedBytes: Buffer.byteLength(JSON.stringify({ state: projectedState, questions: projected })), sources,
  } };
}
