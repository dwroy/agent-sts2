/**
 * M2 acceptance replay (docs/v4-architecture.md §4): real maps from the logs asked as map/route-plan (the whole map,
 * the brain's node sequence, checked and re-asked once by the router), plus card rewards and the last page of
 * multi-step events with the route block riding on them (keep or a new node sequence). DeepSeek only.
 *
 * Boards come from logs/states.jsonl by byte offset (the log database's state_index / frames, docs/logdb.md; never a
 * full read), chosen deterministically (hash order): A9 maps of acts 1-3 (act 3: A8 too, few A9 runs got there) from
 * distinct runs, plus maps with Winged Boots charges. The run memory is what RunJournal renders from the state alone (no history: rebuilding it would read
 * the whole run's logs). For the card rewards and events the act's plan is a code-built legal route through the room
 * the run entered (the replay checks the block and the answer's route, not the plan's quality).
 *
 * Usage (worktree root): npx tsx tools/route-replay.ts --env-file ../jev-sts2-v3/.env [--maps 22] [--rooms 5]
 *   [--concurrency 3] [--out experiments/route-m2] [--dry]
 * Output: <out>/results.jsonl, brain.jsonl, deepseek-reasoning.jsonl (raw, not committed), summary.md.
 * Keys: DEEPSEEK_API_KEY_FILE from the env file; nothing prints or stores the key.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { Brain, createRouter, toolContextOf } from "../src/brain/brain.js";
import type { BrainLogRow } from "../src/brain/router.js";
import { loadConfig } from "../src/core/config.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";
import { isLastEventPage } from "../src/knowledge/event-pages.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { DeepSeekClient } from "../src/brain/llm/deepseek.js";
import { parseGameState, type GameState } from "../src/hand/mod/schema.js";
import { RunJournal } from "../src/memory/run-journal.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv, type ScreenMemory } from "../src/memory/types.js";
import { planDecision } from "../src/hand/screens/index.js";
import { rememberChosenNode, rememberMap } from "../src/hand/screens/rest.js";
import { makeRoutePlan, mapActOf, mapFromState, routeCosts } from "../src/hand/screens/route-plan.js";
import { routeMapFromView, type RouteMap } from "../src/sim/route-map.js";
import { actOf } from "../src/memory/run-plan.js";
import type { JsonValue } from "../src/core/util/json.js";
import { fromRoot } from "../src/core/paths.js";

const { values } = parseArgs({
  options: {
    "env-file": { type: "string" },
    maps: { type: "string", default: "22" },
    rooms: { type: "string", default: "5" },
    concurrency: { type: "string", default: "3" },
    out: { type: "string", default: fromRoot("experiments/route-m2") },
    dry: { type: "boolean", default: false },
  },
});

type Row = Record<string, unknown>;
const OUT = resolve(values.out!);
mkdirSync(OUT, { recursive: true });
const STATES = resolve(fromRoot("logs/states.jsonl"));
const PY = resolve(fromRoot("data/logdb-venv/bin/python"));

function query(sql: string): Row[] {
  const out = execFileSync(PY, [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "5000", sql], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, at) => [column, row[at]])));
}

/** One logged state by its byte offset (a point read of states.jsonl). */
function stateAt(off: number, len: number): Row {
  const fd = openSync(STATES, "r");
  try {
    const buffer = Buffer.alloc(len);
    readSync(fd, buffer, 0, len, off);
    return (JSON.parse(buffer.toString("utf8")) as { state: Row }).state;
  } finally {
    closeSync(fd);
  }
}

function readEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith("#") && m[1]!.startsWith("DEEPSEEK_")) env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
  return env;
}

/* ---- the boards ------------------------------------------------------------------------------------ */

const NOT_ANCIENT = "NOT list_contains(list_transform(map_avail, x -> x.type), 'Ancient')";

/** A9 maps with a choice, one per run and act, in hash order; then maps where Winged Boots are held. */
function pickMaps(total: number): Row[] {
  const perAct = Math.ceil((total - 4) / 3);
  const plain = query(
    `WITH m AS (SELECT run_id, act, floor, min(off) AS off, arg_min(len, off) AS len FROM frames WHERE screen = 'MAP' AND NOT coalesce(observed, false) AND (ascension = 9 OR (act = 3 AND ascension = 8)) ` +
      `AND len(map_avail) >= 2 AND ${NOT_ANCIENT} AND NOT list_contains(relics, 'WINGED_BOOTS') GROUP BY 1, 2, 3), ` +
      `r AS (SELECT *, row_number() OVER (PARTITION BY run_id, act ORDER BY hash(run_id || floor)) AS k FROM m) ` +
      `SELECT run_id, act, floor, off, len, row_number() OVER (PARTITION BY act ORDER BY hash(run_id)) AS rn FROM r WHERE k = 1 QUALIFY rn <= ${perAct} ORDER BY act, rn`,
  );
  const boots = query(
    `WITH m AS (SELECT run_id, ascension, act, floor, min(off) AS off, arg_min(len, off) AS len FROM frames WHERE screen = 'MAP' AND NOT coalesce(observed, false) AND ascension >= 8 ` +
      `AND len(map_avail) >= 2 AND ${NOT_ANCIENT} AND list_contains(relics, 'WINGED_BOOTS') AND floor BETWEEN 3 AND 40 GROUP BY 1, 2, 3, 4) ` +
      `SELECT run_id, act, floor, off, len FROM m QUALIFY row_number() OVER (PARTITION BY run_id, act ORDER BY hash(run_id || floor)) = 1 ORDER BY hash(run_id || act) LIMIT 12`,
  );
  return [...plain, ...boots.map((row) => ({ ...row, boots: true }))];
}

/** Card rewards (A9 acts 1-2) and the last pages of multi-step events, with the map one floor before. */
function pickRooms(n: number): { rewards: Row[]; events: Row[] } {
  const room = (where: string, labels: string): string =>
    `WITH d AS (SELECT d.run_id, d.floor, d.ts, d.label, s.off, s.len FROM decisions d JOIN state_index s ON s.run_id = d.run_id AND s.ts = d.ts ` +
    `WHERE d.label IN (${labels}) AND d.run_id IS NOT NULL ${where}), ` +
    `m AS (SELECT f.run_id, f.floor, max(f.off) AS map_off, arg_max(f.len, f.off) AS map_len FROM frames f WHERE f.screen = 'MAP' AND NOT coalesce(f.observed, false) GROUP BY 1, 2), ` +
    `c AS (SELECT run_id, floor, arg_max(option_index, ts) AS chosen FROM decisions WHERE action = 'choose_map_node' GROUP BY 1, 2) ` +
    `SELECT d.*, m.map_off, m.map_len, c.chosen FROM d JOIN m ON m.run_id = d.run_id AND m.floor = d.floor - 1 JOIN c ON c.run_id = d.run_id AND c.floor = d.floor - 1 `;
  const rewards = query(`${room("AND d.floor BETWEEN 2 AND 30", "'reward/card'")} JOIN frames fr ON fr.off = d.off WHERE fr.ascension = 9 QUALIFY row_number() OVER (PARTITION BY d.run_id ORDER BY hash(d.ts)) = 1 ORDER BY hash(d.run_id) LIMIT ${n * 4}`);
  // Visits with 2+ event questions: every page, in order (the last one carries the block).
  const events = query(
    `${room("AND d.floor BETWEEN 2 AND 45", "'event/choose', 'event/plan'")} WHERE (d.run_id, d.floor) IN (SELECT (run_id, floor) FROM decisions WHERE label IN ('event/choose', 'event/plan') AND action = 'choose_event_option' GROUP BY run_id, floor HAVING count(*) >= 2) ORDER BY hash(d.run_id || d.floor), d.ts`,
  );
  return { rewards, events };
}

/* ---- asking --------------------------------------------------------------------------------------- */

const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");

function envOf(state: GameState, memory: ScreenMemory): DecisionEnv {
  return {
    state,
    knowledge,
    brief: buildRunBrief(state, knowledge),
    thresholds: { act: 0.5, strong: 0.8 },
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    screenMemory: memory,
    shopDiscardPotions: [],
    buildDecider: "deepseek",
  };
}

const rows: BrainLogRow[] = [];
const envFile = values["env-file"] ? readEnvFile(values["env-file"]) : {};
const config = loadConfig({ ...envFile, BRAIN_ENGINE: "deepseek", KNOWLEDGE_PREFIX: "full", BRAIN_LOG: join(OUT, "brain.jsonl") } as unknown as NodeJS.ProcessEnv);
if (!config.deepseek && !values.dry) throw new Error("DeepSeek settings missing: give --env-file with DEEPSEEK_API_KEY_FILE");
const deepseek = config.deepseek ? new DeepSeekClient({ ...config.deepseek, reasoningLog: join(OUT, "deepseek-reasoning.jsonl") }) : null;

/** A fresh brain per question: the tool context (ascension, run) is per board. */
function brainFor(state: GameState): Brain {
  const brain = new Brain(
    createRouter(config, deepseek, {
      log: (row) => {
        rows.push(row);
        appendFileSync(join(OUT, "brain.jsonl"), `${JSON.stringify(row)}\n`);
      },
    }),
    deepseek!,
  );
  brain.setToolContext(toolContextOf(state, state.run ? actOf(state) : undefined, fromRoot("logs")));
  return brain;
}

function memoryFor(state: GameState, screenMemory: ScreenMemory, decision: AskDecision): Record<string, unknown> {
  const question = decision.questions[decision.deepseek!.question];
  const criteria = question?.type === "choice" ? question.criteria : {};
  return new RunJournal().render(state, knowledge, screenMemory, { label: decision.label, criteria, factsCovered: true }) as unknown as Record<string, unknown>;
}

const ERROR_TYPES: [RegExp, string][] = [
  [/地图上没有这个节点/, "unknown node id"],
  [/不是下一步能走的节点/, "first step not a next node"],
  [/没有连线/, "no line between steps"],
  [/不是下一层/, "skipped or repeated a row"],
  [/飞行靴只剩/, "more boots jumps than charges"],
  [/不是 boss/, "does not end at a boss"],
  [/names no node ids|missing "route"/, "no route in the answer"],
  [/not a JSON object|no answer/, "unparseable answer"],
];

const errorTypes = (problems: string[]): string[] => [...new Set(problems.map((problem) => ERROR_TYPES.find(([pattern]) => pattern.test(problem))?.[1] ?? "other"))];

function usageOf(row: BrainLogRow | undefined): Row {
  return row ? { latency_ms: row.latency_ms, attempts: row.attempts, reasks: row.reasks, input_tokens: row.usage.inputTokens, cache_hit_tokens: row.usage.cacheHitTokens ?? 0, output_tokens: row.usage.outputTokens, cost_usd: row.usage.costUsd ?? null } : {};
}

async function askMap(item: Row): Promise<Row> {
  const raw = stateAt(Number(item["off"]), Number(item["len"]));
  const state = parseGameState(raw);
  const memory = createScreenMemory("MAP");
  const env = envOf(state, memory);
  const outcome = planDecision(env);
  const base = { kind: "map", run: item["run_id"], ascension: state.run?.ascension ?? null, act: mapActOf(state), floor: state.run?.floor ?? null, boots: mapFromState(env)?.boots ?? 0 };
  if (outcome.kind !== "decision" || outcome.decision.kind !== "ask" || outcome.decision.label !== "map/route-plan") return { ...base, skipped: `no route-plan question (${outcome.kind === "decision" ? outcome.decision.label : outcome.kind})` };
  const decision = outcome.decision;
  const view = decision.state["route_map"] as Record<string, JsonValue>;
  const facts = { nodes: (view["map"] as string[]).length, next: (view["next_nodes"] as string[]).length, bosses: routeMapFromView(view)?.bosses.length ?? 0 };
  if (values.dry) return { ...base, ...facts, dry: true };
  const question = decision.questions["pick"]!;
  if (question.type !== "choice") throw new Error("not a choice question");
  const brain = brainFor(state);
  const before = rows.length;
  let json: Record<string, unknown> | null = null;
  let error = "";
  try {
    json = (await brain.choosePlan(decision.state, question.instructions, question.criteria, { label: decision.label, memory: memoryFor(state, memory, decision) as JsonValue })).json;
  } catch (thrown) {
    error = thrown instanceof Error ? thrown.message.slice(0, 300) : String(thrown);
  }
  const row = rows.slice(before).find((entry) => entry.label === decision.label);
  const firstProblems = row?.first?.problems ?? (row && row.answer === null ? row.problems : []);
  const finalProblems = row?.answer === null ? row.problems : [];
  const resolved = json ? decision.deepseek!.plan!.resolve(json) : { invalid: error || "no answer" };
  const legal = !("invalid" in resolved);
  if (legal) resolved.apply?.();
  return {
    ...base,
    ...facts,
    first_valid: firstProblems.length === 0 && row?.answer !== undefined && !error,
    final_valid: legal,
    first_problems: firstProblems,
    final_problems: legal ? [] : finalProblems.length > 0 ? finalProblems : ["invalid" in resolved ? resolved.invalid : ""],
    error_types: errorTypes(firstProblems),
    route: json?.["route"] ?? null,
    reason: json?.["reason"] ?? null,
    plan: memory.routePlan?.summary ?? null,
    ...usageOf(row),
    ...(error ? { error } : {}),
  };
}

/** The first legal route through `first` on this map (the code-built plan the room questions ride on). */
function routeThrough(map: RouteMap, first: string): string[] | null {
  const walk = (id: string, sofar: string[]): string[] | null => {
    const path = [...sofar, id];
    const node = map.nodes.get(id);
    if (!node) return null;
    if (map.bosses.includes(id) && (node.children.length === 0 || map.bosses.indexOf(id) === map.bosses.length - 1)) return path;
    for (const child of node.children) {
      const found = walk(child, path);
      if (found) return found;
    }
    return null;
  };
  return walk(first, []);
}

/** A room (card reward, event page) with the act's plan set through the room the run entered; asked when `ask`. */
async function askRoom(item: Row, ask: boolean): Promise<Row> {
  const mapState = parseGameState(stateAt(Number(item["map_off"]), Number(item["map_len"])));
  const memory = createScreenMemory("MAP");
  rememberMap(memory, mapState);
  rememberChosenNode(memory, mapState, { action: "choose_map_node", option_index: Number(item["chosen"]) });
  const chosen = memory.lastMap?.chosen;
  const mapEnv = envOf(mapState, memory);
  const map = mapFromState(mapEnv);
  const base = { kind: String(item["label"]).startsWith("reward") ? "card" : "event", label: item["label"], run: item["run_id"], floor: item["floor"], room: chosen?.type ?? null };
  if (!map || !chosen) return { ...base, skipped: "no map or chosen node" };
  const ids = routeThrough(map, `r${chosen.row}c${chosen.col}`);
  if (!ids) return { ...base, skipped: "no route through the chosen node" };
  memory.routePlan = makeRoutePlan(mapEnv, map, ids, { hp: mapState.run?.current_hp ?? 0, max: mapState.run?.max_hp ?? 0 }, routeCosts(mapEnv, map.act), "replay fixture plan");
  const state = parseGameState(stateAt(Number(item["off"]), Number(item["len"])));
  memory.screen = state.screen;
  const env = envOf(state, memory);
  const outcome = planDecision(env);
  if (outcome.kind !== "decision" || outcome.decision.kind !== "ask" || !outcome.decision.deepseek) return { ...base, skipped: `no brain question (${outcome.kind === "decision" ? outcome.decision.label : outcome.kind})` };
  const decision = outcome.decision;
  const block = decision.state["route_review"] as Record<string, JsonValue> | undefined;
  const event = state.raw["event"] as Row | undefined;
  const lastPage = event ? isLastEventPage(event) : null;
  const facts = { question: decision.label, block: Boolean(block), last_page: lastPage, plan_from_here: block?.["plan"] ?? null };
  if (!ask || !block || values.dry) return { ...base, ...facts };
  const question = decision.questions[decision.deepseek!.question]!;
  if (question.type !== "choice") throw new Error("not a choice question");
  const brain = brainFor(state);
  const before = rows.length;
  try {
    const answer = await brain.choose(decision.state, question.instructions, question.criteria, { label: decision.label, memory: memoryFor(state, memory, decision) as JsonValue });
    const row = rows.slice(before).find((entry) => entry.label === decision.label);
    const resolved = decision.resolve({ pick: { type: "choice", choice: answer.choice, probabilities: { [answer.choice]: 1 }, confidence: 1, raw: { escalated: "deepseek", ...(answer.cards ? { cards: answer.cards } : {}), ...(answer.route ? { route: answer.route } : {}), ...(answer.routeReason ? { route_reason: answer.routeReason } : {}), ...(answer.discard ? { discard: answer.discard } : {}) } } } as AnswerSet);
    const firstProblems = row?.first?.problems ?? row?.problems ?? [];
    return { ...base, ...facts, choice: answer.choice, route: answer.route ?? null, route_reason: answer.routeReason ?? null, route_outcome: resolved.routeReview?.outcome ?? null, route_invalid: resolved.routeReview?.invalid ?? null, first_problems: firstProblems, final_problems: row?.problems ?? [], error_types: errorTypes(firstProblems.filter((problem) => problem.startsWith("route"))), ...usageOf(row) };
  } catch (thrown) {
    return { ...base, ...facts, error: thrown instanceof Error ? thrown.message.slice(0, 300) : String(thrown) };
  }
}

async function pool<T>(items: T[], size: number, run: (item: T) => Promise<Row>): Promise<Row[]> {
  const out: Row[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const at = next++;
        const started = Date.now();
        out[at] = await run(items[at]!);
        const row = out[at]!;
        process.stdout.write(`${row["kind"]} ${row["run"]} F${row["floor"]}: ${row["skipped"] ?? (row["final_valid"] !== undefined ? `first ${row["first_valid"]} final ${row["final_valid"]}` : `block ${row["block"]} route ${row["route_outcome"] ?? "-"}`)} (${((Date.now() - started) / 1000).toFixed(1)} s)\n`);
        appendFileSync(join(OUT, "results.jsonl"), `${JSON.stringify(row)}\n`);
      }
    }),
  );
  return out;
}

/* ---- the summary ------------------------------------------------------------------------------------ */

const pct = (n: number, d: number): string => (d > 0 ? `${n}/${d} (${Math.round((100 * n) / d)}%)` : "0/0");
const median = (list: number[]): number => {
  const sorted = [...list].sort((a, b) => a - b);
  return sorted.length === 0 ? 0 : sorted[Math.floor((sorted.length - 1) / 2)]!;
};

function summary(maps: Row[], rooms: Row[]): string {
  const asked = maps.filter((row) => row["final_valid"] !== undefined);
  const lines = ["# M2 路线回放汇总（tools/route-replay.ts 生成）", ""];
  lines.push(`## map/route-plan（${asked.length} 张地图，DeepSeek + KNOWLEDGE_PREFIX=full）`, "");
  lines.push(`- 首答合法：${pct(asked.filter((row) => row["first_valid"]).length, asked.length)}；补问一次后合法：${pct(asked.filter((row) => row["final_valid"]).length, asked.length)}`);
  const byAct = [1, 2, 3].map((act) => `${act} 幕 ${asked.filter((row) => row["act"] === act).length}`).join("、");
  lines.push(`- 覆盖：${byAct}；带飞行靴（剩余次数 > 0）${asked.filter((row) => Number(row["boots"]) > 0).length} 张；进阶 ${[...new Set(asked.map((row) => row["ascension"]))].join("/")}`);
  const types = new Map<string, number>();
  for (const row of asked) for (const type of row["error_types"] as string[]) types.set(type, (types.get(type) ?? 0) + 1);
  lines.push(`- 首答错误类型（按题计）：${[...types].map(([type, n]) => `${type} ${n}`).join("、") || "无"}`);
  const num = (key: string, list = asked): number[] => list.map((row) => Number(row[key] ?? 0));
  const sum = (list: number[]): number => list.reduce((a, b) => a + b, 0);
  lines.push(
    `- 每题（含补问）：耗时中位数 ${(median(num("latency_ms")) / 1000).toFixed(1)} s、最长 ${(Math.max(0, ...num("latency_ms")) / 1000).toFixed(1)} s；输入 token 中位数 ${median(num("input_tokens"))}（缓存命中合计 ${pct(sum(num("cache_hit_tokens")), sum(num("input_tokens")))}）；输出 token 中位数 ${median(num("output_tokens"))}；模型调用 ${sum(num("attempts"))} 次；成本合计 $${sum(num("cost_usd")).toFixed(3)}`,
  );
  lines.push("", "| 局 | 进阶 | 幕 | 层 | 靴 | 节点 | 首答 | 最终 | 首答问题 | 路线 | 耗时 s | 输入/命中/输出 |", "|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const row of maps) {
    if (row["final_valid"] === undefined) {
      lines.push(`| ${row["run"]} | ${row["ascension"]} | ${row["act"]} | ${row["floor"]} | ${row["boots"]} | | | | ${row["skipped"] ?? row["error"] ?? ""} | | | |`);
      continue;
    }
    const problems = (row["first_problems"] as string[]).join("; ").replace(/\|/g, "/").slice(0, 160);
    lines.push(`| ${row["run"]} | ${row["ascension"]} | ${row["act"]} | ${row["floor"]} | ${row["boots"]} | ${row["nodes"]} | ${row["first_valid"] ? "✓" : "✗"} | ${row["final_valid"] ? "✓" : "✗"} | ${problems} | ${String(row["plan"] ?? "").replace(/\|/g, "/")} | ${(Number(row["latency_ms"]) / 1000).toFixed(1)} | ${row["input_tokens"]}/${row["cache_hit_tokens"]}/${row["output_tokens"]} |`);
  }
  const askedRooms = rooms.filter((row) => row["route_outcome"] !== undefined || row["error"]);
  lines.push("", `## 路线块随选牌和事件最后一问（${askedRooms.length} 题）`, "");
  const events = rooms.filter((row) => row["kind"] === "event" && !row["skipped"]);
  lines.push(`- 多步事件：非最后一页 ${events.filter((row) => row["last_page"] === false).length} 页，带路线块 ${events.filter((row) => row["last_page"] === false && row["block"]).length} 页；最后一页 ${events.filter((row) => row["last_page"] === true).length} 页，带路线块 ${events.filter((row) => row["last_page"] === true && row["block"]).length} 页`);
  const outcomes = new Map<string, number>();
  for (const row of askedRooms) outcomes.set(String(row["route_outcome"] ?? row["error"]), (outcomes.get(String(row["route_outcome"] ?? row["error"])) ?? 0) + 1);
  lines.push(`- 路线修正结果：${[...outcomes].map(([outcome, n]) => `${outcome} ${n}`).join("、")}；首答路线有问题（补问）${askedRooms.filter((row) => (row["error_types"] as string[] | undefined)?.length).length} 题`);
  lines.push("", "| 类型 | 局 | 层 | 题 | 最后一页 | 路线块 | 选择 | route | 结果 | 首答问题 | 耗时 s |", "|---|---|---|---|---|---|---|---|---|---|---|");
  for (const row of rooms) {
    if (row["skipped"]) continue;
    lines.push(`| ${row["kind"]} | ${row["run"]} | ${row["floor"]} | ${row["question"]} | ${row["last_page"] ?? ""} | ${row["block"] ? "✓" : "—"} | ${row["choice"] ?? ""} | ${String(row["route"] ?? "").slice(0, 60)} | ${row["route_outcome"] ?? row["error"] ?? ""}${row["route_invalid"] ? `（${String(row["route_invalid"]).slice(0, 60)}）` : ""} | ${((row["first_problems"] as string[] | undefined) ?? []).join("; ").replace(/\|/g, "/").slice(0, 100)} | ${row["latency_ms"] ? (Number(row["latency_ms"]) / 1000).toFixed(1) : ""} |`);
  }
  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  for (const name of ["results.jsonl", "brain.jsonl"]) if (existsSync(join(OUT, name))) rmSync(join(OUT, name));
  const maps = pickMaps(Number(values.maps));
  const { rewards, events } = pickRooms(Number(values.rooms));
  process.stdout.write(`${maps.length} maps, ${rewards.length} reward candidates, ${events.length} event pages\n`);
  const concurrency = Number(values.concurrency);
  // Boots maps: only those with charges left, up to 4.
  const plainMaps = maps.filter((row) => !row["boots"]);
  const bootsMaps: Row[] = [];
  for (const row of maps.filter((entry) => entry["boots"])) {
    if (bootsMaps.length >= 4) break;
    const state = parseGameState(stateAt(Number(row["off"]), Number(row["len"])));
    if ((mapFromState(envOf(state, createScreenMemory("MAP")))?.boots ?? 0) > 0) bootsMaps.push(row);
  }
  const mapResults = await pool([...plainMaps, ...bootsMaps], concurrency, askMap);
  // Rooms: the first n card rewards whose block rides; every page of the multi-step event visits (the last pages asked, n of them).
  const roomResults: Row[] = [];
  let asked = 0;
  for (const row of rewards) {
    if (asked >= Number(values.rooms)) break;
    const probe = await askRoom(row, false);
    if (!probe["block"]) continue;
    asked += 1;
    roomResults.push(...(await pool([row], 1, (item) => askRoom(item, true))));
  }
  const visits = new Map<string, Row[]>();
  for (const row of events) visits.set(`${row["run_id"]}:${row["floor"]}`, [...(visits.get(`${row["run_id"]}:${row["floor"]}`) ?? []), row]);
  let lastAsked = 0;
  for (const pages of visits.values()) {
    if (lastAsked >= Number(values.rooms)) break;
    const probes = await Promise.all(pages.map((page) => askRoom(page, false)));
    const last = probes.findIndex((probe) => probe["block"]);
    if (last < 0) continue;
    roomResults.push(...probes.filter((_, at) => at !== last));
    roomResults.push(...(await pool([pages[last]!], 1, (item) => askRoom(item, true))));
    lastAsked += 1;
  }
  writeFileSync(join(OUT, "summary.md"), summary(mapResults, roomResults));
  process.stdout.write(`summary: ${join(OUT, "summary.md")}\n`);
}

await main();
