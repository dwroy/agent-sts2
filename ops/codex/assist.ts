/** Build the assistant command with the learner's isolated Codex plumbing; never run a model here. */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { agentEnv } from "../../agent/src/brain/engines/process.js";
import { codexChildEnv, codexCommand, codexPermissions, codexProfileOverrides, engineBinary, withCodexKeys, type EngineRequest } from "../../learner/lib/engines.js";

export function assistRequest(root: string, input: string, env: NodeJS.ProcessEnv): EngineRequest {
  return withCodexKeys({ engine: "codex", projectRoot: root, cwd: input, repo: root,
    profile: "ops_assist", tools: ["Read", "Grep", "Glob"],
  }, env);
}

/** The established learner read-only profile: OS-enforced no writes/network, original key masks.
 * Evidence/character scope is a task constraint, not a claim that every other business file is hidden.
 */
export function assistFilesystem(request: EngineRequest) {
  return codexPermissions(request);
}

export function assistOverrides(request: EngineRequest): string[] {
  return codexProfileOverrides(request);
}

export function assistPlan(root: string, input: string, env: NodeJS.ProcessEnv) {
  const request = assistRequest(root, input, env);
  const bin = engineBinary("codex", env);
  if (!bin) throw new Error("Codex executable unavailable");
  const task = readFileSync(join(root, "learner/tasks/ops-assist.md"), "utf8");
  const manifest = readFileSync(join(input, "manifest.json"), "utf8");
  const command = codexCommand(request, `${task}\n\n本次不可变任务及证据目录：\n${manifest}`, bin);
  command.args.splice(command.args.length - 1, 0, "--skip-git-repo-check", "-c", "project_doc_max_bytes=0");
  // Use only the common process environment. No broker, scheduler or task override reaches the model.
  const child = codexChildEnv(agentEnv({ CODEX_HOME: request.codexHome! }, env), bin);
  const probeScript = 'test -r "$1" || exit 10; shift; for f in "$@"; do if head -c 0 -- "$f" 2>/dev/null; then exit 11; fi; done';
  const probe = ["sandbox", "-C", input, "-P", "ops_assist", ...assistOverrides(request), "--", "sh", "-c",
    probeScript, "sh", join(input, "manifest.json"), ...request.keyFiles ?? []];
  return { command, env: child, probe };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 4) throw new Error("usage: assist.ts <root> <input>");
    process.stdout.write(JSON.stringify(assistPlan(resolve(process.argv[2]!), resolve(process.argv[3]!), process.env)));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}
