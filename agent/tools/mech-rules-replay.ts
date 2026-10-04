/**
 * Offline replay of MECH_RULES (docs/mechanics-learning.md): the learned "stunned when a power is stripped to 0" rule on
 * every logged turn it can touch. No model is called. Each turn's first planning decision with a rule power up on a living
 * enemy (the rules from the given monster DB's `observed`, applied to the powers the solver counts down: today the
 * Thieving Hopper's Flutter) is rebuilt from its logged state and planned by the current code twice, MECH_RULES off and
 * on, as live (THIEF_FACTS on, the fight's first frame noted, the rollout and the random potions' Monte Carlo on a frozen
 * clock: the full 5 turns x 8 samples, seeds the board's).
 *
 * Per turn: code plays alone or asks Jev (off, on); the shown options and the rollout's best (off, on); the options that
 * set the stun off; the line played that turn (its logged plays), the solver's hp_lost for it off and on and the HP
 * actually lost; and, where the rollout's best or code's own line changed, the old and the new line's hp_lost under the
 * off model (what the change costs if the stun did not happen) and their loot-back share in the on rollout.
 *
 * Usage: npx tsx tools/mech-rules-replay.ts run [--shards 6] [--work experiments/mechanics] [--monster-db PATH] [--limit N]
 *        npx tsx tools/mech-rules-replay.ts report [--work …] [--out notes/mech-rules-replay.md]
 * Output: <work>/replay-<I>.jsonl (a row a turn) and the report.
 */
import { execFileSync, spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { stripStunRules } from "../src/knowledge/mechanics.js";
import { setMonsterDbForTests, type MonsterDb } from "../src/knowledge/monster-db.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type Decision, type DecisionEnv, type ScreenMemory } from "../src/project/types.js";
import { planCombatTurn, thiefTrace } from "../src/screens/combat-plan.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions, thiefSamples } from "../src/strategy/rollout-live.js";
import { backShare, noteFightStart } from "../src/strategy/thief.js";
import { STRIP_COUNTERS, type Plan } from "../src/strategy/turn-solver.js";
import { fromRoot } from "../src/core/paths.js";
import { KNOWLEDGE_DIR, knowledgeFile } from "../src/knowledge/files.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const stage = process.argv[2] ?? "run";
const work = arg("work", fromRoot("experiments/mechanics"));
const MONSTER_DB = arg("monster-db", knowledgeFile(KNOWLEDGE_DIR, "monster-db.json"));
const STATES = fromRoot("logs/states.jsonl");
const PY = fromRoot("data/logdb-venv/bin/python");
/** Labels of a fresh plan of the turn (tools/thief-facts-replay.ts's). */
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;

type Row = Record<string, unknown>;

/** The hook's last record, read through a function (planCombatTurn sets it; a read after the reset would narrow to null). */
function traced(): typeof thiefTrace.last {
  return thiefTrace.last;
}

function query(sql: string): Row[] {
  const out = execFileSync(PY, [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "1000000", "--timeout", "120", sql], { encoding: "utf8", maxBuffer: 1 << 30 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

/** A line's plays as the rationale writes them ("A -> X, B"). */
function playsOf(plan: Plan): string {
  return plan.steps.map((step) => (step.targetName ? `${step.name} -> ${step.targetName}` : step.name)).join(", ") || "end turn";
}

function criteriaOf(decision: Decision | null): Record<string, Row> {
  if (!decision || decision.kind !== "ask") return {};
  const criteria = (decision.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  return Object.fromEntries(Object.entries(criteria).filter(([key]) => /^plan\d+$/.test(key)).map(([key, text]) => [key, (text ? JSON.parse(text) : {}) as Row]));
}

const normal = (plays: unknown): string => String(plays ?? "").replace(/, then /g, ", ").replace(/^nothing \(end the turn now\)$/, "end turn");

/** The line a logged decision played: the rationale's plan text (tools/thief-facts-replay.ts playedOf). */
function playedOf(rationale: string): string | null {
  const jev = /chose plan \d+\/\d+ \((.*?)\)(?: with confidence|; plan)/.exec(rationale);
  if (jev) return jev[1]!;
  const code = /^(?:code plan \([^)]*\)|lethal|every simulated line dies; [^:]*|mod says ending the turn is lethal, solver disagrees; not ending it|code plan [^;]*is over the HP guard bound; playing) ?:? ?(.*?)(?:; hp [-+]| \(| \[|$)/.exec(rationale);
  return code ? code[1]!.trim() : null;
}

interface Side {
  kind: string;
  label: string;
  /** Code's own line (an act), or null. */
  act: string | null;
  shown: string[];
  best: string | null;
  /** Shown options whose line sets the learned stun off. */
  stunShown: string[];
}

export interface ReplayRow {
  run: string;
  floor: number;
  turn: number;
  asc: number;
  enemies: string;
  move: string;
  flutter: number;
  logged: { label: string; decider: string; played: string | null };
  off: Side;
  on: Side;
  /** The played line: hp_lost off / on (the solver's lines), the HP actually lost (null: no next frame), stunned in the game. */
  played: { offLoss: number | null; onLoss: number | null; actual: number | null; gameStun: boolean } | null;
  /** The line code would play or flag best, off and on, when they differ: hp_lost under the off model, loot back in the on rollout. */
  change: {
    from: string;
    to: string;
    /** This turn's hp_lost under the off model (no stun) and the on model, old and new line. */
    fromOffLoss: number | null;
    toOffLoss: number | null;
    fromOnLoss: number | null;
    toOnLoss: number | null;
    /** The new line sets the learned stun off this turn. */
    toStuns: boolean;
    /** The on rollout: expected HP lost from now to the fight's end (this turn included), and the loot back before the thief leaves. */
    fromFurther: number | null;
    toFurther: number | null;
    fromBack: number | null;
    toBack: number | null;
  } | null;
}

function sideOf(decision: Decision | null, plans: Plan[]): Side {
  const criteria = criteriaOf(decision);
  const best = Object.values(criteria).find((option) => option["rollout_best"] === true);
  const stunning = new Set(plans.filter((plan) => plan.outcome.enemyHpAfter.some((enemy) => enemy.strippedStun !== undefined && enemy.hp > 0)).map(playsOf));
  const shown = Object.values(criteria).map((option) => normal(option["plays"]));
  return {
    kind: decision?.kind ?? "none",
    label: decision?.label ?? "",
    act: decision?.kind === "act" ? decision.rationale : null,
    shown,
    best: best ? normal(best["plays"]) : null,
    stunShown: shown.filter((plays) => stunning.has(plays)),
  };
}

function shard(): void {
  const index = Number(arg("shard", "0"));
  const shards = Number(arg("shards", "1"));
  const limit = Number(arg("limit", "1000000"));
  mkdirSync(work, { recursive: true });
  const db = JSON.parse(readFileSync(MONSTER_DB, "utf8")) as MonsterDb;
  setMonsterDbForTests(db);
  const rules = stripStunRules(db.observed);
  const rulePowers = [...rules.keys()].filter((power) => power in STRIP_COUNTERS);
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  thiefTrace.enabled = true;
  const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
  const config = loadConfig({} as NodeJS.ProcessEnv);
  const monsters = Object.keys(db.monsters).filter((id) => rulePowers.some((power) => db.monsters[id]!.powers?.[power] !== undefined));
  if (monsters.length === 0) throw new Error(`no monster carries a rule power (${rulePowers.join(", ") || "no rules in the DB"})`);
  const fights = query(`SELECT run_id, floor, ascension, encounter, first_off, last_off FROM fights WHERE ${monsters.map((id) => `list_contains(monsters, '${id}')`).join(" OR ")} ORDER BY first_ts`);
  const fd = openSync(STATES, "r");
  const stateAt = (off: number, len: number): Record<string, unknown> => {
    const buffer = Buffer.alloc(len);
    readSync(fd, buffer, 0, len, off);
    return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Record<string, unknown>;
  };
  const out = join(work, `replay-${index}.jsonl`);
  writeFileSync(out, "");
  let done = 0;
  fights.forEach((fight, fightIndex) => {
    if (fightIndex % shards !== index || done >= limit) return;
    const run = String(fight["run_id"]);
    const frames = query(`SELECT off, len, ts, turn, observed, player_hp FROM frames WHERE run_id = '${run}' AND off BETWEEN ${Number(fight["first_off"])} AND ${Number(fight["last_off"])} AND screen = 'COMBAT' ORDER BY off`);
    const decisions = query(`SELECT ts, turn, label, decider, rationale FROM decisions WHERE run_id = '${run}' AND floor = ${Number(fight["floor"])} AND screen = 'COMBAT' ORDER BY ts`);
    const own = frames.filter((frame) => frame["observed"] !== true);
    if (own.length === 0) return;
    const memory = createScreenMemory("COMBAT");
    noteFightStart(memory, parseGameState(stateAt(Number(frames[0]!["off"]), Number(frames[0]!["len"]))));
    const seen = new Set<number>();
    for (const decision of decisions) {
      const turn = Number(decision["turn"]);
      if (!PLANNING.test(String(decision["label"])) || seen.has(turn)) continue;
      const frame = own.find((entry) => entry["ts"] === decision["ts"]);
      if (!frame) continue;
      seen.add(turn);
      const raw = stateAt(Number(frame["off"]), Number(frame["len"]));
      const living = (((raw["combat"] as Row | undefined)?.["enemies"] as Row[] | undefined) ?? []).filter((enemy) => enemy["is_alive"] !== false);
      const carrier = living.find((enemy) => ((enemy["powers"] as Row[] | undefined) ?? []).some((power) => rulePowers.includes(String(power["power_id"])) && Number(power["amount"]) > 0));
      if (!carrier) continue;
      const state = parseGameState(raw);
      const plan = (mech: boolean): { decision: Decision | null; plans: Plan[] } => {
        const env: DecisionEnv = {
          state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: { ...createScreenMemory("COMBAT"), thiefStart: memory.thiefStart } as ScreenMemory,
          thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [],
          jevContext: "v1", buildDecider: "deepseek", mechRules: mech,
        };
        thiefTrace.last = null;
        const decision = planCombatTurn(env);
        return { decision, plans: traced()?.plans ?? [] };
      };
      const offRun = plan(false);
      const onRun = plan(true);
      const onTrace = traced();
      const off = sideOf(offRun.decision, offRun.plans);
      const on = sideOf(onRun.decision, onRun.plans);
      const played = playedOf(String(decision["rationale"] ?? ""));
      const byPlays = (plans: Plan[], plays: string | null) => (plays === null ? undefined : plans.find((candidate) => playsOf(candidate) === plays));
      const next = own.find((entry) => Number(entry["turn"]) === turn + 1);
      const endFrame = [...own].reverse().find((entry) => Number(entry["turn"]) === turn);
      let gameStun = false;
      if (endFrame) {
        const end = (((stateAt(Number(endFrame["off"]), Number(endFrame["len"]))["combat"] as Row | undefined)?.["enemies"] as Row[] | undefined) ?? []).find((enemy) => enemy["index"] === carrier["index"]);
        gameStun = end?.["move_id"] === "STUNNED";
      }
      const playedOff = byPlays(offRun.plans, played);
      const playedOn = byPlays(onRun.plans, played);
      // Code's own line, else the rollout's best (each side's): what the rule changes.
      const lineOf = (side: Side): string | null => (side.act !== null ? playedOf(side.act) : side.best);
      const from = lineOf(off);
      const to = lineOf(on);
      const rolled = (plays: string | null) => (onTrace?.rollout?.available ? onTrace.rollout.result.lines.find((entry) => playsOf(entry.plan) === plays) : undefined);
      const back = (plays: string | null): number | null => {
        const line = rolled(plays);
        const thieves = onTrace?.thieves ?? [];
        const shares = line ? thieves.map((thief) => thiefSamples(line, thief)).filter((x): x is NonNullable<typeof x> => x !== null).map(backShare) : [];
        return shares.length > 0 ? Math.max(...shares) : null;
      };
      const row: ReplayRow = {
        run, floor: Number(fight["floor"]), turn, asc: Number(fight["ascension"]), enemies: String(fight["encounter"]), move: String(carrier["move_id"]),
        flutter: Number((((carrier["powers"] as Row[] | undefined) ?? []).find((power) => String(power["power_id"]) === "FLUTTER_POWER") ?? {})["amount"] ?? 0),
        logged: { label: String(decision["label"]), decider: String(decision["decider"]), played },
        off, on,
        played: played === null ? null : { offLoss: playedOff?.outcome.hpLoss ?? null, onLoss: playedOn?.outcome.hpLoss ?? null, actual: next ? Number(frame["player_hp"]) - Number(next["player_hp"]) : null, gameStun },
        change:
          from !== to
            ? {
                from: from ?? "-", to: to ?? "-",
                fromOffLoss: byPlays(offRun.plans, from)?.outcome.hpLoss ?? null, toOffLoss: byPlays(offRun.plans, to)?.outcome.hpLoss ?? null,
                fromOnLoss: byPlays(onRun.plans, from)?.outcome.hpLoss ?? null, toOnLoss: byPlays(onRun.plans, to)?.outcome.hpLoss ?? null,
                toStuns: byPlays(onRun.plans, to)?.outcome.enemyHpAfter.some((enemy) => enemy.strippedStun !== undefined && enemy.hp > 0) ?? false,
                fromFurther: rolled(from)?.hpLoss ?? null, toFurther: rolled(to)?.hpLoss ?? null, fromBack: back(from), toBack: back(to),
              }
            : null,
      };
      writeFileSync(out, `${JSON.stringify(row)}\n`, { flag: "a" });
      done += 1;
      console.error(`${run} F${row.floor} T${turn} flutter ${row.flutter} ${row.move}: off ${off.kind} on ${on.kind}${row.change ? ` CHANGE ${row.change.from} -> ${row.change.to}` : ""}`);
    }
  });
  closeSync(fd);
  console.error(`shard ${index}: ${done} turns -> ${out}`);
}

function report(): void {
  const outPath = arg("out", fromRoot("notes/mech-rules-replay.md"));
  const rows: ReplayRow[] = [];
  for (const file of readdirSync(work).filter((name) => /^replay-\d+\.jsonl$/.test(name)).sort()) {
    for (const line of readFileSync(join(work, file), "utf8").split("\n")) if (line) rows.push(JSON.parse(line) as ReplayRow);
  }
  rows.sort((a, b) => (a.run < b.run ? -1 : a.run > b.run ? 1 : a.floor - b.floor || a.turn - b.turn));
  const fights = new Set(rows.map((row) => `${row.run}:${row.floor}`)).size;
  const kinds = (side: "off" | "on", kind: string) => rows.filter((row) => row[side].kind === kind).length;
  const actToAsk = rows.filter((row) => row.off.kind === "act" && row.on.kind === "ask");
  const askToAct = rows.filter((row) => row.off.kind === "ask" && row.on.kind === "act");
  const bothAsk = rows.filter((row) => row.off.kind === "ask" && row.on.kind === "ask");
  const bestChanged = bothAsk.filter((row) => row.off.best !== row.on.best);
  const shownChanged = bothAsk.filter((row) => row.off.shown.join("|") !== row.on.shown.join("|"));
  const actChanged = rows.filter((row) => row.off.kind === "act" && row.on.kind === "act" && row.off.act !== row.on.act);
  const stunOffered = rows.filter((row) => row.on.stunShown.length > 0);
  const playedRows = rows.filter((row) => row.played && row.played.offLoss !== null && row.played.onLoss !== null && row.played.actual !== null);
  const stunPlayed = playedRows.filter((row) => row.played!.gameStun);
  const mean = (xs: number[]) => (xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const f1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
  const bias = (list: ReplayRow[], key: "offLoss" | "onLoss") => mean(list.map((row) => row.played!.actual! - row.played![key]!));
  const mae = (list: ReplayRow[], key: "offLoss" | "onLoss") => mean(list.map((row) => Math.abs(row.played!.actual! - row.played![key]!)));
  const changes = rows.filter((row) => row.change !== null);
  const known = (x: number | null): x is number => x !== null;
  // A change is worse when even the rule's own model says so: the new line's expected loss to the fight's end (the on
  // rollout's, this turn included) is higher than the old's, or it gets the loot back less often. Its risk if the stun did
  // not happen: the off-model difference of this turn (the logs: 41 of 41 strips stunned, no attack landed).
  const worse = changes.filter((row) => {
    const c = row.change!;
    return (known(c.fromFurther) && known(c.toFurther) && c.toFurther > c.fromFurther + 0.5) || (known(c.fromBack) && known(c.toBack) && c.toBack < c.fromBack);
  });
  const stunNow = changes.filter((row) => row.change!.toStuns);
  const risk = stunNow.map((row) => row.change!).filter((c) => known(c.toOffLoss) && known(c.fromOffLoss)).map((c) => c.toOffLoss! - c.fromOffLoss!);
  const where = (row: ReplayRow) => `${row.run} F${row.floor} T${row.turn}`;
  const md = [
    "# MECH_RULES 离线回放：学到的「层数打到 0 就眩晕」（2026-10-02）",
    "",
    "不调用任何模型。`npx tsx tools/mech-rules-replay.ts run --monster-db <带 observed 的怪物数据库>`：日志里每个「有规则能力（求解器能数层数的：今天只有偷窃草蜢的振翅）在场」的回合，",
    "取第一个规划决策，用现在的代码出题两次（MECH_RULES 关 / 开；THIEF_FACTS 开、战斗第一帧记进屏幕记忆，和对局一样；推演和随机药水蒙特卡洛用冻结的时钟跑满）。",
    "「当时打的线」取自当时的决策理由。机制、门槛见 docs/mechanics-learning.md；所有回合的残差（预测 vs 实际）见 notes/mechanics-residuals.md。",
    "",
    `共 ${rows.length} 个回合（${fights} 场）。代码自己打的：关 ${kinds("off", "act")} / 开 ${kinds("on", "act")}；问 Jev 的：关 ${kinds("off", "ask")} / 开 ${kinds("on", "ask")}。`,
    `代码自打 → 问 Jev：${actToAsk.length}${actToAsk.length > 0 ? `（${actToAsk.slice(0, 8).map(where).join("、")}）` : ""}；问 Jev → 代码自打：${askToAct.length}${askToAct.length > 0 ? `（${askToAct.slice(0, 8).map(where).join("、")}）` : ""}；代码自打的线变了：${actChanged.length}。`,
    `两边都问 Jev 的 ${bothAsk.length} 个里：选项变了 ${shownChanged.length}，rollout_best 变了 ${bestChanged.length}。开时选项里有打光振翅（眩晕）的线：${stunOffered.length} 个回合。`,
    "",
    "## 当时打的线：预测 vs 实际",
    "",
    `能在两边的线里找到当时打的线、有下回合血量的 ${playedRows.length} 个回合：偏差（实际 − 预测）关 ${f1(bias(playedRows, "offLoss"))} → 开 ${f1(bias(playedRows, "onLoss"))}，|误差| 关 ${f1(mae(playedRows, "offLoss"))} → 开 ${f1(mae(playedRows, "onLoss"))}。`,
    `其中游戏里振翅被打光、它眩晕了的 ${stunPlayed.length} 个：偏差 关 ${f1(bias(stunPlayed, "offLoss"))} → 开 ${f1(bias(stunPlayed, "onLoss"))}，|误差| 关 ${f1(mae(stunPlayed, "offLoss"))} → 开 ${f1(mae(stunPlayed, "onLoss"))}。`,
    "",
    "| 回合 | 振翅 | 招式 | 当时打的线 | 关 | 开 | 实际 | 游戏里眩晕 |",
    "|---|---|---|---|---|---|---|---|",
    ...stunPlayed.map((row) => `| ${where(row)} | ${row.flutter} | ${row.move} | ${row.logged.played} | ${row.played!.offLoss} | ${row.played!.onLoss} | ${row.played!.actual} | 是 |`),
    "",
    "## 代码自己的线或 rollout_best 变了的回合",
    "",
    `${changes.length} 个（「-」= 那一边没有唯一的最优：并列、或代码不问）。新线本回合就打光振翅、眩晕它的 ${stunNow.length} 个；其余是推演的后续回合里打光振翅改变了排序。`,
    `本回合眩晕的那些，如果眩晕没有发生（关的模型），新线比旧线本回合多掉 ${risk.length > 0 ? `${f1(mean(risk))}（最多 ${Math.max(...risk)}）` : "—"} 血；日志里 41 次打光 41 次眩晕，有攻击的 10 次全部取消、9 次可核对的没有一次打出伤害，打出的线里求解器说眩晕而游戏没眩晕的 0 次。`,
    "「本回合掉血」：关的模型（不认眩晕）/ 开的模型；「推演总掉血」= 开的推演里这条线到战斗结束的期望掉血（含本回合；「?」= 那条线不在开的推演里）；拿回率 = 开的推演里小偷逃走前被杀的样本比例。",
    "",
    "| 回合 | 振翅 | 招式 | 关：线 | 开：线 | 新线本回合眩晕 | 本回合掉血 关 旧→新 | 本回合掉血 开 旧→新 | 推演总掉血 旧→新 | 拿回率 旧→新 |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...changes.map((row) => {
      const c = row.change!;
      const n = (x: number | null) => (x === null ? "?" : String(Math.round(x * 10) / 10));
      return `| ${where(row)} | ${row.flutter} | ${row.move} | ${c.from} | ${c.to} | ${c.toStuns ? "是" : ""} | ${n(c.fromOffLoss)}→${n(c.toOffLoss)} | ${n(c.fromOnLoss)}→${n(c.toOnLoss)} | ${n(c.fromFurther)}→${n(c.toFurther)} | ${c.fromBack ?? "—"}→${c.toBack ?? "—"} |`;
    }),
    "",
    `连开的模型自己都认为更差的（推演总掉血更多，或拿回率更低）：${worse.length}${worse.length > 0 ? `：${worse.map(where).join("、")}` : ""}。`,
    "",
  ].join("\n");
  writeFileSync(outPath, md);
  console.log(`report: ${rows.length} turns, ${changes.length} changes, ${worse.length} worse -> ${outPath}`);
}

async function runAll(): Promise<void> {
  const shards = Number(arg("shards", "6"));
  mkdirSync(work, { recursive: true });
  const pass = ["work", "limit", "monster-db"].flatMap((name) => (process.argv.includes(`--${name}`) ? [`--${name}`, arg(name, "")] : []));
  await Promise.all(
    Array.from({ length: shards }, (_, i) =>
      new Promise<void>((resolve, reject) => {
        const child = spawn("nice", ["-n", "10", "npx", "tsx", fromRoot("agent/tools/mech-rules-replay.ts"), "shard", "--shard", String(i), "--shards", String(shards), ...pass], { stdio: ["ignore", "inherit", "inherit"] });
        child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`shard ${i} exited ${code}`))));
      }),
    ),
  );
  report();
}

if (stage === "shard") shard();
else if (stage === "report") report();
else await runAll();
