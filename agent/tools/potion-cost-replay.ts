/**
 * Offline acceptance of the potion cost (Dai 2026-09-30; src/reflex/potion-cost.ts, docs/potion-equivalents.md §8).
 * No model is called (no Jev, no DeepSeek): the recorded boards are rebuilt and planned by the current code twice, the
 * cost off (the ranking before) and on (the potion table knowledge/characters/ironclad/potion-equivalents.json), and what the rollout
 * picks is compared.
 *
 * Cases: notes/potion-drinks-2026-09-29.md appendix A (154 potions drunk outside a boss fight, with the note's class:
 * 值得喝 = 必须喝 + 收益大, 小收益, 持平) and 20 of appendix B's 32 boss drinks (the first 20 rows).
 * Per case: the decision row (decisions.jsonl: the Jev plan-choice at the case's floor and turn whose rationale names
 * the potion), its state (states.jsonl: binary search on the row's ts, then the fingerprint; never read whole), then
 * planCombatTurn with the rollout and the random potions' Monte Carlo given all the time they want (deterministic:
 * the seeds are the board's). The option flagged rollout_best (or the options tied for it) says whether the rollout's
 * pick drinks.
 *
 * Usage: npx tsx tools/potion-cost-replay.ts [--note ../notes/potion-drinks-2026-09-29.md] [--out experiments/potion-cost]
 *        [--only 12,40] [--boss 20] [--sample 1]
 * Output: <out>/cases.json (parsed from the note), <out>/results.jsonl, <out>/summary.md, and <out>/sample-<n>.json (the
 * cost-on question of the --sample cases, whole).
 */
import { closeSync, createReadStream, existsSync, mkdirSync, openSync, readFileSync, readSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { loadPotionEquivalents } from "../src/knowledge/potion-equivalents.js";
import { parseGameState, type GameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type Decision, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { potionCostOptions } from "../src/reflex/potion-cost.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import type { JsonValue } from "../src/core/util/json.js";
import { fromRoot, workspaceRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const notePath = arg("note", join(workspaceRoot(), "notes", "potion-drinks-2026-09-29.md"));
const outDir = arg("out", fromRoot("experiments/potion-cost"));
const only = new Set(arg("only", "").split(",").filter(Boolean).map(Number));
const bossCount = Number(arg("boss", "20"));
/** Cases whose cost-on question (options and potion_context) is written whole to <out>/sample-<n>.json. */
const samples = new Set(arg("sample", "1").split(",").filter(Boolean).map(Number));
const STATES = fromRoot("logs/states.jsonl");
const DECISIONS = fromRoot("logs/decisions.jsonl");
const RUNS = fromRoot("logs/runs.jsonl");

type Row = Record<string, JsonValue>;

/** One drink of the note's appendix A (non-boss; `n` its #) or B (boss; `n` = 1000 + its row). */
interface Case {
  n: number;
  boss: boolean;
  prefix: string;
  ascension: number;
  run: string | null;
  floor: number;
  turn: number;
  potion: string;
  who: string;
  /** The note's class (appendix A) and group: 值得喝 (必须喝 + 收益大), 小收益, 持平, or the rest. */
  class: string;
  group: string;
  delta: string;
}

/* ---- cases from the note --------------------------------------------------------------------------------- */

function groupOf(klass: string): string {
  if (klass.startsWith("必须喝") || klass.startsWith("收益大")) return "值得喝";
  if (klass.startsWith("收益小")) return "小收益";
  if (klass.startsWith("平手")) return "持平";
  return klass;
}

function parseCases(): Case[] {
  const text = readFileSync(notePath, "utf8");
  const section = (title: string): string[] => {
    const start = text.indexOf(title);
    if (start < 0) throw new Error(`${notePath}: no "${title}"`);
    const rest = text.slice(start).split("\n").slice(1);
    const end = rest.findIndex((line) => line.startsWith("## "));
    return (end < 0 ? rest : rest.slice(0, end)).filter((line) => /^\| *[^-#| ]/.test(line) && !line.startsWith("| # ") && !line.startsWith("| 局 "));
  };
  const cells = (line: string) => line.split("|").slice(1, -1).map((cell) => cell.trim());
  const runOf = (text: string) => /^(\w{4}) A(\d+)$/.exec(text) ?? (() => { throw new Error(`bad run cell ${text}`); })();
  const out: Case[] = [];
  for (const line of section("## 附表 A")) {
    const c = cells(line);
    const [, prefix, asc] = runOf(c[1]!);
    out.push({
      n: Number(c[0]), boss: false, prefix: prefix!, ascension: Number(asc), run: null, floor: Number(/F(\d+)/.exec(c[2]!)![1]), turn: Number(/T(\d+)/.exec(c[5]!)![1]),
      potion: c[6]!, who: c[7]!, class: c[13]!, group: groupOf(c[13]!), delta: c[12]!,
    });
  }
  section("## 附表 B").slice(0, bossCount).forEach((line, i) => {
    const c = cells(line);
    const [, prefix, asc] = runOf(c[0]!);
    out.push({ n: 1000 + i + 1, boss: true, prefix: prefix!, ascension: Number(asc), run: null, floor: Number(/F(\d+)/.exec(c[1]!)![1]), turn: Number(/T(\d+)/.exec(c[3]!)![1]), potion: c[4]!, who: c[5]!, class: "boss", group: "boss", delta: "" });
  });
  // The run ids: the note gives the first 4 characters and the ascension (runs.jsonl has the whole id).
  const runs = readFileSync(RUNS, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Row);
  for (const item of out) {
    const ids = [...new Set(runs.filter((run) => String(run["run_id"]).startsWith(item.prefix) && Number(run["ascension"]) === item.ascension).map((run) => String(run["run_id"])))];
    item.run = ids.length === 1 ? ids[0]! : null;
  }
  return out;
}

/* ---- logs ------------------------------------------------------------------------------------------------ */

/** The Jev plan-choice row of each case (decisions.jsonl, streamed once). */
async function scanDecisions(cases: Case[]): Promise<Map<number, Row>> {
  const runs = new Set(cases.map((item) => item.run).filter((run): run is string => run !== null));
  const rows = new Map<number, Row>();
  const lines = createInterface({ input: createReadStream(DECISIONS, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of lines) {
    const id = /"run_id":"([^"]*)"/.exec(line)?.[1];
    if (!id || !runs.has(id) || !line.includes('"combat/plan-choice')) continue;
    let row: Row;
    try {
      row = JSON.parse(line) as Row;
    } catch {
      continue;
    }
    if (!String(row["label"]).startsWith("combat/plan-choice") || row["decider"] !== "jev") continue;
    for (const item of cases) {
      if (rows.has(item.n) || item.run !== id || Number(row["floor"]) !== item.floor || Number(row["turn"]) !== item.turn) continue;
      if (String(row["rationale"]).includes(item.potion)) rows.set(item.n, row);
    }
  }
  return rows;
}

/** The ts that starts the first whole line at or after `offset` (null at the end of the file). */
function lineAt(fd: number, offset: number, size: number): { ts: string; start: number } | null {
  const chunk = Buffer.alloc(Math.min(1 << 20, size - offset));
  let start = offset;
  let position = offset;
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

/** The state row with the decision's ts and fingerprint. */
function stateOf(fd: number, size: number, decision: Row): Row | null {
  const ts = String(decision["ts"]);
  const fingerprint = String(decision["fingerprint"]);
  let position = seek(fd, size, ts);
  let tail = "";
  const chunk = Buffer.alloc(8 << 20);
  const limit = position + (64 << 20);
  while (position < limit) {
    const read = readSync(fd, chunk, 0, chunk.length, position);
    if (read <= 0) return null;
    position += read;
    const parts = (tail + chunk.subarray(0, read).toString("utf8")).split("\n");
    tail = parts.pop() ?? "";
    for (const line of parts) {
      const lineTs = /^\{"ts":"([^"]+)"/.exec(line)?.[1] ?? "";
      if (lineTs > ts) return null;
      if (lineTs !== ts) continue;
      const row = JSON.parse(line) as Row;
      if (row["fingerprint"] === fingerprint) return row;
    }
  }
  return null;
}

/* ---- one rebuild ----------------------------------------------------------------------------------------- */

interface OptionView {
  key: string;
  plays: string;
  drinksCase: boolean;
  drinksAny: boolean;
  best: boolean;
  tied: boolean;
  deaths: number | null;
  samples: number | null;
  loss: number | null;
  total: number | null;
  /** The rollout's later turns: the share of samples drinking any potion (the most drunk one's), and the case potion's. */
  laterAny: number;
  laterCase: number;
  noPotion: boolean;
}

interface Rebuilt {
  kind: "ask" | "act" | "none";
  label: string;
  options: OptionView[];
  /** Code's own act: whether it drinks. */
  actDrinks: boolean | null;
  /**
   * The rollout's pick this turn: "drink" (the case potion), "other" (another potion), "later" (none this turn, but its
   * later turns drink one in some samples), "dry" (none this turn nor later), "tie" (tied drinking and not), "none".
   */
  pick: "drink" | "other" | "later" | "dry" | "tie" | "none";
  /**
   * Not drinking dies (the cost on only): every potion-free line dies this turn (potion_context.no_potion_line), or every
   * line using no potion at all (this turn nor later: the no-potion line among them) dies in more samples than the best.
   */
  mustDrink: boolean;
  /** With mustDrink: the pick dies no more often than the best line, and uses a potion (now or later). */
  mustKept: boolean | null;
  noPotionLine: "own" | "merged" | "tagged" | "none";
}

const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

function rebuild(item: Case, stateRow: Row, costs: boolean): Rebuilt {
  potionCostOptions.enabled = costs;
  const state: GameState = parseGameState(stateRow["state"] as Record<string, unknown>);
  const memory = createScreenMemory("COMBAT");
  const env: DecisionEnv = {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: memory, thresholds: config.thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
  };
  const decision: Decision | null = planCombatTurn(env);
  if (!decision) return { kind: "none", label: "", options: [], actDrinks: null, pick: "none", mustDrink: false, mustKept: null, noPotionLine: "none" };
  if (decision.kind === "act") {
    const steps = [decision.intent, ...(memory.combatPlan?.remaining ?? [])].map((step) => JSON.stringify(step));
    const actDrinks = decision.intent?.action === "use_potion" || steps.some((step) => step.includes("POTION:"));
    return { kind: "act", label: decision.label, options: [], actDrinks, pick: actDrinks ? "drink" : "dry", mustDrink: false, mustKept: null, noPotionLine: "none" };
  }
  if (decision.kind !== "ask") return { kind: "none", label: "", options: [], actDrinks: null, pick: "none", mustDrink: false, mustKept: null, noPotionLine: "none" };
  const criteria = (decision.jevView?.questions ?? decision.questions)["plan"]!.criteria as Record<string, string | null>;
  if (costs && samples.has(item.n)) {
    const question = { case: item, potion_context: decision.state["potion_context"] ?? null, options: Object.fromEntries(Object.entries(criteria).map(([key, text]) => [key, JSON.parse(String(text)) as JsonValue])) };
    writeFileSync(join(outDir, `sample-${item.n}.json`), `${JSON.stringify(question, null, 1)}\n`);
  }
  const options: OptionView[] = Object.entries(criteria).map(([key, text]) => {
    const facts = JSON.parse(String(text)) as Record<string, JsonValue>;
    const plays = String(facts["plays"] ?? "");
    const rollout = String(facts["rollout"] ?? "");
    const dead = /dead within \d+ turns? in (\d+)\/(\d+)/.exec(rollout);
    const samples = /\((\d+) samples?\)/.exec(rollout);
    const loss = /expected further HP loss (-?[\d.]+)/.exec(rollout);
    const costFact = String(facts["potion_cost"] ?? "");
    const total = /; total (-?[\d.]+)$/.exec(costFact);
    const later = [...(/later turns: ([^)]*)\)/.exec(costFact)?.[1] ?? "").matchAll(/([^,]+?) in (\d+)\/(\d+) samples/g)].map((m) => ({ name: m[1]!.trim(), share: Number(m[2]) / Number(m[3]) }));
    const drinksAny = !/^plan\d+$/.test(key) || /(^|, |then )potion /.test(plays);
    return {
      key,
      plays: plays.slice(0, 200),
      drinksCase: drinksAny && plays.includes(item.potion),
      drinksAny,
      best: facts["rollout_best"] === true,
      tied: facts["rollout_tied"] !== undefined,
      deaths: dead ? Number(dead[1]) : loss ? 0 : null,
      samples: samples ? Number(samples[1]) : dead ? Number(dead[2]) : null,
      loss: loss ? Number(loss[1]) : null,
      total: total ? Number(total[1]) : null,
      laterAny: Math.max(0, ...later.map((entry) => entry.share)),
      laterCase: Math.max(0, ...later.filter((entry) => entry.name === item.potion).map((entry) => entry.share)),
      noPotion: facts["no_potion_fight"] !== undefined,
    };
  });
  const picked = options.filter((option) => option.best || option.tied);
  const pick: Rebuilt["pick"] =
    picked.length === 0
      ? "none"
      : picked.every((option) => option.drinksCase)
        ? "drink"
        : picked.every((option) => option.drinksAny)
          ? "other"
          : picked.every((option) => !option.drinksAny)
            ? picked.some((option) => option.laterAny > 0)
              ? "later"
              : "dry"
            : "tie";
  // "Not drinking dies" (the cost on): no potion-free line lives through this turn, or the no-potion line (no potion
  // for the whole fight) dies in more samples than the best line (deaths share over the samples).
  const share = (option: OptionView) => (option.deaths !== null && option.samples ? option.deaths / option.samples : null);
  const shares = options.map(share).filter((x): x is number => x !== null);
  const context = decision.state["potion_context"] as Record<string, JsonValue> | undefined;
  const noDry = options.every((option) => option.drinksAny) || context?.["no_potion_line"] !== undefined;
  // The lines using no potion at all (none this turn, none in any later turn of their rollout; the no-potion line is one).
  const dryShares = options.filter((option) => !option.drinksAny && option.laterAny === 0).map(share).filter((x): x is number => x !== null);
  const mustDrink = costs && shares.length > 0 && (noDry || (dryShares.length > 0 && Math.min(...dryShares) > Math.min(...shares)));
  const mustKept = !mustDrink
    ? null
    : picked.length > 0 && picked.every((option) => (share(option) ?? Infinity) <= Math.min(...shares) && (option.drinksAny || option.laterAny > 0) && !option.noPotion);
  const tagged = options.find((option) => option.noPotion);
  const noPotionLine = !tagged ? "none" : options.some((option) => option !== tagged && option.plays === tagged.plays) ? "own" : /\(no rollout/.test(String((JSON.parse(String(criteria[tagged.key])) as Record<string, JsonValue>)["no_potion_fight"])) ? "tagged" : "merged";
  return { kind: "ask", label: decision.label, options, actDrinks: null, pick, mustDrink, mustKept, noPotionLine };
}

/* ---- main ------------------------------------------------------------------------------------------------ */

interface Result {
  case: Case;
  skipped?: string;
  off?: Rebuilt;
  on?: Rebuilt;
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const all = parseCases();
  writeFileSync(join(outDir, "cases.json"), `${JSON.stringify(all, null, 1)}\n`);
  const cases = only.size > 0 ? all.filter((item) => only.has(item.n)) : all;
  const table = loadPotionEquivalents();
  console.log(`${all.length} cases (${all.filter((item) => !item.boss).length} non-boss, ${all.filter((item) => item.boss).length} boss); potion table generated ${table.meta.generated}`);
  // Deterministic: the rollout and the random potions' Monte Carlo get all the time they want (no clock cuts).
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.budgetMs = 120_000;
  potionMcOptions.now = () => 0;
  const rows = await scanDecisions(cases);
  const size = statSync(STATES).size;
  const fd = openSync(STATES, "r");
  const results: Result[] = [];
  const out = join(outDir, "results.jsonl");
  writeFileSync(out, "");
  try {
    for (const item of cases) {
      const result: Result = { case: item };
      if (item.who.startsWith("代码")) result.skipped = item.who.includes("果汁") ? "code drank Fruit Juice at once (combat/potion-now: before any line, no ranking)" : "code's only line (the solver dedupe bug fixed in 255ac1e)";
      else if (!item.run) result.skipped = `run ${item.prefix} A${item.ascension} not found (or not unique) in runs.jsonl`;
      else if (!rows.has(item.n)) result.skipped = "no Jev plan-choice row naming the potion at that floor and turn";
      if (!result.skipped) {
        const state = stateOf(fd, size, rows.get(item.n)!);
        if (!state) result.skipped = "state not found by ts + fingerprint";
        else {
          const t0 = Date.now();
          result.off = rebuild(item, state, false);
          result.on = rebuild(item, state, true);
          console.log(`#${item.n} ${item.prefix} F${item.floor} T${item.turn} ${item.potion} [${item.group}]: off ${result.off.kind}/${result.off.pick} on ${result.on.kind}/${result.on.pick}${result.on.mustDrink ? " must-drink" : ""} no-potion ${result.on.noPotionLine} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
        }
      }
      if (result.skipped) console.log(`#${item.n} skipped: ${result.skipped}`);
      results.push(result);
      writeFileSync(out, `${JSON.stringify(result)}\n`, { flag: "a" });
    }
  } finally {
    closeSync(fd);
  }
  writeFileSync(join(outDir, "summary.md"), summary(results, table.meta.generated));
  console.log(`wrote ${join(outDir, "summary.md")}`);
}

/* ---- the summary ----------------------------------------------------------------------------------------- */

const PICK_ZH: Record<Rebuilt["pick"], string> = { drink: "喝这瓶", other: "喝别的药", later: "本回合不喝（推演后续回合会喝）", dry: "本场不喝", tie: "并列（喝/不喝）", none: "无最优" };
/** This turn only: "later" and "dry" both drink nothing this turn (the cost-off question does not show the later drinks). */
const NOW = (pick: Rebuilt["pick"]): "drink" | "other" | "dry" | "tie" | "none" => (pick === "later" ? "dry" : pick);
const PICKS = ["drink", "other", "dry", "tie", "none"] as const;

function summary(results: Result[], generated: string): string {
  const nonBoss = results.filter((row) => !row.case.boss);
  const boss = results.filter((row) => row.case.boss);
  const done = nonBoss.filter((row) => row.on && row.off);
  const drinks = (r: Rebuilt) => r.pick === "drink" || r.pick === "other";
  const count = (rows: Result[], f: (row: Result) => boolean) => rows.filter(f).length;
  const groupRow = (label: string, rows: Result[]) => {
    const ok = rows.filter((row) => row.on && row.off);
    const pickCounts = (side: "off" | "on") => PICKS.map((pick) => count(ok, (row) => NOW(row[side]!.pick) === pick)).join(" / ");
    return `| ${label} | ${rows.length} | ${ok.length} | ${pickCounts("off")} | ${pickCounts("on")} | ${count(ok, (row) => row.on!.pick === "later")} | ${count(ok, (row) => drinks(row.off!) && NOW(row.on!.pick) === "dry")} | ${count(ok, (row) => NOW(row.off!.pick) === "dry" && drinks(row.on!))} |`;
  };
  const groups = ["值得喝", "小收益", "持平"];
  const others = [...new Set(nonBoss.map((row) => row.case.group))].filter((group) => !groups.includes(group));
  const must = done.filter((row) => row.on!.mustDrink);
  const mustDrinks = must.filter((row) => row.on!.mustKept === true);
  const mustNow = must.filter((row) => drinks(row.on!));
  const noteMust = done.filter((row) => row.case.class.startsWith("必须喝"));
  const skipped = results.filter((row) => row.skipped);
  const skipReasons = [...new Set(skipped.map((row) => row.skipped!))].map((why) => `${why}：${skipped.filter((row) => row.skipped === why).map((row) => (row.case.boss ? `B${row.case.n - 1000}` : `#${row.case.n}`)).join("、")}`);
  const noPotion = (kind: Rebuilt["noPotionLine"]) => count(done, (row) => row.on!.noPotionLine === kind);
  const bossDone = boss.filter((row) => row.on && row.off);
  const sameBoss = (row: Result) => JSON.stringify(row.off!.options.map((o) => [o.key, o.plays, o.best, o.tied, o.loss, o.deaths])) === JSON.stringify(row.on!.options.map((o) => [o.key, o.plays, o.best, o.tied, o.loss, o.deaths])) && NOW(row.off!.pick) === NOW(row.on!.pick) && row.off!.kind === row.on!.kind;
  const bossDiff = bossDone.filter((row) => !sameBoss(row));
  const line = (row: Result) => {
    const c = row.case;
    const r = (x?: Rebuilt) => (!x ? "—" : x.kind === "act" ? `代码自己打（${x.actDrinks ? "喝" : "不喝"}）` : PICK_ZH[x.pick]);
    const best = (x?: Rebuilt) => x?.options.filter((o) => o.best || o.tied).map((o) => `${o.key}${o.total !== null ? ` 合计${o.total}` : o.loss !== null ? ` 掉${o.loss}` : ""}${o.deaths ? ` 死${o.deaths}/${o.samples}` : ""}`).join("，") ?? "";
    return `| ${c.boss ? `B${c.n - 1000}` : c.n} | ${c.prefix} A${c.ascension} | F${c.floor} T${c.turn} | ${c.potion} | ${c.boss ? "boss" : `${c.group}（Δ ${c.delta}）`} | ${row.skipped ? `未重算：${row.skipped}` : r(row.off)} | ${row.skipped ? "" : `${r(row.on)}${row.on?.mustDrink ? "，不喝会死" : ""}`} | ${row.skipped ? "" : best(row.on)} | ${row.on?.noPotionLine ?? ""} |`;
  };
  return [
    "# 药水代价：离线回放（不调用任何模型）",
    "",
    `由 \`npx tsx tools/potion-cost-replay.ts\` 生成（${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC；换算表 ${generated}）。`,
    "",
    "- 局面：notes/potion-drinks-2026-09-29.md 附表 A 的 154 次非 boss 战喝药（分类取自附表：值得喝 = 必须喝 + 收益大，小收益，持平），附表 B 的前 20 次 boss 战喝药。",
    "- 重建：decisions.jsonl 里那道 Jev 选线题（同层同回合、理由里有这瓶药）→ states.jsonl 按 ts 二分、按 fingerprint 取状态 → 现在的代码 planCombatTurn 出题两次：代价关（接入前的排序）和代价开（src/knowledge/potion-equivalents.json）。推演和随机药水的蒙特卡洛不限时（结果由局面的种子决定，可复现）。没有恢复当时的 DeepSeek 战斗计划、路线计划和本场前几回合的记忆，所以选项和当时记录的不完全一样；这里只比较同一个重建局面在代价关/开下推演选谁。",
    "- 「推演最优」= 标 rollout_best 的选项；几个选项并列时看并列的全部：都喝 → 喝，都不喝 → 不喝，有喝有不喝 → 并列。代码自己打（不问 Jev）的局面看它打的线喝不喝。",
    "- 「不喝会死」= 代价开时不喝药的线本回合全死，或所有整场不用药的线（本回合不喝、推演后续回合也不喝，「本场不用药」的线是其中之一）推演死亡比例都高于最好的线。",
    "",
    "## 汇总（非 boss 154 次）",
    "",
    "推演最优的计数顺序：本回合喝这瓶 / 本回合喝别的药 / 本回合不喝 / 并列（喝与不喝） / 无最优（没有推演）。代码自己打（不问 Jev）的局面按它打的线算喝或不喝。「其中后续会喝」= 代价开时本回合不喝、但它的推演后续回合在部分样本里喝药（代价关的题面不显示后续回合喝药，所以只有代价开这一列）。「喝 → 不喝」「不喝 → 喝」只数本回合喝不喝变了的（并列、无最优不算）。",
    "",
    "| 分类 | 次数 | 重算 | 代价关 | 代价开 | 其中后续会喝 | 喝 → 不喝 | 不喝 → 喝 |",
    "|---|---|---|---|---|---|---|---|",
    groupRow("全部", nonBoss),
    ...groups.map((group) => groupRow(group, nonBoss.filter((row) => row.case.group === group))),
    ...others.map((group) => groupRow(group, nonBoss.filter((row) => row.case.group === group))),
    "",
    `- 代价开时推演最优本回合仍喝药（这瓶或别的药）：${count(done, (row) => drinks(row.on!))}/${done.length}；本回合不喝：${count(done, (row) => row.on!.pick === "later" || row.on!.pick === "dry")}（其中推演后续回合会喝 ${count(done, (row) => row.on!.pick === "later")}，本场不喝 ${count(done, (row) => row.on!.pick === "dry")}）；并列：${count(done, (row) => row.on!.pick === "tie")}；无最优：${count(done, (row) => row.on!.pick === "none")}。代价关时（同一重建）本回合喝 ${count(done, (row) => drinks(row.off!))}、不喝 ${count(done, (row) => row.off!.pick === "later" || row.off!.pick === "dry")}、并列 ${count(done, (row) => row.off!.pick === "tie")}、无最优 ${count(done, (row) => row.off!.pick === "none")}。`,
    `- **不喝会死**的局面（代价开时判定，见上）：${must.length} 个；推演最优的死亡比例是最低的、而且用了药（本回合或后续回合）的 ${mustDrinks.length}/${must.length}${must.length > 0 ? `（${Math.round((100 * mustDrinks.length) / must.length)}%）` : ""}，其中本回合就喝的 ${mustNow.length}。附表里分类为「必须喝」的 ${noteMust.length} 个：代价开时 ${noteMust.map((row) => `#${row.case.n} ${PICK_ZH[row.on!.pick]}${row.on!.mustDrink ? "（判为不喝会死）" : ""}`).join("；")}。`,
    `- 「本场不用药」的线（代价开）：单独成一个选项 ${noPotion("own")} 次，并入原选项 ${noPotion("merged")} 次，没有推演只标原选项 ${noPotion("tagged")} 次，没有这条线 ${noPotion("none")} 次（不喝的线本回合全死，或代码自己打）。`,
    `- 未重算 ${skipped.filter((row) => !row.case.boss).length} 次（boss ${skipped.filter((row) => row.case.boss).length} 次）：${skipReasons.join("；") || "无"}。`,
    "",
    "## boss 战抽查（附表 B 前 20 次）",
    "",
    `重算 ${bossDone.length} 次：代价关/开的选项（顺序、打法）、每个选项的推演期望掉血和死亡、推演最优和并列完全相同 ${bossDone.length - bossDiff.length}/${bossDone.length}${bossDiff.length > 0 ? `；不同的：${bossDiff.map((row) => `B${row.case.n - 1000}`).join("、")}` : ""}。boss 战没有「本场不用药」的线：${count(bossDone, (row) => row.on!.noPotionLine === "none")}/${bossDone.length} 次没有。`,
    "",
    "## 逐个局面",
    "",
    "| # | 局 | 层 回合 | 药水 | 附表分类 | 代价关：推演最优 | 代价开：推演最优 | 代价开的最优选项（合计 = 本场掉血 + 药水代价） | 本场不用药的线 |",
    "|---|---|---|---|---|---|---|---|---|",
    ...results.map(line),
    "",
  ].join("\n");
}

if (existsSync(STATES)) await main();
else console.error(`${STATES} missing: run from the repository root (logs/ linked)`);
