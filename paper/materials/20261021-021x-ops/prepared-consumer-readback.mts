import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
globalThis.fetch = async () => { throw new Error('Boundary readback forbids network'); };
const [code, knowledgeRoot, runtime, output] = process.argv.slice(2);
const imp = (path: string) => import(pathToFileURL(`${code}/agent/src/${path}`).href);
const settings: Record<string,string> = { V6_REFLEX: 'off' };
for (const line of readFileSync(runtime,'utf8').split('\n')) {
 if (line.trim().startsWith('export V6_')) for (const m of line.matchAll(/\b(V6_[A-Z0-9_]+)=([a-z0-9.]+)/g)) settings[m[1]]=m[2];
}
Object.assign(process.env, settings);
const { v6Config } = await imp('v6/config.ts');
const config = v6Config(settings);
assert.deepEqual(config.deciders,{card:'jev',potion:'brain',shop:'brain',rest:'brain'});
assert.equal(config.reflex,'off'); assert.equal(config.direction_replan,'off');
assert.equal(settings.V6_COMBAT_ENTRIES,'off'); assert.equal(config.budgets.brain_ms,90000); assert.deepEqual(config.invalid,[]);
const { loadV6Knowledge } = await imp('v6/knowledge.ts');
const { cardPickReflex } = await imp('v6/card-pick-reflex.ts');
const loaded = loadV6Knowledge(knowledgeRoot,'silent');
assert.equal(loaded.cores.status,'loaded'); assert.equal(loaded.reflex.status,'loaded');
const sent=cardPickReflex({state:{run:{ascension:10,raw:{}}}},loaded,'card0',{card_id:'PREDATOR',upgraded:false},{});
assert.equal(sent.length,0);
const { parseGameState } = await imp('hand/mod/schema.ts');
const { makeKnowledge } = await imp('knowledge/index.ts');
const { setKnowledgeCharacter } = await imp('knowledge/files.ts');
const { setCardUpgradesForTests } = await imp('knowledge/card-upgrades.ts');
const { v6ProjectionStart } = await imp('sim/v6-start.ts');
setKnowledgeCharacter('silent'); setCardUpgradesForTests({});
const frozen=JSON.parse(readFileSync(`${code}/agent/tests/v6-fixtures/v6-r405-card-options.json`,'utf8'));
const knowledge=makeKnowledge(frozen.knowledge_fixture,'cache');
const target={id:'boss',boss:'WATERFALL_GIANT',act:1,floor:17,kind:'current',probability:1,labels:[]};
const faces:any[]=[];
for (const [runId,floor] of [['T0TP8S9MMU9Q',2],['RBMEQGXPE9Z2',3]] as const) {
 const original=frozen.states[`${runId}-f${floor}-REWARD`]; const models:any[]=[];
 for (const offered of original.reward.card_options) {
  const raw=structuredClone(original),run=raw.run;
  const cards=run.deck.map((c:any)=>({id:c.card_id,upgraded:c.upgraded===true}));
  run.deck.push({card_id:offered.card_id,upgraded:offered.upgraded===true,index:cards.length});
  cards.push({id:offered.card_id,upgraded:offered.upgraded===true});
  const context={state:parseGameState(raw),knowledge,currentRouteHp:run.current_hp,doubleBoss:null,models:frozen.models,
   targets:{character:'silent',ascension:10,act:1,floor,visible:[],observations:[],doubleBoss:null}};
  const build={cards,relics:run.relics.map((x:any)=>x.relic_id),hp:run.current_hp,maxHp:run.max_hp,gold:run.gold,floor,cap:null};
  const before=JSON.stringify(raw);const prepared=v6ProjectionStart(context,target,build);assert.ok(prepared);
  const card=prepared.input.piles.draw.find((c:any)=>c.cardId===offered.card_id);assert.ok(card);
  assert.equal(card.known,true);assert.equal(card.cost,offered.energy_cost);assert.equal(JSON.stringify(raw),before);
  const semantics=Object.fromEntries(['type','cost','damage','block','draw','discard','nextTurnBlock','nextTurnDraw'].filter(k=>card[k]!==undefined).map(k=>[k,card[k]]));
  models.push({card_id:offered.card_id,known:card.known,semantics});
 }
 assert.equal(models.length,3);assert.equal(new Set(models.map(m=>JSON.stringify(m.semantics))).size,3);
 faces.push({run_id:runId,floor,models});
}
// Check the existing unsupported playable-card guard without sampling or inventing a game rule.
const raw=structuredClone(frozen.states['T0TP8S9MMU9Q-f2-REWARD']),run=raw.run;
raw.reward.card_options=[];const id='UNMODELLED_FIXTURE',base=knowledge.card('DODGE_AND_ROLL');
const unsupported={...knowledge,card:(key:string)=>key===id?{...base,id,type:'Skill',cost:1,description:'unsupported fixture',descriptionRaw:'unsupported fixture',vars:[],keywords:[]}:knowledge.card(key)};
const cards=run.deck.map((c:any)=>({id:c.card_id,upgraded:c.upgraded===true}));cards.push({id,upgraded:false});
const prepared=v6ProjectionStart({state:parseGameState(raw),knowledge:unsupported,currentRouteHp:run.current_hp,doubleBoss:null,models:frozen.models,
 targets:{character:'silent',ascension:10,act:1,floor:2,visible:[],observations:[],doubleBoss:null}},target,
 {cards,relics:run.relics.map((x:any)=>x.relic_id),hp:run.current_hp,maxHp:run.max_hp,gold:run.gold,floor:2,cap:null});
assert.ok(prepared);assert.ok(prepared.labels.includes(`unmodelled_card:${id}`));
const files=Object.fromEntries(['build-cores.json','reflex.json','reflex-vocab.json'].map(n=>{
 const p=`${knowledgeRoot}/characters/silent/${n}`;return [p,createHash('sha256').update(readFileSync(p)).digest('hex')];}));
writeFileSync(output,JSON.stringify({config,settings,formal_knowledge:{loaded:loaded.reflex.status,combat_line:loaded.reflex.value.filter((e:any)=>e.applies_to==='combat_line').length,
 card_pick_contrast:loaded.reflex.value.filter((e:any)=>e.applies_to==='card_pick'&&e.signal.kind==='contrast').length,off_emitted:sent.length},files,
 frozen_reward_model_faces:faces,unsupported_playable_card_explicitly_unknown:true,network:'forbidden',simulation:'not invoked',
 scope:'Exact deployed modules plus current formal loader and frozen observed faces; no reward outcome simulation/API/game action or natural quality acceptance. First published natural run is judged by Claude.'},null,2)+'\n');
console.log(JSON.stringify({CARD:config.deciders.card,REFLEX:config.reflex,face_sets:faces.length,unknown_guard:true,simulation:'off'}));
