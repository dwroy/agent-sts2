"""Run once only after the original Claude guardian creates the terminal STOP window."""
from pathlib import Path
import os,json,subprocess,hashlib,fcntl,copy,urllib.request,datetime
r=Path('/home/dw/Projects/agent-sts2');a=Path(__file__).resolve().parent;live=r/'.worktrees/live'
sha=lambda b:hashlib.sha256(b).hexdigest()
def git(w,*args,data=None,env=None):return subprocess.check_output(['git','-C',str(w),*args],input=data,env=env,stderr=subprocess.PIPE)
def save(name,obj):(a/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def clock():return subprocess.check_output(['date','-Is'],text=True).strip()
def commit_files(w,files,message,label):
 parent=git(w,'rev-parse','HEAD').decode().strip();assert not git(w,'diff','--cached','--name-only').strip()
 index=Path(git(w,'rev-parse','--path-format=absolute','--git-path','index').decode().strip());lock=Path(str(index)+'.lock');fd=os.open(lock,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 try:
  private=a/(label+'-index');private.write_bytes(index.read_bytes());env={**os.environ,'GIT_INDEX_FILE':str(private)}
  for p,b in files.items():
   oid=git(w,'hash-object','-w','--stdin',data=b).decode().strip();git(w,'update-index','--add','--cacheinfo',f'100644,{oid},{p}',env=env)
  tree=git(w,'write-tree',env=env).decode().strip();paths=git(w,'diff','--name-only',parent,tree).decode().splitlines();assert set(paths)==set(files),(paths,list(files))
  msg=message+'\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\n';commit=git(w,'commit-tree',tree,'-p',parent,data=msg.encode()).decode().strip();assert git(w,'rev-parse','HEAD').decode().strip()==parent
  for p,b in files.items():(w/p).parent.mkdir(parents=True,exist_ok=True);(w/p).write_bytes(b)
  git(w,'update-ref','HEAD',commit,parent);os.write(fd,private.read_bytes());os.fsync(fd);os.close(fd);fd=None;os.replace(lock,index)
  return dict(parent=parent,commit=commit,tree=tree,paths=paths)
 finally:
  if fd is not None:os.close(fd)
  if lock.exists():lock.unlink()
def active_play():
 found=[]
 for p in Path('/proc').iterdir():
  if not p.name.isdigit():continue
  try:
   if not (p/'cwd').resolve().is_relative_to(live/'agent'):continue
   if b'play' in (p/'cmdline').read_bytes().split(b'\0') and (p/'stat').read_text().rsplit(')',1)[1].split()[0]!='Z':found.append(int(p.name))
  except (OSError,RuntimeError):pass
 return found
def knowledge():
 rows=[]
 for name in git(live,'ls-files','-z','knowledge').decode().split('\0'):
  p=live/name
  if name and p.is_file() and not p.is_symlink():
   b=p.read_bytes();rows.append(dict(path=name,bytes=len(b),sha256=sha(b)))
 return rows
def main():
 assert not (a/'publication.json').exists(),'Publication already has a receipt: inspect it, do not rerun'
 stop=r/'ops/STOP';assert stop.is_file(),'Original guardian STOP is not yet present; do not write a second guard'
 stop_raw=stop.read_bytes();stop_ns=stop.stat().st_mtime_ns
 assert not active_play(),'A play is still active: retain STOP without publishing'
 with urllib.request.urlopen('http://127.0.0.1:8080/state',timeout=8) as response:state=json.load(response)
 state=state.get('data',state);assert state.get('screen') in ['GAME_OVER','MAIN_MENU'];assert state.get('run_id') in [None,'1ZZHM2MV19YB'];assert state.get('native_profile_id') in [1,'1']
 console=(r/'logs/console/current').resolve();assert console.is_relative_to(r/'logs/console');raw=console.read_bytes();assert b'1ZZHM2MV19YB' in raw and b'stopped: run 1 ended (' in raw[-10000:]
 at=clock();save('terminal-STOP-gate.json',dict(at=at,STOP_bytes=len(stop_raw),STOP_sha256=sha(stop_raw),STOP_mtime_ns=stop_ns,terminal_run='1ZZHM2MV19YB',screen=state.get('screen'),console=str(console),console_bytes=len(raw),console_sha256=sha(raw),active_play=[],guardian='original Claude; no duplicate created'))
 plan=json.loads((r/'paper/materials/20261021-013x-ops/next-boundary-publication-plan.json').read_text());f=json.loads((r/'paper/materials/20261021-0113-ops/joint-frozen.json').read_text());h=json.loads((r/'paper/materials/20261021-0113-ops/joint-host-status.json').read_text())
 assert h['combined_full_rc']==0 and h['staged_tree']=='297cb270699bff16722976af387bbb76b88a861f';assert h['input_sha256']=='2529b6881889503dc98ad7e7f8446ff237256b0a73ca81438887536ea19855f4'
 lock=(r/'ops/live-merge.lock').open('a');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 try:
  prior=git(live,'rev-parse','HEAD').decode().strip();assert prior==plan['actual_current_live'],'Live moved: inspect actual source/data drift before adapting this one-off'
  protected=knowledge();save('latest-knowledge-before.json',protected)
  data={p:git(live,'show',h['staged_tree']+':'+p) for p in f['source_paths']};assert len(data)==17
  runtime='ops/production-runtime.sh';before=(r/runtime).read_bytes();after=(r/'paper/materials/20261021-013x-ops/production-runtime-next-boundary.sh').read_bytes()
  assert sha(before)==plan['runtime_before_sha256'];assert sha(after)==plan['runtime_after_sha256'];assert before==(live/runtime).read_bytes()==git(live,'show','HEAD:'+runtime)==git(r,'show','HEAD:'+runtime)
  assert after==before.replace(b'V6_CARD_DECIDER=brain',b'V6_CARD_DECIDER=jev');data[runtime]=after
  assert not git(live,'diff','--name-only','HEAD','--',*data).strip();assert not git(r,'diff','--name-only','HEAD','--','ops/production-runtime.sh','eval/versions.json').strip()
  scan=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=b'\n'.join(data.values()),capture_output=True,env={**os.environ,'GOMAXPROCS':'1'});(a/'source-gitleaks.log').write_bytes(scan.stdout+scan.stderr);assert scan.returncode==0
  assert stop.read_bytes()==stop_raw and stop.stat().st_mtime_ns==stop_ns and not active_play()
  source=commit_files(live,data,'V6: publish tested candidate card models, inactive contrast support and reward Jev\n\nOriginal seventeensource tsc/full628files5932pass2skip tree297cb270/2391inputsSHA2529b688. Claude013x accepts real runLoop replay as prepublication gate; first next natural run is quality acceptance. Single runtime change CARD brain->jev,REFLEXoff. No805/wholemain/P4/factory/oneshot/knowledge transport. Latest generated knowledge preserved; its loader readback is separate from original frozen full.','live-source')
  save('source-integration.json',dict(**source,prior_actual_live=prior,accepted_full_tree=h['staged_tree'],source_leaf_count=17,runtime_leaf_count=1))
  main_runtime=commit_files(r,{runtime:after},'ops: enable reward Jev after terminal STOP-gated P0 publication','main-runtime')
  cmd=['nice','-n','19','ionice','-c','3',str(Path.home()/'.local/node/bin/node'),'--import',str(r/'agent/node_modules/tsx/dist/loader.mjs'),str(a/'consumer-readback.mts'),str(live),str(live/'knowledge'),str(r/runtime),str(a/'actual-live-consumer.json')]
  probe=subprocess.run(cmd,capture_output=True,env={**os.environ,'V6_REFLEX':'off'});(a/'actual-live-consumer.log').write_bytes(probe.stdout+probe.stderr);assert probe.returncode==0,'Actual consumer readback failed; retain STOP and original artifacts'
  after_knowledge=knowledge();save('latest-knowledge-after.json',after_knowledge);assert after_knowledge==protected,'Generated knowledge changed; retain STOP for source/data review'
  assert not active_play();assert stop.read_bytes()==stop_raw and stop.stat().st_mtime_ns==stop_ns
  docs={str(w):json.loads((w/'eval/versions.json').read_text()) for w in [r,live]};nums=[int(z['release_id'].split('-R')[1]) for doc in docs.values() for z in doc['release_numbering']['releases']];release='V6-R'+str(max(nums)+1)
  name='V6.silent-candidate-models-reward-jev-and-disabled-card-contrast';at=clock()
  description=f'{at}; Claude021x terminal STOP window after1ZZ; original70f3 six candidate-model leaves plus acceptedP3 eleven minimal leaves and only CARD=jev runtime. Original joint628files5932pass2skip tree297cb270/2391inputSHA2529b688. Observed/published card faces materialized and unsupported playable cards remain explicit unknown; no model numbers changed. REFLEXoff,SHOP/REST/POTIONbrain,COMBAT_ENTRIES/DIRECTION_REPLANoff,90s unchanged. Current generated knowledge retained and actual loader/model-face guard readback separately verified; no new full of later data. First next natural run is P0 quality run judged byClaude; no natural benefit claim. If identical different-card results/all skips/errors/fallback rise, reportClaude and follow next-boundary brain instruction. Actual previouslive4528a751 retained for authorized rollback with later knowledge/logs preserved. No805/wholemain/P4 or formal contrast export; Regentpaused.'
  registrations={}
  for label,w in [('live',live),('main',r)]:
   assert (w/'eval/versions.json').read_bytes()==git(w,'show','HEAD:eval/versions.json')
   doc=copy.deepcopy(docs[str(w)]);doc['versions'].append(dict(name=name,family='V6',character='SILENT',commit=source['commit'],release_id=release,release_status='registered-primary-ops',source=description));doc['release_numbering']['releases'].append(dict(release_id=release,commit=source['commit'],aliases=[name]));registrations[label]=commit_files(w,{'eval/versions.json':(json.dumps(doc,ensure_ascii=False,indent=2)+'\n').encode()},f'ops: register {release} P0 reward candidate models and Jev','registry-'+label)
  at=clock();notice='\n- '+at+' 原ops：'+release+'已在1ZZ局终STOP窗口精确发布17源码+唯一CARD配置叶。旧：R406 CARDbrain，新增候选身份占位可能形成空白牌；新：按观测牌面/已发布模型物化、未建模可打牌显式unknown/拒空白指标，战胜后三选一CARD=jev，P3对照支持仍REFLEXoff（实际85combat_line/0合格拿牌对照）。SHOP/REST/POTIONbrain、出牌/方向off及90s不变。证据：70f3真实runLoop回放+联合628文件5932过2原跳，tree297cb270/2391输入2529b688；原失败/科学父/R4空草稿保留。保最新知识'+str(len(protected))+'叶，实际loader/两冻结奖励牌面差异/未知守卫读回通过，不冒后更新知识完整重验或自然收益。预期让Jev区分真实候选；第一新局由Claude判质量，同值/全跳/错误/兜底增多报Claude，依其下一边界指令回brain；回退参考实际上一live '+prior+'，保最新知识/日志。已核行为提交'+source['commit']+'、live登记提交'+registrations['live']['commit']+'；下一局配置与真实动作仍待读回，STOP留至原ops恢复步骤。原件'+str(a.relative_to(r))+'/publication.json。\n'
  for p in [r/'notes/for-roy.md',r/'ops/inbox-dev.md']:
   with p.open('a') as out:out.write(notice)
  save('dual-notice-additions.json',dict(at=at,additions={'notes/for-roy.md':notice,'ops/inbox-dev.md':notice}))
  save('publication.json',dict(at=at,release_id=release,behavior_commit=source['commit'],actual_previous_live=prior,main_runtime=main_runtime,registrations=registrations,source_leaf_count=17,runtime_delta={'V6_CARD_DECIDER':['brain','jev']},REFLEX='off',latest_knowledge_count=len(protected),knowledge_preserved=True,full_original=h,consumer=str(a/'actual-live-consumer.json'),dual_notice_written=True,STOP_still_present=True,STOP_sha256=sha(stop_raw),STOP_mtime_ns=stop_ns,first_natural_quality='pending Claude judgement',next='After source/registry/dual notices: verify no active play; original autoplay-stop if old loop remains, then existing broker autoplay-start removes STOP only after its guards. Verify next run-config and first action once; no waiting/polling.'))
  print(json.dumps(dict(release_id=release,live=registrations['live']['commit'],main=registrations['main']['commit'],STOP='retained until authorized existing autoplay resume',natural_quality='pending')))
 finally:fcntl.flock(lock,fcntl.LOCK_UN);lock.close()
if __name__=='__main__':
 try:main()
 except Exception as error:
  save('publication-blocked.json',dict(at=clock(),error=type(error).__name__,message=str(error),STOP_present=(r/'ops/STOP').exists(),resume_permitted=False));raise
