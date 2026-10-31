from pathlib import Path
import os,json,fcntl,hashlib,subprocess,shutil
R=Path('/home/dw/Projects/agent-sts2');A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue37-20-r434-integrator';c=json.loads((A/'directed-context.json').read_bytes());s=json.loads((M/'directed-state.json').read_bytes());W=Path(c['worktree']);sha=lambda b:hashlib.sha256(b).hexdigest()
p=Path('/proc')/str(s['worker_pid']);assert not(p.exists() and p.joinpath('stat').read_text().rsplit(')',1)[1].split()[19]==s['worker_birth'])
with(R/'ops/integrator-full-check.lock').open('a') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 assert all(sha((W/x['path']).read_bytes())==x['sha256'] for x in c['inputs'])
 assert all(sha((Path(c['node_root'])/x['path']).read_bytes())==x['sha256'] for x in c['dependencies'])
 assert subprocess.check_output(['git','-C',str(W),'write-tree'],text=True).strip()==c['tree']
 semantic={}
 for label,args in [('entries',['ls-files','--stage','-z']),('flags',['ls-files','-v','-z'])]:
  b=subprocess.check_output(['git','-C',str(W),*args],env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'});(A/('directed-index-'+label+'-after.bin')).write_bytes(b);semantic[label]=sha(b);assert semantic[label]==c['index_semantic_before'][label]
 b=Path(c['index']).read_bytes();(A/'directed-index-after.bin').write_bytes(b)
 receipt=dict(at=subprocess.check_output(['date','-Is'],text=True).strip(),worker_absent=True,check_lock_independently_acquired=True,inputs_unchanged=True,dependencies_unchanged=True,tree_unchanged=True,index_semantic_before=c['index_semantic_before'],index_semantic_after=semantic,index_raw_before=c['index_sha256'],index_raw_after=sha(b),original_state_unchanged=True,original_state_sha256=sha((M/'directed-state.json').read_bytes()),original_result_sha256=sha((A/'directed.json').read_bytes()),passed=s['passed'],failed=s['failed'],error=s['error'],full_runs=0)
 (M/'directed-terminal-supplement.json').write_text(json.dumps(receipt,indent=2)+'\n')
# Preserve first harness. Only increase the Git stdout capture limit.
shutil.copyfile(A/'finalize.mjs',A/'finalize-first.mjs')
f=(A/'finalize.mjs').read_text().replace("{env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}}","{maxBuffer:64*1024*1024,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}}")
assert f!=(A/'finalize.mjs').read_text();(A/'finalize.mjs').write_text(f)
f=(A/'check.py').read_text().replace("assert mode in ('directed', 'full')","assert mode in ('directed2', 'full')").replace("mode == 'directed'","mode == 'directed2'").replace("M / 'directed-state.json'","M / 'directed2-state.json'").replace("d['phase'] == 'directed-passed'","d['phase'] == 'directed2-passed'")
(A/'check-next.py').write_text(f)
print(json.dumps(receipt))
