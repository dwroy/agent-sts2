/**
 * Offline check of Lizard Tail's tracking (combat-plan trackLizardTail; fix-queue: Y8E0KK4L7JBL F48, the tail's revive not
 * recognised when the enemy turn kept hitting after it). No model is called and nothing is written outside --out. The
 * logged states (logs/states.jsonl through the log DB's state_index offsets, read-only) are walked frame by frame, every
 * frame of a fight plus the first frame after it, with the tracker before this change (70cee12, copied below) and the
 * current one side by side; executed end_turn decisions are noted to the current one as the loop and the journal replay
 * note them (noteLizardTailEndTurn).
 *
 * --mode tail (default): the runs that held the tail. Per run: where each tracker marks it used (and the current one's
 *   reason); per logged combat decision where the two disagree on whether the tail is a revive left: the decision, and on
 *   an end_turn the mod flags lethal the SL judge's verdict (judgeEndTurn, the logged label) with each tracker's revives.
 *   --plan also plans each such decision again with each record (the 5-turn rollout and B2 off, the random potions' Monte
 *   Carlo on a frozen clock) and says whether the line changes; where the current record makes it a least-loss card, the
 *   early reload's verdict (judgeLeastLossNow, SL_RELOAD_EARLY with SL_JUDGE_ANY_DRAW's bound; no draw tracker: nothing taken as
 *   added to the pile).
 * --mode pretend: the runs that never held it, with LIZARD_TAIL put in every state's relics: every "used" either tracker
 *   reads there is a false positive (the game had no tail to fire).
 *
 * Usage: npx tsx tools/lizard-tail-replay.ts [--out experiments/lizard-tail] [--mode tail|pretend] [--plan] [--shard i/n] [--runs ID,...]
 * Output: <out>/<mode>[-<shard>].jsonl (one row per detection, disagreement or run), and a summary on stdout.
 */
import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type Decision, type DecisionEnv, type ScreenMemory } from "../src/project/types.js";
import { drawBoundOf, leastLossFactsOf, LIZARD_TAIL_REVIVE_SHARE, noteFacing, noteLizardTailEndTurn, planCombatTurn, revivesOf, trackLizardTail } from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { judgeEndTurn, judgeLeastLossNow, LEAST_LOSS_LABEL } from "../src/sl/judge.js";
import { heldCardEthereal } from "../src/strategy/card-model.js";
import { fightKey } from "../src/strategy/fight-plan.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { asArray, asRecord, bool, num, numOrNull, str } from "../src/util/json.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const outDir = arg("out", fromRoot("experiments/lizard-tail"));
const mode = arg("mode", "tail") as "tail" | "pretend";
const plan = process.argv.includes("--plan");
const [shardAt, shardOf] = arg("shard", "0/1").split("/").map(Number) as [number, number];
const runsOnly = arg("runs", "");
const STATES = fromRoot("logs/states.jsonl");
const PY = fromRoot("data/logdb-venv/bin/python");
type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(PY, [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "2000000", "--timeout", "300", sql], { encoding: "utf8", maxBuffer: 1 << 30 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

const fd = openSync(STATES, "r");
function rawAt(off: number, len: number): Record<string, unknown> {
  const buffer = Buffer.alloc(len);
  readSync(fd, buffer, 0, len, off);
  return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Record<string, unknown>;
}

const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

/* ---- the tracker before this change (70cee12), verbatim but for its record's name ---------------------------------- */

const OLD_SLACK = 5;
type OldRecord = { runId: string; used: boolean; last?: { fight: string; turn: number; hp: number; lethal: boolean; fairies: number } };
function oldFairies(runRaw: Record<string, unknown>): number {
  return asArray(runRaw["potions"]).map(asRecord).filter((slot) => bool(slot["occupied"]) && str(slot["potion_id"]) === "FAIRY_IN_A_BOTTLE").length;
}
function trackBefore(memory: { lizardTail?: OldRecord }, state: GameState): void {
  const runId = str(state.raw["run_id"]);
  if (!runId) return;
  if (memory.lizardTail?.runId !== runId) memory.lizardTail = { runId, used: false };
  const tail = memory.lizardTail;
  if (tail.used) return;
  const runRaw = asRecord(state.run?.raw);
  const combat = asRecord(state.raw["combat"]);
  const player = asRecord(combat["player"]);
  const held = asArray(runRaw["relics"]).some((relic) => str(asRecord(relic)["relic_id"]) === "LIZARD_TAIL");
  if (!held || !state.in_combat || numOrNull(player["current_hp"]) === null) {
    tail.last = undefined;
    return;
  }
  const hp = num(player["current_hp"]);
  const revive = Math.floor(num(player["max_hp"]) * LIZARD_TAIL_REVIVE_SHARE);
  const fight = fightKey(state);
  const turn = state.turn ?? 0;
  const fairies = oldFairies(runRaw);
  const last = tail.last;
  if (last && last.fight === fight && turn > last.turn && last.lethal && fairies >= last.fairies && hp > 0 && hp <= revive && hp >= revive - OLD_SLACK) {
    tail.used = true;
    tail.last = undefined;
    return;
  }
  if (state.combat?.can_use_combat_actions === false) return;
  const incoming = asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .reduce((sum, enemy) => sum + asArray(enemy["intents"]).map(asRecord).reduce((s, intent) => s + (numOrNull(intent["damage"]) ?? 0) * Math.max(1, numOrNull(intent["hits"]) ?? 1), 0), 0);
  const lethal = bool(combat["end_turn_will_kill_player"]) || incoming - num(player["block"]) >= hp;
  tail.last = { fight, turn, hp, lethal, fairies };
}

/* ---- the walk ------------------------------------------------------------------------------------------------------ */

function envOf(state: GameState, memory: Partial<ScreenMemory>): DecisionEnv {
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: { ...createScreenMemory("COMBAT"), ...memory }, thresholds: config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
    thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
  };
}

/** What a planned decision comes to: the action and its reason, or the question with its options' texts (the plan lines). */
function planSummary(decision: Decision | null): string {
  if (!decision) return "none";
  if (decision.kind === "act") return `${decision.label} ${JSON.stringify(decision.intent)} | ${decision.rationale}`;
  const options = Object.values(decision.questions).map((question) => JSON.stringify("criteria" in question ? question.criteria : question));
  return `ask ${decision.label} | ${options.join(" ; ")}`;
}

function tailHeld(state: GameState): boolean {
  return asArray(asRecord(state.run?.raw)["relics"]).some((relic) => str(asRecord(relic)["relic_id"]) === "LIZARD_TAIL");
}

const COMBAT_SCREENS = new Set(["COMBAT", "CARD_SELECTION", "GAME_OVER"]);

function main(): void {
  mkdirSync(outDir, { recursive: true });
  rolloutLiveOptions.enabled = false;
  bossLinesOptions.enabled = false;
  potionMcOptions.now = () => 0;
  const out = join(outDir, `${mode}${shardOf > 1 ? `-${shardAt}` : ""}.jsonl`);
  writeFileSync(out, "");
  const write = (row: Row) => writeFileSync(out, `${JSON.stringify(row)}\n`, { flag: "a" });
  const tailRuns = query(`SELECT DISTINCT run_id FROM fights WHERE list_contains(relics, 'LIZARD_TAIL')`).map((row) => String(row["run_id"]));
  const runs = mode === "tail"
    ? query(`SELECT run_id, min(first_ts) AS t FROM fights WHERE list_contains(relics, 'LIZARD_TAIL') GROUP BY 1 ORDER BY 2`).map((row) => String(row["run_id"]))
    : query(`SELECT run_id, min(first_ts) AS t FROM fights WHERE run_id IS NOT NULL GROUP BY 1 ORDER BY 2`).map((row) => String(row["run_id"])).filter((run) => !tailRuns.includes(run));
  const totals = { runs: 0, frames: 0, oldUsed: 0, newUsed: 0, disagree: 0, slChanged: 0, planChanged: 0 };
  runs.forEach((run, index) => {
    if (index % shardOf !== shardAt) return;
    if (runsOnly && !runsOnly.split(",").includes(run)) return;
    totals.runs += 1;
    const frames = query(`SELECT off, len, ts, observed, screen, floor, turn FROM state_index WHERE run_id = '${run}' ORDER BY off`);
    const decisions = query(`SELECT ts, turn, label, action, result, target_index FROM decisions WHERE run_id = '${run}' AND action IS NOT NULL ORDER BY ts`);
    const byTs = new Map<string, Row[]>();
    for (const row of decisions) byTs.set(String(row["ts"]), [...(byTs.get(String(row["ts"])) ?? []), row]);
    const before: { lizardTail?: OldRecord } = {};
    const now = createScreenMemory("COMBAT");
    let inFight = false;
    let oldAt: string | null = null;
    let newAt: string | null = null;
    for (const frame of frames) {
      const screen = String(frame["screen"]);
      const combatScreen = COMBAT_SCREENS.has(screen);
      // Every frame of a fight and the first one after it (the rest do nothing to either tracker).
      if (!combatScreen && !inFight) continue;
      const raw = rawAt(Number(frame["off"]), Number(frame["len"]));
      if (mode === "pretend") {
        const runRaw = asRecord(raw["run"]);
        if (raw["run"]) runRaw["relics"] = [...asArray(runRaw["relics"]), { index: 99, relic_id: "LIZARD_TAIL", name: "蜥蜴尾巴", stack: null, is_melted: false }];
      }
      const state = parseGameState(raw);
      inFight = state.in_combat;
      totals.frames += 1;
      const oldWas = before.lizardTail?.used === true;
      trackBefore(before, state);
      const how = trackLizardTail(now, state);
      const where = `F${state.run?.floor ?? "?"} T${state.turn ?? "?"}`;
      if (!oldWas && before.lizardTail?.used) {
        oldAt = `${where} ${String(frame["ts"])}`;
        totals.oldUsed += 1;
        write({ kind: "old_used", run, where, ts: frame["ts"], screen });
      }
      if (how) {
        newAt = `${where} ${String(frame["ts"])}`;
        totals.newUsed += 1;
        write({ kind: "new_used", run, where, ts: frame["ts"], screen, observed: frame["observed"] === true, how });
      }
      // An SL reload put it back (the fight again from a lower turn).
      if (newAt && now.lizardTail?.used === false) {
        write({ kind: "new_restored", run, where, ts: frame["ts"] });
        newAt = null;
      }
      if (frame["observed"] === true) continue;
      for (const decision of byTs.get(String(frame["ts"])) ?? []) {
        const executed = !/^(failed|not dispatched)/.test(String(decision["result"] ?? ""));
        const action = String(decision["action"]);
        if (mode === "tail" && state.screen === "COMBAT" && state.in_combat && tailHeld(state)) {
          const maxHp = num(asRecord(asRecord(state.raw["combat"])["player"])["max_hp"], state.run?.max_hp ?? 0);
          const oldRevives = revivesOf(state, { ...createScreenMemory("COMBAT"), lizardTail: before.lizardTail }, maxHp).map((revive) => revive.source);
          const newRevives = revivesOf(state, now, maxHp).map((revive) => revive.source);
          if (oldRevives.join() !== newRevives.join()) {
            totals.disagree += 1;
            const row: Row = { kind: "disagree", run, where, ts: frame["ts"], label: decision["label"], action, old_revives: oldRevives, new_revives: newRevives };
            if (action === "end_turn" && asRecord(state.raw["combat"])["end_turn_will_kill_player"] === true) {
              const ethereal = (card: Record<string, unknown>) => heldCardEthereal(card, knowledge);
              const label = String(decision["label"]);
              const oldVerdict = judgeEndTurn(state, { label, revives: oldRevives, ethereal, knowledge });
              const newVerdict = judgeEndTurn(state, { label, revives: newRevives, ethereal, knowledge });
              row["sl_old"] = { certain: oldVerdict.certain, tier: oldVerdict.tier, reason: oldVerdict.reason.slice(0, 200) };
              row["sl_new"] = { certain: newVerdict.certain, tier: newVerdict.tier, reason: newVerdict.reason.slice(0, 200) };
              if (oldVerdict.certain !== newVerdict.certain) totals.slChanged += 1;
            }
            if (plan) {
              const facing = { facing: now.facing, facingFight: now.facingFight };
              const t0 = performance.now();
              const oldPlan = planSummary(planCombatTurn(envOf(state, { ...facing, lizardTail: structuredClone(before.lizardTail) as ScreenMemory["lizardTail"] })));
              const planned = planCombatTurn(envOf(state, { ...facing, lizardTail: structuredClone(now.lizardTail) }));
              const newPlan = planSummary(planned);
              // SL_RELOAD_EARLY (on by default): the least-loss line's first card is where the early reload is judged (no
              // draw tracker here: nothing taken as added to the draw pile).
              if (planned?.kind === "act" && planned.label === LEAST_LOSS_LABEL && planned.intent.action !== "end_turn") {
                const facts = leastLossFactsOf(planned);
                const bound = facts ? drawBoundOf(facts) : null;
                const early = judgeLeastLossNow(state, { revives: newRevives, ethereal: (card) => heldCardEthereal(card, knowledge), facts, knownDrawsJudge: true, addedToPile: false, knowledge, ...(bound ? { drawBound: bound } : {}) });
                row["early_new"] = { certain: early.certain, tier: early.tier, reason: early.reason.slice(0, 200) };
              }
              row["plan_old"] = oldPlan;
              row["plan_new"] = newPlan;
              row["plan_changed"] = oldPlan !== newPlan;
              row["plan_ms"] = Math.round(performance.now() - t0);
              if (oldPlan !== newPlan) totals.planChanged += 1;
            }
            write(row);
          }
        }
        if (!executed) continue;
        const intent = { action, ...(typeof decision["target_index"] === "number" ? { target_index: decision["target_index"] as number } : {}) } as Parameters<typeof noteFacing>[2];
        noteFacing(now, state, intent);
        noteLizardTailEndTurn(now, state, intent);
      }
    }
    write({ kind: "run", run, old_used_at: oldAt, new_used_at: newAt, new_how: now.lizardTail?.seen?.how ?? null });
    console.log(`${run}: old ${oldAt ?? "-"} | new ${newAt ?? "-"}${now.lizardTail?.seen ? ` (${now.lizardTail.seen.how})` : ""}`);
  });
  closeSync(fd);
  console.log(JSON.stringify(totals));
  console.log(`wrote ${out}`);
}

main();
