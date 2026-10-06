/**
 * Turn-level combat search: every legal order of the cards in hand (energy permitting), simulated
 * to the end of the turn, then scored. This replaces the single-card lookahead that missed a
 * two-Strike lethal on a live run (floor 7, Byrdonis, 10 HP vs 2x9 damage).
 *
 * It is deliberately a *turn* model: draws, random effects and next turn are not simulated. Cards
 * that draw are valued by what the known pile holds (a flat bonus when it is unknown) and the loop
 * re-plans after every single action, so the drawn cards are picked up on the next plan. Numbers are exact where the mod gives them (card
 * values, intents); the scoring weights are heuristics tuned from run logs.
 */

import { applyUpgrade, freeCardPick, giantRockFrom, isStrikeCard, ourAttackScaled, thisTurnScore, type CardModel } from "./card-model.js";

/** Shrink (Beetle Juice on an enemy, SHRINK_POWER): its attacks deal 70% (states.jsonl 23 -> 16, 20 -> 14). */
export const SHRINK_DAMAGE_FACTOR = 0.7;

/**
 * The Shrinker Beetle: its Shrink on us (SHRINK_POWER -1, put on at its first move) lasts while it lives and is gone the
 * moment it dies. Logged (A1-A9, 156 runs): 1448 frames with our Shrink, a living beetle in every one; XC4TNGZU4KT9 F9 T4:
 * Anger killed it at 2 HP, the two Strikes after it hit the Wurm 58 -> 49 -> 40 (6 + 3 Strength, no Shrink).
 */
export const SHRINKER = "SHRINKER_BEETLE";

/**
 * The enemy powers the solver counts down during our turn, and the EnemySim field each lives in: the ones a learned
 * "stunned when stripped to 0" rule (EnemySim.stunOnStrip) can see stripped. A power the logs show stunning on its strip
 * but without a counter here needs code first (the learner's mechanics audit says so); Shriek, Plow, Burrowed, Asleep and
 * Slumber are stuns the solver already models by hand (shriek, burrowed, asleep / slumber).
 */
export const STRIP_COUNTERS = { FLUTTER_POWER: "flutter", SLIPPERY_POWER: "slippery", CURL_UP_POWER: "curlUp", ARTIFACT_POWER: "artifact" } as const satisfies Record<string, keyof EnemySim>;

/**
 * MECH_MOVE_RULES (class B, knowledge/mechanics.ts moveRules): the enemy powers whose removal or lowering the solver can
 * see a line make, beyond the STRIP_COUNTERS: an Axebot's Stock (taken by a kill: it comes straight back, Stock - 1) and
 * Crab Rage (spent when a partner dies). A learned move rule on any other power needs code here first.
 */
export const MOVE_RULE_POWERS: ReadonlySet<string> = new Set([...Object.keys(STRIP_COUNTERS), "STOCK_POWER", "CRAB_RAGE_POWER"]);

/** One learned move change on an enemy (EnemySim.moveOnStrip): its power going this way changes its move this turn. */
export interface MoveOnStrip {
  power: string;
  /** The power's and the new move's game names, for the option's fact. */
  name: string;
  how: "removed" | "lowered";
  move: string;
  moveName: string;
  /** The new move's attack this turn: the move table at this ascension, with its Strength and Weak and our Vulnerable. */
  attacks: { damage: number; hits: number }[];
  /** The logged counts behind it: strips (or lowerings), and those that showed the move. */
  n: number;
  changed: number;
  /** The powers that go with the change (knowledge/mechanics.ts clearedWith: an Axebot's revive clears its Strength). */
  clears?: string[];
}

/** How a line took one of an enemy's powers: to 0 (removed), down and still up (lowered), or not at all (null). */
function powerWent(power: string, enemy: EnemySim & { alive?: boolean }, start: EnemySim): "removed" | "lowered" | null {
  if (power === "STOCK_POWER") {
    const stock = start.stock ?? 0;
    // A kill with Stock left is the revive (rollout enemyDown): Stock - 1, gone at 0.
    return stock > 0 && enemy.alive === false ? (stock <= 1 ? "removed" : "lowered") : null;
  }
  if (power === "CRAB_RAGE_POWER") return start.crabRage === true && enemy.crabRage !== true ? "removed" : null;
  const field = STRIP_COUNTERS[power as keyof typeof STRIP_COUNTERS];
  if (field === undefined) return null;
  const before = (start[field] as number | undefined) ?? 0;
  const after = (enemy[field] as number | undefined) ?? 0;
  if (before <= 0) return null;
  return after <= 0 ? "removed" : after < before ? "lowered" : null;
}

/** The learned move change of an enemy this line set off (MECH_MOVE_RULES): the first of its rules whose power went that way. */
export function ruledMove(enemy: EnemySim & { alive?: boolean }, start: EnemySim | undefined): MoveOnStrip | null {
  if (!enemy.moveOnStrip || !start) return null;
  for (const rule of enemy.moveOnStrip) if (powerWent(rule.power, enemy, start) === rule.how) return rule;
  return null;
}

/**
 * MECH_DEATH_MOVE (class D, knowledge/mechanics.ts deathRules, docs/mechanics-learning.md §9): one learned "an ally's death
 * changes my move" rule on a survivor (EnemySim.moveOnDeath), for one ally on the board. When the line kills that ally for
 * good, the survivor's move this turn becomes `move` at once (its attack in hp_lost instead of the shown one; the Queen's
 * Burn Bright For Me -> Enrage, no attack either way), and its next move is `next` (the rollout's next enemy turn: Off With
 * Your Head, 7x5 at A8).
 */
export interface DeathMove {
  /** The ally's board index, monster id and game name. */
  ally: number;
  allyId: string;
  allyName: string;
  /** This turn, from the survivor's move now: the move it changes to at once and that move's attack, or null (no change). */
  move: string | null;
  moveName: string | null;
  attacks: { damage: number; hits: number }[];
  /** Its next move after such a death (after `move`, or its move now), its game name and attack as priced now, or null. */
  next: string | null;
  nextName: string | null;
  nextAttack: number | null;
  /** The logged counts: same turn [changed, deaths at its move now], next [count, deaths it lived to the next turn]. */
  nowCounts?: [number, number];
  nextCounts?: [number, number];
  /**
   * The rule for the rollout's later turns (re-read from the move it has then): the same-turn change by move, the next move
   * and the end moves it was logged after, the death's own moves (never shown while such an ally lived: kept out of its
   * successors then) and the moves it never showed once such an ally was dead (kept out after).
   */
  rule: { now: Record<string, string>; next: string | null; after: string[]; exclusive: string[]; aliveOnly: string[] };
}

/** The line killed this enemy for good: dead at its end and not back (Stock, an illusion, a reattaching segment, a next phase, a husk). */
export function diedForGood(enemy: { alive?: boolean } | undefined, start: EnemySim | undefined): boolean {
  if (!enemy || !start || start.hp <= 0 || enemy.alive !== false) return false;
  return !start.illusion && !((start.stock ?? 0) > 0) && !start.reattach && !start.revives && !((start.eruption ?? 0) > 0);
}

/** The learned death rule a line set off on a survivor still alive (MECH_DEATH_MOVE): the first whose ally it killed for good. */
export function deathMoved(enemy: EnemySim & { alive?: boolean }, sim: { enemies: (EnemySim & { alive?: boolean })[] }, input: Pick<SolverInput, "enemies">): DeathMove | null {
  if (!enemy.moveOnDeath || enemy.alive === false) return null;
  for (const rule of enemy.moveOnDeath) {
    if (diedForGood(sim.enemies.find((entry) => entry.index === rule.ally), input.enemies.find((entry) => entry.index === rule.ally))) return rule;
  }
  return null;
}

/** The learned strip-stun of an enemy this line set off: the first power of its rules that was up and is at 0 now. */
export function strippedStun(enemy: EnemySim, start: EnemySim | undefined): { power: string; name: string } | null {
  if (!enemy.stunOnStrip || !start) return null;
  for (const rule of enemy.stunOnStrip) {
    const field = STRIP_COUNTERS[rule.power as keyof typeof STRIP_COUNTERS];
    if (field === undefined) continue;
    if (((start[field] as number | undefined) ?? 0) > 0 && ((enemy[field] as number | undefined) ?? 0) <= 0) return rule;
  }
  return null;
}

export interface EnemySim {
  index: number;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  vulnerable: number;
  weak: number;
  /** Poison remaining before this enemy turn, observed in Silent runs. */
  poison?: number;
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
  /**
   * Imbalanced (Rock Bowlbug): when its attack this turn is fully blocked it is stunned and skips its
   * next move. The value is that next move's expected hit (move model), what the stun saves (N95W F19
   * T3: "Defend, Defend, True Grit" 17 block against Headbutt 15 would have stunned it).
   */
  imbalanced?: number;
  /** Minion: leaves when every non-minion enemy is dead. */
  minion?: boolean;
  /**
   * Shriek (Terror Eel, SHRIEK_POWER 70 = half its HP): the first time its HP drops to this or below it
   * is stunned, and its move this turn is cancelled (PU21 F7 T3: 82 -> 69, CRASH 22 became STUNNED).
   */
  shriek?: number;
  /**
   * Burrowed (Tunneler): its block stays up between turns, and breaking it during our turn stuns it,
   * cancelling this turn's attack (HV0D F21: 32 block T3-T10, Below 23 landed five times).
   */
  burrowed?: boolean;
  /** Has powers the solver does not model: its damage estimate is discounted to stay safe. */
  unmodelled?: boolean;
  /**
   * Turns left to kill it, this one included, before the fight ends without a win (the Battleworn
   * Dummy event's BATTLEWORN_DUMMY_TIME_LIMIT_POWER: 3, 2, 1; SK1USHSB1U7U F43: 144 of 150 dealt).
   */
  timeLimit?: number;
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
  /** Shrink N (Beetle Juice): its attacks deal 30% less for N turns; a Shrink already up is in its intents. */
  shrink?: number;
  /** Our Shrink is this enemy's (the Shrinker Beetle, SHRINKER): it is gone once no such enemy lives (Sim.shrunk). */
  shrinksUs?: boolean;
  /** Unblocked damage from this enemy has an extra lasting cost (Suck, Paper Cuts). */
  punishesUnblocked?: number;
  /** Personal Hive N (Entomancer): every attack hit on it adds N Dazed to our draw pile (M812 F28). */
  dazedPerHit?: number;
  /** Painful Stabs N: every unblocked hit shuffles N Wounds into the discard pile (2WUM: 3 of 5 cards). */
  woundsPerHit?: number;
  /** Enrage N (Test Subject phase 1): +N Strength for every Skill the player plays. */
  enrage?: number;
  /**
   * Vital Spark N (Infested Prism, VITAL_SPARK_POWER: "all Skill cards have Tainted N"): every Skill we
   * play gives us Tainted N, and Tainted (TAINTED_POWER: "take extra attack damage this turn") adds 1 to
   * every enemy attack hit this turn per stack, before Weak like Strength (4LC3 F31: Whirlwind 6x3 ->
   * 10x3 -> 14x3 over Defend and Shrug It Off; Weak 3x3 -> 5x3 -> 6x3 on T3). Gone at our next turn.
   */
  vitalSpark?: number;
  /**
   * Adaptable (Test Subject): another phase follows. At 0 HP it spends a turn reviving (no attack) and
   * comes back at full, higher max HP, so killing it does not win the fight.
   */
  revives?: boolean;
  /**
   * Stock N (Axebot, STOCK_POWER): revives left. At 0 HP with Stock > 0 it comes straight back at full,
   * higher max HP with Stock -1, and its move becomes Boot Up (10 Block, +3 Strength: no attack that
   * turn), then it attacks harder. A kill with Stock left is no kill and no fight win (U6W7 F39: three
   * "lethal" turns, each one revived it).
   */
  stock?: number;
  /** Gets stronger every turn it lives (Buff intent, Ritual, Territorial, stacking Strength): kill it first. */
  scaling?: boolean;
  /**
   * Ravenous N (Corpse Slug, RAVENOUS_POWER: 「当有敌人死亡时，噬尸蛞蝓会立即吃下尸体，在本回合被击晕然后获得1点力量」,
   * logged amount 4, 5 at A9): another enemy dying this turn stuns it (its attack this turn is cancelled) and
   * gives it N Strength for the fight (182 logged fights; the line making the kill was under-valued).
   */
  ravenous?: number;
  /**
   * What it spawns when it dies (Phrog Parasite's INFESTED_POWER: 4 Wrigglers; Gremlin Merc's SURPRISE_POWER: a
   * Fat and a Sneaky Gremlin), as shown to Jev: killing it is a kill, not the fight won.
   */
  spawnsOnDeath?: string;
  /**
   * MECH_RULES (knowledge/mechanics.ts, docs/mechanics-learning.md): its powers whose strip to 0 on our turn stuns it and
   * cancels this turn's move, learned from the logs, not hand-coded per enemy (the Thieving Hopper's Flutter: 41 of 41
   * logged strips stunned it; MCK9SMSK40ZY F19 T4, Nab 14 dealt nothing). Only powers with a counter the solver tracks
   * (STRIP_COUNTERS); `name` is the game's, for the option's fact. Absent: no such rule (MECH_RULES off, no data).
   */
  stunOnStrip?: { power: string; name: string }[];
  /**
   * MECH_MOVE_RULES (knowledge/mechanics.ts moveRules, docs/mechanics-learning.md §8): its powers whose removal (or
   * lowering) on our turn changes its move at once, learned from the logs per monster (an Axebot killed with Stock left
   * comes back in Boot Up, no attack: 22 of 23 last-Stock strips, 22 of 22 first revives). Only powers the solver sees go
   * (MOVE_RULE_POWERS). A line setting one off counts the new move's attack in hp_lost instead of the shown one. Absent: no
   * such rule (the switch off, no data).
   */
  moveOnStrip?: MoveOnStrip[];
  /**
   * MECH_DEATH_MOVE (knowledge/mechanics.ts deathRules, docs/mechanics-learning.md §9): its learned move changes on an ally's
   * death, one per ally on the board (the Queen's on the Torch Head Amalgam: Enrage at once, Off With Your Head next turn).
   * A line killing that ally counts the same-turn move's attack in hp_lost instead of the shown one. Absent: no such rule
   * (the switch off, no data).
   */
  moveOnDeath?: DeathMove[];
  /** Attack intents for this enemy's next turn, as shown (already including its own Strength/Weak). */
  attacks: { damage: number; hits: number }[];
}

export interface PlayerSim {
  hp: number;
  /** Attacks that cost 0 this turn (Free Attack from Unrelenting). */
  freeAttacks?: number;
  /** Cards in the exhaust pile at the start of this decision, when known (Pact's End needs 3). */
  exhaustPile?: number;
  /**
   * Cards in the draw and discard piles together, when known: the most this turn's draws can bring into
   * the hand (Fiend Fire counts them: 9VG8 F35 T6).
   */
  drawable?: number;
  /**
   * Duplication already up (DUPLICATION_POWER, from a Duplicator drunk earlier this turn): the next card
   * is played twice (11LC F17 T2: re-planned after the drink as if it were not, Bash+ went single).
   */
  duplicate?: number;
  /**
   * One-Two Punch already up (ONE_TWO_PUNCH_POWER): the next N Attacks this turn are played an extra time
   * (9Q7V F17 T14: not read, Sword Boomerang planned at 18 dealt 36 and killed the Giant into its blast).
   */
  duplicateAttacks?: number;
  /** Burst already up: each of the next N Skills this turn is played once more (silent-0114/0115). */
  duplicateSkills?: number;
  /** Regen already up (REGEN_POWER): healed at the end of this turn, before the enemy attacks. */
  regen?: number;
  /**
   * Soldier's Stew drunk before this turn and not shown in the hand's text (the rollout's later turns):
   * every Strike card is played this many extra times.
   */
  strikeReplay?: number;
  /**
   * Throwing Axe (「你在每场战斗中打出的第一张牌会多打出一次」) and no card played yet this fight: the first card this line
   * plays is played once more, energy paid once, as a Replay (FSPKJAYY3ET6 F39 T1: Inflame under Galvanic, Strength 2 -> 8,
   * HP 69 -> 57; the solver had it once).
   */
  firstCardReplay?: boolean;
  /**
   * Buffer already up (BUFFER_POWER, from a Lucky Tonic drunk earlier): each stack prevents the next HP
   * loss, our own included (99X7 F9 T3: Breakthrough's 1 HP ate the Buffer drunk for the enemy turn, -17).
   */
  buffer?: number;
  /**
   * Most HP we can lose in one turn (Beating Remnant: 20). CCPR F48 T6-T7: every Test Subject line
   * really cost 20; uncapped, the guard and least-loss picked block lines over 48-damage ones.
   */
  hpLossCap?: number | null;
  maxHp: number;
  /** Silent UJ0K3G10609Y F48 T4/T7: one less HP per enemy hit past block; other loss interactions unverified. */
  tungstenRod?: boolean;
  block: number;
  energy: number;
  weak: boolean;
  vulnerable: boolean;
  /** Existing Frail and Dexterity, already reflected in the hand's displayed Block. */
  frail?: boolean;
  dexterityNow?: number;
  /** Takes 50% less from enemy attacks? (Intangible etc. — not modelled beyond this flag.) */
  intangible: boolean;
  /**
   * Shrink on us (SHRINK_POWER, the Shrinker Beetle's -1: while it lives): our attacks deal 30% less, rounded once with
   * Weak and Vulnerable (card-model ourAttackScaled). The hand's numbers carry it already (CardModel.shownShrunk); this
   * turn's Strength, Body Slam's block, Vigor and the cards a line draws or makes do not. Potions, Inferno, Juggernaut,
   * Thorns, Flame Barrier and the relics' damage are not attacks (logged under Shrink: Inferno 9 hit for 9, Flame
   * Barrier 4 for 4, Thorns 3 for 3, Letter Opener 5 for 5).
   */
  shrunk?: boolean;
  /**
   * Kusarigama: every 3rd attack in a turn deals 6 to a random enemy (counted as the lowest-HP one). The
   * relic's counter (attacks already played this turn) comes from its stack.
   */
  kusarigama?: { every: number; damage: number; count: number };
  /**
   * Shuriken (「你每在同一回合内打出3张攻击牌，获得1点力量」): every 3rd Attack played in a turn gives 1 Strength for
   * the fight, on the Attacks after it. `count`: the Attacks already played this turn (attacks_played_this_turn),
   * mod `every`. Logged over 8 runs holding it: +1 at 90 of 95 crossings of a multiple of 3 (DHGT F33 T1: 0 -> 1 ->
   * 2 after the 3rd and 6th Attack), the count starting again each turn.
   */
  shuriken?: { every: number; strength: number; count: number };
  /** Daughter of the Wind: block per Attack play, not per hit (CSBR5CRDWQNB F33 attempt 6 T1/T2/T4). */
  daughterWindBlock?: number;
  /**
   * Music Box (「将你每回合打出的第一张攻击牌的一张虚无复制品加入你的手牌」): the first Attack card played in a turn
   * adds an Ethereal copy of itself to the hand (after its own effects, draws included). `count`: the Attacks already
   * played this turn (attacks_played_this_turn); only at 0 does this line's first Attack make one. Logged YVYZ F48:
   * T1 Salvo, T2 Unrelenting, T3 Strike, T5/T7 Pommel Strike (after its draw), T6 Strike each came back as
   * "虚无。 …" at the end of the hand; the copies played counted in cards_played_this_turn (the Withers came on
   * the game's every-6th card with them counted).
   */
  musicBox?: { count: number };
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
  /**
   * Smoggy (SMOGGY_POWER: 「每回合你只能打出1张技能牌」): at most this many more Skills this turn; null for no
   * cap. The solver planned two and the game refused the second (Living Fog, 51 logged fights).
   */
  maxSkills?: number | null;
  /** Damage at the end of the turn (Disintegration debuff); it hits block first. */
  endTurnHpLoss?: number;
  /** Surrounded: attacks from enemies we are not facing deal +50%; targeting an enemy turns us to it. */
  surrounded?: boolean;
  /** Index of the enemy we currently face (last targeted), when known. */
  facing?: number | null;
  /**
   * MECH_MOVE_RULES (class C, the Kaiser Crab): Surrounded's back attack needs two living enemies. Once one claw is dead
   * the other's attack shows and lands without the x1.5 whatever we face (152 of 152 logged one-claw attack intents; on
   * 27 logged deaths, each of the 10 survivors shown from behind lost it at once: TQX5JJX3UD39 F33 T4 Laser 49 -> 39 = 31
   * + 8, Crab Rage's +6 in it).
   * Absent: the back attack as before (backAttack on the facing alone).
   */
  backAttackPair?: boolean;
  /**
   * Colossus already up (COLOSSUS_POWER). The mod's intents already show the halved damage for
   * enemies that were Vulnerable, so only enemies made Vulnerable this turn are halved again.
   */
  colossus?: boolean;
  /**
   * HP lost at the start of next turn before block: Crimson Mantle's 1 per copy in play (mantleHpCost) and Inferno's 1 per
   * copy up (infernoCopies); an Inferno or Mantle played this turn adds its own 1 on top (Sim.infernos, Sim.mantles).
   */
  startTurnHpLoss?: number;
  /** Damage back per enemy attack hit already up (Flame Barrier power, Thorns). */
  retaliate?: number;
  /**
   * Damage to every enemy at the start of our next turn, all sources together (Mercury Hourglass 3,
   * Inferno's amount for its own 1 HP loss). It kills a crab left at or below it (PLC F33 T9, 9XZX T7).
   */
  turnStartAoe?: number;
  /**
   * Block at the end of our turn for each card still in hand (Cloak Clasp: 「在你的回合结束时，每有一张手牌，
   * 就获得1点格挡」; logged 7MDJ/JEGB/CWU9/88HN: HP lost = incoming - block - cards held).
   */
  blockPerHeldCard?: number;
  /** Inferno already up (INFERNO_POWER amount): every HP loss on our turn deals this to every enemy. */
  inferno?: number;
  /**
   * Infernos already up, each losing 1 HP at the start of our turn (in startTurnHpLoss already): the power shows only the
   * copies' damage summed, so combat-plan counts them at the fewest that sum can be (strategy/start-loss.ts infernoCopies). The
   * rollout carries it into its later turns; absent, it is counted from `inferno` (infernoCopiesOf).
   */
  infernoCopies?: number;
  /** Unmovable up and not yet used this turn: shown Block values are doubled, only the first one is real. */
  unmovableArmed?: boolean;
  /** Shadowmeld already up: hand card Block is already doubled in the mod's values. */
  shadowmeldActive?: boolean;
  /** Current CORROSIVE_WAVE_POWER from the observed player state; expires this turn. */
  corrosiveWave?: number;
  /** Strength at the start of the turn (STRENGTH_POWER), for rounding Weak damage once from the base. */
  strengthNow?: number;
  /**
   * Feel No Pain already up (FEEL_NO_PAIN_POWER amount): Block per card exhausted (QBRN F48 T7: Fiend
   * Fire through 4 cards with Feel No Pain 3 was scored as 9 damage and no block).
   */
  feelNoPain?: number;
  /** Afterimage already active: block for each subsequent card play, including replays. */
  afterImage?: number;
  /** Extra poison triggers granted by the observed Accelerant power. */
  poisonExtraTriggers?: number;
  /** Observed ENVENOM_POWER: poison for each attack hit that removes HP. */
  envenom?: number;
  /** Observed nine-point Phantom Blades power; normalized hand damage excludes it. */
  phantomBlades?: number;
  /** The observed first-Shiv bonus has already been spent, or its availability is unknown. */
  phantomBladesSpent?: boolean;
  /**
   * Hellraiser up (HELLRAISER_POWER): 「每当你抽到名字中有“打击”的牌时，对一名随机敌人打出这张牌」 — a Strike drawn this
   * turn plays itself, free, at a random enemy (the rollout does it for later turns' draws, a4f3795).
   */
  hellraiser?: boolean;
  /** Dark Embrace up (DARK_EMBRACE_POWER amount): cards drawn for each card exhausted this turn. */
  darkEmbrace?: number;
  /**
   * Pael's Tear (「如果你在拥有未花费的能量情况下结束回合，则下个回合额外获得能量」): the extra energy next turn when this
   * turn ends with energy unspent (PAELS_TEARS_ENERGY; logged: 1, 2 or 3 left, next turn 5 on a base of 3).
   */
  paelsTears?: number;
  /**
   * Whole-fight simulator only (src/sim, B2; the live planner never sets them): end-of-turn block relics. Orichalcum
   * (「如果你在回合结束时没有任何格挡，获得格挡」, logged 6): this much when the turn's cards left no block; Ripple Basin
   * (「如果你在本回合中没有打出过攻击牌，则获得格挡」, logged 4): this much when no Attack was played this turn.
   */
  orichalcum?: number;
  rippleBasin?: number;
  /**
   * PASSIVE_PIECES (src/reflex/passive-pieces.ts; the rollout's later turns and the whole-fight sim set them, the live
   * planner's current turn does not): Letter Opener (「你每在同一回合内打出3张技能牌，就对所有敌人造成5点伤害」: `damage` to
   * every enemy, as non-attack damage, at each play that brings the turn's Skills, from `count`, to a multiple of
   * `every`), Ornamental Fan (「你每在同一回合内打出3张攻击牌，就获得4点格挡」: `block`, not Frail-cut, at each Attack play
   * likewise, counted as Kusarigama counts), Parrying Shield (「如果你在回合结束时拥有至少10点格挡，则对随机敌人造成6点伤害」:
   * at the end of the turn, Plating's block counted, `damage` to the solver's worst random victim before the enemies act).
   */
  letterOpener?: { every: number; damage: number; count: number };
  /** Silent-0108/0072: seven passive Block each ten Skills, across turns. */
  tuningFork?: { every: number; block: number; count: number };
  ornamentalFan?: { every: number; block: number; count: number };
  parryingShield?: { block: number; damage: number };
  /**
   * PASSIVE_PIECES (passive-pieces SolverPieceFields.orichalcumPlating): Plating's end-of-turn block, up or played this
   * turn, does not stop Orichalcum (logged for Plating up: A8ENYFR4ZWKG F48 T7, 842N6N604DVX F31 T3; no logged turn with
   * Plating played). Unset: Plating played this turn stops it, as before.
   */
  orichalcumPlating?: boolean;
  /** Demon Tongue, not yet spent this turn: the first HP lost on our turn is healed back. */
  demonTongue?: boolean;
  /**
   * The hand's card limit (unset: HAND_LIMIT). SL judge only (SL_JUDGE_ANY_DRAW): the draw pile's every card put in the hand
   * at once (the superset board) fits; more cards than the game allows can only help a line.
   */
  handLimit?: number;
  /**
   * Red Skull (「当你的生命值低于或等于50%时，你额外获得3点力量」): the Strength it gives while HP is at or below half
   * of max (RED_SKULL_STRENGTH). Already in the Strength shown when it is on; an HP loss on our turn that takes us
   * to half or below adds it for the rest of the turn, a heal back above half takes it off.
   */
  redSkull?: number;
  /**
   * Self-Forming Clay (「每当你在战斗中失去生命，就在下回合获得3点格挡」): block at the start of the next turn per HP
   * loss (CLAY_BLOCK), ours or an enemy hit's; `clayPending` is what this turn's losses so far already owe
   * (SELF_FORMING_CLAY_POWER). The next turn's total is Outcome.clayBlockNext (the rollout gives it).
   */
  clayBlock?: number;
  clayPending?: number;
  /**
   * Intimidating Helmet: block gained for every card played that costs 2+ energy as paid (PU21: 0 -> 4
   * after Perfected Strike and Howl from Beyond; a Howl made free did not trigger it).
   */
  helmetBlock?: number;
  /**
   * Vigor N (VIGOR_POWER): the next Attack deals N more, once. The hand's damage has it taken off
   * (stripVigor), and the solver adds it to the first Attack's first hit.
   */
  vigor?: number;
  /**
   * Pen Nib held: the Attack plays it has counted (its stack mod PEN_NIB_EVERY). The play that brings the count to the
   * 10th deals double damage, every hit (the hand's shown damage has the doubling taken off: card-model stripPenNib);
   * a duplicate or a replay is a play of its own, as for the other attack-counting relics (attackRelics).
   */
  penNib?: number;
  /**
   * Lost Wisp (「你每打出一张能力牌，就对所有敌人造成{Damage}点伤害」): this much to every enemy per Power played, through
   * block, Strength and Vulnerable not counted (logged over the 7 runs holding it: 8 to each enemy at every Power, e.g.
   * the Insatiable at Vulnerable 10 took 8; 8L29N792FA45 F33 T4: Rupture's 8 killed the Rocket at 5, the Crusher 114 -> 106
   * then enraged).
   */
  lostWisp?: number;
  /**
   * No Block (NO_BLOCK_POWER, from Panic Button: "no Block from cards for the next 2 turns"): block
   * cards give nothing (VP5F F48 T2: Flame Barrier+ in hand, Skull Bash took the full 15).
   */
  noBlock?: boolean;
  /** A card was already exhausted this turn before this decision (Evil Eye's doubling), or every turn (Toasty Mittens). */
  exhaustedThisTurn?: boolean;
  /**
   * CARD_CONDITIONS: HP was already lost this turn before this decision (Inferno's or Crimson Mantle's at the turn's start, a
   * card played earlier this turn): Spite hits twice from the line's first card (card-model cardConditionOptions). Only Spite
   * reads it (Demon Tongue keeps its own rule).
   */
  hpLostThisTurn?: boolean;
  /**
   * Tender N (TENDER_POWER, from the Hunter Killer's Tenderizing Goop): every card played lowers our
   * Strength and Dexterity by N for the rest of the turn (LSWU F21 T5: a "lethal" Setup Strike +
   * Whirlwind fell 6 short; the 5th Hunter Killer loss, C2WY, MF7A, BDAK, WM2X).
   */
  tender?: number;
  /**
   * Revives held, in the order they trigger (reviveThrough): Fairy in a Bottle (「生命值将被减少至0或以下时 …
   * 回复到你最大生命值的30%」, the potion is spent) and Lizard Tail (「回复到最大生命值的50%（仅能起效一次）」).
   * A line whose losses reach 0 HP goes on at the revive's HP instead of dying (JR66CJ9T8H7W F48, YQL8D59999AX
   * F31: "every line dies" played the most-HP line with a Fairy in the belt).
   */
  revives?: Revive[];
  /**
   * What Vulnerable multiplies our attacks by: 1.5, or 1.75 with Paper Phrog (「有易伤状态的敌人受到的伤害增加75%而非
   * 50%」; held in 46 logged fights, coverage review #12).
   */
  vulnerableFactor?: number;
}

/** One revive held (PlayerSim.revives): what it is, its name as shown, the HP it brings us back to. */
export interface Revive {
  source: string;
  name: string;
  hp: number;
}

/**
 * HP after a turn's losses taken in order (each already past block and Buffer), a revive catching each loss
 * that would take us to 0 or below: HP set to the revive's (the overflow is lost), the later losses on it.
 * Returns the HP left (<= 0: dead with every revive spent) and the revives used.
 */
export function reviveThrough(startHp: number, losses: number[], revives: Revive[]): { hp: number; used: Revive[] } {
  let hp = startHp;
  const used: Revive[] = [];
  for (const loss of losses) {
    if (loss === 0) continue;
    hp -= loss;
    if (hp <= 0 && used.length < revives.length) {
      hp = revives[used.length]!.hp;
      used.push(revives[used.length]!);
    }
  }
  return { hp, used };
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
  /**
   * Enemy index the fight plan kills first (FIGHT_PLAN=v1): damage into it is never minion-chipped
   * and is worth FOCUS_BONUS more (CAYK F48: the plan said Torch Head Amalgam first; code alone put
   * 128 damage into the Queen and 6 into the Amalgam over T1-T3, the Amalgam's 36-damage hits killed us).
   */
  focusIndex?: number;
  /**
   * Extra damage weight for `focusIndex` (default FOCUS_BONUS). The rollout's kill-order policy
   * (rollout.ts) sets it higher: its later turns follow the order being evaluated.
   */
  focusWeight?: number;
  /** Cards in the deck that pay off on enemy Vulnerable (raises the Vulnerable weight). */
  vulnerablePayoffs?: number;
  /**
   * The cards the next draws come from (the draw pile, or the discard pile when it is empty), when
   * known. Without it a draw is worth a flat DRAW_VALUE; with it, the pile's statuses count (XPA4 T8/T10:
   * Battle Trance at 1 energy drew 2 Beckons from a 6-card pile holding 3, -12 HP on a "-0" plan).
   */
  drawPile?: DrawPileCard[];
  /**
   * SL_RETRY_KNOWN_DRAWS (docs/sl.md §10): the top of the draw pile in draw order (the first card drawn first), as an
   * earlier attempt at this fight saw it come off. The line's draws take these cards first, as known cards it can play
   * (the cards past them are the pile's expected ones). Absent: every draw an expected value, as before.
   */
  knownTop?: CardModel[];
  /**
   * Expected damage of the enemies' next attack after this turn (move model), when known. On a turn
   * with nothing incoming, a plan that ends within NEXT_HIT_MARGIN of it weighs self-damage
   * QUIET_SELF_DAMAGE_WEIGHT times (JGJS F24 T1: Offering for -6 on the Spiny Toad's buff turn,
   * 23 -> 16 HP into a 23 hit).
   */
  nextIncoming?: number;
  /**
   * Expected enemy attack on each of the next enemy turns after this one (index 0 = next turn), from the
   * move model along each enemy's move chain, a sleeper's sleep turns at 0 (move-model damageForecast).
   * What Plating gained now can absorb over the turns it lasts (platingAbsorbed). Unset: this turn's
   * attack (or nextIncoming, the larger) every turn.
   */
  laterIncoming?: number[];
  maxNodes?: number;
  /**
   * SL judge only (SL_JUDGE_ANY_DRAW, docs/sl.md §2.3; never set by the live planner): a line whose HP reaches 0 on our own
   * turn, no revive held, is not extended (the game ends it there; its later plays cannot save it).
   */
  stopAtOwnDeath?: boolean;
  /** A time past which the search stops, cut short (SolveResult.truncated and timedOut). */
  deadline?: number;
  /** The deadline's clock; SL callers use Date.now(), rollouts use their monotonic budget clock. */
  deadlineNow?: () => number;
  /**
   * SL judge only: the search stops at the first line that does not die (SolveResult.lives): the judge only asks whether
   * every line dies. The plans found so far are returned as they are.
   */
  stopOnLive?: boolean;
  /**
   * SL judge only: card indices (the drawing cards) to watch. SolveResult.watchedAlive lists those after whose play some
   * line still had HP left (sim.hp > 0 right after the card resolved).
   */
  watch?: ReadonlySet<number>;
  /**
   * The damage weight times this (unset: 1): the whole boss fight simulator's policy knob (src/sim/boss-sim.ts,
   * docs/boss-sim.md), never set by the live planner.
   */
  damageScale?: number;
  /**
   * The HP weight times this (unset: 1): the whole boss fight simulator's policy knob (rollout policyWeights, B1.5),
   * never set by the live planner.
   */
  hpScale?: number;
  /**
   * Whole boss fights only (the simulator's one-turn lookahead, rollout policyLookahead; B5, docs/boss-sim.md §14), never
   * set by the live planner: each enemy's expected attack on its next turn after this one (move model), the block a
   * fresh hand is counted to make against it (ERUPTION_NEXT_BLOCK), and how much more HP counts when this turn's loss
   * ends us below what that next hit takes through such a hand (NEXT_HIT rule in evaluate).
   */
  nextHit?: { attacks: { index: number; damage: number }[]; handBlock: number; weight: number };
  /**
   * The card (by key) every line starts with: a random potion's Monte Carlo sample is "drink it now, then
   * the rest of the turn" (potion-mc.ts). Unset: any first play.
   */
  firstKey?: string;
}

export interface DrawPileCard {
  /** Can be played (to get rid of a status like Beckon) at all. */
  playable: boolean;
  /** Damage or HP lost at the end of the turn while it is held (Beckon 6, Burn 2); 0 for most cards. */
  heldPenalty: number;
  /** A block card (no damage): drawn on a turn with nothing incoming it is discarded unused. */
  block?: boolean;
  /** A Strike (its id has STRIKE): with Hellraiser up it plays itself when drawn, no energy needed. */
  strike?: boolean;
}

/** Expected later end-of-turn holds of a Wither added this turn (its future cost, score only). */
export const WITHER_FUTURE_REDRAWS = 1;

/** Self-damage weight multiplier on a quiet turn that ends near next turn's hit (JGJS F24 T1). */
export const QUIET_SELF_DAMAGE_WEIGHT = 3;
export const NEXT_HIT_MARGIN = 5;

/**
 * Turns left before a time limit ends the fight, this one included (the lowest timeLimit of a living
 * enemy: the Battleworn Dummy's 3, 2, 1), or null when there is none.
 */
export function turnsLeftOf(input: Pick<SolverInput, "enemies">): number | null {
  const limits = input.enemies.filter((enemy) => enemy.hp > 0 && (enemy.timeLimit ?? 0) > 0).map((enemy) => enemy.timeLimit!);
  return limits.length > 0 ? Math.min(...limits) : null;
}

/** No enemy attacks this turn. */
export function quietTurn(input: Pick<SolverInput, "enemies">): boolean {
  return input.enemies.every((enemy) => enemy.attacks.every((attack) => attack.damage * attack.hits <= 0));
}

export interface Step {
  cardIndex: number;
  cardId: string;
  /** Upgrade level of the planned card: Defend and Defend+ in one hand are different plays. */
  upgraded: boolean;
  /** Energy cost when planned: two copies can differ (Snecko Oil left a Strike at 3 and one at 0). */
  cost?: number;
  name: string;
  target: number | null;
  targetName: string | null;
  /** Gambler's Brew: the ids of the hand cards this play discards (the selection screen follows them). */
  discards?: string[];
  /** A pile-card potion (Liquid Memories): the pile card it takes into the hand (the selection screen takes it). */
  takes?: { cardId: string; upgraded: boolean };
  /** The card a pile-card potion took, played: the pile card's own id (the step's cardId is GEN:…). */
  pileCard?: { cardId: string; upgraded: boolean };
}

export interface Outcome {
  /** Every enemy dead by the end of this turn (a Waterfall Giant killed is not: explodesNext). */
  winsFight: boolean;
  /** Waterfall Giant killed this turn: its husk explodes for this much at the end of our next turn. */
  explodesNext?: number;
  /**
   * With explodesNext: HP after this turn plus the block that stays, less the blast (below 0: next turn's
   * hand must block the rest). The dominance axis of a Giant kill (vector).
   */
  eruptionMargin?: number;
  /**
   * HP the player loses to the enemy turn (plus self-damage this turn). A line saved by a revive counts all
   * our HP as lost, then what the revive's HP loses after it (the revive's HP is not ours): it never reads
   * cheaper than a line that lives without spending the revive. `hpAfter` is HP now less that (0 or below
   * then); `revived.hp` is the HP we really end with.
   */
  hpLoss: number;
  hpAfter: number;
  dies: boolean;
  /**
   * The line kills us during our own turn (a card's HP cost, Thorns past our block), before the enemy acts. Every line
   * dying, the least-loss pick prefers one that reaches the end of the turn, where SL can still reload.
   */
  diesOwnTurn?: true;
  /**
   * The revives this line spends (PlayerSim.revives): their names, their HP together, the HP we end the
   * turn with, and our own-turn HP loss before the enemy turn (the rollout's end-of-turn snapshot).
   */
  revived?: { names: string[]; sources: string[]; reviveHp: number; hp: number; ownLoss: number };
  blockGained: number;
  /** Damage that took HP off enemies, less what went into a Waterfall Giant husk (nothing to take off there). */
  damageDealt: number;
  kills: string[];
  /** Enemies taken to 0 HP that revive at once from Stock (Axebot): not kills. */
  restocked: string[];
  /** Enemies killed that spawn others on death ("Phrog Parasite: 4 x Wriggler"): the fight goes on. */
  spawns?: string[];
  /**
   * `block`: what the line leaves of the enemy's block (the rollout keeps a Burrowed enemy's). What the line
   * leaves of its once-a-fight and decaying powers (Artifact, Slippery, Curl Up, Flutter), and the Strength
   * it gained for good this turn (Fight Me!, Enrage, Crab Rage; a temporary loss is not in it): the rollout's
   * later turns go on from them.
   */
  enemyHpAfter: {
    index: number;
    name: string;
    hp: number;
    vulnerable: number;
    weak: number;
    /** Poison left after the observed immediate and enemy-turn triggers. */
    poison?: number;
    block?: number;
    artifact?: number;
    slippery?: number;
    curlUp?: number;
    flutter?: number;
    strengthGained?: number;
    /** Shrink turns left on it (Beetle Juice's 4: its attacks 30% less). */
    shrink?: number;
    /** Demise on it (Powdered Demise's 9): HP it loses at the end of each of its turns until it dies. */
    demise?: number;
    /** Stunned by the line (Ravenous eating a corpse, a learned strip-stun): its move this enemy turn is lost. */
    stunned?: boolean;
    /**
     * MECH_RULES: the learned strip-stun this line set off (EnemySim.stunOnStrip): the power stripped (id and game name)
     * and the attack this turn it cancels (the shown intents' total; 0 for a move without one, an Escape).
     */
    strippedStun?: { power: string; name: string; attack: number };
    /**
     * MECH_MOVE_RULES: the learned move change this line set off (EnemySim.moveOnStrip): the power and how it went, the
     * new move (id and game name) and its attack this turn (counted in hp_lost), the shown attack it replaces, and the
     * logged counts (an Axebot killed with Stock left: Boot Up, 0 for the 14 its Hammer Uppercut showed).
     */
    movedTo?: { power: string; name: string; how: "removed" | "lowered"; move: string; moveName: string; attack: number; before: number; n: number; changed: number };
    /**
     * MECH_DEATH_MOVE: the learned death rule this line set off (EnemySim.moveOnDeath): the ally killed (board index, game
     * name), the move it changes to at once (or null) with its attack this turn (in hp_lost) and the shown attack it
     * replaces, its next move (or null) with that move's attack as priced now, and the logged counts.
     */
    deathMove?: { ally: number; allyName: string; move: string | null; moveName: string | null; attack: number; before: number; next: string | null; nextName: string | null; nextAttack: number | null; nowCounts?: [number, number]; nextCounts?: [number, number] };
    /** A Waterfall Giant husk (999,999,999 max HP): its HP is not there to take off, it explodes. */
    husk?: boolean;
  }[];
  incomingAfterBlock: number;
  energyLeft: number;
  vulnerableApplied: number;
  weakApplied: number;
  strengthGained: number;
  cardsDrawn: number;
  unknownCards: string[];
  /** Sandpit count after the enemy turn (null when no enemy has one). */
  sandpitAfter: number | null;
  /** Imbalanced enemies whose attack this line fully blocks: stunned, they skip their next move. */
  stuns?: string[];
  /** The same enemies by index (the rollout stuns them for their next move). */
  stunIndexes?: number[];
  /** Their next hits, saved by the stun (0 when none). */
  stunSaved?: number;
  /** Buffer stacks this line's own HP losses use up (Breakthrough after a Lucky Tonic). */
  bufferSpentBySelf?: number;
  /** Enemies left at or below the start-of-turn damage (Mercury Hourglass): dead at our next turn start. */
  startTurnKills: string[];
  /** Withers this plan adds to the hand (Withering Presence). */
  withersAdded: number;
  /**
   * Status cards this line's turn adds to our piles: Dazed into the draw pile from hits on a Personal Hive
   * enemy, Wounds into the discard pile from unblocked Painful Stabs hits (the rollout adds them).
   */
  dazedAdded?: number;
  woundsAdded?: number;
  /**
   * Score lost to waking a sleeper with chip damage (its free turns, at HP weight); 0 when none. An
   * outcome axis too, so a waking line can never dominate one that lets it sleep (1K5G F17 T1).
   */
  sleepCost: number;
  /**
   * Lasting value set up this turn (powers such as Crimson Mantle, Stone Armor, Juggernaut). An axis,
   * so a line without them cannot dominate one that plays them (9NE1: 0-cost Mantle never played).
   */
  lasting: number;
  /** Block left over after the enemy turn's hits (block beyond incoming); 0 when the fight is won. */
  blockWasted?: number;
  /**
   * Cards this line's effects exhausted (Fiend Fire's hand, Burning Pact's pick, Second Wind …): the hand
   * card indices, the drawn cards among them, and random exhausts whose card is unknown. The rollout takes
   * them out of the piles for the rest of the fight (the played card with Exhaust goes by its keyword).
   */
  exhausted?: number[];
  drawnExhausted?: number;
  randomExhausts?: number;
  /** Damage a Thrash of this line absorbed (by hand index): the rollout adds it to that Thrash for its later plays. */
  thrashGrowth?: { index: number; amount: number }[];
  /** Damage added to every MAUL copy by the plays in this line, for the rollout's later turns. */
  maulGrowth?: number;
  /**
   * A Thrash (by hand index) that took one of several Attacks at random: the rollout picks it among the hand's
   * Attacks left unplayed and grows that Thrash by its shown damage plus `strength` (this turn's Strength gained
   * by then, Weak-scaled); `least` is the solver's own conservative growth (the least of them).
   */
  thrashRandom?: { index: number; strength: number; least: number }[];
  /**
   * Unrelenting's free Attack(s) not used this turn (FREE_ATTACK_POWER): they stay up into the next turn (logged
   * 21TKTPL5D4A6 F3: Unrelenting the last Attack of T2, T3 began with FREE_ATTACK_POWER 1 and its Strike cost 0).
   */
  freeAttacksLeft?: number;
  /** Attack plays this line makes (duplicates and replays each one; absent when none): Pen Nib's count goes on by them. */
  attackPlays?: number;
  /** Tuning Fork's persistent counter after this line, when the relic is modelled. */
  tuningForkCount?: number;
  /** Drinks in the line whose effect may outlast this turn (turnOnlyDrink): such a line is never "no effect". */
  lastingDrinks?: number;
  /**
   * The potions this line drinks, their cost in HP (potion-cost.ts: each one's held value in the potion table; absent
   * when 0: none drunk, a boss fight, no value). The score takes weights.hp x it off; effectiveLoss adds it to hpLoss.
   */
  potionCost?: number;
  /**
   * HP the potions this line drinks heal this turn (Blood Potion; absent when none): hpLoss is net of it. What the
   * line itself costs us is hpLoss + potionHeal (the saturated rollout ranking compares that: rollout-live turnLoss).
   */
  potionHeal?: number;
  /** Energy the next turn gets for this line's unspent energy (Pael's Tear), when it does; the rollout gives it. */
  nextTurnEnergy?: number;
  /**
   * Retaliation (Flame Barrier, Thorns) dealt back on the enemy turn, by attacker (enemy index): not in
   * enemyHpAfter (our turn's end); the rollout takes it off their HP.
   */
  retaliated?: { index: number; amount: number; slipperyUsed?: number }[];
  /** Self-Forming Clay's block at the start of the next turn (PlayerSim.clayBlock), when there is any. */
  clayBlockNext?: number;
  /**
   * What the turn's end brings against the enemy turn beyond the block up when the line ends, when any (the mod's
   * end-turn lethal flag counts the intents against the block up now only): block gained at the end (Plating and
   * Metallicize up, Plating played this turn, Feel No Pain on the Ethereal cards held, Cloak Clasp), Regen's heal
   * first, Buffer stacks. 86C3 F25 T5: 28 intents vs 28 HP, "mod says lethal"; Plating 2 made it 26.
   */
  endTurnGuards?: { what: string; amount: number }[];
  /**
   * Damage the cards held at the turn's end deal us (Burn, Withers), when any: blockable, it meets the block before
   * the enemy hits and is part of incomingAfterBlock.
   */
  heldDamage?: number;
  /** With heldDamage: the cards it comes from, by name ("毒素 ×2", "Wither added by this turn's cards"). */
  heldDamageFrom?: string[];
  /**
   * HP the cards held at the turn's end take straight off (Beckon), when any: no block meets it, so it is not in
   * incomingAfterBlock but is in hpLoss (5HHL F17 T7: "37 in all, 25 the enemy hits", the 12 two Beckons unnamed).
   */
  heldHpLoss?: number;
  /** With heldHpLoss: the cards it comes from, by name ("呼唤 ×2"). */
  heldHpLossFrom?: string[];
}

export interface Plan {
  steps: Step[];
  outcome: Outcome;
  score: number;
}

interface Sim {
  pendingSelection?: boolean;
  hand: CardModel[];
  energy: number;
  hp: number;
  block: number;
  strength: number; // gained this turn (permanent + temporary)
  permStrength: number;
  hpLostThisTurn: boolean;
  /** Red Skull's Strength is on (HP at or below half): part of `strength` when it came on this turn. */
  skullUp: boolean;
  /** HP losses on our turn so far (Self-Forming Clay's block per loss). */
  hpLossEvents: number;
  enemies: (EnemySim & { alive: boolean; newlyWeak: boolean; newlyShrunk?: boolean; strengthDelta: number; lostThisTurn: number; tempStrengthLoss?: number; sleepLost?: number; skittishHit?: boolean; ravenousStunned?: boolean })[];
  /** Shrink still on us (PlayerSim.shrunk): gone once the last enemy that shrinksUs dies, for the cards played after. */
  shrunk: boolean;
  steps: Step[];
  blockGained: number;
  damageDealt: number;
  vulnerableApplied: number;
  weakApplied: number;
  flat: number;
  /** Dexterity gained this turn (Speed Potion): added to every block card played after it. */
  tempDex: number;
  /** Shadowmeld newly played within this line; never carried into a later turn. */
  shadowmeld: boolean;
  corrosiveWave: number;
  envenom: number;
  phantomBlades: number;
  phantomBladesSpent: boolean;
  /** Intangible gained this turn (Apparition): every enemy hit this turn does 1. */
  intangible: boolean;
  /** Buffer stacks up (already up plus gained this turn): each negates one HP loss, ours or an enemy hit. */
  buffer: number;
  /** Buffer stacks used up by our own HP losses this turn (Breakthrough, Offering). */
  bufferSpent: number;
  /** Duplication: the next card played resolves twice. */
  duplicate: number;
  /** One-Two Punch: the next N Attacks played resolve twice. */
  duplicateAttacks: number;
  /** Burst: pending Skill replays for this turn only. */
  duplicateSkills: number;
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
  /** Each card drawn this turn, valued with and without an energy left at the end to use it. */
  draws: DrawValue[];
  cardsDrawn: number;
  /**
   * Of the cards drawn this turn, those still in the hand (not exhausted since): a hand-counting card
   * (Fiend Fire) counts them. 9VG8 F35 T6: Offering+ drew 5, Fiend Fire+ counted 4 hits, not 9 (99, a kill).
   */
  drawnInHand: number;
  /** Regen up at the end of this turn (already up plus drunk now): healed before the enemy attacks. */
  regen: number;
  /** Soldier's Stew: extra plays of every Strike card from now on this turn. */
  strikeReplay: number;
  /** Throwing Axe: the next card played is the fight's first, played once more (PlayerSim.firstCardReplay). */
  axeReplay: boolean;
  /** Plating gained this turn (Stone Armor, a Plating potion: Heart of Iron). */
  plating: number;
  unknown: string[];
  feedKills: number;
  /** Dazed our hits put into the draw pile this turn (Personal Hive). */
  dazedAdded: number;
  /** Frantic Escapes played this turn (each +1 Sandpit). */
  escapes: number;
  /** Crimson Mantles played this turn (each costs 1 HP at the start of every later turn). */
  mantles: number;
  /** A Crab Rage survivor was enraged this turn. */
  enraged: number;
  /** Tainted gained this turn (Vital Spark): +1 per stack to every enemy attack hit. Tainted already up is in the intents. */
  tainted: number;
  /** Inferno amount active (already up plus played this turn). */
  inferno: number;
  /** Infernos played this turn (each loses 1 HP at the start of every later turn, as Crimson Mantle's `mantles`). */
  infernos: number;
  feelNoPain: number;
  afterImage: number;
  poisonExtraTriggers: number;
  /** Hellraiser up (already, or played this turn): drawn Strikes play themselves. */
  hellraiser: boolean;
  /** Dark Embrace amount up (already, or played this turn): cards drawn per card exhausted. */
  darkEmbrace: number;
  /** Drinks in this line whose effect may outlast the turn (turnOnlyDrink false). */
  lastingDrinks: number;
  /** The drunk potions' cost in HP (card.potionCost). */
  potionCost: number;
  /** HP the drunk potions healed this turn (Blood Potion), never past max HP. */
  potionHeal: number;
  /** Unmovable's doubling used by a Block card in this plan. */
  unmovableSpent: boolean;
  /**
   * Attacks played in this plan, a card once (Stomp costs 1 less for each). A Strike Hellraiser plays when drawn counts:
   * the game's attacks_played_this_turn leaves those out, Stomp's cost does not (logged turn starts with Hellraiser up
   * and nothing played yet, 5 runs: Stomp 3 -> 2 on each of the 8 turns one Strike was drawn, 3 on the 4 with none).
   */
  attacksPlayed: number;
  /** Plays of Attacks for the attack-counting relics (Kusarigama, Shuriken): every duplicate and replay too. */
  relicAttacks: number;
  /** Skills played in this plan (Smoggy's cap). */
  skillsPlayed: number;
  /** PASSIVE_PIECES, with Letter Opener only (else 0): plays of Skills for it, every duplicate and replay too. */
  relicSkills: number;
  /** Free attacks left this turn (Unrelenting). */
  freeAttacks: number;
  /** Delayed damage to every enemy played this turn (The Bomb: 40 after 3 turns). */
  bombs: number;
  /** Inside one hit that lands on every enemy: deaths trigger Crab Rage after the whole hit. */
  sweeping?: boolean;
  pendingRage?: boolean;
  /** Gigantification: the next Attack played deals triple damage. */
  gigantic: number;
  /** Expected value of one card drawn from the known pile (null: pile unknown, flat values). */
  pile: PileValue | null;
  /** Cards drawn from that pile so far this turn (past its size the draws are a reshuffle: flat values). */
  pileDrawn: number;
  /** SolverInput.knownTop: the pile's top cards in draw order, taken by the draws before any expected one (null: none). */
  known: CardModel[] | null;
  /** With SolverInput.knownTop: this line drew past the known cards (an expected-value draw). Absent otherwise. */
  drewUnknown?: true;
  /**
   * Cards exhausted from the hand by this turn's plays (Burning Pact's pick, Stoke's whole hand): their
   * value is lost for the fight (6A36 F3: six Burning Pacts took the Strikes and Defends for free).
   */
  exhausted: CardModel[];
  /** Cards drawn this turn that an exhaust effect took afterwards (Fiend Fire, Glowwater): not discarded. */
  drawnExhausted: number;
  /** Random exhausts from the hand (plain True Grit): which card went is unknown. */
  randomExhausts: number;
  /** Damage each Thrash played this turn absorbed (by hand index): added to that Thrash for the fight. */
  thrashGrowth: { index: number; amount: number }[];
  maulGrowth: number;
  thrashRandom: { index: number; strength: number; least: number }[];
  /** Cards exhausted this turn so far, before this decision included (Evil Eye doubles its Block after one). */
  exhaustedCount: number;
  /** Unplayable cards still in hand (Wound, Beckon): held at the end of the turn unless exhausted. */
  held: CardModel[];
  /** Skills present when this hand was observed; no inferred counts for later unknown draws. */
  observedSkillKeys?: readonly string[];
  /** CARD_CONDITIONS: Rage played in this line (CardModel.rageBlock): Block for every Attack played after it, beside PlayerSim.rage. */
  rage: number;
  /** Soulbound cards Chains of Binding locked this line: out of the sim's hand, still in the game's (CARD_CONDITIONS' hand checks). */
  locked: CardModel[];
  /** A card was put on top of the draw pile this turn (Headbutt): the next draw would take it back. */
  topPlaced: boolean;
  /** Vigor not yet spent: added to the next Attack's first hit. */
  vigor: number;
  /** Cards give no Block (NO_BLOCK_POWER already up, or Panic Button played this turn). */
  noBlock: boolean;
}

/** A known pile's expected value per card drawn, with a spare energy to use it and without. */
interface PileValue {
  size: number;
  withEnergy: number;
  withoutEnergy: number;
  /** Share of the pile that is Strikes (Hellraiser plays them when drawn, energy or not). */
  strikeShare: number;
}

/** Value of one card drawn with energy left to play it (without a known pile). */
export const DRAW_VALUE = 3;
/** Value of one card drawn with no energy left for it (unknown pile): only the choice it adds. */
export const DRAW_IDLE_VALUE = 1;

interface DrawValue {
  withEnergy: number;
  withoutEnergy: number;
}

/**
 * Per-card draw value of a known pile. A normal card is worth DRAW_VALUE with a spare energy and
 * nothing without one (it cannot be played this turn). A status that hurts while held costs its
 * penalty at HP weight, unless a spare energy plays it away (then it costs that energy: at most
 * DRAW_VALUE); an unplayable one always costs its penalty.
 */
export function pileValue(pile: DrawPileCard[] | undefined, hpWeight: number, blockIsIdle = false): PileValue | null {
  if (!pile || pile.length === 0) return null;
  let withEnergy = 0;
  let withoutEnergy = 0;
  for (const card of pile) {
    const penalty = card.heldPenalty * hpWeight;
    if (penalty > 0) {
      withEnergy -= card.playable ? Math.min(DRAW_VALUE, penalty) : penalty;
      withoutEnergy -= penalty;
    } else if (blockIsIdle && card.block) {
      // Nothing to block this turn (and block does not carry over): the drawn Defend is discarded.
    } else if (card.playable) {
      withEnergy += DRAW_VALUE;
    }
  }
  const strikes = pile.filter((card) => card.strike && card.playable && !(card.heldPenalty > 0)).length;
  return { size: pile.length, withEnergy: withEnergy / pile.length, withoutEnergy: withoutEnergy / pile.length, strikeShare: strikes / pile.length };
}

/** One card drawn now: the known pile's expected value (flat values past it or without one). */
function drawOne(sim: Sim): DrawValue {
  const pile = sim.pile;
  if (!pile || sim.pileDrawn >= pile.size) return { withEnergy: DRAW_VALUE, withoutEnergy: DRAW_IDLE_VALUE };
  sim.pileDrawn += 1;
  // Hellraiser: a Strike drawn plays itself (no energy), so it is worth a played card without spare energy too.
  const hellraised = sim.hellraiser ? pile.strikeShare * DRAW_VALUE : 0;
  return { withEnergy: pile.withEnergy, withoutEnergy: Math.min(DRAW_IDLE_VALUE, pile.withoutEnergy) + hellraised };
}

/**
 * Draw value at the end of the plan: only the energy still unspent can use what was drawn, one per
 * card, earlier draws first. The energy a draw "reserved" at the time is often spent by later plays
 * (6A36 F3: "Burning Pact, Defend, Defend" at 3 energy scored +6 for two draws it could not play and
 * beat "Strike, Defend, Defend"); the rest are worth DRAW_IDLE_VALUE at most (or their penalty).
 */
export function drawScoreAt(draws: DrawValue[], energyLeft: number): number {
  let spare = Math.max(0, energyLeft);
  let score = 0;
  for (const draw of draws) {
    const use = Math.min(1, spare);
    spare -= use;
    score += use * draw.withEnergy + (1 - use) * draw.withoutEnergy;
  }
  return score;
}

/**
 * Cards that exhaust a card of our choosing from the hand (upgraded True Grit; unupgraded is random).
 * Brand too (K39J F23 T2, F25 T1: it exhausted a card the plan still meant to play).
 */
export const EXHAUST_PICKERS = new Set(["BURNING_PACT", "TRUE_GRIT", "BRAND"]);
/** Exhaust ranking value of Howl from Beyond (negative exhaustValue: taken before junk). */
export const HOWL_EXHAUST_VALUE = 50;
/** Cards that exhaust the whole rest of the hand (Stoke: a random card for each). */
export const EXHAUST_HAND = new Set(["STOKE", "FIEND_FIRE"]);
/** Cards a hand can hold: draws past it are discarded. */
export const HAND_LIMIT = 10;
/** Stable Serum: the turn ends whose hand is kept, the drink's own included (RETAIN_HAND_POWER 2). */
export const STABLE_SERUM_TURNS = 2;
/** Cards Glowwater draws after exhausting the hand (up to the hand limit and the piles). */
export const GLOWWATER_DRAW = 10;
/** Bottled Potential: cards drawn after the hand is shuffled back (potion-values.ts Cards 5). */
export const BOTTLED_DRAW = 5;

/** Status/Curse: exhausting it is free (better: its held penalty goes with it). */
function isJunk(card: CardModel): boolean {
  return card.type === "Status" || card.type === "Curse";
}

/**
 * What exhausting a card costs, at the scoring weights: its damage or block this turn, its lasting
 * value, or its draws, whichever is most, and at least DRAW_IDLE_VALUE. Junk costs minus its penalty.
 */
export function exhaustValue(card: CardModel, weights: Weights): number {
  if (isJunk(card)) return -(card.heldPenalty ?? 0) * weights.hp;
  // Howl from Beyond in the exhaust pile plays itself at the end of the turn (a free hit to every enemy,
  // counted in evaluate) and then goes to the discard pile, not lost: exhausting it is a gain, the first
  // card any exhaust takes (SVN2 F17: in hand on 5 boss turns, never exhausted).
  if (card.cardId === "HOWL_FROM_BEYOND") return -HOWL_EXHAUST_VALUE;
  const damage = (card.damage ?? 0) * Math.max(1, card.hits) * weights.damage;
  const block = card.block * weights.hp * 0.5;
  const debuffs = weights.vulnerable * card.vulnerable + weights.weak * card.weak;
  const lasting = weights.strength * card.strength + card.flatValue;
  return Math.max(DRAW_IDLE_VALUE, damage + debuffs, block, lasting, DRAW_VALUE * card.draw);
}

/**
 * The card an exhaust picker takes: junk first, then the least valuable (what selection.ts picks).
 * With a Sandpit up, Frantic Escape is never taken (THMG F33 T4: Burning Pact exhausted it as junk),
 * unless it is the only card left (the game forces the pick; selection.ts scores it last too).
 */
/** Weights for ranking cards to exhaust (a fight-length view, not this turn's). */
const EXHAUST_WEIGHTS = { hp: 1, damage: 0.45, killBase: 0, killPerIncoming: 0, vulnerable: 2.5, weak: 1.5, strength: 5 };

export function exhaustPick(cards: CardModel[], sandpit = false): CardModel | null {
  const weights = EXHAUST_WEIGHTS;
  let best: CardModel | null = null;
  for (const card of cards) {
    if (card.type === "Potion") continue;
    if (sandpit && card.cardId === "FRANTIC_ESCAPE") continue;
    if (!best || exhaustValue(card, weights) < exhaustValue(best, weights)) best = card;
  }
  return best ?? (sandpit ? cards.find((card) => card.cardId === "FRANTIC_ESCAPE") ?? null : null);
}

/** Gambler's Brew: hand cards past this many, the weakest by thisTurnScore, are the ones it may discard. */
const GAMBLE_MAX_CARDS = 6;

/**
 * The ways to drink Gambler's Brew now: one per non-empty set of hand cards to discard (the weakest
 * GAMBLE_MAX_CARDS by thisTurnScore when the hand is bigger), each as its own potion play.
 */
function gambleWays(sim: Sim, brew: CardModel): CardModel[] {
  const enemies = Math.max(1, sim.enemies.filter((enemy) => enemy.alive).length);
  const cards = sim.hand
    .filter((entry) => entry.type !== "Potion")
    .sort((a, b) => thisTurnScore(a, 0, enemies) - thisTurnScore(b, 0, enemies))
    .slice(0, GAMBLE_MAX_CARDS);
  const ways: CardModel[] = [];
  for (let mask = 1; mask < 1 << cards.length; mask += 1) ways.push({ ...brew, discards: cards.filter((_, bit) => mask & (1 << bit)).map((entry) => entry.key) });
  return ways;
}

/** Only the observed plain Hidden Daggers; upgrades and transformations keep their existing model. */
function hiddenDaggers(card: CardModel): boolean {
  return card.cardId === "HIDDEN_DAGGERS" && !card.upgraded && card.discardCount === 2;
}

/** Every pair is a reference outcome; the live discard selection remains Jev's decision. */
function hiddenDaggerWays(sim: Sim, card: CardModel): CardModel[] {
  const cards = [...sim.hand, ...sim.held, ...sim.locked].filter((entry) => entry !== card && entry.type !== "Potion");
  const ways: CardModel[] = [];
  for (let i = 0; i < cards.length; i += 1) {
    for (let j = i + 1; j < cards.length; j += 1) ways.push({ ...card, discards: [cards[i]!.key, cards[j]!.key] });
  }
  // Short hands and absent Shiv metadata have no verified continuation; still offer the card itself.
  return ways.length > 0 ? ways : [card];
}

/**
 * The ways to drink a card-choice potion (one Monte Carlo sample of its offer): one per card offered, that
 * card taken into the hand (free this turn), the step named for it.
 */
function choiceWays(potion: CardModel): CardModel[] {
  return (potion.choices ?? []).map((card) => {
    const { choices: _offer, ...rest } = potion;
    return { ...rest, generates: card, name: `${potion.name} (take ${card.name})` };
  });
}

/** Blood Potion: heals this share of max HP (card-model POTION_EFFECTS). */
export const BLOOD_POTION_HEAL = 0.2;
/**
 * Regen's heals after this turn ((n-1) + ... + 1 for Regen n), counted at this share: the fight may end
 * first, and HP near max takes less.
 */
export const REGEN_LATER_SHARE = 0.5;

/**
 * HP the player loses on their own turn (a card's cost, Reflect, and what gets past block of Thorns and a card's damage
 * to us: damagePlayer). Demon Tongue heals the first loss of the turn back (TQX5 T1: Offering+ with 0 energy was "end
 * turn, -9"; played, it costs nothing and gives 2 energy for a Defend). Only a real loss comes here, so only it sets off
 * Rupture, Inferno, Demon Tongue and Red Skull.
 */
function loseHp(sim: Sim, amount: number, player: PlayerSim): boolean {
  if (amount <= 0) return false;
  // Buffer prevents the loss (and uses a stack), before anything that triggers on losing HP.
  if (sim.buffer > 0) {
    sim.buffer -= 1;
    sim.bufferSpent += 1;
    return false;
  }
  if (!(player.demonTongue && !sim.hpLostThisTurn)) sim.hp -= amount;
  sim.hpLostThisTurn = true;
  sim.hpLossEvents += 1;
  redSkullCheck(sim, player);
  // Rupture (「每当你在自身回合失去生命时，获得1点力量」): every HP loss on our turn, not only a card's own cost. Logged:
  // Thorns past block, R6V3T4KSDABE F31 T2 (Rupture 1, block 0): Breakthrough's 1 and the Toad's 5 took Strength 0 -> 2,
  // the next two Thorns hits 2 -> 3 -> 4; Galvanic's 6, XSPHCB4GUSEU F38 T4 (Rupture 1): Inflame's +3 came out +4. The
  // solver had it on a card's own HP cost only.
  if (sim.rupture > 0) {
    sim.strength += sim.rupture;
    sim.permStrength += sim.rupture;
  }
  // Inferno: every HP loss on our turn hits every enemy (9XZX: "每当你在你的回合内失去生命时，对所有
  // 敌人造成6点伤害"). One sweep: two crabs dying to it die together.
  if (sim.inferno > 0) {
    const outer = sim.sweeping === true;
    sim.sweeping = true;
    for (const enemy of sim.enemies) if (enemy.alive) hitEnemyRaw(sim, enemy, sim.inferno);
    sim.sweeping = outer;
    if (!outer && sim.pendingRage) {
      sim.pendingRage = false;
      crabRage(sim);
    }
  }
  return true;
}

/**
 * Red Skull: its Strength comes on when HP is at or below half of max and goes off above it (logged over 16 runs
 * holding it: +3 at every crossing down, 43 of 48 without another Strength change; -3 on a heal back above half;
 * exactly half, 40/80, counts as on). This turn's Strength only: the rollout re-reads it from HP each turn.
 */
function redSkullCheck(sim: Sim, player: PlayerSim): void {
  const skull = player.redSkull ?? 0;
  if (skull <= 0) return;
  const low = sim.hp * 2 <= player.maxHp;
  if (low === sim.skullUp) return;
  sim.skullUp = low;
  sim.strength += low ? skull : -skull;
}

/**
 * One debuff application: Artifact negates it and loses a stack, whatever the debuff (TQX5 T1:
 * Powdered Demise into Artifact 3 did nothing). Returns the amount that landed.
 */
function applyDebuff(enemy: Sim["enemies"][number], kind: "vulnerable" | "weak" | "strengthLoss" | "tempStrengthLoss" | "demise" | "shrink" | "poison", amount: number): number {
  if (amount <= 0) return 0;
  if (enemy.artifact > 0) {
    enemy.artifact -= 1;
    return 0;
  }
  if (kind === "vulnerable") enemy.vulnerable += amount;
  else if (kind === "strengthLoss") enemy.strengthDelta -= amount;
  else if (kind === "poison") enemy.poison = (enemy.poison ?? 0) + amount;
  else if (kind === "weak") {
    if (enemy.weak === 0) enemy.newlyWeak = true;
    enemy.weak += amount;
  } else if (kind === "shrink") {
    if ((enemy.shrink ?? 0) === 0) enemy.newlyShrunk = true;
    enemy.shrink = (enemy.shrink ?? 0) + amount;
  } else if (kind === "tempStrengthLoss") enemy.tempStrengthLoss = (enemy.tempStrengthLoss ?? 0) + amount;
  else enemy.demise = (enemy.demise ?? 0) + amount;
  return amount;
}

/**
 * An attack card's damage per hit while our Shrink is in play (on us now, or in the card's shown number), unrounded, with
 * this turn's Strength (sim.strength): null when it is not (no Shrink: the caller's own number), or for a potion (not an
 * attack). From the card's printed base when that gives back its shown number (base + Strength at the decision, Weak
 * and Shrink as shown), so the game's one rounding is kept; `pre` is that number before Weak and Shrink (the caller adds
 * Vigor or Bully's bonus to it). Otherwise from the shown number: shrunk once when it is not and we are, un-shrunk
 * (the least whole number that shrinks to it) when it is and we no longer are (the beetle killed earlier in the line).
 * XC4TNGZU4KT9 F9 T3: Setup Strike's +3 then Fight Me (5, shown 3) hit 2 x floor(8 x 0.7) = 2 x 5, not 2 x (3 + 3).
 */
function attackShrunk(card: CardModel, sim: Sim, player: PlayerSim): { perHit: number; pre: number | null } | null {
  const carried = card.shownShrunk === true;
  if (card.type === "Potion" || (!sim.shrunk && !carried)) return null;
  const shown = card.damage ?? 0;
  const strengthNow = player.strengthNow ?? 0;
  if (card.damageBase !== undefined && card.special !== "body_slam" && Math.floor(ourAttackScaled(card.damageBase + strengthNow, player.weak, carried)) === shown) {
    const pre = card.damageBase + strengthNow;
    return { perHit: ourAttackScaled(pre + sim.strength, player.weak, sim.shrunk), pre };
  }
  const now = carried === sim.shrunk ? shown : carried ? Math.ceil((shown * 10) / 7) : (shown * 7) / 10;
  return { perHit: now + ourAttackScaled(sim.strength, player.weak, sim.shrunk), pre: null };
}

function hitEnemy(sim: Sim, enemy: Sim["enemies"][number], perHitBase: number, hits: number, player: PlayerSim, potion = false, attack = false): number {
  let dealt = 0;
  for (let hit = 0; hit < hits && enemy.alive; hit += 1) {
    // Our Shrink is in perHitBase already (attackShrunk), unrounded: rounded once with Vulnerable, as the game does.
    let amount = perHitBase;
    // Potion damage ignores Vulnerable (6X8F F25 T1: Fire Potion into a Vulnerable Entomancer did 20).
    if (enemy.vulnerable > 0 && !potion) amount = Math.floor(amount * (player.vulnerableFactor ?? 1.5));
    // Slow: +10% per card played before this one (sim.played is bumped once the card has resolved).
    if (enemy.slow) amount = Math.floor(amount * (1 + 0.1 * sim.played));
    if ((enemy.flutter ?? 0) > 0) {
      amount = Math.floor(amount * 0.5);
      enemy.flutter = (enemy.flutter ?? 0) - 1;
    }
    if (enemy.unmodelled) amount = Math.floor(amount * 0.8);
    if (enemy.halved) amount = Math.floor(amount * 0.5);
    amount = Math.floor(amount);
    if (enemy.perHitCap !== null && enemy.perHitCap !== undefined) amount = Math.min(amount, enemy.perHitCap);
    if (enemy.intangible) amount = Math.min(amount, 1);
    amount = Math.max(0, amount);
    if ((enemy.skittish ?? 0) > 0 && amount > 0) enemy.skittishHit = true;
    sim.dazedAdded += enemy.dazedPerHit ?? 0;
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
    // F9PP859XZ3RJ F37 T2/T5: each unblocked attack adds one, alongside direct card poison.
    // Skills, potions, retaliation and poison damage do not trigger this attack-only power.
    if (attack && loss > 0 && enemy.hp > 0 && sim.envenom > 0) applyDebuff(enemy, "poison", sim.envenom);
    if (loss > 0) wake(enemy);
    // Thorns (Spiny Toad, Toadpole: 「当被攻击命中时，反击造成伤害」) is damage: our block takes it first, Intangible caps it
    // at 1, only the rest is HP lost (and only that sets off Rupture, Inferno, Demon Tongue). Logged (thorns2.py), one
    // Thorns enemy hit between two decision frames with block up: 65 of 66 took it from block first (59 HP unchanged:
    // 24HMNKB4N32V F25 T2 Thorns 5, block 5 -> 0, HP 91 -> 91; 5 more past the block into HP); the other gained block from the
    // same card. With Inferno up and the Thorns blocked, Inferno did not fire (JR66CJ9T8H7W F29 T2 block 16 -> 11, the
    // Toad 90 -> 79, the Strike's 11 only; XMY29WWQDC1Y F22 T2). The solver took it straight off HP.
    if ((enemy.thorns ?? 0) > 0) damagePlayer(sim, enemy.thorns ?? 0, player);
    if (amount > 0 && (enemy.curlUp ?? 0) > 0) {
      enemy.block += enemy.curlUp ?? 0;
      enemy.curlUp = 0;
    }
    if (enemy.hp <= 0) killEnemy(sim, enemy);
  }
  sim.damageDealt += dealt;
  return dealt;
}

/**
 * HP damage on a sleeper: its free (non-attacking) turns lost. Asleep N means it skips N more enemy
 * turns (5FMU F17: Asleep 3/2/1 on T1–T3, first attack on T4); woken now, it is stunned this enemy
 * turn and attacks the next, so it loses N − 1 of them — none on its last sleep turn (Asleep 1),
 * where waking it costs nothing (5FMU F17 T3: 3 energy idled on Asleep 1).
 */
function wake(enemy: Sim["enemies"][number]): void {
  if ((enemy.asleep ?? 0) > 0) {
    enemy.sleepLost = (enemy.sleepLost ?? 0) + Math.max(0, (enemy.asleep ?? 0) - 1);
    enemy.asleep = 0;
  } else if ((enemy.slumber ?? 0) > 0) {
    enemy.sleepLost = (enemy.sleepLost ?? 0) + 1;
    enemy.slumber = (enemy.slumber ?? 0) - 1;
  }
}

/** Crab Rage: an ally's death gives the survivor 99 Block and Strength (text says 5; 7Q5G F33 measured 8 -> 14). */
export const CRAB_RAGE_BLOCK = 99;
/** Intimidating Helmet triggers on cards that cost at least this much as paid. */
export const HELMET_MIN_COST = 2;
/** Pen Nib: every this many-th Attack played deals double damage (「你每打出的第10张攻击牌将会造成双倍伤害」). */
export const PEN_NIB_EVERY = 10;
/** Lasting value per energy of a card made free for the fight (Touch of Insanity), before fight length. */
export const FREE_CARD_LASTING = 2;
export const CRAB_RAGE_STRENGTH = 6;

function killEnemy(sim: Sim, enemy: Sim["enemies"][number]): void {
  enemy.alive = false;
  // The Shrinker Beetle dead, our Shrink goes with it: the cards played after this one hit in full (a card's own hits
  // keep the number it had when played: TYZH5GB5N2UL F15 T3, Breakthrough killed the beetle and hit the Wurm for 8, shrunk).
  if (enemy.shrinksUs && sim.shrunk && !sim.enemies.some((other) => other.alive && other.shrinksUs)) sim.shrunk = false;
  // Ravenous (Corpse Slug): a living one eats the corpse: stunned this turn, +N Strength for the fight.
  for (const other of sim.enemies) {
    if (other === enemy || !other.alive || (other.ravenous ?? 0) <= 0) continue;
    other.ravenousStunned = true;
    other.strengthDelta += other.ravenous ?? 0;
  }
  // A hit that lands on every enemy at once kills both crabs together (no rage in between).
  if (sim.sweeping) sim.pendingRage = true;
  else crabRage(sim);
}

/** Y6GM2CHWJBEY F17 T7 / T082DRCUHRRD F33 T4: each poison trigger loses one stack. */
function triggerPoison(sim: Sim, enemy: Sim["enemies"][number], triggers: number, observedCap = Infinity): void {
  for (let k = 0; k < triggers && enemy.alive && (enemy.poison ?? 0) > 0; k += 1) {
    // T082DRCUHRRD F48 attempt 6 T10: three poison triggers into Intangible lose only three HP.
    const lost = Math.min(enemy.hp, enemy.intangible ? 1 : enemy.poison ?? 0, observedCap);
    enemy.hp -= lost;
    enemy.poison = Math.max(0, (enemy.poison ?? 0) - 1);
    sim.damageDealt += lost;
    if (enemy.hp <= 0) killEnemy(sim, enemy);
  }
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

/** A "play me first" card (Enthralled) is in the hand, playable or held: every other card waits for it. */
function playFirstHeld(sim: Pick<Sim, "hand" | "held">): boolean {
  return sim.hand.some((entry) => entry.playFirst === true && entry.type !== "Potion") || sim.held.some((entry) => entry.playFirst === true && entry.type !== "Potion");
}

/**
 * CARD_CONDITIONS (card-model handCondition): whether the hand meets a card's condition as it is played, the card itself
 * aside: "empty", no other card in it (unplayable ones and Soulbound ones Chains of Binding locked count, potions do not);
 * "noAttack", no Attack in it. A card drawn as an expected value (sim.drawnInHand: drawn, still held, which one unknown)
 * is in the hand and could be anything: neither condition counts as met while one is held.
 */
function handConditionMet(sim: Pick<Sim, "hand" | "held" | "locked" | "drawnInHand">, card: CardModel, condition: NonNullable<CardModel["handCondition"]>): boolean {
  if (sim.drawnInHand > 0) return false;
  const others = [...sim.hand, ...sim.held, ...sim.locked].filter((entry) => entry !== card && entry.type !== "Potion");
  return condition === "empty" ? others.length === 0 : !others.some((entry) => entry.type === "Attack");
}

/** A hand-conditional card whose condition is unmet: played for nothing it draws or gains. */
function unconditioned(card: CardModel): CardModel {
  const { drawn: _drawn, ...rest } = card;
  return { ...rest, draw: 0, energyGain: 0, drawsUntil: false };
}

/** Plays one card (with a chosen target) on a copy of the sim. Returns null if it is not legal. */
function play(sim: Sim, card: CardModel, target: number | null, player: PlayerSim): Sim | null {
  if (sim.pendingSelection) return null;
  // Stomp: 1 less per Attack played earlier in this plan (8XQM F48 T8: Pommel Strike+ and Strike
  // first make it cost 1; played first at 3, the lethal line was never found).
  const cost =
    card.type === "Attack" && sim.freeAttacks > 0 && !card.xCost
      ? 0
      : card.xCost ? sim.energy : card.special === "stomp" ? Math.max(0, card.cost - sim.attacksPlayed) : card.cost;
  if (cost > sim.energy) return null;
  // Enthralled (card-model playFirst): while one is in the hand, no other card can be played; a potion can (HYQW47E7CBSC
  // F38 T4: the cards it locked were left out, end turn the only line at 5 energy, 13 HP lost).
  if (card.type !== "Potion" && card.playFirst !== true && playFirstHeld(sim)) return null;
  // Touch of Insanity: only with a card worth making free (YP9 T1: drunk with only 0-cost cards left).
  if (card.special === "free_card" && !freeCardPick(sim.hand)) return null;
  // Ashwater with nothing worth exhausting does nothing (H14T: wasted four times with "selected 0/0").
  if (card.special === "ashwater" && ![...sim.hand, ...sim.held].some((entry) => entry !== card && entry.type !== "Potion" && (entry.cardId === "HOWL_FROM_BEYOND" || isJunk(entry)))) return null;
  // After Headbutt the next draw is the card it put on top, taken back into hand this turn (XPA4 T11:
  // Shrug It Off+ kept for a 24-damage turn was drawn by Pommel Strike and discarded unplayed). Which
  // card goes on top is chosen later, so no plan draws after one; drawing first, then Headbutt, is fine.
  // CARD_CONDITIONS: a card whose draw waits on the hand (Restlessness) draws only when the rest of the hand meets it.
  if (sim.topPlaced && (card.draw > 0 || card.drawsUntil || card.drawDiscardedHand) && (card.handCondition === undefined || handConditionMet(sim, card, card.handCondition))) return null;
  const next = clone(sim);
  // A Gambler's Brew way (or a card-choice potion's pick) is a copy of the belt's potion: the potion
  // leaves the hand by its key.
  const hidden = hiddenDaggers(card);
  next.hand = sim.hand.filter((entry) => entry !== card && !((card.type === "Potion" || hidden) && entry.key === card.key));
  const discardPool = hidden ? [...next.hand, ...next.held, ...next.locked] : sim.hand;
  const discarded = card.discards ? discardPool.filter((entry) => card.discards!.includes(entry.key)).map((entry) => entry.cardId) : [];
  if (hidden) {
    if (!card.adds || new Set(card.discards).size !== 2 || discarded.length !== 2) {
      next.pendingSelection = true;
      next.unknown = [...next.unknown, `${card.name}（弃牌或生成牌未验证）`];
    } else {
      const leaves = new Set(card.discards);
      next.hand = next.hand.filter((entry) => !leaves.has(entry.key));
      next.held = next.held.filter((entry) => !leaves.has(entry.key));
      next.locked = next.locked.filter((entry) => !leaves.has(entry.key));
    }
  }
  let redraw = 0;
  if (card.discardsHand) {
    discarded.push(...[...next.hand, ...next.held, ...next.locked].filter((entry) => entry.type !== "Potion").map((entry) => entry.cardId));
    if (card.drawDiscardedHand) redraw = discarded.length + next.drawnInHand;
    next.hand = next.hand.filter((entry) => entry.type === "Potion");
    next.held = [];
    next.locked = [];
    next.drawnInHand = 0;
  }
  // Chains of Binding: playing one Soulbound card locks the others for the turn (88HN T5: Bash+ then
  // Flame Barrier in one plan; the Barrier was locked, 7 block against 24).
  if (card.soulbound) {
    // Locked, they are still in the hand (CARD_CONDITIONS: Restlessness's "hand is empty" sees them).
    const locked = next.hand.filter((entry) => entry.soulbound && entry.type !== "Potion");
    next.hand = next.hand.filter((entry) => !entry.soulbound);
    if (locked.length > 0) next.locked = [...next.locked, ...locked];
  }
  next.energy -= cost;
  if ((player.helmetBlock ?? 0) > 0 && card.type !== "Potion" && cost >= HELMET_MIN_COST) gainBlock(next, player.helmetBlock ?? 0, player);
  if (card.target === "single" && !next.enemies.some((enemy) => enemy.index === target && enemy.alive)) return null;
  const twice = card.type !== "Potion" && next.duplicate > 0;
  if (twice) next.duplicate -= 1;
  const twiceAttack = card.type === "Attack" && next.duplicateAttacks > 0;
  if (twiceAttack) next.duplicateAttacks -= 1;
  const twiceSkill = card.type === "Skill" && next.duplicateSkills > 0;
  if (twiceSkill) next.duplicateSkills -= 1;
  // Replay: the card is played again (its own Replay, Soldier's Stew on a Strike, Throwing Axe on the fight's first card),
  // energy paid once.
  const axe = card.type !== "Potion" && next.axeReplay;
  if (axe) next.axeReplay = false;
  const replays = card.type === "Potion" ? 0 : (card.replay ?? 0) + (isStrikeCard(card) ? next.strikeReplay : 0) + (axe ? 1 : 0);
  // Every play of an Attack (a duplicate, a replay) is one for the attack-counting relics, each after its own play
  // (logged: a Stew-replayed Strike took Pen Nib 3 -> 5, Ornamental Fan 0 -> 2, Nunchaku 2 -> 4; a Duplicator'd
  // Setup Strike Kusarigama 0 -> 2; attacks_played_this_turn +1 each time).
  const plays = 1 + (twice ? 1 : 0) + (twiceAttack ? 1 : 0) + (twiceSkill ? 1 : 0) + replays;
  // The evidence covers one play; repeated discard/generation selections need their own observation.
  if (hidden && plays > 1) {
    next.pendingSelection = true;
    next.unknown = [...next.unknown, `${card.name}（重放弃牌未验证）`];
  }
  for (let play = 0; play < plays; play += 1) {
    // CARD_CONDITIONS: a hand condition is read on the hand as this play resolves (a second play of it sees what the first
    // drew); unmet, the card's draw and energy do not happen.
    resolveEffects(next, card.handCondition !== undefined && !handConditionMet(next, card, card.handCondition) ? unconditioned(card) : card, target, player, cost);
    if (card.type === "Attack") attackRelics(next, player);
    if (card.type === "Power" && (player.lostWisp ?? 0) > 0) sweepRaw(next, player.lostWisp ?? 0);
    if (card.type === "Skill" && (player.letterOpener || player.tuningFork)) skillRelics(next, player);
  }
  // T082DRCUHRRD F27 T1 / F9PP859XZ3RJ F37 T2: the old hand is gone before the replacement draw.
  // Use the hand at play time, including held/locked/unknown drawn cards, but excluding potion slots.
  if (redraw > 0) drawExpected(next, redraw, player);
  // After the card: Slow counts it from the next card on (4LGQ T9: counting it too made "Thrash" a
  // kill that was 1 short), and Skittish block lands once the card that hit it is done.
  if (card.type !== "Potion") next.played += 1;
  // Tender: this card is done at full Strength/Dexterity; every later one this turn is N lower.
  if (card.type !== "Potion" && (player.tender ?? 0) > 0) {
    next.strength -= player.tender ?? 0;
    next.tempDex -= player.tender ?? 0;
  }
  if (card.type === "Skill") next.skillsPlayed += 1;
  if (card.type === "Attack") {
    next.attacksPlayed += 1;
    if (next.freeAttacks > 0) next.freeAttacks -= 1;
  }
  for (const enemy of next.enemies) {
    if (!enemy.skittishHit) continue;
    enemy.skittishHit = false;
    if (enemy.alive) enemy.block += enemy.skittish ?? 0;
    enemy.skittish = 0;
  }
  if (card.special === "duplicate_next") next.duplicate += 1;
  // Arm only after Burst's own play, so it does not consume its newly granted replay.
  if (card.burst) next.duplicateSkills += card.burstSkills ?? 1;
  // One-Two Punch: its next Attacks are played twice (as ONE_TWO_PUNCH_POWER once up); Unrelenting: the next
  // Attack costs 0 (as FREE_ATTACK_POWER), granted after its own play took any free attack already up.
  if (card.special === "double_next_attacks") next.duplicateAttacks += card.nextAttacks ?? 1;
  if (card.special === "free_next_attack") next.freeAttacks += 1;
  if (card.putsOnTop) next.topPlaced = true;
  // A random exhaust may take any card still in hand: nothing is planned after it (PU21 F30 T2 and F33
  // T8: the Anger planned after True Grit was exhausted, 8 and 16 damage short).
  const exhaustedBefore = next.exhausted.length;
  let randomBurned = 0;
  let drawnBurned = 0;
  // Second Wind (LQLZ F21 T4: unmodelled, it exhausted Inferno and Forgotten Ritual; a replay ranked an
  // impossible line first): every non-Attack card in hand goes, Block for each.
  if (card.special === "second_wind") {
    const taken = [...next.hand, ...next.held].filter((entry) => entry.type !== "Potion" && entry.type !== "Attack");
    next.exhausted = [...next.exhausted, ...taken];
    next.hand = next.hand.filter((entry) => !taken.includes(entry));
    next.held = next.held.filter((entry) => !taken.includes(entry));
    if (!next.noBlock && taken.length > 0) gainBlock(next, Math.max(0, card.block + next.tempDex) * taken.length, player);
  }
  if (card.special === "ashwater") {
    const taken = [...next.hand, ...next.held].filter((entry) => entry.type !== "Potion" && (entry.cardId === "HOWL_FROM_BEYOND" || isJunk(entry)));
    next.exhausted = [...next.exhausted, ...taken];
    next.hand = next.hand.filter((entry) => !taken.includes(entry));
    next.held = next.held.filter((entry) => !taken.includes(entry));
  }
  if (card.randomExhaust) {
    // The random pick costs the average card left (K8RK F17 T2: plain True Grit took Bludgeon, the plan's
    // 32-damage race card; shown as "hp_lost 1").
    const pool = [...next.hand, ...next.held].filter((entry) => entry.type !== "Potion");
    if (pool.length > 0) {
      next.flat -= pool.reduce((sum, entry) => sum + Math.max(0, exhaustValue(entry, EXHAUST_WEIGHTS)), 0) / pool.length;
      next.exhaustedCount += 1;
      next.randomExhausts += 1;
      randomBurned = 1;
    }
    // The rest stays in hand unplayed (which card went is unknown): held Beckons and Burns still hurt at
    // the end of the turn (VL2D F17 T16: shown as "hp_lost 0", the held Beckon cost 6).
    next.held = [...next.held, ...next.hand.filter((entry) => entry.type !== "Potion")];
    next.hand = next.hand.filter((entry) => entry.type === "Potion");
  }
  else if (EXHAUST_PICKERS.has(card.cardId)) {
    const pick = exhaustPick([...next.held, ...next.hand], next.enemies.some((enemy) => enemy.alive && (enemy.sandpit ?? 0) > 0));
    if (pick) {
      next.hand = next.hand.filter((entry) => entry !== pick);
      next.held = next.held.filter((entry) => entry !== pick);
      next.exhausted = [...next.exhausted, pick];
    }
  } else if (card.special === "glowwater" || card.special === "bottled") {
    // Glowwater: 「消耗你的手牌。抽{Cards}张牌。」 The hand (and any Status/Curse held) is exhausted, then the
    // draw fills the hand from the pile (logs: 5 cards -> 10 drawn, F17 T1; 3 -> 10, F25 T4), each card
    // the pile's expected one (card-model expectedDraw), as Gambler's Brew prices its draws.
    // Bottled Potential: the hand is shuffled back into the draw pile (not exhausted), then 5 are drawn.
    const bottled = card.special === "bottled";
    if (!bottled) drawnBurned = next.drawnInHand;
    next.drawnInHand = 0;
    if (!bottled) next.exhausted = [...next.exhausted, ...next.held, ...next.hand.filter((entry) => entry.type !== "Potion")];
    next.hand = next.hand.filter((entry) => entry.type === "Potion");
    next.held = [];
    const room = bottled ? Number.POSITIVE_INFINITY : (player.drawable ?? Number.POSITIVE_INFINITY) - next.cardsDrawn;
    const count = Math.max(0, Math.min(bottled ? BOTTLED_DRAW : GLOWWATER_DRAW, player.handLimit ?? HAND_LIMIT, room));
    const draw = card.generates;
    if (card.drawn) drawCards(next, card.drawn.slice(0, count), player, bottled);
    else if (draw) {
      next.hand = [...next.hand, ...Array.from({ length: count }, (_, i) => ({ ...draw, index: draw.index * 10 + i, key: `${draw.key}.${i}` }))];
      next.cardsDrawn += count;
    }
  } else if (EXHAUST_HAND.has(card.cardId)) {
    // The cards drawn earlier this turn go too (their values stay as draws: what they were is unknown).
    drawnBurned = next.drawnInHand;
    next.drawnInHand = 0;
    next.exhausted = [...next.exhausted, ...next.held, ...next.hand.filter((entry) => entry.type !== "Potion")];
    next.hand = next.hand.filter((entry) => entry.type === "Potion");
    next.held = [];
  }
  const burned = next.exhausted.length - exhaustedBefore + drawnBurned;
  next.drawnExhausted += drawnBurned;
  next.exhaustedCount += burned + (card.exhausts && card.type !== "Potion" ? 1 : 0);
  // Feel No Pain: Block for each card exhausted, the random one too (plain True Grit: which card is unknown, that
  // one is exhausted), the played card itself included when it exhausts.
  if (next.feelNoPain > 0) {
    const count = burned + randomBurned + (card.exhausts && card.type !== "Potion" ? 1 : 0);
    if (count > 0) gainBlock(next, next.feelNoPain * count, player);
  }
  // Dark Embrace: a card drawn for each card exhausted (the random one too; the played card when it exhausts).
  exhaustDraws(next, burned + randomBurned + (card.exhausts && card.type !== "Potion" ? 1 : 0), player);
  if (card.feelNoPain) next.feelNoPain += card.feelNoPain;
  if (card.cardId === "HELLRAISER") next.hellraiser = true;
  if (card.cardId === "DARK_EMBRACE") next.darkEmbrace += 1;
  if (!card.known) next.unknown = [...next.unknown, card.name];
  const targetEnemy = target === null ? null : next.enemies.find((enemy) => enemy.index === target) ?? null;

  if (card.target === "single" && target !== null) next.facing = target;
  next.steps = [
    ...sim.steps,
    {
      cardIndex: card.index,
      cardId: card.cardId,
      upgraded: card.upgraded,
      cost: card.cost,
      name: card.name,
      target: card.target === "single" ? target : null,
      targetName: card.target === "single" && targetEnemy ? targetEnemy.name : null,
      ...(hidden || card.discards || card.discardsHand ? { discards: discarded } : {}),
      ...(card.type === "Potion" && card.generates?.pileCard ? { takes: card.generates.pileCard } : {}),
      ...(card.pileCard ? { pileCard: card.pileCard } : {}),
    },
  ];
  // Music Box: this turn's first Attack card comes back as an Ethereal copy (PlayerSim.musicBox), a card of the hand
  // like any other: playing it costs its energy and counts as a card played (Withering Presence, Sloth).
  if (card.type === "Attack" && player.musicBox && player.musicBox.count + sim.attacksPlayed === 0) addToHand(next, [musicBoxCopy(card)], player.handLimit);
  return next;
}

/** A line's HP change as the notes write it: "hp -8" for a loss, "hp +8" for a heal (was "hp --8": Q8XR F11 T2, NH8A F21 T1). */
export function hpText(loss: number): string {
  return loss < 0 ? `hp +${-loss}` : `hp -${loss}`;
}

/** Names with their count, in first-seen order: ["毒素", "毒素", "灼伤"] -> ["毒素 ×2", "灼伤"]. */
function countedNames(names: string[]): string[] {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].map(([name, count]) => (count > 1 ? `${name} ×${count}` : name));
}

/** Index offset of a Music Box copy (a card the hand did not hold at the decision: never a first step). */
export const MUSIC_BOX_INDEX = 300;

/**
 * The Ethereal copy Music Box adds of the turn's first Attack (its own key and index, so it is a card apart; named as
 * the copy in the lines' text, the game's card id kept for finding it in the hand).
 */
export function musicBoxCopy(card: CardModel): CardModel {
  return { ...card, key: `${card.key}~mb`, index: MUSIC_BOX_INDEX + card.index, name: `${card.name}（音乐盒复制）`, ethereal: true };
}

/** A card's effects on the sim (energy and hand already paid). Called twice under Duplication. */
function resolveEffects(next: Sim, card: CardModel, target: number | null, player: PlayerSim, cost: number): void {
  const targetEnemy = target === null ? null : next.enemies.find((enemy) => enemy.index === target && enemy.alive) ?? null;
  if (card.target === "single" && targetEnemy === null) return;
  if (card.type !== "Potion" && next.afterImage > 0) gainBlock(next, next.afterImage, player);

  if (card.hpLoss > 0) loseHp(next, card.hpLoss, player);
  if (card.immediatePlays) {
    for (let i = 0; i < card.immediatePlays.count; i += 1) {
      if (next.hp <= 0 || !next.enemies.some((enemy) => enemy.alive)) break;
      const automatic = card.immediatePlays.card;
      const base = automatic.damageBase ?? automatic.damage;
      const generated: CardModel = { ...automatic, key: `${card.key}~auto${i}`, cost: 0,
        damage: base === null ? null : Math.floor(ourAttackScaled(base + (player.strengthNow ?? 0), player.weak, false)) };
      const resolved = play(next, generated, target, player);
      if (!resolved) break;
      // Keep the attack/exhaust triggers, but the mod performs these plays itself: no extra hand actions.
      const steps = next.steps;
      Object.assign(next, resolved, { steps });
    }
  }
  // Rupture's amount (Rupture+ 2: 8L29N792FA45 F37 T2, played at block 0 under Galvanic, its own 6 gave +2 Strength), as the
  // rollout's later turns take it (POWER_EFFECTS); it was +1 whatever the card.
  if (card.special === "rupture") next.rupture += card.powerAmount ?? 1;
  // Enrage (Test Subject): every Skill gives it Strength at once, so this turn's attack grows too.
  if (card.type === "Skill") for (const enemy of next.enemies) if (enemy.alive && (enemy.enrage ?? 0) > 0) enemy.strengthDelta += enemy.enrage ?? 0;
  // Vital Spark (Infested Prism): every Skill gives us Tainted, and every attack hit this turn grows by it
  // (4LC3 F31 T7: "Ashen Strike, Defend, Shrug It Off" shown as -5, the 6x3 became 14x3 and killed us).
  if (card.type === "Skill") for (const enemy of next.enemies) if (enemy.alive && (enemy.vitalSpark ?? 0) > 0) next.tainted += enemy.vitalSpark ?? 0;
  if (card.special === "colossus") next.colossus = true;
  if (card.special === "frantic_escape") next.escapes += 1;
  if (card.special === "crimson_mantle") next.mantles += 1;
  if ((card.inferno ?? 0) > 0) {
    next.inferno += card.inferno ?? 0;
    next.infernos += 1;
  }
  if (card.energyGain > 0) next.energy += card.energyGain;

  // Block before damage (Iron Wave order does not matter; Body Slam reads block after gains of
  // *earlier* cards only, which is what we simulate).
  if (card.block > 0 && card.special !== "second_wind" && (card.type === "Potion" || !next.noBlock)) {
    // Unmovable doubles only the first card Block of the turn, but every Block card shows the doubled
    // number until then (92MW F33 T2: 22 planned, 16 gained; T7 -9 planned, -14).
    let shown = card.block;
    // Evil Eye: double Block when a card was exhausted this turn, before this turn's decision or earlier
    // in this line (Q97B F23 T3: doubled from the state flag only, so "True Grit, Evil Eye" read 8, and a
    // line exhausting only after it was never told apart).
    if (card.cardId === "EVIL_EYE" && next.exhaustedCount > 0) shown *= 2;
    const unmovableDoubles = card.type !== "Potion" && player.unmovableArmed === true && !next.unmovableSpent;
    if (card.type !== "Potion" && player.unmovableArmed) {
      if (next.unmovableSpent) shown = Math.floor(shown / 2);
      next.unmovableSpent = true;
    }
    // CARD_CONDITIONS, Expect a Fight: its Block per point of Strength gained earlier in this line (Unmovable doubles it too
    // on the turn's first Block card).
    if ((card.perStrengthBlock ?? 0) > 0 && next.strength !== 0) shown = Math.max(0, shown + (card.perStrengthBlock ?? 0) * next.strength * (unmovableDoubles ? 2 : 1));
    // 1LMBFGSMCWKU F48 T3/T6, silent-0089/0091: round after adding new Dexterity under Frail.
    // Keep the displayed Block intact; only the change from this line's new Dexterity is added.
    let dexBlock = card.type === "Potion" ? 0 : next.tempDex;
    if (player.frail && dexBlock !== 0) {
      const raw = (card.blockBase ?? 0) + (player.dexterityNow ?? 0);
      // Use the observed base only when it reproduces the displayed value. Otherwise use the
      // smallest integer compatible with that value, without inventing a hidden card modifier.
      const pre = card.blockBase !== undefined && Math.floor(Math.max(0, raw) * 0.75) === card.block ? raw : Math.ceil(card.block / 0.75);
      dexBlock = Math.floor(Math.max(0, pre + dexBlock) * 0.75) - card.block;
    }
    const block = Math.max(0, shown + dexBlock);
    gainBlock(next, block * (next.shadowmeld && card.type !== "Potion" ? 2 : 1), player);
  }
  // 10GPK5XGHCK3 F42 T2/T7, silent-0075: only later card gains, not Block already held.
  // Existing shown values already contain this buff; no unobserved stacking or passive-block rule.
  if (card.shadowmeld && !player.shadowmeldActive) next.shadowmeld = true;
  // Panic Button: its own Block lands, then no card gives Block for the rest of this turn and two more.
  if (card.cardId === "PANIC_BUTTON") next.noBlock = true;
  if (card.special === "temp_dex") next.tempDex += 5;
  next.tempDex += card.dexterity ?? 0;
  next.tempDex += card.temporaryDexterity ?? 0;
  if (card.special === "dexterity") {
    next.tempDex += DEX_POTION;
    if (!next.noBlock) next.flat += DEX_LASTING_PER_BLOCK_CARD * next.hand.filter((entry) => entry.type !== "Potion" && entry.block > 0).length;
  }
  if (card.special === "triple_next_attack") next.gigantic += 1;
  if (card.special === "clarity") next.flat += DRAW_VALUE * CLARITY_LATER_DRAWS;
  if (card.special === "ritual") next.flat += RITUAL_VALUE;
  if (card.special === "radiance") next.flat += RADIANCE_ENERGY_VALUE * RADIANCE_LATER_ENERGY;
  // Blood Potion: a share of max HP back at once; the turn's HP loss is net of it (never above max HP).
  if (card.special === "heal") {
    const before = next.hp;
    next.hp = Math.min(player.maxHp, next.hp + Math.floor(player.maxHp * BLOOD_POTION_HEAL));
    next.potionHeal += next.hp - before;
    redSkullCheck(next, player);
  }
  // Regen: healed at the end of this turn (evaluate), the later turns' heals as lasting value.
  if (card.special === "regen" && (card.regen ?? 0) > 0) {
    const amount = card.regen ?? 0;
    next.regen += amount;
    next.flat += REGEN_LATER_SHARE * ((amount - 1) * amount) / 2;
  }
  // Primal Force: every Attack left in hand becomes a Giant Rock (1 energy, 20 damage; upgraded 24).
  if (card.special === "primal_force") {
    next.hand = next.hand.map((entry) => (entry.type === "Attack" ? giantRockFrom(entry, card.upgraded, player.strengthNow ?? 0, player.weak, next.shrunk) : entry));
  }
  // Blessing of the Forge: every card left in hand upgraded (its logged upgrade numbers added).
  if (card.special === "forge" && card.upgrades) {
    const upgrades = card.upgrades;
    next.hand = next.hand.map((entry) => (entry.type === "Potion" || entry.upgraded || !upgrades[entry.cardId] ? entry : applyUpgrade(entry, upgrades[entry.cardId]!)));
  }
  // Soldier's Stew: the Strikes played from now on replay; the piles' Strikes later are lasting value.
  if (card.special === "stew") {
    next.strikeReplay += 1;
    next.flat += STEW_LATER_SHARE * (card.laterDamage ?? 0);
  }
  // Plating: this turn's block is platingNow (evaluate); the later turns' block is valued by what it can
  // absorb of the attacks forecast for them (platingAbsorbed), not a flat rate.
  if (card.special === "plating") {
    next.plating += card.plating ?? 0;
  }
  // One Monte Carlo sample of a random potion (potion-mc.ts): the cards it really puts in the hand.
  if (card.adds && !next.pendingSelection && (card.discardCount === undefined || hiddenDaggers(card))) {
    const adds = hiddenDaggers(card) ? card.adds.map((shiv, i) => ({
      ...shiv, index: 2_000_000 + next.steps.length * 2 + i, key: `${card.key}~shiv${next.steps.length}:${i}`,
      validTargets: next.enemies.filter((enemy) => enemy.alive).map((enemy) => enemy.index),
      damage: shiv.damageBase === undefined ? shiv.damage : Math.floor(ourAttackScaled(shiv.damageBase + (player.strengthNow ?? 0), player.weak, false)),
    })) : card.adds;
    addToHand(next, adds, player.handLimit);
  }
  if (card.drawn && card.special !== "gamble" && card.special !== "chaos" && card.special !== "glowwater" && card.special !== "bottled") drawCards(next, card.drawn, player);
  // Snecko Oil: every card in hand (and those it draws) costs 0-3 at random this turn (a sample: its own
  // costs; else the expected SNECKO_COST).
  if (card.special === "snecko") next.hand = next.hand.map((entry) => (entry.type === "Potion" || entry.xCost || entry.cost < 0 ? entry : { ...entry, cost: card.sneckoCosts?.[entry.key] ?? SNECKO_COST }));
  // Gambler's Brew: the hand cards this way of drinking it discards (gambleWays) are swapped for as many
  // average draws from the pile (card-model expectedDraw), or a sample's real next cards.
  if (card.special === "gamble") {
    const discards = new Set(card.discards ?? []);
    const draw = card.generates;
    const swapped = next.hand.filter((entry) => discards.has(entry.key)).length;
    next.hand = next.hand.filter((entry) => !discards.has(entry.key));
    if (card.drawn) drawCards(next, card.drawn.slice(0, swapped), player);
    else if (draw) next.hand = [...next.hand, ...Array.from({ length: swapped }, (_, i) => ({ ...draw, index: draw.index * 10 + i, key: `${draw.key}.${i}` }))];
  } else if (card.special === "chaos" && (card.generates || card.drawn)) {
    // Distilled Chaos: the top cards of the draw pile played for free, each the pile's expected card (or a
    // sample's real top cards), at a random enemy (worst case: randomVictim). They leave the pile: later
    // draws come from below them.
    const tops = card.drawn ? card.drawn.slice(0, card.playsTop ?? 0) : Array.from({ length: card.playsTop ?? 0 }, () => card.generates!);
    for (const drawn of tops) {
      if (!drawn.playable || drawn.type === "Status" || drawn.type === "Curse") continue;
      const top: CardModel = { ...drawn, cost: 0, target: drawn.damage !== null ? "random" : "self", validTargets: [] };
      resolveEffects(next, top, null, player, 0);
    }
    next.pileDrawn += card.playsTop ?? 0;
  } else if (card.generates && card.special !== "glowwater" && card.special !== "bottled") next.hand = [...next.hand, card.generates];
  if (card.special === "free_card") {
    const pick = freeCardPick(next.hand);
    if (pick) {
      next.hand = next.hand.map((entry) => (entry === pick ? { ...entry, cost: 0 } : entry));
      // It stays free for the rest of the fight: worth its energy again every time it is drawn.
      next.flat += FREE_CARD_LASTING * pick.cost;
    }
  }
  if ((card.retaliate ?? 0) > 0) next.retaliate += card.retaliate ?? 0;
  // Thorns (Liquid Bronze): back on every hit of this enemy turn like Flame Barrier's, and it stays up (the rollout's later turns).
  if ((card.thorns ?? 0) > 0) next.retaliate += card.thorns ?? 0;
  if (card.special === "buffer") next.buffer += 1;
  if (card.special === "intangible") next.intangible = true;
  // Rage: RAGE_POWER up at the decision, and (CARD_CONDITIONS) a Rage played earlier in this line.
  if (card.type === "Attack" && (player.rage ?? 0) + next.rage > 0) gainBlock(next, (player.rage ?? 0) + next.rage, player);
  if ((card.rageBlock ?? 0) > 0) next.rage += card.rageBlock ?? 0;
  if (card.special === "triple_block") {
    next.blockGained += next.block * 2;
    next.block *= 3;
  }
  // Entrench: the block up when it is played is gained again (RTF3 F17 T1, F28 T4).
  if (card.special === "double_block") {
    next.blockGained += next.block;
    next.block *= 2;
  }

  if (card.damage !== null || card.special === "whirlwind") {
    // A card's shown damage already includes our Weak (Strike 6 -> 4 in states.jsonl; 88HN T5 predicted
    // 36, dealt 45), so Weak only scales what the card text does not know: this turn's Strength and
    // Body Slam's block.
    const weakFactor = player.weak ? 0.75 : 1;
    // With Weak the game multiplies (base + Strength) by 0.75, then by Vulnerable, and rounds once;
    // the shown number is already rounded down (P4ZD F37 T9: Strike 9x0.75x1.5 = 10, counted 9; the
    // exact 28 lethal was dropped as 27 and we died with the Axebot at 1 HP). Unrounded here,
    // rounded in hitEnemy, when the base reproduces the shown number.
    let shown = card.damage ?? 0;
    // JQPT83P8KDSZ F25 attempt 2 T3: six cards show 3 damage; Strike leaving makes five cards show 5.
    // Count the hand before this play, including held/locked cards, but never belt potions.
    // PJ2LL9KU7FHD F17 T15/T5, silent-0166/0169: -2 Strength shows 3/5 at five/four cards;
    // +2 Strength shows 7/11 at five/three cards. Keep other pairs unknown, without a general formula.
    if (card.cardId === "PRECISE_CUT" && !card.upgraded && card.preciseCutHandDamage) {
      const handSize = [...next.hand, ...next.held, ...next.locked].filter((entry) => entry.type !== "Potion").length + next.drawnInHand + 1;
      const strengthNow = player.strengthNow ?? 0;
      const observed = strengthNow === 0 ? (handSize === 5 ? 5 : handSize === 6 ? 3 : null)
        : strengthNow === -2 ? (handSize === 5 ? 3 : handSize === 4 ? 5 : null)
        : strengthNow === 2 ? (handSize === 5 ? 7 : handSize === 3 ? 11 : null) : null;
      const recordedShown = strengthNow === 2 ? card.damage === 7 || card.damage === 11
        : (strengthNow === 0 || strengthNow === -2) && (card.damage === 3 || card.damage === 5);
      if (observed !== null && recordedShown && !player.weak && !next.shrunk && next.strength === 0) {
        shown = observed;
      } else {
        next.unknown = [...next.unknown, `${card.name}（此手牌数或伤害修正未验证）`];
      }
    }
    if (player.weak && card.damageBase !== undefined && card.special !== "body_slam") {
      const exact = (card.damageBase + (player.strengthNow ?? 0)) * 0.75;
      if (Math.floor(exact) === shown) shown = exact;
    }
    // Our Shrink in play (on us, or in the shown number): the per-hit number from attackShrunk, Shrink once, unrounded.
    const shrunkHit = attackShrunk(card, next, player);
    const shrinkNow = next.shrunk && card.type !== "Potion";
    // Thrash hits for its printed number (3SBP: all 12 plays); what it absorbs is for its later plays.
    let perHit = shrunkHit ? shrunkHit.perHit : shown + next.strength * weakFactor;
    // UACFSW4VDDLD F33 T2/T5: the newly established bonus belongs to only the first Shiv.
    if (card.cardId === "SHIV" && !next.phantomBladesSpent && next.phantomBlades > 0) {
      const base = card.damageBase === undefined ? null : card.damageBase + (player.strengthNow ?? 0);
      perHit = base !== null && Math.floor(ourAttackScaled(base, player.weak, shrinkNow)) === (card.damage ?? 0)
        ? ourAttackScaled(base + next.strength + next.phantomBlades, player.weak, shrinkNow)
        : perHit + ourAttackScaled(next.phantomBlades, player.weak, shrinkNow);
    }
    // K3676LU8B0UH F48 attempt 2 T9/T12: the next MAUL gets the previous one's Increase, before Pen Nib.
    if (card.cardId === "MAUL" && next.maulGrowth > 0) {
      perHit = shrunkHit && shrunkHit.pre !== null
        ? ourAttackScaled(shrunkHit.pre + next.strength + next.maulGrowth, player.weak, shrinkNow)
        : perHit + ourAttackScaled(next.maulGrowth, player.weak, shrinkNow);
    }
    let hits = card.hits;
    // 9YBK F43 T4, HMV F33 T3 and G403 F48 T11: only the observed skills leaving reduce Flechettes' shown hits.
    // Held and Chains-locked skills remain in hand. Do not infer extra hits from unobserved draws or card types.
    if (card.cardId === "FLECHETTES" && !card.upgraded && card.hitsLoseHandSkills && next.observedSkillKeys) {
      const stillHeld = new Set([...next.hand, ...next.held, ...next.locked].map((entry) => entry.key));
      hits = Math.max(0, hits - next.observedSkillKeys.filter((key) => !stillHeld.has(key)).length);
    }
    if (card.special === "body_slam") perHit = shrinkNow ? ourAttackScaled(next.block + next.strength, player.weak, true) : Math.floor((next.block + next.strength) * weakFactor);
    // Pact's End hits only with 3+ cards in the exhaust pile (H1FA F17 T9: counted as a 17 AoE kill on
    // an empty pile, dealt 0, died by 1 HP). An unknown pile counts as empty.
    if (card.cardId === "PACTS_END" && (player.exhaustPile ?? 0) + next.exhausted.length < PACTS_END_EXHAUST) perHit = 0;
    if (card.special === "whirlwind") hits = cost;
    // Fiend Fire: one hit per card it exhausts, i.e. the rest of the hand (exhausted after this).
    // Cards drawn earlier in the line and still in hand count too (9VG8 F35 T6).
    if (card.special === "fiend_fire") hits = next.hand.filter((entry) => entry.type !== "Potion").length + next.held.length + next.drawnInHand;
    // Spite: HP lost in this line, or (CARD_CONDITIONS) earlier this turn, before the decision.
    if (card.special === "spite" && (next.hpLostThisTurn || player.hpLostThisTurn === true)) hits = 2;
    // CARD_CONDITIONS, Tear Asunder: one more hit for each HP loss earlier in this line (its shown hits have the fight's before).
    if (card.hitPerHpLoss === true) hits += next.hpLossEvents;
    if (card.special === "dismantle" && targetEnemy && targetEnemy.vulnerable > 0) hits = 2;
    // Bully's bonus and Vigor are not in the shown number: under Shrink they shrink with it, rounded once (from `pre`).
    let bonus = 0;
    if (card.special === "bully" && targetEnemy) {
      bonus = 2 * targetEnemy.vulnerable;
      if (!shrunkHit) perHit += bonus;
      else if (shrunkHit.pre !== null && perHit !== 0) perHit = ourAttackScaled(shrunkHit.pre + next.strength + bonus, player.weak, shrinkNow);
      else perHit += ourAttackScaled(bonus, player.weak, shrinkNow);
    }
    // CARD_CONDITIONS, Ashen Strike: ExtraDamage for each card exhausted earlier in this line (its shown number has the pile at
    // the decision), Weak and Shrink as on the rest of it.
    const lineExhausts = next.exhaustedCount - (player.exhaustedThisTurn ? 1 : 0);
    if ((card.perExhaustDamage ?? 0) > 0 && lineExhausts > 0) perHit += ourAttackScaled((card.perExhaustDamage ?? 0) * lineExhausts, player.weak, shrunkHit ? shrinkNow : false);
    // Vigor: spent by the first Attack, on its first hit (KFP1 F17 T1).
    let firstHit = perHit;
    if (card.type === "Attack" && next.vigor > 0) {
      if (!shrunkHit) firstHit += Math.floor(next.vigor * weakFactor);
      else if (shrunkHit.pre !== null && perHit !== 0 && card.special !== "body_slam") firstHit = ourAttackScaled(shrunkHit.pre + next.strength + bonus + next.vigor, player.weak, shrinkNow);
      else firstHit += ourAttackScaled(next.vigor, player.weak, shrinkNow);
      next.vigor = 0;
    }
    if (next.gigantic > 0 && card.type === "Attack") {
      perHit *= 3;
      firstHit *= 3;
      next.gigantic -= 1;
    }
    // Pen Nib: the play its counter reaches is the 10th, every hit doubled (GSG0Q5KP9AAU F33 T2); relicAttacks counts
    // this turn's Attack plays before this one (attackRelics runs after it).
    if (card.type === "Attack" && player.penNib !== undefined && (player.penNib + next.relicAttacks) % PEN_NIB_EVERY === PEN_NIB_EVERY - 1) {
      perHit *= 2;
      firstHit *= 2;
    }

    if (card.target === "all") {
      // Hit by hit across every enemy, as the game resolves it: a death mid-card (Crab Rage) changes
      // what the later hits meet.
      for (let hit = 0; hit < hits; hit += 1) {
        next.sweeping = true;
        for (const enemy of next.enemies) if (enemy.alive) hitEnemy(next, enemy, hit === 0 ? firstHit : perHit, 1, player, card.type === "Potion", card.type === "Attack");
        next.sweeping = false;
        if (next.pendingRage) {
          next.pendingRage = false;
          crabRage(next);
        }
      }
    } else if (card.target === "random") {
      // Worst case for us: each hit lands where it kills least (randomVictim), so a line never counts
      // on a random hit killing the enemy that would otherwise attack (H8LC F23 T5, S6AG F25 T6).
      for (let hit = 0; hit < hits; hit += 1) {
        const victim = randomVictim(next);
        if (!victim) break;
        hitEnemy(next, victim, hit === 0 ? firstHit : perHit, 1, player, card.type === "Potion", card.type === "Attack");
      }
    } else if (targetEnemy) {
      const wasAlive = targetEnemy.alive;
      if (hits > 0) hitEnemy(next, targetEnemy, firstHit, 1, player, card.type === "Potion", card.type === "Attack");
      hitEnemy(next, targetEnemy, perHit, hits - 1, player, card.type === "Potion", card.type === "Attack");
      if (card.special === "feed" && wasAlive && !targetEnemy.alive) next.feedKills += 1;
      // Feed exhausts: spending it without the kill throws away this fight's max-HP gain.
      else if (card.special === "feed") next.flat -= 8;
      if (card.special === "molten_fist" && targetEnemy.alive) targetEnemy.vulnerable *= 2;
    }
  }

  if (card.cardId === "MAUL") next.maulGrowth += card.maulIncrease ?? 0;
  if (card.cardId === "SHIV") next.phantomBladesSpent = true;
  // Only the observed single, unupgraded nine-point power is modelled; stacking is unknown.
  if (card.phantomBlades === 9 && next.phantomBlades === 0) next.phantomBlades = 9;
  thrashAbsorb(next, card, player);

  const poisoned = card.target === "all" ? next.enemies.filter((enemy) => enemy.alive) : targetEnemy ? [targetEnemy] : [];
  if ((card.poison ?? 0) > 0) {
    if (card.target === "random") {
      for (let k = 0; k < card.hits; k += 1) {
        const victim = randomVictim(next);
        if (victim) applyDebuff(victim, "poison", card.poison!);
      }
    } else for (const enemy of poisoned) {
      if (enemy.alive && (!card.poisonRequiresExisting || (enemy.poison ?? 0) > 0)) applyDebuff(enemy, "poison", card.poison!);
    }
  }
  if (card.poisonNow) for (const enemy of poisoned) triggerPoison(next, enemy, 1 + next.poisonExtraTriggers);
  next.poisonExtraTriggers += card.poisonExtraTriggers ?? 0;
  next.envenom += card.envenom ?? 0;

  const debuffTargets = card.target === "all" ? next.enemies.filter((enemy) => enemy.alive) : targetEnemy ? [targetEnemy] : [];
  for (const enemy of debuffTargets) {
    if (!enemy.alive) continue;
    // In card-text order: Artifact blocks whichever lands first (Uppercut: Weak, then Vulnerable).
    if (card.special === "malaise") {
      // KAY522KT5NXR F12 T3 / XYYQYBRM2A01 F30 T1, silent-0051/0053: unupgraded X=1/3.
      // LLYSRQQ35AVW F33 T3 / F38 T1 / F48 T2, silent-0144: the upgrade adds one beyond X.
      // Strength loss persists after temporary Wail restores; unupgraded zero X applies neither debuff.
      const amount = cost + (card.malaiseBonus ?? 0);
      applyDebuff(enemy, "strengthLoss", amount);
      next.weakApplied += applyDebuff(enemy, "weak", amount);
    } else if (card.weakFirst) {
      next.weakApplied += applyDebuff(enemy, "weak", card.weak);
      next.vulnerableApplied += applyDebuff(enemy, "vulnerable", card.vulnerable);
    } else {
      next.vulnerableApplied += applyDebuff(enemy, "vulnerable", card.vulnerable);
      next.weakApplied += applyDebuff(enemy, "weak", card.weak);
    }
    if (card.enemyStrength > 0) enemy.strengthDelta += card.enemyStrength;
    // Temporary loss: lowers this turn's attack, not a lasting change (so not scored as one).
    applyDebuff(enemy, "tempStrengthLoss", card.enemyTempStrengthLoss ?? 0);
    applyDebuff(enemy, "demise", card.demise ?? 0);
    applyDebuff(enemy, "shrink", card.shrink ?? 0);
  }

  if (card.strength > 0) {
    next.strength += card.strength;
    next.permStrength += card.strength;
  }
  // Dominate (VQSA F33 T3: modelled as 0 Strength, never played into Vulnerable 2).
  if (card.special === "dominate" && targetEnemy && targetEnemy.alive) {
    const gained = targetEnemy.vulnerable * (card.strengthPerVulnerable ?? 1);
    next.strength += gained;
    next.permStrength += gained;
  }
  if (card.tempStrength > 0) next.strength += card.tempStrength;
  if ((card.delayedDamage ?? 0) > 0) next.bombs += card.delayedDamage ?? 0;
  if (card.type === "Potion" && !turnOnlyDrink(card)) next.lastingDrinks += 1;
  if (card.type === "Potion") next.potionCost += card.potionCost ?? 0;
  else next.flat += card.flatValue;
  // 10GPK5XGHCK3 F37 T8 / F48 T6, silent-0074: one observed Wave establishes two per draw.
  // Do not guess how repeated Wave plays stack; an already observed larger amount remains a fact.
  next.corrosiveWave = Math.max(next.corrosiveWave, card.corrosiveWave ?? 0);
  if (card.draw > 0) drawExpected(next, card.draw, player);
  // Damage to us (Foul Potion, Galvanic's 「受到6点伤害」): like an enemy hit, block first, Intangible caps it at 1, the
  // rest is HP lost. Last, as the card text puts it: a Power played under Galvanic is up when its 6 lands (8L29N792FA45
  // F37 T2: Rupture+ played at block 0, its own 6 gave +2 Strength).
  if ((card.selfDamage ?? 0) > 0) damagePlayer(next, card.selfDamage ?? 0, player);
  // LRN0HPZ0FZS1 F48 T1: the power itself gives no first block; later plays and replays do.
  next.afterImage += card.afterImage ?? 0;
}

/** Damage to us on our own turn: block first, Intangible caps it at 1, only the rest is HP lost (loseHp). */
function damagePlayer(sim: Sim, amount: number, player: PlayerSim): void {
  const capped = player.intangible || sim.intangible ? Math.min(1, amount) : amount;
  const blocked = Math.min(sim.block, capped);
  sim.block -= blocked;
  loseHp(sim, capped - blocked, player);
}

/** `count` cards drawn from the pile as expected values (what they are is not known). */
function drawExpected(next: Sim, count: number, player: PlayerSim): void {
  // SL_RETRY_KNOWN_DRAWS: the pile's known top cards come first, as the cards themselves (VNKN9952ZNA0 F25: the three
  // attempts drew the same 25 cards in the same order whatever was played); only the draws past them are expected values.
  if (next.known !== null && next.pileDrawn < next.known.length && count > 0) {
    const taken = next.known.slice(next.pileDrawn, next.pileDrawn + count);
    drawCards(next, taken, player);
    count -= taken.length;
    if (count <= 0) return;
  }
  // SL judge (docs/sl.md §2, SL_JUDGE_KNOWN_DRAWS): a line that drew a card nobody knows.
  if (next.known !== null && count > 0) next.drewUnknown = true;
  // What lands in the hand: no more than the piles hold, nor past the 10-card hand.
  const room = Math.max(0, (player.drawable ?? Number.POSITIVE_INFINITY) - next.cardsDrawn);
  const handSpace = Math.max(0, (player.handLimit ?? HAND_LIMIT) - next.hand.filter((entry) => entry.type !== "Potion").length - next.held.length - next.drawnInHand);
  poisonDraws(next, Math.min(count, room, handSpace));
  next.drawnInHand += Math.min(count, room, handSpace);
  next.cardsDrawn += count;
  next.draws = [...next.draws];
  for (let drawn = 0; drawn < count; drawn += 1) next.draws.push(drawOne(next));
}

/** Dark Embrace's draws for `exhausted` cards exhausted now (none without it). */
function exhaustDraws(next: Sim, exhausted: number, player: PlayerSim): void {
  if (next.darkEmbrace > 0 && exhausted > 0) drawExpected(next, exhausted * next.darkEmbrace, player);
}

/**
 * Thrash (「消耗你的手牌中随机一张攻击牌，并将它的伤害添加给这张牌」): after its two hits (at its printed number) an
 * Attack in the hand is exhausted and that Attack's shown damage (our Strength and Weak in it) is added to this
 * Thrash's damage for its later plays this fight. 3SBPKG9603WD: all 12 Thrash plays hit for the printed number
 * (F12 T2: Bash+, Thrash(4) with a Strike in hand dealt 2 x 6 into Vulnerable, not 2 x 15; the old model saw a
 * lethal, Byrdonis lived at 17); 69 logged absorbs: the next Thrash's base grew by the absorbed card's shown
 * damage (HGDBHW8CJK8C F20: Strike 6 shown 14 at Strength 8, Thrash base 4 -> 18). The growth is in the outcome
 * (thrashGrowth); the rollout carries it to the Thrash it puts back in the discard pile.
 * One Attack: that one. Several: the pick is random (the rollout picks it among the Attacks: thrashRandom), the average
 * Attack's value is lost, and no other Attack is planned after it (which one went is unknown; the loop re-plans
 * on the new hand). Skills and Powers stay playable.
 */
function thrashAbsorb(next: Sim, card: CardModel, player: PlayerSim): void {
  if (card.special !== "thrash") return;
  const attacks = next.hand.filter((entry) => entry.type === "Attack");
  if (attacks.length === 0) return;
  const weakFactor = player.weak ? 0.75 : 1;
  // Its shown damage now: the hand number plus this turn's Strength (Weak-scaled, as the game shows it).
  const added = (entry: CardModel) => Math.max(0, Math.floor((entry.damage ?? 0) + next.strength * weakFactor));
  const least = attacks.reduce((a, b) => (added(b) < added(a) ? b : a));
  if (attacks.length === 1) {
    next.hand = next.hand.filter((entry) => entry !== least);
    next.exhausted = [...next.exhausted, least];
  } else {
    next.flat -= attacks.reduce((sum, entry) => sum + Math.max(0, exhaustValue(entry, EXHAUST_WEIGHTS)), 0) / attacks.length;
    // Which Attack went is the rollout's random pick (thrashRandom): only Attacks, its own shown damage.
    next.thrashRandom = [...next.thrashRandom, { index: card.index, strength: next.strength * weakFactor, least: added(least) }];
    next.held = [...next.held, ...attacks];
    next.hand = next.hand.filter((entry) => entry.type !== "Attack");
  }
  next.exhaustedCount += 1;
  if (next.feelNoPain > 0) gainBlock(next, next.feelNoPain, player);
  exhaustDraws(next, 1, player);
  if (attacks.length === 1 && added(least) > 0) next.thrashGrowth = [...next.thrashGrowth, { index: card.index, amount: added(least) }];
}

/**
 * One play of an Attack for the relics that count them in a turn (Kusarigama, Shuriken), after the play: a duplicate
 * or a replay is a play of its own, and so is a Strike Hellraiser plays when drawn (the solver plays it like a hand
 * card; logged: Kunai, Nunchaku and Pen Nib counted those autoplays, attacks_played_this_turn did not). Their counter
 * at the decision is the relic's own (combat-plan: the relic's stack).
 */
function attackRelics(sim: Sim, player: PlayerSim): void {
  sim.relicAttacks += 1;
  // Relic block: the observed T4 trigger still gave one under Frail; printed card Block is separate.
  if ((player.daughterWindBlock ?? 0) > 0) gainBlock(sim, player.daughterWindBlock!, player);
  // Kusarigama's random hit can kill a claw alone (MX8K F33 T9: Crusher died to it, the crab enraged).
  const kusa = player.kusarigama;
  if (kusa && kusa.every > 0 && (kusa.count + sim.relicAttacks) % kusa.every === 0) {
    const living = sim.enemies.filter((enemy) => enemy.alive).sort((a, b) => a.hp - b.hp);
    if (living[0]) hitEnemyRaw(sim, living[0], kusa.damage);
  }
  // Shuriken: the Strength lands once the 3rd Attack is done, for every Attack after it (and the fight).
  const shuriken = player.shuriken;
  if (shuriken && shuriken.every > 0 && (shuriken.count + sim.relicAttacks) % shuriken.every === 0) {
    sim.strength += shuriken.strength;
    sim.permStrength += shuriken.strength;
  }
  // PASSIVE_PIECES: Ornamental Fan's block on every 3rd Attack (the relic's block: no Frail, no Dexterity; Juggernaut hits).
  const fan = player.ornamentalFan;
  if (fan && fan.every > 0 && (fan.count + sim.relicAttacks) % fan.every === 0) gainBlock(sim, fan.block, player);
}

/**
 * One Skill play advances the modelled relics after its effects: Letter Opener's turn-local
 * damage and Tuning Fork's persistent passive Block have independent counters.
 */
function skillRelics(sim: Sim, player: PlayerSim): void {
  sim.relicSkills += 1;
  const opener = player.letterOpener;
  if (opener && opener.every > 0 && (opener.count + sim.relicSkills) % opener.every === 0) sweepRaw(sim, opener.damage);
  const fork = player.tuningFork;
  // The observed Frail does not reduce this relic's seven Block (6EV5V6PJJS9D F39 T3).
  if (fork && fork.every > 0 && (fork.count + sim.relicSkills) % fork.every === 0) gainBlock(sim, fork.block, player);
}

/** Damage to every living enemy at once (Lost Wisp's): two crabs dying to it die together, as to Inferno's sweep. */
function sweepRaw(sim: Sim, amount: number): void {
  const outer = sim.sweeping === true;
  sim.sweeping = true;
  for (const enemy of sim.enemies) if (enemy.alive) hitEnemyRaw(sim, enemy, amount);
  sim.sweeping = outer;
  if (!outer && sim.pendingRage) {
    sim.pendingRage = false;
    crabRage(sim);
  }
}

/**
 * A Strike Hellraiser plays when it is drawn: 0 energy, at a random enemy (the solver's worst victim), the way the
 * rollout's hellraised card and Distilled Chaos's top cards are played.
 */
export function hellraised(card: CardModel): CardModel {
  return { ...card, cost: 0, xCost: false, playable: true, ...(card.target === "single" ? { target: "random" as const, validTargets: [] } : {}) };
}

/** Cards put into the hand (not drawn): playable ones to the hand, the rest held; none past the hand limit (HAND_LIMIT). */
function addToHand(sim: Sim, cards: CardModel[], limit = HAND_LIMIT): void {
  const space = Math.max(0, limit - sim.hand.filter((entry) => entry.type !== "Potion").length - sim.held.length - sim.drawnInHand);
  const fits = cards.slice(0, space);
  sim.hand = [...sim.hand, ...fits.filter((card) => card.playable)];
  sim.held = [...sim.held, ...fits.filter((card) => !card.playable)];
}

/**
 * Known cards drawn (a Monte Carlo sample's pile order): no more than the piles hold (unless `reshuffled`:
 * the whole deck is back in the pile), none past the 10-card hand (the rest are discarded). They are taken
 * from the known pile, so later expected-value draws come from below them.
 */
function drawCards(sim: Sim, cards: CardModel[], player: PlayerSim, reshuffled = false): void {
  const room = reshuffled ? cards.length : Math.max(0, (player.drawable ?? Number.POSITIVE_INFINITY) - sim.cardsDrawn);
  // Hellraiser: a Strike drawn plays itself, free, at a random enemy (the rollout's hellraised card, a4f3795).
  const taken = cards.slice(0, Math.min(cards.length, room)).map((card) => (sim.hellraiser && isStrikeCard(card) ? hellraised(card) : card));
  const space = Math.max(0, (player.handLimit ?? HAND_LIMIT) - sim.hand.filter((entry) => entry.type !== "Potion").length - sim.held.length - sim.drawnInHand);
  poisonDraws(sim, Math.min(taken.length, space));
  addToHand(sim, taken, player.handLimit);
  sim.cardsDrawn += taken.length;
  sim.pileDrawn += taken.length;
}

/** Only cards actually drawn into available hand space trigger the independently observed Wave effect. */
function poisonDraws(sim: Sim, count: number): void {
  if (sim.corrosiveWave <= 0) return;
  for (let i = 0; i < count; i += 1) {
    for (const enemy of sim.enemies) if (enemy.alive) applyDebuff(enemy, "poison", sim.corrosiveWave);
  }
}

function gainBlock(sim: Sim, amount: number, player: PlayerSim): void {
  sim.block += amount;
  sim.blockGained += amount;
  if ((player.juggernaut ?? 0) > 0) {
    // Random enemy, worst case (S6AG F25 T6: the 8 was counted on the 6-HP Parafright, predicted -2;
    // it hit the Obscura and the Parafright's Slam 16 killed us).
    const victim = randomVictim(sim);
    if (victim) hitEnemyRaw(sim, victim, player.juggernaut ?? 0);
  }
}

/**
 * Where a random hit is assumed to land: the living enemy with the most HP + block left, i.e. the one
 * it is least likely to kill. Hit by hit this is the adversary's split, so a kill is counted only when
 * every split gives it (3 hits of 7 on two 10-HP enemies still kill one). The damage itself counts.
 */
function randomVictim(sim: Pick<Sim, "enemies">): Sim["enemies"][number] | undefined {
  let best: Sim["enemies"][number] | undefined;
  for (const enemy of sim.enemies) {
    if (!enemy.alive) continue;
    if (!best || enemy.hp + enemy.block > best.hp + best.block) best = enemy;
  }
  return best;
}

/**
 * Non-attack damage (Inferno, Juggernaut, Kusarigama): no Vulnerable, Weak, Flutter or Slow (attack-only),
 * but the enemy's own caps as for an attack (INTANGIBLE_POWER: 「将本回合受到的所有伤害和生命减少效果降低为1」;
 * SLIPPERY_POWER: 「下一次要失去生命值时，只会失去1点」; Guarded/Soar halving, Hard to Kill, Hardened Shell),
 * then block, and Curl Up (any damage). An Inferno line into an Intangible Nemesis counted 6 a hit, not 1.
 */
function hitEnemyRaw(sim: Sim, enemy: Sim["enemies"][number], raw: number): void {
  let amount = enemy.halved ? Math.floor(raw * 0.5) : raw;
  if (enemy.perHitCap !== null && enemy.perHitCap !== undefined) amount = Math.min(amount, enemy.perHitCap);
  if (enemy.intangible) amount = Math.min(amount, 1);
  amount = Math.max(0, amount);
  const absorbed = Math.min(enemy.block, amount);
  enemy.block -= absorbed;
  let loss = amount - absorbed;
  if (loss > 0 && (enemy.slippery ?? 0) > 0) {
    loss = 1;
    enemy.slippery = (enemy.slippery ?? 0) - 1;
  }
  if (enemy.hpLossCap !== null && enemy.hpLossCap !== undefined) loss = Math.min(loss, Math.max(0, enemy.hpLossCap - enemy.lostThisTurn));
  loss = Math.min(enemy.hp, loss);
  enemy.hp -= loss;
  enemy.lostThisTurn += loss;
  sim.damageDealt += loss;
  if (loss > 0) wake(enemy);
  if (amount > 0 && (enemy.curlUp ?? 0) > 0) {
    enemy.block += enemy.curlUp ?? 0;
    enemy.curlUp = 0;
  }
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

/** A living enemy's learned strip-stun for the outcome (stunned, with what it cancels), or nothing. */
function stripStunOf(enemy: Sim["enemies"][number], input: SolverInput): { stunned?: true; strippedStun?: { power: string; name: string; attack: number } } {
  if (!enemy.alive) return {};
  const start = input.enemies.find((entry) => entry.index === enemy.index);
  const stun = strippedStun(enemy, start);
  if (!stun) return {};
  const attack = (start?.attacks ?? []).reduce((sum, hit) => sum + hit.damage * hit.hits, 0);
  return { stunned: true, strippedStun: { power: stun.power, name: stun.name, attack } };
}

/** A line's learned move change on an enemy, for the outcome (MECH_MOVE_RULES), or nothing. */
function moveRuleOf(enemy: Sim["enemies"][number], input: SolverInput): { movedTo?: NonNullable<Outcome["enemyHpAfter"][number]["movedTo"]> } {
  const start = input.enemies.find((entry) => entry.index === enemy.index);
  const rule = ruledMove(enemy, start);
  if (!rule) return {};
  const total = (attacks: { damage: number; hits: number }[]) => attacks.reduce((sum, hit) => sum + hit.damage * hit.hits, 0);
  return { movedTo: { power: rule.power, name: rule.name, how: rule.how, move: rule.move, moveName: rule.moveName, attack: total(rule.attacks), before: total(start?.attacks ?? []), n: rule.n, changed: rule.changed } };
}

/** A line's learned death rule on a survivor, for the outcome (MECH_DEATH_MOVE), or nothing. */
function deathMoveOf(enemy: Sim["enemies"][number], sim: Sim, input: SolverInput): { deathMove?: NonNullable<Outcome["enemyHpAfter"][number]["deathMove"]> } {
  const rule = deathMoved(enemy, sim, input);
  // Nothing logged from the move it shows now (the Queen's Puppet Strings): no change to say (the rollout re-reads the rule).
  if (!rule || (rule.move === null && rule.next === null)) return {};
  const total = (attacks: { damage: number; hits: number }[]) => attacks.reduce((sum, hit) => sum + hit.damage * hit.hits, 0);
  const start = input.enemies.find((entry) => entry.index === enemy.index);
  return {
    deathMove: {
      ally: rule.ally, allyName: rule.allyName, move: rule.move, moveName: rule.moveName, attack: total(rule.move !== null ? rule.attacks : start?.attacks ?? []),
      before: total(start?.attacks ?? []), next: rule.next, nextName: rule.nextName, nextAttack: rule.nextAttack,
      ...(rule.nowCounts ? { nowCounts: rule.nowCounts } : {}), ...(rule.nextCounts ? { nextCounts: rule.nextCounts } : {}),
    },
  };
}

/**
 * MECH_MOVE_RULES (class C): an attack's number before this line's facing, with Surrounded's back attack needing two
 * living enemies (PlayerSim.backAttackPair). One enemy at the start: shown without the x1.5, whatever we turn to. Its
 * partner dead by the line's end: the x1.5 it showed from behind (the start's facing) is gone. Otherwise backAttack.
 */
function shownAttack(damage: number, enemyIndex: number, player: PlayerSim, sim: Sim, input: SolverInput): number {
  if (!player.surrounded) return damage;
  if (player.backAttackPair === true) {
    if (input.enemies.filter((enemy) => enemy.hp > 0).length < 2) return damage;
    if (sim.enemies.filter((enemy) => enemy.alive).length < 2) {
      const facing = player.facing ?? null;
      return facing !== null && facing !== enemyIndex ? Math.ceil(damage / 1.5) : damage;
    }
  }
  return backAttack(damage, enemyIndex, player.facing ?? null, sim.facing);
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
    // MECH_MOVE_RULES: a learned move change this line set off (an Axebot killed with Stock left is back at once in Boot
    // Up): the new move's attack, not the shown one; a revived enemy attacks at its full HP.
    const moved = enemy.moveOnStrip ? ruledMove(enemy, input.enemies.find((entry) => entry.index === enemy.index)) : null;
    if (!enemy.alive && !moved) continue;
    // MECH_DEATH_MOVE: an ally this line killed changes its move at once (the Queen's Enrage once the Amalgam is dead).
    const died = !moved && enemy.moveOnDeath ? deathMoved(enemy, sim, input) : null;
    const start = input.enemies.find((entry) => entry.index === enemy.index);
    // Shriek: taken to the threshold this turn, it is stunned and its move is lost.
    if (enemy.alive && (enemy.shriek ?? 0) > 0 && enemy.hp <= (enemy.shriek ?? 0) && (start?.hp ?? 0) > (enemy.shriek ?? 0)) continue;
    if (enemy.alive && enemy.burrowed && (start?.block ?? 0) > 0 && enemy.block <= 0) continue;
    // Ravenous: stunned by eating a corpse this turn, its move is lost.
    if (enemy.alive && enemy.ravenousStunned) continue;
    // MECH_RULES: a learned strip-stun (its last Flutter stripped this turn): stunned, its move is lost.
    if (enemy.alive && strippedStun(enemy, start)) continue;
    // Colossus halves damage from Vulnerable enemies. Played now: every one. Already up: the intent is
    // already halved, except for enemies that only became Vulnerable this turn.
    const halvedByColossus = enemy.vulnerable > 0 && (sim.colossus ? !(player.colossus && (start?.vulnerable ?? 0) > 0) : player.colossus === true && (start?.vulnerable ?? 0) === 0);
    const retaliation = enemy.intangible ? Math.min(1, sim.retaliate) : sim.retaliate;
    let attackerHp = enemy.alive ? enemy.hp : enemy.maxHp;
    for (const attack of moved ? moved.attacks : died && died.move !== null ? died.attacks : enemy.attacks) {
      for (let hit = 0; hit < attack.hits; hit += 1) {
        if (retaliation > 0 && attackerHp <= 0) break;
        const shown = shownAttack(attack.damage, enemy.index, player, sim, input);
        // The shown intent already includes our Vulnerable (MAWLER 14 -> 21, SOUL_FYSH 16 -> 24 in
        // states.jsonl); only Strength changes made this turn still need the ×1.5.
        const strengthChange = (enemy.strengthDelta - (enemy.tempStrengthLoss ?? 0)) * (player.vulnerable ? 1.5 : 1);
        let amount = Math.floor(shown + strengthChange);
        if (sim.tainted > 0) {
          const tainted = sim.tainted * (player.vulnerable ? 1.5 : 1);
          // Tainted adds before Weak. Under a Weak already up, the largest base behind the shown number
          // (4LC3 F31 T3: 3 shown is base 5; Tainted 2 made it floor(7 x 0.75) = 5, Tainted 4 made it 6).
          amount = enemy.weak > 0 && !enemy.newlyWeak ? Math.floor((Math.ceil((amount + 1) / 0.75) - 1 + tainted) * 0.75) : Math.floor(amount + tainted);
        }
        if (enemy.newlyWeak) amount = Math.floor(amount * 0.75);
        if (enemy.newlyShrunk) amount = Math.floor(amount * SHRINK_DAMAGE_FACTOR);
        if (halvedByColossus) amount = Math.floor(amount * 0.5);
        if (player.intangible || sim.intangible) amount = Math.min(amount, 1);
        hits.push({ enemy: enemy.index, amount: Math.max(0, amount) });
        attackerHp -= retaliation;
      }
    }
  }
  return hits;
}

/**
 * Imbalanced enemies stunned by this line: alive, attacking this turn, and every one of their hits met
 * by block left in the attack order (Buffer's negated hits count as blocked: the biggest ones).
 */
function imbalanceStuns(sim: Sim, hits: IncomingHit[], block: number, buffer: number): Sim["enemies"] {
  const negated = new Set(hits.map((hit, index) => ({ hit, index })).sort((a, b) => b.hit.amount - a.hit.amount).slice(0, buffer).map((entry) => entry.index));
  const unblocked = new Set<number>();
  let pool = block;
  hits.forEach((hit, index) => {
    if (negated.has(index)) return;
    if (hit.amount > pool) unblocked.add(hit.enemy);
    pool = Math.max(0, pool - hit.amount);
  });
  return sim.enemies.filter((enemy) => enemy.alive && (enemy.imbalanced ?? 0) > 0 && hits.some((hit) => hit.enemy === enemy.index) && !unblocked.has(enemy.index));
}

/**
 * HP lost to damage in order (`amounts`, each meeting the block left first) with `buffer` stacks up:
 * each stack prevents the next amount that would take HP.
 */
export function bufferedLoss(amounts: number[], block: number, buffer: number): number {
  let pool = block;
  let stacks = buffer;
  let through = 0;
  for (const amount of amounts) {
    if (amount <= 0) continue;
    const absorbed = Math.min(pool, amount);
    pool -= absorbed;
    const rest = amount - absorbed;
    if (rest <= 0) continue;
    if (stacks > 0) {
      stacks -= 1;
      continue;
    }
    through += rest;
  }
  return through;
}

/** Damage this turn that is worth waking a sleeper for (fraction of its HP). */
export const SLEEP_BIG_HIT = 0.25;

/** A woken sleeper's expected attack per turn (the Matriarch hit 19 and 9x2 once awake). */
export function sleepTurnDamage(enemy: EnemySim): number {
  return Math.max(10, Math.round(enemy.maxHp * 0.08));
}

/** Extra damage weight for the damage dealt to the most-hit enemy (concentration tie-break). */
export const CONCENTRATION_BONUS = 0.15;
/** Extra damage weight for the fight plan's kill-first enemy. */
export const FOCUS_BONUS = 0.5;
/**
 * Share of damage into a surviving minion that counts while its summoner lives (it leaves with it).
 * Kept (Dai 2026-09-28 review) for what the score still decides: code's own lines (lethal among lethal
 * lines, the dominance and HP-guard picks, the fallback) and the rollout's own later turns, where it is
 * the QE4K rule (turn-solver.test "chips the summoner"). It no longer decides what Jev sees: every kind of
 * enemy has its own "focus" option (combat-plan.ts focusLines) and every shown line is rolled out under
 * each kill order, a minion first included (rollout.ts killOrders; the order policy lifts the chip).
 */
export const MINION_CHIP = 0.25;
/** A Wound shuffled into the deck (Painful Stabs): a dead draw later, in HP-equivalent points. */
export const WOUND_COST = 2;
/** HP-equivalent cost of playing The Gambit (every later unblocked hit is fatal). */
export const GAMBIT_COST = 60;
/** Cards Pact's End needs in the exhaust pile. */
export const PACTS_END_EXHAUST = 3;
/** Damage one more Sandpit turn is worth (the deck's rough output per turn into The Insatiable). */
export const SANDPIT_TURN_DAMAGE = 20;
/** A Dazed added to the draw pile (Personal Hive): a dead draw that exhausts itself, cheaper than a Wound. */
export const DAZED_COST = 1.5;
/** Share of The Bomb's delayed damage counted in elite/boss fights (it may end first; hallway less). */
export const BOMB_SURE = 0.8;
/** Block a next-turn hand is expected to put up against the Waterfall Giant's explosion. */
export const ERUPTION_NEXT_BLOCK = 12;
/** Damage weight multiplier while racing the Waterfall Giant's eruption (raceEruption). */
export const ERUPTION_RACE_DAMAGE = 1.5;

/**
 * The part of this turn's HP loss that ends us below the next hit's reach (SolverInput.nextHit, whole boss fights only):
 * the enemies still alive after the line attack next turn for their forecast hit (x0.75 while a Weak still lasts then),
 * a fresh hand blocks `handBlock` of it; HP left under what gets through is HP the next turn needs.
 */
export function nextHitShortfall(next: NonNullable<SolverInput["nextHit"]>, living: Pick<EnemySim, "index" | "weak">[], hpAfter: number, hpLoss: number): number {
  const incoming = next.attacks.reduce((sum, attack) => {
    const enemy = living.find((e) => e.index === attack.index);
    return enemy ? sum + attack.damage * (enemy.weak > 1 ? 0.75 : 1) : sum;
  }, 0);
  const reach = incoming - next.handBlock;
  return Math.max(0, Math.min(hpLoss, reach - hpAfter));
}
/** HP weight multiplier against a phase boss: its next phase starts at full HP (Test Subject, 600 HP). */
export const NEXT_PHASE_HP = 1.25;

/**
 * Enrage (Test Subject phase 1): the Strength a Skill gives it stays for the phase. Its later attacks
 * it raises, as hits at HP weight: about two more attacks, the Vulnerable from Skull Bash making them
 * x1.5 (VP5F F48: two T1 Skills, Bite 36 = (20 + 4) x 1.5 on T3). This turn's attack is counted apart.
 */
export const ENRAGE_FUTURE_HITS = 3;

/** Dexterity Potion: Dexterity gained (states.jsonl: DEXTERITY_POWER 2). */
export const DEX_POTION = 2;
/**
 * Its lasting value per block card in hand when drunk (before fight length): the hand stands in for
 * how block-heavy the deck is. No block card in hand, no value (KFP1 T3: drunk with only Attacks).
 */
export const DEX_LASTING_PER_BLOCK_CARD = 1.5;

/** Clarity: the extra card drawn at the start of each of the next 3 turns, lasting value at DRAW_VALUE each. */
export const CLARITY_LATER_DRAWS = 3;
/** Radiant Tincture: the extra energy at the start of each of the next 3 turns (RadiancePower 3). */
export const RADIANCE_LATER_ENERGY = 3;
/**
 * Lasting value of one later turn's extra energy: a card played that would have stayed in hand, a
 * little above a drawn card's DRAW_VALUE 3 (which still needs the energy).
 */
export const RADIANCE_ENERGY_VALUE = 4;
/**
 * Mazaleth's Gift (Ritual 1): lasting value, a third of Demon Form's POWER_VALUE 30 (3 Strength a turn
 * vs 1), before the fight-length and potion shares.
 */
export const RITUAL_VALUE = 10;
/**
 * HP that Plating gained this turn can absorb on the later turns it lasts: Plating P gives P - k block at
 * the end of the k-th later turn (it drops by 1 at the start of each of our turns), against that turn's
 * forecast attack (laterIncoming; beyond it, its last turn), over the Plating already up (endTurnBlock).
 * BXAZV0R9ZHWK F17 T1: Heart of Iron's 7 was a flat 24.5 (3.5 a stack) with the Matriarch asleep three
 * turns; 19 of its 28 block fell on turns with nothing coming, and its line was code rank 1.
 */
export function platingAbsorbed(plating: number, input: SolverInput): number {
  if (plating <= 0) return 0;
  const existing = Math.max(0, input.player.endTurnBlock ?? 0);
  const steady = Math.max(
    input.enemies.reduce((sum, enemy) => sum + enemy.attacks.reduce((s, attack) => s + attack.damage * attack.hits, 0), 0),
    input.nextIncoming ?? 0,
  );
  const forecast = input.laterIncoming && input.laterIncoming.length > 0 ? input.laterIncoming : [steady];
  let absorbed = 0;
  for (let k = 1; k < existing + plating; k += 1) {
    const incoming = Math.max(0, forecast[Math.min(k, forecast.length) - 1] ?? 0);
    absorbed += Math.min(existing + plating - k, incoming) - Math.min(Math.max(0, existing - k), incoming);
  }
  return absorbed;
}
/**
 * Soldier's Stew: lasting value per point of the damage one more play of each Strike in the draw and
 * discard piles adds (card-model laterDamage), before fight length: about the damage weight of a boss
 * fight (0.8) once the boss fight-length factor (1.8) is applied, a little under it in shorter fights.
 */
export const STEW_LATER_SHARE = 0.45;
/** Snecko Oil: a hand card's expected cost this turn (0-3 at random). */
export const SNECKO_COST = 1.5;

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
  if (input.enemies.some((enemy) => enemy.revives || (enemy.stock ?? 0) > 0)) hp *= NEXT_PHASE_HP;
  if (input.raceEruption) damage *= ERUPTION_RACE_DAMAGE;
  if (input.damageScale !== undefined) damage *= input.damageScale;
  if (input.hpScale !== undefined) hp *= input.hpScale;
  // Cards that pay off on Vulnerable in the deck (Dismantle hits twice, Bully, Molten Fist doubles it,
  // Dominate): each stack is worth more (5R0G F24 T5: Molten Fist line over Bash+ for Vulnerable 3 at
  // the same HP; Dismantle x2 on T7 would have killed the beetle).
  const vulnerable = 2.5 + Math.min(4, 1.5 * (input.vulnerablePayoffs ?? 0));
  return { hp, damage, killBase: 6, killPerIncoming: 1.2, vulnerable, weak: 1.5, strength: 5 };
}

/**
 * Lasting value of the turn (Strength, powers), a potion's part like a card's. Until batch K a potion's part counted
 * 25% in hallway and unknown fights (POTION_LASTING: "the potion is worth more saved for an elite or the boss"), a
 * guessed keep-the-potion cost in the score; since 2026-09-30 the cost is the potion table's held value, taken off
 * the score on its own (evaluate: weights.hp x potionCost), the effect itself counted in full.
 */
function lastingValue(sim: Sim, weights: Weights): number {
  return weights.strength * sim.permStrength + sim.flat;
}

/**
 * What a point of lasting value (Outcome.lasting) adds to the score: it pays off over the rest of the fight, more in
 * long fights (boss 1.8, elite 1.4, hallway 0.8), less the later it comes (8% a turn, never below 40%); nothing on
 * the last turn before a time limit ends the fight.
 */
export function lastingScale(input: Pick<SolverInput, "fightKind" | "turn" | "enemies">): number {
  if (turnsLeftOf(input) === 1) return 0;
  const fightLength = input.fightKind === "boss" ? 1.8 : input.fightKind === "elite" ? 1.4 : 0.8;
  const earliness = Math.max(0.4, 1 - 0.08 * ((input.turn ?? 1) - 1));
  return fightLength * earliness;
}

/**
 * A point of lasting value in HP, as the score trades them (lastingScale over the HP weight): what the random potions'
 * Monte Carlo counts for a power or Strength a sample sets up (potion-mc.ts beatsDryLine).
 */
export function lastingHpPerPoint(input: SolverInput): number {
  return lastingScale(input) / weightsFor(input).hp;
}

/** Crab balance: HP gap between the two parts allowed before it costs (a same-turn double kill still fits). */
export const CRAB_GAP_FREE = 30;
/** Per point of gap past that, as a share of the damage weight (damage into the low part is worth half). */
export const CRAB_GAP_WEIGHT = 0.5;
/** A part this close above the start-of-turn AoE dies alone to any chip, while the other is above CRAB_HIGH_HP. */
export const CRAB_LOW_MARGIN = 10;
export const CRAB_HIGH_HP = 60;

/**
 * Crimson Mantle: each copy costs 1 HP at the start of our turn (and gives 7, or 10 upgraded, block).
 * The power only shows the block total, so the copies are counted from it. Logged (turns ended with no attack shown,
 * no Inferno, poison or Regen on us): CRIMSON_MANTLE_POWER 7 lost 1 at the next turn's start 160 times, 10 45 times,
 * 14 (two copies) 2 six times.
 */
export function mantleHpCost(amount: number): number {
  return amount > 0 ? Math.max(1, Math.floor(amount / 7)) : 0;
}

/** The most damage one Inferno adds to INFERNO_POWER (Inferno 6, Inferno+ 9: the card's InfernoPower). */
export const INFERNO_MOST_PER_COPY = 9;

/**
 * Inferno: each copy up loses 1 HP at the start of our turn (「在你的回合开始时，失去1点生命」, upgraded or not), one loss of
 * that much (its sweep comes once). The power shows only the copies' damage summed (6, Inferno+ 9), so the copies are
 * counted at the fewest that sum can be: the amount over the most one copy adds, rounded up (strategy/start-loss.ts
 * infernoCopies reads a larger InfernoPower off the state's Inferno cards). Logged (states.jsonl to 2026-10-03, turns
 * ended with no attack shown and no Crimson Mantle, Regen or poison on us): one copy (6, 9) lost 1 526 times, two (12,
 * 15, 18) lost 2 42 times and 4 once, never less. The planner had counted 1 whatever the copies (C4F14F3XPN0N F33
 * attempt 5: two Inferno+ up, 2 HP left after the enemy turn, T7's start took them).
 */
export function infernoCopiesOf(amount: number, mostPerCopy: number = INFERNO_MOST_PER_COPY): number {
  return amount > 0 ? Math.max(1, Math.ceil(amount / Math.max(1, mostPerCopy))) : 0;
}

/** Damage to every enemy at the start of our next turn, with an Inferno played this turn added. */
export function turnStartAoeAfter(sim: { inferno: number }, input: SolverInput): number {
  return (input.player.turnStartAoe ?? 0) + Math.max(0, sim.inferno - (input.player.inferno ?? 0));
}

/**
 * The block a line ends its turn with, before the enemies act, and its parts: the cards' block left, Feel No Pain's for the
 * Ethereal cards exhausted at the end (none after a won fight), Plating up and played this turn, Cloak Clasp's for the
 * cards held, Orichalcum's and Ripple Basin's (the whole-fight sim; with PASSIVE_PIECES, every turn the solver plays).
 */
function endBlockParts(sim: Sim, input: SolverInput, winsFight: boolean): { etherealBlock: number; platingNow: number; claspBlock: number; blockAtEnd: number } {
  const heldCards = [...sim.hand, ...sim.held];
  // Ethereal cards still in hand are exhausted at the end of the turn: Feel No Pain's Block for each, before the
  // enemies act (7KDMKN16GD6B: Dazed, Clumsy and Ascender's Bane never counted; HP forecasts 9-12 too low).
  const etherealBlock = winsFight || sim.feelNoPain <= 0 ? 0 : sim.feelNoPain * heldCards.filter((card) => card.ethereal && card.type !== "Potion").length;
  // Plating played this turn blocks at this turn's end too (SCBC F21 T2: Stone Armor, -18 predicted, -14).
  const platingNow = sim.steps.reduce((sum, step) => sum + (input.hand.find((card) => card.index === step.cardIndex && card.cardId === step.cardId)?.plating ?? 0), 0);
  // Cloak Clasp: block for each card still in hand at the end of the turn (drawn ones too).
  const claspBlock = (input.player.blockPerHeldCard ?? 0) * (heldCards.filter((card) => card.type !== "Potion").length + sim.drawnInHand);
  // Orichalcum when the cards left no block (PASSIVE_PIECES: Plating played this turn does not count, as Plating up never
  // did), Ripple Basin when no Attack was played.
  const beforeOrichalcum = sim.block + etherealBlock + (input.player.orichalcumPlating ? 0 : platingNow) + claspBlock;
  const relicEndBlock = (beforeOrichalcum <= 0 ? (input.player.orichalcum ?? 0) : 0) + (sim.attacksPlayed === 0 ? (input.player.rippleBasin ?? 0) : 0);
  const blockAtEnd = sim.block + etherealBlock + (input.player.endTurnBlock ?? 0) + platingNow + claspBlock + relicEndBlock;
  return { etherealBlock, platingNow, claspBlock, blockAtEnd };
}

function evaluate(sim: Sim, input: SolverInput, weights: Weights): Plan {
  // A Howl from Beyond exhausted this turn plays itself at the end of the turn, before the enemies act.
  const howls = sim.exhausted.filter((card) => card.cardId === "HOWL_FROM_BEYOND");
  if (howls.length > 0 && sim.enemies.some((enemy) => enemy.alive)) {
    sim = clone(sim);
    for (const howl of howls) {
      const perHit = attackShrunk(howl, sim, input.player)?.perHit ?? (howl.damage ?? 0) + sim.strength * (input.player.weak ? 0.75 : 1);
      for (const enemy of sim.enemies) if (enemy.alive) hitEnemy(sim, enemy, perHit, 1, input.player, false, howl.type === "Attack");
    }
  }
  // Ethereal cards still in hand are exhausted at the end of the turn, before the enemies act: each one's Feel
  // No Pain Block (etherealBlock, below) is a Block gain, and Juggernaut hits a random enemy for each.
  const etherealHeld = [...sim.hand, ...sim.held].filter((card) => card.ethereal && card.type !== "Potion").length;
  if (etherealHeld > 0 && sim.feelNoPain > 0 && (input.player.juggernaut ?? 0) > 0 && sim.enemies.some((enemy) => enemy.alive)) {
    sim = clone(sim);
    for (let k = 0; k < etherealHeld; k += 1) {
      const victim = randomVictim(sim);
      if (victim) hitEnemyRaw(sim, victim, input.player.juggernaut ?? 0);
    }
  }
  // PASSIVE_PIECES: Parrying Shield at the turn's end (10+ block, Plating's end-of-turn block counted: Q8XR6EXAF6QV F11
  // T4, 8 + Plating 2 fired) hits a random enemy, through its block, before the enemies act; one it kills does not attack.
  const parry = input.player.parryingShield;
  if (parry && sim.enemies.some((enemy) => enemy.alive) && endBlockParts(sim, input, false).blockAtEnd >= parry.block) {
    sim = clone(sim);
    const victim = randomVictim(sim);
    if (victim) hitEnemyRaw(sim, victim, parry.damage);
  }
  // Y6GM2CHWJBEY F17 T7 / T082DRCUHRRD F33 T9: poison resolves before the enemy attacks.
  if (sim.enemies.some((enemy) => enemy.alive && (enemy.poison ?? 0) > 0)) {
    sim = clone(sim);
    const triggers = 1 + sim.poisonExtraTriggers;
    // silent-0174/0175: D4LJ9QMGFB8Q F20 T4 and 4Y94N8RDPGPM F30 T2 retain
    // two/three HP after one enemy-turn poison trigger against Hard to Kill 9.
    // Other caps, immediate triggers and multi-trigger combinations are unverified.
    for (const enemy of sim.enemies) triggerPoison(sim, enemy, triggers, triggers === 1 && enemy.perHitCap === 9 ? 9 : Infinity);
  }
  const living = sim.enemies.filter((enemy) => enemy.alive);
  // A phase boss at 0 HP revives next turn (it does not attack that turn): a kill, not a win.
  // An Axebot with Stock left comes straight back the same way (Boot Up, no attack this turn).
  const restocked = sim.enemies.filter((enemy) => !enemy.alive && (enemy.stock ?? 0) > 0 && input.enemies.find((start) => start.index === enemy.index)!.hp > 0);
  // An enemy that spawns others on death (Phrog Parasite, Gremlin Merc): a kill, not a win.
  const spawning = sim.enemies.filter((enemy) => !enemy.alive && enemy.spawnsOnDeath && input.enemies.find((start) => start.index === enemy.index)!.hp > 0);
  const nextPhase = restocked.length > 0 || spawning.length > 0 || sim.enemies.some((enemy) => !enemy.alive && enemy.revives);
  // Waterfall Giant (Steam Eruption, 「被击杀时，在你的下一回合结束时造成伤害」): killed, it stays as a husk
  // (999,999,999 HP) that explodes for its eruption stacks at the end of our NEXT turn, through that
  // turn's block (N7SAK F17: killed on T14 at eruption 51, T15 24 HP + 18 block, dead 9 short). A kill,
  // not a win: the fight goes on until the explosion is survived.
  const erupting = sim.enemies.filter((enemy) => !enemy.alive && (enemy.eruption ?? 0) > 0 && enemy.maxHp < 1_000_000 && input.enemies.find((start) => start.index === enemy.index)!.hp > 0);
  const explodesNext = erupting.reduce((sum, enemy) => sum + (enemy.eruption ?? 0), 0);
  const winsFight = !nextPhase && erupting.length === 0 && (living.length === 0 || (living.every((enemy) => enemy.minion) && sim.enemies.some((enemy) => !enemy.minion)));
  // Status cards still in hand at end of turn (Toxic, Burn, …) hurt; unplayable ones always stay.
  // Damage-type penalties (Burn) meet block like an attack; HP-loss ones (Beckon) go straight to HP.
  const heldCards = [...sim.hand, ...sim.held];
  const heldCount = heldCards.filter((card) => card.type !== "Potion").length + sim.drawnInHand;
  const heldLoss = (card: CardModel): number => (card.heldHpLoss ?? 0) + (card.heldHpLossPerCard ?? 0) * heldCount;
  const heldHpLoss = winsFight ? 0 : heldCards.reduce((sum, card) => sum + heldLoss(card), 0);
  // Withering Presence: a Wither added by this turn's cards is held at the end of it (TQX5 T5: planned
  // -3, the 6th card added a Wither and the turn cost 9).
  const wither = input.wither;
  const withersAdded =
    wither && wither.every > 0
      ? Math.floor((wither.played + sim.played - (input.cardsPlayedThisTurn ?? 0)) / wither.every) - Math.floor(wither.played / wither.every)
      : 0;
  const heldPenalty =
    heldCards.reduce((sum, card) => sum + (card.heldPenalty ?? 0) - (card.heldHpLoss ?? 0), 0) + (winsFight ? 0 : withersAdded * (wither?.damage ?? 0));
  // The cards that damage: named in the notes (a Wither, Toxic x2 were all "Burn": YVYZ F48 T6, 3RME F30, NH8A F31).
  const heldDamageFrom = countedNames([
    ...heldCards.filter((card) => (card.heldPenalty ?? 0) - (card.heldHpLoss ?? 0) > 0).map((card) => card.name),
    ...(winsFight || (wither?.damage ?? 0) <= 0 ? [] : Array.from({ length: withersAdded }, () => "Wither added by this turn's cards")),
  ]);
  const heldHpLossFrom = countedNames(heldCards.filter((card) => heldLoss(card) > 0).map((card) => card.name));
  const hits = winsFight ? [] : incomingHits(sim, input);
  const incomingRaw = winsFight ? 0 : hits.reduce((sum, hit) => sum + hit.amount, 0) + heldPenalty;
  // Disintegration lands at the end of our turn and hits block first (DG1 T5: block 8 -> 2, HP
  // unchanged); what block it leaves then meets the enemy attacks.
  // Plating's later turns: the HP it can absorb (a potion's part like a card's).
  const platingHp = winsFight ? 0 : platingAbsorbed(sim.plating, input);
  const platingValue = sim.plating > 0 ? weights.hp * platingHp : 0;
  const { etherealBlock, platingNow, claspBlock, blockAtEnd } = endBlockParts(sim, input, winsFight);
  // What the mod's lethal flag (the intents against the block up now) leaves out (Outcome.endTurnGuards).
  const endTurnGuards = winsFight
    ? []
    : [
        { what: "Plating/Metallicize block at the turn's end", amount: input.player.endTurnBlock ?? 0 },
        { what: "Plating played this turn, blocking at its end", amount: platingNow },
        { what: "Feel No Pain block for the Ethereal cards exhausted at the end", amount: etherealBlock },
        { what: "Cloak Clasp block for the cards held", amount: claspBlock },
        { what: "Regen healing before the enemy acts", amount: Math.max(0, Math.min(sim.regen, input.player.maxHp - sim.hp)) },
        { what: "Buffer stacks, each preventing a whole HP loss", amount: sim.buffer },
      ].filter((guard) => guard.amount > 0);
  const disintegration = winsFight ? 0 : input.player.endTurnHpLoss ?? 0;
  const blockLeft = Math.max(0, blockAtEnd - disintegration);
  // silent-0177/0178: only plain enemy hits against block were observed. Do not infer
  // the order with Buffer, other reductions, self damage or damaging held cards.
  const rodVerified = input.player.tungstenRod === true && (input.player.buffer ?? 0) === 0 && sim.buffer === 0 &&
    sim.bufferSpent === 0 && sim.hpLossEvents === 0 &&
    !input.player.intangible && !sim.intangible && input.player.hpLossCap == null &&
    heldPenalty === 0 && heldHpLoss === 0 && disintegration === 0 && input.player.hp === sim.hp &&
    (input.player.startTurnHpLoss ?? 0) + sim.mantles + sim.infernos === 0;
  let rodLosses: number[] | null = null;
  if (rodVerified) {
    let pool = blockLeft;
    rodLosses = hits.map((hit) => {
      const absorbed = Math.min(pool, hit.amount);
      pool -= absorbed;
      return Math.max(0, hit.amount - absorbed - 1);
    });
  }
  // Buffer: each stack left prevents the next HP loss, whole: the first hits that get past the block,
  // in order (a held Burn at the end of our turn first).
  const incomingAfterBlock = rodLosses !== null ? rodLosses.reduce((sum, loss) => sum + loss, 0)
    : sim.buffer > 0 && !winsFight ? bufferedLoss([heldPenalty, ...hits.map((hit) => hit.amount)], blockLeft, sim.buffer) : Math.max(0, incomingRaw - blockLeft);
  // Imbalanced: an enemy whose every hit meets block (in attack order) is stunned for its next move.
  const stunned = winsFight ? [] : imbalanceStuns(sim, hits, blockLeft, sim.buffer);
  // Regen heals at the end of our turn, before the enemy attacks (never past max HP; no end of turn after a win).
  const regenHeal = winsFight ? 0 : Math.max(0, Math.min(sim.regen, input.player.maxHp - sim.hp));
  const selfLoss = input.player.hp - sim.hp - regenHeal;
  // Crimson Mantle takes its HP at the start of our next turn, before any block (YP9 T5: 1 HP left,
  // no attack coming, the Mantle killed us). The mod's lethal warning does not see it either. It is
  // part of this turn's HP loss, whether the Mantle is already up or played now (Y83U F30 T3: a
  // Mantle plan showed hp_lost 0).
  // Each Inferno played this turn adds its own 1 HP at the start of every later turn, a second one too (the copies up
  // are in startTurnHpLoss: C4F14F3XPN0N F33, two Inferno+ took 2; a second Inferno had looked free).
  const startTurnLoss = winsFight ? 0 : (input.player.startTurnHpLoss ?? 0) + sim.mantles + sim.infernos;
  const turnLoss = selfLoss + incomingAfterBlock + Math.max(0, disintegration - blockAtEnd) + heldHpLoss;
  // Self-Forming Clay: next turn's block, CLAY_BLOCK for each HP loss of this turn (ours so far, a held card's
  // HP loss, Disintegration past block, each held Burn or enemy hit past block and Buffer) on top of what is owed.
  const clayEvents = winsFight
    ? 0
    : sim.hpLossEvents + heldCards.filter((card) => heldLoss(card) > 0).length + (disintegration > blockAtEnd ? 1 : 0) +
      (rodLosses !== null ? rodLosses.filter((loss) => loss > 0).length : lossesPast([heldPenalty, ...hits.map((hit) => hit.amount)], blockLeft, sim.buffer));
  const clayBlockNext = winsFight || (input.player.clayBlock ?? 0) <= 0 ? 0 : (input.player.clayPending ?? 0) + (input.player.clayBlock ?? 0) * clayEvents;
  const cap = input.player.hpLossCap;
  let hpLoss = (cap !== null && cap !== undefined ? Math.min(turnLoss, cap) : turnLoss) + startTurnLoss;
  let hpAfter = input.player.hp - hpLoss;
  // Sandpit (TTVY T6: 33 HP and 20 block, Frantic Escape left in hand, eaten at count 0).
  const sandpits = sim.enemies.filter((enemy) => enemy.alive && (enemy.sandpit ?? 0) > 0).map((enemy) => enemy.sandpit!);
  const sandpitAfter = winsFight || sandpits.length === 0 ? null : Math.min(...sandpits) + sim.escapes - 1;
  const gambitPlayed = sim.steps.some((step) => step.cardId === "THE_GAMBIT");
  const otherDeath = ((input.player.gambit === true || gambitPlayed) && incomingAfterBlock > 0) || (sandpitAfter !== null && sandpitAfter <= 0);
  // A revive held (Fairy in a Bottle, Lizard Tail): the turn's losses one by one, in the order they land (our
  // own turn, held cards and Disintegration at its end, the enemy hits past block and Buffer, next turn's
  // start), each one that would take us to 0 caught by the next revive. Its HP counts as lost (hpLoss).
  let revived: Outcome["revived"];
  const revives = input.player.revives ?? [];
  if (hpAfter <= 0 && !otherDeath && revives.length > 0) {
    const enemyTurn: number[] = rodLosses !== null ? [...rodLosses] : [];
    if (rodLosses === null) {
      let pool = blockLeft;
      let stacks = winsFight ? 0 : sim.buffer;
      for (const amount of [heldPenalty, ...hits.map((hit) => hit.amount)]) {
        if (amount <= 0) continue;
        const absorbed = Math.min(pool, amount);
        pool -= absorbed;
        const rest = amount - absorbed;
        if (rest <= 0) continue;
        if (stacks > 0) {
          stacks -= 1;
          continue;
        }
        enemyTurn.push(rest);
      }
    }
    const turnLosses = [selfLoss, heldHpLoss, Math.max(0, disintegration - blockAtEnd), ...enemyTurn];
    // Beating Remnant: at most `cap` of this turn's losses land (next turn's start is apart, as above).
    let room = cap !== null && cap !== undefined ? cap : Infinity;
    const capped = turnLosses.map((loss) => {
      const landed = Math.max(0, Math.min(loss, room));
      room -= landed;
      return landed;
    });
    const through = reviveThrough(input.player.hp, [...capped, startTurnLoss], revives);
    if (through.hp > 0 && through.used.length > 0) {
      const reviveHp = through.used.reduce((sum, revive) => sum + revive.hp, 0);
      revived = { names: through.used.map((revive) => revive.name), sources: through.used.map((revive) => revive.source), reviveHp, hp: through.hp, ownLoss: Math.max(0, Math.min(input.player.hp - 1, selfLoss)) };
      hpLoss = input.player.hp + reviveHp - through.hp;
      hpAfter = input.player.hp - hpLoss;
    }
  }
  const dies = (hpAfter <= 0 && revived === undefined) || otherDeath;

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
      !((enemy.stock ?? 0) > 0) &&
      !(enemy.reattach && !allSegmentsDead) &&
      !(crabs.includes(enemy.index) && !allCrabsDead) &&
      input.enemies.find((start) => start.index === enemy.index)!.hp > 0,
  );
  let score = 0;
  if (dies) score -= 100_000;
  // A stunned Imbalanced enemy skips its next move: that hit is saved (at HP weight).
  const stunSaved = stunned.reduce((sum, enemy) => sum + (enemy.imbalanced ?? 0), 0);
  if (!dies) score += weights.hp * stunSaved;
  if (winsFight) score += 10_000;
  // A Giant kill ends the fight once its explosion is survived: HP (plus block that stays) above the
  // blast is a win next turn; within a hand's block of it (ERUPTION_NEXT_BLOCK) a likely one; below,
  // the blast past HP and that block counts as HP lost.
  if (explodesNext > 0 && !dies) {
    const kept = input.player.keepsBlock ? Math.max(0, blockLeft - incomingRaw) : 0;
    const margin = hpAfter + kept - explodesNext;
    if (margin > 0) score += 10_000;
    else if (margin + ERUPTION_NEXT_BLOCK > 0) score += 5_000;
    else score -= weights.hp * -(margin + ERUPTION_NEXT_BLOCK);
  }
  score -= weights.hp * hpLoss;
  // Whole boss fights (nextHit, never live): the enemies' next attacks are known a turn ahead from the move model (the
  // Rocket's Laser after Charge Up, the Torch Head's Beam). HP lost now that leaves us below what the next hit takes
  // through a fresh hand's block is HP the next turn cannot spare, as the Giant's eruption rule below counts it.
  if (input.nextHit && !winsFight && !dies && hpLoss > 0) score -= weights.hp * input.nextHit.weight * nextHitShortfall(input.nextHit, living, hpAfter, hpLoss);
  // A potion drunk is HP paid later (potion-cost.ts, Dai 2026-09-30): its held value, at the HP weight. Until batch K a
  // hallway potion's lasting part counted 25% (a guessed number); since then potions were free; now the table's value.
  score -= weights.hp * sim.potionCost;
  // A Wither stays in the deck and comes back bigger (+3 each Increasing Intensity): price one more
  // held turn at its grown damage (Y0KJ F48: 2 Withers from T2 were held again on T7 for 18; the boss
  // died at 32/512 HP with us).
  if (!winsFight && withersAdded > 0) score -= weights.hp * withersAdded * ((wither?.damage ?? 0) + 3) * WITHER_FUTURE_REDRAWS;
  // Paying HP on a turn with nothing incoming, to end close to next turn's hit (JGJS F24 T1).
  if (!winsFight && selfLoss > 0 && input.nextIncoming !== undefined && input.nextIncoming > 0 && quietTurn(input) && hpAfter <= input.nextIncoming + NEXT_HIT_MARGIN) {
    score -= weights.hp * selfLoss * (QUIET_SELF_DAMAGE_WEIGHT - 1);
  }
  // Ending at 1 leaves next turn a must-Escape turn (or death if none is drawn); the boss has 321 HP,
  // so the countdown outlasts any damage race.
  if (sandpitAfter === 1) score -= weights.hp * 15;
  // Each Frantic Escape is one more turn before the pit eats us: about a turn of damage against a
  // 321 HP boss (Y08T F33: Escapes held on T2 and T3 at pit 3-4, eaten at T5 with 48 HP, boss 216/321).
  if (!winsFight && sandpitAfter !== null) score += sim.escapes * weights.damage * SANDPIT_TURN_DAMAGE;
  // An enraged crab hits every later turn with the extra Strength (the lasting-Strength line below
  // counts 3 per point; this adds about two more attacks' worth at HP weight).
  if (sim.enraged > 0 && !winsFight) score -= weights.hp * sim.enraged * CRAB_RAGE_STRENGTH * 2;
  // Start-of-turn AoE (Mercury Hourglass, Inferno's own 1 HP loss) hits every enemy at the start of our
  // next turn: one left at or below it dies then (after its attack). A crab dying that way alone
  // enrages the other just the same (PLC F33 T9: Crusher left at 2 HP, the Hourglass killed it, Rocket
  // got 99 Block and a 41-damage Laser; 9XZX T7: Crusher left at 3, Inferno's 6 killed it).
  const startDamage = turnStartAoeAfter(sim, input);
  const startTurnKills = winsFight || startDamage <= 0 ? [] : living.filter((enemy) => enemy.hp <= startDamage);
  const survivors = living.filter((enemy) => !startTurnKills.includes(enemy));
  const rageNext = startTurnKills.some((enemy) => crabs.includes(enemy.index));
  if (rageNext) {
    const enragedNext = survivors.filter((enemy) => enemy.crabRage).length;
    score -= weights.hp * enragedNext * CRAB_RAGE_STRENGTH * 2;
  }
  // Crab balance: both parts alive and not both killed this turn. The only clean kill is both in one
  // turn, so a wide HP gap makes that harder, and a part left low dies alone to the next AoE (9XZX:
  // Crusher 155 -> 3 while Rocket stayed at 140, Inferno killed it; W6F4 won by keeping them level).
  const livingCrabs = living.filter((enemy) => enemy.crabRage && crabs.includes(enemy.index));
  if (!winsFight && livingCrabs.length === 2) {
    const [lower, higher] = [...livingCrabs].sort((a, b) => a.hp - b.hp);
    score -= weights.damage * CRAB_GAP_WEIGHT * Math.max(0, higher!.hp - lower!.hp - CRAB_GAP_FREE);
    if (!rageNext && lower!.hp <= startDamage + CRAB_LOW_MARGIN && higher!.hp > CRAB_HIGH_HP) score -= weights.hp * CRAB_RAGE_STRENGTH * 2;
  }
  // Waterfall Giant: its explosion is the Steam Eruption stacks (+3 a turn while it lives), and next
  // turn's hand blocks ~12 of it. Below that line every HP lost now is a lost fight (G7EJ, WQTRX:
  // both went into the explosion with too little HP after racing damage), so HP counts double.
  // A Giant killed this turn stops growing: its blast is the stacks it died with.
  const eruption = Math.max(0, ...sim.enemies.filter((enemy) => (enemy.eruption ?? 0) > 0).map((enemy) => enemy.eruption! + (enemy.maxHp >= 1_000_000 || !enemy.alive ? 0 : 3)));
  // Racing a Giant that is too slow to kill (raceEruption): HP spent on damage is the way through.
  // Racing still keeps enough HP for the next hit before the explosion (J8E4 F17 T10: the last 25 of 28
  // HP spent without a kill, the Pressure Gun and explosion followed).
  const raceSafe = input.raceEruption === true && hpAfter >= (input.nextIncoming ?? 0) + 5;
  if (!winsFight && eruption > 0 && hpAfter < eruption - 12 && !raceSafe) score -= weights.hp * hpLoss;
  // Retaliation (Flame Barrier, Thorns) dealt on the enemy turn, per attacker: the rollout takes it off their HP.
  const retaliated: { index: number; amount: number; slipperyUsed?: number }[] = [];
  if (sim.retaliate > 0 && !winsFight) {
    // Retaliation lands during the enemy turn: count it as damage, per hit that lands (an attacker it
    // kills stops attacking), capped by the attacker's HP. Slippery: each hit's loss is 1 and takes a stack
    // (W6F4YXF3MT7A F17 Vantom: Thorns 3 into Slippery 3 took 1 HP and one stack). Hardened Shell: at most its
    // cap on the enemy turn, a turn of its own (TQCZFBK7T09Y F11 T1: 20 lost on our turn, then 3 of Thorns).
    let back = 0;
    for (const enemy of living) {
      const landed = hits.filter((hit) => hit.enemy === enemy.index).length;
      const each = enemy.intangible ? Math.min(1, sim.retaliate) : sim.retaliate;
      const slipperyUsed = Math.min(landed, Math.max(0, enemy.slippery ?? 0));
      let amount = slipperyUsed + (landed - slipperyUsed) * each;
      if (enemy.hpLossCap !== null && enemy.hpLossCap !== undefined) amount = Math.min(amount, enemy.hpLossCap);
      amount = Math.min(Math.max(0, enemy.hp), amount);
      back += amount;
      if (amount > 0) retaliated.push({ index: enemy.index, amount, ...(slipperyUsed > 0 ? { slipperyUsed } : {}) });
    }
    score += weights.damage * back;
  }
  let woundsAdded = 0;
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
      woundsAdded += wounds;
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
  // Damage that does not stick is worth nothing. An illusion comes back at full HP next turn whether it
  // was killed or not (VKPX F22: ~10 turns of attacks into a 21 HP Parafright while the Obscura sat at
  // 68; XJWF F22: killed 7 turns running, 147 damage into it, the Obscura only 96 -> 76): killing it is
  // worth this turn's attack it no longer makes (hpLoss), never its HP. A segment
  // that dies while another lives comes back at the Reattach HP (0NG F29: an 18 HP segment killed,
  // back at 25), so its damage is only worth what it takes off that. Damage into a segment that
  // lives does stick (the logs show it carried over turn to turn).
  const lostDamage = sim.enemies.reduce((sum, enemy) => {
    const start = input.enemies.find((entry) => entry.index === enemy.index)!;
    const dealt = Math.max(0, start.hp - Math.max(0, enemy.hp));
    if (enemy.illusion) return sum + dealt;
    if (enemy.reattach && !enemy.alive && !allSegmentsDead) {
      const kept = Math.max(0, start.hp - (enemy.reattachHp ?? start.hp));
      return sum + Math.max(0, dealt - kept);
    }
    return sum;
  }, 0);
  // Minions leave when the last non-minion dies, so their HP is not what ends the fight (QE4K F21 T6:
  // 34 damage into Larvae while the 36 HP Ovicopter lived; it laid eggs and hit for 24 over the next
  // turns). While a non-minion lives, damage into a minion that survives the turn counts only
  // MINION_CHIP of its value; a minion kill keeps its kill bonus below (the attack it no longer makes).
  const leaderAlive = living.some((enemy) => !enemy.minion);
  const minionChip = !leaderAlive
    ? 0
    : sim.enemies.reduce((sum, enemy) => {
        if (!enemy.minion || !enemy.alive || enemy.illusion || enemy.index === input.focusIndex) return sum;
        const start = input.enemies.find((entry) => entry.index === enemy.index)!;
        return sum + (1 - MINION_CHIP) * Math.max(0, start.hp - Math.max(0, enemy.hp));
      }, 0);
  score += weights.damage * (sim.damageDealt - huskDamage - lostDamage - minionChip);
  // With several enemies, concentrated damage beats the same damage spread (GMT2 F39 T1: 26 split vs
  // 26 focused scored equal, the split left two cubes at 38 and 47 and none died on T2).
  if (!winsFight && input.enemies.length > 1) {
    const perEnemy = sim.enemies.map((enemy) => Math.max(0, input.enemies.find((start) => start.index === enemy.index)!.hp - Math.max(0, enemy.hp)));
    score += weights.damage * CONCENTRATION_BONUS * Math.max(0, ...perEnemy);
  }
  if (input.focusIndex !== undefined && !winsFight) {
    const focus = sim.enemies.find((enemy) => enemy.index === input.focusIndex);
    const start = input.enemies.find((entry) => entry.index === input.focusIndex);
    // Not on a Kaiser Crab claw: the crab is won by keeping both claws level, and the focus bonus
    // cancelled the gap penalty (GGF8 F33: focus Rocket, the gap grew 30 -> 73, Rocket died alone).
    // Nor on a Decimillipede segment: one killed alone reattaches (4VC5 F24: focus Middle, 66 of 99
    // damage into it, it died alone on T2 and came back at 25 on T4).
    if (focus && start && !focus.crabRage && !focus.reattach) score += weights.damage * (input.focusWeight ?? FOCUS_BONUS) * Math.max(0, start.hp - Math.max(0, focus.hp));
  }
  // The Bomb: its damage lands on every enemy a few turns later, unless the fight is over by then.
  if (sim.bombs > 0 && !winsFight) {
    const reach = living.filter((enemy) => enemy.maxHp < 1_000_000).reduce((sum, enemy) => sum + Math.min(enemy.hp, sim.bombs), 0);
    score += weights.damage * reach * (input.fightKind === "boss" || input.fightKind === "elite" ? BOMB_SURE : BOMB_SURE * 0.6);
  }
  // Damage into an enemy that scales every turn is worth more: blocking while it grows lost run 7.
  for (const enemy of sim.enemies) {
    const start = input.enemies.find((entry) => entry.index === enemy.index)!;
    // Not an illusion: its HP comes back (a Parafright buffed by the Obscura has Strength 5+).
    if (start.scaling && !start.illusion) score += weights.damage * 0.6 * Math.max(0, start.hp - Math.max(0, enemy.hp));
  }
  for (const enemy of kills) {
    const start = input.enemies.find((entry) => entry.index === enemy.index)!;
    const threat = start.attacks.reduce((sum, attack) => sum + attack.damage * attack.hits, 0);
    score += weights.killBase + weights.killPerIncoming * threat;
  }
  // Waking a sleeper with chip damage hands it the turns it would have slept (Z2H3 F17 T1: Bash broke
  // the Matriarch's 12 Plating, 12 HP off 222, and it attacked from T2 instead of T4). Worth it only
  // for a big hit.
  let sleepCost = 0;
  for (const enemy of living) {
    const start = input.enemies.find((entry) => entry.index === enemy.index)!;
    if (!enemy.sleepLost || start.attacks.length > 0) continue;
    if (start.hp - enemy.hp >= start.hp * SLEEP_BIG_HIT) continue;
    sleepCost += weights.hp * enemy.sleepLost * sleepTurnDamage(start);
  }
  score -= sleepCost;
  // Debuffs only matter on enemies that survive the turn.
  let enrageCost = 0;
  for (const enemy of living) {
    const start = input.enemies.find((entry) => entry.index === enemy.index)!;
    const addedVulnerable = Math.max(0, enemy.vulnerable - start.vulnerable);
    const addedWeak = Math.max(0, enemy.weak - start.weak);
    score += weights.vulnerable * Math.min(addedVulnerable, 3);
    // Demise: HP lost at the end of each of its turns, about three of them counted.
    const addedDemise = Math.max(0, (enemy.demise ?? 0) - (start.demise ?? 0));
    if (addedDemise > 0) score += weights.damage * Math.min(enemy.hp, addedDemise * DEMISE_TURNS);
    if (start.attacks.length > 0 || enemy.weak > 0) score += weights.weak * Math.min(addedWeak, 3);
    // Shrink's later turns (this turn's cut is in the incoming hits): like Weak's, a little more (30% vs 25%).
    const addedShrink = Math.max(0, (enemy.shrink ?? 0) - (start.shrink ?? 0));
    if (addedShrink > 0) score += weights.weak * 1.2 * Math.min(addedShrink - 1, 3);
    // Fight Me: the enemy's Strength is a lasting cost. Enrage's is weighed by the attacks it raises.
    const strengthCost = enemy.strengthDelta * ((enemy.enrage ?? 0) > 0 ? Math.max(3, weights.hp * ENRAGE_FUTURE_HITS) : 3);
    score -= strengthCost;
    if ((enemy.enrage ?? 0) > 0) enrageCost += strengthCost;
  }
  // The last turn before a time limit ends the fight: nothing that pays on a later turn counts.
  const later = turnsLeftOf(input) === 1 ? 0 : 1;
  if (!winsFight) {
    score += lastingValue(sim, weights) * lastingScale(input);
    score += platingValue * later;
    score += drawScoreAt(sim.draws, sim.energy);
    // Pael's Tear: energy left unspent gives the next turn its extra energy, valued as Radiant Tincture's later energy.
    score += later * nextTurnEnergyOf(sim, input) * RADIANCE_ENERGY_VALUE;
    // Exhausted cards are gone for the fight; junk leaves its held penalty behind (counted above).
    score -= later * sim.exhausted.reduce((sum, card) => sum + Math.max(0, exhaustValue(card, weights)), 0);
    // An exhausted Howl fires once (counted above) and goes to the discard pile, not every turn after
    // (N1V2 F48: exhausted T4, fired once, back in hand T7).
    // A Mantle played this low bleeds us out before its block pays (YP9 T3: 30 HP, Mantle over
    // Defend+ into a 28 hit, 2 HP left, then the Mantle's own HP cost killed us).
    if (sim.mantles > 0 && hpAfter <= 10) score -= sim.mantles * (MANTLE_VALUE * lastingScale(input) + weights.hp * 5);
  }
  // After The Gambit every unblocked hit for the rest of the fight kills: a last resort only.
  if (gambitPlayed && !winsFight) score -= weights.hp * GAMBIT_COST;
  score += sim.feedKills * 12;
  // Personal Hive: each hit clogs a later hand with a Dazed (M812 F28: 2-4 Dazed per hand from T4).
  // A thin draw pile draws them next turn (CY8U F25 T6: 6 Dazed into a 1-card pile, T7 hand 5/5 Dazed).
  if (!winsFight) score -= DAZED_COST * sim.dazedAdded * (input.drawPile !== undefined && input.drawPile.length < 10 ? 2 : 1);

  return {
    steps: sim.steps,
    score,
    outcome: {
      winsFight,
      hpLoss,
      hpAfter,
      dies,
      // Dead on our own turn, by our own cards (Blood Wall's cost at 2 HP: JSA5K8YZ9RXV F48 T6), before the enemy acts.
      ...(dies && !winsFight && sim.hp <= 0 ? { diesOwnTurn: true as const } : {}),
      ...(revived ? { revived } : {}),
      blockGained: sim.blockGained + etherealBlock,
      // Damage into a Giant husk is worth nothing (scored so above) and is not shown as dealt either (YQL8D59999AX
      // F17 T8: every line on the blast turn read "dmg 88", "瀑布巨兽 999999889 HP").
      damageDealt: sim.damageDealt - huskDamage,
      kills: kills.map((enemy) => enemy.name),
      restocked: restocked.map((enemy) => enemy.name),
      ...(spawning.length > 0 ? { spawns: spawning.map((enemy) => `${enemy.name}: ${enemy.spawnsOnDeath}`) } : {}),
      enemyHpAfter: sim.enemies
        .filter((enemy) => input.enemies.find((start) => start.index === enemy.index)!.hp > 0)
        .map((enemy) => ({
          index: enemy.index,
          name: enemy.name,
          hp: Math.max(0, enemy.hp),
          vulnerable: enemy.vulnerable,
          weak: enemy.weak,
          ...((enemy.poison ?? 0) > 0 || (input.enemies.find((start) => start.index === enemy.index)?.poison ?? 0) > 0 ? { poison: enemy.poison ?? 0 } : {}),
          block: Math.max(0, enemy.block),
          artifact: enemy.artifact,
          slippery: enemy.slippery ?? 0,
          curlUp: enemy.curlUp ?? 0,
          flutter: enemy.flutter ?? 0,
          strengthGained: enemy.strengthDelta,
          shrink: enemy.shrink ?? 0,
          ...((enemy.demise ?? 0) > 0 ? { demise: enemy.demise } : {}),
          ...(enemy.ravenousStunned ? { stunned: true } : {}),
          ...stripStunOf(enemy, input),
          ...(enemy.moveOnStrip ? moveRuleOf(enemy, input) : {}),
          ...(enemy.moveOnDeath ? deathMoveOf(enemy, sim, input) : {}),
          ...(enemy.maxHp >= 1_000_000 ? { husk: true } : {}),
        })),
      incomingAfterBlock,
      energyLeft: sim.energy,
      vulnerableApplied: sim.vulnerableApplied,
      weakApplied: sim.weakApplied,
      strengthGained: sim.permStrength,
      cardsDrawn: sim.cardsDrawn,
      unknownCards: input.player.tungstenRod && !rodVerified && !winsFight
        ? [...sim.unknown, "钨合金棍（自身失血或其他减损交互未验证）"] : sim.unknown,
      sandpitAfter,
      ...(stunned.length > 0 ? { stuns: stunned.map((enemy) => enemy.name), stunIndexes: stunned.map((enemy) => enemy.index), stunSaved } : {}),
      ...(sim.bufferSpent > 0 ? { bufferSpentBySelf: sim.bufferSpent } : {}),
      startTurnKills: startTurnKills.map((enemy) => enemy.name),
      withersAdded,
      ...(endTurnGuards.length > 0 ? { endTurnGuards } : {}),
      ...(sim.dazedAdded > 0 && !winsFight ? { dazedAdded: sim.dazedAdded } : {}),
      ...(woundsAdded > 0 ? { woundsAdded } : {}),
      sleepCost,
      // Enrage's Strength is lasting too, the other way: a line feeding it cannot dominate on this axis.
      lasting: lastingValue(sim, weights) - enrageCost + platingValue,
      blockWasted: winsFight ? 0 : Math.max(0, blockLeft - incomingRaw),
      ...(explodesNext > 0 ? { explodesNext, eruptionMargin: hpAfter + (input.player.keepsBlock ? Math.max(0, blockLeft - incomingRaw) : 0) - explodesNext } : {}),
      ...(sim.exhausted.length > 0 ? { exhausted: sim.exhausted.map((card) => card.index) } : {}),
      ...(sim.drawnExhausted > 0 ? { drawnExhausted: sim.drawnExhausted } : {}),
      ...(sim.randomExhausts > 0 ? { randomExhausts: sim.randomExhausts } : {}),
      ...(sim.thrashGrowth.length > 0 ? { thrashGrowth: sim.thrashGrowth } : {}),
      ...(sim.maulGrowth > 0 ? { maulGrowth: sim.maulGrowth } : {}),
      ...(sim.thrashRandom.length > 0 ? { thrashRandom: sim.thrashRandom } : {}),
      ...(sim.freeAttacks > 0 ? { freeAttacksLeft: sim.freeAttacks } : {}),
      ...(sim.relicAttacks > 0 ? { attackPlays: sim.relicAttacks } : {}),
      ...(input.player.tuningFork && input.player.tuningFork.every > 0 ? { tuningForkCount: (input.player.tuningFork.count + sim.relicSkills) % input.player.tuningFork.every } : {}),
      ...(sim.lastingDrinks > 0 ? { lastingDrinks: sim.lastingDrinks } : {}),
      ...(sim.potionCost > 0 ? { potionCost: sim.potionCost } : {}),
      ...(sim.potionHeal > 0 ? { potionHeal: sim.potionHeal } : {}),
      ...(retaliated.length > 0 ? { retaliated } : {}),
      ...(clayBlockNext > 0 ? { clayBlockNext } : {}),
      ...(heldPenalty > 0 && !winsFight ? { heldDamage: heldPenalty, heldDamageFrom } : {}),
      ...(heldHpLoss > 0 ? { heldHpLoss, heldHpLossFrom } : {}),
      ...(!winsFight && nextTurnEnergyOf(sim, input) > 0 ? { nextTurnEnergy: nextTurnEnergyOf(sim, input) } : {}),
    },
  };
}

/** How many of these losses, taken in order, get past the block and then the Buffer stacks: each one an HP loss. */
function lossesPast(amounts: number[], block: number, buffer: number): number {
  let pool = block;
  let stacks = buffer;
  let count = 0;
  for (const amount of amounts) {
    if (amount <= 0) continue;
    const absorbed = Math.min(pool, amount);
    pool -= absorbed;
    if (amount - absorbed <= 0) continue;
    if (stacks > 0) {
      stacks -= 1;
      continue;
    }
    count += 1;
  }
  return count;
}

/** Pael's Tear's extra energy next turn for a line ending with `sim.energy` unspent (0 without the relic or energy). */
function nextTurnEnergyOf(sim: Pick<Sim, "energy">, input: SolverInput): number {
  return (input.player.paelsTears ?? 0) > 0 && sim.energy > 0 ? input.player.paelsTears! : 0;
}

/**
 * A drink whose whole effect shows in this turn's outcome (damage, block, this turn's Strength or Dexterity, energy,
 * draws, a heal, an enemy's Strength this turn): nothing of it lasts past the turn. Any other effect (a debuff
 * or power on an enemy or us that lasts, Demise, Plating, Regen, Ritual, a card changed, …) may: such a drink is
 * never "no effect" (ARKG3JFT26HC F17: Powdered Demise read as no effect on 30 of 34 questions, never drunk).
 */
export function turnOnlyDrink(card: CardModel): boolean {
  if (card.type !== "Potion") return true;
  const lasting =
    (card.demise ?? 0) > 0 || (card.shrink ?? 0) > 0 || card.vulnerable > 0 || card.weak > 0 || card.strength !== 0 || card.enemyStrength !== 0 ||
    (card.plating ?? 0) > 0 || (card.regen ?? 0) > 0 || (card.thorns ?? 0) > 0 || card.hpLoss > 0 || (card.adds ?? []).length > 0 || (card.drawn ?? []).length > 0 || card.generates !== undefined;
  return !lasting && TURN_ONLY_SPECIALS.has(card.special ?? "");
}

/** Potion specials whose effect is this turn's alone (none, this turn's Dexterity, tripled Block, a heal). */
const TURN_ONLY_SPECIALS = new Set(["", "temp_dex", "triple_block", "heal"]);

function simKey(sim: Sim): string {
  const hand = sim.hand.map((card) => `${card.cardId}${card.upgraded ? "+" : ""}:${card.cost}`).sort().join(",")
    + (sim.duplicateSkills > 0 ? `#bs${sim.duplicateSkills}` : "");
  const enemies = sim.enemies.map((enemy) => `${enemy.hp}/${enemy.block}/${enemy.vulnerable}/${enemy.weak}/${enemy.artifact}/${enemy.strengthDelta}/${enemy.slippery ?? 0}/${enemy.curlUp ?? 0}/${enemy.flutter ?? 0}/${enemy.sleepLost ?? 0}/${enemy.tempStrengthLoss ?? 0}/${enemy.demise ?? 0}/${enemy.shrink ?? 0}/${enemy.ravenousStunned ? 1 : 0}`).join("|");
  const phantomKey = sim.phantomBlades > 0 ? `#pb${sim.phantomBlades}/${sim.phantomBladesSpent ? 1 : 0}` : "";
  const poisonKey = (sim.envenom > 0 ? `#env${sim.envenom}` : "") + (sim.enemies.some((enemy) => (enemy.poison ?? 0) > 0) || sim.poisonExtraTriggers > 0 ? `#p${sim.poisonExtraTriggers}:${sim.enemies.map((enemy) => enemy.poison ?? 0).join(",")}` : "");
  return `${hand}#${sim.energy}#${sim.hp}#${sim.block}#${sim.strength}#${sim.hpLostThisTurn ? 1 : 0}#${enemies}#${sim.flat}#${sim.tempDex}#${sim.buffer}#${sim.retaliate}#${sim.rupture}#${sim.facing}#${sim.colossus ? 1 : 0}#${sim.played}#${sim.draws.map((draw) => `${draw.withEnergy}/${draw.withoutEnergy}`).join(",")}#${sim.exhausted.length}/${sim.exhaustedCount > 0 ? 1 : 0}#${sim.escapes}#${sim.mantles}#${sim.enraged}#${sim.tainted}#${sim.inferno}#${sim.bombs}#${sim.gigantic}#${sim.topPlaced ? 1 : 0}#${sim.vigor}#${sim.noBlock ? 1 : 0}#${sim.attacksPlayed}/${sim.relicAttacks}/${sim.skillsPlayed}#${sim.freeAttacks}#${sim.duplicate}/${sim.duplicateAttacks}#${sim.drawnInHand}#${sim.bufferSpent}#${sim.regen}#${sim.pileDrawn}#${sim.plating}#${sim.strikeReplay}#${sim.hpLossEvents}#${sim.axeReplay ? 1 : 0}${sim.relicSkills > 0 ? `#${sim.relicSkills}` : ""}${sim.infernos > 0 ? `#i${sim.infernos}` : ""}${sim.rage > 0 ? `#r${sim.rage}` : ""}${sim.locked.length > 0 && sim.hand.some((card) => card.handCondition !== undefined) ? `#l${sim.locked.length}` : ""}${sim.hand.some((card) => (card.perExhaustDamage ?? 0) > 0) ? `#x${sim.exhaustedCount}` : ""}${poisonKey}${phantomKey}${sim.maulGrowth > 0 ? `#m${sim.maulGrowth}` : ""}${sim.shadowmeld ? "#sm" : ""}${sim.corrosiveWave > 0 ? `#cw${sim.corrosiveWave}` : ""}`;
}

export interface SolveResult {
  plans: Plan[];
  nodes: number;
  truncated: boolean;
  /** With SolverInput.knownTop: some line it simulated drew past the known cards (SL judge, SL_JUDGE_KNOWN_DRAWS). Absent otherwise. */
  drewUnknown?: true;
  /** With SolverInput.knownTop: the most pile cards any line it simulated drew (SL judge: within the exactly known ones?). */
  knownDepth?: number;
  /** Some line it simulated drew a card (SL judge, SL_RELOAD_EARLY: a verdict without draws). Absent otherwise. */
  drew?: true;
  /** SolverInput.deadline passed: the search was cut short by time (truncated is set too). Absent otherwise. */
  timedOut?: true;
  /** With SolverInput.watch: the watched cards after whose play some line still had HP left (SL judge). Absent otherwise. */
  watchedAlive?: number[];
  /** With SolverInput.stopOnLive: a line that does not die was found (and the search stopped there). Absent otherwise. */
  lives?: true;
}

/**
 * A 0-cost card that only draws (Battle Trance): nothing it does depends on when it is played, and the
 * cards it draws are best seen before any energy is spent. Pommel Strike (damage), Burning Pact (its
 * exhaust) and Headbutt-like cards are not.
 */
export function isFreeDraw(card: CardModel): boolean {
  return (
    card.type !== "Potion" &&
    card.cost === 0 &&
    !card.xCost &&
    card.draw > 0 &&
    card.damage === null &&
    card.block === 0 &&
    card.hpLoss === 0 &&
    !card.randomExhaust &&
    !card.putsOnTop &&
    !EXHAUST_PICKERS.has(card.cardId) &&
    !EXHAUST_HAND.has(card.cardId) &&
    // CARD_CONDITIONS: Restlessness draws only on an empty hand: when it is played matters.
    card.handCondition === undefined
  );
}

/** A card that draws (a known number, or until a condition). */
export function drawsCards(card: CardModel): boolean {
  return card.draw > 0 || card.drawsUntil === true;
}

/** The plan's steps played from the start of the turn again; null when one is not legal. */
function replay(input: SolverInput, weights: Weights, steps: Step[]): Plan | null {
  let sim = rootSim(input, weights);
  for (const step of steps) {
    const card = sim.hand.find((entry) => entry.index === step.cardIndex);
    if (!card) return null;
    let chosen = card;
    if (hiddenDaggers(card) && step.discards) {
      const pool = [...sim.hand, ...sim.held, ...sim.locked].filter((entry) => entry.key !== card.key && entry.type !== "Potion");
      const discards: string[] = [];
      for (const id of step.discards) {
        const at = pool.findIndex((entry) => entry.cardId === id);
        if (at < 0) return null;
        discards.push(pool.splice(at, 1)[0]!.key);
      }
      chosen = { ...card, discards };
    }
    const next = play(sim, chosen, step.target, input.player);
    if (!next) return null;
    sim = next;
  }
  return evaluate(sim, input, weights);
}

/**
 * A free draw (isFreeDraw) moved to the front of the plan, when the plan comes out the same played that
 * way; the loop re-plans once it has drawn. 2WUM F48 T6: Twin Strike first, then Battle Trance drew
 * Shrug It Off, Whirlwind and Bully with no energy left for them (36 block possible, 28 made). Not
 * when another card in the plan draws: Battle Trance stops later draws, which the solver does not see.
 */
export function drawFirst(plan: Plan, input: SolverInput, weights: Weights = weightsFor(input)): Plan {
  const cardOf = (step: Step): CardModel | undefined => input.hand.find((card) => card.index === step.cardIndex);
  const at = plan.steps.findIndex((step) => {
    const card = cardOf(step);
    return card !== undefined && isFreeDraw(card);
  });
  if (at <= 0) return plan;
  const otherDraws = plan.steps.some((step, index) => {
    const card = cardOf(step);
    return index !== at && card !== undefined && drawsCards(card);
  });
  if (otherDraws) return plan;
  const steps = [plan.steps[at]!, ...plan.steps.slice(0, at), ...plan.steps.slice(at + 1)];
  const moved = replay(input, weights, steps);
  if (!moved) return plan;
  const same =
    Math.abs(moved.score - plan.score) < 1e-6 &&
    moved.outcome.hpLoss === plan.outcome.hpLoss &&
    moved.outcome.damageDealt === plan.outcome.damageDealt &&
    moved.outcome.kills.join(",") === plan.outcome.kills.join(",");
  return same ? moved : plan;
}

function rootSim(input: SolverInput, weights: Weights): Sim {
  return {
    hand: input.hand.filter((card) => card.playable),
    energy: input.player.energy,
    hp: input.player.hp,
    block: input.player.block,
    strength: 0,
    permStrength: 0,
    hpLostThisTurn: false,
    skullUp: (input.player.redSkull ?? 0) > 0 && input.player.hp * 2 <= input.player.maxHp,
    hpLossEvents: 0,
    enemies: input.enemies.map((enemy) => ({ ...enemy, alive: enemy.hp > 0, newlyWeak: false, strengthDelta: 0, lostThisTurn: 0 })),
    shrunk: input.player.shrunk === true,
    steps: [],
    blockGained: 0,
    damageDealt: 0,
    vulnerableApplied: 0,
    weakApplied: 0,
    flat: 0,
    tempDex: 0,
    shadowmeld: false,
    corrosiveWave: input.player.corrosiveWave ?? 0,
    envenom: input.player.envenom ?? 0,
    phantomBlades: input.player.phantomBlades ?? 0,
    phantomBladesSpent: input.player.phantomBladesSpent ?? false,
    intangible: false,
    buffer: input.player.buffer ?? 0,
    bufferSpent: 0,
    duplicate: input.player.duplicate ?? 0,
    duplicateAttacks: input.player.duplicateAttacks ?? 0,
    duplicateSkills: input.player.duplicateSkills ?? 0,
    retaliate: input.player.retaliate ?? 0,
    rupture: input.player.rupture ?? 0,
    facing: input.player.facing ?? null,
    // A Colossus already up is in the intents (2WUM T7: 10x7 shown as 5x7, then halved again to 2x7).
    colossus: false,
    played: input.cardsPlayedThisTurn ?? 0,
    draws: [],
    cardsDrawn: 0,
    drawnInHand: 0,
    regen: input.player.regen ?? 0,
    plating: 0,
    strikeReplay: input.player.strikeReplay ?? 0,
    axeReplay: input.player.firstCardReplay === true,
    unknown: [],
    feedKills: 0,
    dazedAdded: 0,
    escapes: 0,
    mantles: 0,
    infernos: 0,
    enraged: 0,
    tainted: 0,
    inferno: input.player.inferno ?? 0,
    feelNoPain: input.player.feelNoPain ?? 0,
    afterImage: input.player.afterImage ?? 0,
    poisonExtraTriggers: input.player.poisonExtraTriggers ?? 0,
    hellraiser: input.player.hellraiser === true,
    darkEmbrace: input.player.darkEmbrace ?? 0,
    lastingDrinks: 0,
    potionCost: 0,
    potionHeal: 0,
    attacksPlayed: 0,
    relicAttacks: 0,
    skillsPlayed: 0,
    relicSkills: 0,
    freeAttacks: input.player.freeAttacks ?? 0,
    unmovableSpent: false,
    bombs: 0,
    gigantic: 0,
    pile: pileValue(input.drawPile, weights.hp, quietTurn(input) && !input.player.keepsBlock),
    pileDrawn: 0,
    known: input.knownTop && input.knownTop.length > 0 ? input.knownTop : null,
    exhausted: [],
    drawnExhausted: 0,
    randomExhausts: 0,
    thrashGrowth: [],
    maulGrowth: 0,
    thrashRandom: [],
    exhaustedCount: input.player.exhaustedThisTurn ? 1 : 0,
    held: input.hand.filter((card) => !card.playable),
    ...(input.hand.some((card) => card.hitsLoseHandSkills) ? { observedSkillKeys: input.hand.filter((card) => card.type === "Skill").map((card) => card.key) } : {}),
    rage: 0,
    locked: [],
    topPlaced: false,
    vigor: input.player.vigor ?? 0,
    noBlock: input.player.noBlock === true,
  };
}

/**
 * Offline tools only (tools/rollout-backtest.ts reads the live planner's solver input and plans through it).
 * No decision code sets it; null is a no-op.
 */
export const solveTap: { onSolve: ((input: SolverInput, result: SolveResult) => void) | null } = { onSolve: null };

/** Offline tools only (tools/shrink-replay.ts): these exact plays on the solver input, scored as the solver scores a line; null when one cannot be played. */
export function replaySteps(input: SolverInput, steps: Step[]): Plan | null {
  return replay(input, weightsFor(input), steps);
}

/** Returns every distinct end-of-turn outcome's best plan, best first. */
export function solveTurn(input: SolverInput): SolveResult {
  const maxNodes = input.maxNodes ?? 60_000;
  const weights = weightsFor(input);
  const root = rootSim(input, weights);

  const seen = new Set<string>();
  const byOutcome = new Map<string, Plan>();
  let nodes = 0;
  let truncated = false;
  let drewUnknown = false;
  let knownDepth = 0;
  let drew = false;
  // SL judge only (SL_JUDGE_ANY_DRAW): a time limit, the watched cards, a line ended by our death on our own turn.
  let timedOut = false;
  let lives = false;
  const watchedAlive = new Set<number>();
  const ownDeathEnds = input.stopAtOwnDeath === true && (input.player.revives ?? []).length === 0;

  const visit = (sim: Sim): void => {
    nodes += 1;
    // SL judge (docs/sl.md §2): what the simulated lines drew.
    if (sim.drewUnknown) drewUnknown = true;
    if (sim.known !== null && sim.pileDrawn > knownDepth) knownDepth = sim.pileDrawn;
    if (sim.cardsDrawn > 0) drew = true;
    if (input.watch !== undefined && sim.hp > 0 && sim.steps.length > 0) {
      const last = sim.steps[sim.steps.length - 1]!.cardIndex;
      if (input.watch.has(last)) watchedAlive.add(last);
    }
    const plan = evaluate(sim, input, weights);
    const o = plan.outcome;
    const potionSteps = sim.steps.filter((step) => step.cardId.startsWith("POTION:")).map((step) => step.cardId);
    const potionsDrunk = potionSteps.length;
    // The potions drunk are part of the outcome: a line drinking a potion never merges with (and so never
    // replaces) a potion-free line, however close their scores. Otherwise a potion line scoring a hair
    // higher (lasting Dexterity, say) swallows "end turn" and the planner sees no dry line that survives,
    // so it drinks on its own as the "only line" (2CCM6XK4PB37 F15 T2, Dexterity Potion at 0 energy).
    const signature = `${o.hpLoss}|${o.damageDealt}|${o.kills.join(",")}|${o.enemyHpAfter.map((enemy) => `${enemy.hp}:${enemy.vulnerable}:${enemy.weak}${enemy.poison ? `:p${enemy.poison}` : ""}`).join(",")}|${o.strengthGained}|${o.cardsDrawn}|${o.sandpitAfter ?? "-"}|${Math.round(plan.score)}|${[...potionSteps].sort().join(",")}${o.maulGrowth && !o.winsFight ? `|m${o.maulGrowth}` : ""}${sim.pendingSelection ? "|selection" : ""}`;
    const existing = byOutcome.get(signature);
    // Same outcome: prefer the line drinking fewer potions (a potion reaching the same end state is a potion
    // wasted, even a costless one in a boss fight), then the shorter plan (fewer steps = fewer chances for the
    // board to surprise us).
    const tie = existing !== undefined && Math.abs(plan.score - existing.score) < 1e-9;
    const fewerPotions = tie && potionsDrunk < potionStepCount(existing.steps);
    const samePotions = tie && potionsDrunk === potionStepCount(existing.steps);
    if (!existing || plan.score > existing.score + 1e-9 || fewerPotions || (samePotions && plan.steps.length < existing.steps.length)) {
      byOutcome.set(signature, plan);
    }
    if (input.stopOnLive === true && !o.dies) {
      lives = true;
      return;
    }
    if (nodes >= maxNodes) {
      truncated = true;
      return;
    }
    if (input.deadline !== undefined && nodes % 64 === 0 && (input.deadlineNow ?? Date.now)() > input.deadline) {
      truncated = true;
      timedOut = true;
      return;
    }
    if (sim.enemies.every((enemy) => !enemy.alive) || plan.outcome.winsFight) return;
    if (ownDeathEnds && sim.hp <= 0) return;

    const tried = new Set<string>();
    const cardPlays = sim.steps.filter((step) => !step.cardId.startsWith("POTION:")).length;
    const playsLeft = input.player.maxPlays === null || input.player.maxPlays === undefined ? Infinity : input.player.maxPlays - cardPlays;
    const skillsLeft = input.player.maxSkills === null || input.player.maxSkills === undefined ? Infinity : input.player.maxSkills - sim.skillsPlayed;
    for (const card of sim.hand.flatMap((entry) => (hiddenDaggers(entry) ? hiddenDaggerWays(sim, entry) : entry.special === "gamble" ? gambleWays(sim, entry) : entry.choices ? choiceWays(entry) : [entry]))) {
      if (card.type !== "Potion" && playsLeft <= 0) continue;
      if (card.type === "Skill" && skillsLeft <= 0) continue;
      if (input.firstKey !== undefined && sim.steps.length === 0 && card.key !== input.firstKey) continue;
      const targets: (number | null)[] =
        card.target === "single" ? card.validTargets.filter((index) => sim.enemies.some((enemy) => enemy.index === index && enemy.alive)) : [null];
      for (const target of targets) {
        const dedupe = `${card.cardId}${card.upgraded ? "+" : ""}:${card.cost}@${target ?? "-"}${card.discards ? `/${card.discards.join(",")}` : ""}${card.generates ? `>${card.generates.cardId}` : ""}`;
        if (tried.has(dedupe)) continue;
        tried.add(dedupe);
        const next = play(sim, card, target, input.player);
        if (!next) continue;
        const key = simKey(next);
        if (seen.has(key)) continue;
        seen.add(key);
        visit(next);
        if (truncated || lives) return;
      }
    }
  };

  visit(root);
  const plans = [...byOutcome.values()].map((plan) => drawFirst(plan, input, weights)).sort((a, b) => b.score - a.score);
  const result: SolveResult = {
    plans,
    nodes,
    truncated,
    ...(drewUnknown ? { drewUnknown: true as const } : {}),
    ...(root.known !== null ? { knownDepth } : {}),
    ...(drew ? { drew: true as const } : {}),
    ...(timedOut ? { timedOut: true as const } : {}),
    ...(lives ? { lives: true as const } : {}),
    ...(input.watch !== undefined ? { watchedAlive: [...watchedAlive].sort((a, b) => a - b) } : {}),
  };
  solveTap.onSolve?.(input, result);
  return result;
}

function potionStepCount(steps: Step[]): number {
  return steps.filter((step) => step.cardId.startsWith("POTION:")).length;
}

/**
 * A line's effective HP loss this turn: the HP it loses plus the potions it drinks at their cost (potion-cost.ts).
 * What the HP guard and code's own picks compare (the rollout adds the later turns' drinks to its own loss).
 */
export function effectiveLoss(plan: Pick<Plan, "outcome">): number {
  return plan.outcome.hpLoss + (plan.outcome.potionCost ?? 0);
}

/**
 * The Strength the living enemies gain for good from a line (Fight Me!, Enrage, Crab Rage: enemyHpAfter strengthGained;
 * a loss counts negative). It raises every later hit: a dominance axis of its own (fix-queue-v4 #6, 9FVEQKJ0Y1YQ F33 T6:
 * "Blood Wall, Fight Me!, Defend" -2 dominated "Blood Wall, Defend" -2 on our Strength and damage, code played it as
 * the only distinct line, and the Insatiable's +1 made T7's bite exactly lethal).
 */
export function enemyStrengthGained(outcome: Pick<Outcome, "enemyHpAfter">): number {
  return outcome.enemyHpAfter.filter((enemy) => enemy.hp > 0).reduce((sum, enemy) => sum + (enemy.strengthGained ?? 0), 0);
}

/** vector() per plan: a pure function of the plan, asked for twice per pair by the dominance filter (distinctPlans). */
const vectors = new WeakMap<Plan, number[]>();

function vector(plan: Plan): number[] {
  const known = vectors.get(plan);
  if (known) return known;
  const out = outcomeVector(plan);
  vectors.set(plan, out);
  return out;
}

function outcomeVector(plan: Plan): number[] {
  const o = plan.outcome;
  const debuffs = o.enemyHpAfter.filter((enemy) => enemy.hp > 0).reduce((sum, enemy) => sum + Math.min(enemy.vulnerable, 3) + Math.min(enemy.weak, 3), 0);
  const living = o.enemyHpAfter.filter((enemy) => enemy.hp > 0).length;
  // Drinking a potion is its own axis (the potions a line drinks; its cost is in the score, and 0 in a boss
  // fight): without it "same result, but spends Fortifier" dominated "take 4 damage, keep Fortifier" and the
  // potion-free plan was never shown (Vantom, live run). Waking a sleeper likewise: without this axis "Taunt, Setup Strike, Pillage" (11 damage, wakes the Matriarch)
  // dominated the line that let it sleep, and that line was filtered out and never played (1K5G F17 T1).
  // Cards drawn with no energy left to play them are discarded unplayed: not a gain on this axis (Q4JV
  // F17 T3: an 8-damage Battle Trance line at 0 energy was kept beside the 23-damage rank 1).
  const drawn = o.energyLeft > 0 ? o.cardsDrawn : 0;
  // Potions drunk count on their own axis (their cost, potion-cost.ts, is in the score, not here: 0 in a boss
  // fight), and a line drinking one must never dominate the same line without it.
  // A revive spent (Fairy in a Bottle, Lizard Tail) is its own axis: a line spending one never dominates a line that does not.
  // A Waterfall Giant kill is its own axis too: HP plus block kept less the blast (0 without a kill), so a kill
  // into a blast we cannot take on this turn's numbers never dominates a line that does not kill (9Q7V F17 T14:
  // Sword Boomerang doubled by One-Two Punch killed it at 31 HP into a 56 blast as the "only distinct line").
  const eruption = (o.explodesNext ?? 0) > 0 ? (o.eruptionMargin ?? -(o.explodesNext ?? 0)) : 0;
  // The enemies' Strength gained is an axis too (enemyStrengthGained): a line feeding it never dominates one that does not.
  return [o.winsFight ? 1 : 0, -o.hpLoss, o.damageDealt, -living, debuffs, o.strengthGained, drawn, -potionStepCount(plan.steps), o.sandpitAfter ?? 0, -o.sleepCost, Math.floor(o.lasting / 5), o.stunSaved ?? 0, -(o.revived?.sources.length ?? 0), eruption, o.nextTurnEnergy ?? 0, o.winsFight ? 0 : o.maulGrowth ?? 0, o.winsFight ? 0 : -enemyStrengthGained(o)];
}

/** True when `a` is at least as good as `b` on every outcome axis and better on one. */
export function dominates(a: Plan, b: Plan): boolean {
  if (a.outcome.unknownCards.length > 0 || b.outcome.unknownCards.length > 0) return false;
  // Different residual poison is unresolved future state, not an all-axis improvement
  // (TD1HVGS7H6LB SILENT A10 F17 T3, silent-0171: 21 damage/0 poison replaced 19 damage/3 poison).
  // Keep both alternatives without pricing poison or changing the confidence/HP guard thresholds.
  if (!a.outcome.winsFight && !b.outcome.winsFight) {
    for (const enemy of a.outcome.enemyHpAfter) {
      if (enemy.hp <= 0) continue;
      const other = b.outcome.enemyHpAfter.find((entry) => entry.index === enemy.index && entry.hp > 0);
      if (other && (enemy.poison ?? 0) !== (other.poison ?? 0)) return false;
    }
  }
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
 * The plans no other plan dominates, in their own order: the same set as testing every pair, in O(n log n + n x front).
 * A plan's vector is lexicographically above every plan it dominates (at least as good on every axis, better on one), so
 * in descending lexicographic order a plan's dominators all come before it; and dominance is transitive, so a plan
 * dominated by a dominated plan is dominated by a front member too: checking the front found so far is enough. Known
 * draws (SL_RETRY_KNOWN_DRAWS, docs/sl.md §10) make the solver's plans many more (JW925EDF9ZTQ F48 T1 with Battle Trance
 * drawing three known cards: 60000 nodes, the pairwise filter 108 s).
 */
function paretoFront(plans: Plan[]): Plan[] {
  const order = plans.map((plan, index) => ({ plan, index, v: vector(plan) }));
  // The order argument needs comparable numbers: anything else is tested pair by pair, as before.
  if (order.some((entry) => entry.v.some((x) => !Number.isFinite(x)))) return plans.filter((plan) => !plans.some((other) => other !== plan && dominates(other, plan)));
  order.sort((a, b) => {
    for (let k = 0; k < a.v.length; k += 1) if (a.v[k] !== b.v[k]) return b.v[k]! - a.v[k]!;
    return a.index - b.index;
  });
  const front: Plan[] = [];
  const kept = new Set<Plan>();
  for (const { plan } of order) {
    if (front.some((other) => dominates(other, plan))) continue;
    front.push(plan);
    kept.add(plan);
  }
  return plans.filter((plan) => kept.has(plan));
}

/**
 * Plans whose outcomes a human would call different strategies (not just a reordering), with
 * dominated plans removed: "Strike" beats "do nothing" when nothing else differs, so the model is
 * never asked about it.
 */
export function distinctPlans(plans: Plan[], limit: number): Plan[] {
  const front = paretoFront(plans);
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
        enemyStrengthGained(other.outcome) === enemyStrengthGained(plan.outcome) &&
        other.outcome.sandpitAfter === plan.outcome.sandpitAfter &&
        (other.outcome.nextTurnEnergy ?? 0) === (plan.outcome.nextTurnEnergy ?? 0),
    );
    if (!similar) picked.push(plan);
  }
  // Potions are optional: when every pick drinks one, the best line that drinks none is shown too
  // (5FMU F15: all four hallway options carried the Strength Potion, so "keep it" was never offered).
  const drinks = (plan: Plan) => plan.steps.some((step) => step.cardId.startsWith("POTION:"));
  if (limit >= 2 && picked.length > 0 && picked.every(drinks)) {
    const dry = plans.filter((plan) => !drinks(plan));
    const keep = dry.find((plan) => !dry.some((other) => other !== plan && dominates(other, plan)));
    if (keep) {
      if (picked.length >= limit) picked.pop();
      picked.push(keep);
    }
  }
  return picked;
}
