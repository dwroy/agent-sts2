from pathlib import Path
import json,os,subprocess,fcntl,hashlib,copy
r=Path('/home/dw/Projects/agent-sts2');a=r/'.artifacts/ops-five-item-publication-20261020-2125';live=r/'.worktrees/live'
def g(w,*args,data=None,env=None):return subprocess.check_output(['git','-C',str(w),*args],input=data,env=env,stderr=subprocess.PIPE)
def put(n,x):(a/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
x=json.loads((a/'source-integration.json').read_text());p=json.loads((a/'consumer-readback.json').read_text());assert p['infra']['actual_owned_scope_created_and_cleaned'];assert json.loads((a/'disk-admission.json').read_text())['allowed'];behavior=x['live_commit'];lock=(r/'ops/live-merge.lock').open('a');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);assert g(live,'rev-parse','HEAD').decode().strip()==behavior
old={str(w):json.loads((w/'eval/versions.json').read_text()) for w in [r,live]};seq=[];seen={}
for d in old.values():
 for row in d['release_numbering']['releases']:
  seq.append(int(row['release_id'].split('-R')[1]));assert row['commit']!=behavior
  if row['commit'] in seen:assert seen[row['commit']]==row['release_id']
  seen[row['commit']]=row['release_id']
release=f'V6-R{max(seq)+1:03d}';at=subprocess.check_output(['date','-Is'],text=True).strip();name='V6.silent-strict-reward-ab-v5-combat-direction-rides'
source=f'{at}; Roy18:2x five-item all-or-wait and20:5x explicit identical-input schemeB accepted tree496948c2,2379 inputsSHA17053663, tsc0/full623files5909pass2 originalskip. Exact live84source/458protectedknowledge; W4 strict victorious3-card reward A/B and input bridge, W8 direction-off rides/compact/pure getter and strict routing, combat entries off preserves85 knowledge, snakebite e210 Retain, infra4c7 temp lifecycle. CARD=jev only strict reward; SHOP/REST/POTION=brain; DIRECTION_REPLAN=off; COMBAT_ENTRIES=off;90s unchanged. Real offline consumer loaders17IDs/factory,strict gate,off/no extra brain,getter miss no provider,Retain,temp scope cleanup verified. Source2-18 samples/9 HTTP200 not payoff evidence; no natural benefit claim. Legacy expected_win audit mixture unchanged; paused805/whole-main excluded. Prior failures and23.054s kept. Rollback exact priorlive64c218 preserving subsequent knowledge/logs; stop/inbox on first-run error/stall/material fallback rise. Regent paused.'
results={}
for w in [live,r]:
 parent=g(w,'rev-parse','HEAD').decode().strip();assert not g(w,'diff','--cached','--name-only').strip();assert (w/'eval/versions.json').read_bytes()==g(w,'show',parent+':eval/versions.json');new=copy.deepcopy(old[str(w)]);new['versions'].append(dict(name=name,family='V6',character='SILENT',commit=behavior,release_id=release,release_status='registered-primary-ops',source=source));new['release_numbering']['releases'].append(dict(release_id=release,commit=behavior,aliases=[name]));raw=(json.dumps(new,ensure_ascii=False,indent=2)+'\n').encode();scan=subprocess.run(['gitleaks','stdin','--redact','--no-banner'],input=raw,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env={**os.environ,'GOMAXPROCS':'1'});(a/('registry-scan-'+('live' if w==live else 'main')+'.log')).write_bytes(scan.stdout);assert scan.returncode==0
 idx=Path(g(w,'rev-parse','--path-format=absolute','--git-path','index').decode().strip());il=Path(str(idx)+'.lock');fd=os.open(il,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
 try:
  private=a/('registry-index-'+('live' if w==live else 'main'));private.write_bytes(idx.read_bytes());env={**os.environ,'GIT_INDEX_FILE':str(private)};oid=g(w,'hash-object','-w','--stdin',data=raw).decode().strip();g(w,'update-index','--add','--cacheinfo',f'100644,{oid},eval/versions.json',env=env);tree=g(w,'write-tree',env=env).decode().strip();assert g(w,'diff','--name-only',parent,tree).decode().splitlines()==['eval/versions.json'];msg=f'ops: register {release} for Roy all-five exact release\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\n'.encode();commit=g(w,'commit-tree',tree,'-p',parent,data=msg).decode().strip();g(w,'update-ref','HEAD',commit,parent);(w/'eval/versions.json').write_bytes(raw);os.write(fd,private.read_bytes());os.fsync(fd);os.close(fd);fd=None;os.replace(il,idx);results['live' if w==live else 'main']=commit
 finally:
  if fd is not None:os.close(fd)
  if il.exists():il.unlink()
put('release-registration.json',dict(at=at,release_id=release,behavior_commit=behavior,actual_commits=results,accepted_tree=x['live_tree'],consumer_readback_sha256=hashlib.sha256((a/'consumer-readback.json').read_bytes()).hexdigest(),old_rows_preserved=True,one_new_behavior_number=True,STOP_kept=True));print(json.dumps(dict(release=release,**results)))
