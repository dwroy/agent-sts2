/**
 * Shared pieces of the one-shot tests (tests/oneshot-*.test.ts): logged A9 boards
 * (tests/logged-states/oneshot/*.json), the decision environment, DeepSeek's answers resolved the way the
 * loop resolves them, a fake DeepSeek and a scripted mod for loop runs. The upgrade numbers are a fixture
 * table (not the refreshed card-upgrades.json).
 */

import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll } from "vitest";

import type { AppConfig } from "../src/config.js";
import { loadConfig } from "../src/config.js";
import type { AnswerSet } from "../src/jev/answers.js";
import type { JevAskResult, JevClient } from "../src/jev/client.js";
import { setCardUpgradesForTests } from "../src/knowledge/card-upgrades.js";
import { DeepSeekClient, type DeepSeekAnswer } from "../src/llm/deepseek.js";
import { runLoop } from "../src/loop.js";
import { ModClient } from "../src/mod/client.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv, type ResolvedAction, type ScreenMemory } from "../src/project/types.js";
import { planDecision } from "../src/screens/index.js";
import { deckCards } from "../src/screens/oneshot.js";
import type { JsonValue } from "../src/util/json.js";
import { loggedKnowledge } from "./logged.js";
import { envelope, sendJson, startTestServer, type TestServer } from "./support.js";

export type Raw = Record<string, unknown>;

export const DIR = join(dirname(fileURLToPath(import.meta.url)), "logged-states", "oneshot");
const config = loadConfig({} as NodeJS.ProcessEnv);

/** A fresh copy of one logged state of a fixture. */
export function board(file: string, key: string): Raw {
  const fixture = JSON.parse(readFileSync(join(DIR, `${file}.json`), "utf8")) as { states: Record<string, Raw> };
  const state = fixture.states[key];
  if (!state) throw new Error(`${file} has no state ${key}`);
  return state;
}

export function env(raw: Raw, memory?: ScreenMemory, over: Partial<DecisionEnv> = {}): DecisionEnv {
  const state = parseGameState(raw);
  const screenMemory = memory ?? createScreenMemory(state.screen);
  screenMemory.screen = state.screen;
  return {
    state,
    knowledge: loggedKnowledge,
    brief: buildRunBrief(state, loggedKnowledge),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    screenMemory,
    shopDiscardPotions: [],
    buildDecider: "deepseek",
    ...over,
  };
}

export function decide(e: DecisionEnv): Decision {
  const outcome = planDecision(e);
  if (outcome.kind !== "decision") throw new Error(`expected a decision, got ${outcome.kind}: ${outcome.reason}`);
  return outcome.decision;
}

export function ask(decision: Decision): AskDecision & { deepseek: NonNullable<AskDecision["deepseek"]> } {
  if (decision.kind !== "ask" || !decision.deepseek) throw new Error(`expected a DeepSeek question, got ${decision.kind} ${decision.label}`);
  return decision as AskDecision & { deepseek: NonNullable<AskDecision["deepseek"]> };
}

/** The question's options, parsed. */
export function optionsOf(decision: Decision): Record<string, Record<string, JsonValue>> {
  const question = ask(decision).questions["pick"];
  if (question?.type !== "choice") throw new Error("expected a choice question");
  return Object.fromEntries(Object.entries(question.criteria).map(([key, value]) => [key, JSON.parse(value ?? "{}") as Record<string, JsonValue>]));
}

/** DeepSeek's choice of `choice` (with `cards`), resolved as the loop resolves it. */
export function choose(decision: Decision, choice: string, cards?: string[], route?: string): ResolvedAction {
  return ask(decision).resolve({ pick: { type: "choice", choice, probabilities: { [choice]: 1 }, confidence: 1, raw: { escalated: "deepseek", ...(cards ? { cards } : {}), ...(route ? { route } : {}) } } } as AnswerSet);
}

/** DeepSeek's plan answer for a shop question, resolved as the loop resolves it. */
export function planned(decision: Decision, plan: unknown, reason = "fake plan"): ResolvedAction | { invalid: string } {
  const spec = ask(decision).deepseek.plan;
  if (!spec) throw new Error("expected a plan question");
  return spec.resolve({ plan, reason });
}

export function played(result: ResolvedAction | { invalid: string }): ResolvedAction {
  if ("invalid" in result) throw new Error(`plan invalid: ${result.invalid}`);
  result.apply?.();
  return result;
}

/** Plays an act decision the way the loop does after dispatching it. */
export function act(decision: Decision): Decision & { kind: "act" } {
  if (decision.kind !== "act") throw new Error(`expected an act, got ${decision.kind} ${decision.label}`);
  decision.apply?.();
  return decision;
}

/** The fixture's key of the first deck card with this id (c<deck index>). */
export function keyOf(raw: Raw, cardId: string): string {
  const cards = deckCards(parseGameState(raw), loggedKnowledge);
  const card = cards.find((entry) => entry.identity.card_id === cardId);
  if (!card) throw new Error(`no ${cardId} in the deck`);
  return card.key;
}

/** Registers the upgrade fixture table and the loop runs' cleanup for a test file. */
export function setupOneshotTests(): void {
  beforeAll(() =>
  setCardUpgradesForTests({
    BASH: { n: [1, 1], vars: { Damage: [8, 10], VulnerablePower: [2, 3] } },
    STRIKE_IRONCLAD: { n: [1, 1], vars: { Damage: [6, 9] } },
    TRUE_GRIT: { n: [1, 1], vars: { Block: [7, 9] } },
    PYRE: { n: [1, 1], cost: [2, 1], vars: {} },
  }),
);
  afterAll(() => setCardUpgradesForTests(null));
  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
    for (const path of logs.splice(0)) rmSync(path, { force: true });
  });
}

/* ---- loop runs ---------------------------------------------------------------------------------- */

export class FakeDeepSeek extends DeepSeekClient {
  calls: { label: string; state: Record<string, JsonValue>; criteria: Record<string, string | null>; plan: boolean }[] = [];
  constructor(
    private readonly pick: (criteria: Record<string, string | null>, label: string) => string | { choice: string; cards?: string[]; route?: string },
    private readonly plans: (label: string, n: number) => Record<string, unknown> = () => ({ plan: [], reason: "nothing" }),
  ) {
    super({ apiKey: "test", baseUrl: "http://127.0.0.1:9", model: "fake", timeoutMs: 100 });
  }
  override async choose(state: Record<string, JsonValue>, _instructions: string, criteria: Record<string, string | null>, context: Record<string, JsonValue> = {}): Promise<DeepSeekAnswer> {
    const label = String(context["label"] ?? "");
    this.calls.push({ label, state, criteria, plan: false });
    const picked = this.pick(criteria, label);
    const choice = typeof picked === "string" ? picked : picked.choice;
    const extras = typeof picked === "string" ? {} : { ...(picked.cards ? { cards: picked.cards } : {}), ...(picked.route ? { route: picked.route } : {}) };
    return { choice, reason: `fake reason for ${choice}`, latencyMs: 5, inputTokens: 10, outputTokens: 2, cacheHitTokens: 7, reasoningTokens: 1, ...extras };
  }
  override async choosePlan(state: Record<string, JsonValue>, _instructions: string, criteria: Record<string, string | null>, context: Record<string, JsonValue> = {}) {
    const label = String(context["label"] ?? "");
    this.calls.push({ label, state, criteria, plan: true });
    return { json: this.plans(label, this.calls.filter((call) => call.plan).length), meta: { latencyMs: 5, inputTokens: 20, outputTokens: 4, cacheHitTokens: 9, reasoningTokens: 2 } };
  }
}

export function stubJev(): JevClient {
  return {
    model: "stub",
    async ask(_state: unknown, questions: Record<string, { type: string; criteria?: Record<string, unknown> }>): Promise<JevAskResult> {
      const answers: AnswerSet = {};
      for (const [id, question] of Object.entries(questions)) {
        const first = Object.keys(question.criteria ?? {})[0] ?? "";
        answers[id] = { type: "choice", choice: first, probabilities: { [first]: 0.9 }, confidence: 0.9, raw: {} };
      }
      return { model: "stub", answers, inputTokens: 100, outputTokens: 10, latencyMs: 1, requestId: "req" };
    },
  } as unknown as JevClient;
}

const servers: TestServer[] = [];
const logs: string[] = [];

export async function play(sequence: Raw[], deepseek: FakeDeepSeek, over: Partial<AppConfig> = {}) {
  const path = join(tmpdir(), `jev-sts2-oneshot-${Date.now()}-${Math.random().toString(16).slice(2)}.jsonl`);
  logs.push(path, path.replace(/\.jsonl$/, ".states.jsonl"));
  const base = loadConfig({} as NodeJS.ProcessEnv);
  const cfg: AppConfig = {
    ...base,
    combatPlanner: "turn",
    deepseek: { apiKey: "test", baseUrl: "http://127.0.0.1:9", model: "fake", maxCalls: 50, timeoutMs: 100, guideFile: "", handbookFile: "", reasoningEffort: "off", combatReasoningEffort: "", reasoningLog: "" },
    escalation: { ...base.escalation, chain: ["deepseek"] },
    log: { ...base.log, decisionLog: path },
    ...over,
  };
  let index = 0;
  const actions: Raw[] = [];
  const at = (position: number): Raw => sequence[Math.min(position, sequence.length - 1)] as Raw;
  const server = await startTestServer((req, res) => {
    if (req.method === "GET" && req.url === "/state") return sendJson(res, 200, envelope(at(index)));
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const intent = JSON.parse(body || "{}") as Raw;
      actions.push(intent);
      index += 1;
      sendJson(res, 200, envelope({ action: intent["action"], status: "completed", stable: true, message: "scripted", state: at(index) }));
    });
  });
  servers.push(server);
  const stats = await runLoop({ config: cfg, mode: "play", client: new ModClient({ baseUrl: server.url }), jev: stubJev(), escalators: [deepseek], knowledge: loggedKnowledge, maxRuns: 1, maxDecisions: 20, pollIntervalMs: 1, restoreRun: false });
  const records = readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as Raw);
  return { stats, actions, records };
}
