from pathlib import Path
import os, json, subprocess, hashlib, fcntl, copy, signal, select, importlib.util, traceback, time, re

r = Path('/home/dw/Projects/agent-sts2')
a = Path(__file__).resolve().parent
live = r / '.worktrees/live'
m = r / 'paper/materials/20261021-1015-ops'
sha = lambda b: hashlib.sha256(b).hexdigest()
def now(): return subprocess.check_output(['date', '-Iseconds'], text=True).strip()
def save(name, value):
    raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    tmp = a / (name + '.tmp'); tmp.write_bytes(raw); tmp.replace(a / name)
    (m / name).write_bytes(raw)
def git(w, *args, data=None, env=None):
    return subprocess.check_output(['git', '-C', str(w), *args], input=data, env=env, stderr=subprocess.PIPE)
old = (r / '.artifacts/ops-r404-P0-publication-20261020-2342/publish-once.py').read_text()
exec(old[old.index('def commit_files('):old.index('def knowledge(')])
spec = importlib.util.spec_from_file_location('original_autoplay', r / 'ops/autoplay-reload.py')
owned = importlib.util.module_from_spec(spec); spec.loader.exec_module(owned)
rt = owned.Runtime(r, live, r / 'ops/codex-ops')
def knowledge():
    return [dict(path=p, bytes=len(b), sha256=sha(b))
        for p in git(live, 'ls-files', '-z', 'knowledge').decode().split('\0')
        if p and (live / p).is_file() for b in [(live / p).read_bytes()]]
def plays(): return [q for q in rt.rows() if rt.kind(q) == 'play']
def interrupted(signum, frame): raise RuntimeError(f'controller signal {signum}; restore original shell')
for sig in (signal.SIGTERM, signal.SIGINT): signal.signal(sig, interrupted)
f = json.loads((a / 'frozen.json').read_text())
settings = json.loads((a / 'runtime-settings.json').read_text())
stage = 'preflight'; autofd = None; stopped = False; lock = None; published = False; result = {}
try:
    fd = os.open(a / 'boundary-once.guard', os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600); os.close(fd)
    accepted = json.loads((r / '.artifacts/ops-CEN-ironclad-repaired-R409-joint-20261021/host-status.json').read_text())
    assert accepted['combined_full_rc'] == 0 and accepted['input_unchanged']
    assert not (r / 'ops/STOP').exists()
    assert (r / 'ops/production-runtime.sh').read_bytes() == (live / 'ops/production-runtime.sh').read_bytes()
    rows = rt.rows(); autos = [q for q in rows if rt.kind(q) == 'autoplay']; active = [q for q in rows if rt.kind(q) == 'play']
    assert len(autos) == len(active) == 1 and not any(rt.kind(q) == 'stop-after' for q in rows)
    auto, play = autos[0], active[0]
    assert str(auto['pid']) == (r / 'ops/codex-ops/autoplay.pid').read_text().strip()
    child = play['pid']; chain = []
    while True:
        fields = Path('/proc', str(child), 'stat').read_text().rsplit(')', 1)[1].split()
        chain.append(dict(pid=child, start=fields[19], ppid=int(fields[1])))
        if int(fields[1]) == auto['pid']: break
        child = int(fields[1]); assert child > 1 and len(chain) < 12
    childfd = os.pidfd_open(child); autofd = os.pidfd_open(auto['pid'])
    console = max((r / 'logs/console').glob('*.log'), key=lambda p: p.stat().st_mtime)
    with (r / 'logs/run-config.jsonl').open('rb') as fp:
        fp.seek(max(0, fp.seek(0, 2) - 200000)); fp.readline(); config = json.loads(fp.readlines()[-1])
    assert config['v6']['deciders']['card'] == 'brain'; runid = config['run_id']
    assert owned.identity(owned.process(auto['pid'])) == owned.identity(auto)
    assert owned.identity(owned.process(play['pid'])) == owned.identity(play)
    signal.pidfd_send_signal(autofd, signal.SIGSTOP); stopped = True
    assert owned.process(auto['pid'])['state'] in ['T', 't']
    assert owned.process(play['pid'])['state'] not in ['T', 't', 'Z']
    save('boundary-armed.json', dict(at=now(), state='main-four-integrated-await-one-native-child-exit-event',
        controller_pid=os.getpid(), run_id=runid, console=str(console.relative_to(r)), autoplay=auto,
        play=play, direct_child=chain[-1], ancestry=chain,
        main_source_commit=json.loads((a / 'main-source-integration.json').read_text())['commit'],
        live_unchanged=git(live, 'rev-parse', 'HEAD').decode().strip(), current_play_not_signalled=True,
        STOP_not_written=True, event_wait='single kernel pidfd readiness; no timer/sleep/progress polling', CARD='brain', REFLEX='off'))
    stage = 'single-natural-exit-event'; select.select([childfd], [], []); os.close(childfd)
    stage = 'natural-boundary-verification'
    assert not plays() and owned.identity(owned.process(auto['pid'])) == owned.identity(auto)
    tail = console.read_bytes()[-18000:]
    assert re.search(rb'stopped: run [0-9]+ ended \(', tail), 'not a natural run terminal'
    (a / 'terminal-console.txt').write_bytes(tail); (m / 'terminal-console.txt').write_bytes(tail)
    save('terminal-gate.json', dict(at=now(), run_id=runid, console=str(console.relative_to(r)), tail_sha256=sha(tail), active_play=[]))
    assert not (r / 'ops/STOP').exists()
    stopraw = f'Original ops CEN four-leaf publication boundary after {runid}; {now()}\n'.encode()
    fd = os.open(r / 'ops/STOP', os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600); os.write(fd, stopraw); os.close(fd)
    stage = 'original-live-lock'; lock = (r / 'ops/live-merge.lock').open('a'); fcntl.flock(lock, fcntl.LOCK_EX)
    assert not plays() and (r / 'ops/STOP').read_bytes() == stopraw
    prior = git(live, 'rev-parse', 'HEAD').decode().strip(); assert prior == f['actual_live_base']
    data = {p: git(r, 'show', f['staged_tree'] + ':' + p) for p in f['source_paths']}
    assert len(data) == 4
    for p, b in data.items():
        assert sha(b) == f['source_after'][p] and (r / p).read_bytes() == git(r, 'show', 'HEAD:' + p) == b
        oldrow = subprocess.run(['git', '-C', str(live), 'show', prior + ':' + p], capture_output=True)
        assert (live / p).read_bytes() == oldrow.stdout if (live / p).exists() else oldrow.returncode != 0
    assert not git(live, 'diff', '--name-only', 'HEAD', '--', *data).strip()
    before = knowledge(); save('latest-knowledge-before.json', before)
    runtime = (live / 'ops/production-runtime.sh').read_bytes()
    stage = 'exact-live-four-source'
    behavior = commit_files(live, data, 'sim: publish resolved death before rollout victory\n\nExact f993 three plus6707 Ironclad test from accepted dd954/2395inputs7d864f84:tsc0/full0,629files5963pass2skip. Preserve latest knowledge/runtime. HP0 retaliation/self-lethal finishes are losses after revival resolution; A8EN recommendation changes under unchanged ranking formula. No P4/predictor/805/wholemain.', 'live-source')
    save('live-source-integration.json', behavior)
    stage = 'actual-live-consumer-readback'
    cmd = ['nice', '-n', '19', 'ionice', '-c', '3', str(Path.home() / '.local/node/bin/node'), '--import', str(r / 'agent/node_modules/tsx/dist/loader.mjs'), str(a / 'consumer-readback.mts'), str(live), str(live / 'knowledge'), str(a / 'actual-live-consumer.json')]
    q = subprocess.run(cmd, env={**os.environ, **settings}, capture_output=True)
    (a / 'actual-live-consumer.log').write_bytes(q.stdout + q.stderr); assert q.returncode == 0
    (m / 'actual-live-consumer.json').write_bytes((a / 'actual-live-consumer.json').read_bytes())
    after = knowledge(); save('latest-knowledge-after.json', after)
    assert after == before and (live / 'ops/production-runtime.sh').read_bytes() == runtime
    stage = 'release-registration'
    docs = {str(w): json.loads((w / 'eval/versions.json').read_text()) for w in [r, live]}
    nums = [int(x['release_id'].split('-R')[1]) for d in docs.values() for x in d['release_numbering']['releases']]
    release = 'V6-R' + str(max(nums) + 1); name = 'V6.rollout-death-priority-CEN-Ironclad'
    description = f'{now()}; original W8 CEN f993 plus6707 four exact leaves; actual R409 joint tree dd954fc7,2395 inputs SHA7d864f84,tsc0/full0:629files5963pass2skip. Rollout honors solver death/nonpositive HP before allDown victory, after resolved revive; no dead boss continuation. Budgets, revival/resource guard, ranking formula and knowledge unchanged. Ironclad A8EN F33T6: two HP0 false wins removed, bloodwall wins7to5/deaths1to3/hpLoss32, score-37to-47; defend line-43.5 now rollout_best. Explicit behavior difference justified by original frozen samples, not new game knowledge or benefit. Old full1/11red/133target and counterexample/138target retained. Preserve latest working knowledge, all runtime CARD/SHOP/REST/POTIONbrain,REFLEX/COMBAT_ENTRIES/DIRECTION_REPLANoff,90s. P2 removed by Roy; no issue/mod change. No predictor/P4/805/wholemain. Rollback only four leaves to prior live {prior}, preserving later knowledge/logs/config; first-run errors/stalls/fallback rise invoke section12 rollback and inbox. Natural consumer/config/action outcomes pending;0332 scientific parent and role ACK remain open.'
    registrations = {}
    for w in [live, r]:
        assert (w / 'eval/versions.json').read_bytes() == git(w, 'show', 'HEAD:eval/versions.json')
        d = copy.deepcopy(docs[str(w)])
        d['versions'].append(dict(name=name, family='V6', commit=behavior['commit'], release_id=release, release_status='registered-primary-ops', source=description))
        d['release_numbering']['releases'].append(dict(release_id=release, commit=behavior['commit'], aliases=[name]))
        b = (json.dumps(d, ensure_ascii=False, indent=2) + '\n').encode()
        registrations['live' if w == live else 'main'] = commit_files(w, {'eval/versions.json': b}, f'ops: register {release} rollout terminal death fix', 'registry-live' if w == live else 'registry-main')
    save('publication.json', dict(at=now(), release_id=release, behavior=behavior, registrations=registrations,
        knowledge_preserved=len(before), source_leaves=4, runtime_unchanged=True, accepted_full_tree=f['staged_tree'],
        accepted_full_input_sha256=accepted['input_sha256'], rollback_prior_live=prior,
        actual_consumer_fixed_original_calls=1, no_new_MC_API_or_learning=True, natural_config_actions='pending first new run'))
    stage = 'date-and-dual-notice'; at = now()
    notice = f'\n- {at} 已发布{release}：旧rollout在敌全灭时压过solver死亡、造成HP≤0假胜并续接，现按已结算复活后死亡优先判负、不续接。原W8 f993+6707四叶，实际live行为{behavior["commit"]}；完整629文件5963过2跳、dd954/2395输入7d864f84不变，实际live固定原CEN消费读回通过，最新{len(before)}知识/配置保留。铁甲A8EN原两HP0假胜纠正使血墙分值-37→-47、防御-43.5成为推荐；这是明确行为差异，非收益/质量证明。原full1/反证/133和138定向保留，CARDbrain/REFLEXoff及其余brain/方向出牌off/90s不变；P2已移出计划，不提issue/改mod。预期消除死资源假胜/非法续局；回退只撤四叶至{prior}，保后续知识/日志/配置，首局报错/卡住/兜底增多按§12回退并inbox。新局配置/真实动作及自然故障改善待读回，不关0332科学父或代ACK。原件paper/materials/20261021-1015-ops/publication.json。\n'
    additions = {}
    for p in ['ops/inbox-dev.md', 'notes/for-roy.md']:
        with (r / p).open('ab') as fp: fp.write(notice.encode())
        additions[p] = notice
    line = f'- {now()} CEN四叶完整0后原自然局{runid}结束，精确main/live发布{release}、消费者读回及核号双通知完成；最新知识/配置保留，铁甲行为反证分列，CARDbrain/REFLEXoff，原0332科学父/角色ACK不关；原件paper/materials/20261021-1015-ops/publication.json。\n'
    with (r / 'paper/materials/decision-log.md').open('ab') as fp: fp.write(line.encode())
    additions['paper/materials/decision-log.md'] = line; save('publication-record-additions.json', additions)
    assert knowledge() == before and (r / 'ops/STOP').read_bytes() == stopraw
    (r / 'ops/STOP').unlink(); published = True
    result = dict(at=now(), state='published-original-autoplay-continued', release_id=release,
        actual_live=registrations['live']['commit'], behavior_commit=behavior['commit'], main_commit=registrations['main']['commit'],
        prior_run=runid, autoplay_pid=auto['pid'], CARD='brain', REFLEX='off', latest_knowledge_preserved=len(before),
        natural_config_actions='pending original next natural run', no_new_MC_API_or_learning=True,
        role_ACK_or_scientific_parent_closed=False)
except BaseException as e:
    (a / 'controller-error.txt').write_text(traceback.format_exc())
    result = dict(at=now(), state='blocked-original-CEN-publication-no-repeat-source-full', stage=stage,
        error=type(e).__name__, message=str(e), STOP_present=(r / 'ops/STOP').exists(),
        publication_exists=(a / 'publication.json').exists(), published=published)
finally:
    if lock is not None: fcntl.flock(lock, fcntl.LOCK_UN); lock.close()
    if stopped and autofd is not None:
        try: signal.pidfd_send_signal(autofd, signal.SIGCONT)
        except ProcessLookupError: pass
    if autofd is not None: os.close(autofd)
    save('result.json', result)
    event = r / 'ops/codex-ops/queue' / f'{time.time_ns()}-manual.md'
    event.write_text('原CEN四叶完整0自然边界有限发布接续：' + json.dumps(result, ensure_ascii=False) + '；原件paper/materials/20261021-1015-ops/result.json。核实际发布/双通知/新局配置动作，不重full或派守候。\n')
