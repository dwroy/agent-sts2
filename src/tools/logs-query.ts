/**
 * logs_query: read-only SQL over the log database (docs/logdb.md) for the brain and the offline learner.
 *
 * The database is DuckDB over Parquet shards derived from logs/*.jsonl (tools/logdb/sync.py). The tool runs
 * `tools/logdb/query.py --json --no-sync` in the log database's Python environment (.cache/logdb-venv): one
 * statement, checked read-only there, with a row cap and a timeout, and renders the rows as a text table. It
 * never syncs (the post-run hook and query.py do that), so a call costs one short query.
 */

import { execFile } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ToolDef, ToolResult } from "./types.js";
import { validateInput } from "./validate.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const LOGS_QUERY_DEFAULT_ROWS = 50;
export const LOGS_QUERY_MAX_ROWS = 200;
const DEFAULT_TIMEOUT_MS = 30_000;
/** Cells longer than this are cut (rationales, lists). */
const CELL_CAP = 200;
/** The whole table is cut to this many characters (whole rows), so one call cannot flood the context. */
const TEXT_CAP = 40_000;

export interface LogsQueryOptions {
  /** Python with duckdb: LOGDB_PYTHON, else <repo>/.cache/logdb-venv/bin/python. */
  python?: string;
  /** Default <repo>/tools/logdb/query.py. */
  script?: string;
  /** Database directory: LOGDB_DIR, else <repo>/.cache/logdb. */
  dbDir?: string;
  timeoutMs?: number;
}

interface QueryOutput {
  columns?: string[];
  rows?: unknown[][];
  row_count?: number;
  truncated?: boolean;
  ms?: number;
  error?: string;
}

const DESCRIPTION = [
  "用一条只读 SQL（DuckDB 方言）查对局日志库：从 logs/*.jsonl 派生，覆盖全部对局，适合按条件统计、找具体局面、核对经验。",
  `结果最多 ${LOGS_QUERY_MAX_ROWS} 行（默认 ${LOGS_QUERY_DEFAULT_ROWS}），请用 WHERE / GROUP BY / LIMIT 缩小；超时 30 秒。主要的表：`,
  "runs 每局（run_id, ascension, character, started, ended, floor 终层, finished, victory 胜负看它不看层数, death_fight 致死怪物中文名列表, death_encounter, death_room, code 代码版本, brain_label 大脑引擎和模型, knowledge_prefix 知识前缀 off/full，V4 对局起才有）；",
  "floors 每层（run_id, floor, act, room_node = Monster/Elite/Boss/Unknown/RestSite/Shop/Treasure/Ancient, entry_hp, entry_max_hp, exit_hp, hp_loss 进房减出房血量（负=回血）, entry_gold, exit_deck_size, exit_potions, died）；",
  "fights 每场战斗（run_id, fight_no, ascension, act, floor, encounter 如 CORPSE_SLUG+CORPSE_SLUG, monsters 列表, room = hallway/elite/boss/unknown_room, entry_hp, max_hp, turns, outcome = won/died, hp_loss 战内掉血, net_hp_loss 含战后回血, potions_in 带进场的药水, potions_used 喝掉的药水, cards_played, deck_size, relics）；",
  "turns 每回合（run_id, fight_no, floor, encounter, turn, start_hp, start_block, intent_damage 敌人意图总伤害, enemies_alive, enemy_hp, hp_lost 到下回合开始的掉血, cards_played 出牌 id 列表, potions_used）；",
  "decisions 每个决策（ts, run_id, floor, turn, label 如 reward/card、combat/plan-choice, decider = jev/code/code-fallback 或答题的大脑引擎 deepseek/codex（兜底答的如 deepseek (for codex)；2026-10-03 前大脑的都记作 deepseek）, action, card_id, options, choice, confidence, rollout_best, rollout_tied, rollout_best_chosen, ds_choice, escalated, hp, gold, rationale）；",
  "llm_calls 每次模型调用（ts, run_id, label, engine, model, effort, input_tokens, cache_hit_tokens, output_tokens, reasoning_tokens, latency_ms, primary_ms 首选引擎失败那次的耗时（只在兜底答的那行，这题总耗时 = latency_ms + primary_ms）, question_id, choice, reason, duplicate 为真是 brain.jsonl 重记的同一次 DeepSeek 调用、计数时去掉；问题和推理原文不在库里）；",
  "run_plans 整局计划（ts, run_id, floor, trigger, archetype, summary, want, avoid）；",
  "run_config 每局开局时的配置（run_id, code, branch, brain_engine, brain_by_prefix, brain_label, knowledge_prefix, prefix_sha, jev_model, jev_context, target_ascension, config_sha）。",
  "列表列用 list_contains(monsters, 'X')、len(x)、unnest(x)；时间是 UTC。完整字段见 docs/logdb.md。",
].join("");

function defaults(options: LogsQueryOptions): Required<LogsQueryOptions> {
  return {
    python: options.python ?? process.env["LOGDB_PYTHON"] ?? join(REPO, ".cache/logdb-venv/bin/python"),
    script: options.script ?? join(REPO, "tools/logdb/query.py"),
    dbDir: options.dbDir ?? process.env["LOGDB_DIR"] ?? join(REPO, ".cache/logdb"),
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : JSON.stringify(value);
  const flat = text.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
  return flat.length <= CELL_CAP ? flat : `${flat.slice(0, CELL_CAP - 1)}…`;
}

/** The rows as a markdown table with a one-line header (row count, time, whether rows were cut). */
export function renderRows(out: QueryOutput): string {
  const columns = out.columns ?? [];
  const rows = out.rows ?? [];
  const lines = [`| ${columns.join(" | ")} |`, `|${"---|".repeat(columns.length)}`];
  let shown = 0;
  let size = lines[0]!.length + lines[1]!.length;
  for (const row of rows) {
    const line = `| ${row.map(cellText).join(" | ")} |`;
    if (size + line.length > TEXT_CAP) break;
    lines.push(line);
    size += line.length + 1;
    shown += 1;
  }
  const notes = [`${shown} 行`, `${out.ms ?? "?"} ms`];
  if (out.truncated) notes.push(`结果不止这些（只取了前 ${rows.length} 行），请加条件、聚合或 LIMIT`);
  if (shown < rows.length) notes.push(`表太长，只显示前 ${shown} 行`);
  return [`（${notes.join("；")}）`, ...lines].join("\n");
}

function run(options: Required<LogsQueryOptions>, sql: string, maxRows: number): Promise<ToolResult> {
  const args = [options.script, "--json", "--no-sync", "--db", options.dbDir, "--max-rows", String(maxRows), "--timeout", String(Math.max(1, Math.floor(options.timeoutMs / 1000) - 2)), "--", sql];
  // Our own script, but still no API keys in its environment.
  const env: NodeJS.ProcessEnv = { PATH: process.env["PATH"] ?? "/usr/bin:/bin", LANG: "C.UTF-8" };
  if (process.env["HOME"]) env["HOME"] = process.env["HOME"];
  return new Promise((done) => {
    execFile(options.python, args, { env, timeout: options.timeoutMs, maxBuffer: 16 * 1024 * 1024, encoding: "utf8" }, (error, stdout, stderr) => {
      let out: QueryOutput | null = null;
      try {
        out = JSON.parse(stdout) as QueryOutput;
      } catch {
        out = null;
      }
      if (out?.error) return done({ text: `查询失败：${out.error}`, isError: true });
      if (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT") return done({ text: `日志库的 Python 环境不存在（${options.python}）：按 docs/logdb.md 建 .cache/logdb-venv`, isError: true });
        if (error.killed || (error as { signal?: string }).signal === "SIGTERM") return done({ text: `查询超时（${options.timeoutMs / 1000} 秒）：请加条件或聚合`, isError: true });
        return done({ text: `查询失败：${(stderr || error.message).trim().slice(0, 1000)}`, isError: true });
      }
      if (!out || !Array.isArray(out.columns) || !Array.isArray(out.rows)) return done({ text: `查询失败：query.py 的输出读不懂：${stdout.slice(0, 300)}`, isError: true });
      return done({ text: renderRows(out) });
    });
  });
}

/** The logs_query tool; options override where Python, the script and the database are (tests). */
export function logsQueryTool(options: LogsQueryOptions = {}): ToolDef {
  const inputSchema = {
    type: "object" as const,
    properties: {
      sql: { type: "string" as const, description: "一条只读 SQL（SELECT / WITH / DESCRIBE），DuckDB 方言" },
      max_rows: { type: "integer" as const, minimum: 1, maximum: LOGS_QUERY_MAX_ROWS, description: `最多返回几行，默认 ${LOGS_QUERY_DEFAULT_ROWS}` },
    },
    required: ["sql"],
    additionalProperties: false,
  };
  return {
    name: "logs_query",
    description: DESCRIPTION,
    inputSchema,
    async run(input) {
      const problems = validateInput(inputSchema, input);
      if (problems.length > 0) return { text: `输入不合法：${problems.join("；")}`, isError: true };
      const sql = String(input["sql"]).trim();
      if (!sql) return { text: "输入不合法：sql 是空的", isError: true };
      const maxRows = typeof input["max_rows"] === "number" ? input["max_rows"] : LOGS_QUERY_DEFAULT_ROWS;
      return run(defaults(options), sql, maxRows);
    },
  };
}
