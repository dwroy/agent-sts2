from pathlib import Path
import fcntl,hashlib,json,os,subprocess,traceback
R=Path('/home/dw/Projects/agent-sts2');A=Path(__file__).resolve().parent;M=R/'paper/materials/20261025-issue70-integrator';d=json.loads((M/'actual-live-consumer-inputs.json').read_text());F=Path(d['fixture']);L=R/'.worktrees/live';sha=lambda b:hashlib.sha256(b).hexdigest();now=lambda:subprocess.check_output(['date','-Is'],text=True).strip()
assert json.loads((M/'terminal-readback.json').read_text())['accepted']
s=dict(at=now(),phase='preflight',pid=os.getpid(),birth=Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],nice=os.getpriority(os.PRIO_PROCESS,0),full_runs=0,model_calls=0,production_operations=0)
def save(): (M/'actual-live-consumer-state.json').write_text(json.dumps(s,indent=2)+'\n')
def verify():
    actual_paths={str(p.relative_to(F)) for p in F.rglob('*') if p.is_file() and not p.is_symlink() and 'node_modules' not in p.parts and '.cache' not in p.relative_to(F).parts}
    assert actual_paths=={x['path'] for x in d['inputs']}, ('fixture input set drift', sorted(actual_paths-{x['path'] for x in d['inputs']}))
    for x in d['inputs']:
        p=F/x['path'];assert sha(p.read_bytes())==x['sha256'] and p.stat().st_mode&0o777==x['mode'],x['path']
    assert subprocess.check_output(['git','-C',str(L),'rev-parse','HEAD'],text=True).strip()==d['actual_live']
    for x in d['baseline']:assert sha((L/x['path']).read_bytes())==x['sha256'],('actual LIVE baseline changed',x['path'])
    for x in d['overlay']:
        p=L/x['path'];assert (sha(p.read_bytes()) if p.is_file() else None)==x['before_sha256'],('actual LIVE overlay preimage changed',x['path'])
lock=(R/'ops/integrator-full-check.lock').open('a');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
try:
    verify();save();env={**os.environ,'PATH':str(Path.home()/'.local/node/bin')+':'+os.environ.get('PATH',''),'PYTHONDONTWRITEBYTECODE':'1','GOMAXPROCS':'1','GIT_OPTIONAL_LOCKS':'0'}
    for label,cmd in [('tsc',['node','node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit']),('targeted',['node','node_modules/vitest/vitest.mjs','run',*d['tests'],'--pool=forks','--testTimeout=60000','--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter=json','--outputFile='+str(M/'actual-live-consumer-tests.json')])]:
        s.update(at=now(),phase=label);save()
        with (M/('actual-live-'+label+'.log')).open('wb') as out:q=subprocess.run(cmd,cwd=F/'agent',env=env,stdout=out,stderr=subprocess.STDOUT,timeout=1500)
        s[label+'_rc']=q.returncode;save();assert q.returncode==0,label
    verify();r=json.loads((M/'actual-live-consumer-tests.json').read_text());assert r['success'] and r['numFailedTests']==0
    s.update(at=now(),phase='passed',files=len(r['testResults']),passed=r['numPassedTests'],failed=r['numFailedTests'],skipped=r['numPendingTests'],actual_live=d['actual_live'],all_inputs_unchanged=True,actual_live_source_unchanged=True)
except BaseException as e:
    s.update(at=now(),phase='stopped',error=repr(e));(M/'actual-live-consumer-error.log').write_text(traceback.format_exc());raise
finally:
    lock.close();s['check_lock_released']=True;save();print(json.dumps(s))
