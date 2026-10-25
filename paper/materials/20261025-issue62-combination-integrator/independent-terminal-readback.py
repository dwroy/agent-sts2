from pathlib import Path
import json, subprocess, hashlib, fcntl
R=Path('/home/dw/Projects/agent-sts2'); A=Path(__file__).resolve().parent
M=R/'paper/materials/20261025-issue62-combination-integrator'
sha=lambda b:hashlib.sha256(b).hexdigest()
s=json.loads((M/'full-state.json').read_text()); a=json.loads((M/'assembly.json').read_text())
assert s['phase']=='full-passed' and s['rc']==0 and s['failed']==0 and s['new_full_runs']==1
pid=Path('/proc')/str(s['worker_pid'])
exited=not pid.exists()
if not exited:
 try: exited=pid.joinpath('stat').read_text().rsplit(')',1)[1].split()[19]!=s['worker_birth']
 except FileNotFoundError: exited=True
assert exited,'original worker still exists; wait for actual exit'
with (R/'ops/integrator-full-check.lock').open('a') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 W=Path(a['worktree']); G=Path(a['game_worktree']); node=(W/'agent/node_modules').resolve()
 comparisons={}
 for label,base,file in [('inputs',W,'inputs-before.json'),('dependencies',node,'dependencies-before.json'),('runtime_inputs',G,'runtime-inputs-before.json')]:
  xs=json.loads((A/file).read_text()); changed=[x['path'] for x in xs if sha((base/x['path']).read_bytes())!=x['sha256']]
  assert not changed,(label,changed)
  comparisons[label]={'count':len(xs),'unchanged':True}
 def git(*args):return subprocess.check_output(['git',*args],cwd=R)
 assert git('-C',str(W),'rev-parse','HEAD').decode().strip()==a['validation_anchor']
 assert git('-C',str(G),'rev-parse','HEAD').decode().strip()==a['runtime_anchor']
 assert git('-C',str(W),'write-tree').decode().strip()==a['validation_tree']
 assert git('-C',str(G),'write-tree').decode().strip()==a['runtime_tree']
 for label,args in [('entries',['ls-files','--stage','-z']),('flags',['ls-files','-v','-z'])]:
  assert sha(git('-C',str(W),*args))==sha((A/('full-index-'+label+'-before.bin')).read_bytes())
 b=(M/'full.json').read_bytes(); result=json.loads(b)
 assert result['success'] and result['numFailedTests']==0 and sha(b)==s['result_sha256']
 receipt=dict(at=subprocess.check_output(['date','-Is'],text=True).strip(),original_worker_exited=True,worker_pid=s['worker_pid'],worker_birth=s['worker_birth'],original_check_lock_available=True,result_sha256=sha(b),full_result=dict(files=len(result['testResults']),passed=result['numPassedTests'],failed=result['numFailedTests'],skipped=result['numPendingTests']),independent_comparisons=comparisons,validation_tree=a['validation_tree'],runtime_tree=a['runtime_tree'],index_entries_unchanged=True,index_flags_unchanged=True,actual_main=git('rev-parse','HEAD').decode().strip(),actual_live=git('-C',str(R/'.worktrees/live'),'rev-parse','HEAD').decode().strip(),publication_marker_present=(R/'ops/codex-ops/PUBLICATION_ADMISSION.json').exists())
 (M/'terminal-readback.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
