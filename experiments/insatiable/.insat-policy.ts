// scratch experiment (not committed): the later-turn policy's Escape value, simulated to the fight's end.
import { appendFileSync, readFileSync, openSync, readSync, writeFileSync } from "node:fs";
import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { simulateFight, type RolloutInput, type RolloutResult } from "../src/strategy/rollout.js";
import { rolloutLiveOptions, rolloutTap } from "../src/strategy/rollout-live.js";
import { sandpitExperiment, solveTap } from "../src/strategy/turn-solver.js";
function arg(name: string, fallback: string): string { const at = process.argv.indexOf(`--${name}`); return at >= 0 ? process.argv[at + 1]! : fallback; }
const rowsPath = arg("rows", ""); const outPath = arg("out", ""); const n = Number(arg("n", "64")); const H = Number(arg("h", "15"));
const variants = arg("variants", "0,20,40,80").split(",").map(Number);
const shard = Number(arg("shard", "0")); const shards = Number(arg("shards", "1"));
const config = loadConfig(process.env);
const knowledge = makeKnowledge(JSON.parse(readFileSync(".cache/game-data.json", "utf8")).collections, "cache");
const fd = openSync("logs/states.jsonl", "r");
function stateAt(off: number) { const buf = Buffer.alloc(1 << 21); const k = readSync(fd, buf, 0, buf.length, off); return JSON.parse(buf.subarray(0, buf.subarray(0, k).indexOf(10)).toString("utf8")).state; }
writeFileSync(outPath, "");
const rows = readFileSync(rowsPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r: any) => r.firstOfTurn && r.board.sandpit !== null);
const playsText = (plan: any): string => (plan.steps.length === 0 ? "nothing (end the turn now)" : plan.steps.map((step: any) => (step.targetName ? `${step.name} -> ${step.targetName}` : step.name)).join(", then "));
for (const [k, row] of rows.entries()) {
  if (k % shards !== shard) continue;
  const state = parseGameState(stateAt(row.off));
  const env = { state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"), thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [] } as any;
  let tapped: { input: RolloutInput; result: RolloutResult } | null = null;
  rolloutTap.onRollout = (input, result) => { tapped = { input, result }; };
  rolloutLiveOptions.now = () => 0; potionMcOptions.now = () => 0;
  sandpitExperiment.turnDamage = 20;
  planCombatTurn(env);
  rolloutTap.onRollout = null;
  if (!tapped) continue;
  const { input, result } = tapped as { input: RolloutInput; result: RolloutResult };
  const seed = input.options?.seed ?? 1;
  const chosenPlays = row.options[row.chosen ?? ""]?.plays ?? null;
  const lines = result.lines.map((line) => {
    const byVariant: Record<string, { win: number; escapes: number }> = {};
    for (const v of variants) {
      sandpitExperiment.turnDamage = v;
      let wins = 0; let escapes = 0;
      for (let j = 0; j < n; j += 1) {
        let played = 0;
        solveTap.onSolve = (_si, res) => { played += (res.plans[0]?.steps ?? []).filter((s) => s.cardId === "FRANTIC_ESCAPE").length; };
        const { records } = simulateFight(input, line.plan, H, seed * 7919 + 1 + j, false);
        solveTap.onSolve = null;
        if (records.some((r) => r.won)) wins += 1;
        escapes += played;
      }
      byVariant[String(v)] = { win: wins / n, escapes: escapes / n };
    }
    sandpitExperiment.turnDamage = 20;
    return { plays: playsText(line.plan), escapes: line.plan.steps.filter((s) => s.cardId === "FRANTIC_ESCAPE").length, chosen: playsText(line.plan) === chosenPlays, byVariant };
  });
  appendFileSync(outPath, JSON.stringify({ run: row.run, turn: row.turn, won: row.won, sandpit: row.board.sandpit, lines }) + "\n");
}
