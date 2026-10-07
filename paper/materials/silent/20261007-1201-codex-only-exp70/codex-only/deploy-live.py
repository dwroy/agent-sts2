"""One immutable feature merge under the repository live lock. No game/model operations."""
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

SCRATCH = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT / '.worktrees/live'
OWN = ROOT / '.worktrees/codex-only-brain'
SOURCE = sys.argv[1]
COAUTHOR = 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'
VERSION = 'V4.codex-only1'
STATE = {'status': 'preparing', 'integration_source': SOURCE, 'version': VERSION,
         'original_source': '856007edb088f572e5eabcf2e833df15c32ac649', 'tests': {},
         'shipped': False, 'checks_pending': True}


def save():
    (SCRATCH / 'deployment.json').write_text(json.dumps(STATE, ensure_ascii=False, indent=2) + '\n')


def cmd(args, cwd=LIVE, check=True, **kwargs):
    result = subprocess.run(args, cwd=cwd, text=True, capture_output=True, **kwargs)
    if check and result.returncode:
        raise RuntimeError(f'{args[0:3]} exit {result.returncode}: {result.stdout[-2000:]} {result.stderr[-2000:]}')
    return result


def git(*args, **kwargs):
    return cmd(['git', *args], **kwargs).stdout.strip()


def changes():
    data = subprocess.check_output(['git', 'status', '--porcelain=v1', '-z', '--untracked-files=all'], cwd=LIVE)
    records = [r.decode() for r in data.split(b'\0') if r]
    return [r[3:] for r in records]


def fingerprints(paths):
    result = {}
    for name in paths:
        if name.endswith('.env') or '/.env' in name:
            raise RuntimeError('denied env path in candidate refresh; not read')
        path = LIVE / name
        result[name] = hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
    return result


def scan_diff(name):
    data = subprocess.check_output(['git', 'diff', '--cached', '--binary'], cwd=LIVE)
    result = subprocess.run(['gitleaks', 'stdin', '--redact'], input=data, capture_output=True)
    (SCRATCH / name).write_bytes(result.stdout + result.stderr)
    if result.returncode:
        raise RuntimeError('gitleaks rejected staged delta; no commit')


def test_sandbox(name):
    env = dict(os.environ, PATH=str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'], TMPDIR=str(SCRATCH), SANDBOX_WORKERS='1')
    with (SCRATCH / name).open('w') as log:
        result = subprocess.run(['nice', '-n', '19', 'bash', 'tools/test-sandbox.sh'], cwd=OWN / 'agent', env=env, stdout=log, stderr=subprocess.STDOUT)
    text = (SCRATCH / name).read_text()
    counts = re.findall(r'Test Files\s+([^\n]+)|Tests\s+([^\n]+)', text)
    return {'rc': result.returncode, 'log': name, 'tsc': 0 if 'RUN  v' in text else None, 'workers': 1, 'summary': counts,
            'sha256': hashlib.sha256((SCRATCH / name).read_bytes()).hexdigest()}


if (SCRATCH / 'deployment.json').exists():
    previous = json.loads((SCRATCH / 'deployment.json').read_text())
    if previous.get('actual_merge') and not previous.get('rollback'):
        raise SystemExit('Existing actual source merge must be resumed explicitly, never remerged')
    stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    (SCRATCH / f'deployment-attempt-before-{stamp}.json').write_text(json.dumps(previous, ensure_ascii=False, indent=2) + '\n')
save()
with (ROOT / 'ops/live-merge.lock').open('a') as lock:
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        STATE['status'] = 'lock_busy'
        save()
        print('live-merge.lock busy; live unchanged; source and failure record retained')
        raise SystemExit(3)
    STATE['lock_acquired'] = dt.datetime.now(dt.timezone.utc).isoformat()
    try:
        if git('rev-parse', '--verify', '-q', 'MERGE_HEAD', check=False):
            raise RuntimeError('live has another pending merge')
        if git('diff', '--cached', '--name-only'):
            raise RuntimeError('live already has staged changes')
        initial = changes()
        if any(not name.startswith(('knowledge/', 'notes/')) for name in initial):
            raise RuntimeError(f'non-refresh live changes need preservation by their owner: {initial}')
        stable = fingerprints(initial)
        time.sleep(3)
        if initial != changes() or stable != fingerprints(initial):
            raise RuntimeError('live refresh still changing; merge deferred')
        STATE['refresh_confirmation'] = {'stable_seconds': 3, 'paths': initial, 'fingerprints': stable,
            'process_scope': 'sandbox process namespace only; not a claim of complete host process inspection',
            'lock': str(ROOT / 'ops/live-merge.lock')}
        incoming = git('diff', '--name-only', f'HEAD...{SOURCE}').splitlines()
        if any(name.startswith(('knowledge/', 'notes/', 'paper/')) for name in incoming):
            raise RuntimeError('curated source unexpectedly carries knowledge, notes or paper history')
        STATE['overlap'] = sorted(set(incoming) & set(initial))
        if STATE['overlap']:
            raise RuntimeError('incoming source overlaps refreshed data')
        if initial:
            cmd(['git', 'add', '--', *initial])
            scan_diff('gitleaks-live-refresh.log')
            cmd(['git', 'commit', '-m', 'Preserve all live refresh files before Codex-only feature merge\n\n' + COAUTHOR])
            STATE['refresh_commit'] = git('rev-parse', 'HEAD')
        else:
            STATE['refresh_commit'] = None
        before = git('rev-parse', 'HEAD')
        STATE['before_code'] = before
        STATE['before_tree'] = git('rev-parse', 'HEAD^{tree}')
        knowledge_before = git('ls-tree', '-r', 'HEAD', '--', 'knowledge')
        (SCRATCH / 'live-knowledge-before.txt').write_text(knowledge_before + '\n')
        preflight = cmd(['git', 'merge-tree', '--write-tree', before, SOURCE], check=False)
        (SCRATCH / 'preflight-live.txt').write_text(preflight.stdout + preflight.stderr)
        STATE['preflight'] = {'rc': preflight.returncode, 'log': 'preflight-live.txt'}
        save()
        if preflight.returncode:
            raise RuntimeError('live merge preflight conflict; no source merged')
        cmd(['git', 'merge', '--no-ff', SOURCE, '-m', 'Merge authorized Codex-only brain recovery and source policy\n\n' + COAUTHOR])
        STATE['actual_merge'] = git('rev-parse', 'HEAD')
        STATE['merged_tree'] = git('rev-parse', 'HEAD^{tree}')
        if knowledge_before != git('ls-tree', '-r', 'HEAD', '--', 'knowledge'):
            raise RuntimeError('knowledge committed blobs changed across source merge')
        STATE['knowledge_blobs_preserved'] = True
        # The owner's worktree freezes the exact merged commit while live report refreshes remain active.
        if git('status', '--porcelain', cwd=OWN):
            raise RuntimeError('owner worktree is not clean for immutable merged-tree checks')
        cmd(['git', 'merge', '--ff-only', STATE['actual_merge']], cwd=OWN)
        STATE['fixed_check_commit'] = git('rev-parse', 'HEAD', cwd=OWN)
        STATE['fixed_check_tree'] = git('rev-parse', 'HEAD^{tree}', cwd=OWN)
        if STATE['fixed_check_commit'] != STATE['actual_merge']:
            raise RuntimeError('owner fixed check commit differs from actual live merge')
        STATE['status'] = 'merged_testing'
        save()
        STATE['tests']['sandbox'] = test_sandbox('test-live.log')
        save()
        if STATE['tests']['sandbox']['rc']:
            # Only the reproduced transient existing rollout ranking failure warrants one full retry.
            text = (SCRATCH / 'test-live.log').read_text()
            if 'rollout-live.test.ts' in text and '1 failed' in text:
                STATE['tests']['sandbox_retry'] = test_sandbox('test-live-retry.log')
                save()
            final_rc = STATE['tests'].get('sandbox_retry', STATE['tests']['sandbox'])['rc']
            if final_rc:
                cmd(['git', 'reset', '--merge', before])
                STATE['status'] = 'rolled_back_after_checks'
                STATE['rollback'] = git('rev-parse', 'HEAD')
                save()
                raise SystemExit(4)
        env = dict(os.environ, PATH=str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'], TMPDIR=str(SCRATCH))
        with (SCRATCH / 'python-live.log').open('w') as log:
            result = subprocess.run(['nice', '-n', '19', str(ROOT / 'data/logdb-venv/bin/python'), '-m', 'unittest', 'discover', '-s', 'tests', '-p', '*_test.py'], cwd=OWN / 'agent', env=env, stdout=log, stderr=subprocess.STDOUT)
        STATE['tests']['python'] = {'rc': result.returncode, 'log': 'python-live.log', 'sha256': hashlib.sha256((SCRATCH / 'python-live.log').read_bytes()).hexdigest()}
        save()
        if result.returncode:
            cmd(['git', 'reset', '--merge', before])
            STATE['status'] = 'rolled_back_after_python'
            STATE['rollback'] = git('rev-parse', 'HEAD')
            save()
            raise SystemExit(5)
        if git('rev-parse', 'HEAD') != STATE['actual_merge']:
            raise RuntimeError('live HEAD moved despite lock; tested source tree cannot be claimed')
        if git('status', '--porcelain', cwd=OWN):
            raise RuntimeError('fixed check worktree changed during tests')
        stamp = cmd(['date', '+%Y-%m-%d %H:%M']).stdout.strip()
        STATE['release_date_command'] = stamp
        versions = json.loads((LIVE / 'eval/versions.json').read_text())
        if any(row['name'] == VERSION for row in versions['versions']):
            raise RuntimeError('release version already exists')
        entry = {'name': VERSION, 'family': 'V4', 'commit': STATE['actual_merge'],
                 'source': f'decision-log {stamp}: Roy authorized Codex-only waiting and codex-successful-brain-v1 performance/climb policy; global engine/source behavior only'}
        versions['versions'].append(entry)
        (LIVE / 'eval/versions.json').write_text(json.dumps(versions, ensure_ascii=False, indent=2) + '\n')
        line = f"- {stamp} Codex学习者上线Roy09:00已授权独立功能：Codex-only大脑等待与统计口径；原源码{STATE['original_source']}、仅本功能最终源{SOURCE}→实际live代码{STATE['actual_merge']}，唯一{VERSION}。路线/选牌/事件/商店/休息/整局及既有战斗计划不可用在原题有界退避等待，恢复仍Codex；取消/程序故障保留原局，首次/终止日志写失败也保留原因并退出脑故障78，心跳/收件箱/stall/autoplay禁止代答与重启风暴，Jev战斗执行/代码求解原职责保持。brain.jsonl实际成功引擎为统一绩效/论文/学习曲线/climb口径，DeepSeek/混合/未知默认排除但原战绩/证据/成本全部保留、旧快照不改；固定切点静默86局10胜→78局10胜，五点名局均DeepSeek，额度回退KQQELQSZ382Z为Codex9/DeepSeek7混合。源tsc/vitest0、Python136通过；集成两轮旧rollout排名/SL搜索各1失败、单项及未含功能基线核验后单worker全套通过，原历史/重复worker参数拒绝保留；日志故障保护撤源2失败/恢复36通过，live合后沙箱/Python通过（完整日志和固定树见报告）。根锁内全部刷新{STATE['refresh_commit']}、重叠空/预检0、已提交知识逐blob保持；铁甲仅Roy指定全局引擎等待/来源差异，无策略/知识改变，不混其他修复或boss校准。新架构不冒标游戏知识或bug-infra；shipped及完整外部固定树检查由运维/调度核实，主检出同步随后登记。报告{SCRATCH}/report.md与report.json；不停当前对局、不运行play、不改env/key/prompt、不推送。\n"
        with (LIVE / 'paper/materials/decision-log.md').open('a') as log:
            log.write('\n' + line)
        STATE['release_entry'] = entry
        STATE['decision_log_line'] = line
        cmd(['git', 'add', '--', 'eval/versions.json', 'paper/materials/decision-log.md'])
        cmd(['git', 'diff', '--cached', '--check'])
        scan_diff('gitleaks-live-release.log')
        cmd(['git', 'commit', '-m', 'Register Codex-only brain and performance policy release\n\n' + COAUTHOR])
        STATE['release_commit'] = git('rev-parse', 'HEAD')
        STATE['release_tree'] = git('rev-parse', 'HEAD^{tree}')
        STATE['status'] = 'released_ops_verification_pending'
        STATE['refresh_files_retained'] = fingerprints(initial) == stable
        if not STATE['refresh_files_retained']:
            # New report refreshes may update files after preservation; the original blobs are still committed.
            STATE['refresh_after_tests'] = fingerprints(initial)
        save()
    except Exception as error:
        STATE['status'] = 'blocked'
        STATE['error'] = str(error)
        save()
        raise
print(json.dumps({k: STATE.get(k) for k in ['status', 'actual_merge', 'release_commit', 'release_tree', 'version']}, ensure_ascii=False))
