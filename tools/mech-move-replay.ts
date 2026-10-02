/**
 * Offline replay of MECH_MOVE_RULES (docs/mechanics-learning.md §8): the learned "a power removed or lowered -> the
 * enemy's move changes" rules and the Kaiser Crab's back attack needing both claws, on every logged turn they can touch.
 * No model is called. Each turn's first planning decision with a move-rule power up on a living enemy (the rules from the
 * given monster DB's `observed`, on the powers the solver sees go: today the Axebot's Stock) or with us Surrounded (the
 * Crab) is rebuilt from its logged state and planned by the current code twice, MECH_MOVE_RULES off and on (MECH_RULES on
 * both times), as live: the Surrounded facing the loop had noted (the fight's last targeted play or drink before it), the
 * rollout and the random potions' Monte Carlo on a frozen clock (the full 5 turns x 8 samples, seeds the board's). The
 * whole-fight boss simulation (B2) is off here: its numbers are not compared (see the report's note).
 *
 * Per turn: code plays alone or asks Jev (off, on); the shown options and the rollout's best (off, on); the options whose
 * line sets a move change off (on); the line played that turn (its logged plays), the solver's hp_lost for it off and on
 * and the HP actually lost; and, where the rollout's best or code's own line changed, the old and the new line's hp_lost
 * under both models and their expected further loss in the on rollout.
 *
 * Usage: npx tsx tools/mech-move-replay.ts run [--shards 8] [--work experiments/mechanics] [--monster-db PATH] [--limit N]
 *        npx tsx tools/mech-move-replay.ts report [--work …] [--out notes/mech-move-replay.md]
 * Output: <work>/move-replay-<I>.jsonl (a row a turn, not committed) and the report.
 */
import { execFileSync, spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { moveRulesOf } from "../src/knowledge/mechanics.js";
import { setMonsterDbForTests, type MonsterDb } from "../src/knowledge/monster-db.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type Decision, type DecisionEnv, type ScreenMemory } from "../src/project/types.js";
import { facingFightOf, planCombatTurn, thiefTrace } from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { effectiveFightLoss, rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { MOVE_RULE_POWERS, type Plan } from "../src/strategy/turn-solver.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const stage = process.argv[2] ?? "run";
const work = arg("work", "experiments/mechanics");
const MONSTER_DB = arg("monster-db", "src/knowledge/monster-db.json");
const STATES = "logs/states.jsonl";
const PY = ".cache/logdb-venv/bin/python";
/** Labels of a fresh plan of the turn (tools/thief-facts-replay.ts's). */
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;
/** Enemies with Surrounded's back-attack powers in the monster DB (the Kaiser Crab's claws): class C's boards. */
const BACK_ATTACK = /^BACK_ATTACK_(LEFT|RIGHT)_POWER$/;

type Row = Record<string, unknown>;

function traced(): typeof thiefTrace.last {
  return thiefTrace.last;
}

function query(sql: string): Row[] {
  const out = execFileSync(PY, ["tools/logdb/query.py", "--no-sync", "--json", "--max-rows", "1000000", "--timeout", "120", sql], { encoding: "utf8", maxBuffer: 1 << 30 });
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

/** The line a logged decision played: the rationale's plan text (tools/mech-rules-replay.ts playedOf). */
function playedOf(rationale: string): string | null {
  const jev = /chose plan \d+\/\d+ \((.*?)\)(?: with confidence|; plan)/.exec(rationale);
  if (jev) return jev[1]!;
  const code = /^(?:code plan \([^)]*\)|lethal|every simulated line dies; [^:]*|mod says ending the turn is lethal, solver disagrees; not ending it|code plan [^;]*is over the HP guard bound; playing) ?:? ?(.*?)(?:; hp [-+]| \(| \[|$)/.exec(rationale);
  return code ? code[1]!.trim() : null;
}

interface Side {
  kind: string;
  label: string;
  act: string | null;
  shown: string[];
  best: string | null;
  /** Shown options whose line sets a learned move change off (their move_change fact). */
  moveShown: string[];
  /** Each shown option's hp_lost. */
  losses: Record<string, number>;
}

export interface MoveReplayRow {
  run: string;
  floor: number;
  turn: number;
  asc: number;
  board: "crab-both" | "crab-one" | "axebot" | "other";
  enemies: string;
  logged: { label: string; decider: string; played: string | null };
  off: Side;
  on: Side;
  played: { offLoss: number | null; onLoss: number | null; actual: number | null } | null;
  change: {
    from: string;
    to: string;
    fromOffLoss: number | null;
    toOffLoss: number | null;
    fromOnLoss: number | null;
    toOnLoss: number | null;
    toMoves: boolean;
    /** The on rollout's expected HP lost from now (this turn included), old and new line. */
    fromFurther: number | null;
    toFurther: number | null;
    /** ... with the potions' and the loot's cost (effectiveFightLoss), its deaths and its ranking value. */
    fromEffective?: number | null;
    toEffective?: number | null;
    fromDeaths?: number | null;
    toDeaths?: number | null;
    fromValue?: number | null;
    toValue?: number | null;
  } | null;
}

function sideOf(decision: Decision | null, plans: Plan[]): Side {
  const criteria = criteriaOf(decision);
  const best = Object.values(criteria).find((option) => option["rollout_best"] === true);
  const shown = Object.values(criteria).map((option) => normal(option["plays"]));
  return {
    kind: decision?.kind ?? "none",
    label: decision?.label ?? "",
    act: decision?.kind === "act" ? decision.rationale : null,
    shown,
    best: best ? normal(best["plays"]) : null,
    moveShown: Object.values(criteria).filter((option) => option["move_change"] !== undefined).map((option) => normal(option["plays"])),
    losses: Object.fromEntries(Object.values(criteria).map((option) => [normal(option["plays"]), Number(option["hp_lost"] ?? NaN)])),
  };
}

function shard(): void {
  const index = Number(arg("shard", "0"));
  const shards = Number(arg("shards", "1"));
  const limit = Number(arg("limit", "1000000"));
  mkdirSync(work, { recursive: true });
  const db = JSON.parse(readFileSync(MONSTER_DB, "utf8")) as MonsterDb;
  setMonsterDbForTests(db);
  const rules = moveRulesOf(db);
  const rulePowers = new Map([...rules].map(([monster, list]) => [monster, list.filter((rule) => MOVE_RULE_POWERS.has(rule.power)).map((rule) => rule.power)] as const).filter(([, powers]) => powers.length > 0));
  const surrounded = Object.keys(db.monsters).filter((id) => Object.keys(db.monsters[id]!.powers ?? {}).some((power) => BACK_ATTACK.test(power)));
  const monsters = [...new Set([...rulePowers.keys(), ...surrounded])].sort();
  if (monsters.length === 0) throw new Error("no monster carries a move-rule power or a back attack");
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
  thiefTrace.enabled = true;
  const knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
  const config = loadConfig({} as NodeJS.ProcessEnv);
  const fights = query(`SELECT run_id, floor, ascension, encounter, first_off, last_off, first_ts FROM fights WHERE ${monsters.map((id) => `list_contains(monsters, '${id}')`).join(" OR ")} ORDER BY first_ts`);
  const fd = openSync(STATES, "r");
  const stateAt = (off: number, len: number): Record<string, unknown> => {
    const buffer = Buffer.alloc(len);
    readSync(fd, buffer, 0, len, off);
    return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Record<string, unknown>;
  };
  const out = join(work, `move-replay-${index}.jsonl`);
  writeFileSync(out, "");
  let done = 0;
  fights.forEach((fight, fightIndex) => {
    if (fightIndex % shards !== index || done >= limit) return;
    const run = String(fight["run_id"]);
    const frames = query(`SELECT off, len, ts, turn, observed, player_hp FROM frames WHERE run_id = '${run}' AND off BETWEEN ${Number(fight["first_off"])} AND ${Number(fight["last_off"])} AND screen = 'COMBAT' ORDER BY off`);
    const decisions = query(`SELECT ts, turn, label, decider, rationale, action, target_index FROM decisions WHERE run_id = '${run}' AND floor = ${Number(fight["floor"])} AND screen = 'COMBAT' AND ts >= '${String(fight["first_ts"])}' ORDER BY ts`);
    const own = frames.filter((frame) => frame["observed"] !== true);
    if (own.length === 0) return;
    const seen = new Set<number>();
    for (const decision of decisions) {
      const turn = Number(decision["turn"]);
      if (!PLANNING.test(String(decision["label"])) || seen.has(turn)) continue;
      const frame = own.find((entry) => entry["ts"] === decision["ts"]);
      if (!frame) continue;
      seen.add(turn);
      const raw = stateAt(Number(frame["off"]), Number(frame["len"]));
      const combat = (raw["combat"] as Row | undefined) ?? {};
      const living = ((combat["enemies"] as Row[] | undefined) ?? []).filter((enemy) => enemy["is_alive"] !== false);
      const powersOf = (holder: Row | undefined) => ((holder?.["powers"] as Row[] | undefined) ?? []).filter((power) => Number(power["amount"]) > 0).map((power) => String(power["power_id"]));
      const ruled = living.some((enemy) => (rulePowers.get(String(enemy["enemy_id"])) ?? []).some((power) => powersOf(enemy).includes(power)));
      const isSurrounded = powersOf(combat["player"] as Row | undefined).includes("SURROUNDED_POWER");
      if (!ruled && !isSurrounded) continue;
      const claws = living.filter((enemy) => powersOf(enemy).some((power) => BACK_ATTACK.test(power))).length;
      const board: MoveReplayRow["board"] = isSurrounded ? (claws >= 2 ? "crab-both" : "crab-one") : ruled ? "axebot" : "other";
      const state = parseGameState(raw);
      const earlier = decisions.filter((entry) => String(entry["ts"]) < String(decision["ts"]) && entry["target_index"] !== null && entry["target_index"] !== undefined && entry["action"] !== "end_turn");
      const facing = earlier.length > 0 ? Number(earlier[earlier.length - 1]!["target_index"]) : null;
      const plan = (move: boolean): { decision: Decision | null; plans: Plan[] } => {
        const env: DecisionEnv = {
          state, knowledge, brief: buildRunBrief(state, knowledge),
          screenMemory: { ...createScreenMemory("COMBAT"), ...(facing !== null ? { facing, facingFight: facingFightOf(state) } : {}) } as ScreenMemory,
          thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [],
          jevContext: "v1", buildDecider: "deepseek", mechRules: true, mechMoveRules: move, thiefFacts: true,
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
      const playedOff = byPlays(offRun.plans, played);
      const playedOn = byPlays(onRun.plans, played);
      const lineOf = (side: Side): string | null => (side.act !== null ? playedOf(side.act) : side.best);
      const from = lineOf(off);
      const to = lineOf(on);
      const rolled = (plays: string | null) => (onTrace?.rollout?.available ? onTrace.rollout.result.lines.find((entry) => playsOf(entry.plan) === plays) : undefined);
      const row: MoveReplayRow = {
        run, floor: Number(fight["floor"]), turn, asc: Number(fight["ascension"]), board, enemies: String(fight["encounter"]),
        logged: { label: String(decision["label"]), decider: String(decision["decider"]), played },
        off, on,
        played: played === null ? null : { offLoss: playedOff?.outcome.hpLoss ?? null, onLoss: playedOn?.outcome.hpLoss ?? null, actual: next ? Number(frame["player_hp"]) - Number(next["player_hp"]) : null },
        change:
          from !== to
            ? {
                from: from ?? "-", to: to ?? "-",
                fromOffLoss: byPlays(offRun.plans, from)?.outcome.hpLoss ?? null, toOffLoss: byPlays(offRun.plans, to)?.outcome.hpLoss ?? null,
                fromOnLoss: byPlays(onRun.plans, from)?.outcome.hpLoss ?? null, toOnLoss: byPlays(onRun.plans, to)?.outcome.hpLoss ?? null,
                toMoves: byPlays(onRun.plans, to)?.outcome.enemyHpAfter.some((enemy) => enemy.movedTo !== undefined) ?? false,
                fromFurther: rolled(from)?.hpLoss ?? null, toFurther: rolled(to)?.hpLoss ?? null,
                fromEffective: rolled(from) ? effectiveFightLoss(rolled(from)!) : null, toEffective: rolled(to) ? effectiveFightLoss(rolled(to)!) : null,
                fromDeaths: rolled(from)?.deaths ?? null, toDeaths: rolled(to)?.deaths ?? null,
                fromValue: rolled(from)?.value ?? null, toValue: rolled(to)?.value ?? null,
              }
            : null,
      };
      writeFileSync(out, `${JSON.stringify(row)}\n`, { flag: "a" });
      done += 1;
      console.error(`${run} F${row.floor} T${turn} ${board}: off ${off.kind} on ${on.kind}${row.change ? ` CHANGE ${row.change.from} -> ${row.change.to}` : ""}`);
    }
  });
  closeSync(fd);
  console.error(`shard ${index}: ${done} turns -> ${out}`);
}

function report(): void {
  const outPath = arg("out", "notes/mech-move-replay.md");
  const rows: MoveReplayRow[] = [];
  for (const file of readdirSync(work).filter((name) => /^move-replay-\d+\.jsonl$/.test(name)).sort()) {
    for (const line of readFileSync(join(work, file), "utf8").split("\n")) if (line) rows.push(JSON.parse(line) as MoveReplayRow);
  }
  rows.sort((a, b) => (a.run < b.run ? -1 : a.run > b.run ? 1 : a.floor - b.floor || a.turn - b.turn));
  const mean = (xs: number[]) => (xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const f1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
  const where = (row: MoveReplayRow) => `${row.run} F${row.floor} T${row.turn}`;
  const known = (x: number | null): x is number => x !== null;
  const section = (title: string, list: MoveReplayRow[]): string[] => {
    const fights = new Set(list.map((row) => `${row.run}:${row.floor}`)).size;
    const kinds = (side: "off" | "on", kind: string) => list.filter((row) => row[side].kind === kind).length;
    const actToAsk = list.filter((row) => row.off.kind === "act" && row.on.kind === "ask");
    const askToAct = list.filter((row) => row.off.kind === "ask" && row.on.kind === "act");
    const bothAsk = list.filter((row) => row.off.kind === "ask" && row.on.kind === "ask");
    const bestChanged = bothAsk.filter((row) => row.off.best !== row.on.best);
    const shownChanged = bothAsk.filter((row) => row.off.shown.join("|") !== row.on.shown.join("|"));
    const lossChanged = bothAsk.filter((row) => row.on.shown.some((plays) => row.off.losses[plays] !== undefined && row.off.losses[plays] !== row.on.losses[plays]));
    const actChanged = list.filter((row) => row.off.kind === "act" && row.on.kind === "act" && row.off.act !== row.on.act);
    const moveOffered = list.filter((row) => row.on.moveShown.length > 0);
    const playedRows = list.filter((row) => row.played && known(row.played.offLoss) && known(row.played.onLoss) && known(row.played.actual));
    const differs = playedRows.filter((row) => row.played!.offLoss !== row.played!.onLoss);
    const bias = (xs: MoveReplayRow[], key: "offLoss" | "onLoss") => mean(xs.map((row) => row.played!.actual! - row.played![key]!));
    const mae = (xs: MoveReplayRow[], key: "offLoss" | "onLoss") => mean(xs.map((row) => Math.abs(row.played!.actual! - row.played![key]!)));
    const changes = list.filter((row) => row.change !== null);
    // Worse by the on model itself: the new line's expected loss to the fight's end with the potions' cost (the on rollout's,
    // this turn included) more than half an HP above the old one's, and no fewer deaths.
    const eff = (c: NonNullable<MoveReplayRow["change"]>, side: "from" | "to") => (side === "from" ? c.fromEffective ?? c.fromFurther : c.toEffective ?? c.toFurther) ?? null;
    const worse = changes.filter((row) => {
      const c = row.change!;
      const a = eff(c, "from");
      const b = eff(c, "to");
      return known(a) && known(b) && b > a + 0.5 && !((c.toDeaths ?? 0) < (c.fromDeaths ?? 0));
    });
    return [
      `## ${title}`,
      "",
      `${list.length} 个回合（${fights} 场）。代码自己打的：关 ${kinds("off", "act")} / 开 ${kinds("on", "act")}；问 Jev 的：关 ${kinds("off", "ask")} / 开 ${kinds("on", "ask")}。`,
      `代码自打 → 问 Jev：${actToAsk.length}${actToAsk.length > 0 ? `（${actToAsk.slice(0, 8).map(where).join("、")}）` : ""}；问 Jev → 代码自打：${askToAct.length}${askToAct.length > 0 ? `（${askToAct.slice(0, 8).map(where).join("、")}）` : ""}；代码自打的线变了：${actChanged.length}${actChanged.length > 0 ? `（${actChanged.slice(0, 8).map(where).join("、")}）` : ""}。`,
      `两边都问 Jev 的 ${bothAsk.length} 个里：选项变了 ${shownChanged.length}，选项的 hp_lost 变了 ${lossChanged.length}，rollout_best 变了 ${bestChanged.length}。开时选项里有换招事实（move_change）的：${moveOffered.length} 个回合。`,
      "",
      `当时打的线（两边都找得到、有下回合血量）${playedRows.length} 个：偏差（实际 − 预测）关 ${f1(bias(playedRows, "offLoss"))} → 开 ${f1(bias(playedRows, "onLoss"))}，|误差| 关 ${f1(mae(playedRows, "offLoss"))} → 开 ${f1(mae(playedRows, "onLoss"))}；`,
      `其中预测变了的 ${differs.length} 个：偏差 关 ${f1(bias(differs, "offLoss"))} → 开 ${f1(bias(differs, "onLoss"))}，|误差| 关 ${f1(mae(differs, "offLoss"))} → 开 ${f1(mae(differs, "onLoss"))}${differs.length > 0 ? `（${differs.slice(0, 10).map((row) => `${where(row)} 实际 ${row.played!.actual}：${row.played!.offLoss} → ${row.played!.onLoss}`).join("；")}${differs.length > 10 ? " …" : ""}）` : ""}。`,
      "",
      `代码自己的线或 rollout_best 变了的 ${changes.length} 个（「-」= 那一边没有唯一的最优）；连开的模型自己都认为更差的（开的推演里含药水代价的总掉血多 0.5 以上、死亡样本不更少）：${worse.length}${worse.length > 0 ? `（${worse.map(where).join("、")}）` : ""}。`,
      "",
      ...(changes.length > 0
        ? [
            "| 回合 | 关：线 | 开：线 | 新线触发换招 | 本回合掉血 关 旧→新 | 本回合掉血 开 旧→新 | 推演总掉血（开，含药水代价）旧→新 | 死亡样本 旧→新 |",
            "|---|---|---|---|---|---|---|---|",
            ...changes.map((row) => {
              const c = row.change!;
              const n = (x: number | null | undefined) => (x === null || x === undefined ? "?" : String(Math.round(x * 10) / 10));
              return `| ${where(row)} | ${c.from} | ${c.to} | ${c.toMoves ? "是" : ""} | ${n(c.fromOffLoss)}→${n(c.toOffLoss)} | ${n(c.fromOnLoss)}→${n(c.toOnLoss)} | ${n(eff(c, "from"))}→${n(eff(c, "to"))} | ${n(c.fromDeaths)}→${n(c.toDeaths)} |`;
            }),
            "",
          ]
        : []),
    ];
  };
  const md = [
    "# MECH_MOVE_RULES 离线回放：学到的换招 + 凯撒蟹的背后攻击（2026-10-02）",
    "",
    "不调用任何模型。`npx tsx tools/mech-move-replay.ts run --monster-db <带 observed 的怪物数据库>`：日志里每个「场上有求解器用得上的换招规则能力（今天只有巨斧机器人的库存）」或「我们被包围（凯撒蟹）」的回合，",
    "取第一个规划决策，用现在的代码出题两次（MECH_MOVE_RULES 关 / 开，MECH_RULES 都开；朝向按实盘当时记的；推演和随机药水蒙特卡洛用冻结的时钟跑满）。",
    "**整场 boss 模拟（B2）这里关着**：实盘的帝王蟹回合还会跑 B2、按整场数字排序（帝王蟹在可信名单里），它用的是同一个求解器和推演，所以同样带着这次的改动，但这里没有比较它的数。",
    "「当时打的线」取自这回合第一个决策的理由：抽牌之后改了打法的回合（耸肩无视、战斗专注之后重新规划）它不是真正打出的线，所以这里的「预测 vs 实际」只作参考；",
    "跟着重新规划走、按真正打出的线比的是 notes/mechanics-residuals.md（tools/mechanics-residuals.ts）。推演每条线 8 个样本、种子固定：一旦某个样本里有一次复活或换招不同，之后的随机数就全不同，所以 rollout_best 的变化里有一部分是抽样噪声。",
    "机制和门槛见 docs/mechanics-learning.md §8。",
    "",
    ...section("凯撒蟹：两只钳子都在", rows.filter((row) => row.board === "crab-both")),
    ...section("凯撒蟹：只剩一只钳子", rows.filter((row) => row.board === "crab-one")),
    ...section("巨斧机器人（库存在）", rows.filter((row) => row.board === "axebot")),
  ].join("\n");
  writeFileSync(outPath, md);
  console.log(`report: ${rows.length} turns -> ${outPath}`);
}

async function runAll(): Promise<void> {
  const shards = Number(arg("shards", "8"));
  mkdirSync(work, { recursive: true });
  const pass = ["work", "limit", "monster-db"].flatMap((name) => (process.argv.includes(`--${name}`) ? [`--${name}`, arg(name, "")] : []));
  await Promise.all(
    Array.from({ length: shards }, (_, i) =>
      new Promise<void>((resolve, reject) => {
        const child = spawn("nice", ["-n", "10", "npx", "tsx", "tools/mech-move-replay.ts", "shard", "--shard", String(i), "--shards", String(shards), ...pass], { stdio: ["ignore", "inherit", "inherit"] });
        child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`shard ${i} exited ${code}`))));
      }),
    ),
  );
  report();
}

if (stage === "shard") shard();
else if (stage === "report") report();
else await runAll();
