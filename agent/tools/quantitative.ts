/** Offline JSON-in/JSON-out numerical interface. No game client, knowledge loader or model calls. */
import { readFileSync } from "node:fs";
import { abstractCycleBound, abstractHandAccess, pairedDifference, summarizeSamples } from "../src/sim/quantitative-stats.js";
import { calibrationSummary } from "../src/sim/quantitative-calibration.js";

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  let result: unknown;
  switch (input.method) {
    case "uniform-hand": result = abstractHandAccess(input.deck, input.draw, input.components, input.turns); break;
    case "cycle-bound": result = abstractCycleBound(input.energy, input.cycleCost, input.resetCost, input.actions, input.componentActions); break;
    case "samples": result = summarizeSamples(input.values); break;
    case "paired": result = pairedDifference(input.base, input.option); break;
    case "calibration": result = calibrationSummary(input.rows); break;
    default: throw new Error("unknown method");
  }
  process.stdout.write(`${JSON.stringify({ schema: "quantitative-v1", method: input.method, result })}\n`);
} catch (error) {
  process.stderr.write(`quantitative input failed: ${error instanceof Error ? error.message : "invalid input"}\n`);
  process.exitCode = 1;
}
