import { createHash } from "node:crypto";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { KnowledgeStore } from "../src/knowledge/runtime/store.js";
const transport = vi.hoisted(() => vi.fn());
vi.mock("../../learner/lib/herdr.js", async importOriginal => ({ ...await importOriginal<typeof import("../../learner/lib/herdr.js")>(), runLearnerTui: transport }));
import { main } from "../../learner/lib/launcher.js";

const roots: string[] = [];
afterEach(() => { transport.mockReset(); roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })); });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "web-launcher-")); roots.push(root);
  const dir = join(root, "ops/codex-ops"); mkdirSync(dir, { recursive: true });
  const tasks = join(root, "tasks"); mkdirSync(tasks);
  const task = join(tasks, "strategy-proposal.md");
  const raw = "---\ntools: Read, Grep, Glob, Bash, Edit, Write\npublic_web: sts2\ndefault.merge: no\n---\n固定研究 {{batch}} merge={{merge}}\n";
  writeFileSync(task, raw);
  const runtime = join(root, "data/runtime"), store = new KnowledgeStore(runtime);
  store.submit({ schema: "knowledge-candidate-v1", id: "seed", base: null, character: "silent", source: "fixture", files: {
    "characters/silent/strategy-entries.json": JSON.stringify({ schema: "brain-strategies-v1", character: "silent", entries: [] }) } });
  store.validate("seed"); const version = store.publish("seed"); store.close();
  const bid = "20261025-220000-strategy-proposal", state = join(dir, "learn.json"), receipt = join(dir, "fixed.tui.json");
  const batch: Record<string, unknown> = { task: "strategy-proposal", character: "silent", reason: "ops", runs: [], state: "running", pid: process.pid, worktree: root,
    knowledge_runtime: { enabled: true, directory: runtime }, public_web: { schema: "public-web-research-v1", template_sha256: createHash("sha256").update(raw).digest("hex") } };
  const save = () => writeFileSync(state, JSON.stringify({ batches: { [bid]: batch } })); save();
  const env = { HOME: root, LEARNER_CODEX_HOME: join(root, "codex-home"), LEARNER_CODEX_BIN: "/bin/true", STS2_KNOWLEDGE_RUNTIME: runtime,
    LEARNER_HERDR_PANE: "w1:p2", LEARNER_HERDR_LABEL: `learner-${bid}`, LEARNER_TUI_RECEIPT: receipt, LEARNER_BATCH_ID: bid, LEARNER_STATE_FILE: state };
  const out: string[] = [], err: string[] = [];
  const deps = { projectRoot: root, tasksDir: tasks, runsDir: join(root, "runs"), secretFiles: [], env, refreshCodexAuth: undefined,
    checkCodex: vi.fn(async () => ({ ok: true as const, version: "fixture" })), checkKeys: vi.fn(async () => ({ ok: true as const, checked: 0 })),
    out: (s: string) => out.push(s), err: (s: string) => err.push(s) };
  const run = (engine = "codex") => main(["--engine", engine, "--task", "strategy-proposal", "--character", "silent", "--cwd", root, "--set", `batch=${bid}`], deps);
  return { root, batch, save, deps, run, version, out, err };
}

it("runs the original registered TUI chain, preserves runtime injection and records native web calls separately from requested mode", async () => {
  const f = fixture();
  transport.mockImplementation(async o => {
    expect(o.request.publicWeb).toBe("sts2"); expect(o.lease.current()).toBe(true);
    expect(o.prompt).toContain("Codex 内建 web_search"); expect(o.prompt).toContain(f.version);
    expect(o.prompt).toContain("knowledge_candidate"); expect(o.prompt).toContain("classification-draft");
    o.log({ type: "response_item", payload: { type: "web_search_call", id: "fixed-open", status: "completed", action: { type: "open_page", url: "https://example.org/fixed" } } });
    const result = { code: 0, reason: "native-task-complete", message: "fixed research report", session: "019a1000-1234-7123-8123-123456789abc", stopped: true };
    writeFileSync(o.receipt, JSON.stringify({ state: "session-ended", result })); return result;
  });
  expect(await f.run(), f.err.join("")).toBe(0);
  const file = readdirSync(join(f.root, "runs")).find(n => n.endsWith(".jsonl"))!;
  const rows = readFileSync(join(f.root, "runs", file), "utf8").trim().split("\n").map(s => JSON.parse(s));
  expect(rows[0]).toMatchObject({ transport: "herdr-interactive", public_web: { requested: "live", observed: null, shell_network: false } });
  expect(rows[0].command).toContain('web_search="live"');
  const journal = readFileSync(rows[0].public_web.native_events, "utf8").trim().split("\n").map(s => JSON.parse(s));
  expect(journal).toHaveLength(1); expect(journal[0].event.payload.id).toBe("fixed-open");
  expect(rows.at(-1).summary.toolCalls.web_search).toBe(1);
  expect(f.deps.checkKeys).toHaveBeenCalledOnce(); expect(transport).toHaveBeenCalledOnce();
});

it("refuses unauthorized ordinary registrations and unsupported engines before exposing any tools", async () => {
  const f = fixture(); delete f.batch.public_web; f.save();
  expect(await f.run()).toBe(2); expect(transport).not.toHaveBeenCalled();
  expect(await f.run("claude")).toBe(2); expect(transport).not.toHaveBeenCalled();
  expect(f.deps.checkKeys).not.toHaveBeenCalled();
});

it.each([true, false])("persists exec search projections and only harvests page calls after the exact original native prompt (match=%s)", async match => {
  const f = fixture();
  delete (f.deps.env as NodeJS.ProcessEnv).LEARNER_HERDR_PANE;
  const binary = join(f.root, "fake-codex.cjs");
  writeFileSync(binary, `#!${process.execPath}
const fs = require('node:fs'), path = require('node:path');
const prompt = fs.readFileSync(0,'utf8'), id = '019a1000-1234-7123-8123-123456789abc';
const dir = path.join(process.env.CODEX_HOME,'sessions','2026','10','25'); fs.mkdirSync(dir,{recursive:true});
const rows = [
 {type:'session_meta',payload:{id,cwd:process.cwd()}},
 {type:'response_item',payload:{type:'message',role:'user',content:[{type:'input_text',text:${match ? "prompt" : "'unrelated old prompt'"}}]}},
 {type:'response_item',payload:{type:'web_search_call',id:'fixed-open',status:'completed',action:{type:'open_page',url:'https://example.org/fixed'}}}
];
fs.writeFileSync(path.join(dir,'rollout-'+id+'.jsonl'),rows.map(x=>JSON.stringify(x)).join('\\n')+'\\n');
for (const row of [ {type:'thread.started',thread_id:id}, {type:'item.completed',item:{type:'web_search',id:'exec-search',query:'fixed'}},
 {type:'item.completed',item:{type:'agent_message',text:'fixed result'}}, {type:'turn.completed',usage:{input_tokens:1,output_tokens:1}} ]) console.log(JSON.stringify(row));
`);
  chmodSync(binary, 0o700); f.deps.env.LEARNER_CODEX_BIN = binary;
  expect(await f.run(), f.err.join("")).toBe(0);
  expect(transport).not.toHaveBeenCalled();
  const file = readdirSync(join(f.root, "runs")).find(n => n.endsWith(".jsonl"))!;
  const rows = readFileSync(join(f.root, "runs", file), "utf8").trim().split("\n").map(s => JSON.parse(s));
  expect(rows[0].transport).toBe("stdio"); expect(rows[0].command).toContain('web_search="live"');
  const journal = readFileSync(rows[0].public_web.native_events, "utf8").trim().split("\n").map(s => JSON.parse(s));
  expect(journal.some(e => e.event.item?.id === "exec-search")).toBe(true);
  expect(journal.filter(e => e.event.payload?.id === "fixed-open")).toHaveLength(match ? 1 : 0);
});
