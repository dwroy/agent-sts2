/**
 * Offline replay of MECH_DEATH_MOVE (docs/mechanics-learning.md §9): the learned "an ally's death changes a survivor's
 * move" rules (knowledge/mechanics.ts deathRules, from the monster DB's `observed.ally_deaths`) on every logged turn they
 * can touch. No model is called. Each turn's first planning decision (per SL attempt) with a rule's survivor and its ally
 * both alive (the Queen beside the Torch Head Amalgam, the Living Shield beside the Turret Operator) is rebuilt from its logged state and planned by the current code twice, MECH_DEATH_MOVE off and on
 * (MECH_RULES and MECH_MOVE_RULES on both times), as live: the rollout and the random potions' Monte Carlo on a frozen
 * clock (the full 5 turns x 8 samples, seeds the board's), the whole-fight boss simulation (B2) off.
 *
 * Per turn: code plays alone or asks Jev (off, on); the shown options and the rollout's best; the options whose line kills
 * the ally (on: their death_move fact); the rollout's best killing line and best other line (expected HP lost to the
 * fight's end with the potions' cost, deaths per 8 samples) off and on; whether the ally died that turn in the log and
 * whether we then died to the survivor's first move after it (the Queen's first Off With Your Head).
 *
 * Usage: npx tsx tools/death-move-replay.ts run [--shards 4] [--work experiments/deathmove] [--monster-db PATH] [--limit N]
 *        npx tsx tools/death-move-replay.ts report [--work …] [--out notes/death-move-replay.md]
 * Output: <work>/death-replay-<I>.jsonl (a row a turn, not committed) and the report.
 */
import { execFileSync, spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { deathRulesOf } from "../src/knowledge/mechanics.js";
import { setMonsterDbForTests, type MonsterDb } from "../src/knowledge/monster-db.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type Decision, type DecisionEnv, type ScreenMemory } from "../src/project/types.js";
import { facingFightOf, planCombatTurn, thiefTrace } from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import type { LineEstimate } from "../src/strategy/rollout.js";
import { effectiveFightLoss, rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import type { Plan } from "../src/strategy/turn-solver.js";
import { fromRoot } from "../src/core/paths.js";
import { KNOWLEDGE_DIR, knowledgeFile } from "../src/knowledge/files.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const stage = process.argv[2] ?? "run";
const work = arg("work", fromRoot("experiments/deathmove"));
const MONSTER_DB = arg("monster-db", knowledgeFile(KNOWLEDGE_DIR, "monster-db.json"));
const STATES = fromRoot("logs/states.jsonl");
const PY = fromRoot("data/logdb-venv/bin/python");
/** Labels of a fresh plan of the turn (tools/mech-move-replay.ts's). */
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;

type Row = Record<string, unknown>;

/** The planner's last trace (a function: TypeScript would keep the `null` assigned before the call). */
function traced(): typeof thiefTrace.last {
  return thiefTrace.last;
}

function query(sql: string): Row[] {
  const out = execFileSync(PY, [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "1000000", "--timeout", "120", sql], { encoding: "utf8", maxBuffer: 1 << 30 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

function playsOf(plan: Plan): string {
  return plan.steps.map((step) => (step.targetName ? `${step.name} -> ${step.targetName}` : step.name)).join(", ") || "end turn";
}

function criteriaOf(decision: Decision | null): Record<string, Row> {
  if (!decision || decision.kind !== "ask") return {};
  const criteria = (decision.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  return Object.fromEntries(Object.entries(criteria).filter(([key]) => /^plan\d+$/.test(key)).map(([key, text]) => [key, (text ? JSON.parse(text) : {}) as Row]));
}

const normal = (plays: unknown): string => String(plays ?? "").replace(/, then /g, ", ").replace(/^nothing \(end the turn now\)$/, "end turn");

/** The line a logged decision played: the rationale's plan text (tools/mech-move-replay.ts playedOf). */
function playedOf(rationale: string): string | null {
  const jev = /chose plan \d+\/\d+ \((.*?)\)(?: with confidence|; plan)/.exec(rationale);
  if (jev) return jev[1]!;
  const code = /^(?:code plan \([^)]*\)|lethal|every simulated line dies; [^:]*|mod says ending the turn is lethal, solver disagrees; not ending it|code plan [^;]*is over the HP guard bound; playing) ?:? ?(.*?)(?:; hp [-+]| \(| \[|$)/.exec(rationale);
  return code ? code[1]!.trim() : null;
}

/** One rollout line as the report reads it. */
interface Rolled {
  plays: string;
  /** Expected HP lost from now to the fight's end with the potions' cost (effectiveFightLoss), deaths of the samples. */
  loss: number;
  deaths: number;
  samples: number;
  value: number;
}

interface Side {
  kind: string;
  label: string;
  act: string | null;
  shown: string[];
  best: string | null;
  /** Shown options that kill the ally this turn (on: their death_move fact; off: the ally at 0 in the line). */
  killShown: string[];
  /** Each shown option's hp_lost. */
  losses: Record<string, number>;
  /** The rollout's best line that kills the ally this turn and best one that does not (by its own value), or null. */
  killBest: Rolled | null;
  keepBest: Rolled | null;
  /** Solver lines (all) that kill the ally this turn. */
  killable: number;
}

export interface DeathReplayRow {
  run: string;
  floor: number;
  turn: number;
  attempt: number;
  asc: number;
  survivor: string;
  ally: string;
  allyHp: number;
  hp: number;
  /** The ally died during this turn in the log (dead or gone at the next turn's first decision frame, or the fight ended there in our death). */
  allyDied: boolean;
  /** ... and we died in the fight on the next turn (the survivor's first move after the death: the Queen's first Off With Your Head). */
  diedNextTurn: boolean;
  /** The fight's outcome for this attempt: died / won / ? */
  outcome: string;
  logged: { label: string; decider: string; played: string | null; killed: boolean | null };
  off: Side;
  on: Side;
  change: { from: string; to: string; fromKills: boolean | null; toKills: boolean | null; fromOn: Rolled | null; toOn: Rolled | null; fromOff: Rolled | null; toOff: Rolled | null } | null;
}

function rolledOf(line: LineEstimate | undefined): Rolled | null {
  if (!line) return null;
  return { plays: playsOf(line.plan), loss: Math.round(effectiveFightLoss(line) * 10) / 10, deaths: line.deaths, samples: line.samples, value: Math.round(line.value * 10) / 10 };
}

function shard(): void {
  const index = Number(arg("shard", "0"));
  const shards = Number(arg("shards", "1"));
  const limit = Number(arg("limit", "1000000"));
  mkdirSync(work, { recursive: true });
  const db = JSON.parse(readFileSync(MONSTER_DB, "utf8")) as MonsterDb;
  setMonsterDbForTests(db);
  const rules = deathRulesOf(db);
  const pairs = [...rules].flatMap(([survivor, list]) => list.map((rule) => [survivor, rule.ally] as const));
  if (pairs.length === 0) throw new Error("no learned death rule in the monster DB");
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
  thiefTrace.enabled = true;
  const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
  const config = loadConfig({} as NodeJS.ProcessEnv);
  const fights = query(
    `SELECT run_id, fight_no, floor, ascension, encounter, outcome, first_off, last_off, first_ts FROM fights WHERE ${pairs.map(([a, b]) => `(list_contains(monsters, '${a}') AND list_contains(monsters, '${b}'))`).join(" OR ")} ORDER BY first_ts`,
  );
  const fd = openSync(STATES, "r");
  const stateAt = (off: number, len: number): Record<string, unknown> => {
    const buffer = Buffer.alloc(len);
    readSync(fd, buffer, 0, len, off);
    return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Record<string, unknown>;
  };
  const out = join(work, `death-replay-${index}.jsonl`);
  writeFileSync(out, "");
  let done = 0;
  fights.forEach((fight, fightIndex) => {
    if (fightIndex % shards !== index || done >= limit) return;
    const run = String(fight["run_id"]);
    const frames = query(`SELECT off, len, ts, turn, observed, player_hp, enemies, screen FROM frames WHERE run_id = '${run}' AND off BETWEEN ${Number(fight["first_off"])} AND ${Number(fight["last_off"]) + 1} ORDER BY off`);
    const decisions = query(`SELECT ts, turn, label, decider, rationale, action, target_index FROM decisions WHERE run_id = '${run}' AND floor = ${Number(fight["floor"])} AND screen = 'COMBAT' AND ts >= '${String(fight["first_ts"])}' ORDER BY ts`);
    // Decision frames of the fight, split into SL attempts (an attempt starts again at turn 1: the room-entry save).
    const own = frames.filter((frame) => frame["observed"] !== true && frame["screen"] === "COMBAT" && frame["turn"] !== null);
    const attemptOf = new Map<Row, number>();
    let attempt = 0;
    let lastTurn = 0;
    for (const frame of own) {
      if (Number(frame["turn"]) < lastTurn) attempt += 1;
      lastTurn = Number(frame["turn"]);
      attemptOf.set(frame, attempt);
    }
    const attempts = attempt + 1;
    const seen = new Set<string>();
    for (const decision of decisions) {
      const turn = Number(decision["turn"]);
      if (!PLANNING.test(String(decision["label"]))) continue;
      const frame = own.find((entry) => entry["ts"] === decision["ts"]);
      if (!frame) continue;
      const at = attemptOf.get(frame)!;
      if (seen.has(`${at}:${turn}`)) continue;
      seen.add(`${at}:${turn}`);
      const raw = stateAt(Number(frame["off"]), Number(frame["len"]));
      const combat = (raw["combat"] as Row | undefined) ?? {};
      const living = ((combat["enemies"] as Row[] | undefined) ?? []).filter((enemy) => enemy["is_alive"] !== false && Number(enemy["current_hp"]) > 0);
      const ids = new Set(living.map((enemy) => String(enemy["enemy_id"])));
      const pair = pairs.find(([survivor, ally]) => ids.has(survivor) && ids.has(ally));
      if (!pair) continue;
      const [survivor, ally] = pair;
      const attemptFrames = own.filter((entry) => attemptOf.get(entry) === at);
      const next = attemptFrames.find((entry) => Number(entry["turn"]) === turn + 1);
      const allyAlive = (entry: Row | undefined) => ((entry?.["enemies"] as Row[] | undefined) ?? []).some((enemy) => enemy["id"] === ally && enemy["alive"] !== false && Number(enemy["hp"]) > 0);
      const lastOfAttempt = attemptFrames[attemptFrames.length - 1];
      const outcome = at < attempts - 1 ? "died" : String(fight["outcome"] ?? "?");
      const allyDied = next ? !allyAlive(next) : false;
      const diedNextTurn = allyDied && outcome === "died" && Number(lastOfAttempt?.["turn"]) === turn + 1;
      const state = parseGameState(raw);
      const earlier = decisions.filter((entry) => String(entry["ts"]) < String(decision["ts"]) && entry["target_index"] !== null && entry["target_index"] !== undefined && entry["action"] !== "end_turn");
      const facing = earlier.length > 0 ? Number(earlier[earlier.length - 1]!["target_index"]) : null;
      const allyIndex = (() => {
        const found = living.find((enemy) => String(enemy["enemy_id"]) === ally);
        return found ? Number(found["index"]) : -1;
      })();
      const kills = (plan: Plan) => !plan.outcome.winsFight && plan.outcome.enemyHpAfter.some((enemy) => enemy.index === allyIndex && enemy.hp <= 0);
      const plan = (on: boolean): { decision: Decision | null; plans: Plan[]; side: Side } => {
        const env: DecisionEnv = {
          state, knowledge, brief: buildRunBrief(state, knowledge),
          screenMemory: { ...createScreenMemory("COMBAT"), ...(facing !== null ? { facing, facingFight: facingFightOf(state) } : {}) } as ScreenMemory,
          thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [],
          jevContext: "v1", buildDecider: "deepseek", mechRules: true, mechMoveRules: true, mechDeathMove: on, thiefFacts: true,
        };
        thiefTrace.last = null;
        const decision = planCombatTurn(env);
        const trace = traced();
        const plans = trace?.plans ?? [];
        const criteria = criteriaOf(decision);
        const shownPlans = Object.values(criteria);
        const best = shownPlans.find((option) => option["rollout_best"] === true);
        const lines = trace?.rollout?.available ? trace.rollout.result.lines : [];
        const byValue = (list: LineEstimate[]) => [...list].sort((a, b) => b.value - a.value)[0];
        const side: Side = {
          kind: decision?.kind ?? "none",
          label: decision?.label ?? "",
          act: decision?.kind === "act" ? decision.rationale : null,
          shown: shownPlans.map((option) => normal(option["plays"])),
          best: best ? normal(best["plays"]) : null,
          killShown: (on ? shownPlans.filter((option) => option["death_move"] !== undefined) : shownPlans.filter((option) => {
            const found = plans.find((candidate) => playsOf(candidate) === normal(option["plays"]));
            return found ? kills(found) : false;
          })).map((option) => normal(option["plays"])),
          losses: Object.fromEntries(shownPlans.map((option) => [normal(option["plays"]), Number(option["hp_lost"] ?? NaN)])),
          killBest: rolledOf(byValue(lines.filter((line) => kills(line.plan)))),
          keepBest: rolledOf(byValue(lines.filter((line) => !kills(line.plan) && !line.plan.outcome.winsFight))),
          killable: plans.filter(kills).length,
        };
        return { decision, plans, side };
      };
      const offRun = plan(false);
      const offLines = traced()?.rollout;
      const onRun = plan(true);
      const onLines = traced()?.rollout;
      const played = playedOf(String(decision["rationale"] ?? ""));
      const lineOf = (side: Side): string | null => (side.act !== null ? playedOf(side.act) : side.best);
      const from = lineOf(offRun.side);
      const to = lineOf(onRun.side);
      const find = (plans: Plan[], plays: string | null) => (plays === null ? undefined : plans.find((candidate) => playsOf(candidate) === plays));
      const rolled = (r: typeof onLines, plays: string | null) => (r?.available ? rolledOf(r.result.lines.find((entry) => playsOf(entry.plan) === plays)) : null);
      const killsOf = (plays: string | null) => {
        const found = find(onRun.plans, plays) ?? find(offRun.plans, plays);
        return found ? kills(found) : null;
      };
      const row: DeathReplayRow = {
        run, floor: Number(fight["floor"]), turn, attempt: at, asc: Number(fight["ascension"]), survivor, ally,
        allyHp: Number(living.find((enemy) => String(enemy["enemy_id"]) === ally)?.["current_hp"] ?? 0), hp: Number(frame["player_hp"]),
        allyDied, diedNextTurn, outcome,
        logged: { label: String(decision["label"]), decider: String(decision["decider"]), played, killed: killsOf(played) },
        off: offRun.side, on: onRun.side,
        change: from !== to ? { from: from ?? "-", to: to ?? "-", fromKills: killsOf(from), toKills: killsOf(to), fromOn: rolled(onLines, from), toOn: rolled(onLines, to), fromOff: rolled(offLines, from), toOff: rolled(offLines, to) } : null,
      };
      writeFileSync(out, `${JSON.stringify(row)}\n`, { flag: "a" });
      done += 1;
      console.error(`${run} F${row.floor} T${turn}#${at} ${survivor}: off ${offRun.side.kind} on ${onRun.side.kind}${row.change ? ` CHANGE ${row.change.from} -> ${row.change.to}` : ""}`);
    }
  });
  closeSync(fd);
  console.error(`shard ${index}: ${done} turns -> ${out}`);
}

function report(): void {
  const outPath = arg("out", fromRoot("notes/death-move-replay.md"));
  const rows: DeathReplayRow[] = [];
  for (const file of readdirSync(work).filter((name) => /^death-replay-\d+\.jsonl$/.test(name)).sort()) {
    for (const line of readFileSync(join(work, file), "utf8").split("\n")) if (line) rows.push(JSON.parse(line) as DeathReplayRow);
  }
  rows.sort((a, b) => (a.run < b.run ? -1 : a.run > b.run ? 1 : a.floor - b.floor || a.attempt - b.attempt || a.turn - b.turn));
  const where = (row: DeathReplayRow) => `${row.run} F${row.floor} T${row.turn}${row.attempt > 0 ? `（第 ${row.attempt + 1} 次）` : ""}`;
  const n = (x: number | null | undefined) => (x === null || x === undefined ? "?" : String(Math.round(x * 10) / 10));
  const r = (x: Rolled | null) => (x ? `${n(x.loss)}，死 ${x.deaths}/${x.samples}` : "—");
  const section = (title: string, list: DeathReplayRow[]): string[] => {
    const fights = new Set(list.map((row) => `${row.run}:${row.floor}:${row.attempt}`)).size;
    const kinds = (side: "off" | "on", kind: string) => list.filter((row) => row[side].kind === kind).length;
    const actToAsk = list.filter((row) => row.off.kind === "act" && row.on.kind === "ask");
    const askToAct = list.filter((row) => row.off.kind === "ask" && row.on.kind === "act");
    const bothAsk = list.filter((row) => row.off.kind === "ask" && row.on.kind === "ask");
    const bestChanged = bothAsk.filter((row) => row.off.best !== row.on.best);
    const shownChanged = bothAsk.filter((row) => row.off.shown.join("|") !== row.on.shown.join("|"));
    const lossChanged = bothAsk.filter((row) => row.on.shown.some((plays) => row.off.losses[plays] !== undefined && row.off.losses[plays] !== row.on.losses[plays]));
    const actChanged = list.filter((row) => row.off.kind === "act" && row.on.kind === "act" && row.off.act !== row.on.act);
    const killable = list.filter((row) => row.on.killable > 0);
    const changes = list.filter((row) => row.change !== null);
    const toKeep = changes.filter((row) => row.change!.fromKills === true && row.change!.toKills === false);
    const toKill = changes.filter((row) => row.change!.fromKills === false && row.change!.toKills === true);
    const worse = changes.filter((row) => {
      const c = row.change!;
      return c.fromOn && c.toOn && c.toOn.loss > c.fromOn.loss + 0.5 && !(c.toOn.deaths < c.fromOn.deaths);
    });
    return [
      `## ${title}`,
      "",
      `${list.length} 个回合（${fights} 场 / 次尝试），其中能杀掉盟友的（开：求解器至少一条线杀它）${killable.length} 个、日志里当回合它死了的 ${list.filter((row) => row.allyDied).length} 个。`,
      `代码自己打的：关 ${kinds("off", "act")} / 开 ${kinds("on", "act")}；问 Jev 的：关 ${kinds("off", "ask")} / 开 ${kinds("on", "ask")}。`,
      `代码自打 → 问 Jev：${actToAsk.length}${actToAsk.length > 0 ? `（${actToAsk.slice(0, 8).map(where).join("、")}）` : ""}；问 Jev → 代码自打：${askToAct.length}${askToAct.length > 0 ? `（${askToAct.slice(0, 8).map(where).join("、")}）` : ""}；代码自打的线变了：${actChanged.length}${actChanged.length > 0 ? `（${actChanged.slice(0, 8).map(where).join("、")}）` : ""}。`,
      `两边都问 Jev 的 ${bothAsk.length} 个里：选项变了 ${shownChanged.length}，选项的 hp_lost 变了 ${lossChanged.length}，rollout_best 变了 ${bestChanged.length}。开时选项里有 death_move 事实的：${list.filter((row) => row.on.killShown.length > 0).length} 个回合。`,
      `代码自己的线或 rollout_best 变了的 ${changes.length} 个：从「杀盟友」换成「不杀」${toKeep.length} 个，反过来 ${toKill.length} 个；开的推演自己都认为更差的（含药水代价的总掉血多 0.5 以上、死亡样本不更少）：${worse.length}${worse.length > 0 ? `（${worse.map(where).join("、")}）` : ""}。`,
      "",
      `推演对「这回合杀盟友的最好线」的看法（${killable.length} 个能杀的回合，到战斗结束的期望掉血含药水代价 / 8 个样本里死几个；关 → 开）：`,
      `杀的线期望掉血 关 ${n(mean(killable.map((row) => row.off.killBest?.loss)))} → 开 ${n(mean(killable.map((row) => row.on.killBest?.loss)))}，死亡样本 关 ${n(mean(killable.map((row) => row.off.killBest?.deaths)))} → 开 ${n(mean(killable.map((row) => row.on.killBest?.deaths)))}；`,
      `不杀的线 关 ${n(mean(killable.map((row) => row.off.keepBest?.loss)))} → 开 ${n(mean(killable.map((row) => row.on.keepBest?.loss)))}，死亡样本 关 ${n(mean(killable.map((row) => row.off.keepBest?.deaths)))} → 开 ${n(mean(killable.map((row) => row.on.keepBest?.deaths)))}。`,
      "",
      ...(changes.length > 0
        ? [
            "| 回合 | HP | 盟友 HP | 日志：它死了 / 下回合我们死了 | 关：线 | 开：线 | 新线杀它 | 开的推演 旧线 | 开的推演 新线 | 关的推演 旧线 |",
            "|---|---|---|---|---|---|---|---|---|---|",
            ...changes.map((row) => {
              const c = row.change!;
              return `| ${where(row)} | ${row.hp} | ${row.allyHp} | ${row.allyDied ? "是" : ""}${row.diedNextTurn ? " / 是" : ""} | ${c.from} | ${c.to} | ${c.toKills === null ? "?" : c.toKills ? "是" : "否"} | ${r(c.fromOn)} | ${r(c.toOn)} | ${r(c.fromOff)} |`;
            }),
            "",
          ]
        : []),
    ];
  };
  const chop = rows.filter((row) => row.survivor === "QUEEN" && row.allyDied && row.diedNextTurn);
  const chopTurns = rows.filter((row) => row.survivor === "QUEEN" && chop.some((other) => other.run === row.run && other.floor === row.floor && other.attempt === row.attempt && row.turn >= other.turn - 1 && row.turn <= other.turn));
  const md = [
    "# MECH_DEATH_MOVE 离线回放：学到的「盟友死了换招」（2026-10-03）",
    "",
    "不调用任何模型。`npx tsx tools/death-move-replay.ts run`：日志里每个场上同时有规则的幸存者和它的盟友（女王 + 火炬头聚合体、活体护盾 + 高塔炮手；活体雾 + 毒气弹的规则和招式表一致，不应用）的回合，",
    "取这回合（每次 SL 尝试分开）第一个规划决策，用现在的代码出题两次（MECH_DEATH_MOVE 关 / 开，MECH_RULES 和 MECH_MOVE_RULES 都开；推演和随机药水蒙特卡洛用冻结的时钟跑满 5 回合 × 8 样本，种子固定；整场 boss 模拟 B2 关着）。",
    "「杀的线 / 不杀的线」= 推演里这回合把盟友打死 / 没打死的线中推演自己的 value 最好的一条，数字是推演到战斗结束的期望掉血（含药水代价）和 8 个样本里的死亡数。",
    "推演每条线 8 个样本：一旦某个样本里女王的招不同，之后的随机数就全不同，所以小的变化里有抽样噪声。规则和门槛见 docs/mechanics-learning.md §9。",
    "",
    ...section("女王 + 火炬头聚合体", rows.filter((row) => row.survivor === "QUEEN")),
    "### 死在第一次「将头砍下」的那几次：杀聚合体的回合和它前一回合",
    "",
    `${chop.length} 次（${chop.map(where).join("、")}）。`,
    "",
    "| 回合 | HP | 聚合体 HP | 当时打的（杀它？） | 关：代码 / 推演最优 | 开：代码 / 推演最优 | 开：杀的线（推演） | 开：不杀的线（推演） | 关：杀的线 | 关：不杀的线 |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...chopTurns.map((row) => `| ${where(row)} | ${row.hp} | ${row.allyHp} | ${row.logged.played ?? "?"}（${row.logged.killed === null ? "?" : row.logged.killed ? "杀" : "不杀"}） | ${row.off.kind === "act" ? `代码：${playedOf(row.off.act ?? "") ?? row.off.label}` : `问：${row.off.best ?? "-"}`} | ${row.on.kind === "act" ? `代码：${playedOf(row.on.act ?? "") ?? row.on.label}` : `问：${row.on.best ?? "-"}`} | ${r(row.on.killBest)} | ${r(row.on.keepBest)} | ${r(row.off.killBest)} | ${r(row.off.keepBest)} |`),
    "",
    ...section("活体护盾 + 高塔炮手", rows.filter((row) => row.survivor === "LIVING_SHIELD")),
  ].join("\n");
  writeFileSync(outPath, md);
  console.log(`report: ${rows.length} turns -> ${outPath}`);
}

function mean(xs: (number | null | undefined)[]): number | null {
  const known = xs.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return known.length > 0 ? known.reduce((a, b) => a + b, 0) / known.length : null;
}

async function runAll(): Promise<void> {
  const shards = Number(arg("shards", "4"));
  mkdirSync(work, { recursive: true });
  const pass = ["work", "limit", "monster-db"].flatMap((name) => (process.argv.includes(`--${name}`) ? [`--${name}`, arg(name, "")] : []));
  await Promise.all(
    Array.from({ length: shards }, (_, i) =>
      new Promise<void>((resolve, reject) => {
        const child = spawn("nice", ["-n", "10", "npx", "tsx", fromRoot("agent/tools/death-move-replay.ts"), "shard", "--shard", String(i), "--shards", String(shards), ...pass], { stdio: ["ignore", "inherit", "inherit"] });
        child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`shard ${i} exited ${code}`))));
      }),
    ),
  );
  report();
}

if (stage === "shard") shard();
else if (stage === "report") report();
else await runAll();
