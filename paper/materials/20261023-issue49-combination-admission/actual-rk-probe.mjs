import {buildKnowledgeTools} from './src/brain/tools/agent-knowledge.ts';
import {ToolHost} from './src/brain/tools/mcp-server.ts';
import {setKnowledgeCharacter} from './src/knowledge/files.ts';
import {queryAudit} from './src/brain/tools/query-guidance.ts';
setKnowledgeCharacter('silent');
const ctx={label:'reward/card',ascension:10,act:1,knowledgeDir:process.cwd()+'/../knowledge',logsDir:'/nonexistent-readonly-probe',payload:{facts:{act:1}}};
const host=new ToolHost(buildKnowledgeTools(ctx),ctx,undefined,true);
const r=await host.call('kb_reflex',{query:'*'});const data=JSON.parse(r.text);
console.log(JSON.stringify({schema:'integrator-actual-rk-readback-v1',status:data.status,isError:r.isError??false,entries:(data.entries??[]).map(e=>({id:e.id,confidence:e.confidence,source_experience:e.source_experience})),omitted:data.omitted,sources:data.sources,issues:data.issues,reason:data.reason,predicate_evaluation:data.predicate_evaluation,bytes:Buffer.byteLength(r.text),audit:queryAudit(host.calls),tool_count:host.list().length,combat_entries_env:process.env.V6_COMBAT_ENTRIES??null,model_API_calls:0}));
