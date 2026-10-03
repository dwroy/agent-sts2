/**
 * One read of the codex plan's usage, read only (Dai 2026-10-03): the usage guard's own read (src/brain/engines/
 * codex-usage.ts readCodexUsage: account/rateLimits/read through a short-lived `codex app-server` on stdio, codex's
 * login in BRAIN_CODEX_HOME / ~/.codex, which codex reads and we do not), printed as brain.jsonl's `limits` note with
 * the guard's verdict at the configured BRAIN_CODEX_USAGE_STOP_PCT. No model call; no account id is printed.
 *
 *   nice -n 10 npx tsx experiments/brain-replay/codex-usage/read-usage.ts [--repeat N]
 */
import { parseArgs } from "node:util";
import { join } from "node:path";

import { CODEX_STATE_DIR, codexEnv } from "../../../src/brain/engines/codex.js";
import { CodexUsageGuard, readCodexUsage, usageNote } from "../../../src/brain/engines/codex-usage.js";
import { loadConfig } from "../../../src/config.js";

const { values } = parseArgs({ options: { repeat: { type: "string", default: "1" } } });
const env = { HOME: process.env["HOME"] ?? "", PATH: process.env["PATH"] ?? "", BRAIN_LOG: "off", ...(process.env["BRAIN_CODEX_HOME"] ? { BRAIN_CODEX_HOME: process.env["BRAIN_CODEX_HOME"] } : {}) };
const { bin, home, usage: settings } = loadConfig(env as unknown as NodeJS.ProcessEnv).brain.codex;
const read = () => readCodexUsage({ bin, home, env: codexEnv(bin, home), stateDir: join(CODEX_STATE_DIR, "usage") });
const guard = new CodexUsageGuard(settings, read);
for (let i = 0; i < Number(values.repeat); i += 1) {
  const usage = await read();
  console.log(JSON.stringify({ ...usageNote(usage), windows: usage.windows, credits_detail: usage.credits, spend_control_reached: usage.spendControlReached, verdict: guard.verdict(usage) ?? `go (stop at ${settings.stopPct}%)` }));
}
