/**
 * V4 brain in the game loop: switching the engine is configuration only. A logged A9 rest site is played
 * through the loop against a scripted mod; BRAIN_ENGINE_REST=claude (a fake claude script, no model) decides
 * it instead of DeepSeek, and a used-up Claude quota falls back to DeepSeek.
 */
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { DeepSeekAnswerError, type DeepSeekAnswer } from "../src/llm/deepseek.js";
import type { JsonValue } from "../src/util/json.js";
import { runConfigLogPath, type RunConfigRow } from "../src/telemetry/run-config.js";
import { board, FakeDeepSeek, keyOf, play, setupOneshotTests } from "./oneshot-support.js";
import type { AppConfig } from "../src/config.js";
import { mainMenuPayload } from "./scenarios.js";

setupOneshotTests();

const REST = "7b0d-f8-rest";
const dir = mkdtempSync(join(tmpdir(), "brain-loop-"));

/** A fake claude that prints one result object (and a version line for `--version`, unless `version` is false). */
function fakeClaude(name: string, result: Record<string, unknown>, exitCode = 0, version = true): string {
  const bin = join(dir, `${name}.mjs`);
  const versionLine = version ? `if (process.argv.includes("--version")) { process.stdout.write("9.9.9 (Claude Code)\\n"); process.exit(0); }\n` : `if (process.argv.includes("--version")) { process.stderr.write("not logged in\\n"); process.exit(1); }\n`;
  writeFileSync(bin, `#!${process.execPath}\n${versionLine}for await (const _ of process.stdin) {}\nprocess.stdout.write(${JSON.stringify(JSON.stringify(result))} + "\\n");\nprocess.exit(${exitCode});\n`);
  chmodSync(bin, 0o755);
  return bin;
}

function brainConfig(env: Record<string, string>) {
  return loadConfig(env as unknown as NodeJS.ProcessEnv).brain;
}

describe("the loop with BRAIN_* set", () => {
  it("BRAIN_ENGINE_REST=claude: Claude decides the rest site, DeepSeek is not asked, the row names the engine", async () => {
    const bash = keyOf(board(REST, "rest"), "BASH");
    const answer = { choice: `o1:${bash}`, reason: "smith Bash for the boss" };
    const bin = fakeClaude("rest", { type: "result", subtype: "success", is_error: false, result: JSON.stringify(answer), structured_output: answer, total_cost_usd: 0.02, usage: { input_tokens: 10, cache_creation_input_tokens: 500, cache_read_input_tokens: 300, output_tokens: 90 }, modelUsage: { "claude-opus-5": {} } });
    const deepseek = new FakeDeepSeek(() => "o0");
    const { stats, actions, records } = await play([board(REST, "rest"), board(REST, "upgrade_select"), mainMenuPayload()], deepseek, { brain: brainConfig({ BRAIN_ENGINE_REST: "claude", BRAIN_CLAUDE_BIN: bin, BRAIN_CLAUDE_MODEL: "opus" }) });
    expect(deepseek.calls).toEqual([]);
    // Claude's calls have their own budget (BRAIN_CLAUDE_MAX_CALLS, the router's count): none of DeepSeek's is spent.
    expect(stats.deepseekCalls).toBe(0);
    expect(actions).toEqual([{ action: "choose_rest_option", option_index: 1 }, { action: "select_deck_card", option_index: 9 }]);
    expect(records.find((row) => row["label"] === "rest/plan")).toMatchObject({
      decider: "deepseek",
      deepseek: { choice: `o1:${bash}`, reason: "smith Bash for the boss", input_tokens: 810, cache_hit_tokens: 300, output_tokens: 90, brain: { engine: "claude", model: "claude-opus-5", attempts: 1, cost_usd: 0.02 } },
    });
  });

  it("a used-up Claude quota falls back to DeepSeek on the same question", async () => {
    const bin = fakeClaude("quota", { type: "result", subtype: "success", is_error: true, result: "You've hit your limit · resets 3pm" }, 1);
    const deepseek = new FakeDeepSeek(() => "o0");
    const { actions, records } = await play([board(REST, "rest"), mainMenuPayload()], deepseek, { brain: brainConfig({ BRAIN_ENGINE: "claude", BRAIN_FALLBACK: "deepseek", BRAIN_CLAUDE_BIN: bin }) });
    expect(deepseek.calls.map((call) => call.label)).toEqual(["rest/plan"]);
    expect(actions[0]).toEqual({ action: "choose_rest_option", option_index: 0 });
    const row = records.find((r) => r["label"] === "rest/plan") as { deepseek: { brain: { engine: string; fell_back_from: { engine: string; error: string } } } };
    expect(row.deepseek.brain.engine).toBe("deepseek");
    expect(row.deepseek.brain.fell_back_from.engine).toBe("claude");
    expect(row.deepseek.brain.fell_back_from.error).toMatch(/\[quota\]/);
  });

  it("a used-up Claude call budget (BRAIN_CLAUDE_MAX_CALLS) falls back to DeepSeek, which then spends DeepSeek's", async () => {
    const bin = fakeClaude("never", { type: "result", subtype: "success", is_error: false, result: "{}" });
    const deepseek = new FakeDeepSeek(() => "o0");
    const { stats, records } = await play([board(REST, "rest"), mainMenuPayload()], deepseek, { brain: brainConfig({ BRAIN_ENGINE_REST: "claude", BRAIN_FALLBACK: "deepseek", BRAIN_CLAUDE_BIN: bin, BRAIN_CLAUDE_MAX_CALLS: "0" }) });
    expect(deepseek.calls.map((call) => call.label)).toEqual(["rest/plan"]);
    expect(stats.deepseekCalls).toBe(1);
    const row = records.find((r) => r["label"] === "rest/plan") as { deepseek: { brain: { engine: string; fell_back_from: { engine: string; error: string } } } };
    expect(row.deepseek.brain.engine).toBe("deepseek");
    expect(row.deepseek.brain.fell_back_from.error).toMatch(/claude call budget used up \(0\/0/);
  });

  it("a claude that fails `claude --version` before play: said once as an error, in run-config, and its questions go to DeepSeek without starting it", async () => {
    const bin = fakeClaude("no-login", { type: "result", subtype: "success", is_error: false, result: "{}" }, 0, false);
    const deepseek = new FakeDeepSeek(() => "o0");
    const { stats, records, notes } = await play([board(REST, "rest"), mainMenuPayload()], deepseek, { brain: brainConfig({ BRAIN_ENGINE_REST: "claude", BRAIN_FALLBACK: "deepseek", BRAIN_CLAUDE_BIN: bin }) });
    const errors = notes.filter((note) => note.startsWith("ERROR: claude is unavailable for this run"));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(`\`${bin} --version\` failed (exited 1: not logged in)`);
    expect(deepseek.calls.map((call) => call.label)).toEqual(["rest/plan"]);
    const row = records.find((r) => r["label"] === "rest/plan") as { deepseek: { brain: { engine: string; fell_back_from: { engine: string; error: string } } } };
    expect(row.deepseek.brain.engine).toBe("deepseek");
    expect(row.deepseek.brain.fell_back_from.error).toMatch(/^unavailable for this process: `.* --version` failed/);
    const configPath = runConfigLogPath(stats.logPath);
    const configRows = existsSync(configPath) ? readFileSync(configPath, "utf8").trim().split("\n").map((line) => JSON.parse(line) as RunConfigRow) : [];
    rmSync(configPath, { force: true });
    expect(configRows[0]?.claude_check).toEqual({ bin, ok: false, error: "exited 1: not logged in" });
    expect(configRows[0]?.warnings?.[0]).toMatch(/^claude is unavailable for this run/);
  });

  it("DeepSeek as the fallback answers to DEEPSEEK_MAX_CALLS: none left, it is not asked (Jev/code decides)", async () => {
    const bin = fakeClaude("quota-budget", { type: "result", subtype: "success", is_error: true, result: "You've hit your limit · resets 3pm" }, 1);
    const deepseek = new FakeDeepSeek(() => "o0");
    const base = loadConfig({} as NodeJS.ProcessEnv);
    const spent: AppConfig["deepseek"] = { apiKey: "test", baseUrl: "http://127.0.0.1:9", model: "fake", maxCalls: 0, timeoutMs: 100, guideFile: "", handbookFile: "", reasoningEffort: "off", combatReasoningEffort: "", reasoningLog: "" };
    const { stats, records } = await play([board(REST, "rest"), mainMenuPayload()], deepseek, { deepseek: spent, brain: { ...base.brain, ...brainConfig({ BRAIN_ENGINE_REST: "claude", BRAIN_FALLBACK: "deepseek", BRAIN_CLAUDE_BIN: bin }) } });
    expect(deepseek.calls).toHaveLength(0);
    expect(stats.deepseekCalls).toBe(0);
    const row = records.find((r) => r["label"] === "rest/plan");
    expect(row?.["decider"]).not.toBe("deepseek");
  });

  it("DeepSeek as the fallback that answers unusably (DeepSeekAnswerError) is counted", async () => {
    class UnusableDeepSeek extends FakeDeepSeek {
      override async choose(state: Record<string, JsonValue>, instructions: string, criteria: Record<string, string | null>, context: Record<string, JsonValue> = {}): Promise<DeepSeekAnswer> {
        await super.choose(state, instructions, criteria, context);
        throw new DeepSeekAnswerError('DeepSeek chose unknown option "zz"', { choice: "zz", reason: "", reasoning: "", content: "" }, { latencyMs: 5, inputTokens: 10, outputTokens: 2 });
      }
    }
    const bin = fakeClaude("quota-unusable", { type: "result", subtype: "success", is_error: true, result: "You've hit your limit · resets 3pm" }, 1);
    const deepseek = new UnusableDeepSeek(() => "o0");
    const { stats } = await play([board(REST, "rest"), mainMenuPayload()], deepseek, { brain: brainConfig({ BRAIN_ENGINE_REST: "claude", BRAIN_FALLBACK: "deepseek", BRAIN_CLAUDE_BIN: bin }) });
    // The one-shot rest/plan, then the step-by-step rest/choose: both answered unusably, both counted.
    expect(deepseek.calls.map((call) => call.label)).toEqual(["rest/plan", "rest/choose"]);
    expect(stats.deepseekCalls).toBe(2);
  });

  it("default configuration: DeepSeek decides and the row carries no brain note (v3's rows)", async () => {
    const deepseek = new FakeDeepSeek(() => "o0");
    const { records } = await play([board(REST, "rest"), mainMenuPayload()], deepseek);
    expect(deepseek.calls.map((call) => call.label)).toEqual(["rest/plan"]);
    const row = records.find((r) => r["label"] === "rest/plan") as { deepseek: Record<string, unknown> };
    expect(row.deepseek["choice"]).toBe("o0");
    expect("brain" in row.deepseek).toBe(false);
  });
});
