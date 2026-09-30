/**
 * Knowledge check 2026-09-30 (the A8 window's runs 1-11: RRMY 5LRZ 5PHF UNRL YVYZ Q8XR 3RME NH8A 2WRU 79YR 86C3; Dai's
 * rule: the guide, the handbook, Jev's hints, the card tiers, the boss notes and the experience base are one
 * knowledge base; where our data says otherwise, the data's version with its n; counts filled from the data).
 * See paper/materials/experience-changelog.md「第九次增量」.
 *
 * tools/build-boss-damage.py: QUEEN.amalgam (when the Torch Head Amalgam died while the Queen lived; the HP each lost
 * by turn 3) and THE_INSATIABLE.deaths (a lost fight's death line from its last frame).
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

/** The rows as tools/build-boss-damage.py writes them (strategy/boss-clock.ts QueenFightRow, SandpitFightRow). */
interface QueenFightRow { run: string; won: boolean; killed_turn: number | null; t12_queen: number; t12_amalgam: number }
interface SandpitFightRow { run: string; won: boolean; death: string | null }

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("build-boss-damage.py: the Queen's Amalgam and the Insatiable's death line", () => {
  const dir = mkdtempSync(join(tmpdir(), "boss-a8window-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const frame = (runId: string, floor: number, turn: number, player: { hp: number; block?: number }, enemies: Record<string, unknown>[], ts: number): string =>
    JSON.stringify({
      ts: `2026-09-30T00:00:${String(ts).padStart(2, "0")}Z`,
      screen: "COMBAT",
      state: { run_id: runId, turn, in_combat: true, run: { floor, ascension: 8 }, combat: { player: { current_hp: player.hp, max_hp: 80, block: player.block ?? 0 }, enemies } },
    });
  const q = (hp: number) => ({ enemy_id: "QUEEN", is_alive: hp > 0, current_hp: hp, max_hp: 419, powers: [], intents: [] });
  const a = (hp: number) => ({ enemy_id: "TORCH_HEAD_AMALGAM", is_alive: hp > 0, current_hp: hp, max_hp: 211, powers: [], intents: [{ damage: 10, hits: 1 }] });
  const worm = (sandpit: number, attack: number) => ({ enemy_id: "THE_INSATIABLE", is_alive: true, current_hp: 300, max_hp: 341, powers: [{ power_id: "SANDPIT_POWER", amount: sandpit }], intents: [{ damage: attack, hits: 1 }] });
  writeFileSync(
    join(dir, "runs.jsonl"),
    [
      { run_id: "QWIN", floor: 48, victory: true, ascension: 8 },
      { run_id: "QDIE", floor: 48, victory: false, ascension: 8 },
      { run_id: "SHP1", floor: 33, victory: false, ascension: 8 },
      { run_id: "SPIT", floor: 33, victory: false, ascension: 8 },
      { run_id: "SBTH", floor: 33, victory: false, ascension: 8 },
      { run_id: "SWIN", floor: 40, victory: false, ascension: 8 },
    ].map((run) => JSON.stringify(run)).join("\n") + "\n",
  );
  writeFileSync(
    join(dir, "states.jsonl"),
    [
      // QWIN: turns 1-2 into the Amalgam (111 vs 19), killed on T3 while the Queen lives.
      frame("QWIN", 48, 1, { hp: 80 }, [q(419), a(211)], 1),
      frame("QWIN", 48, 2, { hp: 75 }, [q(410), a(150)], 2),
      frame("QWIN", 48, 3, { hp: 70 }, [q(400), a(100)], 3),
      frame("QWIN", 48, 3, { hp: 70 }, [q(400), a(0)], 4),
      // QDIE: turns 1-2 into the Queen; the Amalgam lives to the end.
      frame("QDIE", 48, 1, { hp: 80 }, [q(419), a(211)], 5),
      frame("QDIE", 48, 3, { hp: 40 }, [q(300), a(200)], 6),
      // SHP1: the Sandpit at 3 on the last frame: died on HP.
      frame("SHP1", 33, 1, { hp: 60 }, [worm(4, 0)], 7),
      frame("SHP1", 33, 2, { hp: 5 }, [worm(3, 30)], 8),
      // SPIT: the Sandpit at 1, HP and block over the attack: eaten.
      frame("SPIT", 33, 1, { hp: 60 }, [worm(4, 0)], 9),
      frame("SPIT", 33, 4, { hp: 30, block: 10 }, [worm(1, 20)], 10),
      // SBTH: the Sandpit at 1 and the attack enough to kill too.
      frame("SBTH", 33, 1, { hp: 60 }, [worm(4, 0)], 11),
      frame("SBTH", 33, 4, { hp: 5 }, [worm(1, 20)], 12),
      // SWIN: won.
      frame("SWIN", 33, 1, { hp: 60 }, [worm(4, 0)], 13),
    ].join("\n") + "\n",
  );

  it("QUEEN.amalgam and THE_INSATIABLE.deaths by ascension", () => {
    const out = join(dir, "boss-damage.json");
    execFileSync("python3", [join(ROOT, "tools/build-boss-damage.py"), "--logs", dir, "--out", out], { encoding: "utf8" });
    const data = JSON.parse(readFileSync(out, "utf8")) as Record<string, { amalgam?: Record<string, QueenFightRow[]>; deaths?: Record<string, SandpitFightRow[]> }>;
    expect(data["QUEEN"]!.amalgam!["8"]).toEqual([
      { run: "QDIE", won: false, killed_turn: null, t12_queen: 119, t12_amalgam: 11 },
      { run: "QWIN", won: true, killed_turn: 3, t12_queen: 19, t12_amalgam: 111 },
    ]);
    expect(Object.fromEntries(data["THE_INSATIABLE"]!.deaths!["8"]!.map((row) => [row.run, row.death]))).toEqual({ SHP1: "hp", SPIT: "sandpit", SBTH: "both", SWIN: null });
  });
});
