/**
 * The boss-damage and calibration extracts (knowledge/builders/build-boss-damage.py, tools/boss-fights-extract.py) on a
 * fixture logs dir: a won run ends on the final boss's floor, so its boss fight is a win (runs.jsonl
 * `victory`), not a death with every HP left booked as lost (review 2026-09-29 #8).
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(tmpdir(), "boss-damage-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** One combat frame against the Queen at F48, compact JSON as the logger writes it (the tools grep for `"enemy_id":"QUEEN"`). */
function frame(runId: string, turn: number, hp: number, shown: number, queenHp: number): string {
  const state = {
    run_id: runId,
    turn,
    in_combat: true,
    run: { floor: 48, ascension: 8, boss_id: "QUEEN_BOSS" },
    combat: {
      player: { current_hp: hp },
      enemies: [{ enemy_id: "QUEEN", is_alive: true, current_hp: queenHp, max_hp: 419, powers: [], intents: [{ damage: shown, hits: 1 }] }],
    },
  };
  return JSON.stringify({ ts: `2026-09-29T00:00:0${turn}Z`, screen: "COMBAT", state });
}

// WIN1 won the run on F48 (65 HP left); DIE1 died there.
writeFileSync(
  join(dir, "runs.jsonl"),
  [{ run_id: "WIN1", floor: 48, victory: true, ascension: 8 }, { run_id: "DIE1", floor: 48, victory: false, ascension: 8 }].map((run) => JSON.stringify(run)).join("\n") + "\n",
);
writeFileSync(
  join(dir, "states.jsonl"),
  [frame("WIN1", 1, 70, 10, 419), frame("WIN1", 2, 65, 10, 200), frame("DIE1", 1, 50, 30, 419), frame("DIE1", 2, 20, 30, 300)].join("\n") + "\n",
);

describe("build-boss-damage.py: the final boss won is a win", () => {
  it("the won run's last turn is not booked as a death; the fight row says won with the HP it kept", () => {
    const out = join(dir, "boss-damage.json");
    const fights = join(dir, "fights.jsonl");
    execFileSync("python3", [join(ROOT, "..", "knowledge/builders/build-boss-damage.py"), "--logs", dir, "--out", out, "--fights", fights], { encoding: "utf8" });
    const rows = readFileSync(fights, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(rows.find((row) => row["key"] === "WIN1")).toMatchObject({ outcome: "won", final_hp: 65, loss_per_turn: 2.5 });
    expect(rows.find((row) => row["key"] === "DIE1")).toMatchObject({ outcome: "died", final_hp: 0 });
    // Shown 10 (WIN1 T1) + 30 + 30 (DIE1); lost 5 + 30 + 20. The won run's 65 HP left is not a loss.
    const queen = (JSON.parse(readFileSync(out, "utf8")) as Record<string, { hp_lost: number; shown: number; unblocked_share: number }>)["QUEEN"]!;
    expect(queen).toMatchObject({ shown: 70, hp_lost: 55, unblocked_share: 0.786 });
  });
});

describe("boss-fights-extract.py: the final boss won is a win", () => {
  it("outcome won, the whole max HP dealt", () => {
    const out = execFileSync("python3", [join(ROOT, "tools/boss-fights-extract.py"), "QUEEN", "--asc", "8", "--logs", dir], { encoding: "utf8" });
    const rows = out.trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(rows.find((row) => row["key"] === "WIN1")).toMatchObject({ outcome: "won", realised: 209.5 });
    expect(rows.find((row) => row["key"] === "DIE1")).toMatchObject({ outcome: "died", realised: 59.5 });
  });
});
