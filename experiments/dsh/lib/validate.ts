/**
 * The shared validator: one answer object against its question's spec. Used by every arm the same way:
 * A to classify its (unrepaired and recovered) answers, B for its one repair, C inside the harness tool.
 *
 * errors   = the answer cannot be used as given (missing/extra field, wrong type, key outside the valid set,
 *            a run plan that is not a plan). These are the "format failures".
 * warnings = the answer is usable but breaks an explicit instruction of the question (a shop list over the
 *            gold, reason over the word limit is NOT counted: too noisy).
 */
import type { AnswerSpec } from "./spec.js";

export interface Verdict {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** Error classes for the tables: missing_field, unknown_key, wrong_type, extra_field, not_a_plan, empty, cards. */
  classes: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function validate(answer: unknown, spec: AnswerSpec): Verdict {
  const errors: string[] = [];
  const warnings: string[] = [];
  const classes = new Set<string>();
  const err = (cls: string, text: string) => {
    errors.push(text);
    classes.add(cls);
  };
  if (!isObj(answer)) {
    err("not_json_object", "the answer is not a JSON object");
    return { ok: false, errors, warnings, classes: [...classes] };
  }
  const schema = spec.schema as { properties: Record<string, unknown>; required: string[] };
  // "cards" is required by the strict schema on every answer ([] when unused), but the question asks for it only
  // when the chosen option lists eligible_cards: only then is its absence an error.
  const needsCards = spec.kind === "pick" && typeof answer["choice"] === "string" && Boolean(spec.cards?.[answer["choice"]]);
  for (const field of schema.required) {
    if (field === "cards" && !needsCards) continue;
    if (!(field in answer) || answer[field] === null || answer[field] === undefined) err(field === "route" ? "missing_route" : "missing_field", `missing "${field}"`);
  }
  for (const field of Object.keys(answer)) if (!(field in schema.properties)) err("extra_field", `unexpected field "${field}"`);

  if (spec.kind === "pick") {
    const choice = answer["choice"];
    if (typeof choice !== "string") {
      if (choice !== undefined && choice !== null) err("wrong_type", '"choice" is not a string');
    } else if (!spec.keys!.includes(choice)) err("unknown_key", `choice "${choice.slice(0, 40)}" is not one of ${spec.keys!.slice(0, 12).join(", ")}${spec.keys!.length > 12 ? ", ..." : ""}`);
    if (typeof answer["reason"] === "string" && !answer["reason"].trim()) err("empty_reason", "empty reason");
    if (spec.route && typeof answer["route"] === "string" && !spec.route.allowed.includes(answer["route"])) err("unknown_route", `route "${answer["route"]}" is not one of ${spec.route.allowed.join(", ")}`);
    if (spec.cards && typeof choice === "string") {
      const need = spec.cards[choice];
      const given = answer["cards"];
      if (given !== undefined && !Array.isArray(given)) err("wrong_type", '"cards" is not a list');
      else if (need) {
        const list = (given ?? []) as unknown[];
        const bad = list.filter((card) => typeof card !== "string" || !need.eligible.includes(card));
        if (bad.length > 0) err("cards", `cards ${JSON.stringify(bad).slice(0, 60)} are not in ${choice}'s eligible_cards`);
        const n = list.length;
        if (need.upTo ? n < 1 || n > need.count : n !== need.count) err("cards", `${choice} takes ${need.upTo ? "up to " : ""}${need.count} card(s), got ${n}`);
      }
    }
  } else if (spec.kind === "shop-plan") {
    const plan = answer["plan"];
    if (!Array.isArray(plan)) {
      if (plan !== undefined && plan !== null) err("wrong_type", '"plan" is not a list');
      else if (!classes.has("missing_field")) err("missing_field", 'missing "plan"');
    } else {
      const shop = spec.shop!;
      const seen = new Set<string>();
      let removals = 0;
      let spend = 0;
      for (const [i, step] of plan.entries()) {
        if (typeof step !== "string") {
          err("wrong_type", `step ${i + 1} is not a string`);
          continue;
        }
        if (!shop.tokens.includes(step)) {
          err("unknown_key", `step "${step.slice(0, 40)}" is not a valid step`);
          continue;
        }
        if (step === "leave") break;
        if (seen.has(step)) err("repeat", `step ${step} repeated`);
        seen.add(step);
        if (step.startsWith("remove:")) {
          removals += 1;
          spend += shop.removalPrice ?? 0;
        } else spend += shop.prices[step] ?? 0;
        if (i === 0 && shop.affordable[step] === false) err("unaffordable_first", `first step ${step} is not affordable now`);
      }
      if (removals > 1) err("repeat", "more than one removal");
      if (shop.gold !== null && spend > shop.gold) warnings.push(`the list costs ${spend} with ${shop.gold} gold (the question says the whole list must fit)`);
    }
  } else {
    // run plan: a plan, not an echo of the {choice, reason} format
    if ("choice" in answer || (!("archetype" in answer) && !("summary" in answer))) err("not_a_plan", "not a run plan (an echo of the {choice, reason} format or another object)");
    if (typeof answer["archetype"] === "string" && !answer["archetype"].trim()) err("empty", "empty archetype");
    for (const field of ["want", "avoid", "remove"]) if (field in answer && !Array.isArray(answer[field])) err("wrong_type", `"${field}" is not a list`);
    for (const field of ["archetype", "boss_prep", "summary"]) if (field in answer && answer[field] !== null && typeof answer[field] !== "string") err("wrong_type", `"${field}" is not a string`);
    if ("elites" in answer && !["seek", "normal", "avoid"].includes(String(answer["elites"]))) err("unknown_key", `elites "${String(answer["elites"])}"`);
    if ("rest" in answer && !["heal", "smith", "auto"].includes(String(answer["rest"]))) err("unknown_key", `rest "${String(answer["rest"])}"`);
    if ("block_target" in answer && (typeof answer["block_target"] !== "number" || !Number.isFinite(answer["block_target"]))) err("wrong_type", '"block_target" is not a number');
    if (Array.isArray(answer["remove"]) && spec.deckIds) {
      const bad = (answer["remove"] as unknown[]).filter((id) => typeof id !== "string" || !spec.deckIds!.includes(id.replace(/\+$/, "")));
      if (bad.length > 0) warnings.push(`remove names cards not in the deck: ${JSON.stringify(bad).slice(0, 80)}`);
    }
    for (const [field, max] of [["want", 6], ["avoid", 6], ["remove", 3]] as const) if (Array.isArray(answer[field]) && (answer[field] as unknown[]).length > max) warnings.push(`${field} has ${(answer[field] as unknown[]).length} entries (max ${max})`);
  }
  return { ok: errors.length === 0, errors, warnings, classes: [...classes] };
}

/** The error text an arm sends back to the model (B's repair, C's tool error): what was wrong and the valid values. */
export function repairText(verdict: Verdict, spec: AnswerSpec): string {
  const valid =
    spec.kind === "pick"
      ? `Valid choices: ${spec.keys!.join(", ")}.${spec.route ? ` Valid routes: ${spec.route.allowed.join(", ")}.` : ""}`
      : spec.kind === "shop-plan"
        ? `Valid steps: ${spec.shop!.tokens.join(", ")}.`
        : 'A run plan has the fields archetype, want, avoid, remove, block_target, elites (seek|normal|avoid), rest (heal|smith|auto), boss_prep, summary.';
  return `Invalid answer: ${verdict.errors.join("; ")}. ${valid} Submit the corrected answer with every required field.`;
}
