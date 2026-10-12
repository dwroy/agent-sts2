import { Worker, isMainThread, workerData, parentPort } from 'node:worker_threads';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeFileSync, readdirSync, readFileSync } from 'node:fs';
if (isMainThread) {
  const [root,dataset,out,keys=''] = process.argv.slice(2);
  const require = createRequire(root+'/agent/package.json');
  const api = require.resolve('tsx/esm/api');
  const started = new Date().toISOString();
  const workers = 3;
  const live = [];
  let maximumProcesses = 1, resourceError = null;
  const monitor = setInterval(() => {
    const rows = readdirSync('/proc').filter(x => /^\d+$/.test(x)).flatMap(pid => {
      try {
        const stat = readFileSync('/proc/'+pid+'/stat','utf8');
        const parts = stat.slice(stat.lastIndexOf(')')+2).trim().split(/\s+/);
        return [{pid:Number(pid),ppid:Number(parts[1]),name:stat.slice(stat.indexOf('(')+1,stat.lastIndexOf(')')),nice:Number(parts[16])}];
      } catch { return []; }
    });
    const owned = new Set([process.pid]);
    for (let pass=0;pass<rows.length;pass++) for(const row of rows) if(owned.has(row.ppid)) owned.add(row.pid);
    const descendants = rows.filter(row=>owned.has(row.pid));
    maximumProcesses = Math.max(maximumProcesses,descendants.length);
    writeFileSync(out+'.processes.json',JSON.stringify({maximumProcesses,limit:4,latest:descendants},null,1)+'\n');
    if(descendants.length>4 && !resourceError) {
      resourceError='worker replay exceeded four OS processes';
      for (const worker of live) worker.terminate();
    }
  },1000);
  monitor.unref();
  const result = await Promise.all(Array.from({length:workers},(_,shard)=>new Promise((resolve)=>{
    const worker = new Worker(new URL(import.meta.url), {workerData:{root,dataset,out,keys,api,shard,workers},execArgv:[]});
    live.push(worker);
    let message = null;
    worker.on('message',value=>{message=value;});
    worker.on('error',error=>{message={error:String(error)};});
    worker.on('exit',code=>resolve({shard,code,message}));
  })));
  clearInterval(monitor);
  writeFileSync(out+'.receipt.json',JSON.stringify({started,finished:new Date().toISOString(),runner:root+'/agent/tools/boss-sim/backtest.ts',workers,maximumProcesses,resourceError,
    process_limit:'one Node with three worker threads and at most three esbuild services',samples:200,seed:'1 + original dataset row index * 101',result},null,1)+'\n');
  console.log(JSON.stringify(result));
  process.exitCode = !resourceError && result.every(r=>r.code===0 && !r.message?.error)?0:1;
} else {
  const {root,dataset,out,keys,api,shard,workers}=workerData;
  process.env.CHARACTER='silent';
  process.argv=['node',root+'/agent/tools/boss-sim/backtest.ts','--character','silent','--game-data','/home/dw/Projects/agent-sts2/data/game-data.json',
    '--in',dataset,'--out-dir',out,'--samples','200','--seed','1','--starts','t1,pre','--no-rollout','--shard',String(shard),'--shards',String(workers),
    ...(keys?['--keys',keys]:[])];
  try {
    const {tsImport}=await import(pathToFileURL(api).href);
    await tsImport(root+'/agent/tools/boss-sim/backtest.ts',import.meta.url);
    parentPort.postMessage({complete:true});
  }catch(error){
    console.error(error);parentPort.postMessage({error:String(error)});process.exitCode=1;
  }
}
