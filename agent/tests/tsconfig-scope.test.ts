import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { expect, it } from "vitest";

it("typechecks learner source without collecting archived run fixtures", () => {
  const root = mkdtempSync(join(tmpdir(), "sts2-tsconfig-scope-"));
  try {
    const agent = join(root, "agent");
    const files = ["agent/src/main.ts", "learner/run.ts", "learner/runs/fixed-batch/poison-src/model.ts"];
    for (const file of files) {
      const path = join(root, file);
      mkdirSync(join(path, ".."), { recursive: true });
      writeFileSync(path, file.includes("runs/") ? 'const broken: number = "archived fixture";' : "export {};\n");
    }
    // Use TypeScript's actual include/exclude expansion on an isolated, fixed project layout.
    const config = JSON.parse(readFileSync("tsconfig.json", "utf8"));
    config.compilerOptions.types = [];
    const path = join(agent, "tsconfig.json");
    writeFileSync(path, JSON.stringify(config));
    const result = spawnSync(resolve("node_modules/.bin/tsc"), ["-p", path, "--listFilesOnly"], { encoding: "utf8", timeout: 10_000 });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const collected = result.stdout.trim().split(/\r?\n/).filter((file) => file.startsWith(root));
    expect(collected.sort()).toEqual([join(root, files[0]!), join(root, files[1]!)].sort());
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
