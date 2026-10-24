from pathlib import Path
import hashlib,json,os,shutil,subprocess
R=Path('/home/dw/Projects/agent-sts2');A=R/'.artifacts/issue36-r414-integrator-20261022';W=R/'.worktrees/integrator36-r414-20261022'
EXPECTED='fdae435795f41d771da6df3457eb890e50d8ffeb'
def git(*args,cwd=R):return subprocess.check_output(['git',*args],cwd=cwd,stderr=subprocess.PIPE)
def save(n,x):(A/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
check=json.loads((R/'.worktrees/integrator40-hotfix-20261022/.artifacts/issue40-hotfix-full/full-repeat1/checks.json').read_text());assert check['state']=='passed'
live=R/'.worktrees/live';base=git('rev-parse','HEAD',cwd=live).decode().strip()
assert git('rev-parse','live').decode().strip()==base
# Preserve the active production tree; this is a separate frozen candidate, never a deployment.
assert not git('diff','--name-only','HEAD','--','agent','ops','learner','tools',cwd=live).strip(), 'live source has uncommitted changes; inspect before assembly'
changed=git('diff','--name-only',EXPECTED,base,'--','agent','ops','learner','knowledge/builders','eval','tools',':(exclude)eval/versions.json').decode().splitlines()
allowed40={'knowledge/builders/build-fight-value.py','knowledge/builders/test_refresh_entrypoints.py','agent/tests/legacy-refresh-incremental.test.ts'}
assert set(changed)<=allowed40, changed
q=subprocess.run(['nice','-n','19','python3','-B','ops/worktree_checkout.py',str(R),str(W),base,'--require-node'],cwd=R,capture_output=True,env={**os.environ,'PATH':str(Path.home()/'.local/node/bin')+':'+os.environ['PATH']})
(A/'allocation.json').write_bytes(q.stdout);(A/'allocation.stderr').write_bytes(q.stderr);assert q.returncode==0
plan=json.loads((A/'dry-run-audit.json').read_text());assert plan['live']==EXPECTED
rows=[]
for row in plan['paths']:
 p=row['path']
 if row['assembly_state']=='deferred-absent-consumer':continue
 actual=git('rev-parse',base+':'+p).decode().strip() if row['live_blob'] else None
 assert actual==row['live_blob'],p+' changed since preparation'
 src=A/'dry-run'/p;target=W/p;target.parent.mkdir(parents=True,exist_ok=True)
 target.write_bytes(src.read_bytes())
 mode=git('ls-tree',plan['source'],'--',p).decode().split()[0];target.chmod(int(mode,8)&0o777)
 rows.append({'path':p,'old_blob':actual,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'port':row['assembly_state']})
# Sequence preserves the already checked import hotfix in this release combination.
source40='3ae67358d0eeab18f329f57368b7d377d20ea1e3'
for p in sorted(allowed40):
 target=W/p;target.parent.mkdir(parents=True,exist_ok=True);raw=git('show',source40+':'+p);target.write_bytes(raw)
# Freeze all latest live knowledge leaves by bytes; never copy them over production or main.
def knowledge_manifest(tree):
 names=git('ls-files','-z','--cached','--others','--exclude-standard','knowledge',cwd=tree).decode().split('\0');out=[]
 for p in sorted(set(names)):
  f=tree/p
  if not p or not f.is_file() or f.is_symlink() or p.startswith('knowledge/builders/'):continue
  raw=f.read_bytes();out.append({'path':p,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
 return out
before=knowledge_manifest(live)
for row in before:
 p=row['path'];raw=(live/p).read_bytes();assert hashlib.sha256(raw).hexdigest()==row['sha256'];dest=W/p;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
after=knowledge_manifest(live);assert before==after,'live knowledge changed during snapshot; preserve candidate for explicit refresh'
assert knowledge_manifest(W)==before
# The new fixed-log counterexample first runs against the unmodified R3 viewer.
test=W/'ops/tests/test_brain_view.py';s=test.read_text();marker='    def test_titles_keep_stable_learner_labels(self):';assert marker in s
s=s.replace(marker,(A/'exec-fallback-regressions.txt').read_text()+'\n'+marker);test.write_text(s)
subprocess.run(['git','add','--sparse','--',*[r['path'] for r in rows],*sorted(allowed40),*[r['path'] for r in before]],cwd=W,check=True)
save('assembly.json',{'at':subprocess.check_output(['date','-Is'],text=True).strip(),'live_base':base,'source':plan['source'],'candidate_worktree':str(W),'paths':rows,'hotfix40_paths':sorted(allowed40),'latest_knowledge_count':len(before),'knowledge_manifest':before,'knowledge_changed_during_snapshot':False,'production_written':False,'fallback_red_not_yet_run':True,'staged_tree_before_fallback_fix':git('write-tree',cwd=W).decode().strip()})
print(json.dumps({'worktree':str(W),'base':base,'ported_paths':len(rows),'knowledge':len(before)},ensure_ascii=False))
