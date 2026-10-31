import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { codexCommand, codexPermissions, learnerInteractiveArgs, claudeCommand, type EngineRequest } from "../../learner/lib/engines.js";
import { loadTask, parseTask } from "../../learner/lib/task.js";
import { publicWebEvent, publicWebPermission, registeredPublicWebQuestion, publicWebQuestionInstructions } from "../../learner/lib/public-web.js";
import { NativeBatch } from "../../learner/lib/herdr.js";
import { SummaryTracker } from "../../learner/lib/summary.js";
import { codexConfig } from "../src/brain/engines/codex.js";

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));
const tasks = fileURLToPath(new URL("../../learner/tasks", import.meta.url));
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "learner-web-")); roots.push(root);
  const file = join(root, "ops/codex-ops/learn.json"); mkdirSync(join(root, "ops/codex-ops"), { recursive: true });
  const spec = loadTask(join(tasks, "public-web/strategy-proposal.md"), tasks);
  const batch = { task: "strategy-proposal", character: "silent", runs: [], reason: "ops", state: "running", pid: process.pid, worktree: root,
    public_web: { schema: "public-web-research-v1", template_sha256: createHash("sha256").update(readFileSync(spec.path)).digest("hex") },
    knowledge_runtime: { enabled: true, directory: join(root, "data/runtime") } };
  const env = { LEARNER_BATCH_ID: "20261025-220000-strategy-proposal", LEARNER_STATE_FILE: file, STS2_KNOWLEDGE_RUNTIME: batch.knowledge_runtime.directory };
  const save = () => writeFileSync(file, JSON.stringify({ batches: { [env.LEARNER_BATCH_ID]: batch } })); save();
  return { root, spec, batch, env, save };
}
const request = (root = "/fixture"): EngineRequest => ({ engine: "codex", cwd: root, projectRoot: root, tools: ["Read", "Grep", "Glob", "Bash", "Edit", "Write"] });

describe("explicit hosted public research", () => {
  it("keeps ordinary/fixed/code/external tasks offline and rejects unrecognized declarations", () => {
    for (const name of ["fix-batch", "postmortem", "experience-update", "strategy-proposal", "strategy-external", "smoke"]) {
      const task = loadTask(name, tasks);
      expect(task.publicWeb).toBeUndefined();
      expect(publicWebPermission(task, "codex", "silent", "/fixture", "/fixture", {})).toBeUndefined();
    }
    expect(() => parseTask("---\ntools: Read\npublic_web: true\n---\nfixed", "x", "x.md")).toThrow("只支持 sts2");
    expect(codexCommand(request(), "fixed").args).toContain('web_search="disabled"');
  });
  it("binds declaration, original live owner, task SHA, character and runtime before enabling web", () => {
    const f = fixture();
    const allow = () => publicWebPermission(f.spec, "codex", "silent", f.root, f.root, f.env);
    expect(allow()).toBe("sts2");
    expect(() => publicWebPermission(f.spec, "claude", "silent", f.root, f.root, f.env)).toThrow("其他引擎未接入");
    expect(() => publicWebPermission(f.spec, "codex", "ironclad", f.root, f.root, f.env)).toThrow();
    for (const mutation of [
      () => { f.batch.public_web.template_sha256 = "a".repeat(64); },
      () => { f.batch.reason = "tick"; },
      () => { f.batch.task = "fix-batch"; },
      () => { f.batch.state = "done"; },
      () => { f.batch.knowledge_runtime.enabled = false; },
    ]) {
      const before = structuredClone(f.batch); mutation(); f.save(); expect(allow).toThrow(); Object.assign(f.batch, before); f.save();
    }
    for (const key of ["external_source", "backfill_source", "proposal_ids", "research_request", "implementation_request"]) {
      const batch = f.batch as Record<string, unknown>; batch[key] = ["fixed"];
      f.save(); expect(allow).toThrow(); delete batch[key]; f.save();
    }
    expect(() => allow()).not.toThrow();
  });
  it("binds an explicit question's original bytes/intent and refuses missing input or bad SHA without changing the old task", () => {
    const f = fixture(), original = structuredClone(f.batch.public_web), batch = f.batch as Record<string, any>;
    const document = { schema: "public-web-question-v1", id: "fixture-question", task: "strategy-proposal", character: "silent",
      question: "固定公开研究问题", source_intent: "search-and-open-public-sts2", target_game_version: "fixture-v1", parent: "fixture-cache" };
    const content = JSON.stringify(document), binding = { path: "learner/requests/public-web/fixed.json", content,
      sha256: createHash("sha256").update(content).digest("hex") };
    batch.public_web.question = binding; batch.key = `public-web-question:${document.id}:${binding.sha256}`; f.save();
    const allow = () => publicWebPermission(f.spec, "codex", "silent", f.root, f.root, f.env);
    expect(allow()).toBe("sts2"); expect(batch.public_web.template_sha256).toBe(original.template_sha256);
    const question = registeredPublicWebQuestion(f.env)!;
    expect(question.content).toBe(content); expect(question.document).toEqual(document);
    expect(publicWebQuestionInstructions(question)).toContain(binding.sha256);
    expect(publicWebQuestionInstructions(question)).toContain("不能仅总结缓存");
    for (const changed of [undefined, null, { ...binding, sha256: "a".repeat(64) }, { ...binding, path: "../private.json" }]) {
      if (changed === undefined) delete batch.public_web.question; else batch.public_web.question = changed;
      f.save(); expect(allow).toThrow();
    }
    for (const changed of [{ task: "fix-batch" }, { character: "ironclad" }, { source_intent: "cached-only" }]) {
      const raw = JSON.stringify({ ...document, ...changed });
      batch.public_web.question = { ...binding, content: raw, sha256: createHash("sha256").update(raw).digest("hex") };
      batch.key = `public-web-question:${document.id}:${batch.public_web.question.sha256}`; f.save(); expect(allow).toThrow();
    }
    batch.public_web = original; delete batch.key; f.save();
    expect(allow()).toBe("sts2"); expect(registeredPublicWebQuestion(f.env)).toBeUndefined();
    expect(publicWebQuestionInstructions(undefined)).toBe("");
  });
  it("uses the same explicit live setting for exec, TUI and resume without widening filesystem/network permissions", () => {
    const req = { ...request(), publicWeb: "sts2" as const };
    expect(codexPermissions(req)).toEqual(codexPermissions(request()));
    for (const args of [codexCommand(req, "fixed").args, learnerInteractiveArgs(req),
      codexCommand({ ...req, resumeThread: "019a1000-1234-7123-8123-123456789abc" }, "fixed").args]) {
      expect(args).toContain('web_search="live"');
      expect(args.join(" ")).not.toMatch(/network_access=true|danger-full-access/);
      expect(args).toContain("browser_use"); expect(args[args.indexOf("browser_use") - 1]).toBe("--disable");
    }
    const prompt = codexCommand(req, "fixed").stdin;
    expect(prompt).toContain("shell不联网"); expect(prompt).toContain("Codex 内建 web_search");
    expect(() => claudeCommand({ ...req, engine: "claude" }, "fixed")).toThrow("未接入");
    expect(codexConfig({ effort: "high", systemFile: "/fixture/system", catalogFile: "/fixture/catalog", stateDir: "/fixture/state", summary: "auto", serviceTier: null }).join(" ")).toContain('web_search="disabled"');
  });
  it("records actual completed/failed/empty search evidence separately from requested capability", () => {
    const native = new NativeBatch("marker");
    native.feed({ type: "event_msg", payload: { type: "task_started", turn_id: "one" } });
    native.feed({ type: "event_msg", payload: { type: "user_message", message: "marker" } });
    const tracker = new SummaryTracker("codex");
    for (const status of ["completed", "failed"]) {
      const event = { type: "response_item", payload: { type: "web_search_call", id: status, status, action: { type: "search", query: "fixed-empty-query" } } };
      const saved = publicWebEvent(event)!;
      expect(saved.event).toEqual(event);
      expect(saved.sha256).toBe(createHash("sha256").update(JSON.stringify(event)).digest("hex"));
      native.feed(event); tracker.feed(JSON.stringify(event));
    }
    expect(native.progress).toBe(2); expect(tracker.summary.toolCalls.web_search).toBe(1);
    expect(publicWebEvent({ type: "learner_launch", public_web: { requested: "live" } })).toBeUndefined();
    expect(publicWebEvent({ type: "item.completed", item: { type: "web_search", id: "exec", status: "completed", query: "fixed" } })).toBeDefined();
    expect(publicWebEvent({ type: "item.completed", item: { type: "command_execution" } })).toBeUndefined();
  });
});
