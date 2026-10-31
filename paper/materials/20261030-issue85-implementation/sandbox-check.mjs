/** Same fixed sandbox exclusions, without an extra supervising Node process. Run from agent/. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createTempScope } from "../../../agent/tools/temp-root.mjs";
const script = readFileSync("tools/test-sandbox.sh", "utf8");
const exclusions = [...script.matchAll(/--exclude (tests\/[^\s]+\.test\.ts)/g)].flatMap(m => ["--exclude", m[1]]);
if (exclusions.length < 60) throw Error("fixed exclusions unavailable");
const scope = createTempScope(); Object.assign(process.env, scope.env); delete process.env.CHARACTER;
process.on("exit", () => scope.cleanup());
const cli = resolve("node_modules/vitest/vitest.mjs");
process.argv = [process.execPath, cli, "run", "--pool=threads", "--maxWorkers=1", ...exclusions];
await import(pathToFileURL(cli).href);
