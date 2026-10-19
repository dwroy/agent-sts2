import { describe, expect, it } from "vitest";
import { v6History, type V6HistoryFrame, type V6RunCoverage } from "../src/sim/v6-history.js";
import { v6EntryHp, v6ProjectionTargets, v6TargetTrust, type V6BossObservation, type V6TargetContext } from "../src/sim/v6-targets.js";
import type { DoubleBossModel } from "../src/knowledge/double-boss.js";
import type { BossTrustData } from "../src/sim/boss-trust.js";
import { direction, request, source, FixedRunner } from "./v6-projection-fixture.js";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
const coverage: V6RunCoverage = { run_id: "r", ended: "2026-10-10T12:00:00Z", ascension: 10,
  first_stop: { ts: "2026-10-10T10:30:00Z", floor: 8, result: "predicted_death" }, first_trial_final_victory: false, final_including_sl_victory: true };
const frame = (floor: number, minute: number, ids: [string, boolean][], screen = "MAP", gold = 10): V6HistoryFrame => ({
  run_id: "r", ts: `2026-10-10T10:${minute}:00Z`, floor, act_id: "0", screen, hp: 20, max_hp: 60, gold,
  deck: ids.map(([id, upgraded]) => ({ id, upgraded })) });
const model: DoubleBossModel = { character: "silent", ascension: 10, act: 3, firstFloor: 48, secondFloor: 49, effect: "LEVEL_10",
  evidence: [{ run: "fixture", floor: 49 }], value: { source: "fixture", hp: [[0,0],[100,100]] }, potionHp: {}, poisonPotionAmount: 1,
  secondBosses: [{ boss: "THE_KIN", count: 1 }], limitation: "partial_model" };
const observation = (run_id: string, floor: number, boss: string, hp = 30): V6BossObservation => ({ run_id, character: "silent", ascension: 10,
  act: floor > 33 ? 3 : floor > 17 ? 2 : 1, floor, boss, first_attempt: true, entry_hp: hp, max_hp: 60 });
const context = (observations: V6BossObservation[] = []): V6TargetContext => ({ character: "silent", ascension: 10, act: 1, floor: 5,
  observations, visible: [{ act: 1, floor: 17, boss: "SOUL_FYSH" }], doubleBoss: model });
describe("V6 historical scope and targets", () => {
  it("extracts actual deltas before the first stop, deduplicates rest visits, excludes post-SL offers and final decks", () => {
    const frames = [frame(5, 10, [["A",false],["B",false]]), frame(6, 11, [["A",true],["C",false]], "REST", 20),
      frame(6, 12, [["A",true],["C",false]], "REST", 20), frame(49, 40, [["FINAL",true]])];
    const opportunity = (ts: string) => ({ id: ts, run: "r", ts, act: 1, ascension: 10, floor: 7, kind: "reward" as const,
      offers: [], source: { offset: 0, bytes: 0, sha256: "fixture" } });
    const out = v6History("silent", [coverage], frames, [], { schema: "construction-opportunities-v1", character: "silent", generated: "fixed",
      cutoff: "fixed", digest: "fixed", limitations: [], rows: [opportunity(frames[0]!.ts), opportunity(frames[3]!.ts)] });
    expect(out.histories[0]!.floors).toEqual([5,6]); expect(out.opportunities.rows).toHaveLength(1);
    expect(out.histories[0]!.changes).toEqual([{ floor: 6, act: 1, adds: [{id:"C",upgraded:false}], removes: [{id:"B",upgraded:false}], upgrades: ["A"], positiveGold: 10, rest: true }]);
    expect(() => v6History("regent", [coverage], frames, [], out.opportunities)).toThrow("cross-character");
  });
  it("uses observed ordered pairs without multiplying marginals or renormalizing missing second fights", () => {
    const c = context([observation("a",48,"AEONGLASS"), observation("a",49,"THE_KIN"), observation("b",48,"AEONGLASS"),
      { ...observation("other",48,"AEONGLASS"), character:"regent" }, { ...observation("sl",49,"THE_KIN"), first_attempt:false }]);
    const targets = v6ProjectionTargets(c), chain = targets.filter(t => t.kind === "chain");
    expect(chain).toHaveLength(2); expect(chain.map(t => t.probability)).toEqual([.5,.5]);
    expect(chain[0]!.secondBoss).toBe("THE_KIN"); expect(chain[1]!.unknown).toBeTruthy();
    expect(targets.find(t => t.kind === "current")?.boss).toBe("SOUL_FYSH");
    expect(targets.find(t => t.act === 2)?.unknown).toBeTruthy();
  });
  it("excludes observations and opportunities after an unlabelled floor rollback as well as deck deltas", () => {
    const frames = [frame(8, 10, [["A",false]]), { ...frame(6, 11, [["SL",false]], "COMBAT"), boss_id:"SOUL_FYSH", in_combat:true, turn:1 }];
    const o = { id:"sl",run:"r",ts:frames[1]!.ts,act:1,ascension:10,floor:6,kind:"reward" as const,offers:[],source:{offset:0,bytes:0,sha256:"fixed"} };
    const out = v6History("silent", [coverage], frames, [], { schema:"construction-opportunities-v1", character:"silent", generated:"fixed", cutoff:"fixed",digest:"fixed", limitations:[],rows:[o] }, [6]);
    expect(out.histories[0]?.floors).toEqual([8]); expect(out.observations).toEqual([]); expect(out.opportunities.rows).toEqual([]);
  });
  it("uses current route HP once and the own first-entry ratio median for remote bosses", () => {
    const c = context([observation("a",48,"AEONGLASS",12), observation("a",48,"AEONGLASS",12), observation("b",48,"THE_KIN",48),
      { ...observation("other",48,"THE_KIN",60), ascension:9 }, { ...observation("sl",48,"THE_KIN",60), first_attempt:false }]);
    const target = { id:"f48",boss:"AEONGLASS",act:3,floor:48,kind:"future" as const,probability:1,labels:[] };
    expect(v6EntryHp(c,target,100,null)).toMatchObject({hp:50,n:2});
    expect(v6EntryHp(c,{...target,kind:"current"},100,23).hp).toBe(23);
    expect(v6EntryHp(c,{...target,kind:"current"},100,null).hp).toBeNull();
  });
  it("preserves unknown chain calibration and takes low-trust bias sign only from adequate own validation", () => {
    const trust: BossTrustData & {bosses:unknown} = { character:"silent", overall:{pre:{platt:{a:0,b:1}}}, criteria:{min_fights:5,brier_ratio:1,max_gap:.1,leak_range:[.7,1.3],starts:{}},
      low_trust_b2:{},low_confidence_b3:{AEONGLASS:"bias"},bosses:{AEONGLASS:{pre:{n:10,mean_pred:.8,actual_win:.4}}} };
    const target = { id:"f48",boss:"AEONGLASS",act:3,floor:48,kind:"future" as const,probability:1,labels:[] };
    expect(v6TargetTrust("silent",10,target,trust).value).toBe("low_optimistic");
    expect(v6TargetTrust("regent",10,target,trust).value).toBe("unknown");
    expect(v6TargetTrust("silent",10,{...target,kind:"chain",secondBoss:"THE_KIN"},trust).labels).toContain("continuous_calibration_unknown");
  });
  it("candidate mixtures retain unknown mass and bound cross-target uncertainty conservatively", async () => {
    const r=request(); r.directions=[direction()];r.completionSources=[source()];
    r.targets=[{...r.targets[0]!,id:"a",probability:.7},{...r.targets[0]!,id:"b",probability:.3}];
    const table=await new V6ProjectionEngine(new FixedRunner()).evaluate(r);
    expect(table.target_mixtures.find(x=>x.option_id==="take"&&x.kind==="current_gate")?.value?.value).toBeCloseTo(.8125);
    r.targets[1]={...r.targets[1]!,unknown:"unobserved"};
    const unknown=await new V6ProjectionEngine(new FixedRunner()).evaluate(r);
    expect(unknown.target_mixtures.find(x=>x.option_id==="take"&&x.kind==="current_gate")).toMatchObject({value:null,known_mass:.7});
  });
});
