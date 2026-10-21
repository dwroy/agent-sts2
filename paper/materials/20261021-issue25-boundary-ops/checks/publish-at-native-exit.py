from pathlib import Path
import os, json, subprocess, hashlib, fcntl, copy, signal, select, importlib.util, traceback, time, re
r=Path('/home/dw/Projects/agent-sts2'); live=r/'.worktrees/live'; a=Path(__file__).resolve().parent
m=r/'paper/materials/20261021-issue25-boundary-ops'
sha=lambda b:hashlib.sha256(b).hexdigest()
def now(): return subprocess.check_output(['date','-Iseconds'],text=True).strip()
def save(name,value):
    raw=(json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()
    tmp=a/(name+'.tmp');tmp.write_bytes(raw);tmp.replace(a/name);(m/name).write_bytes(raw)
def git(w,*args,data=None,env=None): return subprocess.check_output(['git','-C',str(w),*args],input=data,env=env,stderr=subprocess.PIPE)
old=(r/'.artifacts/ops-r404-P0-publication-20261020-2342/publish-once.py').read_text()
exec(old[old.index('def commit_files('):old.index('def knowledge(')])
original_commit_files=commit_files
def commit_files(w,files,message,label):
    scan=subprocess.run(['gitleaks','stdin','--redact','--no-banner','--config',str(r/'paper/materials/20261021-W4-v2-P2-ops/record-gitleaks-scoped.toml')],input=b'\n'.join(files.values()),capture_output=True,env={**os.environ,'GOMAXPROCS':'1'})
    (a/(label+'-gitleaks.log')).write_bytes(scan.stdout+scan.stderr);assert scan.returncode==0,'scoped precommit scan rejected blobs'
    return original_commit_files(w,files,message,label)
spec=importlib.util.spec_from_file_location('original_autoplay',r/'ops/autoplay-reload.py');owned=importlib.util.module_from_spec(spec);spec.loader.exec_module(owned)
rt=owned.Runtime(r,live,r/'ops/codex-ops')
f=json.loads((a/'frozen.json').read_text()); wanted={x['path']:x for x in f['source_plan']['leaves']}
def plays(): return [x for x in rt.rows() if rt.kind(x)=='play']
def knowledge():
    paths=set(p for p in git(live,'ls-files','-z','knowledge').decode().split('\0') if p)
    paths.update(str(p.relative_to(live)) for p in (live/'knowledge').rglob('*.json') if p.is_file())
    return [dict(path=p,bytes=len(b),sha256=sha(b)) for p in sorted(paths) if p not in wanted and (live/p).is_file() for b in [(live/p).read_bytes()]]
def verify_admission():
    raw=(r/f['review_path']).read_bytes();assert sha(raw)==f['review_sha256']
    v=json.loads(raw);assert v['status']=='admitted-for-ops-boundary-publication'
    assert v['checks']['frozen_test_tree']==f['accepted_test_tree'] and not v['checks']['changed_inputs']
    assert all(x['exit']==0 for x in v['checks']['checks']) and len(wanted)==48
    assert sha((r/f['source_plan']['path']).read_bytes())==f['source_plan']['sha256']
    for x in v['logs']:
        b=(r/x['path']).read_bytes();assert len(b)==x['bytes'] and sha(b)==x['sha256'],x['path']
    return v

def binding(action):
    q=subprocess.run(['python3',str(r/'ops/instance_binding_backup.py'),action,'--root',str(r)],capture_output=True)
    (a/('binding-'+action+'.log')).write_bytes(q.stdout+q.stderr);assert q.returncode==0
    value=json.loads(q.stdout);assert value['state']=='verified';save('binding-'+action+'.json',value);return value

def interrupted(signum,frame): raise RuntimeError('controller interrupted; retain STOP if publication started')
for sig in (signal.SIGTERM,signal.SIGINT):signal.signal(sig,interrupted)
stage='preflight';autofd=None;stopped=False;locks=[];published=False;result={}
try:
    fd=os.open(a/'boundary-once.guard',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600);os.close(fd)
    review=verify_admission();assert not (r/'ops/STOP').exists()
    assert git(live,'rev-parse','HEAD').decode().strip()==f['actual_live_base']
    rows=rt.rows();autos=[x for x in rows if rt.kind(x)=='autoplay'];active=[x for x in rows if rt.kind(x)=='play']
    assert len(autos)==len(active)==1 and not any(rt.kind(x)=='stop-after' for x in rows)
    auto,play=autos[0],active[0];assert str(auto['pid'])==(r/'ops/codex-ops/autoplay.pid').read_text().strip()
    child=play['pid'];chain=[]
    while True:
        st=Path('/proc',str(child),'stat').read_text().rsplit(')',1)[1].split();chain.append(dict(pid=child,start=st[19],ppid=int(st[1])))
        if int(st[1])==auto['pid']:break
        child=int(st[1]);assert child>1 and len(chain)<12
    childfd=os.pidfd_open(child);autofd=os.pidfd_open(auto['pid'])
    console=max((r/'logs/console').glob('*.log'),key=lambda p:p.stat().st_mtime)
    with (r/'logs/run-config.jsonl').open('rb') as fp:
        fp.seek(max(0,fp.seek(0,2)-200000));fp.readline();config=json.loads(fp.readlines()[-1])
    assert config['process']['pid']==play['pid'];assert all(v=='brain' for v in config['v6']['deciders'].values())
    assert config['v6']['reflex']=='off';runid=config['run_id']
    assert owned.identity(owned.process(auto['pid']))==owned.identity(auto)
    assert owned.identity(owned.process(play['pid']))==owned.identity(play)
    signal.pidfd_send_signal(autofd,signal.SIGSTOP);stopped=True
    assert owned.process(auto['pid'])['state'] in ['T','t']
    assert owned.process(play['pid'])['state'] not in ['T','t','Z']
    save('boundary-armed.json',dict(at=now(),state='accepted-48-await-one-original-natural-child-exit',controller_pid=os.getpid(),run_id=runid,autoplay=auto,play=play,direct_child=chain[-1],ancestry=chain,console=str(console.relative_to(r)),live_base=f['actual_live_base'],source_tree=f['source_tree'],test_tree=f['accepted_test_tree'],current_play_not_signalled=True,STOP_not_written=True,event_wait='single kernel pidfd readiness; no timer/sleep/polling',optional_50_admitted=False,no_before_after_checkpoint_comparison=True,natural_first_run_readback='pending'))
    stage='one-original-natural-child-exit';select.select([childfd],[],[]);os.close(childfd)
    stage='natural-terminal';assert not plays() and owned.identity(owned.process(auto['pid']))==owned.identity(auto)
    tail=console.read_bytes()[-18000:];assert re.search(rb'stopped: run [0-9]+ ended \(',tail),'not natural run terminal'
    save('terminal-gate.json',dict(at=now(),run_id=runid,console=str(console.relative_to(r)),tail_sha256=sha(tail),active_play=[]))
    assert not (r/'ops/STOP').exists()
    stopraw=f'Original ops accepted 48-leaf #25/#16/#15/#8 boundary after {runid}; {now()}\n'.encode()
    fd=os.open(r/'ops/STOP',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600);os.write(fd,stopraw);os.close(fd)
    stage='original-knowledge-then-live-locks'
    for p in ['ops/knowledge-refresh.lock','ops/live-merge.lock']:
        lock=(r/p).open('a');fcntl.flock(lock,fcntl.LOCK_EX);locks.append(lock)
    assert not plays() and (r/'ops/STOP').read_bytes()==stopraw;verify_admission()
    prior=git(live,'rev-parse','HEAD').decode().strip();assert prior==f['actual_live_base']
    stage='latest-independent-knowledge-gate'
    catalog=json.loads((live/'knowledge/catalog.json').read_text());bad=[]
    for key,x in catalog['sources'].items():
        p=live/'knowledge'/x['path'];p=p if p.exists() else live/x['path']
        if not p.is_file() or sha(p.read_bytes())!=x['sha256']:bad.append(key)
    assert not bad,('latest catalog identity mismatch; preserve originals',bad)
    before=knowledge();save('latest-knowledge-before.json',before)
    tested={x['path']:x['sha256'] for x in review['knowledge_freeze']['live_working_knowledge_overlay']}
    drift=[x for x in before if x['path'] in tested and x['sha256']!=tested[x['path']]]
    save('latest-knowledge-channel.json',dict(at=now(),original_writer_lock='ops/knowledge-refresh.lock',catalog_sha256=sha((live/'knowledge/catalog.json').read_bytes()),catalog_sources_verified=len(catalog['sources']),latest_files_preserved=len(before),newer_than_accepted_snapshot=drift,old_snapshot_overlaid=False,new_refresh_requested=False))
    stage='binding-backup';b0=binding('backup');rootbinding=(r/'ops/instance-binding.json').read_bytes();bindingmode=(r/'ops/instance-binding.json').stat().st_mode&0o777;livebinding=(live/'ops/instance-binding.json').exists();assert not livebinding
    runtime=(live/'ops/production-runtime.sh').read_bytes()
    stage='exact-48-preimages';data={p:git(r,'show',f['source_tree']+':'+p) for p in wanted}
    for p,b in data.items():
        x=wanted[p];assert sha(b)==x['sha256'] and len(b)==x['bytes']
        assert git(r,'rev-parse',f['source_tree']+':'+p).decode().strip()==x['blob']
        z=subprocess.run(['git','-C',str(live),'show',prior+':'+p],capture_output=True)
        assert ((live/p).read_bytes()==z.stdout and z.returncode==0) if (live/p).exists() else z.returncode!=0,p
    stage='exact-live-source-publication'
    behavior=commit_files(live,data,'feat: publish accepted open book, brain values and strategy plumbing\n\nExact admitted48 #25+#16+#15+#8; source725a2480, frozen229355ab, tsc0/full0:636files6005pass2skip;2370inputs unchanged;Python25pass. Preserve newest independent knowledge, R410 rollout/P4 and runtime. Optional50 excluded. No checkpoint comparison or selector change.', 'live-source')
    save('live-source-integration.json',behavior)
    assert knowledge()==before and (live/'ops/production-runtime.sh').read_bytes()==runtime
    stage='binding-restore-verify';binding('restore');b1=binding('verify');assert b0['sha256']==b1['sha256'] and (r/'ops/instance-binding.json').read_bytes()==rootbinding and (r/'ops/instance-binding.json').stat().st_mode&0o777==bindingmode and not (live/'ops/instance-binding.json').exists()
    stage='actual-published-module-load'
    cmd=['nice','-n','19','ionice','-c','3',str(Path.home()/'.local/node/bin/node'),'--import',str(r/'agent/node_modules/tsx/dist/loader.mjs'),str(a/'consumer-readback.mts'),str(live),str(a/'actual-live-consumer.json')]
    q=subprocess.run(cmd,cwd=live/'agent',env={**os.environ,'STS2_WORKSPACE':str(r)},capture_output=True)
    (a/'actual-live-consumer.log').write_bytes(q.stdout+q.stderr);assert q.returncode==0,'published module load failed; STOP retained'
    save('actual-live-consumer.json',json.loads((a/'actual-live-consumer.json').read_text()));assert knowledge()==before
    stage='release-registration'
    docs={str(w):json.loads((w/'eval/versions.json').read_text()) for w in [r,live]}
    nums=[int(x['release_id'].split('-R')[1]) for d in docs.values() for x in d['release_numbering']['releases']]
    release='V6-R'+str(max(nums)+1);name='V6.open-book-brain-value-strategy-notice';registrations={}
    description=f'{now()}; exact48 accepted #25+#16+#15+#8 source725a2480/frozen229355ab,636files6005pass2skip,Python25,2370inputsunchanged. External spire-codex v0.111.0 rev4f52f5a facts retain provenance; mod dynamic values win, 18KB append/24KB Jev cap, no simulation-known promotion. Brain reward gets bounded opening-value facts; candidate uncertainty is not quality/benefit proof. Strategy plumbing preserves selector and may remain empty until #27; R4 original identity CLI support is not role ACK. Preserve newest independent knowledge and binding. All four noncombatdecidersbrain,REFLEX/COMBAT_ENTRIES/DIRECTIONoff. No optional50, new MC/API/learning, checkpoints comparison, P2 or Regent change. Rollback only published48 to {prior} preserving newer knowledge/logs/config/binding. First natural request/config/action/source/budget readback pending; untriggered scopes and scientific parents remain open.'
    for w in [live,r]:
        assert (w/'eval/versions.json').read_bytes()==git(w,'show','HEAD:eval/versions.json')
        d=copy.deepcopy(docs[str(w)]);d['versions'].append(dict(name=name,family='V6',commit=behavior['commit'],release_id=release,release_status='registered-primary-ops',source=description));d['release_numbering']['releases'].append(dict(release_id=release,commit=behavior['commit'],aliases=[name]))
        registrations['live' if w==live else 'main']=commit_files(w,{'eval/versions.json':(json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode()},f'ops: register {release} accepted four-issue publication','registry-live' if w==live else 'registry-main')
    save('publication.json',dict(at=now(),release_id=release,behavior=behavior,registrations=registrations,source_leaves=48,source_tree=f['source_tree'],test_tree=f['accepted_test_tree'],knowledge_preserved=len(before),binding_sha256=b1['sha256'],runtime_unchanged=True,rollback_prior_live=prior,no_before_after_checkpoint_comparison=True,natural_first_run_readback='pending original next run',new_MC_API_or_learning=False))
    stage='date-dual-notices';at=now()
    notice=f'\n- {at} 发布{release}（#25/#16/#15/#8），行为{behavior["commit"]}，实际live{registrations["live"]["commit"]}。旧无外部开卷资料，现读固定spire-codex v0.111.0/rev4f52f5a、1074条，mod动态值优先，新增18KB/Jev总24KB；模拟外部引用不提升known或改评分。旧奖励脑缺开场值资料，现提供原已验收预测事实并保留误差/未知，仍由brain决定；旧无文字策略管道，现有边界管道、空库待#27；原R4 CLI身份兼容不代角色ACK。精确48叶完整636文件6005过2跳、Python25过，最新{len(before)}知识及绑定备份/恢复核同，四brain/REFLEXoff/方向出牌off不变。预期改善资料可读和故障兼容，不冒质量/收益或新玩法知识；回退仅48叶至{prior}，保护后续知识/绑定/日志。首局实际配置/请求来源/预算/动作待读回，未触发项不验收，Roy已取消前后检查点对比；不关科学父。原件paper/materials/20261021-issue25-boundary-ops/publication.json。\n'
    additions={}
    for p in ['ops/inbox-dev.md','notes/for-roy.md']:
        with (r/p).open('ab') as fp:fp.write(notice.encode())
        additions[p]=notice
    line=f'- {now()} #25/#16/#15/#8准入48叶于原自然局{runid}结束后发布{release}；固定来源/最新知识/绑定核同、双通知完成，CARDbrain/REFLEXoff，首局实际请求待读回，不做检查点对比、不代ACK或关闭科学父；原件paper/materials/20261021-issue25-boundary-ops/publication.json。\n'
    with (r/'paper/materials/decision-log.md').open('ab') as fp:fp.write(line.encode())
    additions['paper/materials/decision-log.md']=line;save('publication-record-additions.json',additions)
    assert knowledge()==before and (r/'ops/STOP').read_bytes()==stopraw and not plays()
    (r/'ops/STOP').unlink();published=True
    result=dict(at=now(),state='published-original-autoplay-continued',release_id=release,actual_live=registrations['live']['commit'],behavior_commit=behavior['commit'],main_commit=registrations['main']['commit'],prior_run=runid,autoplay_pid=auto['pid'],CARD='brain',REFLEX='off',latest_knowledge_preserved=len(before),binding_verified=True,natural_config_actions_requests='pending original next natural run',no_before_after_checkpoint_comparison=True,no_new_MC_API_or_learning=True,role_ACK_or_scientific_parent_closed=False)
except BaseException as e:
    (a/'controller-error.txt').write_text(traceback.format_exc())
    result=dict(at=now(),state='blocked-original-48-publication-retain-evidence',stage=stage,error=type(e).__name__,message=str(e),STOP_present=(r/'ops/STOP').exists(),publication_exists=(a/'publication.json').exists(),published=published)
finally:
    for lock in reversed(locks):fcntl.flock(lock,fcntl.LOCK_UN);lock.close()
    if stopped and autofd is not None:
        try:signal.pidfd_send_signal(autofd,signal.SIGCONT)
        except ProcessLookupError:pass
    if autofd is not None:os.close(autofd)
    save('result.json',result)
    event=r/'ops/codex-ops/queue'/f'{time.time_ns()}-manual.md'
    event.write_text('原#25/#16/#15/#8准入48叶自然边界有限发布接续：'+json.dumps(result,ensure_ascii=False)+'；原件paper/materials/20261021-issue25-boundary-ops/result.json。核实际发布/双通知/首局配置请求来源预算，未触发保pending，不做前后检查点对比、不重full或派守候。\n')
