/**
 * Turn-level combat search: every legal order of the cards in hand (energy permitting), simulated
 * to the end of the turn, then scored. This replaces the single-card lookahead that missed a
 * two-Strike lethal on a live run (floor 7, Byrdonis, 10 HP vs 2x9 damage).
 *
 * It is deliberately a *turn* model: draws, random effects and next turn are not simulated. Cards
 * that draw are valued with a flat bonus and the loop re-plans after every single action, so the
 * drawn cards are picked up on the next plan. Numbers are exact where the mod gives them (card
 * values, intents); the scoring weights are heuristics tuned from run logs.
 */

import type { CardModel } from "./card-model.js";

export interface EnemySim {
  index: number;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  vulnerable: number;
  weak: number;
  artifact: number;
  intangible: boolean;
  /** Attack intents for this enemy's next turn, as shown (already including its own Strength/Weak). */
  attacks: { damage: number; hits: number }[];
  /** True when the enemy is a minion/summon whose death does not matter much (not modelled yet). */
  minion?: boolean;
}

export interface PlayerSim {
  hp: number;
  maxHp: number;
  block: number;
  energy: number;
  weak: boolean;
  vulnerable: boolean;
  /** Takes 50% less from enemy attacks? (Intangible etc. — not modelled beyond this flag.) */
  intangible: boolean;
}

export interface SolverInput {
  hand: CardModel[];
  player: PlayerSim;
  enemies: EnemySim[];
  /** Fight importance: elites and bosses value damage more, hallway fights value HP more. */
  fightKind: "monster" | "elite" | "boss" | "unknown";
  maxNodes?: number;
}

export interface Step {
  cardIndex: number;
  cardId: string;
  name: string;
  target: number | null;
  targetName: string | null;
}

export interface Outcome {
  /** Every enemy dead by the end of this turn. */
  winsFight: boolean;
  /** HP the player loses to the enemy turn (plus self-damage this turn). */
  hpLoss: number;
  hpAfter: number;
  dies: boolean;
  blockGained: number;
  damageDealt: number;
  kills: string[];
  enemyHpAfter: { index: number; name: string; hp: number; vulnerable: number; weak: number }[];
  incomingAfterBlock: number;
  energyLeft: number;
  vulnerableApplied: number;
  weakApplied: number;
  strengthGained: number;
  cardsDrawn: number;
  unknownCards: string[];
}

export interface Plan {
  steps: Step[];
  outcome: Outcome;
  score: number;
}

interface Sim {
  hand: CardModel[];
  energy: number;
  hp: number;
  block: number;
  strength: number; // gained this turn (permanent + temporary)
  permStrength: number;
  hpLostThisTurn: boolean;
  enemies: (EnemySim & { alive: boolean; newlyWeak: boolean; strengthDelta: number })[];
  steps: Step[];
  blockGained: number;
  damageDealt: number;
  vulnerableApplied: number;
  weakApplied: number;
  flat: number;
  drawScore: number;
  cardsDrawn: number;
  unknown: string[];
  feedKills: number;
}

function applyDebuff(enemy: Sim["enemies"][number], kind: "vulnerable" | "weak", amount: number): number {
  if (amount <= 0) return 0;
  if (enemy.artifact > 0) {
    enemy.artifact -= 1;
    return 0;
  }
  if (kind === "vulnerable") enemy.vulnerable += amount;
  else {
    if (enemy.weak === 0) enemy.newlyWeak = true;
    enemy.weak += amount;
  }
  return amount;
}

function hitEnemy(sim: Sim, enemy: Sim["enemies"][number], perHitBase: number, hits: number, player: PlayerSim): number {
  let dealt = 0;
  for (let hit = 0; hit < hits && enemy.alive; hit += 1) {
    let amount = perHitBase;
    if (player.weak) amount = Math.floor(amount * 0.75);
    if (enemy.vulnerable > 0) amount = Math.floor(amount * 1.5);
    if (enemy.intangible) amount = Math.min(amount, 1);
    amount = Math.max(0, amount);
    const absorbed = Math.min(enemy.block, amount);
    enemy.block -= absorbed;
    const loss = Math.min(enemy.hp, amount - absorbed);
    enemy.hp -= loss;
    dealt += loss;
    if (enemy.hp <= 0) enemy.alive = false;
  }
  sim.damageDealt += dealt;
  return dealt;
}

function clone(sim: Sim): Sim {
  return {
    ...sim,
    hand: sim.hand,
    enemies: sim.enemies.map((enemy) => ({ ...enemy, attacks: enemy.attacks })),
    steps: sim.steps,
    unknown: sim.unknown,
  };
}

/** Plays one card (with a chosen target) on a copy of the sim. Returns null if it is not legal. */
function play(sim: Sim, card: CardModel, target: number | null, player: PlayerSim): Sim | null {
  const cost = card.xCost ? sim.energy : card.cost;
  if (cost > sim.energy) return null;
  const next = clone(sim);
  next.hand = sim.hand.filter((entry) => entry !== card);
  next.energy -= cost;
  const targetEnemy = target === null ? null : next.enemies.find((enemy) => enemy.index === target && enemy.alive) ?? null;
  if (card.target === "single" && targetEnemy === null) return null;

  if (card.hpLoss > 0) {
    next.hp -= card.hpLoss;
    next.hpLostThisTurn = true;
  }
  if (card.energyGain > 0) next.energy += card.energyGain;

  // Block before damage (Iron Wave order does not matter; Body Slam reads block after gains of
  // *earlier* cards only, which is what we simulate).
  if (card.block > 0) {
    next.block += card.block;
    next.blockGained += card.block;
  }

  if (card.damage !== null || card.special === "whirlwind") {
    let perHit = (card.damage ?? 0) + next.strength;
    let hits = card.hits;
    if (card.special === "body_slam") perHit = sim.block + next.strength;
    if (card.special === "whirlwind") hits = cost;
    if (card.special === "spite" && next.hpLostThisTurn) hits = 2;
    if (card.special === "dismantle" && targetEnemy && targetEnemy.vulnerable > 0) hits = 2;
    if (card.special === "bully" && targetEnemy) perHit += 2 * targetEnemy.vulnerable;

    if (card.target === "all") {
      for (const enemy of next.enemies) if (enemy.alive) hitEnemy(next, enemy, perHit, hits, player);
    } else if (card.target === "random") {
      // Expected value: spread hits across the living enemies, lowest HP first (kills are what matter).
      for (let hit = 0; hit < hits; hit += 1) {
        const living = next.enemies.filter((enemy) => enemy.alive);
        if (living.length === 0) break;
        const victim = living[hit % living.length]!;
        hitEnemy(next, victim, perHit, 1, player);
      }
    } else if (targetEnemy) {
      const wasAlive = targetEnemy.alive;
      hitEnemy(next, targetEnemy, perHit, hits, player);
      if (card.special === "feed" && wasAlive && !targetEnemy.alive) next.feedKills += 1;
      if (card.special === "molten_fist" && targetEnemy.alive) targetEnemy.vulnerable *= 2;
    }
  }

  const debuffTargets = card.target === "all" ? next.enemies.filter((enemy) => enemy.alive) : targetEnemy ? [targetEnemy] : [];
  for (const enemy of debuffTargets) {
    if (!enemy.alive) continue;
    next.vulnerableApplied += applyDebuff(enemy, "vulnerable", card.vulnerable);
    next.weakApplied += applyDebuff(enemy, "weak", card.weak);
    if (card.enemyStrength > 0) enemy.strengthDelta += card.enemyStrength;
  }

  if (card.strength > 0) {
    next.strength += card.strength;
    next.permStrength += card.strength;
  }
  if (card.tempStrength > 0) next.strength += card.tempStrength;
  next.flat += card.flatValue;
  if (card.draw > 0) {
    next.cardsDrawn += card.draw;
    // Earlier draws leave more energy to use what they bring.
    next.drawScore += card.draw * (next.energy > 0 ? 3 : 1);
  }
  if (!card.known) next.unknown = [...next.unknown, card.name];

  next.steps = [
    ...sim.steps,
    {
      cardIndex: card.index,
      cardId: card.cardId,
      name: card.name,
      target: card.target === "single" ? target : null,
      targetName: card.target === "single" && targetEnemy ? targetEnemy.name : null,
    },
  ];
  return next;
}

function incoming(sim: Sim, player: PlayerSim): number {
  let total = 0;
  for (const enemy of sim.enemies) {
    if (!enemy.alive) continue;
    for (const attack of enemy.attacks) {
      for (let hit = 0; hit < attack.hits; hit += 1) {
        let amount = attack.damage + enemy.strengthDelta;
        if (enemy.newlyWeak) amount = Math.floor(amount * 0.75);
        if (player.vulnerable) amount = Math.floor(amount * 1.5);
        if (player.intangible) amount = Math.min(amount, 1);
        total += Math.max(0, amount);
      }
    }
  }
  return total;
}

export interface Weights {
  hp: number;
  damage: number;
  killBase: number;
  killPerIncoming: number;
  vulnerable: number;
  weak: number;
  strength: number;
}

export function weightsFor(input: SolverInput): Weights {
  const hpFraction = input.player.maxHp > 0 ? input.player.hp / input.player.maxHp : 1;
  // HP gets dearer as it runs low; in elite/boss fights damage gets dearer (the fight is the point).
  const hp = 1.0 + 1.5 * Math.max(0, 0.6 - hpFraction) / 0.6;
  const damage = input.fightKind === "boss" ? 0.8 : input.fightKind === "elite" ? 0.7 : 0.55;
  return { hp, damage, killBase: 6, killPerIncoming: 1.2, vulnerable: 2.5, weak: 1.5, strength: 5 };
}

function evaluate(sim: Sim, input: SolverInput, weights: Weights): Plan {
  const living = sim.enemies.filter((enemy) => enemy.alive);
  const winsFight = living.length === 0;
  const incomingRaw = winsFight ? 0 : incoming(sim, input.player);
  const incomingAfterBlock = Math.max(0, incomingRaw - sim.block);
  const selfLoss = input.player.hp - sim.hp;
  const hpLoss = selfLoss + incomingAfterBlock;
  const hpAfter = input.player.hp - hpLoss;
  const dies = hpAfter <= 0;

  const kills = sim.enemies.filter((enemy) => !enemy.alive && input.enemies.find((start) => start.index === enemy.index)!.hp > 0);
  let score = 0;
  if (dies) score -= 100_000;
  if (winsFight) score += 10_000;
  score -= weights.hp * hpLoss;
  score += weights.damage * sim.damageDealt;
  for (const enemy of kills) {
    const start = input.enemies.find((entry) => entry.index === enemy.index)!;
    const threat = start.attacks.reduce((sum, attack) => sum + attack.damage * attack.hits, 0);
    score += weights.killBase + weights.killPerIncoming * threat;
  }
  // Debuffs only matter on enemies that survive the turn.
  for (const enemy of living) {
    const start = input.enemies.find((entry) => entry.index === enemy.index)!;
    const addedVulnerable = Math.max(0, enemy.vulnerable - start.vulnerable);
    const addedWeak = Math.max(0, enemy.weak - start.weak);
    score += weights.vulnerable * Math.min(addedVulnerable, 3);
    if (start.attacks.length > 0 || enemy.weak > 0) score += weights.weak * Math.min(addedWeak, 3);
    // Fight Me: the enemy's Strength is a lasting cost.
    score -= enemy.strengthDelta * 3;
  }
  if (!winsFight) {
    score += weights.strength * sim.permStrength;
    score += sim.flat;
    score += sim.drawScore;
  }
  score += sim.feedKills * 12;

  return {
    steps: sim.steps,
    score,
    outcome: {
      winsFight,
      hpLoss,
      hpAfter,
      dies,
      blockGained: sim.blockGained,
      damageDealt: sim.damageDealt,
      kills: kills.map((enemy) => enemy.name),
      enemyHpAfter: sim.enemies
        .filter((enemy) => input.enemies.find((start) => start.index === enemy.index)!.hp > 0)
        .map((enemy) => ({ index: enemy.index, name: enemy.name, hp: Math.max(0, enemy.hp), vulnerable: enemy.vulnerable, weak: enemy.weak })),
      incomingAfterBlock,
      energyLeft: sim.energy,
      vulnerableApplied: sim.vulnerableApplied,
      weakApplied: sim.weakApplied,
      strengthGained: sim.permStrength,
      cardsDrawn: sim.cardsDrawn,
      unknownCards: sim.unknown,
    },
  };
}

function simKey(sim: Sim): string {
  const hand = sim.hand.map((card) => `${card.cardId}${card.upgraded ? "+" : ""}`).sort().join(",");
  const enemies = sim.enemies.map((enemy) => `${enemy.hp}/${enemy.block}/${enemy.vulnerable}/${enemy.weak}/${enemy.artifact}/${enemy.strengthDelta}`).join("|");
  return `${hand}#${sim.energy}#${sim.hp}#${sim.block}#${sim.strength}#${sim.hpLostThisTurn ? 1 : 0}#${enemies}#${sim.flat}#${sim.drawScore}`;
}

export interface SolveResult {
  plans: Plan[];
  nodes: number;
  truncated: boolean;
}

/** Returns every distinct end-of-turn outcome's best plan, best first. */
export function solveTurn(input: SolverInput): SolveResult {
  const maxNodes = input.maxNodes ?? 60_000;
  const weights = weightsFor(input);
  const root: Sim = {
    hand: input.hand.filter((card) => card.playable),
    energy: input.player.energy,
    hp: input.player.hp,
    block: input.player.block,
    strength: 0,
    permStrength: 0,
    hpLostThisTurn: false,
    enemies: input.enemies.map((enemy) => ({ ...enemy, alive: enemy.hp > 0, newlyWeak: false, strengthDelta: 0 })),
    steps: [],
    blockGained: 0,
    damageDealt: 0,
    vulnerableApplied: 0,
    weakApplied: 0,
    flat: 0,
    drawScore: 0,
    cardsDrawn: 0,
    unknown: [],
    feedKills: 0,
  };

  const seen = new Set<string>();
  const byOutcome = new Map<string, Plan>();
  let nodes = 0;
  let truncated = false;

  const visit = (sim: Sim): void => {
    nodes += 1;
    const plan = evaluate(sim, input, weights);
    const o = plan.outcome;
    const signature = `${o.hpLoss}|${o.damageDealt}|${o.kills.join(",")}|${o.enemyHpAfter.map((enemy) => `${enemy.hp}:${enemy.vulnerable}:${enemy.weak}`).join(",")}|${o.strengthGained}|${o.cardsDrawn}|${Math.round(plan.score)}`;
    const existing = byOutcome.get(signature);
    // Same outcome: prefer the shorter plan (fewer steps = fewer chances for the board to surprise us).
    if (!existing || plan.score > existing.score + 1e-9 || (Math.abs(plan.score - existing.score) < 1e-9 && plan.steps.length < existing.steps.length)) {
      byOutcome.set(signature, plan);
    }
    if (nodes >= maxNodes) {
      truncated = true;
      return;
    }
    if (sim.enemies.every((enemy) => !enemy.alive)) return;

    const tried = new Set<string>();
    for (const card of sim.hand) {
      const targets: (number | null)[] =
        card.target === "single" ? card.validTargets.filter((index) => sim.enemies.some((enemy) => enemy.index === index && enemy.alive)) : [null];
      for (const target of targets) {
        const dedupe = `${card.cardId}${card.upgraded ? "+" : ""}@${target ?? "-"}`;
        if (tried.has(dedupe)) continue;
        tried.add(dedupe);
        const next = play(sim, card, target, input.player);
        if (!next) continue;
        const key = simKey(next);
        if (seen.has(key)) continue;
        seen.add(key);
        visit(next);
        if (truncated) return;
      }
    }
  };

  visit(root);
  const plans = [...byOutcome.values()].sort((a, b) => b.score - a.score);
  return { plans, nodes, truncated };
}

function vector(plan: Plan): number[] {
  const o = plan.outcome;
  const debuffs = o.enemyHpAfter.filter((enemy) => enemy.hp > 0).reduce((sum, enemy) => sum + Math.min(enemy.vulnerable, 3) + Math.min(enemy.weak, 3), 0);
  const living = o.enemyHpAfter.filter((enemy) => enemy.hp > 0).length;
  return [o.winsFight ? 1 : 0, -o.hpLoss, o.damageDealt, -living, debuffs, o.strengthGained, o.cardsDrawn];
}

/** True when `a` is at least as good as `b` on every outcome axis and better on one. */
export function dominates(a: Plan, b: Plan): boolean {
  if (a.outcome.unknownCards.length > 0 || b.outcome.unknownCards.length > 0) return false;
  const va = vector(a);
  const vb = vector(b);
  let better = false;
  for (let index = 0; index < va.length; index += 1) {
    if (va[index]! < vb[index]!) return false;
    if (va[index]! > vb[index]!) better = true;
  }
  return better;
}

/**
 * Plans whose outcomes a human would call different strategies (not just a reordering), with
 * dominated plans removed: "Strike" beats "do nothing" when nothing else differs, so the model is
 * never asked about it.
 */
export function distinctPlans(plans: Plan[], limit: number): Plan[] {
  const front = plans.filter((plan) => !plans.some((other) => other !== plan && dominates(other, plan)));
  const picked: Plan[] = [];
  for (const plan of front) {
    if (picked.length >= limit) break;
    const similar = picked.some(
      (other) =>
        other.outcome.winsFight === plan.outcome.winsFight &&
        Math.abs(other.outcome.hpLoss - plan.outcome.hpLoss) <= 2 &&
        Math.abs(other.outcome.damageDealt - plan.outcome.damageDealt) <= 3 &&
        other.outcome.kills.length === plan.outcome.kills.length &&
        other.outcome.strengthGained === plan.outcome.strengthGained,
    );
    if (!similar) picked.push(plan);
  }
  return picked;
}
