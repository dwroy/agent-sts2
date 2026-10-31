from pathlib import Path
import os,json,fcntl,subprocess,hashlib,traceback
R=Path('/home/dw/Projects/agent-sts2');A=Path(__file__).resolve().parent;M=R/'paper/materials/20261025-issue63-combination-integrator';a=json.loads((M/'assembly.json').read_text());W=Path(a['worktree']);sha=lambda b:hashlib.sha256(b).hexdigest();now=lambda:subprocess.check_output(['date','-Is'],text=True).strip()
s=dict(at=now(),phase='preflight',mode='full',worker_pid=os.getpid(),worker_birth=Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],new_full_runs=0,previous_failed_full_runs=0,previous_interrupted_full_runs=0,total_full_runs=0,model_calls=0,production_operations=0,check_lock_released=False)
def save():(M/'full-state.json').write_text(json.dumps(s,indent=2)+'\n')
try:
 lock=(R/'ops/integrator-full-check.lock').open('a');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 inputs=json.loads((A/'inputs-before.json').read_text());deps=json.loads((A/'dependencies-before.json').read_text());node=(W/'agent/node_modules').resolve()
 for x in inputs:assert sha((W/x['path']).read_bytes())==x['sha256'],x['path']
 for x in deps:assert sha((node/x['path']).read_bytes())==x['sha256'],x['path']
 assert subprocess.check_output(['git','-C',str(W),'write-tree'],text=True).strip()==a['validation_tree']
 G=Path(a['game_worktree']);runtime=json.loads((A/'runtime-inputs-before.json').read_text())
 for x in runtime:assert sha((G/x['path']).read_bytes())==x['sha256'],x['path']
 assert subprocess.check_output(['git','-C',str(G),'write-tree'],text=True).strip()==a['runtime_tree']
 env={**os.environ,'PATH':str(Path.home()/'.local/node/bin')+':'+os.environ.get('PATH',''),'PYTHONDONTWRITEBYTECODE':'1','GOMAXPROCS':'1','PYTHONPATH':str(W/'ops/tests'),'GIT_OPTIONAL_LOCKS':'0','TMPDIR':str(A/'deliberately-long-temp-path-for-the-original-bounded-ENOENT-diagnostic-check')};Path(env['TMPDIR']).mkdir(exist_ok=True)
 s.update(phase='production-tsc');save()
 with (M/'production-tsc.log').open('wb') as out:q=subprocess.run(['node','node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit'],cwd=W/'agent',env=env,stdout=out,stderr=subprocess.STDOUT,timeout=600)
 s['production_tsc_rc']=q.returncode;save();assert q.returncode==0
 s.update(phase='runtime-tsc');save()
 with (M/'runtime-tsc.log').open('wb') as out:q=subprocess.run(['node','node_modules/typescript/bin/tsc','-p','tsconfig.knowledge-runtime.json','--noEmit'],cwd=W/'agent',env=env,stdout=out,stderr=subprocess.STDOUT,timeout=600)
 s['runtime_tsc_rc']=q.returncode;save();assert q.returncode==0
 for label,config in [('deployed-production-tsc','tsconfig.json')]:
  s.update(phase=label);save()
  with (M/(label+'.log')).open('wb') as out:q=subprocess.run(['node','node_modules/typescript/bin/tsc','-p',config,'--noEmit'],cwd=G/'agent',env=env,stdout=out,stderr=subprocess.STDOUT,timeout=600)
  s[label+'_rc']=q.returncode;save();assert q.returncode==0
 s.update(phase='deployed-strategy-targeted');save()
 with (M/'deployed-strategy-targeted.log').open('wb') as out:q=subprocess.run(['node','node_modules/vitest/vitest.mjs','run','tests/silent-paels-legion.test.ts','--pool=forks','--maxWorkers=1','--no-file-parallelism','--reporter=json','--outputFile='+str(M/'deployed-strategy-targeted.json')],cwd=G/'agent',env=env,stdout=out,stderr=subprocess.STDOUT,timeout=600)
 s['deployed_strategy_targeted_rc']=q.returncode;save();assert q.returncode==0
 s.update(phase='root-targeted');save()
 with (M/'root-targeted.log').open('wb') as out:q=subprocess.run(['node','node_modules/vitest/vitest.mjs','run','tests/silent-paels-legion.test.ts','tests/postmortem-failure-audit.test.ts','tests/ops-autoplay-console.test.ts','tests/learner-tabs.test.ts','tests/learner-herdr-receipts.test.ts','tests/learner-wrapper-scripts.test.ts','tests/check-imports.test.ts','tests/paths.test.ts','--pool=forks','--maxWorkers=1','--no-file-parallelism','--reporter=json','--outputFile='+str(M/'root-targeted.json')],cwd=W/'agent',env=env,stdout=out,stderr=subprocess.STDOUT,timeout=600)
 s['root_targeted_rc']=q.returncode;save();assert q.returncode==0
 os.close(os.open(A/'full.once',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600));s['new_full_runs']=1;s['total_full_runs']=1
 fd=lock.fileno();os.set_inheritable(fd,True);idx=Path(subprocess.check_output(['git','-C',str(W),'rev-parse','--path-format=absolute','--git-path','index'],text=True).strip());before={}
 for label,args in [('entries',['ls-files','--stage','-z']),('flags',['ls-files','-v','-z'])]:
  b=subprocess.check_output(['git','-C',str(W),*args],env=env);(A/('full-index-'+label+'-before.bin')).write_bytes(b);before[label]=sha(b)
 (A/'full-index-before.bin').write_bytes(idx.read_bytes());c=dict(index_semantic_before=before,root=str(R),artifacts=str(A),material=str(M),worktree=str(W),node_root=str(node),inputs=inputs,dependencies=deps,index=str(idx),index_sha256=sha(idx.read_bytes()),tree=a['validation_tree'],lock_fd=fd,lock_inode=(R/'ops/integrator-full-check.lock').stat().st_ino,state=s,result=str(M/'full.json'))
 c.update(runtime_worktree=str(G),runtime_inputs=runtime,runtime_tree=a['runtime_tree'])
 context=A/'full-context.json';context.write_text(json.dumps(c)+'\n');env['INTEGRATOR20_CHECK_CONTEXT']=str(context);save();os.chdir(W/'agent')
 os.execvpe('node',['node','--import',str(A/'finalize.mjs'),'node_modules/vitest/vitest.mjs','run','--pool=forks','--testTimeout=60000','--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter=json','--outputFile='+c['result']],env)
except BaseException as e:
 s.update(at=now(),phase='preflight-stopped',error=repr(e),check_lock_released=True);save();(M/'full-error.log').write_text(traceback.format_exc());raise
