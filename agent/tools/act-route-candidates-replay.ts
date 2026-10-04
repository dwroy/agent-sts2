/**
 * The act-start route questions' candidate_routes (Dai 2026-10-04) on the logged questions: every event/act-plan and
 * map/route-plan in logs/brain.jsonl (from 09-30), rebuilt from exactly what the model saw (state.act_route /
 * state.route_map: the map lines, next_nodes, Winged Boots, the room-cost line with its rest relics and boss-start
 * heal, HP), then candidate_routes computed by the live code (strategy/route-map.ts candidateRoutesFacts). No model is
 * asked. For each question: the size added, the route the answer gave (projected the same way, and whether it is one of
 * the listed candidates), and the real HP the run had at that route's rest sites and boss (the log database's floors).
 *
 * Usage (worktree root): npx tsx tools/act-route-candidates-replay.ts [--out <file.jsonl>] [--summary <file.md>]
 *   [--examples <file.md>] [--show RUN:FLOOR ...] [--sample N] [--first N]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, openSync, readSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { candidateRoutes, candidateRoutesFacts, candidateText, checkRoute, floorOfRow, routeCandidate, routeIds, routeMapFromView, type CandidateRoute, type RouteMap } from "../src/sim/route-map.js";
import type { RestHeal, RoomCostEntry, RoomCostModel } from "../src/sim/route-projection.js";
import { ACT_START_NOTE } from "../src/hand/screens/act-start.js";
import { fromRoot } from "../src/core/paths.js";

const { values } = parseArgs({
  options: {
    out: { type: "string" },
    summary: { type: "string" },
    examples: { type: "string" },
    show: { type: "string", multiple: true, default: [] },
    sample: { type: "string", default: "0" },
    first: { type: "string" },
  },
});

type Row = Record<string, unknown>;
const BRAIN = resolve(fromRoot("logs/brain.jsonl"));
const PY = resolve(fromRoot("data/logdb-venv/bin/python"));

function query(sql: string): Row[] {
  const out = execFileSync(PY, [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "100000", sql], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, at) => [column, row[at]])));
}

function lineAt(fd: number, off: number, len: number): Row {
  const buffer = Buffer.alloc(len);
  readSync(fd, buffer, 0, len, off);
  return JSON.parse(buffer.toString("utf8")) as Row;
}

const record = (value: unknown): Row => (value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {});

function hpOf(text: unknown): { hp: number; max: number } | null {
  const match = /(-?\d+)\s*\/\s*(\d+)/.exec(String(text ?? ""));
  return match ? { hp: Number(match[1]), max: Number(match[2]) } : null;
}

/** The room-cost line the model saw, back to the model the projection used (values to 0.1, as the line shows them). */
function costsOf(line: string): RoomCostModel | null {
  const head = /^第 (\d) 幕每个房间掉血（中位数\/p75，最大生命 (\d+)）/.exec(line);
  const entry = (label: string): RoomCostEntry | null => {
    const match = new RegExp(`${label} ([\\d.]+)/([\\d.]+)（([^）]*)）`).exec(line);
    return match ? { median: Number(match[1]), p75: Number(match[2]), source: match[3]! } : null;
  };
  const monster = entry("普通战");
  const elite = entry("精英");
  const unknown = entry("问号");
  if (!head || !monster || !elite || !unknown) return null;
  const rest: RestHeal = { bonus: 0, maxGain: 0, sources: [] };
  for (const source of (/另加 (.+?)，锻造不回血/.exec(line)?.[1] ?? "").split("、").filter(Boolean)) {
    rest.sources.push(source);
    const pillow = /Regal Pillow \+(\d+) HP/.exec(source);
    const humid = /Stone Humidifier \+(\d+) max HP/.exec(source);
    const feather = /Eternal Feather \+(\d+) HP on entering/.exec(source);
    if (pillow) rest.bonus += Number(pillow[1]);
    if (humid) rest.maxGain += Number(humid[1]);
    if (feather) rest.enterHeal = Number(feather[1]);
  }
  const boss = /boss 战开始回 (\d+)/.exec(line);
  return { act: Number(head[1]), maxHp: Number(head[2]), monster, elite, unknown, ...(rest.sources.length > 0 ? { rest } : {}), ...(boss ? { bossStartHeal: Number(boss[1]) } : {}) };
}

interface Case {
  run: string;
  floor: number;
  label: string;
  ts: string;
  act: number;
  hp: string;
  candidates: unknown;
  added_chars: number;
  block_chars: number;
  message_chars: number;
  routes_found: number;
  answer?: string;
  /** The answer's route as a candidate line, and the listed candidate it is (its reasons), or "not listed". */
  answer_line?: string;
  answer_listed?: string;
  /** Real HP on the answer route's rest-site and boss floors (floors.entry_hp), or where the run died. */
  real?: string;
}

const medianOf = (list: number[]): number => {
  const sorted = [...list].sort((a, b) => a - b);
  return sorted.length === 0 ? 0 : sorted.length % 2 ? sorted[(sorted.length - 1) / 2]! : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2;
};

function replay(): { cases: Case[]; skipped: Record<string, number>; answers: { run: string; act: number; candidate: CandidateRoute; map: RouteMap; item: Case }[] } {
  const rows = query("SELECT run_id, label, ts, off, len FROM llm_calls WHERE src = 'brain' AND label IN ('event/act-plan','map/route-plan') ORDER BY ts");
  const fd = openSync(BRAIN, "r");
  const cases: Case[] = [];
  const skipped: Record<string, number> = {};
  const answers: { run: string; act: number; candidate: CandidateRoute; map: RouteMap; item: Case }[] = [];
  const skip = (why: string): void => {
    skipped[why] = (skipped[why] ?? 0) + 1;
  };
  try {
    for (const row of rows) {
      if (values.first !== undefined && cases.length >= Number(values.first)) break;
      const brain = lineAt(fd, Number(row["off"]), Number(row["len"]));
      const payload = record(brain["payload"]);
      const block = record(payload["act_route"] ?? payload["route_map"]);
      const map = routeMapFromView(block);
      const costs = costsOf(String(block["room_costs"] ?? ""));
      const facts = record(payload["facts"]);
      const start = hpOf(facts["hp"]) ?? hpOf(record(payload["situation"])["hp"]) ?? hpOf(record(payload["run_brief"])["hp"]);
      if (!map || !costs || !start) {
        skip(!map ? "no map" : !costs ? "room_costs unreadable" : "no HP");
        continue;
      }
      const shown = candidateRoutesFacts(map, start, costs);
      const listed = candidateRoutes(map, start, costs);
      const item: Case = {
        run: String(row["run_id"]),
        floor: Number(facts["floor"] ?? record(payload["situation"])["floor"] ?? 0),
        label: String(row["label"]),
        ts: String(row["ts"]),
        act: map.act,
        hp: `${start.hp}/${start.max}`,
        candidates: shown,
        added_chars: shown ? JSON.stringify({ candidate_routes: shown }).length - 2 + 1 : 0,
        block_chars: JSON.stringify(block).length,
        message_chars:
          Object.values(record(brain["memory"])).reduce<number>((sum, text) => sum + String(text).length, 0) +
          String(brain["question"] ?? "").length +
          JSON.stringify(brain["options"] ?? {}).length +
          JSON.stringify(payload).length,
        routes_found: listed.length,
      };
      const ids = routeIds(record(brain["answer"])["route"]);
      if (ids && checkRoute(map, ids).length === 0) {
        // The answer's route projected like a candidate (from HP now), and whether a listed candidate has its stretches.
        const mine = listed.find((c) => c.route.ids.slice(0, c.bossAt + 1).join(" ") === ids.join(" "));
        const own = routeCandidate(map, ids, start, costs);
        own.why = ["答案的路线"];
        item.answer = ids.join(" ");
        item.answer_line = candidateText(map, own);
        const key = (c: CandidateRoute): string => c.legs.map((leg) => `${c.route.rows[leg.end]}:${JSON.stringify(Object.entries(leg.counts).sort())}:${leg.elites.map((at) => c.route.rows[at]).join(",")}`).join("|");
        const same = mine ?? listed.find((c) => key(c) === key(own));
        item.answer_listed = same ? same.why.join("；") : "not listed";
        answers.push({ run: item.run, act: map.act, candidate: own, map, item });
      }
      cases.push(item);
    }
  } finally {
    closeSync(fd);
  }
  // The real HP on the answer route's rest-site and boss floors, while the run walked it.
  if (answers.length > 0) {
    const runs = [...new Set(answers.map((entry) => entry.run))].map((run) => `'${run}'`).join(",");
    const floors = query(`SELECT run_id, floor, entry_hp, entry_max_hp, died FROM floors WHERE run_id IN (${runs})`);
    const choices = query(`SELECT run_id, floor, node.row AS row, node.col AS col FROM map_choices WHERE run_id IN (${runs})`);
    const hp = new Map(floors.map((floor) => [`${floor["run_id"]}:${floor["floor"]}`, floor]));
    const walked = new Map(choices.map((choice) => [`${choice["run_id"]}:${Number(choice["floor"]) + 1}`, `r${choice["row"]}c${choice["col"]}`]));
    for (const { run, candidate, map, item } of answers) {
      const parts: string[] = [];
      for (const leg of candidate.legs) {
        const floor = floorOfRow(map, candidate.route.rows[leg.end]!);
        const onRoute = candidate.route.ids.slice(0, leg.end + 1).every((id, at) => walked.get(`${run}:${floorOfRow(map, candidate.route.rows[at]!)}`) === id);
        const there = hp.get(`${run}:${floor}`);
        if (!onRoute || !there) {
          // Where the walk stopped: a death on the way, or a change of route.
          const died = [...hp.values()].find((f) => f["run_id"] === run && f["died"] === true && Number(f["floor"]) < floor);
          parts.push(died ? `died F${String(died["floor"])}` : `left the route before F${floor}`);
          break;
        }
        parts.push(`F${floor} ${String(there["entry_hp"])}/${String(there["entry_max_hp"])}`);
      }
      item.real = parts.join("，");
    }
  }
  return { cases, skipped, answers };
}

function summary(cases: Case[], skipped: Record<string, number>): string {
  const sizes = cases.map((item) => item.added_chars).filter((n) => n > 0);
  const share = cases.filter((item) => item.added_chars > 0).map((item) => item.added_chars / item.message_chars);
  const answered = cases.filter((item) => item.answer);
  const note = ACT_START_NOTE.slice(ACT_START_NOTE.indexOf("candidate_routes"));
  const lines = [
    "# Act-start candidate routes replay (tools/act-route-candidates-replay.ts)",
    "",
    `Logged act-start route questions in logs/brain.jsonl (from 09-30): ${cases.length} rebuilt (event/act-plan ${cases.filter((item) => item.label === "event/act-plan").length}, map/route-plan ${cases.filter((item) => item.label === "map/route-plan").length}); skipped ${JSON.stringify(skipped)}.`,
    "",
    `Added to the question (the candidate_routes field as JSON, chars): median ${medianOf(sizes)}, p90 ${[...sizes].sort((a, b) => a - b)[Math.floor(sizes.length * 0.9)] ?? 0}, max ${Math.max(0, ...sizes)}; the map block today: median ${medianOf(cases.map((item) => item.block_chars))}; plus ${note.length} chars in the instructions.`,
    `As a share of the question's user message (median ${medianOf(cases.map((item) => item.message_chars))} chars): median ${(100 * medianOf(share)).toFixed(1)}%, max ${(100 * Math.max(0, ...share)).toFixed(1)}%.`,
    `Routes listed per question: ${[1, 2, 3, 4, 5, 6].map((n) => `${n}: ${cases.filter((item) => item.routes_found === n).length}`).join(", ")}.`,
    "",
    `Answers with a legal route: ${answered.length}; the answer's route is one of the listed candidates (or has the same stretches): ${answered.filter((item) => item.answer_listed !== "not listed").length}.`,
    "",
    "| run | F | label | HP | answer listed as | the answer's route, projected | real on its rest-site and boss floors |",
    "|---|---|---|---|---|---|---|",
    ...answered.map((item) => `| ${item.run} | ${item.floor} | ${item.label} | ${item.hp} | ${item.answer_listed} | ${item.answer_line?.replace(/^【[^】]*】[^：]*：/, "")} | ${item.real ?? ""} |`),
  ];
  return `${lines.join("\n")}\n`;
}

function exampleText(item: Case): string {
  return [
    `### ${item.run} F${item.floor} ${item.label}, act ${item.act}, HP ${item.hp}`,
    "",
    "```json",
    JSON.stringify({ candidate_routes: item.candidates }, null, 1),
    "```",
    ...(item.answer ? ["", `answer: ${item.answer_line}`, `listed as: ${item.answer_listed}; real: ${item.real ?? ""}`] : []),
    "",
  ].join("\n");
}

const { cases, skipped } = replay();
if (values.out) writeFileSync(resolve(values.out), `${cases.map((item) => JSON.stringify(item)).join("\n")}\n`);
const text = summary(cases, skipped);
if (values.summary) writeFileSync(resolve(values.summary), text);
process.stdout.write(text);
const picked: Case[] = [];
for (const want of values.show ?? []) {
  const [run, floor] = want.split(":");
  picked.push(...cases.filter((entry) => entry.run.startsWith(run!) && String(entry.floor) === floor && !picked.includes(entry)));
}
const hash = (item: Case): string => createHash("sha1").update(`${item.run}:${item.floor}:${item.label}:${item.ts}`).digest("hex");
picked.push(...cases.filter((item) => !picked.includes(item)).sort((a, b) => hash(a).localeCompare(hash(b))).slice(0, Number(values.sample)));
const examples = picked.map(exampleText).join("\n");
if (values.examples) writeFileSync(resolve(values.examples), `# Act-start candidate routes: examples (tools/act-route-candidates-replay.ts)\n\n${examples}`);
else if (picked.length > 0) process.stdout.write(`\n${examples}`);
