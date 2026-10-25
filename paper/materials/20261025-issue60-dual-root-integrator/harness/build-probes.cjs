const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {pathToFileURL} = require('node:url');
const R = '/home/dw/Projects/agent-sts2';
const A = __dirname;
const M = path.join(R, 'paper/materials/20261025-issue60-dual-root-integrator');
const assembly = JSON.parse(fs.readFileSync(path.join(M, 'assembly.json')));
const H = assembly.worktree, G = assembly.game_worktree;
const {buildSync} = require(path.join(H, 'agent/node_modules/esbuild'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const graphs = {};
for (const [name, entry] of Object.entries({launcher:'learner/run.ts',cli:'agent/tools/knowledge-runtime.ts'})) {
 const variants = {};
 for (const [variant, root] of Object.entries({actual:R,frozen:H})) {
  const b = buildSync({absWorkingDir:root,entryPoints:[entry],bundle:true,platform:'node',format:'esm',packages:'external',write:false,metafile:true,treeShaking:false,logLevel:'silent'});
  variants[variant] = Object.keys(b.metafile.inputs).sort().map(p => ({path:p,sha256:sha(fs.readFileSync(path.join(root,p)))}));
 }
 if (JSON.stringify(variants.actual)!==JSON.stringify(variants.frozen)) throw Error(name+' actual/frozen drift');
 graphs[name] = {...variants,exact:true};
}
const prepared = fs.readFileSync(path.join(A,'prepare-probe.ts'),'utf8').replaceAll('@HOST@',H).replaceAll('@GAME@',G);
const game = fs.readFileSync(path.join(A,'game-probe.ts'),'utf8').replaceAll('@GAME@',G);
const launcher = fs.readFileSync(path.join(A,'launcher-probe.ts'),'utf8').replaceAll('@HOST@',H);
const outputs = {};
for (const [name, entry, contents] of [['cli',path.join(H,'agent/tools/knowledge-runtime.ts'),null],['prepare',null,prepared],['game',null,game],['launcher',null,launcher]]) {
 // Preserve the real core/paths.ts file location when bundling: the default knowledge
 // directory must remain the actual game's directory, rather than the bundle's.
 // The original source is recorded separately; this is harness-only path relocation.
 const b = buildSync({absWorkingDir:H,...(entry?{entryPoints:[entry]}:{stdin:{contents,resolveDir:A,sourcefile:path.join(A,name+'-entry.ts'),loader:'ts'}}),bundle:true,platform:'node',format:'esm',packages:'external',write:false,metafile:true,logLevel:'silent'});
 let code=b.outputFiles[0].text;
 // esbuild labels each module; replace only core/paths.ts's one import.meta.url.
 const matches=[...code.matchAll(/\/\/ ([^\n]*agent\/src\/core\/paths\.ts)\n/g)];
 for (const m of matches) {
  const start=m.index+m[0].length,end=code.indexOf('\n// ',start);
  const section=code.slice(start,end<0?code.length:end);
  const original=path.resolve(H,m[1]);
  const replacement=section.replace('import.meta.url',JSON.stringify(pathToFileURL(original).href));
  code=code.slice(0,start)+replacement+code.slice(end<0?code.length:end);
 }
 const output=path.join(A,name+'.mjs');fs.writeFileSync(output,code);
 const inputs=Object.keys(b.metafile.inputs).filter(p=>!p.endsWith('-entry.ts')).map(p=>({path:path.resolve(H,p),sha256:sha(fs.readFileSync(path.resolve(H,p)))}));
 outputs[name]={output,sha256:sha(code),inputs,external:Object.values(b.metafile.outputs).flatMap(x=>x.imports.filter(i=>i.external).map(i=>i.path)),warnings:b.warnings.map(x=>x.text)};
}
fs.writeFileSync(path.join(M,'probe-bundles.json'),JSON.stringify({at:new Date().toISOString(),graphs,outputs,harness_path_relocation:'Only the core/paths.ts import.meta.url is replaced with its original module file URL, preserving the unbundled default root. No runtime logic replaced.'},null,2)+'\n');
console.log(JSON.stringify({launcher:graphs.launcher.actual.length,cli:graphs.cli.actual.length,outputs:Object.keys(outputs)}));
