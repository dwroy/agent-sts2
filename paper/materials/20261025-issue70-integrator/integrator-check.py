from pathlib import Path
import os, json, hashlib, subprocess, fcntl, traceback
R=Path('/home/dw/Projects/agent-sts2');A=Path(__file__).resolve().parent;M=R/'paper/materials/20261025-issue70-integrator'
a=json.loads((M/'assembly.json').read_text());W=Path(a['worktree']);sha=lambda b:hashlib.sha256(b).hexdigest();now=lambda:subprocess.check_output(['date','-Is'],text=True).strip()
s=dict(at=now(),phase='preflight',worker_pid=os.getpid(),worker_birth=Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],nice=os.getpriority(os.PRIO_PROCESS,0),new_full_runs=0,model_calls=0,production_operations=0,check_lock_released=False)
def save():
    t=M/'full-state.json.tmp';t.write_text(json.dumps(s,indent=2)+'\n');t.replace(M/'full-state.json')
try:
    lock=(R/'ops/integrator-full-check.lock').open('a');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    inputs=json.loads((A/'inputs-before.json').read_text());deps=json.loads((A/'dependencies-before.json').read_text());node=(W/'agent/node_modules').resolve()
    def verify():
        for x in inputs:
            p=W/x['path'];assert sha(p.read_bytes())==x['sha256'] and p.stat().st_mode&0o777==x['mode'] and (os.readlink(p) if p.is_symlink() else None)==x['symlink'],x['path']
        for x in deps:assert sha((node/x['path']).read_bytes())==x['sha256'],x['path']
        assert subprocess.check_output(['git','-C',str(W),'write-tree'],text=True).strip()==a['validation_tree']
    verify();save()
    env={**os.environ,'PATH':str(Path.home()/'.local/node/bin')+':'+os.environ.get('PATH',''),'PYTHONDONTWRITEBYTECODE':'1','GOMAXPROCS':'1','PYTHONPATH':str(W/'ops/tests'),'GIT_OPTIONAL_LOCKS':'0','TMPDIR':str(A/'deliberately-long-temp-path-for-original-bounded-ENOENT-fixture')}
    Path(env['TMPDIR']).mkdir(exist_ok=True)
    host=json.loads((W/'.agents/queue-checks.json').read_text())['host_modules']
    host+=['ops.tests.test_learning_runtime','ops.tests.test_llm_handoff','ops.tests.test_knowledge_classification','ops.tests.test_public_web']
    for module in host:assert (W/(module.replace('.', '/')+'.py')).is_file(),module
    s['previous_preflight_failures']=0
    for label,cmd,cwd in [
        ('production-tsc',['node','node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit'],W/'agent'),
        ('runtime-cli-tsc',['node','node_modules/typescript/bin/tsc','-p','tsconfig.knowledge-runtime.json','--noEmit'],W/'agent'),
        ('host-public-web',['python3','-B','-m','unittest',*host],W),
    ]:
        s.update(phase=label);save()
        with (M/(label+'.log')).open('wb') as out:q=subprocess.run(cmd,cwd=cwd,env=env,stdout=out,stderr=subprocess.STDOUT,timeout=1500)
        s[label+'_rc']=q.returncode;save();assert q.returncode==0,label
    verify()
    os.close(os.open(A/'full.once',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600));s['new_full_runs']=1
    before={}
    for label,args in [('entries',['ls-files','--stage','-z']),('flags',['ls-files','-v','-z'])]:
        b=subprocess.check_output(['git','-C',str(W),*args],env=env);(A/('full-index-'+label+'-before.bin')).write_bytes(b);before[label]=sha(b)
    fd=lock.fileno();os.set_inheritable(fd,True)
    c=dict(root=str(R),artifacts=str(A),material=str(M),worktree=str(W),node_root=str(node),inputs=inputs,dependencies=deps,index_semantic_before=before,validation_tree=a['validation_tree'],lock_fd=fd,lock_inode=os.fstat(fd).st_ino,state=s,result=str(M/'full.json'))
    context=A/'full-context.json';context.write_text(json.dumps(c)+'\n');env['ISSUE70_CHECK_CONTEXT']=str(context);save();os.chdir(W/'agent')
    os.execvpe('node',['node','--import',str(A/'finalize.mjs'),'node_modules/vitest/vitest.mjs','run','--pool=forks','--testTimeout=60000','--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter=json','--outputFile='+c['result']],env)
except BaseException as e:
    s.update(at=now(),phase='preflight-stopped',error=repr(e),check_lock_released=True);save();(M/'full-error.log').write_text(traceback.format_exc());raise
