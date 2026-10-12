import { writeFileSync } from "node:fs";
import { checkCodex } from "../../../agent/src/brain/engines/codex.js";

async function main() {
  const root = "/home/dw/Projects/agent-sts2";
  const result = [];
  for (const role of ["brain", "learner"] as const) {
    const home = `${root}/ops/codex-ops/accounts/codex1/${role}`;
    const check = await checkCodex({ bin: "/home/dw/.local/node/bin/codex", home }, "gpt-6.1-sol", "xhigh", {
      stateDir: `${process.cwd()}/paper/materials/20261012-model-sol61/preflight-state/${role}`, timeoutMs: 30000,
    });
    result.push({ role, home, requested_model: "gpt-6.1-sol", requested_effort: "xhigh", check });
  }
  writeFileSync("paper/materials/20261012-model-sol61/preflight.json", JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
  process.exitCode = result.every(row => row.check.ok) ? 0 : 1;
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
