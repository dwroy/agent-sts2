/**
 * Boss clock: how much damage a turn the act boss needs, and an estimate of what the deck deals there.
 *
 * Why: at A7 most runs reached the act-2 boss at full HP and lost the race (24HM 24.9 a turn of 33.5
 * needed, WLY1 21.6 into the crab's 408 HP, GGF8 20.3, SM9H 30.6 of ~44). Card rewards, shops and rest
 * sites never asked whether the deck could kill the boss in time, and DeepSeek's run plan only saw the
 * boss id.
 *
 * 2026-09-28 calibration (Dai: "1，2，3 直接修复"): 4 of 7 baseline deaths came from a clock that read
 * "gap 0/1" while the deck was well short (64ZB Vantom, ERPH Waterfall Giant, 02L4 Ceremonial Beast,
 * D3X1 Test Subject phase 2; NZWR Knowledge Demon the other way round). The clock used A0/A7 HP, flat
 * script turn counts, no mechanic that wastes damage, and a flat Demon Form. Now:
 *  - HP is the A8 HP from ascension 8 (logged max_hp in states.jsonl), plus heals/block the boss adds;
 *  - fight turns = min(the boss's script, the turns we survive at its logged A8 HP loss a turn from the
 *    expected entry HP), Waterfall Giant capped by its eruption, Test Subject split into phases;
 *  - Vantom's Slippery (9 hits deal 1), Ceremonial Beast's Ringing turns (one card), Knowledge Demon's
 *    curses, Queen's "You are mine" Weak and Aeonglass's Artifact cut the deck estimate or add HP;
 *  - Strength that grows (Demon Form from its play turn, Toasty Mittens, fed Rupture) is averaged over
 *    the fight's turns and multiplied by the attack hits a turn, not the attack cards.
 * The deck estimate's overall scale is fitted on the logged A8 boss fights (tools/boss-clock-calibrate.ts).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadOutcomeStats, type OutcomeStats } from "../knowledge/experience.js";
import { OUTCOME_BASE_ASC, hasAscensionTables, outcomeView, pairHelps, pairThin, referenceNote, referenceRow } from "../knowledge/outcome-tables.js";
import type { Knowledge } from "../knowledge/index.js";
import { bossDamageByTurn, bossHitsByTurn, bossHpAt, bossHpLoss, fillDbNumbers, monsterMoves, moveBaseDamages, moveDamageAt, powerAmountByAscText, powerScheduleAt, selfGainAt } from "../knowledge/monster-db.js";
import { measuredRoomExact } from "../knowledge/room-costs.js";
import type { GameState } from "../mod/schema.js";
import { asArray, asRecord, num, numOrNull, str, type JsonValue } from "../util/json.js";
import { modelHandCard, turnStartOnly } from "./card-model.js";
import { damageRole, isBigHit } from "./card-value.js";
import { CLOCK_PASSIVE_BLOCK_SHARE, clockBlockAt, clockRelicPieces, passivePiecesOptions, SAI_BLOCK, type ClockPiece } from "./passive-pieces.js";
import { bossEntryHp, bossStartHealOf, restedHp, restHealOf } from "./route-projection.js";
import { bumpDataVersion } from "../util/data-version.js";

/** Brimstone's Strength per turn (the mod does not expose it; the Slay the Spire value). */
export const BRIMSTONE_STRENGTH = 2;

export interface BossProfile {
  /** HP below ascension 8 (all parts / phases): the fallback when the monster DB has no parts for it. */
  hp: number;
  /** HP at ascension 8 and above (logged max_hp): the fallback when the monster DB has no parts for it. */
  hpA8: number;
  /** The monster DB boss parts whose HP counts (default: all of them; the Queen's Amalgam and the Kin's followers leave with her / the priest). */
  hpParts?: string[];
  /** HP the mechanic adds over the parts' max HP (block, heals, the followers the fight goes through). */
  addedHp?: number;
  /** What addedHp is, in a few words, for the notes (bossHpParts: never shown as the boss's own HP). */
  addedHpWhy?: string;
  /** Turns the boss's script allows before it ends the fight (a kill turn, a sandpit, the typical length). */
  scriptTurns: number;
  /**
   * HP we lose a turn in the logged A8 fights, our block already counted: the 75th percentile of (entry
   * HP - HP at the end) / turns, so a deck with less block than usual is not promised a long fight.
   */
  lossPerTurn: number;
  note: string;
  /** The mechanic that makes the damage race harder, in one line (shown to DeepSeek). */
  mechanic: string;
}

/**
 * Keys match a substring of run.boss_id. hpA8 from the logged max_hp at A8 (states.jsonl, 162 A8 boss
 * fights); lossPerTurn is the 75th percentile of (entry HP - HP at the end) / turns in those fights;
 * scriptTurns about the 75th percentile of the won fights' length, or the script's kill turn.
 */
export const BOSSES: Record<string, BossProfile> = {
  // Crusher 209 + Rocket 199 (A8: 219 + 209). The two wins took 7-8 turns; Bug Sting -> Laser opener.
  KAISER_CRAB: { hp: 408, hpA8: 428, scriptTurns: 8, lossPerTurn: 10, note: "two claws: single-target damage into the Rocket first (Laser {DMG:ROCKET:LASER_MOVE}, {BEHIND:ROCKET:LASER_MOVE} from behind, plus Strength, on T4/T9), AoE into both; the survivor's +99 Block lasts one turn ({CRAB_KILLS}; experience crab-kill-order); Bug Sting then Laser from T3-T4", mechanic: "two bodies: single-target damage is split; AoE hits both" },
  // 379 (A8 399) plus two 30-HP Ponder heals; the T11 Overwhelming (12x3 and more) ends long fights (NZWR).
  KNOWLEDGE_DEMON: { hp: 379, hpA8: 399, scriptTurns: 11, lossPerTurn: 6.3, note: "heals 30 twice (Ponder), curses the deck on T1/T5/T9; Strength scaling wins", mechanic: "curses from T1: Sloth caps plays at 3 a turn, Mind Rot draws one less from T5; +60 HP of heals" },
  THE_INSATIABLE: { hp: 321, hpA8: 341, scriptTurns: 8, lossPerTurn: 8.9, note: "Sandpit starts at {POWER:THE_INSATIABLE:SANDPIT_POWER}, eaten at 0; each Frantic Escape adds a turn, which only helps while the Sandpit would end the fight before our HP does ({SANDPIT_DEATHS_EN}; experience insatiable-escape)", mechanic: "Sandpit: the fight ends around T7 unless Frantic Escapes push it back" },
  // 512 (A8 535) plus two 33-block Ebb turns (L34T: 48 a turn, left at 173; M6P7: 33 a turn, left at 234).
  AEONGLASS: { hp: 578, hpA8: 601, addedHp: 66, addedHpWhy: "Ebb's block", scriptTurns: 9, lossPerTurn: 8.6, note: "Artifact {POWER:AEONGLASS:ARTIFACT_POWER} at start; Ebb gains {BLOCK:AEONGLASS:EBB_MOVE} block every 3rd turn; a Wither every {POWER:AEONGLASS:WITHERING_PRESENCE_POWER} cards played: few big cards", mechanic: "Artifact eats Vulnerable; two Ebbs of {BLOCK:AEONGLASS:EBB_MOVE} block; small cards feed Withers" },
  // Queen 400 (A8 419) plus ~20 block a turn while the Amalgam lives (~60). The Amalgam (199, A8 211) leaves
  // when she dies (notes/bosses.md; VE97, CWU9 ended with the Queen alone): its HP only counts when it
  // is killed first for survival.
  QUEEN: { hp: 460, hpA8: 480, hpParts: ["QUEEN"], addedHp: 60, addedHpWhy: "her block", scriptTurns: 8, lossPerTurn: 13.3, note: "kill the Amalgam first, single-target damage from turn 1 too, the Queen takes only AoE ({QUEEN_AMALGAM_EN}; experience queen-plan); from her third turn the Amalgam hits {DMG:TORCH_HEAD_AMALGAM:BEAM_MOVE}/{DMG:TORCH_HEAD_AMALGAM:TACKLE_3_MOVE} base, each hit x1.5 under our 99 Vulnerable (Weak and Frail on us too); when the Amalgam dies she Enrages that enemy turn (+2 Strength, no attack) and the enemy turn after is Off With Your Head (base {DMG:QUEEN:OFF_WITH_YOUR_HEAD_MOVE}, each hit x1.5 plus her Strength: 35 at A8 the first time): end the turn after the kill with HP plus block above it (6 of the 11 losses that killed the Amalgam died to that first hit)", mechanic: "\"You are mine\" from her T3: Weak (-25% damage), Vulnerable and Frail for the rest of the fight; ~60 Queen block; the Amalgam ({HP:TORCH_HEAD_AMALGAM}) adds its HP only if killed first" },
  // Three phases, 100/200/300 (A8 111/212/313 as logged).
  TEST_SUBJECT: { hp: 600, hpA8: 636, scriptTurns: 12, lossPerTurn: 7.5, note: "three phases ({PHASES} HP); Painful Stabs Wounds on unblocked hits; Multi Claw grows each use", mechanic: "phase 2 is a race: Multi Claw starts {DMG:TEST_SUBJECT:MULTI_CLAW_MOVE} and gains a hit every turn (D3X1: dead on its 5th)" },
  LAGAVULIN_MATRIARCH: { hp: 222, hpA8: 233, scriptTurns: 12, lossPerTurn: 5.8, note: "sleeps two turns (play powers), then drains Strength/Dexterity", mechanic: "drains Strength and Dexterity each cycle after it wakes" },
  SOUL_FYSH: { hp: 211, hpA8: 221, scriptTurns: 12, lossPerTurn: 5.1, note: "shuffles Beckons into the deck, Intangible turns; Scream ({DMG:SOUL_FYSH:SCREAM_MOVE}) puts {APPLIES:SOUL_FYSH:SCREAM_MOVE:VULNERABLE_POWER} Vulnerable on us, and De-Gas ({DMG:SOUL_FYSH:DE_GAS_MOVE}) then hits x1.5", mechanic: "Intangible turns (each hit deals 1) and Beckons clogging the draw" },
  // Priest 190 (A8 199) plus two followers ~59 (A8 62/63); the fight ends with the priest, winners dealt
  // ~60 into the followers on the way.
  THE_KIN: { hp: 250, hpA8: 260, hpParts: ["KIN_PRIEST"], addedHp: 60, addedHpWhy: "the followers soaking hits", scriptTurns: 10, lossPerTurn: 10.1, note: "priest {KIN_PRIEST} plus two followers ~{KIN_FOLLOWER}: AoE; priest cycle Orb of Frailty, Orb of Weakness, Beam {DMG:KIN_PRIEST:BEAM_MOVE} plus Strength a hit on T3/T7/T11, Ritual (+{GAIN:KIN_PRIEST:RITUAL_MOVE:STRENGTH_POWER} Strength): be above the T11 Beam (~{KIN_BEAM_T11})", mechanic: "followers soak single-target damage; Ritual grows the Beam every cycle" },
  VANTOM: { hp: 173, hpA8: 183, scriptTurns: 11, lossPerTurn: 7.3, note: "{POWER:VANTOM:SLIPPERY_POWER} Slippery stacks: multi-hit", mechanic: "Slippery {POWER:VANTOM:SLIPPERY_POWER}: its next {POWER:VANTOM:SLIPPERY_POWER} HP losses are 1 each (64ZB: 9 damage in T1-T4); multi-hit strips it" },
  // 240 (A8 250) plus Siphon heals (~20: winners dealt 250-285).
  WATERFALL_GIANT: { hp: 260, hpA8: 270, addedHp: 20, addedHpWhy: "Siphon heals", scriptTurns: 14, lossPerTurn: 5.1, note: "Siphon heals {SIPHON}; Pressure Gun on T5/T10/T15 ({GUN}): block it fully; Steam Eruption explodes for its stacks when it dies", mechanic: "eruption {ERUPTION} explodes on the kill: HP at the kill plus that turn's block must cover the stacks ({GIANT_BLOCK}; ERPH: T14 kill, 51 into 25 HP); an earlier kill has fewer stacks but is lost too without the HP ({GIANT_KILLS}; experience giant-explode)" },
  // 252 (A8 262); Ringing turns allow one card (02L4 T6, T9: 0 damage).
  CEREMONIAL_BEAST: { hp: 252, hpA8: 262, scriptTurns: 12, lossPerTurn: 6.2, note: "stunned when HP first drops to {POWER:CEREMONIAL_BEAST:PLOW_POWER}; Ringing turns allow one card: keep block potions for them", mechanic: "Ringing: every third turn from T6 you play one card (02L4: T6 and T9 dealt 0)" },
};

/** @deprecated name kept for callers; the profiles above. */
export const BOSS_NEEDS = BOSSES;

export function bossProfile(bossId: string): (BossProfile & { id: string }) | null {
  const upper = bossId.toUpperCase();
  const key = Object.keys(BOSSES).find((id) => upper.includes(id));
  return key ? { ...BOSSES[key]!, id: key } : null;
}

/** The logged share of a boss's shown attack that got through our block (tools/build-boss-damage.py). */
export interface UnblockedShare {
  unblocked_share: number;
  fights: number;
  turns: number;
  /** The Waterfall Giant only: its logged fights by ascension, with the turn it was killed on (null: not killed). */
  kills?: Record<string, GiantKillRow[]>;
  /** Every boss: its logged fights by ascension (fights, won, mean entry HP % of the won and the lost ones). */
  by_asc?: Record<string, BossAscRecord>;
  /** The Kaiser Crab only: the claw that died first in each logged fight, by ascension. */
  first_death?: Record<string, CrabFightRow[]>;
  /** The Lagavulin Matriarch only: its sleep in each logged fight, by ascension. */
  sleep?: Record<string, LagSleepRow[]>;
  /** The Queen only: when the Torch Head Amalgam died in each logged fight, by ascension. */
  amalgam?: Record<string, QueenFightRow[]>;
  /** The Insatiable only: each logged fight's death line (lost fights), by ascension. */
  deaths?: Record<string, SandpitFightRow[]>;
}

/**
 * One logged Queen fight (tools/build-boss-damage.py QUEEN.amalgam): the turn the Torch Head Amalgam was first seen
 * dead while the Queen lived (null: it lived to the end), and the HP the Queen and the Amalgam lost by the first
 * frame of turn 3 (turns 1-2: the only turns without "You are mine").
 */
export interface QueenFightRow {
  won: boolean;
  killed_turn: number | null;
  t12_queen?: number | null;
  t12_amalgam?: number | null;
  run?: string;
}

/**
 * One logged Insatiable fight (tools/build-boss-damage.py THE_INSATIABLE.deaths): a lost fight's death line from its
 * last frame: "hp" (the Sandpit still at 2 or more), "sandpit" (at 1, our HP and block over the attack it showed), or
 * "both" (at 1 and the attack enough to kill us too); null for a won fight.
 */
export interface SandpitFightRow {
  won: boolean;
  death: "hp" | "sandpit" | "both" | null;
  sandpit?: number | null;
  hp?: number | null;
  run?: string;
}

/** A boss's logged fights at one ascension (tools/build-boss-damage.py by_asc). */
export interface BossAscRecord {
  fights: number;
  won: number;
  /** Mean entry HP as a % of max HP, of the won / the lost fights (null: none). */
  entry_pct_won?: number | null;
  entry_pct_lost?: number | null;
}

/** One logged Kaiser Crab fight: the claw that died while the other still lived (null: neither did), and the outcome. */
export interface CrabFightRow {
  first: "ROCKET" | "CRUSHER" | null;
  won: boolean;
  turn?: number | null;
  run?: string;
}

/**
 * One logged Lagavulin Matriarch fight: the turn it woke (3 = slept through T1-T2), the share of its HP lost by
 * the first frame it was awake, and the deck's lasting-Strength cards (card-value damageRole "scaling").
 */
export interface LagSleepRow {
  won: boolean;
  woke_turn: number | null;
  woke_pct: number | null;
  strength: string[];
  run?: string;
}

/** One logged Waterfall Giant fight (tools/build-boss-damage.py): the kill turn, the outcome, HP and stacks at the kill. */
export interface GiantKillRow {
  turn: number | null;
  won: boolean;
  hp?: number | null;
  stacks?: number | null;
  run?: string;
}

let unblockedCache: Record<string, UnblockedShare> | null = null;

/** For tests: use these shares instead of boss-damage.json (null reloads the file). */
export function setUnblockedSharesForTests(shares: Record<string, UnblockedShare> | null): void {
  bumpDataVersion();
  unblockedCache = shares;
}

export function unblockedShare(bossKey: string): UnblockedShare | null {
  if (!unblockedCache) {
    try {
      unblockedCache = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "knowledge", "boss-damage.json"), "utf8")) as Record<string, UnblockedShare>;
    } catch {
      unblockedCache = {};
    }
  }
  return unblockedCache[bossKey] ?? null;
}

/**
 * HP we lose a turn against this boss at this ascension: its own attack a turn from the monster DB at
 * this ascension (bossDamageByTurn over its script's turns: its logged move order, the Strength its moves
 * gain, moves unseen at this ascension scaled from the nearest one and marked estimated) times the share
 * of a boss's shown attack that got through our block in every logged fight against it (all ascensions:
 * that share is our play, not the monster). The hand-set A8 constant only when the DB has neither.
 */
export function bossLossPerTurn(
  profile: BossProfile & { id: string },
  ascension: number,
  turnBlock: number | { byTurn: number[]; names: string[]; share?: number } = 0,
): { value: number; source: string; estimated: boolean } {
  const damage = bossDamageByTurn(profile.id, ascension, profile.scriptTurns);
  const share = unblockedShare(profile.id);
  // Block a relic gives every turn (Sai, turnBlockOf) on top of the logged fights' own: it takes up to that much off what
  // got through each turn, nothing on a turn the boss does not attack (8D8DZ9K680C2 F48 with Sai: T1-T5 cost 11 HP).
  // PASSIVE_PIECES: the passive block by fight turn (deckProfileForBoss turnBlock: Sai, Crimson Mantle, Plating, ...), the
  // `share` of it counted (passive-pieces CLOCK_PASSIVE_BLOCK_SHARE).
  const blockAt = (t: number): number =>
    typeof turnBlock === "number" ? turnBlock : (turnBlock.byTurn[t] ?? turnBlock.byTurn[turnBlock.byTurn.length - 1] ?? 0) * (turnBlock.share ?? 1);
  const turns = damage && damage.perTurn.length > 0 ? damage.perTurn.length : profile.scriptTurns;
  const meanBlock = typeof turnBlock === "number" ? turnBlock : Array.from({ length: Math.max(1, turns) }, (_, t) => blockAt(t)).reduce((sum, b) => sum + b, 0) / Math.max(1, turns);
  const less =
    typeof turnBlock === "number"
      ? turnBlock > 0 ? ` less ${turnBlock} block a turn from Sai` : ""
      : meanBlock > 0
        ? ` less ~${Math.round(meanBlock * 10) / 10} a turn of passive block${(turnBlock.share ?? 1) !== 1 ? ` (counted at ${Math.round((turnBlock.share ?? 1) * 100)}%: the logged share has the average fight's in it)` : ""} (${turnBlock.names.join(", ")}; not cut by Frail)`
        : "";
  if (!damage || !share || damage.perTurn.length === 0) {
    const value = typeof turnBlock === "number" ? Math.max(0, profile.lossPerTurn - turnBlock) : Math.max(0, Math.round((profile.lossPerTurn - meanBlock) * 10) / 10);
    return { value, source: `logged A8 HP loss a turn (no DB damage)${less}`, estimated: false };
  }
  const mean = damage.perTurn.reduce((sum, value) => sum + value, 0) / damage.perTurn.length;
  const value =
    meanBlock > 0
      ? Math.round((damage.perTurn.reduce((sum, hit, t) => sum + Math.max(0, hit * share.unblocked_share - blockAt(t)), 0) / damage.perTurn.length) * 10) / 10
      : Math.round(mean * share.unblocked_share * 10) / 10;
  return {
    value,
    source: `its attack ~${Math.round(mean)}/turn at A${ascension}${damage.estimated ? " (moves unseen at this ascension: the nearest logged one's, scaled by the measured ratio up to the highest logged ascension; estimated)" : ""} x ${Math.round(share.unblocked_share * 100)}% unblocked (${share.fights} logged fights)${less}`,
    estimated: damage.estimated,
  };
}

/**
 * HP at this ascension: the monster DB's parts at this ascension (the nearest logged one when none is),
 * plus what the mechanic adds; the Test Subject's phases summed. The hand-set hp / hpA8 only when the DB
 * has no parts for the boss.
 */
export function bossHp(profile: BossProfile & { id?: string }, ascension: number): number {
  if (profile.id === "TEST_SUBJECT") return testSubjectPhases(ascension).reduce((sum, hp) => sum + hp, 0);
  const db = profile.id ? bossHpAt(profile.id, ascension, profile.hpParts) : null;
  if (db) return db.hp + (profile.addedHp ?? 0);
  return ascension >= 8 ? profile.hpA8 : profile.hp;
}

/**
 * bossHp in its two parts: the boss's own HP at this ascension (the monster DB's parts) and what its mechanic adds
 * (addedHp: block, heals, followers). The notes show them apart (fix-queue-v4 #11: HFNEL0CRKF96 F17, 16 questions read
 * the Waterfall Giant as "270 (A8)", its A8 HP 250 and 20 the Siphon heals; the Kin "259 (A8)", the priest 199 + 60).
 * Without the DB (the hand-set numbers) or for the Test Subject's phases: all of it as the body.
 */
export function bossHpParts(profile: BossProfile & { id?: string }, ascension: number): { body: number; added: number } {
  const db = profile.id && profile.id !== "TEST_SUBJECT" ? bossHpAt(profile.id, ascension, profile.hpParts) : null;
  if (!db) return { body: bossHp(profile, ascension), added: 0 };
  return { body: db.hp, added: profile.addedHp ?? 0 };
}

/** Where bossHp's number comes from, for the notes DeepSeek reads: "(A9)", or the nearest logged ascension. */
export function bossHpSource(profile: BossProfile & { id?: string }, ascension: number): string {
  const db = profile.id ? bossHpAt(profile.id, ascension, profile.hpParts) : null;
  if (!db) return ascension >= 8 ? "(A8, hand-set)" : "(hand-set)";
  return db.exact ? `(A${db.asc})` : `(A${ascension} not logged: A${db.asc}'s)`;
}

/**
 * The profile's note with the DB numbers at this ascension (the Kin's priest and followers and its T11
 * Beam, the Test Subject's phases, the Giant's Siphon and Pressure Gun, and every {KIND:ID...} placeholder:
 * fillDbNumbers).
 */
export function bossNote(profile: BossProfile & { id?: string }, ascension: number): string {
  const part = (id: string) => (profile.id ? bossHpAt(profile.id, ascension, [id])?.hp : undefined);
  const follower = part("KIN_FOLLOWER");
  const giant = giantNumbers(ascension);
  const beam = kinBeamT11(ascension);
  return fillDbNumbers(
    profile.note
      .replace("{KIN_PRIEST}", String(part("KIN_PRIEST") ?? (ascension >= 8 ? 199 : 190)))
      .replace("{KIN_FOLLOWER}", String(follower !== undefined ? Math.round(follower / 2) : ascension >= 8 ? 62 : 59))
      .replace("{KIN_BEAM_T11}", beam === null ? "?" : String(beam))
      .replace("{PHASES}", testSubjectPhases(ascension).join("/"))
      .replace("{SIPHON}", `${giant.siphon} HP`)
      .replace("{GUN}", giant.gun.join("/"))
      .replace("{CRAB_KILLS}", () => crabKillRecord("en", ascension)),
    ascension,
  ).replace(/\{(?:QUEEN_AMALGAM|SANDPIT_DEATHS)_EN\}/g, (placeholder) => fillGuideFacts(placeholder, ascension));
}

/** The boss's mechanic line with its numbers at this ascension (the Giant's eruption, DB placeholders). */
export function bossMechanic(profile: BossProfile, ascension: number): string {
  return fillDbNumbers(
    profile.mechanic.replace("{ERUPTION}", eruptionFormula(ascension)).replace("{GIANT_KILLS}", giantKillRecord(ascension, "en")).replace("{GIANT_BLOCK}", giantBlockRecord("en", ascension)),
    ascension,
  );
}

/**
 * The block the Giant's kill left to find (its stacks less our HP at the kill) against the outcome, over the logged
 * A8 and A9 kills (boss-damage.json WATERFALL_GIANT.kills, tools/build-boss-damage.py). Was hard-coded ("33 kills:
 * 13 or less 17/18 won, 20 or more 3/15") and went stale with Y36HXZ80A8LL (a T9 kill at 36 HP into 41, won).
 * Read at A8 and up (recordBand), A8's kills and A9's apart (Dai 2026-10-04); without an ascension or below A8, the
 * two pooled as before.
 */
export function giantBlockRecord(lang: "zh" | "en", ascension?: number): string {
  const kills = unblockedShare("WATERFALL_GIANT")?.kills ?? {};
  const band = recordBand(ascension);
  return band ? giantBlockBandText(kills, lang, band) : giantBlockText([...(kills["8"] ?? []), ...(kills["9"] ?? [])], lang);
}

/** The fights killed with our HP and the stacks known, bucketed by the block that was needed (stacks - HP). */
function giantBlockBuckets(rows: GiantKillRow[]): { killed: number; low: WonOf; mid: WonOf; high: WonOf } {
  const killed = rows.filter((row) => row.turn !== null && row.hp != null && row.stacks != null);
  const bucket = (test: (need: number) => boolean): WonOf => {
    const list = killed.filter((row) => test(row.stacks! - row.hp!));
    return { won: list.filter((row) => row.won).length, n: list.length };
  };
  return { killed: killed.length, low: bucket((need) => need <= 13), mid: bucket((need) => need > 13 && need < 20), high: bucket((need) => need >= 20) };
}

/** Fights and the ones won. */
interface WonOf {
  n: number;
  won: number;
}

/** The block-needed record text of these fights (giantBlockRecord; exported for tests). */
export function giantBlockText(rows: GiantKillRow[], lang: "zh" | "en"): string {
  const { killed, low, mid, high } = giantBlockBuckets(rows);
  if (killed === 0) return lang === "zh" ? "A8/A9 没有记下击杀时 HP 的巨兽对局" : "no logged A8/A9 Giant kill with the HP at the kill";
  if (lang === "zh") {
    const parts = [`≤13 的 ${low.n} 场赢 ${low.won}`, ...(mid.n > 0 ? [`14–19 的 ${mid.n} 场赢 ${mid.won}`] : []), `≥20 的 ${high.n} 场赢 ${high.won}`];
    return `A8/A9 有击杀的 ${killed} 场：所需格挡（层数 − HP）${parts.join("，")}`;
  }
  const parts = [`13 or less ${low.won}/${low.n} won`, ...(mid.n > 0 ? [`14-19 ${mid.won}/${mid.n}`] : []), `20 or more ${high.won}/${high.n}`];
  return `A8/A9 kills (${killed}): block needed (stacks - HP) ${parts.join(", ")}`;
}

/**
 * The block-needed record by ascension, each of `band` apart (giantBlockRecord at A8 and up; exported for tests):
 * "有击杀的巨兽战按所需格挡（层数 − HP）分：A8 40 场中 ≤13 的 27 场赢 25，14–19 的 1 场赢 0，≥20 的 12 场赢 2；A9 13 场中 …".
 */
export function giantBlockBandText(kills: Record<string, GiantKillRow[]>, lang: "zh" | "en", band: readonly number[]): string {
  const zh = lang === "zh";
  const rows = band.map((asc) => {
    const { killed, low, mid, high } = giantBlockBuckets(kills[String(asc)] ?? []);
    if (killed === 0) return zh ? `A${asc} 没有记下击杀时 HP 的对局` : `A${asc} none logged`;
    if (zh) return `A${asc} ${killed} 场中 ${[`≤13 的 ${low.n} 场赢 ${low.won}`, ...(mid.n > 0 ? [`14–19 的 ${mid.n} 场赢 ${mid.won}`] : []), `≥20 的 ${high.n} 场赢 ${high.won}`].join("，")}`;
    return `A${asc} (${killed}) ${[`13 or less ${low.won}/${low.n} won`, ...(mid.n > 0 ? [`14-19 ${mid.won}/${mid.n}`] : []), `20 or more ${high.won}/${high.n}`].join(", ")}`;
  });
  return zh ? `有击杀的巨兽战按所需格挡（层数 − HP）分：${rows.join("；")}` : `Giant kills by block needed (stacks - HP): ${rows.join("; ")}`;
}

/**
 * The guides' facts that come from the data, filled when the DeepSeek system prompt is built (once a process, so
 * the prompt stays byte-identical across calls): {GIANT_BLOCK_RECORD} (giantBlockRecord), {GIANT_KILLS_A8} and
 * {GIANT_KILLS_A9} (giantKillRecord at A8 / A9: the kill-turn record, hard-coded as "A8 27 场…A9 10 场赢 3" until batch I).
 * 2026-09-29 knowledge check (Dai: the guides are knowledge like the experience base; where the data says
 * otherwise, the data's version): {CRAB_KILL_ORDER} (crabKillRecord; was "51 场…39 场赢 8"), {LAG_SLEEP}
 * (lagSleepRecord: the Matriarch's sleep without Strength cards), {BEAST_STUN} (the Beast's stun HP by ascension,
 * monster DB; was a flat 150, 160 at A9), {LASER_T4} (the Rocket's T4 Laser after Charge Up; was "49"),
 * {ACT1_ENTRY_HP} (act1EntryHp), {UNKNOWN_FIGHTS} (unknownFightsText: how often a ? room is a fight and what it
 * costs); {BOSS_RECORD:ID} (bossRecord: fights won by ascension; was "5 局死在它手上"); {CARD_OUTCOME:ID}
 * (cardOutcomeText: outcome-stats rows of a card whose grade the data moved); {@N:KIND:ID:…} a monster DB number
 * at ascension N (fillDbNumbers). The English ones for Jev's hints (hintText): {CRAB_KILLS_EN},
 * {LAG_NO_STRENGTH_EN}.
 * 2026-09-30 (the A8 window's runs 1-11): {QUEEN_AMALGAM} / {QUEEN_AMALGAM_EN} (queenAmalgamRecord: when the Amalgam
 * died, and where turns 1-2 went; was "4 场胜局都在 T4–T8…A8 5 场输局", stale since RBJ4's A8 win), {SANDPIT_DEATHS} /
 * {SANDPIT_DEATHS_EN} (sandpitDeathRecord: the Insatiable losses by death line), {UNKNOWN_FIGHTS:ASC:ACT} (one cell of
 * unknownFightsText), {BOSS_LOSS:ID:ASC} (bossLossText: the monster DB's median HP we lose a turn against the boss at
 * that ascension). The experience base's lesson texts are filled with these too (experience lessonText), so a
 * lesson and a guide no longer quote two different counts of the same fights.
 * 2026-10-04 (Dai: experience by ascension): the facts that counted fights over every logged ascension or pooled A8
 * with A9 (BAND_FACTS) are read by the run's ascension band: {@N:NAME} (factsAtAscension marks them so for a run at
 * A8 and up) gives A8's fights and A9's apart; {NAME} unmarked keeps the text written before, for a run below A8 and
 * for the callers that do not know the run's ascension.
 * 2026-10-04 (Dai: outcome statistics by ascension): {CARD_OUTCOME:ID} is A8's rows as before at A8, below it and
 * unmarked; {@N:CARD_OUTCOME:ID} (factsAtAscension marks it so from A9 up) gives that ascension's rows, an act with
 * fewer than 5 runs on a side followed by A8's where A8 has 5 or more (cardOutcomeText).
 */
const GUIDE_FACTS: Record<string, () => string> = {
  "{GIANT_BLOCK_RECORD}": () => giantBlockRecord("zh"),
  "{GIANT_KILLS_A8}": () => giantKillRecord(8, "zh"),
  "{GIANT_KILLS_A9}": () => giantKillRecord(9, "zh"),
  "{CRAB_KILL_ORDER}": () => crabKillRecord("zh"),
  "{CRAB_KILLS_EN}": () => crabKillShort(),
  "{LAG_SLEEP}": () => lagSleepRecord("zh"),
  "{LAG_NO_STRENGTH_EN}": () => lagSleepRecord("en"),
  "{BEAST_STUN}": () => powerAmountByAscText("CEREMONIAL_BEAST", "PLOW_POWER") ?? "?",
  "{LASER_T4}": () => laserT4Text(),
  "{ACT1_ENTRY_HP}": () => act1EntryHp(),
  "{UNKNOWN_FIGHTS}": () => unknownFightsText(),
  "{QUEEN_AMALGAM}": () => queenAmalgamRecord("zh"),
  "{QUEEN_AMALGAM_EN}": () => queenAmalgamRecord("en"),
  "{SANDPIT_DEATHS}": () => sandpitDeathRecord("zh"),
  "{SANDPIT_DEATHS_EN}": () => sandpitDeathRecord("en"),
};

/**
 * The guide facts that count fights over more than one ascension, by the ascension of the run that reads them
 * (recordBand: from A8 up each ascension apart; below A8, or no ascension, the text written before 2026-10-04: every
 * logged ascension for the crab, the Queen, the Insatiable and the Matriarch's wake-ups, A8 and A9 pooled for the
 * Giant's block).
 */
const BAND_FACTS: Record<string, (ascension?: number) => string> = {
  GIANT_BLOCK_RECORD: (ascension) => giantBlockRecord("zh", ascension),
  CRAB_KILL_ORDER: (ascension) => crabKillRecord("zh", ascension),
  CRAB_KILLS_EN: (ascension) => crabKillShort(undefined, recordBand(ascension)),
  LAG_SLEEP: (ascension) => lagSleepRecord("zh", ascension),
  QUEEN_AMALGAM: (ascension) => queenAmalgamRecord("zh", ascension),
  QUEEN_AMALGAM_EN: (ascension) => queenAmalgamRecord("en", ascension),
  SANDPIT_DEATHS: (ascension) => sandpitDeathRecord("zh", ascension),
  SANDPIT_DEATHS_EN: (ascension) => sandpitDeathRecord("en", ascension),
};

const BAND_TOKEN = new RegExp(`\\{(${Object.keys(BAND_FACTS).join("|")})\\}`, "g");
const BAND_MARKED = /\{@(\d+):([A-Z_]+)\}/g;

/** {CARD_OUTCOME:ID} as written, and as factsAtAscension marks it from A9 up. */
const CARD_OUTCOME = /\{CARD_OUTCOME:([A-Z_]+)\}/g;
const CARD_OUTCOME_MARKED = /\{@(\d+):CARD_OUTCOME:([A-Z_]+)\}/g;

/**
 * The text with its by-ascension facts (BAND_FACTS) marked with the run's ascension from A8 up ({CRAB_KILL_ORDER} ->
 * {@9:CRAB_KILL_ORDER}), and its card outcome rows from A9 up ({CARD_OUTCOME:TAUNT} -> {@9:CARD_OUTCOME:TAUNT}); as
 * written below A8 or without an ascension. fillGuideFacts fills a marked one by its ascension's band. Marked, a fact has its own key in the day's frozen table (render/facts.ts): a table filled earlier
 * with the all-ascension text, or by a run below A8, is not handed to a run at A8 and up.
 */
export function factsAtAscension(text: string, ascension: number | undefined): string {
  if (recordBand(ascension) === null || !text.includes("{")) return text;
  const marked = text.replace(BAND_TOKEN, (_, name: string) => `{@${ascension}:${name}}`);
  // The outcome rows by ascension from A9 up only: at A8 the A8 rows are the text (and the frozen key) as before. An
  // outcome-stats.json of the older shape (A8 alone: before the first refresh by the 2026-10-04 build script) has no
  // A9 rows, so the placeholder keeps its key and its A8 text; marked, the day's table would hold A8's text under the
  // A9 key until the next day.
  if ((ascension ?? 0) <= OUTCOME_BASE_ASC || !marked.includes("{CARD_OUTCOME:") || !hasAscensionTables(loadOutcomeStats())) return marked;
  return marked.replace(CARD_OUTCOME, (_, card: string) => `{@${ascension}:CARD_OUTCOME:${card}}`);
}

/**
 * The text with its data placeholders filled. `ascension`: the run's, when known (factsAtAscension: from A8 up, the
 * facts that count fights over several ascensions give each of A8 and A9 apart); without it those keep the text over
 * every logged ascension (or {@N:NAME} marks them one by one).
 */
export function fillGuideFacts(text: string, ascension?: number): string {
  let out = factsAtAscension(text, ascension);
  out = out.replace(BAND_MARKED, (marked, asc: string, name: string) => (Object.hasOwn(BAND_FACTS, name) ? BAND_FACTS[name]!(Number(asc)) : marked));
  for (const [placeholder, fill] of Object.entries(GUIDE_FACTS)) if (out.includes(placeholder)) out = out.split(placeholder).join(fill());
  out = out.replace(/\{UNKNOWN_FIGHTS:(\d+):(\d)\}/g, (_, asc: string, act: string) => unknownFightsText([Number(asc)], [Number(act)]));
  out = out.replace(/\{BOSS_LOSS:([A-Z_]+):(\d+)\}/g, (_, boss: string, asc: string) => bossLossText(boss, Number(asc)));
  out = out.replace(/\{BOSS_RECORD:([A-Z_]+)\}/g, (_, boss: string) => bossRecord(boss));
  out = out.replace(CARD_OUTCOME, (_, card: string) => cardOutcomeText(card));
  out = out.replace(CARD_OUTCOME_MARKED, (_, asc: string, card: string) => cardOutcomeText(card, undefined, Number(asc)));
  return out.replace(/\{@(\d+):([A-Z]+:[A-Z0-9_:]+)\}/g, (_, asc: string, inner: string) => fillDbNumbers(`{${inner}}`, Number(asc)));
}

/** The guide's "too few records" (cardOutcomeText). */
const FEW_RECORDS = "还没有足够的记录";

/**
 * A card's outcome rows (outcome-stats.json, tools/build-outcome-stats.py; observational): the act's boss pass rate
 * of the runs that took it in acts 1 and 2 against those offered it that did not ("A8 一幕拿了 51 局过 boss 65%、
 * 给了没拿 35 局 77%；…"). The guide's card grades quote it where the data moved a grade (Taunt, 2026-09-29).
 * `ascension`: the run's (outcome-tables outcomeView): at A8, below it or unset A8's rows as before; from A9 up that
 * ascension's, an act with fewer than 5 runs on a side followed by A8's for that act when A8 has 5 or more there ("A9
 * 一幕拿了 3 局过 boss 33%、给了没拿 12 局 50%（A9 不足5局，另附 A8：一幕拿了 51 局过 boss 65%、给了没拿 35 局 77%）").
 */
export function cardOutcomeText(cardId: string, stats: OutcomeStats = loadOutcomeStats(), ascension?: number): string {
  const view = outcomeView(ascension, stats);
  const actsOf = (table: OutcomeStats) => table.cards?.[cardId]?.by_act ?? {};
  const pct = (value: number | null | undefined) => (value == null ? "?" : `${Math.round(value * 100)}%`);
  type Pair = ReturnType<typeof actsOf>[string];
  // Both sides with runs: the contrast the guide quotes.
  const both = (pair: Pair | undefined) => Boolean(pair?.picked?.n && pair?.offered_not_picked?.n);
  const line = (act: string, pair: Pair | undefined) => `${act === "1" ? "一" : "二"}幕拿了 ${pair?.picked?.n} 局过 boss ${pct(pair?.picked?.boss_pass)}、给了没拿 ${pair?.offered_not_picked?.n} 局 ${pct(pair?.offered_not_picked?.boss_pass)}`;
  const acts = ["1", "2"].flatMap((act) => {
    const own = actsOf(view.table)[act];
    const ref = view.refs.length > 0 && pairThin(own) ? referenceRow(view.refs, (table) => actsOf(table)[act], (ref) => both(ref) && pairHelps(own)(ref)) : null;
    if (!both(own) && !ref) return [];
    const head = both(own) ? line(act, own) : `${act === "1" ? "一" : "二"}幕${FEW_RECORDS}`;
    return [`${head}${ref ? referenceNote(view, ref.table, line(act, ref.row)) : ""}`];
  });
  return acts.length > 0 ? `A${view.table.ascension ?? "?"} ${acts.join("；")}` : FEW_RECORDS;
}

/** The ascensions the guides quote records for (the ones played now). */
const RECORD_ASCENSIONS = [8, 9];

/** From this ascension up a run reads the fight records by ascension (recordBand). */
export const RECORD_BAND_FROM = 8;

/**
 * The ascensions whose records a run at `ascension` reads, each apart (Dai 2026-10-04, experience by ascension): A8
 * and A9 (and the run's own, were it above them) from A8 up, so an A9 run sees "A8 46 场赢 17；A9 16 场赢 6", not one
 * count over A0-A9. null below A8 or without an ascension: the records keep the text written before.
 */
export function recordBand(ascension: number | undefined): number[] | null {
  if (ascension === undefined || !Number.isFinite(ascension) || ascension < RECORD_BAND_FROM) return null;
  return [...new Set([...RECORD_ASCENSIONS, ascension])].sort((a, b) => a - b);
}

/** A boss's logged fights won by ascension (boss-damage.json by_asc): "A8 24 场赢 5、A9 5 场赢 0". */
export function bossRecord(bossKey: string, byAsc: Record<string, BossAscRecord> = unblockedShare(bossKey)?.by_asc ?? {}): string {
  return RECORD_ASCENSIONS.map((asc) => {
    const cell = byAsc[String(asc)];
    return cell && cell.fights > 0 ? `A${asc} ${cell.fights} 场赢 ${cell.won}` : `A${asc} 还没有记录`;
  }).join("、");
}

/**
 * The Kaiser Crab's logged fights by the claw that died first (boss-damage.json first_death): at A8 and up each of
 * A8 and A9 apart (recordBand); below A8 or without an ascension, all ascensions with A8/A9 after them.
 */
export function crabKillRecord(lang: "zh" | "en", ascension?: number): string {
  return crabKillText(unblockedShare("KAISER_CRAB")?.first_death ?? {}, lang, recordBand(ascension));
}

/** The fights where this claw died first (null: neither did), and the ones won. */
function crabFirst(rows: CrabFightRow[], first: CrabFightRow["first"]): WonOf {
  const list = rows.filter((row) => row.first === first);
  return { n: list.length, won: list.filter((row) => row.won).length };
}

/** The kill-order text of these fights (crabKillRecord; exported for tests). `band`: the ascensions apart (recordBand). */
export function crabKillText(byAsc: Record<string, CrabFightRow[]>, lang: "zh" | "en", band: readonly number[] | null = null): string {
  if (band) return crabKillBandText(byAsc, lang, band);
  const all = Object.values(byAsc).flat();
  if (all.length === 0) return lang === "zh" ? "没有螃蟹战记录" : "no logged crab fights";
  const rocket = crabFirst(all, "ROCKET");
  const crusher = crabFirst(all, "CRUSHER");
  const neither = crabFirst(all, null);
  if (lang === "en") {
    return `${all.length} logged crab fights: Rocket died first ${rocket.won}/${rocket.n} won, Crusher first ${crusher.won}/${crusher.n}, neither died first ${neither.won}/${neither.n}`;
  }
  const perAsc = RECORD_ASCENSIONS.map((asc) => {
    const rows = byAsc[String(asc)] ?? [];
    const first = crabFirst(rows, "ROCKET");
    const rest = { n: rows.length - first.n, won: rows.filter((row) => row.won).length - first.won };
    return rows.length > 0 ? `A${asc} 火箭先死 ${first.won}/${first.n}、其余 ${rest.won}/${rest.n}` : null;
  }).filter(Boolean);
  return `有记录的 ${all.length} 场螃蟹战：火箭先死 ${rocket.n} 场赢 ${rocket.won}，碾碎爪先死 ${crusher.n} 场赢 ${crusher.won}，没有哪只先死（同回合一起死或我方先死）${neither.n} 场赢 ${neither.won}${perAsc.length > 0 ? `（${perAsc.join("；")}）` : ""}`;
}

/**
 * The kill order by ascension, each of `band` apart: "有记录的螃蟹战 A8 46 场赢 17，火箭先死 13 场赢 9、碾碎爪先死 6 场赢 5、
 * 没有哪只先死 27 场赢 3；A9 …（没有哪只先死 = 同回合一起死或我方先死）".
 */
function crabKillBandText(byAsc: Record<string, CrabFightRow[]>, lang: "zh" | "en", band: readonly number[]): string {
  const zh = lang === "zh";
  const rows = band.map((asc) => {
    const list = byAsc[String(asc)] ?? [];
    if (list.length === 0) return zh ? `A${asc} 还没有记录` : `A${asc} none`;
    const won = list.filter((row) => row.won).length;
    const [rocket, crusher, neither] = [crabFirst(list, "ROCKET"), crabFirst(list, "CRUSHER"), crabFirst(list, null)];
    if (zh) return `A${asc} ${list.length} 场赢 ${won}，火箭先死 ${rocket.n} 场赢 ${rocket.won}、碾碎爪先死 ${crusher.n} 场赢 ${crusher.won}、没有哪只先死 ${neither.n} 场赢 ${neither.won}`;
    return `A${asc} ${list.length} (${won} won): Rocket died first ${rocket.won}/${rocket.n} won, Crusher first ${crusher.won}/${crusher.n}, neither died first ${neither.won}/${neither.n}`;
  });
  return zh ? `有记录的螃蟹战 ${rows.join("；")}（没有哪只先死 = 同回合一起死或我方先死）` : `logged crab fights ${rows.join("; ")}`;
}

/**
 * Jev's short form (the crab-rocket-first hint): "Rocket died first 9/12 won, otherwise 8/45" over every ascension;
 * with `band` (recordBand) each of its ascensions apart: "A8 Rocket died first 9/13 won, otherwise 8/33; A9 …".
 */
export function crabKillShort(byAsc: Record<string, CrabFightRow[]> = unblockedShare("KAISER_CRAB")?.first_death ?? {}, band: readonly number[] | null = null): string {
  const short = (rows: CrabFightRow[]) => {
    const rocket = rows.filter((row) => row.first === "ROCKET");
    const rest = rows.filter((row) => row.first !== "ROCKET");
    return `Rocket died first ${rocket.filter((row) => row.won).length}/${rocket.length} won, otherwise ${rest.filter((row) => row.won).length}/${rest.length}`;
  };
  if (!band) return short(Object.values(byAsc).flat());
  return band.map((asc) => ((byAsc[String(asc)] ?? []).length > 0 ? `A${asc} ${short(byAsc[String(asc)]!)}` : `A${asc} no logged fights`)).join("; ");
}

/**
 * The Matriarch's sleep in the logged fights (boss-damage.json sleep): the no-Strength decks by ascension, and waking
 * it on T1-T2 (over every ascension; at A8 and up, recordBand, by ascension too).
 */
export function lagSleepRecord(lang: "zh" | "en", ascension?: number): string {
  return lagSleepText(unblockedShare("LAGAVULIN_MATRIARCH")?.sleep ?? {}, lang, recordBand(ascension));
}

/** Share of its HP a T1-T2 hit must take to count as a burst, not chip damage (the guide's "25% of its HP"). */
export const LAG_BURST_PCT = 25;

/**
 * The sleep text of these fights (lagSleepRecord; exported for tests). `band` (recordBand; the zh text only): each of
 * its ascensions apart, the T1-T2 wake-ups included ("A8 有持续力量牌 21/22 赢、没有 10/16 赢，T1–T2 一次打掉 ≥25% 打醒的 1 场赢 1
 * （EZ2L 52%）、小伤害打醒的 9 场赢 6；A9 …"); without it the wake-ups are counted over every ascension.
 */
export function lagSleepText(byAsc: Record<string, LagSleepRow[]>, lang: "zh" | "en", band: readonly number[] | null = null): string {
  const won = (rows: LagSleepRow[]) => `${rows.filter((row) => row.won).length}/${rows.length}`;
  const at = (asc: number) => byAsc[String(asc)] ?? [];
  const noStrength = (rows: LagSleepRow[]) => rows.filter((row) => row.strength.length === 0);
  if (lang === "en") {
    return `decks without a lasting-Strength card won ${RECORD_ASCENSIONS.map((asc) => `A${asc} ${won(noStrength(at(asc)))}`).join(", ")}`;
  }
  const strength = (asc: number) => {
    const rows = at(asc);
    const without = noStrength(rows);
    const waited = without.filter((row) => !row.won && (row.woke_turn ?? 0) >= 3).map((row) => row.run ?? "?");
    const note = waited.length > 0 && waited.length <= 3 ? `（输的 ${waited.join("、")} 都等它自然醒，前两回合没有伤害进它）` : "";
    return `A${asc} 有持续力量牌 ${won(rows.filter((row) => row.strength.length > 0))} 赢、没有 ${won(without)} 赢${note}`;
  };
  const wake = (rows: LagSleepRow[], sep: string) => {
    const early = rows.filter((row) => row.woke_turn !== null && row.woke_turn <= 2 && row.woke_pct !== null);
    const burst = early.filter((row) => row.woke_pct! >= LAG_BURST_PCT);
    const chip = early.filter((row) => row.woke_pct! < LAG_BURST_PCT);
    const burstRuns = burst.length > 0 && burst.length <= 3 ? `（${burst.map((row) => `${row.run ?? "?"} ${row.woke_pct}%`).join("、")}）` : "";
    return `T1–T2 一次打掉 ≥${LAG_BURST_PCT}% 打醒的 ${burst.length} 场赢 ${burst.filter((row) => row.won).length}${burstRuns}${sep}小伤害打醒的 ${chip.length} 场赢 ${chip.filter((row) => row.won).length}`;
  };
  if (band) return band.map((asc) => (at(asc).length === 0 ? `A${asc} 还没有记录` : `${strength(asc)}，${wake(at(asc), "、")}`)).join("；");
  const parts = RECORD_ASCENSIONS.filter((asc) => at(asc).length > 0).map(strength);
  return `${parts.join("；")}；${wake(Object.values(byAsc).flat(), "，")}`;
}

/**
 * The Rocket's T4 Laser after Charge Up (+Strength), in front and from behind, at A8 and A9 (monster DB: base damage
 * plus Charge Up's Strength; A8 33/49, A9 38/57 when written). The handbook said "49" (A8's hit from behind).
 */
export function laserT4Text(): string {
  const monsters = monsterMoves();
  return RECORD_ASCENSIONS.map((asc) => {
    const laser = moveDamageAt(monsters, "ROCKET", "LASER_MOVE", asc);
    const gain = selfGainAt(monsters["ROCKET"]?.moves?.["CHARGE_UP_MOVE"], "STRENGTH_POWER", asc, { monsters, monsterId: "ROCKET" }) ?? 0;
    if (!laser) return `A${asc} ?`;
    const front = (laser.base ?? laser.perHit) + gain;
    return `A${asc} ${front}（背后 ${Math.floor(front * 1.5)}）`;
  }).join("、");
}

/** Act 1's bosses (boss-damage.json keys). */
const ACT1_BOSSES = ["VANTOM", "CEREMONIAL_BEAST", "THE_KIN", "LAGAVULIN_MATRIARCH", "SOUL_FYSH", "WATERFALL_GIANT"];

/**
 * Entry HP of the act-1 boss fights by ascension, won / lost (mean % of max, boss-damage.json by_asc), and Soul
 * Fysh's alone: "A8 90%/83%（144 场）…". Was hand-counted into ds-handbook (22109ed).
 */
export function act1EntryHp(): string {
  const cells = (bosses: string[], asc: number) => bosses.map((boss) => unblockedShare(boss)?.by_asc?.[String(asc)]).filter((cell): cell is BossAscRecord => !!cell);
  const pooled = (list: BossAscRecord[]) => {
    const mean = (key: "entry_pct_won" | "entry_pct_lost", weight: (cell: BossAscRecord) => number) => {
      const used = list.filter((cell) => cell[key] != null && weight(cell) > 0);
      const total = used.reduce((sum, cell) => sum + weight(cell), 0);
      return total > 0 ? Math.round(used.reduce((sum, cell) => sum + cell[key]! * weight(cell), 0) / total) : null;
    };
    const fights = list.reduce((sum, cell) => sum + cell.fights, 0);
    const winPct = mean("entry_pct_won", (cell) => cell.won);
    const lossPct = mean("entry_pct_lost", (cell) => cell.fights - cell.won);
    const fmt = (value: number | null) => (value === null ? "—" : `${value}%`);
    return fights > 0 ? `${fmt(winPct)}/${fmt(lossPct)}（${fights} 场）` : "还没有记录";
  };
  const all = RECORD_ASCENSIONS.map((asc) => `A${asc} ${pooled(cells(ACT1_BOSSES, asc))}`).join("，");
  const fysh = RECORD_ASCENSIONS.map((asc) => `A${asc} ${pooled(cells(["SOUL_FYSH"], asc))}`).join("，");
  return `${all}；灵魂异鱼 ${fysh}`;
}

/**
 * How often a ? room turned out to be a fight, and what those fights cost against a hallway's, A8/A9 acts 1-2
 * (room-costs.json UnknownFight: in-fight HP lost, first to last combat decision, a death counted as all the
 * entry HP). The guide said "低血时绕开精英走问号/商店" with no word of the fights (8KD7 F21: 91% into a ? of
 * four Exoskeletons, −39).
 */
export function unknownFightsText(ascensions: readonly number[] = RECORD_ASCENSIONS, acts: readonly number[] = [1, 2]): string {
  const parts: string[] = [];
  for (const asc of ascensions) {
    for (const act of acts) {
      const unknown = measuredRoomExact(asc, act, "Unknown");
      const fight = measuredRoomExact(asc, act, "UnknownFight");
      const hallway = measuredRoomExact(asc, act, "Monster");
      if (!unknown || !fight || fight.fight_median === undefined || fight.fight_p75 === undefined) continue;
      const vs = hallway?.fight_median !== undefined && hallway.fight_p75 !== undefined ? `（走廊 ${hallway.fight_median}/${hallway.fight_p75}）` : "";
      const actName = act === 1 ? "一" : "二";
      parts.push(`A${asc} ${actName}幕 ${unknown.n} 个问号开出 ${fight.n} 场（${Math.round((100 * fight.n) / unknown.n)}%），战内掉血中位/p75 ${fight.fight_median}/${fight.fight_p75}${vs}`);
    }
  }
  return parts.length > 0 ? parts.join("；") : "问号开战的数据还没有";
}

/**
 * The median HP we lose a turn against a boss at exactly this ascension, every logged fight (monster DB
 * bosses.*.hp_loss_per_turn): "13.0" for the crab at A9 when written; "?" when that ascension has no fight. Was
 * hand-copied into the lessons ("帝王蟹 13.0（A8 9.7）") and drifted as fights were added.
 */
export function bossLossText(bossKey: string, ascension: number): string {
  const loss = bossHpLoss(bossKey, ascension)?.perTurn;
  return loss && loss.asc === ascension ? loss.median.toFixed(1) : "?";
}

/**
 * The Queen's logged fights by when the Amalgam died (boss-damage.json QUEEN.amalgam): at A8 and up each of A8 and A9
 * apart (recordBand); below A8 or without an ascension, all ascensions and A8.
 */
export function queenAmalgamRecord(lang: "zh" | "en", ascension?: number): string {
  return queenAmalgamText(unblockedShare("QUEEN")?.amalgam ?? {}, lang, recordBand(ascension));
}

/** One set of Queen fights: the wins and losses by when the Amalgam died, and where turns 1-2's damage went. */
function queenSplit(rows: QueenFightRow[], lang: "zh" | "en") {
  const range = (list: QueenFightRow[]) => {
    const turns = list.map((row) => row.killed_turn).filter((turn): turn is number => turn !== null).sort((a, b) => a - b);
    const dash = lang === "zh" ? "–" : "-";
    return turns.length === 0 ? "" : turns[0] === turns.at(-1) ? `T${turns[0]}` : `T${turns[0]}${dash}T${turns.at(-1)}`;
  };
  const wins = rows.filter((row) => row.won);
  const losses = rows.filter((row) => !row.won);
  const split = rows.filter((row) => row.t12_queen != null && row.t12_amalgam != null && row.t12_queen + row.t12_amalgam > 0);
  return {
    range,
    wins,
    losses,
    winsKilled: wins.filter((row) => row.killed_turn !== null),
    lossNever: losses.filter((row) => row.killed_turn === null),
    lossKilled: losses.filter((row) => row.killed_turn !== null),
    intoQueen: split.filter((row) => row.t12_queen! > row.t12_amalgam!),
    intoAmalgam: split.filter((row) => row.t12_queen! <= row.t12_amalgam!),
  };
}

/**
 * The Amalgam record text of these fights (queenAmalgamRecord; exported for tests): the wins that killed it first and
 * on which turns, the losses that never did or did late, and where turns 1-2's damage went (more into the Queen or
 * into the Amalgam). Written 2026-09-30: 17 fights, the 5 wins killed it on T3-T8 (RBJ4 A8 T3); 7 of the 12 losses
 * never did; turns 1-2 mostly into the Queen 1/6 won (5LRZ, Q8XR A8: 58 and 87 into her on T1, both lost). `band`
 * (recordBand): each of its ascensions apart instead of all of them.
 */
export function queenAmalgamText(byAsc: Record<string, QueenFightRow[]>, lang: "zh" | "en", band: readonly number[] | null = null): string {
  if (band) return queenAmalgamBandText(byAsc, lang, band);
  const all = Object.values(byAsc).flat();
  if (all.length === 0) return lang === "zh" ? "还没有女王战记录" : "no logged Queen fights";
  const { range, wins, losses, winsKilled, lossNever, lossKilled, intoQueen, intoAmalgam } = queenSplit(all, lang);
  const won = (rows: QueenFightRow[]) => rows.filter((row) => row.won).length;
  if (lang === "en") {
    return `${all.length} logged Queen fights: ${winsKilled.length}/${wins.length} wins killed the Amalgam first${winsKilled.length > 0 ? ` (${range(winsKilled)})` : ""}; ${lossNever.length}/${losses.length} losses never did; turns 1-2 mostly into the Queen won ${won(intoQueen)}/${intoQueen.length}, into the Amalgam ${won(intoAmalgam)}/${intoAmalgam.length}`;
  }
  const a8 = byAsc["8"] ?? [];
  const a8Wins = a8.filter((row) => row.won && row.killed_turn !== null).map((row) => `${row.run ?? "?"} T${row.killed_turn}`);
  const a8Text = a8.length > 0 ? `（A8 ${a8.length} 场赢 ${won(a8)}${a8Wins.length > 0 ? `：${a8Wins.join("、")} 打死聚合体` : ""}）` : "";
  const winPart = wins.length === 0 ? "还没有赢过" : `赢的 ${wins.length} 场${winsKilled.length === wins.length ? "都" : `里 ${winsKilled.length} 场`}先打死聚合体${winsKilled.length > 0 ? `（${range(winsKilled)}）` : ""}`;
  const lossPart = `输的 ${losses.length} 场 ${lossNever.length} 场没打死${lossKilled.length > 0 ? `、${lossKilled.length} 场 ${range(lossKilled)} 才打死` : ""}`;
  return `有记录的 ${all.length} 场女王战：${winPart}；${lossPart}；T1–T2 伤害多进女王的 ${intoQueen.length} 场赢 ${won(intoQueen)}、多进聚合体的 ${intoAmalgam.length} 场赢 ${won(intoAmalgam)}${a8Text}`;
}

/**
 * The Amalgam record by ascension, each of `band` apart: "有记录的女王战 A8 22 场赢 3，赢的都先打死聚合体（5HHL T8、8D8D T6、RBJ4 T3），
 * 输的 19 场 8 场没打死、11 场 T2–T9 才打死，T1–T2 伤害多进女王的 7 场赢 0、多进聚合体的 15 场赢 3；A9 2 场赢 0，…".
 */
function queenAmalgamBandText(byAsc: Record<string, QueenFightRow[]>, lang: "zh" | "en", band: readonly number[]): string {
  const zh = lang === "zh";
  const won = (rows: QueenFightRow[]) => rows.filter((row) => row.won).length;
  const rows = band.map((asc) => {
    const list = byAsc[String(asc)] ?? [];
    if (list.length === 0) return zh ? `A${asc} 还没有记录` : `A${asc} none`;
    const { range, wins, losses, winsKilled, lossNever, lossKilled, intoQueen, intoAmalgam } = queenSplit(list, lang);
    if (!zh) {
      const winPart = wins.length === 0 ? "no win yet" : `${winsKilled.length}/${wins.length} wins killed the Amalgam first${winsKilled.length > 0 ? ` (${range(winsKilled)})` : ""}`;
      const lossPart = losses.length === 0 ? "no loss" : `${lossNever.length}/${losses.length} losses never killed it`;
      return `A${asc} ${list.length} (${wins.length} won): ${winPart}, ${lossPart}, turns 1-2 mostly into the Queen won ${won(intoQueen)}/${intoQueen.length}, into the Amalgam ${won(intoAmalgam)}/${intoAmalgam.length}`;
    }
    const killedRuns = winsKilled.length > 0 && winsKilled.length <= 3 ? winsKilled.map((row) => `${row.run ?? "?"} T${row.killed_turn}`).join("、") : range(winsKilled);
    const winPart = wins.length === 0 ? "还没有赢过" : `赢的${winsKilled.length === wins.length ? "都" : `里 ${winsKilled.length} 场`}先打死聚合体${winsKilled.length > 0 ? `（${killedRuns}）` : ""}`;
    const lossPart = losses.length === 0 ? "没有输局" : `输的 ${losses.length} 场 ${lossNever.length} 场没打死${lossKilled.length > 0 ? `、${lossKilled.length} 场 ${range(lossKilled)} 才打死` : ""}`;
    return `A${asc} ${list.length} 场赢 ${wins.length}，${winPart}，${lossPart}，T1–T2 伤害多进女王的 ${intoQueen.length} 场赢 ${won(intoQueen)}、多进聚合体的 ${intoAmalgam.length} 场赢 ${won(intoAmalgam)}`;
  });
  return zh ? `有记录的女王战 ${rows.join("；")}` : `logged Queen fights ${rows.join("; ")}`;
}

/**
 * The Insatiable's logged losses by death line (boss-damage.json THE_INSATIABLE.deaths): at A8 and up each of A8 and
 * A9 apart (recordBand); below A8 or without an ascension, all ascensions with A8/A9 after them.
 */
export function sandpitDeathRecord(lang: "zh" | "en", ascension?: number): string {
  return sandpitDeathText(unblockedShare("THE_INSATIABLE")?.deaths ?? {}, lang, recordBand(ascension));
}

/**
 * The death-line text of these fights (sandpitDeathRecord; exported for tests). Written 2026-09-30: of the 17 A8
 * losses 10 died on HP with the Sandpit at 2 or more, 4 to the Sandpit, 3 both at once (NH8A: an Escape over a
 * 41-damage line on T3 with HP the earlier line; died with the Sandpit at 2). `band` (recordBand): each of its
 * ascensions apart ("有记录的沙虫输局 A8 23 场：死在 HP 上（沙坑还剩 ≥2）14、被沙坑吞掉 5、两条线同一回合 4；A9 5 场：…").
 */
export function sandpitDeathText(byAsc: Record<string, SandpitFightRow[]>, lang: "zh" | "en", band: readonly number[] | null = null): string {
  const count = (rows: SandpitFightRow[], death: SandpitFightRow["death"]) => rows.filter((row) => !row.won && row.death === death).length;
  const lost = (rows: SandpitFightRow[]) => rows.filter((row) => !row.won);
  if (band) {
    const zh = lang === "zh";
    // The death line's meaning once, at the first ascension with a loss.
    const first = band.find((asc) => lost(byAsc[String(asc)] ?? []).length > 0);
    const rows = band.map((asc) => {
      const list = byAsc[String(asc)] ?? [];
      const n = lost(list).length;
      if (n === 0) return zh ? `A${asc} ${list.length > 0 ? "没有输局" : "还没有记录"}` : `A${asc} none`;
      if (zh) return `A${asc} ${n} 场：死在 HP 上${asc === first ? "（沙坑还剩 ≥2）" : " "}${count(list, "hp")}、被沙坑吞掉 ${count(list, "sandpit")}、两条线同一回合 ${count(list, "both")}`;
      return asc === first
        ? `A${asc} ${n}: ${count(list, "hp")} died on HP with the Sandpit at 2+, ${count(list, "sandpit")} to the Sandpit, ${count(list, "both")} both at once`
        : `A${asc} ${n}: ${count(list, "hp")} on HP, ${count(list, "sandpit")} to the Sandpit, ${count(list, "both")} both at once`;
    });
    return zh ? `有记录的沙虫输局 ${rows.join("；")}` : `logged losses ${rows.join("; ")}`;
  }
  const all = Object.values(byAsc).flat();
  if (lost(all).length === 0) return lang === "zh" ? "还没有沙虫输局的记录" : "no logged Insatiable losses";
  if (lang === "en") {
    return `${lost(all).length} logged losses: ${count(all, "hp")} died on HP with the Sandpit at 2+, ${count(all, "sandpit")} to the Sandpit, ${count(all, "both")} both at once`;
  }
  const perAsc = RECORD_ASCENSIONS.map((asc) => {
    const rows = byAsc[String(asc)] ?? [];
    return lost(rows).length > 0 ? `A${asc} ${lost(rows).length} 场 ${count(rows, "hp")}/${count(rows, "sandpit")}/${count(rows, "both")}` : null;
  }).filter(Boolean);
  return `有记录的沙虫输局 ${lost(all).length} 场：死在 HP 上（沙坑还剩 ≥2）${count(all, "hp")}、被沙坑吞掉 ${count(all, "sandpit")}、两条线同一回合 ${count(all, "both")}${perAsc.length > 0 ? `（${perAsc.join("，")}）` : ""}`;
}

/**
 * The logged Waterfall Giant fights by kill turn at this ascension, from the fight data (boss-damage.json
 * WATERFALL_GIANT.kills, tools/build-boss-damage.py; experience giant-explode): A8's record below A9 (the
 * eruption is the same from A0 to A8), A9's from A9 (5 stacks more on the same turn). The text was hard-coded
 * ("A9 killed by T10 1/3") and went stale when Y36HXZ80A8LL won with a T9 kill (2/4).
 */
export function giantKillRecord(ascension: number, lang: "zh" | "en"): string {
  const level = ascension >= 9 ? 9 : 8;
  return giantKillText(unblockedShare("WATERFALL_GIANT")?.kills?.[String(level)] ?? [], level, lang);
}

/** The kill-turn record text of these fights at ascension `level` (giantKillRecord; exported for tests). */
export function giantKillText(rows: GiantKillRow[], level: number, lang: "zh" | "en"): string {
  const zh = lang === "zh";
  if (rows.length === 0) return zh ? `A${level} 没有巨兽的对局数据` : `A${level}: no logged Giant fights`;
  const bucket = (test: (row: GiantKillRow) => boolean) => {
    const list = rows.filter(test);
    return { won: list.filter((row) => row.won).length, n: list.length };
  };
  const early = bucket((row) => row.turn !== null && row.turn <= 10);
  const mid = bucket((row) => row.turn !== null && row.turn >= 11 && row.turn <= 15);
  const late = bucket((row) => row.turn !== null && row.turn >= 16);
  const none = bucket((row) => row.turn === null);
  const wins = rows.filter((row) => row.won);
  const winTurns = wins.map((row) => row.turn).filter((turn): turn is number => turn !== null).sort((a, b) => a - b);
  const earlyLosses = rows.filter((row) => !row.won && row.turn !== null && row.turn <= 10 && row.hp != null && row.stacks != null).sort((a, b) => (a.turn ?? 0) - (b.turn ?? 0));
  const part = (label: string, b: { won: number; n: number }) => (b.n > 0 ? `${label} ${b.won}/${b.n}` : null);
  if (zh) {
    const buckets = [part("T10 前击杀赢", early), part("T11–T15", mid), part("T16 后", late), part("没打死", none)].filter(Boolean).join("、");
    const winList = wins.length > 0 && wins.length <= 4 && winTurns.length > 0 ? `（${winTurns.map((turn) => `T${turn}`).join("、")} 击杀）` : "";
    const lossList =
      earlyLosses.length > 0 && earlyLosses.length <= 3
        ? `；T10 前击杀输的 ${earlyLosses.map((row) => `${row.run ?? "?"}（T${row.turn}）`).join("、")}击杀时只剩 ${earlyLosses.map((row) => row.hp).join("、")} 血对 ${earlyLosses.map((row) => row.stacks).join("、")} 层，死于自爆`
        : "";
    return `A${level} ${rows.length} 场赢 ${wins.length} 场${winList}：${buckets}${lossList}`;
  }
  const partEn = (label: string, b: { won: number; n: number }) => (b.n > 0 ? `${label} ${b.won}/${b.n} won` : null);
  const buckets = [partEn("killed by T10", early), partEn("T11-T15", mid), partEn("T16 or later", late), partEn("not killed", none)].filter(Boolean).join(", ");
  const winList = wins.length > 0 && wins.length <= 4 && winTurns.length > 0 ? ` (kills on ${winTurns.map((turn) => `T${turn}`).join(", ")})` : "";
  const lossList =
    earlyLosses.length > 0 && earlyLosses.length <= 3
      ? `; lost after a kill by T10: ${earlyLosses.map((row) => `${row.run ?? "?"} (T${row.turn}) ${row.hp} HP against ${row.stacks} stacks`).join(", ")}, died to the blast`
      : "";
  return `A${level} (${rows.length} fights): ${wins.length} won${winList}; ${buckets}${lossList}`;
}

/**
 * The Kin Priest's T11 Beam at this ascension: its hits x (base + the Strength of the two Rituals before
 * it, T4 and T8), from the monster DB (A8: 3 x (3 + 2 x 2) = 21; A9's Ritual +3: 27). null without DB data.
 */
export function kinBeamT11(ascension: number): number | null {
  const monsters = monsterMoves();
  const beam = moveDamageAt(monsters, "KIN_PRIEST", "BEAM_MOVE", ascension);
  const ritual = selfGainAt(monsters["KIN_PRIEST"]?.moves?.["RITUAL_MOVE"], "STRENGTH_POWER", ascension, { monsters, monsterId: "KIN_PRIEST" });
  if (!beam || ritual === null) return null;
  return beam.hits * ((beam.base ?? beam.perHit) + 2 * ritual);
}

/**
 * HP a Siphon heals (the monster DB has its turns, not its amount). Logged states.jsonl, the Giant's HP
 * across a Siphon turn: +10 at A0-A7 (28), +15 at A8 (41) and at A9 (8V0H, HEAC, 9Q7V, YQL8); less only
 * near full HP.
 */
export const SIPHON_HEAL = { base: 10, a8: 15 };
/** HP the Knowledge Demon's Ponder heals (T4 and T8), when the monster DB has no heal_by_asc for it. */
export const PONDER_HEAL = 30;

/** Pressure Gun's first shot and its gain a use when the DB has none (A8: 20, 25, 30). */
const GUN_FALLBACK = { first: 20, step: 5 };

/**
 * The Waterfall Giant's numbers at this ascension, for the texts the models read: its HP (monster DB),
 * Siphon's heal, and the three Pressure Gun shots (T5/T10/T15: the DB's base damages at this ascension,
 * A8 20/25/30, A9 23/28/33; the lowest is the first, the gap between logged ones the gain a use).
 */
export function giantNumbers(ascension: number): { hp: number; siphon: number; gun: number[] } {
  const bases = moveBaseDamages("WATERFALL_GIANT", "PRESSURE_GUN_MOVE", ascension);
  const gaps = bases.slice(1).map((value, i) => value - bases[i]!).filter((gap) => gap > 0);
  const first = bases[0] ?? GUN_FALLBACK.first;
  const step = gaps.length > 0 ? Math.min(...gaps) : GUN_FALLBACK.step;
  return {
    hp: bossHpAt("WATERFALL_GIANT", ascension)?.hp ?? (ascension >= 8 ? 250 : 240),
    siphon: ascension >= 8 ? SIPHON_HEAL.a8 : SIPHON_HEAL.base,
    gun: [first, first + step, first + 2 * step],
  };
}

/**
 * Sai: 「在你的回合开始时，获得{Block}点格挡」 — 7 at the start of every turn (logged over 14 runs holding it: turns 2-8
 * began with 7 at the median and never less; 8D8DZ9K680C2 F48, the Queen: T2-T11 each began with exactly 7). Block on
 * every one of our turns for the rollout (rollout-live relicBlockOf), the whole-fight boss sim and the boss clock (its
 * HP loss a turn: turnBlockOf). The number lives in passive-pieces.ts.
 */
export { SAI_BLOCK };

/** Block the relics give at the start of every turn of a fight (Sai). */
export function turnBlockOf(relicIds: string[]): number {
  return relicIds.filter((id) => id === "SAI").length * SAI_BLOCK;
}

/**
 * Relics that give 1 energy on (almost) every turn. Seal of Gold is counted apart: it pays gold for it
 * (SEAL_OF_GOLD_COST).
 */
export const ENERGY_RELICS = new Set([
  "BLESSED_ANTLER", "BLOOD_SOAKED_ROSE", "BREAD", "ECTOPLASM", "PAELS_FLESH", "PHILOSOPHERS_STONE", "PRISMATIC_GEM",
  "PUMPKIN_CANDLE", "SOZU", "SPIKED_GAUNTLETS", "VELVET_CHOKER", "WHISPERING_EARRING",
]);
/**
 * Seal of Gold: 1 energy at the start of each turn for this much gold (A8, logged: 4 energy on max_energy
 * 3; RBJ402TKQZ6F F33 gold 296 → 290 → 287 → 284 …). With less gold than a typical fight's turns cost, only
 * that share of the turns get it.
 */
const SEAL_OF_GOLD_COST = 3;
const TYPICAL_FIGHT_TURNS = 8;
/**
 * Strength relics that hold from turn `from` on, measured on the logged combat states' player Strength
 * (states.jsonl, T1-T6 with each relic): Vajra +1 from T1; Girya +1 per lift (its stack: RBJ402TKQZ6F
 * boss openings 1/2/4 with 1/2/3 lifts, the last with Vajra); Ember Tea +2 while it has fights left
 * (stack > 0); Sparkling Rouge +1 from T3. Rainbow Ring and Red Skull are conditional (all three card
 * types a turn / HP at or below the threshold) and Shuriken / Sword of Jade are not logged: not counted.
 */
export function relicFlatStrength(relics: { id: string; stack: number }[]): { amount: number; from: number; name: string }[] {
  const out: { amount: number; from: number; name: string }[] = [];
  for (const { id, stack } of relics) {
    if (id === "VAJRA") out.push({ amount: 1, from: 1, name: "Vajra +1" });
    else if (id === "GIRYA" && stack > 0) out.push({ amount: stack, from: 1, name: `Girya +${stack} (${stack} lifts)` });
    else if (id === "EMBER_TEA" && stack > 0) out.push({ amount: 2, from: 1, name: "Ember Tea +2" });
    else if (id === "SPARKLING_ROUGE") out.push({ amount: 1, from: 3, name: "Sparkling Rouge +1 from T3" });
  }
  return out;
}
/**
 * Share of an energy power's extra plays (Pyre, Demesne) the clock counts. On the 13 logged A8 boss fights
 * with Pyre (tools/boss-fights-extract.py over every boss, 2026-09-29) the full count read them 15% high
 * (median log error -0.15, median |log error| 0.22); without it they were unbiased (0.00, 0.18): Pyre
 * costs 2 on its turn and the hand, not the energy, caps later turns. A quarter gave the lowest median
 * |log error| (0.15).
 */
const LATE_ENERGY_SHARE = 0.25;
/** Cards drawn a turn (no draw cards counted: this is a floor, not a ceiling). */
const HAND = 5;
/**
 * The raw count misses draw, relics, potions and powers played mid-fight, and a weak deck's fights are
 * helped by them as much as a strong one's. Fitted (least absolute deviation) on the 215 logged A8 boss
 * fights with a known outcome (tools/boss-fights-extract.py over every boss, a run won on the final
 * boss's floor counted as a win: RBJ402TKQZ6F's Queen; tools/boss-clock-calibrate.ts, 2026-09-29):
 * realised / mechanic = 11 + 0.92 x raw; median realised/estimate 1.00, median |log error| 0.25, at boss
 * entry deaths flagged short 83/91 (the 9 + 1.04 fitted on 160 fights with that win as a death: 0.99, 0.26,
 * 82/91). A flat x1.4 (the old scale) read weak decks too low and strong decks too high (median
 * realised/raw 2.05 for the weakest fifth, 1.46 for the strongest).
 */
export const ESTIMATE_BASE = 11;
export const ESTIMATE_SLOPE = 0.92;
export function calibrated(raw: number): number {
  return raw > 0 ? ESTIMATE_BASE + ESTIMATE_SLOPE * raw : 0;
}
/** Damage multiplier with two or more Vulnerable sources in the deck. */
const VULNERABLE_UPTIME = 1.2;
/** Vantom's Slippery stacks. */
const SLIPPERY_STACKS = 9;

/** What the deck plays in an average boss turn, before boss mechanics. */
export interface DeckProfile {
  size: number;
  energy: number;
  /** Share of the drawn cards the energy pays for. */
  playedShare: number;
  /** Cards played a turn. */
  plays: number;
  /** Attack damage a turn with no Strength, before Vulnerable (AoE counted per enemy by the caller). */
  damage: number;
  /** AoE part of `damage`. */
  aoeDamage: number;
  /** Attack hits a turn (Strength adds to each). */
  hits: number;
  /** Average damage of one hit. */
  avgHit: number;
  vulnerableSources: number;
  /** Permanent Strength from one-off cards (Inflame), played around `setupTurn`. */
  flatStrength: number;
  /** Strength from relics that holds from a given turn (Vajra, Girya lifts: relicFlatStrength). */
  relicFlat: { amount: number; from: number }[];
  /**
   * Energy a turn from powers played around `setupTurn` (Pyre, Demesne), and what it does to the
   * card-damage part: `damage`, `aoeDamage` and `hits` times `lateEnergyScale` once it is in play.
   */
  lateEnergy: number;
  lateEnergyScale: number;
  /** Strength gained each turn from the power's play turn (Demon Form 3, Demon Form+ 4). */
  demonFormRate: number;
  /** Strength a turn from relics from T1 (Toasty Mittens). */
  relicStrengthRate: number;
  /** Strength a turn from Rupture fed by self-damage cards and the powers that lose HP each turn (Inferno). */
  ruptureRate: number;
  /**
   * Damage a turn from powers once they are in play (from the turn after `setupTurn`), with no Strength and
   * no Vulnerable: Inferno's hit to every enemy per HP loss on our turn, Juggernaut's per block gained.
   */
  passiveDamage?: number;
  /** AoE part of `passiveDamage` (Inferno). */
  passiveAoe?: number;
  /** The passive damage sources named for the note. */
  passive?: string[];
  /**
   * PASSIVE_PIECES (passive-pieces.ts; absent with it off): the profile was built with the passive pieces, so deckEstimate
   * keeps all passive damage out of the boss's mechanic cut (the Queen's Weak cuts the cards, not Inferno or Thorns).
   */
  passivePieces?: true;
  /**
   * PASSIVE_PIECES: passive damage a turn from turn 1, no Strength, no Vulnerable, no Weak: Mercury Hourglass, Letter
   * Opener, Parrying Shield, and retaliation (Thorns, Flame Barrier) times the boss's expected attack hits a turn.
   */
  passiveStart?: number;
  /** AoE part of `passiveStart` (Hourglass, Letter Opener). */
  passiveStartAoe?: number;
  /** PASSIVE_PIECES: passive block on each fight turn (index 0 = turn 1; Sai, Crimson Mantle, Plating, ...), not Frail-cut. */
  turnBlock?: number[];
  /** The passive block sources named for the note. */
  passiveBlock?: string[];
  /** Turn a power drawn at random is played on average. */
  setupTurn: number;
  /** Strength-growth sources named for the note. */
  growth: string[];
}

function dynValue(entry: unknown, name: string): number | null {
  for (const value of asArray(asRecord(entry)["dynamic_values"])) {
    const record = asRecord(value);
    if (str(record["name"]) === name) return numOrNull(record["current_value"]) ?? numOrNull(record["base_value"]);
  }
  return null;
}

/** The deck's playing profile (cards from run.deck, energy from max_energy and energy relics). */
export function deckProfileForBoss(state: GameState, knowledge: Knowledge): DeckProfile | null {
  const run = asRecord(state.run?.raw);
  const entries = asArray(run["deck"]);
  // The model takes the type from the game data; the deck entry's own card_type covers unknown ids.
  const cards = entries.map((entry, index) => {
    const model = modelHandCard(entry, index, knowledge);
    return { entry, model: model.type ? model : { ...model, type: str(asRecord(entry)["card_type"]) } };
  });
  if (cards.length === 0) return null;
  // max_energy leaves out the relics that add energy every turn (7DFB: 3 shown with Pael's Flesh and
  // Blessed Antler).
  const relics = asArray(run["relics"]).map((relic) => ({ id: str(asRecord(relic)["relic_id"]), stack: num(asRecord(relic)["stack"]) }));
  const relicIds = relics.map((relic) => relic.id);
  const sealTurns = Math.floor(num(run["gold"]) / SEAL_OF_GOLD_COST);
  const seal = relicIds.includes("SEAL_OF_GOLD") ? Math.min(1, sealTurns / TYPICAL_FIGHT_TURNS) : 0;
  const energy = Math.max(3, num(run["max_energy"]) || 3) + relicIds.filter((id) => ENERGY_RELICS.has(id)).length + seal;
  const n = cards.length;
  let damage = 0;
  let aoe = 0;
  let cost = 0;
  let hits = 0;
  let flatStrength = 0;
  let demonForm = 0;
  // Rupture: Strength per HP loss on our turn, summed over its copies (Rupture 1, Rupture+ 2; the power
  // stacks: S1MU F33 RUPTURE_POWER 2 from one Rupture+).
  let ruptureStrength = 0;
  let selfDamage = 0;
  // Powers that lose HP at the start of each of our turns: one HP loss a turn each, however many copies
  // (S1MU F48: two Infernos + Crimson Mantle, INFERNO_POWER 18, Strength +4 a turn with Rupture+).
  const turnStartLoss = new Set<string>();
  // Inferno: damage to every enemy per HP loss on our turn (6, Inferno+ 9; copies stack: S1MU F48 18).
  let inferno = 0;
  // Juggernaut: damage to a random enemy per block gained (6, Juggernaut+ 8).
  let juggernaut = 0;
  // PASSIVE_PIECES: Flame Barrier's damage back per hit (summed over the copies, as they are drawn), Crimson Mantle's block
  // a turn (its amount: 7, Mantle+ 10), Stone Armor's Plating (4, Stone Armor+ 6).
  let flameBack = 0;
  let mantleBlock = 0;
  let stoneArmor = 0;
  let blockCards = 0;
  let vulnerable = 0;
  let lateEnergy = 0;
  const growth: string[] = [];
  for (const { entry, model: card } of cards) {
    // Deck entries carry no "playable" flag (that is a hand-card field): Curses, Statuses and
    // unplayable cards (cost -1) are the ones that never play.
    const playable = card.type !== "Curse" && card.type !== "Status" && (card.xCost || card.cost >= 0);
    if (!playable) continue;
    // Spiked Gauntlets: powers cost 1 more (G1Z0: Demon Form at 4, never played).
    cost += card.xCost ? energy : Math.max(0, card.cost) + (card.type === "Power" && relicIds.includes("SPIKED_GAUNTLETS") ? 1 : 0);
    if (card.type === "Attack") {
      // Whirlwind (X hits) reads 0 hits in the model: it hits once per energy.
      const cardHits = card.special === "whirlwind" ? energy : Math.max(1, card.hits);
      const cardDamage = (card.damage ?? 0) * cardHits;
      damage += cardDamage;
      if (card.target === "all") aoe += cardDamage;
      if ((card.damage ?? 0) > 0) hits += cardHits;
    }
    if (card.cardId === "DEMON_FORM") {
      // The deck entry carries the (upgraded) value; 3 is the base card's.
      const rate = dynValue(entry, "StrengthPower") ?? 3;
      demonForm += rate;
      growth.push(`Demon Form +${rate}/turn`);
    } else if (card.cardId === "RUPTURE") {
      // The deck entry carries the (upgraded) value, like Demon Form's; 1 is the base card's.
      ruptureStrength += dynValue(entry, "StrengthPower") ?? 1;
    } else {
      flatStrength += Math.max(0, card.strength);
    }
    // A power's energy at the start of each turn (Pyre, Pyre+ 2: RBJ402TKQZ6F F48 4 → 6 energy from T4).
    if (card.type === "Power") {
      const income = dynValue(entry, "Energy") ?? 0;
      const template = str(asRecord(entry)["rules_text"]) || knowledge.card(card.cardId)?.descriptionRaw || "";
      if (income > 0 && turnStartOnly(template, "Energy")) lateEnergy += income;
    }
    // A power's HP loss is not a play cost (card-model gives powers 0): Inferno and Crimson Mantle lose 1 at
    // the start of every turn once played, so they feed Rupture and Inferno each turn, not once a play.
    if (card.cardId === "INFERNO") {
      turnStartLoss.add("Inferno");
      inferno += dynValue(entry, "InfernoPower") ?? 6;
    } else if (card.cardId === "CRIMSON_MANTLE") {
      turnStartLoss.add("Crimson Mantle");
    } else if (card.hpLoss > 0) selfDamage += 1;
    if (card.cardId === "JUGGERNAUT") juggernaut += dynValue(entry, "JuggernautPower") ?? 6;
    if (card.cardId === "FLAME_BARRIER") flameBack += dynValue(entry, "DamageBack") ?? 4;
    if (card.cardId === "CRIMSON_MANTLE") mantleBlock += dynValue(entry, "CrimsonMantlePower") ?? 7;
    if (card.cardId === "STONE_ARMOR") stoneArmor += dynValue(entry, "PlatingPower") ?? 4;
    if (card.block > 0) blockCards += 1;
    if (card.vulnerable > 0) vulnerable += 1;
  }
  // Energy caps how many of the drawn cards get played.
  const playedShare = Math.min(1, energy / Math.max(1, (HAND * cost) / n));
  const perCard = (HAND / n) * playedShare;
  const lateEnergyScale = playedShare > 0 ? Math.min(1, (energy + lateEnergy) / Math.max(1, (HAND * cost) / n)) / playedShare : 1;
  if (lateEnergy > 0) growth.push(`+${lateEnergy} energy/turn from powers`);
  const relicFlat = relicFlatStrength(relics);
  for (const source of relicFlat) growth.push(source.name);
  // Brimstone: Strength at the start of each of our turns (enemies +1). EZ2L F48: ignored, the clock
  // read a 99/turn gap while the deck dealt ~45/turn.
  const relicStrengthRate = (relicIds.includes("TOASTY_MITTENS") ? 1 : 0) + (relicIds.includes("BRIMSTONE") ? BRIMSTONE_STRENGTH : 0);
  if (relicIds.includes("TOASTY_MITTENS")) growth.push("Toasty Mittens +1/turn");
  if (relicIds.includes("BRIMSTONE")) growth.push(`Brimstone +${BRIMSTONE_STRENGTH}/turn`);
  // HP losses on our turn a turn once the powers are in play: the self-damage cards played (their share of
  // the drawn cards) and one per turn-start power (S1MU F33: Rupture+ and Inferno+, Strength 6 -> 8 -> 10 ->
  // 12 at T4-T6, +2 a turn from Inferno alone; the clock had read ~+0.2).
  const selfPlays = selfDamage * perCard;
  const lossEvents = selfPlays + turnStartLoss.size;
  const feeders = [...(turnStartLoss.size > 0 ? [`${[...turnStartLoss].join(" + ")} each turn`] : []), ...(selfDamage > 0 ? [`${selfDamage} self-damage cards`] : [])].join(" + ");
  const ruptureRate = ruptureStrength * lossEvents;
  if (ruptureRate > 0) growth.push(`Rupture +${ruptureStrength} per HP loss, fed by ${feeders} (~+${ruptureRate.toFixed(1)}/turn)`);
  const passive: string[] = [];
  const infernoDamage = inferno * lossEvents;
  if (infernoDamage > 0) passive.push(`Inferno ${inferno} to all per HP loss, fed by ${feeders} (~${infernoDamage.toFixed(0)}/turn)`);
  // Block gained a turn: the block cards played, and Crimson Mantle's block at the start of each turn.
  const blockGains = blockCards * perCard + (turnStartLoss.has("Crimson Mantle") ? 1 : 0);
  const juggernautDamage = juggernaut * blockGains;
  if (juggernautDamage > 0) passive.push(`Juggernaut ${juggernaut} per block gain, ~${blockGains.toFixed(1)} gains a turn (~${juggernautDamage.toFixed(0)}/turn)`);
  // A power is drawn on average halfway through the first shuffle.
  const setupTurn = 1 + Math.round(n / (2 * HAND));
  const pieces = passivePiecesOptions.enabled ? passiveOfDeck(state, relicIds, { flameBack: flameBack * perCard, mantleBlock, stoneArmor, setupTurn }) : null;
  if (pieces) passive.push(...pieces.damageNames);
  // PASSIVE_PIECES: any passive damage (Inferno and Juggernaut too: 24 of 24 logged Juggernaut hits under Weak exact,
  // 5HHLMV2DZ5AZ F48 T5 against the Queen) stays out of the mechanic's cut.
  const exempt = passivePiecesOptions.enabled && (pieces !== null || infernoDamage + juggernautDamage > 0);
  return {
    size: n,
    energy,
    playedShare,
    plays: HAND * playedShare,
    damage: damage * perCard,
    aoeDamage: aoe * perCard,
    hits: hits * perCard,
    avgHit: hits > 0 ? damage / hits : 0,
    vulnerableSources: vulnerable,
    flatStrength,
    relicFlat: relicFlat.map(({ amount, from }) => ({ amount, from })),
    lateEnergy,
    lateEnergyScale,
    demonFormRate: demonForm,
    relicStrengthRate,
    ruptureRate,
    passiveDamage: infernoDamage + juggernautDamage,
    passiveAoe: infernoDamage,
    passive,
    ...(exempt ? { passivePieces: true as const } : {}),
    ...(pieces ? { passiveStart: pieces.damage, passiveStartAoe: pieces.aoe, turnBlock: pieces.turnBlock, passiveBlock: pieces.blockNames } : {}),
    setupTurn,
    growth,
  };
}

/** Fight turns the clock's passive block is listed for (boss fights logged to 24 turns; bossLossPerTurn reads its script's). */
const PASSIVE_BLOCK_TURNS = 30;

/**
 * PASSIVE_PIECES: the deck's and the relics' passive pieces for the clock (passive-pieces.ts clockRelicPieces and the
 * cards': Flame Barrier's damage back per hit at its plays a turn, Crimson Mantle's block from the turn after the powers
 * are played, Stone Armor's Plating from then, one less a turn). Retaliation is per hit of the boss's parts whose HP the
 * clock counts (the Queen's own, not the Amalgam's), their expected hits a turn over its script (monster DB).
 */
function passiveOfDeck(
  state: GameState,
  relicIds: string[],
  cards: { flameBack: number; mantleBlock: number; stoneArmor: number; setupTurn: number },
): { damage: number; aoe: number; damageNames: string[]; turnBlock: number[]; blockNames: string[] } | null {
  const relics = clockRelicPieces(relicIds);
  const damage: ClockPiece[] = [...relics.damage];
  const block: ClockPiece[] = [...relics.block];
  if (cards.flameBack > 0) damage.push({ name: `Flame Barrier back per boss hit (~${cards.flameBack.toFixed(2)} a hit/turn)`, amount: cards.flameBack, from: 1, perHit: true });
  if (cards.mantleBlock > 0) block.push({ name: `Crimson Mantle ${cards.mantleBlock} from T${cards.setupTurn + 1}`, amount: cards.mantleBlock, from: cards.setupTurn + 1 });
  if (cards.stoneArmor > 0) block.push({ name: `Stone Armor Plating ${cards.stoneArmor} from T${cards.setupTurn}`, amount: cards.stoneArmor, from: cards.setupTurn, decays: true });
  if (damage.length === 0 && block.length === 0) return null;
  const bossId = str(asRecord(state.run?.raw)["boss_id"]);
  const profile = bossProfile(bossId);
  const hitsByTurn = profile && damage.some((piece) => piece.perHit) ? bossHitsByTurn(profile.id, state.run?.ascension ?? 0, profile.scriptTurns, profile.hpParts) : null;
  const hitsPerTurn = hitsByTurn && hitsByTurn.length > 0 ? hitsByTurn.reduce((sum, h) => sum + h, 0) / hitsByTurn.length : 0;
  let total = 0;
  let aoe = 0;
  const damageNames: string[] = [];
  for (const piece of damage) {
    const amount = piece.perHit ? piece.amount * hitsPerTurn : piece.amount;
    if (amount <= 0) continue;
    total += amount;
    if (piece.aoe) aoe += amount;
    damageNames.push(piece.perHit ? `${piece.name} x ~${hitsPerTurn.toFixed(1)} boss hits a turn (~${amount.toFixed(1)}/turn)` : piece.name);
  }
  const turnBlock = Array.from({ length: PASSIVE_BLOCK_TURNS }, (_, t) => block.reduce((sum, piece) => sum + clockBlockAt(piece, t + 1), 0));
  return { damage: total, aoe, damageNames, turnBlock, blockNames: block.map((piece) => piece.name) };
}

/** Sum of a Strength ramp r, 2r, 3r, … that starts on turn `from` (inclusive), over turns 1..T, divided by T. */
function rampAverage(rate: number, from: number, turns: number): number {
  const n = Math.max(0, turns - from + 1);
  return turns > 0 ? (rate * n * (n + 1)) / 2 / turns : 0;
}

/** Average Strength over a T-turn fight. */
export function averageStrength(deck: DeckProfile, turns: number): number {
  const setup = deck.setupTurn;
  // One-off Strength (Inflame) from its play turn on.
  const flat = turns > 0 ? (deck.flatStrength * Math.max(0, turns - setup + 1)) / turns : 0;
  // Demon Form: Strength at the start of each turn after it is played.
  const demon = rampAverage(deck.demonFormRate, setup + 1, turns);
  // Toasty Mittens: +1 at the start of every turn from T1.
  const mittens = rampAverage(deck.relicStrengthRate, 1, turns);
  // Rupture: from the turn after it is played, fed at its rate.
  const rupture = rampAverage(deck.ruptureRate, setup + 1, turns);
  // Relic Strength that holds from its turn on (Vajra, Girya lifts from T1).
  const relicFlat = turns > 0 ? (deck.relicFlat ?? []).reduce((sum, { amount, from }) => sum + (amount * Math.max(0, turns - from + 1)) / turns, 0) : 0;
  return flat + demon + mittens + rupture + relicFlat;
}

/** Raw deck damage a turn in a T-turn fight against this boss: cards, Strength growth, Vulnerable, bodies. */
export function rawDeckDamage(deck: DeckProfile, bossId: string, turns: number): number {
  const id = bossProfile(bossId)?.id ?? "";
  const bodies = id === "KAISER_CRAB" ? 2 : 1;
  // AoE counts once per body into the crab.
  // Energy powers (Pyre) pay for more of the drawn cards from the turn after they are played, at the
  // fitted LATE_ENERGY_SHARE.
  const late = LATE_ENERGY_SHARE * (turns > 0 && (deck.lateEnergyScale ?? 1) > 1 ? ((deck.lateEnergyScale - 1) * Math.max(0, turns - deck.setupTurn)) / turns : 0);
  let perTurn = (1 + late) * (deck.damage + deck.aoeDamage * (bodies - 1) + averageStrength(deck, turns) * deck.hits);
  // Two Vulnerable sources keep the boss Vulnerable most turns. A boss that starts with Artifact eats
  // the Vulnerable (G1Z0: Aeonglass, estimate 58, dealt 34).
  if (deck.vulnerableSources >= 2 && id !== "AEONGLASS") perTurn *= VULNERABLE_UPTIME;
  // Power damage (Inferno, Juggernaut) from the turn after the powers are played; no Strength, no Vulnerable,
  // not scaled by the energy powers. Inferno's AoE counts once per body into the crab.
  return perTurn + passiveDeckDamage(deck, bossId, turns);
}

/**
 * The passive part of rawDeckDamage: power damage (Inferno, Juggernaut) from the turn after the powers are played, and
 * with PASSIVE_PIECES the pieces from turn 1 (DeckProfile.passiveStart); no Strength, no Vulnerable, not scaled by the
 * energy powers; AoE counted once per body into the crab.
 */
export function passiveDeckDamage(deck: DeckProfile, bossId: string, turns: number): number {
  const bodies = bossProfile(bossId)?.id === "KAISER_CRAB" ? 2 : 1;
  let out = 0;
  const passive = (deck.passiveDamage ?? 0) + (deck.passiveAoe ?? 0) * (bodies - 1);
  if (passive > 0 && turns > 0) out += (passive * Math.max(0, turns - deck.setupTurn)) / turns;
  out += (deck.passiveStart ?? 0) + (deck.passiveStartAoe ?? 0) * (bodies - 1);
  return out;
}

/**
 * Deck damage a turn in a T-turn fight against this boss: calibrated, and cut by the boss's mechanic. PASSIVE_PIECES
 * (a profile built with it): the mechanic cuts the cards' part only (calibrated as before); the passive part counts at
 * the calibration's slope, uncut (the Queen's Weak: 8D8DZ9K680C2 F48 T7, Thorns + Flame Barrier 7 a hit of Off With Your
 * Head under Weak 95, 35 for 35). Without the mechanic (factor 1) the two are the same number.
 */
export function deckEstimate(deck: DeckProfile, bossId: string, turns: number): number {
  const id = bossProfile(bossId)?.id ?? "";
  const raw = rawDeckDamage(deck, bossId, turns);
  if (!deck.passivePieces || raw <= 0) return Math.round(calibrated(raw) * mechanicFactor(id, deck, turns));
  const passive = passiveDeckDamage(deck, bossId, turns);
  return Math.round((ESTIMATE_BASE + ESTIMATE_SLOPE * (raw - passive)) * mechanicFactor(id, deck, turns) + ESTIMATE_SLOPE * passive);
}

/** Ceremonial Beast Ringing turns in a T-turn fight: every third turn from T6 (02L4: T6, T9). */
export function ringingTurns(turns: number): number {
  return turns >= 6 ? Math.floor((turns - 6) / 3) + 1 : 0;
}

/** Share of the deck's damage a boss's mechanic lets through over a T-turn fight. */
export function mechanicFactor(id: string, deck: DeckProfile, turns: number): number {
  if (turns <= 0) return 1;
  switch (id) {
    case "CEREMONIAL_BEAST": {
      // A Ringing turn plays one card: about one card's share of the turn.
      const ringing = ringingTurns(turns);
      const oneCard = 1 / Math.max(1, deck.plays);
      return (turns - ringing + ringing * oneCard) / turns;
    }
    case "KNOWLEDGE_DEMON": {
      // Sloth from T1 (code takes it first): at most 3 plays a turn. Mind Rot from T5: one card less drawn.
      const sloth = Math.min(1, 3 / Math.max(1, deck.plays));
      const mindRot = (HAND - 1) / HAND;
      const late = Math.max(0, turns - 5);
      return (sloth * (turns - late) + sloth * mindRot * late) / turns;
    }
    case "QUEEN":
      // Weak (-25%) from her third turn to the end.
      return (Math.min(turns, 2) + Math.max(0, turns - 2) * 0.75) / turns;
    // No explicit model yet: the logged A8 share of the calibrated estimate these fights realised
    // (Soul Fysh's Intangible turns and Beckons: 20.1 of 24.5; the Matriarch's Strength/Dexterity drain:
    // 20.3 of 26.1).
    case "SOUL_FYSH":
      return 0.82;
    case "LAGAVULIN_MATRIARCH":
      return 0.78;
    // The Insatiable: fitted on the 23 logged A8 fights (tools/boss-fights-extract.py THE_INSATIABLE,
    // tests/boss-fights/insatiable-a8.json), the realised damage a turn over the calibrated estimate at
    // the fight's real length has median 1.10 (LAD factor 1.04; median |log error| 0.28 at 1.0). Frantic
    // Escapes (median 3 a fight, ~0.45 a turn) do not show in it: they cost a card and an energy but the
    // fight's other turns are full-damage ones. The 0.50/0.51 of VNWR16YEJASM and 981WMX8MQ7DK (and
    // 69HWH6MD1S34's 0.41, 33 HP entry) were play, not the mechanic: Toasty Mittens exhausting Bludgeon /
    // Ultimate Strike / Bash+, 6 Escapes on 27 energy, the HP guard swapping out damage lines. A 0.54
    // factor would put the median |log error| at 0.71. So no discount.
    case "THE_INSATIABLE":
      return 1;
    // Kaiser Crab: fitted on the 23 logged A8 fights (tools/boss-fights-extract.py CRUSHER,ROCKET,
    // tests/boss-fights/kaiser-crab-a8.json), realised damage a turn over the calibrated estimate at the
    // fight's real length has median 0.96 (geometric mean 0.89, LAD factor 0.95, bootstrap 90% CI of the
    // median 0.76-1.05); median |log error| 0.26 at 1.0, 0.33 at 0.7. The two bodies are already in the
    // raw estimate (AoE counted per body). 0B5YKJFM0E8B (0.65) and RWWGRRYKD6LT (0.76) are in the low
    // half but not outliers (6HRZ 0.41 and M9PL 0.50 are lower, VE97 1.55 and ZWX5 1.60 higher), so the
    // ~0.7 the two suggested does not hold on the full data. No discount. (The last 7 fights, 09-28, sit at
    // a median 0.77: worth re-running the fit as more come in.)
    case "KAISER_CRAB":
      return 1;
    default:
      return 1;
  }
}

/**
 * Vantom: turns until its 9 Slippery stacks are gone. Each HP loss takes a stack and deals 1, so it lasts
 * 9 hits (logged A8: median 4 turns of 1-damage hits; 64ZB 4, D3X1 2 with Sword Boomerang and Twin Strikes).
 */
export function slipperyTurns(deck: DeckProfile | null, turns: number): number {
  const hits = deck && deck.hits > 0 ? deck.hits : 2;
  return Math.min(turns, SLIPPERY_STACKS / Math.max(0.5, hits));
}

/** Extra HP the boss effectively has over a T-turn fight (heals, and the damage Slippery wastes). */
export function extraHp(id: string, deck: DeckProfile | null, turns: number, perTurn: number): number {
  switch (id) {
    case "KNOWLEDGE_DEMON":
      // Ponder heals 30 on T4 and T8.
      return (turns > 4 ? PONDER_HEAL : 0) + (turns > 8 ? PONDER_HEAL : 0);
    case "VANTOM":
      // The turns spent stripping Slippery deal 1 a hit instead of the deck's damage.
      return Math.max(0, Math.round(slipperyTurns(deck, turns) * perTurn - SLIPPERY_STACKS));
    default:
      return 0;
  }
}

/** Turns we survive from `entryHp` at `lossPerTurn` (bossLossPerTurn; the profile's A8 constant by default). */
export function survivableTurns(profile: BossProfile, entryHp: number, lossPerTurn = profile.lossPerTurn): number {
  return Math.max(1, Math.floor(entryHp / Math.max(1, lossPerTurn)));
}

/** Steam Eruption as logged at A8 (6189FSNEN1MZ: 15 on T2, 36 on T9): only when the monster DB has no per-ascension numbers. */
const ERUPTION_FALLBACK = { first: 15, firstTurn: 2, perTurn: 3 };
/** Block we assume against the explosion turn. */
const ERUPTION_SURVIVAL_BLOCK = 12;

export interface EruptionSchedule {
  /** Stacks first seen on `firstTurn` (after its T1 Pressurize), and the gain with each move after. */
  first: number;
  firstTurn: number;
  perTurn: number;
  source: string;
}

/**
 * The Waterfall Giant's Steam Eruption at this ascension from the monster DB (powerScheduleAt: first seen
 * on T2 at 15 up to A8, 20 at A9, +3 a turn at both; 1VX145UJM8RZ A9: 20 on T2, 47 on T11), the nearest
 * logged ascension's moved by the measured change when this one is not; the logged A8 numbers only when the DB has none.
 */
export function eruptionSchedule(ascension: number): EruptionSchedule {
  const db = powerScheduleAt("WATERFALL_GIANT", "STEAM_ERUPTION_POWER", ascension);
  if (!db) return { ...ERUPTION_FALLBACK, source: "logged A8 (no DB numbers)" };
  // Not logged at this ascension: A{nearest}'s moved by the measured change (monster-db amountAt), said how.
  const estimate = db.note ? ` moved by the measured change (${db.note})` : "";
  return { first: db.first, firstTurn: db.firstTurn, perTurn: db.perTurn, source: db.exact ? `A${db.asc}, n=${db.n}` : `A${ascension} not logged: A${db.asc}'s, n=${db.n}${estimate}` };
}

/** Steam Eruption stacks on our turn T at this ascension: what it explodes for when killed on turn T. */
export function eruptionAt(turn: number, ascension: number, schedule = eruptionSchedule(ascension)): number {
  return schedule.first + schedule.perTurn * (turn - schedule.firstTurn);
}

/** The eruption as a formula in the kill turn T ("17+3(T-1)" at A9), for the texts DeepSeek reads. */
export function eruptionFormula(ascension: number): string {
  const schedule = eruptionSchedule(ascension);
  return `${eruptionAt(1, ascension, schedule)}+${schedule.perTurn}(T-1) when killed on turn T (${schedule.source})`;
}

/**
 * Waterfall Giant: killed on turn T it explodes for eruptionAt(T) = first + perTurn(T - firstTurn) (A8:
 * 12 + 3(T-1); A9: 17 + 3(T-1)). Surviving it with ~12 block needs entry - loss*T + 12 >= eruptionAt(T),
 * so T <= (entry + 12 - first + perTurn*firstTurn) / (perTurn + loss) (A8: (entry + 3) / (3 + loss); ERPH:
 * 66 HP -> T9, not 11; A9: (entry - 2) / (3 + loss), 1VX1's 82 HP at 5.1 a turn -> T9, not T10).
 */
export function eruptionTurns(entryHp: number, lossPerTurn: number, ascension = 8): number {
  const { first, firstTurn, perTurn } = eruptionSchedule(ascension);
  return Math.max(3, Math.floor((entryHp + ERUPTION_SURVIVAL_BLOCK - first + perTurn * firstTurn) / (perTurn + lossPerTurn)));
}


/** HP lost a turn in the Test Subject's first phase. */
const TEST_SUBJECT_PHASE1_LOSS = 3;
/** Phase 2's net loss a turn when the monster DB or boss-damage.json has nothing (D3X1, A8: ~15). */
const TEST_SUBJECT_PHASE2_LOSS_FALLBACK = 15;
/** Multi Claws phase 2's loss a turn is averaged over (its length is capped at 3-5 turns). */
const TEST_SUBJECT_PHASE2_CLAWS = 4;

/**
 * HP lost a turn in the Test Subject's phase 2 at this ascension: Multi Claw's hit (monster DB
 * moveDamageAt: A8 10, scaled when not logged here) times its hits, one more each use from its logged
 * count (10x3, 10x4, ...), averaged over the first TEST_SUBJECT_PHASE2_CLAWS claws, times the logged
 * share of the Test Subject's shown attack that got through our block (A8: 10 x 4.5 x 0.32 = ~14.5, the
 * ~15 D3X1 showed). The hand-set 15 when the DB or the share is missing.
 */
export function testSubjectPhase2Loss(ascension: number): { value: number; source: string } {
  const claw = moveDamageAt(monsterMoves(), "TEST_SUBJECT", "MULTI_CLAW_MOVE", ascension);
  const share = unblockedShare("TEST_SUBJECT");
  if (!claw || !share) return { value: TEST_SUBJECT_PHASE2_LOSS_FALLBACK, source: "~15 a turn (D3X1, A8; no DB numbers)" };
  const hits = Array.from({ length: TEST_SUBJECT_PHASE2_CLAWS }, (_, use) => claw.hits + use);
  const mean = (claw.perHit * hits.reduce((sum, n) => sum + n, 0)) / hits.length;
  const value = Math.round(mean * share.unblocked_share * 10) / 10;
  return {
    value,
    source: `Multi Claw ${claw.estimated ? "≈" : ""}${claw.perHit}x${claw.hits}+ at A${ascension}${claw.estimated ? ` (A${claw.from}'s scaled, estimated)` : ""} x ${Math.round(share.unblocked_share * 100)}% unblocked = ~${value} a turn`,
  };
}

/** Test Subject phase 3 turns (of `turns`) under Nemesis' Intangible: its first turn and every other one. */
export function testSubjectIntangibleTurns(turns: number): number {
  return Math.ceil(turns / 2);
}

/**
 * Test Subject phase HP at this ascension: the monster DB's logged phase sequence (nearest logged
 * ascension when none is; A8 "111 > 212 > 313"); the hand-set 100/200/300 (A8 111/212/313) when the DB
 * has no three-phase sequence for it.
 */
export function testSubjectPhases(ascension: number): [number, number, number] {
  const phases = bossHpAt("TEST_SUBJECT", ascension)?.phases ?? [];
  if (phases.length >= 3) return [phases[0]!, phases[1]!, phases[2]!];
  return ascension >= 8 ? [111, 212, 313] : [100, 200, 300];
}

/**
 * The max HP of every phase still to come after the current one, for a boss that revives into a new
 * phase (ADAPTABLE_POWER; the Test Subject is the only one logged: 100/200/300, A8 111/212/313, the
 * last phase without ADAPTABLE). The current phase is the one whose HP is nearest `maxHp`; an unknown
 * reviver gets one more phase at 1.5x its max HP.
 */
export function laterPhaseHps(maxHp: number, ascension: number): number[] {
  const phases = testSubjectPhases(ascension);
  const at = phases.reduce((best, hp, i) => (Math.abs(hp - maxHp) < Math.abs(phases[best]! - maxHp) ? i : best), 0);
  if (Math.abs(phases[at]! - maxHp) <= phases[at]! * 0.15) return phases.slice(at + 1);
  return [Math.round(maxHp * 1.5)];
}

export interface BossClock {
  boss: string;
  ascension: number;
  /** HP to chew through at this ascension, including heals, block and Slippery's wasted hits. */
  hp: number;
  hpNote: string;
  /** HP the fight is expected to start with. */
  entryHp: number;
  survivableTurns: number;
  fightTurns: number;
  turnsNote: string;
  need: number;
  deck: number;
  gap: number;
  mechanic: string;
  note: string;
  growth: string[];
  /** Damage from powers (Inferno, Juggernaut) counted in `deck`, named for the note (PASSIVE_PIECES: the relics' and Flame Barrier's too). */
  passive?: string[];
  /** PASSIVE_PIECES: the passive block in `lossPerTurn`, named for the note (absent with it off or none held). */
  passiveBlock?: string[];
  /** PASSIVE_PIECES: the deck profile was built with the passive pieces. */
  passivePieces?: true;
  /** HP we lose a turn in this fight (bossLossPerTurn) and where it comes from. */
  lossPerTurn: number;
  lossNote: string;
  /** Test Subject only: the per-phase needs. */
  phases?: { phase: number; hp: number; turns: number; need: number }[];
}

/** A rest heals this share of max HP (route-projection's REST_HEAL; the rest screen's "30% of max"). */
export const REST_HEAL_SHARE = 0.3;
/** Regal Pillow's extra heal on a rest (981WMX8MQ7DK F32: 37 -> 79 of 91 = 27 + 15). */
export const REGAL_PILLOW_HEAL = 15;

/**
 * Whether the pre-boss rest (the floor before the act boss) is still ahead: on an earlier floor, or on
 * that floor with its rest options not yet used.
 */
export function restAheadOfBoss(state: GameState): boolean {
  const floor = state.run?.floor ?? null;
  if (floor === null) return false;
  const boss = BOSS_FLOORS.find((entry) => entry >= floor);
  if (boss === undefined || floor >= boss) return false;
  if (floor < boss - 1) return true;
  const rest = asRecord(state.raw["rest"]);
  return state.screen === "REST" && asArray(rest["options"]).map(asRecord).some((option) => option["is_enabled"] === true && str(option["option_id"]).toUpperCase() === "HEAL");
}

/**
 * The expected entry HP: the current HP plus one rest's heal (30% of max, Regal Pillow's +15) while the
 * pre-boss rest is ahead, capped at max HP. It used to be max(HP, 85% of max) whenever any rest was ahead
 * (Z6AMPPWHQ5CV: 30/80 at F31 read as a 68 HP entry, "need 46"; the rest gave 54 and the demon needed ~61).
 * The fights before the rest are not taken off, and a smith instead heals nothing: an upper bound.
 */
export function expectedEntryHp(state: GameState): number {
  const hp = state.run?.current_hp ?? null;
  const max = state.run?.max_hp ?? null;
  if (max === null || max <= 0) return hp ?? 70;
  const now = hp ?? max;
  const relicIds = asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  // Pantograph heals 25 when the boss fight starts (rest.ts boss_start_heal, 97b239a): on top of the HP it is
  // entered with, capped at max (the clock read the HP before it; 5NFGDU7BQPD3 F16).
  const bossHeal = bossStartHealOf(relicIds);
  // The boss fight already on (a boss floor, in combat): its HP has the heal in it.
  if (state.in_combat && BOSS_FLOORS.includes(state.run?.floor ?? -1)) return now;
  if (!restAheadOfBoss(state)) return bossEntryHp(now, max, bossHeal);
  // The game's heal: 30% of max rounded down, then the rest relics (Regal Pillow +15, Stone Humidifier +5 max HP
  // and HP), as route-projection restedHp (batch D 981ae07); it was rounded, and Stone Humidifier left out.
  // Eternal Feather heals on entering the rest site: not again on its own screen (the HP has it).
  const deckSize = state.screen === "REST" ? 0 : asArray(asRecord(state.run?.raw)["deck"]).length;
  const rested = restedHp(now, max, restHealOf(relicIds, deckSize));
  return bossEntryHp(rested.hp, rested.max, bossHeal);
}

/** The act boss's clock at this state (entryHp overrides the expected entry HP, for the calibration). */
export function bossClock(state: GameState, knowledge: Knowledge, entryHpOverride?: number): BossClock | null {
  const bossId = str(asRecord(state.run?.raw)["boss_id"]);
  const profile = bossProfile(bossId);
  if (!profile) return null;
  const ascension = state.run?.ascension ?? 0;
  const deck = deckProfileForBoss(state, knowledge);
  const entryHp = entryHpOverride ?? expectedEntryHp(state);
  // PASSIVE_PIECES: the passive block by turn (Sai with Crimson Mantle, Plating, Orichalcum, ...); off: Sai alone, as before.
  const loss = bossLossPerTurn(
    profile,
    ascension,
    deck?.turnBlock && deck.turnBlock.some((b) => b > 0)
      ? { byTurn: deck.turnBlock, names: deck.passiveBlock ?? [], share: CLOCK_PASSIVE_BLOCK_SHARE }
      : turnBlockOf(asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]))),
  );
  const survive = survivableTurns(profile, entryHp, loss.value);
  const estimateAt = (turns: number): number => (deck ? deckEstimate(deck, bossId, turns) : 0);
  const base = {
    boss: profile.id,
    ascension,
    entryHp,
    survivableTurns: survive,
    mechanic: bossMechanic(profile, ascension),
    note: bossNote(profile, ascension),
    growth: deck?.growth ?? [],
    passive: deck?.passive ?? [],
    ...(deck?.passiveBlock && deck.passiveBlock.length > 0 ? { passiveBlock: deck.passiveBlock } : {}),
    ...(deck?.passivePieces ? { passivePieces: true as const } : {}),
    lossPerTurn: loss.value,
    lossNote: loss.source,
  };

  if (profile.id === "TEST_SUBJECT") {
    const [p1, p2, p3] = testSubjectPhases(ascension);
    // Phase 1 hits lightly (D3X1: 68 -> 60 in 3 turns): ~3 a turn.
    const est1 = Math.max(1, estimateAt(4));
    const turns1 = Math.max(2, Math.min(5, Math.ceil(p1 / est1)));
    const hpAt2 = Math.max(1, entryHp - TEST_SUBJECT_PHASE1_LOSS * turns1);
    // Multi Claw (A8 10x3) on phase 2's first turn, a hit more each turn: its DB damage at this ascension
    // times the logged unblocked share (A8 ~15 net a turn; D3X1: 60 HP at phase 2, dead on the 5th claw).
    const loss2 = testSubjectPhase2Loss(ascension);
    const turns2 = Math.max(3, Math.min(5, Math.round(hpAt2 / Math.max(1, loss2.value))));
    const turns3 = 6;
    // Phase 3 has Nemesis: Intangible on its first turn and every other turn after (logged: VQKX T5/T7,
    // ZANM T5/T7/T9, W6F4, CRRP, YFG5), every hit 1 while it lasts. Only the other turns deal damage
    // (VQKX F48: 3 / 88 / 5 over T5-T7; the clock had counted 6 full turns, "need 53").
    const damageTurns3 = turns3 - testSubjectIntangibleTurns(turns3);
    const need2 = Math.round(p2 / turns2);
    const need3 = Math.round(p3 / damageTurns3);
    const fightTurns = turns1 + turns2 + turns3;
    const deckNow = estimateAt(turns1 + turns2);
    const need = Math.max(need2, need3);
    return {
      ...base,
      hp: p1 + p2 + p3,
      hpNote: `three phases ${p1}/${p2}/${p3} ${bossHpSource(profile, ascension)}`,
      fightTurns,
      turnsNote: `phase 1 ~${turns1} turns at the deck's pace; phase 2 must die within ~${turns2} turns of Multi Claw at ~${hpAt2} HP (${loss2.source}); phase 3 assumed ${turns3}, ${damageTurns3} of them without Nemesis' Intangible`,
      need,
      deck: deckNow,
      gap: Math.max(0, need - deckNow),
      phases: [
        { phase: 1, hp: p1, turns: turns1, need: Math.round(p1 / turns1) },
        { phase: 2, hp: p2, turns: turns2, need: need2 },
        { phase: 3, hp: p3, turns: turns3, need: need3 },
      ],
    };
  }

  let cap = profile.scriptTurns;
  let capWhy = `script ${profile.scriptTurns}`;
  if (profile.id === "WATERFALL_GIANT") {
    const eruption = eruptionTurns(entryHp, loss.value, ascension);
    if (eruption < cap) {
      cap = eruption;
      capWhy = `eruption kill by T${eruption}`;
    }
  }
  const fightTurns = Math.max(3, Math.min(cap, survive));
  const deckNow = estimateAt(fightTurns);
  const hp = bossHp(profile, ascension) + extraHp(profile.id, deck, fightTurns, deckNow);
  const need = Math.round(hp / fightTurns);
  const extra = hp - bossHp(profile, ascension);
  // Its own HP at this ascension (the source's), then what the mechanic adds, then the fight's extra: never the sum as "(A8)".
  const parts = bossHpParts(profile, ascension);
  return {
    ...base,
    hp,
    hpNote: `${parts.body} ${bossHpSource(profile, ascension)}${parts.added > 0 ? ` + ${parts.added} (${profile.addedHpWhy ?? "what its mechanic adds"})` : ""}${extra > 0 ? ` + ${extra} (${profile.id === "VANTOM" ? `Slippery: ~${slipperyTurns(deck, fightTurns).toFixed(1)} turns of hits dealing 1` : "heals"})` : ""}`,
    fightTurns,
    turnsNote: `min(${capWhy}, survive ~${survive} at ${entryHp} HP losing ~${loss.value}/turn: ${loss.source})`,
    need,
    deck: deckNow,
    gap: Math.max(0, need - deckNow),
  };
}

/** @deprecated kept for older callers: need by boss id at A0-A7 script turns. */
export function bossNeed(bossId: string): (BossProfile & { id: string; turns: number; perTurn: number }) | null {
  const profile = bossProfile(bossId);
  if (!profile) return null;
  return { ...profile, turns: profile.scriptTurns, perTurn: Math.round(profile.hp / profile.scriptTurns) };
}

/** Rough damage a turn of the deck in the act boss fight (its expected length). */
export function deckDamagePerTurn(state: GameState, knowledge: Knowledge): number {
  const clock = bossClock(state, knowledge);
  if (clock) return clock.deck;
  const deck = deckProfileForBoss(state, knowledge);
  return deck ? deckEstimate(deck, "", 9) : 0;
}

export interface DamageGap {
  boss: string;
  need: number;
  deck: number;
  /** Damage a turn the deck is short (0 when it is not). */
  gap: number;
}

export function damageGap(state: GameState, knowledge: Knowledge): DamageGap | null {
  // On a boss floor the boss id is the one just killed; the next act's is not known yet (7DFB F33:
  // Dominate valued against the dead crab's numbers).
  if (BOSS_FLOORS.includes(state.run?.floor ?? 0)) return null;
  const clock = bossClock(state, knowledge);
  if (!clock) return null;
  return { boss: clock.boss, need: clock.need, deck: clock.deck, gap: clock.gap };
}

const BOSS_FLOORS = [17, 33, 48];

/** Largest card-value bonus a damage card gets from the gap. */
export const GAP_BONUS_MAX = 12;

/** Card-value bonus for a damage card (scaling, frontload, AoE into the crab) while the deck is short. */
export function gapCardBonus(gap: DamageGap | null, cardId: string): { bonus: number; why: string | null } {
  if (!gap || gap.gap <= 0) return { bonus: 0, why: null };
  const role = damageRole(cardId);
  if (!role || (role === "aoe" && gap.boss !== "KAISER_CRAB" && gap.boss !== "THE_KIN")) return { bonus: 0, why: null };
  // Against Aeonglass small attacks feed Withering Presence: the gap counts only scaling and big hits.
  if (gap.boss === "AEONGLASS" && role === "frontload" && !isBigHit(cardId)) return { bonus: 0, why: null };
  const bonus = Math.min(GAP_BONUS_MAX, Math.round(gap.gap * 0.4) + (role === "scaling" ? 2 : 0));
  return { bonus, why: `deck ~${gap.deck}/turn of ${gap.need} for ${gap.boss}: ${role} +${bonus}` };
}

/** Rest-site shift: smith over a comfortable heal while the deck is well short of the boss. */
export function gapRestShift(gap: DamageGap | null, option: string, hpPct: number, beforeBoss: boolean): number {
  if (!gap || gap.gap < 8 || beforeBoss || hpPct < 0.65) return 0;
  return option === "SMITH" ? 2 : 0;
}

/** The act boss clock as DeepSeek sees it (run plan, build/route/rest questions). */
export function bossClockJson(state: GameState, knowledge: Knowledge): Record<string, JsonValue> | null {
  const clock = bossClock(state, knowledge);
  if (!clock) return null;
  const onBossFloor = BOSS_FLOORS.includes(state.run?.floor ?? 0);
  return {
    boss: clock.boss,
    ...(onBossFloor ? { stale: "this floor's boss is the one just fought; the next act's boss is not known yet" } : {}),
    boss_hp: clock.hp,
    boss_hp_note: clock.hpNote,
    expected_entry_hp: clock.entryHp,
    survivable_turns: clock.survivableTurns,
    hp_loss_per_turn: clock.lossPerTurn,
    hp_loss_per_turn_note: clock.lossNote,
    fight_turns: clock.fightTurns,
    fight_turns_note: clock.turnsNote,
    need_damage_per_turn: clock.need,
    deck_damage_per_turn_estimate: clock.deck,
    estimate_note: clock.passivePieces
      ? `calibrated on 215 logged A8 boss fights (${ESTIMATE_BASE} + ${ESTIMATE_SLOPE} x the card count; typical error ~25%): cards, energy, Strength growth averaged over the fight, Vulnerable, and the boss mechanic below on the cards' part; passive damage (Inferno, Juggernaut, Thorns and Flame Barrier per boss hit, Mercury Hourglass, Letter Opener, Parrying Shield) at the same slope, not cut by the mechanic (Weak does not reduce it)`
      : `calibrated on 215 logged A8 boss fights (${ESTIMATE_BASE} + ${ESTIMATE_SLOPE} x the card count; typical error ~25%): cards, energy, Strength growth averaged over the fight, power damage (Inferno, Juggernaut), Vulnerable, and the boss mechanic below`,
    gap_per_turn: clock.gap,
    ...(clock.growth.length > 0 ? { strength_growth: clock.growth.join("; ") } : {}),
    ...(clock.passive && clock.passive.length > 0 ? { power_damage: clock.passive.join("; ") } : {}),
    ...(clock.passiveBlock && clock.passiveBlock.length > 0 ? { passive_block: `${clock.passiveBlock.join("; ")} (not cut by Frail; in hp_loss_per_turn)` } : {}),
    harder_because: clock.mechanic,
    ...(clock.phases ? { phases: clock.phases.map((phase) => ({ ...phase })) } : {}),
    boss_note: clock.note,
  };
}
