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
 * Usage: npx tsx tools/boss-sim/backtest.ts [--in experiments/boss-sim/raw/fights.jsonl] [--out-dir experiments/boss-sim/raw]
 *          [--shard I --shards N] [--samples 100] [--seed 1] [--starts t1,t5] [--limit N] [--no-rollout] [--no-scripts] [--damage-scale 0.5] [--no-orders]
 * Output: <out-dir>/results-<I>.jsonl, one line per (fight, start).
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { makeKnowledge } from "../../src/knowledge/index.js";
import { parseGameState, type GameState } from "../../src/mod/schema.js";
import { BOSS_SIM_DAMAGE_SCALE, runBossSim, type BossSimLineResult } from "../../src/sim/boss-sim.js";
import { bossClock } from "../../src/strategy/boss-clock.js";
import { loadFightValueModel } from "../../src/strategy/fight-value.js";
import { loadFightValueGates, rolloutDecision, type KillOrder, type MoveModelData, type RolloutInput } from "../../src/strategy/rollout.js";
import type { MonsterMoves } from "../../src/strategy/rollout-live.js";
import { boardOf } from "./backtest-board.js";

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
const orders = !flag("no-orders");

interface FightRow {
  key: string;
  run_id: string;
  fight_no: number;
  asc: number;
  act: number;
  floor: number;
  encounter: string;
  entry_hp: number;
  max_hp: number;
  end_hp: number;
  outcome: "won" | "died";
  turns: number;
  t1: { turn: number; hp: number; state: Record<string, unknown> };
  t5?: { turn: number; hp: number; state: Record<string, unknown> };
}

const r2 = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);

/**
 * The kill order the sim's later turns follow, where the fight's plan is known (experience queen-plan, the boss clock's
 * note: the Torch Head Amalgam first, the Queen only takes AoE until it is dead; the live fight plan focuses it): the
 * solver alone chips a minion at MINION_CHIP and left the Amalgam up (simulated damage 29 a turn against the logged 43).
 * --no-orders: none. Other bosses: the solver's own targets.
 */
function killOrderOf(input: RolloutInput): KillOrder | null {
  if (!orders) return null;
  const amalgam = input.enemies.filter((e) => e.id === "TORCH_HEAD_AMALGAM").map((e) => e.index);
  const queen = input.enemies.filter((e) => e.id === "QUEEN").map((e) => e.index);
  if (amalgam.length === 0 || queen.length === 0) return null;
  return { key: "TORCH_HEAD_AMALGAM>QUEEN", label: "Torch Head Amalgam > Queen", groups: [amalgam, queen] };
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
    for (const start of starts) {
      const point = start === "t5" ? row.t5 : row.t1;
      if (!point) continue;
      const base = { key: row.key, start, run: row.run_id, asc: row.asc, act: row.act, floor: row.floor, enc: row.encounter, fightTurns: row.turns };
      const actual = { won: row.outcome === "won", hp: point.hp, turnsLeft: row.turns - (point.turn - 1), hpLoss: point.hp - row.end_hp, endHp: row.end_hp };
      let board: ReturnType<typeof boardOf>;
      let state: GameState;
      try {
        state = parseGameState(point.state);
        board = boardOf(state, knowledge, row.encounter, db, mm);
      } catch (error) {
        appendFileSync(out, JSON.stringify({ ...base, actual, error: `board: ${String(error).slice(0, 300)}` }) + "\n");
        continue;
      }
      const line = board.plans[0]!;
      const record: Record<string, unknown> = { ...base, actual, piles: board.piles, hp: board.solver.player.hp, drawN: board.input.piles.draw.length, nPlans: board.plans.length };
      try {
        const t = performance.now();
        const order = killOrderOf(board.input);
        const res = runBossSim(board.input, [line], { samples, seed: seed + index * 101, scripts, damageScale, order });
        if (order) record["order"] = order.label;
        record["sim"] = { ...simFacts(res.lines[0]!), ms: Math.round(performance.now() - t) };
      } catch (error) {
        record["simError"] = String(error instanceof Error ? error.stack ?? error.message : error).slice(0, 600);
      }
      if (withRollout) {
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
      if (start === "t1") {
        try {
          const clock = bossClock(state, knowledge, point.hp);
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
