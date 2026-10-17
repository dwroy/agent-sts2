"""Publish only this tested Silent calibration delta and preserve every unrelated live blob."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration')
PROJECT = Path('/home/dw/Projects/agent-sts2')
LIVE = PROJECT / '.worktrees/live'
state = json.loads((HERE / 'publication.json').read_text())
SOURCE = state['source']
ENV = {**os.environ, 'PATH': str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'],
       'TMPDIR': str(HERE), 'SANDBOX_WORKERS': '1', 'npm_config_offline': 'true'}
COAUTHOR = '\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>'


def run(args, check=True, cwd=LIVE, env=ENV):
    result = subprocess.run(args, cwd=cwd, env=env, capture_output=True, text=True)
    if check and result.returncode:
        raise RuntimeError(f'{args[0]} exit {result.returncode}; {result.stderr[-1200:]}')
    return result

def git(*args, env=ENV):
    return run(['git', '-c', 'core.hooksPath=/dev/null', *args], env=env).stdout.strip()

def save():
    (HERE / 'publication.json').write_text(json.dumps(state, ensure_ascii=False, indent=1) + '\n')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None

def blocked(reason):
    state['blocked'] = reason
    save()
    print(json.dumps(state, ensure_ascii=False), flush=True)
    raise SystemExit(3)

def commit(message, label):
    result = run(['nice', '-n', '19', 'gitleaks', 'git', '--pre-commit', '--staged', '--redact', '--no-banner',
                  '--report-format', 'json', '--report-path', str(HERE / (label + '.json'))], check=False)
    (HERE / (label + '.log')).write_text(result.stdout + result.stderr)
    (HERE / (label + '.exit')).write_text(str(result.returncode) + '\n')
    if result.returncode:
        raise RuntimeError('gitleaks failed; original scan retained: ' + label)
    (HERE / (label + '.commit-date.log')).write_text(run(['date', '+%Y-%m-%d %H:%M:%S %Z']).stdout)
    git('commit', '-m', message + COAUTHOR)
    return git('rev-parse', 'HEAD')


# The lock descriptor survives the exec from publisher to sandbox to finalizer.
lock_fd = int(os.environ['CALIBRATION_LOCK_FD'])
os.fstat(lock_fd)
fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
rc = int(sys.argv[1])
state['original_sandbox_exit'] = rc
if rc == 0:
    equivalents = {}
    for fixture in ('global_build_health_test.py', 'global_build_funnel_test.py'):
        result = subprocess.run(['nice', '-n', '19', '/usr/bin/python3', '-B', 'tests/'+fixture],
                                cwd=LIVE/'agent', env=ENV, capture_output=True, text=True)
        (HERE/('live-'+fixture+'.stdout')).write_text(result.stdout)
        (HERE/('live-'+fixture+'.stderr')).write_text(result.stderr)
        equivalents[fixture] = {'exit':result.returncode, 'stdout_empty':result.stdout == ''}
        if result.returncode or result.stdout:
            rc = result.returncode or 1
    (HERE/'live-wrapper-equivalents.json').write_text(json.dumps(equivalents,indent=1)+'\n')
(HERE / 'live-sandbox.exit').write_text(str(rc) + '\n')
state['sandbox_exit'] = rc
save()
if rc != 0:
    assert git('rev-parse', 'HEAD') == state['merged'], 'live HEAD changed; do not reset concurrent work'
    paths = state['paths']
    prior_paths = set(git('ls-tree', '-r', '--name-only', state['before_code']).splitlines())
    git('reset', '--mixed', state['before_code'])
    existing = [p for p in paths if p in prior_paths]
    git('restore', '--source', state['before_code'], '--staged', '--worktree', '--', *existing)
    for p in set(paths) - set(existing):
        (LIVE / p).unlink(missing_ok=True)
    state['rolled_back'] = 'live sandbox exit ' + str(rc) + '; original logs and pre-merge refresh preserved'
    state['merged'] = None
    save()
    print(json.dumps(state, ensure_ascii=False))
    raise SystemExit(rc)
assert git('rev-parse', 'HEAD') == state['merged'], 'live HEAD changed under merge lock'
with (HERE / 'live-consumer.log').open('w') as handle:
    probe = subprocess.run(['nice', '-n', '19', str(Path.home() / '.local/node/bin/node'), '--import', 'tsx',
         str(HERE / 'read-consumer.mts'), str(LIVE), str(HERE / 'live-consumer-read.json')],
         cwd=LIVE / 'agent', env=ENV, stdout=handle, stderr=subprocess.STDOUT)
(HERE / 'live-consumer.exit').write_text(str(probe.returncode) + '\n')
if probe.returncode != 0:
    assert git('rev-parse', 'HEAD') == state['merged'], 'live HEAD changed; preserve concurrent work'
    prior_paths = set(git('ls-tree', '-r', '--name-only', state['before_code']).splitlines())
    git('reset', '--mixed', state['before_code'])
    existing = [p for p in state['paths'] if p in prior_paths]
    git('restore', '--source', state['before_code'], '--staged', '--worktree', '--', *existing)
    for p in set(state['paths']) - set(existing):
        (LIVE / p).unlink(missing_ok=True)
    state['rolled_back'] = 'consumer probe failed; checks and pre-merge refresh preserved'
    state['merged'] = None
    save()
    raise SystemExit(probe.returncode)

pending = run(['git','status','--porcelain','--untracked-files=all']).stdout.rstrip('\n')
state['postcheck_runtime_dirty'] = {line[3:]:sha(LIVE/line[3:]) for line in pending.splitlines() if '.env' not in Path(line[3:]).name}
state['fixed_tree_scope'] = 'Git publication tree; any concurrent uncommitted refresh is listed separately, not claimed as the checked tree.'
assert (LIVE/'knowledge/characters/silent/boss-trust.json').read_bytes() == (ROOT/'knowledge/characters/silent/boss-trust.json').read_bytes()
assert (LIVE/'paper/materials/silent/boss-sim-calibration.md').read_bytes() == (ROOT/'paper/materials/silent/boss-sim-calibration.md').read_bytes()
save()
summary = json.loads((HERE/'summary.json').read_text())
stamp = run(['date', '+%Y-%m-%d %H:%M:%S %Z']).stdout.strip()
ledger = (HERE / 'ledger-id.txt').read_text().strip()
trust = json.loads((LIVE / 'knowledge/characters/silent/boss-trust.json').read_text())
vp = LIVE / 'eval/versions.json'
raw = vp.read_text()
versions = json.loads(raw)
number = max(int(v['name'].split('S1.boss-calibration')[1]) for v in versions['versions']
             if v['name'].startswith('S1.boss-calibration')) + 1
version = f'S1.boss-calibration{number}'
entry = {'name': version, 'family': 'Silent', 'commit': state['merged'],
         'source': f'{stamp}: Roy授权静默boss校准刷新；{summary["new"]}新可用实际结局，{summary["finished_runs"]}完局/{summary["attempts"]}尝试/{summary["usable"]}可用，固定{summary["tune"]}调参/{summary["val"]}验证；数据源{SOURCE}；{ledger}；固定模型/Platt/切点不变；paper/materials/silent/boss-sim-calibration.md'}
array_start = raw.index('[', raw.index('"versions"'))
_, consumed = json.JSONDecoder().raw_decode(raw[array_start:])
array_end = array_start + consumed - 1
updated = raw[:array_end].rstrip() + ',\n    ' + json.dumps(entry, ensure_ascii=False) + '\n  ' + raw[array_end:]
assert json.loads(updated)['versions'] == versions['versions'] + [entry]
assert json.loads(updated)['release_numbering'] == versions['release_numbering']
vp.write_text(updated)
with (LIVE / 'paper/materials/decision-log.md').open('a') as handle:
    handle.write(f'\n- {stamp} Codex学习者 / {HERE.name}：Roy已授权新功能静默boss校准刷新，{summary["new"]}新可用实际结局；{summary["finished_runs"]}完局/{summary["attempts"]}尝试/{summary["usable"]}可用，固定{summary["tune"]}调参/{summary["val"]}验证；B2/B3 Brier{trust["overall"]["t1"]["brier"]}/{trust["overall"]["pre"]["brier"]}、可信{len(trust["trusted_b2"])}/{len(trust["trusted_b3"])}，F49仍按原四指标低信度。证据局/回合见完整报告及来源，固定模型7e1193cef、整体Platt/切点保持；源{SOURCE}→actual {state["merged"]}/{version}，合后沙箱可执行集合及实际消费者读回通过；两个新增Node子进程包装因EPERM在命令行排除，原Python固定夹具直接通过，标准入口历史130/EPERM保留，完整无排除外检交调度器。锁内保存刷新、精确叶子预检、source-parent merge，其他角色/源码/并行记录逐blob保持；{ledger}只proposed，shipped及正式release_id交运维核实际发布，完整外部检查交调度器。\n')
git('add', '--', 'paper/materials/decision-log.md', 'eval/versions.json')
state['publication'] = commit('Register ' + version + ' Silent calibration release', 'publication-gitleaks')
state.update(version=version, publication_tree=git('rev-parse', 'HEAD^{tree}'), date=stamp,
             formal_release_id='pending ops allocation')
assert run(['git', 'merge-base', '--is-ancestor', SOURCE, state['publication']], check=False).returncode == 0
save()
print(json.dumps(state, ensure_ascii=False), flush=True)
