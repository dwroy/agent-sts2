/**
 * PASSIVE_PIECES replay (src/strategy/passive-pieces.ts) on logged fights, the switch off and on in one process (the
 * builders read passivePiecesOptions when called). Offline: the logged states (tools/boss-sim/extract.py output), the
 * committed knowledge files; no model call, nothing played, nothing written under logs/ or .cache.
 *
 * --mode clock (A8+ boss fights by default): the boss clock from each fight's turn-1 state at the HP it was entered with,
 *   off and on: the deck's damage a turn at the fight's real length against the damage realised into the parts the clock
 *   counts (tools/passive-pieces-check.py --realised), and the HP lost a turn against the fight's (entry - end) / turns
 *   and its HP lost per enemy turn (turns view). A fight whose clock is the same off and on is a control.
 * --mode rollout (turn 1 and turn 5 boards): the 5-turn rollout at the live settings (5 turns x 8 samples, the kill
 *   orders, the committed fight-value model and gates, a fake clock: no time limit), off and on: each candidate line's
 *   further HP loss and win chance, the line it ranks best (rollout-live pickRolloutBest), and whether the whole result is
 *   the same byte for byte.
 *
 * Usage: npx tsx tools/passive-pieces-replay.ts --mode clock|rollout [--in experiments/boss-sim/raw/fights-1003.jsonl]
 *          [--realised experiments/boss-sim/raw/realised-1003.jsonl] [--asc 8,9] [--enc QUEEN] [--starts t1,t5]
 *          [--only pieces|control|all] [--limit N] [--out OUT.jsonl]
 */
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { fightOrders } from "../src/sim/boss-sim.js";
import { bossClock, bossProfile, deckEstimate, deckProfileForBoss } from "../src/strategy/boss-clock.js";
import { loadFightValueModel } from "../src/strategy/fight-value.js";
import { passivePiecesOptions } from "../src/strategy/passive-pieces.js";
import { loadFightValueGates, rolloutDecision, type MoveModelData, type RolloutResult } from "../src/strategy/rollout.js";
import { pickRolloutBest, rolloutLiveOptions, ROLLOUT_HORIZON, ROLLOUT_SAMPLES, type MonsterMoves } from "../src/strategy/rollout-live.js";
import type { Plan } from "../src/strategy/turn-solver.js";
import { boardOf } from "./boss-sim/backtest-board.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}
const mode = arg("mode", "clock");
const inPath = arg("in", "experiments/boss-sim/raw/fights-1003.jsonl");
const realisedPath = arg("realised", "experiments/boss-sim/raw/realised-1003.jsonl");
const ascensions = arg("asc", "8,9").split(",").map(Number);
const encs = arg("enc", "").split(",").filter((x) => x !== "");
const starts = arg("starts", "t1,t5").split(",");
const only = arg("only", "all");
const limit = Number(arg("limit", "0"));
const outPath = arg("out", "");

interface FightRow {
  key: string;
  asc: number;
  encounter: string;
  entry_hp: number;
  end_hp: number;
  outcome: "won" | "died";
  turns: number;
  t1: { turn: number; hp: number; state: Record<string, unknown> };
  t5?: { turn: number; hp: number; state: Record<string, unknown> };
}

const knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: never }).collections, "cache");
const rows = readFileSync(inPath, "utf8")
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => JSON.parse(line) as FightRow)
  .filter((row) => ascensions.includes(row.asc) && (encs.length === 0 || encs.some((e) => row.encounter.includes(e))));
if (outPath) writeFileSync(outPath, "");
const emit = (record: unknown) => {
  if (outPath) appendFileSync(outPath, JSON.stringify(record) + "\n");
};
const r2 = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? NaN : s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
};
const mean = (xs: number[]) => (xs.length === 0 ? NaN : xs.reduce((a, b) => a + b, 0) / xs.length);
const fmt = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : "-");

function clockMode(): void {
  const realised = new Map(
    readFileSync(realisedPath, "utf8")
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line) as { key: string; realised: number | null; per_enemy_turn: number | null })
      .map((r) => [r.key, r] as const),
  );
  interface Out {
    key: string;
    boss: string;
    queen: boolean;
    won: boolean;
    turns: number;
    realised: number | null;
    actualLoss: number;
    perEnemyTurn: number | null;
    same: boolean;
    off: { deckAtReal: number; loss: number; deck: number; fightTurns: number; gap: number };
    on: { deckAtReal: number; loss: number; deck: number; fightTurns: number; gap: number };
    pieces: string[];
  }
  const outs: Out[] = [];
  for (const row of rows) {
    if (limit && outs.length >= limit) break;
    const state = parseGameState(row.t1.state) as GameState;
    const bossId = String(state.run?.boss_id ?? "");
    const profile = bossProfile(bossId);
    if (!profile || profile.id === "TEST_SUBJECT") continue;
    const at = (on: boolean) => {
      passivePiecesOptions.enabled = on;
      const clock = bossClock(state, knowledge, row.entry_hp);
      const deck = deckProfileForBoss(state, knowledge);
      return { clock, deck, json: JSON.stringify([clock, deck]), deckAtReal: deck ? deckEstimate(deck, bossId, row.turns) : 0 };
    };
    const off = at(false);
    const on = at(true);
    if (!off.clock || !on.clock) continue;
    const real = realised.get(row.key);
    const out: Out = {
      key: row.key,
      boss: profile.id,
      queen: profile.id === "QUEEN",
      won: row.outcome === "won",
      turns: row.turns,
      realised: real?.realised ?? null,
      actualLoss: (row.entry_hp - row.end_hp) / Math.max(1, row.turns),
      perEnemyTurn: real?.per_enemy_turn ?? null,
      same: off.json === on.json,
      off: { deckAtReal: off.deckAtReal, loss: off.clock.lossPerTurn, deck: off.clock.deck, fightTurns: off.clock.fightTurns, gap: off.clock.gap },
      on: { deckAtReal: on.deckAtReal, loss: on.clock.lossPerTurn, deck: on.clock.deck, fightTurns: on.clock.fightTurns, gap: on.clock.gap },
      pieces: [...(on.deck?.passive ?? []), ...(on.deck?.passiveBlock ?? [])],
    };
    outs.push(out);
    emit(out);
  }
  passivePiecesOptions.enabled = true;
  const groups: [string, (o: Out) => boolean][] = [
    ["Queen (all)", (o) => o.queen],
    ["Queen, clock changed", (o) => o.queen && !o.same],
    ["other bosses, clock changed", (o) => !o.queen && !o.same],
    ["clock the same (control)", (o) => o.same],
    ["all", () => true],
  ];
  console.log(`boss clock, ${outs.length} fights (A${ascensions.join("/")}${encs.length ? `, ${encs.join(",")}` : ""}); deck at the real length vs realised (log ratio realised/estimate), HP lost a turn vs (entry - end) / turns`);
  console.log("| group | n | deck: median log err off / on | median abs log err off / on | loss/turn: mean err off / on | median abs err off / on | mean abs err off / on | actual loss/turn | per enemy turn |");
  console.log("|---|---|---|---|---|---|---|---|---|");
  for (const [name, pick] of groups) {
    const g = outs.filter(pick);
    const withReal = g.filter((o) => o.realised !== null && o.realised > 0 && o.off.deckAtReal > 0 && o.on.deckAtReal > 0);
    const logErr = (o: Out, side: "off" | "on") => Math.log(o.realised! / o[side].deckAtReal);
    const lossErr = (o: Out, side: "off" | "on") => o[side].loss - o.actualLoss;
    console.log(
      `| ${name} | ${g.length} | ${fmt(median(withReal.map((o) => logErr(o, "off"))))} / ${fmt(median(withReal.map((o) => logErr(o, "on"))))} | ${fmt(median(withReal.map((o) => Math.abs(logErr(o, "off")))))} / ${fmt(median(withReal.map((o) => Math.abs(logErr(o, "on")))))} | ` +
        `${fmt(mean(g.map((o) => lossErr(o, "off"))), 2)} / ${fmt(mean(g.map((o) => lossErr(o, "on"))), 2)} | ${fmt(median(g.map((o) => Math.abs(lossErr(o, "off")))), 2)} / ${fmt(median(g.map((o) => Math.abs(lossErr(o, "on")))), 2)} | ${fmt(mean(g.map((o) => Math.abs(lossErr(o, "off")))), 2)} / ${fmt(mean(g.map((o) => Math.abs(lossErr(o, "on")))), 2)} | ${fmt(mean(g.map((o) => o.actualLoss)), 1)} | ${fmt(mean(g.filter((o) => o.perEnemyTurn !== null).map((o) => o.perEnemyTurn!)), 1)} |`,
    );
  }
  const queens = outs.filter((o) => o.queen);
  console.log("\nQueen fights: key, won, turns, realised/turn, deck at real length off -> on, loss/turn off -> on vs actual, per enemy turn, pieces");
  for (const o of queens) {
    console.log(`  ${o.key} ${o.won ? "won " : "lost"} T${o.turns} real ${fmt(o.realised ?? NaN, 1)} deck ${o.off.deckAtReal} -> ${o.on.deckAtReal}; loss ${o.off.loss} -> ${o.on.loss} vs ${fmt(o.actualLoss, 1)} (enemy turn ${fmt(o.perEnemyTurn ?? NaN, 1)}); fight turns ${o.off.fightTurns} -> ${o.on.fightTurns}, gap ${o.off.gap} -> ${o.on.gap}; ${o.same ? "same" : o.pieces.join("; ")}`);
  }
  for (const [name, pick] of [["won", (o: Out) => o.won], ["lost", (o: Out) => !o.won]] as const) {
    const g = queens.filter(pick);
    console.log(`Queen ${name}: n ${g.length}, HP lost per enemy turn ${fmt(mean(g.filter((o) => o.perEnemyTurn !== null).map((o) => o.perEnemyTurn!)), 1)}, clock loss/turn off ${fmt(mean(g.map((o) => o.off.loss)), 1)} on ${fmt(mean(g.map((o) => o.on.loss)), 1)}, gap off ${fmt(mean(g.map((o) => o.off.gap)), 1)} on ${fmt(mean(g.map((o) => o.on.gap)), 1)}`);
  }
}

async function rolloutMode(): Promise<void> {
  const mm = JSON.parse(readFileSync("src/knowledge/move-model.json", "utf8")) as MoveModelData;
  const db = (JSON.parse(readFileSync("src/knowledge/monster-db.json", "utf8")) as { monsters: MonsterMoves }).monsters;
  const model = loadFightValueModel();
  const gates = loadFightValueGates();
  // The board only (the planner's own rollout is ours to run, on and off).
  rolloutLiveOptions.enabled = false;
  const sig = (plan: Plan) => plan.steps.map((s) => `${s.cardId}${s.upgraded ? "+" : ""}>${s.target ?? "-"}`).join(",");
  interface Out {
    key: string;
    start: string;
    enc: string;
    same: boolean;
    hasPassive: boolean;
    bestOff: string | null;
    bestOn: string | null;
    lines: {
      line: string;
      offLoss: number | null;
      onLoss: number | null;
      offWin: number | null;
      onWin: number | null;
      /**
       * The next turn's (T2's) mean HP lost and damage dealt, and the samples alive at the end of T3 and of the horizon (a
       * sum over the later turns would count more turns where more samples live).
       */
      offLater: [number, number, number, number] | null;
      onLater: [number, number, number, number] | null;
    }[];
  }
  const outs: Out[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]!;
    for (const start of starts) {
      if (limit && outs.length >= limit) break;
      const point = start === "t5" ? row.t5 : row.t1;
      if (!point) continue;
      const state = parseGameState(point.state) as GameState;
      const run = (on: boolean): { result: RolloutResult; hasPassive: boolean; relicBlock: string } | null => {
        passivePiecesOptions.enabled = on;
        let board: ReturnType<typeof boardOf>;
        try {
          board = boardOf(state, knowledge, row.encounter, db, mm, { randomPotions: false });
        } catch {
          return null;
        }
        const orders = fightOrders(board.input);
        let t = 0;
        const result = rolloutDecision({
          ...board.input,
          model,
          gates,
          options: { horizon: ROLLOUT_HORIZON, samples: ROLLOUT_SAMPLES, budgetMs: 1e9, seed: 1 + index * 101 + (start === "t5" ? 7 : 0), now: () => (t += 0.001), include: board.plans.slice(0, 6), ...(orders.length >= 2 ? { orders } : {}) },
        });
        return { result, hasPassive: board.input.passive !== undefined, relicBlock: JSON.stringify(board.input.relicBlock ?? []) };
      };
      const off = run(false);
      const on = run(true);
      if (!off || !on) continue;
      const strip = (r: RolloutResult) => JSON.stringify({ ...r, elapsedMs: 0, policyMs: 0 });
      const best = (r: RolloutResult) => {
        const picked = pickRolloutBest(r.lines, point.hp).best;
        return picked ? sig(picked.plan) : null;
      };
      const onBy = new Map(on.result.lines.map((l) => [sig(l.plan), l]));
      const later = (l: RolloutResult["lines"][number] | undefined): [number, number, number, number] | null => {
        if (!l || l.perTurn.length === 0) return null;
        const t2 = l.perTurn[0]!;
        return [r2(t2.loss.mean)!, r2(t2.dmg.mean)!, (l.perTurn[1] ?? t2).alive, l.perTurn[l.perTurn.length - 1]!.alive];
      };
      const out: Out = {
        key: row.key,
        start,
        enc: row.encounter,
        same: strip(off.result) === strip(on.result),
        // A relic piece the rollout reads (RolloutInput.passive, or Horn Cleat in relicBlock).
        hasPassive: on.hasPassive || on.relicBlock !== off.relicBlock,
        bestOff: best(off.result),
        bestOn: best(on.result),
        lines: off.result.lines.map((l) => {
          const o = onBy.get(sig(l.plan));
          return { line: sig(l.plan), offLoss: r2(l.hpLoss), onLoss: r2(o?.hpLoss), offWin: r2(l.winProb), onWin: r2(o?.winProb), offLater: later(l), onLater: later(o) };
        }),
      };
      if (only === "pieces" && !out.hasPassive) continue;
      if (only === "control" && out.hasPassive) continue;
      outs.push(out);
      emit(out);
    }
  }
  passivePiecesOptions.enabled = true;
  const changed = outs.filter((o) => o.hasPassive);
  const control = outs.filter((o) => !o.hasPassive);
  console.log(`rollout, ${outs.length} boards (${starts.join(",")}); ${changed.length} hold a relic piece, ${control.length} none`);
  console.log(`control boards byte-identical off/on: ${control.filter((o) => o.same).length} / ${control.length}`);
  const deltas = changed.flatMap((o) => o.lines.filter((l) => l.offLoss !== null && l.onLoss !== null).map((l) => [l.onLoss! - l.offLoss!, (l.onWin ?? 0) - (l.offWin ?? 0)] as const));
  const moved = changed.filter((o) => o.bestOff !== null && o.bestOn !== null && o.bestOff !== o.bestOn).length;
  const ties = changed.filter((o) => (o.bestOff === null) !== (o.bestOn === null)).length;
  console.log(`boards with a piece: ${changed.length}; best line changed on ${moved}, a tie (no best line: every line saturated) on one side only ${ties}; lines ${deltas.length}: further HP loss on - off mean ${fmt(mean(deltas.map((d) => d[0])))} (median ${fmt(median(deltas.map((d) => d[0])))}), win chance mean ${fmt(mean(deltas.map((d) => d[1])), 3)}`);
  const laterD = changed.flatMap((o) => o.lines.filter((l) => l.offLater && l.onLater).map((l) => l.onLater!.map((v, i) => v - l.offLater![i]!)));
  console.log(`  per line on - off: T2 HP lost ${fmt(mean(laterD.map((d) => d[0]!)))}, T2 damage dealt ${fmt(mean(laterD.map((d) => d[1]!)))}, samples alive after T3 ${fmt(mean(laterD.map((d) => d[2]!)))}, at the horizon ${fmt(mean(laterD.map((d) => d[3]!)))} (of ${ROLLOUT_SAMPLES})`);
  for (const o of changed) {
    const top = o.lines.find((l) => l.line === o.bestOff) ?? o.lines[0];
    console.log(`  ${o.key} ${o.start} ${o.enc}: best ${o.bestOff === o.bestOn ? "same" : `${o.bestOff} -> ${o.bestOn}`}; its loss ${top?.offLoss} -> ${top?.onLoss}, win ${top?.offWin} -> ${top?.onWin}, [T2 lost, T2 dealt, alive T3, alive T${ROLLOUT_HORIZON}] ${JSON.stringify(top?.offLater)} -> ${JSON.stringify(top?.onLater)}${o.same ? " (result identical)" : ""}`);
  }
}

if (mode === "clock") clockMode();
else await rolloutMode();
