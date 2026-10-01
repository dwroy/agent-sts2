/**
 * Random potions by Monte Carlo (Dai 2026-09-28): what a potion whose result is random would do this turn,
 * as a distribution over samples, for Jev's combat question. Never a fixed value, never auto-drunk.
 *
 *   - Card-choice potions (Attack/Skill/Power/Colorless Potion; Orobic Acid takes all three): each sample
 *     is one random offer of 3 cards from the real pool (card-model CHOICE_POTIONS); the solver tries each
 *     card taken (free this turn) and keeps the best line.
 *   - Draw potions (Swift Potion, Clarity, Cure All, Snecko Oil, Gambler's Brew, Glowwater, Distilled Chaos,
 *     Bottled Potential): each sample is one shuffled order of the known piles (the draw pile, then the
 *     discard pile reshuffled; Bottled Potential shuffles the hand in too), Snecko Oil's random costs too.
 *
 * Every sample's line starts with the drink (SolverInput.firstKey): the option is "drink now, then re-plan
 * with the real cards". Samples are seeded per board (deterministic); other potions are not combined in
 * them (cost). A time budget cuts the samples (never below MC_MIN_SAMPLES: one).
 */

import type { JsonValue } from "../util/json.js";
import { CHOICE_POTIONS, DRAW_POTIONS, potionEffect, potionShell, type CardModel } from "./card-model.js";
import { effectiveLoss, hpText, lastingHpPerPoint, solveTap, solveTurn, type Plan, type SolverInput } from "./turn-solver.js";

/** Samples per random potion (fewer when the time budget runs out). */
export const MC_SAMPLES = 12;
/**
 * Samples kept whatever the clock says: one, the option's example line. Every later sample starts only while the budget
 * lasts (fix-queue-v4 #5: the minimum used to be 4 run blind, DT1H1URTUAD8 F42 knights T1 took 1795 + 1023 ms of a 400 ms
 * budget, and the rollout, whose budget is what is left of 1500 ms, fell back to 1 turn).
 */
export const MC_MIN_SAMPLES = 1;
/** Node cap of one sample's solve (the drink is forced first, so it searches one subtree). */
export const MC_NODES = 8000;
/** Node cap floor when slow samples cut it (the rollout's fast policy uses the same). */
export const MC_MIN_NODES = 1500;
/** Wall-clock budget of all random potions of one decision, taken out of the rollout's budget. */
export const MC_BUDGET_MS = 400;
/** Cards offered by a card-choice potion. */
export const CHOICE_OFFERED = 3;
/** Card rarities in the random-card pools (no Basic, Event, Token, Ancient cards). */
export const POOL_RARITIES = new Set(["Common", "Uncommon", "Rare"]);

/**
 * A sample beats the best potion-free line only by a real margin (6189 F17 T1: Gambler's Brew +0.1
 * expected damage at equal HP read "beats 12/12" when any score above the dry line's counted): it saves
 * MC_BEATS_HP HP, or deals MC_BEATS_DAMAGE more, or a mix worth as much (HP saved + damage gained x
 * MC_BEATS_HP / MC_BEATS_DAMAGE >= MC_BEATS_HP), or wins the fight this turn when the dry line does not,
 * or lives where the dry line dies. A sample that dies where the dry line lives never beats it. The HP saved is after
 * the drink's cost (potion-cost.ts: the sample's outcome.potionCost, its held value; 0 in a boss fight).
 *
 * What lasts past this turn counts too (fix-queue-v4 #4: 9FVEQKJ0Y1YQ F33, CDR0Q6929CKR F33, W80JV2YVC8UZ: a Power
 * Potion kept for the boss read "beats 0/12" there, its Power worth nothing this turn, and was never drunk): the
 * lasting value the sample sets up over the dry line's (Outcome.lasting: permanent Strength, powers, Regen's later
 * heals), in HP as the solver's own score trades them (turn-solver lastingHpPerPoint: x 1.8 in a boss fight, 1.4 an
 * elite, 0.8 a hallway, less the later the turn, over the HP weight). The same number the line's score already has.
 */
export const MC_BEATS_HP = 2;
/** Damage worth MC_BEATS_HP HP in the beats margin. */
export const MC_BEATS_DAMAGE = 5;

/** Whether a sample's line beats the best potion-free line by the MC_BEATS margin. */
export function beatsDryLine(plan: Plan, dry: Plan | null, lastingHp = 0): boolean {
  if (dry === null) return !plan.outcome.dies;
  if (plan.outcome.dies) return false;
  if (dry.outcome.dies) return true;
  if (plan.outcome.winsFight && !dry.outcome.winsFight) return true;
  const hpSaved = effectiveLoss(dry) - effectiveLoss(plan);
  const damageGained = plan.outcome.damageDealt - dry.outcome.damageDealt;
  return hpSaved + (damageGained * MC_BEATS_HP) / MC_BEATS_DAMAGE + lastingGainedHp(plan, dry, lastingHp) >= MC_BEATS_HP - 1e-9;
}

/** The lasting value a line sets up over the dry line's, in HP at `lastingHp` per point (0 when the fight is won now). */
export function lastingGainedHp(plan: Plan, dry: Plan, lastingHp: number): number {
  if (plan.outcome.winsFight) return 0;
  return ((plan.outcome.lasting ?? 0) - (dry.outcome.lasting ?? 0)) * lastingHp;
}

/** Seeded PRNG (mulberry32, as the rollout's). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Offline tools only (tools/potion-mc-measure.ts): every Monte Carlo run. null is a no-op. */
export const potionMcTap: { onRun: ((mc: PotionMc) => void) | null } = { onRun: null };

/** Test hooks: the clock and the budget. */
export const potionMcOptions: { now: (() => number) | null; budgetMs: number; samples: number } = { now: null, budgetMs: MC_BUDGET_MS, samples: MC_SAMPLES };

/** What one random potion's samples are drawn from. */
export interface PotionMcSource {
  potionId: string;
  name: string;
  slot: number;
  /** The potion's game text (filled numbers). */
  text: string;
  kind: "choice" | "draw";
  /** Card-choice potions: the pool per card type, as hand cards (free this turn: cost 0), and its name. */
  pools?: Record<string, CardModel[]>;
  poolName?: string;
  /** Draw potions: the known piles as hand cards (Strength and Weak in). */
  piles?: { draw: CardModel[]; discard: CardModel[] };
  /** Fiddle / No Draw: nothing is drawn (Distilled Chaos still plays its top cards). */
  noDraw?: boolean;
  /**
   * The drink's cost in HP (potion-cost.ts: the potion's held value; absent or 0 in a boss fight or without a value):
   * each sample's card carries it, so its line's score and outcome count it, and "beats" is after it.
   */
  cost?: number;
}

export interface Spread {
  mean: number;
  min: number;
  max: number;
}

export interface PotionMc {
  source: PotionMcSource;
  /** Samples run (of `requested`: fewer when the budget ran out). */
  samples: number;
  requested: number;
  /** Each sample's best line (the drink first), in sample order; null when the drink had no legal line. */
  plans: (Plan | null)[];
  /** The median sample's line (by the solver's score): the example shown, the one the rollout plays. */
  median: Plan | null;
  hpLoss: Spread;
  damage: Spread;
  wins: number;
  dies: number;
  /** Samples whose line beats the best potion-free line by a real margin (beatsDryLine; dry dead: any living sample). */
  beats: number;
  /**
   * Mean over the samples with a line of HP saved, damage gained and lasting value gained (in HP: beatsDryLine) against
   * the best potion-free line (null: none).
   */
  vsDry: { hpSaved: number; damageGained: number; lastingGained: number } | null;
  ms: number;
  degraded: boolean;
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** k distinct cards (by id) from the pool, uniformly. */
function pickDistinct(pool: CardModel[], k: number, random: () => number): CardModel[] {
  const out: CardModel[] = [];
  const left = pool.slice();
  while (out.length < k && left.length > 0) {
    const at = Math.floor(random() * left.length);
    const card = left.splice(at, 1)[0]!;
    if (!out.some((other) => other.cardId === card.cardId)) out.push(card);
  }
  return out;
}

/** The FNV-1a seed of a board key (deterministic per board and potion). */
export function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) || 1;
}

/**
 * One sample of the potion: its drink as a solver card with the sample's real cards (`choices`, `adds`,
 * `drawn`, `sneckoCosts`). `hand` is the hand at the drink (Bottled Potential shuffles it in; Snecko Oil
 * re-costs it).
 */
export function samplePotion(source: PotionMcSource, hand: CardModel[], random: () => number): CardModel {
  // The modelled effect minus its expected-value draw and card: the sample's real cards replace them.
  const { draw: _evDraw, generates: _evCard, ...effect } = potionEffect(source.potionId) ?? { target: "self" as const };
  const shell: CardModel = { ...potionShell(source.potionId, source.name, source.slot, []), ...effect, draw: 0, ...((source.cost ?? 0) > 0 ? { potionCost: source.cost } : {}) };
  const own = (card: CardModel, i: number, prefix: string, base: number): CardModel => ({ ...card, index: base + i, key: `${prefix}${source.slot}.${i}` });
  if (source.kind === "choice") {
    const spec = CHOICE_POTIONS[source.potionId]!;
    const pools = source.pools ?? {};
    if (spec.takeAll) {
      const adds = spec.types.flatMap((type) => pickDistinct(pools[type] ?? [], 1, random));
      return { ...shell, adds: adds.map((card, i) => own(card, i, "g", 200 + source.slot * 10)) };
    }
    const pool = spec.types.flatMap((type) => pools[type] ?? []);
    const offer = pickDistinct(pool, CHOICE_OFFERED, random);
    return { ...shell, choices: offer.map((card, i) => own(card, i, "g", 200 + source.slot * 10)) };
  }
  const count = DRAW_POTIONS[source.potionId]?.cards ?? 0;
  const piles = source.piles ?? { draw: [], discard: [] };
  const handCards = hand.filter((card) => card.type !== "Potion");
  const order =
    source.potionId === "BOTTLED_POTENTIAL"
      ? shuffled([...handCards, ...piles.draw, ...piles.discard], random)
      : [...shuffled(piles.draw, random), ...shuffled(piles.discard, random)];
  const drawn = source.noDraw && source.potionId !== "DISTILLED_CHAOS" ? [] : order.slice(0, count).map((card, i) => own(card, i, "d", 300 + source.slot * 20));
  const sample: CardModel = { ...shell, drawn };
  if (source.potionId === "SNECKO_OIL") {
    // Every card in hand after the drink costs 0-3 at random this turn.
    const costs: Record<string, number> = {};
    for (const card of [...handCards, ...drawn]) costs[card.key] = Math.floor(random() * 4);
    sample.sneckoCosts = costs;
  }
  return sample;
}

const spread = (xs: number[]): Spread => ({
  mean: xs.length > 0 ? xs.reduce((sum, x) => sum + x, 0) / xs.length : 0,
  min: xs.length > 0 ? Math.min(...xs) : 0,
  max: xs.length > 0 ? Math.max(...xs) : 0,
});

/**
 * The potion's Monte Carlo: `input` is this turn's solver input WITHOUT any potion (the samples do not
 * combine potions); `dryBest` the best potion-free line of the turn (null: none). `budgetMs` of wall clock.
 */
export function runPotionMc(input: SolverInput, source: PotionMcSource, dryBest: Plan | null, seed: number, budgetMs: number, requested = potionMcOptions.samples): PotionMc {
  const now = potionMcOptions.now ?? (() => performance.now());
  const start = now();
  const random = rng(seed);
  const hand = input.hand.filter((card) => card.type !== "Potion");
  const plans: (Plan | null)[] = [];
  let degraded = false;
  // Offline taps read the live planner's own solve, not these.
  const tap = solveTap.onSolve;
  solveTap.onSolve = null;
  try {
    // A sample slower than its share of the budget cuts the node cap of the next ones (big hands:
    // Snecko Oil's 10 cards, Gambler's Brew's discard sets), down to MC_MIN_NODES.
    let nodes = MC_NODES;
    const share = budgetMs / Math.max(1, requested);
    let lastTook = 0;
    for (let i = 0; i < requested; i += 1) {
      // Past the minimum, a sample starts only when it fits: the time so far and the last sample's again within the budget.
      if (i >= MC_MIN_SAMPLES && now() - start + lastTook > budgetMs) {
        degraded = true;
        break;
      }
      const potion = samplePotion(source, hand, random);
      const began = now();
      const solved = solveTurn({ ...input, hand: [...hand, potion], firstKey: potion.key, maxNodes: nodes });
      const took = now() - began;
      lastTook = took;
      if (took > share && nodes > MC_MIN_NODES) {
        nodes = Math.max(MC_MIN_NODES, Math.floor((nodes * share) / took));
        degraded = true;
      }
      plans.push(solved.plans.find((plan) => plan.steps[0]?.cardId === potion.cardId) ?? null);
    }
  } finally {
    solveTap.onSolve = tap;
  }
  const lines = plans.filter((plan): plan is Plan => plan !== null);
  const byScore = [...lines].sort((a, b) => a.score - b.score);
  const median = byScore.length > 0 ? byScore[Math.floor((byScore.length - 1) / 2)]! : null;
  const lastingHp = lastingHpPerPoint(input);
  const beatsDry = lines.filter((plan) => beatsDryLine(plan, dryBest, lastingHp)).length;
  const mean = (xs: number[]) => xs.reduce((sum, x) => sum + x, 0) / Math.max(1, xs.length);
  const vsDry = dryBest !== null && lines.length > 0
    ? {
        hpSaved: mean(lines.map((plan) => dryBest.outcome.hpLoss - plan.outcome.hpLoss)),
        damageGained: mean(lines.map((plan) => plan.outcome.damageDealt - dryBest.outcome.damageDealt)),
        lastingGained: mean(lines.map((plan) => lastingGainedHp(plan, dryBest, lastingHp))),
      }
    : null;
  const result: PotionMc = {
    source,
    samples: plans.length,
    requested,
    plans,
    median,
    hpLoss: spread(lines.map((plan) => plan.outcome.hpLoss)),
    damage: spread(lines.map((plan) => plan.outcome.damageDealt)),
    wins: lines.filter((plan) => plan.outcome.winsFight).length,
    dies: lines.filter((plan) => plan.outcome.dies).length,
    beats: beatsDry,
    vsDry,
    ms: now() - start,
    degraded,
  };
  potionMcTap.onRun?.(result);
  return result;
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const spreadText = (s: Spread) => `mean ${round1(s.mean)} [${Math.round(s.min)}-${Math.round(s.max)}]`;

/** What the potion does, in words: the random part and where its cards come from. */
function effectText(mc: PotionMc): { does: string; simulated: string } {
  const { source } = mc;
  const n = `${mc.samples} sample${mc.samples === 1 ? "" : "s"}${mc.degraded ? ` (cut from ${mc.requested} to fit the time budget)` : ""}`;
  if (source.kind === "choice") {
    const spec = CHOICE_POTIONS[source.potionId]!;
    const pool = spec.types.reduce((sum, type) => sum + (source.pools?.[type]?.length ?? 0), 0);
    if (spec.takeAll) {
      return {
        does: `adds a random ${spec.types.join(", a random ")} card, free this turn`,
        simulated: `Monte Carlo, ${n}: one random card of each type from the ${source.poolName ?? "card"} pool (${pool} cards, uniform), the drink first`,
      };
    }
    return {
      does: `offers ${CHOICE_OFFERED} random ${spec.types.join("/")} cards, take 1, free this turn`,
      simulated: `Monte Carlo, ${n}: ${CHOICE_OFFERED} random cards from the ${source.poolName ?? "card"} pool (${pool} cards, uniform), each solved with the best of the ${CHOICE_OFFERED} taken, the drink first`,
    };
  }
  const piles = source.piles ?? { draw: [], discard: [] };
  const cards = DRAW_POTIONS[source.potionId]?.cards ?? 0;
  const what =
    source.potionId === "GAMBLERS_BREW"
      ? "discards any cards, draws as many"
      : source.potionId === "DISTILLED_CHAOS"
        ? `plays the top ${cards} cards of the draw pile`
        : source.potionId === "GLOWWATER_POTION"
          ? `exhausts the hand, draws ${cards}`
          : source.potionId === "BOTTLED_POTENTIAL"
            ? `shuffles every card into the draw pile, draws ${cards}`
            : `draws ${cards}${source.potionId === "SNECKO_OIL" ? ", every card in hand costs 0-3 at random this turn" : ""}`;
  const order = source.potionId === "BOTTLED_POTENTIAL" ? "the hand and both piles shuffled" : `the draw pile (${piles.draw.length} cards) in a random order, then the discard pile (${piles.discard.length}) reshuffled`;
  return { does: what, simulated: `Monte Carlo, ${n}: ${order}${source.potionId === "SNECKO_OIL" ? ", random costs" : ""}, the drink first${source.noDraw ? " (No Draw: nothing is drawn)" : ""}` };
}

/**
 * The option's facts for Jev: the distribution over the samples, the share winning this turn and beating
 * the best potion-free line, and the median sample's line as the example of what may follow.
 */
export function potionMcCriteria(mc: PotionMc, dryBest: Plan | null, stepText: (plan: Plan) => string, othersHeld: boolean): Record<string, JsonValue> {
  const { does, simulated } = effectText(mc);
  const n = mc.samples;
  const lines = mc.plans.filter((plan) => plan !== null).length;
  const out: Record<string, JsonValue> = {
    plays: `drink ${mc.source.name} now (${does}), then re-plan the turn with the real cards${mc.median ? `; example, the median of ${n} samples: ${stepText(mc.median)}` : ""}`,
    result: "result unknown until drunk; after drinking you will see the actual cards and choose the rest of the turn again",
    potion_text: mc.source.text,
    simulated,
  };
  if (lines === 0) {
    out["samples"] = "no sample could be played";
    return out;
  }
  out["hp_lost"] = spreadText(mc.hpLoss);
  out["damage_dealt"] = spreadText(mc.damage);
  out["wins_fight_this_turn"] = `${mc.wins}/${n} samples`;
  if (mc.dies > 0) out["dies_this_turn"] = `${mc.dies}/${n} samples`;
  const signed = (x: number) => `${x >= 0 ? "+" : ""}${round1(x)}`;
  out["beats_best_potion_free_line"] = dryBest
    ? `${mc.beats}/${n} samples (best potion-free line: ${hpText(dryBest.outcome.hpLoss)}, dmg ${dryBest.outcome.damageDealt}${dryBest.outcome.dies ? ", dies" : ""}; a sample beats it by saving ${MC_BEATS_HP}+ HP${(mc.source.cost ?? 0) > 0 ? ` after the potion's cost (${round1(mc.source.cost!)} HP)` : ""} or dealing ${MC_BEATS_DAMAGE}+ more damage (or a mix worth as much, the lasting value it sets up counted in HP), winning the fight, or living where it dies)`
    : `${mc.beats}/${n} samples (no potion-free line)`;
  if (dryBest && mc.vsDry) {
    const lasting = Math.abs(mc.vsDry.lastingGained) >= 0.05 ? `, mean lasting value ${signed(mc.vsDry.lastingGained)} HP (Strength and powers set up, over the rest of the fight, as the plan scores rate them)` : "";
    out["vs_best_potion_free_line"] = `mean HP saved ${signed(mc.vsDry.hpSaved)}, mean damage ${signed(mc.vsDry.damageGained)}${lasting}`;
  }
  if (othersHeld) out["note"] = "the other potions held are not combined in these samples";
  return out;
}

/** The decision log's record of one random potion's Monte Carlo. */
export function potionMcLog(mc: PotionMc): Record<string, JsonValue> {
  return {
    potion: mc.source.potionId,
    kind: mc.source.kind,
    samples: mc.samples,
    requested: mc.requested,
    degraded: mc.degraded,
    ms: Math.round(mc.ms),
    wins: mc.wins,
    beats: mc.beats,
    ...(mc.vsDry ? { hp_saved_mean: round1(mc.vsDry.hpSaved), dmg_gained_mean: round1(mc.vsDry.damageGained), lasting_gained_mean: round1(mc.vsDry.lastingGained) } : {}),
    dies: mc.dies,
    hp_mean: round1(mc.hpLoss.mean),
    dmg_mean: round1(mc.damage.mean),
  };
}
