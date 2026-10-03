/**
 * Control digests of the combat planner on logged boards (MECH_DEATH_MOVE, docs/mechanics-learning.md §9): each board's
 * whole decision as data (the question, Jev's view, every answer's resolution, as tests/mech-move-planner.test.ts viewOf
 * has it), hashed, for code on two commits to be compared board by board. It reads only APIs that predate the change, so
 * the same file runs on the base commit's worktree. The rollout and the random potions' Monte Carlo on a frozen clock, the
 * whole-fight boss simulation (B2) off; the knowledge data is the worktree's own (give both worktrees the same files).
 *
 *   npx tsx tools/plan-digests.ts boards --out BOARDS.json [--limit N]      pick the boards (log DB): rule-free multi-enemy
 *                                                                          fights and the rule encounters' fights
 *   npx tsx tools/plan-digests.ts digest --boards BOARDS.json --out D.json [--env '{"mechDeathMove":false}']
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv, type ScreenMemory } from "../src/project/types.js";
import { facingFightOf, planCombatTurn } from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

type Row = Record<string, unknown>;
const PY = ".cache/logdb-venv/bin/python";
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;
/** The encounters with a learned death rule today (the 2026-10-03 build): their boards are the "rule" group. */
const RULED = ["QUEEN+TORCH_HEAD_AMALGAM", "LIVING_SHIELD+TURRET_OPERATOR", "LIVING_FOG"];

function query(sql: string): Row[] {
  const out = execFileSync(PY, ["tools/logdb/query.py", "--no-sync", "--json", "--max-rows", "1000000", "--timeout", "120", sql], { encoding: "utf8", maxBuffer: 1 << 30 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

interface Board {
  name: string;
  group: "rule" | "control";
  off: number;
  len: number;
  facing: number | null;
}

/** Turn-2 first planning decisions (a board with enemies acting): every rule-encounter fight and one rule-free fight in `every`. */
function boards(): void {
  const limit = Number(arg("limit", "120"));
  const every = Number(arg("every", "40"));
  const fights = query(`SELECT run_id, floor, encounter, first_ts, len(monsters) AS kinds FROM fights WHERE ascension >= 8 AND len(list_distinct(monsters)) >= 2 OR encounter IN (${RULED.map((e) => `'${e}'`).join(", ")}) ORDER BY first_ts`);
  const out: Board[] = [];
  let control = 0;
  fights.forEach((fight, i) => {
    const ruled = RULED.includes(String(fight["encounter"]));
    if (!ruled && (i % every !== 0 || control >= limit)) return;
    const run = String(fight["run_id"]);
    const decisions = query(`SELECT ts, turn, label FROM decisions WHERE run_id = '${run}' AND floor = ${Number(fight["floor"])} AND screen = 'COMBAT' AND ts >= '${String(fight["first_ts"])}' ORDER BY ts`);
    const all = query(`SELECT ts, target_index, action FROM decisions WHERE run_id = '${run}' AND floor = ${Number(fight["floor"])} AND screen = 'COMBAT' AND ts >= '${String(fight["first_ts"])}' ORDER BY ts`);
    const pick = decisions.find((d) => Number(d["turn"]) === (ruled ? 3 : 2) && PLANNING.test(String(d["label"])));
    if (!pick) return;
    const state = query(`SELECT off, len FROM state_index WHERE run_id = '${run}' AND ts = '${String(pick["ts"])}' AND NOT coalesce(observed, false) ORDER BY off LIMIT 1`)[0];
    if (!state) return;
    const earlier = all.filter((d) => String(d["ts"]) < String(pick["ts"]) && d["target_index"] !== null && d["action"] !== "end_turn");
    out.push({ name: `${run} F${fight["floor"]} T${pick["turn"]} ${fight["encounter"]}`, group: ruled ? "rule" : "control", off: Number(state["off"]), len: Number(state["len"]), facing: earlier.length > 0 ? Number(earlier[earlier.length - 1]!["target_index"]) : null });
    if (!ruled) control += 1;
  });
  writeFileSync(arg("out", "boards.json"), JSON.stringify(out, null, 1));
  console.log(`${out.length} boards (${out.filter((b) => b.group === "rule").length} rule, ${out.filter((b) => b.group === "control").length} control)`);
}

function digest(): void {
  const list = JSON.parse(readFileSync(arg("boards", "boards.json"), "utf8")) as Board[];
  const over = JSON.parse(arg("env", "{}")) as Record<string, unknown>;
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
  const knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
  const config = loadConfig({} as NodeJS.ProcessEnv);
  const fd = openSync("logs/states.jsonl", "r");
  const out: Record<string, string> = {};
  for (const board of list) {
    const buffer = Buffer.alloc(board.len);
    readSync(fd, buffer, 0, board.len, board.off);
    const raw = (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Record<string, unknown>;
    const state = parseGameState(raw);
    const env = {
      state, knowledge, brief: buildRunBrief(state, knowledge),
      screenMemory: { ...createScreenMemory("COMBAT"), ...(board.facing !== null ? { facing: board.facing, facingFight: facingFightOf(state) } : {}) } as ScreenMemory,
      thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [],
      jevContext: "v1", buildDecider: "deepseek", thiefFacts: true, ...over,
    } as DecisionEnv;
    const decision = planCombatTurn(env);
    let view: unknown = decision ?? null;
    if (decision && decision.kind === "ask") {
      const ask = decision as AskDecision;
      const keys = Object.keys((ask.questions["plan"] as { criteria: Record<string, unknown> }).criteria);
      const pick = (key: string, confidence: number) => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as never;
      const res = (answers: never) => {
        const { apply: _apply, ...rest } = ask.resolve(answers);
        return rest;
      };
      view = {
        label: ask.label, state: ask.state, questions: ask.questions, jevView: ask.jevView ?? null,
        resolved: Object.fromEntries([...keys.map((key) => [key, res(pick(key, 0.9))]), ...keys.map((key) => [`${key}@0.3`, res(pick(key, 0.3))]), ["none", res({} as never)], ["bad", res(pick("nope", 0.9))]]),
      };
    }
    out[`${board.group}|${board.name}`] = createHash("sha256").update(JSON.stringify(view)).digest("hex").slice(0, 32);
    console.error(`${board.group} ${board.name} ${out[`${board.group}|${board.name}`]}`);
  }
  closeSync(fd);
  writeFileSync(arg("out", "digests.json"), JSON.stringify(out, null, 1));
}

const stage = process.argv[2] ?? "digest";
if (stage === "boards") boards();
else digest();
