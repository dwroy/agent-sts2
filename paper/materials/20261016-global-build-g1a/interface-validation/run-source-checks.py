from pathlib import Path
import subprocess, json, hashlib, datetime, os, time
root=Path('/home/dw/Projects/agent-sts2')
wt=root/'.worktrees/global-build-g1a-interface-20261016'
out=root/'paper/materials/20261016-global-build-g1a/interface-validation'
paths=['agent/src/sim/continuous-boss-result.ts','agent/src/sim/boss-sim.ts','agent/src/sim/build-sim.ts','agent/src/sim/build-sim-facts.ts','agent/src/sim/boss-lines.ts','agent/tests/silent-double-boss.test.ts']
sha=lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
before={p:sha(wt/p) for p in paths}
meta={'at':datetime.datetime.now().astimezone().isoformat(),'cwd':str(wt/'agent'),'files':before,'checks':[],'model_calls':0,'game_actions':0}
env=os.environ.copy();env['PATH']=str(Path.home()/'.local/node/bin')+':'+env['PATH'];env['npm_config_offline']='true';env.pop('CHARACTER',None)
commands=[('tsc',['nice','-n','19','npx','tsc','-p','tsconfig.json','--noEmit']),('focused',['nice','-n','19','npx','vitest','run','tests/silent-double-boss.test.ts','--pool=forks','--maxWorkers=1']),('full',['nice','-n','19','npx','vitest','run','--pool=forks','--maxWorkers=1'])]
for name,cmd in commands:
    started=time.monotonic()
    with (out/(name+'.log')).open('wb') as f:
        result=subprocess.run(cmd,cwd=wt/'agent',env=env,stdout=f,stderr=subprocess.STDOUT)
    row={'name':name,'command':cmd,'rc':result.returncode,'elapsed_s':time.monotonic()-started,'log':str((out/(name+'.log')).relative_to(root)),'sha256':sha(out/(name+'.log'))}
    meta['checks'].append(row);meta['source_unchanged']={p:sha(wt/p) for p in paths}==before
    (out/'checks.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(row),flush=True)
    if result.returncode:break
