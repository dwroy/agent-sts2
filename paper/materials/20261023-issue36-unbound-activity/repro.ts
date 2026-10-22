import { NativeBatch, learnerAgentName } from "../../../learner/lib/herdr.ts";
import { reconcileTuiReceipt } from "../../../learner/lib/tui-reconciliation.ts";
import { createHash } from "node:crypto";
const cwd="/fixture/learner",marker="[learner-batch:independent]",prompt=marker+"\nOriginal authorized task";
const row=(type:string,payload:Record<string,unknown>)=>({type,payload});
const prelude=row("response_item",{type:"message",role:"user",content:[
 {type:"input_text",text:`# AGENTS.md instructions for ${cwd}\n\n<INSTRUCTIONS>\nFixed instructions.\n</INSTRUCTIONS>`},
 {type:"input_text",text:`<environment_context>\n  <cwd>${cwd}</cwd>\n  <shell>bash</shell>\n</environment_context>`}]});
const start=[row("session_meta",{id:"fixture-session",cwd}),row("event_msg",{type:"task_started",turn_id:"fixture-turn"})];
const finish=[row("turn_context",{turn_id:"fixture-turn",cwd}),row("response_item",{type:"message",role:"user",content:[{type:"input_text",text:prompt}]}),row("event_msg",{type:"task_complete",turn_id:"fixture-turn",last_agent_message:"Report saved"})];
const activities=[row("response_item",{type:"function_call",name:"foreign-tool",arguments:"{}"}),row("response_item",{type:"local_shell_call",call_id:"foreign-shell"}),row("response_item",{type:"message",role:"assistant",content:[{type:"output_text",text:"Foreign earlier answer"}]})];
const results=[];
for(const activity of [undefined,...activities]) for(const position of activity?["before-prelude","after-prelude"]:["clean"]){
 const rows=[...start,...(position==="before-prelude"?[activity!]:[]),prelude,...(position==="after-prelude"?[activity!]:[]),...finish];
 const n=new NativeBatch(marker);n.expectPrompt(marker,prompt); rows.forEach(r=>n.feed(r));
 const proof={marker,prompt_sha256:createHash("sha256").update(prompt).digest("hex")};
 const receipt={submitted:true,cwd,label:"fixture-label",pane:"w1:p1",agent_name_version:1,agent_name:learnerAgentName("fixture-label","w1:p1",cwd),submissions:[proof],bindings:[],result:{code:75}};
 const audit=reconcileTuiReceipt(receipt,rows);
 results.push({activity:activity?.payload.type??"none",position,accepted:n.accepted,foreign:n.foreignActivity,successful:n.successful(),audit_accepted:audit.observed.accepted,audit_foreign:audit.observed.foreign_activity});
}
console.log(JSON.stringify(results));
