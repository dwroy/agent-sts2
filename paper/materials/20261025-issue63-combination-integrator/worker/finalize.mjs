import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const c=JSON.parse(fs.readFileSync(process.env.INTEGRATOR20_CHECK_CONTEXT,'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const now=()=>new Date().toISOString();
const save=s=>{let p=path.join(c.material,c.state.mode+'-state.json');fs.writeFileSync(p+'.tmp',JSON.stringify(s,null,2)+'\n');fs.renameSync(p+'.tmp',p);};
if(process.pid===c.state.worker_pid){
 for(let i=process.execArgv.length-2;i>=0;i--)if(process.execArgv[i]==='--import'&&process.execArgv[i+1]===import.meta.filename)process.execArgv.splice(i,2);
 if(fs.fstatSync(c.lock_fd).ino!==c.lock_inode)throw Error('check lock identity mismatch');
 let s={...c.state,at:now(),phase:c.state.mode+'-running',held_locks:['ops/integrator-full-check.lock']};save(s);
 process.on('exit',code=>{
  s={...s,at:now(),rc:code};
  try{
   const b=fs.readFileSync(c.result),r=JSON.parse(b);s={...s,files:r.testResults.length,passed:r.numPassedTests,failed:r.numFailedTests,skipped:r.numPendingTests,result_sha256:sha(b)};
   const changed=c.inputs.filter(x=>sha(fs.readFileSync(path.join(c.worktree,x.path)))!==x.sha256).map(x=>x.path);
   const depChanged=c.dependencies.filter(x=>sha(fs.readFileSync(path.join(c.node_root,x.path)))!==x.sha256).map(x=>x.path);
   const runtimeChanged=c.runtime_inputs.filter(x=>sha(fs.readFileSync(path.join(c.runtime_worktree,x.path)))!==x.sha256).map(x=>x.path);
   s.runtime_inputs_unchanged=!runtimeChanged.length;s.runtime_changed=runtimeChanged;s.runtime_input_count=c.runtime_inputs.length;s.runtime_tree_unchanged=execFileSync('git',['-C',c.runtime_worktree,'write-tree'],{encoding:'utf8'}).trim()===c.runtime_tree;
   const semantic={};
   for(const [label,args] of [['entries',['ls-files','--stage','-z']],['flags',['ls-files','-v','-z']]]){
    const b=execFileSync('git',['-C',c.worktree,...args],{maxBuffer:64*1024*1024,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}});
    fs.writeFileSync(path.join(c.artifacts,c.state.mode+'-index-'+label+'-after.bin'),b);semantic[label]=sha(b);
   }
   const indexAfter=fs.readFileSync(c.index);fs.writeFileSync(path.join(c.artifacts,c.state.mode+'-index-after.bin'),indexAfter);
   s={...s,index_entries_unchanged:semantic.entries===c.index_semantic_before.entries,index_flags_unchanged:semantic.flags===c.index_semantic_before.flags,index_semantic_before:c.index_semantic_before,index_semantic_after:semantic,index_before_sha256:c.index_sha256,index_after_sha256:sha(indexAfter),input_files:c.inputs.length,dependency_files:c.dependencies.length,inputs_unchanged:!changed.length,dependencies_unchanged:!depChanged.length,index_unchanged:sha(fs.readFileSync(c.index))===c.index_sha256,tree_unchanged:execFileSync('git',['-C',c.worktree,'write-tree'],{encoding:'utf8'}).trim()===c.tree,changed,depChanged};
   if(code!==0||!r.success||r.numFailedTests)throw Error('test failure; raw result retained');
   if(!s.runtime_inputs_unchanged||!s.runtime_tree_unchanged||!s.inputs_unchanged||!s.dependencies_unchanged||!s.index_entries_unchanged||!s.index_flags_unchanged||!s.tree_unchanged)throw Error('frozen input drift');
   s.phase=c.state.mode+'-passed';
  }catch(e){s={...s,phase:c.state.mode+'-stopped',error:String(e)};}
  fs.closeSync(c.lock_fd);s={...s,at:now(),check_lock_released:true,held_locks:[]};save(s);
 });
}
