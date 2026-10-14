import fs from 'node:fs';
import path from 'node:path';
import v8 from 'node:v8';
import zlib from 'node:zlib';
import {finished} from 'node:stream/promises';
import {PerformanceObserver} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
const root=path.dirname(new URL(import.meta.url).pathname);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const coverage=read(path.join(root,'coverage.json')),seeds=read(path.join(root,'seeds.json'));
const baseline=read(path.join(root,'checkpoint.json'));
if(!fs.existsSync(path.join(root,'profiling-final.json'))||baseline.active||read(path.join(root,'profiling-final.json')).phases.length!==baseline.phases.length)
 throw new Error('original measurement has not stopped; refuse a concurrent pool');
const attempt=process.argv[2];
if(!attempt||!/^[a-zA-Z0-9_-]+$/.test(attempt))throw new Error('usage: node resume.mjs UNIQUE_ATTEMPT_ID');
const dir=path.join(root,'continuation-attempts',attempt);
if(fs.existsSync(dir))throw new Error('attempt already exists; preserve it and choose a fresh attempt ID');
for(const manifest of ['model-manifest.json','compiled-manifest.json'])for(const f of read(path.join(root,manifest)).files)
 if(sha(f.path)!==f.sha256)throw new Error(`frozen file changed: ${f.path}`);
const contract=read(path.join(root,'measurement-contract.json'));
if(sha(path.join(root,'coverage.json'))!==contract.coverage_sha256||sha(path.join(root,'seeds.json'))!==contract.seeds_sha256)
 throw new Error('frozen coverage or seeds changed');
for(const c of coverage.cases.filter(c=>c.status==='supported'))if(sha(c.executable_input.path)!==c.executable_input.sha256)
 throw new Error(`executable input changed: ${c.id}`);
if(process.argv.includes('--verify-only')){console.log(JSON.stringify({verified:true,pool_started:false}));process.exit(0);}
fs.mkdirSync(path.join(dir,'results'),{recursive:true});fs.mkdirSync(path.join(dir,'profiling'),{recursive:true});
const write=(name,value)=>{const p=path.join(dir,name);fs.writeFileSync(p+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(p+'.tmp',p);};
const cfg=read(path.join(root,'production-config.json'));
process.env.CHARACTER='silent';
for(const [key,name] of Object.entries({MECH_RULES:'mech_rules',MECH_MOVE_RULES:'mech_move_rules',MECH_DEATH_MOVE:'mech_death_move',PASSIVE_PIECES:'passive_pieces'}))
 process.env[key]=cfg.loop[name]===false?'off':'on';
const source=name=>import(path.join(root,'model/agent/src',name+'.js'));
const {BuildSimPool,completeSamples}=await source('sim/build-sim-pool');
const {compareOptions}=await source('sim/build-sim');
const {quantitativeFightFacts}=await source('sim/quantitative-facts');
const pool=new BuildSimPool(4),phases=[],watched=new WeakSet(),batches=new Map(),gc=[];
const observer=new PerformanceObserver(list=>gc.push(...list.getEntries().map(e=>({at:e.startTime,ms:e.duration,kind:e.detail?.kind??null}))));
observer.observe({entryTypes:['gc']});
const existing=[root];
const attemptsDir=path.join(root,'continuation-attempts');
for(const entry of fs.readdirSync(attemptsDir,{withFileTypes:true}))if(entry.isDirectory()&&entry.name!==attempt)existing.push(path.join(attemptsDir,entry.name));
const jobs=[];
for(const seed of seeds.all)for(const c of coverage.cases.filter(c=>c.status==='supported')) {
 const completed=existing.map(d=>path.join(d,'results',`${c.id}-${seed}-reference.json`)).find(f=>fs.existsSync(f)&&read(f).reference_complete===true&&read(f).actual_completed_pairs===1000);
 jobs.push({id:c.id,seed,mode:'reference',status:completed?'done':'pending',result:completed??null});
}
let active=null,stopping=false;const started=performance.now(),maxWallMs=130*60000;
const checkpoint=()=>write('checkpoint.json',{phase:'R1-R2',baseline:path.join(root,'checkpoint.json'),attempt,jobs,active,stopping,
 elapsed_ms:performance.now()-started,max_wall_ms:maxWallMs,workers:4,processes:1,
 phases:phases.map(p=>({id:p.id,path:p.file,case:p.case,seed:p.seed,mode:'reference',phase:p.phase,status:p.status,
  received:p.received,before_return:p.beforeReturn,after_return:p.afterReturn,complete_pairs:p.complete,
  requested:p.req.samples,outcomes_by_deck:p.counts,elapsed_ms:performance.now()-p.started}))});
write('contract.json',{baseline_contract:{path:path.join(root,'measurement-contract.json'),sha256:sha(path.join(root,'measurement-contract.json'))},
 model_manifest:{path:path.join(root,'model-manifest.json'),sha256:sha(path.join(root,'model-manifest.json'))},
 coverage_sha256:contract.coverage_sha256,seeds_sha256:contract.seeds_sha256,
 partial_policy:'retain original interrupted reply streams; unfinished references restart all original 1000 IDs in this separate attempt, never overwrite or mix incomplete sets',
 unchanged:{sample_target:1000,limited_deadline_ms:11000,minimum_shown:300,production_workers:24,offline_workers:4,max_turns:30},jobs});
function watch() {
 for(const [index,w] of pool.workers.entries())if(!watched.has(w)) {
  watched.add(w);w.on('message',message=>{
   const p=batches.get(message.batch);if(!p)return;
   const after=p.returnedAt!==null;p.stream.write(JSON.stringify({received_ms:performance.now()-p.started,after_return:after,worker:index,...message})+'\n');
   p.profiles[index]=message.offlineProfile??null;
   for(const [deck,order,sample,value] of message.results??[]) {
    p.received++;if(after)p.afterReturn++;else p.beforeReturn++;
    if(!p.outcomes[deck][order][sample])p.counts[deck]++;p.outcomes[deck][order][sample]=value;
   }
   p.complete=completeSamples(p.req,p.outcomes).length;
  });
 }
}
const runner={async run(req) {
 const phase=req.orders.length>1?'order-search':'comparison',id=`${active.id}-${active.seed}-reference-${phase}`;
 const file=path.join(dir,'profiling',id+'.jsonl.gz'),stream=zlib.createGzip({level:1}),destination=fs.createWriteStream(file);stream.pipe(destination);
 const p={id,file,case:active.id,seed:active.seed,phase,req,stream,destination,started:performance.now(),returnedAt:null,
  status:'running',received:0,beforeReturn:0,afterReturn:0,complete:0,counts:req.decks.map(()=>0),profiles:{},
  outcomes:req.decks.map(()=>req.orders.map(()=>new Array(req.samples)))};phases.push(p);
 const promise=pool.run(req);await new Promise(r=>setImmediate(r));batches.set(pool.batch,p);watch();checkpoint();
 try {
  const r=await promise;p.returnedAt=performance.now();p.status='returned';p.returned=r;
  write(`profiling/${id}.summary.json`,{id,case:active.id,seed:active.seed,mode:'reference',phase,
   request:{decks:req.decks.length,orders:req.orders.length,seed:req.seed,samples:req.samples,maxTurns:req.maxTurns??30,deadline_ms:null,stripes:req.stripes??null},
   actual_completed_intersection:r.complete.length,complete_ids:r.complete,timed_out:r.timedOut,elapsed_ms:r.elapsedMs,workers:r.workers,pool:r.diagnostics??null,
   by_deck:r.outcomes.map((orders,deck)=>({deck,completed:orders.reduce((n,a)=>n+a.filter(Boolean).length,0),terminal_complete:orders.reduce((n,a)=>n+a.filter(s=>s&&!s.capped&&!s.timeUp&&(s.won||s.died)).length,0)}))});
  fs.writeFileSync(path.join(dir,`results/${id}.v8.gz`),zlib.gzipSync(v8.serialize({request:{decks:req.decks.length,orders:req.orders,stripes:req.stripes,samples:req.samples,seed:req.seed},result:r}),{level:1}));
  return r;
 }catch(error){p.returnedAt=performance.now();p.status='interrupted';p.error=String(error.stack??error);throw error;}
}};
const timer=setTimeout(()=>{stopping=true;checkpoint();void pool.close();},maxWallMs),progress=setInterval(checkpoint,5000);progress.unref();
try {
 for(const job of jobs.filter(j=>j.status==='pending')) {
  if(stopping)break;active={id:job.id,seed:job.seed,mode:'reference'};job.status='running';checkpoint();
  const c=coverage.cases.find(c=>c.id===job.id),request=v8.deserialize(fs.readFileSync(c.executable_input.path)),wall=performance.now(),cpu=process.cpuUsage(),gcBefore=gc.length;
  try {
   const result=await compareOptions(runner,request.base,request.options,{seed:job.seed,samples:1000,diagnostics:true,quantitative:true});
   const p=phases.findLast(p=>p.case===job.id&&p.seed===job.seed&&p.phase==='comparison'),r=p.returned,ids=r.complete;
   let next=1;const rows=new Map();
   for(const o of request.options)rows.set(o.key,o.mixture?.length?o.mixture.map(()=>next++):o.change?[next++]:[0]);
   const base=ids.map(i=>r.outcomes[0][0][i]);
   const full={samples:ids.length,complete_ids:ids,base:ids.length?quantitativeFightFacts(base,base,ids):null,
    options:Object.fromEntries([...rows].map(([key,decks])=>[key,ids.length?quantitativeFightFacts(ids.map(i=>r.outcomes[decks[i%decks.length]][0][i]),base,ids):null])),zero_sample_metrics_are_unavailable:ids.length===0};
   const name=`results/${job.id}-${job.seed}-reference.json`;
   write(name,{id:job.id,seed:job.seed,mode:'reference',sample_target:1000,actual_completed_pairs:ids.length,reference_complete:ids.length===1000,
    wall_ms:performance.now()-wall,main_cpu_us:process.cpuUsage(cpu),main_gc:gc.slice(gcBefore),result,full_quantitative:full,
    phases:phases.filter(p=>p.case===job.id&&p.seed===job.seed).map(p=>p.file),delivered_numeric_gate:null,
    ranking_scope:'convergence reference only; original partial attempt retained separately'});
   job.status='done';job.result=path.join(dir,name);job.completed_pairs=ids.length;
   console.log(JSON.stringify({id:job.id,seed:job.seed,pairs:ids.length,ms:Math.round(performance.now()-wall)}));
  }catch(error){job.status=stopping?'resource_interrupted':'failed';job.error=String(error.stack??error);write(`results/${job.id}-${job.seed}-reference.failure.json`,job);if(!stopping)throw error;}
  active=null;checkpoint();
 }
}catch(error){write('measurement-failure.json',{error:String(error.stack??error),active});process.exitCode=1;}
finally {
 clearTimeout(timer);clearInterval(progress);await pool.close();for(const p of phases){p.stream.end();await finished(p.destination);}
 write('profiling-final.json',{main_gc:gc,phases:phases.map(p=>({id:p.id,status:p.status,received:p.received,before_return:p.beforeReturn,after_return:p.afterReturn,complete_pairs:p.complete,worker_profiles:p.profiles,error:p.error??null}))});
 checkpoint();observer.disconnect();console.log(JSON.stringify({outcome:jobs.every(j=>j.status==='done')?'complete':stopping?'continue':'blocked',done:jobs.filter(j=>j.status==='done').length,jobs:jobs.length}));
}
