/** T082DRCUHRRD F48 T1-11 / C48LLXBGKXQ9 F17 T1-19; ledger silent-0040. */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("boss statistics keep the final SL attempt's turns and metadata together", () => {
  const result = spawnSync("python3", ["-B", fileURLToPath(new URL("./boss_damage_attempts_test.py", import.meta.url))], { encoding: "utf8" });
  expect(result.status, result.stdout + result.stderr).toBe(0);
});
