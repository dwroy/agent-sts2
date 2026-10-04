/**
 * Offline counts for the V4.6 SL explore gaps (docs/sl.md §11.14-11.16), from logs/sl-attempts.jsonl alone (no planning, no
 * model; nothing written outside --out):
 * - anchor: for each attempt 3+ with a deviation point, its reference attempt against the best failed attempt before it
 *   (the latest turn reached; same turn: the least enemy HP left), among every failed attempt and among those with decision
 *   points recorded (what SL_RETRY_EXPLORE_ANCHOR can take now: attempt 1 records them only from the switch on); how far
 *   the explore attempts got against their reference and the best; the reference and point the switch would choose;
 * - wasted: each deviation whose turn ended with a failed attempt's plays (differs false): whether the next turn's first
 *   board was still on the reference path, the later point SL_RETRY_EXPLORE_REARM would aim at, and whether the attempt's
 *   own boards came to it;
 * - differs: every deviation the rows say differs (`differs` true), read again with turnRepeats (SL_RETRY_EXPLORE_WASTED):
 *   the ones that really repeated a failed turn (but for upgrades, from the same turn start, or to a failed attempt's board);
 * - off-path: each replay that left the reference path before its point: how (the same plays in another order, other
 *   plays, the same plays in the same order), and whether the attempt then played a failed turn on the point's turn (what
 *   SL_RETRY_EXPLORE_TARGET_TURN keeps off).
 *
 * Usage: npx tsx tools/sl-explore-gaps.ts [--attempts logs/sl-attempts.jsonl] [--out experiments/sl-explore-gaps]
 * Output: <out>/gaps.json (every case), a summary on stdout.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { SlAttemptRow } from "../src/sl/attempts.js";
import { anchorRank, enemyHpLeft, exploreTarget, triedHas, turnCanon, turnRepeats, type ExploreRow, type ExploreTargetOptions, type SlTarget, type SlTried } from "../src/sl/explore.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}
const ATTEMPTS = arg("attempts", "logs/sl-attempts.jsonl");
const outDir = arg("out", "experiments/sl-explore-gaps");

/** The switches as they are on by default (every attempt 3+ in the logs ran with SL_RETRY_EXPLORE_WHERE and the rest on). */
const OPTIONS: ExploreTargetOptions = { aliveFirst: true, canon: true, tried: true, whole: true, where: true, potion: true };

const failedRow = (row: SlAttemptRow): boolean => row.result !== "won";
const boardsOf = (row: SlAttemptRow | undefined): Set<string> => new Set((row?.explore?.turns ?? []).flatMap((turn) => turn.boards.map((entry) => entry.board)));
/** Best by the anchor's metric: the latest turn, then the least enemy HP left; null HP last. */
const better = (a: SlAttemptRow, b: SlAttemptRow): number => b.turns - a.turns || (enemyHpLeft(a) ?? Infinity) - (enemyHpLeft(b) ?? Infinity);

function main(): void {
  mkdirSync(outDir, { recursive: true });
  const rows = readFileSync(ATTEMPTS, "utf8").trim().split("\n").map((line) => JSON.parse(line) as SlAttemptRow);
  const fights = new Map<string, SlAttemptRow[]>();
  for (const row of rows) fights.set(`${row.run_id}:${row.floor}`, [...(fights.get(`${row.run_id}:${row.floor}`) ?? []), row]);

  const anchorCases: Record<string, unknown>[] = [];
  const wastedCases: Record<string, unknown>[] = [];
  const offCases: Record<string, unknown>[] = [];
  // SL_RETRY_EXPLORE_WASTED: every deviation the rows say differs (the target's, the replay's fallback, attempt 2's second),
  // read again with turnRepeats.
  const differsCases: Record<string, unknown>[] = [];
  let differsTrue = 0;
  const fightsWithExplore = new Set<string>();
  const fightsNotBest = new Set<string>();
  const fightsOneLonger = new Set<string>();
  let fightsRetried = 0;
  for (const [key, all] of fights) {
    const live = [...all].sort((a, b) => a.attempt - b.attempt);
    const one = live.find((row) => row.attempt === 1 && failedRow(row) && row.result !== "unfinished");
    const two = live.find((row) => row.attempt === 2 && failedRow(row) && row.result !== "unfinished");
    if (one && two) {
      fightsRetried += 1;
      if (better(one, two) < 0) fightsOneLonger.add(key);
    }
    for (const row of live) {
      const earlierRows = live.filter((other) => other.attempt < row.attempt) as unknown as ExploreRow[];
      for (const [name, deviation, tried] of [["deviation", row.explore?.deviation, (row.explore?.target as SlTarget | null | undefined)?.tried], ["fallback", row.explore?.fallback, row.explore?.fallback?.tried]] as const) {
        if (!deviation?.reached || deviation.differs !== true || deviation.turn === undefined || deviation.turn === null) continue;
        const record = row.explore?.turns?.find((turn) => turn.turn === deviation.turn);
        if (!record) continue;
        differsTrue += 1;
        const summary = row.summary?.turns.find((turn) => turn.turn === deviation.turn);
        const next = row.explore!.turns!.find((turn) => turn.turn > deviation.turn!)?.boards[0]?.board ?? null;
        const repeat = turnRepeats(earlierRows, row.attempt, record, tried as SlTried | undefined, next, summary ? turnCanon(summary.plays) : undefined);
        if (repeat) differsCases.push({ fight: key, attempt: row.attempt, kind: name, turn: deviation.turn, plays: deviation.plays, replacement: deviation.replacement, repeat, result: row.result, turns: row.turns });
      }
      const target = row.explore?.target as SlTarget | null | undefined;
      if (row.attempt < 3 || !target) continue;
      fightsWithExplore.add(key);
      const earlier = live.filter((other) => other.attempt < row.attempt);
      const failed = earlier.filter((other) => failedRow(other) && other.result !== "unfinished");
      const reference = earlier.find((other) => other.attempt === target.reference)!;
      const best = [...failed].sort((a, b) => better(a, b) || a.attempt - b.attempt);
      const top = best[0]!;
      const isBest = better(reference, top) <= 0;
      const how = isBest ? "best" : reference.turns < top.turns ? "later turn" : "same turn, less enemy HP left";
      if (!isBest) fightsNotBest.add(key);
      // HP removed alone (the other metric): the least enemy HP left whatever the turn.
      const byHp = [...failed].filter((other) => enemyHpLeft(other) !== null).sort((a, b) => enemyHpLeft(a)! - enemyHpLeft(b)! || a.attempt - b.attempt)[0];
      const ranked = anchorRank(earlier as unknown as ExploreRow[], row.attempt);
      const anchored = exploreTarget(earlier as unknown as ExploreRow[], row.attempt, { ...OPTIONS, anchor: true });
      // The same options without the anchor (the live targets were chosen with the switches of their day).
      const base = exploreTarget(earlier as unknown as ExploreRow[], row.attempt, OPTIONS);
      anchorCases.push({
        fight: key,
        attempt: row.attempt,
        result: row.result,
        turns: row.turns,
        enemyHp: enemyHpLeft(row),
        reference: { attempt: reference.attempt, turns: reference.turns, enemyHp: enemyHpLeft(reference) },
        best: { attempt: top.attempt, turns: top.turns, enemyHp: enemyHpLeft(top) },
        how,
        bestBy: isBest ? null : top.attempt === 1 ? "attempt 1" : "attempt 3+",
        byHp: byHp ? { attempt: byHp.attempt, turns: byHp.turns, enemyHp: enemyHpLeft(byHp) } : null,
        metricsAgree: byHp ? byHp.attempt === top.attempt || better(byHp, top) === 0 : null,
        switchReference: ranked[0]?.attempt ?? null,
        switchTarget: anchored.target ? { reference: anchored.target.reference, turn: anchored.target.turn, point: anchored.target.point } : null,
        baseTarget: base.target ? { reference: base.target.reference, turn: base.target.turn, point: base.target.point } : null,
        liveTarget: { reference: target.reference, turn: target.turn, point: target.point },
      });

      // Wasted deviations: the next turn's first board on the reference path, and the point a re-arm aims at.
      const deviation = row.explore?.deviation;
      if (deviation?.reached && deviation.differs === false && deviation.turn !== undefined && deviation.turn !== null) {
        const turns = row.explore?.turns ?? [];
        const next = turns.find((turn) => turn.turn > deviation.turn!);
        const firstBoard = next?.boards[0]?.board;
        const onPath = firstBoard !== undefined && boardsOf(reference).has(firstBoard);
        const rearmed = onPath && next ? exploreTarget(earlier as unknown as ExploreRow[], row.attempt, { ...OPTIONS, rearm: { reference: target.reference, fromTurn: next.turn, skip: [target.board] } }) : null;
        const own = boardsOf(row);
        wastedCases.push({
          fight: key,
          attempt: row.attempt,
          result: row.result,
          turns: row.turns,
          deviation: { turn: deviation.turn, original: deviation.original, replacement: deviation.replacement, plays: deviation.plays, avoidFailed: deviation.avoidFailed?.length ?? 0 },
          nextTurn: next?.turn ?? null,
          onPath,
          rearm: rearmed?.target ? { turn: rearmed.target.turn, point: rearmed.target.point, board: rearmed.target.board, reachedByItsOwnPlay: own.has(rearmed.target.board) } : rearmed ? { none: rearmed.why } : null,
        });
      }

      // Off the path before the point: how, and the point's turn.
      const replay = row.explore?.replay;
      if (replay && replay.stopped !== null && !row.explore?.deviation?.reached) {
        const path = boardsOf(reference);
        const turns = row.explore?.turns ?? [];
        let left: { turn: number; at: number } | null = null;
        for (const turn of turns) {
          for (const entry of turn.boards) {
            if (entry.board === target.board) break;
            if (!path.has(entry.board)) {
              left = { turn: turn.turn, at: entry.at };
              break;
            }
          }
          if (left) break;
        }
        let kind = "unknown";
        if (left) {
          // The turn whose play left the path (the one before when it left at a turn's first board), whole, against the reference's.
          const mine = turns.find((turn) => turn.turn === (left!.at === 0 ? left!.turn - 1 : left!.turn));
          const theirs = (reference.explore?.turns ?? []).find((turn) => turn.turn === mine?.turn);
          const a = mine?.plays ?? [];
          const b = theirs?.plays ?? [];
          kind = a.join("|") === b.join("|") ? "same plays, same order" : turnCanon(a) === turnCanon(b) ? "same plays, another order" : "other plays";
        }
        const atTurn = turns.find((turn) => turn.turn === target.turn);
        const summary = row.summary?.turns.find((turn) => turn.turn === target.turn);
        const repeated = atTurn && target.tried ? triedHas(target.tried, { text: "", canon: turnCanon(atTurn.plays), ...(summary ? { loose: turnCanon(summary.plays) } : {}) }) : null;
        offCases.push({ fight: key, attempt: row.attempt, result: row.result, target: target.turn, stopped: replay.stopped, left, kind, fallback: row.explore?.fallback?.reached === true ? { turn: row.explore.fallback.turn, differs: row.explore.fallback.differs ?? null } : null, pointTurnRepeated: repeated });
      }
    }
  }

  writeFileSync(join(outDir, "gaps.json"), `${JSON.stringify({ anchor: anchorCases, wasted: wastedCases, offPath: offCases, differsWasted: differsCases }, null, 1)}\n`);
  const count = (list: Record<string, unknown>[], test: (entry: Record<string, unknown>) => boolean) => list.filter(test).length;
  const say = (text: string) => process.stdout.write(`${text}\n`);
  say(`anchor: ${anchorCases.length} explore attempts in ${fightsWithExplore.size} fights; reference the best failed attempt (or tied) in ${count(anchorCases, (c) => c["how"] === "best")}`);
  say(`  a failed attempt reached a later turn: ${count(anchorCases, (c) => c["how"] === "later turn")} (attempt 1: ${count(anchorCases, (c) => c["how"] === "later turn" && c["bestBy"] === "attempt 1")}, attempt 3+: ${count(anchorCases, (c) => c["how"] === "later turn" && c["bestBy"] === "attempt 3+")})`);
  say(`  the same turn, less enemy HP left: ${count(anchorCases, (c) => c["how"] === "same turn, less enemy HP left")} (attempt 1: ${count(anchorCases, (c) => c["how"] === "same turn, less enemy HP left" && c["bestBy"] === "attempt 1")}, attempt 3+: ${count(anchorCases, (c) => c["how"] === "same turn, less enemy HP left" && c["bestBy"] === "attempt 3+")})`);
  say(`  fights with an explore attempt anchored below the best: ${fightsNotBest.size} of ${fightsWithExplore.size}; attempt 1 lived longer than attempt 2 in ${fightsOneLonger.size} of ${fightsRetried} fights retried twice`);
  const reached = (c: Record<string, unknown>, field: "reference" | "best") => (c["turns"] as number) - ((c[field] as { turns: number }).turns);
  const notBest = anchorCases.filter((c) => c["how"] !== "best");
  say(`  explore attempts anchored below the best: ${notBest.length}; died before the best's last turn ${notBest.filter((c) => reached(c, "best") < 0).length}, at it ${notBest.filter((c) => reached(c, "best") === 0).length}, after it ${notBest.filter((c) => reached(c, "best") > 0).length}; won ${notBest.filter((c) => c["result"] === "won").length}`);
  const atBest = anchorCases.filter((c) => c["how"] === "best");
  say(`  explore attempts anchored at the best: ${atBest.length}; died before its last turn ${atBest.filter((c) => reached(c, "best") < 0).length}, at it ${atBest.filter((c) => reached(c, "best") === 0).length}, after it ${atBest.filter((c) => reached(c, "best") > 0).length}; won ${atBest.filter((c) => c["result"] === "won").length}`);
  say(`  metrics agree (latest turn vs least enemy HP left): ${count(anchorCases, (c) => c["metricsAgree"] === true)} of ${count(anchorCases, (c) => c["metricsAgree"] !== null)} readable`);
  say(`  explore attempts against their reference's last turn: died before it ${anchorCases.filter((c) => reached(c, "reference") < 0).length}, at it ${anchorCases.filter((c) => reached(c, "reference") === 0).length}, after it ${anchorCases.filter((c) => reached(c, "reference") > 0).length}`);
  say(`  SL_RETRY_EXPLORE_ANCHOR on these rows (attempt 1 has no points recorded yet): reference changes in ${count(anchorCases, (c) => c["switchReference"] !== (c["liveTarget"] as { reference: number }).reference)}; target changes against the same options without it in ${count(anchorCases, (c) => JSON.stringify(c["switchTarget"]) !== JSON.stringify(c["baseTarget"]))}`);
  for (const c of anchorCases.filter((entry) => JSON.stringify(entry["switchTarget"]) !== JSON.stringify(entry["baseTarget"]))) say(`    ${String(c["fight"])} attempt ${String(c["attempt"])} (${String(c["result"])} T${String(c["turns"])}): ${JSON.stringify(c["baseTarget"])} -> ${JSON.stringify(c["switchTarget"])}`);
  say(`wasted (differs false): ${wastedCases.length}; next turn still on the reference path ${count(wastedCases, (c) => c["onPath"] === true)}; a later point to aim at ${count(wastedCases, (c) => Boolean((c["rearm"] as { turn?: number } | null)?.turn))} (the attempt's own play came to it in ${count(wastedCases, (c) => (c["rearm"] as { reachedByItsOwnPlay?: boolean } | null)?.reachedByItsOwnPlay === true)})`);
  for (const c of wastedCases) say(`  ${String(c["fight"])} attempt ${String(c["attempt"])}: T${(c["deviation"] as { turn: number }).turn} wasted; next turn on path ${String(c["onPath"])}; rearm ${JSON.stringify(c["rearm"])}`);
  say(`differs true (a turn record there): ${differsTrue}; really a failed turn (SL_RETRY_EXPLORE_WASTED, turnRepeats): ${differsCases.length}${differsCases.length > 0 ? ` (${["upgrades", "turn start", "next board"].map((how) => `${how} ${count(differsCases, (c) => (c["repeat"] as { how: string }).how === how)}`).join(", ")})` : ""}`);
  for (const c of differsCases) say(`  ${String(c["fight"])} attempt ${String(c["attempt"])} ${String(c["kind"])} T${String(c["turn"])}: ${String(c["plays"])} (replacement ${String(c["replacement"])}): ${JSON.stringify(c["repeat"])}; ${String(c["result"])} T${String(c["turns"])}`);
  say(`off-path before the point: ${offCases.length}; ${["same plays, another order", "other plays", "same plays, same order", "unknown"].map((kind) => `${kind} ${count(offCases, (c) => c["kind"] === kind)}`).join(", ")}; the point's turn played a failed turn again in ${count(offCases, (c) => c["pointTurnRepeated"] === true)} (of them with a fallback ${count(offCases, (c) => c["pointTurnRepeated"] === true && c["fallback"] !== null)})`);
  for (const c of offCases) say(`  ${String(c["fight"])} attempt ${String(c["attempt"])} -> T${String(c["target"])}: left ${JSON.stringify(c["left"])} (${String(c["kind"])}); fallback ${JSON.stringify(c["fallback"])}; point's turn repeated ${String(c["pointTurnRepeated"])}`);
}

main();
