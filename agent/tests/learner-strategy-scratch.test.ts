import { execFile, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough, Writable } from "node:stream";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "../../learner/lib/launcher.js";

vi.mock("node:child_process", async (original) => ({ ...await original<typeof import("node:child_process")>(), spawn: vi.fn() }));
vi.mock("../../learner/lib/engines.js", async (original) => ({
  ...await original<typeof import("../../learner/lib/engines.js")>(),
  engineBinary: () => "/fixture/codex",
  withCodexKeys: (request: object) => ({ ...request, home: "/fixture", codexHome: "/fixture/codex", keyFiles: [] }),
  codexChildEnv: () => ({}),
}));

const execute = promisify(execFile);
const dirs: string[] = [];
afterEach(() => {
  vi.mocked(spawn).mockReset();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fixture(task = "strategy-proposal") {
  const root = mkdtempSync(join(tmpdir(), "learner-strategy-scratch-")); dirs.push(root);
  const tasksDir = join(root, "tasks"); mkdirSync(tasksDir);
  writeFileSync(join(tasksDir, `${task}.md`), `---\ntools: Read, Bash\ndefault.batch: manual\n---\n工作树 {{worktree}}；批次 {{batch}}；报告 {{scratch}}/report.md。\n`);
  const inputs: string[] = [];
  vi.mocked(spawn).mockImplementation((() => {
    const index = inputs.length; inputs.push("");
    const child = Object.assign(new EventEmitter(), {
      stdout: new PassThrough(), stderr: new PassThrough(), kill: vi.fn(),
      stdin: new Writable({ write(chunk, _encoding, done) { inputs[index] += chunk.toString(); done(); } }),
    });
    queueMicrotask(() => { child.stdout.end(); child.stderr.end(); child.emit("close", 0, null); });
    return child;
  }) as typeof spawn);
  const runsDir = join(root, "learner", "runs");
  return { root, runsDir, inputs, run: (cwd: string, batch: string, extra: string[] = []) => main([
    "--engine", "codex", "--character", "silent", "--task", join(tasksDir, `${task}.md`),
    "--cwd", cwd, "--set", `batch=${batch}`, ...extra,
  ], {
    projectRoot: root, tasksDir, runsDir, env: { HOME: root, PATH: "" }, secretFiles: [],
    now: () => new Date(2026, 9, 14, 18, 43, 4), out: () => undefined, err: () => undefined,
    checkCodex: undefined, checkKeys: undefined, refreshCodexAuth: undefined,
  }), records: () => readFileSync(join(runsDir, readdirSync(runsDir).find((f) => f.endsWith(".jsonl"))!), "utf8")
    .trim().split("\n").map((line) => JSON.parse(line)),
  };
}

describe("strategy launcher scratch ownership", () => {
  // 184301 and 184301-s2 were both rejected after following a root scratch path supplied by the launcher.
  it("binds both strategy slots to separate worktree reports accepted by the unchanged no-change gate", async () => {
    const f = fixture();
    const launches = [];
    for (const suffix of ["", "-s2"]) {
      const cwd = join(f.root, ".worktrees", `codex-strategy-silent-20261014-184301${suffix}`);
      const batch = `20261014-184301${suffix}-strategy-proposal`;
      mkdirSync(cwd, { recursive: true });
      expect(await f.run(cwd, batch)).toBe(0);
      const launch = f.records().filter((row) => row.type === "learner_launch").at(-1)!;
      const scratch = join(cwd, "learner", "runs", "20261014-184304-strategy-proposal");
      expect(launch.params).toMatchObject({ scratch, batch, worktree: cwd });
      expect(launch.prompt).toContain(`报告 ${scratch}/report.md`);
      expect(f.inputs.at(-1)).toContain(launch.prompt);
      expect(existsSync(scratch)).toBe(true);
      writeFileSync(join(scratch, "report.md"), "原提案缺数据，保持 waiting。\n");
      launches.push(launch);
    }
    expect(new Set(launches.map((row) => row.params.scratch)).size).toBe(2);
    expect(readdirSync(f.runsDir)).toEqual(["20261014-184304-strategy-proposal.jsonl"]);
    const result = await execute("python3", ["-B", "-c", `
import copy, importlib.util, json, sys
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location("dispatch", "../ops/proposal_dispatch.py")
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
for launch in json.loads(sys.argv[1]):
    params=launch["params"];base="a"*40;ident="silent-proposal-fixture"
    path=str(Path(params["scratch"])/"report.md")
    report={"task":"strategy-proposal","base":base,"fixes":[],"merged":None,"report":path,
            "proposal_results":[{"id":ident,"state":"waiting","reason":"尚缺固定证据。"}]}
    batch={"task":"strategy-proposal","character":"silent","worktree":params["worktree"],"proposal_ids":[ident]}
    before=copy.deepcopy(batch)
    def git(argv, **kwargs):
        assert argv[:3]==["git","-C",params["worktree"]]
        if argv[3:]==["rev-parse","HEAD"]: return base+"\\n"
        assert argv[3:]==["status","--porcelain"]
        return ""
    with patch.object(mod.subprocess,"check_output",side_effect=git):
        proof=mod.no_change(report,batch,sys.argv[2])
        assert proof and proof["report"]==path and batch==before
        outside=Path(sys.argv[2])/"learner/runs/report.md";outside.write_text("越界反例")
        assert mod.no_change({**report,"report":str(outside)},batch,sys.argv[2]) is None
print("OK")
`, JSON.stringify(launches), f.root], { encoding: "utf8", timeout: 10_000 });
    expect(result.stdout.trim()).toBe("OK");
  });

  it("keeps non-strategy task scratch and logs at their existing location", async () => {
    const f = fixture("fix-batch");
    const cwd = join(f.root, ".worktrees", "fix"); mkdirSync(cwd, { recursive: true });
    expect(await f.run(cwd, "fixture-fix-batch")).toBe(0);
    expect(f.records()[0].params.scratch).toBe(join(f.runsDir, "20261014-184304-fix-batch"));
    expect(readdirSync(f.runsDir).sort()).toEqual(["20261014-184304-fix-batch", "20261014-184304-fix-batch.jsonl"]);
  });

  it.each(["learner", "learner/runs"])("rejects a %s symlink escaping the worktree before launch", async (path) => {
    const f = fixture();
    const cwd = join(f.root, ".worktrees", "strategy"); mkdirSync(cwd, { recursive: true });
    const outside = join(f.root, "outside"); mkdirSync(outside);
    if (path === "learner/runs") mkdirSync(join(cwd, "learner"));
    symlinkSync(outside, join(cwd, path), "dir");
    expect(await f.run(cwd, "fixture-strategy-proposal")).toBe(2);
    expect(spawn).not.toHaveBeenCalled();
    expect(readdirSync(outside)).toEqual([]);
    expect(existsSync(f.runsDir)).toBe(false);
  });
});
