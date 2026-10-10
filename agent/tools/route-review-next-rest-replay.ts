/**
 * The route review's next_rest facts (Roy 2026-10-03) on the logged route reviews: every question that carried
 * state.route_review in logs/brain.jsonl (card rewards, rest sites, event pages; the brain log starts 09-30), rebuilt
 * from exactly what DeepSeek saw (the map lines, next_nodes, the plan, HP, the room-cost line with its rest relics and
 * boss-start heal), then next_rest computed by the live code (strategy/route-map.ts nextRestFacts, the rest site's
 * start as route-review.ts restStart) and, for an answer that changed the route, the new route against the kept one
 * (nextRestVersus). No model is asked.
 *
 * The rebuild is checked against the logged plan_facts (the plan's arrival lines, recomputed by routeFacts from the
 * rebuilt inputs); a case whose arrivals differ is counted and left out. The real HP on arriving at the next rest
 * site comes from the log database's floors table.
 *
 * Usage (worktree root): npx tsx tools/route-review-next-rest-replay.ts --out <file.jsonl> [--summary <file.md>]
 *   [--examples <file.md> --show RUN:FLOOR ... --sample N] [--first N: only the first N reviews in time order, a fixed
 *   set while live play keeps logging]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, openSync, readSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { restStart, ROUTE_REVIEW_NOTE } from "../src/hand/screens/route-review.js";
import { checkRoute, floorOfRow, isKeep, NEXT_REST_CLEAR, nextRestCompare, nextRestFacts, nextRestStretches, nextRestVersus, routeFacts, routeIds, routeMapFromView, stretchOf, type ClearMargin, type Stretch } from "../src/sim/route-map.js";
import type { RestHeal, RoomCostEntry, RoomCostModel } from "../src/sim/route-projection.js";
import { fromRoot } from "../src/core/paths.js";

const { values } = parseArgs({
  options: {
    out: { type: "string" },
    summary: { type: "string" },
    show: { type: "string", multiple: true, default: [] },
    examples: { type: "string" },
    sample: { type: "string", default: "0" },
    first: { type: "string" },
  },
});

type Row = Record<string, unknown>;
const BRAIN = resolve(fromRoot("logs/brain.jsonl"));
/** The live margins, then the wider ones counted for Roy to compare (15% median / 20% p75). */
const MARGINS: ClearMargin[] = [NEXT_REST_CLEAR, { median: 0.15, p75: 0.2 }, { median: 0.2, p75: 0.25 }];
const PY = resolve(fromRoot("data/logdb-venv/bin/python"));

function query(sql: string): Row[] {
  const out = execFileSync(PY, [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "20000", sql], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
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

/** "49/80 (61%)" -> { hp: 49, max: 80 }. */
function hpOf(text: unknown): { hp: number; max: number } | null {
  const match = /(-?\d+)\s*\/\s*(\d+)/.exec(String(text ?? ""));
  return match ? { hp: Number(match[1]), max: Number(match[2]) } : null;
}

/** The room-cost line DeepSeek saw, back to the model the facts used (values to 0.1, as the line shows them). */
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
  const extra = /另加 (.+?)，锻造不回血/.exec(line)?.[1] ?? "";
  for (const source of extra.split("、").filter(Boolean)) {
    rest.sources.push(source);
    const pillow = /Regal Pillow \+(\d+) HP/.exec(source);
    const humid = /Stone Humidifier \+(\d+) max HP/.exec(source);
    const feather = /Eternal Feather \+(\d+) HP on entering/.exec(source);
    if (pillow) rest.bonus += Number(pillow[1]);
    if (humid) rest.maxGain += Number(humid[1]);
    if (feather) rest.enterHeal = Number(feather[1]);
  }
  const boss = /boss 战开始回 (\d+)/.exec(line);
  return {
    act: Number(head[1]),
    maxHp: Number(head[2]),
    monster,
    elite,
    unknown,
    ...(rest.sources.length > 0 ? { rest } : {}),
    ...(boss ? { bossStartHeal: Number(boss[1]) } : {}),
  };
}

/** The chain the logged fights_before_rest counted up to here. */
function chainOf(text: string): number {
  const match = /已打普通战和精英 (\d+) 场|已连续战斗 (\d+) 场/.exec(text);
  return match ? Number(match[1] ?? match[2]) : 0;
}

/** A rest site's options as the block's if_option lines show them: "o0 HEAL（HP 57/91）：…". */
function restOptionsOf(lines: unknown): { label: string; hp: number; max: number }[] {
  return (Array.isArray(lines) ? lines : []).flatMap((line) => {
    const match = /^(.+?)（HP (\d+)\/(\d+)）：/.exec(String(line));
    return match ? [{ label: match[1]!, hp: Number(match[2]), max: Number(match[3]) }] : [];
  });
}

interface Case {
  run: string;
  floor: number;
  label: string;
  ts: string;
  act: number;
  hp: string;
  plan: string;
  answer: string;
  outcome: "keep" | "change" | "invalid" | "none";
  reason: string;
  next_rest: unknown;
  added_chars: number;
  question_chars: number;
  block_chars: number;
  /** The question's user message as logged (memory sections, question text, options, payload), chars. */
  message_chars: number;
  /** A change: the new route against the kept one, and whether the answer's stretch was one the facts listed. */
  versus?: { text: string; worse: boolean; eliteWorse: boolean } | null;
  /** The change's flags at the other margins (MARGINS[1]). */
  versus_alt?: { worse: boolean; eliteWorse: boolean } | null;
  /** Per margin (MARGINS): whether any switch line is clearly worse at the rest floor, at the elite floor, either. */
  flags: { rest: boolean; elite: boolean; restUngated: boolean }[];
  listed?: "keep" | "switch" | "other" | "same";
  /** Real HP on arriving at the kept / new stretch's end floor (floors.entry_hp of the run). */
  real?: string;
  answer_end_floor?: number;
}

const medianOf = (list: number[]): number => {
  const sorted = [...list].sort((a, b) => a - b);
  return sorted.length === 0 ? 0 : sorted.length % 2 ? sorted[(sorted.length - 1) / 2]! : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2;
};

function replay(): { cases: Case[]; skipped: Record<string, number> } {
  const rows = query(
    "SELECT run_id, label, ts, off, len, question_chars FROM llm_calls WHERE src = 'brain' AND label IN ('reward/card','rest/plan','rest/choose','event/choose','event/plan','map/route-review') ORDER BY ts",
  );
  const fd = openSync(BRAIN, "r");
  const cases: Case[] = [];
  const skipped: Record<string, number> = {};
  const skip = (why: string): void => {
    skipped[why] = (skipped[why] ?? 0) + 1;
  };
  try {
    for (const row of rows) {
      const brain = lineAt(fd, Number(row["off"]), Number(row["len"]));
      const payload = record(brain["payload"]);
      const block = record(payload["route_review"] ?? payload["route_map"]);
      if (!block["plan"]) continue;
      if (values.first !== undefined && cases.length + Object.values(skipped).reduce((sum, n) => sum + n, 0) >= Number(values.first)) break;
      const map = routeMapFromView(block);
      const costs = costsOf(String(block["room_costs"] ?? ""));
      const start = hpOf(record(payload["facts"])["hp"]) ?? hpOf(record(payload["run_brief"])["hp"]);
      const facts = record(block["plan_facts"]);
      if (!map || !costs || !start) {
        skip(!map ? "no map" : !costs ? "room_costs unreadable" : "no HP");
        continue;
      }
      const plan = String(block["plan"]).split(" → ").map((step) => step.split(" ")[0]!);
      if (checkRoute(map, plan).length > 0) {
        skip("plan not legal on the rebuilt map");
        continue;
      }
      const chain = chainOf(String(facts["fights_before_rest"] ?? ""));
      // The rebuild must give the arrivals DeepSeek saw.
      const again = routeFacts(map, plan, start, costs, chain);
      if (JSON.stringify(again.arrival) !== JSON.stringify(facts["arrival"])) {
        skip("rebuilt arrivals differ from the logged plan_facts");
        continue;
      }
      const isRest = String(row["label"]).startsWith("rest/");
      const options = isRest ? restOptionsOf(facts["if_option"]) : [];
      const at = isRest ? restStart(options, start).nextRest : undefined;
      const nextRest = nextRestFacts(map, plan, at?.start ?? start, costs, chain, at?.note);
      const answer = record(brain["answer"]);
      const given = answer["route"];
      const ids = isKeep(given) ? null : routeIds(given);
      const outcome: Case["outcome"] = given === undefined || given === null || given === "" ? "none" : isKeep(given) ? "keep" : !ids || checkRoute(map, ids).length > 0 ? "invalid" : ids.join(" ") === plan.join(" ") ? "keep" : "change";
      const added = nextRest ? JSON.stringify({ next_rest: nextRest }).length - 2 + 1 : 0;
      const flags = MARGINS.map((clear) => {
        const { switches } = nextRestCompare(map, plan, at?.start ?? start, costs, clear);
        return { rest: switches.some((line) => line.restFlag), elite: switches.some((line) => line.eliteFlag), restUngated: switches.some((line) => line.rest?.worse === true) };
      });
      const item: Case = {
        run: String(row["run_id"]),
        floor: Number(record(payload["facts"])["floor"] ?? record(payload["run_brief"])["floor"] ?? 0),
        label: String(row["label"]),
        ts: String(row["ts"]),
        act: map.act,
        hp: `${start.hp}/${start.max}`,
        plan: String(block["plan"]),
        answer: String(given ?? ""),
        outcome,
        reason: String(answer["route_reason"] ?? answer["reason"] ?? ""),
        next_rest: nextRest,
        added_chars: added,
        flags,
        question_chars: Number(row["question_chars"] ?? 0),
        block_chars: JSON.stringify(block).length,
        message_chars:
          Object.values(record(brain["memory"])).reduce<number>((sum, text) => sum + String(text).length, 0) +
          String(brain["question"] ?? "").length +
          JSON.stringify(brain["options"] ?? {}).length +
          JSON.stringify(payload).length,
      };
      if (outcome === "change" && ids) {
        // The plan made from the answer starts at the HP the choice leaves; at a rest site the heal (its usual choice).
        const from = at?.start ?? start;
        item.versus = nextRestVersus(map, plan, ids, from, costs);
        const alt = nextRestVersus(map, plan, ids, from, costs, MARGINS[1]);
        item.versus_alt = alt ? { worse: alt.worse, eliteWorse: alt.eliteWorse } : null;
        // Listed: the answer's stretch is the kept one, or one of the switch lines up to its nodes' order (same first node,
        // end floor, rooms and so HP).
        const sig = (stretch: Stretch): string => `${stretch.ids[0]}|${stretch.row}|${stretch.monsters}|${stretch.elites}|${stretch.unknown}|${stretch.shops}`;
        const taken = stretchOf(map, ids, from, costs);
        const shown = nextRestStretches(map, plan, from, costs);
        item.listed = taken.ids.join(" ") === shown.kept.ids.join(" ") ? "same" : shown.switches.some((stretch) => sig(stretch) === sig(taken)) ? "switch" : "other";
        const end = (path: string[]): number => floorOfRow(map, stretchOf(map, path, from, costs).row);
        item.answer_end_floor = end(ids);
        item.real = `${end(plan)}|${end(ids)}`;
      }
      cases.push(item);
    }
  } finally {
    closeSync(fd);
  }
  // The real HP on arriving at each stretch's end floor (the run walked the new route after a change).
  const changes = cases.filter((item) => item.real);
  if (changes.length > 0) {
    const runs = [...new Set(changes.map((item) => item.run))].map((run) => `'${run}'`).join(",");
    const floors = query(`SELECT run_id, floor, entry_hp, entry_max_hp, died FROM floors WHERE run_id IN (${runs})`);
    const hpAt = new Map(floors.map((floor) => [`${floor["run_id"]}:${floor["floor"]}`, floor]));
    const deaths = query(`SELECT run_id, floor FROM run_deaths WHERE run_id IN (${runs})`);
    const died = new Map(deaths.map((death) => [String(death["run_id"]), Number(death["floor"])]));
    for (const item of changes) {
      const [, newEnd] = item.real!.split("|").map(Number);
      const floor = hpAt.get(`${item.run}:${newEnd}`);
      const death = died.get(item.run);
      item.real = floor ? `F${newEnd} ${String(floor["entry_hp"])}/${String(floor["entry_max_hp"])}` : death !== undefined && death < newEnd! ? `died F${death}` : `F${newEnd} not reached`;
    }
  }
  return { cases, skipped };
}

function summary(cases: Case[], skipped: Record<string, number>): string {
  const sizes = cases.map((item) => item.added_chars).filter((n) => n > 0);
  const switchCounts = cases.map((item) => (Array.isArray(record(item.next_rest)["switch"]) ? (record(item.next_rest)["switch"] as string[]).length : 0));
  const pct = (n: number): string => `${n} (${((100 * n) / Math.max(1, cases.length)).toFixed(1)}%)`;
  const flagLine = (at: number): string => {
    const margin = MARGINS[at]!;
    const rest = cases.filter((item) => item.flags[at]!.rest).length;
    const elite = cases.filter((item) => item.flags[at]!.elite).length;
    const any = cases.filter((item) => item.flags[at]!.rest || item.flags[at]!.elite).length;
    const ungated = cases.filter((item) => item.flags[at]!.restUngated).length;
    return `at ${Math.round(margin.median * 100)}% median / ${Math.round(margin.p75 * 100)}% p75: any flag ${pct(any)}, rest floor ${pct(rest)} (${pct(ungated)} without the elite-count rule), elite entry ${pct(elite)}`;
  };
  const changes = cases.filter((item) => item.outcome === "change");
  const lines = [
    "# Route review next_rest replay (tools/route-review-next-rest-replay.ts)",
    "",
    `Logged route reviews with a plan in logs/brain.jsonl (from 09-30): ${cases.length} rebuilt; skipped ${JSON.stringify(skipped)}.`,
    `Outcomes: ${["keep", "change", "invalid", "none"].map((outcome) => `${outcome} ${cases.filter((item) => item.outcome === outcome).length}`).join(", ")}.`,
    "",
    `Added to the question (the next_rest field as JSON, chars): median ${medianOf(sizes)}, p90 ${[...sizes].sort((a, b) => a - b)[Math.floor(sizes.length * 0.9)] ?? 0}, max ${Math.max(0, ...sizes)}; the route_review block today: median ${medianOf(cases.map((item) => item.block_chars))}; plus ${ROUTE_REVIEW_NOTE.slice(ROUTE_REVIEW_NOTE.indexOf("next_rest")).length} chars in the instructions.`,
    `As a share of the question's user message (memory, question, options, state; median ${medianOf(cases.map((item) => item.message_chars))} chars): median ${(100 * medianOf(cases.filter((item) => item.added_chars > 0).map((item) => item.added_chars / item.message_chars))).toFixed(1)}%, max ${(100 * Math.max(0, ...cases.map((item) => item.added_chars / item.message_chars))).toFixed(1)}%.`,
    `Switch lines per review: ${[0, 1, 2, 3, 4, 5, 6].map((n) => `${n}: ${switchCounts.filter((count) => count === n).length}`).join(", ")}. Reviews with at least one flagged switch line, of ${cases.length}: ${MARGINS.map((_, at) => flagLine(at)).join("; ")}.`,
    "",
    `Changes: ${changes.length}; the answer's stretch to its next rest site was the kept one ${changes.filter((item) => item.listed === "same").length}, a listed switch line ${changes.filter((item) => item.listed === "switch").length}, another one ${changes.filter((item) => item.listed === "other").length}; flagged at the rest floor ${changes.filter((item) => item.versus?.worse).length}, at the elite entry ${changes.filter((item) => item.versus?.eliteWorse).length} (at ${Math.round(MARGINS[1]!.median * 100)}%/${Math.round(MARGINS[1]!.p75 * 100)}%: ${changes.filter((item) => item.versus_alt?.worse).length} and ${changes.filter((item) => item.versus_alt?.eliteWorse).length}).`,
    "",
    "| run | F | label | HP | new vs kept (later rest floor; next elites) | flag: rest floor | flag: elite entry | listed | real | route_reason |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...changes.map((item) => `| ${item.run} | ${item.floor} | ${item.label} | ${item.hp} | ${item.versus?.text ?? "same stretch and elite"} | ${item.versus?.worse ? "yes" : ""} | ${item.versus?.eliteWorse ? "yes" : ""} | ${item.listed} | ${item.real ?? ""} | ${item.reason} |`),
  ];
  return `${lines.join("\n")}\n`;
}

const { cases, skipped } = replay();
if (values.out) writeFileSync(resolve(values.out), `${cases.map((item) => JSON.stringify(item)).join("\n")}\n`);
const text = summary(cases, skipped);
if (values.summary) writeFileSync(resolve(values.summary), text);
process.stdout.write(text);
/** One review as text: the case, the plan and the next_rest field as DeepSeek would see it. */
function exampleText(item: Case): string {
  return [
    `### ${item.run} F${item.floor} ${item.label}, HP ${item.hp} (${item.outcome}${item.outcome === "change" ? `: ${item.answer} — ${item.reason}` : ""})`,
    "",
    `plan: ${item.plan}`,
    "",
    "```json",
    JSON.stringify({ next_rest: item.next_rest }, null, 1),
    "```",
    ...(item.versus ? ["", `logged with the change: ${item.versus.text}${item.versus.worse ? " (clearly worse than the kept route)" : ""}${item.versus.eliteWorse ? " (clearly lower at the next elite)" : ""}; real: ${item.real}`] : []),
    "",
  ].join("\n");
}

const picked: Case[] = [];
for (const want of values.show ?? []) {
  const [run, floor] = want.split(":");
  picked.push(...cases.filter((entry) => entry.run.startsWith(run!) && String(entry.floor) === floor && !picked.includes(entry)));
}
// A deterministic sample of the other reviews (hash order of run, floor and label).
const hash = (item: Case): string => createHash("sha1").update(`${item.run}:${item.floor}:${item.label}:${item.ts}`).digest("hex");
const rest = cases.filter((item) => !picked.includes(item)).sort((a, b) => hash(a).localeCompare(hash(b)));
picked.push(...rest.slice(0, Number(values.sample)));
const examples = picked.map(exampleText).join("\n");
if (values.examples) writeFileSync(resolve(values.examples), `# Route review next_rest: examples (tools/route-review-next-rest-replay.ts)\n\n${examples}`);
else if (picked.length > 0) process.stdout.write(`\n${examples}`);
