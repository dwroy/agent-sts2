import hashlib, json, os, subprocess, sys, time, traceback
from pathlib import Path

W = Path(__file__).resolve().parents[2]
ROOT = W.parents[1]
ASSEMBLY = json.loads((ROOT/'.artifacts/issue36-r414-integrator-20261022/assembly.json').read_text())
A = Path(__file__).resolve().parent
F = A/'full-first'
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
    'nice':os.getpriority(os.PRIO_PROCESS,0),'base_live':git('rev-parse','HEAD'),
    'source':'1b0aeb68f70876809e761ea563f2b1195318a32a','tree':git('write-tree'),
    'scope_url':'https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6344172214',
    'full_started':False,'attempt':'first-r414-r3-combination-full','assembly_manifest':'assembly.json','steps':[]}
try:
    assert status['nice']==19
    assert status['base_live']==ASSEMBLY['live_base']
    assert status['source']==ASSEMBLY['source']
    assert not git('diff','--name-only')
    assert git('write-tree')==json.loads((ROOT/'.artifacts/issue36-r414-integrator-20261022/selfcheck.json').read_text())['tree']
    before=manifest();write('inputs-before.json',before)
    env={**os.environ,'PATH':str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'],
         'OMP_NUM_THREADS':'1','OPENBLAS_NUM_THREADS':'1','MKL_NUM_THREADS':'1','PYTHONDONTWRITEBYTECODE':'1'}
    env.pop('CHARACTER',None)
    commands=[('tsc',['node','node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit'],W/'agent'),
        ('full',['node','node_modules/vitest/vitest.mjs','run','--pool=forks','--maxWorkers=1',
                 '--no-file-parallelism','--reporter=default','--reporter=json','--outputFile.json='+str(F/'vitest.json')],W/'agent'),
        ('python-view',['python3','-B','ops/tests/test_brain_view.py','-v'],W),
        ('python-tui',['python3','-B','ops/tests/test_learner_tui.py','-v'],W),
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
