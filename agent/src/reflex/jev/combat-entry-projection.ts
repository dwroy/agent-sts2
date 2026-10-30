import { createHash } from "node:crypto";
import { projectSilentCombatDecision, type DecisionProjection } from "./decision-projection.js";
import type { QuestionSet } from "./questions.js";
import { combatEntrySelectionConfig, selectedCombatEntries } from "../../v6/combat-entry-selection.js";

type Row = Record<string, unknown>;
const record = (v: unknown): Row | null => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Row : null;

/** Keep the existing V5 transport byte-for-byte unless W8 built a validated, role-local audit. */
export function projectCombatDecision(state: unknown, questions: QuestionSet, env: NodeJS.ProcessEnv = process.env): DecisionProjection | null {
  const base = projectSilentCombatDecision(state, questions);
  const originalBoard = record(state), audit = record(originalBoard?.v6_combat_entries);
  if (env["V6_COMBAT_ENTRIES"] !== "on" || audit?.schema !== "v6-combat-entries-audit-v1") return base;
  const selector = combatEntrySelectionConfig(env["V6_COMBAT_ENTRY_SELECTION"]);
  if (selector.mode !== "legacy" && audit.character === "silent") {
    const context = record(audit.context);
    const known = selector.mode === "restricted" ? Object.values(selector.bosses).flat().map(id => ({ id })) : [];
    const selected = context && selectedCombatEntries(known, "silent", context, selector);
    // A changed deployment selection cannot reuse an audit built for another subset.
    if (!selected?.selection || JSON.stringify(selected.selection) !== JSON.stringify(audit.selection)) return base;
  }
  if (!["monster", "elite", "boss"].includes(String(originalBoard?.fight))) return base;
  const sources = [...(base?.contract.sources ?? [])];
  const stateSources: NonNullable<DecisionProjection["contract"]["stateSources"]> = [];
  const projected: QuestionSet = {};
  for (const [questionId, question] of Object.entries(base?.questions ?? questions)) {
    if (!["plan", "pick"].includes(questionId) || question.type !== "choice") { projected[questionId] = question; continue; }
    const criteria: Record<string, string | null> = {};
    for (const [candidate, text] of Object.entries(question.criteria)) {
      let facts: Row | null = null;
      try { facts = text === null ? null : record(JSON.parse(text)); } catch { /* Preserve non-JSON choices. */ }
      const entry = record(facts?.v6_combat_entry);
      if (!facts || entry?.schema !== "v6-combat-entry-audit-v1") { criteria[candidate] = text; continue; }
      const view = { ...facts };
      delete view.v6_combat_entry;
      // No text parsing, inferred classifications or invented replacement numbers.
      for (const key of Object.keys(view)) if (["whole_fight_sim", "history_estimate"].includes(key) || key.startsWith("rollout") && typeof view[key] === "string") delete view[key];
      const simulation: Row = { basis: entry.basis };
      sources.push({ question: questionId, candidate, field: "simulation.basis", source: "v6_combat_entry.basis" });
      if (entry.selection) {
        simulation.selection = entry.selection;
        sources.push({ question: questionId, candidate, field: "simulation.selection", source: "v6_combat_entry.selection" });
      }
      for (const kind of ["rollout", "whole_fight"]) {
        const raw = record(entry[kind]);
        if (!raw) continue;
        const summary = Object.fromEntries(Object.entries(raw).filter(([key]) => key !== "evidence"));
        simulation[kind] = summary;
        for (const field of Object.keys(summary)) sources.push({ question: questionId, candidate,
          field: `simulation.${kind}.${field}`, source: `v6_combat_entry.${kind}.${field}` });
      }
      view.simulation = simulation;
      view.combat_memory = entry.memory;
      sources.push({ question: questionId, candidate, field: "combat_memory", source: "v6_combat_entry.memory" });
      criteria[candidate] = JSON.stringify(view);
    }
    projected[questionId] = { ...question, criteria };
  }
  const board: Row = { ...(base?.state ?? originalBoard) };
  delete board.v6_combat_entries;
  // The original simulation narrative, trust reason and plan remain intact in decision_evidence.
  for (const key of ["whole_fight_sim", "whole_fight_plan", "whole_fight_sim_trust", "simulation_completion"]) delete board[key];
  const source = record(audit.run_plan_source);
  if (typeof board.deepseek_plan === "string") {
    board.run_plan = { source, text: board.deepseek_plan.replace(/^DeepSeek's run plan/, "Run plan") };
    delete board.deepseek_plan;
    stateSources.push({ field: "run_plan.source", source: "v6_combat_entries.run_plan_source" });
    stateSources.push({ field: "run_plan.text", source: "deepseek_plan", transform: "replace_header_DeepSeek_run_plan_with_Run_plan" });
  }
  board.jev_decision_contract = {
    schema: "v6-combat-decision-v1", hp_unit: "hp", win_probability_unit: "probability_0_1",
    unknown: "null_or_missing", simulation_scope: "conditional_model_not_guarantee",
    turn_model: "current_turn_cost_and_end_state", boss_evaluation: "conditional_margin_not_win_probability_existing_rankingEligible_gate",
    sample_uncertainty_excludes: "model_bias", low_trust_numbers: "information_only_existing_rank_gate",
    memory_signal: "learner_estimate_or_vocab_enum_not_added_to_simulation",
    missing_predicate: "unknown_not_matched", audit: "decision_evidence",
  };
  const original = JSON.stringify({ state, questions });
  return { state: board, questions: projected, evidence: { state, questions }, contract: {
    schema: "v6-combat-decision-v1", sourceSha256: createHash("sha256").update(original).digest("hex"),
    originalBytes: Buffer.byteLength(original), projectedBytes: Buffer.byteLength(JSON.stringify({ state: board, questions: projected })), sources, stateSources,
  } };
}
