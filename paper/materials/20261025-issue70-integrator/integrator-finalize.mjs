import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const c=JSON.parse(fs.readFileSync(process.env.ISSUE70_CHECK_CONTEXT,'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const save=s=>{const p=path.join(c.material,'full-state.json');fs.writeFileSync(p+'.tmp',JSON.stringify(s,null,2)+'\n');fs.renameSync(p+'.tmp',p);};
if(process.pid===c.state.worker_pid){
  for(let i=process.execArgv.length-2;i>=0;i--)if(process.execArgv[i]==='--import'&&process.execArgv[i+1]===import.meta.filename)process.execArgv.splice(i,2);
  if(fs.fstatSync(c.lock_fd).ino!==c.lock_inode)throw Error('check lock identity mismatch');
  let s={...c.state,at:new Date().toISOString(),phase:'full-running'};save(s);
  process.on('exit',code=>{
    s={...s,at:new Date().toISOString(),rc:code};
    try{
      const raw=fs.readFileSync(c.result),r=JSON.parse(raw);
      s={...s,files:r.testResults.length,passed:r.numPassedTests,failed:r.numFailedTests,skipped:r.numPendingTests,result_sha256:sha(raw)};
      s.input_drift=c.inputs.filter(x=>{const p=path.join(c.worktree,x.path);return sha(fs.readFileSync(p))!==x.sha256||(fs.statSync(p).mode&0o777)!==x.mode||(fs.lstatSync(p).isSymbolicLink()?fs.readlinkSync(p):null)!==x.symlink;}).map(x=>x.path);
      s.dependency_drift=c.dependencies.filter(x=>sha(fs.readFileSync(path.join(c.node_root,x.path)))!==x.sha256).map(x=>x.path);
      const semantic={};for(const [label,args] of [['entries',['ls-files','--stage','-z']],['flags',['ls-files','-v','-z']]]){
        const b=execFileSync('git',['-C',c.worktree,...args],{maxBuffer:64*1024*1024,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}});fs.writeFileSync(path.join(c.artifacts,'full-index-'+label+'-after.bin'),b);semantic[label]=sha(b);
      }
      s.index_semantic_after=semantic;s.index_semantic_unchanged=Object.entries(semantic).every(([k,v])=>v===c.index_semantic_before[k]);
      s.tree_unchanged=execFileSync('git',['-C',c.worktree,'write-tree'],{encoding:'utf8'}).trim()===c.validation_tree;
      if(code!==0||!r.success||r.numFailedTests)throw Error('test failure; raw result retained');
      if(s.input_drift.length||s.dependency_drift.length||!s.index_semantic_unchanged||!s.tree_unchanged)throw Error('frozen check input drift');
      s.phase='full-passed';
    }catch(e){s={...s,phase:'full-stopped',error:String(e)};}
    fs.closeSync(c.lock_fd);s={...s,at:new Date().toISOString(),check_lock_released:true};save(s);
  });
}
