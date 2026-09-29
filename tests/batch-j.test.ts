/**
 * Fix batch J (notes/fix-queue.md): pure bugs. One describe per fix; boards are synthetic or logged fixtures
 * (tests/logged-states/batch-j, out of the rollout-live / potion-mc sweeps), never the refreshing knowledge files.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { JEV_DATA_OVER_GUIDES, planCombatTurn } from "../src/screens/combat-plan.js";
import { DATA_OVER_GUIDES, DeepSeekClient } from "../src/llm/deepseek.js";
import { ROLLOUT_BUDGET_MS, rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { logged, loggedEnv } from "./logged.js";

type Raw = Record<string, unknown>;

const KNOWLEDGE = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "knowledge");

/** The plan options of a combat question, parsed. */
function planLines(decision: ReturnType<typeof planCombatTurn>): Raw[] {
  if (decision?.kind !== "ask") throw new Error(`expected an ask, got ${decision?.kind}`);
  const question = decision.questions["plan"]!;
  return Object.values(question.type === "choice" ? question.criteria : {}).map((text) => JSON.parse(String(text)) as Raw);
}

describe("1. Dai 2026-09-29: \"攻略或手册和经验库、实测数据冲突时，以数据为准\" in DeepSeek's system prompt and Jev's combat question", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  it("DeepSeek: in the fixed part of the system prompt, ahead of the guide and handbook, the same bytes on every client", () => {
    expect(DATA_OVER_GUIDES).toMatch(/guide or the handbook conflicts with the experience base .* measured data .* go with the data/);
    const make = () => new DeepSeekClient({ apiKey: "k", baseUrl: "http://127.0.0.1:9", model: "m", timeoutMs: 1000, guideFile: join(KNOWLEDGE, "ironclad-guide.md"), handbookFile: join(KNOWLEDGE, "ds-handbook.md") });
    const prompt = make().systemPrompt;
    expect(prompt.split(DATA_OVER_GUIDES).length - 1).toBe(1);
    expect(prompt.indexOf(DATA_OVER_GUIDES)).toBeLessThan(prompt.indexOf("# Ironclad strategy guide"));
    expect(make().systemPrompt).toBe(prompt);
    // Without guide files the rule is still there (it is not part of the guide text).
    expect(new DeepSeekClient({ apiKey: "k", baseUrl: "http://127.0.0.1:9", model: "m", timeoutMs: 1000 }).systemPrompt).toContain(DATA_OVER_GUIDES);
  });

  it("Jev: the combat plan question carries it ahead of the advice (plain state and the v1 view)", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    expect(JEV_DATA_OVER_GUIDES).toMatch(/conflicts with the experience base .* measured data .* go with the data/);
    const decision = planCombatTurn(loggedEnv(logged("batch-j/ulqp-f6-t2-glowwater"), { jevContext: "v1" }));
    if (decision?.kind !== "ask") throw new Error(`expected an ask, got ${decision?.kind}`);
    expect(decision.state["knowledge_rule"]).toBe(JEV_DATA_OVER_GUIDES);
    expect(decision.jevView?.state["knowledge_rule"]).toBe(JEV_DATA_OVER_GUIDES);
    const keys = Object.keys(decision.state);
    expect(keys.indexOf("knowledge_rule")).toBeLessThan(keys.indexOf("deepseek_plan") < 0 ? Infinity : keys.indexOf("deepseek_plan"));
  });
});
describe("2. Draw and discard piles both empty (Glowwater drew the whole deck): the rollout still runs (ULQPBK1211FG F6 T2: \"no draw/discard piles in the state\", Jev 0.18)", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  it("the logged board (9 cards in hand, both piles empty): every line has rollout numbers", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const fx = logged("batch-j/ulqp-f6-t2-glowwater");
    const view = (fx.state["agent_view"] as Raw)["combat"] as Raw;
    expect(view["draw"]).toEqual([]);
    expect(view["discard"]).toEqual([]);
    const lines = planLines(planCombatTurn(loggedEnv(fx)));
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(String(line["rollout"])).not.toMatch(/unavailable/);
      expect(String(line["rollout"])).toMatch(/-turn rollout .*expected further HP loss/);
    }
  });
});
