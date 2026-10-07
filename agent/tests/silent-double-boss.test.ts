import { afterEach, describe, expect, it, vi } from "vitest";
import { parseGameState } from "../src/hand/mod/schema.js";
import { doubleBossFor, firstDoubleBoss, type DoubleBossModel } from "../src/knowledge/double-boss.js";
import { continuationCost } from "../src/reflex/continuation-value.js";
import { modelPotion } from "../src/reflex/card-model.js";
import { potionCostFrom, potionCostOptions } from "../src/reflex/potion-cost.js";
import { rolloutDecision, type RolloutInput } from "../src/reflex/rollout.js";
import { solveTurn, weightsFor } from "../src/reflex/turn-solver.js";
import { BossSimPool, continuationInput, fightSample, runBossSim, slimInput } from "../src/sim/boss-sim.js";
import { compareOptions } from "../src/sim/build-sim.js";
import { SerialDeckRunner } from "../src/sim/build-sim-pool.js";
import { hpAfterRoom, roomCostModel } from "../src/sim/route-projection.js";
import { syntheticBossStart } from "../src/sim/boss-start.js";
import * as bossStart from "../src/sim/boss-start.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { withDoubleBossStart } from "../src/sim/double-boss-start.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { loggedKnowledge } from "./logged.js";
import { board as loggedBoard } from "./oneshot-support.js";
import { board, card } from "./boss-sim-fixture.js";

// Test utilities are deliberately synthetic; production parameters are fitted separately from logs.
const model: DoubleBossModel = { character: "silent", ascension: 10, act: 3, firstFloor: 48, secondFloor: 49,
  effect: "LEVEL_10", evidence: [{ run: "JMH5C51RLN4E", floor: 48, turn: 13 }],
  value: { hp: [[0,0],[60,40]], source: "fixed fixture" }, potionHp: { POISON_POTION: 3 }, poisonPotionAmount: 6,
  secondBosses: [{ boss: "TEST_SUBJECT", count: 1 }], limitation: "four runs; no actual second win" };
const state = (character = "SILENT", ascension = 10, floor = 48, effect = true) => parseGameState({
  state_version: 16, session: { mode:"singleplayer",phase:"run" },
  run_id: "fixed", screen: "COMBAT", in_combat: true, turn: 1, available_actions: [],
  run: { character_id: character, ascension, act_id: "2", floor, current_hp: 50, max_hp: 60,
    ascension_effects: effect ? [{ id: "LEVEL_10" }] : [] },
});
const enabled = potionCostOptions.enabled;
afterEach(() => { potionCostOptions.enabled = enabled; });

function sequence(): { input: RolloutInput; plan: ReturnType<typeof solveTurn>["plans"][number]; second: RolloutInput } {
  const input = board({ bossHp: 6, playerHp: 20 });
  input.solver = { ...input.solver, hand: [card(0, "FIXED_ATTACK", { cost: 0, damage: 6, hpLoss: 12 })] };
  input.piles.handBase = input.solver.hand;
  const plan = solveTurn(input.solver).plans.find((p) => p.outcome.winsFight)!;
  const base = board({ bossHp: 6, playerHp: 20 });
  const second: RolloutInput = { ...base, solver: { ...base.solver, hand: [] }, plans: [],
    piles: { draw: [card(5,"FIXED_FINISH",{ damage: 6 })], discard: [], handBase: [] },
    options: { drawFirst: 0, policyNodes: 100 }, captureResources: true };
  input.continuation = { variants: [{ boss: "FIXED_SECOND", count: 1, input: second }], potions: [], source: "fixed", limitation: "fixed" };
  return { input, plan, second };
}

describe("Silent observed double boss", () => {
  it("requires character, exact observed level, act and effect; F49 has no following-fight value", () => {
    expect(firstDoubleBoss(state(), model)).toBe(model);
    for (const s of [state("IRONCLAD"),state("SILENT",9),state("SILENT",11),state("SILENT",10,49),state("SILENT",10,48,false)]) expect(firstDoubleBoss(s, model)).toBeNull();
    expect(doubleBossFor(parseGameState({ ...state().raw, run: { ...state().run?.raw, act_id: "1" } }), model)).toBeNull();
  });

  it("prices an observed following-fight potion even without a character table; ordinary boss cost stays zero", () => {
    potionCostOptions.enabled = true;
    const reserved = potionCostFrom(null,"POISON_POTION",10,3,"boss",undefined,{ potionHp:model.potionHp,source:model.value.source });
    expect(reserved.hp).toBe(3);
    expect(reserved.continuation).toBe("fixed fixture");
    expect(potionCostFrom(null,"POISON_POTION",10,3,"boss").hp).toBe(0);
    potionCostOptions.enabled = false;
    expect(potionCostFrom(null,"POISON_POTION",10,3,"boss",undefined,{ potionHp:model.potionHp,source:model.value.source }).hp).toBe(0);
  });

  it("models the verified six poison only when the caller supplies character evidence", () => {
    expect(modelPotion("POISON_POTION","毒药水",0,[0])).toBeNull();
    const potion = modelPotion("POISON_POTION","毒药水",0,[0],{ enemyTargets:[0],strength:0,weak:false,observedPoison:6 })!;
    expect(potion.poison).toBe(6);
    const input = board();
    const played = solveTurn({ ...input.solver,hand:[potion] }).plans.find((p) => p.steps.length === 1)!;
    expect(played.outcome.damageDealt).toBe(6);
  });

  it("values HP left on a killing line in both the live solver and the rollout terminal", () => {
    const input = board({ bossHp:6,playerHp:50 });
    input.solver = { ...input.solver, hand:[card(0,"FIXED_ATTACK",{ damage:6,hpLoss:8 })] };
    input.piles.handBase = input.solver.hand;
    const base = solveTurn(input.solver).plans.find((p) => p.outcome.winsFight)!;
    const solver = { ...input.solver,continuationValue:model.value };
    const plan = solveTurn(solver).plans.find((p) => p.outcome.winsFight)!;
    const reserve = continuationCost(model.value,50,42);
    expect(base.score-plan.score).toBeCloseTo(weightsFor(solver).hp*reserve);
    const out = rolloutDecision({ ...input,solver,plans:[plan],options:{ horizon:1,samples:1,budgetMs:1e8 } }).lines[0]!;
    expect(out.winProb).toBe(1);
    expect(out.value).toBeCloseTo(-8-reserve);
  });

  it("passes the actual eight HP to F49: both independent fights win at 20 HP, the continuous pair loses", () => {
    const { input,plan,second } = sequence();
    expect(fightSample({ ...input,continuation:undefined },plan,7,5).won).toBe(true);
    expect(fightSample(second,null,7,5).won).toBe(true);
    const paired = fightSample(input,plan,7,5);
    expect(paired.won).toBe(false);
    expect(paired.died).toBe(true);
    expect(paired.sequence).toMatchObject({ firstWon:true,firstHp:8,secondDied:true });
    const summary = runBossSim(input,[plan],{ samples:3,maxTurns:5,potionHold:0 }).lines[0]!;
    expect(summary.sequence).toEqual({ firstWins:3,firstWinSecondDeaths:3,secondUnfinished:0 });
    expect(summary.winProb).toBe(0);
  });

  it("keeps duplicate-id slots distinct and spends an automatic revive once", () => {
    const { input,plan,second } = sequence();
    const fairy = { source:"FAIRY_IN_A_BOTTLE",name:"Fairy",hp:24 };
    input.solver.player.revives = [fairy];
    input.continuation!.potions = [{ key:"POTION:BLOCK_POTION:0",id:"BLOCK_POTION" },{ key:"POTION:BLOCK_POTION:1",id:"BLOCK_POTION" },{ key:"POTION:FAIRY_IN_A_BOTTLE:2",id:"FAIRY_IN_A_BOTTLE" }];
    second.solver.hand = [modelPotion("BLOCK_POTION","Block",0,[])!,modelPotion("BLOCK_POTION","Block",1,[])!];
    second.solver.player.revives = [fairy];
    const first = { ...fightSample({ ...input,continuation:undefined },plan,7,5),resources:{ hp:8,revives:[],drunkKeys:["POTION:BLOCK_POTION:0"] } };
    const next = continuationInput(input,first,second);
    expect(next.potions).toEqual(["POTION:BLOCK_POTION:1"]);
    expect(next.input.solver.hand.map((p) => p.cardId)).toEqual(next.potions);
    expect(next.input.solver.player.hp).toBe(8);
    expect(next.input.solver.player.revives).toEqual([]);
  });

  it("slimming keeps the continuation in worker input and does not calibrate two-fight results as single fights", async () => {
    const { input,plan } = sequence();
    expect(slimInput(input).continuation?.variants).toHaveLength(1);
    const pool = new BossSimPool(1);
    try {
      const parallel = await pool.run(input,[plan],{ samples:2,maxTurns:5,potionHold:0 });
      expect(parallel.lines[0]!.sequence?.firstWinSecondDeaths).toBe(2);
    } finally { await pool.close(); }
    const result = await compareOptions(new SerialDeckRunner(),input,[],{ samples:2,deadlineMs:1e8 });
    expect(result.base.winCal).toBe(result.base.win);
  });

  it("keeps shipped silent-0163's post-boss route HP unknown", () => {
    expect(hpAfterRoom("Boss",60,roomCostModel(3,10,60),"median")).toBeNull();
  });

  it("builds the observed second-boss mixture with the physical poison belt, independent of a stale boss id", () => {
    const raw = loggedBoard("xljq-f5-reward", "reward");
    const run = raw["run"] as Record<string,unknown>;
    Object.assign(run,{ character_id:"SILENT",ascension:10,act_id:"2",floor:46,boss_id:"THE_KIN_BOSS",ascension_effects:[{ id:"LEVEL_10" }],
      potions:[{ index:0,potion_id:"POISON_POTION",name:"毒药水",occupied:true,can_use:false }] });
    const s = parseGameState(raw);
    const opts = { db:FIXTURE_DB,mm:FIXTURE_MM };
    const first = syntheticBossStart(s,loggedKnowledge,"THE_KIN_BOSS",40,opts).input;
    const fixed = { ...model,secondBosses:[{ boss:"SOUL_FYSH",count:1 }] };
    const paired = withDoubleBossStart(s,loggedKnowledge,first,fixed,opts);
    expect(paired.continuation?.variants[0]?.boss).toBe("SOUL_FYSH");
    expect(paired.solver.hand.find((c) => c.cardId === "POTION:POISON_POTION:0")?.potionCost).toBe(3);
    const second = paired.continuation!.variants[0]!.input;
    expect(second.solver.hand.find((c) => c.cardId === "POTION:POISON_POTION:0")).toMatchObject({ poison:6,potionCost:0 });
    expect(second.solver.continuationValue).toBeUndefined();
    expect(paired.continuation?.potions).toEqual([{ key:"POTION:POISON_POTION:0",id:"POISON_POTION" }]);
  });

  it("never starts nested whole-fight simulations while constructing a second board, restoring the switch on errors too", () => {
    const enabled = bossLinesOptions.enabled;
    bossLinesOptions.enabled = true;
    const start = vi.spyOn(bossStart,"syntheticBossStart").mockImplementation(() => {
      expect(bossLinesOptions.enabled).toBe(false);
      throw new Error("fixed missing board");
    });
    try {
      expect(() => withDoubleBossStart(state(),loggedKnowledge,board(),model)).toThrow("fixed missing board");
      expect(bossLinesOptions.enabled).toBe(true);
    } finally { start.mockRestore();bossLinesOptions.enabled = enabled; }
  });
});
