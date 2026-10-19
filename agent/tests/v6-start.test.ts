import { expect, it, vi } from "vitest";
import * as bossStart from "../src/sim/boss-start.js";
import { cardUpgrade } from "../src/knowledge/card-upgrades.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { asArray, asRecord } from "../src/core/util/json.js";
import { v6ProjectionStart } from "../src/sim/v6-start.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { board, setupOneshotTests } from "./oneshot-support.js";
import { loggedKnowledge } from "./logged.js";
import type { V6StartContext } from "../src/sim/v6-start.js";
import type { BuildState } from "../src/construction/types.js";
setupOneshotTests();
it("prepares from the logged held inventory and refuses invented resources, cross-role data and dead routes", () => {
  const raw=board("xljq-f5-reward","reward"), run=asRecord(raw["run"]);run["character_id"]="SILENT";
  const before=JSON.stringify(raw), state=parseGameState(raw), asc=state.run!.ascension!;
  const build: BuildState={cards:asArray(run["deck"]).map(x=>({id:String(asRecord(x)["card_id"]),upgraded:asRecord(x)["upgraded"]===true})),
    relics:asArray(run["relics"]).map(x=>String(asRecord(x)["relic_id"])),hp:40,maxHp:Number(run["max_hp"]),gold:0,floor:5,cap:null};
  const context: V6StartContext={state,knowledge:loggedKnowledge,currentRouteHp:27,doubleBoss:null,models:{db:FIXTURE_DB,mm:FIXTURE_MM},
    targets:{character:"silent",ascension:asc,act:1,floor:5,visible:[],observations:[],doubleBoss:null}};
  const target={id:"boss",boss:"SOUL_FYSH",act:1,floor:17,kind:"current" as const,probability:1,labels:[]};
  const result=v6ProjectionStart(context,target,build);
  expect(result?.input.captureResources).toBe(true);expect(result?.labels).toContain("entry_hp_source:existing_route_projection:n=0");
  expect(JSON.stringify(raw)).toBe(before);
  expect(v6ProjectionStart({...context,currentRouteHp:0},target,build)).toBeNull();
  expect(v6ProjectionStart(context,target,{...build,relics:[...build.relics,"INVENTED"]})).toBeNull();
  expect(v6ProjectionStart(context,target,{...build,combatResources:{revives:[],drunkKeys:[]}})).toBeNull();
  expect(v6ProjectionStart({...context,targets:{...context.targets,character:"regent"}},target,build)).toBeNull();
  const candidate = build.cards.findIndex(c => !c.upgraded && !!cardUpgrade(c.id));
  expect(candidate).toBeGreaterThanOrEqual(0);
  asRecord(asArray(run["deck"])[candidate])["fixture_counter"] = 7;
  const upgraded = structuredClone(build); upgraded.cards[candidate]!.upgraded = true;
  const spy = vi.spyOn(bossStart, "syntheticBossStart");
  try {
    expect(v6ProjectionStart({ ...context, state: parseGameState(raw) }, target, upgraded)).not.toBeNull();
    const preserved = asArray(spy.mock.calls[0]![0].run!.raw["deck"]).map(asRecord).find(c => c["fixture_counter"] === 7);
    expect(preserved?.["upgraded"]).toBe(true);
  } finally { spy.mockRestore(); }
});
