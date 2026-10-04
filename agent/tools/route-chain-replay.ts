/**
 * The code's greedy route baseline (screens/map.ts planMap: node weights, fight-chain penalty, HP projection) on
 * logged map decisions: V4 runs (run_config branch v4-live) at A8+, every MAP decision with 2+ nodes to choose
 * from. No model is asked: the code's best node per board, every option's route value and likely continuation,
 * and the node the run took. Run it on two source trees (the old and the new map.ts) and compare the outputs.
 *
 * Boards come from logs/states.jsonl by byte offset (the log database's state_index; never a full read).
 *
 * Usage (agent/): npx tsx tools/route-chain-replay.ts [--src <src dir, default this checkout's agent/src>] --out <file.jsonl>
 *   then: npx tsx tools/route-chain-replay.ts --compare <old.jsonl> <new.jsonl> [--summary <file.md>]
 */
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { fromRoot } from "../src/core/paths.js";
import { srcModule } from "./src-layout.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    src: { type: "string", default: fromRoot("agent/src") },
    out: { type: "string" },
    compare: { type: "boolean", default: false },
    summary: { type: "string" },
  },
});

type Row = Record<string, unknown>;
const STATES = resolve(fromRoot("logs/states.jsonl"));
const PY = resolve(fromRoot("data/logdb-venv/bin/python"));

function query(sql: string): Row[] {
  const out = execFileSync(PY, [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "20000", sql], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, at) => [column, row[at]])));
}

/** One logged state by its byte offset (a point read of states.jsonl). */
function stateAt(fd: number, off: number, len: number): Row {
  const buffer = Buffer.alloc(len);
  readSync(fd, buffer, 0, len, off);
  return (JSON.parse(buffer.toString("utf8")) as { state: Row }).state;
}

/** Every MAP decision of a V4 A8+ run with 2+ available nodes, with its board's offset. */
const BOARDS_SQL =
  "WITH v AS (SELECT run_id FROM runs WHERE cfg_branch = 'v4-live' AND ascension >= 8) " +
  "SELECT d.run_id, d.floor, d.ts, d.label, d.option_index AS taken, s.off, s.len, f.act, f.ascension, f.hp, f.max_hp " +
  "FROM decisions d JOIN v USING (run_id) JOIN state_index s ON s.run_id = d.run_id AND s.ts = d.ts JOIN frames f ON f.off = s.off " +
  "WHERE d.action = 'choose_map_node' AND len(f.map_avail) >= 2 ORDER BY d.ts";

async function replay(): Promise<void> {
  const root = resolve(values.src!);
  const { planMap } = (await import(pathToFileURL(srcModule(root, "screens/map.ts")).href)) as { planMap: (env: unknown) => Row | null };
  const { parseGameState } = (await import(pathToFileURL(srcModule(root, "mod/schema.ts")).href)) as { parseGameState: (raw: unknown) => Row & { run?: Row } };
  const { createScreenMemory } = (await import(pathToFileURL(srcModule(root, "project/types.ts")).href)) as { createScreenMemory: (screen: string) => unknown };
  const { buildRunBrief } = (await import(pathToFileURL(srcModule(root, "project/run-brief.ts")).href)) as { buildRunBrief: (state: unknown, knowledge: unknown) => unknown };
  const { makeKnowledge } = (await import(pathToFileURL(srcModule(root, "knowledge/index.ts")).href)) as { makeKnowledge: (collections: unknown, source: string) => unknown };
  const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");
  const boards = query(BOARDS_SQL);
  const fd = openSync(STATES, "r");
  const out: string[] = [];
  try {
    for (const board of boards) {
      const state = parseGameState(stateAt(fd, Number(board["off"]), Number(board["len"])));
      // Not the brain (BUILD_DECIDER=deepseek asks it): the code's own pick question, whose fallback is its best node.
      const env = {
        state,
        knowledge,
        brief: buildRunBrief(state, knowledge),
        thresholds: { act: 0.5, strong: 0.8 },
        runStart: "auto",
        characterPreference: null,
        allowFtueModals: false,
        strictJev: false,
        combatPlanner: "card",
        screenMemory: createScreenMemory("MAP"),
        shopDiscardPotions: [],
        buildDecider: "jev",
      };
      const decision = planMap(env) as { kind: string; questions?: Record<string, { criteria?: Record<string, string | null> }>; resolve?: (answers: Row) => { intent: Row | null } } | null;
      const base = { run: board["run_id"], floor: board["floor"], act: board["act"], asc: board["ascension"], hp: board["hp"], max: board["max_hp"], label: board["label"], taken: board["taken"] };
      if (!decision || decision.kind !== "ask" || !decision.resolve) {
        out.push(JSON.stringify({ ...base, skipped: decision ? `${decision.kind}` : "no decision" }));
        continue;
      }
      const best = decision.resolve({}).intent;
      const criteria = decision.questions?.["pick"]?.criteria ?? {};
      const options = Object.fromEntries(
        Object.entries(criteria)
          .filter(([key]) => /^n\d+$/.test(key))
          .map(([key, text]) => {
            const summary = JSON.parse(String(text)) as Row;
            return [key, { type: summary["node_type"], at: summary["position"], value: summary["route_value"], next: summary["likely_continuation"] }];
          }),
      );
      out.push(JSON.stringify({ ...base, best: best?.["option_index"] ?? null, options }));
    }
  } finally {
    closeSync(fd);
  }
  writeFileSync(resolve(values.out!), `${out.join("\n")}\n`);
  process.stdout.write(`${boards.length} boards -> ${values.out}\n`);
}

/* ---- old vs new --------------------------------------------------------------------------------------- */

interface Replayed {
  run: string;
  floor: number;
  act: number;
  asc: number;
  hp: number;
  max: number;
  label: string;
  taken: number | null;
  best?: number | null;
  skipped?: string;
  options?: Record<string, { type: string; at: string; value: number; next: string }>;
}

function compare(oldPath: string, newPath: string): string {
  const read = (path: string): Replayed[] => readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Replayed);
  const before = read(oldPath);
  const after = read(newPath);
  if (before.length !== after.length) throw new Error(`different board counts: ${before.length} vs ${after.length}`);
  const pct = (n: number, d: number): string => (d > 0 ? `${n}/${d} (${((100 * n) / d).toFixed(1)}%)` : "0/0");
  const lines = ["# Route baseline replay: fight-chain rule old vs new (tools/route-chain-replay.ts)", ""];
  const asked = before.map((row, at) => ({ old: row, new: after[at]! })).filter((pair) => pair.old.best != null && pair.new.best != null);
  lines.push(`Boards: ${before.length} logged MAP decisions with 2+ nodes (V4 v4-live runs, A8+); scored: ${asked.length}.`, "");
  lines.push("| act | boards | code choice changed | old = node taken | new = node taken |", "|---|---|---|---|---|");
  for (const act of [1, 2, 3]) {
    const list = asked.filter((pair) => pair.old.act === act);
    const changed = list.filter((pair) => pair.old.best !== pair.new.best).length;
    lines.push(`| ${act} | ${list.length} | ${pct(changed, list.length)} | ${pct(list.filter((pair) => pair.old.best === pair.old.taken).length, list.length)} | ${pct(list.filter((pair) => pair.new.best === pair.new.taken).length, list.length)} |`);
  }
  const all = asked.filter((pair) => pair.old.best !== pair.new.best);
  lines.push(`| all | ${asked.length} | ${pct(all.length, asked.length)} | ${pct(asked.filter((pair) => pair.old.best === pair.old.taken).length, asked.length)} | ${pct(asked.filter((pair) => pair.new.best === pair.new.taken).length, asked.length)} |`);
  const valuesChanged = asked.filter((pair) => JSON.stringify(pair.old.options) !== JSON.stringify(pair.new.options));
  lines.push("", `Boards where any option's route value changed: ${pct(valuesChanged.length, asked.length)} (by act: ${[1, 2, 3].map((act) => `${act}: ${valuesChanged.filter((pair) => pair.old.act === act).length}`).join(", ")}).`);
  const runs = new Set(all.map((pair) => pair.old.run));
  lines.push(`Changed choices: ${all.length} on ${runs.size} runs; the changed choice is the node the run took: old ${all.filter((pair) => pair.old.best === pair.old.taken).length}, new ${all.filter((pair) => pair.new.best === pair.new.taken).length}.`, "");
  lines.push("| run | F | act | HP | taken | old best (value; continuation) | new best (value; continuation) |", "|---|---|---|---|---|---|---|");
  const show = (row: Replayed, index: number | null | undefined): string => {
    const option = row.options?.[`n${index}`];
    return option ? `n${index} ${option.type} ${option.at} (${option.value}; ${option.next})` : `n${index}`;
  };
  for (const pair of all) {
    lines.push(`| ${pair.old.run} | ${pair.old.floor} | ${pair.old.act} | ${pair.old.hp}/${pair.old.max} | ${show(pair.old, pair.old.taken)} | ${show(pair.old, pair.old.best)} | ${show(pair.new, pair.new.best)} |`);
  }
  return `${lines.join("\n")}\n`;
}

if (values.compare) {
  const text = compare(positionals[0]!, positionals[1]!);
  if (values.summary) writeFileSync(resolve(values.summary), text);
  process.stdout.write(text);
} else {
  if (!values.out) throw new Error("--out <file.jsonl> is required");
  await replay();
}
