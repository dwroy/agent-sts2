/**
 * B2's acceptance on logged boss turns (docs/boss-sim.md §11.6): `--n` mid-fight turns Jev planned (as
 * tools/boss-sim/lines.ts picks them: the chosen split side, turns 2-8, one per fight, round-robin over the bosses),
 * each re-planned by the live planner twice, with BOSS_SIM_LINES off and on (the worker pool, `--samples` per line, the
 * live deadline): the time the whole-fight lines took, the best line before (the 5-turn rollout's) and after (the
 * simulation's ranking; the rollout's for a low-trust boss), and where the line Jev actually chose (found by its text)
 * ranks by the new numbers. No model call (Jev's logged choice is only read); logs/states.jsonl read by offset
 * (read-only); writes --out only.
 *
 * Usage: npx tsx tools/boss-sim/b2-lines.ts [--n 30] [--set val] [--samples 600] [--deadline 25000] [--workers 12]
 *          [--out experiments/boss-sim/raw/b2-lines.jsonl]
 */
import { readFileSync, writeFileSync } from "node:fs";

import { loadConfig } from "../../src/config.js";
import { makeKnowledge } from "../../src/knowledge/index.js";
import { parseGameState } from "../../src/mod/schema.js";
import { buildRunBrief } from "../../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../../src/project/types.js";
import type { AnswerSet } from "../../src/jev/answers.js";
import { planCombatTurn } from "../../src/screens/combat-plan.js";
import { bossLinesOptions, releaseBossLinesPool } from "../../src/sim/boss-lines.js";
import { readAt } from "./backtest-board.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const n = Number(arg("n", "30"));
const set = arg("set", "val");
const outPath = arg("out", "experiments/boss-sim/raw/b2-lines.jsonl");
bossLinesOptions.samples = Number(arg("samples", "600"));
bossLinesOptions.deadlineMs = Number(arg("deadline", "25000"));
bossLinesOptions.workers = Number(arg("workers", "12"));

interface ChoiceRow {
  key: string;
  enc: string;
  turn: number;
  s_off: number;
  s_len: number;
  choice: string;
  lines: Record<string, { hp_lost: number; plays: string }>;
}

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

type Criteria = Record<string, Record<string, unknown>>;
const criteriaOf = (d: AskDecision): Criteria =>
  Object.fromEntries(Object.entries((d.questions["plan"] as { criteria: Record<string, string | null> }).criteria).map(([k, v]) => [k, v ? (JSON.parse(v) as Record<string, unknown>) : {}]));
const flagged = (c: Criteria) => Object.keys(c).filter((k) => c[k]!["rollout_best"] === true);
const playsOf = (c: Criteria, key: string | undefined) => (key ? (c[key]?.["plays"] as string | undefined) ?? null : null);
const rolloutLoss = (text: unknown) => {
  const m = /expected further HP loss ([\d.]+)/.exec(String(text ?? ""));
  const d = /dead within \d+ turns in (\d+)\/(\d+)/.exec(String(text ?? ""));
  return { loss: m ? Number(m[1]) : null, dead: d ? `${d[1]}/${d[2]}` : "0" };
};

async function main(): Promise<void> {
  const knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: never }).collections, "cache");
  const keys = new Set((JSON.parse(readFileSync("experiments/boss-sim/split.json", "utf8")) as Record<string, string[]>)[set]);
  const rows = readFileSync("experiments/boss-sim/raw/choices.jsonl", "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as ChoiceRow);
  rows.sort((a, b) => hash(`${a.key}:${a.turn}`) - hash(`${b.key}:${b.turn}`));
  const byBoss = new Map<string, ChoiceRow[]>();
  const seen = new Set<string>();
  for (const row of rows) {
    if (!keys.has(row.key) || row.turn < 2 || row.turn > 8 || Object.keys(row.lines).length < 3 || seen.has(row.key)) continue;
    seen.add(row.key);
    const boss = row.enc.split("+")[0]!;
    byBoss.set(boss, [...(byBoss.get(boss) ?? []), row]);
  }
  const queue: ChoiceRow[] = [];
  const lists = [...byBoss.values()];
  for (let k = 0; lists.some((l) => l.length > k); k += 1) for (const list of lists) if (list[k]) queue.push(list[k]!);
  const config = loadConfig(process.env);
  const out: string[] = [];
  let done = 0;
  for (const row of queue) {
    if (done >= n) break;
    const state = parseGameState((JSON.parse(readAt("logs/states.jsonl", row.s_off, row.s_len)) as { state: unknown }).state);
    const env = (): DecisionEnv => ({
      state,
      knowledge,
      brief: buildRunBrief(state, knowledge),
      screenMemory: createScreenMemory("COMBAT"),
      thresholds: config.thresholds,
      runStart: "auto",
      characterPreference: null,
      allowFtueModals: false,
      strictJev: true,
      combatPlanner: "turn",
      shopDiscardPotions: [],
      jevContext: "off",
      fightPlan: "off",
    });
    bossLinesOptions.enabled = false;
    const off = planCombatTurn(env());
    bossLinesOptions.enabled = true;
    const started = performance.now();
    const on = planCombatTurn(env());
    const planMs = Math.round(performance.now() - started);
    if (!off || !on || off.kind !== "ask" || on.kind !== "ask") continue;
    const cOff = criteriaOf(off as AskDecision);
    const cOn = criteriaOf(on as AskDecision);
    const log = (on as AskDecision).resolve({} as AnswerSet).log as { boss_sim?: Record<string, unknown> } | undefined;
    const sim = log?.boss_sim as { available: boolean; reason?: string; ms: number; samples: number; requested: number; timed_out: boolean; orders: number; boss: string | null; low_trust: boolean; best: string | null; tied: string[]; ranked: string[]; lines: Record<string, { win: number; cal: number; d: number; se: number; loss: number; won_loss: number | null }>; plan?: string } | undefined;
    if (!sim) continue;
    const jevPlays = row.lines[row.choice]?.plays ?? null;
    const jevKey = Object.keys(cOn).find((k) => cOn[k]!["plays"] === jevPlays) ?? null;
    const oldBest = flagged(cOff);
    const newBest = flagged(cOn);
    const oldPlays = oldBest.map((k) => playsOf(cOff, k));
    const newPlays = newBest.map((k) => playsOf(cOn, k));
    const lineOf = (k: string | null | undefined) => (k && sim.lines?.[k] ? { key: k, plays: playsOf(cOn, k), ...sim.lines[k], rollout: rolloutLoss(cOn[k]?.["rollout"]), turn_loss: cOn[k]?.["hp_lost"] ?? null, damage: cOn[k]?.["damage_dealt"] ?? null } : null);
    const oldKeyOn = oldPlays[0] ? (Object.keys(cOn).find((k) => cOn[k]!["plays"] === oldPlays[0]) ?? null) : null;
    const record = {
      key: row.key,
      enc: row.enc,
      turn: row.turn,
      options: Object.keys(cOn).length,
      sim_ms: sim.ms,
      plan_ms: planMs,
      samples: sim.samples,
      requested: sim.requested,
      timed_out: sim.timed_out,
      orders: sim.orders,
      available: sim.available,
      reason: sim.reason ?? null,
      low_trust: sim.low_trust,
      old_best: oldBest,
      new_best: newBest,
      differs: JSON.stringify(oldPlays) !== JSON.stringify(newPlays),
      old_line: lineOf(oldKeyOn),
      new_line: lineOf(newBest[0] ?? sim.best),
      sim_best: sim.best,
      sim_tied: sim.tied,
      jev: jevKey,
      jev_line: lineOf(jevKey),
      jev_rank: jevKey && sim.ranked ? sim.ranked.indexOf(jevKey) + 1 : null,
      jev_tied: jevKey && sim.lines?.[jevKey] ? jevKey === sim.best || sim.lines[jevKey]!.d >= -2 * sim.lines[jevKey]!.se : null,
      ranked: sim.ranked,
      lines: Object.fromEntries(Object.entries(sim.lines ?? {}).map(([k, v]) => [k, { ...v, plays: playsOf(cOn, k) }])),
      plan: sim.plan ?? (on as AskDecision).state["whole_fight_plan"] ?? null,
    };
    out.push(JSON.stringify(record));
    done += 1;
    console.error(`${done}/${n} ${row.key} T${row.turn} ${row.enc}: sim ${sim.ms} ms (${sim.samples}/${sim.requested}) best ${JSON.stringify(oldBest)} -> ${JSON.stringify(newBest)}${record.differs ? " DIFFERS" : ""}; jev ${jevKey} rank ${record.jev_rank}/${sim.ranked?.length}${sim.low_trust ? " [low trust]" : ""}`);
  }
  releaseBossLinesPool();
  writeFileSync(outPath, out.join("\n") + "\n");
}

await main();
