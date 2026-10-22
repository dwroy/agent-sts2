from pathlib import Path
import fcntl, hashlib, json, os, subprocess

R = Path('/home/dw/Projects/agent-sts2')
B = Path(__file__).resolve().parent
LEDGER = 'paper/materials/decision-log.md'
HANDOFF = 'handoff/integrator-20261022-codex3.md'

def git(*args, data=None, env=None):
    return subprocess.check_output(['git', *args], cwd=R, input=data, env=env, stderr=subprocess.PIPE)

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def save(name, value):
    (B/name).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')

c = json.loads((B/'candidate.json').read_text())
plan = json.loads((B/'record-plan.json').read_text())
assert json.loads((B/'full/checks.json').read_text())['state'] == 'passed'
assert json.loads((B/'main-selfcheck.json').read_text())['state'] == 'passed'
base, candidate = c['base'], c['candidate']
paths = git('diff','--name-only',base,candidate).decode().splitlines()
files = {p:git('show',candidate+':'+p) for p in paths}
assert set(paths) == set(c['paths']) and LEDGER in files and HANDOFF in files
assert all(not p.startswith('third_party/') for p in paths)
scan = subprocess.run(['gitleaks','stdin','--redact','--no-banner'],input=b'\n'.join(files.values()),
    capture_output=True,env={**os.environ,'GOMAXPROCS':'1'})
(B/'main-gitleaks.log').write_bytes(scan.stdout+scan.stderr)
assert scan.returncode == 0
lock = (R/'ops/live-merge.lock').open('a')
fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
fd = guard = None
backed_up = ref_updated = False
before, written = {}, {}
new = plan['new_line'].encode()
try:
    assert git('branch','--show-current').strip() == b'main'
    assert not git('diff','--cached','--name-only').strip()
    parent = git('rev-parse','HEAD').decode().strip()
    assert subprocess.run(['git','merge-base','--is-ancestor',base,parent],cwd=R).returncode == 0
    drift = git('diff','--name-only',base,parent).decode().splitlines()
    assert not git('diff','--name-only',base,parent,'--','agent','ops','learner','knowledge','eval','tools','.agents',':(exclude)eval/versions.json').strip(), 'main inputs advanced after targeted candidate'
    binding = R/'ops/instance-binding.json'
    binding_before = {'sha256':sha(binding.read_bytes()),'mode':binding.stat().st_mode&0o777}
    result = subprocess.run(['python3','-B','ops/instance_binding_backup.py','backup','--root',str(R)],cwd=R,capture_output=True)
    (B/'main-binding-backup.json').write_bytes(result.stdout)
    assert result.returncode == 0
    backed_up = True
    index = Path(git('rev-parse','--path-format=absolute','--git-path','index').decode().strip())
    guard = Path(str(index)+'.lock')
    fd = os.open(guard,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    private = B/'main.index'
    assert not private.exists()
    private.write_bytes(index.read_bytes())
    env = {**os.environ,'GIT_INDEX_FILE':str(private)}
    assert git('write-tree',env=env).strip() == git('rev-parse',parent+'^{tree}').strip()
    for p in paths:
        target = R/p
        assert not target.is_symlink()
        for folder in target.parents:
            if folder == R: break
            assert not folder.is_symlink()
        raw = target.read_bytes() if target.exists() else None
        before[p] = raw
        if p in (LEDGER,HANDOFF): continue
        old = subprocess.run(['git','show',parent+':'+p],cwd=R,capture_output=True)
        assert (old.returncode == 0 and raw == old.stdout) or (old.returncode != 0 and (raw is None or raw == files[p])),p+' has parallel changes'
    # Commit only selected watcher lines while preserving every unrelated dirty byte in the checkout.
    parent_log = git('show',parent+':'+LEDGER)
    selected = [s.encode() for s in plan['ledger_selected_lines']]
    assert all(before[LEDGER].splitlines(keepends=True).count(s) == 1 for s in selected)
    assert new not in before[LEDGER]
    selected = [s for s in selected if s not in parent_log.splitlines(keepends=True)]
    files[LEDGER] = parent_log+b'\n'+b'\n'.join(selected)+b'\n'+new
    original_handoff = plan['root_handoff_preimage'].encode()
    assert before[HANDOFF] == original_handoff, 'handoff changed since material preparation'
    assert git('show',parent+':'+HANDOFF) == git('show',base+':'+HANDOFF)
    assert files[HANDOFF] == original_handoff+b'\n'+new
    for p, raw in files.items():
        mode = git('ls-tree',candidate,'--',p).decode().split()[0]
        assert mode in ('100644','100755')
        blob = git('hash-object','-w','--stdin',data=raw).decode().strip()
        git('update-index','--add','--cacheinfo',f'{mode},{blob},{p}',env=env)
    tree = git('write-tree',env=env).decode().strip()
    assert set(git('diff','--name-only',parent,tree).decode().splitlines()) == set(paths)
    assert not git('diff','--name-only',candidate,tree,'--','agent','ops','learner','knowledge','eval','tools','.agents',':(exclude)eval/versions.json').strip()
    msg = 'Merge #36 R3 and #44 test fixes after precise R414 full\n\nPreserve main consumers, queued #27 data and concurrent records.\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\nAgent: codex@xdwin\n'
    commit = git('commit-tree',tree,'-p',parent,'-p',candidate,data=msg.encode()).decode().strip()
    assert git('rev-parse','HEAD').decode().strip() == parent
    for p, raw in before.items():
        assert ((R/p).read_bytes() if (R/p).exists() else None) == raw,p+' changed during integration'
    for p, raw in files.items():
        target = R/p
        target.parent.mkdir(parents=True,exist_ok=True)
        if p in (LEDGER,HANDOFF):
            append = (b'\n' if p == HANDOFF else b'\n')+new
            out = os.open(target,os.O_WRONLY|os.O_APPEND)
            try:
                assert os.write(out,append) == len(append)
                os.fsync(out)
            finally: os.close(out)
            written[p] = target.read_bytes()
            continue
        if before[p] == raw:
            continue
        tmp = target.with_name(target.name+'.issue36-44-integration-tmp')
        assert not tmp.exists()
        with tmp.open('xb') as out:
            out.write(raw);out.flush();os.fsync(out.fileno())
        tmp.chmod(int(git('ls-tree',candidate,'--',p).decode().split()[0],8)&0o777)
        os.replace(tmp,target)
        written[p] = raw
    git('update-ref','refs/heads/main',commit,parent)
    ref_updated = True
    with os.fdopen(fd,'wb') as out:
        fd = None
        out.write(private.read_bytes());out.flush();os.fsync(out.fileno())
    os.replace(guard,index)
    guard = None
    assert not git('diff','--cached','--name-only').strip()
    for p in (LEDGER,HANDOFF):
        assert (R/p).read_bytes().startswith(before[p]) and (R/p).read_bytes()[len(before[p]):] == b'\n'+new
    for p in paths:
        if p not in (LEDGER,HANDOFF): assert (R/p).read_bytes() == files[p]
    save('main-integration.json',{'main':commit,'parent':parent,'candidate':candidate,'tree':tree,
        'tested_tree':c['tested_tree'],'main_targeted_tree':c['main_targeted_tree'],'paths':paths,
        'preserved_record_only_main_drift':drift,'gitleaks_rc':0,'preexisting_dirty_ledger_preserved_byte_for_byte':True,
        'preexisting_dirty_ledger_sha256':sha(before[LEDGER]),'preexisting_handoff_sha256':sha(before[HANDOFF]),
        'main_candidate_runtime_matches_targeted_tree':True,'unique_full_scope':'R414 precise composition; not main full',
        'production_live_written':False})
    print((B/'main-integration.json').read_text(),flush=True)
except BaseException:
    if not ref_updated:
        for p, raw in written.items():
            target = R/p
            if p in (LEDGER,HANDOFF):
                current = target.read_bytes()
                added = b'\n'+new
                if current == before[p]+added: target.write_bytes(before[p])
                continue
            if target.read_bytes() != raw: continue
            if before[p] is None: target.unlink()
            else: target.write_bytes(before[p])
    raise
finally:
    if fd is not None: os.close(fd)
    if guard is not None and guard.exists(): guard.unlink()
    if backed_up:
        for action in ('restore','verify'):
            result = subprocess.run(['python3','-B','ops/instance_binding_backup.py',action,'--root',str(R)],cwd=R,capture_output=True)
            (B/f'main-binding-{action}.json').write_bytes(result.stdout)
            assert result.returncode == 0
        assert {'sha256':sha(binding.read_bytes()),'mode':binding.stat().st_mode&0o777} == binding_before
    fcntl.flock(lock,fcntl.LOCK_UN)
    lock.close()
