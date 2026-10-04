/**
 * V4 M3 acceptance: recorded hallway boards where Jev chose to drink a potion (notes/potion-drinks-2026-09-29.md,
 * appendix A), rebuilt with the current code and asked twice: the old question (JEV_CONTEXT=v1 as in v3, without
 * the V4 blocks) and the new one (with potion_experience and mechanics_experience). Only reports; nothing is tuned.
 *
 * Per case: the Jev plan-choice row in decisions.jsonl (run, floor, turn, the potion in its rationale); its state
 * from states.jsonl by a binary search on the row's ts, then its fingerprint (the 3.8 GB file is never read
 * whole); the run plan in force (run-plans.jsonl), the act's route plan (the latest decision row with
 * route_plan) and the last map screen before the fight (a bounded backward scan). planCombatTurn builds the
 * question; the old view is the new one without the two V4 keys, so both share the same options.
 *
 * Usage: npx tsx tools/jev-potion-replay.ts [--cases experiments/jev-potion-replay/cases.json]
 *        [--out experiments/jev-potion-replay] [--env ../jev-sts2-v3/.env] [--ask] [--max-calls 50]
 * Without --ask nothing is sent: the prompts are written and their sizes printed. The Jev key is read from the
 * env file into this process only; it is never printed or written (prompts.jsonl holds request bodies only).
 */
import { closeSync, createReadStream, existsSync, mkdirSync, openSync, readFileSync, readSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

import { loadConfig, requireJevApiKey } from "../src/core/config.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";
import { JevClient } from "../src/reflex/jev/client.js";
import type { QuestionSet } from "../src/reflex/jev/questions.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import type { RoutePlan } from "../src/hand/screens/map.js";
import { rememberMap } from "../src/hand/screens/rest.js";
import { runPlanLine, type RunPlan } from "../src/memory/run-plan.js";
import { askJevLogged, createJevPromptLog } from "../src/eye/jev-prompt-log.js";
import type { JsonValue } from "../src/core/util/json.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const casesPath = arg("cases", fromRoot("experiments/jev-potion-replay/cases.json"));
const outDir = arg("out", fromRoot("experiments/jev-potion-replay"));
const envPath = arg("env", "../jev-sts2-v3/.env");
const ask = process.argv.includes("--ask");
const maxCalls = Number(arg("max-calls", "50"));
const STATES = fromRoot("logs/states.jsonl");
const DECISIONS = fromRoot("logs/decisions.jsonl");
const RUN_PLANS = fromRoot("logs/run-plans.jsonl");
/** The two V4 keys; the old question is the new one without them. */
const V4_KEYS = ["potion_experience", "mechanics_experience"] as const;

type Row = Record<string, JsonValue>;

/** One row of the potion-drinks appendix A (its columns, as written there). */
interface Case {
  n: number;
  run: string;
  floor: number;
  turn: number;
  potion: string;
  /** 值得喝 (must drink / big saving), 收益小, 持平. */
  group: string;
  class: string;
  delta: number | null;
  boss_plan: string;
  actual: string;
}

const cases = JSON.parse(readFileSync(casesPath, "utf8")) as Case[];
const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");

/* ---- logs ------------------------------------------------------------------------------------------------ */

/** The Jev plan-choice row of each case, and each case run's route-plan rows (decisions.jsonl, streamed once). */
async function scanDecisions(): Promise<{ rows: Map<number, Row>; routes: Map<string, Row[]> }> {
  const runs = new Set(cases.map((item) => item.run));
  const rows = new Map<number, Row>();
  const routes = new Map<string, Row[]>();
  const lines = createInterface({ input: createReadStream(DECISIONS, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of lines) {
    const id = /"run_id":"([^"]*)"/.exec(line)?.[1];
    if (!id || !runs.has(id)) continue;
    const hasRoute = line.includes('"route_plan":{');
    if (!hasRoute && !line.includes('"combat/plan-choice')) continue;
    let row: Row;
    try {
      row = JSON.parse(line) as Row;
    } catch {
      continue;
    }
    if (hasRoute) routes.set(id, [...(routes.get(id) ?? []), row]);
    if (!String(row["label"]).startsWith("combat/plan-choice") || row["decider"] !== "jev") continue;
    for (const item of cases) {
      if (rows.has(item.n) || item.run !== id || Number(row["floor"]) !== item.floor || Number(row["turn"]) !== item.turn) continue;
      if (String(row["rationale"]).includes(item.potion)) rows.set(item.n, row);
    }
  }
  return { rows, routes };
}

/** The ts that starts the first whole line at or after `offset` (null at the end of the file). */
function lineAt(fd: number, offset: number, size: number): { ts: string; start: number } | null {
  const chunk = Buffer.alloc(Math.min(1 << 20, size - offset));
  let start = offset;
  let position = offset;
  // Find the next line start (offset 0 is one).
  if (offset > 0) {
    for (;;) {
      const read = readSync(fd, chunk, 0, Math.min(chunk.length, size - position), position);
      if (read <= 0) return null;
      const at = chunk.subarray(0, read).indexOf(0x0a);
      if (at >= 0) {
        start = position + at + 1;
        break;
      }
      position += read;
    }
  }
  if (start >= size) return null;
  const head = Buffer.alloc(64);
  const read = readSync(fd, head, 0, 64, start);
  const ts = /^\{"ts":"([^"]+)"/.exec(head.subarray(0, read).toString("utf8"))?.[1];
  return ts ? { ts, start } : null;
}

/** The first byte offset whose line's ts is >= `ts` (states.jsonl is in ts order). */
function seek(fd: number, size: number, ts: string): number {
  let lo = 0;
  let hi = size;
  while (hi - lo > 1 << 16) {
    const mid = Math.floor((lo + hi) / 2);
    const line = lineAt(fd, mid, size);
    if (!line || line.ts >= ts) hi = mid;
    else lo = mid;
  }
  return lo;
}

/** Lines read forward from `offset` until `stop` returns true (or `maxBytes` read). */
function forward(fd: number, offset: number, maxBytes: number, visit: (line: string) => boolean): void {
  let position = offset;
  let tail = "";
  const chunk = Buffer.alloc(8 << 20);
  while (position - offset < maxBytes) {
    const read = readSync(fd, chunk, 0, chunk.length, position);
    if (read <= 0) return;
    position += read;
    const text = tail + chunk.subarray(0, read).toString("utf8");
    const parts = text.split("\n");
    tail = parts.pop() ?? "";
    for (const line of parts) if (line && visit(line)) return;
  }
}

/** Lines read backward from `offset` until `stop` returns true (or `maxBytes` read). */
function backward(fd: number, offset: number, maxBytes: number, visit: (line: string) => boolean): void {
  let position = offset;
  let head = Buffer.alloc(0);
  while (offset - position < maxBytes && position > 0) {
    const length = Math.min(8 << 20, position);
    position -= length;
    const chunk = Buffer.alloc(length);
    readSync(fd, chunk, 0, length, position);
    const buffer = Buffer.concat([chunk, head]);
    let end = buffer.length;
    for (let at = buffer.lastIndexOf(0x0a, end - 1); at >= 0; at = end > 0 ? buffer.lastIndexOf(0x0a, end - 1) : -1) {
      const line = buffer.subarray(at + 1, end).toString("utf8");
      end = at;
      if (line && visit(line)) return;
    }
    head = Buffer.from(buffer.subarray(0, end));
  }
}

/** The state row of a decision row (same ts and fingerprint), and the run's last MAP state before it. */
function statesOf(fd: number, size: number, decision: Row): { state: Row | null; map: Row | null } {
  const ts = String(decision["ts"]);
  const fingerprint = String(decision["fingerprint"]);
  const runId = String(decision["run_id"]);
  const offset = seek(fd, size, ts);
  let state: Row | null = null;
  forward(fd, offset, 64 << 20, (line) => {
    const lineTs = /^\{"ts":"([^"]+)"/.exec(line)?.[1] ?? "";
    if (lineTs > ts) return true;
    if (lineTs !== ts) return false;
    const row = JSON.parse(line) as Row;
    if (row["fingerprint"] !== fingerprint) return false;
    state = row;
    return true;
  });
  let map: Row | null = null;
  backward(fd, offset, 256 << 20, (line) => {
    if (!line.includes('"screen":"MAP"') || !line.includes(`"run_id":"${runId}"`)) return false;
    let row: Row;
    try {
      row = JSON.parse(line) as Row;
    } catch {
      return false; // the partial line the scan started in
    }
    if (String(row["ts"]) >= ts) return false;
    map = row;
    return true;
  });
  return { state, map };
}

function runPlanAt(runId: string, at: string): RunPlan | null {
  let found: RunPlan | null = null;
  for (const line of readFileSync(RUN_PLANS, "utf8").split("\n")) {
    if (!line.includes(`"run":"${runId}"`)) continue;
    const row = JSON.parse(line) as Row;
    const made = String(row["observed_ts"] ?? row["ts"]);
    if (made <= at && row["plan"] && typeof row["plan"] === "object") found = { ...(row["plan"] as unknown as RunPlan), runId };
  }
  return found;
}

/* ---- the question ---------------------------------------------------------------------------------------- */

interface Built {
  n: number;
  kind: string;
  options: Record<string, string>;
  /** Option keys that drink the case's potion / any potion. */
  drinksCase: string[];
  drinksAny: string[];
  oldState: Record<string, JsonValue>;
  newState: Record<string, JsonValue>;
  questions: QuestionSet;
  loggedOptions: string[];
  sameOptions: number;
  runPlanFloor: number | null;
  mapFloor: number | null;
  routeAct: number | null;
}

function build(item: Case, decision: Row, stateRow: Row, mapRow: Row | null, routes: Row[]): Built | string {
  const state: GameState = parseGameState(stateRow["state"] as Record<string, unknown>);
  const memory = createScreenMemory("COMBAT");
  const runPlan = runPlanAt(item.run, String(decision["observed_ts"] ?? decision["ts"]));
  if (runPlan) memory.runPlan = runPlan;
  const route = routes.filter((row) => String(row["ts"]) < String(decision["ts"])).at(-1);
  if (route) memory.routePlan = route["route_plan"] as unknown as RoutePlan;
  if (mapRow) rememberMap(memory, parseGameState(mapRow["state"] as Record<string, unknown>));
  const brief = buildRunBrief(state, knowledge);
  const line = runPlanLine(runPlan);
  if (line) brief.plan = line;
  const config = loadConfig({} as NodeJS.ProcessEnv);
  const env: DecisionEnv = {
    state, knowledge, brief, screenMemory: memory, thresholds: config.thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
  };
  const decisionNow = planCombatTurn(env);
  if (!decisionNow || decisionNow.kind !== "ask" || !decisionNow.jevView) return `not asked now (${decisionNow ? decisionNow.kind === "act" ? decisionNow.rationale : decisionNow.kind : "no decision"})`;
  const newState = decisionNow.jevView.state;
  const oldState = Object.fromEntries(Object.entries(newState).filter(([key]) => !(V4_KEYS as readonly string[]).includes(key)));
  const questions = decisionNow.jevView.questions;
  const plan = questions["plan"];
  const options = plan?.type === "choice" ? Object.fromEntries(Object.entries(plan.criteria).map(([key, text]) => [key, String(text)])) : {};
  const playsOf = (text: string): string => {
    try {
      return String((JSON.parse(text) as Record<string, unknown>)["plays"] ?? "");
    } catch {
      return "";
    }
  };
  // A plan line's step "potion X", a random potion's "drink X now", an unsimulated potion's "drink X first".
  const drinks = (text: string) => /(^|, |then )potion |^drink /.test(playsOf(text));
  const logged = (decision["questions"] as Row | undefined)?.["plan"] as Row | undefined;
  const loggedCriteria = (logged?.["criteria"] ?? {}) as Record<string, string>;
  const nowPlays = new Set(Object.values(options).map(playsOf));
  return {
    n: item.n,
    kind: String(decisionNow.state["fight"]),
    options,
    drinksCase: Object.entries(options).filter(([, text]) => drinks(text) && playsOf(text).includes(item.potion)).map(([key]) => key),
    drinksAny: Object.entries(options).filter(([, text]) => drinks(text)).map(([key]) => key),
    oldState,
    newState,
    questions,
    loggedOptions: Object.keys(loggedCriteria),
    sameOptions: Object.values(loggedCriteria).filter((text) => nowPlays.has(playsOf(String(text)))).length,
    runPlanFloor: runPlan?.floor ?? null,
    mapFloor: memory.lastMap?.floor ?? null,
    routeAct: memory.routePlan?.act ?? null,
  };
}

/* ---- main ------------------------------------------------------------------------------------------------ */

interface Pick {
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
  inputTokens: number;
  error?: string;
}

async function main(): Promise<void> {
  mkdirSync(join(outDir, "prompts"), { recursive: true });
  const { rows, routes } = await scanDecisions();
  const size = statSync(STATES).size;
  const fd = openSync(STATES, "r");
  const built: Built[] = [];
  const skipped: { n: number; why: string }[] = [];
  try {
    for (const item of cases) {
      const decision = rows.get(item.n);
      if (!decision) {
        skipped.push({ n: item.n, why: "no Jev plan-choice row" });
        continue;
      }
      const { state, map } = statesOf(fd, size, decision);
      if (!state) {
        skipped.push({ n: item.n, why: "state not found by ts + fingerprint" });
        continue;
      }
      const result = build(item, decision, state, map, routes.get(item.run) ?? []);
      if (typeof result === "string") {
        skipped.push({ n: item.n, why: result });
        continue;
      }
      built.push(result);
      writeFileSync(join(outDir, "prompts", `${item.n}.old.json`), `${JSON.stringify({ state: result.oldState, questions: result.questions }, null, 1)}\n`);
      writeFileSync(join(outDir, "prompts", `${item.n}.new.json`), `${JSON.stringify({ state: result.newState, questions: result.questions }, null, 1)}\n`);
      const chars = (value: unknown) => JSON.stringify(value).length;
      console.log(
        `#${item.n} ${item.run.slice(0, 4)} F${item.floor} T${item.turn} ${item.potion}: ${result.kind}, ${Object.keys(result.options).length} options (logged ${result.loggedOptions.length}, ${result.sameOptions} same), drink-this ${result.drinksCase.join(",") || "-"}; plan F${result.runPlanFloor ?? "-"} map F${result.mapFloor ?? "-"} route act ${result.routeAct ?? "-"}; chars old ${chars(result.oldState)} new ${chars(result.newState)} (+${chars(result.newState["potion_experience"] ?? "")} potion, +${chars(result.newState["mechanics_experience"] ?? "")} mechanics)`,
      );
    }
  } finally {
    closeSync(fd);
  }
  for (const skip of skipped) console.log(`#${skip.n} skipped: ${skip.why}`);
  if (ask) await askAll(built);
  else console.log(`dry run: ${built.length} boards, prompts in ${join(outDir, "prompts")}; --ask sends ${built.length * 2} questions`);
  const resultsPath = join(outDir, "results.jsonl");
  if (existsSync(resultsPath)) {
    const results = readFileSync(resultsPath, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Result);
    writeFileSync(join(outDir, "summary.md"), summary(built, results, skipped));
    console.log(`wrote ${join(outDir, "summary.md")} from ${resultsPath}`);
  }
}

async function askAll(built: Built[]): Promise<void> {
  if (built.length * 2 > maxCalls) throw new Error(`${built.length * 2} calls over the cap ${maxCalls}`);
  if (existsSync(envPath)) (process as NodeJS.Process & { loadEnvFile: (file?: string) => void }).loadEnvFile(envPath);
  const config = loadConfig(process.env);
  const jev = new JevClient({ apiKey: requireJevApiKey(config), baseUrl: config.jev.baseUrl, model: config.jev.model, timeoutMs: config.jev.timeoutMs, maxRetries: 0 });
  const log = createJevPromptLog(join(outDir, "prompts.jsonl"));
  let calls = 0;
  const results: Row[] = [];
  for (const board of built) {
    const item = cases.find((entry) => entry.n === board.n)!;
    const picks: Record<string, Pick> = {};
    for (const variant of ["old", "new"] as const) {
      calls += 1;
      const state = variant === "old" ? board.oldState : board.newState;
      try {
        const result = await askJevLogged(jev, log, {
          decisionId: `replay:${board.n}:${variant}`, runId: item.run, floor: item.floor, turn: item.turn, fingerprint: "", observedTs: "",
          label: `replay/${variant}`, jevContext: "v1", call: "ask",
        }, state, board.questions);
        const answer = (result.answers as AnswerSet)["plan"];
        picks[variant] = answer?.type === "choice"
          ? { choice: answer.choice, confidence: answer.confidence, probabilities: answer.probabilities, inputTokens: result.inputTokens }
          : { choice: "", confidence: 0, probabilities: {}, inputTokens: result.inputTokens, error: "no choice answer" };
      } catch (error) {
        picks[variant] = { choice: "", confidence: 0, probabilities: {}, inputTokens: 0, error: error instanceof Error ? error.message.slice(0, 200) : String(error) };
      }
    }
    const describe = (pick: Pick) => ({
      ...pick,
      drinks_case_potion: board.drinksCase.includes(pick.choice),
      drinks_any: board.drinksAny.includes(pick.choice),
      option: board.options[pick.choice]?.slice(0, 300) ?? null,
      p_drink_case: Number(board.drinksCase.reduce((sum, key) => sum + (pick.probabilities[key] ?? 0), 0).toFixed(3)),
      p_drink_any: Number(board.drinksAny.reduce((sum, key) => sum + (pick.probabilities[key] ?? 0), 0).toFixed(3)),
    });
    const row = { case: item as unknown as JsonValue, kind: board.kind, options: Object.keys(board.options).length, drinks_case: board.drinksCase, drinks_any: board.drinksAny, old: describe(picks["old"]!), new: describe(picks["new"]!) } as unknown as Row;
    results.push(row);
    console.log(`#${board.n}: old ${picks["old"]!.choice}@${picks["old"]!.confidence.toFixed(2)} new ${picks["new"]!.choice}@${picks["new"]!.confidence.toFixed(2)}`);
  }
  writeFileSync(join(outDir, "results.jsonl"), results.map((row) => JSON.stringify(row)).join("\n") + "\n");
  console.log(`asked Jev ${calls} times (${config.jev.model}); results in ${join(outDir, "results.jsonl")}`);
}

/* ---- the summary table ----------------------------------------------------------------------------------- */

interface Answer {
  choice: string;
  confidence: number;
  inputTokens: number;
  drinks_case_potion: boolean;
  drinks_any: boolean;
  p_drink_case: number;
  error?: string;
}

interface Result {
  case: Case;
  kind: string;
  options: number;
  drinks_case: string[];
  old: Answer;
  new: Answer;
}

function summary(built: Built[], results: Result[], skipped: { n: number; why: string }[]): string {
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const f2 = (x: number) => x.toFixed(2);
  const answered = results.filter((row) => !row.old.error && !row.new.error);
  const drinkCount = (variant: "old" | "new", rows: Result[]) => rows.filter((row) => row[variant].drinks_case_potion).length;
  const line = (label: string, rows: Result[]) =>
    `| ${label} | ${rows.length} | ${drinkCount("old", rows)} → ${drinkCount("new", rows)} | ${f2(mean(rows.map((row) => row.old.p_drink_case)))} → ${f2(mean(rows.map((row) => row.new.p_drink_case)))} | ${f2(mean(rows.map((row) => row.old.confidence)))} → ${f2(mean(rows.map((row) => row.new.confidence)))} | ${rows.filter((row) => row.old.choice === row.new.choice).length} |`;
  // The options as sent (prompts.jsonl; this rebuild's where there is none), and the boards whose rebuild differs.
  const sentPath = join(outDir, "prompts.jsonl");
  const sent = new Map<number, Record<string, string>>();
  if (existsSync(sentPath)) {
    for (const line of readFileSync(sentPath, "utf8").split("\n").filter(Boolean)) {
      const row = JSON.parse(line) as { decision_id: string; request: { questions: QuestionSet } };
      const plan = row.request.questions["plan"];
      if (row.decision_id.endsWith(":new") && plan?.type === "choice") sent.set(Number(row.decision_id.split(":")[1]), Object.fromEntries(Object.entries(plan.criteria).map(([key, text]) => [key, String(text)])));
    }
  }
  const drifted = sent.size > 0 ? built.filter((board) => sent.has(board.n) && JSON.stringify(sent.get(board.n)) !== JSON.stringify(board.options)).map((board) => board.n) : null;
  /** The potions an option drinks: a plan line's "potion X" steps, a random or unsimulated potion's "drink X". */
  const drunk = (board: Built | undefined, choice: string): string[] => {
    let plays = "";
    try {
      const options = (board && sent.get(board.n)) ?? board?.options ?? {};
      plays = String((JSON.parse(options[choice] ?? "{}") as Record<string, unknown>)["plays"] ?? "");
    } catch {
      return [];
    }
    const drink = /^drink (.+?) (now|first)\b/.exec(plays)?.[1];
    return drink ? [drink] : [...plays.matchAll(/(?:^|, |then )potion ([^,>]+?)(?: ->|,|$)/g)].map((match) => match[1]!.trim());
  };
  const pick = (answer: Answer, board: Built | undefined) =>
    answer.error ? `错误：${answer.error}` : `${answer.choice} @${f2(answer.confidence)}，${answer.drinks_any ? `喝 ${drunk(board, answer.choice).join("+") || "?"}` : "不喝"}，P(喝本瓶)=${f2(answer.p_drink_case)}`;
  const lessonScopes = (block: JsonValue | undefined) => ((block as { lessons?: string[] } | undefined)?.lessons ?? []).map((text) => /^\[([^ |]+)/.exec(text)?.[1] ?? "?");
  const rows = results.map((row) => {
    const board = built.find((entry) => entry.n === row.case.n);
    const extra = board ? JSON.stringify(board.newState).length - JSON.stringify(board.oldState).length : null;
    const same = board ? `${board.sameOptions}/${board.loggedOptions.length}` : "?";
    const blocks = board ? `药 ${lessonScopes(board.newState["potion_experience"]).length} 条${board.newState["potion_experience"] && (board.newState["potion_experience"] as Record<string, JsonValue>)["run_plan_on_potions"] ? "+计划原话" : ""}，机制 ${lessonScopes(board.newState["mechanics_experience"]).length} 条，+${extra} 字` : "?";
    const c = row.case;
    return `| ${c.n} | ${c.run.slice(0, 4)} A${(c as unknown as { ascension?: number }).ascension ?? "?"} | F${c.floor} T${c.turn} ${row.kind} | ${c.potion} | ${c.group}（${c.class}，Δ ${c.delta ?? "—"}） | ${row.options}（喝本瓶 ${row.drinks_case.length}）/ 与日志同 ${same} | ${pick(row.old, board)} | ${pick(row.new, board)} | ${blocks} |`;
  });
  const tokensOld = mean(answered.map((row) => row.old.inputTokens));
  const tokensNew = mean(answered.map((row) => row.new.inputTokens));
  const pDown = answered.filter((row) => row.new.p_drink_case < row.old.p_drink_case - 0.005).length;
  const pUp = answered.filter((row) => row.new.p_drink_case > row.old.p_drink_case + 0.005).length;
  const cDown = answered.filter((row) => row.new.confidence < row.old.confidence - 0.005).length;
  const cUp = answered.filter((row) => row.new.confidence > row.old.confidence + 0.005).length;
  return [
    "# Jev 走廊喝药回放：旧题面 vs 新题面（V4 M3 验收）",
    "",
    "由 `npx tsx tools/jev-potion-replay.ts --ask` 生成（`--ask` 不加时只重建题面、不调用 Jev，并据已有 results.jsonl 重写本表）。只报告结果，没有据此调参。",
    "",
    "- 局面：notes/potion-drinks-2026-09-29.md 附表 A 里 20 次 Jev 选择的走廊（非 boss）喝药，按当时分类取值得喝 6、收益小 7、持平 7，13 种药水（cases.json）。",
    "- 重建：decisions.jsonl 里那道 Jev 选线题 → states.jsonl 按 ts 二分定位、按 fingerprint 取状态（不整读）→ 当时生效的 run plan、本幕路线计划、上一张地图 → 用现在的代码（planCombatTurn，JEV_CONTEXT=v1）出题。",
    "- 旧题面 = 新题面去掉 `potion_experience` 和 `mechanics_experience` 两个键（即 v3 现状的 v1 题面）；两者的选项完全相同。每个局面新旧各问 Jev 一次，模型取 v3 .env 的 JEV_MODEL。",
    "- Jev 的回答只有 choice / confidence / probabilities，没有理由文本；下表用「P(喝本瓶)」= Jev 分给喝这瓶药的所有选项的概率之和，代替理由摘要。",
    "- 选项是现在的代码重建的：与日志里当时的选项逐条对比（plays 文本相同）见「与日志同」列；「类型」是现在代码的 fightKind（附表 A 按怪物类型把这 20 个都记为走廊）。",
    `- rollout 有时间预算，高负载下重建的 rollout 数字可能和问 Jev 时不同${drifted === null ? "" : drifted.length > 0 ? `（这次重建和发出去的选项文字不同的：${drifted.map((n) => `#${n}`).join("、")}）` : "（这次重建和发出去的选项逐字相同）"}；问 Jev 时新旧两题共用同一份选项，发出去的原文在 prompts.jsonl（不提交）。`,
    "- 每个题面只问了一次，没有测 Jev 自身的波动；几个百分点的概率差可能是噪声。",
    "",
    "## 汇总",
    "",
    "| 组 | 局面 | 喝本瓶（旧 → 新） | 平均 P(喝本瓶) | 平均置信度 | 选择不变 |",
    "|---|---|---|---|---|---|",
    line("全部", answered),
    ...["值得喝", "收益小", "持平"].map((group) => line(group, answered.filter((row) => row.case.group === group))),
    "",
    `- P(喝本瓶) 新题面下降 ${pDown} 个、上升 ${pUp} 个；置信度下降 ${cDown} 个、上升 ${cUp} 个。`,
    `- 输入 token 平均 ${tokensOld.toFixed(0)} → ${tokensNew.toFixed(0)}（+${(tokensNew - tokensOld).toFixed(0)}）。`,
    `- Jev 调用 ${results.length * 2} 次${results.length * 2 - answered.length * 2 > 0 ? `，其中出错 ${results.length * 2 - answered.length * 2} 次` : "，无出错"}。${skipped.length > 0 ? ` 未能重建：${skipped.map((skip) => `#${skip.n}（${skip.why}）`).join("、")}。` : ""}`,
    "",
    "## 逐个局面",
    "",
    "「当时分类」取自附表 A（Δ = 不喝最优的 rollout 期望掉血 − 喝的）。",
    "",
    "| # | 局 | 层 回合 类型 | 药水 | 当时分类 | 选项数 / 与日志同 | 旧题面 | 新题面 | 新题面多出的块 |",
    "|---|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

await main();
