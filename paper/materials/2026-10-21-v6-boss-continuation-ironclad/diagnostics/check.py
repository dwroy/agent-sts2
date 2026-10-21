from pathlib import Path
import os,subprocess,json,time,hashlib
root=Path.cwd();p=root/'agent/src/reflex/rollout.ts';original=p.read_text();env={**os.environ,'PATH':str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'],'TMPDIR':str(root/'.cache/w8t')};results=[]
def run(name,args):
 start=time.time();cmd=['nice','-n','19','ionice','-c','3',*args]
 with open(root/f'.artifacts/continuation-r2/{name}.log','w') as out:r=subprocess.run(cmd,cwd=root/'agent',env=env,stdout=out,stderr=subprocess.STDOUT)
 results.append({'name':name,'command':cmd,'start_epoch':start,'elapsed_s':time.time()-start,'exit':r.returncode,'log_sha256':hashlib.sha256((root/f'.artifacts/continuation-r2/{name}.log').read_bytes()).hexdigest()})
 (root/'.artifacts/continuation-r2/checks.json').write_text(json.dumps(results,indent=2)+'\n')
 print(json.dumps(results[-1]),flush=True)
 return r.returncode
try:
 p.write_text(original.replace('const died = o.dies || player.hp <= 0;\n  won = won && !died;','const died = !won && (o.dies || player.hp <= 0);'))
 run('new-test-old-production-red',['npx','vitest','run','tests/inferno-planner.test.ts','--maxWorkers=1','-t','counts self-lethal finishing hits'])
finally:p.write_text(original)
if run('tsc',['npx','tsc','-p','tsconfig.json','--noEmit'])==0:
 run('targeted',['npx','vitest','run','tests/inferno-planner.test.ts','tests/rollout.test.ts','tests/boss-sim.test.ts','tests/silent-lethal-continuation.test.ts','tests/continuation-retaliation.test.ts','tests/continuation-diagnostics.test.ts','tests/continuation-failure.test.ts','tests/continuation-failure-worker.test.ts','tests/boss-margin-attribution.test.ts','--maxWorkers=1'])
