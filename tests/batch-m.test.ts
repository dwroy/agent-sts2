/**
 * Fix batch M (notes/fix-queue.md "From post-mortems 2WRU 79YR 86C3" and "From post-mortems YVYZ Q8XR 3RME NH8A"):
 * pure bugs. One describe per fix; boards are synthetic or logged fixtures (tests/logged-states/batch-m), never the
 * refreshing knowledge files.
 */

import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { DeepSeekAnswerError, DeepSeekClient, frozenGuideFacts, pickJsonObject, truncatedJsonObject } from "../src/llm/deepseek.js";
import { endTurnLethalNote, planCombatTurn } from "../src/screens/combat-plan.js";
import { planSelection } from "../src/screens/selection.js";
import type { CardModel } from "../src/strategy/card-model.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { isRunPlanReply } from "../src/strategy/run-plan.js";
import { MUSIC_BOX_INDEX, solveTurn, type EnemySim, type Plan, type PlayerSim } from "../src/strategy/turn-solver.js";
import { logged, loggedEnv } from "./logged.js";
import { sendJson, startTestServer, type TestServer } from "./support.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "logged-states", "batch-m");
const fixture = <T>(name: string): T => JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf8")) as T;

type Raw = Record<string, unknown>;

describe("1. Knowledge Demon: with Rupture up, Disintegration that outlasts the HP still ranks last (79YR F33 T5: 17 HP, Rupture 2, taken as \"Rupture: Strength\")", () => {
  it("the logged board picks Sloth, and the text gives Rupture's Strength and the HP gate apart", { timeout: 30_000 }, () => {
    const fx = logged("batch-m/79yr-f33-t5-curse");
    const decision = planSelection(loggedEnv(fx));
    expect(decision?.kind).toBe("act");
    const act = decision as unknown as { intent: Raw; rationale: string };
    expect(act.intent).toEqual({ action: "select_deck_card", option_index: 1 });
    expect(act.rationale).toContain("懒惰");
    expect(act.rationale).toMatch(/DISINTEGRATION Rupture: Strength \(outlasts the HP: 7 a turn x 6\.9 turns \+ 20 > 17 HP\)/);
  });

  it("with the HP to pay for it, Rupture still makes Disintegration the pick", { timeout: 30_000 }, () => {
    const fx = logged("batch-m/79yr-f33-t5-curse");
    const player = ((fx.state["combat"] as Raw)["player"] as Raw);
    player["current_hp"] = 80;
    const act = planSelection(loggedEnv(fx)) as unknown as { intent: Raw; rationale: string };
    expect(act.intent).toEqual({ action: "select_deck_card", option_index: 0 });
    expect(act.rationale).toMatch(/DISINTEGRATION Rupture: Strength;/);
  });
});

describe("2. DeepSeek replies that are JSON but were judged non-JSON (79YR F6 one-shot shop: re-planned step by step, +145.8 s)", () => {
  let server: TestServer | null = null;
  afterEach(async () => {
    await server?.close();
    server = null;
  });
  const reply = (content: string) =>
    startTestServer((req, res) => {
      req.on("data", () => undefined);
      req.on("end", () => sendJson(res, 200, { choices: [{ message: { content, reasoning_content: "thinking" } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }));
    });
  const f6 = fixture<{ raw_reply: string; options: string[] }>("79yr-f6-shop-plan-reply");
  const criteria = Object.fromEntries(f6.options.map((key) => [key, null]));

  it("the logged reply is two whole objects joined by a comma, not a cut one: the plan object is taken", () => {
    expect(pickJsonObject(f6.raw_reply)).toEqual({
      plan: ["remove:c0", "buy_card3", "buy_card2"],
      reason: expect.stringMatching(/^Strike removal at its cheapest \(100\), then the two best block fixes .*Feel No Pain \(no exhaust\)\.$/),
    });
  });

  it("choosePlan returns it", async () => {
    server = await reply(f6.raw_reply);
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: server.url, model: "m", timeoutMs: 5000 });
    const { json } = await client.choosePlan({}, "Plan the shop.", criteria, { label: "shop/plan" });
    expect(json["plan"]).toEqual(["remove:c0", "buy_card3", "buy_card2"]);
  });

  it("a comma still needs values on both sides; other garbage still fails", () => {
    expect(() => pickJsonObject('{"a": 1},')).toThrow(/non-JSON/);
    expect(() => pickJsonObject(', {"a": 1}')).toThrow(/non-JSON/);
    expect(() => pickJsonObject('{"a": 1},, {"b": 2}')).toThrow(/non-JSON/);
    expect(() => pickJsonObject('{"a": 1} and more')).toThrow(/non-JSON/);
  });

  it("a reply cut inside its reason keeps the whole members and the reason so far, marked [truncated]", async () => {
    const cut = '{"plan": ["remove:c0", "buy_card3", "buy_card2"], "reason": "Strike removal at its cheapest (100), then the two best blo';
    expect(truncatedJsonObject(cut)).toEqual({ plan: ["remove:c0", "buy_card3", "buy_card2"], reason: "Strike removal at its cheapest (100), then the two best blo [truncated]" });
    server = await reply(cut);
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: server.url, model: "m", timeoutMs: 5000 });
    const { json } = await client.choosePlan({}, "Plan the shop.", criteria, { label: "shop/plan" });
    expect(json["plan"]).toEqual(["remove:c0", "buy_card3", "buy_card2"]);
    expect(json["reason"]).toMatch(/best blo \[truncated\]$/);
  });

  it("a member cut in the middle is dropped, never half-used: a cut plan list or choice is missing, not shortened", () => {
    expect(truncatedJsonObject('{"reason": "x", "plan": ["remove:c0", "buy_ca')).toEqual({ reason: "x [truncated]" });
    expect(truncatedJsonObject('{"reason": "x", "choice": "car')).toEqual({ reason: "x [truncated]" });
    expect(truncatedJsonObject('{"plan": ["remove:c0", "buy_ca')).toBeNull();
    expect(truncatedJsonObject('{"a": 1')).toBeNull();
    expect(truncatedJsonObject('{"a": 1} tail')).toBeNull();
    expect(truncatedJsonObject("")).toBeNull();
  });

  it("choose(): a whole choice with its reason cut is taken, the reason marked", async () => {
    server = await reply('{"choice":"card3","reason":"剑柄打击: 9 damage + draw fixes the deck');
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: server.url, model: "m", timeoutMs: 5000 });
    const answer = await client.choose({}, "Which card should I add?", { card1: null, card3: null }, { label: "selection/add" });
    expect(answer.choice).toBe("card3");
    expect(answer.reason).toBe("剑柄打击: 9 damage + draw fixes the deck [truncated]");
  });
});

describe("3. An empty run-plan reply, all its output spent in the reasoning (79YR F30: 6,791 tokens, the plan written at the end of the reasoning)", () => {
  let server: TestServer | null = null;
  afterEach(async () => {
    await server?.close();
    server = null;
  });
  type Reply = { content: string; reasoning: string; finish?: string; tokens?: number };
  /** Serves the replies in turn (the last one again after the list), counting the calls. */
  const serve = async (replies: Reply[]) => {
    const calls = { n: 0 };
    server = await startTestServer((req, res) => {
      req.on("data", () => undefined);
      req.on("end", () => {
        const reply = replies[Math.min(calls.n, replies.length - 1)]!;
        calls.n += 1;
        const tokens = reply.tokens ?? 100;
        sendJson(res, 200, {
          choices: [{ message: { content: reply.content, reasoning_content: reply.reasoning }, finish_reason: reply.finish ?? "stop" }],
          usage: { prompt_tokens: 1000, completion_tokens: tokens, completion_tokens_details: { reasoning_tokens: reply.content ? tokens - 10 : tokens } },
        });
      });
    });
    return calls;
  };
  const f30 = fixture<{ raw_reply: string; reasoning_tail: string; usage: { output_tokens: number } }>("79yr-f30-run-plan-empty");
  const client = (log = "") => new DeepSeekClient({ apiKey: "k", baseUrl: server!.url, model: "m", timeoutMs: 5000, reasoningLog: log });
  const PLAN = '{"archetype": "strength", "want": ["INFLAME"], "summary": "second answer"}';

  it("the plan at the end of the reasoning is taken, without a second call; the log row says why", async () => {
    const calls = await serve([{ content: f30.raw_reply, reasoning: f30.reasoning_tail, tokens: f30.usage.output_tokens }]);
    const log = join(mkdtempSync(join(tmpdir(), "batch-m-")), "reasoning.jsonl");
    const out = await client(log).askJson({ task: "run plan" }, "run-plan", isRunPlanReply);
    expect(calls.n).toBe(1);
    expect(out.recovered).toBe(true);
    expect(out.json["archetype"]).toBe("Rupture/Inflame Strength scaling; big single hits for Sloth turns");
    expect(out.json["remove"]).toEqual(["STRIKE_IRONCLAD", "DEFEND_IRONCLAD", "STAMPEDE"]);
    expect(out.note).toBe("empty reply (finish_reason stop; all 6791 output tokens were reasoning): the answer taken from the end of its reasoning");
    const row = JSON.parse(readFileSync(log, "utf8").trim()) as { answer: Raw };
    expect(row.answer["empty_reply"]).toBe("empty reply (finish_reason stop; all 6791 output tokens were reasoning)");
  });

  it("with no answer drafted, asked once more: the second reply is used, both calls' tokens counted, both logged", async () => {
    const calls = await serve([{ content: "", reasoning: "thinking, no draft" }, { content: PLAN, reasoning: "ok" }]);
    const log = join(mkdtempSync(join(tmpdir(), "batch-m-")), "reasoning.jsonl");
    const out = await client(log).askJson({ task: "run plan" }, "run-plan", isRunPlanReply);
    expect(calls.n).toBe(2);
    expect(out.json["summary"]).toBe("second answer");
    expect(out.meta.outputTokens).toBe(200);
    expect(out.note).toBe("first empty reply (finish_reason stop; all 100 output tokens were reasoning): asked once more");
    const rows = readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Raw);
    expect(rows).toHaveLength(2);
    expect(rows[0]!["parse_error"]).toMatch(/^empty reply \(finish_reason stop; all 100 output tokens were reasoning\), no answer drafted in its reasoning: asked once more$/);
    expect(rows[0]!["finish_reason"]).toBe("stop");
  });

  it("empty twice: fails with the reason and both calls' usage (the plan in force stays, as before)", async () => {
    const calls = await serve([{ content: "", reasoning: "thinking", finish: "length" }]);
    const failed = await client().askJson({ task: "run plan" }, "run-plan", isRunPlanReply).catch((error: unknown) => error);
    expect(calls.n).toBe(2);
    expect(failed).toBeInstanceOf(DeepSeekAnswerError);
    expect((failed as Error).message).toBe("DeepSeek's run-plan reply was empty twice (last: empty reply (finish_reason length; all 100 output tokens were reasoning)) and its reasoning drafted no answer");
    expect((failed as DeepSeekAnswerError).meta.outputTokens).toBe(200);
  });
});

describe("4. Music Box: the turn's first Attack card comes back as an Ethereal copy (YVYZ F48: an extra Strike after Strike at T3, re-planned 3x; Pommel Strike at T7)", () => {
  afterEach(() => {
    rolloutLiveOptions.enabled = true;
  });
  const card = (index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel => ({
    index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0],
    damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0,
    draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...overrides,
  });
  const strike = card(0, "STRIKE_IRONCLAD", { damage: 6 });
  const enemy: EnemySim = { index: 0, name: "Aeonglass", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] };
  const player = (over: Partial<PlayerSim> = {}): PlayerSim => ({ hp: 40, maxHp: 80, block: 0, energy: 2, weak: false, vulnerable: false, intangible: false, ...over });
  const lines = (plans: Plan[]) => plans.map((plan) => plan.steps.map((step) => step.cardIndex).join(","));

  it("solver: with no Attack played yet, the first one adds a copy to play; after one, or without the relic, none", () => {
    const armed = solveTurn({ hand: [strike], player: player({ musicBox: { count: 0 } }), enemies: [enemy], fightKind: "boss" });
    expect(armed.plans[0]!.steps.map((step) => step.cardIndex)).toEqual([0, MUSIC_BOX_INDEX]);
    expect(armed.plans[0]!.outcome.damageDealt).toBe(12);
    const spent = solveTurn({ hand: [strike], player: player({ musicBox: { count: 1 } }), enemies: [enemy], fightKind: "boss" });
    expect(lines(spent.plans)).not.toContain(`0,${MUSIC_BOX_INDEX}`);
    expect(spent.plans[0]!.outcome.damageDealt).toBe(6);
    const none = solveTurn({ hand: [strike], player: player(), enemies: [enemy], fightKind: "boss" });
    expect(none.plans[0]!.outcome.damageDealt).toBe(6);
  });

  it("solver: the copy's play counts for Withering Presence like any card's", () => {
    const result = solveTurn({ hand: [strike], player: player({ musicBox: { count: 0 } }), enemies: [enemy], fightKind: "boss", wither: { every: 2, played: 0, damage: 5 }, cardsPlayedThisTurn: 0 });
    const both = result.plans.find((plan) => plan.steps.length === 2)!;
    expect(both.steps.map((step) => step.cardIndex)).toEqual([0, MUSIC_BOX_INDEX]);
    expect(both.outcome.withersAdded).toBe(1);
    const one = result.plans.find((plan) => plan.steps.length === 1)!;
    expect(one.outcome.withersAdded).toBe(0);
  });

  it("the logged T3 board plays the copy; the frame after the first Strike (Music Box spent) makes none", { timeout: 30_000 }, () => {
    rolloutLiveOptions.enabled = false;
    const start = loggedEnv(logged("batch-m/yvyz-f48-t3-music-box"));
    planCombatTurn(start);
    const planned = [...(start.screenMemory.plannedAfter?.steps ?? [])];
    expect(planned.some((step) => step.cardIndex >= MUSIC_BOX_INDEX)).toBe(true);
    const after = loggedEnv(logged("batch-m/yvyz-f48-t3-after-strike"));
    planCombatTurn(after);
    expect((after.screenMemory.plannedAfter?.steps ?? []).some((step) => step.cardIndex >= MUSIC_BOX_INDEX)).toBe(false);
  });

  it("the committed line expects the copy: the next frame, holding it, continues the line instead of re-planning", { timeout: 30_000 }, () => {
    rolloutLiveOptions.enabled = false;
    // The T3 board cut to one Strike and 2 energy (Pael's Tears off: no unspent-energy line apart).
    const first = logged("batch-m/yvyz-f48-t3-music-box");
    const combat = first.state["combat"] as Raw;
    combat["hand"] = [{ ...(combat["hand"] as Raw[])[1]!, index: 0 }];
    (combat["player"] as Raw)["energy"] = 2;
    const run = first.state["run"] as Raw;
    run["relics"] = (run["relics"] as Raw[]).filter((relic) => relic["relic_id"] !== "PAELS_TEARS");
    const env = loggedEnv(first);
    const decision = planCombatTurn(env) as { label: string; rationale: string };
    expect(decision.label).toBe("combat/plan");
    expect(decision.rationale).toMatch(/^code plan \(only distinct line\): 打击 -> 永世沙漏, 打击（音乐盒复制） -> 永世沙漏;/);
    expect(env.screenMemory.combatPlan).toMatchObject({ expectedHand: "STRIKE_IRONCLAD", handLen: 1 });
    // The logged frame after that Strike: the Ethereal copy in hand (index 4 there), 1 Attack played.
    const second = logged("batch-m/yvyz-f48-t3-after-strike");
    const combat2 = second.state["combat"] as Raw;
    const copy = (combat2["hand"] as Raw[])[4]!;
    expect(copy["resolved_rules_text"]).toBe("虚无。 造成10点伤害。");
    combat2["hand"] = [{ ...copy, index: 0 }];
    (combat2["player"] as Raw)["energy"] = 1;
    const run2 = second.state["run"] as Raw;
    run2["relics"] = (run2["relics"] as Raw[]).filter((relic) => relic["relic_id"] !== "PAELS_TEARS");
    const next = planCombatTurn(loggedEnv(second, { screenMemory: env.screenMemory })) as unknown as { label: string; intent: Raw };
    expect(next.label).toBe("combat/plan-continue");
    expect(next.intent).toEqual({ action: "play_card", card_index: 0, target_index: 0 });
  });
});

describe("5. The DeepSeek system prompt's data facts frozen per day (2WRU 79YR 86C3: refilled every run, the first question of a run hit the cache 6.7-9.1%)", () => {
  const template = "# Guide\n\nGiant: {GIANT_KILLS_A8}. Static text.";
  /** Stand-in for the data behind the placeholders: `record` is what the data says now. */
  const data = { record: "A8 27 场赢 13" };
  const fill = (text: string) => text.split("{GIANT_KILLS_A8}").join(data.record);
  const at = (day: number, hour: number) => new Date(2026, 8, day, hour, 0, 0);

  it("same day: the second start reads the first one's fill byte for byte though the data moved; the next day takes the new data", () => {
    const dir = mkdtempSync(join(tmpdir(), "batch-m-facts-"));
    data.record = "A8 27 场赢 13";
    const first = frozenGuideFacts(template, dir, at(30, 3), fill);
    expect(first).toBe("# Guide\n\nGiant: A8 27 场赢 13. Static text.");
    data.record = "A8 29 场赢 14"; // a run later, the data rebuilt
    expect(frozenGuideFacts(template, dir, at(30, 23), fill)).toBe(first);
    const nextDay = frozenGuideFacts(template, dir, at(31, 0), fill);
    expect(nextDay).toBe("# Guide\n\nGiant: A8 29 场赢 14. Static text.");
    // Only the current day's snapshot is kept.
    expect(readdirSync(dir).filter((name) => name.endsWith(".md")).map((name) => name.slice(0, 10))).toEqual(["2026-10-01"]);
  });

  it("the template's own text edited the same day: filled again from the data now", () => {
    const dir = mkdtempSync(join(tmpdir(), "batch-m-facts-"));
    data.record = "A8 27 场赢 13";
    frozenGuideFacts(template, dir, at(30, 3), fill);
    data.record = "A8 29 场赢 14";
    expect(frozenGuideFacts(`${template} Edited.`, dir, at(30, 4), fill)).toBe("# Guide\n\nGiant: A8 29 场赢 14. Static text. Edited.");
  });

  it("no snapshot dir: filled at every call, as before", () => {
    data.record = "A8 27 场赢 13";
    expect(frozenGuideFacts(template, undefined, at(30, 3), fill)).toContain("A8 27 场赢 13");
    data.record = "A8 29 场赢 14";
    expect(frozenGuideFacts(template, undefined, at(30, 4), fill)).toContain("A8 29 场赢 14");
    expect(frozenGuideFacts("", "/nonexistent", at(30, 4), fill)).toBe("");
  });

  it("DeepSeekClient: two starts on one day build the same system prompt, from the day's snapshot", () => {
    const dir = mkdtempSync(join(tmpdir(), "batch-m-facts-"));
    const guideFile = join(dir, "guide.md");
    writeFileSync(guideFile, template, "utf8");
    const config = { apiKey: "k", baseUrl: "http://127.0.0.1:9", model: "m", timeoutMs: 100, guideFile, factsSnapshotDir: join(dir, "facts") };
    const a = new DeepSeekClient(config).systemPrompt;
    const [snapshot] = readdirSync(join(dir, "facts"));
    expect(snapshot).toMatch(/^\d{4}-\d{2}-\d{2}-[0-9a-f]{8}\.md$/);
    // What the next start reads is the snapshot, not a new fill: a stand-in text written there shows up.
    writeFileSync(join(dir, "facts", snapshot!), "# Guide\n\nfrozen stand-in", "utf8");
    const b = new DeepSeekClient(config).systemPrompt;
    expect(b).toContain("frozen stand-in");
    expect(new DeepSeekClient(config).systemPrompt).toBe(b);
    expect(a).not.toContain("{GIANT_KILLS_A8}");
    expect(existsSync(join(dir, "facts", snapshot!))).toBe(true);
  });
});

describe("6. The standalone removal screen shows the run plan's +40 apart, as a reference (79YR F6: \"打击 (code value 120, rank 1 of 13)\")", () => {
  const ask = () => {
    const fx = logged("batch-m/79yr-f6-remove");
    const decision = planSelection(loggedEnv(fx, { buildDecider: "deepseek" })) as unknown as { kind: string; questions: { pick: { criteria: Record<string, string> } } };
    expect(decision.kind).toBe("ask");
    return Object.fromEntries(Object.entries(decision.questions.pick.criteria).map(([key, text]) => [key, JSON.parse(text) as Raw]));
  };

  it("a run-plan removal target: the value split into code's own part and the plan's 40, marked a reference", { timeout: 30_000 }, () => {
    const criteria = ask();
    const strike = Object.values(criteria).find((option) => option["card"] === "打击")!;
    const value = strike["code_value"] as number;
    expect(value).toBe(120);
    expect(strike["why"]).toMatch(/^removal order: .*; this card: code value 120 = 80 \+ 40 as your run plan's removal target \(code's reference ranking, advice, not an order: the card you name is the one removed\)$/);
  });

  it("a card the plan does not name: its value alone, no split", { timeout: 30_000 }, () => {
    const criteria = ask();
    const other = Object.values(criteria).find((option) => option["card"] !== "打击" && option["card"] !== "防御")!;
    expect(other["why"]).toMatch(/^removal order: /);
    expect(other["why"]).not.toContain("this card:");
  });
});

describe("7. \"Mod says lethal, solver says alive\" names what the solver counts at the turn's end (86C3 F25 T5: 28 intents vs 28 HP, Plating 2)", () => {
  afterEach(() => {
    rolloutLiveOptions.enabled = true;
  });
  const endLine = (outcome: Partial<Plan["outcome"]>): Plan => ({ steps: [], score: 0, outcome: { dies: false, hpLoss: 0, incomingAfterBlock: 0, heldDamage: 0, sandpitAfter: null, ...outcome } }) as unknown as Plan;

  it("the logged board: Plating's end-of-turn block named, with the HP the enemy turn takes", { timeout: 30_000 }, () => {
    rolloutLiveOptions.enabled = false;
    const decision = planCombatTurn(loggedEnv(logged("batch-m/86c3-f25-t5-plating"))) as unknown as { rationale: string };
    expect(decision.rationale).toContain(
      "[calc mismatch: solver says ending now does not kill, mod says lethal: the mod's flag counts the intents against the block up now; the solver also counts Plating/Metallicize block at the turn's end 2 (the enemy turn takes 26 of 28 HP)]",
    );
  });

  it("several guards listed; none found: said so, not a bare mismatch", () => {
    const guards = [{ what: "Feel No Pain block for the Ethereal cards exhausted at the end", amount: 3 }, { what: "Buffer stacks, each preventing a whole HP loss", amount: 1 }];
    expect(endTurnLethalNote(endLine({ incomingAfterBlock: 0, endTurnGuards: guards }), true, 10)).toBe(
      " [calc mismatch: solver says ending now does not kill, mod says lethal: the mod's flag counts the intents against the block up now; the solver also counts Feel No Pain block for the Ethereal cards exhausted at the end 3, Buffer stacks, each preventing a whole HP loss 1 (the enemy turn takes 0 of 10 HP)]",
    );
    expect(endTurnLethalNote(endLine({ incomingAfterBlock: 9 }), true, 10)).toBe(
      " [calc mismatch: solver says ending now does not kill, mod says lethal: no end-of-turn block, Regen or Buffer the flag leaves out; the solver's enemy hits differ from the intents (the enemy turn takes 9 of 10 HP)]",
    );
    // The other direction is as before.
    expect(endTurnLethalNote(endLine({ dies: true, incomingAfterBlock: 30, hpLoss: 30 }), false, 10)).toBe(" [calc mismatch: solver says ending now kills, mod says safe]");
  });
});
