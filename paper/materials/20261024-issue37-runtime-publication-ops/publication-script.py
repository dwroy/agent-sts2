from pathlib import Path
import copy,fcntl,hashlib,importlib.util,json,os,re,select,subprocess,sys,time,traceback
R=Path('/home/dw/Projects/agent-sts2');L=R/'.worktrees/live';D=R/'ops/codex-ops';A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue37-runtime-publication-ops';sys.path.insert(0,str(R/'ops'));sys.path.insert(0,str(A));from commit_helpers import git,commit_files
sha=lambda b:hashlib.sha256(b).hexdigest();raw=lambda x:(json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode();now=lambda:subprocess.check_output(['date','-Is'],text=True).strip()
def save(n,x):p=M/n;p.parent.mkdir(parents=True,exist_ok=True);tmp=p.with_suffix(p.suffix+'.tmp');tmp.write_bytes(raw(x));os.replace(tmp,p)
def birth(pid):
 try:f=Path('/proc',str(pid),'stat').read_text().rsplit(')',1)[1].split();return f[19] if f[0] not in ['Z','X'] else None
 except OSError:return None
spec=importlib.util.spec_from_file_location('runtime',R/'ops/autoplay-reload.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);rt=mod.Runtime(R,L,D)
def kind(k):return [x for x in rt.rows() if rt.kind(x)==k]
def knowledge():return {str(p.relative_to(L)):sha(p.read_bytes()) for p in sorted((L/'knowledge').rglob('*')) if p.is_file() and not p.is_symlink() and '__pycache__' not in p.parts}
def binding(action):
 q=subprocess.run(['nice','-n','19','python3',str(R/'ops/instance_binding_backup.py'),action,'--root',str(R)],capture_output=True,timeout=120);(A/('binding-'+action+'.log')).write_bytes(q.stdout+q.stderr);assert q.returncode==0,'binding '+action;v=json.loads(q.stdout);assert v['state']=='verified';save('binding-'+action+'.json',v);return v
def probe(name):
 q=subprocess.run(['nice','-n','19','node','--import',str(L/'agent/node_modules/tsx/dist/loader.mjs'),str(A/'consumer.mts'),str(L),str(L/'knowledge')],capture_output=True,timeout=90);(A/(name+'.stderr')).write_bytes(q.stderr);assert q.returncode==0,name;v=json.loads(q.stdout);assert v['passed'] and v['model_bound_entries']==0;save(name+'.json',v);return v
state={'at':now(),'phase':'verifying-new-net37-20-check','issue':37,'worker_pid':os.getpid(),'worker_birth':birth(os.getpid()),'published':False,'new_full_model_or_game':0,'held_locks':[]};save('publication-state.json',state);locks=[];drain=D/'LLM_DRAIN';owned=None;mutation=False;behavior=None;lock_started=None
ours=lambda:owned is not None and drain.exists() and drain.read_bytes()==owned
try:
 os.close(os.open(A/'publication.once',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600));pre=json.load(open(M/'preflight.json'));assert pre['passed'] and pre['old51_eight_excluded'] and pre['candidate091302_excluded'] and pre['source_leaf_count']==9;assert birth(pre['full']['worker_pid'])!=pre['full']['worker_birth'];assert git(L,'rev-parse','HEAD').decode().strip()==pre['current_live'];assert subprocess.run(['git','merge-base','--is-ancestor',pre['source'],'HEAD'],cwd=R,capture_output=True).returncode==0
 names=['ops/production-runtime.sh','ops/STOP','ops/codex-ops/PAUSE','ops/codex-ops/ACCOUNT_DRAIN','notes/roy-manual-play.json','.worktrees/live/ops/production-runtime.sh'];flags={n:sha((R/n).read_bytes()) if (R/n).is_file() else None for n in names};assert all(flags[n] is None for n in ['ops/STOP','ops/codex-ops/PAUSE','ops/codex-ops/ACCOUNT_DRAIN']);save('protected-flags.json',flags)
 with (D/'learn.lock').open('a') as guard:
  state.update(at=now(),phase='waiting-original-admission-lock');save('publication-state.json',state);fcntl.flock(guard,fcntl.LOCK_EX);assert not drain.exists(),'other-owner admission drain retained';autos=kind('autoplay');plays=kind('play');assert len(autos)==1 and len(plays)==1,'one original autoplay and active play required';prior=plays[0];console=Path('/proc',str(prior['pid']),'fd/1').resolve();assert console.is_relative_to(R/'logs/console') and console.is_file();cut=console.stat().st_size
  with console.open('rb') as f:prefix=f.read(cut)
  owned=raw({'owner':'ops-issue37-net37-20-exact9-20261024','pid':os.getpid(),'birth':birth(os.getpid()),'at':now(),'source':pre['source'],'condition':'new verified net37+20 original unique full; original PID/birth pidfd natural terminal only; no signals, keys or game requests; keep latest knowledge'})
  with drain.open('xb') as f:f.write(owned);f.flush();os.fsync(f.fileno())
  (M/'owned-admission-drain.json').write_bytes(owned);plays=kind('play');assert len(plays)<=1 and all(x['pid']==prior['pid'] and x['start']==prior['start'] for x in plays)
  B={'at':now(),'play_pid':prior['pid'],'play_birth':prior['start'],'play_cwd':prior['cwd'],'autoplay_pid':autos[0]['pid'],'autoplay_birth':autos[0]['start'],'console_path':str(console.relative_to(R)),'prefix_bytes':len(prefix),'prefix_sha256':sha(prefix),'wait':'original PID/birth pidfd natural terminal only; no signals, keys or game requests'};save('natural-boundary.json',B)
 state.update(at=now(),phase='waiting-original-natural-terminal',boundary=B);save('publication-state.json',state)
 if birth(B['play_pid']) is not None:
  assert birth(B['play_pid'])==B['play_birth'];fd=os.pidfd_open(B['play_pid'])
  try:assert birth(B['play_pid']) in (None,B['play_birth']);select.select([fd],[],[])
  finally:os.close(fd)
 assert ours() and not kind('play')
 with (R/B['console_path']).open('rb') as f:prefix=f.read(B['prefix_bytes']);content=prefix+f.read()
 assert sha(prefix)==B['prefix_sha256'];marks=list(re.finditer(rb'stopped: run \d+ ended \([^\r\n]+\)',content));assert marks,'natural terminal marker absent';mark=marks[-1];save('natural-terminal.json',{'at':now(),'path':B['console_path'],'offset':mark.start(),'bytes':len(mark.group()),'sha256':sha(mark.group()),'marker':mark.group().decode(),'signals_keys_or_game_requests':0})
 for name in ['ops/knowledge-refresh.lock','ops/live-merge.lock']:
  state.update(at=now(),phase='waiting-original-publication-lock',waiting_lock=name);save('publication-state.json',state);f=(R/name).open('a');fcntl.flock(f,fcntl.LOCK_EX);locks.append(f);state['held_locks'].append(name)
 lock_started=time.monotonic();state['live_lock_acquired_at']=now();assert ours() and not kind('play')
 for n,h in flags.items():assert (sha((R/n).read_bytes()) if (R/n).is_file() else None)==h,n
 files={};current_parent=git(L,'rev-parse','HEAD').decode().strip();assert subprocess.run(['git','-C',str(L),'merge-base','--is-ancestor',pre['current_live'],current_parent],capture_output=True).returncode==0
 for row in pre['product_leaves']:
  name=row['path'];path=L/name;assert not path.is_symlink();assert git(L,'rev-parse','HEAD:'+name).decode().strip()==row['preimage'];assert path.read_bytes()==git(L,'cat-file','blob',row['preimage']);b=git(R,'show',pre['source']+':'+name);assert sha(b)==row['sha256'] and b==(M/'products'/name).read_bytes();assert (R/name).read_bytes()==b,'main product superseded; retain original';files[name]=b
 assert len(files)==9 and not any(n.startswith('knowledge/') for n in files)
 protected=knowledge();save('knowledge-before.json',protected);save('knowledge-drift-scope.json',{'at':now(),'tested_live_base':pre['tested_live_base'],'actual_publication_parent':current_parent,'current_knowledge_files':len(protected),'full_scope':'original net37+20 R434 frozen tree only; no current R437 whole-tree full claim','test_fixtures_deployed':False,'candidate091302_included':False,'old51_eight_included':False})
 candidate=probe('latest-library-before-publication')
 for root in [L,R]:assert (root/'eval/versions.json').read_bytes()==git(root,'show','HEAD:eval/versions.json')
 backup=binding('backup');cuts={str(p.relative_to(R)):p.stat().st_size for p in [R/'logs/jev-prompts.jsonl',R/'logs/decisions.jsonl',R/'logs/run-config.jsonl',R/'logs/runs.jsonl'] if p.exists()};save('natural-readback-starts.json',{'at':now(),'raw_stream_cut_bytes':cuts,'first_natural_Jev_request_pending':True,'no_forced_game_model_or_tick':True})
 state.update(at=now(),phase='publishing-exact-nine-product-leaves',T=now(),publication_parent=current_parent);save('publication-state.json',state);mutation=True
 try:behavior=commit_files(L,files,'issue37-net37-20-products','feat: restore checked pre-open-book Jev requests')
 finally:binding('restore');binding('verify')
 state.update(at=now(),phase='source-published-registration-pending',published=True,behavior=behavior);save('publication-state.json',state);assert set(git(L,'diff','--name-only',current_parent,behavior['commit']).decode().splitlines())==set(files);assert knowledge()==protected;actual=probe('actual-live-consumers');assert actual==candidate
 docs={tag:json.loads((root/'eval/versions.json').read_bytes()) for tag,root in [('main',R),('live',L)]};number=max(int(e['release_id'].split('-R')[1]) for d in docs.values() for e in d['release_numbering']['releases'])+1;release=f'V6-R{number:03d}';alias='V6.jev-pre-open-book-net37-20-20261024';regs={}
 description=f'{now()}; source main {pre["source"]}, product source {pre["product_source"]}. Original NEW net37+20 unique frozen full673files/6600pass/0fail/2historicalskip, two tsc0/Python62 and114 directed checks. Exact nine product leaves only; old51 eight and source-null091302/net12 excluded. Preserve all latest R435-R437 and later knowledge; current whole tree is not claimed full-tested. Restore pre-open-book Jev request/log behavior, keep brain tools/reflex switches. Three host20 files physically installed19:11:05; source/cache plus natural19:13 allocation loading observed, original24h14:49:42 and kit boundary retained. First natural new-run Jev request no open-book/call-error and performance/benefit pending. Rollback nine preimages only; preserve later knowledge, registry, logs and host deployment. No new full, model, game, production tick or reclaim.'
 for tag,root in [('live',L),('main',R)]:
  doc=copy.deepcopy(docs[tag]);doc['versions'].append({'name':alias,'family':'V6','commit':behavior['commit'],'release_id':release,'release_status':'registered-primary-ops','source':description});doc['release_numbering']['releases'].append({'release_id':release,'commit':behavior['commit'],'aliases':[alias]});regs[tag]=commit_files(root,{'eval/versions.json':raw(doc)},'registry-'+tag,'ops: register '+release+' net37+20 Jev restoration')
 assert knowledge()==protected
 for n,h in flags.items():assert (sha((R/n).read_bytes()) if (R/n).is_file() else None)==h,n
 assert binding('verify')['sha256']==backup['sha256'];save('knowledge-preserved.json',{'all_latest_knowledge_bytes_exact':True,'knowledge_files':len(protected),'source_leaf_count':9,'changed_knowledge_leaves':[],'test_geometry_deployed':False,'candidate091302_included':False,'old51_eight_included':False,'flags_exact':True})
 save('publication.json',{'at':now(),'T':state['T'],'release_id':release,'source':pre['source'],'product_source':pre['product_source'],'behavior':behavior,'registrations':regs,'unique_full_proof':'original-full-state.json','unique_full_scope':'R434 frozen net37+20 only; latest knowledge preserved separately','whole_current_tree_full_claimed':False,'exact_product_leaves':9,'host_natural_loading':'host-natural-loading.json','actual_consumers':'actual-live-consumers.json','all_latest_knowledge_unchanged':True,'new_full_models_games_ticks':0,'first_natural_Jev_no_open_book_or_call_error':'pending','natural_adoption_latency_benefit':'pending','scientific_parents_open':True})
 text=f'#37新净37+20九产品叶已于自然终局后发布{release}，移除Jev旧开卷补入/调用并同步请求日志，保大脑工具/REFLEX开关。证据为原R434冻结唯一full6600过/0败/2跳、两tsc0/Python62/定向114过；不借旧含51八叶结果，不冒当前整树full。全部最新知识、R435–R437及后续数据逐字节保留，固定测试几何与091302源null/净12未夹入，旧failed/rc0不改。20三宿主叶已核源码/缓存及自然分配边界捕获，原14:49:42至次日同刻24h窗/kit不重置；不代所有回收分支通过。预期恢复Jev原请求，不承诺打法收益。回退只撤九叶前像，保后续知识/登记/日志与宿主部署。首新自然局Jev无开卷/调用错误、自然采用/收益及科学父仍待；自有准入释放后如原autoplay自然退出，沿原broker恢复。'
 adds={n:'\n- '+now()+' [ops/'+release+'] '+text+' 原件paper/materials/20261024-issue37-runtime-publication-ops/publication.json。\n' for n in ['ops/inbox-dev.md','notes/for-roy.md']};adds['paper/materials/decision-log.md']='\n- '+now()+' [ops] '+release+' 新净37+20原九叶自然发布/编号/实际库读回通过，原唯一full6600/0/2分账，R435–R437及后来知识不改；旧51八叶/091302排除，首自然Jev/原24h/kit/科学父保持。原件paper/materials/20261024-issue37-runtime-publication-ops/publication.json。\n'
 for name,value in adds.items():
  with (R/name).open('a') as f:f.write(value)
 (A/'publication-record-additions.json').write_bytes(raw(adds));save('dual-notice.json',{'at':now(),'written':list(adds),'other_role_ACK_claimed':False});assert ours();drain.unlink();save('admission-release.json',{'at':now(),'own_LLM_DRAIN_removed':True,'other_flags_exact':True,'autoplay_restarted':False});state.update(at=now(),phase='published-registered-readback-notified-admission-released',release_id=release,live=regs['live']['commit']);save('publication-state.json',state)
except BaseException as e:
 if mutation and behavior is None:
  actual_head=git(L,'rev-parse','HEAD').decode().strip();state['actual_live_after_uncertain_write']=actual_head
  if actual_head!=locals().get('current_parent',pre.get('current_live')):state['published']=True
 state.update(at=now(),phase='stopped-at-actual-stage',error=repr(e),source_write_started=mutation);save('publication-state.json',state);(A/'error.log').write_text(traceback.format_exc())
 if not mutation and not state['published'] and ours():drain.unlink();save('admission-release-on-failure.json',{'at':now(),'own_admission_released':True,'published':False})
finally:
 for f in reversed(locks):f.close()
 state['held_locks']=[]
 if lock_started is not None:state.update(live_lock_seconds=time.monotonic()-lock_started,live_lock_released_at=now())
 save('publication-state.json',state);(D/'queue'/(str(time.time_ns())+'-manual.md')).write_text('#37新净37+20原九产品叶自然发布事务返回：'+json.dumps(state,ensure_ascii=False)+'。核paper/materials/20261024-issue37-runtime-publication-ops/publication-state.json、publication.json、actual-live-consumers.json/绑定/知识及自有准入释放；不重full/模型，旧51八叶与091302排除，保全部最新知识，原失败/科学父保持。实际发布释放后接首新自然局Jev无开卷/无调用错误；20宿主三叶自然加载及原24h/kit不重置。若原autoplay自然退出且自有准入释放，沿原broker恢复。\n')
