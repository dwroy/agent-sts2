/**
 * Fix batch L (notes/fix-queue.md "From fix batch K" and "From post-mortems RRMY 5LRZ 5PHF UNRL"): pure bugs. One
 * describe per fix; boards are synthetic or logged fixtures (tests/logged-states/batch-l, out of the rollout-live /
 * potion-mc sweeps), never the refreshing knowledge files.
 */

import { afterEach, describe, expect, it } from "vitest";

import { DeepSeekClient, severalOptionKeys } from "../src/llm/deepseek.js";
import { selectingText } from "../src/screens/selection.js";
import { discardableSlots } from "../src/screens/potion-discard.js";
import { planMap, statuePotionOptions } from "../src/screens/map.js";
import type { PickOption } from "../src/screens/pick.js";
import { logged, loggedEnv } from "./logged.js";
import { sendJson, startTestServer, type TestServer } from "./support.js";

type Raw = Record<string, unknown>;

/** The 5LRZ F37 map: White Beast Statue, a full belt (Fruit Juice, Vulnerable Potion), a Monster node next. */
function statueBoard() {
  const fx = logged("batch-l/5lrz-f37-statue");
  const env = loggedEnv(fx);
  const nodes = ((fx.state["map"] as Raw)["available_nodes"] as Raw[]).map((node) => ({ index: node["index"] as number, row: node["row"] as number, col: node["col"] as number, type: node["node_type"] as string }));
  const go: PickOption = { key: "go", label: "travel on", intent: { action: "choose_map_node", option_index: 0 }, score: 0, why: "the route plan's next node", summary: { travel: "the route plan's next node, keeping every potion" } };
  return { fx, env, nodes, go };
}

describe("3. The discard questions' potion texts have their numbers (5LRZ F37: 「获得{MaxHp}点最大生命值」 in three statue questions)", () => {
  it("discardableSlots fills the template: Fruit Juice +5 max HP, Vulnerable Potion 3", () => {
    const { env } = statueBoard();
    const slots = discardableSlots(env);
    expect(slots.map((slot) => slot.description)).toEqual(["获得5点最大生命值。", "给予3层易伤。"]);
  });

  it("the statue question's discard variant lists them filled, no placeholder left", () => {
    const { env, nodes, go } = statueBoard();
    const options = statuePotionOptions(env, nodes)(go);
    const variant = options.find((option) => option.key === "go:discard")!;
    const listed = (variant.summary as Raw)["discardable_potions"] as Record<string, string>;
    expect(listed).toEqual({ "0": "果汁: 获得5点最大生命值。", "1": "易伤药水: 给予3层易伤。" });
    expect(JSON.stringify(options)).not.toMatch(/\{[A-Za-z]+(?::[A-Za-z]+\(\d*\))?\}/);
  });

  it("an unmeasured value reads as unknown, not as a raw placeholder (Blood Potion's HealPercent is measured: 20%)", () => {
    const { fx } = statueBoard();
    const run = fx.state["run"] as Raw;
    run["potions"] = (run["potions"] as Raw[]).map((potion) =>
      potion["index"] === 0 ? { ...potion, potion_id: "BLOOD_POTION", name: "鲜血药水", description: "回复你最大生命值的[blue]{HealPercent}[/blue]%。" } : { ...potion, potion_id: "MYSTERY_POTION", name: "谜", description: "获得[blue]{Mystery}[/blue]点。" },
    );
    const slots = discardableSlots(loggedEnv(fx));
    expect(slots.map((slot) => slot.description)).toEqual(["回复你最大生命值的20%。", "获得?(数值未知)点。"]);
  });
});

describe("2. White Beast Statue with a full belt: a \"drink it now, then travel\" option for a potion usable on the map, and the Fruit Juice fact (5LRZ F37: Fruit Juice discarded, +5 max HP lost)", () => {
  it("the options: keep all, discard first, and drink Fruit Juice first (the Vulnerable Potion is combat-only: no drink option)", () => {
    const { env, nodes, go } = statueBoard();
    const options = statuePotionOptions(env, nodes)(go);
    expect(options.map((option) => option.key)).toEqual(["go", "go:discard", "go:drink0"]);
    const drink = options[2]!;
    expect(drink.intent).toEqual({ action: "use_potion", option_index: 0 });
    expect(drink.score).toBe(go.score);
    expect((drink.summary as Raw)["potion"]).toBe("果汁: 获得5点最大生命值。");
  });

  it("keep-all says Fruit Juice is drunk by code at the next fight's first decision (its slot is free before the drop), and names the drink option", () => {
    const { env, nodes, go } = statueBoard();
    const keep = statuePotionOptions(env, nodes)(go)[0]!;
    const summary = keep.summary as Raw;
    expect(summary["fruit_juice"]).toMatch(/code drinks 果汁 \(potion slot 0\) by itself at its first decision of the next fight/);
    expect(summary["potion_slots"]).toMatch(/option go:discard\), 果汁 is drunk now on the map \(option go:drink0\) or one is drunk in that fight/);
  });

  it("chosen, it drinks; once the slot shows empty the map travels to the node (map/after-drink)", () => {
    const { fx, env, nodes, go } = statueBoard();
    const drink = statuePotionOptions(env, nodes)(go)[2]!;
    drink.apply!();
    expect(env.screenMemory.afterDiscard).toMatchObject({ place: "map", option: 0, slot: 0, via: "drink", title: "Monster (row 4, col 6)" });
    // The next frame: slot 0 empty.
    const run = fx.state["run"] as Raw;
    run["potions"] = (run["potions"] as Raw[]).map((potion) => (potion["index"] === 0 ? { ...potion, potion_id: null, name: null, description: null, occupied: false, can_use: false } : potion));
    const next = loggedEnv(fx, { screenMemory: env.screenMemory });
    const decision = planMap(next);
    expect(decision).toMatchObject({ kind: "act", label: "map/after-drink", intent: { action: "choose_map_node", option_index: 0 } });
  });

  it("no statue: no variant", () => {
    const { fx, go } = statueBoard();
    const run = fx.state["run"] as Raw;
    run["relics"] = (run["relics"] as Raw[]).filter((relic) => relic["relic_id"] !== "WHITE_BEAST_STATUE");
    const env = loggedEnv(fx);
    expect(statuePotionOptions(env, [{ index: 0, row: 4, col: 6, type: "Monster" }])(go).map((option) => option.key)).toEqual(["go"]);
  });
});

describe("4. A one-option question answered with several keys (RRMY F24 \"card2,card1\", judged failed and passed to Jev): the first is taken, said so in the reason", () => {
  let server: TestServer | null = null;
  afterEach(async () => {
    await server?.close();
    server = null;
  });
  // The RRMY F24 second pick of Feast's two commons (card5 True Grit taken on the first pick).
  const criteria = Object.fromEntries(
    ["card0", "card1", "card2", "card3", "card4", "card6", "card7"].map((key, at) => [key, JSON.stringify({ card: ["重击", "雷霆一击", "突破", "耸肩无视", "铁斩波", "愤怒", "双重打击"][at], code_value: 50 - at })]),
  );
  const reply = (content: string) =>
    startTestServer((req, res) => {
      req.on("data", () => undefined);
      req.on("end", () => sendJson(res, 200, { choices: [{ message: { content } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }));
    });

  it("severalOptionKeys: keys or names, comma / 、 / space separated, all must name an option", () => {
    expect(severalOptionKeys("card2,card1", criteria)).toEqual(["card2", "card1"]);
    expect(severalOptionKeys("card2, card1", criteria)).toEqual(["card2", "card1"]);
    expect(severalOptionKeys("突破、雷霆一击", criteria)).toEqual(["card2", "card1"]);
    expect(severalOptionKeys("card2 card1", criteria)).toEqual(["card2", "card1"]);
    expect(severalOptionKeys("card2,card5", criteria)).toBeNull(); // card5 is not offered any more
    expect(severalOptionKeys("card2", criteria)).toBeNull();
  });

  it("choose() acts on the first key and keeps the answer's words, with the note", async () => {
    server = await reply('{"choice":"card2,card1","reason":"Need AoE for Kaiser Crab: Breakthrough and Thunderclap hit both claws."}');
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: server.url, model: "m", timeoutMs: 5000 });
    const answer = await client.choose({ floor: 24 }, "Which card should I add?", criteria, { label: "selection/add" });
    expect(answer.choice).toBe("card2");
    expect(answer.reason).toBe("Need AoE for Kaiser Crab: Breakthrough and Thunderclap hit both claws. [the answer named 2 options (card2,card1) on a one-option question: the first, card2, taken]");
  });

  it("a JSON list as the choice reads the same", async () => {
    server = await reply('{"choice":["card1","card2"],"reason":"AoE"}');
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: server.url, model: "m", timeoutMs: 5000 });
    expect((await client.choose({}, "Which card should I add?", criteria, { label: "selection/add" })).choice).toBe("card1");
  });

  it("a part naming no option still fails as before", async () => {
    server = await reply('{"choice":"card2,读下封底","reason":"x"}');
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: server.url, model: "m", timeoutMs: 5000 });
    await expect(client.choose({}, "Which card should I add?", criteria, { label: "selection/add" })).rejects.toThrow('chose unknown option "card2,读下封底"');
  });

  it("the selection's pick count says one card per answer (\"2 of 2\" read as \"pick two now\")", () => {
    expect(selectingText(1, 2, 2)).toBe("pick 2 of 2: one card per answer");
    expect(selectingText(0, 2, 2)).toBe("pick 1 of 2: one card per answer; the next pick is asked after this one");
    expect(selectingText(0, 0, 3)).toBe("pick 1 of 3 (at least 0): one card per answer; any further pick is asked after this one");
  });
});
