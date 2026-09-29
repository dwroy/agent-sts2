/**
 * The execution gate's identity check (V4 M3, src/act/identity.ts): an action is refused when its indices still
 * exist but point at something else than what was decided, for every kind of action; a combat line's steps carry
 * the line's own card, enemy, potion, turn and hand; intents without an identity keep the old legality checks;
 * the loop logs a refusal (gate_reject) and re-plans.
 */

import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { gate } from "../src/act/gate.js";
import { checkIdentity, handSignatureOf, identityAt, wireIntent, withExpect } from "../src/act/identity.js";
import { loadConfig, type AppConfig } from "../src/config.js";
import type { AnswerSet } from "../src/jev/answers.js";
import type { JevAskResult, JevClient } from "../src/jev/client.js";
import { runLoop } from "../src/loop.js";
import { ModClient, type ActionRequest } from "../src/mod/client.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { continueAfterDiscard } from "../src/screens/potion-discard.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { logged } from "./logged.js";
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

/* ---- a combat line's steps ------------------------------------------------------------------------------ */

function env(raw: Raw, overrides: Partial<DecisionEnv> = {}): DecisionEnv {
  const state = parse(raw);
  return {
    state,
    knowledge: testKnowledge,
    brief: buildRunBrief(state, testKnowledge),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    screenMemory: createScreenMemory(state.screen),
    shopDiscardPotions: [],
    ...overrides,
  };
}

/** Fire Potion (slot 0) and Strength Potion (slot 1); Strike, Defend, Bash in hand; two small attackers. */
function strengthBoard(): Raw {
  const raw = combatPayload();
  combat(raw)["enemies"] = (combat(raw)["enemies"] as Raw[]).map((enemy) => ({ ...enemy, intents: [{ index: 0, intent_type: "Attack", label: "8", damage: 8, hits: 1, total_damage: 8 }] }));
  belt(raw)[1] = { ...belt(raw)[0], index: 1, potion_id: "STRENGTH_POTION", name: "Strength Potion", description: "获得 2 点力量。", requires_target: false, target_type: "Self", valid_target_indices: [] };
  return raw;
}
const drunk = (raw: Raw, slot: number): Raw => {
  belt(raw)[slot] = { index: slot, potion_id: null, name: null, description: null, occupied: false, can_use: false, can_discard: false, requires_target: false, valid_target_indices: [] };
  return raw;
};
const played = (raw: Raw, cardId: string): Raw => {
  const at = hand(raw).findIndex((card) => card["card_id"] === cardId);
  combat(raw)["hand"] = hand(raw).filter((_, i) => i !== at).map((card, index) => ({ ...card, index }));
  return raw;
};
/** Jev picks the shown line that plays exactly this; the loop stamps and plays its first step. */
const pickLine = (e: DecisionEnv, plays: string) => {
  const decision = planCombatTurn(e) as AskDecision;
  const criteria = (decision.jevView?.questions ?? decision.questions)["plan"]!.criteria as Record<string, string | null>;
  const key = Object.keys(criteria).find((k) => k.startsWith("plan") && JSON.parse(String(criteria[k]))["plays"] === plays);
  expect(key, Object.values(criteria).join("\n")).toBeDefined();
  const resolved = decision.resolve({ plan: { type: "choice", choice: key!, probabilities: { [key!]: 0.9 }, confidence: 0.9, raw: {} } });
  resolved.apply?.();
  return withExpect(e.state, resolved.intent!);
};
/** The next step of the committed line on `raw` (the loop's next pass). */
const step = (raw: Raw, e: DecisionEnv): ActionRequest => {
  const decision = planCombatTurn(env(raw, { screenMemory: e.screenMemory }));
  expect(decision?.label).toBe("combat/plan-continue");
  return decision!.kind === "act" ? withExpect(parse(raw), decision!.intent) : { action: "none" };
};

describe("a combat line's steps are checked against the line (hand order, consumed cards, the belt)", () => {
  const LINE = "DEFEND_R, then potion Strength Potion, then BASH -> JAW_WORM, then potion Fire Potion -> JAW_WORM";
  beforeEach(() => {
    rolloutLiveOptions.enabled = false;
  });
  afterEach(() => {
    rolloutLiveOptions.enabled = true;
  });

  it("each step carries the line's card or potion, its target, turn and expected hand, and passes on the board it expects", () => {
    const e = env(strengthBoard());
    const first = pickLine(e, LINE);
    expect(wireIntent(first)).toEqual({ action: "play_card", card_index: 1 });
    expect(first.expect).toMatchObject({ card: { id: "DEFEND_R" }, turn: 3, from: "decision" });

    const afterDefend = played(strengthBoard(), "DEFEND_R");
    const drink = step(afterDefend, e);
    expect(wireIntent(drink)).toEqual({ action: "use_potion", option_index: 1 });
    expect(drink.expect).toEqual({ from: "line", potion: { id: "STRENGTH_POTION" }, turn: 3, hand: "BASH,STRIKE_R", enemies: "0:JAW_WORM|1:CULTIST" });
    expect(gate(parse(afterDefend), drink).ok).toBe(true);

    const afterDrink = drunk(played(strengthBoard(), "DEFEND_R"), 1);
    const bash = step(afterDrink, e);
    expect(wireIntent(bash)).toEqual({ action: "play_card", card_index: 1, target_index: 0 });
    expect(bash.expect).toEqual({ from: "line", card: { id: "BASH", upgraded: false }, target: { id: "JAW_WORM" }, turn: 3, hand: "BASH,STRIKE_R", enemies: "0:JAW_WORM|1:CULTIST" });
    expect(gate(parse(afterDrink), bash).ok).toBe(true);

    const fire = step(drunk(played(played(strengthBoard(), "DEFEND_R"), "BASH"), 1), e);
    expect(fire.expect).toEqual({ from: "line", potion: { id: "FIRE_POTION" }, target: { id: "JAW_WORM" }, turn: 3, hand: "STRIKE_R", enemies: "0:JAW_WORM|1:CULTIST" });
  });

  it("the belt changed under a potion step: another potion in the slot is refused", () => {
    const e = env(strengthBoard());
    pickLine(e, LINE);
    const afterDefend = played(strengthBoard(), "DEFEND_R");
    const drink = step(afterDefend, e);
    const swapped = edited(afterDefend, (raw) => {
      belt(raw)[1] = { ...belt(raw)[1], potion_id: "SPEED_POTION", name: "Speed Potion" };
    });
    const result = gate(parse(swapped), drink);
    expect(result).toMatchObject({ ok: false, kind: "identity" });
    expect(result.reason).toContain("potion slot 1 holds SPEED_POTION, expected STRENGTH_POTION");
  });

  it("a drink left over from a line cut short by a draw is refused (C batch: 220 such drinks in 112 runs)", () => {
    const e = env(strengthBoard());
    pickLine(e, LINE);
    const afterDefend = played(strengthBoard(), "DEFEND_R");
    const drink = step(afterDefend, e);
    // The same belt, but the hand grew by a drawn card: not the board the line planned this drink on.
    const drew = edited(afterDefend, (raw) => {
      combat(raw)["hand"] = [...hand(raw), { ...hand(raw)[0], index: 2, card_id: "POMMEL_STRIKE", name: "POMMEL_STRIKE" }];
    });
    const result = gate(parse(drew), drink);
    expect(result).toMatchObject({ ok: false, kind: "identity" });
    expect(result.reason).toContain("the hand is [BASH,POMMEL_STRIKE,STRIKE_R], the line expected [BASH,STRIKE_R]");
    expect(result.expected?.hand).toBe("BASH,STRIKE_R");
    expect(result.actual?.hand).toBe("BASH,POMMEL_STRIKE,STRIKE_R");
  });

  it("XMK1 F33 T3 (logged): the Blood Potion drunk after Battle Trance cut Jev's line is refused, the line expected another hand", () => {
    // Jev's line "战斗专注, 上勾拳 -> 无厌沙虫, 防御, potion 鲜血药水"; Battle Trance drew three cards and code drank the potion.
    const ask = logged("xmk1-f33-t3-ask");
    const cut = logged("xmk1-f33-t3-cut");
    expect(cut.decision.chosen).toEqual({ action: "use_potion", option_index: 1 });
    const beforeDrink = hand(ask.state).filter((card) => !["BATTLE_TRANCE", "UPPERCUT", "DEFEND_IRONCLAD"].includes(String(card["card_id"])));
    const lineHand = beforeDrink.map((card) => `${String(card["card_id"])}${card["upgraded"] ? "+" : ""}`).sort().join(",");
    const drink: ActionRequest = { action: "use_potion", option_index: 1, expect: { from: "line", potion: { id: "BLOOD_POTION" }, turn: 3, hand: lineHand } };
    const refused = gate(parse(cut.state), drink);
    expect(refused).toMatchObject({ ok: false, kind: "identity" });
    expect(refused.reason).toContain("the hand is [BASH+,DEFEND_IRONCLAD,FIGHT_ME+,HEADBUTT,INFERNO,PYRE,STRIKE_IRONCLAD,UPPERCUT], the line expected [BASH+,HEADBUTT,STRIKE_IRONCLAD]");
    // On the board the line meant (its three cards played, nothing drawn) the same drink goes through.
    const meant = edited(cut.state, (raw) => {
      combat(raw)["hand"] = beforeDrink.map((card, index) => ({ ...card, index }));
    });
    expect(gate(parse(meant), drink)).toEqual({ ok: true, reason: "legal" });
  });

  it("a card step: the hand reordered, the card consumed, the target shifted, a new turn are all refused", () => {
    const e = env(strengthBoard());
    pickLine(e, LINE);
    step(played(strengthBoard(), "DEFEND_R"), e);
    const board = drunk(played(strengthBoard(), "DEFEND_R"), 1);
    const bash = step(board, e);
    expect(gate(parse(board), bash).ok).toBe(true);

    const reordered = edited(board, (raw) => {
      const [strike, bashCard] = hand(raw);
      combat(raw)["hand"] = [{ ...bashCard, index: 0 }, { ...strike, index: 1 }];
    });
    expect(gate(parse(reordered), bash).reason).toContain("card_index 1 is STRIKE_R, expected BASH");

    const consumed = edited(board, (raw) => {
      combat(raw)["hand"] = hand(raw).slice(0, 1);
    });
    expect(gate(parse(consumed), bash)).toMatchObject({ ok: false, kind: "identity" });
    expect(gate(parse(consumed), bash).reason).toContain("card_index 1 is not in the hand, expected BASH");

    const shifted = edited(board, (raw) => {
      const enemies = combat(raw)["enemies"] as Raw[];
      combat(raw)["enemies"] = [{ ...enemies[1], index: 0 }, { ...enemies[0], index: 1 }];
    });
    expect(gate(parse(shifted), bash).reason).toContain("target_index 0 is CULTIST, expected JAW_WORM");

    // An enemy died since the line was chosen (not the target): not the board the line planned this step on.
    const killed = edited(board, (raw) => {
      combat(raw)["enemies"] = [(combat(raw)["enemies"] as Raw[])[0]];
    });
    expect(gate(parse(killed), bash).reason).toContain("the enemies are [0:JAW_WORM], the line expected [0:JAW_WORM|1:CULTIST]");

    const later = edited(board, (raw) => {
      raw["turn"] = 4;
    });
    expect(gate(parse(later), bash).reason).toContain("turn is 4, expected 3");
  });
});

describe("a later discard of an option chosen with discards keeps the potion it was chosen for", () => {
  it("another potion in that slot is refused", () => {
    const raw = edited(restPayload(), (copy) => {
      copy["available_actions"] = ["choose_rest_option", "discard_potion"];
    });
    const e = env(raw);
    e.screenMemory.afterDiscard = { place: "rest", runId: "TESTRUN123", floor: 9, option: 0, title: "Rest", at: Date.now(), slot: 1, more: [0], moreIds: ["FIRE_POTION"] };
    const decision = continueAfterDiscard(e, "rest", "rest", () => null);
    expect(decision && decision.kind === "act" ? decision.intent : null).toEqual({ action: "discard_potion", option_index: 0, expect: { potion: { id: "FIRE_POTION" } } });
    const intent = withExpect(parse(raw), (decision as { intent: ActionRequest }).intent);
    expect(gate(parse(raw), intent).ok).toBe(true);
    const swapped = edited(raw, (copy) => {
      belt(copy)[0] = { ...belt(copy)[0], potion_id: "BLOCK_POTION" };
    });
    // The planner's own potion (the one the answer named) wins over what the slot holds when the step is made.
    expect(withExpect(parse(swapped), (decision as { intent: ActionRequest }).intent).expect).toEqual({ potion: { id: "FIRE_POTION" }, from: "decision" });
    expect(gate(parse(swapped), intent).reason).toContain("potion slot 0 holds BLOCK_POTION, expected FIRE_POTION");
    expect(e.screenMemory.afterDiscard).toMatchObject({ slot: 0, more: [], moreIds: [] });
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

/* ---- repeated refusals on one board: the count survives a decision-time pass, and has a way out -------- */

/** A mod that serves `serve(n)` on the n-th state read and records the actions posted. */
async function readFnMod(serve: (n: number) => Raw): Promise<{ server: TestServer; actions: Raw[] }> {
  let n = 0;
  const actions: Raw[] = [];
  const server = await startTestServer((req, res) => {
    if (req.method === "GET" && req.url === "/state") {
      const state = serve(n);
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
      sendJson(res, 200, envelope({ action: intent["action"], status: "completed", stable: true, message: "scripted", state: serve(n) }));
    });
  });
  servers.push(server);
  return { server, actions };
}

describe("refusals on the re-read before sending add up per board", () => {
  it("combat: a play refused at dispatch every time (the gate passes at decision) ends the turn after the limit", async () => {
    const decided = combatPayload();
    // Every card upgraded on the re-read: the fingerprint (index:id:playable) is the same, any play_card is refused.
    const upgraded = edited(decided, (raw) => {
      for (const card of hand(raw)) card["upgraded"] = true;
    });
    // Two reads per pass (the state, the re-read before sending): decided, then upgraded; after 40 reads it settles.
    const { server, actions } = await readFnMod((n) => (n < 40 && n % 2 === 1 ? upgraded : decided));
    const cfg = testConfig();
    const notes: string[] = [];
    await runLoop({
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

    // Three refusals on the same board, then the turn ended instead of re-planning the same play again.
    expect(actions[0]).toEqual({ action: "end_turn" });
    // (The same refusal on the same board is logged once; the notes say each one.)
    expect(notes.filter((note) => note.startsWith("gate rejected play_card at dispatch"))).toHaveLength(3);
    expect(notes.some((note) => note.startsWith("gate rejected 3 actions on this board: ending the turn instead of play_card"))).toBe(true);
  });

  it("a non-combat screen refused at dispatch every time: code's baseline decides after the limit (Jev is not asked again)", async () => {
    const decided = mapPayload();
    const swapped = edited(decided, (raw) => {
      const nodes = (raw["map"] as Raw)["available_nodes"] as Raw[];
      (raw["map"] as Raw)["available_nodes"] = [{ ...nodes[1], index: 0 }, { ...nodes[0], index: 1 }, { ...nodes[2], index: 2 }];
      for (const node of (raw["map"] as Raw)["available_nodes"] as Raw[]) node["row"] = 9;
    });
    // With Jev, three reads per pass (the state, the check before asking, the re-read before sending): the third
    // is refused; code's baseline asks nobody, so its two reads both see the decided map and it is sent.
    const { server, actions } = await readFnMod((n) => (n < 60 && n % 3 === 2 ? swapped : decided));
    const cfg = testConfig();
    const jev = stubJev();
    const notes: string[] = [];
    await runLoop({
      config: cfg,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: jev.client,
      knowledge: testKnowledge,
      maxDecisions: 1,
      pollIntervalMs: 1,
      onEvent: (event) => {
        if (event.type === "note") notes.push(event.message);
      },
    });

    expect(jev.calls()).toBe(3);
    expect(actions).toHaveLength(1);
    expect(notes).toContain("gate refused 3 times on this board: playing code's baseline decision next");
    const sent = rows(cfg.log.decisionLog).at(-1)!;
    expect(sent["gate_reject"]).toBeUndefined();
    expect(sent["decider"]).toBe("code-fallback");
    expect(String(sent["rationale"])).toMatch(/^code baseline after 3 gate refusals on this board: /);
  });

  it("refusals that go on (code's baseline refused too) reach the stall note: a decision-time pass does not reset it", async () => {
    const decided = rewardClaimPayload();
    const changed = edited(decided, (raw) => {
      ((raw["reward"] as Raw)["rewards"] as Raw[])[0] = { index: 0, reward_type: "Potion", description: "Fire Potion", claimable: true };
    });
    const { server, actions } = await readFnMod((n) => (n < 70 && n % 2 === 1 ? changed : decided));
    const cfg = testConfig();
    const notes: string[] = [];
    await runLoop({
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

    expect(notes.some((note) => note.startsWith("stuck for 25 polls on REWARD"))).toBe(true);
    // Once the reads settle, the claim goes out.
    expect(actions).toEqual([{ action: "claim_reward", option_index: 0 }]);
  });
});
