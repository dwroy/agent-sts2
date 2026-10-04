/**
 * Offline replay of the SL judge's end_turn verdict on every logged turn end (docs/sl.md §2; ops 2026-10-04, X80AD9MHAKZW
 * F42, the Soul Nexus: "not certain: Ripple Basin (no attack played): its block is not counted here" at T4, T5 and T6, died
 * on attempt 1 with 3 retries unused). No model is called and nothing is written outside --out. Every logged run is walked
 * frame by frame in the log DB's state_index order (logs/states.jsonl read by byte offset, read-only); the runs holding
 * Lizard Tail or Beating Remnant have every combat frame parsed (the Lizard Tail tracker, combat-plan trackLizardTail, and
 * the SL controller's HP-this-turn record, controller turnStartLoss: the HP lost so far, exactly or at most), the others
 * only their end_turn boards. On each executed end_turn in combat the judge is asked, with the code at --base (the judge
 * before the change, a copy of the module) and the current src/sl/judge.ts:
 * - `live`: the logged label, the revives held, the HP lost so far: as the controller asks it, but without the planner's
 *   facts (SL_JUDGE_KNOWN_DRAWS / SL_JUDGE_ANY_DRAW need a re-plan: --replan does it for the least-loss boards);
 * - `open`: the least-loss label with every draw taken as known (the tier forced open): certain here means our own count
 *   and every veto before the tier say the end of the turn kills. On an end_turn board the logs show what the enemy turn
 *   did, so an `open` verdict certain on a board we lived through is a wrong verdict whatever the label.
 * The outcome: died (GAME_OVER after the end_turn), survived (the fight's next turn), won_in_enemy_turn (the fight ended in
 * the enemy turn, won), sl_reloaded (the end_turn not sent: SL reloaded the fight, the judge certain then), reloaded (the
 * fight went back to an earlier turn after it: not known), unknown.
 *
 * The judge before the change: a copy of the module next to it, not committed, e.g.
 *   git show cbf6895:src/sl/judge.ts > src/sl/judge-base.ts   (its imports are the current modules';
 *   delete it after).
 *
 * Usage: npx tsx tools/sl-judge-bounds-replay.ts [--out experiments/sl-judge-bounds] [--base src/sl/judge-base.ts] [--tag t]
 *          [--runs ID,...] [--shard i/n] [--replan]
 * Output: <out>/boards[-<tag>][-<shard>].jsonl: one row per end_turn board where a verdict is certain, the mod flags it,
 * our own count dies (either code) or the turn ended in a death; and a summary on stdout. tools/sl-judge-bounds-summary.py
 * reads it.
 */
import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type Decision, type DecisionEnv } from "../src/project/types.js";
import { drawBoundOf, leastLossFactsOf, noteLizardTailEndTurn, planCombatTurn, revivesOf, trackLizardTail } from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { turnStartLoss } from "../src/sl/controller.js";
import * as current from "../src/sl/judge.js";
import type { DeathVerdict, JudgeContext } from "../src/sl/judge.js";
import { heldCardEthereal } from "../src/strategy/card-model.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { asArray, asRecord, num, numOrNull, str } from "../src/util/json.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const outDir = arg("out", fromRoot("experiments/sl-judge-bounds"));
const basePath = arg("base", "");
const tag = arg("tag", "");
const runsOnly = arg("runs", "");
const replan = process.argv.includes("--replan");
const [shardAt, shardOf] = arg("shard", "0/1").split("/").map(Number) as [number, number];
const STATES = fromRoot("logs/states.jsonl");
const PY = fromRoot("data/logdb-venv/bin/python");
type Row = Record<string, unknown>;
type JudgeModule = { judgeEndTurn: (state: GameState, context: JudgeContext) => DeathVerdict; LEAST_LOSS_LABEL: string };

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
const ethereal = (card: Record<string, unknown>) => heldCardEthereal(card, knowledge);
const config = loadConfig({} as NodeJS.ProcessEnv);

const playerOf = (state: GameState) => asRecord(asRecord(state.raw["combat"])["player"]);
const relicIds = (state: GameState) => asArray(asRecord(state.raw["run"])["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
const powerIds = (state: GameState) => asArray(playerOf(state)["powers"]).map((power) => `${str(asRecord(power)["power_id"])}:${num(asRecord(power)["amount"])}`);
const brief = (verdict: DeathVerdict | null) =>
  verdict ? { certain: verdict.certain, tier: verdict.tier, own: verdict.ownCountDies === true, end_block: verdict.endBlock, reason: verdict.reason.slice(0, 400) } : null;

function envOf(state: GameState, memory: DecisionEnv["screenMemory"]): DecisionEnv {
  const env: DecisionEnv = {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"), thresholds: config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
    thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
  };
  env.screenMemory.lizardTail = memory.lizardTail === undefined ? undefined : structuredClone(memory.lizardTail);
  return env;
}

interface Pending {
  row: Row;
  floor: number;
  turn: number;
  /** The next turn's first state (HP, block), before an action completed on it. */
  next?: { hp: number | null; block: number | null };
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  rolloutLiveOptions.enabled = false;
  bossLinesOptions.enabled = false;
  potionMcOptions.now = () => 0;
  const base = basePath ? ((await import(pathToFileURL(resolve(basePath)).href)) as JudgeModule) : null;
  const judges: [string, JudgeModule][] = [...(base ? ([["before", base]] as [string, JudgeModule][]) : []), ["after", current as JudgeModule]];
  const out = join(outDir, `boards${tag ? `-${tag}` : ""}${shardOf > 1 ? `-${shardAt}` : ""}.jsonl`);
  writeFileSync(out, "");
  const write = (row: Row) => writeFileSync(out, `${JSON.stringify(row)}\n`, { flag: "a" });
  const runs = query(
    `SELECT run_id, min(ts) AS t FROM decisions WHERE action = 'end_turn' AND screen = 'COMBAT' AND run_id IS NOT NULL GROUP BY 1 ORDER BY 2`,
  ).map((row) => String(row["run_id"]));
  const full = new Set(query(`SELECT DISTINCT run_id FROM fights WHERE list_contains(relics, 'LIZARD_TAIL') OR list_contains(relics, 'BEATING_REMNANT')`).map((row) => String(row["run_id"])));
  const totals: Record<string, number> = { runs: 0, boards: 0, written: 0, replanned: 0 };
  const count = (key: string) => (totals[key] = (totals[key] ?? 0) + 1);
  for (const [index, run] of runs.entries()) {
    if (index % shardOf !== shardAt) continue;
    if (runsOnly && !runsOnly.split(",").includes(run)) continue;
    totals["runs"]! += 1;
    const fullRun = full.has(run);
    const frames = query(
      `SELECT s.off, s.len, s.ts, s.observed, s.screen, s.floor, s.turn, f.in_combat, f.go_victory, f.player_hp, f.block FROM state_index s LEFT JOIN frames f USING (off) WHERE s.run_id = '${run}' ORDER BY s.off`,
    );
    const decisions = query(`SELECT ts, turn, label, action, result, sl_attempt FROM decisions WHERE run_id = '${run}' AND action IS NOT NULL ORDER BY ts`);
    const byTs = new Map<string, Row[]>();
    for (const row of decisions) byTs.set(String(row["ts"]), [...(byTs.get(String(row["ts"])) ?? []), row]);
    const memory = createScreenMemory("COMBAT");
    let hpTurn: { floor: number; turn: number; start: number; last: number; rose: boolean; startLoss: boolean; startLossMost: number | null } | null = null;
    let pending: Pending[] = [];
    const settle = (p: Pending, outcome: string, extra: Row = {}) => {
      Object.assign(p.row, { outcome, ...extra });
      count(`outcome_${outcome}`);
      const verdicts = p.row["v"] as Record<string, ReturnType<typeof brief>>;
      const interesting = p.row["flag"] === true || outcome === "died" || outcome === "sl_reloaded" || Object.values(verdicts).some((v) => v && (v.certain || v.own));
      if (interesting) {
        totals["written"]! += 1;
        write(p.row);
      }
    };
    for (const frame of frames) {
      const screen = String(frame["screen"]);
      const floor = numOrNull(frame["floor"]);
      const turn = numOrNull(frame["turn"]);
      const inCombat = frame["in_combat"] === true;
      const here = frame["observed"] === true ? [] : (byTs.get(String(frame["ts"])) ?? []);
      const completed = here.some((decision) => /^completed/.test(String(decision["result"] ?? "")));
      // The boards waiting for what the enemy turn did. Survived: an action completed on a later turn of the fight (the
      // next turn's first state may come before its start-of-turn loss: C4F14F3XPN0N F33 T7 showed 2 HP, Inferno x2 then
      // took it and GAME_OVER followed), or a turn after that one.
      if (pending.length > 0) {
        const left: Pending[] = [];
        for (const p of pending) {
          if (screen === "GAME_OVER") settle(p, frame["go_victory"] === true ? "won" : "died", p.next ? { next_hp: p.next.hp, why: "died at the next turn's start" } : {});
          else if (!inCombat) {
            if (screen === "COMBAT" || screen === "CARD_SELECTION" || floor === null) left.push(p);
            else settle(p, p.next ? "survived" : "won_in_enemy_turn", { next_hp: p.next?.hp ?? numOrNull(frame["player_hp"]) });
          } else if (floor !== p.floor) settle(p, "unknown", { why: "another floor" });
          else if (turn !== null && turn < p.turn) settle(p, "reloaded");
          else if (turn !== null && turn > p.turn && (completed || turn > p.turn + 1)) settle(p, "survived", { next_hp: p.next?.hp ?? numOrNull(frame["player_hp"]), next_block: p.next?.block ?? numOrNull(frame["block"]) });
          else {
            if (turn !== null && turn > p.turn && screen === "COMBAT" && !p.next) p.next = { hp: numOrNull(frame["player_hp"]), block: numOrNull(frame["block"]) };
            left.push(p);
          }
        }
        pending = left;
      }
      const combatScreen = screen === "COMBAT" || screen === "CARD_SELECTION";
      // The end_turns sent, and those SL took back instead (the judge certain then: "not dispatched: SL reloaded the fight").
      const reloadedBy = (decision: Row) => /^not dispatched: SL reloaded/.test(String(decision["result"] ?? ""));
      const endTurns = combatScreen ? here.filter((decision) => String(decision["action"]) === "end_turn" && (reloadedBy(decision) || !/^(failed|not dispatched|shadow|pending)/.test(String(decision["result"] ?? "")))) : [];
      // The Lizard Tail tracker reads every state (a fight won in the enemy turn is read on the rewards: MZCG9T5G6TBZ F17).
      if (!fullRun && (endTurns.length === 0 || screen !== "COMBAT")) continue;
      const state = parseGameState(rawAt(Number(frame["off"]), Number(frame["len"])));
      if (fullRun) trackLizardTail(memory, state);
      const hp = numOrNull(playerOf(state)["current_hp"]);
      if (fullRun && state.in_combat && state.screen === "COMBAT" && hp !== null && state.turn !== null && floor !== null) {
        if (!hpTurn || hpTurn.floor !== floor || hpTurn.turn !== state.turn) hpTurn = { floor, turn: state.turn, start: hp, last: hp, rose: false, ...turnStartLoss(state, knowledge) };
        else {
          if (hp > hpTurn.last) hpTurn.rose = true;
          hpTurn.last = hp;
        }
      }
      if (state.screen === "COMBAT" && state.in_combat && hp !== null) {
        for (const decision of endTurns) {
          totals["boards"]! += 1;
          const maxHp = num(playerOf(state)["max_hp"], state.run?.max_hp ?? 0);
          const revives = revivesOf(state, memory, maxHp).map((revive) => revive.source);
          const sameTurn = hpTurn && hpTurn.floor === floor && hpTurn.turn === state.turn;
          const exact = fullRun && sameTurn && !hpTurn!.rose && !hpTurn!.startLoss && hp <= hpTurn!.last ? Math.max(0, hpTurn!.start - hp) : undefined;
          const most = fullRun && sameTurn && exact === undefined && !hpTurn!.rose && hpTurn!.startLoss && hpTurn!.startLossMost !== null && hp <= hpTurn!.last ? Math.max(0, hpTurn!.start - hp) + hpTurn!.startLossMost : undefined;
          const label = String(decision["label"]);
          const context: JudgeContext = {
            label, revives, ethereal, knowledge, ...(exact !== undefined ? { lostSoFar: exact } : {}), ...(most !== undefined ? { lostSoFarAtMost: most } : {}),
          };
          // --replan: the least-loss boards planned again for the planner's facts (the any-draw bound, as live).
          let drawBound: JudgeContext["drawBound"];
          if (replan && label === current.LEAST_LOSS_LABEL) {
            try {
              const planned: Decision | null = planCombatTurn(envOf(state, memory));
              const facts = leastLossFactsOf(planned);
              const bound = drawBoundOf(facts);
              if (bound) drawBound = () => bound();
              totals["replanned"]! += 1;
            } catch {
              drawBound = undefined;
            }
          }
          const v: Record<string, ReturnType<typeof brief>> = {};
          for (const [name, judge] of judges) {
            const ask = (extra: Partial<JudgeContext>) => {
              try {
                return judge.judgeEndTurn(state, { ...context, ...extra });
              } catch (error) {
                return { certain: false, tier: null, reason: `error: ${error instanceof Error ? error.message : String(error)}`, hp, block: 0, endBlock: 0, incoming: 0, killers: [] } as DeathVerdict;
              }
            };
            v[`${name}_live`] = brief(ask(drawBound ? { drawBound } : {}));
            v[`${name}_open`] = brief(ask({ label: judge.LEAST_LOSS_LABEL, drawsKnown: true }));
          }
          const combat = asRecord(state.raw["combat"]);
          const player = playerOf(state);
          const row: Row = {
            run, floor, turn: state.turn, ts: frame["ts"], asc: state.run?.ascension ?? null, attempt: numOrNull(decision["sl_attempt"]), label, hp, max_hp: maxHp, block: num(player["block"]),
            flag: combat["end_turn_will_kill_player"] === true, attacks_played: num(player["attacks_played_this_turn"]), cards_played: num(player["cards_played_this_turn"]),
            enemies: asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false).map((enemy) => ({
              id: str(enemy["enemy_id"]), hp: num(enemy["current_hp"]), block: num(enemy["block"]),
              intents: asArray(enemy["intents"]).map(asRecord).map((intent) => `${str(intent["intent_type"])}${numOrNull(intent["damage"]) !== null ? ` ${num(intent["damage"])}x${numOrNull(intent["hits"]) ?? 1}` : ""}`),
            })),
            relics: relicIds(state), powers: powerIds(state), revives, lost_exact: exact ?? null, lost_most: most ?? null, replanned: drawBound !== undefined, v,
          };
          if (reloadedBy(decision)) settle({ row, floor: floor ?? -1, turn: state.turn ?? 0 }, "sl_reloaded");
          else pending.push({ row, floor: floor ?? -1, turn: state.turn ?? 0 });
        }
      }
      if (fullRun) for (const decision of here) if (!/^(failed|not dispatched|shadow|pending)/.test(String(decision["result"] ?? ""))) noteLizardTailEndTurn(memory, state, { action: String(decision["action"]) } as Parameters<typeof noteLizardTailEndTurn>[2]);
    }
    for (const p of pending) settle(p, "unknown", { why: "the logs end" });
    if (totals["runs"]! % 20 === 0) console.error(`${totals["runs"]} runs, ${totals["boards"]} boards`);
  }
  closeSync(fd);
  console.log(JSON.stringify(totals));
  console.log(`wrote ${out}`);
}

void main();
