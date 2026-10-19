import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { main, type LauncherDeps } from "../../learner/lib/launcher.js";

it("deduplicates frozen evidence and simulation results without changing their bytes or reuse contract", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_content_store.py"], {
    encoding: "utf8", timeout: 30_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 13 tests");
}, 35_000);

it.each([false, true])("the original host finalizes only after its fake model closes; storage failure=%s never reruns it", async (corrupt) => {
  const root = mkdtempSync(join(tmpdir(), "fixed-host-content-"));
  try {
    mkdirSync(join(root, "ops"));
    mkdirSync(join(root, "tasks"));
    writeFileSync(join(root, "ops/content_store.py"), readFileSync(resolve("../ops/content_store.py")));
    writeFileSync(join(root, "tasks/storage-smoke.md"), "---\ntitle: Fixed storage host\ntools: Read\n---\nSCRATCH={{scratch}}\n");
    const fake = join(root, "fake-codex");
    writeFileSync(fake, `#!/usr/bin/env node
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const prompt=fs.readFileSync(0,'utf8'), scratch=prompt.match(/SCRATCH=(.+)/)[1].trim();
fs.appendFileSync(${JSON.stringify(join(root, "invocations"))},'one\\n');
fs.mkdirSync(scratch,{recursive:true});
const raw=Buffer.from('fixed frozen evidence\\n'), sha=${corrupt ? "'f'.repeat(64)" : "crypto.createHash('sha256').update(raw).digest('hex')"};
fs.writeFileSync(path.join(scratch,'states.evidence.jsonl'),raw);
fs.writeFileSync(path.join(scratch,'evidence-manifest.json'),JSON.stringify([{stream:'states',output_sha256:sha,content:{schema:'frozen-content-v1',sha256:sha,bytes:raw.length,pending_host_seal:true}}]));
console.log(JSON.stringify({type:'thread.started',thread_id:'fixed-storage-thread'}));
console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:1,output_tokens:1}}));
`);
    chmodSync(fake, 0o755);
    const deps = {
      env: { PATH: process.env["PATH"], HOME: root, LEARNER_CODEX_HOME: join(root, "fake-home"), LEARNER_CODEX_BIN: fake },
      projectRoot: root, tasksDir: join(root, "tasks"), runsDir: join(root, "learner/runs"), secretFiles: [],
      now: () => new Date(), out: () => undefined, err: () => undefined,
      checkCodex: async () => ({ ok: true }), checkKeys: async () => ({ ok: true }),
    } as unknown as LauncherDeps;
    expect(await main(["--engine", "codex", "--task", "storage-smoke", "--cwd", root], deps)).toBe(0);
    expect(readFileSync(join(root, "invocations"), "utf8")).toBe("one\n");
    const log = readdirSync(deps.runsDir).find((name) => name.endsWith(".jsonl"))!;
    const events = readFileSync(join(deps.runsDir, log), "utf8").trim().split("\n").map((line) => JSON.parse(line));
    const exited = events.findIndex((x) => x.type === "learner_startup_exit");
    const stored = events.findIndex((x) => x.type === "learner_storage");
    expect(stored).toBeGreaterThan(exited);
    expect(events.at(-1).type).toBe("learner_summary");
    const receipt = JSON.parse(readFileSync(events[stored].receipt, "utf8"));
    const scratch = events[0].params.scratch as string;
    expect(readFileSync(join(scratch, "states.evidence.jsonl"), "utf8")).toBe("fixed frozen evidence\n");
    if (corrupt) {
      expect(receipt.status).toBe("retained");
      expect(readdirSync(join(root, "ops/codex-ops/queue"))).toHaveLength(1);
    } else {
      expect(receipt.status).toBe("sealed");
      expect(statSync(join(receipt.files[0].content.store, receipt.files[0].content.object)).ino)
        .toBe(statSync(join(scratch, "states.evidence.jsonl")).ino);
      expect(readdirSync(join(root, "ops/codex-ops")).includes("queue")).toBe(false);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
}, 20_000);
