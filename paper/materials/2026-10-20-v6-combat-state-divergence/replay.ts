/** Offline replay of frozen inputs. No requests, game actions, live files or current knowledge reads. */
import { readFileSync } from "node:fs";
import { simulateFight, type RolloutInput } from "../../../agent/src/reflex/rollout.js";
import { solveTap, type SolverInput } from "../../../agent/src/reflex/turn-solver.js";

const cases = JSON.parse(readFileSync(new URL("../../../agent/tests/combat-state-divergence-evidence.json", import.meta.url), "utf8"));
const samples = Number(process.argv[2] ?? 256);
if (!Number.isSafeInteger(samples) || samples < 1 || samples > 256) throw new Error("samples must be 1..256");
for (const [name, frame] of Object.entries(cases) as [string, any][]) {
  const input = frame.input as RolloutInput;
  const summary = { name, run: frame.run, samples, wins: 0, deaths: 0, pending: 0, next_turn_deaths: 0,
    original_eight_wins: 0, bad_sample: frame.bad_sample, bad_sample_next: null as unknown };
  for (let j = 0; j < samples; j += 1) {
    let next: SolverInput | undefined;
    solveTap.onSolve = (si, result) => {
      if (next) return;
      next = si;
      if (j === frame.bad_sample) summary.bad_sample_next = { hand: si.hand.map((c) => c.cardId),
        hp: si.player.hp, enemies: si.enemies.map((e) => ({ hp: e.hp, attacks: e.attacks })),
        chosen: result.plans[0]?.steps, hpAfter: result.plans[0]?.outcome.hpAfter };
    };
    try {
      const { records } = simulateFight(input, input.plans[0]!, 5, (input.options!.seed ?? 0) * 7919 + 1 + j, false);
      const last = records.at(-1)!;
      if (last.won) { summary.wins++; if (j < 8) summary.original_eight_wins++; }
      else if (last.died) summary.deaths++;
      else summary.pending++;
      if (records[1]?.died) summary.next_turn_deaths++;
    } finally { solveTap.onSolve = null; }
  }
  console.log(JSON.stringify(summary));
}
