from pathlib import Path
import json,hashlib,fcntl,subprocess,os
R=Path('/home/dw/Projects/agent-sts2'); A=Path(__file__).resolve().parent; M=R/'paper/materials/20261025-issue60-dual-root-integrator'
s=json.loads((M/'full-state.json').read_text()); c=json.loads((A/'full-context.json').read_text()); W=Path(c['worktree']); h=lambda b:hashlib.sha256(b).hexdigest(); out={'at':subprocess.check_output(['date','-Is'],text=True).strip()}
assert s['phase']=='full-passed' and s['rc']==0,s
p=Path('/proc')/str(s['worker_pid']); birth=p.joinpath('stat').read_text().rsplit(')',1)[1].split()[19] if p.exists() else None
out.update(worker_pid=s['worker_pid'],worker_birth=s['worker_birth'],current_birth=birth,original_worker_exited=birth!=s['worker_birth']); assert out['original_worker_exited']
with (R/'ops/integrator-full-check.lock').open('a') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);out['original_check_lock_available']=True
 for key,root in [('inputs',W),('dependencies',Path(c['node_root']))]:
  bad=[x['path'] for x in c[key] if h((root/x['path']).read_bytes())!=x['sha256']];assert not bad,bad;out[key+'_rehash_count']=len(c[key]);out[key+'_unchanged']=True
 for label,args in [('entries',['ls-files','--stage','-z']),('flags',['ls-files','-v','-z'])]:
  b=subprocess.check_output(['git','-C',str(W),*args],env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'});out['index_'+label+'_sha256']=h(b);assert h(b)==c['index_semantic_before'][label]
 tree=subprocess.check_output(['git','-C',str(W),'write-tree'],text=True).strip();assert tree==c['tree'];out['tree']=tree
 raw=(M/'full.json').read_bytes();r=json.loads(raw);assert h(raw)==s['result_sha256'];assert r['success'] and r['numFailedTests']==0
 out.update(result_sha256=h(raw),files=len(r['testResults']),passed=r['numPassedTests'],failed=r['numFailedTests'],skipped=r['numPendingTests'],tsc_rc=s['production_tsc_rc'],runtime_tsc_rc=s['runtime_tsc_rc'],wrapper_results=[dict(name=x['name'].split('/tests/')[-1],status=x['status'],assertions=[dict(name=z['title'],status=z['status']) for z in x['assertionResults']]) for x in r['testResults'] if Path(x['name']).name in ['external-build-stats.test.ts','own-build-stats.test.ts','account-drain.test.ts','publication-admission.test.ts']]);assert len(out['wrapper_results'])==4
 assert all(x['status']=='passed' and all(y['status']=='passed' for y in x['assertions']) for x in out['wrapper_results'])
out.update(check_lock_released=True,new_full_runs=1,model_calls=0,production_operations=0)
(M/'full-terminal-verification.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
