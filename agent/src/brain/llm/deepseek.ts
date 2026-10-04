/**
 * DeepSeek as the escalation path (phase 2): only for decisions a planner marks as escalatable, and
 * only when Jev's answer was a near-guess. It receives the *same* state and options Jev saw and must
 * answer with one option key, so its output goes through the same resolver and legality gate.
 *
 * OpenAI-compatible chat completions; key from DEEPSEEK_API_KEY. The key is never logged.
 */

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { JsonValue } from "../../core/util/json.js";
import { checkConsistency, reaskFields, reaskMessage, recoverChoice, type Conclusion, type ConsistencyCheck } from "./consistency.js";
import { choiceMessage, taskMessage } from "./deepseek-message.js";
import { discardSlotsOf } from "../../hand/screens/potion-discard.js";
import { fillGuideFacts } from "../../sim/boss-clock.js";
import { RUN_PLAN_TASK_KEY } from "../../memory/run-plan.js";
import type { Escalator } from "./file-escalation.js";
import { characterName, DEFAULT_CHARACTER, knowledgeCharacter } from "../../knowledge/files.js";

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  /** Optional strategy guide (markdown) appended to the system prompt; a static prefix, so DeepSeek caches it. */
  guideFile?: string;
  /** Optional handbook of lessons from past runs (markdown), appended after the guide; also static and cached. */
  handbookFile?: string;
  /** Thinking mode: "max" | "high" | "low" enables it at that effort; "" or "off" disables it. */
  reasoningEffort?: string;
  /** Effort for combat questions (label "combat/..."), whose numbers code has already computed; defaults to reasoningEffort. */
  combatReasoningEffort?: string;
  /**
   * Per-label effort tiers, "label-prefix=effort,…" (DEEPSEEK_EFFORT_BY_LABEL; default
   * DEFAULT_EFFORT_BY_LABEL): the longest matching prefix wins; labels that match none use
   * reasoningEffort. Applies only while thinking is on (reasoningEffort not "off").
   */
  effortByLabel?: string;
  /** JSONL file receiving each call's full chain of thought (for later review); "" disables. */
  reasoningLog?: string;
  /**
   * The system prompt verbatim, instead of the built one (SYSTEM + guide + handbook): for replaying logged
   * questions against the prompt they were asked with (V4 brain, src/brain/engines/deepseek.ts).
   */
  systemPrompt?: string;
  /**
   * Directory of the day's snapshots of the guide and handbook as filled with the data facts (frozenGuideFacts);
   * unset or "": filled from the data at every start.
   */
  factsSnapshotDir?: string;
}

export interface DeepSeekAnswer {
  choice: string;
  reason: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cacheHitTokens?: number;
  /**
   * Short hash of the guide in the prompt ("" when none), so logs show which guide version answered;
   * "<guide>+<handbook>" when a handbook is loaded too.
   */
  guideId?: string;
  /** Short hash of the handbook in the prompt ("" when none). */
  handbookId?: string;
  reasoningTokens?: number;
  /** Thinking effort actually used for this call ("off" when thinking was disabled). */
  effort?: string;
  /** Present when the first answer failed the consistency guard (see consistency.ts): both answers and the resolution. */
  consistency?: ConsistencyRecord;
  /**
   * The answer's `cards` list, when it gave one (a one-shot event option that takes N >= 2 deck cards names
   * them here; screens/oneshot.ts). Absent otherwise.
   */
  cards?: string[];
  /**
   * The answer's `route` key, when it gave one (the act-start Ancient's joint question names the act's route;
   * a card reward or rest site with a route review says "keep" or a route key).
   */
  route?: string;
  /** The answer's `route_reason` (a route review's why), when it gave one. */
  routeReason?: string;
  /** The answer's `discard` list: the potion slots a "discard, then …" option discards (screens/potion-discard.ts). */
  discard?: number[];
  /**
   * The answer's `run_plan` object, when it gave one (RUN_PLAN_MERGE: a due run plan riding on the question,
   * state.run_plan_task; strategy/run-plan-merge.ts). Read as given; the loop checks and parses it.
   */
  runPlan?: Record<string, unknown>;
}

/** One answer as seen by the consistency guard (JSON-safe, for decisions.jsonl). */
export interface ConsistencyAnswer {
  choice: string;
  reason: string;
  issues: string[];
  /** The option the reasoning concluded on, and its concluding line ("" when none could be mapped). */
  conclusion: string;
  conclusion_line: string;
}

export interface ConsistencyRecord {
  first: ConsistencyAnswer;
  /** The re-asked answer; `error` when the re-ask itself failed. */
  second: ConsistencyAnswer | { error: string };
  /**
   * "reasked": the second answer is consistent and is played; "conclusion": the option named in a
   * reasoning conclusion is played; "fallback": neither maps, the caller's fallback decides.
   */
  resolution: "reasked" | "conclusion" | "fallback";
  choice: string;
}

/** Thrown when DeepSeek's answer stays inconsistent and no conclusion maps to one option: the caller falls back. */
export class DeepSeekInconsistentError extends Error {
  /** DeepSeek answered (the V4 router passes answer failures on instead of falling back to another engine). */
  readonly answerFailure = true;

  constructor(readonly record: ConsistencyRecord, readonly meta: { calls: number; tokens: number }) {
    super(`DeepSeek answer inconsistent after re-ask (${record.first.issues.join("; ")})`);
    this.name = "DeepSeekInconsistentError";
  }
}

/**
 * DeepSeek answered but the answer is unusable (reply not JSON, or a choice that names no option key):
 * what it did say, so the caller can recover the choice from its reasoning (recoverFrom) before
 * falling back, and hand its reason on.
 */
export class DeepSeekAnswerError extends Error {
  /** DeepSeek answered (the V4 router passes answer failures on instead of falling back to another engine). */
  readonly answerFailure = true;

  constructor(
    message: string,
    readonly detail: { choice: string; reason: string; reasoning: string; content: string; route?: string; routeReason?: string; discard?: number[]; runPlan?: Record<string, unknown> },
    readonly meta: Omit<DeepSeekAnswer, "choice" | "reason">,
  ) {
    super(message);
    this.name = "DeepSeekAnswerError";
  }

  /** The option its reasoning (then its reason, then the raw reply) concluded on, when exactly one; else null. */
  recoverFrom(criteria: Record<string, string | null>): Conclusion | null {
    return recoverChoice([this.detail.reasoning, this.detail.reason, this.detail.content], criteria);
  }

  /**
   * The answer to act on with the option its reasoning concluded on (recoverFrom): the fields that do not depend
   * on the option key go with it, the route and route_reason (a route review, the act route), the potion slots
   * a "discard, then …" option discards (without them a recovered discard option was judged invalid) and a run plan
   * riding on the question (RUN_PLAN_MERGE).
   */
  answerFrom(recovered: Conclusion): DeepSeekAnswer {
    const { route, routeReason, discard, runPlan } = this.detail;
    return {
      ...this.meta,
      choice: recovered.option,
      reason: this.detail.reason || `reasoning concluded ${recovered.option}`,
      ...(route ? { route, ...(routeReason ? { routeReason } : {}) } : {}),
      ...(discard && discard.length > 0 ? { discard } : {}),
      ...(runPlan ? { runPlan } : {}),
    };
  }
}

function consistencyAnswer(choice: string, reason: string, check: ConsistencyCheck): ConsistencyAnswer {
  return { choice, reason, issues: check.issues, conclusion: check.conclusion?.option ?? "", conclusion_line: check.conclusion?.line ?? "" };
}

/** Option fields that name the option (event/rest "option", reward/selection "card", shop "buy", ...). */
const OPTION_NAME_FIELDS = ["option", "card", "name", "label", "title", "buy", "relic", "potion", "bundle", "action"] as const;

const norm = (text: string): string => text.trim().toLowerCase();

/**
 * Map an answer that is not an option key to the key it names. DeepSeek sometimes answers with an
 * option's label ("沉溺") instead of its key ("o1"). The answer must equal (trimmed, case-insensitive)
 * a key, or a name field of exactly one option's criteria (or the whole criteria text when it is a plain
 * string); anything ambiguous or unmatched returns null so the caller keeps failing as before.
 */
export function resolveOptionKey(answer: string, criteria: Record<string, string | null>): string | null {
  if (answer in criteria) return answer;
  const wanted = norm(answer);
  if (!wanted) return null;
  const keys = Object.keys(criteria);
  const byKey = keys.filter((key) => norm(key) === wanted);
  if (byKey.length === 1) return byKey[0] ?? null;
  const matches = keys.filter((key) => {
    const text = criteria[key];
    if (typeof text !== "string") return false;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return norm(text) === wanted;
    }
    if (typeof parsed === "string") return norm(parsed) === wanted;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return false;
    const record = parsed as Record<string, unknown>;
    return OPTION_NAME_FIELDS.some((field) => typeof record[field] === "string" && norm(record[field] as string) === wanted);
  });
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

/**
 * The option keys of an answer that names several on a one-option question ("card2,card1", RRMYC7MCSYX8 F24: the
 * second pick of an "add 2 cards" screen read as "pick both now"), in the answer's order; null unless every part
 * names an option (keys or names, resolveOptionKey) and there are at least two parts. The caller takes the first:
 * the answer lists its pick first, and a re-ask would cost another full call (20-90 s at max effort) for the same
 * question; the other keys are noted in the reason, and a multi-pick screen asks again for its next card.
 */
export function severalOptionKeys(answer: string, criteria: Record<string, string | null>): string[] | null {
  for (const separator of [/\s*[,，、;；|/]\s*/, /\s+/]) {
    const parts = answer.split(separator).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const keys = parts.map((part) => resolveOptionKey(part, criteria));
    if (keys.every((key): key is string => key !== null)) return keys;
  }
  return null;
}

/**
 * Dai 2026-09-29: where the hand-written strategy guide or handbook disagrees with the experience base or the
 * measured data, the data wins. Part of the fixed system prompt (byte-identical across calls, cache-friendly).
 */
export const DATA_OVER_GUIDES =
  "When the strategy guide or the handbook conflicts with the experience base (memory.knowledge) or measured data (outcome statistics, code's numbers), go with the data.";

/** The rules part of the system prompt (before the guide and handbook); the V4 brain's full-knowledge prompt reuses it. */
export const SYSTEM = [
  "You are an expert Slay the Spire 2 player advising a bot (Ironclad, climbing ascension levels).",
  "You get the game state and one question with a fixed set of option keys. Code has already computed",
  "every number shown (damage, block, HP after the enemy turn); trust those numbers.",
  "Think about winning the whole run, not just this screen. Be decisive.",
  "Do NOT recompute damage, block or HP arithmetic: the numbers in the options are exact (they already include",
  "strength, vulnerable, weak, block and enemy intents). Compare the options on their differences, weigh the few",
  "things code cannot see (future turns, deck plan, potion value), decide, and stop. Do not second-guess a decision once made.",
  "memory.knowledge, when present, is the slice of our experience base that matches this question: lessons distilled from past",
  "runs' post-mortems (scope, 置信 高/中/低 = confidence, n = supporting runs, 反例 = contradicting runs) and outcome statistics from our logs",
  "(observational: n runs, mean final floor, act-boss pass rate; low-n rows are hints only). Use it as evidence-based guidance, not",
  "orders: weigh it with the exact facts in the state and code's numbers. High-confidence, well-supported lessons deserve real weight;",
  "when the current situation differs from what a lesson assumes, the facts win.",
  DATA_OVER_GUIDES,
  "memory.act is this act's threats and boss; memory.history is the run so far, floor by floor (floors already left);",
  "memory.this_floor is the current floor so far; state.facts, when present, is the exact current deck, relics, potions, HP and gold.",
  'Reply with JSON only: {"choice": "<one option key exactly as given>", "reason": "<max 25 words>"},',
  'plus every other field the question asks for (such as "route" and "route_reason" when it has a route review, "cards", "discard").',
].join(" ");

/** SYSTEM for the run's character (knowledge/files.ts knowledgeCharacter): the Ironclad's is SYSTEM itself, byte for byte. */
export function systemRules(character: string = knowledgeCharacter()): string {
  return character === DEFAULT_CHARACTER ? SYSTEM : SYSTEM.replace("(Ironclad, climbing ascension levels)", `(${characterName(character, "en")}, climbing ascension levels)`);
}

/** Thinking efforts the code sends (see DeepSeekConfig.reasoningEffort); anything else in a tier is ignored. */
const EFFORTS = new Set(["max", "high", "low", "off"]);

/**
 * Thinking output is the largest DeepSeek cost (Dai 2026-09-28): card, rest and deck picks with few
 * options think at "high"; the run plan, route plan, shop, events, transform and enchant keep the
 * default (max). Re-asks share their question's label, so they get the same tier.
 */
export const DEFAULT_EFFORT_BY_LABEL = "reward/card=high,rest/choose=high,rest/plan=high,selection/upgrade=high,selection/remove=high,selection/add=high,bundle/choose=high";

/** "prefix=effort,…" as [prefix, effort] pairs, longest prefix first; unknown efforts are dropped. */
/**
 * The top-level JSON values in a reply, in order, when it is nothing but JSON values separated by
 * whitespace or one comma (DeepSeek sometimes sends two objects back to back: 0B5Y F30; or as a list without
 * its brackets, 79YR F6 one-shot shop `{"plan": [...], "reason": "..."}, {"choice": ..., "reason": ...}`,
 * judged non-JSON and re-planned step by step, +145.8 s); null when anything else is in it.
 */
export function jsonValues(content: string): unknown[] | null {
  const values: unknown[] = [];
  let i = 0;
  const n = content.length;
  while (i < n) {
    while (i < n && /\s/.test(content[i]!)) i += 1;
    if (i >= n) break;
    // One comma between two values (not before the first, not after the last).
    if (content[i] === "," && values.length > 0) {
      i += 1;
      while (i < n && /\s/.test(content[i]!)) i += 1;
      if (i >= n) return null;
    }
    // One value: a balanced {...} / [...] (strings skipped), parsed on its own.
    const open = content[i];
    if (open !== "{" && open !== "[") return null;
    let depth = 0;
    let inString = false;
    let end = -1;
    for (let j = i; j < n; j += 1) {
      const c = content[j]!;
      if (inString) {
        if (c === "\\") j += 1;
        else if (c === '"') inString = false;
      } else if (c === '"') inString = true;
      else if (c === "{" || c === "[") depth += 1;
      else if (c === "}" || c === "]") {
        depth -= 1;
        if (depth === 0) {
          end = j + 1;
          break;
        }
      }
    }
    if (end < 0) return null;
    try {
      values.push(JSON.parse(content.slice(i, end)));
    } catch {
      return null;
    }
    i = end;
  }
  return values.length > 0 ? values : null;
}

/**
 * The complete JSON object a reply starts with (after whitespace or a ```json fence) when other text follows it:
 * the answer as first given, the rest ignored (fix-queue-v4 #9: RUDHQ1KJ49P8 F11 a valid answer, then "Wait — …"
 * and a second object; F37 the answer and one stray "'"; both judged non-JSON, the route answers lost). Null when
 * the reply does not start with a complete, parseable object.
 */
export function leadingJsonObject(content: string): Record<string, unknown> | null {
  const text = content.trim().replace(/^```(?:json)?\s*/i, "");
  if (!text.startsWith("{")) return null;
  let depth = 0;
  let inString = false;
  for (let j = 0; j < text.length; j += 1) {
    const c = text[j]!;
    if (inString) {
      if (c === "\\") j += 1;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{" || c === "[") depth += 1;
    else if (c === "}" || c === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          const value: unknown = JSON.parse(text.slice(0, j + 1));
          return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * askJson's answer out of a reply. One object: that object. Several back to back (0B5Y F30 run-plan
 * review: `{"choice": "review", "reason": "run plan"}` then the plan): the free-form tasks (run plan,
 * fight plan) each ask for ONE object in their own format, never the per-decision {choice, reason}
 * reply the cached system prompt describes, so an object with only those keys is an echo of that format
 * and skipped; of the rest the LAST is taken (a model that restates its answer ends on the final one).
 * A reply that starts with a complete object and goes on with other text: that first object (leadingJsonObject).
 * Anything else still fails.
 */
export function pickJsonObject(content: string): Record<string, unknown> {
  const values = jsonValues(content);
  if (values === null) {
    const lead = leadingJsonObject(content);
    if (lead) return lead;
    throw new Error(`DeepSeek returned non-JSON: ${content.slice(0, 120)}`);
  }
  const all = values.filter((value): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value));
  if (all.length === 0) throw new Error("DeepSeek returned a non-object");
  if (all.length === 1) return all[0]!;
  // A run plan riding on the question (RUN_PLAN_MERGE) sent as its own {"run_plan": …} object after the answer: it joins
  // the answer instead of being taken for it (a reply that never carried a run plan has no such object: as before).
  const ridden = all.filter(isRunPlanOnly);
  const objects = all.filter((o) => !isRunPlanOnly(o));
  if (objects.length === 0) return all[all.length - 1]!;
  const echo = (o: Record<string, unknown>) => Object.keys(o).length > 0 && Object.keys(o).every((key) => key === "choice" || key === "reason");
  const answers = objects.filter((o) => !echo(o));
  const picked = answers[answers.length - 1] ?? objects[objects.length - 1]!;
  const runPlan = ridden[ridden.length - 1]?.["run_plan"];
  return runPlan !== undefined && picked["run_plan"] === undefined ? { ...picked, run_plan: runPlan } : picked;
}

/** An object that is nothing but a run plan riding on a question ({"run_plan": {...}}). */
function isRunPlanOnly(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === "run_plan" && isPlainObject(value["run_plan"]);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The run plan riding on a question's reply (RUN_PLAN_MERGE): the answer object's `run_plan`, else one sent as its own
 * {"run_plan": …} object next to the answer (the answer itself is read as before: parseChoice takes the first object).
 */
function ridingRunPlan(answer: Record<string, unknown>, content: string): Record<string, unknown> | null {
  if (isPlainObject(answer["run_plan"])) return answer["run_plan"];
  const values = jsonValues(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")) ?? [];
  const found = values.filter((value): value is Record<string, unknown> => isPlainObject(value) && isPlainObject(value["run_plan"]));
  const last = found[found.length - 1];
  return last ? (last["run_plan"] as Record<string, unknown>) : null;
}

/**
 * A reply cut off inside its one JSON object (the output ran out mid-answer): the object up to its last complete
 * top-level member, closed. A member cut in the middle is dropped, so a half-written choice or plan list never
 * reaches the caller (whose own check then finds it missing); only a cut "reason" string is kept, as far as it
 * got. The reason is marked "[truncated]". null unless the reply starts with an object that never closes and has
 * at least one complete member.
 */
export function truncatedJsonObject(content: string): Record<string, unknown> | null {
  const text = content.trim();
  if (!text.startsWith("{")) return null;
  let depth = 0;
  let inString = false;
  let lastComma = -1;
  for (let j = 0; j < text.length; j += 1) {
    const c = text[j]!;
    if (inString) {
      if (c === "\\") j += 1;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{" || c === "[") depth += 1;
    else if (c === "}" || c === "]") {
      depth -= 1;
      if (depth === 0) return null; // closed: not a cut-off reply
    } else if (c === "," && depth === 1) lastComma = j;
  }
  if (lastComma < 0) return null;
  let head: unknown;
  try {
    head = JSON.parse(`${text.slice(0, lastComma)}}`);
  } catch {
    return null;
  }
  if (typeof head !== "object" || head === null || Array.isArray(head)) return null;
  const record = head as Record<string, unknown>;
  let partial = "";
  const cut = /^\s*"reason"\s*:\s*"((?:[^"\\]|\\.)*)\\?$/s.exec(text.slice(lastComma + 1));
  if (cut) {
    try {
      partial = JSON.parse(`"${cut[1]}"`) as string;
    } catch {
      partial = "";
    }
  }
  const reason = (typeof record["reason"] === "string" ? (record["reason"] as string) : partial).trim();
  record["reason"] = `${reason}${reason ? " " : ""}[truncated]`;
  return record;
}

/**
 * JSON objects written inside prose (a reasoning that drafts its answer before the reply): each balanced
 * {...} that parses on its own, in order; nested objects of one that parsed are not listed apart.
 */
export function embeddedJsonObjects(text: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  let i = text.indexOf("{");
  while (i >= 0) {
    let depth = 0;
    let inString = false;
    let end = -1;
    for (let j = i; j < text.length; j += 1) {
      const c = text[j]!;
      if (inString) {
        if (c === "\\") j += 1;
        else if (c === '"') inString = false;
      } else if (c === '"') inString = true;
      else if (c === "{") depth += 1;
      else if (c === "}") {
        depth -= 1;
        if (depth === 0) {
          end = j + 1;
          break;
        }
      }
    }
    let parsed: unknown = null;
    if (end > 0) {
      try {
        parsed = JSON.parse(text.slice(i, end));
      } catch {
        parsed = null;
      }
    }
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      found.push(parsed as Record<string, unknown>);
      i = text.indexOf("{", end);
    } else {
      i = text.indexOf("{", i + 1);
    }
  }
  return found;
}

export function parseEffortTiers(spec: string): [string, string][] {
  return spec
    .split(",")
    .map((entry) => entry.split("=").map((part) => part.trim()) as [string, string?])
    .filter((pair): pair is [string, string] => Boolean(pair[0]) && pair[1] !== undefined && EFFORTS.has(pair[1]))
    .sort((a, b) => b[0].length - a[0].length);
}

/** The thinking effort of a call with this label (" (re-ask)" suffix ignored). */
export function effortFor(label: string, config: Pick<DeepSeekConfig, "reasoningEffort" | "combatReasoningEffort" | "effortByLabel">): string {
  const base = config.reasoningEffort || "off";
  const name = label.replace(/ \(re-ask\)$/, "");
  if (name.startsWith("combat/") && config.combatReasoningEffort) return config.combatReasoningEffort;
  if (base === "off") return base;
  const tier = parseEffortTiers(config.effortByLabel ?? DEFAULT_EFFORT_BY_LABEL).find(([prefix]) => name.startsWith(prefix));
  return tier?.[1] ?? base;
}

const EFFORT_RANK: Record<string, number> = { off: 0, low: 1, high: 2, max: 3 };

/**
 * The thinking effort of a question: its label's, raised to the run plan's when a due run plan rides on it
 * (RUN_PLAN_MERGE: state.run_plan_task). The run plan kept the default effort (max) when the card and rest picks went
 * to "high" (Dai 2026-09-28); riding on a card reward it would otherwise be thought out at "high".
 */
export function questionEffort(label: string, state: Record<string, unknown>, config: Pick<DeepSeekConfig, "reasoningEffort" | "combatReasoningEffort" | "effortByLabel">): string {
  const own = effortFor(label, config);
  if (!(RUN_PLAN_TASK_KEY in state)) return own;
  const plan = effortFor("run-plan", config);
  return (EFFORT_RANK[plan] ?? 0) > (EFFORT_RANK[own] ?? 0) ? plan : own;
}

export class DeepSeekClient implements Escalator {
  readonly name = "deepseek" as const;

  private readonly system: string;
  readonly guideId: string;
  readonly handbookId: string;

  constructor(private readonly config: DeepSeekConfig) {
    // The guides' data facts (the Giant's kill record) are filled from the fight data, frozen for the day.
    const guide = frozenGuideFacts(readOptional(config.guideFile), config.factsSnapshotDir);
    const handbook = frozenGuideFacts(readOptional(config.handbookFile), config.factsSnapshotDir);
    this.handbookId = shortHash(handbook);
    this.guideId = [shortHash(guide), this.handbookId].filter(Boolean).join("+");
    // The run's character's rules and guide (the guide file is the character's own: config.ts guideFile).
    const character = knowledgeCharacter();
    let system = systemRules(character);
    if (guide) system += `\n\n# ${characterName(character, "en")} strategy guide (background knowledge; the state and computed numbers take precedence)\n\n${guide}`;
    // Static text only: the system prompt must stay byte-identical across calls so DeepSeek caches it.
    if (handbook) system += `\n\n# 经验手册（来自过往对局复盘）\n\n${handbook}`;
    this.system = config.systemPrompt ?? system;
  }

  /** The system prompt as sent (for tools and tests). */
  get systemPrompt(): string {
    return this.system;
  }

  /** The model name sent in each request. */
  get modelName(): string {
    return this.config.model;
  }

  /** The same client with another system prompt, verbatim (replaying logged questions). */
  withSystem(system: string): DeepSeekClient {
    return new DeepSeekClient({ ...this.config, systemPrompt: system });
  }

  /**
   * One chat completion outside the v3 decision methods (V4 brain: DeepSeek's native function-calling loop and
   * the router's re-ask): the given messages after this client's system prompt, the label's thinking effort,
   * JSON mode unless tools are offered. Returns the reply, its tool calls and its usage; HTTP errors throw.
   */
  async chat(
    messages: Record<string, unknown>[],
    label: string,
    options: { tools?: Record<string, unknown>[]; toolChoice?: "auto" | "none"; signal?: AbortSignal } = {},
  ): Promise<{ content: string; reasoning: string; finishReason: string; toolCalls: { id: string; name: string; arguments: string }[]; message: Record<string, unknown>; meta: Omit<DeepSeekAnswer, "choice" | "reason"> }> {
    const started = Date.now();
    const effort = effortFor(label, this.config);
    const thinking = effort !== "off";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const abort = (): void => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    const tools = options.tools && options.tools.length > 0 ? options.tools : undefined;
    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.config.apiKey}` },
        body: JSON.stringify({
          model: this.config.model,
          ...(thinking ? { thinking: { type: "enabled" }, reasoning_effort: effort } : { thinking: { type: "disabled" }, temperature: 0 }),
          ...(tools ? { tools, ...(options.toolChoice ? { tool_choice: options.toolChoice } : {}) } : { response_format: { type: "json_object" } }),
          messages: [{ role: "system", content: this.system }, ...messages],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = (await response.text()).slice(0, 200);
        throw new Error(`DeepSeek HTTP ${response.status}: ${body}`);
      }
      const payload = (await response.json()) as {
        choices?: { message?: { content?: string | null; reasoning_content?: string; tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }[] }; finish_reason?: string | null }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_cache_hit_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } };
      };
      const message = payload.choices?.[0]?.message ?? {};
      const latencyMs = Date.now() - started;
      return {
        content: message.content ?? "",
        reasoning: message.reasoning_content ?? "",
        // v3 fa46f6c: why a reply came back empty or cut ("length"); "" when not sent.
        finishReason: payload.choices?.[0]?.finish_reason ?? "",
        toolCalls: (message.tool_calls ?? []).map((call, index) => ({ id: call.id ?? `call_${index}`, name: call.function?.name ?? "", arguments: call.function?.arguments ?? "" })),
        message: message as Record<string, unknown>,
        meta: {
          latencyMs,
          inputTokens: payload.usage?.prompt_tokens ?? 0,
          outputTokens: payload.usage?.completion_tokens ?? 0,
          cacheHitTokens: payload.usage?.prompt_cache_hit_tokens ?? 0,
          guideId: this.guideId,
          handbookId: this.handbookId,
          reasoningTokens: payload.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
          effort,
        },
      };
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
  }

  async choose(
    state: Record<string, JsonValue>,
    instructions: string,
    criteria: Record<string, string | null>,
    context: Record<string, JsonValue> = {},
  ): Promise<DeepSeekAnswer> {
    const label = typeof context["label"] === "string" ? context["label"] : "";
    // Run memory (journal, fight log, lookahead) rides in the user message, never the system prompt.
    const memory = context["memory"];
    // Memory first (act block, append-only history, then the volatile parts), then this question: see deepseek-message.ts.
    const user = choiceMessage(state, instructions, criteria, memory);
    const messages: ChatMessage[] = [{ role: "user", content: user }];
    const effort = questionEffort(label, state, this.config);
    const done = await this.complete(messages, label, effort);
    let first: ReturnType<DeepSeekClient["parseChoice"]>;
    try {
      first = this.parseChoice(done.content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logReasoning(label, done, instructions, criteria, "", "", memory, undefined, message);
      const detail = { choice: "", reason: "", reasoning: done.reasoning, content: done.content };
      throw new DeepSeekAnswerError(message, detail, done.meta);
    }
    this.logReasoning(label, done, instructions, criteria, first.choice, first.rawReason, memory);
    // The question asked for a route (a route review, the act's routes) and the reply left it out, though the
    // reasoning settled it (DHGT6Z3Q7VAP F9 "Route: keep.", F23 "Final: card0, keep route."): taken from there.
    if (!first.route) {
      const recovered = recoverRoute([done.reasoning, first.reason], routeKeys(state));
      if (recovered) Object.assign(first, { route: recovered.route, routeReason: first.routeReason ?? `recovered from the reasoning: "${recovered.line}"` });
    }
    // A one-shot option key is "option:card" (o1:c5); an answer that gives them apart ({"choice": "o1",
    // "cards": ["c5"]}) names the same option.
    const joined = first.cards?.length === 1 ? `${first.choice}:${first.cards[0]}` : "";
    let firstKey = resolveOptionKey(first.choice, criteria) ?? (joined in criteria ? joined : null);
    // Several options named on a one-option question: the first, and said so in the reason (severalOptionKeys).
    const several = firstKey === null ? severalOptionKeys(first.choice, criteria) : null;
    if (several) {
      firstKey = several[0]!;
      first.reason = `${first.reason}${first.reason ? " " : ""}[the answer named ${several.length} options (${first.choice}) on a one-option question: the first, ${firstKey}, taken]`;
    }
    if (firstKey === null) {
      // The route (a route review's keep/change, the act route) does not depend on the option key: it rides along,
      // so a choice recovered from the reasoning keeps it.
      const detail = { choice: first.choice, reason: first.reason, reasoning: done.reasoning, content: done.content, ...routeOf(first), ...(first.discard && first.discard.length > 0 ? { discard: first.discard } : {}), ...planOf(first) };
      throw new DeepSeekAnswerError(`DeepSeek chose unknown option "${first.choice}"`, detail, done.meta);
    }
    first.choice = firstKey;
    const firstCheck = checkConsistency(first.choice, first.reason, done.reasoning, criteria);
    if (firstCheck.ok) return { ...done.meta, choice: first.choice, reason: first.reason, ...extrasOf(first) };

    // Suspect answer: ask once more, quoting the contradiction, in the same conversation (the question, its
    // state with any route block, and the first answer go with it). The re-ask asks for the question's other
    // fields too (route review, act route, cards: reaskFields); a second answer that still leaves the route
    // out keeps the first answer's route.
    const firstRecord = consistencyAnswer(first.choice, first.reason, firstCheck);
    const reask = reaskMessage(first.choice, firstCheck, reaskFields(state, first));
    let second: ConsistencyRecord["second"];
    let secondCheck: ConsistencyCheck | null = null;
    let secondChoice = "";
    let secondReason = "";
    let secondExtras: Extras = {};
    let meta = done.meta;
    let calls = 1;
    try {
      calls += 1;
      const again = await this.complete(
        [...messages, { role: "assistant", content: done.content }, { role: "user", content: reask }],
        label,
        effort,
      );
      meta = sumMeta(done.meta, again.meta);
      let parsed: ReturnType<DeepSeekClient["parseChoice"]>;
      try {
        parsed = this.parseChoice(again.content);
      } catch (error) {
        this.logReasoning(`${label} (re-ask)`, again, reask, criteria, "", "", undefined, undefined, error instanceof Error ? error.message : String(error));
        throw error;
      }
      this.logReasoning(`${label} (re-ask)`, again, reask, criteria, parsed.choice, parsed.rawReason, undefined);
      parsed.choice = resolveOptionKey(parsed.choice, criteria) ?? parsed.choice;
      secondChoice = parsed.choice;
      secondReason = parsed.reason;
      // A run plan riding on the question is not asked for again: the first answer's stands unless the second gives one.
      secondExtras = { ...(parsed.route ? parsed : { ...parsed, ...routeOf(first) }), ...(parsed.runPlan ? {} : planOf(first)) };
      secondCheck = checkConsistency(parsed.choice, parsed.reason, again.reasoning, criteria);
      if (!(parsed.choice in criteria)) secondCheck = { ...secondCheck, ok: false, issues: [...secondCheck.issues, `unknown option "${parsed.choice}"`] };
      second = consistencyAnswer(secondChoice, secondReason, secondCheck);
    } catch (error) {
      second = { error: error instanceof Error ? error.message.slice(0, 200) : String(error) };
    }

    if (secondCheck?.ok) {
      return { ...meta, choice: secondChoice, reason: secondReason, ...extrasOf(secondExtras), consistency: { first: firstRecord, second, resolution: "reasked", choice: secondChoice } };
    }
    // Still inconsistent: act on a reasoning conclusion that names exactly one option (the re-ask's first).
    const conclusions = [secondCheck?.conclusion ?? null, firstCheck.conclusion].filter((c): c is NonNullable<typeof c> => c !== null);
    const target = conclusions.find((c) => c.unambiguous && c.option in criteria) ?? null;
    const conflicting = conclusions.some((c) => c.unambiguous && target !== null && c.option !== target.option);
    if (target && !conflicting) {
      const reason = `reasoning concluded ${target.option}: ${target.line}`.slice(0, 200);
      const extras = target.option === secondChoice ? secondExtras : target.option === first.choice ? first : { ...routeOf(first), ...planOf(first) };
      return { ...meta, choice: target.option, reason, ...extrasOf(extras), consistency: { first: firstRecord, second, resolution: "conclusion", choice: target.option } };
    }
    throw new DeepSeekInconsistentError(
      { first: firstRecord, second, resolution: "fallback", choice: "" },
      { calls, tokens: meta.inputTokens + meta.outputTokens },
    );
  }

  private parseChoice(content: string): { choice: string; reason: string; rawReason: unknown } & Extras {
    let parsed: { choice?: unknown; reason?: unknown; cards?: unknown; route?: unknown; route_reason?: unknown; discard?: unknown };
    try {
      parsed = JSON.parse(content) as { choice?: unknown; reason?: unknown; cards?: unknown; route?: unknown; route_reason?: unknown; discard?: unknown };
    } catch {
      // A complete object and then other text (leadingJsonObject): that object. Cut off after its complete members
      // (truncatedJsonObject): the choice stands when it was written whole.
      const cut = leadingJsonObject(content) ?? truncatedJsonObject(content);
      if (!cut) throw new Error(`DeepSeek returned non-JSON: ${content.slice(0, 120)}`);
      parsed = cut;
    }
    const runPlan = ridingRunPlan(parsed as Record<string, unknown>, content);
    return {
      // A list ({"choice": ["card2", "card1"]}) reads as the keys it names, in order (severalOptionKeys).
      choice: typeof parsed.choice === "string" ? parsed.choice.trim() : Array.isArray(parsed.choice) ? parsed.choice.filter((key): key is string => typeof key === "string").join(",") : "",
      reason: typeof parsed.reason === "string" ? parsed.reason.trim() : "",
      rawReason: parsed.reason,
      ...(Array.isArray(parsed.cards) ? { cards: parsed.cards.filter((card): card is string => typeof card === "string").map((card) => card.trim()) } : {}),
      // A route is "keep" or node ids (M2); a list of ids reads as the same ids in one string.
      ...(typeof parsed.route === "string" && parsed.route.trim()
        ? { route: parsed.route.trim() }
        : Array.isArray(parsed.route) && parsed.route.some((id) => typeof id === "string" && id.trim())
          ? { route: parsed.route.filter((id): id is string => typeof id === "string").map((id) => id.trim()).join(" ") }
          : {}),
      ...(typeof parsed.route_reason === "string" && parsed.route_reason.trim() ? { routeReason: parsed.route_reason.trim() } : {}),
      ...(discardSlotsOf(parsed.discard) ? { discard: discardSlotsOf(parsed.discard)! } : {}),
      ...(runPlan ? { runPlan } : {}),
    };
  }

  /**
   * A one-shot plan (a shop's shopping list; BUILD_ONESHOT): the same message layout as `choose` (memory,
   * state, question, options), answered with one JSON object in the format the question describes. Returns
   * the parsed object; the caller validates it. An unparseable reply throws DeepSeekAnswerError. An empty
   * reply is handled as askJson's (emptyReplyRetry): the last plan its reasoning drafted that passes `accept`
   * (the screen's own check), else asked once more (MZFV F24 shop: 10,661 tokens all reasoning, empty reply,
   * the reasoning ended on {"plan": ["buy_card3"], ...}; the step-by-step fallback then left the shop).
   */
  async choosePlan(
    state: Record<string, JsonValue>,
    instructions: string,
    criteria: Record<string, string | null>,
    context: Record<string, JsonValue> = {},
    accept?: (json: Record<string, unknown>) => boolean,
  ): Promise<{ json: Record<string, unknown>; meta: Omit<DeepSeekAnswer, "choice" | "reason">; recovered?: true; note?: string }> {
    const label = typeof context["label"] === "string" ? context["label"] : "";
    const memory = context["memory"];
    const messages: ChatMessage[] = [{ role: "user", content: choiceMessage(state, instructions, criteria, memory) }];
    const planRow = (json: Record<string, unknown>): [string, unknown] => [JSON.stringify(json["plan"] ?? null), json["reason"] ?? ""];
    const effort = questionEffort(label, state, this.config);
    const first = await this.emptyReplyRetry(messages, label, await this.complete(messages, label, effort), accept, { question: instructions, criteria, memory, row: planRow }, effort);
    if ("recovered" in first) return { json: first.recovered, meta: first.meta, recovered: true, note: first.note };
    const { done, meta } = first;
    const noted = first.note ? { note: first.note } : {};
    let json: Record<string, unknown>;
    try {
      json = pickJsonObject(done.content);
    } catch (error) {
      // Cut off after its complete members (truncatedJsonObject): the screen's check decides whether the plan is whole.
      const cut = truncatedJsonObject(done.content);
      if (!cut) {
        const message = error instanceof Error ? error.message : String(error);
        this.logReasoning(label, done, instructions, criteria, "", "", memory, undefined, message);
        throw new DeepSeekAnswerError(message, { choice: "", reason: "", reasoning: done.reasoning, content: done.content }, meta);
      }
      json = cut;
    }
    const [choice, reason] = planRow(json);
    this.logReasoning(label, done, instructions, criteria, choice, reason, memory, json);
    return { json, meta, ...noted };
  }

  /**
   * One free-form JSON answer (the fight plan, FIGHT_PLAN=v1): same cached system prompt, the task and
   * its reply format in the user message. Returns the parsed object; the caller validates it. A reply that
   * does not parse is logged (reasoning, raw reply, usage) and thrown as DeepSeekAnswerError with its usage
   * (VBHZ77A3N496 F17: an empty act-plan reply after 48 s left no trace but "non-JSON").
   */
  async askJson(
    payload: Record<string, JsonValue>,
    label: string,
    accept?: (json: Record<string, unknown>) => boolean,
  ): Promise<{ json: Record<string, unknown>; meta: Omit<DeepSeekAnswer, "choice" | "reason">; recovered?: true; note?: string }> {
    const messages: ChatMessage[] = [{ role: "user", content: taskMessage(payload) }];
    const memory = payload["memory"];
    const question = typeof payload["task"] === "string" ? payload["task"] : label;
    const summaryRow = (json: Record<string, unknown>): [string, unknown] => ["", json["summary"] ?? ""];
    const first = await this.emptyReplyRetry(messages, label, await this.complete(messages, label), accept, { question, criteria: {}, memory, row: summaryRow });
    if ("recovered" in first) return { json: first.recovered, meta: first.meta, recovered: true, note: first.note };
    const { done, meta } = first;
    const noted = first.note ? { note: first.note } : {};
    let json: Record<string, unknown>;
    try {
      json = pickJsonObject(done.content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logReasoning(label, done, question, {}, "", "", memory, undefined, message);
      throw new DeepSeekAnswerError(message, { choice: "", reason: "", reasoning: done.reasoning, content: done.content }, meta);
    }
    // Not the task's format (9GRPA F9, F25: a lone {choice, reason} echo became an all-empty run plan that
    // replaced the valid one): the last object in that format its reasoning drafted, else an error.
    if (accept && !accept(json)) {
      const drafted = embeddedJsonObjects(done.reasoning).filter(accept);
      const recovered = drafted[drafted.length - 1];
      if (!recovered) {
        const message = `DeepSeek's ${label} reply is not in the task's format and its reasoning drafted none: ${done.content.slice(0, 120)}`;
        this.logReasoning(label, done, question, {}, "", "", memory, undefined, message);
        throw new DeepSeekAnswerError(message, { choice: "", reason: "", reasoning: done.reasoning, content: done.content }, meta);
      }
      this.logReasoning(label, done, question, {}, "", recovered["summary"] ?? "", memory, { recovered_from_reasoning: true, ...recovered });
      return { json: recovered, meta, recovered: true, ...noted };
    }
    this.logReasoning(label, done, question, {}, "", json["summary"] ?? "", memory, json);
    return { json, meta, ...noted };
  }

  /**
   * An empty reply, all its output spent in the reasoning (79YR F30 run plan: 6,791 tokens, all reasoning; no
   * output cap is sent, the API default is far above that and the same question has answered in 26,368, so not
   * a cut): the reasoning often ends on the answer it meant to send (it did there), taken when it passes
   * `accept` (none without one); with none drafted, asked once more. Each empty call has its log row with the
   * reason (`row`: the log's choice and reason of a recovered answer). Returns the first call with a reply (its
   * usage summed with the empty ones) or the recovered answer; empty twice with nothing drafted throws.
   */
  private async emptyReplyRetry(
    messages: ChatMessage[],
    label: string,
    first: CompletedCall,
    accept: ((json: Record<string, unknown>) => boolean) | undefined,
    log: { question: string; criteria: Record<string, string | null>; memory: JsonValue | undefined; row: (json: Record<string, unknown>) => [string, unknown] },
    effort?: string,
  ): Promise<{ done: CompletedCall; meta: Omit<DeepSeekAnswer, "choice" | "reason">; note?: string } | { recovered: Record<string, unknown>; meta: Omit<DeepSeekAnswer, "choice" | "reason">; note: string }> {
    let done = first;
    let spent: Omit<DeepSeekAnswer, "choice" | "reason"> | null = null;
    let note: string | undefined;
    for (let attempt = 0; done.content.trim() === ""; attempt += 1) {
      const why = emptyReplyText(done);
      const total = spent ? sumMeta(spent, done.meta) : done.meta;
      const drafted = accept ? embeddedJsonObjects(done.reasoning).filter(accept) : [];
      const recovered = drafted[drafted.length - 1];
      if (recovered) {
        note = `${note ? `${note}; then ` : ""}${why}: the answer taken from the end of its reasoning`;
        const [choice, reason] = log.row(recovered);
        this.logReasoning(label, done, log.question, log.criteria, choice, reason, log.memory, { recovered_from_reasoning: true, empty_reply: why, ...recovered });
        return { recovered, meta: total, note };
      }
      if (attempt >= 1) {
        const message = `DeepSeek's ${label} reply was empty twice (last: ${why}) and its reasoning drafted no answer`;
        this.logReasoning(label, done, log.question, log.criteria, "", "", log.memory, undefined, message);
        throw new DeepSeekAnswerError(message, { choice: "", reason: "", reasoning: done.reasoning, content: done.content }, total);
      }
      this.logReasoning(label, done, log.question, log.criteria, "", "", log.memory, undefined, `${why}, no answer drafted in its reasoning: asked once more`);
      spent = done.meta;
      done = await this.complete(messages, label, effort);
      note = `first ${why}: asked once more`;
    }
    return { done, meta: spent ? sumMeta(spent, done.meta) : done.meta, ...(note ? { note } : {}) };
  }

  private async complete(
    messages: ChatMessage[],
    label: string,
    effort: string = effortFor(label, this.config),
  ): Promise<CompletedCall> {
    const started = Date.now();
    const thinking = effort !== "off";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.config.apiKey}` },
        body: JSON.stringify({
          model: this.config.model,
          ...(thinking
            ? { thinking: { type: "enabled" }, reasoning_effort: effort }
            : { thinking: { type: "disabled" }, temperature: 0 }),
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: this.system },
            ...messages,
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = (await response.text()).slice(0, 200);
        throw new Error(`DeepSeek HTTP ${response.status}: ${body}`);
      }
      const payload = (await response.json()) as {
        choices?: { message?: { content?: string; reasoning_content?: string }; finish_reason?: string | null }[];
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          prompt_cache_hit_tokens?: number;
          completion_tokens_details?: { reasoning_tokens?: number };
        };
      };
      const latencyMs = Date.now() - started;
      return {
        content: payload.choices?.[0]?.message?.content ?? "",
        reasoning: payload.choices?.[0]?.message?.reasoning_content ?? "",
        finishReason: payload.choices?.[0]?.finish_reason ?? "",
        effort,
        latencyMs,
        meta: {
          latencyMs,
          inputTokens: payload.usage?.prompt_tokens ?? 0,
          outputTokens: payload.usage?.completion_tokens ?? 0,
          cacheHitTokens: payload.usage?.prompt_cache_hit_tokens ?? 0,
          guideId: this.guideId,
          handbookId: this.handbookId,
          reasoningTokens: payload.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
          effort,
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * One row per call in the reasoning log. `parseError`: the reply did not parse; the row keeps it with the
   * raw reply (0H1X9QMAAQ8V F13: half a JSON object, its choice recovered from the reasoning, no row at all).
   */
  private logReasoning(label: string, call: CompletedCall, question: string, criteria: Record<string, string | null>, choice: string, reason: unknown, memory: JsonValue | undefined, answer?: unknown, parseError?: string): void {
    if (!this.config.reasoningLog) return;
    try {
      mkdirSync(dirname(this.config.reasoningLog), { recursive: true });
      const { effort, reasoning, latencyMs, meta } = call;
      // Token usage of this one call (cache hit = the prefix DeepSeek had cached; billed much cheaper).
      const usage = { input_tokens: meta.inputTokens, cache_hit_tokens: meta.cacheHitTokens ?? 0, output_tokens: meta.outputTokens, reasoning_tokens: meta.reasoningTokens ?? 0 };
      const entry = { ts: new Date().toISOString(), model: this.config.model, label, effort, guide: this.guideId, latency_ms: latencyMs, usage, question, options: Object.keys(criteria), choice, reason, reasoning, ...(memory === undefined ? {} : { memory, memory_chars: contextChars(memory) }), ...(answer === undefined ? {} : { answer }), ...(parseError === undefined ? {} : { parse_error: parseError.slice(0, 300), raw_reply: call.content, finish_reason: call.finishReason }) };
      appendFileSync(this.config.reasoningLog, `${JSON.stringify(entry)}\n`, "utf8");
    } catch {
      // logging must never break play
    }
  }
}

/** One finished chat completion: the answer text, the chain of thought and the call's usage. */
interface CompletedCall {
  content: string;
  reasoning: string;
  /** The API's finish_reason ("stop"; "length" = cut at the output cap); "" when not sent. */
  finishReason: string;
  effort: string;
  latencyMs: number;
  meta: Omit<DeepSeekAnswer, "choice" | "reason">;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Why a reply came back empty, for the logs: the finish reason and where the output tokens went. */
function emptyReplyText(call: CompletedCall): string {
  const { outputTokens, reasoningTokens } = call.meta;
  const spent = reasoningTokens !== undefined && reasoningTokens >= outputTokens && outputTokens > 0 ? `all ${outputTokens} output tokens were reasoning` : `${outputTokens} output tokens, ${reasoningTokens ?? 0} of them reasoning`;
  return `empty reply (finish_reason ${call.finishReason || "not given"}; ${spent})`;
}

/** The fields of an answer beyond {choice, reason}. */
type Extras = { cards?: string[]; route?: string; routeReason?: string; discard?: number[]; runPlan?: Record<string, unknown> };

/**
 * The route keys a question offers: its route review's routes (keep and the others), else the act's routes. V4's
 * route review (M2a: the whole map and the plan, answered "keep" or a node sequence) names no routes: only "keep"
 * can be read back from the reasoning (a node sequence is not guessed).
 */
export function routeKeys(state: Record<string, unknown>): string[] {
  const record = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
  const reviewState = record(state["route_review"]);
  const review = Object.keys(record(reviewState["routes"]));
  if (review.length > 0) return review;
  if (Object.keys(reviewState).length > 0) return ["keep"];
  return Object.keys(record(state["act_routes"]));
}

/**
 * The route an answer's reasoning (then its reason) settled on when the JSON left "route" out: the last place a text
 * names one of `keys` as the route ("route: keep", "\"route\": \"p1\"", "switch the route to p2") or keeps the
 * route ("keep route", "keep the safe route", when "keep" is a key). Null when no text does. A mention that is not a
 * decision is passed over: negated ("don't keep the route", "rather than switch the route to p2", "no need to keep
 * the route") or asked ("keep the route?"); until batch K "don't keep the route" read as keep.
 */
/** Words that make the route mention after them within its clause not a decision (a few words may come between). */
const ROUTE_NEGATION = /\b(?:don'?t|do not|doesn'?t|does not|didn'?t|did not|not|never|no longer|no need to|won'?t|will not|wouldn'?t|would not|shouldn'?t|should not|can'?t|cannot|can not|instead of|rather than|without|avoid|against|stop)\b(?:\s+\S+){0,3}\s*$/i;

/** Whether the route mention at `at` in `text` is a decision: not negated in its clause, not in a question. */
function decided(text: string, at: number): boolean {
  const clauseStart = Math.max(...[".", "!", "?", "\n", ";", ",", ":"].map((mark) => text.lastIndexOf(mark, at - 1))) + 1;
  if (ROUTE_NEGATION.test(text.slice(clauseStart, at))) return false;
  const sentenceEnd = text.slice(at).search(/[.!?\n]/);
  return sentenceEnd < 0 || text[at + sentenceEnd] !== "?";
}

export function recoverRoute(texts: string[], keys: string[]): { route: string; line: string } | null {
  if (keys.length === 0) return null;
  const escape = (key: string) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const alternatives = [...keys].sort((a, b) => b.length - a.length).map(escape).join("|");
  const named = new RegExp(`\\broute\\b["']?\\s*(?:[:=]|is|->|to)\\s*["']?(${alternatives})\\b`, "gi");
  const change = new RegExp(`\\b(?:switch|change)\\s+(?:the\\s+)?route\\s+to\\s+["']?(${alternatives})\\b`, "gi");
  const keep = /\bkeep(?:ing)?\s+(?:the\s+)?(?:\w+\s+)?route\b/gi;
  for (const text of texts) {
    if (!text) continue;
    let best: { at: number; route: string; line: string } | null = null;
    const consider = (at: number, route: string) => {
      const exact = keys.find((key) => key.toLowerCase() === route.toLowerCase());
      if (!exact || (best && best.at > at) || !decided(text, at)) return;
      const start = text.lastIndexOf("\n", at) + 1;
      const end = text.indexOf("\n", at);
      best = { at, route: exact, line: text.slice(start, end < 0 ? undefined : end).trim().slice(0, 120) };
    };
    for (const match of text.matchAll(named)) consider(match.index ?? 0, match[1]!);
    for (const match of text.matchAll(change)) consider(match.index ?? 0, match[1]!);
    if (keys.includes("keep")) for (const match of text.matchAll(keep)) consider(match.index ?? 0, "keep");
    if (best) {
      const found: { at: number; route: string; line: string } = best;
      return { route: found.route, line: found.line };
    }
  }
  return null;
}

/** `{cards, route, routeReason, discard, runPlan}` as far as the answer gave them, else nothing (the answer object stays as before). */
function extrasOf(answer: Extras): Extras {
  return {
    ...(answer.cards && answer.cards.length > 0 ? { cards: answer.cards } : {}),
    ...(answer.route ? { route: answer.route } : {}),
    ...(answer.routeReason ? { routeReason: answer.routeReason } : {}),
    ...(answer.discard && answer.discard.length > 0 ? { discard: answer.discard } : {}),
    ...(answer.runPlan ? { runPlan: answer.runPlan } : {}),
  };
}

/** An answer's run plan only (RUN_PLAN_MERGE: like the route, it does not depend on which option key was answered). */
function planOf(answer: { runPlan?: Record<string, unknown> }): { runPlan?: Record<string, unknown> } {
  return answer.runPlan ? { runPlan: answer.runPlan } : {};
}

/** An answer's route and route_reason only (the route does not depend on which option key was answered). */
function routeOf(answer: { route?: string; routeReason?: string }): { route?: string; routeReason?: string } {
  return answer.route ? { route: answer.route, ...(answer.routeReason ? { routeReason: answer.routeReason } : {}) } : {};
}

/** Usage of two calls on one question, summed (latency too: both were waited for). */
function sumMeta(a: Omit<DeepSeekAnswer, "choice" | "reason">, b: Omit<DeepSeekAnswer, "choice" | "reason">): Omit<DeepSeekAnswer, "choice" | "reason"> {
  return {
    ...a,
    latencyMs: a.latencyMs + b.latencyMs,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheHitTokens: (a.cacheHitTokens ?? 0) + (b.cacheHitTokens ?? 0),
    reasoningTokens: (a.reasoningTokens ?? 0) + (b.reasoningTokens ?? 0),
  };
}

/**
 * A guide (or the handbook) with its data placeholders filled (fillGuideFacts), frozen for the day: the first start
 * of a local day fills it from the data and writes `<dir>/<YYYY-MM-DD>-<template hash>.md`; every later start that
 * day with the same template reads that file. The data behind the placeholders (boss records, outcome stats) is
 * rebuilt after every run, so filled fresh the system prompt, DeepSeek's cached prefix, changed every run and each
 * run's first question hit the cache for 6.7-9.1% (2WRU 79YR 86C3). Frozen, the numbers are at most a day old
 * (the same records, a few runs fewer) and the prefix changes once a day, or when the template's own text changes
 * (a new hash). Snapshots of other days are removed when a new one is written. No dir: filled fresh, as before.
 */
export function frozenGuideFacts(template: string, dir: string | undefined, now: Date = new Date(), fill: (text: string) => string = fillGuideFacts): string {
  if (!template || !dir) return template ? fill(template) : "";
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const file = join(dir, `${day}-${shortHash(template)}.md`);
  try {
    if (existsSync(file)) return readFileSync(file, "utf8");
  } catch {
    // unreadable: filled again below
  }
  const filled = fill(template);
  try {
    mkdirSync(dir, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, filled, "utf8");
    renameSync(tmp, file);
    for (const name of readdirSync(dir)) if (/^\d{4}-\d{2}-\d{2}-[0-9a-f]{8}\.md$/.test(name) && !name.startsWith(`${day}-`)) rmSync(join(dir, name), { force: true });
  } catch {
    // a snapshot that cannot be written costs the cache, never the answer
  }
  return filled;
}

function readOptional(file: string | undefined): string {
  if (!file || !existsSync(file)) return "";
  try {
    return readFileSync(file, "utf8").trim();
  } catch {
    return "";
  }
}

function shortHash(text: string): string {
  return text ? createHash("sha256").update(text).digest("hex").slice(0, 8) : "";
}

/** Characters of run context in a memory block (the sum of its string sections). */
function contextChars(memory: JsonValue): number {
  if (typeof memory === "string") return memory.length;
  if (memory === null || typeof memory !== "object" || Array.isArray(memory)) return JSON.stringify(memory).length;
  return Object.values(memory).reduce<number>((sum, value) => sum + (typeof value === "string" ? value.length : JSON.stringify(value ?? null).length), 0);
}
