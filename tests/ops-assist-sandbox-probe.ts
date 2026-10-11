/** Actual Codex sandbox probe, fixed files only: no model/login/network/game call. Run on the host. */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { assistOverrides, assistRequest } from "../ops/codex/assist.js";
import { codexChildEnv, codexKeyCheckCommand, engineBinary } from "../learner/lib/engines.js";

const base = mkdtempSync(join(tmpdir(), "ops-assist-sandbox-"));
try {
  const main = join(base, "main");
  const root = join(main, ".worktrees/task");
  const input = join(root, "ops/codex-ops/assist/jobs/probe/input");
  const live = join(main, ".worktrees/live");
  const broker = join(main, "ops/codex-ops/broker");
  for (const path of [root, input, live, broker, join(root, "agent")]) mkdirSync(path, { recursive: true });
  writeFileSync(join(root, "agent/.env"), "FIXTURE_DENIED=1\n");
  const evidence = join(input, "evidence.txt");
  writeFileSync(evidence, "fixed-evidence\n");
  writeFileSync(join(main, "other-role.txt"), "hidden\n");
  const request = assistRequest(root, input, process.env);
  const bin = engineBinary("codex", process.env)!;
  const targets = [input, root, main, live, base, broker].map((path) => join(path, "probe-write"));
  const script = 'test "$(cat "$1")" = fixed-evidence || exit 10; shift; test -r "$1" || exit 11; shift; for f in "$@"; do if (printf bad > "$f") 2>/dev/null; then echo "WRITE_ALLOWED:$f"; exit 12; fi; done; echo READ_ONLY_PROBE_OK';
  const args = ["sandbox", "-C", input, "-P", "ops_assist", ...assistOverrides(request), "--", "/bin/sh", "-c", script, "sh", evidence, join(main, "other-role.txt"), ...targets];
  const result = spawnSync(bin, args, { env: codexChildEnv(process.env, bin), encoding: "utf8", timeout: 40_000 });
  const keyCommand = codexKeyCheckCommand(request, request.keyFiles ?? [], bin);
  const keys = spawnSync(keyCommand.command, keyCommand.args, { env: codexChildEnv(process.env, bin), encoding: "utf8", timeout: 40_000 });
  process.stdout.write(JSON.stringify({ keyProbe: { code: keys.status, filesChecked: request.keyFiles?.length, noReadableKeys: !keys.stdout?.trim(), stderr: keys.stderr }, code: result.status, signal: result.signal, error: result.error?.message, stdout: result.stdout, stderr: result.stderr,
    checks: { businessReadScope: "Filesystem is fully read-only; task limits reads to frozen evidence", evidenceRead: result.stdout?.includes("READ_ONLY_PROBE_OK"), forbiddenWrites: targets.map((path) => ({ path, absent: !existsSync(path) })), evidenceUnchanged: readFileSync(evidence, "utf8") === "fixed-evidence\n" } }, null, 2) + "\n");
  if (result.status !== 0 || keys.status !== 0 || keys.stdout?.trim() || targets.some(existsSync)) process.exitCode = 1;
} finally {
  rmSync(base, { recursive: true, force: true });
}
