import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startBroker } from "../../ops/codex/main.js";
import { opsPaths } from "../../ops/codex/lib.js";

const faults = vi.hoisted(() => ({ renameId: "", reserve: false, open: false }));
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  return {
    ...fs,
    openSync: (...args: Parameters<typeof fs.openSync>) => {
      if (faults.open && String(args[0]).endsWith(".res.tmp")) throw Object.assign(new Error("fixture"), { code: "ENOSPC" });
      return fs.openSync(...args);
    },
    renameSync: (...args: Parameters<typeof fs.renameSync>) => {
      if (faults.renameId && String(args[1]).endsWith(`${faults.renameId}.res`)) throw Object.assign(new Error("fixture"), { code: "ENOSPC" });
      return fs.renameSync(...args);
    },
    writeFileSync: (...args: Parameters<typeof fs.writeFileSync>) => {
      if (faults.reserve && typeof args[0] === "number") throw Object.assign(new Error("fixture"), { code: "ENOSPC" });
      return fs.writeFileSync(...args);
    },
  };
});

const dirs: string[] = [];
const stops: (() => Promise<void>)[] = [];
afterEach(async () => {
  faults.renameId = ""; faults.reserve = false; faults.open = false;
  for (const stop of stops.splice(0)) await stop().catch(() => {});
  vi.useRealTimers();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function fixture() {
  vi.useFakeTimers();
  const root = mkdtempSync(join(tmpdir(), "broker-response-")); dirs.push(root);
  const p = opsPaths(root, {});
  mkdirSync(join(root, "ops"), { recursive: true });
  // The negative control also uses a harmless local action, never a real ops command.
  writeFileSync(join(root, "ops", "codex-ops-actions.sh"), 'printf "fixed result\\n"\n');
  const run = vi.fn(async () => ({ code: 7, out: "固定结果\n" }));
  const logs: string[] = [];
  const stop = startBroker(p, root, (line) => logs.push(line), run); stops.push(stop);
  const request = (id: string) => writeFileSync(join(p.broker, `${id}.req`), JSON.stringify({ action: "procs", args: [] }));
  const read = (id: string) => JSON.parse(readFileSync(join(p.broker, `${id}.res`), "utf8"));
  return { p, run, logs, request, read };
}

describe("broker response persistence after disk failures", () => {
  it("retains a completed result and request after rename failure, drains later requests, and never replays the action", async () => {
    const f = fixture(); faults.renameId = "1-1";
    f.request("1-1"); await vi.advanceTimersByTimeAsync(500);
    expect(existsSync(join(f.p.broker, "1-1.run"))).toBe(true);
    expect(JSON.parse(readFileSync(join(f.p.broker, "1-1.res.tmp"), "utf8"))).toEqual({ code: 7, out: "固定结果\n" });
    f.request("2-2"); await vi.advanceTimersByTimeAsync(500);
    expect(f.read("2-2")).toEqual({ code: 7, out: "固定结果\n" });
    expect(f.run).toHaveBeenCalledTimes(2);
    faults.renameId = ""; await vi.advanceTimersByTimeAsync(500);
    expect(f.read("1-1")).toEqual({ code: 7, out: "固定结果\n" });
    expect(existsSync(join(f.p.broker, "1-1.run"))).toBe(false);
    expect(f.run).toHaveBeenCalledTimes(2);
  });

  it("refuses to execute when response capacity cannot be reserved and only persists the refusal after recovery", async () => {
    const f = fixture(); faults.reserve = true;
    f.request("3-3"); await vi.advanceTimersByTimeAsync(500);
    expect(f.run).not.toHaveBeenCalled();
    expect(f.read("3-3")).toMatchObject({ code: 1 });
    expect(f.read("3-3").out).toContain("动作未执行");
    faults.reserve = false; f.request("4-4"); await vi.advanceTimersByTimeAsync(500);
    expect(f.read("4-4")).toEqual({ code: 7, out: "固定结果\n" });
    expect(f.run).toHaveBeenCalledTimes(1);
  });

  it("keeps an action runner exception local and does not expose its payload", async () => {
    const f = fixture();
    f.run.mockRejectedValueOnce(new Error("private fixture payload"));
    f.request("5-5"); f.request("6-6"); await vi.advanceTimersByTimeAsync(500);
    expect(f.read("5-5").code).toBe(1);
    expect(f.read("5-5").out).toContain("结果未知");
    expect(f.read("6-6").code).toBe(7);
    expect(f.logs.join("\n")).not.toContain("private fixture payload");
    expect(f.run).toHaveBeenCalledTimes(2);
  });

  it("recovers a failed response-file creation without starting the refused action", async () => {
    const f = fixture(); faults.open = true;
    f.request("7-7"); await vi.advanceTimersByTimeAsync(500);
    expect(existsSync(join(f.p.broker, "7-7.run"))).toBe(true);
    expect(existsSync(join(f.p.broker, "7-7.res"))).toBe(false);
    expect(f.run).not.toHaveBeenCalled();
    faults.open = false; await vi.advanceTimersByTimeAsync(500);
    expect(f.read("7-7").code).toBe(1);
    expect(f.read("7-7").out).toContain("动作未执行");
    expect(f.run).not.toHaveBeenCalled();
  });
});
