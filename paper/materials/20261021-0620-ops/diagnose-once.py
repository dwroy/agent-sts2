from pathlib import Path
import os,json,subprocess,time,datetime,hashlib
r=Path('/home/dw/Projects/agent-sts2');a=r/'.artifacts/ops-wake-20261021-0620';old=r/'.artifacts/ops-strategy-051301-s2-legion-R408-joint-20261021';w=r/'.worktrees/ops-strategy-051301-s2-legion-r408-joint-20261021';now=lambda:datetime.datetime.now().astimezone().isoformat();sha=lambda b:hashlib.sha256(b).hexdigest()
fd=os.open(a/'diagnose-once.guard',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600);os.close(fd)
s=json.loads((old/'host-status.json').read_text());assert s['combined_full_rc']==1 and s['input_unchanged'];assert all(not Path('/proc',str(pid)).exists() for pid in [s['runner_pid']]+[x['pid'] for x in s['steps']]);before=json.loads((old/'host-inputs-before.json').read_text())
for row in before:assert sha((w/row['path']).read_bytes())==row['sha256'],row['path']
name='agent/src/reflex/combat-plan.ts';path=w/name;candidate=path.read_bytes();baseline=subprocess.check_output(['git','show',s['actual_live_base']+':'+name],cwd=r);assert candidate!=baseline
args=['node','tools/with-temp.mjs','node_modules/vitest/vitest.mjs','run','tests/v6-prompt-summary-perf.test.ts','--maxWorkers=1'];env=dict(os.environ);env['PATH']=str(Path.home()/'.local/node/bin')+os.pathsep+env.get('PATH','')
for k in ['TMPDIR','TMP','TEMP']:env.pop(k,None)
for k in ['OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS','NUMEXPR_NUM_THREADS']:env[k]='1'
steps=[];result={'started_at':now(),'original_fixed_tree':s['staged_tree'],'original_fixed_input_sha256':s['input_sha256'],'old_full_failure_retained':True,'test_source_budget_threshold_unchanged':True,'new_full':False,'same_frozen_knowledge':True,'baseline_scope':'only remove original learner combat-plan production leaf; candidate new tests and W0 fixed test source unchanged; not an actual-live full run'}
try:
 for label,blob in [('candidate',candidate),('production-leaf-withdrawn',baseline)]:
  path.write_bytes(blob);env['PERF_OUTPUT']=str(a/(label+'-timings.jsonl'));step=dict(label=label,started_at=now(),source_sha256=sha(blob),command=args,log=str(a/(label+'.log')));t=time.monotonic()
  with (a/(label+'.log')).open('wb') as out:
   p=subprocess.Popen(args,cwd=w/'agent',env=env,stdout=out,stderr=subprocess.STDOUT);step['pid']=p.pid;step['rc']=p.wait()
  step.update(seconds=time.monotonic()-t,ended_at=now(),log_sha256=sha((a/(label+'.log')).read_bytes()));steps.append(step)
finally:
 path.write_bytes(candidate)
 unchanged=all(sha((w/x['path']).read_bytes())==x['sha256'] for x in before);result.update(ended_at=now(),steps=steps,original_2394_restored_exactly=unchanged,no_source_or_threshold_change=True);(a/'targeted-comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');assert unchanged
print(json.dumps(result,ensure_ascii=False))
