/**
 * Buffs, debuffs and block at an ascension with no logged sample (ascension review 2026-10-02): the nearest logged
 * ascension's amount moved by the measured change (monster-db amountAt), as damage is scaled (moveDamageAt). Fixture
 * data only: A8 -> A9 Strength +1 on most bosses' buff moves and on few hallway ones; Plating proportional.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

import {
  amountEstimateNote,
  ascAmountOptions,
  ascensionAmountChange,
  bossDossier,
  chainedAmountChange,
  fillDbNumbers,
  monsterDamageByTurn,
  moveAmountAt,
  powerScheduleAt,
  selfGainAt,
  setMonsterDbForTests,
  startAmountAt,
  type MonsterEntry,
} from "../src/knowledge/monster-db.js";
import { renderMonster } from "../src/knowledge/render/monster-text.js";
import { bossOpening } from "../src/sim/boss-start.js";
import { enemyTable, playerPowersOf, shriekFromOf } from "../src/reflex/rollout-live.js";
import { knowledgeFile } from "../src/knowledge/files.js";

/** A move giving itself Strength, by ascension (asc -> most common amount, logged `n` times). */
const strengthMove = (byAsc: Record<string, number>, n = 5, extra: Record<string, unknown> = {}) => ({
  self_powers_gained: { STRENGTH_POWER: Object.values(byAsc).reduce<Record<string, number>>((pooled, amount) => ({ ...pooled, [String(amount)]: (pooled[String(amount)] ?? 0) + n }), {}) },
  self_powers_gained_by_asc: Object.fromEntries(Object.entries(byAsc).map(([asc, amount]) => [asc, { STRENGTH_POWER: { [String(amount)]: n } }])),
  n_seen: n * Object.keys(byAsc).length,
  ...extra,
});
const boss = (moves: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({ rooms: { boss: 10 }, moves, ...extra });
const hallway = (moves: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({ rooms: { hallway: 10 }, moves, ...extra });
/** A power the monster is first seen with on turn 1, by ascension. */
const startPower = (byAsc: Record<string, number>, n = 5) => ({
  type: "Buff",
  n_fights: n,
  amount_at_first_sight_by_asc: Object.fromEntries(Object.entries(byAsc).map(([asc, amount]) => [asc, { [String(amount)]: n }])),
  turn_at_first_sight_by_asc: Object.fromEntries(Object.keys(byAsc).map((asc) => [asc, { "1": n }])),
});

// A8 -> A9 Strength a move gives itself: the bosses' 3 of 4 moves +1 (Vantom's Prepare unchanged), the hallway's 2 of 7.
// Every monster's 11 pairs: +5/11 on average (additive fits better: Nectar's 15 -> 16 is no x1.12).
const MONSTERS = {
  KIN_PRIEST: boss({ RITUAL_MOVE: strengthMove({ "8": 2, "9": 3 }) }),
  CRUSHER: boss({ ADAPT_MOVE: strengthMove({ "8": 2, "9": 3 }), GUARDED_STRIKE_MOVE: { block_gained: { "18": 9 }, block_gained_by_asc: { "8": { "18": 6 }, "9": { "18": 3 } }, n_seen: 9 } }),
  VANTOM: boss({ PREPARE_MOVE: strengthMove({ "8": 2, "9": 2 }) }),
  AEONGLASS: boss({ EBB_MOVE: { block_gained: { "33": 9 }, block_gained_by_asc: { "8": { "33": 6 }, "9": { "33": 3 } }, n_seen: 9 } }),
  LAGAVULIN_MATRIARCH: boss({ SLASH2_MOVE: { block_gained: { "14": 9 }, block_gained_by_asc: { "8": { "14": 6 }, "9": { "14": 3 } }, n_seen: 9 } }),
  NIBBIT: hallway({ HISS_MOVE: strengthMove({ "8": 2, "9": 3 }) }),
  BOWLBUG_NECTAR: hallway({ BUFF_MOVE: strengthMove({ "8": 15, "9": 16 }) }),
  FUZZY_WURM_CRAWLER: hallway({ INHALE: strengthMove({ "8": 7, "9": 7 }) }),
  CUBEX_CONSTRUCT: hallway({ CHARGE_UP_MOVE: strengthMove({ "8": 2, "9": 2 }) }),
  SLUDGE_SPINNER: hallway({ RAGE_MOVE: strengthMove({ "8": 3, "9": 3 }) }),
  WRIGGLER: hallway({ WRIGGLE_MOVE: strengthMove({ "8": 2, "9": 2 }) }),
  EXOSKELETON: hallway({ ENRAGE_MOVE: strengthMove({ "8": 2, "9": 2 }) }),
  // A boss never fought at A9: Strength +2 and block 20 at A8 only; a Strength 10 buff, A8 only.
  QUEEN: boss({
    BURN_BRIGHT_FOR_ME_MOVE: strengthMove({ "0": 2, "8": 2 }, 5, { block_gained: { "20": 10 }, block_gained_by_asc: { "0": { "20": 5 }, "8": { "20": 5 } }, turns_seen: { "1": 5 }, next: { BIG_BUFF_MOVE: 5 } }),
    BIG_BUFF_MOVE: strengthMove({ "8": 10 }, 5, { turns_seen: { "2": 5 }, next: { BEAM_MOVE: 5 } }),
    BEAM_MOVE: { damage_by_asc: { "8": { base_per_hit: { "10": 5 }, hits: { "1": 5 } }, "9": { base_per_hit: { "10": 1 }, hits: { "1": 1 } } }, next: { BURN_BRIGHT_FOR_ME_MOVE: 5 } },
    CURSE_MOVE: { player_powers_applied: { WEAK_POWER: { "2": 5 } }, player_powers_applied_by_asc: { "8": { WEAK_POWER: { "2": 5 } } }, n_seen: 5 },
  }),
  // Its own other buff measures it: Crush 3 -> 4 at A9, Plow logged at A8 only.
  CEREMONIAL_BEAST: boss({ CRUSH_MOVE: strengthMove({ "8": 3, "9": 4 }), PLOW_MOVE: strengthMove({ "8": 2 }) }),
  // A hallway monster never fought at A9: the hallway's +2/7.
  THE_LOST: hallway({ DEBILITATING_SMOG: strengthMove({ "8": 2 }) }),
  // Weak a move puts on us: unchanged A8 -> A9 wherever logged at both.
  SLUDGE_SPRAYER: hallway({ OIL_SPRAY_MOVE: { player_powers_applied: { WEAK_POWER: { "1": 9 } }, player_powers_applied_by_asc: { "8": { WEAK_POWER: { "1": 6 } }, "9": { WEAK_POWER: { "1": 3 } } }, n_seen: 9 } }),
  STOMPER: hallway({ STOMP_MOVE: { player_powers_applied: { WEAK_POWER: { "2": 9 } }, player_powers_applied_by_asc: { "8": { WEAK_POWER: { "2": 6 } }, "9": { WEAK_POWER: { "2": 3 } } }, n_seen: 9 } }),
  // Plating first seen at the start: 15 -> 19, 15 -> 18, 8 -> 9 (proportional fits better: x46/38).
  FROG_KNIGHT: { rooms: { elite: 5 }, powers: { PLATING_POWER: startPower({ "8": 15, "9": 19 }) } },
  SLUMBERING_BEETLE: { rooms: { hallway: 5 }, powers: { PLATING_POWER: startPower({ "8": 15, "9": 18 }) } },
  SEWER_CLAM: { rooms: { hallway: 5 }, powers: { PLATING_POWER: startPower({ "8": 8, "9": 9 }) } },
  ARMOURED: { rooms: { unknown_room: 5 }, powers: { PLATING_POWER: startPower({ "8": 30 }) } },
  // Galvanic 6 -> 8 on the Globe Head; a boss that starts with it, logged at A8 only.
  GLOBE_HEAD: { rooms: { hallway: 5 }, powers: { GALVANIC_POWER: startPower({ "8": 6, "9": 8 }) } },
  SPARKY: boss({ ZAP_MOVE: { damage_by_asc: { "8": { base_per_hit: { "9": 5 }, hits: { "1": 5 } } }, turns_seen: { "1": 5 }, next: { ZAP_MOVE: 5 } } }, { powers: { GALVANIC_POWER: startPower({ "8": 6 }), ARTIFACT_POWER: startPower({ "8": 2, "9": 2 }) } }),
  // Plow: 100 -> 110 on one monster; the Beast's 150 at A8 only, first seen on turn 2.
  PLOWER: { rooms: { hallway: 5 }, powers: { PLOW_POWER: startPower({ "8": 100, "9": 110 }) } },
  BEAST: boss({}, { powers: { PLOW_POWER: { ...startPower({ "8": 150 }), turn_at_first_sight_by_asc: { "8": { "2": 5 } } } } }),
} as unknown as Record<string, MonsterEntry>;

const at = (id: string, move: string, asc: number) => moveAmountAt(MONSTERS, id, MONSTERS[id]!.moves![move], "self", "STRENGTH_POWER", asc);

describe("an amount logged only at A8 gets the A9 estimate; a logged A9 amount is untouched", () => {
  it("a boss never fought at A9: the bosses' A8 -> A9 change (+3/4), not every monster's (+5/11), rounded", () => {
    expect(ascensionAmountChange(MONSTERS, "QUEEN", "self", "STRENGTH_POWER", 8, 9)).toMatchObject({ model: "add", basis: "room", room: "boss", n: 4 });
    expect(ascensionAmountChange(MONSTERS, "QUEEN", "self", "STRENGTH_POWER", 8, 9)!.delta).toBeCloseTo(3 / 4, 10);
    expect(at("QUEEN", "BURN_BRIGHT_FOR_ME_MOVE", 9)).toMatchObject({ value: 3, estimated: true, from: 8, logged: 2, reached: 9 });
    expect(selfGainAt(MONSTERS["QUEEN"]!.moves!["BURN_BRIGHT_FOR_ME_MOVE"], "STRENGTH_POWER", 9, { monsters: MONSTERS, monsterId: "QUEEN" })).toBe(3);
    // Without the monster: the nearest logged amount as logged (the reads before).
    expect(selfGainAt(MONSTERS["QUEEN"]!.moves!["BURN_BRIGHT_FOR_ME_MOVE"], "STRENGTH_POWER", 9)).toBe(2);
    expect(amountEstimateNote(at("QUEEN", "BURN_BRIGHT_FOR_ME_MOVE", 9)!, 9)).toBe("A9估: A8 2，A8→A9 +0.8（同类boss 4 例）");
  });

  it("logged at A8 and A9: as logged at each, never moved (Vantom's Prepare stays 2 at A9)", () => {
    expect(at("KIN_PRIEST", "RITUAL_MOVE", 9)).toMatchObject({ value: 3, estimated: false, from: 9 });
    expect(at("KIN_PRIEST", "RITUAL_MOVE", 8)).toMatchObject({ value: 2, estimated: false, from: 8 });
    expect(at("VANTOM", "PREPARE_MOVE", 9)).toMatchObject({ value: 2, estimated: false });
    expect(at("QUEEN", "BURN_BRIGHT_FOR_ME_MOVE", 8)).toMatchObject({ value: 2, estimated: false });
    // The rollout's table and the boss clock's reads too.
    expect(enemyTable("VANTOM", 9, MONSTERS as never, {})!.moves["PREPARE_MOVE"]).toMatchObject({ strength: 2 });
    expect(enemyTable("VANTOM", 9, MONSTERS as never, {})!.moves["PREPARE_MOVE"]!.estimated).toBeUndefined();
  });

  it("the monster's own other move when it has one at both (the Beast's Crush 3 -> 4 moves its Plow's +2)", () => {
    expect(ascensionAmountChange(MONSTERS, "CEREMONIAL_BEAST", "self", "STRENGTH_POWER", 8, 9)).toMatchObject({ basis: "own", n: 1, delta: 1 });
    expect(at("CEREMONIAL_BEAST", "PLOW_MOVE", 9)).toMatchObject({ value: 3, estimated: true, from: 8 });
  });

  it("a monster with no A9 sample and no room kind with enough pairs: every monster's change", () => {
    // The Lost (hallway): the hallway's 7 pairs +2/7 -> 2.
    expect(ascensionAmountChange(MONSTERS, "THE_LOST", "self", "STRENGTH_POWER", 8, 9)).toMatchObject({ basis: "room", room: "hallway", n: 7 });
    expect(at("THE_LOST", "DEBILITATING_SMOG", 9)).toMatchObject({ value: 2, estimated: true });
    // No room logged: every monster's 11 pairs, +5/11.
    const roomless = { ...MONSTERS, NOMAD: { moves: { HOWL_MOVE: strengthMove({ "8": 2 }) } } } as unknown as Record<string, MonsterEntry>;
    const change = ascensionAmountChange(roomless, "NOMAD", "self", "STRENGTH_POWER", 8, 9)!;
    expect(change).toMatchObject({ basis: "all", n: 11, model: "add" });
    expect(change.delta).toBeCloseTo(5 / 11, 10);
    expect(moveAmountAt(roomless, "NOMAD", roomless["NOMAD"]!.moves!["HOWL_MOVE"], "self", "STRENGTH_POWER", 9)).toMatchObject({ value: 2, estimated: true });
    // A room kind with fewer than 3 pairs falls back to every monster's: Plating on the unknown-room ARMOURED.
    expect(ascensionAmountChange(MONSTERS, "ARMOURED", "start", "PLATING_POWER", 8, 9)).toMatchObject({ basis: "all", n: 3 });
  });

  it("additive vs proportional, as every monster's pairs fit better", () => {
    // Strength: a boss's +10 buff at A8 is 10 + 3/4 -> 11 (additive), not 10 x 12/9 -> 13.
    expect(at("QUEEN", "BIG_BUFF_MOVE", 9)).toMatchObject({ value: 11, estimated: true });
    // Plating at the start: 15 -> 19, 15 -> 18, 8 -> 9 fit x46/38 better than +8/3: 30 -> 36 (additive would say 33).
    const plating = ascensionAmountChange(MONSTERS, "ARMOURED", "start", "PLATING_POWER", 8, 9)!;
    expect(plating.model).toBe("scale");
    expect(plating.ratio).toBeCloseTo(46 / 38, 10);
    expect(startAmountAt(MONSTERS, "ARMOURED", "PLATING_POWER", 9)).toMatchObject({ value: 36, estimated: true, from: 8, logged: 30 });
    // One pair fits both: additive (Galvanic 6 -> 8: +2).
    expect(ascensionAmountChange(MONSTERS, "SPARKY", "start", "GALVANIC_POWER", 8, 9)).toMatchObject({ model: "add", delta: 2, n: 1, basis: "all" });
  });

  it("A10 before any A10 sample: A8 moved by A8 -> A9, the A9 -> A10 step unmeasured (as damage)", () => {
    expect(chainedAmountChange(MONSTERS, "QUEEN", "self", "STRENGTH_POWER", 8, 10)).toMatchObject({ reached: 9 });
    const a10 = at("QUEEN", "BURN_BRIGHT_FOR_ME_MOVE", 10)!;
    expect(a10).toMatchObject({ value: 3, estimated: true, from: 8, reached: 9 });
    expect(amountEstimateNote(a10, 10)).toBe("A10估: A8 2，A8→A9 +0.8（同类boss 4 例），A9→A10 未测按不变");
    // Logged at A9: A9's at A10, marked, nothing measured past it.
    expect(at("KIN_PRIEST", "RITUAL_MOVE", 10)).toMatchObject({ value: 3, estimated: true, from: 9, steps: [] });
    // Nothing logged on the way down to A7: A8's as logged, marked.
    expect(at("QUEEN", "BIG_BUFF_MOVE", 7)).toMatchObject({ value: 10, estimated: true, from: 8, steps: [] });
  });

  it("ASC_AMOUNTS=off: the nearest logged amount as logged", () => {
    ascAmountOptions.enabled = false;
    try {
      expect(at("QUEEN", "BURN_BRIGHT_FOR_ME_MOVE", 9)).toMatchObject({ value: 2, estimated: true, steps: [] });
      expect(enemyTable("QUEEN", 9, MONSTERS as never, {})!.moves["BURN_BRIGHT_FOR_ME_MOVE"]!.strength).toBe(2);
    } finally {
      ascAmountOptions.enabled = true;
    }
  });
});

describe("every read of these amounts takes the estimate", () => {
  it("the rollout's move table: Strength and block estimated, the move marked; Weak (unchanged where measured) as logged", () => {
    const table = enemyTable("QUEEN", 9, MONSTERS as never, {})!;
    // Block: the bosses' blocks 33, 18, 14 did not move A8 -> A9 (3 pairs: the room kind's).
    expect(table.moves["BURN_BRIGHT_FOR_ME_MOVE"]).toMatchObject({ strength: 3, block: 20, estimated: true });
    expect(table.moves["BIG_BUFF_MOVE"]).toMatchObject({ strength: 11, estimated: true });
    expect(table.moves["CURSE_MOVE"]).toMatchObject({ playerPowers: { WEAK_POWER: 2 } });
    expect(playerPowersOf(MONSTERS["QUEEN"]!.moves!["CURSE_MOVE"]!, 9, { monsters: MONSTERS, monsterId: "QUEEN" })).toEqual({ playerPowers: { WEAK_POWER: 2 } });
    expect(enemyTable("QUEEN", 8, MONSTERS as never, {})!.moves["BURN_BRIGHT_FOR_ME_MOVE"]).toMatchObject({ strength: 2, block: 20 });
    expect(enemyTable("QUEEN", 8, MONSTERS as never, {})!.moves["BURN_BRIGHT_FOR_ME_MOVE"]!.estimated).toBeUndefined();
  });

  it("the damage by turn (boss clock) adds the estimated Strength, marked estimated", () => {
    // T1 Burn Bright (+3 at A9), T2 the big buff (+11), T3 Beam 10 + 14 (A8: 10 + 2 + 10).
    expect(monsterDamageByTurn("QUEEN", 9, 3, MONSTERS)).toEqual({ perTurn: [0, 0, 24], estimated: true });
    expect(monsterDamageByTurn("QUEEN", 8, 3, MONSTERS)).toEqual({ perTurn: [0, 0, 22], estimated: false });
  });

  it("the boss sim's synthetic start: a start power logged at A8 only is moved, one logged at A9 is not", () => {
    const db = { bosses: { SPARKY: { "8": { fights: 5, parts: { SPARKY: { median: 100, n: 5 } } } } }, encounters: {}, monsters: MONSTERS };
    const part = bossOpening("SPARKY_BOSS", 9, db as never)!.parts[0]!;
    expect(part.powers).toEqual({ GALVANIC_POWER: 8, ARTIFACT_POWER: 2 });
    expect(part.estimated).toEqual({ GALVANIC_POWER: "A9估: A8 6，A8→A9 +2（全体 1 例）" });
    expect(bossOpening("SPARKY_BOSS", 8, db as never)!.parts[0]).toMatchObject({ powers: { GALVANIC_POWER: 6, ARTIFACT_POWER: 2 } });
    expect(bossOpening("SPARKY_BOSS", 8, db as never)!.parts[0]!.estimated).toBeUndefined();
  });

  it("a stun threshold first seen later (the Beast's Plow) and a stacked power's schedule", () => {
    expect(shriekFromOf("BEAST", 9, MONSTERS as never)).toEqual({ amount: 160, turn: 2 });
    expect(shriekFromOf("BEAST", 8, MONSTERS as never)).toEqual({ amount: 150, turn: 2 });
    const giant = {
      ...MONSTERS,
      GIANT: {
        rooms: { boss: 5 },
        powers: { STEAM_ERUPTION_POWER: { amount_at_first_sight_by_asc: { "8": { "15": 5 } }, turn_at_first_sight_by_asc: { "8": { "2": 5 } } } },
        moves: { STOMP_MOVE: { turns_seen: { "2": 5 }, self_powers_gained: { STEAM_ERUPTION_POWER: { "3": 5 } }, self_powers_gained_by_asc: { "8": { STEAM_ERUPTION_POWER: { "3": 5 } } } } },
      },
      OTHER_GIANT: { rooms: { boss: 5 }, powers: { STEAM_ERUPTION_POWER: startPower({ "8": 15, "9": 20 }) } },
    } as unknown as Record<string, MonsterEntry>;
    expect(powerScheduleAt("GIANT", "STEAM_ERUPTION_POWER", 9, giant)).toMatchObject({ first: 20, perTurn: 3, asc: 8, exact: false, estimated: true });
  });

  it("the DB texts: the dossier's move line, the guide placeholders, the knowledge text", () => {
    setMonsterDbForTests({ bosses: { QUEEN: { "8": { fights: 5, parts: { QUEEN: { median: 400, n: 5 } } } } }, encounters: {}, monsters: MONSTERS } as never);
    try {
      expect(bossDossier("QUEEN_BOSS", 9)).toContain("+3力 (A9估: A8 2，A8→A9 +0.8（同类boss 4 例）)");
      expect(bossDossier("QUEEN_BOSS", 8)).toMatch(/\+2力(?! \()/);
      expect(fillDbNumbers("+{GAIN:QUEEN:BURN_BRIGHT_FOR_ME_MOVE:STRENGTH_POWER} 力，格挡 {BLOCK:QUEEN:BURN_BRIGHT_FOR_ME_MOVE}，{APPLIES:QUEEN:CURSE_MOVE:WEAK_POWER} 层虚弱", 9)).toBe("+≈3 力，格挡 ≈20，≈2 层虚弱");
      expect(fillDbNumbers("+{GAIN:QUEEN:BURN_BRIGHT_FOR_ME_MOVE:STRENGTH_POWER} 力，{POWER:SPARKY:GALVANIC_POWER}", 8)).toBe("+2 力，6");
      expect(fillDbNumbers("{POWER:SPARKY:GALVANIC_POWER}", 9)).toBe("≈8");
    } finally {
      setMonsterDbForTests(null);
    }
    const text = renderMonster("QUEEN", { ascension: 9, knowledgeDir: knowledgeCopy() });
    expect(text).toContain("（A8，非 A9；A9估: A8 2，A8→A9 +0.8（同类boss 4 例），估 +3）");
    expect(renderMonster("QUEEN", { ascension: 8, knowledgeDir: knowledgeCopy() })).not.toContain("估 +3");
  });
});

const GKB = join(dirname(fileURLToPath(import.meta.url)), "gkb-data", "knowledge");
const temps: string[] = [];
afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

/** tests/gkb-data's knowledge with these monsters in its monster DB. */
function knowledgeCopy(): string {
  const dir = mkdtempSync(join(tmpdir(), "asc-amounts-"));
  temps.push(dir);
  cpSync(GKB, dir, { recursive: true });
  const path = knowledgeFile(dir, "monster-db.json");
  const db = JSON.parse(readFileSync(path, "utf8")) as { monsters: Record<string, unknown> };
  db.monsters = { ...db.monsters, ...MONSTERS };
  writeFileSync(path, JSON.stringify(db));
  return dir;
}
