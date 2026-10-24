/** Scheduler-only entry point; no LLM call and no proactive auth refresh. */
import { createHash } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readCodexUsage } from "../agent/src/brain/engines/codex-usage.js";
import { PROJECT_ROOT } from "../agent/src/core/paths.js";
import { codexChildEnv, engineBinary, learnerCodexHome } from "../learner/lib/engines.js";
import { sampleQuota } from "./subscription-usage.js";

const root = process.env["CODEX_OPS_ROOT"] || PROJECT_ROOT;
const home = learnerCodexHome(process.env);
sampleQuota(join(root, "logs/codex-usage.jsonl"), async () => {
  const bin = engineBinary("codex", process.env);
  if (!bin) throw new Error("codex_unavailable");
  return readCodexUsage({ bin, home, env: codexChildEnv(process.env, bin),
    stateDir: join(root, "ops/codex-ops/usage-state"), timeoutMs: 15_000 });
}).then((snapshot) => {
  const directory = process.env["CODEX_OPS_DIR"] || join(root, "ops/codex-ops");
  mkdirSync(directory, { recursive: true });
  const path = join(directory, "subscription-usage.json");
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify({ ...snapshot,
    account_home_sha256: createHash("sha256").update(home).digest("hex") }) + "\n", { mode: 0o600 });
  renameSync(temporary, path);
}).catch(() => { process.exitCode = 1; });
