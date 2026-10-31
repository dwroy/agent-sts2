from pathlib import Path
import json,sys,subprocess,hashlib,fcntl
R=Path('/home/dw/Projects/agent-sts2');A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue56-r2-integrator';mode=sys.argv[1];s=json.loads((M/(mode+'-state.json')).read_bytes());a=json.loads((M/'assembly.json').read_bytes());W=Path(a['worktree']);sha=lambda b:hashlib.sha256(b).hexdigest();proc=Path('/proc')/str(s['worker_pid']);same=proc.exists() and proc.joinpath('stat').read_text().rsplit(')',1)[1].split()[19]==s['worker_birth'];assert not same
with(R/'ops/integrator-full-check.lock').open('a') as l:
 fcntl.flock(l,fcntl.LOCK_EX|fcntl.LOCK_NB)
 for manifest,root in [('inputs-before.json',W),('dependencies-before.json',(W/'agent/node_modules').resolve())]:
  rows=json.loads((M/manifest).read_bytes());assert all(sha((root/x['path']).read_bytes())==x['sha256'] for x in rows),manifest
 assert subprocess.check_output(['git','-C',str(W),'write-tree'],text=True).strip()==a['validation_tree']
 for label,args in [('entries',['ls-files','--stage','-z']),('flags',['ls-files','-v','-z'])]:
  data=subprocess.check_output(['git','-C',str(W),*args],env={**__import__('os').environ,'GIT_OPTIONAL_LOCKS':'0'});assert sha(data)==s['index_semantic_before'][label],label
 b=(A/(mode+'.json')).read_bytes();assert sha(b)==s['result_sha256'];r=json.loads(b);assert r['numFailedTests']==s['failed'] and r['numPassedTests']==s['passed']
 receipt=dict(at=subprocess.check_output(['date','-Iseconds'],text=True).strip(),mode=mode,worker_pid=s['worker_pid'],worker_birth=s['worker_birth'],worker_absent=True,check_lock_independently_acquired=True,inputs=len(json.loads((M/'inputs-before.json').read_bytes())),dependencies=len(json.loads((M/'dependencies-before.json').read_bytes())),all_bytes_unchanged=True,tree_unchanged=True,index_entries_unchanged=True,index_flags_unchanged=True,index_bytes_unchanged=s['index_unchanged'],result_sha256=sha(b),passed=s['passed'],failed=s['failed'],phase=s['phase'],model_calls=0,production_operations=0)
 (M/(mode+'-terminal-verification.json')).write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
