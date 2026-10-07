"""Locked publication of this fixed, tested feature commit. No game or model calls."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT / '.worktrees/live'
SCRATCH = ROOT / 'learner/runs/20261007-075131-silent-boss-calibration'
BASE = 'ff571cf0049ca3581588f453f8df630af4451b36'
COAUTHOR = 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'
ENV = {**os.environ, 'PATH': str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'], 'TMPDIR': str(SCRATCH), 'PYTHONDONTWRITEBYTECODE': '1'}


def command(argv, log=None, check=True, cwd=LIVE):
    result = subprocess.run(argv, cwd=cwd, env=ENV, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if log:
        (SCRATCH / log).write_text(result.stdout)
        (SCRATCH / (log + '.exit')).write_text(str(result.returncode) + '\n')
    if check and result.returncode:
        raise RuntimeError(f'{argv[0]} failed ({result.returncode}); log={log}')
    return result


def git(*args):
    return command(['git', *args]).stdout.strip()


def snapshot():
    names = set(git('ls-files', '--', 'knowledge').splitlines())
    names.update(git('ls-files', '--others', '--exclude-standard', '--', 'knowledge').splitlines())
    return {name: hashlib.sha256((LIVE / name).read_bytes()).hexdigest() for name in sorted(names)
            if (LIVE / name).is_file() and not name.endswith('.env')}


def checks(name):
    print(f'Running {name}', flush=True)
    result = command(['nice', '-n', '19', 'bash', 'tools/test-sandbox.sh'], name + '.log', check=False, cwd=LIVE / 'agent')
    return result.returncode


def scan(name):
    command(['nice', '-n', '19', 'gitleaks', 'git', '--pre-commit', '--staged', '--redact', '--no-banner'], name)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--source', required=True)
    p.add_argument('--ledger', required=True)
    a = p.parse_args()
    source = git('rev-parse', a.source + '^{commit}')
    record = {'base': BASE, 'source': source, 'ledger': a.ledger, 'refresh': None, 'merge': None, 'release': None}
    record_path = SCRATCH / 'publication.json'
    def save():
        record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    save()
    with (ROOT / 'ops/live-merge.lock').open('a') as lock:
        print('Waiting for live-merge.lock', flush=True)
        fcntl.flock(lock, fcntl.LOCK_EX)
        print('Acquired live-merge.lock', flush=True)
        if (LIVE / '.git').is_dir():
            raise RuntimeError('live must be its designated worktree')
        if command(['git', 'rev-parse', '-q', '--verify', 'MERGE_HEAD'], check=False).returncode == 0:
            raise RuntimeError('live has another merge in progress')
        if git('diff', '--cached', '--name-only'):
            raise RuntimeError('live has another staged change; leave it untouched')
        while command(['pgrep', '-f', 'knowledge/builders/buil[d]-|ops/[r]eport.py'], check=False).returncode == 0:
            print('Waiting for knowledge refresh', flush=True)
            time.sleep(10)
        before = snapshot()
        stable_count = 0
        while stable_count < 3:
            time.sleep(5)
            now = snapshot()
            if now != before:
                print('Knowledge changed; wait for a stable refresh snapshot', flush=True)
                before = now
                stable_count = 0
            else:
                stable_count += 1
        # Check stability again immediately before staging; never replace another role's files.
        stable = snapshot()
        time.sleep(5)
        if snapshot() != stable:
            raise RuntimeError('knowledge refresh is changing; no merge performed')
        record['knowledge_before'] = stable
        record['status_before'] = git('status', '--short')
        save()
        paths = ['knowledge']
        if (LIVE / 'notes/fight-value-backtest.md').exists():
            paths.append('notes/fight-value-backtest.md')
        command(['git', 'add', '--', *paths])
        if command(['git', 'diff', '--cached', '--quiet'], check=False).returncode:
            if checks('live-before-refresh'):
                command(['git', 'reset', '--', *paths])
                raise RuntimeError('pre-refresh checks failed; original refresh left in place')
            scan('gitleaks-refresh.log')
            command(['git', 'commit', '-m', 'Refresh knowledge data\n\n' + COAUTHOR], 'refresh-commit.log')
            record['refresh'] = git('rev-parse', 'HEAD')
        pre = git('rev-parse', 'HEAD')
        record['pre_merge'] = pre
        (SCRATCH / 'live-knowledge-before.json').write_text(json.dumps(snapshot(), indent=2) + '\n')
        common = git('merge-base', pre, source)
        source_paths = set(git('diff', '--name-only', common, source).splitlines())
        live_paths = set(git('diff', '--name-only', common, pre).splitlines())
        overlap = sorted(source_paths & live_paths)
        record['overlap'] = overlap
        save()
        if any(path.startswith('knowledge/') for path in overlap):
            raise RuntimeError('knowledge overlap: retain both sides; no merge performed')
        preflight = command(['git', 'merge-tree', '--write-tree', pre, source], 'merge-preflight.log', check=False)
        if preflight.returncode:
            raise RuntimeError('preflight conflicts; no live merge performed')
        # Recheck this feature's immutable source commits before the automatic merge commit.
        command(['nice', '-n', '19', 'gitleaks', 'git', '--log-opts=' + pre + '..' + source,
                 '--redact', '--no-banner'], 'gitleaks-before-merge.log')
        print('Preflight passed; merging fixed source', flush=True)
        command(['git', 'merge', '--no-edit', '-m', 'Merge fixed Silent boss calibration source\n\n' + COAUTHOR, source], 'live-merge.log')
        merged = git('rev-parse', 'HEAD')
        record['merge'] = merged
        save()
        if checks('live-after-merge'):
            record['failed_checks'] = 'live-after-merge.log'
            # reset --merge keeps refresh changes in files this feature never touched.
            command(['git', 'reset', '--merge', pre], 'rollback.log')
            record['rolled_back_to'] = git('rev-parse', 'HEAD')
            record['knowledge_after_rollback'] = snapshot()
            save()
            raise RuntimeError('post-merge checks failed; feature rolled back, refresh preserved')
        if git('rev-parse', 'HEAD') != merged:
            raise RuntimeError('live HEAD changed during locked checks; no version recorded')
        after = snapshot()
        changed = sorted(path for path, sha in stable.items() if after.get(path) != sha)
        # Refresh may add data during tests. Keep it; record differences rather than overwrite.
        record['knowledge_working_changes_during_checks'] = changed
        preserved = []
        for path in git('ls-tree', '-r', '--name-only', pre, '--', 'knowledge').splitlines():
            if path == 'knowledge/characters/silent/boss-trust.json':
                continue
            if git('rev-parse', pre + ':' + path) != git('rev-parse', merged + ':' + path):
                raise RuntimeError('merge replaced preserved knowledge blob: ' + path)
            preserved.append(path)
        record['preserved_knowledge_blobs'] = preserved
        record['source_code_verified'] = []
        for path in sorted(source_paths):
            if path.startswith(('agent/', 'learner/', 'ops/')) and path.endswith(('.ts', '.py', '.sh')):
                if git('rev-parse', source + ':' + path) != git('rev-parse', merged + ':' + path):
                    raise RuntimeError('merged source differs in ' + path)
                record['source_code_verified'].append(path)
        date = command(['date'], 'release-date.log').stdout.strip()
        stamp = command(['date', '+%Y-%m-%d %H:%M']).stdout.strip()
        versions = json.loads((LIVE / 'eval/versions.json').read_text())
        entries = versions['versions']
        count = 1
        existing = {entry['name'] for entry in entries}
        while f'S1.boss-calibration{count}' in existing:
            count += 1
        version = f'S1.boss-calibration{count}'
        text = (f'{stamp} Codex学习者上线Roy已授权新功能：静默boss模拟校准；源码{source}→实际live代码{merged}，eval {version}；'
                f'严格已结束SILENT A0–A10：84局、378尝试、160实际结局，218 SL截断不作败局；固定107调参/53后期A10验证。'
                f'首证C48LLXBGKXQ9；F49来源JMH5C51RLN4E/9TG1RP5LFAAK/ZVYUL2YP3518，完整160场及378尝试逐项来源随报告归档。'
                f'B2首回合/B3战前独立整体Platt，boss模型固定ff571cf0，逐boss沿原四指标准入，12项验证2–9场均低可信；'
                f'一场A1开场既有求解器no solve导致两种起点均未参与拟合（实际拟合106、验证53）；A10/F49仅3实际败局、调参2/验证1，验证数量还差9场且仍须通过其余指标。'
                f'女王Execution/实验体Big Pounce仍由A9估，完整残差/失败指标/来源见paper/materials/silent/boss-sim-calibration.md。'
                f'固定夹具覆盖隔离/切分/拟合/进阶/不足/阈值/B2B3/刷新，源与合后沙箱tsc/vitest0；源撤映射/范围3失败2通过、恢复7通过，Python12和调度8通过，原日志保留。'
                f'静默升阶/新增20实结局在:13/:43及学习完成事件检查重跑，旧调参/切点/报告留存、新达标自动入名单；仅写静默boss-trust，其他角色/刷新知识保持，未改策略阈值或修其他队列。'
                f'账本{a.ledger}为fight/proposed并附来源提交，shipped交运维据完成事件核实际后CLI登记；完整外部套件交调度器，调度器主检出同步亦交运维。'
                f'合前{pre}、保存刷新{record["refresh"]}、预检0；不停对局、不运行play、不推送。')
        with (LIVE / 'paper/materials/decision-log.md').open('a', encoding='utf8') as log:
            log.write('\n- ' + text + '\n')
        entries.append({'name': version, 'family': 'Silent', 'commit': merged, 'source': text})
        (LIVE / 'eval/versions.json').write_text(json.dumps(versions, ensure_ascii=False, indent=2) + '\n')
        command(['git', 'add', '--', 'paper/materials/decision-log.md', 'eval/versions.json'])
        scan('gitleaks-release.log')
        command(['git', 'commit', '-m', 'Record Silent boss calibration deployment\n\n' + COAUTHOR], 'release-commit.log')
        record.update({'release': git('rev-parse', 'HEAD'), 'tree': git('rev-parse', 'HEAD^{tree}'), 'version': version,
                       'released_at': date, 'published_trust_blob': git('rev-parse', 'HEAD:knowledge/characters/silent/boss-trust.json'),
                       'status_after': git('status', '--short')})
        save()
        print(json.dumps({k: record[k] for k in ('source', 'refresh', 'pre_merge', 'merge', 'release', 'tree', 'version')}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
