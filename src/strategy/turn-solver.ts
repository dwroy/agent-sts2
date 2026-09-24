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
  /** Slippery N: the next N HP losses are reduced to 1 each. */
  slippery?: number;
  /** Hardened Shell: caps the HP it can lose this turn. */
  hpLossCap?: number | null;
  /** Thorns: damage back to the player per attack hit. */
  thorns?: number;
  /** Curl Up: block gained the first time it takes damage. */
  curlUp?: number;
  /** Flutter N: attack damage taken is halved; each hit removes a stack. */
  flutter?: number;
  /** Hard to Kill N: each damage instance is capped at N. */
  perHitCap?: number | null;
  /** Slow: +10% attack damage taken per card played this turn. */
  slow?: boolean;
  /** Illusion: revives at full HP next turn, so killing it is only worth this turn's damage. */
  illusion?: boolean;
  /** Minion: leaves when every non-minion enemy is dead. */
  minion?: boolean;
  /** Has powers the solver does not model: its damage estimate is discounted to stay safe. */
  unmodelled?: boolean;
  /** Guarded / Soar: damage taken is halved. */
  halved?: boolean;
  /** Skittish: gains this much block the first time it is hit this turn. */
  skittish?: number;
  /** Reflect: damage absorbed by its block is dealt back to the player. */
  reflect?: boolean;
  /** Unblocked damage from this enemy has an extra lasting cost (Suck, Painful Stabs, Paper Cuts). */
  punishesUnblocked?: number;
  /** Gets stronger every turn it lives (Buff intent, Ritual, Territorial, stacking Strength): kill it first. */
  scaling?: boolean;
  /** Attack intents for this enemy's next turn, as shown (already including its own Strength/Weak). */
  attacks: { damage: number; hits: number }[];
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
  /** Shrink: the player's attacks deal 30% less. */
  shrunk?: boolean;
  /** Juggernaut N: deal N to a random enemy whenever block is gained. */
  juggernaut?: number;
  /** Rage N: gain N block whenever an attack is played this turn. */
  rage?: number;
  /** Barricade (or Blur): block carries into next turn, so excess block has value. */
  keepsBlock?: boolean;
  /** The Gambit: any unblocked attack damage kills. */
  gambit?: boolean;
  /** Block gained at the end of the player's turn, before the enemy acts (Plating, Metallicize). */
  endTurnBlock?: number;
}

export interface SolverInput {
  hand: CardModel[];
  player: PlayerSim;
  enemies: EnemySim[];
  /** Fight importance: elites and bosses value damage more, hallway fights value HP more. */
  fightKind: "monster" | "elite" | "boss" | "unknown";
  /** Combat turn (1-based); lasting effects are worth more early. */
  turn?: number;
  /** Cards already played this turn (Slow). */
  cardsPlayedThisTurn?: number;
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
  enemies: (EnemySim & { alive: boolean; newlyWeak: boolean; strengthDelta: number; lostThisTurn: number; tempStrengthLoss?: number })[];
  steps: Step[];
  blockGained: number;
  damageDealt: number;
  vulnerableApplied: number;
  weakApplied: number;
  flat: number;
  /** Resource cost of potions used this turn (not scaled like lasting value). */
  potionCost: number;
  /** Dexterity gained this turn (Speed Potion): added to every block card played after it. */
  tempDex: number;
  /** Buffer stacks gained this turn: each negates one enemy hit. */
  buffer: number;
  /** Duplication: the next card played resolves twice. */
  duplicate: number;
  /** Flame Barrier: damage back per enemy hit taken this turn. */
  retaliate: number;
  /** Cards played this turn so far (for Slow). */
  played: number;
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
    if (player.shrunk) amount = Math.floor(amount * 0.7);
    if (enemy.vulnerable > 0) amount = Math.floor(amount * 1.5);
    if (enemy.slow) amount = Math.floor(amount * (1 + 0.1 * sim.played));
    if ((enemy.flutter ?? 0) > 0) {
      amount = Math.floor(amount * 0.5);
      enemy.flutter = (enemy.flutter ?? 0) - 1;
    }
    if (enemy.unmodelled) amount = Math.floor(amount * 0.8);
    if (enemy.halved) amount = Math.floor(amount * 0.5);
    if (enemy.perHitCap !== null && enemy.perHitCap !== undefined) amount = Math.min(amount, enemy.perHitCap);
    if (enemy.intangible) amount = Math.min(amount, 1);
    amount = Math.max(0, amount);
    if ((enemy.skittish ?? 0) > 0 && amount > 0) {
      enemy.block += enemy.skittish ?? 0;
      enemy.skittish = 0;
    }
    const absorbed = Math.min(enemy.block, amount);
    enemy.block -= absorbed;
    if (enemy.reflect && absorbed > 0) {
      sim.hp -= absorbed;
      sim.hpLostThisTurn = true;
    }
    let loss = amount - absorbed;
    if (loss > 0 && (enemy.slippery ?? 0) > 0) {
      loss = 1;
      enemy.slippery = (enemy.slippery ?? 0) - 1;
    }
    if (enemy.hpLossCap !== null && enemy.hpLossCap !== undefined) loss = Math.min(loss, Math.max(0, enemy.hpLossCap - enemy.lostThisTurn));
    loss = Math.min(enemy.hp, loss);
    enemy.hp -= loss;
    enemy.lostThisTurn += loss;
    dealt += loss;
    if ((enemy.thorns ?? 0) > 0) {
      sim.hp -= enemy.thorns ?? 0;
      sim.hpLostThisTurn = true;
    }
    if (amount > 0 && (enemy.curlUp ?? 0) > 0) {
      enemy.block += enemy.curlUp ?? 0;
      enemy.curlUp = 0;
    }
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
  if (card.type !== "Potion") next.played += 1;
  if (card.target === "single" && !next.enemies.some((enemy) => enemy.index === target && enemy.alive)) return null;
  const twice = card.type !== "Potion" && next.duplicate > 0;
  if (twice) next.duplicate -= 1;
  resolveEffects(next, card, target, player, cost);
  if (twice) resolveEffects(next, card, target, player, cost);
  if (card.special === "duplicate_next") next.duplicate += 1;
  if (!card.known) next.unknown = [...next.unknown, card.name];
  const targetEnemy = target === null ? null : next.enemies.find((enemy) => enemy.index === target) ?? null;

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

/** A card's effects on the sim (energy and hand already paid). Called twice under Duplication. */
function resolveEffects(next: Sim, card: CardModel, target: number | null, player: PlayerSim, cost: number): void {
  const targetEnemy = target === null ? null : next.enemies.find((enemy) => enemy.index === target && enemy.alive) ?? null;
  if (card.target === "single" && targetEnemy === null) return;

  if (card.hpLoss > 0) {
    next.hp -= card.hpLoss;
    next.hpLostThisTurn = true;
  }
  if (card.energyGain > 0) next.energy += card.energyGain;

  // Block before damage (Iron Wave order does not matter; Body Slam reads block after gains of
  // *earlier* cards only, which is what we simulate).
  if (card.block > 0) gainBlock(next, card.block + (card.type === "Potion" ? 0 : next.tempDex), player);
  if (card.special === "temp_dex") next.tempDex += 5;
  if ((card.retaliate ?? 0) > 0) next.retaliate += card.retaliate ?? 0;
  if (card.special === "buffer") next.buffer += 1;
  if (card.type === "Attack" && (player.rage ?? 0) > 0) gainBlock(next, player.rage ?? 0, player);
  if (card.special === "triple_block") {
    next.blockGained += next.block * 2;
    next.block *= 3;
  }

  if (card.damage !== null || card.special === "whirlwind") {
    let perHit = (card.damage ?? 0) + next.strength;
    let hits = card.hits;
    if (card.special === "body_slam") perHit = next.block + next.strength;
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
    // Temporary loss: lowers this turn's attack, not a lasting change (so not scored as one).
    if ((card.enemyTempStrengthLoss ?? 0) > 0) enemy.tempStrengthLoss = (enemy.tempStrengthLoss ?? 0) + (card.enemyTempStrengthLoss ?? 0);
  }

  if (card.strength > 0) {
    next.strength += card.strength;
    next.permStrength += card.strength;
  }
  if (card.tempStrength > 0) next.strength += card.tempStrength;
  if (card.type === "Potion") next.potionCost += -card.flatValue;
  else next.flat += card.flatValue;
  if (card.draw > 0) {
    next.cardsDrawn += card.draw;
    // Earlier draws leave more energy to use what they bring.
    next.drawScore += card.draw * (next.energy > 0 ? 3 : 1);
  }
}

function gainBlock(sim: Sim, amount: number, player: PlayerSim): void {
  sim.block += amount;
  sim.blockGained += amount;
  if ((player.juggernaut ?? 0) > 0) {
    // Random enemy: expected value, lowest HP first (kills matter most).
    const living = sim.enemies.filter((enemy) => enemy.alive).sort((a, b) => a.hp - b.hp);
    if (living[0]) hitEnemyRaw(sim, living[0], player.juggernaut ?? 0);
  }
}

/** Non-attack damage (Juggernaut): ignores Vulnerable/Weak, still hits block. */
function hitEnemyRaw(sim: Sim, enemy: Sim["enemies"][number], amount: number): void {
  const absorbed = Math.min(enemy.block, amount);
  enemy.block -= absorbed;
  const loss = Math.min(enemy.hp, amount - absorbed);
  enemy.hp -= loss;
  enemy.lostThisTurn += loss;
  sim.damageDealt += loss;
  if (enemy.hp <= 0) enemy.alive = false;
}

function incoming(sim: Sim, player: PlayerSim): number {
  let total = 0;
  for (const enemy of sim.enemies) {
    if (!enemy.alive) continue;
    for (const attack of enemy.attacks) {
      for (let hit = 0; hit < attack.hits; hit += 1) {
        let amount = attack.damage + enemy.strengthDelta - (enemy.tempStrengthLoss ?? 0);
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
  const damage = input.fightKind === "boss" ? 0.8 : input.fightKind === "elite" ? 0.7 : 0.45; // hallway 0.55 -> 0.45: supervisor kept preferring HP over chip damage
  return { hp, damage, killBase: 6, killPerIncoming: 1.2, vulnerable: 2.5, weak: 1.5, strength: 5 };
}

function evaluate(sim: Sim, input: SolverInput, weights: Weights): Plan {
  const living = sim.enemies.filter((enemy) => enemy.alive);
  const winsFight = living.length === 0 || (living.every((enemy) => enemy.minion) && sim.enemies.some((enemy) => !enemy.minion));
  // Status cards still in hand at end of turn (Toxic, Burn, …) hurt; unplayable ones always stay.
  const heldPenalty =
    sim.hand.reduce((sum, card) => sum + (card.heldPenalty ?? 0), 0) +
    input.hand.filter((card) => !card.playable).reduce((sum, card) => sum + (card.heldPenalty ?? 0), 0);
  let incomingRaw = winsFight ? 0 : incoming(sim, input.player) + heldPenalty;
  if (sim.buffer > 0 && !winsFight) {
    // Buffer negates whole hits: approximate by removing the biggest ones.
    const hits = sim.enemies
      .filter((enemy) => enemy.alive)
      .flatMap((enemy) => enemy.attacks.flatMap((attack) => Array.from({ length: attack.hits }, () => attack.damage + enemy.strengthDelta)))
      .sort((a, b) => b - a);
    incomingRaw = Math.max(0, incomingRaw - hits.slice(0, sim.buffer).reduce((sum, hit) => sum + hit, 0));
  }
  const incomingAfterBlock = Math.max(0, incomingRaw - sim.block - (input.player.endTurnBlock ?? 0));
  const selfLoss = input.player.hp - sim.hp;
  const hpLoss = selfLoss + incomingAfterBlock;
  const hpAfter = input.player.hp - hpLoss;
  const dies = hpAfter <= 0 || (input.player.gambit === true && incomingAfterBlock > 0);

  const kills = sim.enemies.filter((enemy) => !enemy.alive && !enemy.illusion && input.enemies.find((start) => start.index === enemy.index)!.hp > 0);
  let score = 0;
  if (dies) score -= 100_000;
  if (winsFight) score += 10_000;
  score -= weights.hp * hpLoss;
  if (sim.retaliate > 0 && !winsFight) {
    // Retaliation lands during the enemy turn: count it as damage (capped by each attacker's HP).
    let back = 0;
    for (const enemy of living) {
      const hits = enemy.attacks.reduce((sum, attack) => sum + attack.hits, 0);
      back += Math.min(enemy.hp, hits * sim.retaliate);
    }
    score += weights.damage * back;
  }
  if (incomingAfterBlock > 0) {
    const punish = living.reduce((sum, enemy) => sum + (enemy.punishesUnblocked ?? 0), 0);
    score -= punish;
  }
  if (input.player.keepsBlock && !winsFight) score += 0.4 * Math.max(0, sim.block - incomingRaw);
  score += weights.damage * sim.damageDealt;
  // Damage into an enemy that scales every turn is worth more: blocking while it grows lost run 7.
  for (const enemy of sim.enemies) {
    const start = input.enemies.find((entry) => entry.index === enemy.index)!;
    if (start.scaling) score += weights.damage * 0.6 * Math.max(0, start.hp - Math.max(0, enemy.hp));
  }
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
    // Lasting value (Strength, powers) pays off over the rest of the fight: more in long fights,
    // less the later it comes.
    const fightLength = input.fightKind === "boss" ? 1.8 : input.fightKind === "elite" ? 1.4 : 0.8;
    const earliness = Math.max(0.4, 1 - 0.08 * ((input.turn ?? 1) - 1));
    score += (weights.strength * sim.permStrength + sim.flat) * fightLength * earliness;
    score += sim.drawScore;
  }
  score += sim.feedKills * 12;
  score -= sim.potionCost;

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
  const enemies = sim.enemies.map((enemy) => `${enemy.hp}/${enemy.block}/${enemy.vulnerable}/${enemy.weak}/${enemy.artifact}/${enemy.strengthDelta}/${enemy.slippery ?? 0}/${enemy.curlUp ?? 0}/${enemy.flutter ?? 0}`).join("|");
  return `${hand}#${sim.energy}#${sim.hp}#${sim.block}#${sim.strength}#${sim.hpLostThisTurn ? 1 : 0}#${enemies}#${sim.flat}#${sim.potionCost}#${sim.tempDex}#${sim.buffer}#${sim.retaliate}#${sim.played}#${sim.drawScore}`;
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
    enemies: input.enemies.map((enemy) => ({ ...enemy, alive: enemy.hp > 0, newlyWeak: false, strengthDelta: 0, lostThisTurn: 0 })),
    steps: [],
    blockGained: 0,
    damageDealt: 0,
    vulnerableApplied: 0,
    weakApplied: 0,
    flat: 0,
    potionCost: 0,
    tempDex: 0,
    buffer: 0,
    duplicate: 0,
    retaliate: 0,
    played: input.cardsPlayedThisTurn ?? 0,
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
    if (sim.enemies.every((enemy) => !enemy.alive) || plan.outcome.winsFight) return;

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
