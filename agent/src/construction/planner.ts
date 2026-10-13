import { binomialInterval } from "../sim/quantitative-stats.js";
import type { BuildAction, BuildState, CoreTemplate, FightEvaluator, OpportunityModel, PathForecast, PathStep, Probability, Requirement } from "./types.js";

export function missingRequirements(state: BuildState, core: CoreTemplate): { id: string; count: number }[] {
  const count = (r: Requirement): number => {
    const found: string[] = [];
    for (const card of state.cards) if (r.any.some((c) => c.kind === "card" && c.id === card.id && (!c.upgraded || card.upgraded))) found.push(`card:${card.id}`);
    for (const id of state.relics) if (r.any.some((c) => c.kind === "relic" && c.id === id)) found.push(`relic:${id}`);
    return r.distinct ? new Set(found).size : found.length;
  };
  return core.requirements.map((r) => ({ id: r.id, count: Math.max(0, r.count - count(r)) })).filter((r) => r.count > 0);
}

/** Each transition checks resources before mutation; an invalid proposal never creates a future slot or gold. */
export function applyBuildAction(state: BuildState, action: BuildAction): BuildState | null {
  const next = structuredClone(state);
  if (action.kind === "skip") return next;
  if (!Number.isFinite(action.price) || action.price < 0 || next.gold < action.price) return null;
  next.gold -= action.price;
  if (action.kind === "add") {
    const copies = action.copies ?? 1;
    if (!Number.isInteger(copies) || copies < 1 || (next.cap !== null && next.cards.length + copies > next.cap)) return null;
    for (let i = 0; i < copies; i++) next.cards.push({ ...action.card });
  } else if (action.kind === "relic") {
    if (next.relics.includes(action.id)) return null;
    next.relics.push(action.id);
  } else if (action.kind === "heal") {
    if (!Number.isFinite(action.amount) || action.amount < 0) return null;
    next.hp = Math.min(next.maxHp, next.hp + action.amount);
  } else {
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= next.cards.length) return null;
    if (action.kind === "remove") next.cards.splice(action.index, 1);
    else { if (next.cards[action.index]!.upgraded) return null; next.cards[action.index]!.upgraded = true; }
  }
  return next;
}

export function applyBuildActions(state: BuildState, actions: readonly BuildAction[]): BuildState | null {
  let result: BuildState | null = structuredClone(state);
  for (const action of actions) { result = applyBuildAction(result, action); if (!result) return null; }
  return result;
}

/** A declared completion policy, not a learned card ranking. It sees this offer and inventory only. */
export function completionChoice(state: BuildState, core: CoreTemplate, actions: readonly BuildAction[]): BuildAction {
  const distance = (s: BuildState) => missingRequirements(s, core).reduce((n, r) => n + r.count, 0);
  let best: BuildAction = { kind: "skip" }, score = distance(state), price = Infinity;
  for (const action of actions) {
    const after = applyBuildAction(state, action);
    if (!after) continue;
    const value = distance(after), cost = action.kind === "skip" ? 0 : action.price;
    if (value < score || (value === score && value < distance(state) && cost < price)) { best = action; score = value; price = cost; }
  }
  return best;
}

function probability(values: (boolean | null)[]): Probability {
  const known = values.filter((v) => v !== null), wins = known.filter(Boolean).length;
  const unknown = values.length - known.length;
  return { successes: wins, observed: known.length, unknown, samples: values.length,
    estimate: known.length ? wins / known.length : null,
    interval95: known.length ? binomialInterval(wins, known.length) as [number, number] : null,
    bounds: values.length ? [wins / values.length, (wins + unknown) / values.length] : [0, 1] };
}

/** Stable common random numbers indexed by world and room, not by actions consuming a PRNG. */
function random(seed: number, sample: number, step: number): number {
  let v = (seed ^ Math.imul(sample + 1, 0x9e3779b9) ^ Math.imul(step + 1, 0x85ebca6b)) >>> 0;
  v = Math.imul(v ^ v >>> 16, 0x7feb352d); v = Math.imul(v ^ v >>> 15, 0x846ca68b);
  return ((v ^ v >>> 16) >>> 0) / 4294967296;
}

export interface ForecastInput {
  state: BuildState; core: CoreTemplate; model: OpportunityModel; steps: readonly PathStep[];
  act: number; ascension: number; currentRun: string; asOf: string; samples?: number; seed?: number;
  evaluateFight?: FightEvaluator;
  /** Final-boss completion must be explicitly supplied; passing one act cannot stand for run victory. */
  terminalIsRunEnd?: boolean;
  /** A policy only receives the revealed present, never the sampled future. */
  chooseAction?: (state: Readonly<BuildState>, core: CoreTemplate, actions: readonly BuildAction[]) => BuildAction;
}

/** Joint paths preserve resource costs, death and censoring; never multiply marginal probabilities. */
export function forecastConstruction(input: ForecastInput): PathForecast {
  const { core, model } = input;
  if (core.character !== model.character || !core.ascensions.includes(input.ascension)) throw new Error("construction role/ascension mismatch");
  const samples = Math.max(1, Math.min(2048, Math.floor(input.samples ?? 256)));
  const signature: (boolean | null)[] = [], conditional: (boolean | null)[] = [], functional: (boolean | null)[] = [], wins: (boolean | null)[] = [];
  const floors: number[] = [], dpr: number[] = [];
  const pools = input.steps.map((step) => model.rows.filter((r) => r.run !== input.currentRun && r.ts < input.asOf
    && r.act === input.act && r.ascension === input.ascension && r.kind === step.kind && Math.abs(r.floor - step.floor) <= 4));
  for (let n = 0; n < samples; n++) {
    let state = structuredClone(input.state), inventoryKnown = true, conditionalKnown = true, survivalKnown = true, functionalKnown: boolean | null = null;
    let dead = state.hp <= 0, first = missingRequirements(state, core).length ? null : state.floor;
    let damage = 0, turns = 0, lastFightWon: boolean | null = null;
    for (const [i, step] of input.steps.entries()) {
      if (dead) break;
      state.floor = step.floor;
      if (step.kind === "fight") {
        const result = input.evaluateFight?.(structuredClone(state), step, Math.floor(random(input.seed ?? 7, n, i) * 0x7fffffff), core);
        if (!result?.complete) { survivalKnown = inventoryKnown = false; lastFightWon = null; continue; }
        if (!Number.isFinite(result.hp) || !Number.isFinite(result.gold) || result.turns <= 0) { survivalKnown = false; continue; }
        state.hp = result.hp; state.gold = result.gold; dead = !result.won || state.hp <= 0;
        if (result.combatResources) state.combatResources = structuredClone(result.combatResources);
        lastFightWon = result.won; functionalKnown = result.functional;
        damage += result.damage; turns += result.turns;
      } else if (step.kind === "unknown") inventoryKnown = survivalKnown = false;
      else if (step.kind === "rest") {
        const actions: BuildAction[] = state.cards.map((_, index) => ({ kind: "upgrade", index, price: 0 }));
        const picked = completionChoice(state, core, actions);
        if (picked.kind !== "skip") state = applyBuildAction(state, picked)!;
        else if (step.heal !== undefined) state = applyBuildAction(state, { kind: "heal", amount: step.heal, price: 0 }) ?? state;
        else survivalKnown = false;
      } else {
        const pool = pools[i]!;
        if (!pool.length) { inventoryKnown = conditionalKnown = false; continue; }
        const row = pool[Math.floor(random(input.seed ?? 7, n, i) * pool.length)]!;
        const remaining = row.offers.map((o): BuildAction => ({ kind: "add", card: { id: o.id, upgraded: o.upgraded }, price: o.price }));
        do {
          const choice = input.chooseAction?.(structuredClone(state), core, remaining) ?? completionChoice(state, core, remaining);
          if (choice.kind === "skip") break;
          const at = remaining.findIndex((a) => JSON.stringify(a) === JSON.stringify(choice));
          const next = applyBuildAction(state, choice);
          if (at < 0 || !next) { inventoryKnown = conditionalKnown = false; break; }
          state = next;
          remaining.splice(at, 1);
          if (step.kind === "reward") break;
        } while (remaining.length);
      }
      if (first === null && missingRequirements(state, core).length === 0) first = step.floor;
    }
    // Signature is an inventory-only conditional projection when intervening combat is unmodelled.
    const formed = missingRequirements(state, core).length === 0;
    conditional.push(conditionalKnown ? formed : null);
    signature.push(inventoryKnown ? formed : null);
    functional.push(dead ? false : survivalKnown && inventoryKnown && functionalKnown !== null ? formed && functionalKnown : null);
    wins.push(dead ? false : input.terminalIsRunEnd && survivalKnown ? lastFightWon : null);
    if (inventoryKnown && first !== null) floors.push(first);
    if (turns > 0 && survivalKnown) dpr.push(damage / turns);
  }
  const supplied = pools.flat();
  const opportunityPools = pools.filter((_, i) => ["reward", "shop"].includes(input.steps[i]!.kind));
  return { core: core.id, candidate: core.status !== "validated", samples, missingNow: missingRequirements(input.state, core),
    support: { opportunities: new Set(supplied.map((r) => r.id)).size, independentRuns: new Set(supplied.map((r) => r.run)).size,
      minimumPool: opportunityPools.length ? Math.min(...opportunityPools.map((p) => p.length)) : 0 },
    signature: probability(signature), conditionalSignature: probability(conditional), aliveAndFunctional: probability(functional), terminalWin: probability(wins),
    firstSignatureFloor: floors.length ? floors.reduce((a, b) => a + b, 0) / floors.length : null,
    meanDamagePerTurn: dpr.length ? dpr.reduce((a, b) => a + b, 0) / dpr.length : null,
    limits: ["组件签名概率以经过列出的机会且按补组件策略选择为条件，不是实际可运转或通关概率。",
      "机会从同角色/进阶/幕及邻近楼层的已观察整组选项重采样；未观察机制和跨房间相关性仍有模型误差。",
      "区间仅为抽样误差；死亡、未知过渡及未模拟最终boss不填成功率。", ...core.limits] };
}
