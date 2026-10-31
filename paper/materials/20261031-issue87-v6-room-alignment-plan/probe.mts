import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const root=process.argv[2]!;
const options=await import(pathToFileURL(join(root,"agent/src/hand/screens/v6-room-options.ts")).href);
const room=await import(pathToFileURL(join(root,"agent/src/hand/screens/v6-room.ts")).href);
const config=await import(pathToFileURL(join(root,"agent/src/v6/config.ts")).href);
const rows=[];
for(const mode of ["off","shadow","on"]){
 process.env.V6_BUILD=mode;
 process.env.V6_SHOP_DECIDER="brain";process.env.V6_REST_DECIDER="brain";
 const env=new Proxy({}, {get(_t,key){if(key==="v6BrainFallback")return false;throw new Error("unexpected environment read "+String(key));}});
 assert.equal(options.v6RoomActive(env,"shop"),false);assert.equal(options.v6RoomActive(env,"rest"),false);
 assert.equal(options.v6ShopOptions(env),null);assert.equal(options.v6RestOptions(env),null);
 for(const kind of ["shop","rest"]){
  const decision={kind:"ask",label:kind+"/plan",state:{},questions:{}};let calls=0;
  const provider=async()=>{calls++;throw new Error("provider must never run");};
  assert.equal(room.isV6RoomDecision(decision),false);
  const result=await room.prepareV6RoomDecision(decision,env,provider,"/fixed/no-read");
  assert.equal(result,decision);assert.equal(calls,0);
  rows.push({mode,kind,decider:"brain",admission:config.v6Config().admission,options:null,has_v6Room:false,prepare_returned_same_object:true,provider_calls:calls});
 }
}
process.env.V6_BUILD="on";process.env.V6_SHOP_DECIDER="jev";process.env.V6_REST_DECIDER="jev";
const control={v6BrainFallback:false,state:{in_combat:false}};
assert.equal(options.v6RoomActive(control,"shop"),true);assert.equal(options.v6RoomActive(control,"rest"),true);
console.log(JSON.stringify({rows,positive_control:{mode:"on",decider:"jev",admission:config.v6Config().admission,gate:true},limitation:"Fixed direct-call probe only; not a live-game trace. Production invocation is established separately by the deployed call graph and run-config."},null,2));
