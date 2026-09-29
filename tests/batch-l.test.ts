/**
 * Fix batch L (notes/fix-queue.md "From fix batch K" and "From post-mortems RRMY 5LRZ 5PHF UNRL"): pure bugs. One
 * describe per fix; boards are synthetic or logged fixtures (tests/logged-states/batch-l, out of the rollout-live /
 * potion-mc sweeps), never the refreshing knowledge files.
 */

import { describe, expect, it } from "vitest";

import { discardableSlots } from "../src/screens/potion-discard.js";
import { statuePotionOptions } from "../src/screens/map.js";
import type { PickOption } from "../src/screens/pick.js";
import { logged, loggedEnv } from "./logged.js";

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
