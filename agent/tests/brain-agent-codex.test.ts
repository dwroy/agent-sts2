/** Fake app-server exercises the real Codex adapter and real MCP HTTP transport without inference. */
import { expect, it } from "vitest";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { CodexEngine, CODEX_DISABLED_FEATURES } from "../src/brain/engines/codex.js";
import { KnowledgeAgent } from "../src/brain/engines/knowledge-agent.js";
import { loadConfig } from "../src/core/config.js";
import type { BrainLiveEvent } from "../src/brain/live-view.js";
import { pickSpec } from "../src/brain/specs.js";
import { BrainRouter, type BrainLogRow } from "../src/brain/router.js";

it("Codex app-server exposes only gkb, keeps all isolation switches and records native effort plus tool results", async () => {
  const dir = mkdtempSync(join(tmpdir(), "knowledge-codex-")), bin = join(dir, "codex.mjs"), home = join(dir, "home");
  mkdirSync(home); writeFileSync(join(home, "auth.json"), "{}");
  const observed = join(dir, "observed.json");
  writeFileSync(bin, `#!${process.execPath}
import {writeFileSync,readFileSync,appendFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
const args=process.argv.slice(2), model={slug:'gpt-6.1-sol',supported_reasoning_levels:[{effort:'high'}],tool_mode:'code_mode_only',experimental_supported_tools:['shell']};
if(args[0]==='debug'){console.log(JSON.stringify({models:[model]}));process.exit(0);}
if(args[0]!=='app-server')process.exit(99);
writeFileSync(${JSON.stringify(observed)},JSON.stringify(args));
const cfg=args.find(s=>s.startsWith('mcp_servers.gkb='));const url=cfg&&JSON.parse(/url = ("[^"]+")/.exec(cfg)[1]);
const path=${JSON.stringify(join(dir, "rollout.jsonl"))};writeFileSync(path,JSON.stringify({type:'session_meta',payload:{id:'fixed-thread'}})+'\\n');
const send=m=>console.log(JSON.stringify(m));
for await(const line of createInterface({input:process.stdin})){
const m=JSON.parse(line),p=m.params??{};if(m.id===undefined)continue;
if(!m.method&&m.id===999){
send({method:'item/reasoning/textDelta',params:{threadId:'fixed-thread',turnId:'fixed-turn',itemId:'private',delta:'PRIVATE_RAW_REASONING'}});
send({method:'item/completed',params:{threadId:'fixed-thread',turnId:'fixed-turn',item:{id:'summary-only',type:'reasoning',summary:[{type:'summary_text',text:'fixed public summary'}],content:[{text:'PRIVATE_RAW_REASONING'}]}}});
send({method:'item/reasoning/summaryTextDelta',params:{threadId:'fixed-thread',turnId:'fixed-turn',itemId:'streamed',delta:'fixed streamed summary'}});
send({method:'item/completed',params:{threadId:'fixed-thread',turnId:'fixed-turn',item:{id:'streamed',type:'reasoning',summary:['fixed streamed summary']}}});
send({method:'item/completed',params:{threadId:'fixed-thread',turnId:'fixed-turn',item:{type:'agentMessage',text:'{"choice":"a","reason":"fixed"}'}}});
send({method:'turn/completed',params:{threadId:'fixed-thread',turn:{id:'fixed-turn',status:'completed'}}});continue;}

if(m.method==='thread/list')send({id:m.id,result:{data:[]}});
else if(m.method==='thread/start'){writeFileSync(${JSON.stringify(observed)},JSON.stringify({args,dynamicTools:p.dynamicTools}));send({id:m.id,result:{thread:{id:'fixed-thread',path},instructionSources:[]}});}
else if(m.method==='turn/start'){
appendFileSync(path,JSON.stringify({type:'turn_context',payload:{turn_id:'fixed-turn',model:p.model,effort:p.effort}})+'\\n');
send({id:m.id,result:{turn:{id:'fixed-turn'}}});
send({id:999,method:'item/tool/call',params:{threadId:'fixed-thread',turnId:'fixed-turn',callId:'fixed-call',namespace:'gkb',tool:'kb_open_book',arguments:{query:'fixture'}}});
}else send({id:m.id,result:{}});
}
`); chmodSync(bin, 0o755);
  const config = loadConfig({ BRAIN_ENGINE: "codex", BRAIN_CODEX_EFFORT: "high", BRAIN_CODEX_HOME: home, BRAIN_CODEX_BIN: bin, BRAIN_LOG: "off" });
  const engines: CodexEngine[] = [];
  const engine = new KnowledgeAgent("codex", "gpt-6.1-sol", config.brain, url => {
    const e = new CodexEngine({ settings: config.brain.engines.codex, codex: { ...config.brain.codex, mode: "session" }, knowledgeAgent: true, ...(url ? { knowledgeMcpUrl: url } : {}), stateDir: join(dir, "state"),
      readUsage: async () => ({ readAt: new Date().toISOString(), ms: 1, plan: null, windows: [], credits: null, ordinaryUsageAllowed: true, reachedType: null, spendControlReached: false }) });
    engines.push(e); return e;
  });
  const events: BrainLiveEvent[] = [];
  try {
    const result = await engine.decide({ label: "reward/card", observe: event => events.push(event), system: "fixed rules", question: "choose", options: { a: null }, payload: {}, spec: pickSpec("reward/card", { a: null }),
      toolContext: { ascension: 0, knowledgeDir: "", logsDir: "" }, tools: [{ name: "kb_open_book", description: "fixture", inputSchema: { type: "object" }, run: () => ({ text: '{"sources":[{"source":"external:fixture","version":"fixture"}],"entries":[]}' }) }] });
    expect(result).toMatchObject({ answer: { choice: "a" }, nativeReceipt: { source: "turn_context", effort: "high" }, toolCalls: [{ name: "kb_open_book", sources: [{ source: "external:fixture", version: "fixture" }] }] });
    expect(events.filter(e => e.kind === "reasoning")).toEqual([
      { kind: "reasoning", text: "fixed public summary" }, { kind: "reasoning", text: "fixed streamed summary" },
    ]);
    expect(events).toContainEqual({ kind: "text", text: '{"choice":"a","reason":"fixed"}' });
    expect(JSON.stringify(events)).not.toContain("PRIVATE_RAW_REASONING");
    expect(events.find(e => e.kind === "tool-end")).toMatchObject({ sources: [{ source: "external:fixture", version: "fixture" }] });
    const observedCall = JSON.parse(readFileSync(observed, "utf8"));
    const args: string[] = observedCall.args;
    expect(observedCall.dynamicTools).toMatchObject([{ type: "namespace", name: "gkb", tools: [{ type: "function", name: "kb_open_book" }] }]);
    expect(args).toContain("project_doc_max_bytes=0"); expect(args).toContain('web_search="disabled"');
    expect(args.filter(s => s.startsWith("mcp_servers."))).toHaveLength(0);
    for (const feature of CODEX_DISABLED_FEATURES) expect(args).toContain(feature);
    expect(args).toContain("include_environment_context=false");
  } finally { await engine.close(); for (const e of engines) await e.close(); rmSync(dir, { recursive: true, force: true }); }
});

it("a real fixture harness exits after outer cancellation and retains completed tool bytes plus the native line", async () => {
  const dir = mkdtempSync(join(tmpdir(), "knowledge-codex-cancel-")), bin = join(dir, "codex.mjs"), home = join(dir, "home");
  mkdirSync(home);
  writeFileSync(bin, `#!${process.execPath}
import {writeFileSync,appendFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
if(process.argv[2]==='debug'){console.log(JSON.stringify({models:[{slug:'gpt-6.1-sol',supported_reasoning_levels:[{effort:'high'}]}]}));process.exit(0);}
const path=${JSON.stringify(join(dir, "native.jsonl"))};
writeFileSync(${JSON.stringify(join(dir, "pid"))},String(process.pid));
const send=m=>console.log(JSON.stringify(m));
for await(const line of createInterface({input:process.stdin})){
const m=JSON.parse(line),p=m.params??{};
if(m.id===undefined)continue;
if(!m.method&&m.id===999){send({method:'item/reasoning/summaryTextDelta',params:{threadId:'cancel-thread',turnId:'cancel-turn',delta:'READY_TO_CANCEL'}});continue;}
if(m.method==='thread/list')send({id:m.id,result:{data:[]}});
else if(m.method==='thread/start'){
writeFileSync(path,JSON.stringify({type:'session_meta',payload:{id:'cancel-thread'}})+'\\n');
send({id:m.id,result:{thread:{id:'cancel-thread',path},instructionSources:[]}});
}else if(m.method==='turn/start'){
appendFileSync(path,JSON.stringify({type:'turn_context',payload:{turn_id:'cancel-turn',model:p.model,effort:p.effort}})+'\\n');
send({id:m.id,result:{turn:{id:'cancel-turn'}}});
send({id:999,method:'item/tool/call',params:{threadId:'cancel-thread',turnId:'cancel-turn',callId:'cancel-call',namespace:'gkb',tool:'kb_fixture',arguments:{query:'fixture'}}});
}else send({id:m.id,result:{}});
}
`); chmodSync(bin, 0o755);
  const config = loadConfig({ BRAIN_ENGINE: "codex", BRAIN_CODEX_EFFORT: "high", BRAIN_CODEX_HOME: home, BRAIN_CODEX_BIN: bin, BRAIN_LOG: "off" });
  config.brain.log = join(dir, "brain.jsonl");
  const agent = new KnowledgeAgent("codex", "gpt-6.1-sol", config.brain, url => new CodexEngine({ settings: config.brain.engines.codex,
    codex: { ...config.brain.codex, mode: "session" }, knowledgeAgent: true, ...(url ? { knowledgeMcpUrl: url } : {}), stateDir: join(dir, "state"),
    readUsage: async () => ({ readAt: "2026-10-25T00:00:00Z", ms: 0, plan: null, windows: [], credits: null, ordinaryUsageAllowed: true, reachedType: null, spendControlReached: false }),
  }));
  const rows: BrainLogRow[] = [], abort = new AbortController();
  const router = new BrainRouter({ config: config.brain, codexOnly: true, knowledgeAgent: true, engine: () => agent, log: r => rows.push(r) });
  try {
    await expect(router.decide({ label: "reward/card", system: "fixed", question: "choose", payload: {}, options: { a: null }, spec: pickSpec("reward/card", { a: null }),
      budgetSignal: abort.signal, observe: event => { if (event.kind === "reasoning" && event.text === "READY_TO_CANCEL") abort.abort(); },
      tools: [{ name: "kb_fixture", description: "fixed", inputSchema: { type: "object" }, run: () => ({ text: "EXACT_COMPLETED_BYTES" }) }],
      toolContext: { ascension: 0, knowledgeDir: "", logsDir: "" },
    })).rejects.toThrow("budget exhausted");
    await agent.close();
    expect(rows[0]).toMatchObject({ attempts: 1, accepted: false, native_receipt: { source: "turn_context", context_line: expect.any(String) },
      tool_calls: [{ name: "kb_fixture", output: "EXACT_COMPLETED_BYTES", callId: "cancel-call" }] });
    const pid = Number(readFileSync(join(dir, "pid"), "utf8"));
    expect(() => process.kill(pid, 0)).toThrow();
  } finally { await agent.close(); rmSync(dir, { recursive: true, force: true }); }
});
