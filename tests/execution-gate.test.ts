/**
 * The execution gate's identity check (V4 M3, src/act/identity.ts): an action is refused when its indices still
 * exist but point at something else than what was decided, for every kind of action; intents without an identity
 * keep the old legality checks; the loop logs a refusal (gate_reject) and re-plans.
 */

import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { gate } from "../src/act/gate.js";
import { checkIdentity, handSignatureOf, identityAt, wireIntent, withExpect } from "../src/act/identity.js";
import { loadConfig, type AppConfig } from "../src/config.js";
import type { AnswerSet } from "../src/jev/answers.js";
import type { JevAskResult, JevClient } from "../src/jev/client.js";
import { runLoop } from "../src/loop.js";
import { ModClient, type ActionRequest } from "../src/mod/client.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { envelope, sendJson, startTestServer, type TestServer } from "./support.js";
import {
  chestPayload,
  combatPayload,
  eventPayload,
  mapPayload,
  restPayload,
  rewardCardPayload,
  rewardClaimPayload,
  selectionPayload,
  shopPayload,
  testKnowledge,
} from "./scenarios.js";

type Raw = Record<string, unknown>;
const config = loadConfig({} as NodeJS.ProcessEnv);
const parse = (raw: Raw): GameState => parseGameState(raw);
const clone = (raw: Raw): Raw => JSON.parse(JSON.stringify(raw)) as Raw;

/** A copy of `raw` with `edit` applied to the copy. */
function edited(raw: Raw, edit: (copy: Raw) => void): Raw {
  const copy = clone(raw);
  edit(copy);
  return copy;
}

const combat = (raw: Raw): Raw => raw["combat"] as Raw;
const hand = (raw: Raw): Raw[] => combat(raw)["hand"] as Raw[];
const belt = (raw: Raw): Raw[] => (raw["run"] as Raw)["potions"] as Raw[];

/** The intent as the loop stamps it on the state it was decided on, then gated on `later`. */
function decideThenGate(decidedOn: Raw, intent: ActionRequest, later: Raw) {
  const stamped = withExpect(parse(decidedOn), intent);
  return { stamped, result: gate(parse(later), stamped) };
}

describe("identity of each kind of action", () => {
  it("play_card: the card and its target; same index, another card is refused", () => {
    const board = combatPayload();
    const bash = { action: "play_card", card_index: 2, target_index: 0 };
    const stamped = withExpect(parse(board), bash);
    expect(stamped.expect).toEqual({ card: { id: "BASH", upgraded: false }, target: { id: "JAW_WORM" }, turn: 3, from: "decision" });
    expect(gate(parse(board), stamped).ok).toBe(true);

    // The hand reordered: index 2 is now a Defend.
    const reordered = edited(board, (raw) => {
      const [strike, defend, bashCard] = hand(raw);
      combat(raw)["hand"] = [{ ...bashCard, index: 0 }, { ...strike, index: 1 }, { ...defend, index: 2 }];
    });
    const moved = gate(parse(reordered), stamped);
    expect(moved).toMatchObject({ ok: false, kind: "identity" });
    expect(moved.reason).toContain("card_index 2 is DEFEND_R, expected BASH");
    expect(moved.expected?.card).toEqual({ id: "BASH", upgraded: false });
    expect(moved.actual?.card).toEqual({ id: "DEFEND_R", upgraded: false });

    // The card was consumed (exhausted, discarded): nothing at its index any more.
    const consumed = edited(board, (raw) => {
      combat(raw)["hand"] = hand(raw).slice(0, 2);
    });
    expect(gate(parse(consumed), stamped)).toMatchObject({ ok: false, kind: "identity" });
    expect(gate(parse(consumed), stamped).reason).toContain("card_index 2 is not in the hand, expected BASH");

    // The same card, upgraded since (Armaments): not the card that was decided.
    const upgraded = edited(board, (raw) => {
      hand(raw)[2]!["upgraded"] = true;
    });
    expect(gate(parse(upgraded), stamped).reason).toContain("card_index 2 is BASH+, expected BASH");

    // A kill shifted the enemies: target 0 is now the Cultist (NEVM F23 T2).
    const shifted = edited(board, (raw) => {
      const enemies = combat(raw)["enemies"] as Raw[];
      combat(raw)["enemies"] = [{ ...enemies[1], index: 0 }];
    });
    expect(gate(parse(shifted), stamped).reason).toContain("target_index 0 is CULTIST, expected JAW_WORM");

    // The next turn: the same card at the same index, but not the turn it was decided for.
    const nextTurn = edited(board, (raw) => {
      raw["turn"] = 4;
    });
    expect(gate(parse(nextTurn), stamped).reason).toContain("turn is 4, expected 3");
  });

  it("use_potion and discard_potion: the potion in the slot", () => {
    const board = combatPayload();
    const drink = { action: "use_potion", option_index: 0, target_index: 1 };
    const swapped = edited(board, (raw) => {
      belt(raw)[0] = { ...belt(raw)[0], potion_id: "BLOCK_POTION", name: "Block Potion" };
    });
    const { stamped, result } = decideThenGate(board, drink, swapped);
    expect(stamped.expect).toMatchObject({ potion: { id: "FIRE_POTION" }, target: { id: "CULTIST" }, turn: 3 });
    expect(result.reason).toContain("potion slot 0 holds BLOCK_POTION, expected FIRE_POTION");
    const emptied = edited(board, (raw) => {
      belt(raw)[0] = { ...belt(raw)[1], index: 0 };
    });
    expect(gate(parse(emptied), stamped).reason).toContain("potion slot 0 holds nothing, expected FIRE_POTION");

    const shop = shopPayload(false, { foulPotion: true });
    const discard = decideThenGate(shop, { action: "discard_potion", option_index: 0 }, edited(shop, (raw) => {
      belt(raw)[0] = { ...belt(raw)[0], potion_id: "FIRE_POTION" };
    }));
    expect(discard.stamped.expect).toEqual({ potion: { id: "FOUL_POTION" }, from: "decision" });
    expect(discard.result).toMatchObject({ ok: false, kind: "identity" });
    expect(discard.result.reason).toContain("potion slot 0 holds FIRE_POTION, expected FOUL_POTION");
  });

  it("choose_map_node: the node's row, column and type", () => {
    const map = mapPayload();
    const moved = edited(map, (raw) => {
      const nodes = (raw["map"] as Raw)["available_nodes"] as Raw[];
      (raw["map"] as Raw)["available_nodes"] = [nodes[0], { ...nodes[2], index: 1 }, { ...nodes[1], index: 2 }];
    });
    const { stamped, result } = decideThenGate(map, { action: "choose_map_node", option_index: 1 }, moved);
    expect(stamped.expect).toEqual({ node: { row: 5, col: 3, type: "Monster" }, from: "decision" });
    expect(result.reason).toContain("map node 1 is row 5 col 4 (Shop), expected row 5 col 3 (Monster)");
    expect(gate(parse(map), stamped).ok).toBe(true);
  });

  it("event, rest, reward, chest, shop and selection options: their text or item id", () => {
    const cases: { raw: Raw; intent: ActionRequest; expect: object; change: (raw: Raw) => void; reason: string }[] = [
      {
        raw: eventPayload(),
        intent: { action: "choose_event_option", option_index: 0 },
        expect: { option: { text: "Banana" } },
        change: (raw) => {
          ((raw["event"] as Raw)["options"] as Raw[])[0]!["title"] = "Proceed";
        },
        reason: 'option 0 is "Proceed", expected "Banana"',
      },
      {
        raw: restPayload(),
        intent: { action: "choose_rest_option", option_index: 1 },
        expect: { option: { id: "SMITH" } },
        change: (raw) => {
          const options = (raw["rest"] as Raw)["options"] as Raw[];
          (raw["rest"] as Raw)["options"] = [{ ...options[1], index: 0 }, { ...options[0], index: 1 }];
        },
        reason: "option 1 is HEAL, expected SMITH",
      },
      {
        raw: rewardClaimPayload(),
        intent: { action: "claim_reward", option_index: 0 },
        expect: { option: { text: "Gold: 25 gold" } },
        change: (raw) => {
          const rewards = (raw["reward"] as Raw)["rewards"] as Raw[];
          (raw["reward"] as Raw)["rewards"] = [{ ...rewards[1], index: 0 }];
        },
        reason: 'option 0 is "Card: Add a card", expected "Gold: 25 gold"',
      },
      {
        raw: rewardCardPayload(),
        intent: { action: "choose_reward_card", option_index: 2 },
        expect: { option: { id: "INFLAME" } },
        change: (raw) => {
          ((raw["reward"] as Raw)["card_options"] as Raw[])[2]!["card_id"] = "ANGER";
        },
        reason: "option 2 is ANGER, expected INFLAME",
      },
      {
        raw: selectionPayload(),
        intent: { action: "select_deck_card", option_index: 1 },
        expect: { option: { id: "BASH+" } },
        change: (raw) => {
          ((raw["selection"] as Raw)["cards"] as Raw[])[1]!["upgraded"] = false;
        },
        reason: "option 1 is BASH, expected BASH+",
      },
      {
        raw: chestPayload(true),
        intent: { action: "choose_treasure_relic", option_index: 0 },
        expect: { option: { id: "VAJRA" } },
        change: (raw) => {
          ((raw["chest"] as Raw)["relic_options"] as Raw[])[0]!["relic_id"] = "ANCHOR";
        },
        reason: "option 0 is ANCHOR, expected VAJRA",
      },
      {
        raw: shopPayload(true),
        intent: { action: "buy_card", option_index: 0 },
        expect: { option: { id: "POMMEL_STRIKE" } },
        change: (raw) => {
          ((raw["shop"] as Raw)["cards"] as Raw[])[0]!["card_id"] = "INFLAME";
        },
        reason: "option 0 is INFLAME, expected POMMEL_STRIKE",
      },
      {
        raw: shopPayload(true),
        intent: { action: "buy_relic", option_index: 0 },
        expect: { option: { id: "VAJRA" } },
        change: (raw) => {
          ((raw["shop"] as Raw)["relics"] as Raw[])[0]!["relic_id"] = "ANCHOR";
        },
        reason: "option 0 is ANCHOR, expected VAJRA",
      },
    ];
    for (const entry of cases) {
      const { stamped, result } = decideThenGate(entry.raw, entry.intent, edited(entry.raw, entry.change));
      expect(stamped.expect, entry.intent.action).toEqual({ ...entry.expect, from: "decision" });
      expect(gate(parse(entry.raw), stamped).ok, entry.intent.action).toBe(true);
      expect(result, entry.intent.action).toMatchObject({ ok: false, kind: "identity" });
      expect(result.reason, entry.intent.action).toContain(entry.reason);
    }
  });

  it("an intent without an identity only gets the legality checks, as before", () => {
    const board = combatPayload();
    const reordered = edited(board, (raw) => {
      const [strike, defend, bash] = hand(raw);
      combat(raw)["hand"] = [{ ...bash, index: 0 }, { ...strike, index: 1 }, { ...defend, index: 2 }];
    });
    // Old intent: index 2 is legal on the new hand (a Defend), so it passes as it always did.
    expect(gate(parse(reordered), { action: "play_card", card_index: 2 })).toEqual({ ok: true, reason: "legal" });
    expect(checkIdentity(parse(reordered), { action: "play_card", card_index: 2 })).toBeNull();
    // Actions without an index carry nothing to check outside combat.
    expect(withExpect(parse(mapPayload()), { action: "proceed" })).toEqual({ action: "proceed" });
    // Legality still comes first when the action is not offered at all.
    expect(gate(parse(mapPayload()), withExpect(parse(board), { action: "play_card", card_index: 0 }))).toMatchObject({ ok: false, kind: "legality" });
  });

  it("the identity never reaches the mod", () => {
    const stamped = withExpect(parse(combatPayload()), { action: "play_card", card_index: 0, target_index: 0 });
    expect(stamped.expect).toBeDefined();
    expect(wireIntent(stamped)).toEqual({ action: "play_card", card_index: 0, target_index: 0 });
    expect(identityAt(parse(combatPayload()), { action: "end_turn" })).toEqual({ turn: 3 });
    expect(handSignatureOf(combatPayload())).toBe("BASH,DEFEND_R,STRIKE_R");
  });
});

/* ---- the loop: a refusal is logged and re-planned ------------------------------------------------------ */

const servers: TestServer[] = [];
const logs: string[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  for (const path of logs.splice(0)) rmSync(path, { force: true });
});

function testConfig(): AppConfig {
  const path = join(tmpdir(), `jev-sts2-gate-${Date.now()}-${Math.random().toString(16).slice(2)}.jsonl`);
  logs.push(path, path.replace(/\.jsonl$/, ".states.jsonl"));
  return { ...config, combatPlanner: "card", log: { ...config.log, decisionLog: path } };
}

/** A mod that serves `reads[n]` on the n-th state read (the last one repeats) and records the actions posted. */
async function readScriptedMod(reads: Raw[]): Promise<{ server: TestServer; actions: Raw[] }> {
  let n = 0;
  const actions: Raw[] = [];
  const at = (i: number): Raw => reads[Math.min(i, reads.length - 1)]!;
  const server = await startTestServer((req, res) => {
    if (req.method === "GET" && req.url === "/state") {
      const state = at(n);
      n += 1;
      return sendJson(res, 200, envelope(state));
    }
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const intent = JSON.parse(body || "{}") as Raw;
      actions.push(intent);
      sendJson(res, 200, envelope({ action: intent["action"], status: "completed", stable: true, message: "scripted", state: at(n) }));
    });
  });
  servers.push(server);
  return { server, actions };
}

/** Answers every choice question with its first option. */
function stubJev(): { client: JevClient; calls: () => number } {
  let calls = 0;
  const client = {
    model: "stub",
    async ask(_state: unknown, questions: Record<string, { type: string; criteria?: Record<string, unknown> }>): Promise<JevAskResult> {
      calls += 1;
      const answers: AnswerSet = {};
      for (const [id, question] of Object.entries(questions)) {
        const first = Object.keys(question.criteria ?? {})[0] ?? "";
        answers[id] = question.type === "choice" ? { type: "choice", choice: first, probabilities: { [first]: 0.9 }, confidence: 0.9, raw: {} } : { type: "noul", noul: 0.5, raw: {} };
      }
      return { model: "stub", answers, inputTokens: 100, outputTokens: 10, latencyMs: 1, requestId: `req_${calls}` };
    },
  } as unknown as JevClient;
  return { client, calls: () => calls };
}

const rows = (path: string): Raw[] => readFileSync(path, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Raw);

describe("the loop refuses an action whose indices moved, logs it and re-plans", () => {
  it("a reward list that changed between deciding and sending (same fingerprint): refused at dispatch, then the new one is claimed", async () => {
    const decided = rewardClaimPayload();
    // Same indices (the fingerprint only has those), but reward 0 is now a potion.
    const changed = edited(decided, (raw) => {
      ((raw["reward"] as Raw)["rewards"] as Raw[])[0] = { index: 0, reward_type: "Potion", description: "Fire Potion", claimable: true };
    });
    const { server, actions } = await readScriptedMod([decided, changed]);
    const cfg = testConfig();
    const notes: string[] = [];
    const stats = await runLoop({
      config: cfg,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: null,
      knowledge: testKnowledge,
      maxDecisions: 1,
      pollIntervalMs: 1,
      onEvent: (event) => {
        if (event.type === "note") notes.push(event.message);
      },
    });

    // Nothing was sent for the Gold; the re-planned claim went out once, without the gate's identity in it.
    expect(actions).toEqual([{ action: "claim_reward", option_index: 0 }]);
    expect(stats.acts).toBe(1);
    expect(notes.some((note) => note.startsWith("gate rejected claim_reward at dispatch: not what was decided"))).toBe(true);

    const [refused, played] = rows(cfg.log.decisionLog);
    expect(refused).toMatchObject({
      label: "reward/claim",
      chosen: { action: "claim_reward", option_index: 0 },
      expect: { option: { text: "Gold: 25 gold" }, from: "decision" },
      gate_reject: {
        at: "dispatch",
        kind: "identity",
        reason: 'not what was decided: option 0 is "Potion: Fire Potion", expected "Gold: 25 gold"',
        expected: { option: { text: "Gold: 25 gold" }, from: "decision" },
        actual: { option: { text: "Potion: Fire Potion" } },
      },
    });
    expect(String(refused!["result"])).toMatch(/^not dispatched: gate refused \(dispatch\): /);
    expect(typeof refused!["decision_id"]).toBe("string");
    expect(played).toMatchObject({ label: "reward/claim", chosen: { action: "claim_reward", option_index: 0 }, expect: { option: { text: "Potion: Fire Potion" } } });
    expect(played!["gate_reject"]).toBeUndefined();
    expect(String(played!["result"])).toMatch(/^completed/);
  });

  it("a map node that moved under Jev's answer: refused, the answer is not reused, Jev is asked again on the live map", async () => {
    const decided = mapPayload();
    // The same three indices, but the nodes behind 0 and 1 swapped.
    const changed = edited(decided, (raw) => {
      const nodes = (raw["map"] as Raw)["available_nodes"] as Raw[];
      (raw["map"] as Raw)["available_nodes"] = [{ ...nodes[1], index: 0 }, { ...nodes[0], index: 1 }, nodes[2]];
    });
    const { server, actions } = await readScriptedMod([decided, decided, changed]);
    const cfg = testConfig();
    const jev = stubJev();
    await runLoop({
      config: cfg,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: jev.client,
      knowledge: testKnowledge,
      maxDecisions: 1,
      pollIntervalMs: 1,
    });

    const logged = rows(cfg.log.decisionLog);
    const refused = logged.find((row) => row["gate_reject"] !== undefined);
    expect(refused).toBeDefined();
    const reject = refused!["gate_reject"] as Raw;
    expect(reject["at"]).toBe("dispatch");
    expect(String(reject["reason"])).toContain("map node");
    // The refused answer was paid for: its tokens are in the row.
    expect(refused!["usage"]).toMatchObject({ input_tokens: 100, output_tokens: 10 });
    // Asked again on the live map (the memo was dropped), and what went out is a node of the live map.
    expect(jev.calls()).toBe(2);
    expect(actions).toHaveLength(1);
    const sent = logged.at(-1)!;
    expect(sent["gate_reject"]).toBeUndefined();
    const node = (sent["expect"] as Raw)["node"] as Raw;
    const live = ((changed["map"] as Raw)["available_nodes"] as Raw[]).find((entry) => entry["index"] === actions[0]!["option_index"])!;
    expect(node).toEqual({ row: live["row"], col: live["col"], type: live["node_type"] });
  });
});
