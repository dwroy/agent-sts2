import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {KnowledgeStore} from '@HOST@/agent/src/knowledge/runtime/store.ts';
import {reflex} from '@GAME@/agent/tests/v6-fixtures.ts';
const fixture=process.argv[2]!;
if(process.argv[3]==='inspect') {
 const s=new KnowledgeStore(join(fixture,'runtime'),{readOnly:true});
 try {assert.equal(s.db.prepare('SELECT count(*) AS n FROM releases').get()!.n,2);console.log(JSON.stringify({releases:2,current:s.current(),original_bound:s.bind}));} finally{s.close();}
} else {
 mkdirSync(fixture,{recursive:true});
 const exp={id:'fixture-exp',scope:'general:deck',asc:[10,10],lesson:'仅格式测试甲',evidence:['SILENT000001'],n_support:1,n_contradict:1,confidence:'low',last_seen:'2026-10-25',status:'active'};
 const {directions,...rk}=reflex;
 const files={'characters/silent/experience.json':JSON.stringify({version:'fixture-v1',entries:[exp]}),'characters/silent/strategy-entries.json':JSON.stringify({schema:'brain-strategies-v1',character:'silent',entries:[{id:'fixture-strategy',version:'fixture',trigger:{question_types:['card_reward'],acts:[1]},strategy:'仅格式测试',source:'own',evidence:[{run:'SILENT000001',floor:4,role:'contradict'}],confidence:.25}]}),'characters/silent/reflex.json':JSON.stringify({schema:'reflex-file-v1',character:'silent',entries:[{...rk,scope:{character:'silent',ascensions:[10]}}]})};
 const next={...files,'characters/silent/experience.json':JSON.stringify({version:'fixture-v2',entries:[{...exp,lesson:'仅格式测试乙'}]})};
 for(const [dir,documents] of [['legacy',files],['legacy-next',next]] as const)for(const [p,t] of Object.entries(documents)){mkdirSync(dirname(join(fixture,dir,p)),{recursive:true});writeFileSync(join(fixture,dir,p),t);}
 writeFileSync(join(fixture,'state.json'),JSON.stringify({batches:{fixture:{character:'silent'}}}));
 console.log(JSON.stringify({fixture,files:3,synthetic:true}));
}
