/**
 * A logged boss fight's turn-1 frame as the run stood just before the fight (B3's synthetic start, src/sim/boss-start.ts,
 * is built from a pre-fight state): no combat, and the relic counters the fight's first turn ticked put back (Happy
 * Flower's counter one turn back, Ember Tea's fights left one up). Offline, for tools/boss-sim/backtest.ts --starts syn
 * and synthetic-check.ts.
 */
import { parseGameState, type GameState } from "../../src/hand/mod/schema.js";

export function preFightState(t1: Record<string, unknown>): GameState {
  const raw = JSON.parse(JSON.stringify(t1)) as Record<string, unknown>;
  const run = raw["run"] as Record<string, unknown>;
  for (const relic of (run["relics"] as Record<string, unknown>[] | undefined) ?? []) {
    const stack = typeof relic["stack"] === "number" ? (relic["stack"] as number) : null;
    if (relic["relic_id"] === "HAPPY_FLOWER") relic["stack"] = ((stack ?? 0) + 2) % 3;
    if (relic["relic_id"] === "EMBER_TEA" && stack !== null) relic["stack"] = stack + 1;
  }
  raw["combat"] = null;
  raw["in_combat"] = false;
  raw["screen"] = "MAP";
  raw["available_actions"] = [];
  return parseGameState(raw);
}
