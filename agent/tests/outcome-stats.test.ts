/**
 * The outcome-stats layer: knowledge/builders/build-outcome-stats.py (self-test on synthetic logs: one table per ascension from A8 up,
 * A8's table what the whole file was before) and the shape of its output.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("outcome stats", () => {
  it("the generator passes its self-test on synthetic states/decisions/runs logs", () => {
    const out = execFileSync("python3", [join(ROOT, "..", "knowledge/builders/build-outcome-stats.py"), "--self-test"], { encoding: "utf8" });
    expect(out).toContain("self-test ok");
  });

  it("outcome-stats.json carries n on every row and marks n<5 as low-n (each ascension's table, or the older one-table file)", () => {
    type Table = {
      baseline: { runs: number };
      cards: Record<string, { by_act: Record<string, Record<string, { n: number; low_n?: boolean }>> }>;
      relics: Record<string, { by_act: Record<string, { n: number; low_n?: boolean }> }>;
      events: Record<string, { options: Record<string, { n: number; low_n?: boolean }> }>;
      rest: Record<string, Record<string, { n: number; low_n?: boolean }>>;
    };
    const file = JSON.parse(readFileSync(join(ROOT, "..", "knowledge/characters/ironclad/outcome-stats.json"), "utf8")) as Table & { by_ascension?: Record<string, Table> };
    const tables = file.by_ascension ? Object.values(file.by_ascension) : [file];
    expect(tables.length).toBeGreaterThan(0);
    for (const stats of tables) expect(stats.baseline.runs).toBeGreaterThan(0);
    const rows = tables.flatMap((stats) => [
      ...Object.values(stats.cards).flatMap((card) => Object.values(card.by_act).flatMap((act) => Object.values(act))),
      ...Object.values(stats.relics).flatMap((relic) => Object.values(relic.by_act)),
      ...Object.values(stats.events).flatMap((event) => Object.values(event.options)),
      ...Object.values(stats.rest).flatMap((bands) => Object.values(bands)),
    ]);
    expect(rows.length).toBeGreaterThan(100);
    for (const row of rows) {
      expect(row.n).toBeGreaterThan(0);
      expect(row.low_n === true).toBe(row.n < 5);
    }
  });
});
