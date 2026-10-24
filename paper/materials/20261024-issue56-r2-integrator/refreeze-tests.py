from pathlib import Path
import subprocess,json,hashlib,fcntl,shutil,os
R=Path('/home/dw/Projects/agent-sts2');A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue56-r2-integrator'
sha=lambda b:hashlib.sha256(b).hexdigest()
def git(w,*args,data=None):return subprocess.check_output(['git','-C',str(w),*args],input=data)
def save(n,v):(M/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
a=json.loads((M/'assembly.json').read_bytes());W=Path(a['worktree']);old=a['validation_anchor']
t=json.loads((M/'directed-terminal-verification.json').read_bytes());assert t['worker_absent'] and t['check_lock_independently_acquired']
with(R/'ops/integrator-full-check.lock').open('a') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 os.close(os.open(A/'refreeze.once',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600))
 assert git(W,'rev-parse','HEAD').decode().strip()==old
 for n in ['assembly.json','inputs-before.json','dependencies-before.json','directed-state.json','directed-terminal-verification.json']:
  shutil.copyfile(M/n,M/('initial-assembly-'+n))
 for p in sorted(A.iterdir()):
  if p.is_file() and (p.name.startswith('directed') or p.name in ['shell-syntax.log','python-issue-session.log','python-strategy-external.log','production-tsc.log','tools-tsc.log']):
   p.rename(A/('initial-assembly-'+p.name))
 overlays=json.loads((M/'source-overlays.json').read_bytes());baseline=[];changed=[]
 for n in git(R,'ls-tree','-r','--name-only',a['host_head'],'--','agent/tests').decode().splitlines():
  b=git(R,'show',a['host_head']+':'+n);assert (R/n).read_bytes()==b,n
  p=W/n
  if not p.exists() or p.read_bytes()!=b:changed.append(n)
  p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
  baseline.append(dict(path=n,sha256=sha(b),bytes=len(b),source=a['host_head']))
 for x in overlays:
  b=git(W,'show',old+':'+x['path']);assert sha(b)==x['sha256'];(W/x['path']).write_bytes(b)
 inputs=[]
 paths={x['path'] for x in json.loads((M/'inputs-before.json').read_bytes())}|{x['path'] for x in baseline}
 for n in sorted(paths):
  p=W/n;assert p.is_file() and not p.is_symlink();b=p.read_bytes();inputs.append(dict(path=n,bytes=len(b),sha256=sha(b)))
 git(W,'add','--sparse','-f','--',*[x['path'] for x in baseline]);tree=git(W,'write-tree').decode().strip()
 anchor=git(W,'commit-tree',tree,'-p',old,data=b'Pair maintained main tests with their already frozen main helpers (#56 validation)\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\n').decode().strip();git(W,'update-ref','HEAD',anchor,old)
 save('maintained-tests-baseline.json',baseline);save('inputs-before.json',inputs)
 when=subprocess.check_output(['date','-Iseconds'],text=True).strip()
 save('test-assembly-correction.json',dict(at=when,original_anchor=old,original_tree=a['validation_tree'],original_directed_failed=2,original_directed_passed=158,original_result_sha256=t['result_sha256'],reason='Current main fixed HTTP and bounded ENOENT helpers require their paired maintained test callers; initial assembly selected host-related tests only.',maintained_main=a['host_head'],test_files=len(baseline),changed_before_reapplying_candidate=changed,candidate_overlays_unchanged=True,game_products_unchanged=True,knowledge_snapshot_unchanged=True,new_anchor=anchor,new_tree=tree))
 a.update(test_refreeze_at=when,validation_anchor=anchor,validation_tree=tree,inputs=len(inputs),maintained_test_files=len(baseline),initial_validation_anchor=old)
 save('assembly.json',a);print(json.dumps(a))
