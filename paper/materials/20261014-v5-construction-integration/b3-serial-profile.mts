/** Offline workload probe with frozen frames and this checkout's learned model.
 * No API/game actions. Explicit HP 70 and absent route memory are not historical CPU/strategy replay.
 */
import { readFileSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { loadavg } from "node:os";
import { makeKnowledge } from "/home/dw/Projects/agent-sts2/.worktrees/v5-construction-integration-20261014/agent/src/knowledge/index.js";
import { loadConfig } from "/home/dw/Projects/agent-sts2/.worktrees/v5-construction-integration-20261014/agent/src/core/config.js";
import { parseGameState } from "/home/dw/Projects/agent-sts2/.worktrees/v5-construction-integration-20261014/agent/src/hand/mod/schema.js";
import { buildRunBrief } from "/home/dw/Projects/agent-sts2/.worktrees/v5-construction-integration-20261014/agent/src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "/home/dw/Projects/agent-sts2/.worktrees/v5-construction-integration-20261014/agent/src/memory/types.js";
import { planDecision } from "/home/dw/Projects/agent-sts2/.worktrees/v5-construction-integration-20261014/agent/src/hand/screens/index.js";
import { withBossSim } from "/home/dw/Projects/agent-sts2/.worktrees/v5-construction-integration-20261014/agent/src/sim/build-sim-facts.js";
import { SerialDeckRunner } from "/home/dw/Projects/agent-sts2/.worktrees/v5-construction-integration-20261014/agent/src/sim/build-sim-pool.js";
import { Session } from "node:inspector/promises";
import { writeFileSync } from "node:fs";
const [directory, output, workersArg = "2"] = process.argv.slice(2);
if (!directory || !output || !/^[1-4]$/.test(workersArg)) throw new Error("profile-build-health <frozen-dir> <new-output.jsonl> [1-4 workers]");
const path = resolve(output);
appendFileSync(path, "", { flag: "wx" });
const gameData = readFileSync(join(directory, "game-data.json"));
const knowledge = makeKnowledge(JSON.parse(gameData.toString()).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);
for (const floor of [6]) {
  const frame = JSON.parse(readFileSync(join(directory, `F${floor}-frame.json`), "utf8"));
  frame.state.run.current_hp = 70;
  const state = parseGameState(frame.state);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: config.thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn",
    screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [], buildDecider: "deepseek" };
  const planned = planDecision(env);
  if (planned.kind !== "decision" || planned.decision.label !== "reward/card") throw new Error(`unexpected F${floor} decision: ${JSON.stringify(planned)}`);
  const runner = new SerialDeckRunner();
  const session = new Session(); session.connect(); await session.post("Profiler.enable"); await session.post("Profiler.start");
  try {
    for (const repeat of ["serial-cpu-profile"]) {
      const start = Date.now();
      const result = await withBossSim(planned.decision, env, { runner });
      appendFileSync(path, JSON.stringify({ at: new Date().toISOString(), floor, repeat, elapsedMs: Date.now() - start,
        workers: 0, load: loadavg(), gameDataSha: createHash("sha256").update(gameData).digest("hex"),
        limitation: "Current-checkout model; explicit entry HP 70, no historical route memory/CPU state. No win-rate inference.",
        error: result.record?.error, diagnostics: result.record?.diagnostics }) + "\n");
    }
  } finally { const {profile}=await session.post("Profiler.stop"); writeFileSync(path+".cpuprofile",JSON.stringify(profile)); session.disconnect(); }
}
