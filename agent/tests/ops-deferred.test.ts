import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, expect, it } from "vitest";

const tmp = mkdtempSync(join(tmpdir(), "ops-deferred-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
const scheduler = fileURLToPath(new URL("../../ops/codex-ops.sh", import.meta.url));

function fixture(name: string) {
  const root = join(tmp, name);
  const dir = join(root, "ops/codex-ops");
  mkdirSync(join(dir, "queue"), { recursive: true });
  writeFileSync(join(dir, "queue/100-manual.md"), "preserve this event\n");
  const fake = join(root, "fake-tsx.sh");
  writeFileSync(fake, '#!/bin/bash\nif [ "$FAKE_RC" = 0 ]; then rm -f "$CODEX_OPS_DIR/queue/100-manual.md"; fi\nexit "$FAKE_RC"\n');
  chmodSync(fake, 0o755);
  const env = { ...process.env, CODEX_OPS_ROOT: root, CODEX_OPS_DIR: dir, CODEX_OPS_TSX: fake, CODEX_OPS_NO_DRAIN: "0" };
  const drain = async (rc = 75) => {
    const result = await new Promise<{ code: number | null; stderr: string }>((resolve, reject) => {
      const child = spawn("bash", [scheduler, "drain"], { env: { ...env, FAKE_RC: String(rc) }, stdio: ["ignore", "ignore", "pipe"], timeout: 10_000 });
      let stderr = "";
      child.stderr!.on("data", chunk => { stderr += String(chunk); });
      child.on("error", reject);
      child.on("close", code => resolve({ code, stderr }));
    });
    expect(result.code, result.stderr).toBe(0);
  };
  const state = join(dir, "deferred.state");
  const inbox = join(root, "ops/inbox-dev.md");
  const old = () => Math.floor(Date.now() / 1000) - 1900;
  return { root, dir, drain, state, inbox, old };
}

it("alerts once after three long-running deferrals without consuming events or increasing failures", async () => {
  const f = fixture("long");
  writeFileSync(f.state, `${f.old()} 2 0\n`);
  await f.drain();
  expect(readFileSync(f.inbox, "utf8")).toContain("持续暂缓唤醒");
  await f.drain();
  expect(readFileSync(f.inbox, "utf8").trim().split("\n")).toHaveLength(1);
  expect(readFileSync(join(f.dir, "queue/100-manual.md"), "utf8")).toBe("preserve this event\n");
  expect(existsSync(join(f.dir, "fails"))).toBe(false);
  expect(readFileSync(f.state, "utf8").trim().split(" ").slice(1)).toEqual(["4", "1"]);
});

it("requires both age and count, and recovers malformed or future episode state", async () => {
  const f = fixture("short");
  await f.drain(); await f.drain(); await f.drain();
  expect(existsSync(f.inbox)).toBe(false);
  writeFileSync(f.state, `${f.old()} 0 0\n`);
  await f.drain();
  expect(existsSync(f.inbox)).toBe(false);
  for (const value of ["broken state\n", `${Math.floor(Date.now() / 1000) + 3600} 8 0\n`]) {
    writeFileSync(f.state, value);
    await f.drain();
    expect(readFileSync(f.state, "utf8").trim().split(" ").slice(1)).toEqual(["1", "0"]);
  }
});

it("clears the episode on success, failure or an empty queue; pause preserves it without alerting", async () => {
  const f = fixture("reset");
  const oldState = `${f.old()} 3 0\n`;
  writeFileSync(f.state, oldState);
  writeFileSync(join(f.dir, "PAUSE"), "paused\n");
  await f.drain();
  expect(readFileSync(f.state, "utf8")).toBe(oldState);
  expect(existsSync(f.inbox)).toBe(false);
  rmSync(join(f.dir, "PAUSE"));
  await f.drain(1);
  expect(existsSync(f.state)).toBe(false);
  expect(readFileSync(join(f.dir, "fails"), "utf8").trim()).toBe("1");
  writeFileSync(f.state, oldState);
  await f.drain(0);
  expect(existsSync(f.state)).toBe(false);
  expect(existsSync(join(f.dir, "fails"))).toBe(false);
  writeFileSync(f.state, oldState);
  await f.drain();
  expect(existsSync(f.state)).toBe(false);
});
