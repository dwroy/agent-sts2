from pathlib import Path
import fcntl,hashlib,json,os,subprocess
r=Path.cwd();exec((r/'ops/codex-ops/record-staging/20261016-2003/publish.py').read_text().split('phase=r/')[0]);p=r/'ops/codex-ops/record-staging/20261017-2141';pub=r/'paper/materials/20261017-2141-ops';load=lambda f:json.loads(f.read_bytes())
def write(f,x):f.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def builder_active():return subprocess.run(['pgrep','-f','knowledge/builders/buil[d]-'],capture_output=True).returncode!=1
info=load(pub/'source-received.json');source=info['source'];base=info['base'];paths=[x['path'] for x in info['paths']];assert len(paths)==6 and info['source_tests']['vitest']==0;pending_path=r/f'ops/codex-ops/pending-integrations/{info["batch"]}.json';pending=load(pending_path);assert pending['source_received'] and not (pub/'publication.json').exists()
with (r/'ops/live-merge.lock').open('a') as lock:
 try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 except BlockingIOError:
  write(pub/'publication-gate.json',dict(source_received=True,source=source,reason='Existing live lock busy',published=False));raise SystemExit(75)
 if builder_active():
  write(pub/'publication-gate.json',dict(source_received=True,source=source,reason='Existing knowledge builder active',published=False));raise SystemExit(75)
 heads={str(cwd):git('rev-parse','HEAD',cwd=cwd).decode().strip() for cwd in [r,live]};git('merge-base','--is-ancestor',info['original_live_refresh'],heads[str(live)])
 snapshots={};indexes={};refs={};versions={};values={};leaves=[]
 for cwd,lane in [(r,'main'),(live,'live')]:
  key=str(cwd);assert not git('ls-files','-u',cwd=cwd).strip();snapshots[key]=git('ls-files','--stage','-z',cwd=cwd);idx=Path(git('rev-parse','--git-path','index',cwd=cwd).decode().strip());idx=idx if idx.is_absolute() else cwd/idx;indexes[key]=idx.read_bytes();refs[key]=git('symbolic-ref','HEAD',cwd=cwd).decode().strip();versions[key]=blob('HEAD','eval/versions.json',cwd);assert (cwd/'eval/versions.json').read_bytes()==versions[key]==blob('','eval/versions.json',cwd);assert json.loads(versions[key])['release_numbering']['releases'][-1]['release_id']=='V5-R388';values[lane]={}
  for x in info['paths']:
   path=x['path'];old=blob(heads[key],path,cwd);desired=blob(source,path);assert old==blob(base,path) and blob('',path,cwd)==old and (cwd/path).read_bytes()==old,path;assert sha(desired)==x['sha256'];values[lane][path]=desired;leaves.append(dict(lane=lane,path=path,source_sha256=x['sha256'],sha256=sha(desired),old_sha256=sha(old)))
 refresh={path:(live/path).read_bytes() for path in git('diff','--name-only','HEAD','--','knowledge',cwd=live).decode().splitlines()}
 for raw in refresh.values():json.loads(raw)
 for lane,data in {**values,'preserved-live-knowledge':refresh}.items():
  for path,raw in data.items():
   f=p/'composition-scan'/lane/path;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(raw)
 with (pub/'composition-gitleaks.log').open('wb') as out:
  check=subprocess.run(['nice','-n','19','gitleaks','dir',str(p/'composition-scan'),'--redact','--no-banner','--report-format','json','--report-path',str(p/'composition-gitleaks.json')],stdout=out,stderr=subprocess.STDOUT,env={**os.environ,'GOMAXPROCS':'1'})
 assert check.returncode==0 and load(p/'composition-gitleaks.json')==[]
 at=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True).strip();print(at,flush=True)
 le={**os.environ,'GIT_INDEX_FILE':str(p/'live.index')};git('read-tree',heads[str(live)],env=le,cwd=live)
 for path,raw in refresh.items():stage(path,raw,le,live)
 rt=git('write-tree',env=le,cwd=live).decode().strip();fresh=commit(rt,[heads[str(live)]],'Preserve live knowledge before G2 shadow diagnostic repair',live) if refresh else heads[str(live)]
 for path,raw in values['live'].items():stage(path,raw,le,live)
 lt=git('write-tree',env=le,cwd=live).decode().strip();actual=commit(lt,[fresh,source],'Integrate tested G2 shadow budget-stop and empty-prefix diagnostics',live)
 me={**os.environ,'GIT_INDEX_FILE':str(p/'main.index')};git('read-tree',heads[str(r)],env=me)
 for path,raw in values['main'].items():stage(path,raw,me,r)
 mt=git('write-tree',env=me).decode().strip();main=commit(mt,[heads[str(r)],source],'Narrowly integrate tested G2 shadow diagnostic repair',r)
 assert set(git('diff','--name-only',fresh,actual).decode().splitlines())==set(paths);assert set(git('diff','--name-only',heads[str(r)],main).decode().splitlines())==set(paths)
 rec=dict(at=at,batch=info['batch'],source=source,source_parent=base,source_tree=info['tree'],old_main=heads[str(r)],main=main,old_live=heads[str(live)],actual_live=actual,tree=lt,original_learner_saved_refresh=info['original_live_refresh'],knowledge_refresh_commit=fresh,additional_saved_knowledge=[dict(path=k,sha256=sha(v)) for k,v in refresh.items()],leaves=leaves,source_full_rc=0,source_full_files=481,source_full_cases=4417,original_canonical_failed_rc0_mergednull_preserved=True,original31_history_conflicts_preserved=True,composition_gitleaks=0,classification='Pure G2 shadow observation/status/cache correction; no actual decision, rank, sampling budget, admission threshold or SL/potion policy change',behavior_number_required=False,release_id=None,latest_behavior_release_unchanged='V5-R388',versions_sha256={key:sha(raw) for key,raw in versions.items()},host='pending original211302 same-batch exact final-tree full',original_F15_F16_root_causes_reconstructed=False,root0332_fixed=False,new_model_or_game_restart=False,other_role_ACK=False)
 write(p/'intended-publication.json',rec);preserved=[]
 for cwd,lane in [(r,'main'),(live,'live')]:
  f=p/(lane+'-preserved.index');f.write_bytes(indexes[str(cwd)]);env={**os.environ,'GIT_INDEX_FILE':str(f)}
  for path,raw in {**values[lane],**(refresh if cwd==live else {})}.items():stage(path,raw,env,cwd)
  preserved.append((cwd,env))
 locks=locks_for(preserved)
 try:
  assert not builder_active()
  for cwd,lane in [(r,'main'),(live,'live')]:
   assert git('rev-parse','HEAD',cwd=cwd).decode().strip()==heads[str(cwd)] and git('ls-files','--stage','-z',cwd=cwd)==snapshots[str(cwd)];assert (cwd/'eval/versions.json').read_bytes()==versions[str(cwd)]
   for path in paths:assert (cwd/path).read_bytes()==blob(heads[str(cwd)],path,cwd)
  for path,raw in refresh.items():assert (live/path).read_bytes()==raw
  transaction='start\n'+''.join('update '+refs[str(cwd)]+' '+value+' '+heads[str(cwd)]+'\n' for cwd,value in [(r,main),(live,actual)])+'prepare\ncommit\n';git('update-ref','-m','ops: six-leaf G2 shadow diagnostic fallback integration','--stdin',data=transaction.encode())
  for cwd,lane in [(r,'main'),(live,'live')]:
   for path,raw in values[lane].items():install(cwd,path,raw)
  for idx,lp in locks:os.replace(lp,idx)
 finally:
  for _,lp in locks:
   if lp.exists():lp.unlink()
 for cwd in [r,live]:
  git('merge-base','--is-ancestor',source,'HEAD',cwd=cwd);assert blob('HEAD','eval/versions.json',cwd)==versions[str(cwd)]
 write(pub/'publication.json',rec);pending.update(status='Exact six-leaf G2 shadow source narrowly integrated; same-batch final-tree host pending',source_sync_complete=True,actual_live=actual,tree=lt,main=main,publication_receipt=str((pub/'publication.json').relative_to(r)),host_started=False,host_complete=False,host_rc=None,versions_unchanged=True,next_step='Invoke original211302 learner-recheck once for actual final tree; preserve canonical failed0/null and source/full/conflict history. No unchanged-source full/model/game restart or new behavior number.');write(pending_path,pending)
 print(json.dumps(dict(main=main,live=actual,tree=lt,behavior_number_required=False,latest_release='V5-R388')),flush=True)
