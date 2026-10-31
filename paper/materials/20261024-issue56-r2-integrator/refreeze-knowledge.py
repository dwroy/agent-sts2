from pathlib import Path
import subprocess,json,hashlib,fcntl,shutil,os
R=Path('/home/dw/Projects/agent-sts2');A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue56-r2-integrator';L=R/'.worktrees/live'
sha=lambda b:hashlib.sha256(b).hexdigest()
def git(w,*args,data=None):return subprocess.check_output(['git','-C',str(w),*args],input=data)
def save(n,v):(M/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
a=json.loads((M/'assembly.json').read_bytes());W=Path(a['worktree']);old=a['validation_anchor']
t=json.loads((M/'directed-terminal-verification.json').read_bytes());assert t['worker_absent'] and t['check_lock_independently_acquired'] and t['failed']==1
with(R/'ops/integrator-full-check.lock').open('a') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 with(R/'ops/knowledge-refresh.lock').open('a') as kl:
  fcntl.flock(kl,fcntl.LOCK_EX)
  with(R/'ops/live-merge.lock').open('a') as ll:
   fcntl.flock(ll,fcntl.LOCK_EX|fcntl.LOCK_NB)
   os.close(os.open(A/'refreeze-knowledge.once',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600))
   assert git(W,'rev-parse','HEAD').decode().strip()==old
   for n in ['assembly.json','inputs-before.json','actual-game-knowledge.json','directed-state.json','directed-terminal-verification.json']:
    shutil.copyfile(M/n,M/('paired-tests-r438-'+n))
   for p in sorted(A.iterdir()):
    if p.is_file() and (p.name.startswith('directed') or p.name in ['shell-syntax.log','python-issue-session.log','python-strategy-external.log','production-tsc.log','tools-tsc.log']):p.rename(A/('paired-tests-r438-'+p.name))
   live=git(L,'rev-parse','HEAD').decode().strip();knowledge=[];oldrows={x['path']:x for x in json.loads((M/'actual-game-knowledge.json').read_bytes())};changed=[]
   for p in sorted((L/'knowledge').rglob('*')):
    if not p.is_file() or p.is_symlink() or '__pycache__' in p.parts or 'builders' in p.relative_to(L/'knowledge').parts:continue
    n=str(p.relative_to(L));b=p.read_bytes();q=W/n;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(b)
    x=dict(path=n,bytes=len(b),sha256=sha(b));knowledge.append(x)
    if oldrows.get(n,{}).get('sha256')!=x['sha256']:changed.append(n)
   names={x['path'] for x in knowledge};assert set(oldrows)<=names,'knowledge removed; inspect rather than assume'
   for x in json.loads((M/'product-leaves.json').read_bytes()):assert sha((L/x['path']).read_bytes())==x['sha256'],x['path']
   release=json.loads((L/'eval/versions.json').read_bytes())['versions'][-1]
   b=(L/'eval/versions.json').read_bytes();(W/'eval/versions.json').write_bytes(b)
   context=dict(at=subprocess.check_output(['date','-Iseconds'],text=True).strip(),live=live,release=release,previous_live=a['live_base'],previous_validation_anchor=old,changed_knowledge_paths=changed,knowledge_rows=len(knowledge),game_product_leaves_unchanged=True,production_written=False)
 save('actual-game-knowledge.json',knowledge);save('current-knowledge-refreeze.json',context)
 # Restore the actual game/current host profile and retain only the two reviewed helper-compatible callers.
 testbase=a['initial_validation_anchor'];restored=[];removed=[]
 original=set(git(W,'ls-tree','-r','--name-only',testbase,'--','agent/tests').decode().splitlines())
 current=set(git(W,'ls-files','agent/tests').decode().splitlines())
 for n in sorted(current|original):
  p=W/n
  if n not in original:
   if p.exists():p.unlink()
   git(W,'update-index','--force-remove','--',n);removed.append(n)
  else:
   b=git(W,'show',testbase+':'+n)
   if not p.exists() or p.read_bytes()!=b:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b);restored.append(n)
 paired=['agent/tests/brain-claude.test.ts','agent/tests/run-plan-merge.test.ts']
 for n in paired:
  b=git(R,'show',a['host_head']+':'+n);assert (R/n).read_bytes()==b;(W/n).write_bytes(b)
  if n not in restored:restored.append(n)
 for x in json.loads((M/'source-overlays.json').read_bytes()):assert sha((W/x['path']).read_bytes())==x['sha256'],x['path']
 save('actual-game-tests-baseline.json',dict(source=testbase,reason='Restore original actual game/current host profile; main contains unpublished V6 products and host eval deltas outside this release. Keep the two maintained callers paired with fixed HTTP and bounded ENOENT helpers.',restored=restored,absent_in_original_actual_profile=removed,maintained_paired_callers=paired,previous_directed_passed=159,previous_directed_failed=1,previous_result_sha256=t['result_sha256'],candidate_overlays_unchanged=True))
 paths={x['path'] for x in json.loads((M/'inputs-before.json').read_bytes())}|names;paths-=set(removed);inputs=[]
 for n in sorted(paths):
  b=(W/n).read_bytes();inputs.append(dict(path=n,bytes=len(b),sha256=sha(b)))
 git(W,'add','--sparse','-f','--',*[x['path'] for x in knowledge],'eval/versions.json',*restored);tree=git(W,'write-tree').decode().strip()
 anchor=git(W,'commit-tree',tree,'-p',old,data=b'Freeze current live knowledge after natural R439 publication for issue56 validation\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\n').decode().strip();git(W,'update-ref','HEAD',anchor,old)
 a.update(knowledge_refreeze_at=context['at'],initial_live_base=a['live_base'],live_base=live,live_release=release.get('release_id'),validation_anchor=anchor,validation_tree=tree,inputs=len(inputs),game_knowledge=len(knowledge))
 save('assembly.json',a);save('inputs-before.json',inputs);print(json.dumps(a))
