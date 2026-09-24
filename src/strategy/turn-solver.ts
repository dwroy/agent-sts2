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
  /** Reattach (Decimillipede segment): a dead segment comes back while another lives; only all dying is a kill. */
  reattach?: boolean;
  /** REATTACH_POWER amount: the HP a dead segment comes back with (25 on the Decimillipede). */
  reattachHp?: number;
  /**
   * Crab Rage (Kaiser Crab's Rocket / Crusher): when an ally dies this one gains 99 Block and more
   * Strength at once, so killing one part alone is a trap (7Q5G F33: Rocket "lethal", Crusher kept
   * 28 HP behind 39 block and killed us).
   */
  crabRage?: boolean;
  /**
   * Steam Eruption stacks (Waterfall Giant): when it "dies" it explodes for this much, one turn
   * later. HP kept above that is what wins the fight.
   */
  eruption?: number;
  /**
   * Sandpit count (The Insatiable): -1 every enemy turn, and at 0 the player is eaten whatever the
   * HP and block. Each Frantic Escape played adds 1.
   */
  sandpit?: number;
  /**
   * Sleep turns left while it does not attack: Asleep (Lagavulin Matriarch) ends on the first HP it
   * loses (it wakes stunned, so the turns after that one are lost); Slumber (Slumbering Beetle) drops
   * by 1 per HP-losing hit. Block damage does not wake either (states.jsonl: 12 Plating block
   * chipped to 2, still asleep).
   */
  asleep?: number;
  slumber?: number;
  /** Minion: leaves when every non-minion enemy is dead. */
  minion?: boolean;
  /** Has powers the solver does not model: its damage estimate is discounted to stay safe. */
  unmodelled?: boolean;
  /** Guarded / Soar: damage taken is halved. */
  halved?: boolean;
  /**
   * Skittish: gains this much block the first time it is hit this turn, once that card has resolved
   * (the first card's hits all land in full).
   */
  skittish?: number;
  /** Reflect: damage absorbed by its block is dealt back to the player. */
  reflect?: boolean;
  /** Demise N: loses N HP at the end of each of its turns (Powdered Demise). */
  demise?: number;
  /** Unblocked damage from this enemy has an extra lasting cost (Suck, Paper Cuts). */
  punishesUnblocked?: number;
  /** Painful Stabs N: every unblocked hit shuffles N Wounds into the discard pile (2WUM: 3 of 5 cards). */
  woundsPerHit?: number;
  /** Enrage N (Test Subject phase 1): +N Strength for every Skill the player plays. */
  enrage?: number;
  /**
   * Adaptable (Test Subject): another phase follows. At 0 HP it spends a turn reviving (no attack) and
   * comes back at full, higher max HP, so killing it does not win the fight.
   */
  revives?: boolean;
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
  /** Rupture N: +N Strength whenever the player loses HP on their own turn. */
  rupture?: number;
  /** Sloth: at most this many more cards can be played this turn. */
  maxPlays?: number | null;
  /** Damage at the end of the turn (Disintegration debuff); it hits block first. */
  endTurnHpLoss?: number;
  /** Surrounded: attacks from enemies we are not facing deal +50%; targeting an enemy turns us to it. */
  surrounded?: boolean;
  /** Index of the enemy we currently face (last targeted), when known. */
  facing?: number | null;
  /**
   * Colossus already up (COLOSSUS_POWER). The mod's intents already show the halved damage for
   * enemies that were Vulnerable, so only enemies made Vulnerable this turn are halved again.
   */
  colossus?: boolean;
  /** HP lost at the start of next turn before block (Crimson Mantle: 1 per copy in play). */
  startTurnHpLoss?: number;
  /** Damage back per enemy attack hit already up (Flame Barrier power, Thorns). */
  retaliate?: number;
  /** Damage to every enemy at the start of our next turn (Mercury Hourglass: 3). */
  startTurnDamage?: number;
  /** Demon Tongue, not yet spent this turn: the first HP lost on our turn is healed back. */
  demonTongue?: boolean;
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
  /**
   * Potions this turn may still drink (boss fights: 1 a turn), null for no cap. A plan over it is
   * kept only when it wins the fight or ends the turn below 30% max HP (1R3C F17 T1: all three potions
   * on a 7-damage turn, none left for the 28-damage Dismember).
   */
  potionLimit?: number | null;
  /**
   * Waterfall Giant too slow to kill: at the current damage rate its eruption at death outgrows HP
   * plus a hand of block (1ZQJ: 15 turns, eruption 54), so damage weighs more and the "HP counts double
   * below the eruption" rule is off. Every turn earlier is 3 less eruption and one attack less.
   */
  raceEruption?: boolean;
  /**
   * Withering Presence (Aeonglass): every `every`-th card played in the fight (counted across turns)
   * adds an unplayable Wither to the hand, dealing `damage` at the end of the turn (blockable).
   * `played` is the fight's count so far, this turn's cards included.
   */
  wither?: { every: number; played: number; damage: number };
  maxNodes?: number;
}

export interface Step {
  cardIndex: number;
  cardId: string;
  /** Upgrade level of the planned card: Defend and Defend+ in one hand are different plays. */
  upgraded: boolean;
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
  /** Resource cost of the potions this plan drinks (0 when none). */
  potionCost: number;
  /** Sandpit count after the enemy turn (null when no enemy has one). */
  sandpitAfter: number | null;
  /** Enemies left at or below the start-of-turn damage (Mercury Hourglass): dead at our next turn start. */
  startTurnKills: string[];
  /** Withers this plan adds to the hand (Withering Presence). */
  withersAdded: number;
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
  enemies: (EnemySim & { alive: boolean; newlyWeak: boolean; strengthDelta: number; lostThisTurn: number; tempStrengthLoss?: number; sleepLost?: number; skittishHit?: boolean })[];
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
  /** Rupture stacks active this turn (from the start or played this turn). */
  rupture: number;
  /** Enemy index we face after this turn's targeted plays (Surrounded). */
  facing: number | null;
  /** Colossus played this turn: damage from Vulnerable enemies is halved this turn. */
  colossus: boolean;
  /** Cards played this turn so far (for Slow). */
  played: number;
  drawScore: number;
  cardsDrawn: number;
  unknown: string[];
  feedKills: number;
  /** Frantic Escapes played this turn (each +1 Sandpit). */
  escapes: number;
  /** Crimson Mantles played this turn (each costs 1 HP at the start of every later turn). */
  mantles: number;
  /** A Crab Rage survivor was enraged this turn. */
  enraged: number;
  /** Delayed damage to every enemy played this turn (The Bomb: 40 after 3 turns). */
  bombs: number;
  /** Inside one hit that lands on every enemy: deaths trigger Crab Rage after the whole hit. */
  sweeping?: boolean;
  pendingRage?: boolean;
  /** Gigantification: the next Attack played deals triple damage. */
  gigantic: number;
}

/**
 * HP the player loses on their own turn (a card's cost, Thorns, Reflect). Demon Tongue heals the
 * first loss of the turn back (TQX5 T1: Offering+ with 0 energy was "end turn, -9"; played, it costs
 * nothing and gives 2 energy for a Defend).
 */
function loseHp(sim: Sim, amount: number, player: PlayerSim): void {
  if (amount <= 0) return;
  if (!(player.demonTongue && !sim.hpLostThisTurn)) sim.hp -= amount;
  sim.hpLostThisTurn = true;
}

/**
 * One debuff application: Artifact negates it and loses a stack, whatever the debuff (TQX5 T1:
 * Powdered Demise into Artifact 3 did nothing). Returns the amount that landed.
 */
function applyDebuff(enemy: Sim["enemies"][number], kind: "vulnerable" | "weak" | "tempStrengthLoss" | "demise", amount: number): number {
  if (amount <= 0) return 0;
  if (enemy.artifact > 0) {
    enemy.artifact -= 1;
    return 0;
  }
  if (kind === "vulnerable") enemy.vulnerable += amount;
  else if (kind === "weak") {
    if (enemy.weak === 0) enemy.newlyWeak = true;
    enemy.weak += amount;
  } else if (kind === "tempStrengthLoss") enemy.tempStrengthLoss = (enemy.tempStrengthLoss ?? 0) + amount;
  else enemy.demise = (enemy.demise ?? 0) + amount;
  return amount;
}

function hitEnemy(sim: Sim, enemy: Sim["enemies"][number], perHitBase: number, hits: number, player: PlayerSim): number {
  let dealt = 0;
  for (let hit = 0; hit < hits && enemy.alive; hit += 1) {
    let amount = perHitBase;
    if (player.weak) amount = Math.floor(amount * 0.75);
    if (player.shrunk) amount = Math.floor(amount * 0.7);
    if (enemy.vulnerable > 0) amount = Math.floor(amount * 1.5);
    // Slow: +10% per card played before this one (sim.played is bumped once the card has resolved).
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
    if ((enemy.skittish ?? 0) > 0 && amount > 0) enemy.skittishHit = true;
    const absorbed = Math.min(enemy.block, amount);
    enemy.block -= absorbed;
    if (enemy.reflect && absorbed > 0) loseHp(sim, absorbed, player);
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
    if (loss > 0) wake(enemy);
    if ((enemy.thorns ?? 0) > 0) loseHp(sim, enemy.thorns ?? 0, player);
    if (amount > 0 && (enemy.curlUp ?? 0) > 0) {
      enemy.block += enemy.curlUp ?? 0;
      enemy.curlUp = 0;
    }
    if (enemy.hp <= 0) killEnemy(sim, enemy);
  }
  sim.damageDealt += dealt;
  return dealt;
}

/** HP damage on a sleeper: its free (non-attacking) turns lost. */
function wake(enemy: Sim["enemies"][number]): void {
  if ((enemy.asleep ?? 0) > 0) {
    enemy.sleepLost = (enemy.sleepLost ?? 0) + Math.max(1, (enemy.asleep ?? 0) - 1);
    enemy.asleep = 0;
  } else if ((enemy.slumber ?? 0) > 0) {
    enemy.sleepLost = (enemy.sleepLost ?? 0) + 1;
    enemy.slumber = (enemy.slumber ?? 0) - 1;
  }
}

/** Crab Rage: an ally's death gives the survivor 99 Block and Strength (text says 5; 7Q5G F33 measured 8 -> 14). */
export const CRAB_RAGE_BLOCK = 99;
export const CRAB_RAGE_STRENGTH = 6;

function killEnemy(sim: Sim, enemy: Sim["enemies"][number]): void {
  enemy.alive = false;
  // A hit that lands on every enemy at once kills both crabs together (no rage in between).
  if (sim.sweeping) sim.pendingRage = true;
  else crabRage(sim);
}

function crabRage(sim: Sim): void {
  for (const other of sim.enemies) {
    if (!other.alive || !other.crabRage) continue;
    other.block += CRAB_RAGE_BLOCK;
    other.strengthDelta += CRAB_RAGE_STRENGTH;
    other.crabRage = false;
    sim.enraged += 1;
  }
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
  if (card.target === "single" && !next.enemies.some((enemy) => enemy.index === target && enemy.alive)) return null;
  const twice = card.type !== "Potion" && next.duplicate > 0;
  if (twice) next.duplicate -= 1;
  resolveEffects(next, card, target, player, cost);
  if (twice) resolveEffects(next, card, target, player, cost);
  // After the card: Slow counts it from the next card on (4LGQ T9: counting it too made "Thrash" a
  // kill that was 1 short), and Skittish block lands once the card that hit it is done.
  if (card.type !== "Potion") next.played += 1;
  for (const enemy of next.enemies) {
    if (!enemy.skittishHit) continue;
    enemy.skittishHit = false;
    if (enemy.alive) enemy.block += enemy.skittish ?? 0;
    enemy.skittish = 0;
  }
  if (card.special === "duplicate_next") next.duplicate += 1;
  if (!card.known) next.unknown = [...next.unknown, card.name];
  const targetEnemy = target === null ? null : next.enemies.find((enemy) => enemy.index === target) ?? null;

  if (card.target === "single" && target !== null) next.facing = target;
  next.steps = [
    ...sim.steps,
    {
      cardIndex: card.index,
      cardId: card.cardId,
      upgraded: card.upgraded,
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
    loseHp(next, card.hpLoss, player);
    if (next.rupture > 0) {
      next.strength += next.rupture;
      next.permStrength += next.rupture;
    }
  }
  if (card.special === "rupture") next.rupture += 1;
  // Enrage (Test Subject): every Skill gives it Strength at once, so this turn's attack grows too.
  if (card.type === "Skill") for (const enemy of next.enemies) if (enemy.alive && (enemy.enrage ?? 0) > 0) enemy.strengthDelta += enemy.enrage ?? 0;
  if (card.special === "colossus") next.colossus = true;
  if (card.special === "frantic_escape") next.escapes += 1;
  if (card.special === "crimson_mantle") next.mantles += 1;
  if (card.energyGain > 0) next.energy += card.energyGain;

  // Block before damage (Iron Wave order does not matter; Body Slam reads block after gains of
  // *earlier* cards only, which is what we simulate).
  if (card.block > 0) gainBlock(next, card.block + (card.type === "Potion" ? 0 : next.tempDex), player);
  if (card.special === "temp_dex") next.tempDex += 5;
  if (card.special === "triple_next_attack") next.gigantic += 1;
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
    if (next.gigantic > 0 && card.type === "Attack") {
      perHit *= 3;
      next.gigantic -= 1;
    }

    if (card.target === "all") {
      // Hit by hit across every enemy, as the game resolves it: a death mid-card (Crab Rage) changes
      // what the later hits meet.
      for (let hit = 0; hit < hits; hit += 1) {
        next.sweeping = true;
        for (const enemy of next.enemies) if (enemy.alive) hitEnemy(next, enemy, perHit, 1, player);
        next.sweeping = false;
        if (next.pendingRage) {
          next.pendingRage = false;
          crabRage(next);
        }
      }
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
      // Feed exhausts: spending it without the kill throws away this fight's max-HP gain.
      else if (card.special === "feed") next.flat -= 8;
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
    applyDebuff(enemy, "tempStrengthLoss", card.enemyTempStrengthLoss ?? 0);
    applyDebuff(enemy, "demise", card.demise ?? 0);
  }

  if (card.strength > 0) {
    next.strength += card.strength;
    next.permStrength += card.strength;
  }
  if (card.tempStrength > 0) next.strength += card.tempStrength;
  if ((card.delayedDamage ?? 0) > 0) next.bombs += card.delayedDamage ?? 0;
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
  if (loss > 0) wake(enemy);
  if (enemy.hp <= 0) killEnemy(sim, enemy);
}

/**
 * Surrounded: an enemy behind us hits for +50%, and the mod's intent numbers already include it for
 * the facing at the time of the state (PLC F33: Rocket's Laser 49 behind, 33 once we attacked it). So
 * only a change of facing this turn changes the number: turning to a shown-behind enemy takes the 1.5
 * off, turning away from the one we faced puts it on. Unknown starting facing: the intent is taken as
 * shown (the targeted enemy may be cheaper than that, never dearer).
 */
export function backAttack(shown: number, enemyIndex: number, facingBefore: number | null, facingAfter: number | null): number {
  if (facingAfter === null || facingAfter === facingBefore) return shown;
  if (facingBefore === null) return shown;
  const wasBehind = facingBefore !== enemyIndex;
  const isBehind = facingAfter !== enemyIndex;
  if (wasBehind && !isBehind) return Math.ceil(shown / 1.5);
  if (!wasBehind && isBehind) return Math.floor(shown * 1.5);
  return shown;
}

interface IncomingHit {
  enemy: number;
  amount: number;
}

/**
 * The enemy turn's attack hits in order. Retaliation (Flame Barrier, Thorns) lands on every hit, and
 * an attacker it kills stops mid-sequence (2WUM T8: 10x8 into a 29 HP boss with Flame Barrier 6, it
 * died on the 5th hit and we took 20, while the solver counted all 80 and called every line lethal).
 */
function incomingHits(sim: Sim, input: SolverInput): IncomingHit[] {
  const player = input.player;
  const hits: IncomingHit[] = [];
  for (const enemy of sim.enemies) {
    if (!enemy.alive) continue;
    const start = input.enemies.find((entry) => entry.index === enemy.index);
    // Colossus halves damage from Vulnerable enemies. Played now: every one. Already up: the intent is
    // already halved, except for enemies that only became Vulnerable this turn.
    const halvedByColossus = enemy.vulnerable > 0 && (sim.colossus ? !(player.colossus && (start?.vulnerable ?? 0) > 0) : player.colossus === true && (start?.vulnerable ?? 0) === 0);
    const retaliation = enemy.intangible ? Math.min(1, sim.retaliate) : sim.retaliate;
    let attackerHp = enemy.hp;
    for (const attack of enemy.attacks) {
      for (let hit = 0; hit < attack.hits; hit += 1) {
        if (retaliation > 0 && attackerHp <= 0) break;
        const shown = player.surrounded ? backAttack(attack.damage, enemy.index, player.facing ?? null, sim.facing) : attack.damage;
        // The shown intent already includes our Vulnerable (MAWLER 14 -> 21, SOUL_FYSH 16 -> 24 in
        // states.jsonl); only Strength changes made this turn still need the ×1.5.
        const strengthChange = (enemy.strengthDelta - (enemy.tempStrengthLoss ?? 0)) * (player.vulnerable ? 1.5 : 1);
        let amount = Math.floor(shown + strengthChange);
        if (enemy.newlyWeak) amount = Math.floor(amount * 0.75);
        if (halvedByColossus) amount = Math.floor(amount * 0.5);
        if (player.intangible) amount = Math.min(amount, 1);
        hits.push({ enemy: enemy.index, amount: Math.max(0, amount) });
        attackerHp -= retaliation;
      }
    }
  }
  return hits;
}

/** Damage this turn that is worth waking a sleeper for (fraction of its HP). */
export const SLEEP_BIG_HIT = 0.25;

/** A woken sleeper's expected attack per turn (the Matriarch hit 19 and 9x2 once awake). */
export function sleepTurnDamage(enemy: EnemySim): number {
  return Math.max(10, Math.round(enemy.maxHp * 0.08));
}

/** A Wound shuffled into the deck (Painful Stabs): a dead draw later, in HP-equivalent points. */
export const WOUND_COST = 2;
/** Share of The Bomb's delayed damage counted in elite/boss fights (it may end first; hallway less). */
export const BOMB_SURE = 0.8;
/** Damage weight multiplier while racing the Waterfall Giant's eruption (raceEruption). */
export const ERUPTION_RACE_DAMAGE = 1.5;
/** HP weight multiplier against a phase boss: its next phase starts at full HP (Test Subject, 600 HP). */
export const NEXT_PHASE_HP = 1.25;

/** Enemy turns a Demise is counted for (it ticks until the enemy dies). */
export const DEMISE_TURNS = 3;

/** Crimson Mantle's POWER_VALUE (card-model.ts), cancelled when HP is too low to afford it. */
const MANTLE_VALUE = 16;

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
  let hp = 1.0 + 1.5 * Math.max(0, 0.6 - hpFraction) / 0.6;
  let damage = input.fightKind === "boss" ? 0.8 : input.fightKind === "elite" ? 0.7 : 0.45; // hallway 0.55 -> 0.45: supervisor kept preferring HP over chip damage
  if (input.enemies.some((enemy) => enemy.revives)) hp *= NEXT_PHASE_HP;
  if (input.raceEruption) damage *= ERUPTION_RACE_DAMAGE;
  return { hp, damage, killBase: 6, killPerIncoming: 1.2, vulnerable: 2.5, weak: 1.5, strength: 5 };
}

function evaluate(sim: Sim, input: SolverInput, weights: Weights): Plan {
  const living = sim.enemies.filter((enemy) => enemy.alive);
  // A phase boss at 0 HP revives next turn (it does not attack that turn): a kill, not a win.
  const nextPhase = sim.enemies.some((enemy) => !enemy.alive && enemy.revives);
  const winsFight = !nextPhase && (living.length === 0 || (living.every((enemy) => enemy.minion) && sim.enemies.some((enemy) => !enemy.minion)));
  // Status cards still in hand at end of turn (Toxic, Burn, …) hurt; unplayable ones always stay.
  // Damage-type penalties (Burn) meet block like an attack; HP-loss ones (Beckon) go straight to HP.
  const heldCards = [...sim.hand, ...input.hand.filter((card) => !card.playable)];
  const heldHpLoss = winsFight ? 0 : heldCards.reduce((sum, card) => sum + (card.heldHpLoss ?? 0), 0);
  // Withering Presence: a Wither added by this turn's cards is held at the end of it (TQX5 T5: planned
  // -3, the 6th card added a Wither and the turn cost 9).
  const wither = input.wither;
  const withersAdded =
    wither && wither.every > 0
      ? Math.floor((wither.played + sim.played - (input.cardsPlayedThisTurn ?? 0)) / wither.every) - Math.floor(wither.played / wither.every)
      : 0;
  const heldPenalty =
    heldCards.reduce((sum, card) => sum + (card.heldPenalty ?? 0) - (card.heldHpLoss ?? 0), 0) + (winsFight ? 0 : withersAdded * (wither?.damage ?? 0));
  const hits = winsFight ? [] : incomingHits(sim, input);
  let incomingRaw = winsFight ? 0 : hits.reduce((sum, hit) => sum + hit.amount, 0) + heldPenalty;
  if (sim.buffer > 0 && !winsFight) {
    // Buffer negates whole hits: approximate by removing the biggest ones.
    const biggest = hits.map((hit) => hit.amount).sort((a, b) => b - a);
    incomingRaw = Math.max(0, incomingRaw - biggest.slice(0, sim.buffer).reduce((sum, hit) => sum + hit, 0));
  }
  // Disintegration lands at the end of our turn and hits block first (DG1 T5: block 8 -> 2, HP
  // unchanged); what block it leaves then meets the enemy attacks.
  const blockAtEnd = sim.block + (input.player.endTurnBlock ?? 0);
  const disintegration = winsFight ? 0 : input.player.endTurnHpLoss ?? 0;
  const blockLeft = Math.max(0, blockAtEnd - disintegration);
  const incomingAfterBlock = Math.max(0, incomingRaw - blockLeft);
  const selfLoss = input.player.hp - sim.hp;
  // Crimson Mantle takes its HP at the start of our next turn, before any block (YP9 T5: 1 HP left,
  // no attack coming, the Mantle killed us). The mod's lethal warning does not see it either. It is
  // part of this turn's HP loss, whether the Mantle is already up or played now (Y83U F30 T3: a
  // Mantle plan showed hp_lost 0).
  const startTurnLoss = winsFight ? 0 : (input.player.startTurnHpLoss ?? 0) + sim.mantles;
  const hpLoss = selfLoss + incomingAfterBlock + Math.max(0, disintegration - blockAtEnd) + heldHpLoss + startTurnLoss;
  const hpAfter = input.player.hp - hpLoss;
  // Sandpit (TTVY T6: 33 HP and 20 block, Frantic Escape left in hand, eaten at count 0).
  const sandpits = sim.enemies.filter((enemy) => enemy.alive && (enemy.sandpit ?? 0) > 0).map((enemy) => enemy.sandpit!);
  const sandpitAfter = winsFight || sandpits.length === 0 ? null : Math.min(...sandpits) + sim.escapes - 1;
  const dies =
    hpAfter <= 0 ||
    (input.player.gambit === true && incomingAfterBlock > 0) ||
    (sandpitAfter !== null && sandpitAfter <= 0);

  // Reattaching segments (Decimillipede) come back unless every one of them dies (0NG F29: a 5 HP
  // tail "kill" won a +40 plan, and the tail reattached at 25 HP).
  const allSegmentsDead = sim.enemies.every((enemy) => !enemy.reattach || !enemy.alive);
  // Crab Rage: one part dying alone only enrages the other; it is no kill until both are dead.
  const crabs = input.enemies.filter((start) => start.crabRage).map((start) => start.index);
  const allCrabsDead = sim.enemies.every((enemy) => !crabs.includes(enemy.index) || !enemy.alive);
  const kills = sim.enemies.filter(
    (enemy) =>
      !enemy.alive &&
      !enemy.illusion &&
      !(enemy.reattach && !allSegmentsDead) &&
      !(crabs.includes(enemy.index) && !allCrabsDead) &&
      input.enemies.find((start) => start.index === enemy.index)!.hp > 0,
  );
  let score = 0;
  if (dies) score -= 100_000;
  if (winsFight) score += 10_000;
  score -= weights.hp * hpLoss;
  // Ending at 1 leaves next turn a must-Escape turn (or death if none is drawn); the boss has 321 HP,
  // so the countdown outlasts any damage race.
  if (sandpitAfter === 1) score -= weights.hp * 15;
  // An enraged crab hits every later turn with the extra Strength (the lasting-Strength line below
  // counts 3 per point; this adds about two more attacks' worth at HP weight).
  if (sim.enraged > 0 && !winsFight) score -= weights.hp * sim.enraged * CRAB_RAGE_STRENGTH * 2;
  // Mercury Hourglass hits every enemy at the start of our next turn: one left at or below it dies then
  // (after its attack). A crab dying that way alone enrages the other just the same (PLC F33 T9: Crusher
  // left at 2 HP, the Hourglass killed it, Rocket got 99 Block and a 41-damage Laser).
  const startDamage = input.player.startTurnDamage ?? 0;
  const startTurnKills = winsFight || startDamage <= 0 ? [] : living.filter((enemy) => enemy.hp <= startDamage);
  const survivors = living.filter((enemy) => !startTurnKills.includes(enemy));
  if (startTurnKills.some((enemy) => crabs.includes(enemy.index))) {
    const enragedNext = survivors.filter((enemy) => enemy.crabRage).length;
    score -= weights.hp * enragedNext * CRAB_RAGE_STRENGTH * 2;
  }
  // Waterfall Giant: its explosion is the Steam Eruption stacks (+3 a turn while it lives), and next
  // turn's hand blocks ~12 of it. Below that line every HP lost now is a lost fight (G7EJ, WQTRX:
  // both went into the explosion with too little HP after racing damage), so HP counts double.
  const eruption = Math.max(0, ...sim.enemies.filter((enemy) => (enemy.eruption ?? 0) > 0).map((enemy) => enemy.eruption! + (enemy.maxHp >= 1_000_000 ? 0 : 3)));
  // Racing a Giant that is too slow to kill (raceEruption): HP spent on damage is the way through.
  if (!winsFight && eruption > 0 && hpAfter < eruption - 12 && !input.raceEruption) score -= weights.hp * hpLoss;
  if (sim.retaliate > 0 && !winsFight) {
    // Retaliation lands during the enemy turn: count it as damage, per hit that lands (an attacker it
    // kills stops attacking), capped by the attacker's HP.
    let back = 0;
    for (const enemy of living) {
      const landed = hits.filter((hit) => hit.enemy === enemy.index).length;
      back += Math.min(enemy.hp, landed * (enemy.intangible ? Math.min(1, sim.retaliate) : sim.retaliate));
    }
    score += weights.damage * back;
  }
  if (incomingAfterBlock > 0) {
    const punish = living.reduce((sum, enemy) => sum + (enemy.punishesUnblocked ?? 0), 0);
    score -= punish;
    // Painful Stabs: a Wound per unblocked hit, clogging later hands (2WUM T10: 3 Wounds in 5 cards).
    let blockLeftForHits = blockLeft;
    for (const hit of hits) {
      const through = hit.amount - blockLeftForHits;
      blockLeftForHits = Math.max(0, blockLeftForHits - hit.amount);
      if (through <= 0) continue;
      const wounds = sim.enemies.find((enemy) => enemy.index === hit.enemy)?.woundsPerHit ?? 0;
      score -= WOUND_COST * wounds;
    }
  }
  if (input.player.keepsBlock && !winsFight) score += 0.4 * Math.max(0, blockLeft - incomingRaw);
  // Unkillable husks (Waterfall Giant after defeat: 999,999,999 HP, exploding next turn): damage into
  // them is worthless, only surviving the blow matters.
  const husk = sim.enemies.filter((enemy) => enemy.maxHp >= 1_000_000);
  const huskDamage = husk.reduce((sum, enemy) => {
    const start = input.enemies.find((entry) => entry.index === enemy.index)!;
    return sum + Math.max(0, start.hp - enemy.hp);
  }, 0);
  // Damage that does not stick is worth nothing. An illusion not killed this turn heals to full
  // (VKPX F22: ~10 turns of attacks into a 21 HP Parafright while the Obscura sat at 68). A segment
  // that dies while another lives comes back at the Reattach HP (0NG F29: an 18 HP segment killed,
  // back at 25), so its damage is only worth what it takes off that. Damage into a segment that
  // lives does stick (the logs show it carried over turn to turn).
  const lostDamage = sim.enemies.reduce((sum, enemy) => {
    const start = input.enemies.find((entry) => entry.index === enemy.index)!;
    const dealt = Math.max(0, start.hp - Math.max(0, enemy.hp));
    if (enemy.illusion && enemy.alive) return sum + dealt;
    if (enemy.reattach && !enemy.alive && !allSegmentsDead) {
      const kept = Math.max(0, start.hp - (enemy.reattachHp ?? start.hp));
      return sum + Math.max(0, dealt - kept);
    }
    return sum;
  }, 0);
  score += weights.damage * (sim.damageDealt - huskDamage - lostDamage);
  // The Bomb: its damage lands on every enemy a few turns later, unless the fight is over by then.
  if (sim.bombs > 0 && !winsFight) {
    const reach = living.filter((enemy) => enemy.maxHp < 1_000_000).reduce((sum, enemy) => sum + Math.min(enemy.hp, sim.bombs), 0);
    score += weights.damage * reach * (input.fightKind === "boss" || input.fightKind === "elite" ? BOMB_SURE : BOMB_SURE * 0.6);
  }
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
  // Waking a sleeper with chip damage hands it the turns it would have slept (Z2H3 F17 T1: Bash broke
  // the Matriarch's 12 Plating, 12 HP off 222, and it attacked from T2 instead of T4). Worth it only
  // for a big hit.
  for (const enemy of living) {
    const start = input.enemies.find((entry) => entry.index === enemy.index)!;
    if (!enemy.sleepLost || start.attacks.length > 0) continue;
    if (start.hp - enemy.hp >= start.hp * SLEEP_BIG_HIT) continue;
    score -= weights.hp * enemy.sleepLost * sleepTurnDamage(start);
  }
  // Debuffs only matter on enemies that survive the turn.
  for (const enemy of living) {
    const start = input.enemies.find((entry) => entry.index === enemy.index)!;
    const addedVulnerable = Math.max(0, enemy.vulnerable - start.vulnerable);
    const addedWeak = Math.max(0, enemy.weak - start.weak);
    score += weights.vulnerable * Math.min(addedVulnerable, 3);
    // Demise: HP lost at the end of each of its turns, about three of them counted.
    const addedDemise = Math.max(0, (enemy.demise ?? 0) - (start.demise ?? 0));
    if (addedDemise > 0) score += weights.damage * Math.min(enemy.hp, addedDemise * DEMISE_TURNS);
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
    // A Mantle played this low bleeds us out before its block pays (YP9 T3: 30 HP, Mantle over
    // Defend+ into a 28 hit, 2 HP left, then the Mantle's own HP cost killed us).
    if (sim.mantles > 0 && hpAfter <= 10) score -= sim.mantles * (MANTLE_VALUE * fightLength * earliness + weights.hp * 5);
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
      potionCost: sim.potionCost,
      sandpitAfter,
      startTurnKills: startTurnKills.map((enemy) => enemy.name),
      withersAdded,
    },
  };
}

function simKey(sim: Sim): string {
  const hand = sim.hand.map((card) => `${card.cardId}${card.upgraded ? "+" : ""}`).sort().join(",");
  const enemies = sim.enemies.map((enemy) => `${enemy.hp}/${enemy.block}/${enemy.vulnerable}/${enemy.weak}/${enemy.artifact}/${enemy.strengthDelta}/${enemy.slippery ?? 0}/${enemy.curlUp ?? 0}/${enemy.flutter ?? 0}/${enemy.sleepLost ?? 0}/${enemy.tempStrengthLoss ?? 0}/${enemy.demise ?? 0}`).join("|");
  return `${hand}#${sim.energy}#${sim.hp}#${sim.block}#${sim.strength}#${sim.hpLostThisTurn ? 1 : 0}#${enemies}#${sim.flat}#${sim.potionCost}#${sim.tempDex}#${sim.buffer}#${sim.retaliate}#${sim.rupture}#${sim.facing}#${sim.colossus ? 1 : 0}#${sim.played}#${sim.drawScore}#${sim.escapes}#${sim.mantles}#${sim.enraged}#${sim.bombs}#${sim.gigantic}`;
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
    retaliate: input.player.retaliate ?? 0,
    rupture: input.player.rupture ?? 0,
    facing: input.player.facing ?? null,
    // A Colossus already up is in the intents (2WUM T7: 10x7 shown as 5x7, then halved again to 2x7).
    colossus: false,
    played: input.cardsPlayedThisTurn ?? 0,
    drawScore: 0,
    cardsDrawn: 0,
    unknown: [],
    feedKills: 0,
    escapes: 0,
    mantles: 0,
    enraged: 0,
    bombs: 0,
    gigantic: 0,
  };

  const seen = new Set<string>();
  const byOutcome = new Map<string, Plan>();
  let nodes = 0;
  let truncated = false;

  const visit = (sim: Sim): void => {
    nodes += 1;
    const plan = evaluate(sim, input, weights);
    const o = plan.outcome;
    const signature = `${o.hpLoss}|${o.damageDealt}|${o.kills.join(",")}|${o.enemyHpAfter.map((enemy) => `${enemy.hp}:${enemy.vulnerable}:${enemy.weak}`).join(",")}|${o.strengthGained}|${o.cardsDrawn}|${o.sandpitAfter ?? "-"}|${Math.round(plan.score)}`;
    const potionsDrunk = sim.steps.filter((step) => step.cardId.startsWith("POTION:")).length;
    const overPotionCap =
      input.potionLimit !== null && input.potionLimit !== undefined && potionsDrunk > input.potionLimit && !o.winsFight && o.hpAfter >= input.player.maxHp * 0.3;
    const existing = byOutcome.get(signature);
    // Same outcome: prefer the shorter plan (fewer steps = fewer chances for the board to surprise us).
    // Over the potion cap it is not a plan to offer, but the search goes on (a later card may win).
    if (!overPotionCap && (!existing || plan.score > existing.score + 1e-9 || (Math.abs(plan.score - existing.score) < 1e-9 && plan.steps.length < existing.steps.length))) {
      byOutcome.set(signature, plan);
    }
    if (nodes >= maxNodes) {
      truncated = true;
      return;
    }
    if (sim.enemies.every((enemy) => !enemy.alive) || plan.outcome.winsFight) return;

    const tried = new Set<string>();
    const cardPlays = sim.steps.filter((step) => !step.cardId.startsWith("POTION:")).length;
    const playsLeft = input.player.maxPlays === null || input.player.maxPlays === undefined ? Infinity : input.player.maxPlays - cardPlays;
    for (const card of sim.hand) {
      if (card.type !== "Potion" && playsLeft <= 0) continue;
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
  // Drinking a potion is a cost too: without this axis "same result, but spends Fortifier" dominated
  // "take 4 damage, keep Fortifier" and the cheaper plan was never shown (Vantom, live run).
  return [o.winsFight ? 1 : 0, -o.hpLoss, o.damageDealt, -living, debuffs, o.strengthGained, o.cardsDrawn, -o.potionCost, o.sandpitAfter ?? 0];
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
        other.outcome.strengthGained === plan.outcome.strengthGained &&
        other.outcome.sandpitAfter === plan.outcome.sandpitAfter,
    );
    if (!similar) picked.push(plan);
  }
  return picked;
}
