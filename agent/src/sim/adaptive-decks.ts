/** Execute B3 absolute ranges while retaining all candidate prefixes and shared-deck identities. */
import { currentDecisionBudget } from "../core/decision-budget.js";
import { AdaptiveSampler } from "./adaptive-sampler.js";
import type { AdaptiveTuning } from "./adaptive-shadow.js";
import type { DeckRunRequest, DeckRunResult, DeckSimRunner } from "./build-sim-pool.js";
import type { FightSampleResult } from "./boss-sim.js";

export async function runAdaptiveDecks(runner: DeckSimRunner, request: DeckRunRequest,
  choices: ReadonlyMap<string, readonly number[]>, allowS: boolean, tuning: AdaptiveTuning = {}) {
  if (request.orders.length !== 1) throw new Error("adaptive B3 requires the separately selected fixed order");
  const keys = new Map<string, readonly number[]>([["@current", [0]], ...choices]);
  if (choices.has("@current")) throw new Error("reserved adaptive baseline identity");
  const sampler = new AdaptiveSampler([...keys].map(([key, ids]) => ({ key, baseline: key === "@current", workGroup: ids.join(",") })),
    { ...tuning, lane: "b3", requested: request.samples, allowS });
  const outcomes: DeckRunResult["outcomes"] = request.decks.map(() => request.orders.map(() => new Array<FightSampleResult | undefined>(request.samples)));
  let workers = 0, elapsedMs = 0, done = 0;
  const budgeted = currentDecisionBudget() !== undefined;
  const now = request.now ?? (() => performance.now()), began = now();
  let cut = false;
  let diagnostics: DeckRunResult["diagnostics"];
  for (let next = sampler.next(); next; next = sampler.next()) {
    const left = request.deadlineMs === undefined ? Infinity : Math.max(0, request.deadlineMs - (now() - began));
    if (budgeted && left <= 0) { cut = true; break; }
    const activeDecks = [...new Set(next.active.flatMap((key) => [...keys.get(key)!]))];
    const range = { from: next.from, to: next.to };
    const round = await runner.run({ ...request, range, activeDecks, ...(budgeted ? { deadlineMs: left } : {}),
      onProgress: (completed) => request.onProgress?.(done + completed, request.samples * new Set([...keys.values()].map((ids) => ids.join(","))).size) });
    if (!budgeted && (round.timedOut || round.complete.length !== range.to - range.from || round.complete.some((id, i) => id !== range.from + i))) {
      throw new Error("adaptive B3 round incomplete");
    }
    const common = new Set(round.complete);
    let end = range.from;
    while (end < range.to && common.has(end)) end++;
    const completed = budgeted ? Array.from({ length: end - range.from }, (_, i) => range.from + i) : round.complete;
    for (const deck of activeDecks) for (let order = 0; order < request.orders.length; order++) for (const id of completed) {
      const stripe = request.stripes?.[deck];
      if (stripe && id % stripe.of !== stripe.at) continue;
      const value = round.outcomes[deck]?.[order]?.[id];
      if (!value) throw new Error("adaptive B3 missing physical sample");
      outcomes[deck]![order]![id] = value;
      done++;
    }
    elapsedMs += round.elapsedMs;
    workers = Math.max(workers, round.workers);
    if (round.diagnostics) {
      const value = round.diagnostics;
      diagnostics = diagnostics ? { queueMs: diagnostics.queueMs + value.queueMs,
        coldStart: diagnostics.coldStart || value.coldStart, preparationMs: diagnostics.preparationMs + value.preparationMs,
        firstReplyMs: diagnostics.firstReplyMs ?? value.firstReplyMs,
        chunksPlanned: diagnostics.chunksPlanned + value.chunksPlanned,
        chunksDispatched: diagnostics.chunksDispatched + value.chunksDispatched,
        chunksCompleted: diagnostics.chunksCompleted + value.chunksCompleted,
        outcomesCompleted: diagnostics.outcomesCompleted + value.outcomesCompleted } : { ...value };
    }
    const n = budgeted ? end : range.to;
    const prefixes = next.active.map((key) => {
      const ids = keys.get(key)!;
      return { key, samples: Array.from({ length: n }, (_, i) => outcomes[ids[i % ids.length]!]![0]![i]!) };
    });
    if (budgeted && (round.timedOut || end < range.to)) { sampler.observePartial(prefixes, n); cut = true; break; }
    sampler.observe(prefixes);
  }
  const adaptive = sampler.result(budgeted), counts = new Map(adaptive.candidates.map((candidate) => [candidate.key, candidate]));
  const n = counts.get("@current")!.samples;
  const run: DeckRunResult = { outcomes, complete: Array.from({ length: n }, (_, i) => i), timedOut: cut, workers, elapsedMs,
    ...(diagnostics ? { diagnostics } : {}) };
  return { run, adaptive, counts };
}
