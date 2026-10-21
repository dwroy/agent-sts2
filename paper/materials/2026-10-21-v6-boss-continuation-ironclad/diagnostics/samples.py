from pathlib import Path
import subprocess,os,json,time
root=Path.cwd(); source=root/'agent/src/reflex/rollout.ts'; test=root/'agent/tests/inferno-planner.test.ts'
a=source.read_text(); b=test.read_text()
old='const died = !won && (o.dies || player.hp <= 0);';new='const died = o.dies || player.hp <= 0;\n  won = won && !died;'
x=b.replace('const { rolloutLiveOptions }','const { rolloutLiveOptions, rolloutTap }')
x=x.replace('const decision = planCombatTurn(envOf(raw));','let captured: import("../src/reflex/rollout.js").RolloutInput | null = null;\n  rolloutTap.onRollout = (input) => { captured = input; };\n  const decision = planCombatTurn(envOf(raw));\n  rolloutTap.onRollout = null;')
x=x.replace('return { decision, plans:', 'return { input: captured as import("../src/reflex/rollout.js").RolloutInput | null, decision, plans:')
x=x.replace('it("more of the rollout\'s samples die than at 1 a turn, and its best line moves to Blood Wall+, Uppercut+", () => {','it("more of the rollout\'s samples die than at 1 a turn, and its best line moves to Blood Wall+, Uppercut+", async () => {')
x=x.replace('const { decision, lines } = planned(board("a8en-f33-t6"));','''const { input, decision, lines } = planned(board("a8en-f33-t6"));
    const { simulateFight } = await import("../src/reflex/rollout.js");
    const replays = lines.filter((line) => ["BLOOD_WALL,UPPERCUT", "DEFEND_IRONCLAD,UPPERCUT,STRIKE_IRONCLAD"].includes(playsOf(line.plan))).map((line) => ({plays:playsOf(line.plan), samples:Array.from({length:line.samples},(_,j)=>({seed:(input!.options?.seed??1)*7919+1+j,...simulateFight({...input!,captureResources:true},line.plan,line.horizon,(input!.options?.seed??1)*7919+1+j,false,(line as unknown as {order:import("../src/reflex/rollout.js").KillOrder|null}).order)}))}));
    process.stderr.write("SAMPLES_AUDIT "+JSON.stringify({input,replays})+"\\n");''')
env={**os.environ,'PATH':str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'],'TMPDIR':str(root/'.cache/w8t')}
result=[]
try:
 for name,text in [('original',a.replace(new,old)),('f993',a)]:
  source.write_text(text.replace('fullFight && input.continuation ? { resourceAudit:', 'input.captureResources ? { resourceAudit:'));test.write_text(x)
  cmd=['nice','-n','19','ionice','-c','3','npx','vitest','run','tests/inferno-planner.test.ts','--maxWorkers=1','-t',"more of the rollout's samples die"]
  start=time.time()
  with open(root/f'.artifacts/continuation-r2/{name}-samples.log','w') as out:r=subprocess.run(cmd,cwd=root/'agent',env=env,stdout=out,stderr=subprocess.STDOUT)
  result.append({'name':name,'exit':r.returncode,'elapsed':time.time()-start,'command':cmd})
finally:
 source.write_text(a);test.write_text(b)
(root/'.artifacts/continuation-r2/samples-check.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
