/** Scheduler-only entry point; no LLM call and no proactive auth refresh. */
import { join } from "node:path";
import { readCodexUsage } from "../agent/src/brain/engines/codex-usage.js";
import { PROJECT_ROOT } from "../agent/src/core/paths.js";
import { codexChildEnv, engineBinary, learnerCodexHome } from "../learner/lib/engines.js";
import { sampleQuota } from "./subscription-usage.js";

const root = process.env["CODEX_OPS_ROOT"] || PROJECT_ROOT;
sampleQuota(join(root, "logs/subscription-usage-snapshots.jsonl"), async () => {
  const bin = engineBinary("codex", process.env);
  if (!bin) throw new Error("codex_unavailable");
  return readCodexUsage({ bin, home: learnerCodexHome(process.env), env: codexChildEnv(process.env, bin),
    stateDir: join(root, "ops/codex-ops/usage-state"), timeoutMs: 15_000 });
}).catch(() => { process.exitCode = 1; });
