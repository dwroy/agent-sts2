/**
 * Consistency guard for DeepSeek's direct answers (run 2WNTQHYY4GAD, F12 rest at 24/80 HP: the reasoning
 * ended "Decisive: heal." but the JSON answer was the smith option with no reason, and the run died next
 * floor). Generic over every choice question: it only looks at the option keys and the identifying fields
 * of each option's criteria (option / kind / card / buy / …), never at the screen.
 *
 * - An answer is suspect when its reason is empty, or when the reasoning's conclusion (the last few lines,
 *   at a decision marker such as "Decisive:", "choose", "go with", "final answer") names another option.
 * - A suspect answer is re-asked once (the caller does that); if the second answer is still suspect, the
 *   option named in a conclusion is taken when it maps to exactly one option, else the caller's fallback.
 */

/** Fields of an option's criteria JSON that name the option (a card, a rest action, an event option, …). */
const NAME_FIELDS = ["option", "kind", "card", "buy", "bundle", "label", "name", "id", "title", "node_type", "relic", "potion"];

/** Words that introduce a decision. The option named right after the last one is the conclusion. */
const MARKER =
  /\b(?:decisive|decision|decided|decide|final answer|final choice|final|conclusion|verdict|answer|choice|choose|choosing|chose|pick|picking|go(?:ing)? with|commit to|settle on|select|selecting|take|taking)\b\s*[:：]?|(?:选择|决定|结论)\s*[:：]?/gi;
/** A marker right after a negation ("don't choose smith", "rather than pick") does not conclude. */
const NEGATED = /(?:\bnot|n't|\bnever|\bno|rather than|instead of|不)\s*$/i;
/** A mention right after these is an option set aside ("heal over smith", "no heal"), not the one chosen. */
const SET_ASIDE = /(?:\bnot|n't|\bnever|\bno|\bwithout|\bthan|\bover|\babove|\bbelow|\bvs\.?|\bversus|instead of|不)\s*$/i;
/** A sentence that weighs options instead of settling on one ("reconsider", "alternatively", a question). */
const DELIBERATION = /\b(?:reconsider|alternatively|alternative|hmm|wait|maybe|perhaps|might|could|whether|either|leaning|if|or|between|vs|versus|must be|compar\w*)\b|\?|？/i;
/** The decision itself ends at the first clause break; what follows explains it ("leaves gold for …"). */
const CLAUSE_END = /[—–,，(（;；]|\s-\s|\b(?:because|since|which|so that|to preserve)\b/i;
/** How many trailing non-empty lines of the reasoning count as its conclusion. */
const CONCLUSION_LINES = 8;

export interface Conclusion {
  /** The option named first after the decision marker (used to detect a contradiction). */
  option: string;
  /** True when the concluding text names only that option (safe to act on without the answer). */
  unambiguous: boolean;
  /** The concluding line, trimmed (quoted back to DeepSeek and logged). */
  line: string;
}

/** Aliases that name each option: its key and the identifying fields of its criteria; shared aliases are dropped. */
export function optionAliases(criteria: Record<string, string | null>): Map<string, string[]> {
  const byAlias = new Map<string, Set<string>>();
  const add = (alias: string, key: string): void => {
    const text = alias.trim().toLowerCase();
    if (!text) return;
    const cjk = /[^\x00-\x7f]/.test(text);
    if (text !== key.toLowerCase() && (cjk ? text.length < 2 : text.length < 3)) return;
    if (!byAlias.has(text)) byAlias.set(text, new Set());
    byAlias.get(text)?.add(key);
  };
  for (const [key, raw] of Object.entries(criteria)) {
    add(key, key);
    let parsed: unknown = null;
    try {
      parsed = raw === null ? null : JSON.parse(raw);
    } catch {
      parsed = null;
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      for (const field of NAME_FIELDS) {
        const value = record[field];
        if (typeof value === "string") add(value, key);
      }
    }
  }
  const out = new Map<string, string[]>();
  for (const [alias, keys] of byAlias) {
    if (keys.size !== 1) continue; // "relic" on three shop relics names none of them
    const key = [...keys][0] as string;
    out.set(key, [...(out.get(key) ?? []), alias]);
  }
  return out;
}

function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Options named in `text`, in order of first mention; a mention inside a longer one of another option is
 * ignored, and so is one right after a set-aside word ("over smith", "no heal").
 */
export function mentionedOptions(text: string, aliases: Map<string, string[]>): string[] {
  const hits: { key: string; start: number; end: number }[] = [];
  for (const [key, list] of aliases) {
    for (const alias of list) {
      const ascii = !/[^\x00-\x7f]/.test(alias);
      const pattern = ascii
        ? new RegExp(`(?<![a-z0-9_])${escapeRe(alias)}(?![a-z0-9_])`, "gi")
        : new RegExp(escapeRe(alias), "gi");
      for (const match of text.matchAll(pattern)) hits.push({ key, start: match.index ?? 0, end: (match.index ?? 0) + match[0].length });
    }
  }
  const kept = hits.filter(
    (hit) =>
      !hits.some((other) => other.key !== hit.key && other.end - other.start > hit.end - hit.start && other.start <= hit.start && other.end >= hit.end) &&
      !SET_ASIDE.test(text.slice(Math.max(0, hit.start - 14), hit.start)),
  );
  kept.sort((a, b) => a.start - b.start);
  const order: string[] = [];
  for (const hit of kept) if (!order.includes(hit.key)) order.push(hit.key);
  return order;
}

/** Long quoted text (a drafted reason) compares options; it does not conclude. Short quotes ("o0") stay. */
function dropLongQuotes(text: string): string {
  return text.replace(/"[^"]{25,}"|“[^”]{25,}”/g, '""');
}

/**
 * The option the reasoning concludes on: scanning the sentences of the last lines from the end, the first
 * settled sentence (not a question or a "reconsider/alternatively" aside) with a decision marker whose
 * following text names an option. Null when the reasoning concludes on nothing we can map (then only the
 * empty-reason check applies).
 */
export function reasoningConclusion(reasoning: string, criteria: Record<string, string | null>): Conclusion | null {
  if (!reasoning.trim()) return null;
  const aliases = optionAliases(criteria);
  const lines = reasoning.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(-CONCLUSION_LINES);
  const sentences = lines.flatMap((line) => dropLongQuotes(line).split(/(?<=[.!。！；;])\s+/).map((sentence) => sentence.trim()).filter(Boolean));
  for (let i = sentences.length - 1; i >= 0; i -= 1) {
    const sentence = sentences[i] as string;
    if (DELIBERATION.test(sentence)) continue;
    let tail: string | null = null;
    for (const match of sentence.matchAll(MARKER)) {
      const start = match.index ?? 0;
      if (NEGATED.test(sentence.slice(Math.max(0, start - 12), start))) continue;
      const rest = sentence.slice(start + match[0].length).split(CLAUSE_END)[0] ?? "";
      if (mentionedOptions(rest, aliases).length > 0) tail = rest; // keep the last marker that names an option
    }
    if (tail === null) continue;
    const named = mentionedOptions(tail, aliases);
    return { option: named[0] as string, unambiguous: named.length === 1, line: sentence.slice(0, 200) };
  }
  return null;
}

/**
 * DeepSeek's choice out of an answer that could not be used (reply not JSON, unknown option key: WXMB
 * F11, "休息" with "…heal" reasoning, handed to Jev who smithed at 0.05): the conclusions of the given
 * texts (its reasoning first, then its reason and raw reply). Taken only when at least one names exactly
 * one option and no text concludes on another; else null (the caller falls back as before).
 */
export function recoverChoice(texts: string[], criteria: Record<string, string | null>): Conclusion | null {
  const found = texts.map((text) => reasoningConclusion(text, criteria)).filter((c): c is Conclusion => c !== null);
  const clear = found.find((c) => c.unambiguous);
  if (!clear) return null;
  return found.every((c) => c.option === clear.option) ? clear : null;
}

export interface ConsistencyCheck {
  ok: boolean;
  /** Why the answer is suspect ("empty reason", "reasoning concluded o0 but answered o1"). */
  issues: string[];
  conclusion: Conclusion | null;
}

/**
 * Whether an answer agrees with itself: a reason is given, and a conclusion naming one option names the chosen
 * one. A conclusion naming several options settles nothing, so it contradicts nothing (XMK1JFZ0VD2Q F7: 'The
 * choice key: options are "o0" and "o1".' read as "concluded o0" against the answer o1 and re-asked; the
 * reasoning had settled on smith, o1).
 */
export function checkConsistency(choice: string, reason: string, reasoning: string, criteria: Record<string, string | null>): ConsistencyCheck {
  const issues: string[] = [];
  if (!reason.trim()) issues.push("empty reason");
  const conclusion = reasoningConclusion(reasoning, criteria);
  if (conclusion && conclusion.unambiguous && conclusion.option !== choice) issues.push(`reasoning concluded ${conclusion.option} but answered ${choice}`);
  return { ok: issues.length === 0, issues, conclusion };
}

/**
 * The fields of the question's own answer format beyond {choice, reason} that a re-ask must ask for again,
 * as `"name": <what>` fragments with a sentence saying what they are: the route review riding on a card reward
 * or rest site (state.route_review: "route", "route_reason"; the re-ask asked for {choice, reason} only and the
 * second answer dropped the route, "the answer has no route"), the act-start joint question's route
 * (state.act_routes), and the deck cards a one-shot option takes when the first answer named them ("cards").
 */
export function reaskFields(state: Record<string, unknown>, first: { cards?: string[] }): { fields: string[]; note: string } {
  const record = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
  const fields: string[] = [];
  const notes: string[] = [];
  const reviewRoutes = Object.keys(record(record(state["route_review"])["routes"]));
  const actRoutes = Object.keys(record(state["act_routes"]));
  if (reviewRoutes.length > 0) {
    fields.push(`"route": "<${reviewRoutes.join(" | ")}>"`, '"route_reason": "<max 15 words>"');
    notes.push('Settle the route again too (state.route_review): "route" is "keep" (follow the plan) or another key of state.route_review.routes.');
  } else if (actRoutes.length > 0) {
    fields.push(`"route": "<${actRoutes.join(" | ")}>"`);
    notes.push('Name the act\'s route again too: "route" is a key of state.act_routes.');
  }
  if ((first.cards ?? []).length > 0) fields.push('"cards": [<the deck cards the option takes>]');
  return { fields, note: notes.join(" ") };
}

/**
 * The follow-up message for a suspect answer. `extra` (reaskFields): the other fields the question's answer
 * format has, asked for again with the choice.
 */
export function reaskMessage(choice: string, check: ConsistencyCheck, extra: { fields: string[]; note: string } = { fields: [], note: "" }): string {
  const parts: string[] = [];
  if (check.conclusion && check.conclusion.unambiguous && check.conclusion.option !== choice) {
    parts.push(`Your reasoning concluded "${check.conclusion.line}" (option ${check.conclusion.option}) but you answered ${choice}.`);
  }
  if (check.issues.includes("empty reason")) parts.push(`Your answer ${choice} came with an empty reason.`);
  if (extra.note) parts.push(extra.note);
  const format = ['"choice": "<option key>"', '"reason": "<max 25 words>"', ...extra.fields].join(", ");
  parts.push(`Answer again with the option key you actually choose and a reason: JSON only, {${format}}.`);
  return parts.join(" ");
}
