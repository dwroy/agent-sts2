/**
 * Monster DB (knowledge/builders/build-monster-db.py -> knowledge/common/monster-db.json): data only, nothing in src/ reads
 * it yet. The parser is checked on a tiny synthetic states sample (the script's --self-test: fight
 * segmentation, enemy identity across index shifts, base damage without Strength, powers a move applies,
 * HP loss net of Burning Blood, deaths, minions); the committed file is checked for its shape and for
 * the boss numbers the logs pin down.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

interface Dist {
  min: number;
  median: number;
  max: number;
  n: number;
}
interface MonsterEntry {
  kind: string | null;
  hp_by_asc: Record<string, Dist>;
  moves: Record<string, { n_seen: number; next: Record<string, number> }>;
  threat_by_asc: Record<string, { fights: number; n_outcome_known: number; death_runs: string[] }>;
  provenance: { n_runs: number; n_instances: number };
}
interface MonsterDb {
  meta: { generated_from: { fights: number } };
  bosses: Record<string, Record<string, { fights: number; parts: Record<string, Dist>; start_hp_total: Dist }>>;
  encounters: Record<string, unknown>;
  monsters: Record<string, MonsterEntry>;
}

describe("monster db generator", () => {
  it("passes its self-test on a synthetic states sample", () => {
    const out = execFileSync("python3", [join(ROOT, "..", "knowledge/builders/build-monster-db.py"), "--self-test"], { encoding: "utf8" });
    expect(out).toContain("self-test ok");
  });
});

describe("committed monster-db.json", () => {
  const db = JSON.parse(readFileSync(join(ROOT, "..", "knowledge/common/monster-db.json"), "utf8")) as MonsterDb;

  it("has monsters, bosses and encounters with sample sizes", () => {
    expect(Object.keys(db.monsters).length).toBeGreaterThan(50);
    expect(Object.keys(db.encounters).length).toBeGreaterThan(50);
    expect(db.meta.generated_from.fights).toBeGreaterThan(1000);
    for (const monster of Object.values(db.monsters)) {
      expect(monster.provenance.n_instances).toBeGreaterThan(0);
      for (const hp of Object.values(monster.hp_by_asc)) {
        expect(hp.n).toBeGreaterThan(0);
        expect(hp.min).toBeLessThanOrEqual(hp.max);
      }
    }
  });

  it("pins the logged A8 boss HP (Kaiser Crab claws, Kin priest and followers, Queen and Amalgam)", () => {
    const crab = db.bosses["KAISER_CRAB"]?.["8"];
    expect(crab?.parts["CRUSHER"]?.median).toBe(219);
    expect(crab?.parts["ROCKET"]?.median).toBe(209);
    expect(db.bosses["THE_KIN"]?.["8"]?.parts["KIN_PRIEST"]?.median).toBe(199);
    expect(db.bosses["QUEEN"]?.["8"]?.parts["TORCH_HEAD_AMALGAM"]?.median).toBe(211);
    expect(db.monsters["VANTOM"]?.hp_by_asc["8"]?.median).toBe(183);
  });

  it("keeps the Kin priest's cycle once enemies are tracked across index shifts", () => {
    const beam = db.monsters["KIN_PRIEST"]?.moves["BEAM_MOVE"];
    expect(Object.keys(beam?.next ?? {})).toEqual(["RITUAL_MOVE"]);
    expect(db.monsters["KIN_FOLLOWER"]?.kind).toBe("minion");
  });
});
