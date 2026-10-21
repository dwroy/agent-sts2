from pathlib import Path
import subprocess,os,json,hashlib,time
root=Path.cwd(); source=root/'agent/src/reflex/rollout.ts'; test=root/'agent/tests/inferno-planner.test.ts'
a=source.read_text(); b=test.read_text()
old='const died = !won && (o.dies || player.hp <= 0);'
new='const died = o.dies || player.hp <= 0;\n  won = won && !died;'
audit='''if (wonBeforeResources && (o.dies || player.hp <= 0)) process.stderr.write("TERMINAL_AUDIT " + JSON.stringify({meta:input.meta,turn,fullFight,startHp,steps:plan.steps,outcome:o,hp:player.hp,enemyHp:hpLeft}) + "\\n");\n  '''
bdebug=b.replace('expect(best?.["plays"]).toMatch', '''process.stderr.write("LINES_AUDIT " + JSON.stringify({best,lines,one}) + "\\n");\n    expect(best?.["plays"]).toMatch''')
env={**os.environ,'PATH':str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'],'TMPDIR':str(root/'.cache/w8t')}
results=[]
try:
 for name,text in [('original',a.replace(new,old)),('f993',a)]:
  source.write_text(text.replace('const died = ',audit+'const died = ',1));test.write_text(bdebug)
  cmd=['nice','-n','19','ionice','-c','3','npx','vitest','run','tests/inferno-planner.test.ts','--maxWorkers=1','-t',"more of the rollout's samples die"]
  start=time.time()
  with open(root/f'.artifacts/continuation-r2/{name}.log','w') as out:r=subprocess.run(cmd,cwd=root/'agent',env=env,stdout=out,stderr=subprocess.STDOUT)
  results.append({'name':name,'exit':r.returncode,'elapsed':time.time()-start,'source_sha256':hashlib.sha256(text.encode()).hexdigest(),'command':cmd})
finally:
 source.write_text(a);test.write_text(b)
(root/'.artifacts/continuation-r2/compare.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results))
