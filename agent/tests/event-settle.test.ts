import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, expect, it, vi } from "vitest";

import { loadConfig } from "../src/core/config.js";
import { runLoop } from "./legacy-brain.js";
import { ModClient } from "../src/hand/mod/client.js";
import { setExperienceForTests } from "../src/knowledge/experience.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { setRoomCostsForTests } from "../src/knowledge/room-costs.js";
import { FakeDeepSeek, stubJev } from "./oneshot-support.js";
import { eventPayload, mainMenuPayload, testKnowledge } from "./scenarios.js";
import { envelope } from "./support.js";

const dirs: string[] = [];
afterEach(() => {
  vi.useRealTimers();
  setExperienceForTests(null);
  setMonsterDbForTests(null);
  setRoomCostsForTests(null);
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

it("JJ75S331VUKX F31: completed stable event clicks wait out old options without another brain call", async () => {
  vi.useFakeTimers();
  // Fixed empty tables: this transport regression must not depend on refreshed knowledge.
  setExperienceForTests([], { rest: {} });
  setMonsterDbForTests({ monsters: {}, encounters: {}, bosses: {} });
  setRoomCostsForTests({ by_asc: {} });
  const dir = mkdtempSync(join(tmpdir(), "event-settle-"));
  dirs.push(dir);
  const raw = eventPayload();
  raw["run_id"] = "JJ75S331VUKX";
  (raw["run"] as Record<string, unknown>)["floor"] = 31;
  const finished = structuredClone(raw);
  finished["event"] = {
    event_id: "BIG_FISH", title: "Big Fish", description: "Done", is_finished: true,
    options: [{ index: 0, title: "Proceed", description: "", is_locked: false, is_proceed: true }],
  };
  let clicked = false;
  let left = false;
  let staleReads = 0;
  const actions: string[] = [];
  const fetchImpl: typeof fetch = async (url, options) => {
    let payload: unknown;
    if (String(url).endsWith("/state")) {
      // The action succeeded, but the next two reads still expose the original page.
      payload = left ? mainMenuPayload() : !clicked || ++staleReads <= 2 ? raw : finished;
    } else {
      const intent = JSON.parse(String(options?.body)) as { action: string };
      actions.push(intent.action);
      if (clicked) left = true;
      clicked = true;
      payload = { action: intent.action, status: "completed", stable: true, message: "Action completed.", state: raw };
    }
    return new Response(JSON.stringify(envelope(payload)), { status: 200 });
  };
  const base = loadConfig({} as NodeJS.ProcessEnv);
  const deepseek = new FakeDeepSeek(() => "o0");
  const result = runLoop({
    config: {
      ...base, buildDecider: "deepseek", runPlan: "off", fightPlan: "off",
      deepseek: { apiKey: "test", baseUrl: "http://fixture", model: "fake", maxCalls: 10, timeoutMs: 100, guideFile: "", handbookFile: "", reasoningEffort: "off", combatReasoningEffort: "", reasoningLog: "" },
      log: { ...base.log, decisionLog: join(dir, "decisions.jsonl"), runConfigLog: null },
    },
    mode: "play", client: new ModClient({ baseUrl: "http://fixture", fetchImpl }),
    jev: stubJev(), escalators: [deepseek], knowledge: testKnowledge,
    maxRuns: 1, maxDecisions: 10, pollIntervalMs: 1, restoreRun: false,
  });
  await vi.runAllTimersAsync();
  const stats = await result;
  expect(stats.runsCompleted).toBe(1);
  expect(actions).toEqual(["choose_event_option", "choose_event_option"]);
  expect(deepseek.calls.map((call) => call.label)).toEqual(["event/choose"]);
});
