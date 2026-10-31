import { readFileSync, realpathSync } from "node:fs";
import { join, relative, isAbsolute, dirname } from "node:path";
import { asArray, asRecord, bool, str, type JsonValue } from "../core/util/json.js";
import type { DecisionEnv } from "../memory/types.js";
import { mapActOf } from "../hand/screens/route-plan.js";
import { parsePotionEquivalents, potionEquivalentFrom } from "../knowledge/potion-equivalents.js";
import { KNOWLEDGE_DIR } from "../knowledge/files.js";
import { runtimeDataRoot } from "../knowledge/runtime-data.js";
import type { AnswerSet } from "../reflex/jev/answers.js";
import type { QuestionSet } from "../reflex/jev/questions.js";
import { currentDecisionBudget, DecisionBudget, withDecisionBudget, withinDecisionBudget } from "../core/decision-budget.js";
import { V6BuildLog } from "./log.js";
import { promptBudgetLabels } from "./prompt-summary.js";
import { v6Config } from "./config.js";
import { loadV6Knowledge } from "./knowledge.js";
import { evaluatePredicate } from "./predicate.js";
import { validateProjectionEntry, type DirectionWeights, type PotionDirection, type ProjectionEntry } from "./formats.js";

export interface PotionEntry {
  schema: "v6-potion-entry-v1";
  id: string;
  category: string | null;
  tier: PotionDirection["tier"];
  for: PotionDirection["for"] | null;
  reason: string | null;
  hold_hp: number | null;
  value_source: { source: string; n: number; table_ascension: number; inputs_ascension: number } | null;
  slots: { occupied: number; max: number };
  price: number | null;
  gold_after: number | null;
  trust: { current_boss: ProjectionEntry["trust"]; joint: ProjectionEntry["trust"] };
  comparisons: Array<{ slot: number; id: string; tier: PotionDirection["tier"]; hold_hp: number | null; hold_hp_delta: number | null }>;
  reflex: Array<{ id: string; label_en: string; signal: JsonValue; confidence: number; n_support: number; n_contradict: number }>;
}

/** Shops migrate in W7; combat and automatic reward claims keep their existing routes. */
export function v6PotionActive(env: DecisionEnv): boolean {
  const config = v6Config();
  return !env.v6BrainFallback && config.mode === "on" && config.deciders.potion === "jev" && !env.state.in_combat && env.state.screen !== "SHOP";
}

export function notePotionFallback(env: DecisionEnv, fallback: boolean): void {
  const run = str(env.state.raw["run_id"]), memory = env.screenMemory;
  const previous = memory.v6JevFallbackRun === run ? memory.v6JevFallbacks ?? 0 : 0;
  memory.v6JevFallbackRun = run;
  memory.v6JevFallbacks = fallback ? previous + 1 : 0;
}

/** The entire Jev attempt, including SDK retries, shares this wall-clock allowance. */
export async function withConstructionJevBudget<T>(stage: string, work: () => Promise<T>, scope: "L2" | "shadow" = "L2"): Promise<T> {
  const parent = currentDecisionBudget();
  const ms = v6Config().budgets.jev_ms;
  const running = parent?.running;
  parent?.pause();
  const budget = new DecisionBudget(stage, "routine", parent?.now, ms, 0);
  try { return await withDecisionBudget(budget, () => withinDecisionBudget(stage, work)); }
  finally {
    budget.pause();
    parent?.independent(stage, budget, scope);
    if (running) parent?.resume();
  }
}
export const withPotionJevBudget = <T>(work: () => Promise<T>): Promise<T> => withConstructionJevBudget("Jev_potion", work);

export function potionEntries(env: DecisionEnv, ids: string[], options: {
  dir?: string; prices?: Readonly<Record<string, number>>; tags?: Readonly<Record<string, string[]>>;
  trust?: PotionEntry["trust"];
} = {}): PotionEntry[] {
  const dir = options.dir ?? KNOWLEDGE_DIR;
  const raw = asRecord(env.state.run?.raw), character = str(raw["character_id"]);
  const knowledge = loadV6Knowledge(dir, character);
  const ascension = env.state.run?.ascension ?? 0;
  const belt = asArray(raw["potions"]).map(asRecord);
  const held = belt.filter(slot => bool(slot["occupied"]));
  const plan = (env.screenMemory.runPlan as { v6?: DirectionWeights } | undefined)?.v6;
  const projectionTrust = (targets: string[]): ProjectionEntry["trust"] => {
    const directions = Object.keys(plan?.direction_weights ?? {}).filter(id => (plan?.direction_weights[id] ?? 0) > 0);
    if (!directions.length || !targets.length) return "unknown";
    const entries = (env.v6DirectionEvaluation?.entries ?? []).filter(e => targets.includes(e.target_id) && directions.includes(e.direction_id) && validateProjectionEntry(e).ok);
    if (targets.some(target => directions.some(id => !entries.some(e => e.direction_id === id && e.target_id === target)))) return "unknown";
    const trusts = new Set(entries.map(e => e.trust));
    // Mixed bias signs cannot be collapsed into a calibrated confidence label.
    return trusts.size === 1 ? entries[0]!.trust : "unknown";
  };
  const targets = env.v6DirectionEvaluation?.targets;
  const trust = options.trust ?? {
    current_boss: projectionTrust(targets ? targets.filter(t => t.kind === "current").map(t => t.id) : [str(raw["boss_id"]) || "current_boss"]),
    joint: projectionTrust(targets ? targets.filter(t => t.kind === "chain").map(t => t.id) : ["joint"]),
  };
  const publishedTags = new Set(knowledge.vocab.status === "loaded" ? knowledge.vocab.value.dimensions.potion_category.map(tag => tag.id) : []);
  let table: ReturnType<typeof parsePotionEquivalents> | null = null;
  if (knowledge.character) {
    try {
      const dataDir = runtimeDataRoot(dir, `characters/${knowledge.character}/potion-equivalents.json`);
      const root = realpathSync(join(dataDir, "characters", knowledge.character));
      const path = realpathSync(join(root, "potion-equivalents.json"));
      const rel = relative(root, path);
      if (root === join(realpathSync(dataDir), "characters", knowledge.character) && !rel.startsWith("..") && !isAbsolute(rel)) {
        table = parsePotionEquivalents(readFileSync(path, "utf8"), path, true);
      }
    } catch { /* Missing character-owned values remain unknown. */ }
  }
  const worth = (id: string) => table ? potionEquivalentFrom(table, id, mapActOf(env.state), ascension) : null;
  const direction = (id: string, category: string | null) => plan?.potion_directions.find(d => d.potion === id)
    ?? (category && publishedTags.has(category) ? plan?.potion_directions.find(d => d.potion === category) : undefined);
  return ids.map(id => {
    const value = worth(id), category = value?.category ?? table?.potions[id]?.category ?? null;
    const advice = direction(id, category);
    const price = options.prices?.[id];
    const tags = [...new Set([...(options.tags?.[id] ?? []), ...(category ? [category] : [])])].filter(tag => publishedTags.has(tag));
    const context = { act: mapActOf(env.state), floor: env.state.run?.floor, player: { hp: env.state.run?.current_hp },
      potion: { tags }, direction_weights: plan?.direction_weights ?? {} };
    const reflex = v6Config().reflex === "on" && knowledge.reflex.status === "loaded" ? knowledge.reflex.value.filter(entry => entry.applies_to === "potion"
      && entry.scope.ascensions.includes(ascension) && (!entry.directions || entry.directions.some(d => (plan?.direction_weights[d] ?? 0) > 0))
      && evaluatePredicate(entry.predicate, context) === true).map(entry => ({ id: entry.id, label_en: entry.label_en,
      signal: entry.signal as JsonValue, confidence: entry.confidence, n_support: entry.evidence.n_support, n_contradict: entry.evidence.n_contradict })) : [];
    return { schema: "v6-potion-entry-v1", id, category, tier: advice?.tier ?? "normal", for: advice?.for ?? null, reason: advice?.reason ?? null,
      hold_hp: value?.holdHp ?? null, value_source: value ? { source: value.source, n: value.n, table_ascension: value.tableAscension, inputs_ascension: value.inputsAscension } : null,
      slots: { occupied: held.length, max: belt.length }, price: typeof price === "number" && Number.isFinite(price) && price >= 0 ? price : null,
      gold_after: typeof price === "number" && Number.isFinite(price) && price >= 0 && env.state.run?.gold != null ? env.state.run.gold - price : null,
      trust,
      comparisons: held.map(slot => {
        const heldId = str(slot["potion_id"]), heldValue = worth(heldId);
        return { slot: Number(slot["index"]), id: heldId, tier: direction(heldId, heldValue?.category ?? null)?.tier ?? "normal", hold_hp: heldValue?.holdHp ?? null,
          hold_hp_delta: value && heldValue ? value.holdHp - heldValue.holdHp : null };
      }), reflex };
  });
}

const tierRank = { avoid: 0, normal: 1, prefer: 2, must: 3 };
/** Invalid slot answers must count toward the same fallback streak as request failures. */
export function potionAnswersComplete(questions: QuestionSet, answers: AnswerSet): boolean {
  return Object.entries(questions).every(([key, question]) => {
    const answer = answers[key];
    if (!answer || answer.type !== question.type) return false;
    if (answer.type === "noul") return Number.isFinite(answer.noul) && answer.noul >= 0 && answer.noul <= 1;
    return answer.type === "choice" && question.type === "choice" && Object.hasOwn(question.criteria, answer.choice)
      && Number.isFinite(answer.confidence) && answer.confidence >= 0 && answer.confidence <= 1;
  });
}
/** Preserve usable partial slot answers, but never execute a malformed choice. */
export function validPotionAnswers(questions: QuestionSet, answers: AnswerSet): AnswerSet {
  return Object.fromEntries(Object.entries(answers).filter(([key, answer]) => {
    const question = questions[key];
    return question && potionAnswersComplete({ [key]: question }, { [key]: answer });
  }));
}
/** Acquisition excludes avoid. Unknown values sort after measured values within the same tier. */
export function rankPotions(entries: PotionEntry[]): PotionEntry[] {
  return entries.filter(entry => entry.tier !== "avoid").map((entry, index) => ({ entry, index }))
    .sort((a, b) => tierRank[b.entry.tier] - tierRank[a.entry.tier]
      || (b.entry.hold_hp ?? -Infinity) - (a.entry.hold_hp ?? -Infinity) || a.index - b.index).map(item => item.entry);
}

/** Discard the lowest tier first, then the lowest known holding value; unknown is not zero. */
export function rankPotionDiscards(entries: PotionEntry[]): PotionEntry[] {
  return entries.map((entry, index) => ({ entry, index })).sort((a, b) => tierRank[a.entry.tier] - tierRank[b.entry.tier]
    || (a.entry.hold_hp ?? Infinity) - (b.entry.hold_hp ?? Infinity) || a.index - b.index).map(item => item.entry);
}

/** Ordinary decision logs retain the full potion entries; this row supplies the V6 audit join. */
export function recordPotionJev(env: DecisionEnv, runPlanLog: string, questionId: string, answers: AnswerSet, fallback: string | null, elapsedMs: number,
  promptState: Record<string, JsonValue> = {}): void {
  const character = loadV6Knowledge(KNOWLEDGE_DIR, str(asRecord(env.state.run?.raw)["character_id"])).character;
  if (!character || !v6PotionActive(env)) return;
  const potions = potionEntries(env, asArray(asRecord(env.state.run?.raw)["potions"]).map(asRecord).filter(p => bool(p["occupied"])).map(p => str(p["potion_id"])));
  const choices = Object.entries(answers).flatMap(([key, answer]) => answer.type === "noul" && answer.noul >= .5 ? [key] : answer.type === "choice" ? [answer.choice] : []);
  const confidence = Object.values(answers).flatMap(a => a.type === "choice" && typeof a.confidence === "number" && Number.isFinite(a.confidence) && a.confidence >= 0 && a.confidence <= 1 ? [a.confidence] : []);
  new V6BuildLog(v6Config(), join(dirname(runPlanLog), "v6-build.jsonl")).append({
    schema: "v6-build-log-v1", ts: new Date().toISOString(), run_id: str(env.state.raw["run_id"]), character,
    question_id: questionId, kind: "potion", mode: "on", entries: [], jev_answer: Object.keys(answers).length ? { choice: choices.join("_") || "keep", confidence: confidence.length ? Math.min(...confidence) : null } : null,
    fallback, elapsed_ms: elapsedMs, cache: { hits: 0, misses: 0 }, degradation: promptBudgetLabels(promptState),
    unknown: { count: potions.filter(p => p.hold_hp === null || p.trust.current_boss === "unknown" || p.trust.joint === "unknown").length, total: potions.length }, triggers: [], merged_triggers: [], skipped_triggers: [],
  });
}
