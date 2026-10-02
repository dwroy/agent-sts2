/**
 * THIEF_COST (Dai 2026-10-02, docs/thief.md §7): what the card a Thieving Hopper stole is worth, in HP, so the rollout
 * can rank "kill it before it leaves" against HP like a potion's cost. Dai's conversion, with B3's whole-fight boss
 * simulator (build-sim.ts, boss-start.ts; docs/boss-sim.md §12):
 *   - this act's boss fought to the end from the synthetic pre-fight start, three decks on the same seeds (common random
 *     numbers): the deck WITH the card at the boss-entry HP (the base), WITHOUT it at that HP, and WITH it at
 *     THIEF_CARD_HP_STEP less HP;
 *   - card worth Δwin = win(with) − win(without); the win rate an HP of entry HP buys = (win(with) − win(with, −step)) /
 *     step; the card's HP = Δwin ÷ (Δwin per HP): the HP that, taken off the entry with the card kept, leaves the boss
 *     as winnable as without the card (a linear reading of the paired differences, raw rates: the calibration map is
 *     monotone, and both differences start from the same base, so the ratio is the calibrated one to first order).
 * Noise: both differences are paired (the same seeds) with standard errors; a card difference within THIEF_CARD_Z
 * standard errors is "not significant" and worth 0 (a weaker card does not show in the boss fight at this deck), a
 * card that wins less with it worth 0 (losing it costs nothing), an HP slope within THIEF_CARD_Z standard errors (or
 * not positive: the boss is won, or lost, at either HP) gives no conversion at all: no value, no cost, and the facts
 * say why. A value is clamped to [0, THIEF_CARD_CAP_HP] (docs/thief.md §7: why that cap).
 * The entry HP is the B3 one (build-sim-facts routeEntry: the act's route plan projected to the boss from the HP now,
 * else the HP now). A low-trust boss (boss-trust.json, B3's list) is computed all the same and marked: Dai decides.
 * Computed once per Hopper fight as soon as its theft is known (loop.ts, THIEF_CARD_BUDGET_MS), kept in screen memory.
 * Never throws: an error is a value with status "error" and no HP.
 */

import { cardUpgrade } from "../knowledge/card-upgrades.js";
import type { MonsterDb } from "../knowledge/monster-db.js";
import type { DecisionEnv } from "../project/types.js";
import { offHandCardModel } from "../strategy/card-model.js";
import type { MoveModelData, RolloutInput } from "../strategy/rollout.js";
import { missingCardKeys, thiefFightOf, thievesOf, type MissingCard } from "../strategy/thief.js";
import { asRecord, str } from "../util/json.js";
import { bossKey, syntheticBossStart } from "./boss-start.js";
import { LOW_CONFIDENCE_B3 } from "./boss-trust.js";
import { compareOptions, type DeckOption } from "./build-sim.js";
import type { DeckSimRunner } from "./build-sim-pool.js";
import { routeEntry, upgradedEntry } from "./build-sim-facts.js";
import { cardHpOf, THIEF_CARD_BUDGET_MS, THIEF_CARD_HP_STEP, THIEF_CARD_SAMPLES, THIEF_CARD_SEED, type Paired, type ThiefCardMeasures, type ThiefCardValue } from "./thief-card-hp.js";

export * from "./thief-card-hp.js";

export interface ThiefCardSetup {
  runner: DeckSimRunner;
  samples?: number;
  seed?: number;
  budgetMs?: number;
  now?: () => number;
  db?: MonsterDb;
  mm?: MoveModelData;
  /** Tools: the entry HP and its source instead of the route projection. */
  entry?: { hp: number; source: string };
}

const r4 = (x: number) => Math.round(x * 10000) / 10000;

/** The stolen card as a deck card of the boss simulation: the game data's numbers, upgraded as card-upgrades.json logs it. */
function stolenModel(env: DecisionEnv, card: MissingCard) {
  const info = env.knowledge.card(card.id);
  if (!info) return null;
  const raw: Record<string, unknown> = {
    card_id: card.id,
    upgraded: card.upgraded,
    name: card.name,
    dynamic_values: info.vars,
    rules_text: info.descriptionRaw,
    resolved_rules_text: info.description,
    energy_cost: info.cost,
    costs_x: info.xCost,
  };
  const own = card.upgraded && cardUpgrade(card.id) ? (upgradedEntry(raw) ?? raw) : raw;
  return offHandCardModel(own, card.id, card.upgraded, 990, env.knowledge);
}

/**
 * The stolen card's HP worth in this act's boss fight (module comment). `card`: thief.ts missingCardKeys' one card.
 * Never throws.
 */
export async function thiefCardValue(env: DecisionEnv, card: MissingCard, setup: ThiefCardSetup): Promise<ThiefCardValue> {
  const now = setup.now ?? (() => performance.now());
  const started = now();
  const { state, knowledge } = env;
  const run = asRecord(state.run?.raw);
  const bossId = str(run["boss_id"]) || state.run?.boss_id || "";
  const key = bossKey(bossId);
  const base: ThiefCardValue = {
    fight: thiefFightOf(state),
    card: card.name,
    cardId: `${card.id}${card.upgraded ? "+" : ""}`,
    boss: key,
    bossName: key,
    lowTrust: LOW_CONFIDENCE_B3[key] ?? null,
    entryHp: state.run?.current_hp ?? 0,
    maxHp: state.run?.max_hp ?? 0,
    entrySource: "",
    step: THIEF_CARD_HP_STEP,
    samples: 0,
    requested: setup.samples ?? THIEF_CARD_SAMPLES,
    timedOut: false,
    ms: 0,
    measures: null,
    route: null,
    ratio: null,
    hp: null,
    status: "error",
    why: null,
  };
  const done = (patch: Partial<ThiefCardValue>): ThiefCardValue => ({ ...base, ...patch, ms: Math.round(now() - started) });
  try {
    if (!bossId) return done({ status: "no_boss", why: "this act's boss is not known" });
    const model = stolenModel(env, card);
    if (!model) return done({ status: "unknown_card", why: `${card.name} is not in the game data` });
    const hpNow = state.run?.current_hp ?? 1;
    const maxNow = state.run?.max_hp ?? hpNow;
    let entryHp: number;
    let entrySource: string;
    if (setup.entry) {
      entryHp = Math.max(1, Math.round(setup.entry.hp));
      entrySource = setup.entry.source;
    } else {
      const entry = routeEntry(env);
      entryHp = Math.max(1, Math.round(entry.project(hpNow, maxNow)));
      entrySource = entry.planned ? "the act's route plan projected to the boss (as B3)" : "HP now (no route plan to the boss)";
    }
    const start = syntheticBossStart(state, knowledge, bossId, entryHp, { ...(setup.db ? { db: setup.db } : {}), ...(setup.mm ? { mm: setup.mm } : {}) });
    const step = Math.min(THIEF_CARD_HP_STEP, start.entryHp - 1);
    const named = { bossName: start.boss.name, entryHp: start.entryHp, maxHp: start.maxHp, entrySource, step, ...(model.known && !model.drawsUntil ? {} : { partial: true }) };
    if (step < 1) return done({ ...named, status: "flat", why: `entry HP ${start.entryHp}: no lower HP to compare` });
    const withCard: RolloutInput = { ...start.input, piles: { ...start.input.piles, draw: [...start.input.piles.draw, model] } };
    const options: DeckOption[] = [
      { key: "without", change: { piles: start.input.piles } },
      { key: "lower", change: { solver: { ...withCard.solver, player: { ...withCard.solver.player, hp: start.entryHp - step } } } },
    ];
    const budget = (setup.budgetMs ?? THIEF_CARD_BUDGET_MS) - (now() - started);
    const result = await compareOptions(setup.runner, withCard, options, { samples: setup.samples ?? THIEF_CARD_SAMPLES, seed: setup.seed ?? THIEF_CARD_SEED, deadlineMs: Math.max(200, budget), ...(setup.now ? { now: setup.now } : {}) });
    const run2 = { ...named, samples: result.samples, requested: result.requested, timedOut: result.timedOut };
    if (result.samples === 0) return done({ ...run2, status: "no_samples", why: "no sample finished within the time budget" });
    const without = result.options.find((o) => o.key === "without")!;
    const lower = result.options.find((o) => o.key === "lower")!;
    // diff = option − base (the deck with the card at the entry HP): what the card and the step of HP are worth is the
    // negative on the win rate, the difference itself on the boss's HP left and on our HP lost.
    const paired = (value: number, se: number, scale = 1): Paired => ({ value: r4(value / scale), se: r4(se / scale) });
    const measures: ThiefCardMeasures = {
      win: { with: result.base.win, without: without.win, lower: lower.win },
      cardDiff: paired(-(without.diff?.raw ?? 0), without.diff?.se ?? 0),
      perHp: paired(-(lower.diff?.raw ?? 0), lower.diff?.se ?? 0, step),
      bossLeft: { with: result.base.bossLeft, card: paired(without.diff?.bossLeft ?? 0, without.diff?.bossLeftSe ?? 0), perHp: paired(lower.diff?.bossLeft ?? 0, lower.diff?.bossLeftSe ?? 0, step) },
      hpLost: { with: r4(result.base.hpLossMean ?? 0), card: paired(without.diff?.hpLoss ?? 0, without.diff?.hpLossSe ?? 0) },
    };
    return done({ ...run2, measures, ...cardHpOf(measures) });
  } catch (error) {
    return done({ status: "error", why: `error: ${String(error instanceof Error ? error.message : error).slice(0, 160)}` });
  }
}


/** A value with no HP (no cost) and why: for a fight whose stolen card cannot be told. */
function noValue(env: DecisionEnv, card: string, status: ThiefCardValue["status"], why: string): ThiefCardValue {
  const run = asRecord(env.state.run?.raw);
  const key = bossKey(str(run["boss_id"]) || env.state.run?.boss_id || "");
  return {
    fight: thiefFightOf(env.state),
    card,
    cardId: "",
    boss: key,
    bossName: key,
    lowTrust: LOW_CONFIDENCE_B3[key] ?? null,
    entryHp: env.state.run?.current_hp ?? 0,
    maxHp: env.state.run?.max_hp ?? 0,
    entrySource: "",
    step: THIEF_CARD_HP_STEP,
    samples: 0,
    requested: 0,
    timedOut: false,
    ms: 0,
    measures: null,
    route: null,
    ratio: null,
    hp: null,
    status,
    why,
  };
}

/**
 * The loop's step (THIEF_COST, before planning a combat state): a living Thieving Hopper carrying a card, its fight's
 * value not in screen memory yet, the card told by the deck diff (thief.ts missingCardKeys) -> thiefCardValue into
 * memory.thiefCardValue. Returns the value when it made one now (the loop logs it with its next decision), else null.
 * Several cards missing (the deck lost another card since the fight's start): no value, said. The fight's start not
 * seen: nothing (the facts say the card is unknown). Never throws.
 */
export async function ensureThiefCardValue(env: DecisionEnv, setup: ThiefCardSetup): Promise<ThiefCardValue | null> {
  try {
    const { state, screenMemory: memory } = env;
    if (!state.in_combat) return null;
    const fight = thiefFightOf(state);
    if (memory.thiefCardValue?.fight === fight) return null;
    if (!thievesOf(state, memory).some((thief) => thief.cards !== undefined)) return null;
    const missing = missingCardKeys(memory, state);
    if (missing === null || missing.length === 0) return null;
    const value =
      missing.length === 1
        ? await thiefCardValue(env, missing[0]!, setup)
        : noValue(env, missing.map((card) => card.name).join(" / "), "unknown_card", `the deck lost ${missing.length} cards since the fight's start (${missing.map((card) => card.name).join(", ")}): which one the Hopper took is not known`);
    memory.thiefCardValue = value;
    return value;
  } catch {
    return null;
  }
}
