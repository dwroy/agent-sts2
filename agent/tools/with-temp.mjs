#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createTempScope } from "./temp-root.mjs";

const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error("usage: node tools/with-temp.mjs <command> [args...]");
const scope = createTempScope();
let interrupted = false;
let spawnFailed = false;
const child = spawn(command, args, { stdio: "inherit", env: { ...process.env, ...scope.env } });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  interrupted = true;
  child.kill(signal);
});
child.once("error", (error) => {
  spawnFailed = true;
  scope.cleanup();
  console.error(error.message);
  process.exitCode = 1;
});
child.once("close", (code, signal) => {
  // An interrupted process may still have descendants: retain its owned scratch for diagnosis.
  if (!interrupted && !signal) scope.cleanup();
  process.exitCode = spawnFailed ? 1 : code ?? (signal === "SIGINT" ? 130 : 143);
});
