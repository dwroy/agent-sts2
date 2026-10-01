/**
 * B5 (docs/boss-sim.md §14): on the logged turns of some bosses' fights since a time (V4.1 / V4.2), the line Jev chose
 * against the whole-fight simulation's best line. Every boss-fight turn Jev planned (the first plan choice of the turn,
 * tools/boss-sim/choices.py) of the chosen encounters is re-planned by the live planner with BOSS_SIM_LINES on (the
 * worker pool, `--samples` per line, the live deadline); Jev's logged choice is found among the new options by its text.
 * Per turn: the simulation's best line (its ranking, rankLines, whatever the trust list says), Jev's line, the paired
 * win-rate difference ± its standard error and both calibrated win rates. No model call (Jev's choice is only read);
 * logs/states.jsonl read by offset (read-only); writes --out only.
 *
 * Usage: npx tsx tools/boss-sim/b5-lines.ts --enc CRUSHER,QUEEN [--since "2026-09-30 08:22:52"] [--choices experiments/boss-sim/raw/choices-1002.jsonl]
 *          [--max-turn 12] [--samples 600] [--deadline 25000] [--workers 20] [--out experiments/boss-sim/raw/b5-lines.jsonl]
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

const encs = arg("enc", "").split(",").filter((x) => x !== "");
const since = arg("since", "2026-09-30 08:22:52");
const choicesPath = arg("choices", "experiments/boss-sim/raw/choices-1002.jsonl");
const maxTurn = Number(arg("max-turn", "12"));
const outPath = arg("out", "experiments/boss-sim/raw/b5-lines.jsonl");
bossLinesOptions.samples = Number(arg("samples", "600"));
bossLinesOptions.deadlineMs = Number(arg("deadline", "25000"));
bossLinesOptions.workers = Number(arg("workers", "20"));

interface ChoiceRow {
  key: string;
  enc: string;
  fight_ts: string;
  turn: number;
  s_off: number;
  s_len: number;
  choice: string;
  lines: Record<string, { hp_lost: number; plays: string }>;
}

type Criteria = Record<string, Record<string, unknown>>;
const criteriaOf = (d: AskDecision): Criteria =>
  Object.fromEntries(Object.entries((d.questions["plan"] as { criteria: Record<string, string | null> }).criteria).map(([k, v]) => [k, v ? (JSON.parse(v) as Record<string, unknown>) : {}]));

async function main(): Promise<void> {
  const knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: never }).collections, "cache");
  const seen = new Set<string>();
  const rows = readFileSync(choicesPath, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as ChoiceRow)
    .filter((r) => r.fight_ts >= since && r.turn <= maxTurn && (encs.length === 0 || encs.some((e) => r.enc.includes(e))))
    .filter((r) => {
      const id = `${r.key}:${r.turn}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  const config = loadConfig(process.env);
  bossLinesOptions.enabled = true;
  const out: string[] = [];
  let done = 0;
  for (const row of rows) {
    const state = parseGameState((JSON.parse(readAt("logs/states.jsonl", row.s_off, row.s_len)) as { state: unknown }).state);
    const env: DecisionEnv = {
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
    };
    const on = planCombatTurn(env);
    done += 1;
    if (!on || on.kind !== "ask") continue;
    const crit = criteriaOf(on as AskDecision);
    const log = (on as AskDecision).resolve({} as AnswerSet).log as { boss_sim?: Record<string, unknown> } | undefined;
    const sim = log?.boss_sim as { available: boolean; reason?: string; ms: number; samples: number; requested: number; timed_out: boolean; boss: string | null; low_trust: boolean; best: string | null; tied: string[]; ranked: string[]; lines: Record<string, { win: number; cal: number; d: number; se: number; loss: number; won_loss: number | null }> } | undefined;
    if (!sim?.available || !sim.lines) {
      out.push(JSON.stringify({ key: row.key, enc: row.enc, turn: row.turn, available: false, reason: sim?.reason ?? null }));
      continue;
    }
    const jevPlays = row.lines[row.choice]?.plays ?? null;
    const jev = Object.keys(crit).find((k) => crit[k]!["plays"] === jevPlays) ?? null;
    const best = sim.ranked[0] ?? null;
    const line = (k: string | null) => (k && sim.lines[k] ? { key: k, plays: crit[k]?.["plays"] ?? null, ...sim.lines[k] } : null);
    const record = {
      key: row.key,
      enc: row.enc,
      turn: row.turn,
      available: true,
      ms: sim.ms,
      samples: sim.samples,
      timed_out: sim.timed_out,
      low_trust: sim.low_trust,
      options: Object.keys(crit).length,
      best: line(best),
      tied: sim.tied,
      jev: line(jev),
      jev_rank: jev ? sim.ranked.indexOf(jev) + 1 : null,
      jev_is_best: jev !== null && (jev === best || sim.tied.includes(jev)),
      jev_within_2se: jev && sim.lines[jev] ? sim.lines[jev]!.d >= -2 * sim.lines[jev]!.se : null,
    };
    out.push(JSON.stringify(record));
    console.error(`${done}/${rows.length} ${row.key} T${row.turn} ${row.enc}: ${sim.ms} ms ${sim.samples}/${sim.requested}; best ${best} ${sim.lines[best ?? ""]?.cal}; jev ${jev} rank ${record.jev_rank} d ${jev ? sim.lines[jev]?.d : "-"}±${jev ? sim.lines[jev]?.se : "-"}`);
  }
  releaseBossLinesPool();
  writeFileSync(outPath, out.join("\n") + "\n");
}

await main();
