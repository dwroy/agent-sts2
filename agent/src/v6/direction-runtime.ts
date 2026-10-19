import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, relative, isAbsolute } from "node:path";
import { asArray, asRecord, str, toJsonValue, type JsonValue } from "../core/util/json.js";
import type { DecisionEnv } from "../memory/types.js";
import type { Brain, BrainMetaUsage } from "../brain/brain.js";
import { actOf, hpFraction, loadRunPlan, logRunPlan, runPlanInput } from "../memory/run-plan.js";
import { KNOWLEDGE_DIR } from "../knowledge/files.js";
import { parsePotionEquivalents } from "../knowledge/potion-equivalents.js";
import { loadConstructionData } from "../construction/data.js";
import { loadConstructionSupport } from "../construction/support.js";
import { deckEntries } from "../memory/deck.js";
import { actStartMap, mapFromState, makeRoutePlan, routeCosts } from "../hand/screens/route-plan.js";
import { routeIds, routeView } from "../sim/route-map.js";
import { v6Config } from "./config.js";
import { loadV6Knowledge } from "./knowledge.js";
import { directionContext, directionSummaries, directionTask, type DirectionSummary } from "./direction-plan.js";
import { validateDirectionWeights, validateProjectionEntry, type Character } from "./formats.js";
import { detectReplan, freshReplanState, reserveReplan, type ReplanState, type TriggerResult } from "./replan-triggers.js";
import { V6BuildLog } from "./log.js";

export interface DirectionPlannerMemory {
  scheduler: ReplanState; appearedCards: string[]; relics: string[]; observed?: boolean;
}
export function v6Directions(env: DecisionEnv, dir = KNOWLEDGE_DIR): DirectionSummary[] {
  if (v6Config().mode === "off") return [];
  const character = str(asRecord(env.state.run?.raw)["character_id"]).toLowerCase();
  const knowledge = loadV6Knowledge(dir, character);
  const construction = loadConstructionData(character, dir);
  return directionSummaries(character, env.state.run?.ascension ?? 0,
    knowledge.directions.status === "loaded" ? knowledge.directions.value : [], construction?.templates ?? [],
    construction ? loadConstructionSupport(character, construction.templates, dir) : null);
}
export function v6DirectionActive(env: DecisionEnv): boolean { return v6Config().mode === "on" && v6Directions(env).length > 0; }

function memory(env: DecisionEnv, logFile: string): DirectionPlannerMemory {
  const run = str(env.state.raw["run_id"]);
  if (env.screenMemory.v6Planner?.scheduler.run === run) return env.screenMemory.v6Planner;
  let calls = 0, lastTurn: string | undefined, lastAct = 0, restored: DirectionPlannerMemory | undefined;
  // Restart recovery uses only this run's durable reservations, never another character's plan.
  try { for (const line of readFileSync(logFile, "utf8").split("\n")) {
    try { const row = asRecord(JSON.parse(line)); if (row["run"] === run && Number.isInteger(row["v6_brain_calls"])) {
      calls = Math.max(calls, Number(row["v6_brain_calls"]));
      if (typeof row["v6_turn"] === "string") lastTurn = row["v6_turn"];
      if (typeof row["v6_act"] === "number") lastAct = row["v6_act"];
    }
    if (row["run"] === run) {
      const saved = asRecord(row["v6_state"]), scheduler = asRecord(saved["scheduler"]);
      if (scheduler["run"] === run && Number.isInteger(scheduler["calls"]) && Number.isInteger(scheduler["act"]) && typeof scheduler["streaks"] === "object"
        && Array.isArray(saved["appearedCards"]) && Array.isArray(saved["relics"])) restored = saved as unknown as DirectionPlannerMemory;
    }
    } catch { /* Incomplete final line. */ }
  } } catch { /* First call. */ }
  const plan = env.screenMemory.runPlan?.runId === run ? env.screenMemory.runPlan : loadRunPlan(logFile, run);
  const scheduler = freshReplanState(run); scheduler.calls = calls;
  scheduler.lastTurn = lastTurn; scheduler.act = lastAct;
  if (plan?.v6) scheduler.act = plan.act;
  if (restored) { restored.scheduler.calls = Math.max(calls, restored.scheduler.calls); return env.screenMemory.v6Planner = restored; }
  return env.screenMemory.v6Planner = { scheduler, appearedCards: [], relics: [] };
}
/** Count all non-combat brain questions, including failures, before issuing them. */
export function noteV6BrainCall(env: DecisionEnv, logFile: string): void {
  if (!v6DirectionActive(env) || env.state.in_combat) return;
  const s = memory(env, logFile).scheduler;
  s.calls++;
  logRunPlan(logFile, { run: s.run, v6_brain_calls: s.calls });
}
export interface DirectionPlanAttempt { result: TriggerResult; payload: Record<string, JsonValue> | null; stored: boolean; usage?: BrainMetaUsage }

/** The loop calls once per observed non-combat decision, before a card or room question. */
export async function ensureDirectionPlan(env: DecisionEnv, brain: Pick<Brain, "askJson">, logFile: string,
  dir = KNOWLEDGE_DIR): Promise<DirectionPlanAttempt | null> {
  const config = v6Config();
  if (config.mode === "off" || env.state.in_combat) return null;
  const summaries = v6Directions(env, dir);
  if (!summaries.length) return null;
  const { state, screenMemory } = env, run = str(state.raw["run_id"]);
  if (!run) return null;
  if (!screenMemory.runPlan || screenMemory.runPlan.runId !== run) screenMemory.runPlan = loadRunPlan(logFile, run);
  const m = memory(env, logFile), raw = asRecord(state.run?.raw), before = JSON.stringify(m);
  const cards = deckEntries(state, env.knowledge).map(c => c.card_id);
  const offers = [...asArray(asRecord(state.raw["reward"])["card_options"]), ...asArray(asRecord(state.raw["selection"])["cards"])]
    .map(c => str(asRecord(c)["card_id"])).filter(Boolean);
  m.appearedCards = [...new Set([...m.appearedCards, ...cards, ...offers])];
  const relics = asArray(raw["relics"]).map(c => str(asRecord(c)["relic_id"])).filter(Boolean);
  const provided = env.v6DirectionEvaluation;
  const validEntries = (provided?.entries ?? []).filter(e => validateProjectionEntry(e).ok && summaries.some(s => s.id === e.direction_id));
  const targets = validEntries.length ? [...new Set(validEntries.map(e => e.target_id))] : [str(raw["boss_id"]) || "unknown_boss", "joint"];
  const entries = [...validEntries, ...summaries.flatMap(s => targets.filter(target => !validEntries.some(e => e.direction_id === s.id && e.target_id === target)).map(target => ({
    schema: "projection-entry-v1" as const, option_id: "current", direction_id: s.id, target_id: target,
    win: null, paired_delta: null, losing_boss_hp_fraction: null, winning_player_hp_fraction: null, turns: null,
    joint_win: null, joint_paired_delta: null, availability: { take: null, skip: null }, weighted_current_boss_delta: null,
    weighted_joint_delta: null, deck_count_change: null, core_first_cast_turn: null, win_tier: "unknown" as const,
    delta_tier: "unknown" as const, direction_role: "unknown" as const, trust: "unknown" as const, reflex_ids: [],
  })))];
  const evaluation = { ...provided, id: provided?.id ?? JSON.stringify([cards, relics, actOf(state)]), entries,
    acquiredComponentIds: [...(provided?.acquiredComponentIds ?? []), ...(m.observed ? relics.filter(id => !m.relics.includes(id)) : [])] };
  m.relics = relics;
  m.observed = true;
  const requirements = new Set(summaries.flatMap(s => asArray(s.requirements).flatMap(r => asArray(asRecord(r)["any"]).map(c => str(asRecord(c)["id"])))));
  const act = actOf(state), floor = state.run?.floor ?? 0;
  // Non-combat turn identity: room/floor, not polls or animations within it.
  const turnKey = `${run}:${act}:${floor}:${state.turn ?? "room"}`;
  const result = detectReplan(m.scheduler, { act, floor, turnKey, plan: screenMemory.runPlan?.v6, evaluation, requirementIds: requirements }, config);
  if (JSON.stringify(m) !== before) logRunPlan(logFile, { run, v6_state: toJsonValue(m) });
  const log = new V6BuildLog(config, join(dirname(logFile), "v6-build.jsonl"));
  if (result.triggers.length) log.append({ schema: "v6-build-log-v1", ts: new Date().toISOString(), run_id: run,
    character: str(raw["character_id"]).toLowerCase() as Character, question_id: `direction_${act}_${floor}`, kind: result.triggers.includes("act_start") ? "act" : "replan", mode: config.mode,
    entries, jev_answer: null, fallback: null, elapsed_ms: 0, cache: { hits: 0, misses: 0 }, degradation: provided ? [] : ["projection_provider_unavailable"],
    unknown: { count: entries.filter(e => e.trust === "unknown").length, total: entries.length }, triggers: result.triggers, merged_triggers: result.merged, skipped_triggers: result.skipped });
  if (!result.ask || config.mode !== "on") return { result, payload: null, stored: false };
  const data = loadV6Knowledge(dir, str(raw["character_id"]));
  let tableIds: string[] = [];
  try {
    if (!data.character) throw new Error("Unknown character");
    const root = realpathSync(join(dir, "characters", data.character));
    const path = realpathSync(join(root, "potion-equivalents.json")), rel = relative(root, path);
    if (root === join(realpathSync(dir), "characters", data.character) && !rel.startsWith("..") && !isAbsolute(rel)) {
      tableIds = Object.keys(parsePotionEquivalents(readFileSync(path, "utf8"), path, true).potions).filter(id => env.knowledge.potion(id));
    }
  } catch { /* Missing character-owned values stay unknown. */ }
  const potionIds = [...new Set([...asArray(raw["potions"]).map(p => str(asRecord(p)["potion_id"])).filter(Boolean),
    ...(data.vocab.status === "loaded" ? data.vocab.value.dimensions.potion_category.map(p => p.id) : []),
    ...tableIds])];
  const map = mapFromState(env) ?? actStartMap(env);
  const payload = directionTask({ summaries, entries, appearedCards: m.appearedCards, potionIds, floor,
    current: runPlanInput(state, env.knowledge, "review", cards, relics, asArray(raw["potions"]).map(p => str(asRecord(p)["potion_id"]))),
    ...(map ? { map: toJsonValue(routeView(map)) } : {}), ...(screenMemory.runPlan?.v6 ? { previous: toJsonValue(screenMemory.runPlan.v6) } : {}) });
  reserveReplan(m.scheduler, act, turnKey);
  logRunPlan(logFile, { run, v6_brain_calls: m.scheduler.calls, v6_turn: turnKey, v6_act: act, v6_state: toJsonValue(m) });
  const context = directionContext(payload)!;
  const { json, meta } = await brain.askJson(payload, "run-plan", value => validateDirectionWeights(value, context).ok);
  const parsed = validateDirectionWeights(json, context);
  if (!parsed.ok) throw new Error(parsed.issues.join("; "));
  const answer = parsed.value;
  screenMemory.runPlan = { runId: run, act, floor, hpPct: hpFraction(state), trigger: result.triggers.includes("act_start") ? "act" : "review",
    archetype: Object.keys(answer.direction_weights).sort((a, b) => answer.direction_weights[b]! - answer.direction_weights[a]!)[0]!, want: [], avoid: [], remove: [], blockTarget: null,
    elites: "normal", rest: answer.rest, bossPrep: "", summary: answer.reason, v6: answer };
  if (map && answer.route !== "keep") {
    const ids = routeIds(answer.route);
    if (ids) screenMemory.routePlan = makeRoutePlan(env, map, ids, { hp: state.run?.current_hp ?? 0, max: state.run?.max_hp ?? 0 }, routeCosts(env, act), answer.reason);
  }
  logRunPlan(logFile, { run, floor, trigger: screenMemory.runPlan.trigger, plan: toJsonValue(screenMemory.runPlan), v6_brain_calls: m.scheduler.calls });
  return { result, payload, stored: true, usage: meta };
}
