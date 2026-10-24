import hashlib, json, os, subprocess, sys, time, traceback
from pathlib import Path

W = Path(__file__).resolve().parents[2]
A = Path(__file__).resolve().parent
F = A/'full-repeat1'
F.mkdir(exist_ok=False)
def git(*args):
    return subprocess.check_output(['git',*args],cwd=W).decode().strip()
def now():
    return subprocess.check_output(['date','-Is'],text=True).strip()
def manifest():
    names = subprocess.check_output(['git','ls-files','-z','--cached','--others','--exclude-standard',
        'agent','ops','learner','knowledge','eval','tools','paper/materials/issue29-brain-speed/results.jsonl'],cwd=W).decode().split('\0')
    rows=[]
    for n in sorted(set(names)):
        p=W/n
        if not n or not p.is_file() or p.is_symlink() or p.name.startswith('.env'):continue
        b=p.read_bytes();rows.append({'path':n,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
    return rows
def write(name,value):
    tmp=F/(name+'.tmp');tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');os.replace(tmp,F/name)
status={'state':'preflight','started_at':now(),'runner_pid':os.getpid(),
    'runner_start':Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],
    'nice':os.getpriority(os.PRIO_PROCESS,0),'base_main':git('rev-parse','HEAD'),
    'source':'3ae67358d0eeab18f329f57368b7d377d20ea1e3','tree':git('write-tree'),
    'scope_url':'https://github.com/dwroy/agent-sts2/issues/40#issuecomment-6342802745',
    'full_started':False,'attempt':'single-unchanged-tree-repeat','prior_full':'full-first','repeat_reason':'old unchanged brain-card-value test failed once; isolated 6/6 passed; preserve first failure; no code or assertion change','steps':[]}
try:
    assert status['nice']==19
    assert status['base_main']=='520c12590c59f467333c33d44f554b26ece3d4d0'
    assert status['source']=='3ae67358d0eeab18f329f57368b7d377d20ea1e3'
    assert not git('diff','--name-only')
    assert git('write-tree')=='01b4bec2076c70f1d08fe3e9e2c58db0b73dc0f8'
    before=manifest();write('inputs-before.json',before)
    env={**os.environ,'PATH':str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'],
         'OMP_NUM_THREADS':'1','OPENBLAS_NUM_THREADS':'1','MKL_NUM_THREADS':'1','PYTHONDONTWRITEBYTECODE':'1'}
    env.pop('CHARACTER',None)
    commands=[('tsc',['node','node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit'],W/'agent'),
        ('full',['node','node_modules/vitest/vitest.mjs','run','--pool=forks','--maxWorkers=1',
                 '--no-file-parallelism','--reporter=default','--reporter=json','--outputFile.json='+str(F/'vitest.json')],W/'agent'),
        ('production-entry-python',['python3','-B','knowledge/builders/test_refresh_entrypoints.py','-v'],W)]
    status.update(state='running',input_count=len(before));write('checks.json',status)
    for name,args,cwd in commands:
        step={'name':name,'argv':['nice','-n','19',*args],'cwd':str(cwd.relative_to(W)),'started_at':now()}
        status['steps'].append(step);tick=time.monotonic()
        with (F/(name+'.log')).open('xb') as out:
            child=subprocess.Popen(['nice','-n','19',*args],cwd=cwd,env=env,stdout=out,stderr=subprocess.STDOUT)
            step['pid']=child.pid;status['full_started']|=name=='full';write('checks.json',status)
            step['exit_code']=child.wait()
        step['seconds']=round(time.monotonic()-tick,3);write('checks.json',status)
        print(json.dumps(step),flush=True)
        if step['exit_code']:raise RuntimeError(name+' failed; preserve original outputs')
    after=manifest();write('inputs-after.json',after)
    assert before==after,'Enumerated inputs changed'
    assert git('write-tree')==status['tree'] and not git('diff','--name-only')
    report=json.loads((F/'vitest.json').read_text());assert report['success']
    status.update(state='passed',inputs_unchanged=True,
        vitest={'files':len(report['testResults']),'passed':report['numPassedTests'],
                'failed':report['numFailedTests'],'pending':report['numPendingTests']})
except BaseException as error:
    status.update(state='failed-or-blocked',error=type(error).__name__,message=str(error))
    (F/'error.txt').write_text(traceback.format_exc())
finally:
    status['ended_at']=now();write('checks.json',status)
    (F/'driver.exit').write_text('0\n' if status['state']=='passed' else '1\n')
sys.exit(0 if status['state']=='passed' else 1)
