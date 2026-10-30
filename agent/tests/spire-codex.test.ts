import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("passes the fixed Spire Codex download, privacy, attempt and DuckDB fixtures", () => {
  const python = resolve("../data/logdb-venv/bin/python");
  expect(existsSync(python), "the existing logdb DuckDB environment is required").toBe(true);
  const result = spawnSync(python, ["-B", "../eval/tests/test_spire_codex.py"], {
    encoding: "utf8", timeout: 60_000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toMatch(/\nOK\s*$/);
}, 65_000);
