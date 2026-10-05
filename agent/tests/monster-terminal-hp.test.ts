/** CSBR5CRDWQNB F17 T9; ledger silent-0040. Fixed snapshots, no model or network calls. */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("monster records include closing combat HP without erasing pre-heal loss", () => {
  const result = spawnSync("python3", ["-B", fileURLToPath(new URL("./monster_terminal_hp_test.py", import.meta.url))], { encoding: "utf8" });
  expect(result.status, result.stdout + result.stderr).toBe(0);
});
