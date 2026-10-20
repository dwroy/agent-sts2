from pathlib import Path
import json,subprocess,os,hashlib,fcntl,shutil,datetime
r=Path('/home/dw/Projects/agent-sts2');a=r/'.artifacts/ops-r404-wiring-joint-20261020';owner=r/'.worktrees/v6-r404-card-provider-wiring-20261020';mat=owner/'paper/materials/2026-10-20-v6-r404-card-provider-wiring';w=r/'.worktrees/ops-r404-wiring-joint-20261020';live=r/'.worktrees/live'
def git(where,*args,input=None,env=None):return subprocess.check_output(['git','-C',str(where),*args],input=input,env=env,stderr=subprocess.PIPE)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
m=json.load(open(mat/'checks/source-manifest.json'));v=json.load(open(mat/'checks/validation.json'));assert sha(mat/'checks/source-manifest.json')=='03aba0763952b7c29ca45200fde5505a02d11c71f819904e824a8e32dea1a34c';assert git(r,'rev-parse',m['source']+'^{tree}').decode().strip()==m['tree'];assert len(m['files'])==5
for x in m['files']:
 assert sha(owner/x['path'])==x['sha256']
 assert git(r,'rev-parse',m['source']+':'+x['path']).decode().strip()==x['git_blob']
 assert hashlib.sha256(git(r,'show',m['source']+':'+x['path'])).hexdigest()==x['sha256']
for p,h in v['check_file_sha256'].items():assert sha(mat/p)==h,p
for n in ['tsc','vitest','gitleaks-source','gitleaks-materials']:assert (mat/f'checks/final/{n}.exit').read_text().strip()=='0'
frozen_evidence=json.load(open(mat/'checks/frozen-evidence.json'))
for x in frozen_evidence['frozen_extracts']:assert sha(mat/x['retained_path'])==x['sha256']
assert sha(mat/'checks/minimal-source.patch')=='07806dd08d85454e82c95e95ae692510bd05a079a93f8aa4bf2a382a6a9b73bf'
lock=(r/'ops/live-merge.lock').open('a');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);head=git(live,'rev-parse','HEAD').decode().strip();assert head==m['live_baseline'];assert git(w,'rev-parse','HEAD').decode().strip()==head
assert not git(live,'diff','--cached','--name-only').strip();paths=[x['path']for x in m['files']];assert not git(live,'diff','--name-only','--',*paths).strip()
for x in m['files']:
 p=live/x['path'];assert (sha(p) if p.exists() else None)==x['live_before_sha256'],x['path']
assert not git(live,'ls-files','--others','--exclude-standard','--','knowledge').strip(),'untracked knowledge requires explicit ownership'
knowledge=[]
for n in git(live,'ls-files','-z','--','knowledge').decode().split('\0'):
 if not n:continue
 p=live/n
 if not p.is_file() or p.is_symlink():continue
 b=p.read_bytes();target=w/n;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b);knowledge.append(dict(path=n,bytes=len(b),sha256=hashlib.sha256(b).hexdigest()))
patch=(mat/'checks/minimal-source.patch').read_bytes();git(w,'apply','--check','-',input=patch);git(w,'apply','-',input=patch)
for x in m['files']:assert sha(w/x['path'])==x['sha256']
for x in knowledge:assert sha(live/x['path'])==x['sha256']
git(w,'add','--',*paths,'knowledge');tree=git(w,'write-tree').decode().strip();delta=git(w,'diff','--name-only',head,tree).decode().splitlines();assert all(p in paths or p.startswith('knowledge/') for p in delta)
scan=subprocess.run(['gitleaks','stdin','--redact','--no-banner'],input=b'\n'.join((w/p).read_bytes() for p in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env={**os.environ,'GOMAXPROCS':'1'});(a/'composed-source-gitleaks.log').write_bytes(scan.stdout);assert scan.returncode==0
f=dict(at=datetime.datetime.now().astimezone().isoformat(),request='original-W4-R404-provider-wiring-five-exact-live-joint-20261020',source=m['source'],source_tree=m['tree'],source_manifest_sha256=sha(mat/'checks/source-manifest.json'),actual_live_base=head,allocation_base=head,staged_tree=tree,source_count=5,source_paths=paths,knowledge_snapshot_count=len(knowledge),knowledge_snapshot=knowledge,worktree=str(w),validation_files_verified=len(v['check_file_sha256']),frozen_extracts_verified=len(frozen_evidence['frozen_extracts']),no_actual_live_actor_STOP_change=True,owner_full_not_run=True,original_failure_preserved=True,paused805_wholemain_excluded=True)
save(a/'frozen.json',f);shutil.copy2(mat/'checks/source-manifest.json',a/'owner-source-manifest.json');shutil.copy2(mat/'checks/validation.json',a/'owner-validation.json');print(json.dumps({k:f[k]for k in ['staged_tree','source_count','knowledge_snapshot_count','validation_files_verified','frozen_extracts_verified']}))
