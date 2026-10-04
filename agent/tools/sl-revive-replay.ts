/**
 * Offline replay of the SL judge with revives held (docs/sl.md §2.7; ops 2026-10-03, ET3V5177HXSY F48: the Lizard Tail
 * fired at T10's start unseen, and at T13 the judge said "a revive is left" with nothing left; died with 5 retries unused).
 * No model is called and nothing is written outside --out. Every logged run that held Fairy in a Bottle, Lizard Tail or
 * Beating Remnant in a fight is walked frame by frame (logs/states.jsonl through the log DB's state_index offsets,
 * read-only) with the Lizard Tail tracker (combat-plan trackLizardTail) and the SL controller's HP-this-turn record
 * (controller turnStartLoss: the HP lost so far, exactly or at most). On each executed end_turn in combat where a revive is
 * held (the belt's Fairies, the tail unless the tracker read it spent) or Beating Remnant is held with something taking HP
 * at the turn's start, the current judge is asked with the logged label:
 * - `judge`: as live (the revives, the HP lost so far exactly or at most);
 * - `exact_lost`: the same, but the HP lost so far only when exact (as before this change: Beating Remnant's cap refused
 *   whenever the turn's start took HP);
 * - `played`: the revives played out on the board with the mod's flag forced on (DeathVerdict.revive), so every board's
 *   revive outcome is checked against what the game did, flagged lethal or not.
 * Also the least-loss verdicts' first card or potion with a revive held (SL_RELOAD_EARLY's gate: judgeLeastLossNow asks
 * judgeEndTurn on that board first; `action` is not end_turn on those rows), judged the same way.
 * The outcome: died (GAME_OVER after the end_turn), survived (the fight's next turn, its first state we can act on, or the
 * fight won in the enemy turn), and what the revives did (a Fairy gone from the belt; the tail read spent there).
 *
 * Usage: npx tsx tools/sl-revive-replay.ts [--out experiments/sl-revive] [--runs ID,...] [--shard i/n]
 * Output: <out>/boards[-<shard>].jsonl, one row per board, and a summary on stdout.
 */
import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { createScreenMemory } from "../src/project/types.js";
import { noteLizardTailEndTurn, revivesOf, trackLizardTail } from "../src/screens/combat-plan.js";
import { turnStartLoss } from "../src/sl/controller.js";
import { judgeEndTurn, LEAST_LOSS_LABEL, type DeathVerdict, type JudgeContext } from "../src/sl/judge.js";
import { heldCardEthereal } from "../src/strategy/card-model.js";
import { fightKey } from "../src/strategy/fight-plan.js";
import { asArray, asRecord, bool, num, numOrNull, str } from "../src/util/json.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const outDir = arg("out", fromRoot("experiments/sl-revive"));
const runsOnly = arg("runs", "");
const [shardAt, shardOf] = arg("shard", "0/1").split("/").map(Number) as [number, number];
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
const ethereal = (card: Record<string, unknown>) => heldCardEthereal(card, knowledge);

const fairiesOf = (state: GameState) => asArray(asRecord(state.raw["run"])["potions"]).map(asRecord).filter((slot) => bool(slot["occupied"]) && str(slot["potion_id"]) === "FAIRY_IN_A_BOTTLE").length;
const relicIds = (state: GameState) => asArray(asRecord(state.raw["run"])["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
const playerOf = (state: GameState) => asRecord(asRecord(state.raw["combat"])["player"]);

const brief = (verdict: DeathVerdict) => ({ certain: verdict.certain, tier: verdict.tier, reason: verdict.reason.slice(0, 260), ...(verdict.revive ? { revive: verdict.revive } : {}) });

interface Pending {
  row: Row;
  fight: string;
  turn: number;
  fairies: number;
  tailUsed: boolean;
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `boards${shardOf > 1 ? `-${shardAt}` : ""}.jsonl`);
  writeFileSync(out, "");
  const write = (row: Row) => writeFileSync(out, `${JSON.stringify(row)}\n`, { flag: "a" });
  const runs = query(
    `SELECT run_id, min(first_ts) AS t FROM fights WHERE run_id IS NOT NULL AND (list_contains(potions_in, 'FAIRY_IN_A_BOTTLE') OR list_contains(relics, 'LIZARD_TAIL') OR list_contains(relics, 'BEATING_REMNANT')) GROUP BY 1 ORDER BY 2`,
  ).map((row) => String(row["run_id"]));
  const totals = { runs: 0, boards: 0, withRevive: 0, died: 0, survived: 0, unknown: 0, certain: 0, certainDied: 0, certainSurvived: 0, exactLostCertain: 0 };
  runs.forEach((run, index) => {
    if (index % shardOf !== shardAt) return;
    if (runsOnly && !runsOnly.split(",").includes(run)) return;
    totals.runs += 1;
    const frames = query(`SELECT off, len, ts, observed, screen FROM state_index WHERE run_id = '${run}' ORDER BY off`);
    const decisions = query(`SELECT ts, turn, label, action, result FROM decisions WHERE run_id = '${run}' AND action IS NOT NULL ORDER BY ts`);
    const byTs = new Map<string, Row[]>();
    for (const row of decisions) byTs.set(String(row["ts"]), [...(byTs.get(String(row["ts"])) ?? []), row]);
    const memory = createScreenMemory("COMBAT");
    // The SL controller's record of this turn's HP (FightTrack.hpTurn), per fight and turn.
    let hpTurn: { fight: string; turn: number; start: number; last: number; rose: boolean; startLoss: boolean; startLossMost: number | null } | null = null;
    let pending: Pending[] = [];
    let inFight = false;
    const settle = (p: Pending, outcome: string, extra: Row = {}) => {
      Object.assign(p.row, { outcome, ...extra });
      write(p.row);
      if (outcome === "died") totals.died += 1;
      else if (outcome === "survived" || outcome === "won_in_enemy_turn") totals.survived += 1;
      else totals.unknown += 1;
      const judged = p.row["judge"] as { certain: boolean };
      if (judged.certain) {
        totals.certain += 1;
        if (outcome === "died") totals.certainDied += 1;
        else totals.certainSurvived += 1;
      }
    };
    for (const frame of frames) {
      const screen = String(frame["screen"]);
      const combatScreen = screen === "COMBAT" || screen === "CARD_SELECTION" || screen === "GAME_OVER";
      if (!combatScreen && !inFight && pending.length === 0) continue;
      const state = parseGameState(rawAt(Number(frame["off"]), Number(frame["len"])));
      inFight = state.in_combat;
      trackLizardTail(memory, state);
      // The boards waiting for what the enemy turn did.
      if (pending.length > 0) {
        const left: Pending[] = [];
        for (const p of pending) {
          if (state.screen === "GAME_OVER") {
            settle(p, asRecord(state.raw["game_over"])["is_victory"] === true ? "won" : "died", { next_hp: num(playerOf(state)["current_hp"], 0) });
          } else if (!state.in_combat) {
            if (state.run === null) {
              left.push(p);
              continue;
            }
            settle(p, "won_in_enemy_turn", { next_hp: state.run?.current_hp ?? null, fairy_used: fairiesOf(state) < p.fairies, tail_used: !p.tailUsed && memory.lizardTail?.used === true });
          } else if (fightKey(state) !== p.fight) {
            settle(p, "unknown", { why: "another fight" });
          } else if ((state.turn ?? 0) < p.turn) {
            settle(p, "reloaded");
          } else if ((state.turn ?? 0) > p.turn && state.screen === "COMBAT" && state.combat?.can_use_combat_actions !== false) {
            settle(p, "survived", { next_hp: num(playerOf(state)["current_hp"]), next_block: num(playerOf(state)["block"]), fairy_used: fairiesOf(state) < p.fairies, tail_used: !p.tailUsed && memory.lizardTail?.used === true });
          } else left.push(p);
        }
        pending = left;
      }
      if (!state.in_combat || state.screen !== "COMBAT") continue;
      // The controller's HP-this-turn record (noteHp), every state of the fight.
      const hp = numOrNull(playerOf(state)["current_hp"]);
      const fight = fightKey(state);
      if (hp !== null && state.turn !== null) {
        if (!hpTurn || hpTurn.fight !== fight || hpTurn.turn !== state.turn) hpTurn = { fight, turn: state.turn, start: hp, last: hp, rose: false, ...turnStartLoss(state, knowledge) };
        else {
          if (hp > hpTurn.last) hpTurn.rose = true;
          hpTurn.last = hp;
        }
      }
      if (frame["observed"] === true) continue;
      for (const decision of byTs.get(String(frame["ts"])) ?? []) {
        const executed = !/^(failed|not dispatched)/.test(String(decision["result"] ?? ""));
        const action = String(decision["action"]);
        // The end_turn boards, and (SL_RELOAD_EARLY's gate: judgeLeastLossNow asks judgeEndTurn on the board first) the
        // least-loss verdicts' first cards and potions with a revive held.
        const leastLossFirst = executed && action !== "end_turn" && String(decision["label"]) === LEAST_LOSS_LABEL;
        if (executed && (action === "end_turn" || leastLossFirst) && hp !== null && hpTurn) {
          const maxHp = num(playerOf(state)["max_hp"], state.run?.max_hp ?? 0);
          const revives = revivesOf(state, memory, maxHp).map((revive) => revive.source);
          const remnant = relicIds(state).includes("BEATING_REMNANT");
          const exact = !hpTurn.rose && !hpTurn.startLoss && hp <= hpTurn.last ? Math.max(0, hpTurn.start - hp) : undefined;
          const most = exact === undefined && !hpTurn.rose && hpTurn.startLoss && hpTurn.startLossMost !== null && hp <= hpTurn.last ? Math.max(0, hpTurn.start - hp) + hpTurn.startLossMost : undefined;
          if ((revives.length > 0 || (remnant && most !== undefined)) && (!leastLossFirst || revives.length > 0)) {
            totals.boards += 1;
            if (revives.length > 0) totals.withRevive += 1;
            const label = String(decision["label"]);
            const base: JudgeContext = { label, revives, ethereal, knowledge, ...(exact !== undefined ? { lostSoFar: exact } : {}) };
            const judge = judgeEndTurn(state, { ...base, ...(most !== undefined ? { lostSoFarAtMost: most } : {}) });
            const exactLost = judgeEndTurn(state, base);
            if (exactLost.certain) totals.exactLostCertain += 1;
            const forced = structuredClone(state.raw);
            asRecord(forced["combat"])["end_turn_will_kill_player"] = true;
            const played = revives.length > 0 ? judgeEndTurn(parseGameState(forced), { ...base, ...(most !== undefined ? { lostSoFarAtMost: most } : {}) }) : null;
            const combat = asRecord(state.raw["combat"]);
            const row: Row = {
              run, floor: state.run?.floor ?? null, turn: state.turn, ts: frame["ts"], label, action, hp, max_hp: maxHp, block: num(playerOf(state)["block"]),
              mod_lethal: combat["end_turn_will_kill_player"] === true, revives, remnant, lost_exact: exact ?? null, lost_most: most ?? null,
              judge: brief(judge), exact_lost: brief(exactLost), ...(played ? { played: played.revive ?? { refused: played.reason.slice(0, 200) } } : {}),
            };
            pending.push({ row, fight, turn: state.turn ?? 0, fairies: fairiesOf(state), tailUsed: memory.lizardTail?.used === true });
          }
        }
        if (executed) noteLizardTailEndTurn(memory, state, { action } as Parameters<typeof noteLizardTailEndTurn>[2]);
      }
    }
    for (const p of pending) settle(p, "unknown", { why: "the logs end" });
    console.log(`${run}: tail ${memory.lizardTail?.seen ? `spent F${memory.lizardTail.seen.fight} T${memory.lizardTail.seen.turn} (${memory.lizardTail.seen.how})` : "-"}`);
  });
  closeSync(fd);
  console.log(JSON.stringify(totals));
  console.log(`wrote ${out}`);
}

main();
