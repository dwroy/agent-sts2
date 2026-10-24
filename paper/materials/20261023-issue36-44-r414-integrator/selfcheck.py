from pathlib import Path
import json,os,subprocess,time,hashlib,sys,traceback
R=Path('/home/dw/Projects/agent-sts2');B=R/'.artifacts/issue36-44-r414-integrator-20261023';W=R/'.worktrees/integrator36-44-r414-20261023';F=B/'selfcheck';F.mkdir(exist_ok=False)
assembly=json.loads((B/'assembly.json').read_text())
env={**os.environ,'PATH':str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'],'PYTHONDONTWRITEBYTECODE':'1','OMP_NUM_THREADS':'1','OPENBLAS_NUM_THREADS':'1','MKL_NUM_THREADS':'1'};env.pop('CHARACTER',None)
files=['brain-codex-session','brain-live','brain-view','learner-herdr-launcher','learner-herdr-ownership','learner-herdr-receipts','learner-herdr','ops-herdr','boss-sim-home','legacy-refresh-incremental']+[Path(p).name.removesuffix('.test.ts') for p in assembly['test_fixes']['110cbd8e']['test_paths'] if p.endswith('.test.ts')]
commands=[('tsc',['node','node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit'],W/'agent'),('targeted',['node','node_modules/vitest/vitest.mjs','run','--pool=forks','--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter=json','--outputFile.json='+str(F/'vitest.json'),*['tests/'+n+'.test.ts' for n in files]],W/'agent'),('python-boss',['python3','-B','ops/tests/test_boss_sim_home.py','-v'],W),('python-view',['python3','-B','ops/tests/test_brain_view.py','-v'],W),('python-tui',['python3','-B','ops/tests/test_learner_tui.py','-v'],W),('shell',['bash','-n','ops/codex-ops-learner.sh','ops/codex-ops.sh','ops/herdr-host.sh','ops/run.sh'],W)]
state={'state':'running','started_at':subprocess.check_output(['date','-Is'],text=True).strip(),'tree':assembly['tree'],'steps':[]}
def save():(B/'selfcheck.json').write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n')
try:
 assert os.getpriority(os.PRIO_PROCESS,0)==19
 for name,args,cwd in commands:
  start=time.monotonic();step={'name':name,'argv':['nice','-n','19',*args],'cwd':str(cwd),'started_at':subprocess.check_output(['date','-Is'],text=True).strip()};state['steps'].append(step);save()
  with (F/(name+'.log')).open('xb') as out:
   p=subprocess.Popen(['nice','-n','19',*args],cwd=cwd,env=env,stdout=out,stderr=subprocess.STDOUT);step['pid']=p.pid;save();step['exit_code']=p.wait()
  step['seconds']=round(time.monotonic()-start,3);save();print(json.dumps(step),flush=True)
  if step['exit_code']:raise RuntimeError(name+' failed')
 assert subprocess.check_output(['git','write-tree'],cwd=W,text=True).strip()==assembly['tree'];assert not subprocess.check_output(['git','diff','--name-only'],cwd=W)
 state['state']='passed'
except BaseException as e:state.update(state='failed',error=str(e));(F/'error.txt').write_text(traceback.format_exc())
finally:state['ended_at']=subprocess.check_output(['date','-Is'],text=True).strip();save()
sys.exit(0 if state['state']=='passed' else 1)
