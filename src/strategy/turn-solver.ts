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

import { applyUpgrade, freeCardPick, giantRockFrom, isStrikeCard, thisTurnScore, type CardModel } from "./card-model.js";

/** Shrink (Beetle Juice on an enemy, SHRINK_POWER): its attacks deal 70% (states.jsonl 23 -> 16, 20 -> 14). */
export const SHRINK_DAMAGE_FACTOR = 0.7;

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
  /** Regen already up (REGEN_POWER): healed at the end of this turn, before the enemy attacks. */
  regen?: number;
  /**
   * Soldier's Stew drunk before this turn and not shown in the hand's text (the rollout's later turns):
   * every Strike card is played this many extra times.
   */
  strikeReplay?: number;
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
  block: number;
  energy: number;
  weak: boolean;
  vulnerable: boolean;
  /** Takes 50% less from enemy attacks? (Intangible etc. — not modelled beyond this flag.) */
  intangible: boolean;
  /** Shrink: the player's attacks deal 30% less. */
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
   * Colossus already up (COLOSSUS_POWER). The mod's intents already show the halved damage for
   * enemies that were Vulnerable, so only enemies made Vulnerable this turn are halved again.
   */
  colossus?: boolean;
  /** HP lost at the start of next turn before block (Crimson Mantle: 1 per copy in play). */
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
  /** Unmovable up and not yet used this turn: shown Block values are doubled, only the first one is real. */
  unmovableArmed?: boolean;
  /** Strength at the start of the turn (STRENGTH_POWER), for rounding Weak damage once from the base. */
  strengthNow?: number;
  /**
   * Feel No Pain already up (FEEL_NO_PAIN_POWER amount): Block per card exhausted (QBRN F48 T7: Fiend
   * Fire through 4 cards with Feel No Pain 3 was scored as 9 damage and no block).
   */
  feelNoPain?: number;
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
  /** Demon Tongue, not yet spent this turn: the first HP lost on our turn is healed back. */
  demonTongue?: boolean;
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
   * No Block (NO_BLOCK_POWER, from Panic Button: "no Block from cards for the next 2 turns"): block
   * cards give nothing (VP5F F48 T2: Flame Barrier+ in hand, Skull Bash took the full 15).
   */
  noBlock?: boolean;
  /** A card was already exhausted this turn before this decision (Evil Eye's doubling), or every turn (Toasty Mittens). */
  exhaustedThisTurn?: boolean;
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
    /** Stunned by the line (Ravenous eating a corpse): its move this enemy turn is lost. */
    stunned?: boolean;
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
  /** Drinks in the line whose effect may outlast this turn (turnOnlyDrink): such a line is never "no effect". */
  lastingDrinks?: number;
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
   * Damage the cards held at the turn's end deal us (Burn, Withers), when any: blockable, it meets the block before
   * the enemy hits and is part of incomingAfterBlock.
   */
  heldDamage?: number;
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
  /** Red Skull's Strength is on (HP at or below half): part of `strength` when it came on this turn. */
  skullUp: boolean;
  /** HP losses on our turn so far (Self-Forming Clay's block per loss). */
  hpLossEvents: number;
  enemies: (EnemySim & { alive: boolean; newlyWeak: boolean; newlyShrunk?: boolean; strengthDelta: number; lostThisTurn: number; tempStrengthLoss?: number; sleepLost?: number; skittishHit?: boolean; ravenousStunned?: boolean })[];
  steps: Step[];
  blockGained: number;
  damageDealt: number;
  vulnerableApplied: number;
  weakApplied: number;
  flat: number;
  /** Dexterity gained this turn (Speed Potion): added to every block card played after it. */
  tempDex: number;
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
  feelNoPain: number;
  /** Hellraiser up (already, or played this turn): drawn Strikes play themselves. */
  hellraiser: boolean;
  /** Dark Embrace amount up (already, or played this turn): cards drawn per card exhausted. */
  darkEmbrace: number;
  /** Drinks in this line whose effect may outlast the turn (turnOnlyDrink false). */
  lastingDrinks: number;
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
  thrashRandom: { index: number; strength: number; least: number }[];
  /** Cards exhausted this turn so far, before this decision included (Evil Eye doubles its Block after one). */
  exhaustedCount: number;
  /** Unplayable cards still in hand (Wound, Beckon): held at the end of the turn unless exhausted. */
  held: CardModel[];
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
 * HP the player loses on their own turn (a card's cost, Thorns, Reflect). Demon Tongue heals the
 * first loss of the turn back (TQX5 T1: Offering+ with 0 energy was "end turn, -9"; played, it costs
 * nothing and gives 2 energy for a Defend).
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
function applyDebuff(enemy: Sim["enemies"][number], kind: "vulnerable" | "weak" | "tempStrengthLoss" | "demise" | "shrink", amount: number): number {
  if (amount <= 0) return 0;
  if (enemy.artifact > 0) {
    enemy.artifact -= 1;
    return 0;
  }
  if (kind === "vulnerable") enemy.vulnerable += amount;
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

function hitEnemy(sim: Sim, enemy: Sim["enemies"][number], perHitBase: number, hits: number, player: PlayerSim, potion = false): number {
  let dealt = 0;
  for (let hit = 0; hit < hits && enemy.alive; hit += 1) {
    let amount = perHitBase;
    if (player.shrunk) amount = Math.floor(amount * 0.7);
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
/** Lasting value per energy of a card made free for the fight (Touch of Insanity), before fight length. */
export const FREE_CARD_LASTING = 2;
export const CRAB_RAGE_STRENGTH = 6;

function killEnemy(sim: Sim, enemy: Sim["enemies"][number]): void {
  enemy.alive = false;
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
  // Stomp: 1 less per Attack played earlier in this plan (8XQM F48 T8: Pommel Strike+ and Strike
  // first make it cost 1; played first at 3, the lethal line was never found).
  const cost =
    card.type === "Attack" && sim.freeAttacks > 0 && !card.xCost
      ? 0
      : card.xCost ? sim.energy : card.special === "stomp" ? Math.max(0, card.cost - sim.attacksPlayed) : card.cost;
  if (cost > sim.energy) return null;
  // Touch of Insanity: only with a card worth making free (YP9 T1: drunk with only 0-cost cards left).
  if (card.special === "free_card" && !freeCardPick(sim.hand)) return null;
  // Ashwater with nothing worth exhausting does nothing (H14T: wasted four times with "selected 0/0").
  if (card.special === "ashwater" && ![...sim.hand, ...sim.held].some((entry) => entry !== card && entry.type !== "Potion" && (entry.cardId === "HOWL_FROM_BEYOND" || isJunk(entry)))) return null;
  // After Headbutt the next draw is the card it put on top, taken back into hand this turn (XPA4 T11:
  // Shrug It Off+ kept for a 24-damage turn was drawn by Pommel Strike and discarded unplayed). Which
  // card goes on top is chosen later, so no plan draws after one; drawing first, then Headbutt, is fine.
  if (sim.topPlaced && (card.draw > 0 || card.drawsUntil)) return null;
  const next = clone(sim);
  // A Gambler's Brew way (or a card-choice potion's pick) is a copy of the belt's potion: the potion
  // leaves the hand by its key.
  next.hand = sim.hand.filter((entry) => entry !== card && !(card.type === "Potion" && entry.key === card.key));
  const discarded = card.discards ? sim.hand.filter((entry) => card.discards!.includes(entry.key)).map((entry) => entry.cardId) : [];
  // Chains of Binding: playing one Soulbound card locks the others for the turn (88HN T5: Bash+ then
  // Flame Barrier in one plan; the Barrier was locked, 7 block against 24).
  if (card.soulbound) next.hand = next.hand.filter((entry) => !entry.soulbound);
  next.energy -= cost;
  if ((player.helmetBlock ?? 0) > 0 && card.type !== "Potion" && cost >= HELMET_MIN_COST) gainBlock(next, player.helmetBlock ?? 0, player);
  if (card.target === "single" && !next.enemies.some((enemy) => enemy.index === target && enemy.alive)) return null;
  const twice = card.type !== "Potion" && next.duplicate > 0;
  if (twice) next.duplicate -= 1;
  const twiceAttack = card.type === "Attack" && next.duplicateAttacks > 0;
  if (twiceAttack) next.duplicateAttacks -= 1;
  // Replay: the card is played again (its own Replay, Soldier's Stew on a Strike), energy paid once.
  const replays = card.type === "Potion" ? 0 : (card.replay ?? 0) + (isStrikeCard(card) ? next.strikeReplay : 0);
  // Every play of an Attack (a duplicate, a replay) is one for the attack-counting relics, each after its own play
  // (logged: a Stew-replayed Strike took Pen Nib 3 -> 5, Ornamental Fan 0 -> 2, Nunchaku 2 -> 4; a Duplicator'd
  // Setup Strike Kusarigama 0 -> 2; attacks_played_this_turn +1 each time).
  const plays = 1 + (twice ? 1 : 0) + (twiceAttack ? 1 : 0) + replays;
  for (let play = 0; play < plays; play += 1) {
    resolveEffects(next, card, target, player, cost);
    if (card.type === "Attack") attackRelics(next, player);
  }
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
    const count = Math.max(0, Math.min(bottled ? BOTTLED_DRAW : GLOWWATER_DRAW, HAND_LIMIT, room));
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
      ...(card.discards ? { discards: discarded } : {}),
      ...(card.type === "Potion" && card.generates?.pileCard ? { takes: card.generates.pileCard } : {}),
      ...(card.pileCard ? { pileCard: card.pileCard } : {}),
    },
  ];
  return next;
}

/** A card's effects on the sim (energy and hand already paid). Called twice under Duplication. */
function resolveEffects(next: Sim, card: CardModel, target: number | null, player: PlayerSim, cost: number): void {
  const targetEnemy = target === null ? null : next.enemies.find((enemy) => enemy.index === target && enemy.alive) ?? null;
  if (card.target === "single" && targetEnemy === null) return;

  if (card.hpLoss > 0 && loseHp(next, card.hpLoss, player)) {
    if (next.rupture > 0) {
      next.strength += next.rupture;
      next.permStrength += next.rupture;
    }
  }
  // Damage to us (Foul Potion): like an enemy hit, block first, Intangible caps it at 1, the rest is HP lost.
  if ((card.selfDamage ?? 0) > 0) {
    const amount = player.intangible || next.intangible ? Math.min(1, card.selfDamage ?? 0) : card.selfDamage ?? 0;
    const blocked = Math.min(next.block, amount);
    next.block -= blocked;
    loseHp(next, amount - blocked, player);
  }
  if (card.special === "rupture") next.rupture += 1;
  // Enrage (Test Subject): every Skill gives it Strength at once, so this turn's attack grows too.
  if (card.type === "Skill") for (const enemy of next.enemies) if (enemy.alive && (enemy.enrage ?? 0) > 0) enemy.strengthDelta += enemy.enrage ?? 0;
  // Vital Spark (Infested Prism): every Skill gives us Tainted, and every attack hit this turn grows by it
  // (4LC3 F31 T7: "Ashen Strike, Defend, Shrug It Off" shown as -5, the 6x3 became 14x3 and killed us).
  if (card.type === "Skill") for (const enemy of next.enemies) if (enemy.alive && (enemy.vitalSpark ?? 0) > 0) next.tainted += enemy.vitalSpark ?? 0;
  if (card.special === "colossus") next.colossus = true;
  if (card.special === "frantic_escape") next.escapes += 1;
  if (card.special === "crimson_mantle") next.mantles += 1;
  if ((card.inferno ?? 0) > 0) next.inferno += card.inferno ?? 0;
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
    if (card.type !== "Potion" && player.unmovableArmed) {
      if (next.unmovableSpent) shown = Math.floor(shown / 2);
      next.unmovableSpent = true;
    }
    gainBlock(next, Math.max(0, shown + (card.type === "Potion" ? 0 : next.tempDex)), player);
  }
  // Panic Button: its own Block lands, then no card gives Block for the rest of this turn and two more.
  if (card.cardId === "PANIC_BUTTON") next.noBlock = true;
  if (card.special === "temp_dex") next.tempDex += 5;
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
    next.hp = Math.min(player.maxHp, next.hp + Math.floor(player.maxHp * BLOOD_POTION_HEAL));
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
    next.hand = next.hand.map((entry) => (entry.type === "Attack" ? giantRockFrom(entry, card.upgraded, player.strengthNow ?? 0, player.weak) : entry));
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
  if (card.adds) addToHand(next, card.adds);
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
  if (card.type === "Attack" && (player.rage ?? 0) > 0) gainBlock(next, player.rage ?? 0, player);
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
    if (player.weak && card.damageBase !== undefined && card.special !== "body_slam") {
      const exact = (card.damageBase + (player.strengthNow ?? 0)) * 0.75;
      if (Math.floor(exact) === shown) shown = exact;
    }
    // Thrash hits for its printed number (3SBP: all 12 plays); what it absorbs is for its later plays.
    let perHit = shown + next.strength * weakFactor;
    let hits = card.hits;
    if (card.special === "body_slam") perHit = Math.floor((next.block + next.strength) * weakFactor);
    // Pact's End hits only with 3+ cards in the exhaust pile (H1FA F17 T9: counted as a 17 AoE kill on
    // an empty pile, dealt 0, died by 1 HP). An unknown pile counts as empty.
    if (card.cardId === "PACTS_END" && (player.exhaustPile ?? 0) + next.exhausted.length < PACTS_END_EXHAUST) perHit = 0;
    if (card.special === "whirlwind") hits = cost;
    // Fiend Fire: one hit per card it exhausts, i.e. the rest of the hand (exhausted after this).
    // Cards drawn earlier in the line and still in hand count too (9VG8 F35 T6).
    if (card.special === "fiend_fire") hits = next.hand.filter((entry) => entry.type !== "Potion").length + next.held.length + next.drawnInHand;
    if (card.special === "spite" && next.hpLostThisTurn) hits = 2;
    if (card.special === "dismantle" && targetEnemy && targetEnemy.vulnerable > 0) hits = 2;
    if (card.special === "bully" && targetEnemy) perHit += 2 * targetEnemy.vulnerable;
    // Vigor: spent by the first Attack, on its first hit (KFP1 F17 T1).
    let firstHit = perHit;
    if (card.type === "Attack" && next.vigor > 0) {
      firstHit += Math.floor(next.vigor * weakFactor);
      next.vigor = 0;
    }
    if (next.gigantic > 0 && card.type === "Attack") {
      perHit *= 3;
      firstHit *= 3;
      next.gigantic -= 1;
    }

    if (card.target === "all") {
      // Hit by hit across every enemy, as the game resolves it: a death mid-card (Crab Rage) changes
      // what the later hits meet.
      for (let hit = 0; hit < hits; hit += 1) {
        next.sweeping = true;
        for (const enemy of next.enemies) if (enemy.alive) hitEnemy(next, enemy, hit === 0 ? firstHit : perHit, 1, player, card.type === "Potion");
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
        hitEnemy(next, victim, hit === 0 ? firstHit : perHit, 1, player, card.type === "Potion");
      }
    } else if (targetEnemy) {
      const wasAlive = targetEnemy.alive;
      if (hits > 0) hitEnemy(next, targetEnemy, firstHit, 1, player, card.type === "Potion");
      hitEnemy(next, targetEnemy, perHit, hits - 1, player, card.type === "Potion");
      if (card.special === "feed" && wasAlive && !targetEnemy.alive) next.feedKills += 1;
      // Feed exhausts: spending it without the kill throws away this fight's max-HP gain.
      else if (card.special === "feed") next.flat -= 8;
      if (card.special === "molten_fist" && targetEnemy.alive) targetEnemy.vulnerable *= 2;
    }
  }

  thrashAbsorb(next, card, player);

  const debuffTargets = card.target === "all" ? next.enemies.filter((enemy) => enemy.alive) : targetEnemy ? [targetEnemy] : [];
  for (const enemy of debuffTargets) {
    if (!enemy.alive) continue;
    // In card-text order: Artifact blocks whichever lands first (Uppercut: Weak, then Vulnerable).
    if (card.weakFirst) {
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
  else next.flat += card.flatValue;
  if (card.draw > 0) drawExpected(next, card.draw, player);
}

/** `count` cards drawn from the pile as expected values (what they are is not known). */
function drawExpected(next: Sim, count: number, player: PlayerSim): void {
  // What lands in the hand: no more than the piles hold, nor past the 10-card hand.
  const room = Math.max(0, (player.drawable ?? Number.POSITIVE_INFINITY) - next.cardsDrawn);
  const handSpace = Math.max(0, HAND_LIMIT - next.hand.filter((entry) => entry.type !== "Potion").length - next.held.length - next.drawnInHand);
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
}

/**
 * A Strike Hellraiser plays when it is drawn: 0 energy, at a random enemy (the solver's worst victim), the way the
 * rollout's hellraised card and Distilled Chaos's top cards are played.
 */
export function hellraised(card: CardModel): CardModel {
  return { ...card, cost: 0, xCost: false, playable: true, ...(card.target === "single" ? { target: "random" as const, validTargets: [] } : {}) };
}

/** Cards put into the hand (not drawn): playable ones to the hand, the rest held; none past HAND_LIMIT. */
function addToHand(sim: Sim, cards: CardModel[]): void {
  const space = Math.max(0, HAND_LIMIT - sim.hand.filter((entry) => entry.type !== "Potion").length - sim.held.length - sim.drawnInHand);
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
  addToHand(sim, taken);
  sim.cardsDrawn += taken.length;
  sim.pileDrawn += taken.length;
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
    // Shriek: taken to the threshold this turn, it is stunned and its move is lost.
    if ((enemy.shriek ?? 0) > 0 && enemy.hp <= (enemy.shriek ?? 0) && (start?.hp ?? 0) > (enemy.shriek ?? 0)) continue;
    if (enemy.burrowed && (start?.block ?? 0) > 0 && enemy.block <= 0) continue;
    // Ravenous: stunned by eating a corpse this turn, its move is lost.
    if (enemy.ravenousStunned) continue;
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
  // Cards that pay off on Vulnerable in the deck (Dismantle hits twice, Bully, Molten Fist doubles it,
  // Dominate): each stack is worth more (5R0G F24 T5: Molten Fist line over Bash+ for Vulnerable 3 at
  // the same HP; Dismantle x2 on T7 would have killed the beetle).
  const vulnerable = 2.5 + Math.min(4, 1.5 * (input.vulnerablePayoffs ?? 0));
  return { hp, damage, killBase: 6, killPerIncoming: 1.2, vulnerable, weak: 1.5, strength: 5 };
}

/**
 * Lasting value of the turn (Strength, powers), a potion's part like a card's (Dai: a potion is a 0-cost one-shot
 * card, no cost). Until batch K a potion's part counted 25% in hallway and unknown fights (POTION_LASTING: "the
 * potion is worth more saved for an elite or the boss"), a keep-the-potion cost in the score.
 */
function lastingValue(sim: Sim, weights: Weights): number {
  return weights.strength * sim.permStrength + sim.flat;
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
 * The power only shows the block total, so the copies are counted from it.
 */
export function mantleHpCost(amount: number): number {
  return amount > 0 ? Math.max(1, Math.floor(amount / 7)) : 0;
}

/** Damage to every enemy at the start of our next turn, with an Inferno played this turn added. */
export function turnStartAoeAfter(sim: { inferno: number }, input: SolverInput): number {
  return (input.player.turnStartAoe ?? 0) + Math.max(0, sim.inferno - (input.player.inferno ?? 0));
}

function evaluate(sim: Sim, input: SolverInput, weights: Weights): Plan {
  // A Howl from Beyond exhausted this turn plays itself at the end of the turn, before the enemies act.
  const howls = sim.exhausted.filter((card) => card.cardId === "HOWL_FROM_BEYOND");
  if (howls.length > 0 && sim.enemies.some((enemy) => enemy.alive)) {
    sim = clone(sim);
    for (const howl of howls) {
      const perHit = (howl.damage ?? 0) + sim.strength * (input.player.weak ? 0.75 : 1);
      for (const enemy of sim.enemies) if (enemy.alive) hitEnemy(sim, enemy, perHit, 1, input.player);
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
  const heldHpLoss = winsFight ? 0 : heldCards.reduce((sum, card) => sum + (card.heldHpLoss ?? 0), 0);
  // Ethereal cards still in hand are exhausted at the end of the turn: Feel No Pain's Block for each, before the
  // enemies act (7KDMKN16GD6B: Dazed, Clumsy and Ascender's Bane never counted; HP forecasts 9-12 too low).
  const etherealBlock = winsFight || sim.feelNoPain <= 0 ? 0 : sim.feelNoPain * heldCards.filter((card) => card.ethereal && card.type !== "Potion").length;
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
  const incomingRaw = winsFight ? 0 : hits.reduce((sum, hit) => sum + hit.amount, 0) + heldPenalty;
  // Disintegration lands at the end of our turn and hits block first (DG1 T5: block 8 -> 2, HP
  // unchanged); what block it leaves then meets the enemy attacks.
  // Plating played this turn blocks at this turn's end too (SCBC F21 T2: Stone Armor, -18 predicted, -14).
  // Plating's later turns: the HP it can absorb (a potion's part like a card's).
  const platingHp = winsFight ? 0 : platingAbsorbed(sim.plating, input);
  const platingValue = sim.plating > 0 ? weights.hp * platingHp : 0;
  const platingNow = sim.steps.reduce((sum, step) => sum + (input.hand.find((card) => card.index === step.cardIndex && card.cardId === step.cardId)?.plating ?? 0), 0);
  // Cloak Clasp: block for each card still in hand at the end of the turn (drawn ones too).
  const claspBlock = (input.player.blockPerHeldCard ?? 0) * (heldCards.filter((card) => card.type !== "Potion").length + sim.drawnInHand);
  const blockAtEnd = sim.block + etherealBlock + (input.player.endTurnBlock ?? 0) + platingNow + claspBlock;
  const disintegration = winsFight ? 0 : input.player.endTurnHpLoss ?? 0;
  const blockLeft = Math.max(0, blockAtEnd - disintegration);
  // Buffer: each stack left prevents the next HP loss, whole: the first hits that get past the block,
  // in order (a held Burn at the end of our turn first).
  const incomingAfterBlock = sim.buffer > 0 && !winsFight ? bufferedLoss([heldPenalty, ...hits.map((hit) => hit.amount)], blockLeft, sim.buffer) : Math.max(0, incomingRaw - blockLeft);
  // Imbalanced: an enemy whose every hit meets block (in attack order) is stunned for its next move.
  const stunned = winsFight ? [] : imbalanceStuns(sim, hits, blockLeft, sim.buffer);
  // Regen heals at the end of our turn, before the enemy attacks (never past max HP; no end of turn after a win).
  const regenHeal = winsFight ? 0 : Math.max(0, Math.min(sim.regen, input.player.maxHp - sim.hp));
  const selfLoss = input.player.hp - sim.hp - regenHeal;
  // Crimson Mantle takes its HP at the start of our next turn, before any block (YP9 T5: 1 HP left,
  // no attack coming, the Mantle killed us). The mod's lethal warning does not see it either. It is
  // part of this turn's HP loss, whether the Mantle is already up or played now (Y83U F30 T3: a
  // Mantle plan showed hp_lost 0).
  // An Inferno played this turn (none up before) adds its own 1 HP at the start of every later turn.
  const newInferno = (input.player.inferno ?? 0) === 0 && sim.inferno > 0 ? 1 : 0;
  const startTurnLoss = winsFight ? 0 : (input.player.startTurnHpLoss ?? 0) + sim.mantles + newInferno;
  const turnLoss = selfLoss + incomingAfterBlock + Math.max(0, disintegration - blockAtEnd) + heldHpLoss;
  // Self-Forming Clay: next turn's block, CLAY_BLOCK for each HP loss of this turn (ours so far, a held card's
  // HP loss, Disintegration past block, each held Burn or enemy hit past block and Buffer) on top of what is owed.
  const clayEvents = winsFight
    ? 0
    : sim.hpLossEvents + heldCards.filter((card) => (card.heldHpLoss ?? 0) > 0).length + (disintegration > blockAtEnd ? 1 : 0) + lossesPast([heldPenalty, ...hits.map((hit) => hit.amount)], blockLeft, sim.buffer);
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
    const enemyTurn: number[] = [];
    {
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
    // Lasting value (Strength, powers) pays off over the rest of the fight: more in long fights,
    // less the later it comes.
    const fightLength = (input.fightKind === "boss" ? 1.8 : input.fightKind === "elite" ? 1.4 : 0.8) * later;
    const earliness = Math.max(0.4, 1 - 0.08 * ((input.turn ?? 1) - 1));
    score += lastingValue(sim, weights) * fightLength * earliness;
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
    if (sim.mantles > 0 && hpAfter <= 10) score -= sim.mantles * (MANTLE_VALUE * fightLength * earliness + weights.hp * 5);
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
          block: Math.max(0, enemy.block),
          artifact: enemy.artifact,
          slippery: enemy.slippery ?? 0,
          curlUp: enemy.curlUp ?? 0,
          flutter: enemy.flutter ?? 0,
          strengthGained: enemy.strengthDelta,
          shrink: enemy.shrink ?? 0,
          ...((enemy.demise ?? 0) > 0 ? { demise: enemy.demise } : {}),
          ...(enemy.ravenousStunned ? { stunned: true } : {}),
          ...(enemy.maxHp >= 1_000_000 ? { husk: true } : {}),
        })),
      incomingAfterBlock,
      energyLeft: sim.energy,
      vulnerableApplied: sim.vulnerableApplied,
      weakApplied: sim.weakApplied,
      strengthGained: sim.permStrength,
      cardsDrawn: sim.cardsDrawn,
      unknownCards: sim.unknown,
      sandpitAfter,
      ...(stunned.length > 0 ? { stuns: stunned.map((enemy) => enemy.name), stunIndexes: stunned.map((enemy) => enemy.index), stunSaved } : {}),
      ...(sim.bufferSpent > 0 ? { bufferSpentBySelf: sim.bufferSpent } : {}),
      startTurnKills: startTurnKills.map((enemy) => enemy.name),
      withersAdded,
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
      ...(sim.thrashRandom.length > 0 ? { thrashRandom: sim.thrashRandom } : {}),
      ...(sim.freeAttacks > 0 ? { freeAttacksLeft: sim.freeAttacks } : {}),
      ...(sim.lastingDrinks > 0 ? { lastingDrinks: sim.lastingDrinks } : {}),
      ...(retaliated.length > 0 ? { retaliated } : {}),
      ...(clayBlockNext > 0 ? { clayBlockNext } : {}),
      ...(heldPenalty > 0 && !winsFight ? { heldDamage: heldPenalty } : {}),
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
  const hand = sim.hand.map((card) => `${card.cardId}${card.upgraded ? "+" : ""}:${card.cost}`).sort().join(",");
  const enemies = sim.enemies.map((enemy) => `${enemy.hp}/${enemy.block}/${enemy.vulnerable}/${enemy.weak}/${enemy.artifact}/${enemy.strengthDelta}/${enemy.slippery ?? 0}/${enemy.curlUp ?? 0}/${enemy.flutter ?? 0}/${enemy.sleepLost ?? 0}/${enemy.tempStrengthLoss ?? 0}/${enemy.demise ?? 0}/${enemy.shrink ?? 0}/${enemy.ravenousStunned ? 1 : 0}`).join("|");
  return `${hand}#${sim.energy}#${sim.hp}#${sim.block}#${sim.strength}#${sim.hpLostThisTurn ? 1 : 0}#${enemies}#${sim.flat}#${sim.tempDex}#${sim.buffer}#${sim.retaliate}#${sim.rupture}#${sim.facing}#${sim.colossus ? 1 : 0}#${sim.played}#${sim.draws.map((draw) => `${draw.withEnergy}/${draw.withoutEnergy}`).join(",")}#${sim.exhausted.length}/${sim.exhaustedCount > 0 ? 1 : 0}#${sim.escapes}#${sim.mantles}#${sim.enraged}#${sim.tainted}#${sim.inferno}#${sim.bombs}#${sim.gigantic}#${sim.topPlaced ? 1 : 0}#${sim.vigor}#${sim.noBlock ? 1 : 0}#${sim.attacksPlayed}/${sim.relicAttacks}/${sim.skillsPlayed}#${sim.freeAttacks}#${sim.duplicate}/${sim.duplicateAttacks}#${sim.drawnInHand}#${sim.bufferSpent}#${sim.regen}#${sim.pileDrawn}#${sim.plating}#${sim.strikeReplay}#${sim.hpLossEvents}`;
}

export interface SolveResult {
  plans: Plan[];
  nodes: number;
  truncated: boolean;
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
    !EXHAUST_HAND.has(card.cardId)
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
    const next = play(sim, card, step.target, input.player);
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
    steps: [],
    blockGained: 0,
    damageDealt: 0,
    vulnerableApplied: 0,
    weakApplied: 0,
    flat: 0,
    tempDex: 0,
    intangible: false,
    buffer: input.player.buffer ?? 0,
    bufferSpent: 0,
    duplicate: input.player.duplicate ?? 0,
    duplicateAttacks: input.player.duplicateAttacks ?? 0,
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
    unknown: [],
    feedKills: 0,
    dazedAdded: 0,
    escapes: 0,
    mantles: 0,
    enraged: 0,
    tainted: 0,
    inferno: input.player.inferno ?? 0,
    feelNoPain: input.player.feelNoPain ?? 0,
    hellraiser: input.player.hellraiser === true,
    darkEmbrace: input.player.darkEmbrace ?? 0,
    lastingDrinks: 0,
    attacksPlayed: 0,
    relicAttacks: 0,
    skillsPlayed: 0,
    freeAttacks: input.player.freeAttacks ?? 0,
    unmovableSpent: false,
    bombs: 0,
    gigantic: 0,
    pile: pileValue(input.drawPile, weights.hp, quietTurn(input) && !input.player.keepsBlock),
    pileDrawn: 0,
    exhausted: [],
    drawnExhausted: 0,
    randomExhausts: 0,
    thrashGrowth: [],
    thrashRandom: [],
    exhaustedCount: input.player.exhaustedThisTurn ? 1 : 0,
    held: input.hand.filter((card) => !card.playable),
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

/** Returns every distinct end-of-turn outcome's best plan, best first. */
export function solveTurn(input: SolverInput): SolveResult {
  const maxNodes = input.maxNodes ?? 60_000;
  const weights = weightsFor(input);
  const root = rootSim(input, weights);

  const seen = new Set<string>();
  const byOutcome = new Map<string, Plan>();
  let nodes = 0;
  let truncated = false;

  const visit = (sim: Sim): void => {
    nodes += 1;
    const plan = evaluate(sim, input, weights);
    const o = plan.outcome;
    const potionSteps = sim.steps.filter((step) => step.cardId.startsWith("POTION:")).map((step) => step.cardId);
    const potionsDrunk = potionSteps.length;
    // The potions drunk are part of the outcome: a line drinking a potion never merges with (and so never
    // replaces) a potion-free line, however close their scores. Otherwise a potion line scoring a hair
    // higher (lasting Dexterity, say) swallows "end turn" and the planner sees no dry line that survives,
    // so it drinks on its own as the "only line" (2CCM6XK4PB37 F15 T2, Dexterity Potion at 0 energy).
    const signature = `${o.hpLoss}|${o.damageDealt}|${o.kills.join(",")}|${o.enemyHpAfter.map((enemy) => `${enemy.hp}:${enemy.vulnerable}:${enemy.weak}`).join(",")}|${o.strengthGained}|${o.cardsDrawn}|${o.sandpitAfter ?? "-"}|${Math.round(plan.score)}|${[...potionSteps].sort().join(",")}`;
    const existing = byOutcome.get(signature);
    // Same outcome: prefer the line drinking fewer potions (with no potion cost a potion reaching the
    // same end state is a potion wasted), then the shorter plan (fewer steps = fewer chances for the
    // board to surprise us).
    const tie = existing !== undefined && Math.abs(plan.score - existing.score) < 1e-9;
    const fewerPotions = tie && potionsDrunk < potionStepCount(existing.steps);
    const samePotions = tie && potionsDrunk === potionStepCount(existing.steps);
    if (!existing || plan.score > existing.score + 1e-9 || fewerPotions || (samePotions && plan.steps.length < existing.steps.length)) {
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
    const skillsLeft = input.player.maxSkills === null || input.player.maxSkills === undefined ? Infinity : input.player.maxSkills - sim.skillsPlayed;
    for (const card of sim.hand.flatMap((entry) => (entry.special === "gamble" ? gambleWays(sim, entry) : entry.choices ? choiceWays(entry) : [entry]))) {
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
        if (truncated) return;
      }
    }
  };

  visit(root);
  const plans = [...byOutcome.values()].map((plan) => drawFirst(plan, input, weights)).sort((a, b) => b.score - a.score);
  const result = { plans, nodes, truncated };
  solveTap.onSolve?.(input, result);
  return result;
}

function potionStepCount(steps: Step[]): number {
  return steps.filter((step) => step.cardId.startsWith("POTION:")).length;
}

function vector(plan: Plan): number[] {
  const o = plan.outcome;
  const debuffs = o.enemyHpAfter.filter((enemy) => enemy.hp > 0).reduce((sum, enemy) => sum + Math.min(enemy.vulnerable, 3) + Math.min(enemy.weak, 3), 0);
  const living = o.enemyHpAfter.filter((enemy) => enemy.hp > 0).length;
  // Drinking a potion is its own axis (the potions a line drinks, no cost: Dai, a potion is a 0-cost one-shot
  // card): without it "same result, but spends Fortifier" dominated "take 4 damage, keep Fortifier" and the
  // potion-free plan was never shown (Vantom, live run). Waking a sleeper likewise: without this axis "Taunt, Setup Strike, Pillage" (11 damage, wakes the Matriarch)
  // dominated the line that let it sleep, and that line was filtered out and never played (1K5G F17 T1).
  // Cards drawn with no energy left to play them are discarded unplayed: not a gain on this axis (Q4JV
  // F17 T3: an 8-damage Battle Trance line at 0 energy was kept beside the 23-damage rank 1).
  const drawn = o.energyLeft > 0 ? o.cardsDrawn : 0;
  // Potions drunk count on their own axis: combat-plan.ts prices them at 0 (Jev decides), and a line
  // drinking one must never dominate the same line without it.
  // A revive spent (Fairy in a Bottle, Lizard Tail) is its own axis: a line spending one never dominates a line that does not.
  // A Waterfall Giant kill is its own axis too: HP plus block kept less the blast (0 without a kill), so a kill
  // into a blast we cannot take on this turn's numbers never dominates a line that does not kill (9Q7V F17 T14:
  // Sword Boomerang doubled by One-Two Punch killed it at 31 HP into a 56 blast as the "only distinct line").
  const eruption = (o.explodesNext ?? 0) > 0 ? (o.eruptionMargin ?? -(o.explodesNext ?? 0)) : 0;
  return [o.winsFight ? 1 : 0, -o.hpLoss, o.damageDealt, -living, debuffs, o.strengthGained, drawn, -potionStepCount(plan.steps), o.sandpitAfter ?? 0, -o.sleepCost, Math.floor(o.lasting / 5), o.stunSaved ?? 0, -(o.revived?.sources.length ?? 0), eruption, o.nextTurnEnergy ?? 0];
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
