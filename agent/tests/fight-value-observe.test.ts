/**
 * knowledge/builders/build-fight-value.py: the Python suite tests/fight_value_observe_test.py (the observe_combat wrapper takes and
 * passes the piles build-monster-db feeds; a narrower wrapper killed the fight-value refresh, V4 ops 2026-09-30).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("build-fight-value.py observe wrapper", () => {
  it("passes tests/fight_value_observe_test.py", () => {
    const out = spawnSync("python3", [join(ROOT, "tests/fight_value_observe_test.py")], { encoding: "utf8" });
    expect(out.status, out.stderr).toBe(0);
  });
});
