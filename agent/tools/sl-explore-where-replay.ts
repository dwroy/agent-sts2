/**
 * Offline evaluation of SL_RETRY_EXPLORE_WHERE (docs/sl.md §11.9, notes/sl-explore.md §0.000): on the logged SL fights with
 * explore records (sl-attempts.jsonl, read only; no model, no planner, no game), the deviation point each attempt from the
 * 3rd picks under the live rule ("old": SL_RETRY_EXPLORE_ORDER, _CANON, _TURN and _WHOLE on, as v4 cd31bfe) and with
 * SL_RETRY_EXPLORE_WHERE ("new"; --decays adds the same rule at other decays, "new@0", "new@1"):
 * - logged: over the fight's rows as logged before that attempt (what that attempt would aim at, given what happened);
 *   the old rule's pick against the row's own target (the same unless the row was written by an earlier rule);
 * - chain: each rule's own sequence from attempt 3 to the fight's last, every simulated attempt taken to reach its point,
 *   play there the first untried line (in the question's order) the rollout does not see dying more often (else the first
 *   untried line), differ from the failed turns, and fail; its HP losses are not known, so they are not counted (the
 *   weights stay those of the logged attempts before attempt 3);
 * - won: for a fight an explore attempt won, the attempt of each chain that aims at the winning board first, and whether
 *   the lines tried there by then are the winning attempt's (then the same replacement is picked, Jev answering alike).
 * Also each fight's HP lost by turn, and over every reference path's questions "every line loses in every sample"
 * (SL_RETRY_EXPLORE_ORDER's lost) against the distance to the reference attempt's death (the rollout's horizon: 5 turns).
 *
 * Usage: npx tsx tools/sl-explore-where-replay.ts [--attempts logs/sl-attempts.jsonl] [--out experiments/sl-explore]
 *          [--tag where] [--decays 0,1]
 * Output: <out>/explore-<tag>.jsonl (a row per fight, mode, rule and attempt) and <out>/explore-<tag>.txt (stdout).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { exploreTarget, exploreTried, hpLostByTurn, pointLost, turnCanon, whereWeights, type ExploreRow, type ExploreTargetOptions, type SlPoint, type SlTarget } from "../src/sl/explore.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const ATTEMPTS = arg("attempts", fromRoot("logs/sl-attempts.jsonl"));
const outDir = arg("out", fromRoot("experiments/sl-explore"));
const tag = arg("tag", "where");
const decays = arg("decays", "0,1")
  .split(",")
  .filter((x) => x !== "")
  .map(Number);

type Row = ExploreRow & { run_id: string; floor: number | null; encounter: string; fight_kind: string; max_attempts: number };
const LIVE: ExploreTargetOptions = { aliveFirst: true, canon: true, tried: true, whole: true };
const RULES: { name: string; options: ExploreTargetOptions }[] = [
  { name: "old", options: LIVE },
  { name: "new", options: { ...LIVE, where: true } },
  ...decays.map((decay) => ({ name: `new@${decay}`, options: { ...LIVE, where: true, whereDecay: decay } })),
];

const lines: string[] = [];
const out: Record<string, unknown>[] = [];
const say = (line: string) => {
  lines.push(line);
  console.log(line);
};

const rows = readFileSync(ATTEMPTS, "utf8")
  .split("\n")
  .flatMap((line) => {
    try {
      return line.trim() ? [JSON.parse(line) as Row] : [];
    } catch {
      return [];
    }
  });
const fights = new Map<string, Row[]>();
for (const row of rows) {
  const key = `${row.run_id} F${row.floor ?? "?"} ${row.encounter}`;
  fights.set(key, [...(fights.get(key) ?? []), row]);
}

const T = (target: SlTarget | null | undefined): string => (target ? `T${target.turn ?? "?"}/${target.back}${target.round > 0 ? `r${target.round}` : ""}` : "none");
const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && [...a].sort().join("\n") === [...b].sort().join("\n");

/** A simulated failed attempt `k` deviating at `target` (see the header): the reference path up to the board, its line changed there. */
function simulated(known: readonly Row[], k: number, target: SlTarget, options: ExploreTargetOptions): Row {
  const reference = known.find((row) => row.attempt === target.reference)!;
  const points = reference.explore!.points;
  let end = -1;
  for (let i = points.length - 1; i >= 0; i -= 1) if (points[i]!.board === target.board) { end = i; break; }
  const at = points[end]!;
  const tried = options.canon ? exploreTried(known, k, target.board, { canon: true }).tried : { canon: [], loose: [] };
  const excluded = new Set(target.excluded);
  const untried = (at.alternatives ?? []).filter((line) => !excluded.has(line) && !(at.canon?.[line] !== undefined && tried.canon.includes(at.canon[line])));
  const own = at.dead?.[at.line];
  const notWorse = untried.filter((line) => own === undefined || (at.dead?.[line] ?? 2) <= own + 1e-9);
  const line = (notWorse.length > 0 ? notWorse : untried)[0] ?? at.line;
  const before = points.slice(0, end).filter((point) => point.board !== target.board);
  return {
    ...reference,
    attempt: k,
    result: "predicted_death",
    summary: { turns: [] },
    explore: {
      points: [...before, { ...at, line, explored: true }],
      target,
      deviation: { reached: true, original: at.line, replacement: line, reason: "simulated", turn: target.turn, ...(at.canon?.[line] !== undefined ? { plays: at.canon[line] } : {}), differs: true },
      turns: [],
    },
  };
}

/**
 * The lines open on a target's board: the reference point's alternatives there no failed attempt played (target.excluded),
 * nor (when the target has them) whose turn is a failed one (target.tried: the point's canon; a rebuilt row's summary plays,
 * the line's steps as the summary writes them, when the board is its turn's first).
 */
function untriedAt(reference: Row, target: SlTarget): string[] {
  const points = reference.explore?.points ?? [];
  const at = [...points].reverse().find((point) => point.board === target.board);
  if (!at) return [];
  const first = points.find((point) => point.turn === at.turn) === at;
  return (at.alternatives ?? []).filter((line) => {
    if (target.excluded.includes(line)) return false;
    const canon = at.canon?.[line];
    if (canon !== undefined && target.tried?.canon.includes(canon)) return false;
    return !(first && target.tried?.loose.includes(turnCanon(line === "end turn" ? [] : line.split(", "))));
  });
}

/** The questions of a reference path (its latest record per board), with their distance to its death and "lost". */
function questions(reference: Row): { point: SlPoint; distance: number; lost: boolean; known: boolean }[] {
  const seen = new Set<string>();
  const outQ: { point: SlPoint; distance: number; lost: boolean; known: boolean }[] = [];
  const points = reference.explore?.points ?? [];
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const point = points[i]!;
    if (point.kind !== "question" || !point.alternatives || seen.has(point.board)) continue;
    seen.add(point.board);
    outQ.push({ point, distance: reference.turns - (point.turn ?? 0), lost: pointLost(point), known: Object.keys(point.dead ?? {}).length > 0 || point.b2?.won !== undefined });
  }
  return outQ.reverse();
}

const horizon = { near: { lost: 0, all: 0 }, far: { lost: 0, all: 0 } };
/** The live deviations (rows with a reached target): how many, on T1, on T1-T2, on the question turn that lost the most HP. */
const live = { all: 0, t1: 0, t12: 0, top: 0, fights: 0, oneTurn: 0 };
/** Distinct turns over a chain's attempts, per rule (summed over the fights), and the attempts. */
const spread: Record<string, { distinct: number; attempts: number }> = {};
const summary: { fight: string; logged: Record<string, string[]>; chain: Record<string, string[]>; won?: string }[] = [];

for (const [key, fight] of fights) {
  const sorted = [...fight].sort((a, b) => a.attempt - b.attempt);
  const last = Math.max(...sorted.map((row) => row.attempt));
  const reference = sorted.find((row) => row.attempt >= 2 && row.result !== "won" && row.explore && Array.isArray(row.explore.points) && row.explore.points.length > 0);
  if (last < 3 || !reference) continue;
  const maxAttempts = Math.max(...sorted.map((row) => row.max_attempts));
  say(`\n${key} (${sorted[0]!.fight_kind}): attempts ${sorted.map((row) => `${row.attempt} ${row.result}${row.result === "won" ? "" : ` T${row.turns}`}`).join(", ")}; at most ${maxAttempts}`);
  // HP lost by turn: each failed attempt's, then the mean known at attempt 3 and at the last.
  for (const row of sorted) {
    if (row.result === "won") continue;
    const lost = hpLostByTurn([row], row.attempt + 1).map((loss) => `T${loss.turn} ${loss.mean}`);
    say(`  attempt ${row.attempt} HP lost by turn: ${lost.join(", ")}${row.result === "unfinished" ? " (unfinished)" : ""}`);
  }
  const at3 = hpLostByTurn(sorted, 3);
  const weights3 = whereWeights(at3);
  say(`  known at attempt 3: lost ${at3.map((loss) => `T${loss.turn} ${Math.round(loss.mean * 10) / 10}`).join(", ")}; weights ${[...weights3].map(([turn, w]) => `T${turn} ${Math.round(w * 10) / 10}`).join(", ")}`);
  const qs = questions(reference);
  say(`  attempt ${reference.attempt}'s questions (death on T${reference.turns}): ${qs.map((q) => `T${q.point.turn}${q.lost ? " lost" : q.known ? "" : " ?"}`).join(", ")}`);
  for (const q of qs) {
    if (!q.known) continue;
    const bucket = q.distance <= 4 ? horizon.near : horizon.far;
    bucket.all += 1;
    if (q.lost) bucket.lost += 1;
  }
  // Where the failed attempts lost their HP (all of the fight's), against where the live attempts deviated.
  const all = hpLostByTurn(sorted, last + 1);
  const qTurns = new Set(qs.map((q) => q.point.turn));
  const top = [...all].filter((loss) => qTurns.has(loss.turn)).sort((a, b) => b.mean - a.mean)[0];
  const most = [...all].sort((a, b) => b.mean - a.mean)[0];
  const deviated = sorted.filter((row) => row.explore?.target && row.explore.deviation?.reached).map((row) => row.explore!.target!.turn);
  if (deviated.length > 0) {
    live.fights += 1;
    live.all += deviated.length;
    live.t1 += deviated.filter((turn) => turn === 1).length;
    live.t12 += deviated.filter((turn) => turn !== null && turn <= 2).length;
    live.top += deviated.filter((turn) => turn === top?.turn).length;
    if (new Set(deviated).size === 1 && deviated.length > 1) live.oneTurn += 1;
  }
  say(`  the live deviations: ${deviated.map((turn) => `T${turn}`).join(", ") || "none"}; the most HP lost (all failed attempts): T${most?.turn} ${Math.round((most?.mean ?? 0) * 10) / 10}${most && top && most.turn !== top.turn ? ` (no question there), of the question turns T${top.turn} ${Math.round(top.mean * 10) / 10}` : ""}`);
  const entry: (typeof summary)[number] = { fight: key, logged: {}, chain: {} };
  // logged: each attempt over the rows before it as logged.
  for (let k = 3; k <= last; k += 1) {
    const before = sorted.filter((row) => row.attempt < k);
    const own = sorted.find((row) => row.attempt === k && row.explore)?.explore?.target ?? null;
    const picks = RULES.map((rule) => ({ rule: rule.name, ...exploreTarget(before, k, rule.options) }));
    const ownText = `logged ${T(own)}`;
    say(`  logged attempt ${k}: ${ownText}; ${picks.map((pick) => `${pick.rule} ${T(pick.target)}${pick.rule === "old" && own && pick.target && (pick.target.board !== own.board) ? " (differs from the row)" : ""}`).join("; ")}`);
    for (const pick of picks) {
      (entry.logged[pick.rule] ??= []).push(T(pick.target));
      out.push({ fight: key, mode: "logged", attempt: k, rule: pick.rule, target: pick.target, why: pick.why, row_target: own });
    }
    const nw = picks.find((pick) => pick.rule === "new");
    if (nw?.target) say(`    new: ${nw.target.point}: ${nw.why}`);
  }
  // chain: each rule's own sequence.
  const won = sorted.find((row) => row.result === "won" && row.explore?.target && row.explore.deviation?.reached);
  const wins: string[] = [];
  for (const rule of RULES) {
    let known: Row[] = sorted.filter((row) => row.attempt < 3);
    const seq: string[] = [];
    let reached: string | null = null;
    for (let k = 3; k <= maxAttempts; k += 1) {
      const { target, why } = exploreTarget(known, k, rule.options);
      seq.push(T(target));
      out.push({ fight: key, mode: "chain", attempt: k, rule: rule.name, target, why });
      if (!target) break;
      if (won && reached === null && target.board === won.explore!.target!.board) {
        const theirs = won.explore!.target!;
        const mine = untriedAt(reference, target);
        const before = untriedAt(reference, theirs);
        const winning = won.explore!.deviation!.replacement;
        const same = sameSet(mine, before);
        reached = `attempt ${k}${same ? ", the same lines open there as for the winning attempt (the same replacement)" : `, other lines open there (the winning attempt's: ${before.join(" / ")}; this one: ${mine.join(" / ")})`}${winning !== null && mine.includes(winning) ? "" : winning !== null ? `; the winning line ${winning} is not open` : ""}`;
      }
      known = [...known, simulated(known, k, target, rule.options)];
    }
    entry.chain[rule.name] = seq;
    const turnsOf = seq.filter((t) => t !== "none").map((t) => t.split("/")[0]);
    spread[rule.name] ??= { distinct: 0, attempts: 0 };
    spread[rule.name]!.distinct += new Set(turnsOf).size;
    spread[rule.name]!.attempts += turnsOf.length;
    say(`  chain ${rule.name}: ${seq.map((t, i) => `${i + 3}:${t}`).join(" ")}`);
    if (won) wins.push(`${rule.name} ${reached ?? "never"}`);
  }
  if (won) {
    entry.won = `attempt ${won.attempt} won at ${T(won.explore!.target)}; aimed at that board: ${wins.join("; ")}`;
    say(`  won: ${entry.won}`);
  }
  summary.push(entry);
}

say(`\n"Every line loses in every sample" by distance to the reference attempt's death (questions with numbers): within 4 turns ${horizon.near.lost}/${horizon.near.all}; 5 or more turns before ${horizon.far.lost}/${horizon.far.all}`);
say(`The live deviations (${live.fights} fights): ${live.all}, on T1 ${live.t1}, on T1-T2 ${live.t12}, on the question turn that lost the most HP ${live.top}; fights whose deviations all went to one turn ${live.oneTurn}`);
say(`The chains: distinct turns / attempts deviating: ${Object.entries(spread).map(([rule, { distinct, attempts }]) => `${rule} ${distinct}/${attempts}`).join(", ")}`);
say("\nSummary (attempt: turn/back[rN]):");
for (const entry of summary) {
  say(`  ${entry.fight}`);
  say(`    logged ${Object.entries(entry.logged).map(([rule, seq]) => `${rule} ${seq.join(" ")}`).join(" | ")}`);
  say(`    chain  ${Object.entries(entry.chain).map(([rule, seq]) => `${rule} ${seq.join(" ")}`).join(" | ")}`);
  if (entry.won) say(`    ${entry.won}`);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `explore-${tag}.jsonl`), out.map((row) => JSON.stringify(row)).join("\n") + "\n");
writeFileSync(join(outDir, `explore-${tag}.txt`), lines.join("\n") + "\n");
