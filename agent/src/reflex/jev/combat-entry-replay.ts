/** Offline only. Frozen candidates and paired model outcomes are never executed in the game. */
import { createHash } from "node:crypto";
import { plain, safeKey, validate } from "../../v6/schema.js";
import { reflexFile } from "../../v6/knowledge.js";
import { replaySelectedCombatEntries } from "../../v6/combat-entry-selection.js";
import { validateReflexVocab } from "../../v6/formats.js";
import { contrastInterval } from "../../v6/contrast-statistics.js";
import { combatMemory } from "./combat-entries.js";
import { projectSilentCombatDecision } from "./decision-projection.js";
import { MAX_CHOICE_OPTIONS, type QuestionSet } from "./questions.js";

type Row = Record<string, unknown>;
export const replayHash = (v: unknown): string => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const requireRow = (v: unknown, label: string): Row => { if (!plain(v)) throw Error(`${label}: object required`); return v; };
const integer = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;
export type ReplayArm = "baseline" | "memory";
export interface ReplayRequest { state: Row; questions: QuestionSet }
export interface ReplayPair {
  baseline: ReplayRequest; memory: ReplayRequest; question_id: string;
  matched: Record<string, string[]>; unknown: Record<string, string[]>;
  knowledge_sha256: string;
}

/** Use an offline planner capture with the normal V6 audit, never parse facts from prose. */
export function prepareCombatEntryReplay(raw: unknown): ReplayPair {
  const request = requireRow(raw, "request"), board = structuredClone(requireRow(request.state, "state"));
  const audit = requireRow(board.v6_combat_entries, "v6_combat_entries");
  if (audit.schema !== "v6-combat-entries-audit-v1" || audit.character !== "silent" || !integer(audit.ascension)) throw Error("Silent combat audit required");
  if (!["boss", "elite"].includes(String(board.fight))) throw Error("Boss/elite replay required");
  const context = requireRow(audit.context, "audit context");
  if (![1, 2, 3].includes(Number(context.act)) || !Number.isInteger(context.act)
    || context.act === 3 && board.fight !== "boss") throw Error("acts 1/2 Boss/elite or act 3 Boss replay required");
  const knowledge = requireRow(audit.knowledge, "knowledge");
  const source = requireRow(knowledge.reflex, "reflex"), vocabSource = requireRow(knowledge.vocab, "vocab");
  const file = validate(reflexFile, { schema: "reflex-file-v1", character: "silent", entries: source.entries });
  const vocab = validateReflexVocab(vocabSource.value);
  if (!file.ok || !vocab.ok || vocab.value.character !== "silent"
    || source.sha256 !== replayHash(file.ok ? file.value.entries : null) || vocabSource.sha256 !== replayHash(vocab.ok ? vocab.value : null)) throw Error("invalid or changed knowledge audit");
  const tags = new Set(Object.values(vocab.value.dimensions).flat().map(m => m.id));
  if (file.value.entries.some(e => e.signal.kind === "tag" && !tags.has(e.signal.value))) throw Error("unknown vocabulary reference");
  const selectedEntries = replaySelectedCombatEntries(file.value.entries, String(audit.character), context, audit.selection);
  if (audit.selection !== undefined && selectedEntries.some(e => e.applies_to !== "combat_line" || !e.scope.ascensions.includes(audit.ascension as number)))
    throw Error("combat entry selection contains out-of-scope entries");
  const questions = structuredClone(requireRow(request.questions, "questions")) as unknown as QuestionSet;
  const keys = Object.keys(questions);
  if (keys.length !== 1 || !["plan", "pick"].includes(keys[0]!)) throw Error("one frozen plan/pick question required");
  const questionId = keys[0]!, question = questions[questionId]!;
  if (question.type !== "choice" || typeof question.instructions !== "string" || !plain(question.criteria)
    || !Object.keys(question.criteria).length || Object.keys(question.criteria).length > MAX_CHOICE_OPTIONS) throw Error("invalid choice question");
  const matched: Record<string, string[]> = {}, unknown: Record<string, string[]> = {};
  const memories: Record<string, ReturnType<typeof combatMemory>["memory"]> = {};
  for (const [key, text] of Object.entries(question.criteria)) {
    if (!safeKey(key)) throw Error("unsafe candidate key");
    if (typeof text !== "string") throw Error("structured candidate facts required");
    const facts = requireRow(JSON.parse(text), "candidate"), candidate = requireRow(facts.v6_combat_entry, "candidate audit");
    if (candidate.schema !== "v6-combat-entry-audit-v1") throw Error("candidate audit missing");
    const candidateContext = requireRow(candidate.context, "candidate context");
    replaySelectedCombatEntries(file.value.entries, String(audit.character), candidateContext, audit.selection);
    const result = combatMemory({ entries: selectedEntries, ascension: audit.ascension, vocab: vocab.value, provenance: knowledge },
      candidateContext);
    memories[key] = result.memory;
    matched[key] = result.memory.map(m => m.id);
    unknown[key] = result.evaluated.filter(e => e.result === null).map(e => e.id);
    // Strip all audit payloads before building the identical V5 base for both arms.
    delete facts.v6_combat_entry;
    if (Object.hasOwn(facts, "combat_memory")) throw Error("base already contains combat memory");
    question.criteria[key] = JSON.stringify(facts);
  }
  delete board.v6_combat_entries;
  if (Object.hasOwn(board, "open_book")) throw Error("Jev replay must not include open book");
  const projection = projectSilentCombatDecision(board, questions);
  const baseline = { state: projection?.state ?? board, questions: projection?.questions ?? questions } as ReplayRequest;
  const memory = structuredClone(baseline);
  for (const [key, text] of Object.entries(memory.questions[questionId]!.type === "choice" ? memory.questions[questionId]!.criteria : {})) {
    const facts = requireRow(JSON.parse(text!), "projected candidate");
    facts.combat_memory = memories[key];
    (memory.questions[questionId]! as { criteria: Record<string, string> }).criteria[key] = JSON.stringify(facts);
  }
  return { baseline, memory, question_id: questionId, matched, unknown, knowledge_sha256: replayHash(knowledge) };
}

/** Full common-random-number matrix. Partial/horizon results never become fight wins. */
export interface ReplayOutcomes {
  schema: "combat-entry-outcomes-v1";
  kind: "model"; model_sha256: string; scope: "whole_fight" | "horizon";
  rows: { candidate: string; seed: string; hp_loss: number | null; win: boolean | null }[];
}
export function parseReplayOutcomes(raw: unknown, candidates: readonly string[]): ReplayOutcomes {
  const v = requireRow(raw, "outcomes");
  if (v.schema !== "combat-entry-outcomes-v1" || v.kind !== "model" || !/^[a-f0-9]{64}$/.test(String(v.model_sha256))
    || !["whole_fight", "horizon"].includes(String(v.scope)) || !Array.isArray(v.rows) || !v.rows.length) throw Error("invalid outcome header");
  const seen = new Set<string>(), seeds = new Map<string, Set<string>>();
  for (const rawRow of v.rows) {
    const r = requireRow(rawRow, "outcome row");
    if (typeof r.candidate !== "string" || !candidates.includes(r.candidate) || typeof r.seed !== "string" || !r.seed
      || !(r.hp_loss === null || typeof r.hp_loss === "number" && Number.isFinite(r.hp_loss) && r.hp_loss >= 0)
      || !(r.win === null || typeof r.win === "boolean") || v.scope === "horizon" && r.win !== null) throw Error("invalid outcome sample");
    const key = JSON.stringify([r.candidate, r.seed]);
    if (seen.has(key)) throw Error("duplicate candidate/seed sample");
    seen.add(key);
    const set = seeds.get(r.candidate) ?? new Set<string>(); set.add(r.seed); seeds.set(r.candidate, set);
  }
  const reference = [...seeds.values()][0]!;
  if (candidates.some(c => seeds.get(c)?.size !== reference.size || [...reference].some(seed => !seeds.get(c)?.has(seed)))) throw Error("complete shared-seed matrix required for every candidate");
  return v as unknown as ReplayOutcomes;
}

export interface ReplayObservation {
  id: string; run_id: string; stratum: string; pair: ReplayPair;
  choices: Record<ReplayArm, string | null>; outcomes: ReplayOutcomes | null;
  jev_models?: Record<ReplayArm, string | null>;
}
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
/** Equal weight per independent run, after averaging seeds and boards within that run. */
function interval(rows: { run_id: string; value: number }[]) {
  const groups = new Map<string, number[]>();
  for (const r of rows) groups.set(r.run_id, [...(groups.get(r.run_id) ?? []), r.value]);
  const values = [...groups.values()].map(mean), n = values.length;
  if (!n) return { mean: null, se: null, interval: null, independent_runs: 0, boards: rows.length };
  const value = mean(values);
  const se = n < 2 ? null : Math.sqrt(values.reduce((s, v) => s + (v - value) ** 2, 0) / (n - 1) / n);
  // Constant observed deltas are a point interval under this sampling model, never zero model bias.
  const ci = se === null ? null : se === 0 ? { level: .95, lower: value, upper: value } : contrastInterval(value, se, n);
  return { mean: value, se, interval: ci, independent_runs: n, boards: rows.length };
}
export function summarizeCombatEntryReplay(observations: readonly ReplayObservation[]) {
  if (new Set(observations.map(o => o.id)).size !== observations.length) throw Error("duplicate replay case");
  const rows = observations.map(o => {
    const question = o.pair.baseline.questions[o.pair.question_id]!;
    if (question.type !== "choice") throw Error("choice required");
    const candidates = Object.keys(question.criteria);
    for (const arm of ["baseline", "memory"] as const) if (o.choices[arm] !== null && !candidates.includes(o.choices[arm]!)) throw Error("unknown selected candidate");
    const outcomes = o.outcomes ? parseReplayOutcomes(o.outcomes, candidates) : null;
    const a = o.choices.baseline, b = o.choices.memory;
    const selected = a !== null && b !== null;
    const first = outcomes?.rows.filter(r => r.candidate === a) ?? [];
    const second = outcomes?.rows.filter(r => r.candidate === b) ?? [];
    const completeHp = selected && first.length > 0 && [...first, ...second].every(r => r.hp_loss !== null);
    const completeWin = selected && outcomes?.scope === "whole_fight" && first.length > 0 && [...first, ...second].every(r => r.win !== null);
    return { id: o.id, run_id: o.run_id, stratum: o.stratum, choices: o.choices,
      jev_models: o.jev_models ?? { baseline: null, memory: null },
      changed: selected ? a !== b : null, matched: o.pair.matched, unknown: o.pair.unknown,
      outcome_kind: outcomes?.kind ?? null, outcome_scope: outcomes?.scope ?? null, model_sha256: outcomes?.model_sha256 ?? null,
      samples_per_candidate: first.length || null,
      hp_saved: completeHp ? mean(first.map(r => r.hp_loss!)) - mean(second.map(r => r.hp_loss!)) : null,
      win_gain: completeWin ? mean(second.map(r => Number(r.win))) - mean(first.map(r => Number(r.win))) : null };
  });
  const group = (subset: typeof rows) => ({ cases: subset.length, answered_pairs: subset.filter(r => r.changed !== null).length,
    changed_choices: subset.filter(r => r.changed === true).length,
    hp_saved: interval(subset.flatMap(r => r.hp_saved === null ? [] : [{ run_id: r.run_id, value: r.hp_saved }])),
    win_gain: interval(subset.flatMap(r => r.win_gain === null ? [] : [{ run_id: r.run_id, value: r.win_gain }])),
    missing_hp: subset.filter(r => r.hp_saved === null).map(r => r.id), missing_win: subset.filter(r => r.win_gain === null).map(r => r.id) });
  // Different models and evaluation horizons are never pooled into one apparent effect.
  const stratumKey = (r: typeof rows[number]) => JSON.stringify([r.stratum, r.model_sha256, r.outcome_scope, r.jev_models]);
  const strata = [...new Set(rows.map(stratumKey))].map(key => {
    const subset = rows.filter(r => stratumKey(r) === key), first = subset[0]!;
    return { stratum: first.stratum, model_sha256: first.model_sha256, scope: first.outcome_scope,
      jev_models: first.jev_models, ...group(subset) };
  });
  return { schema: "combat-entry-replay-report-v1", cases: rows.length, rows, strata,
    recommendation: "keep_off_pending_learner_evidence_Roy_and_AB", enable_authorized: false,
    limits: "Paired frozen Jev choices evaluated on supplied model outcomes, not actual counterfactual HP or A/B wins. 95% t intervals over equal-weight independent run means exclude model bias and Jev sampling variability. Missing outcomes stay unknown; repeated turns/seeds are not independent runs. No automatic publication." };
}
