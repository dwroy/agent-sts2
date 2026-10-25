const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {buildSync} = require('../../../agent/node_modules/esbuild');
const root=process.cwd(), frozen=path.join(root,'.worktrees/integrator60-runtime-closure-20261025');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const result={at:new Date().toISOString(),method:'esbuild bundle metadata only; no module execution; literal module edges, excludes computed subprocess paths',profiles:{}};
for (const [name,entries] of Object.entries({host_cli:['agent/tools/knowledge-runtime.ts'],host_launcher:['learner/run.ts']})) {
  const variants={};
  for (const [variant,dir] of Object.entries({frozen,current:root})) {
    const built=buildSync({absWorkingDir:dir,entryPoints:entries,bundle:true,platform:'node',format:'esm',packages:'external',write:false,metafile:true,treeShaking:false,logLevel:'silent'});
    variants[variant]={files:Object.keys(built.metafile.inputs).sort().map(p=>({path:p,sha256:digest(fs.readFileSync(path.join(dir,p)))})),warnings:built.warnings.map(w=>w.text)};
  }
  const before=new Map(variants.frozen.files.map(f=>[f.path,f.sha256]));
  result.profiles[name]={...variants,differences:variants.current.files.filter(f=>f.sha256!==before.get(f.path)),removed:variants.frozen.files.filter(f=>!variants.current.files.some(g=>g.path===f.path))};
}
fs.writeFileSync(path.join(__dirname,'bundle-closure.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(result.profiles).map(([k,p])=>[k,{frozen:p.frozen.files.length,current:p.current.files.length,differences:p.differences,removed:p.removed,warnings:p.current.warnings}])),null,2));
