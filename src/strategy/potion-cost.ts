/**
 * Potion cost (Dai 2026-09-30): a potion drunk before the act boss is HP paid later. What a drink costs is the
 * potion's held value in the potion table (src/knowledge/potion-equivalents.json, docs/potion-equivalents.md: its
 * HP worth in this act's boss fight at this ascension; the formula values as the table has them). Dai's rules:
 *   - the cost is the held value, nothing else: no "a full belt makes the cheapest potion free" or other special
 *     case (a low-value potion costs little anyway), and an elite costs the same as a hallway fight;
 *   - a boss fight costs 0 (that is where the potions are kept for);
 *   - a potion the table has no value for (another character's, a mock) costs 0 and says so;
 *   - deaths always come first (rollout-live pickRolloutBest): a drink that keeps us alive is drunk whatever it costs.
 * One number, used everywhere a line is ranked: the solver's score (turn-solver, weights.hp x cost), the rollout's
 * later turns and its value (rollout.ts), the HP guard, the random potions' Monte Carlo and Jev's option facts.
 */

import { loadPotionEquivalents, potionEquivalentFrom, potionWorthSource, sourceLabel, type PotionEquivalentsFile } from "../knowledge/potion-equivalents.js";
import type { CardModel } from "./card-model.js";
import type { Plan } from "./turn-solver.js";

/** The fight kinds of the solver (turn-solver SolverInput["fightKind"]). */
export type PotionFightKind = "monster" | "elite" | "boss" | "unknown";

/**
 * The switch: POTION_COST=off in the environment turns every cost to 0 (the ranking before 2026-09-30); tests and the
 * offline replay (tools/potion-cost-replay.ts) set it directly.
 */
export const potionCostOptions: { enabled: boolean } = { enabled: process.env["POTION_COST"] !== "off" };

/** What drinking one potion costs on this board. */
export interface PotionCost {
  id: string;
  /** HP the drink costs: the table's held value; 0 in a boss fight, without a value, or with the switch off. */
  hp: number;
  /** The table's held value in this act (null: the table has no value for it, or did not load). */
  holdHp: number | null;
  /**
   * Why the cost is 0 when it is: "boss" (the boss fight), "no_value" (not in the table: 无换算值), "worthless" (its held
   * value is 0: Foul Potion hurts us), "no_table" (the table did not load), "off" (POTION_COST=off).
   */
  zero: "boss" | "no_value" | "worthless" | "no_table" | "off" | null;
  /** Its name in the table (the id when it has none). */
  name: string;
  /** Where the number is from: 「A8 公式 n=88」 (sourceLabel), or null. */
  source: string | null;
  /** The table's error when it did not load. */
  error?: string;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * The cost of drinking `id` at `ascension` in act `act` (1-3; the table clamps it) in a fight of `fightKind`, from a
 * loaded table (null: it did not load, `error` says why). Pure: the tests pass a fixed table.
 */
export function potionCostFrom(file: PotionEquivalentsFile | null, id: string, ascension: number, act: number | null | undefined, fightKind: PotionFightKind, error?: string): PotionCost {
  const eq = file ? potionEquivalentFrom(file, id, act, ascension) : null;
  const base = { id, name: eq?.name ?? file?.potions[id]?.name ?? id, holdHp: eq ? eq.holdHp : null, source: eq ? sourceLabel(eq, true) : null };
  if (!potionCostOptions.enabled) return { ...base, hp: 0, zero: "off" };
  if (!file) return { ...base, hp: 0, zero: "no_table", ...(error ? { error } : {}) };
  if (!eq) return { ...base, hp: 0, zero: "no_value" };
  if (fightKind === "boss") return { ...base, hp: 0, zero: "boss" };
  const hp = Math.max(0, eq.holdHp);
  return { ...base, hp, zero: hp > 0 ? null : "worthless" };
}

/** The table Jev's facts read (potionWorthSource.dir: src/knowledge unless a test points it elsewhere), or its error. */
function table(): { file: PotionEquivalentsFile | null; error?: string } {
  try {
    return { file: loadPotionEquivalents(potionWorthSource.dir) };
  } catch (error) {
    return { file: null, error: (error instanceof Error ? error.message : String(error)).slice(0, 160) };
  }
}

/**
 * potionCost(id, ascension, act, fightKind): the cost of one drink from the table Jev's facts read. A table that does
 * not load costs nothing (zero "no_table", its error kept for the question) rather than stopping the fight.
 */
export function potionCost(id: string, ascension: number, act: number | null | undefined, fightKind: PotionFightKind): PotionCost {
  const { file, error } = table();
  return potionCostFrom(file, id, ascension, act, fightKind, error);
}

/** Each distinct potion id's cost on this board. */
export function potionCosts(ids: string[], ascension: number, act: number | null | undefined, fightKind: PotionFightKind): Map<string, PotionCost> {
  const { file, error } = table();
  return new Map([...new Set(ids)].map((id) => [id, potionCostFrom(file, id, ascension, act, fightKind, error)]));
}

/** The potion id of a potion card or step ("POTION:<id>:<slot>"), or null. */
export function potionIdOf(cardId: string): string | null {
  return cardId.startsWith("POTION:") ? (cardId.split(":")[1] ?? null) : null;
}

/** A potion card carrying its cost (turn-solver reads card.potionCost when the potion is drunk); others unchanged. */
export function withPotionCost(card: CardModel, costs: Map<string, PotionCost>): CardModel {
  const id = card.type === "Potion" ? potionIdOf(card.cardId) : null;
  const cost = id ? costs.get(id)?.hp ?? 0 : 0;
  return cost > 0 ? { ...card, potionCost: cost } : card;
}

/** 「4.7 HP (A8 公式 n=88)」, 「0 (boss fight)」, 「0 (no conversion value)」: one potion's cost for Jev. */
export function potionCostText(cost: PotionCost): string {
  switch (cost.zero) {
    case "boss":
      return "0 (boss fight: potions cost nothing here)";
    case "no_value":
      return "0 (no conversion value in the potion table)";
    case "worthless":
      return `0 (held value 0 in the potion table${cost.source ? `, ${cost.source}` : ""})`;
    case "no_table":
      return "0 (the potion table did not load)";
    case "off":
      return "0 (potion cost switched off)";
    default:
      return `${round1(cost.hp)} HP (${cost.source ?? "potion table"})`;
  }
}

/** The rollout numbers potionCostFact reads (rollout.ts LineEstimate; decision code reaches rollout.ts only through rollout-live.ts). */
export interface CostedLine {
  hpLoss: number;
  potionCost?: number;
  laterDrinks?: Record<string, number>;
  samples: number;
  horizon: number;
}

/** The potions a line drinks this turn (ids, in order). */
export function drunkIds(plan: Pick<Plan, "steps">): string[] {
  return plan.steps.map((step) => potionIdOf(step.cardId)).filter((id): id is string => id !== null);
}

/** A potion's name for Jev: the table's, else the step's own name. */
function nameOf(id: string, costs: Map<string, PotionCost>, plan?: Pick<Plan, "steps">): string {
  const step = plan?.steps.find((entry) => potionIdOf(entry.cardId) === id);
  return costs.get(id)?.name ?? step?.name.replace(/^potion /, "") ?? id;
}

/**
 * Jev's option fact (Dai 2026-09-30): 「fight HP loss X; potions used N (names); potion cost Y HP (potion table: held
 * value in this act); total Z」. X is the rollout's expected HP lost to the fight's end (this turn's exact loss when
 * there is no rollout: said so), N the potions this turn drinks plus the later turns' expected drinks, Y their expected
 * cost (the rollout's; this turn's drinks at their cost without it), Z = X + Y: what the lines are ranked by, after deaths.
 */
export function potionCostFact(plan: Plan, line: CostedLine | null, costs: Map<string, PotionCost>): string {
  const now = drunkIds(plan);
  const later = line ? Object.entries(line.laterDrinks ?? {}).filter(([, n]) => n > 0) : [];
  const samples = line?.samples ?? 1;
  const count = now.length + later.reduce((sum, [, n]) => sum + n / samples, 0);
  // Each potion's own cost, short (its source is in potion_context's worth lines): 「火焰药水 4 HP」, 「格挡药水 0 (boss fight)」.
  const each = (id: string) => `${nameOf(id, costs, plan)} ${shortCost(costs.get(id))}`;
  const parts = [
    ...(now.length > 0 ? [`this turn: ${now.map(each).join(", ")}`] : []),
    ...(later.length > 0 ? [`later turns: ${later.map(([id, n]) => `${nameOf(id, costs)} in ${n}/${samples} samples`).join(", ")}`] : []),
  ];
  const nowCost = now.reduce((sum, id) => sum + (costs.get(id)?.hp ?? 0), 0);
  const cost = line ? (line.potionCost ?? 0) : nowCost;
  const loss = line ? line.hpLoss : plan.outcome.hpLoss;
  const head = !line ? "this turn HP loss (no rollout of the later turns)" : line.horizon > 1 ? "fight HP loss" : "fight HP loss (a rough estimate: no rollout of the later turns)";
  const used = count === 0 ? "potions used 0" : `potions used ${round1(count)} (${parts.join("; ")})`;
  return `${head} ${round1(loss)}; ${used}; potion cost ${round1(cost)} HP (potion table, this act's held value${line && later.length > 0 ? ", later turns' drinks averaged over the samples" : ""}); total ${round1(loss + cost)}`;
}

/** 「4 HP」, 「0 (boss fight)」, 「0 (no conversion value)」: one potion's cost inside an option's fact. */
function shortCost(cost: PotionCost | undefined): string {
  if (!cost) return "0 (no conversion value)";
  switch (cost.zero) {
    case "boss":
      return "0 (boss fight)";
    case "no_value":
      return "0 (no conversion value)";
    case "worthless":
      return "0 (held value 0)";
    case "no_table":
      return "0 (potion table did not load)";
    case "off":
      return "0 (cost off)";
    default:
      return `${round1(cost.hp)} HP`;
  }
}
