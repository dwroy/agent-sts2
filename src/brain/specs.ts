/**
 * AnswerSpecs of the questions the brain answers today (ported from jev-sts2-dsh/experiments/dsh lib/spec.ts and
 * lib/validate.ts, whose 93 replayed questions they were checked on).
 *
 * - schema: a strict-mode JSON Schema (every property required, additionalProperties false, no dynamic maps, no
 *   numeric bounds),
 *   so the same object works as Claude's --json-schema, Codex's --output-schema and a strict tool schema. Fields
 *   a question does not need are sent empty ([] for cards/discard).
 * - validate: what makes an answer unusable, in words specific enough to re-ask with. It checks what the schema
 *   cannot (the chosen option's card count, a shop list's order) and stays as lenient as the loop's own parsers
 *   for the free-form plans: the run plan is accepted when it is a plan at all (isRunPlanReply, as v3 did), and
 *   the loop's parsers drop unknown ids as before.
 */
import { isRunPlanReply } from "../strategy/run-plan.js";
import { checkRoute, isKeep, routeIds, routeMapFromView, type RouteMap } from "../strategy/route-map.js";
import type { JsonSchema } from "../tools/types.js";
import type { AnswerSpec } from "./types.js";

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

const parse = (text: string | null | undefined): Json => {
  if (!text) return {};
  try {
    const value = JSON.parse(text) as unknown;
    return isObject(value) ? value : {};
  } catch {
    return {};
  }
};

const record = (value: unknown): Json => (isObject(value) ? value : {});

const list = (items: string[], max = 12): string => `${items.slice(0, max).join(", ")}${items.length > max ? ", ..." : ""}`;

/** Suffix of the "discard potion(s), then …" variant of an option (screens/potion-discard.ts DISCARD_SUFFIX). */
const DISCARD_SUFFIX = ":discard";

/** An option that takes N deck cards (a one-shot event option, screens/oneshot.ts): how many and which. */
export interface CardsNeed {
  count: number;
  upTo: boolean;
  eligible: string[];
}

/**
 * The route in an answer, checked on the map the question showed (M2: strategy/route-map.ts checkRoute): the node
 * ids from one of the next nodes to the boss, along the lines (Winged Boots: jumps up to the charges left); "keep"
 * where the question has a plan to keep. [] when it is legal.
 */
export function routeProblems(map: RouteMap, value: unknown, keepAllowed: boolean): string[] {
  if (keepAllowed && isKeep(value)) return [];
  const ids = routeIds(value);
  if (!ids) {
    const shown = typeof value === "string" ? value.slice(0, 40) : JSON.stringify(value ?? null).slice(0, 40);
    return [`route "${shown}" names no node ids (${keepAllowed ? '"keep" or ' : ""}the node ids from one of next_nodes to the boss, e.g. "r4c1 r5c2 … r16c3")`];
  }
  return checkRoute(map, ids).map((problem) => `route: ${problem}`);
}

/** The route field's schema entry. */
const ROUTE_FIELD = (keep: boolean): JsonSchema => ({
  type: "string",
  description: `${keep ? '"keep" (follow the route plan) or ' : ""}the node ids in order from one of next_nodes to the boss, space-separated ("r4c1 r5c2 … r16c3")`,
});

/**
 * A choice among option keys: {choice, reason} plus the fields the question asks for — the route (a route review
 * riding on the question, state.route_review: "keep" or a new node sequence, with route_reason; the act-start joint
 * question, state.act_route: the act's node sequence), the deck cards an option takes (cards) and the potion slots a
 * "discard, then …" option discards (discard). An illegal or (act start) missing route is a soft problem: re-asked
 * once, then the answer's choice stands without it (the screen keeps the plan, or asks for the route at the map).
 */
export function pickSpec(label: string, options: Record<string, string | null>, state: unknown): AnswerSpec {
  const keys = Object.keys(options);
  const properties: Record<string, JsonSchema> = {
    choice: { type: "string", description: "one option key exactly as given", enum: keys },
    reason: { type: "string", description: "max 25 words" },
  };
  const required = ["choice", "reason"];
  const st = record(state);
  const reviewMap = routeMapFromView(st["route_review"]);
  const actMap = reviewMap ? null : routeMapFromView(st["act_route"]);
  let route: { mode: "review" | "act"; map: RouteMap } | null = null;
  if (reviewMap) {
    route = { mode: "review", map: reviewMap };
    properties["route"] = ROUTE_FIELD(true);
    properties["route_reason"] = { type: "string", description: "max 15 words" };
    required.push("route", "route_reason");
  } else if (actMap) {
    route = { mode: "act", map: actMap };
    properties["route"] = ROUTE_FIELD(false);
    required.push("route");
  }
  const cards: Record<string, CardsNeed> = {};
  for (const [key, text] of Object.entries(options)) {
    const option = parse(text);
    const eligible = Object.keys(record(option["eligible_cards"]));
    if (eligible.length === 0) continue;
    const m = /\[(up to )?(\d+) keys/.exec(String(option["cards_to_name"] ?? ""));
    cards[key] = { count: m ? Number(m[2]) : 1, upTo: Boolean(m?.[1]), eligible };
  }
  if (Object.keys(cards).length > 0) {
    const all = [...new Set(Object.values(cards).flatMap((need) => need.eligible))];
    properties["cards"] = { type: "array", description: "the deck card keys the chosen option takes, when it lists eligible_cards (repeat a key for several copies); [] otherwise", items: { type: "string", enum: all } };
    required.push("cards");
  }
  const discardable = keys.some((key) => key.endsWith(DISCARD_SUFFIX));
  if (discardable) {
    properties["discard"] = { type: "array", description: 'potion slot numbers a "discard potion(s), then …" option (key ending ":discard") discards first; [] otherwise', items: { type: "integer" } };
    required.push("discard");
  }
  return {
    label,
    kind: "pick",
    schema: { type: "object", properties, required, additionalProperties: false },
    ...(route ? { reask: true } : {}),
    validate(answer: unknown): string[] {
      if (!isObject(answer)) return ["the answer is not a JSON object"];
      const problems: string[] = [];
      const choice = answer["choice"];
      if (typeof choice !== "string" || !choice.trim()) problems.push('missing "choice"');
      else if (!keys.includes(choice)) problems.push(`choice "${choice.slice(0, 40)}" is not one of ${list(keys)}`);
      if (typeof choice === "string") {
        const need = cards[choice];
        const given = answer["cards"];
        if (given !== undefined && given !== null && !Array.isArray(given)) problems.push('"cards" is not a list');
        else if (need) {
          const named = (given ?? []) as unknown[];
          const bad = named.filter((card) => typeof card !== "string" || !need.eligible.includes(card));
          if (bad.length > 0) problems.push(`cards ${JSON.stringify(bad).slice(0, 60)} are not in ${choice}'s eligible_cards (${list(need.eligible)})`);
          const n = named.length;
          if (need.upTo ? n < 1 || n > need.count : n !== need.count) problems.push(`${choice} takes ${need.upTo ? "up to " : ""}${need.count} card(s) from its eligible_cards, got ${n}`);
        }
        const discard = answer["discard"];
        if (discard !== undefined && discard !== null && !Array.isArray(discard)) problems.push('"discard" is not a list');
        else if (choice.endsWith(DISCARD_SUFFIX) && (!Array.isArray(discard) || discard.length === 0)) problems.push(`${choice} discards potions first: "discard" must name 1 or more potion slot numbers`);
      }
      return problems;
    },
    softValidate(answer: unknown): string[] {
      if (!route || !isObject(answer)) return [];
      const given = answer["route"];
      const missing = given === undefined || given === null || (typeof given === "string" && !given.trim());
      // A review without a route keeps the plan (logged, not re-asked: the route rides on this question for free).
      if (missing) return route.mode === "act" ? ['missing "route": the node ids from one of state.act_route.next_nodes to the boss'] : [];
      return routeProblems(route.map, given, route.mode === "review");
    },
  };
}

/**
 * The route questions of the MAP screen (map/route-plan: the act's route on the whole map in state.route_map;
 * map/route-review: keep the plan or a new route): {route, reason} (and "discard" with White Beast Statue). The route
 * must be legal (checkRoute); an illegal one is re-asked once with its errors, and stays unusable after that (the
 * screen then keeps the plan it had, or moves by code's baseline).
 */
export function routePlanSpec(label: string, state: unknown): AnswerSpec {
  const st = record(state);
  const view = record(st["route_map"]);
  const map = routeMapFromView(view);
  const keep = label === "map/route-review" || typeof view["plan"] === "string";
  return {
    label,
    kind: "plan",
    reask: true,
    schema: {
      type: "object",
      properties: {
        route: ROUTE_FIELD(keep),
        reason: { type: "string", description: "max 30 words" },
        discard: { type: "array", description: "White Beast Statue only: potion slot numbers to discard before the first step; [] otherwise", items: { type: "integer" } },
        drink: { type: "array", description: "White Beast Statue only: the one potion slot number (drinkable_potions) to drink on the map before the first step; [] otherwise", items: { type: "integer" } },
      },
      required: ["route", "reason"],
      additionalProperties: false,
    },
    validate(answer: unknown): string[] {
      if (!isObject(answer)) return ["the answer is not a JSON object"];
      const given = answer["route"];
      if (given === undefined || given === null || (typeof given === "string" && !given.trim())) return [`missing "route" (${keep ? '"keep" or ' : ""}the node ids from one of next_nodes to the boss)`];
      if (!map) return [];
      return routeProblems(map, given, keep);
    },
  };
}

/**
 * The same schema for every question of a kind, for engines whose structured-output schema sits in front of the
 * prompt cache (Claude Code turns --json-schema into a tool definition, which comes before the system prompt):
 * a per-question schema (its option keys as an enum) would make every question miss the cached prefix. Picks get
 * one superset shape (choice and reason required; route, route_reason, cards and discard given when the question
 * asks for them); a shop list loses its step enum; the run and fight plans are the same for every question
 * already. spec.validate still checks the question's own keys and fields.
 */
export function stableSchema(spec: AnswerSpec): JsonSchema {
  if (spec.kind === "pick") return STABLE_PICK_SCHEMA;
  const plan = spec.schema.properties?.["plan"];
  if (plan?.items?.enum) {
    return { ...spec.schema, properties: { ...spec.schema.properties, plan: { ...plan, items: { type: "string" } } } };
  }
  return spec.schema;
}

const STABLE_PICK_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    choice: { type: "string", description: "one option key exactly as given in options" },
    reason: { type: "string", description: "max 25 words" },
    route: { type: "string", description: 'only when the question asks for a route (state.route_review, state.act_route): "keep" or the node ids from one of next_nodes to the boss, space-separated' },
    route_reason: { type: "string", description: "only with a route review: max 15 words" },
    cards: { type: "array", description: "only when the chosen option lists eligible_cards: the deck card keys it takes", items: { type: "string" } },
    discard: { type: "array", description: 'only for a "discard, then …" option (key ending ":discard"): the potion slot numbers it discards first', items: { type: "integer" } },
  },
  required: ["choice", "reason"],
  additionalProperties: false,
};

/** A shop visit as one ordered shopping list (screens/shop.ts parseShopPlan is the final judge). */
export function shopPlanSpec(label: string, options: Record<string, string | null>, state: unknown): AnswerSpec {
  const st = record(state);
  const yourCards = Object.keys(record(st["your_cards"] ?? record(st["facts"])["your_cards"]));
  const prices: Record<string, number | null> = {};
  const affordable: Record<string, boolean> = {};
  let removalAvailable = false;
  const tokens: string[] = [];
  for (const [key, text] of Object.entries(options)) {
    const option = parse(text);
    if (key === "remove") {
      removalAvailable = true;
      continue;
    }
    tokens.push(key);
    prices[key] = typeof option["price"] === "number" ? option["price"] : null;
    affordable[key] = option["affordable_now"] !== false;
  }
  if (removalAvailable) for (const card of yourCards) tokens.push(`remove:${card}`);
  if (!tokens.includes("leave")) tokens.push("leave");
  return {
    label,
    kind: "plan",
    schema: {
      type: "object",
      properties: {
        plan: { type: "array", description: 'the steps in order: option keys, "remove:<card key>", discard_potionN; leaving is implied after the last step; [] buys nothing', items: { type: "string", enum: tokens } },
        reason: { type: "string", description: "max 40 words" },
      },
      required: ["plan", "reason"],
      additionalProperties: false,
    },
    validate(answer: unknown): string[] {
      if (!isObject(answer)) return ["the answer is not a JSON object"];
      const plan = answer["plan"];
      if (!Array.isArray(plan)) return ['missing "plan" list'];
      const problems: string[] = [];
      const seen = new Set<string>();
      let removals = 0;
      for (const [i, step] of plan.entries()) {
        if (typeof step !== "string") {
          problems.push(`step ${i + 1} is not a string`);
          continue;
        }
        if (!tokens.includes(step)) {
          problems.push(`step "${step.slice(0, 40)}" is not a valid step (valid: ${list(tokens, 20)})`);
          continue;
        }
        if (step === "leave") break;
        if (seen.has(step)) problems.push(`step ${step} repeated`);
        seen.add(step);
        if (step.startsWith("remove:")) removals += 1;
        if (i === 0 && affordable[step] === false) problems.push(`first step ${step} is not affordable now`);
      }
      if (removals > 1) problems.push("more than one card removal");
      return problems;
    },
  };
}

/** The run plan (strategy/run-plan.ts RUN_PLAN_TASK); accepted when it is a plan at all, as v3 did. */
export function runPlanSpec(label = "run-plan"): AnswerSpec {
  return {
    label,
    kind: "plan",
    schema: {
      type: "object",
      properties: {
        archetype: { type: "string", description: "the deck direction, max 12 words" },
        want: { type: "array", description: "card ids to pick when offered, most important first, max 6", items: { type: "string" } },
        avoid: { type: "array", description: "card ids not to take, max 6", items: { type: "string" } },
        remove: { type: "array", description: "card ids in the deck to remove first, max 3", items: { type: "string" } },
        block_target: { type: "integer", description: "number of block cards the deck should hold by the act boss (0-20)" },
        elites: { type: "string", enum: ["seek", "normal", "avoid"] },
        rest: { type: "string", enum: ["heal", "smith", "auto"] },
        boss_prep: { type: "string", description: "max 30 words: what to have ready for the act boss" },
        summary: { type: "string", description: "max 40 words: the plan in plain words" },
      },
      required: ["archetype", "want", "avoid", "remove", "block_target", "elites", "rest", "boss_prep", "summary"],
      additionalProperties: false,
    },
    validate(answer: unknown): string[] {
      if (!isObject(answer)) return ["the answer is not a JSON object"];
      return isRunPlanReply(answer) ? [] : ["not a run plan: an object without archetype, want, avoid, remove, block_target, elites, rest, boss_prep or summary (an echo of the {choice, reason} format?)"];
    },
  };
}

/**
 * The fight plan (strategy/fight-plan.ts FIGHT_PLAN_TASK). Its potions field is a map in the task's format;
 * a strict schema cannot hold a map, so the schema asks for [{potion, use}] and fightPlanFromSchema turns it
 * back. Any object is accepted, as v3 did (parseFightPlan drops what it does not know).
 */
export function fightPlanSpec(label = "fight-plan"): AnswerSpec {
  return {
    label,
    kind: "plan",
    schema: {
      type: "object",
      properties: {
        approach: { type: "string", enum: ["race", "setup", "defend"] },
        setup_cards: { type: "array", description: "card ids from the deck to play in the first turns, most important first, max 3; [] for none", items: { type: "string" } },
        focus_enemy: { type: "string", description: "enemy_id to kill first, or empty" },
        potions: {
          type: "array",
          description: "one entry for EVERY potion listed",
          items: { type: "object", properties: { potion: { type: "string" }, use: { type: "string", enum: ["early", "big_hit", "emergency", "save", "any"] } }, required: ["potion", "use"], additionalProperties: false },
        },
        key_turns: { type: "string", description: "max 30 words: the dangerous turns and what to do on them" },
        summary: { type: "string", description: "max 40 words: the plan in plain words" },
      },
      required: ["approach", "setup_cards", "focus_enemy", "potions", "key_turns", "summary"],
      additionalProperties: false,
    },
    validate(answer: unknown): string[] {
      return isObject(answer) ? [] : ["the answer is not a JSON object"];
    },
  };
}

/** A fight plan answered in the schema's form ([{potion, use}]) in the task's form ({potion: use}). */
export function fightPlanFromSchema(answer: Json): Json {
  const potions = answer["potions"];
  if (!Array.isArray(potions)) return answer;
  const map: Json = {};
  for (const entry of potions) {
    const item = record(entry);
    if (typeof item["potion"] === "string" && typeof item["use"] === "string") map[item["potion"]] = item["use"];
  }
  return { ...answer, potions: map };
}

/** A free-form task answer: any object that `accept` takes (no accept: any object). */
export function freeSpec(label: string, schema: JsonSchema, accept?: (json: Json) => boolean): AnswerSpec {
  return {
    label,
    kind: "plan",
    schema,
    validate(answer: unknown): string[] {
      if (!isObject(answer)) return ["the answer is not a JSON object"];
      return !accept || accept(answer) ? [] : ["the answer is not in the task's format"];
    },
  };
}
