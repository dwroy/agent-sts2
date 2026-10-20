from pathlib import Path
import os,json,subprocess,hashlib,fcntl,copy,signal,select,importlib.util,traceback,time,re
r=Path('/home/dw/Projects/agent-sts2');a=Path(__file__).resolve().parent;live=r/'.worktrees/live';m=r/'paper/materials/20261021-0705-ops'
sha=lambda b:hashlib.sha256(b).hexdigest()
def now():return subprocess.check_output(['date','-Is'],text=True).strip()
def save(n,d):
 b=(json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode();tmp=a/(n+'.tmp');tmp.write_bytes(b);tmp.replace(a/n);(m/n).write_bytes(b)
def git(w,*args,data=None,env=None):return subprocess.check_output(['git','-C',str(w),*args],input=data,env=env,stderr=subprocess.PIPE)
s=(r/'.artifacts/ops-r404-P0-publication-20261020-2342/publish-once.py').read_text();exec(s[s.index('def commit_files('):s.index('def knowledge(')])
spec=importlib.util.spec_from_file_location('owned_autoplay',r/'ops/autoplay-reload.py');owned=importlib.util.module_from_spec(spec);spec.loader.exec_module(owned)
rt=owned.Runtime(r,live,r/'ops/codex-ops')
def knowledge():
 return [dict(path=p,bytes=len(b),sha256=sha(b)) for p in git(live,'ls-files','-z','knowledge').decode().split('\0') if p and (live/p).is_file() for b in [(live/p).read_bytes()]]
def play_rows():return [q for q in rt.rows() if rt.kind(q)=='play']
def interrupted(signum,frame):raise RuntimeError(f'controller signal {signum}; preserve evidence and restore original shell')
for sig in (signal.SIGTERM,signal.SIGINT):signal.signal(sig,interrupted)
f=json.loads((a/'frozen.json').read_text());settings=json.loads((a/'runtime-settings.json').read_text());stage='preflight';autofd=None;stopped=False;lock=None;published=False;result={}
try:
 fd=os.open(a/'boundary-once.guard',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600);os.close(fd)
 assert not (r/'ops/STOP').exists()
 assert (r/'ops/production-runtime.sh').read_bytes()==(live/'ops/production-runtime.sh').read_bytes()
 rows=rt.rows();autos=[q for q in rows if rt.kind(q)=='autoplay'];plays=[q for q in rows if rt.kind(q)=='play'];guards=[q for q in rows if rt.kind(q)=='stop-after']
 assert len(autos)==len(plays)==1 and not guards
 auto,play=autos[0],plays[0];assert str(auto['pid'])==(r/'ops/codex-ops/autoplay.pid').read_text().strip()
 # The shell alone is held; its existing child continues the same run and brain request.
 child=play['pid'];chain=[]
 while True:
  fields=Path('/proc',str(child),'stat').read_text().rsplit(')',1)[1].split();chain.append(dict(pid=child,start=fields[19],ppid=int(fields[1])))
  if int(fields[1])==auto['pid']:break
  child=int(fields[1]);assert child>1 and len(chain)<12
 childfd=os.pidfd_open(child);autofd=os.pidfd_open(auto['pid']);console=max((r/'logs/console').glob('*.log'),key=lambda p:p.stat().st_mtime)
 with (r/'logs/run-config.jsonl').open('rb') as fp:
  fp.seek(max(0,fp.seek(0,2)-200000));fp.readline();config=json.loads(fp.readlines()[-1])
 assert config['v6']['deciders']['card']=='brain';runid=config['run_id']
 assert owned.identity(owned.process(auto['pid']))==owned.identity(auto) and owned.identity(owned.process(play['pid']))==owned.identity(play)
 signal.pidfd_send_signal(autofd,signal.SIGSTOP);stopped=True
 assert owned.process(auto['pid'])['state'] in ['T','t'];assert owned.process(play['pid'])['state'] not in ['T','t','Z']
 save('boundary-armed.json',dict(at=now(),state='main-integrated-await-one-native-child-exit-event',controller_pid=os.getpid(),controller_start=Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],run_id=runid,console=str(console.relative_to(r)),autoplay=auto,play=play,direct_child=chain[-1],ancestry=chain,main_source_commit=json.loads((a/'main-source-integration.json').read_text())['commit'],live_unchanged=git(live,'rev-parse','HEAD').decode().strip(),current_play_not_signalled=True,STOP_not_written=True,event_wait='single kernel pidfd readiness, no timer, sleep or progress polling',CARD='brain',REFLEX='off'))
 stage='single-native-exit-event'
 select.select([childfd],[],[])
 os.close(childfd)
 stage='natural-boundary-verification'
 assert not play_rows();assert owned.identity(owned.process(auto['pid']))==owned.identity(auto)
 tail=console.read_bytes()[-18000:];assert re.search(rb'stopped: run [0-9]+ ended \(',tail),'not a natural run terminal; resume original saved-run handling'
 save('terminal-gate.json',dict(at=now(),run_id=runid,console=str(console.relative_to(r)),tail_bytes=len(tail),tail_sha256=sha(tail),active_play=[],autoplay_shell_only_held=True))
 (a/'terminal-console.txt').write_bytes(tail);(m/'terminal-console.txt').write_bytes(tail)
 assert not (r/'ops/STOP').exists();stopraw=f'Original ops accepted W4 criteria/core-cache boundary publication for {runid}; {now()}\n'.encode();fd=os.open(r/'ops/STOP',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600);os.write(fd,stopraw);os.close(fd)
 stage='original-live-lock';lock=(r/'ops/live-merge.lock').open('a');fcntl.flock(lock,fcntl.LOCK_EX)
 assert not play_rows() and (r/'ops/STOP').read_bytes()==stopraw
 prior=git(live,'rev-parse','HEAD').decode().strip();assert prior==f['actual_live_base']
 data={p:git(r,'show',f['staged_tree']+':'+p) for p in f['source_paths']}
 for p,b in data.items():
  assert sha(b)==f['source_after'][p] and (r/p).read_bytes()==git(r,'show','HEAD:'+p)==b
  old=subprocess.run(['git','-C',str(live),'show',prior+':'+p],capture_output=True);assert (live/p).read_bytes()==old.stdout if (live/p).exists() else old.returncode!=0
 assert not git(live,'diff','--name-only','HEAD','--',*data).strip()
 before=knowledge();save('latest-knowledge-before.json',before);runtime=(live/'ops/production-runtime.sh').read_bytes();save('runtime-unchanged.json',dict(sha256=sha(runtime),settings=settings,CARD='brain',REFLEX='off',jev='Roy decision only'))
 stage='exact-live-source';behavior=commit_files(live,data,'V6: deploy accepted card criteria and existing-wait core cache\n\nExact thirteen leaves from full tree0b46b5f0,2393 inputs SHA6eba5918;628 files5948 tests passed2skip. Preserve latest knowledge, all runtime values, CARDbrain/REFLEXoff. No P4, Legion,014301,805 or whole-main transport; no claim of quality/benefit or complete performance.','live-source');save('live-source-integration.json',behavior)
 stage='actual-live-consumer-readback';cmd=['nice','-n','19','ionice','-c','3',str(Path.home()/'.local/node/bin/node'),'--import',str(r/'agent/node_modules/tsx/dist/loader.mjs'),str(a/'consumer-readback.mts'),str(live),str(live/'knowledge'),str(a/'actual-live-consumer.json')]
 q=subprocess.run(cmd,env={**os.environ,**settings},capture_output=True);(a/'actual-live-consumer.log').write_bytes(q.stdout+q.stderr);assert q.returncode==0
 (m/'actual-live-consumer.json').write_bytes((a/'actual-live-consumer.json').read_bytes());after=knowledge();save('latest-knowledge-after.json',after);assert after==before;assert (live/'ops/production-runtime.sh').read_bytes()==runtime
 stage='release-registration';docs={str(w):json.loads((w/'eval/versions.json').read_text()) for w in [r,live]};nums=[int(x['release_id'].split('-R')[1]) for d in docs.values() for x in d['release_numbering']['releases']];release='V6-R'+str(max(nums)+1)
 name='V6.silent-card-criteria-existing-wait-completed-core-cache'
 description=f'{now()}; Claude05:4x partial acceptance and original W4 9805 cumulative11 (0246/eea) plus W0 fixed2 test leaves. Accepted full tree0b46b5f0/2393inputs SHA6eba5918:tsc0/full0,628files5948pass2skip. Criteria contains same-seed vs-skip mean/SE/n and nondiscriminating columns; B warmed only during existing model waits with5000ms cap, no added requests/join, pure strict-fingerprint getter miss=null, audit v6-core-cache.jsonl. Preserve latest knowledge and runtime CARDbrain/SHOPRESTPOTIONbrain/REFLEXoff/COMBAT_ENTRIESoff/DIRECTION_REPLANoff/90s. Jev requires Roy decision. F6 original E2E5096ms exceeds5s, partial14of17 B n2, missing prerequisites unknown, no newB Nova; old three mean disagreements not established five-metric dominance or explained Nova reasons. Software checks are not quality, benefit or complete performance. No805/P4/Legion/014301/wholemain. Rollback only13 leaves to prior live {prior} under lock retaining later knowledge/logs/runtime; first-run errors/stalls/fallback rise invoke docs v6-plan section12 rollback and inbox. Natural audit/config/actions pending.'
 registrations={}
 for w in [live,r]:
  assert (w/'eval/versions.json').read_bytes()==git(w,'show','HEAD:eval/versions.json');d=copy.deepcopy(docs[str(w)]);d['versions'].append(dict(name=name,family='V6',character='SILENT',commit=behavior['commit'],release_id=release,release_status='registered-primary-ops',source=description));d['release_numbering']['releases'].append(dict(release_id=release,commit=behavior['commit'],aliases=[name]));b=(json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode();registrations['live' if w==live else 'main']=commit_files(w,{'eval/versions.json':b},f'ops: register {release} criteria and existing-wait core cache','registry-live' if w==live else 'registry-main')
 save('publication.json',dict(at=now(),release_id=release,behavior=behavior,registrations=registrations,knowledge_preserved=len(before),source_leaves=13,runtime_unchanged=True,accepted_full_tree=f['staged_tree'],accepted_full_input_sha256='6eba5918e839e6ee942a93a3b258096c809569b42d37b05400fe530c3fe65cff',natural_cache_audit='pending first new run',quality_or_performance_all_passed=False,rollback_prior_live=prior))
 stage='date-and-dual-notice';at=now();notice=f'\n- {at} 已发布{release}：原奖励题只在摘要列A、B等待400ms且CARDjev限定，改为逐选项criteria列同种子vs_skip均值/SE/n及无区分列，利用已有模型等待暖B≤5000ms、无新增请求/不join、严格getter miss=null；新增cache审计。原W4 9805累计11+W0两测试，实际live行为{behavior["commit"]}，628文件5948过2跳；证据paper/materials/20261021-0705-ops/publication.json。CARD仍brain、REFLEXoff，其余配置和最新知识保留，切jev等Roy。预期补齐B与题面证据，不宣称收益/校准：F6仍5096ms、B部分n2/前提未知，无新B Nova。回退仅该13叶至{prior}并保留后续知识/日志/配置；首局报错/卡住/兜底明显增加按§12回退并写inbox。自然缓存/配置/真实动作读回pending，P2暂停，原科学父及角色ACK不关闭。\n'
 additions={}
 for p in ['ops/inbox-dev.md','notes/for-roy.md']:
  with (r/p).open('ab') as fp:fp.write(notice.encode())
  additions[p]=notice
 line=f'- {now()} 原W4累计11+W0两测试完整0后自然局{runid}结束，精确main/live发布{release}，CARDbrain/REFLEXoff和最新知识保留；原软件628文件5948过2跳及限制分列，实际loader/门/getter读回、自然缓存审计待首局；原件paper/materials/20261021-0705-ops/publication.json。\n'
 with (r/'paper/materials/decision-log.md').open('ab') as fp:fp.write(line.encode())
 additions['paper/materials/decision-log.md']=line;save('publication-record-additions.json',additions)
 assert knowledge()==before and (r/'ops/STOP').read_bytes()==stopraw
 (r/'ops/STOP').unlink();published=True
 result=dict(at=now(),state='published-original-autoplay-continued',release_id=release,actual_live=registrations['live']['commit'],behavior_commit=behavior['commit'],main_commit=registrations['main']['commit'],prior_run=runid,autoplay_pid=auto['pid'],CARD='brain',REFLEX='off',latest_knowledge_preserved=len(before),natural_config_actions_cache_audit='pending original next natural run',new_model_or_simulation=False,role_ACK_or_scientific_parent_closed=False)
except BaseException as e:
 (a/'controller-error.txt').write_text(traceback.format_exc());result=dict(at=now(),state='blocked-no-repeat-source-full',stage=stage,error=type(e).__name__,message=str(e),STOP_present=(r/'ops/STOP').exists(),publication_exists=(a/'publication.json').exists(),published=published)
finally:
 if lock is not None:fcntl.flock(lock,fcntl.LOCK_UN);lock.close()
 if stopped and autofd is not None:
  try:signal.pidfd_send_signal(autofd,signal.SIGCONT)
  except ProcessLookupError:pass
 if autofd is not None:os.close(autofd)
 save('result.json',result)
 event=r/'ops/codex-ops/queue'/f'{time.time_ns()}-manual.md';event.write_text('原W4 criteria+精度+B累计11及W0两测试原自然边界有限接续：'+json.dumps(result,ensure_ascii=False)+'；原件paper/materials/20261021-0705-ops/result.json。仅原单次内核退出事件，无sleep/轮询/新模型/full。核实际发布、双通知与下一局配置/动作/缓存审计；CARDbrain/REFLEXoff，jev等Roy。\n')
 print(json.dumps(result,ensure_ascii=False))
