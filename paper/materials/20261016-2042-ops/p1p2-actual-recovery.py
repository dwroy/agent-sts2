from pathlib import Path
import json,hashlib,subprocess,os,fcntl,re
r=Path.cwd();live=r/'.worktrees/live';p=r/'ops/codex-ops/record-staging/20261016-2003';pub=r/'paper/materials/20261016-2003-ops';sha=lambda b:hashlib.sha256(b).hexdigest();source='70c61acfb118ab284bb950b32495177458a76b2d';base='5bda85450459a16912dec7882ccc3e480a06c23d'
def git(*a,cwd=r,env=None,data=None):return subprocess.check_output(['git','-C',str(cwd),*a],env=env,input=data,stderr=subprocess.PIPE)
def blob(head,path,cwd=r):
 v=subprocess.run(['git','-C',str(cwd),'show',head+':'+path],capture_output=True);assert v.returncode in [0,128];return v.stdout if v.returncode==0 else None
def stage(path,raw,env,cwd):
 oid=git('hash-object','-w','--stdin',cwd=cwd,data=raw).decode().strip();git('update-index','--add','--cacheinfo','100644',oid,path,cwd=cwd,env=env)
def commit(tree,parents,title,cwd):
 args=['commit-tree',tree]
 for parent in dict.fromkeys(parents):args+=['-p',parent]
 return git(*args,cwd=cwd,data=(title+'\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\n').encode()).decode().strip()
def install(cwd,path,raw):
 f=cwd/path;f.parent.mkdir(parents=True,exist_ok=True);tmp=f.with_name(f.name+'.ops-poison.tmp');assert not tmp.exists();tmp.write_bytes(raw);os.replace(tmp,f)
def locks_for(items):
 locks=[]
 try:
  for cwd,env in items:
   idx=Path(git('rev-parse','--git-path','index',cwd=cwd).decode().strip());idx=idx if idx.is_absolute() else cwd/idx;lp=Path(str(idx)+'.lock');fd=os.open(lp,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
   with os.fdopen(fd,'wb') as out:out.write(Path(env['GIT_INDEX_FILE']).read_bytes());out.flush();os.fsync(out.fileno())
   locks.append((idx,lp))
  return locks
 except:
  for _,lp in locks:lp.unlink()
  raise
phase=r/'paper/materials/20261016-v5s-p1p2-shadow'
source_info=json.loads((phase/'source-commit.json').read_text());candidate=dict(staged_tree=source_info['tree'],paths=source_info['paths'])
disposition=json.loads((phase/'ops-source-disposition.json').read_text())
assert disposition['source_commit_by_original_owner_authorized'] and candidate['staged_tree']==git('rev-parse',source+'^{tree}').decode().strip()
assert git('rev-parse',source+'^').decode().strip()==base
paths=git('diff-tree','--no-commit-id','--name-only','-r',source).decode().splitlines()
assert set(paths)==set(candidate['paths']) and len(paths)==4
assert all(git('ls-tree',source,'--',path).decode().startswith('100644 blob ') for path in paths)
assert not (pub/'publication.json').exists()
with (r/'ops/live-merge.lock').open('a') as lock:
 try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 except BlockingIOError:
  stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True).strip()
  (pub/'publication-lock-blocked.json').write_text(json.dumps(dict(at=stamp,status='blocked by existing original live lock',source=source,main_live_source_index_and_versions_unchanged=True,publication_started=False,release_id=None),ensure_ascii=False,indent=2)+'\n')
  raise SystemExit(75)
 at=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True).strip();print(at,flush=True)
 subprocess.run(['nice','-n','19','python3',str(r/'ops/codex-ops/record-staging/20261016-2042/check-launch-modes.py')],check=True,cwd=r)
 mh=git('rev-parse','HEAD').decode().strip();lh=git('rev-parse','HEAD',cwd=live).decode().strip()
 active=subprocess.run(['pgrep','-f','/home/dw/Projects/agent-sts2/(.worktrees/live/)?knowledge/builders/build-'],capture_output=True)
 assert active.returncode==1,'live knowledge builder active; preserve pending source without concurrent publication'
 snapshots={};normal_indexes={}
 for cwd in [r,live]:
  assert not git('ls-files','-u',cwd=cwd).strip()
  snapshots[str(cwd)]=git('ls-files','--stage','-z',cwd=cwd)
  index=Path(git('rev-parse','--git-path','index',cwd=cwd).decode().strip());index=index if index.is_absolute() else cwd/index
  normal_indexes[str(cwd)]=index.read_bytes()
  for path in paths+['eval/versions.json']:assert blob('',path,cwd)==blob('HEAD',path,cwd)
 rootvalues={};livevalues={};leaves=[]
 for path in paths:
  parent=blob(base,path);desired=blob(source,path);oldmain=blob(mh,path);oldlive=blob(lh,path,live)
  assert oldmain==parent and (r/path).read_bytes()==oldmain and (live/path).read_bytes()==oldlive
  assert sha(desired)==candidate['paths'][path]
  rootvalues[path]=desired
  if oldlive==parent:new=desired
  else:
   assert path=='agent/src/core/config.ts' and oldlive.decode().replace('Dai','Roy')==parent.decode().replace('Dai','Roy')
   folder=p/'merge-input';folder.mkdir(exist_ok=True)
   for n,b in [('live',oldlive),('base',parent),('source',desired)]:(folder/n).write_bytes(b)
   merged=subprocess.run(['git','merge-file','--stdout',str(folder/'live'),str(folder/'base'),str(folder/'source')],capture_output=True)
   assert merged.returncode==0;new=merged.stdout
   assert new.decode().replace('Dai','Roy')==desired.decode().replace('Dai','Roy')
  livevalues[path]=new
  leaves.append(dict(path=path,source_sha256=sha(desired),live_sha256=sha(new),main_exact_source=True,live_historical_attribution_only=new!=desired))
  for lane,raw in [('main',desired),('live',new)]:
   f=p/'composition-scan'/lane/path;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(raw)
 refresh={}
 for path in git('diff','--name-only','HEAD','--','knowledge',cwd=live).decode().splitlines():
  raw=(live/path).read_bytes();refresh[path]=raw
  f=p/'composition-scan'/'knowledge'/path;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(raw)
 with (pub/'composition-gitleaks.log').open('wb') as out:
  scan=subprocess.run(['nice','-n','19','gitleaks','dir',str(p/'composition-scan'),'--redact','--no-banner','--report-format','json','--report-path',str(p/'composition-gitleaks.json')],stdout=out,stderr=subprocess.STDOUT,env={**os.environ,'GOMAXPROCS':'1'}).returncode
 assert scan==0 and json.loads((p/'composition-gitleaks.json').read_text())==[]
 datasets={}
 for cwd,head in [(r,mh),(live,lh)]:
  raw=blob(head,'eval/versions.json',cwd);assert (cwd/'eval/versions.json').read_bytes()==raw;datasets[str(cwd)]=json.loads(raw)
 previous=datasets[str(r)]['release_numbering']['releases']
 assert previous==datasets[str(live)]['release_numbering']['releases']
 nums=[int(re.fullmatch(r'V\d+-R(\d+)',x['release_id'])[1]) for x in previous];assert nums==list(range(max(nums)+1))
 # Resolve the preceding already-live calibration's numbering before allocating this later behavior.
 known_calibration='8b65dafb808eb54e965fc1c6c613462fad82306c';before_calibration='c0cab0352b6c1a487e116d845350bf483dc60c9c'
 if subprocess.run(['git','merge-base','--is-ancestor',known_calibration,lh],capture_output=True).returncode==0:
  assert any(any(alias.startswith('S1.boss-calibration') for alias in item['aliases']) and subprocess.run(['git','merge-base','--is-ancestor',item['commit'],known_calibration],capture_output=True).returncode==0 and subprocess.run(['git','merge-base','--is-ancestor',item['commit'],before_calibration],capture_output=True).returncode!=0 for item in previous), 'preceding calibration publication numbering must be resolved on its original completion event first'
 rid=f'V5-R{max(nums)+1:03d}';name='V5.silent-p1-p2-shadow1'
 le={**os.environ,'GIT_INDEX_FILE':str(p/'live.index')};git('read-tree',lh,env=le,cwd=live)
 for path,raw in refresh.items():stage(path,raw,le,live)
 rt=git('write-tree',env=le,cwd=live).decode().strip()
 fresh=commit(rt,[lh],'Preserve live knowledge refresh before authorized P1 P2 shadow release',live) if refresh else lh
 for path,raw in livevalues.items():stage(path,raw,le,live)
 bt=git('write-tree',env=le,cwd=live).decode().strip()
 assert set(git('diff','--name-only',rt,bt,cwd=live).decode().splitlines())==set(paths)
 behavior=commit(bt,[fresh,source],'Publish authorized Silent P1 P2 shadow defaults',live)
 entry=dict(name=name,family='V5',character='SILENT',commit=behavior,release_id=rid,release_status='registered-primary-ops',source=at+'; Roy19:16 via Claude, diagnosis492a87d0b, exact source '+source+' parent '+base+'. Old Silent S_READINESS and S_BUILD_RANK defaults on; new defaults shadow. Existing calculations/readiness/build ranking/S counterfactual logs remain, without default P1/P2 facts or ranking override reason. Explicit mode parsing, S sorting shadow, C1/C2, win/HP, SL/potion rules and other roles unchanged. Actual launch environment/path must show no explicit on override. Source tsc0/5files36cases0; original full1 499files498pass1environment failure/4976pass1failure4skip/2418.33s retained; missing existing venv corrected only by symlink and unchanged original wrapper1case0/Ran9 under20s. New final exact tree host pending on original075726 channel; no borrowed old green or repeat unchanged source full. Expected remove default P1/P2 delivered choice influence while retaining diagnostics; no win-rate benefit claim. Rollback only two defaults in current context, preserving knowledge/other releases/history; actual rollback is a distinct authorized behavior release. Existing every10-run segmented funnel only, no A/B/new observer, no task2 implementation or parent closure. Evidence paper/materials/20261016-v5s-p1p2-shadow/ and paper/materials/20261016-2003-ops/.')
 versions={}
 for key,data in datasets.items():
  old_entries=json.loads(json.dumps(data['versions']));old_releases=json.loads(json.dumps(data['release_numbering']['releases']))
  assert not any(x['name']==name for x in old_entries)
  data['versions'].append(entry);data['release_numbering']['releases'].append(dict(release_id=rid,commit=behavior,aliases=[name]))
  assert data['versions'][:-1]==old_entries and data['release_numbering']['releases'][:-1]==old_releases
  versions[key]=(json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode()
 stage('eval/versions.json',versions[str(live)],le,live);ft=git('write-tree',env=le,cwd=live).decode().strip()
 final=commit(ft,[behavior],f'Register authorized Silent P1 P2 shadow as {rid}',live)
 me={**os.environ,'GIT_INDEX_FILE':str(p/'main.index')};git('read-tree',mh,env=me)
 for path,raw in rootvalues.items():stage(path,raw,me,r)
 stage('eval/versions.json',versions[str(r)],me,r);mt=git('write-tree',env=me).decode().strip()
 main=commit(mt,[mh,source],f'Integrate exact P1 P2 shadow source and record {rid}',r)
 rec=dict(at=at,parent='roy-20261016-global-build',source=source,source_parent=base,source_tree=candidate['staged_tree'],old_main=mh,main=main,old_live=lh,knowledge_refresh_commit=fresh,knowledge_refresh=[dict(path=path,sha256=sha(raw)) for path,raw in refresh.items()],name=name,release_id=rid,behavior_commit=behavior,behavior_tree=bt,actual_live=final,tree=ft,leaves=leaves,source_original_full_rc=1,source_environment_supplement_rc=0,source_ops_disposition=str((phase/'ops-source-disposition.json').relative_to(r)),source_ancestors_verified_after_install=False,all_unrelated_live_leaves_preserved=True,host='pending one new final-tree check through original075726 chain; no old tree green',game_restart_account_home_model_prompt_changed=False,task2='report and design only; no implementation',scope='only Roy19:16 Silent P1/P2 defaults; no new task, observer, A/B or other phase',other_role_ACK=False)
 (p/'intended-publication.json').write_text(json.dumps(rec,ensure_ascii=False,indent=2)+'\n')
 preserved=[]
 for cwd,values,version in [(r,rootvalues,versions[str(r)]),(live,{**livevalues,**refresh},versions[str(live)])]:
  file=p/('main-preserved.index' if cwd==r else 'live-preserved.index');file.write_bytes(normal_indexes[str(cwd)]);normal_env={**os.environ,'GIT_INDEX_FILE':str(file)}
  for path,raw in values.items():stage(path,raw,normal_env,cwd)
  stage('eval/versions.json',version,normal_env,cwd);preserved.append((cwd,normal_env))
 locks=locks_for(preserved)
 try:
  assert git('rev-parse','HEAD').decode().strip()==mh and git('rev-parse','HEAD',cwd=live).decode().strip()==lh
  for cwd in [r,live]:assert git('ls-files','--stage','-z',cwd=cwd)==snapshots[str(cwd)]
  assert subprocess.run(['pgrep','-f','/home/dw/Projects/agent-sts2/(.worktrees/live/)?knowledge/builders/build-'],capture_output=True).returncode==1
  for path,raw in refresh.items():assert (live/path).read_bytes()==raw
  git('update-ref','-m','ops: authorized P1 P2 shadow publication','HEAD',final,lh,cwd=live)
  for path,raw in livevalues.items():install(live,path,raw)
  install(live,'eval/versions.json',versions[str(live)])
  git('update-ref','-m','ops: integrate exact P1 P2 shadow source','HEAD',main,mh)
  for path,raw in rootvalues.items():install(r,path,raw)
  install(r,'eval/versions.json',versions[str(r)])
  for idx,lp in locks:os.replace(lp,idx)
 finally:
  for _,lp in locks:
   if lp.exists():lp.unlink()
 for cwd in [r,live]:
  git('merge-base','--is-ancestor',source,'HEAD',cwd=cwd)
 assert set(git('diff','--name-only',fresh,final,cwd=live).decode().splitlines())==set(paths)|{'eval/versions.json'}
 for path,raw in refresh.items():assert (live/path).read_bytes()==raw
 rec['source_ancestors_verified_after_install']=True
 for f in [pub/'publication.json',phase/'ops-publication.json']:
  f.write_text(json.dumps(rec,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(dict(published=True,release_id=rid,source=source,live=final,tree=ft,main=main,knowledge_refresh=len(refresh),host='pending'),ensure_ascii=False),flush=True)
