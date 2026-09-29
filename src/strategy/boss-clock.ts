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

import type { Knowledge } from "../knowledge/index.js";
import { bossDamageByTurn, bossHpAt, fillDbNumbers, monsterMoves, moveBaseDamages, moveDamageAt, powerScheduleAt, selfGainAt } from "../knowledge/monster-db.js";
import type { GameState } from "../mod/schema.js";
import { asArray, asRecord, num, numOrNull, str, type JsonValue } from "../util/json.js";
import { modelHandCard, turnStartOnly } from "./card-model.js";
import { damageRole, isBigHit } from "./card-value.js";
import { bossEntryHp, bossStartHealOf, restedHp, restHealOf } from "./route-projection.js";

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
  KAISER_CRAB: { hp: 408, hpA8: 428, scriptTurns: 8, lossPerTurn: 10, note: "two claws: single-target damage into the Rocket first (Laser {DMG:ROCKET:LASER_MOVE}, {BEHIND:ROCKET:LASER_MOVE} from behind, plus Strength, on T4/T9), AoE into both; the survivor's +99 Block lasts one turn (51 logged crab fights: Rocket died first 9/12 won, both alive to the end 8/39; experience crab-kill-order); Bug Sting then Laser from T3-T4", mechanic: "two bodies: single-target damage is split; AoE hits both" },
  // 379 (A8 399) plus two 30-HP Ponder heals; the T11 Overwhelming (12x3 and more) ends long fights (NZWR).
  KNOWLEDGE_DEMON: { hp: 379, hpA8: 399, scriptTurns: 11, lossPerTurn: 6.3, note: "heals 30 twice (Ponder), curses the deck on T1/T5/T9; Strength scaling wins", mechanic: "curses from T1: Sloth caps plays at 3 a turn, Mind Rot draws one less from T5; +60 HP of heals" },
  THE_INSATIABLE: { hp: 321, hpA8: 341, scriptTurns: 8, lossPerTurn: 8.9, note: "Sandpit starts at {POWER:THE_INSATIABLE:SANDPIT_POWER}, eaten at 0; each Frantic Escape adds a turn", mechanic: "Sandpit: the fight ends around T7 unless Frantic Escapes push it back" },
  // 512 (A8 535) plus two 33-block Ebb turns (L34T: 48 a turn, left at 173; M6P7: 33 a turn, left at 234).
  AEONGLASS: { hp: 578, hpA8: 601, addedHp: 66, scriptTurns: 9, lossPerTurn: 8.6, note: "Artifact {POWER:AEONGLASS:ARTIFACT_POWER} at start; Ebb gains {BLOCK:AEONGLASS:EBB_MOVE} block every 3rd turn; a Wither every {POWER:AEONGLASS:WITHERING_PRESENCE_POWER} cards played: few big cards", mechanic: "Artifact eats Vulnerable; two Ebbs of {BLOCK:AEONGLASS:EBB_MOVE} block; small cards feed Withers" },
  // Queen 400 (A8 419) plus ~20 block a turn while the Amalgam lives (~60). The Amalgam (199, A8 211) leaves
  // when she dies (notes/bosses.md; VE97, CWU9 ended with the Queen alone): its HP only counts when it
  // is killed first for survival.
  QUEEN: { hp: 460, hpA8: 480, hpParts: ["QUEEN"], addedHp: 60, scriptTurns: 8, lossPerTurn: 13.3, note: "kill the Amalgam first, the Queen takes only AoE (all 4 logged Queen wins killed it on T4-T8; the 5 A8 losses left it alive past T5; experience queen-plan); from her third turn the Amalgam hits {DMG:TORCH_HEAD_AMALGAM:BEAM_MOVE}/{DMG:TORCH_HEAD_AMALGAM:TACKLE_3_MOVE} as shown under Vulnerable, Weak and Frail", mechanic: "\"You are mine\" from her T3: Weak (-25% damage), Vulnerable and Frail for the rest of the fight; ~60 Queen block; the Amalgam ({HP:TORCH_HEAD_AMALGAM}) adds its HP only if killed first" },
  // Three phases, 100/200/300 (A8 111/212/313 as logged).
  TEST_SUBJECT: { hp: 600, hpA8: 636, scriptTurns: 12, lossPerTurn: 7.5, note: "three phases ({PHASES} HP); Painful Stabs Wounds on unblocked hits; Multi Claw grows each use", mechanic: "phase 2 is a race: Multi Claw starts {DMG:TEST_SUBJECT:MULTI_CLAW_MOVE} and gains a hit every turn (D3X1: dead on its 5th)" },
  LAGAVULIN_MATRIARCH: { hp: 222, hpA8: 233, scriptTurns: 12, lossPerTurn: 5.8, note: "sleeps two turns (play powers), then drains Strength/Dexterity", mechanic: "drains Strength and Dexterity each cycle after it wakes" },
  SOUL_FYSH: { hp: 211, hpA8: 221, scriptTurns: 12, lossPerTurn: 5.1, note: "shuffles Beckons into the deck, Intangible turns; Scream ({DMG:SOUL_FYSH:SCREAM_MOVE}) puts {APPLIES:SOUL_FYSH:SCREAM_MOVE:VULNERABLE_POWER} Vulnerable on us, and De-Gas ({DMG:SOUL_FYSH:DE_GAS_MOVE}) then hits x1.5", mechanic: "Intangible turns (each hit deals 1) and Beckons clogging the draw" },
  // Priest 190 (A8 199) plus two followers ~59 (A8 62/63); the fight ends with the priest, winners dealt
  // ~60 into the followers on the way.
  THE_KIN: { hp: 250, hpA8: 260, hpParts: ["KIN_PRIEST"], addedHp: 60, scriptTurns: 10, lossPerTurn: 10.1, note: "priest {KIN_PRIEST} plus two followers ~{KIN_FOLLOWER}: AoE; priest cycle Orb of Frailty, Orb of Weakness, Beam {DMG:KIN_PRIEST:BEAM_MOVE} plus Strength a hit on T3/T7/T11, Ritual (+{GAIN:KIN_PRIEST:RITUAL_MOVE:STRENGTH_POWER} Strength): be above the T11 Beam (~{KIN_BEAM_T11})", mechanic: "followers soak single-target damage; Ritual grows the Beam every cycle" },
  VANTOM: { hp: 173, hpA8: 183, scriptTurns: 11, lossPerTurn: 7.3, note: "{POWER:VANTOM:SLIPPERY_POWER} Slippery stacks: multi-hit", mechanic: "Slippery {POWER:VANTOM:SLIPPERY_POWER}: its next {POWER:VANTOM:SLIPPERY_POWER} HP losses are 1 each (64ZB: 9 damage in T1-T4); multi-hit strips it" },
  // 240 (A8 250) plus Siphon heals (~20: winners dealt 250-285).
  WATERFALL_GIANT: { hp: 260, hpA8: 270, addedHp: 20, scriptTurns: 14, lossPerTurn: 5.1, note: "Siphon heals {SIPHON}; Pressure Gun on T5/T10/T15 ({GUN}): block it fully; Steam Eruption explodes for its stacks when it dies", mechanic: "eruption {ERUPTION} explodes on the kill: kill it early ({GIANT_KILLS}; experience giant-explode), with HP plus that turn's block above the stacks (ERPH: T14 kill, 51 into 25 HP; {GIANT_BLOCK})" },
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
export function bossLossPerTurn(profile: BossProfile & { id: string }, ascension: number): { value: number; source: string; estimated: boolean } {
  const damage = bossDamageByTurn(profile.id, ascension, profile.scriptTurns);
  const share = unblockedShare(profile.id);
  if (!damage || !share || damage.perTurn.length === 0) return { value: profile.lossPerTurn, source: "logged A8 HP loss a turn (no DB damage)", estimated: false };
  const mean = damage.perTurn.reduce((sum, value) => sum + value, 0) / damage.perTurn.length;
  const value = Math.round(mean * share.unblocked_share * 10) / 10;
  return {
    value,
    source: `its attack ~${Math.round(mean)}/turn at A${ascension}${damage.estimated ? " (moves unseen at this ascension: the nearest logged one's, scaled by the measured ratio up to the highest logged ascension; estimated)" : ""} x ${Math.round(share.unblocked_share * 100)}% unblocked (${share.fights} logged fights)`,
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
      .replace("{GUN}", giant.gun.join("/")),
    ascension,
  );
}

/** The boss's mechanic line with its numbers at this ascension (the Giant's eruption, DB placeholders). */
export function bossMechanic(profile: BossProfile, ascension: number): string {
  return fillDbNumbers(
    profile.mechanic.replace("{ERUPTION}", eruptionFormula(ascension)).replace("{GIANT_KILLS}", giantKillRecord(ascension, "en")).replace("{GIANT_BLOCK}", giantBlockRecord("en")),
    ascension,
  );
}

/**
 * The block the Giant's kill left to find (its stacks less our HP at the kill) against the outcome, over the logged
 * A8 and A9 kills (boss-damage.json WATERFALL_GIANT.kills, tools/build-boss-damage.py). Was hard-coded ("33 kills:
 * 13 or less 17/18 won, 20 or more 3/15") and went stale with Y36HXZ80A8LL (a T9 kill at 36 HP into 41, won).
 */
export function giantBlockRecord(lang: "zh" | "en"): string {
  const kills = unblockedShare("WATERFALL_GIANT")?.kills ?? {};
  return giantBlockText([...(kills["8"] ?? []), ...(kills["9"] ?? [])], lang);
}

/** The block-needed record text of these fights (giantBlockRecord; exported for tests). */
export function giantBlockText(rows: GiantKillRow[], lang: "zh" | "en"): string {
  const killed = rows.filter((row) => row.turn !== null && row.hp != null && row.stacks != null);
  if (killed.length === 0) return lang === "zh" ? "A8/A9 没有记下击杀时 HP 的巨兽对局" : "no logged A8/A9 Giant kill with the HP at the kill";
  const bucket = (test: (need: number) => boolean) => {
    const list = killed.filter((row) => test(row.stacks! - row.hp!));
    return { won: list.filter((row) => row.won).length, n: list.length };
  };
  const low = bucket((need) => need <= 13);
  const mid = bucket((need) => need > 13 && need < 20);
  const high = bucket((need) => need >= 20);
  if (lang === "zh") {
    const parts = [`≤13 的 ${low.n} 场赢 ${low.won}`, ...(mid.n > 0 ? [`14–19 的 ${mid.n} 场赢 ${mid.won}`] : []), `≥20 的 ${high.n} 场赢 ${high.won}`];
    return `A8/A9 有击杀的 ${killed.length} 场：所需格挡（层数 − HP）${parts.join("，")}`;
  }
  const parts = [`13 or less ${low.won}/${low.n} won`, ...(mid.n > 0 ? [`14-19 ${mid.won}/${mid.n}`] : []), `20 or more ${high.won}/${high.n}`];
  return `A8/A9 kills (${killed.length}): block needed (stacks - HP) ${parts.join(", ")}`;
}

/**
 * The guides' facts that come from the data, filled when the DeepSeek system prompt is built (once a process, so
 * the prompt stays byte-identical across calls): {GIANT_BLOCK_RECORD} (giantBlockRecord), {GIANT_KILLS_A8} and
 * {GIANT_KILLS_A9} (giantKillRecord at A8 / A9: the kill-turn record, hard-coded as "A8 27 场…A9 10 场赢 3" until batch I).
 */
const GUIDE_FACTS: Record<string, () => string> = {
  "{GIANT_BLOCK_RECORD}": () => giantBlockRecord("zh"),
  "{GIANT_KILLS_A8}": () => giantKillRecord(8, "zh"),
  "{GIANT_KILLS_A9}": () => giantKillRecord(9, "zh"),
};

export function fillGuideFacts(text: string): string {
  let out = text;
  for (const [placeholder, fill] of Object.entries(GUIDE_FACTS)) if (out.includes(placeholder)) out = out.split(placeholder).join(fill());
  return out;
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
  const ritual = selfGainAt(monsters["KIN_PRIEST"]?.moves?.["RITUAL_MOVE"], "STRENGTH_POWER", ascension);
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
  /** Strength a turn from Rupture fed by self-damage cards. */
  ruptureRate: number;
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
  let ruptures = 0;
  let selfDamage = 0;
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
      ruptures += 1;
    } else {
      flatStrength += Math.max(0, card.strength);
    }
    // A power's energy at the start of each turn (Pyre, Pyre+ 2: RBJ402TKQZ6F F48 4 → 6 energy from T4).
    if (card.type === "Power") {
      const income = dynValue(entry, "Energy") ?? 0;
      const template = str(asRecord(entry)["rules_text"]) || knowledge.card(card.cardId)?.descriptionRaw || "";
      if (income > 0 && turnStartOnly(template, "Energy")) lateEnergy += income;
    }
    if (card.hpLoss > 0 || card.cardId === "CRIMSON_MANTLE") selfDamage += 1;
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
  // Rupture: +1 Strength each time a self-damage card is played on our turn.
  const ruptureRate = ruptures > 0 ? ruptures * selfDamage * perCard : 0;
  if (ruptureRate > 0) growth.push(`Rupture fed by ${selfDamage} self-damage cards (~+${ruptureRate.toFixed(1)}/turn)`);
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
    // A power is drawn on average halfway through the first shuffle.
    setupTurn: 1 + Math.round(n / (2 * HAND)),
    growth,
  };
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
  return perTurn;
}

/** Deck damage a turn in a T-turn fight against this boss: calibrated, and cut by the boss's mechanic. */
export function deckEstimate(deck: DeckProfile, bossId: string, turns: number): number {
  const id = bossProfile(bossId)?.id ?? "";
  return Math.round(calibrated(rawDeckDamage(deck, bossId, turns)) * mechanicFactor(id, deck, turns));
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
 * logged ascension when this one is not; the logged A8 numbers only when the DB has none.
 */
export function eruptionSchedule(ascension: number): EruptionSchedule {
  const db = powerScheduleAt("WATERFALL_GIANT", "STEAM_ERUPTION_POWER", ascension);
  if (!db) return { ...ERUPTION_FALLBACK, source: "logged A8 (no DB numbers)" };
  return { first: db.first, firstTurn: db.firstTurn, perTurn: db.perTurn, source: db.exact ? `A${db.asc}, n=${db.n}` : `A${ascension} not logged: A${db.asc}'s, n=${db.n}` };
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
  const loss = bossLossPerTurn(profile, ascension);
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
  return {
    ...base,
    hp,
    hpNote: `${bossHp(profile, ascension)} ${bossHpSource(profile, ascension)}${extra > 0 ? ` + ${extra} (${profile.id === "VANTOM" ? `Slippery: ~${slipperyTurns(deck, fightTurns).toFixed(1)} turns of hits dealing 1` : "heals"})` : ""}`,
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
    estimate_note: `calibrated on 215 logged A8 boss fights (${ESTIMATE_BASE} + ${ESTIMATE_SLOPE} x the card count; typical error ~25%): cards, energy, Strength growth averaged over the fight, Vulnerable, and the boss mechanic below`,
    gap_per_turn: clock.gap,
    ...(clock.growth.length > 0 ? { strength_growth: clock.growth.join("; ") } : {}),
    harder_because: clock.mechanic,
    ...(clock.phases ? { phases: clock.phases.map((phase) => ({ ...phase })) } : {}),
    boss_note: clock.note,
  };
}
