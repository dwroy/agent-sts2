/**
 * PASSIVE_PIECES on the live combat planner (src/strategy/passive-pieces.ts, combat-plan planCombatTurn): every logged
 * turn's first planning decision (per SL attempt) of the chosen fights, rebuilt from its logged state and planned twice,
 * PASSIVE_PIECES off and on, as live: the 5-turn rollout and the random potions' Monte Carlo on a frozen clock (the full 5
 * turns x 8 samples, the board's seeds), the whole-fight boss simulation (B2) off, MECH_* as configured. No model call.
 *
 * Fights: A8+ boss and elite fights holding Orichalcum, Ripple Basin, Letter Opener, Ornamental Fan or Parrying Shield
 * (all of them), a sample of A8+ hallway fights holding one, and a control sample of A8+ fights holding none.
 *
 * Per turn, off and on: whether code plays alone (the act and its intent) or asks Jev; the lines shown (plays), their
 * hp_lost, the rollout's best; each shown line's resolution (Jev picking it at 0.9: what is played, the HP guard's swap);
 * and the whole decision's digest (question, Jev's view, the resolutions), which a board holding none of the relics must
 * keep byte for byte.
 *
 * Usage: npx tsx tools/passive-pieces-planner-replay.ts run [--shard I --shards N] [--work experiments/boss-sim/raw/pp-planner]
 *          [--hallway 60] [--control 40] [--limit N] [--sides off,on]
 *        npx tsx tools/passive-pieces-planner-replay.ts report [--work …]           (off vs on: the switch's whole effect)
 *        npx tsx tools/passive-pieces-planner-replay.ts compare --base DIR [--work …] (two code versions' "on" sides)
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import type { AnswerSet } from "../src/jev/answers.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv, type ScreenMemory } from "../src/project/types.js";
import { facingFightOf, planCombatTurn } from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { passivePiecesOptions, PASSIVE_SIM_RELICS } from "../src/strategy/passive-pieces.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const stage = process.argv[2] ?? "run";
const work = arg("work", "experiments/boss-sim/raw/pp-planner");
const STATES = "logs/states.jsonl";
const PY = ".cache/logdb-venv/bin/python";
/** Labels of a fresh plan of the turn (tools/death-move-replay.ts's). */
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;
const RELICS = PASSIVE_SIM_RELICS as readonly string[];

type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(PY, ["tools/logdb/query.py", "--no-sync", "--json", "--max-rows", "1000000", "--timeout", "120", sql], { encoding: "utf8", maxBuffer: 1 << 30 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

const digest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);

interface Side {
  kind: string;
  label: string;
  /** Code played alone: the intent (card / potion / end turn, target) and the rationale's head. */
  act: { intent: string; rationale: string } | null;
  /** The lines shown: plays, hp_lost, rollout best. */
  shown: { key: string; plays: string; hpLost: number | null; dmg: number | null; best: boolean }[];
  /** Jev picking each shown line at 0.9: the first action played and whether the HP guard swapped it. */
  resolved: Record<string, string>;
  digest: string;
}

function intentText(intent: unknown): string {
  const i = (intent ?? {}) as Row;
  return [i["action"], i["card_index"], i["potion_index"] ?? i["slot"], i["target_index"]].filter((x) => x !== undefined && x !== null).join(":");
}

function sideOf(decision: Decision | null): Side {
  if (!decision) return { kind: "none", label: "", act: null, shown: [], resolved: {}, digest: digest(null) };
  if (decision.kind !== "ask") {
    const act = decision as unknown as { label: string; intent: unknown; rationale: string };
    return { kind: decision.kind, label: act.label, act: { intent: intentText(act.intent), rationale: String(act.rationale).slice(0, 200) }, shown: [], resolved: {}, digest: digest({ label: act.label, intent: act.intent, rationale: act.rationale }) };
  }
  const ask = decision as AskDecision;
  const criteria = ((ask.questions["plan"] as { criteria?: Record<string, string | null> } | undefined)?.criteria ?? {}) as Record<string, string | null>;
  const shown = Object.entries(criteria)
    .filter(([key]) => /^plan\d+$/.test(key))
    .map(([key, text]) => {
      const c = (text ? JSON.parse(text) : {}) as Row;
      return { key, plays: String(c["plays"] ?? ""), hpLost: typeof c["hp_lost"] === "number" ? (c["hp_lost"] as number) : null, dmg: typeof c["damage_dealt"] === "number" ? (c["damage_dealt"] as number) : null, best: c["rollout_best"] === true };
    });
  const pick = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as AnswerSet;
  const resolved: Record<string, string> = {};
  const full: Record<string, unknown> = {};
  for (const key of Object.keys(criteria)) {
    const { apply: _apply, ...rest } = ask.resolve(pick(key)) as unknown as Row & { apply?: unknown };
    full[key] = rest;
    const guard = /HP guard: .*?playing plan (\d+)/.exec(String(rest["rationale"] ?? ""));
    resolved[key] = `${intentText(rest["intent"])}${guard ? ` (HP guard -> plan${guard[1]})` : ""}`;
  }
  return { kind: "ask", label: ask.label, act: null, shown, resolved, digest: digest({ label: ask.label, state: ask.state, questions: ask.questions, jevView: ask.jevView ?? null, full }) };
}

function run(): void {
  const index = Number(arg("shard", "0"));
  const shards = Number(arg("shards", "1"));
  const limit = Number(arg("limit", "1000000"));
  const hallway = Number(arg("hallway", "60"));
  const control = Number(arg("control", "40"));
  const sides = arg("sides", "off,on").split(",");
  mkdirSync(work, { recursive: true });
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
  const knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
  const config = loadConfig(process.env);
  const list = `[${RELICS.map((id) => `'${id}'`).join(",")}]`;
  const has = `len(list_intersect(relics, ${list})) > 0`;
  // A deterministic sample: by a hash of the fight's key.
  const fights = query(`
    WITH f AS (SELECT run_id, fight_no, floor, ascension, encounter, room, outcome, first_off, last_off, first_ts, ${has} AS has, hash(run_id || ':' || fight_no) AS h FROM fights WHERE ascension >= 8)
    SELECT * FROM (
      SELECT *, 'pieces' AS grp FROM f WHERE has AND room IN ('boss', 'elite')
      UNION ALL (SELECT *, 'pieces-hallway' AS grp FROM f WHERE has AND room NOT IN ('boss', 'elite') ORDER BY h LIMIT ${hallway})
      UNION ALL (SELECT *, 'control' AS grp FROM f WHERE NOT has AND room IN ('boss', 'elite') ORDER BY h LIMIT ${Math.ceil(control / 2)})
      UNION ALL (SELECT *, 'control-hallway' AS grp FROM f WHERE NOT has AND room NOT IN ('boss', 'elite') ORDER BY h LIMIT ${Math.floor(control / 2)})
    ) ORDER BY first_ts`);
  const fd = openSync(STATES, "r");
  const stateAt = (off: number, len: number): Record<string, unknown> => {
    const buffer = Buffer.alloc(len);
    readSync(fd, buffer, 0, len, off);
    return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Record<string, unknown>;
  };
  const out = join(work, `planner-${index}.jsonl`);
  writeFileSync(out, "");
  let done = 0;
  fights.forEach((fight, fightIndex) => {
    if (fightIndex % shards !== index || done >= limit) return;
    const runId = String(fight["run_id"]);
    const frames = query(`SELECT off, len, ts, turn, observed, screen FROM frames WHERE run_id = '${runId}' AND off BETWEEN ${Number(fight["first_off"])} AND ${Number(fight["last_off"]) + 1} ORDER BY off`);
    const decisions = query(`SELECT ts, turn, label, target_index, action FROM decisions WHERE run_id = '${runId}' AND floor = ${Number(fight["floor"])} AND screen = 'COMBAT' AND ts >= '${String(fight["first_ts"])}' ORDER BY ts`);
    const own = frames.filter((frame) => frame["observed"] !== true && frame["screen"] === "COMBAT" && frame["turn"] !== null);
    const attemptOf = new Map<Row, number>();
    let attempt = 0;
    let lastTurn = 0;
    for (const frame of own) {
      if (Number(frame["turn"]) < lastTurn) attempt += 1;
      lastTurn = Number(frame["turn"]);
      attemptOf.set(frame, attempt);
    }
    const seen = new Set<string>();
    for (const decision of decisions) {
      if (done >= limit) break;
      if (!PLANNING.test(String(decision["label"]))) continue;
      const frame = own.find((entry) => entry["ts"] === decision["ts"]);
      if (!frame) continue;
      const turn = Number(decision["turn"]);
      const at = attemptOf.get(frame)!;
      if (seen.has(`${at}:${turn}`)) continue;
      seen.add(`${at}:${turn}`);
      const raw = stateAt(Number(frame["off"]), Number(frame["len"]));
      const state = parseGameState(raw);
      const earlier = decisions.filter((entry) => String(entry["ts"]) < String(decision["ts"]) && entry["target_index"] !== null && entry["target_index"] !== undefined && entry["action"] !== "end_turn");
      const facing = earlier.length > 0 ? Number(earlier[earlier.length - 1]!["target_index"]) : null;
      const plan = (on: boolean): Side => {
        passivePiecesOptions.enabled = on;
        const env: DecisionEnv = {
          state, knowledge, brief: buildRunBrief(state, knowledge),
          screenMemory: { ...createScreenMemory("COMBAT"), ...(facing !== null ? { facing, facingFight: facingFightOf(state) } : {}) } as ScreenMemory,
          thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [],
          jevContext: "v1", buildDecider: "deepseek", mechRules: config.mechRules, mechMoveRules: config.mechRules && config.mechMoveRules, mechDeathMove: config.mechRules && config.mechDeathMove, thiefFacts: true,
        };
        try {
          return sideOf(planCombatTurn(env));
        } catch (error) {
          return { kind: "error", label: String(error).slice(0, 200), act: null, shown: [], resolved: {}, digest: "error" };
        }
      };
      // --sides on: the "on" side alone (a base worktree's run, compared with this one's by compare).
      const off = sides.includes("off") ? plan(false) : null;
      const on = plan(true);
      passivePiecesOptions.enabled = true;
      const relics = ((raw["run"] as Row | undefined)?.["relics"] as Row[] | undefined ?? []).map((relic) => String(relic["relic_id"])).filter((id) => RELICS.includes(id));
      appendFileSync(out, JSON.stringify({ run: runId, fight: Number(fight["fight_no"]), floor: Number(fight["floor"]), room: fight["room"], enc: fight["encounter"], grp: fight["grp"], turn, attempt: at, relics, off, on }) + "\n");
      done += 1;
    }
  });
  closeSync(fd);
  console.error(`passive-pieces planner replay shard ${index}/${shards}: ${done} turns -> ${out}`);
}

function report(): void {
  const rows = readdirSync(work)
    .filter((name) => /^planner-\d+\.jsonl$/.test(name))
    .flatMap((name) => readFileSync(join(work, name), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as { run: string; floor: number; turn: number; grp: string; room: string; enc: string; relics: string[]; off: Side; on: Side }));
  const pieces = rows.filter((r) => r.relics.length > 0 && r.off);
  const control = rows.filter((r) => r.relics.length === 0 && r.off);
  console.log(`turns: ${rows.length}; holding a relic piece ${pieces.length}, none ${control.length}`);
  console.log(`control: decisions byte-identical off/on ${control.filter((r) => r.off.digest === r.on.digest).length} / ${control.length}`);
  const linesOf = (s: Side) => s.shown.map((x) => x.plays).join(" | ");
  const bestOf = (s: Side) => s.shown.find((x) => x.best)?.plays ?? null;
  const count = (f: (r: (typeof pieces)[number]) => boolean) => pieces.filter(f).length;
  console.log(`with a piece: whole decision the same ${count((r) => r.off.digest === r.on.digest)}; code plays alone off ${count((r) => r.off.kind === "act")} on ${count((r) => r.on.kind === "act")}; act <-> ask ${count((r) => (r.off.kind === "act") !== (r.on.kind === "act"))}; code's act changed ${count((r) => r.off.kind === "act" && r.on.kind === "act" && r.off.act?.intent !== r.on.act?.intent)}`);
  const asks = pieces.filter((r) => r.off.kind === "ask" && r.on.kind === "ask");
  const pairs = asks.flatMap((r) => r.off.shown.map((x) => [x, r.on.shown.find((y) => y.plays === x.plays)] as const).filter((p): p is readonly [Side["shown"][number], Side["shown"][number]] => p[1] !== undefined));
  const hpDiff = pairs.filter(([x, y]) => x.hpLost !== null && y.hpLost !== null).map(([x, y]) => y.hpLost! - x.hpLost!);
  const dmgDiff = pairs.filter(([x, y]) => x.dmg !== null && y.dmg !== null).map(([x, y]) => y.dmg! - x.dmg!);
  const mean = (xs: number[]) => (xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)).toFixed(2);
  console.log(`asked both times ${asks.length}: lines shown changed ${asks.filter((r) => linesOf(r.off) !== linesOf(r.on)).length}; rollout best changed ${asks.filter((r) => bestOf(r.off) !== bestOf(r.on)).length}; a resolution changed ${asks.filter((r) => JSON.stringify(r.off.resolved) !== JSON.stringify(r.on.resolved)).length}; lines in both ${pairs.length}: hp_lost changed on ${hpDiff.filter((d) => d !== 0).length} (mean on - off ${mean(hpDiff)}), damage_dealt on ${dmgDiff.filter((d) => d !== 0).length} (mean ${mean(dmgDiff)})`);
  for (const relic of RELICS) {
    const g = pieces.filter((r) => r.relics.includes(relic));
    if (g.length === 0) continue;
    const changed = g.filter((r) => r.off.digest !== r.on.digest).length;
    const lines = g.filter((r) => r.off.kind === "ask" && r.on.kind === "ask" && linesOf(r.off) !== linesOf(r.on)).length;
    const acts = g.filter((r) => (r.off.kind === "act" || r.on.kind === "act") && (r.off.kind !== r.on.kind || r.off.act?.intent !== r.on.act?.intent)).length;
    const nums = g.filter((r) => r.off.kind === "ask" && r.on.kind === "ask" && r.off.shown.some((x) => { const y = r.on.shown.find((z) => z.plays === x.plays); return y !== undefined && (y.hpLost !== x.hpLost || y.dmg !== x.dmg); })).length;
    const res = g.filter((r) => JSON.stringify(r.off.resolved) !== JSON.stringify(r.on.resolved)).length;
    console.log(`  ${relic}: turns ${g.length}; decision changed ${changed}; lines shown changed ${lines}; a line's hp_lost / damage changed ${nums}; code's own play changed ${acts}; a resolution changed ${res}`);
  }
  console.log("\nexamples (code's own play or the lines shown changed):");
  for (const r of pieces.filter((x) => (x.off.kind !== x.on.kind) || x.off.act?.intent !== x.on.act?.intent || linesOf(x.off) !== linesOf(x.on)).slice(0, 25)) {
    const side = (s: Side) => (s.kind === "act" ? `code ${s.label}: ${s.act?.rationale.slice(0, 110)}` : `ask [${s.shown.map((x) => `${x.plays}${x.hpLost !== null ? ` hp-${x.hpLost}` : ""}${x.best ? " *" : ""}`).join(" | ").slice(0, 260)}]`);
    console.log(`- ${r.run} F${r.floor} T${r.turn} ${r.enc} (${r.relics.join(",")}):\n    off ${side(r.off)}\n    on  ${side(r.on)}`);
  }
}

/**
 * Two runs' "on" sides turn by turn (--base: a worktree of the code before this change, run with --sides on; --work:
 * this one): the boards holding none of the relic pieces must be byte for byte the same; on the others, what this change
 * moved (code's own play, the lines shown, a line's numbers, a resolution).
 */
function compare(): void {
  const base = arg("base", "");
  const load = (dir: string) =>
    new Map(
      readdirSync(dir)
        .filter((name) => /^planner-\d+\.jsonl$/.test(name))
        .flatMap((name) => readFileSync(join(dir, name), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as { run: string; fight: number; floor: number; turn: number; attempt: number; enc: string; relics: string[]; on: Side }))
        .map((r) => [`${r.run}:${r.fight}:${r.attempt}:${r.turn}`, r] as const),
    );
  const before = load(base);
  const after = load(work);
  const keys = [...after.keys()].filter((key) => before.has(key));
  const pairs = keys.map((key) => [before.get(key)!, after.get(key)!] as const);
  const control = pairs.filter(([, b]) => b.relics.length === 0);
  const pieces = pairs.filter(([, b]) => b.relics.length > 0);
  console.log(`turns in both: ${pairs.length}; control (none of the relics) byte-identical ${control.filter(([a, b]) => a.on.digest === b.on.digest).length} / ${control.length}`);
  const linesOf = (s: Side) => s.shown.map((x) => x.plays).join(" | ");
  const numsOf = (s: Side) => s.shown.map((x) => `${x.plays}:${x.hpLost}:${x.dmg}`).join(" | ");
  // A shown line's resolution, keyed by its plays; the guard's target (plan N) named by that line's plays.
  const resolvedByPlays = (s: Side): [string, string][] =>
    s.shown.map((x) => {
      const r = s.resolved[x.key] ?? "";
      const to = /HP guard -> (plan\d+)/.exec(r);
      return [x.plays, to ? `guard -> ${s.shown.find((y) => y.key === to[1])?.plays ?? to[1]}` : r.replace(/ \(HP guard.*$/, "")];
    });
  const guards = (s: Side) => Object.values(s.resolved).filter((r) => r.includes("HP guard")).length;
  const stat = (g: typeof pieces) => ({
    n: g.length,
    changed: g.filter(([a, b]) => a.on.digest !== b.on.digest).length,
    actAsk: g.filter(([a, b]) => (a.on.kind === "act") !== (b.on.kind === "act")).length,
    act: g.filter(([a, b]) => a.on.kind === "act" && b.on.kind === "act" && a.on.act?.intent !== b.on.act?.intent).length,
    lines: g.filter(([a, b]) => a.on.kind === "ask" && b.on.kind === "ask" && linesOf(a.on) !== linesOf(b.on)).length,
    nums: g.filter(([a, b]) => a.on.kind === "ask" && b.on.kind === "ask" && linesOf(a.on) === linesOf(b.on) && numsOf(a.on) !== numsOf(b.on)).length,
    best: g.filter(([a, b]) => (a.on.shown.find((x) => x.best)?.plays ?? null) !== (b.on.shown.find((x) => x.best)?.plays ?? null)).length,
    // Jev picking the same line (by its plays, the options' keys can move): what is played differs (the HP guard's swap).
    res: g.filter(([a, b]) => resolvedByPlays(a.on).some(([plays, r]) => { const other = resolvedByPlays(b.on).find(([p]) => p === plays); return other !== undefined && other[1] !== r; })).length,
    guard: g.filter(([a, b]) => guards(b.on) !== guards(a.on)).length,
  });
  const line = (name: string, s: ReturnType<typeof stat>) =>
    console.log(`  ${name}: turns ${s.n}; decision changed ${s.changed}; code plays alone <-> asks ${s.actAsk}; code's own play changed ${s.act}; lines shown changed ${s.lines}; same lines, numbers changed ${s.nums}; rollout best changed ${s.best}; the same line picked plays differently ${s.res}; HP-guard swaps changed ${s.guard}`);
  line("all with a relic piece", stat(pieces));
  for (const relic of RELICS) {
    const g = pieces.filter(([, b]) => b.relics.includes(relic));
    if (g.length > 0) line(relic, stat(g));
  }
  console.log("\nexamples (code's own play, or the lines shown, changed):");
  const side = (s: Side) => (s.kind === "act" ? `code ${s.label}: ${s.act?.rationale.slice(0, 120)}` : `ask [${s.shown.map((x) => `${x.plays}${x.hpLost !== null ? ` hp-${x.hpLost}` : ""}${x.best ? " *" : ""}`).join(" | ").slice(0, 300)}]`);
  for (const [a, b] of pieces.filter(([a, b]) => a.on.kind !== b.on.kind || a.on.act?.intent !== b.on.act?.intent || linesOf(a.on) !== linesOf(b.on)).slice(0, 20)) {
    console.log(`- ${b.run} F${b.floor} T${b.turn} ${b.enc} (${b.relics.join(",")}):\n    before ${side(a.on)}\n    after  ${side(b.on)}`);
  }
}

if (stage === "report") report();
else if (stage === "compare") compare();
else run();
