/** Format-only planning fixtures; no learned thresholds, model calls or live game API. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { agentSystemPrompt, createBrain } from "../src/brain/brain.js";
import { pickSpec, stableSchema, runPlanSpec, routePlanSpec, shopPlanSpec, withRunPlanField } from "../src/brain/specs.js";
import type { BrainRequest } from "../src/brain/types.js";
import { strictSchema } from "../src/brain/engines/codex.js";
import { loadConfig } from "../src/core/config.js";
import { runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { ENDGAME_OBJECTIVE, endgameCheckpoint, endgameProblems, endgameTask, endgameQuestion, endgameRawScope } from "../src/memory/endgame-plan.js";
import { loadRunPlan, parseRunPlan } from "../src/memory/run-plan.js";
import { currentRunPlan } from "../src/memory/run-plan-merge.js";
import { createScreenMemory } from "../src/memory/types.js";
import * as buildSim from "../src/sim/build-sim-facts.js";
import type { JevClient } from "../src/reflex/jev/client.js";
import { mainMenuPayload, rewardCardPayload, testKnowledge } from "./scenarios.js";
import { envelope } from "./support.js";
import { brainAgentReport } from "../tools/brain-agent-report.js";

const dirs: string[] = [];
afterEach(() => { vi.restoreAllMocks(); setKnowledgeCharacter(null); dirs.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })); });
const plan = (index = 1, checkpoint = "") => ({ archetype: "格式方向", want: [], avoid: [], remove: [], block_target: 0,
  elites: "normal", rest: "auto", boss_prep: "未知，查库", summary: `格式计划${index}`,
  endgame: { core: `格式核心${index}`, gaps: `格式缺口${index}`, scaling_damage: "未知，待证", sustainable_defense: "未知，待证",
    resources: "两场资源未知，待证", win_condition: `格式终局假设${index}，尚未验证`, checkpoint } });
function board(floor = 1, act = 1, character = "SILENT", ascension = 10) {
  const raw = rewardCardPayload(); raw["run"] = { ...raw["run"] as object, character_id: character, ascension, act_id: String(act - 1), floor };
  return raw;
}

it("scopes the base goal from act one to Silent A10 and keeps other characters and levels byte equivalent", () => {
  setKnowledgeCharacter("silent");
  expect(agentSystemPrompt(board())).toContain(ENDGAME_OBJECTIVE);
  expect(agentSystemPrompt(board(18, 2))).toContain("成长性输出");
  for (const [character, asc] of [["IRONCLAD", 10], ["SILENT", 9], ["REGENT", 10], ["SILENT", 11]] as const) {
    const raw = board(1, 1, character, asc);
    expect(endgameRawScope(raw)).toBe(false);
    expect(agentSystemPrompt(raw)).toBe(agentSystemPrompt());
  }
});

it.each(["reward/card", "reward/skip", "shop/plan", "rest/choose", "selection/deck", "event/act-plan", "bundle/choose", "capstone/choose", "map/act-start", "map/route-plan", "run-plan"])("updates %s with no extra decision", label => {
  expect(endgameQuestion(parseGameState(board()), label)).toBe(true);
});

it("offers checkpoints only on pre-boss construction questions in each act", () => {
  for (const [act, boss] of [[1, 17], [2, 33], [3, 48]]) {
    for (const floor of [boss! - 2, boss! - 1]) expect(endgameCheckpoint(parseGameState(board(floor, act)), "rest/choose"))
      .toMatchObject({ act, before_boss_floor: boss });
    for (const floor of [boss! - 3, boss!, boss! + 1]) expect(endgameCheckpoint(parseGameState(board(floor, act)), "reward/card")).toBeNull();
  }
  const raw = board(32, 2);
  expect(endgameCheckpoint(parseGameState(raw), "combat/plan")).toBeNull();
  expect(endgameTask(parseGameState(board(1)), "reward/card")).not.toHaveProperty("endgame_checkpoint");
  raw["in_combat"] = true;
  expect(endgameQuestion(parseGameState(raw), "selection/choose")).toBe(false);
});

it("requires bounded nonempty plan fields and a checkpoint answer only when it was asked", () => {
  const early = { run_plan_task: endgameTask(parseGameState(board()), "reward/card") };
  const late = { run_plan_task: endgameTask(parseGameState(board(32, 2)), "rest/choose") };
  expect(runPlanSpec("run-plan", early).validate(plan())).toEqual([]);
  expect(runPlanSpec("run-plan", early).validate({ summary: "echo" }).join()).toContain("endgame.core");
  expect(runPlanSpec("run-plan", late).validate(plan()).join()).toContain("endgame.checkpoint");
  expect(runPlanSpec("run-plan", late).validate(plan(1, "核心未知、缺口待证，终局资源尚未验证"))).toEqual([]);
  expect(runPlanSpec("run-plan", early).validate(plan(1, "不该出现")).join()).toContain("must be empty");
  expect(endgameProblems({ ...plan().endgame, core: "😀".repeat(241) }, false).join()).toContain("exceeds 240");
  expect(endgameProblems({ ...plan().endgame, core: "😀".repeat(240) }, false)).toEqual([]);
  for (const spec of [pickSpec("reward/card", { a: null }, early), withRunPlanField(shopPlanSpec("shop/plan", { leave: null }, {}), early),
    withRunPlanField(routePlanSpec("map/route-plan", {}), early)]) {
    expect(spec.schema.required).toContain("run_plan");
    const stable = stableSchema(spec);
    expect(stable.properties?.["run_plan"]?.required).toContain("endgame");
    expect(stable.required).toContain("run_plan");
    expect(JSON.stringify(strictSchema(stable))).toContain('"endgame"');
  }
});

it("persists the full hypothesis and refuses a future-floor plan when restoring after rollback", () => {
  const dir = mkdtempSync(join(tmpdir(), "endgame-restore-")); dirs.push(dir);
  const file = join(dir, "run-plans.jsonl");
  const first = parseRunPlan(plan(1), parseGameState(board(1)), testKnowledge, "start");
  const future = parseRunPlan(plan(2), parseGameState(board(9)), testKnowledge, "review");
  writeFileSync(file, [first, future].map(p => JSON.stringify({ plan: p })).join("\n") + "\n");
  expect(loadRunPlan(file, "TESTRUN123", 2)?.endgame?.core).toBe("格式核心1");
  expect(loadRunPlan(file, "TESTRUN123")?.endgame?.core).toBe("格式核心2");
  expect(loadRunPlan(file, "ANOTHER_RUN", 2)).toBeNull();
});

it.each(["restart", "cached rollback"])("keeps a future-only log unknown across repeated reads after %s", mode => {
  const dir = mkdtempSync(join(tmpdir(), "endgame-future-only-")); dirs.push(dir);
  const file = join(dir, "run-plans.jsonl");
  const future = parseRunPlan(plan(9), parseGameState(board(9)), testKnowledge, "review");
  writeFileSync(file, JSON.stringify({ plan: future }) + "\n");
  const memory = createScreenMemory();
  memory.runPlan = mode === "restart" ? loadRunPlan(file, "TESTRUN123", 2) : future;
  expect(currentRunPlan(memory, file, "TESTRUN123", 2)).toBeNull();
  expect(memory.runPlan).toBeNull();
  expect(currentRunPlan(memory, file, "TESTRUN123", 2)).toBeNull();
  expect(currentRunPlan(memory, file, "OTHER_RUN", 2)).toBeNull();
  expect(memory.runPlan).toBeNull();
});

it("restores an available past plan after rollback and preserves the legacy unbounded default", () => {
  const dir = mkdtempSync(join(tmpdir(), "endgame-past-plan-")); dirs.push(dir);
  const file = join(dir, "run-plans.jsonl");
  const past = parseRunPlan(plan(1), parseGameState(board(1)), testKnowledge, "start");
  const future = parseRunPlan(plan(9), parseGameState(board(9)), testKnowledge, "review");
  writeFileSync(file, [past, future].map(p => JSON.stringify({ plan: p })).join("\n") + "\n");
  const memory = createScreenMemory(); memory.runPlan = future;
  expect(currentRunPlan(memory, file, "TESTRUN123", 2)?.floor).toBe(1);
  const legacy = createScreenMemory();
  expect(currentRunPlan(legacy, file, "TESTRUN123")?.floor).toBe(9);
});

for (const engine of ["codex", "deepseek"] as const) for (const start of [
  { floor: 1, act: 1, recovery: "normal" }, { floor: 31, act: 2, recovery: "normal" },
  { floor: 1, act: 1, recovery: "future-only" }, { floor: 9, act: 1, recovery: "rollback" },
  { floor: 1, act: 1, recovery: "other-run" }, { floor: 5, act: 1, recovery: "reuse" },
]) {
  it(`${engine}, F${start.floor}, ${start.recovery}: construction answers update the next question, survive restart and keep #35 / #49`, async () => {
    setKnowledgeCharacter("silent");
    const dir = mkdtempSync(join(tmpdir(), "endgame-loop-")); dirs.push(dir);
    const cfg = loadConfig({ BRAIN_RUN_CONFIG: JSON.stringify({ engine, effort: engine === "codex" ? "high" : "max" }),
      BRAIN_LOG: "off", RUN_PLAN: "off", FIGHT_PLAN: "off", BUILD_ONESHOT: "off" });
    cfg.log.decisionLog = join(dir, "decisions.jsonl"); cfg.runPlanLog = join(dir, "run-plans.jsonl"); cfg.fightPlanLog = join(dir, "fight-plans.jsonl");
    if (["future-only", "other-run"].includes(start.recovery)) {
      const future = parseRunPlan(plan(9), parseGameState(board(9)), testKnowledge, "review");
      if (start.recovery === "other-run") future.runId = "OTHER_RUN";
      writeFileSync(cfg.runPlanLog, JSON.stringify({ plan: future }) + "\n");
    }
    const requests: BrainRequest[] = [];
    // Supply a fixed completed computation while exercising the production admission gate unchanged.
    vi.spyOn(buildSim, "withBossSim").mockImplementation(async decision => ({ decision,
      record: { samples: 1, requested: 1, completion: { status: "complete" } } }));
    let current = board(start.floor, start.act), sent = 0;
    const client = new ModClient({ baseUrl: "http://fixture.invalid", fetchImpl: (async (url, options) => {
      if (String(url).endsWith("/state")) return Response.json(envelope(current));
      const intent = JSON.parse(String(options?.body)); sent++;
      if (sent <= 2) {
        const rawRun = current["run"] as Record<string, unknown>;
        const offered = (current["reward"] as Record<string, unknown>)["card_options"] as Record<string, unknown>[];
        current = board(start.floor + sent, start.act);
        current["run"] = { ...rawRun, floor: start.floor + sent, deck: [...rawRun["deck"] as unknown[], offered[0]] };
      } else current = mainMenuPayload();
      return Response.json(envelope({ action: intent.action, status: "completed", stable: true, message: "fixed", state: current }));
    }) as typeof fetch });
    const jevAsk = vi.fn().mockRejectedValue(new Error("unexpected Jev request"));
    const playFixed = async (maxDecisions: number) => {
      const brain = createBrain(cfg, null);
      vi.spyOn(brain.router, "decide").mockImplementation(async req => {
        requests.push(req);
        const checkpoint = (req.payload as any).run_plan_task?.endgame_checkpoint ? "幕末格式判断：核心和缺口待证，两战资源未知" : "";
        const answer = { choice: Object.keys(req.options ?? {})[0], reason: "格式构筑理由", boss_target: { boss_ids: [], gap: "本步不补，格式夹具", reason: "格式过渡，能力需求未知" }, run_plan: { ...plan(requests.length, checkpoint),
          ...((req.payload as any).run_plan_task?.plan_reuse ? { change_reason: "格式新证据下调整核心，预期改善本局胜率，效果未知" } : {}),
          ...(req.spec.schema.properties?.["run_plan"]?.properties?.["construction"] ? { construction: {
            primary: "uncommitted", alternatives: [], checkpoint: start.floor + sent + 1, reason: "格式方向依据待证", pivot_if: "出现新证据再改" } } : {}) } };
        if (start.recovery === "reuse" && requests.length === 2) delete (answer as any).run_plan;
        expect(req.spec.validate(answer)).toEqual([]);
        if ((req.payload as any).run_plan_task?.endgame_plan_required || checkpoint) expect(req.spec.validate({ choice: answer.choice, reason: "缺计划", boss_target: answer.boss_target }).join()).toContain("run_plan");
        else expect(req.spec.validate({ choice: answer.choice, reason: "复用", boss_target: answer.boss_target })).toEqual([]);
        return { engine, model: "fixed", answer, problems: [], attempts: 1, latencyMs: 1,
          usage: { inputTokens: 1, outputTokens: 1 }, toolCalls: [] };
      });
      return runLoop({ config: cfg, mode: "play", client, jev: { ask: jevAsk } as unknown as JevClient, brain,
        buildSim: {} as buildSim.BuildSimSetup, knowledge: testKnowledge, maxDecisions, maxMinutes: 1, pollIntervalMs: 0, restoreRun: false });
    };
    expect((await playFixed(2)).acts).toBe(2);
    expect(requests).toHaveLength(2);
    const second = requests[1]!.payload as any;
    expect(second.facts.your_run_plan.endgame.core).toBe("格式核心1");
    expect(requests[0]!.system).toContain(ENDGAME_OBJECTIVE);
    expect(requests[0]!.question).toContain("run_plan.endgame");
    expect((requests[0]!.payload as any).facts.your_run_plan).toBeNull();
    expect((requests[0]!.payload as any).run_plan_task.current_plan).toBeNull();
    const cues = JSON.parse(requests[0]!.question.split("\n").at(-1)!);
    expect(cues.schema).toBe("brain-query-cues-v3");
    expect(cues).not.toHaveProperty("rk");
    if (cues.strategies) {
      expect(cues.strategies.count).toBeGreaterThan(0);
      expect(cues.strategies).toMatchObject({ tool: "kb_strategies", input: { query: "*", limit: 3 } });
    }
    for (const [key, tool] of [["experience", "kb_experience"]]) {
      if (typeof cues[key].count === "number" && cues[key].count > 0) expect(cues[key].tool).toBe(tool);
      else {
        expect(cues[key].tool).toBeUndefined();
        expect(cues[key].input).toBeUndefined();
      }
    }
    expect(requests[0]!.system).toContain("匹配数为0、缺失或错误时跳过");
    expect(requests[0]!.system).toContain("kb_strategies");
    expect(requests[0]!.system).toContain("kb_reflex");
    expect(requests[0]!.system).toContain("经验用kb_experience");
    expect(requests[0]!.question).not.toContain("calibrated on logged A8");
    expect((requests[1]!.memory as any).construction_log).toContain("格式构筑理由");
    expect(requests[1]!.tools).toHaveLength(15);
    expect(requests[1]!.tools?.map(t => t.name)).toEqual(expect.arrayContaining(["kb_strategies", "kb_reflex", "kb_experience"]));
    if (start.recovery === "rollback") current = board(2);
    expect((await playFixed(1)).acts).toBe(1);
    if (start.recovery === "rollback") {
      expect((requests[2]!.payload as any).facts.your_run_plan).toBeNull();
      expect((requests[2]!.payload as any).run_plan_task.current_plan).toBeNull();
    } else expect((requests[2]!.payload as any).facts.your_run_plan.endgame.core).toBe(start.recovery === "reuse" ? "格式核心1" : "格式核心2");
    expect(sent).toBe(3); expect(requests).toHaveLength(3);
    // The existing Silent construction shadow still runs once per card question; no combat is played.
    expect(jevAsk).toHaveBeenCalledTimes(3);
    expect(jevAsk.mock.calls.every(args => (args[0] as any).direction === "uncommitted")).toBe(true);
    const stored = readFileSync(cfg.runPlanLog, "utf8").trim().split("\n").map(line => JSON.parse(line));
    expect(stored.filter(r => r.merged_into && r.plan?.endgame).every(r => r.plan.bossContext?.schema === "boss-target-context-v1" && r.plan.bossContext.run === r.plan.runId)).toBe(true);
    const decisions = readFileSync(cfg.log.decisionLog, "utf8").trim().split("\n").map(line => JSON.parse(line));
    const accepted = decisions.filter(r => r.deepseek?.direct && !r.deepseek?.invalid);
    expect(accepted).toHaveLength(3);
    expect(accepted.every(r => r.deepseek.boss_target?.reason === "格式过渡，能力需求未知")).toBe(true);
    expect(stored.filter(r => r.merged_into && r.plan?.endgame).map(r => r.plan.endgame.core)).toEqual(["格式核心1", start.recovery === "reuse" ? "格式核心1" : "格式核心2", "格式核心3"]);
    if (start.recovery === "reuse") expect(stored.find(r => r.plan_update)?.plan_update).toMatchObject({ outcome: "reused", changed_fields: [] });
    expect(stored.filter(r => r.plan?.endgame?.checkpoint)).toHaveLength(start.floor === 31 ? 2 : 0);
  });
}

it("reports actual prior plans and accepted checkpoint updates per engine and act without treating empty samples as passed", () => {
  const payload = (floor: number, previous?: unknown) => ({ facts: { act: 2, your_run_plan: previous ? { endgame: previous } : null },
    run_plan_task: endgameTask(parseGameState(board(floor, 2)), "reward/card") });
  const rows = [{ run_id: "fixture", question_id: "one", engine: "codex", knowledge: { mode: "tools" },
    payload: payload(31), accepted: true, answer: { run_plan: plan(1, "检查点未知") } },
  { run_id: "fixture", question_id: "two", engine: "codex", knowledge: { mode: "tools" },
    payload: payload(32, plan().endgame), accepted: false, answer: { run_plan: plan(2) } }];
  const result = brainAgentReport(rows).endgame_groups[0]!;
  expect(result).toMatchObject({ engine: "codex", act: "2", questions: 2, prior_plan_nonempty: 1,
    prior_plan_nonempty_rate: .5, accepted_plan_updates: 1, accepted_plan_update_rate: .5, checkpoints_requested: 2, checkpoints_answered: 1 });
  expect(brainAgentReport(rows, ["missing"]).endgame_groups).toEqual([]);
});
