/** A read-only retained-session observer; every Herdr operation is fixed and injected. */
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { watchReconciliationMain } from "../../learner/lib/tui-reconciliation.js";
import type { HerdrResult } from "../../ops/codex/herdr.js";

const input = JSON.parse(readFileSync(new URL("./fixtures/learner-midnight.json", import.meta.url), "utf8"));
const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function fixture(complete = true) {
  const root = mkdtempSync(join(tmpdir(), "tui-observer-")); roots.push(root);
  const directory = join(root, "ops/codex-ops"), batch = "20261023-234301";
  mkdirSync(join(directory, "learner"), { recursive: true });
  const receipt = structuredClone(input.receipt);
  receipt.pid = 123; receipt.birth = "original-birth"; receipt.result.code = 75;
  receipt.rollout = join(root, "native.jsonl"); receipt.result.rollout = receipt.rollout;
  receipt.identity = { pane_id: receipt.pane, tab_id: "w1:t2", terminal_id: "terminal", workspace_id: "w1" };
  delete receipt.native_environment_updates; delete receipt.native_environment_version;
  const file = join(directory, "learner", `${receipt.label}.tui.json`), state = join(directory, "learn.json");
  const row = { state: "awaiting_review", pane: receipt.pane, pid: 456, worktree: receipt.cwd, task: "postmortem", key: "original-key" };
  writeFileSync(state, JSON.stringify({ batches: { [batch]: row } }));
  writeFileSync(file, JSON.stringify(receipt));
  writeFileSync(receipt.rollout, (complete ? input.rows : input.rows.slice(0, -1)).map((r) => JSON.stringify(r) + "\n").join(""));
  const output = join(root, "retained.observation.json"), calls: string[][] = [];
  let clock = 0;
  const ok = (result: Record<string, unknown>): HerdrResult => ({ ok: true, code: 0, result, stdout: "", stderr: "" });
  const deps = {
    now: () => clock, pause: async (ms: number) => { clock += ms; }, birth: () => receipt.birth,
    out: () => {}, err: () => {},
    h: async (args: string[]): Promise<HerdrResult> => {
      calls.push(args);
      if (args[0] === "pane" && args[1] === "get") return ok({ pane: { ...receipt.identity } });
      if (args[0] === "agent" && args[1] === "get") return ok({ agent: {
        agent: "codex", name: receipt.agent_name, pane_id: receipt.pane, foreground_cwd: receipt.cwd, agent_status: complete ? "idle" : "working",
      } });
      if (args[0] === "pane" && args[1] === "process-info") return ok({ process_info: { foreground_process_group_id: receipt.pid } });
      throw new Error("a mutation was attempted");
    },
  };
  const args = ["--receipt", file, "--native", receipt.rollout, "--watch-state", state, "--batch", batch, "--output", output, "--timeout-seconds", "1"];
  return { receipt, file, state, row, batch, output, args, deps, calls };
}

describe("retained original TUI observation", () => {
  it("observes the original completion and metadata without changing its failure or granting lifecycle authority", async () => {
    const f = fixture(), receipt = readFileSync(f.file), state = readFileSync(f.state);
    expect(await watchReconciliationMain(f.args, f.deps)).toBe(0);
    const report = JSON.parse(readFileSync(f.output, "utf8"));
    expect(report).toMatchObject({ state: "completed-observed", pane_pid_registration_revalidated: true, native_snapshot_current: true,
      original_receipt_modified: false, registration_modified: false, prompt_send_authorized: false, finish_authorized: false, retirement_authorized: false });
    expect(report.audit.observed.native_environment_updates).toEqual([input.proof]);
    expect(report.audit.original_result_code).toBe(75);
    expect(readFileSync(f.file)).toEqual(receipt); expect(readFileSync(f.state)).toEqual(state);
    expect(statSync(f.output).mode & 0o777).toBe(0o600);
    expect(f.calls).toEqual([["pane", "get", f.receipt.pane], ["agent", "get", f.receipt.pane], ["pane", "process-info", "--pane", f.receipt.pane]]);
  });
  it("keeps observing the same open turn until its bounded deadline without prompts or state changes", async () => {
    const f = fixture(false), receipt = readFileSync(f.file), state = readFileSync(f.state);
    expect(await watchReconciliationMain(f.args, f.deps)).toBe(75);
    expect(JSON.parse(readFileSync(f.output, "utf8")).state).toBe("timeout");
    expect(readFileSync(f.file)).toEqual(receipt); expect(readFileSync(f.state)).toEqual(state);
    expect(f.calls.every((args) => ["get", "process-info"].includes(args[1]!))).toBe(true);
  });
  it.each(["pane", "agent", "foreground", "birth", "registration", "receipt", "transport"])("holds when original %s identity is uncertain", async (kind) => {
    const f = fixture(), h = f.deps.h;
    if (kind === "birth") f.deps.birth = () => "reused-birth";
    f.deps.h = async (args) => {
      const response = await h(args);
      if (kind === "pane" && args[0] === "pane" && args[1] === "get") (response.result!.pane as any).terminal_id = "foreign";
      if (kind === "transport" && args[0] === "pane" && args[1] === "get") response.ok = false;
      if (kind === "agent" && args[0] === "agent") (response.result!.agent as any).name = "human";
      if (kind === "foreground" && args[1] === "process-info") (response.result!.process_info as any).foreground_process_group_id = 999;
      if (kind === "registration") writeFileSync(f.state, JSON.stringify({ batches: { [f.batch]: { ...f.row, pid: 999 } } }));
      if (kind === "receipt") writeFileSync(f.file, JSON.stringify({ ...f.receipt, birth: "changed" }));
      return response;
    };
    expect(await watchReconciliationMain(f.args, f.deps)).toBe(75);
    expect(JSON.parse(readFileSync(f.output, "utf8"))).toMatchObject({ state: "identity-or-evidence-unverified", finish_authorized: false });
  });
  it("rejects a new human turn arriving during the final identity reads", async () => {
    const f = fixture(), h = f.deps.h; let changed = false;
    f.deps.h = async (args) => {
      if (!changed) { changed = true; appendFileSync(f.receipt.rollout, JSON.stringify({ type: "event_msg", payload: { type: "task_started", turn_id: "human" } }) + "\n"); }
      return h(args);
    };
    expect(await watchReconciliationMain(f.args, f.deps)).toBe(75);
    expect(JSON.parse(readFileSync(f.output, "utf8")).state).toBe("blocked");
  });
  it("requires a new observation artifact and never overwrites an existing one", async () => {
    const f = fixture(); writeFileSync(f.output, "preserved\n");
    expect(await watchReconciliationMain(f.args, f.deps)).toBe(75);
    expect(readFileSync(f.output, "utf8")).toBe("preserved\n"); expect(f.calls).toEqual([]);
  });
});
