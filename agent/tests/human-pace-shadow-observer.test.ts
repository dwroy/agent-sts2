import { afterEach, expect, it, vi } from "vitest";
import { HumanPaceShadow } from "../src/sim/human-pace-observer.js";
import { board, env, decide } from "./oneshot-support.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import type { RunPlan } from "../src/memory/run-plan.js";
import type { DecisionRecord } from "../src/eye/decision-log.js";
afterEach(() => { vi.unstubAllEnvs(); setKnowledgeCharacter(null); });
function fixture() {
  setKnowledgeCharacter("silent"); vi.stubEnv("CHARACTER", "silent"); vi.stubEnv("HUMAN_PACE_H2", "shadow");
  const raw = board("xljq-f5-reward", "reward"); Object.assign(raw.run as object, { character_id: "SILENT", ascension: 10 });
  const environment = env(raw), plan: RunPlan = { runId: String(raw.run_id), act: 1, floor: 1, hpPct: 1, trigger: "start",
    archetype: "old", want: [], avoid: [], remove: [], blockTarget: null, elites: "normal", rest: "auto", bossPrep: "fixed", summary: "old",
    construction: { primary: "P", alternatives: [], checkpoint: 9, reason: "fixed", pivot_if: "fixed old condition" } };
  environment.screenMemory.runPlan = plan;
  return { environment, plan, decision: decide(environment) };
}
const record = { ts: "fixed", decision_id: "fixed", fingerprint: "fixed", label: "reward/card", decider: "codex",
  chosen: { action: "skip_reward_cards" }, deepseek: { choice: "skip" } } as unknown as DecisionRecord;

it("freezes the prior plan before the real answer, without exposing that answer to shadow Jev", async () => {
  const f = fixture(), rows: any[] = [], observer = new HumanPaceShadow("fixed/decisions.jsonl", (row) => rows.push(row));
  const captured = observer.capture(f.decision, f.environment);
  expect(captured?.priorPlan?.construction?.primary).toBe("P");
  f.environment.screenMemory.runPlan!.construction!.primary = "D";
  const ask = vi.fn(async (state: any) => {
    expect(state.direction).toBe("P"); expect(state).not.toHaveProperty("actual_brain_choice");
    return { model: "fixed", answers: { card: { type: "choice" as const, choice: "skip", probabilities: {}, confidence: 1, raw: {} } },
      latencyMs: 1, inputTokens: 1, outputTokens: 1, requestId: "fixed" };
  });
  await observer.observe(f.environment, record, f.environment.screenMemory.runPlan, captured, null, { ask });
  expect(ask).toHaveBeenCalledTimes(1);
  expect(rows.find((r) => r.act_plan)?.act_plan.direction).toBe("D");
  expect(rows.find((r) => r.card_facts)?.card_facts.primary).toBe("P");
  expect(rows.find((r) => r.jev_shadow)?.jev_shadow).toMatchObject({ actual_brain_choice: "skip", jev_choice: "skip", agreement: true });
  expect(f.environment.screenMemory).not.toHaveProperty("humanPaceShadow");
});

it("does not propagate observer log failures or observe other roles", async () => {
  const f = fixture(), write = vi.fn(() => { throw new Error("fixed disk error"); });
  const observer = new HumanPaceShadow("fixed/decisions.jsonl", write);
  await expect(observer.observe(f.environment, record, null, null, null, null)).resolves.toBeUndefined();
  expect(write).toHaveBeenCalled();
  (f.environment.state.run!.raw as any).character_id = "IRONCLAD";
  const calls = write.mock.calls.length;
  expect(observer.capture(f.decision, f.environment)).toBeNull();
  await observer.observe(f.environment, record, null, null, null, null);
  expect(write).toHaveBeenCalledTimes(calls);
});
