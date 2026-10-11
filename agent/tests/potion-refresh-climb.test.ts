import { spawn } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, expect, it } from "vitest";

const base = mkdtempSync(join(tmpdir(), "potion-refresh-climb-"));
afterAll(() => rmSync(base, { recursive: true, force: true }));
let sequence = 0;

async function run(target: string, rows: object[], dry: boolean) {
  const root = join(base, String(++sequence));
  for (const name of ["knowledge/builders", "knowledge/characters/silent", "logs", "data/logdb-venv/bin"]) mkdirSync(join(root, name), { recursive: true });
  const script = join(root, "knowledge/builders/refresh-potion-equivalents.sh");
  copyFileSync(resolve("../knowledge/builders/refresh-potion-equivalents.sh"), script);
  const envFile = join(root, "fixed-config");
  writeFileSync(envFile, `TARGET_ASCENSION=${target}\n`);
  writeFileSync(join(root, "logs/runs.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  writeFileSync(join(root, "knowledge/characters/silent/potion-equivalents.json"), JSON.stringify({ meta: { generated: new Date().toISOString(), ascensions: [8, 9] } }));
  const python = join(root, "data/logdb-venv/bin/python");
  writeFileSync(python, '#!/bin/sh\nprintf "%s\\n" "$@" > "$TEST_ARGS"\n');
  chmodSync(python, 0o755);
  const result = await new Promise<{ code: number | null; out: string }>((resolveResult, reject) => {
    const child = spawn("bash", [script, ...(dry ? ["--dry-run"] : []), "--character", "silent"],
      { env: { PATH: process.env.PATH, ENV_FILE: envFile, TEST_ARGS: join(root, "args") } });
    let out = "";
    child.stdout.on("data", (v: Buffer) => { out += v.toString(); });
    child.stderr.on("data", (v: Buffer) => { out += v.toString(); });
    child.on("error", reject); child.on("close", (code) => resolveResult({ code, out }));
  });
  return { ...result, root };
}

it("resolves climb from the same character and rebuilds when its observed level is missing", async () => {
  const result = await run("climb", [{ character: "SILENT", ascension: 10 }, { character: "IRONCLAD", ascension: 99 }], false);
  expect(result.code, result.out).toBe(0);
  expect(result.out).toContain("TARGET_ASCENSION 10");
  expect(readFileSync(join(result.root, "args"), "utf8")).toContain("--ascensions\n10\n");
});

it("keeps numeric mode unchanged", async () => {
  const result = await run("8", [{ character: "SILENT", ascension: 10 }], true);
  expect(result.code, result.out).toBe(0);
  expect(result.out).toContain("up to date");
});

it("does not invent a level from another character or malformed evidence", async () => {
  const result = await run("climb", [{ character: "IRONCLAD", ascension: 8 }, { character: "SILENT", ascension: true }], true);
  expect(result.code).toBe(2);
  expect(result.out).toContain("no completed run");
});

it("still rejects unsupported configuration values", async () => {
  expect((await run("unexpected", [], true)).code).toBe(2);
});
