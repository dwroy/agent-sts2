#!/usr/bin/env python3
"""Mechanical integration and publication under the lock held by locked-release.sh."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

SCRATCH = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT / '.worktrees/live'
REQUEST = SCRATCH / 'release-request.json'
STATE = SCRATCH / 'live-release-state.json'
COAUTHOR = 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'


def run(args, cwd=LIVE, *, data=None, env=None, check=True):
    result = subprocess.run(args, cwd=cwd, input=data, capture_output=True, env=env)
    if check and result.returncode:
        raise RuntimeError(f'{args[0:3]} exit {result.returncode}: ' + result.stderr.decode(errors='replace'))
    return result


def git(*args, **kwargs):
    return run(['git', *args], **kwargs).stdout.decode().strip()


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def scan(label, env=None):
    result = run(['gitleaks', 'git', '--staged', '--redact', '--no-banner', '--report-format', 'json',
                  '--report-path', str(SCRATCH / f'{label}-gitleaks.json')], check=False, env=env)
    (SCRATCH / f'{label}-gitleaks.log').write_bytes(result.stdout + result.stderr)
    (SCRATCH / f'{label}-gitleaks.exit').write_text(str(result.returncode) + '\n')
    if result.returncode:
        raise RuntimeError(f'{label}: gitleaks exit {result.returncode}; no commit')


def commit(message):
    scan('live-' + message.splitlines()[0].lower().replace(' ', '-'))
    git('-c', 'core.whitespace=cr-at-eol', 'diff', '--cached', '--check')
    git('commit', '-F', '-', data=(message + '\n\n' + COAUTHOR + '\n').encode())
    return git('rev-parse', 'HEAD')


def prepare():
    assert not STATE.exists(), 'retain previous attempt; do not rerun blindly'
    request = json.loads(REQUEST.read_text())
    source, baseline = request['source'], request['baseline']
    assert len(source) == 40 and len(baseline) == 40
    assert not git('ls-files', '-u')
    assert not git('diff', '--cached', '--name-only'), 'preserve another session staged changes'
    pending = git('rev-parse', '--verify', 'MERGE_HEAD', check=False)
    assert not pending, 'another merge is pending'
    changed = git('diff', '--name-only', '-z', baseline, source).split('\x00')
    changed = [p for p in changed if p]
    assert changed and set(changed) == set(request['paths'])
    allowed = lambda p: p in ('knowledge/characters/silent/boss-trust.json', 'paper/materials/silent/boss-sim-calibration.md') or p.startswith('experiments/boss-sim/silent/' + request['artifact'] + '/')
    assert all(allowed(p) for p in changed), 'only the calibration refresh is authorized'
    assert digest(LIVE / 'knowledge/characters/silent/boss-trust.json') == request['previous_trust_sha256'], 'another calibration overlaps this candidate'
    refresh = git('diff', '--name-only', '-z').split('\x00')
    refresh += git('ls-files', '--others', '--exclude-standard', '-z', '--', 'knowledge').split('\x00')
    refresh = [p for p in refresh if p]
    allowed_refresh = lambda p: p.startswith('knowledge/') or p in ('notes/fight-value-backtest.md', 'notes/fight-value-backtest-silent.md')
    assert all(allowed_refresh(p) for p in refresh), 'unrelated live working changes must be preserved by their owner'
    assert not set(refresh) & set(changed), 'refresh overlaps the candidate'
    initial = git('rev-parse', 'HEAD')
    refreshed = initial
    if refresh:
        git('add', '--', *refresh)
        refreshed = commit('Refresh knowledge data before Silent boss calibration')
    before = git('rev-parse', 'HEAD')
    base_paths = git('ls-tree', '-r', '-z', before)
    assert not git('status', '--porcelain', '--untracked-files=no')
    index = SCRATCH / 'live-integration.index'
    assert not index.exists()
    integration_env = {**os.environ, 'GIT_INDEX_FILE': str(index)}
    git('read-tree', before, env=integration_env)
    git('restore', '--source', source, '--staged', '--', *changed, env=integration_env)
    tree = git('write-tree', env=integration_env)
    scan('live-integration', env=integration_env)
    actual_paths = git('diff', '--name-only', '-z', before, tree).split('\x00')
    actual_paths = {p for p in actual_paths if p}
    assert actual_paths == set(changed), 'the merge must preserve all parallel live blobs'
    message = ('Merge authorized Silent boss calibration refresh into current live\n\n'
               'Retain all current live records, code and refreshed knowledge; overlay only the fixed source calibration paths.\n'
               f'Source: {source}\nArtifact: {request["artifact"]}\n\n' + COAUTHOR + '\n')
    merged = git('commit-tree', tree, '-p', before, '-p', source, data=message.encode())
    branch = 'publish-silent-boss-calibration-20261008-204304'
    git('branch', branch, merged)
    preflight = run(['git', 'merge-tree', '--write-tree', before, merged])
    (SCRATCH / 'live-preflight.log').write_bytes(preflight.stdout + preflight.stderr)
    assert preflight.stdout.decode().splitlines()[0] == tree
    git('merge', '--no-edit', '--ff-only', branch)
    assert git('rev-parse', 'HEAD') == merged
    git('merge-base', '--is-ancestor', source, merged)
    assert set(p for p in git('diff', '--name-only', '-z', before, merged).split('\x00') if p) == set(changed)
    state = {'initial_live': initial, 'refresh_commit': refreshed, 'before_code': before,
             'source': source, 'merged': merged, 'tested_tree': tree, 'paths': changed,
             'refresh_paths': refresh, 'publication_branch': branch,
             'preserved_live_tree_manifest_sha256': hashlib.sha256(base_paths.encode()).hexdigest()}
    write_json(STATE, state)
    print(json.dumps(state, ensure_ascii=False), flush=True)


def finish(test_exit):
    state = json.loads(STATE.read_text())
    request = json.loads(REQUEST.read_text())
    state['sandbox_exit'] = test_exit
    (SCRATCH / 'live-sandbox.exit').write_text(str(test_exit) + '\n')
    assert git('rev-parse', 'HEAD') == state['merged'], 'live moved during the locked test; do not publish'
    if test_exit:
        # Restore only this integration, leaving preserved refresh and any new working data intact.
        git('revert', '--no-commit', '-m', '1', state['merged'])
        state['rollback_commit'] = commit('Roll back failed Silent boss calibration integration')
        write_json(STATE, state)
        print(json.dumps(state, ensure_ascii=False), flush=True)
        return test_exit
    assert not git('diff', '--cached', '--name-only')
    trust = json.loads((LIVE / 'knowledge/characters/silent/boss-trust.json').read_text())
    assert trust['refresh']['artifact'] == request['artifact']
    versions_path = LIVE / 'eval/versions.json'
    versions_text = versions_path.read_text()
    versions = json.loads(versions_text)
    entries = versions['versions']
    names = {e['name'] for e in entries}
    numbers = [int(name.removeprefix('S1.boss-calibration')) for name in names
               if name.startswith('S1.boss-calibration') and name.removeprefix('S1.boss-calibration').isdigit()]
    number = max(numbers, default=0) + 1
    version = f'S1.boss-calibration{number}'
    f49 = {start: (trust['stage_metrics'][start]['F49']['val'] or {}).get('n', 0) for start in ('t1', 'pre')}
    timestamp = run(['date', '+%Y-%m-%d %H:%M:%S %Z']).stdout.decode().strip()
    (SCRATCH / 'release-date.txt').write_text(timestamp + '\n')
    line = (f'- {timestamp} Codex学习者：Roy已授权静默boss模拟校准定期刷新；20次新实际结局触发，'
            f'143局/649尝试/261可用，固定107调参keys与UTC切点2026-10-06T02:46:11.648000，新样本仅扩验证134→154；'
            f'来源{request["evidence_runs"]}，账本{request["ledger"]}仍proposed待运维实际确认。'
            f'原实现cdf75af64fb5b118a5a808ecb3b05e2a05991c36，本批源{state["source"]}，锁内刷新{state["refresh_commit"]}，'
            f'实际合入{state["merged"]}/树{state["tested_tree"]}；'
            f'B2可信{trust["trusted_b2"]}，B3可信{trust["trusted_b3"]}，F49实际9/可用8/验证{f49}、还差{ {start: max(0, 10 - n) for start, n in f49.items()} }且保留全部失败指标；'
            f'来源与模型固定，后续live并行模型不冒称本次回放验证；源及合后原沙箱tsc/vitest0，Python固定12例0，'
            f'唯一{version}，原中断/冲突/错误留史，完整外部交调度器。报告paper/materials/silent/boss-sim-calibration.md；'
            '不改策略阈值、不混角色、旧指纹目录留存。\n')
    with (LIVE / 'paper/materials/decision-log.md').open('a') as handle:
        handle.write(line)
    entry = {'name': version, 'family': 'S1', 'commit': state['merged'],
             'source': f'decision-log {timestamp}：Roy授权静默boss定期校准；源{state["source"]}；20新实际结局/固定107调参与154验证；{request["ledger"]}；paper/materials/silent/boss-sim-calibration.md'}
    closing = versions_text.rfind('\n  ]')
    assert closing >= 0 and entries
    updated_text = versions_text[:closing].rstrip() + ',\n    ' + json.dumps(entry, ensure_ascii=False) + versions_text[closing:]
    assert json.loads(updated_text) == {**versions, 'versions': entries + [entry]}
    versions_path.write_text(updated_text)
    git('add', '--', 'paper/materials/decision-log.md', 'eval/versions.json')
    publication = commit(f'Register {version} Silent boss calibration release')
    state.update({'version': version, 'publication': publication, 'publication_tree': git('rev-parse', 'HEAD^{tree}'), 'date': timestamp})
    assert git('diff', '--name-only', state['merged'], publication).splitlines() == ['eval/versions.json', 'paper/materials/decision-log.md']
    git('merge-base', '--is-ancestor', state['source'], publication)
    write_json(STATE, state)
    previous = json.loads((SCRATCH / 'previous-trust.json').read_text())
    mappings = {start: {'old': previous['overall'][start]['platt'], 'new': trust['overall'][start]['platt']} for start in ('t1', 'pre')}
    notification = (f'\n- {timestamp} Roy：已实际上线授权静默boss校准刷新 {version}。旧规则/资料：上一校准131局/241开场/134验证；'
                    f'新规则/资料：143局/261开场/154验证，107调参keys与切点保持，原四项准入门槛保持；'
                    f'整体胜率映射逐起点旧→新{mappings}；旧B2{previous["trusted_b2"]}→新B2{trust["trusted_b2"]}，旧B3{previous["trusted_b3"]}→新B3{trust["trusted_b3"]}；F49实际9/可模拟8/验证{f49}，仍低可信。'
                    f'证据{request["evidence_runs"]}、{request["ledger"]}、任务20261008-204304-silent-boss-calibration；'
                    f'源{state["source"]}→实际合入{state["merged"]}→固定发布{publication}/树{state["publication_tree"]}。'
                    '预期影响：B2/B3读取本角色最新胜率映射与可信名单，无胜率提升因果结论；保留SL截断偏差与未验证范围。'
                    f'回退：仅把knowledge/characters/silent/boss-trust.json恢复到{state["before_code"]}中的旧blob，锁内自测/记录新版本，保留所有刷新和历史。'
                    '源及合后沙箱通过，完整外部由调度器补；仅proposed，shipped请运维核实实际发布后经CLI登记。\n')
    run(['date'])
    for path in (ROOT / 'notes/for-dai.md', ROOT / 'ops/inbox-dev.md'):
        with path.open('a') as handle:
            handle.write(notification)
    print(json.dumps(state, ensure_ascii=False), flush=True)
    return 0


if __name__ == '__main__':
    try:
        if sys.argv[1] == 'prepare':
            prepare()
        elif sys.argv[1] == 'finish':
            sys.exit(finish(int(sys.argv[2])))
        else:
            raise ValueError('prepare or finish required')
    except Exception as error:
        (SCRATCH / 'live-release-error.log').write_text(str(error) + '\n')
        raise
