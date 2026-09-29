/**
 * The evaluator (docs/eval.md): the Python suite for tools/eval/metrics.py (tests/eval_metrics_test.py: each metric's
 * algorithm on fixed samples; with the log database's Python environment also the whole path on tests/eval-data),
 * and the Strength-source ids it takes from the deck profile's own test (tools/eval/strength-sources.ts).
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { strengthSourceIds } from "../src/project/deck-profile.js";
import { loggedKnowledge } from "./logged.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VENV = join(ROOT, ".cache/logdb-venv/bin/python");
const HAVE_VENV = existsSync(VENV);

describe("tools/eval (Python)", () => {
  it("passes tests/eval_metrics_test.py (without the venv only the algorithm tests run)", () => {
    const out = spawnSync(HAVE_VENV ? VENV : "python3", [join(ROOT, "tests/eval_metrics_test.py")], { encoding: "utf8" });
    expect(out.status, out.stderr).toBe(0);
    expect(out.stderr).toMatch(/\nOK/);
  }, 120_000);
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
