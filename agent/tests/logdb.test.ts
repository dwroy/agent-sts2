/**
 * The log database (docs/logdb.md): the Python suite for tools/logdb (tests/logdb_test.py: extractors, incremental
 * sync, views, query.py), and the logs_query tool (src/tools/logs-query.ts) against a fake query script and, when
 * the log database's Python environment (data/logdb-venv) exists, against the fixed sample in tests/logdb-data.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { LOGS_QUERY_MAX_ROWS, logsQueryTool, renderRows } from "../src/tools/logs-query.js";
import type { ToolContext } from "../src/tools/types.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "tests/logdb-data");
const VENV = join(ROOT, "..", "data/logdb-venv/bin/python");
const HAVE_VENV = existsSync(VENV);
const ctx: ToolContext = { ascension: 9, knowledgeDir: join(ROOT, "tests/gkb-data/knowledge"), logsDir: DATA };
const fake = (timeoutMs?: number) => logsQueryTool({ python: process.execPath, script: join(DATA, "fake-query.mjs"), dbDir: "/nowhere", ...(timeoutMs ? { timeoutMs } : {}) });

describe("tools/logdb (Python)", () => {
  it("passes tests/logdb_test.py (without the venv only the extractor tests run)", () => {
    const out = spawnSync(HAVE_VENV ? VENV : "python3", [join(ROOT, "tests/logdb_test.py")], { encoding: "utf8" });
    expect(out.status, out.stderr).toBe(0);
    expect(out.stderr).toMatch(/\nOK/);
  }, 120_000);
});

describe("logs_query tool", () => {
  it("has a schema the validator enforces, and describes the tables", async () => {
    const tool = fake();
    expect(tool.name).toBe("logs_query");
    for (const table of ["runs", "floors", "fights", "turns", "decisions", "llm_calls", "run_plans"]) expect(tool.description).toContain(table);
    expect((await tool.run({}, ctx)).text).toMatch(/缺少 sql/);
    expect((await tool.run({ sql: "   " }, ctx)).text).toMatch(/sql 是空的/);
    expect((await tool.run({ sql: "SELECT 1", max_rows: LOGS_QUERY_MAX_ROWS + 1 }, ctx)).text).toMatch(/max_rows 不能大于 200/);
    expect((await tool.run({ sql: "SELECT 1", limit: 3 }, ctx)).text).toMatch(/不认识的参数 limit/);
  });

  it("renders the rows as a table: nulls empty, lists as JSON, pipes escaped, long cells cut", async () => {
    const result = await fake().run({ sql: "SELECT 1" }, ctx);
    expect(result.isError).toBeFalsy();
    const lines = result.text.split("\n");
    expect(lines[0]).toBe("（2 行；7 ms）");
    expect(lines[1]).toBe("| n | text | flag | list | obj |");
    expect(lines[3]).toBe('| 1 | a\\|b c |  | ["X","Y"] | {"k":1} |');
    expect(lines[4]).toContain(`| 2 | ${"x".repeat(199)}… | true | [] |  |`);
    expect((await fake().run({ sql: "SELECT many" }, ctx)).text.split("\n")[0]).toMatch(/结果不止这些/);
  });

  it("asks query.py for JSON, no sync, the row cap and a timeout, with no keys in its environment", async () => {
    const args = JSON.parse((await fake().run({ sql: "args", max_rows: 5 }, ctx)).text.replace(/^查询失败：/, "")) as string[];
    expect(args).toEqual(["--json", "--no-sync", "--db", "/nowhere", "--max-rows", "5", "--timeout", "28", "--", "args"]);
    const defaults = JSON.parse((await fake().run({ sql: "args" }, ctx)).text.replace(/^查询失败：/, "")) as string[];
    expect(defaults[defaults.indexOf("--max-rows") + 1]).toBe("50");
    process.env["FAKE_TEST_API_KEY"] = "not-a-key";
    try {
      const env = (await fake().run({ sql: "env" }, ctx)).text;
      expect(env).not.toContain("FAKE_TEST_API_KEY");
      expect(env).toContain("PATH");
    } finally {
      delete process.env["FAKE_TEST_API_KEY"];
    }
  });

  it("turns failures into isError with the reason", async () => {
    expect(await fake().run({ sql: "SELECT boom" }, ctx)).toEqual({ text: "查询失败：BinderException: column boom not found", isError: true });
    expect((await fake().run({ sql: "garbage" }, ctx)).text).toMatch(/输出读不懂/);
    expect((await fake().run({ sql: "crash" }, ctx)).text).toMatch(/查询失败：Traceback/);
    const missing = await logsQueryTool({ python: "/nowhere/python", dbDir: "/nowhere" }).run({ sql: "SELECT 1" }, ctx);
    expect(missing).toMatchObject({ isError: true });
    expect(missing.text).toMatch(/Python 环境不存在/);
    const slow = await fake(1000).run({ sql: "sleep" }, ctx);
    expect(slow).toMatchObject({ isError: true });
    expect(slow.text).toMatch(/查询超时/);
  }, 20_000);

  it("cuts a table that would flood the context to whole rows", () => {
    const rows = Array.from({ length: 200 }, (_, i) => [i, "y".repeat(190), "z".repeat(190)]);
    const text = renderRows({ columns: ["i", "a", "b"], rows, row_count: 200, truncated: false, ms: 1 });
    expect(text.length).toBeLessThanOrEqual(40_000 + 200);
    expect(text.split("\n")[0]).toMatch(/表太长，只显示前 \d+ 行/);
  });
});

describe.skipIf(!HAVE_VENV)("logs_query on the sample logs (needs .cache/logdb-venv)", () => {
  let db = "";
  beforeAll(() => {
    db = mkdtempSync(join(tmpdir(), "logs-query-"));
    execFileSync(VENV, [join(ROOT, "tools/logdb/sync.py"), "--logs", DATA, "--db", db, "--quiet"]);
  }, 60_000);
  afterAll(() => rmSync(db, { recursive: true, force: true }));

  it("answers SQL over the derived tables", async () => {
    const tool = logsQueryTool({ dbDir: db });
    const fights = await tool.run({ sql: "SELECT run_id, encounter, room, outcome, entry_hp FROM fights ORDER BY run_id, fight_no" }, ctx);
    expect(fights.isError, fights.text).toBeFalsy();
    expect(fights.text).toContain("| RUNA00000001 | NIBBIT+NIBBIT | hallway | won | 80 |");
    expect(fights.text).toContain("| RUNA00000001 | TERROR_EEL | elite | died | 79 |");
    const runs = await tool.run({ sql: "SELECT count(*) AS runs, count(*) FILTER (WHERE finished) AS finished FROM runs" }, ctx);
    expect(runs.text).toContain("| 2 | 1 |");
    const capped = await tool.run({ sql: "SELECT off FROM frames", max_rows: 3 }, ctx);
    expect(capped.text.split("\n")[0]).toMatch(/^（3 行；\d+ ms；结果不止这些/);
  }, 30_000);

  it("refuses writes and files outside the database", async () => {
    const tool = logsQueryTool({ dbDir: db });
    const write = await tool.run({ sql: "DELETE FROM frames" }, ctx);
    expect(write).toMatchObject({ isError: true });
    expect(write.text).toMatch(/read-only/);
    const outside = await tool.run({ sql: `SELECT * FROM read_text('${join(DATA, "runs.jsonl")}')` }, ctx);
    expect(outside).toMatchObject({ isError: true });
    expect(outside.text).toMatch(/Permission|disabled/);
  }, 30_000);
});
