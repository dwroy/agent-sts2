/** Offline workload probe with frozen frames and this checkout's learned model.
 * No API/game actions. Explicit HP 70 and absent route memory are not historical CPU/strategy replay.
 */
import { readFileSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { loadavg } from "node:os";
import { makeKnowledge } from "../src/knowledge/index.js";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planDecision } from "../src/hand/screens/index.js";
import { withBossSim } from "../src/sim/build-sim-facts.js";
import { BuildSimPool } from "../src/sim/build-sim-pool.js";
const [directory, output, workersArg = "2"] = process.argv.slice(2);
if (!directory || !output || !/^[1-4]$/.test(workersArg)) throw new Error("profile-build-health <frozen-dir> <new-output.jsonl> [1-4 workers]");
const path = resolve(output);
appendFileSync(path, "", { flag: "wx" });
const gameData = readFileSync(join(directory, "game-data.json"));
const knowledge = makeKnowledge(JSON.parse(gameData.toString()).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);
for (const floor of [2, 4, 6]) {
  const frame = JSON.parse(readFileSync(join(directory, `F${floor}-frame.json`), "utf8"));
  frame.state.run.current_hp = 70;
  const state = parseGameState(frame.state);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: config.thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn",
    screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [], buildDecider: "deepseek" };
  const planned = planDecision(env);
  if (planned.kind !== "decision" || planned.decision.label !== "reward/card") throw new Error(`unexpected F${floor} decision: ${JSON.stringify(planned)}`);
  const runner = new BuildSimPool(Number(workersArg));
  try {
    for (const repeat of ["cold", "warm"]) {
      const start = Date.now();
      const result = await withBossSim(planned.decision, env, { runner });
      appendFileSync(path, JSON.stringify({ at: new Date().toISOString(), floor, repeat, elapsedMs: Date.now() - start,
        workers: Number(workersArg), load: loadavg(), gameDataSha: createHash("sha256").update(gameData).digest("hex"),
        limitation: "Current-checkout model; explicit entry HP 70, no historical route memory/CPU state. No win-rate inference.",
        error: result.record?.error, diagnostics: result.record?.diagnostics }) + "\n");
    }
  } finally { await runner.close(); }
}
