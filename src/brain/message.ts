/**
 * What every engine sends for a BrainRequest, and how every engine reads the answer back.
 *
 * The user message is the v3 DeepSeek user message, byte for byte (llm/deepseek-message.ts): a choice question
 * is {memory, state, question, options}, a task is {memory, task, ...input}; memory first in its own section
 * order so prefix caches hit. The router's re-ask follows as one more user turn quoting the problems.
 */
import { choiceMessage, taskMessage } from "../llm/deepseek-message.js";
import { embeddedJsonObjects, pickJsonObject, resolveOptionKey, severalOptionKeys } from "../llm/deepseek.js";
import type { JsonValue } from "../util/json.js";
import type { BrainRequest } from "./types.js";

type Json = Record<string, JsonValue>;

/** The user message of a request (without its re-ask turn). */
export function userMessage(req: BrainRequest): string {
  const memory = req.memory as JsonValue | undefined;
  if (req.options) return choiceMessage((req.payload ?? {}) as Json, req.question, req.options, memory);
  const input = (req.payload && typeof req.payload === "object" && !Array.isArray(req.payload) ? req.payload : { input: req.payload ?? null }) as Json;
  return taskMessage(memory === undefined ? { task: req.question, ...input } : { task: req.question, ...input, memory });
}

/** The re-ask turn: what was wrong with the previous answer and, for a choice, the valid keys. */
export function reaskMessage(req: BrainRequest, problems: string[]): string {
  // A plan answer (a shop list, a route) is not one option key: its problems say what is valid.
  const keys = req.options && req.spec.kind === "pick" ? ` Valid choices: ${Object.keys(req.options).join(", ")}.` : "";
  return `Your previous answer cannot be used: ${problems.join("; ")}.${keys} Reply again with the whole corrected answer as one JSON object in the same format.`;
}

/**
 * The same user message with the re-ask folded in, for engines that start a fresh conversation per call (the
 * CLI agents): the question, the previous answer as given, then the re-ask.
 */
export function promptWithReask(req: BrainRequest): string {
  const base = userMessage(req);
  if (!req.reask) return base;
  return `${base}\n\n[Your previous answer]\n${req.reask.answer}\n\n[Re-ask]\n${reaskMessage(req, req.reask.problems)}`;
}

/** Appended to the system prompt when tools are offered (a constant: the prefix stays cacheable). */
export const TOOLS_NOTE =
  "\n\n# Tools\n\nYou may call the tools you are given to look up facts (monsters, statistics, past runs, simulations) before you answer. " +
  "Their numbers come from our logs and carry n; use them when they bear on this decision, then answer in the format asked for.";

/** The answer object in a reply: the JSON object it is (several: the last non-echo one), else one drafted in the text. */
export function parseAnswerText(text: string): Record<string, unknown> | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return pickJsonObject(trimmed);
  } catch {
    const drafted = embeddedJsonObjects(trimmed);
    return drafted[drafted.length - 1] ?? null;
  }
}

/**
 * A pick answer with its choice mapped to an option key where it names one (an option's label instead of its key,
 * or "o1" with "cards": ["c5"] for the one-shot key "o1:c5"); other answers unchanged. Several options named on a
 * one-option question ("card2,card1", or a list as the choice; v3 7eb1de7, RRMYC7MCSYX8 F24) take the first, said so
 * in the reason, as v3's DeepSeek choose() does (llm/deepseek.ts severalOptionKeys).
 */
export function normalisePick(req: BrainRequest, answer: Record<string, unknown>): Record<string, unknown> {
  if (req.spec.kind !== "pick" || !req.options) return answer;
  const given = answer["choice"];
  const listed = Array.isArray(given) ? given.filter((key): key is string => typeof key === "string").join(",") : null;
  if (typeof given !== "string" && listed === null) return answer;
  const choice = (typeof given === "string" ? given : listed!).trim();
  const cards = Array.isArray(answer["cards"]) ? answer["cards"].filter((card): card is string => typeof card === "string") : [];
  const joined = cards.length === 1 ? `${choice}:${cards[0]}` : "";
  const key = resolveOptionKey(choice, req.options) ?? (joined && joined in req.options ? joined : null);
  if (key) return key !== given ? { ...answer, choice: key } : answer;
  const several = severalOptionKeys(choice, req.options);
  if (!several) return listed === null ? answer : { ...answer, choice };
  const reason = typeof answer["reason"] === "string" ? answer["reason"] : "";
  const note = `[the answer named ${several.length} options (${choice}) on a one-option question: the first, ${several[0]}, taken]`;
  return { ...answer, choice: several[0], reason: `${reason}${reason ? " " : ""}${note}` };
}
