/** 8JRE F33 T2, YF0L F48 T1 and XP2S F33 T3 / silent-0079: a receipt is not a turn outcome. */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { runLoop } from "../src/hand/loop.js";
import { ModProtocolError, type ActionRequest, type ModClient } from "../src/hand/mod/client.js";
import { parseGameState, type ActionResult } from "../src/hand/mod/schema.js";
import { planDecision } from "../src/hand/screens/index.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { silentSelectionAudit } from "../src/reflex/silent-selection-audit.js";
import { silentSelectionDispatch } from "../src/reflex/silent-selection-dispatch.js";

vi.mock("../src/hand/screens/index.js", () => ({ planDecision: vi.fn() }));
vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__silent_dispatch_fixed__/${name}`,
}));
vi.mock("../src/eye/run-config.js", () => ({ createRunConfigLog: () => null }));

const fixture = JSON.parse(readFileSync(new URL("./silent-selection-audit-state.json", import.meta.url), "utf8"));
const state = () => parseGameState(structuredClone(fixture.state));
const intent: ActionRequest = { action: "play_card", card_index: 0 };
const audit = () => silentSelectionAudit(state(), 3, { answer: null, beforeSl: null, afterSl: null }, intent)!;
const directories: string[] = [];
afterEach(() => { vi.clearAllMocks(); for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true }); });

async function runReceipt(mode: "play" | "shadow", fails = false, foreign = false, refuse = false) {
  const dir = mkdtempSync(join(tmpdir(), "silent-dispatch-")); directories.push(dir);
  const log = join(dir, "decisions.jsonl");
  const board = state();
  if (foreign) board.run!.raw["character_id"] = "IRONCLAD";
  vi.mocked(planDecision).mockReturnValue({ kind: "decision", decision: {
    kind: "act", label: "combat/plan-choice", intent: { ...intent,
      ...(refuse ? { expect: { card: { id: "STRIKE_SILENT" } } } : {}) },
    rationale: "fixed observed first step", log: { selection_audit: audit() },
  } });
  const act = vi.fn(async (): Promise<ActionResult> => {
    if (fails) throw new ModProtocolError("fixed uncertain action response");
    return { action: "play_card", status: "completed", stable: true, message: "fixed receipt", state: null, raw: {} };
  });
  const config = loadConfig({});
  config.sl.enabled = false;
  config.runPlan = "off"; config.fightPlan = "off";
  config.log = { ...config.log, decisionLog: log, jevPromptLog: join(dir, "jev.jsonl") };
  const stop = new AbortController();
  await runLoop({ config, mode, client: { state: async () => board, act } as unknown as ModClient,
    knowledge: makeKnowledge({}, "cache"), jev: null, brain: null, restoreRun: false,
    signal: stop.signal, onEvent: (event) => { if (event.type === "decision") stop.abort(); },
    maxDecisions: 1, maxMinutes: 0.05, combatGraceMinutes: 0, pollIntervalMs: 1 });
  return { rows: readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line)), act };
}

it("the real loop persists its completed first-action receipt beside the unchanged prediction", async () => {
  const { rows, act } = await runReceipt("play");
  expect(act).toHaveBeenCalledOnce();
  expect(rows).toHaveLength(1);
  expect(rows[0].selection_audit).toEqual(audit());
  expect(rows[0]).toMatchObject({ chosen: intent, selection_dispatch: {
    scope: "single_action_receipt", dispatch_status: "returned", gated_action: intent,
    returned_status: "completed", returned_stable: true,
    expected_identity: { card: { id: "FRANTIC_ESCAPE" } },
    state_effect_verified: false, whole_plan_executed: null, actual_turn: null,
  } });
});

it("a shadow memory application is explicitly undispatched", async () => {
  const { rows, act } = await runReceipt("shadow");
  expect(act).not.toHaveBeenCalled();
  expect(rows[0].selection_dispatch).toMatchObject({ dispatch_status: "not_dispatched", not_dispatched_reason: "shadow",
    returned_status: null, returned_stable: null, whole_plan_executed: null });
});

it("an action error stays uncertain even though the action may have applied", async () => {
  const { rows, act } = await runReceipt("play", true);
  expect(act).toHaveBeenCalledOnce();
  expect(rows[0].selection_dispatch).toMatchObject({ dispatch_status: "error", error_kind: "fatal",
    returned_status: null, state_effect_verified: false, actual_turn: null });
});

it("the execution consumer adds nothing for another character", async () => {
  const { rows, act } = await runReceipt("play", false, true);
  expect(act).toHaveBeenCalledOnce();
  expect(rows[0].selection_dispatch).toBeUndefined();
});

it("the real identity gate refusal records no dispatch, even with a candidate request", async () => {
  const { rows, act } = await runReceipt("play", false, false, true);
  expect(act).not.toHaveBeenCalled();
  expect(rows[0]).toMatchObject({ gate_reject: { at: "decision", kind: "identity" }, selection_dispatch: {
    dispatch_status: "not_dispatched", not_dispatched_reason: "gate_refused_decision",
    expected_identity: { card: { id: "STRIKE_SILENT" } }, returned_status: null, actual_turn: null,
  } });
});

it.each(["gate_refused_decision", "gate_refused_dispatch", "state_changed", "state_read_failed", "sl_reload"])(
  "keeps %s separate from a successful dispatch and preserves a changed gated action", (reason) => {
    const prediction = audit();
    const before = structuredClone(prediction);
    const gated: ActionRequest = { action: "end_turn" };
    expect(silentSelectionDispatch(state(), prediction, gated, { status: "not_dispatched", reason })).toMatchObject({
      selection_dispatch: { requested_action: { action: "play_card", card_index: 0 }, gated_action: gated,
        dispatch_status: "not_dispatched", not_dispatched_reason: reason, returned_status: null, actual_turn: null },
    });
    expect(prediction).toEqual(before);
  },
);

it.each(["pending", "failed"] as const)("does not promote the mod's %s response to completion", (status) => {
  expect(silentSelectionDispatch(state(), audit(), intent, { status: "returned", result: { status, stable: false } })).toMatchObject({
    selection_dispatch: { returned_status: status, returned_stable: false, state_effect_verified: false, whole_plan_executed: null },
  });
});

it("does not infer a receipt for missing candidate evidence or another ascension", () => {
  const board = state();
  expect(silentSelectionDispatch(board, undefined, intent, { status: "error", kind: "wait" })).toEqual({});
  board.run!.ascension = 9;
  expect(silentSelectionDispatch(board, audit(), intent, { status: "error", kind: "wait" })).toEqual({});
});
