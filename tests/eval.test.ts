/**
 * The evaluator (docs/eval.md): the Python suites for tools/eval/metrics.py (tests/eval_metrics_test.py: each metric's
 * algorithm on fixed samples; with the log database's Python environment also the whole path on tests/eval-data) and
 * tools/eval/calibration.py (tests/eval_calibration_test.py: predictions against what happened, on tests/calibration-data),
 * the Strength-source ids it takes from the deck profile's own test (tools/eval/strength-sources.ts), and the boss clock
 * the calibration recomputes (tools/eval/boss-clock-recompute.ts: the unchanged bossClock on a logged board).
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import { strengthSourceIds } from "../src/project/deck-profile.js";
import { bossClock, deckEstimate, deckProfileForBoss } from "../src/strategy/boss-clock.js";
import { logged, loggedKnowledge } from "./logged.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VENV = join(ROOT, ".cache/logdb-venv/bin/python");
const HAVE_VENV = existsSync(VENV);

describe("tools/eval (Python)", () => {
  it("passes tests/eval_metrics_test.py (without the venv only the algorithm tests run)", () => {
    const out = spawnSync(HAVE_VENV ? VENV : "python3", [join(ROOT, "tests/eval_metrics_test.py")], { encoding: "utf8" });
    expect(out.status, out.stderr).toBe(0);
    expect(out.stderr).toMatch(/\nOK/);
  }, 120_000);

  it("passes tests/eval_calibration_test.py (without the venv only the algorithm tests run)", () => {
    const out = spawnSync(HAVE_VENV ? VENV : "python3", [join(ROOT, "tests/eval_calibration_test.py")], { encoding: "utf8" });
    expect(out.status, out.stderr).toBe(0);
    expect(out.stderr).toMatch(/\nOK/);
  }, 120_000);
});

describe("tools/eval/boss-clock-recompute.ts", () => {
  const run = (input: string) =>
    spawnSync(process.execPath, [join(ROOT, "node_modules/tsx/dist/cli.mjs"), join(ROOT, "tools/eval/boss-clock-recompute.ts"), join(ROOT, "tests/logged-states/game-data.json")], {
      cwd: ROOT,
      encoding: "utf8",
      input,
    });

  it("prints the unchanged bossClock of each logged board, at the HP given, and the estimate at the real length", () => {
    const board = logged("yg3h-f33-t1").state;
    const out = run(`${JSON.stringify({ key: "YG3H#1", entry_hp: 52, turns: 8, state: board })}\n${JSON.stringify({ key: "NO_BOSS", entry_hp: 50, state: { ...board, run: { ...(board["run"] as object), boss_id: "NOBODY" } } })}\n`);
    expect(out.status, out.stderr).toBe(0);
    const [row, none] = out.stdout.trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
    const state = parseGameState(board);
    const clock = bossClock(state, loggedKnowledge, 52)!;
    expect(row).toMatchObject({ key: "YG3H#1", boss: clock.boss, entry_hp: 52, deck: clock.deck, need: clock.need, gap: clock.gap, hp: clock.hp, fight_turns: clock.fightTurns, survivable_turns: clock.survivableTurns, loss_per_turn: clock.lossPerTurn });
    expect(row!["deck_at_turns"]).toBe(deckEstimate(deckProfileForBoss(state, loggedKnowledge)!, String((board["run"] as Record<string, unknown>)["boss_id"]), 8));
    expect(none).toEqual({ key: "NO_BOSS", error: "no clock for this boss id" });
  }, 60_000);
});

describe("Strength sources for the evaluator", () => {
  it("lists the cards and relics whose game-data text gives lasting Strength, as the deck profile reads them", () => {
    const ids = strengthSourceIds(loggedKnowledge);
    for (const card of ["INFLAME", "FIGHT_ME", "DEMON_FORM", "RUPTURE"]) expect(ids.cards).toContain(card);
    for (const card of ["SETUP_STRIKE", "STRIKE_IRONCLAD", "BASH", "LIMIT_BREAK"]) expect(ids.cards).not.toContain(card);
    for (const relic of ["VAJRA", "BRIMSTONE", "TOASTY_MITTENS", "SPARKLING_ROUGE"]) expect(ids.relics).toContain(relic);
    for (const relic of ["BURNING_BLOOD", "PHILOSOPHERS_STONE"]) expect(ids.relics).not.toContain(relic);
    expect([...ids.cards].sort()).toEqual(ids.cards);
  });

  it("tools/eval/strength-sources.ts prints the same ids as JSON", () => {
    const out = execFileSync(process.execPath, [join(ROOT, "node_modules/tsx/dist/cli.mjs"), join(ROOT, "tools/eval/strength-sources.ts"), join(ROOT, "tests/logged-states/game-data.json")], { cwd: ROOT, encoding: "utf8" });
    const printed = JSON.parse(out) as { cards: string[]; relics: string[] };
    const ids = strengthSourceIds(loggedKnowledge);
    expect({ cards: printed.cards, relics: printed.relics }).toEqual(ids);
    const missing = spawnSync(process.execPath, [join(ROOT, "node_modules/tsx/dist/cli.mjs"), join(ROOT, "tools/eval/strength-sources.ts"), join(ROOT, "tests/eval-data/strength-sets.json")], { cwd: ROOT, encoding: "utf8" });
    expect(missing.status).not.toBe(0);
  }, 60_000);
});
