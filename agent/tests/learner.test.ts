/**
 * Offline learner launcher (src/learner, learner/run.ts): task placeholders, missing/unused parameters, the
 * claude and codex command lines, the child environment without keys, --dry-run, and whole runs against fake
 * claude/codex binaries written into a temp directory. No test calls a real LLM.
 */

import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { childEnv, claudeCommand, claudePermissions, codexCommand, engineBinary, shellQuote, strippedEnvNames, type EngineRequest } from "../src/learner/engines.js";
import { collectSecrets, main, parseArgs, redactSecrets, type LauncherDeps } from "../src/learner/launcher.js";
import { SummaryTracker } from "../src/learner/summary.js";
import { LearnerUsageError, fillTemplate, loadTask, parseSets, parseTask, placeholdersOf, renderTask } from "../src/learner/task.js";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TASKS = join(REPO, "..", "learner", "tasks");
const ROOT = "/home/dw/Projects/sts2-jev";

const BUILTINS = { cwd: "/p/wt", worktree: "/p/wt", project_root: "/p", logs_dir: "/p/jev-sts2/logs", scratch: "/p/wt/learner/runs/x", task: "t" };

const TASK = `---
title: 测试
tools: Read, Bash
default.base_branch: v3
default.code_dir: {{project_root}}/jev-sts2-v3
---
复盘 {{runs}}，在 {{worktree}} 里，基线 {{base_branch}}，代码 {{code_dir}}，再说一次 {{runs}}。
`;

describe("task placeholders", () => {
  it("lists placeholders once, in order of first use", () => {
    expect(placeholdersOf("a {{runs}} b {{ worktree }} c {{runs}}")).toEqual(["runs", "worktree"]);
  });

  it("fills every placeholder, built-ins and defaults included; a default may use a built-in", () => {
    const spec = parseTask(TASK, "t", "t.md");
    const { prompt, values } = renderTask(spec, { runs: "A,B,C" }, BUILTINS);
    expect(prompt).toBe("复盘 A,B,C，在 /p/wt 里，基线 v3，代码 /p/jev-sts2-v3，再说一次 A,B,C。\n");
    expect(values).toEqual({ runs: "A,B,C", worktree: "/p/wt", base_branch: "v3", code_dir: "/p/jev-sts2-v3", project_root: "/p" });
  });

  it("--set overrides a default and the worktree built-in", () => {
    const spec = parseTask(TASK, "t", "t.md");
    const { prompt } = renderTask(spec, { runs: "A", base_branch: "v4", worktree: "/p/other" }, BUILTINS);
    expect(prompt).toContain("在 /p/other 里，基线 v4");
  });

  it("a missing parameter is an error naming every missing one", () => {
    expect(() => fillTemplate("{{a}} {{b}} {{c}}", { b: "x" })).toThrow(/缺少参数：a, c/);
    const spec = parseTask(TASK, "t", "t.md");
    expect(() => renderTask(spec, {}, BUILTINS)).toThrow(LearnerUsageError);
    expect(() => renderTask(spec, {}, BUILTINS)).toThrow(/runs/);
    // An empty value counts as missing.
    expect(() => renderTask(spec, { runs: "" }, BUILTINS)).toThrow(/缺少参数：runs/);
  });

  it("a --set no placeholder uses, or of a fixed built-in, is an error", () => {
    const spec = parseTask(TASK, "t", "t.md");
    expect(() => renderTask(spec, { runs: "A", run: "B" }, BUILTINS)).toThrow(/用不到这些参数：run/);
    expect(() => renderTask(spec, { runs: "A", cwd: "/x" }, BUILTINS)).toThrow(/--cwd/);
    expect(() => renderTask(spec, { runs: "A", project_root: "/x" }, BUILTINS)).toThrow(/启动器决定/);
  });

  it("parses --set name=value keeping '=' and ',' in the value; rejects bad pairs", () => {
    expect(parseSets(["runs=A,B", "q=x=y"])).toEqual({ runs: "A,B", q: "x=y" });
    expect(() => parseSets(["runs"])).toThrow(LearnerUsageError);
    expect(() => parseSets(["Runs=A"])).toThrow(LearnerUsageError);
    expect(() => parseSets(["runs=A", "runs=B"])).toThrow(/两次/);
  });

  it("rejects bad front matter", () => {
    expect(() => parseTask("no front matter", "t", "t.md")).toThrow(/front matter/);
    expect(() => parseTask("---\ntitle: x\n---\nbody", "t", "t.md")).toThrow(/tools/);
    expect(() => parseTask("---\ntools: Read, WebFetch\n---\nbody", "t", "t.md")).toThrow(/WebFetch/);
    expect(() => parseTask("---\ntools: Read\ncolour: red\n---\nbody", "t", "t.md")).toThrow(/colour/);
    expect(() => parseTask("---\ntools: Read\ndefault.cwd: /x\n---\nbody", "t", "t.md")).toThrow(/内置参数/);
    expect(() => parseTask("---\ntools: Read\ntimeout_min: soon\n---\nbody", "t", "t.md")).toThrow(/正整数/);
  });
});

describe("the task files in learner/tasks", () => {
  const cases: [string, Record<string, string>, string[]][] = [
    ["postmortem", { runs: "ULQPBK1211FG,JJ65CGH92D9A,DHGT6Z3Q7VAP" }, ["Read", "Grep", "Glob", "Bash"]],
    ["experience-update", { runs: "A,B,C,D,E" }, ["Read", "Grep", "Glob", "Bash", "Edit", "Write"]],
    ["fix-batch", {}, ["Read", "Grep", "Glob", "Bash", "Edit", "Write"]],
    ["smoke", { run: "ULQPBK1211FG" }, ["Read", "Grep", "Glob"]],
  ];
  for (const [name, sets, tools] of cases) {
    it(`${name}: parses, renders with no placeholder left, ends with the safety rules and the report format`, () => {
      const spec = loadTask(name, TASKS);
      expect(spec.tools).toEqual(tools);
      const { prompt } = renderTask(spec, sets, BUILTINS);
      expect(prompt).not.toMatch(/\{\{/);
      expect(prompt).toMatch(/## (\d+\. )?安全/);
      expect(prompt).toMatch(/## (\d+\. )?回报/);
      expect(prompt.indexOf("安全")).toBeLessThan(prompt.lastIndexOf("回报"));
      for (const value of Object.values(sets)) expect(prompt).toContain(value);
    });
  }

  it("postmortem and experience-update need runs; the write tasks say no drinking rules / no pushing", () => {
    expect(() => renderTask(loadTask("postmortem", TASKS), {}, BUILTINS)).toThrow(/缺少参数：runs/);
    expect(() => renderTask(loadTask("experience-update", TASKS), {}, BUILTINS)).toThrow(/缺少参数：runs/);
    const experience = renderTask(loadTask("experience-update", TASKS), { runs: "A" }, BUILTINS).prompt;
    expect(experience).toContain("不许写喝药规则");
    expect(experience).toContain("机制推理");
    expect(experience).toMatch(/推理[\s\S]*证据[\s\S]*典型案例/);
    const fix = renderTask(loadTask("fix-batch", TASKS), {}, BUILTINS).prompt;
    expect(fix).toContain("git merge --no-edit v3");
    expect(fix).toContain("去掉修复时失败");
    expect(fix).toContain("/p/notes/fix-queue.md");
    for (const prompt of [experience, fix]) expect(prompt).toContain("不推送");
  });
});

const request = (over: Partial<EngineRequest> = {}): EngineRequest => ({ engine: "claude", cwd: `${ROOT}/jev-sts2-step`, projectRoot: ROOT, tools: ["Read", "Grep", "Glob", "Bash", "Edit", "Write"], ...over });
const MCP = { command: "/usr/bin/node", args: ["/r/node_modules/.bin/tsx", "/r/src/tools/mcp-server.ts", "--ascension", "9"], env: { KNOWLEDGE_LESSONS_FILE: "/p/notes/lessons.md" } };

/** The values given to a variadic flag (up to the next --flag). */
function flagValues(args: string[], flag: string): string[] {
  const at = args.indexOf(flag);
  if (at < 0) return [];
  const out: string[] = [];
  for (let i = at + 1; i < args.length && !args[i]!.startsWith("--"); i += 1) out.push(args[i]!);
  return out;
}

describe("claude command line", () => {
  it("headless stream-json on the subscription login, prompt on stdin, permissions confined to the project root", () => {
    const prompt = "写复盘 {{none}} 这是提示";
    const cmd = claudeCommand(request({ model: "opus", maxTurns: 50 }), prompt, "/bin/claude");
    expect(cmd.command).toBe("/bin/claude");
    expect(cmd.stdin).toBe(prompt);
    expect(cmd.args).not.toContain(prompt);
    expect(cmd.args[0]).toBe("-p");
    expect(cmd.args).not.toContain("--bare");
    expect(cmd.args).not.toContain("--dangerously-skip-permissions");
    expect(flagValues(cmd.args, "--output-format")).toEqual(["stream-json"]);
    for (const flag of ["--verbose", "--restricted", "--strict-mcp-config"]) expect(cmd.args).toContain(flag);
    expect(flagValues(cmd.args, "--permission-mode")).toEqual(["dontAsk"]);
    expect(flagValues(cmd.args, "--permission-prompts")).toEqual(["none"]);
    expect(flagValues(cmd.args, "--tools")).toEqual(["Read,Grep,Glob,Bash,Edit,Write"]);
    expect(flagValues(cmd.args, "--allowedTools")).toEqual([`Read(/${ROOT}/**)`, "Grep", "Glob", `Edit(/${ROOT}/**)`, "Bash"]);
    const denied = flagValues(cmd.args, "--disallowedTools");
    for (const rule of ["Read(~/.jev_api_keys)", "Read(~/.deepseek_api_key)", "Read(//**/.env)", "Edit(//**/.env)", "Read(//**/sts2.dll)", "Read(//**/*.pck)", "Bash(git push:*)", "Bash(pkill:*)", "Bash(npm install:*)"]) {
      expect(denied).toContain(rule);
    }
    expect(flagValues(cmd.args, "--add-dir")).toEqual([ROOT]);
    expect(flagValues(cmd.args, "--model")).toEqual(["opus"]);
    expect(flagValues(cmd.args, "--max-turns")).toEqual(["50"]);
    expect(cmd.args).not.toContain("--mcp-config");
  });

  it("a read-only task gets no Bash or Edit permission and no Bash deny list", () => {
    const permissions = claudePermissions(["Read", "Grep", "Glob"], ROOT, false);
    expect(permissions.allowed).toEqual([`Read(/${ROOT}/**)`, "Grep", "Glob"]);
    expect(permissions.disallowed.some((rule) => rule.startsWith("Bash") || rule.startsWith("Edit"))).toBe(false);
    const cmd = claudeCommand(request({ tools: ["Read", "Grep", "Glob"] }), "x");
    expect(flagValues(cmd.args, "--tools")).toEqual(["Read,Grep,Glob"]);
    expect(cmd.args).not.toContain("--model");
    expect(cmd.args).not.toContain("--max-turns");
  });

  it("--with-tools: only our stdio server, allowed as mcp__gkb", () => {
    const cmd = claudeCommand(request({ mcp: MCP }), "x");
    const config = JSON.parse(flagValues(cmd.args, "--mcp-config")[0]!) as { mcpServers: Record<string, unknown> };
    expect(config).toEqual({ mcpServers: { gkb: { type: "stdio", command: MCP.command, args: MCP.args, env: MCP.env } } });
    expect(cmd.args).toContain("--strict-mcp-config");
    expect(flagValues(cmd.args, "--allowedTools")).toContain("mcp__gkb");
  });
});

describe("codex command line", () => {
  it("codex exec --json in the worktree, workspace-write plus the project root, approvals never, prompt on stdin", () => {
    const cmd = codexCommand(request({ engine: "codex", model: "gpt-5-codex" }), "提示", "/bin/codex");
    expect(cmd.command).toBe("/bin/codex");
    expect(cmd.stdin).toBe("提示");
    expect(cmd.args).toEqual(["exec", "--json", "--cd", `${ROOT}/jev-sts2-step`, "--sandbox", "workspace-write", "--add-dir", ROOT, "-c", 'approval_policy="never"', "--model", "gpt-5-codex", "-"]);
  });

  it("a read-only task runs in the read-only sandbox without --add-dir; no model flag unless asked", () => {
    const cmd = codexCommand(request({ engine: "codex", tools: ["Read", "Grep", "Glob"], cwd: ROOT }), "x");
    expect(cmd.args).toEqual(["exec", "--json", "--cd", ROOT, "--sandbox", "read-only", "-c", 'approval_policy="never"', "-"]);
  });

  it("--with-tools: the stdio server as -c mcp_servers.gkb.* TOML overrides", () => {
    const cmd = codexCommand(request({ engine: "codex", mcp: MCP, cwd: ROOT }), "x");
    const overrides = cmd.args.filter((_arg, i) => cmd.args[i - 1] === "-c");
    expect(overrides).toEqual([
      'approval_policy="never"',
      'mcp_servers.gkb.command="/usr/bin/node"',
      'mcp_servers.gkb.args=["/r/node_modules/.bin/tsx", "/r/src/tools/mcp-server.ts", "--ascension", "9"]',
      'mcp_servers.gkb.env={ "KNOWLEDGE_LESSONS_FILE" = "/p/notes/lessons.md" }',
    ]);
    expect(cmd.args[cmd.args.length - 1]).toBe("-");
  });
});

describe("the child environment carries none of our keys", () => {
  const parent: NodeJS.ProcessEnv = {
    PATH: "/usr/bin",
    HOME: "/home/dw",
    LANG: "C.UTF-8",
    DEEPSEEK_API_KEY: "sk-deepseek",
    DEEPSEEK_MODEL: "deepseek-chat",
    TYPESAFE_API_KEY: "ts-key",
    JEV_MODEL: "jev-latest",
    JEV_API_KEYS_FILE: "/home/dw/.jev_api_keys",
    ANTHROPIC_API_KEY: "sk-ant",
    ANTHROPIC_AUTH_TOKEN: "tok",
    OPENROUTER_API_KEY: "or",
    OPENAI_API_KEY: "oa",
    GITHUB_TOKEN: "gh",
    CLAUDECODE: "1",
    CLAUDE_CODE_SESSION_ID: "abc",
    CLAUDE_CODE_MESSAGING_TOKEN: "m",
    CLAUDE_CODE_OAUTH_TOKEN: "subscription",
    TARGET_ASCENSION: "9",
  };
  const keys = ["DEEPSEEK_API_KEY", "DEEPSEEK_MODEL", "TYPESAFE_API_KEY", "JEV_MODEL", "JEV_API_KEYS_FILE", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "OPENROUTER_API_KEY", "OPENAI_API_KEY", "GITHUB_TOKEN", "CLAUDECODE", "CLAUDE_CODE_SESSION_ID", "CLAUDE_CODE_MESSAGING_TOKEN"];

  it("claude: keys and the parent session's variables removed; the subscription token and plain settings kept", () => {
    const env = childEnv(parent, "claude");
    for (const name of keys) expect(env[name], name).toBeUndefined();
    expect(env["PATH"]).toBe("/usr/bin");
    expect(env["HOME"]).toBe("/home/dw");
    expect(env["TARGET_ASCENSION"]).toBe("9");
    expect(env["CLAUDE_CODE_OAUTH_TOKEN"]).toBe("subscription");
    expect(env["CLAUDE_CODE_DISABLE_AUTO_MEMORY"]).toBe("1");
    expect(strippedEnvNames(parent, "claude")).toEqual([...keys].sort());
    expect(parent["DEEPSEEK_API_KEY"]).toBe("sk-deepseek"); // the parent's env is not touched
  });

  it("codex: the same, and no Claude token either", () => {
    const env = childEnv(parent, "codex");
    for (const name of [...keys, "CLAUDE_CODE_OAUTH_TOKEN"]) expect(env[name], name).toBeUndefined();
    expect(env["CLAUDE_CODE_DISABLE_AUTO_MEMORY"]).toBeUndefined();
    expect(env["PATH"]).toBe("/usr/bin");
  });
});

describe("arguments", () => {
  it("parses the documented command line", () => {
    const options = parseArgs(["--engine", "claude", "--task", "postmortem", "--set", "runs=A,B,C", "--cwd", ROOT, "--model", "opus", "--dry-run", "--max-turns", "30", "--timeout-min", "45"]);
    expect(options).toMatchObject({ engine: "claude", task: "postmortem", sets: ["runs=A,B,C"], cwd: ROOT, model: "opus", dryRun: true, maxTurns: 30, timeoutMin: 45, withTools: false });
  });

  it("rejects unknown engines and flags, missing values and required flags", () => {
    expect(() => parseArgs(["--engine", "dsh", "--task", "x", "--cwd", "."])).toThrow(/claude \/ codex/);
    expect(() => parseArgs(["--engine", "claude", "--task", "x", "--cwd", ".", "--bare"])).toThrow(/--bare/);
    expect(() => parseArgs(["--engine", "claude", "--task", "x", "--cwd"])).toThrow(/后面要跟一个值/);
    expect(() => parseArgs(["--engine", "claude", "--cwd", "."])).toThrow(/--task/);
    expect(() => parseArgs(["--engine", "claude", "--task", "x"])).toThrow(/--cwd/);
    expect(() => parseArgs(["--engine", "claude", "--task", "x", "--cwd", ".", "--max-turns", "0"])).toThrow(/正整数/);
    expect(() => parseArgs(["--engine", "claude", "--task", "x", "--cwd", ".", "--ascension", "9"])).toThrow(/--with-tools/);
  });

  it("quotes a command line for display", () => {
    expect(shellQuote(["claude", "-p", "Read(//a/**)", "it's"])).toBe(`claude -p 'Read(//a/**)' 'it'\\''s'`);
  });
});

/* ---- whole runs against fake binaries ------------------------------------------------------------ */

let tmp: string;
let project: string;
let bin: string;
let record: string;
let keyFile: string;
const SECRET = "sk-test-0123456789abcdef-SECRET";

/** A fake claude/codex: records argv, cwd, stdin and env names, then prints a small event stream. */
function writeFake(name: "claude" | "codex"): string {
  const path = join(bin, name);
  writeFileSync(
    path,
    `#!${process.execPath}
const fs = require("node:fs");
let stdin = "";
process.stdin.on("data", (chunk) => (stdin += chunk));
process.stdin.on("end", () => {
  fs.writeFileSync(process.env.LEARNER_FAKE_RECORD, JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd(), stdin, env: Object.keys(process.env) }));
  const out = (event) => process.stdout.write(JSON.stringify(event) + "\\n");
  if (${JSON.stringify(name)} === "codex") {
    out({ type: "thread.started", thread_id: "th-1" });
    out({ type: "turn.started" });
    out({ type: "item.completed", item: { id: "i1", type: "command_execution", command: "grep -n X notes/lessons.md", exit_code: 0 } });
    out({ type: "item.completed", item: { id: "i2", type: "agent_message", text: "三句话。RUN: X" } });
    out({ type: "turn.completed", usage: { input_tokens: 1200, cached_input_tokens: 800, output_tokens: 90 } });
  } else {
    out({ type: "system", subtype: "init", session_id: "s-1", model: "claude-opus-5-5", tools: ["Read"], mcp_servers: [] });
    out({ type: "assistant", message: { content: [{ type: "tool_use", id: "t1", name: "Grep", input: { pattern: "X" } }] } });
    out({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "t1", content: "leaked ${SECRET}" }] } });
    out({ type: "assistant", message: { content: [{ type: "tool_use", id: "t2", name: "Read", input: { file_path: "a" } }] } });
    out({ type: "result", subtype: "success", is_error: false, num_turns: 3, duration_ms: 4200, total_cost_usd: 0.0123, session_id: "s-1", result: "三句话。RUN: X",
      usage: { input_tokens: 10, output_tokens: 120, cache_read_input_tokens: 20000, cache_creation_input_tokens: 5000 }, permission_denials: [] });
  }
  process.stderr.write("fake stderr line\\n");
});
`,
  );
  chmodSync(path, 0o755);
  return path;
}

function deps(env: NodeJS.ProcessEnv): { deps: Partial<LauncherDeps>; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    deps: {
      env,
      projectRoot: project,
      tasksDir: TASKS,
      runsDir: join(tmp, "runs"),
      secretFiles: [keyFile],
      now: () => new Date(2026, 8, 29, 23, 30, 0),
      out: (text) => out.push(text),
      err: (text) => err.push(text),
    },
  };
}

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), "learner-test-"));
  project = join(tmp, "project");
  mkdirSync(join(project, "wt"), { recursive: true });
  bin = join(tmp, "bin");
  mkdirSync(bin);
  record = join(tmp, "record.json");
  keyFile = join(tmp, "keys");
  writeFileSync(keyFile, `DEEPSEEK=${SECRET}\n`);
});
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const baseEnv = (): NodeJS.ProcessEnv => ({ PATH: process.env["PATH"] ?? "", HOME: tmp, LEARNER_FAKE_RECORD: record, DEEPSEEK_API_KEY: "sk-deepseek-should-not-pass", TYPESAFE_API_KEY: "ts", JEV_MODEL: "jev-latest", ANTHROPIC_API_KEY: "sk-ant" });
const smokeArgs = (engine: string, extra: string[] = []): string[] => ["--engine", engine, "--task", "smoke", "--set", "run=ULQPBK1211FG", "--cwd", join(project, "wt"), ...extra];

describe("--dry-run", () => {
  it("prints the prompt and the command line and runs nothing", async () => {
    const fake = writeFake("claude");
    rmSync(record, { force: true });
    const { deps: d, out } = deps({ ...baseEnv(), LEARNER_CLAUDE_BIN: fake });
    const code = await main(smokeArgs("claude", ["--dry-run", "--model", "opus"]), d);
    expect(code).toBe(0);
    const text = out.join("");
    expect(text).toContain("## ULQPBK1211FG");
    expect(text).toContain(`${fake} -p --output-format stream-json`);
    expect(text).toContain("--model opus");
    expect(text).toContain("DEEPSEEK_API_KEY");
    expect(text).not.toContain("sk-deepseek-should-not-pass");
    expect(existsSync(record)).toBe(false);
    expect(existsSync(join(tmp, "runs"))).toBe(false);
  });

  it("codex not installed: --dry-run still shows the command and says so; a real run stops with exit 3", async () => {
    const env = { ...baseEnv(), PATH: join(tmp, "empty-path") };
    const dry = deps(env);
    expect(await main(smokeArgs("codex", ["--dry-run"]), dry.deps)).toBe(0);
    expect(dry.out.join("")).toContain("codex exec --json --cd");
    expect(dry.err.join("")).toContain("codex 未安装：需要 Dai 安装并登录");
    const real = deps(env);
    expect(await main(smokeArgs("codex"), real.deps)).toBe(3);
    expect(real.err.join("")).toContain("codex 未安装：需要 Dai 安装并登录");
    expect(engineBinary("codex", env)).toBeUndefined();
  });

  it("usage errors exit 2: missing parameter, --cwd outside the project", async () => {
    const missing = deps(baseEnv());
    expect(await main(["--engine", "claude", "--task", "smoke", "--cwd", join(project, "wt"), "--dry-run"], missing.deps)).toBe(2);
    expect(missing.err.join("")).toContain("缺少参数：run");
    const outside = deps(baseEnv());
    expect(await main(["--engine", "claude", "--task", "smoke", "--set", "run=X", "--cwd", tmp, "--dry-run"], outside.deps)).toBe(2);
    expect(outside.err.join("")).toContain("不在项目目录");
  });

  it("--with-tools: stops with an explanation while src/tools/mcp-server.ts is missing, else mounts it", async () => {
    const { deps: d, out, err } = deps({ ...baseEnv(), LEARNER_CLAUDE_BIN: writeFake("claude") });
    const code = await main(smokeArgs("claude", ["--dry-run", "--with-tools"]), d);
    if (existsSync(join(REPO, "src", "tools", "mcp-server.ts"))) {
      expect(code).toBe(0);
      expect(out.join("")).toContain("--mcp-config");
      expect(out.join("")).toContain("mcp__gkb");
    } else {
      expect(code).toBe(3);
      expect(err.join("")).toContain("mcp-server.ts");
    }
  });
});

describe("whole runs against fake binaries", () => {
  it("codex: the argv, cwd and stdin the fake saw match codexCommand; no key in its env; log framed and summarised", async () => {
    const fake = writeFake("codex");
    const { deps: d, out } = deps({ ...baseEnv(), LEARNER_CODEX_BIN: fake });
    const code = await main(smokeArgs("codex", ["--model", "gpt-5-codex"]), d);
    expect(code).toBe(0);
    const seen = JSON.parse(readFileSync(record, "utf8")) as { argv: string[]; cwd: string; stdin: string; env: string[] };
    expect(seen.argv).toEqual(["exec", "--json", "--cd", join(project, "wt"), "--sandbox", "read-only", "-c", 'approval_policy="never"', "--model", "gpt-5-codex", "-"]);
    expect(seen.cwd).toBe(join(project, "wt"));
    expect(seen.stdin).toContain("## ULQPBK1211FG");
    for (const name of ["DEEPSEEK_API_KEY", "TYPESAFE_API_KEY", "JEV_MODEL", "ANTHROPIC_API_KEY"]) expect(seen.env).not.toContain(name);
    expect(seen.env).toContain("PATH");

    const logs = readdirSync(join(tmp, "runs")).filter((file) => file.endsWith("-smoke.jsonl"));
    expect(logs).toEqual(["20260929-233000-smoke.jsonl"]);
    const lines = readFileSync(join(tmp, "runs", logs[0]!), "utf8").trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(lines[0]).toMatchObject({ type: "learner_launch", engine: "codex", task: "smoke", params: { run: "ULQPBK1211FG" } });
    expect(String(lines[0]!["prompt"])).toContain("## ULQPBK1211FG");
    expect(lines.some((line) => line["type"] === "turn.completed")).toBe(true);
    expect(lines.some((line) => line["type"] === "learner_stderr" && line["text"] === "fake stderr line")).toBe(true);
    const summary = lines[lines.length - 1]!;
    expect(summary).toMatchObject({ type: "learner_summary", exit_code: 0, timed_out: false });
    expect(summary["summary"]).toMatchObject({ sessionId: "th-1", turns: 1, tokens: { input: 1200, output: 90, cacheRead: 800, cacheCreation: 0 }, result: "三句话。RUN: X", toolCalls: { command_execution: 1 } });
    expect(out.join("")).toContain("轮数：1");
    rmSync(join(tmp, "runs"), { recursive: true, force: true });
  });

  it("claude: summary (turns, tokens, cache, cost, duration) printed, and a key that reached the log is redacted", async () => {
    const fake = writeFake("claude");
    const { deps: d, out } = deps({ ...baseEnv(), LEARNER_CLAUDE_BIN: fake });
    const code = await main(smokeArgs("claude"), d);
    expect(code).toBe(0);
    const seen = JSON.parse(readFileSync(record, "utf8")) as { argv: string[]; stdin: string; env: string[] };
    expect(seen.argv.slice(0, 5)).toEqual(["-p", "--output-format", "stream-json", "--verbose", "--restricted"]);
    expect(seen.argv).not.toContain(seen.stdin);
    expect(seen.env).toContain("CLAUDE_CODE_DISABLE_AUTO_MEMORY");
    expect(seen.env).not.toContain("ANTHROPIC_API_KEY");
    const text = out.join("");
    expect(text).toContain("三句话。RUN: X");
    expect(text).toContain("轮数：3；工具调用：Grep×1 Read×1");
    expect(text).toContain("cache 读 20.0k、cache 写 5000");
    expect(text).toContain("$0.0123");
    expect(text).toContain("4.2 s（agent 自报）");
    expect(text).toContain("已替换成 [REDACTED]");
    const log = readFileSync(join(tmp, "runs", "20260929-233000-smoke.jsonl"), "utf8");
    expect(log).not.toContain(SECRET);
    expect(log).toContain("leaked [REDACTED]");
    expect(existsSync(join(tmp, "runs", "20260929-233000-smoke"))).toBe(true); // the {{scratch}} directory
    rmSync(join(tmp, "runs"), { recursive: true, force: true });
  });
});

describe("secrets and summaries", () => {
  it("collects key values from key files, .env key lines and stripped variables, never short values", () => {
    const envFile = join(tmp, "x.env");
    // Paths and URLs next to keys are not keys (the smoke run: DEEPSEEK_API_KEY_FILE=~/.deepseek_api_key).
    writeFileSync(
      envFile,
      "TARGET_ASCENSION=9\nTYPESAFE_API_KEY='ts-0123456789abcdefXYZ'\nJEV_BASE_URL=https://api.example.invalid/v1/long\nDEEPSEEK_API_KEY_FILE=~/.deepseek_api_key\nTYPESAFE_KEY_HINT=https://keys.example.invalid/x\n",
    );
    const keys = join(tmp, "keys2");
    writeFileSync(keys, `${SECRET}\n# see ~/.deepseek_api_key and more words\n/home/dw/.jev_api_keys.backup\n`);
    const secrets = collectSecrets(
      [keys, envFile, join(tmp, "missing")],
      { DEEPSEEK_API_KEY: "sk-env-0123456789abcdef", JEV_MODEL: "jev-latest-but-long-enough", JEV_KEYS_FILE: "/home/dw/.jev_api_keys" },
      ["DEEPSEEK_API_KEY", "JEV_MODEL", "JEV_KEYS_FILE"],
    );
    expect(secrets.sort()).toEqual([SECRET, "sk-env-0123456789abcdef", "ts-0123456789abcdefXYZ"].sort());
    const log = join(tmp, "log.jsonl");
    writeFileSync(log, `a ${SECRET} b ${SECRET}\n`);
    expect(redactSecrets(log, secrets)).toBe(2);
    expect(readFileSync(log, "utf8")).toBe("a [REDACTED] b [REDACTED]\n");
    expect(redactSecrets(log, secrets)).toBe(0);
  });

  it("claude error results and codex failures are errors", () => {
    const claude = new SummaryTracker("claude");
    claude.feed("not json");
    claude.feed(JSON.stringify({ type: "result", subtype: "error_max_turns", is_error: false, num_turns: 12 }));
    expect(claude.summary).toMatchObject({ status: "error_max_turns", isError: true, turns: 12 });
    const codex = new SummaryTracker("codex");
    codex.feed(JSON.stringify({ type: "turn.failed", error: { message: "usage limit" } }));
    expect(codex.summary).toMatchObject({ status: "turn.failed", isError: true, errors: ["usage limit"] });
  });
});
