/**
 * Restarting mid-run without losing DeepSeek's run memory.
 *
 * The bot exits on a Jev API failure and ops/autoplay.sh restarts it (FA82FQHSJG2F: six restarts between
 * F8 and F14). The run journal and the act's route plan lived only in the process, so after a restart
 * DeepSeek decided with an empty history (FA82's F9 route re-plan added a second act-1 elite, not knowing
 * F7 was one) and the route plan was lost.
 *
 * The journal is a function of what the loop fed it: `observe(state)` for every state read,
 * `record(state, entry)` for every executed decision, `noteRunPlan` for every run plan, and the route plan
 * in screen memory. The logs keep all of it:
 *  - states.jsonl: the state behind every decision, plus (since this change) every other state that
 *    changed the journal (`observed: true`), each with `observed_ts`, the time the loop read it;
 *  - decisions.jsonl: the decision rows (paired with their state by ts + fingerprint), with `run_id`,
 *    the journal's own `journal: {choice, reason}` and the `route_plan` a route-plan decision made;
 *  - run-plans.jsonl: the run plans (with the `observed_ts` of the state they were made on).
 * Replaying them in order rebuilds the journal the live process had. Rows written before this change
 * lack the extra fields: those are replayed from what is there (the choice text is re-derived from the
 * logged question, the route plan from the logged map and the chosen path's room types).
 */

import { closeSync, existsSync, openSync, readSync, statSync } from "node:fs";

import type { Knowledge } from "../knowledge/index.js";
import { parseGameState, type GameState } from "../mod/schema.js";
import type { RoutePlan } from "../screens/map.js";
import { rememberChosenNode, rememberMap } from "../screens/rest.js";
import { runPlanLine, type RunPlan } from "../strategy/run-plan.js";
import { asArray, asRecord, num, str, type JsonValue } from "../util/json.js";
import { describeChoice, RunJournal, type JournalChange, type JournalEntry } from "./run-journal.js";
import { createScreenMemory, type AskDecision, type Decision, type RememberedMap, type ScreenMemory } from "./types.js";

type Row = Record<string, JsonValue>;

/* ---- the logging side: which observed states the loop writes ------------------------------------------ */

interface Pending {
  state: GameState;
  fingerprint: string;
  observedTs: string;
  kind: "mark" | "items";
  floor: number | null;
}

/**
 * Decides which states, besides the ones logged with a decision, go to states.jsonl so a replay sees
 * every state that changed the journal. A state whose change was only the current floor's HP/gold line
 * is dropped once a later logged state of the same floor rewrites that line; any other change is kept.
 * A state that is logged with its decision anyway is not written twice.
 */
export class ObservedStateLog {
  private pending: Pending | null = null;

  constructor(private readonly write: (state: GameState, fingerprint: string, observedTs: string) => void) {}

  /** After journal.observe(state) returned `change`. */
  observed(state: GameState, fingerprint: string, observedTs: string, change: JournalChange): void {
    if (change === "none") return;
    const floor = state.run?.floor ?? null;
    if (this.pending && !(this.pending.kind === "mark" && this.pending.floor === floor)) this.flush();
    this.pending = { state, fingerprint, observedTs, kind: change, floor };
  }

  /** Something besides observe changed the journal on this state (a run plan was filed). */
  touched(state: GameState, fingerprint: string, observedTs: string): void {
    if (this.pending?.state === state) {
      this.pending.kind = "items";
      return;
    }
    this.flush();
    this.pending = { state, fingerprint, observedTs, kind: "items", floor: state.run?.floor ?? null };
  }

  /** The state is about to be logged with its decision. */
  logging(state: GameState): void {
    if (!this.pending) return;
    const same = this.pending.state === state || (this.pending.kind === "mark" && this.pending.floor === (state.run?.floor ?? null));
    if (same) this.pending = null;
    else this.flush();
  }

  flush(): void {
    const pending = this.pending;
    this.pending = null;
    if (pending) this.write(pending.state, pending.fingerprint, pending.observedTs);
  }
}

/* ---- reading one run's rows ------------------------------------------------------------------------ */

/** The lines of a file from its end backwards; `visit` returns false to stop. */
export function scanBackward(file: string, visit: (line: string) => boolean, chunkSize = 8 << 20): void {
  if (!file || !existsSync(file)) return;
  const fd = openSync(file, "r");
  try {
    let position = statSync(file).size;
    let tail = Buffer.alloc(0);
    while (position > 0) {
      const length = Math.min(chunkSize, position);
      position -= length;
      const chunk = Buffer.alloc(length);
      readSync(fd, chunk, 0, length, position);
      const buffer = tail.length > 0 ? Buffer.concat([chunk, tail]) : chunk;
      let end = buffer.length;
      for (let at = buffer.lastIndexOf(0x0a, end - 1); at >= 0; at = end > 0 ? buffer.lastIndexOf(0x0a, end - 1) : -1) {
        const line = buffer.subarray(at + 1, end).toString("utf8");
        end = at;
        if (line && !visit(line)) return;
      }
      tail = Buffer.from(buffer.subarray(0, end));
    }
    const first = tail.toString("utf8");
    if (first) visit(first);
  } finally {
    closeSync(fd);
  }
}

export interface RunLogs {
  runId: string;
  /** The run's state rows (states.jsonl), in file order. */
  states: Row[];
  /** The run's decision rows (decisions.jsonl), in file order. */
  decisions: Row[];
  /** The run's run-plan rows (run-plans.jsonl), in file order. */
  runPlans: Row[];
}

export interface RunLogPaths {
  states: string;
  decisions: string;
  runPlans?: string;
}

/**
 * The run id the mod gives states outside a run (main menu, character select, timeline, unlock screens):
 * none, or "run_unknown". Such rows sit between runs, and also inside one when the game was relaunched
 * mid-run (VG7HWJRX44RQ F13/F14: the relaunch's MAIN_MENU row was the last one of states.jsonl).
 */
export function isMenuRunId(id: string | null | undefined): boolean {
  return !id || id === "run_unknown";
}

/**
 * The rows of one run, read from the end of each log: a run's rows are the last ones of their run id
 * before the logs of the run before it, so the scan stops at the first row of another run (menu rows,
 * isMenuRunId, are skipped). Nothing of another run is returned: states by the state's run_id, decisions
 * by their run_id or (older rows) by the ts + fingerprint of a state row of this run, run plans by their
 * run id.
 */
export function readRunLogs(paths: RunLogPaths, runId: string, options: { latestOnly?: boolean } = {}): RunLogs {
  // latestOnly (the loop's restart): the run is the last one logged, or it has no rows yet; either way the
  // scan ends at the first row of another run. Otherwise (tools) later runs' rows are skipped first.
  const latestOnly = options.latestOnly ?? true;
  const collect = (file: string | undefined, idOf: (line: string) => string | undefined, keep: (row: Row) => boolean): Row[] => {
    const rows: Row[] = [];
    if (!file) return rows;
    scanBackward(file, (line) => {
      const id = idOf(line);
      // Menu states between runs, or after a game relaunch mid-run (the scan goes on to the run's rows).
      if (isMenuRunId(id)) return true;
      if (id !== runId) return rows.length === 0 && !latestOnly;
      const row = parse(line);
      if (row && keep(row)) rows.push(row);
      return true;
    });
    return rows.reverse();
  };
  const states = collect(paths.states, (line) => /"run_id":"([^"]*)"/.exec(line)?.[1], (row) => str(asRecord(row["state"])["run_id"]) === runId);
  const runPlans = collect(paths.runPlans, (line) => /"run":"([^"]*)"/.exec(line)?.[1], (row) => row["run"] === runId);
  const decisions: Row[] = [];
  const keys = new Set(states.map(stateKey));
  const first = states.map((row) => str(row["ts"])).filter(Boolean).sort()[0];
  if (first) {
    scanBackward(paths.decisions, (line) => {
      const ts = /^\{"ts":"([^"]+)"/.exec(line)?.[1];
      if (!ts) return true;
      if (ts < first) return false;
      const row = parse(line);
      if (!row) return true;
      const id = str(row["run_id"]);
      if (id ? id === runId : keys.has(stateKey(row))) decisions.push(row);
      return true;
    });
    decisions.reverse();
  }
  return { runId, states, decisions, runPlans };
}

function parse(line: string): Row | null {
  try {
    const value = JSON.parse(line) as JsonValue;
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Row) : null;
  } catch {
    return null; // a torn line
  }
}

function stateKey(row: Row): string {
  return `${str(row["ts"])}|${str(row["fingerprint"])}`;
}

/* ---- replay ---------------------------------------------------------------------------------------- */

export interface ReplayResult {
  journal: RunJournal;
  /** The last route plan of the run (the current act's when the run is still in that act). */
  routePlan: RoutePlan | null;
  /** The last map seen (lookahead, and the rest screen's "forced elite next" check). */
  lastMap: RememberedMap | null;
  /** How much was replayed. */
  counts: { states: number; decisions: number; recorded: number; runPlans: number; routePlans: number };
}

export interface ReplayOptions {
  /** The journal to fill (a fresh one by default). */
  journal?: RunJournal;
  /** Stop before the first row read at or after this time (ISO), e.g. to rebuild the journal as of a restart. */
  before?: string;
  /** Called with each decision before it is recorded (tools rebuilding DeepSeek's messages). */
  beforeRecord?: (state: GameState, row: Row, journal: RunJournal, memory: ScreenMemory) => void;
}

/** When the loop read a state row's state: observed_ts, else (older rows) the decision's ts. */
function readAt(row: Row): string {
  return str(row["observed_ts"]) || str(row["ts"]);
}

/**
 * Rebuilds the run journal (and the route plan and last map) from one run's rows, feeding them in the
 * order the live loop did: each state is observed, the run plans made on it are filed, then its decision
 * is recorded and the route plan it made is taken.
 */
export function replayRun(logs: RunLogs, knowledge: Knowledge, options: ReplayOptions = {}): ReplayResult {
  const journal = options.journal ?? new RunJournal();
  const memory = createScreenMemory("");
  const counts = { states: 0, decisions: 0, recorded: 0, runPlans: 0, routePlans: 0 };
  const byState = new Map<string, Row[]>();
  for (const row of logs.decisions) {
    const key = stateKey(row);
    const list = byState.get(key) ?? [];
    list.push(row);
    byState.set(key, list);
  }
  const plans = logs.runPlans
    .filter((row) => row["plan"] && typeof row["plan"] === "object")
    .map((row, index) => ({ row, at: readAt(row), index }))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.index - b.index));
  const states = logs.states
    .map((row, index) => ({ row, at: readAt(row), index }))
    .filter((entry) => options.before === undefined || entry.at < options.before)
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.index - b.index));
  let nextPlan = 0;
  for (const { row, at } of states) {
    const state = parseGameState(asRecord(row["state"]) as Record<string, unknown>);
    counts.states += 1;
    if (state.screen === "MAP") rememberMap(memory, state);
    journal.observe(state, { knowledge, screenMemory: memory });
    // A run plan is made on the state just read, before its decision (legacy rows: the plan's ts falls
    // between the state's read and its decision's ts, so it goes with the first state logged after it).
    while (nextPlan < plans.length && plans[nextPlan]!.at <= at) {
      const plan = plans[nextPlan]!.row;
      nextPlan += 1;
      const parsed = { ...(asRecord(plan["plan"]) as unknown as RunPlan), runId: logs.runId };
      memory.runPlan = parsed;
      journal.noteRunPlan(state, str(plan["trigger"]), runPlanLine(parsed));
      counts.runPlans += 1;
    }
    if (row["observed"] === true) continue;
    const key = stateKey(row);
    const decisions = byState.get(key) ?? [];
    byState.delete(key);
    for (const decision of decisions) {
      counts.decisions += 1;
      // Only an executed decision is recorded (a failed action, or a paid decision the board moved past
      // before it was sent, "not dispatched", is logged, not recorded).
      if (/^(failed|not dispatched)/.test(str(decision["result"]))) continue;
      options.beforeRecord?.(state, decision, journal, memory);
      const entry = journalEntry(decision);
      journal.record(state, entry);
      // The node a logged map move chose (the rooms after it have no map position), as the live loop notes it.
      rememberChosenNode(memory, state, entry.intent);
      counts.recorded += 1;
      const plan = routePlanOf(decision, state, memory.routePlan);
      if (plan) {
        memory.routePlan = plan;
        counts.routePlans += 1;
      }
    }
  }
  return { journal, routePlan: memory.routePlan ?? null, lastMap: memory.lastMap ?? null, counts };
}

/** The journal entry of a logged decision: as logged (`journal`), else re-derived from the row. */
export function journalEntry(row: Row): JournalEntry {
  const label = str(row["label"]);
  const by = str(row["decider"], "code");
  const intent = (row["chosen"] ?? null) as JournalEntry["intent"];
  const logged = row["journal"];
  if (logged && typeof logged === "object" && !Array.isArray(logged)) {
    return { label, by, choice: str(logged["choice"]), reason: str(logged["reason"]), asked: true, intent };
  }
  const deepseek = row["deepseek"] ?? undefined;
  const escalation = row["escalation"] ?? undefined;
  const questions = asRecord(row["questions"]) as AskDecision["questions"];
  const decision: Decision =
    Object.keys(questions).length > 0
      ? ({ kind: "ask", label, state: {}, questions, resolve: () => ({ intent: null, rationale: "", confidence: null, fallback: false }) } as unknown as AskDecision)
      : { kind: "act", label, intent: { action: "noop" } as never, rationale: str(row["rationale"]) };
  const choice = describeChoice(decision, { intent: null, rationale: str(row["rationale"]), confidence: null, fallback: false }, row["answers"], deepseek ?? escalation);
  return { label, by, choice, reason: str(asRecord(deepseek ?? escalation)["reason"]), asked: true, intent };
}

/** The route plan a decision made: as logged (`route_plan`), else rebuilt from a legacy map/route-plan row. */
export function routePlanOf(row: Row, state: GameState, previous: RoutePlan | undefined): RoutePlan | null {
  const logged = row["route_plan"];
  if (logged && typeof logged === "object" && !Array.isArray(logged)) return logged as unknown as RoutePlan;
  if (str(row["label"]) !== "map/route-plan") return null;
  return legacyRoutePlan(row, state, previous);
}

/**
 * A route plan from a map/route-plan row logged before `route_plan` was: the chosen option's room types
 * from its first node, walked on the logged map. The per-step HP projection is not in the row; each step
 * gets the HP at planning time.
 */
function legacyRoutePlan(row: Row, state: GameState, previous: RoutePlan | undefined): RoutePlan | null {
  const choice = str(asRecord(row["deepseek"])["choice"]) || str(asRecord(row["escalation"])["choice"]);
  const criteria = asRecord(asRecord(asRecord(row["questions"])["pick"])["criteria"]);
  const option = parse(str(criteria[choice]));
  if (!option) return null;
  const types = str(option["path"]).split(" -> ").filter(Boolean);
  const first = /row (\d+), column (\d+)/.exec(str(option["first_node"]));
  if (types.length === 0 || !first) return null;
  const nodes = new Map<string, { row: number; col: number; type: string; children: { row: number; col: number }[] }>();
  for (const raw of asArray(asRecord(state.raw["map"])["nodes"]).map(asRecord)) {
    const node = { row: num(raw["row"]), col: num(raw["col"]), type: str(raw["node_type"], "Unknown"), children: asArray(raw["children"]).map(asRecord).map((child) => ({ row: num(child["row"]), col: num(child["col"]) })) };
    nodes.set(`${node.row},${node.col}`, node);
  }
  const walk = (key: string, step: number): { row: number; col: number; type: string }[] | null => {
    const node = nodes.get(key);
    if (!node || node.type !== types[step]) return null;
    if (step === types.length - 1) return [node];
    for (const child of node.children) {
      const rest = walk(`${child.row},${child.col}`, step + 1);
      if (rest) return [node, ...rest];
    }
    return null;
  };
  const path = walk(`${first[1]},${first[2]}`, 0);
  if (!path) return null;
  const floor = state.run?.floor ?? null;
  const hp = state.run?.current_hp ?? null;
  const max = state.run?.max_hp ?? null;
  const hpPct = hp !== null && max !== null && max > 0 ? hp / max : 1;
  // The map screen's act (map.ts planMap): acts are 17, 16 and 15 floors.
  const f = floor ?? 1;
  const act = f <= 17 ? 1 : f <= 33 ? 2 : 3;
  const rationale = str(row["rationale"]);
  const start = rationale.indexOf("route re-plan (");
  const end = start >= 0 ? rationale.indexOf("; was ", start) : -1;
  const why = start >= 0 && end > start ? rationale.slice(start + "route re-plan (".length, end) : null;
  return {
    runId: str(state.raw["run_id"]),
    act,
    floor,
    hpPct,
    path: path.map((node) => ({ row: node.row, col: node.col, type: node.type, hpOnArrival: hpPct })),
    summary: types.join(" -> "),
    ...(why && previous ? { why } : {}),
  };
}
