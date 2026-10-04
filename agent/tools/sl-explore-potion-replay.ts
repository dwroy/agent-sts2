/**
 * Offline evaluation of SL_RETRY_EXPLORE_POTION (docs/sl.md §11.10, notes/sl-explore.md §0.0000): on the logged SL fights
 * with explore records (sl-attempts.jsonl, read only; no model, no planner, no game), the live rules ("old": v4 with
 * SL_RETRY_EXPLORE_ORDER, _CANON, _TURN, _WHOLE and _WHERE on) against the same with SL_RETRY_EXPLORE_POTION ("new": a line
 * with a failed turn's cards is tried unless it drinks a potion that attempt never drank from that turn on):
 * - logged: every attempt from the 3rd whose deviation point came up, over the fight's rows as logged before it: its
 *   deviation turn's plays as played (the row's deviation.plays; a row without a turn record: its summary's turn), whether
 *   the old and the new rule call that turn tried (the new one by its cards: which earlier attempts, what they drank from
 *   there on), and what the new rule does instead: its deviation point over the same rows, the lines open there, and the
 *   first of them by the record (not dying more often in the rollout than the one played, in the question's order: the
 *   model of tools/sl-explore-where-replay.ts; live, the question's ranking picks among the same lines);
 * - chain: each rule's own sequence from attempt 3 to the fight's last, every simulated attempt reaching its point, playing
 *   that model line there (its turn the line as planned) and failing (its HP losses unknown: not counted);
 * - won: for a fight an explore attempt won (9175DLPM2EFR F33 attempt 6 at T2, JSA5K8YZ9RXV F33 attempt 3 at T7), the
 *   attempt of each chain that first aims at the winning board, and whether the winning line is open there by then.
 *
 * Usage: npx tsx tools/sl-explore-potion-replay.ts [--attempts logs/sl-attempts.jsonl] [--out experiments/sl-explore]
 *          [--tag potion]
 * Output: <out>/explore-<tag>.jsonl (a row per fight, mode, rule and attempt) and <out>/explore-<tag>.txt (stdout).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { cardsOf, cardsRepeat, exploreTarget, exploreTried, legacyTried, potionsOf, triedHas, triedHow, turnCanon, type ExploreRow, type ExploreTargetOptions, type SlPoint, type SlTarget } from "../src/sl/explore.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const ATTEMPTS = arg("attempts", fromRoot("logs/sl-attempts.jsonl"));
const outDir = arg("out", fromRoot("experiments/sl-explore"));
const tag = arg("tag", "potion");

type Row = ExploreRow & { run_id: string; floor: number | null; encounter: string; fight_kind: string; max_attempts: number; end_hp?: number | null; end_block?: number | null; incoming?: number | null; summary: NonNullable<ExploreRow["summary"]> & { potions?: string[] } };
const LIVE: ExploreTargetOptions = { aliveFirst: true, canon: true, tried: true, whole: true, where: true };
const RULES: { name: "old" | "new"; options: ExploreTargetOptions }[] = [
  { name: "old", options: LIVE },
  { name: "new", options: { ...LIVE, potion: true } },
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
const optionsOf = (rule: ExploreTargetOptions) => ({ canon: true, ...(rule.potion ? { potion: true } : {}) });

/** The reference attempt's latest record of `board` (the point exploreTarget weighs). */
function pointAt(reference: Row, board: string): SlPoint | undefined {
  return [...(reference.explore?.points ?? [])].reverse().find((point) => point.board === board);
}

/**
 * The lines open on a target's board under a rule: the reference point's alternatives no failed attempt played by text
 * (target.excluded), nor whose turn is tried (target.tried, with the rule's cards when it has them; a rebuilt row's summary
 * plays when the board is its turn's first, as tools/sl-explore-where-replay.ts reads them).
 */
function openAt(reference: Row, target: SlTarget): { open: string[]; point: SlPoint | undefined } {
  const point = pointAt(reference, target.board);
  if (!point) return { open: [], point };
  const first = (reference.explore?.points ?? []).find((p) => p.turn === point.turn) === point;
  const open = (point.alternatives ?? []).filter((line) => {
    if (target.excluded.includes(line)) return false;
    const canon = point.canon?.[line];
    const loose = first ? turnCanon(line === "end turn" ? [] : line.split(", ").map((step) => (step.startsWith("potion ") ? step.split(" -> ")[0]! : step))) : undefined;
    return !triedHas(target.tried, { text: line, ...(canon !== undefined ? { canon } : {}), ...(loose !== undefined ? { loose } : {}) });
  });
  return { open, point };
}

/** The model's line among `open` (tools/sl-explore-where-replay.ts): the first not dying more often than the one played. */
function modelLine(point: SlPoint | undefined, open: readonly string[]): string | null {
  if (!point || open.length === 0) return null;
  const own = point.dead?.[point.line];
  const notWorse = open.filter((line) => own === undefined || (point.dead?.[line] ?? 2) <= own + 1e-9);
  return (notWorse.length > 0 ? notWorse : open)[0] ?? null;
}

/**
 * The earlier failed attempts whose turn through `board` has `key`'s cards and drank (from that turn on) every potion `key`
 * drinks (cardsRepeat; a rebuilt row by its summary, `loose`), each with what it drank there and after.
 */
function repeatedBy(known: readonly Row[], reference: Row, board: string, key: { canon?: string; loose?: string }): string[] {
  const outR: string[] = [];
  for (const row of known) {
    if (row.result === "won") continue;
    const turns = row.explore?.turns;
    if (turns) {
      for (const turn of turns) {
        if (!turn.boards.some((entry) => entry.board === board) || key.canon === undefined) continue;
        const canon = turnCanon(turn.plays);
        const drunk = [...potionsOf(canon), ...turns.filter((t) => t.turn > turn.turn).flatMap((t) => potionsOf(turnCanon(t.plays)))];
        if (cardsRepeat({ cards: cardsOf(canon), drunk }, key.canon)) outR.push(`attempt ${row.attempt} (T${turn.turn} ${potionsOf(canon).join("+") || "no potion"}; drank from there: ${drunk.join(", ") || "none"})`);
      }
    } else if (key.loose !== undefined) {
      for (const entry of legacyTried(row, reference)) {
        if (entry.board !== board || entry.loose === null) continue;
        const drunk = (row.summary?.turns ?? []).filter((t) => t.turn >= entry.turn).flatMap((t) => potionsOf(turnCanon(t.plays)));
        if (cardsRepeat({ cards: cardsOf(entry.loose), drunk, loose: true }, key.loose)) outR.push(`attempt ${row.attempt} (rebuilt, T${entry.turn}; drank from there: ${drunk.join(", ") || "none"})`);
      }
    }
  }
  return outR;
}

/** A simulated failed attempt `k` deviating at `target` with `line` (the reference path up to the board, the line there). */
function simulated(known: readonly Row[], k: number, target: SlTarget, line: string): Row {
  const reference = known.find((row) => row.attempt === target.reference)!;
  const points = reference.explore!.points;
  let end = -1;
  for (let i = points.length - 1; i >= 0; i -= 1) if (points[i]!.board === target.board) { end = i; break; }
  const at = points[end]!;
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

const totals = { deviations: 0, rejected: 0, fights: new Set<string>(), oldTried: 0 };
const summary: string[] = [];

for (const [key, fight] of fights) {
  const sorted = [...fight].sort((a, b) => a.attempt - b.attempt);
  const last = Math.max(...sorted.map((row) => row.attempt));
  const reference = sorted.find((row) => row.attempt >= 2 && row.result !== "won" && row.explore && Array.isArray(row.explore.points) && row.explore.points.length > 0);
  if (last < 3 || !reference) continue;
  const maxAttempts = Math.max(...sorted.map((row) => row.max_attempts));
  say(`\n${key} (${sorted[0]!.fight_kind}): attempts ${sorted.map((row) => `${row.attempt} ${row.result}${row.result === "won" ? "" : ` T${row.turns} ${row.end_hp ?? "?"}+${row.end_block ?? "?"} vs ${row.incoming ?? "?"}`}`).join(", ")}; at most ${maxAttempts}`);
  say(`  potions drunk: ${sorted.map((row) => `${row.attempt}: ${(row.summary.potions ?? []).join(", ") || "none"}`).join("; ")}`);
  // logged: each attempt from the 3rd whose deviation point came up.
  for (let k = 3; k <= last; k += 1) {
    const row = sorted.find((r) => r.attempt === k && r.explore);
    const before = sorted.filter((r) => r.attempt < k);
    const picks = RULES.map((rule) => ({ rule: rule.name, ...exploreTarget(before, k, rule.options) }));
    const target = row?.explore?.target ?? null;
    const deviation = row?.explore?.deviation;
    const parts: string[] = [`logged ${T(target)}`, ...picks.map((pick) => `${pick.rule} ${T(pick.target)}`)];
    let verdict: Record<string, unknown> = {};
    if (row && target && deviation?.reached) {
      totals.deviations += 1;
      const summaryTurn = row.summary.turns.find((turn) => turn.turn === target.turn);
      const plays = deviation.plays;
      const loose = summaryTurn ? turnCanon(summaryTurn.plays) : undefined;
      const lineKey = { text: "", ...(plays !== undefined ? { canon: plays } : {}), ...(loose !== undefined ? { loose } : {}) };
      const oldHow = triedHow(exploreTried(before, k, target.board, optionsOf(RULES[0]!.options)).tried, lineKey);
      const newHow = triedHow(exploreTried(before, k, target.board, optionsOf(RULES[1]!.options)).tried, lineKey);
      if (oldHow !== null) totals.oldTried += 1;
      const by = newHow === "cards" ? repeatedBy(before, reference, target.board, { ...(plays !== undefined ? { canon: plays } : {}), ...(loose !== undefined ? { loose } : {}) }) : [];
      if (newHow === "cards") {
        totals.rejected += 1;
        totals.fights.add(key);
      }
      parts.push(`its turn there: old ${oldHow ?? "new"}, new ${newHow ?? "new"}${by.length > 0 ? ` (the cards of ${by.join("; ")})` : ""}`);
      // The logged board under each rule: the lines open there, the model's line (a rejected turn: what replaces it there).
      const there = RULES.map((rule) => {
        const reach = openAt(reference, { ...target, tried: exploreTried(before, k, target.board, optionsOf(rule.options)).tried });
        return { rule: rule.name, open: reach.open, model: modelLine(reach.point, reach.open) };
      });
      verdict = { plays: plays ?? null, loose: loose ?? null, old: oldHow, new: newHow, repeats: by, original: deviation.original, replacement: deviation.replacement, there };
      if (newHow === "cards") parts.push(`on that board: ${there.map((entry) => `${entry.rule} ${entry.open.length} open${entry.model ? ` (the model's: ${entry.model})` : ""}`).join(", ")}`);
    }
    say(`  attempt ${k}: ${parts.join("; ")}`);
    if (row && target && deviation?.reached) say(`    played: ${deviation.replacement ?? deviation.original} (instead of ${deviation.replacement !== null ? deviation.original : "nothing: as answered"}); ${row.result} T${row.turns} ${row.end_hp ?? "?"}+${row.end_block ?? "?"} vs ${row.incoming ?? "?"}`);
    for (const pick of picks) {
      const reach = pick.target ? openAt(reference, pick.target) : { open: [], point: undefined };
      const model = pick.target ? modelLine(reach.point, reach.open) : null;
      if (pick.rule === "new" && pick.target) say(`    new: ${pick.target.point}; ${reach.open.length} line${reach.open.length === 1 ? "" : "s"} open there; the model's line: ${model ?? "none"}`);
      out.push({ fight: key, mode: "logged", attempt: k, rule: pick.rule, target: pick.target, why: pick.why, open: reach.open, model, ...(pick.rule === "new" ? { logged: verdict } : {}) });
    }
  }
  // chain: each rule's own sequence.
  const won = sorted.find((row) => row.result === "won" && row.explore?.target && row.explore.deviation?.reached);
  const seqs: string[] = [];
  for (const rule of RULES) {
    let known: Row[] = sorted.filter((row) => row.attempt < 3);
    const seq: string[] = [];
    let reached: string | null = null;
    for (let k = 3; k <= maxAttempts; k += 1) {
      const { target, why } = exploreTarget(known, k, rule.options);
      if (!target) {
        seq.push("none");
        out.push({ fight: key, mode: "chain", attempt: k, rule: rule.name, target, why });
        break;
      }
      const { open, point } = openAt(reference, target);
      const line = modelLine(point, open) ?? point?.line ?? "end turn";
      seq.push(`${T(target)} ${line}`);
      out.push({ fight: key, mode: "chain", attempt: k, rule: rule.name, target, why, open, line });
      if (won && reached === null && target.board === won.explore!.target!.board) {
        const winning = won.explore!.deviation!.replacement ?? won.explore!.deviation!.original;
        reached = `attempt ${k}${winning !== null && open.includes(winning) ? `, the winning line open there (${winning}${line === winning ? ", the model's line" : ""})` : `, the winning line ${winning} not open (open: ${open.join(" / ")})`}`;
      }
      known = [...known, simulated(known, k, target, line)];
    }
    say(`  chain ${rule.name}: ${seq.map((t, i) => `${i + 3}:${t}`).join(" | ")}`);
    seqs.push(`${rule.name} ${seq.map((t) => t.split(" ")[0]).join(" ")}`);
    if (won) say(`  won (attempt ${won.attempt} at ${T(won.explore!.target)}), ${rule.name}: ${reached ?? "never aimed at the winning board"}`);
  }
  summary.push(`  ${key}: ${seqs.join(" | ")}`);
}

say(`\nLogged deviations that came up: ${totals.deviations}; their turn already tried by the old rule (a wasted deviation, SL_RETRY_EXPLORE_WHOLE): ${totals.oldTried}; tried by the new rule by its cards only: ${totals.rejected} (${[...totals.fights].join(", ")})`);
say("\nChains (attempt 3 on: turn/back[rN]):");
for (const line of summary) say(line);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `explore-${tag}.jsonl`), out.map((row) => JSON.stringify(row)).join("\n") + "\n");
writeFileSync(join(outDir, `explore-${tag}.txt`), lines.join("\n") + "\n");
