import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, expect, it, vi } from "vitest";

import { loadConfig } from "../src/core/config.js";
import { runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import { setCardUpgradesForTests } from "../src/knowledge/card-upgrades.js";
import { setExperienceForTests } from "../src/knowledge/experience.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { setRoomCostsForTests } from "../src/knowledge/room-costs.js";
import { FakeDeepSeek, stubJev } from "./oneshot-support.js";
import { mainMenuPayload, restPayload, testKnowledge } from "./scenarios.js";
import { envelope } from "./support.js";

const dirs: string[] = [];
afterEach(() => {
  vi.useRealTimers();
  setCardUpgradesForTests(null);
  setExperienceForTests(null);
  setMonsterDbForTests(null);
  setRoomCostsForTests(null);
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

it.each(["same", "hp", "deck", "failed-close"] as const)(
  "7PWU4CD3QCP3 F47: %s board after CARDS_VIEW only reuses an unexecuted answer when safe",
  async (change) => {
    vi.useFakeTimers();
    // Fixed data only: no generated database or real model participates in this transport test.
    setCardUpgradesForTests({});
    setExperienceForTests([], { rest: {} });
    setMonsterDbForTests({ monsters: {}, encounters: {}, bosses: {} });
    setRoomCostsForTests({ by_asc: {} });
    const dir = mkdtempSync(join(tmpdir(), "cards-view-memo-"));
    dirs.push(dir);
    const raw = restPayload();
    raw["run_id"] = "7PWU4CD3QCP3";
    const run = raw["run"] as Record<string, unknown>;
    run["floor"] = 47;
    let overlay = false;
    let finished = false;
    let closeFailed = false;
    const actions: string[] = [];
    const deepseek = new FakeDeepSeek(() => {
      if (deepseek.calls.length === 1) overlay = true;
      return "o0";
    });
    const fetchImpl: typeof fetch = async (url, options) => {
      let payload: unknown;
      if (String(url).endsWith("/state")) {
        payload = finished ? mainMenuPayload() : overlay
          ? { ...raw, screen: "CARDS_VIEW", available_actions: ["close_cards_view"] }
          : raw;
      } else {
        const intent = JSON.parse(String(options?.body)) as { action: string };
        actions.push(intent.action);
        if (intent.action === "close_cards_view") {
          if (change === "failed-close" && !closeFailed) {
            closeFailed = true;
            throw new Error("fixed transport failure");
          }
          overlay = false;
          if (change === "hp") run["current_hp"] = Number(run["current_hp"]) - 1;
          if (change === "deck") run["deck"] = [];
        } else finished = true;
        payload = { action: intent.action, status: "completed", stable: true, message: "Action completed.", state: raw };
      }
      return new Response(JSON.stringify(envelope(payload)), { status: 200 });
    };
    const base = loadConfig({} as NodeJS.ProcessEnv);
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
    expect((await result).runsCompleted).toBe(1);
    expect(actions.at(-1)).toBe("choose_rest_option");
    expect(deepseek.calls.map((call) => call.label)).toEqual(
      change === "same" ? ["rest/plan"] : ["rest/plan", "rest/plan"],
    );
  },
);
