"""Publish this task's exact delta under the live lock; retain all concurrent refreshes and records."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')
LIVE = PROJECT / '.worktrees/live'
BASE = '7e1193cef9467416bc10c8e344a49f4fd98390c7'
IMPLEMENTATION = 'cdf75af64fb5b118a5a808ecb3b05e2a05991c36'
COAUTHOR = '\n\nCo-Authored-By: OpenAI GPT-6 <noreply@openai.com>'
source, ledger = sys.argv[1:3]
env = {**os.environ, 'PATH': str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'],
       'TMPDIR': str(HERE), 'SANDBOX_WORKERS': '4'}
state = {'source': source, 'base': BASE, 'ledger': ledger, 'implementation': IMPLEMENTATION}

def run(args, cwd=LIVE, check=True):
    result = subprocess.run(args, cwd=cwd, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if check and result.returncode:
        raise RuntimeError(f'{args[0]} failed ({result.returncode}): {result.stdout[-2000:]}')
    return result

def git(*args):
    return run(['git', '-c', 'core.hooksPath=/dev/null', *args]).stdout.strip()

def save():
    (HERE / 'live-release-state.json').write_text(json.dumps(state, ensure_ascii=False, indent=1) + '\n')

def scan(label):
    result = run(['nice', '-n', '19', 'gitleaks', 'git', '--pre-commit', '--staged', '--redact', '--no-banner',
                  '--report-format', 'json', '--report-path', str(HERE / f'{label}.json')], check=False)
    (HERE / f'{label}.log').write_text(result.stdout)
    (HERE / f'{label}.exit').write_text(str(result.returncode) + '\n')
    if result.returncode:
        raise RuntimeError(f'{label} failed; original scan retained')

def commit(message, label):
    scan(label)
    git('commit', '-m', message + COAUTHOR)
    return git('rev-parse', 'HEAD')

lock = (PROJECT / 'ops/live-merge.lock').open('a')
while True:
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        break
    except BlockingIOError:
        print('live lock busy; waiting without modifying live', flush=True)
        time.sleep(10)
state['initial_live'] = git('rev-parse', 'HEAD')
while run(['pgrep', '-f', 'knowledge/builders/buil[d]-'], check=False).returncode == 0:
    print('waiting for knowledge builders', flush=True)
    time.sleep(10)
def refresh_signature():
    paths = list((LIVE / 'knowledge').rglob('*.json')) + list((LIVE / 'notes').glob('fight-value-backtest*.md'))
    return {str(p.relative_to(LIVE)): (p.stat().st_mtime_ns, p.stat().st_size) for p in paths}
while True:
    signature = refresh_signature()
    time.sleep(10)
    if signature == refresh_signature():
        break
    print('knowledge changed; waiting for a stable refresh snapshot', flush=True)
state['refresh_quiescence_seconds'] = 10
if run(['git', 'rev-parse', '--verify', 'MERGE_HEAD'], check=False).returncode == 0:
    raise RuntimeError('live has an existing merge')
if (LIVE / 'knowledge/characters/silent/boss-trust.json').read_bytes() != (HERE / 'previous-trust.json').read_bytes():
    raise RuntimeError('previous published calibration changed; do not overwrite it')
dirty = run(['git', 'status', '--porcelain', '--untracked-files=all']).stdout.splitlines()
refresh_paths = [line[3:] for line in dirty if line[3:].startswith('knowledge/') or line[3:].startswith('notes/fight-value-backtest')]
other = [line for line in dirty if line[3:] not in refresh_paths]
if other:
    raise RuntimeError('unrelated live pending edits: ' + repr(other))
state['refresh_paths'] = refresh_paths
state['refresh_before_sha256'] = {p: hashlib.sha256((LIVE / p).read_bytes()).hexdigest() if (LIVE / p).exists() else None for p in refresh_paths}
if refresh_paths:
    git('add', '--', *refresh_paths)
    state['refresh_commit'] = commit('Save live knowledge refresh before Silent boss calibration', 'live-refresh-gitleaks')
state['before_code'] = git('rev-parse', 'HEAD')
git('merge-base', '--is-ancestor', IMPLEMENTATION, state['before_code'])
state['source_numeric_code_live_diff_paths'] = git('diff', '--name-only', source, state['before_code'], '--', 'agent/src', 'agent/tools').splitlines()
model_inputs = json.loads((HERE / 'provenance.json').read_text())['input_files']
state['live_model_input_mismatches'] = []
for name, expected in model_inputs.items():
    path = Path(name) if Path(name).is_absolute() else LIVE / name
    actual = hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
    if actual != expected:
        state['live_model_input_mismatches'].append(name)
if state['live_model_input_mismatches']:
    scope = json.loads((HERE / 'live-refresh-scope.json').read_text())
    for name, expected in scope['preserved_live_input_files'].items():
        path = Path(name) if Path(name).is_absolute() else LIVE / name
        actual = hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
        if actual != expected:
            save()
            raise RuntimeError('live inputs changed again after the recorded scope audit')
    if state['source_numeric_code_live_diff_paths'] or sorted(state['live_model_input_mismatches']) != scope['changed_inputs']:
        save()
        raise RuntimeError('unreviewed live model difference beyond the preserved refresh scope')
    state['live_refresh_scope'] = scope
    state['calibration_scope'] = 'validated frozen source inputs only; refreshed numeric inputs remain unvalidated, are preserved, and are explicitly documented'
else:
    state['calibration_scope'] = 'live inputs exactly match the frozen calibration'
paths = git('diff', '--name-only', BASE, source).splitlines()
if any(not (p.startswith('experiments/boss-sim/silent/') or p in (
        'knowledge/characters/silent/boss-trust.json', 'paper/materials/silent/boss-sim-calibration.md')) for p in paths):
    raise RuntimeError('unrelated source delta')
state['paths'] = paths
state['overlap'] = sorted(set(paths) & set(refresh_paths))
if state['overlap']:
    save()
    raise RuntimeError('calibration overlaps refreshed knowledge')
for p in paths:
    if p.startswith('experiments/boss-sim/silent/'):
        if run(['git', 'cat-file', '-e', state['before_code'] + ':' + p], check=False).returncode == 0:
            raise RuntimeError('new archive would overwrite an old archive: ' + p)
    elif git('diff', '--name-only', BASE, state['before_code'], '--', p):
        raise RuntimeError('live changed a task path since source base: ' + p)
preflight = run(['git', 'merge-tree', '--write-tree', state['before_code'], source], check=False)
(HERE / 'live-preflight.log').write_text(preflight.stdout)
(HERE / 'live-preflight.exit').write_text(str(preflight.returncode) + '\n')
state['preflight_exit'] = preflight.returncode
state['merge_method'] = 'two-parent task-only merge, source ancestry retained; unrelated live paths preserved byte for byte'
before_tree = git('ls-tree', '-r', state['before_code']).splitlines()
(HERE / 'preserved-live-tree.txt').write_text('\n'.join(before_tree) + '\n')
save()
try:
    git('merge', '--no-ff', '--no-commit', '-s', 'ours', source)
    git('restore', '--source', source, '--staged', '--worktree', '--', *paths)
    git('-c', 'core.whitespace=cr-at-eol', 'diff', '--cached', '--check', '--', '.', ':(glob,exclude)**/*.log')
    state['merged'] = commit('Publish authorized Silent boss calibration validation refresh', 'live-merge-gitleaks')
    state['tested_tree'] = git('rev-parse', 'HEAD^{tree}')
    old = {line.split('\t', 1)[1]: line.split('\t', 1)[0] for line in before_tree}
    now = {line.split('\t', 1)[1]: line.split('\t', 1)[0] for line in git('ls-tree', '-r', 'HEAD').splitlines()}
    assert {p:v for p,v in old.items() if p not in paths} == {p:v for p,v in now.items() if p not in paths}
    for p, expected in state['refresh_before_sha256'].items():
        got = hashlib.sha256((LIVE / p).read_bytes()).hexdigest() if (LIVE / p).exists() else None
        assert got == expected, p
    state['other_paths_byte_equivalent'] = True
    save()
    with (HERE / 'live-sandbox.log').open('w') as log:
        result = subprocess.run(['nice', '-n', '19', 'bash', 'tools/test-sandbox.sh'], cwd=LIVE / 'agent', env=env,
                                stdout=log, stderr=subprocess.STDOUT)
    (HERE / 'live-sandbox.exit').write_text(str(result.returncode) + '\n')
    state['sandbox_exit'] = result.returncode
    if result.returncode:
        raise RuntimeError('live sandbox checks failed; original log retained')
except BaseException as error:
    if run(['git', 'rev-parse', '--verify', 'MERGE_HEAD'], check=False).returncode == 0:
        git('merge', '--abort')
    elif state.get('merged') and git('rev-parse', 'HEAD') == state['merged']:
        git('reset', '--mixed', state['before_code'])
        existing = [p for p in paths if run(['git', 'cat-file', '-e', state['before_code'] + ':' + p], check=False).returncode == 0]
        git('restore', '--source', state['before_code'], '--staged', '--worktree', '--', *existing)
        for p in paths:
            if p not in existing:
                (LIVE / p).unlink(missing_ok=True)
    state['rolled_back'] = str(error)
    save()
    raise
timestamp = run(['date', '+%Y-%m-%d %H:%M:%S %Z']).stdout.strip()
version_path = LIVE / 'eval/versions.json'
version_text = version_path.read_text()
versions = json.loads(version_text)
numbers = [int(v['name'].split('S1.boss-calibration')[1]) for v in versions['versions'] if v['name'].startswith('S1.boss-calibration')]
version = 'S1.boss-calibration' + str(max(numbers, default=0) + 1)
trust = json.loads((LIVE / 'knowledge/characters/silent/boss-trust.json').read_text())
extraction = json.loads((HERE / 'dataset/extraction.json').read_text())
new = json.loads((HERE / 'new-fights.json').read_text())
evidence = sorted({r['run_id'] for r in new})
line = (f'- {timestamp} Codex学习者：Roy已授权新功能静默boss定期校准刷新；22新实际结局触发，'
        f'{extraction["finished_runs"]}完局/{extraction["attempts"]}尝试/{extraction["written"]}可用，固定107调参与UTC切点，验证214→236；'
        f'来源{evidence}，账本{ledger}为fight/proposed待运维核实；复用实现{IMPLEMENTATION}，'
        f'本批源{source}→实际{state["merged"]}，版本{version}；'
        f'B2/B3 Brier={trust["overall"]["t1"]["brier"]}/{trust["overall"]["pre"]["brier"]}，'
        f'可信{trust["trusted_b2"]}/{trust["trusted_b3"]}，F49独立限制保留；'
        '309历史等价结果复用、12潜在升级影响旧战与22新战按原索引重放。完整来源/残差/不足见'
        'paper/materials/silent/boss-sim-calibration.md与新指纹目录；原阈值与其他角色保持，刷新逐blob保留。'
        '原发布预检exit1发现9项刷新输入不同已保留；343开场不变，但343战后续转移统计、54战招式数值不同，'
        '校准仅验证固定源指纹，不声称这些刷新输入已验证，范围审计与原失败日志见任务回执。'
        '源/合后固定沙箱tsc+vitest0、Python校准12与适配实际目录条件的调度8项0，'
        '旧调度夹具44项18失败/初始全量重放中断130均保留；完整外部检查交调度器，shipped交运维；不修其他队列、不运行play、不推送。\n')
with (LIVE / 'paper/materials/decision-log.md').open('a') as out:
    out.write(line)
entry = {'name': version, 'family': 'S1', 'commit': state['merged'],
         'source': f'decision-log {timestamp}: Roy授权静默boss定期校准；源{source}；22新实际结局，固定107调参/236验证；{ledger}；paper/materials/silent/boss-sim-calibration.md'}
versions['versions'].append(entry)
at = version_text.rfind(']')
updated = version_text[:at].rstrip() + ',\n    ' + json.dumps(entry, ensure_ascii=False) + '\n  ' + version_text[at:]
assert json.loads(updated) == versions
version_path.write_text(updated)
git('add', '--', 'paper/materials/decision-log.md', 'eval/versions.json')
state['publication'] = commit('Register ' + version + ' Silent boss calibration release', 'live-release-gitleaks')
state.update(version=version, publication_tree=git('rev-parse', 'HEAD^{tree}'), date=timestamp)
save()
print(json.dumps(state, ensure_ascii=False))
