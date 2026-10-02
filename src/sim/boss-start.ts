/**
 * The act boss's opening built from outside a fight (milestone B3, Dai 2026-09-30): a deck-building question (card
 * reward, shop, rest site, deck selection, event) has no combat state, so the whole boss fight simulator's pre-fight
 * start (boss-sim redealInput fresh: the deck shuffled, the hand empty, the entry HP) is built here from the run as it
 * is now, for the boss the map names:
 *   - the boss's parts at this ascension (monster DB bosses: which monsters, how many), each one's median max HP there,
 *     its first move (the move logged on turn 1) and the powers it starts with (logged on turn 1 in most fights:
 *     Asleep and Plating, Slippery, Artifact, Minion ...);
 *   - our side as the live planner builds it (combat-plan planCombatTurn -> the solver input, rollout-live
 *     boardRolloutInput), on a combat frame made from the run: the deck, the relics, the potions (modelled ones are
 *     0-cost cards in hand, as in any boss fight), the entry HP; the fight-start relics this module knows
 *     (FIGHT_START_RELICS: their Strength, Dexterity, block, energy, draw and the enemies' Vulnerable/Weak on turn 1,
 *     measured on the logged boss fights' first frames) are on that frame; other relics with a combat text are listed
 *     as not modelled;
 *   - then every card goes to the draw pile and the start turn draws 5 (plus the turn-1 draw relics) in each sample.
 * Offline and deterministic: no clock, no files written, no model call. The live planner's code is only called.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "../config.js";
import type { Knowledge } from "../knowledge/index.js";
import { moveDamageAt, nearestAscension, type MonsterDb, type MonsterEntry } from "../knowledge/monster-db.js";
import { parseGameState, type GameState } from "../mod/schema.js";
import { buildRunBrief } from "../project/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../project/types.js";
import { planCombatTurn } from "../screens/combat-plan.js";
import { ENERGY_RELICS } from "../strategy/boss-clock.js";
import { CHOICE_POTIONS, DRAW_POTIONS } from "../strategy/card-model.js";
import { potionIdOf } from "../strategy/potion-cost.js";
import type { MoveModelData, RolloutInput } from "../strategy/rollout.js";
import { boardRolloutInput, deckModels, enemyTable, fightMetaOf, fightRelicsOf, relicBlockOf, relicEnergyOf, rolloutLiveOptions, type MonsterMoves } from "../strategy/rollout-live.js";
import { solveTap, type SolveResult, type SolverInput } from "../strategy/turn-solver.js";
import { asArray, asRecord, str } from "../util/json.js";

/** Cards drawn on turn 1 without relics. */
export const OPENING_HAND = 5;
/**
 * A power counts as the boss's own at the start when the logged fights (all ascensions pooled: one ascension can have
 * 1-2 fights) showed it on turn 1 in at least this share. Our debuffs (Vulnerable, Weak, Poison, ...) never count.
 */
export const INNATE_POWER_SHARE = 0.8;
// Strength is gained by moves (logged on turn 1 only after a buff or from our Brimstone), never a boss's own at the start.
const OUR_DEBUFFS = new Set(["VULNERABLE_POWER", "WEAK_POWER", "POISON_POWER", "FRAIL_POWER", "SHRINK_POWER", "DEMISE_POWER", "DOOM_POWER", "STRENGTH_POWER"]);

/**
 * Relics that act at the start of a fight, as the logged boss fights' first frames show them (A7-A9, 435 fights,
 * experiments/boss-sim/raw/fights.jsonl turn 1 before any card; n = fights holding the relic): Vajra Strength 1 (31 of
 * 38 exactly 1, the others with more Strength from elsewhere), Girya its lifts, Ember Tea 2 while it has fights left,
 * Toasty Mittens 1 (24/28), Brimstone 2 and every enemy 1 (10/10), Oddly Smooth Stone Dexterity 1 (34/34), Anchor block
 * 10 (25/26), Gorget Plating 4 (24/24), Bronze Scales Thorns 3 (23/23), Akabeko Vigor 8 (10/10), Bag of Marbles every
 * enemy Vulnerable 1 (35/37), Red Mask Weak 1 (30/31), Lantern energy 1 (27/38 exactly 1), Venerable Tea Set energy 2
 * (35/35 at least 2), Seal of Gold energy 1 (7/9), Very Hot Cocoa energy 4 (10/11), Happy Flower energy 1 when its counter
 * reaches 3 on turn 1 (from 2 before the fight; its later turns are rollout-live fightRelicsOf's), Bag of Preparation 2 more cards (22/32 at 7), Pael's Blood 1 more card (27/32 at 6; its later
 * turns are not modelled, like the logged fights' pre-fight start).
 */
export interface FightStartRelic {
  strength?: number;
  dexterity?: number;
  block?: number;
  vigor?: number;
  thorns?: number;
  plating?: number;
  /** Energy on turn 1 on top of max energy. */
  energy?: number;
  /** Cards drawn on turn 1 on top of OPENING_HAND. */
  draw?: number;
  enemyVulnerable?: number;
  enemyWeak?: number;
  enemyStrength?: number;
}

export const FIGHT_START_RELICS: Record<string, (stack: number | null) => FightStartRelic | null> = {
  VAJRA: () => ({ strength: 1 }),
  GIRYA: (stack) => (stack && stack > 0 ? { strength: stack } : null),
  EMBER_TEA: (stack) => (stack && stack > 0 ? { strength: 2 } : null),
  TOASTY_MITTENS: () => ({ strength: 1 }),
  BRIMSTONE: () => ({ strength: 2, enemyStrength: 1 }),
  ODDLY_SMOOTH_STONE: () => ({ dexterity: 1 }),
  ANCHOR: () => ({ block: 10 }),
  GORGET: () => ({ plating: 4 }),
  BRONZE_SCALES: () => ({ thorns: 3 }),
  AKABEKO: () => ({ vigor: 8 }),
  BAG_OF_MARBLES: () => ({ enemyVulnerable: 1 }),
  RED_MASK: () => ({ enemyWeak: 1 }),
  LANTERN: () => ({ energy: 1 }),
  VENERABLE_TEA_SET: () => ({ energy: 2 }),
  SEAL_OF_GOLD: () => ({ energy: 1 }),
  VERY_HOT_COCOA: () => ({ energy: 4 }),
  // Its counter ticks at the start of each turn: 1 energy on turn 1 when it stands at 2 before the fight.
  HAPPY_FLOWER: (stack) => ((((stack ?? 0) + 1) % 3 === 0) ? { energy: 1 } : null),
  BAG_OF_PREPARATION: () => ({ draw: 2 }),
  PAELS_BLOOD: () => ({ draw: 1 }),
};

/**
 * Relics the fight already models elsewhere: the energy relics (rollout relicEnergy, and turn 1 here), the turn relics
 * (rollout-live fightRelicsOf, relicBlockOf), the ones the solver reads from the run (combat-plan planTurn: Shuriken,
 * Music Box, Cloak Clasp, Pael's Tears, Red Skull, Self-Forming Clay, Demon Tongue, Intimidating Helmet, Beating
 * Remnant, Paper Phrog, Toasty Mittens, Fiddle, Kusarigama, Vambrace, Mercury Hourglass, Lizard Tail) and Biiig Hug.
 */
const MODELLED_ELSEWHERE = new Set([
  ...ENERGY_RELICS, "CAPTAINS_WHEEL", "CANDELABRA", "CHANDELIER", "HORN_CLEAT", "SHURIKEN", "MUSIC_BOX", "CLOAK_CLASP",
  "PAELS_TEARS", "RED_SKULL", "SELF_FORMING_CLAY", "DEMON_TONGUE", "INTIMIDATING_HELMET", "BEATING_REMNANT", "PAPER_PHROG", "FIDDLE",
  "KUSARIGAMA", "VAMBRACE", "MERCURY_HOURGLASS", "LIZARD_TAIL", "BIIIG_HUG",
]);
/** A relic text that acts in fights (the ones outside FIGHT_START_RELICS and MODELLED_ELSEWHERE are listed as not modelled). */
const FIGHT_TEXT = /战斗开始时|战斗中|回合开始时|回合结束时|每回合|每当|第\s*\d+\s*回合|打出|格挡|力量|敏捷|能量|抽|伤害|at the start of|each turn|whenever|combat/i;

/** Names of the bosses the game data has no single monster for (several parts), or shows with a tag (#C24). */
export const BOSS_NAMES: Record<string, string> = { THE_KIN: "同族", KAISER_CRAB: "帝王蟹", TEST_SUBJECT: "实验体" };

/** Where each part stands (index order as logged): the minions before their leader, the Crab's Crusher left. */
const BOSS_POSITIONS: Record<string, string[]> = {
  THE_KIN: ["KIN_FOLLOWER", "KIN_FOLLOWER", "KIN_PRIEST"],
  QUEEN: ["TORCH_HEAD_AMALGAM", "QUEEN"],
  KAISER_CRAB: ["CRUSHER", "ROCKET"],
};

export interface BossPart {
  index: number;
  id: string;
  name: string;
  hp: number;
  /** The move it opens with (the move logged on turn 1), null when none was logged. */
  move: string | null;
  powers: Record<string, number>;
}

export interface BossOpening {
  /** The monster DB boss key (run.boss_id without _BOSS). */
  key: string;
  name: string;
  /** The logged ascension the numbers come from (the nearest to the run's when it was not logged). */
  asc: number;
  exact: boolean;
  parts: BossPart[];
}

const KNOWLEDGE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "knowledge");
let dbCache: MonsterDb | undefined;
let mmCache: MoveModelData | undefined;

/** The committed monster DB (src/knowledge/monster-db.json), read once. */
export function loadMonsterDb(): MonsterDb {
  if (dbCache) return dbCache;
  try {
    const parsed = JSON.parse(readFileSync(join(KNOWLEDGE_DIR, "monster-db.json"), "utf8")) as Partial<MonsterDb>;
    dbCache = { bosses: parsed.bosses ?? {}, encounters: parsed.encounters ?? {}, monsters: parsed.monsters ?? {} };
  } catch {
    dbCache = { bosses: {}, encounters: {}, monsters: {} };
  }
  return dbCache;
}

/** The committed move model (src/knowledge/move-model.json), read once. */
export function loadMoveModel(): MoveModelData {
  if (mmCache) return mmCache;
  try {
    mmCache = JSON.parse(readFileSync(join(KNOWLEDGE_DIR, "move-model.json"), "utf8")) as MoveModelData;
  } catch {
    mmCache = {};
  }
  return mmCache;
}

function isRandomPotion(id: string | null): boolean {
  return id !== null && (id in CHOICE_POTIONS || id in DRAW_POTIONS);
}

/** The monster DB boss key of a run's boss id (THE_KIN_BOSS -> THE_KIN). */
export function bossKey(bossId: string): string {
  return bossId.toUpperCase().replace(/_BOSS$/, "");
}

function modeKey(counts: Record<string, number> | undefined): string | null {
  const best = Object.entries(counts ?? {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return best ? best[0] : null;
}

/** A monster's name as the game shows it (knowledge), else the DB's, else its id. */
function nameOf(id: string, db: MonsterDb, knowledge?: Knowledge): string {
  return knowledge?.monster(id)?.name || db.monsters[id]?.name?.zh || id;
}

/**
 * The boss's opening at `asc` from the monster DB: its parts in board order, each one's median max HP at this
 * ascension (the nearest logged one when not logged), first move and starting powers. null when the DB has no parts.
 */
export function bossOpening(bossId: string, asc: number, db: MonsterDb, knowledge?: Knowledge): BossOpening | null {
  const key = bossKey(bossId);
  const byAsc = db.bosses[key];
  const found = nearestAscension(byAsc, asc);
  if (!byAsc || !found) return null;
  const entry = byAsc[found.key]!;
  const fightsAt = (key: string) => byAsc[key]?.fights ?? 0;
  const counts = Object.entries(entry.parts ?? {}).map(([id, range]) => ({ id, count: Math.max(1, Math.round(range.count_per_fight ?? 1)) }));
  if (counts.length === 0) return null;
  const order = BOSS_POSITIONS[key] ?? [];
  const minion = (id: string) => Object.keys(db.monsters[id]?.powers ?? {}).includes("MINION_POWER");
  const ids = order.length > 0 && order.every((id) => counts.some((c) => c.id === id))
    ? order
    : counts.sort((a, b) => Number(minion(b.id)) - Number(minion(a.id)) || a.id.localeCompare(b.id)).flatMap((c) => Array.from({ length: c.count }, () => c.id));
  const seen = new Map<string, number>();
  const parts: BossPart[] = ids.map((id, index) => {
    const nth = seen.get(id) ?? 0;
    seen.set(id, nth + 1);
    const mon: MonsterEntry | undefined = db.monsters[id];
    const hpAt = nearestAscension(mon?.hp_by_asc, asc);
    const range = hpAt ? mon!.hp_by_asc![hpAt.key]! : entry.parts?.[id];
    // A half-way median (the Kin's followers 62/63 at A8): the copies take the two sides of it in turn.
    const median = range?.median ?? range?.min ?? 0;
    const hp = Number.isInteger(median) ? median : nth % 2 === 0 ? Math.ceil(median) : Math.floor(median);
    // Turn-1 moves, most logged first; several copies of a part open with different moves (the Kin's followers).
    const firsts = Object.entries(mon?.moves ?? {})
      .map(([move, m]) => [move, m.turns_seen?.["1"] ?? 0] as const)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([move]) => move);
    const powers: Record<string, number> = {};
    for (const [powerId, power] of Object.entries(mon?.powers ?? {})) {
      if (OUR_DEBUFFS.has(powerId)) continue;
      const byTurn = Object.entries(power.turn_at_first_sight_by_asc ?? {}).filter(([key]) => fightsAt(key) > 0);
      const onTurn1 = byTurn.reduce((sum, [, turns]) => sum + (turns["1"] ?? 0), 0);
      const fights = byTurn.reduce((sum, [key]) => sum + fightsAt(key), 0);
      if (fights === 0 || onTurn1 < INNATE_POWER_SHARE * fights) continue;
      const amountAt = nearestAscension(power.amount_at_first_sight_by_asc, Number(found.key));
      const amount = Number(modeKey(amountAt ? power.amount_at_first_sight_by_asc![amountAt.key] : power.amount_at_first_sight) ?? 1);
      powers[powerId] = Number.isFinite(amount) ? amount : 1;
    }
    return { index, id, name: nameOf(id, db, knowledge), hp, move: firsts.length > 0 ? firsts[nth % firsts.length]! : null, powers };
  });
  return { key, name: BOSS_NAMES[key] ?? nameOf(key, db, knowledge), asc: Number(found.key), exact: found.exact, parts };
}

/** The fight-start relics held and what they add on turn 1, and the fight relics not modelled at all. */
export function fightStartRelics(runRaw: Record<string, unknown>, knowledge?: Knowledge): { total: Required<FightStartRelic>; applied: string[]; unmodelled: string[] } {
  const total: Required<FightStartRelic> = { strength: 0, dexterity: 0, block: 0, vigor: 0, thorns: 0, plating: 0, energy: 0, draw: 0, enemyVulnerable: 0, enemyWeak: 0, enemyStrength: 0 };
  const applied: string[] = [];
  const unmodelled: string[] = [];
  for (const raw of asArray(runRaw["relics"]).map(asRecord)) {
    const id = str(raw["relic_id"]);
    const name = str(raw["name"], knowledge?.relic(id)?.name ?? id);
    const rule = FIGHT_START_RELICS[id];
    if (rule) {
      const effect = rule(typeof raw["stack"] === "number" ? (raw["stack"] as number) : null);
      if (effect) {
        for (const [k, v] of Object.entries(effect) as [keyof FightStartRelic, number][]) total[k] += v;
        applied.push(name);
      }
      continue;
    }
    if (MODELLED_ELSEWHERE.has(id)) continue;
    const text = knowledge?.relic(id)?.description ?? str(raw["description"]);
    if (FIGHT_TEXT.test(text)) unmodelled.push(name);
  }
  return { total, applied, unmodelled };
}

/** The deck entry as a hand card of the synthetic frame (the live planner models it; the start redeals it anyway). */
function handEntry(raw: Record<string, unknown>, index: number, targets: number[], knowledge: Knowledge): Record<string, unknown> {
  const info = knowledge.card(str(raw["card_id"]));
  const single = info?.target === "AnyEnemy";
  return { ...raw, index, target_type: info?.target ?? "", requires_target: single, valid_target_indices: single ? targets : [], playable: true, can_play_result: true };
}

/** The mod's power entries. */
function powerList(powers: Record<string, number>): Record<string, unknown>[] {
  return Object.entries(powers).filter(([, amount]) => amount !== 0).map(([power_id, amount], index) => ({ index, power_id, name: power_id, amount }));
}

/**
 * A turn-1 combat frame for the boss (the mod's state shape, enough for the live planner): the run as it is (deck,
 * relics, potions) at `entryHp`, our fight-start relic effects, the boss's parts with their first moves as intents.
 */
export function syntheticBossState(state: GameState, knowledge: Knowledge, opening: BossOpening, entryHp: number, db: MonsterDb, mm: MoveModelData): { state: GameState; draw: number; relics: ReturnType<typeof fightStartRelics> } {
  const raw = JSON.parse(JSON.stringify(state.raw)) as Record<string, unknown>;
  const run = asRecord(raw["run"]);
  const maxHp = typeof run["max_hp"] === "number" ? (run["max_hp"] as number) : entryHp;
  const hp = Math.max(1, Math.min(maxHp, Math.round(entryHp)));
  run["current_hp"] = hp;
  const relics = fightStartRelics(run, knowledge);
  const r = relics.total;
  // Happy Flower's counter as it stands on turn 1 (ticked once): what rollout-live fightRelicsOf reads at a fight frame.
  for (const relic of asArray(run["relics"]).map(asRecord)) {
    if (str(relic["relic_id"]) === "HAPPY_FLOWER") relic["stack"] = ((typeof relic["stack"] === "number" ? (relic["stack"] as number) : 0) + 1) % 3;
  }
  const asc = state.run?.ascension ?? opening.asc;
  const maxEnergy = typeof run["max_energy"] === "number" && (run["max_energy"] as number) > 0 ? (run["max_energy"] as number) : 3;
  const energy = maxEnergy + relicEnergyOf(run).filter((e) => e.from <= 1).length + r.energy;
  const playerPowers: Record<string, number> = { STRENGTH_POWER: r.strength, DEXTERITY_POWER: r.dexterity, VIGOR_POWER: r.vigor, THORNS_POWER: r.thorns, PLATING_POWER: r.plating };
  // The Kaiser Crab's claws surround us from the start (logged: Surrounded on every first frame).
  if (opening.parts.some((part) => (part.powers["BACK_ATTACK_LEFT_POWER"] ?? 0) > 0 || (part.powers["BACK_ATTACK_RIGHT_POWER"] ?? 0) > 0)) playerPowers["SURROUNDED_POWER"] = 1;
  const targets = opening.parts.map((p) => p.index);
  const enemies = opening.parts.map((part) => {
    const powers: Record<string, number> = { ...part.powers };
    // Our debuffs at the start: Artifact takes each one first (Aeonglass).
    for (const [powerId, amount] of [["VULNERABLE_POWER", r.enemyVulnerable], ["WEAK_POWER", r.enemyWeak]] as const) {
      if (amount <= 0) continue;
      if ((powers["ARTIFACT_POWER"] ?? 0) > 0) powers["ARTIFACT_POWER"] = powers["ARTIFACT_POWER"]! - 1;
      else powers[powerId] = (powers[powerId] ?? 0) + amount;
    }
    if (r.enemyStrength) powers["STRENGTH_POWER"] = (powers["STRENGTH_POWER"] ?? 0) + r.enemyStrength;
    const table = enemyTable(part.id, asc, db.monsters as MonsterMoves, mm);
    // The first move's intent as the game shows it on turn 1: its base hit at this ascension (moveDamageAt; the shown
    // hit for a move whose base was never measured), from behind x1.5 for the Crab's claw at our back at the start
    // (logged: Crusher's Thrash 21 = 14 x 1.5 on every first frame; the move table's hit averages the facing).
    const tableMove = part.move ? table?.moves[part.move] : undefined;
    const logged = part.move ? moveDamageAt(db.monsters, part.id, part.move, asc) : null;
    const behind = (part.powers["BACK_ATTACK_LEFT_POWER"] ?? 0) > 0 ? 1.5 : 1;
    const move = tableMove && tableMove.damage > 0 && logged ? { damage: Math.floor((logged.base ?? logged.perHit) * behind), hits: logged.hits } : tableMove;
    const kinds = (modeKey(part.move ? db.monsters[part.id]?.moves?.[part.move]?.intents : undefined) ?? (move && move.damage > 0 ? "Attack" : "Unknown")).split("+");
    const strength = powers["STRENGTH_POWER"] ?? 0;
    // Shown as the game shows it: Strength in, Weak (our Red Mask) x0.75 (logged: 5 -> 3, 26 -> 19 on first frames).
    const hit = move ? Math.max(0, Math.floor((move.damage + strength) * ((powers["WEAK_POWER"] ?? 0) > 0 ? 0.75 : 1))) : 0;
    const intents = kinds.map((kind, index) =>
      kind === "Attack" && move && move.damage > 0
        ? { index, intent_type: "Attack", damage: hit, hits: move.hits, total_damage: hit * move.hits }
        : { index, intent_type: kind, damage: null, hits: null },
    );
    return {
      index: part.index,
      enemy_id: part.id,
      name: part.name,
      current_hp: part.hp,
      max_hp: part.hp,
      base_max_hp: part.hp,
      // A sleeper's Plating is up as block from the start (the Matriarch: 12 block on every logged first frame).
      block: powers["ASLEEP_POWER"] ? (powers["PLATING_POWER"] ?? 0) : 0,
      is_alive: true,
      is_hittable: true,
      powers: powerList(powers),
      intent: part.move,
      move_id: part.move,
      intents,
    };
  });
  // The belt as a fight shows it: every potion but an automatic one (Fairy in a Bottle) can be drunk, an aimed one at
  // any enemy (out of a fight the mod says none can).
  for (const potion of asArray(run["potions"]).map(asRecord)) {
    if (potion["occupied"] !== true) continue;
    potion["can_use"] = str(potion["usage"]) !== "Automatic";
    const aimed = str(potion["target_type"]) === "AnyEnemy";
    potion["requires_target"] = aimed;
    potion["valid_target_indices"] = aimed ? targets : [];
  }
  const deck = asArray(run["deck"]).map(asRecord);
  const draw = OPENING_HAND + r.draw;
  const hand = deck.slice(0, Math.min(OPENING_HAND, deck.length)).map((card, i) => handEntry(card, i, targets, knowledge));
  raw["screen"] = "COMBAT";
  raw["in_combat"] = true;
  raw["turn"] = 1;
  raw["available_actions"] = ["end_turn", "play_card", "use_potion"];
  for (const key of ["shop", "rest", "reward", "event", "selection", "map", "chest", "bundles", "capstone", "modal", "agent_view", "crystal_sphere", "game_over"]) raw[key] = null;
  raw["combat"] = {
    action_readiness: { can_use_combat_actions: true },
    player: {
      current_hp: hp,
      max_hp: maxHp,
      block: r.block + relicBlockOf(run).filter((b) => b.turn === 1).reduce((sum, b) => sum + b.amount, 0),
      energy,
      stars: 0,
      focus: 0,
      powers: powerList(playerPowers),
      cards_played_this_turn: 0,
      attacks_played_this_turn: 0,
      skills_played_this_turn: 0,
    },
    hand,
    enemies,
  };
  return { state: parseGameState(raw), draw, relics };
}

/** The synthetic pre-fight start and what went into it. */
export interface SyntheticStart {
  /** The simulator's input: potions held (modelled ones), every card in the draw pile, `drawFirst` cards drawn on turn 1. */
  input: RolloutInput;
  boss: BossOpening;
  /** Fight-start relics applied on turn 1, and relics with a fight text the fight does not model. */
  relics: { applied: string[]; unmodelled: string[] };
  entryHp: number;
  maxHp: number;
}

export interface SyntheticStartOptions {
  db?: MonsterDb;
  mm?: MoveModelData;
}

/** MECH_MOVE_RULES as the loop's config has it (process.env, its .env loaded there): on unless it or MECH_RULES is off. */
function moveRulesSwitch(): boolean {
  const config = loadConfig({ MECH_RULES: process.env["MECH_RULES"], MECH_MOVE_RULES: process.env["MECH_MOVE_RULES"] } as NodeJS.ProcessEnv);
  return config.mechRules && config.mechMoveRules;
}

/**
 * The pre-fight start of `bossId` for the run in `state` (any screen), entered at `entryHp`: the live planner's
 * turn-1 board on the synthetic frame, then (as boss-sim redealInput fresh) the hand back in the deck, every card in
 * the draw pile, the start turn drawing OPENING_HAND plus the draw relics. The live rollout is off while the planner
 * builds the board (its facts are not needed). Throws when the DB has no such boss or the planner builds no board.
 */
export function syntheticBossStart(state: GameState, knowledge: Knowledge, bossId: string, entryHp: number, opts: SyntheticStartOptions = {}): SyntheticStart {
  const db = opts.db ?? loadMonsterDb();
  const mm = opts.mm ?? loadMoveModel();
  const asc = state.run?.ascension ?? 0;
  const opening = bossOpening(bossId, asc, db, knowledge);
  if (!opening) throw new Error(`no boss ${bossId} in the monster DB`);
  const synth = syntheticBossState(state, knowledge, opening, entryHp, db, mm);
  const s = synth.state;
  const env: DecisionEnv = {
    state: s,
    knowledge,
    brief: buildRunBrief(s, knowledge),
    screenMemory: createScreenMemory("COMBAT"),
    thresholds: loadConfig({} as NodeJS.ProcessEnv).thresholds,
    // MECH_MOVE_RULES (the Kaiser Crab's back attack needing both claws, the learned move changes) as the loop runs it
    // (its .env is in process.env), off with MECH_RULES off; the rest of this start does not read the config.
    mechMoveRules: moveRulesSwitch(),
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    shopDiscardPotions: [],
    jevContext: "off",
    fightPlan: "off",
  };
  let captured: { input: SolverInput; result: SolveResult } | null = null;
  const rollout = rolloutLiveOptions.enabled;
  solveTap.onSolve = (input, result) => {
    captured ??= { input, result };
  };
  rolloutLiveOptions.enabled = false;
  try {
    planCombatTurn(env);
  } finally {
    solveTap.onSolve = null;
    rolloutLiveOptions.enabled = rollout;
  }
  const cap = captured as { input: SolverInput; result: SolveResult } | null;
  if (!cap) throw new Error("the planner built no board for the synthetic boss frame");
  const board = boardRolloutInput(s, knowledge, cap.input, asc, db.monsters as MonsterMoves, mm);
  const { handBase: _handBase, solver, ...boardInput } = board;
  // Random potions (a card choice, draws) stay out of the fight as in any logged board: potion-mc prices them live.
  const potions = solver.hand.filter((card) => card.type === "Potion" && !isRandomPotion(potionIdOf(card.cardId)));
  const meta = { ...fightMetaOf(s, knowledge, createScreenMemory("COMBAT")), kind: "boss" as const, t: 1 };
  const input: RolloutInput = {
    ...boardInput,
    solver: { ...solver, hand: potions, cardsPlayedThisTurn: 0, turn: 1, player: { ...solver.player, hp: s.run?.current_hp ?? entryHp } },
    plans: [],
    piles: { draw: deckModels(s, knowledge), discard: [], handBase: potions.map(() => null) },
    meta,
    mm,
    model: null,
    gates: null,
    fightRelics: fightRelicsOf(asRecord(s.run?.raw), 1),
    options: { drawFirst: synth.draw },
  };
  return { input, boss: opening, relics: { applied: synth.relics.applied, unmodelled: synth.relics.unmodelled }, entryHp: s.run?.current_hp ?? entryHp, maxHp: s.run?.max_hp ?? entryHp };
}
