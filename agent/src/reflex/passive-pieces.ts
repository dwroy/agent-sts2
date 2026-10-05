/**
 * Passive damage and passive block (PASSIVE_PIECES, Dai 2026-10-03; experience 2026-10-03.3 deck-passive-engine, the
 * Queen section of knowledge/ironclad-guide.md): the damage and block that come from relics and powers, not from the
 * cards' own numbers. Weak and Frail on us cut our attack cards (their Strength too) and our card block by 25%; these do
 * not move. The one place their numbers and their rules live, for the rollout's later turns (rollout.ts), the whole-fight
 * boss sim (B2 / B3: the same simulation) and the boss clock (boss-clock.ts).
 *
 * Measured on the logged combat states (tools/passive-pieces-check.py, 2026-10-03: the A7+ boss and elite fights and every
 * A7+ fight holding one of the relics, 47,617 frames; a turn transition is the last frame of our turn, its action
 * end_turn, and the first frame of the next; "of N" counts every transition the check could read, the rest being other
 * damage or block on the same turn):
 *   - Thorns (THORNS_POWER: Bronze Scales 3 from the fight's start, Liquid Bronze 3 a drink) and Flame Barrier
 *     (FLAME_BARRIER_POWER 4, 6 upgraded, this enemy turn only): the attacker loses that much per hit it lands, multi-hit
 *     moves once a hit. Our Weak does not cut it (Weak up: Thorns 69 of 75 exactly amount x hits, none at x0.75; Flame
 *     Barrier 31 of 32), the attacker's Vulnerable does not raise it (Thorns 149 of 160 exact, 2 at x1.5; Flame Barrier 62
 *     of 71, 1 at x1.5). 0U96U4D9Z3PP F48 T3: Beam 12x3 under our Weak 99, Thorns 3, the Amalgam (Vulnerable 4) lost 9.
 *     8D8DZ9K680C2 F48 T7: Off With Your Head 7x5 under Weak 95, Thorns 3 + Flame Barrier 4: the Queen lost 47 = 5 x 7 +
 *     Hourglass 3 + Inferno 9. The enemy's block from our turn is gone by its own turn's hits (Turret Operator 25 block on
 *     both frames, Unload 5 hits: 15 HP lost to Thorns 3).
 *   - Mercury Hourglass: 3 to every enemy at the start of each of our turns, turn 1 included (8D8DZ9K680C2 F48 T1: the
 *     Amalgam 211 -> 208 and the Queen 419 -> 416 before the first card), through block (T3-T5: the Queen's Burn Bright
 *     block 20 -> 17), not cut by Weak (19 of 35 under Weak exact, none at x0.75) nor raised by Vulnerable (74 of 99
 *     exact, none at x1.5; the others attacked into other damage or split). Inferno's sweep likewise (Weak up 131 of 162
 *     exact, none at x0.75; Vulnerable 324 of 390 exact, none at x1.5).
 *   - Sai: 7 block at the start of every turn, turn 1 included, not cut by Frail and no Dexterity (Frail up: 45 of 53 turn
 *     starts exactly 7, the rest Self-Forming Clay on top; 8D8DZ9K680C2 F48 T2-T11 under Frail 99 and Dexterity 2: 7 each).
 *   - Crimson Mantle (CRIMSON_MANTLE_POWER: its amount, 7 a copy, 10 upgraded): that block at the start of every turn, not
 *     cut by Frail (53 of 57 Frail turn starts exact; 9V7K1P899R5N F33 T4: 10 under Frail with Dexterity up).
 *   - Plating (Gorget 4 from the fight's start, Stone Armor 4/6, Heart of Iron 7): its block at the end of our turn, not
 *     cut by Frail (160 of 165 Frail turns lost the intent less block less Plating exactly, 1 at x0.75; 0B5YKJFM0E8B F33 T3).
 *   - Orichalcum: 6 block at the end of a turn that left no card block, not cut by Frail (11 of 11; 842N6N604DVX F31 T1),
 *     and Plating up does not stop it (A8ENYFR4ZWKG F48 T7: 0 block, Plating 9, 36 incoming, 21 lost; 842N6N604DVX F31
 *     T3). 45 of 45 without Frail.
 *   - Ripple Basin: 4 block at the end of a turn with no Attack played (42 of 45, 5 of 5 under Frail: 8V0HD9Y207WY F14 T2).
 *   - Letter Opener: 5 to every enemy each time the turn's Skills reach a multiple of 3, not cut by Weak (13 of 14 such
 *     plays, the other a Second Wind's own; 7PWU4CD3QCP3 F48 T4 under the Queen's Weak: the 3rd Skill, a Defend, took 5
 *     off both).
 *   - Ornamental Fan: 4 block each time the turn's Attacks reach a multiple of 3, not cut by Frail and no Dexterity (119 of
 *     123: 15 of 16 under Frail, 16 of 16 with Dexterity; 4JGPCH3WX6JV F33 T4 Dismantle under Frail: +4).
 *   - Parrying Shield: 6 to a random enemy at the end of a turn with 10 or more block (93 of 108 such turns, 6 more into
 *     the enemy's block; 162 of 175 turns under 10 dealt none, the rest other damage), Plating's end-of-turn block counted
 *     (2 of 2: Q8XR6EXAF6QV F11 T4, 8 card block + Plating 2), through the enemy's block (4JGPCH3WX6JV F48 T6: 12 block,
 *     the Queen's Burn Bright block took the 6).
 *   - Horn Cleat 14 block at the start of turn 2, Captain's Wheel 18 at the start of turn 3, Anchor 10 on turn 1 (B1.5 /
 *     batch logs: rollout-live fightRelicsOf, relicBlockOf, boss-start FIGHT_START_RELICS).
 *
 * Where each one was modelled before PASSIVE_PIECES (2026-10-03 review): the solver's current turn has Thorns, Flame
 * Barrier, Plating, the start-of-next-turn sweep (Hourglass, Inferno, Rolling Boulder) and Mantle's HP; the rollout's
 * later turns and the whole-fight sim have those and Sai, Captain's Wheel, Mantle's block, Thorns kept up, a Flame
 * Barrier the policy plays; Orichalcum, Ripple Basin and Horn Cleat only in the whole-fight sim; Letter Opener,
 * Ornamental Fan and Parrying Shield nowhere. The boss clock had Inferno, Juggernaut and Sai only, and cut Inferno by the
 * Queen's Weak with the cards.
 *
 * With PASSIVE_PIECES on (the default): the rollout's later turns (live and whole-fight) get Orichalcum, Ripple Basin,
 * Horn Cleat, Letter Opener, Ornamental Fan and Parrying Shield (rollout-live boardRolloutInput: RolloutInput.passive);
 * the boss clock counts Thorns per boss hit, Flame Barrier, Mercury Hourglass, Letter Opener and Parrying Shield as
 * damage the Queen's Weak does not cut (with Inferno and Juggernaut), and Crimson Mantle, Plating, Orichalcum, Ornamental
 * Fan, Ripple Basin and the one-turn block relics with Sai as block a turn (at CLOCK_PASSIVE_BLOCK_SHARE). Since the
 * follow-up (2026-10-03, Dai via the dev session) the live solver's current turn has the five relic pieces too
 * (liveSolverFields, combat-plan), and Plating no longer stops Orichalcum (orichalcumPlating). Replayed on the logged turns'
 * first planning decisions (tools/passive-pieces-planner-replay.ts compare, v4 cd31bfe against this, the switch on both
 * times; 113 A8+ boss/elite fights holding one of the five relics, 60 hallway ones, 40 holding none): the 238 turns holding
 * none byte for byte the same; of the 1,124 holding one, 575 decisions change: code plays alone where it asked (or the
 * other way) on 19, code's own play changes on 7 (a least-loss pick 4, a lethal found 1), the lines shown on 280, the same
 * lines' numbers on 123, the rollout's best on 119, the line Jev's pick plays (the HP guard) on 76. off: everything exactly as before (the v4 base's clock on all 578 logged A7-A9 boss
 * fights, B2 on 68 control fight starts, the golden planner tests: byte for byte).
 *
 * Replayed 2026-10-03 (tools/passive-pieces-replay.ts, tools/boss-sim/pp-calib.py; off vs on in one process):
 *   - 5-turn rollout (turn 1 and 5 boards at the live settings): every board without a relic piece the same byte for byte
 *     (25 Queen, 35 other boss, 34 elite); on the 261 boards with one (Horn Cleat, Orichalcum, Ripple Basin, Letter
 *     Opener, Ornamental Fan, Parrying Shield) the next turn loses 1.7-3.1 HP less a line, the best line moves on 37, and
 *     the first line's further-loss forecast against the log comes down from +7.0 to +6.0 (boss) and +7.1 to +5.4 (elite),
 *     mean |error| 11.6 -> 11.3 and 9.7 -> 9.0. The Queen's turn-1 boards are saturated (every line loses every HP within
 *     the horizon or by the terminal estimate): no line's number moves there.
 *   - Whole-fight sim (B2 backtest, 100 samples, the 49 A7-A9 boss fights holding Letter Opener, Fan or Parrying Shield,
 *     the only ones it changes): the calibrated win rate 2-3 points higher (actual 0.41: 0.48 -> 0.51 from turn 1);
 *     calibrated Brier 0.1307 -> 0.1315 (turn 1), 0.1287 -> 0.1366 (turn 5), 0.1345 -> 0.1406 (pre-fight), every
 *     difference inside its paired-bootstrap 95% interval; raw Brier 0.1198 -> 0.1128 (turn 1).
 *   - Boss clock (502 A8/A9 fights): HP lost a turn against (entry - end) / turns, bias +0.69 -> +0.22 and median |error|
 *     1.57 -> 1.47 on the 325 non-Queen fights it changes, the 153 others unchanged; the Queen's 24: -0.52 -> -1.03,
 *     2.30 -> 2.12. Deck damage at the real length against the damage realised into the clock's parts: median |log error|
 *     0.25 -> 0.24 (non-Queen), 0.56 -> 0.59 (the Queen: her realised damage leaves out the Amalgam's 211 HP).
 */

import { asArray, asRecord, num, str } from "../core/util/json.js";

/** PASSIVE_PIECES (config.passivePieces; the loop sets it at start, process.env before that). */
export const passivePiecesOptions: { enabled: boolean } = { enabled: process.env["PASSIVE_PIECES"] !== "off" };

/** Sai: 「在你的回合开始时，获得{Block}点格挡」 — 7 at the start of every turn (see the header). */
export const SAI_BLOCK = 7;
/** Mercury Hourglass: damage to every enemy at the start of our turn (PLC F33: Rocket 108 -> 105; see the header). */
export const MERCURY_HOURGLASS_DAMAGE = 3;
/** Bronze Scales: Thorns 3 from the fight's start (23 of 23 logged boss fights' first frames: boss-start). */
export const BRONZE_SCALES_THORNS = 3;
/** Gorget: Plating 4 from the fight's start (24 of 24: boss-start). */
export const GORGET_PLATING = 4;
/** Anchor: 10 block on turn 1 (25 of 26: boss-start). */
export const ANCHOR_BLOCK = 10;
/**
 * Orichalcum, Ripple Basin (B2, rollout-live fightRelicsOf: 13 of 18 enemy turns after a 0-block end took the intent
 * less 6; 5 of 7 no-Attack turns 4; re-measured above: 54 of 54, 31 of 31).
 */
export const ORICHALCUM_BLOCK = 6;
export const RIPPLE_BASIN_BLOCK = 4;
/** Horn Cleat: 14 block at the start of turn 2 (13 A7-A9 boss fights: 14.5 against the fights without). */
export const HORN_CLEAT_BLOCK = 14;
export const HORN_CLEAT_TURN = 2;
/** Captain's Wheel: 18 block at the start of turn 3 (19 of 20 third turns, no other turn). */
export const CAPTAINS_WHEEL_BLOCK = 18;
export const CAPTAINS_WHEEL_TURN = 3;
/** Letter Opener: 「你每在同一回合内打出{Cards}张技能牌，就对所有敌人造成{Damage}点伤害」 — 3 and 5. */
export const LETTER_OPENER = { every: 3, damage: 5 } as const;
/** Ornamental Fan: 「你每在同一回合内打出{Cards}张攻击牌，就获得{Block}点格挡」 — 3 and 4. */
export const ORNAMENTAL_FAN = { every: 3, block: 4 } as const;
/** Parrying Shield: 「如果你在回合结束时拥有至少{Block}点格挡，则对随机敌人造成{Damage}点伤害」 — 10 and 6. */
export const PARRYING_SHIELD = { block: 10, damage: 6 } as const;

/**
 * The relic pieces the later turns' solver plays with (turn-solver PlayerSim fields the live current turn leaves unset;
 * RolloutInput.passive). Orichalcum and Ripple Basin are the fields the whole-fight sim already had (fightRelicsOf).
 */
export interface SolverPieces {
  orichalcum?: number;
  rippleBasin?: number;
  letterOpener?: { every: number; damage: number };
  ornamentalFan?: { every: number; block: number };
  parryingShield?: { block: number; damage: number };
}

/**
 * The solver's own fields for the pieces (turn-solver PlayerSim): the counters of the turn so far and Orichalcum's rule. Kept
 * as plain shapes here (this module is a leaf; turn-solver reads the same field names).
 */
export interface SolverPieceFields {
  /** Silent-0108: the observed ten-Skill counter persists across turns. */
  tuningFork?: { every: number; block: number; count: number };
  orichalcum?: number;
  rippleBasin?: number;
  letterOpener?: { every: number; damage: number; count: number };
  ornamentalFan?: { every: number; block: number; count: number };
  parryingShield?: { block: number; damage: number };
  /**
   * Plating's end-of-turn block (up, or played this turn) does not stop Orichalcum: the logs show it for Plating up
   * (A8ENYFR4ZWKG F48 T7, 842N6N604DVX F31 T3: 0 card block with Plating 9 / 3, Orichalcum's 6 came too); no logged turn
   * ended with Orichalcum, no card block and Plating played that turn, so Plating played is taken to act like Plating up
   * (the same PLATING_POWER at the turn's end). Set with the pieces (PASSIVE_PIECES); unset, the solver's earlier rule.
   */
  orichalcumPlating?: true;
}

/**
 * The pieces as one turn's solver fields: `counts` are the turn's Letter Opener / Ornamental Fan counters so far (a new
 * turn: none). Orichalcum carries orichalcumPlating.
 */
export function solverFieldsOf(pieces: SolverPieces | null | undefined, counts: { letterOpener?: number; ornamentalFan?: number } = {}): SolverPieceFields {
  if (!pieces) return {};
  return {
    ...(pieces.orichalcum ? { orichalcum: pieces.orichalcum, orichalcumPlating: true as const } : {}),
    ...(pieces.rippleBasin ? { rippleBasin: pieces.rippleBasin } : {}),
    ...(pieces.letterOpener ? { letterOpener: { ...pieces.letterOpener, count: counts.letterOpener ?? 0 } } : {}),
    ...(pieces.ornamentalFan ? { ornamentalFan: { ...pieces.ornamentalFan, count: counts.ornamentalFan ?? 0 } } : {}),
    ...(pieces.parryingShield ? { parryingShield: { ...pieces.parryingShield } } : {}),
  };
}

/**
 * The live planner's current turn (combat-plan): the run's pieces with this turn's counters, from the relics' own counters
 * (their stack, as Kusarigama's: a duplicate, a replay, an autoplay count) mod `every`; 0 before the turn's first card,
 * whatever the stack shows (logged: a turn's first frame shows the last turn's count, e.g. X8HF0SB0XGJ1 F33 T6 Letter
 * Opener 2 with no card played, 0 after the first; in 1,739 of 1,745 logged Letter Opener frames and 1,911 of 1,953
 * Ornamental Fan frames the stack mod 3 is the turn's Skills / Attacks mod 3, the rest turn-start frames like that one and,
 * for the Fan, 10 mid-turn frames where it counted a replay). Ripple Basin is left out once an Attack was played this turn
 * (`attacksPlayedThisTurn`: the solver counts its own line's Attacks only). Empty with PASSIVE_PIECES off or none held.
 */
export function liveSolverFields(runRaw: unknown, cardsPlayedThisTurn: number, attacksPlayedThisTurn = 0, enabled = passivePiecesOptions.enabled): SolverPieceFields {
  const relics = asArray(asRecord(runRaw)["relics"]).map(asRecord);
  const found = solverPiecesOf(relics.map((relic) => str(relic["relic_id"])), enabled);
  // 6EV5V6PJJS9D F39 T3 / T082DRCUHRRD F12 T7, silent-0108/0072:
  // unlike the turn-local counters below, Tuning Fork starts this turn at nine.
  const fork = relics.find((relic) => str(relic["relic_id"]) === "TUNING_FORK");
  const tuning = enabled && str(asRecord(runRaw)["character_id"]).toLowerCase() === "silent" && fork
    ? { tuningFork: { every: 10, block: 7, count: num(fork["stack"]) % 10 } } : {};
  if (!found) return tuning;
  // Ripple Basin: an Attack already played this turn (a re-plan mid-turn) rules it out; the solver counts only its own.
  const { rippleBasin: _basin, ...rest } = found;
  const pieces: SolverPieces = attacksPlayedThisTurn > 0 ? rest : found;
  const counter = (id: string, every: number): number => {
    if (cardsPlayedThisTurn <= 0 || every <= 0) return 0;
    return num(relics.find((relic) => str(relic["relic_id"]) === id)?.["stack"]) % every;
  };
  return { ...tuning, ...solverFieldsOf(pieces, {
    ...(pieces.letterOpener ? { letterOpener: counter("LETTER_OPENER", pieces.letterOpener.every) } : {}),
    ...(pieces.ornamentalFan ? { ornamentalFan: counter("ORNAMENTAL_FAN", pieces.ornamentalFan.every) } : {}),
  }) };
}

/** The run's relics as the later turns' solver pieces (null: none held, or PASSIVE_PIECES off). */
export function solverPiecesOf(relicIds: readonly string[], enabled = passivePiecesOptions.enabled): SolverPieces | null {
  if (!enabled) return null;
  const out: SolverPieces = {};
  if (relicIds.includes("ORICHALCUM")) out.orichalcum = ORICHALCUM_BLOCK;
  if (relicIds.includes("RIPPLE_BASIN")) out.rippleBasin = RIPPLE_BASIN_BLOCK;
  if (relicIds.includes("LETTER_OPENER")) out.letterOpener = { ...LETTER_OPENER };
  if (relicIds.includes("ORNAMENTAL_FAN")) out.ornamentalFan = { ...ORNAMENTAL_FAN };
  if (relicIds.includes("PARRYING_SHIELD")) out.parryingShield = { ...PARRYING_SHIELD };
  return Object.keys(out).length > 0 ? out : null;
}

/** The relics whose effects PASSIVE_PIECES adds to the whole-fight sim (B3's "not modelled" list leaves them out). */
export const PASSIVE_SIM_RELICS = ["ORICHALCUM", "RIPPLE_BASIN", "LETTER_OPENER", "ORNAMENTAL_FAN", "PARRYING_SHIELD"] as const;

/**
 * For the boss clock (an average turn, not a simulation): how often the conditional pieces fire, logged over the A8+
 * boss fights of the runs holding each relic (2026-10-03; turns = our turns ending in end_turn): Parrying Shield 48 of
 * 130 turns ended with 10+ block (Plating counted); Orichalcum 22 of 81 turns with an attack coming ended with no card
 * block; Ornamental Fan 31 fires in 113 turns; Ripple Basin 15 of 135 turns without an Attack; Letter Opener 4 fires in
 * 110 turns (0.92 Skills a turn).
 */
export const CLOCK_FIRE_RATE = { parryingShield: 48 / 130, orichalcumAttacked: 22 / 81, ornamentalFan: 31 / 113, rippleBasin: 15 / 135, letterOpener: 4 / 110 } as const;

/**
 * The share of the passive block a turn the boss clock's HP lost a turn counts (bossLossPerTurn: that turn's attack x the
 * boss's logged unblocked share, less this much of the block). The logged share already carries the logged fights'
 * own passive block, and a turn whose card block stops the attack wastes it (20% of the 2,905 attacked A8+ boss turns lost
 * nothing). Measured by replaying the clock on the 193 logged A8+ boss fights whose decks or relics hold a block piece
 * (tools/passive-pieces-replay.ts, 2026-10-03; error = the clock's HP lost a turn - (entry - end HP) / turns): Sai alone
 * as before, bias +0.79 / mean |error| 2.00 on the 173 non-Queen fights, Queen +-0.73 / median |error| 2.30 (20); every
 * piece at full value -0.81 / 2.10, Queen -2.79 / 2.77; at half -0.09 / 1.87, Queen -1.35 / 2.12 (0.4: +0.09 / 1.86;
 * 0.6: -0.26 / 1.90). Half was the better of the two time halves' fits too (mean |error| 1.77 -> 1.74 early, 2.23 -> 2.00
 * late). In-sample: one number fitted on these fights.
 */
export const CLOCK_PASSIVE_BLOCK_SHARE = 0.5;

/** One passive piece of the boss clock, with its name for the note. */
export interface ClockPiece {
  name: string;
  amount: number;
  /** From this fight turn on (1: the start; the deck's setup turn for a power card). */
  from: number;
  /** Damage only: to every enemy (counted once per body into the Kaiser Crab, as the deck's AoE). */
  aoe?: boolean;
  /** Damage only: per boss attack hit (Thorns, Flame Barrier), times the boss's expected hits that turn. */
  perHit?: boolean;
  /** Block only: on this turn alone (Anchor, Horn Cleat, Captain's Wheel). */
  only?: boolean;
  /** Block only: Plating's, one less each later turn. */
  decays?: boolean;
  /** Block only: on the turns an attack comes (Orichalcum: no card block left with an attack coming). */
  attacked?: boolean;
}

/**
 * The relic part of the boss clock's passive pieces (the cards' part, Flame Barrier, Crimson Mantle and Stone Armor, is
 * the deck profile's: boss-clock deckProfileForBoss). Damage a turn and block a turn, as the clock's average turn.
 */
export function clockRelicPieces(relicIds: readonly string[]): { damage: ClockPiece[]; block: ClockPiece[] } {
  const damage: ClockPiece[] = [];
  const block: ClockPiece[] = [];
  const has = (id: string) => relicIds.includes(id);
  if (has("MERCURY_HOURGLASS")) damage.push({ name: `Mercury Hourglass ${MERCURY_HOURGLASS_DAMAGE} to all`, amount: MERCURY_HOURGLASS_DAMAGE, from: 1, aoe: true });
  if (has("BRONZE_SCALES")) damage.push({ name: `Bronze Scales Thorns ${BRONZE_SCALES_THORNS} a boss hit`, amount: BRONZE_SCALES_THORNS, from: 1, perHit: true });
  if (has("LETTER_OPENER")) {
    const amount = LETTER_OPENER.damage * CLOCK_FIRE_RATE.letterOpener;
    damage.push({ name: `Letter Opener ${LETTER_OPENER.damage} to all every 3rd Skill (~${amount.toFixed(1)}/turn)`, amount, from: 1, aoe: true });
  }
  if (has("PARRYING_SHIELD")) {
    const amount = PARRYING_SHIELD.damage * CLOCK_FIRE_RATE.parryingShield;
    damage.push({ name: `Parrying Shield ${PARRYING_SHIELD.damage} at 10+ block (~${amount.toFixed(1)}/turn)`, amount, from: 1 });
  }
  if (has("SAI")) block.push({ name: `Sai ${SAI_BLOCK}`, amount: SAI_BLOCK * relicIds.filter((id) => id === "SAI").length, from: 1 });
  if (has("GORGET")) block.push({ name: `Gorget Plating ${GORGET_PLATING}`, amount: GORGET_PLATING, from: 1, decays: true });
  if (has("ANCHOR")) block.push({ name: `Anchor ${ANCHOR_BLOCK} on T1`, amount: ANCHOR_BLOCK, from: 1, only: true });
  if (has("HORN_CLEAT")) block.push({ name: `Horn Cleat ${HORN_CLEAT_BLOCK} on T${HORN_CLEAT_TURN}`, amount: HORN_CLEAT_BLOCK, from: HORN_CLEAT_TURN, only: true });
  if (has("CAPTAINS_WHEEL")) block.push({ name: `Captain's Wheel ${CAPTAINS_WHEEL_BLOCK} on T${CAPTAINS_WHEEL_TURN}`, amount: CAPTAINS_WHEEL_BLOCK, from: CAPTAINS_WHEEL_TURN, only: true });
  if (has("ORICHALCUM")) block.push({ name: `Orichalcum ${ORICHALCUM_BLOCK} at no block (~${(ORICHALCUM_BLOCK * CLOCK_FIRE_RATE.orichalcumAttacked).toFixed(1)}/turn)`, amount: ORICHALCUM_BLOCK * CLOCK_FIRE_RATE.orichalcumAttacked, from: 1, attacked: true });
  if (has("ORNAMENTAL_FAN")) block.push({ name: `Ornamental Fan ${ORNAMENTAL_FAN.block} every 3rd Attack (~${(ORNAMENTAL_FAN.block * CLOCK_FIRE_RATE.ornamentalFan).toFixed(1)}/turn)`, amount: ORNAMENTAL_FAN.block * CLOCK_FIRE_RATE.ornamentalFan, from: 1 });
  if (has("RIPPLE_BASIN")) block.push({ name: `Ripple Basin ${RIPPLE_BASIN_BLOCK} with no Attack (~${(RIPPLE_BASIN_BLOCK * CLOCK_FIRE_RATE.rippleBasin).toFixed(1)}/turn)`, amount: RIPPLE_BASIN_BLOCK * CLOCK_FIRE_RATE.rippleBasin, from: 1 });
  return { damage, block };
}

/** A block piece's amount on fight turn `turn` (1-based). */
export function clockBlockAt(piece: ClockPiece, turn: number): number {
  if (turn < piece.from) return 0;
  if (piece.only) return turn === piece.from ? piece.amount : 0;
  if (piece.decays) return Math.max(0, piece.amount - (turn - piece.from));
  return piece.amount;
}
