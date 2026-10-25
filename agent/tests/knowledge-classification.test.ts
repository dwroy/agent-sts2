/** Synthetic metadata plus historical frozen retrieval, never formal gameplay classifications. */
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { KnowledgeStore, type Candidate } from "../src/knowledge/runtime/store.js";
import { classificationDigest, type Classification } from "../src/knowledge/runtime/classification.js";
import { KnowledgeReader, closeIndexedReaders } from "../src/knowledge/runtime/reader.js";
import { validateDocuments } from "../src/knowledge/runtime/validation.js";
import { buildKnowledgeTools } from "../src/brain/tools/agent-knowledge.js";
import { ToolHost } from "../src/brain/tools/mcp-server.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { attachQueryGuidance } from "../src/brain/tools/query-guidance.js";
import { main } from "../tools/knowledge-runtime.js";
import { reflex, vocab } from "./v6-fixtures.js";
import { coreFixture } from "./v6-direction-core-fixtures.js";
const dirs: string[] = [], stores: KnowledgeStore[] = [], readers: KnowledgeReader[] = [];
const directory = () => { const d = mkdtempSync(join(tmpdir(), "classification-")); dirs.push(d); return d; };
function store(root = directory()) { const s = new KnowledgeStore(root); stores.push(s); return s; }
function reader(s: KnowledgeStore, v: string) { const r = new KnowledgeReader(s.root, v); readers.push(r); return r; }
afterEach(() => { closeIndexedReaders(); readers.splice(0).forEach(r => r.close()); stores.splice(0).forEach(s => { if (s.db.isOpen) s.close(); }); dirs.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })); setKnowledgeCharacter(null); vi.restoreAllMocks(); });
const path = "characters/silent/experience.json", meta = "characters/silent/classification.json";
const exp = { id: "test-exp", scope: "general:fixture", asc: [0, 10], lesson: "仅合成格式夹具", evidence: ["SILENT000001"], contradicting: ["SILENT000002"], n_support: 1, n_contradict: 1, confidence: "low", status: "active" };
const doc = (entries: unknown[]) => JSON.stringify({ version: "fixture", entries });
const metaDoc = (entries: unknown[], character = "silent") => JSON.stringify({ schema: "knowledge-classification-v1", character, entries });
const classification = (file = path, value: any = exp, type: any = "experience", parent_id?: string): Classification => ({
 id: `class-${type}-${value.id ?? value.direction}`, target: { path: file, type, id: value.id ?? value.direction, ...(parent_id ? { parent_id } : {}), sha256: classificationDigest(value) },
 topics: ["startup", "build_route"], entities: ["FIXTURE_ENTITY"], aliases: ["测试别名", "测"], evidence: ["SILENT000001"], rationale: "仅格式证据夹具" });
function candidate(s: KnowledgeStore, id: string, files: Record<string, string>, character = "silent"): Candidate { return { schema: "knowledge-candidate-v1", id, base: s.current(), character, source: "fixture", files }; }
function publish(s: KnowledgeStore, id: string, files: Record<string, string>, character = "silent") { const c = candidate(s,id,files,character); s.submit(c); s.validate(id); return s.publish(id); }
function host(s: KnowledgeStore, run = "FIXTURE", label = "reward/card", payload: any = { facts: { act: 1 } }, character = "silent", ascension = 0) {
 setKnowledgeCharacter(character); const snapshot = String(s.bind(run,"test-code").snapshot), ctx = { knowledgeDir:snapshot,logsDir:snapshot,label,payload,ascension,act:1 };
 return {ctx, async call(name:string,input:Record<string,unknown>) { const r=await new ToolHost(buildKnowledgeTools(ctx),ctx,undefined,true).call(name,input); let data: any; try { data = JSON.parse(r.text); } catch { data = { error: r.text }; } return {...r,data}; }};
}
const stratPath="characters/silent/strategy-entries.json", strategy={id:"test-strat",version:"fixture",trigger:{question_types:["card_reward"],acts:[1],hp_ratio:{max:.2}},strategy:"仅合成格式夹具",confidence:.2,source:"own",evidence:[{run:"SILENT000001",floor:1},{run:"SILENT000002",floor:2,role:"contradict"}],evidence_status:"conflict"};
const stratDoc=(entries:any[])=>JSON.stringify({schema:"brain-strategies-v1",character:"silent",entries});

it("keeps old classifications unknown and separates strict filter misses",async()=>{
 const s=store();publish(s,"old",{[path]:doc([{...exp,id:"startup-boss-build_route",lesson:"启动 Boss 路线"}])});const h=host(s);
 const r=await h.call("kb_experience",{topic:"startup"});expect(r.data.entries).toEqual([]);expect(r.data.classification_coverage.scope).toEqual({total:1,classified:0,unknown:1});expect(r.data.empty_reasons).toContain("unclassified_in_filter_pool");
 expect((await h.call("kb_experience",{keyword:"不存在"})).data.empty_reasons).toEqual(["no_filter_match"]);expect((await h.call("kb_experience",{topic:"made_up"})).isError).toBe(true);
});
it("publishes multi-topic metadata once with indexed aliases and unchanged content/evidence",async()=>{
 const s=store(),first=publish(s,"old",{[path]:doc([exp])}),old=host(s),c=candidate(s,"classify",{[meta]:metaDoc([classification()])});s.submit(c);s.submit(c);s.validate(c.id);const next=s.publish(c.id);expect(s.publish(c.id)).toBe(next);expect(s.files(next)[path]).toBe(s.files(first)[path]);const h=host(s,"NEW");
 for(const input of [{topic:"startup"},{topic:"build_route"},{entity:"测试别名"},{entity:"测"},{keyword:"测试别名"},{keyword:"测"}]){const r=await h.call("kb_experience",input);expect(r.isError,r.text).toBeUndefined();expect(r.data.entries).toEqual([exp]);expect(r.data.sources[0].classification).toMatchObject({state:"classified",topics:["startup","build_route"]});}
 expect((await old.call("kb_experience",{topic:"startup"})).data.entries).toEqual([]);const r=reader(s,next);expect(r.all({type:"experience",character:"silent"})).toHaveLength(1);expect(r.plan({type:"experience",character:"silent",topic:"startup"}).some(p=>String(p.detail).includes("classification_term_lookup"))).toBe(true);
});
it("separates false dynamic conditions, missing facts, pagination and explicit empty topics",async()=>{
 const s=store();publish(s,"s",{[stratPath]:stratDoc([strategy]),[meta]:metaDoc([classification(stratPath,strategy,"strategy")])});const h=host(s,"H","reward/card",{facts:{act:1,hp:"50/50"}});
 expect((await h.call("kb_strategies",{query:"*",topic:"startup"})).data.empty_reasons).toEqual(["dynamic_conditions_not_applicable"]);
 h.ctx.payload={facts:{act:1}};expect((await h.call("kb_strategies",{query:"*",topic:"startup"})).data.empty_reasons).toEqual(["dynamic_reason_unknown"]);
 h.ctx.payload={facts:{act:1,hp:"5/50"}};const r=await h.call("kb_strategies",{query:"*",topic:"startup",offset:9});expect(r.data.pagination_empty).toBe(true);expect(r.data.empty_reasons).toEqual([]);
 publish(s,"none",{[meta]:metaDoc([{...classification(stratPath,strategy,"strategy"),topics:[]}])});const fresh=host(s,"F");expect((await fresh.call("kb_strategies",{query:"*",topic:"startup"})).data.classification_coverage.scope).toEqual({total:1,classified:1,unknown:0});
});
it("rejects illegal topics, unknown fields, stale/dangling targets, duplicates, wrong role and evidence gaps",()=>{
 const base={[path]:doc([exp])},valid=classification();
 for(const bad of [{...valid,topics:["unknown"]},{...valid,topics:["startup","startup"]},{...valid,topics:"boss"},{...valid,acts:[1]},{...valid,target:{...valid.target,id:"missing"}},{...valid,target:{...valid.target,sha256:"0".repeat(64)}},{...valid,target:{...valid.target,path:"characters/ironclad/experience.json"}},{...valid,evidence:[]},{...valid,target:{...valid.target,parent_id:"wrong"}}])expect(()=>validateDocuments({...base,[meta]:metaDoc([bad])})).toThrow();
 expect(()=>validateDocuments({...base,[meta]:metaDoc([valid,{...valid,id:"duplicate"}])})).toThrow("duplicate");expect(()=>validateDocuments({...base,[meta]:metaDoc([valid],"ironclad")})).toThrow();expect(()=>validateDocuments({[path]:doc([{...exp,topics:["illegal"]}])})).toThrow("topics");const s=store();publish(s,"old",base);expect(()=>s.submit(candidate(s,"wrong",{[meta]:metaDoc([valid])},"ironclad"))).toThrow("mismatch");
});
it("supports strict V6 and nested combo/vocab identities without extra fields",()=>{
 const s=store(),core=coreFixture(),rp="characters/silent/reflex.json",vp="characters/silent/reflex-vocab.json",cp="characters/silent/build-cores.json",files={[rp]:JSON.stringify({schema:"reflex-file-v1",character:"silent",entries:[reflex]}),[vp]:JSON.stringify(vocab),[cp]:JSON.stringify({schema:"build-cores-v1",character:"silent",entries:[core]})};
 const entries=[classification(rp,reflex,"reflex"),classification(cp,core,"core"),classification(cp,core.combos[0],"combo",core.direction),classification(vp,vocab.dimensions.card_role[0],"vocab","card_role")],v=publish(s,"strict",{...files,[meta]:metaDoc(entries)}),r=reader(s,v);
 for(const type of ["reflex","core","combo","vocab"] as const)expect(r.all({type,character:"silent",topic:"startup"})).toHaveLength(1);
 expect(()=>validateDocuments({...files,[rp]:JSON.stringify({schema:"reflex-file-v1",character:"silent",entries:[{...reflex,topics:["startup"]}]})})).toThrow();
});
it("isolates roles, ascensions and explicit game versions",async()=>{
 const s=store(),ip="characters/ironclad/experience.json",im="characters/ironclad/classification.json",iron={...exp,id:"iron-only"},v=publish(s,"roles",{[path]:doc([exp]),[meta]:metaDoc([classification()]),[ip]:doc([iron]),[im]:metaDoc([classification(ip,iron)],"ironclad")},"migration"),r=reader(s,v);
 expect(r.all({type:"experience",character:"silent",id:iron.id})).toEqual([]);expect(r.all({type:"experience",character:"silent",ascension:11,topic:"startup"})).toEqual([]);expect((await host(s,"IRON","reward/card",{},"ironclad").call("kb_experience",{topic:"startup"})).data.entries).toEqual([iron]);
 const nextExp={...exp,game_version:"fixture-game"},next=publish(s,"versioned",{[path]:doc([nextExp]),[meta]:metaDoc([classification(path,nextExp)])});expect(reader(s,next).all({type:"experience",character:"silent",gameVersion:"other-game"})).toEqual([]);
});
it("preserves history, CAS conflicts, restart, rollback and old/new bindings",async()=>{
 const s=store(),first=publish(s,"old",{[path]:doc([exp]),[meta]:metaDoc([classification()])}),old=host(s),a=candidate(s,"a",{[meta]:metaDoc([{...classification(),topics:["boss"]}])}),b=candidate(s,"b",{[meta]:metaDoc([{...classification(),topics:["climb_route"]}])});for(const c of [a,b]){s.submit(c);s.validate(c.id);}const next=s.publish(a.id);expect(()=>s.publish(b.id)).toThrow("conflict");expect(s.status(b.id).status).toBe("validated");expect(()=>s.submit({...a,source:"other"})).toThrow("idempotency");expect((await old.call("kb_experience",{topic:"startup"})).data.entries).toEqual([exp]);
 const fresh=host(s,"FRESH");expect((await fresh.call("kb_experience",{topic:"startup"})).data.entries).toEqual([]);expect((await fresh.call("kb_experience",{topic:"boss"})).data.entries).toEqual([exp]);s.rollback(first,"roll");closeIndexedReaders();s.close();const restarted=store(s.root);expect(restarted.bind("FRESH","code").version).toBe(next);expect(restarted.bind("AFTER","code").version).toBe(first);expect(restarted.db.prepare("SELECT count(*) n FROM revisions WHERE kind='classification'").get()!.n).toBe(2);
});
it("requires atomic target SHA revisions, keeps evidence and rolls back publication failure",()=>{
 const s=store(),first=publish(s,"old",{[path]:doc([exp]),[meta]:metaDoc([classification()])}),changed={...exp,lesson:"更新夹具"},c=candidate(s,"stale",{[path]:doc([changed])});s.submit(c);expect(()=>s.validate(c.id)).toThrow("stale");
 const good=candidate(s,"atomic",{[path]:doc([changed]),[meta]:metaDoc([classification(path,changed)])});s.submit(good);s.validate(good.id);expect(()=>s.publish(good.id,()=>{throw Error("crash");})).toThrow("crash");expect(s.current()).toBe(first);const v=s.publish(good.id);expect(reader(s,v).all({type:"experience",character:"silent",topic:"startup"})[0]!.value).toEqual(changed);
 const bad=candidate(s,"drop",{[meta]:metaDoc([{...classification(path,changed),evidence:["DIFFERENT"]}])});s.submit(bad);expect(()=>s.validate(bad.id)).toThrow("evidence");
});
it("upgrades schema2 transactionally without changing old revisions and restores all metadata",async()=>{
 const s=store(),v=publish(s,"old",{[path]:doc([exp])}),old=s.db.prepare("SELECT * FROM revisions").all();s.db.exec("DROP TABLE classification_terms; DROP TABLE classification_bindings; UPDATE metadata SET value='2' WHERE key='schema';");s.close();expect(()=>new KnowledgeStore(s.root,{migrationFailpoint:()=>{throw Error("upgrade-failed");}})).toThrow("upgrade-failed");const m=store(s.root);expect(m.db.prepare("SELECT * FROM revisions").all()).toEqual(old);expect(m.current()).toBe(v);expect(reader(m,v).coverage({type:"experience",character:"silent"})).toEqual({total:1,classified:0,unknown:1});publish(m,"meta",{[meta]:metaDoc([classification()])});const backup=join(directory(),"backup.sqlite");await m.backup(backup);const restored=KnowledgeStore.restore(backup,join(directory(),"restored"));stores.push(restored);expect(reader(restored,restored.current()!).all({type:"experience",character:"silent",topic:"startup"})).toHaveLength(1);
});
it("uses the real CLI to draft and complete a classification candidate",async()=>{
 const s=store(),v=publish(s,"old",{[path]:doc([exp])}),output=join(directory(),"candidate.json");vi.spyOn(console,"log").mockImplementation(()=>{});await main(["classification-draft","--runtime",s.root,"--version",v,"--character","silent","--path",path,"--type","experience","--entry",exp.id,"--classification-id","test-class","--id","batch","--source","fixture","--destination",output]);const c=JSON.parse(readFileSync(output,"utf8"));expect(s.current()).toBe(v);s.submit(c);expect(()=>s.validate(c.id)).toThrow("classification entry");const body=JSON.parse(c.files[meta]);Object.assign(body.entries[0],{topics:["startup"],evidence:["SILENT000001"],rationale:"仅夹具"});c.files[meta]=JSON.stringify(body);c.id="completed";writeFileSync(output,JSON.stringify(c));await main(["complete","--runtime",s.root,"--candidate",output,"--id",c.id,"--code","fixture-code"]);expect((await host(s).call("kb_experience",{topic:"startup"})).data.entries).toEqual([exp]);
});
it("replays the frozen startup gap strictly and supplies optional strategy tool input cues",async()=>{
 const fixture=join(import.meta.dirname,"knowledge-classification-fixtures"),lib=readFileSync(join(fixture,"strategies.json"),"utf8"),row=JSON.parse(readFileSync(join(fixture,"startup.json"),"utf8")),s=store(),v=publish(s,"frozen",{[stratPath]:lib}),h=host(s,"HISTORY",row.label,row.payload,"silent",10),r=await h.call("kb_strategies",{query:"*",topic:"startup",limit:3});expect(r.data.entries).toEqual([]);expect(r.data.classification_coverage.scope).toEqual({total:128,classified:0,unknown:128});expect(r.data.empty_reasons).toContain("unclassified_in_filter_pool");
 // Separate explicit offline diagnostic; the production call above never widens or retries.
 expect((await h.call("kb_strategies",{query:"*",limit:3})).data.total_matches).toBe(14);
 const req:any={label:row.label,question:"fixture",payload:row.payload,options:row.options,knowledge:{mode:"tools"},toolContext:h.ctx},guided=await attachQueryGuidance(req);expect(guided.question).toContain('"strategies":{"status":"ok","count":14,"tool":"kb_strategies","input":{"query":"*","limit":3}}');expect(guided.question).toContain("路线不变继续复用");expect(s.current()).toBe(v);
});

it("lets explicit sidecar revisions supersede legacy topics and disambiguates public fact kinds", async () => {
 const s = store(), inline = { ...exp, topics: ["startup"] };
 publish(s,"inline",{ [path]:doc([inline]), [meta]:metaDoc([{ ...classification(path,inline),topics:["boss"] }]) });
 const h = host(s); expect((await h.call("kb_experience",{topic:"startup"})).data.entries).toEqual([]);
 expect((await h.call("kb_experience",{topic:"boss"})).data.entries).toEqual([inline]);
 const bookPath="common/open-book.json", commonMeta="common/classification.json", fact={id:"FIXTURE_ENTITY",kind:"cards",name:"格式实体",aliases:[],source:"external:spire-codex",game_version:"v0.111.0",provenance:["fixture"],facts:{fixture:true}};
 const book={schema:"open-book-v1",sources:{sources:{fixture:{url:"https://example.com/fixture",sha256:"a".repeat(64),license:"fixture"}}},entries:[fact,{...fact,kind:"relics"}]};
 const v=publish(s,"common",{[bookPath]:JSON.stringify(book),[commonMeta]:metaDoc([classification(bookPath,fact,"fact","cards")],"common")},"common");
 const r=reader(s,v);expect(r.all({type:"fact",character:"ironclad",topic:"startup"}).map(e=>e.value.kind)).toEqual(["cards"]);
 const ch=host(s,"COMMON","reward/card",{},"ironclad");expect((await ch.call("kb_open_book",{query:"*",topic:"startup",category:"relics"})).data.entries).toEqual([]);
 expect((await ch.call("kb_open_book",{query:"*",topic:"startup",category:"cards"})).data.sources[0].classification.source.path).toBe(commonMeta);
});
