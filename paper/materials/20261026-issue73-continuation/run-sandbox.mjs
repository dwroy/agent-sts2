// Execute the repository's fixed sandbox exclusions without npm/with-temp parent processes.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { createTempScope } from "../../../agent/tools/temp-root.mjs";
const root = resolve(new URL("../../..", import.meta.url).pathname), source = readFileSync(resolve(root, "agent/tools/test-sandbox.sh"), "utf8");
const excludes = [...source.matchAll(/--exclude ([^\s\\]+)/g)].flatMap(match => ["--exclude", match[1]]);
const argv = [process.execPath, resolve(root, "agent/node_modules/vitest/vitest.mjs"), "run", "--pool=threads", "--maxWorkers=1", ...excludes];
const scope = createTempScope();
writeFileSync(new URL("./sandbox-command.json", import.meta.url), JSON.stringify({ fixed_script_sha256: createHash("sha256").update(source).digest("hex"), argv, process_limit: 2, reason: "Direct exec preserves the <=2-process constraint; tsc and paths fork run separately", temporary_scope: scope.env }, null, 2) + "\n");
process.chdir(resolve(root, "agent"));
const env = { ...process.env, ...scope.env }; delete env.CHARACTER;
process.execve(process.execPath, argv, env);
