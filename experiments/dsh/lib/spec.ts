/**
 * Per-question answer spec: the JSON Schema of the decision tool (arms B and C; strict-mode subset: every
 * property required, additionalProperties false, no min/maxItems) and the facts the shared validator checks
 * (validate.ts). Built once per question from the live question (criteria, state) and stored in the dataset.
 */

export type Kind = "pick" | "shop-plan" | "run-plan";

export interface CardsNeed {
  count: number;
  upTo: boolean;
  eligible: string[];
}

export interface AnswerSpec {
  kind: Kind;
  toolName: string;
  toolDescription: string;
  schema: Record<string, unknown>;
  /** pick: the option keys. */
  keys?: string[];
  /** pick: "review" (route_review: keep | route key, with route_reason), "act" (act_routes: a route key), or none. */
  route?: { mode: "review" | "act"; allowed: string[] };
  /** pick: options that also need a "cards" list (one-shot options taking N deck cards). */
  cards?: Record<string, CardsNeed>;
  /** shop-plan: the allowed step tokens, prices, affordability and gold. */
  shop?: { tokens: string[]; prices: Record<string, number | null>; affordable: Record<string, boolean>; gold: number | null; removalPrice: number | null; removalAvailable: boolean };
  /** run-plan: the deck's card ids (remove must name them). */
  deckIds?: string[];
}

const parse = (text: string | null): Record<string, unknown> => {
  if (!text) return {};
  try {
    const value = JSON.parse(text) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};
const record = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

export function buildSpec(kind: Kind, criteria: Record<string, string | null>, state: Record<string, unknown>, extra: { deckIds?: string[]; gold?: number | null } = {}): AnswerSpec {
  if (kind === "run-plan") {
    const deckIds = [...new Set(extra.deckIds ?? [])].sort();
    return {
      kind,
      toolName: "submit_run_plan",
      toolDescription: "Submit the run plan (the strategy for the rest of this act and run). Every field is required.",
      deckIds,
      schema: {
        type: "object",
        properties: {
          archetype: { type: "string", description: "the deck direction, max 12 words" },
          want: { type: "array", description: "card ids to pick when offered, most important first, max 6", items: { type: "string" } },
          avoid: { type: "array", description: "card ids not to take, max 6", items: { type: "string" } },
          remove: { type: "array", description: "card ids in the deck to remove first, max 3", items: { type: "string", enum: deckIds } },
          block_target: { type: "integer", description: "number of block cards the deck should hold by the act boss", minimum: 0, maximum: 20 },
          elites: { type: "string", enum: ["seek", "normal", "avoid"] },
          rest: { type: "string", enum: ["heal", "smith", "auto"] },
          boss_prep: { type: "string", description: "max 30 words: what to have ready for the act boss" },
          summary: { type: "string", description: "max 40 words: the plan in plain words" },
        },
        required: ["archetype", "want", "avoid", "remove", "block_target", "elites", "rest", "boss_prep", "summary"],
        additionalProperties: false,
      },
    };
  }
  if (kind === "shop-plan") {
    const yourCards = Object.keys(record(state["your_cards"] ?? record(state["facts"])["your_cards"]));
    const prices: Record<string, number | null> = {};
    const affordable: Record<string, boolean> = {};
    let removalPrice: number | null = null;
    let removalAvailable = false;
    const tokens: string[] = [];
    for (const [key, text] of Object.entries(criteria)) {
      const option = parse(text);
      if (key === "remove") {
        removalPrice = typeof option["price"] === "number" ? option["price"] : null;
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
      kind,
      toolName: "submit_shop_plan",
      toolDescription: 'Submit the whole shop visit as one ordered shopping list (steps are option keys, "remove:<card key>", discard_potionN; leaving is implied after the last step; [] buys nothing) and the reason.',
      shop: { tokens, prices, affordable, gold: extra.gold ?? null, removalPrice, removalAvailable },
      schema: {
        type: "object",
        properties: {
          plan: { type: "array", description: "the steps in order", items: { type: "string", enum: tokens } },
          reason: { type: "string", description: "max 40 words" },
        },
        required: ["plan", "reason"],
        additionalProperties: false,
      },
    };
  }
  // pick
  const keys = Object.keys(criteria);
  const properties: Record<string, unknown> = {
    choice: { type: "string", description: "one option key exactly as given", enum: keys },
    reason: { type: "string", description: "max 25 words" },
  };
  const required = ["choice", "reason"];
  const spec: AnswerSpec = { kind, toolName: "submit_choice", toolDescription: "Submit your decision on this question: the option key you choose and your reason, with the other fields the question asks for.", schema: {}, keys };
  const review = Object.keys(record(record(state["route_review"])["routes"]));
  const act = Object.keys(record(state["act_routes"]));
  if (review.length > 0) {
    const allowed = ["keep", ...review];
    spec.route = { mode: "review", allowed };
    properties["route"] = { type: "string", description: '"keep" (follow the route plan) or another key of state.route_review.routes to switch to it', enum: allowed };
    properties["route_reason"] = { type: "string", description: "max 15 words" };
    required.push("route", "route_reason");
  } else if (act.length > 0) {
    spec.route = { mode: "act", allowed: act };
    properties["route"] = { type: "string", description: "this act's route: a key of state.act_routes", enum: act };
    required.push("route");
  }
  const cards: Record<string, CardsNeed> = {};
  for (const [key, text] of Object.entries(criteria)) {
    const option = parse(text);
    const eligible = Object.keys(record(option["eligible_cards"]));
    if (eligible.length === 0) continue;
    const m = /\[(up to )?(\d+) keys/.exec(String(option["cards_to_name"] ?? ""));
    cards[key] = { count: m ? Number(m[2]) : 1, upTo: Boolean(m?.[1]), eligible };
  }
  if (Object.keys(cards).length > 0) {
    spec.cards = cards;
    const all = [...new Set(Object.values(cards).flatMap((need) => need.eligible))];
    properties["cards"] = { type: "array", description: "the deck card keys the chosen option takes, when it lists eligible_cards (repeat a key for several copies); [] otherwise", items: { type: "string", enum: all } };
    required.push("cards");
  }
  spec.schema = { type: "object", properties, required, additionalProperties: false };
  return spec;
}
