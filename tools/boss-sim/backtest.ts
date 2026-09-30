/**
 * Backtest of the whole boss fight simulator (src/sim/boss-sim.ts) on logged boss fights, beside the 5-turn rollout and
 * the boss clock recomputed on the same states. Offline: reads tools/boss-sim/extract.py's output and the committed
 * knowledge files; no model API, nothing played, nothing written under logs/ or .cache.
 *
 * Per fight and start point (turn 1; turn 5 when the fight got there):
 *   - the board as the live planner builds it (combat-plan planCombatTurn -> the solver input and plans, captured by
 *     solveTap; rollout-live boardRolloutInput; the draw/discard piles from the state, else the deck minus the hand);
 *   - sim: the solver's best line (plans[0]) as the start turn, then the policy to the fight's end, `--samples` samples;
 *   - rollout: rolloutDecision at the live settings (5 turns x 8 samples, no time limit here) with the committed
 *     fight-value model and gates (in-sample: they were fit on these fights), the estimate of that same line;
 *   - clock (turn 1 only): boss-clock.ts bossClock at the HP the fight was entered with (as tools/eval/boss-clock-recompute.ts).
 *
 *   - pre (B1.5, --starts pre): the pre-fight start B3 needs, from the turn-1 state: the hand back in the deck, every
 *     card in the draw pile, the start turn's hand drawn in the sample and played by the policy, at the entry HP.
 *
 * Usage: npx tsx tools/boss-sim/backtest.ts [--in experiments/boss-sim/raw/fights.jsonl] [--out-dir experiments/boss-sim/raw]
 *          [--shard I --shards N] [--samples 100] [--seed 1] [--starts t1,t5,pre] [--limit N] [--no-rollout] [--no-scripts] [--no-orders]
 *          [--damage-scale D] [--hp-scale H] [--threat T] [--potion-hold K] [--start-line policy|plan1] [--no-best-order] [--set tune|val (experiments/boss-sim/split.json)]
 * --start-line: the start turn played by the sim's policy (default, B1.5) or the live solver's best line (B1).
 * B2: the random potions held are in the sim (sampled each turn as potion-mc does; --no-random-potions leaves them out),
 * and the turn relics B2 added (Orichalcum, Ripple Basin, Sturdy Clamp, Pendulum, Ice Cream) and the Kaiser Crab's facing.
 * Output: <out-dir>/results-<I>.jsonl, one line per (fight, start).
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { makeKnowledge } from "../../src/knowledge/index.js";
import { parseGameState, type GameState } from "../../src/mod/schema.js";
import { BOSS_SIM_DAMAGE_SCALE, BOSS_SIM_HP_SCALE, BOSS_SIM_POTION_HOLD, BOSS_SIM_THREAT, redealInput, runBestOrder, runBossSim, type BossSimLineResult } from "../../src/sim/boss-sim.js";
import { bossClock } from "../../src/strategy/boss-clock.js";
import { loadFightValueModel } from "../../src/strategy/fight-value.js";
import { loadFightValueGates, rolloutDecision, type KillOrder, type MoveModelData, type RolloutInput } from "../../src/strategy/rollout.js";
import type { MonsterMoves } from "../../src/strategy/rollout-live.js";
import { boardOf, queenOrder } from "./backtest-board.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const inPath = arg("in", "experiments/boss-sim/raw/fights.jsonl");
const outDir = arg("out-dir", "experiments/boss-sim/raw");
const shard = Number(arg("shard", "0"));
const shards = Number(arg("shards", "1"));
const samples = Number(arg("samples", "100"));
const seed = Number(arg("seed", "1"));
const limit = Number(arg("limit", "0"));
const starts = arg("starts", "t1,t5").split(",");
const withRollout = !flag("no-rollout");
// --no-scripts: the ablation, the rollout's simulation without its horizon and without the whole-fight scripts.
const scripts = !flag("no-scripts");
const damageScale = Number(arg("damage-scale", String(BOSS_SIM_DAMAGE_SCALE)));
const hpScale = Number(arg("hp-scale", String(BOSS_SIM_HP_SCALE)));
const threat = Number(arg("threat", String(BOSS_SIM_THREAT)));
const potionHold = Number(arg("potion-hold", String(BOSS_SIM_POTION_HOLD)));
const startLine = arg("start-line", "policy");
const orders = !flag("no-orders");
// Every line's best kill order (runBestOrder), as the rollout and B2 do; --no-best-order: the Queen's order only (B1).
const bestOrder = !flag("no-best-order");
const set = arg("set", "");
const keep: Set<string> | null = set ? new Set((JSON.parse(readFileSync("experiments/boss-sim/split.json", "utf8")) as Record<string, string[]>)[set]) : null;

interface FightRow {
  key: string;
  run_id: string;
  fight_no: number;
  asc: number;
  act: number;
  floor: number;
  encounter: string;
  entry_hp: number;
  first_ts?: string;
  max_hp: number;
  end_hp: number;
  outcome: "won" | "died";
  turns: number;
  t1: { turn: number; hp: number; state: Record<string, unknown> };
  t5?: { turn: number; hp: number; state: Record<string, unknown> };
}

const r2 = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);

/** The Queen's kill order (backtest-board queenOrder); --no-orders: none. */
function killOrderOf(input: RolloutInput): KillOrder | null {
  return orders ? queenOrder(input) : null;
}

function simFacts(line: BossSimLineResult) {
  return {
    samples: line.samples,
    wins: line.wins,
    deaths: line.deaths,
    capped: line.capped,
    winProb: r2(line.winProb),
    hpLoss: line.hpLoss,
    hpLossWon: line.hpLossWon,
    turns: line.turns,
    turnsWon: line.turnsWon,
    deathTurn: line.deathTurn,
    deathTurns: line.deathTurns,
    potions: line.potions,
    enemyHpLeftUnwon: line.enemyHpLeftUnwon,
    perTurn: line.perTurn.slice(0, 12).map((t) => [t.fighting, t.loss, t.dmg, t.incoming, t.enemyLoss]),
    policyTurns: line.policyTurns,
    policyNodes: line.policyNodes,
    // Per sample (won, turns, HP lost), compact: for re-scoring without re-running.
    outcomes: line.outcomes.map((o) => [o.won ? 1 : o.died ? -1 : 0, o.turns, Math.round(o.hpLoss)]),
  };
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `results-${shard}.jsonl`);
  writeFileSync(out, "");
  const knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: never }).collections, "cache");
  const mm = JSON.parse(readFileSync("src/knowledge/move-model.json", "utf8")) as MoveModelData;
  const db = (JSON.parse(readFileSync("src/knowledge/monster-db.json", "utf8")) as { monsters: MonsterMoves }).monsters;
  const model = withRollout ? loadFightValueModel() : null;
  const gates = withRollout ? loadFightValueGates() : null;
  const rows = readFileSync(inPath, "utf8").split("\n").filter((line) => line.trim() !== "");
  let done = 0;
  for (let index = 0; index < rows.length; index += 1) {
    if (index % shards !== shard) continue;
    if (limit && done >= limit) break;
    const row = JSON.parse(rows[index]!) as FightRow;
    if (keep && !keep.has(row.key)) continue;
    for (const start of starts) {
      const point = start === "t5" ? row.t5 : row.t1;
      if (!point) continue;
      const base = { key: row.key, start, run: row.run_id, asc: row.asc, act: row.act, floor: row.floor, enc: row.encounter, fightTurns: row.turns };
      const pre = start === "pre";
      const startHp = pre ? row.entry_hp : point.hp;
      const actual = { won: row.outcome === "won", hp: startHp, turnsLeft: row.turns - (point.turn - 1), hpLoss: startHp - row.end_hp, endHp: row.end_hp };
      let board: ReturnType<typeof boardOf>;
      let state: GameState;
      try {
        state = parseGameState(point.state);
        board = boardOf(state, knowledge, row.encounter, db, mm, { randomPotions: !flag("no-random-potions") });
      } catch (error) {
        appendFileSync(out, JSON.stringify({ ...base, actual, error: `board: ${String(error).slice(0, 300)}` }) + "\n");
        continue;
      }
      const line = board.plans[0]!;
      const simInput = pre ? redealInput(board.input, { fresh: true, hp: row.entry_hp }) : board.input;
      const simLine = pre || startLine === "policy" ? null : line;
      const record: Record<string, unknown> = { ...base, actual, piles: board.piles, hp: simInput.solver.player.hp, drawN: simInput.piles.draw.length, nPlans: board.plans.length };
      try {
        const t = performance.now();
        const simOpts = { samples, seed: seed + index * 101, scripts, damageScale, hpScale, threat, potionHold };
        // --orders best: the best of the solver's own targets and every kill order (runBestOrder); else the Queen's.
        if (bestOrder) {
          const res = await runBestOrder(runBossSim, simInput, [simLine], simOpts);
          record["order"] = res.lines[0]!.order;
          record["orders"] = res.byOrder.map((o) => [o.order, r2(o.result.lines[0]!.winProb)]);
          record["sim"] = { ...simFacts(res.lines[0]!), ms: Math.round(performance.now() - t) };
        } else {
          const order = killOrderOf(board.input);
          const res = runBossSim(simInput, [simLine], { ...simOpts, order });
          if (order) record["order"] = order.label;
          record["sim"] = { ...simFacts(res.lines[0]!), ms: Math.round(performance.now() - t) };
        }
      } catch (error) {
        record["simError"] = String(error instanceof Error ? error.stack ?? error.message : error).slice(0, 600);
      }
      if (withRollout && !pre) {
        try {
          const t = performance.now();
          const res = rolloutDecision({ ...board.input, model, gates, options: { budgetMs: 1e9, seed: seed + index * 101, k: 1, include: [line] } });
          const l = res.lines.find((x) => x.plan === line) ?? res.lines[0]!;
          record["rollout"] = {
            hpLoss: r2(l.hpLoss),
            winProb: r2(l.winProb),
            turnsToWin: r2(l.turnsToWin),
            deaths: l.deaths,
            wins: l.wins,
            horizon: l.horizon,
            samples: l.samples,
            w: l.basis.w,
            modelHpLoss: r2(l.modelForecast.rollout?.hpLoss),
            modelWinProb: r2(l.modelForecast.rollout?.winProb),
            ms: Math.round(performance.now() - t),
          };
        } catch (error) {
          record["rolloutError"] = String(error).slice(0, 300);
        }
      }
      if (start === "t1" || pre) {
        try {
          const clock = bossClock(state, knowledge, startHp);
          if (clock) {
            record["clock"] = {
              boss: clock.boss,
              deck: r2(clock.deck),
              need: clock.need,
              gap: clock.gap,
              hp: clock.hp,
              fightTurns: clock.fightTurns,
              survivableTurns: clock.survivableTurns,
              lossPerTurn: clock.lossPerTurn,
            };
          }
        } catch (error) {
          record["clockError"] = String(error).slice(0, 300);
        }
      }
      appendFileSync(out, JSON.stringify(record) + "\n");
    }
    done += 1;
  }
  console.error(`boss-sim backtest shard ${shard}/${shards}: ${done} fights -> ${out}`);
}

await main();
